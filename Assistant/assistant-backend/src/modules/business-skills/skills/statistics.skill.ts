import { Injectable } from '@nestjs/common';

import {
  DashboardAdapter,
  DashboardComparisonRow,
  DashboardStats,
  monthDateRange,
  weekDateRange,
} from '../../integration/adapters/dashboard.adapter';
import {
  BusinessSkill,
  BusinessSkillId,
  SkillCapability,
  SkillExecutionContext,
  SkillResult,
  isStaffRole,
} from '../skill.types';
import { SkillAggregationService } from '../aggregation/skill-aggregation.service';
import {
  establishmentActivityFacts,
  isDeicticEstablishmentQuestion,
  apiPartialFacts,
  safeErrorMessage,
} from '../skill.utils';

const UNAVAILABLE =
  'This information is currently unavailable because the backend does not expose it.';

/**
 * Statistics / analytics skill — comparisons, rankings, trends from
 * GET /dashboard/stats?compare=… and GET /dashboard/charts.
 * Never invents KPIs or establishment attendance ranks.
 */
@Injectable()
export class StatisticsSkill implements BusinessSkill {
  readonly id: BusinessSkillId = 'statistics';
  readonly domains = [
    /\b(statistic|statistics|stats|average|moyenne|most|plus de|plus actifs?|moins actifs?|highest|lowest|comparison|compare|ranking|classement|classer|classe les|trend|tendance|evolution|évolution)\b/i,
    /\b(best|worst|meilleur|pire|increased most|plus (?:fortement )?augment|top (?:schools?|établissements?|etablissements?|écoles?)|most active|least active)\b/i,
  ];
  readonly domainTags = [
    'statistics',
    'analytics',
    'comparison',
    'ranking',
    'trends',
  ];
  readonly capabilities: SkillCapability[] = [
    'stats',
    'comparison',
    'count',
  ];

  constructor(
    private readonly dashboard: DashboardAdapter,
    private readonly aggregations: SkillAggregationService,
  ) {}

  async execute(ctx: SkillExecutionContext): Promise<SkillResult> {
    try {
      if (!isStaffRole(ctx.user.role)) {
        return {
          skillId: this.id,
          ok: false,
          operation: 'unauthorized',
          data: null,
          facts: ['Statistics require staff authorization.'],
        };
      }

      const q = ctx.question;
      const page = periodFromPage(ctx);

      if (
        asksEstablishmentRank(q) &&
        !asksAttendanceEstablishmentRank(q)
      ) {
        return this.establishmentRanking(q, page);
      }

      const aggregated = await this.aggregations.tryHandle(this.id, ctx);
      if (aggregated) return aggregated;

      if (asksProgramMostStudents(q)) {
        return unavailable(this.id, 'program_rank_unavailable', [
          'Program with most students: ' + UNAVAILABLE + '.',
          'Missing endpoint/metric: no program×students breakdown on /dashboard/stats or /dashboard/charts.',
          'Next action: open Programs module (list only — no live student census by program).',
        ]);
      }

      if (asksTutorWorkload(q)) {
        return unavailable(this.id, 'tutor_workload_stats_unavailable', [
          'Tutor highest workload: ' + UNAVAILABLE + ' from Dashboard statistics.',
          'Missing metric: charts rank establishments by tutors in sessions, not individual tutor workloads.',
          'Next action: ask Matching for tutor workload ranking from live pairs.',
        ]);
      }

      if (asksAttendanceEstablishmentRank(q)) {
        return unavailable(this.id, 'attendance_establishment_rank_unavailable', [
          'Best/worst establishment by attendance: ' + UNAVAILABLE + '.',
          'Missing metric: `stat-attendance-rate` is not per-establishment; charts have sessions/resources only.',
          'Supported alternative: rank establishments by completed sessions (Terminées) or students (Élèves).',
          'Next action: ask for establishment ranking by completed sessions.',
        ]);
      }

      if (asksMatchingEvolution(q)) {
        return unavailable(this.id, 'matching_evolution_unavailable', [
          'Matching evolution: ' + UNAVAILABLE + ' from Dashboard statistics.',
          'Missing endpoint: no matching time-series on /dashboard/stats or /dashboard/charts.',
          'Next action: ask Matching for current active pair counts.',
        ]);
      }

      if (asksIncreasedMost(q) || asksCompare(q)) {
        return this.comparisonAnalytics(q, page);
      }

      if (asksBestWorst(q) && asksEstablishmentRank(q)) {
        return this.establishmentRanking(q, page);
      }

      if (asksTrendSummary(q)) {
        return this.trendBundle(q, page);
      }

      return this.statisticsBundle(q, page);
    } catch (error) {
      return {
        skillId: this.id,
        ok: true,
        operation: 'error_partial',
        data: null,
        facts: apiPartialFacts(this.id, error),
        warnings: [safeErrorMessage(error)],
      };
    }
  }

