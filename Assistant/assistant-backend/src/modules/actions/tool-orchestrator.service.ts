import { Injectable, Logger } from '@nestjs/common';

import { SkillAuditService } from '../../common/security/skill-audit.service';
import { toClientSafeErrorMessage } from '../../common/security/safe-client-error';
import { PrismaService } from '../../prisma/prisma.service';
import { ToolConfirmationService } from './tool-confirmation.service';
import { ToolRegistry } from './tool.registry';
import {
  ApplicationTool,
  ToolActionButton,
  ToolExecuteInput,
  ToolOrchestratorResult,
  ToolUserContext,
  ToolValidationResult,
} from './tool.types';

const MUTATING_TOOL_IDS = new Set([
  'enrollment',
  'registration',
  'document',
  'profile',
  'tutor',
  'session',
  'matching',
  'report',
  'notification',
]);

/** Mutations that must be security-audited (no payloads / PII). */
const AUDITED_MUTATION_TOOLS = new Set([
  'session',
  'matching',
  'report',
  'registration',
  'notification',
  'document',
]);

export type ToolHandleInput = {
  userId: string;
  conversationId: string;
  message: string;
  /** Explicit UI action (button click). */
  action?: {
    toolId: string;
    actionId: string;
    payload?: Record<string, unknown>;
  };
  /** Confirmation response for destructive tools. */
  confirm?: {
    confirmationId: string;
    approved: boolean;
  };
  /**
   * Planner-selected tools (ordered). When set, skips canHandle() keyword routing.
   * Validation / confirmation remain authoritative.
   */
  plannedTools?: Array<{
    toolId: string;
    reason?: string;
    payload?: Record<string, unknown>;
  }>;
};

@Injectable()
export class ToolOrchestratorService {
  private readonly logger = new Logger(ToolOrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: ToolRegistry,
    private readonly confirmations: ToolConfirmationService,
    private readonly audit: SkillAuditService,
  ) {}

