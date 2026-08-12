import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsInt, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { EducationCycle, LevelStatus } from '../entities/level.entity';

export class UpdateLevelDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['primary', 'middle', 'high'])
  educationCycle?: EducationCycle | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minAge?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxAge?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  orderIndex?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: LevelStatus;
}
