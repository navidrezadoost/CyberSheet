/**
 * ChartManager.ts
 * 
 * Manages chart objects in a worksheet - CRUD operations
 * Part of Week 12 Day 2: Data Integration
 */

import { Worksheet as WorksheetClass } from '@cyber-sheet/core';
import type { Worksheet } from '@cyber-sheet/core';
import type {
  ChartObject,
  ChartCreateParams,
  ChartUpdate
} from '@cyber-sheet/core';
import { createChartObject, validateChartObject } from '@cyber-sheet/core';

/**
 * Storage key for the standalone worksheet chart snapshot.
 */
const CHARTS_METADATA_KEY = '__charts__';
const worksheetIsWorkbookOwned = WorksheetClass.prototype.isWorkbookOwned;

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

type StandaloneChartMetadataWorksheet = Worksheet & { metadata?: Record<string, unknown> };

function getStandaloneChartMetadataWorksheet(worksheet: Worksheet): StandaloneChartMetadataWorksheet | undefined {
  return worksheetIsWorkbookOwned.call(worksheet) ? undefined : worksheet as StandaloneChartMetadataWorksheet;
}

/**
 * Chart data and metadata use a strict JSON-data contract: finite primitives,
 * dense arrays, and plain objects with enumerable writable data properties.
 * Accessors, custom prototypes, symbols, non-finite numbers, undefined values,
 * and cycles are rejected instead of being silently changed by JSON storage.
 */
function cloneChartValue<T>(value: T): T {
  return cloneJsonValue(value, '$', new WeakMap<object, unknown>(), new WeakSet<object>());
}

