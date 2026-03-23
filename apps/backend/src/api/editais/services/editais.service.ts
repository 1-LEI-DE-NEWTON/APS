import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  constructor(private readonly configService: ConfigService) {}

  private get scraperBaseUrl(): string {
    return this.configService.get<string>('SCRAPER_API_URL') ?? 'http://localhost:8000';
  }

  async list(query: QueryEditaisDto): Promise<ListEditaisResponse> {
    const params = new URLSearchParams();
    if (query.orgao) params.set('orgao', query.orgao);
    if (query.q) params.set('q', query.q);
    if (query.status) params.set('status', query.status);
    params.set('limit', String(query.limit ?? 50));
    params.set('offset', String(query.offset ?? 0));

    const response = await this.safeFetch(`${this.scraperBaseUrl}/editais?${params.toString()}`);
    return response.json() as Promise<ListEditaisResponse>;
  }

  async getById(id: number): Promise<Edital> {
    const response = await this.safeFetch(`${this.scraperBaseUrl}/editais/${id}`);
    return response.json() as Promise<Edital>;
  }

  async triggerCollection(): Promise<CollectionStatus> {
    const response = await this.safeFetch(`${this.scraperBaseUrl}/coletas/executar`, {
      method: 'POST',
    });
    return response.json() as Promise<CollectionStatus>;
  }

  async getLatestCollectionStatus(): Promise<CollectionStatus | null> {
    const response = await this.safeFetch(`${this.scraperBaseUrl}/coletas/status/latest`);
    return response.json() as Promise<CollectionStatus | null>;
  }

  private async safeFetch(url: string, init?: RequestInit): Promise<Response> {
    try {
      const response = await fetch(url, init);
      if (!response.ok) {
        if (response.status === 404) {
          throw new NotFoundException('Edital não encontrado');
        }
        const body = await response.text();
        throw new ServiceUnavailableException(
          `Falha na integração com scraper (${response.status}): ${body || 'sem detalhes'}`,
        );
      }
      return response;
    } catch (error) {
      if (error instanceof ServiceUnavailableException || error instanceof NotFoundException) {
        throw error;
      }
      throw new ServiceUnavailableException('Serviço de scraper indisponível');
    }
  }
}
