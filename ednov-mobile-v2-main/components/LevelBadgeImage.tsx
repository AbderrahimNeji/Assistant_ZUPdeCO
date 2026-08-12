import React from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';

import type { LevelBadge } from '@/types/gamification';
import { getLevelBadgeImageSource, isRemoteIconUrl, tierFromNumero } from '@/utils/levelBadge';

export type LevelBadgeImageProps = Readonly<{
  size?: number;
  levelBadge?: LevelBadge | null;
  /** When API omits levelBadge, derive tier from niveau.numero (1–3). */
  niveauNumero?: number | null;
  /** Optional admin override: remote image URL replaces bundled tier asset. */
  niveauIcone?: string | null;
  style?: StyleProp<ImageStyle>;
  accessibilityLabel?: string;
}>;

/**
 * Renders the system level badge (Bronze / Argent / Gold) or a remote override from `niveau.icone`.
 */
export function LevelBadgeImage({
  size = 72,
  levelBadge,
  niveauNumero,
  niveauIcone,
  style,
  accessibilityLabel,
}: LevelBadgeImageProps) {
  if (isRemoteIconUrl(niveauIcone)) {
    return (
      <Image
        source={{ uri: niveauIcone.trim() }}
        style={[{ width: size, height: size }, style]}
        resizeMode="contain"
        accessibilityLabel={accessibilityLabel ?? 'Badge de niveau'}
      />
    );
  }

  const tier = levelBadge?.tier ?? tierFromNumero(niveauNumero ?? levelBadge?.niveauNumero);
  const src = getLevelBadgeImageSource(tier);
  if (src == null) {
    return null;
  }

  return (
    <Image
      source={src}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
      accessibilityLabel={accessibilityLabel ?? 'Badge de niveau'}
    />
  );
}
