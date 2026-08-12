import { Injectable } from '@nestjs/common';
import { DocumentStatus } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class DocumentStorageService {
  constructor(private readonly prisma: PrismaService) {}

  async createProcessingDocument(input: {
    userId: string;
    name: string;
    mimeType: string;
    size: number;
    rawText: string;
    pageCount: number | null;
  }) {
    return this.prisma.document.create({
      data: {
        name: input.name,
        mimeType: input.mimeType,
        size: input.size,
        userId: input.userId,
        status: DocumentStatus.PROCESSING,
        rawText: input.rawText,
        pageCount: input.pageCount,
        errorMessage: null,
      },
    });
  }

  /**
   * Legacy synchronous save used by tests / callers that already have chunks.
   * Creates an INDEXED document with chunks in one transaction.
   */
  async saveDocument(
    userId: string,
    name: string,
    mimeType: string,
    size: number,
    chunks: string[],
    embeddings: number[][],
    options?: {
      pageCount?: number | null;
      rawText?: string | null;
    },
  ) {
    const document = await this.prisma.document.create({
      data: {
        name,
        mimeType,
        size,
        userId,
        status: DocumentStatus.INDEXED,
        pageCount: options?.pageCount ?? null,
        rawText: options?.rawText ?? null,
        errorMessage: null,
      },
    });

    await this.prisma.documentChunk.createMany({
      data: chunks.map((chunk, index) => ({
        documentId: document.id,
        chunkIndex: index,
        content: chunk,
        embedding: embeddings[index],
        page: 1,
      })),
    });

    return document;
  }

  async replaceChunks(
    documentId: string,
    chunks: string[],
    embeddings: number[][],
  ) {
    await this.prisma.$transaction([
      this.prisma.documentChunk.deleteMany({ where: { documentId } }),
      this.prisma.documentChunk.createMany({
        data: chunks.map((chunk, index) => ({
          documentId,
          chunkIndex: index,
          content: chunk,
          embedding: embeddings[index],
          page: 1,
        })),
      }),
      this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: DocumentStatus.INDEXED,
          errorMessage: null,
        },
      }),
    ]);
  }

  async markProcessing(documentId: string) {
    return this.prisma.document.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.PROCESSING,
        errorMessage: null,
      },
    });
  }

  async markFailed(documentId: string, errorMessage: string) {
    return this.prisma.document.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.FAILED,
        errorMessage: errorMessage.slice(0, 500),
      },
    });
  }
}
