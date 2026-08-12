import type { Conversation } from "@/features/chat/types";

const GENERIC_TITLES = new Set([
  "",
  "new conversation",
  "untitled",
  "untitled conversation",
]);

/**
 * Display title for the UI only. Generic backend titles fall back to the
 * first user message / preview (truncated), without changing stored data.
 */
export function getConversationDisplayTitle(
  conversation: Pick<Conversation, "title" | "preview"> | null | undefined,
  firstUserMessage?: string | null,
): string {
  const fallbackFromMessage = firstUserMessage?.trim() || "";

  if (!conversation) {
    if (!fallbackFromMessage) return "Assistant";
    return fallbackFromMessage.length > 40
      ? `${fallbackFromMessage.slice(0, 40).trimEnd()}…`
      : fallbackFromMessage;
  }

  const title = conversation.title?.trim() ?? "";
  const isGeneric = GENERIC_TITLES.has(title.toLowerCase());

  if (!isGeneric && title) return title;

  const fallback =
    fallbackFromMessage || conversation.preview?.trim() || "";

  if (!fallback) return title || "New conversation";

  return fallback.length > 40
    ? `${fallback.slice(0, 40).trimEnd()}…`
    : fallback;
}

export function formatMessageTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
