import type { UserAccountStatus } from '@/types/user.types';

/** Stored as English enum values in DB (`employee` | `student` | `retired`). */
export type ProfessionalSituation = 'employee' | 'student' | 'retired';

export const PROFESSIONAL_SITUATION_OPTIONS: Array<{
  value: ProfessionalSituation;
  label: string;
}> = [
  { value: 'employee', label: 'Employé' },
  { value: 'student', label: 'Étudiant' },
  { value: 'retired', label: 'Retraité' },
];

export interface Tutor {
  id: string;
  companyId: string;
  firebaseUid: string;
  hoursDone?: number;
  attendanceRate?: number | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  phone: string | null;
  photoUrl: string | null;
  /** Liste/profil : même union que User (rôle tuteur → en pratique active | deactivated) */
  status: UserAccountStatus;
  userEstablishments?: Array<{
    establishmentId: string;
    establishment: {
      id: string;
      name: string;
      uaiCode?: string;
    };
  }>;
  userRoles?: Array<{
    roleId: string;
    role: { code: string; label: string };
  }>;
  userProfiles?: Array<{
    profileId?: string | null;
    subjects?: unknown[] | null;
    subjectNames?: string[] | null;
    availability?: Record<string, unknown> | null;
    engagementStartDate?: Date | null;
    engagementEndDate?: Date | null;
    professionalSituation?: ProfessionalSituation | null;
    schoolClassId?: string | null;
    schoolClass?: { id: string; name: string } | null;
    gender?: 'M' | 'F' | 'O' | null;
    targetHours?: number | null;
    exitReason?: string | null;
    exitDate?: Date | null;
  }>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateTutorDto {
  inviteBy: 'email' | 'phone';
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  roleIds: string[];
  profileId?: string;
  establishmentIds: string[];
  subjects?: string[];
  availability?: {
    weekly: Array<{
      day: number;
      start: string;
      end: string;
    }>;
  };
  engagementStartDate?: string;
  engagementEndDate?: string;
  professionalSituation: ProfessionalSituation;
  gender?: 'M' | 'F' | 'O';
  targetHours?: number;
}

export interface UpdateTutorDto {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  status?: UserAccountStatus;
  roleIds?: string[];
  establishmentIds?: string[];
  subjects?: string[];
  schoolClassId?: string | null;
  availability?: CreateTutorDto['availability'];
  engagementStartDate?: string;
  engagementEndDate?: string;
  professionalSituation?: ProfessionalSituation;
  gender?: 'M' | 'F' | 'O';
  targetHours?: number;
  exitReason?: string;
  exitReasonNote?: string;
}
