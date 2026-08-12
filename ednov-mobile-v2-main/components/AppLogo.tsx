import React from 'react';
import { Image, View } from 'react-native';

import { useColorScheme } from '@/components/useColorScheme';
import { useBranding } from '@/providers/BrandingProvider';
import { ZupDeCoLogo, type ZupDeCoLogoProps } from '@/components/ZupDeCoLogo';

const sizeMap = {
  small: 120,
  medium: 180,
  large: 240,
};

export type AppLogoProps = ZupDeCoLogoProps;

/**
 * Displays the company logo from branding config when available (GET /branding/complete),
 * otherwise falls back to the ZupDeCo logo. Uses logo1 light/dark URL for the current color scheme.
 */
export function AppLogo({
  size = 'medium',
  variant = 'default',
  style,
}: Readonly<AppLogoProps>) {
  const colorScheme = useColorScheme() ?? 'light';
  const mode = colorScheme === 'dark' ? 'dark' : 'light';
  const branding = useBranding();
  const logo1 = branding?.logos?.logo1;
  const url = logo1?.[mode] ?? logo1?.light ?? logo1?.dark ?? null;
  // Cache-bust so re-uploaded logo (same Firebase URL) is shown instead of cached old image
  const separator = url?.includes('?') ? '&' : '?';
  const uri =
    url && branding?.updatedAt ? `${url}${separator}v=${encodeURIComponent(branding.updatedAt)}` : url ?? '';

  const logoWidth = typeof size === 'number' ? size : sizeMap[size];
  const logoHeight = logoWidth * (26 / 112);

  if (url) {
    return (
      <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
        <Image
          source={{ uri }}
          style={{ width: logoWidth, height: logoHeight }}
          resizeMode="contain"
          accessibilityLabel="Company logo"
        />
      </View>
    );
  }

  return <ZupDeCoLogo size={size} variant={variant} style={style} />;
}
