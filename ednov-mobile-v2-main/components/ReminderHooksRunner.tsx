import React from 'react';
import { useSessionReminders } from '@/hooks/useSessionReminders';
import { useCrReminders } from '@/hooks/useCrReminders';

/**
 * Runs session and CR reminder hooks (side effects only).
 * Used so that expo-notifications is only loaded when this component is mounted.
 * Not mounted on web (scheduling APIs unavailable) or Expo Go Android (push-token error SDK 53+).
 */
export function ReminderHooksRunner(): null {
  useSessionReminders();
  useCrReminders();
  return null;
}