function cloneJsonValue<T>(
  value: T,
  path: string,
  copies: WeakMap<object, unknown>,
  active: WeakSet<object>,
): T {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`Unsupported chart data at ${path}: number must be finite`);
    return value;
  }
  if (typeof value !== 'object') {
    throw new TypeError(`Unsupported chart data at ${path}: ${typeof value} is not JSON-compatible`);
  }

  if (active.has(value)) throw new TypeError(`Unsupported chart data at ${path}: cyclic reference`);
  if (copies.has(value)) return copies.get(value) as T;

  const isArray = Array.isArray(value);
  const prototype = Object.getPrototypeOf(value);
  if (isArray ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`Unsupported chart data at ${path}: custom prototypes are not supported`);
  }

  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key === 'symbol')) {
    throw new TypeError(`Unsupported chart data at ${path}: symbol keys are not supported`);
  }

  const clone: object = isArray ? new Array((value as unknown[]).length) : Object.create(prototype);
  copies.set(value, clone);
  active.add(value);

  if (isArray) {
    const array = value as unknown[];
    const arrayKeys = keys.filter((key) => key !== 'length');
    if (arrayKeys.length !== array.length) {
      throw new TypeError(`Unsupported chart data at ${path}: arrays must be dense and have no extra properties`);
    }
    for (let index = 0; index < array.length; index++) {
      const key = String(index);
      const descriptor = Object.getOwnPropertyDescriptor(array, key);
      if (!descriptor || !('value' in descriptor) || !descriptor.enumerable || !descriptor.configurable || !descriptor.writable) {
        throw new TypeError(`Unsupported chart data at ${path}[${index}]: expected a standard data property`);
      }
      Object.defineProperty(clone, key, {
        value: cloneJsonValue(descriptor.value, `${path}[${index}]`, copies, active),
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
  } else {
    keys.forEach((key) => {
      const property = key as string;
      const descriptor = Object.getOwnPropertyDescriptor(value, property);
      if (!descriptor || !('value' in descriptor) || !descriptor.enumerable || !descriptor.configurable || !descriptor.writable) {
        throw new TypeError(`Unsupported chart data at ${path}.${property}: expected a standard data property`);
      }
      Object.defineProperty(clone, property, {
        value: cloneJsonValue(descriptor.value, `${path}.${property}`, copies, active),
        enumerable: true,
        configurable: true,
        writable: true,
      });
    });
  }

  active.delete(value);
  return clone as T;
}

function chartSnapshot(chart: ChartObject): ChartObject {
  return cloneChartValue(chart);
}

/**
 * ChartManager - Manage charts in a worksheet
 */
export class ChartManager {
  #worksheet: Worksheet;
  #charts: Map<string, ChartObject>;
  #listeners: ChartEventListener[];
  #nextZIndex: number;

  constructor(worksheet: Worksheet) {
    this.#worksheet = worksheet;
    this.#charts = new Map();
    this.#listeners = [];
    this.#nextZIndex = 0;
    
    // Load existing charts from worksheet metadata
    this.loadChartsFromMetadata();
  }

  /**
   * Create a new chart
   *
   * Accepts strict JSON-compatible data, copies nested inputs, and returns a
   * detached chart snapshot.
   */
  create(params: ChartCreateParams): ChartObject {
    this.assertWorkbookMetadataMutationAvailable();
    const detachedParams = cloneChartValue(params);
    // Validate parameters
    const errors = validateChartObject(detachedParams as Partial<ChartObject>);
    if (errors.length > 0) {
      throw new Error(`Invalid chart parameters: ${errors.join(', ')}`);
    }

    // Assign z-index if not provided
    const zIndex = detachedParams.zIndex ?? this.#nextZIndex++;

    // Create chart object
    const chart = createChartObject({ ...detachedParams, zIndex });

    // Store chart
    this.#charts.set(chart.id, chart);

    // Update metadata
    this.saveChartsToMetadata();

    // Emit event
    this.emitEvent({ type: 'create', chart, timestamp: Date.now() });

    return chartSnapshot(chart);
  }

  /**
   * Get chart by ID
   *
   * Returns a detached observation; use manager methods to change chart state.
   */
  get(id: string): ChartObject | undefined {
    const chart = this.#charts.get(id);
    return chart ? chartSnapshot(chart) : undefined;
  }

  /**
   * Get all charts
   *
   * Returns detached observations; use manager methods to change chart state.
   */
  getAll(): ChartObject[] {
    return Array.from(this.#charts.values(), chartSnapshot).sort((a, b) => a.zIndex - b.zIndex);
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
   *
   * Accepts strict JSON-compatible update data, copies nested inputs, and
   * returns a detached chart snapshot.
   */
  update(id: string, updates: ChartUpdate): ChartObject {
    this.assertWorkbookMetadataMutationAvailable();
    const chart = this.#charts.get(id);
    if (!chart) {
      throw new Error(`Chart not found: ${id}`);
    }

    // Apply updates
    const detachedUpdates = cloneChartValue(updates);
    const updatedChart: ChartObject = {
      ...chart,
      ...detachedUpdates,
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
    this.#charts.set(id, updatedChart);

    // Update metadata
    this.saveChartsToMetadata();

    // Emit event
    this.emitEvent({ type: 'update', chart: updatedChart, timestamp: Date.now() });

    return chartSnapshot(updatedChart);
  }

  /**
   * Delete chart
   */
  delete(id: string): boolean {
    this.assertWorkbookMetadataMutationAvailable();
    const chart = this.#charts.get(id);
    if (!chart) {
      return false;
    }

    // Remove chart
    this.#charts.delete(id);

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
    this.assertWorkbookMetadataMutationAvailable();
    const count = this.#charts.size;
    
    // Delete each chart (to emit events)
    const ids = Array.from(this.#charts.keys());
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
    return this.#charts.size;
  }

  /**
   * Check if chart exists
   */
  has(id: string): boolean {
    return this.#charts.has(id);
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
    this.#listeners.push(listener);
  }

  /**
   * Remove event listener
   */
  off(listener: ChartEventListener): void {
    const index = this.#listeners.indexOf(listener);
    if (index !== -1) {
      this.#listeners.splice(index, 1);
    }
  }

  /**
   * Emit event to all listeners
   *
   * Give each listener an independent detached event snapshot.
   */
  private emitEvent(event: ChartEvent): void {
    this.#listeners.forEach(listener => {
      try {
        listener(cloneChartValue(event));
      } catch (error) {
        console.error('Chart event listener error:', error);
      }
    });
  }

  /**
   * Load charts from worksheet metadata
   */
  private loadChartsFromMetadata(): void {
    const worksheet = getStandaloneChartMetadataWorksheet(this.#worksheet);
    if (!worksheet) return;
    try {
      const metadata = worksheet.metadata;
      if (!metadata) return;

      const chartsData = metadata[CHARTS_METADATA_KEY];
      if (!chartsData || !Array.isArray(chartsData)) return;

      // Restore charts
      chartsData.forEach((chartData: any) => {
        try {
          const chart = chartSnapshot(chartData as ChartObject);
          this.#charts.set(chart.id, chart);
          
          // Update next z-index
          if (chart.zIndex >= this.#nextZIndex) {
            this.#nextZIndex = chart.zIndex + 1;
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
    const worksheet = getStandaloneChartMetadataWorksheet(this.#worksheet);
    if (!worksheet) throw new Error('Workbook-owned chart metadata mutation is unavailable until R5');
    try {
      // Persist a detached JSON snapshot so retained metadata references
      // cannot change the manager's chart objects after a metadata reload.
      const serializedCharts = JSON.stringify(Array.from(this.#charts.values()));
      if (typeof serializedCharts !== 'string') {
        throw new TypeError('Chart metadata must serialize to JSON');
      }
      const chartsSnapshot = JSON.parse(serializedCharts) as ChartObject[];

      // Ensure worksheet has metadata
      if (!worksheet.metadata) {
        worksheet.metadata = {};
      }

      worksheet.metadata[CHARTS_METADATA_KEY] = chartsSnapshot;
    } catch (error) {
      console.error('Failed to save charts to metadata:', error);
    }
  }

  private assertWorkbookMetadataMutationAvailable(): void {
    if (worksheetIsWorkbookOwned.call(this.#worksheet)) {
      throw new Error('Workbook-owned chart metadata mutation is unavailable until R5');
    }
  }

  /**
   * Export charts to JSON
   */
  exportToJSON(): string {
    const chartsArray = Array.from(this.#charts.values());
    return JSON.stringify(chartsArray, null, 2);
  }

  /**
   * Import charts from JSON
   */
  importFromJSON(json: string): number {
    this.assertWorkbookMetadataMutationAvailable();
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
            zIndex: chartData.zIndex,
            ...(chartData.title !== undefined ? { title: chartData.title } : {}),
            ...(chartData.metadata !== undefined ? { metadata: chartData.metadata } : {})
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
    const chart = this.#charts.get(id);
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
      ...(chart.title ? { title: `${chart.title} (Copy)` } : {}),
      zIndex: this.#nextZIndex,
      ...(chart.metadata ? { metadata: chart.metadata } : {})
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
      total: this.#charts.size,
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
