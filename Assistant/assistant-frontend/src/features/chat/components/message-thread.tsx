"use client";

import { AlertCircle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ChatWelcome,
  type ChatSuggestion,
} from "@/features/chat/components/chat-welcome";
import { MessageBubble } from "@/features/chat/components/message-bubble";
import { ThinkingIndicator } from "@/features/chat/components/thinking-indicator";
import { useChatScroll } from "@/features/chat/hooks/use-chat-scroll";
import type {
  ChatActionButton,
  Message,
  SuggestedAction,
} from "@/features/chat/types";
import type { FeedbackRating } from "@/features/chat/services/evaluation.api";
import { getActivePath } from "@/features/chat/utils/conversation-tree";
import { cn } from "@/lib/utils";

type MessageThreadProps = {
  conversationId: string;
  messages: Message[];
  activeLeafId?: string | null;
  isLoading?: boolean;
  isError?: boolean;
  isWaiting?: boolean;
  onRetry?: () => void;
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
  className?: string;
};

function MessageThreadSkeleton() {
  return (
    <div
      className="mx-auto flex w-full max-w-4xl flex-col gap-5"
      role="status"
      aria-label="Loading messages"
    >
      <div className="flex justify-end">
        <div className="h-14 w-[52%] max-w-sm animate-pulse rounded-[1.35rem] bg-muted/80" />
      </div>
      <div className="flex justify-start">
        <div className="h-24 w-[78%] max-w-2xl animate-pulse rounded-[1.35rem] bg-muted/80" />
      </div>
      <div className="flex justify-end">
        <div className="h-11 w-[38%] max-w-xs animate-pulse rounded-[1.35rem] bg-muted/80" />
      </div>
      <span className="sr-only">Loading messages…</span>
    </div>
  );
}

export function MessageThread({
  conversationId,
  messages,
  activeLeafId = null,
  isLoading = false,
  isError = false,
  isWaiting = false,
  onRetry,
  onSuggestionSelect,
  onAction,
  onSuggestedAction,
  onRegenerate,
  onEdit,
  onSelectVersion,
  onFeedback,
  className,
}: MessageThreadProps) {
  const visibleMessages = getActivePath(messages, activeLeafId);
  const streamingLength =
    visibleMessages.find((message) => message.status === "streaming")?.content
      .length ?? 0;
  const hasStreamingMessage = visibleMessages.some(
    (message) => message.status === "streaming",
  );

  const scrollRef = useChatScroll({
    conversationId,
    itemCount: visibleMessages.length,
    isLoading,
    stickSignal: isWaiting || streamingLength,
  });

  const showWelcome =
    !isLoading && !isError && visibleMessages.length === 0 && !isWaiting;

  return (
    <div
      ref={scrollRef}
      className={cn(
        "min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-8 md:py-7",
        className,
      )}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      aria-label="Message thread"
    >
      {isLoading ? <MessageThreadSkeleton /> : null}

      {!isLoading && isError ? (
        <div
          role="alert"
          className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-5 py-10 text-center"
        >
          <div className="flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <AlertCircle className="size-5" aria-hidden />
          </div>
          <div className="space-y-1">
            <p className="font-display text-sm font-semibold text-foreground">
              Couldn’t load messages
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Check your connection and try again.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            aria-label="Retry loading messages"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            Retry
          </Button>
        </div>
      ) : null}

      {showWelcome ? (
        <ChatWelcome onSuggestionSelect={onSuggestionSelect} />
      ) : null}

      {!isLoading && !isError && (visibleMessages.length > 0 || isWaiting) ? (
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 md:gap-6">
          {visibleMessages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              allMessages={messages}
              actionDisabled={isWaiting}
              onAction={onAction}
              onSuggestedAction={onSuggestedAction}
              onRegenerate={onRegenerate}
              onEdit={onEdit}
              onSelectVersion={onSelectVersion}
              onFeedback={onFeedback}
            />
          ))}
          {isWaiting && !hasStreamingMessage ? <ThinkingIndicator /> : null}
        </div>
      ) : null}
    </div>
  );
}
