/**
 * Tests for ChartRenderer
 * Week 12 Day 3: Canvas Integration
 */

import { ChartRenderer } from '../src/ChartRenderer';
import { ChartEngine } from '../src/ChartEngine';
import { ChartManager } from '../src/ChartManager';
import { Worksheet } from '@cyber-sheet/core';
import type { ChartObject, WorkbookId, WorksheetId } from '@cyber-sheet/core';
import { adoptWorksheetByWorkbook } from '../../core/src/worksheet';
import { OwnerBackedWorkbookSheetView } from '../../core/src/WorkbookSheetView';

// Mock OffscreenCanvas and HTMLCanvasElement
class MockCanvas {
  width = 0;
  height = 0;
  private ctx: MockCanvasRenderingContext2D;

  constructor(width?: number, height?: number) {
    if (width) this.width = width;
    if (height) this.height = height;
    this.ctx = new MockCanvasRenderingContext2D();
  }

  getContext(type: string): MockCanvasRenderingContext2D | null {
    return type === '2d' ? this.ctx : null;
  }
}

class MockCanvasRenderingContext2D {
  private drawCalls: any[] = [];
  fillStyle = '#000000';
  strokeStyle = '#000000';
  lineWidth = 1;
  font = '10px sans-serif';
  textAlign = 'left';
  textBaseline = 'alphabetic';

  beginPath() { this.drawCalls.push({ type: 'beginPath' }); }
  moveTo(x: number, y: number) { this.drawCalls.push({ type: 'moveTo', x, y }); }
  lineTo(x: number, y: number) { this.drawCalls.push({ type: 'lineTo', x, y }); }
  arc(x: number, y: number, r: number, start: number, end: number) {
    this.drawCalls.push({ type: 'arc', x, y, r, start, end });
  }
  fill() { this.drawCalls.push({ type: 'fill' }); }
  stroke() { this.drawCalls.push({ type: 'stroke' }); }
  fillRect(x: number, y: number, w: number, h: number) {
    this.drawCalls.push({ type: 'fillRect', x, y, w, h, fillStyle: this.fillStyle });
  }
  strokeRect(x: number, y: number, w: number, h: number) {
    this.drawCalls.push({ type: 'strokeRect', x, y, w, h, strokeStyle: this.strokeStyle });
  }
  fillText(text: string, x: number, y: number) {
    this.drawCalls.push({ type: 'fillText', text, x, y });
  }
  clearRect(x: number, y: number, w: number, h: number) {
    this.drawCalls.push({ type: 'clearRect', x, y, w, h });
  }
  drawImage(image: any, x: number, y: number) {
    this.drawCalls.push({ type: 'drawImage', x, y });
  }
  save() { this.drawCalls.push({ type: 'save' }); }
  restore() { this.drawCalls.push({ type: 'restore' }); }
  setLineDash(segments: number[]) {
    this.drawCalls.push({ type: 'setLineDash', segments });
  }

  getDrawCalls() { return this.drawCalls; }
  clearDrawCalls() { this.drawCalls = []; }
}

// Mock OffscreenCanvas globally
(global as any).OffscreenCanvas = MockCanvas;

