import * as React from 'react';
import { getApiV1BaseUrlFromEnv } from '@/lib/apiBaseUrl';
import { useThemeStore } from '@/stores/themeStore';
import type { CompleteBrandingResponse } from '@/types/branding.types';

interface BrandingProviderProps {
  children: React.ReactNode;
}

/**
 * BrandingProvider loads the branding (color scheme, logos) before rendering the app
 * This ensures the login page has the correct branding applied
 */
export const BrandingProvider: React.FC<BrandingProviderProps> = ({ children }) => {
  const [error, setError] = React.useState<string | null>(null);
  const setBranding = useThemeStore((state) => state.setBranding);
  // useRef persists across React StrictMode's fake unmount/remount cycle in dev,
  // preventing the double-invoke, while resetting on each real page load so
  // branding data is always fetched fresh from the DB.
  const hasFetched = React.useRef(false);

  React.useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const loadBranding = async () => {
      try {
        // Company UUID (from .env). Same id as in DB companies.id.
        const companyId = import.meta.env.VITE_COMPANY_ID || '354eb5d0-17a4-4906-8b27-7c6339bdcd70';

        const base = getApiV1BaseUrlFromEnv(import.meta.env.VITE_API_URL);
        const response = await fetch(`${base}/public/branding/${companyId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`Failed to load branding: ${response.statusText}`);
        }

        const data: CompleteBrandingResponse = await response.json();
        setBranding(data);
      } catch (err) {
        console.error('Error loading branding:', err);
        setError(err instanceof Error ? err.message : 'Failed to load branding');
        // Continue anyway with default branding
      }
    };

    loadBranding();
  }, [setBranding]);

  // Don't show loading state - let it load silently in background
  // This prevents double spinner with AuthProvider

  // Show error but continue (with default branding)
  if (error) {
    console.warn('Branding failed to load, using defaults:', error);
  }

  return <>{children}</>;
};
