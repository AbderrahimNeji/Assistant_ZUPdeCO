import type { ChatSourceAttribution, CopilotAnswerMode } from './copilot.api';

export type AnswerBadge = {
  mode: CopilotAnswerMode;
  label: string;
  emoji: string;
  title: string;
};

export function deriveAnswerMode(
  sources?: ChatSourceAttribution[] | null,
  explicit?: CopilotAnswerMode | null,
): CopilotAnswerMode | null {
  if (explicit) return explicit;
  if (!sources?.length) return null;

  const kinds = new Set(sources.map((s) => s.kind));
  const hasLive = kinds.has('application_db');
  const hasDocs =
    kinds.has('documentation_kb') || kinds.has('document_kb');
  const hasAttachment = kinds.has('conversation_attachment');

  if (hasLive && hasDocs) return 'hybrid';
  if (hasLive) return 'live_data';
  if (hasDocs) return 'documentation';
  if (hasAttachment) return 'attachment';
  return null;
}

export function answerBadgeFor(
  mode: CopilotAnswerMode | null | undefined,
): AnswerBadge | null {
  switch (mode) {
    case 'live_data':
      return {
        mode,
        label: 'Live Data',
        emoji: '🟢',
        title: 'Données métier / BI en direct',
      };
    case 'documentation':
      return {
        mode,
        label: 'Documentation',
        emoji: '📘',
        title: 'Documentation fonctionnelle (RAG)',
      };
    case 'hybrid':
      return {
        mode,
        label: 'Hybrid',
        emoji: '🧠',
        title: 'Faits métier + documentation',
      };
    case 'attachment':
      return {
        mode,
        label: 'Attachment',
        emoji: '📎',
        title: 'Fichier joint à la conversation',
      };
    default:
      return null;
  }
}

export function formatCitationLabel(source: ChatSourceAttribution): string {
  const parts: string[] = [source.label || source.document];
  if (source.chapter) parts.push(source.chapter);
  if (source.section && source.section !== source.chapter) {
    parts.push(source.section);
  }
  const pages =
    source.pages?.length
      ? source.pages
      : source.page
        ? [source.page]
        : [];
  if (pages.length) {
    parts.push(
      pages.length === 1 ? `p. ${pages[0]}` : `p. ${pages.join(', ')}`,
    );
  }
  if (source.version) parts.push(`v${source.version}`);
  return parts.join(' · ');
}
