/**
 * ChartAnimationEngine
 * 
 * Provides smooth animations for chart elements with support for:
 * - Enter animations (fade-in, slide-in, grow, bounce)
 * - Update animations (morph, color transition, position change)
 * - Exit animations (fade-out, slide-out, shrink)
 * - Custom easing functions (linear, ease-in/out, elastic, bounce)
 * - Animation queuing and coordination
 * - Performance optimization with requestAnimationFrame
 */

/**
 * Easing function signature
 */
export type EasingFunction = (t: number) => number;

/**
 * Animation type
 */
export type AnimationType = 'enter' | 'update' | 'exit';

/**
 * Enter animation variants
 */
export type EnterAnimation = 'fadeIn' | 'slideInTop' | 'slideInBottom' | 'slideInLeft' | 'slideInRight' | 'grow' | 'bounceIn';

/**
 * Update animation variants
 */
export type UpdateAnimation = 'morph' | 'colorTransition' | 'positionTransition';

/**
 * Exit animation variants
 */
export type ExitAnimation = 'fadeOut' | 'slideOutTop' | 'slideOutBottom' | 'slideOutLeft' | 'slideOutRight' | 'shrink' | 'collapse';

/**
 * Animation configuration
 */
export interface AnimationConfig {
  type: AnimationType;
  variant: EnterAnimation | UpdateAnimation | ExitAnimation;
  duration: number;
  delay?: number;
  easing?: EasingFunction | string;
  stagger?: number; // Delay between staggered animations
  onStart?: () => void;
  onUpdate?: (progress: number) => void;
  onComplete?: () => void;
}

/**
 * Animation state for a single element
 */
export interface AnimationState {
  id: string;
  config: AnimationConfig;
  startTime: number;
  endTime: number;
  isActive: boolean;
  progress: number;
  fromValues?: Record<string, any>;
  toValues?: Record<string, any>;
}

/**
 * Animation queue item
 */
interface AnimationQueueItem {
  id: string;
  config: AnimationConfig;
  element?: any;
  priority: number;
}

/**
 * Built-in easing functions
 */
export const EasingFunctions = {
  // Linear
  linear: (t: number): number => t,
  
  // Quadratic
  easeInQuad: (t: number): number => t * t,
  easeOutQuad: (t: number): number => t * (2 - t),
  easeInOutQuad: (t: number): number => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  
  // Cubic
  easeInCubic: (t: number): number => t * t * t,
  easeOutCubic: (t: number): number => (--t) * t * t + 1,
  easeInOutCubic: (t: number): number => 
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  
  // Quartic
  easeInQuart: (t: number): number => t * t * t * t,
  easeOutQuart: (t: number): number => 1 - (--t) * t * t * t,
  easeInOutQuart: (t: number): number => 
    t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
  
  // Exponential
  easeInExpo: (t: number): number => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),
  easeOutExpo: (t: number): number => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeInOutExpo: (t: number): number => {
    if (t === 0 || t === 1) return t;
    if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
    return (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
  
  // Elastic
  easeInElastic: (t: number): number => {
    if (t === 0 || t === 1) return t;
    const p = 0.3;
    return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * (2 * Math.PI) / p);
  },
  easeOutElastic: (t: number): number => {
    if (t === 0 || t === 1) return t;
    const p = 0.3;
    return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * (2 * Math.PI) / p) + 1;
  },
  easeInOutElastic: (t: number): number => {
    if (t === 0 || t === 1) return t;
    const p = 0.3 * 1.5;
    const s = p / 4;
    const t2 = t * 2 - 1;
    if (t2 < 0) {
      return -0.5 * Math.pow(2, 10 * t2) * Math.sin((t2 - s) * (2 * Math.PI) / p);
    }
    return Math.pow(2, -10 * t2) * Math.sin((t2 - s) * (2 * Math.PI) / p) * 0.5 + 1;
  },
  
  // Bounce
  easeInBounce: (t: number): number => 1 - EasingFunctions.easeOutBounce(1 - t),
  easeOutBounce: (t: number): number => {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  },
  easeInOutBounce: (t: number): number => 
    t < 0.5
      ? EasingFunctions.easeInBounce(t * 2) * 0.5
      : EasingFunctions.easeOutBounce(t * 2 - 1) * 0.5 + 0.5,
  
  // Back
  easeInBack: (t: number): number => {
    const s = 1.70158;
    return t * t * ((s + 1) * t - s);
  },
  easeOutBack: (t: number): number => {
    const s = 1.70158;
    return --t * t * ((s + 1) * t + s) + 1;
  },
  easeInOutBack: (t: number): number => {
    const s = 1.70158 * 1.525;
    if ((t *= 2) < 1) return 0.5 * (t * t * ((s + 1) * t - s));
    return 0.5 * ((t -= 2) * t * ((s + 1) * t + s) + 2);
  },
};

