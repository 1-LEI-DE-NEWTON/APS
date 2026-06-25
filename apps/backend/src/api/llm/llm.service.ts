import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type ChatRole = 'system' | 'user' | 'assistant';

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type LlmInfo = {
  enabled: boolean;
  provider: string;
  model: string;
};

/**
 * Serviço de IA agnóstico de provedor.
 *
 * Por padrão usa um modelo LOCAL via Ollama, mas é totalmente parametrizável
 * pelo .env para apontar para uma API online compatível com OpenAI
 * (ex.: OpenAI, Groq, etc.), facilitando a comparação local x online.
 *
 *   LLM_PROVIDER=ollama  -> POST {LLM_BASE_URL}/api/chat
 *   LLM_PROVIDER=openai  -> POST {LLM_BASE_URL}/chat/completions  (Bearer LLM_API_KEY)
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(private readonly config: ConfigService) {}

  get enabled(): boolean {
    return (this.config.get<string>('LLM_ENABLED') ?? 'true').toLowerCase() === 'true';
  }

  private get provider(): string {
    return (this.config.get<string>('LLM_PROVIDER') ?? 'ollama').toLowerCase();
  }

  private get baseUrl(): string {
    const fallback =
      this.provider === 'openai' ? 'https://api.openai.com/v1' : 'http://localhost:11434';
    return (this.config.get<string>('LLM_BASE_URL') ?? fallback).replace(/\/+$/, '');
  }

  private get model(): string {
    return this.config.get<string>('LLM_MODEL') ?? 'granite3-dense:2b';
  }

  private get apiKey(): string | undefined {
    return this.config.get<string>('LLM_API_KEY') || undefined;
  }

  private get timeoutMs(): number {
    return Number(this.config.get<string>('LLM_TIMEOUT_MS') ?? '30000');
  }

  private get temperature(): number {
    return Number(this.config.get<string>('LLM_TEMPERATURE') ?? '0.3');
  }

  get info(): LlmInfo {
    return { enabled: this.enabled, provider: this.provider, model: this.model };
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    if (!this.enabled) {
      throw new ServiceUnavailableException(
        'Assistente de IA desabilitado. Defina LLM_ENABLED=true no .env do backend.',
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const reply =
        this.provider === 'openai'
          ? await this.chatOpenAI(messages, controller.signal)
          : await this.chatOllama(messages, controller.signal);
      return reply.trim();
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      const isAbort = error instanceof Error && error.name === 'AbortError';
      const detail = isAbort
        ? `tempo limite de ${this.timeoutMs}ms excedido`
        : error instanceof Error
          ? error.message
          : 'erro desconhecido';
      this.logger.error(`Falha no provedor de IA (${this.provider}/${this.model}): ${detail}`);
      throw new ServiceUnavailableException(`Falha ao consultar o modelo de IA: ${detail}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async chatOllama(messages: ChatMessage[], signal: AbortSignal): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: false,
        options: { temperature: this.temperature },
      }),
      signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Ollama respondeu ${response.status}: ${body || 'sem detalhes'}`);
    }

    const data = (await response.json()) as { message?: { content?: string } };
    return data?.message?.content ?? '';
  }

  private async chatOpenAI(messages: ChatMessage[], signal: AbortSignal): Promise<string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: this.temperature,
        stream: false,
      }),
      signal,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Provedor online respondeu ${response.status}: ${body || 'sem detalhes'}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data?.choices?.[0]?.message?.content ?? '';
  }
}
