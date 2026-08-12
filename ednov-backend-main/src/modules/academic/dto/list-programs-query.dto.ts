import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsArray, IsIn, IsBoolean, IsInt, Min, Max, IsString, MaxLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ListProgramsQueryDto {
  @ApiPropertyOptional({ type: [String], description: 'Statuses to filter by' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  statuses?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Cycles to filter by' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  cycles?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Periodes to filter by' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  periodes?: string[];

  @ApiPropertyOptional({ type: Boolean, description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;

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
