/** Role codes treated as VSC / volunteer facilitators (aligned with Ednov-web user.types). */
export const VOLUNTEER_ROLE_CODES = ['volunteer', 'vsc', 'professor'] as const;

export function isVolunteerRoleEntity(role: {
  roleGroup?: string | null;
  code?: string | null;
}): boolean {
  if (role.roleGroup === 'volunteers') return true;
  const code = (role.code ?? '').toLowerCase();
  return (VOLUNTEER_ROLE_CODES as readonly string[]).includes(code);
}

export function userHasVolunteerRole(user: {
  userRoles?: Array<{ role?: { roleGroup?: string | null; code?: string | null } | null }>;
}): boolean {
  for (const ur of user.userRoles ?? []) {
    if (ur.role && isVolunteerRoleEntity(ur.role)) return true;
  }
  return false;
}
