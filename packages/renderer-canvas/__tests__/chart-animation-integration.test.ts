/**
 * chart-animation-integration.test.ts
 * 
 * Tests for ChartAnimationIntegration
 */

import { ChartAnimationIntegration } from '../src/ChartAnimationIntegration';
import { ChartAnimationEngine } from '../src/ChartAnimationEngine';
import type { ChartOptions, ChartType } from '../src/ChartEngine';

// Mock requestAnimationFrame
beforeAll(() => {
  global.requestAnimationFrame = jest.fn((cb) => {
    return setTimeout(cb, 16) as any;
  });
  
  global.cancelAnimationFrame = jest.fn((id) => {
    clearTimeout(id);
  });
  
  jest.useFakeTimers();
});

afterAll(() => {
  jest.useRealTimers();
});

describe('ChartAnimationIntegration', () => {
  let integration: ChartAnimationIntegration;

  beforeEach(() => {
    integration = new ChartAnimationIntegration('test-chart');
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    integration.destroy();
  });

  describe('Initialization', () => {
    test('should create integration instance', () => {
      expect(integration).toBeDefined();
      expect(integration.isAnimating()).toBe(false);
    });

    test('should provide access to engine', () => {
      const engine = integration.getEngine();
      expect(engine).toBeInstanceOf(ChartAnimationEngine);
    });
  });

  describe('Chart Animation Selection', () => {
    test('should return null when animations disabled', () => {
      const options: ChartOptions = {
        type: 'bar',
        width: 400,
        height: 300,
        animate: false,
      };

      const config = integration.getChartAnimation('bar', options);
      expect(config).toBeNull();
    });

    test('should return grow animation for bar charts', () => {
      const options: ChartOptions = {
        type: 'bar',
        width: 400,
        height: 300,
        animate: true,
        animationDuration: 500,
      };

      const config = integration.getChartAnimation('bar', options);
      expect(config).toBeDefined();
      expect(config?.type).toBe('enter');
      expect(config?.variant).toBe('grow');
      expect(config?.duration).toBe(500);
    });

    test('should return appropriate animation for each chart type', () => {
      const chartTypes: ChartType[] = [
        'bar', 'line', 'pie', 'treemap', 'waterfall',
        'candlestick', 'funnel', 'sunburst', 'gantt', 'radar',
        'bar3d', 'line3d', 'pie3d'
      ];

      chartTypes.forEach(type => {
        const options: ChartOptions = {
          type,
          width: 400,
          height: 300,
          animate: true,
        };

        const config = integration.getChartAnimation(type, options);
        expect(config).toBeDefined();
        expect(config?.type).toBe('enter');
      });
    });

    test('should use custom duration and easing', () => {
      const options: ChartOptions = {
        type: 'line',
        width: 400,
        height: 300,
        animate: true,
        animationDuration: 1000,
        animationEasing: 'easeInOutQuad',
        animationDelay: 200,
      };

      const config = integration.getChartAnimation('line', options);
      expect(config?.duration).toBe(1000);
      expect(config?.easing).toBe('easeInOutQuad');
      expect(config?.delay).toBe(200);
    });
  });

  describe('Data Entry Animation', () => {
    test('should skip animation when disabled', () => {
      const options: ChartOptions = {
        type: 'bar',
        width: 400,
        height: 300,
        animate: false,
      };

      const onUpdate = jest.fn();
      integration.animateDataEntry(['elem1', 'elem2'], options, onUpdate);

      expect(onUpdate).toHaveBeenCalledWith(1);
      expect(integration.isAnimating()).toBe(false);
    });

    test('should animate data entry', () => {
      const options: ChartOptions = {
        type: 'bar',
        width: 400,
        height: 300,
        animate: true,
        animationDuration: 500,
      };

      const onUpdate = jest.fn();
      integration.animateDataEntry(['elem1', 'elem2'], options, onUpdate);

      expect(integration.isAnimating()).toBe(true);

      // Advance through animation
      jest.advanceTimersByTime(16); // First frame
      jest.advanceTimersByTime(250); // Mid-animation
      
      expect(integration.isAnimating()).toBe(true);

      jest.advanceTimersByTime(300); // Complete
      expect(integration.isAnimating()).toBe(false);
    });

    test('should support staggered entry animation', () => {
      const options: ChartOptions = {
        type: 'bar',
        width: 400,
        height: 300,
        animate: true,
        animationDuration: 400,
        animationStagger: 50,
      };

      const onUpdate = jest.fn();
      integration.animateDataEntry(['elem1', 'elem2', 'elem3'], options, onUpdate);

      expect(integration.isAnimating()).toBe(true);

      // First element should start immediately
      jest.advanceTimersByTime(16);
      expect(integration.getElementProgress('elem1')).toBeGreaterThan(0);

      // Second element should start after stagger delay
      jest.advanceTimersByTime(50);
      expect(integration.getElementProgress('elem2')).toBeGreaterThan(0);
    });

    test('should call animation callbacks', () => {
      const onStart = jest.fn();
      const onUpdate = jest.fn();
      const onComplete = jest.fn();

      const options: ChartOptions = {
        type: 'bar',
        width: 400,
        height: 300,
        animate: true,
        animationDuration: 100,
        onAnimationStart: onStart,
        onAnimationUpdate: onUpdate,
        onAnimationComplete: onComplete,
      };

      integration.animateDataEntry(['elem1'], options, jest.fn());

      jest.advanceTimersByTime(16); // Start
      expect(onStart).toHaveBeenCalled();

      jest.advanceTimersByTime(50); // Mid
      expect(onUpdate).toHaveBeenCalled();

      jest.advanceTimersByTime(100); // Complete
      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe('Data Update Animation', () => {
    test('should skip animation when disabled', () => {
      const options: ChartOptions = {
        type: 'bar',
        width: 400,
        height: 300,
        animate: false,
      };

      const onUpdate = jest.fn();
      integration.animateDataUpdate(
        ['val1', 'val2'],
        [10, 20],
        [50, 80],
        options,
        onUpdate
      );

      expect(onUpdate).toHaveBeenCalled();
      const result = onUpdate.mock.calls[0][0] as Map<string, number>;
      expect(result.get('val1')).toBe(50);
      expect(result.get('val2')).toBe(80);
    });

    test('should animate value morphing', () => {
      const options: ChartOptions = {
        type: 'bar',
        width: 400,
        height: 300,
        animate: true,
        animationDuration: 500,
      };

      const onUpdate = jest.fn();
      integration.animateDataUpdate(
        ['val1', 'val2'],
        [10, 20],
        [50, 80],
        options,
        onUpdate
      );

      expect(integration.isAnimating()).toBe(true);

      // Advance to mid-animation
      jest.advanceTimersByTime(16); // First frame
      jest.advanceTimersByTime(250); // Mid-point

      expect(onUpdate).toHaveBeenCalled();
      const result = onUpdate.mock.calls[onUpdate.mock.calls.length - 1][0] as Map<string, number>;
      
      // Values should be between start and end
      const val1 = result.get('val1')!;
      const val2 = result.get('val2')!;
      expect(val1).toBeGreaterThan(10);
      expect(val1).toBeLessThan(50);
      expect(val2).toBeGreaterThan(20);
      expect(val2).toBeLessThan(80);
    });

    test('should reach target values at completion', () => {
      const options: ChartOptions = {
        type: 'bar',
        width: 400,
        height: 300,
        animate: true,
        animationDuration: 200,
      };

      const onUpdate = jest.fn();
      integration.animateDataUpdate(
        ['val1'],
        [10],
        [50],
        options,
        onUpdate
      );

      // Complete animation
      jest.advanceTimersByTime(16);
      jest.advanceTimersByTime(250);

      const result = onUpdate.mock.calls[onUpdate.mock.calls.length - 1][0] as Map<string, number>;
      expect(result.get('val1')).toBeCloseTo(50, 0);
    });

    test('should retrieve animated values', () => {
      const options: ChartOptions = {
        type: 'bar',
        width: 400,
        height: 300,
        animate: true,
        animationDuration: 500,
      };

      integration.animateDataUpdate(
        ['val1'],
        [10],
        [50],
        options,
        jest.fn()
      );

      jest.advanceTimersByTime(16);
      jest.advanceTimersByTime(250);

      const animatedValue = integration.getAnimatedValue('val1');
      expect(animatedValue).not.toBeNull();
      expect(animatedValue).toBeGreaterThan(10);
      expect(animatedValue).toBeLessThan(50);
    });
  });

  describe('Data Exit Animation', () => {
    test('should skip animation when disabled', () => {
      const options: ChartOptions = {
        type: 'bar',
        width: 400,
        height: 300,
        animate: false,
      };

      const onUpdate = jest.fn();
      const onComplete = jest.fn();
      
      integration.animateDataExit(['elem1'], options, onUpdate, onComplete);

      expect(onComplete).toHaveBeenCalled();
      expect(integration.isAnimating()).toBe(false);
    });

    test('should animate data exit', () => {
      const options: ChartOptions = {
        type: 'bar',
        width: 400,
        height: 300,
        animate: true,
        animationDuration: 300,
      };

      const onUpdate = jest.fn();
      const onComplete = jest.fn();
      
      integration.animateDataExit(['elem1'], options, onUpdate, onComplete);

      expect(integration.isAnimating()).toBe(true);

      jest.advanceTimersByTime(16);
      jest.advanceTimersByTime(150);
      expect(onUpdate).toHaveBeenCalled();

      jest.advanceTimersByTime(200);
      expect(onComplete).toHaveBeenCalled();
      expect(integration.isAnimating()).toBe(false);
    });
  });

  describe('Progress Tracking', () => {
    test('should track element progress', () => {
      const options: ChartOptions = {
        type: 'bar',
        width: 400,
        height: 300,
        animate: true,
        animationDuration: 500,
        animationStagger: 50,
      };

      integration.animateDataEntry(['elem1', 'elem2'], options, jest.fn());

      jest.advanceTimersByTime(16);
      jest.advanceTimersByTime(100);

      const progress1 = integration.getElementProgress('elem1');
      const progress2 = integration.getElementProgress('elem2');

      expect(progress1).toBeGreaterThan(0);
      expect(progress2).toBeGreaterThanOrEqual(0);
    });

    test('should get all progresses', () => {
      const options: ChartOptions = {
        type: 'bar',
        width: 400,
        height: 300,
        animate: true,
        animationDuration: 500,
        animationStagger: 50,
      };

      integration.animateDataEntry(['elem1', 'elem2', 'elem3'], options, jest.fn());

      jest.advanceTimersByTime(16);
      jest.advanceTimersByTime(100);

      const progresses = integration.getAllProgresses();
      expect(progresses.size).toBeGreaterThan(0);
    });
  });

  describe('Animation Control', () => {
    test('should pause and resume animations', () => {
      const options: ChartOptions = {
        type: 'bar',
        width: 400,
        height: 300,
        animate: true,
        animationDuration: 500,
      };

      const onUpdate = jest.fn();
      integration.animateDataEntry(['elem1'], options, onUpdate);

      jest.advanceTimersByTime(16);
      expect(integration.isAnimating()).toBe(true);

      integration.pause();
      const callCountAfterPause = onUpdate.mock.calls.length;

      jest.advanceTimersByTime(100);
      expect(onUpdate.mock.calls.length).toBe(callCountAfterPause);

      integration.resume();
      jest.advanceTimersByTime(100);
      expect(onUpdate.mock.calls.length).toBeGreaterThan(callCountAfterPause);
    });

    test('should stop all animations', () => {
      const options: ChartOptions = {
        type: 'bar',
        width: 400,
        height: 300,
        animate: true,
        animationDuration: 500,
      };

      integration.animateDataEntry(['elem1', 'elem2'], options, jest.fn());

      jest.advanceTimersByTime(16);
      expect(integration.isAnimating()).toBe(true);

      integration.stop();
      expect(integration.isAnimating()).toBe(false);
    });

    test('should set animation speed', () => {
      const options: ChartOptions = {
        type: 'bar',
        width: 400,
        height: 300,
        animate: true,
        animationDuration: 1000,
      };

      const onUpdate = jest.fn();
      integration.animateDataEntry(['elem1'], options, onUpdate);

      // Double the speed
      integration.setSpeed(2);

      jest.advanceTimersByTime(16);
      jest.advanceTimersByTime(500); // Should complete in half the time

      expect(integration.isAnimating()).toBe(false);
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle multiple sequential animations', () => {
      const options: ChartOptions = {
        type: 'bar',
        width: 400,
        height: 300,
        animate: true,
        animationDuration: 200,
      };

      const onUpdate1 = jest.fn();
      integration.animateDataEntry(['elem1'], options, onUpdate1);

      jest.advanceTimersByTime(16);
      jest.advanceTimersByTime(200);
      expect(integration.isAnimating()).toBe(false);

      const onUpdate2 = jest.fn();
      integration.animateDataUpdate(['val1'], [10], [50], options, onUpdate2);

      jest.advanceTimersByTime(16);
      jest.advanceTimersByTime(200);
      expect(integration.isAnimating()).toBe(false);
    });

    test('should handle chart type switching', () => {
      const barOptions: ChartOptions = {
        type: 'bar',
        width: 400,
        height: 300,
        animate: true,
      };

      const barConfig = integration.getChartAnimation('bar', barOptions);
      expect(barConfig?.variant).toBe('grow');

      const lineOptions: ChartOptions = {
        type: 'line',
        width: 400,
        height: 300,
        animate: true,
      };

      const lineConfig = integration.getChartAnimation('line', lineOptions);
      expect(lineConfig?.variant).toBe('fadeIn');
    });

    test('should clean up on destroy', () => {
      const options: ChartOptions = {
        type: 'bar',
        width: 400,
        height: 300,
        animate: true,
        animationDuration: 500,
      };

      integration.animateDataEntry(['elem1'], options, jest.fn());
      integration.animateDataUpdate(['val1'], [10], [50], options, jest.fn());

      jest.advanceTimersByTime(16);
      expect(integration.isAnimating()).toBe(true);

      integration.destroy();
      expect(integration.isAnimating()).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty element arrays', () => {
      const options: ChartOptions = {
        type: 'bar',
        width: 400,
        height: 300,
        animate: true,
      };

      expect(() => {
        integration.animateDataEntry([], options, jest.fn());
      }).not.toThrow();
    });

    test('should handle mismatched array lengths in update', () => {
      const options: ChartOptions = {
        type: 'bar',
        width: 400,
        height: 300,
        animate: true,
        animationDuration: 200,
      };

      const onUpdate = jest.fn();
      integration.animateDataUpdate(
        ['val1', 'val2', 'val3'],
        [10, 20],
        [50, 80, 100],
        options,
        onUpdate
      );

      jest.advanceTimersByTime(16);
      jest.advanceTimersByTime(200);

      // Should complete without errors
      expect(integration.isAnimating()).toBe(false);
    });

    test('should return null for non-existent animated value', () => {
      const value = integration.getAnimatedValue('nonexistent');
      expect(value).toBeNull();
    });

    test('should return default progress for non-existent element', () => {
      const progress = integration.getElementProgress('nonexistent');
      expect(progress).toBe(1);
    });
  });
});
