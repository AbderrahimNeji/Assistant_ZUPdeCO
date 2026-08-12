import api from '@/services/api';

export interface ModeValue {
  light: string | null;
  dark: string | null;
}

export interface ColorWithNuances {
  nuance1: ModeValue;
  nuance2: ModeValue;
  nuance3: ModeValue;
}

/**
 * Theme-only payload: primary and secondary (no light/dark split).
 * Used when backend returns a single set of brand colors for both modes.
 * App applies these to tint/primary and derived; system colors (text, background) stay from OS theme.
 */
export interface BrandingThemeDto {
  primary: string;
  secondary?: string | null;
  accent?: string | null;
  logos?: CompleteBrandingDto['logos'];
  fontFamily?: string | null;
  fontUrl?: string | null;
  customCss?: string | null;
}

/**
 * Mirrors CompleteBrandingDto from the backend (bimodal: light/dark per color).
 * Returned by GET /api/v1/branding/complete (requires Firebase JWT).
 * Backend may instead return BrandingThemeDto (theme-only, no light/dark).
 */
export interface CompleteBrandingDto {
  /** If set, backend returned theme-only; use for both light and dark. */
  primary?: string;
  secondary?: string | null;
  accent?: string | null;
  /** Branding row updated_at (ISO); used to bust logo image cache after re-upload. */
  updatedAt?: string | null;
  logos?: {
    logo1: ModeValue;
    logo2: ModeValue;
    logo3: ModeValue;
    favicon: string | null;
  };
  colors?: {
    color1: ColorWithNuances;
    color2: ColorWithNuances;
    color3: ColorWithNuances;
  };
  customCss?: string | null;
  fontFamily?: string | null;
  fontUrl?: string | null;
}

/**
 * Fetches branding configuration by company id.
 * Uses GET /api/v1/branding/complete?companyId=xxx (JWT attached by api interceptor).
 * When companyId is null, calls without query param (backward compatibility).
 */
export async function fetchCompleteBranding(companyId: string | null): Promise<CompleteBrandingDto> {
  const params = companyId ? { companyId } : undefined;
  console.log('[Branding] Fetching GET /branding/complete', { companyId, params });
  const { data } = await api.get<CompleteBrandingDto>('/branding/complete', { params });
  return data;
}
