import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { EmbeddingService } from '../../documents/services/embedding.service';
import {
  KnowledgeRetrieveInput,
  KnowledgeSnippet,
  KnowledgeSource,
} from '../knowledge.types';
import { DocumentationCitationService } from './documentation-citation.service';
import { DocumentationRetrievalService } from './documentation-retrieval.service';
import { expandDocumentationQuery } from './documentation-query-expand';

const DEFAULT_DOC_SIMILARITY_THRESHOLD = 0.42;

/**
 * Official ZupdeCo functional documentation knowledge source (shared RAG).
 * Distinct from user-uploaded DocumentKnowledgeSource.
 */
@Injectable()
export class DocumentationKnowledgeSource implements KnowledgeSource {
  readonly id = 'documentation_kb' as const;
  private readonly similarityThreshold: number;

  constructor(
    private readonly retrieval: DocumentationRetrievalService,
    private readonly citations: DocumentationCitationService,
    private readonly embeddings: EmbeddingService,
    private readonly configService: ConfigService,
  ) {
    const configured = this.configService.get<string>(
      'DOCUMENTATION_SIMILARITY_THRESHOLD',
    );
    const parsed = configured ? Number(configured) : NaN;
    this.similarityThreshold = Number.isFinite(parsed)
      ? parsed
      : DEFAULT_DOC_SIMILARITY_THRESHOLD;
  }

  async retrieve(input: KnowledgeRetrieveInput): Promise<KnowledgeSnippet[]> {
    const expanded = expandDocumentationQuery(input.query);
    const queryEmbedding =
      expanded === input.query
        ? input.queryEmbedding
        : await this.embeddings.embed(expanded);

    const hits = await this.retrieval.search(
      expanded,
      queryEmbedding,
      input.topK ?? 12,
    );

    if (!hits.length) {
      return [];
    }

    const topScore = Math.max(...hits.map((hit) => hit.score));
    if (topScore < this.similarityThreshold) {
      return [];
    }

    return hits.map((hit) =>
      this.citations.enrichSnippet(hit, this.id),
    );
  }
}
