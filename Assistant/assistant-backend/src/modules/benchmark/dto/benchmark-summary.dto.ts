import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

import { BenchmarkResultDto } from './benchmark-result.dto';

export class BenchmarkSummaryDto {
  @ApiPropertyOptional({
    example: 'clxyz123',
    description: 'Persisted BenchmarkRun id',
  })
  @IsOptional()
  runId?: string;

  @ApiPropertyOptional({
    example: '2026-07-22T09:13:24.000Z',
  })
  @IsOptional()
  createdAt?: Date;

  @ApiPropertyOptional({
    example: 'benchmark',
    description: 'Dataset name used for this run',
  })
  @IsOptional()
  @IsString()
  dataset?: string;

  @ApiProperty({ example: 50 })
  @IsInt()
  @Min(0)
  totalQuestions: number;

  @ApiProperty({ example: 40 })
  @IsInt()
  @Min(0)
  successCount: number;

  @ApiProperty({
    example: 10,
    description: 'Number of failed requests',
  })
  @IsInt()
  @Min(0)
  failedRequests: number;

  @ApiProperty({
    example: 0.8,
    description: 'Success rate between 0 and 1',
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  successRate: number;

  @ApiProperty({
    example: 1234.56,
    description: 'Average latency in milliseconds',
  })
  @IsNumber()
  averageLatency: number;

  @ApiProperty({
    example: 800.12,
    description: 'Minimum latency in milliseconds',
  })
  @IsNumber()
  minLatency: number;

  @ApiProperty({
    example: 2100.45,
    description: 'Maximum latency in milliseconds',
  })
  @IsNumber()
  maxLatency: number;

  @ApiProperty({
    example: 1180.3,
    description: 'Median latency in milliseconds',
  })
  @IsNumber()
  medianLatency: number;

  @ApiPropertyOptional({
    example: 0.72,
    description: 'Average similarity score across all results',
  })
  @IsOptional()
  @IsNumber()
  averageSimilarity?: number;

  @ApiProperty({
    example: 0.45,
    description: 'Percentage (0–1) of answers with similarity ≥ 0.8',
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  highSimilarityRate: number;

  @ApiProperty({
    example: 120,
    description: 'Total number of retrieved sources across all questions',
  })
  @IsInt()
  @Min(0)
  retrievedSources: number;

  @ApiProperty({
    example: 2.4,
    description: 'Average number of retrieved sources per question',
  })
  @IsNumber()
  averageRetrievedSources: number;

  @ApiProperty({
    type: [BenchmarkResultDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BenchmarkResultDto)
  results: BenchmarkResultDto[];
}
