import {
  BookOpen,
  User,
  Users,
  CheckCircle2,
  Circle,
  XCircle,
  Clock4,
  GraduationCap,
  UsersRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { SessionStatus } from '@/types/session.types';

type BadgeVariant = 'ghost' | 'outlined' | 'solid' | 'active' | 'disabled' | 'on-hold';

export interface SessionTypeConfig {
  label: string;
  icon: LucideIcon;
  badgeVariant: BadgeVariant;
  badgeColor: string;
  colorName: 'color-1' | 'color-2' | 'color-3';
}

export interface SessionStatusConfig {
  label: string;
  icon: LucideIcon;
  badgeVariant: BadgeVariant;
  badgeColor: string;
  /** 'solid' pour IN_PROGRESS (filtre actif = fond plein) */
  filterActiveVariant?: 'solid';
  /** true pour "En cours" : dot rouge clignotant */
  isInProgress?: boolean;
}

// ─── Types de séances ────────────────────────────────────────────────────────

export const SESSION_TYPE_CONFIG: Record<string, SessionTypeConfig> = {
  homework_help: {
    label: 'Aide aux devoirs',
    icon: BookOpen,
    badgeVariant: 'ghost',
    badgeColor: 'var(--color-2-nuance-1)',
    colorName: 'color-2',
  },
  individual_tutoring: {
    label: 'Tutorat individuel',
    icon: User,
    badgeVariant: 'ghost',
    badgeColor: 'var(--color-1-nuance-1)',
    colorName: 'color-1',
  },
  workshop: {
    label: 'Atelier',
    icon: Users,
    badgeVariant: 'ghost',
    badgeColor: 'var(--color-3-nuance-2)',
    colorName: 'color-3',
  },
  whole_class: {
    label: 'Classe entière',
    icon: GraduationCap,
    badgeVariant: 'ghost',
    badgeColor: 'rgb(var(--accent-purple))',
    colorName: 'color-2',
  },
  group_tutoring: {
    label: 'Tutorat',
    icon: UsersRound,
    badgeVariant: 'ghost',
    badgeColor: 'var(--color-1-nuance-2)',
    colorName: 'color-1',
  },
};

/** Types proposés dans les filtres (liste séances, rapports, etc.) — pas de « Autre ». */
export const SESSION_TYPE_FILTER_KEYS = [
  'homework_help',
  'individual_tutoring',
  'workshop',
  'whole_class',
  'group_tutoring',
] as const;

/** Libellés FR pour les types de récurrence (API, matching, formulaires). */
export const SESSION_RECURRENCE_LABELS: Record<string, string> = {
  daily: 'Quotidienne',
  weekly: 'Hebdomadaire',
  several_days_per_week: 'Plusieurs jours / semaine',
  biweekly: 'Bi-hebdomadaire',
  monthly: 'Mensuelle',
  custom: 'Personnalisée',
  ab: 'Bi-mensuelle (A/B)',
};

// ─── Statuts de séances ──────────────────────────────────────────────────────

export const SESSION_STATUS_CONFIG: Record<SessionStatus, SessionStatusConfig> = {
  PLANNED: {
    label: 'Planifiée',
    icon: Clock4,
    badgeVariant: 'outlined',
    badgeColor: 'var(--color-2-nuance-1)',
  },
  IN_PROGRESS: {
    label: 'En cours',
    icon: Circle,
    badgeVariant: 'outlined',
    badgeColor: 'rgb(var(--color-error))',
    filterActiveVariant: 'solid',
    isInProgress: true,
  },
  COMPLETED: {
    label: 'Terminée',
    icon: CheckCircle2,
    badgeVariant: 'outlined',
    badgeColor: 'rgb(var(--status-success))',
  },
  CLOSED: {
    label: 'Clôturée',
    icon: CheckCircle2,
    badgeVariant: 'outlined',
    badgeColor: 'rgb(var(--accent-purple))',
  },
  CANCELLED: {
    label: 'Annulée',
    icon: XCircle,
    badgeVariant: 'outlined',
    badgeColor: 'rgb(var(--color-error))',
  },
};

export interface SessionFilters {
  types: string[];
  statuses: string[];
  /** Predefined period shortcut. Set to 'all' when customDateFrom/customDateTo are used. */
  dateRange: 'all' | 'today' | 'week' | 'month';
  /** Custom date range — mutually exclusive with dateRange != 'all'. */
  customDateFrom?: Date;
  customDateTo?: Date;
  establishmentId?: string;
  subjectId?: string;
  levelId?: string;
  search?: string;
  recurrenceType?: string;
}

export const DEFAULT_SESSION_FILTERS: SessionFilters = {
  types: [],
  statuses: [],
  dateRange: 'month',
  customDateFrom: undefined,
  customDateTo: undefined,
  establishmentId: undefined,
  subjectId: undefined,
  levelId: undefined,
  search: undefined,
  recurrenceType: undefined,
};

// ─── Filter group IDs (match interface_elements.element_id for sessions) ──────

export type FilterGroupId =
  | 'filter-periode'
  | 'filter-date-range'
  | 'filter-type'
  | 'filter-statut'
  | 'filter-etablissement'
  | 'filter-matiere'
  | 'filter-level'
  | 'filter-search'
  | 'filter-recurrence';

export const ALL_FILTER_GROUP_IDS: FilterGroupId[] = [
  'filter-periode',
  'filter-date-range',
  'filter-type',
  'filter-statut',
  'filter-etablissement',
  'filter-matiere',
  'filter-level',
  'filter-search',
  'filter-recurrence',
];

export const isSessionInDateRange = (
  sessionDate: Date,
  dateRange: SessionFilters['dateRange'],
): boolean => {
  if (dateRange === 'all') return true;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (dateRange) {
    case 'today': {
      const endOfToday = new Date(startOfToday);
      endOfToday.setDate(endOfToday.getDate() + 1);
      return sessionDate >= startOfToday && sessionDate < endOfToday;
    }
    case 'week': {
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 7);
      return sessionDate >= startOfWeek && sessionDate < endOfWeek;
    }
    case 'month': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return sessionDate >= startOfMonth && sessionDate <= endOfMonth;
    }
    default:
      return true;
  }
};

export const filterSession = (
  session: { type: string; status: string; sessionDate: Date },
  filters: SessionFilters,
): boolean => {
  if (filters.types.length > 0 && !filters.types.includes(session.type)) {
    return false;
  }
  if (filters.statuses.length > 0 && !filters.statuses.includes(session.status)) {
    return false;
  }
  return isSessionInDateRange(new Date(session.sessionDate), filters.dateRange);
};

// ─── Pagination DataTable (grille centralisée) ─────────────────────────────────
export { ITEMS_PER_PAGE, ITEMS_PER_PAGE_SECTION } from '@/lib/data-table-page-size';

// ─── Filter group labels ──────────────────────────────────────────────────────

/** Human-readable label per filter group, for the configure panel. */
export const FILTER_GROUP_LABELS: Record<FilterGroupId, string> = {
  'filter-periode': 'Période',
  'filter-date-range': 'Date personnalisée',
  'filter-type': 'Type',
  'filter-statut': 'Statut',
  'filter-etablissement': 'Établissement',
  'filter-matiere': 'Matière',
  'filter-level': 'Niveau',
  'filter-search': 'Recherche participant',
  'filter-recurrence': 'Récurrence',
};
