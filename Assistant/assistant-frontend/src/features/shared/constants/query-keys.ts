export const QUERY_KEYS = {
  AUTH: {
    ROOT: ["auth"] as const,
    CURRENT_USER: ["auth", "current-user"] as const,
  },
  CHAT: {
    ROOT: ["chat"] as const,
    MESSAGES: (conversationId: string) =>
      ["chat", "messages", conversationId] as const,
  },
  CONVERSATIONS: {
    ROOT: ["conversations"] as const,
    DETAIL: (conversationId: string) =>
      ["conversations", conversationId] as const,
  },
  DOCUMENTS: {
    ROOT: ["documents"] as const,
    DETAIL: (documentId: string) => ["documents", documentId] as const,
  },
  BENCHMARK: {
    ROOT: ["benchmark"] as const,
    RUNS: ["benchmark", "runs"] as const,
    DETAIL: (runId: string) => ["benchmark", "runs", runId] as const,
    HISTORY: ["benchmark", "history"] as const,
    DATASETS: ["benchmark", "datasets"] as const,
  },
  WORKFLOW_JOBS: {
    ROOT: ["workflow-jobs"] as const,
    LIST: (conversationId?: string | null) =>
      ["workflow-jobs", conversationId ?? "all"] as const,
  },
} as const;
