import { Shield, CheckCircle2, XCircle, Users, UserCog, Monitor } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type BadgeVariant = 'ghost' | 'outlined' | 'solid' | 'active' | 'disabled' | 'on-hold';

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface RoleModeConfig {
  label: string;
  icon: LucideIcon;
  badgeVariant: BadgeVariant;
  badgeColor: string;
}

export interface RoleStatusConfig {
  label: string;
  icon: LucideIcon;
  badgeVariant: BadgeVariant;
  badgeColor?: string;
}

export interface RoleFilters {
  roleGroups: string[];
  statuses: ('active' | 'inactive')[];
  modes: ('in_person' | 'remote' | 'hybrid')[];
  searchTerm?: string;
  minHierarchyLevel?: number;
  maxHierarchyLevel?: number;
}

export type FilterGroupId =
  | 'filter-role-groups'
  | 'filter-statut'
  | 'filter-modes'
  | 'filter-hierarchy'
  | 'filter-search';

// ─── Role Mode Configuration ───────────────────────────────────────────────────

export const ROLE_MODE_CONFIG: Record<string, RoleModeConfig> = {
  in_person: {
    label: 'Présentiel',
    icon: Users,
    badgeVariant: 'outlined',
    badgeColor: 'var(--color-2-nuance-1)',
  },
  remote: {
    label: 'Distanciel',
    icon: Monitor,
    badgeVariant: 'outlined',
    badgeColor: 'var(--color-3-nuance-1)',
  },
  hybrid: {
    label: 'Hybride',
    icon: UserCog,
    badgeVariant: 'outlined',
    badgeColor: 'var(--color-1-nuance-1)',
  },
};

// ─── Role Status Configuration ─────────────────────────────────────────────────

export const ROLE_STATUS_CONFIG: Record<string, RoleStatusConfig> = {
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

export const DEFAULT_ROLE_FILTERS: RoleFilters = {
  roleGroups: [],
  statuses: [],
  modes: [],
  searchTerm: undefined,
  minHierarchyLevel: undefined,
  maxHierarchyLevel: undefined,
};

// ─── Filter group IDs (for RBAC and configure panel) ──────────────────────────

export const ALL_FILTER_GROUP_IDS: FilterGroupId[] = [
  'filter-role-groups',
  'filter-statut',
  'filter-modes',
  'filter-hierarchy',
  'filter-search',
];

// ─── Filter group labels ───────────────────────────────────────────────────────

export const FILTER_GROUP_LABELS: Record<FilterGroupId, string> = {
  'filter-role-groups': 'Familles de rôles',
  'filter-statut': 'Statut',
  'filter-modes': 'Modes opérationnels',
  'filter-hierarchy': 'Niveaux hiérarchiques',
  'filter-search': 'Recherche',
};

export { ITEMS_PER_PAGE, ITEMS_PER_PAGE_SECTION } from '@/lib/data-table-page-size';

// ─── Role filtering function ───────────────────────────────────────────────────

export const filterRole = (
  role: {
    roleGroup?: string | null;
    status: string;
    mode?: string | null;
    code?: string;
    label?: string;
    hierarchyLevel?: number | null;
  },
  filters: RoleFilters,
): boolean => {
  if (
    filters.roleGroups.length > 0 &&
    role.roleGroup &&
    !filters.roleGroups.includes(role.roleGroup)
  ) {
    return false;
  }
  if (filters.statuses.length > 0 && !filters.statuses.includes(role.status as any)) {
    return false;
  }
  if (filters.modes.length > 0 && role.mode && !filters.modes.includes(role.mode as any)) {
    return false;
  }
  if (filters.searchTerm) {
    const term = filters.searchTerm.toLowerCase();
    const matchesCode = role.code?.toLowerCase().includes(term);
    const matchesLabel = role.label?.toLowerCase().includes(term);
    if (!matchesCode && !matchesLabel) {
      return false;
    }
  }
  if (
    filters.minHierarchyLevel !== undefined &&
    role.hierarchyLevel !== null &&
    role.hierarchyLevel !== undefined &&
    role.hierarchyLevel < filters.minHierarchyLevel
  ) {
    return false;
  }
  if (
    filters.maxHierarchyLevel !== undefined &&
    role.hierarchyLevel !== null &&
    role.hierarchyLevel !== undefined &&
    role.hierarchyLevel > filters.maxHierarchyLevel
  ) {
    return false;
  }
  return true;
};
