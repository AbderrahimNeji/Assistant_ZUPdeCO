"use client";

import { useEffect, useRef } from "react";

type UseChatScrollOptions = {
  itemCount: number;
  isLoading: boolean;
  conversationId?: string | null;
  /** Extra signal (e.g. thinking indicator) that should stick to bottom when near end. */
  stickSignal?: boolean | number;
};

const NEAR_BOTTOM_PX = 140;

/**
 * Auto-scrolls on conversation switch always.
 * On new messages / thinking, only scrolls when the user is already near the bottom.
 */
export function useChatScroll({
  itemCount,
  isLoading,
  conversationId,
  stickSignal = false,
}: UseChatScrollOptions) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const previousConversationId = useRef<string | null | undefined>(undefined);
  const previousCount = useRef(0);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    const onScroll = () => {
      const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
      stickToBottomRef.current = distance <= NEAR_BOTTOM_PX;
    };

    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const conversationChanged =
      previousConversationId.current !== conversationId;
    previousConversationId.current = conversationId;

    if (isLoading) {
      previousCount.current = itemCount;
      return;
    }

    const countIncreased = itemCount > previousCount.current;
    previousCount.current = itemCount;

    if (conversationChanged) {
      stickToBottomRef.current = true;
      el.scrollTop = el.scrollHeight;
      return;
    }

    if (!stickToBottomRef.current) return;

    if (countIncreased || stickSignal) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [conversationId, itemCount, isLoading, stickSignal]);

  return scrollRef;
}
