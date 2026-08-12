import { Stack } from 'expo-router';

import { ScreenHeader, type ScreenHeaderProps } from '@/components/ScreenHeader';

export default function ComptesRendusLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerBackTitle: 'Retour',
        header: (props: ScreenHeaderProps) => <ScreenHeader {...props} />,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Comptes rendus', headerIcon: 'file-document-outline' } as Record<string, unknown>} />
      <Stack.Screen name="new" options={{ title: 'Saisir un CR', headerIcon: 'file-document-edit-outline' } as Record<string, unknown>} />
      <Stack.Screen name="[id]" options={{ title: 'Détail CR', headerIcon: 'file-document' } as Record<string, unknown>} />
    </Stack>
  );
}
