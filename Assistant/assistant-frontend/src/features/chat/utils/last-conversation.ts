const STORAGE_KEY = "assistant-last-conversation-id";

/** Persists the last active conversation id for restore after refresh. */
export function getLastConversationId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value?.trim() || null;
  } catch {
    return null;
  }
}

export function setLastConversationId(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!id) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function pickMostRecentConversation<
  T extends { id: string; updatedAt: string; pinned?: boolean },
>(conversations: T[]): T | null {
  if (!conversations.length) return null;

  return [...conversations].sort((a, b) => {
    const aPinned = Boolean(a.pinned);
    const bPinned = Boolean(b.pinned);
    if (aPinned !== bPinned) return aPinned ? -1 : 1;
    return (
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  })[0]!;
}
