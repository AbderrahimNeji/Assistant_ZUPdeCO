import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class FilterBenchmarkDto {
  @ApiPropertyOptional({ example: 'benchmark' })
  @IsOptional()
  @IsString()
  dataset?: string;

  @ApiPropertyOptional({
    example: '2026-07-01',
    description: 'Inclusive start date (ISO)',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    example: '2026-07-22',
    description: 'Inclusive end date (ISO)',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    enum: ['all', 'success', 'failures'],
    example: 'all',
  })
  @IsOptional()
  @IsIn(['all', 'success', 'failures'])
  status?: 'all' | 'success' | 'failures';

  @ApiPropertyOptional({
    description: 'Max runs to return (omit for all, capped at 500)',
    minimum: 1,
    maximum: 500,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
