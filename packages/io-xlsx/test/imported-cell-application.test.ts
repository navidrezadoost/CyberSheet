import { describe, expect, it, jest } from '@jest/globals';
import { Worksheet } from '../../core/src/worksheet';
import { adoptWorksheetByWorkbook } from '../../core/src/worksheet';
import { applyParsedCellToWorksheet } from '../src/internal/applyParsedCell';
import { importXLSX } from '../src/import';
import { loadXlsxFromArrayBuffer, loadXlsxFromUrl } from '../src/index';
import { loadXlsxProgressivelyFromArrayBuffer } from '../src/progressive';

describe('parsed XLSX cell application', () => {
  it('preserves standalone formula import behavior', () => {
    const worksheet = new Worksheet('Standalone');
    const changed = jest.fn();
    worksheet.on(changed);

    applyParsedCellToWorksheet(worksheet, { row: 1, col: 1 }, {
      value: 7,
      formula: '=3+4',
    });

    expect(worksheet.getCell({ row: 1, col: 1 })?.formula).toBe('=3+4');
    expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe(7);
    expect(changed).toHaveBeenCalled();
  });

  it('rejects an adopted raw formula write before state or events change', () => {
    const worksheet = new Worksheet('Owned');
    adoptWorksheetByWorkbook(worksheet, 'test-workbook-owner');
    const changed = jest.fn();
    worksheet.on(changed);

    expect(() => applyParsedCellToWorksheet(worksheet, { row: 1, col: 1 }, {
      value: null,
      formula: '=3+4',
    })).toThrow(/Workbook-owned Worksheet\.setCellFormula is unavailable/);

    expect(worksheet.getCell({ row: 1, col: 1 })).toBeUndefined();
    expect(worksheet.getCellValue({ row: 1, col: 1 })).toBeNull();
    expect(changed).not.toHaveBeenCalled();
  });

  it('keeps public workbook import and restore entrypoints gated until R6', async () => {
    const fetchFile = jest.fn(async (_input: RequestInfo, _init?: RequestInit) => new Response());
    const bytes = new Uint8Array(0);

    expect(() => loadXlsxFromArrayBuffer(bytes)).toThrow(/R6 staged restore/);
    await expect(loadXlsxFromUrl('https://example.invalid/file.xlsx', fetchFile)).rejects.toThrow(/R6 staged restore/);
    await expect(importXLSX(bytes.buffer)).rejects.toThrow(/R6 staged restore/);
    await expect(loadXlsxProgressivelyFromArrayBuffer(bytes)).rejects.toThrow(/R6 staged restore/);
    expect(fetchFile).not.toHaveBeenCalled();
  });
});
