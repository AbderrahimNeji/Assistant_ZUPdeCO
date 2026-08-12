import { Stack } from 'expo-router';

import { ScreenHeader, type ScreenHeaderProps } from '@/components/ScreenHeader';

export default function RessourcesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerBackTitle: 'Retour',
        header: (props: ScreenHeaderProps) => <ScreenHeader {...props} />,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Ressources pédagogiques', headerIcon: 'book-open-variant' } as Record<string, unknown>} />
      <Stack.Screen name="[id]" options={{ title: 'Détail ressource', headerIcon: 'file-document-outline' } as Record<string, unknown>} />
    </Stack>
  );
}
