import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { Workbook } from '@cyber-sheet/core';
import { CyberSheet, type CyberSheetHandle } from '../CyberSheet';

jest.mock('@cyber-sheet/renderer-canvas', () => ({
  CanvasRenderer: class {
    scroll = { x: 0, y: 0 };
    disposed = false;
    constructor(_container: HTMLElement) {}
    getScroll() { return { ...this.scroll }; }
    setScroll(x: number, y: number) { this.scroll = { x, y }; }
    getMaxScroll() { return { x: 500, y: 500 }; }
    getContentSize() { return { width: 800, height: 800 }; }
    getViewportSize() { return { width: 300, height: 300 }; }
    onSelectionChange() { return { dispose() {} }; }
    onScrollChange() { return { dispose() {} }; }
    setZoom() {}
    setViewMode() {}
    dispose() { this.disposed = true; }
  },
}));

function touchEvent(type: string, touches: Array<{ clientX: number; clientY: number }>): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', { value: touches });
  return event;
}

describe('P1-08S mounted CyberSheet touch lifecycle', () => {
  afterEach(() => cleanup());

  test('two-finger center drives mounted pan movement and touchend clears the interaction', () => {
    const workbook = Workbook.create({ sheets: [{ name: 'S', rows: 8, cols: 8 }] });
    let renderer: any;
    const { container } = render(<CyberSheet workbook={workbook} physicsOptions={{ allowTouch: true, touchPanWithTwoFingers: true }} onRendererReady={(r) => { renderer = r; }} />);
    const target = container.querySelector('div[style*="position: absolute"]') as HTMLDivElement;
    expect(target).toBeTruthy();

    act(() => target.dispatchEvent(touchEvent('touchstart', [{ clientX: 40, clientY: 60 }, { clientX: 100, clientY: 120 }])));
    const move = touchEvent('touchmove', [{ clientX: 50, clientY: 70 }, { clientX: 130, clientY: 150 }]);
    act(() => target.dispatchEvent(move));
    expect(move.defaultPrevented).toBe(true);
    expect(renderer.getScroll()).toEqual({ x: -20, y: -20 });

    act(() => target.dispatchEvent(touchEvent('touchend', [])));
    const previousScroll = renderer.getScroll();
    act(() => target.dispatchEvent(touchEvent('touchmove', [{ clientX: 70, clientY: 90 }, { clientX: 150, clientY: 170 }])));
    expect(renderer.getScroll()).toEqual(previousScroll);
  });

  test('rerender disposes old touch listeners and installs the updated single-finger path', () => {
    const workbook = Workbook.create({ sheets: [{ name: 'S', rows: 8, cols: 8 }] });
    let renderer: any;
    const { container, rerender, unmount } = render(<CyberSheet workbook={workbook} physicsOptions={{ allowTouch: true, touchPanWithTwoFingers: true }} onRendererReady={(r) => { renderer = r; }} />);
    const target = container.querySelector('div[style*="position: absolute"]') as HTMLDivElement;
    const remove = jest.spyOn(target, 'removeEventListener');
    rerender(<CyberSheet workbook={workbook} physicsOptions={{ allowTouch: true, touchPanWithTwoFingers: false }} onRendererReady={(r) => { renderer = r; }} />);
    expect(remove).toHaveBeenCalledWith('touchstart', expect.any(Function));

    act(() => target.dispatchEvent(touchEvent('touchstart', [{ clientX: 100, clientY: 100 }])));
    const move = touchEvent('touchmove', [{ clientX: 90, clientY: 85 }]);
    act(() => target.dispatchEvent(move));
    expect(move.defaultPrevented).toBe(true);
    expect(renderer.getScroll()).toEqual({ x: 10, y: 15 });
    const removeBeforeUnmount = remove.mock.calls.length;
    unmount();
    expect(remove.mock.calls.length).toBeGreaterThan(removeBeforeUnmount);
  });
});
