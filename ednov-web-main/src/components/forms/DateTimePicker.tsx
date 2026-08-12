import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format as formatDate, isValid, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { createPortal } from 'react-dom';

interface DateTimePickerProps {
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  format?: '24h' | '12h';
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  timeStep?: number;
  disablePast?: boolean;
  disableFuture?: boolean;
  minDate?: string;
  maxDate?: string;
  placement?: 'top' | 'bottom' | 'auto';
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({
  label,
  value,
  onChange,
  format = '24h',
  error,
  helperText,
  required,
  disabled,
  className,
  timeStep = 1,
  disablePast = false,
  disableFuture = false,
  minDate,
  maxDate,
  placement = 'bottom',
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [hours, setHours] = React.useState('09');
  const [minutes, setMinutes] = React.useState('00');
  const [period, setPeriod] = React.useState<'AM' | 'PM'>('AM');
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const [popoverPosition, setPopoverPosition] = React.useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const inputId = `datetime-picker-${label?.toLowerCase().replaceAll(/\s+/g, '-')}`;

  React.useEffect(() => {
    if (value) {
      // Parse as full ISO UTC string to get correct local time
      const dateObj = new Date(value);
      if (isValid(dateObj)) {
        setSelectedDate(dateObj);
        setCurrentMonth(dateObj);

        // Extract local hours and minutes from the parsed date
        const hourNum = dateObj.getHours();
        const minuteNum = dateObj.getMinutes();

        if (format === '12h') {
          setPeriod(hourNum >= 12 ? 'PM' : 'AM');
          const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
          setHours(String(displayHour).padStart(2, '0'));
        } else {
          setHours(String(hourNum).padStart(2, '0'));
        }
        setMinutes(String(minuteNum).padStart(2, '0'));
      }
    }
  }, [value, format]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    emitChange(date, hours, minutes, period);
  };

  const handleTimeChange = (newHours: string, newMinutes: string, newPeriod: 'AM' | 'PM') => {
    setHours(newHours);
    setMinutes(newMinutes);
    setPeriod(newPeriod);
    if (selectedDate) {
      emitChange(selectedDate, newHours, newMinutes, newPeriod);
    }
  };

  const emitChange = (date: Date, h: string, m: string, p: 'AM' | 'PM') => {
    let hour24 = Number.parseInt(h, 10);
    if (format === '12h') {
      if (p === 'PM' && hour24 !== 12) hour24 += 12;
      if (p === 'AM' && hour24 === 12) hour24 = 0;
    }

    // Create a local Date object with the selected date and time
    const localDateTime = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      hour24,
      Number.parseInt(m, 10),
    );

    // Emit as UTC ISO string so backend receives correct UTC timestamp
    onChange?.(localDateTime.toISOString());
  };

  const handleClear = () => {
    setSelectedDate(null);
    setHours('09');
    setMinutes('00');
    setPeriod('AM');
    onChange?.('');
  };

  const handleNow = () => {
    const now = new Date();
    setSelectedDate(now);
    setCurrentMonth(now);
    const h = now.getHours();
    const m = now.getMinutes();

    if (format === '12h') {
      setPeriod(h >= 12 ? 'PM' : 'AM');
      const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
      setHours(String(displayHour).padStart(2, '0'));
    } else {
      setHours(String(h).padStart(2, '0'));
    }
    setMinutes(String(m).padStart(2, '0'));
    emitChange(now, String(h).padStart(2, '0'), String(m).padStart(2, '0'), h >= 12 ? 'PM' : 'AM');
    setIsOpen(false);
  };

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (buttonRef.current && buttonRef.current.contains(target)) {
        return;
      }

      if (
        target.hasAttribute?.('data-datetime-popover') ||
        target.closest?.('[data-datetime-popover]')
      ) {
        return;
      }

      setIsOpen(false);
    };

