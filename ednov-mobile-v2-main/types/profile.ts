/**
 * Tutor profile (view-only in v1).
 * Align with backend GET /users/me (or /identity/users/me) when API is ready.
 */
export interface EngagementSlot {
  day: string;
  start: string;
  end: string;
}

/** Backend tutor_criminal_records.status */
export type CriminalRecordStatus = 'pending' | 'validated';

/** Backend user_profiles.tutor_platform_status (distinct from users.status) */
export type TutorPlatformStatus = 'pending' | 'active';

export interface CriminalRecordInfo {
  fileName: string;
  depositedAt: string;
  status: CriminalRecordStatus;
  validatedAt: string | null;
}

export interface TutorProfile {
  /** Backend user UUID (for authorId in session reports, etc.) */
  id?: string | null;
  avatarUrl?: string | null;
  firstName: string;
  lastName: string;
  createdAt: string;
  phone?: string | null;
  establishment?: string | null;
  engagement?: EngagementSlot[];
  /** From GET /users/login */
  criminalRecord: CriminalRecordInfo | null;
  tutorPlatformStatus: TutorPlatformStatus;
}
