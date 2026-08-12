import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Clock, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimePickerProps {
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  format?: '24h' | '12h';
  step?: number;
  minTime?: string;
  maxTime?: string;
  showSeconds?: boolean;
  showQuickSelect?: boolean;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  inputSize?: 'sm' | 'md' | 'lg';
}

export const TimePicker: React.FC<TimePickerProps> = ({
  label,
  value,
  onChange,
  format = '24h',
  step = 1,
  minTime: _minTime,
  maxTime: _maxTime,
  showSeconds = false,
  showQuickSelect = true,
  error,
  helperText,
  required,
  disabled,
  placeholder = 'HH:MM',
  className,
  inputSize = 'md',
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [hours, setHours] = React.useState('00');
  const [minutes, setMinutes] = React.useState('00');
  const [seconds, setSeconds] = React.useState('00');
  const [period, setPeriod] = React.useState<'AM' | 'PM'>('AM');
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const hoursScrollRef = React.useRef<HTMLDivElement>(null);
  const minutesScrollRef = React.useRef<HTMLDivElement>(null);
  const secondsScrollRef = React.useRef<HTMLDivElement>(null);
  const inputId = `time-picker-${label?.toLowerCase().replaceAll(/\s+/g, '-')}`;

  React.useEffect(() => {
    if (value) {
      const [h, m, s] = value.split(':');
      if (format === '12h') {
        const hour = Number.parseInt(h, 10);
        let displayHour: string;
        if (hour === 0) {
          displayHour = '12';
        } else if (hour > 12) {
          displayHour = String(hour - 12).padStart(2, '0');
        } else {
          displayHour = h;
        }
        setHours(displayHour);
        setPeriod(hour >= 12 ? 'PM' : 'AM');
      } else {
        setHours(h);
      }
      setMinutes(m || '00');
      setSeconds(s || '00');
    }
  }, [value, format]);

  const convertTo24Hour = (hour: string, periodValue: 'AM' | 'PM'): number => {
    const hourNum = Number.parseInt(hour, 10);
    if (format === '24h') return hourNum;

    if (periodValue === 'PM' && hour !== '12') {
      return hourNum + 12;
    }
    if (periodValue === 'AM' && hour === '12') {
      return 0;
    }
    return hourNum;
  };

  const generateHours = () => {
    const max = format === '24h' ? 23 : 12;
    const start = format === '24h' ? 0 : 1;
    const allHours = Array.from({ length: max - start + 1 }, (_, i) =>
      String(i + start).padStart(2, '0'),
    );

    if (!_minTime && !_maxTime) return allHours;

    return allHours.filter((h) => {
      const hour24 = convertTo24Hour(h, period);
      const hourStr = String(hour24).padStart(2, '0');

      if (_minTime) {
        const [minHour] = _minTime.split(':');
        if (hourStr < minHour) return false;
      }
      if (_maxTime) {
        const [maxHour] = _maxTime.split(':');
        if (hourStr > maxHour) return false;
      }

      return true;
    });
  };

  const generateMinutes = () => {
    const allMinutes = Array.from({ length: Math.floor(60 / step) }, (_, i) =>
      String(i * step).padStart(2, '0'),
    );

    if (!_minTime && !_maxTime) return allMinutes;

    const hour24 = convertTo24Hour(hours, period);
    const hourStr = String(hour24).padStart(2, '0');

    return allMinutes.filter((m) => {
      if (_minTime) {
        const [minHour, minMinute] = _minTime.split(':');
        if (hourStr === minHour && m < minMinute) return false;
        if (hourStr < minHour) return false;
      }
      if (_maxTime) {
        const [maxHour, maxMinute] = _maxTime.split(':');
        if (hourStr === maxHour && m > maxMinute) return false;
        if (hourStr > maxHour) return false;
      }

      return true;
    });
  };

  const generateSeconds = () => {
    return Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
  };

  const updateTime = (
    newHours: string,
    newMinutes: string,
    newSeconds: string,
    newPeriod: 'AM' | 'PM',
  ) => {
    let h = newHours;
    if (format === '12h') {
      const hour = Number.parseInt(newHours, 10);
      if (newPeriod === 'PM' && hour !== 12) {
        h = String(hour + 12).padStart(2, '0');
      } else if (newPeriod === 'AM' && hour === 12) {
        h = '00';
      }
    }
    const timeString = showSeconds ? `${h}:${newMinutes}:${newSeconds}` : `${h}:${newMinutes}`;
    onChange?.(timeString);
  };

  const handleClear = () => {
    setHours('00');
    setMinutes('00');
    setSeconds('00');
    setPeriod('AM');
    onChange?.('');
  };

  const handleQuickSelect = (type: 'now' | 'start' | 'end') => {
    const now = new Date();
    let h = '00';
    let m = '00';
    let s = '00';
    let p: 'AM' | 'PM' = 'AM';

    if (type === 'now') {
      h = String(now.getHours()).padStart(2, '0');
      m = String(now.getMinutes()).padStart(2, '0');
      s = String(now.getSeconds()).padStart(2, '0');
    } else if (type === 'start') {
      h = '09';
    } else if (type === 'end') {
      h = '18';
    }

    if (format === '12h') {
      const hour = Number.parseInt(h, 10);
      p = hour >= 12 ? 'PM' : 'AM';
      let displayHour: string;
      if (hour === 0) {
        displayHour = '12';
      } else if (hour > 12) {
        displayHour = String(hour - 12).padStart(2, '0');
      } else {
        displayHour = h;
      }
      h = displayHour;
    }

    setHours(h);
    setMinutes(m);
    setSeconds(s);
    setPeriod(p);
    updateTime(h, m, s, p);
    setIsOpen(false);
  };

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayValue = React.useMemo(() => {
    if (!value) return '';
    if (format === '12h') {
      const secondsPart = showSeconds ? `:${seconds}` : '';
      return `${hours}:${minutes}${secondsPart} ${period}`;
    }
    return value;
  }, [value, format, hours, minutes, seconds, period, showSeconds]);

  return (
    <div className={cn('w-full space-y-2', className)} ref={dropdownRef}>
      {label && (
        <Label htmlFor={inputId} className={cn('form-label', required && 'form-label-required')}>
          {label}
        </Label>
      )}

      <div className="relative">
        <button
          type="button"
          id={inputId}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            'flex w-full items-center justify-between rounded-xl border-[1.5px]',
            'font-medium ring-offset-background transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-2-nuance-1)]/50 focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'border-[color-mix(in_srgb,var(--color-1-nuance-3)_50%,transparent)]',
            'bg-[rgb(var(--card-rgb)/0.3)]',
            'hover:border-[color-mix(in_srgb,var(--color-1-nuance-2)_70%,transparent)] hover:shadow-sm',
            isOpen && 'border-[var(--color-2-nuance-1)]',
            error && 'modern-input-error',
            inputSize === 'sm' && 'h-9 px-3 py-2 text-sm',
            inputSize === 'md' && 'h-11 px-4 py-3 text-base',
            inputSize === 'lg' && 'h-14 px-5 py-3.5 text-lg',
          )}
        >
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-[var(--color-1-nuance-1)]" />
            <span className={cn(!displayValue && 'text-muted-foreground/60')}>
              {displayValue || placeholder}
            </span>
          </div>
          <ChevronDown
            className={cn(
              'h-5 w-5 shrink-0 transition-transform duration-200',
              'text-[var(--color-1-nuance-1)]',
              isOpen && 'rotate-180',
            )}
          />
        </button>

        {value && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 flex items-center justify-center hover:bg-muted rounded transition-colors z-10"
          >
            <X className="h-3.5 w-3.5 text-[var(--color-3-nuance-1)]" />
          </button>
        )}

        {isOpen && (
          <div
            className="modern-dropdown-content w-full p-3"
            style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50 }}
          >
            {showQuickSelect && (
              <div className="flex gap-2 mb-3 pb-3 border-b border-[var(--color-1-nuance-3)]/30">
                <button
                  type="button"
                  onClick={() => handleQuickSelect('now')}
                  className="flex-1 px-3 py-2 text-sm font-medium rounded-lg border-2 border-[var(--color-1-nuance-1)] text-[var(--color-1-nuance-1)] hover:bg-[var(--color-1-nuance-1)] hover:text-white transition-all duration-200 hover:scale-105 hover:shadow-md"
                >
                  🕐 Maintenant
                </button>
              </div>
            )}

            <div
              className={cn(
                'grid gap-2',
                format === '12h' ? 'grid-cols-3' : 'grid-cols-2',
                showSeconds && format === '24h' && 'grid-cols-3',
              )}
            >
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[var(--color-1-nuance-1)] mb-2 text-center">
                  Heures
                </span>
                <div
                  ref={hoursScrollRef}
                  className="max-h-64 overflow-y-auto scrollbar-thin space-y-1"
                  onWheel={(e) => e.stopPropagation()}
                >
                  {generateHours().map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => {
                        setHours(h);
                        updateTime(h, minutes, seconds, period);
                        if (minutes) {
                          setIsOpen(false);
                        }
                      }}
                      className={cn(
                        'w-full py-2 px-3 rounded-lg text-center text-base transition-all duration-150',
                        hours === h
                          ? 'bg-[var(--color-2-nuance-1)] text-white font-medium shadow-sm'
                          : 'hover:bg-[color-mix(in_srgb,var(--color-2-nuance-1)_12%,transparent)] hover:scale-102',
                      )}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col">
                <span className="text-xs font-bold text-[var(--color-1-nuance-1)] mb-2 text-center">
                  Minutes
                </span>
                <div
                  ref={minutesScrollRef}
                  className="max-h-64 overflow-y-auto scrollbar-thin space-y-1"
                  onWheel={(e) => e.stopPropagation()}
                >
                  {generateMinutes().map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setMinutes(m);
                        updateTime(hours, m, seconds, period);
                        if (hours) {
                          setIsOpen(false);
                        }
                      }}
                      className={cn(
                        'w-full py-2 px-3 rounded-lg text-center text-base transition-all duration-150',
                        minutes === m
                          ? 'bg-[var(--color-2-nuance-1)] text-white font-medium shadow-sm'
                          : 'hover:bg-[color-mix(in_srgb,var(--color-2-nuance-1)_12%,transparent)] hover:scale-102',
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {showSeconds && format === '24h' && (
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[var(--color-1-nuance-1)] mb-2 text-center">
                    Secondes
                  </span>
                  <div
                    ref={secondsScrollRef}
                    className="max-h-64 overflow-y-auto scrollbar-thin space-y-1"
                    onWheel={(e) => e.stopPropagation()}
                  >
                    {generateSeconds().map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setSeconds(s);
                          updateTime(hours, minutes, s, period);
                        }}
                        className={cn(
                          'w-full py-2 px-3 rounded-lg text-center text-base transition-all duration-150',
                          seconds === s
                            ? 'bg-[var(--color-2-nuance-1)] text-white font-medium shadow-sm'
                            : 'hover:bg-[color-mix(in_srgb,var(--color-2-nuance-1)_12%,transparent)] hover:scale-102',
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {format === '12h' && (
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[var(--color-1-nuance-1)] mb-2 text-center">
                    Période
                  </span>
                  <div className="space-y-1">
                    {['AM', 'PM'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          const newPeriod = p as 'AM' | 'PM';
                          setPeriod(newPeriod);
                          updateTime(hours, minutes, seconds, newPeriod);
                        }}
                        className={cn(
                          'w-full py-2 px-3 rounded-lg text-center text-base font-medium transition-all duration-150',
                          period === p
                            ? 'bg-[var(--color-2-nuance-1)] text-white shadow-sm'
                            : 'hover:bg-[color-mix(in_srgb,var(--color-2-nuance-1)_12%,transparent)]',
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && <p className="form-error-text">{error}</p>}
      {helperText && !error && <p className="form-helper-text">{helperText}</p>}
    </div>
  );
};
