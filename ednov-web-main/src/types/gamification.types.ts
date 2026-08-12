/** Aligned with backend GET /gamification/me and /gamification/users/:userId */

export type LevelBadgeTier = 'bronze' | 'silver' | 'gold';

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
  levelBadge?: LevelBadge | null;
  attendanceScore: number | null;
  pedagogicalQualityScore: number | null;
  badges: GamificationBadgeAward[];
}

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
