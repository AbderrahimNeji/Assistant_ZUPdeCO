import { env } from '@/config/env';
import api from '@/services/api';
import type { ActivityFeedItem } from '@/types/activityFeed';
import { getStaticActivityFeed } from '@/data/staticData';

export async function fetchActivityFeed(limit = 50): Promise<ActivityFeedItem[]> {
  if (env.useStaticData) return getStaticActivityFeed(limit);
  if (env.apiUrl) {
    const { data } = await api.get<ActivityFeedItem[]>('/activity-feed/me', {
      params: { limit },
    });
    return Array.isArray(data) ? data : [];
  }
  return getStaticActivityFeed(limit);
}
