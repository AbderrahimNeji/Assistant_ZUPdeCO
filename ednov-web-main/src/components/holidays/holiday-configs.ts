import { Globe, MapPin, Building2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Holiday } from '@/types/holiday.types';

type BadgeVariant = 'ghost' | 'outlined' | 'solid' | 'active' | 'disabled' | 'on-hold';

/**
 * Configuration des types de vacances
 */
export interface HolidayTypeConfig {
  label: string;
  icon: LucideIcon;
  badgeVariant: BadgeVariant;
  badgeColor: string;
  colorName: 'color-1' | 'color-2' | 'color-3';
}

export const HOLIDAY_TYPE_CONFIG: Record<string, HolidayTypeConfig> = {
  national: {
    label: 'National',
    icon: Globe,
    badgeVariant: 'outlined',
    badgeColor: 'var(--color-2-nuance-1)',
    colorName: 'color-2',
  },
  regional: {
    label: 'Régional',
    icon: MapPin,
    badgeVariant: 'outlined',
    badgeColor: 'var(--color-1-nuance-1)',
    colorName: 'color-1',
  },
  establishment_specific: {
    label: 'Spécifique établissement',
    icon: Building2,
    badgeVariant: 'outlined',
    badgeColor: 'var(--color-3-nuance-1)',
    colorName: 'color-3',
  },
};

export interface HolidayFilters {
  types: string[];
  dateRange?: 'all' | 'week' | 'month' | 'year';
  customDateFrom?: Date;
  customDateTo?: Date;
}

export const DEFAULT_HOLIDAY_FILTERS: HolidayFilters = {
  types: [],
  dateRange: 'all',
  customDateFrom: undefined,
  customDateTo: undefined,
};

export type FilterGroupId = 'filter-type' | 'filter-periode' | 'filter-date-range';

export const ALL_FILTER_GROUP_IDS: FilterGroupId[] = [
  'filter-type',
  'filter-periode',
  'filter-date-range',
];

export { ITEMS_PER_PAGE, ITEMS_PER_PAGE_SECTION } from '@/lib/data-table-page-size';

export const FILTER_GROUP_LABELS: Record<FilterGroupId, string> = {
  'filter-type': 'Type',
  'filter-periode': 'Période',
  'filter-date-range': 'Date personnalisée',
};

export const filterHoliday = (
  holiday: { type: string; startDate: Date; endDate: Date },
  filters: HolidayFilters,
): boolean => {
  if (filters.types.length > 0 && !filters.types.includes(holiday.type)) {
    return false;
  }

  if (filters.customDateFrom && new Date(holiday.startDate) < filters.customDateFrom) {
    return false;
  }
  if (filters.customDateTo && new Date(holiday.endDate) > filters.customDateTo) {
    return false;
  }

  return true;
};

/** Texte récapitulatif des options (récurrence, établissement) — aligné export Excel. */
export function formatHolidayOptionsText(
  holiday: Pick<Holiday, 'isRecurringYearly' | 'establishmentName'>,
): string {
  const parts: string[] = [];
  parts.push(holiday.isRecurringYearly ? 'Récurrent chaque année' : 'Non récurrent');
  const est = holiday.establishmentName?.trim();
  if (est) parts.push(`Établissement : ${est}`);
  return parts.join('; ');
}
