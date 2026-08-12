/**
 * Shared parser for session script (tuteur/élève turns).
 * Used by the full script screen and the AI results preview.
 */

export type Speaker = 'tuteur' | 'eleve' | 'unknown';

export interface ScriptTurn {
  speaker: Speaker;
  label: string;
  text: string;
}

const TUTEUR_RE = /tuteur|professeur|\bprof\b|teacher|enseignant/i;
const ELEVE_RE = /él[eè]ve|student|[eé]tudiant|apprenant|élève/i;

export function classifySpeaker(label: string): Speaker {
  if (TUTEUR_RE.test(label)) return 'tuteur';
  if (ELEVE_RE.test(label)) return 'eleve';
  return 'unknown';
}

export function parseScriptTurns(raw: string): ScriptTurn[] {
  const normalized = raw
    .replaceAll(/\*\*([^*]+)\*\*/g, '$1')
    .replaceAll(/\*([^*]+)\*/g, '$1')
    .replaceAll(/^#{1,6}\s*/gm, '');

  const lines = normalized.split('\n');
  const turns: ScriptTurn[] = [];

  let currentLabel = '';
  let currentSpeaker: Speaker = 'unknown';
  let buffer: string[] = [];

  const flush = () => {
    const text = buffer
      .join('\n')
      .replaceAll(/\n{3,}/g, '\n\n')
      .trim();
    if (text) turns.push({ speaker: currentSpeaker, label: currentLabel, text });
    buffer = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const m =
      /^\[?([^\]:]{1,30})\]?\s*:\s*(.*)$/.exec(trimmed) ||
      /^\[?([^\]-]{1,30})\]?\s*-\s*(.*)$/.exec(trimmed) ||
      /^\[([^\]]{1,30})\]\s*(.*)$/.exec(trimmed);
    if (m) {
      const candidateLabel = m[1].trim();
      const rest = m[2].trim();
      const candidateSpeaker = classifySpeaker(candidateLabel);

      const looksLikeRole =
        candidateLabel.length >= 2 &&
        candidateLabel.length < 28 &&
        !/^\d/.test(candidateLabel);

      if (looksLikeRole && candidateSpeaker !== 'unknown') {
        if (candidateLabel !== currentLabel || candidateSpeaker !== currentSpeaker) {
          flush();
          currentLabel = candidateLabel;
          currentSpeaker = candidateSpeaker;
        }
        if (rest) buffer.push(rest);
        continue;
      }
    }
    buffer.push(trimmed);
  }
  flush();
  return turns;
}
