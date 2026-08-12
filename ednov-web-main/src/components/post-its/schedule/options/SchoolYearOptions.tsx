import type {
  SchoolYearOptions as SchoolYearOptionsType,
  PostItColor,
} from '../../../../types/post-it.types';
import { cn } from '@/lib/utils';
import { TEXT_COLOR_MAP, BORDER_COLOR_MAP, getScheduleChipClasses } from '../../postit-config';

interface SchoolYearOptionsProps {
  value: SchoolYearOptionsType;
  onChange: (value: SchoolYearOptionsType) => void;
  color?: PostItColor;
}

const YEAR_SCOPES = [
  { value: 'current_school_year' as const, label: 'Année scolaire en cours' },
  { value: 'all_school_years' as const, label: 'Toutes les années scolaires' },
];

export function SchoolYearOptions({ value, onChange, color = 'jaune' }: SchoolYearOptionsProps) {
  const textColor = TEXT_COLOR_MAP[color] || TEXT_COLOR_MAP.jaune;
  const borderColor = BORDER_COLOR_MAP[color] || BORDER_COLOR_MAP.jaune;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <p className={cn('text-xs opacity-60', textColor)}>
          Ce post-it sera automatiquement assigné chaque année scolaire (septembre à août).
        </p>
      </div>

      <div className="space-y-1">
        <p className={cn('text-xs font-medium', textColor)}>Portée temporelle</p>
        <div className="flex flex-wrap gap-1">
          {YEAR_SCOPES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => onChange({ ...value, yearScope: s.value })}
              className={cn(
                'px-2 py-1 rounded text-xs border transition-all',
                borderColor,
                getScheduleChipClasses(color, value.yearScope === s.value),
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
