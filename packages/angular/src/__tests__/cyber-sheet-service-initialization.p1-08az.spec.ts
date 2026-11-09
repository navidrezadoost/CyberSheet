import { Workbook } from '@cyber-sheet/core';
import { CanvasRenderer } from '@cyber-sheet/renderer-canvas';
import { CyberSheetService } from '../CyberSheetService';

// Package export entrypoints target dist/, which is intentionally not built in
// this characterization lane. Use the unchanged Core source module so the
// Workbook boundary under observation is still the real implementation.
jest.mock('@cyber-sheet/core', () => jest.requireActual('../../../core/src/workbook.ts'), { virtual: true });

jest.mock('@cyber-sheet/renderer-canvas', () => ({
  CanvasRenderer: jest.fn().mockImplementation((container, worksheet, options) => {
    const canvas = document.createElement('canvas');
    container.appendChild(canvas);
    return { canvas, container, worksheet, options, dispose: jest.fn() };
  }),
}), { virtual: true });

describe('P1-08AZ Angular service initialization characterization', () => {
  let container: HTMLElement;

  beforeEach(() => {
    jest.clearAllMocks();
    container = document.createElement('div');
  });

  it('publishes a Workbook-backed renderer for an empty configuration', async () => {
    const createWorkbook = jest.spyOn(Workbook, 'create');
    const service = new CyberSheetService();

    const result = await service.createRenderer(container);

    expect(createWorkbook).toHaveBeenCalledTimes(1);
    expect(Workbook.isWorkbookIssuedSheetView(result.worksheet)).toBe(true);
    expect(result.worksheet.name).toBe('Sheet1');
    expect(CanvasRenderer).toHaveBeenCalledTimes(1);
    expect((CanvasRenderer as jest.Mock).mock.calls[0][0]).toBe(container);
    expect((CanvasRenderer as jest.Mock).mock.calls[0][1]).toBe(result.worksheet);
    expect(result.renderer).toBe((CanvasRenderer as jest.Mock).mock.results[0].value);
    expect(container.querySelectorAll('canvas')).toHaveLength(1);
  });

  it('rejects non-empty initial data before creating a Workbook or publishing a renderer', async () => {
    const createWorkbook = jest.spyOn(Workbook, 'create');
    const service = new CyberSheetService();

    await expect(service.createRenderer(container, { data: [['unsupported']] }))
      .rejects.toThrow('Initial workbook cell data is unavailable until the R2 journal slice is authorized');

    expect(createWorkbook).not.toHaveBeenCalled();
    expect(CanvasRenderer).not.toHaveBeenCalled();
    expect(container.childElementCount).toBe(0);
  });
});