describe('ChartRenderer', () => {
  let worksheet: Worksheet;
  let renderer: ChartRenderer;
  let mockCtx: MockCanvasRenderingContext2D;
  let chart: ChartObject;

  beforeEach(() => {
    worksheet = new Worksheet('TestSheet');
    renderer = new ChartRenderer(worksheet);
    mockCtx = new MockCanvasRenderingContext2D();

    // Setup test data
    worksheet.setCellValue({ row: 1, col: 1 }, 'Category');
    worksheet.setCellValue({ row: 1, col: 2 }, 'Sales');
    worksheet.setCellValue({ row: 2, col: 1 }, 'Q1');
    worksheet.setCellValue({ row: 2, col: 2 }, 100);
    worksheet.setCellValue({ row: 3, col: 1 }, 'Q2');
    worksheet.setCellValue({ row: 3, col: 2 }, 150);
    worksheet.setCellValue({ row: 4, col: 1 }, 'Q3');
    worksheet.setCellValue({ row: 4, col: 2 }, 120);

    // Default chart object
    chart = {
      id: 'chart-1',
      type: 'bar',
      dataRange: {
        startRow: 1,
        startCol: 1,
        endRow: 4,
        endCol: 2
      },
      position: { x: 100, y: 100 },
      size: { width: 400, height: 300 },
      zIndex: 0,
      selected: false,
      seriesDirection: 'columns',
      hasHeaderRow: true,
      hasHeaderCol: false,
      options: {},
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  });

  test('requires an owner view when an invalidated renderer cache reads after adoption', () => {
    const renderedData: Array<{ labels: string[]; datasets: Array<{ label: string; data: number[] }> }> = [];
    const renderSpy = jest.spyOn(ChartEngine.prototype, 'render').mockImplementation((data) => {
      renderedData.push(data);
    });

    try {
      renderer.renderChart(mockCtx as any, chart);
      expect(renderedData).toHaveLength(1);
      expect(renderedData[0].datasets[1].data).toEqual([100, 150, 120]);

      worksheet.setCellValue({ row: 2, col: 2 }, 125);
      adoptWorksheetByWorkbook(worksheet, 'chart-renderer-read-owner');

      // An unchanged chart cache uses its rendered canvas. A refresh through
      // this retained raw Worksheet is rejected after ownership changes.
      renderer.renderChart(mockCtx as any, chart);
      expect(renderedData).toHaveLength(1);
      renderer.invalidateChart(chart.id);
      expect(() => renderer.renderChart(mockCtx as any, chart)).toThrow(/require a WorkbookSheetView/);
      expect(renderedData).toHaveLength(1);
      expect(worksheet.getCellValue({ row: 2, col: 2 })).toBe(125);
    } finally {
      renderSpy.mockRestore();
    }
  });

  test('renders workbook-owned formula data through a view without retaining a raw worksheet field', () => {
    const ownerId = 'chart-renderer-view-owner' as WorkbookId;
    const sheetId = worksheet.getWorksheetId() as WorksheetId;
    worksheet.setCellFormula({ row: 2, col: 2 }, '=100+1', 101);
    adoptWorksheetByWorkbook(worksheet, ownerId);
    const view = new OwnerBackedWorkbookSheetView(ownerId, sheetId, () => worksheet);
    const ownerRenderer = new ChartRenderer(view);
    const renderedData: Array<{ labels: string[]; datasets: Array<{ label: string; data: number[] }> }> = [];
    const renderSpy = jest.spyOn(ChartEngine.prototype, 'render').mockImplementation((data) => {
      renderedData.push(data);
    });

    try {
      expect(Reflect.get(ownerRenderer, 'worksheet')).toBeUndefined();
      expect(() => new ChartRenderer(worksheet)).toThrow(/require a WorkbookSheetView/);
      ownerRenderer.renderChart(mockCtx as any, chart);
      expect(renderedData).toHaveLength(1);
      expect(renderedData[0].datasets[1].data).toEqual([0, 150, 120]);
      renderedData[0].datasets[1].data[1] = 999;
      expect(view.getCellValue({ row: 3, col: 2 })).toBe(150);
    } finally {
      renderSpy.mockRestore();
    }
  });

  test('characterizes direct chart input identity and explicit cache invalidation', () => {
    const manager = new ChartManager(worksheet);
    const callerChart = manager.create({ ...chart });
    const managerSnapshot = manager.get(callerChart.id)!;
    callerChart.options.title = 'Initial title';
    const renderCalls: Array<{ data: unknown; options: unknown }> = [];
    const renderSpy = jest.spyOn(ChartEngine.prototype, 'render').mockImplementation((data, options) => {
      renderCalls.push({ data, options });
    });

    try {
      expect(managerSnapshot).not.toBe(callerChart);
      expect(managerSnapshot.dataRange).not.toBe(callerChart.dataRange);
      renderer.renderChart(mockCtx as any, callerChart);
      expect(renderCalls).toHaveLength(1);
      expect((renderCalls[0].data as any).datasets[1].data).toEqual([100, 150, 120]);
      expect((renderCalls[0].options as any).title).toBe('Initial title');

      // Direct renderer input is retained by the cache context (source-traced),
      // while current-call geometry is used immediately for canvas placement.
      callerChart.position.x = 240;
      callerChart.dataRange.endRow = 3;
      callerChart.options.title = 'Changed after render';
      mockCtx.clearDrawCalls();
      renderer.renderChart(mockCtx as any, callerChart);

      expect(renderCalls).toHaveLength(1);
      expect(mockCtx.getDrawCalls().find((call) => call.type === 'drawImage')?.x).toBe(240);
      expect((renderCalls[0].options as any).title).toBe('Initial title');
      expect(manager.get(callerChart.id)).toEqual(managerSnapshot);

      renderer.invalidateChart(callerChart.id);
      renderer.renderChart(mockCtx as any, callerChart);

      expect(renderCalls).toHaveLength(2);
      expect((renderCalls[1].data as any).datasets[1].data).toEqual([100, 150]);
      expect((renderCalls[1].options as any).title).toBe('Changed after render');
      expect(manager.get(callerChart.id)).toEqual(managerSnapshot);
    } finally {
      renderSpy.mockRestore();
    }
  });

  describe('Basic Rendering', () => {
    test('should render chart at correct position', () => {
      renderer.renderChart(mockCtx as any, chart);

      const drawCalls = mockCtx.getDrawCalls();
      const drawImageCall = drawCalls.find(call => call.type === 'drawImage');

      expect(drawImageCall).toBeDefined();
      expect(drawImageCall?.x).toBe(100);
      expect(drawImageCall?.y).toBe(100);
    });

    test('should not render chart outside viewport', () => {
      const viewport = { x: 500, y: 500, width: 800, height: 600 };
      
      mockCtx.clearDrawCalls();
      renderer.renderChart(mockCtx as any, chart, viewport);

      const drawCalls = mockCtx.getDrawCalls();
      const drawImageCall = drawCalls.find(call => call.type === 'drawImage');

      expect(drawImageCall).toBeUndefined();
    });

    test('should render chart in viewport', () => {
      const viewport = { x: 0, y: 0, width: 800, height: 600 };
      
      mockCtx.clearDrawCalls();
      renderer.renderChart(mockCtx as any, chart, viewport);

      const drawCalls = mockCtx.getDrawCalls();
      const drawImageCall = drawCalls.find(call => call.type === 'drawImage');

      expect(drawImageCall).toBeDefined();
    });

    test('should render multiple charts in z-index order', () => {
      const chart2: ChartObject = {
        ...chart,
        id: 'chart-2',
        position: { x: 200, y: 200 },
        zIndex: 1
      };

      const charts = [chart, chart2];
      
      mockCtx.clearDrawCalls();
      renderer.renderAllCharts(mockCtx as any, charts);

      const drawCalls = mockCtx.getDrawCalls();
      const drawImageCalls = drawCalls.filter(call => call.type === 'drawImage');

      expect(drawImageCalls.length).toBe(2);
    });
  });

  describe('Selection Overlay', () => {
    test('should render selection border for selected chart', () => {
      chart.selected = true;

      mockCtx.clearDrawCalls();
      renderer.renderChart(mockCtx as any, chart);

      const drawCalls = mockCtx.getDrawCalls();
      const strokeRectCall = drawCalls.find(call => 
        call.type === 'strokeRect' && 
        call.strokeStyle === '#4285F4'
      );

      expect(strokeRectCall).toBeDefined();
    });

    test('should not render selection for unselected chart', () => {
      chart.selected = false;

      mockCtx.clearDrawCalls();
      renderer.renderChart(mockCtx as any, chart);

      const drawCalls = mockCtx.getDrawCalls();
      const strokeRectCalls = drawCalls.filter(call => 
        call.type === 'strokeRect' && 
        call.strokeStyle === '#4285F4'
      );

      expect(strokeRectCalls.length).toBe(0);
    });

    test('should render 8 resize handles for selected chart', () => {
      chart.selected = true;

      mockCtx.clearDrawCalls();
      renderer.renderChart(mockCtx as any, chart);

      const drawCalls = mockCtx.getDrawCalls();
      // Each handle has fillRect + strokeRect
      const handleFillCalls = drawCalls.filter(call => 
        call.type === 'fillRect' && 
        call.fillStyle === '#FFFFFF'
      );

      expect(handleFillCalls.length).toBe(8);
    });

    test('should use custom selection colors', () => {
      chart.selected = true;
      renderer.setSelectionColors('#FF0000', '#00FF00', '#0000FF');

      mockCtx.clearDrawCalls();
      renderer.renderChart(mockCtx as any, chart);

      const drawCalls = mockCtx.getDrawCalls();
      const borderCall = drawCalls.find(call => 
        call.type === 'strokeRect' && 
        call.strokeStyle === '#FF0000'
      );

      expect(borderCall).toBeDefined();
    });
  });

  describe('Resize Handles', () => {
    test('should get all 8 resize handles', () => {
      const handles = renderer.getResizeHandles(chart);
      expect(handles.length).toBe(8);
    });

    test('should have correct handle positions', () => {
      const handles = renderer.getResizeHandles(chart);
      
      const positions = handles.map(h => h.position);
      expect(positions).toContain('nw');
      expect(positions).toContain('n');
      expect(positions).toContain('ne');
      expect(positions).toContain('w');
      expect(positions).toContain('e');
      expect(positions).toContain('sw');
      expect(positions).toContain('s');
      expect(positions).toContain('se');
    });

    test('should detect handle at point', () => {
      chart.selected = true;
      
      // Top-left corner handle
      const handle = renderer.getHandleAtPoint(chart, 100, 100);
      
      expect(handle).not.toBeNull();
      expect(handle?.position).toBe('nw');
    });

    test('should return null for handle when not selected', () => {
      chart.selected = false;
      
      const handle = renderer.getHandleAtPoint(chart, 100, 100);
      
      expect(handle).toBeNull();
    });

    test('should return null when point not on handle', () => {
      chart.selected = true;
      
      const handle = renderer.getHandleAtPoint(chart, 250, 250);
      
      expect(handle).toBeNull();
    });
  });

  describe('Resize Calculation', () => {
    test('should resize from southeast handle', () => {
      const result = renderer.calculateResize(chart, 'se', 50, 30);
      
      expect(result.position).toEqual({ x: 100, y: 100 });
      expect(result.size).toEqual({ width: 450, height: 330 });
    });

    test('should resize from northwest handle', () => {
      const result = renderer.calculateResize(chart, 'nw', 20, 10);
      
      expect(result.position).toEqual({ x: 120, y: 110 });
      expect(result.size).toEqual({ width: 380, height: 290 });
    });

    test('should enforce minimum width', () => {
      const result = renderer.calculateResize(chart, 'se', -400, 0);
      
      expect(result.size.width).toBe(50); // Minimum width
    });

    test('should enforce minimum height', () => {
      const result = renderer.calculateResize(chart, 'se', 0, -300);
      
      expect(result.size.height).toBe(50); // Minimum height
    });

    test('should resize from east handle (horizontal only)', () => {
      const result = renderer.calculateResize(chart, 'e', 100, 50);
      
      expect(result.position).toEqual({ x: 100, y: 100 });
      expect(result.size).toEqual({ width: 500, height: 300 }); // Height unchanged
    });

    test('should resize from south handle (vertical only)', () => {
      const result = renderer.calculateResize(chart, 's', 100, 50);
      
      expect(result.position).toEqual({ x: 100, y: 100 });
      expect(result.size).toEqual({ width: 400, height: 350 }); // Width unchanged
    });
  });

  describe('Caching', () => {
    test('should cache rendered chart', () => {
      renderer.renderChart(mockCtx as any, chart);
      
      // Render again - should use cache
      mockCtx.clearDrawCalls();
      renderer.renderChart(mockCtx as any, chart);

      const drawCalls = mockCtx.getDrawCalls();
      const drawImageCall = drawCalls.find(call => call.type === 'drawImage');
      
      expect(drawImageCall).toBeDefined();
    });

    test('should invalidate chart cache', () => {
      renderer.renderChart(mockCtx as any, chart);
      
      renderer.invalidateChart('chart-1');
      
      // Next render should regenerate
      mockCtx.clearDrawCalls();
      renderer.renderChart(mockCtx as any, chart);

      const drawCalls = mockCtx.getDrawCalls();
      expect(drawCalls.length).toBeGreaterThan(0);
    });

    test('should invalidate all charts', () => {
      renderer.renderChart(mockCtx as any, chart);
      
      renderer.invalidateAll();
      
      mockCtx.clearDrawCalls();
      renderer.renderChart(mockCtx as any, chart);

      const drawCalls = mockCtx.getDrawCalls();
      expect(drawCalls.length).toBeGreaterThan(0);
    });

    test('should clear cache', () => {
      renderer.renderChart(mockCtx as any, chart);
      
      renderer.clearCache();
      
      // Should regenerate on next render
      mockCtx.clearDrawCalls();
      renderer.renderChart(mockCtx as any, chart);

      const drawCalls = mockCtx.getDrawCalls();
      expect(drawCalls.length).toBeGreaterThan(0);
    });

    test('should remove chart from cache', () => {
      renderer.renderChart(mockCtx as any, chart);
      
      renderer.removeFromCache('chart-1');
      
      // Should regenerate on next render
      mockCtx.clearDrawCalls();
      renderer.renderChart(mockCtx as any, chart);

      const drawCalls = mockCtx.getDrawCalls();
      expect(drawCalls.length).toBeGreaterThan(0);
    });
  });

  describe('Viewport Checking', () => {
    test('should detect chart in viewport', () => {
      const viewport = { x: 0, y: 0, width: 800, height: 600 };
      const inViewport = renderer.isChartInViewport(chart, viewport);
      
      expect(inViewport).toBe(true);
    });

    test('should detect chart outside viewport (left)', () => {
      const viewport = { x: 600, y: 0, width: 800, height: 600 };
      const inViewport = renderer.isChartInViewport(chart, viewport);
      
      expect(inViewport).toBe(false);
    });

    test('should detect chart outside viewport (top)', () => {
      const viewport = { x: 0, y: 500, width: 800, height: 600 };
      const inViewport = renderer.isChartInViewport(chart, viewport);
      
      expect(inViewport).toBe(false);
    });

    test('should detect partially visible chart', () => {
      const viewport = { x: 250, y: 250, width: 800, height: 600 };
      const inViewport = renderer.isChartInViewport(chart, viewport);
      
      expect(inViewport).toBe(true);
    });
  });

  describe('Cursor Management', () => {
    test('should return resize cursor for handle', () => {
      chart.selected = true;
      const cursor = renderer.getCursor(chart, 100, 100); // nw handle
      
      expect(cursor).toBe('nw-resize');
    });

    test('should return move cursor for selected chart', () => {
      chart.selected = true;
      const cursor = renderer.getCursor(chart, 250, 250); // Chart center
      
      expect(cursor).toBe('move');
    });

    test('should return pointer cursor for unselected chart', () => {
      chart.selected = false;
      const cursor = renderer.getCursor(chart, 250, 250);
      
      expect(cursor).toBe('pointer');
    });

    test('should return default cursor for no chart', () => {
      const cursor = renderer.getCursor(null, 0, 0);
      
      expect(cursor).toBe('default');
    });
  });

  describe('Configuration', () => {
    test('should set handle size', () => {
      renderer.setHandleSize(12);
      
      const handles = renderer.getResizeHandles(chart);
      expect(handles[0].size).toBe(12);
    });

    test('should clamp handle size to valid range', () => {
      renderer.setHandleSize(100); // Too large
      
      const handles = renderer.getResizeHandles(chart);
      expect(handles[0].size).toBe(16); // Max size
    });
  });
});
