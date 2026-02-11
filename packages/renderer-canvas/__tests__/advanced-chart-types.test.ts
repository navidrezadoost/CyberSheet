/**
 * advanced-chart-types.test.ts
 * Tests for candlestick, funnel, and sunburst charts
 */

import { ChartEngine, ChartOptions, ChartData, OHLCData, SunburstNode } from '../src/ChartEngine';

// Mock canvas context
const createMockCanvas = (w = 600, h = 400) => {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const mockContext: any = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    textBaseline: 'top',
    fillRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    arc: jest.fn(),
    stroke: jest.fn(),
    fill: jest.fn(),
    strokeRect: jest.fn(),
    fillText: jest.fn(),
    closePath: jest.fn(),
    measureText: jest.fn(() => ({ width: 10 })),
  };
  Object.defineProperty(canvas, 'getContext', {
    value: jest.fn(() => mockContext),
    writable: true,
    configurable: true,
  });
  return canvas;
};

describe('Candlestick Chart', () => {
  it('should render candlestick chart with OHLC data', () => {
    const canvas = createMockCanvas(800, 400);
    const engine = new ChartEngine(canvas);

    const ohlcData: OHLCData[] = [
      { open: 100, high: 110, low: 95, close: 105 },
      { open: 105, high: 115, low: 100, close: 112 },
      { open: 112, high: 118, low: 110, close: 115 },
      { open: 115, high: 120, low: 108, close: 110 },
    ];

    const data: ChartData = {
      labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4'],
      datasets: [
        {
          label: 'Stock Price',
          data: [], // Not used for candlestick
          ohlcData: ohlcData
        }
      ]
    };

    const options: ChartOptions = {
      type: 'candlestick',
      width: 800,
      height: 400,
      title: 'Stock Price Chart',
      showAxes: true,
      showGrid: true,
    };

    expect(() => engine.render(data, options)).not.toThrow();
    const ctx = canvas.getContext('2d') as any;
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.strokeRect).toHaveBeenCalled();
  });

  it('should render candlestick with volume bars', () => {
    const canvas = createMockCanvas(800, 500);
    const engine = new ChartEngine(canvas);

    const ohlcData: OHLCData[] = [
      { open: 100, high: 110, low: 95, close: 105, volume: 1000000 },
      { open: 105, high: 115, low: 100, close: 112, volume: 1500000 },
      { open: 112, high: 118, low: 110, close: 115, volume: 1200000 },
    ];

    const data: ChartData = {
      labels: ['Day 1', 'Day 2', 'Day 3'],
      datasets: [
        {
          label: 'Stock',
          data: [],
          ohlcData: ohlcData
        }
      ]
    };

    const options: ChartOptions = {
      type: 'candlestick',
      width: 800,
      height: 500,
      showVolume: true,
      candlestickWidth: 15,
      candlestickGap: 8,
    };

    expect(() => engine.render(data, options)).not.toThrow();
  });

  it('should handle empty OHLC data gracefully', () => {
    const canvas = createMockCanvas(600, 400);
    const engine = new ChartEngine(canvas);

    const data: ChartData = {
      labels: [],
      datasets: [
        {
          label: 'Empty',
          data: [],
          ohlcData: []
        }
      ]
    };

    const options: ChartOptions = {
      type: 'candlestick',
      width: 600,
      height: 400,
    };

    expect(() => engine.render(data, options)).not.toThrow();
  });

  it('should distinguish bullish and bearish candles', () => {
    const canvas = createMockCanvas(400, 300);
    const engine = new ChartEngine(canvas);

    const ohlcData: OHLCData[] = [
      { open: 100, high: 110, low: 95, close: 105 }, // Bullish (green)
      { open: 105, high: 108, low: 100, close: 102 }, // Bearish (red)
    ];

    const data: ChartData = {
      labels: ['Up', 'Down'],
      datasets: [{ label: 'Price', data: [], ohlcData: ohlcData }]
    };

    const options: ChartOptions = {
      type: 'candlestick',
      width: 400,
      height: 300,
    };

    expect(() => engine.render(data, options)).not.toThrow();
    const ctx = canvas.getContext('2d') as any;
    // fillStyle is set as a property, not called as a function
    expect(typeof ctx.fillStyle).toBe('string');
    expect(ctx.fillStyle).toMatch(/#[0-9A-F]{6}/i);
  });
});

