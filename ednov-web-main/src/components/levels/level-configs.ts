import { School, BookOpen, GraduationCap, CheckCircle2, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type BadgeVariant = 'ghost' | 'outlined' | 'solid' | 'active' | 'disabled' | 'on-hold';

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface LevelCycleConfig {
  label: string;
  icon: LucideIcon;
  badgeVariant: BadgeVariant;
  badgeColor: string;
  colorName: 'color-1' | 'color-2' | 'color-3';
}

export interface LevelStatusConfig {
  label: string;
  icon: LucideIcon;
  badgeVariant: BadgeVariant;
  badgeColor?: string;
}

export interface LevelFilters {
  cycles: string[];
  statuses: string[];
  searchTerm?: string;
  minAge?: number;
  maxAge?: number;
}

export type FilterGroupId = 'filter-cycle' | 'filter-statut' | 'filter-search' | 'filter-age-range';

// ─── Level Cycle Configuration ────────────────────────────────────────────────

export const LEVEL_CYCLE_CONFIG: Record<string, LevelCycleConfig> = {
  primary: {
    label: 'Primaire',
    icon: School,
    badgeVariant: 'outlined',
    badgeColor: 'var(--color-2-nuance-1)',
    colorName: 'color-2',
  },
  middle: {
    label: 'Collège',
    icon: BookOpen,
    badgeVariant: 'outlined',
    badgeColor: 'var(--color-1-nuance-1)',
    colorName: 'color-1',
  },
  high: {
    label: 'Lycée',
    icon: GraduationCap,
    badgeVariant: 'outlined',
    badgeColor: 'var(--color-3-nuance-1)',
    colorName: 'color-3',
  },
};

// ─── Level Status Configuration ────────────────────────────────────────────────

export const LEVEL_STATUS_CONFIG: Record<string, LevelStatusConfig> = {
  active: {
    label: 'Actif',
    icon: CheckCircle2,
    badgeVariant: 'active',
  },
  inactive: {
    label: 'Inactif',
    icon: XCircle,
    badgeVariant: 'outlined',
    badgeColor: 'rgb(var(--color-error))',
  },
};

// ─── Default Filters ───────────────────────────────────────────────────────────

export const DEFAULT_LEVEL_FILTERS: LevelFilters = {
  cycles: [],
  statuses: [],
  searchTerm: undefined,
  minAge: undefined,
  maxAge: undefined,
};

// ─── Filter group IDs (for RBAC and configure panel) ──────────────────────────

export const ALL_FILTER_GROUP_IDS: FilterGroupId[] = [
  'filter-cycle',
  'filter-statut',
  'filter-search',
  'filter-age-range',
];

// ─── Filter group labels ───────────────────────────────────────────────────────

export const FILTER_GROUP_LABELS: Record<FilterGroupId, string> = {
  'filter-cycle': 'Cycle',
  'filter-statut': 'Statut',
  'filter-search': 'Recherche',
  'filter-age-range': "Tranche d'âge",
};

export { ITEMS_PER_PAGE, ITEMS_PER_PAGE_SECTION } from '@/lib/data-table-page-size';

// ─── Level filtering function ──────────────────────────────────────────────────

export const filterLevel = (
  level: {
    educationCycle?: string | null;
    status: string;
    code?: string;
    label?: string;
    minAge?: number | null;
    maxAge?: number | null;
  },
  filters: LevelFilters,
): boolean => {
  if (
    filters.cycles.length > 0 &&
    level.educationCycle &&
    !filters.cycles.includes(level.educationCycle)
  ) {
    return false;
  }
  if (filters.statuses.length > 0 && !filters.statuses.includes(level.status)) {
    return false;
  }
  if (filters.searchTerm) {
    const term = filters.searchTerm.toLowerCase();
    const matchesCode = level.code?.toLowerCase().includes(term);
    const matchesLabel = level.label?.toLowerCase().includes(term);
    if (!matchesCode && !matchesLabel) {
      return false;
    }
  }
  if (filters.minAge !== undefined && level.minAge !== null && level.minAge < filters.minAge) {
    return false;
  }
  if (filters.maxAge !== undefined && level.maxAge !== null && level.maxAge > filters.maxAge) {
    return false;
  }
  return true;
};
