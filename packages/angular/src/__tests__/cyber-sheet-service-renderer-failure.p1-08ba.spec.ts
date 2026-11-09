import { Workbook } from '@cyber-sheet/core';
import { CanvasRenderer } from '@cyber-sheet/renderer-canvas';
import { CyberSheetService } from '../CyberSheetService';

jest.mock('@cyber-sheet/core', () => jest.requireActual('../../../core/src/workbook.ts'), { virtual: true });
jest.mock('@cyber-sheet/renderer-canvas', () => ({ CanvasRenderer: jest.fn() }), { virtual: true });

describe('P1-08BA Angular renderer-construction failure', () => {
  it('returns no partial result after a renderer throw and permits a clean retry', async () => {
    const failure = new Error('renderer construction failed');
    const container = document.createElement('div');
    const service = new CyberSheetService();
    const createWorkbook = jest.spyOn(Workbook, 'create');
    const rendererMock = CanvasRenderer as unknown as jest.Mock;

    rendererMock.mockImplementationOnce(() => {
      throw failure;
    });

    await expect(service.createRenderer(container)).rejects.toBe(failure);

    expect(createWorkbook).toHaveBeenCalledTimes(1);
    expect(rendererMock).toHaveBeenCalledTimes(1);
    expect(container.childElementCount).toBe(0);

    rendererMock.mockImplementationOnce((target: HTMLElement, worksheet: unknown, options: unknown) => {
      const canvas = document.createElement('canvas');
      target.appendChild(canvas);
      return { canvas, container: target, worksheet, options, dispose: jest.fn() };
    });

    const result = await service.createRenderer(container);

    expect(createWorkbook).toHaveBeenCalledTimes(2);
    expect(rendererMock).toHaveBeenCalledTimes(2);
    expect(Workbook.isWorkbookIssuedSheetView(result.worksheet)).toBe(true);
    expect(result.worksheet.name).toBe('Sheet1');
    expect(result.renderer).toBe(rendererMock.mock.results[1].value);
    expect(container.querySelectorAll('canvas')).toHaveLength(1);
    createWorkbook.mockRestore();
  });
});
