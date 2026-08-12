import { CheckCircle2, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type BadgeVariant = 'ghost' | 'outlined' | 'solid' | 'active' | 'disabled' | 'on-hold';

/**
 * Configuration des statuts types d'activité
 */
export interface ActivityTypeStatusConfig {
  label: string;
  icon: LucideIcon;
  badgeVariant: BadgeVariant;
  badgeColor?: string;
}

export const ACTIVITY_TYPE_STATUS_CONFIG: Record<string, ActivityTypeStatusConfig> = {
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

export interface ActivityTypeFilters {
  statuses: string[];
  searchQuery?: string;
}

export const DEFAULT_ACTIVITY_TYPE_FILTERS: ActivityTypeFilters = {
  statuses: [],
  searchQuery: '',
};

export type FilterGroupId = 'filter-statut' | 'filter-search';

export const ALL_FILTER_GROUP_IDS: FilterGroupId[] = ['filter-statut', 'filter-search'];

export const FILTER_GROUP_LABELS: Record<FilterGroupId, string> = {
  'filter-statut': 'Statut',
  'filter-search': 'Recherche',
};

export const filterActivityType = (
  activityType: { status: string; code: string; label: string },
  filters: ActivityTypeFilters,
): boolean => {
  if (filters.statuses.length > 0 && !filters.statuses.includes(activityType.status)) {
    return false;
  }
  const q = (filters.searchQuery ?? '').trim().toLowerCase();
  if (q) {
    const hay = `${activityType.code} ${activityType.label}`.toLowerCase();
    if (!hay.includes(q)) {
      return false;
    }
  }
  return true;
};

export { ITEMS_PER_PAGE, ITEMS_PER_PAGE_SECTION } from '@/lib/data-table-page-size';
