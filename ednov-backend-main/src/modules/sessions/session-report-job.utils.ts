import { DateTime } from 'luxon';
import type { Session } from './entities/session.entity';
import type { RecurrenceType, SessionMode } from './entities/session.entity';
import { toLocalDateString } from '../../common/utils/date-parser.utils';

/** YYYY-MM-DD from DB date column or ISO string (aligned with existing session code). */
export function sessionDateToYmd(sessionDate: Date | string): string {
  return toLocalDateString(sessionDate);
}

/** True when `createdInZone`'s calendar date equals the session row's `session_date` (same YMD as rest of job helpers). */
export function isSameCreationCalendarDayAsSessionDate(
  createdInZone: DateTime,
  sessionDate: Date | string,
): boolean {
  return createdInZone.toISODate() === sessionDateToYmd(sessionDate);
}

/** Start of session in the company's civil timezone. */
export function getSessionStartDateTime(
  sessionDate: Date | string,
  startTime: string,
  zone: string,
): DateTime {
  const ymd = sessionDateToYmd(sessionDate);
  const [y, mo, d] = ymd.split('-').map((x) => parseInt(x, 10));
  const parts = String(startTime).split(':');
  const hh = parseInt(parts[0] ?? '0', 10) || 0;
  const mm = parseInt(parts[1] ?? '0', 10) || 0;
  const ss = parseInt(parts[2] ?? '0', 10) || 0;
  return DateTime.fromObject(
    { year: y, month: mo, day: d, hour: hh, minute: mm, second: ss },
    { zone },
  );
}

/** Wall time end of session in `zone`; null if `endTime` missing. */
export function getSessionEndDateTime(
  sessionDate: Date | string,
  endTime: string | null | undefined,
  zone: string,
): DateTime | null {
  if (endTime == null || !String(endTime).trim()) return null;
  const ymd = sessionDateToYmd(sessionDate);
  const [y, mo, d] = ymd.split('-').map((x) => parseInt(x, 10));
  const parts = String(endTime).split(':');
  const hh = parseInt(parts[0] ?? '0', 10) || 0;
  const mm = parseInt(parts[1] ?? '0', 10) || 0;
  const ss = parseInt(parts[2] ?? '0', 10) || 0;
  return DateTime.fromObject(
    { year: y, month: mo, day: d, hour: hh, minute: mm, second: ss },
    { zone },
  );
}

/**
 * Instant from which the VSC daily report becomes visible (aligned with “séance terminée” after end time).
 * Prefers `endTime`, then `durationMinutes` from start, else end of civil day in `zone`.
 */
export function computeVscDailyReportVisibleAtJsDate(session: Session, zone: string): Date {
  const start = getSessionStartDateTime(session.sessionDate, session.startTime, zone);
  const end = getSessionEndDateTime(session.sessionDate, session.endTime, zone);
  if (end != null) return end.toUTC().toJSDate();
  const dm = session.durationMinutes;
  if (dm != null && dm > 0) return start.plus({ minutes: dm }).toUTC().toJSDate();
  return start.endOf('day').toUTC().toJSDate();
}

/** Same rule as `create` in sessions.service (`isRecurring`). */
export function isRecurringSeriesForJob(mode: SessionMode | string, recurrenceType: RecurrenceType | string): boolean {
  return mode === 'recurring' && recurrenceType !== 'none' && recurrenceType !== 'once';
}

export function floorSlot30(dt: DateTime): DateTime {
  return dt.set({
    minute: dt.minute < 30 ? 0 : 30,
    second: 0,
    millisecond: 0,
  });
}

export function sameSlot30(a: DateTime, b: DateTime): boolean {
  return floorSlot30(a).toMillis() === floorSlot30(b).toMillis();
}

/**
 * True when creation and session start share the same 30-min civil slot, but the session start
 * is NOT in the job's rolling [windowStartUtc, windowEndUtc) — so the cron job should not create
 * the report for this session on the current tick; create-on-session-save may apply instead.
 */
export function isOnCreateInitialReportSlot(
  createdInZone: DateTime,
  startDt: DateTime,
  windowStartUtc: DateTime,
  windowEndUtc: DateTime,
): boolean {
  return sameSlot30(createdInZone, startDt) && !isStartInWindow(startDt, windowStartUtc, windowEndUtc);
}

export function compareSessionSchedule(a: Session, b: Session): number {
  const da = sessionDateToYmd(a.sessionDate).localeCompare(sessionDateToYmd(b.sessionDate));
  if (da !== 0) return da;
  return (a.startTime ?? '').localeCompare(b.startTime ?? '');
}

/** True if session `a` is on the same calendar slot or after `anchor` (date then start time). */
export function isSessionAtOrAfter(a: Session, anchor: Session): boolean {
  return compareSessionSchedule(a, anchor) >= 0;
}

export type SessionWithStart = {
  session: Session;
  startDt: DateTime;
  createdInZone: DateTime;
};

/**
 * Recurring series + createdAt and session start in the same 30-min civil slot:
 * keep only the earliest occurrence (session_date, start_time) per recurrence_group_id.
 */
export function dedupeRecurringSameCreatedStartSlot(entries: SessionWithStart[]): Session[] {
  const normal: Session[] = [];
  const edgeByGroup = new Map<string, SessionWithStart>();

  for (const e of entries) {
    const s = e.session;
    const gid = s.recurrenceGroupId;
    const edge =
      !!gid &&
      isRecurringSeriesForJob(s.mode, s.recurrenceType) &&
      sameSlot30(e.createdInZone, e.startDt);
    if (!edge) {
      normal.push(s);
      continue;
    }
    const prev = edgeByGroup.get(gid);
    if (!prev) {
      edgeByGroup.set(gid, e);
      continue;
    }
    if (compareSessionSchedule(s, prev.session) < 0) {
      edgeByGroup.set(gid, e);
    }
  }

  return [...normal, ...[...edgeByGroup.values()].map((x) => x.session)];
}

/** True if session start (in zone) is in [windowStartUtc, windowEndUtc) in absolute time. */
export function isStartInWindow(
  startDt: DateTime,
  windowStartUtc: DateTime,
  windowEndUtc: DateTime,
): boolean {
  const startUtc = startDt.toUTC();
  return startUtc >= windowStartUtc && startUtc < windowEndUtc;
}
