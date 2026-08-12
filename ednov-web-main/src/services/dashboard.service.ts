import apiClient from './api-client';
import type {
  DashboardStatsResponse,
  DashboardStatsQuery,
  DashboardStat,
} from '@/types/dashboard.types';

function normalizeStatsResponse(response: DashboardStatsResponse): DashboardStatsResponse {
  const stats = Object.fromEntries(
    Object.entries(response.stats).map(([key, stat]) => {
      if (!('currentValue' in stat)) return [key, stat];
      return [
        key,
        {
          id: stat.id,
          value: stat.currentValue,
          comparisonLabel: stat.comparisonLabel,
          trend:
            stat.differencePercentage !== 0
              ? {
                  value: Math.abs(stat.differencePercentage),
                  isPositive: stat.differenceValue >= 0,
                  differenceValue: stat.differenceValue,
                }
              : undefined,
        } satisfies DashboardStat,
      ];
    }),
  );
  return { ...response, stats };
}

export const getDashboardStats = async (
  query?: DashboardStatsQuery,
): Promise<DashboardStatsResponse> => {
  const params = new URLSearchParams();

  if (query?.dateFrom) {
    params.append('dateFrom', query.dateFrom);
  }
  if (query?.dateTo) {
    params.append('dateTo', query.dateTo);
  }
  if (query?.schoolYearId) {
    params.append('schoolYearId', query.schoolYearId);
  }
  if (query?.establishmentId) {
    params.append('establishmentId', query.establishmentId);
  }
  if (query?.establishmentIds && query.establishmentIds.length > 0) {
    query.establishmentIds.forEach((id) => {
      params.append('establishmentIds', id);
    });
  }
  if (query?.compare) {
    params.append('compare', query.compare);
  }

  const queryString = params.toString();
  const url = queryString ? `/dashboard/stats?${queryString}` : '/dashboard/stats';

  const { data } = await apiClient.get<DashboardStatsResponse>(url);
  return normalizeStatsResponse(data);
};

export const getDashboardCharts = async (query?: DashboardStatsQuery) => {
  const params = new URLSearchParams();

  if (query?.dateFrom) {
    params.append('dateFrom', query.dateFrom);
  }
  if (query?.dateTo) {
    params.append('dateTo', query.dateTo);
  }
  if (query?.schoolYearId) {
    params.append('schoolYearId', query.schoolYearId);
  }
  if (query?.establishmentId) {
    params.append('establishmentId', query.establishmentId);
  }
  if (query?.establishmentIds && query.establishmentIds.length > 0) {
    query.establishmentIds.forEach((id) => {
      params.append('establishmentIds', id);
    });
  }

  const queryString = params.toString();
  const url = queryString ? `/dashboard/charts?${queryString}` : '/dashboard/charts';

  const { data } = await apiClient.get(url);
  return data;
};
