import { ExportPlugin } from '../src/ExportPlugin';
import { adoptWorksheetByWorkbook, Worksheet } from '../../core/src/worksheet';
import type { WorkbookId } from '../../core/src/workbook-access-types';

describe('ExportPlugin Worksheet read characterization', () => {
  test('preserves standalone export and rejects a retained Worksheet after adoption before reads', async () => {
    const worksheet = new Worksheet('Export boundary', 2, 2);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=40+2', 42);
    worksheet.addComment({ row: 1, col: 1 }, { text: 'review note', author: 'Reviewer' });
    const plugin = new ExportPlugin(worksheet);
    const explicitRange = { range: { startRow: 1, endRow: 1, startCol: 1, endCol: 1 } };

    expect((await plugin.export('csv', explicitRange)).data).toBe('42');
    expect((await plugin.export('json', explicitRange)).data).toBe('[{"col1":42}]');

    Object.defineProperty(worksheet, 'isWorkbookOwned', {
      configurable: true,
      value: () => false,
    });
    adoptWorksheetByWorkbook(worksheet, 'export-plugin-retained-owner' as WorkbookId);

    const getCell = jest.spyOn(Worksheet.prototype, 'getCell');
    await expect(plugin.export('csv', explicitRange)).rejects.toThrow(/Workbook-owned Worksheet/);
    expect(getCell).not.toHaveBeenCalled();
    await expect(plugin.export('json', explicitRange)).rejects.toThrow(/Workbook-owned Worksheet/);
    expect(getCell).not.toHaveBeenCalled();
    await expect(plugin.export('csv')).rejects.toThrow(/Workbook-owned Worksheet/);
    expect(getCell).not.toHaveBeenCalled();
    getCell.mockRestore();
    expect(worksheet.getCell({ row: 1, col: 1 })).toMatchObject({ value: 42, formula: '=40+2' });
  });

  test('JSON includeHeaders preserves standalone headers and rejects an adopted source before reads', async () => {
    const worksheet = new Worksheet('Export headers', 2, 1);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=40+2', 42);
    worksheet.setCellValue({ row: 2, col: 1 }, 'body');
    const plugin = new ExportPlugin(worksheet);
    const explicitRangeWithHeaders = {
      range: { startRow: 1, endRow: 2, startCol: 1, endCol: 1 },
      includeHeaders: true,
    };

    const standaloneResult = await plugin.export('json', explicitRangeWithHeaders);
    expect(standaloneResult.data).toBe('[{"42":"body"}]');

    adoptWorksheetByWorkbook(worksheet, 'export-plugin-json-header-owner' as WorkbookId);

    const getCell = jest.spyOn(Worksheet.prototype, 'getCell');
    await expect(plugin.export('json', explicitRangeWithHeaders)).rejects.toThrow(/Workbook-owned Worksheet/);
    expect(getCell).not.toHaveBeenCalled();
    getCell.mockRestore();
    expect(standaloneResult.data).toBe('[{"42":"body"}]');
  });

  test('PNG rejects an adopted Worksheet before canvas creation or cell reads', async () => {
    const worksheet = new Worksheet('PNG export boundary', 2, 2);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=40+2', 42);
    const plugin = new ExportPlugin(worksheet);
    const explicitRange = { range: { startRow: 1, endRow: 1, startCol: 1, endCol: 1 } };
    const drawText = jest.fn();
    const context = {
      scale: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      fillText: drawText,
    };
    const convertToBlob = jest.fn(async () => new Blob(['stub image'], { type: 'image/png' }));
    const getContext = jest.fn(() => context);
    const canvasConstructor = jest.fn().mockImplementation(() => ({ getContext, convertToBlob }));
    const previousDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'OffscreenCanvas');

    Object.defineProperty(globalThis, 'OffscreenCanvas', {
      configurable: true,
      writable: true,
      value: canvasConstructor,
    });

    try {
      adoptWorksheetByWorkbook(worksheet, 'export-plugin-png-owner' as WorkbookId);
      const getCell = jest.spyOn(Worksheet.prototype, 'getCell');
      await expect(plugin.export('png', explicitRange)).rejects.toThrow(/Workbook-owned Worksheet/);
      expect(getCell).not.toHaveBeenCalled();
      expect(canvasConstructor).not.toHaveBeenCalled();
      expect(getContext).not.toHaveBeenCalled();
      expect(drawText).not.toHaveBeenCalled();
      expect(convertToBlob).not.toHaveBeenCalled();
      getCell.mockRestore();
    } finally {
      if (previousDescriptor) {
        Object.defineProperty(globalThis, 'OffscreenCanvas', previousDescriptor);
      } else {
        delete (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas;
      }
    }
  });
});
