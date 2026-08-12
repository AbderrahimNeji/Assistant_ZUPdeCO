import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FullCalendar } from '@/components/calendar/FullCalendar';
import { CalendarEventModal } from '@/components/calendar/CalendarEventModal';
import { getCalendarEvents } from '@/services/calendar.service';
import type { CalendarEvent } from '@/types/calendar.types';
import { usePreferencesStore } from '@/stores/preferencesStore';

type CalendarEventType = 'session' | 'postit' | 'holiday';

interface CalendarSectionProps {
  initialEnabledTypes?: CalendarEventType[];
}

export const CalendarSection: React.FC<CalendarSectionProps> = ({
  initialEnabledTypes = ['session', 'postit', 'holiday'],
}) => {
  const [enabledTypes, setEnabledTypes] = React.useState<CalendarEventType[]>(initialEnabledTypes);
  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEvent | null>(null);

  const preferences = usePreferencesStore((s) => s.preferences);
  const vacationZoneId = (
    preferences?.interfaceConfigs?.calendar as { vacationZoneId?: string } | undefined
  )?.vacationZoneId;

  const { data: calendarEventsResponse, isLoading } = useQuery({
    queryKey: ['calendarEvents', enabledTypes, vacationZoneId ?? ''],
    queryFn: () => {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);
      return getCalendarEvents(startDate, endDate, undefined, vacationZoneId);
    },
  });

  const calendarEvents = calendarEventsResponse?.events || [];

  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const handleToggleType = (type: CalendarEventType) => {
    setEnabledTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="section-header">
          <h2 className="section-title">Calendrier</h2>
        </div>
        <div className="h-96 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <FullCalendar
        events={calendarEvents}
        onSelectEvent={handleSelectEvent}
        enabledTypes={enabledTypes}
        onToggleType={handleToggleType}
      />

      <CalendarEventModal
        event={selectedEvent}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
};
