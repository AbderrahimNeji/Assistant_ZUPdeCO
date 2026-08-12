import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsUUID,
  MaxLength,
  ValidateIf,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PostItThematic, PostItColor } from '../entities/post-it.entity';
import { AssignedPostItRecurrence } from '../entities/assigned-post-it-template.entity';
import { ScheduleConfig } from '../schedule-config.types';

export class CreateAssignedPostItTemplateDto {
  @ApiProperty({ description: 'Post-it title', maxLength: 255 })
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

  @ApiPropertyOptional({ description: 'Role code to target all users with this role' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  targetRoleCode?: string;

  @ApiPropertyOptional({ description: 'Specific user UUID to target' })
  @IsOptional()
  @IsUUID()
  targetUserId?: string;

  @ApiProperty({ enum: ['weekly', 'quarterly', 'annually', 'specific_date'] })
  @IsEnum(['weekly', 'quarterly', 'annually', 'specific_date'])
  recurrenceType: AssignedPostItRecurrence;

  @ApiPropertyOptional({ description: 'Start date — required when recurrenceType is specific_date' })
  @ValidateIf((o) => o.recurrenceType === 'specific_date')
  @IsDateString()
  specificDateFrom?: string;

  @ApiPropertyOptional({ description: 'End date (optional)' })
  @IsOptional()
  @IsDateString()
  specificDateTo?: string;

  @ApiPropertyOptional({ description: 'Advanced schedule configuration (replaces recurrenceType when present)' })
  @IsOptional()
  @IsObject()
  scheduleConfig?: ScheduleConfig;
}
