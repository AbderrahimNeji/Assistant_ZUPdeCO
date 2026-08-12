import * as React from 'react';
import {
  CalendarDays,
  Clock4,
  PlayCircle,
  CheckCircle2,
  XCircle,
  BookOpen,
  User,
  Users,
  UsersRound,
  GraduationCap,
  Tag,
  Palmtree,
  FileText,
} from 'lucide-react';

/**
 * Configuration for calendar event types
 * Used across all calendar components for consistent styling and labels
 */
export const EVENT_TYPE_CONFIG = {
  session: {
    icon: CalendarDays,
    label: 'Séance',
    color: 'var(--color-2-nuance-1)',
    bgClass: 'bg-[color-mix(in_srgb,var(--color-2-nuance-1)_15%,transparent)]',
    textClass: 'text-[var(--color-2-nuance-1)]',
    borderClass: 'border-[var(--color-2-nuance-1)]',
  },
  postit: {
    icon: FileText,
    label: 'Post-it',
    color: 'var(--color-1-nuance-1)',
    bgClass: 'bg-[color-mix(in_srgb,var(--color-1-nuance-1)_15%,transparent)]',
    textClass: 'text-[var(--color-1-nuance-1)]',
    borderClass: 'border-[var(--color-1-nuance-1)]',
  },
  holiday: {
    icon: Palmtree,
    label: 'Vacances',
    color: 'var(--color-3-nuance-1)',
    bgClass: 'bg-[color-mix(in_srgb,var(--color-3-nuance-1)_15%,transparent)]',
    textClass: 'text-[var(--color-3-nuance-1)]',
    borderClass: 'border-[var(--color-3-nuance-1)]',
  },
} as const;

/**
 * Configuration for session types
 */
export const SESSION_TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  homework_help: {
    label: 'Aide aux devoirs',
    icon: BookOpen,
    color: 'var(--color-2-nuance-1)',
  },
  individual_tutoring: {
    label: 'Tutorat individuel',
    icon: User,
    color: 'var(--color-1-nuance-1)',
  },
  workshop: {
    label: 'Atelier',
    icon: Users,
    color: 'var(--color-3-nuance-1)',
  },
  whole_class: {
    label: 'Classe entière',
    icon: GraduationCap,
    color: 'rgb(var(--accent-purple))',
  },
  group_tutoring: {
    label: 'Tutorat',
    icon: UsersRound,
    color: 'var(--color-1-nuance-2)',
  },
  other: {
    label: 'Autre',
    icon: Tag,
    color: 'var(--muted-foreground)',
  },
};

/**
 * Configuration for session statuses
 */
export const SESSION_STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; bgClass: string; textClass: string }
> = {
  PLANNED: {
    label: 'Planifiée',
    icon: Clock4,
    bgClass: 'bg-[color-mix(in_srgb,var(--color-1-nuance-3)_20%,transparent)]',
    textClass: 'text-[var(--color-1-nuance-1)]',
  },
  IN_PROGRESS: {
    label: 'En cours',
    icon: PlayCircle,
    bgClass: 'bg-[color-mix(in_srgb,var(--color-2-nuance-1)_15%,transparent)]',
    textClass: 'text-[var(--color-2-nuance-1)]',
  },
  COMPLETED: {
    label: 'Terminée',
    icon: CheckCircle2,
    bgClass: 'bg-success-light',
    textClass: 'text-success',
  },
  CLOSED: {
    label: 'Clôturée',
    icon: CheckCircle2,
    bgClass: 'bg-muted/50',
    textClass: 'text-muted-foreground',
  },
  CANCELLED: {
    label: 'Annulée',
    icon: XCircle,
    bgClass: 'bg-error-light',
    textClass: 'text-error',
  },
};

/**
 * Configuration for post-it statuses
 */
export const POSTIT_STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; bgClass: string; textClass: string }
> = {
  en_cours: {
    label: 'En cours',
    icon: PlayCircle,
    bgClass: 'bg-[color-mix(in_srgb,var(--color-2-nuance-1)_15%,transparent)]',
    textClass: 'text-[var(--color-2-nuance-1)]',
  },
  depasse: {
    label: 'Dépassé',
    icon: XCircle,
    bgClass: 'bg-error-light',
    textClass: 'text-error',
  },
  done: {
    label: 'Terminé',
    icon: CheckCircle2,
    bgClass: 'bg-success-light',
    textClass: 'text-success',
  },
};

/**
 * Labels for post-it thematics
 */
export const THEMATIC_LABELS: Record<string, string> = {
  seances: 'Séances',
  matching: 'Matching',
  tuteur: 'Tuteur',
  eleves: 'Élèves',
  etablissements: 'Établissements',
  administration: 'Administration',
  autres: 'Autres',
};

/**
 * Labels for holiday types
 */
export const HOLIDAY_TYPE_LABELS: Record<string, string> = {
  national: 'Jour férié national',
  regional: 'Vacances scolaires',
  establishment_specific: "Spécifique à l'établissement",
};

/**
 * Color map for event types in FullCalendar
 */
export const EVENT_COLOR_MAP = {
  session: {
    bg: 'var(--color-2-nuance-1)',
    border: 'var(--color-2-nuance-2)',
  },
  postit: {
    bg: 'var(--color-1-nuance-1)',
    border: 'var(--color-1-nuance-2)',
  },
  holiday: {
    bg: 'var(--color-3-nuance-1)',
    border: 'var(--color-3-nuance-2)',
  },
} as const;
