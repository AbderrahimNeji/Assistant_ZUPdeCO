import { Injectable } from '@nestjs/common';
import { DocumentKind } from '@prisma/client';

import { ErrorLogger } from '../../../common/logger/error-logger';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class RetrievalService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async search(
    userId: string,
    queryEmbedding: number[],
    topK = 5,
  ) {
    const start = performance.now();

    try {
      const chunks = await this.prisma.documentChunk.findMany({
        where: {
          document: {
            userId,
            // Official functional docs are retrieved via DocumentationKnowledgeSource.
            kind: DocumentKind.USER_UPLOAD,
          },
        },
        include: {
          document: true,
        },
      });

      const scored = chunks.map((chunk) => ({
        ...chunk,
        score: this.cosineSimilarity(
          queryEmbedding,
          chunk.embedding as number[],
        ),
      }));

      scored.sort((a, b) => b.score - a.score);

      const results = scored.slice(0, topK).map((chunk) => ({
        content: chunk.content,
        score: chunk.score,
        page: chunk.page,
        chunkIndex: chunk.chunkIndex,
        documentId: chunk.documentId,
        documentName: chunk.document.name,
      }));

      ErrorLogger.logDuration(
        'RetrievalService.search',
        performance.now() - start,
        { userId, topK, resultCount: results.length },
      );

      return results;
    } catch (error) {
      ErrorLogger.log(error, 'RetrievalService.search', {
        userId,
        topK,
      });
      throw error;
    }
  }
}
