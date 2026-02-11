/**
 * chart-engine-integration.test.ts
 * Week 12 Day 6: Integration & Rendering Tests
 * 
 * Tests for integrating advanced features into ChartEngine
 */

import { ChartEngineIntegrated, IntegratedChartOptions } from '../src/ChartEngineIntegration';
import { AdvancedChartData } from '../src/AdvancedChartRenderer';
import type { ChartData } from '../src/ChartEngine';
import type { TrendlineConfig, AxisConfig, ComboChartConfig } from '../../core/src/models/AdvancedChartOptions';

// Mock canvas methods
const createMockCanvas = () => {
  const canvas = {
    width: 800,
    height: 600,
    getContext: jest.fn(() => createMockContext())
  };
  return canvas as any;
};

const createMockContext = () => ({
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  font: '',
  textAlign: 'left',
  canvas: { width: 800, height: 600 },
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
  clearRect: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  fill: jest.fn(),
  arc: jest.fn(),
  fillText: jest.fn(),
  strokeText: jest.fn(),
  measureText: jest.fn(() => ({ width: 50 })),
  setLineDash: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  scale: jest.fn(),
  translate: jest.fn(),
  rotate: jest.fn()
});

describe('ChartEngineIntegration', () => {
  let canvas: any;
  let engine: ChartEngineIntegrated;

  beforeEach(() => {
    canvas = createMockCanvas();
    engine = new ChartEngineIntegrated(canvas);
  });

  describe('Standard Charts with Trendlines', () => {
    it('should render line chart with linear trendline', () => {
      const data: ChartData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
        datasets: [{
          label: 'Sales',
          data: [10, 15, 13, 17, 20]
        }]
      };

      const trendline: TrendlineConfig = {
        type: 'linear',
        showEquation: true,
        showRSquared: true
      };

      const options: IntegratedChartOptions = {
        type: 'line',
        width: 800,
        height: 600,
        advanced: {
          trendlines: [trendline]
        }
      };

      expect(() => {
        engine.renderAdvanced(data, options);
      }).not.toThrow();
    });

    it('should render line chart with polynomial trendline', () => {
      const data: ChartData = {
        labels: ['A', 'B', 'C', 'D', 'E'],
        datasets: [{
          label: 'Data',
          data: [1, 4, 9, 16, 25] // Quadratic
        }]
      };

      const trendline: TrendlineConfig = {
        type: 'polynomial',
        degree: 2,
        showEquation: true
      };

      const options: IntegratedChartOptions = {
        type: 'line',
        width: 800,
        height: 600,
        advanced: {
          trendlines: [trendline]
        }
      };

      expect(() => {
        engine.renderAdvanced(data, options);
      }).not.toThrow();
    });

    it('should render line chart with moving average trendline', () => {
      const data: ChartData = {
        labels: ['1', '2', '3', '4', '5', '6', '7'],
        datasets: [{
          label: 'Noisy Data',
          data: [10, 12, 9, 15, 13, 18, 16]
        }]
      };

      const trendline: TrendlineConfig = {
        type: 'moving-average',
        period: 3
      };

      const options: IntegratedChartOptions = {
        type: 'line',
        width: 800,
        height: 600,
        advanced: {
          trendlines: [trendline]
        }
      };

      expect(() => {
        engine.renderAdvanced(data, options);
      }).not.toThrow();
    });

    it('should render multiple trendlines for multiple datasets', () => {
      const data: ChartData = {
        labels: ['A', 'B', 'C', 'D'],
        datasets: [
          {
            label: 'Series 1',
            data: [10, 20, 15, 25]
          },
          {
            label: 'Series 2',
            data: [5, 10, 12, 15]
          }
        ]
      };

      const options: IntegratedChartOptions = {
        type: 'line',
        width: 800,
        height: 600,
        advanced: {
          trendlines: [
            { type: 'linear', showEquation: true },
            { type: 'exponential', showEquation: false }
          ]
        }
      };

      expect(() => {
        engine.renderAdvanced(data, options);
      }).not.toThrow();
    });
  });

  describe('Charts with Custom Axes', () => {
    it('should render chart with logarithmic Y axis', () => {
      const data: ChartData = {
        labels: ['A', 'B', 'C', 'D'],
        datasets: [{
          label: 'Exponential Growth',
          data: [1, 10, 100, 1000]
        }]
      };

      const yAxisConfig: AxisConfig = {
        scale: 'logarithmic',
        min: 1,
        max: 1000,
        title: 'Log Scale'
      };

      const options: IntegratedChartOptions = {
        type: 'line',
        width: 800,
        height: 600,
        showAxes: true,
        showGrid: true
      };

      expect(() => {
        engine.renderWithCustomAxes(data, options, undefined, yAxisConfig);
      }).not.toThrow();
    });

    it('should render chart with time-based X axis', () => {
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;

      const data: ChartData = {
        labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4'],
        datasets: [{
          label: 'Time Series',
          data: [10, 15, 12, 18]
        }]
      };

      const xAxisConfig: AxisConfig = {
        scale: 'time',
        min: now,
        max: now + 3 * oneDay,
        dateFormat: 'YYYY-MM-DD',
        title: 'Date'
      };

      const options: IntegratedChartOptions = {
        type: 'line',
        width: 800,
        height: 600,
        showAxes: true
      };

      expect(() => {
        engine.renderWithCustomAxes(data, options, xAxisConfig);
      }).not.toThrow();
    });

    it('should render chart with custom min/max values', () => {
      const data: ChartData = {
        labels: ['A', 'B', 'C'],
        datasets: [{
          label: 'Data',
          data: [50, 60, 55]
        }]
      };

      const yAxisConfig: AxisConfig = {
        scale: 'linear',
        min: 0,
        max: 100,
        title: 'Percentage'
      };

      const options: IntegratedChartOptions = {
        type: 'line',
        width: 800,
        height: 600,
        showAxes: true,
        showGrid: true
      };

      expect(() => {
        engine.renderWithCustomAxes(data, options, undefined, yAxisConfig);
      }).not.toThrow();
    });

    it('should render chart with both custom X and Y axes', () => {
      const data: ChartData = {
        labels: ['A', 'B', 'C', 'D'],
        datasets: [{
          label: 'Data',
          data: [10, 100, 50, 200]
        }]
      };

      const xAxisConfig: AxisConfig = {
        scale: 'category',
        title: 'Categories'
      };

      const yAxisConfig: AxisConfig = {
        scale: 'logarithmic',
        min: 1,
        max: 1000,
        title: 'Log Values'
      };

      const options: IntegratedChartOptions = {
        type: 'line',
        width: 800,
        height: 600,
        showAxes: true,
        showGrid: true
      };

      expect(() => {
        engine.renderWithCustomAxes(data, options, xAxisConfig, yAxisConfig);
      }).not.toThrow();
    });
  });

  describe('Advanced Chart Types', () => {
    it('should render scatter chart', () => {
      const data: AdvancedChartData = {
        labels: ['Points'],
        datasets: [{
          label: 'Scatter Data',
          data: [
            { x: 1, y: 2 },
            { x: 2, y: 4 },
            { x: 3, y: 3 },
            { x: 4, y: 5 }
          ]
        }]
      };

      const options: IntegratedChartOptions = {
        type: 'scatter',
        width: 800,
        height: 600,
        showAxes: true,
        showGrid: true
      };

      expect(() => {
        engine.renderAdvanced(data, options);
      }).not.toThrow();
    });

    it('should render combo chart', () => {
      const data: AdvancedChartData = {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [
          {
            label: 'Revenue',
            data: [100, 120, 110, 140],
            type: 'bar'
          },
          {
            label: 'Target',
            data: [110, 115, 120, 125],
            type: 'line'
          }
        ]
      };

      const comboConfig: ComboChartConfig = {
        primaryType: 'bar',
        secondaryType: 'line',
        primaryDatasets: [0],
        secondaryDatasets: [1]
      };

      const options: IntegratedChartOptions = {
        type: 'combo',
        width: 800,
        height: 600,
        showAxes: true,
        showGrid: true,
        advanced: {
          comboConfig
        }
      };

      expect(() => {
        engine.renderAdvanced(data, options);
      }).not.toThrow();
    });

    it('should render area chart', () => {
      const data: AdvancedChartData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
        datasets: [{
          label: 'Revenue',
          data: [100, 120, 110, 140, 135],
          fillOpacity: 0.5
        }]
      };

      const options: IntegratedChartOptions = {
        type: 'area',
        width: 800,
        height: 600,
        showAxes: true,
        showGrid: true
      };

      expect(() => {
        engine.renderAdvanced(data, options);
      }).not.toThrow();
    });

    it('should render bubble chart (as scatter with size)', () => {
      const data: AdvancedChartData = {
        labels: ['Bubbles'],
        datasets: [{
          label: 'Bubble Data',
          data: [
            { x: 1, y: 2 },
            { x: 2, y: 4 },
            { x: 3, y: 3 }
          ],
          pointRadius: 8
        }]
      };

      const options: IntegratedChartOptions = {
        type: 'bubble',
        width: 800,
        height: 600,
        showAxes: true
      };

      expect(() => {
        engine.renderAdvanced(data, options);
      }).not.toThrow();
    });
  });

  describe('Integration Features', () => {
    it('should render scatter chart with trendline', () => {
      const data: AdvancedChartData = {
        labels: ['Data'],
        datasets: [{
          label: 'Points',
          data: [
            { x: 1, y: 2 },
            { x: 2, y: 4 },
            { x: 3, y: 6 },
            { x: 4, y: 8 }
          ]
        }]
      };

      const options: IntegratedChartOptions = {
        type: 'scatter',
        width: 800,
        height: 600,
        showAxes: true,
        advanced: {
          trendlines: [{
            type: 'linear',
            showEquation: true,
            showRSquared: true
          }]
        }
      };

      expect(() => {
        engine.renderAdvanced(data, options);
      }).not.toThrow();
    });

    it('should render area chart with custom axes', () => {
      const data: AdvancedChartData = {
        labels: ['A', 'B', 'C', 'D'],
        datasets: [{
          label: 'Growth',
          data: [1, 10, 100, 1000]
        }]
      };

      const yAxisConfig: AxisConfig = {
        scale: 'logarithmic',
        min: 1,
        max: 1000
      };

      const options: IntegratedChartOptions = {
        type: 'area',
        width: 800,
        height: 600,
        showAxes: true
      };

      expect(() => {
        engine.renderWithCustomAxes(data as any, options, undefined, yAxisConfig);
      }).not.toThrow();
    });

    it('should handle title and legend with advanced charts', () => {
      const data: AdvancedChartData = {
        labels: ['A', 'B'],
        datasets: [{
          label: 'Data',
          data: [{ x: 1, y: 2 }, { x: 2, y: 3 }]
        }]
      };

      const options: IntegratedChartOptions = {
        type: 'scatter',
        width: 800,
        height: 600,
        title: 'Scatter Plot',
        showLegend: true,
        showAxes: true
      };

      expect(() => {
        engine.renderAdvanced(data, options);
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle chart without trendlines', () => {
      const data: ChartData = {
        labels: ['A', 'B', 'C'],
        datasets: [{
          label: 'Data',
          data: [10, 20, 15]
        }]
      };

      const options: IntegratedChartOptions = {
        type: 'line',
        width: 800,
        height: 600
      };

      expect(() => {
        engine.renderAdvanced(data, options);
      }).not.toThrow();
    });

    it('should handle chart with empty trendlines array', () => {
      const data: ChartData = {
        labels: ['A', 'B'],
        datasets: [{
          label: 'Data',
          data: [10, 20]
        }]
      };

      const options: IntegratedChartOptions = {
        type: 'line',
        width: 800,
        height: 600,
        advanced: {
          trendlines: []
        }
      };

      expect(() => {
        engine.renderAdvanced(data, options);
      }).not.toThrow();
    });

    it('should handle advanced chart without advanced config', () => {
      const data: AdvancedChartData = {
        labels: ['A'],
        datasets: [{
          label: 'Data',
          data: [{ x: 1, y: 2 }]
        }]
      };

      const options: IntegratedChartOptions = {
        type: 'scatter',
        width: 800,
        height: 600
      };

      expect(() => {
        engine.renderAdvanced(data, options);
      }).not.toThrow();
    });
  });
});
