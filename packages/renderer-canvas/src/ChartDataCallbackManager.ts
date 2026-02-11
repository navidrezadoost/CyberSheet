/**
 * ChartDataCallbackManager
 * 
 * Manages event callbacks for data point interactions in charts.
 * Supports hover, click, drag, and context menu events with full data context.
 * Includes throttling, debouncing, and priority-based execution.
 */

import type { ChartData } from './ChartEngine';

/**
 * Types of events that can trigger callbacks
 */
export type CallbackEventType = 
  | 'onHover'
  | 'onHoverEnd'
  | 'onClick'
  | 'onDoubleClick'
  | 'onRightClick'
  | 'onDragStart'
  | 'onDrag'
  | 'onDragEnd'
  | 'onContextMenu';

/**
 * Full context provided to callbacks
 */
export interface CallbackContext {
  // Data point information
  point: {
    x: number;
    y: number;
    canvasX: number;
    canvasY: number;
  };
  
  // Dataset information
  dataset: {
    index: number;
    label: string;
    data: number[];
  };
  
  // Point value and index
  value: number;
  dataIndex: number;
  
  // Chart metadata
  chart: {
    id: string;
    type: string;
    data: ChartData;
  };
  
  // Original event
  originalEvent?: MouseEvent | TouchEvent;
  
  // Additional metadata
  metadata?: Record<string, any>;
}

/**
 * Callback function signature
 */
export type DataCallback = (context: CallbackContext) => void | Promise<void>;

/**
 * Options for callback registration
 */
export interface CallbackOptions {
  // Execution priority (higher = earlier execution)
  priority?: number;
  
  // Throttle in milliseconds (minimum time between executions)
  throttle?: number;
  
  // Debounce in milliseconds (delay execution until after events stop)
  debounce?: number;
  
  // Only trigger for specific datasets
  datasetFilter?: number[];
  
  // Enabled state
  enabled?: boolean;
  
  // Custom metadata
  metadata?: Record<string, any>;
}

/**
 * Registered callback with metadata
 */
interface RegisteredCallback {
  id: string;
  callback: DataCallback;
  options: Required<CallbackOptions>;
  lastExecution: number;
  debounceTimer?: ReturnType<typeof setTimeout>;
}

/**
 * Chart callback configuration
 */
interface ChartCallbacks {
  onHover: RegisteredCallback[];
  onHoverEnd: RegisteredCallback[];
  onClick: RegisteredCallback[];
  onDoubleClick: RegisteredCallback[];
  onRightClick: RegisteredCallback[];
  onDragStart: RegisteredCallback[];
  onDrag: RegisteredCallback[];
  onDragEnd: RegisteredCallback[];
  onContextMenu: RegisteredCallback[];
}

/**
 * Manager for chart data point callbacks
 */
export class ChartDataCallbackManager {
  private chartCallbacks: Map<string, ChartCallbacks>;
  private callbackIdCounter: number;
  
  constructor() {
    this.chartCallbacks = new Map();
    this.callbackIdCounter = 0;
  }
  
  /**
   * Initialize callbacks for a chart
   */
  initializeCallbacks(chartId: string): void {
    if (this.chartCallbacks.has(chartId)) {
      return;
    }
    
    const callbacks: ChartCallbacks = {
      onHover: [],
      onHoverEnd: [],
      onClick: [],
      onDoubleClick: [],
      onRightClick: [],
      onDragStart: [],
      onDrag: [],
      onDragEnd: [],
      onContextMenu: []
    };
    
    this.chartCallbacks.set(chartId, callbacks);
  }
  
  /**
   * Register a callback for an event type
   */
  registerCallback(
    chartId: string,
    eventType: CallbackEventType,
    callback: DataCallback,
    options: CallbackOptions = {}
  ): string {
    this.initializeCallbacks(chartId);
    
    const callbackId = `callback_${this.callbackIdCounter++}`;
    
    const registeredCallback: RegisteredCallback = {
      id: callbackId,
      callback,
      options: {
        priority: options.priority ?? 0,
        throttle: options.throttle ?? 0,
        debounce: options.debounce ?? 0,
        datasetFilter: options.datasetFilter ?? [],
        enabled: options.enabled ?? true,
        metadata: options.metadata ?? {}
      },
      lastExecution: 0
    };
    
    const callbacks = this.chartCallbacks.get(chartId)!;
    callbacks[eventType].push(registeredCallback);
    
    // Sort by priority (descending)
    callbacks[eventType].sort((a, b) => b.options.priority - a.options.priority);
    
    return callbackId;
  }
  
