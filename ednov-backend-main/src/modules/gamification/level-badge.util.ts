/**
 * System level badges (RG3): niveau numero 1–3 only; not achievement badges.
 *
 * Optional follow-ups (not implemented here):
 * - Persist `niveau_atteint_at` on `tutor_gamification` when `current_niveau_id` changes (migration + SQL trigger update).
 * Staff read: `GET /gamification/users/:userId` is implemented on `GamificationController` (admin/manager/coordinator).
 */
export type LevelBadgeTier = 'bronze' | 'silver' | 'gold';

export interface LevelBadgeMeta {
  /** Stable code for referential / analytics (spec §10). */
  code: string;
  tier: LevelBadgeTier;
  /** French UI label (Bronze / Argent / Gold). */
  displayLabel: string;
  /** Theme key aligned with tier. */
  theme: string;
  /** Structural level number on the badge art. */
  niveauNumero: number;
}

const TIER_BY_NUMERO: Record<number, Omit<LevelBadgeMeta, 'niveauNumero'>> = {
  1: {
    code: 'LEVEL_TIER_BRONZE',
    tier: 'bronze',
    displayLabel: 'Bronze',
    theme: 'bronze',
  },
  2: {
    code: 'LEVEL_TIER_SILVER',
    tier: 'silver',
    displayLabel: 'Argent',
    theme: 'silver',
  },
  3: {
    code: 'LEVEL_TIER_GOLD',
    tier: 'gold',
    displayLabel: 'Gold',
    theme: 'gold',
  },
};

export function resolveLevelBadge(numero: number | null | undefined): LevelBadgeMeta | null {
  if (numero == null || !Number.isFinite(numero)) {
    return null;
  }
  const n = Math.trunc(numero);
  const base = TIER_BY_NUMERO[n];
  if (!base) {
    return null;
  }
  return { ...base, niveauNumero: n };
}
