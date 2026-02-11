/**
 * TrendlineCalculator.ts
 * Week 12 Day 6: Advanced Chart Features
 * 
 * Statistical calculations for chart trendlines
 */

import type { TrendlineType, TrendlineResult } from '@cyber-sheet/core';

/**
 * TrendlineCalculator - Calculate trendlines for chart data
 */
export class TrendlineCalculator {
  /**
   * Calculate trendline for given data points
   */
  static calculate(
    xValues: number[],
    yValues: number[],
    type: TrendlineType,
    options: {
      degree?: number;
      period?: number;
      forecastForward?: number;
      forecastBackward?: number;
    } = {}
  ): TrendlineResult {
    if (xValues.length !== yValues.length || xValues.length === 0) {
      throw new Error('Invalid data: x and y arrays must have same non-zero length');
    }

    switch (type) {
      case 'linear':
        return this.calculateLinear(xValues, yValues, options);
      case 'exponential':
        return this.calculateExponential(xValues, yValues, options);
      case 'polynomial':
        return this.calculatePolynomial(xValues, yValues, options);
      case 'moving-average':
        return this.calculateMovingAverage(xValues, yValues, options);
      default:
        throw new Error(`Unsupported trendline type: ${type}`);
    }
  }

  /**
   * Calculate linear trendline (y = mx + b)
   */
  private static calculateLinear(
    xValues: number[],
    yValues: number[],
    options: { forecastForward?: number; forecastBackward?: number }
  ): TrendlineResult {
    const n = xValues.length;
    
    // Calculate means
    const xMean = xValues.reduce((sum, x) => sum + x, 0) / n;
    const yMean = yValues.reduce((sum, y) => sum + y, 0) / n;
    
    // Calculate slope (m) and intercept (b)
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      const xDiff = xValues[i] - xMean;
      const yDiff = yValues[i] - yMean;
      numerator += xDiff * yDiff;
      denominator += xDiff * xDiff;
    }
    
    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = yMean - slope * xMean;
    
    // Calculate R²
    const rSquared = this.calculateRSquared(xValues, yValues, (x) => slope * x + intercept);
    
    // Generate points
    const minX = Math.min(...xValues) - (options.forecastBackward || 0);
    const maxX = Math.max(...xValues) + (options.forecastForward || 0);
    
    const points = [
      { x: minX, y: slope * minX + intercept },
      { x: maxX, y: slope * maxX + intercept }
    ];
    
