import apiClient from './api-client';
import type { GamificationSummary, LeaderboardResponse } from '@/types/gamification.types';

/** Staff: gamification summary for a tutor/volunteer user (internal UUID). */
export async function fetchGamificationForUser(userId: string): Promise<GamificationSummary> {
  const { data } = await apiClient.get<GamificationSummary>(`/gamification/users/${userId}`);
  return data;
}

export async function fetchLeaderboard(limit = 20): Promise<LeaderboardResponse> {
  const { data } = await apiClient.get<LeaderboardResponse>('/gamification/leaderboard', {
    params: { limit },
  });
  return {
    entries: data.entries ?? [],
    myRank: data.myRank ?? 0,
    myEntry: data.myEntry,
  };
}
