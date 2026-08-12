import type { ScheduleType, PostItColor } from '../../../types/post-it.types';
import { cn } from '@/lib/utils';
import { getScheduleChipClasses, BORDER_COLOR_MAP } from '../postit-config';

interface ScheduleTypePickerProps {
  value: ScheduleType | null;
  onChange: (type: ScheduleType) => void;
  color?: PostItColor;
}

const SCHEDULE_TYPES: Array<{
  value: ScheduleType;
  label: string;
  icon: string;
}> = [
  { value: 'weekly', label: 'Hebdomadaire', icon: '📅' },
  { value: 'monthly', label: 'Mensuel', icon: '📆' },
  { value: 'quarterly', label: 'Trimestriel', icon: '🗓️' },
  { value: 'school_year', label: 'Année scolaire', icon: '🎓' },
  { value: 'civil_year', label: 'Année civile', icon: '🎉' },
  { value: 'day_of_week', label: 'Jour/semaine', icon: '📍' },
  { value: 'day_of_month', label: 'Jour/mois', icon: '📌' },
  { value: 'custom_dates', label: 'Dates libres', icon: '🗓' },
];

export function ScheduleTypePicker({ value, onChange, color = 'jaune' }: ScheduleTypePickerProps) {
  const borderColor = BORDER_COLOR_MAP[color] || BORDER_COLOR_MAP.jaune;
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">
        Type de planification
      </p>
      <div className="flex flex-wrap gap-1.5">
        {SCHEDULE_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => onChange(type.value)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border transition-all',
              borderColor,
              getScheduleChipClasses(color, value === type.value),
              value === type.value && 'shadow-sm',
            )}
          >
            <span>{type.icon}</span>
            <span>{type.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
