export interface StatTrend {
  value: number;
  isPositive: boolean;
  differenceValue?: number;
}

export interface DashboardStat {
  id: string;
  value: string | number;
  trend?: StatTrend;
  description?: string;
  comparisonLabel?: string;
}

export interface DashboardComparisonStat {
  id: string;
  currentValue: number;
  previousValue: number;
  differenceValue: number;
  differencePercentage: number;
  comparisonLabel: string;
}

export interface DashboardStatsResponse {
  stats: Record<string, DashboardStat | DashboardComparisonStat>;
  calculatedAt: string;
  period: {
    dateFrom?: string;
    dateTo?: string;
    schoolYearId?: string;
    compare?: 'week' | 'month' | 'year' | 'trim';
    previousDateFrom?: string;
    previousDateTo?: string;
  };
}

export interface DashboardStatsQuery {
  dateFrom?: string;
  dateTo?: string;
  schoolYearId?: string;
  establishmentId?: string;
  establishmentIds?: string[];
  compare?: 'week' | 'month' | 'year' | 'trim';
}
