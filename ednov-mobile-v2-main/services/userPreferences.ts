import { env } from '@/config/env';
import api from '@/services/api';
import type { UserPreferences, NotificationPreferences } from '@/types/userPreferences';

/** Fetch user preferences (GET /user-preferences). */
export async function fetchUserPreferences(): Promise<UserPreferences> {
  if (env.useStaticData) {
    return {
      isDarkMode: false,
      interfaceConfigs: {
        notifications: { rappelCR: true, rappelSeance: true },
      },
    };
  }
  if (env.apiUrl) {
    const { data } = await api.get<UserPreferences>('/user-preferences');
    return {
      isDarkMode: data?.isDarkMode ?? false,
      interfaceConfigs: data?.interfaceConfigs ?? {},
    };
  }
  return {
    isDarkMode: false,
    interfaceConfigs: { notifications: { rappelCR: true, rappelSeance: true } },
  };
}

/** Update notification preferences via PUT /user-preferences (merge into interfaceConfigs.notifications). */
export async function updateNotificationPreferences(
  current: UserPreferences,
  notifications: NotificationPreferences
): Promise<UserPreferences> {
  if (env.useStaticData) {
    return {
      ...current,
      interfaceConfigs: {
        ...current.interfaceConfigs,
        notifications,
      },
    };
  }
  if (env.apiUrl) {
    const body = {
      isDarkMode: current.isDarkMode,
      interfaceConfigs: {
        ...current.interfaceConfigs,
        notifications,
      },
    };
    const { data } = await api.put<UserPreferences>('/user-preferences', body);
    return {
      isDarkMode: data?.isDarkMode ?? current.isDarkMode,
      interfaceConfigs: data?.interfaceConfigs ?? body.interfaceConfigs,
    };
  }
  return { ...current, interfaceConfigs: { ...current.interfaceConfigs, notifications } };
}
