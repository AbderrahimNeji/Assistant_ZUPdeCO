import type { Session } from '@/types/session';
import type { DashboardPeriod } from '@/types/dashboard';

function getWeekStart(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getWeekEnd(d: Date): Date {
  const start = getWeekStart(d);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function getMonthStart(d: Date): Date {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getMonthEnd(d: Date): Date {
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Returns the base year of the current school year.
 * The school year runs Sept 1 (year Y) → Jul 31 (year Y+1).
 * Examples: Oct 2025 → 2025, Feb 2026 → 2025, Aug 2026 → 2025 (summer gap).
 */
function getSchoolYearBaseYear(d: Date): number {
  return d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
}

/**
 * School year: Sept 1 → Jul 31 (next calendar year).
 */
function getSchoolYearStart(d: Date): Date {
  const start = new Date(getSchoolYearBaseYear(d), 8, 1);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getSchoolYearEnd(d: Date): Date {
  const end = new Date(getSchoolYearBaseYear(d) + 1, 6, 31);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * School trimesters:
 *   T1 — Sept 1 → Nov 30
 *   T2 — Dec 1  → Feb 28/29  (crosses calendar year)
 *   T3 — Mar 1  → Jul 31
 */
function getQuarterStart(d: Date): Date {
  const sy = getSchoolYearBaseYear(d);
  const m = d.getMonth();
  let start: Date;
  if (m >= 8 && m <= 10) {
    start = new Date(sy, 8, 1);       // T1: Sept 1
  } else if (m === 11 || m <= 1) {
    start = new Date(sy, 11, 1);      // T2: Dec 1
  } else {
    start = new Date(sy + 1, 2, 1);   // T3: Mar 1
  }
  start.setHours(0, 0, 0, 0);
  return start;
}

function getQuarterEnd(d: Date): Date {
  const sy = getSchoolYearBaseYear(d);
  const m = d.getMonth();
  let end: Date;
  if (m >= 8 && m <= 10) {
    end = new Date(sy, 10, 30);              // T1: Nov 30
  } else if (m === 11 || m <= 1) {
    end = new Date(sy + 1, 2, 0);           // T2: last day of Feb
  } else {
    end = new Date(sy + 1, 6, 31);          // T3: Jul 31
  }
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * School semesters:
 *   S1 — Sept 1 → Feb 28/29  (T1 + T2)
 *   S2 — Mar 1  → Jul 31     (T3)
 */
function getSemesterStart(d: Date): Date {
  const sy = getSchoolYearBaseYear(d);
  const m = d.getMonth();
  // S1 covers Sept (8) through Feb (1); S2 covers Mar (2) through Jul (6)
  const inS1 = m >= 8 || m <= 1;
  const start = inS1 ? new Date(sy, 8, 1) : new Date(sy + 1, 2, 1);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getSemesterEnd(d: Date): Date {
  const sy = getSchoolYearBaseYear(d);
  const m = d.getMonth();
  const inS1 = m >= 8 || m <= 1;
  const end = inS1
    ? new Date(sy + 1, 2, 0)        // S1: last day of Feb
    : new Date(sy + 1, 6, 31);      // S2: Jul 31
  end.setHours(23, 59, 59, 999);
  return end;
}

function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Calendar bounds for the dashboard period (local timezone), aligned with session filters on the home screen. */
export function getDashboardPeriodBounds(
  period: DashboardPeriod,
  now = new Date(),
): { start: Date; end: Date } {
  const ranges: Record<DashboardPeriod, { start: Date; end: Date }> = {
    week: { start: getWeekStart(now), end: getWeekEnd(now) },
    month: { start: getMonthStart(now), end: getMonthEnd(now) },
    quarter: { start: getQuarterStart(now), end: getQuarterEnd(now) },
    semester: { start: getSemesterStart(now), end: getSemesterEnd(now) },
    'school-year': { start: getSchoolYearStart(now), end: getSchoolYearEnd(now) },
  };
  return ranges[period];
}

/** ISO date strings (YYYY-MM-DD) for API queries such as GET /dashboard/stats. */
export function getDashboardPeriodDateBounds(
  period: DashboardPeriod,
  now = new Date(),
): { dateFrom: string; dateTo: string } {
  const { start, end } = getDashboardPeriodBounds(period, now);
  return { dateFrom: formatLocalYmd(start), dateTo: formatLocalYmd(end) };
}

export function getSessionsInPeriod(sessions: Session[], period: DashboardPeriod): Session[] {
  const now = new Date();
  const { start, end } = getDashboardPeriodBounds(period, now);
  const startMs = start.getTime();
  const endMs = end.getTime();

  return sessions.filter((s) => {
    const t = new Date(s.date).getTime();
    return t >= startMs && t <= endMs;
  });
}
