import { ChartEngine, ChartOptions, ChartData } from '../src/ChartEngine';

// Mock toDataURL / toBlob on HTMLCanvasElement prototype if not present (JSDOM)
if (!HTMLCanvasElement.prototype.toDataURL) {
  HTMLCanvasElement.prototype.toDataURL = function () { return 'data:image/png;base64,FAKE'; } as any;
}

if (!HTMLCanvasElement.prototype.toBlob) {
  HTMLCanvasElement.prototype.toBlob = function (cb: any) { cb(new Blob()); } as any;
}

describe('Treemap and Waterfall Charts', () => {
  const createMockCanvas = (w = 400, h = 300) => {
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
      stroke: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      strokeRect: jest.fn(),
      fillText: jest.fn(),
      measureText: jest.fn(() => ({ width: 10 })),
    };
    Object.defineProperty(canvas, 'getContext', {
      value: jest.fn(() => mockContext),
      writable: true,
      configurable: true,
    });
    return canvas;
  };

  it('should render treemap without throwing', () => {
    const canvas = createMockCanvas(400, 300);
    const engine = new ChartEngine(canvas);

    const data: ChartData = {
      labels: ['A', 'B', 'C', 'D'],
      datasets: [
        { label: 'Sizes', data: [30, 70, 50, 20] }
      ]
    };

    const options: ChartOptions = {
      type: 'treemap',
      width: 400,
      height: 300,
      title: 'Treemap Test',
      showLegend: false,
      backgroundColor: '#fff'
    };

    expect(() => engine.render(data, options)).not.toThrow();
    expect(canvas.width).toBe(400);
    expect(canvas.height).toBe(300);
  });

  it('should render waterfall without throwing', () => {
  const canvas = createMockCanvas(600, 300);
  const engine = new ChartEngine(canvas);

    const data: ChartData = {
      labels: ['Start', 'Sales', 'Refunds', 'End'],
      datasets: [
        { label: 'Cashflow', data: [0, 120, -30, 90] }
      ]
    };

    const options: ChartOptions = {
      type: 'waterfall',
      width: 600,
      height: 300,
      title: 'Waterfall Test',
      showAxes: true,
      showGrid: true,
      backgroundColor: '#fff'
    };

    expect(() => engine.render(data, options)).not.toThrow();
    expect(canvas.width).toBe(600);
    expect(canvas.height).toBe(300);
  });
});