  /**
   * Attempt to handle the turn as an application action.
   * Returns handled:false so the RAG pipeline can run unchanged.
   */
  async handle(input: ToolHandleInput): Promise<ToolOrchestratorResult> {
    const started = performance.now();
    const user = await this.loadUser(input.userId);
    if (!user) {
      return { handled: false };
    }

    try {
      if (input.confirm) {
        return await this.handleConfirmation(input, user, started);
      }

      if (input.action?.toolId && input.action.actionId) {
        const tool = this.registry.getById(input.action.toolId);
        if (!tool) {
          return this.fail(
            undefined,
            'That action is no longer available.',
            started,
            [
              {
                id: 'list_courses',
                label: 'Browse courses',
                toolId: 'course',
                style: 'secondary',
              },
            ],
          );
        }

        return await this.runTool(
          tool,
          {
            rawMessage: input.message || input.action.actionId,
            conversationId: input.conversationId,
            actionId: input.action.actionId,
            payload: input.action.payload,
          },
          user,
          started,
        );
      }

      if (input.plannedTools?.length) {
        return await this.runPlannedTools(input, user, started);
      }

      const selected = this.registry.tools.filter((tool) =>
        tool.canHandle(input.message, user),
      );

      if (!selected.length) {
        return { handled: false };
      }

      // Prefer more specific tools registered earlier when multiple match.
      const tool = selected[0];

      if (process.env.NODE_ENV !== 'production') {
        this.logger.debug(
          `selected tool=${tool.id} candidates=[${selected
            .map((item) => item.id)
            .join(', ')}] message="${input.message}"`,
        );
      }

      return await this.runTool(
        tool,
        {
          rawMessage: input.message,
          conversationId: input.conversationId,
        },
        user,
        started,
      );
    } catch (error) {
      const durationMs = Math.round(performance.now() - started);
      this.logger.warn(
        `tool failure durationMs=${durationMs} error=${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return {
        handled: true,
        status: 'error',
        message: toSafeErrorMessage(error),
        actions: [
          {
            id: 'list_courses',
            label: 'Browse courses',
            toolId: 'course',
            style: 'secondary',
          },
        ],
        durationMs,
      };
    }
  }

  private async handleConfirmation(
    input: ToolHandleInput,
    user: ToolUserContext,
    started: number,
  ): Promise<ToolOrchestratorResult> {
    const confirmationId = input.confirm!.confirmationId;
    const approved = input.confirm!.approved;

    if (!approved) {
      this.confirmations.consume(confirmationId, user.userId);
      return {
        handled: true,
        status: 'cancelled',
        message: 'Okay — I cancelled that action.',
        durationMs: Math.round(performance.now() - started),
      };
    }

    const pending = this.confirmations.consume(confirmationId, user.userId);
    if (!pending) {
      return this.fail(
        undefined,
        'This confirmation expired or is invalid. Please try the action again.',
        started,
      );
    }

    const tool = this.registry.getById(pending.toolId);
    if (!tool) {
      return this.fail(
        undefined,
        'That action is no longer available.',
        started,
      );
    }

    return this.runTool(
      tool,
      {
        rawMessage: input.message || pending.summary,
        conversationId: input.conversationId,
        actionId: pending.actionId,
        payload: { ...pending.payload, confirmed: true },
      },
      user,
      started,
      { alreadyConfirmed: true },
    );
  }

  private async runPlannedTools(
    input: ToolHandleInput,
    user: ToolUserContext,
    started: number,
  ): Promise<ToolOrchestratorResult> {
    const planned = input.plannedTools ?? [];
    const messages: string[] = [];
    const toolsUsed: string[] = [];
    let priorData: unknown;
    let lastResult: ToolOrchestratorResult | null = null;

    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(
        `planned chain=[${planned.map((step) => step.toolId).join(' → ')}]`,
      );
    }

    for (let index = 0; index < planned.length; index += 1) {
      const step = planned[index];
      const tool = this.registry.getById(step.toolId);
      if (!tool) {
        continue;
      }

      const isLast = index === planned.length - 1;
      const mayMutate = MUTATING_TOOL_IDS.has(step.toolId);
      const result = await this.runTool(
        tool,
        {
          rawMessage: input.message,
          conversationId: input.conversationId,
          payload: {
            ...step.payload,
            ...(priorData !== undefined
              ? { priorResult: priorData, priorToolId: toolsUsed.at(-1) }
              : {}),
          },
        },
        user,
        started,
        {
          // Intermediate informational tools skip soft proposals so the chain can continue.
          // Mutating tools never auto-skip proposals/confirmations.
          skipProposal: !isLast && !mayMutate,
        },
      );

      toolsUsed.push(tool.id);
      lastResult = result;

      if (result.message?.trim()) {
        messages.push(result.message.trim());
      }

      if (
        result.status === 'proposal' ||
        result.status === 'confirmation_required' ||
        result.status === 'validation_error' ||
        result.status === 'error' ||
        result.status === 'cancelled'
      ) {
        break;
      }

      if (result.status === 'executed') {
        priorData = result.data;
      }
    }

    if (!lastResult) {
      return { handled: false, durationMs: Math.round(performance.now() - started) };
    }

    return {
      ...lastResult,
      message: messages.join('\n\n') || lastResult.message,
      toolsUsed,
      durationMs: Math.round(performance.now() - started),
    };
  }

  private async runTool(
    tool: ApplicationTool,
    executeInput: ToolExecuteInput,
    user: ToolUserContext,
    started: number,
    options?: { skipProposal?: boolean; alreadyConfirmed?: boolean },
  ): Promise<ToolOrchestratorResult> {
    const skipProposal = Boolean(options?.skipProposal || options?.alreadyConfirmed);
    const alreadyConfirmed = Boolean(options?.alreadyConfirmed);
    const validation = await tool.validate(executeInput, user);

    if (validation.defer) {
      this.logOutcome(tool.id, 'deferred', started);
      return { handled: false, durationMs: Math.round(performance.now() - started) };
    }

    if (!validation.ok) {
      this.logOutcome(tool.id, 'validation_error', started, validation.error);
      return {
        handled: true,
        status: 'validation_error',
        toolId: tool.id,
        message:
          validation.error ||
          'I could not validate that action with your current permissions.',
        actions: validation.recoveryActions,
        durationMs: Math.round(performance.now() - started),
        toolsUsed: [tool.id],
      };
    }

    if (!skipProposal && validation.proposal) {
      this.logOutcome(tool.id, 'proposal', started);
      return {
        handled: true,
        status: 'proposal',
        toolId: tool.id,
        message: validation.proposal.message,
        actions: validation.proposal.actions,
        durationMs: Math.round(performance.now() - started),
        toolsUsed: [tool.id],
      };
    }

    if (!alreadyConfirmed && validation.confirmation) {
      const pending = this.confirmations.create({
        userId: user.userId,
        conversationId: executeInput.conversationId,
        toolId: tool.id,
        actionId: executeInput.actionId || 'confirm',
        payload: validation.confirmation.payload,
        summary: validation.confirmation.summary,
      });

      this.logOutcome(tool.id, 'confirmation_required', started);
      const preview = validation.confirmation.preview;
      const previewBlock = preview
        ? [
            preview.title ? `\n### ${preview.title}` : '',
            ...(preview.entities ?? []).map(
              (e) => `• ${e.type}: ${e.label}`,
            ),
            ...(preview.warnings ?? []).map((w) => `⚠ ${w}`),
          ]
            .filter(Boolean)
            .join('\n')
        : '';
      return {
        handled: true,
        status: 'confirmation_required',
        toolId: tool.id,
        message: `${validation.confirmation.summary}${previewBlock}`,
        confirmationId: pending.id,
        actions: [
          {
            id: 'confirm',
            label: 'Confirm',
            toolId: tool.id,
            style: 'destructive',
            payload: { confirmationId: pending.id, approved: true },
            requiresConfirmation: true,
          },
          {
            id: 'cancel',
            label: 'Cancel',
            toolId: tool.id,
            style: 'secondary',
            payload: { confirmationId: pending.id, approved: false },
          },
        ],
        durationMs: Math.round(performance.now() - started),
      };
    }

    const mergedInput: ToolExecuteInput = {
      ...executeInput,
      payload: {
        ...validation.payload,
        ...executeInput.payload,
      },
      actionId:
        executeInput.actionId ||
        (validation.payload ? inferActionId(tool.id, validation) : undefined),
    };

    // Button with requiresConfirmation that hasn't gone through confirm flow yet.
    if (
      !skipProposal &&
      executeInput.actionId &&
      validation.confirmation === undefined
    ) {
      // fall through to execute when validate cleared it
    }

    try {
      const data = await tool.execute(mergedInput, user);
      const message = tool.formatResult(data, 'executed');
      this.logOutcome(tool.id, 'executed', started);
      if (AUDITED_MUTATION_TOOLS.has(tool.id)) {
        void this.audit.record({
          type: 'tool_mutation',
          userId: user.userId,
          toolId: tool.id,
          success: true,
          meta: {
            action: mergedInput.actionId || 'execute',
            durationMs: Math.round(performance.now() - started),
          },
        });
      }
      return {
        handled: true,
        status: 'executed',
        toolId: tool.id,
        message: message || 'Done.',
        durationMs: Math.round(performance.now() - started),
        toolsUsed: [tool.id],
        data,
      };
    } catch (error) {
      this.logOutcome(
        tool.id,
        'error',
        started,
        error instanceof Error ? error.message : String(error),
      );
      if (AUDITED_MUTATION_TOOLS.has(tool.id)) {
        void this.audit.record({
          type: 'tool_mutation',
          userId: user.userId,
          toolId: tool.id,
          success: false,
          meta: {
            action: mergedInput.actionId || 'execute',
            durationMs: Math.round(performance.now() - started),
            reason:
              error instanceof Error ? error.message.slice(0, 120) : 'error',
          },
        });
      }
      return {
        handled: true,
        status: 'error',
        toolId: tool.id,
        message: toSafeErrorMessage(error),
        actions: validation.recoveryActions,
        durationMs: Math.round(performance.now() - started),
        toolsUsed: [tool.id],
      };
    }
  }

