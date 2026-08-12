export type ChatSourceKind =
  | "conversation_attachment"
  | "document_kb"
  | "application_db";

export type Source = {
  id: string;
  kind: ChatSourceKind;
  label: string;
  icon: string;
  providerId?: string;
  pages?: number[];
  /** @deprecated Prefer `label`; kept for older payloads. */
  document: string;
  /** @deprecated Prefer `pages`; first page when available. */
  page?: number;
};

export type ChatActionStyle = "primary" | "secondary" | "destructive";

export type ChatActionButton = {
  id: string;
  label: string;
  toolId: string;
  style?: ChatActionStyle;
  payload?: Record<string, unknown>;
  requiresConfirmation?: boolean;
};

export type ExecutionTrace = {
  requestId: string;
  planner: {
    mode: "rag" | "tool" | "hybrid" | "multi_step" | "ui_action" | "small_talk";
    confidence: number;
    intent?: "greeting" | "gratitude" | "farewell" | "status" | "identity";
    reasoningSummary: string;
    selectedTools: Array<{
      id: string;
      reason: string;
      requiresConfirmation?: boolean;
    }>;
    executionPlan?: {
      includeRag: boolean;
      steps: Array<{ toolId: string; reason: string }>;
    };
  };
  knowledge: {
    conversationAttachments: number;
    documentKb: number;
    applicationDbProviders: string[];
  };
  toolExecution: Array<{
    toolId: string;
    durationMs?: number;
    success: boolean;
    confirmationRequired: boolean;
    confirmationCompleted: boolean;
    status?: string;
  }>;
  llm?: {
    modelName: string;
    latencyMs: number;
    inputTokens?: number;
    outputTokens?: number;
  };
  timing: {
    totalMs: number;
    retrievalMs?: number;
    toolMs?: number;
    generationMs?: number;
  };
  decisionSummary: string;
  workflow?: {
    id: string;
    name: string;
    durationMs: number;
    status: "completed" | "paused" | "failed" | "cancelled";
    completedSteps: string[];
    failedSteps: string[];
    skippedSteps: string[];
    progress: Array<{
      id: string;
      name: string;
      status:
        | "pending"
        | "running"
        | "completed"
        | "failed"
        | "skipped"
        | "awaiting_confirmation";
      detail?: string;
    }>;
  };
  jobId?: string;
  executionMode?: "interactive" | "background";
  queueTime?: number;
  resumeCount?: number;
};

export type SuggestedActionType =
  | "follow_up_question"
  | "tool_action"
  | "navigation"
  | "download"
  | "external_link";

export type SuggestedAction = {
  id: string;
  label: string;
  type: SuggestedActionType;
  payload: Record<string, unknown>;
};

export type Message = {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  parentMessageId?: string | null;
  branchId?: string;
  version?: number;
  sources?: Source[];
  actions?: ChatActionButton[];
  confirmationId?: string;
  executionTrace?: ExecutionTrace;
  suggestedActions?: SuggestedAction[];
  /** User feedback for this assistant message (loaded / local). */
  feedbackRating?: "HELPFUL" | "NOT_HELPFUL";
  /** Client-only delivery / stream state. */
  status?: "sending" | "streaming" | "interrupted" | "error";
};

export type ConversationBranch = {
  id: string;
  label: string;
};

export type Conversation = {
  id: string;
  title: string;
  updatedAt: string;
  preview: string;
  pinned: boolean;
  activeBranchId?: string | null;
  activeLeafId?: string | null;
  searchText?: string;
  branchCount?: number;
  branches?: ConversationBranch[];
};

export type ConversationAttachment = {
  id: string;
  name: string;
  mimeType?: string | null;
  size?: number | null;
  createdAt: string;
  updatedAt?: string;
};

export type ChatAttachmentPayload = {
  name: string;
  text: string;
};

export type ChatActionRequest = {
  toolId: string;
  actionId: string;
  payload?: Record<string, unknown>;
};

export type ChatConfirmRequest = {
  confirmationId: string;
  approved: boolean;
};

export type ChatRequest = {
  message: string;
  conversationId?: string;
  attachments?: ChatAttachmentPayload[];
  action?: ChatActionRequest;
  confirm?: ChatConfirmRequest;
  regenerate?: boolean;
  editMessageId?: string;
  parentMessageId?: string;
  executionMode?: "interactive" | "background";
};

export type ChatSource = {
  kind: ChatSourceKind;
  label: string;
  icon: string;
  providerId?: string;
  pages?: number[];
  document: string;
  page?: number;
};

export type ChatResponse = {
  success: boolean;
  conversationId: string;
  messageId?: string;
  userMessageId?: string;
  parentMessageId?: string;
  branchId?: string;
  version?: number;
  activeBranchId?: string;
  activeLeafId?: string;
  answer: string;
  sources: ChatSource[];
  actions?: ChatActionButton[];
  confirmationId?: string;
  executionTrace?: ExecutionTrace;
  suggestedActions?: SuggestedAction[];
  pipeline?: {
    language?: string;
    intent?: string;
    action?: {
      toolId?: string;
      status?: string;
      durationMs?: number;
    };
    planner?: {
      mode?: string;
      confidence?: number;
    };
  };
};
