import { Stack, usePathname } from 'expo-router';

import { ScreenHeader, type ScreenHeaderProps } from '@/components/ScreenHeader';

const ROUTE_HEADERS: Record<string, { title: string; headerIcon: string }> = {
  index: { title: 'Détail séance', headerIcon: 'calendar-text' },
  'ai-processing': { title: 'Analyse IA', headerIcon: 'robot-outline' },
  chat: { title: 'Assistant IA', headerIcon: 'robot-outline' },
  script: { title: 'Script de la séance', headerIcon: 'script-text' },
  'resource-detail': { title: 'Ressource pédagogique', headerIcon: 'book-open-variant' },
  'create-student': { title: 'Nouvel élève', headerIcon: 'account-plus' },
};

/** Derive screen name from pathname like /sessions/abc-123/ai-processing or /sessions/abc-123 (index). */
function getScreenNameFromPathname(pathname: string): string {
  const path = pathname.split('?')[0];
  const parts = path.split('/').filter(Boolean);
  const sessionsIndex = parts.indexOf('sessions');
  if (sessionsIndex === -1 || sessionsIndex >= parts.length - 1) return 'index';
  const afterSessionId = parts[sessionsIndex + 2];
  if (!afterSessionId) return 'index';
  return afterSessionId;
}

export default function SessionIdLayout() {
  const pathname = usePathname();
  const screenName = getScreenNameFromPathname(pathname);
  const routeOptions = ROUTE_HEADERS[screenName] ?? ROUTE_HEADERS.index;

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerBackTitle: 'Retour',
        title: routeOptions.title,
        headerIcon: routeOptions.headerIcon,
        header: (props: ScreenHeaderProps) => <ScreenHeader {...props} />,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Détail séance', headerIcon: 'calendar-text' } as Record<string, unknown>} />
      <Stack.Screen name="ai-processing" options={{ title: 'Analyse IA', headerIcon: 'robot-outline' } as Record<string, unknown>} />
      <Stack.Screen name="chat" options={{ title: 'Assistant IA', headerIcon: 'robot-outline' } as Record<string, unknown>} />
      <Stack.Screen name="script" options={{ title: 'Script de la séance', headerIcon: 'script-text' } as Record<string, unknown>} />
      <Stack.Screen name="resource-detail" options={{ title: 'Ressource pédagogique', headerIcon: 'book-open-variant' } as Record<string, unknown>} />
      <Stack.Screen name="create-student" options={{ title: 'Nouvel élève', headerIcon: 'account-plus' } as Record<string, unknown>} />
    </Stack>
  );
}
