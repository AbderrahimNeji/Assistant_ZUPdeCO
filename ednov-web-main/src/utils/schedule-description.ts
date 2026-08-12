import type {
  ScheduleConfig,
  WeeklyOptions,
  MonthlyOptions,
  QuarterlyOptions,
  SchoolYearOptions,
  CivilYearOptions,
  DayOfWeekOptions,
  DayOfMonthOptions,
  CustomDatesOptions,
  MonthNumber,
} from '../types/post-it.types';

const MONTH_NAMES = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

const DAY_NAMES = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

/**
 * Génère une description en langage naturel d'une configuration de planification
 */
export function describeSchedule(config: ScheduleConfig): string {
  const typeDescription = getTypeDescription(config);
  const recurrenceDescription = getRecurrenceDescription(config);

  if (recurrenceDescription) {
    return `Ce post-it s'affichera ${typeDescription}, ${recurrenceDescription}.`;
  }
  return `Ce post-it s'affichera ${typeDescription}.`;
}

function getTypeDescription(config: ScheduleConfig): string {
  switch (config.type) {
    case 'weekly':
      return describeWeekly(config.options as WeeklyOptions);
    case 'monthly':
      return describeMonthly(config.options as MonthlyOptions);
    case 'quarterly':
      return describeQuarterly(config.options as QuarterlyOptions);
    case 'school_year':
      return describeSchoolYear(config.options as SchoolYearOptions);
    case 'civil_year':
      return describeCivilYear(config.options as CivilYearOptions);
    case 'day_of_week':
      return describeDayOfWeek(config.options as DayOfWeekOptions);
    case 'day_of_month':
      return describeDayOfMonth(config.options as DayOfMonthOptions);
    case 'custom_dates':
      return describeCustomDates(config.options as CustomDatesOptions);
    default:
      return 'selon une planification non définie';
  }
}

function describeWeekly(opts: WeeklyOptions): string {
  let desc = '';

  if (!opts.weekOfMonth) {
    return 'hebdomadaire (configuration incomplète)';
  }

  if (opts.weekOfMonth === 'all') {
    desc = 'chaque semaine';
  } else if (opts.weekOfMonth === 'last') {
    desc = 'la dernière semaine';
  } else {
    const ordinal = getOrdinal(opts.weekOfMonth);
    desc = `la ${ordinal} semaine`;
  }

  if (opts.targetMonths !== 'all') {
    if (opts.targetMonths.length === 0) {
      return desc + ' (aucun mois sélectionné)';
    }
    const months = opts.targetMonths.map((m) => MONTH_NAMES[m - 1]).join(', ');
    desc += ` de ${months}`;
  } else {
    desc += ' de chaque mois';
  }

  return desc;
}

function describeMonthly(opts: MonthlyOptions): string {
  let desc = '';

  if (opts.targetMonths === 'all') {
    desc = 'chaque mois';
  } else {
    if (opts.targetMonths.length === 0) {
      return 'mensuel (aucun mois sélectionné)';
    }
    const months = opts.targetMonths.map((m) => MONTH_NAMES[m - 1]).join(', ');
    desc = `en ${months}`;
  }

  return desc;
}

function describeQuarterly(opts: QuarterlyOptions): string {
  let desc = 'au début ';

  if (opts.targetQuarters === 'all') {
    desc += 'de chaque trimestre';
  } else {
    if (opts.targetQuarters.length === 0) {
      return 'trimestriel (aucun trimestre sélectionné)';
    }
    const quarters = opts.targetQuarters.map((q) => `${getOrdinal(q)} trimestre`).join(' et du ');
    desc += `du ${quarters}`;
  }

  return desc;
}

function describeSchoolYear(opts: SchoolYearOptions): string {
  const scope =
    opts.yearScope === 'current_school_year'
      ? "de l'année scolaire en cours"
      : 'de chaque année scolaire';
  return `au début ${scope}`;
}

function describeCivilYear(opts: CivilYearOptions): string {
  const scope =
    opts.yearScope === 'current_civil_year'
      ? "de l'année civile en cours"
      : 'de chaque année civile';
  return `au début ${scope}`;
}

