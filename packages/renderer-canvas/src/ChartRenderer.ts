/**
 * ChartRenderer.ts
 * 
 * Renders charts on the spreadsheet canvas
 * Part of Week 12 Day 3: Canvas Integration
 */

import { ChartEngine } from './ChartEngine';
import type { ChartData, ChartOptions } from './ChartEngine';
import type { ChartObject } from '@cyber-sheet/core';
import { ChartDataAdapter } from './ChartDataAdapter';
import type { Worksheet } from '@cyber-sheet/core';

/**
 * Selection handle positions
 */
export type HandlePosition = 
  | 'nw' | 'n' | 'ne'
  | 'w'  | 'e'
  | 'sw' | 's' | 'se';

/**
 * Resize handle information
 */
export interface ResizeHandle {
  position: HandlePosition;
  x: number;
  y: number;
  size: number;
  cursor: string;
}

/**
 * Chart rendering context
 */
export interface ChartRenderContext {
  chart: ChartObject;
  canvas: OffscreenCanvas | HTMLCanvasElement;
  needsUpdate: boolean;
  lastRendered: number;
}

/**
 * ChartRenderer - Renders charts on sheet canvas
 */
export class ChartRenderer {
  private worksheet: Worksheet;
  private chartCache: Map<string, ChartRenderContext>;
  private handleSize: number = 8;
  private selectionBorderColor: string = '#4285F4';
  private selectionBorderWidth: number = 2;
  private handleFillColor: string = '#FFFFFF';
  private handleStrokeColor: string = '#4285F4';

  constructor(worksheet: Worksheet) {
    this.worksheet = worksheet;
    this.chartCache = new Map();
  }

  /**
   * Render a chart to a canvas
   */
  renderChart(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    chart: ChartObject,
    viewport?: { x: number; y: number; width: number; height: number }
  ): void {
    // Check if chart is in viewport
    if (viewport && !this.isChartInViewport(chart, viewport)) {
      return;
    }

    // Get or create chart render context
    let renderContext = this.chartCache.get(chart.id);
    
    if (!renderContext || renderContext.needsUpdate) {
      // Create offscreen canvas for this chart
      const offscreenCanvas = this.createOffscreenCanvas(chart.size.width, chart.size.height);
      
      // Render chart to offscreen canvas
      this.renderChartToCanvas(offscreenCanvas, chart);
      
      // Update cache
      renderContext = {
        chart,
        canvas: offscreenCanvas,
        needsUpdate: false,
        lastRendered: Date.now()
      };
      this.chartCache.set(chart.id, renderContext);
    }

    // Draw cached chart to main canvas
    ctx.drawImage(
      renderContext.canvas as any,
      chart.position.x,
      chart.position.y
    );

    // Draw selection overlay if selected
    if (chart.selected) {
      this.renderSelectionOverlay(ctx, chart);
    }
  }

  /**
   * Render all charts from a ChartManager
   */
  renderAllCharts(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    charts: ChartObject[],
    viewport?: { x: number; y: number; width: number; height: number }
  ): void {
    // Render charts in z-index order (already sorted by ChartManager)
    charts.forEach(chart => {
      this.renderChart(ctx, chart, viewport);
    });
  }

  /**
   * Render chart to an offscreen canvas
   */
  private renderChartToCanvas(
    canvas: OffscreenCanvas | HTMLCanvasElement,
    chart: ChartObject
  ): void {
    // Get chart data from worksheet
    const chartData = ChartDataAdapter.rangeToChartData(
      this.worksheet,
      chart.dataRange,
      {
        hasHeaderRow: chart.hasHeaderRow,
        hasHeaderCol: chart.hasHeaderCol,
        seriesDirection: chart.seriesDirection
      }
    );

    // Prepare chart options
    const chartOptions: ChartOptions = {
      type: chart.type,
      width: chart.size.width,
      height: chart.size.height,
      title: chart.title,
      ...chart.options
    };

    // Create chart engine and render
    const engine = new ChartEngine(canvas);
    engine.render(chartData, chartOptions);
  }

  /**
   * Render selection overlay (border and resize handles)
   */
  private renderSelectionOverlay(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    chart: ChartObject
  ): void {
    const { x, y } = chart.position;
    const { width, height } = chart.size;

    // Save context
    ctx.save();

    // Draw selection border
    ctx.strokeStyle = this.selectionBorderColor;
    ctx.lineWidth = this.selectionBorderWidth;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x, y, width, height);

    // Reset line dash
    ctx.setLineDash([]);

    // Draw resize handles
    const handles = this.getResizeHandles(chart);
    handles.forEach(handle => {
      this.renderResizeHandle(ctx, handle);
    });

