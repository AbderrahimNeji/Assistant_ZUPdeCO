import { useQuery } from '@tanstack/react-query';
import { fetchLeaderboard } from '@/services/gamification.service';

const DEFAULT_LIMIT = 20;

export function useLeaderboard(limit: number = DEFAULT_LIMIT) {
  return useQuery({
    queryKey: ['gamification', 'leaderboard', limit],
    queryFn: () => fetchLeaderboard(limit),
    staleTime: 60 * 1000,
  });
}
