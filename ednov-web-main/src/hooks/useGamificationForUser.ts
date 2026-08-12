import { useQuery } from '@tanstack/react-query';
import { fetchGamificationForUser } from '@/services/gamification.service';

export function useGamificationForUser(userId: string | undefined) {
  return useQuery({
    queryKey: ['gamification', 'user', userId],
    queryFn: () => fetchGamificationForUser(userId!),
    enabled: Boolean(userId?.trim()),
    staleTime: 60 * 1000,
  });
}
