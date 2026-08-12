import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  addYears,
  subYears,
  isToday,
  isBefore,
  isAfter,
  startOfDay,
  getYear,
  setYear,
  setMonth,
} from 'date-fns';
import { fr } from 'date-fns/locale';

type ViewMode = 'days' | 'months' | 'years';

const useDatePickerNavigation = (currentMonth: Date, viewMode: ViewMode) => {
  const handlePrevMonth = () => subMonths(currentMonth, 1);
  const handleNextMonth = () => addMonths(currentMonth, 1);
  const handlePrevYear = () => subYears(currentMonth, 1);
  const handleNextYear = () => addYears(currentMonth, 1);
  const handlePrevDecade = () => subYears(currentMonth, 10);
  const handleNextDecade = () => addYears(currentMonth, 10);

  const handleNavigatePrev = () => {
    if (viewMode === 'days') return handlePrevMonth();
    if (viewMode === 'months') return handlePrevYear();
    return handlePrevDecade();
  };

  const handleNavigateNext = () => {
    if (viewMode === 'days') return handleNextMonth();
    if (viewMode === 'months') return handleNextYear();
    return handleNextDecade();
  };

  const getHeaderText = () => {
    if (viewMode === 'days') return format(currentMonth, 'MMMM yyyy', { locale: fr });
    if (viewMode === 'months') return format(currentMonth, 'yyyy', { locale: fr });
    const currentYear = getYear(currentMonth);
    const startYear = Math.floor(currentYear / 10) * 10;
    return `${startYear} - ${startYear + 9}`;
  };

  return { handleNavigatePrev, handleNavigateNext, getHeaderText };
};

interface DayViewProps {
  daysInMonth: Date[];
  leadingEmptyDays: number[];
  selectedDate: Date | null;
  isDateDisabled: (date: Date) => boolean;
  onDateSelect: (date: Date) => void;
}

const DayView: React.FC<DayViewProps> = ({
  daysInMonth,
  leadingEmptyDays,
  selectedDate,
  isDateDisabled,
  onDateSelect,
}) => (
  <>
    <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground mb-2">
      {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day) => (
        <div key={day} className="py-2">
          {day}
        </div>
      ))}
    </div>
    <div className="grid grid-cols-7 gap-1">
      {leadingEmptyDays.map((i) => (
        <div key={`empty-${i}`} />
      ))}
      {daysInMonth.map((date) => {
        const isSelected = selectedDate && isSameDay(date, selectedDate);
        const isTodayDate = isToday(date);
        const isDisabled = isDateDisabled(date);
        return (
          <button
            key={date.toISOString()}
            type="button"
            onClick={() => onDateSelect(date)}
            disabled={isDisabled}
            className={cn(
              'h-9 w-9 rounded-lg text-sm font-medium transition-all duration-150',
              'hover:bg-[color-mix(in_srgb,var(--color-1-nuance-1)_15%,transparent)] hover:scale-105',
              'focus:outline-none focus:ring-2 focus:ring-[var(--color-1-nuance-1)]/50',
              'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100',
              isSelected &&
                'bg-[var(--color-2-nuance-1)] text-white hover:bg-[var(--color-2-nuance-2)]',
              isTodayDate &&
                !isSelected &&
                'border-2 border-[var(--color-1-nuance-1)] font-bold text-[var(--color-1-nuance-1)]',
            )}
          >
            {format(date, 'd')}
          </button>
        );
      })}
    </div>
  </>
);

interface MonthViewProps {
  currentMonth: Date;
  selectedDate: Date | null;
  onMonthSelect: (monthIndex: number) => void;
}

