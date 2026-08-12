import type { Student } from '@/types/student';

/** Shown when the API provides no public display name (privacy — never use legal names in UI). */
export const GENERIC_STUDENT_DISPLAY_LABEL = 'Élève';

export const STUDENT_DISPLAY_PRIVACY_TOOLTIP =
  "Les noms affichés sont des pseudonymes ou identifiants publics, pas les noms civils. Ils protègent la vie privée des élèves.";

export const GENERIC_STUDENT_ROW_TOOLTIP =
  'Aucun pseudonyme public n’est renseigné : le libellé « Élève » remplace le nom. Le suivi pédagogique reste identique.';

export function isGenericStudentDisplayName(name: string): boolean {
  return name === GENERIC_STUDENT_DISPLAY_LABEL;
}

/** Public label for UI — never use firstName/lastName for display (privacy). */
export function getStudentDisplayName(student: Student): string {
  const d = (student.displayName ?? '').trim();
  if (d.length > 0) return d;
  return GENERIC_STUDENT_DISPLAY_LABEL;
}

/**
 * Avatar initials derived from displayName only (two words → two letters; one word → up to two chars).
 */
export function getStudentInitials(student: Student): string {
  const name = (student.displayName ?? '').trim();
  if (!name) return '?';
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const a = words[0].charAt(0);
    const b = words[1].charAt(0);
    return `${a}${b}`.toUpperCase();
  }
  const w = words[0] ?? name;
  if (w.length >= 2) return w.slice(0, 2).toUpperCase();
  return w.charAt(0).toUpperCase() || '?';
}

/** Seed for deterministic avatar color without using legal names. */
export function getStudentAvatarSeed(student: Student): string {
  const d = (student.displayName ?? '').trim();
  if (d.length > 0) return d;
  return student.id;
}
