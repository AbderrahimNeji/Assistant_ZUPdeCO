import { Stack } from 'expo-router';

import { ScreenHeader, type ScreenHeaderProps } from '@/components/ScreenHeader';

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerBackTitle: 'Retour',
        header: (props: ScreenHeaderProps) => <ScreenHeader {...props} />,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Profil', headerIcon: 'account-outline' } as Record<string, unknown>} />
      <Stack.Screen name="edit" options={{ title: 'Modifier le profil', headerIcon: 'pencil' } as Record<string, unknown>} />
      <Stack.Screen name="notifications" options={{ title: 'Paramètres notifications', headerIcon: 'bell-cog-outline' } as Record<string, unknown>} />
      <Stack.Screen name="classement" options={{ title: 'Classement', headerIcon: 'podium' } as Record<string, unknown>} />
      <Stack.Screen name="historique" options={{ title: 'Historique', headerIcon: 'history' } as Record<string, unknown>} />
      <Stack.Screen name="ressources" options={{ headerShown: false } as Record<string, unknown>} />
    </Stack>
  );
}
