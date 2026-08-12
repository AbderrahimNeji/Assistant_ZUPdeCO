import type { Conversation, ConversationBranch } from "@/features/chat/types";

/** Raw conversation shape returned by the Nest conversation module. */
type ConversationApiModel = {
  id: string;
  title?: string | null;
  pinned?: boolean | null;
  createdAt?: string;
  updatedAt?: string;
  userId?: string;
  activeBranchId?: string | null;
  activeLeafId?: string | null;
  searchText?: string | null;
  branchCount?: number | null;
  branches?: Array<{ id?: string; label?: string }> | null;
};

function mapBranches(
  raw: ConversationApiModel["branches"],
): ConversationBranch[] | undefined {
  if (!raw?.length) return undefined;
  return raw
    .filter((item): item is { id: string; label: string } =>
      Boolean(item?.id && item?.label),
    )
    .map((item) => ({ id: item.id, label: item.label }));
}

export function mapConversation(raw: ConversationApiModel): Conversation {
  return {
    id: raw.id,
    title: raw.title?.trim() || "New conversation",
    updatedAt: raw.updatedAt ?? raw.createdAt ?? new Date().toISOString(),
    preview: "",
    pinned: Boolean(raw.pinned),
    activeBranchId: raw.activeBranchId ?? null,
    activeLeafId: raw.activeLeafId ?? null,
    searchText: raw.searchText ?? undefined,
    branchCount:
      typeof raw.branchCount === "number" ? raw.branchCount : undefined,
    branches: mapBranches(raw.branches),
  };
}

export function mapConversations(
  raw: ConversationApiModel[],
): Conversation[] {
  return raw.map(mapConversation);
}
