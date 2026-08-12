/** Aligné sur ednov-backend user-status : élève */
export type StudentAccountStatus = 'registered' | 'accompanied' | 'deactivated';

/** Aligné sur ednov-backend user-status : staff (plus de suspended sur users) */
export type StaffAccountStatus = 'active' | 'deactivated';

/** Valeurs possibles de users.status côté API (union sans doublon) */
export type UserAccountStatus = 'registered' | 'accompanied' | 'active' | 'deactivated';

/** Données legacy ou hybrides → staff canonique active | deactivated */
export function normalizeStaffAccountStatus(raw: string): StaffAccountStatus {
  if (raw === 'active' || raw === 'deactivated') return raw;
  if (raw === 'suspended') return 'deactivated';
  return 'active';
}

/** Données legacy → statuts élève canoniques */
export function normalizeStudentAccountStatus(raw: string): StudentAccountStatus {
  if (raw === 'registered' || raw === 'accompanied' || raw === 'deactivated') return raw;
  if (raw === 'active') return 'registered';
  if (raw === 'suspended') return 'deactivated';
  return 'registered';
}

export interface User {
  id: string;
  companyId: string;
  firebaseUid: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  photoUrl: string | null;
  phone: string | null;
  status: UserAccountStatus;
  /** Email invite activated (password set). false while an activation link is still pending. */
  emailVerified?: boolean;
  permissions?: Record<string, string[]>;
  userRoles?: Array<{
    roleId: string;
    role: {
      id: string;
      code: string;
      label: string;
      permissions?: Record<string, string[]>;
    };
  }>;
  interfaceAccess?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/** Présent sur GET /users/students/:id lorsque l’élève est désactivé (aligné backend). */
export type StudentReactivationTargetStatus = 'registered' | 'accompanied';

export interface UserWithProfile extends User {
  managedById?: string | null;
  hoursDone?: number;
  engagementDurationMonths?: number;
  managedBy?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  };
  currentRole?: 'tutor' | 'student' | 'volunteer';
  isPinned?: boolean;
  userProfiles?: Array<{
    id?: string;
    role?: string;
    subjects?: unknown[] | null;
    subjectNames?: string[] | null;
    availability?: Record<string, unknown> | null;
    level?: {
      id: string;
      label: string;
    };
    isMinor?: boolean | null;
    hasSpecialNeeds?: boolean | null;
    vscReportsFrequencies?: {
      daily: boolean;
      weekly: boolean;
      monthly: boolean;
    };
    dateOfBirth?: string | null;
    gender?: 'M' | 'F' | 'O' | null;
    address?: string | null;
    levelId?: string | null;
    medicalNotes?: string | null;

    engagementStartDate?: Date | null;
    engagementEndDate?: Date | null;
    /** Tutor profile — English enum from API */
    professionalSituation?: 'employee' | 'student' | 'retired' | null;
    /** Tutor objective — number of hours to achieve */
    targetHours?: number | null;
    userProfileSpecialties?: Array<{
      specialty: {
        id: string;
        code: string;
        label: string;
      };
    }> | null;
  }>;
  userRoles?: Array<{
    roleId: string;
    role: {
      id: string;
      code: string;
      label: string;
      roleGroup?: string;
    };
  }>;
  userEstablishments?: Array<{
    id: string;
    establishmentId: string;
    establishment: {
      id: string;
      name: string;
      uaiCode: string | null;
      type: string;
      city: string;
      postalCode: string;
    };
  }>;
  /**
   * Email-invited account still awaiting activation (computed from Firebase on the detail
   * endpoints). Drives the "Régénérer le lien d'activation" button. Undefined on list payloads.
   */
  pendingActivation?: boolean;
  /** Présences séances (élève désactivé, payload enrichi). */
  presentSessionCount?: number;
  /** Cible de réactivation selon le nombre de présences (élève désactivé, payload enrichi). */
  reactivationTargetStatus?: StudentReactivationTargetStatus;
}

export interface AvailabilitySlot {
  day: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface InterfaceConfig {
  [interfaceName: string]: Record<string, unknown>;
}

export interface UserPreferences {
  id: string;
  userId: string;
  isDarkMode: boolean;
  interfaceConfigs: InterfaceConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface SidebarConfig {
  isCollapsed: boolean;
  openMenus: string[];
  [key: string]: unknown;
}

/** Codes connus du groupe "volunteers" — fallback si roleGroup n'est pas renvoyé par l'API. */
export const VOLUNTEER_ROLE_CODES = ['volunteer', 'vsc', 'professor'] as const;

/**
 * Retourne le label du rôle volunteer spécifique d'un utilisateur
 * (ex. "Volunteer" pour le code "volunteer", "Professeur" pour "PROFESSOR").
 * Utilise roleGroup si disponible, sinon se rabat sur les codes connus.
 */
export function getVolunteerRoleLabel(user: Pick<UserWithProfile, 'userRoles'>): string | null {
  if (!user?.userRoles?.length) return null;
  for (const ur of user.userRoles) {
    const isVolunteer =
      ur.role.roleGroup === 'volunteers' ||
      VOLUNTEER_ROLE_CODES.includes(
        ur.role.code.toLowerCase() as (typeof VOLUNTEER_ROLE_CODES)[number],
      );
    if (isVolunteer) return ur.role.label;
  }
  return null;
}

/**
 * Retourne true si l'utilisateur appartient au groupe "volunteers".
 */
export function isVolunteerUser(user: Pick<UserWithProfile, 'userRoles'>): boolean {
  return getVolunteerRoleLabel(user) !== null;
}

/**
 * Retourne le roleGroup d'un utilisateur (ex: 'tutors', 'volunteers', 'students', etc.)
 * Retourne le premier roleGroup trouvé, ou null si aucun.
 */
export function getUserRoleGroup(user: Pick<UserWithProfile, 'userRoles'>): string | null {
  if (!user?.userRoles?.length) return null;
  const roleWithGroup = user.userRoles.find((ur) => ur.role.roleGroup);
  return roleWithGroup?.role.roleGroup || null;
}
