import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

import { ToolOrchestratorService } from '../actions/tool-orchestrator.service';
import { LlmService } from '../llm/llm.service';
import { WorkflowRunStore } from './workflow-run.store';
import { WorkflowRegistry } from './workflow.registry';
import type {
  WorkflowDefinition,
  WorkflowRunResult,
  WorkflowState,
  WorkflowStepDefinition,
  WorkflowStepProgress,
  WorkflowTraceInfo,
} from './workflow.types';
import {
  applyOutputMapping,
  getPath,
  resolveTemplates,
  sleep,
} from './workflow.utils';

export type WorkflowExecuteInput = {
  userId: string;
  conversationId: string;
  message: string;
};

export type WorkflowResumeInput = {
  userId: string;
  conversationId: string;
  confirmationId: string;
  approved: boolean;
  message?: string;
};

@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);

  constructor(
    private readonly registry: WorkflowRegistry,
    private readonly runs: WorkflowRunStore,
    private readonly toolOrchestrator: ToolOrchestratorService,
    private readonly llm: LlmService,
  ) {}

  match(message: string): WorkflowDefinition | null {
    return this.registry.match(message);
  }

  getPaused(confirmationId: string, userId: string) {
    return this.runs.getByConfirmation(confirmationId, userId);
  }

  async start(input: WorkflowExecuteInput): Promise<WorkflowRunResult | null> {
    const workflow = this.registry.match(input.message);
    if (!workflow) return null;

    const state: WorkflowState = {
      ...(workflow.initialState ?? {}),
      message: input.message,
    };

    const progress: WorkflowStepProgress[] = workflow.steps.map((step) => ({
      id: step.id,
      name: step.name,
      status: 'pending',
    }));

    return this.runFrom(workflow, {
      userId: input.userId,
      conversationId: input.conversationId,
      message: input.message,
      state,
      progress,
      stepIndex: 0,
      startedAt: performance.now(),
      toolMs: 0,
      generationMs: 0,
      answerParts: [],
    });
  }

  async resume(input: WorkflowResumeInput): Promise<WorkflowRunResult | null> {
    const paused = this.runs.consume(input.confirmationId, input.userId);
    if (!paused) return null;

    const workflow = this.registry.getById(paused.workflowId);
    if (!workflow) {
      return this.failedResult(
        paused.workflowId,
        'Unknown workflow',
        paused.progress,
        paused.startedAt,
      );
    }

    if (!input.approved) {
      if (paused.pendingToolConfirm) {
        await this.toolOrchestrator.handle({
          userId: input.userId,
          conversationId: input.conversationId,
          message: input.message ?? 'Cancel action',
          confirm: {
            confirmationId: input.confirmationId,
            approved: false,
          },
        });
      }

      const progress = paused.progress.map((step) =>
        step.status === 'awaiting_confirmation'
          ? { ...step, status: 'skipped' as const, detail: 'Cancelled' }
          : step,
      );
      return {
        handled: true,
        cancelled: true,
        answer: 'Okay — I cancelled the remaining workflow steps.',
        state: paused.state,
        workflow: this.buildTrace(
          workflow,
          progress,
          paused.startedAt,
          'cancelled',
        ),
      };
    }

    // Complete the tool that was waiting on confirmation, if any.
    if (paused.pendingToolConfirm) {
      const toolStart = performance.now();
      const toolResult = await this.toolOrchestrator.handle({
        userId: input.userId,
        conversationId: input.conversationId,
        message: input.message ?? 'Confirm action',
        confirm: {
          confirmationId: input.confirmationId,
          approved: true,
        },
      });
      const toolMs = Math.round(performance.now() - toolStart);

      const waiting = progressIndex(
        paused.progress,
        (step) => step.status === 'awaiting_confirmation',
      );
      if (waiting >= 0) {
        paused.progress[waiting] = {
          ...paused.progress[waiting],
          status: toolResult.status === 'executed' ? 'completed' : 'failed',
          detail: toolResult.message,
        };
      }

      if (toolResult.data != null) {
        paused.state.lastToolResult = toolResult.data;
      }
      if (toolResult.message) {
        paused.state.lastToolMessage = toolResult.message;
      }

      return this.runFrom(workflow, {
        userId: input.userId,
        conversationId: input.conversationId,
        message: input.message ?? readStateMessage(paused.state),
        state: paused.state,
        progress: paused.progress,
        stepIndex: paused.resumeStepIndex,
        startedAt: paused.startedAt,
        toolMs,
        generationMs: 0,
        answerParts: toolResult.message ? [toolResult.message] : [],
      });
    }

    // Pure confirmation step — mark completed and continue.
    const waiting = progressIndex(
      paused.progress,
      (step) => step.status === 'awaiting_confirmation',
    );
    if (waiting >= 0) {
      paused.progress[waiting] = {
        ...paused.progress[waiting],
        status: 'completed',
        detail: 'Confirmed',
      };
    }

    return this.runFrom(workflow, {
      userId: input.userId,
      conversationId: input.conversationId,
      message: input.message ?? readStateMessage(paused.state),
      state: paused.state,
      progress: paused.progress,
      stepIndex: paused.resumeStepIndex,
      startedAt: paused.startedAt,
      toolMs: 0,
      generationMs: 0,
      answerParts: [],
    });
  }

  private async runFrom(
    workflow: WorkflowDefinition,
    ctx: {
      userId: string;
      conversationId: string;
      message: string;
      state: WorkflowState;
      progress: WorkflowStepProgress[];
      stepIndex: number;
      startedAt: number;
      toolMs: number;
      generationMs: number;
      answerParts: string[];
      llm?: WorkflowRunResult['llm'];
    },
  ): Promise<WorkflowRunResult> {
    let index = ctx.stepIndex;
    let toolMs = ctx.toolMs;
    let generationMs = ctx.generationMs;
    let llmMeta = ctx.llm;
    const answerParts = [...ctx.answerParts];
    const state: WorkflowState = { ...ctx.state, message: ctx.message };
    const progress = ctx.progress.map((step) => ({ ...step }));
    const stepById = new Map(workflow.steps.map((step, i) => [step.id, i]));

    while (index < workflow.steps.length) {
      const step = workflow.steps[index];
      progress[index] = {
        ...progress[index],
        status: 'running',
      };

      try {
        if (step.type === 'condition') {
          const nextId = this.evaluateCondition(step, state);
          progress[index] = {
            ...progress[index],
            status: 'completed',
            detail: nextId ? `→ ${nextId}` : 'continue',
          };
          if (nextId) {
            const jump = stepById.get(nextId);
            if (jump == null) {
              throw new Error(`Unknown step id "${nextId}"`);
            }
            // Mark skipped steps between current and jump when jumping forward.
            if (jump > index + 1) {
              for (let i = index + 1; i < jump; i += 1) {
                progress[i] = {
                  ...progress[i],
                  status: 'skipped',
                };
              }
            }
            index = jump;
            continue;
          }
          index += 1;
          continue;
        }

        if (step.type === 'confirmation') {
          const message =
            String(
              resolveTemplates(
                step.confirmationMessage ??
                  'Please confirm to continue this workflow.',
                { state, message: ctx.message },
              ),
            ) || 'Please confirm to continue this workflow.';

          const confirmationId = randomUUID();
          progress[index] = {
            ...progress[index],
            status: 'awaiting_confirmation',
            detail: 'Waiting for approval',
          };

          this.runs.pause({
            runId: this.runs.createRunId(),
            userId: ctx.userId,
            conversationId: ctx.conversationId,
            workflowId: workflow.id,
            resumeStepIndex: index + 1,
            state,
            progress,
            confirmationId,
            pendingToolConfirm: false,
            startedAt: ctx.startedAt,
          });

          return {
            handled: true,
            paused: true,
            confirmationId,
            answer: this.composeAnswer(answerParts, message),
            actions: [
              {
                id: 'confirm',
                label: 'Confirm',
                toolId: 'workflow',
                style: 'primary',
                payload: { confirmationId, approved: true },
              },
              {
                id: 'cancel',
                label: 'Cancel',
                toolId: 'workflow',
                style: 'secondary',
                payload: { confirmationId, approved: false },
              },
            ],
            state,
            workflow: this.buildTrace(
              workflow,
              progress,
              ctx.startedAt,
              'paused',
            ),
            toolMs,
            generationMs,
            llm: llmMeta,
          };
        }

        if (step.type === 'tool') {
          const result = await this.runToolStep(step, {
            userId: ctx.userId,
            conversationId: ctx.conversationId,
            message: ctx.message,
            state,
          });
          toolMs += result.durationMs;

          if (result.paused) {
            progress[index] = {
              ...progress[index],
              status: 'awaiting_confirmation',
              detail: result.message,
            };
            this.runs.pause({
              runId: this.runs.createRunId(),
              userId: ctx.userId,
              conversationId: ctx.conversationId,
              workflowId: workflow.id,
              resumeStepIndex: index + 1,
              state,
              progress,
              confirmationId: result.confirmationId!,
              pendingToolConfirm: true,
              startedAt: ctx.startedAt,
            });

            return {
              handled: true,
              paused: true,
              confirmationId: result.confirmationId,
              answer: this.composeAnswer(answerParts, result.message),
              actions: result.actions,
              state,
              workflow: this.buildTrace(
                workflow,
                progress,
                ctx.startedAt,
                'paused',
              ),
              toolMs,
              generationMs,
              llm: llmMeta,
            };
          }

          if (!result.ok) {
            progress[index] = {
              ...progress[index],
              status: 'failed',
              detail: result.message,
            };
            if (step.continueOnFailure) {
              answerParts.push(
                result.message ||
                  `Step “${step.name}” failed; continuing with a recovery path.`,
              );
              index += 1;
              continue;
            }
            return {
              handled: true,
              answer: this.composeAnswer(
                answerParts,
                result.message ||
                  `I could not complete “${step.name}”. ${result.recovery ?? ''}`.trim(),
              ),
              state,
              workflow: this.buildTrace(
                workflow,
                progress,
                ctx.startedAt,
                'failed',
              ),
              toolMs,
              generationMs,
              llm: llmMeta,
            };
          }

          applyOutputMapping(
            state,
            step.output,
            result.data ?? {
              text: result.message,
              message: result.message,
            },
          );
          if (result.message) {
            answerParts.push(result.message);
            state.lastToolMessage = result.message;
          }
          if (result.actions?.length) {
            state.lastProposalActions = result.actions;
          }
          progress[index] = {
            ...progress[index],
            status: 'completed',
            detail: result.message,
          };
          index += 1;
          continue;
        }

        if (step.type === 'llm') {
          const llmResult = await this.runLlmStep(step, state, ctx.message);
          generationMs += llmResult.latencyMs;
          llmMeta = {
            modelName: llmResult.modelName,
            latencyMs: llmResult.latencyMs,
            inputTokens: llmResult.inputTokens,
            outputTokens: llmResult.outputTokens,
          };
          applyOutputMapping(state, step.output, {
            text: llmResult.text,
            message: llmResult.text,
          });
          answerParts.push(llmResult.text);
          progress[index] = {
            ...progress[index],
            status: 'completed',
          };
          index += 1;
          continue;
        }

        progress[index] = {
          ...progress[index],
          status: 'skipped',
          detail: `Unsupported step type`,
        };
        index += 1;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unexpected workflow error';
        this.logger.warn(
          `workflow=${workflow.id} step=${step.id} failed: ${message}`,
        );
        progress[index] = {
          ...progress[index],
          status: 'failed',
          detail: message,
        };
        if (step.continueOnFailure) {
          answerParts.push(
            `Step “${step.name}” failed (${message}). Continuing…`,
          );
          index += 1;
          continue;
        }
        return {
          handled: true,
          answer: this.composeAnswer(
            answerParts,
            `I stopped the workflow at “${step.name}”: ${message}`,
          ),
          state,
          workflow: this.buildTrace(
            workflow,
            progress,
            ctx.startedAt,
            'failed',
          ),
          toolMs,
          generationMs,
          llm: llmMeta,
        };
      }
    }

    const pendingActions = Array.isArray(state.lastProposalActions)
      ? (state.lastProposalActions as WorkflowRunResult['actions'])
      : undefined;

    return {
      handled: true,
      answer:
        this.composeAnswer(answerParts) ||
        `Finished workflow “${workflow.name}”.`,
      state,
      actions: pendingActions,
      workflow: this.buildTrace(workflow, progress, ctx.startedAt, 'completed'),
      toolMs,
      generationMs,
      llm: llmMeta,
    };
  }

  private evaluateCondition(
    step: WorkflowStepDefinition,
    state: WorkflowState,
  ): string | undefined {
    const path = step.condition?.path ?? '';
    const actual = getPath(
      { state },
      path.startsWith('state.') ? path : `state.${path}`,
    );
    const expected = step.condition?.equals;
    const includes = step.condition?.includes;

    let matched: boolean;
    if (includes != null) {
      const haystack =
        typeof actual === 'string'
          ? actual
          : actual == null
            ? ''
            : JSON.stringify(actual);
      matched = haystack.toLowerCase().includes(includes.toLowerCase());
    } else if (expected === undefined) {
      matched = Boolean(actual);
    } else {
      matched = JSON.stringify(actual) === JSON.stringify(expected);
    }

    return matched ? step.condition?.whenTrue : step.condition?.whenFalse;
  }

  private async runToolStep(
    step: WorkflowStepDefinition,
    ctx: {
      userId: string;
      conversationId: string;
      message: string;
      state: WorkflowState;
    },
  ): Promise<{
    ok: boolean;
    paused?: boolean;
    confirmationId?: string;
    actions?: WorkflowRunResult['actions'];
    message?: string;
    data?: unknown;
    recovery?: string;
    durationMs: number;
  }> {
    if (!step.toolId) {
      return {
        ok: false,
        message: `Step “${step.name}” is missing toolId.`,
        durationMs: 0,
      };
    }

    const resolvedInput = (resolveTemplates(step.input ?? {}, {
      state: ctx.state,
      message: ctx.message,
    }) ?? {}) as Record<string, unknown>;

    const maxAttempts = Math.max(1, step.retry?.maxAttempts ?? 1);
    const delayMs = step.retry?.delayMs ?? 250;
    const timeoutMs = step.timeoutMs ?? 30_000;

    let lastError = 'Tool step failed.';
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const started = performance.now();
      try {
        const handleInput =
          step.actionId != null
            ? {
                userId: ctx.userId,
                conversationId: ctx.conversationId,
                message: ctx.message,
                action: {
                  toolId: step.toolId,
                  actionId: step.actionId,
                  payload: resolvedInput,
                },
              }
            : {
                userId: ctx.userId,
                conversationId: ctx.conversationId,
                message: ctx.message,
                plannedTools: [
                  {
                    toolId: step.toolId,
                    reason: `Workflow step: ${step.name}`,
                    payload: resolvedInput,
                  },
                ],
              };

        const result = await withTimeout(
          this.toolOrchestrator.handle(handleInput),
          timeoutMs,
        );
        const durationMs = Math.round(performance.now() - started);

        if (result.status === 'confirmation_required') {
          return {
            ok: true,
            paused: true,
            confirmationId: result.confirmationId,
            actions: result.actions,
            message: result.message,
            data: result.data,
            durationMs,
          };
        }

        if (result.status === 'proposal') {
          // Soft proposal: keep going; surface message/actions in state.
          ctx.state.lastProposalActions = result.actions;
          return {
            ok: true,
            message: result.message,
            data: result.data ?? { message: result.message },
            actions: result.actions,
            durationMs,
          };
        }

        if (
          result.handled &&
          (result.status === 'executed' || !result.status)
        ) {
          return {
            ok: true,
            message: result.message,
            data: result.data,
            durationMs,
          };
        }

        lastError = result.message || 'Tool did not handle this step.';
        if (attempt < maxAttempts) {
          await sleep(delayMs);
          continue;
        }
        return {
          ok: false,
          message: lastError,
          recovery: 'You can retry or continue with a different request.',
          durationMs,
        };
      } catch (error) {
        lastError =
          error instanceof Error ? error.message : 'Tool step timed out.';
        if (attempt < maxAttempts) {
          await sleep(delayMs);
          continue;
        }
        return {
          ok: false,
          message: lastError,
          durationMs: Math.round(performance.now() - started),
        };
      }
    }

    return { ok: false, message: lastError, durationMs: 0 };
  }

  private async runLlmStep(
    step: WorkflowStepDefinition,
    state: WorkflowState,
    message: string,
  ) {
    const promptTemplate =
      step.prompt ??
      'Given this workflow state as JSON:\n{{state}}\n\nUser request: {{message}}\n\nProvide a helpful, concise response.';
    const prompt = String(
      resolveTemplates(promptTemplate, {
        state: JSON.stringify(state, null, 2),
        message,
        rawState: state,
      }),
    );

    const timeoutMs = step.timeoutMs ?? 45_000;
    return withTimeout(this.llm.askWithMeta(prompt), timeoutMs);
  }

  private composeAnswer(parts: string[], extra?: string): string {
    const chunks = [...parts, extra]
      .map((part) => part?.trim())
      .filter((part): part is string => Boolean(part));
    // De-dupe consecutive identical paragraphs.
    const unique: string[] = [];
    for (const chunk of chunks) {
      if (unique[unique.length - 1] === chunk) continue;
      unique.push(chunk);
    }
    return unique.join('\n\n');
  }

  private buildTrace(
    workflow: WorkflowDefinition,
    progress: WorkflowStepProgress[],
    startedAt: number,
    status: WorkflowTraceInfo['status'],
  ): WorkflowTraceInfo {
    return {
      id: workflow.id,
      name: workflow.name,
      durationMs: Math.round(performance.now() - startedAt),
      status,
      completedSteps: progress
        .filter((step) => step.status === 'completed')
        .map((step) => step.id),
      failedSteps: progress
        .filter((step) => step.status === 'failed')
        .map((step) => step.id),
      skippedSteps: progress
        .filter((step) => step.status === 'skipped')
        .map((step) => step.id),
      progress,
    };
  }

  private failedResult(
    workflowId: string,
    message: string,
    progress: WorkflowStepProgress[],
    startedAt: number,
  ): WorkflowRunResult {
    return {
      handled: true,
      answer: message,
      state: {},
      workflow: {
        id: workflowId,
        name: workflowId,
        durationMs: Math.round(performance.now() - startedAt),
        status: 'failed',
        completedSteps: [],
        failedSteps: [],
        skippedSteps: [],
        progress,
      },
    };
  }
}

function progressIndex(
  progress: WorkflowStepProgress[],
  predicate: (step: WorkflowStepProgress) => boolean,
): number {
  return progress.findIndex(predicate);
}

function readStateMessage(state: WorkflowState): string {
  const value = state.message;
  return typeof value === 'string' ? value : '';
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      });
  });
}
