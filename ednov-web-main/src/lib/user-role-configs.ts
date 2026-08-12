import { Heart, GraduationCap, BookOpen, Users, Compass, Briefcase } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface UserRoleConfig {
  label: string;
  labelShort?: string;
  icon: LucideIcon;
  colorClass?: string;
}

export type UserRoleCode = 'VOLUNTEER' | 'COORDINATOR' | 'MANAGER' | 'STUDENT' | 'TUTOR';

export const USER_ROLE_CONFIG: Record<string, UserRoleConfig> = {
  VOLUNTEER: {
    label: 'VSC',
    labelShort: 'VSC',
    icon: Heart,
    colorClass: 'var(--color-2-nuance-1)',
  },
  COORDINATOR: {
    label: 'Coordinateur',
    labelShort: 'Coord.',
    icon: Compass,
    colorClass: 'var(--color-1-nuance-1)',
  },
  MANAGER: {
    label: 'Manager',
    labelShort: 'Manager',
    icon: Briefcase,
    colorClass: 'var(--color-3-nuance-1)',
  },
  STUDENT: {
    label: 'Élève',
    labelShort: 'Élève',
    icon: BookOpen,
    colorClass: 'var(--color-2-nuance-1)',
  },
  TUTOR: {
    label: 'Tuteur',
    labelShort: 'Tuteur',
    icon: GraduationCap,
    colorClass: 'var(--color-2-nuance-1)',
  },
};

export function getUserRoleLabel(roleCode: string, short: boolean = false): string {
  const config = USER_ROLE_CONFIG[roleCode];
  if (!config) return roleCode;
  return short && config.labelShort ? config.labelShort : config.label;
}
