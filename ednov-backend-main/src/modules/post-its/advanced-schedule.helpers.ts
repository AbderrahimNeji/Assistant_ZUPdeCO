/**
 * Helper functions pour la logique avancée de provisioning des post-its assignés
 */
import {
  ScheduleConfig,
  isWeeklyOptions,
  isMonthlyOptions,
  isQuarterlyOptions,
  isSchoolYearOptions,
  isCivilYearOptions,
  isDayOfWeekOptions,
  isDayOfMonthOptions,
  isCustomDatesOptions,
} from './schedule-config.types';
import { AssignedPostItTemplate } from './entities/assigned-post-it-template.entity';
import { SchoolYear } from '../academic/entities/school-year.entity';
import { SchoolYearQuarter } from '../academic/entities/school-year-quarter.entity';

/**
 * Vérifie si un template avec scheduleConfig est "due" (doit être provisionné)
 * @param provisionedCount Nombre de périodes déjà provisionnées pour ce template (pour mode n_times)
 */
export function isAdvancedScheduleDue(
  template: AssignedPostItTemplate,
  now: Date,
  currentSchoolYear: SchoolYear | null,
  allSchoolYears: SchoolYear[],
  quarters: SchoolYearQuarter[],
  provisionedCount: number = 0,
): boolean {
  if (!template.scheduleConfig) return false;

  const config = template.scheduleConfig;
  const last = template.lastProvisionedAt;

  // Vérifier le mode de récurrence
  if (!isRecurrenceDue(config, last, now, template, provisionedCount)) {
    return false;
  }

  // Vérifier selon le type de schedule
  switch (config.type) {
    case 'weekly':
      return isWeeklyDue(config, now, last, currentSchoolYear, allSchoolYears);
    case 'monthly':
      return isMonthlyDue(config, now, last, currentSchoolYear, allSchoolYears);
    case 'quarterly':
      return isQuarterlyDue(config, now, last, quarters, currentSchoolYear, allSchoolYears);
    case 'school_year':
      return isSchoolYearDue(config, now, last, currentSchoolYear, allSchoolYears);
    case 'civil_year':
      return isCivilYearDue(config, now, last);
    case 'day_of_week':
      return isDayOfWeekDue(config, now, last, currentSchoolYear, allSchoolYears);
    case 'day_of_month':
      return isDayOfMonthDue(config, now, last, currentSchoolYear, allSchoolYears);
    case 'custom_dates':
      return isCustomDatesDue(config, now, last);
    default:
      return false;
  }
}

/**
 * Vérifie si la récurrence permet le provisioning
 */
function isRecurrenceDue(
  config: ScheduleConfig,
  last: Date | null,
  now: Date,
  template: AssignedPostItTemplate,
  provisionedCount: number = 0,
): boolean {
  const mode = config.recurrence.mode;

  switch (mode) {
    case 'once':
      // Une seule fois : seulement si jamais provisionné
      return !last;

    case 'indefinitely':
      // Indéfiniment : toujours true (logique spécifique au type gère le timing)
      return true;

    case 'n_times':
      // N fois : comparer le nombre de provisions avec la limite configurée
      const count = config.recurrence.count || 1;
      return provisionedCount < count;

    case 'custom_pick':
      // Sélection personnalisée : vérifié dans la logique spécifique au type
      return true;

    default:
      return false;
  }
}

function isWeeklyDue(
  config: ScheduleConfig,
  now: Date,
  last: Date | null,
  currentSchoolYear: SchoolYear | null,
  allSchoolYears: SchoolYear[],
): boolean {
  if (!isWeeklyOptions(config)) return false;
  const opts = config.options;

  // Si weekOfMonth n'est pas configuré, pas de provisioning
  if (!opts.weekOfMonth) {
    return false;
  }

  // Vérifier le scope année
  if (!isWithinYearScope(opts.yearScope, now, currentSchoolYear, allSchoolYears)) {
    return false;
  }

  // Vérifier le mois
  const currentMonth = (now.getMonth() + 1) as any;
  if (opts.targetMonths !== 'all' && !opts.targetMonths.includes(currentMonth)) {
    return false;
  }

  // Vérifier la semaine du mois
  if (opts.weekOfMonth !== 'all') {
    const weekOfMonth = getWeekOfMonth(now);
    if (opts.weekOfMonth !== weekOfMonth && opts.weekOfMonth !== 'last') {
      return false;
    }
  }

  // Vérifier si déjà provisionné cette semaine
  if (last) {
    const weekStart = getWeekStart(now);
    const lastWeekStart = getWeekStart(last);
    if (weekStart.getTime() === lastWeekStart.getTime()) {
      return false;
    }
  }

  return true;
}

