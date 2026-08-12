import apiClient from './api-client';
import { CalendarEvent, CalendarEventType } from '@/types/calendar.types';
import { toLocalDateString } from '@/lib/date-utils';

export interface CalendarEventsResponse {
  events: CalendarEvent[];
  total: number;
}

export const getCalendarEvents = async (
  startDate: Date,
  endDate: Date,
  types?: CalendarEventType[],
  vacationZoneId?: string,
): Promise<CalendarEventsResponse> => {
  const params = new URLSearchParams();
  params.append('startDate', toLocalDateString(startDate));
  params.append('endDate', toLocalDateString(endDate));

  if (types && types.length > 0) {
    params.append('types', types.join(','));
  }

  if (vacationZoneId) {
    params.append('vacationZoneId', vacationZoneId);
  }

  const response = await apiClient.get<CalendarEventsResponse>(
    `/calendar/events?${params.toString()}`,
  );

  return {
    ...response.data,
    events: response.data.events.map((event) => ({
      ...event,
      startDate: new Date(event.startDate),
      endDate: new Date(event.endDate),
    })),
  };
};
