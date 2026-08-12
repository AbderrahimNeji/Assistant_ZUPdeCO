/**
 * User availability: weekly slots in UTC.
 * Format: { "weekly": [ { "day": 0-6, "start": "HH:mm" or "HH:mm:ss", "end": "HH:mm" or "HH:mm:ss" } ] }
 * day: 0 = Sunday, 1 = Monday, ..., 6 = Saturday (JavaScript getUTCDay()).
 */

export interface WeeklySlot {
  day: number;
  start: string;
  end: string;
}

export interface AvailabilityShape {
  weekly?: WeeklySlot[];
}

function parseTimeToMinutes(s: string): number {
  const trimmed = String(s ?? '').trim();
  const [h, m, sec] = trimmed.split(':').map((x) => parseInt(x, 10) || 0);
  return h * 60 + m + (sec || 0) / 60;
}

/**
 * Returns true if the session slot (date + start/end time in UTC) falls within at least one weekly availability slot.
 * sessionDate is interpreted in UTC for day-of-week; startTime and endTime are "HH:mm" or "HH:mm:ss" in UTC.
 */
export function isAvailableForSession(
  availability: Record<string, unknown> | null | undefined,
  sessionDate: Date | string,
  startTime: string,
  endTime: string,
): boolean {
  if (!availability || typeof availability !== 'object') return false;
  const weekly = (availability as AvailabilityShape).weekly;
  if (!Array.isArray(weekly) || weekly.length === 0) return false;

  const d = typeof sessionDate === 'string' ? new Date(sessionDate + 'Z') : new Date(sessionDate);
  const day = d.getUTCDay();
  const sessionStartMin = parseTimeToMinutes(startTime);
  const sessionEndMin = parseTimeToMinutes(endTime);
  if (sessionStartMin >= sessionEndMin) return false;

  for (const slot of weekly) {
    if (slot.day !== day) continue;
    const slotStart = parseTimeToMinutes(slot.start);
    const slotEnd = parseTimeToMinutes(slot.end);
    if (slotStart >= slotEnd) continue;
    if (sessionStartMin >= slotStart && sessionEndMin <= slotEnd) return true;
  }
  return false;
}
