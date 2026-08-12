import { CheckCircle2, Archive, Ban } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type BadgeVariant = 'ghost' | 'outlined' | 'solid' | 'active' | 'disabled' | 'on-hold';

export interface SchoolYearStatusConfig {
  label: string;
  icon: LucideIcon;
  badgeVariant: BadgeVariant;
  badgeColor?: string;
}

export const SCHOOL_YEAR_STATUS_CONFIG: Record<string, SchoolYearStatusConfig> = {
  active: {
    label: 'Actif',
    icon: CheckCircle2,
    badgeVariant: 'active',
    badgeColor: 'rgb(var(--status-success))',
  },
  closed: {
    label: 'Clôturée',
    icon: Ban,
    badgeVariant: 'outlined',
    badgeColor: 'rgb(var(--color-error))',
  },
};

export interface SchoolYearFilters {
  statuses: string[];
  isCurrent: boolean | null;
  periodPhases: ('ended' | 'upcoming')[];
  searchQuery?: string;
  startDateFrom?: Date;
  startDateTo?: Date;
  endDateFrom?: Date;
  endDateTo?: Date;
}

export type FilterGroupId =
  | 'filter-statut'
  | 'filter-current'
  | 'filter-search'
  | 'filter-date-range';

export const DEFAULT_SCHOOL_YEAR_FILTERS: SchoolYearFilters = {
  statuses: [],
  isCurrent: null,
  periodPhases: [],
  searchQuery: '',
  startDateFrom: undefined,
  startDateTo: undefined,
  endDateFrom: undefined,
  endDateTo: undefined,
};

export const ALL_FILTER_GROUP_IDS: FilterGroupId[] = [
  'filter-statut',
  'filter-current',
  'filter-search',
  'filter-date-range',
];

export { ITEMS_PER_PAGE, ITEMS_PER_PAGE_SECTION } from '@/lib/data-table-page-size';

export const FILTER_GROUP_LABELS: Record<FilterGroupId, string> = {
  'filter-statut': 'Statut',
  'filter-current': 'Type',
  'filter-search': 'Recherche',
  'filter-date-range': 'Période',
};

export const filterSchoolYear = (
  schoolYear: { status: string; isCurrent: boolean; code: string; startDate: Date; endDate: Date },
  filters: SchoolYearFilters,
): boolean => {
  if (filters.statuses.length > 0 && !filters.statuses.includes(schoolYear.status)) {
    return false;
  }
  // Type filters (isCurrent + periodPhases) combined with OR
  const hasTypeFilters = filters.isCurrent !== null || filters.periodPhases.length > 0;
  if (hasTypeFilters) {
    let typeMatch = false;
    if (filters.isCurrent === true && schoolYear.isCurrent) typeMatch = true;
    if (!typeMatch && filters.periodPhases.length > 0) {
      const nowTs = Date.now();
      const startMs = new Date(schoolYear.startDate).getTime();
      const endMs = new Date(schoolYear.endDate).getTime();
      let actualPhase: 'upcoming' | 'active' | 'ended';
      if (nowTs < startMs) actualPhase = 'upcoming';
      else if (nowTs > endMs) actualPhase = 'ended';
      else actualPhase = 'active';
      if (filters.periodPhases.includes(actualPhase as 'ended' | 'upcoming')) typeMatch = true;
    }
    if (!typeMatch) return false;
  }

  const q = (filters.searchQuery ?? '').trim().toLowerCase();
  if (q && !schoolYear.code.toLowerCase().includes(q)) {
    return false;
  }
  if (filters.startDateFrom && new Date(schoolYear.startDate) < filters.startDateFrom) {
    return false;
  }
  if (filters.startDateTo && new Date(schoolYear.startDate) > filters.startDateTo) {
    return false;
  }
  if (filters.endDateFrom && new Date(schoolYear.endDate) < filters.endDateFrom) {
    return false;
  }
  if (filters.endDateTo && new Date(schoolYear.endDate) > filters.endDateTo) {
    return false;
  }
  return true;
};
