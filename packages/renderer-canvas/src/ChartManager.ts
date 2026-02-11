/**
 * ChartManager.ts
 * 
 * Manages chart objects in a worksheet - CRUD operations
 * Part of Week 12 Day 2: Data Integration
 */

import type { Worksheet } from '@cyber-sheet/core';
import type {
  ChartObject,
  ChartCreateParams,
  ChartUpdate
} from '@cyber-sheet/core';
import { createChartObject, validateChartObject } from '@cyber-sheet/core';

/**
 * Storage key for charts in worksheet metadata
 */
const CHARTS_METADATA_KEY = '__charts__';

/**
 * Chart event types
 */
export type ChartEventType = 'create' | 'update' | 'delete' | 'select' | 'deselect';

/**
 * Chart event data
 */
export interface ChartEvent {
  type: ChartEventType;
  chart: ChartObject;
  timestamp: number;
}

/**
 * Chart event listener
 */
export type ChartEventListener = (event: ChartEvent) => void;

/**
 * ChartManager - Manage charts in a worksheet
 */
export class ChartManager {
  private worksheet: Worksheet;
  private charts: Map<string, ChartObject>;
  private listeners: ChartEventListener[];
  private nextZIndex: number;

  constructor(worksheet: Worksheet) {
    this.worksheet = worksheet;
    this.charts = new Map();
    this.listeners = [];
    this.nextZIndex = 0;
    
    // Load existing charts from worksheet metadata
    this.loadChartsFromMetadata();
  }

  /**
   * Create a new chart
   */
  create(params: ChartCreateParams): ChartObject {
    // Validate parameters
    const errors = validateChartObject(params as Partial<ChartObject>);
    if (errors.length > 0) {
      throw new Error(`Invalid chart parameters: ${errors.join(', ')}`);
    }

    // Assign z-index if not provided
    const zIndex = params.zIndex ?? this.nextZIndex++;

    // Create chart object
    const chart = createChartObject({ ...params, zIndex });

    // Store chart
    this.charts.set(chart.id, chart);

    // Update metadata
    this.saveChartsToMetadata();

    // Emit event
    this.emitEvent({ type: 'create', chart, timestamp: Date.now() });

    return chart;
  }

  /**
   * Get chart by ID
   */
  get(id: string): ChartObject | undefined {
    return this.charts.get(id);
  }

  /**
   * Get all charts
   */
  getAll(): ChartObject[] {
    return Array.from(this.charts.values()).sort((a, b) => a.zIndex - b.zIndex);
  }

  /**
   * Get charts by type
   */
  getByType(type: ChartObject['type']): ChartObject[] {
    return this.getAll().filter(chart => chart.type === type);
  }

  /**
   * Get selected chart (if any)
   */
  getSelected(): ChartObject | undefined {
    return this.getAll().find(chart => chart.selected);
  }

  /**
   * Update chart
   */
  update(id: string, updates: ChartUpdate): ChartObject {
    const chart = this.charts.get(id);
    if (!chart) {
      throw new Error(`Chart not found: ${id}`);
    }

    // Apply updates
    const updatedChart: ChartObject = {
      ...chart,
      ...updates,
      id: chart.id, // Preserve ID
      createdAt: chart.createdAt, // Preserve creation time
      updatedAt: Date.now()
    };

    // Validate updated chart
    const errors = validateChartObject(updatedChart);
    if (errors.length > 0) {
      throw new Error(`Invalid chart update: ${errors.join(', ')}`);
    }

    // Store updated chart
    this.charts.set(id, updatedChart);

    // Update metadata
    this.saveChartsToMetadata();

    // Emit event
    this.emitEvent({ type: 'update', chart: updatedChart, timestamp: Date.now() });

    return updatedChart;
  }

  /**
   * Delete chart
   */
  delete(id: string): boolean {
    const chart = this.charts.get(id);
    if (!chart) {
      return false;
    }

    // Remove chart
    this.charts.delete(id);

    // Update metadata
    this.saveChartsToMetadata();

    // Emit event
    this.emitEvent({ type: 'delete', chart, timestamp: Date.now() });

    return true;
  }

