import type { CrDatePeriod } from '@/store/crFilterStore';

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

/** Returns start and end timestamps (ms) for the given period. Use to filter CR by submittedAt or session date. */
export function getCrDateRange(period: CrDatePeriod): { startMs: number; endMs: number } {
  const now = new Date();
  switch (period) {
    case 'week': {
      const weekStart = getWeekStart(now).getTime();
      const weekEnd = getWeekEnd(now).getTime();
      return { startMs: weekStart, endMs: weekEnd };
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { startMs: start.getTime(), endMs: end.getTime() };
    }
    case 'all':
    default:
      return { startMs: 0, endMs: Number.MAX_SAFE_INTEGER };
  }
}
