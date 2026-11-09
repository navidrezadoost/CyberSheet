import React, { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { act, fireEvent, render } from '@testing-library/react';
import { DrawingLayer, Workbook, Worksheet, type WorkbookSheetView } from '@cyber-sheet/core';
import { DrawingCanvas, type DrawingCanvasHandle } from '../components/DrawingCanvas';

function makeCanvasContext() {
  const calls: Array<{ name: string; args: unknown[] }> = [];
  const ctx = new Proxy({}, {
    get(_target, property) {
      if (typeof property === 'string') return (...args: unknown[]) => calls.push({ name: property, args });
      return undefined;
    },
    set() { return true; },
  });
  return { ctx: ctx as CanvasRenderingContext2D, calls };
}

function setCanvasBounds(canvas: HTMLCanvasElement) {
  Object.defineProperty(canvas, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({ left: 0, top: 0, right: 240, bottom: 120, width: 240, height: 120, x: 0, y: 0, toJSON: () => ({}) }),
  });
}

describe('P1-08N DrawingCanvas snap caller and owner lifecycle', () => {
  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;
  let originalPath2D: unknown;
  let calls: Array<{ name: string; args: unknown[] }>;

  beforeEach(() => {
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    originalPath2D = (globalThis as any).Path2D;
    (globalThis as any).Path2D = class { constructor(_path: string) {} };
    const mock = makeCanvasContext();
    calls = mock.calls;
    (HTMLCanvasElement.prototype as any).getContext = jest.fn(() => mock.ctx);
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    if (originalPath2D === undefined) delete (globalThis as any).Path2D;
    else (globalThis as any).Path2D = originalPath2D;
  });

  test('actual standalone insert gesture snaps both axes at a boundary and commits the snapped object', () => {
    const worksheet = new Worksheet('Standalone', 2, 2);
    const layer = new DrawingLayer();
    const ref = createRef<DrawingCanvasHandle>();
    const mounted = render(<DrawingCanvas ref={ref} drawingLayer={layer} canvasWidth={240} canvasHeight={120} scrollLeft={0} scrollTop={0} zoom={1} worksheet={worksheet} />);
    const canvas = mounted.container.querySelector('canvas')!;
    setCanvasBounds(canvas);
    const width = worksheet.getColumnWidth(1);
    const height = worksheet.getRowHeight(1);
    const changed = jest.fn();
    layer.on('changed', changed);
    try {
      act(() => ref.current!.startShapeInsert('rect'));
      fireEvent.mouseDown(canvas, { clientX: width / 2, clientY: height / 2 });
      act(() => window.dispatchEvent(new MouseEvent('mousemove', { clientX: width / 2 + 1, clientY: height / 2 + 1 })));
      expect(calls).toContainEqual({ name: 'strokeRect', args: [0, 0, width, height] });

      act(() => window.dispatchEvent(new MouseEvent('mouseup', { clientX: width / 2 + 1, clientY: height / 2 + 1 })));
      expect(layer.getAllObjects()).toHaveLength(1);
      expect(layer.getAllObjects()[0]).toMatchObject({ type: 'shape', position: { x: 0, y: 0 }, size: { width, height } });
      expect(changed).toHaveBeenCalled();
    } finally {
      layer.off('changed', changed);
      mounted.unmount();
    }
  });

  test('mounted owner-view prop rejects the retained insert callback without writes; successful disposal cleans subscriptions', () => {
    const workbook = Workbook.create({ sheets: [{ name: 'Owner', rows: 2, cols: 2 }] });
    const ownerView = workbook.getSheet('Owner') as WorkbookSheetView;
    const layer = new DrawingLayer();
    const ref = createRef<DrawingCanvasHandle>();
    const layerOn = jest.spyOn(layer, 'on');
    const layerOff = jest.spyOn(layer, 'off');
    const changed = jest.fn();
    const onObjectChange = jest.fn();
    const mounted = render(<DrawingCanvas ref={ref} drawingLayer={layer} canvasWidth={240} canvasHeight={120} scrollLeft={0} scrollTop={0} zoom={1} worksheet={ownerView} onObjectChange={onObjectChange} />);
    const canvas = mounted.container.querySelector('canvas')!;
    setCanvasBounds(canvas);
    const width = ownerView.getColumnWidth(1);
    const height = ownerView.getRowHeight(1);
    const errors: string[] = [];
    const onError = (event: ErrorEvent) => { errors.push(event.message); event.preventDefault(); };
    const add = jest.spyOn(window, 'addEventListener');
    const remove = jest.spyOn(window, 'removeEventListener');
    window.addEventListener('error', onError);
    let retained: Array<{ type: string; listener: EventListenerOrEventListenerObject }> = [];
    const beforeObjects = layer.getAllObjects();
    try {
      act(() => ref.current!.startShapeInsert('rect'));
      fireEvent.mouseDown(canvas, { clientX: 50, clientY: 10 });
      const added = add.mock.calls.filter(([type]) => type === 'mousemove' || type === 'mouseup');
      retained = added.map(([type, listener]) => ({ type, listener: listener as EventListenerOrEventListenerObject }));
      act(() => window.dispatchEvent(new MouseEvent('mousemove', { clientX: 51, clientY: 11 })));
      expect(calls).toContainEqual({ name: 'strokeRect', args: [width, 0, 0, height] });

      act(() => window.dispatchEvent(new MouseEvent('mouseup', { clientX: 51, clientY: 11 })));
      expect(errors.some((message) => message.includes('Workbook-owned mutations are unavailable'))).toBe(true);
      expect(layer.getAllObjects()).toEqual(beforeObjects);
      expect(changed).not.toHaveBeenCalled();
      expect(onObjectChange).not.toHaveBeenCalled();
      // Completion cleanup must run even though owner preflight rejects.
      for (const { type, listener } of retained) {
        expect(remove.mock.calls.some(([removedType, removed]) => removedType === type && removed === listener)).toBe(true);
      }

      const retryStart = add.mock.calls.length;
      act(() => ref.current!.startShapeInsert('rect'));
      fireEvent.mouseDown(canvas, { clientX: 50, clientY: 10 });
      const retryListeners = add.mock.calls.slice(retryStart)
        .filter(([type]) => type === 'mousemove' || type === 'mouseup')
        .map(([type, listener]) => ({ type, listener: listener as EventListenerOrEventListenerObject }));
      expect(retryListeners).toHaveLength(2);
      act(() => window.dispatchEvent(new MouseEvent('mouseup', { clientX: 51, clientY: 11 })));
      expect(errors.filter((message) => message.includes('Workbook-owned mutations are unavailable'))).toHaveLength(2);
      for (const { type, listener } of retryListeners) {
        expect(remove.mock.calls.some(([removedType, removed]) => removedType === type && removed === listener)).toBe(true);
      }
      expect(layer.getAllObjects()).toEqual(beforeObjects);

      const internalSubscriptions = layerOn.mock.calls.filter(([event]) => event === 'changed' || event === 'selectionChanged');
      mounted.unmount();
      for (const [event, callback] of internalSubscriptions) {
        expect(layerOff).toHaveBeenCalledWith(event, callback);
      }
    } finally {
      // Remove defensively if an assertion interrupted the gesture.
      for (const { type, listener } of retained) window.removeEventListener(type, listener);
      window.removeEventListener('error', onError);
      add.mockRestore();
      remove.mockRestore();
      if (mounted.container.isConnected) mounted.unmount();
      layerOn.mockRestore();
      layerOff.mockRestore();
    }
  });

  test('removes temporary pointer listeners when drawing-layer insertion throws', () => {
    const worksheet = new Worksheet('Standalone', 2, 2);
    const layer = new DrawingLayer();
    const ref = createRef<DrawingCanvasHandle>();
    const mounted = render(<DrawingCanvas ref={ref} drawingLayer={layer} canvasWidth={240} canvasHeight={120} scrollLeft={0} scrollTop={0} zoom={1} worksheet={worksheet} />);
    const canvas = mounted.container.querySelector('canvas')!;
    setCanvasBounds(canvas);
    const add = jest.spyOn(window, 'addEventListener');
    const remove = jest.spyOn(window, 'removeEventListener');
    const addObject = jest.spyOn(layer, 'addObject').mockImplementation(() => {
      throw new Error('injected drawing-layer insertion failure');
    });
    try {
      act(() => ref.current!.startShapeInsert('rect'));
      fireEvent.mouseDown(canvas, { clientX: 20, clientY: 10 });
      const listeners = add.mock.calls
        .filter(([type]) => type === 'mousemove' || type === 'mouseup')
        .map(([type, listener]) => ({ type, listener: listener as EventListener }));
      expect(listeners).toHaveLength(2);

      const mouseUp = listeners.find(({ type }) => type === 'mouseup')!.listener as (event: MouseEvent) => void;
      expect(() => mouseUp(new MouseEvent('mouseup', { clientX: 30, clientY: 20 })))
        .toThrow('injected drawing-layer insertion failure');
      for (const { type, listener } of listeners) {
        expect(remove.mock.calls.filter(([removedType, removed]) => removedType === type && removed === listener)).toHaveLength(1);
      }
      expect(layer.getAllObjects()).toEqual([]);
      expect(addObject).toHaveBeenCalledTimes(1);
    } finally {
      addObject.mockRestore();
      add.mockRestore();
      remove.mockRestore();
      mounted.unmount();
    }
  });

  test('unmount while a standalone insertion is active removes its exact window listeners; cancel is idempotent', () => {
    const worksheet = new Worksheet('Standalone', 2, 2);
    const layer = new DrawingLayer();
    const ref = createRef<DrawingCanvasHandle>();
    const mounted = render(<DrawingCanvas ref={ref} drawingLayer={layer} canvasWidth={240} canvasHeight={120} scrollLeft={0} scrollTop={0} zoom={1} worksheet={worksheet} />);
    const canvas = mounted.container.querySelector('canvas')!;
    setCanvasBounds(canvas);
    const add = jest.spyOn(window, 'addEventListener');
    const remove = jest.spyOn(window, 'removeEventListener');
    try {
      act(() => ref.current!.startShapeInsert('rect'));
      fireEvent.mouseDown(canvas, { clientX: 20, clientY: 10 });
      const listeners = add.mock.calls.filter(([type]) => type === 'mousemove' || type === 'mouseup')
        .map(([type, listener]) => ({ type, listener: listener as EventListenerOrEventListenerObject }));
      expect(listeners).toHaveLength(2);
      act(() => ref.current!.cancelInsert());
      act(() => ref.current!.cancelInsert());
      for (const { type, listener } of listeners) {
        expect(remove.mock.calls.filter(([removedType, removed]) => removedType === type && removed === listener)).toHaveLength(1);
      }

      act(() => ref.current!.startShapeInsert('rect'));
      fireEvent.mouseDown(canvas, { clientX: 20, clientY: 10 });
      const unmountListeners = add.mock.calls.slice(-2).map(([type, listener]) => ({ type, listener: listener as EventListenerOrEventListenerObject }));
      expect(unmountListeners).toHaveLength(2);
      mounted.unmount();
      for (const { type, listener } of unmountListeners) {
        expect(remove.mock.calls.filter(([removedType, removed]) => removedType === type && removed === listener)).toHaveLength(1);
      }
    } finally {
      add.mockRestore();
      remove.mockRestore();
      if (mounted.container.isConnected) mounted.unmount();
    }
  });

  test('authority transition cancels a standalone gesture and a new gesture uses the Workbook view', () => {
    const standalone = new Worksheet('Standalone', 2, 2);
    standalone.setColumnWidth(1, 120);
    const workbook = Workbook.create({ sheets: [{ name: 'Owner', rows: 2, cols: 2 }] });
    const ownerView = workbook.getSheet('Owner') as WorkbookSheetView;
    const layer = new DrawingLayer();
    const ref = createRef<DrawingCanvasHandle>();
    const onObjectChange = jest.fn();
    const changed = jest.fn();
    layer.on('changed', changed);
    const add = jest.spyOn(window, 'addEventListener');
    const remove = jest.spyOn(window, 'removeEventListener');
    const errors: string[] = [];
    const onError = (event: ErrorEvent) => { errors.push(event.message); event.preventDefault(); };
    window.addEventListener('error', onError);
    const props = (worksheet: Worksheet | WorkbookSheetView) => (
      <DrawingCanvas ref={ref} drawingLayer={layer} canvasWidth={240} canvasHeight={120} scrollLeft={0} scrollTop={0} zoom={1} worksheet={worksheet} onObjectChange={onObjectChange} />
    );
    const mounted = render(props(standalone));
    const canvas = mounted.container.querySelector('canvas')!;
    setCanvasBounds(canvas);
    try {
      act(() => ref.current!.startShapeInsert('rect'));
      fireEvent.mouseDown(canvas, { clientX: 59, clientY: 9 });
      const oldListeners = add.mock.calls.filter(([type]) => type === 'mousemove' || type === 'mouseup')
        .map(([type, listener]) => ({ type, listener }));
      expect(oldListeners).toHaveLength(2);
      mounted.rerender(props(ownerView));
      act(() => window.dispatchEvent(new MouseEvent('mouseup', { clientX: 61, clientY: 11 })));

      for (const { type, listener } of oldListeners) {
        expect(remove.mock.calls.filter(([removedType, removed]) => removedType === type && removed === listener)).toHaveLength(1);
      }
      expect(layer.getAllObjects()).toEqual([]);
      expect(changed).not.toHaveBeenCalled();
      expect(onObjectChange).not.toHaveBeenCalled();

      act(() => ref.current!.startShapeInsert('rect'));
      fireEvent.mouseDown(canvas, { clientX: 59, clientY: 9 });
      act(() => window.dispatchEvent(new MouseEvent('mouseup', { clientX: 61, clientY: 11 })));
      expect(errors).toHaveLength(1);
      expect(layer.getAllObjects()).toEqual([]);
      expect(changed).not.toHaveBeenCalled();
      expect(onObjectChange).not.toHaveBeenCalled();
    } finally {
      layer.off('changed', changed);
      window.removeEventListener('error', onError);
      add.mockRestore();
      remove.mockRestore();
      mounted.unmount();
    }
  });

  test('unrelated rerender preserves the active standalone gesture', () => {
    const worksheet = new Worksheet('Standalone', 2, 2);
    const layer = new DrawingLayer();
    const ref = createRef<DrawingCanvasHandle>();
    const props = (scrollLeft: number) => <DrawingCanvas ref={ref} drawingLayer={layer} canvasWidth={240} canvasHeight={120} scrollLeft={scrollLeft} scrollTop={0} zoom={1} worksheet={worksheet} />;
    const mounted = render(props(0));
    const canvas = mounted.container.querySelector('canvas')!;
    setCanvasBounds(canvas);
    const add = jest.spyOn(window, 'addEventListener');
    const remove = jest.spyOn(window, 'removeEventListener');
    try {
      act(() => ref.current!.startShapeInsert('rect'));
      fireEvent.mouseDown(canvas, { clientX: 20, clientY: 10 });
      const listeners = add.mock.calls.filter(([type]) => type === 'mousemove' || type === 'mouseup')
        .map(([type, listener]) => ({ type, listener }));
      expect(listeners).toHaveLength(2);
      mounted.rerender(props(0));
      for (const { type, listener } of listeners) {
        expect(remove.mock.calls.some(([removedType, removed]) => removedType === type && removed === listener)).toBe(false);
      }
      act(() => window.dispatchEvent(new MouseEvent('mouseup', { clientX: 40, clientY: 30 })));
      expect(layer.getAllObjects()).toHaveLength(1);
    } finally {
      add.mockRestore();
      remove.mockRestore();
      mounted.unmount();
    }
  });

  test('replacing insertion mode removes the previous gesture callbacks and cancellation during movement cannot commit', () => {
    const worksheet = new Worksheet('Standalone', 2, 2);
    const layer = new DrawingLayer();
    const ref = createRef<DrawingCanvasHandle>();
    const mounted = render(<DrawingCanvas ref={ref} drawingLayer={layer} canvasWidth={240} canvasHeight={120} scrollLeft={0} scrollTop={0} zoom={1} worksheet={worksheet} />);
    const canvas = mounted.container.querySelector('canvas')!;
    setCanvasBounds(canvas);
    const add = jest.spyOn(window, 'addEventListener');
    const remove = jest.spyOn(window, 'removeEventListener');
    try {
      act(() => ref.current!.startShapeInsert('rect'));
      fireEvent.mouseDown(canvas, { clientX: 20, clientY: 10 });
      const firstListeners = add.mock.calls.filter(([type]) => type === 'mousemove' || type === 'mouseup')
        .map(([type, listener]) => ({ type, listener }));
      expect(firstListeners).toHaveLength(2);
      act(() => window.dispatchEvent(new MouseEvent('mousemove', { clientX: 30, clientY: 20 })));
      act(() => ref.current!.startShapeInsert('ellipse'));
      for (const { type, listener } of firstListeners) {
        expect(remove.mock.calls.filter(([removedType, removed]) => removedType === type && removed === listener)).toHaveLength(1);
      }
      act(() => window.dispatchEvent(new MouseEvent('mouseup', { clientX: 40, clientY: 30 })));
      expect(layer.getAllObjects()).toEqual([]);

      fireEvent.mouseDown(canvas, { clientX: 20, clientY: 10 });
      act(() => window.dispatchEvent(new MouseEvent('mousemove', { clientX: 30, clientY: 20 })));
      act(() => ref.current!.cancelInsert());
      act(() => window.dispatchEvent(new MouseEvent('mouseup', { clientX: 40, clientY: 30 })));
      expect(layer.getAllObjects()).toEqual([]);
    } finally {
      add.mockRestore();
      remove.mockRestore();
      mounted.unmount();
    }
  });

});
