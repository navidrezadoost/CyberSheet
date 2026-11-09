import { mockCanvas } from '../../../test-utils/src';
import { Worksheet } from '@cyber-sheet/core';
import { CanvasRenderer } from '@cyber-sheet/renderer-canvas';

describe('CanvasRenderer formula-worker-free fallback', () => {
  let previousResizeObserverDescriptor: PropertyDescriptor | undefined;

  beforeAll(() => {
    mockCanvas();
    previousResizeObserverDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'ResizeObserver');
    Object.defineProperty(globalThis, 'ResizeObserver', {
      configurable: true,
      value: class {
        observe() {}
        disconnect() {}
      },
    });
  });

  afterAll(() => {
    if (previousResizeObserverDescriptor) {
      Object.defineProperty(globalThis, 'ResizeObserver', previousResizeObserverDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, 'ResizeObserver');
    }
  });

  test('evaluates a standalone formula synchronously when no worker factory is supplied', () => {
    const worksheet = new Worksheet('SyncFallback', 4, 4, {
      evaluate: () => 2,
    });
    worksheet.setCellFormula({ row: 1, col: 1 }, '=1+1');
    const renderer = new CanvasRenderer(document.createElement('div'), worksheet, {
      debug: false,
    });
    const internals = renderer as any;
    jest.spyOn(internals, 'getVisibleCellAddresses').mockReturnValue([{ row: 1, col: 1 }]);
    const evaluateBatchOriginal = worksheet.evaluateBatch.bind(worksheet);
    const evaluateBatch = jest.fn(evaluateBatchOriginal);
    Object.defineProperty(worksheet, 'evaluateBatch', {
      configurable: true,
      value: evaluateBatch,
    });

    try {
      internals.evaluateVisibleFormulaCells();

      expect(evaluateBatch).toHaveBeenCalledWith([{ row: 1, col: 1 }]);
      expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe(2);
    } finally {
      renderer.dispose();
    }
  });
});
