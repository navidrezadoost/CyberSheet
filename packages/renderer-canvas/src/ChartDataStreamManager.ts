/**
 * ChartDataStreamManager.ts
 * 
 * Manages real-time data streaming for live charts, supporting push/pull modes,
 * data buffering, automatic updates, and performance optimization.
 * 
 * Features:
 * - Push mode (data pushed to chart)
 * - Pull mode (chart polls for data)
 * - Circular buffer for time-series data
 * - Configurable update frequency
 * - Automatic re-rendering
 * - Performance throttling
 * - Data aggregation for high-frequency streams
 */

import type { ChartData } from './ChartEngine';

/**
 * Stream mode
 */
export type StreamMode = 'push' | 'pull';

/**
 * Data aggregation strategy for high-frequency streams
 */
export type AggregationStrategy = 'last' | 'average' | 'sum' | 'min' | 'max';

/**
 * Stream configuration
 */
export interface StreamConfig {
  /** Stream mode: 'push' or 'pull' */
  mode: StreamMode;
  
  /** Maximum number of data points to keep (circular buffer) */
  maxDataPoints?: number;
  
  /** Update interval in milliseconds (for pull mode or render throttling) */
  updateInterval?: number;
  
  /** Pull function (for pull mode) */
  pullData?: () => Promise<number[]> | number[];
  
  /** Callback when data is updated */
  onDataUpdate?: (data: ChartData) => void;
  
  /** Callback on error */
  onError?: (error: Error) => void;
  
  /** Whether to aggregate high-frequency data */
  enableAggregation?: boolean;
  
  /** Aggregation strategy */
  aggregationStrategy?: AggregationStrategy;
  
  /** Aggregation window in milliseconds */
  aggregationWindow?: number;
  
  /** Dataset index to stream to (defaults to 0) */
  datasetIndex?: number;
  
  /** Whether to auto-start streaming */
  autoStart?: boolean;
  
  /** Whether to pause on focus loss */
  pauseOnBlur?: boolean;
}

/**
 * Data point with timestamp
 */
interface TimestampedDataPoint {
  value: number;
  timestamp: number;
  label?: string;
}

/**
 * Stream state
 */
interface StreamState {
  isActive: boolean;
  isPaused: boolean;
  lastUpdate: number;
  updateCount: number;
  buffer: TimestampedDataPoint[];
  intervalId?: ReturnType<typeof setInterval>;
  aggregationBuffer: TimestampedDataPoint[];
  lastAggregation: number;
}

export class ChartDataStreamManager {
  private streams: Map<string, StreamState> = new Map();
  private configs: Map<string, StreamConfig> = new Map();
  private chartData: Map<string, ChartData> = new Map();
  
  /**
   * Initialize streaming for a chart
   */
  initializeStream(
    chartId: string,
    initialData: ChartData,
    config: StreamConfig
  ): void {
    // Store initial data
    this.chartData.set(chartId, JSON.parse(JSON.stringify(initialData)));
    
    // Store configuration
    this.configs.set(chartId, {
      maxDataPoints: 100,
      updateInterval: 1000,
      enableAggregation: false,
      aggregationStrategy: 'average',
      aggregationWindow: 500,
      datasetIndex: 0,
      autoStart: true,
      pauseOnBlur: false,
      ...config
    });
    
    // Initialize stream state
    const state: StreamState = {
      isActive: false,
      isPaused: false,
      lastUpdate: Date.now(),
      updateCount: 0,
      buffer: [],
      aggregationBuffer: [],
      lastAggregation: Date.now()
    };
    
    this.streams.set(chartId, state);
    
    // Auto-start if configured
    if (config.autoStart) {
      this.startStream(chartId);
    }
    
    // Setup pause on blur if configured
    if (config.pauseOnBlur && typeof window !== 'undefined') {
      window.addEventListener('blur', () => this.pauseStream(chartId));
      window.addEventListener('focus', () => this.resumeStream(chartId));
    }
  }
  
