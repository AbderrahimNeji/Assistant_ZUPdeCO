"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { ConversationApi } from "@/features/chat/services/conversation.api";
import { useChatStore } from "@/features/chat/store";
import {
  getLastConversationId,
  pickMostRecentConversation,
  setLastConversationId,
} from "@/features/chat/utils/last-conversation";
import { QUERY_KEYS } from "@/features/shared/constants/query-keys";

/**
 * Loads conversations and restores selection for returning users:
 * last active id → otherwise most recent → never leave history on welcome.
 */
export function useConversations() {
  const setConversations = useChatStore((state) => state.setConversations);
  const selectConversation = useChatStore((state) => state.selectConversation);
  const selectedConversationId = useChatStore(
    (state) => state.selectedConversation?.id ?? null,
  );

  const query = useQuery({
    queryKey: QUERY_KEYS.CONVERSATIONS.ROOT,
    queryFn: () => ConversationApi.list(),
  });

  useEffect(() => {
    if (!query.data) return;

    setConversations(query.data);

    const list = query.data;
    if (list.length === 0) {
      if (selectedConversationId) {
        selectConversation(null);
        setLastConversationId(null);
      }
      return;
    }

    const selectedStillExists =
      Boolean(selectedConversationId) &&
      list.some((conversation) => conversation.id === selectedConversationId);

    if (selectedStillExists) return;

    const lastId = getLastConversationId();
    const restored =
      (lastId
        ? list.find((conversation) => conversation.id === lastId)
        : undefined) ?? pickMostRecentConversation(list);

    if (restored) {
      selectConversation(restored);
      setLastConversationId(restored.id);
    }
  }, [
    query.data,
    selectedConversationId,
    setConversations,
    selectConversation,
  ]);

  return query;
}
