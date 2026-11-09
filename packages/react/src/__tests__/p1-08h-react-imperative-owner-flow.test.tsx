import React, { createRef } from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { Workbook, type Address, type Command } from '@cyber-sheet/core';
import { CyberSheet, type CyberSheetHandle } from '../CyberSheet';

jest.mock('@cyber-sheet/renderer-canvas', () => ({
  CanvasRenderer: class {
    readonly sheet: unknown;
    readonly options: unknown;
    private selectionListener?: (selections: Array<{ start: Address; end: Address }>) => void;
    private scrollListener?: (event: { x: number; maxX: number; y?: number; maxY?: number }) => void;
    private scroll = { x: 0, y: 0 };
    disposed = false;
    constructor(_container: HTMLElement, sheet: unknown, options: unknown) {
      this.sheet = sheet;
      this.options = options;
    }
    getScroll() { return this.scroll; }
    getMaxScroll() { return { x: 200, y: 0 }; }
    getContentSize() { return { width: 300, height: 100 }; }
    getViewportSize() { return { width: 100, height: 100 }; }
    hitTest() { return { type: 'cell', addr: { row: 1, col: 1 } }; }
    cellAt() { return { row: 2, col: 2 }; }
    rectForRange() { return { x: 60, y: 40, w: 80, h: 20 }; }
    get optionsReadonly() { return { headerWidth: 48, headerHeight: 24 }; }
    setScroll() {}
    onSelectionChange(listener: (selections: Array<{ start: Address; end: Address }>) => void) {
      this.selectionListener = listener;
      return { dispose: () => { this.selectionListener = undefined; } };
    }
    onScrollChange(listener: (event: { x: number; maxX: number; y?: number; maxY?: number }) => void) {
      this.scrollListener = listener;
      return { dispose: () => { this.scrollListener = undefined; } };
    }
    emitScroll(x: number) {
      this.scroll = { x, y: 0 };
      this.scrollListener?.({ x, maxX: 200, y: 0, maxY: 0 });
    }
    setSelections(selections: Array<{ start: Address; end: Address }>) {
      this.selectionListener?.(selections);
    }
    setZoom() {}
    setViewMode() {}
    scrollBy() {}
    dispose() { this.disposed = true; }
  },
}));

describe('P1-08H.05 mounted CyberSheet imperative owner flow', () => {
  afterEach(() => cleanup());

  test('exposes the issued view, selection callback, and bounded imperative methods', () => {
    const workbook = Workbook.create({ sheets: [{ name: 'H05', rows: 4, cols: 4 }] });
    const handle = createRef<CyberSheetHandle>();
    const selections: Array<{ start: Address; end: Address }> = [];
    let renderer: any;
    const { unmount, container } = render(
      <CyberSheet
        ref={handle}
        workbook={workbook}
        onSelectionChange={(selection) => selections.push(selection)}
        onRendererReady={(value) => { renderer = value; }}
      />,
    );

    expect(handle.current).toBeDefined();
    expect(handle.current!.getWorkbook()).toBe(workbook);
    expect(handle.current!.getActiveSheet()).toBe(workbook.activeSheet);
    expect(renderer.sheet).toBe(workbook.activeSheet);

    const selection = { start: { row: 2, col: 2 }, end: { row: 2, col: 3 } };
    act(() => renderer.setSelections([selection]));
    expect(selections).toContainEqual(selection);
    act(() => renderer.emitScroll(40));
    const horizontalScrollbar = container.querySelector('div[style*="overflow-x: auto"]') as HTMLDivElement;
    expect(horizontalScrollbar.scrollLeft).toBe(40);

    const component = { id: 'h05-icon', type: 'icon' as const, props: { source: 'star' } };
    handle.current!.registerComponent('h05-icon', { type: 'icon', render: () => null } as any);
    expect(handle.current!.listRegisteredComponents()).toContain('h05-icon');
    expect(handle.current!.getCellComponent({ row: 1, col: 1 })).toBeUndefined();
    handle.current!.unregisterComponent('h05-icon');
    expect(handle.current!.listRegisteredComponents()).not.toContain('h05-icon');

    expect(() => handle.current!.setCellComponent({ row: 1, col: 1 }, component)).toThrow(/R5 metadata journal slice/);
    expect(() => handle.current!.clearCellComponent({ row: 1, col: 1 })).toThrow(/R5 metadata journal slice/);
    const command: Command = { execute: jest.fn(), undo: jest.fn() };
    expect(() => handle.current!.executeCommand(command)).toThrow(/journal-backed mutation slice/);
    expect(command.execute).not.toHaveBeenCalled();
    expect(workbook.activeSheet!.getCellComponent({ row: 1, col: 1 })).toBeUndefined();

    const event = jest.fn();
    const unsubscribe = handle.current!.on('sheet-mutated', event);
    expect(typeof unsubscribe).toBe('function');
    handle.current!.off('sheet-mutated', event);
    const onceEvent = jest.fn();
    handle.current!.once('sheet-mutated', onceEvent);
    expect(onceEvent).not.toHaveBeenCalled();

    unmount();
    expect(renderer.disposed).toBe(true);
    expect(renderer.scrollListener).toBeUndefined();
  });

  test('a rejected post-publication add-sheet attempt does not publish or mutate the active view', () => {
    const workbook = Workbook.create({ sheets: [{ name: 'H05', rows: 4, cols: 4 }] });
    const handle = createRef<CyberSheetHandle>();
    render(<CyberSheet ref={handle} workbook={workbook} />);
    const event = jest.fn();
    const dispose = handle.current!.on('sheet-added', event);
    const before = handle.current!.getActiveSheet();
    expect(() => workbook.addSheet('Rejected')).toThrow(/sheet-lifecycle journal slice/);
    expect(handle.current!.getActiveSheet()).toBe(before);
    expect(event).not.toHaveBeenCalled();
    dispose();
    expect(workbook.getSheet('Rejected')).toBeUndefined();
  });
});