const MonthView: React.FC<MonthViewProps> = ({ currentMonth, selectedDate, onMonthSelect }) => (
  <div className="grid grid-cols-3 gap-2 py-2">
    {['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'].map(
      (month, index) => {
        const isCurrentMonth =
          getYear(currentMonth) === getYear(new Date()) && index === new Date().getMonth();
        const isSelectedMonth =
          selectedDate &&
          getYear(currentMonth) === getYear(selectedDate) &&
          index === selectedDate.getMonth();
        return (
          <button
            key={month}
            type="button"
            onClick={() => onMonthSelect(index)}
            className={cn(
              'py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-150',
              'hover:bg-[color-mix(in_srgb,var(--color-1-nuance-1)_15%,transparent)] hover:scale-105',
              'focus:outline-none focus:ring-2 focus:ring-[var(--color-1-nuance-1)]/50',
              isSelectedMonth &&
                'bg-[var(--color-2-nuance-1)] text-white hover:bg-[var(--color-2-nuance-2)]',
              isCurrentMonth &&
                !isSelectedMonth &&
                'border-2 border-[var(--color-1-nuance-1)] font-bold text-[var(--color-1-nuance-1)]',
            )}
          >
            {month}
          </button>
        );
      },
    )}
  </div>
);

interface YearViewProps {
  years: number[];
  selectedDate: Date | null;
  onYearSelect: (year: number) => void;
}

const YearView: React.FC<YearViewProps> = ({ years, selectedDate, onYearSelect }) => (
  <div className="grid grid-cols-3 gap-2 py-2">
    {years.map((year) => {
      const isCurrentYear = year === getYear(new Date());
      const isSelectedYear = selectedDate && year === getYear(selectedDate);
      return (
        <button
          key={year}
          type="button"
          onClick={() => onYearSelect(year)}
          className={cn(
            'py-2.5 px-3 rounded-lg text-sm font-medium transition-all duration-150',
            'hover:bg-[color-mix(in_srgb,var(--color-1-nuance-1)_15%,transparent)] hover:scale-105',
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-1-nuance-1)]/50',
            isSelectedYear &&
              'bg-[var(--color-2-nuance-1)] text-white hover:bg-[var(--color-2-nuance-2)]',
            isCurrentYear &&
              !isSelectedYear &&
              'border-2 border-[var(--color-1-nuance-1)] font-bold text-[var(--color-1-nuance-1)]',
          )}
        >
          {year}
        </button>
      );
    })}
  </div>
);

interface CalendarDropdownProps {
  viewMode: ViewMode;
  placement: 'top' | 'bottom' | 'auto';
  align: 'left' | 'right';
  headerText: string;
  daysInMonth: Date[];
  leadingEmptyDays: number[];
  selectedDate: Date | null;
  currentMonth: Date;
  years: number[];
  isDateDisabled: (date: Date) => boolean;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onHeaderClick: () => void;
  onDateSelect: (date: Date) => void;
  onMonthSelect: (monthIndex: number) => void;
  onYearSelect: (year: number) => void;
}

interface DatePickerInputProps {
  inputId: string;
  displayValue: string;
  placeholder: string;
  isOpen: boolean;
  disabled?: boolean;
  inputSize: 'sm' | 'md' | 'lg';
  effectiveState: string;
  onToggle: () => void;
  onBlur?: () => void;
}

const DatePickerInput: React.FC<DatePickerInputProps> = ({
  inputId,
  displayValue,
  placeholder,
  isOpen,
  disabled,
  inputSize,
  effectiveState,
  onToggle,
  onBlur,
}) => (
  <button
    type="button"
    id={inputId}
    onClick={onToggle}
    onBlur={onBlur}
    disabled={disabled}
    className={cn(
      'flex h-11 w-full items-center justify-between rounded-xl border-[1.5px] px-4 py-3',
      'text-base font-medium ring-offset-background transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-[var(--color-2-nuance-1)]/50 focus:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'border-[color-mix(in_srgb,var(--color-1-nuance-3)_50%,transparent)]',
      'bg-[rgb(var(--card-rgb)/0.3)]',
      'hover:border-[color-mix(in_srgb,var(--color-1-nuance-2)_70%,transparent)] hover:shadow-sm',
      isOpen && 'border-[var(--color-2-nuance-1)]',
      effectiveState === 'error' && 'modern-input-error',
      effectiveState === 'success' && 'modern-input-success',
      effectiveState === 'warning' && 'modern-input-warning',
      inputSize === 'sm' && 'h-9 px-3 py-2 text-sm',
      inputSize === 'lg' && 'h-14 px-5 py-3.5 text-lg',
    )}
  >
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <Calendar
        className={cn(
          'shrink-0 text-[var(--color-1-nuance-1)]',
          inputSize === 'sm' && 'h-4 w-4',
          inputSize === 'md' && 'h-5 w-5',
          inputSize === 'lg' && 'h-6 w-6',
        )}
      />
      <span
        className={cn(
          'truncate',
          !displayValue && 'text-muted-foreground/60',
          inputSize === 'sm' && 'text-sm',
        )}
      >
        {displayValue || placeholder}
      </span>
    </div>
    <ChevronRight
      className={cn(
        'shrink-0 transition-transform duration-200',
        'text-[var(--color-1-nuance-1)]',
        inputSize === 'sm' && 'h-4 w-4',
        inputSize === 'md' && 'h-5 w-5',
        inputSize === 'lg' && 'h-6 w-6',
        isOpen && 'rotate-90',
      )}
    />
  </button>
);

