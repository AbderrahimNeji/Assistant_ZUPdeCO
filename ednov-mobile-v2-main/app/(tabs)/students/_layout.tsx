import { Stack } from 'expo-router';

import { ScreenHeader, type ScreenHeaderProps } from '@/components/ScreenHeader';

export default function StudentsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerBackTitle: 'Retour',
        header: (props: ScreenHeaderProps) => <ScreenHeader {...props} />,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Participants', headerIcon: 'account-group' } as Record<string, unknown>} />
      <Stack.Screen name="[id]" options={{ title: 'Fiche', headerIcon: 'account' } as Record<string, unknown>} />
    </Stack>
  );
}
