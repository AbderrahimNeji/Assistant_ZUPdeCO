import { CheckCircle2, MinusCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type BadgeVariant = 'ghost' | 'outlined' | 'solid' | 'active' | 'disabled' | 'on-hold';

/**
 * Configuration des statuts admin
 */
export interface AdminStatusConfig {
  label: string;
  icon: LucideIcon;
  badgeVariant: BadgeVariant;
  badgeColor?: string;
}

export const ADMIN_STATUS_CONFIG: Record<string, AdminStatusConfig> = {
  active: {
    label: 'Actif',
    icon: CheckCircle2,
    badgeVariant: 'active',
  },
  deactivated: {
    label: 'Désactivé',
    icon: MinusCircle,
    badgeVariant: 'disabled',
  },
};

/**
 * DEPRECATED: Les rôles sont maintenant dynamiques.
 * Utilisez useRoleConfig() depuis @/hooks/useRoleConfig
 */

export const ALL_FILTER_GROUP_IDS = [
  'filter-statut',
  'filter-etablissement',
  'filter-dates',
] as const;

export type FilterGroupId = (typeof ALL_FILTER_GROUP_IDS)[number];

export const FILTER_GROUP_LABELS: Record<FilterGroupId, string> = {
  'filter-statut': 'Statut',
  'filter-etablissement': 'Établissement',
  'filter-dates': 'Date de création',
};

export interface AdminFilters {
  statuses: string[];
  establishmentId?: string;
  dateRange?: 'all' | 'week' | 'month' | 'year';
  customDateFrom?: Date;
  customDateTo?: Date;
}

export const DEFAULT_ADMIN_FILTERS: AdminFilters = {
  statuses: [],
  establishmentId: undefined,
  dateRange: 'all',
  customDateFrom: undefined,
  customDateTo: undefined,
};

export { ITEMS_PER_PAGE, ITEMS_PER_PAGE_SECTION } from '@/lib/data-table-page-size';

export const filterAdmin = (
  admin: { status: string; userRoles?: Array<{ role: { code: string } }> },
  filters: AdminFilters,
): boolean => {
  if (filters.statuses.length > 0 && !filters.statuses.includes(admin.status)) {
    return false;
  }

  return true;
};
