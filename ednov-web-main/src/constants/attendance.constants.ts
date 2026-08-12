import type {
  TutorAbsenceReason,
  StudentAbsenceReason,
  AttendanceStatus,
} from '@/types/attendance.types';

export const TUTOR_ABSENCE_REASONS: Record<TutorAbsenceReason, string> = {
  personal_emergency: 'Imprévu personnel',
  professional_emergency: 'Imprévu professionnel',
  leave: 'Congé',
  technical_issue: 'Problème technique',
  mutual_agreement: 'Commun accord',
  other: 'Autre',
} as const;

export const STUDENT_ABSENCE_REASONS: Record<StudentAbsenceReason, string> = {
  personal_emergency: 'Imprévu personnel',
  illness: 'Maladie',
  technical_issue: 'Problème technique',
  mutual_agreement: 'Commun accord',
  other: 'Autre',
} as const;

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Présent',
  absent: 'Absent',
  excused: 'Excusé',
  pending: 'En attente',
} as const;
