import { ApiProperty } from '@nestjs/swagger';

export class StatTrendDto {
  @ApiProperty({ description: 'Trend value (percentage)', example: 12.5 })
  value: number;

  @ApiProperty({ description: 'Whether the trend is positive', example: true })
  isPositive: boolean;
}

export class DashboardStatDto {
  @ApiProperty({ description: 'Stat card identifier', example: 'stat-sessions-total' })
  id: string;

  @ApiProperty({ description: 'Stat value (number or formatted string)', example: 156 })
  value: string | number;

  @ApiProperty({ description: 'Optional trend data', required: false })
  trend?: StatTrendDto;

  @ApiProperty({ description: 'Optional description', required: false, example: 'Séances du mois en cours' })
  description?: string;
}

export class DashboardComparisonStatDto {
  @ApiProperty({ description: 'Stat card identifier', example: 'stat-sessions-total' })
  id: string;

  @ApiProperty({ description: 'Value for the current period', example: 74 })
  currentValue: number;

  @ApiProperty({ description: 'Value for the previous period', example: 66 })
  previousValue: number;

  @ApiProperty({ description: 'Absolute difference (currentValue - previousValue)', example: 8 })
  differenceValue: number;

  @ApiProperty({ description: 'Percentage difference relative to the previous value', example: 12.1 })
  differencePercentage: number;

  @ApiProperty({ description: 'Human-readable label for the previous period', example: 'mois précédent' })
  comparisonLabel: string;
}

export class DashboardStatsResponseDto {
  @ApiProperty({ 
    description: 'Map of stat card ID to stat data (DashboardStatDto when no compare param, DashboardComparisonStatDto when compare is set)',
    type: 'object',
    additionalProperties: { type: 'object' }
  })
  stats: Record<string, DashboardStatDto | DashboardComparisonStatDto>;

  @ApiProperty({ description: 'Timestamp when stats were calculated', example: '2024-03-23T10:30:00Z' })
  calculatedAt: string;

  @ApiProperty({ 
    description: 'Period covered by the statistics',
    type: 'object',
    properties: {
      dateFrom: { type: 'string', required: false },
      dateTo: { type: 'string', required: false },
      schoolYearId: { type: 'string', required: false },
      compare: { type: 'string', required: false },
      previousDateFrom: { type: 'string', required: false },
      previousDateTo: { type: 'string', required: false },
    }
  })
  period: {
    dateFrom?: string;
    dateTo?: string;
    schoolYearId?: string;
    compare?: string;
    previousDateFrom?: string;
    previousDateTo?: string;
  };
}
