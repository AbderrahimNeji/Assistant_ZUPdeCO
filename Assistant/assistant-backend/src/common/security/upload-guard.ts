import { BadRequestException } from '@nestjs/common';

export const ALLOWED_UPLOAD_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/csv',
]);

const EXT_BY_MIME: Record<string, RegExp> = {
  'application/pdf': /\.pdf$/i,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    /\.docx$/i,
  'text/plain': /\.txt$/i,
  'text/markdown': /\.(md|markdown)$/i,
  'text/csv': /\.csv$/i,
};

export const ALLOWED_UPLOAD_EXTENSIONS = /\.(pdf|docx|txt|md|markdown|csv)$/i;

const PDF_MAGIC = Buffer.from('%PDF');
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);

function startsWith(buffer: Buffer, magic: Buffer): boolean {
  return buffer.length >= magic.length && buffer.subarray(0, magic.length).equals(magic);
}

function looksLikeHtmlOrScript(buffer: Buffer): boolean {
  const head = buffer
    .subarray(0, 256)
    .toString('utf8')
    .replace(/^\uFEFF/, '')
    .trimStart()
    .toLowerCase();
  return (
    head.startsWith('<!doctype html') ||
    head.startsWith('<html') ||
    head.startsWith('<svg') ||
    head.startsWith('<script') ||
    head.startsWith('<?xml')
  );
}

export function extensionMatchesMime(
  originalname: string,
  mimetype: string,
): boolean {
  const pattern = EXT_BY_MIME[mimetype];
  if (!pattern) return false;
  return pattern.test(originalname);
}

export function assertAllowedUploadMeta(file: {
  originalname?: string;
  mimetype?: string;
}): void {
  const name = file.originalname ?? '';
  const mime = file.mimetype ?? '';
  if (!ALLOWED_UPLOAD_MIME.has(mime) || !extensionMatchesMime(name, mime)) {
    throw new BadRequestException('Unsupported file type');
  }
}

export function assertMagicBytes(file: {
  originalname?: string;
  mimetype?: string;
  buffer?: Buffer;
}): void {
  assertAllowedUploadMeta(file);
  const buffer = file.buffer;
  if (!buffer || buffer.length < 4) {
    throw new BadRequestException('File is empty or unreadable');
  }

  const mime = file.mimetype ?? '';

  if (mime === 'application/pdf') {
    if (!startsWith(buffer, PDF_MAGIC)) {
      throw new BadRequestException('File content does not match a PDF');
    }
    return;
  }

  if (
    mime ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    if (!startsWith(buffer, ZIP_MAGIC)) {
      throw new BadRequestException('File content does not match a DOCX');
    }
    return;
  }

  if (startsWith(buffer, PDF_MAGIC) || startsWith(buffer, ZIP_MAGIC)) {
    throw new BadRequestException('File content does not match the declared type');
  }
  if (buffer.includes(0) && !startsWith(buffer, UTF8_BOM)) {
    throw new BadRequestException('Binary content is not allowed for text uploads');
  }
  if (looksLikeHtmlOrScript(buffer)) {
    throw new BadRequestException('HTML or script files are not allowed');
  }
}

export function multerUploadFilter(
  _req: unknown,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
): void {
  try {
    assertAllowedUploadMeta(file);
    callback(null, true);
  } catch (error) {
    callback(error as Error, false);
  }
}
