import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';

const PERSISTED_QUERY_KEY_PREFIXES = new Set([
  'profile',
  'sessions',
  'comptes-rendus',
  'compte-rendu',
  'gamification',
  'activity-feed',
  'session',
  'calendar',
  'dashboard',
  'branding',
  'loginProfile',
  'subjects',
]);

export function shouldPersistQuery(query: {
  state: { status: string };
  queryKey: readonly unknown[];
}): boolean {
  if (query.state.status !== 'success') return false;
  const key = query.queryKey;
  if (!Array.isArray(key) || key.length === 0) return false;
  const first = key[0];
  if (first === 'sessions' && key[1] === 'report-kpis') return true;
  return typeof first === 'string' && PERSISTED_QUERY_KEY_PREFIXES.has(first);
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: 1,
    },
  },
});

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'ednov_query_cache',
  throttleTime: 1000,
});

export async function clearAuthenticatedQueryCache(): Promise<void> {
  queryClient.cancelQueries();
  queryClient.clear();
  await asyncStoragePersister.removeClient();
}
