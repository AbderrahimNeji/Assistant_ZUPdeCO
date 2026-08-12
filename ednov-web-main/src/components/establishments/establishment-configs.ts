import {
  Building,
  Building2,
  GraduationCap,
  Briefcase,
  HelpCircle,
  School,
  Shield,
  CheckCircle2,
  PauseCircle,
  Ban,
  Minus,
  Network,
  Star,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type BadgeVariant = 'ghost' | 'outlined' | 'solid' | 'active' | 'disabled' | 'on-hold';

/**
 * Configuration des types d'établissement
 */
export interface EstablishmentTypeConfig {
  label: string;
  icon: LucideIcon;
  badgeVariant: BadgeVariant;
  badgeColor: string;
  colorName: 'color-1' | 'color-2' | 'color-3';
}

/**
 * Configuration des statuts d'établissement
 */
export interface EstablishmentStatusConfig {
  label: string;
  icon: LucideIcon;
  badgeVariant: BadgeVariant;
  badgeColor?: string; // Absent pour types sémantiques
}

export const ESTABLISHMENT_TYPE_CONFIG: Record<string, EstablishmentTypeConfig> = {
  primaire: {
    label: 'École',
    icon: School,
    badgeVariant: 'outlined',
    badgeColor: 'var(--color-2-nuance-1)',
    colorName: 'color-2',
  },
  college: {
    label: 'Collège',
    icon: Building,
    badgeVariant: 'outlined',
    badgeColor: 'var(--color-1-nuance-1)',
    colorName: 'color-1',
  },
  lycee: {
    label: 'Lycée général',
    icon: GraduationCap,
    badgeVariant: 'outlined',
    badgeColor: 'var(--color-2-nuance-1)',
    colorName: 'color-2',
  },
  professionnel: {
    label: 'Lycée professionnel',
    icon: Briefcase,
    badgeVariant: 'outlined',
    badgeColor: 'var(--color-3-nuance-1)',
    colorName: 'color-3',
  },
  other: {
    label: 'Autre',
    icon: HelpCircle,
    badgeVariant: 'outlined',
    badgeColor: 'var(--color-2-nuance-1)',
    colorName: 'color-2',
  },
};

/**
 * Configuration des catégories d'établissement (public / privé)
 */
export interface EstablishmentCategoryConfig {
  label: string;
  icon: LucideIcon;
  badgeColor: string;
  colorName: 'color-1' | 'color-2' | 'color-3';
}

export const ESTABLISHMENT_CATEGORY_CONFIG: Record<string, EstablishmentCategoryConfig> = {
  public: {
    label: 'Public',
    icon: Building2,
    badgeColor: 'var(--color-1-nuance-1)',
    colorName: 'color-1',
  },
  private: {
    label: 'Privé',
    icon: Shield,
    badgeColor: 'var(--color-3-nuance-1)',
    colorName: 'color-3',
  },
};

export interface EstablishmentPriorityNetworkConfig {
  label: string;
  icon: LucideIcon;
  badgeColor: string;
  colorName: 'color-1' | 'color-2' | 'color-3';
}

export const ESTABLISHMENT_PRIORITY_NETWORK_CONFIG: Record<
  string,
  EstablishmentPriorityNetworkConfig
> = {
  none: {
    label: 'Aucun réseau prioritaire',
    icon: Minus,
    badgeColor: 'var(--color-1-nuance-1)',
    colorName: 'color-1',
  },
  rep: { label: 'REP', icon: Network, badgeColor: 'var(--color-2-nuance-1)', colorName: 'color-2' },
  rep_plus: {
    label: 'REP+',
    icon: Star,
    badgeColor: 'var(--color-3-nuance-1)',
    colorName: 'color-3',
  },
};

export const ESTABLISHMENT_STATUS_CONFIG: Record<string, EstablishmentStatusConfig> = {
  active: {
    label: 'Actif',
    icon: CheckCircle2,
    badgeVariant: 'active',
  },
  suspended: {
    label: 'Suspendu',
    icon: PauseCircle,
    badgeVariant: 'outlined',
    badgeColor: 'rgb(var(--status-warning))',
  },
  closed: {
    label: 'Fermé',
    icon: Ban,
    badgeVariant: 'outlined',
    badgeColor: 'rgb(var(--color-error))',
  },
};

export { ITEMS_PER_PAGE, ITEMS_PER_PAGE_SECTION } from '@/lib/data-table-page-size';

export const ALL_FILTER_GROUP_IDS = [
  'establishment-types',
  'establishment-categories',
  'establishment-priority-networks',
  'establishment-qpv',
  'establishment-statuses',
  'establishment-cities',
  'establishment-departments',
  'establishment-calendar',
  'establishment-search',
  'establishment-dates',
  'establishment-managed-by',
  'establishment-specialties',
] as const;
export type FilterGroupId = (typeof ALL_FILTER_GROUP_IDS)[number];

export const FILTER_GROUP_LABELS: Record<FilterGroupId, string> = {
  'establishment-types': 'Type',
  'establishment-categories': 'Catégorie',
  'establishment-priority-networks': 'Réseau prioritaire',
  'establishment-qpv': 'QPV',
  'establishment-statuses': 'Statut',
  'establishment-cities': 'Ville',
  'establishment-departments': 'Département',
  'establishment-calendar': 'Type de calendrier',
  'establishment-search': 'Recherche',
  'establishment-dates': 'Date de création',
  'establishment-managed-by': 'Géré par',
  'establishment-specialties': 'Spécialités',
};

import type {
  Establishment,
  EstablishmentCategory,
  EstablishmentPriorityNetwork,
  EstablishmentType,
  EstablishmentStatus,
  PartnerRelationshipQuality,
} from '@/types/establishment.types';

export interface PartnerRelationshipQualityConfig {
  label: string;
  badgeColor: string;
}

export const PARTNER_RELATIONSHIP_QUALITY_CONFIG: Record<
  PartnerRelationshipQuality,
  PartnerRelationshipQualityConfig
> = {
  very_bad: { label: 'Très mauvaise', badgeColor: 'rgb(var(--color-error))' },
  bad: { label: 'Mauvaise', badgeColor: 'rgb(var(--status-warning))' },
  average: { label: 'Moyenne', badgeColor: 'var(--color-2-nuance-1)' },
  good: { label: 'Bonne', badgeColor: 'rgb(var(--status-success))' },
  very_good: { label: 'Très bonne', badgeColor: 'var(--color-1-nuance-1)' },
};

export const PARTNER_RELATIONSHIP_QUALITY_OPTIONS = [
  { value: 'very_bad', label: 'Très mauvaise' },
  { value: 'bad', label: 'Mauvaise' },
  { value: 'average', label: 'Moyenne' },
  { value: 'good', label: 'Bonne' },
  { value: 'very_good', label: 'Très bonne' },
];

export const INVOLVEMENT_LEVEL_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
];

