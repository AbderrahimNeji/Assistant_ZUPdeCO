/**
 * Utilitaires pour parser des dates string YYYY-MM-DD en timezone locale
 * sans conversion UTC (évite le décalage horaire dans les filtres).
 */

/**
 * Parse une date string YYYY-MM-DD en Date locale à 00:00:00.
 * Évite le parsing UTC de `new Date("YYYY-MM-DD")`.
 *
 * @example
 * parseLocalDate("2026-04-01") // → 1er avril 00:00:00 local (pas 31 mars 23:00)
 */
export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0);
}

/**
 * Parse une date string YYYY-MM-DD en Date locale à 23:59:59.999.
 * Utilisé pour les filtres "dateTo" (fin de journée inclusive).
 *
 * @example
 * parseLocalDateEndOfDay("2026-04-30") // → 30 avril 23:59:59.999 local
 */
export function parseLocalDateEndOfDay(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999);
}

/**
 * Civil calendar months strictly after `referenceDate` until end (end date exclusive of “elapsed” semantics),
 * with an extra −1month adjustment when end’s DOM < reference’s DOM — used for engagement end date (`engagement_end_date`) UX.
 *
 * `@param dateFinRaw` — PG `DATE` / `Date`, or prefix `YYYY-MM-DD` — local calendar parts only.
 */
export function computeRemainingCalendarMonthsUntilDate(
  dateFinRaw: Date | string | null | undefined,
  referenceDate: Date = new Date(),
): number {
  let y2: number;
  let m2: number;
  let d2: number;

  if (dateFinRaw == null) {
    return 0;
  }
  if (dateFinRaw instanceof Date) {
    if (Number.isNaN(dateFinRaw.getTime())) {
      return 0;
    }
    y2 = dateFinRaw.getFullYear();
    m2 = dateFinRaw.getMonth();
    d2 = dateFinRaw.getDate();
  } else {
    const matched = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateFinRaw).trim());
    if (!matched) {
      return 0;
    }
    y2 = Number(matched[1]);
    m2 = Number(matched[2]) - 1;
    d2 = Number(matched[3]);
    if (!y2 || Number.isNaN(m2) || !d2) {
      return 0;
    }
  }

  const tY = referenceDate.getFullYear();
  const tM = referenceDate.getMonth();
  const tD = referenceDate.getDate();

  const endComparable = y2 * 10000 + m2 * 100 + d2;
  const todayComparable = tY * 10000 + tM * 100 + tD;
  if (endComparable <= todayComparable) {
    return 0;
  }

  let months = (y2 - tY) * 12 + (m2 - tM);
  if (d2 < tD) {
    months -= 1;
  }
  return Math.max(0, months);
}

/**
 * Convertit une Date en string YYYY-MM-DD sans conversion UTC.
 * Évite le bug de décalage horaire avec `.toISOString().slice(0, 10)`.
 *
 * @example
 * toLocalDateString(new Date(2026, 3, 28)) // → "2026-04-28" (pas "2026-04-27" en UTC+1)
 * toLocalDateString("2026-04-28T10:00:00Z") // → "2026-04-28"
 */
export function toLocalDateString(date: Date | string): string {
  if (typeof date === 'string') return date.slice(0, 10);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}