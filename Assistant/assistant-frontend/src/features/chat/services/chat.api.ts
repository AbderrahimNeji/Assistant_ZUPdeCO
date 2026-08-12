import { useAuthStore } from "@/features/auth/store/auth.store";
import { apiClient } from "@/features/shared/api/axios";
import { API_ROUTES } from "@/features/shared/api/api-routes";
import { env } from "@/features/shared/constants/env";
import type { ChatRequest, ChatResponse } from "@/features/chat/types";

export type ParsedChatAttachment = {
  name: string;
  mimeType: string;
  size: number;
  pageCount: number | null;
  text: string;
};

export type ChatStreamStatusPhase = "started" | "generating" | "finalizing";

export type ChatStreamEvent =
  | { type: "token"; text: string }
  | {
      type: "status";
      phase: ChatStreamStatusPhase;
      conversationId?: string;
    }
  | { type: "complete"; payload: ChatResponse }
  | {
      type: "interrupted";
      payload: ChatResponse;
      message?: string;
    }
  | { type: "error"; message: string };

export type ChatStreamHandlers = {
  signal?: AbortSignal;
  onEvent: (event: ChatStreamEvent) => void;
};

function parseSseChunk(buffer: string): {
  events: ChatStreamEvent[];
  rest: string;
} {
  const events: ChatStreamEvent[] = [];
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";

  for (const part of parts) {
    const dataLines = part
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.replace(/^data:\s?/, ""));

    if (!dataLines.length) continue;

    try {
      const parsed = JSON.parse(dataLines.join("\n")) as ChatStreamEvent;
      if (parsed && typeof parsed === "object" && "type" in parsed) {
        events.push(parsed);
      }
    } catch {
      // Ignore malformed chunks; the next frame may complete the payload.
    }
  }

  return { events, rest };
}

export const ChatApi = {
  async send(payload: ChatRequest): Promise<ChatResponse> {
    if (process.env.NODE_ENV === "development") {
      console.debug("[ChatApi.send] request payload", {
        conversationId: payload.conversationId,
        message: payload.message,
        attachmentCount: payload.attachments?.length ?? 0,
      });
    }

    const response = await apiClient.post<ChatResponse>(
      API_ROUTES.CHAT.SEND,
      payload,
    );

    if (process.env.NODE_ENV === "development") {
      console.debug("[ChatApi.send] response", {
        conversationId: response.data.conversationId,
        answerPreview: response.data.answer?.slice(0, 120),
        sourceCount: response.data.sources?.length ?? 0,
      });
    }

    return response.data;
  },

  /**
   * POST chat with SSE streaming. Uses fetch so Authorization + abort work.
   */
  async sendStream(
    payload: ChatRequest & { regenerate?: boolean },
    handlers: ChatStreamHandlers,
  ): Promise<void> {
    const accessToken = useAuthStore.getState().accessToken;
    const response = await fetch(`${env.apiUrl}${API_ROUTES.CHAT.STREAM}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: handlers.signal,
    });

    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try {
        const body = (await response.json()) as { message?: string | string[] };
        if (typeof body.message === "string") message = body.message;
        else if (Array.isArray(body.message)) message = body.message.join(", ");
      } catch {
        // keep default
      }

      if (response.status === 401) {
        const hadSession = Boolean(useAuthStore.getState().accessToken);
        useAuthStore.getState().clearAuth();
        if (
          hadSession &&
          typeof window !== "undefined" &&
          !window.location.pathname.startsWith("/login")
        ) {
          window.location.assign("/login");
        }
      }

      throw new Error(message);
    }

    if (!response.body) {
      throw new Error("Streaming is not supported in this browser.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parsed = parseSseChunk(buffer);
      buffer = parsed.rest;
      for (const event of parsed.events) {
        handlers.onEvent(event);
      }
    }

    if (buffer.trim()) {
      const parsed = parseSseChunk(`${buffer}\n\n`);
      for (const event of parsed.events) {
        handlers.onEvent(event);
      }
    }
  },

  async parseAttachment(
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<ParsedChatAttachment> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post<ParsedChatAttachment>(
      API_ROUTES.CHAT.PARSE_ATTACHMENT,
      formData,
      {
        onUploadProgress: (event) => {
          if (!onProgress || !event.total) return;
          onProgress(
            Math.min(100, Math.round((event.loaded / event.total) * 100)),
          );
        },
      },
    );

    return response.data;
  },
};

export { MessagesApi } from "./messages.service";
