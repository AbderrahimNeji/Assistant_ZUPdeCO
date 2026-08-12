import { Stack } from 'expo-router';

import { ScreenHeader, type ScreenHeaderProps } from '@/components/ScreenHeader';

export default function SessionsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerBackTitle: 'Retour',
        header: (props: ScreenHeaderProps) => <ScreenHeader {...props} />,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Séances', headerIcon: 'calendar-clock' } as Record<string, unknown>} />
      <Stack.Screen name="attendance-history" options={{ title: 'Historique présence', headerIcon: 'clipboard-list-outline' } as Record<string, unknown>} />
      <Stack.Screen name="[id]" options={{ headerShown: false } as Record<string, unknown>} />
    </Stack>
  );
}
