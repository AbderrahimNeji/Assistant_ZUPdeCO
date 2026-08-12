import { Injectable } from '@nestjs/common';

import { TtlCache } from '../../../common/cache/ttl-cache';
import { EdnovApiClient } from '../ednov-api.client';
import { RequestContextStore } from '../request-context';

export type DashboardStatTrend = {
  value: number;
  isPositive: boolean;
  differenceValue?: number;
};

export type DashboardStatRow = {
  id: string;
  value: string | number;
  trend?: DashboardStatTrend;
  description?: string;
};

export type DashboardComparisonRow = {
  id: string;
  currentValue: number;
  previousValue: number;
  differenceValue: number;
  differencePercentage: number;
  comparisonLabel: string;
};

export type DashboardStats = {
  studentsCount?: number;
  tutorsCount?: number;
  volunteersCount?: number;
  sessionsCount?: number;
  establishmentsCount?: number;
  programsCount?: number;
  stats?: Record<string, DashboardStatRow | DashboardComparisonRow | unknown>;
  calculatedAt?: string;
  period?: {
    dateFrom?: string;
    dateTo?: string;
    schoolYearId?: string;
    compare?: string;
    previousDateFrom?: string;
    previousDateTo?: string;
  };
  [key: string]: unknown;
};

export type StudentDashboardKpis = {
  registeredLikeActive?: number | null;
  accompanied?: number | null;
  newStudents?: number | null;
  raw: DashboardStats;
};

export type TutorDashboardKpis = {
  /** Ednov `stat-tutors-active` — active tutor accounts when present. */
  activeTutors?: number | null;
  raw: DashboardStats;
};

export type ChartSeries = { name: string; data: number[] };

export type DashboardChartsPayload = {
  sessionsByEstablishment?: {
    categories?: string[];
    series?: ChartSeries[];
  };
  resourcesByEstablishment?: {
    categories?: string[];
    series?: ChartSeries[];
  };
  [key: string]: unknown;
};

export type EstablishmentRankingItem = {
  establishment: string;
  value: number;
  metric: string;
};

export type EstablishmentRankSet = {
  best: EstablishmentRankingItem;
  worst: EstablishmentRankingItem;
  ranked: EstablishmentRankingItem[];
};

export type EstablishmentActivityRank = {
  primary: EstablishmentRankSet;
  byCompleted: EstablishmentRankSet | null;
  byStudents: EstablishmentRankSet | null;
  metricLabel: string;
  why: string;
};

const COMPLETED_SERIES = ['terminees', 'completed', 'termine'];
const CLOSED_SERIES = ['cloturees', 'closed', 'cloture'];
const STUDENT_SERIES = ['eleves', 'students', 'eleve', 'student'];

/** Human labels for known Ednov dashboard stat card ids — never invent values. */
export const DASHBOARD_STAT_LABELS: Record<string, string> = {
  'stat-sessions-total': 'Sessions (total)',
  'stat-sessions-by-status': 'Sessions by status',
  'stat-sessions-month': 'Sessions this month',
  'stat-sessions-hours': 'Session hours',
  'stat-sessions-completed': 'Sessions completed',
  'stat-sessions-realized': 'Sessions realized',
  'stat-reports-pending': 'Missing / pending reports',
  'stat-reports-completion': 'Report completion rate',
  'stat-students-active': 'Students registered (Inscrit / “actifs” card)',
  'stat-students-accompanied': 'Students accompanied',
  'stat-students-new': 'New students',
  'stat-students-accompanied-min3': 'Students accompanied (min 3 sessions)',
  'stat-attendance-rate': 'Attendance rate',
  'stat-tutors-active': 'Active tutors',
  'stat-establishments': 'Establishments',
  'stat-vsc-reports': 'VSC reports',
  'stat-hours-total': 'Hours (total)',
  'stat-hours-individual': 'Hours (individual)',
  'stat-hours-collective': 'Hours (collective)',
  'stat-students-collective': 'Students (collective)',
  'stat-students-individual': 'Students (individual)',
  'stat-students-online': 'Students (online)',
  'stat-dropouts-inperson': 'Dropouts (in-person)',
  'stat-dropouts-online': 'Dropouts (online)',
  'stat-students-by-level': 'Students by level',
  'stat-students-primary': 'Students (primary)',
  'stat-students-college': 'Students (collège)',
  'stat-students-general': 'Students (général)',
  'stat-students-professionnel': 'Students (professionnel)',
  'stat-students-lycee': 'Students (lycée)',
  'stat-volunteers-employed': 'Volunteers (employed)',
  'stat-volunteers-retired': 'Volunteers (retired)',
  'stat-volunteers-student': 'Volunteers (student)',
  'stat-volunteers-dropouts': 'Volunteer dropouts',
  'stat-civicservice-youth': 'Civic service youth',
  'stat-civicservice-avg-contract': 'Civic service avg contract',
};

