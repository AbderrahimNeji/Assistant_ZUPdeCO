export type NotificationBadgeDisplay =
  | { kind: 'exact'; text: string }
  | { kind: 'capped' };

/** 1–9 tel quel ; à partir de 10, afficher 9 avec un « + » mis en avant. */
export function getNotificationBadgeDisplay(count: number): NotificationBadgeDisplay {
  if (count >= 10) return { kind: 'capped' };
  return { kind: 'exact', text: String(count) };
}

/** Libellé texte simple (filtres, libellés sans style distinct du « + »). */
export function formatNotificationBadgeCount(count: number): string {
  const display = getNotificationBadgeDisplay(count);
  if (display.kind === 'capped') return '9+';
  return display.text;
}