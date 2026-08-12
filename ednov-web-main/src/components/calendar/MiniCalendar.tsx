import * as React from 'react';
import { CalendarEvent, CalendarEventType } from '@/types/calendar.types';
import { ChevronLeft, ChevronRight, Calendar, Clock, X } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { EVENT_TYPE_CONFIG } from './calendar.config';

interface MiniCalendarProps {
  events: CalendarEvent[];
  onDateClick: (date: Date, events: CalendarEvent[]) => void;
  enabledTypes?: CalendarEventType[];
}

export const MiniCalendar: React.FC<MiniCalendarProps> = ({
  events,
  onDateClick,
  enabledTypes = ['session', 'postit', 'holiday'],
}) => {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [hoveredDay, setHoveredDay] = React.useState<Date | null>(null);
  const [popoverPosition, setPopoverPosition] = React.useState<{
    top: number;
    left: number;
  } | null>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const dayRefs = React.useRef<Map<string, HTMLButtonElement>>(new Map());
  const hoverTimeoutRef = React.useRef<number | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // Get all days including padding from previous/next months
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current !== null) {
        window.clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const getEventsForDay = (day: Date) => {
    return events.filter(
      (event) =>
        isSameDay(event.startDate, day) ||
        (event.allDay && event.startDate <= day && event.endDate >= day),
    );
  };

  const getFilteredEventsForDay = (day: Date) => {
    const dayEvents = getEventsForDay(day);
    return dayEvents.filter((event) => enabledTypes.includes(event.type));
  };

  const getSortedFilteredEvents = (day: Date): CalendarEvent[] => {
    const filtered = getFilteredEventsForDay(day);
    return filtered.sort((a, b) => {
      // Sort by type priority (sessions > postits > holidays)
      const typePriority: Record<CalendarEventType, number> = {
        session: 1,
        postit: 2,
        holiday: 3,
      };
      const aPriority = typePriority[a.type];
      const bPriority = typePriority[b.type];

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // Same type: sort by date (upcoming first, then past)
      return a.startDate.getTime() - b.startDate.getTime();
    });
  };

  const getPrimaryEvent = (events: CalendarEvent[]): CalendarEvent | null => {
    if (events.length === 0) return null;

    const now = new Date();

    // Priority 1: Sessions
    const sessions = events.filter((e) => e.type === 'session');
    if (sessions.length > 0) {
      const upcoming = sessions
        .filter((e) => e.startDate >= now)
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
      if (upcoming.length > 0) return upcoming[0];

      const sortedPast = [...sessions].sort(
        (a, b) => b.startDate.getTime() - a.startDate.getTime(),
      );
      return sortedPast[0];
    }

    // Priority 2: Post-its
    const postits = events.filter((e) => e.type === 'postit');
    if (postits.length > 0) {
      const upcoming = postits
        .filter((e) => e.startDate >= now)
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
      if (upcoming.length > 0) return upcoming[0];

      const sortedPast = [...postits].sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
      return sortedPast[0];
    }

    // Priority 3: Holidays
    return events.find((e) => e.type === 'holiday') || null;
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const handleDayClick = (day: Date, dayEvents: CalendarEvent[]) => {
    setSelectedDate(day);
    if (dayEvents.length > 0) {
      onDateClick(day, dayEvents);
    }
  };

  const handleDayMouseEnter = (day: Date, element: HTMLButtonElement) => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current !== null) {
      window.clearTimeout(hoverTimeoutRef.current);
    }

    const filteredEvents = getFilteredEventsForDay(day);
    if (filteredEvents.length > 1) {
      // Add 250ms delay before showing popover to avoid accidental triggers
      hoverTimeoutRef.current = window.setTimeout(() => {
        setHoveredDay(day);

        const rect = element.getBoundingClientRect();
        const popoverWidth = 280;
        const popoverHeight = Math.min(400, filteredEvents.length * 70 + 60);

        let left = rect.left + rect.width / 2 - popoverWidth / 2;
        let top = rect.bottom + 8;

        if (left + popoverWidth > window.innerWidth - 16) {
          left = window.innerWidth - popoverWidth - 16;
        }
        if (left < 16) {
          left = 16;
        }

        if (top + popoverHeight > window.innerHeight - 16) {
          top = rect.top - popoverHeight - 8;
        }

        setPopoverPosition({ top, left });
      }, 250);
    }
  };

  const handleDayMouseLeave = (event: React.MouseEvent) => {
    // Clear timeout if mouse leaves before delay completes
    if (hoverTimeoutRef.current !== null) {
      window.clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    const relatedTarget = event.relatedTarget as HTMLElement;
    if (popoverRef.current?.contains(relatedTarget)) {
      return;
    }
    setHoveredDay(null);
    setPopoverPosition(null);
  };

  const handlePopoverMouseLeave = () => {
    setHoveredDay(null);
    setPopoverPosition(null);
  };

  const handleEventClick = (event: CalendarEvent, day: Date) => {
    setHoveredDay(null);
    setPopoverPosition(null);
    onDateClick(day, [event]);
  };

  return (
    <div className="mini-calendar animate-fade-in">
      {/* Header */}
      <div className="mini-calendar-header">
        <button
          onClick={previousMonth}
          className="mini-calendar-nav-button"
          aria-label="Mois précédent"
        >
          <ChevronLeft />
        </button>
        <h3 className="mini-calendar-title capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: fr })}
        </h3>
        <button onClick={nextMonth} className="mini-calendar-nav-button" aria-label="Mois suivant">
          <ChevronRight />
        </button>
      </div>

      {/* Today Button */}
      <button onClick={goToToday} className="mini-calendar-today-button">
        Aujourd'hui
      </button>

      {/* Calendar Grid */}
      <div className="mini-calendar-grid">
        {/* Day Headers */}
        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
          <div key={day} className="mini-calendar-day-header">
            {day.charAt(0)}
          </div>
        ))}

        {/* Day Cells */}
        {days.map((day) => {
          const filteredEvents = getFilteredEventsForDay(day);
          const hasEvents = filteredEvents.length > 0;
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isDayToday = isToday(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const primaryEvent = getPrimaryEvent(filteredEvents);
          const additionalCount = filteredEvents.length - 1;

          return (
            <button
              key={day.toISOString()}
              ref={(el) => {
                if (el) dayRefs.current.set(day.toISOString(), el);
              }}
              onClick={() => handleDayClick(day, filteredEvents)}
              onMouseEnter={(e) => handleDayMouseEnter(day, e.currentTarget)}
              onMouseLeave={handleDayMouseLeave}
              className={cn(
                'mini-calendar-day',
                !isCurrentMonth && 'mini-calendar-day-disabled',
                isDayToday && 'mini-calendar-day-today',
                isSelected && !isDayToday && 'mini-calendar-day-selected',
                hasEvents && 'mini-calendar-day-has-events',
              )}
            >
              <span className="mini-calendar-day-number">{format(day, 'd')}</span>

              {primaryEvent && (
                <span
                  className="mini-calendar-day-event-indicator"
                  style={{
                    backgroundColor:
                      EVENT_TYPE_CONFIG[primaryEvent.type]?.color || 'var(--color-2-nuance-1)',
                  }}
                />
              )}

              {additionalCount > 0 && (
                <span
                  className="mini-calendar-day-badge"
                  style={{
                    background: `linear-gradient(135deg, ${EVENT_TYPE_CONFIG[primaryEvent?.type || 'session']?.color || 'var(--color-2-nuance-1)'}, color-mix(in srgb, ${EVENT_TYPE_CONFIG[primaryEvent?.type || 'session']?.color || 'var(--color-2-nuance-1)'} 70%, transparent))`,
                  }}
                >
                  +{additionalCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Events Popover */}
      {hoveredDay && popoverPosition && (
        <div
          ref={popoverRef}
          className="mini-calendar-events-popover"
          style={{
            position: 'fixed',
            top: `${popoverPosition.top}px`,
            left: `${popoverPosition.left}px`,
            zIndex: 9999,
          }}
          onMouseLeave={handlePopoverMouseLeave}
          role="dialog"
          aria-label="Événements du jour"
        >
          <div className="mini-calendar-events-popover-header">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="font-semibold">{format(hoveredDay, 'd MMMM', { locale: fr })}</span>
            </div>
            <button
              onClick={handlePopoverMouseLeave}
              className="mini-calendar-events-popover-close"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mini-calendar-events-popover-content">
            {getSortedFilteredEvents(hoveredDay).map((event) => {
              const config = EVENT_TYPE_CONFIG[event.type];
              const Icon = config.icon;

              return (
                <button
                  key={event.id}
                  onClick={() => handleEventClick(event, hoveredDay)}
                  className="mini-calendar-events-popover-item"
                >
                  <div className={cn('mini-calendar-events-popover-icon', config.bgClass)}>
                    <Icon className={cn('w-4 h-4', config.textClass)} />
                  </div>

                  <div className="mini-calendar-events-popover-details">
                    <p className="mini-calendar-events-popover-title">{event.title}</p>
                    <div className="mini-calendar-events-popover-meta">
                      <span
                        className={cn(
                          'mini-calendar-events-popover-badge',
                          config.bgClass,
                          config.textClass,
                        )}
                      >
                        {config.label}
                      </span>
                      {!event.allDay && (
                        <span className="flex items-center gap-1 text-xs">
                          <Clock className="w-3 h-3" />
                          {format(event.startDate, 'HH:mm')}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mini-calendar-events-popover-footer">
            {getFilteredEventsForDay(hoveredDay).length} événement
            {getFilteredEventsForDay(hoveredDay).length > 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
};
