import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RetrievalService } from '../../documents/services/retrieval.service';
import {
  KnowledgeRetrieveInput,
  KnowledgeSnippet,
  KnowledgeSource,
} from '../knowledge.types';

const DEFAULT_RAG_SIMILARITY_THRESHOLD = 0.75;

/**
 * Permanent user knowledge-base documents (indexed embeddings).
 */
@Injectable()
export class DocumentKnowledgeSource implements KnowledgeSource {
  readonly id = 'document_kb' as const;
  private readonly similarityThreshold: number;

  constructor(
    private readonly retrievalService: RetrievalService,
    private readonly configService: ConfigService,
  ) {
    const configured = this.configService.get<string>(
      'RAG_SIMILARITY_THRESHOLD',
    );
    const parsed = configured ? Number(configured) : NaN;
    this.similarityThreshold = Number.isFinite(parsed)
      ? parsed
      : DEFAULT_RAG_SIMILARITY_THRESHOLD;
  }

  async retrieve(input: KnowledgeRetrieveInput): Promise<KnowledgeSnippet[]> {
    const chunks = await this.retrievalService.search(
      input.userId,
      input.queryEmbedding,
      input.topK ?? 5,
    );

    if (!chunks.length) {
      return [];
    }

    const topScore = Math.max(...chunks.map((chunk) => chunk.score));
    if (topScore < this.similarityThreshold) {
      return [];
    }

    return chunks.map((chunk) => ({
      source: this.id,
      title: chunk.documentName,
      content: chunk.content,
      score: chunk.score,
      page: chunk.page,
    }));
  }
}