  private async comparisonAnalytics(
    q: string,
    page: PeriodHint,
  ): Promise<SkillResult> {
    const compare = detectCompare(q) ?? 'month';
    const stats = await this.dashboard.getStats({
      compare,
      ...(page.establishmentId
        ? { establishmentId: page.establishmentId }
        : {}),
      ...(page.schoolYearId ? { schoolYearId: page.schoolYearId } : {}),
    });

    const comparisons = this.dashboard
      .listStatRows(stats)
      .filter(
        (r): r is DashboardComparisonRow =>
          'currentValue' in r && typeof r.currentValue === 'number',
      );
    const top = this.dashboard.metricIncreasedMost(stats);
    const flat = flattenComparison(comparisons);

    const facts: string[] = [
      `Statistics comparison (GET /dashboard/stats?compare=${compare}, authorization-scoped).`,
      periodLine(stats),
      '',
      '### Comparison table',
      '| Metric | Current | Previous | Δ | Δ% |',
      '| --- | ---: | ---: | ---: | ---: |',
      ...(comparisons.length
        ? comparisons
            .slice(0, 16)
            .map(
              (r) =>
                `| ${this.dashboard.labelFor(r.id)} | ${r.currentValue} | ${r.previousValue} | ${r.differenceValue} | ${pct(r.differencePercentage)} |`,
            )
        : ['| (unavailable) | — | — | — | — |']),
    ];

    if (top) {
      facts.push(
        '',
        `### Metric that increased most`,
        `${this.dashboard.labelFor(top.id)}: ${top.previousValue} → ${top.currentValue} (${pct(top.differencePercentage)}, Δ ${top.differenceValue}) vs ${top.comparisonLabel}.`,
      );
    } else {
      facts.push(
        '',
        'Metric that increased most: unavailable — comparison payload empty or non-numeric.',
      );
    }

    facts.push(
      '',
      '### Explanation',
      'Current vs previous are Ednov-calculated for the compare window — causes are not inventable from KPIs alone.',
      'Investigate movers via Sessions, Reports, or Matching live modules.',
      '',
      '### Recommended actions',
      '- Compare last month / last week with the same question.',
      '- Show affected students/tutors for the metric that moved most.',
      '- Open Dashboard with compare filter.',
      '- Generate a coordinator statistics report from this table.',
    );

    return {
      skillId: this.id,
      ok: true,
      operation: `statistics_compare_${compare}`,
      data: {
        ...flat,
        compare,
        increasedMostId: top?.id ?? null,
        increasedMostPct: top?.differencePercentage ?? null,
        period: stats.period ?? null,
      },
      facts,
    };
  }

  private async establishmentRanking(
    q: string,
    page: PeriodHint,
  ): Promise<SkillResult> {
    const params: Record<string, string | undefined> = {};
    if (asksThisWeek(q)) {
      const w = weekDateRange();
      params.dateFrom = w.dateFrom;
      params.dateTo = w.dateTo;
    } else if (asksThisMonth(q)) {
      const m = monthDateRange();
      params.dateFrom = m.dateFrom;
      params.dateTo = m.dateTo;
    }
    if (page.dateFrom) params.dateFrom = page.dateFrom;
    if (page.dateTo) params.dateTo = page.dateTo;
    if (isDeicticEstablishmentQuestion(q) && page.establishmentId) {
      params.establishmentId = page.establishmentId;
    }

    const charts = await this.dashboard.getCharts(params).catch(() => null);
    const rank = this.dashboard.rankEstablishmentActivity(charts);
    const preferLeast = /\b(least|moins|pire|worst|lowest)\b/i.test(q);
    return {
      skillId: this.id,
      ok: true,
      operation: 'statistics_establishment_ranking',
      data: rank
        ? {
            bestEstablishmentValue: rank.primary.best.value,
            worstEstablishmentValue: rank.primary.worst.value,
            bestEstablishment: rank.primary.best.establishment,
            worstEstablishment: rank.primary.worst.establishment,
            metric: rank.metricLabel,
          }
        : null,
      facts: establishmentActivityFacts({ rank, preferLeast }),
    };
  }

