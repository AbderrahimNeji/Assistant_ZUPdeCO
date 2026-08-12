import { Heart, Scale, History, UserRoundCog } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type BadgeVariant = 'ghost' | 'outlined' | 'solid' | 'active' | 'disabled' | 'on-hold';

export interface PairTypeConfig {
  label: string;
  icon: LucideIcon;
  badgeVariant: BadgeVariant;
  badgeColor: string;
}

// ─── Types de pairs (assignment source) ──────────────────────────────────────

export const PAIR_TYPE_CONFIG: Record<string, PairTypeConfig> = {
  manual: {
    label: 'Manuel',
    icon: UserRoundCog,
    badgeVariant: 'ghost',
    badgeColor: 'var(--color-2-nuance-1)',
  },
  auto_binome_coeur: {
    label: 'Binôme Cœur',
    icon: Heart,
    badgeVariant: 'ghost',
    badgeColor: 'rgb(var(--accent-red-core))',
  },
  auto_balanced: {
    label: 'Équilibré',
    icon: Scale,
    badgeVariant: 'ghost',
    badgeColor: 'var(--color-1-nuance-1)',
  },
  auto_history: {
    label: 'Historique',
    icon: History,
    badgeVariant: 'ghost',
    badgeColor: 'var(--color-3-nuance-1)',
  },
};

// ─── Filtres ──────────────────────────────────────────────────────────────────

export interface PairFilters {
  types: string[];
  tutorSearch?: string;
  studentSearch?: string;
  establishmentId?: string;
  subjectId?: string;
  /** Predefined period shortcut. Set to 'all' when customDateFrom/customDateTo are used. */
  dateRange: 'all' | 'today' | 'week' | 'month';
  /** Custom date range — mutually exclusive with dateRange != 'all'. */
  customDateFrom?: Date;
  customDateTo?: Date;
}

export const DEFAULT_PAIR_FILTERS: PairFilters = {
  types: [],
  dateRange: 'month',
  customDateFrom: undefined,
  customDateTo: undefined,
  tutorSearch: undefined,
  studentSearch: undefined,
  establishmentId: undefined,
  subjectId: undefined,
};

// ─── Filter group IDs (match interface_elements.element_id for pairs) ────────

export type PairFilterGroupId =
  | 'filter-type'
  | 'filter-tutor-search'
  | 'filter-student-search'
  | 'filter-etablissement'
  | 'filter-matiere'
  | 'filter-periode'
  | 'filter-date-range';

export const ALL_PAIR_FILTER_GROUP_IDS: PairFilterGroupId[] = [
  'filter-type',
  'filter-tutor-search',
  'filter-student-search',
  'filter-etablissement',
  'filter-matiere',
  'filter-periode',
  'filter-date-range',
];

export const PAIR_FILTER_GROUP_LABELS: Record<PairFilterGroupId, string> = {
  'filter-type': 'Type de matching',
  'filter-tutor-search': 'Recherche tuteur',
  'filter-student-search': 'Recherche élève',
  'filter-etablissement': 'Établissement',
  'filter-matiere': 'Matière',
  'filter-periode': 'Période',
  'filter-date-range': 'Date personnalisée',
};

// ─── Pagination DataTable (grille centralisée) ─────────────────────────────────
export { ITEMS_PER_PAGE, ITEMS_PER_PAGE_SECTION } from '@/lib/data-table-page-size';
