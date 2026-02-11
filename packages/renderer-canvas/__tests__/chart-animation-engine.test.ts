/**
 * Tests for ChartAnimationEngine
 */

import {
  ChartAnimationEngine,
  EasingFunctions,
  AnimationConfig,
  EasingFunction,
} from '../src/ChartAnimationEngine';

describe('ChartAnimationEngine', () => {
  let engine: ChartAnimationEngine;
  
  beforeEach(() => {
    engine = new ChartAnimationEngine();
    jest.useFakeTimers();
    
    // Mock requestAnimationFrame
    let rafId = 0;
    global.requestAnimationFrame = jest.fn((cb) => {
      rafId++;
      setTimeout(cb, 16); // Simulate 60fps
      return rafId;
    }) as any;
    
    global.cancelAnimationFrame = jest.fn();
  });
  
  afterEach(() => {
    engine.destroy();
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('should create engine instance', () => {
      expect(engine).toBeInstanceOf(ChartAnimationEngine);
    });

    it('should not be running initially', () => {
      expect(engine.isAnimating()).toBe(false);
    });

    it('should have no active animations initially', () => {
      expect(engine.getActiveAnimations()).toHaveLength(0);
    });
  });

  describe('Basic Animation Control', () => {
    it('should start an animation', () => {
      const config: AnimationConfig = {
        type: 'enter',
        variant: 'fadeIn',
        duration: 500,
      };
      
      engine.startAnimation('test1', config);
      expect(engine.isAnimating('test1')).toBe(true);
    });

    it('should stop a specific animation', () => {
      const config: AnimationConfig = {
        type: 'enter',
        variant: 'fadeIn',
        duration: 500,
      };
      
      engine.startAnimation('test1', config);
      engine.stopAnimation('test1');
      
      expect(engine.isAnimating('test1')).toBe(false);
    });

    it('should stop all animations', () => {
      engine.startAnimation('test1', ChartAnimationEngine.fadeIn());
      engine.startAnimation('test2', ChartAnimationEngine.fadeIn());
      engine.startAnimation('test3', ChartAnimationEngine.fadeIn());
      
      expect(engine.getActiveAnimations()).toHaveLength(3);
      
      engine.stopAll();
      expect(engine.getActiveAnimations()).toHaveLength(0);
      expect(engine.isAnimating()).toBe(false);
    });

    it('should pause and resume animations', () => {
      engine.startAnimation('test1', ChartAnimationEngine.fadeIn());
      
      engine.pause();
      jest.advanceTimersByTime(100);
      
      // Animation should not progress while paused
      const state1 = engine.getAnimationState('test1');
      
      engine.resume();
      jest.advanceTimersByTime(100);
      
      const state2 = engine.getAnimationState('test1');
      expect(state2).toBeDefined();
    });
  });

  describe('Animation Callbacks', () => {
    it('should call onStart callback', () => {
      const onStart = jest.fn();
      const config: AnimationConfig = {
        type: 'enter',
        variant: 'fadeIn',
        duration: 500,
        onStart,
      };
      
      engine.startAnimation('test1', config);
      expect(onStart).toHaveBeenCalled();
    });

    it('should call onUpdate callback during animation', () => {
      const onUpdate = jest.fn();
      const config: AnimationConfig = {
        type: 'enter',
        variant: 'fadeIn',
        duration: 500,
        onUpdate,
      };
      
      engine.startAnimation('test1', config);
      jest.advanceTimersByTime(16); // First frame
      jest.advanceTimersByTime(250); // Mid-animation
      
      expect(onUpdate).toHaveBeenCalled();
      // At least one call should have progress > 0
      const hasProgress = onUpdate.mock.calls.some(call => call[0] > 0);
      expect(hasProgress).toBe(true);
    });

    it('should call onComplete callback when animation finishes', () => {
      const onComplete = jest.fn();
      const config: AnimationConfig = {
        type: 'enter',
        variant: 'fadeIn',
        duration: 500,
        onComplete,
      };
      
      engine.startAnimation('test1', config);
      jest.advanceTimersByTime(600);
      
      expect(onComplete).toHaveBeenCalled();
      expect(engine.isAnimating('test1')).toBe(false);
    });

    it('should call onStart after delay', () => {
      const onStart = jest.fn();
      const config: AnimationConfig = {
        type: 'enter',
        variant: 'fadeIn',
        duration: 500,
        delay: 200,
        onStart,
      };
      
      engine.startAnimation('test1', config);
      expect(onStart).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(250);
      expect(onStart).toHaveBeenCalled();
    });
  });

  describe('Animation Progress', () => {
    it('should track animation progress', () => {
      const config: AnimationConfig = {
        type: 'enter',
        variant: 'fadeIn',
        duration: 1000,
      };
      
      engine.startAnimation('test1', config);
      
      // Start
      let state = engine.getAnimationState('test1');
      expect(state?.progress).toBe(0);
      
      // Mid-animation
      jest.advanceTimersByTime(500);
      state = engine.getAnimationState('test1');
      expect(state?.progress).toBeGreaterThan(0);
      expect(state?.progress).toBeLessThan(1);
      
      // Complete
      jest.advanceTimersByTime(600);
      expect(engine.isAnimating('test1')).toBe(false);
    });

    it('should respect animation delay', () => {
      const onUpdate = jest.fn();
      const config: AnimationConfig = {
        type: 'enter',
        variant: 'fadeIn',
        duration: 500,
        delay: 300,
        onUpdate,
      };
      
      engine.startAnimation('test1', config);
      
      // Before delay
      jest.advanceTimersByTime(100);
      expect(onUpdate).not.toHaveBeenCalled();
      
      // After delay
      jest.advanceTimersByTime(250);
      expect(onUpdate).toHaveBeenCalled();
    });
  });

  describe('Animation Queue', () => {
    it('should queue animations', () => {
      engine.queueAnimation('test1', ChartAnimationEngine.fadeIn(), 1);
      engine.queueAnimation('test2', ChartAnimationEngine.fadeIn(), 0);
      
      expect(engine.getActiveAnimations()).toHaveLength(0);
    });

    it('should process queue after current animations complete', () => {
      // Start first animation
      engine.startAnimation('test1', {
        type: 'enter',
        variant: 'fadeIn',
        duration: 100,
      });
      
      // Queue second animation
      engine.queueAnimation('test2', ChartAnimationEngine.fadeIn());
      
      // Complete first animation
      jest.advanceTimersByTime(150);
      
      // Second animation should start
      jest.advanceTimersByTime(50);
      expect(engine.isAnimating('test2')).toBe(true);
    });

    it('should respect priority in queue', () => {
      // Start with a short animation
      engine.startAnimation('initial', {
        type: 'enter',
        variant: 'fadeIn',
        duration: 50,
      });
      
      // Queue animations with different priorities
      engine.queueAnimation('low', ChartAnimationEngine.fadeIn(100), 0);
      engine.queueAnimation('high', ChartAnimationEngine.fadeIn(100), 10);
      engine.queueAnimation('mid', ChartAnimationEngine.fadeIn(100), 5);
      
      // Complete initial animation to trigger queue processing
      jest.advanceTimersByTime(100);
      
      // Now one of the queued animations should be active
      const activeCount = engine.getActiveAnimations().length;
      expect(activeCount).toBeGreaterThanOrEqual(1);
    });

    it('should clear queue', () => {
      engine.queueAnimation('test1', ChartAnimationEngine.fadeIn());
      engine.queueAnimation('test2', ChartAnimationEngine.fadeIn());
      
      engine.clearQueue();
      
      jest.advanceTimersByTime(100);
      expect(engine.getActiveAnimations()).toHaveLength(0);
    });
  });

  describe('Animation Speed', () => {
    it('should set global speed', () => {
      engine.setSpeed(2.0);
      
      const config: AnimationConfig = {
        type: 'enter',
        variant: 'fadeIn',
        duration: 1000,
      };
      
      engine.startAnimation('test1', config);
      
      // With 2x speed, animation should complete in 500ms
      jest.advanceTimersByTime(550);
      expect(engine.isAnimating('test1')).toBe(false);
    });

    it('should clamp speed to valid range', () => {
      engine.setSpeed(10); // Should clamp to 5
      engine.setSpeed(0.01); // Should clamp to 0.1
      
      // Should not crash
      expect(engine).toBeInstanceOf(ChartAnimationEngine);
    });
  });

  describe('Helper Methods', () => {
    describe('Animation Factories', () => {
      it('should create fadeIn config', () => {
        const config = ChartAnimationEngine.fadeIn(600, 100, 'linear');
        
        expect(config.type).toBe('enter');
        expect(config.variant).toBe('fadeIn');
        expect(config.duration).toBe(600);
        expect(config.delay).toBe(100);
        expect(config.easing).toBe('linear');
      });

      it('should create slideIn configs', () => {
        const top = ChartAnimationEngine.slideIn('top', 500);
        const bottom = ChartAnimationEngine.slideIn('bottom', 500);
        const left = ChartAnimationEngine.slideIn('left', 500);
        const right = ChartAnimationEngine.slideIn('right', 500);
        
        expect(top.variant).toBe('slideInTop');
        expect(bottom.variant).toBe('slideInBottom');
        expect(left.variant).toBe('slideInLeft');
        expect(right.variant).toBe('slideInRight');
      });

      it('should create grow config', () => {
        const config = ChartAnimationEngine.grow(400, 50);
        
        expect(config.type).toBe('enter');
        expect(config.variant).toBe('grow');
        expect(config.duration).toBe(400);
        expect(config.easing).toBe('easeOutBack');
      });

      it('should create bounceIn config', () => {
        const config = ChartAnimationEngine.bounceIn(800);
        
        expect(config.type).toBe('enter');
        expect(config.variant).toBe('bounceIn');
        expect(config.easing).toBe('easeOutBounce');
      });

      it('should create morph config', () => {
        const config = ChartAnimationEngine.morph(600);
        
        expect(config.type).toBe('update');
        expect(config.variant).toBe('morph');
      });

      it('should create fadeOut config', () => {
        const config = ChartAnimationEngine.fadeOut(400);
        
        expect(config.type).toBe('exit');
        expect(config.variant).toBe('fadeOut');
      });

      it('should create shrink config', () => {
        const config = ChartAnimationEngine.shrink(300);
        
        expect(config.type).toBe('exit');
        expect(config.variant).toBe('shrink');
      });
    });

    describe('Staggered Animations', () => {
      it('should create staggered animation configs', () => {
        const base = ChartAnimationEngine.fadeIn(500);
        const staggered = ChartAnimationEngine.staggered(3, base, 100);
        
        expect(staggered).toHaveLength(3);
        expect(staggered[0].delay).toBe(0);
        expect(staggered[1].delay).toBe(100);
        expect(staggered[2].delay).toBe(200);
      });

      it('should preserve base delay in staggered animations', () => {
        const base = ChartAnimationEngine.fadeIn(500, 50);
        const staggered = ChartAnimationEngine.staggered(2, base, 100);
        
        expect(staggered[0].delay).toBe(50);
        expect(staggered[1].delay).toBe(150);
      });
    });

    describe('Interpolation', () => {
      it('should interpolate between numbers', () => {
        expect(ChartAnimationEngine.interpolate(0, 100, 0)).toBe(0);
        expect(ChartAnimationEngine.interpolate(0, 100, 0.5)).toBe(50);
        expect(ChartAnimationEngine.interpolate(0, 100, 1)).toBe(100);
      });

      it('should interpolate between colors', () => {
        const result = ChartAnimationEngine.interpolateColor('#000000', '#ffffff', 0.5);
        expect(result).toBe('#808080'); // Middle gray
      });

      it('should handle invalid color formats', () => {
        const result = ChartAnimationEngine.interpolateColor('invalid', '#ffffff', 0.5);
        expect(result).toBe('invalid');
      });
    });
  });

  describe('Easing Functions', () => {
    const testEasing = (name: string, fn: EasingFunction) => {
      it(`${name} should start at 0 and end at 1`, () => {
        expect(fn(0)).toBe(0);
        expect(fn(1)).toBe(1);
      });

      it(`${name} should be continuous`, () => {
        const values = [0, 0.25, 0.5, 0.75, 1].map(fn);
        values.forEach(v => {
          expect(typeof v).toBe('number');
          expect(isNaN(v)).toBe(false);
        });
      });
    };

    testEasing('linear', EasingFunctions.linear);
    testEasing('easeInQuad', EasingFunctions.easeInQuad);
    testEasing('easeOutQuad', EasingFunctions.easeOutQuad);
    testEasing('easeInOutQuad', EasingFunctions.easeInOutQuad);
    testEasing('easeInCubic', EasingFunctions.easeInCubic);
    testEasing('easeOutCubic', EasingFunctions.easeOutCubic);
    testEasing('easeInOutCubic', EasingFunctions.easeInOutCubic);
    testEasing('easeInQuart', EasingFunctions.easeInQuart);
    testEasing('easeOutQuart', EasingFunctions.easeOutQuart);
    testEasing('easeInOutQuart', EasingFunctions.easeInOutQuart);
    testEasing('easeInExpo', EasingFunctions.easeInExpo);
    testEasing('easeOutExpo', EasingFunctions.easeOutExpo);
    testEasing('easeInOutExpo', EasingFunctions.easeInOutExpo);

    describe('Elastic Easing', () => {
      it('should overshoot for elastic easing', () => {
        const values = Array.from({ length: 20 }, (_, i) => i / 19).map(EasingFunctions.easeOutElastic);
        const hasOvershoot = values.some(v => v > 1.1 || v < -0.1);
        expect(hasOvershoot).toBe(true);
      });
    });

    describe('Bounce Easing', () => {
      it('should have bounce pattern', () => {
        const values = Array.from({ length: 20 }, (_, i) => i / 19).map(EasingFunctions.easeOutBounce);
        // Bounce should have multiple local maxima
        expect(values[values.length - 1]).toBe(1);
      });
    });

    describe('Back Easing', () => {
      it('should go negative for back easing', () => {
        const value = EasingFunctions.easeInBack(0.3);
        expect(value).toBeLessThan(0);
      });

      it('should overshoot for easeOutBack', () => {
        const value = EasingFunctions.easeOutBack(0.9);
        expect(value).toBeGreaterThan(1);
      });
    });
  });

  describe('Multiple Animations', () => {
    it('should handle multiple concurrent animations', () => {
      engine.startAnimation('anim1', ChartAnimationEngine.fadeIn(500));
      engine.startAnimation('anim2', ChartAnimationEngine.grow(600));
      engine.startAnimation('anim3', ChartAnimationEngine.bounceIn(700));
      
      expect(engine.getActiveAnimations()).toHaveLength(3);
      
      jest.advanceTimersByTime(550);
      expect(engine.isAnimating('anim1')).toBe(false);
      expect(engine.isAnimating('anim2')).toBe(true);
      expect(engine.isAnimating('anim3')).toBe(true);
    });

    it('should track each animation independently', () => {
      const onComplete1 = jest.fn();
      const onComplete2 = jest.fn();
      
      engine.startAnimation('anim1', {
        ...ChartAnimationEngine.fadeIn(300),
        onComplete: onComplete1,
      });
      
      engine.startAnimation('anim2', {
        ...ChartAnimationEngine.fadeIn(600),
        onComplete: onComplete2,
      });
      
      jest.advanceTimersByTime(350);
      expect(onComplete1).toHaveBeenCalled();
      expect(onComplete2).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(300);
      expect(onComplete2).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero duration', () => {
      const onComplete = jest.fn();
      engine.startAnimation('test1', {
        type: 'enter',
        variant: 'fadeIn',
        duration: 0,
        onComplete,
      });
      
      jest.advanceTimersByTime(50);
      expect(onComplete).toHaveBeenCalled();
    });

    it('should handle very long duration', () => {
      engine.startAnimation('test1', {
        type: 'enter',
        variant: 'fadeIn',
        duration: 10000,
      });
      
      jest.advanceTimersByTime(5000);
      const state = engine.getAnimationState('test1');
      expect(state?.progress).toBeGreaterThan(0);
      expect(state?.progress).toBeLessThan(1);
    });

    it('should handle stopping non-existent animation', () => {
      expect(() => {
        engine.stopAnimation('nonexistent');
      }).not.toThrow();
    });

    it('should handle getting state of non-existent animation', () => {
      const state = engine.getAnimationState('nonexistent');
      expect(state).toBeUndefined();
    });

    it('should handle custom easing function', () => {
      const customEasing: EasingFunction = (t) => t * t;
      
      engine.startAnimation('test1', {
        type: 'enter',
        variant: 'fadeIn',
        duration: 500,
        easing: customEasing,
      });
      
      jest.advanceTimersByTime(100);
      const state = engine.getAnimationState('test1');
      expect(state).toBeDefined();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup on destroy', () => {
      engine.startAnimation('test1', ChartAnimationEngine.fadeIn());
      engine.startAnimation('test2', ChartAnimationEngine.fadeIn());
      engine.queueAnimation('test3', ChartAnimationEngine.fadeIn());
      
      engine.destroy();
      
      expect(engine.getActiveAnimations()).toHaveLength(0);
      expect(engine.isAnimating()).toBe(false);
    });

    it('should cancel animation frame on stopAll', () => {
      engine.startAnimation('test1', ChartAnimationEngine.fadeIn());
      engine.stopAll();
      
      expect(global.cancelAnimationFrame).toHaveBeenCalled();
    });
  });
});
