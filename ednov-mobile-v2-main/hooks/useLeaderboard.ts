import { useQuery } from '@tanstack/react-query';
import { fetchLeaderboard } from '@/services/gamification';
import { useAuth } from '@/providers/AuthProvider';

export function useLeaderboard(limit = 20) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['gamification', 'leaderboard', limit],
    queryFn: () => fetchLeaderboard(limit),
    enabled: !!user,
  });
}
