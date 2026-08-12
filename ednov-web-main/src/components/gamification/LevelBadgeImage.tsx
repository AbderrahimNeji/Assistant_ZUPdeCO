import * as React from 'react';
import { cn } from '@/lib/utils';
import type { LevelBadge } from '@/types/gamification.types';
import {
  badgeImageSrcForTier,
  isRemoteIconUrl,
  tierFromNumero,
} from '@/utils/levelBadge';

export interface LevelBadgeImageProps {
  size?: number;
  levelBadge?: LevelBadge | null;
  niveauNumero?: number | null;
  niveauIcone?: string | null;
  className?: string;
  alt?: string;
}

export const LevelBadgeImage: React.FC<LevelBadgeImageProps> = ({
  size = 88,
  levelBadge,
  niveauNumero,
  niveauIcone,
  className,
  alt = 'Badge de niveau',
}) => {
  if (isRemoteIconUrl(niveauIcone)) {
    return (
      <img
        src={niveauIcone.trim()}
        alt={alt}
        width={size}
        height={size}
        className={cn('object-contain shrink-0', className)}
      />
    );
  }

  const tier = levelBadge?.tier ?? tierFromNumero(niveauNumero ?? levelBadge?.niveauNumero);
  const src = badgeImageSrcForTier(tier);
  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn('object-contain shrink-0', className)}
    />
  );
};
