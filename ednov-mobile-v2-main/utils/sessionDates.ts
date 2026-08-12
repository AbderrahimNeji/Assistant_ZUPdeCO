import type { ColorPalette } from '@/providers/BrandingProvider';
import type { Session, SessionStatus } from '@/types/session';

/** Accent affichage pour séances au statut « Clôturée » (remplace le bleu info). */
export const SESSION_CLOSED_ACCENT_COLOR = '#7C3AED';

export type SessionStatusColorKey = 'warning' | 'success' | 'danger' | 'info' | 'closed';

/** Display label for session status. */
export function getSessionStatusLabel(status: SessionStatus | null | undefined): string {
  switch (status) {
    case 'planned':
      return 'Planifiée';
    case 'in_progress':
      return 'En cours';
    case 'completed':
      return 'Terminée';
    case 'closed':
      return 'Clôturée';
    case 'cancelled':
      return 'Annulée';
    default:
      return 'Planifiée';
  }
}

/** Color key for status badge / accents (closed → violet dédié). */
export function getSessionStatusColor(status: SessionStatus | null | undefined): SessionStatusColorKey {
  switch (status) {
    case 'in_progress':
      return 'warning';
    case 'completed':
      return 'success';
    case 'closed':
      return 'closed';
    case 'cancelled':
      return 'danger';
    case 'planned':
    default:
      return 'info';
  }
}

/** Couleur d’affichage finale (palette marque + violet pour clôturée). */
export function getSessionStatusResolvedColor(key: SessionStatusColorKey, colors: ColorPalette): string {
  switch (key) {
    case 'closed':
      return SESSION_CLOSED_ACCENT_COLOR;
    case 'warning':
      return colors.warning;
    case 'success':
      return colors.success;
    case 'danger':
      return colors.danger;
    case 'info':
    default:
      return colors.info;
  }
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns the next upcoming session (date >= start of today), or null if none.
 */
export function getNextSession(sessions: Session[]): Session | null {
  const today = startOfToday().getTime();
  const upcoming = sessions
    .filter((s) => new Date(s.date).getTime() >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return upcoming[0] ?? null;
}

/**
 * Returns a Set of date strings (YYYY-MM-DD) that have at least one session.
 */
export function getSessionDatesSet(sessions: Session[]): Set<string> {
  const set = new Set<string>();
  for (const s of sessions) {
    const d = new Date(s.date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    set.add(`${y}-${m}-${day}`);
  }
  return set;
}

/** Marked date entry for react-native-calendars (session days as selected pill). */
export type MarkedDateEntry = {
  selected?: boolean;
  selectedColor?: string;
  selectedTextColor?: string;
  marked?: boolean;
  dotColor?: string;
};

/**
 * Build markedDates for react-native-calendars: days with sessions appear as
 * selected pills (filled oval) using selectedColor; optional dot when marked.
 */
export function buildMarkedDates(
  sessions: Session[],
  selectedColor: string,
  selectedTextColor: string = '#ffffff'
): Record<string, MarkedDateEntry> {
  const set = getSessionDatesSet(sessions);
  const out: Record<string, MarkedDateEntry> = {};
  for (const dateStr of set) {
    out[dateStr] = {
      selected: true,
      selectedColor,
      selectedTextColor,
      marked: false,
    };
  }
  return out;
}
