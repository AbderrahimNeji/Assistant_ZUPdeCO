import { FileEdit, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { SessionReport, ReportStatus, ReportFilters } from '@/types/report.types';
import { getReportDisplayRating } from '@/utils/report-author-feedback';
import {
  SESSION_TYPE_CONFIG,
  SESSION_TYPE_FILTER_KEYS,
} from '@/components/sessions/session-configs';

export type { ReportFilters } from '@/types/report.types';
export { SESSION_TYPE_CONFIG, SESSION_TYPE_FILTER_KEYS };

type BadgeVariant = 'ghost' | 'outlined' | 'solid' | 'active' | 'disabled' | 'on-hold';

export interface ReportStatusConfig {
  label: string;
  icon: LucideIcon;
  badgeVariant: BadgeVariant;
  badgeColor?: string;
}

export const REPORT_STATUS_CONFIG: Record<ReportStatus, ReportStatusConfig> = {
  to_complete: {
    label: 'À saisir',
    icon: FileEdit,
    badgeVariant: 'on-hold',
    badgeColor: 'rgb(var(--status-pending))',
  },
  draft: {
    label: 'Brouillon',
    icon: FileEdit,
    badgeVariant: 'outlined',
    badgeColor: 'var(--color-1-nuance-1)',
  },
  submitted: {
    label: 'Soumis',
    icon: Send,
    badgeVariant: 'outlined',
    badgeColor: 'var(--color-2-nuance-1)',
  },
  validated: {
    label: 'Validé',
    icon: CheckCircle2,
    badgeVariant: 'active',
    badgeColor: 'rgb(var(--status-success))',
  },
  overdue: {
    label: 'En retard',
    icon: AlertCircle,
    badgeVariant: 'outlined',
    badgeColor: 'rgb(var(--color-error))',
  },
};

// ─── Default Filters ──────────────────────────────────────────────────────────

export const DEFAULT_REPORT_FILTERS: ReportFilters = {
  statuses: [],
  ratings: [],
  dateRange: 'month',
  customDateFrom: undefined,
  customDateTo: undefined,
  sessionTypes: [],
  establishmentIds: [],
  search: undefined,
};

// ─── Filter group IDs (for configure panel, align with sessions pattern) ─────

export type FilterGroupId =
  | 'filter-search'
  | 'filter-periode'
  | 'filter-date-range'
  | 'filter-statut'
  | 'filter-note'
  | 'filter-type-session'
  | 'filter-etablissement';

export const ALL_FILTER_GROUP_IDS: FilterGroupId[] = [
  'filter-search',
  'filter-periode',
  'filter-date-range',
  'filter-statut',
  'filter-note',
  'filter-type-session',
  'filter-etablissement',
];

/** Human-readable label per filter group, for the configure panel. */
export const FILTER_GROUP_LABELS: Record<FilterGroupId, string> = {
  'filter-search': 'Recherche participant',
  'filter-periode': 'Période',
  'filter-date-range': 'Date personnalisée',
  'filter-statut': 'Statut',
  'filter-note': 'Note',
  'filter-type-session': 'Type de séance',
  'filter-etablissement': 'Établissement',
};

export { ITEMS_PER_PAGE, ITEMS_PER_PAGE_SECTION } from '@/lib/data-table-page-size';

// ─── Date range filtering ─────────────────────────────────────────────────────

export const isReportInDateRange = (
  reportDate: Date,
  dateRange: ReportFilters['dateRange'],
): boolean => {
  if (dateRange === 'all') return true;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (dateRange) {
    case 'week': {
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 7);
      return reportDate >= startOfWeek && reportDate < endOfWeek;
    }
    case 'month': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return reportDate >= startOfMonth && reportDate <= endOfMonth;
    }
    case 'year': {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear(), 11, 31);
      return reportDate >= startOfYear && reportDate <= endOfYear;
    }
    default:
      return true;
  }
};

// ─── Report filtering function ────────────────────────────────────────────────

export const filterReport = (report: SessionReport, filters: ReportFilters): boolean => {
  if (filters.statuses.length > 0 && !filters.statuses.includes(report.status)) {
    return false;
  }
  if (filters.ratings.length > 0) {
    const rating = getReportDisplayRating(report);
    if (rating === null || !filters.ratings.includes(rating)) {
      return false;
    }
  }
  if (filters.sessionTypes && filters.sessionTypes.length > 0) {
    if (!filters.sessionTypes.includes(report.session?.type || '')) {
      return false;
    }
  }
  if (filters.establishmentIds && filters.establishmentIds.length > 0) {
    if (!filters.establishmentIds.includes(report.session?.establishment?.id || '')) {
      return false;
    }
  }
  const reportDate = new Date(report.createdAt);
  if (filters.customDateFrom || filters.customDateTo) {
    if (filters.customDateFrom && reportDate < filters.customDateFrom) return false;
    if (filters.customDateTo && reportDate > filters.customDateTo) return false;
    return true;
  }
  return isReportInDateRange(reportDate, filters.dateRange);
};
