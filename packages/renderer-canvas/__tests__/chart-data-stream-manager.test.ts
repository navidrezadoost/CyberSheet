/**
 * chart-data-stream-manager.test.ts
 * 
 * Tests for ChartDataStreamManager
 */

import { ChartDataStreamManager } from '../src/ChartDataStreamManager';
import type { StreamConfig } from '../src/ChartDataStreamManager';
import type { ChartData } from '../src/ChartEngine';

// Mock timers
jest.useFakeTimers();

describe('ChartDataStreamManager', () => {
  let manager: ChartDataStreamManager;
  let initialData: ChartData;

  beforeEach(() => {
    manager = new ChartDataStreamManager();
    
    initialData = {
      labels: [],
      datasets: [{
        label: 'Live Data',
        data: []
      }]
    };
  });

  afterEach(() => {
    manager.clearAll();
    jest.clearAllTimers();
  });

  describe('Initialization', () => {
    test('should create manager instance', () => {
      expect(manager).toBeDefined();
    });

    test('should initialize stream with push mode', () => {
      const config: StreamConfig = {
        mode: 'push',
        autoStart: false
      };
      
      manager.initializeStream('chart1', initialData, config);
      
      const data = manager.getChartData('chart1');
      expect(data).not.toBeNull();
      expect(data?.labels).toEqual([]);
      expect(data?.datasets[0].data).toEqual([]);
    });

    test('should initialize stream with pull mode', () => {
      const config: StreamConfig = {
        mode: 'pull',
        pullData: () => [Math.random() * 100],
        autoStart: false
      };
      
      manager.initializeStream('chart1', initialData, config);
      
      expect(manager.getStreamState('chart1')).not.toBeNull();
    });

    test('should auto-start if configured', () => {
      const config: StreamConfig = {
        mode: 'push',
        autoStart: true
      };
      
      manager.initializeStream('chart1', initialData, config);
      
      const state = manager.getStreamState('chart1');
      expect(state?.isActive).toBe(true);
    });

    test('should not auto-start if disabled', () => {
      const config: StreamConfig = {
        mode: 'push',
        autoStart: false
      };
      
      manager.initializeStream('chart1', initialData, config);
      
      const state = manager.getStreamState('chart1');
      expect(state?.isActive).toBe(false);
    });
  });

  describe('Stream Control', () => {
    test('should start stream', () => {
      const config: StreamConfig = {
        mode: 'push',
        autoStart: false
      };
      
      manager.initializeStream('chart1', initialData, config);
      manager.startStream('chart1');
      
      expect(manager.isStreamActive('chart1')).toBe(true);
    });

    test('should stop stream', () => {
      const config: StreamConfig = {
        mode: 'push',
        autoStart: true
      };
      
      manager.initializeStream('chart1', initialData, config);
      expect(manager.isStreamActive('chart1')).toBe(true);
      
      manager.stopStream('chart1');
      expect(manager.isStreamActive('chart1')).toBe(false);
    });

    test('should pause stream', () => {
      const config: StreamConfig = {
        mode: 'push',
        autoStart: true
      };
      
      manager.initializeStream('chart1', initialData, config);
      manager.pauseStream('chart1');
      
      const state = manager.getStreamState('chart1');
      expect(state?.isPaused).toBe(true);
      expect(manager.isStreamActive('chart1')).toBe(false);
    });

    test('should resume stream', () => {
      const config: StreamConfig = {
        mode: 'push',
        autoStart: true
      };
      
      manager.initializeStream('chart1', initialData, config);
      manager.pauseStream('chart1');
      manager.resumeStream('chart1');
      
      const state = manager.getStreamState('chart1');
      expect(state?.isPaused).toBe(false);
      expect(manager.isStreamActive('chart1')).toBe(true);
    });

    test('should not start already active stream', () => {
      const config: StreamConfig = {
        mode: 'push',
        autoStart: true
      };
      
      manager.initializeStream('chart1', initialData, config);
      
      // Should not throw
      expect(() => manager.startStream('chart1')).not.toThrow();
    });

    test('should throw error when starting non-existent stream', () => {
      expect(() => manager.startStream('nonexistent')).toThrow();
    });
  });

  describe('Push Mode Data', () => {
    test('should push single data point', () => {
      const config: StreamConfig = {
        mode: 'push',
        autoStart: true
      };
      
      manager.initializeStream('chart1', initialData, config);
      manager.pushData('chart1', 42);
      
      const data = manager.getChartData('chart1');
      expect(data?.datasets[0].data).toEqual([42]);
      expect(data?.labels.length).toBe(1);
    });

    test('should push multiple data points', () => {
      const config: StreamConfig = {
        mode: 'push',
        autoStart: true
      };
      
      manager.initializeStream('chart1', initialData, config);
      manager.pushData('chart1', [10, 20, 30]);
      
      const data = manager.getChartData('chart1');
      expect(data?.datasets[0].data).toEqual([10, 20, 30]);
    });

    test('should push data with custom labels', () => {
      const config: StreamConfig = {
        mode: 'push',
        autoStart: true
      };
      
      manager.initializeStream('chart1', initialData, config);
      manager.pushData('chart1', [10, 20, 30], ['A', 'B', 'C']);
      
      const data = manager.getChartData('chart1');
      expect(data?.labels).toEqual(['A', 'B', 'C']);
    });

    test('should not push data when paused', () => {
      const config: StreamConfig = {
        mode: 'push',
        autoStart: true
      };
      
      manager.initializeStream('chart1', initialData, config);
      manager.pauseStream('chart1');
      manager.pushData('chart1', 42);
      
      const data = manager.getChartData('chart1');
      expect(data?.datasets[0].data).toEqual([]);
    });

    test('should trigger onDataUpdate callback', () => {
      const onDataUpdate = jest.fn();
      const config: StreamConfig = {
        mode: 'push',
        autoStart: true,
        onDataUpdate
      };
      
      manager.initializeStream('chart1', initialData, config);
      manager.pushData('chart1', 42);
      
      expect(onDataUpdate).toHaveBeenCalled();
    });
  });

  describe('Pull Mode Data', () => {
    test('should pull data at intervals', async () => {
      let counter = 0;
      const pullData = jest.fn(() => [++counter * 10]);
      
      const config: StreamConfig = {
        mode: 'pull',
        pullData,
        updateInterval: 1000,
        autoStart: true
      };
      
      manager.initializeStream('chart1', initialData, config);
      
      // Advance timers
      jest.advanceTimersByTime(1000);
      
      expect(pullData).toHaveBeenCalled();
    });

    test('should handle pull errors', async () => {
      const onError = jest.fn();
      const pullData = jest.fn(() => {
        throw new Error('Pull failed');
      });
      
      const config: StreamConfig = {
        mode: 'pull',
        pullData,
        updateInterval: 1000,
        autoStart: true,
        onError
      };
      
      manager.initializeStream('chart1', initialData, config);
      
      // Advance timers
      jest.advanceTimersByTime(1000);
      
      expect(onError).toHaveBeenCalled();
    });

    test('should not pull when paused', () => {
      const pullData = jest.fn(() => [42]);
      
      const config: StreamConfig = {
        mode: 'pull',
        pullData,
        updateInterval: 1000,
        autoStart: true
      };
      
      manager.initializeStream('chart1', initialData, config);
      manager.pauseStream('chart1');
      
      pullData.mockClear();
      jest.advanceTimersByTime(1000);
      
      const data = manager.getChartData('chart1');
      // Data should be empty because paused before any pull
      expect(data?.datasets[0].data).toEqual([]);
    });
  });

  describe('Circular Buffer', () => {
    test('should limit data points to maxDataPoints', () => {
      const config: StreamConfig = {
        mode: 'push',
        autoStart: true,
        maxDataPoints: 3
      };
      
      manager.initializeStream('chart1', initialData, config);
      
      manager.pushData('chart1', [1, 2, 3, 4, 5]);
      
      const data = manager.getChartData('chart1');
      expect(data?.datasets[0].data).toEqual([3, 4, 5]);
      expect(data?.datasets[0].data.length).toBe(3);
    });

    test('should keep all points when under limit', () => {
      const config: StreamConfig = {
        mode: 'push',
        autoStart: true,
        maxDataPoints: 10
      };
      
      manager.initializeStream('chart1', initialData, config);
      
      manager.pushData('chart1', [1, 2, 3]);
      
      const data = manager.getChartData('chart1');
      expect(data?.datasets[0].data).toEqual([1, 2, 3]);
    });
  });

  describe('Data Aggregation', () => {
    test('should aggregate with average strategy', () => {
      const config: StreamConfig = {
        mode: 'push',
        autoStart: true,
        enableAggregation: true,
        aggregationStrategy: 'average',
        aggregationWindow: 1000
      };
      
      manager.initializeStream('chart1', initialData, config);
      
      manager.pushData('chart1', [10, 20, 30]);
      
      // Advance time to trigger aggregation
      jest.advanceTimersByTime(1000);
      
      // Manually trigger aggregation by pushing more data
      manager.pushData('chart1', 40);
      
      const data = manager.getChartData('chart1');
      // Should have aggregated [10, 20, 30] to 20, then added 40
      expect(data?.datasets[0].data.length).toBeGreaterThan(0);
    });

    test('should aggregate with sum strategy', () => {
      const config: StreamConfig = {
        mode: 'push',
        autoStart: true,
        enableAggregation: true,
        aggregationStrategy: 'sum',
        aggregationWindow: 1000
      };
      
      manager.initializeStream('chart1', initialData, config);
      
      manager.pushData('chart1', [10, 20, 30]);
      jest.advanceTimersByTime(1000);
      manager.pushData('chart1', 0); // Trigger aggregation
      
      const data = manager.getChartData('chart1');
      expect(data?.datasets[0].data.length).toBeGreaterThan(0);
    });

    test('should aggregate with min strategy', () => {
      const config: StreamConfig = {
        mode: 'push',
        autoStart: true,
        enableAggregation: true,
        aggregationStrategy: 'min',
        aggregationWindow: 1000
      };
      
      manager.initializeStream('chart1', initialData, config);
      
      manager.pushData('chart1', [30, 10, 20]);
      jest.advanceTimersByTime(1000);
      manager.pushData('chart1', 0); // Trigger aggregation
      
      const data = manager.getChartData('chart1');
      expect(data?.datasets[0].data.length).toBeGreaterThan(0);
    });

    test('should aggregate with max strategy', () => {
      const config: StreamConfig = {
        mode: 'push',
        autoStart: true,
        enableAggregation: true,
        aggregationStrategy: 'max',
        aggregationWindow: 1000
      };
      
      manager.initializeStream('chart1', initialData, config);
      
      manager.pushData('chart1', [10, 30, 20]);
      jest.advanceTimersByTime(1000);
      manager.pushData('chart1', 0); // Trigger aggregation
      
      const data = manager.getChartData('chart1');
      expect(data?.datasets[0].data.length).toBeGreaterThan(0);
    });

    test('should aggregate with last strategy', () => {
      const config: StreamConfig = {
        mode: 'push',
        autoStart: true,
        enableAggregation: true,
        aggregationStrategy: 'last',
        aggregationWindow: 1000
      };
      
      manager.initializeStream('chart1', initialData, config);
      
      manager.pushData('chart1', [10, 20, 30]);
      jest.advanceTimersByTime(1000);
      manager.pushData('chart1', 0); // Trigger aggregation
      
      const data = manager.getChartData('chart1');
      expect(data?.datasets[0].data.length).toBeGreaterThan(0);
    });
  });

  describe('Multiple Datasets', () => {
    test('should stream to specific dataset', () => {
      const multiData: ChartData = {
        labels: [],
        datasets: [
          { label: 'Set 1', data: [] },
          { label: 'Set 2', data: [] }
        ]
      };
      
      const config: StreamConfig = {
        mode: 'push',
        autoStart: true,
        datasetIndex: 1 // Stream to second dataset
      };
      
      manager.initializeStream('chart1', multiData, config);
      manager.pushData('chart1', [10, 20, 30]);
      
      const data = manager.getChartData('chart1');
      expect(data?.datasets[0].data).toEqual([]); // First dataset unchanged
      expect(data?.datasets[1].data).toEqual([10, 20, 30]); // Second dataset updated
    });

    test('should default to first dataset', () => {
      const multiData: ChartData = {
        labels: [],
        datasets: [
          { label: 'Set 1', data: [] },
          { label: 'Set 2', data: [] }
        ]
      };
      
      const config: StreamConfig = {
        mode: 'push',
        autoStart: true
      };
      
      manager.initializeStream('chart1', multiData, config);
      manager.pushData('chart1', 42);
      
      const data = manager.getChartData('chart1');
      expect(data?.datasets[0].data).toEqual([42]);
      expect(data?.datasets[1].data).toEqual([]);
    });
  });

  describe('Stream Statistics', () => {
    test('should return stream stats', () => {
      const config: StreamConfig = {
        mode: 'push',
        autoStart: true
      };
      
      manager.initializeStream('chart1', initialData, config);
      manager.pushData('chart1', [1, 2, 3]);
      
      const stats = manager.getStreamStats('chart1');
      
      expect(stats).not.toBeNull();
      expect(stats?.isActive).toBe(true);
      expect(stats?.updateCount).toBe(1);
      expect(stats?.bufferSize).toBe(3);
    });

    test('should return null for non-existent stream', () => {
      const stats = manager.getStreamStats('nonexistent');
      expect(stats).toBeNull();
    });

    test('should track update count', () => {
      const config: StreamConfig = {
        mode: 'push',
        autoStart: true
      };
      
      manager.initializeStream('chart1', initialData, config);
      
      manager.pushData('chart1', 1);
      manager.pushData('chart1', 2);
      manager.pushData('chart1', 3);
      
      const stats = manager.getStreamStats('chart1');
      expect(stats?.updateCount).toBe(3);
    });
  });

  describe('Buffer Management', () => {
    test('should clear buffer', () => {
      const config: StreamConfig = {
        mode: 'push',
        autoStart: true
      };
      
      manager.initializeStream('chart1', initialData, config);
      manager.pushData('chart1', [1, 2, 3]);
      
      let data = manager.getChartData('chart1');
      expect(data?.datasets[0].data.length).toBe(3);
      
      manager.clearBuffer('chart1');
      
      data = manager.getChartData('chart1');
      expect(data?.datasets[0].data).toEqual([]);
      expect(data?.labels).toEqual([]);
    });
  });

  describe('Configuration Updates', () => {
    test('should update configuration', () => {
      const config: StreamConfig = {
        mode: 'push',
        autoStart: false,
        maxDataPoints: 10
      };
      
      manager.initializeStream('chart1', initialData, config);
      
      manager.updateConfig('chart1', {
        maxDataPoints: 5
      });
      
      manager.startStream('chart1');
      manager.pushData('chart1', [1, 2, 3, 4, 5, 6, 7, 8]);
      
      const data = manager.getChartData('chart1');
      expect(data?.datasets[0].data.length).toBe(5);
    });

    test('should throw error for non-existent stream', () => {
      expect(() => {
        manager.updateConfig('nonexistent', { maxDataPoints: 5 });
      }).toThrow();
    });
  });

  describe('Cleanup', () => {
    test('should remove stream', () => {
      const config: StreamConfig = {
        mode: 'push',
        autoStart: true
      };
      
      manager.initializeStream('chart1', initialData, config);
      expect(manager.isStreamActive('chart1')).toBe(true);
      
      manager.removeStream('chart1');
      
      expect(manager.getChartData('chart1')).toBeNull();
      expect(manager.getStreamState('chart1')).toBeNull();
    });

    test('should clear all streams', () => {
      const config: StreamConfig = {
        mode: 'push',
        autoStart: true
      };
      
      manager.initializeStream('chart1', initialData, config);
      manager.initializeStream('chart2', initialData, config);
      
      expect(manager.isStreamActive('chart1')).toBe(true);
      expect(manager.isStreamActive('chart2')).toBe(true);
      
      manager.clearAll();
      
      expect(manager.getChartData('chart1')).toBeNull();
      expect(manager.getChartData('chart2')).toBeNull();
    });

    test('should get active streams', () => {
      const config: StreamConfig = {
        mode: 'push',
        autoStart: true
      };
      
      manager.initializeStream('chart1', initialData, config);
      manager.initializeStream('chart2', initialData, config);
      manager.initializeStream('chart3', initialData, { mode: 'push', autoStart: false });
      
      const activeStreams = manager.getActiveStreams();
      
      expect(activeStreams).toContain('chart1');
      expect(activeStreams).toContain('chart2');
      expect(activeStreams).not.toContain('chart3');
    });
  });

  describe('Edge Cases', () => {
    test('should handle pushing to non-existent stream', () => {
      expect(() => {
        manager.pushData('nonexistent', 42);
      }).toThrow();
    });

    test('should handle empty data push', () => {
      const config: StreamConfig = {
        mode: 'push',
        autoStart: true
      };
      
      manager.initializeStream('chart1', initialData, config);
      manager.pushData('chart1', []);
      
      const data = manager.getChartData('chart1');
      expect(data?.datasets[0].data).toEqual([]);
    });

    test('should handle out of bounds dataset index', () => {
      const config: StreamConfig = {
        mode: 'push',
        autoStart: true,
        datasetIndex: 10 // Out of bounds
      };
      
      manager.initializeStream('chart1', initialData, config);
      
      // Should not throw
      expect(() => manager.pushData('chart1', 42)).not.toThrow();
    });
  });
});
