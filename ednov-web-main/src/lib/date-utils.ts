/**
 * Utilitaire pour sérialiser des dates en timezone locale (format YYYY-MM-DD)
 * sans conversion UTC (évite le décalage horaire dans les API params).
 */

/**
 * Convertit une Date en string YYYY-MM-DD en timezone locale.
 * Évite .toISOString() qui convertit en UTC.
 *
 * @example
 * toLocalDateString(new Date(2026, 3, 1)) // → "2026-04-01" (pas "2026-03-31")
 */
export function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Ajoute un nombre de jours à une date au format YYYY-MM-DD.
 * Retourne undefined si la date source est vide/invalide.
 *
 * @example
 * addDaysToDateString('2026-04-01', 1) // → "2026-04-02"
 * addDaysToDateString('', 1) // → undefined
 */
export function addDaysToDateString(
  dateString: string | undefined,
  days: number,
): string | undefined {
  if (!dateString) return undefined;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return undefined;
  date.setDate(date.getDate() + days);
  return toLocalDateString(date);
}
