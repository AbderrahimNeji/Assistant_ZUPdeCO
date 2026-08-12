import type { UserAccountStatus } from '@/types/user.types';

export interface Volunteer {
  id: string;
  companyId: string;
  firebaseUid: string;
  engagementDurationMonths?: number;
  hoursDone?: number;
  attendanceRate?: number | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  phone: string | null;
  photoUrl: string | null;
  status: UserAccountStatus;
  managedById?: string | null;
  managedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
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
    vscReportsFrequencies?: {
      daily: boolean;
      weekly: boolean;
    } | null;
    engagementStartDate?: Date | null;
    engagementEndDate?: Date | null;
    gender?: 'M' | 'F' | 'O' | null;
    targetHours?: number | null;
    exitReason?: string | null;
    exitDate?: Date | null;
  }>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateVolunteerDto {
  inviteBy: 'email' | 'phone';
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  roleIds: string[];
  profileId?: string;
  establishmentIds: string[];
  managedById?: string | null;
  subjects?: string[];
  subjectNames?: string[];
  availability?: {
    weekly: Array<{
      day: number;
      start: string;
      end: string;
    }>;
  };
  vscReportsFrequencies?: {
    daily: boolean;
    weekly: boolean;
  };
  engagementStartDate?: string;
  engagementEndDate?: string;
  gender?: 'M' | 'F' | 'O';
  targetHours?: number;
  exitReason?: string;
  exitReasonNote?: string;
}

export interface UpdateVolunteerDto {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  status?: UserAccountStatus;
  roleIds?: string[];
  establishmentIds?: string[];
  managedById?: string | null;
  subjects?: string[];
  subjectNames?: string[];
  availability?: CreateVolunteerDto['availability'];
  vscReportsFrequencies?: {
    daily: boolean;
    weekly: boolean;
  };
  engagementStartDate?: string;
  engagementEndDate?: string;
  gender?: 'M' | 'F' | 'O';
  targetHours?: number;
  exitReason?: string;
  exitReasonNote?: string;
}

export interface VolunteerFilters {
  statuses: string[];
  subjects: string[];
  establishmentId?: string;
  managedById?: string;
}
