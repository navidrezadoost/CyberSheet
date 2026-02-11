/**
 * TrendlineCalculator.test.ts
 * Tests for trendline calculations
 * Week 12 Day 6: Advanced Chart Features
 */

import { TrendlineCalculator } from '../src/TrendlineCalculator';

// Helper function for variance calculation
function calculateVariance(values: number[]): number {
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
}

describe('TrendlineCalculator', () => {
  describe('Linear Trendline', () => {
    it('should calculate linear trendline for perfect linear data', () => {
      const xValues = [1, 2, 3, 4, 5];
      const yValues = [2, 4, 6, 8, 10]; // y = 2x
      
      const result = TrendlineCalculator.calculate(xValues, yValues, 'linear');
      
      expect(result.type).toBe('linear');
      expect(result.slope).toBeCloseTo(2, 3);
      expect(result.intercept).toBeCloseTo(0, 3);
      expect(result.rSquared).toBeCloseTo(1, 3);
      expect(result.points).toHaveLength(2);
      expect(result.equation).toContain('2.0000x');
    });

    it('should calculate linear trendline with intercept', () => {
      const xValues = [1, 2, 3, 4, 5];
      const yValues = [3, 5, 7, 9, 11]; // y = 2x + 1
      
      const result = TrendlineCalculator.calculate(xValues, yValues, 'linear');
      
      expect(result.slope).toBeCloseTo(2, 3);
      expect(result.intercept).toBeCloseTo(1, 3);
      expect(result.rSquared).toBeCloseTo(1, 3);
    });

    it('should handle forecast forward and backward', () => {
      const xValues = [2, 3, 4];
      const yValues = [4, 6, 8];
      
      const result = TrendlineCalculator.calculate(xValues, yValues, 'linear', {
        forecastForward: 2,
        forecastBackward: 1
      });
      
      expect(result.points[0].x).toBe(1); // 2 - 1
      expect(result.points[1].x).toBe(6); // 4 + 2
    });

    it('should handle negative correlation', () => {
      const xValues = [1, 2, 3, 4, 5];
      const yValues = [10, 8, 6, 4, 2]; // y = -2x + 12
      
      const result = TrendlineCalculator.calculate(xValues, yValues, 'linear');
      
      expect(result.slope).toBeCloseTo(-2, 3);
      expect(result.intercept).toBeCloseTo(12, 3);
    });

    it('should calculate R² for noisy data', () => {
      const xValues = [1, 2, 3, 4, 5];
      const yValues = [2.1, 3.9, 6.2, 7.8, 10.1]; // Close to y = 2x
      
      const result = TrendlineCalculator.calculate(xValues, yValues, 'linear');
      
      expect(result.rSquared).toBeGreaterThan(0.95);
      expect(result.rSquared).toBeLessThanOrEqual(1);
    });
  });

  describe('Exponential Trendline', () => {
    it('should calculate exponential trendline', () => {
      const xValues = [0, 1, 2, 3, 4];
      const yValues = [1, 2.72, 7.39, 20.09, 54.60]; // y ≈ e^x
      
      const result = TrendlineCalculator.calculate(xValues, yValues, 'exponential');
      
      expect(result.type).toBe('exponential');
      expect(result.coefficients).toHaveLength(2);
      expect(result.coefficients![0]).toBeCloseTo(1, 0); // a ≈ 1
      expect(result.coefficients![1]).toBeCloseTo(1, 0); // b ≈ 1
      expect(result.points.length).toBeGreaterThan(10); // Smooth curve
    });

    it('should generate smooth curve points', () => {
      const xValues = [1, 2, 3, 4];
      const yValues = [2, 4, 8, 16]; // y = 2^x
      
      const result = TrendlineCalculator.calculate(xValues, yValues, 'exponential');
      
      expect(result.points.length).toBeGreaterThan(20);
      
      // Points should be monotonically increasing (for positive growth)
      for (let i = 1; i < result.points.length; i++) {
        expect(result.points[i].x).toBeGreaterThan(result.points[i - 1].x);
      }
    });

    it('should throw error for non-positive y values', () => {
      const xValues = [1, 2, 3];
      const yValues = [2, 0, 4]; // Contains 0
      
      expect(() => {
        TrendlineCalculator.calculate(xValues, yValues, 'exponential');
      }).toThrow('all y values > 0');
    });

    it('should handle forecast options', () => {
      const xValues = [1, 2, 3];
      const yValues = [2, 4, 8];
      
      const result = TrendlineCalculator.calculate(xValues, yValues, 'exponential', {
        forecastForward: 2,
        forecastBackward: 1
      });
      
      expect(result.points[0].x).toBeLessThanOrEqual(0); // 1 - 1
      // Use toBeCloseTo to handle floating point precision (4.999999999999998 ≈ 5)
      expect(result.points[result.points.length - 1].x).toBeCloseTo(5, 10); // 3 + 2
    });
  });

  describe('Polynomial Trendline', () => {
    it('should calculate quadratic trendline', () => {
      const xValues = [1, 2, 3, 4, 5];
      const yValues = [1, 4, 9, 16, 25]; // y = x²
      
      const result = TrendlineCalculator.calculate(xValues, yValues, 'polynomial', {
        degree: 2
      });
      
      expect(result.type).toBe('polynomial');
      expect(result.coefficients).toHaveLength(3); // a + bx + cx²
      expect(result.coefficients![2]).toBeCloseTo(1, 1); // x² coefficient
      expect(result.coefficients![1]).toBeCloseTo(0, 1); // x coefficient
      expect(result.coefficients![0]).toBeCloseTo(0, 1); // constant
      expect(result.rSquared).toBeCloseTo(1, 2);
    });

    it('should calculate cubic trendline', () => {
      const xValues = [1, 2, 3, 4, 5];
      const yValues = [1, 8, 27, 64, 125]; // y = x³
      
      const result = TrendlineCalculator.calculate(xValues, yValues, 'polynomial', {
        degree: 3
      });
      
      expect(result.coefficients).toHaveLength(4); // a + bx + cx² + dx³
      expect(result.coefficients![3]).toBeCloseTo(1, 0); // x³ coefficient
      expect(result.rSquared).toBeGreaterThan(0.99);
    });

    it('should default to degree 2', () => {
      const xValues = [1, 2, 3, 4];
      const yValues = [2, 5, 10, 17];
      
      const result = TrendlineCalculator.calculate(xValues, yValues, 'polynomial');
      
      expect(result.coefficients).toHaveLength(3); // Quadratic
    });

    it('should enforce degree limits', () => {
      const xValues = [1, 2, 3];
      const yValues = [1, 2, 3];
      
      expect(() => {
        TrendlineCalculator.calculate(xValues, yValues, 'polynomial', { degree: 0 });
      }).toThrow('between 1 and 6');
      
      expect(() => {
        TrendlineCalculator.calculate(xValues, yValues, 'polynomial', { degree: 7 });
      }).toThrow('between 1 and 6');
    });

    it('should generate smooth curve', () => {
      const xValues = [1, 2, 3, 4];
      const yValues = [1, 4, 9, 16];
      
      const result = TrendlineCalculator.calculate(xValues, yValues, 'polynomial', {
        degree: 2
      });
      
      expect(result.points.length).toBeGreaterThan(20);
    });
  });

  describe('Moving Average Trendline', () => {
    it('should calculate moving average', () => {
      const xValues = [1, 2, 3, 4, 5, 6, 7];
      const yValues = [2, 4, 3, 5, 4, 6, 5];
      
      const result = TrendlineCalculator.calculate(xValues, yValues, 'moving-average', {
        period: 3
      });
      
      expect(result.type).toBe('moving-average');
      expect(result.points).toHaveLength(7);
      expect(result.equation).toContain('3-period');
    });

    it('should smooth out noise', () => {
      const xValues = [1, 2, 3, 4, 5];
      const yValues = [1, 10, 2, 9, 3]; // Noisy data
      
      const result = TrendlineCalculator.calculate(xValues, yValues, 'moving-average', {
        period: 3
      });
      
      // Moving average should have less variance
      const originalVariance = calculateVariance(yValues);
      const smoothedValues = result.points.map((p: any) => p.y);
      const smoothedVariance = calculateVariance(smoothedValues);
      
      expect(smoothedVariance).toBeLessThan(originalVariance);
    });

    it('should default period to 1/5 of data length', () => {
      const xValues = Array.from({ length: 20 }, (_, i) => i);
      const yValues = xValues.map(x => x + Math.random());
      
      const result = TrendlineCalculator.calculate(xValues, yValues, 'moving-average');
      
      expect(result.equation).toContain('4-period'); // floor(20/5)
    });

    it('should enforce period limits', () => {
      const xValues = [1, 2, 3, 4, 5];
      const yValues = [1, 2, 3, 4, 5];
      
      expect(() => {
        TrendlineCalculator.calculate(xValues, yValues, 'moving-average', { period: 1 });
      }).toThrow('between 2 and data length');
      
      expect(() => {
        TrendlineCalculator.calculate(xValues, yValues, 'moving-average', { period: 10 });
      }).toThrow('between 2 and data length');
    });

    it('should preserve data length', () => {
      const xValues = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const yValues = [1, 3, 2, 4, 3, 5, 4, 6, 5, 7];
      
      const result = TrendlineCalculator.calculate(xValues, yValues, 'moving-average', {
        period: 3
      });
      
      expect(result.points).toHaveLength(xValues.length);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for empty arrays', () => {
      expect(() => {
        TrendlineCalculator.calculate([], [], 'linear');
      }).toThrow('same non-zero length');
    });

    it('should throw error for mismatched array lengths', () => {
      expect(() => {
        TrendlineCalculator.calculate([1, 2, 3], [1, 2], 'linear');
      }).toThrow('same non-zero length');
    });

    it('should throw error for unsupported type', () => {
      expect(() => {
        TrendlineCalculator.calculate([1, 2], [1, 2], 'invalid' as any);
      }).toThrow('Unsupported trendline type');
    });
  });

  describe('R² Calculation', () => {
    it('should return 1 for perfect fit', () => {
      const xValues = [1, 2, 3, 4, 5];
      const yValues = [2, 4, 6, 8, 10];
      
      const result = TrendlineCalculator.calculate(xValues, yValues, 'linear');
      
      expect(result.rSquared).toBeCloseTo(1, 5);
    });

    it('should return value between 0 and 1', () => {
      const xValues = [1, 2, 3, 4, 5];
      const yValues = [2.1, 3.8, 6.3, 7.9, 9.8];
      
      const result = TrendlineCalculator.calculate(xValues, yValues, 'linear');
      
      expect(result.rSquared).toBeGreaterThanOrEqual(0);
      expect(result.rSquared).toBeLessThanOrEqual(1);
    });

    it('should return lower value for poor fit', () => {
      const xValues = [1, 2, 3, 4, 5];
      const yValues = [1, 5, 2, 8, 3]; // Random-ish
      
      const result = TrendlineCalculator.calculate(xValues, yValues, 'linear');
      
      expect(result.rSquared).toBeLessThan(0.5);
    });
  });
});
