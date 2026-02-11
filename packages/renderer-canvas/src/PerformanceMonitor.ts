/**
 * PerformanceMonitor.ts
 * Week 12 Day 7: Performance Optimization
 * 
 * Monitor and profile chart rendering performance with:
 * - Start/end measurement tracking
 * - Automatic function wrapping
 * - Benchmarking with statistics
 * - Memory usage tracking
 * - Threshold alerts
 * - Multiple report formats
 * 
 * @example Basic measurement
 * ```typescript
 * const id = PerformanceMonitor.start('render-chart');
 * // ... perform rendering ...
 * const metrics = PerformanceMonitor.end(id);
 * console.log('Render took:', metrics?.duration, 'ms');
 * ```
 * 
 * @example Automatic measurement
 * ```typescript
 * const { result, metrics } = await PerformanceMonitor.measure(
 *   'export-png',
 *   () => ChartExporter.exportToPNG(canvas)
 * );
 * ```
 * 
 * @example Benchmarking
 * ```typescript
 * const benchmark = await PerformanceMonitor.benchmark(
 *   'render-1000-points',
 *   () => engine.render(data, options),
 *   100 // 100 iterations
 * );
 * console.log('Average:', benchmark.averageDuration, 'ms');
 * console.log('Ops/sec:', benchmark.operationsPerSecond);
 * ```
 * 
 * @example Threshold monitoring
 * ```typescript
 * PerformanceMonitor.setThresholds('render-chart', {
 *   warning: 50,   // Warn if > 50ms
 *   critical: 100  // Critical if > 100ms
 * });
 * ```
 */

/**
 * Performance metrics captured for a single operation
 * 
 * Contains timing, memory usage, and contextual information about
 * an operation's performance.
 */
export interface PerformanceMetrics {
  /**
   * Operation name
   */
  operation: string;
  
  /**
   * Start time (milliseconds)
   */
  startTime: number;
  
  /**
   * End time (milliseconds)
   */
  endTime: number;
  
  /**
   * Duration (milliseconds)
   */
  duration: number;
  
  /**
   * Memory usage before operation (bytes)
   */
  memoryBefore?: number;
  
  /**
   * Memory usage after operation (bytes)
   */
  memoryAfter?: number;
  
  /**
   * Memory delta (bytes)
   */
  memoryDelta?: number;
  
  /**
   * Number of data points rendered
   */
  dataPoints?: number;
  
  /**
   * Canvas size (width x height)
   */
  canvasSize?: string;
  
  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Statistical results from performance benchmarking
 * 
 * Provides comprehensive statistics for analyzing performance characteristics
 * of repeated operations.
 * 
 * @example Analyzing benchmark results
 * ```typescript
 * const benchmark = await PerformanceMonitor.benchmark('operation', fn, 100);
 * 
 * console.log(`Average: ${benchmark.averageDuration.toFixed(2)}ms`);
 * console.log(`Min: ${benchmark.minDuration.toFixed(2)}ms`);
 * console.log(`Max: ${benchmark.maxDuration.toFixed(2)}ms`);
 * console.log(`Median: ${benchmark.medianDuration.toFixed(2)}ms`);
 * console.log(`Std Dev: ${benchmark.standardDeviation.toFixed(2)}ms`);
 * console.log(`Throughput: ${benchmark.operationsPerSecond.toFixed(0)} ops/sec`);
 * ```
 */
export interface BenchmarkResult {
  /**
   * Operation name
   */
  operation: string;
  
  /**
   * Average duration (milliseconds)
   */
  averageDuration: number;
  
  /**
   * Minimum duration (milliseconds)
   */
  minDuration: number;
  
  /**
   * Maximum duration (milliseconds)
   */
  maxDuration: number;
  
  /**
   * Median duration (milliseconds)
   */
  medianDuration: number;
  
  /**
   * Standard deviation
   */
  standardDeviation: number;
  
  /**
   * Number of runs
   */
  runs: number;
  
  /**
   * Operations per second
   */
  operationsPerSecond: number;
}

/**
 * Performance threshold configuration
 */
export interface PerformanceThresholds {
  /**
   * Warning threshold (milliseconds)
   */
  warning: number;
  
