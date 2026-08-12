/**
 * Clean extracted PDF text for indexing (no invented content).
 */
export function cleanDocumentationText(raw: string): string {
  return raw
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/●/g, '•')
    .replace(/○/g, '◦')
    .trim();
}

/**
 * Extract light keyword tokens from a heading / body for hybrid search.
 */
export function extractKeywords(
  ...parts: Array<string | null | undefined>
): string[] {
  const stop = new Set([
    'les',
    'des',
    'une',
    'un',
    'le',
    'la',
    'de',
    'du',
    'et',
    'en',
    'au',
    'aux',
    'pour',
    'dans',
    'sur',
    'avec',
    'par',
    'qui',
    'que',
    'est',
    'sont',
    'the',
    'and',
    'for',
    'with',
    'from',
    'this',
    'that',
    'dans',
  ]);

  const tokens = parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/[\s/-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2 && !stop.has(t));

  return [...new Set(tokens)].slice(0, 24);
}
