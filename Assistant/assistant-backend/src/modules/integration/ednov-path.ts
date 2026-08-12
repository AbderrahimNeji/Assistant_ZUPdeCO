import { BadRequestException } from '@nestjs/common';

const UNSAFE = /[/\\?#\u0000]|%2[ef]|%5c|\.\./i;

/**
 * Encode a single Ednov path-segment id. Rejects traversal / delimiter injection.
 */
export function encodeEdnovId(id: string): string {
  const trimmed = String(id ?? '').trim();
  if (!trimmed || trimmed.length > 128 || UNSAFE.test(trimmed)) {
    throw new BadRequestException('Invalid resource id');
  }
  return encodeURIComponent(trimmed);
}
