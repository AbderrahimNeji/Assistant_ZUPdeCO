import {
  IsOptional,
  IsInt,
  IsBoolean,
  IsObject,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PutSessionConfigDto {
  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(480)
  defaultDurationMinutes?: number | null;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxStudentsPerSession?: number | null;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxVolunteersPerSession?: number | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  allowRecurring?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allowAbCalendar?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allowOverbooking?: boolean;

  @ApiPropertyOptional({ example: 48 })
  @IsOptional()
  @IsInt()
  @Min(0)
  reportDeadlineHours?: number | null;

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @IsInt()
  @Min(0)
  autoCloseAfterDays?: number | null;

  @ApiPropertyOptional({ enum: ['manual', 'automatic', 'hybrid'] })
  @IsOptional()
  @IsEnum(['manual', 'automatic', 'hybrid'])
  matchingStrategy?: 'manual' | 'automatic' | 'hybrid';

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}
