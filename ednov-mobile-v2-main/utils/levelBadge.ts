import type { LevelBadgeTier } from '@/types/gamification';

const LOCAL_BADGES: Record<LevelBadgeTier, number> = {
  bronze: require('@/assets/badges/bronze.png'),
  silver: require('@/assets/badges/silver.png'),
  gold: require('@/assets/badges/gold.png'),
};

export function isRemoteIconUrl(icone: string | null | undefined): icone is string {
  if (!icone || typeof icone !== 'string') return false;
  const t = icone.trim().toLowerCase();
  return t.startsWith('http://') || t.startsWith('https://');
}

export function tierFromNumero(numero: number | null | undefined): LevelBadgeTier | null {
  if (numero == null || !Number.isFinite(numero)) return null;
  const n = Math.trunc(numero);
  if (n === 1) return 'bronze';
  if (n === 2) return 'silver';
  if (n === 3) return 'gold';
  return null;
}

/** French tier label when API omits `levelBadge.displayLabel`. */
export function displayLabelForNumero(numero: number | null | undefined): string | null {
  const t = tierFromNumero(numero);
  if (t === 'bronze') return 'Bronze';
  if (t === 'silver') return 'Argent';
  if (t === 'gold') return 'Gold';
  return null;
}

export function getLevelBadgeImageSource(
  tier: LevelBadgeTier | null | undefined,
): number | null {
  if (!tier) return null;
  return LOCAL_BADGES[tier] ?? null;
}
