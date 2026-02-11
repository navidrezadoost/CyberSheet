/**
 * ChartAnimationIntegration.ts
 * 
 * Integrates ChartAnimationEngine with chart rendering
 * Provides helper functions for animating charts
 */

import { ChartAnimationEngine } from './ChartAnimationEngine';
import type { AnimationConfig, EasingFunction } from './ChartAnimationEngine';
import type { ChartType, ChartOptions } from './ChartEngine';

/**
 * Animation context for chart elements
 */
export interface ChartAnimationContext {
  chartType: ChartType;
  elementCount: number;
  duration: number;
  easing: string | EasingFunction;
  stagger?: number;
  delay?: number;
}

/**
 * Animated value state
 */
export interface AnimatedValue {
  id: string;
  from: number;
  to: number;
  current: number;
  progress: number;
}

/**
 * ChartAnimationIntegration - Bridges animation engine with chart rendering
 */
export class ChartAnimationIntegration {
  private engine: ChartAnimationEngine;
  private animatedValues: Map<string, AnimatedValue>;
  private chartId: string;

  constructor(chartId: string) {
    this.chartId = chartId;
    this.engine = new ChartAnimationEngine();
    this.animatedValues = new Map();
  }

  /**
   * Get animation configuration for chart type
   */
  getChartAnimation(chartType: ChartType, options: ChartOptions): AnimationConfig | null {
    if (!options.animate) return null;

    const duration = options.animationDuration || 600;
    const easing = options.animationEasing || 'easeOutCubic';
    const delay = options.animationDelay || 0;

    switch (chartType) {
      case 'bar':
      case 'bar3d':
        return ChartAnimationEngine.grow(duration, delay, easing);
      
      case 'line':
      case 'line3d':
        return ChartAnimationEngine.fadeIn(duration, delay, easing);
      
      case 'pie':
      case 'pie3d':
        return ChartAnimationEngine.grow(duration, delay, 'easeOutBack');
      
      case 'treemap':
      case 'funnel':
      case 'sunburst':
        return ChartAnimationEngine.fadeIn(duration, delay, easing);
      
      case 'waterfall':
        return ChartAnimationEngine.slideIn('bottom', duration, delay, easing);
      
      case 'candlestick':
        return ChartAnimationEngine.fadeIn(duration, delay, easing);
      
      case 'gantt':
        return ChartAnimationEngine.slideIn('left', duration, delay, easing);
      
      case 'radar':
        return ChartAnimationEngine.grow(duration, delay, 'easeOutElastic');
      
      default:
        return ChartAnimationEngine.fadeIn(duration, delay, easing);
    }
  }

  /**
   * Animate chart data entry
   */
  animateDataEntry(
    elementIds: string[],
    options: ChartOptions,
    onUpdate: (progress: number) => void
  ): void {
    if (!options.animate) {
      onUpdate(1);
      return;
    }

    const duration = options.animationDuration || 600;
    const easing = options.animationEasing || 'easeOutCubic';
    const stagger = options.animationStagger || 0;

    if (stagger > 0) {
      // Staggered animation
      const configs = ChartAnimationEngine.staggered(
        elementIds.length,
        { type: 'enter', variant: 'fadeIn', duration, easing },
        stagger
      );

      elementIds.forEach((id, index) => {
        const fullId = `${this.chartId}-${id}`;
        this.engine.startAnimation(fullId, configs[index], undefined, undefined);
      });
    } else {
      // Single animation for all elements
      const config: AnimationConfig = {
        type: 'enter',
        variant: 'fadeIn',
        duration,
        easing,
        onUpdate: options.onAnimationUpdate || onUpdate,
        onComplete: options.onAnimationComplete,
        onStart: options.onAnimationStart,
      };

      this.engine.startAnimation(`${this.chartId}-entry`, config);
    }

    this.engine.start();
  }

