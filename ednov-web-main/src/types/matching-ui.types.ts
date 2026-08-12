import type { UserWithProfile } from './user.types';
import type { SessionStudentTutorPair } from './matching.types';
import type { SessionType } from './session.types';

/**
 * Session simplifiée pour l'interface matching (tableau central dans ConfigureMatchingView).
 * Contient uniquement les informations nécessaires pour afficher la séance
 * et gérer le drag-and-drop.
 */
export interface SessionForMatching {
  id: string;
  sessionDate: Date | string;
  startTime: string;
  endTime: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED' | 'CANCELLED';
  type: SessionType;
  recurrenceType?:
    | 'once'
    | 'daily'
    | 'weekly'
    | 'biweekly'
    | 'monthly'
    | 'several_days_per_week'
    | 'custom'
    | 'none';
  maxStudents?: number | null;
  establishmentName?: string | null;
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
  activity?: {
    id: string;
    name: string;
    maxStudents?: number;
    maxStudentsPerTutor?: number;
  };
  // Participants actuels de la séance
  participants?: Array<{
    id: string;
    userId: string;
    role: 'tutor' | 'student' | 'volunteer';
    user?: UserWithProfile;
  }>;
  // binômes existantes pour cette séance
  studentTutorPairs?: SessionStudentTutorPair[];
}
