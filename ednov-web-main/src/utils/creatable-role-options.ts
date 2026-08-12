import { findRoleByCode, type RoleCodeMatch } from './find-role-by-code';

/** Options MultiSelect : value = role.id (aligné CreateAdminView). */
export function buildCreatableRoleOptions(
  creatableRoles: Array<{ value: string; label: string }>,
  roles: RoleCodeMatch[],
): Array<{ value: string; label: string }> {
  return creatableRoles
    .map((creatable) => {
      const fullRole = findRoleByCode(roles, creatable.value);
      return {
        value: fullRole?.id ?? '',
        label: fullRole?.label ?? creatable.label,
      };
    })
    .filter((opt) => opt.value);
}