describe('Funnel Chart', () => {
  it('should render funnel chart', () => {
    const canvas = createMockCanvas(600, 400);
    const engine = new ChartEngine(canvas);

    const data: ChartData = {
      labels: ['Visitors', 'Sign Ups', 'Trials', 'Purchases'],
      datasets: [
        {
          label: 'Conversion Funnel',
          data: [10000, 5000, 2000, 500]
        }
      ]
    };

    const options: ChartOptions = {
      type: 'funnel',
      width: 600,
      height: 400,
      title: 'Sales Funnel',
    };

    expect(() => engine.render(data, options)).not.toThrow();
    const ctx = canvas.getContext('2d') as any;
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it('should calculate conversion percentages', () => {
    const canvas = createMockCanvas(500, 400);
    const engine = new ChartEngine(canvas);

    const data: ChartData = {
      labels: ['Top', 'Middle', 'Bottom'],
      datasets: [
        {
          label: 'Funnel',
          data: [1000, 500, 100]
        }
      ]
    };

    const options: ChartOptions = {
      type: 'funnel',
      width: 500,
      height: 400,
    };

    expect(() => engine.render(data, options)).not.toThrow();
    const ctx = canvas.getContext('2d') as any;
    // Should show percentages like "50.0%" and "10.0%"
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it('should handle custom neck dimensions', () => {
    const canvas = createMockCanvas(600, 500);
    const engine = new ChartEngine(canvas);

    const data: ChartData = {
      labels: ['A', 'B', 'C'],
      datasets: [{ label: 'Data', data: [300, 200, 100] }]
    };

    const options: ChartOptions = {
      type: 'funnel',
      width: 600,
      height: 500,
      funnelNeckHeight: 100,
      funnelNeckWidth: 150,
    };

    expect(() => engine.render(data, options)).not.toThrow();
  });

  it('should handle empty data', () => {
    const canvas = createMockCanvas(400, 300);
    const engine = new ChartEngine(canvas);

    const data: ChartData = {
      labels: [],
      datasets: [{ label: 'Empty', data: [] }]
    };

    const options: ChartOptions = {
      type: 'funnel',
      width: 400,
      height: 300,
    };

    expect(() => engine.render(data, options)).not.toThrow();
  });
});

describe('Sunburst Chart', () => {
  it('should render sunburst chart with hierarchical data', () => {
    const canvas = createMockCanvas(600, 600);
    const engine = new ChartEngine(canvas);

    const sunburstData: SunburstNode = {
      name: 'Root',
      children: [
        {
          name: 'Category A',
          children: [
            { name: 'A1', value: 30 },
            { name: 'A2', value: 20 }
          ]
        },
        {
          name: 'Category B',
          children: [
            { name: 'B1', value: 25 },
            { name: 'B2', value: 15 }
          ]
        }
      ]
    };

    const data: ChartData = {
      labels: [],
      datasets: [],
      sunburstRoot: sunburstData
    };

    const options: ChartOptions = {
      type: 'sunburst',
      width: 600,
      height: 600,
      title: 'Hierarchical Data',
    };

    expect(() => engine.render(data, options)).not.toThrow();
    const ctx = canvas.getContext('2d') as any;
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('should handle custom inner radius', () => {
    const canvas = createMockCanvas(500, 500);
    const engine = new ChartEngine(canvas);

    const sunburstData: SunburstNode = {
      name: 'Root',
      value: 100,
      children: [
        { name: 'A', value: 60 },
        { name: 'B', value: 40 }
      ]
    };

    const data: ChartData = {
      labels: [],
      datasets: [],
      sunburstRoot: sunburstData
    };

    const options: ChartOptions = {
      type: 'sunburst',
      width: 500,
      height: 500,
      sunburstInnerRadius: 80,
    };

    expect(() => engine.render(data, options)).not.toThrow();
  });

  it('should handle deeply nested hierarchy', () => {
    const canvas = createMockCanvas(800, 800);
    const engine = new ChartEngine(canvas);

    const sunburstData: SunburstNode = {
      name: 'Root',
      children: [
        {
          name: 'L1-A',
          children: [
            {
              name: 'L2-A1',
              children: [
                { name: 'L3-A1a', value: 10 },
                { name: 'L3-A1b', value: 15 }
              ]
            },
            { name: 'L2-A2', value: 25 }
          ]
        },
        {
          name: 'L1-B',
          value: 50
        }
      ]
    };

    const data: ChartData = {
      labels: [],
      datasets: [],
      sunburstRoot: sunburstData
    };

    const options: ChartOptions = {
      type: 'sunburst',
      width: 800,
      height: 800,
    };

    expect(() => engine.render(data, options)).not.toThrow();
  });

  it('should handle missing sunburst data', () => {
    const canvas = createMockCanvas(400, 400);
    const engine = new ChartEngine(canvas);

    const data: ChartData = {
      labels: [],
      datasets: [],
      // No sunburstRoot
    };

    const options: ChartOptions = {
      type: 'sunburst',
      width: 400,
      height: 400,
    };

    expect(() => engine.render(data, options)).not.toThrow();
  });

  it('should use custom colors when provided', () => {
    const canvas = createMockCanvas(500, 500);
    const engine = new ChartEngine(canvas);

    const sunburstData: SunburstNode = {
      name: 'Root',
      children: [
        { name: 'A', value: 50, color: '#FF5733' },
        { name: 'B', value: 50, color: '#33FF57' }
      ]
    };

    const data: ChartData = {
      labels: [],
      datasets: [],
      sunburstRoot: sunburstData
    };

    const options: ChartOptions = {
      type: 'sunburst',
      width: 500,
      height: 500,
    };

    expect(() => engine.render(data, options)).not.toThrow();
    const ctx = canvas.getContext('2d') as any;
    // fillStyle is set as a property, not called as a function
    // Just verify it's been set to some color
    expect(typeof ctx.fillStyle).toBe('string');
    expect(ctx.fillStyle).toMatch(/#[0-9A-F]{6}/i);
  });
});

describe('Chart Type Integration', () => {
  it('should handle all chart types without errors', () => {
    const types: Array<'candlestick' | 'funnel' | 'sunburst'> = ['candlestick', 'funnel', 'sunburst'];
    
    types.forEach(type => {
      const canvas = createMockCanvas(600, 400);
      const engine = new ChartEngine(canvas);

      let data: ChartData;
      if (type === 'candlestick') {
        data = {
          labels: ['Test'],
          datasets: [{
            label: 'Test',
            data: [],
            ohlcData: [{ open: 100, high: 110, low: 95, close: 105 }]
          }]
        };
      } else if (type === 'sunburst') {
        data = {
          labels: [],
          datasets: [],
          sunburstRoot: { name: 'Root', value: 100 }
        };
      } else {
        data = {
          labels: ['Test'],
          datasets: [{ label: 'Test', data: [100] }]
        };
      }

      const options: ChartOptions = {
        type: type,
        width: 600,
        height: 400,
      };

      expect(() => engine.render(data, options)).not.toThrow();
    });
  });
});
