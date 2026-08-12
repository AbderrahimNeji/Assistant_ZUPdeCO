import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { auth } from '@/config/firebase';

import { backoffDelay, mapCopilotError, sleep } from './errors';
import type { ApplicationContext } from './types';

const ASSISTANT_API_BASE = (
  import.meta.env.VITE_ASSISTANT_API_URL as string | undefined
)?.replace(/\/$/, '') || 'http://localhost:3001/api';

export type CopilotAnswerMode =
  | 'live_data'
  | 'documentation'
  | 'hybrid'
  | 'attachment';

export type ChatSourceAttribution = {
  kind:
    | 'conversation_attachment'
    | 'document_kb'
    | 'documentation_kb'
    | 'application_db';
  label: string;
  icon: string;
  providerId?: string;
  pages?: number[];
  chapter?: string;
  section?: string;
  document: string;
  page?: number;
  version?: string;
  contentHash?: string;
  ingestedAt?: string;
};

export type CopilotConversation = {
  id: string;
  title: string | null;
  pinned?: boolean;
  updatedAt: string;
  createdAt: string;
};

export type CopilotMessage = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
  parentMessageId?: string | null;
  branchId?: string;
  version?: number;
  sources?: ChatSourceAttribution[] | null;
  actions?: CopilotActionButton[] | null;
  executionTrace?: Record<string, unknown> | null;
  answerMode?: CopilotAnswerMode | null;
};

export type CopilotChatResponse = {
  conversationId: string;
  messageId?: string;
  userMessageId?: string;
  answer?: string;
  parentMessageId?: string | null;
  branchId?: string;
  version?: number;
  actions?: CopilotActionButton[];
  confirmationId?: string;
  sources?: ChatSourceAttribution[];
  answerMode?: CopilotAnswerMode;
  /** Additive BQE structured visuals (tables / KPIs). */
  businessVisual?: {
    kind: 'table' | 'kpis' | 'ranking' | 'mixed';
    title?: string;
    kpis?: Array<{ label: string; value: string | number }>;
    tables?: Array<{
      title?: string;
      headers: string[];
      rows: Array<Array<string | number>>;
    }>;
    rankings?: Array<{
      title?: string;
      items: Array<{ label: string; value?: string | number; rank?: number }>;
    }>;
  };
  interrupted?: boolean;
  pipeline?: {
    planner?: { mode?: string; confidence?: number };
    routeIntent?: string;
  };
};

export type CopilotActionButton = {
  id: string;
  label: string;
  toolId: string;
  style?: 'primary' | 'secondary' | 'destructive';
  payload?: Record<string, unknown>;
  requiresConfirmation?: boolean;
};

export type CopilotChatAttachment = {
  name: string;
  text: string;
};

export type ParsedChatAttachment = {
  name: string;
  mimeType: string;
  size: number;
  pageCount?: number;
  text: string;
};

export type FeedbackRating = 'HELPFUL' | 'NOT_HELPFUL';

export type FeedbackCategory =
  | 'incorrect'
  | 'missing'
  | 'wrong_source'
  | 'hallucination'
  | 'too_long'
  | 'too_short'
  | 'slow';

export type HealthPayload = {
  status?: string;
  database?: string;
  uptime?: number;
  timestamp?: string;
  version?: string;
};

async function getFirebaseToken(forceRefresh = false): Promise<string> {
  if (typeof auth.authStateReady === 'function') {
    await auth.authStateReady();
  }
  const user = auth.currentUser;
  if (!user) {
    throw Object.assign(new Error('Not authenticated'), { status: 401 });
  }
  return user.getIdToken(forceRefresh);
}

