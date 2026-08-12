import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Session } from '@/types/session';

const SESSION_REMINDER_PREFIX = 'session-reminder-';
const DEFAULT_REMINDER_MINUTES_BEFORE = 15;
const MAX_DAYS_AHEAD = 7;
const MAX_REMINDERS = 20;

function localNotificationsSupported(): boolean {
  return Platform.OS !== 'web';
}

/** Android channel for session reminders (required for Android 8+). */
export const SESSION_CHANNEL_ID = 'session-reminders';

/**
 * Request notification permission. Returns true if granted or already granted.
 */
/** Permission response shape (expo-notifications extends expo-modules-core PermissionResponse). */
type PermissionGranted = { granted?: boolean; status?: string };

export async function requestSessionReminderPermission(): Promise<boolean> {
  if (!localNotificationsSupported()) return false;
  const res = await Notifications.getPermissionsAsync() as PermissionGranted;
  if (res.granted ?? res.status === 'granted') return true;
  const req = await Notifications.requestPermissionsAsync() as PermissionGranted;
  return (req.granted ?? req.status === 'granted') === true;
}

/**
 * Ensure the Android notification channel for session reminders exists.
 * Call once before scheduling (e.g. when user enables rappel séance).
 */
export async function ensureSessionReminderChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(SESSION_CHANNEL_ID, {
    name: 'Rappels séances',
    importance: Notifications.AndroidImportance.DEFAULT,
    description: 'Rappel avant le début d\'une séance',
  });
}

function isUpcoming(session: Session): boolean {
  const start = new Date(session.date).getTime();
  const now = Date.now();
  if (start <= now) return false;
  const maxFuture = now + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000;
  return start <= maxFuture;
}

function getReminderDate(session: Session, minutesBefore: number): Date {
  const start = new Date(session.date).getTime();
  return new Date(start - minutesBefore * 60 * 1000);
}

function getSessionLabel(session: Session): string {
  const place = session.establishment ?? session.room ?? '';
  return place || 'Séance';
}

/** Format session date for notification body: "Séance le 12/03 à 14h — Lieu" */
function getSessionReminderBody(session: Session, minutesBefore: number): string {
  try {
    const d = new Date(session.date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const hours = d.getHours();
    const place = session.establishment ?? session.room ?? '';
    const placeSuffix = place ? ` — ${place}` : '';
    return `Séance le ${day}/${month} à ${hours}h${placeSuffix}`;
  } catch {
    return `Une séance commence dans ${minutesBefore} min — ${getSessionLabel(session)}`;
  }
}

/**
 * Cancel all scheduled notifications that are session reminders (identifier starts with prefix).
 */
export async function cancelSessionReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const req of scheduled) {
    if (req.identifier.startsWith(SESSION_REMINDER_PREFIX)) {
      await Notifications.cancelScheduledNotificationAsync(req.identifier);
    }
  }
}

/**
 * Schedule local notifications for upcoming sessions (configurable minutes before start).
 * If rappelSeanceEnabled is false, cancels all session reminders and returns.
 * Respects MAX_DAYS_AHEAD and MAX_REMINDERS.
 * @param minutesBefore Minutes before session start (default 15).
 */
export async function scheduleSessionReminders(
  sessions: Session[],
  rappelSeanceEnabled: boolean,
  minutesBefore: number = DEFAULT_REMINDER_MINUTES_BEFORE
): Promise<void> {
  if (!localNotificationsSupported()) return;

  if (!rappelSeanceEnabled) {
    await cancelSessionReminders();
    return;
  }

  const res = await Notifications.getPermissionsAsync() as PermissionGranted;
  if (!(res.granted ?? res.status === 'granted')) return;

  await ensureSessionReminderChannel();

  const upcoming = sessions
    .filter(
      (s) =>
        (s.status === 'planned' || s.status === 'in_progress') && isUpcoming(s)
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, MAX_REMINDERS);

  await cancelSessionReminders();

  const now = Date.now();
  for (const session of upcoming) {
    const reminderDate = getReminderDate(session, minutesBefore);
    if (reminderDate.getTime() <= now) continue;

    const identifier = `${SESSION_REMINDER_PREFIX}${session.id}`;
    const content: Notifications.NotificationContentInput = {
      title: 'Séance à venir',
      body: getSessionReminderBody(session, minutesBefore),
      ...(Platform.OS === 'android' && { channelId: SESSION_CHANNEL_ID }),
    };
    const trigger: Notifications.DateTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderDate,
      ...(Platform.OS === 'android' && { channelId: SESSION_CHANNEL_ID }),
    };

    await Notifications.scheduleNotificationAsync({
      identifier,
      content,
      trigger,
    });
  }
}
