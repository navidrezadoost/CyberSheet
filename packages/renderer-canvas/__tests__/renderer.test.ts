import { mockCanvas } from '@cyber-sheet/test-utils';
import { Workbook } from '@cyber-sheet/core';
import { CanvasRenderer } from '../src/CanvasRenderer';

describe('CanvasRenderer', () => {
  beforeAll(() => {
    mockCanvas();
  });

  it('creates renderer instance without crashing', () => {
    const container = document.createElement('div');
    const workbook = new Workbook();
    const sheet = workbook.addSheet('Sheet1');
    const renderer = new CanvasRenderer(container, sheet, { debug: false });
    expect(renderer).toBeTruthy();
  });

  it('resizes all columns when full sheet is selected', () => {
    const container = document.createElement('div');
    const workbook = new Workbook();
    const sheet = workbook.addSheet('Sheet1');
    const renderer = new CanvasRenderer(container, sheet, { debug: false });
    const anyRenderer = renderer as any;

    const canvas = anyRenderer.canvas as HTMLCanvasElement;
    canvas.getBoundingClientRect = () => ({
      left: 0, top: 0, right: 1000, bottom: 600, width: 1000, height: 600, x: 0, y: 0, toJSON: () => ({})
    } as DOMRect);

    renderer.setSelections([{
      start: { row: 1, col: 1 },
      end: { row: sheet.rowCount, col: sheet.colCount },
    }]);

    const startWidth = sheet.getColumnWidth(1);
    const resizeHandleX = 48 + startWidth;

    anyRenderer.handleMouseDown(new MouseEvent('mousedown', { clientX: resizeHandleX, clientY: 10 }));
    anyRenderer.pendingMouseX = resizeHandleX + 30;
    anyRenderer.pendingMouseY = 10;
    anyRenderer.processHover();
    anyRenderer.handleMouseUp(new MouseEvent('mouseup', { clientX: resizeHandleX + 30, clientY: 10 }));

    expect(sheet.getColumnWidth(1)).toBe(startWidth + 30);
    expect(sheet.getColumnWidth(2)).toBe(startWidth + 30);
    expect(sheet.getColumnWidth(sheet.colCount)).toBe(startWidth + 30);
  });

  it('resizes all rows when full sheet is selected', () => {
    const container = document.createElement('div');
    const workbook = new Workbook();
    const sheet = workbook.addSheet('Sheet1');
    const renderer = new CanvasRenderer(container, sheet, { debug: false });
    const anyRenderer = renderer as any;

    const canvas = anyRenderer.canvas as HTMLCanvasElement;
    canvas.getBoundingClientRect = () => ({
      left: 0, top: 0, right: 1000, bottom: 600, width: 1000, height: 600, x: 0, y: 0, toJSON: () => ({})
    } as DOMRect);

    renderer.setSelections([{
      start: { row: 1, col: 1 },
      end: { row: sheet.rowCount, col: sheet.colCount },
    }]);

    const startHeight = sheet.getRowHeight(1);
    const resizeHandleY = 24 + startHeight;

    anyRenderer.handleMouseDown(new MouseEvent('mousedown', { clientX: 10, clientY: resizeHandleY }));
    anyRenderer.pendingMouseX = 10;
    anyRenderer.pendingMouseY = resizeHandleY + 20;
    anyRenderer.processHover();
    anyRenderer.handleMouseUp(new MouseEvent('mouseup', { clientX: 10, clientY: resizeHandleY + 20 }));

    expect(sheet.getRowHeight(1)).toBe(startHeight + 20);
    expect(sheet.getRowHeight(2)).toBe(startHeight + 20);
    expect(sheet.getRowHeight(sheet.rowCount)).toBe(startHeight + 20);
  });
});
