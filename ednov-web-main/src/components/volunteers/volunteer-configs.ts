import { CheckCircle2, MinusCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type BadgeVariant = 'ghost' | 'outlined' | 'solid' | 'active' | 'disabled' | 'on-hold';

/** Toggle "Configuration des rapports VSC" in create/edit VSC forms (payload fields stay in code paths). */
export const SHOW_VSC_REPORTS_FREQUENCY_FORM_SECTION = false;

// ══════════════════════════════════════════════════════
// CONFIGURATIONS GENRE
// ══════════════════════════════════════════════════════

const VOLUNTEER_GENDER_LABELS: Record<string, string> = {
  M: 'Homme',
  H: 'Homme',
  F: 'Femme',
  O: 'Autre',
};

/** Plain label for detail text; null if no gender set. */
export function getVolunteerGenderLabel(gender: string | null | undefined): string | null {
  if (gender == null || String(gender).trim() === '') return null;
  return VOLUNTEER_GENDER_LABELS[String(gender).trim().toUpperCase()] ?? null;
}

/**
 * Configuration des statuts bénévoles
 */
export interface VolunteerStatusConfig {
  label: string;
  icon: LucideIcon;
  badgeVariant: BadgeVariant;
  badgeColor?: string; // Absent pour types sémantiques
}

export const VOLUNTEER_STATUS_CONFIG: Record<string, VolunteerStatusConfig> = {
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

export interface VolunteerFilters {
  statuses: string[];
  subjects: string[];
  availability?: string[];
  establishmentId?: string;
  dateRange?: 'all' | 'week' | 'month' | 'year';
  customDateFrom?: Date;
  customDateTo?: Date;
  entryDateFrom?: string;
  entryDateTo?: string;
  engagementStartDateFrom?: string;
  engagementStartDateTo?: string;
  exitDateFrom?: string;
  exitDateTo?: string;
  exitReason?: string;
}

export const DEFAULT_VOLUNTEER_FILTERS: VolunteerFilters = {
  statuses: [],
  subjects: [],
  availability: [],
  establishmentId: undefined,
  dateRange: 'all',
  customDateFrom: undefined,
  customDateTo: undefined,
  entryDateFrom: undefined,
  entryDateTo: undefined,
  engagementStartDateFrom: undefined,
  engagementStartDateTo: undefined,
  exitDateFrom: undefined,
  exitDateTo: undefined,
  exitReason: undefined,
};

// ─── Filter group IDs (match interface_elements.element_id for volunteers) ───

export type FilterGroupId =
  | 'filter-statut'
  | 'filter-matiere'
  | 'filter-disponibilite'
  | 'filter-etablissement'
  | 'filter-dates'
  | 'filter-date-entree'
  | 'filter-date-sortie'
  | 'filter-motif-sortie';

export const ALL_FILTER_GROUP_IDS: FilterGroupId[] = [
  'filter-statut',
  'filter-matiere',
  'filter-disponibilite',
  'filter-etablissement',
  'filter-dates',
  'filter-date-entree',
  'filter-date-sortie',
  'filter-motif-sortie',
];

export { ITEMS_PER_PAGE, ITEMS_PER_PAGE_SECTION } from '@/lib/data-table-page-size';

// ─── Filter group labels ──────────────────────────────────────────────────────

/** Human-readable label per filter group, for the configure panel. */
export const FILTER_GROUP_LABELS: Record<FilterGroupId, string> = {
  'filter-statut': 'Statut',
  'filter-matiere': 'Matière',
  'filter-disponibilite': 'Disponibilité',
  'filter-etablissement': 'Établissement',
  'filter-dates': 'Date de création',
  'filter-date-entree': "Date d'entrée",
  'filter-date-sortie': 'Date de sortie',
  'filter-motif-sortie': 'Motif de sortie',
};

export const filterVolunteer = (
  volunteer: {
    status: string;
    userProfiles?: Array<{ subjects?: unknown[] | null; subjectNames?: string[] | null }>;
  },
  filters: VolunteerFilters,
): boolean => {
  if (filters.statuses.length > 0 && !filters.statuses.includes(volunteer.status)) {
    return false;
  }

  if (filters.subjects.length > 0) {
    const volunteerSubjects = volunteer.userProfiles?.[0]?.subjects || [];
    const hasSubject = filters.subjects.some((subjectId) =>
      volunteerSubjects.some((s: any) => (typeof s === 'string' ? s : s?.id) === subjectId),
    );
    if (!hasSubject) return false;
  }

  return true;
};