    if (isOpen) {
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside, true);
      }, 0);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside, true);
      };
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = 400;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      let finalPlacement = placement;
      if (placement === 'auto') {
        finalPlacement = spaceBelow < dropdownHeight && spaceAbove > spaceBelow ? 'top' : 'bottom';
      }

      const top =
        finalPlacement === 'top'
          ? rect.top + window.scrollY - dropdownHeight - 6
          : rect.bottom + window.scrollY + 6;

      setPopoverPosition({
        top,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [isOpen, placement]);

  const displayValue = React.useMemo(() => {
    if (!selectedDate) return '';
    const dateStr = formatDate(selectedDate, 'dd/MM/yy');
    const timeStr = format === '12h' ? `${hours}:${minutes} ${period}` : `${hours}:${minutes}`;
    return `${dateStr} ${timeStr}`;
  }, [selectedDate, hours, minutes, period, format]);

  const generateHours = () => {
    const max = format === '24h' ? 23 : 12;
    const start = format === '24h' ? 0 : 1;
    return Array.from({ length: max - start + 1 }, (_, i) => String(i + start).padStart(2, '0'));
  };

  const generateMinutes = () => {
    return Array.from({ length: Math.floor(60 / timeStep) }, (_, i) =>
      String(i * timeStep).padStart(2, '0'),
    );
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const isDateDisabled = (date: Date | null): boolean => {
    if (!date) return true;
    const now = new Date();
    if (disablePast && date < startOfDay(now)) return true;
    if (disableFuture && date > endOfDay(now)) return true;
    if (minDate && date < new Date(minDate)) return true;
    if (maxDate && date > new Date(maxDate)) return true;
    return false;
  };

  const isSameDay = (date1: Date | null, date2: Date | null): boolean => {
    if (!date1 || !date2) return false;
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + (direction === 'next' ? 1 : -1),
      ),
    );
  };

  return (
    <div className={cn('w-full space-y-1.5', className)}>
      {label && (
        <Label htmlFor={inputId} className={cn('form-label', required && 'form-label-required')}>
          {label}
        </Label>
      )}

      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          id={inputId}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-lg border-[1.5px] px-3 py-2',
            'text-sm font-medium ring-offset-background transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-2-nuance-1)]/50 focus:ring-offset-1',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'border-[color-mix(in_srgb,var(--color-1-nuance-3)_50%,transparent)]',
            'bg-[rgb(var(--card-rgb)/0.3)]',
            'hover:border-[color-mix(in_srgb,var(--color-1-nuance-2)_70%,transparent)] hover:shadow-sm',
            isOpen && 'border-[var(--color-2-nuance-1)]',
            error && 'border-red-500',
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Calendar className="h-4 w-4 text-[var(--color-1-nuance-1)] shrink-0" />
            <span className={cn('truncate', !displayValue && 'text-muted-foreground/60')}>
              {displayValue || 'Date et heure'}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 transition-transform duration-200',
                'text-[var(--color-1-nuance-1)]',
                isOpen && 'rotate-180',
              )}
            />
          </div>
        </button>

        {value && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="absolute right-8 top-1/2 -translate-y-1/2 h-4 w-4 flex items-center justify-center hover:bg-muted rounded transition-colors z-10"
          >
            <X className="h-3.5 w-3.5 text-[var(--color-3-nuance-1)]" />
          </button>
        )}

        {isOpen &&
          popoverPosition &&
          createPortal(
            <div
              ref={dropdownRef}
              data-datetime-popover="true"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="rounded-lg border-[1.5px] border-[color-mix(in_srgb,var(--color-1-nuance-3)_50%,transparent)] bg-popover backdrop-blur-lg shadow-xl p-3 pointer-events-auto"
              style={{
                position: 'fixed',
                top: `${popoverPosition.top}px`,
                left: `${popoverPosition.left}px`,
                zIndex: 9999,
                minWidth: '420px',
              }}
            >
              <div className="flex gap-3">
                {/* Calendar Section */}
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      type="button"
                      onClick={() => navigateMonth('prev')}
                      className="p-1 hover:bg-muted rounded transition-colors"
                    >
                      <ChevronDown className="h-3.5 w-3.5 rotate-90" />
                    </button>
                    <div className="text-xs font-semibold text-[var(--color-1-nuance-1)]">
                      {formatDate(currentMonth, 'MMM yyyy', { locale: fr })}
                    </div>
                    <button
                      type="button"
                      onClick={() => navigateMonth('next')}
                      className="p-1 hover:bg-muted rounded transition-colors"
                    >
                      <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-0.5 mb-1">
                    {['D', 'L', 'Ma', 'Me', 'J', 'V', 'S'].map((day, idx) => (
                      <div
                        key={`day-${idx}`}
                        className="text-[10px] font-medium text-center text-muted-foreground py-1 w-7"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-0.5">
                    {getDaysInMonth().map((date, index) => {
                      const isDisabled = isDateDisabled(date);
                      const isSelected = isSameDay(date, selectedDate);
                      const isToday = date && isSameDay(date, new Date());

                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => date && !isDisabled && handleDateSelect(date)}
                          disabled={isDisabled}
                          className={cn(
                            'h-7 w-7 rounded text-xs transition-all duration-150',
                            !date && 'invisible',
                            isDisabled && 'opacity-30 cursor-not-allowed',
                            !isDisabled && !isSelected && 'hover:bg-muted',
                            isSelected &&
                              'bg-[var(--color-2-nuance-1)] text-white font-semibold shadow-sm',
                            isToday && !isSelected && 'border border-[var(--color-2-nuance-1)]',
                          )}
                        >
                          {date?.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Section */}
                <div className="flex flex-col gap-2 border-l border-border/50 pl-3 w-[140px]">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-1-nuance-1)]">
                    <Clock className="h-3.5 w-3.5" />
                    Heure
                  </div>

                  <div
                    className={cn('grid gap-1.5', format === '12h' ? 'grid-cols-3' : 'grid-cols-2')}
                  >
                    <div className="flex flex-col">
                      <span className="text-[10px] font-medium text-muted-foreground mb-1 text-center">
                        H
                      </span>
                      <div
                        className="max-h-32 overflow-y-auto scrollbar-thin space-y-0.5"
                        onWheel={(e) => e.stopPropagation()}
                      >
                        {generateHours().map((h) => (
                          <button
                            key={h}
                            type="button"
                            onClick={() => {
                              handleTimeChange(h, minutes, period);
                              if (selectedDate && minutes) {
                                setIsOpen(false);
                              }
                            }}
                            className={cn(
                              'w-full py-1 px-1 rounded text-center text-xs transition-all duration-150',
                              hours === h
                                ? 'bg-[var(--color-2-nuance-1)] text-white font-medium'
                                : 'hover:bg-muted',
                            )}
                          >
                            {h}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[10px] font-medium text-muted-foreground mb-1 text-center">
                        M
                      </span>
                      <div
                        className="max-h-32 overflow-y-auto scrollbar-thin space-y-0.5"
                        onWheel={(e) => e.stopPropagation()}
                      >
                        {generateMinutes().map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              handleTimeChange(hours, m, period);
                              if (selectedDate && hours) {
                                setIsOpen(false);
                              }
                            }}
                            className={cn(
                              'w-full py-1 px-1 rounded text-center text-xs transition-all duration-150',
                              minutes === m
                                ? 'bg-[var(--color-2-nuance-1)] text-white font-medium'
                                : 'hover:bg-muted',
                            )}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>

                    {format === '12h' && (
                      <div className="flex flex-col">
                        <span className="text-[10px] font-medium text-muted-foreground mb-1 text-center">
                          -
                        </span>
                        <div className="space-y-0.5">
                          {['AM', 'PM'].map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => handleTimeChange(hours, minutes, p as 'AM' | 'PM')}
                              className={cn(
                                'w-full py-1 px-1 rounded text-center text-xs font-medium transition-all duration-150',
                                period === p
                                  ? 'bg-[var(--color-2-nuance-1)] text-white'
                                  : 'hover:bg-muted',
                              )}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleNow}
                    className="mt-auto px-2 py-1.5 text-xs font-medium rounded border border-[var(--color-2-nuance-1)] text-[var(--color-2-nuance-1)] hover:bg-[var(--color-2-nuance-1)] hover:text-white transition-all duration-200"
                  >
                    Maintenant
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}
      </div>

      {error && <p className="form-error-text">{error}</p>}
      {helperText && !error && <p className="form-helper-text">{helperText}</p>}
    </div>
  );
};
