/**
 * Gamification types aligned with backend GET /gamification/me and /gamification/me/history.
 */

export type LevelBadgeTier = 'bronze' | 'silver' | 'gold';

/** System level badge (niveaux 1–3); from API `levelBadge`. */
export interface LevelBadge {
  code: string;
  tier: LevelBadgeTier;
  displayLabel: string;
  theme: string;
  niveauNumero: number;
}

export interface GamificationNiveau {
  id: string;
  numero: number;
  nom: string;
  xpRequis: number;
  icone?: string | null;
  couleur?: string | null;
}

export interface GamificationBadge {
  id: string;
  nom: string;
  description?: string | null;
  icone?: string | null;
  couleur?: string | null;
}

export interface GamificationBadgeAward {
  badge: GamificationBadge;
  awardedAt: string;
}

export interface GamificationSummary {
  totalXp: number;
  currentNiveau: GamificationNiveau | null;
  nextNiveau: GamificationNiveau | null;
  xpInCurrentLevel: number;
  xpToNextLevel: number | null;
  xpRangeToNext: number | null;
  /** Present when current niveau numero is 1–3 (older backends may omit). */
  levelBadge?: LevelBadge | null;
  attendanceScore: number | null;
  pedagogicalQualityScore: number | null;
  badges: GamificationBadgeAward[];
}

export interface GamificationXpLogEntry {
  id: string;
  xpAmount: number;
  source: string;
  createdAt: string;
}

/** Leaderboard entry (GET /gamification/leaderboard) */
export interface LeaderboardEntry {
  rank: number;
  userId?: string;
  displayName: string;
  totalXp: number;
  currentNiveau?: GamificationNiveau | null;
  levelBadge?: LevelBadge | null;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  myRank: number;
  myEntry?: LeaderboardEntry;
}
