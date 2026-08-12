import type {
  MonthlyOptions as MonthlyOptionsType,
  MonthNumber,
  YearScope,
  PostItColor,
} from '../../../../types/post-it.types';
import { cn } from '@/lib/utils';
import { TEXT_COLOR_MAP, BORDER_COLOR_MAP, getScheduleChipClasses } from '../../postit-config';

interface MonthlyOptionsProps {
  value: MonthlyOptionsType;
  onChange: (value: MonthlyOptionsType) => void;
  color?: PostItColor;
}

const MONTHS = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Fév' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Avr' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Juin' },
  { value: 7, label: 'Juil' },
  { value: 8, label: 'Août' },
  { value: 9, label: 'Sep' },
  { value: 10, label: 'Oct' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Déc' },
];

export function MonthlyOptions({ value, onChange, color = 'jaune' }: MonthlyOptionsProps) {
  const textColor = TEXT_COLOR_MAP[color] || TEXT_COLOR_MAP.jaune;
  const borderColor = BORDER_COLOR_MAP[color] || BORDER_COLOR_MAP.jaune;

  const handleMonthToggle = (month: MonthNumber) => {
    const allMonths: MonthNumber[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const current = value.targetMonths === 'all' ? allMonths : value.targetMonths;
    const updated = current.includes(month)
      ? current.filter((m) => m !== month)
      : [...current, month];
    onChange({ ...value, targetMonths: updated.length === 12 ? 'all' : updated });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <p className={cn('text-xs font-medium', textColor)}>Mois ciblés</p>
          <button
            type="button"
            onClick={() =>
              onChange({ ...value, targetMonths: value.targetMonths === 'all' ? [] : 'all' })
            }
            className={cn(
              'text-xs px-2 py-0.5 rounded border transition-all',
              borderColor,
              getScheduleChipClasses(color, value.targetMonths === 'all'),
            )}
          >
            Tous
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          {MONTHS.map((m) => {
            const active =
              value.targetMonths === 'all' || value.targetMonths.includes(m.value as MonthNumber);
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => handleMonthToggle(m.value as MonthNumber)}
                className={cn(
                  'w-9 py-1 rounded text-xs border transition-all',
                  borderColor,
                  getScheduleChipClasses(color, active),
                )}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