function isMonthlyDue(
  config: ScheduleConfig,
  now: Date,
  last: Date | null,
  currentSchoolYear: SchoolYear | null,
  allSchoolYears: SchoolYear[],
): boolean {
  if (!isMonthlyOptions(config)) return false;
  const opts = config.options;

  // Vérifier le scope année
  if (!isWithinYearScope(opts.yearScope, now, currentSchoolYear, allSchoolYears)) {
    return false;
  }

  // Vérifier le mois
  const currentMonth = (now.getMonth() + 1) as any;
  if (opts.targetMonths !== 'all' && !opts.targetMonths.includes(currentMonth)) {
    return false;
  }

  // Vérifier si début du mois et pas déjà provisionné ce mois
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  if (now < monthStart) return false;
  if (!last) return true;
  return last < monthStart;
}

function isQuarterlyDue(
  config: ScheduleConfig,
  now: Date,
  last: Date | null,
  quarters: SchoolYearQuarter[],
  currentSchoolYear: SchoolYear | null,
  allSchoolYears: SchoolYear[],
): boolean {
  if (!isQuarterlyOptions(config)) return false;
  const opts = config.options;

  // Vérifier le scope année
  if (!isWithinYearScope(opts.yearScope, now, currentSchoolYear, allSchoolYears)) {
    return false;
  }

  // Trouver les trimestres pertinents
  const relevantQuarters = quarters.filter((q) => {
    if (opts.targetQuarters === 'all') return true;
    return opts.targetQuarters.includes(q.number as any);
  });

  // Vérifier si on est au début d'un trimestre pertinent
  for (const quarter of relevantQuarters) {
    const qStart = new Date(quarter.startDate);
    if (now >= qStart && (!last || last < qStart)) {
      return true;
    }
  }

  return false;
}

function isSchoolYearDue(
  config: ScheduleConfig,
  now: Date,
  last: Date | null,
  currentSchoolYear: SchoolYear | null,
  allSchoolYears: SchoolYear[],
): boolean {
  if (!isSchoolYearOptions(config)) return false;
  const opts = config.options;

  const targetYears =
    opts.yearScope === 'current_school_year' && currentSchoolYear ? [currentSchoolYear] : allSchoolYears;

  for (const sy of targetYears) {
    const syStart = new Date(sy.startDate);
    if (now >= syStart && (!last || last < syStart)) {
      return true;
    }
  }

  return false;
}

function isCivilYearDue(config: ScheduleConfig, now: Date, last: Date | null): boolean {
  if (!isCivilYearOptions(config)) return false;
  const opts = config.options;

  const currentYearStart = new Date(now.getFullYear(), 0, 1);

  // Vérifier scope
  if (opts.yearScope === 'current_civil_year') {
    const thisYearStart = new Date(new Date().getFullYear(), 0, 1);
    if (currentYearStart.getTime() !== thisYearStart.getTime()) {
      return false;
    }
  }

  // Due si au début de l'année et pas encore provisionné cette année
  if (now >= currentYearStart && (!last || last < currentYearStart)) {
    return true;
  }

  return false;
}