  /**
   * Unregister a callback
   */
  unregisterCallback(chartId: string, callbackId: string): boolean {
    const callbacks = this.chartCallbacks.get(chartId);
    if (!callbacks) {
      return false;
    }
    
    let found = false;
    
    for (const eventType of Object.keys(callbacks) as CallbackEventType[]) {
      const index = callbacks[eventType].findIndex(cb => cb.id === callbackId);
      if (index !== -1) {
        // Clear any pending debounce timer
        const callback = callbacks[eventType][index];
        if (callback.debounceTimer) {
          clearTimeout(callback.debounceTimer);
        }
        
        callbacks[eventType].splice(index, 1);
        found = true;
        break;
      }
    }
    
    return found;
  }
  
  /**
   * Unregister all callbacks for an event type
   */
  unregisterEventCallbacks(chartId: string, eventType: CallbackEventType): void {
    const callbacks = this.chartCallbacks.get(chartId);
    if (!callbacks) {
      return;
    }
    
    // Clear all debounce timers
    for (const callback of callbacks[eventType]) {
      if (callback.debounceTimer) {
        clearTimeout(callback.debounceTimer);
      }
    }
    
    callbacks[eventType] = [];
  }
  
  /**
   * Enable a callback
   */
  enableCallback(chartId: string, callbackId: string): void {
    const callback = this.findCallback(chartId, callbackId);
    if (callback) {
      callback.options.enabled = true;
    }
  }
  
  /**
   * Disable a callback
   */
  disableCallback(chartId: string, callbackId: string): void {
    const callback = this.findCallback(chartId, callbackId);
    if (callback) {
      callback.options.enabled = false;
      
      // Clear any pending debounce timer
      if (callback.debounceTimer) {
        clearTimeout(callback.debounceTimer);
        callback.debounceTimer = undefined;
      }
    }
  }
  
  /**
   * Trigger callbacks for an event
   */
  async triggerEvent(
    chartId: string,
    eventType: CallbackEventType,
    context: CallbackContext
  ): Promise<void> {
    const callbacks = this.chartCallbacks.get(chartId);
    if (!callbacks) {
      return;
    }
    
    const now = Date.now();
    
    for (const registeredCallback of callbacks[eventType]) {
      if (!registeredCallback.options.enabled) {
        continue;
      }
      
      // Apply dataset filter
      if (registeredCallback.options.datasetFilter.length > 0) {
        if (!registeredCallback.options.datasetFilter.includes(context.dataset.index)) {
          continue;
        }
      }
      
      // Apply throttling
      if (registeredCallback.options.throttle > 0) {
        const timeSinceLastExecution = now - registeredCallback.lastExecution;
        if (timeSinceLastExecution < registeredCallback.options.throttle) {
          continue;
        }
      }
      
      // Apply debouncing
      if (registeredCallback.options.debounce > 0) {
        // Clear existing timer
        if (registeredCallback.debounceTimer) {
          clearTimeout(registeredCallback.debounceTimer);
        }
        
        // Set new timer
        registeredCallback.debounceTimer = setTimeout(async () => {
          registeredCallback.lastExecution = Date.now();
          await registeredCallback.callback(context);
          registeredCallback.debounceTimer = undefined;
        }, registeredCallback.options.debounce);
        
        continue;
      }
      
      // Execute callback immediately
      registeredCallback.lastExecution = now;
      await registeredCallback.callback(context);
    }
  }
  
  /**
   * Get all callbacks for a chart
   */
  getChartCallbacks(chartId: string): Partial<Record<CallbackEventType, number>> {
    const callbacks = this.chartCallbacks.get(chartId);
    if (!callbacks) {
      return {};
    }
    
    const counts: Partial<Record<CallbackEventType, number>> = {};
    for (const eventType of Object.keys(callbacks) as CallbackEventType[]) {
      const count = callbacks[eventType].length;
      if (count > 0) {
        counts[eventType] = count;
      }
    }
    
    return counts;
  }
  
  /**
   * Get callback by ID
   */
  getCallback(chartId: string, callbackId: string): RegisteredCallback | null {
    return this.findCallback(chartId, callbackId);
  }
  
  /**
   * Check if callback exists
   */
  hasCallback(chartId: string, callbackId: string): boolean {
    return this.findCallback(chartId, callbackId) !== null;
  }
  
  /**
   * Check if callback is enabled
   */
  isCallbackEnabled(chartId: string, callbackId: string): boolean {
    const callback = this.findCallback(chartId, callbackId);
    return callback ? callback.options.enabled : false;
  }
  
