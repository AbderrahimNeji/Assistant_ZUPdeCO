import type { UserWithProfile } from './user.types';

// Re-export pour compatibilité
export type { CreateActivityDto, CreateActivityTypeDto } from './activity.types';
import type { CreateActivityDto, CreateActivityTypeDto } from './activity.types';

export type SessionType =
  | 'homework_help'
  | 'individual_tutoring'
  | 'workshop'
  | 'whole_class'
  | 'group_tutoring';

/** Mode groupes : 1 séance par tuteur, 1 tuteur par élève (aide aux devoirs, atelier, tutorat). */
export const GROUP_SESSION_TYPES = [
  'homework_help',
  'workshop',
  'group_tutoring',
] as const satisfies readonly SessionType[];

export type GroupSessionType = (typeof GROUP_SESSION_TYPES)[number];

/** Types autorisés en planification collective. */
export const COLLECTIVE_SESSION_TYPE_VALUES: SessionType[] = [
  'homework_help',
  'workshop',
  'whole_class',
  'group_tutoring',
];

export function isGroupSessionType(
  type: SessionType | '' | null | undefined,
): type is GroupSessionType {
  return type != null && type !== '' && (GROUP_SESSION_TYPES as readonly string[]).includes(type);
}

/** Type de planification choisi en amont de la création d'une séance. */
export type PlanificationType = 'individual' | 'collective';
export type SessionFormat = 'in_person' | 'remote' | 'hybrid';
export type SessionMode = 'single' | 'recurring';
export type SessionStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED' | 'CANCELLED';
export type RecurrenceType =
  | 'none'
  | 'once'
  | 'daily'
  | 'weekly'
  | 'several_days_per_week'
  | 'biweekly'
  | 'monthly'
  | 'ab'
  | 'custom';

/** PATCH `/sessions/:id` when editing a recurring series (backend enum). */
export type RecurrenceUpdateScope = 'occurrence' | 'following';

export interface Session {
  id: string;
  companyId: string;
  establishmentId: string;
  roomId?: string | null;
  programId?: string | null;
  schoolYearId: string;
  levelIds?: string[];
  levelNames?: string[];
  subjectIds?: string[];
  subjectNames?: string[];
  classId?: string | null;
  specialtyIds?: string[] | null;
  sessionDate: Date;
  startTime: string;
  endTime: string;
  type: SessionType;
  sessionFormat: SessionFormat;
  joinLink?: string | null;
  mode: SessionMode;
  recurrenceType: RecurrenceType;
  recurrenceRule?: Record<string, unknown> | null;
  maxStudents?: number | null;
  maxVolunteers?: number | null;
  activityId?: string | null;
  establishmentName?: string | null;
  programName?: string | null;
  activityName?: string | null;
  roomName?: string | null;
  topic?: string | null;
  durationMinutes?: number | null;
  /** If true (default), scheduling on company holiday/vacation dates is allowed. */
  planDuringHolidays?: boolean;
  internalNotes?: string | null;
  /** Present when this row was created as part of a recurring series. */
  recurrenceGroupId?: string | null;
  status: SessionStatus;
  managedById?: string | null;
  managedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  establishment?: {
    id: string;
    name: string;
  };
  activity?: {
    id: string;
    label: string;
    maxTutors?: number | null;
    maxStudents?: number | null;
    maxVolunteers?: number | null;
  };
  createdAt: Date;
  updatedAt: Date;
  _permissions?: Record<string, boolean>;
}

export interface CreateSessionDto {
  establishmentId: string;
  roomId?: string | null;
  programId?: string | null;
  schoolYearId?: string | null;
  levelIds?: string[];
  subjectIds?: string[];
  classId?: string | null;
  specialtyIds?: string[] | null;
  sessionDate: string;
  startTime: string;
  endTime: string;
  type: SessionType;
  sessionFormat?: SessionFormat;
  joinLink?: string | null;
  mode?: SessionMode;
  recurrenceType?: RecurrenceType;
  recurrenceRule?: Record<string, unknown> | null;
  maxStudents?: number | null;
  maxVolunteers?: number | null;
  activityId?: string | null;
  topic?: string | null;
  durationMinutes?: number | null;
  planDuringHolidays?: boolean;
  internalNotes?: string | null;
  tutorIds?: string[];
  studentIds?: string[];
  volunteerIds?: string[];
  /** Explicit tutor–student pairs; if omitted, backend derives studentIds × tutorIds. */
  pairs?: Array<{ studentUserId: string; tutorUserId: string }>;
  newActivity?: CreateActivityDto;
  newActivityType?: CreateActivityTypeDto;
  establishmentName?: string | null;
  programName?: string | null;
  activityName?: string | null;
  roomName?: string | null;
}

export interface UpdateSessionDto {
  establishmentId?: string;
  roomId?: string | null;
  programId?: string | null;
  schoolYearId?: string;
  levelIds?: string[];
  subjectIds?: string[];
  classId?: string | null;
  specialtyIds?: string[] | null;
  sessionDate?: string;
  startTime?: string;
  endTime?: string;
  type?: SessionType;
  sessionFormat?: SessionFormat;
  joinLink?: string | null;
  mode?: SessionMode;
  recurrenceType?: RecurrenceType;
  recurrenceRule?: Record<string, unknown> | null;
  maxStudents?: number | null;
  maxVolunteers?: number | null;
  activityId?: string | null;
  topic?: string | null;
  durationMinutes?: number | null;
  planDuringHolidays?: boolean;
  internalNotes?: string | null;
  tutorIds?: string[];
  studentIds?: string[];
  volunteerIds?: string[];
  pairs?: Array<{ studentUserId: string; tutorUserId: string }>;
  status?: SessionStatus;
  newActivity?: CreateActivityDto;
  newActivityType?: CreateActivityTypeDto;
  establishmentName?: string | null;
  programName?: string | null;
  activityName?: string | null;
  roomName?: string | null;
  recurrenceUpdateScope?: RecurrenceUpdateScope;
}

export interface SessionParticipant {
  id: string;
  sessionId: string;
  userId: string;
  role: 'tutor' | 'student' | 'volunteer';
  user: UserWithProfile;
  attendanceStatus?: string;
  absenceJustification?: string | null;
  absenceComment?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionWithParticipants extends Session {
  participants?: SessionParticipant[];
  studentTutorPairs?: Array<{
    id?: string;
    sessionId?: string;
    studentUserId: string;
    tutorUserId: string;
    assignmentSource?: 'manual' | 'auto_binome_coeur' | 'auto_history' | 'auto_balanced';
    studentUser?: UserWithProfile;
    tutorUser?: UserWithProfile;
  }>;
}
