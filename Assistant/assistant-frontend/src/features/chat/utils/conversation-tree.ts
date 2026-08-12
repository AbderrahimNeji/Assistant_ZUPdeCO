import type { Message } from "@/features/chat/types";

export type ConversationBranch = {
  id: string;
  label: string;
};

export type MessageSiblingGroup = {
  siblings: Message[];
  index: number;
  current: Message;
};

/** Leaf → root → chronological active path. */
export function getActivePath(
  messages: Message[],
  activeLeafId?: string | null,
): Message[] {
  if (!messages.length) return [];

  const byId = new Map(messages.map((message) => [message.id, message]));
  const leaf =
    (activeLeafId ? byId.get(activeLeafId) : undefined) ??
    messages[messages.length - 1];

  if (!leaf) return [];

  const path: Message[] = [];
  const seen = new Set<string>();
  let current: Message | undefined = leaf;

  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.push(current);
    current = current.parentMessageId
      ? byId.get(current.parentMessageId)
      : undefined;
  }

  return path.reverse();
}

export function getSiblingGroup(
  messages: Message[],
  message: Message,
): MessageSiblingGroup | null {
  const siblings = messages
    .filter((item) => {
      if (item.role !== message.role) return false;
      const sameParent =
        (item.parentMessageId ?? null) === (message.parentMessageId ?? null);
      return sameParent;
    })
    .sort(
      (a, b) =>
        (a.version ?? 1) - (b.version ?? 1) ||
        a.createdAt.localeCompare(b.createdAt),
    );

  if (siblings.length <= 1) return null;

  const index = Math.max(
    0,
    siblings.findIndex((item) => item.id === message.id),
  );

  return {
    siblings,
    index,
    current: siblings[index] ?? message,
  };
}

export function listBranches(messages: Message[]): ConversationBranch[] {
  const seen = new Set<string>();
  const branches: ConversationBranch[] = [];

  for (const message of messages) {
    if (!message.branchId || seen.has(message.branchId)) continue;
    seen.add(message.branchId);
    branches.push({
      id: message.branchId,
      label: `Branch ${String.fromCharCode(65 + ((branches.length) % 26))}`,
    });
  }

  return branches;
}

export function deepestLeafFrom(
  messages: Message[],
  startId: string,
): Message | undefined {
  const byParent = new Map<string | null, Message[]>();
  for (const message of messages) {
    const key = message.parentMessageId ?? null;
    const list = byParent.get(key) ?? [];
    list.push(message);
    byParent.set(key, list);
  }

  const byId = new Map(messages.map((message) => [message.id, message]));
  let current = byId.get(startId);
  if (!current) return undefined;

  while (true) {
    const children = (byParent.get(current.id) ?? []).sort(
      (a, b) =>
        (a.version ?? 1) - (b.version ?? 1) ||
        a.createdAt.localeCompare(b.createdAt),
    );
    if (!children.length) return current;
    current = children[children.length - 1]!;
  }
}
