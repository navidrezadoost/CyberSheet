/**
 * ChartInteractionManager.ts
 * 
 * Handles mouse and keyboard interactions for charts
 * Part of Week 12 Day 4: CanvasRenderer Integration & Interactivity
 */

import { ChartManager } from './ChartManager';
import { ChartRenderer, HandlePosition } from './ChartRenderer';
import type { ChartObject } from '@cyber-sheet/core';
import type { Worksheet } from '@cyber-sheet/core';

/**
 * Interaction state
 */
type InteractionState = 
  | { type: 'idle' }
  | { type: 'dragging'; chartId: string; startX: number; startY: number; initialPos: { x: number; y: number } }
  | { type: 'resizing'; chartId: string; handle: HandlePosition; startX: number; startY: number; initialPos: { x: number; y: number }; initialSize: { width: number; height: number } };

/**
 * ChartInteractionManager - Handles chart interactions
 */
export class ChartInteractionManager {
  private chartManager: ChartManager;
  private chartRenderer: ChartRenderer;
  private state: InteractionState = { type: 'idle' };
  private canvas: HTMLCanvasElement;
  private redrawCallback: () => void;

  constructor(
    worksheet: Worksheet,
    canvas: HTMLCanvasElement,
    redrawCallback: () => void
  ) {
    this.chartManager = new ChartManager(worksheet);
    this.chartRenderer = new ChartRenderer(worksheet);
    this.canvas = canvas;
    this.redrawCallback = redrawCallback;

    // Subscribe to chart events to invalidate cache
    this.chartManager.on((event) => {
      if (event.type === 'update' || event.type === 'create') {
        this.chartRenderer.invalidateChart(event.chart.id);
        this.redrawCallback();
      } else if (event.type === 'delete') {
        this.chartRenderer.removeFromCache(event.chart.id);
        this.redrawCallback();
      } else if (event.type === 'select' || event.type === 'deselect') {
        this.redrawCallback();
      }
    });
  }

  /**
   * Get the ChartManager instance
   */
  getChartManager(): ChartManager {
    return this.chartManager;
  }

  /**
   * Get the ChartRenderer instance
   */
  getChartRenderer(): ChartRenderer {
    return this.chartRenderer;
  }

  /**
   * Handle mouse down event
   */
  handleMouseDown(canvasX: number, canvasY: number): boolean {
    // Check if clicking on a chart
    const charts = this.chartManager.getChartsAtPosition(canvasX, canvasY);
    const topChart = this.chartManager.getTopmostChartAtPosition(canvasX, canvasY);

    if (!topChart) {
      // Click outside charts - deselect all
      const selected = this.chartManager.getSelected();
      if (selected) {
        this.chartManager.deselect(selected.id);
        return true; // Handled
      }
      return false; // Not handled
    }

    // Select the chart if not already selected
    if (!topChart.selected) {
      this.chartManager.select(topChart.id);
    }

    // Check if clicking on a resize handle
    const handle = this.chartRenderer.getHandleAtPoint(topChart, canvasX, canvasY);
    
    if (handle) {
      // Start resizing
      this.state = {
        type: 'resizing',
        chartId: topChart.id,
        handle: handle.position,
        startX: canvasX,
        startY: canvasY,
        initialPos: { ...topChart.position },
        initialSize: { ...topChart.size }
      };
    } else {
      // Start dragging
      this.state = {
        type: 'dragging',
        chartId: topChart.id,
        startX: canvasX,
        startY: canvasY,
        initialPos: { ...topChart.position }
      };
    }

    return true; // Handled
  }

