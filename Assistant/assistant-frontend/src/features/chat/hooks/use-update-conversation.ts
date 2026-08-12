"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ConversationApi } from "@/features/chat/services/conversation.api";
import { useChatStore } from "@/features/chat/store";
import type { Conversation } from "@/features/chat/types";
import { QUERY_KEYS } from "@/features/shared/constants/query-keys";

type RenameInput = {
  conversationId: string;
  title: string;
};

export function useRenameConversation() {
  const queryClient = useQueryClient();
  const updateConversation = useChatStore((state) => state.updateConversation);

  return useMutation({
    mutationFn: ({ conversationId, title }: RenameInput) =>
      ConversationApi.update(conversationId, { title }),
    onMutate: async ({ conversationId, title }) => {
      const previous = useChatStore
        .getState()
        .conversations.find(
          (conversation) => conversation.id === conversationId,
        );

      updateConversation(conversationId, { title });
      return { previous };
    },
    onError: (_error, { conversationId }, context) => {
      if (context?.previous) {
        updateConversation(conversationId, {
          title: context.previous.title,
        });
      }
    },
    onSuccess: async (conversation) => {
      updateConversation(conversation.id, {
        title: conversation.title,
        updatedAt: conversation.updatedAt,
        pinned: conversation.pinned,
      });
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.CONVERSATIONS.ROOT,
      });
    },
  });
}

type PinInput = {
  conversationId: string;
  pinned: boolean;
};

export function usePinConversation() {
  const queryClient = useQueryClient();
  const updateConversation = useChatStore((state) => state.updateConversation);

  return useMutation({
    mutationFn: ({ conversationId, pinned }: PinInput) =>
      ConversationApi.update(conversationId, { pinned }),
    onMutate: async ({ conversationId, pinned }) => {
      const previous = useChatStore
        .getState()
        .conversations.find(
          (conversation) => conversation.id === conversationId,
        );

      updateConversation(conversationId, { pinned });
      return { previous };
    },
    onError: (_error, { conversationId }, context) => {
      if (context?.previous) {
        updateConversation(conversationId, {
          pinned: context.previous.pinned,
        });
      }
    },
    onSuccess: async (conversation: Conversation) => {
      updateConversation(conversation.id, {
        pinned: conversation.pinned,
        updatedAt: conversation.updatedAt,
        title: conversation.title,
      });
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.CONVERSATIONS.ROOT,
      });
    },
  });
}
