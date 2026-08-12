import { IsOptional, IsDateString, IsUUID, IsArray, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class DashboardStatsQueryDto {
  @ApiPropertyOptional({ description: 'Start date for statistics (ISO 8601)', example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'End date for statistics (ISO 8601)', example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'School year ID to filter by', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsUUID()
  schoolYearId?: string;

  @ApiPropertyOptional({ description: 'Establishment ID to filter by', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsUUID()
  establishmentId?: string;

  @ApiPropertyOptional({
    isArray: true,
    description: 'Establishment IDs to filter by (one or many). Repeated: ?establishmentIds=uuid1&establishmentIds=uuid2',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (value != null) return [value];
    return undefined;
  })
  @IsArray()
  @IsUUID('4', { each: true })
  establishmentIds?: string[];

  @ApiPropertyOptional({
    description: 'Comparison mode: compare current period vs previous period (week, month, trim or year). trim = last 3 months vs the 3 months before.',
    enum: ['week', 'month', 'trim', 'year'],
    example: 'month',
  })
  @IsOptional()
  @IsIn(['week', 'month', 'trim', 'year'])
  compare?: 'week' | 'month' | 'trim' | 'year';
}
