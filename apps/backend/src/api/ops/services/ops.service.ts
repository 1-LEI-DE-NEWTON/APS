import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpsMetricsService } from './ops-metrics.service';

@Injectable()
export class OpsService {
  constructor(
    private readonly configService: ConfigService,
    private readonly opsMetricsService: OpsMetricsService
  ) {}

  private get scraperBaseUrl(): string {
    return this.configService.get<string>('SCRAPER_API_URL') ?? 'http://localhost:8000';
  }

  async getHealth() {
    const now = new Date().toISOString();
    const scraperHealth = await this.fetchScraperHealth();
    const latestCollection = await this.fetchLatestCollection();

    const degraded = scraperHealth.status !== 'up';
    return {
      status: degraded ? 'degraded' : 'ok',
      timestamp: now,
      backend: { status: 'ok' },
      scraper: scraperHealth,
      latestCollection,
    };
  }

  getMetrics() {
    return this.opsMetricsService.getSnapshot();
  }

  private async fetchScraperHealth() {
    const startedAt = Date.now();
    try {
      const response = await this.fetchWithTimeout(`${this.scraperBaseUrl}/health`, 5000);
      const latencyMs = Date.now() - startedAt;
      const ok = response.ok;
      this.opsMetricsService.recordScraperCall('/health', latencyMs, ok, ok ? undefined : `http_${response.status}`);

      if (!ok) {
        return {
          status: 'down',
          latencyMs,
          httpStatus: response.status,
          error: `Scraper retornou HTTP ${response.status}`,
        };
      }
      return {
        status: 'up',
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      const errorMessage = error instanceof Error ? error.message : 'unknown_error';
      this.opsMetricsService.recordScraperCall('/health', latencyMs, false, errorMessage);
      return {
        status: 'down',
        latencyMs,
        error: errorMessage,
      };
    }
  }

  private async fetchLatestCollection() {
    const startedAt = Date.now();
    try {
      const response = await this.fetchWithTimeout(`${this.scraperBaseUrl}/coletas/status/latest`, 5000);
      const latencyMs = Date.now() - startedAt;
      const ok = response.ok;
      this.opsMetricsService.recordScraperCall(
        '/coletas/status/latest',
        latencyMs,
        ok,
        ok ? undefined : `http_${response.status}`
      );
      if (!ok) return null;
      return response.json();
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      const errorMessage = error instanceof Error ? error.message : 'unknown_error';
      this.opsMetricsService.recordScraperCall('/coletas/status/latest', latencyMs, false, errorMessage);
      return null;
    }
  }

  private async fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }
}
