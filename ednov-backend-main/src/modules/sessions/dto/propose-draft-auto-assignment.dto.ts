import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ParticipantDto } from './run-auto-assignment.dto';
import type { SessionType } from '../entities/session.entity';
import { SESSION_TYPES } from '../session-types.constants';

/**
 * DTO pour la proposition d'affectation auto en mode "draft" (séance pas encore persistée).
 *
 * Contrairement à `RunAutoAssignmentDto`, le client fournit ici TOUT le contexte de séance
 * (type, établissement, sujet, activité) puisqu'il n'y a pas encore d'enregistrement en base.
 * Aucun écriture n'est effectuée — la réponse est purement informative.
 */
export class ProposeDraftAutoAssignmentDto {
  @ApiProperty({
    description: 'Session type used to determine assignment constraints',
    enum: [...SESSION_TYPES],
  })
  @IsString()
  @IsIn([...SESSION_TYPES])
  sessionType!: SessionType;

  @ApiProperty({ description: 'Establishment in which the session will take place', format: 'uuid' })
  @IsUUID()
  establishmentId!: string;

  @ApiPropertyOptional({
    description: 'Primary subject of the session (used to match binôme cœur on subject).',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  subjectId?: string | null;

  @ApiPropertyOptional({
    description: 'Activity to derive `maxStudentsPerTutor` (ignored for `whole_class`).',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  activityId?: string | null;

  @ApiProperty({
    type: [ParticipantDto],
    description: 'Tutors and students to consider for the proposal (required).',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParticipantDto)
  participants!: ParticipantDto[];
}
