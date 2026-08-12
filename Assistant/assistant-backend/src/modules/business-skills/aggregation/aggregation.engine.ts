import type { BusinessSkillId } from '../skill.types';

export type AggregationOp = 'count' | 'sum' | 'avg' | 'min' | 'max';

export type AggregationDimension =
  | 'establishment'
  | 'tutor'
  | 'student'
  | 'session'
  | 'program'
  | 'status'
  | 'source'
  | 'type';

export type AggregationIntent = {
  ops: AggregationOp[];
  dimension: AggregationDimension | null;
  topN: number | null;
  ranking: boolean;
  statistics: boolean;
};

export type AggregationBucket = {
  key: string;
  label: string;
  count: number;
  values: number[];
};

export type NumericStats = {
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
};

const EXCLUDE =
  /\b(without|sans |why|pourquoi|this student|cet élève|cet eleve|this tutor|ce tuteur|create|créer|cree |missing|manquant|unmatched|indisponible|who am i|mon profil)\b/i;

const AGGREGATE_TRIGGER =
  /\b(by |par |group(?:ed|és?)?(?:\s+by)?|top\s+\d+|top |classement|classer|classe les|rank(?:ing)?|plus (?:actifs?|de )|most |least |moins |moyenne|average|avg\b|somme|sum\b|minimum|maximum|\bmin\b|\bmax\b|statistics|statistiques?|\bstats\b)\b/i;

export function parseAggregationIntent(question: string): AggregationIntent | null {
  const q = question?.trim() || '';
  if (!q || EXCLUDE.test(q)) return null;
  if (!AGGREGATE_TRIGGER.test(q)) return null;

  const ops: AggregationOp[] = [];
  if (/\b(somme|sum\b|total des)\b/i.test(q)) ops.push('sum');
  if (/\b(moyenne|average|avg\b)\b/i.test(q)) ops.push('avg');
  if (/\b(minimum|\bmin\b)\b/i.test(q)) ops.push('min');
  if (/\b(maximum|\bmax\b)\b/i.test(q)) ops.push('max');
  if (
    !ops.length ||
    /\b(count|combien|how many|nombre|statistiques?|\bstats\b)\b/i.test(q)
  ) {
    ops.unshift('count');
  }

  const topMatch = q.match(/\btop\s+(\d+)\b/i);
  const topN = topMatch
    ? Math.min(50, Math.max(1, Number(topMatch[1])))
    : /\b(top |classement|rank(?:ing)?|plus actifs?|most |least |moins actifs?)\b/i.test(
          q,
        )
      ? 10
      : null;

  const ranking = topN != null;
  const statistics = /\b(statistics|statistiques?|\bstats\b)\b/i.test(q);

  return {
    ops: [...new Set(ops)],
    dimension: detectDimension(q),
    topN,
    ranking,
    statistics,
  };
}

export function detectDimension(q: string): AggregationDimension | null {
  if (
    /(?:^|[^A-Za-z])(establishments?|établissements?|etablissements?|écoles?|ecoles?|schools?)\b/i.test(
      q,
    )
  ) {
    return 'establishment';
  }
  if (
    /\b(tutors?|tuteurs?)\b/i.test(q) &&
    /\b(by |par |top |classement)\b/i.test(q)
  ) {
    return 'tutor';
  }
  if (
    /(?:^|[^A-Za-z])(students?|élèves?|eleves?)\b/i.test(q) &&
    /\b(by |par |top |classement)\b/i.test(q)
  ) {
    return 'student';
  }
  if (
    /\b(by session|par séance|par seance|by séance|reports? by session)\b/i.test(
      q,
    )
  ) {
    return 'session';
  }
  if (/\b(program|programme)\b/i.test(q)) return 'program';
  if (/(?:^|[^A-Za-z])(status|statut|états?)\b/i.test(q)) return 'status';
  if (/\b(source|origin|origine|assignment)\b/i.test(q)) return 'source';
  if (/\b(type|types)\b/i.test(q)) return 'type';
  if (/\b(by tutor|par tuteur|reports? by tutor)\b/i.test(q)) return 'tutor';
  if (/(?:^|[^A-Za-z])(by student|par élève|par eleve)\b/i.test(q)) {
    return 'student';
  }
  return null;
}

