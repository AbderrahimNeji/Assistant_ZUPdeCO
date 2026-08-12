import { useQueries } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { getEstablishment } from '@/services/establishments.service';
import type { Establishment } from '@/types/establishment.types';

type EnrichedEntry = {
  id: string;
  name: string;
  city?: string | null;
  postalCode?: string | null;
  department?: string | null;
  country?: string | null;
};

/**
 * Fetches full Establishment objects for the given ids and re-primes the
 * MultiSelect label cache with enriched fields (city, postalCode, department,
 * country), so that tags display `Name (City - deptCode)` instead of name only.
 */
export function useEnrichEstablishmentLabels(
  ids: string[],
  primeLabelCache: (entries: EnrichedEntry[]) => void,
) {
  const uniqueIds = useMemo(() => Array.from(new Set(ids.filter(Boolean))), [ids]);

  const results = useQueries({
    queries: uniqueIds.map((id) => ({
      queryKey: ['establishment', id],
      queryFn: () => getEstablishment(id),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const readySignature = results.map((r) => r.dataUpdatedAt).join(',');

  useEffect(() => {
    const ready = results
      .map((r) => r.data)
      .filter((e): e is Establishment => !!e && !!e.id && !!e.name);
    if (ready.length === 0) return;
    primeLabelCache(
      ready.map((e) => ({
        id: e.id,
        name: e.name,
        city: e.city ?? null,
        postalCode: e.postalCode ?? null,
        department: e.department ?? null,
        country: e.country ?? null,
      })),
    );
  }, [readySignature, primeLabelCache]);
}
