/**
 * Types partagés pour la configuration avancée de planification des post-its assignés
 * Utilisés côté backend ET frontend
 */

export type ScheduleType =
  | 'weekly'        // Hebdomadaire
  | 'monthly'       // Mensuel
  | 'quarterly'     // Trimestriel
  | 'school_year'   // Début d'année scolaire
  | 'civil_year'    // 1er janvier
  | 'day_of_week'   // Chaque lundi/jeudi/...
  | 'day_of_month'  // Chaque 15 du mois, etc.
  | 'custom_dates'; // Plage libre

export type RecurrenceMode =
  | 'once'          // Une seule fois
  | 'indefinitely'  // Indéfiniment (jusqu'à désactivation manuelle)
  | 'n_times'       // Les N prochaines fois
  | 'custom_pick';  // Sélection personnalisée des occurrences

export type YearScope =
  | 'current_school_year'  // Année scolaire en cours uniquement
  | 'all_school_years'     // Toutes les années scolaires (présentes et futures)
  | 'current_civil_year'   // Année civile actuelle uniquement
  | 'all_civil_years';     // Toutes les années civiles à venir

export type WeekOfMonth = 1 | 2 | 3 | 4 | 5 | 'last'; // 1ère, 2ème, 3ème, 4ème, 5ème, dernière
export type MonthNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type QuarterNumber = 1 | 2 | 3; // T1, T2, T3
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=dimanche, 1=lundi, ..., 6=samedi

/**
 * Options pour la planification hebdomadaire
 */
export interface WeeklyOptions {
  weekOfMonth?: WeekOfMonth | 'all'; // Quelle semaine du mois (optionnel)
  targetMonths: MonthNumber[] | 'all'; // Quels mois (ou tous)
  yearScope: YearScope;
}

/**
 * Options pour la planification mensuelle
 */
export interface MonthlyOptions {
  targetMonths: MonthNumber[] | 'all'; // Quels mois (ou tous les mois de l'année scolaire)
  yearScope: YearScope;
}

/**
 * Options pour la planification trimestrielle
 */
export interface QuarterlyOptions {
  targetQuarters: QuarterNumber[] | 'all'; // Quels trimestres (ou tous)
  yearScope: YearScope;
}

/**
 * Options pour la planification par année scolaire
 */
export interface SchoolYearOptions {
  yearScope: 'current_school_year' | 'all_school_years';
}

/**
 * Options pour la planification par année civile
 */
export interface CivilYearOptions {
  yearScope: 'current_civil_year' | 'all_civil_years';
}

/**
 * Options pour la planification par jour de la semaine
 */
export interface DayOfWeekOptions {
  daysOfWeek: DayOfWeek[]; // Quels jours (ex: [1, 4] = lundi et jeudi)
  targetMonths?: MonthNumber[] | 'all'; // Optionnel : quels mois
  targetWeeks?: WeekOfMonth[] | 'all'; // Optionnel : quelles semaines
  yearScope: YearScope;
}

/**
 * Options pour la planification par jour du mois
 */
export interface DayOfMonthOptions {
  dayNumber: number; // 1-31
  targetMonths: MonthNumber[] | 'all'; // Quels mois
  yearScope: YearScope;
}

/**
 * Options pour les dates personnalisées (plage libre)
 */
export interface CustomDatesOptions {
  dateFrom: string; // ISO date string
  dateTo?: string; // ISO date string (optionnel)
  yearScope: 'current_year' | 'selected_years' | 'indefinitely';
  selectedYears?: number[]; // Si yearScope === 'selected_years'
}

/**
 * Configuration de récurrence
 */
export interface RecurrenceConfig {
  mode: RecurrenceMode;
  count?: number; // Si mode === 'n_times'
  pickedKeys?: string[]; // Si mode === 'custom_pick' (clés de période sélectionnées)
}

/**
 * Configuration complète de planification
 */
export interface ScheduleConfig {
  version: 1; // Versioning pour migration future
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

/**
 * Type guards pour discriminer les options selon le type
 */
export function isWeeklyOptions(config: ScheduleConfig): config is ScheduleConfig & { options: WeeklyOptions } {
  return config.type === 'weekly';
}

export function isMonthlyOptions(config: ScheduleConfig): config is ScheduleConfig & { options: MonthlyOptions } {
  return config.type === 'monthly';
}

export function isQuarterlyOptions(config: ScheduleConfig): config is ScheduleConfig & { options: QuarterlyOptions } {
  return config.type === 'quarterly';
}

export function isSchoolYearOptions(config: ScheduleConfig): config is ScheduleConfig & { options: SchoolYearOptions } {
  return config.type === 'school_year';
}

export function isCivilYearOptions(config: ScheduleConfig): config is ScheduleConfig & { options: CivilYearOptions } {
  return config.type === 'civil_year';
}

export function isDayOfWeekOptions(config: ScheduleConfig): config is ScheduleConfig & { options: DayOfWeekOptions } {
  return config.type === 'day_of_week';
}

export function isDayOfMonthOptions(config: ScheduleConfig): config is ScheduleConfig & { options: DayOfMonthOptions } {
  return config.type === 'day_of_month';
}

export function isCustomDatesOptions(config: ScheduleConfig): config is ScheduleConfig & { options: CustomDatesOptions } {
  return config.type === 'custom_dates';
}
