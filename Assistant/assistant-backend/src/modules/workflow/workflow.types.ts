/**
 * Declarative multi-step workflow definitions.
 * Register via WorkflowRegistry — no Planner changes required.
 */

export type WorkflowStepType = 'tool' | 'llm' | 'condition' | 'confirmation';

export type WorkflowRetryPolicy = {
  maxAttempts: number;
  delayMs?: number;
};

export type WorkflowStepDefinition = {
  id: string;
  name: string;
  type: WorkflowStepType;
  /** Tool registry id when type === 'tool'. */
  toolId?: string;
  /** Optional Action Engine action id. */
  actionId?: string;
  /**
   * Maps workflow state (+ message) into tool/llm/condition inputs.
   * Values may use {{path}} templates, e.g. "{{state.course.id}}".
   */
  input?: Record<string, unknown>;
  /**
   * Maps step result fields into workflow state keys.
   * Example: { selectedCourse: 'data.0', summary: 'text' }
   */
  output?: Record<string, string>;
  /** LLM instruction template when type === 'llm'. */
  prompt?: string;
  /** Condition expression against state (simple path equality / truthiness). */
  condition?: {
    /** Dot path on state, e.g. "registration.alreadyEnrolled" */
    path: string;
    /** If omitted, path is treated as truthy. */
    equals?: unknown;
    /** Substring match against the stringified path value. */
    includes?: string;
    /** Step id to jump to when condition is true. */
    whenTrue?: string;
    /** Step id to jump to when condition is false. */
    whenFalse?: string;
  };
  /** User-facing confirmation copy when type === 'confirmation'. */
  confirmationMessage?: string;
  retry?: WorkflowRetryPolicy;
  timeoutMs?: number;
  /** When true, a tool/llm failure returns recovery text and stops gracefully. */
  continueOnFailure?: boolean;
};

export type WorkflowDefinition = {
  id: string;
  name: string;
  description: string;
  /** Case-insensitive phrase / regex triggers. */
  triggerPhrases: Array<string | RegExp>;
  steps: WorkflowStepDefinition[];
  /** Optional initial state seed from the user message. */
  initialState?: Record<string, unknown>;
};

export type WorkflowStepStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'awaiting_confirmation';

export type WorkflowStepProgress = {
  id: string;
  name: string;
  status: WorkflowStepStatus;
  detail?: string;
};

export type WorkflowTraceInfo = {
  id: string;
  name: string;
  durationMs: number;
  status: 'completed' | 'paused' | 'failed' | 'cancelled';
  completedSteps: string[];
  failedSteps: string[];
  skippedSteps: string[];
  progress: WorkflowStepProgress[];
};

export type WorkflowState = Record<string, unknown>;

export type WorkflowRunResult = {
  handled: boolean;
  answer: string;
  paused?: boolean;
  cancelled?: boolean;
  confirmationId?: string;
  actions?: Array<{
    id: string;
    label: string;
    toolId: string;
    style?: 'primary' | 'secondary' | 'destructive';
    payload?: Record<string, unknown>;
    requiresConfirmation?: boolean;
  }>;
  state: WorkflowState;
  workflow: WorkflowTraceInfo;
  toolMs?: number;
  generationMs?: number;
  llm?: {
    modelName: string;
    latencyMs: number;
    inputTokens?: number;
    outputTokens?: number;
  };
};