  /**
   * Start streaming
   */
  startStream(chartId: string): void {
    const config = this.configs.get(chartId);
    const state = this.streams.get(chartId);
    
    if (!config || !state) {
      throw new Error(`Stream not initialized for chart: ${chartId}`);
    }
    
    if (state.isActive) {
      return; // Already started
    }
    
    state.isActive = true;
    state.isPaused = false;
    
    if (config.mode === 'pull' && config.pullData) {
      // Setup pull interval
      state.intervalId = setInterval(async () => {
        if (!state.isPaused) {
          try {
            const newValues = await config.pullData!();
            this.pushData(chartId, newValues);
          } catch (error) {
            if (config.onError) {
              config.onError(error as Error);
            }
          }
        }
      }, config.updateInterval) as any;
    }
  }
  
  /**
   * Stop streaming
   */
  stopStream(chartId: string): void {
    const state = this.streams.get(chartId);
    
    if (!state) {
      return;
    }
    
    state.isActive = false;
    state.isPaused = false;
    
    if (state.intervalId) {
      clearInterval(state.intervalId as any);
      state.intervalId = undefined;
    }
  }
  
  /**
   * Pause streaming (without stopping completely)
   */
  pauseStream(chartId: string): void {
    const state = this.streams.get(chartId);
    
    if (state && state.isActive) {
      state.isPaused = true;
    }
  }
  
  /**
   * Resume streaming
   */
  resumeStream(chartId: string): void {
    const state = this.streams.get(chartId);
    
    if (state && state.isActive) {
      state.isPaused = false;
    }
  }
  
  /**
   * Push data to the stream
   */
  pushData(chartId: string, values: number | number[], labels?: string | string[]): void {
    const config = this.configs.get(chartId);
    const state = this.streams.get(chartId);
    const data = this.chartData.get(chartId);
    
    if (!config || !state || !data) {
      throw new Error(`Stream not initialized for chart: ${chartId}`);
    }
    
    if (state.isPaused) {
      return; // Don't process data when paused
    }
    
    // Convert to array
    const valueArray = Array.isArray(values) ? values : [values];
    const labelArray = labels 
      ? (Array.isArray(labels) ? labels : [labels])
      : valueArray.map((_, i) => new Date(Date.now() + i).toLocaleTimeString());
    
    // Create timestamped data points
    const newPoints: TimestampedDataPoint[] = valueArray.map((value, i) => ({
      value,
      timestamp: Date.now() + i,
      label: labelArray[i]
    }));
    
    if (config.enableAggregation) {
      // Add to aggregation buffer
      state.aggregationBuffer.push(...newPoints);
      
      // Check if aggregation window has passed
      const now = Date.now();
      if (now - state.lastAggregation >= (config.aggregationWindow ?? 500)) {
        this.processAggregation(chartId);
      }
    } else {
      // Add directly to buffer
      state.buffer.push(...newPoints);
      this.updateChartData(chartId);
    }
  }
  
  /**
   * Process aggregation buffer
   */
  private processAggregation(chartId: string): void {
    const config = this.configs.get(chartId)!;
    const state = this.streams.get(chartId)!;
    
    if (state.aggregationBuffer.length === 0) {
      return;
    }
    
    const values = state.aggregationBuffer.map(p => p.value);
    let aggregatedValue: number;
    
    switch (config.aggregationStrategy) {
      case 'last':
        aggregatedValue = values[values.length - 1];
        break;
      case 'average':
        aggregatedValue = values.reduce((a, b) => a + b, 0) / values.length;
        break;
      case 'sum':
        aggregatedValue = values.reduce((a, b) => a + b, 0);
        break;
      case 'min':
        aggregatedValue = Math.min(...values);
        break;
      case 'max':
        aggregatedValue = Math.max(...values);
        break;
      default:
        aggregatedValue = values[values.length - 1];
    }
    
    // Add aggregated point to buffer
    state.buffer.push({
      value: aggregatedValue,
      timestamp: Date.now(),
      label: new Date().toLocaleTimeString()
    });
    
    // Clear aggregation buffer
    state.aggregationBuffer = [];
    state.lastAggregation = Date.now();
    
    this.updateChartData(chartId);
  }
  