  private async trendBundle(
    q: string,
    page: PeriodHint,
  ): Promise<SkillResult> {
    const compare = asksWeekly(q) ? 'week' : 'month';
    const [stats, charts] = await Promise.all([
      this.dashboard.getStats({
        compare,
        ...(page.establishmentId
          ? { establishmentId: page.establishmentId }
          : {}),
      }),
      this.dashboard.getCharts().catch(() => null),
    ]);

    const comparisons = this.dashboard
      .listStatRows(stats)
      .filter(
        (r): r is DashboardComparisonRow =>
          'currentValue' in r && typeof r.currentValue === 'number',
      );
    const top = this.dashboard.metricIncreasedMost(stats);
    const est = this.dashboard.bestWorstByCompletedSessions(charts);

    const facts: string[] = [
      `Statistics trend bundle (compare=${compare} + charts).`,
      periodLine(stats),
      '',
      '### Trends',
      '| Metric | Current | Previous | Δ% |',
      '| --- | ---: | ---: | ---: |',
      ...comparisons.slice(0, 12).map(
        (r) =>
          `| ${this.dashboard.labelFor(r.id)} | ${r.currentValue} | ${r.previousValue} | ${pct(r.differencePercentage)} |`,
      ),
    ];

    if (top) {
      facts.push(
        `Largest increase: ${this.dashboard.labelFor(top.id)} (${pct(top.differencePercentage)}).`,
      );
    }

    highlightNamedTrends(facts, comparisons, this.dashboard);

    if (asksMatchingEvolution(q)) {
      facts.push(
        'Matching evolution: ' +
          UNAVAILABLE +
          ' (no matching series on dashboard APIs).',
      );
    }

    if (est) {
      facts.push(
        '',
        `Establishment with most completed sessions: ${est.best.establishment} (${est.best.value}).`,
      );
    }

    facts.push(
      '',
      '### Explanation',
      'Trends come from Ednov compare periods; explanations of causes require module drill-down.',
      '',
      '### Recommended actions',
      '- Compare last month in more detail.',
      '- Show affected students/tutors for rising pending reports or new students.',
      '- Open Dashboard.',
      '- Generate report.',
    );

    return {
      skillId: this.id,
      ok: true,
      operation: `statistics_trends_${compare}`,
      data: {
        ...flattenComparison(comparisons),
        increasedMostId: top?.id ?? null,
        bestEstablishmentCompleted: est?.best.establishment ?? null,
        bestEstablishmentCompletedValue: est?.best.value ?? null,
      },
      facts,
    };
  }

