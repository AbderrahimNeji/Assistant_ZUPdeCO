import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import { env } from '@/config/env';
import { fetchCompleteBranding, type CompleteBrandingDto } from '@/services/branding';

const brandingEnabled = (companyId: string | null) =>
  !!env.apiUrl && companyId != null && companyId !== '';

/**
 * Fetches and caches branding (theme + logo) by company id.
 * Only runs when Firebase user is ready so the API request includes a valid JWT (avoids 401 on refresh).
 */
export function useCompleteBranding(
  companyId: string | null,
  /** When false, query is disabled so we never call the API before Firebase auth has restored the user. */
  firebaseUserReady: boolean,
) {
  const enabled = brandingEnabled(companyId) && firebaseUserReady;
  const query = useQuery<CompleteBrandingDto>({
    queryKey: ['branding', 'complete', companyId ?? ''],
    queryFn: () => fetchCompleteBranding(companyId),
    enabled,
    staleTime: 5 * 60 * 1000,  // 5 min — theme rarely changes, avoid aggressive refetch
    gcTime: 24 * 60 * 60 * 1000, // 24 h — matches global default; persisted for offline
    retry: 1,
    refetchOnMount: true,
    refetchOnWindowFocus: false, // theme doesn't need to refresh on every focus
  });
  useEffect(() => {
    if (!__DEV__) return;
    console.log('[Branding] Query state', {
      enabled,
      firebaseUserReady,
      companyId: companyId ?? '(null)',
      apiUrl: env.apiUrl ? 'set' : '(empty - set EXPO_PUBLIC_API_URL in .env)',
      status: query.status,
      fetchStatus: query.fetchStatus,
    });
  }, [enabled, firebaseUserReady, companyId, query.status, query.fetchStatus]);
  return query;
}
