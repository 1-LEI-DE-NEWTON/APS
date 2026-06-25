import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { OpsMetricsService } from '../../ops/services/ops-metrics.service';
import { QueryEditaisDto } from '../dtos/query-editais.dto';
import { ChatEditalDto } from '../dtos/chat-edital.dto';
import { Edital as EditalEntity } from '../entities/edital.entity';
import { UserFavorite } from '../../user/entities/user-favorite.entity';
import { LlmService, ChatMessage } from '../../llm/llm.service';
import { TrackingService } from '../../tracking/services/tracking.service';
import { ApplicationStatus } from '../../user/entities/user-application.entity';
import { ReminderInfo } from '../../tracking/services/tracking.service';

type Edital = {
  id: number;
  titulo: string;
  orgao: string;
  descricao: string;
  resumo_ia: string | null;
  tags_ia: string[] | null;
  url: string;
  data_inicio: string | null;
  data_fim: string | null;
  notificado_novo: boolean;
  notificado_prazo: boolean;
  criado_em: string;
  relevance_score?: number | null;
  isFavorite?: boolean;
  applicationStatus?: ApplicationStatus | null;
  reminder?: ReminderInfo | null;
};

type ChatEditalResponse = {
  reply: string;
  provider: string;
  model: string;
};

type ListEditaisResponse = {
  items: Edital[];
  total: number;
  limit: number;
  offset: number;
};

type CollectionStatus = {
  id: number;
  started_at: string;
  finished_at: string | null;
  status: 'running' | 'success' | 'failed';
  inserted_count: number;
  notified_new_count: number;
  notified_deadline_count: number;
  error_message: string | null;
};

@Injectable()
export class EditaisService {
  constructor(
    private readonly configService: ConfigService,
    private readonly opsMetricsService: OpsMetricsService,
    private readonly llmService: LlmService,
    private readonly trackingService: TrackingService,
    @InjectRepository(EditalEntity)
    private readonly editalRepository: Repository<EditalEntity>,
    @InjectRepository(UserFavorite)
    private readonly userFavoriteRepository: Repository<UserFavorite>,
  ) {}

  private get scraperBaseUrl(): string {
    return this.configService.get<string>('SCRAPER_API_URL') ?? 'http://localhost:8000';
  }

  async list(user: User, query: QueryEditaisDto): Promise<ListEditaisResponse> {
    const favorites = await this.userFavoriteRepository.find({
      where: { userId: user.id },
      select: ['editalId'],
    });
    const favoriteIds = new Set(favorites.map((f) => f.editalId));

    const params = new URLSearchParams();
    if (query.orgao) params.set('orgao', query.orgao);
    if (query.q) params.set('q', query.q);
    if (query.status) params.set('status', query.status);
    params.set('limit', String(query.limit ?? 50));
    params.set('offset', String(query.offset ?? 0));

    const endpoint = `/editais?${params.toString()}`;
    const response = await this.safeFetch(`${this.scraperBaseUrl}${endpoint}`, endpoint);
    const payload = (await response.json()) as ListEditaisResponse;

    const profileKeywords = (user.profileKeywords ?? [])
      .map((entry) => this.normalize(entry))
      .filter((entry) => entry.length > 0);

    const [statusMap, reminderMap] = await Promise.all([
      this.trackingService.getStatusMap(user.id),
      this.trackingService.getReminderMap(user.id),
    ]);

    payload.items = payload.items.map((item) => {
      const reminderDays = reminderMap.get(item.id);
      return {
        ...item,
        isFavorite: favoriteIds.has(item.id),
        relevance_score:
          profileKeywords.length > 0 ? this.calculateRelevanceScore(item, profileKeywords) : null,
        applicationStatus: statusMap.get(item.id) ?? null,
        reminder:
          reminderDays !== undefined
            ? this.trackingService.buildReminderInfo(reminderDays, item.data_fim)
            : null,
      };
    });

    if (query.favoritesOnly) {
      payload.items = payload.items.filter((item) => item.isFavorite);
    }

    payload.items = this.deduplicateFuncapItems(payload.items);
    payload.total = query.favoritesOnly ? payload.items.length : payload.total;

    if (profileKeywords.length > 0) {
      payload.items.sort((a, b) => {
        const scoreA = a.relevance_score ?? 0;
        const scoreB = b.relevance_score ?? 0;
        if (scoreA !== scoreB) return scoreB - scoreA;
        const timeA = Date.parse(a.criado_em);
        const timeB = Date.parse(b.criado_em);
        return timeB - timeA;
      });
    }

    return payload;
  }

  async toggleFavorite(user: User, editalId: number): Promise<{ isFavorite: boolean }> {
    const existing = await this.userFavoriteRepository.findOne({
      where: { userId: user.id, editalId },
    });

    if (existing) {
      await this.userFavoriteRepository.remove(existing);
      return { isFavorite: false };
    }

    const edital = await this.editalRepository.findOne({ where: { id: editalId } });
    if (!edital) {
      throw new NotFoundException('Edital não encontrado no banco');
    }

    await this.userFavoriteRepository.save({
      userId: user.id,
      editalId: editalId,
    });
    return { isFavorite: true };
  }

  async getById(id: number): Promise<Edital> {
    const endpoint = `/editais/${id}`;
    const response = await this.safeFetch(`${this.scraperBaseUrl}${endpoint}`, endpoint);
    return response.json() as Promise<Edital>;
  }

