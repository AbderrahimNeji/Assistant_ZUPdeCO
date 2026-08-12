import { Injectable } from '@nestjs/common';

import {
  DashboardAdapter,
  DashboardComparisonRow,
  DashboardStatRow,
  DashboardStats,
  monthDateRange,
  todayIso,
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
 * Dashboard & KPI live facts from Ednov GET /dashboard/stats (+ charts when needed).
 * Never invents KPIs — missing metrics are stated with the missing endpoint/metric.
 */
@Injectable()
export class DashboardSkill implements BusinessSkill {
  readonly id: BusinessSkillId = 'dashboard';
  readonly domains = [
    /\b(dashboard|tableau de bord|overview|vue d['’]ensemble|indicateurs?|kpi|today['’]?s?\s+kpis?|kpis?\s+(d['’]aujourd|du jour))\b/i,
    /\b(weekly|monthly|hebdomadaire|mensuel|cette semaine|ce mois|this week|this month|last month|mois précédent)\b/i,
    /\b(activité|activity|tendance|trend|évolution|evolution|assiduité|attendance trend|session evolution)\b/i,
    /\b(plus actifs?|moins actifs?|most active|least active|top (?:schools?|établissements?))\b/i,
  ];
  readonly domainTags = ['dashboard', 'kpi', 'overview', 'trends'];
  readonly capabilities: SkillCapability[] = ['count', 'stats', 'list', 'comparison'];

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
          facts: ['Dashboard stats require staff authorization.'],
        };
      }

      const q = ctx.question;
      const pageDates = periodFromPageContext(ctx);
      const compareMode = detectCompareMode(q);

      if (asksEstablishmentActivityRank(q) && !asksBestWorstAttendanceEstablishment(q)) {
        return this.establishmentActivityRank(q, pageDates);
      }

      const aggregated = await this.aggregations.tryHandle(this.id, ctx);
      if (aggregated) return aggregated;

      if (asksActiveMatchings(q)) {
        return unavailable(
          this.id,
          'active_matchings_unavailable',
          [
            'Active matchings: ' + UNAVAILABLE + ' from Dashboard APIs.',
            'Missing endpoint/metric: GET /dashboard/stats has no matching/pair KPI.',
            'Use Matching module (MatchingSkill / Liste des binômes) for pair totals.',
            'Next action: open Matching, or ask “how many active matchings?”.',
          ],
        );
      }

      if (asksProgramMostStudents(q)) {
        return unavailable(
          this.id,
          'program_most_students_unavailable',
          [
            'Program with most students: ' + UNAVAILABLE + ' from Dashboard.',
            'Missing metric: no program breakdown on GET /dashboard/stats or /dashboard/charts.',
            'Next action: open Programs, or ask Programs module for live program lists (no student census by program).',
          ],
        );
      }

      if (asksBestWorstAttendanceEstablishment(q)) {
        return unavailable(
          this.id,
          'establishment_attendance_rank_unavailable',
          [
            'Best/worst establishment by attendance: ' + UNAVAILABLE + '.',
            'Missing metric: `stat-attendance-rate` is company-scoped only; charts expose sessions/resources by establishment, not attendance rate.',
            'Available proxy (not attendance): completed sessions or students-per-establishment from GET /dashboard/charts.',
            'Next action: ask for establishment ranking by completed sessions, or open Dashboard charts.',
          ],
        );
      }

      if (compareMode) {
        return this.comparisonSnapshot(q, compareMode, pageDates);
      }

      if (asksThisWeek(q) || asksSessionsCompleted(q)) {
        return this.periodSnapshot(q, {
          ...weekDateRange(),
          ...pageDates,
          label: 'this week',
        });
      }

      if (asksThisMonth(q) || asksMonthlySummary(q)) {
        return this.periodSnapshot(q, {
          ...monthDateRange(),
          ...pageDates,
          label: 'this month',
        });
      }

      if (asksToday(q)) {
        return this.todaySnapshot(q, pageDates);
      }

      if (asksWeeklySummary(q) || asksAttendanceTrend(q) || asksStudentGrowth(q) || asksTutorActivity(q) || asksStudentActivity(q) || asksSessionCompletion(q) || asksMatchingEvolution(q)) {
        return this.analyticsSummary(q, pageDates);
      }

      return this.overviewSnapshot(q, pageDates);
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

  private async comparisonSnapshot(
    q: string,
    compare: 'week' | 'month' | 'trim' | 'year',
    pageDates: PeriodHint,
  ): Promise<SkillResult> {
    const params: Record<string, string | undefined> = {
      compare,
      ...(pageDates.establishmentId
        ? { establishmentId: pageDates.establishmentId }
        : {}),
      ...(pageDates.schoolYearId
        ? { schoolYearId: pageDates.schoolYearId }
        : {}),
    };
    const stats = await this.dashboard.getStats(params);
    const rows = this.dashboard.listStatRows(stats);
    const comparisons = rows.filter(
      (r): r is DashboardComparisonRow => 'currentValue' in r,
    );
    const top = this.dashboard.metricIncreasedMost(stats);
    const flat = flattenComparisonForVisual(comparisons);

    const facts: string[] = [
      `Dashboard comparison vs previous ${compare} (live GET /dashboard/stats?compare=${compare}, authorization/visibility-scoped).`,
      periodFact(stats),
      '',
      '### KPI comparison',
      '| Indicator | Current | Previous | Δ | Δ% |',
      '| --- | ---: | ---: | ---: | ---: |',
      ...comparisons.slice(0, 16).map((r) => {
        const label = this.dashboard.labelFor(r.id);
        return `| ${label} | ${r.currentValue} | ${r.previousValue} | ${r.differenceValue} | ${formatPct(r.differencePercentage)} |`;
      }),
    ];

    if (top) {
      facts.push(
        '',
        `Metric that increased most: ${this.dashboard.labelFor(top.id)} (+${formatPct(top.differencePercentage)}, Δ ${top.differenceValue}) vs ${top.comparisonLabel}.`,
      );
    } else if (!comparisons.length) {
      facts.push(
        '',
        'Comparison rows unavailable on this response — cannot rank increases without inventing.',
      );
    }

    facts.push(
      '',
      '### Explanation',
      'Current = live period totals from Ednov dashboard calculators; Previous = aligned previous period for the same compare mode.',
      'Causes are not inventable from KPIs alone — correlate with sessions, reports, or Matching when investigating.',
      '',
      '### Recommended actions',
      '- Open Dashboard with the same compare filter to inspect cards.',
      '- Ask for affected students/tutors on the metric that moved most.',
      '- Generate a short coordinator report from these comparison rows.',
    );

    appendFocusHints(facts, q);

    return {
      skillId: this.id,
      ok: true,
      operation: `dashboard_compare_${compare}`,
      data: {
        ...flat,
        compare,
        period: stats.period ?? null,
        calculatedAt: stats.calculatedAt ?? null,
        increasedMostId: top?.id ?? null,
      },
      facts,
    };
  }

  private async periodSnapshot(
    q: string,
    period: { dateFrom: string; dateTo: string; label: string } & PeriodHint,
  ): Promise<SkillResult> {
    const params: Record<string, string | undefined> = {
      dateFrom: period.dateFrom,
      dateTo: period.dateTo,
      ...(period.establishmentId
        ? { establishmentId: period.establishmentId }
        : {}),
      ...(period.schoolYearId ? { schoolYearId: period.schoolYearId } : {}),
    };
    const stats = await this.dashboard.getStats(params);
    return this.buildKpiResult(
      q,
      stats,
      `dashboard_period_${period.label.replace(/\s+/g, '_')}`,
      `Dashboard KPIs for ${period.label} (${period.dateFrom} → ${period.dateTo}, GET /dashboard/stats).`,
    );
  }

  private async todaySnapshot(
    q: string,
    pageDates: PeriodHint,
  ): Promise<SkillResult> {
    const today = todayIso();
    // Ednov dashboard “today” cards use default period when no dates; also probe with today range for session metrics.
    const [defaults, todayScoped] = await Promise.all([
      this.dashboard.getStats({
        ...(pageDates.establishmentId
          ? { establishmentId: pageDates.establishmentId }
          : {}),
        ...(pageDates.schoolYearId
          ? { schoolYearId: pageDates.schoolYearId }
          : {}),
      }),
      this.dashboard
        .getStats({
          dateFrom: today,
          dateTo: today,
          ...(pageDates.establishmentId
            ? { establishmentId: pageDates.establishmentId }
            : {}),
        })
        .catch(() => null),
    ]);

    const primary = todayScoped ?? defaults;
    const factsHead = todayScoped
      ? `Today’s dashboard KPIs (${today}) from GET /dashboard/stats?dateFrom=&dateTo= (plus default snapshot for stock counts).`
      : `Today’s dashboard KPIs from default GET /dashboard/stats (date-scoped today request unavailable).`;

    const result = await this.buildKpiResult(
      q,
      primary,
      'dashboard_today',
      factsHead,
    );

    if (todayScoped && defaults) {
      const stock = this.dashboard.extractNumericKpis(defaults);
      const extras: string[] = [];
      if (stock['stat-students-active'] != null) {
        extras.push(
          `Stock — registered students (stat-students-active): ${stock['stat-students-active']}.`,
        );
      }
      if (stock['stat-tutors-active'] != null) {
        extras.push(
          `Stock — active tutors (stat-tutors-active): ${stock['stat-tutors-active']}.`,
        );
      }
      if (stock['stat-reports-pending'] != null) {
        extras.push(
          `Stock — missing/pending reports: ${stock['stat-reports-pending']}.`,
        );
      }
      if (extras.length) {
        result.facts.splice(
          2,
          0,
          '',
          '### Stock KPIs (default period)',
          ...extras.map((e) => `- ${e}`),
        );
      }
    }
    return result;
  }

  private async establishmentActivityRank(
    q: string,
    pageDates: PeriodHint,
  ): Promise<SkillResult> {
    const params: Record<string, string | undefined> = {};
    if (pageDates.dateFrom) params.dateFrom = pageDates.dateFrom;
    if (pageDates.dateTo) params.dateTo = pageDates.dateTo;
    if (isDeicticEstablishmentQuestion(q) && pageDates.establishmentId) {
      params.establishmentId = pageDates.establishmentId;
    }
    const charts = await this.dashboard.getCharts(params).catch(() => null);
    const rank = this.dashboard.rankEstablishmentActivity(charts);
    const preferLeast = /\b(least|moins|pire|worst|lowest)\b/i.test(q);
    return {
      skillId: this.id,
      ok: true,
      operation: preferLeast
        ? 'dashboard_least_active_establishment'
        : 'dashboard_most_active_establishment',
      data: rank,
      facts: establishmentActivityFacts({ rank, preferLeast }),
    };
  }

  private async analyticsSummary(
    q: string,
    pageDates: PeriodHint,
  ): Promise<SkillResult> {
    const compare: 'week' | 'month' = asksWeeklySummary(q) ? 'week' : 'month';
    const [result, charts] = await Promise.all([
      this.comparisonSnapshot(q, compare, pageDates),
      this.dashboard.getCharts().catch(() => null),
    ]);

    // Cache hit — same compare params as comparisonSnapshot.
    const statsForHints = await this.dashboard
      .getStats({
        compare,
        ...(pageDates.establishmentId
          ? { establishmentId: pageDates.establishmentId }
          : {}),
        ...(pageDates.schoolYearId
          ? { schoolYearId: pageDates.schoolYearId }
          : {}),
      })
      .catch(() => null);

    const facts = [...result.facts];

    if (asksMatchingEvolution(q)) {
      facts.push(
        '',
        'Matching evolution: ' +
          UNAVAILABLE +
          ' from Dashboard — no matching time-series on /dashboard/stats or /dashboard/charts.',
        'Next action: ask Matching for current pair totals, or open Matching history if available in UI.',
      );
    }

    if (statsForHints && asksAttendanceTrend(q)) {
      const attendance = this.dashboard
        .listStatRows(statsForHints)
        .find((r) => r.id === 'stat-attendance-rate');
      if (attendance && 'currentValue' in attendance) {
        facts.push(
          '',
          `Attendance trend (${compare}): current ${attendance.currentValue}% vs previous ${attendance.previousValue}% (Δ ${attendance.differenceValue}, ${formatPct(attendance.differencePercentage)}).`,
        );
      } else {
        const rate = this.dashboard.extractNumericKpis(statsForHints)[
          'stat-attendance-rate'
        ];
        facts.push(
          '',
          rate != null
            ? `Attendance rate (current snapshot): ${rate}%. Period-over-period attendance trend needs compare rows for this metric.`
            : 'Attendance trend: metric `stat-attendance-rate` unavailable on this payload.',
        );
      }
    }

    if (statsForHints && asksStudentGrowth(q)) {
      const newStudents = this.dashboard
        .listStatRows(statsForHints)
        .find((r) => r.id === 'stat-students-new');
      if (newStudents && 'currentValue' in newStudents) {
        facts.push(
          `Student growth (new students): ${newStudents.currentValue} vs ${newStudents.previousValue} (${formatPct(newStudents.differencePercentage)}).`,
        );
      } else {
        facts.push(
          'Student growth: prefer `stat-students-new` / accompanied counts — detail may be incomplete without compare rows.',
        );
      }
    }

    if (statsForHints && asksTutorActivity(q)) {
      const tutors = this.dashboard.extractNumericKpis(statsForHints)[
        'stat-tutors-active'
      ];
      facts.push(
        tutors != null
          ? `Tutor activity stock KPI (active tutors): ${tutors}. Session-level tutor activity time-series: ` +
              UNAVAILABLE +
              ' on dashboard.'
          : 'Tutor activity: `stat-tutors-active` unavailable on this payload.',
      );
    }

    if (statsForHints && asksSessionCompletion(q)) {
      const completed = this.dashboard
        .listStatRows(statsForHints)
        .find((r) => r.id === 'stat-sessions-completed');
      if (completed && 'currentValue' in completed) {
        facts.push(
          `Session completion: ${completed.currentValue} vs ${completed.previousValue} (${formatPct(completed.differencePercentage)}).`,
        );
      }
    }

    const est = this.dashboard.bestWorstByCompletedSessions(charts);
    if (est) {
      facts.push(
        '',
        '### Establishment ranking (completed sessions — not attendance)',
        '| Rank | Establishment | Completed sessions |',
        '| ---: | --- | ---: |',
        ...est.ranked
          .slice(0, 8)
          .map(
            (item, i) =>
              `| ${i + 1} | ${item.establishment} | ${item.value} |`,
          ),
        `Best: ${est.best.establishment} (${est.best.value}); worst in sample: ${est.worst.establishment} (${est.worst.value}).`,
      );
    }

    return {
      ...result,
      operation: `dashboard_summary_${compare}`,
      facts,
      data: {
        ...(typeof result.data === 'object' && result.data
          ? result.data
          : {}),
        chartsAvailable: Boolean(charts),
      },
    };
  }

  private async overviewSnapshot(
    q: string,
    pageDates: PeriodHint,
  ): Promise<SkillResult> {
    const stats = await this.dashboard.getStats({
      ...(pageDates.establishmentId
        ? { establishmentId: pageDates.establishmentId }
        : {}),
      ...(pageDates.schoolYearId
        ? { schoolYearId: pageDates.schoolYearId }
        : {}),
      ...(pageDates.dateFrom ? { dateFrom: pageDates.dateFrom } : {}),
      ...(pageDates.dateTo ? { dateTo: pageDates.dateTo } : {}),
    });
    return this.buildKpiResult(
      q,
      stats,
      'dashboard_stats',
      'Dashboard statistics (live GET /dashboard/stats, authorization/visibility-scoped):',
    );
  }

  private async buildKpiResult(
    q: string,
    stats: DashboardStats,
    operation: string,
    headline: string,
  ): Promise<SkillResult> {
    const rows = this.dashboard.listStatRows(stats);
    const valueRows = rows.filter(
      (r): r is DashboardStatRow => 'value' in r && !('currentValue' in r),
    );
    const numeric = this.dashboard.extractNumericKpis(stats);
    const students = this.dashboard.extractStudentKpis(stats);
    const tutors = this.dashboard.extractTutorKpis(stats);

    const facts: string[] = [
      headline,
      periodFact(stats),
      '',
      '### KPI snapshot',
      '| Indicator | Value | Notes |',
      '| --- | ---: | --- |',
      ...valueRows.slice(0, 20).map((r) => {
        const label = this.dashboard.labelFor(r.id);
        const notes = [
          r.description,
          r.trend
            ? `trend ${r.trend.isPositive ? '↑' : '↓'} ${r.trend.value}`
            : null,
        ]
          .filter(Boolean)
          .join('; ');
        return `| ${label} | ${String(r.value)} | ${notes || '—'} |`;
      }),
    ];

    if (!valueRows.length) {
      facts.push('| (no KPI cards returned) | — | — |');
    }

    facts.push('', '### Key live answers');
    facts.push(
      students.registeredLikeActive != null
        ? `- Active students card (\`stat-students-active\` = status registered / Inscrit): ${students.registeredLikeActive}. Accompanied (Accompagné): ${students.accompanied ?? '—'}.`
        : '- Active students KPI unavailable on this payload.',
    );
    facts.push(
      tutors.activeTutors != null
        ? `- Active tutors (\`stat-tutors-active\`): ${tutors.activeTutors}.`
        : '- Active tutors KPI unavailable on this payload.',
    );
    if (numeric['stat-sessions-completed'] != null) {
      facts.push(
        `- Sessions completed (period-scoped): ${numeric['stat-sessions-completed']}.`,
      );
    }
    if (numeric['stat-reports-pending'] != null) {
      facts.push(
        `- Missing / pending reports (\`stat-reports-pending\`): ${numeric['stat-reports-pending']}.`,
      );
    }
    if (numeric['stat-attendance-rate'] != null) {
      facts.push(
        `- Attendance rate (company-scoped): ${numeric['stat-attendance-rate']}%.`,
      );
    }

    facts.push(
      '',
      '### Pending onboardings',
      students.registeredLikeActive != null
        ? `Pending onboarding approximates registered / Inscrit count (\`stat-students-active\`): ${students.registeredLikeActive}. Dedicated onboarding queue endpoint: ${UNAVAILABLE}.`
        : `Pending onboardings: ${UNAVAILABLE} (no dedicated onboarding KPI; \`stat-students-active\` also missing).`,
    );

    facts.push(
      '',
      '### Explanation',
      'Values are visibility-scoped live dashboard calculators — do not invent KPIs that are absent from the table.',
      '“Élèves actifs” card = registered (Inscrit), not accompanied.',
      '',
      '### Recommended actions',
      '- Compare last month (ask with compare=month).',
      '- Show affected students/tutors for pending reports or registered onboarding.',
      '- Open Dashboard to inspect the same cards.',
      '- Generate a short weekly/monthly report from these KPIs.',
    );

    appendFocusHints(facts, q);

    const visualFlat: Record<string, number> = {};
    if (students.registeredLikeActive != null) {
      visualFlat.activeStudentsRegistered = students.registeredLikeActive;
    }
    if (students.accompanied != null) {
      visualFlat.studentsAccompanied = students.accompanied;
    }
    if (tutors.activeTutors != null) {
      visualFlat.activeTutors = tutors.activeTutors;
    }
    if (numeric['stat-sessions-completed'] != null) {
      visualFlat.sessionsCompleted = numeric['stat-sessions-completed'];
    }
    if (numeric['stat-reports-pending'] != null) {
      visualFlat.pendingReports = numeric['stat-reports-pending'];
    }
    if (numeric['stat-attendance-rate'] != null) {
      visualFlat.attendanceRate = numeric['stat-attendance-rate'];
    }

    return {
      skillId: this.id,
      ok: true,
      operation,
      data: {
        ...visualFlat,
        period: stats.period ?? null,
        calculatedAt: stats.calculatedAt ?? null,
      },
      facts,
    };
  }
}

type PeriodHint = {
  dateFrom?: string;
  dateTo?: string;
  establishmentId?: string;
  schoolYearId?: string;
};

function periodFromPageContext(ctx: SkillExecutionContext): PeriodHint {
  const app = ctx.applicationContext;
  const out: PeriodHint = {};
  if (app?.date?.start) out.dateFrom = app.date.start;
  if (app?.date?.end) out.dateTo = app.date.end;
  const filters = app?.filters;
  if (filters && typeof filters === 'object') {
    const f = filters as Record<string, unknown>;
    if (typeof f.establishmentId === 'string') {
      out.establishmentId = f.establishmentId;
    }
    if (typeof f.schoolYearId === 'string') {
      out.schoolYearId = f.schoolYearId;
    }
    if (typeof f.dateFrom === 'string') out.dateFrom = f.dateFrom;
    if (typeof f.dateTo === 'string') out.dateTo = f.dateTo;
  }
  if (app?.establishment?.id) out.establishmentId = app.establishment.id;
  return out;
}

function periodFact(stats: DashboardStats): string {
  const p = stats.period;
  if (!p) {
    return stats.calculatedAt
      ? `Calculated at: ${stats.calculatedAt}.`
      : 'Period metadata not included on payload.';
  }
  const bits = [
    p.dateFrom && p.dateTo ? `${p.dateFrom} → ${p.dateTo}` : null,
    p.compare ? `compare=${p.compare}` : null,
    p.previousDateFrom && p.previousDateTo
      ? `previous ${p.previousDateFrom} → ${p.previousDateTo}`
      : null,
    p.schoolYearId ? 'schoolYear filter on' : null,
  ].filter(Boolean);
  return bits.length
    ? `Period: ${bits.join(' · ')}.`
    : `Calculated at: ${stats.calculatedAt ?? '—'}.`;
}

function flattenComparisonForVisual(
  rows: DashboardComparisonRow[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows.slice(0, 12)) {
    const key = r.id.replace(/^stat-/, '').replace(/-/g, '_');
    out[`${key}_current`] = r.currentValue;
    out[`${key}_previous`] = r.previousValue;
    out[`${key}_delta`] = r.differenceValue;
  }
  return out;
}

function formatPct(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const rounded = Math.round(n * 10) / 10;
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

function unavailable(
  skillId: BusinessSkillId,
  operation: string,
  facts: string[],
): SkillResult {
  return {
    skillId,
    ok: true,
    operation,
    data: null,
    facts,
  };
}

function appendFocusHints(facts: string[], q: string): void {
  if (asksMissingReports(q)) {
    facts.push(
      'Focus: missing reports → use `stat-reports-pending`; student-level list needs Reports module.',
    );
  }
  if (asksActiveStudents(q)) {
    facts.push(
      'Focus: active students → prefer accompanied for “en accompagnement”; card “actifs” = registered.',
    );
  }
}

function detectCompareMode(
  q: string,
): 'week' | 'month' | 'trim' | 'year' | null {
  if (
    /\b(vs last month|versus last month|compared? to last month|mois précédent|par rapport au mois|compare.*(month|mois)|last month)\b/i.test(
      q,
    )
  ) {
    return 'month';
  }
  if (
    /\b(vs last week|semaine précédente|compare.*(week|semaine)|last week)\b/i.test(
      q,
    )
  ) {
    return 'week';
  }
  if (/\b(trimestre|quarter|compare.*trim)\b/i.test(q)) return 'trim';
  if (/\b(vs last year|année précédente|compare.*year)\b/i.test(q)) {
    return 'year';
  }
  if (/\b(increased most|plus (?:fortement )?augment|metric that (?:rose|increased))\b/i.test(q)) {
    return 'month';
  }
  return null;
}

function asksThisWeek(q: string) {
  return /\b(this week|cette semaine|sessions? completed this week|séances? (terminées?|complétées?) (cette )?semaine)\b/i.test(
    q,
  );
}

function asksThisMonth(q: string) {
  return /\b(this month|ce mois|mois en cours)\b/i.test(q);
}

function asksToday(q: string) {
  return /\b(today|aujourd['’]?hui|today['’]?s?\s+kpis?|kpis?\s+du jour)\b/i.test(
    q,
  );
}

function asksSessionsCompleted(q: string) {
  return /\b(sessions? completed|séances? (terminées?|complétées?|réalisées?))\b/i.test(
    q,
  );
}

function asksWeeklySummary(q: string) {
  return /\b(weekly summary|résumé hebdo|synthèse (de la )?semaine|week(ly)? overview)\b/i.test(
    q,
  );
}

function asksMonthlySummary(q: string) {
  return /\b(monthly summary|résumé mensuel|synthèse (du )?mois|month(ly)? overview)\b/i.test(
    q,
  );
}

function asksAttendanceTrend(q: string) {
  return /\b(attendance trend|tendance (de )?(présence|assiduité|attendance)|évolution (de l['’])?(assiduité|présence)|taux de présence|assiduité)\b/i.test(
    q,
  );
}

function asksStudentGrowth(q: string) {
  return /\b(student growth|croissance (des )?élèves|nouveaux élèves|new students)\b/i.test(
    q,
  );
}

function asksStudentActivity(q: string) {
  return /\b(student activity|activité (des )?élèves|activité élèves|students? active)\b/i.test(
    q,
  );
}

function asksTutorActivity(q: string) {
  return /\b(tutor activity|activité (des )?tuteurs|tutors? active|activité tuteur)\b/i.test(
    q,
  );
}

function asksSessionCompletion(q: string) {
  return /\b(session completion|session evolution|évolution des séances|evolution des seances|complétion des séances|taux de (séances )?terminées)\b/i.test(
    q,
  );
}

function asksMatchingEvolution(q: string) {
  return /\b(matching evolution|évolution (des )?(matching|appariements|binômes|binomes))\b/i.test(
    q,
  );
}

function asksActiveMatchings(q: string) {
  return /\b(active matchings?|appariements? actifs?|binômes? actifs?|binomes? actifs?)\b/i.test(
    q,
  );
}

function asksProgramMostStudents(q: string) {
  return /\b(program.{0,30}(most|plus).{0,20}(students|élèves)|programme?.{0,30}(plus d['’]élèves|le plus d))\b/i.test(
    q,
  );
}

function asksBestWorstAttendanceEstablishment(q: string) {
  return /\b((best|worst|meilleur|pire).{0,40}establishment.{0,40}attendance|(établissement|etablissement).{0,40}(assiduité|présence|attendance)|(attendance|assiduité|présence).{0,40}(establishment|établissement))\b/i.test(
    q,
  );
}

function asksMissingReports(q: string) {
  return /\b(missing reports?|pending reports?|rapports? manquants?|comptes?-?rendus? (manquants?|en attente|à compléter))\b/i.test(
    q,
  );
}

function asksActiveStudents(q: string) {
  return /\b(active students?|élèves? actifs?)\b/i.test(q);
}

function asksEstablishmentActivityRank(q: string) {
  const entity =
    /\b(establishment|établissements?|etablissements?|écoles?|ecoles?|schools?)\b/i.test(
      q,
    );
  const rank =
    /\b(most active|least active|plus actifs?|moins actifs?|le plus actif|les plus actifs|top|classer|classe(?:r)? les|classement)\b/i.test(
      q,
    );
  return entity && rank;
}