function createClient(): AxiosInstance {
  const client = axios.create({
    baseURL: ASSISTANT_API_BASE,
    timeout: 60_000,
  });

  client.interceptors.request.use(async (config) => {
    const token = await getFirebaseToken();
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  client.interceptors.response.use(
    (res) => res,
    async (err) => {
      const config = err.config as
        | (InternalAxiosRequestConfig & { _retryAuth?: boolean })
        | undefined;
      if (err.response?.status === 401 && config && !config._retryAuth) {
        config._retryAuth = true;
        try {
          const token = await getFirebaseToken(true);
          config.headers.set('Authorization', `Bearer ${token}`);
          return client.request(config);
        } catch {
          // Fall through to the mapped 401 below.
        }
      }
      const mapped = mapCopilotError({
        ...err,
        status: err.response?.status,
        code: err.code,
        message:
          (typeof err.response?.data?.message === 'string'
            ? err.response.data.message
            : undefined) || err.message,
      });
      return Promise.reject(Object.assign(new Error(mapped.display), { mapped, status: err.response?.status }));
    },
  );

  return client;
}

const client = createClient();

type ChatPayload = {
  message: string;
  conversationId?: string;
  applicationContext?: ApplicationContext;
  attachments?: CopilotChatAttachment[];
  editMessageId?: string;
  action?: {
    toolId: string;
    actionId: string;
    payload?: Record<string, unknown>;
  };
  confirm?: {
    confirmationId: string;
    approved: boolean;
  };
};

async function withRetry<T>(
  fn: () => Promise<T>,
  options?: { retries?: number; signal?: AbortSignal },
): Promise<T> {
  const retries = options?.retries ?? 2;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (options?.signal?.aborted) {
      throw Object.assign(new Error('Aborted'), { name: 'AbortError' });
    }
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const mapped = mapCopilotError(error);
      if (!mapped.retryable || attempt >= retries) throw error;
      await sleep(backoffDelay(attempt));
    }
  }
  throw lastError;
}

