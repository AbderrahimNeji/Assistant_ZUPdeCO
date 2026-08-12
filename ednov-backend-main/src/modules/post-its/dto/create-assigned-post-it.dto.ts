import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsUUID,
  IsArray,
  IsNumber,
  MaxLength,
  ValidateIf,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PostItThematic, PostItColor } from '../entities/post-it.entity';
import { AssignedPostItRecurrence } from '../entities/assigned-post-it-template.entity';
import { ScheduleConfig } from '../schedule-config.types';

export class CreateAssignedPostItDto {
  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    enum: ['seances', 'matching', 'tuteur', 'eleves', 'etablissements', 'administration', 'autres', 'formation', 'rapport_activite'],
  })
  @IsEnum(['seances', 'matching', 'tuteur', 'eleves', 'etablissements', 'administration', 'autres', 'formation', 'rapport_activite'])
  thematic: PostItThematic;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiPropertyOptional({ enum: ['jaune', 'orange', 'rose', 'vert', 'violet', 'bleu', 'turquoise'] })
  @IsOptional()
  @IsEnum(['jaune', 'orange', 'rose', 'vert', 'violet', 'bleu', 'turquoise'])
  color?: PostItColor;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPriority?: boolean;

  @ApiPropertyOptional({
    description: 'UUIDs of target roles',
    type: [String],
    format: 'uuid',
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  targetRoleIds?: string[];

  @ApiPropertyOptional({ enum: ['weekly', 'monthly', 'quarterly', 'annually', 'specific_date'] })
  @IsOptional()
  @IsEnum(['weekly', 'monthly', 'quarterly', 'annually', 'specific_date'])
  recurrence?: AssignedPostItRecurrence;

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

  @ApiPropertyOptional({ description: 'Advanced schedule configuration' })
  @IsOptional()
  @IsObject()
  scheduleConfig?: ScheduleConfig;
}
