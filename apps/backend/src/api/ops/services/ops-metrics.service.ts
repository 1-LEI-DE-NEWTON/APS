import { Injectable } from '@nestjs/common';

type EndpointMetric = {
  calls: number;
  success: number;
  errors: number;
  totalLatencyMs: number;
  averageLatencyMs: number;
  lastLatencyMs: number;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
};

@Injectable()
export class OpsMetricsService {
  private readonly scraperMetrics = new Map<string, EndpointMetric>();

  recordScraperCall(endpoint: string, latencyMs: number, ok: boolean, errorMessage?: string) {
    const current =
      this.scraperMetrics.get(endpoint) ?? {
        calls: 0,
        success: 0,
        errors: 0,
        totalLatencyMs: 0,
        averageLatencyMs: 0,
        lastLatencyMs: 0,
        lastErrorAt: null,
        lastErrorMessage: null,
      };

    current.calls += 1;
    current.totalLatencyMs += latencyMs;
    current.averageLatencyMs = Number((current.totalLatencyMs / current.calls).toFixed(2));
    current.lastLatencyMs = latencyMs;
    if (ok) {
      current.success += 1;
    } else {
      current.errors += 1;
      current.lastErrorAt = new Date().toISOString();
      current.lastErrorMessage = errorMessage ?? 'unknown_error';
    }

    this.scraperMetrics.set(endpoint, current);
  }

  getSnapshot() {
    const entries = Array.from(this.scraperMetrics.entries()).map(([endpoint, metric]) => ({
      endpoint,
      ...metric,
    }));

    return {
      generatedAt: new Date().toISOString(),
      scraperIntegration: entries,
    };
  }
}
