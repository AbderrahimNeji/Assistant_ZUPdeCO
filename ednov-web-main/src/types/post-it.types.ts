export type PostItThematic =
  | 'seances'
  | 'matching'
  | 'tuteur'
  | 'eleves'
  | 'etablissements'
  | 'administration'
  | 'formation'
  | 'rapport_activite'
  | 'autres';

export type PostItStatus = 'en_cours' | 'depasse' | 'done';

export type PostItColor =
  | 'jaune'
  | 'orange'
  | 'rose'
  | 'vert'
  | 'violet'
  | 'bleu'
  | 'turquoise'
  | 'blanc-casse';

export type PostItPermission = 'read' | 'write' | 'owner';

export interface PostItShare {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  permission: 'read' | 'write';
  sharedAt: Date;
  sharedById: string;
  sharedByName: string;
}

export interface PostIt {
  id: string;
  companyId: string;
  createdById: string;
  createdByName: string;
  title: string;
  thematic: PostItThematic;
  content: string;
  deadline: Date | null;
  status: PostItStatus;
  color: PostItColor;
  isArchived: boolean;
  isPriority: boolean;
  visibleFrom: Date | null;
  createdAt: Date;
  updatedAt: Date;
  userPermission: PostItPermission;
  isDefault?: boolean;
  shares?: PostItShare[];
}

export interface CreatePostItDto {
  title: string;
  thematic: PostItThematic;
  content: string;
  deadline?: string;
  color?: PostItColor;
  isPriority?: boolean;
}

export interface UpdatePostItDto {
  title?: string;
  thematic?: PostItThematic;
  content?: string;
  deadline?: string | null;
  status?: PostItStatus;
  color?: PostItColor;
  isPriority?: boolean;
  isArchived?: boolean;
}

// ─── Assigned post-its (templates) ───────────────────────────────────────────

export type AssignedRecurrence = 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'specific_date';

export interface AssignedPostIt {
  id: string;
  companyId: string;
  createdById: string;
  createdByName: string;
  title: string;
  thematic: PostItThematic;
  content: string;
  color: PostItColor;
  isPriority: boolean;
  targetRoleIds: string[];
  recurrence: AssignedRecurrence | null;
  specificDateFrom: string | null;
  specificDateTo: string | null;
  quarterlyPeriods?: number[] | null;
  scheduleConfig?: ScheduleConfig | null;
  isActive: boolean;
  lastProvisionedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssignedPostItDto {
  title: string;
  thematic: PostItThematic;
  content: string;
  color?: PostItColor;
  isPriority?: boolean;
  targetRoleIds?: string[];
  recurrence?: AssignedRecurrence;
  specificDateFrom?: string;
  specificDateTo?: string;
  quarterlyPeriods?: number[];
  scheduleConfig?: ScheduleConfig;
}

export interface BulkAssignedPostItDto {
  ids: string[];
  roleId?: string;
  recurrence?: AssignedRecurrence;
  specificDateFrom?: string;
  specificDateTo?: string;
  quarterlyPeriods?: number[];
  scheduleConfig?: ScheduleConfig;
}

export interface BulkAssignedPostItResult {
  updated: number;
  notFound: string[];
}

// ─── Advanced Schedule Config ───────────────────────────────────────────────

export type ScheduleType =
  | 'weekly' // Hebdomadaire
  | 'monthly' // Mensuel
  | 'quarterly' // Trimestriel
  | 'school_year' // Début d'année scolaire
  | 'civil_year' // 1er janvier
  | 'day_of_week' // Chaque lundi/jeudi/...
  | 'day_of_month' // Chaque 15 du mois, etc.
  | 'custom_dates'; // Plage libre

export type RecurrenceMode =
  | 'once' // Une seule fois
  | 'indefinitely' // Indéfiniment (jusqu'à désactivation manuelle)
  | 'n_times' // Les N prochaines fois
  | 'custom_pick'; // Sélection personnalisée des occurrences

export type YearScope =
  | 'current_school_year' // Année scolaire en cours uniquement
  | 'all_school_years' // Toutes les années scolaires (présentes et futures)
  | 'current_civil_year' // Année civile actuelle uniquement
  | 'all_civil_years'; // Toutes les années civiles à venir

export type WeekOfMonth = 1 | 2 | 3 | 4 | 5 | 'last';
export type MonthNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type QuarterNumber = 1 | 2 | 3 | 4;
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface WeeklyOptions {
  weekOfMonth?: WeekOfMonth | 'all';
  targetMonths: MonthNumber[] | 'all';
  yearScope: YearScope;
}

export interface MonthlyOptions {
  targetMonths: MonthNumber[] | 'all';
  yearScope: YearScope;
}

export interface QuarterlyOptions {
  targetQuarters: QuarterNumber[] | 'all';
  yearScope: YearScope;
}

export interface SchoolYearOptions {
  yearScope: 'current_school_year' | 'all_school_years';
}

export interface CivilYearOptions {
  yearScope: 'current_civil_year' | 'all_civil_years';
}

export interface DayOfWeekOptions {
  daysOfWeek: DayOfWeek[];
  targetMonths?: MonthNumber[] | 'all';
  targetWeeks?: WeekOfMonth[] | 'all';
  yearScope: YearScope;
}

export interface DayOfMonthOptions {
  dayNumber: number;
  targetMonths: MonthNumber[] | 'all';
  yearScope: YearScope;
}

export interface CustomDatesOptions {
  dateFrom: string;
  dateTo?: string;
  yearScope: 'current_year' | 'selected_years' | 'indefinitely';
  selectedYears?: number[];
}

export interface RecurrenceConfig {
  mode: RecurrenceMode;
  count?: number;
  pickedKeys?: string[];
}

export interface ScheduleConfig {
  type: ScheduleType;
  options:
    | WeeklyOptions
    | MonthlyOptions
    | QuarterlyOptions
    | SchoolYearOptions
    | CivilYearOptions
    | DayOfWeekOptions
    | DayOfMonthOptions
    | CustomDatesOptions;
  recurrence: RecurrenceConfig;
}

export interface TrackingOccurrenceStats {
  total: number;
  done: number;
  overdue: number;
  pending: number;
}

export interface TrackingOccurrence {
  periodKey: string;
  label: string;
  date: Date;
  stats: TrackingOccurrenceStats;
  provisioned: boolean;
}

export interface TrackingUser {
  postItId: string;
  userId: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  status: PostItStatus;
  deadline: Date | null;
  updatedAt: Date;
}

export interface TrackingUsersResponse {
  users: TrackingUser[];
  total: number;
  page: number;
  pageSize: number;
}
