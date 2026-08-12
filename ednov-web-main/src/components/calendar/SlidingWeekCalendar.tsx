import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameDay,
  isToday,
  startOfDay,
  getWeek,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface SlidingWeekCalendarProps {
  selectedDates?: Date[];
  onDatesChange?: (dates: Date[]) => void;
  className?: string;
}

export const SlidingWeekCalendar: React.FC<SlidingWeekCalendarProps> = ({
  selectedDates = [],
  onDatesChange,
  className,
}) => {
  const [currentWeekStart, setCurrentWeekStart] = React.useState(() =>
    startOfWeek(new Date(), { locale: fr }),
  );

  const weekDays = React.useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const weekNumber = React.useMemo(() => {
    return getWeek(currentWeekStart, { locale: fr });
  }, [currentWeekStart]);

  const monthYear = React.useMemo(() => {
    return format(currentWeekStart, 'MMMM yyyy', { locale: fr });
  }, [currentWeekStart]);

  const handlePrevWeek = React.useCallback(() => {
    setCurrentWeekStart((prev) => subWeeks(prev, 1));
  }, []);

  const handleNextWeek = React.useCallback(() => {
    setCurrentWeekStart((prev) => addWeeks(prev, 1));
  }, []);

  const isDateSelected = React.useCallback(
    (date: Date) => {
      return selectedDates.some((selectedDate) =>
        isSameDay(startOfDay(selectedDate), startOfDay(date)),
      );
    },
    [selectedDates],
  );

  const handleDateClick = React.useCallback(
    (date: Date) => {
      if (!onDatesChange) return;

      const normalizedDate = startOfDay(date);
      const isSelected = selectedDates.some((selectedDate) =>
        isSameDay(startOfDay(selectedDate), normalizedDate),
      );

      if (isSelected) {
        const newDates = selectedDates.filter(
          (selectedDate) => !isSameDay(startOfDay(selectedDate), normalizedDate),
        );
        onDatesChange(newDates);
      } else {
        onDatesChange([...selectedDates, normalizedDate]);
      }
    },
    [selectedDates, onDatesChange],
  );

  return (
    <div className={cn('sliding-calendar-container', className)}>
      <div className="sliding-calendar-header">
        <div className="sliding-calendar-header-info">
          <span className="sliding-calendar-month">{monthYear}</span>
          <span className="sliding-calendar-week-number">Semaine {weekNumber}</span>
        </div>
      </div>

      <div className="sliding-calendar-week">
        <button
          type="button"
          onClick={handlePrevWeek}
          className="sliding-calendar-nav-btn"
          aria-label="Semaine précédente"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="sliding-calendar-days">
          {weekDays.map((day) => {
            const dayName = format(day, 'EEE', { locale: fr }).toUpperCase();
            const dayNumber = format(day, 'd');
            const isSelectedDay = isDateSelected(day);
            const isTodayDay = isToday(day);
            const dayKey = format(day, 'yyyy-MM-dd');

            return (
              <button
                key={dayKey}
                type="button"
                onClick={() => handleDateClick(day)}
                className={cn(
                  'sliding-calendar-day',
                  isSelectedDay && 'sliding-calendar-day--selected',
                  isTodayDay && !isSelectedDay && 'sliding-calendar-day--today',
                  !isSelectedDay && !isTodayDay && 'sliding-calendar-day--normal',
                )}
                aria-label={format(day, 'EEEE d MMMM yyyy', { locale: fr })}
                aria-pressed={isSelectedDay}
              >
                <span className="sliding-calendar-day-name">{dayName}</span>
                <span className="sliding-calendar-day-number">{dayNumber}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleNextWeek}
          className="sliding-calendar-nav-btn"
          aria-label="Semaine suivante"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
