import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

export type PendingToolConfirmation = {
  id: string;
  userId: string;
  conversationId: string;
  toolId: string;
  actionId: string;
  payload: Record<string, unknown>;
  summary: string;
  expiresAt: number;
};

const TTL_MS = 15 * 60 * 1000;

/**
 * Short-lived confirmation tokens for destructive tools.
 * Scoped by userId — never reusable across users.
 */
@Injectable()
export class ToolConfirmationService {
  private readonly logger = new Logger(ToolConfirmationService.name);
  private readonly pending = new Map<string, PendingToolConfirmation>();

  create(input: {
    userId: string;
    conversationId: string;
    toolId: string;
    actionId: string;
    payload: Record<string, unknown>;
    summary: string;
  }): PendingToolConfirmation {
    this.sweep();

    const entry: PendingToolConfirmation = {
      id: randomUUID(),
      userId: input.userId,
      conversationId: input.conversationId,
      toolId: input.toolId,
      actionId: input.actionId,
      payload: input.payload,
      summary: input.summary,
      expiresAt: Date.now() + TTL_MS,
    };

    this.pending.set(entry.id, entry);
    return entry;
  }

  consume(
    confirmationId: string,
    userId: string,
  ): PendingToolConfirmation | null {
    this.sweep();
    const entry = this.pending.get(confirmationId);
    if (!entry) return null;
    if (entry.userId !== userId) {
      this.logger.warn(
        `confirmation ownership mismatch confirmationId=${confirmationId}`,
      );
      return null;
    }

    this.pending.delete(confirmationId);
    if (entry.expiresAt < Date.now()) {
      return null;
    }
    return entry;
  }

  peek(confirmationId: string, userId: string): PendingToolConfirmation | null {
    this.sweep();
    const entry = this.pending.get(confirmationId);
    if (!entry || entry.userId !== userId) return null;
    if (entry.expiresAt < Date.now()) {
      this.pending.delete(confirmationId);
      return null;
    }
    return entry;
  }

  private sweep() {
    const now = Date.now();
    for (const [id, entry] of this.pending) {
      if (entry.expiresAt < now) {
        this.pending.delete(id);
      }
    }
  }
}