  /**
   * Critical threshold (milliseconds)
   */
  critical: number;
}

/**
 * Performance monitoring and profiling
 */
export class PerformanceMonitor {
  private static metrics: PerformanceMetrics[] = [];
  private static enabled: boolean = true;
  private static thresholds: Map<string, PerformanceThresholds> = new Map();
  
  /**
   * Enable performance monitoring
   */
  static enable(): void {
    this.enabled = true;
  }
  
  /**
   * Disable performance monitoring
   */
  static disable(): void {
    this.enabled = false;
  }
  
  /**
   * Check if monitoring is enabled
   */
  static isEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * Start measuring an operation
   * 
   * @param operation - Operation name
   * @param metadata - Optional metadata
   * @returns Measurement ID
   */
  static start(operation: string, metadata?: Record<string, any>): string {
    if (!this.enabled) {
      return '';
    }
    
    const id = `${operation}_${Date.now()}_${Math.random()}`;
    const metric: PerformanceMetrics = {
      operation,
      startTime: performance.now(),
      endTime: 0,
      duration: 0,
      metadata: { ...metadata, id }
    };
    
    // Capture memory if available
    if (typeof (performance as any).memory !== 'undefined') {
      metric.memoryBefore = (performance as any).memory.usedJSHeapSize;
    }
    
    this.metrics.push(metric);
    return id;
  }
  
  /**
   * End measuring an operation
   * 
   * @param id - Measurement ID from start()
   * @param additionalMetadata - Optional additional metadata
   */
  static end(id: string, additionalMetadata?: Record<string, any>): PerformanceMetrics | null {
    if (!this.enabled || !id) {
      return null;
    }
    
    const metric = this.metrics.find(m => m.metadata?.id === id);
    if (!metric) {
      return null;
    }
    
    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
    
    // Capture memory if available
    if (typeof (performance as any).memory !== 'undefined') {
      metric.memoryAfter = (performance as any).memory.usedJSHeapSize;
      if (metric.memoryAfter && metric.memoryBefore) {
        metric.memoryDelta = metric.memoryAfter - metric.memoryBefore;
      }
    }
    
    // Add additional metadata
    if (additionalMetadata) {
      metric.metadata = { ...metric.metadata, ...additionalMetadata };
    }
    
    // Check thresholds
    this.checkThresholds(metric);
    
    return metric;
  }
  
