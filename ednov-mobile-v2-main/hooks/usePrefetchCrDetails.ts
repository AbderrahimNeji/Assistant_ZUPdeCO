import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { env } from '@/config/env';
import { fetchComptesRendus, getSessionReport } from '@/services/comptesRendus';
import { fetchSessionParticipants } from '@/services/sessions';
import { useAuth } from '@/providers/AuthProvider';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import type { CompteRendu } from '@/types/compteRendu';

const PREFETCH_BATCH_SIZE = 3;
const PREFETCH_BATCH_DELAY_MS = 300;
const PREFETCH_MAX = 30;

/**
 * Bootstrap prefetch: as soon as the user is authenticated and online,
 * proactively fetches the CR list, then participants + CR details for each entry.
 *
 * Key design: uses queryClient.prefetchQuery DIRECTLY (not useComptesRendus hook)
 * so the cascade starts immediately on auth — not lazily when a component subscribes.
 * This ensures data is cached before the user can go offline.
 *
 * All results are persisted via PersistQueryClientProvider (prefixes 'comptes-rendus',
 * 'compte-rendu', 'session') and survive app restarts.
 */
export function usePrefetchCrDetails(): void {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isOffline } = useNetworkStatus();
  const prefetchedRef = useRef(new Set<string>());

  useEffect(() => {
    if (!env.apiUrl || env.useStaticData) return;
    if (!user) return;
    if (isOffline) return;

    let cancelled = false;

    async function bootstrap() {
      // Step 1: fetch CR list (or serve from cache if fresh — staleTime 2 min)
      await queryClient.prefetchQuery({
        queryKey: ['comptes-rendus'],
        queryFn: fetchComptesRendus,
        staleTime: 2 * 60 * 1000,
      });

      if (cancelled) return;

      const crList = queryClient.getQueryData<CompteRendu[]>(['comptes-rendus']);
      if (!crList?.length) return;

      const toFetch = crList
        .filter((cr) => cr.id && cr.sessionId && !prefetchedRef.current.has(cr.id))
        .slice(0, PREFETCH_MAX);

      if (!toFetch.length) return;

      // Step 2: prefetch participants + CR detail per batch
      for (let i = 0; i < toFetch.length; i += PREFETCH_BATCH_SIZE) {
        if (cancelled) break;
        const batch = toFetch.slice(i, i + PREFETCH_BATCH_SIZE);
        await Promise.all(
          batch.flatMap((cr) => [
            queryClient.prefetchQuery({
              queryKey: ['compte-rendu', cr.id, cr.sessionId],
              queryFn: () => getSessionReport(cr.sessionId, cr.id),
              staleTime: 5 * 60 * 1000,
            }),
            queryClient.prefetchQuery({
              queryKey: ['session', cr.sessionId, 'participants'],
              queryFn: () => fetchSessionParticipants(cr.sessionId),
              staleTime: 5 * 60 * 1000,
            }),
          ])
        );
        batch.forEach((cr) => prefetchedRef.current.add(cr.id));
        if (i + PREFETCH_BATCH_SIZE < toFetch.length && !cancelled) {
          await new Promise<void>((res) => setTimeout(res, PREFETCH_BATCH_DELAY_MS));
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [user, isOffline, queryClient]);
}
