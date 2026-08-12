import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocumentStatus } from '@prisma/client';

import { ErrorLogger } from '../../common/logger/error-logger';
import { PrismaService } from '../../prisma/prisma.service';
import { ChunkService } from './services/chunk.service';
import { EmbeddingService } from './services/embedding.service';
import { DocumentStorageService } from './services/document-storage.service';

const documentListSelect = {
  id: true,
  name: true,
  mimeType: true,
  size: true,
  status: true,
  errorMessage: true,
  pageCount: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: { chunks: true },
  },
} as const;

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chunkService: ChunkService,
    private readonly embeddingService: EmbeddingService,
    private readonly storage: DocumentStorageService,
  ) {}

  async findAll(userId: string) {
    try {
      return await this.prisma.document.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: documentListSelect,
      });
    } catch (error) {
      ErrorLogger.log(error, 'DocumentsService.findAll', { userId });
      throw error;
    }
  }

  async findOne(documentId: string, userId: string) {
    try {
      const document = await this.prisma.document.findFirst({
        where: { id: documentId, userId },
        select: documentListSelect,
      });

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      return document;
    } catch (error) {
      ErrorLogger.log(error, 'DocumentsService.findOne', {
        userId,
        documentId,
      });
      throw error;
    }
  }

  async findChunks(documentId: string, userId: string) {
    try {
      return await this.prisma.documentChunk.findMany({
        where: {
          documentId,
          document: { userId },
        },
        orderBy: { chunkIndex: 'asc' },
        select: {
          id: true,
          documentId: true,
          chunkIndex: true,
          page: true,
          content: true,
          chapter: true,
          section: true,
          title: true,
          keywords: true,
          createdAt: true,
        },
      });
    } catch (error) {
      ErrorLogger.log(error, 'DocumentsService.findChunks', {
        userId,
        documentId,
      });
      throw error;
    }
  }

  async delete(documentId: string, userId: string) {
    try {
      const existing = await this.prisma.document.findFirst({
        where: { id: documentId, userId },
        select: { id: true },
      });

      if (!existing) {
        throw new NotFoundException('Document not found');
      }

      return await this.prisma.document.delete({
        where: { id: documentId },
      });
    } catch (error) {
      ErrorLogger.log(error, 'DocumentsService.delete', {
        userId,
        documentId,
      });
      throw error;
    }
  }

  /**
   * Chunk + embed extracted text and mark the document INDEXED or FAILED.
   * Safe to call asynchronously after upload returns.
   */
  async indexDocument(documentId: string, userId: string): Promise<void> {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, userId },
      select: {
        id: true,
        rawText: true,
        status: true,
      },
    });

    if (!document) {
      return;
    }

    if (!document.rawText?.trim()) {
      await this.storage.markFailed(
        documentId,
        'No extracted text available to index.',
      );
      return;
    }

    try {
      await this.storage.markProcessing(documentId);

      const chunks = await this.chunkService.split(document.rawText);
      if (chunks.length === 0) {
        throw new Error('No content chunks could be generated from this file.');
      }

      const embeddings =
        await this.embeddingService.embedDocuments(chunks);

      await this.storage.replaceChunks(documentId, chunks, embeddings);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Indexing failed unexpectedly.';

      ErrorLogger.log(error, 'DocumentsService.indexDocument', {
        userId,
        documentId,
      });

      try {
        const stillOwned = await this.prisma.document.findFirst({
          where: { id: documentId, userId },
          select: { id: true },
        });
        if (stillOwned) {
          await this.storage.markFailed(documentId, message);
        }
      } catch (markFailedError) {
        ErrorLogger.log(
          markFailedError,
          'DocumentsService.indexDocument.markFailed',
          { userId, documentId },
        );
      }
    }
  }

  async retry(documentId: string, userId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, userId },
      select: {
        id: true,
        status: true,
        rawText: true,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.status !== DocumentStatus.FAILED) {
      throw new BadRequestException(
        'Only failed documents can be retried.',
      );
    }

    if (!document.rawText?.trim()) {
      throw new BadRequestException(
        'This document cannot be retried because extracted text was not retained. Please upload the file again.',
      );
    }

    await this.storage.markProcessing(documentId);

    void this.indexDocument(documentId, userId);

    return {
      success: true,
      documentId,
      status: DocumentStatus.PROCESSING,
    };
  }
}
