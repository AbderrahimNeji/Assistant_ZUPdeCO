export type AttendanceStatus = 'present' | 'absent' | 'excused' | 'pending';

export type TutorAbsenceReason =
  | 'personal_emergency'
  | 'professional_emergency'
  | 'leave'
  | 'technical_issue'
  | 'mutual_agreement'
  | 'other';

export type StudentAbsenceReason =
  | 'personal_emergency'
  | 'illness'
  | 'technical_issue'
  | 'mutual_agreement'
  | 'other';

export type AbsenceReason = TutorAbsenceReason | StudentAbsenceReason;

export interface ParticipantAttendance {
  participantId: string;
  userId: string;
  role: 'tutor' | 'student' | 'volunteer';
  attendanceStatus: AttendanceStatus;
  absenceReason?: AbsenceReason;
  absenceComment?: string;
}

export interface UpdateParticipantAttendanceDto {
  attendanceStatus: AttendanceStatus;
  absenceJustification?: string | null;
}
