import { useQuery } from '@tanstack/react-query';
import { getDashboardCharts } from '@/services/dashboard.service';
import type { DashboardStatsQuery } from '@/types/dashboard.types';

export const useDashboardCharts = (query?: DashboardStatsQuery) => {
  return useQuery({
    queryKey: ['dashboardCharts', query],
    queryFn: () => getDashboardCharts(query),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};
