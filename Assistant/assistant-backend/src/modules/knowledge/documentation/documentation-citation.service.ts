import { Injectable } from '@nestjs/common';

import type { KnowledgeSnippet } from '../knowledge.types';
import type {
  DocumentationCitation,
  DocumentationHit,
} from './documentation.types';

/**
 * Builds citation labels for documentation RAG (document / chapter / section / page).
 * Never invents business rules — only formats retrieved metadata.
 */
@Injectable()
export class DocumentationCitationService {
  formatSnippetTitle(hit: DocumentationHit): string {
    const parts = [hit.documentName];
    if (hit.chapter) parts.push(hit.chapter);
    if (hit.section && hit.section !== hit.chapter) parts.push(hit.section);
    return parts.join(' › ');
  }

  formatContextBlock(hit: DocumentationHit): string {
    // Present as product knowledge for the model — do not encourage user-facing citations.
    const topic = [hit.chapter, hit.section, hit.title]
      .filter(Boolean)
      .filter((value, index, all) => all.indexOf(value) === index)
      .join(' › ');

    const header = topic
      ? `--- Product knowledge: ${topic} ---`
      : '--- Product knowledge ---';

    return `${header}\n${hit.content}`;
  }

  toCitations(hits: DocumentationHit[]): DocumentationCitation[] {
    return hits.map((hit) => ({
      document: hit.documentName,
      chapter: hit.chapter ?? undefined,
      section: hit.section ?? undefined,
      page: hit.page,
      title: hit.title ?? undefined,
      version: hit.version ?? undefined,
      contentHash: hit.contentHash ?? undefined,
      ingestedAt: hit.ingestedAt ?? undefined,
    }));
  }

  enrichSnippet(
    hit: DocumentationHit,
    source: KnowledgeSnippet['source'],
  ): KnowledgeSnippet {
    return {
      source,
      title: this.formatSnippetTitle(hit),
      content: this.formatContextBlock(hit),
      score: hit.score,
      page: hit.page,
      chapter: hit.chapter ?? undefined,
      section: hit.section ?? undefined,
      documentName: hit.documentName,
      providerId: 'documentation',
      version: hit.version ?? undefined,
      contentHash: hit.contentHash ?? undefined,
      ingestedAt: hit.ingestedAt ?? undefined,
    };
  }
}
