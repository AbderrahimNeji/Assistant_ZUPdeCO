import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import type { RecordTurnMetricInput } from './evaluation.types';
import { FailureDetectionService } from './failure-detection.service';

@Injectable()
export class TurnMetricsService {
  private readonly logger = new Logger(TurnMetricsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly failures: FailureDetectionService,
  ) {}

  /**
   * Persist auto-metrics for one assistant turn.
   * Safe to call fire-and-forget — never throws to the chat path.
   */
  async recordTurn(input: RecordTurnMetricInput): Promise<void> {
    try {
      const toolSuccessCount = input.toolsExecuted.filter(
        (t) => t.success,
      ).length;
      const toolFailureCount = input.toolsExecuted.length - toolSuccessCount;

      await this.prisma.assistantTurnMetric.create({
        data: {
          messageId: input.messageId,
          conversationId: input.conversationId,
          userId: input.userId,
          plannerMode: input.plannerMode,
          plannerConfidence: input.plannerConfidence,
          knowledgeProviders: input.knowledgeProviders,
          toolsExecuted: input.toolsExecuted,
          toolCount: input.toolsExecuted.length,
          toolSuccessCount,
          toolFailureCount,
          responseLatencyMs: input.responseLatencyMs,
          retrievalLatencyMs: input.retrievalLatencyMs,
          generationLatencyMs: input.generationLatencyMs,
          toolLatencyMs: input.toolLatencyMs,
          sourceCount: input.sourceCount,
          suggestionCount: input.suggestionCount,
          confirmationRequired: input.confirmationRequired,
          confirmationCompleted: input.confirmationCompleted,
          usedRag: input.usedRag,
          usedTools: input.usedTools,
          isHybrid: input.isHybrid,
          isUnanswered: input.isUnanswered,
          isPlannerFallback: input.isPlannerFallback,
        },
      });

      this.logger.log(
        JSON.stringify({
          event: 'turn_metric_recorded',
          messageId: input.messageId,
          conversationId: input.conversationId,
          plannerMode: input.plannerMode,
          responseLatencyMs: input.responseLatencyMs,
          retrievalLatencyMs: input.retrievalLatencyMs,
          generationLatencyMs: input.generationLatencyMs,
          toolCount: input.toolsExecuted.length,
          toolSuccessCount,
          sourceCount: input.sourceCount,
          suggestionCount: input.suggestionCount,
        }),
      );

      await this.failures.inspectAfterTurn(input);
    } catch (error) {
      this.logger.warn(
        `Failed to record turn metric for message ${input.messageId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async markSuggestionClicked(messageId: string): Promise<void> {
    await this.prisma.assistantTurnMetric.updateMany({
      where: { messageId },
      data: { suggestionClicked: true },
    });
  }

  async markToolActionFromUi(messageId: string): Promise<void> {
    await this.prisma.assistantTurnMetric.updateMany({
      where: { messageId },
      data: { toolActionFromUi: true },
    });
  }
}
