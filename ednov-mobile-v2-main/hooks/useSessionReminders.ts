import { useEffect, useRef } from 'react';
import { scheduleSessionReminders } from '@/services/sessionReminders';
import { useSessions } from '@/hooks/useSessions';
import { useUserPreferences } from '@/hooks/useUserPreferences';

const DEFAULT_MINUTES_BEFORE = 15;

/**
 * Schedules or cancels session reminder notifications based on sessions and
 * the rappelSeance preference. Run once in the app tree (e.g. (tabs) layout).
 * Permission should be requested when the user enables "Rappel séance" in settings.
 */
export function useSessionReminders(): void {
  const { data: sessions = [] } = useSessions();
  const { data: prefs } = useUserPreferences();
  const rappelSeance = prefs?.interfaceConfigs?.notifications?.rappelSeance !== false;
  const minutesBefore =
    prefs?.interfaceConfigs?.notifications?.rappelSeanceMinutesBefore ?? DEFAULT_MINUTES_BEFORE;
  const prevDeps = useRef<string>('');

  useEffect(() => {
    const sessionKey = sessions.map((s) => s.id + ':' + s.date).join(',');
    const key = sessions.length + '-' + rappelSeance + '-' + minutesBefore + '-' + sessionKey;
    if (key === prevDeps.current) return;
    prevDeps.current = key;

    scheduleSessionReminders(sessions, rappelSeance, minutesBefore).catch((err) => {
      if (__DEV__) console.warn('[useSessionReminders]', err);
    });
  }, [sessions, rappelSeance, minutesBefore]);
}