  /**
   * Animate data update (morph between values)
   */
  animateDataUpdate(
    valueIds: string[],
    fromValues: number[],
    toValues: number[],
    options: ChartOptions,
    onUpdate: (values: Map<string, number>) => void
  ): void {
    if (!options.animate) {
      const result = new Map<string, number>();
      valueIds.forEach((id, i) => result.set(id, toValues[i]));
      onUpdate(result);
      return;
    }

    const duration = options.animationDuration || 800;
    const easing = options.animationEasing || 'easeInOutCubic';

    // Store animated values
    valueIds.forEach((id, index) => {
      this.animatedValues.set(id, {
        id,
        from: fromValues[index],
        to: toValues[index],
        current: fromValues[index],
        progress: 0,
      });
    });

    const config: AnimationConfig = {
      type: 'update',
      variant: 'morph',
      duration,
      easing,
      onUpdate: (progress: number) => {
        const result = new Map<string, number>();
        
        this.animatedValues.forEach((animValue, id) => {
          animValue.progress = progress;
          animValue.current = ChartAnimationEngine.interpolate(
            animValue.from,
            animValue.to,
            progress
          );
          result.set(id, animValue.current);
        });

        onUpdate(result);

        if (options.onAnimationUpdate) {
          options.onAnimationUpdate(progress);
        }
      },
      onComplete: () => {
        if (options.onAnimationComplete) {
          options.onAnimationComplete();
        }
      },
      onStart: options.onAnimationStart,
    };

    this.engine.startAnimation(`${this.chartId}-update`, config);
    this.engine.start();
  }

  /**
   * Animate data exit
   */
  animateDataExit(
    elementIds: string[],
    options: ChartOptions,
    onUpdate: (progress: number) => void,
    onComplete: () => void
  ): void {
    if (!options.animate) {
      onComplete();
      return;
    }

    const duration = options.animationDuration || 400;
    const easing = options.animationEasing || 'easeInCubic';

    const config: AnimationConfig = {
      type: 'exit',
      variant: 'fadeOut',
      duration,
      easing,
      onUpdate,
      onComplete: () => {
        onComplete();
        if (options.onAnimationComplete) {
          options.onAnimationComplete();
        }
      },
      onStart: options.onAnimationStart,
    };

    this.engine.startAnimation(`${this.chartId}-exit`, config);
    this.engine.start();
  }

  /**
   * Get current animation progress for an element
   */
  getElementProgress(elementId: string): number {
    const fullId = `${this.chartId}-${elementId}`;
    const state = this.engine.getAnimationState(fullId);
    return state ? state.progress : 1;
  }

  /**
   * Get all element progresses
   */
  getAllProgresses(): Map<string, number> {
    const progresses = new Map<string, number>();
    const activeAnimations = this.engine.getActiveAnimations();

    activeAnimations.forEach(id => {
      if (id.startsWith(this.chartId)) {
        const elementId = id.substring(this.chartId.length + 1);
        const state = this.engine.getAnimationState(id);
        if (state) {
          progresses.set(elementId, state.progress);
        }
      }
    });

    return progresses;
  }

  /**
   * Get animated value for an element
   */
  getAnimatedValue(valueId: string): number | null {
    const animValue = this.animatedValues.get(valueId);
    return animValue ? animValue.current : null;
  }

  /**
   * Check if chart is currently animating
   */
  isAnimating(): boolean {
    return this.engine.isAnimating();
  }

  /**
   * Pause all animations
   */
  pause(): void {
    this.engine.pause();
  }

  /**
   * Resume all animations
   */
  resume(): void {
    this.engine.resume();
  }

  /**
   * Stop all animations
   */
  stop(): void {
    this.engine.stopAll();
  }

  /**
   * Set animation speed
   */
  setSpeed(speed: number): void {
    this.engine.setSpeed(speed);
  }

  /**
   * Destroy animation engine and clean up
   */
  destroy(): void {
    this.engine.destroy();
    this.animatedValues.clear();
  }

  /**
   * Get the underlying animation engine (for advanced usage)
   */
  getEngine(): ChartAnimationEngine {
    return this.engine;
  }
}
