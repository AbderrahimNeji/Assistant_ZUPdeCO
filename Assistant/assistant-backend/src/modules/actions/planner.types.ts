export type PlanMode = 'rag' | 'tool' | 'hybrid' | 'multi_step' | 'small_talk';

export type PlanStep = {
  /** Tool registry id. */
  toolId: string;
  /** Why this step was selected. */
  reason: string;
  /** Hint for the UI / orchestrator — validation still decides. */
  requiresConfirmation?: boolean;
  /** Optional payload hints for chaining (never trusted for auth). */
  payload?: Record<string, unknown>;
};

/**
 * Planner output. Tool validation / confirmation remain authoritative.
 */
export type ExecutionPlan = {
  mode: PlanMode;
  reason: string;
  confidence: number;
  steps: PlanStep[];
  /** True when RAG should run (rag or hybrid). */
  includeRag: boolean;
};

export type PlannerInput = {
  message: string;
  /** Tool ids known to the registry (discovery). */
  availableToolIds: string[];
};

export const PLANNER_CONFIDENCE_THRESHOLD = 0.55;
