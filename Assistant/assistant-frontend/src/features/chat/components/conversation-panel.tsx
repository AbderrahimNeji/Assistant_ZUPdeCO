"use client";

import {
  AlertCircle,
  Loader2,
  MessageSquarePlus,
  MessagesSquare,
  RefreshCw,
  SearchX,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConversationItem } from "@/features/chat/components/conversation-item";
import type { Conversation } from "@/features/chat/types";
import { cn } from "@/lib/utils";

type ConversationPanelProps = {
  conversations?: Conversation[];
  /** Unfiltered conversation count — used to distinguish search vs empty. */
  totalConversationCount?: number;
  searchQuery?: string;
  selectedConversationId?: string | null;
  onSelectConversation?: (conversation: Conversation) => void;
  onNewConversation?: () => void;
  onRenameConversation?: (conversation: Conversation) => void;
  onTogglePinConversation?: (conversation: Conversation) => void;
  onExportMarkdown?: (conversation: Conversation) => void;
  onExportPdf?: (conversation: Conversation) => void;
  onDeleteConversation?: (conversation: Conversation) => void;
  onClearAllConversations?: () => void;
  onClearSearch?: () => void;
  onRetry?: () => void;
  isLoading?: boolean;
  isError?: boolean;
  isCreating?: boolean;
  isClearing?: boolean;
  busyConversationId?: string | null;
  className?: string;
  id?: string;
};

function ConversationListSkeleton() {
  return (
    <div
      className="flex flex-col gap-2 p-3"
      role="status"
      aria-label="Loading conversations"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-xl border border-transparent bg-muted/55 px-3 py-3"
        >
          <div className="mb-2 h-3.5 w-2/3 rounded bg-muted-foreground/15" />
          <div className="h-2.5 w-1/2 rounded bg-muted-foreground/10" />
        </div>
      ))}
      <span className="sr-only">Loading conversations…</span>
    </div>
  );
}

export function ConversationPanel({
  conversations = [],
  totalConversationCount,
  searchQuery = "",
  selectedConversationId = null,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onTogglePinConversation,
  onExportMarkdown,
  onExportPdf,
  onDeleteConversation,
  onClearAllConversations,
  onClearSearch,
  onRetry,
  isLoading = false,
  isError = false,
  isCreating = false,
  isClearing = false,
  busyConversationId = null,
  className,
  id,
}: ConversationPanelProps) {
  const totalCount = totalConversationCount ?? conversations.length;
  const hasSearch = Boolean(searchQuery.trim());
  const isNoSearchResults =
    !isLoading &&
    !isError &&
    hasSearch &&
    conversations.length === 0 &&
    totalCount > 0;
  const isEmpty =
    !isLoading && !isError && !hasSearch && conversations.length === 0;
  const canClearAll =
    Boolean(onClearAllConversations) && totalCount > 0 && !isLoading && !isError;

  return (
    <aside
      id={id}
      aria-label="Conversations"
      className={cn(
        "flex h-full w-full flex-col border-border bg-card",
        className,
      )}
    >
      <div className="flex flex-col gap-3 border-b border-border px-3.5 py-3.5">
        <div className="space-y-0.5">
          <p className="ednov-section-title text-[0.95rem]">Conversations</p>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Browse and resume your threads
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="default"
            className="w-full justify-center active:scale-[0.98]"
            aria-label="Start a new conversation"
            onClick={onNewConversation}
            disabled={isCreating || isLoading || isClearing}
            aria-busy={isCreating}
          >
            {isCreating ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <MessageSquarePlus className="size-4" aria-hidden />
            )}
            {isCreating ? "Creating…" : "New conversation"}
          </Button>

          {canClearAll ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-center text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label="Clear all conversations"
              onClick={onClearAllConversations}
              disabled={isClearing || isCreating}
              aria-busy={isClearing}
            >
              {isClearing ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="size-3.5" aria-hidden />
              )}
              {isClearing ? "Clearing…" : "Clear all"}
            </Button>
          ) : null}
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {isLoading ? <ConversationListSkeleton /> : null}

        {isError ? (
          <div
            role="alert"
            className="m-3 flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-5 py-10 text-center"
          >
            <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertCircle className="size-5" aria-hidden />
            </div>
            <div className="space-y-1">
              <p className="font-display text-sm font-semibold text-foreground">
                Couldn’t load conversations
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
              aria-label="Retry loading conversations"
            >
              <RefreshCw className="size-3.5" aria-hidden />
              Retry
            </Button>
          </div>
        ) : null}

        {isEmpty ? (
          <div
            role="status"
            className="m-3 flex flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-card px-5 py-12 text-center"
          >
            <div className="flex size-14 items-center justify-center rounded-xl bg-brand-peach text-brand-orange">
              <MessagesSquare className="size-6" aria-hidden />
            </div>
            <div className="space-y-1.5">
              <p className="font-display text-sm font-semibold text-foreground">
                No conversations yet
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Start a new conversation to see it appear in this panel.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Create your first conversation"
              onClick={onNewConversation}
              disabled={isCreating}
            >
              <MessageSquarePlus className="size-3.5" aria-hidden />
              Create one
            </Button>
          </div>
        ) : null}

        {isNoSearchResults ? (
          <div
            role="status"
            className="m-3 flex flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-card px-5 py-12 text-center"
          >
            <div className="flex size-14 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <SearchX className="size-6" aria-hidden />
            </div>
            <div className="space-y-1.5">
              <p className="font-display text-sm font-semibold text-foreground">
                No matching conversations
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Nothing matched “{searchQuery.trim()}”. Try a different search
                or clear the filter.
              </p>
            </div>
            {onClearSearch ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClearSearch}
                aria-label="Clear conversation search"
              >
                Clear search
              </Button>
            ) : null}
          </div>
        ) : null}

        {!isLoading && !isError && conversations.length > 0 ? (
          <nav
            aria-label="Conversation list"
            className="flex flex-col gap-2 p-2.5"
          >
            {conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                selected={conversation.id === selectedConversationId}
                onSelect={onSelectConversation}
                onRename={onRenameConversation}
                onTogglePin={onTogglePinConversation}
                onExportMarkdown={onExportMarkdown}
                onExportPdf={onExportPdf}
                onDelete={onDeleteConversation}
                isBusy={busyConversationId === conversation.id}
              />
            ))}
          </nav>
        ) : null}
      </ScrollArea>
    </aside>
  );
}
