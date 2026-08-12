"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ConversationApi } from "@/features/chat/services/conversation.api";
import { useChatStore } from "@/features/chat/store";
import { QUERY_KEYS } from "@/features/shared/constants/query-keys";

export function useCreateConversation() {
  const queryClient = useQueryClient();
  const selectConversation = useChatStore((state) => state.selectConversation);
  const addConversation = useChatStore((state) => state.addConversation);
  const clearMessages = useChatStore((state) => state.clearMessages);

  return useMutation({
    mutationFn: () => ConversationApi.create("New conversation"),
    onSuccess: async (conversation) => {
      addConversation(conversation);
      clearMessages();
      selectConversation(conversation);
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.CONVERSATIONS.ROOT,
      });
    },
  });
}
