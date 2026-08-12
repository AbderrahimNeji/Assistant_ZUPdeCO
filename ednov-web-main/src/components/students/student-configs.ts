import { CheckCircle2, MinusCircle, Mars, Venus, CircleHelp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { normalizeStudentAccountStatus, type StudentAccountStatus } from '@/types/user.types';

// ══════════════════════════════════════════════════════
// INTERFACES
// ══════════════════════════════════════════════════════

type BadgeVariant =
  | 'ghost'
  | 'outlined'
  | 'solid'
  | 'active'
  | 'disabled'
  | 'on-hold'
  | 'male'
  | 'female';

/**
 * Configuration pour un statut d'élève
 */
export interface StudentStatusConfig {
  label: string;
  icon: LucideIcon;
  badgeVariant: BadgeVariant;
  badgeColor?: string; // Absent pour types sémantiques
}

/**
 * Configuration pour le genre
 */
export interface GenderConfig {
  label: string;
  icon: LucideIcon;
  badgeVariant: BadgeVariant;
  badgeColor?: string; // Absent pour types sémantiques
}

/**
 * Interface des filtres students
 */
export interface StudentFilters {
  statuses: string[];
  levelIds: string[];
  subjects: string[];
  establishmentId?: string;
  classIds: string[];
  specialtyIds: string[];
  createdFrom?: Date;
  createdTo?: Date;
  isMinor?: boolean;
  hasSpecialNeeds?: boolean;
  exitDateFrom?: Date;
  exitDateTo?: Date;
  exitReason?: string;
}

/**
 * Type union pour identifier les groupes de filtres
 * Correspond aux element_id dans interface_elements
 */
export type FilterGroupId =
  | 'filter-statut'
  | 'filter-grade-level'
  | 'filter-subject'
  | 'filter-etablissement'
  | 'filter-classe'
  | 'filter-specialties'
  | 'filter-dates'
  | 'filter-is-minor'
  | 'filter-special-needs'
  | 'filter-exit-date'
  | 'filter-exit-reason';

// ══════════════════════════════════════════════════════
// CONFIGURATIONS STATUTS
// ══════════════════════════════════════════════════════

/**
 * Configuration des statuts d'élèves
 */
export const STUDENT_STATUS_CONFIG: Record<string, StudentStatusConfig> = {
  registered: {
    label: 'Inscrit',
    icon: CheckCircle2,
    badgeVariant: 'active',
  },
  accompanied: {
    label: 'Accompagné',
    icon: CheckCircle2,
    badgeVariant: 'outlined',
    badgeColor: 'rgb(var(--status-success))',
  },
  deactivated: {
    label: 'Désactivé',
    icon: MinusCircle,
    badgeVariant: 'disabled',
  },
};

/** Options du Select Statut en édition élève (transitions métier restreintes). */
export interface StudentStatusSelectOption {
  value: StudentAccountStatus;
  label: string;
}

function studentStatusLabel(key: StudentAccountStatus): string {
  return STUDENT_STATUS_CONFIG[key]?.label ?? key;
}

/** Entrées API status-history : `createdAt` décroissant (plus récent en premier). */
export function resolvePreviousStatusBeforeDeactivate(
  rows: Array<{ oldStatus: string | null; newStatus: string }>,
): StudentAccountStatus | null {
  for (const row of rows) {
    if (normalizeStudentAccountStatus(String(row.newStatus)) !== 'deactivated') continue;
    if (row.oldStatus == null) return null;
    const prev = normalizeStudentAccountStatus(String(row.oldStatus));
    if (prev === 'registered' || prev === 'accompanied') return prev;
    return null;
  }
  return null;
}

export interface StudentEditStatusSelectContext {
  /** 1) Statut élève juste avant la dernière transition vers `deactivated` dans `student_status_history`. */
  previousStatusBeforeDeactivate?: StudentAccountStatus | null;
  /** 2) Secours : `reactivationTargetStatus` du GET élève désactivé (présences séances). */
  reactivationTargetStatus?: StudentAccountStatus | null;
}

/**
 * `registered` / `accompanied` : pas de passage manuel vers l’autre statut « actif » ;
 * `deactivated` : réactivation — d’abord historique, puis cible API ; sinon les trois statuts actifs + désactivé.
 */
export function getStudentEditStatusSelectOptions(
  currentStatus: StudentAccountStatus,
  context?: StudentEditStatusSelectContext,
): StudentStatusSelectOption[] {
  switch (currentStatus) {
    case 'registered':
      return [
        { value: 'registered', label: studentStatusLabel('registered') },
        { value: 'deactivated', label: studentStatusLabel('deactivated') },
      ];
    case 'accompanied':
      return [
        { value: 'accompanied', label: studentStatusLabel('accompanied') },
        { value: 'deactivated', label: studentStatusLabel('deactivated') },
      ];
    case 'deactivated': {
      const fromHistory = context?.previousStatusBeforeDeactivate ?? null;
      const fromApi = context?.reactivationTargetStatus ?? null;
      const effective: StudentAccountStatus | null =
        fromHistory === 'accompanied' || fromHistory === 'registered'
          ? fromHistory
          : fromApi === 'accompanied' || fromApi === 'registered'
            ? fromApi
            : null;
      if (effective === 'accompanied') {
        return [
          { value: 'accompanied', label: studentStatusLabel('accompanied') },
          { value: 'deactivated', label: studentStatusLabel('deactivated') },
        ];
      }
      if (effective === 'registered') {
        return [
          { value: 'registered', label: studentStatusLabel('registered') },
          { value: 'deactivated', label: studentStatusLabel('deactivated') },
        ];
      }
      return [
        { value: 'registered', label: studentStatusLabel('registered') },
        { value: 'accompanied', label: studentStatusLabel('accompanied') },
        { value: 'deactivated', label: studentStatusLabel('deactivated') },
      ];
    }
  }
}

// ══════════════════════════════════════════════════════
// CONFIGURATIONS GENRE
// ══════════════════════════════════════════════════════

/**
 * Configuration des genres
 */
export const STUDENT_GENDER_CONFIG: Record<string, GenderConfig> = {
  M: {
    label: 'Homme',
    icon: Mars,
    badgeVariant: 'male', // Type sémantique
  },
  /** Alias (e.g. imports / legacy data) — même affichage que `M`. */
  H: {
    label: 'Homme',
    icon: Mars,
    badgeVariant: 'male',
  },
  F: {
    label: 'Femme',
    icon: Venus,
    badgeVariant: 'female', // Type sémantique
  },
  O: {
    label: 'Autre',
    icon: CircleHelp,
    badgeVariant: 'ghost',
    badgeColor: 'var(--color-1-nuance-3)',
  },
};

/**
 * Resolve gender for display (table, cards): normalizes API/CSV casing and synonyms.
 */
export function getStudentGenderConfig(gender: string | null | undefined): GenderConfig {
  if (gender == null || String(gender).trim() === '') return STUDENT_GENDER_CONFIG.O;
  const u = String(gender).trim().toUpperCase();
  if (u === 'M' || u === 'H' || u === 'HOMME' || u === 'MASCULIN' || u === 'MALE')
    return STUDENT_GENDER_CONFIG.M;
  if (u === 'F' || u === 'FEMME' || u === 'FEMALE' || u === 'FÉMININ' || u === 'FEMININ')
    return STUDENT_GENDER_CONFIG.F;
  if (u === 'O' || u === 'AUTRE' || u === 'OTHER') return STUDENT_GENDER_CONFIG.O;
  return STUDENT_GENDER_CONFIG.O;
}

/** Plain label for detail text; null if no gender set. */
export function getStudentGenderLabel(gender: string | null | undefined): string | null {
  if (gender == null || String(gender).trim() === '') return null;
  return getStudentGenderConfig(gender).label;
}

// ══════════════════════════════════════════════════════
// MOTIFS DE SORTIE
// ══════════════════════════════════════════════════════

export const EXIT_REASON_OPTIONS = [
  { value: "Fin d'engagement anticipé", label: "Fin d'engagement anticipé" },
  { value: 'Ne donne pas suite', label: 'Ne donne pas suite' },
  { value: 'Autre', label: 'Autre' },
] as const;

export type ExitReasonOption = (typeof EXIT_REASON_OPTIONS)[number]['value'];

export const EXIT_REASON_VALUES = EXIT_REASON_OPTIONS.map((o) => o.value);

// ══════════════════════════════════════════════════════
// CONSTANTES ET DEFAULTS
// ══════════════════════════════════════════════════════

/**
 * Valeurs par défaut pour l'état des filtres
 */
export const DEFAULT_STUDENT_FILTERS: StudentFilters = {
  statuses: [],
  levelIds: [],
  subjects: [],
  establishmentId: undefined,
  classIds: [],
  specialtyIds: [],
  createdFrom: undefined,
  createdTo: undefined,
  isMinor: undefined,
  hasSpecialNeeds: undefined,
  exitDateFrom: undefined,
  exitDateTo: undefined,
  exitReason: undefined,
};

/**
 * Tableau de tous les IDs de groupes de filtres
 * Utilisé pour la configuration des filtres visibles
 */
export const ALL_FILTER_GROUP_IDS: FilterGroupId[] = [
  'filter-statut',
  'filter-grade-level',
  'filter-subject',
  'filter-etablissement',
  'filter-classe',
  'filter-specialties',
  'filter-dates',
  'filter-is-minor',
  'filter-special-needs',
  'filter-exit-date',
  'filter-exit-reason',
];

export { ITEMS_PER_PAGE, ITEMS_PER_PAGE_SECTION } from '@/lib/data-table-page-size';

/**
 * Labels lisibles pour chaque groupe de filtres
 * Utilisés dans le panneau de configuration des filtres
 */
export const FILTER_GROUP_LABELS: Record<FilterGroupId, string> = {
  'filter-statut': 'Statut',
  'filter-grade-level': 'Niveau',
  'filter-subject': 'Matière',
  'filter-etablissement': 'Établissement',
  'filter-classe': 'Classe',
  'filter-specialties': 'Spécialités',
  'filter-dates': "Date d'entrée dans le dispositif",
  'filter-is-minor': 'Mineur',
  'filter-special-needs': 'Besoins spécifiques',
  'filter-exit-date': 'Date de sortie',
  'filter-exit-reason': 'Motif de sortie',
};

// ══════════════════════════════════════════════════════
// FONCTIONS UTILITAIRES
// ══════════════════════════════════════════════════════

/**
 * Applique tous les filtres (statuts, niveaux, matières) à un élève
 * et retourne si il doit être affiché
 *
 * @param student - Objet élève avec status et userProfiles
 * @param filters - Objet StudentFilters avec les critères actifs
 * @returns true si l'élève passe tous les filtres, false sinon
 */
export const filterStudent = (
  student: {
    status: string;
    userProfiles?: Array<{
      levelId?: string | null;
      subjects?: unknown[] | null;
    }>;
  },
  filters: StudentFilters,
): boolean => {
  // Filtre par statut
  if (filters.statuses.length > 0 && !filters.statuses.includes(student.status)) {
    return false;
  }

  // Filtre par niveau scolaire
  if (filters.levelIds.length > 0) {
    const studentLevelId = student.userProfiles?.[0]?.levelId;
    if (!studentLevelId || !filters.levelIds.includes(studentLevelId)) {
      return false;
    }
  }

  // Filtre par matières
  if (filters.subjects.length > 0) {
    const studentSubjects = student.userProfiles?.[0]?.subjects || [];
    const hasSubject = filters.subjects.some((subjectId) =>
      studentSubjects.some((s: any) => (typeof s === 'string' ? s : s?.id) === subjectId),
    );
    if (!hasSubject) return false;
  }

  return true;
};

// ══════════════════════════════════════════════════════
// DISABILITY TYPE OPTIONS
// ══════════════════════════════════════════════════════

export const DISABILITY_TYPE_OPTIONS = [
  { value: 'moteur', label: 'Handicap moteur' },
  { value: 'visuel', label: 'Handicap visuel' },
  { value: 'auditif', label: 'Handicap auditif' },
  { value: 'intellectuel', label: 'Handicap intellectuel' },
  { value: 'psychique', label: 'Handicap psychique' },
  { value: 'cognitif', label: 'Handicap cognitif' },
  { value: 'tsa', label: "Troubles du spectre de l'autisme (TSA)" },
  { value: 'tnd', label: 'Troubles du neuro développement (TND)' },
  { value: 'dys', label: 'Troubles du langage et des apprentissages (dys)' },
  { value: 'maladies', label: 'Maladies invalidantes ou chroniques' },
  { value: 'polyhandicap', label: 'Polyhandicap' },
  { value: 'plurihandicap', label: 'Pluri handicap' },
  { value: 'autre', label: 'Autre' },
] satisfies { value: string; label: string }[];

// ══════════════════════════════════════════════════════
// SPECIAL NEEDS TYPE OPTIONS
// ══════════════════════════════════════════════════════

export const SPECIAL_NEEDS_TYPE_OPTIONS = [
  { value: 'ulis', label: 'ULIS' },
  { value: 'upe2a', label: 'UPE2A' },
  { value: 'segpa', label: 'SEGPA' },
  { value: 'allophones', label: 'Allophones' },
  { value: 'autre', label: 'Autre' },
] satisfies { value: string; label: string }[];

export const KNOWN_SPECIAL_NEEDS_TYPES = new Set(SPECIAL_NEEDS_TYPE_OPTIONS.map((o) => o.value));
