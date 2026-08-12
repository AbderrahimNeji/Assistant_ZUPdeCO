"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ConversationApi } from "@/features/chat/services/conversation.api";
import { useChatStore } from "@/features/chat/store";
import { QUERY_KEYS } from "@/features/shared/constants/query-keys";

export function useDeleteConversation() {
  const queryClient = useQueryClient();
  const removeConversation = useChatStore((state) => state.removeConversation);

  return useMutation({
    mutationFn: (conversationId: string) =>
      ConversationApi.remove(conversationId),
    onSuccess: async (_data, conversationId) => {
      removeConversation(conversationId);
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.CONVERSATIONS.ROOT,
      });
    },
  });
}
