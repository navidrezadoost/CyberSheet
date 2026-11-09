/// <reference types="jest" />
import { Worksheet } from '@cyber-sheet/core';
import { CanvasRenderer } from '../src/CanvasRenderer';

describe('CanvasRenderer construction failure boundary (P1-08BB)', () => {
  const originalResizeObserver = globalThis.ResizeObserver;

  afterEach(() => {
    globalThis.ResizeObserver = originalResizeObserver;
    jest.restoreAllMocks();
  });

  function container(): HTMLDivElement {
    const element = document.createElement('div');
    Object.defineProperty(element, 'clientWidth', { value: 640, configurable: true });
    Object.defineProperty(element, 'clientHeight', { value: 480, configurable: true });
    return element;
  }

  it('leaves the already-attached canvas observable when ResizeObserver construction throws, then permits clean retry and disposal', () => {
    const host = container();
    const failure = new Error('controlled ResizeObserver construction failure');
    const observerConstruction = jest.fn(() => {
      throw failure;
    });
    globalThis.ResizeObserver = observerConstruction as unknown as typeof ResizeObserver;

    const canvasAdds: string[] = [];
    const canvasRemoves: string[] = [];
    const addListener = jest.spyOn(HTMLCanvasElement.prototype, 'addEventListener');
    const removeListener = jest.spyOn(HTMLCanvasElement.prototype, 'removeEventListener');
    addListener.mockImplementation(function (this: HTMLCanvasElement, type: string, ...args: any[]) {
      canvasAdds.push(type);
      return EventTarget.prototype.addEventListener.call(this, type, args[0], args[1]);
    });
    removeListener.mockImplementation(function (this: HTMLCanvasElement, type: string, ...args: any[]) {
      canvasRemoves.push(type);
      return EventTarget.prototype.removeEventListener.call(this, type, args[0], args[1]);
    });

    expect(() => new CanvasRenderer(host, new Worksheet('Failure', 4, 4), { debug: false })).toThrow(failure);
    expect(observerConstruction).toHaveBeenCalledTimes(1);
    expect(host.querySelectorAll('canvas')).toHaveLength(1);
    expect(canvasAdds).toEqual([]);
    const failedAttemptCanvas = host.querySelector('canvas');
    expect(failedAttemptCanvas).not.toBeNull();

    let disconnected = false;
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() { disconnected = true; }
    };
    const renderer = new CanvasRenderer(host, new Worksheet('Retry', 4, 4), { debug: false });
    expect(host.querySelectorAll('canvas')).toHaveLength(2);
    expect(canvasAdds).toContain('mousedown');

    renderer.dispose();
    expect(host.querySelectorAll('canvas')).toHaveLength(1);
    expect(host.querySelector('canvas')).toBe(failedAttemptCanvas);
    expect(disconnected).toBe(true);
    expect(canvasRemoves).toEqual(canvasAdds);
  });

  it('fails before container attachment when the platform returns no 2D context', () => {
    const host = container();
    const getContext = jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    expect(() => new CanvasRenderer(host, new Worksheet('NoContext', 2, 2), { debug: false }))
      .toThrow('Canvas 2D context not available');
    expect(getContext).toHaveBeenCalledWith('2d');
    expect(host.querySelector('canvas')).toBeNull();
  });

  it('propagates a drawing-layer subscription failure after attachment and DOM listener installation', () => {
    const host = container();
    const failure = new Error('controlled drawing-layer subscription failure');
    let observerInstance: {
      observe: jest.Mock;
      disconnect: jest.Mock;
      unobserve: jest.Mock;
    } | undefined;
    const observe = jest.fn();
    const disconnect = jest.fn();
    const unobserve = jest.fn();
    globalThis.ResizeObserver = class {
      constructor() {
        observerInstance = { observe, disconnect, unobserve };
      }
      observe = observe;
      disconnect = disconnect;
      unobserve = unobserve;
    } as unknown as typeof ResizeObserver;

    const canvasAdd = jest.spyOn(HTMLCanvasElement.prototype, 'addEventListener');
    const canvasRemove = jest.spyOn(HTMLCanvasElement.prototype, 'removeEventListener');
    const windowAdd = jest.spyOn(window, 'addEventListener');
    const windowRemove = jest.spyOn(window, 'removeEventListener');
    const documentAdd = jest.spyOn(document, 'addEventListener');
    const documentRemove = jest.spyOn(document, 'removeEventListener');
    const layerOn = jest.fn(() => { throw failure; });
    const layerOff = jest.fn();
    const drawingLayer = {
      getAllObjects: () => [],
      on: layerOn,
      off: layerOff,
    };

    let failedCanvas: HTMLCanvasElement | null = null;
    try {
      expect(() => new CanvasRenderer(host, new Worksheet('LateFailure', 4, 4), {
        debug: false,
        drawingLayer,
      })).toThrow(failure);

      failedCanvas = host.querySelector('canvas');
      expect(failedCanvas).not.toBeNull();
      expect(canvasAdd.mock.calls.map(([type]) => type)).toEqual([
        'mousedown', 'mousemove', 'mouseup', 'click', 'dblclick', 'contextmenu',
      ]);
      expect(windowAdd.mock.calls.map(([type]) => type)).toContain('mouseup');
      expect(documentAdd.mock.calls.map(([type]) => type)).toContain('visibilitychange');
      expect(canvasRemove).not.toHaveBeenCalled();
      expect(windowRemove).not.toHaveBeenCalled();
      expect(documentRemove).not.toHaveBeenCalled();
      expect(observerInstance).toBeDefined();
      expect(observe).toHaveBeenCalledTimes(1);
      expect(disconnect).not.toHaveBeenCalled();
      expect(layerOn).toHaveBeenCalledWith('changed', expect.any(Function));
      expect(layerOff).not.toHaveBeenCalled();
    } finally {
      failedCanvas ??= host.querySelector('canvas');
      const canvasAdds = canvasAdd.mock.calls.map(([type, listener, options]) => [type, listener, options] as const);
      const windowAdds = windowAdd.mock.calls.map(([type, listener, options]) => [type, listener, options] as const);
      const documentAdds = documentAdd.mock.calls.map(([type, listener, options]) => [type, listener, options] as const);
      canvasAdd.mockRestore();
      canvasRemove.mockRestore();
      windowAdd.mockRestore();
      windowRemove.mockRestore();
      documentAdd.mockRestore();
      documentRemove.mockRestore();
      for (const [type, listener, options] of canvasAdds) {
        if (listener) failedCanvas?.removeEventListener(type, listener, options);
      }
      for (const [type, listener, options] of windowAdds) {
        if (listener) window.removeEventListener(type, listener, options);
      }
      for (const [type, listener, options] of documentAdds) {
        if (listener) document.removeEventListener(type, listener, options);
      }
      disconnect();
      failedCanvas?.remove();
    }
  });
});