  private async statisticsBundle(
    q: string,
    page: PeriodHint,
  ): Promise<SkillResult> {
    const params: Record<string, string | undefined> = {};
    if (page.dateFrom) params.dateFrom = page.dateFrom;
    if (page.dateTo) params.dateTo = page.dateTo;
    if (page.establishmentId) params.establishmentId = page.establishmentId;

    const [stats, charts] = await Promise.all([
      this.dashboard.getStats(params).catch(() => null),
      this.dashboard.getCharts(params).catch(() => null),
    ]);

    const numeric = stats ? this.dashboard.extractNumericKpis(stats) : {};
    const students = stats
      ? this.dashboard.extractStudentKpis(stats)
      : null;
    const tutors = stats ? this.dashboard.extractTutorKpis(stats) : null;
    const est = this.dashboard.bestWorstByCompletedSessions(charts);

    const kpiRows = Object.entries(numeric)
      .slice(0, 14)
      .map(
        ([k, v]) => `| ${this.dashboard.labelFor(k)} | ${v} |`,
      );

    const facts: string[] = [
      'Statistics bundle loaded from Ednov dashboard APIs (authorization-scoped).',
      stats ? periodLine(stats) : 'Stats endpoint unavailable.',
      '',
      '### KPI snapshot',
      '| Metric | Value |',
      '| --- | ---: |',
      ...(kpiRows.length ? kpiRows : ['| (unavailable) | — |']),
      '',
    ];

    if (students?.registeredLikeActive != null || students?.accompanied != null) {
      facts.push(
        `Students — registered (actifs card): ${students.registeredLikeActive ?? '—'}; accompanied: ${students.accompanied ?? '—'}; new: ${students.newStudents ?? '—'}.`,
      );
    }
    if (tutors?.activeTutors != null) {
      facts.push(`Active tutors: ${tutors.activeTutors}.`);
    }
    if (numeric['stat-reports-pending'] != null) {
      facts.push(`Pending/missing reports: ${numeric['stat-reports-pending']}.`);
    }
    if (numeric['stat-sessions-completed'] != null) {
      facts.push(
        `Sessions completed (period): ${numeric['stat-sessions-completed']}.`,
      );
    }

    if (est) {
      facts.push(
        '',
        '### Establishment comparison (completed sessions)',
        '| Rank | Establishment | Completed |',
        '| ---: | --- | ---: |',
        ...est.ranked
          .slice(0, 8)
          .map((r, i) => `| ${i + 1} | ${r.establishment} | ${r.value} |`),
      );
    } else {
      facts.push(
        'Charts/by-establishment payload unavailable — cannot compare establishments without inventing numbers.',
      );
    }

    facts.push(
      '',
      '### Gaps (do not invent)',
      `- Active matchings count on dashboard: ${UNAVAILABLE} (use Matching).`,
      `- Tutor individual workload: ${UNAVAILABLE} (use Matching).`,
      `- Program with most students: ${UNAVAILABLE}.`,
      `- Attendance by establishment: ${UNAVAILABLE} (company rate only).`,
      `- Matching evolution time-series: ${UNAVAILABLE}.`,
      '',
      '### Explanation',
      'Use the KPI table as the only numeric source; hybrid answers may add documentation for definitions, never fabricated values.',
      '',
      '### Recommended actions',
      '- Compare last month.',
      '- Show affected students/tutors.',
      '- Open Dashboard.',
      '- Generate report.',
    );

    const visual: Record<string, number> = { ...pickVisual(numeric) };
    if (students?.registeredLikeActive != null) {
      visual.activeStudentsRegistered = students.registeredLikeActive;
    }
    if (students?.accompanied != null) {
      visual.studentsAccompanied = students.accompanied;
    }
    if (tutors?.activeTutors != null) {
      visual.activeTutors = tutors.activeTutors;
    }
    if (est) {
      visual.bestEstablishmentCompleted = est.best.value;
    }

    return {
      skillId: this.id,
      ok: Boolean(stats || charts),
      operation: 'statistics_bundle',
      data: {
        ...visual,
        stats: stats ? { calculatedAt: stats.calculatedAt } : null,
        chartsAvailable: Boolean(charts),
        bestEstablishment: est?.best.establishment ?? null,
      },
      facts,
      warnings: [
        ...(!stats ? ['GET /dashboard/stats unavailable'] : []),
        ...(!charts ? ['GET /dashboard/charts unavailable'] : []),
      ],
    };
  }
}

type PeriodHint = {
  dateFrom?: string;
  dateTo?: string;
  establishmentId?: string;
  schoolYearId?: string;
};

function periodFromPage(ctx: SkillExecutionContext): PeriodHint {
  const app = ctx.applicationContext;
  const out: PeriodHint = {};
  if (app?.date?.start) out.dateFrom = app.date.start;
  if (app?.date?.end) out.dateTo = app.date.end;
  if (app?.establishment?.id) out.establishmentId = app.establishment.id;
  const filters = app?.filters as Record<string, unknown> | undefined;
  if (filters) {
    if (typeof filters.establishmentId === 'string') {
      out.establishmentId = filters.establishmentId;
    }
    if (typeof filters.schoolYearId === 'string') {
      out.schoolYearId = filters.schoolYearId;
    }
    if (typeof filters.dateFrom === 'string') out.dateFrom = filters.dateFrom;
    if (typeof filters.dateTo === 'string') out.dateTo = filters.dateTo;
  }
  return out;
}

function periodLine(stats: DashboardStats): string {
  const p = stats.period;
  if (!p) return `Calculated at: ${stats.calculatedAt ?? '—'}.`;
  const bits = [
    p.dateFrom && p.dateTo ? `${p.dateFrom} → ${p.dateTo}` : null,
    p.compare ? `compare=${p.compare}` : null,
    p.previousDateFrom && p.previousDateTo
      ? `prev ${p.previousDateFrom} → ${p.previousDateTo}`
      : null,
  ].filter(Boolean);
  return bits.length
    ? `Period: ${bits.join(' · ')}.`
    : `Calculated at: ${stats.calculatedAt ?? '—'}.`;
}

function flattenComparison(
  rows: DashboardComparisonRow[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows.slice(0, 12)) {
    const key = r.id.replace(/^stat-/, '').replace(/-/g, '_');
    out[`${key}_current`] = r.currentValue;
    out[`${key}_delta_pct`] = r.differencePercentage;
  }
  return out;
}

function pickVisual(numeric: Record<string, number>): Record<string, number> {
  const keys = [
    'stat-sessions-completed',
    'stat-reports-pending',
    'stat-attendance-rate',
    'stat-students-new',
    'stat-sessions-month',
  ];
  const out: Record<string, number> = {};
  for (const k of keys) {
    if (numeric[k] != null) {
      out[k.replace(/^stat-/, '').replace(/-/g, '_')] = numeric[k];
    }
  }
  return out;
}

