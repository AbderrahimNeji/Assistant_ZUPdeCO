import { PassThrough } from 'stream';
import { finished } from 'node:stream/promises';
import * as ExcelJS from 'exceljs';

const MAX_SHEET_NAME_LEN = 31;

export type ExcelCellValue = string | number | boolean | Date | null | undefined;

function safeSheetName(name: string): string {
  if (name.length > MAX_SHEET_NAME_LEN) return name.slice(0, MAX_SHEET_NAME_LEN);
  return name || 'Export';
}

/**
 * Build a single-sheet .xlsx file as a Buffer (plain cell values; no CSV escaping).
 */
export async function buildXlsxBuffer(options: {
  sheetName: string;
  headerRow: string[];
  dataRows: ExcelCellValue[][];
}): Promise<Buffer> {
  const { headerRow, dataRows } = options;
  const safeName = safeSheetName(options.sheetName);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(safeName);
  worksheet.addRow(headerRow);
  for (const row of dataRows) {
    worksheet.addRow(row);
  }

  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}

/**
 * Streaming XLSX: rows are written with `.commit()` per row so large exports do not
 * retain the full workbook in memory like {@link buildXlsxBuffer}.
 */
export async function buildXlsxBufferStreaming(options: {
  sheetName: string;
  headerRow: ExcelCellValue[];
  writeBody: (sheet: ExcelJS.Worksheet) => Promise<void>;
}): Promise<Buffer> {
  const safeName = safeSheetName(options.sheetName);
  const chunks: Buffer[] = [];
  const passThrough = new PassThrough();
  passThrough.on('data', (chunk: Buffer | string) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  });

  const WorkbookWriter = ExcelJS.stream.xlsx.WorkbookWriter;
  const workbook = new WorkbookWriter({
    stream: passThrough,
    useStyles: false,
    useSharedStrings: false,
  });

  const sheet = workbook.addWorksheet(safeName);
  sheet.addRow(options.headerRow).commit();
  await options.writeBody(sheet);
  await sheet.commit();
  await workbook.commit();
  await finished(passThrough);

  return Buffer.concat(chunks);
}
