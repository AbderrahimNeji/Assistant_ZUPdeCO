import { useState } from 'react';
import type {
  CustomDatesOptions as CustomDatesOptionsType,
  PostItColor,
} from '../../../../types/post-it.types';
import { cn } from '@/lib/utils';
import { TEXT_COLOR_MAP, BORDER_COLOR_MAP, getScheduleChipClasses } from '../../postit-config';
import { X } from 'lucide-react';

interface CustomDatesOptionsProps {
  value: CustomDatesOptionsType;
  onChange: (value: CustomDatesOptionsType) => void;
  color?: PostItColor;
}

const YEAR_SCOPES = [
  { value: 'current_year', label: 'Année en cours' },
  { value: 'selected_years', label: 'Années spécifiques' },
  { value: 'indefinitely', label: 'Indéfiniment' },
];

export function CustomDatesOptions({ value, onChange, color = 'jaune' }: CustomDatesOptionsProps) {
  const textColor = TEXT_COLOR_MAP[color] || TEXT_COLOR_MAP.jaune;
  const borderColor = BORDER_COLOR_MAP[color] || BORDER_COLOR_MAP.jaune;

  const [newYear, setNewYear] = useState('');

  const handleAddYear = () => {
    const year = Number.parseInt(newYear, 10);
    if (year >= 2020 && year <= 2100) {
      const current = value.selectedYears || [];
      if (!current.includes(year)) {
        onChange({ ...value, selectedYears: [...current, year].sort() });
      }
      setNewYear('');
    }
  };

  const handleRemoveYear = (year: number) => {
    onChange({ ...value, selectedYears: (value.selectedYears || []).filter((y) => y !== year) });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <p className={cn('text-xs font-medium', textColor)}>Date de début</p>
          <input
            type="date"
            value={value.dateFrom}
            onChange={(e) => onChange({ ...value, dateFrom: e.target.value })}
            className={cn(
              'w-full px-2 py-1 rounded border bg-white/5 text-xs focus:outline-none focus:border-current',
              borderColor,
              textColor,
            )}
          />
        </div>
        <div className="space-y-1">
          <p className={cn('text-xs font-medium', textColor)}>Date de fin (optionnel)</p>
          <input
            type="date"
            value={value.dateTo || ''}
            onChange={(e) => onChange({ ...value, dateTo: e.target.value || undefined })}
            className={cn(
              'w-full px-2 py-1 rounded border bg-white/5 text-xs focus:outline-none focus:border-current',
              borderColor,
              textColor,
            )}
          />
        </div>
      </div>

      <div className="space-y-1">
        <p className={cn('text-xs font-medium', textColor)}>Portée</p>
        <div className="flex flex-wrap gap-1">
          {YEAR_SCOPES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() =>
                onChange({ ...value, yearScope: s.value as CustomDatesOptionsType['yearScope'] })
              }
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

      {value.yearScope === 'selected_years' && (
        <div className="space-y-1.5">
          <p className={cn('text-xs font-medium', textColor)}>Années sélectionnées</p>
          <div className="flex gap-1.5">
            <input
              type="number"
              min="2020"
              max="2100"
              placeholder="2025"
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddYear()}
              className={cn(
                'w-20 px-2 py-1 rounded border bg-white/5 text-xs focus:outline-none focus:border-current',
                borderColor,
                textColor,
              )}
            />
            <button
              type="button"
              onClick={handleAddYear}
              className={cn(
                'px-2 py-1 rounded border bg-white/10 text-xs hover:bg-white/15 transition-all',
                borderColor,
                textColor,
              )}
            >
              Ajouter
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {(value.selectedYears || []).map((year) => (
              <span
                key={year}
                className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 border text-xs',
                  borderColor,
                  textColor,
                )}
              >
                {year}
                <button
                  type="button"
                  onClick={() => handleRemoveYear(year)}
                  className="opacity-60 hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
