/**
 * Student user from GET /users/students.
 *
 * **Privacy:** show `displayName` in UI only. Do not render `firstName` / `lastName`.
 */
export interface Student {
  id: string;
  /** Public label (pseudonym / masked name). Primary field for lists and headers. */
  displayName?: string | null;
  /** Internal — not for display under privacy policy. */
  firstName?: string;
  lastName?: string;
  /** Academic level (e.g. userProfiles[0].level.label). Shown in lists. */
  levelLabel?: string | null;
  /** Programme (e.g. "Terminale") when API sends it; also used as filter chip fallback. */
  program?: string | null;
}
