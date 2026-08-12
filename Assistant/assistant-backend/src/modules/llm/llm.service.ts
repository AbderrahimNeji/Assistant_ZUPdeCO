import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

import { ErrorLogger } from '../../common/logger/error-logger';

const SYSTEM_START = '<<<COPILOT_SYSTEM_INSTRUCTIONS>>>';
const SYSTEM_END = '<<<END_SYSTEM_INSTRUCTIONS>>>';

function toLlmMessages(prompt: string): string | Array<SystemMessage | HumanMessage> {
  const start = prompt.indexOf(SYSTEM_START);
  const end = prompt.indexOf(SYSTEM_END);
  if (start === 0 && end > start) {
    const system = prompt.slice(SYSTEM_START.length, end).trim();
    const user = prompt.slice(end + SYSTEM_END.length).trim();
    return [new SystemMessage(system), new HumanMessage(user)];
  }
  return prompt;
}

type GeminiProviderError = {
  status?: number;
  message?: string;
  response?: {
    status?: number;
    data?: {
      error?: {
        message?: string;
      };
    };
  };
  error?: {
    message?: string;
  };
};

function readProviderError(error: unknown): {
  status?: number;
  providerMessage: string;
} {
  const err = error as GeminiProviderError;
  const status = err.status ?? err.response?.status;
  const providerMessage =
    err.message ||
    err.response?.data?.error?.message ||
    err.error?.message ||
    'Unknown Gemini error';

  return { status, providerMessage };
}

function readModelText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (
          part &&
          typeof part === 'object' &&
          'text' in part &&
          typeof (part as { text: unknown }).text === 'string'
        ) {
          return (part as { text: string }).text;
        }
        return '';
      })
      .join('');
  }
  if (
    content &&
    typeof content === 'object' &&
    'toString' in content &&
    typeof (content as { toString: () => string }).toString === 'function'
  ) {
    const text = (content as { toString: () => string }).toString();
    return text === '[object Object]' ? JSON.stringify(content) : text;
  }
  return '';
}

function buildModelCandidates(): string[] {
  const primary = process.env.GEMINI_MODEL?.trim() || 'gemini-3.6-flash';
  const fallbacks = (
    process.env.GEMINI_MODEL_FALLBACKS?.trim() ||
    'gemini-3.5-flash-lite,gemini-flash-latest'
  )
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);

  return [...new Set([primary, ...fallbacks])];
}

