import { Injectable } from '@nestjs/common';

import { EdnovApiClient } from '../ednov-api.client';
import { encodeEdnovId } from '../ednov-path';

export type GamificationSummary = {
  totalXp?: number;
  currentNiveau?: { numero?: number; label?: string; name?: string } | null;
  nextNiveau?: { numero?: number; label?: string; name?: string } | null;
  levelBadge?: { displayLabel?: string; tier?: string } | null;
  badges?: Array<{ name?: string; label?: string; displayLabel?: string }>;
};

export type LeaderboardEntry = {
  rank?: number;
  displayName?: string;
  totalXp?: number;
  currentNiveau?: { numero?: number; label?: string; name?: string } | null;
  levelBadge?: { displayLabel?: string } | null;
};

export type LeaderboardPayload = {
  entries?: LeaderboardEntry[];
  myRank?: number;
  myEntry?: LeaderboardEntry | null;
};

export type XpHistoryEntry = {
  amount?: number;
  xp?: number;
  reason?: string;
  label?: string;
  createdAt?: string;
};

/**
 * Live gamification APIs (user bearer). Company-scoped on the Ednov side.
 */
@Injectable()
export class GamificationAdapter {
  constructor(private readonly ednov: EdnovApiClient) {}

  async getMe(): Promise<GamificationSummary> {
    return this.ednov.get<GamificationSummary>('/gamification/me');
  }

  async getForUser(userId: string): Promise<GamificationSummary> {
    return this.ednov.get<GamificationSummary>(
      `/gamification/users/${encodeEdnovId(userId)}`,
    );
  }

  async getMyHistory(limit = 20): Promise<XpHistoryEntry[]> {
    const raw = await this.ednov.get<
      XpHistoryEntry[] | { data?: XpHistoryEntry[]; items?: XpHistoryEntry[] }
    >('/gamification/me/history', {
      params: { limit: Math.min(limit, 100) },
    });
    if (Array.isArray(raw)) return raw;
    return raw.data ?? raw.items ?? [];
  }

  async getLeaderboard(limit = 20): Promise<LeaderboardPayload> {
    return this.ednov.get<LeaderboardPayload>('/gamification/leaderboard', {
      params: { limit: Math.min(Math.max(1, limit), 50) },
    });
  }

  async listNiveaux(): Promise<unknown[]> {
    const raw = await this.ednov.get<unknown[] | { data?: unknown[] }>(
      '/admin/gamification/niveaux',
    );
    return Array.isArray(raw) ? raw : raw.data ?? [];
  }
}
