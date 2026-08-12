"use client";

import {
  Download,
  FileText,
  Loader2,
  MessageSquare,
  MoreVertical,
  Pencil,
  Pin,
  PinOff,
  Trash2,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Conversation } from "@/features/chat/types";
import { getConversationDisplayTitle } from "@/features/chat/utils/display";
import { cn } from "@/lib/utils";

type ConversationItemProps = {
  conversation: Conversation;
  selected?: boolean;
  onSelect?: (conversation: Conversation) => void;
  onRename?: (conversation: Conversation) => void;
  onTogglePin?: (conversation: Conversation) => void;
  onExportMarkdown?: (conversation: Conversation) => void;
  onExportPdf?: (conversation: Conversation) => void;
  onDelete?: (conversation: Conversation) => void;
  isBusy?: boolean;
};

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function ConversationItem({
  conversation,
  selected = false,
  onSelect,
  onRename,
  onTogglePin,
  onExportMarkdown,
  onExportPdf,
  onDelete,
  isBusy = false,
}: ConversationItemProps) {
  const updatedLabel = formatUpdatedAt(conversation.updatedAt);
  const displayTitle = getConversationDisplayTitle(conversation);
  const preview = conversation.preview?.trim() || "";
  const pinned = conversation.pinned;

  return (
    <div
      className={cn(
        "group relative flex w-full items-stretch gap-0.5 rounded-xl border ednov-transition",
        selected
          ? "border-brand-orange/40 bg-brand-peach shadow-sm ring-1 ring-brand-orange/15"
          : "border-transparent hover:translate-x-0.5 hover:border-border hover:bg-muted/80",
        "active:scale-[0.995]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-2 left-0 w-[3px] rounded-full duration-150",
          selected
            ? "bg-brand-orange"
            : "scale-y-50 bg-transparent opacity-0 group-hover:scale-y-100 group-hover:bg-brand-orange/45 group-hover:opacity-100",
        )}
      />

      <button
        type="button"
        onClick={() => onSelect?.(conversation)}
        aria-current={selected ? "true" : undefined}
        aria-label={`${displayTitle}${pinned ? ", pinned" : ""}${updatedLabel ? `, updated ${updatedLabel}` : ""}`}
        className={cn(
          "flex min-w-0 flex-1 flex-col gap-1 px-3 py-2.5 pl-3.5 text-left",
          "rounded-xl duration-150",
          "focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
        )}
      >
        <span className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            {pinned ? (
              <Pin
                className="size-3.5 shrink-0 fill-brand-orange/25 text-brand-orange"
                aria-hidden
              />
            ) : (
              <MessageSquare
                className={cn(
                  "size-3.5 shrink-0 duration-150",
                  selected ? "text-brand-orange" : "text-muted-foreground/75",
                )}
                aria-hidden
              />
            )}
            <span
              title={displayTitle}
              className={cn(
                "truncate font-display text-[0.8125rem] tracking-tight",
                selected
                  ? "font-bold text-brand-navy"
                  : "font-semibold text-foreground",
              )}
            >
              {displayTitle}
            </span>
          </span>
          {updatedLabel ? (
            <time
              dateTime={conversation.updatedAt}
              className="shrink-0 text-[10px] font-medium tracking-wide text-muted-foreground/80 tabular-nums"
            >
              {updatedLabel}
            </time>
          ) : null}
        </span>

        {preview ? (
          <span
            className={cn(
              "line-clamp-2 pl-[1.375rem] text-[11px] leading-snug",
              selected ? "text-foreground/65" : "text-muted-foreground",
            )}
          >
            {preview}
          </span>
        ) : null}
      </button>

      <div className="flex items-center py-1.5 pr-1">
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={isBusy}
            aria-label={`Actions for ${displayTitle}`}
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon-sm" }),
              "size-7 rounded-lg duration-150",
              "hover:bg-brand-peach hover:text-brand-orange",
              "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 md:group-focus-within:opacity-100",
            )}
          >
            {isBusy ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <MoreVertical className="size-3.5" aria-hidden />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48" sideOffset={6}>
            <DropdownMenuItem
              disabled={isBusy}
              onClick={() => onRename?.(conversation)}
            >
              <Pencil className="size-4" aria-hidden />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isBusy}
              onClick={() => onTogglePin?.(conversation)}
            >
              {pinned ? (
                <PinOff className="size-4" aria-hidden />
              ) : (
                <Pin className="size-4" aria-hidden />
              )}
              {pinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={isBusy}
              onClick={() => onExportMarkdown?.(conversation)}
            >
              <FileText className="size-4" aria-hidden />
              Export Markdown
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isBusy}
              onClick={() => onExportPdf?.(conversation)}
            >
              <Download className="size-4" aria-hidden />
              Export PDF…
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={isBusy}
              onClick={() => onDelete?.(conversation)}
            >
              <Trash2 className="size-4" aria-hidden />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
