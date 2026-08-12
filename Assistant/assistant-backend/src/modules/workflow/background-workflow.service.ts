import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { WorkflowJob, WorkflowJobStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../../prisma/prisma.service';
import {
  buildExecutionTrace,
  createRequestId,
} from '../assistant/execution-trace.builder';
import type { ExecutionTrace } from '../assistant/execution-trace.types';
import { MemoryService } from '../memory/memory.service';
import { WorkflowEngineService } from './workflow.engine';
import { WorkflowRegistry } from './workflow.registry';
import type { WorkflowRunResult, WorkflowStepProgress } from './workflow.types';

export type EnqueueWorkflowInput = {
  userId: string;
  conversationId: string;
  message: string;
  workflowId: string;
  workflowName: string;
  progress?: WorkflowStepProgress[];
};

type ApplyMeta = {
  queueTimeMs?: number;
  resumeCount: number;
  executionStartedAt: number;
  /** When false, only updates the job row (chat turn persists the message). */
  persistMessage: boolean;
};

/**
 * Async workflow queue. Calls WorkflowEngine without modifying it.
 * Long jobs never block the chat request path.
 */
@Injectable()
export class BackgroundWorkflowService implements OnModuleInit {
  private readonly logger = new Logger(BackgroundWorkflowService.name);
  private readonly inFlight = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: WorkflowEngineService,
    private readonly registry: WorkflowRegistry,
    private readonly memory: MemoryService,
  ) {}

  async onModuleInit() {
    const interrupted = await this.prisma.workflowJob.updateMany({
      where: {
        status: {
          in: [WorkflowJobStatus.RUNNING, WorkflowJobStatus.QUEUED],
        },
      },
      data: {
        status: WorkflowJobStatus.QUEUED,
        currentStep: null,
        error: null,
      },
    });

    // Confirmation tokens live in-memory — cannot safely resume after restart.
    const expiredConfirms = await this.prisma.workflowJob.updateMany({
      where: { status: WorkflowJobStatus.WAITING_CONFIRMATION },
      data: {
        status: WorkflowJobStatus.FAILED,
        error:
          'Confirmation expired after a server restart. Use Retry to run the workflow again.',
        finishedAt: new Date(),
        confirmationId: null,
      },
    });

    if (interrupted.count || expiredConfirms.count) {
      this.logger.warn(
        `Recovered workflow jobs: requeued=${interrupted.count} expiredConfirms=${expiredConfirms.count}`,
      );
    }

    const queued = await this.prisma.workflowJob.findMany({
      where: { status: WorkflowJobStatus.QUEUED },
      orderBy: { queuedAt: 'asc' },
      take: 25,
      select: { id: true },
    });

    for (const job of queued) {
      void this.processJob(job.id);
    }
  }

  async enqueue(input: EnqueueWorkflowInput) {
    const workflow =
      this.registry.getById(input.workflowId) ??
      this.engine.match(input.message);
    if (!workflow) {
      throw new BadRequestException('No matching workflow to queue');
    }

    const progress =
      input.progress ??
      workflow.steps.map((step) => ({
        id: step.id,
        name: step.name,
        status: 'pending' as const,
      }));

    const job = await this.prisma.workflowJob.create({
      data: {
        workflowId: workflow.id,
        workflowName: workflow.name,
        message: input.message,
        conversationId: input.conversationId,
        userId: input.userId,
        status: WorkflowJobStatus.QUEUED,
        progress: progress,
        currentStep: progress[0]?.name ?? null,
        executionMode: 'background',
        queuedAt: new Date(),
      },
    });

    void this.processJob(job.id);
    return job;
  }

  async listForUser(userId: string, conversationId?: string) {
    return this.prisma.workflowJob.findMany({
      where: {
        userId,
        ...(conversationId ? { conversationId } : {}),
      },
      orderBy: [{ queuedAt: 'desc' }],
      take: 50,
    });
  }

  async getForUser(jobId: string, userId: string) {
    const job = await this.prisma.workflowJob.findFirst({
      where: { id: jobId, userId },
    });
    if (!job) throw new NotFoundException('Workflow job not found');
    return job;
  }

  async findWaitingByConfirmation(confirmationId: string, userId: string) {
    return this.prisma.workflowJob.findFirst({
      where: {
        confirmationId,
        userId,
        status: WorkflowJobStatus.WAITING_CONFIRMATION,
      },
    });
  }

  async cancel(jobId: string, userId: string) {
    const job = await this.getForUser(jobId, userId);
    if (
      job.status === WorkflowJobStatus.COMPLETED ||
      job.status === WorkflowJobStatus.CANCELLED
    ) {
      return job;
    }

    return this.prisma.workflowJob.update({
      where: { id: job.id },
      data: {
        status: WorkflowJobStatus.CANCELLED,
        finishedAt: new Date(),
        error: job.error ?? 'Cancelled by user',
        currentStep: null,
      },
    });
  }

  async retry(jobId: string, userId: string) {
    const job = await this.getForUser(jobId, userId);
    if (
      job.status !== WorkflowJobStatus.FAILED &&
      job.status !== WorkflowJobStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Only failed or cancelled jobs can be retried',
      );
    }

    const workflow = this.registry.getById(job.workflowId);
    const progress =
      workflow?.steps.map((step) => ({
        id: step.id,
        name: step.name,
        status: 'pending' as const,
      })) ?? [];

    const updated = await this.prisma.workflowJob.update({
      where: { id: job.id },
      data: {
        status: WorkflowJobStatus.QUEUED,
        progress: progress,
        currentStep: progress[0]?.name ?? null,
        error: null,
        resultAnswer: null,
        confirmationId: null,
        resultMessageId: null,
        finishedAt: null,
        startedAt: null,
        resumeCount: { increment: 1 },
        queuedAt: new Date(),
      },
    });

    void this.processJob(updated.id);
    return updated;
  }

  /**
   * Resume a background job waiting on confirmation.
   * Reuses WorkflowEngine.resume — does not alter the engine.
   * Does not append a chat message (caller finishes the chat turn).
   */
  async resumeConfirmation(input: {
    jobId: string;
    userId: string;
    confirmationId: string;
    approved: boolean;
    message?: string;
  }): Promise<{ result: WorkflowRunResult; job: WorkflowJob } | null> {
    const job = await this.getForUser(input.jobId, input.userId);
    if (job.status !== WorkflowJobStatus.WAITING_CONFIRMATION) {
      return null;
    }

    const started = Date.now();
    const resumed = await this.prisma.workflowJob.update({
      where: { id: job.id },
      data: {
        status: WorkflowJobStatus.RUNNING,
        startedAt: job.startedAt ?? new Date(),
        confirmationId: null,
        resumeCount: { increment: 1 },
      },
    });

    try {
      const result = await this.engine.resume({
        userId: input.userId,
        conversationId: job.conversationId,
        confirmationId: input.confirmationId,
        approved: input.approved,
        message: input.message ?? job.message,
      });

      if (!result) {
        await this.failJob(job.id, 'Could not resume workflow confirmation.', {
          persistMessage: false,
        });
        return null;
      }

      await this.applyEngineResult(job.id, result, {
        queueTimeMs: job.queueTimeMs ?? undefined,
        resumeCount: resumed.resumeCount,
        executionStartedAt: started,
        persistMessage: false,
      });

      const updated = await this.prisma.workflowJob.findUniqueOrThrow({
        where: { id: job.id },
      });
      return { result, job: updated };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Workflow resume failed';
      await this.failJob(job.id, message, { persistMessage: false });
      throw error;
    }
  }

  async attachResultMessage(input: {
    jobId: string;
    userId: string;
    messageId: string;
    executionTraceId: string;
    answer: string;
  }) {
    const job = await this.getForUser(input.jobId, input.userId);
    return this.prisma.workflowJob.update({
      where: { id: job.id },
      data: {
        resultMessageId: input.messageId,
        executionTraceId: input.executionTraceId,
        resultAnswer: input.answer,
      },
    });
  }

  private async processJob(jobId: string) {
    if (this.inFlight.has(jobId)) return;
    this.inFlight.add(jobId);

    try {
      const claimed = await this.prisma.workflowJob.updateMany({
        where: { id: jobId, status: WorkflowJobStatus.QUEUED },
        data: {
          status: WorkflowJobStatus.RUNNING,
          startedAt: new Date(),
        },
      });
      if (claimed.count === 0) return;

      const job = await this.prisma.workflowJob.findUnique({
        where: { id: jobId },
      });
      if (!job) return;
      if (job.status === WorkflowJobStatus.CANCELLED) return;

      const queuedAt = job.queuedAt.getTime();
      const startedAt = (job.startedAt ?? new Date()).getTime();
      const queueTimeMs = Math.max(0, startedAt - queuedAt);

      const progress = markFirstStepRunning(
        Array.isArray(job.progress)
          ? (job.progress as WorkflowStepProgress[])
          : [],
      );

      await this.prisma.workflowJob.update({
        where: { id: job.id },
        data: {
          queueTimeMs,
          progress: progress,
          currentStep:
            progress.find((step) => step.status === 'running')?.name ??
            progress[0]?.name ??
            null,
        },
      });

      const result = await this.engine.start({
        userId: job.userId,
        conversationId: job.conversationId,
        message: job.message,
      });

      const latest = await this.prisma.workflowJob.findUnique({
        where: { id: job.id },
      });
      if (!latest || latest.status === WorkflowJobStatus.CANCELLED) {
        return;
      }

      if (!result?.handled) {
        await this.failJob(job.id, 'Workflow engine did not handle this job.');
        return;
      }

      await this.applyEngineResult(job.id, result, {
        queueTimeMs,
        resumeCount: job.resumeCount,
        executionStartedAt: startedAt,
        persistMessage: true,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Background workflow failed';
      this.logger.warn(`job=${jobId} failed: ${message}`);
      await this.failJob(jobId, message);
    } finally {
      this.inFlight.delete(jobId);
    }
  }

  private async applyEngineResult(
    jobId: string,
    result: WorkflowRunResult,
    meta: ApplyMeta,
  ) {
    const job = await this.prisma.workflowJob.findUnique({
      where: { id: jobId },
    });
    if (!job || job.status === WorkflowJobStatus.CANCELLED) return;

    const requestId = createRequestId();
    const enrichedTrace = this.buildJobTrace(job, result, meta, requestId);

    if (result.paused && result.confirmationId) {
      const saved = meta.persistMessage
        ? await this.appendAssistantMessage({
            conversationId: job.conversationId,
            answer: result.answer,
            executionTrace: enrichedTrace,
            confirmationId: result.confirmationId,
            actions: result.actions,
          })
        : null;

      await this.prisma.workflowJob.update({
        where: { id: job.id },
        data: {
          status: WorkflowJobStatus.WAITING_CONFIRMATION,
          progress: result.workflow.progress,
          currentStep:
            result.workflow.progress.find(
              (step) => step.status === 'awaiting_confirmation',
            )?.name ?? 'Waiting for confirmation',
          confirmationId: result.confirmationId,
          resultAnswer: result.answer,
          ...(saved
            ? {
                resultMessageId: saved.id,
                executionTraceId: requestId,
              }
            : {}),
          queueTimeMs: meta.queueTimeMs,
        },
      });
      return;
    }

    if (result.cancelled) {
      const saved = meta.persistMessage
        ? await this.appendAssistantMessage({
            conversationId: job.conversationId,
            answer: result.answer,
            executionTrace: enrichedTrace,
          })
        : null;

      await this.prisma.workflowJob.update({
        where: { id: job.id },
        data: {
          status: WorkflowJobStatus.CANCELLED,
          progress: result.workflow.progress,
          currentStep: null,
          resultAnswer: result.answer,
          finishedAt: new Date(),
          confirmationId: null,
          ...(saved
            ? {
                resultMessageId: saved.id,
                executionTraceId: requestId,
              }
            : {}),
        },
      });
      return;
    }

    if (result.workflow.status === 'failed') {
      const saved = meta.persistMessage
        ? await this.appendAssistantMessage({
            conversationId: job.conversationId,
            answer: result.answer,
            executionTrace: enrichedTrace,
            actions: [
              {
                id: 'retry_workflow_job',
                label: 'Retry',
                toolId: 'workflow_job',
                style: 'primary',
                payload: { jobId: job.id },
              },
            ],
          })
        : null;

      await this.prisma.workflowJob.update({
        where: { id: job.id },
        data: {
          status: WorkflowJobStatus.FAILED,
          progress: result.workflow.progress,
          currentStep: null,
          error: result.answer,
          resultAnswer: result.answer,
          finishedAt: new Date(),
          confirmationId: null,
          ...(saved
            ? {
                resultMessageId: saved.id,
                executionTraceId: requestId,
              }
            : {}),
        },
      });
      return;
    }

    const saved = meta.persistMessage
      ? await this.appendAssistantMessage({
          conversationId: job.conversationId,
          answer: result.answer,
          executionTrace: enrichedTrace,
          actions: result.actions,
          confirmationId: result.confirmationId,
        })
      : null;

    await this.prisma.workflowJob.update({
      where: { id: job.id },
      data: {
        status: WorkflowJobStatus.COMPLETED,
        progress: result.workflow.progress,
        currentStep: null,
        resultAnswer: result.answer,
        finishedAt: new Date(),
        confirmationId: null,
        error: null,
        queueTimeMs: meta.queueTimeMs,
        ...(saved
          ? {
              resultMessageId: saved.id,
              executionTraceId: requestId,
            }
          : {}),
      },
    });
  }

  private buildJobTrace(
    job: WorkflowJob,
    result: WorkflowRunResult,
    meta: ApplyMeta,
    requestId: string,
  ): ExecutionTrace {
    const trace = buildExecutionTrace({
      requestId,
      usedRag: false,
      llm: result.llm,
      workflow: result.workflow,
      timing: {
        totalMs: Math.max(0, Date.now() - meta.executionStartedAt),
        toolMs: result.toolMs,
        generationMs: result.generationMs,
      },
    });

    return {
      ...trace,
      jobId: job.id,
      executionMode: 'background',
      queueTime: meta.queueTimeMs ?? job.queueTimeMs ?? undefined,
      resumeCount: meta.resumeCount,
    };
  }

  private async failJob(
    jobId: string,
    error: string,
    options?: { persistMessage?: boolean },
  ) {
    const persistMessage = options?.persistMessage !== false;
    const job = await this.prisma.workflowJob.findUnique({
      where: { id: jobId },
    });
    if (!job || job.status === WorkflowJobStatus.CANCELLED) return;

    try {
      let messageId: string | undefined;
      let requestId: string | undefined;

      if (persistMessage) {
        requestId = createRequestId();
        const trace = buildExecutionTrace({
          requestId,
          usedRag: false,
          timing: { totalMs: 0 },
          workflow: {
            id: job.workflowId,
            name: job.workflowName ?? job.workflowId,
            durationMs: 0,
            status: 'failed',
            completedSteps: [],
            failedSteps: [],
            skippedSteps: [],
            progress: Array.isArray(job.progress)
              ? (job.progress as WorkflowStepProgress[])
              : [],
          },
        });
        const enriched: ExecutionTrace = {
          ...trace,
          jobId: job.id,
          executionMode: 'background',
          queueTime: job.queueTimeMs ?? undefined,
          resumeCount: job.resumeCount,
        };

        const saved = await this.appendAssistantMessage({
          conversationId: job.conversationId,
          answer: `${error}\n\nYou can retry this background workflow.`,
          executionTrace: enriched,
          actions: [
            {
              id: 'retry_workflow_job',
              label: 'Retry',
              toolId: 'workflow_job',
              style: 'primary',
              payload: { jobId: job.id },
            },
          ],
        });
        messageId = saved.id;
      }

      await this.prisma.workflowJob.update({
        where: { id: jobId },
        data: {
          status: WorkflowJobStatus.FAILED,
          error,
          resultAnswer: error,
          finishedAt: new Date(),
          currentStep: null,
          confirmationId: null,
          ...(messageId && requestId
            ? {
                resultMessageId: messageId,
                executionTraceId: requestId,
              }
            : {}),
        },
      });
    } catch (persistError) {
      this.logger.warn(
        `Failed to persist failure for job=${jobId}: ${
          persistError instanceof Error
            ? persistError.message
            : String(persistError)
        }`,
      );
      await this.prisma.workflowJob.update({
        where: { id: jobId },
        data: {
          status: WorkflowJobStatus.FAILED,
          error,
          finishedAt: new Date(),
          currentStep: null,
          confirmationId: null,
        },
      });
    }
  }

  private async appendAssistantMessage(input: {
    conversationId: string;
    answer: string;
    executionTrace: ExecutionTrace;
    confirmationId?: string;
    actions?: WorkflowRunResult['actions'];
  }) {
    const meta = await this.memory.getConversationMeta(input.conversationId);
    const all = await this.memory.getAllMessages(input.conversationId);
    const leaf = meta?.activeLeafId
      ? all.find((message) => message.id === meta.activeLeafId)
      : all[all.length - 1];

    const branchId = leaf?.branchId ?? randomUUID();
    const parentMessageId = leaf?.id ?? null;
    const version = await this.memory.nextChildVersion(
      parentMessageId,
      input.conversationId,
    );

    const actionsPayload =
      input.actions?.length || input.confirmationId
        ? {
            status: input.confirmationId ? 'confirmation_required' : 'executed',
            toolId: 'workflow',
            confirmationId: input.confirmationId,
            buttons: input.actions ?? [],
          }
        : undefined;

    const saved = await this.memory.saveMessage(
      input.conversationId,
      'assistant',
      input.answer,
      undefined,
      actionsPayload,
      input.executionTrace,
      undefined,
      {
        parentMessageId,
        branchId,
        version,
      },
    );

    await this.memory.setActivePath(
      input.conversationId,
      meta?.activeBranchId ?? branchId,
      saved.id,
    );

    return saved;
  }
}

function markFirstStepRunning(
  progress: WorkflowStepProgress[],
): WorkflowStepProgress[] {
  if (!progress.length) return progress;
  return progress.map((step, index) =>
    index === 0 && step.status === 'pending'
      ? { ...step, status: 'running' }
      : step,
  );
}