  private fail(
    toolId: string | undefined,
    message: string,
    started: number,
    actions?: ToolActionButton[],
  ): ToolOrchestratorResult {
    return {
      handled: true,
      status: 'error',
      toolId,
      message,
      actions,
      durationMs: Math.round(performance.now() - started),
    };
  }

  private logOutcome(
    toolId: string,
    status: string,
    started: number,
    detail?: string,
  ) {
    const durationMs = Math.round(performance.now() - started);
    const line = `tool=${toolId} status=${status} durationMs=${durationMs}${
      detail ? ` detail=${detail}` : ''
    }`;
    if (status === 'error' || status === 'validation_error') {
      this.logger.warn(line);
    } else if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(line);
    } else {
      this.logger.log(line);
    }
  }

  private async loadUser(userId: string): Promise<ToolUserContext | null> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    });

    if (!user) return null;

    return {
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    };
  }
}

function inferActionId(
  toolId: string,
  validation: ToolValidationResult,
): string | undefined {
  if (toolId === 'enrollment' && validation.payload?.courseId) {
    return 'enroll_course';
  }
  if (
    toolId === 'profile' &&
    (validation.payload?.firstName || validation.payload?.lastName)
  ) {
    return 'update_profile';
  }
  return undefined;
}

function toSafeErrorMessage(error: unknown): string {
  return toClientSafeErrorMessage(error);
}
