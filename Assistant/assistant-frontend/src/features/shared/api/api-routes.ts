export const API_ROUTES = {
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    LOGOUT: "/auth/logout",
    ME: "/auth/me",
  },
  CHAT: {
    SEND: "/assistant/chat",
    STREAM: "/assistant/chat/stream",
    PARSE_ATTACHMENT: "/assistant/attachments/parse",
  },
  CONVERSATIONS: {
    LIST: "/conversation",
    DETAIL: (id: string) => `/conversation/${id}`,
    UPDATE: (id: string) => `/conversation/${id}`,
    DELETE: (id: string) => `/conversation/${id}`,
    CLEAR: "/conversation",
    ATTACHMENTS: (id: string) => `/conversation/${id}/attachments`,
    ATTACHMENT: (id: string, attachmentId: string) =>
      `/conversation/${id}/attachments/${attachmentId}`,
    ACTIVE_BRANCH: (id: string) => `/conversation/${id}/active-branch`,
  },
  DOCUMENTS: {
    LIST: "/documents",
    UPLOAD: "/documents/upload",
    DETAIL: (id: string) => `/documents/${id}`,
    DELETE: (id: string) => `/documents/${id}`,
    RETRY: (id: string) => `/documents/${id}/retry`,
    SEARCH: "/documents/search",
  },
  BENCHMARK: {
    RUN: "/benchmark/run",
    RUN_ASYNC: "/benchmark/run-async",
    JOB_PROGRESS: (jobId: string) => `/benchmark/jobs/${jobId}/progress`,
    RESULTS: "/benchmark/results",
    DETAIL: (id: string) => `/benchmark/${id}`,
    EXPORT: (id: string, format: "json" | "csv" | "pdf" = "json") =>
      `/benchmark/${id}/export?format=${format}`,
    HISTORY: "/benchmark/history",
    DATASETS: "/benchmark/datasets",
  },
  EVALUATION: {
    FEEDBACK: "/evaluation/feedback",
    FEEDBACK_CONVERSATION: (conversationId: string) =>
      `/evaluation/feedback/conversation/${conversationId}`,
    EVENTS: "/evaluation/events",
    ADMIN_OVERVIEW: "/evaluation/admin/metrics/overview",
    ADMIN_BY_DAY: "/evaluation/admin/metrics/by-day",
    ADMIN_BY_TOOL: "/evaluation/admin/metrics/by-tool",
    ADMIN_BY_PLANNER: "/evaluation/admin/metrics/by-planner-mode",
    ADMIN_FEEDBACK_SUMMARY: "/evaluation/admin/feedback/summary",
    ADMIN_TOOL_FAILURES: "/evaluation/admin/tools/failures",
    ADMIN_COMMENTS: "/evaluation/admin/feedback/comments",
    ADMIN_FLAGS: "/evaluation/admin/flags",
  },
  WORKFLOW_JOBS: {
    LIST: "/workflow/jobs",
    DETAIL: (id: string) => `/workflow/jobs/${id}`,
    CANCEL: (id: string) => `/workflow/jobs/${id}/cancel`,
    RETRY: (id: string) => `/workflow/jobs/${id}/retry`,
  },
} as const;