export function numericStats(values: number[]): NumericStats | null {
  const nums = values.filter((n) => Number.isFinite(n));
  if (!nums.length) return null;
  const sum = nums.reduce((a, b) => a + b, 0);
  return {
    count: nums.length,
    sum,
    avg: sum / nums.length,
    min: Math.min(...nums),
    max: Math.max(...nums),
  };
}

export function addToBucket(
  buckets: Map<string, AggregationBucket>,
  key: string,
  label: string,
  value?: number,
): void {
  const id = key.trim() || '—';
  const current = buckets.get(id) ?? {
    key: id,
    label: label.trim() || id,
    count: 0,
    values: [],
  };
  current.count += 1;
  if (typeof value === 'number' && Number.isFinite(value)) {
    current.values.push(value);
  }
  buckets.set(id, current);
}

export function rankBuckets(
  buckets: Map<string, AggregationBucket>,
  topN: number | null,
  ascending = false,
): AggregationBucket[] {
  const rows = [...buckets.values()].sort((a, b) =>
    ascending ? a.count - b.count : b.count - a.count,
  );
  if (topN == null) return rows;
  return rows.slice(0, topN);
}

export function formatBucketTable(
  title: string,
  rows: AggregationBucket[],
  metricLabel = 'Count',
): string[] {
  if (!rows.length) {
    return [title, 'No groups in the live authorization-scoped sample.'];
  }
  return [
    title,
    '',
    `| Rank | Group | ${metricLabel} |`,
    '| ---: | --- | ---: |',
    ...rows.map((r, i) => `| ${i + 1} | ${r.label} | ${r.count} |`),
  ];
}

export function formatNumericStats(label: string, stats: NumericStats): string[] {
  return [
    `${label}:`,
    `| Metric | Value |`,
    `| --- | ---: |`,
    `| COUNT | ${stats.count} |`,
    `| SUM | ${round(stats.sum)} |`,
    `| AVG | ${round(stats.avg)} |`,
    `| MIN | ${round(stats.min)} |`,
    `| MAX | ${round(stats.max)} |`,
  ];
}

