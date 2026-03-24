import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '../../user/entities/user.entity';
import { OpsMetricsService } from '../../ops/services/ops-metrics.service';
import { QueryEditaisDto } from '../dtos/query-editais.dto';

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
    private readonly opsMetricsService: OpsMetricsService
  ) {}

  private get scraperBaseUrl(): string {
    return this.configService.get<string>('SCRAPER_API_URL') ?? 'http://localhost:8000';
  }

  async list(user: User, query: QueryEditaisDto): Promise<ListEditaisResponse> {
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

    payload.items = payload.items.map((item) => ({
      ...item,
      relevance_score:
        profileKeywords.length > 0 ? this.calculateRelevanceScore(item, profileKeywords) : null,
    }));
    payload.items = this.deduplicateFuncapItems(payload.items);
    payload.total = payload.items.length;

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

  async getById(id: number): Promise<Edital> {
    const endpoint = `/editais/${id}`;
    const response = await this.safeFetch(`${this.scraperBaseUrl}${endpoint}`, endpoint);
    return response.json() as Promise<Edital>;
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
