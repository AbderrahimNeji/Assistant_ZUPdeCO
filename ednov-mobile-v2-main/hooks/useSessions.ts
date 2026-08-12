import { useQuery } from '@tanstack/react-query';

import { fetchSessions } from '@/services/sessions';
import type { Session } from '@/types/session';
import { useAuth } from '@/providers/AuthProvider';

/** Request enough sessions so in-progress / today and recent ones are on first page (backend orders by session_date DESC). */
const DEFAULT_SESSION_PAGE_SIZE = 100;

export function useSessions() {
  const { user } = useAuth();
  return useQuery<Session[]>({
    queryKey: ['sessions'],
    queryFn: () => fetchSessions({ page: 1, pageSize: DEFAULT_SESSION_PAGE_SIZE }),
    enabled: !!user,
    placeholderData: (previousData: Session[] | undefined) => previousData,
  });
}