    // Restore context
    ctx.restore();
  }

  /**
   * Render a single resize handle
   */
  private renderResizeHandle(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    handle: ResizeHandle
  ): void {
    const halfSize = handle.size / 2;

    // Fill
    ctx.fillStyle = this.handleFillColor;
    ctx.fillRect(
      handle.x - halfSize,
      handle.y - halfSize,
      handle.size,
      handle.size
    );

    // Stroke
    ctx.strokeStyle = this.handleStrokeColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(
      handle.x - halfSize,
      handle.y - halfSize,
      handle.size,
      handle.size
    );
  }

  /**
   * Get resize handles for a chart
   */
  getResizeHandles(chart: ChartObject): ResizeHandle[] {
    const { x, y } = chart.position;
    const { width, height } = chart.size;
    const halfSize = this.handleSize / 2;

    return [
      // Corners
      { position: 'nw', x: x, y: y, size: this.handleSize, cursor: 'nw-resize' },
      { position: 'ne', x: x + width, y: y, size: this.handleSize, cursor: 'ne-resize' },
      { position: 'sw', x: x, y: y + height, size: this.handleSize, cursor: 'sw-resize' },
      { position: 'se', x: x + width, y: y + height, size: this.handleSize, cursor: 'se-resize' },
      
      // Edges
      { position: 'n', x: x + width / 2, y: y, size: this.handleSize, cursor: 'n-resize' },
      { position: 's', x: x + width / 2, y: y + height, size: this.handleSize, cursor: 's-resize' },
      { position: 'w', x: x, y: y + height / 2, size: this.handleSize, cursor: 'w-resize' },
      { position: 'e', x: x + width, y: y + height / 2, size: this.handleSize, cursor: 'e-resize' }
    ];
  }

  /**
   * Check if a point is over a resize handle
   */
  getHandleAtPoint(chart: ChartObject, x: number, y: number): ResizeHandle | null {
    if (!chart.selected) {
      return null;
    }

    const handles = this.getResizeHandles(chart);
    const tolerance = this.handleSize / 2 + 2; // 2px extra tolerance

    for (const handle of handles) {
      const dx = x - handle.x;
      const dy = y - handle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= tolerance) {
        return handle;
      }
    }

    return null;
  }

  /**
   * Check if chart is in viewport
   */
  isChartInViewport(
    chart: ChartObject,
    viewport: { x: number; y: number; width: number; height: number }
  ): boolean {
    const chartRight = chart.position.x + chart.size.width;
    const chartBottom = chart.position.y + chart.size.height;
    const viewportRight = viewport.x + viewport.width;
    const viewportBottom = viewport.y + viewport.height;

    return !(
      chartRight < viewport.x ||
      chart.position.x > viewportRight ||
      chartBottom < viewport.y ||
      chart.position.y > viewportBottom
    );
  }

  /**
   * Invalidate chart cache (force re-render)
   */
  invalidateChart(chartId: string): void {
    const context = this.chartCache.get(chartId);
    if (context) {
      context.needsUpdate = true;
    }
  }

  /**
   * Invalidate all charts
   */
  invalidateAll(): void {
    this.chartCache.forEach(context => {
      context.needsUpdate = true;
    });
  }

  /**
   * Clear chart cache
   */
  clearCache(): void {
    this.chartCache.clear();
  }

  /**
   * Remove chart from cache
   */
  removeFromCache(chartId: string): void {
    this.chartCache.delete(chartId);
  }

  /**
   * Create offscreen canvas
   */
  private createOffscreenCanvas(width: number, height: number): OffscreenCanvas | HTMLCanvasElement {
    if (typeof OffscreenCanvas !== 'undefined') {
      return new OffscreenCanvas(width, height);
    } else {
      // Fallback for environments without OffscreenCanvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      return canvas;
    }
  }

  /**
   * Calculate resize based on handle and mouse delta
   */
  calculateResize(
    chart: ChartObject,
    handle: HandlePosition,
    deltaX: number,
    deltaY: number
  ): { position: { x: number; y: number }; size: { width: number; height: number } } {
    let newX = chart.position.x;
    let newY = chart.position.y;
    let newWidth = chart.size.width;
    let newHeight = chart.size.height;

    // Minimum size
    const minWidth = 50;
    const minHeight = 50;

    switch (handle) {
      case 'nw':
        newX += deltaX;
        newY += deltaY;
        newWidth -= deltaX;
        newHeight -= deltaY;
        break;
      case 'n':
        newY += deltaY;
        newHeight -= deltaY;
        break;
      case 'ne':
        newY += deltaY;
        newWidth += deltaX;
        newHeight -= deltaY;
        break;
      case 'w':
        newX += deltaX;
        newWidth -= deltaX;
        break;
      case 'e':
        newWidth += deltaX;
        break;
      case 'sw':
        newX += deltaX;
        newWidth -= deltaX;
        newHeight += deltaY;
        break;
      case 's':
        newHeight += deltaY;
        break;
      case 'se':
        newWidth += deltaX;
        newHeight += deltaY;
        break;
    }

    // Enforce minimum size
    if (newWidth < minWidth) {
      if (handle.includes('w')) {
        newX = chart.position.x + chart.size.width - minWidth;
      }
      newWidth = minWidth;
    }

    if (newHeight < minHeight) {
      if (handle.includes('n')) {
        newY = chart.position.y + chart.size.height - minHeight;
      }
      newHeight = minHeight;
    }

    return {
      position: { x: newX, y: newY },
      size: { width: newWidth, height: newHeight }
    };
  }

  /**
   * Get cursor for chart interaction
   */
  getCursor(chart: ChartObject | null, x: number, y: number): string {
    if (!chart) {
      return 'default';
    }

    // Check if over resize handle
    const handle = this.getHandleAtPoint(chart, x, y);
    if (handle) {
      return handle.cursor;
    }

    // Check if over chart (for move)
    if (chart.selected) {
      return 'move';
    }

    return 'pointer';
  }

  /**
   * Set custom colors for selection and handles
   */
  setSelectionColors(borderColor?: string, handleFill?: string, handleStroke?: string): void {
    if (borderColor) this.selectionBorderColor = borderColor;
    if (handleFill) this.handleFillColor = handleFill;
    if (handleStroke) this.handleStrokeColor = handleStroke;
  }

  /**
   * Set handle size
   */
  setHandleSize(size: number): void {
    this.handleSize = Math.max(4, Math.min(16, size)); // Clamp between 4 and 16
  }
}
