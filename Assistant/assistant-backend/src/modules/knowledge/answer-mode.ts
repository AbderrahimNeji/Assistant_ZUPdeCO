import type { ChatSourceAttribution } from './source-attribution';

export type AnswerMode =
  | 'live_data'
  | 'documentation'
  | 'hybrid'
  | 'attachment';

/**
 * Derive a single answer-mode badge from source attributions.
 * Pure helper — safe for finishTurn and unit tests.
 */
export function deriveAnswerMode(
  sources: ChatSourceAttribution[] | undefined | null,
): AnswerMode | undefined {
  if (!sources?.length) return undefined;

  const kinds = new Set(sources.map((s) => s.kind));
  const hasLive = kinds.has('application_db');
  const hasDocs =
    kinds.has('documentation_kb') || kinds.has('document_kb');
  const hasAttachment = kinds.has('conversation_attachment');

  if (hasLive && hasDocs) return 'hybrid';
  if (hasLive) return 'live_data';
  if (hasDocs) return 'documentation';
  if (hasAttachment) return 'attachment';
  return undefined;
}
