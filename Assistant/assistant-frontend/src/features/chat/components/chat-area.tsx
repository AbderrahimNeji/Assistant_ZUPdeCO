"use client";

import type { ReactNode } from "react";

import {
  ChatWelcome,
  type ChatSuggestion,
} from "@/features/chat/components/chat-welcome";
import { MessageThread } from "@/features/chat/components/message-thread";
import { useMessages } from "@/features/chat/hooks/use-messages";
import { useChatStore } from "@/features/chat/store";
import type {
  ChatActionButton,
  Message,
  SuggestedAction,
} from "@/features/chat/types";
import type { FeedbackRating } from "@/features/chat/services/evaluation.api";
import { getActivePath } from "@/features/chat/utils/conversation-tree";
import { getConversationDisplayTitle } from "@/features/chat/utils/display";
import { cn } from "@/lib/utils";

type ChatAreaProps = {
  title?: string;
  conversationId?: string | null;
  className?: string;
  isWaiting?: boolean;
  branchSelector?: ReactNode;
  onSuggestionSelect?: (suggestion: ChatSuggestion) => void;
  onAction?: (action: ChatActionButton) => void;
  onSuggestedAction?: (suggestion: SuggestedAction) => void;
  onRegenerate?: (message: Message) => void;
  onEdit?: (message: Message, nextContent: string) => void;
  onSelectVersion?: (message: Message) => void;
  onFeedback?: (input: {
    messageId: string;
    rating: FeedbackRating;
    comment?: string;
  }) => Promise<void> | void;
};

export function ChatArea({
  title,
  conversationId = null,
  className,
  isWaiting = false,
  branchSelector,
  onSuggestionSelect,
  onAction,
  onSuggestedAction,
  onRegenerate,
  onEdit,
  onSelectVersion,
  onFeedback,
}: ChatAreaProps) {
  const messages = useChatStore((state) => state.messages);
  const activeLeafId = useChatStore((state) => state.activeLeafId);
  const selectedConversation = useChatStore(
    (state) => state.selectedConversation,
  );
  const messagesQuery = useMessages(conversationId);

  const visibleMessages = getActivePath(messages, activeLeafId);
  const showWelcome = !conversationId;
  const isHydratingMessages =
    Boolean(conversationId) &&
    messagesQuery.isSuccess &&
    messages.length === 0 &&
    (messagesQuery.data?.messages.length ?? 0) > 0;
  const isLoadingMessages = messagesQuery.isLoading || isHydratingMessages;

  const firstUserMessage = visibleMessages.find(
    (message) => message.role === "user",
  )?.content;

  const displayTitle =
    title ??
    getConversationDisplayTitle(selectedConversation, firstUserMessage);

  return (
    <section
      aria-label="Chat"
      className={cn(
        "relative flex min-h-0 min-w-0 flex-1 flex-col",
        "bg-[linear-gradient(180deg,#ffffff_0%,#f7f8fa_42%,#f5f6f8_100%)]",
        className,
      )}
    >
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-card/90 px-5 backdrop-blur-[2px] md:h-14 md:px-8">
        <div className="min-w-0 flex-1">
          <p className="mb-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
            Conversation
          </p>
          <h1
            title={displayTitle}
            className="min-w-0 max-w-full truncate font-display text-[0.9375rem] font-bold tracking-tight text-brand-navy md:text-[1.05rem]"
          >
            {displayTitle}
          </h1>
        </div>
        {branchSelector}
      </div>

      {showWelcome ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-7 md:px-8 md:py-10">
          <ChatWelcome onSuggestionSelect={onSuggestionSelect} />
        </div>
      ) : (
        <MessageThread
          conversationId={conversationId}
          messages={messages}
          activeLeafId={activeLeafId}
          isLoading={isLoadingMessages}
          isError={messagesQuery.isError}
          isWaiting={isWaiting}
          onSuggestionSelect={onSuggestionSelect}
          onAction={onAction}
          onSuggestedAction={onSuggestedAction}
          onRegenerate={onRegenerate}
          onEdit={onEdit}
          onSelectVersion={onSelectVersion}
          onFeedback={onFeedback}
          onRetry={() => {
            void messagesQuery.refetch();
          }}
        />
      )}
    </section>
  );
}
