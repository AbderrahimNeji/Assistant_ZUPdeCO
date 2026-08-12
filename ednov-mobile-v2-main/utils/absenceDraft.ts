import type { SessionParticipant } from '@/types/session';

import { AUTRE_MOTIF } from '@/utils/attendanceValidation';

export { AUTRE_MOTIF };

/**
 * Motifs d'absence — alignés sur le web (`Ednov-web/src/constants/attendance.constants.ts`).
 * Tuteurs/bénévoles et élèves ont des listes différentes.
 */
export const TUTOR_ABSENCE_MOTIF_OPTIONS = [
  'Imprévu personnel',
  'Imprévu professionnel',
  'Congé',
  'Problème technique',
  'Commun accord',
  AUTRE_MOTIF,
] as const;

export const STUDENT_ABSENCE_MOTIF_OPTIONS = [
  'Imprévu personnel',
  'Maladie',
  'Problème technique',
  'Commun accord',
  AUTRE_MOTIF,
] as const;

/** Liste des motifs proposés en fonction du rôle du participant. */
export function getAbsenceMotifOptionsForRole(
  role: SessionParticipant['role'],
): readonly string[] {
  if (role === 'student') return STUDENT_ABSENCE_MOTIF_OPTIONS;
  return TUTOR_ABSENCE_MOTIF_OPTIONS;
}

/** Union de tous les motifs connus — utilisée pour reconnaître une valeur déjà stockée. */
const ALL_KNOWN_MOTIFS: readonly string[] = Array.from(
  new Set<string>([...TUTOR_ABSENCE_MOTIF_OPTIONS, ...STUDENT_ABSENCE_MOTIF_OPTIONS]),
);

/** @deprecated — utiliser `getAbsenceMotifOptionsForRole(role)` à la place. Conservé pour compat. */
export const ABSENCE_MOTIF_OPTIONS = TUTOR_ABSENCE_MOTIF_OPTIONS;

export type AbsenceDraft = {
  motif: string;
  comment: string;
};

export function resolveStoredMotifSelection(justification: string): string {
  if (!justification) return '';
  if (ALL_KNOWN_MOTIFS.includes(justification)) return justification;
  if (justification === AUTRE_MOTIF || justification.startsWith(`${AUTRE_MOTIF}: `)) {
    return AUTRE_MOTIF;
  }
  return AUTRE_MOTIF;
}

export function draftFromParticipant(p: SessionParticipant): AbsenceDraft {
  return {
    motif: resolveStoredMotifSelection((p.absenceJustification ?? '').trim()),
    comment: (p.absenceComment ?? '').trim(),
  };
}

export function resolveDraftForParticipant(
  p: SessionParticipant,
  selectedMotif: Record<string, string>,
  commentaire: Record<string, string>,
): AbsenceDraft {
  const motif =
    p.id in selectedMotif
      ? (selectedMotif[p.id] ?? '').trim()
      : resolveStoredMotifSelection((p.absenceJustification ?? '').trim());
  const comment =
    p.id in commentaire ? (commentaire[p.id] ?? '').trim() : (p.absenceComment ?? '').trim();
  return { motif, comment };
}

export function isSameAbsenceDraft(p: SessionParticipant, draft: AbsenceDraft): boolean {
  const saved = draftFromParticipant(p);
  return (
    p.attendanceStatus === 'absent' &&
    saved.motif === draft.motif.trim() &&
    saved.comment === draft.comment.trim()
  );
}

export function validateAbsenceDraft(draft: AbsenceDraft): string | null {
  const motif = draft.motif.trim();
  if (!motif) return "Un motif d'absence est requis";
  return null;
}
