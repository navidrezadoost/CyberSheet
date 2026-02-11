/**
 * chart-dual-axis-manager.test.ts
 * 
 * Tests for ChartDualAxisManager
 */

import { ChartDualAxisManager } from '../src/ChartDualAxisManager';
import type { DualAxisConfig, AxisConfig } from '../src/ChartDualAxisManager';
import type { ChartData } from '../src/ChartEngine';

describe('ChartDualAxisManager', () => {
  let manager: ChartDualAxisManager;
  let sampleData: ChartData;
  let dualAxisConfig: DualAxisConfig;

  beforeEach(() => {
    manager = new ChartDualAxisManager();
    
    // Sample data with two datasets
    sampleData = {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
      datasets: [
        {
          label: 'Revenue',
          data: [10000, 15000, 12000, 18000, 16000], // Range: 10k-18k
        },
        {
          label: 'Profit Margin %',
          data: [15, 22, 18, 25, 20], // Range: 15-25
        },
      ],
    };
    
    dualAxisConfig = {
      leftAxis: {
        label: 'Revenue ($)',
        position: 'left',
        color: '#0066CC',
      },
      rightAxis: {
        label: 'Profit Margin (%)',
        position: 'right',
        color: '#00AA00',
      },
      leftAxisDatasets: [0],
      rightAxisDatasets: [1],
    };
  });

  describe('Initialization', () => {
    test('should create manager instance', () => {
      expect(manager).toBeDefined();
    });

    test('should initialize dual axes', () => {
      const info = manager.initializeDualAxes('chart1', sampleData, dualAxisConfig);
      
      expect(info).toBeDefined();
      expect(info.leftScale).toBeDefined();
      expect(info.rightScale).toBeDefined();
      expect(info.leftAxisDatasets).toEqual([0]);
      expect(info.rightAxisDatasets).toEqual([1]);
    });

    test('should default left axis to first dataset', () => {
      const config: DualAxisConfig = {
        leftAxis: {},
        rightAxis: {},
      };
      
      const info = manager.initializeDualAxes('chart1', sampleData, config);
      
      expect(info.leftAxisDatasets).toEqual([0]);
      expect(info.rightAxisDatasets).toEqual([1]);
    });

    test('should handle multiple datasets per axis', () => {
      const multiData: ChartData = {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [
          { label: 'Sales', data: [100, 120, 110, 130] },
          { label: 'Cost', data: [60, 70, 65, 75] },
          { label: 'Profit %', data: [40, 42, 41, 42] },
        ],
      };
      
      const config: DualAxisConfig = {
        leftAxis: {},
        rightAxis: {},
        leftAxisDatasets: [0, 1], // Sales and Cost on left
        rightAxisDatasets: [2],    // Profit % on right
      };
      
      const info = manager.initializeDualAxes('chart1', multiData, config);
      
      expect(info.leftAxisDatasets).toEqual([0, 1]);
      expect(info.rightAxisDatasets).toEqual([2]);
    });
  });

  describe('Scale Calculation', () => {
    test('should calculate scale with auto min/max', () => {
      const info = manager.initializeDualAxes('chart1', sampleData, dualAxisConfig);
      
      // Left axis (Revenue: 10k-18k)
      expect(info.leftScale.min).toBeLessThanOrEqual(10000);
      expect(info.leftScale.max).toBeGreaterThanOrEqual(18000);
      expect(info.leftScale.range).toBe(info.leftScale.max - info.leftScale.min);
      
      // Right axis (Profit %: 15-25)
      expect(info.rightScale.min).toBeLessThanOrEqual(15);
      expect(info.rightScale.max).toBeGreaterThanOrEqual(25);
      expect(info.rightScale.range).toBe(info.rightScale.max - info.rightScale.min);
    });

    test('should use explicit min/max from config', () => {
      const config: DualAxisConfig = {
        leftAxis: {
          min: 0,
          max: 20000,
        },
        rightAxis: {
          min: 0,
          max: 100,
        },
      };
      
      const info = manager.initializeDualAxes('chart1', sampleData, config);
      
      expect(info.leftScale.min).toBe(0);
      expect(info.leftScale.max).toBe(20000);
      expect(info.rightScale.min).toBe(0);
      expect(info.rightScale.max).toBe(100);
    });

    test('should generate ticks', () => {
      const config: DualAxisConfig = {
        leftAxis: { tickCount: 5 },
        rightAxis: { tickCount: 6 },
      };
      
      const info = manager.initializeDualAxes('chart1', sampleData, config);
      
      expect(info.leftScale.ticks).toHaveLength(5);
      expect(info.rightScale.ticks).toHaveLength(6);
      
      // Ticks should be evenly spaced
      const leftInterval = info.leftScale.ticks[1] - info.leftScale.ticks[0];
      expect(info.leftScale.ticks[2] - info.leftScale.ticks[1]).toBeCloseTo(leftInterval, 1);
    });

    test('should handle empty datasets', () => {
      const emptyData: ChartData = {
        labels: ['A', 'B', 'C'],
        datasets: [
          { label: 'Empty', data: [] },
        ],
      };
      
      const config: DualAxisConfig = {
        leftAxis: {},
        rightAxis: {},
      };
      
      const info = manager.initializeDualAxes('chart1', emptyData, config);
      
      // Should return default scale
      expect(info.leftScale.min).toBeDefined();
      expect(info.leftScale.max).toBeDefined();
      expect(info.leftScale.ticks.length).toBeGreaterThan(0);
    });
  });

  describe('Zero Baseline Synchronization', () => {
    test('should synchronize zero baselines', () => {
      const data: ChartData = {
        labels: ['A', 'B', 'C'],
        datasets: [
          { label: 'Set1', data: [-50, 0, 100] },
          { label: 'Set2', data: [-20, 0, 40] },
        ],
      };
      
      const config: DualAxisConfig = {
        leftAxis: {},
        rightAxis: {},
        leftAxisDatasets: [0],
        rightAxisDatasets: [1],
        syncZero: true,
      };
      
      const info = manager.initializeDualAxes('chart1', data, config);
      
      // Calculate zero position as ratio for each axis
      const leftZeroRatio = info.leftScale.max / info.leftScale.range;
      const rightZeroRatio = info.rightScale.max / info.rightScale.range;
      
      // Zero should be at same relative position
      expect(Math.abs(leftZeroRatio - rightZeroRatio)).toBeLessThan(0.01);
    });

    test('should work without zero sync', () => {
      const data: ChartData = {
        labels: ['A', 'B', 'C'],
        datasets: [
          { label: 'Set1', data: [-50, 0, 100] },
          { label: 'Set2', data: [-20, 0, 40] },
        ],
      };
      
      const config: DualAxisConfig = {
        leftAxis: {},
        rightAxis: {},
        leftAxisDatasets: [0],
        rightAxisDatasets: [1],
        syncZero: false,
      };
      
      const info = manager.initializeDualAxes('chart1', data, config);
      
      // Should have independent scales
      expect(info.leftScale).toBeDefined();
      expect(info.rightScale).toBeDefined();
    });
  });

  describe('Same Scale Mode', () => {
    test('should apply same scale to both axes', () => {
      const config: DualAxisConfig = {
        leftAxis: {},
        rightAxis: {},
        sameScale: true,
      };
      
      const info = manager.initializeDualAxes('chart1', sampleData, config);
      
      expect(info.leftScale.min).toBe(info.rightScale.min);
      expect(info.leftScale.max).toBe(info.rightScale.max);
      expect(info.leftScale.range).toBe(info.rightScale.range);
    });
  });

  describe('Value to Pixel Conversion', () => {
    test('should convert left axis value to pixel', () => {
      const config: DualAxisConfig = {
        leftAxis: { min: 0, max: 100 },
        rightAxis: { min: 0, max: 100 },
      };
      
      manager.initializeDualAxes('chart1', sampleData, config);
      
      const chartHeight = 400;
      const padding = { top: 20, bottom: 20 };
      
      // Min value should be at bottom
      const minPixel = manager.valueToPixelLeft('chart1', 0, chartHeight, padding);
      expect(minPixel).toBeCloseTo(chartHeight - padding.bottom, 1);
      
      // Max value should be at top
      const maxPixel = manager.valueToPixelLeft('chart1', 100, chartHeight, padding);
      expect(maxPixel).toBeCloseTo(padding.top, 1);
      
      // Middle value
      const midPixel = manager.valueToPixelLeft('chart1', 50, chartHeight, padding);
      expect(midPixel).toBeCloseTo((chartHeight - padding.bottom + padding.top) / 2, 1);
    });

    test('should convert right axis value to pixel', () => {
      const config: DualAxisConfig = {
        leftAxis: { min: 0, max: 100 },
        rightAxis: { min: 0, max: 50 }, // Different scale
      };
      
      manager.initializeDualAxes('chart1', sampleData, config);
      
      const chartHeight = 400;
      const padding = { top: 20, bottom: 20 };
      
      // Min value should be at bottom
      const minPixel = manager.valueToPixelRight('chart1', 0, chartHeight, padding);
      expect(minPixel).toBeCloseTo(chartHeight - padding.bottom, 1);
      
      // Max value should be at top
      const maxPixel = manager.valueToPixelRight('chart1', 50, chartHeight, padding);
      expect(maxPixel).toBeCloseTo(padding.top, 1);
    });

    test('should throw error for non-existent chart', () => {
      expect(() => {
        manager.valueToPixelLeft('nonexistent', 50, 400, { top: 20, bottom: 20 });
      }).toThrow();
    });
  });

  describe('Dataset Axis Assignment', () => {
    test('should identify dataset axis', () => {
      manager.initializeDualAxes('chart1', sampleData, dualAxisConfig);
      
      expect(manager.getDatasetAxis('chart1', 0)).toBe('left');
      expect(manager.getDatasetAxis('chart1', 1)).toBe('right');
    });

    test('should default to left for unconfigured chart', () => {
      expect(manager.getDatasetAxis('nonexistent', 0)).toBe('left');
    });
  });

  describe('Configuration Retrieval', () => {
    test('should get dual axis info', () => {
      manager.initializeDualAxes('chart1', sampleData, dualAxisConfig);
      
      const info = manager.getDualAxisInfo('chart1');
      
      expect(info).not.toBeNull();
      expect(info?.config).toEqual(dualAxisConfig);
    });

    test('should return null for non-existent chart', () => {
      const info = manager.getDualAxisInfo('nonexistent');
      expect(info).toBeNull();
    });

    test('should check if chart has dual axes', () => {
      manager.initializeDualAxes('chart1', sampleData, dualAxisConfig);
      
      expect(manager.hasDualAxes('chart1')).toBe(true);
      expect(manager.hasDualAxes('chart2')).toBe(false);
    });
  });

  describe('Configuration Updates', () => {
    test('should update dual axis config', () => {
      manager.initializeDualAxes('chart1', sampleData, dualAxisConfig);
      
      const updatedInfo = manager.updateDualAxes('chart1', sampleData, {
        leftAxis: { min: 0, max: 25000 },
      });
      
      expect(updatedInfo.leftScale.min).toBe(0);
      expect(updatedInfo.leftScale.max).toBe(25000);
      // Right axis should remain unchanged
      expect(updatedInfo.rightAxisDatasets).toEqual([1]);
    });

    test('should merge config with existing', () => {
      manager.initializeDualAxes('chart1', sampleData, dualAxisConfig);
      
      manager.updateDualAxes('chart1', sampleData, {
        syncZero: true,
      });
      
      const info = manager.getDualAxisInfo('chart1');
      expect(info?.config.syncZero).toBe(true);
      // Original config should be preserved
      expect(info?.config.leftAxisDatasets).toEqual([0]);
    });
  });

  describe('Tick Labels and Positions', () => {
    test('should get left axis tick labels', () => {
      const config: DualAxisConfig = {
        leftAxis: {
          min: 0,
          max: 100,
          tickCount: 5,
        },
        rightAxis: {},
      };
      
      manager.initializeDualAxes('chart1', sampleData, config);
      
      const labels = manager.getLeftAxisTickLabels('chart1');
      
      expect(labels).toHaveLength(5);
      expect(labels[0]).toContain('0');
      expect(labels[4]).toContain('100');
    });

    test('should get right axis tick labels', () => {
      const config: DualAxisConfig = {
        leftAxis: {},
        rightAxis: {
          min: 0,
          max: 50,
          tickCount: 6,
        },
      };
      
      manager.initializeDualAxes('chart1', sampleData, config);
      
      const labels = manager.getRightAxisTickLabels('chart1');
      
      expect(labels).toHaveLength(6);
    });

    test('should use custom formatter', () => {
      const config: DualAxisConfig = {
        leftAxis: {
          min: 0,
          max: 100,
          tickCount: 3,
          formatValue: (v) => `$${v.toFixed(0)}`,
        },
        rightAxis: {},
      };
      
      manager.initializeDualAxes('chart1', sampleData, config);
      
      const labels = manager.getLeftAxisTickLabels('chart1');
      
      expect(labels[0]).toBe('$0');
      expect(labels[2]).toBe('$100');
    });

    test('should get tick positions', () => {
      const config: DualAxisConfig = {
        leftAxis: { min: 0, max: 100, tickCount: 5 },
        rightAxis: { min: 0, max: 100, tickCount: 5 },
      };
      
      manager.initializeDualAxes('chart1', sampleData, config);
      
      const chartHeight = 400;
      const padding = { top: 20, bottom: 20 };
      
      const leftPositions = manager.getLeftAxisTickPositions('chart1', chartHeight, padding);
      const rightPositions = manager.getRightAxisTickPositions('chart1', chartHeight, padding);
      
      expect(leftPositions).toHaveLength(5);
      expect(rightPositions).toHaveLength(5);
      
      // Positions should be in descending order (top to bottom on canvas)
      expect(leftPositions[0]).toBeGreaterThan(leftPositions[4]);
    });

    test('should return empty array for non-existent chart', () => {
      const labels = manager.getLeftAxisTickLabels('nonexistent');
      expect(labels).toEqual([]);
      
      const positions = manager.getLeftAxisTickPositions('nonexistent', 400, { top: 20, bottom: 20 });
      expect(positions).toEqual([]);
    });
  });

  describe('Cleanup', () => {
    test('should remove dual axes for chart', () => {
      manager.initializeDualAxes('chart1', sampleData, dualAxisConfig);
      
      expect(manager.hasDualAxes('chart1')).toBe(true);
      
      manager.removeDualAxes('chart1');
      
      expect(manager.hasDualAxes('chart1')).toBe(false);
    });

    test('should clear all dual axes', () => {
      manager.initializeDualAxes('chart1', sampleData, dualAxisConfig);
      manager.initializeDualAxes('chart2', sampleData, dualAxisConfig);
      
      expect(manager.hasDualAxes('chart1')).toBe(true);
      expect(manager.hasDualAxes('chart2')).toBe(true);
      
      manager.clear();
      
      expect(manager.hasDualAxes('chart1')).toBe(false);
      expect(manager.hasDualAxes('chart2')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('should handle negative values', () => {
      const data: ChartData = {
        labels: ['A', 'B', 'C'],
        datasets: [
          { label: 'Profits', data: [-100, -50, 25] },
          { label: 'Growth', data: [-5, -2, 3] },
        ],
      };
      
      const config: DualAxisConfig = {
        leftAxis: {},
        rightAxis: {},
        leftAxisDatasets: [0],
        rightAxisDatasets: [1],
      };
      
      const info = manager.initializeDualAxes('chart1', data, config);
      
      expect(info.leftScale.min).toBeLessThanOrEqual(-100);
      expect(info.leftScale.max).toBeGreaterThanOrEqual(25);
      expect(info.rightScale.min).toBeLessThanOrEqual(-5);
      expect(info.rightScale.max).toBeGreaterThanOrEqual(3);
    });

    test('should handle single value dataset', () => {
      const data: ChartData = {
        labels: ['A'],
        datasets: [
          { label: 'Single', data: [42] },
        ],
      };
      
      const config: DualAxisConfig = {
        leftAxis: {},
        rightAxis: {},
      };
      
      const info = manager.initializeDualAxes('chart1', data, config);
      
      expect(info.leftScale.min).toBeLessThan(42);
      expect(info.leftScale.max).toBeGreaterThan(42);
    });

    test('should handle very large numbers', () => {
      const data: ChartData = {
        labels: ['A', 'B'],
        datasets: [
          { label: 'Big', data: [1000000, 2000000] },
        ],
      };
      
      const config: DualAxisConfig = {
        leftAxis: {},
        rightAxis: {},
      };
      
      const info = manager.initializeDualAxes('chart1', data, config);
      
      expect(info.leftScale.max).toBeGreaterThanOrEqual(2000000);
    });

    test('should handle out of bounds dataset indices', () => {
      const config: DualAxisConfig = {
        leftAxis: {},
        rightAxis: {},
        leftAxisDatasets: [0, 5, 10], // Indices 5 and 10 don't exist
        rightAxisDatasets: [1],
      };
      
      expect(() => {
        manager.initializeDualAxes('chart1', sampleData, config);
      }).not.toThrow();
    });
  });
});
