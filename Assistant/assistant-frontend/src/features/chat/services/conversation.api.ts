import { apiClient } from "@/features/shared/api/axios";
import { API_ROUTES } from "@/features/shared/api/api-routes";
import type {
  Conversation,
  ConversationAttachment,
} from "@/features/chat/types";
import {
  mapConversation,
  mapConversations,
} from "@/features/chat/utils/map-conversation";

export type UpdateConversationInput = {
  title?: string;
  pinned?: boolean;
};

export const ConversationApi = {
  async list(): Promise<Conversation[]> {
    const response = await apiClient.get(API_ROUTES.CONVERSATIONS.LIST);
    const payload = response.data;
    const rows = Array.isArray(payload) ? payload : payload?.data ?? [];
    return mapConversations(rows);
  },

  async getById(id: string): Promise<Conversation> {
    const response = await apiClient.get(API_ROUTES.CONVERSATIONS.DETAIL(id));
    return mapConversation(response.data);
  },

  async create(title = "New conversation"): Promise<Conversation> {
    const response = await apiClient.post(API_ROUTES.CONVERSATIONS.LIST, {
      title,
    });
    return mapConversation(response.data);
  },

  async update(
    id: string,
    data: UpdateConversationInput,
  ): Promise<Conversation> {
    const response = await apiClient.patch(
      API_ROUTES.CONVERSATIONS.UPDATE(id),
      data,
    );
    return mapConversation(response.data);
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(API_ROUTES.CONVERSATIONS.DELETE(id));
  },

  async clearAll(): Promise<void> {
    await apiClient.delete(API_ROUTES.CONVERSATIONS.CLEAR);
  },

  async listAttachments(
    conversationId: string,
  ): Promise<ConversationAttachment[]> {
    const response = await apiClient.get(
      API_ROUTES.CONVERSATIONS.ATTACHMENTS(conversationId),
    );
    const payload = response.data;
    return Array.isArray(payload) ? payload : (payload?.data ?? []);
  },

  async uploadAttachment(
    conversationId: string,
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<ConversationAttachment> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post<ConversationAttachment>(
      API_ROUTES.CONVERSATIONS.ATTACHMENTS(conversationId),
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

  async removeAttachment(
    conversationId: string,
    attachmentId: string,
  ): Promise<void> {
    await apiClient.delete(
      API_ROUTES.CONVERSATIONS.ATTACHMENT(conversationId, attachmentId),
    );
  },

  async setActiveBranch(
    conversationId: string,
    input: { branchId?: string; leafMessageId?: string },
  ): Promise<Conversation> {
    const response = await apiClient.post(
      API_ROUTES.CONVERSATIONS.ACTIVE_BRANCH(conversationId),
      input,
    );
    return mapConversation(response.data);
  },
};