const CalendarDropdown: React.FC<CalendarDropdownProps> = ({
  viewMode,
  placement,
  align,
  headerText,
  daysInMonth,
  leadingEmptyDays,
  selectedDate,
  currentMonth,
  years,
  isDateDisabled,
  onNavigatePrev,
  onNavigateNext,
  onHeaderClick,
  onDateSelect,
  onMonthSelect,
  onYearSelect,
}) => (
  <div
    className={cn(
      'modern-dropdown min-w-[320px] w-max p-3 max-h-[400px] overflow-visible',
      placement === 'top' && 'bottom-full mb-2',
      placement === 'bottom' && 'top-full mt-2',
      placement === 'auto' && 'top-full mt-2',
      align === 'right' && 'right-0',
      align === 'left' && 'left-0',
    )}
  >
    <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--color-1-nuance-3)]/30">
      <button
        type="button"
        onClick={onNavigatePrev}
        className="p-2 rounded-lg text-[var(--color-1-nuance-1)] hover:bg-[color-mix(in_srgb,var(--color-1-nuance-1)_15%,transparent)] hover:text-[var(--color-1-nuance-2)] transition-all duration-200 hover:scale-110"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        type="button"
        onClick={onHeaderClick}
        className="font-bold text-base hover:text-[var(--color-1-nuance-1)] transition-colors cursor-pointer px-3 py-1 rounded-lg hover:bg-[color-mix(in_srgb,var(--color-1-nuance-1)_10%,transparent)]"
      >
        {headerText}
      </button>
      <button
        type="button"
        onClick={onNavigateNext}
        className="p-2 rounded-lg text-[var(--color-1-nuance-1)] hover:bg-[color-mix(in_srgb,var(--color-1-nuance-1)_15%,transparent)] hover:text-[var(--color-1-nuance-2)] transition-all duration-200 hover:scale-110"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>

    {viewMode === 'days' && (
      <DayView
        daysInMonth={daysInMonth}
        leadingEmptyDays={leadingEmptyDays}
        selectedDate={selectedDate}
        isDateDisabled={isDateDisabled}
        onDateSelect={onDateSelect}
      />
    )}

    {viewMode === 'months' && (
      <MonthView
        currentMonth={currentMonth}
        selectedDate={selectedDate}
        onMonthSelect={onMonthSelect}
      />
    )}

    {viewMode === 'years' && (
      <YearView years={years} selectedDate={selectedDate} onYearSelect={onYearSelect} />
    )}
  </div>
);

interface DatePickerProps {
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  minDate?: string;
  maxDate?: string;
  disablePast?: boolean;
  disableFuture?: boolean;
  inputSize?: 'sm' | 'md' | 'lg';
  state?: 'default' | 'error' | 'success' | 'warning';
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultViewMode?: ViewMode;
  placement?: 'top' | 'bottom' | 'auto';
  align?: 'left' | 'right';
}

