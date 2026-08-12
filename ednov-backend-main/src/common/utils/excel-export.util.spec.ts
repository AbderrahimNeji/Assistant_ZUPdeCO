import { buildXlsxBuffer } from './excel-export.util';

describe('buildXlsxBuffer (Excel export)', () => {
  it('returns a non-empty buffer', async () => {
    const buf = await buildXlsxBuffer({
      sheetName: 'Test',
      headerRow: ['A', 'B'],
      dataRows: [[1, 'x']],
    });
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(0);
  });

  it('writes an .xlsx ZIP header (PK)', async () => {
    const buf = await buildXlsxBuffer({
      sheetName: 'S',
      headerRow: ['h'],
      dataRows: [],
    });
    expect(buf.subarray(0, 2).toString('ascii')).toBe('PK');
  });

  it('truncates sheet name to 31 characters', async () => {
    const long = 'x'.repeat(40);
    const buf = await buildXlsxBuffer({
      sheetName: long,
      headerRow: ['c'],
      dataRows: [],
    });
    expect(buf.length).toBeGreaterThan(0);
  });

  it('supports header-only export', async () => {
    const buf = await buildXlsxBuffer({
      sheetName: 'HeadersOnly',
      headerRow: ['Col1', 'Col2'],
      dataRows: [],
    });
    expect(buf.subarray(0, 2).toString('ascii')).toBe('PK');
  });
});
