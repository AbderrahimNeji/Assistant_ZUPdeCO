import type {
  ChatActionButton,
  ChatSourceKind,
  ExecutionTrace,
  Message,
  Source,
  SuggestedAction,
  SuggestedActionType,
} from "@/features/chat/types";

type MessageApiSource = {
  id?: string;
  kind?: string;
  label?: string;
  icon?: string;
  providerId?: string;
  pages?: number[];
  document?: string;
  documentName?: string;
  page?: number;
  score?: number;
  excerpt?: string;
  content?: string;
  text?: string;
};

type MessageApiActions = {
  status?: string;
  toolId?: string;
  confirmationId?: string;
  buttons?: ChatActionButton[];
};

type MessageApiSuggestedAction = {
  id?: string;
  label?: string;
  type?: string;
  payload?: Record<string, unknown>;
};

type MessageApiModel = {
  id: string;
  role?: string;
  content?: string;
  conversationId?: string;
  createdAt?: string;
  parentMessageId?: string | null;
  branchId?: string;
  version?: number;
  sources?: MessageApiSource[] | null;
  actions?: MessageApiActions | ChatActionButton[] | null;
  executionTrace?: ExecutionTrace | null;
  suggestedActions?: MessageApiSuggestedAction[] | null;
};

const KIND_FALLBACKS: Record<
  string,
  { kind: ChatSourceKind; icon: string }
> = {
  conversation_attachment: { kind: "conversation_attachment", icon: "📄" },
  conversation_attachments: { kind: "conversation_attachment", icon: "📄" },
  document_kb: { kind: "document_kb", icon: "📄" },
  application_db: { kind: "application_db", icon: "🗄️" },
};

const PROVIDER_LABELS: Record<string, { label: string; icon: string }> = {
  user_profile: { label: "User Profile", icon: "👤" },
  course: { label: "Courses Database", icon: "🎓" },
  tutor: { label: "Tutors", icon: "🧑‍🏫" },
  student: { label: "Students", icon: "🎓" },
  registration: { label: "Registration Records", icon: "📋" },
  program: { label: "Programs", icon: "🧭" },
  faq: { label: "FAQ Knowledge Base", icon: "❓" },
  policy: { label: "Policies", icon: "📜" },
};

function normalizeKind(raw?: string): ChatSourceKind {
  if (raw === "conversation_attachment" || raw === "conversation_attachments") {
    return "conversation_attachment";
  }
  if (raw === "application_db") return "application_db";
  return "document_kb";
}

function uniqueSortedPages(pages: Array<number | undefined>): number[] | undefined {
  const unique = [
    ...new Set(
      pages.filter(
        (page): page is number =>
          typeof page === "number" && Number.isFinite(page) && page > 0,
      ),
    ),
  ].sort((a, b) => a - b);

  return unique.length ? unique : undefined;
}

export function mapSource(
  raw: MessageApiSource,
  messageId: string,
  index: number,
): Source {
  const providerId =
    typeof raw.providerId === "string" && raw.providerId.trim()
      ? raw.providerId.trim()
      : undefined;

  const providerMeta = providerId ? PROVIDER_LABELS[providerId] : undefined;
  const kindMeta = KIND_FALLBACKS[raw.kind ?? ""] ?? KIND_FALLBACKS.document_kb;

  const label =
    raw.label?.trim() ||
    providerMeta?.label ||
    raw.document?.trim() ||
    raw.documentName?.trim() ||
    "Source";

  const pages =
    uniqueSortedPages(raw.pages ?? []) ??
    (typeof raw.page === "number" ? [raw.page] : undefined);

  return {
    id: raw.id ?? `${messageId}-source-${index}`,
    kind: normalizeKind(raw.kind) || kindMeta.kind,
    label,
    icon: raw.icon?.trim() || providerMeta?.icon || kindMeta.icon,
    providerId,
    pages,
    document: label,
    page: pages?.[0] ?? (typeof raw.page === "number" ? raw.page : undefined),
  };
}

function mapSources(
  raw: MessageApiModel["sources"],
  messageId: string,
): Source[] | undefined {
  if (!raw?.length) return undefined;

  return raw.map((source, index) => mapSource(source, messageId, index));
}

function mapActions(
  raw: MessageApiModel["actions"],
): {
  actions?: ChatActionButton[];
  confirmationId?: string;
} {
  if (!raw) return {};

  if (Array.isArray(raw)) {
    return { actions: raw.length ? raw : undefined };
  }

  return {
    actions: raw.buttons?.length ? raw.buttons : undefined,
    confirmationId: raw.confirmationId,
  };
}

function mapExecutionTrace(
  raw: MessageApiModel["executionTrace"],
): ExecutionTrace | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  if (!raw.requestId || !raw.planner || !raw.knowledge || !raw.timing) {
    return undefined;
  }
  return raw;
}

const SUGGESTED_ACTION_TYPES = new Set<SuggestedActionType>([
  "follow_up_question",
  "tool_action",
  "navigation",
  "download",
  "external_link",
]);

function mapSuggestedActions(
  raw: MessageApiModel["suggestedActions"],
): SuggestedAction[] | undefined {
  if (!raw?.length) return undefined;

  const mapped = raw
    .map((item): SuggestedAction | null => {
      if (!item || typeof item !== "object") return null;
      const id = typeof item.id === "string" ? item.id.trim() : "";
      const label = typeof item.label === "string" ? item.label.trim() : "";
      const type = item.type as SuggestedActionType | undefined;
      if (!id || !label || !type || !SUGGESTED_ACTION_TYPES.has(type)) {
        return null;
      }
      return {
        id,
        label,
        type,
        payload:
          item.payload && typeof item.payload === "object" ? item.payload : {},
      };
    })
    .filter((item): item is SuggestedAction => item !== null);

  return mapped.length ? mapped : undefined;
}

function normalizeRole(role?: string): Message["role"] {
  return role === "assistant" ? "assistant" : "user";
}

export function mapMessage(
  raw: MessageApiModel,
  fallbackConversationId: string,
): Message {
  const id = raw.id;
  const mappedActions = mapActions(raw.actions);
  return {
    id,
    conversationId: raw.conversationId ?? fallbackConversationId,
    role: normalizeRole(raw.role),
    content: raw.content ?? "",
    createdAt: raw.createdAt ?? new Date().toISOString(),
    parentMessageId: raw.parentMessageId ?? null,
    branchId: raw.branchId,
    version: typeof raw.version === "number" ? raw.version : 1,
    sources: mapSources(raw.sources, id),
    actions: mappedActions.actions,
    confirmationId: mappedActions.confirmationId,
    executionTrace: mapExecutionTrace(raw.executionTrace),
    suggestedActions: mapSuggestedActions(raw.suggestedActions),
  };
}

export function mapMessages(
  raw: MessageApiModel[] | undefined,
  conversationId: string,
): Message[] {
  if (!raw?.length) return [];
  return raw.map((message) => mapMessage(message, conversationId));
}