function isDayOfWeekDue(
  config: ScheduleConfig,
  now: Date,
  last: Date | null,
  currentSchoolYear: SchoolYear | null,
  allSchoolYears: SchoolYear[],
): boolean {
  if (!isDayOfWeekOptions(config)) return false;
  const opts = config.options;

  // Vérifier le scope année
  if (!isWithinYearScope(opts.yearScope, now, currentSchoolYear, allSchoolYears)) {
    return false;
  }

  // Vérifier le jour de la semaine
  const dayOfWeek = now.getDay();
  if (!opts.daysOfWeek.includes(dayOfWeek as any)) {
    return false;
  }

  // Vérifier les mois si défini
  if (opts.targetMonths !== undefined && opts.targetMonths !== 'all') {
    const currentMonth = (now.getMonth() + 1) as any;
    if (!opts.targetMonths.includes(currentMonth)) {
      return false;
    }
  }

  // Vérifier les semaines si défini
  if (opts.targetWeeks !== undefined && opts.targetWeeks !== 'all') {
    const weekOfMonth = getWeekOfMonth(now);
    if (!opts.targetWeeks.includes(weekOfMonth as any)) {
      return false;
    }
  }

  // Vérifier si déjà provisionné aujourd'hui
  if (last) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());
    if (today.getTime() === lastDay.getTime()) {
      return false;
    }
  }

  return true;
}

function isDayOfMonthDue(
  config: ScheduleConfig,
  now: Date,
  last: Date | null,
  currentSchoolYear: SchoolYear | null,
  allSchoolYears: SchoolYear[],
): boolean {
  if (!isDayOfMonthOptions(config)) return false;
  const opts = config.options;

  // Vérifier le scope année
  if (!isWithinYearScope(opts.yearScope, now, currentSchoolYear, allSchoolYears)) {
    return false;
  }

  // Vérifier le jour du mois
  if (now.getDate() !== opts.dayNumber) {
    return false;
  }

  // Vérifier les mois
  const currentMonth = (now.getMonth() + 1) as any;
  if (opts.targetMonths !== 'all' && !opts.targetMonths.includes(currentMonth)) {
    return false;
  }

  // Vérifier si déjà provisionné ce jour
  if (last) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());
    if (today.getTime() === lastDay.getTime()) {
      return false;
    }
  }

  return true;
}

function isCustomDatesDue(config: ScheduleConfig, now: Date, last: Date | null): boolean {
  if (!isCustomDatesOptions(config)) return false;
  const opts = config.options;

  const dateFrom = new Date(opts.dateFrom);

  // Vérifier si on est dans la période
  if (now < dateFrom) return false;

  if (opts.dateTo) {
    const dateTo = new Date(opts.dateTo);
    if (now > dateTo) return false;
  }

  // Vérifier le scope année
  if (opts.yearScope === 'current_year') {
    const currentYear = new Date().getFullYear();
    if (now.getFullYear() !== currentYear) return false;
  } else if (opts.yearScope === 'selected_years' && opts.selectedYears) {
    if (!opts.selectedYears.includes(now.getFullYear())) return false;
  }

  // Pour 'indefinitely', on provision chaque année aux mêmes dates
  // Vérifier si pas déjà provisionné pour cette période/année
  if (last && opts.yearScope === 'indefinitely') {
    const lastYear = last.getFullYear();
    const nowYear = now.getFullYear();
    if (lastYear === nowYear) return false;
  } else if (last) {
    return false; // Déjà provisionné
  }

  return true;
}

/**
 * Helpers
 */
function isWithinYearScope(
  scope: string,
  now: Date,
  currentSchoolYear: SchoolYear | null,
  allSchoolYears: SchoolYear[],
): boolean {
  if (scope === 'current_school_year') {
    if (!currentSchoolYear) return false;
    const syStart = new Date(currentSchoolYear.startDate);
    const syEnd = new Date(currentSchoolYear.endDate);
    return now >= syStart && now <= syEnd;
  } else if (scope === 'all_school_years') {
    // Vérifier si dans n'importe quelle année scolaire
    return allSchoolYears.some((sy) => {
      const syStart = new Date(sy.startDate);
      const syEnd = new Date(sy.endDate);
      return now >= syStart && now <= syEnd;
    });
  } else if (scope === 'current_civil_year') {
    return now.getFullYear() === new Date().getFullYear();
  } else if (scope === 'all_civil_years') {
    return true;
  }
  return false;
}

function getWeekOfMonth(date: Date): 1 | 2 | 3 | 4 | 5 {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfMonth = date.getDate();
  const dayOfWeek = firstDay.getDay();
  const weekNumber = Math.ceil((dayOfMonth + dayOfWeek) / 7);
  return Math.min(weekNumber, 5) as 1 | 2 | 3 | 4 | 5;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Lundi comme début de semaine
  return new Date(d.setDate(diff));
}

