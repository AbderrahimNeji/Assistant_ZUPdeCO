import type {
  QuarterlyOptions as QuarterlyOptionsType,
  QuarterNumber,
  YearScope,
  PostItColor,
} from '../../../../types/post-it.types';
import { cn } from '@/lib/utils';
import { TEXT_COLOR_MAP, BORDER_COLOR_MAP, getScheduleChipClasses } from '../../postit-config';

interface QuarterlyOptionsProps {
  value: QuarterlyOptionsType;
  onChange: (value: QuarterlyOptionsType) => void;
  color?: PostItColor;
}

const QUARTERS: Array<{ value: QuarterNumber; label: string }> = [
  { value: 1, label: 'T1' },
  { value: 2, label: 'T2' },
  { value: 3, label: 'T3' },
  { value: 4, label: 'T4' } as const,
];

export function QuarterlyOptions({ value, onChange, color = 'jaune' }: QuarterlyOptionsProps) {
  const textColor = TEXT_COLOR_MAP[color] || TEXT_COLOR_MAP.jaune;
  const borderColor = BORDER_COLOR_MAP[color] || BORDER_COLOR_MAP.jaune;

  const handleQuarterToggle = (quarter: QuarterNumber) => {
    const current = value.targetQuarters === 'all' ? [] : value.targetQuarters;
    const updated = current.includes(quarter)
      ? current.filter((q) => q !== quarter)
      : [...current, quarter];
    onChange({ ...value, targetQuarters: updated.length === 4 ? 'all' : updated });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <p className={cn('text-xs font-medium', textColor)}>Trimestres ciblés</p>
          <button
            type="button"
            onClick={() =>
              onChange({ ...value, targetQuarters: value.targetQuarters === 'all' ? [] : 'all' })
            }
            className={cn(
              'text-xs px-2 py-0.5 rounded border transition-all',
              borderColor,
              getScheduleChipClasses(color, value.targetQuarters === 'all'),
            )}
          >
            Tous
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          {QUARTERS.map((q) => {
            const active = value.targetQuarters === 'all' || value.targetQuarters.includes(q.value);
            return (
              <button
                key={q.value}
                type="button"
                onClick={() => handleQuarterToggle(q.value)}
                className={cn(
                  'w-12 py-1 rounded text-xs border transition-all',
                  borderColor,
                  getScheduleChipClasses(color, active),
                )}
              >
                {q.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
