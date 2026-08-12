/** Minimal role shape for code lookup (API / users.service and role.types). */
export interface RoleCodeMatch {
  id: string;
  code: string;
  label: string;
}

/** Match role code case-insensitively (config targetRole may be PROFESSOR, API code professor). */
export function findRoleByCode(
  roles: RoleCodeMatch[],
  code: string | undefined,
): RoleCodeMatch | undefined {
  if (!code?.trim()) return undefined;
  const needle = code.trim().toLowerCase();
  return roles.find((r) => r.code.toLowerCase() === needle);
}
