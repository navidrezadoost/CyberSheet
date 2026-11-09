import { describe, expect, it, jest } from '@jest/globals';
import { strFromU8, unzipSync } from 'fflate';
import { Workbook, Worksheet } from '@cyber-sheet/core';
import { adoptWorksheetByWorkbook } from '../../core/src/worksheet';
import { exportXLSX } from '../src/export';

const address = { row: 1, col: 1 };
const formula = '=6*7';
const cachedValue = 8675309;

async function exportedSheetXml(source: Workbook | Worksheet): Promise<string> {
  const buffer = await exportXLSX(source);
  const files = unzipSync(new Uint8Array(buffer));
  return strFromU8(files['xl/worksheets/sheet1.xml']);
}

async function exportedParts(source: Workbook | Worksheet): Promise<Record<string, string>> {
  const buffer = await exportXLSX(source);
  const files = unzipSync(new Uint8Array(buffer));
  return Object.fromEntries(
    Object.entries(files).map(([path, contents]) => [path, strFromU8(contents)]),
  );
}

function styleIndexForCell(parts: Record<string, string>, sheetPath: string, cellRef: string): number {
  const cell = parts[sheetPath].match(new RegExp(`<c\\b[^>]*r="${cellRef}"[^>]*>`))?.[0];
  const styleIndex = cell?.match(/\bs="(\d+)"/)?.[1];
  if (styleIndex === undefined) throw new Error(`No style index on ${sheetPath} cell ${cellRef}`);
  return Number(styleIndex);
}

function fontXmlForStyle(parts: Record<string, string>, styleIndex: number): string {
  const stylesXml = parts['xl/styles.xml'];
  const xfsXml = stylesXml.match(/<cellXfs count="\d+">([\s\S]*?)<\/cellXfs>/)?.[1];
  const xfs = xfsXml?.match(/<xf\b[^>]*>/g);
  const fontId = xfs?.[styleIndex]?.match(/\bfontId="(\d+)"/)?.[1];
  const fontsXml = stylesXml.match(/<fonts count="\d+">([\s\S]*?)<\/fonts>/)?.[1];
  const fonts = fontsXml?.match(/<font>[\s\S]*?<\/font>/g);
  if (fontId === undefined || !fonts?.[Number(fontId)]) {
    throw new Error(`No font definition for XLSX style index ${styleIndex}`);
  }
  return fonts[Number(fontId)];
}

describe('XLSX export with a retained raw Worksheet', () => {
  it('preserves formula and cached value for standalone Worksheet compatibility', async () => {
    const worksheet = new Worksheet('Standalone');
    worksheet.setCellFormula(address, formula, cachedValue);

    const xml = await exportedSheetXml(worksheet);

    expect(xml).toContain('<f>6*7</f>');
    expect(xml).toContain(`<v>${cachedValue}</v>`);
  });

  it('rejects an adopted raw Worksheet before scanning, even if its instance predicate is shadowed', async () => {
    const retainedRawWorksheet = new Worksheet('Retained raw');
    retainedRawWorksheet.setCellFormula(address, formula, cachedValue);
    Object.defineProperty(retainedRawWorksheet, 'isWorkbookOwned', {
      configurable: true,
      value: () => false,
    });
    adoptWorksheetByWorkbook(retainedRawWorksheet, 'io-xlsx-export-owner-test');
    const iterateCells = jest.spyOn(Worksheet.prototype, 'forEachNonEmptyCell');
    const readStyle = jest.spyOn(Worksheet.prototype, 'getCellStyle');
    const readValue = jest.spyOn(Worksheet.prototype, 'getCellValue');

    expect(retainedRawWorksheet.isWorkbookOwned()).toBe(false);
    await expect(exportXLSX(retainedRawWorksheet)).rejects.toThrow(
      /Cannot export a Workbook-owned raw Worksheet/,
    );
    expect(iterateCells).not.toHaveBeenCalled();
    expect(readStyle).not.toHaveBeenCalled();
    expect(readValue).not.toHaveBeenCalled();
  });

  it('exports a Workbook through owner-backed reads without disclosing its formula cache', async () => {
    const workbook = new Workbook();
    const worksheet = workbook.createDevImportWorksheet('Workbook view');
    worksheet.setCellFormula(address, formula, cachedValue);
    workbook.attachDevImportSheet(worksheet);

    const xml = await exportedSheetXml(workbook);

    expect(xml).toContain('<f>6*7</f>');
    expect(xml).toContain('<v></v>');
    expect(xml).not.toContain(`<v>${cachedValue}</v>`);
  });

  it('preserves style indices when WorkbookSheetView returns detached style snapshots', async () => {
    const workbook = new Workbook();
    const worksheet = workbook.createDevImportWorksheet('Styled workbook view');
    worksheet.setCellValue(address, 'styled');
    worksheet.setCellStyle(address, { bold: true, fontSize: 14 });
    workbook.attachDevImportSheet(worksheet);
    const secondWorksheet = workbook.createDevImportWorksheet('Second styled view');
    secondWorksheet.setCellValue(address, 'also styled');
    secondWorksheet.setCellStyle(address, { italic: true, fontSize: 16 });
    workbook.attachDevImportSheet(secondWorksheet);

    const view = workbook.getSheet('Styled workbook view');
    expect(view).toBeDefined();
    const firstRead = view!.getCellStyle(address);
    const secondRead = view!.getCellStyle(address);
    expect(firstRead).toEqual(expect.objectContaining({ bold: true, fontSize: 14 }));
    expect(secondRead).toEqual(firstRead);
    expect(secondRead).not.toBe(firstRead);

    const workbookParts = await exportedParts(workbook);
    expect(workbookParts['xl/styles.xml']).toContain('<b/>');
    expect(workbookParts['xl/styles.xml']).toContain('<i/>');
    const firstSheetStyleIndex = styleIndexForCell(workbookParts, 'xl/worksheets/sheet1.xml', 'A1');
    const secondSheetStyleIndex = styleIndexForCell(workbookParts, 'xl/worksheets/sheet2.xml', 'A1');
    expect(firstSheetStyleIndex).toBeGreaterThan(0);
    expect(secondSheetStyleIndex).toBeGreaterThan(0);
    expect(firstSheetStyleIndex).not.toBe(secondSheetStyleIndex);
    expect(fontXmlForStyle(workbookParts, firstSheetStyleIndex)).toContain('<b/>');
    expect(fontXmlForStyle(workbookParts, firstSheetStyleIndex)).not.toContain('<i/>');
    expect(fontXmlForStyle(workbookParts, secondSheetStyleIndex)).toContain('<i/>');
    expect(fontXmlForStyle(workbookParts, secondSheetStyleIndex)).not.toContain('<b/>');

    const standalone = new Worksheet('Standalone styled');
    standalone.setCellValue(address, 'styled');
    standalone.setCellStyle(address, { bold: true, fontSize: 14 });
    const standaloneParts = await exportedParts(standalone);
    expect(standaloneParts['xl/styles.xml']).toContain('<b/>');
    expect(styleIndexForCell(standaloneParts, 'xl/worksheets/sheet1.xml', 'A1')).toBeGreaterThan(0);
  });
});
