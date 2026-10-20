/**
 * XLSX export projection coverage at the R1 boundary.
 *
 * The public import/restore path is intentionally unavailable until R6, so
 * these tests inspect the emitted OOXML and exercise import's fail-fast gate.
 */
import { describe, it, expect, jest } from '@jest/globals';
import { Worksheet, type Address, type CellStyle } from '@cyber-sheet/core';
import { strFromU8, unzipSync } from 'fflate';
import { exportXLSX } from '../src/export';
import { loadXlsxFromArrayBuffer } from '../src/index';

type ExtendedStyle = CellStyle & { strikethrough?: boolean; superscript?: boolean; subscript?: boolean; indent?: number };

async function exportedParts(sheet: Worksheet) {
  const buffer = await exportXLSX(sheet);
  const files = unzipSync(new Uint8Array(buffer));
  return {
    buffer,
    workbook: strFromU8(files['xl/workbook.xml']),
    sheet: strFromU8(files['xl/worksheets/sheet1.xml']),
    styles: strFromU8(files['xl/styles.xml']),
  };
}

describe('XLSX export projection', () => {
  it('exports widely separated cells with sparse cell visits', async () => {
    const sheet = new Worksheet('Sparse');
    sheet.setCellValue({ row: 1, col: 1 }, 'top-left');
    sheet.setCellValue({ row: 1_048_576, col: 16_384 }, 'bottom-right');
    const getCellValue = jest.spyOn(sheet, 'getCellValue');
    const getCellStyle = jest.spyOn(sheet, 'getCellStyle');

    const files = await exportedParts(sheet);
    expect(files.sheet).toContain('<c r="A1"');
    expect(files.sheet).toContain('<c r="XFD1048576"');
    expect(getCellValue).toHaveBeenCalledTimes(2);
    expect(getCellStyle).toHaveBeenCalledTimes(4);
  });

  it('projects strikethrough and font size', async () => {
    const sheet = new Worksheet('Test');
    sheet.setCellValue({ row: 1, col: 1 }, 'Strikethrough Text');
    sheet.setCellStyle({ row: 1, col: 1 }, { strikethrough: true, fontSize: 12 } as ExtendedStyle);
    const { styles, sheet: sheetXml } = await exportedParts(sheet);
    expect(sheetXml).toContain('r="A1"');
    expect(styles).toContain('<strike/>');
    expect(styles).toContain('<sz val="12"/>');
  });

  it('projects superscript without subscript', async () => {
    const sheet = new Worksheet('Test');
    sheet.setCellValue({ row: 1, col: 1 }, 'x²');
    sheet.setCellStyle({ row: 1, col: 1 }, { superscript: true } as ExtendedStyle);
    const { styles } = await exportedParts(sheet);
    expect(styles).toContain('<vertAlign val="superscript"/>');
    expect(styles).not.toContain('<vertAlign val="subscript"/>');
  });

  it('projects subscript without superscript', async () => {
    const sheet = new Worksheet('Test');
    sheet.setCellValue({ row: 1, col: 1 }, 'H₂O');
    sheet.setCellStyle({ row: 1, col: 1 }, { subscript: true } as ExtendedStyle);
    const { styles } = await exportedParts(sheet);
    expect(styles).toContain('<vertAlign val="subscript"/>');
    expect(styles).not.toContain('<vertAlign val="superscript"/>');
  });

  it('projects semantic indent and alignment values', async () => {
    const sheet = new Worksheet('Test');
    sheet.setCellValue({ row: 1, col: 1 }, 'Indented');
    sheet.setCellStyle({ row: 1, col: 1 }, { indent: 3, align: 'left' } as ExtendedStyle);
    const { styles } = await exportedParts(sheet);
    expect(styles).toContain('horizontal="left"');
    expect(styles).toContain('indent="3"');
  });

  it('gives superscript precedence when both vertical alignments are requested', async () => {
    const sheet = new Worksheet('Test');
    sheet.setCellValue({ row: 1, col: 1 }, 'Both');
    sheet.setCellStyle({ row: 1, col: 1 }, { superscript: true, subscript: true } as ExtendedStyle);
    const { styles } = await exportedParts(sheet);
    expect(styles).toContain('<vertAlign val="superscript"/>');
    expect(styles).not.toContain('<vertAlign val="subscript"/>');
  });

  it('retains canonical style identity and emits one explicit style record for equal styles', async () => {
    const sheet = new Worksheet('Test');
    sheet.setCellValue({ row: 1, col: 1 }, 'A');
    sheet.setCellValue({ row: 2, col: 1 }, 'B');
    sheet.setCellStyle({ row: 1, col: 1 }, { bold: true, fontSize: 14 });
    sheet.setCellStyle({ row: 2, col: 1 }, { bold: true, fontSize: 14 });
    expect(sheet.getCellStyle({ row: 1, col: 1 })).toBe(sheet.getCellStyle({ row: 2, col: 1 }));
    const { styles, sheet: sheetXml } = await exportedParts(sheet);
    expect(styles.match(/<xf\b/g)).toHaveLength(2);
    expect(sheetXml).toMatch(/<c r="A1"[^>]*\bs="1"/);
  });

  it('deduplicates repeated styles across many cells', async () => {
    const sheet = new Worksheet('Test');
    for (let row = 1; row <= 10; row++) {
      for (let col = 1; col <= 10; col++) {
        sheet.setCellValue({ row, col }, `${row},${col}`);
        sheet.setCellStyle({ row, col }, { bold: true, strikethrough: true } as ExtendedStyle);
      }
    }
    const { styles, sheet: sheetXml } = await exportedParts(sheet);
    expect(styles.match(/<xf\b/g)).toHaveLength(2);
    const styleIds = Array.from(sheetXml.matchAll(/<c\b[^>]*\bs="(\d+)"/g), (match) => match[1]);
    expect(new Set(styleIds).size).toBe(1);
  });

  it('projects bold, italic, and underline', async () => {
    const sheet = new Worksheet('Test');
    sheet.setCellValue({ row: 1, col: 1 }, 'Formatted');
    sheet.setCellStyle({ row: 1, col: 1 }, { bold: true, italic: true, underline: true });
    const { styles } = await exportedParts(sheet);
    expect(styles).toContain('<b/>');
    expect(styles).toContain('<i/>');
    expect(styles).toContain('<u/>');
  });

  it('projects alignment and wrapping', async () => {
    const sheet = new Worksheet('Test');
    sheet.setCellValue({ row: 1, col: 1 }, 'Aligned');
    sheet.setCellStyle({ row: 1, col: 1 }, { align: 'center', wrap: true });
    const { styles } = await exportedParts(sheet);
    expect(styles).toContain('horizontal="center"');
    expect(styles).toContain('wrapText="1"');
  });

  it('projects text rotation', async () => {
    const sheet = new Worksheet('Test');
    sheet.setCellValue({ row: 1, col: 1 }, 'Rotated');
    sheet.setCellStyle({ row: 1, col: 1 }, { rotation: 45 });
    const { styles } = await exportedParts(sheet);
    expect(styles).toContain('textRotation="45"');
  });

  it('writes an empty cell when it has a style', async () => {
    const sheet = new Worksheet('Test');
    sheet.setCellStyle({ row: 1, col: 1 }, { bold: true });
    const { sheet: sheetXml, styles } = await exportedParts(sheet);
    expect(sheetXml).toMatch(/<c r="A1"[^>]*\/>/);
    expect(styles).toContain('<b/>');
    expect(sheet.getCellValue({ row: 1, col: 1 })).toBeNull();
  });

  it('omits zero indent from the exported alignment', async () => {
    const sheet = new Worksheet('Test');
    sheet.setCellValue({ row: 1, col: 1 }, 'No indent');
    sheet.setCellStyle({ row: 1, col: 1 }, { indent: 0 } as ExtendedStyle);
    const { styles } = await exportedParts(sheet);
    expect(styles).not.toContain('indent="0"');
  });

  it('keeps public workbook import gated until R6', async () => {
    const sheet = new Worksheet('Test');
    const { buffer } = await exportedParts(sheet);
    expect(() => loadXlsxFromArrayBuffer(new Uint8Array(buffer))).toThrow(/R6 staged restore/);
  });
});
