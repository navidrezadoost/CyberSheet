import { mockCanvas } from '@cyber-sheet/test-utils';
import { Worksheet } from '@cyber-sheet/core';
import { adoptWorksheetByWorkbook } from '../../core/src/worksheet';
import { CanvasRenderer } from '../src/CanvasRenderer';
import { ExcelRenderer } from '../src/ExcelRenderer';
import { createRenderPluginContext } from '../src/plugins';
import type { RenderPlugin } from '../src/plugins';

describe('render plugin argument isolation', () => {
  beforeAll(() => mockCanvas());

  function setViewport(container: HTMLElement) {
    Object.defineProperty(container, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 500, configurable: true });
  }

  it('detaches nested supported containers, cycles, symbols, and accessor-backed properties', () => {
    const symbolKey = Symbol('plugin-data');
    const original: Record<PropertyKey, any> = { label: 'original' };
    const date = new Date('2020-01-02T00:00:00.000Z');
    const map = new Map<any, any>([['nested', { value: 1 }]]);
    const set = new Set<any>([{ value: 2 }]);
    original.date = date;
    original.map = map;
    original.set = set;
    original.self = original;
    original[symbolKey] = { value: 3 };
    const getter = jest.fn(() => 'must not execute');
    Object.defineProperty(original, 'computed', { enumerable: true, get: getter });

    const style = { border: { top: { color: '#123456' } } } as any;
    const context = createRenderPluginContext({ row: 1, col: 1 }, original as any, style);
    const detached = context.value as any;

    expect(detached).not.toBe(original);
    expect(detached.self).toBe(detached);
    expect(detached.date).not.toBe(date);
    expect(detached.date.getTime()).toBe(date.getTime());
    expect(detached.map).not.toBe(map);
    expect(detached.map.get('nested')).not.toBe(map.get('nested'));
    expect(detached.set).not.toBe(set);
    expect([...detached.set][0]).not.toBe([...set][0]);
    expect(detached[symbolKey]).not.toBe(original[symbolKey]);
    expect(Object.prototype.hasOwnProperty.call(detached, 'computed')).toBe(false);
    expect(getter).not.toHaveBeenCalled();
    expect(context.style).not.toBe(style);
    expect(context.style?.border).not.toBe(style.border);
  });

  it('isolates retained callback values, styles, and addresses in CanvasRenderer', () => {
    const container = document.createElement('div');
    setViewport(container);
    const worksheet = new Worksheet('CanvasPluginIsolation', 4, 4);
    const address = { row: 1, col: 1 };
    worksheet.setCellValue(address, { runs: [{ text: 'original', style: { bold: true } }] } as any);
    worksheet.setCellStyle(address, { bold: true, fill: '#eeeeee', border: { top: { color: '#123456' } } });
    const contexts: Array<{ addr: { row: number; col: number }; value: any; style?: any }> = [];
    const retain = (_value: string, context: { addr: { row: number; col: number }; value: any; style?: any }) => {
      contexts.push(context);
      return '#12abef';
    };
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const renderer = new CanvasRenderer(container, worksheet, { debug: false });
    renderer.addPlugin({
      id: 'retaining-plugin',
      getCellBackground: (context) => { contexts.push(context); return undefined; },
      transformColor: retain,
      transformFont: (_font, context) => { contexts.push(context); return _font; },
      afterCellRender: (_ctx, _rect, context) => { contexts.push(context); },
    });
    renderer.redraw();

    expect(contexts.length).toBeGreaterThan(0);
    expect(contexts.some((context) => context.value?.runs?.[0])).toBe(true);
    adoptWorksheetByWorkbook(worksheet, 'canvas-plugin-isolation-owner');
    const storedValue = worksheet.getCellValue(address) as any;
    const storedStyle = worksheet.getCellStyle(address) as any;
    for (const context of contexts) {
      expect(context.addr).not.toBe(address);
      expect(context.style).not.toBe(storedStyle);
      expect(context.value).not.toBe(storedValue);
    }
    for (const context of contexts) {
      context.addr.row = 99;
      if (context.value?.runs?.[0]) context.value.runs[0].text = 'mutated';
      if (context.style?.border?.top) context.style.border.top.color = '#ff0000';
    }
    expect((worksheet.getCellValue(address) as any).runs[0].text).toBe('original');
    expect((worksheet.getCellStyle(address) as any).border.top.color).toBe('#123456');
    renderer.dispose();
    process.env.NODE_ENV = previousNodeEnv;
  });

  it('isolates retained callback values, styles, and addresses in ExcelRenderer', () => {
    const container = document.createElement('div');
    setViewport(container);
    const worksheet = new Worksheet('ExcelPluginIsolation', 4, 4);
    const address = { row: 1, col: 1 };
    worksheet.setCellValue(address, { runs: [{ text: 'original', style: { bold: true } }] } as any);
    worksheet.setCellStyle(address, { bold: true, fill: '#eeeeee', border: { top: { color: '#123456' } } });
    const contexts: Array<{ addr: { row: number; col: number }; value: any; style?: any }> = [];
    const plugin: RenderPlugin = {
      id: 'excel-retaining-plugin',
      getCellBackground: (context) => { contexts.push(context); return undefined; },
      transformColor: (_color, context) => { contexts.push(context); return '#12abef'; },
      transformFont: (_font, context) => { contexts.push(context); return _font; },
      afterCellRender: (_ctx, _rect, context) => { contexts.push(context); },
    };
    const renderer = new ExcelRenderer(container, worksheet, { debug: false });
    const internals = renderer as any;
    if (internals.rafId != null) cancelAnimationFrame(internals.rafId);
    internals.rafId = null;
    for (const [layer, context] of internals.multiCanvas.contexts as Map<string, any>) {
      context.canvas = internals.multiCanvas.getCanvas(layer);
    }
    internals.plugins.push(plugin);
    internals.performRender(['content']);

    expect(contexts.length).toBeGreaterThan(0);
    expect(internals.multiCanvas.getContext('content').fillStyle).toBe('#12abef');
    expect(contexts.some((context) => context.value?.runs?.[0])).toBe(true);
    adoptWorksheetByWorkbook(worksheet, 'excel-plugin-isolation-owner');
    const storedValue = worksheet.getCellValue(address) as any;
    const storedStyle = worksheet.getCellStyle(address) as any;
    for (const context of contexts) {
      expect(context.addr).not.toBe(address);
      expect(context.style).not.toBe(storedStyle);
      expect(context.value).not.toBe(storedValue);
      context.addr.col = 99;
      if (context.value?.runs?.[0]) context.value.runs[0].text = 'mutated';
      if (context.style?.border?.top) context.style.border.top.color = '#ff0000';
    }
    expect((worksheet.getCellValue(address) as any).runs[0].text).toBe('original');
    expect((worksheet.getCellStyle(address) as any).border.top.color).toBe('#123456');
    renderer.dispose();
  });
});
