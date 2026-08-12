import * as React from 'react';
import { useRoles } from '@/hooks/useRoles';
import { USER_ROLE_CONFIG, type UserRoleConfig, type UserRoleCode } from '@/lib/user-role-configs';
import type { Role } from '@/types/role.types';
import { Circle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import * as icons from 'lucide-react';

/**
 * Resolves a Lucide icon component from a role's `icon` string (e.g. 'Shield').
 * Falls back to Circle if the icon is not found.
 */
export function resolveLucideIcon(iconName: string | null | undefined): LucideIcon {
  if (!iconName) return Circle;
  const resolved = (icons as Record<string, unknown>)[iconName];
  return (resolved as LucideIcon) ?? Circle;
}

/**
 * Builds a UserRoleConfig-compatible object from a dynamic Role.
 */
export function roleToConfig(role: Role): UserRoleConfig {
  return {
    label: role.label,
    labelShort: role.label,
    icon: resolveLucideIcon(role.icon),
    // colorClass reçoit ici la valeur hex brute du rôle ;
    // les consommateurs qui attendent une classe CSS doivent utiliser role.color directement.
    colorClass: role.color ?? undefined,
  };
}

/**
 * Returns a merged role config map:
 * - Static entries from USER_ROLE_CONFIG (kept for backward compat)
 * - Dynamic entries from the roles API (keyed by UPPERCASE role code)
 *
 * Dynamic entries override static ones if codes match.
 */
export const useRoleConfig = (): Record<string, UserRoleConfig> => {
  const { data: roles = [] } = useRoles();

  return React.useMemo(() => {
    const staticEntries: Record<string, UserRoleConfig> = { ...USER_ROLE_CONFIG };

    for (const role of roles) {
      const key = role.code.toUpperCase();
      staticEntries[key] = roleToConfig(role);
    }

    return staticEntries;
  }, [roles]);
};

/**
 * Resolves a role label from the dynamic config.
 * Falls back to the static USER_ROLE_CONFIG, then the raw code.
 */
export const useRoleLabel = (roleCode: string | null | undefined, short = false): string => {
  const config = useRoleConfig();
  if (!roleCode) return 'Inconnu';
  const entry = config[roleCode.toUpperCase()];
  if (!entry) return roleCode;
  return short && entry.labelShort ? entry.labelShort : entry.label;
};

/**
 * Resolves a role icon from the dynamic config.
 */
export const useRoleIcon = (roleCode: string | null | undefined): LucideIcon => {
  const config = useRoleConfig();
  if (!roleCode) return Circle;
  return config[roleCode.toUpperCase()]?.icon ?? Circle;
};
