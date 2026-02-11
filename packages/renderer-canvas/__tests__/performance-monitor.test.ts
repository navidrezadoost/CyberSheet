/**
 * performance-monitor.test.ts
 * Week 12 Day 7: Performance Monitor Tests
 */

import { PerformanceMonitor } from '../src/PerformanceMonitor';

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    PerformanceMonitor.clearMetrics();
    PerformanceMonitor.enable();
  });

  describe('Basic Operations', () => {
    it('should start and end measurement', () => {
      const id = PerformanceMonitor.start('test-operation');
      expect(id).toBeTruthy();
      
      const metric = PerformanceMonitor.end(id);
      
      expect(metric).not.toBeNull();
      expect(metric?.operation).toBe('test-operation');
      expect(metric?.duration).toBeGreaterThanOrEqual(0);
    });

    it('should record multiple measurements', () => {
      const id1 = PerformanceMonitor.start('operation-1');
      const id2 = PerformanceMonitor.start('operation-2');
      
      PerformanceMonitor.end(id1);
      PerformanceMonitor.end(id2);
      
      const metrics = PerformanceMonitor.getMetrics();
      expect(metrics).toHaveLength(2);
    });

    it('should include metadata', () => {
      const id = PerformanceMonitor.start('test-op', { foo: 'bar' });
      const metric = PerformanceMonitor.end(id, { baz: 'qux' });
      
      expect(metric?.metadata?.foo).toBe('bar');
      expect(metric?.metadata?.baz).toBe('qux');
    });

    it('should return null for invalid ID', () => {
      const metric = PerformanceMonitor.end('invalid-id');
      expect(metric).toBeNull();
    });

    it('should return empty string when disabled', () => {
      PerformanceMonitor.disable();
      const id = PerformanceMonitor.start('test-op');
      expect(id).toBe('');
    });
  });

  describe('Enable/Disable', () => {
    it('should enable monitoring', () => {
      PerformanceMonitor.enable();
      expect(PerformanceMonitor.isEnabled()).toBe(true);
    });

    it('should disable monitoring', () => {
      PerformanceMonitor.disable();
      expect(PerformanceMonitor.isEnabled()).toBe(false);
    });

    it('should not record when disabled', () => {
      PerformanceMonitor.disable();
      const id = PerformanceMonitor.start('test-op');
      PerformanceMonitor.end(id);
      
      const metrics = PerformanceMonitor.getMetrics();
      expect(metrics).toHaveLength(0);
    });
  });

  describe('Measure Function', () => {
    it('should measure synchronous function', async () => {
      const { result, metrics } = await PerformanceMonitor.measure(
        'sync-fn',
        () => 42
      );
      
      expect(result).toBe(42);
      expect(metrics).not.toBeNull();
      expect(metrics?.operation).toBe('sync-fn');
    });

    it('should measure async function', async () => {
      const { result, metrics } = await PerformanceMonitor.measure(
        'async-fn',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'done';
        }
      );
      
      expect(result).toBe('done');
      expect(metrics?.duration).toBeGreaterThanOrEqual(9); // Allow slight timing variance
    });

    it('should handle function errors', async () => {
      await expect(
        PerformanceMonitor.measure('error-fn', () => {
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');
      
      const metrics = PerformanceMonitor.getMetrics();
      expect(metrics[0].metadata?.error).toBe('Test error');
    });
  });

  describe('Metrics Retrieval', () => {
    it('should get all metrics', () => {
      PerformanceMonitor.start('op-1');
      PerformanceMonitor.start('op-2');
      
      const metrics = PerformanceMonitor.getMetrics();
      expect(metrics).toHaveLength(2);
    });

    it('should get metrics for specific operation', () => {
      const id1 = PerformanceMonitor.start('target-op');
      const id2 = PerformanceMonitor.start('other-op');
      
      PerformanceMonitor.end(id1);
      PerformanceMonitor.end(id2);
      
      const metrics = PerformanceMonitor.getMetricsForOperation('target-op');
      expect(metrics).toHaveLength(1);
      expect(metrics[0].operation).toBe('target-op');
    });

    it('should clear all metrics', () => {
      PerformanceMonitor.start('op-1');
      PerformanceMonitor.start('op-2');
      
      PerformanceMonitor.clearMetrics();
      
      const metrics = PerformanceMonitor.getMetrics();
      expect(metrics).toHaveLength(0);
    });
  });

  describe('Thresholds', () => {
    it('should set and get thresholds', () => {
      PerformanceMonitor.setThresholds('test-op', {
        warning: 50,
        critical: 100
      });
      
      const thresholds = PerformanceMonitor.getThresholds('test-op');
      expect(thresholds?.warning).toBe(50);
      expect(thresholds?.critical).toBe(100);
    });

    it('should return undefined for non-existent thresholds', () => {
      const thresholds = PerformanceMonitor.getThresholds('non-existent');
      expect(thresholds).toBeUndefined();
    });
  });

  describe('Benchmarking', () => {
    it('should run benchmark', async () => {
      let counter = 0;
      const result = await PerformanceMonitor.benchmark(
        'increment',
        () => { counter++; },
        10
      );
      
      expect(result.operation).toBe('increment');
      expect(result.runs).toBe(10);
      expect(result.averageDuration).toBeGreaterThanOrEqual(0);
      expect(result.minDuration).toBeLessThanOrEqual(result.maxDuration);
      expect(result.operationsPerSecond).toBeGreaterThan(0);
      expect(counter).toBe(11); // 1 warm-up + 10 runs
    });

    it('should calculate statistics', async () => {
      const result = await PerformanceMonitor.benchmark(
        'math-op',
        () => Math.random() * 100,
        50
      );
      
      expect(result.medianDuration).toBeGreaterThanOrEqual(0);
      expect(result.standardDeviation).toBeGreaterThanOrEqual(0);
      expect(result.minDuration).toBeLessThanOrEqual(result.medianDuration);
      expect(result.maxDuration).toBeGreaterThanOrEqual(result.medianDuration);
    });
  });

  describe('Reports', () => {
    beforeEach(() => {
      const id1 = PerformanceMonitor.start('render-chart');
      const id2 = PerformanceMonitor.start('render-chart');
      const id3 = PerformanceMonitor.start('export-png');
      
      PerformanceMonitor.end(id1);
      PerformanceMonitor.end(id2);
      PerformanceMonitor.end(id3);
    });

    it('should generate text report', () => {
      const report = PerformanceMonitor.generateReport();
      
      expect(report).toContain('Performance Report');
      expect(report).toContain('render-chart');
      expect(report).toContain('export-png');
      expect(report).toContain('Avg Duration');
    });

    it('should generate summary', () => {
      const summary = PerformanceMonitor.getSummary();
      
      expect(summary['render-chart']).toBeDefined();
      expect(summary['render-chart'].count).toBe(2);
      expect(summary['export-png']).toBeDefined();
      expect(summary['export-png'].count).toBe(1);
    });

    it('should export as JSON', () => {
      const json = PerformanceMonitor.exportJSON();
      const data = JSON.parse(json);
      
      expect(data.timestamp).toBeDefined();
      expect(data.metrics).toHaveLength(3);
      expect(data.summary).toBeDefined();
    });

    it('should export as CSV', () => {
      const csv = PerformanceMonitor.exportCSV();
      
      expect(csv).toContain('Operation,Start Time,End Time,Duration');
      expect(csv).toContain('render-chart');
      expect(csv).toContain('export-png');
      
      const lines = csv.split('\n');
      expect(lines.length).toBeGreaterThan(3); // Header + 3 data rows
    });
  });

  describe('Summary Statistics', () => {
    it('should calculate correct statistics', () => {
      const id1 = PerformanceMonitor.start('test-op');
      const id2 = PerformanceMonitor.start('test-op');
      const id3 = PerformanceMonitor.start('test-op');
      
      PerformanceMonitor.end(id1);
      PerformanceMonitor.end(id2);
      PerformanceMonitor.end(id3);
      
      const summary = PerformanceMonitor.getSummary();
      const stats = summary['test-op'];
      
      expect(stats.count).toBe(3);
      expect(stats.averageDuration).toBeGreaterThanOrEqual(0);
      expect(stats.totalDuration).toBeGreaterThanOrEqual(stats.averageDuration);
      expect(stats.minDuration).toBeLessThanOrEqual(stats.maxDuration);
    });
  });
});
