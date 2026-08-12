import { useQuery } from '@tanstack/react-query';
import { fetchActivityFeed } from '@/services/activityFeed';
import { useAuth } from '@/providers/AuthProvider';

export function useActivityFeed(limit = 50) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['activity-feed', limit],
    queryFn: () => fetchActivityFeed(limit),
    enabled: !!user,
  });
}