@Injectable()
export class DashboardAdapter {
  private readonly cache = new TtlCache<DashboardStats | unknown>(45_000, 48);
  private readonly inflight = new Map<string, Promise<unknown>>();

  constructor(private readonly ednov: EdnovApiClient) {}

  async getStats(params?: Record<string, string | number | undefined>) {
    const key = this.cacheKey('stats', params);
    const hit = this.cache.get(key);
    if (hit) return hit as DashboardStats;
    const pending = this.inflight.get(key);
    if (pending) return pending as Promise<DashboardStats>;
    const request = this.ednov
      .get<DashboardStats>('/dashboard/stats', { params })
      .then((data) => {
        this.cache.set(key, data);
        return data;
      })
      .finally(() => this.inflight.delete(key));
    this.inflight.set(key, request);
    return request;
  }

  /**
   * Extract student KPI numbers from Ednov dashboard payload without inventing.
   * `stat-students-active` in Ednov = count of status `registered` (Inscrit).
   * `stat-students-accompanied` = status `accompanied`.
   */
  extractStudentKpis(stats: DashboardStats): StudentDashboardKpis {
    const num = this.statValue(stats);
    return {
      registeredLikeActive: num('stat-students-active'),
      accompanied: num('stat-students-accompanied'),
      newStudents: num('stat-students-new'),
      raw: stats,
    };
  }

  /**
   * Tutor KPIs from dashboard — `stat-tutors-active` when present.
   * Top-level `tutorsCount` is not always set by Ednov.
   */
  extractTutorKpis(stats: DashboardStats): TutorDashboardKpis {
    const num = this.statValue(stats);
    return {
      activeTutors: num('stat-tutors-active'),
      raw: stats,
    };
  }

  /** Flat numeric map of known KPIs for businessVisual / skill data. */
  extractNumericKpis(stats: DashboardStats): Record<string, number> {
    const bag = this.statsBag(stats);
    const out: Record<string, number> = {};
    for (const [id, row] of Object.entries(bag)) {
      const n = this.coerceNumber(row);
      if (n != null) out[id] = n;
    }
    return out;
  }

