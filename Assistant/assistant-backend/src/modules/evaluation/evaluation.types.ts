/**
 * Evaluation & Feedback Framework — shared types.
 * Privacy: never include prompts, CoT, retrieved text, embeddings, or secrets.
 */

export type TurnToolMetric = {
  toolId: string;
  success: boolean;
  status?: string;
};

export type RecordTurnMetricInput = {
  messageId: string;
  conversationId: string;
  userId: string;
  plannerMode: string;
  plannerConfidence?: number;
  knowledgeProviders: string[];
  toolsExecuted: TurnToolMetric[];
  responseLatencyMs?: number;
  retrievalLatencyMs?: number;
  generationLatencyMs?: number;
  toolLatencyMs?: number;
  sourceCount: number;
  suggestionCount: number;
  confirmationRequired: boolean;
  confirmationCompleted: boolean;
  usedRag: boolean;
  usedTools: boolean;
  isHybrid: boolean;
  isUnanswered: boolean;
  isPlannerFallback: boolean;
};

export const EVALUATION_EVENT_TYPES = {
  SUGGESTION_CLICK: 'SUGGESTION_CLICK',
  TOOL_ACTION: 'TOOL_ACTION',
  FEEDBACK: 'FEEDBACK',
} as const;

export type EvaluationEventType =
  (typeof EVALUATION_EVENT_TYPES)[keyof typeof EVALUATION_EVENT_TYPES];

/** Failure-detection windows / thresholds (easy to tune). */
export const FAILURE_DETECTION = {
  windowHours: 24,
  toolFailureCount: 3,
  lowRatingCount: 3,
  plannerFallbackCount: 5,
  unansweredCount: 5,
  plannerFallbackConfidence: 0.5,
} as const;
