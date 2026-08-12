import { env } from '@/config/env';
import api from '@/services/api';
import type {
  GamificationSummary,
  GamificationXpLogEntry,
  LeaderboardResponse,
  LevelBadge,
} from '@/types/gamification';
import { getStaticGamification, getStaticGamificationHistory, getStaticLeaderboard } from '@/data/staticData';

/** Raw API response shape for GET /gamification/me */
interface GamificationMeRaw {
  totalXp: number;
  currentNiveau: { id: string; numero: number; nom: string; xpRequis: number; icone?: string | null; couleur?: string | null } | null;
  nextNiveau: { id: string; numero: number; nom: string; xpRequis: number; icone?: string | null; couleur?: string | null } | null;
  xpInCurrentLevel: number;
  xpToNextLevel: number | null;
  xpRangeToNext: number | null;
  levelBadge?: LevelBadge | null;
  attendanceScore?: number | null;
  pedagogicalQualityScore?: number | null;
  badges: Array<{ badge: { id: string; nom: string; description?: string | null; icone?: string | null; couleur?: string | null }; awardedAt: string }>;
}

function mapRawToSummary(raw: GamificationMeRaw): GamificationSummary {
  return {
    totalXp: raw.totalXp,
    currentNiveau: raw.currentNiveau,
    nextNiveau: raw.nextNiveau,
    xpInCurrentLevel: raw.xpInCurrentLevel,
    xpToNextLevel: raw.xpToNextLevel,
    xpRangeToNext: raw.xpRangeToNext ?? null,
    levelBadge: raw.levelBadge ?? null,
    attendanceScore: raw.attendanceScore != null ? Number(raw.attendanceScore) : null,
    pedagogicalQualityScore: raw.pedagogicalQualityScore != null ? Number(raw.pedagogicalQualityScore) : null,
    badges: raw.badges.map((b) => ({
      badge: b.badge,
      awardedAt: typeof b.awardedAt === 'string' ? b.awardedAt : (b as { createdAt?: string }).createdAt ?? '',
    })),
  };
}

export async function fetchGamificationMe(): Promise<GamificationSummary> {
  if (env.useStaticData) return getStaticGamification();
  if (env.apiUrl) {
    const { data } = await api.get<GamificationMeRaw>('/gamification/me');
    return mapRawToSummary(data);
  }
  return getStaticGamification();
}

export async function fetchGamificationMeHistory(limit = 50): Promise<GamificationXpLogEntry[]> {
  if (env.useStaticData) return getStaticGamificationHistory(limit);
  if (env.apiUrl) {
    const { data } = await api.get<GamificationXpLogEntry[]>('/gamification/me/history', {
      params: { limit },
    });
    return Array.isArray(data) ? data : [];
  }
  return getStaticGamificationHistory(limit);
}

export async function fetchLeaderboard(limit = 20): Promise<LeaderboardResponse> {
  if (env.useStaticData) return getStaticLeaderboard(limit);
  if (env.apiUrl) {
    const { data } = await api.get<LeaderboardResponse>('/gamification/leaderboard', {
      params: { limit },
    });
    return {
      entries: data.entries ?? [],
      myRank: data.myRank ?? 0,
      myEntry: data.myEntry,
    };
  }
  return getStaticLeaderboard(limit);
}
