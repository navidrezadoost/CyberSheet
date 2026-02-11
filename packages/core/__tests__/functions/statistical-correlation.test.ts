/**
 * statistical-correlation.test.ts
 * 
 * Tests for correlation and regression functions (Week 8, Day 2-3)
 * - CORREL, PEARSON, COVARIANCE.P/S
 * - RSQ, SLOPE, INTERCEPT
 * - FORECAST.LINEAR, FORECAST, STEYX, TREND
 */

import { FormulaEngine, FormulaContext, Worksheet } from '../../src';

describe('Statistical Functions - Correlation & Regression (Week 8 Day 2-3)', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;
  let context: FormulaContext;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Sheet1', 100, 26);
    context = {
      worksheet,
      currentCell: { row: 1, col: 1 },
      namedLambdas: new Map()
    } as FormulaContext;
  });

  const evaluate = (formula: string) => engine.evaluate(formula, context);

  // Helper to set up X and Y data
  const setupData = (xVals: number[], yVals: number[]) => {
    for (let i = 0; i < xVals.length; i++) {
      worksheet.setCellValue({ row: i, col: 0 }, xVals[i]);
    }
    for (let i = 0; i < yVals.length; i++) {
      worksheet.setCellValue({ row: i, col: 1 }, yVals[i]);
    }
  };

  describe('CORREL (Correlation Coefficient)', () => {
    test('perfect positive correlation (y=2x)', () => {
      setupData([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]);
      const result = evaluate('=CORREL(A1:A5, B1:B5)');
      expect(result).toBeCloseTo(1.0, 10);
    });

    test('perfect negative correlation (y=-x+6)', () => {
      setupData([1, 2, 3, 4, 5], [5, 4, 3, 2, 1]);
      const result = evaluate('=CORREL(A1:A5, B1:B5)');
      expect(result).toBeCloseTo(-1.0, 10);
    });

    test('partial correlation', () => {
      setupData([1, 2, 3, 4, 5], [2, 3, 5, 6, 9]);
      const result = evaluate('=CORREL(A1:A5, B1:B5)');
      expect(result).toBeGreaterThan(0.9);
      expect(result).toBeLessThan(1.0);
    });

    test('requires equal length arrays', () => {
      setupData([1, 2, 3], [1, 2]);
      const result = evaluate('=CORREL(A1:A3, B1:B2)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#N/A');
    });

    test('zero variance returns error', () => {
      setupData([5, 5, 5], [1, 2, 3]);
      const result = evaluate('=CORREL(A1:A3, B1:B3)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#DIV/0!');
    });
  });

  describe('PEARSON (Alias for CORREL)', () => {
    test('returns same result as CORREL', () => {
      setupData([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]);
      const correl = evaluate('=CORREL(A1:A5, B1:B5)');
      const pearson = evaluate('=PEARSON(A1:A5, B1:B5)');
      expect(pearson).toBe(correl);
    });
  });

  describe('COVARIANCE.P (Population Covariance)', () => {
    test('calculates positive covariance', () => {
      setupData([1, 2, 3], [4, 5, 6]);
      const result = evaluate('=COVARIANCE.P(A1:A3, B1:B3)');
      expect(result).toBeCloseTo(0.6666666, 5);
    });

    test('calculates negative covariance', () => {
      setupData([1, 2, 3], [6, 5, 4]);
      const result = evaluate('=COVARIANCE.P(A1:A3, B1:B3)');
      expect(result).toBeCloseTo(-0.6666666, 5);
    });

    test('zero covariance for constant Y', () => {
      setupData([1, 2, 3], [2, 2, 2]);
      const result = evaluate('=COVARIANCE.P(A1:A3, B1:B3)');
      expect(result).toBe(0);
    });
  });

  describe('COVARIANCE.S (Sample Covariance)', () => {
    test('calculates sample covariance', () => {
      setupData([1, 2, 3], [4, 5, 6]);
      const result = evaluate('=COVARIANCE.S(A1:A3, B1:B3)');
      expect(result).toBe(1);
    });

    test('different from population covariance', () => {
      setupData([1, 2, 3], [4, 5, 6]);
      const covP = evaluate('=COVARIANCE.P(A1:A3, B1:B3)');
      const covS = evaluate('=COVARIANCE.S(A1:A3, B1:B3)');
      expect(covS).toBeGreaterThan(covP as number);
    });
  });

  describe('RSQ (R-Squared)', () => {
    test('perfect fit returns 1', () => {
      setupData([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]);
      const result = evaluate('=RSQ(B1:B5, A1:A5)');
      expect(result).toBeCloseTo(1.0, 10);
    });

    test('perfect inverse returns 1', () => {
      setupData([1, 2, 3, 4, 5], [5, 4, 3, 2, 1]);
      const result = evaluate('=RSQ(B1:B5, A1:A5)');
      expect(result).toBeCloseTo(1.0, 10);
    });

    test('equals square of correlation', () => {
      setupData([1, 2, 3, 4], [2, 3, 5, 6]);
      const correl = evaluate('=CORREL(B1:B4, A1:A4)') as number;
      const rsq = evaluate('=RSQ(B1:B4, A1:A4)');
      expect(rsq).toBeCloseTo(correl * correl, 10);
    });
  });

  describe('SLOPE (Linear Regression Slope)', () => {
    test('calculates slope of y=2x', () => {
      setupData([1, 2, 3, 4], [2, 4, 6, 8]);
      const result = evaluate('=SLOPE(B1:B4, A1:A4)');
      expect(result).toBeCloseTo(2.0, 10);
    });

    test('calculates slope of y=0.5x', () => {
      setupData([1, 2, 3, 4], [0.5, 1, 1.5, 2]);
      const result = evaluate('=SLOPE(B1:B4, A1:A4)');
      expect(result).toBeCloseTo(0.5, 10);
    });

    test('negative slope', () => {
      setupData([1, 2, 3, 4], [4, 3, 2, 1]);
      const result = evaluate('=SLOPE(B1:B4, A1:A4)');
      expect(result).toBeCloseTo(-1.0, 10);
    });

    test('horizontal line has zero slope', () => {
      setupData([1, 2, 3, 4], [5, 5, 5, 5]);
      const result = evaluate('=SLOPE(B1:B4, A1:A4)');
      expect(result).toBe(0);
    });

    test('vertical line returns error', () => {
      setupData([5, 5, 5, 5], [1, 2, 3, 4]);
      const result = evaluate('=SLOPE(B1:B4, A1:A4)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#DIV/0!');
    });
  });

  describe('INTERCEPT (Y-Intercept)', () => {
    test('y=2x intercept is 0', () => {
      setupData([1, 2, 3, 4], [2, 4, 6, 8]);
      const result = evaluate('=INTERCEPT(B1:B4, A1:A4)');
      expect(result).toBeCloseTo(0, 10);
    });

    test('y=2x+3 intercept is 3', () => {
      setupData([1, 2, 3, 4], [5, 7, 9, 11]);
      const result = evaluate('=INTERCEPT(B1:B4, A1:A4)');
      expect(result).toBeCloseTo(3, 10);
    });

    test('negative intercept', () => {
      setupData([1, 2, 3, 4], [-1, 1, 3, 5]);
      const result = evaluate('=INTERCEPT(B1:B4, A1:A4)');
      expect(result).toBeCloseTo(-3, 10);
    });

    test('horizontal line', () => {
      setupData([1, 2, 3, 4], [5, 5, 5, 5]);
      const result = evaluate('=INTERCEPT(B1:B4, A1:A4)');
      expect(result).toBe(5);
    });
  });

  describe('FORECAST.LINEAR (Linear Prediction)', () => {
    test('predicts on y=2x line', () => {
      setupData([1, 2, 3, 4], [2, 4, 6, 8]);
      const result = evaluate('=FORECAST.LINEAR(5, B1:B4, A1:A4)');
      expect(result).toBeCloseTo(10, 10);
    });

    test('predicts on y=2x+3 line', () => {
      setupData([1, 2, 3, 4], [5, 7, 9, 11]);
      const result = evaluate('=FORECAST.LINEAR(5, B1:B4, A1:A4)');
      expect(result).toBeCloseTo(13, 10);
    });

    test('interpolation within range', () => {
      setupData([1, 2, 3, 4], [2, 4, 6, 8]);
      const result = evaluate('=FORECAST.LINEAR(2.5, B1:B4, A1:A4)');
      expect(result).toBeCloseTo(5, 10);
    });

    test('extrapolation beyond range', () => {
      setupData([1, 2, 3, 4], [2, 4, 6, 8]);
      const result = evaluate('=FORECAST.LINEAR(10, B1:B4, A1:A4)');
      expect(result).toBeCloseTo(20, 10);
    });

    test('negative x value', () => {
      setupData([1, 2, 3, 4], [2, 4, 6, 8]);
      const result = evaluate('=FORECAST.LINEAR(-1, B1:B4, A1:A4)');
      expect(result).toBeCloseTo(-2, 10);
    });
  });

  describe('FORECAST (Alias)', () => {
    test('returns same result as FORECAST.LINEAR', () => {
      setupData([1, 2, 3, 4], [2, 4, 6, 8]);
      const linear = evaluate('=FORECAST.LINEAR(5, B1:B4, A1:A4)');
      const forecast = evaluate('=FORECAST(5, B1:B4, A1:A4)');
      expect(forecast).toBe(linear);
    });
  });

  describe('STEYX (Standard Error)', () => {
    test('perfect fit has zero error', () => {
      setupData([1, 2, 3, 4], [2, 4, 6, 8]);
      const result = evaluate('=STEYX(B1:B4, A1:A4)');
      expect(result).toBeCloseTo(0, 10);
    });

    test('calculates error for imperfect fit', () => {
      setupData([1, 2, 3, 4], [2, 3, 5, 6]);
      const result = evaluate('=STEYX(B1:B4, A1:A4)');
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1);
    });

    test('requires at least 3 points', () => {
      setupData([1, 2], [2, 4]);
      const result = evaluate('=STEYX(B1:B2, A1:A2)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#DIV/0!');
    });
  });

  describe('TREND (Linear Trend)', () => {
    test('returns fitted values for known X', () => {
      setupData([1, 2, 3, 4], [2, 4, 6, 8]);
      const result = evaluate('=TREND(B1:B4, A1:A4)');
      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result)) {
        expect(result.length).toBe(4);
        expect(result[0]).toBeCloseTo(2, 10);
        expect(result[3]).toBeCloseTo(8, 10);
      }
    });

    test('predicts for new X values', () => {
      setupData([1, 2, 3, 4], [2, 4, 6, 8]);
      // Add new X values in column C
      worksheet.setCellValue({ row: 0, col: 2 }, 5);
      worksheet.setCellValue({ row: 1, col: 2 }, 6);
      const result = evaluate('=TREND(B1:B4, A1:A4, C1:C2)');
      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result)) {
        expect(result[0]).toBeCloseTo(10, 10);
        expect(result[1]).toBeCloseTo(12, 10);
      }
    });
  });

  describe('Integration Tests', () => {
    test('complete regression analysis (y=3x+2)', () => {
      setupData([1, 2, 3, 4, 5], [5, 8, 11, 14, 17]);
      
      const slope = evaluate('=SLOPE(B1:B5, A1:A5)');
      const intercept = evaluate('=INTERCEPT(B1:B5, A1:A5)');
      const rsq = evaluate('=RSQ(B1:B5, A1:A5)');
      const forecast = evaluate('=FORECAST.LINEAR(6, B1:B5, A1:A5)');
      
      expect(slope).toBeCloseTo(3, 10);
      expect(intercept).toBeCloseTo(2, 10);
      expect(rsq).toBeCloseTo(1, 10);
      expect(forecast).toBeCloseTo(20, 10);
    });

    test('correlation and covariance relationship', () => {
      setupData([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]);
      
      const correl = evaluate('=CORREL(A1:A5, B1:B5)');
      const covS = evaluate('=COVARIANCE.S(A1:A5, B1:B5)');
      
      expect(correl).toBeCloseTo(1, 10);
      expect(covS).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    test('handles identical values', () => {
      setupData([1, 1, 1], [2, 2, 2]);
      const correl = evaluate('=CORREL(A1:A3, B1:B3)');
      expect(correl).toBeInstanceOf(Error);
    });

    test('handles negative values', () => {
      setupData([1, 2, 3], [-2, -4, -6]);
      const slope = evaluate('=SLOPE(B1:B3, A1:A3)');
      expect(slope).toBeCloseTo(-2, 10);
    });

    test('handles mixed positive/negative', () => {
      setupData([-1, 0, 1], [-2, 0, 2]);
      const correl = evaluate('=CORREL(A1:A3, B1:B3)');
      expect(correl).toBeCloseTo(1, 10);
    });

    test('large numbers maintain precision', () => {
      setupData([1, 2, 3], [1000000, 2000000, 3000000]);
      const slope = evaluate('=SLOPE(B1:B3, A1:A3)');
      expect(slope).toBeCloseTo(1000000, 5);
    });

    test('decimal precision', () => {
      setupData([1, 2, 3], [0.1, 0.2, 0.3]);
      const slope = evaluate('=SLOPE(B1:B3, A1:A3)');
      expect(slope).toBeCloseTo(0.1, 10);
    });
  });
});
