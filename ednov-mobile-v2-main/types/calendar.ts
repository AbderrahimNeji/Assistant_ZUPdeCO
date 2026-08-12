/**
 * Event for calendar widget and full-screen calendar.
 * Used to display sessions (and optionally other types) on the calendar.
 */
export interface CalendarEvent {
  id: string;
  date: string;
  time?: string;
  title: string;
  type?: 'session';
}

import {
  type SessionParticipant,
  formatSessionStudentsTitle,
  SESSION_NO_STUDENT_ASSIGNED_LABEL,
} from '@/types/session';

export type SessionLike = {
  id: string;
  date: string;
  studentName?: string;
  participants?: SessionParticipant[];
};

/**
 * Maps sessions to calendar events for the widget and full-screen calendar.
 * Uses session date (ISO) for date, extracts time if present, title from studentName or participant names or "Séance".
 */
export function sessionsToCalendarEvents(sessions: SessionLike[]): CalendarEvent[] {
  return sessions.map((s) => {
    const d = new Date(s.date);
    const dateStr = s.date.slice(0, 10);
    const timeStr =
      s.date.length > 10
        ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        : undefined;
    const raw = (s as Record<string, unknown>).studentName;
    let title: string;
    if (typeof raw === 'string' && raw.trim().length > 0) {
      title = raw.trim();
    } else {
      const fromParts = formatSessionStudentsTitle(s.participants);
      title = fromParts === SESSION_NO_STUDENT_ASSIGNED_LABEL ? 'Séance' : fromParts;
    }
    return {
      id: s.id,
      date: dateStr,
      time: timeStr,
      title,
      type: 'session',
    };
  });
}
