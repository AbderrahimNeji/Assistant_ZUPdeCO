import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

import type { WorkflowState, WorkflowStepProgress } from './workflow.types';

export type PausedWorkflowRun = {
  runId: string;
  userId: string;
  conversationId: string;
  workflowId: string;
  /** Index of the step to run after confirmation. */
  resumeStepIndex: number;
  state: WorkflowState;
  progress: WorkflowStepProgress[];
  confirmationId: string;
  /** When pause came from a tool confirmation_required. */
  pendingToolConfirm: boolean;
  startedAt: number;
  expiresAt: number;
};

const TTL_MS = 30 * 60 * 1000;

/**
 * In-memory paused workflow runs (confirmation gate).
 * Scoped by userId — mirrors ToolConfirmationService lifetime.
 */
@Injectable()
export class WorkflowRunStore {
  private readonly logger = new Logger(WorkflowRunStore.name);
  private readonly byConfirmation = new Map<string, PausedWorkflowRun>();
  private readonly byRunId = new Map<string, PausedWorkflowRun>();

  createRunId(): string {
    return randomUUID();
  }

  pause(run: Omit<PausedWorkflowRun, 'expiresAt'>): PausedWorkflowRun {
    this.sweep();
    const entry: PausedWorkflowRun = {
      ...run,
      expiresAt: Date.now() + TTL_MS,
    };
    this.byConfirmation.set(entry.confirmationId, entry);
    this.byRunId.set(entry.runId, entry);
    return entry;
  }

  getByConfirmation(
    confirmationId: string,
    userId: string,
  ): PausedWorkflowRun | null {
    this.sweep();
    const entry = this.byConfirmation.get(confirmationId);
    if (!entry || entry.userId !== userId) return null;
    return entry;
  }

  consume(confirmationId: string, userId: string): PausedWorkflowRun | null {
    const entry = this.getByConfirmation(confirmationId, userId);
    if (!entry) return null;
    this.byConfirmation.delete(confirmationId);
    this.byRunId.delete(entry.runId);
    return entry;
  }

  private sweep() {
    const now = Date.now();
    for (const [id, entry] of this.byConfirmation) {
      if (entry.expiresAt < now) {
        this.byConfirmation.delete(id);
        this.byRunId.delete(entry.runId);
        this.logger.debug(`expired workflow run ${entry.runId}`);
      }
    }
  }
}
