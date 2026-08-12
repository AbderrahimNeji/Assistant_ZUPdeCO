/**
 * Types pour le matching élève–tuteur (affectations par séance + binômes cœur).
 * Alignés sur le backend : session_student_tutor_pairs, core_pairs, DTOs.
 */

import type { UserWithProfile } from './user.types';
import type { SessionType } from './session.types';

/** Origine d’une binôme séance (colonne assignment_source). */
export type AssignmentSource = 'manual' | 'auto_binome_coeur' | 'auto_history' | 'auto_balanced';

/** Source d’un binôme cœur (table core_pairs). */
export type BinomeCoeurSource = 'manual' | 'auto';

/** Une binôme élève–tuteur enregistrée pour une séance. */
export interface SessionStudentTutorPair {
  id: string;
  sessionId: string;
  studentUserId: string;
  tutorUserId: string;
  assignmentSource: AssignmentSource;
  createdAt?: string;
  // Relations chargées par le backend (getAllStudentTutorPairs)
  session?: {
    id: string;
    sessionDate: Date | string;
    startTime: string;
    endTime: string;
    type?: SessionType;
    status?: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED' | 'CANCELLED';
    establishment?: {
      id: string;
      name: string;
    };
    subjectIds?: string[];
    subjectNames?: string[];
    levelIds?: string[];
    levelNames?: string[];
    room?: {
      id: string;
      name: string;
    };
    subject?: {
      id: string;
      label: string;
    };
  };
  studentUser?: UserWithProfile;
  tutorUser?: UserWithProfile;
  // Statistiques enrichies
  sessionCount?: number;
  lastSession?: {
    sessionDate: Date | string;
    startTime: string;
    endTime: string;
  };
  nextSession?: {
    sessionDate: Date | string;
    startTime: string;
    endTime: string;
  };
}

/** Corps du PUT /sessions/:id/assignments */
export interface SetAssignmentsDto {
  pairs: StudentTutorPairInput[];
  participants?: ParticipantInput[];
}

export interface StudentTutorPairInput {
  studentUserId: string;
  tutorUserId: string;
}

export interface ParticipantInput {
  userId: string;
  role: 'student' | 'tutor' | 'volunteer';
}

/** Réponse GET /sessions/:id/assignment-candidates */
export interface AssignmentCandidatesResponse {
  students: UserWithProfile[];
  tutors: UserWithProfile[];
}

/** Source d'une paire proposée par l'algorithme d'affectation auto (non persistée). */
export type ProposedPairSource = 'auto_binome_coeur' | 'auto_balanced';

/** Paire élève–tuteur proposée (jamais persistée). */
export interface ProposedPair {
  studentUserId: string;
  tutorUserId: string;
  source: ProposedPairSource;
}

/** Réponse POST /sessions/:id/assignments/auto/propose et .../propose-draft */
export interface AutoAssignmentProposal {
  sessionType: SessionType;
  proposedPairs: ProposedPair[];
  unassignedStudentIds: string[];
}

/** Corps POST /sessions/assignments/auto/propose-draft (séance non encore créée). */
export interface ProposeDraftAutoAssignmentDto {
  sessionType: SessionType;
  establishmentId: string;
  subjectId?: string | null;
  activityId?: string | null;
  participants: ParticipantInput[];
}

/** Création binôme cœur — POST /companies/:companyId/binome-coeur */
export interface CreateBinomeCoeurDto {
  establishmentId?: string | null;
  subjectId?: string | null;
  studentUserId: string;
  tutorUserId: string;
}

export interface BinomeCoeurEstablishmentRef {
  id: string;
  name?: string;
}

export interface BinomeCoeurSubjectRef {
  id: string;
  label?: string;
  code?: string;
}

/** Ligne core_pairs telle que renvoyée par l’API (relations optionnelles). */
export interface BinomeCoeur {
  id: string;
  companyId: string;
  establishmentId: string | null;
  subjectId: string | null;
  studentUserId: string;
  tutorUserId: string;
  source: BinomeCoeurSource;
  createdAt?: string;
  updatedAt?: string;
  establishment?: BinomeCoeurEstablishmentRef | null;
  subject?: BinomeCoeurSubjectRef | null;
  studentUser?: UserWithProfile;
  tutorUser?: UserWithProfile;
}

export interface ListBinomeCoeurQuery {
  establishmentId?: string;
  subjectId?: string;
}