export const DatePicker: React.FC<DatePickerProps> = ({
  label,
  value,
  onChange,
  onBlur,
  error,
  helperText,
  required,
  disabled,
  placeholder = 'Sélectionner une date',
  className,
  minDate,
  maxDate,
  disablePast = false,
  disableFuture = false,
  inputSize = 'md',
  state,
  isOpen: controlledIsOpen,
  onOpenChange,
  defaultViewMode = 'days',
  placement = 'bottom',
  align = 'left',
}) => {
  const [internalIsOpen, setInternalIsOpen] = React.useState(false);
  const isOpen = controlledIsOpen ?? internalIsOpen;
  const setIsOpen = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open);
    } else {
      setInternalIsOpen(open);
    }
  };
  const [currentMonth, setCurrentMonth] = React.useState(value ? new Date(value) : new Date());
  const [viewMode, setViewMode] = React.useState<ViewMode>(defaultViewMode);

  // Reset view mode to default when opening if no value is set
  React.useEffect(() => {
    if (isOpen && value) {
      setViewMode('days');
    } else if (isOpen && !value) {
      setViewMode(defaultViewMode);
    }
  }, [isOpen, value, defaultViewMode]);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const inputId = `datepicker-${label?.toLowerCase().replaceAll(/\s+/g, '-')}`;

  const selectedDate = value ? new Date(value) : null;
  const effectiveState = error ? 'error' : state || 'default';

  const today = startOfDay(new Date());
  const getMinDateObj = () => {
    if (disablePast) return today;
    if (minDate) return startOfDay(new Date(minDate));
    return null;
  };
  const getMaxDateObj = () => {
    if (disableFuture) return today;
    if (maxDate) return startOfDay(new Date(maxDate));
    return null;
  };
  const minDateObj = getMinDateObj();
  const maxDateObj = getMaxDateObj();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startDayOfWeek = monthStart.getDay();
  const leadingEmptyDays = Array.from({ length: startDayOfWeek }, (_, i) => i);

  const isDateDisabled = (date: Date) => {
    if (minDateObj && isBefore(date, minDateObj)) return true;
    if (maxDateObj && isAfter(date, maxDateObj)) return true;
    return false;
  };

  const handleDateSelect = (date: Date) => {
    if (isDateDisabled(date)) return;
    const formatted = format(date, 'yyyy-MM-dd');
    onChange?.(formatted);
    setIsOpen(false);
  };

  const handleMonthSelect = (monthIndex: number) => {
    setCurrentMonth(setMonth(currentMonth, monthIndex));
    setViewMode('days');
  };

  const handleYearSelect = (year: number) => {
    setCurrentMonth(setYear(currentMonth, year));
    setViewMode('months');
  };

  const generateYears = () => {
    const currentYear = getYear(currentMonth);
    const startYear = Math.floor(currentYear / 10) * 10;
    return Array.from({ length: 12 }, (_, i) => startYear + i);
  };

  const handleHeaderClick = () => {
    if (viewMode === 'days') setViewMode('months');
    else if (viewMode === 'months') setViewMode('years');
  };

  const navigation = useDatePickerNavigation(currentMonth, viewMode);
  const handleNavigatePrev = () => setCurrentMonth(navigation.handleNavigatePrev());
  const handleNavigateNext = () => setCurrentMonth(navigation.handleNavigateNext());

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayValue = selectedDate ? format(selectedDate, 'dd/MM/yyyy') : '';

  return (
    <div className={cn('w-full space-y-2', className)} ref={dropdownRef}>
      {label && (
        <Label htmlFor={inputId} className={cn('form-label', required && 'form-label-required')}>
          {label}
        </Label>
      )}

      <div className="relative">
        <DatePickerInput
          inputId={inputId}
          displayValue={displayValue}
          placeholder={placeholder}
          isOpen={isOpen}
          disabled={disabled}
          inputSize={inputSize}
          effectiveState={effectiveState}
          onToggle={() => !disabled && setIsOpen(!isOpen)}
          onBlur={onBlur}
        />

        {isOpen && (
          <CalendarDropdown
            viewMode={viewMode}
            placement={placement}
            align={align}
            headerText={navigation.getHeaderText()}
            daysInMonth={daysInMonth}
            leadingEmptyDays={leadingEmptyDays}
            selectedDate={selectedDate}
            currentMonth={currentMonth}
            years={generateYears()}
            isDateDisabled={isDateDisabled}
            onNavigatePrev={handleNavigatePrev}
            onNavigateNext={handleNavigateNext}
            onHeaderClick={handleHeaderClick}
            onDateSelect={handleDateSelect}
            onMonthSelect={handleMonthSelect}
            onYearSelect={handleYearSelect}
          />
        )}
      </div>

      {error && <p className="form-error-text">{error}</p>}
      {helperText && !error && <p className="form-helper-text">{helperText}</p>}
    </div>
  );
};
