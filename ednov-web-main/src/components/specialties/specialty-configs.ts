import { CheckCircle2, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type BadgeVariant = 'ghost' | 'outlined' | 'solid' | 'active' | 'disabled' | 'on-hold';

export interface SpecialtyStatusConfig {
  label: string;
  icon: LucideIcon;
  badgeVariant: BadgeVariant;
  badgeColor?: string;
}

export interface SpecialtyFilters {
  statuses: string[];
  searchTerm?: string;
}

export type FilterGroupId = 'filter-statut' | 'filter-search';

// ─── Status config ──────────────────────────────────────────────────────────

export const SPECIALTY_STATUS_CONFIG: Record<string, SpecialtyStatusConfig> = {
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

// ─── Default filters ────────────────────────────────────────────────────────

export const DEFAULT_SPECIALTY_FILTERS: SpecialtyFilters = {
  statuses: [],
  searchTerm: undefined,
};

// ─── Filter group IDs ───────────────────────────────────────────────────────

export const ALL_FILTER_GROUP_IDS: FilterGroupId[] = ['filter-statut', 'filter-search'];

export const FILTER_GROUP_LABELS: Record<FilterGroupId, string> = {
  'filter-statut': 'Statut',
  'filter-search': 'Recherche',
};

export { ITEMS_PER_PAGE, ITEMS_PER_PAGE_SECTION } from '@/lib/data-table-page-size';