  /**
   * Delete all charts
   */
  deleteAll(): number {
    const count = this.charts.size;
    
    // Delete each chart (to emit events)
    const ids = Array.from(this.charts.keys());
    ids.forEach(id => this.delete(id));

    return count;
  }

  /**
   * Select chart (deselect others)
   */
  select(id: string): ChartObject {
    // Deselect all first
    this.getAll().forEach(chart => {
      if (chart.selected && chart.id !== id) {
        this.update(chart.id, { selected: false });
        this.emitEvent({ type: 'deselect', chart, timestamp: Date.now() });
      }
    });

    // Select target chart
    const chart = this.update(id, { selected: true });
    this.emitEvent({ type: 'select', chart, timestamp: Date.now() });

    return chart;
  }

  /**
   * Deselect chart
   */
  deselect(id: string): ChartObject {
    const chart = this.update(id, { selected: false });
    this.emitEvent({ type: 'deselect', chart, timestamp: Date.now() });
    return chart;
  }

  /**
   * Deselect all charts
   */
  deselectAll(): void {
    this.getAll().forEach(chart => {
      if (chart.selected) {
        this.deselect(chart.id);
      }
    });
  }

  /**
   * Move chart (update position)
   */
  move(id: string, x: number, y: number): ChartObject {
    return this.update(id, { position: { x, y } });
  }

  /**
   * Resize chart (update size)
   */
  resize(id: string, width: number, height: number): ChartObject {
    if (width <= 0 || height <= 0) {
      throw new Error('Chart size must be positive');
    }
    return this.update(id, { size: { width, height } });
  }

  /**
   * Bring chart to front (set highest z-index)
   */
  bringToFront(id: string): ChartObject {
    const maxZ = Math.max(...this.getAll().map(c => c.zIndex), 0);
    return this.update(id, { zIndex: maxZ + 1 });
  }

  /**
   * Send chart to back (set lowest z-index)
   */
  sendToBack(id: string): ChartObject {
    const minZ = Math.min(...this.getAll().map(c => c.zIndex), 0);
    const newZ = Math.max(0, minZ - 1); // Ensure non-negative
    return this.update(id, { zIndex: newZ });
  }

  /**
   * Get charts at position (for click detection)
   */
  getChartsAtPosition(x: number, y: number): ChartObject[] {
    return this.getAll().filter(chart => {
      const { position, size } = chart;
      return (
        x >= position.x &&
        x <= position.x + size.width &&
        y >= position.y &&
        y <= position.y + size.height
      );
    }).sort((a, b) => b.zIndex - a.zIndex); // Highest z-index first
  }

  /**
   * Get topmost chart at position
   */
  getTopmostChartAtPosition(x: number, y: number): ChartObject | undefined {
    const charts = this.getChartsAtPosition(x, y);
    return charts[0]; // Already sorted by z-index
  }

  /**
   * Check if any chart overlaps with given bounds
   */
  hasOverlap(x: number, y: number, width: number, height: number): boolean {
    return this.getAll().some(chart => {
      const { position, size } = chart;
      return !(
        x + width < position.x ||
        x > position.x + size.width ||
        y + height < position.y ||
        y > position.y + size.height
      );
    });
  }

  /**
   * Get charts that overlap with given bounds
   */
  getOverlappingCharts(x: number, y: number, width: number, height: number): ChartObject[] {
    return this.getAll().filter(chart => {
      const { position, size } = chart;
      return !(
        x + width < position.x ||
        x > position.x + size.width ||
        y + height < position.y ||
        y > position.y + size.height
      );
    });
  }

  /**
   * Count charts
   */
  count(): number {
    return this.charts.size;
  }

  /**
   * Check if chart exists
   */
  has(id: string): boolean {
    return this.charts.has(id);
  }

  /**
   * Clear all charts
   */
  clear(): void {
    this.deleteAll();
  }

