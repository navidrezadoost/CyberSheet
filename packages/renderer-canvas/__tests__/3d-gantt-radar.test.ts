/**
 * 3d-gantt-radar.test.ts
 * Tests for 3D charts (bar3d, pie3d, line3d), Gantt, and Radar charts
 */

import { ChartEngine, ChartOptions, ChartData, GanttTask } from '../src/ChartEngine';

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
    setLineDash: jest.fn(),
  };
  Object.defineProperty(canvas, 'getContext', {
    value: jest.fn(() => mockContext),
    writable: true,
    configurable: true,
  });
  return canvas;
};

describe('3D Bar Chart', () => {
  it('should render 3D bar chart', () => {
    const canvas = createMockCanvas(800, 400);
    const engine = new ChartEngine(canvas);

    const data: ChartData = {
      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      datasets: [
        {
          label: 'Revenue',
          data: [100, 150, 120, 180]
        }
      ]
    };

    const options: ChartOptions = {
      type: 'bar3d',
      width: 800,
      height: 400,
      title: '3D Bar Chart',
      showGrid: true,
      showAxes: true,
    };

    expect(() => engine.render(data, options)).not.toThrow();
    const ctx = canvas.getContext('2d') as any;
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it('should handle custom 3D depth and angle', () => {
    const canvas = createMockCanvas(600, 400);
    const engine = new ChartEngine(canvas);

    const data: ChartData = {
      labels: ['A', 'B', 'C'],
      datasets: [{ label: 'Data', data: [10, 20, 15] }]
    };

    const options: ChartOptions = {
      type: 'bar3d',
      width: 600,
      height: 400,
      depth3d: 30,
      angle3d: 0.5,
    };

    expect(() => engine.render(data, options)).not.toThrow();
  });

  it('should render multiple datasets in 3D', () => {
    const canvas = createMockCanvas(800, 500);
    const engine = new ChartEngine(canvas);

    const data: ChartData = {
      labels: ['Jan', 'Feb', 'Mar'],
      datasets: [
        { label: 'Series 1', data: [100, 120, 90] },
        { label: 'Series 2', data: [80, 110, 130] }
      ]
    };

    const options: ChartOptions = {
      type: 'bar3d',
      width: 800,
      height: 500,
    };

    expect(() => engine.render(data, options)).not.toThrow();
  });
});

describe('3D Pie Chart', () => {
  it('should render 3D pie chart', () => {
    const canvas = createMockCanvas(600, 600);
    const engine = new ChartEngine(canvas);

    const data: ChartData = {
      labels: ['Red', 'Blue', 'Green', 'Yellow'],
      datasets: [
        {
          label: 'Colors',
          data: [30, 25, 20, 25]
        }
      ]
    };

    const options: ChartOptions = {
      type: 'pie3d',
      width: 600,
      height: 600,
      title: '3D Pie Chart',
    };

    expect(() => engine.render(data, options)).not.toThrow();
    const ctx = canvas.getContext('2d') as any;
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('should handle custom depth for 3D pie', () => {
    const canvas = createMockCanvas(500, 500);
    const engine = new ChartEngine(canvas);

    const data: ChartData = {
      labels: ['A', 'B', 'C'],
      datasets: [{ label: 'Data', data: [40, 30, 30] }]
    };

    const options: ChartOptions = {
      type: 'pie3d',
      width: 500,
      height: 500,
      depth3d: 50,
    };

    expect(() => engine.render(data, options)).not.toThrow();
  });

  it('should render labels on 3D pie slices', () => {
    const canvas = createMockCanvas(600, 600);
    const engine = new ChartEngine(canvas);

    const data: ChartData = {
      labels: ['Alpha', 'Beta', 'Gamma'],
      datasets: [{ label: 'Greek', data: [50, 30, 20] }]
    };

    const options: ChartOptions = {
      type: 'pie3d',
      width: 600,
      height: 600,
    };

    expect(() => engine.render(data, options)).not.toThrow();
    const ctx = canvas.getContext('2d') as any;
    expect(ctx.fillText).toHaveBeenCalled();
  });
});

describe('3D Line Chart', () => {
  it('should render 3D line chart', () => {
    const canvas = createMockCanvas(800, 400);
    const engine = new ChartEngine(canvas);

    const data: ChartData = {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      datasets: [
        {
          label: 'Temperature',
          data: [20, 22, 19, 25, 23]
        }
      ]
    };

    const options: ChartOptions = {
      type: 'line3d',
      width: 800,
      height: 400,
      title: '3D Line Chart',
      showGrid: true,
      showAxes: true,
    };

    expect(() => engine.render(data, options)).not.toThrow();
    const ctx = canvas.getContext('2d') as any;
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalled(); // data points
  });

  it('should render multiple series in 3D', () => {
    const canvas = createMockCanvas(800, 500);
    const engine = new ChartEngine(canvas);

    const data: ChartData = {
      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      datasets: [
        { label: 'Product A', data: [100, 120, 110, 130] },
        { label: 'Product B', data: [90, 100, 105, 115] }
      ]
    };

    const options: ChartOptions = {
      type: 'line3d',
      width: 800,
      height: 500,
      depth3d: 25,
    };

    expect(() => engine.render(data, options)).not.toThrow();
  });
});

describe('Gantt Chart', () => {
  it('should render Gantt chart', () => {
    const canvas = createMockCanvas(1000, 400);
    const engine = new ChartEngine(canvas);

    const tasks: GanttTask[] = [
      {
        name: 'Task 1',
        start: new Date('2024-01-01'),
        end: new Date('2024-01-15'),
      },
      {
        name: 'Task 2',
        start: new Date('2024-01-10'),
        end: new Date('2024-01-25'),
      },
      {
        name: 'Task 3',
        start: new Date('2024-01-20'),
        end: new Date('2024-02-05'),
      }
    ];

    const data: ChartData = {
      labels: [],
      datasets: [],
      ganttTasks: tasks
    };

    const options: ChartOptions = {
      type: 'gantt',
      width: 1000,
      height: 400,
      title: 'Project Timeline',
    };

    expect(() => engine.render(data, options)).not.toThrow();
    const ctx = canvas.getContext('2d') as any;
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it('should show task progress', () => {
    const canvas = createMockCanvas(1000, 300);
    const engine = new ChartEngine(canvas);

    const tasks: GanttTask[] = [
      {
        name: 'Design',
        start: new Date('2024-01-01'),
        end: new Date('2024-01-10'),
        progress: 100,
      },
      {
        name: 'Development',
        start: new Date('2024-01-08'),
        end: new Date('2024-01-25'),
        progress: 60,
      }
    ];

    const data: ChartData = {
      labels: [],
      datasets: [],
      ganttTasks: tasks
    };

    const options: ChartOptions = {
      type: 'gantt',
      width: 1000,
      height: 300,
      ganttShowProgress: true,
    };

    expect(() => engine.render(data, options)).not.toThrow();
  });

  it('should show task dependencies', () => {
    const canvas = createMockCanvas(1000, 400);
    const engine = new ChartEngine(canvas);

    const tasks: GanttTask[] = [
      {
        name: 'Task A',
        start: new Date('2024-01-01'),
        end: new Date('2024-01-10'),
      },
      {
        name: 'Task B',
        start: new Date('2024-01-11'),
        end: new Date('2024-01-20'),
        dependencies: [0], // depends on Task A
      },
      {
        name: 'Task C',
        start: new Date('2024-01-15'),
        end: new Date('2024-01-25'),
        dependencies: [0, 1], // depends on both A and B
      }
    ];

    const data: ChartData = {
      labels: [],
      datasets: [],
      ganttTasks: tasks
    };

    const options: ChartOptions = {
      type: 'gantt',
      width: 1000,
      height: 400,
      ganttShowDependencies: true,
    };

    expect(() => engine.render(data, options)).not.toThrow();
    const ctx = canvas.getContext('2d') as any;
    expect(ctx.setLineDash).toHaveBeenCalled();
  });

  it('should handle custom row height', () => {
    const canvas = createMockCanvas(1000, 500);
    const engine = new ChartEngine(canvas);

    const tasks: GanttTask[] = [
      { name: 'Task 1', start: new Date('2024-01-01'), end: new Date('2024-01-10') },
      { name: 'Task 2', start: new Date('2024-01-05'), end: new Date('2024-01-15') }
    ];

    const data: ChartData = {
      labels: [],
      datasets: [],
      ganttTasks: tasks
    };

    const options: ChartOptions = {
      type: 'gantt',
      width: 1000,
      height: 500,
      ganttRowHeight: 60,
    };

    expect(() => engine.render(data, options)).not.toThrow();
  });

  it('should handle empty gantt data', () => {
    const canvas = createMockCanvas(800, 400);
    const engine = new ChartEngine(canvas);

    const data: ChartData = {
      labels: [],
      datasets: [],
      ganttTasks: []
    };

    const options: ChartOptions = {
      type: 'gantt',
      width: 800,
      height: 400,
    };

    expect(() => engine.render(data, options)).not.toThrow();
  });
});

describe('Radar Chart', () => {
  it('should render radar chart', () => {
    const canvas = createMockCanvas(600, 600);
    const engine = new ChartEngine(canvas);

    const data: ChartData = {
      labels: ['Speed', 'Strength', 'Defense', 'Agility', 'Intelligence'],
      datasets: [
        {
          label: 'Player 1',
          data: [80, 70, 60, 90, 75]
        }
      ]
    };

    const options: ChartOptions = {
      type: 'radar',
      width: 600,
      height: 600,
      title: 'Player Stats',
    };

    expect(() => engine.render(data, options)).not.toThrow();
    const ctx = canvas.getContext('2d') as any;
    expect(ctx.arc).toHaveBeenCalled(); // background circles
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('should render multiple datasets on radar', () => {
    const canvas = createMockCanvas(700, 700);
    const engine = new ChartEngine(canvas);

    const data: ChartData = {
      labels: ['A', 'B', 'C', 'D', 'E'],
      datasets: [
        { label: 'Team 1', data: [80, 70, 90, 60, 85] },
        { label: 'Team 2', data: [70, 80, 75, 85, 70] }
      ]
    };

    const options: ChartOptions = {
      type: 'radar',
      width: 700,
      height: 700,
    };

    expect(() => engine.render(data, options)).not.toThrow();
  });

  it('should support unfilled radar mode', () => {
    const canvas = createMockCanvas(600, 600);
    const engine = new ChartEngine(canvas);

    const data: ChartData = {
      labels: ['Metric 1', 'Metric 2', 'Metric 3', 'Metric 4'],
      datasets: [{ label: 'Data', data: [50, 60, 70, 80] }]
    };

    const options: ChartOptions = {
      type: 'radar',
      width: 600,
      height: 600,
      radarFilled: false,
    };

    expect(() => engine.render(data, options)).not.toThrow();
  });

  it('should handle custom point radius', () => {
    const canvas = createMockCanvas(600, 600);
    const engine = new ChartEngine(canvas);

    const data: ChartData = {
      labels: ['X', 'Y', 'Z'],
      datasets: [{ label: 'Coords', data: [100, 80, 90] }]
    };

    const options: ChartOptions = {
      type: 'radar',
      width: 600,
      height: 600,
      radarPointRadius: 8,
    };

    expect(() => engine.render(data, options)).not.toThrow();
  });

  it('should handle empty radar data', () => {
    const canvas = createMockCanvas(500, 500);
    const engine = new ChartEngine(canvas);

    const data: ChartData = {
      labels: [],
      datasets: [{ label: 'Empty', data: [] }]
    };

    const options: ChartOptions = {
      type: 'radar',
      width: 500,
      height: 500,
    };

    expect(() => engine.render(data, options)).not.toThrow();
  });
});

describe('Chart Type Integration', () => {
  it('should handle all new chart types without errors', () => {
    const types: Array<'bar3d' | 'pie3d' | 'line3d' | 'gantt' | 'radar'> = 
      ['bar3d', 'pie3d', 'line3d', 'gantt', 'radar'];
    
    types.forEach(type => {
      const canvas = createMockCanvas(600, 400);
      const engine = new ChartEngine(canvas);

      let data: ChartData;
      if (type === 'gantt') {
        data = {
          labels: [],
          datasets: [],
          ganttTasks: [{
            name: 'Test',
            start: new Date('2024-01-01'),
            end: new Date('2024-01-10')
          }]
        };
      } else {
        data = {
          labels: ['A', 'B', 'C'],
          datasets: [{ label: 'Test', data: [10, 20, 15] }]
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

  it('should handle all chart types in sequence', () => {
    const canvas = createMockCanvas(800, 600);
    const engine = new ChartEngine(canvas);

    const allTypes: ChartOptions['type'][] = [
      'bar', 'line', 'pie', 'sparkline',
      'treemap', 'waterfall', 'candlestick', 'funnel', 'sunburst',
      'bar3d', 'pie3d', 'line3d', 'gantt', 'radar'
    ];

    allTypes.forEach(type => {
      let data: ChartData = {
        labels: ['Test'],
        datasets: [{ label: 'Test', data: [100] }]
      };

      // Special cases
      if (type === 'candlestick') {
        data.datasets[0].ohlcData = [{ open: 100, high: 110, low: 95, close: 105 }];
      } else if (type === 'sunburst') {
        data.sunburstRoot = { name: 'Root', value: 100 };
      } else if (type === 'gantt') {
        data.ganttTasks = [{
          name: 'Test',
          start: new Date('2024-01-01'),
          end: new Date('2024-01-10')
        }];
      }

      const options: ChartOptions = {
        type: type,
        width: 800,
        height: 600,
      };

      expect(() => engine.render(data, options)).not.toThrow();
    });
  });
});
