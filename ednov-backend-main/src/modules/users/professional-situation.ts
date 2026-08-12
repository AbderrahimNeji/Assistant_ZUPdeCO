/**
 * Valeurs persistées en anglais (PostgreSQL `professional_situation_enum`).
 * Aligné sur le style `user-status.ts` : const + type dérivé.
 */
export const PROFESSIONAL_SITUATION_VALUES = ['employee', 'student', 'retired'] as const;

export type ProfessionalSituation = (typeof PROFESSIONAL_SITUATION_VALUES)[number];
