/**
 * Utility functions for formatting denormalized display names
 */

/**
 * Format a session display name for denormalization
 * @param sessionDate - The session date
 * @param startTime - The session start time (format: HH:MM:SS or HH:MM)
 * @returns Formatted string: "Séance du DD/MM/YYYY à HH:MM"
 */
export function formatSessionDisplayName(sessionDate: Date, startTime: string): string {
  const date = new Date(sessionDate);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  const timeStr = startTime.substring(0, 5); // Extract HH:MM
  
  return `Séance du ${day}/${month}/${year} à ${timeStr}`;
}

/**
 * Format a report display name for denormalization
 * @param sessionDate - The session date
 * @param startTime - The session start time (format: HH:MM:SS or HH:MM)
 * @returns Formatted string: "Rapport de la séance du DD/MM/YYYY à HH:MM"
 */
export function formatReportDisplayName(sessionDate: Date, startTime: string): string {
  const date = new Date(sessionDate);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  const timeStr = startTime.substring(0, 5); // Extract HH:MM
  
  return `Rapport de la séance du ${day}/${month}/${year} à ${timeStr}`;
}

/**
 * Format a user display name for denormalization
 * @param user - User object with displayName, firstName, and lastName
 * @returns Formatted user name or fallback
 */
export function formatUserDisplayName(user: {
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}): string {
  if (user.displayName) {
    return user.displayName;
  }
  
  const parts = [user.firstName, user.lastName].filter(Boolean);
  
  if (parts.length > 0) {
    return parts.join(' ');
  }
  
  return 'Utilisateur inconnu';
}

/**
 * Excel exports: calendar date as `yyyy-mm-dd` (UTC day from the stored instant).
 * Uses `toISOString().slice(0, 10)` so all export files share one format.
 */
export function formatExportDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/** French labels for user profile gender in Excel exports (aligns with app UI). */
export function formatProfileGenderForExport(gender: string | null | undefined): string {
  if (gender == null || String(gender).trim() === '') return '';
  const u = String(gender).trim().toUpperCase();
  if (u === 'M' || u === 'H' || u === 'HOMME' || u === 'MASCULIN' || u === 'MALE') return 'Homme';
  if (u === 'F' || u === 'FEMME' || u === 'FEMALE' || u === 'FÉMININ' || u === 'FEMININ') return 'Femme';
  if (u === 'O' || u === 'AUTRE' || u === 'OTHER') return 'Autre';
  return '';
}

const EDUCATION_CYCLE_LABEL_FR: Record<string, string> = {
  primary: 'Primaire',
  middle: 'Collège',
  high: 'Lycée',
  primaire: 'Primaire',
  college: 'Collège',
  lycee: 'Lycée',
};

/** Maps API cycle codes to French labels for Excel exports (subjects, levels). */
export function formatEducationCycleForExport(cycle: string | null | undefined): string {
  if (cycle == null || cycle === '') return '';
  const key = String(cycle).trim().toLowerCase();
  return EDUCATION_CYCLE_LABEL_FR[key] ?? cycle;
}
