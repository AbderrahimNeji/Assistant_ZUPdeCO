import { Injectable } from '@nestjs/common';

import { RAG_INSUFFICIENT_CONTEXT_MESSAGE } from '../prompt-builder/prompt-builder.service';
import type { ExecutionTrace } from '../assistant/execution-trace.types';
import { FAILURE_DETECTION } from './evaluation.types';
import { TurnMetricsService } from './turn-metrics.service';

/**
 * Builds privacy-safe turn metrics from ExecutionTrace + response metadata.
 * Does not touch planner / orchestrators / RAG.
 */
@Injectable()
export class EvaluationRecorderService {
  constructor(private readonly turnMetrics: TurnMetricsService) {}

  recordFromTrace(input: {
    userId: string;
    conversationId: string;
    messageId: string;
    answer: string;
    sourceCount: number;
    suggestionCount: number;
    executionTrace: ExecutionTrace;
  }): void {
    const trace = input.executionTrace;
    const toolsExecuted = (trace.toolExecution ?? []).map((tool) => ({
      toolId: tool.toolId,
      success: tool.success,
      ...(tool.status ? { status: tool.status } : {}),
    }));

    const usedTools = toolsExecuted.length > 0;
    const usedRag =
      input.sourceCount > 0 ||
      (trace.knowledge.documentKb ?? 0) > 0 ||
      (trace.knowledge.applicationDbProviders?.length ?? 0) > 0 ||
      (trace.knowledge.conversationAttachments ?? 0) > 0 ||
      typeof trace.timing.retrievalMs === 'number' ||
      Boolean(trace.llm);

    const isHybrid = trace.planner.mode === 'hybrid';
    const isUnanswered =
      input.answer.trim() === RAG_INSUFFICIENT_CONTEXT_MESSAGE ||
      /\bI (don't|do not) have enough (information|context)/i.test(
        input.answer,
      );

    const isPlannerFallback =
      (typeof trace.planner.confidence === 'number' &&
        trace.planner.confidence <
          FAILURE_DETECTION.plannerFallbackConfidence) ||
      /fallback|low confidence|insufficient confidence/i.test(
        `${trace.planner.reasoningSummary} ${trace.decisionSummary}`,
      );

    const confirmationRequired = (trace.toolExecution ?? []).some(
      (tool) => tool.confirmationRequired,
    );
    const confirmationCompleted = (trace.toolExecution ?? []).some(
      (tool) => tool.confirmationCompleted,
    );

    void this.turnMetrics.recordTurn({
      messageId: input.messageId,
      conversationId: input.conversationId,
      userId: input.userId,
      plannerMode: trace.planner.mode,
      plannerConfidence: trace.planner.confidence,
      knowledgeProviders: [
        ...(trace.knowledge.applicationDbProviders ?? []),
        ...(trace.knowledge.documentKb > 0 ? ['document_kb'] : []),
        ...(trace.knowledge.documentationKb > 0 ? ['documentation_kb'] : []),
        ...(trace.knowledge.conversationAttachments > 0
          ? ['conversation_attachments']
          : []),
      ],
      toolsExecuted,
      responseLatencyMs: trace.timing.totalMs,
      retrievalLatencyMs: trace.timing.retrievalMs,
      generationLatencyMs: trace.timing.generationMs,
      toolLatencyMs: trace.timing.toolMs,
      sourceCount: input.sourceCount,
      suggestionCount: input.suggestionCount,
      confirmationRequired,
      confirmationCompleted,
      usedRag,
      usedTools,
      isHybrid,
      isUnanswered,
      isPlannerFallback,
    });
  }
}
