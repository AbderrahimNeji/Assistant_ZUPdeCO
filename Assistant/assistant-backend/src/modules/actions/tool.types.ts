import { UserRole } from '@prisma/client';

export type ToolUserContext = {
  userId: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  email: string;
};

export type ToolActionStyle = 'primary' | 'secondary' | 'destructive';

/** Button rendered under an assistant message (no UI redesign — existing buttons). */
export type ToolActionButton = {
  id: string;
  label: string;
  toolId: string;
  style?: ToolActionStyle;
  payload?: Record<string, unknown>;
  /** When true, clicking creates a confirmation step instead of executing. */
  requiresConfirmation?: boolean;
};

export type ToolValidationResult = {
  ok: boolean;
  error?: string;
  /**
   * When true, the orchestrator must not answer — fall through to RAG / BQE.
   * Used when a planned tool matched a live-data question it does not own.
   */
  defer?: boolean;
  /** Suggested recovery buttons when validation fails. */
  recoveryActions?: ToolActionButton[];
  /** Parsed / normalized payload for execute(). */
  payload?: Record<string, unknown>;
  /** Soft proposal before mutate (e.g. show [Enroll]). */
  proposal?: {
    message: string;
    actions: ToolActionButton[];
  };
  /** Destructive action: ask for confirm before execute. */
  confirmation?: {
    summary: string;
    payload: Record<string, unknown>;
    /** Optional structured preview for richer confirmation UI. */
    preview?: {
      title?: string;
      entities?: Array<{ type: string; label: string }>;
      warnings?: string[];
    };
  };
};

export type ToolExecuteInput = {
  rawMessage: string;
  conversationId: string;
  actionId?: string;
  payload?: Record<string, unknown>;
};

export type ToolExecutionStatus =
  | 'proposal'
  | 'confirmation_required'
  | 'executed'
  | 'cancelled'
  | 'error'
  | 'validation_error';

export type ToolOrchestratorResult = {
  handled: boolean;
  status?: ToolExecutionStatus;
  toolId?: string;
  message?: string;
  actions?: ToolActionButton[];
  confirmationId?: string;
  durationMs?: number;
  /** Populated for multi-step / planned runs. */
  toolsUsed?: string[];
  /** Last successful execute() payload for chaining (never sent to clients). */
  data?: unknown;
};

/**
 * Modular application tool.
 * Register in ToolRegistry only — AssistantService stays unchanged beyond orchestrator call.
 */
export interface ApplicationTool {
  readonly id: string;
  readonly description: string;

  /** Fast routing gate — no side effects. */
  canHandle(question: string, user: ToolUserContext): boolean;

  /** Permission, ownership, and input checks. */
  validate(
    input: ToolExecuteInput,
    user: ToolUserContext,
  ): Promise<ToolValidationResult>;

  /** Perform the action via application services (never raw cross-user DB). */
  execute(input: ToolExecuteInput, user: ToolUserContext): Promise<unknown>;

  /** Turn structured results into a user-facing message. */
  formatResult(data: unknown, status: ToolExecutionStatus): string;
}

export function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

export function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}
