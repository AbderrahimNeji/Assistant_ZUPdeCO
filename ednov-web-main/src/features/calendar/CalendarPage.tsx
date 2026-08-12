import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FullCalendar } from '@/components/calendar/FullCalendar';
import { MiniCalendar } from '@/components/calendar/MiniCalendar';
import { CalendarEventModal } from '@/components/calendar/CalendarEventModal';
import { DayEventsPopup } from '@/components/calendar/DayEventsPopup';
import { Select, type SelectOption } from '@/components/forms/Select';
import { CalendarEvent, CalendarEventType } from '@/types/calendar.types';
import { getCalendarEvents } from '@/services/calendar.service';
import { getVacationZones } from '@/services/academic.service';
import { usePreferencesConfig } from '@/hooks/usePreferencesConfig';
import { startOfMonth, endOfMonth, addMonths } from 'date-fns';

type CalendarPrefs = {
  defaultView?: string;
  eventSources?: CalendarEventType[];
  miniCalendarPosition?: unknown;
  vacationZoneId?: string;
};

export const CalendarPage: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [dayEventsPopup, setDayEventsPopup] = React.useState<{
    date: Date;
    events: CalendarEvent[];
  } | null>(null);
  const [enabledTypes, setEnabledTypes] = React.useState<CalendarEventType[]>([
    'session',
    'postit',
    'holiday',
  ]);
  const [dateRange] = React.useState({
    start: startOfMonth(new Date()),
    end: endOfMonth(addMonths(new Date(), 1)),
  });

  const { config: calendarConfig, saveConfig: saveCalendarConfig } =
    usePreferencesConfig('calendar');
  const cal = (calendarConfig || {}) as CalendarPrefs;
  const vacationZoneFilter = cal.vacationZoneId;

  const { data: vacationZones = [] } = useQuery({
    queryKey: ['vacation-zones'],
    queryFn: () => getVacationZones(),
  });

  const calendarZoneOptions: SelectOption[] = React.useMemo(
    () => [
      { value: '', label: 'Toutes les zones (vacances)' },
      ...vacationZones.map((z) => ({
        value: z.id,
        label: `${z.name} (${z.code})`,
      })),
    ],
    [vacationZones],
  );

  const handleVacationZoneFilterChange = (value: string) => {
    const next: Record<string, unknown> = {
      defaultView: cal.defaultView || 'month',
      eventSources: cal.eventSources || ['session', 'postit', 'holiday'],
    };
    if (cal.miniCalendarPosition) {
      next.miniCalendarPosition = cal.miniCalendarPosition;
    }
    if (value) {
      next.vacationZoneId = value;
    }
    saveCalendarConfig(next);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['calendar-events', dateRange, enabledTypes, vacationZoneFilter ?? ''],
    queryFn: () =>
      getCalendarEvents(dateRange.start, dateRange.end, enabledTypes, vacationZoneFilter),
  });

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
    setDayEventsPopup(null);
  };

  const handleDateClick = (date: Date, events: CalendarEvent[]) => {
    if (events.length === 1) {
      handleSelectEvent(events[0]);
    } else if (events.length > 1) {
      setDayEventsPopup({ date, events });
    }
  };

  const toggleType = (type: CalendarEventType) => {
    setEnabledTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Calendrier</h1>
        <p className="text-muted-foreground">
          {data?.total || 0} événement{(data?.total || 0) > 1 ? 's' : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <MiniCalendar
            events={data?.events || []}
            onDateClick={handleDateClick}
            enabledTypes={enabledTypes}
          />

          <div className="mt-6 p-4 bg-card rounded-lg border space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Vacances scolaires</h3>
              <Select
                label="Filtrer par zone"
                value={vacationZoneFilter || ''}
                onChange={handleVacationZoneFilterChange}
                options={calendarZoneOptions}
                helperText="Affiche les vacances nationales + celles de la zone choisie"
              />
            </div>
            <h3 className="font-semibold mb-4">Légende</h3>
            <div className="space-y-2">
              <div className="flex-start gap-2">
                <div className="calendar-legend-session" />
                <span className="text-muted">Séances</span>
              </div>
              <div className="flex-start gap-2">
                <div className="calendar-legend-postit" />
                <span className="text-muted">Post-its</span>
              </div>
              <div className="flex-start gap-2">
                <div className="calendar-legend-holiday" />
                <span className="text-muted">Vacances</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <p>Chargement...</p>
            </div>
          ) : (
            <FullCalendar
              events={data?.events || []}
              onSelectEvent={handleSelectEvent}
              enabledTypes={enabledTypes}
              onToggleType={toggleType}
            />
          )}
        </div>
      </div>

      <CalendarEventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        event={selectedEvent}
      />

      <DayEventsPopup
        isOpen={!!dayEventsPopup}
        onClose={() => setDayEventsPopup(null)}
        date={dayEventsPopup?.date || new Date()}
        events={dayEventsPopup?.events || []}
        onSelectEvent={handleSelectEvent}
      />
    </div>
  );
};
