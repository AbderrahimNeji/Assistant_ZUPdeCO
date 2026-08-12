import { ApiProperty } from '@nestjs/swagger';
import type { AssignmentSource } from '../entities/session-student-tutor-pair.entity';
import type { SessionType } from '../entities/session.entity';
import { SESSION_TYPES } from '../session-types.constants';

export class ProposedPairDto {
  @ApiProperty({ description: 'Student user ID' })
  studentUserId!: string;

  @ApiProperty({ description: 'Tutor or volunteer user ID' })
  tutorUserId!: string;

  @ApiProperty({
    description: 'Source of the proposed assignment',
    enum: ['auto_binome_coeur', 'auto_balanced'],
  })
  source!: AssignmentSource;
}

export class AutoAssignmentProposalDto {
  @ApiProperty({
    description: 'Session type used to determine assignment constraints',
    enum: [...SESSION_TYPES],
  })
  sessionType!: SessionType;

  @ApiProperty({
    description: [
      'Proposed tutor–student pairs (not persisted).',
      'individual_tutoring: strict 1 tutor ↔ 1 student per pair.',
      'homework_help / workshop / group_tutoring: 1 tutor may appear in multiple pairs (1:N).',
      'whole_class: all eligible tutors distributed across all students (N:N).',
    ].join(' '),
    type: [ProposedPairDto],
  })
  proposedPairs!: ProposedPairDto[];

  @ApiProperty({
    description: 'Student IDs that could not be assigned to any tutor (no available slot)',
    type: [String],
  })
  unassignedStudentIds!: string[];
}
