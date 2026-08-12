import { KnowledgeSnippet, KnowledgeSourceId } from './knowledge.types';

export type ChatSourceKind =
  | 'conversation_attachment'
  | 'document_kb'
  | 'documentation_kb'
  | 'application_db';

/**
 * Public source attribution for the chat UI.
 * Never includes retrieved text, prompts, or internal scores.
 */
export type ChatSourceAttribution = {
  kind: ChatSourceKind;
  /** Friendly display label (no emoji). */
  label: string;
  /** Suggested emoji for the UI. */
  icon: string;
  /** Application DB provider id when kind === application_db. */
  providerId?: string;
  /** Contributing page numbers when known. */
  pages?: number[];
  chapter?: string;
  section?: string;
  /**
   * Backward-compatible fields (older clients).
   * `document` mirrors `label`; `page` is the first page when pages exist.
   */
  document: string;
  page?: number;
  /** Documentation revision label when available. */
  version?: string;
  /** Truncated content hash for citation provenance. */
  contentHash?: string;
  /** ISO ingestion timestamp. */
  ingestedAt?: string;
};

const APPLICATION_PROVIDER_META: Record<
  string,
  { label: string; icon: string }
> = {
  user_profile: { label: 'User Profile', icon: '👤' },
  course: { label: 'Courses Database', icon: '🎓' },
  tutor: { label: 'Tutors', icon: '🧑‍🏫' },
  student: { label: 'Students', icon: '🎓' },
  registration: { label: 'Registration Records', icon: '📋' },
  program: { label: 'Programs', icon: '🧭' },
  faq: { label: 'FAQ Knowledge Base', icon: '❓' },
  policy: { label: 'Policies', icon: '📜' },
  business_intelligence: { label: 'Business Intelligence', icon: '📊' },
  documentation: { label: 'Functional Documentation', icon: '📘' },
};

function uniqueSortedPages(pages: Array<number | undefined>): number[] {
  return [
    ...new Set(
      pages.filter(
        (page): page is number =>
          typeof page === 'number' && Number.isFinite(page) && page > 0,
      ),
    ),
  ].sort((a, b) => a - b);
}

function resolveApplicationMeta(providerId: string): {
  label: string;
  icon: string;
} {
  const known = APPLICATION_PROVIDER_META[providerId];
  if (known) return known;

  const fallback = providerId
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  return {
    label: fallback || 'Application data',
    icon: '🗄️',
  };
}

function attributionFromGroup(
  kind: ChatSourceKind,
  label: string,
  icon: string,
  pages: number[] | undefined,
  extras?: {
    providerId?: string;
    chapter?: string;
    section?: string;
    version?: string;
    contentHash?: string;
    ingestedAt?: string;
  },
): ChatSourceAttribution {
  return {
    kind,
    label,
    icon,
    providerId: extras?.providerId,
    pages: pages?.length ? pages : undefined,
    chapter: extras?.chapter,
    section: extras?.section,
    document: label,
    page: pages?.length ? pages[0] : undefined,
    version: extras?.version,
    contentHash: extras?.contentHash,
    ingestedAt: extras?.ingestedAt,
  };
}

/**
 * Build user-facing source attribution from retrieval snippets.
 * Only includes sources that actually contributed context.
 */
export function buildSourceAttributions(
  snippets: KnowledgeSnippet[],
  providersUsed: string[] = [],
): ChatSourceAttribution[] {
  const bySource: Record<KnowledgeSourceId, KnowledgeSnippet[]> = {
    conversation_attachments: [],
    document_kb: [],
    documentation_kb: [],
    application_db: [],
  };

  for (const snippet of snippets) {
    bySource[snippet.source].push(snippet);
  }

  const attributions: ChatSourceAttribution[] = [];

  const attachmentsByName = new Map<string, KnowledgeSnippet[]>();
  for (const snippet of bySource.conversation_attachments) {
    const key = snippet.title.trim() || 'Attachment';
    const existing = attachmentsByName.get(key) ?? [];
    existing.push(snippet);
    attachmentsByName.set(key, existing);
  }

  for (const [name, group] of attachmentsByName) {
    const pages = uniqueSortedPages(group.map((snippet) => snippet.page));
    // Attachments currently default page to 1 when unknown — omit that noise.
    const meaningfulPages =
      pages.length === 1 && pages[0] === 1 ? undefined : pages;

    attributions.push(
      attributionFromGroup(
        'conversation_attachment',
        name,
        '📄',
        meaningfulPages,
      ),
    );
  }

  // Official functional documentation is built-in product knowledge:
  // retrieved for answering, but never exposed as a user-facing citation.

  const documentsByTitle = new Map<string, KnowledgeSnippet[]>();
  for (const snippet of bySource.document_kb) {
    const key = snippet.title.trim() || 'Document';
    const existing = documentsByTitle.get(key) ?? [];
    existing.push(snippet);
    documentsByTitle.set(key, existing);
  }

  for (const [title, group] of documentsByTitle) {
    const pages = uniqueSortedPages(group.map((snippet) => snippet.page));
    attributions.push(attributionFromGroup('document_kb', title, '📄', pages));
  }

  const providerIds = [
    ...new Set([
      ...providersUsed,
      ...bySource.application_db
        .map((snippet) => snippet.providerId)
        .filter((id): id is string => Boolean(id)),
      ...bySource.application_db
        .map((snippet) => {
          const match = /^application:(.+)$/.exec(snippet.title);
          return match?.[1];
        })
        .filter((id): id is string => Boolean(id)),
    ]),
  ];

  for (const providerId of providerIds) {
    const meta = resolveApplicationMeta(providerId);
    attributions.push(
      attributionFromGroup(
        'application_db',
        meta.label,
        meta.icon,
        undefined,
        { providerId },
      ),
    );
  }

  return attributions;
}