function pct(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const r = Math.round(n * 10) / 10;
  return `${r > 0 ? '+' : ''}${r}%`;
}

function unavailable(
  skillId: BusinessSkillId,
  operation: string,
  facts: string[],
): SkillResult {
  return { skillId, ok: true, operation, data: null, facts };
}

function highlightNamedTrends(
  facts: string[],
  rows: DashboardComparisonRow[],
  dashboard: DashboardAdapter,
): void {
  const find = (id: string) => rows.find((r) => r.id === id);
  const attendance = find('stat-attendance-rate');
  if (attendance) {
    facts.push(
      `Attendance trend: ${attendance.previousValue} → ${attendance.currentValue} (${pct(attendance.differencePercentage)}).`,
    );
  }
  const completed = find('stat-sessions-completed');
  if (completed) {
    facts.push(
      `Session completion: ${completed.previousValue} → ${completed.currentValue} (${pct(completed.differencePercentage)}).`,
    );
  }
  const neu = find('stat-students-new');
  if (neu) {
    facts.push(
      `Student growth (new): ${neu.previousValue} → ${neu.currentValue} (${pct(neu.differencePercentage)}).`,
    );
  }
  const tutors = find('stat-tutors-active');
  if (tutors) {
    facts.push(
      `Tutor activity stock: ${tutors.previousValue} → ${tutors.currentValue} (${pct(tutors.differencePercentage)}).`,
    );
  }
  void dashboard;
}

function detectCompare(q: string): 'week' | 'month' | 'trim' | 'year' | null {
  if (/\b(week|semaine)\b/i.test(q)) return 'week';
  if (/\b(trim|quarter|trimestre)\b/i.test(q)) return 'trim';
  if (/\b(year|année|annee)\b/i.test(q)) return 'year';
  if (/\b(month|mois)\b/i.test(q)) return 'month';
  if (asksIncreasedMost(q) || asksCompare(q)) return 'month';
  return null;
}

function asksCompare(q: string) {
  return /\b(compare|comparison|vs|versus|par rapport|mois précédent|last month|last week)\b/i.test(
    q,
  );
}

function asksIncreasedMost(q: string) {
  return /\b(increased most|plus (?:fortement )?augment|metric that (?:rose|increased)|plus forte hausse)\b/i.test(
    q,
  );
}

function asksEstablishmentRank(q: string) {
  const entity =
    /\b(establishment|établissements?|etablissements?|écoles?|ecoles?|schools?)\b/i.test(
      q,
    );
  const rank =
    /\b(rank|classement|classer|classe(?:r)?|top|most|plus|least|moins|best|worst|meilleur|pire|actifs?|active)\b/i.test(
      q,
    );
  return (
    (entity && rank) ||
    /\b(top (?:schools?|établissements?|etablissements?|écoles?|ecoles?))\b/i.test(
      q,
    )
  );
}

function asksBestWorst(q: string) {
  return /\b(best|worst|meilleur|pire)\b/i.test(q);
}

function asksTrendSummary(q: string) {
  return /\b(trend|tendance|evolution|évolution|weekly|monthly|hebdo|mensuel|growth|croissance|completion|activité)\b/i.test(
    q,
  );
}

function asksThisWeek(q: string) {
  return /\b(this week|cette semaine)\b/i.test(q);
}

function asksThisMonth(q: string) {
  return /\b(this month|ce mois)\b/i.test(q);
}

function asksWeekly(q: string) {
  return /\b(week|semaine|hebdo)\b/i.test(q);
}

function asksProgramMostStudents(q: string) {
  return /\b(program.{0,30}(most|plus).{0,20}(students|élèves)|programme?.{0,30}(plus d['’]élèves))\b/i.test(
    q,
  );
}

function asksTutorWorkload(q: string) {
  return /\b(tutor.{0,40}(workload|charge|most students|plus d['’]élèves)|tuteur.{0,40}(charge|plus d['’]élèves))\b/i.test(
    q,
  );
}

function asksAttendanceEstablishmentRank(q: string) {
  return /\b((best|worst|meilleur|pire).{0,40}(attendance|assiduité|présence)|(attendance|assiduité|présence).{0,40}(establishment|établissement))\b/i.test(
    q,
  );
}

function asksMatchingEvolution(q: string) {
  return /\b(matching evolution|évolution (des )?(matching|appariements|binômes))\b/i.test(
    q,
  );
}