  /**
   * Update chart data from buffer
   */
  private updateChartData(chartId: string): void {
    const config = this.configs.get(chartId)!;
    const state = this.streams.get(chartId)!;
    const data = this.chartData.get(chartId)!;
    
    // Apply circular buffer limit
    if (config.maxDataPoints && state.buffer.length > config.maxDataPoints) {
      state.buffer = state.buffer.slice(-config.maxDataPoints);
    }
    
    // Update labels and dataset data
    data.labels = state.buffer.map(p => p.label ?? '');
    
    const datasetIndex = config.datasetIndex ?? 0;
    if (datasetIndex >= 0 && datasetIndex < data.datasets.length) {
      data.datasets[datasetIndex].data = state.buffer.map(p => p.value);
    }
    
    state.lastUpdate = Date.now();
    state.updateCount++;
    
    // Trigger callback
    if (config.onDataUpdate) {
      config.onDataUpdate(data);
    }
  }
  
  /**
   * Get current chart data
   */
  getChartData(chartId: string): ChartData | null {
    return this.chartData.get(chartId) ?? null;
  }
  
  /**
   * Get stream state
   */
  getStreamState(chartId: string): Readonly<StreamState> | null {
    const state = this.streams.get(chartId);
    return state ? { ...state } : null;
  }
  
  /**
   * Check if stream is active
   */
  isStreamActive(chartId: string): boolean {
    const state = this.streams.get(chartId);
    return state?.isActive && !state.isPaused || false;
  }
  
  /**
   * Get stream statistics
   */
  getStreamStats(chartId: string): {
    isActive: boolean;
    isPaused: boolean;
    updateCount: number;
    lastUpdate: number;
    bufferSize: number;
    timeSinceLastUpdate: number;
  } | null {
    const state = this.streams.get(chartId);
    
    if (!state) {
      return null;
    }
    
    return {
      isActive: state.isActive,
      isPaused: state.isPaused,
      updateCount: state.updateCount,
      lastUpdate: state.lastUpdate,
      bufferSize: state.buffer.length,
      timeSinceLastUpdate: Date.now() - state.lastUpdate
    };
  }
  
  /**
   * Clear buffer for a stream
   */
  clearBuffer(chartId: string): void {
    const state = this.streams.get(chartId);
    const data = this.chartData.get(chartId);
    
    if (state) {
      state.buffer = [];
      state.aggregationBuffer = [];
    }
    
    if (data) {
      data.labels = [];
      for (const dataset of data.datasets) {
        dataset.data = [];
      }
    }
  }
  
  /**
   * Update stream configuration
   */
  updateConfig(chartId: string, config: Partial<StreamConfig>): void {
    const existing = this.configs.get(chartId);
    
    if (!existing) {
      throw new Error(`Stream not initialized for chart: ${chartId}`);
    }
    
    // Merge configurations
    Object.assign(existing, config);
    
    // If mode or interval changed and stream is active, restart
    if ((config.mode || config.updateInterval) && this.isStreamActive(chartId)) {
      this.stopStream(chartId);
      this.startStream(chartId);
    }
  }
  
  /**
   * Remove stream
   */
  removeStream(chartId: string): void {
    this.stopStream(chartId);
    this.streams.delete(chartId);
    this.configs.delete(chartId);
    this.chartData.delete(chartId);
  }
  
  /**
   * Clear all streams
   */
  clearAll(): void {
    // Stop all streams first
    for (const chartId of this.streams.keys()) {
      this.stopStream(chartId);
    }
    
    this.streams.clear();
    this.configs.clear();
    this.chartData.clear();
  }
  
  /**
   * Get all active stream IDs
   */
  getActiveStreams(): string[] {
    const activeIds: string[] = [];
    
    for (const [chartId, state] of this.streams.entries()) {
      if (state.isActive && !state.isPaused) {
        activeIds.push(chartId);
      }
    }
    
    return activeIds;
  }
}
