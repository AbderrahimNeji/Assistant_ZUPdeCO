import { useQuery } from '@tanstack/react-query';

import { env } from '@/config/env';
import { getSessionReport } from '@/services/comptesRendus';
import { useComptesRendus } from '@/hooks/useComptesRendus';
import type { CompteRendu } from '@/types/compteRendu';
import { useMemo } from 'react';

/**
 * Resolve a single CR by id. When apiUrl and sessionId are set, fetches GET /sessions/:sessionId/reports/:id;
 * otherwise finds in the comptes-rendus list from useComptesRendus.
 */
export function useCompteRenduDetail(
  id: string | undefined,
  sessionId: string | undefined
): {
  cr: CompteRendu | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
} {
  const { data: crList, isLoading: listLoading, error: listError, refetch: refetchList } = useComptesRendus();
  const fromList = useMemo(
    () => (id && (crList ?? []).find((c) => c.id === id)) ?? null,
    [crList, id]
  );

  const fetchFromApi = !!env.apiUrl && !env.useStaticData && !!sessionId && !!id;
  const {
    data: fetchedCr,
    isLoading: fetchLoading,
    error: fetchError,
    refetch: refetchFetch,
  } = useQuery<CompteRendu | null>({
    queryKey: ['compte-rendu', id, sessionId],
    queryFn: () => getSessionReport(sessionId!, id!),
    enabled: fetchFromApi,
    staleTime: 0,
    refetchOnMount: 'always',
    placeholderData: (prev: CompteRendu | null | undefined) => prev,
  });

  const raw = fetchFromApi ? fetchedCr : fromList;
  const cr: CompteRendu | null = useMemo(() => {
    if (raw == null || raw === '' || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const base = raw as CompteRendu;
    // When fetched from API, the detail endpoint may omit sessionDate/sessionEstablishment —
    // fill them from the cached list entry if available.
    if (fetchFromApi && fromList) {
      return {
        ...base,
        sessionDate: base.sessionDate || fromList.sessionDate || null,
        sessionEstablishment: base.sessionEstablishment || fromList.sessionEstablishment || null,
        sessionType: base.sessionType || fromList.sessionType || null,
      };
    }
    return base;
  }, [raw, fetchFromApi, fromList]);
  const isLoading = fetchFromApi ? fetchLoading : listLoading;
  const error = (fetchFromApi ? fetchError : listError) ?? null;
  const refetch = fetchFromApi ? refetchFetch : refetchList;

  return { cr, isLoading, error, refetch };
}
