import * as React from 'react';
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarDays, StickyNote, Palmtree } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CalendarEvent, CalendarEventType } from '@/types/calendar.types';
import { CalendarEventModal } from './CalendarEventModal';
import { cn } from '@/lib/utils';
import { EVENT_TYPE_CONFIG, SESSION_TYPE_CONFIG, EVENT_COLOR_MAP } from './calendar.config';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
  fr: fr,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface FilterToggleProps {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  colorClass: string;
}

const FilterToggle: React.FC<FilterToggleProps> = ({
  label,
  icon,
  isActive,
  onClick,
  colorClass,
}) => (
  <TooltipProvider delayDuration={200}>
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            'calendar-filter-toggle',
            colorClass,
            isActive && 'calendar-filter-toggle-active',
          )}
        >
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isActive ? `Masquer ${label}` : `Afficher ${label}`}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

interface FullCalendarProps {
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  enabledTypes?: CalendarEventType[];
  onToggleType?: (type: CalendarEventType) => void;
}

export const FullCalendar: React.FC<FullCalendarProps> = ({
  events,
  onSelectEvent,
  enabledTypes = ['session', 'postit', 'holiday'],
  onToggleType,
}) => {
  const [view, setView] = React.useState<View>('month');
  const [date, setDate] = React.useState(new Date());
  const [dayEventsModalDate, setDayEventsModalDate] = React.useState<Date | null>(null);
  const [dayEventsModalEvents, setDayEventsModalEvents] = React.useState<CalendarEvent[]>([]);
  const [selectedEventInModal, setSelectedEventInModal] = React.useState<CalendarEvent | null>(
    null,
  );

  const filteredEvents = React.useMemo(() => {
    return events.filter((event) => enabledTypes.includes(event.type));
  }, [events, enabledTypes]);

  // Get events for a specific date
  const getEventsForDate = React.useCallback(
    (targetDate: Date): CalendarEvent[] => {
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth();
      const targetDay = targetDate.getDate();

      return filteredEvents.filter((event) => {
        const eventYear = event.startDate.getFullYear();
        const eventMonth = event.startDate.getMonth();
        const eventDay = event.startDate.getDate();

        // Same day check
        if (eventYear === targetYear && eventMonth === targetMonth && eventDay === targetDay) {
          return true;
        }

        // All-day events that span multiple days
        if (event.allDay && event.startDate <= targetDate && event.endDate >= targetDate) {
          return true;
        }

        return false;
      });
    },
    [filteredEvents],
  );

  // Get primary event based on prioritization logic with enabled types filtering
  const getPrimaryEvent = React.useCallback(
    (events: CalendarEvent[], activeTypes: CalendarEventType[]): CalendarEvent | null => {
      if (events.length === 0) return null;

      // Filter by enabled types
      const activeEvents = events.filter((e) => activeTypes.includes(e.type));
      if (activeEvents.length === 0) return null;

      const now = new Date();

      // Priority 1: Sessions (if enabled)
      if (activeTypes.includes('session')) {
        const sessions = activeEvents.filter((e) => e.type === 'session');
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
      }

      // Priority 2: Post-its (if enabled)
      if (activeTypes.includes('postit')) {
        // Filter out done post-its
        const postits = activeEvents.filter(
          (e) => e.type === 'postit' && e.metadata.postitStatus !== 'done',
        );

        if (postits.length > 0) {
          // Separate priority and non-priority post-its
          const priorityPostits = postits.filter((p) => p.metadata.postitPriority === true);
          const nonPriorityPostits = postits.filter((p) => !p.metadata.postitPriority);

          // Sort each group by deadline (closest first)
          const sortedPriority = [...priorityPostits].sort(
            (a, b) => a.startDate.getTime() - b.startDate.getTime(),
          );
          const sortedNonPriority = [...nonPriorityPostits].sort(
            (a, b) => a.startDate.getTime() - b.startDate.getTime(),
          );

          // Return first priority post-it, otherwise first non-priority
          return sortedPriority[0] || sortedNonPriority[0] || null;
        }
      }

      // Priority 3: Holidays (if enabled)
      if (activeTypes.includes('holiday')) {
        return activeEvents.find((e) => e.type === 'holiday') || null;
      }

      return null;
    },
    [],
  );

  const calendarEvents = React.useMemo(() => {
    // Get all unique dates from events (including multi-day allDay events)
    const allDates = new Set<string>();

    filteredEvents.forEach((event) => {
      if (event.allDay && event.startDate.getTime() !== event.endDate.getTime()) {
        // Multi-day event: add all dates in range
        const start = new Date(event.startDate);
        const end = new Date(event.endDate);
        const current = new Date(start);

        while (current <= end) {
          const dateKey = `${current.getFullYear()}-${current.getMonth()}-${current.getDate()}`;
          allDates.add(dateKey);
          current.setDate(current.getDate() + 1);
        }
      } else {
        // Single day event
        const dateKey = `${event.startDate.getFullYear()}-${event.startDate.getMonth()}-${event.startDate.getDate()}`;
        allDates.add(dateKey);
      }
    });

    // For each unique date, get all events for that date and select primary
    const primaryEvents: CalendarEvent[] = [];

    allDates.forEach((dateKey) => {
      const [year, month, day] = dateKey.split('-').map(Number);
      const targetDate = new Date(year, month, day);

      // Get all events for this date (including multi-day allDay events)
      const dateEvents = filteredEvents.filter((event) => {
        const eventYear = event.startDate.getFullYear();
        const eventMonth = event.startDate.getMonth();
        const eventDay = event.startDate.getDate();

        // Same day check
        if (eventYear === year && eventMonth === month && eventDay === day) {
          return true;
        }

        // All-day events that span this date
        if (event.allDay && event.startDate <= targetDate && event.endDate >= targetDate) {
          return true;
        }

        return false;
      });

      const primaryEvent = getPrimaryEvent(dateEvents, enabledTypes);
      if (primaryEvent) {
        // Create a unique event for this specific date
        // For allDay events, keep original start/end dates to show full period in modal
        primaryEvents.push({
          ...primaryEvent,
          id: `${primaryEvent.id}-${dateKey}`,
          startDate: primaryEvent.allDay
            ? primaryEvent.startDate
            : new Date(
                year,
                month,
                day,
                primaryEvent.startDate.getHours(),
                primaryEvent.startDate.getMinutes(),
              ),
          endDate: primaryEvent.allDay
            ? primaryEvent.endDate
            : new Date(
                year,
                month,
                day,
                primaryEvent.endDate.getHours(),
                primaryEvent.endDate.getMinutes(),
              ),
        });
      }
    });

    return primaryEvents.map((event) => ({
      id: event.id,
      title:
        event.type === 'session' && event.metadata.sessionType
          ? SESSION_TYPE_CONFIG[event.metadata.sessionType]?.label || event.title
          : event.title,
      start: event.startDate,
      end: event.endDate,
      allDay: event.allDay,
      resource: event,
    }));
  }, [filteredEvents, getPrimaryEvent, enabledTypes]);

  // Render custom badges on date cells after calendar renders
  React.useEffect(() => {
    if (view !== 'month') return;

    // Wait for calendar to render
    const timer = setTimeout(() => {
      // Remove any existing badges first
      document.querySelectorAll('.rbc-date-cell-badge').forEach((badge) => badge.remove());

      const badges: HTMLElement[] = [];
      const listeners = new Map<HTMLElement, (e: Event) => void>();

      // Get the month view container
      const monthView = document.querySelector('.rbc-month-view');
      if (!monthView) return;

      const dateCells = monthView.querySelectorAll('.rbc-date-cell');
      const processedDates = new Set<string>();

      dateCells.forEach((cell) => {
        const dateText = cell.textContent?.trim();
        if (!dateText) return;

        const dayNumber = Number.parseInt(dateText, 10);
        if (Number.isNaN(dayNumber)) return;

        // Detect if this is an off-range cell (previous or next month)
        const isOffRange = cell.classList.contains('rbc-off-range');
        let cellMonth = date.getMonth();
        let cellYear = date.getFullYear();

        if (isOffRange) {
          // If day number is high (>20), it's from previous month
          if (dayNumber > 20) {
            cellMonth = date.getMonth() - 1;
            if (cellMonth < 0) {
              cellMonth = 11;
              cellYear = date.getFullYear() - 1;
            }
          }
          // If day number is low (<15), it's from next month
          else if (dayNumber < 15) {
            cellMonth = date.getMonth() + 1;
            if (cellMonth > 11) {
              cellMonth = 0;
              cellYear = date.getFullYear() + 1;
            }
          }
        }

        const cellDate = new Date(cellYear, cellMonth, dayNumber);
        const dateKey = `${cellYear}-${cellMonth}-${dayNumber}`;

        // Avoid processing the same date multiple times
        if (processedDates.has(dateKey)) return;
        processedDates.add(dateKey);

        const cellEvents = getEventsForDate(cellDate);

        // Count only visible events (enabled types)
        const visibleEvents = cellEvents.filter((e) => enabledTypes.includes(e.type));
        const additionalCount = visibleEvents.length - 1;

        if (additionalCount > 0) {
          const primaryEvent = getPrimaryEvent(cellEvents, enabledTypes);

          const badge = document.createElement('button');
          badge.className = 'rbc-date-cell-badge';
          badge.textContent = `+${additionalCount}`;
          badge.style.background = EVENT_TYPE_CONFIG[primaryEvent?.type || 'session']?.color;
          badge.setAttribute(
            'aria-label',
            `${additionalCount} événement${additionalCount > 1 ? 's' : ''} supplémentaire${additionalCount > 1 ? 's' : ''}`,
          );

          // Click handler to open modal
          const clickHandler = (e: Event) => {
            e.stopPropagation();
            setDayEventsModalDate(cellDate);
            setDayEventsModalEvents(visibleEvents);
            setSelectedEventInModal(null);
          };

          badge.addEventListener('click', clickHandler);
          listeners.set(badge, clickHandler);
          badges.push(badge);

          cell.appendChild(badge);
        }
      });

      // Cleanup stored in ref
      return () => {
        listeners.forEach((handler, badge) => {
          badge.removeEventListener('click', handler);
        });
        badges.forEach((badge) => badge.remove());
      };
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [view, filteredEvents, date, enabledTypes, getEventsForDate, getPrimaryEvent]);

  const eventStyleGetter = (event: { resource: CalendarEvent }) => {
    const calEvent = event.resource;
    const colors = EVENT_COLOR_MAP[calEvent.type] || EVENT_COLOR_MAP.session;

    return {
      style: {
        background: colors.bg,
        borderColor: colors.border,
        color: 'white',
      },
    };
  };

  return (
    <div className="space-y-5">
      {/* Header with Title and Filters */}
      <div className="section-header">
        <h2 className="section-title">Calendrier</h2>
        <div className="section-actions">
          <FilterToggle
            label="les séances"
            icon={<CalendarDays className="h-4 w-4" />}
            isActive={enabledTypes.includes('session')}
            onClick={() => onToggleType?.('session')}
            colorClass="calendar-filter-session"
          />
          <FilterToggle
            label="les post-its"
            icon={<StickyNote className="h-4 w-4" />}
            isActive={enabledTypes.includes('postit')}
            onClick={() => onToggleType?.('postit')}
            colorClass="calendar-filter-postit"
          />
          <FilterToggle
            label="les vacances"
            icon={<Palmtree className="h-4 w-4" />}
            isActive={enabledTypes.includes('holiday')}
            onClick={() => onToggleType?.('holiday')}
            colorClass="calendar-filter-holiday"
          />
        </div>
      </div>

      {/* Calendar */}
      <div className="calendar-container h-[600px]">
        <Calendar
          localizer={localizer}
          events={calendarEvents}
          startAccessor={'start' as any}
          endAccessor={'end' as any}
          style={{ height: '100%' }}
          onSelectEvent={(event) => {
            // Click direct sur un événement simple
            setSelectedEventInModal(event.resource);
            setDayEventsModalDate(null);
            setDayEventsModalEvents([]);
          }}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          eventPropGetter={eventStyleGetter}
          culture="fr"
          messages={{
            next: 'Suivant',
            previous: 'Précédent',
            today: "Aujourd'hui",
            month: 'Mois',
            week: 'Semaine',
            day: 'Jour',
            agenda: 'Agenda',
            date: 'Date',
            time: 'Heure',
            event: 'Événement',
            noEventsInRange: 'Aucun événement dans cette période',
          }}
        />
      </div>

      {/* Calendar Event Modal */}
      <CalendarEventModal
        isOpen={!!dayEventsModalDate || !!selectedEventInModal}
        onClose={() => {
          setDayEventsModalDate(null);
          setDayEventsModalEvents([]);
          setSelectedEventInModal(null);
        }}
        event={selectedEventInModal}
        dayEvents={dayEventsModalDate ? dayEventsModalEvents : undefined}
        onEdit={(sourceId, type) => {
          // Find the event by sourceId and type
          let allEvents: CalendarEvent[] = [];
          if (dayEventsModalDate) {
            allEvents = dayEventsModalEvents;
          } else if (selectedEventInModal) {
            allEvents = [selectedEventInModal];
          }
          const eventToEdit = allEvents.find((e) => e.sourceId === sourceId && e.type === type);
          if (eventToEdit) {
            onSelectEvent(eventToEdit);
          }
        }}
      />

      {/* Legend */}
      <div className="calendar-legend">
        <div className="calendar-legend-item calendar-legend-session">
          <span className="calendar-legend-dot" />
          <span>Séances</span>
        </div>
        <div className="calendar-legend-item calendar-legend-postit">
          <span className="calendar-legend-dot" />
          <span>Post-its</span>
        </div>
        <div className="calendar-legend-item calendar-legend-holiday">
          <span className="calendar-legend-dot" />
          <span>Vacances</span>
        </div>
      </div>
    </div>
  );
};
