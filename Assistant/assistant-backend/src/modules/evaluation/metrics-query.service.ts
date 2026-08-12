import { Injectable } from '@nestjs/common';
import { EvaluationFlagStatus, FeedbackRating, Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

export type MetricsQueryRange = {
  from?: Date;
  to?: Date;
};

@Injectable()
export class MetricsQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(range: MetricsQueryRange = {}) {
    const where = this.turnWhere(range);
    const feedbackWhere = this.feedbackWhere(range);

    const [
      turns,
      aggregates,
      feedbackGroups,
      conversationCount,
      suggestionClicks,
      openFlags,
      suggestionOffered,
      suggestionClickedTurns,
      plannerAccurate,
      usedRagCount,
      usedToolsCount,
      hybridCount,
      unansweredCount,
      fallbackCount,
      confirmationRequiredCount,
      confirmationCompletedCount,
      toolActionFromUiCount,
    ] = await Promise.all([
      this.prisma.assistantTurnMetric.count({ where }),
      this.prisma.assistantTurnMetric.aggregate({
        where,
        _avg: {
          responseLatencyMs: true,
          retrievalLatencyMs: true,
          generationLatencyMs: true,
          toolLatencyMs: true,
          toolCount: true,
          plannerConfidence: true,
          sourceCount: true,
          suggestionCount: true,
        },
        _sum: {
          toolCount: true,
          toolSuccessCount: true,
          toolFailureCount: true,
        },
      }),
      this.prisma.messageFeedback.groupBy({
        by: ['rating'],
        where: feedbackWhere,
        _count: { _all: true },
      }),
      this.prisma.assistantTurnMetric.groupBy({
        by: ['conversationId'],
        where,
        _count: { _all: true },
      }),
      this.prisma.evaluationEvent.count({
        where: {
          type: 'SUGGESTION_CLICK',
          ...this.eventCreatedAt(range),
        },
      }),
      this.prisma.evaluationFlag.count({
        where: { status: EvaluationFlagStatus.OPEN },
      }),
      this.prisma.assistantTurnMetric.count({
        where: { ...where, suggestionCount: { gt: 0 } },
      }),
      this.prisma.assistantTurnMetric.count({
        where: { ...where, suggestionClicked: true },
      }),
      this.prisma.assistantTurnMetric.count({
        where: {
          ...where,
          OR: [
            { plannerMode: 'rag', usedRag: true, isUnanswered: false },
            {
              plannerMode: { in: ['tool', 'multi_step', 'ui_action'] },
              usedTools: true,
              toolFailureCount: 0,
            },
            { plannerMode: 'hybrid', isUnanswered: false },
          ],
        },
      }),
      this.prisma.assistantTurnMetric.count({
        where: { ...where, usedRag: true },
      }),
      this.prisma.assistantTurnMetric.count({
        where: { ...where, usedTools: true },
      }),
      this.prisma.assistantTurnMetric.count({
        where: { ...where, isHybrid: true },
      }),
      this.prisma.assistantTurnMetric.count({
        where: { ...where, isUnanswered: true },
      }),
      this.prisma.assistantTurnMetric.count({
        where: { ...where, isPlannerFallback: true },
      }),
      this.prisma.assistantTurnMetric.count({
        where: { ...where, confirmationRequired: true },
      }),
      this.prisma.assistantTurnMetric.count({
        where: { ...where, confirmationCompleted: true },
      }),
      this.prisma.assistantTurnMetric.count({
        where: { ...where, toolActionFromUi: true },
      }),
    ]);

    const helpful =
      feedbackGroups.find((g) => g.rating === FeedbackRating.HELPFUL)?._count
        ._all ?? 0;
    const notHelpful =
      feedbackGroups.find((g) => g.rating === FeedbackRating.NOT_HELPFUL)
        ?._count._all ?? 0;
    const feedbackTotal = helpful + notHelpful;

    const toolSuccessSum = aggregates._sum.toolSuccessCount ?? 0;
    const toolCountSum = aggregates._sum.toolCount ?? 0;

    const avgConversationLength =
      conversationCount.length > 0
        ? conversationCount.reduce((sum, row) => sum + row._count._all, 0) /
          conversationCount.length
        : 0;

    return {
      period: {
        from: range.from?.toISOString() ?? null,
        to: range.to?.toISOString() ?? null,
      },
      totals: {
        turns,
        conversations: conversationCount.length,
        openFlags,
        feedbackTotal,
        suggestionClickEvents: suggestionClicks,
      },
      quality: {
        averageLatencyMs: round(aggregates._avg.responseLatencyMs),
        averageRetrievalLatencyMs: round(aggregates._avg.retrievalLatencyMs),
        averageGenerationLatencyMs: round(aggregates._avg.generationLatencyMs),
        averageToolLatencyMs: round(aggregates._avg.toolLatencyMs),
        toolSuccessRate: ratio(toolSuccessSum, toolCountSum),
        plannerAccuracy: ratio(plannerAccurate, turns),
        averagePlannerConfidence: round(aggregates._avg.plannerConfidence, 3),
        suggestionClickRate: ratio(suggestionClickedTurns, suggestionOffered),
        feedbackScore: feedbackTotal
          ? round((helpful / feedbackTotal) * 100, 1)
          : null,
        averageConversationLength: round(avgConversationLength, 2),
        averageToolsPerConversation:
          conversationCount.length > 0
            ? round(toolCountSum / conversationCount.length, 2)
            : 0,
        ragUsagePercent: percent(usedRagCount, turns),
        toolUsagePercent: percent(usedToolsCount, turns),
        hybridUsagePercent: percent(hybridCount, turns),
        unansweredRate: percent(unansweredCount, turns),
        plannerFallbackRate: percent(fallbackCount, turns),
        averageSources: round(aggregates._avg.sourceCount, 2),
        averageSuggestions: round(aggregates._avg.suggestionCount, 2),
        confirmationCompletionRate: ratio(
          confirmationCompletedCount,
          confirmationRequiredCount,
        ),
        toolActionFromUiRate: ratio(toolActionFromUiCount, turns),
      },
      feedback: {
        helpful,
        notHelpful,
        score: feedbackTotal ? round((helpful / feedbackTotal) * 100, 1) : null,
      },
    };
  }

  async byDay(range: MetricsQueryRange = {}) {
    const from = range.from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = range.to ?? new Date();

    const turns = await this.prisma.assistantTurnMetric.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: {
        createdAt: true,
        responseLatencyMs: true,
        plannerMode: true,
        usedRag: true,
        usedTools: true,
        isHybrid: true,
        suggestionClicked: true,
        toolSuccessCount: true,
        toolCount: true,
      },
    });

    const feedback = await this.prisma.messageFeedback.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { createdAt: true, rating: true },
    });

    const days = new Map<
      string,
      {
        date: string;
        turns: number;
        avgLatencyMs: number | null;
        latencySum: number;
        latencyCount: number;
        rag: number;
        tool: number;
        hybrid: number;
        suggestionClicks: number;
        toolSuccesses: number;
        toolAttempts: number;
        helpful: number;
        notHelpful: number;
      }
    >();

    const ensure = (date: string) => {
      let row = days.get(date);
      if (!row) {
        row = {
          date,
          turns: 0,
          avgLatencyMs: null,
          latencySum: 0,
          latencyCount: 0,
          rag: 0,
          tool: 0,
          hybrid: 0,
          suggestionClicks: 0,
          toolSuccesses: 0,
          toolAttempts: 0,
          helpful: 0,
          notHelpful: 0,
        };
        days.set(date, row);
      }
      return row;
    };

    for (const turn of turns) {
      const date = turn.createdAt.toISOString().slice(0, 10);
      const row = ensure(date);
      row.turns += 1;
      if (typeof turn.responseLatencyMs === 'number') {
        row.latencySum += turn.responseLatencyMs;
        row.latencyCount += 1;
      }
      if (turn.usedRag) row.rag += 1;
      if (turn.usedTools) row.tool += 1;
      if (turn.isHybrid) row.hybrid += 1;
      if (turn.suggestionClicked) row.suggestionClicks += 1;
      row.toolSuccesses += turn.toolSuccessCount;
      row.toolAttempts += turn.toolCount;
    }

    for (const item of feedback) {
      const date = item.createdAt.toISOString().slice(0, 10);
      const row = ensure(date);
      if (item.rating === FeedbackRating.HELPFUL) row.helpful += 1;
      else row.notHelpful += 1;
    }

    return [...days.values()]
      .map((row) => ({
        date: row.date,
        turns: row.turns,
        averageLatencyMs:
          row.latencyCount > 0
            ? Math.round(row.latencySum / row.latencyCount)
            : null,
        ragTurns: row.rag,
        toolTurns: row.tool,
        hybridTurns: row.hybrid,
        suggestionClicks: row.suggestionClicks,
        toolSuccessRate: ratio(row.toolSuccesses, row.toolAttempts),
        feedback: {
          helpful: row.helpful,
          notHelpful: row.notHelpful,
        },
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async byTool(range: MetricsQueryRange = {}) {
    const turns = await this.prisma.assistantTurnMetric.findMany({
      where: this.turnWhere(range),
      select: { toolsExecuted: true },
    });

    const map = new Map<
      string,
      {
        toolId: string;
        executions: number;
        successes: number;
        failures: number;
      }
    >();

    for (const turn of turns) {
      const tools = Array.isArray(turn.toolsExecuted)
        ? (turn.toolsExecuted as Array<{
            toolId?: string;
            success?: boolean;
          }>)
        : [];
      for (const tool of tools) {
        if (!tool.toolId) continue;
        const row = map.get(tool.toolId) ?? {
          toolId: tool.toolId,
          executions: 0,
          successes: 0,
          failures: 0,
        };
        row.executions += 1;
        if (tool.success) row.successes += 1;
        else row.failures += 1;
        map.set(tool.toolId, row);
      }
    }

    return [...map.values()]
      .map((row) => ({
        ...row,
        successRate: ratio(row.successes, row.executions),
      }))
      .sort((a, b) => b.executions - a.executions);
  }

  async byPlannerMode(range: MetricsQueryRange = {}) {
    const groups = await this.prisma.assistantTurnMetric.groupBy({
      by: ['plannerMode'],
      where: this.turnWhere(range),
      _count: { _all: true },
      _avg: {
        responseLatencyMs: true,
        plannerConfidence: true,
      },
    });

    const total = groups.reduce((sum, g) => sum + g._count._all, 0);

    const enriched = await Promise.all(
      groups.map(async (g) => {
        const [unanswered, plannerFallbacks, suggestionClicks] =
          await Promise.all([
            this.prisma.assistantTurnMetric.count({
              where: {
                ...this.turnWhere(range),
                plannerMode: g.plannerMode,
                isUnanswered: true,
              },
            }),
            this.prisma.assistantTurnMetric.count({
              where: {
                ...this.turnWhere(range),
                plannerMode: g.plannerMode,
                isPlannerFallback: true,
              },
            }),
            this.prisma.assistantTurnMetric.count({
              where: {
                ...this.turnWhere(range),
                plannerMode: g.plannerMode,
                suggestionClicked: true,
              },
            }),
          ]);

        return {
          plannerMode: g.plannerMode,
          turns: g._count._all,
          sharePercent: percent(g._count._all, total),
          averageLatencyMs: round(g._avg.responseLatencyMs),
          averageConfidence: round(g._avg.plannerConfidence, 3),
          unanswered,
          plannerFallbacks,
          suggestionClicks,
        };
      }),
    );

    return enriched.sort((a, b) => b.turns - a.turns);
  }

  async feedbackSummary(range: MetricsQueryRange = {}) {
    const where = this.feedbackWhere(range);
    const [groups, withComments, recent] = await Promise.all([
      this.prisma.messageFeedback.groupBy({
        by: ['rating'],
        where,
        _count: { _all: true },
      }),
      this.prisma.messageFeedback.count({
        where: { ...where, comment: { not: null } },
      }),
      this.prisma.messageFeedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          messageId: true,
          conversationId: true,
          rating: true,
          comment: true,
          createdAt: true,
        },
      }),
    ]);

    const helpful =
      groups.find((g) => g.rating === FeedbackRating.HELPFUL)?._count._all ?? 0;
    const notHelpful =
      groups.find((g) => g.rating === FeedbackRating.NOT_HELPFUL)?._count
        ._all ?? 0;
    const total = helpful + notHelpful;

    return {
      helpful,
      notHelpful,
      total,
      withComments,
      score: total ? round((helpful / total) * 100, 1) : null,
      recent,
    };
  }

  async failedTools(range: MetricsQueryRange = {}) {
    const byTool = await this.byTool(range);
    return byTool
      .filter((t) => t.failures > 0)
      .sort((a, b) => b.failures - a.failures);
  }

  async commonComments(range: MetricsQueryRange = {}, limit = 25) {
    const rows = await this.prisma.messageFeedback.findMany({
      where: {
        ...this.feedbackWhere(range),
        comment: { not: null },
        rating: FeedbackRating.NOT_HELPFUL,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        comment: true,
        messageId: true,
        conversationId: true,
        createdAt: true,
      },
    });

    const normalized = new Map<
      string,
      { comment: string; count: number; latestAt: string }
    >();

    for (const row of rows) {
      const text = row.comment?.trim();
      if (!text) continue;
      const key = text.toLowerCase();
      const existing = normalized.get(key);
      if (existing) {
        existing.count += 1;
        if (row.createdAt.toISOString() > existing.latestAt) {
          existing.latestAt = row.createdAt.toISOString();
          existing.comment = text;
        }
      } else {
        normalized.set(key, {
          comment: text,
          count: 1,
          latestAt: row.createdAt.toISOString(),
        });
      }
    }

    return [...normalized.values()].sort((a, b) => b.count - a.count);
  }

  async listFlags(status?: EvaluationFlagStatus) {
    return this.prisma.evaluationFlag.findMany({
      where: status ? { status } : undefined,
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Single payload for ops dashboards — reuses existing TurnMetrics aggregates.
   */
  async dashboard(range: MetricsQueryRange = {}) {
    const [overview, byDay, byTool, byPlannerMode, feedbackSummary, failedTools] =
      await Promise.all([
        this.overview(range),
        this.byDay(range),
        this.byTool(range),
        this.byPlannerMode(range),
        this.feedbackSummary(range),
        this.failedTools(range),
      ]);

    return {
      generatedAt: new Date().toISOString(),
      overview,
      series: { byDay },
      breakdowns: {
        byTool,
        byPlannerMode,
        feedbackSummary,
        failedTools,
      },
      notes: [
        'Latencies from AssistantTurnMetric (response / retrieval / generation / tool).',
        'Token usage is present on ExecutionTrace.llm when the LLM provider reports it.',
        'Top questions are not stored as free text for privacy — use Benchmark / QA runs.',
      ],
    };
  }

  private turnWhere(
    range: MetricsQueryRange,
  ): Prisma.AssistantTurnMetricWhereInput {
    return this.createdAtWhere(range);
  }

  private feedbackWhere(
    range: MetricsQueryRange,
  ): Prisma.MessageFeedbackWhereInput {
    return this.createdAtWhere(range);
  }

  private eventCreatedAt(
    range: MetricsQueryRange,
  ): Prisma.EvaluationEventWhereInput {
    return this.createdAtWhere(range);
  }

  private createdAtWhere(range: MetricsQueryRange): {
    createdAt?: Prisma.DateTimeFilter;
  } {
    if (!range.from && !range.to) return {};
    return {
      createdAt: {
        ...(range.from ? { gte: range.from } : {}),
        ...(range.to ? { lte: range.to } : {}),
      },
    };
  }
}

function round(value: number | null | undefined, digits = 0): number | null {
  if (value == null || Number.isNaN(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function ratio(numerator: number, denominator: number): number | null {
  if (!denominator) return null;
  return round(numerator / denominator, 3);
}

function percent(numerator: number, denominator: number): number | null {
  if (!denominator) return null;
  return round((numerator / denominator) * 100, 1);
}
