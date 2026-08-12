import { BookOpen, GraduationCap, School, CheckCircle2, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type BadgeVariant = 'ghost' | 'outlined' | 'solid' | 'active' | 'disabled' | 'on-hold';

export interface SubjectCycleConfig {
  label: string;
  icon: LucideIcon;
  badgeVariant: BadgeVariant;
  badgeColor: string;
  colorName: 'color-1' | 'color-2' | 'color-3';
}

export interface SubjectStatusConfig {
  label: string;
  icon: LucideIcon;
  badgeVariant: BadgeVariant;
  badgeColor?: string;
}

/** Legacy / alternate spellings not used as API keys in {@link SUBJECT_CYCLE_CONFIG}. */
const EDUCATION_CYCLE_LABEL_FR_ALIASES: Record<string, string> = {
  primaire: 'Primaire',
  college: 'Collège',
  lycee: 'Lycée',
};

export function getEducationCycleLabelFr(cycle: string | null | undefined): string {
  if (!cycle) return '';
  const fromConfig = SUBJECT_CYCLE_CONFIG[cycle]?.label;
  if (fromConfig) return fromConfig;
  const key = cycle.trim().toLowerCase();
  return EDUCATION_CYCLE_LABEL_FR_ALIASES[key] ?? cycle;
}

export const SUBJECT_CYCLE_CONFIG: Record<string, SubjectCycleConfig> = {
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

export const SUBJECT_STATUS_CONFIG: Record<string, SubjectStatusConfig> = {
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

export interface SubjectFilters {
  cycles: string[];
  statuses: string[];
  isCore: boolean | null;
}

export const DEFAULT_SUBJECT_FILTERS: SubjectFilters = {
  cycles: [],
  statuses: [],
  isCore: null,
};

export const filterSubject = (
  subject: { educationCycle?: string | null; status: string; isCore: boolean },
  filters: SubjectFilters,
): boolean => {
  if (
    filters.cycles.length > 0 &&
    subject.educationCycle &&
    !filters.cycles.includes(subject.educationCycle)
  ) {
    return false;
  }
  if (filters.statuses.length > 0 && !filters.statuses.includes(subject.status)) {
    return false;
  }
  if (filters.isCore !== null && subject.isCore !== filters.isCore) {
    return false;
  }
  return true;
};

// ── Filter group IDs for RBAC & preferences ──────────────────────────────────

export type FilterGroupId = 'cycles' | 'statuses' | 'core';

export const ALL_FILTER_GROUP_IDS: FilterGroupId[] = ['cycles', 'statuses', 'core'];

export const FILTER_GROUP_LABELS: Record<FilterGroupId, string> = {
  cycles: 'Cycles éducatifs',
  statuses: 'Statuts',
  core: 'Type',
};

// ── Pagination DataTable (grille centralisée, incl. clé `auto` = `full`) ──────
export { ITEMS_PER_PAGE, ITEMS_PER_PAGE_SECTION } from '@/lib/data-table-page-size';