export const copilotApi = {
  async checkHealth(signal?: AbortSignal): Promise<HealthPayload> {
    const origin = getAssistantApiOrigin();
    const response = await fetch(`${origin}/api/health`, {
      method: 'GET',
      signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw Object.assign(new Error(`health ${response.status}`), {
        status: response.status,
      });
    }
    return (await response.json()) as HealthPayload;
  },

  async listConversations(): Promise<CopilotConversation[]> {
    const { data } = await client.get<CopilotConversation[]>('/conversation');
    return Array.isArray(data) ? data : [];
  },

  async createConversation(title?: string): Promise<CopilotConversation> {
    const { data } = await client.post<CopilotConversation>('/conversation', {
      title: title ?? null,
    });
    return data;
  },

  async getConversation(id: string): Promise<{
    id: string;
    title: string | null;
    messages: CopilotMessage[];
  }> {
    const { data } = await client.get(`/conversation/${id}`);
    return data;
  },

  async deleteConversation(id: string): Promise<void> {
    await client.delete(`/conversation/${id}`);
  },

  async renameConversation(id: string, title: string): Promise<CopilotConversation> {
    const { data } = await client.patch<CopilotConversation>(`/conversation/${id}`, {
      title: title.trim().slice(0, 120),
    });
    return data;
  },

  async setConversationPinned(
    id: string,
    pinned: boolean,
  ): Promise<CopilotConversation> {
    const { data } = await client.patch<CopilotConversation>(`/conversation/${id}`, {
      pinned,
    });
    return data;
  },

  async parseAttachment(file: File): Promise<ParsedChatAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await client.post<ParsedChatAttachment>(
        '/assistant/attachments/parse',
        formData,
        { timeout: 120_000 },
      );
      return data;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const raw = err.response?.data as
          | { message?: string | string[]; error?: string }
          | string
          | undefined;
        const msg =
          typeof raw === 'string'
            ? raw
            : Array.isArray(raw?.message)
              ? raw.message.join(' ')
              : raw?.message || raw?.error;
        throw new Error(
          typeof msg === 'string' && msg.trim()
            ? msg
            : mapCopilotError(err).display,
        );
      }
      throw err;
    }
  },

  async chat(payload: ChatPayload): Promise<CopilotChatResponse> {
    const { data } = await client.post<CopilotChatResponse>('/assistant/chat', payload);
    return data;
  },

  async submitFeedback(input: {
    messageId: string;
    rating: FeedbackRating;
    categories?: FeedbackCategory[];
    comment?: string;
  }): Promise<void> {
    await client.post('/evaluation/feedback', input);
  },

  async listFeedback(conversationId: string): Promise<
    Record<
      string,
      { rating: FeedbackRating; comment?: string | null; categories?: FeedbackCategory[] }
    >
  > {
    const { data } = await client.get(
      `/evaluation/feedback/conversation/${conversationId}`,
    );
    return data ?? {};
  },

  async streamChat(
    payload: ChatPayload,
    handlers: {
      signal?: AbortSignal;
      onToken?: (text: string) => void;
      onComplete?: (data: CopilotChatResponse) => void;
      onError?: (message: string, meta?: { kind: string; retryable: boolean }) => void;
      onInterrupted?: (partial: { reason: string }) => void;
    },
  ): Promise<void> {
    const maxConnectRetries = 2;
    let lastConnectError: unknown;
    let forceRefreshToken = false;

    for (let attempt = 0; attempt <= maxConnectRetries; attempt++) {
      if (handlers.signal?.aborted) {
        throw Object.assign(new Error('Aborted'), { name: 'AbortError' });
      }

      try {
        const token = await getFirebaseToken(forceRefreshToken);
        const response = await fetch(`${ASSISTANT_API_BASE}/assistant/chat/stream`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          body: JSON.stringify(payload),
          signal: handlers.signal,
        });

        if (!response.ok || !response.body) {
          const text = await response.text().catch(() => '');
          const err = Object.assign(
            new Error(text || `Stream failed (${response.status})`),
            { status: response.status },
          );
          if (response.status === 401 && !forceRefreshToken) {
            forceRefreshToken = true;
            lastConnectError = err;
            continue;
          }
          const mapped = mapCopilotError(err);
          if (mapped.retryable && attempt < maxConnectRetries) {
            lastConnectError = err;
            await sleep(backoffDelay(attempt));
            continue;
          }
          handlers.onError?.(mapped.display, {
            kind: mapped.kind,
            retryable: mapped.retryable,
          });
          throw err;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let sawComplete = false;
        let sawToken = false;
        let streamError: string | null = null;

        try {
          while (true) {
            let chunk: ReadableStreamReadResult<Uint8Array>;
            try {
              chunk = await reader.read();
            } catch (readErr) {
              // Backend restarted mid-stream / connection dropped after tokens.
              if (sawToken && !sawComplete) {
                handlers.onInterrupted?.({
                  reason: 'stream_disconnected',
                });
                handlers.onError?.(
                  mapCopilotError({
                    message: 'failed to fetch',
                    code: 'ERR_NETWORK',
                  }).display +
                    ' (réponse partielle conservée / partial answer kept)',
                  { kind: 'offline', retryable: true },
                );
                return;
              }
              throw readErr;
            }

            const { done, value } = chunk;
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split('\n\n');
            buffer = parts.pop() ?? '';

            for (const part of parts) {
              const dataLines = part
                .split('\n')
                .filter((line) => line.startsWith('data:'))
                .map((line) => line.replace(/^data:\s?/, ''));
              if (!dataLines.length) continue;
              try {
                const event = JSON.parse(dataLines.join('\n')) as {
                  type: string;
                  text?: string;
                  payload?: CopilotChatResponse;
                  message?: string;
                };
                if (event.type === 'token' && event.text) {
                  sawToken = true;
                  handlers.onToken?.(event.text);
                } else if (event.type === 'complete' && event.payload) {
                  sawComplete = true;
                  handlers.onComplete?.(event.payload);
                } else if (event.type === 'interrupted' && event.payload) {
                  sawComplete = true;
                  handlers.onComplete?.({ ...event.payload, interrupted: true });
                } else if (event.type === 'error') {
                  streamError = event.message || 'Stream error';
                  handlers.onError?.(
                    mapCopilotError(new Error(streamError)).display,
                    { kind: 'server', retryable: true },
                  );
                }
              } catch {
                // ignore malformed frames
              }
            }
          }
        } finally {
          try {
            reader.releaseLock();
          } catch {
            // ignore
          }
        }

        if (!sawComplete && !streamError) {
          if (sawToken) {
            handlers.onInterrupted?.({ reason: 'incomplete_stream' });
            handlers.onError?.(
              'Connexion interrompue pendant la génération — réponse partielle conservée. / Stream interrupted — partial answer kept.',
              { kind: 'offline', retryable: true },
            );
          } else {
            const mapped = mapCopilotError({
              message: 'failed to fetch',
              code: 'ERR_NETWORK',
            });
            handlers.onError?.(mapped.display, {
              kind: mapped.kind,
              retryable: mapped.retryable,
            });
            throw Object.assign(new Error(mapped.display), { status: 0 });
          }
        }
        return;
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') throw error;
        const mapped = mapCopilotError(error);
        lastConnectError = error;
        if (mapped.retryable && attempt < maxConnectRetries) {
          await sleep(backoffDelay(attempt));
          continue;
        }
        handlers.onError?.(mapped.display, {
          kind: mapped.kind,
          retryable: mapped.retryable,
        });
        throw Object.assign(new Error(mapped.display), {
          mapped,
          cause: error,
        });
      }
    }

    throw lastConnectError;
  },
};

export function getAssistantApiBaseUrl() {
  return ASSISTANT_API_BASE;
}

/** Origin without `/api` suffix — for health probes. */
export function getAssistantApiOrigin() {
  return ASSISTANT_API_BASE.replace(/\/api\/?$/, '') || 'http://localhost:3001';
}

export { withRetry };
