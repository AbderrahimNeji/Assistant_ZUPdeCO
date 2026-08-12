const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuidToken(s: string): boolean {
  return s.length === 36 && UUID_RE.test(s);
}

export type ParsedReportSubject = { type: 'ids'; ids: string[] } | { type: 'legacy'; text: string };

/** Décode le champ `subject` d’un compte rendu (idéalement des UUIDs séparés par des virgules). */
export function parseReportSubjectField(raw: string | null | undefined): ParsedReportSubject {
  const t = raw?.trim() ?? '';
  if (!t) return { type: 'ids', ids: [] };
  const parts = t
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length > 0 && parts.every((p) => isUuidToken(p))) {
    return { type: 'ids', ids: parts };
  }
  return { type: 'legacy', text: t };
}

/** Chaîne de validation (maxLength) / ancien fil ; préférer le champ API `subjectIds` pour la persistance. */
export function serializeReportSubjectFromIds(ids: string[]): string {
  return ids.filter(Boolean).join(',');
}
