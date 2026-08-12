import { Injectable, BadRequestException } from '@nestjs/common';
import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';

import { assertMagicBytes } from '../../../common/security/upload-guard';

export type ParsedDocument = {
  text: string;
  pageCount: number | null;
};

const PARSE_TIMEOUT_MS = Number(process.env.DOCUMENT_PARSE_TIMEOUT_MS ?? 8_000);

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new BadRequestException('File parsing timed out')),
      ms,
    );
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

@Injectable()
export class DocumentParserService {
  async parse(file: Express.Multer.File): Promise<ParsedDocument> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    assertMagicBytes(file);

    const mime = file.mimetype;

    switch (mime) {
      case 'application/pdf': {
        const result = (await withTimeout(
          pdfParse(file.buffer) as Promise<{ text?: string; numpages?: number }>,
          PARSE_TIMEOUT_MS,
        )) as { text?: string; numpages?: number };
        return {
          text: result.text ?? '',
          pageCount:
            typeof result.numpages === 'number' ? result.numpages : null,
        };
      }

      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
        const result = await withTimeout(
          mammoth.extractRawText({
            buffer: file.buffer,
          }),
          PARSE_TIMEOUT_MS,
        );

        return {
          text: result.value,
          pageCount: null,
        };
      }

      case 'text/plain':
      case 'text/markdown':
      case 'text/csv':
        return {
          text: file.buffer.toString('utf8'),
          pageCount: null,
        };

      default:
        throw new BadRequestException('Unsupported file type');
    }
  }
}
