"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { EvaluationApi } from "@/features/chat/services/evaluation.api";
import { MessagesApi } from "@/features/chat/services/messages.service";
import { useChatStore } from "@/features/chat/store";
import { QUERY_KEYS } from "@/features/shared/constants/query-keys";

export function useMessages(conversationId: string | null | undefined) {
  const setMessages = useChatStore((state) => state.setMessages);
  const setActivePath = useChatStore((state) => state.setActivePath);
  const updateConversation = useChatStore((state) => state.updateConversation);
  const clearMessages = useChatStore((state) => state.clearMessages);
  const isChatPending = useChatStore((state) => state.isChatPending);

  const query = useQuery({
    queryKey: QUERY_KEYS.CHAT.MESSAGES(conversationId ?? "none"),
    queryFn: async () => {
      const payload = await MessagesApi.listByConversation(conversationId!);
      try {
        const feedback = await EvaluationApi.listConversationFeedback(
          conversationId!,
        );
        return {
          ...payload,
          messages: payload.messages.map((message) => {
            const entry = feedback[message.id];
            if (!entry) return message;
            return { ...message, feedbackRating: entry.rating };
          }),
        };
      } catch {
        return payload;
      }
    },
    enabled: Boolean(conversationId),
  });

  useEffect(() => {
    if (!conversationId) {
      clearMessages();
      return;
    }

    // Avoid wiping optimistic / in-flight streamed messages while a send is pending,
    // and avoid applying stale cache while a refetch is in flight after send.
    if (isChatPending || query.isRefetching) return;

    if (query.data) {
      setMessages(query.data.messages);
      setActivePath({
        activeLeafId: query.data.activeLeafId,
        activeBranchId: query.data.activeBranchId,
      });
      updateConversation(conversationId, {
        activeLeafId: query.data.activeLeafId,
        activeBranchId: query.data.activeBranchId,
        branches: query.data.branches,
        branchCount: query.data.branches.length,
      });
    }
  }, [
    conversationId,
    query.data,
    query.isRefetching,
    isChatPending,
    setMessages,
    setActivePath,
    updateConversation,
    clearMessages,
  ]);

  return query;
}
