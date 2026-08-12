import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  MaxLength,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SessionReportStatus } from '../entities/session-report.entity';
import { SessionReportParticipantAttendanceItemDto } from './session-report-participant-attendance.dto';
import { SessionReportAuthorFeedbackDto } from './session-report-author-feedback.dto';

export class UpdateSessionReportDto {
  @ApiPropertyOptional({
    type: [SessionReportAuthorFeedbackDto],
    description: 'Patch entries by idAuteur; non-staff may only update their own slot',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionReportAuthorFeedbackDto)
  authorFeedbacks?: SessionReportAuthorFeedbackDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  script?: string | null;

  /**
   * Conservé pour l’instant (voir entité `SessionReport.subject`). Source de vérité structurée : futur
   * `subjectIds` / colonne `subject_ids`.
   */
  @ApiPropertyOptional({
    description:
      'Conservé pour rétrocompat (texte ou encodage). Les matières structurées viendront de subject_ids côté API.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  subject?: string | null;

  @ApiPropertyOptional({ type: [String], description: 'Identifiants des matières (référentiel), aligné sur la séance' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  subjectIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['to_complete', 'draft', 'submitted', 'validated', 'overdue'])
  status?: SessionReportStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  validatedById?: string | null;

  @ApiPropertyOptional({
    description: 'AI-generated pedagogical resources',
    type: 'array',
    items: {
      type: 'object',
      properties: { title: { type: 'string' }, problem: { type: 'string' }, solution: { type: 'string' } },
    },
  })
  @IsOptional()
  generatedResources?: { title: string; problem: string; solution: string }[] | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  authorName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  sessionDisplayName?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  validatedByName?: string | null;

  @ApiPropertyOptional({ type: [SessionReportParticipantAttendanceItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionReportParticipantAttendanceItemDto)
  participants?: SessionReportParticipantAttendanceItemDto[];
}
