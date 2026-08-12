import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '@/services/dashboard.service';
import type { DashboardStatsQuery, DashboardStatsResponse } from '@/types/dashboard.types';

export const useDashboardStats = (query?: DashboardStatsQuery) => {
  return useQuery<DashboardStatsResponse>({
    queryKey: ['dashboardStats', query],
    queryFn: () => getDashboardStats(query),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    /** Évite le flash quand on change période / dates */
    placeholderData: (previousData) => previousData,
  });
};