  /**
   * Get active callbacks for an event type
   */
  getActiveCallbacks(chartId: string, eventType: CallbackEventType): number {
    const callbacks = this.chartCallbacks.get(chartId);
    if (!callbacks) {
      return 0;
    }
    
    return callbacks[eventType].filter(cb => cb.options.enabled).length;
  }
  
  /**
   * Update callback options
   */
  updateCallbackOptions(
    chartId: string,
    callbackId: string,
    options: Partial<CallbackOptions>
  ): boolean {
    const callback = this.findCallback(chartId, callbackId);
    if (!callback) {
      return false;
    }
    
    // Update options
    if (options.priority !== undefined) {
      callback.options.priority = options.priority;
      
      // Re-sort callbacks by priority
      const callbacks = this.chartCallbacks.get(chartId)!;
      for (const eventType of Object.keys(callbacks) as CallbackEventType[]) {
        const index = callbacks[eventType].findIndex(cb => cb.id === callbackId);
        if (index !== -1) {
          callbacks[eventType].sort((a, b) => b.options.priority - a.options.priority);
          break;
        }
      }
    }
    
    if (options.throttle !== undefined) {
      callback.options.throttle = options.throttle;
    }
    
    if (options.debounce !== undefined) {
      callback.options.debounce = options.debounce;
      
      // Clear existing debounce timer
      if (callback.debounceTimer) {
        clearTimeout(callback.debounceTimer);
        callback.debounceTimer = undefined;
      }
    }
    
    if (options.datasetFilter !== undefined) {
      callback.options.datasetFilter = options.datasetFilter;
    }
    
    if (options.enabled !== undefined) {
      callback.options.enabled = options.enabled;
      
      // Clear debounce timer if disabled
      if (!options.enabled && callback.debounceTimer) {
        clearTimeout(callback.debounceTimer);
        callback.debounceTimer = undefined;
      }
    }
    
    if (options.metadata !== undefined) {
      callback.options.metadata = options.metadata;
    }
    
    return true;
  }
  
  /**
   * Clear all callbacks for a chart
   */
  clearChartCallbacks(chartId: string): void {
    const callbacks = this.chartCallbacks.get(chartId);
    if (!callbacks) {
      return;
    }
    
    // Clear all debounce timers
    for (const eventType of Object.keys(callbacks) as CallbackEventType[]) {
      for (const callback of callbacks[eventType]) {
        if (callback.debounceTimer) {
          clearTimeout(callback.debounceTimer);
        }
      }
    }
    
    this.chartCallbacks.delete(chartId);
  }
  
  /**
   * Clear all callbacks
   */
  clearAll(): void {
    // Clear all debounce timers
    for (const callbacks of this.chartCallbacks.values()) {
      for (const eventType of Object.keys(callbacks) as CallbackEventType[]) {
        for (const callback of callbacks[eventType]) {
          if (callback.debounceTimer) {
            clearTimeout(callback.debounceTimer);
          }
        }
      }
    }
    
    this.chartCallbacks.clear();
  }
  
  /**
   * Get total callback count
   */
  getTotalCallbacks(): number {
    let total = 0;
    
    for (const callbacks of this.chartCallbacks.values()) {
      for (const eventType of Object.keys(callbacks) as CallbackEventType[]) {
        total += callbacks[eventType].length;
      }
    }
    
    return total;
  }
  
  /**
   * Find a callback by ID
   */
  private findCallback(chartId: string, callbackId: string): RegisteredCallback | null {
    const callbacks = this.chartCallbacks.get(chartId);
    if (!callbacks) {
      return null;
    }
    
    for (const eventType of Object.keys(callbacks) as CallbackEventType[]) {
      const callback = callbacks[eventType].find(cb => cb.id === callbackId);
      if (callback) {
        return callback;
      }
    }
    
    return null;
  }
}

/**
 * Helper function to create a callback context
 */
export function createCallbackContext(
  chartId: string,
  chartType: string,
  chartData: ChartData,
  datasetIndex: number,
  dataIndex: number,
  x: number,
  y: number,
  canvasX: number,
  canvasY: number,
  originalEvent?: MouseEvent | TouchEvent,
  metadata?: Record<string, any>
): CallbackContext {
  const dataset = chartData.datasets[datasetIndex];
  const value = dataset.data[dataIndex];
  
  return {
    point: {
      x,
      y,
      canvasX,
      canvasY
    },
    dataset: {
      index: datasetIndex,
      label: dataset.label || `Dataset ${datasetIndex}`,
      data: [...dataset.data]
    },
    value,
    dataIndex,
    chart: {
      id: chartId,
      type: chartType,
      data: chartData
    },
    originalEvent,
    metadata
  };
}