/**
 * ChartAnimationEngine
 * 
 * Manages animations for chart elements with support for enter, update, and exit transitions
 */
export class ChartAnimationEngine {
  private animations: Map<string, AnimationState> = new Map();
  private animationQueue: AnimationQueueItem[] = [];
  private rafId: number | null = null;
  private isRunning: boolean = false;
  private globalSpeed: number = 1.0; // Animation speed multiplier
  private isPaused: boolean = false;
  
  /**
   * Start an animation
   */
  startAnimation(id: string, config: AnimationConfig, fromValues?: any, toValues?: any): void {
    const now = Date.now();
    const delay = config.delay || 0;
    const startTime = now + delay;
    const endTime = startTime + config.duration;
    
    const state: AnimationState = {
      id,
      config,
      startTime,
      endTime,
      isActive: true,
      progress: 0,
      fromValues,
      toValues,
    };
    
    this.animations.set(id, state);
    
    // Start animation loop if not running
    if (!this.isRunning) {
      this.start();
    }
    
    // Call onStart callback with delay
    if (config.onStart) {
      if (delay > 0) {
        setTimeout(() => config.onStart!(), delay);
      } else {
        config.onStart();
      }
    }
  }
  
  /**
   * Queue an animation to run after current animations
   */
  queueAnimation(id: string, config: AnimationConfig, priority: number = 0, element?: any): void {
    this.animationQueue.push({ id, config, element, priority });
    this.animationQueue.sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Process animation queue
   */
  private processQueue(): void {
    if (this.animationQueue.length === 0 || this.animations.size > 0) {
      return;
    }
    
    const item = this.animationQueue.shift();
    if (item) {
      this.startAnimation(item.id, item.config);
    }
  }
  
  /**
   * Start the animation loop
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.animate();
  }
  
  /**
   * Pause all animations
   */
  pause(): void {
    this.isPaused = true;
  }
  
  /**
   * Resume all animations
   */
  resume(): void {
    this.isPaused = false;
    if (!this.isRunning && this.animations.size > 0) {
      this.start();
    }
  }
  
  /**
   * Stop a specific animation
   */
  stopAnimation(id: string): void {
    const state = this.animations.get(id);
    if (state) {
      state.isActive = false;
      if (state.config.onComplete) {
        state.config.onComplete();
      }
      this.animations.delete(id);
    }
  }
  
  /**
   * Stop all animations
   */
  stopAll(): void {
    this.animations.forEach((state) => {
      if (state.config.onComplete) {
        state.config.onComplete();
      }
    });
    this.animations.clear();
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
  
  /**
   * Main animation loop
   */
  private animate = (): void => {
    if (!this.isRunning) return;
    
    const now = Date.now();
    const completedAnimations: string[] = [];
    
    if (!this.isPaused) {
      this.animations.forEach((state, id) => {
        if (!state.isActive) {
          completedAnimations.push(id);
          return;
        }
        
        // Check if animation should start (handle delay)
        if (now < state.startTime) {
          return;
        }
        
        // Calculate progress
        const elapsed = now - state.startTime;
        const duration = state.config.duration / this.globalSpeed;
        let rawProgress = Math.min(elapsed / duration, 1);
        
        // Apply easing
        const easing = this.getEasingFunction(state.config.easing);
        state.progress = easing(rawProgress);
        
        // Call onUpdate callback
        if (state.config.onUpdate) {
          state.config.onUpdate(state.progress);
        }
        
        // Check if animation is complete
        if (rawProgress >= 1) {
          state.isActive = false;
          completedAnimations.push(id);
          
          if (state.config.onComplete) {
            state.config.onComplete();
          }
        }
      });
      
      // Remove completed animations
      completedAnimations.forEach(id => this.animations.delete(id));
      
      // Process queue if no active animations
      this.processQueue();
    }
    
    // Continue loop if there are active animations
    if (this.animations.size > 0 || this.animationQueue.length > 0) {
      this.rafId = requestAnimationFrame(this.animate);
    } else {
      this.isRunning = false;
      this.rafId = null;
    }
  };
  
  /**
   * Get easing function from config
   */
  private getEasingFunction(easing?: EasingFunction | string): EasingFunction {
    if (!easing) {
      return EasingFunctions.easeInOutCubic;
    }
    
    if (typeof easing === 'function') {
      return easing;
    }
    
    return (EasingFunctions as any)[easing] || EasingFunctions.linear;
  }
  
  /**
   * Set global animation speed
   */
  setSpeed(speed: number): void {
    this.globalSpeed = Math.max(0.1, Math.min(5, speed));
  }
  
  /**
   * Get animation state
   */
  getAnimationState(id: string): AnimationState | undefined {
    return this.animations.get(id);
  }
  
  /**
   * Check if animation is active
   */
  isAnimating(id?: string): boolean {
    if (id) {
      return this.animations.has(id);
    }
    return this.animations.size > 0;
  }
  
  /**
   * Get all active animation IDs
   */
  getActiveAnimations(): string[] {
    return Array.from(this.animations.keys());
  }
  
  /**
   * Clear animation queue
   */
  clearQueue(): void {
    this.animationQueue = [];
  }
  
  /**
   * Helper: Create fade-in animation config
   */
  static fadeIn(duration: number = 500, delay: number = 0, easing?: string): AnimationConfig {
    return {
      type: 'enter',
      variant: 'fadeIn',
      duration,
      delay,
      easing: easing || 'easeOutCubic',
    };
  }
  
  /**
   * Helper: Create slide-in animation config
   */
  static slideIn(
    direction: 'top' | 'bottom' | 'left' | 'right',
    duration: number = 500,
    delay: number = 0,
    easing?: string
  ): AnimationConfig {
    const variant = `slideIn${direction.charAt(0).toUpperCase() + direction.slice(1)}` as EnterAnimation;
    return {
      type: 'enter',
      variant,
      duration,
      delay,
      easing: easing || 'easeOutCubic',
    };
  }
  
  /**
   * Helper: Create grow animation config
   */
  static grow(duration: number = 500, delay: number = 0, easing?: string): AnimationConfig {
    return {
      type: 'enter',
      variant: 'grow',
      duration,
      delay,
      easing: easing || 'easeOutBack',
    };
  }
  
  /**
   * Helper: Create bounce-in animation config
   */
  static bounceIn(duration: number = 800, delay: number = 0): AnimationConfig {
    return {
      type: 'enter',
      variant: 'bounceIn',
      duration,
      delay,
      easing: 'easeOutBounce',
    };
  }
  
  /**
   * Helper: Create morph animation config
   */
  static morph(duration: number = 600, easing?: string): AnimationConfig {
    return {
      type: 'update',
      variant: 'morph',
      duration,
      easing: easing || 'easeInOutCubic',
    };
  }
  
  /**
   * Helper: Create fade-out animation config
   */
  static fadeOut(duration: number = 400, delay: number = 0, easing?: string): AnimationConfig {
    return {
      type: 'exit',
      variant: 'fadeOut',
      duration,
      delay,
      easing: easing || 'easeInCubic',
    };
  }
  
  /**
   * Helper: Create shrink animation config
   */
  static shrink(duration: number = 400, delay: number = 0, easing?: string): AnimationConfig {
    return {
      type: 'exit',
      variant: 'shrink',
      duration,
      delay,
      easing: easing || 'easeInBack',
    };
  }
  
  /**
   * Helper: Create staggered animations
   */
  static staggered(
    count: number,
    baseConfig: AnimationConfig,
    staggerDelay: number = 50
  ): AnimationConfig[] {
    return Array.from({ length: count }, (_, i) => ({
      ...baseConfig,
      delay: (baseConfig.delay || 0) + i * staggerDelay,
    }));
  }
  
  /**
   * Interpolate between two values
   */
  static interpolate(from: number, to: number, progress: number): number {
    return from + (to - from) * progress;
  }
  
  /**
   * Interpolate between two colors (hex format)
   */
  static interpolateColor(from: string, to: string, progress: number): string {
    const fromRgb = this.hexToRgb(from);
    const toRgb = this.hexToRgb(to);
    
    if (!fromRgb || !toRgb) return from;
    
    const r = Math.round(this.interpolate(fromRgb.r, toRgb.r, progress));
    const g = Math.round(this.interpolate(fromRgb.g, toRgb.g, progress));
    const b = Math.round(this.interpolate(fromRgb.b, toRgb.b, progress));
    
    return this.rgbToHex(r, g, b);
  }
  
  /**
   * Convert hex color to RGB
   */
  private static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }
  
  /**
   * Convert RGB to hex color
   */
  private static rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }
  
  /**
   * Cleanup
   */
  destroy(): void {
    this.stopAll();
    this.clearQueue();
  }
}
