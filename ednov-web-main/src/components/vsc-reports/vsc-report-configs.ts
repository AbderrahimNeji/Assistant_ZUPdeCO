import { FileEdit, Send, CheckCircle2, CalendarDays, CalendarRange } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type {
  VscReport,
  VscReportStatus,
  VscReportCategory,
  VscReportFilters,
} from '@/types/vsc-report.types';

export type { VscReportFilters } from '@/types/vsc-report.types';

type BadgeVariant = 'ghost' | 'outlined' | 'solid' | 'active' | 'disabled' | 'on-hold';

export interface VscReportStatusConfig {
  label: string;
  icon: LucideIcon;
  badgeVariant: BadgeVariant;
  badgeColor?: string;
}

export interface VscReportCategoryConfig {
  label: string;
  icon: LucideIcon;
  badgeVariant: BadgeVariant;
  badgeColor: string;
}

/** Statuts affichés dans le groupe filtre « Statut » (sans brouillon). */
export const VSC_REPORT_STATUS_FILTER_KEYS: readonly Exclude<VscReportStatus, 'draft'>[] = [
  'to_fill',
  'submitted',
  'validated',
];

export const VSC_REPORT_STATUS_CONFIG: Record<VscReportStatus, VscReportStatusConfig> = {
  draft: {
    label: 'Brouillon',
    icon: FileEdit,
    badgeVariant: 'outlined',
    badgeColor: 'var(--color-1-nuance-1)',
  },
  to_fill: {
    label: 'À saisir',
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
  },
};

/**
 * Configuration des catégories de rapports VSC
 */
export const VSC_REPORT_CATEGORY_CONFIG: Record<VscReportCategory, VscReportCategoryConfig> = {
  daily: {
    label: 'Journalier',
    icon: CalendarDays,
    badgeVariant: 'outlined',
    badgeColor: 'var(--color-3-nuance-2)',
  },
  weekly: {
    label: 'Hebdomadaire',
    icon: CalendarRange,
    badgeVariant: 'outlined',
    badgeColor: 'rgb(var(--accent-purple))',
  },
};

export const DEFAULT_VSC_REPORT_FILTERS: VscReportFilters = {
  statuses: [],
  category: 'all',
  dateRange: 'month',
  customDateFrom: undefined,
  customDateTo: undefined,
  search: undefined,
};

/** Filtres par défaut pour la liste 100 % journalière (sans onglet séances). */
export const DEFAULT_VSC_DAILY_PAGE_FILTERS: VscReportFilters = {
  ...DEFAULT_VSC_REPORT_FILTERS,
  category: 'daily',
};

export type FilterGroupId =
  | 'filter-periode'
  | 'filter-date-range'
  | 'filter-category'
  | 'filter-statut'
  | 'filter-etablissement'
  | 'filter-search';

export const ALL_VSC_DAILY_FILTER_GROUP_IDS: FilterGroupId[] = [
  'filter-periode',
  'filter-date-range',
  'filter-statut',
  'filter-etablissement',
  'filter-search',
];

export const ALL_FILTER_GROUP_IDS: FilterGroupId[] = [
  'filter-periode',
  'filter-date-range',
  'filter-category',
  'filter-statut',
  'filter-etablissement',
  'filter-search',
];

export { ITEMS_PER_PAGE, ITEMS_PER_PAGE_SECTION } from '@/lib/data-table-page-size';

export const FILTER_GROUP_LABELS: Record<FilterGroupId, string> = {
  'filter-periode': 'Période',
  'filter-date-range': 'Date personnalisée',
  'filter-category': 'Catégorie',
  'filter-statut': 'Statut',
  'filter-etablissement': 'Établissement',
  'filter-search': 'Recherche nom VSC',
};

const isVscReportInDateRange = (
  reportDate: Date,
  dateRange: VscReportFilters['dateRange'],
): boolean => {
  if (dateRange === 'all') return true;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (dateRange) {
    case 'today': {
      const endOfToday = new Date(startOfToday);
      endOfToday.setDate(endOfToday.getDate() + 1);
      return reportDate >= startOfToday && reportDate < endOfToday;
    }
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

export const filterVscReport = (report: VscReport, filters: VscReportFilters): boolean => {
  if (filters.statuses.length > 0 && !filters.statuses.includes(report.status)) {
    return false;
  }

  if (filters.category !== 'all' && report.category !== filters.category) {
    return false;
  }

  return isVscReportInDateRange(new Date(report.createdAt), filters.dateRange);
};