/**
 * Construit une clé de période pour le nouveau système
 */
export function buildAdvancedPeriodKey(config: ScheduleConfig, now: Date): string {
  const prefix = 'v2_'; // Préfixe pour éviter collision avec anciennes clés

  switch (config.type) {
    case 'weekly': {
      const weekStart = getWeekStart(now);
      return `${prefix}w${weekStart.toISOString().slice(0, 10)}`;
    }
    case 'monthly': {
      return `${prefix}m${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    case 'quarterly': {
      // Utiliser le numéro de trimestre de la BD si disponible
      const month = now.getMonth();
      let trimester: number;
      if (month >= 9) trimester = 1;
      else if (month <= 2) trimester = 2;
      else trimester = 3;
      return `${prefix}q${now.getFullYear()}_t${trimester}`;
    }
    case 'school_year': {
      return `${prefix}sy${now.getFullYear()}`;
    }
    case 'civil_year': {
      return `${prefix}cy${now.getFullYear()}`;
    }
    case 'day_of_week': {
      return `${prefix}dow${now.toISOString().slice(0, 10)}`;
    }
    case 'day_of_month': {
      return `${prefix}dom${now.toISOString().slice(0, 10)}`;
    }
    case 'custom_dates': {
      if (isCustomDatesOptions(config)) {
        return `${prefix}cd${config.options.dateFrom}_${now.getFullYear()}`;
      }
      return `${prefix}cd${now.toISOString().slice(0, 10)}`;
    }
    default:
      return `${prefix}unknown_${now.toISOString().slice(0, 10)}`;
  }
}

/**
 * Calcule la date d'échéance pour un post-it basé sur son scheduleConfig
 * Retourne la fin de la période actuelle (fin de semaine, fin de mois, etc.)
 */
export function calculateDeadlineFromSchedule(
  config: ScheduleConfig,
  now: Date = new Date(),
  schoolYear?: SchoolYear | null,
): Date {
  switch (config.type) {
    case 'weekly': {
      // Fin de la semaine (dimanche 23:59)
      const weekEnd = new Date(now);
      const dayOfWeek = weekEnd.getDay();
      const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      weekEnd.setDate(weekEnd.getDate() + daysUntilSunday);
      weekEnd.setHours(23, 59, 59, 999);
      return weekEnd;
    }
    case 'monthly': {
      // Fin du mois (dernier jour à 23:59)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return monthEnd;
    }
    case 'quarterly': {
      // Fin du trimestre scolaire (2 mois après début du trimestre)
      const month = now.getMonth();
      let quarterEndMonth: number;
      if (month >= 9 || month <= 2) {
        // Trimestre 1 (Sept-Nov) ou Trimestre 2 (Déc-Fév)
        quarterEndMonth = month >= 9 ? 11 : 2; // Nov ou Fév
      } else {
        // Trimestre 3 (Mars-Juin)
        quarterEndMonth = 5; // Juin
      }
      const year = quarterEndMonth < month ? now.getFullYear() + 1 : now.getFullYear();
      return new Date(year, quarterEndMonth + 1, 0, 23, 59, 59, 999);
    }
    case 'school_year': {
      // Fin de l'année scolaire
      if (schoolYear) {
        return new Date(schoolYear.endDate);
      }
      // Fallback: fin juin
      const year = now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
      return new Date(year, 6, 31, 23, 59, 59, 999);
    }
    case 'civil_year': {
      // Fin de l'année civile (31 décembre)
      return new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    }
    case 'day_of_week':
    case 'day_of_month': {
      // Fin de la journée
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      return endOfDay;
    }
    case 'custom_dates': {
      // Utiliser dateTo si disponible, sinon dateFrom + 7 jours
      if (isCustomDatesOptions(config)) {
        if (config.options.dateTo) {
          return new Date(config.options.dateTo);
        }
        const from = new Date(config.options.dateFrom);
        from.setDate(from.getDate() + 7);
        return from;
      }
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
    default:
      // Par défaut: 7 jours à partir de maintenant
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
}
