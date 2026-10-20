import { ExportPlugin } from '../src/ExportPlugin';
import { adoptWorksheetByWorkbook, Worksheet } from '../../core/src/worksheet';
import type { WorkbookId } from '../../core/src/workbook-access-types';

describe('ExportPlugin Worksheet read characterization', () => {
  test('explicit valid ranges serialize cached formula values from a retained Worksheet after adoption', async () => {
    const worksheet = new Worksheet('Export boundary', 2, 2);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=40+2', 42);
    worksheet.addComment({ row: 1, col: 1 }, { text: 'review note', author: 'Reviewer' });
    const plugin = new ExportPlugin(worksheet);
    const explicitRange = { range: { startRow: 1, endRow: 1, startCol: 1, endCol: 1 } };

    expect((await plugin.export('csv', explicitRange)).data).toBe('42');
    expect((await plugin.export('json', explicitRange)).data).toBe('[{"col1":42}]');

    adoptWorksheetByWorkbook(worksheet, 'export-plugin-retained-owner' as WorkbookId);

    expect((await plugin.export('csv', explicitRange)).data).toBe('42');
    expect((await plugin.export('json', explicitRange)).data).toBe('[{"col1":42}]');
    await expect(plugin.export('csv')).rejects.toThrow(/Worksheet address out of bounds: row=0, col=0/);
    expect(worksheet.getCell({ row: 1, col: 1 })).toMatchObject({ value: 42, formula: '=40+2' });
  });

  test('JSON includeHeaders uses a cached formula value as the property name before and after adoption', async () => {
    const worksheet = new Worksheet('Export headers', 2, 1);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=40+2', 42);
    worksheet.setCellValue({ row: 2, col: 1 }, 'body');
    const plugin = new ExportPlugin(worksheet);
    const explicitRangeWithHeaders = {
      range: { startRow: 1, endRow: 2, startCol: 1, endCol: 1 },
      includeHeaders: true,
    };

    expect((await plugin.export('json', explicitRangeWithHeaders)).data).toBe('[{"42":"body"}]');

    adoptWorksheetByWorkbook(worksheet, 'export-plugin-json-header-owner' as WorkbookId);

    expect((await plugin.export('json', explicitRangeWithHeaders)).data).toBe('[{"42":"body"}]');
  });

  test('explicit-range PNG passes an adopted cached formula value to the canvas text renderer', async () => {
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
      const result = await plugin.export('png', explicitRange);

      expect(canvasConstructor).toHaveBeenCalledTimes(1);
      expect(getContext).toHaveBeenCalledWith('2d');
      expect(drawText).toHaveBeenCalledWith('42', 8, 12.5, 84);
      expect(convertToBlob).toHaveBeenCalledWith({ type: 'image/png' });
      expect(result.data).toBeInstanceOf(Blob);

      await expect(plugin.export('png')).rejects.toThrow(/Worksheet address out of bounds: row=0, col=0/);
      expect(canvasConstructor).toHaveBeenCalledTimes(1);
    } finally {
      if (previousDescriptor) {
        Object.defineProperty(globalThis, 'OffscreenCanvas', previousDescriptor);
      } else {
        delete (globalThis as { OffscreenCanvas?: unknown }).OffscreenCanvas;
      }
    }
  });
});
