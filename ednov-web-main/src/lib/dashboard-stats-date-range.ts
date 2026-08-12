/**
 * Même logique que {@link SessionsDataTable} pour dériver dateFrom/dateTo,
 * puis format YYYY-MM-DD (fuseau local) pour GET /dashboard/stats.
 */
export type DashboardStatsPeriod = 'all' | 'today' | 'week' | 'month';

export type ComparisonPeriod =
  | 'none'
  | 'previous_week'
  | 'previous_month'
  | 'previous_quarter'
  | 'previous_year';

/** Valeurs acceptées par le paramètre `compare` de l'API backend */
export type ApiComparePeriod = 'week' | 'month' | 'year' | 'trim';

export interface DashboardStatsDateFilterState {
  dateRange: DashboardStatsPeriod;
  customDateFrom?: Date;
  customDateTo?: Date;
  establishmentIds?: string[];
  comparisonPeriod: ComparisonPeriod;
}

export const DEFAULT_DASHBOARD_STATS_DATE_FILTERS: DashboardStatsDateFilterState = {
  dateRange: 'all',
  customDateFrom: undefined,
  customDateTo: undefined,
  establishmentIds: undefined,
  comparisonPeriod: 'none',
};

/** Mappe la période de comparaison UI vers le paramètre `compare` de l'API. */
function mapComparisonToApiParam(comparisonPeriod: ComparisonPeriod): ApiComparePeriod | undefined {
  switch (comparisonPeriod) {
    case 'previous_week':
      return 'week';
    case 'previous_month':
      return 'month';
    case 'previous_quarter':
      return 'trim';
    case 'previous_year':
      return 'year';
    default:
      return undefined;
  }
}

function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Query API dashboard/stats (dateFrom / dateTo optionnels). */
export function buildDashboardStatsDateQuery(filters: DashboardStatsDateFilterState):
  | {
      dateFrom?: string;
      dateTo?: string;
      establishmentIds?: string[];
      compare?: ApiComparePeriod;
    }
  | undefined {
  let dateFrom: Date | undefined;
  let dateTo: Date | undefined;
  const compare = mapComparisonToApiParam(filters.comparisonPeriod);

  if (filters.customDateFrom || filters.customDateTo) {
    dateFrom = filters.customDateFrom;
    dateTo = filters.customDateTo;
  } else if (filters.dateRange === 'all') {
    const out: { establishmentIds?: string[]; compare?: ApiComparePeriod } = {};
    if (filters.establishmentIds && filters.establishmentIds.length > 0) {
      out.establishmentIds = filters.establishmentIds;
    }
    if (compare) {
      out.compare = compare;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  } else {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (filters.dateRange) {
      case 'today':
        dateFrom = startOfToday;
        dateTo = new Date(startOfToday);
        dateTo.setDate(dateTo.getDate() + 1);
        break;
      case 'week':
        dateFrom = new Date(startOfToday);
        dateFrom.setDate(dateFrom.getDate() - 7);
        dateTo = new Date(startOfToday);
        dateTo.setDate(dateTo.getDate() + 1);
        break;
      case 'month':
        dateFrom = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      default:
        break;
    }
  }

  const out: {
    dateFrom?: string;
    dateTo?: string;
    establishmentIds?: string[];
    compare?: ApiComparePeriod;
  } = {};
  if (dateFrom) out.dateFrom = toLocalDateString(dateFrom);
  if (dateTo) out.dateTo = toLocalDateString(dateTo);
  if (filters.establishmentIds && filters.establishmentIds.length > 0) {
    out.establishmentIds = filters.establishmentIds;
  }
  if (compare) {
    out.compare = compare;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
