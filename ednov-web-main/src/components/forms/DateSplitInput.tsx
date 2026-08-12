import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/forms/Select';
import type { SelectOption } from '@/components/forms/Select';
import { cn } from '@/lib/utils';

interface DateSplitInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  state?: 'default' | 'error' | 'success' | 'warning';
  disabled?: boolean;
  required?: boolean;
  minDate?: string;
  maxDate?: string;
  /** Trier les années du plus ancien au plus récent (utile pour les dates de fin) */
  yearSortAsc?: boolean;
}

const FRENCH_MONTHS: SelectOption[] = [
  { value: '01', label: 'Janvier' },
  { value: '02', label: 'Février' },
  { value: '03', label: 'Mars' },
  { value: '04', label: 'Avril' },
  { value: '05', label: 'Mai' },
  { value: '06', label: 'Juin' },
  { value: '07', label: 'Juillet' },
  { value: '08', label: 'Août' },
  { value: '09', label: 'Septembre' },
  { value: '10', label: 'Octobre' },
  { value: '11', label: 'Novembre' },
  { value: '12', label: 'Décembre' },
];

function getDaysInMonth(year: string, month: string): number {
  if (!year || !month) return 31;
  return new Date(parseInt(year), parseInt(month), 0).getDate();
}

function parseDateString(value: string): { day: string; month: string; year: string } {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-');
    return { day, month, year };
  }
  return { day: '', month: '', year: '' };
}

function buildDateString(day: string, month: string, year: string): string {
  if (!day || !month || !year) return '';
  return `${year}-${month}-${day}`;
}

export const DateSplitInput: React.FC<DateSplitInputProps> = ({
  label,
  value,
  onChange,
  onBlur,
  error,
  state,
  disabled,
  required,
  minDate,
  maxDate,
  yearSortAsc = false,
}) => {
  const [parts, setParts] = React.useState(() => parseDateString(value));

  React.useEffect(() => {
    setParts(parseDateString(value));
  }, [value]);

  const effectiveState = error ? 'error' : (state ?? 'default');

  const minParts = React.useMemo(() => {
    if (!minDate) return null;
    const p = parseDateString(minDate);
    return p.year ? p : null;
  }, [minDate]);

  const maxParts = React.useMemo(() => {
    if (!maxDate) return null;
    const p = parseDateString(maxDate);
    return p.year ? p : null;
  }, [maxDate]);

  const currentYear = new Date().getFullYear();

  const yearOptions: SelectOption[] = React.useMemo(() => {
    const upperBound = maxParts ? parseInt(maxParts.year) : currentYear + 1;
    // Pour tri ASC (dates de fin), si pas de minDate on part de l'année courante
    const lowerBound = minParts
      ? parseInt(minParts.year)
      : yearSortAsc
        ? currentYear
        : currentYear - 100;
    const options: SelectOption[] = [];
    if (yearSortAsc) {
      for (let y = lowerBound; y <= upperBound; y++) {
        options.push({ value: String(y), label: String(y) });
      }
    } else {
      for (let y = upperBound; y >= lowerBound; y--) {
        options.push({ value: String(y), label: String(y) });
      }
    }
    return options;
  }, [currentYear, minParts, maxParts, yearSortAsc]);

  const monthOptions: SelectOption[] = React.useMemo(() => {
    return FRENCH_MONTHS.map((m) => {
      const mNum = parseInt(m.value);
      const tooLow =
        minParts && parts.year && parts.year === minParts.year
          ? mNum < parseInt(minParts.month)
          : false;
      const tooHigh =
        maxParts && parts.year && parts.year === maxParts.year
          ? mNum > parseInt(maxParts.month)
          : false;
      return { ...m, disabled: tooLow || tooHigh };
    });
  }, [minParts, maxParts, parts.year]);

  const dayOptions: SelectOption[] = React.useMemo(() => {
    const maxDay = getDaysInMonth(parts.year, parts.month);
    const options: SelectOption[] = [];
    for (let d = 1; d <= maxDay; d++) {
      const dStr = String(d).padStart(2, '0');
      let disabled = false;
      if (minParts && parts.year && parts.month) {
        const isMinYear = parts.year === minParts.year;
        const isMinMonth = parts.month === minParts.month;
        if (isMinYear && isMinMonth && d < parseInt(minParts.day)) disabled = true;
      }
      if (maxParts && parts.year && parts.month) {
        const isMaxYear = parts.year === maxParts.year;
        const isMaxMonth = parts.month === maxParts.month;
        if (isMaxYear && isMaxMonth && d > parseInt(maxParts.day)) disabled = true;
      }
      options.push({ value: dStr, label: String(d), disabled });
    }
    return options;
  }, [parts.year, parts.month, minParts, maxParts]);

  const handleYearChange = (year: string) => {
    const newParts = { ...parts, year };
    const maxDay = getDaysInMonth(year, newParts.month);
    if (newParts.day && parseInt(newParts.day) > maxDay) {
      newParts.day = '';
    }
    setParts(newParts);
    onChange(buildDateString(newParts.day, newParts.month, newParts.year));
  };

  const handleMonthChange = (month: string) => {
    const newParts = { ...parts, month };
    const maxDay = getDaysInMonth(newParts.year, month);
    if (newParts.day && parseInt(newParts.day) > maxDay) {
      newParts.day = '';
    }
    setParts(newParts);
    onChange(buildDateString(newParts.day, newParts.month, newParts.year));
  };

  const handleDayChange = (day: string) => {
    const newParts = { ...parts, day };
    setParts(newParts);
    onChange(buildDateString(newParts.day, newParts.month, newParts.year));
  };

  const labelId = `date-split-${label?.toLowerCase().replaceAll(/\s+/g, '-') ?? 'input'}`;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <Label htmlFor={labelId} className={cn('form-label', required && 'form-label-required')}>
          {label}
        </Label>
      )}
      <div className="grid grid-cols-3 gap-2">
        <Select
          placeholder="Jour"
          options={dayOptions}
          value={parts.day}
          onChange={handleDayChange}
          onBlur={onBlur}
          disabled={disabled}
          state={effectiveState}
          className="space-y-0"
          contentClassName="max-h-44 overflow-y-auto"
        />
        <Select
          placeholder="Mois"
          options={monthOptions}
          value={parts.month}
          onChange={handleMonthChange}
          onBlur={onBlur}
          disabled={disabled}
          state={effectiveState}
          className="space-y-0"
          contentClassName="max-h-44 overflow-y-auto"
        />
        <Select
          placeholder="Année"
          options={yearOptions}
          value={parts.year}
          onChange={handleYearChange}
          onBlur={onBlur}
          disabled={disabled}
          state={effectiveState}
          className="space-y-0"
          contentClassName="max-h-60 overflow-y-auto"
        />
      </div>
      {error && (
        <p className="form-error-text" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
