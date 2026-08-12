import { Injectable, Logger } from '@nestjs/common';
import {
  EvaluationFlagStatus,
  EvaluationFlagType,
  FeedbackRating,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import {
  FAILURE_DETECTION,
  type RecordTurnMetricInput,
} from './evaluation.types';

@Injectable()
export class FailureDetectionService {
  private readonly logger = new Logger(FailureDetectionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async inspectAfterTurn(input: RecordTurnMetricInput): Promise<void> {
    const since = this.windowStart();

    const failedToolIds = [
      ...new Set(
        input.toolsExecuted.filter((t) => !t.success).map((t) => t.toolId),
      ),
    ];

    for (const toolId of failedToolIds) {
      await this.flagFailedTool(toolId, since);
    }

    if (input.isPlannerFallback) {
      await this.maybeFlag(
        EvaluationFlagType.REPEATED_PLANNER_FALLBACKS,
        'medium',
        `Repeated planner fallbacks in the last ${FAILURE_DETECTION.windowHours}h`,
        `planner_fallback:${this.dayKey(since)}`,
        () =>
          this.prisma.assistantTurnMetric.count({
            where: { createdAt: { gte: since }, isPlannerFallback: true },
          }),
        FAILURE_DETECTION.plannerFallbackCount,
      );
    }

    if (input.isUnanswered) {
      await this.maybeFlag(
        EvaluationFlagType.REPEATED_UNANSWERED,
        'medium',
        `Repeated unanswered / insufficient-context replies in the last ${FAILURE_DETECTION.windowHours}h`,
        `unanswered:${this.dayKey(since)}`,
        () =>
          this.prisma.assistantTurnMetric.count({
            where: { createdAt: { gte: since }, isUnanswered: true },
          }),
        FAILURE_DETECTION.unansweredCount,
      );
    }
  }

  async inspectAfterFeedback(rating: FeedbackRating): Promise<void> {
    if (rating !== FeedbackRating.NOT_HELPFUL) return;

    const since = this.windowStart();
    await this.maybeFlag(
      EvaluationFlagType.REPEATED_LOW_RATINGS,
      'high',
      `Repeated low ratings (Not Helpful) in the last ${FAILURE_DETECTION.windowHours}h`,
      `low_ratings:${this.dayKey(since)}`,
      () =>
        this.prisma.messageFeedback.count({
          where: {
            createdAt: { gte: since },
            rating: FeedbackRating.NOT_HELPFUL,
          },
        }),
      FAILURE_DETECTION.lowRatingCount,
    );
  }

  private async flagFailedTool(toolId: string, since: Date): Promise<void> {
    const rows = await this.prisma.assistantTurnMetric.findMany({
      where: {
        createdAt: { gte: since },
        toolFailureCount: { gt: 0 },
      },
      select: { toolsExecuted: true },
      take: 500,
    });

    let failures = 0;
    for (const row of rows) {
      const tools = Array.isArray(row.toolsExecuted)
        ? (row.toolsExecuted as Array<{ toolId?: string; success?: boolean }>)
        : [];
      failures += tools.filter(
        (t) => t.toolId === toolId && t.success === false,
      ).length;
    }

    if (failures < FAILURE_DETECTION.toolFailureCount) return;

    await this.upsertFlag({
      type: EvaluationFlagType.REPEATED_TOOL_FAILURES,
      severity: 'high',
      summary: `Tool "${toolId}" failed ${failures} times in the last ${FAILURE_DETECTION.windowHours}h`,
      fingerprint: `tool_fail:${toolId}:${this.dayKey(since)}`,
      metadata: {
        toolId,
        failures,
        windowHours: FAILURE_DETECTION.windowHours,
      },
    });
  }

  private async maybeFlag(
    type: EvaluationFlagType,
    severity: string,
    summary: string,
    fingerprint: string,
    countFn: () => Promise<number>,
    threshold: number,
  ): Promise<void> {
    const count = await countFn();
    if (count < threshold) return;

    await this.upsertFlag({
      type,
      severity,
      summary: `${summary} (count=${count})`,
      fingerprint,
      metadata: {
        count,
        threshold,
        windowHours: FAILURE_DETECTION.windowHours,
      },
    });
  }

  private async upsertFlag(input: {
    type: EvaluationFlagType;
    severity: string;
    summary: string;
    fingerprint: string;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    const existing = await this.prisma.evaluationFlag.findUnique({
      where: { fingerprint: input.fingerprint },
    });

    const metadata = input.metadata as Prisma.InputJsonValue;

    if (existing) {
      await this.prisma.evaluationFlag.update({
        where: { id: existing.id },
        data: {
          summary: input.summary,
          metadata,
          severity: input.severity,
          ...(existing.status === EvaluationFlagStatus.RESOLVED
            ? { status: EvaluationFlagStatus.OPEN }
            : {}),
        },
      });
    } else {
      await this.prisma.evaluationFlag.create({
        data: {
          type: input.type,
          severity: input.severity,
          summary: input.summary,
          fingerprint: input.fingerprint,
          metadata,
        },
      });
    }

    this.logger.warn(
      JSON.stringify({
        event: 'evaluation_flag',
        type: input.type,
        fingerprint: input.fingerprint,
        summary: input.summary,
      }),
    );
  }

  private windowStart(): Date {
    return new Date(
      Date.now() - FAILURE_DETECTION.windowHours * 60 * 60 * 1000,
    );
  }

  private dayKey(since: Date): string {
    return since.toISOString().slice(0, 10);
  }
}