function round(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/** Catalog of aggregations each existing skill can answer (not new skills). */
export const SKILL_AGGREGATION_CATALOG: Record<
  BusinessSkillId,
  {
    tables: string[];
    foreignKeys: string[];
    aggregations: string[];
  }
> = {
  student: {
    tables: ['users', 'user_roles', 'user_profiles', 'user_establishments'],
    foreignKeys: [
      'user_establishments.establishment_id → establishments',
      'user_roles.role_id → roles',
    ],
    aggregations: [
      'COUNT students',
      'COUNT / GROUP BY establishment',
      'COUNT / GROUP BY status',
      'SUM/AVG/MIN/MAX presentSessionCount',
      'TOP N students by presentSessionCount',
    ],
  },
  tutor: {
    tables: ['users', 'user_roles', 'user_profiles', 'user_establishments'],
    foreignKeys: ['user_establishments.establishment_id → establishments'],
    aggregations: [
      'COUNT tutors',
      'COUNT / GROUP BY establishment',
      'COUNT / GROUP BY status',
      'TOP N tutors by matching pair count',
    ],
  },
  session: {
    tables: ['sessions', 'establishments', 'programs'],
    foreignKeys: [
      'sessions.establishment_id → establishments',
      'sessions.program_id → programs',
    ],
    aggregations: [
      'COUNT sessions',
      'COUNT / GROUP BY establishment',
      'COUNT / GROUP BY status',
      'COUNT / GROUP BY program (when program is on the session payload)',
    ],
  },
  report: {
    tables: ['session_reports'],
    foreignKeys: [
      'session_reports.session_id → sessions',
      'session_reports.author_id → users',
    ],
    aggregations: [
      'COUNT reports',
      'COUNT / GROUP BY tutor (author)',
      'COUNT / GROUP BY session',
      'COUNT / GROUP BY status',
    ],
  },
  matching: {
    tables: ['session_student_tutor_pairs'],
    foreignKeys: [
      'student_user_id → users',
      'tutor_user_id → users',
      'session_id → sessions',
    ],
    aggregations: [
      'COUNT pairs',
      'COUNT / GROUP BY establishment',
      'COUNT / GROUP BY assignment_source',
      'COUNT / GROUP BY tutor',
      'AVG/MIN/MAX sessionCount',
      'TOP N tutors by pair count',
    ],
  },
  attendance: {
    tables: ['session_participants', 'session_presence_events'],
    foreignKeys: [
      'session_participants.session_id → sessions',
      'session_participants.user_id → users',
    ],
    aggregations: [
      'COUNT / GROUP BY attendance_status',
      'AVG company attendance rate (dashboard KPI)',
    ],
  },
  establishment: {
    tables: ['establishments', 'user_establishments', 'sessions'],
    foreignKeys: ['establishments.company_id → companies'],
    aggregations: [
      'COUNT students/tutors/sessions per establishment',
      'TOP N / RANKINGS by those counts',
    ],
  },
  dashboard: {
    tables: ['(derived dashboard stats/charts)'],
    foreignKeys: [],
    aggregations: [
      'TOP establishments (charts)',
      'COUNT KPIs',
      'AVG attendance rate',
    ],
  },
  statistics: {
    tables: ['(derived dashboard stats/charts)'],
    foreignKeys: [],
    aggregations: [
      'TOP / RANKINGS establishments',
      'COUNT/AVG dashboard metrics',
    ],
  },
  program: {
    tables: ['programs', 'sessions'],
    foreignKeys: ['sessions.program_id → programs'],
    aggregations: ['COUNT programs', 'COUNT sessions GROUP BY program'],
  },
  registration: {
    tables: ['session_participants'],
    foreignKeys: ['session_id → sessions', 'user_id → users'],
    aggregations: [
      'COUNT participants GROUP BY role',
      'COUNT GROUP BY attendance_status',
    ],
  },
  calendar: {
    tables: ['sessions', 'events', 'holidays', 'post_its'],
    foreignKeys: [],
    aggregations: [
      'COUNT events GROUP BY type',
      'COUNT GROUP BY establishment',
    ],
  },
  notification: {
    tables: ['notifications'],
    foreignKeys: ['notifications.user_id → users'],
    aggregations: ['COUNT notifications', 'COUNT unread'],
  },
  parent: {
    tables: ['user_profiles.guardian_contact (JSON)'],
    foreignKeys: ['user_profiles.user_id → users'],
    aggregations: ['COUNT students with/without guardian contact'],
  },
  gamification: {
    tables: ['gamification_*', 'tutor_gamification'],
    foreignKeys: ['user_id → users'],
    aggregations: ['TOP N leaderboard by XP', 'SUM/AVG/MIN/MAX XP'],
  },
  'vsc-report': {
    tables: ['vsc_reports', 'vsc_daily_reports'],
    foreignKeys: [],
    aggregations: ['COUNT GROUP BY status'],
  },
  binome: {
    tables: ['core_pairs'],
    foreignKeys: ['establishment_id → establishments', 'user FKs'],
    aggregations: ['COUNT core pairs', 'COUNT GROUP BY establishment'],
  },
  onboarding: {
    tables: [
      'user_onboarding_records',
      'user_onboarding_step_progress',
      'onboarding_step_templates',
    ],
    foreignKeys: ['user_id → users'],
    aggregations: [],
  },
  user: {
    tables: ['users'],
    foreignKeys: [],
    aggregations: [],
  },
  document: {
    tables: ['pedagogical_resources'],
    foreignKeys: [],
    aggregations: ['COUNT resources'],
  },
  configuration: {
    tables: ['company_settings', 'feature_flags'],
    foreignKeys: [],
    aggregations: ['COUNT feature flags'],
  },
};
