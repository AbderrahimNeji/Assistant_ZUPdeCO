import {
  IsArray,
  ArrayMinSize,
  IsUUID,
  IsEnum,
  IsOptional,
  IsDateString,
  IsNumber,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssignedPostItRecurrence } from '../entities/assigned-post-it-template.entity';

export class BulkAssignedPostItDto {
  @ApiProperty({ description: 'UUIDs of templates to update', type: [String], format: 'uuid' })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('all', { each: true })
  ids: string[];

  @ApiProperty({ description: 'UUID of the target role', format: 'uuid' })
  @IsUUID()
  roleId: string;

  @ApiProperty({ enum: ['weekly', 'monthly', 'quarterly', 'annually', 'specific_date'] })
  @IsEnum(['weekly', 'monthly', 'quarterly', 'annually', 'specific_date'])
  recurrence: AssignedPostItRecurrence;

  @ApiPropertyOptional({ description: 'Start date — required when recurrence is specific_date' })
  @ValidateIf((o) => o.recurrence === 'specific_date')
  @IsDateString()
  specificDateFrom?: string;

  @ApiPropertyOptional({ description: 'End date (optional)' })
  @IsOptional()
  @IsDateString()
  specificDateTo?: string;

  @ApiPropertyOptional({ type: [Number], description: 'Selected quarter periods (1–4), used when recurrence is quarterly' })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  quarterlyPeriods?: number[];
}

export class BulkAssignedPostItResultDto {
  @ApiProperty() updated: number;
  @ApiProperty({ type: [String] }) notFound: string[];
}
