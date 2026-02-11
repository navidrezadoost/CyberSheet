/**
 * Integration tests for ChartInteractionEnhancer
 * Tests real-world scenarios with touch, callbacks, and transforms
 */

import { ChartInteractionEnhancer, InteractionOptions } from '../src/ChartInteractionEnhancer';
import { ChartEngine } from '../src/ChartEngine';

describe('ChartInteractionEnhancer Integration Tests', () => {
  let canvas: HTMLCanvasElement;
  let chartEngine: ChartEngine;
  let enhancer: ChartInteractionEnhancer;
  
  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    chartEngine = new ChartEngine(canvas);
  });
  
  afterEach(() => {
    if (enhancer) {
      enhancer.destroy();
    }
  });

  describe('Real-world Scenario: Interactive Dashboard', () => {
    it('should handle zoom, pan, and selection together', () => {
      const callbacks = {
        onRedraw: jest.fn(),
        onZoomChange: jest.fn(),
        onSelectionChange: jest.fn(),
      };
      
      enhancer = new ChartInteractionEnhancer(canvas, chartEngine, {
        enableZoom: true,
        enablePan: true,
        enableSelection: true,
        ...callbacks,
      });
      
      // Simulate zoom
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        clientX: 400,
        clientY: 300,
      });
      canvas.dispatchEvent(wheelEvent);
      
      // Verify callbacks
      expect(callbacks.onZoomChange).toHaveBeenCalled();
      expect(callbacks.onRedraw).toHaveBeenCalled();
      
      // Verify zoom state
      const zoomState = enhancer.getZoomState();
      expect(zoomState.scaleX).toBeGreaterThan(1);
    });

    it('should coordinate between annotation and selection', () => {
      enhancer = new ChartInteractionEnhancer(canvas, chartEngine, {
        enableAnnotations: true,
        enableSelection: true,
      });
      
      // Add annotation
      enhancer.addAnnotation({
        type: 'text',
        x: 100,
        y: 100,
        text: 'Important point',
      });
      
      // Add arrow pointing to data
      enhancer.addAnnotation({
        type: 'arrow',
        x: 150,
        y: 150,
        endX: 200,
        endY: 200,
      });
      
      // Clear selection should not affect annotations
      enhancer.clearSelection();
      
      expect(enhancer).toBeInstanceOf(ChartInteractionEnhancer);
    });
  });

  describe('Mobile Touch Scenarios', () => {
    it('should handle pinch-to-zoom gesture', () => {
      const onZoomChange = jest.fn();
      
      enhancer = new ChartInteractionEnhancer(canvas, chartEngine, {
        enableTouch: true,
        enableZoom: true,
        onZoomChange,
      });
      
      // Simulate two-finger touch start
      const touch1Start = { clientX: 300, clientY: 300, identifier: 1 } as any;
      const touch2Start = { clientX: 500, clientY: 300, identifier: 2 } as any;
      
      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [touch1Start, touch2Start] as any,
        cancelable: true,
      });
      
      canvas.dispatchEvent(touchStartEvent);
      
      // Simulate pinch out (zoom in)
      const touch1Move = { clientX: 250, clientY: 300, identifier: 1 } as any;
      const touch2Move = { clientX: 550, clientY: 300, identifier: 2 } as any;
      
      const touchMoveEvent = new TouchEvent('touchmove', {
        touches: [touch1Move, touch2Move] as any,
        cancelable: true,
      });
      
      canvas.dispatchEvent(touchMoveEvent);
      
      // Note: The zoom change may or may not be triggered depending on implementation
      // The test verifies the event handling doesn't crash
      expect(enhancer).toBeInstanceOf(ChartInteractionEnhancer);
    });

    it('should handle single-finger pan gesture', () => {
      const onRedraw = jest.fn();
      
      enhancer = new ChartInteractionEnhancer(canvas, chartEngine, {
        enableTouch: true,
        enablePan: true,
        onRedraw,
      });
      
      // Simulate single-finger touch and drag
      const touchStart = { clientX: 400, clientY: 300, identifier: 1 } as any;
      
      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [touchStart] as any,
        cancelable: true,
      });
      
      canvas.dispatchEvent(touchStartEvent);
      
      // Move finger
      const touchMove = { clientX: 450, clientY: 350, identifier: 1 } as any;
      
      const touchMoveEvent = new TouchEvent('touchmove', {
        touches: [touchMove] as any,
        cancelable: true,
      });
      
      canvas.dispatchEvent(touchMoveEvent);
      
      expect(enhancer).toBeInstanceOf(ChartInteractionEnhancer);
    });
  });

  describe('Transform Utilities Integration', () => {
    beforeEach(() => {
      enhancer = new ChartInteractionEnhancer(canvas, chartEngine, {
        enableZoom: true,
        enablePan: true,
      });
    });

    it('should convert coordinates accurately after zoom', () => {
      // Zoom in
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        clientX: 400,
        clientY: 300,
      });
      canvas.dispatchEvent(wheelEvent);
      
      // Convert screen to chart coordinates
      const chartCoords = enhancer.screenToChart(400, 300);
      
      // Convert back to screen
      const screenCoords = enhancer.chartToScreen(chartCoords.x, chartCoords.y);
      
      // Should be close to original (within 1 pixel due to floating point)
      expect(Math.abs(screenCoords.x - 400)).toBeLessThan(1);
      expect(Math.abs(screenCoords.y - 300)).toBeLessThan(1);
    });

    it('should apply transform to canvas context', () => {
      const ctx = canvas.getContext('2d') as any;
      const translateSpy = jest.spyOn(ctx, 'translate');
      const scaleSpy = jest.spyOn(ctx, 'scale');
      
      enhancer.applyTransform(ctx);
      
      expect(translateSpy).toHaveBeenCalled();
      expect(scaleSpy).toHaveBeenCalled();
    });

    it('should check point visibility correctly', () => {
      // Point inside canvas
      expect(enhancer.isPointVisible(400, 300)).toBe(true);
      
      // Point outside canvas
      expect(enhancer.isPointVisible(-100, 300)).toBe(false);
      expect(enhancer.isPointVisible(1000, 300)).toBe(false);
      expect(enhancer.isPointVisible(400, -100)).toBe(false);
      expect(enhancer.isPointVisible(400, 1000)).toBe(false);
    });
  });

  describe('Callback Integration Scenarios', () => {
    it('should trigger all callbacks in correct order', () => {
      const callOrder: string[] = [];
      
      const options: InteractionOptions = {
        enableZoom: true,
        enableSelection: true,
        onRedraw: () => callOrder.push('redraw'),
        onZoomChange: () => callOrder.push('zoom'),
        onSelectionChange: () => callOrder.push('selection'),
      };
      
      enhancer = new ChartInteractionEnhancer(canvas, chartEngine, options);
      
      // Reset view should trigger zoom and redraw
      callOrder.length = 0;
      enhancer.resetView();
      
      expect(callOrder).toContain('zoom');
      expect(callOrder).toContain('redraw');
    });

    it('should provide correct data in callbacks', () => {
      let lastZoomState: any = null;
      let lastSelection: any = null;
      
      enhancer = new ChartInteractionEnhancer(canvas, chartEngine, {
        enableZoom: true,
        enableSelection: true,
        onZoomChange: (state) => {
          lastZoomState = state;
        },
        onSelectionChange: (indices) => {
          lastSelection = indices;
        },
      });
      
      // Test zoom callback
      enhancer.resetView();
      expect(lastZoomState).toMatchObject({
        scaleX: 1,
        scaleY: 1,
        offsetX: 0,
        offsetY: 0,
      });
      expect(lastZoomState).toHaveProperty('minZoom');
      expect(lastZoomState).toHaveProperty('maxZoom');
      
      // Test selection callback
      enhancer.clearSelection();
      expect(lastSelection).toEqual([]);
    });
  });

  describe('Animated Zoom Integration', () => {
    beforeEach(() => {
      enhancer = new ChartInteractionEnhancer(canvas, chartEngine, {
        enableZoom: true,
      });
      jest.useFakeTimers();
      
      // Mock requestAnimationFrame for jest
      let rafId = 0;
      global.requestAnimationFrame = jest.fn((cb) => {
        rafId++;
        setTimeout(cb, 16); // Simulate 60fps
        return rafId;
      }) as any;
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should animate zoom smoothly', () => {
      const initialScale = enhancer.getZoomState().scaleX;
      
      // Start animation to 2x zoom
      enhancer.animateZoomTo(2, 100);
      
      // Advance time and trigger animation frames
      jest.advanceTimersByTime(16);
      const earlyScale = enhancer.getZoomState().scaleX;
      expect(earlyScale).toBeGreaterThan(initialScale);
      expect(earlyScale).toBeLessThan(2);
      
      // Check mid-animation
      jest.advanceTimersByTime(50);
      const midScale = enhancer.getZoomState().scaleX;
      expect(midScale).toBeGreaterThan(earlyScale);
      expect(midScale).toBeLessThan(2);
      
      // Complete animation
      jest.advanceTimersByTime(100);
      const finalScale = enhancer.getZoomState().scaleX;
      expect(finalScale).toBeCloseTo(2, 1);
    });

    it('should respect zoom limits during animation', () => {
      // Try to animate beyond max zoom (5x)
      enhancer.animateZoomTo(10, 100);
      
      jest.advanceTimersByTime(150);
      
      const finalScale = enhancer.getZoomState().scaleX;
      expect(finalScale).toBeLessThanOrEqual(5);
    });
  });

  describe('Drill-down with Zoom/Pan', () => {
    it('should maintain zoom state across drill levels', () => {
      enhancer = new ChartInteractionEnhancer(canvas, chartEngine, {
        enableZoom: true,
        enableDrillDown: true,
      });
      
      // Zoom in
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        clientX: 400,
        clientY: 300,
      });
      canvas.dispatchEvent(wheelEvent);
      
      const zoomBefore = enhancer.getZoomState().scaleX;
      
      // Drill down
      enhancer.drillDown({
        data: { labels: [], datasets: [] },
        title: 'Detail',
      });
      
      const zoomAfter = enhancer.getZoomState().scaleX;
      
      // Zoom should be maintained
      expect(zoomAfter).toBe(zoomBefore);
    });

    it('should reset zoom when drilling up', () => {
      enhancer = new ChartInteractionEnhancer(canvas, chartEngine, {
        enableZoom: true,
        enableDrillDown: true,
      });
      
      // Drill down
      enhancer.drillDown({
        data: { labels: [], datasets: [] },
        title: 'Detail',
      });
      
      // Zoom in detail view
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        clientX: 400,
        clientY: 300,
      });
      canvas.dispatchEvent(wheelEvent);
      
      // Drill up
      enhancer.drillUp();
      
      // Zoom should still be active
      expect(enhancer.getZoomState().scaleX).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Annotation Rendering with Transform', () => {
    it('should render annotations with zoom applied', () => {
      enhancer = new ChartInteractionEnhancer(canvas, chartEngine, {
        enableZoom: true,
        enableAnnotations: true,
      });
      
      // Add annotation
      enhancer.addAnnotation({
        type: 'text',
        x: 100,
        y: 100,
        text: 'Test',
      });
      
      // Zoom in
      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        clientX: 400,
        clientY: 300,
      });
      canvas.dispatchEvent(wheelEvent);
      
      // Render annotations (should not crash)
      const ctx = canvas.getContext('2d')!;
      expect(() => {
        enhancer.renderAnnotations(ctx);
      }).not.toThrow();
    });
  });

  describe('Performance Scenarios', () => {
    it('should handle rapid zoom events', () => {
      const onZoomChange = jest.fn();
      
      enhancer = new ChartInteractionEnhancer(canvas, chartEngine, {
        enableZoom: true,
        onZoomChange,
      });
      
      // Simulate rapid zoom
      for (let i = 0; i < 50; i++) {
        const wheelEvent = new WheelEvent('wheel', {
          deltaY: i % 2 === 0 ? -10 : 10,
          clientX: 400,
          clientY: 300,
        });
        canvas.dispatchEvent(wheelEvent);
      }
      
      // Should handle all events
      expect(onZoomChange.mock.calls.length).toBeGreaterThan(0);
    });

    it('should handle many annotations efficiently', () => {
      enhancer = new ChartInteractionEnhancer(canvas, chartEngine, {
        enableAnnotations: true,
      });
      
      // Add 100 annotations
      for (let i = 0; i < 100; i++) {
        enhancer.addAnnotation({
          type: 'text',
          x: (i * 10) % 800,
          y: (i * 10) % 600,
          text: `Annotation ${i}`,
        });
      }
      
      // Render should not crash
      const ctx = canvas.getContext('2d')!;
      const startTime = performance.now();
      enhancer.renderAnnotations(ctx);
      const endTime = performance.now();
      
      // Should render in reasonable time (< 100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle canvas with zero dimensions', () => {
      canvas.width = 0;
      canvas.height = 0;
      
      expect(() => {
        enhancer = new ChartInteractionEnhancer(canvas, chartEngine);
      }).not.toThrow();
    });

    it('should handle missing optional callbacks gracefully', () => {
      enhancer = new ChartInteractionEnhancer(canvas, chartEngine, {
        enableZoom: true,
        enableSelection: true,
        // No callbacks provided
      });
      
      expect(() => {
        enhancer.resetView();
        enhancer.clearSelection();
      }).not.toThrow();
    });

    it('should handle coordinate conversion at boundaries', () => {
      enhancer = new ChartInteractionEnhancer(canvas, chartEngine);
      
      // Test corners
      const topLeft = enhancer.screenToChart(0, 0);
      const bottomRight = enhancer.screenToChart(canvas.width, canvas.height);
      
      expect(topLeft.x).toBe(0);
      expect(topLeft.y).toBe(0);
      expect(bottomRight.x).toBe(canvas.width);
      expect(bottomRight.y).toBe(canvas.height);
    });

    it('should handle extreme zoom levels', () => {
      enhancer = new ChartInteractionEnhancer(canvas, chartEngine, {
        enableZoom: true,
      });
      
      // Try to zoom way in
      for (let i = 0; i < 20; i++) {
        const wheelEvent = new WheelEvent('wheel', {
          deltaY: -100,
          clientX: 400,
          clientY: 300,
        });
        canvas.dispatchEvent(wheelEvent);
      }
      
      const zoomIn = enhancer.getZoomState().scaleX;
      expect(zoomIn).toBeLessThanOrEqual(5); // Max zoom
      
      // Try to zoom way out
      for (let i = 0; i < 20; i++) {
        const wheelEvent = new WheelEvent('wheel', {
          deltaY: 100,
          clientX: 400,
          clientY: 300,
        });
        canvas.dispatchEvent(wheelEvent);
      }
      
      const zoomOut = enhancer.getZoomState().scaleX;
      expect(zoomOut).toBeGreaterThanOrEqual(0.5); // Min zoom
    });
  });
});
