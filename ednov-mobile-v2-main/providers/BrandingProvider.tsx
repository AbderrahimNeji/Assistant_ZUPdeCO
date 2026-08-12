import React, { useEffect, useMemo } from 'react';

import { LoadingScreen } from '@/components/LoadingScreen';
import { useColorScheme } from '@/components/useColorScheme';
import StaticColors from '@/constants/Colors';
import { BrandingContext } from '@/context/BrandingContext';
import type { ColorPalette } from '@/context/BrandingContext';
import { env } from '@/config/env';
import { useCompleteBranding } from '@/hooks/useBranding';
import { useAuth } from '@/providers/AuthProvider';
import type { CompleteBrandingDto } from '@/services/branding';
import { useCompanyStore } from '@/store/companyStore';

export type { ColorPalette } from '@/context/BrandingContext';

function pickColor(val: string | null | undefined, fallback: string): string {
  return val != null && val !== '' ? val : fallback;
}

function buildPalette(
  mode: 'light' | 'dark',
  branding: CompleteBrandingDto | undefined,
): ColorPalette {
  const base = StaticColors[mode];

  if (!branding) {
    return { ...base, accent: base.tint };
  }

  // Neutral page background when using API theme so shadows don't pick up orange from static peachy background
  const neutralPageBackground = mode === 'light' ? '#f5f5f5' : '#0a0a0a';

  // Theme-only: primary (and optional secondary/accent) apply to both light and dark
  if (branding.primary != null && branding.primary !== '') {
    const tint = branding.primary;
    const accent = pickColor(branding.accent, tint);
    return {
      ...base,
      pageBackground: neutralPageBackground,
      tint,
      tabIconSelected: tint,
      accent,
    };
  }

  // Bimodal: colors per mode (legacy)
  const c = branding.colors;
  if (!c) return { ...base, accent: base.tint };

  const tint = pickColor(c.color1.nuance1[mode], base.tint);
  const accent = pickColor(c.color3.nuance1[mode], base.tint);

  return {
    ...base,
    pageBackground: neutralPageBackground,
    tint,
    tabIconSelected: tint,
    accent,
  };
}


const isBrandingQueryEnabled = (companyId: string | null) =>
  !!env.apiUrl && companyId != null && companyId !== '';

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme() ?? 'light';
  const { user, loading: authLoading } = useAuth();
  const companyId = useCompanyStore((s) => s.companyId);
  const firebaseUserReady = !authLoading && user != null;
  const { data: branding, isSuccess, isFetching, status, fetchStatus } = useCompleteBranding(companyId, firebaseUserReady);

  const brandingQueryEnabled = isBrandingQueryEnabled(companyId) && firebaseUserReady;
  // Don't block when offline (paused) or on error — fall back to static theme immediately.
  const brandingLoading = brandingQueryEnabled && status === 'pending' && fetchStatus !== 'paused';
  /** Ready for login gate: no API branding needed, data loaded, query failed, or offline-paused (static fallback). */
  const brandingReady =
    !brandingQueryEnabled ||
    (status === 'success' && branding != null) ||
    status === 'error' ||
    fetchStatus === 'paused';

  useEffect(() => {
    if (!__DEV__) return;
    console.log('[Branding] App config', {
      apiUrl: env.apiUrl ? 'set' : '(empty - add EXPO_PUBLIC_API_URL to .env)',
      useStaticData: env.useStaticData,
    });
  }, []);

  const colors = useMemo(
    () => buildPalette(colorScheme, branding),
    [colorScheme, branding],
  );

  const value = useMemo(
    () => ({ colors, branding: branding ?? null, brandingReady }),
    [colors, branding, brandingReady],
  );

  useEffect(() => {
    if (!isSuccess || isFetching) return;
    const hasApi = companyId != null && companyId !== '';
    if (!hasApi) {
      console.log('[Branding] No companyId — using static theme and ZupDeCo logo fallback.');
      return;
    }
    if (branding) {
      const logo1 = branding.logos?.logo1;
      const logoLight = logo1?.light ?? logo1?.dark ?? null;
      const logoDark = logo1?.dark ?? logo1?.light ?? null;
      console.log('[Branding] Config loaded', {
        companyId,
        theme: { primary: colors.tint, accent: colors.accent },
        logo: {
          light: logoLight ? `${logoLight.slice(0, 60)}…` : null,
          dark: logoDark ? `${logoDark.slice(0, 60)}…` : null,
        },
      });
    } else {
      console.log('[Branding] No branding data for companyId — using static theme and ZupDeCo logo fallback.');
    }
  }, [companyId, branding, isSuccess, isFetching, colors.tint, colors.accent]);

  if (brandingLoading) {
    return (
      <BrandingContext.Provider value={value}>
        <LoadingScreen
          message="Chargement…"
          backgroundColor={colors.background}
        />
      </BrandingContext.Provider>
    );
  }

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export { useDynamicColors, useBranding, useBrandingReady } from '@/context/BrandingContext';
