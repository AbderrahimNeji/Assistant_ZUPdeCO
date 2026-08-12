import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Session } from '@/types/session';

const CR_REMINDER_PREFIX = 'cr-reminder-';
const MAX_CR_REMINDERS = 20;

function localNotificationsSupported(): boolean {
  return Platform.OS !== 'web';
}

/** Android channel for CR reminders (required for Android 8+). */
export const CR_CHANNEL_ID = 'cr-reminders';

/** Reuse same permission as session reminders (expo-notifications). */
export async function requestCrReminderPermission(): Promise<boolean> {
  if (!localNotificationsSupported()) return false;
  type PermissionGranted = { granted?: boolean; status?: string };
  const res = (await Notifications.getPermissionsAsync()) as PermissionGranted;
  if (res.granted ?? res.status === 'granted') return true;
  const req = (await Notifications.requestPermissionsAsync()) as PermissionGranted;
  return (req.granted ?? req.status === 'granted') === true;
}

export async function ensureCrReminderChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CR_CHANNEL_ID, {
    name: 'Rappels CR',
    importance: Notifications.AndroidImportance.DEFAULT,
    description: 'Rappel pour les comptes rendus à saisir',
  });
}

/**
 * Get session end as Date. Uses session.date (start) + endTime, or session.date + 1h if no endTime.
 */
export function getSessionEndDate(session: Session): Date {
  const dateStr = session.date.slice(0, 10);
  const endTime = session.endTime?.trim();
  if (endTime) {
    const normalized = endTime.length <= 5 ? `${endTime}:00` : endTime;
    return new Date(`${dateStr}T${normalized}`);
  }
  const start = new Date(session.date).getTime();
  return new Date(start + 60 * 60 * 1000);
}

/**
 * Cancel all scheduled notifications that are CR reminders (identifier starts with prefix).
 */
export async function cancelCrReminders(): Promise<void> {
  if (!localNotificationsSupported()) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const req of scheduled) {
    if (req.identifier.startsWith(CR_REMINDER_PREFIX)) {
      await Notifications.cancelScheduledNotificationAsync(req.identifier);
    }
  }
}

function formatSessionLabel(session: Session): string {
  try {
    const d = new Date(session.date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const hours = d.getHours();
    const place = session.establishment ?? session.room ?? '';
    const placeSuffix = place ? ` — ${place}` : '';
    return `${day}/${month} à ${hours}h${placeSuffix}`;
  } catch {
    return 'Séance passée';
  }
}

/**
 * Schedule local notifications for sessions missing a CR (completed/closed, no reportId).
 * Trigger at session end + rappelCRDelayMinutes. One notification per session; no duplicates.
 */
export async function scheduleCrReminders(
  sessions: Session[],
  rappelCREnabled: boolean,
  rappelCRDelayMinutes: number
): Promise<void> {
  if (!localNotificationsSupported()) return;

  if (!rappelCREnabled) {
    await cancelCrReminders();
    return;
  }

  type PermissionGranted = { granted?: boolean; status?: string };
  const res = (await Notifications.getPermissionsAsync()) as PermissionGranted;
  if (!(res.granted ?? res.status === 'granted')) return;

  await ensureCrReminderChannel();

  const missing = sessions
    .filter(
      (s) =>
        (s.status === 'completed' || s.status === 'closed') &&
        !(s.reportId != null && String(s.reportId).trim())
    )
    .slice(0, MAX_CR_REMINDERS);

  await cancelCrReminders();

  const now = Date.now();
  for (const session of missing) {
    const endDate = getSessionEndDate(session);
    const triggerAt = new Date(endDate.getTime() + rappelCRDelayMinutes * 60 * 1000);
    if (triggerAt.getTime() <= now) continue;

    const identifier = `${CR_REMINDER_PREFIX}${session.id}`;
    const body = formatSessionLabel(session);
    const content: Notifications.NotificationContentInput = {
      title: 'CR à saisir',
      body: `Compte rendu à saisir pour la séance du ${body}`,
      ...(Platform.OS === 'android' && { channelId: CR_CHANNEL_ID }),
    };
    const trigger: Notifications.DateTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerAt,
      ...(Platform.OS === 'android' && { channelId: CR_CHANNEL_ID }),
    };

    await Notifications.scheduleNotificationAsync({
      identifier,
      content,
      trigger,
    });
  }
}
