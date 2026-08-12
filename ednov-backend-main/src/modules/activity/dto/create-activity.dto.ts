import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateActivityDto {
  @ApiPropertyOptional({ description: 'Activity type ID (optional when creating inline with newActivityType)' })
  @IsOptional()
  @IsUUID()
  activityTypeId?: string;

  @ApiProperty({ example: 'math_tutoring_60' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ example: 'Math tutoring 60min' })
  @IsString()
  @MaxLength(255)
  label: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  activityTypeName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  canHasCr?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  bot?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  withLink?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  chat?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  maxTutors?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  maxStudents?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  maxVolunteers?: number | null;

  @ApiPropertyOptional({ description: 'Max students per tutor per session (assignment cap)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxStudentsPerTutor?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  orderIndex?: number | null;

  @ApiPropertyOptional({ enum: ['active', 'inactive'], default: 'active' })
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: 'active' | 'inactive';
}
