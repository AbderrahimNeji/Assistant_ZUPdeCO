import React, { createContext, useContext } from 'react';

import { useColorScheme } from '@/components/useColorScheme';
import StaticColors from '@/constants/Colors';
import type { CompleteBrandingDto } from '@/services/branding';

/** Widened palette type — all color values are strings (not `as const` literals). */
export type ColorPalette = {
  [K in keyof typeof StaticColors.light]: string;
} & {
  /** Primary accent from color3.nuance1 (spinners, hover states) */
  accent: string;
};

export interface BrandingContextValue {
  colors: ColorPalette;
  branding: CompleteBrandingDto | null;
  brandingReady: boolean;
}

export const BrandingContext = createContext<BrandingContextValue | null>(null);

/**
 * Drop-in replacement for `Colors[colorScheme]`.
 * Returns the branding-aware color palette. Same hooks called every render to satisfy Rules of Hooks.
 */
export function useDynamicColors(): ColorPalette {
  const ctx = useContext(BrandingContext);
  const scheme = useColorScheme() ?? 'light';
  if (!ctx) {
    return { ...StaticColors[scheme], accent: StaticColors[scheme].tint };
  }
  return ctx.colors;
}

export function useBranding(): CompleteBrandingDto | null {
  const ctx = useContext(BrandingContext);
  return ctx?.branding ?? null;
}

export function useBrandingReady(): boolean {
  const ctx = useContext(BrandingContext);
  return ctx?.brandingReady ?? true;
}
