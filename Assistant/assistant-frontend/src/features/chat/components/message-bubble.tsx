"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Loader2,
  Pencil,
  RotateCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { MessageActions } from "@/features/chat/components/message-actions";
import { ExecutionInspector } from "@/features/chat/components/execution-inspector";
import { MessageSources } from "@/features/chat/components/source-card";
import { MessageMarkdown } from "@/features/chat/components/message-markdown";
import { SuggestedNextActions } from "@/features/chat/components/suggested-next-actions";
import { MessageFeedbackControls } from "@/features/chat/components/message-feedback";
import { WorkflowProgressPanel } from "@/features/chat/components/workflow-progress-panel";
import type {
  ChatActionButton,
  Message,
  SuggestedAction,
} from "@/features/chat/types";
import type { FeedbackRating } from "@/features/chat/services/evaluation.api";
import { getSiblingGroup } from "@/features/chat/utils/conversation-tree";
import { formatMessageTime } from "@/features/chat/utils/display";
import { cn } from "@/lib/utils";

type MessageBubbleProps = {
  message: Message;
  allMessages?: Message[];
  className?: string;
  actionDisabled?: boolean;
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

export const MessageBubble = memo(function MessageBubble({
  message,
  allMessages = [],
  className,
  actionDisabled = false,
  onAction,
  onSuggestedAction,
  onRegenerate,
  onEdit,
  onSelectVersion,
  onFeedback,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isSending = message.status === "sending";
  const isStreaming = message.status === "streaming";
  const isInterrupted = message.status === "interrupted";
  const isError = message.status === "error";
  const timeLabel = formatMessageTime(message.createdAt);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const copyTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!editing) setDraft(message.content);
  }, [message.content, editing]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      if (copyTimeoutRef.current !== null) {
        window.clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = window.setTimeout(() => {
        copyTimeoutRef.current = null;
        setCopied(false);
      }, 1600);
    } catch {
      setCopied(false);
    }
  }, [message.content]);

  const isSmallTalk =
    !isUser && message.executionTrace?.planner?.mode === "small_talk";
  const showMeta = !isUser && !isSmallTalk && !isStreaming && !isSending;
  const canRegenerate =
    !isUser &&
    !isStreaming &&
    !isSending &&
    Boolean(onRegenerate) &&
    !actionDisabled;
  const canEdit =
    isUser &&
    !isSending &&
    !isStreaming &&
    Boolean(onEdit) &&
    !actionDisabled &&
    !editing;

  const siblings = getSiblingGroup(allMessages, message);

  function selectSibling(delta: number) {
    if (!siblings || !onSelectVersion) return;
    const nextIndex =
      (siblings.index + delta + siblings.siblings.length) %
      siblings.siblings.length;
    const next = siblings.siblings[nextIndex];
    if (next) onSelectVersion(next);
  }

  return (
    <article
      aria-label={
        isUser
          ? isSending
            ? "Your message, sending"
            : "Your message"
          : isStreaming
            ? "Assistant message, generating"
            : "Assistant message"
      }
      aria-busy={isSending || isStreaming || undefined}
      className={cn(
        "group/message flex w-full flex-col gap-1.5",
        isUser ? "items-end" : "items-start",
        className,
      )}
    >
      <div
        className={cn(
          "w-fit text-[0.9375rem] leading-[1.7] shadow-bubble ednov-transition",
          isUser
            ? "max-w-[min(100%,38rem)] rounded-[1.35rem] rounded-br-md bg-brand-orange px-5 py-3.5 text-white"
            : "max-w-[min(100%,46rem)] rounded-[1.35rem] rounded-bl-md border border-border/80 bg-card px-5 py-4 text-card-foreground sm:px-6",
          isSending && "opacity-70",
        )}
      >
        {isUser ? (
          <div className="space-y-1.5">
            {editing ? (
              <div className="space-y-2">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={4}
                  className="w-full min-w-[16rem] resize-y rounded-xl border border-white/30 bg-white/15 px-3 py-2 text-sm text-white outline-none placeholder:text-white/60"
                  aria-label="Edit message"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-white/90 hover:bg-white/15 hover:text-white"
                    onClick={() => {
                      setDraft(message.content);
                      setEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="h-7"
                    disabled={!draft.trim() || draft.trim() === message.content}
                    onClick={() => {
                      const next = draft.trim();
                      if (!next || next === message.content) return;
                      onEdit?.(message, next);
                      setEditing(false);
                    }}
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap break-words leading-[1.7]">
                {message.content}
              </p>
            )}
            {isSending ? (
              <p className="flex items-center gap-1.5 text-[11px] text-white/70">
                <Loader2 className="size-3 animate-spin" aria-hidden />
                Sending…
              </p>
            ) : null}
          </div>
        ) : (
          <div className="relative">
            {message.content ? (
              <MessageMarkdown
                content={message.content}
                className="text-card-foreground"
              />
            ) : isStreaming ? (
              <p className="text-muted-foreground">Generating…</p>
            ) : null}
            {isStreaming ? (
              <span
                aria-hidden
                className="ml-0.5 inline-block h-[1.05em] w-[0.55ch] translate-y-[0.12em] bg-brand-orange align-baseline [animation:stream-cursor_1s_step-end_infinite]"
              />
            ) : null}
          </div>
        )}

        {isError ? (
          <p className="mt-2 text-xs text-destructive">
            Generation stopped unexpectedly.
          </p>
        ) : null}
        {isInterrupted ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Generation stopped.
          </p>
        ) : null}

        {!isUser && !isStreaming && !isSending ? (
          <WorkflowProgressPanel workflow={message.executionTrace?.workflow} />
        ) : null}

        {showMeta ? <MessageSources sources={message.sources} /> : null}
        {showMeta ? (
          <MessageActions
            actions={message.actions}
            disabled={actionDisabled}
            onAction={onAction}
          />
        ) : null}
        {showMeta ? (
          <SuggestedNextActions
            suggestions={message.suggestedActions}
            disabled={actionDisabled}
            onSelect={onSuggestedAction}
          />
        ) : null}
        {!isUser && onFeedback && !isSending && !isStreaming ? (
          <MessageFeedbackControls
            messageId={message.id}
            rating={message.feedbackRating}
            disabled={actionDisabled}
            onRate={onFeedback}
          />
        ) : null}
        {showMeta ? (
          <ExecutionInspector trace={message.executionTrace} />
        ) : null}
      </div>

      <div
        className={cn(
          "flex h-7 items-center gap-1.5 px-2",
          isUser ? "flex-row-reverse" : "flex-row",
        )}
      >
        {timeLabel && !isSending && !isStreaming ? (
          <time
            dateTime={message.createdAt}
            className="text-[10px] font-medium tracking-wide text-muted-foreground/80"
          >
            {timeLabel}
          </time>
        ) : null}

        {siblings && !isStreaming && !isSending ? (
          <div className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-6 rounded-md"
              disabled={actionDisabled}
              aria-label="Previous version"
              onClick={() => selectSibling(-1)}
            >
              <ChevronLeft className="size-3.5" aria-hidden />
            </Button>
            <span className="tabular-nums">
              {siblings.index + 1} / {siblings.siblings.length}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-6 rounded-md"
              disabled={actionDisabled}
              aria-label="Next version"
              onClick={() => selectSibling(1)}
            >
              <ChevronRight className="size-3.5" aria-hidden />
            </Button>
          </div>
        ) : null}

        {canEdit ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 gap-1 rounded-lg px-2 text-[11px] font-medium text-muted-foreground",
              "hover:bg-brand-peach hover:text-brand-orange",
              "opacity-100 md:opacity-0 md:group-hover/message:opacity-100 md:group-focus-within/message:opacity-100 md:focus-visible:opacity-100",
            )}
            onClick={() => setEditing(true)}
            aria-label="Edit message"
            title="Edit message"
          >
            <Pencil className="size-3.5" aria-hidden />
            Edit
          </Button>
        ) : null}

        {canRegenerate ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 gap-1 rounded-lg px-2 text-[11px] font-medium text-muted-foreground",
              "hover:bg-brand-peach hover:text-brand-orange",
              "opacity-100 md:opacity-0 md:group-hover/message:opacity-100 md:group-focus-within/message:opacity-100 md:focus-visible:opacity-100",
            )}
            onClick={() => onRegenerate?.(message)}
            aria-label="Regenerate response"
            title="Regenerate response"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Regenerate
          </Button>
        ) : null}

        {!isUser && !isSending && !isStreaming ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={cn(
              "size-7 rounded-lg text-muted-foreground duration-150",
              "hover:bg-brand-peach hover:text-brand-orange",
              "opacity-100 md:opacity-0 md:group-hover/message:opacity-100 md:group-focus-within/message:opacity-100 md:focus-visible:opacity-100",
              copied && "opacity-100 text-brand-orange md:opacity-100",
            )}
            onClick={handleCopy}
            aria-label={copied ? "Answer copied" : "Copy answer"}
            title={copied ? "Copied" : "Copy answer"}
          >
            {copied ? (
              <Check className="size-3.5" aria-hidden />
            ) : (
              <Copy className="size-3.5" aria-hidden />
            )}
          </Button>
        ) : null}
      </div>
    </article>
  );
});
