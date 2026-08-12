/**
 * Normalize conversational input for language-agnostic small-talk matching.
 * - lowercase, trim, collapse spaces
 * - strip emojis / punctuation
 * - remove diacritics (merci, ça va, à bientôt → merci, ca va, a bientot)
 */
export function normalizeSmallTalkInput(message: string): string {
  return message
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Escape a phrase for exact whole-string regex matching. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * True when the normalized message equals one of the phrases
 * (standalone — no leftover knowledge/action content).
 */
export function matchesAnyPhrase(
  normalized: string,
  phrases: string[],
): boolean {
  if (!normalized) return false;
  const set = new Set(phrases.map((phrase) => normalizeSmallTalkInput(phrase)));
  return set.has(normalized);
}

export function pickRandom(options: string[]): string {
  if (options.length === 0) return '';
  if (options.length === 1) return options[0];
  const index = Math.floor(Math.random() * options.length);
  return options[index] ?? options[0];
}

/** Prefer a reply that is not identical to the previous one. */
export function pickRandomAvoiding(
  options: string[],
  previous?: string | null,
): string {
  if (options.length === 0) return '';
  if (options.length === 1) return options[0];
  const pool =
    previous && options.length > 1
      ? options.filter((item) => item !== previous)
      : options;
  return pickRandom(pool.length ? pool : options);
}