  /** Normalized rows (value or comparison) — never invents missing ids. */
  listStatRows(
    stats: DashboardStats,
  ): Array<DashboardStatRow | DashboardComparisonRow> {
    const bag = this.statsBag(stats);
    const rows: Array<DashboardStatRow | DashboardComparisonRow> = [];
    for (const [id, raw] of Object.entries(bag)) {
      if (!raw || typeof raw !== 'object') {
        if (typeof raw === 'number' || typeof raw === 'string') {
          rows.push({ id, value: raw });
        }
        continue;
      }
      const obj = raw as Record<string, unknown>;
      if (
        typeof obj.currentValue === 'number' &&
        typeof obj.previousValue === 'number'
      ) {
        rows.push({
          id: typeof obj.id === 'string' ? obj.id : id,
          currentValue: obj.currentValue,
          previousValue: obj.previousValue,
          differenceValue:
            typeof obj.differenceValue === 'number'
              ? obj.differenceValue
              : obj.currentValue - obj.previousValue,
          differencePercentage:
            typeof obj.differencePercentage === 'number'
              ? obj.differencePercentage
              : 0,
          comparisonLabel:
            typeof obj.comparisonLabel === 'string'
              ? obj.comparisonLabel
              : 'previous period',
        });
        continue;
      }
      if ('value' in obj) {
        const value = obj.value;
        if (typeof value === 'number' || typeof value === 'string') {
          const row: DashboardStatRow = {
            id: typeof obj.id === 'string' ? obj.id : id,
            value,
          };
          if (obj.description && typeof obj.description === 'string') {
            row.description = obj.description;
          }
          if (obj.trend && typeof obj.trend === 'object') {
            const t = obj.trend as Record<string, unknown>;
            if (typeof t.value === 'number') {
              row.trend = {
                value: t.value,
                isPositive: Boolean(t.isPositive),
                ...(typeof t.differenceValue === 'number'
                  ? { differenceValue: t.differenceValue }
                  : {}),
              };
            }
          }
          rows.push(row);
        }
      }
    }
    return rows;
  }

  isComparisonPayload(stats: DashboardStats): boolean {
    return this.listStatRows(stats).some(
      (r) => 'currentValue' in r && typeof r.currentValue === 'number',
    );
  }

  labelFor(statId: string): string {
    return DASHBOARD_STAT_LABELS[statId] ?? statId;
  }

  /**
   * Among comparison rows, pick the metric with the largest positive
   * differencePercentage (or absolute increase). Returns null if none.
   */
  metricIncreasedMost(
    stats: DashboardStats,
  ): DashboardComparisonRow | null {
    const comparisons = this.listStatRows(stats).filter(
      (r): r is DashboardComparisonRow =>
        'currentValue' in r && typeof r.currentValue === 'number',
    );
    if (!comparisons.length) return null;
    let best: DashboardComparisonRow | null = null;
    for (const row of comparisons) {
      if (!Number.isFinite(row.differencePercentage)) continue;
      if (!best || row.differencePercentage > best.differencePercentage) {
        best = row;
      }
    }
    return best;
  }

  async getCharts(params?: Record<string, string | number | undefined>) {
    const key = this.cacheKey('charts', params);
    const hit = this.cache.get(key);
    if (hit) return hit as DashboardChartsPayload;
    const pending = this.inflight.get(key);
    if (pending) return pending as Promise<DashboardChartsPayload>;
    const request = this.ednov
      .get<unknown>('/dashboard/charts', { params })
      .then((data) => {
        const unwrapped = unwrapDashboardCharts(data) ?? {};
        this.cache.set(key, unwrapped);
        return unwrapped;
      })
      .finally(() => this.inflight.delete(key));
    this.inflight.set(key, request);
    return request;
  }

  /**
   * Rank establishments by a named series from charts payload.
   * metricName examples: 'Terminées', 'Élèves', 'Tuteurs' (accent-insensitive).
   */
  rankEstablishmentsBySeries(
    charts: DashboardChartsPayload | null | undefined,
    source: 'sessionsByEstablishment' | 'resourcesByEstablishment',
    metricName: string,
  ): EstablishmentRankingItem[] {
    return this.rankEstablishmentsByAliases(charts, source, [
      normalizeSeriesName(metricName),
    ]);
  }

