import type { SmallTalkIntent } from '../small-talk/small-talk.types';

/**
 * Safe, high-level execution transparency for chat responses.
 * Never includes prompts, retrieved text, embeddings, or chain-of-thought.
 */
export type ExecutionTrace = {
  requestId: string;

  planner: {
    mode: 'rag' | 'tool' | 'hybrid' | 'multi_step' | 'ui_action' | 'small_talk';
    confidence: number;
    /** Present when mode is small_talk. */
    intent?: SmallTalkIntent;
    /** High-level decision summary only. */
    reasoningSummary: string;
    selectedTools: Array<{
      id: string;
      reason: string;
      requiresConfirmation?: boolean;
    }>;
    /** Present in development / explicit inspector mode only. */
    executionPlan?: {
      includeRag: boolean;
      steps: Array<{ toolId: string; reason: string }>;
    };
  };

  knowledge: {
    conversationAttachments: number;
    documentKb: number;
    documentationKb: number;
    applicationDbProviders: string[];
    /** QuestionRouter intent when RAG ran. */
    routeIntent?: string;
    /**
     * Additive Business Query Engine transparency (live skills only).
     * Never includes raw facts or prompts.
     */
    business?: {
      questionCategory?: string;
      skillsExecuted?: string[];
      skillsSucceeded?: string[];
      skillsFailed?: string[];
      modulesQueried?: string[];
      confidence?: number;
      freshness?: string;
      partial?: boolean;
      dataSource?: string;
    };
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

  /** Why an action was or was not taken (safe, user-facing). */
  decisionSummary: string;

  /**
   * Optional multi-step workflow observability (additive).
   * Never includes prompts or retrieved document text.
   */
  workflow?: {
    id: string;
    name: string;
    durationMs: number;
    status: 'completed' | 'paused' | 'failed' | 'cancelled';
    completedSteps: string[];
    failedSteps: string[];
    skippedSteps: string[];
    progress: Array<{
      id: string;
      name: string;
      status:
        | 'pending'
        | 'running'
        | 'completed'
        | 'failed'
        | 'skipped'
        | 'awaiting_confirmation';
      detail?: string;
    }>;
  };

  /** Background job id when executionMode is background (additive). */
  jobId?: string;
  /** interactive | background */
  executionMode?: 'interactive' | 'background';
  /** Milliseconds spent waiting in the queue before the job started. */
  queueTime?: number;
  /** How many times this job was resumed or retried. */
  resumeCount?: number;
};

export type ExecutionTracePublic = ExecutionTrace;
