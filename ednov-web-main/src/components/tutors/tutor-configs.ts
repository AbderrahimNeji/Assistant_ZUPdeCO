import { CheckCircle2, MinusCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type BadgeVariant = 'ghost' | 'outlined' | 'solid' | 'active' | 'disabled' | 'on-hold';

/**
 * Configuration des statuts tuteurs
 */
export interface TutorStatusConfig {
  label: string;
  icon: LucideIcon;
  badgeVariant: BadgeVariant;
  badgeColor?: string; // Absent pour types sémantiques
}

// ══════════════════════════════════════════════════════
// CONFIGURATIONS GENRE
// ══════════════════════════════════════════════════════

const TUTOR_GENDER_LABELS: Record<string, string> = {
  M: 'Homme',
  H: 'Homme',
  F: 'Femme',
  O: 'Autre',
};

/** Plain label for detail text; null if no gender set. */
export function getTutorGenderLabel(gender: string | null | undefined): string | null {
  if (gender == null || String(gender).trim() === '') return null;
  return TUTOR_GENDER_LABELS[String(gender).trim().toUpperCase()] ?? null;
}

export const TUTOR_STATUS_CONFIG: Record<string, TutorStatusConfig> = {
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

export interface TutorFilters {
  statuses: string[];
  subjects: string[];
  establishmentId?: string;
  /** Day keys e.g. monday, tuesday; multiple selection (OR) */
  disponibilite: string[];
  experienceRange?: { min?: number; max?: number };
  engagementStartDateFrom?: string;
  engagementStartDateTo?: string;
  exitDateFrom?: string;
  exitDateTo?: string;
  exitReason?: string;
}

export const DEFAULT_TUTOR_FILTERS: TutorFilters = {
  statuses: [],
  subjects: [],
  establishmentId: undefined,
  disponibilite: [],
  experienceRange: undefined,
  engagementStartDateFrom: undefined,
  engagementStartDateTo: undefined,
  exitDateFrom: undefined,
  exitDateTo: undefined,
  exitReason: undefined,
};

/** Maps filter chip keys to API `availabilityDays` (0=Sunday .. 6=Saturday). */
export const TUTOR_DAY_KEY_TO_AVAILABILITY_API: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export function tutorDisponibiliteKeysToAvailabilityDays(
  keys: string[] | string | undefined,
): number[] {
  const list = Array.isArray(keys) ? keys : typeof keys === 'string' ? [keys] : [];
  const set = new Set<number>();
  for (const k of list) {
    const n = TUTOR_DAY_KEY_TO_AVAILABILITY_API[k];
    if (n !== undefined) set.add(n);
  }
  return [...set].sort((a, b) => a - b);
}

export type FilterGroupId =
  | 'filter-statut'
  | 'filter-matiere'
  | 'filter-etablissement'
  | 'filter-disponibilite'
  | 'filter-experience'
  | 'filter-date-entree'
  | 'filter-date-sortie'
  | 'filter-motif-sortie';

export const ALL_FILTER_GROUP_IDS: FilterGroupId[] = [
  'filter-statut',
  'filter-matiere',
  'filter-etablissement',
  'filter-disponibilite',
  'filter-experience',
  'filter-date-entree',
  'filter-date-sortie',
  'filter-motif-sortie',
];

export const FILTER_GROUP_LABELS: Record<FilterGroupId, string> = {
  'filter-statut': 'Statut',
  'filter-matiere': 'Matières',
  'filter-etablissement': 'Établissement',
  'filter-disponibilite': 'Disponibilité',
  'filter-experience': 'Expérience',
  'filter-date-entree': "Date d'entrée",
  'filter-date-sortie': 'Date de sortie',
  'filter-motif-sortie': 'Motif de sortie',
};

export { ITEMS_PER_PAGE, ITEMS_PER_PAGE_SECTION } from '@/lib/data-table-page-size';

export const filterTutor = (
  tutor: { status: string; userProfiles?: Array<{ subjects?: unknown[] | null }> },
  filters: TutorFilters,
): boolean => {
  if (filters.statuses.length > 0 && !filters.statuses.includes(tutor.status)) {
    return false;
  }

  if (filters.subjects.length > 0) {
    const tutorSubjects = tutor.userProfiles?.[0]?.subjects || [];
    const hasSubject = filters.subjects.some((subjectId) =>
      tutorSubjects.some((s: any) => (typeof s === 'string' ? s : s?.id) === subjectId),
    );
    if (!hasSubject) return false;
  }

  return true;
};