  /**
   * Add event listener
   */
  on(listener: ChartEventListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove event listener
   */
  off(listener: ChartEventListener): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: ChartEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Chart event listener error:', error);
      }
    });
  }

  /**
   * Load charts from worksheet metadata
   */
  private loadChartsFromMetadata(): void {
    try {
      const metadata = (this.worksheet as any).metadata;
      if (!metadata) return;

      const chartsData = metadata[CHARTS_METADATA_KEY];
      if (!chartsData || !Array.isArray(chartsData)) return;

      // Restore charts
      chartsData.forEach((chartData: any) => {
        try {
          const chart = chartData as ChartObject;
          this.charts.set(chart.id, chart);
          
          // Update next z-index
          if (chart.zIndex >= this.nextZIndex) {
            this.nextZIndex = chart.zIndex + 1;
          }
        } catch (error) {
          console.warn('Failed to load chart:', error);
        }
      });
    } catch (error) {
      console.warn('Failed to load charts from metadata:', error);
    }
  }

  /**
   * Save charts to worksheet metadata
   */
  private saveChartsToMetadata(): void {
    try {
      // Ensure worksheet has metadata
      if (!(this.worksheet as any).metadata) {
        (this.worksheet as any).metadata = {};
      }

      // Save charts array
      const chartsArray = Array.from(this.charts.values());
      (this.worksheet as any).metadata[CHARTS_METADATA_KEY] = chartsArray;
    } catch (error) {
      console.error('Failed to save charts to metadata:', error);
    }
  }

  /**
   * Export charts to JSON
   */
  exportToJSON(): string {
    const chartsArray = Array.from(this.charts.values());
    return JSON.stringify(chartsArray, null, 2);
  }

  /**
   * Import charts from JSON
   */
  importFromJSON(json: string): number {
    try {
      const chartsArray = JSON.parse(json) as ChartObject[];
      
      if (!Array.isArray(chartsArray)) {
        throw new Error('Invalid JSON format: expected array');
      }

      let imported = 0;
      chartsArray.forEach((chartData) => {
        try {
          // Validate chart
          const errors = validateChartObject(chartData);
          if (errors.length > 0) {
            console.warn(`Skipping invalid chart: ${errors.join(', ')}`);
            return;
          }

          // Add chart (regenerate ID to avoid conflicts)
          const params: ChartCreateParams = {
            type: chartData.type,
            dataRange: chartData.dataRange,
            position: chartData.position,
            size: chartData.size,
            options: chartData.options,
            seriesDirection: chartData.seriesDirection,
            hasHeaderRow: chartData.hasHeaderRow,
            hasHeaderCol: chartData.hasHeaderCol,
            title: chartData.title,
            zIndex: chartData.zIndex,
            metadata: chartData.metadata
          };

          this.create(params);
          imported++;
        } catch (error) {
          console.warn('Failed to import chart:', error);
        }
      });

      return imported;
    } catch (error) {
      throw new Error(`Failed to import charts: ${error}`);
    }
  }

  /**
   * Clone chart (duplicate)
   */
  clone(id: string): ChartObject {
    const chart = this.charts.get(id);
    if (!chart) {
      throw new Error(`Chart not found: ${id}`);
    }

    // Create clone with offset position
    const params: ChartCreateParams = {
      type: chart.type,
      dataRange: { ...chart.dataRange },
      position: {
        x: chart.position.x + 20,
        y: chart.position.y + 20
      },
      size: { ...chart.size },
      options: { ...chart.options },
      seriesDirection: chart.seriesDirection,
      hasHeaderRow: chart.hasHeaderRow,
      hasHeaderCol: chart.hasHeaderCol,
      title: chart.title ? `${chart.title} (Copy)` : undefined,
      zIndex: this.nextZIndex,
      metadata: chart.metadata ? { ...chart.metadata } : undefined
    };

    return this.create(params);
  }

  /**
   * Get statistics about charts
   */
  getStats(): {
    total: number;
    byType: Record<string, number>;
    selected: number;
  } {
    const stats = {
      total: this.charts.size,
      byType: {} as Record<string, number>,
      selected: 0
    };

    this.getAll().forEach(chart => {
      // Count by type
      stats.byType[chart.type] = (stats.byType[chart.type] || 0) + 1;
      
      // Count selected
      if (chart.selected) {
        stats.selected++;
      }
    });

    return stats;
  }
}
