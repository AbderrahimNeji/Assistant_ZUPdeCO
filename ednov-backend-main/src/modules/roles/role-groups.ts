/**
 * Compile-time enum for the role_group column on the roles table.
 * Includes both legacy values (super_admin, service_user) and new ones
 * so DTO validation stays in sync with the DB CHECK constraint.
 * → New code should use RoleGroupEntity for dynamic group data.
 */
export const ROLE_GROUPS = [
  'admins',
  'super_admin',
  'steering',
  'operations',
  'service_users',
  'service_user',
  'tutors',
  'volunteers',
  'students',
  'other',
] as const;

export type RoleGroup = (typeof ROLE_GROUPS)[number];

const KNOWN_CODE_TO_GROUP: Record<string, RoleGroup> = {
  admin: 'admins',
  coordinator: 'admins',
  manager: 'admins',
  professor: 'tutors',
  volunteer: 'volunteers',
  tutor: 'tutors',
  student: 'students',
};

/** Maps a role `code` (case-insensitive) to its default group; unknown codes → `other`. */
export function inferRoleGroupFromRoleCode(code: string): RoleGroup {
  const key = code.trim().toLowerCase();
  return KNOWN_CODE_TO_GROUP[key] ?? 'other';
}

/**
 * Default role groups seeded per company.
 * Colors use branding palette tokens resolved by the frontend via CSS variables.
 */
export const DEFAULT_ROLE_GROUPS: Array<{
  code: string;
  label: string;
  icon: string;
  color: string;
  sortOrder: number;
  isSystem: boolean;
}> = [
  { code: 'admins',       label: 'Administrateurs', icon: 'Shield',       color: 'color-2-nuance-1', sortOrder: 1,  isSystem: true  },
  { code: 'steering',     label: 'Pilotage',         icon: 'Compass',      color: 'color-1-nuance-1', sortOrder: 2,  isSystem: true  },
  { code: 'operations',   label: 'Opérations',       icon: 'Settings',     color: 'color-3-nuance-1', sortOrder: 3,  isSystem: true  },
  { code: 'service_users',label: 'Utilisateurs',     icon: 'Users',        color: 'color-2-nuance-2', sortOrder: 4,  isSystem: true  },
  { code: 'tutors',       label: 'Tuteurs',          icon: 'GraduationCap',color: 'color-2-nuance-1', sortOrder: 5,  isSystem: true  },
  { code: 'volunteers',   label: 'VSC',              icon: 'Heart',        color: 'color-3-nuance-1', sortOrder: 6,  isSystem: true  },
  { code: 'students',     label: 'Élèves',           icon: 'BookOpen',     color: 'color-1-nuance-2', sortOrder: 7,  isSystem: true  },
  { code: 'other',        label: 'Autres',           icon: 'Circle',       color: 'color-2-nuance-3', sortOrder: 99, isSystem: false },
];
