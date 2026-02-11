/**
 * AxisScaler.ts
 * Week 12 Day 6: Advanced Chart Features - Enhanced Axes
 * 
 * Handles axis scaling transformations for charts:
 * - Linear: Standard proportional scaling
 * - Logarithmic: Log10 scaling for exponential data
 * - Time: Date/time axis with proper intervals
 * - Category: Discrete category labels
 */

import type { AxisScale, AxisConfig, AxisBounds } from '@cyber-sheet/core';

/**
 * Scaled value result
 */
export interface ScaledValue {
  /** Pixel position on the axis */
  position: number;
  /** Original value */
  value: number;
  /** Formatted label (if applicable) */
  label?: string;
}

/**
 * Tick mark for axis rendering
 */
export interface AxisTick {
  /** Pixel position */
  position: number;
  /** Value at this position */
  value: number;
  /** Display label */
  label: string;
  /** Is this a major tick (vs minor) */
  isMajor: boolean;
}

/**
 * AxisScaler - Converts data values to pixel positions based on scale type
 */
export class AxisScaler {
  /**
   * Scale a value to a pixel position
   * 
   * @param value - The data value to scale
   * @param scale - The type of scale to use
   * @param bounds - The data bounds (min/max)
   * @param pixelRange - [minPixel, maxPixel] output range
   * @param reverse - Reverse the axis direction
   * @returns Scaled pixel position
   */
  static scaleValue(
    value: number,
    scale: AxisScale,
    bounds: AxisBounds,
    pixelRange: [number, number],
    reverse: boolean = false
  ): number {
    const [minPixel, maxPixel] = reverse 
      ? [pixelRange[1], pixelRange[0]] 
      : pixelRange;

    switch (scale) {
      case 'linear':
        return this.scaleLinear(value, bounds, [minPixel, maxPixel]);
      
      case 'logarithmic':
        return this.scaleLogarithmic(value, bounds, [minPixel, maxPixel]);
      
      case 'time':
        return this.scaleTime(value, bounds, [minPixel, maxPixel]);
      
      case 'category':
        return this.scaleCategory(value, bounds, [minPixel, maxPixel]);
      
      default:
        throw new Error(`Unsupported scale type: ${scale}`);
    }
  }

  /**
   * Generate tick marks for an axis
   * 
   * @param scale - Scale type
   * @param bounds - Data bounds
   * @param pixelRange - Pixel range
   * @param config - Optional axis configuration
   * @returns Array of tick marks
   */
  static generateTicks(
    scale: AxisScale,
    bounds: AxisBounds,
    pixelRange: [number, number],
    config?: AxisConfig
  ): AxisTick[] {
    switch (scale) {
      case 'linear':
        return this.generateLinearTicks(bounds, pixelRange, config);
      
      case 'logarithmic':
        return this.generateLogarithmicTicks(bounds, pixelRange, config);
      
      case 'time':
        return this.generateTimeTicks(bounds, pixelRange, config);
      
      case 'category':
        return this.generateCategoryTicks(bounds, pixelRange, config);
      
      default:
        throw new Error(`Unsupported scale type: ${scale}`);
    }
  }

  /**
   * Linear scaling: proportional mapping
   */
  private static scaleLinear(
    value: number,
    bounds: AxisBounds,
    pixelRange: [number, number]
  ): number {
    const { min, max } = bounds;
    const [minPixel, maxPixel] = pixelRange;
    
    if (max === min) return (minPixel + maxPixel) / 2;
    
    const ratio = (value - min) / (max - min);
    return minPixel + ratio * (maxPixel - minPixel);
  }

  /**
   * Logarithmic scaling: log10 transformation
   */
  private static scaleLogarithmic(
    value: number,
    bounds: AxisBounds,
    pixelRange: [number, number]
  ): number {
    const { min, max } = bounds;
    const [minPixel, maxPixel] = pixelRange;
    
    if (value <= 0) {
      throw new Error('Logarithmic scale requires positive values');
    }
    
    if (min <= 0 || max <= 0) {
      throw new Error('Logarithmic scale bounds must be positive');
    }
    
    const logMin = Math.log10(min);
    const logMax = Math.log10(max);
    const logValue = Math.log10(value);
    
    if (logMax === logMin) return (minPixel + maxPixel) / 2;
    
    const ratio = (logValue - logMin) / (logMax - logMin);
    return minPixel + ratio * (maxPixel - minPixel);
  }

