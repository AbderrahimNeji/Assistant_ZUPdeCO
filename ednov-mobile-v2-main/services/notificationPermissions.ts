import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * True when running in Expo Go on Android. Push/local notification APIs from
 * expo-notifications throw in this environment (SDK 53+). Use this to avoid
 * importing expo-notifications in that case.
 */
export const isExpoGoAndroid =
  Platform.OS === 'android' && Constants.appOwnership === 'expo';

const isWeb = Platform.OS === 'web';

/**
 * Request notification permission for session reminders.
 * On Expo Go Android this returns false without loading expo-notifications.
 */
export async function requestSessionReminderPermission(): Promise<boolean> {
  if (isWeb || isExpoGoAndroid) return false;
  const { requestSessionReminderPermission: fn } = await import(
    '@/services/sessionReminders'
  );
  return fn();
}

/**
 * Request notification permission for CR reminders.
 * On Expo Go Android this returns false without loading expo-notifications.
 */
export async function requestCrReminderPermission(): Promise<boolean> {
  if (isWeb || isExpoGoAndroid) return false;
  const { requestCrReminderPermission: fn } = await import(
    '@/services/crReminders'
  );
  return fn();
}
