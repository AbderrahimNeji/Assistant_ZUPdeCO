/**
 * Statuts `users.status` : élève (registered | accompanied | deactivated) vs staff (active | deactivated).
 * Plus de `suspended` sur les utilisateurs — remplacé par `deactivated`.
 * PostgreSQL : VARCHAR + CHECK — ce module est la source de vérité API/TS.
 */

/** Parcours élève uniquement */
export const STUDENT_ACCOUNT_STATUS_VALUES = ['registered', 'accompanied', 'deactivated'] as const;

/** Comptes sans rôle élève : désactivation = `deactivated` (plus `suspended`) */
export const STAFF_ACCOUNT_STATUS_VALUES = ['active', 'deactivated'] as const;

/** Union distincte (évite le doublon `deactivated`) */
export const USER_ACCOUNT_STATUS_VALUES = [
  'registered',
  'accompanied',
  'deactivated',
  'active',
] as const;

export type StudentAccountStatus = (typeof STUDENT_ACCOUNT_STATUS_VALUES)[number];
export type StaffAccountStatus = (typeof STAFF_ACCOUNT_STATUS_VALUES)[number];
export type UserStatus = (typeof USER_ACCOUNT_STATUS_VALUES)[number];

/** VSC (bénévoles) : compte opérationnel = `active` */
export const VSC_USER_ACCOUNT_STATUSES = ['active'] as const;

export function isStudentAccountStatus(value: unknown): value is StudentAccountStatus {
  return (
    typeof value === 'string' &&
    (STUDENT_ACCOUNT_STATUS_VALUES as readonly string[]).includes(value)
  );
}

/** Libellés FR pour export / affichage (alignés Ednov-web STUDENT_STATUS_CONFIG). */
const STUDENT_ACCOUNT_STATUS_LABEL_FR: Record<StudentAccountStatus, string> = {
  registered: 'Inscrit',
  accompanied: 'Accompagné',
  deactivated: 'Désactivé',
};

/** Codes API → libellé français ; valeur inconnue renvoyée telle quelle. */
export function formatStudentAccountStatusLabelFr(status: string): string {
  if (isStudentAccountStatus(status)) {
    return STUDENT_ACCOUNT_STATUS_LABEL_FR[status];
  }
  return status;
}

export function isStaffAccountStatus(value: unknown): value is StaffAccountStatus {
  return (
    typeof value === 'string' && (STAFF_ACCOUNT_STATUS_VALUES as readonly string[]).includes(value)
  );
}

export function isUserAccountStatus(value: unknown): value is UserStatus {
  return typeof value === 'string' && (USER_ACCOUNT_STATUS_VALUES as readonly string[]).includes(value);
}

/** Si `hasStudentRole`, seuls les statuts élève ; sinon active | deactivated (staff). */
export function statusMatchesRoleModel(hasStudentRole: boolean, status: UserStatus): boolean {
  return hasStudentRole ? isStudentAccountStatus(status) : isStaffAccountStatus(status);
}

/** Cible de réactivation affichée sur GET /users/:id */
export type ReactivationTargetStatus = 'registered' | 'accompanied' | 'active';

/** Origine d’une transition de statut élève (audit + student_status_history). */
export type UserStatusChangeSource =
  | 'patch'
  | 'role_coerce'
  | 'csv_import'
  | 'reactivate'
  | 'auto_present_sessions';
