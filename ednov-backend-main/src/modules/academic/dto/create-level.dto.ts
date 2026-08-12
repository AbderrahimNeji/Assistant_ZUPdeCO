import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsInt, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { EducationCycle, LevelStatus } from '../entities/level.entity';

export class CreateLevelDto {
  @ApiProperty({ example: 'CP' })
  @IsString()
  @MaxLength(50)
  code!: string;

  @ApiProperty({ example: 'Cours Préparatoire' })
  @IsString()
  @MaxLength(100)
  label!: string;

  @ApiPropertyOptional({ enum: ['primary', 'middle', 'high'] })
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

  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: LevelStatus;
}
