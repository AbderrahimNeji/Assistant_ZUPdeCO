import type { Session, SessionFilter } from '@/types/session';

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

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

const ymd = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Maps UI period chips to GET /sessions date filters (local calendar day boundaries).
 * Keeps server-side paging aligned with “Cette semaine”, “À venir”, “Passées”.
 */
export function sessionFilterToApiDateRange(filter: SessionFilter): { dateFrom?: string; dateTo?: string } {
  const today = startOfToday();

  switch (filter) {
    case 'all':
      return {};
    case 'week': {
      const ws = getWeekStart(new Date());
      const we = getWeekEnd(new Date());
      return { dateFrom: ymd(ws), dateTo: ymd(we) };
    }
    case 'upcoming':
      return { dateFrom: ymd(today) };
    case 'past': {
      const end = new Date(today);
      end.setDate(end.getDate() - 1);
      return { dateTo: ymd(end) };
    }
    default:
      return {};
  }
}

export function filterSessions(sessions: Session[], filter: SessionFilter): Session[] {
  const today = startOfToday().getTime();

  return sessions.filter((s) => {
    const sessionDate = new Date(s.date).getTime();

    switch (filter) {
      case 'all':
        return true;
      case 'week': {
        const weekStart = getWeekStart(new Date()).getTime();
        const weekEnd = getWeekEnd(new Date()).getTime();
        return sessionDate >= weekStart && sessionDate <= weekEnd;
      }
      case 'upcoming':
        return sessionDate >= today;
      case 'past':
        return sessionDate < today;
      default:
        return true;
    }
  });
}
