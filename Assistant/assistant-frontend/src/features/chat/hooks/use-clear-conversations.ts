"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ConversationApi } from "@/features/chat/services/conversation.api";
import { useChatStore } from "@/features/chat/store";
import { QUERY_KEYS } from "@/features/shared/constants/query-keys";
import { toast } from "@/features/shared/store/toast.store";

export function useClearConversations() {
  const queryClient = useQueryClient();
  const clearConversations = useChatStore((state) => state.clearConversations);

  return useMutation({
    mutationFn: () => ConversationApi.clearAll(),
    onSuccess: async () => {
      clearConversations();
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.CONVERSATIONS.ROOT,
      });
      toast({
        title: "Conversations cleared",
        description: "All conversations were deleted.",
        variant: "success",
      });
    },
  });
}
