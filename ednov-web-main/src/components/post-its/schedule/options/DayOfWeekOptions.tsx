import type {
  DayOfWeekOptions as DayOfWeekOptionsType,
  DayOfWeek,
  YearScope,
  PostItColor,
} from '../../../../types/post-it.types';
import { cn } from '@/lib/utils';
import { TEXT_COLOR_MAP, BORDER_COLOR_MAP, getScheduleChipClasses } from '../../postit-config';

interface DayOfWeekOptionsProps {
  value: DayOfWeekOptionsType;
  onChange: (value: DayOfWeekOptionsType) => void;
  color?: PostItColor;
}

const DAYS: Array<{ value: DayOfWeek; label: string }> = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Jeu' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sam' },
  { value: 0, label: 'Dim' },
];

export function DayOfWeekOptions({ value, onChange, color = 'jaune' }: DayOfWeekOptionsProps) {
  const textColor = TEXT_COLOR_MAP[color] || TEXT_COLOR_MAP.jaune;
  const borderColor = BORDER_COLOR_MAP[color] || BORDER_COLOR_MAP.jaune;

  const handleDayToggle = (day: DayOfWeek) => {
    const current = value.daysOfWeek || [];
    const updated = current.includes(day) ? current.filter((d) => d !== day) : [...current, day];
    onChange({ ...value, daysOfWeek: updated });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className={cn('text-xs font-medium', textColor)}>Jours de la semaine</p>
        <div className="flex flex-wrap gap-1">
          {DAYS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => handleDayToggle(d.value)}
              className={cn(
                'w-10 py-1 rounded text-xs border transition-all',
                borderColor,
                getScheduleChipClasses(color, value.daysOfWeek?.includes(d.value) || false),
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
