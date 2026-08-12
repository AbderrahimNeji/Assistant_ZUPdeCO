/**
 * User preferences aligned with backend GET/PUT /user-preferences.
 * Notification preferences live in interfaceConfigs.notifications.
 */

export interface NotificationPreferences {
  rappelCR?: boolean;
  rappelSeance?: boolean;
  /** Minutes before session start to send reminder (default 15). */
  rappelSeanceMinutesBefore?: number;
  /** Minutes after session end before sending CR reminder (default 60). */
  rappelCRDelayMinutes?: number;
}

export interface UserPreferences {
  isDarkMode: boolean;
  interfaceConfigs: {
    notifications?: NotificationPreferences;
    dashboard?: Record<string, unknown>;
    sessions?: Record<string, unknown>;
    [key: string]: unknown;
  };
}
