import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { scheduleCrReminders } from '@/services/crReminders';
import { fetchSessions } from '@/services/sessions';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import type { Session } from '@/types/session';
import { env } from '@/config/env';
import { getStaticSessions } from '@/data/staticData';
import { useAuth } from '@/providers/AuthProvider';

const CR_REMINDER_DAYS_PAST = 14;
const DEFAULT_CR_DELAY_MINUTES = 60;

function getDateRangeForCrReminders(): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const dateTo = now.toISOString().slice(0, 10);
  const from = new Date(now);
  from.setDate(from.getDate() - CR_REMINDER_DAYS_PAST);
  const dateFrom = from.toISOString().slice(0, 10);
  return { dateFrom, dateTo };
}

/**
 * Fetches sessions in the past N days (for CR reminder scheduling).
 * Uses GET /sessions with dateFrom, dateTo, pageSize when using API.
 */
function useSessionsForCrReminders(): Session[] {
  const { user } = useAuth();
  const { dateFrom, dateTo } = getDateRangeForCrReminders();
  const { data } = useQuery({
    queryKey: ['sessions', 'cr-reminders', dateFrom, dateTo],
    queryFn: () =>
      env.useStaticData
        ? Promise.resolve(getStaticSessions())
        : fetchSessions({ dateFrom, dateTo, pageSize: 50 }),
    enabled: !!user,
    placeholderData: (prev: Session[] | undefined) => prev,
  });
  return Array.isArray(data) ? data : [];
}

/**
 * Schedules or cancels CR reminder notifications for sessions missing a report
 * (completed/closed, no reportId). Run once in the app tree (e.g. (tabs) layout).
 */
export function useCrReminders(): void {
  const sessions = useSessionsForCrReminders();
  const { data: prefs } = useUserPreferences();
  const rappelCR = prefs?.interfaceConfigs?.notifications?.rappelCR !== false;
  const delayMinutes =
    prefs?.interfaceConfigs?.notifications?.rappelCRDelayMinutes ?? DEFAULT_CR_DELAY_MINUTES;
  const prevDeps = useRef<string>('');

  useEffect(() => {
    const sessionKey = sessions.map((s) => s.id + ':' + (s.reportId ?? '') + ':' + s.status).join(',');
    const key = sessions.length + '-' + rappelCR + '-' + delayMinutes + '-' + sessionKey;
    if (key === prevDeps.current) return;
    prevDeps.current = key;

    scheduleCrReminders(sessions, rappelCR, delayMinutes).catch((err) => {
      if (__DEV__) console.warn('[useCrReminders]', err);
    });
  }, [sessions, rappelCR, delayMinutes]);
}
