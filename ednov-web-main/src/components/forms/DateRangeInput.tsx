import * as React from 'react';
import { DatePicker } from './DatePicker';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import {
  addDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
} from 'date-fns';

interface DateRangePreset {
  label: string;
  getValue: () => { start: string; end: string };
}

interface DateRangeInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  startDate?: string;
  endDate?: string;
  onStartDateChange?: (date: string) => void;
  onEndDateChange?: (date: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  layout?: 'horizontal' | 'vertical';
  showConnector?: boolean;
  showPresets?: boolean;
  presets?: DateRangePreset[];
  disablePast?: boolean;
  startMinDate?: string;
  endMaxDate?: string;
  hidePickerLabels?: boolean;
  compact?: boolean;
}

const defaultPresets: DateRangePreset[] = [
  {
    label: "Aujourd'hui",
    getValue: () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      return { start: today, end: today };
    },
  },
  {
    label: '7 derniers jours',
    getValue: () => ({
      start: format(addDays(new Date(), -6), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd'),
    }),
  },
  {
    label: 'Cette semaine',
    getValue: () => ({
      start: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      end: format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    }),
  },
  {
    label: 'Ce mois',
    getValue: () => ({
      start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    }),
  },
  {
    label: 'Mois dernier',
    getValue: () => ({
      start: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
      end: format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
    }),
  },
];

export const DateRangeInput: React.FC<DateRangeInputProps> = ({
  label,
  error,
  helperText,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  required,
  disabled,
  className,
  layout = 'horizontal',
  showConnector = true,
  showPresets = false,
  presets = defaultPresets,
  disablePast = false,
  startMinDate,
  endMaxDate,
  hidePickerLabels = false,
  compact = false,
}) => {
  const [activePreset, setActivePreset] = React.useState<string | null>(null);
  const [startPickerOpen, setStartPickerOpen] = React.useState(false);
  const [endPickerOpen, setEndPickerOpen] = React.useState(false);

  const handlePresetClick = (preset: DateRangePreset) => {
    const { start, end } = preset.getValue();
    onStartDateChange?.(start);
    onEndDateChange?.(end);
    setActivePreset(preset.label);
  };

  const hasValidRange = startDate && endDate;

  return (
    <div className={cn('w-full', !compact && 'space-y-3', className)}>
      {label && <p className={cn('form-label', required && 'form-label-required')}>{label}</p>}

      {showPresets && (
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handlePresetClick(preset)}
              disabled={disabled}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-medium border-[1.5px] transition-all duration-200',
                'hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed',
                activePreset === preset.label
                  ? 'bg-[linear-gradient(135deg,var(--color-2-nuance-1),var(--color-2-nuance-2))] border-[var(--color-2-nuance-1)] text-white shadow-sm'
                  : 'border-[color-mix(in_srgb,var(--color-1-nuance-3)_50%,transparent)] bg-transparent text-foreground hover:border-[var(--color-1-nuance-2)]',
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      <div
        className={cn(
          'relative',
          layout === 'horizontal'
            ? `grid grid-cols-1 md:grid-cols-2 ${compact ? 'gap-2' : 'gap-4'}`
            : 'space-y-4',
        )}
      >
        <DatePicker
          label={hidePickerLabels ? undefined : 'Date de début'}
          value={startDate}
          onChange={(val) => {
            onStartDateChange?.(val);
            setActivePreset(null);
            if (!endDate) {
              setEndPickerOpen(true);
            }
          }}
          minDate={startMinDate}
          maxDate={endDate}
          required={required}
          disabled={disabled}
          error={error}
          disablePast={disablePast}
          inputSize={compact ? 'sm' : 'md'}
          isOpen={startPickerOpen}
          onOpenChange={setStartPickerOpen}
        />

        {showConnector && layout === 'horizontal' && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden md:flex">
            <div
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-full',
                'border-[1.5px] shadow-md transition-all duration-300',
                hasValidRange
                  ? 'bg-[var(--color-2-nuance-1)] border-[var(--color-2-nuance-1)] animate-pulse'
                  : 'bg-background border-[color-mix(in_srgb,var(--color-1-nuance-3)_50%,transparent)]',
              )}
            >
              <ArrowRight
                className={cn(
                  'h-5 w-5 transition-colors duration-300',
                  hasValidRange ? 'text-white' : 'text-[var(--color-1-nuance-1)]',
                )}
              />
            </div>
          </div>
        )}

        <DatePicker
          label={hidePickerLabels ? undefined : 'Date de fin'}
          value={endDate}
          onChange={(val) => {
            onEndDateChange?.(val);
            setActivePreset(null);
            if (!startDate) {
              setStartPickerOpen(true);
            }
          }}
          minDate={startDate}
          maxDate={endMaxDate}
          required={required}
          disabled={disabled}
          inputSize={compact ? 'sm' : 'md'}
          isOpen={endPickerOpen}
          onOpenChange={setEndPickerOpen}
        />
      </div>

      {helperText && !error && <p className="form-helper-text">{helperText}</p>}
    </div>
  );
};