    return {
      type: 'linear',
      points,
      equation: `y = ${slope.toFixed(4)}x + ${intercept.toFixed(4)}`,
      rSquared,
      slope,
      intercept
    };
  }

  /**
   * Calculate exponential trendline (y = ae^(bx))
   */
  private static calculateExponential(
    xValues: number[],
    yValues: number[],
    options: { forecastForward?: number; forecastBackward?: number }
  ): TrendlineResult {
    // Transform to linear: ln(y) = ln(a) + bx
    const lnY = yValues.map(y => {
      if (y <= 0) throw new Error('Exponential trendline requires all y values > 0');
      return Math.log(y);
    });
    
    const linear = this.calculateLinear(xValues, lnY, {});
    
    // Convert back: a = e^intercept, b = slope
    const a = Math.exp(linear.intercept!);
    const b = linear.slope!;
    
    // Calculate R² for exponential fit
    const rSquared = this.calculateRSquared(xValues, yValues, (x) => a * Math.exp(b * x));
    
    // Generate points
    const minX = Math.min(...xValues) - (options.forecastBackward || 0);
    const maxX = Math.max(...xValues) + (options.forecastForward || 0);
    const step = (maxX - minX) / 50; // 50 points for smooth curve
    
    const points: { x: number; y: number }[] = [];
    for (let x = minX; x <= maxX; x += step) {
      points.push({ x, y: a * Math.exp(b * x) });
    }
    
    return {
      type: 'exponential',
      points,
      equation: `y = ${a.toFixed(4)}e^(${b.toFixed(4)}x)`,
      rSquared,
      coefficients: [a, b]
    };
  }

  /**
   * Calculate polynomial trendline
   */
  private static calculatePolynomial(
    xValues: number[],
    yValues: number[],
    options: { degree?: number; forecastForward?: number; forecastBackward?: number }
  ): TrendlineResult {
    const degree = options.degree ?? 2;
    
    if (degree < 1 || degree > 6) {
      throw new Error('Polynomial degree must be between 1 and 6');
    }
    
    // Build Vandermonde matrix and solve using least squares
    const coefficients = this.polynomialRegression(xValues, yValues, degree);
    
    // Calculate R²
    const rSquared = this.calculateRSquared(xValues, yValues, (x) => {
      let y = 0;
      for (let i = 0; i <= degree; i++) {
        y += coefficients[i] * Math.pow(x, i);
      }
      return y;
    });
    
    // Generate points
    const minX = Math.min(...xValues) - (options.forecastBackward || 0);
    const maxX = Math.max(...xValues) + (options.forecastForward || 0);
    const step = (maxX - minX) / 50;
    
    const points: { x: number; y: number }[] = [];
    for (let x = minX; x <= maxX; x += step) {
      let y = 0;
      for (let i = 0; i <= degree; i++) {
        y += coefficients[i] * Math.pow(x, i);
      }
      points.push({ x, y });
    }
    
    // Build equation string
    const terms = coefficients
      .map((coef, i) => {
        if (Math.abs(coef) < 1e-10) return '';
        const sign = coef >= 0 ? '+' : '';
        if (i === 0) return `${coef.toFixed(4)}`;
        if (i === 1) return `${sign}${coef.toFixed(4)}x`;
        return `${sign}${coef.toFixed(4)}x^${i}`;
      })
      .filter(t => t !== '')
      .reverse()
      .join(' ');
    
    return {
      type: 'polynomial',
      points,
      equation: `y = ${terms}`,
      rSquared,
      coefficients
    };
  }

  /**
   * Calculate moving average trendline
   */
  private static calculateMovingAverage(
    xValues: number[],
    yValues: number[],
    options: { period?: number }
  ): TrendlineResult {
    const period = options.period ?? Math.max(2, Math.floor(xValues.length / 5));
    
    if (period < 2 || period > xValues.length) {
      throw new Error('Moving average period must be between 2 and data length');
    }
    
    const points: { x: number; y: number }[] = [];
    
    for (let i = 0; i < yValues.length; i++) {
      const start = Math.max(0, i - Math.floor(period / 2));
      const end = Math.min(yValues.length, start + period);
      
      let sum = 0;
      let count = 0;
      for (let j = start; j < end; j++) {
        sum += yValues[j];
        count++;
      }
      
      points.push({
        x: xValues[i],
        y: sum / count
      });
    }
    
    return {
      type: 'moving-average',
      points,
      equation: `${period}-period moving average`
    };
  }

  /**
   * Polynomial regression using least squares
   */
  private static polynomialRegression(
    xValues: number[],
    yValues: number[],
    degree: number
  ): number[] {
    const n = xValues.length;
    const size = degree + 1;
    
    // Build normal equations matrix (A^T * A)
    const matrix: number[][] = Array(size).fill(0).map(() => Array(size).fill(0));
    const vector: number[] = Array(size).fill(0);
    
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        let sum = 0;
        for (let k = 0; k < n; k++) {
          sum += Math.pow(xValues[k], i + j);
        }
        matrix[i][j] = sum;
      }
      
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += yValues[k] * Math.pow(xValues[k], i);
      }
      vector[i] = sum;
    }
    
    // Solve using Gaussian elimination
    return this.gaussianElimination(matrix, vector);
  }

  /**
   * Gaussian elimination to solve linear system
   */
  private static gaussianElimination(matrix: number[][], vector: number[]): number[] {
    const n = matrix.length;
    const augmented: number[][] = matrix.map((row, i) => [...row, vector[i]]);
    
    // Forward elimination
    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }
      
      // Swap rows
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
      
      // Eliminate column
      for (let k = i + 1; k < n; k++) {
        const factor = augmented[k][i] / augmented[i][i];
        for (let j = i; j <= n; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }
    
    // Back substitution
    const solution: number[] = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      solution[i] = augmented[i][n];
      for (let j = i + 1; j < n; j++) {
        solution[i] -= augmented[i][j] * solution[j];
      }
      solution[i] /= augmented[i][i];
    }
    
    return solution;
  }

  /**
   * Calculate R² (coefficient of determination)
   */
  private static calculateRSquared(
    xValues: number[],
    yValues: number[],
    predictFn: (x: number) => number
  ): number {
    const yMean = yValues.reduce((sum, y) => sum + y, 0) / yValues.length;
    
    let ssRes = 0; // Residual sum of squares
    let ssTot = 0; // Total sum of squares
    
    for (let i = 0; i < xValues.length; i++) {
      const predicted = predictFn(xValues[i]);
      ssRes += Math.pow(yValues[i] - predicted, 2);
      ssTot += Math.pow(yValues[i] - yMean, 2);
    }
    
    return ssTot !== 0 ? 1 - (ssRes / ssTot) : 0;
  }
}
