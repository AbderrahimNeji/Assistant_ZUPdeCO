import { UserRole } from '@prisma/client';

/**
 * Map Ednov role codes (from userRoles[].role.code) onto Assistant UserRole.
 * Authorization for data access still happens in Ednov APIs — this is only for
 * ToolUserContext / local Prisma user sync so the AI pipeline can load a user.
 */
export function mapEdnovRolesToUserRole(roleCodes: string[]): UserRole {
  const normalized = roleCodes.map((code) => code.trim().toLowerCase());

  if (normalized.some((c) => c === 'admin' || c === 'administrator')) {
    return UserRole.ADMIN;
  }
  if (
    normalized.some(
      (c) =>
        c === 'manager' ||
        c === 'coordinator' ||
        c === 'coordinateur' ||
        c === 'coordinatrice',
    )
  ) {
    return UserRole.COORDINATOR;
  }
  if (normalized.some((c) => c === 'tutor' || c === 'tuteur' || c === 'tutrice')) {
    return UserRole.TUTOR;
  }
  if (normalized.some((c) => c === 'parent')) {
    return UserRole.PARENT;
  }
  if (normalized.some((c) => c === 'student' || c === 'élève' || c === 'eleve')) {
    return UserRole.STUDENT;
  }

  // Volunteers and unknown roles: least-privilege student-like context.
  return UserRole.STUDENT;
}

export type EdnovLoginUser = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  firebaseUid?: string;
  companyId?: string | null;
  userRoles?: Array<{
    role?: { code?: string; label?: string };
  }>;
};

export function extractEdnovRoleCodes(user: EdnovLoginUser): string[] {
  return (user.userRoles ?? [])
    .map((ur) => ur.role?.code)
    .filter((code): code is string => Boolean(code));
}
