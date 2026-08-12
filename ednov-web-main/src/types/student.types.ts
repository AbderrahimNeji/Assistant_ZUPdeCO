import type { StudentAccountStatus } from '@/types/user.types';

export interface Student {
  id: string;
  companyId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  phone: string | null;
  photoUrl: string | null;
  status: StudentAccountStatus;
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
    availability?: Record<string, unknown> | null;
    isMinor?: boolean;
    hasSpecialNeeds?: boolean;
    specialNeedsType?: string | null;
    specialNeedsNote?: string | null;
    isDisabled?: boolean;
    disabilityTypes?: string[] | null;
    disabilityOtherNote?: string | null;
    dateOfBirth?: string | null;
    gender?: 'M' | 'F' | 'O' | null;
    address?: string | null;
    addressLine1?: string | null;
    department?: string | null;
    postalCode?: string | null;
    city?: string | null;
    country?: string | null;
    levelId?: string | null;
    level?: {
      id: string;
      label: string;
    } | null;
    schoolClassId?: string | null;
    schoolClass?: {
      id: string;
      name: string;
    } | null;
    medicalNotes?: string | null;
    userProfileSpecialties?: Array<{
      specialty: {
        id: string;
        code: string;
        label: string;
      };
    }> | null;
  }>;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  deactivationDate?: string | null;
  deactivationReason?: string | null;
  deactivationReasonNote?: string | null;
  presenceRate?: number | null;
}

export interface CreateStudentDto {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  dateOfBirth?: string;
  gender?: 'M' | 'F' | 'O';
  addressLine1?: string;
  department?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  levelId?: string;
  roleIds: string[];
  establishmentIds: string[];
  schoolClassId?: string;
  subjects?: string[];
  availability?: {
    weekly: Array<{
      day: number;
      start: string;
      end: string;
    }>;
  };
  hasSpecialNeeds?: boolean;
  specialNeedsType?: string;
  specialNeedsNote?: string;
  isDisabled?: boolean;
  disabilityTypes?: string[];
  disabilityOtherNote?: string;
  medicalNotes?: string;
  specialtyIds?: string[];
}

export interface UpdateStudentDto {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  photoUrl?: string;
  status?: StudentAccountStatus;
  dateOfBirth?: string;
  gender?: 'M' | 'F' | 'O';
  addressLine1?: string;
  department?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  levelId?: string;
  establishmentIds?: string[];
  schoolClassId?: string | null;
  subjects?: string[];
  availability?: CreateStudentDto['availability'];
  hasSpecialNeeds?: boolean;
  specialNeedsType?: string;
  specialNeedsNote?: string;
  isDisabled?: boolean;
  disabilityTypes?: string[];
  disabilityOtherNote?: string;
  deactivationReason?: string;
  deactivationReasonNote?: string;
  medicalNotes?: string;
  specialtyIds?: string[];
}

export interface StudentFilters {
  statuses: string[];
  levelIds: string[];
  subjects: string[];
  establishmentId?: string;
  exitDateFrom?: string;
  exitDateTo?: string;
  exitReason?: string;
}
