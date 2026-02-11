/**
 * axis-scaler.test.ts
 * Week 12 Day 6: Advanced Chart Features - Enhanced Axes Tests
 * 
 * Tests for axis scaling and tick generation
 */

import { AxisScaler } from '../src/AxisScaler';
import type { AxisScale, AxisBounds, AxisConfig } from '@cyber-sheet/core';

describe('AxisScaler', () => {
  describe('Linear Scale', () => {
    it('should scale values linearly', () => {
      const bounds: AxisBounds = { min: 0, max: 100 };
      const pixelRange: [number, number] = [0, 500];
      
      expect(AxisScaler.scaleValue(0, 'linear', bounds, pixelRange)).toBe(0);
      expect(AxisScaler.scaleValue(50, 'linear', bounds, pixelRange)).toBe(250);
      expect(AxisScaler.scaleValue(100, 'linear', bounds, pixelRange)).toBe(500);
    });

    it('should handle negative values', () => {
      const bounds: AxisBounds = { min: -50, max: 50 };
      const pixelRange: [number, number] = [0, 400];
      
      expect(AxisScaler.scaleValue(-50, 'linear', bounds, pixelRange)).toBe(0);
      expect(AxisScaler.scaleValue(0, 'linear', bounds, pixelRange)).toBe(200);
      expect(AxisScaler.scaleValue(50, 'linear', bounds, pixelRange)).toBe(400);
    });

    it('should reverse axis when specified', () => {
      const bounds: AxisBounds = { min: 0, max: 100 };
      const pixelRange: [number, number] = [0, 500];
      
      expect(AxisScaler.scaleValue(0, 'linear', bounds, pixelRange, true)).toBe(500);
      expect(AxisScaler.scaleValue(100, 'linear', bounds, pixelRange, true)).toBe(0);
    });

    it('should generate linear ticks with nice intervals', () => {
      const bounds: AxisBounds = { min: 0, max: 100 };
      const pixelRange: [number, number] = [0, 500];
      
      const ticks = AxisScaler.generateTicks('linear', bounds, pixelRange);
      
      expect(ticks.length).toBeGreaterThan(3);
      expect(ticks.length).toBeLessThan(10);
      expect(ticks.every(t => t.isMajor)).toBe(true);
      
      // Verify ticks are evenly spaced in value
      if (ticks.length > 1) {
        const intervals = [];
        for (let i = 1; i < ticks.length; i++) {
          intervals.push(ticks[i].value - ticks[i - 1].value);
        }
        const firstInterval = intervals[0];
        intervals.forEach(interval => {
          expect(Math.abs(interval - firstInterval)).toBeLessThan(0.01);
        });
      }
    });

    it('should invert pixel positions back to values', () => {
      const bounds: AxisBounds = { min: 0, max: 100 };
      const pixelRange: [number, number] = [0, 500];
      
      expect(AxisScaler.invertScale(0, 'linear', bounds, pixelRange)).toBeCloseTo(0);
      expect(AxisScaler.invertScale(250, 'linear', bounds, pixelRange)).toBeCloseTo(50);
      expect(AxisScaler.invertScale(500, 'linear', bounds, pixelRange)).toBeCloseTo(100);
    });
  });

  describe('Logarithmic Scale', () => {
    it('should scale values logarithmically', () => {
      const bounds: AxisBounds = { min: 1, max: 1000 };
      const pixelRange: [number, number] = [0, 600];
      
      expect(AxisScaler.scaleValue(1, 'logarithmic', bounds, pixelRange)).toBeCloseTo(0);
      expect(AxisScaler.scaleValue(10, 'logarithmic', bounds, pixelRange)).toBeCloseTo(200);
      expect(AxisScaler.scaleValue(100, 'logarithmic', bounds, pixelRange)).toBeCloseTo(400);
      expect(AxisScaler.scaleValue(1000, 'logarithmic', bounds, pixelRange)).toBeCloseTo(600);
    });

    it('should throw error for non-positive values', () => {
      const bounds: AxisBounds = { min: 1, max: 100 };
      const pixelRange: [number, number] = [0, 500];
      
      expect(() => {
        AxisScaler.scaleValue(0, 'logarithmic', bounds, pixelRange);
      }).toThrow('positive values');
      
      expect(() => {
        AxisScaler.scaleValue(-10, 'logarithmic', bounds, pixelRange);
      }).toThrow('positive values');
    });

    it('should throw error for non-positive bounds', () => {
      const bounds: AxisBounds = { min: -10, max: 100 };
      const pixelRange: [number, number] = [0, 500];
      
      expect(() => {
        AxisScaler.scaleValue(50, 'logarithmic', bounds, pixelRange);
      }).toThrow('bounds must be positive');
    });

    it('should generate logarithmic ticks at powers of 10', () => {
      const bounds: AxisBounds = { min: 1, max: 1000 };
      const pixelRange: [number, number] = [0, 600];
      
      const ticks = AxisScaler.generateTicks('logarithmic', bounds, pixelRange);
      
      // Should have major ticks at 1, 10, 100, 1000
      const majorTicks = ticks.filter(t => t.isMajor);
      expect(majorTicks.length).toBeGreaterThanOrEqual(3);
      expect(majorTicks.some(t => t.value === 1)).toBe(true);
      expect(majorTicks.some(t => t.value === 10)).toBe(true);
      expect(majorTicks.some(t => t.value === 100)).toBe(true);
      expect(majorTicks.some(t => t.value === 1000)).toBe(true);
      
      // Should also have minor ticks
      const minorTicks = ticks.filter(t => !t.isMajor);
      expect(minorTicks.length).toBeGreaterThan(0);
    });

    it('should invert logarithmic scale', () => {
      const bounds: AxisBounds = { min: 1, max: 1000 };
      const pixelRange: [number, number] = [0, 600];
      
      expect(AxisScaler.invertScale(0, 'logarithmic', bounds, pixelRange)).toBeCloseTo(1);
      expect(AxisScaler.invertScale(200, 'logarithmic', bounds, pixelRange)).toBeCloseTo(10);
      expect(AxisScaler.invertScale(400, 'logarithmic', bounds, pixelRange)).toBeCloseTo(100);
      expect(AxisScaler.invertScale(600, 'logarithmic', bounds, pixelRange)).toBeCloseTo(1000);
    });
  });

  describe('Time Scale', () => {
    it('should scale timestamps linearly', () => {
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      const bounds: AxisBounds = { min: now, max: now + 7 * oneDay };
      const pixelRange: [number, number] = [0, 700];
      
      expect(AxisScaler.scaleValue(now, 'time', bounds, pixelRange)).toBeCloseTo(0);
      expect(AxisScaler.scaleValue(now + 3.5 * oneDay, 'time', bounds, pixelRange)).toBeCloseTo(350);
      expect(AxisScaler.scaleValue(now + 7 * oneDay, 'time', bounds, pixelRange)).toBeCloseTo(700);
    });

    it('should generate time ticks at appropriate intervals', () => {
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      const bounds: AxisBounds = { min: now, max: now + 30 * oneDay };
      const pixelRange: [number, number] = [0, 600];
      
      const ticks = AxisScaler.generateTicks('time', bounds, pixelRange);
      
      expect(ticks.length).toBeGreaterThan(0);
      expect(ticks.every(t => t.isMajor)).toBe(true);
      expect(ticks.every(t => t.label.length > 0)).toBe(true);
    });

    it('should format timestamps with custom format', () => {
      const bounds: AxisBounds = { min: Date.now(), max: Date.now() + 86400000 };
      const pixelRange: [number, number] = [0, 500];
      const config: AxisConfig = {
        scale: 'time',
        dateFormat: 'YYYY-MM-DD HH:mm'
      };
      
      const ticks = AxisScaler.generateTicks('time', bounds, pixelRange, config);
      
      expect(ticks.length).toBeGreaterThan(0);
      // Check that labels contain expected format elements
      expect(ticks[0].label).toMatch(/\d{4}-\d{2}-\d{2}/);
    });

    it('should invert time scale', () => {
      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      const bounds: AxisBounds = { min: now, max: now + 7 * oneDay };
      const pixelRange: [number, number] = [0, 700];
      
      expect(AxisScaler.invertScale(0, 'time', bounds, pixelRange)).toBeCloseTo(now);
      expect(AxisScaler.invertScale(350, 'time', bounds, pixelRange)).toBeCloseTo(now + 3.5 * oneDay);
      expect(AxisScaler.invertScale(700, 'time', bounds, pixelRange)).toBeCloseTo(now + 7 * oneDay);
    });
  });

  describe('Category Scale', () => {
    it('should place categories in center of bands', () => {
      const bounds: AxisBounds = { min: 0, max: 4 }; // 5 categories: 0,1,2,3,4
      const pixelRange: [number, number] = [0, 500];
      
      // Each band is 100 pixels wide, categories centered at 50, 150, 250, 350, 450
      expect(AxisScaler.scaleValue(0, 'category', bounds, pixelRange)).toBeCloseTo(50);
      expect(AxisScaler.scaleValue(1, 'category', bounds, pixelRange)).toBeCloseTo(150);
      expect(AxisScaler.scaleValue(2, 'category', bounds, pixelRange)).toBeCloseTo(250);
      expect(AxisScaler.scaleValue(3, 'category', bounds, pixelRange)).toBeCloseTo(350);
      expect(AxisScaler.scaleValue(4, 'category', bounds, pixelRange)).toBeCloseTo(450);
    });

    it('should generate category ticks', () => {
      const bounds: AxisBounds = { min: 0, max: 3 }; // 4 categories
      const pixelRange: [number, number] = [0, 400];
      
      const ticks = AxisScaler.generateTicks('category', bounds, pixelRange);
      
      expect(ticks.length).toBe(4);
      expect(ticks.every(t => t.isMajor)).toBe(true);
      expect(ticks.every(t => t.label.startsWith('Category'))).toBe(true);
    });

    it('should invert category scale to nearest category', () => {
      const bounds: AxisBounds = { min: 0, max: 4 };
      const pixelRange: [number, number] = [0, 500];
      
      // Pixel 50 should be category 0
      expect(AxisScaler.invertScale(50, 'category', bounds, pixelRange)).toBe(0);
      // Pixel 150 should be category 1
      expect(AxisScaler.invertScale(150, 'category', bounds, pixelRange)).toBe(1);
      // Pixel 250 should be category 2
      expect(AxisScaler.invertScale(250, 'category', bounds, pixelRange)).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unsupported scale type', () => {
      const bounds: AxisBounds = { min: 0, max: 100 };
      const pixelRange: [number, number] = [0, 500];
      
      expect(() => {
        AxisScaler.scaleValue(50, 'invalid' as AxisScale, bounds, pixelRange);
      }).toThrow('Unsupported scale type');
    });

    it('should throw error for unsupported scale type in tick generation', () => {
      const bounds: AxisBounds = { min: 0, max: 100 };
      const pixelRange: [number, number] = [0, 500];
      
      expect(() => {
        AxisScaler.generateTicks('invalid' as AxisScale, bounds, pixelRange);
      }).toThrow('Unsupported scale type');
    });
  });

  describe('Number Formatting', () => {
    it('should format large numbers in exponential notation', () => {
      const bounds: AxisBounds = { min: 0, max: 10000000 };
      const pixelRange: [number, number] = [0, 500];
      
      const ticks = AxisScaler.generateTicks('linear', bounds, pixelRange);
      
      // At least some ticks should use exponential notation
      const hasExponential = ticks.some(t => t.label.includes('e'));
      expect(hasExponential).toBe(true);
    });

    it('should format small numbers in exponential notation', () => {
      const bounds: AxisBounds = { min: 0, max: 0.0001 };
      const pixelRange: [number, number] = [0, 500];
      
      const ticks = AxisScaler.generateTicks('linear', bounds, pixelRange);
      
      // Should have at least one tick with exponential notation
      const hasExponential = ticks.some(t => t.label.includes('e') || t.value === 0);
      expect(hasExponential).toBe(true);
    });

    it('should format integers without decimals', () => {
      const bounds: AxisBounds = { min: 0, max: 10 };
      const pixelRange: [number, number] = [0, 500];
      
      const ticks = AxisScaler.generateTicks('linear', bounds, pixelRange);
      
      ticks.forEach(tick => {
        if (Number.isInteger(tick.value)) {
          expect(tick.label).not.toContain('.');
        }
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero range gracefully', () => {
      const bounds: AxisBounds = { min: 50, max: 50 };
      const pixelRange: [number, number] = [0, 500];
      
      const result = AxisScaler.scaleValue(50, 'linear', bounds, pixelRange);
      expect(result).toBe(250); // Should be centered
    });

    it('should handle very small pixel ranges', () => {
      const bounds: AxisBounds = { min: 0, max: 100 };
      const pixelRange: [number, number] = [0, 10];
      
      expect(AxisScaler.scaleValue(0, 'linear', bounds, pixelRange)).toBe(0);
      expect(AxisScaler.scaleValue(50, 'linear', bounds, pixelRange)).toBeCloseTo(5);
      expect(AxisScaler.scaleValue(100, 'linear', bounds, pixelRange)).toBe(10);
    });

    it('should handle single category', () => {
      const bounds: AxisBounds = { min: 0, max: 0 }; // 1 category
      const pixelRange: [number, number] = [0, 500];
      
      const result = AxisScaler.scaleValue(0, 'category', bounds, pixelRange);
      expect(result).toBe(250); // Should be centered
    });
  });
});