export interface EstablishmentFilters {
  types: EstablishmentType[];
  categories: EstablishmentCategory[];
  priorityNetworks: EstablishmentPriorityNetwork[];
  isQpv?: boolean | null;
  statuses: EstablishmentStatus[];
  cities?: string[];
  departments?: string[];
  calendarTypes?: string[];
  searchQuery?: string;
  selectedEstablishmentId?: string;
  quotaMin?: number;
  quotaMax?: number;
  createdFrom?: Date;
  createdTo?: Date;
  coordinatorId?: string;
  managedById?: string;
  specialtyIds?: string[];
}

export const DEFAULT_ESTABLISHMENT_FILTERS: EstablishmentFilters = {
  types: [],
  categories: [],
  priorityNetworks: [],
  isQpv: undefined,
  statuses: [],
  cities: [],
  departments: [],
  calendarTypes: [],
  searchQuery: '',
  selectedEstablishmentId: undefined,
  quotaMin: undefined,
  quotaMax: undefined,
  createdFrom: undefined,
  createdTo: undefined,
  coordinatorId: undefined,
  managedById: undefined,
  specialtyIds: [],
};

export const filterEstablishment = (
  establishment: Establishment,
  filters: EstablishmentFilters,
): boolean => {
  if (
    filters.types.length > 0 &&
    establishment.type &&
    !filters.types.includes(establishment.type)
  ) {
    return false;
  }
  if (filters.statuses.length > 0 && !filters.statuses.includes(establishment.status)) {
    return false;
  }
  if (filters.managedById && establishment.managedById !== filters.managedById) {
    return false;
  }
  return true;
};

/** Correspondance type établissement → educationCycle */
export const ESTABLISHMENT_TYPE_TO_CYCLE: Record<string, string[]> = {
  primaire: ['primary'],
  college: ['middle'],
  lycee: ['high'],
};

/** Types d'établissements qui supportent la gestion de classes */
export const ESTABLISHMENT_TYPES_WITH_CLASSES = new Set(['primaire', 'college', 'lycee']);