  rankEstablishmentsByAliases(
    charts: DashboardChartsPayload | null | undefined,
    source: 'sessionsByEstablishment' | 'resourcesByEstablishment',
    aliases: string[],
  ): EstablishmentRankingItem[] {
    const payload = unwrapDashboardCharts(charts);
    if (!payload) return [];
    const block = payload[source];
    if (!block?.categories?.length || !block.series?.length) return [];
    const wanted = new Set(aliases.map(normalizeSeriesName));
    const series = block.series.find((s) =>
      wanted.has(normalizeSeriesName(s.name)),
    );
    if (!series?.data?.length) return [];
    return zipCategoryValues(block.categories, series.data, series.name);
  }

  /** Best / worst establishment for completed sessions (charts). */
  bestWorstByCompletedSessions(charts: DashboardChartsPayload | null) {
    return toRankSet(
      this.rankEstablishmentsByAliases(
        charts,
        'sessionsByEstablishment',
        COMPLETED_SERIES,
      ),
    );
  }

  /** Best / worst by student resource count in sessions (not attendance). */
  bestWorstByStudents(charts: DashboardChartsPayload | null) {
    return toRankSet(
      this.rankEstablishmentsByAliases(
        charts,
        'resourcesByEstablishment',
        STUDENT_SERIES,
      ),
    );
  }

  /**
   * Company-wide “most/least active establishment”.
   * Primary metric: delivered sessions (Terminées + Clôturées), then total
   * session volume, then students in sessions — never attendance rate.
   */
  rankEstablishmentActivity(
    charts: DashboardChartsPayload | null | undefined,
  ): EstablishmentActivityRank | null {
    const byCompleted = this.bestWorstByCompletedSessions(charts ?? null);
    const byClosed = toRankSet(
      this.rankEstablishmentsByAliases(
        charts,
        'sessionsByEstablishment',
        CLOSED_SERIES,
      ),
    );
    const delivered = toRankSet(
      mergeRankedSums(
        byCompleted?.ranked ?? [],
        byClosed?.ranked ?? [],
        'delivered sessions (Terminées + Clôturées)',
      ),
    );
    const byTotal = toRankSet(
      sumAllSeries(charts, 'sessionsByEstablishment', 'total sessions'),
    );
    const byStudents = this.bestWorstByStudents(charts ?? null);

    const primary =
      firstPositiveRank(delivered) ??
      firstPositiveRank(byCompleted) ??
      firstPositiveRank(byTotal) ??
      firstPositiveRank(byStudents) ??
      delivered ??
      byCompleted ??
      byTotal ??
      byStudents;
    if (!primary) return null;

    const metricLabel = primary.best.metric;
    const why =
      metricLabel.toLowerCase().includes('student') ||
      normalizeSeriesName(metricLabel).includes('elev')
        ? 'Activity here is the number of students in sessions (Élèves) on Dashboard charts — not attendance rate.'
        : 'Activity here is session volume on Dashboard charts (completed/closed when present, otherwise all statuses). That is why the leader is the most active — not attendance rate, which is company-scoped only.';

    return {
      primary,
      byCompleted,
      byStudents,
      metricLabel,
      why,
    };
  }

  private statsBag(stats: DashboardStats): Record<string, unknown> {
    if (stats.stats && typeof stats.stats === 'object') {
      return stats.stats as Record<string, unknown>;
    }
    return stats as Record<string, unknown>;
  }

  private coerceNumber(row: unknown): number | null {
    if (typeof row === 'number' && Number.isFinite(row)) return row;
    if (row && typeof row === 'object') {
      const obj = row as Record<string, unknown>;
      if (typeof obj.currentValue === 'number' && Number.isFinite(obj.currentValue)) {
        return obj.currentValue;
      }
      if ('value' in obj) {
        const v = obj.value;
        if (typeof v === 'number' && Number.isFinite(v)) return v;
        if (typeof v === 'string' && v.trim()) {
          const pct = /^([\d.]+)\s*%$/.exec(v.trim());
          if (pct) return Number(pct[1]);
          if (!Number.isNaN(Number(v))) return Number(v);
        }
      }
    }
    return null;
  }

