import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { Workbook } from '@cyber-sheet/core';
import { CanvasRenderer } from '@cyber-sheet/renderer-canvas';
import { CyberSheet } from '../CyberSheet';

jest.mock('@cyber-sheet/renderer-canvas', () => {
  const MockCanvasRenderer = jest.fn().mockImplementation(() => ({
    getScroll: () => ({ x: 0, y: 0 }),
    getMaxScroll: () => ({ x: 0, y: 0 }),
    getContentSize: () => ({ width: 0, height: 0 }),
    getViewportSize: () => ({ width: 0, height: 0 }),
    onSelectionChange: () => ({ dispose: jest.fn() }),
    onScrollChange: () => ({ dispose: jest.fn() }),
    dispose: jest.fn(),
    scrollBy: jest.fn(),
  }));
  return { CanvasRenderer: MockCanvasRenderer };
});

function makeWorkbook(): Workbook {
  return Workbook.create({ sheets: [{ name: 'Sheet1', rows: 4, cols: 4 }] });
}

describe('CyberSheet formula-worker distribution boundary', () => {
  let workerConstructor: jest.Mock;
  let previousWorkerDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    previousWorkerDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'Worker');
    workerConstructor = jest.fn(() => {
      throw new Error('The default React path must not construct a Worker');
    });
    Object.defineProperty(globalThis, 'Worker', {
      configurable: true,
      writable: true,
      value: workerConstructor,
    });
  });

  afterEach(() => {
    cleanup();
    if (previousWorkerDescriptor) {
      Object.defineProperty(globalThis, 'Worker', previousWorkerDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, 'Worker');
    }
  });

  test('does not construct a default worker or pass a default factory to CanvasRenderer', () => {
    const { unmount } = render(<CyberSheet workbook={makeWorkbook()} />);
    const rendererMock = CanvasRenderer as unknown as jest.Mock;
    const options = rendererMock.mock.calls[0][2];

    expect(options.formulaWorkerFactory).toBeUndefined();
    expect(workerConstructor).not.toHaveBeenCalled();
    unmount();
    expect(rendererMock.mock.results[0].value.dispose).toHaveBeenCalledTimes(1);
  });

  test('passes a caller-supplied worker factory through unchanged and disposes the renderer', () => {
    const factory = jest.fn(() => ({
      setCellValue: jest.fn().mockResolvedValue(undefined),
      setCellFormula: jest.fn().mockResolvedValue(undefined),
      evaluateBatch: jest.fn().mockResolvedValue({
        values: new Float64Array(),
        evaluated: 0,
        hasCycles: false,
      }),
    }));
    const { unmount } = render(
      <CyberSheet
        workbook={makeWorkbook()}
        rendererOptions={{ formulaWorkerFactory: factory }}
      />,
    );
    const rendererMock = CanvasRenderer as unknown as jest.Mock;

    expect(rendererMock.mock.calls[0][2].formulaWorkerFactory).toBe(factory);
    expect(factory).not.toHaveBeenCalled();
    expect(workerConstructor).not.toHaveBeenCalled();
    unmount();
    expect(rendererMock.mock.results[0].value.dispose).toHaveBeenCalledTimes(1);
  });
});
