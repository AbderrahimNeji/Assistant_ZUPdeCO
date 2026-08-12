/**
 * CLI: ingest official ZupdeCo functional documentation into the RAG KB.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/ingest-documentation.ts [path-to-pdf]
 *
 * Default PDF: knowledge/Documentation-Fonctionnelle-ZupdeCo.pdf
 */
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import * as path from 'path';

import { AppModule } from '../src/app.module';
import { DocumentationIngestService } from '../src/modules/knowledge/documentation/documentation-ingest.service';

async function main() {
  const logger = new Logger('ingest-documentation');
  const pdfArg = process.argv[2];
  const defaultPdf = path.resolve(
    __dirname,
    '../knowledge/Documentation-Fonctionnelle-ZupdeCo.pdf',
  );
  const pdfPath = pdfArg ? path.resolve(pdfArg) : defaultPdf;

  logger.log(`Ingesting documentation from: ${pdfPath}`);

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const ingest = app.get(DocumentationIngestService);
    const result = await ingest.ingestPdf(pdfPath);
    logger.log(
      `Done. documentId=${result.documentId} pages=${result.pageCount} chunks=${result.chunkCount} replaced=${result.replaced}`,
    );
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
