/**
 * chart-interaction-enhancer.test.ts
 * Tests for advanced chart interaction features
 */

import { ChartInteractionEnhancer, InteractionOptions, AnnotationShape } from '../src/ChartInteractionEnhancer';
import { ChartEngine } from '../src/ChartEngine';

// Mock canvas
const createMockCanvas = (w = 800, h = 600) => {
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
    save: jest.fn(),
    restore: jest.fn(),
    setLineDash: jest.fn(),
    measureText: jest.fn(() => ({ width: 10 })),
  };
  
  Object.defineProperty(canvas, 'getContext', {
    value: jest.fn(() => mockContext),
    writable: true,
    configurable: true,
  });
  
  // Mock getBoundingClientRect
  canvas.getBoundingClientRect = jest.fn(() => ({
    left: 0,
    top: 0,
    width: w,
    height: h,
    x: 0,
    y: 0,
    right: w,
    bottom: h,
    toJSON: () => {},
  }));
  
  return canvas;
};

describe('ChartInteractionEnhancer', () => {
  let canvas: HTMLCanvasElement;
  let chartEngine: ChartEngine;
  let enhancer: ChartInteractionEnhancer;

  beforeEach(() => {
    canvas = createMockCanvas();
    chartEngine = new ChartEngine(canvas);
  });

  afterEach(() => {
    if (enhancer) {
      enhancer.destroy();
    }
  });

  describe('Initialization', () => {
    it('should create enhancer with default options', () => {
      enhancer = new ChartInteractionEnhancer(canvas, chartEngine);
      expect(enhancer).toBeInstanceOf(ChartInteractionEnhancer);
    });

    it('should create enhancer with custom options', () => {
      const options: InteractionOptions = {
        enableZoom: true,
        enablePan: true,
        enableCrosshair: true,
        zoomSpeed: 0.2,
        crosshairColor: '#FF0000',
      };
      enhancer = new ChartInteractionEnhancer(canvas, chartEngine, options);
      expect(enhancer).toBeInstanceOf(ChartInteractionEnhancer);
    });
  });

  describe('Zoom Functionality', () => {
    beforeEach(() => {
      enhancer = new ChartInteractionEnhancer(canvas, chartEngine, {
        enableZoom: true,
      });
    });

    it('should initialize with default zoom state', () => {
      const zoomState = enhancer.getZoomState();
      expect(zoomState.scaleX).toBe(1);
      expect(zoomState.scaleY).toBe(1);
      expect(zoomState.offsetX).toBe(0);
      expect(zoomState.offsetY).toBe(0);
    });

    it('should reset zoom to default', () => {
      enhancer.resetView();
      const zoomState = enhancer.getZoomState();
      expect(zoomState.scaleX).toBe(1);
      expect(zoomState.scaleY).toBe(1);
    });
  });

  describe('Annotation System', () => {
    beforeEach(() => {
      enhancer = new ChartInteractionEnhancer(canvas, chartEngine, {
        enableAnnotations: true,
      });
    });

    it('should add text annotation', () => {
      const annotation: AnnotationShape = {
        type: 'text',
        x: 100,
        y: 100,
        text: 'Test Label',
        fontSize: 16,
        color: '#000000',
      };
      
      expect(() => enhancer.addAnnotation(annotation)).not.toThrow();
    });

    it('should add rectangle annotation', () => {
      const annotation: AnnotationShape = {
        type: 'rectangle',
        x: 50,
        y: 50,
        width: 100,
        height: 80,
        color: '#FF0000',
        strokeWidth: 2,
      };
      
      expect(() => enhancer.addAnnotation(annotation)).not.toThrow();
    });

    it('should add circle annotation', () => {
      const annotation: AnnotationShape = {
        type: 'circle',
        x: 200,
        y: 200,
        radius: 30,
        color: '#00FF00',
      };
      
      expect(() => enhancer.addAnnotation(annotation)).not.toThrow();
    });

    it('should add arrow annotation', () => {
      const annotation: AnnotationShape = {
        type: 'arrow',
        x: 100,
        y: 100,
        endX: 200,
        endY: 200,
        color: '#0000FF',
        strokeWidth: 3,
      };
      
      expect(() => enhancer.addAnnotation(annotation)).not.toThrow();
    });

    it('should add line annotation', () => {
      const annotation: AnnotationShape = {
        type: 'line',
        x: 50,
        y: 150,
        endX: 350,
        endY: 150,
        color: '#FF00FF',
      };
      
      expect(() => enhancer.addAnnotation(annotation)).not.toThrow();
    });

    it('should clear all annotations', () => {
      enhancer.addAnnotation({ type: 'text', x: 10, y: 10, text: 'Test' });
      enhancer.addAnnotation({ type: 'circle', x: 20, y: 20, radius: 10 });
      
      expect(() => enhancer.clearAnnotations()).not.toThrow();
    });

    it('should remove specific annotation', () => {
      enhancer.addAnnotation({ type: 'text', x: 10, y: 10, text: 'First' });
      enhancer.addAnnotation({ type: 'text', x: 20, y: 20, text: 'Second' });
      
      expect(() => enhancer.removeAnnotation(0)).not.toThrow();
    });

    it('should render annotations on canvas', () => {
      const ctx = canvas.getContext('2d') as any;
      enhancer.addAnnotation({ type: 'text', x: 100, y: 100, text: 'Test' });
      
      enhancer.renderAnnotations(ctx);
      
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });
  });

  describe('Crosshair', () => {
    beforeEach(() => {
      enhancer = new ChartInteractionEnhancer(canvas, chartEngine, {
        enableCrosshair: true,
        crosshairColor: '#666666',
      });
    });

    it('should render crosshair on canvas', () => {
      const ctx = canvas.getContext('2d') as any;
      
      enhancer.renderCrosshair(ctx);
      
      // Crosshair not enabled until mouse move
      expect(ctx.beginPath).not.toHaveBeenCalled();
    });
  });

  describe('Selection', () => {
    beforeEach(() => {
      enhancer = new ChartInteractionEnhancer(canvas, chartEngine, {
        enableSelection: true,
        selectionColor: '#4285F4',
      });
    });

    it('should initialize with empty selection', () => {
      const selected = enhancer.getSelectedIndices();
      expect(selected).toEqual([]);
    });

    it('should clear selection', () => {
      enhancer.clearSelection();
      const selected = enhancer.getSelectedIndices();
      expect(selected).toEqual([]);
    });
  });

  describe('Drill-down', () => {
    beforeEach(() => {
      enhancer = new ChartInteractionEnhancer(canvas, chartEngine, {
        enableDrillDown: true,
      });
    });

    it('should push drill-down level', () => {
      const level = {
        data: {
          labels: ['A', 'B'],
          datasets: [{ label: 'Test', data: [10, 20] }],
        },
        title: 'Detailed View',
      };
      
      expect(() => enhancer.drillDown(level)).not.toThrow();
    });

    it('should pop drill-down level', () => {
      const level = {
        data: {
          labels: ['A'],
          datasets: [{ label: 'Test', data: [10] }],
        },
        title: 'Level 1',
      };
      
      enhancer.drillDown(level);
      const popped = enhancer.drillUp();
      
      expect(popped).toEqual(level);
    });

    it('should return undefined when popping empty stack', () => {
      const result = enhancer.drillUp();
      expect(result).toBeUndefined();
    });
  });

  describe('Event Listeners', () => {
    it('should setup event listeners on initialization', () => {
      const addEventListenerSpy = jest.spyOn(canvas, 'addEventListener');
      
      enhancer = new ChartInteractionEnhancer(canvas, chartEngine, {
        enableZoom: true,
        enablePan: true,
      });
      
      expect(addEventListenerSpy).toHaveBeenCalled();
    });

    it('should cleanup event listeners on destroy', () => {
      const removeEventListenerSpy = jest.spyOn(canvas, 'removeEventListener');
      
      enhancer = new ChartInteractionEnhancer(canvas, chartEngine);
      enhancer.destroy();
      
      expect(removeEventListenerSpy).toHaveBeenCalled();
    });
  });

  describe('Integration', () => {
    it('should work with all features enabled', () => {
      const options: InteractionOptions = {
        enableZoom: true,
        enablePan: true,
        enableCrosshair: true,
        enableSelection: true,
        enableAnnotations: true,
        enableDrillDown: true,
        enableTouch: true,
      };
      
      enhancer = new ChartInteractionEnhancer(canvas, chartEngine, options);
      
      // Add annotation
      enhancer.addAnnotation({ type: 'text', x: 100, y: 100, text: 'Test' });
      
      // Drill down
      enhancer.drillDown({
        data: { labels: [], datasets: [] },
        title: 'Detail',
      });
      
      // Reset view
      enhancer.resetView();
      
      // Clear selection
      enhancer.clearSelection();
      
      expect(enhancer).toBeInstanceOf(ChartInteractionEnhancer);
    });

    it('should trigger onRedraw callback', () => {
      const onRedraw = jest.fn();
      enhancer = new ChartInteractionEnhancer(canvas, chartEngine, {
        onRedraw,
      });
      
      enhancer.resetView();
      expect(onRedraw).toHaveBeenCalled();
    });

    it('should trigger onZoomChange callback', () => {
      const onZoomChange = jest.fn();
      enhancer = new ChartInteractionEnhancer(canvas, chartEngine, {
        onZoomChange,
      });
      
      enhancer.resetView();
      expect(onZoomChange).toHaveBeenCalled();
    });

    it('should trigger onSelectionChange callback', () => {
      const onSelectionChange = jest.fn();
      enhancer = new ChartInteractionEnhancer(canvas, chartEngine, {
        enableSelection: true,
        onSelectionChange,
      });
      
      enhancer.clearSelection();
      expect(onSelectionChange).toHaveBeenCalledWith([]);
    });
  });

  describe('Touch Support', () => {
    beforeEach(() => {
      enhancer = new ChartInteractionEnhancer(canvas, chartEngine, {
        enableTouch: true,
        enableZoom: true,
        enablePan: true,
      });
    });

    it('should setup touch event listeners', () => {
      const addEventListenerSpy = jest.spyOn(canvas, 'addEventListener');
      
      enhancer = new ChartInteractionEnhancer(canvas, chartEngine, {
        enableTouch: true,
      });
      
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'touchstart',
        expect.any(Function),
        expect.any(Object)
      );
    });
  });

  describe('Coordinate Transforms', () => {
    beforeEach(() => {
      enhancer = new ChartInteractionEnhancer(canvas, chartEngine);
    });

    it('should convert screen to chart coordinates', () => {
      const result = enhancer.screenToChart(100, 100);
      expect(result).toHaveProperty('x');
      expect(result).toHaveProperty('y');
    });

    it('should convert chart to screen coordinates', () => {
      const result = enhancer.chartToScreen(50, 50);
      expect(result).toHaveProperty('x');
      expect(result).toHaveProperty('y');
    });

    it('should check if point is visible', () => {
      const visible = enhancer.isPointVisible(100, 100);
      expect(typeof visible).toBe('boolean');
    });

    it('should apply transform to context', () => {
      const ctx = canvas.getContext('2d') as any;
      ctx.translate = jest.fn();
      ctx.scale = jest.fn();
      
      enhancer.applyTransform(ctx);
      
      expect(ctx.translate).toHaveBeenCalled();
      expect(ctx.scale).toHaveBeenCalled();
    });
  });

  describe('Animated Zoom', () => {
    beforeEach(() => {
      enhancer = new ChartInteractionEnhancer(canvas, chartEngine);
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should animate zoom to target scale', () => {
      enhancer.animateZoomTo(2, 100);
      
      // Fast-forward time
      jest.advanceTimersByTime(150);
      
      const zoomState = enhancer.getZoomState();
      expect(zoomState.scaleX).toBeGreaterThan(1);
    });
  });
});