  private statValue(
    stats: DashboardStats,
  ): (key: string) => number | null {
    const bag = this.statsBag(stats);
    return (key: string): number | null => this.coerceNumber(bag[key]);
  }

  private cacheKey(
    kind: string,
    params?: Record<string, string | number | undefined>,
  ): string {
    const uid = RequestContextStore.getStore()?.ednovUserId ?? 'anon';
    const paramPart = params
      ? Object.entries(params)
          .filter(([, v]) => v != null && v !== '')
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}=${v}`)
          .join('&')
      : '';
    return `${kind}:${uid}:${paramPart}`;
  }
}

/** ISO date YYYY-MM-DD in local calendar. */
export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function weekDateRange(ref = new Date()): {
  dateFrom: string;
  dateTo: string;
} {
  const d = new Date(ref);
  const day = d.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diffToMon);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { dateFrom: toIsoDate(start), dateTo: toIsoDate(end) };
}

export function monthDateRange(ref = new Date()): {
  dateFrom: string;
  dateTo: string;
} {
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  return { dateFrom: toIsoDate(start), dateTo: toIsoDate(end) };
}

export function todayIso(ref = new Date()): string {
  return toIsoDate(ref);
}

export function normalizeSeriesName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

export function unwrapDashboardCharts(
  raw: unknown,
): DashboardChartsPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (isChartBlock(obj.sessionsByEstablishment) || isChartBlock(obj.resourcesByEstablishment)) {
    return obj as DashboardChartsPayload;
  }
  if (obj.data && typeof obj.data === 'object') {
    return unwrapDashboardCharts(obj.data);
  }
  if (obj.result && typeof obj.result === 'object') {
    return unwrapDashboardCharts(obj.result);
  }
  return obj as DashboardChartsPayload;
}

function isChartBlock(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const block = value as { categories?: unknown; series?: unknown };
  return Array.isArray(block.categories) || Array.isArray(block.series);
}

function zipCategoryValues(
  categories: string[],
  data: number[],
  metric: string,
): EstablishmentRankingItem[] {
  const items: EstablishmentRankingItem[] = [];
  for (let i = 0; i < categories.length; i++) {
    const value = Number(data[i] ?? 0);
    if (!Number.isFinite(value)) continue;
    items.push({
      establishment: categories[i],
      value,
      metric,
    });
  }
  return items.sort((a, b) => b.value - a.value);
}

function toRankSet(
  ranked: EstablishmentRankingItem[],
): EstablishmentRankSet | null {
  if (!ranked.length) return null;
  return {
    best: ranked[0],
    worst: ranked[ranked.length - 1],
    ranked,
  };
}

function firstPositiveRank(
  set: EstablishmentRankSet | null,
): EstablishmentRankSet | null {
  if (!set) return null;
  return set.ranked.some((r) => r.value > 0) ? set : null;
}

function mergeRankedSums(
  a: EstablishmentRankingItem[],
  b: EstablishmentRankingItem[],
  metric: string,
): EstablishmentRankingItem[] {
  const map = new Map<string, number>();
  for (const row of [...a, ...b]) {
    map.set(row.establishment, (map.get(row.establishment) ?? 0) + row.value);
  }
  return [...map.entries()]
    .map(([establishment, value]) => ({ establishment, value, metric }))
    .sort((x, y) => y.value - x.value);
}

function sumAllSeries(
  charts: DashboardChartsPayload | null | undefined,
  source: 'sessionsByEstablishment' | 'resourcesByEstablishment',
  metric: string,
): EstablishmentRankingItem[] {
  const payload = unwrapDashboardCharts(charts);
  const block = payload?.[source];
  if (!block?.categories?.length || !block.series?.length) return [];
  const totals = block.categories.map((_, i) =>
    block.series!.reduce((sum, series) => {
      const n = Number(series.data[i] ?? 0);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0),
  );
  return zipCategoryValues(block.categories, totals, metric);
}
