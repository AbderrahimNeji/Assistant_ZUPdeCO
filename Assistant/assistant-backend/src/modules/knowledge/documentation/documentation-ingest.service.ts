import { Injectable, Logger } from '@nestjs/common';
import { DocumentKind, DocumentStatus, UserRole } from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import pdfParse from 'pdf-parse';

import { PrismaService } from '../../../prisma/prisma.service';
import { EmbeddingService } from '../../documents/services/embedding.service';
import { DocumentationChunkerService } from './documentation-chunker.service';
import { DocumentationRetrievalService } from './documentation-retrieval.service';
import { cleanDocumentationText } from './documentation-text.util';
import {
  DOCUMENTATION_SYSTEM_EMAIL,
  FUNCTIONAL_DOC_NAME,
  FUNCTIONAL_DOC_SLUG,
} from './documentation.types';

export type IngestDocumentationResult = {
  documentId: string;
  slug: string;
  pageCount: number;
  chunkCount: number;
  replaced: boolean;
  contentHash: string;
  version: string;
  ingestedAt: string;
};

/**
 * Import official functional PDF → clean → hierarchical chunks → embed → store.
 */
@Injectable()
export class DocumentationIngestService {
  private readonly logger = new Logger(DocumentationIngestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chunker: DocumentationChunkerService,
    private readonly embeddingService: EmbeddingService,
    private readonly retrieval: DocumentationRetrievalService,
  ) {}

  async ingestPdf(filePath: string): Promise<IngestDocumentationResult> {
    const absolute = path.resolve(filePath);
    if (!fs.existsSync(absolute)) {
      throw new Error(`Documentation PDF not found: ${absolute}`);
    }

    const buffer = fs.readFileSync(absolute);
    const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');
    const ingestedAt = new Date();
    const version = `VF-${ingestedAt.toISOString().slice(0, 10)}`;
    const pages = await this.extractPages(buffer);
    const rawText = cleanDocumentationText(
      pages.map((p) => p.text).join('\n\n'),
    );

    const drafts = await this.chunker.chunkPages(pages);
    if (!drafts.length) {
      throw new Error('No documentation chunks produced from PDF.');
    }

    this.logger.log(
      `Embedding ${drafts.length} documentation chunks from ${pages.length} pages…`,
    );
    const embeddings = await this.embeddingService.embedDocuments(
      drafts.map((d) => d.content),
    );

    const ownerId = await this.ensureSystemUser();
    const existing = await this.prisma.document.findUnique({
      where: { slug: FUNCTIONAL_DOC_SLUG },
      select: { id: true },
    });

    const document = await this.prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.documentChunk.deleteMany({
          where: { documentId: existing.id },
        });
        await tx.document.delete({ where: { id: existing.id } });
      }

      const created = await tx.document.create({
        data: {
          name: FUNCTIONAL_DOC_NAME,
          mimeType: 'application/pdf',
          size: buffer.length,
          status: DocumentStatus.INDEXED,
          pageCount: pages.length,
          rawText,
          kind: DocumentKind.FUNCTIONAL_DOCUMENTATION,
          slug: FUNCTIONAL_DOC_SLUG,
          contentHash,
          version,
          ingestedAt,
          userId: ownerId,
          errorMessage: null,
        },
      });

      await tx.documentChunk.createMany({
        data: drafts.map((draft, index) => ({
          documentId: created.id,
          chunkIndex: index,
          page: draft.page,
          content: draft.content,
          embedding: embeddings[index],
          chapter: draft.chapter,
          section: draft.section,
          title: draft.title,
          keywords: draft.keywords,
        })),
      });

      return created;
    });

    this.logger.log(
      `Indexed functional documentation id=${document.id} chunks=${drafts.length}`,
    );
    this.retrieval.invalidateCache();

    return {
      documentId: document.id,
      slug: FUNCTIONAL_DOC_SLUG,
      pageCount: pages.length,
      chunkCount: drafts.length,
      replaced: Boolean(existing),
      contentHash,
      version,
      ingestedAt: ingestedAt.toISOString(),
    };
  }

  private async ensureSystemUser(): Promise<string> {
    const existing = await this.prisma.user.findUnique({
      where: { email: DOCUMENTATION_SYSTEM_EMAIL },
      select: { id: true },
    });
    if (existing) return existing.id;

    const created = await this.prisma.user.create({
      data: {
        email: DOCUMENTATION_SYSTEM_EMAIL,
        firstName: 'Documentation',
        lastName: 'System',
        // Unusable placeholder — never used for login.
        password: 'documentation-system-not-for-login',
        role: UserRole.ADMIN,
      },
      select: { id: true },
    });
    return created.id;
  }

  private async extractPages(
    buffer: Buffer,
  ): Promise<Array<{ page: number; text: string }>> {
    const pages: string[] = [];

    await pdfParse(buffer, {
      pagerender: async (pageData: {
        getTextContent: () => Promise<{
          items: Array<{ str: string; transform: number[] }>;
        }>;
      }) => {
        const textContent = await pageData.getTextContent();
        let lastY: number | undefined;
        let text = '';
        for (const item of textContent.items) {
          const y = item.transform[5];
          if (lastY === undefined || lastY === y) {
            text += item.str;
          } else {
            text += `\n${item.str}`;
          }
          lastY = y;
        }
        pages.push(text);
        return text;
      },
    });

    return pages.map((text, index) => ({
      page: index + 1,
      text: cleanDocumentationText(text),
    }));
  }
}