  /**
   * Handle mouse move event
   */
  handleMouseMove(canvasX: number, canvasY: number): { handled: boolean; cursor?: string } {
    if (this.state.type === 'dragging') {
      const deltaX = canvasX - this.state.startX;
      const deltaY = canvasY - this.state.startY;

      const newX = this.state.initialPos.x + deltaX;
      const newY = this.state.initialPos.y + deltaY;

      this.chartManager.move(this.state.chartId, newX, newY);
      
      return { handled: true, cursor: 'move' };
    }

    if (this.state.type === 'resizing') {
      const deltaX = canvasX - this.state.startX;
      const deltaY = canvasY - this.state.startY;

      const result = this.chartRenderer.calculateResize(
        {
          id: this.state.chartId,
          position: this.state.initialPos,
          size: this.state.initialSize
        } as ChartObject,
        this.state.handle,
        deltaX,
        deltaY
      );

      // Update chart position and size
      const chart = this.chartManager.get(this.state.chartId);
      if (chart) {
        this.chartManager.update(this.state.chartId, {
          position: result.position,
          size: result.size
        });
      }

      const handlePosition = this.state.handle;
      const handle = this.chartRenderer.getResizeHandles({
        id: this.state.chartId,
        position: this.state.initialPos,
        size: this.state.initialSize
      } as ChartObject).find(h => h.position === handlePosition);

      return { handled: true, cursor: handle?.cursor || 'nwse-resize' };
    }

    // Not dragging or resizing - check for hover cursor
    const topChart = this.chartManager.getTopmostChartAtPosition(canvasX, canvasY);
    if (topChart) {
      const cursor = this.chartRenderer.getCursor(topChart, canvasX, canvasY);
      return { handled: true, cursor };
    }

    return { handled: false };
  }

  /**
   * Handle mouse up event
   */
  handleMouseUp(canvasX: number, canvasY: number): boolean {
    const wasInteracting = this.state.type !== 'idle';
    this.state = { type: 'idle' };
    return wasInteracting;
  }

  /**
   * Handle keyboard event
   */
  handleKeyDown(event: KeyboardEvent): boolean {
    const selected = this.chartManager.getSelected();
    if (!selected) return false;

    // Delete key - delete selected chart
    if (event.key === 'Delete' || event.key === 'Backspace') {
      this.chartManager.delete(selected.id);
      event.preventDefault();
      return true;
    }

    // Arrow keys - move chart
    const moveDistance = event.shiftKey ? 10 : 1;
    let handled = false;

    switch (event.key) {
      case 'ArrowLeft':
        this.chartManager.move(selected.id, selected.position.x - moveDistance, selected.position.y);
        handled = true;
        break;
      case 'ArrowRight':
        this.chartManager.move(selected.id, selected.position.x + moveDistance, selected.position.y);
        handled = true;
        break;
      case 'ArrowUp':
        this.chartManager.move(selected.id, selected.position.x, selected.position.y - moveDistance);
        handled = true;
        break;
      case 'ArrowDown':
        this.chartManager.move(selected.id, selected.position.x, selected.position.y + moveDistance);
        handled = true;
        break;
    }

    if (handled) {
      event.preventDefault();
    }

    return handled;
  }

  /**
   * Check if currently interacting with a chart
   */
  isInteracting(): boolean {
    return this.state.type !== 'idle';
  }

  /**
   * Get current cursor based on interaction state
   */
  getCursor(canvasX: number, canvasY: number): string | null {
    if (this.state.type === 'dragging') {
      return 'move';
    }

    if (this.state.type === 'resizing') {
      const chart = this.chartManager.get(this.state.chartId);
      if (chart) {
        const handlePosition = this.state.handle;
        const handle = this.chartRenderer.getResizeHandles(chart).find(
          h => h.position === handlePosition
        );
        return handle?.cursor || 'nwse-resize';
      }
    }

    const topChart = this.chartManager.getTopmostChartAtPosition(canvasX, canvasY);
    if (topChart) {
      return this.chartRenderer.getCursor(topChart, canvasX, canvasY);
    }

    return null;
  }

  /**
   * Render all charts
   */
  renderCharts(
    ctx: CanvasRenderingContext2D,
    viewport?: { x: number; y: number; width: number; height: number }
  ): void {
    const charts = this.chartManager.getAll();
    this.chartRenderer.renderAllCharts(ctx, charts, viewport);
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.chartRenderer.clearCache();
  }
}
