import { useState } from 'react';
import type { ScheduleConfig, ScheduleType, PostItColor } from '../../../types/post-it.types';
import { ScheduleTypePicker } from './ScheduleTypePicker';
import { WeeklyOptions } from './options/WeeklyOptions';
import { MonthlyOptions } from './options/MonthlyOptions';
import { QuarterlyOptions } from './options/QuarterlyOptions';
import { SchoolYearOptions } from './options/SchoolYearOptions';
import { CivilYearOptions } from './options/CivilYearOptions';
import { DayOfWeekOptions } from './options/DayOfWeekOptions';
import { DayOfMonthOptions } from './options/DayOfMonthOptions';
import { CustomDatesOptions } from './options/CustomDatesOptions';
import { RecurrenceConfig } from './RecurrenceConfig';
import { ScheduleSummary } from './ScheduleSummary';
import { CalendarClock, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TEXT_COLOR_MAP, ICON_COLOR_MAP, BORDER_COLOR_MAP } from '../postit-config';

interface PostItScheduleConfigFormProps {
  value: ScheduleConfig | null;
  onChange: (config: ScheduleConfig | null) => void;
  templateId?: string;
  color?: PostItColor;
}

const DEFAULT_OPTIONS: Record<ScheduleType, object> = {
  weekly: { targetMonths: [], yearScope: 'current_school_year' },
  monthly: { targetMonths: [], yearScope: 'current_school_year' },
  quarterly: { targetQuarters: [], yearScope: 'current_school_year' },
  school_year: { yearScope: 'current_school_year' },
  civil_year: { yearScope: 'current_civil_year' },
  day_of_week: { daysOfWeek: [], yearScope: 'current_school_year' },
  day_of_month: { dayNumber: 1, targetMonths: [], yearScope: 'current_school_year' },
  custom_dates: { dateFrom: '', yearScope: 'current_year' },
};

export function PostItScheduleConfigForm({
  value,
  onChange,
  templateId,
  color = 'jaune',
}: PostItScheduleConfigFormProps) {
  const [open, setOpen] = useState(!!value);

  const textColor = TEXT_COLOR_MAP[color] || TEXT_COLOR_MAP.jaune;
  const iconColor = ICON_COLOR_MAP[color] || ICON_COLOR_MAP.jaune;
  const borderColor = BORDER_COLOR_MAP[color] || BORDER_COLOR_MAP.jaune;

  const handleTypeChange = (type: ScheduleType) => {
    const newConfig: ScheduleConfig = {
      type,
      options: DEFAULT_OPTIONS[type] as ScheduleConfig['options'],
      recurrence: { mode: 'indefinitely' },
    };
    onChange(newConfig);
  };

  const handleOptionsChange = (options: ScheduleConfig['options']) => {
    if (!value) return;
    onChange({ ...value, options });
  };

  const handleRecurrenceChange = (recurrence: ScheduleConfig['recurrence']) => {
    if (!value) return;
    onChange({ ...value, recurrence });
  };

  const handleClear = () => {
    onChange(null);
  };

  const renderOptions = () => {
    if (!value) return null;
    switch (value.type) {
      case 'weekly':
        return (
          <WeeklyOptions
            value={value.options as any}
            onChange={handleOptionsChange}
            color={color}
          />
        );
      case 'monthly':
        return (
          <MonthlyOptions
            value={value.options as any}
            onChange={handleOptionsChange}
            color={color}
          />
        );
      case 'quarterly':
        return (
          <QuarterlyOptions
            value={value.options as any}
            onChange={handleOptionsChange}
            color={color}
          />
        );
      case 'school_year':
        return (
          <SchoolYearOptions
            value={value.options as any}
            onChange={handleOptionsChange}
            color={color}
          />
        );
      case 'civil_year':
        return (
          <CivilYearOptions
            value={value.options as any}
            onChange={handleOptionsChange}
            color={color}
          />
        );
      case 'day_of_week':
        return (
          <DayOfWeekOptions
            value={value.options as any}
            onChange={handleOptionsChange}
            color={color}
          />
        );
      case 'day_of_month':
        return (
          <DayOfMonthOptions
            value={value.options as any}
            onChange={handleOptionsChange}
            color={color}
          />
        );
      case 'custom_dates':
        return (
          <CustomDatesOptions
            value={value.options as any}
            onChange={handleOptionsChange}
            color={color}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={cn('rounded-xl border overflow-hidden', borderColor)}>
      {/* Header — toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-white/5 transition-colors',
          textColor,
        )}
      >
        <div className="flex items-center gap-2">
          <CalendarClock className={cn('w-4 h-4 flex-shrink-0', iconColor)} />
          <span className="text-sm font-medium">Planification avancée</span>
          {value && (
            <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-semibold uppercase tracking-wide">
              Configuré
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-1 rounded hover:bg-white/10 transition-colors opacity-50 hover:opacity-100"
              title="Supprimer la planification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={cn('w-4 h-4 opacity-40 transition-transform', open && 'rotate-180')}
          />
        </div>
      </button>

      {/* Content */}
      {open && (
        <div className={cn('border-t px-3 py-3 space-y-3', borderColor, textColor)}>
          <ScheduleTypePicker
            value={value?.type ?? null}
            onChange={handleTypeChange}
            color={color}
          />

          {value && (
            <>
              <div className={cn('border-t pt-3 space-y-3', borderColor)}>{renderOptions()}</div>
              <div className={cn('border-t pt-3', borderColor)}>
                <RecurrenceConfig
                  value={value.recurrence}
                  onChange={handleRecurrenceChange}
                  templateId={templateId}
                  color={color}
                />
              </div>
              <ScheduleSummary config={value} color={color} />
            </>
          )}

          {!value && (
            <p className="text-xs opacity-40 italic">
              Sélectionnez un type de planification ci-dessus pour configurer.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
