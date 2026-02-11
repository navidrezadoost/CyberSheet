/**
 * Tests for ChartRenderer
 * Week 12 Day 3: Canvas Integration
 */

import { ChartRenderer } from '../src/ChartRenderer';
import { Worksheet } from '@cyber-sheet/core';
import type { ChartObject } from '@cyber-sheet/core';

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
    worksheet.setCellValue({ row: 0, col: 0 }, 'Category');
    worksheet.setCellValue({ row: 0, col: 1 }, 'Sales');
    worksheet.setCellValue({ row: 1, col: 0 }, 'Q1');
    worksheet.setCellValue({ row: 1, col: 1 }, 100);
    worksheet.setCellValue({ row: 2, col: 0 }, 'Q2');
    worksheet.setCellValue({ row: 2, col: 1 }, 150);
    worksheet.setCellValue({ row: 3, col: 0 }, 'Q3');
    worksheet.setCellValue({ row: 3, col: 1 }, 120);

    // Default chart object
    chart = {
      id: 'chart-1',
      type: 'bar',
      dataRange: {
        startRow: 0,
        startCol: 0,
        endRow: 3,
        endCol: 1
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
