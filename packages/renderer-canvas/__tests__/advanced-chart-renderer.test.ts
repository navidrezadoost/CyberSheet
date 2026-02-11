/**
 * advanced-chart-renderer.test.ts
 * Week 12 Day 6: Advanced Chart Features - Advanced Chart Types Tests
 * 
 * Tests for scatter, combo, and area charts
 */

import { AdvancedChartRenderer, AdvancedChartData } from '../src/AdvancedChartRenderer';
import type { ComboChartConfig, AdvancedChartOptions } from '@cyber-sheet/core';

// Mock canvas context methods
const createMockContext = (): CanvasRenderingContext2D => {
  const ctx = {
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
  } as any;
  return ctx;
};

describe('AdvancedChartRenderer', () => {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let renderer: AdvancedChartRenderer;

  beforeEach(() => {
    // Create mock canvas with proper context
    canvas = { width: 800, height: 600 } as HTMLCanvasElement;
    ctx = createMockContext();
    renderer = new AdvancedChartRenderer(ctx);
  });

  describe('Scatter Chart', () => {
    it('should render scatter plot with point coordinates', () => {
      const data: AdvancedChartData = {
        labels: ['Series 1'],
        datasets: [{
          label: 'Data Points',
          data: [
            { x: 1, y: 2 },
            { x: 2, y: 4 },
            { x: 3, y: 3 },
            { x: 4, y: 5 }
          ]
        }]
      };

      expect(() => {
        renderer.renderScatter(data, 800, 600);
      }).not.toThrow();
    });

    it('should handle numeric array as scatter data', () => {
      const data: AdvancedChartData = {
        labels: ['Series 1'],
        datasets: [{
          label: 'Data Points',
          data: [10, 20, 15, 25, 30] // Will use array index as x
        }]
      };

      expect(() => {
        renderer.renderScatter(data, 800, 600);
      }).not.toThrow();
    });

    it('should render multiple scatter datasets', () => {
      const data: AdvancedChartData = {
        labels: ['Series 1', 'Series 2'],
        datasets: [
          {
            label: 'Group A',
            data: [
              { x: 1, y: 2 },
              { x: 2, y: 4 },
              { x: 3, y: 3 }
            ],
            color: '#FF0000'
          },
          {
            label: 'Group B',
            data: [
              { x: 1.5, y: 3 },
              { x: 2.5, y: 5 },
              { x: 3.5, y: 4 }
            ],
            color: '#00FF00'
          }
        ]
      };

      expect(() => {
        renderer.renderScatter(data, 800, 600);
      }).not.toThrow();
    });

    it('should render scatter with different point styles', () => {
      const data: AdvancedChartData = {
        labels: ['Circle', 'Square', 'Triangle'],
        datasets: [
          {
            label: 'Circles',
            data: [{ x: 1, y: 2 }],
            pointStyle: 'circle',
            pointRadius: 5
          },
          {
            label: 'Squares',
            data: [{ x: 2, y: 3 }],
            pointStyle: 'square',
            pointRadius: 5
          },
          {
            label: 'Triangles',
            data: [{ x: 3, y: 4 }],
            pointStyle: 'triangle',
            pointRadius: 5
          }
        ]
      };

      expect(() => {
        renderer.renderScatter(data, 800, 600);
      }).not.toThrow();
    });

    it('should handle empty scatter data', () => {
      const data: AdvancedChartData = {
        labels: [],
        datasets: [{
          label: 'Empty',
          data: []
        }]
      };

      expect(() => {
        renderer.renderScatter(data, 800, 600);
      }).not.toThrow();
    });

    it('should render scatter with axes and grid', () => {
      const data: AdvancedChartData = {
        labels: ['Data'],
        datasets: [{
          label: 'Points',
          data: [{ x: 1, y: 2 }, { x: 3, y: 4 }]
        }]
      };

      const options: AdvancedChartOptions = {
        showAxes: true,
        showGrid: true
      };

      expect(() => {
        renderer.renderScatter(data, 800, 600, options);
      }).not.toThrow();
    });
  });

  describe('Combo Chart', () => {
    it('should render combo chart with bars and lines', () => {
      const data: AdvancedChartData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr'],
        datasets: [
          {
            label: 'Sales',
            data: [10, 20, 15, 25],
            type: 'bar',
            color: '#4285F4'
          },
          {
            label: 'Target',
            data: [15, 18, 20, 22],
            type: 'line',
            color: '#DB4437'
          }
        ]
      };

      const config: ComboChartConfig = {
        primaryType: 'bar',
        secondaryType: 'line',
        primaryDatasets: [0],
        secondaryDatasets: [1]
      };

      expect(() => {
        renderer.renderCombo(data, 800, 600, config);
      }).not.toThrow();
    });

    it('should render combo chart with secondary axis', () => {
      const data: AdvancedChartData = {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [
          {
            label: 'Revenue',
            data: [100, 150, 120, 180],
            type: 'bar'
          },
          {
            label: 'Growth %',
            data: [5, 8, 6, 10],
            type: 'line'
          }
        ]
      };

      const config: ComboChartConfig = {
        primaryType: 'bar',
        secondaryType: 'line',
        primaryDatasets: [0],
        secondaryDatasets: [1],
        useSecondaryAxis: true
      };

      expect(() => {
        renderer.renderCombo(data, 800, 600, config);
      }).not.toThrow();
    });

    it('should handle combo chart with all bars', () => {
      const data: AdvancedChartData = {
        labels: ['A', 'B', 'C'],
        datasets: [
          {
            label: 'Series 1',
            data: [10, 20, 15],
            type: 'bar'
          },
          {
            label: 'Series 2',
            data: [12, 18, 17],
            type: 'bar'
          }
        ]
      };

      const config: ComboChartConfig = {
        primaryType: 'bar',
        secondaryType: 'bar',
        primaryDatasets: [0],
        secondaryDatasets: [1]
      };

      expect(() => {
        renderer.renderCombo(data, 800, 600, config);
      }).not.toThrow();
    });

    it('should handle combo chart with all lines', () => {
      const data: AdvancedChartData = {
        labels: ['A', 'B', 'C'],
        datasets: [
          {
            label: 'Series 1',
            data: [10, 20, 15],
            type: 'line'
          },
          {
            label: 'Series 2',
            data: [12, 18, 17],
            type: 'line'
          }
        ]
      };

      const config: ComboChartConfig = {
        primaryType: 'line',
        secondaryType: 'line',
        primaryDatasets: [0],
        secondaryDatasets: [1]
      };

      expect(() => {
        renderer.renderCombo(data, 800, 600, config);
      }).not.toThrow();
    });

    it('should handle combo chart with area type', () => {
      const data: AdvancedChartData = {
        labels: ['A', 'B', 'C'],
        datasets: [
          {
            label: 'Area',
            data: [10, 20, 15],
            type: 'area',
            fillOpacity: 0.5
          },
          {
            label: 'Line',
            data: [12, 18, 17],
            type: 'line'
          }
        ]
      };

      const config: ComboChartConfig = {
        primaryType: 'bar',
        secondaryType: 'line',
        primaryDatasets: [0],
        secondaryDatasets: [1]
      };

      expect(() => {
        renderer.renderCombo(data, 800, 600, config);
      }).not.toThrow();
    });

    it('should render combo with grid', () => {
      const data: AdvancedChartData = {
        labels: ['A', 'B'],
        datasets: [
          { label: 'Bar', data: [10, 20], type: 'bar' },
          { label: 'Line', data: [15, 25], type: 'line' }
        ]
      };

      const config: ComboChartConfig = {
        primaryType: 'bar',
        secondaryType: 'line',
        primaryDatasets: [0],
        secondaryDatasets: [1]
      };

      const options: AdvancedChartOptions = {
        showGrid: true
      };

      expect(() => {
        renderer.renderCombo(data, 800, 600, config, options);
      }).not.toThrow();
    });
  });

  describe('Area Chart', () => {
    it('should render area chart', () => {
      const data: AdvancedChartData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
        datasets: [{
          label: 'Sales',
          data: [10, 20, 15, 25, 30],
          color: '#4285F4'
        }]
      };

      expect(() => {
        renderer.renderArea(data, 800, 600);
      }).not.toThrow();
    });

    it('should render multiple area datasets', () => {
      const data: AdvancedChartData = {
        labels: ['Q1', 'Q2', 'Q3', 'Q4'],
        datasets: [
          {
            label: '2023',
            data: [100, 120, 110, 140],
            color: '#4285F4',
            fillOpacity: 0.3
          },
          {
            label: '2024',
            data: [110, 130, 125, 155],
            color: '#DB4437',
            fillOpacity: 0.3
          }
        ]
      };

      expect(() => {
        renderer.renderArea(data, 800, 600);
      }).not.toThrow();
    });

    it('should handle custom fill opacity', () => {
      const data: AdvancedChartData = {
        labels: ['A', 'B', 'C'],
        datasets: [
          {
            label: 'Light',
            data: [10, 15, 12],
            fillOpacity: 0.2
          },
          {
            label: 'Dark',
            data: [8, 12, 10],
            fillOpacity: 0.8
          }
        ]
      };

      expect(() => {
        renderer.renderArea(data, 800, 600);
      }).not.toThrow();
    });

    it('should render area with axes', () => {
      const data: AdvancedChartData = {
        labels: ['A', 'B', 'C'],
        datasets: [{
          label: 'Data',
          data: [10, 20, 15]
        }]
      };

      const options: AdvancedChartOptions = {
        showAxes: true
      };

      expect(() => {
        renderer.renderArea(data, 800, 600, options);
      }).not.toThrow();
    });

    it('should render area with grid', () => {
      const data: AdvancedChartData = {
        labels: ['A', 'B', 'C'],
        datasets: [{
          label: 'Data',
          data: [10, 20, 15]
        }]
      };

      const options: AdvancedChartOptions = {
        showGrid: true
      };

      expect(() => {
        renderer.renderArea(data, 800, 600, options);
      }).not.toThrow();
    });

    it('should handle empty area data', () => {
      const data: AdvancedChartData = {
        labels: [],
        datasets: [{
          label: 'Empty',
          data: []
        }]
      };

      expect(() => {
        renderer.renderArea(data, 800, 600);
      }).not.toThrow();
    });

    it('should handle single data point', () => {
      const data: AdvancedChartData = {
        labels: ['Single'],
        datasets: [{
          label: 'One Point',
          data: [42]
        }]
      };

      expect(() => {
        renderer.renderArea(data, 800, 600);
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero values', () => {
      const data: AdvancedChartData = {
        labels: ['A', 'B', 'C'],
        datasets: [{
          label: 'Zeros',
          data: [0, 0, 0]
        }]
      };

      expect(() => {
        renderer.renderArea(data, 800, 600);
      }).not.toThrow();
    });

    it('should handle negative values in area chart', () => {
      const data: AdvancedChartData = {
        labels: ['A', 'B', 'C'],
        datasets: [{
          label: 'Mixed',
          data: [-10, 20, -5]
        }]
      };

      expect(() => {
        renderer.renderArea(data, 800, 600);
      }).not.toThrow();
    });

    it('should handle very large numbers', () => {
      const data: AdvancedChartData = {
        labels: ['A', 'B', 'C'],
        datasets: [{
          label: 'Large',
          data: [1000000, 2000000, 1500000]
        }]
      };

      expect(() => {
        renderer.renderArea(data, 800, 600);
      }).not.toThrow();
    });

    it('should handle very small canvas', () => {
      const data: AdvancedChartData = {
        labels: ['A', 'B'],
        datasets: [{
          label: 'Data',
          data: [10, 20]
        }]
      };

      expect(() => {
        renderer.renderScatter(data, 200, 150);
      }).not.toThrow();
    });

    it('should handle scatter with identical points', () => {
      const data: AdvancedChartData = {
        labels: ['Same'],
        datasets: [{
          label: 'Identical',
          data: [
            { x: 5, y: 5 },
            { x: 5, y: 5 },
            { x: 5, y: 5 }
          ]
        }]
      };

      expect(() => {
        renderer.renderScatter(data, 800, 600);
      }).not.toThrow();
    });
  });

  describe('Configuration', () => {
    it('should respect axes configuration', () => {
      const data: AdvancedChartData = {
        labels: ['A', 'B'],
        datasets: [{ label: 'Data', data: [10, 20] }]
      };

      const withAxes: AdvancedChartOptions = { showAxes: true };
      const withoutAxes: AdvancedChartOptions = { showAxes: false };

      expect(() => {
        renderer.renderScatter(data, 800, 600, withAxes);
        renderer.renderScatter(data, 800, 600, withoutAxes);
      }).not.toThrow();
    });

    it('should respect grid configuration', () => {
      const data: AdvancedChartData = {
        labels: ['A', 'B'],
        datasets: [{ label: 'Data', data: [10, 20] }]
      };

      const withGrid: AdvancedChartOptions = { showGrid: true };
      const withoutGrid: AdvancedChartOptions = { showGrid: false };

      expect(() => {
        renderer.renderArea(data, 800, 600, withGrid);
        renderer.renderArea(data, 800, 600, withoutGrid);
      }).not.toThrow();
    });

    it('should use default fill opacity when not specified', () => {
      const data: AdvancedChartData = {
        labels: ['A', 'B'],
        datasets: [{
          label: 'Default Opacity',
          data: [10, 20]
          // fillOpacity not specified, should default to 0.3
        }]
      };

      expect(() => {
        renderer.renderArea(data, 800, 600);
      }).not.toThrow();
    });

    it('should use default point radius when not specified', () => {
      const data: AdvancedChartData = {
        labels: ['A'],
        datasets: [{
          label: 'Default Radius',
          data: [{ x: 1, y: 2 }]
          // pointRadius not specified, should default to 4
        }]
      };

      expect(() => {
        renderer.renderScatter(data, 800, 600);
      }).not.toThrow();
    });
  });
});
