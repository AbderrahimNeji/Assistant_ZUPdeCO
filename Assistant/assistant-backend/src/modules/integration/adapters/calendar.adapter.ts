import { Injectable } from '@nestjs/common';

import { EdnovApiClient } from '../ednov-api.client';
import { RequestContextStore } from '../request-context';

export type CalendarEventType = 'session' | 'postit' | 'holiday';

export type EdnovCalendarEvent = {
  id?: string;
  title?: string;
  startDate?: string;
  endDate?: string;
  allDay?: boolean;
  type?: CalendarEventType | string;
  sourceId?: string;
  metadata?: {
    sessionType?: string;
    establishmentName?: string;
    sessionStatus?: string;
    subjectNames?: string[];
    postitThematic?: string;
    holidayType?: string;
    participants?: Array<{ name?: string; role?: string }>;
  };
};

export type CalendarSlot = {
  weekday: string;
  date: string;
  time: string;
  title: string;
  type: string;
  establishment: string | null;
  status: string | null;
};

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function weekdayLabel(d: Date): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()] ?? '';
}

function fmtTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * GET /calendar/events — sessions + post-its + holidays for the company.
 * Query requires local YYYY-MM-DD startDate/endDate (not ISO datetimes).
 */
@Injectable()
export class CalendarAdapter {
  constructor(private readonly ednov: EdnovApiClient) {}

  async getTimetable(
    _userId: string,
    range?: { startDate?: string; endDate?: string; focusedOnly?: boolean },
  ): Promise<CalendarSlot[]> {
    const ctxRange = RequestContextStore.getApplicationContext()?.date;
    const now = new Date();
    const start = range?.startDate
      ? new Date(`${range.startDate}T00:00:00`)
      : ctxRange?.start
        ? new Date(`${ctxRange.start}T00:00:00`)
        : (() => {
            const d = new Date(now);
            d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
            d.setHours(0, 0, 0, 0);
            return d;
          })();
    const end = range?.endDate
      ? new Date(`${range.endDate}T00:00:00`)
      : ctxRange?.end
        ? new Date(`${ctxRange.end}T00:00:00`)
        : (() => {
            const d = new Date(start);
            d.setDate(d.getDate() + 6);
            return d;
          })();

    const raw = await this.ednov.get<
      { events?: EdnovCalendarEvent[]; total?: number } | EdnovCalendarEvent[]
    >('/calendar/events', {
      params: {
        startDate: toYmd(start),
        endDate: toYmd(end),
      },
    });

    const list = Array.isArray(raw) ? raw : raw.events ?? [];
    const focusedSession =
      RequestContextStore.getApplicationContext()?.session?.id;
    const restrictToFocused = Boolean(range?.focusedOnly && focusedSession);

    return list
      .filter((event) =>
        restrictToFocused
          ? event.id === focusedSession || event.sourceId === focusedSession
          : true,
      )
      .slice(0, 40)
      .map((event) => this.mapEvent(event))
      .filter((slot): slot is CalendarSlot => slot != null);
  }

  private mapEvent(event: EdnovCalendarEvent): CalendarSlot | null {
    if (!event.startDate) return null;
    const startAt = new Date(event.startDate);
    if (Number.isNaN(startAt.getTime())) return null;
    const endAt = event.endDate ? new Date(event.endDate) : startAt;
    const time = event.allDay
      ? 'all-day'
      : `${fmtTime(event.startDate)}–${fmtTime(event.endDate) || fmtTime(event.startDate)}`;
    const tutor = event.metadata?.participants?.find(
      (p) => p.role === 'tutor' || p.role === 'volunteer',
    )?.name;
    return {
      weekday: weekdayLabel(startAt),
      date: toYmd(startAt),
      time,
      title: event.title?.trim() || event.type || 'Event',
      type: event.type ?? 'session',
      establishment: event.metadata?.establishmentName ?? null,
      status: event.metadata?.sessionStatus ?? tutor ?? null,
    };
  }
}