  /**
   * Measure an operation with automatic timing
   * 
   * @param operation - Operation name
   * @param fn - Function to measure
   * @param metadata - Optional metadata
   * @returns Function result and metrics
   */
  static async measure<T>(
    operation: string,
    fn: () => T | Promise<T>,
    metadata?: Record<string, any>
  ): Promise<{ result: T; metrics: PerformanceMetrics | null }> {
    const id = this.start(operation, metadata);
    
    try {
      const result = await fn();
      const metrics = this.end(id);
      return { result, metrics };
    } catch (error) {
      this.end(id, { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }
  
  /**
   * Get all recorded metrics
   */
  static getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }
  
  /**
   * Get metrics for a specific operation
   */
  static getMetricsForOperation(operation: string): PerformanceMetrics[] {
    return this.metrics.filter(m => m.operation === operation);
  }
  
  /**
   * Clear all metrics
   */
  static clearMetrics(): void {
    this.metrics = [];
  }
  
  /**
   * Set performance thresholds for an operation
   */
  static setThresholds(operation: string, thresholds: PerformanceThresholds): void {
    this.thresholds.set(operation, thresholds);
  }
  
  /**
   * Get performance thresholds for an operation
   */
  static getThresholds(operation: string): PerformanceThresholds | undefined {
    return this.thresholds.get(operation);
  }
  
  /**
   * Check if metrics exceed thresholds
   */
  private static checkThresholds(metric: PerformanceMetrics): void {
    const thresholds = this.thresholds.get(metric.operation);
    if (!thresholds) {
      return;
    }
    
    if (metric.duration >= thresholds.critical) {
      console.warn(`🔴 CRITICAL: ${metric.operation} took ${metric.duration.toFixed(2)}ms (threshold: ${thresholds.critical}ms)`);
    } else if (metric.duration >= thresholds.warning) {
      console.warn(`⚠️  WARNING: ${metric.operation} took ${metric.duration.toFixed(2)}ms (threshold: ${thresholds.warning}ms)`);
    }
  }
  
  /**
   * Run a benchmark with multiple iterations
   * 
   * @param operation - Operation name
   * @param fn - Function to benchmark
   * @param iterations - Number of iterations
   * @returns Benchmark results
   */
  static async benchmark<T>(
    operation: string,
    fn: () => T | Promise<T>,
    iterations: number = 100
  ): Promise<BenchmarkResult> {
    const durations: number[] = [];
    
    // Warm-up run
    await fn();
    
    // Benchmark runs
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      durations.push(end - start);
    }
    
    // Calculate statistics
    const sorted = [...durations].sort((a, b) => a - b);
    const sum = durations.reduce((a, b) => a + b, 0);
    const avg = sum / durations.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    
    // Standard deviation
    const variance = durations.reduce((sum, duration) => {
      return sum + Math.pow(duration - avg, 2);
    }, 0) / durations.length;
    const stdDev = Math.sqrt(variance);
    
    return {
      operation,
      averageDuration: avg,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      medianDuration: median,
      standardDeviation: stdDev,
      runs: iterations,
      operationsPerSecond: 1000 / avg
    };
  }
  
  /**
   * Generate a performance report
   */
  static generateReport(): string {
    const operations = new Map<string, PerformanceMetrics[]>();
    
    // Group metrics by operation
    for (const metric of this.metrics) {
      const existing = operations.get(metric.operation) || [];
      existing.push(metric);
      operations.set(metric.operation, existing);
    }
    
    let report = '📊 Performance Report\n';
    report += '='.repeat(50) + '\n\n';
    
    for (const [operation, metrics] of operations) {
      const durations = metrics.map(m => m.duration);
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      const min = Math.min(...durations);
      const max = Math.max(...durations);
      
      report += `Operation: ${operation}\n`;
      report += `  Calls: ${metrics.length}\n`;
      report += `  Avg Duration: ${avg.toFixed(2)}ms\n`;
      report += `  Min Duration: ${min.toFixed(2)}ms\n`;
      report += `  Max Duration: ${max.toFixed(2)}ms\n`;
      
      // Memory info if available
      const memoryMetrics = metrics.filter(m => m.memoryDelta !== undefined);
      if (memoryMetrics.length > 0) {
        const avgMemory = memoryMetrics.reduce((sum, m) => sum + (m.memoryDelta || 0), 0) / memoryMetrics.length;
        report += `  Avg Memory Delta: ${(avgMemory / 1024 / 1024).toFixed(2)}MB\n`;
      }
      
      report += '\n';
    }
    
    return report;
  }
  
  /**
   * Get performance summary statistics
   */
  static getSummary(): Record<string, {
    count: number;
    averageDuration: number;
    totalDuration: number;
    minDuration: number;
    maxDuration: number;
  }> {
    const summary: Record<string, any> = {};
    
    const operations = new Map<string, PerformanceMetrics[]>();
    for (const metric of this.metrics) {
      const existing = operations.get(metric.operation) || [];
      existing.push(metric);
      operations.set(metric.operation, existing);
    }
    
    for (const [operation, metrics] of operations) {
      const durations = metrics.map(m => m.duration);
      summary[operation] = {
        count: metrics.length,
        averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
        totalDuration: durations.reduce((a, b) => a + b, 0),
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations)
      };
    }
    
    return summary;
  }
  
  /**
   * Export metrics as JSON
   */
  static exportJSON(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      summary: this.getSummary()
    }, null, 2);
  }
  
  /**
   * Export metrics as CSV
   */
  static exportCSV(): string {
    let csv = 'Operation,Start Time,End Time,Duration (ms),Memory Delta (MB),Data Points,Canvas Size\n';
    
    for (const metric of this.metrics) {
      const memoryDelta = metric.memoryDelta ? (metric.memoryDelta / 1024 / 1024).toFixed(2) : '';
      csv += `${metric.operation},${metric.startTime.toFixed(2)},${metric.endTime.toFixed(2)},${metric.duration.toFixed(2)},${memoryDelta},${metric.dataPoints || ''},${metric.canvasSize || ''}\n`;
    }
    
    return csv;
  }
}