@Injectable()
export class LlmService {
  private readonly models: Array<{
    name: string;
    client: ChatGoogleGenerativeAI;
  }>;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
      console.warn(
        '[LlmService] GEMINI_API_KEY is missing. Set it in assistant-backend/.env and restart the API.',
      );
    } else if (!apiKey.startsWith('AIza') && !apiKey.startsWith('AQ.')) {
      console.warn(
        '[LlmService] GEMINI_API_KEY has an unexpected format. Requests may fail until you paste a valid Generative Language API key from Google AI Studio.',
      );
    }

    const candidates = buildModelCandidates();
    console.log(`[LlmService] Gemini models: ${candidates.join(' → ')}`);

    this.models = candidates.map((name) => ({
      name,
      client: new ChatGoogleGenerativeAI({
        apiKey: apiKey || 'missing-gemini-api-key',
        model: name,
        temperature: 0.7,
      }),
    }));
  }

  async ask(prompt: string): Promise<string> {
    return (await this.askWithMeta(prompt)).text;
  }

  /**
   * Same Gemini call as ask(), plus safe metadata for ExecutionTrace.
   * Does not return prompts or raw provider payloads.
   */
  async askWithMeta(prompt: string): Promise<{
    text: string;
    modelName: string;
    latencyMs: number;
    inputTokens?: number;
    outputTokens?: number;
  }> {
    const start = performance.now();
    let lastError: unknown;

    for (const { name, client } of this.models) {
      try {
        const response = await client.invoke(toLlmMessages(prompt));
        const latencyMs = Math.round(performance.now() - start);
        ErrorLogger.logDuration('LlmService.ask', latencyMs, {
          model: name,
        });

        const usage = readUsage(response);

        return {
          text: readModelText(response.content),
          modelName: name,
          latencyMs,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
        };
      } catch (error: unknown) {
        lastError = error;
        const { status, providerMessage } = readProviderError(error);

        ErrorLogger.log(error, 'LlmService.ask', {
          status,
          providerMessage,
          model: name,
          durationMs: Number((performance.now() - start).toFixed(2)),
        });

        // Quota / overload on this model → try the next candidate.
        if (status === 429 || status === 503) {
          continue;
        }

        break;
      }
    }

    throw this.mapProviderFailure(lastError);
  }

  /**
   * Stream Gemini tokens. Emits only answer text chunks (never prompts / retrieved context).
   * On AbortSignal, returns the partial text accumulated so far.
   */
  async streamWithMeta(
    prompt: string,
    options?: {
      signal?: AbortSignal;
      onToken?: (text: string) => void;
    },
  ): Promise<{
    text: string;
    modelName: string;
    latencyMs: number;
    inputTokens?: number;
    outputTokens?: number;
    interrupted: boolean;
  }> {
    const start = performance.now();
    let lastError: unknown;

    for (const { name, client } of this.models) {
      try {
        let text = '';
        let interrupted = false;
        let inputTokens: number | undefined;
        let outputTokens: number | undefined;

        const stream = await client.stream(toLlmMessages(prompt));
        for await (const chunk of stream) {
          if (options?.signal?.aborted) {
            interrupted = true;
            break;
          }

          const piece = readModelText((chunk as { content?: unknown }).content);
          if (!piece) continue;
          text += piece;
          options?.onToken?.(piece);

          const usage = readUsage(chunk);
          if (usage.inputTokens != null) inputTokens = usage.inputTokens;
          if (usage.outputTokens != null) outputTokens = usage.outputTokens;
        }

        const latencyMs = Math.round(performance.now() - start);
        ErrorLogger.logDuration('LlmService.stream', latencyMs, {
          model: name,
          interrupted,
        });

        return {
          text,
          modelName: name,
          latencyMs,
          inputTokens,
          outputTokens,
          interrupted,
        };
      } catch (error: unknown) {
        if (options?.signal?.aborted) {
          return {
            text: '',
            modelName: name,
            latencyMs: Math.round(performance.now() - start),
            interrupted: true,
          };
        }

        lastError = error;
        const { status, providerMessage } = readProviderError(error);

        ErrorLogger.log(error, 'LlmService.stream', {
          status,
          providerMessage,
          model: name,
          durationMs: Number((performance.now() - start).toFixed(2)),
        });

        if (status === 429 || status === 503) {
          continue;
        }

        break;
      }
    }

    throw this.mapProviderFailure(lastError);
  }

  private mapProviderFailure(lastError: unknown): HttpException {
    const { status, providerMessage } = readProviderError(lastError);

    ErrorLogger.log(lastError, 'LlmService.mapProviderFailure', {
      status,
      providerMessage,
    });

    if (status === 429) {
      return new HttpException(
        'The assistant is busy right now. Please try again in a moment.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (status === 401 || status === 403) {
      return new HttpException(
        'The assistant is temporarily unavailable. Please try again in a moment.',
        HttpStatus.BAD_GATEWAY,
      );
    }

    if (status === 503) {
      return new HttpException(
        'The assistant is temporarily unavailable. Please try again in a moment.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return new HttpException(
      'The assistant is temporarily unavailable. Please try again in a moment.',
      HttpStatus.BAD_GATEWAY,
    );
  }
}

function readUsage(response: unknown): {
  inputTokens?: number;
  outputTokens?: number;
} {
  if (!response || typeof response !== 'object') return {};
  const usage = (response as { usage_metadata?: Record<string, unknown> })
    .usage_metadata;
  if (!usage) return {};

  const inputTokens =
    typeof usage.input_tokens === 'number'
      ? usage.input_tokens
      : typeof usage.inputTokens === 'number'
        ? usage.inputTokens
        : undefined;
  const outputTokens =
    typeof usage.output_tokens === 'number'
      ? usage.output_tokens
      : typeof usage.outputTokens === 'number'
        ? usage.outputTokens
        : undefined;

  return { inputTokens, outputTokens };
}
