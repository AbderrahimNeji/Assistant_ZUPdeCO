import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsArray, IsString, IsInt, Min, Max, MaxLength, IsBoolean, IsUUID } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ListActivitiesQueryDto {
  @ApiPropertyOptional({ type: [String], description: 'Statuses to filter by' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  statuses?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Activity type IDs to filter by' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  activityTypeIds?: string[];

  @ApiPropertyOptional({ type: Boolean, description: 'Filter by hasChat' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  hasChat?: boolean;

  @ApiPropertyOptional({ type: Boolean, description: 'Filter by hasBot' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  hasBot?: boolean;

  @ApiPropertyOptional({ type: Boolean, description: 'Filter by hasLink' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  hasLink?: boolean;

  @ApiPropertyOptional({ type: Boolean, description: 'Filter by canHaveCr' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  canHaveCr?: boolean;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
