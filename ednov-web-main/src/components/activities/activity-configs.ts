import { CheckCircle2, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Activity } from '@/types/activity.types';

type BadgeVariant = 'ghost' | 'outlined' | 'solid' | 'active' | 'disabled' | 'on-hold';

export interface ActivityStatusConfig {
  label: string;
  icon: LucideIcon;
  badgeVariant: BadgeVariant;
  badgeColor?: string;
}

export const ACTIVITY_STATUS_CONFIG: Record<string, ActivityStatusConfig> = {
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

export interface ActivityFilters {
  statuses: string[];
  activityTypeIds: string[];
  searchQuery?: string;
  hasChat?: boolean | null;
  hasBot?: boolean | null;
  hasLink?: boolean | null;
  canHaveCr?: boolean | null;
}

export const DEFAULT_ACTIVITY_FILTERS: ActivityFilters = {
  statuses: [],
  activityTypeIds: [],
  searchQuery: '',
  hasChat: null,
  hasBot: null,
  hasLink: null,
  canHaveCr: null,
};

export type ActivityFilterGroupId =
  | 'filter-statut'
  | 'filter-type-activity'
  | 'filter-search'
  | 'filter-features';

export const ALL_ACTIVITY_FILTER_GROUP_IDS: ActivityFilterGroupId[] = [
  'filter-statut',
  'filter-type-activity',
  'filter-search',
  'filter-features',
];

export { ITEMS_PER_PAGE, ITEMS_PER_PAGE_SECTION } from '@/lib/data-table-page-size';

export const FILTER_GROUP_LABELS_ACTIVITIES: Record<ActivityFilterGroupId, string> = {
  'filter-statut': 'Statut',
  'filter-type-activity': "Type d'activité",
  'filter-search': 'Recherche',
  'filter-features': 'Fonctionnalités',
};

export const filterActivity = (
  activity: { status: string; activityTypeId: string },
  filters: ActivityFilters,
): boolean => {
  if (filters.statuses.length > 0 && !filters.statuses.includes(activity.status)) {
    return false;
  }
  if (
    filters.activityTypeIds.length > 0 &&
    !filters.activityTypeIds.includes(activity.activityTypeId)
  ) {
    return false;
  }
  return true;
};

/** Dashboard / export: show em dash when no cap is set. */
export function formatActivityMaxCell(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return String(value);
}

/** Active options as a short French list (matches detail view wording). */
export function formatActivityOptionsCell(
  activity: Pick<Activity, 'canHasCr' | 'bot' | 'withLink' | 'chat'>,
): string {
  const parts: string[] = [];
  if (activity.canHasCr) parts.push('Compte rendu');
  if (activity.bot) parts.push('Bot');
  if (activity.withLink) parts.push('Lien');
  if (activity.chat) parts.push('Chat');
  return parts.length ? parts.join(', ') : '—';
}