function describeDayOfWeek(opts: DayOfWeekOptions): string {
  if (opts.daysOfWeek.length === 0) {
    return 'chaque jour de la semaine (aucun jour sélectionné)';
  }

  const days = opts.daysOfWeek.map((d) => DAY_NAMES[d]).join(', ');
  let desc = `chaque ${days}`;

  if (opts.targetMonths && opts.targetMonths !== 'all') {
    const months = opts.targetMonths.map((m) => MONTH_NAMES[m - 1]).join(', ');
    desc += ` de ${months}`;
  }

  if (opts.targetWeeks && opts.targetWeeks !== 'all') {
    const weeks = opts.targetWeeks.map((w) => getOrdinal(w as number)).join(', ');
    desc += ` (${weeks} semaine${opts.targetWeeks.length > 1 ? 's' : ''} du mois)`;
  }

  return desc;
}

function describeDayOfMonth(opts: DayOfMonthOptions): string {
  let desc = `le ${opts.dayNumber}`;

  if (opts.targetMonths === 'all') {
    desc += ' de chaque mois';
  } else {
    if (opts.targetMonths.length === 0) {
      return `le ${opts.dayNumber} du mois (aucun mois sélectionné)`;
    }
    const months = opts.targetMonths.map((m) => MONTH_NAMES[m - 1]).join(', ');
    desc += ` de ${months}`;
  }

  return desc;
}

function describeCustomDates(opts: CustomDatesOptions): string {
  if (!opts.dateFrom || opts.dateFrom.trim() === '') {
    return 'dates à configurer';
  }

  const from = new Date(opts.dateFrom).toLocaleDateString('fr-FR');
  const to = opts.dateTo ? new Date(opts.dateTo).toLocaleDateString('fr-FR') : null;

  let desc = `du ${from}`;
  if (to) {
    desc += ` au ${to}`;
  }

  if (opts.yearScope === 'current_year') {
    desc += ' de cette année';
  } else if (opts.yearScope === 'selected_years' && opts.selectedYears) {
    desc += ` pour les années ${opts.selectedYears.join(', ')}`;
  } else if (opts.yearScope === 'indefinitely') {
    desc += ' chaque année';
  }

  return desc;
}

function getRecurrenceDescription(config: ScheduleConfig): string {
  const mode = config.recurrence.mode;

  switch (mode) {
    case 'once':
      return 'une seule fois';
    case 'indefinitely':
      return 'indéfiniment';
    case 'n_times':
      if (!config.recurrence.count) {
        return 'N occurrences (à préciser)';
      }
      return `pour les ${config.recurrence.count} prochaines fois`;
    case 'custom_pick': {
      const count = config.recurrence.pickedKeys?.length || 0;
      return `pour ${count} occurrence${count > 1 ? 's' : ''} sélectionnée${count > 1 ? 's' : ''}`;
    }
    default:
      return '';
  }
}

function getScopeDescription(scope: string): string {
  switch (scope) {
    case 'current_school_year':
      return "de l'année scolaire en cours";
    case 'all_school_years':
      return 'de chaque année scolaire';
    case 'current_civil_year':
      return "de l'année civile en cours";
    case 'all_civil_years':
      return 'de chaque année civile';
    default:
      return '';
  }
}

/**
 * Génère une description courte d'une configuration de planification (pour badges / résumés)
 */
export function describeScheduleShort(config: ScheduleConfig): string {
  switch (config.type) {
    case 'weekly':
      return 'Hebdo';
    case 'monthly':
      return 'Mensuel';
    case 'quarterly':
      return 'Trimestriel';
    case 'school_year':
      return 'Année scolaire';
    case 'civil_year':
      return 'Année civile';
    case 'day_of_week':
      return 'Jour de semaine';
    case 'day_of_month':
      return 'Jour du mois';
    case 'custom_dates':
      return 'Dates spécifiques';
    default:
      return 'Planification';
  }
}

function getOrdinal(n: number): string {
  if (n === 1) return '1re';
  return `${n}e`;
}
