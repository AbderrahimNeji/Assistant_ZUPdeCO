import { apiClient } from "@/features/shared/api/axios";
import { API_ROUTES } from "@/features/shared/api/api-routes";
import type { Message } from "@/features/chat/types";
import { mapMessages } from "@/features/chat/utils/map-message";

type ConversationDetailResponse = {
  id?: string;
  activeBranchId?: string | null;
  activeLeafId?: string | null;
  branches?: Array<{ id: string; label: string }>;
  messages?: unknown[];
};

export type ConversationMessagesPayload = {
  messages: Message[];
  activeBranchId: string | null;
  activeLeafId: string | null;
  branches: Array<{ id: string; label: string }>;
};

export const MessagesApi = {
  /**
   * Loads the full message tree for a conversation via GET /conversation/:id.
   */
  async listByConversation(
    conversationId: string,
  ): Promise<ConversationMessagesPayload> {
    const response = await apiClient.get<ConversationDetailResponse>(
      API_ROUTES.CONVERSATIONS.DETAIL(conversationId),
    );

    const payload = response.data;
    const rows = Array.isArray(payload?.messages) ? payload.messages : [];
    const messages = mapMessages(
      rows as Parameters<typeof mapMessages>[0],
      conversationId,
    );

    return {
      messages,
      activeBranchId: payload?.activeBranchId ?? null,
      activeLeafId: payload?.activeLeafId ?? messages.at(-1)?.id ?? null,
      branches: Array.isArray(payload?.branches) ? payload.branches : [],
    };
  },
};
