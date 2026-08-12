import { useQuery } from '@tanstack/react-query';
import { fetchGamificationMe, fetchGamificationMeHistory } from '@/services/gamification';
import { useAuth } from '@/providers/AuthProvider';

export function useGamification() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['gamification'],
    queryFn: fetchGamificationMe,
    enabled: !!user,
  });
}

export function useGamificationHistory(limit = 50) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['gamification', 'history', limit],
    queryFn: () => fetchGamificationMeHistory(limit),
    enabled: !!user,
  });
}