  /**
   * Time scaling: treats values as timestamps
   */
  private static scaleTime(
    value: number,
    bounds: AxisBounds,
    pixelRange: [number, number]
  ): number {
    // Time scale is essentially linear with timestamp values
    return this.scaleLinear(value, bounds, pixelRange);
  }

  /**
   * Category scaling: discrete positions
   */
  private static scaleCategory(
    value: number,
    bounds: AxisBounds,
    pixelRange: [number, number]
  ): number {
    const { min, max } = bounds;
    const [minPixel, maxPixel] = pixelRange;
    
    // Categories are evenly spaced
    const categoryCount = Math.floor(max - min) + 1;
    const categoryIndex = Math.floor(value - min);
    
    if (categoryCount <= 1) return (minPixel + maxPixel) / 2;
    
    // Place category in the center of its band
    const bandWidth = (maxPixel - minPixel) / categoryCount;
    return minPixel + (categoryIndex + 0.5) * bandWidth;
  }

  /**
   * Generate linear ticks with nice intervals
   */
  private static generateLinearTicks(
    bounds: AxisBounds,
    pixelRange: [number, number],
    config?: AxisConfig
  ): AxisTick[] {
    const { min, max } = bounds;
    const ticks: AxisTick[] = [];
    
    // Calculate nice tick interval
    const range = max - min;
    const targetTickCount = 5;
    const rawInterval = range / targetTickCount;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawInterval)));
    const normalizedInterval = rawInterval / magnitude;
    
    // Round to nice number (1, 2, 5, 10)
    let niceInterval: number;
    if (normalizedInterval <= 1) niceInterval = 1;
    else if (normalizedInterval <= 2) niceInterval = 2;
    else if (normalizedInterval <= 5) niceInterval = 5;
    else niceInterval = 10;
    
    const interval = niceInterval * magnitude;
    
    // Generate ticks
    const startValue = Math.ceil(min / interval) * interval;
    for (let value = startValue; value <= max; value += interval) {
      const position = this.scaleLinear(value, bounds, pixelRange);
      ticks.push({
        position,
        value,
        label: this.formatNumber(value),
        isMajor: true
      });
    }
    
    return ticks;
  }

  /**
   * Generate logarithmic ticks (powers of 10)
   */
  private static generateLogarithmicTicks(
    bounds: AxisBounds,
    pixelRange: [number, number],
    config?: AxisConfig
  ): AxisTick[] {
    const { min, max } = bounds;
    const ticks: AxisTick[] = [];
    
    if (min <= 0 || max <= 0) {
      throw new Error('Logarithmic scale bounds must be positive');
    }
    
    const logMin = Math.floor(Math.log10(min));
    const logMax = Math.ceil(Math.log10(max));
    
    // Generate ticks at powers of 10
    for (let exp = logMin; exp <= logMax; exp++) {
      const value = Math.pow(10, exp);
      if (value >= min && value <= max) {
        const position = this.scaleLogarithmic(value, bounds, pixelRange);
        ticks.push({
          position,
          value,
          label: this.formatNumber(value),
          isMajor: true
        });
      }
      
      // Add minor ticks (2, 3, 4, 5, 6, 7, 8, 9) * 10^exp
      for (let mult = 2; mult <= 9; mult++) {
        const minorValue = mult * Math.pow(10, exp);
        if (minorValue >= min && minorValue <= max) {
          const position = this.scaleLogarithmic(minorValue, bounds, pixelRange);
          ticks.push({
            position,
            value: minorValue,
            label: this.formatNumber(minorValue),
            isMajor: false
          });
        }
      }
    }
    
    return ticks;
  }

  /**
   * Generate time-based ticks
   */
  private static generateTimeTicks(
    bounds: AxisBounds,
    pixelRange: [number, number],
    config?: AxisConfig
  ): AxisTick[] {
    const { min, max } = bounds;
    const ticks: AxisTick[] = [];
    const range = max - min; // milliseconds
    
    // Determine appropriate time interval
    const intervals = [
      { ms: 1000, label: 'second' },
      { ms: 60 * 1000, label: 'minute' },
      { ms: 60 * 60 * 1000, label: 'hour' },
      { ms: 24 * 60 * 60 * 1000, label: 'day' },
      { ms: 7 * 24 * 60 * 60 * 1000, label: 'week' },
      { ms: 30 * 24 * 60 * 60 * 1000, label: 'month' },
      { ms: 365 * 24 * 60 * 60 * 1000, label: 'year' }
    ];
    
    const targetTickCount = 5;
    const targetInterval = range / targetTickCount;
    
    // Find best interval
    let selectedInterval = intervals[0];
    for (const interval of intervals) {
      if (interval.ms <= targetInterval) {
        selectedInterval = interval;
      } else {
        break;
      }
    }
    
    // Generate ticks at interval boundaries
    const intervalMs = selectedInterval.ms;
    const startValue = Math.ceil(min / intervalMs) * intervalMs;
    
    for (let value = startValue; value <= max; value += intervalMs) {
      const position = this.scaleTime(value, bounds, pixelRange);
      ticks.push({
        position,
        value,
        label: this.formatTime(value, config?.dateFormat),
        isMajor: true
      });
    }
    
    return ticks;
  }

  /**
   * Generate category ticks
   */
  private static generateCategoryTicks(
    bounds: AxisBounds,
    pixelRange: [number, number],
    config?: AxisConfig
  ): AxisTick[] {
    const { min, max } = bounds;
    const ticks: AxisTick[] = [];
    const categoryCount = Math.floor(max - min) + 1;
    
    for (let i = 0; i < categoryCount; i++) {
      const value = min + i;
      const position = this.scaleCategory(value, bounds, pixelRange);
      ticks.push({
        position,
        value,
        label: `Category ${Math.floor(value)}`,
        isMajor: true
      });
    }
    
    return ticks;
  }

  /**
   * Format a number for display
   */
  private static formatNumber(value: number): string {
    if (Math.abs(value) >= 1e6 || (Math.abs(value) < 0.001 && value !== 0)) {
      return value.toExponential(1);
    }
    
    if (Number.isInteger(value)) {
      return value.toString();
    }
    
    return value.toFixed(2);
  }

  /**
   * Format a timestamp for display
   */
  private static formatTime(timestamp: number, format?: string): string {
    const date = new Date(timestamp);
    
    if (format) {
      // Simple format support: YYYY-MM-DD, HH:mm:ss, etc.
      return format
        .replace('YYYY', date.getFullYear().toString())
        .replace('MM', String(date.getMonth() + 1).padStart(2, '0'))
        .replace('DD', String(date.getDate()).padStart(2, '0'))
        .replace('HH', String(date.getHours()).padStart(2, '0'))
        .replace('mm', String(date.getMinutes()).padStart(2, '0'))
        .replace('ss', String(date.getSeconds()).padStart(2, '0'));
    }
    
    // Default format: ISO date
    return date.toISOString().split('T')[0];
  }

  /**
   * Invert a pixel position back to data value
   */
  static invertScale(
    pixelPosition: number,
    scale: AxisScale,
    bounds: AxisBounds,
    pixelRange: [number, number],
    reverse: boolean = false
  ): number {
    const [minPixel, maxPixel] = reverse 
      ? [pixelRange[1], pixelRange[0]] 
      : pixelRange;
    
    const { min, max } = bounds;
    
    switch (scale) {
      case 'linear':
      case 'time': {
        const ratio = (pixelPosition - minPixel) / (maxPixel - minPixel);
        return min + ratio * (max - min);
      }
      
      case 'logarithmic': {
        const logMin = Math.log10(min);
        const logMax = Math.log10(max);
        const ratio = (pixelPosition - minPixel) / (maxPixel - minPixel);
        const logValue = logMin + ratio * (logMax - logMin);
        return Math.pow(10, logValue);
      }
      
      case 'category': {
        const categoryCount = Math.floor(max - min) + 1;
        const bandWidth = (maxPixel - minPixel) / categoryCount;
        const categoryIndex = Math.floor((pixelPosition - minPixel) / bandWidth);
        return min + categoryIndex;
      }
      
      default:
        throw new Error(`Unsupported scale type: ${scale}`);
    }
  }
}
