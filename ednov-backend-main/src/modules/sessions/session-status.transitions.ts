import { DateTime } from 'luxon';
import { SessionStatus } from './entities/session.entity';
import type { StatusTransitionTriggerType } from './entities/session-status-history.entity';
import { toLocalDateString } from '../../common/utils/date-parser.utils';

/** Allowed stored transitions: (fromStatus, toStatus) per trigger type. Time-based transitions are computed at GET. */
const ALLOWED_STORED_TRANSITIONS: Record<
  StatusTransitionTriggerType,
  Array<[SessionStatus, SessionStatus]>
> = {
  manual: [[SessionStatus.PLANNED, SessionStatus.CANCELLED]],
  attendance: [[SessionStatus.PLANNED, SessionStatus.IN_PROGRESS]],
  cr_validation: [[SessionStatus.IN_PROGRESS, SessionStatus.CLOSED]],
};

export function isAllowedStoredTransition(
  fromStatus: SessionStatus,
  toStatus: SessionStatus,
  triggerType: StatusTransitionTriggerType,
): boolean {
  const allowed = ALLOWED_STORED_TRANSITIONS[triggerType];
  if (!allowed) return false;
  return allowed.some(([from, to]) => from === fromStatus && to === toStatus);
}

/**
 * Session-like shape with status, sessionDate, startTime, endTime (for getEffectiveStatus).
 * When `establishment.timezone` is set (IANA, e.g. Europe/Paris), start/end are interpreted as local wall time there.
 */
export interface SessionLike {
  status: SessionStatus;
  sessionDate: Date | string;
  startTime: string;
  /** Optional in API responses; when missing, completion is not auto-derived. */
  endTime?: string;
  establishment?: { timezone?: string | null } | null;
}

const DEFAULT_SESSION_TIMEZONE = 'Europe/Paris';

/**
 * Resolve timezone for a session:
 * 1. Use override if provided
 * 2. Use establishment timezone if available
 * 3. Fall back to DEFAULT_SESSION_TIMEZONE
 */
function resolveTimeZone(session: SessionLike, override?: string): string {
  if (override?.trim()) return override.trim();
  const tz = session.establishment?.timezone;
  if (typeof tz === 'string' && tz.trim()) return tz.trim();
  return DEFAULT_SESSION_TIMEZONE;
}

/** Interprets session_date + time as local wall clock in `timeZone`, returns UTC epoch ms. */
function wallSessionInstantMs(dateStr: string, timeStr: string, timeZone: string): number | null {
  const t = String(timeStr ?? '').trim();
  if (!t) return null;
  const normalized = t.length === 5 ? `${t}:00` : t;
  const dt = DateTime.fromISO(`${dateStr}T${normalized}`, { zone: timeZone });
  if (!dt.isValid) return null;
  return dt.toUTC().toMillis();
}

/**
 * Compute effective status at read time. Time-based transitions use establishment timezone when available
 * (`establishment.timezone`, else Europe/Paris). Pass `timeZoneOverride` (e.g. `'UTC'` in tests) to fix the zone.
 *
 * - CLOSED / CANCELLED / COMPLETED: returned as-is (terminal for this helper).
 * - PLANNED: before start → PLANNED; at/after end (if end known) → COMPLETED; else at/after start → IN_PROGRESS.
 * - IN_PROGRESS: at/after end (if end known) → COMPLETED; else IN_PROGRESS.
 *
 * If endTime is missing: PLANNED→IN_PROGRESS after start; IN_PROGRESS never auto-completes.
 */
export function getEffectiveStatus(
  session: SessionLike,
  now: Date = new Date(),
  timeZoneOverride?: string,
): SessionStatus {
  const stored = session.status as SessionStatus;
  if (
    stored === SessionStatus.CLOSED ||
    stored === SessionStatus.CANCELLED ||
    stored === SessionStatus.COMPLETED
  ) {
    return stored;
  }

  const dateStr =
    typeof session.sessionDate === 'string'
      ? session.sessionDate.slice(0, 10)
      : toLocalDateString(session.sessionDate);
  const startTime = String(session.startTime ?? '').trim();
  const endTime = String(session.endTime ?? '').trim();
  if (!startTime) return stored;

  const tz = resolveTimeZone(session, timeZoneOverride);
  const startAtMs = wallSessionInstantMs(dateStr, startTime, tz);
  if (startAtMs == null) return stored;

  let endAtMs: number | null = null;
  if (endTime) {
    endAtMs = wallSessionInstantMs(dateStr, endTime, tz);
    if (Number.isNaN(endAtMs!)) endAtMs = null;
  }

  const nowMs = now.getTime();

  if (stored === SessionStatus.PLANNED) {
    if (nowMs < startAtMs) return SessionStatus.PLANNED;
    if (endAtMs != null && nowMs >= endAtMs) return SessionStatus.COMPLETED;
    return SessionStatus.IN_PROGRESS;
  }

  if (stored === SessionStatus.IN_PROGRESS) {
    if (endAtMs == null) return SessionStatus.IN_PROGRESS;
    return nowMs >= endAtMs ? SessionStatus.COMPLETED : SessionStatus.IN_PROGRESS;
  }

  return stored;
}