  getAssistantInfo() {
    return this.llmService.info;
  }

  async chatAboutEdital(id: number, dto: ChatEditalDto): Promise<ChatEditalResponse> {
    const edital = await this.editalRepository.findOne({ where: { id } });
    if (!edital) {
      throw new NotFoundException('Edital não encontrado no banco');
    }

    const history = (dto.history ?? []).map(
      (turn): ChatMessage => ({ role: turn.role, content: turn.content }),
    );

    const messages: ChatMessage[] = [
      { role: 'system', content: this.buildAssistantSystemPrompt(edital) },
      ...history,
      { role: 'user', content: dto.message },
    ];

    const reply = await this.llmService.chat(messages);
    const info = this.llmService.info;

    return {
      reply:
        reply || 'Não consegui gerar uma resposta agora. Tente reformular a pergunta.',
      provider: info.provider,
      model: info.model,
    };
  }

  private buildAssistantSystemPrompt(edital: EditalEntity): string {
    const campos = [
      `Título: ${edital.titulo ?? 'não informado'}`,
      `Órgão: ${edital.orgao ?? 'não informado'}`,
      `Data de início: ${edital.dataInicio ?? 'não informada'}`,
      `Data de fim (prazo): ${edital.dataFim ?? 'não informada'}`,
      edital.resumoIa ? `Resumo: ${edital.resumoIa}` : null,
      edital.tagsIa && edital.tagsIa.length > 0 ? `Tags: ${edital.tagsIa.join(', ')}` : null,
      `Descrição: ${edital.descricao ?? 'não informada'}`,
      `URL oficial: ${edital.url ?? 'não informada'}`,
    ]
      .filter((linha): linha is string => Boolean(linha))
      .join('\n');

    return [
      'Você é um assistente que tira dúvidas sobre um edital específico, em português do Brasil.',
      'Responda de forma objetiva e SOMENTE com base nas informações do edital fornecidas abaixo.',
      'Se a informação não constar no edital, diga claramente que ela não consta e oriente o usuário a consultar o documento oficial.',
      'Não invente prazos, valores ou requisitos. Não use markdown nem listas longas; prefira respostas curtas.',
      '',
      '--- DADOS DO EDITAL ---',
      campos,
    ].join('\n');
  }

  async triggerCollection(): Promise<CollectionStatus> {
    const endpoint = '/coletas/executar';
    const response = await this.safeFetch(`${this.scraperBaseUrl}${endpoint}`, endpoint, {
      method: 'POST',
    });
    return response.json() as Promise<CollectionStatus>;
  }

  async getLatestCollectionStatus(): Promise<CollectionStatus | null> {
    const endpoint = '/coletas/status/latest';
    const response = await this.safeFetch(`${this.scraperBaseUrl}${endpoint}`, endpoint);
    return response.json() as Promise<CollectionStatus | null>;
  }

  private calculateRelevanceScore(item: Edital, profileKeywords: string[]): number {
    const normalizedTags = (item.tags_ia ?? []).map((tag) => this.normalize(tag));
    const normalizedTitle = this.normalize(item.titulo);
    const normalizedDescription = this.normalize(item.descricao);
    const normalizedSummary = this.normalize(item.resumo_ia ?? '');

    let score = 0;
    for (const keyword of profileKeywords) {
      if (normalizedTags.some((tag) => tag.includes(keyword))) {
        score += 20;
      }
      if (normalizedTitle.includes(keyword)) {
        score += 10;
      }
      if (normalizedSummary.includes(keyword) || normalizedDescription.includes(keyword)) {
        score += 6;
      }
    }

    return Math.min(100, score);
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private deduplicateFuncapItems(items: Edital[]): Edital[] {
    const seen = new Set<string>();
    const result: Edital[] = [];

    for (const item of items) {
      if (item.orgao.toUpperCase() !== 'FUNCAP') {
        result.push(item);
        continue;
      }

      const normalizedTitle = this.normalize(item.titulo);
      const pdfId = item.url.match(/\/(\d+)\.pdf(?:$|\?)/i)?.[1] ?? '';
      const key = pdfId ? `FUNCAP:${pdfId}` : `FUNCAP:T:${normalizedTitle}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      result.push(item);
    }

    return result;
  }

  private async safeFetch(url: string, endpoint: string, init?: RequestInit): Promise<Response> {
    const startedAt = Date.now();
    try {
      const response = await fetch(url, init);
      const latencyMs = Date.now() - startedAt;
      if (!response.ok) {
        if (response.status === 404) {
          throw new NotFoundException('Edital não encontrado');
        }
        const body = await response.text();
        throw new ServiceUnavailableException(
          `Falha na integração com scraper (${response.status}): ${body || 'sem detalhes'}`,
        );
      }
      this.opsMetricsService.recordScraperCall(endpoint, latencyMs, true);
      return response;
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      const errorMessage = error instanceof Error ? error.message : 'unknown_error';
      this.opsMetricsService.recordScraperCall(endpoint, latencyMs, false, errorMessage);
      if (error instanceof ServiceUnavailableException || error instanceof NotFoundException) {
        throw error;
      }
      throw new ServiceUnavailableException('Serviço de scraper indisponível');
    }
  }
}
