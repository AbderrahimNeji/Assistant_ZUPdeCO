import { BadRequestException } from '@nestjs/common';

import { encodeEdnovId } from './ednov-path';

describe('encodeEdnovId', () => {
  it('encodes reserved characters', () => {
    expect(encodeEdnovId('abc def')).toBe('abc%20def');
  });

  it('rejects path traversal and delimiters', () => {
    expect(() => encodeEdnovId('../users')).toThrow(BadRequestException);
    expect(() => encodeEdnovId('a/b')).toThrow(BadRequestException);
    expect(() => encodeEdnovId('a?x=1')).toThrow(BadRequestException);
    expect(() => encodeEdnovId('')).toThrow(BadRequestException);
  });
});
