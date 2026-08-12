import { FileText, CheckCircle2, Clock, Ban } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type BadgeVariant = 'ghost' | 'outlined' | 'solid' | 'active' | 'disabled' | 'on-hold';

export interface ProgramStatusConfig {
  label: string;
  icon: LucideIcon;
  badgeVariant: BadgeVariant;
  badgeColor?: string;
}

export const PROGRAM_STATUS_CONFIG: Record<string, ProgramStatusConfig> = {
  draft: {
    label: 'Brouillon',
    icon: FileText,
    badgeVariant: 'outlined',
    badgeColor: 'var(--color-1-nuance-1)',
  },
  active: {
    label: 'Actif',
    icon: CheckCircle2,
    badgeVariant: 'active',
  },
  suspended: {
    label: 'Suspendu',
    icon: Clock,
    badgeVariant: 'outlined',
    badgeColor: 'var(--color-3-nuance-1)',
  },
  closed: {
    label: 'Clôturé',
    icon: Ban,
    badgeVariant: 'outlined',
    badgeColor: 'rgb(var(--color-error))',
  },
};

export type FilterGroupId = 'filter-statut' | 'filter-cycle' | 'filter-periode';

export interface ProgramFilters {
  statuses: string[];
  cycles: string[];
  periodes: string[];
  isActive?: boolean | null;
}

export const DEFAULT_PROGRAM_FILTERS: ProgramFilters = {
  statuses: [],
  cycles: [],
  periodes: [],
  isActive: null,
};

/** Aligné avec interface-elements (programs) — UI implémentée pour filter-statut dans ProgramFilters.tsx */
export const ALL_FILTER_GROUP_IDS: FilterGroupId[] = [
  'filter-statut',
  'filter-cycle',
  'filter-periode',
];

export { ITEMS_PER_PAGE, ITEMS_PER_PAGE_SECTION } from '@/lib/data-table-page-size';

export const FILTER_GROUP_LABELS: Record<FilterGroupId, string> = {
  'filter-statut': 'Statut',
  'filter-cycle': 'Cycle',
  'filter-periode': 'Période',
};

export const filterProgram = (program: { status: string }, filters: ProgramFilters): boolean => {
  if (filters.statuses.length > 0 && !filters.statuses.includes(program.status)) {
    return false;
  }
  return true;
};
