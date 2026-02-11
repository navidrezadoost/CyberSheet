/**
 * regression-functions.ts
 * 
 * Advanced regression and trend analysis functions
 * Week 11 Day 7: Complete Formula Coverage
 * 
 * Functions:
 * - LINEST: Multiple linear regression with full statistics
 * - LOGEST: Exponential regression analysis
 * - GROWTH: Exponential growth predictions
 */

import type { FormulaValue, FormulaFunction } from '../../types/formula-types';
import { toNumber } from '../../utils/type-utils';
import { flattenArray } from '../../utils/array-utils';

/**
 * Helper to ensure value is treated as array
 */
function ensureArray(value: FormulaValue): FormulaValue[] {
  if (Array.isArray(value)) return value;
  return [value];
}

// ============================================================================
// Helper Functions for Matrix Operations
// ============================================================================

/**
 * Transpose a 2D matrix
 */
function transpose(matrix: number[][]): number[][] {
  if (matrix.length === 0) return [];
  const rows = matrix.length;
  const cols = matrix[0].length;
  const result: number[][] = [];
  
  for (let j = 0; j < cols; j++) {
    result[j] = [];
    for (let i = 0; i < rows; i++) {
      result[j][i] = matrix[i][j];
    }
  }
  
  return result;
}

/**
 * Matrix multiplication: A × B
 */
function matrixMultiply(A: number[][], B: number[][]): number[][] {
  const rowsA = A.length;
  const colsA = A[0].length;
  const colsB = B[0].length;
  const result: number[][] = [];
  
  for (let i = 0; i < rowsA; i++) {
    result[i] = [];
    for (let j = 0; j < colsB; j++) {
      let sum = 0;
      for (let k = 0; k < colsA; k++) {
        sum += A[i][k] * B[k][j];
      }
      result[i][j] = sum;
    }
  }
  
  return result;
}

/**
 * Matrix inversion using Gauss-Jordan elimination
 */
function matrixInverse(matrix: number[][]): number[][] | Error {
  const n = matrix.length;
  if (n === 0 || matrix[0].length !== n) {
    return new Error('#VALUE!');
  }
  
  // Create augmented matrix [A | I]
  const augmented: number[][] = [];
  for (let i = 0; i < n; i++) {
    augmented[i] = [...matrix[i]];
    for (let j = 0; j < n; j++) {
      augmented[i].push(i === j ? 1 : 0);
    }
  }
  
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
    
    // Check for singular matrix
    if (Math.abs(augmented[i][i]) < 1e-10) {
      return new Error('#NUM!');
    }
    
    // Scale pivot row
    const pivot = augmented[i][i];
    for (let j = 0; j < 2 * n; j++) {
      augmented[i][j] /= pivot;
    }
    
    // Eliminate column
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = augmented[k][i];
        for (let j = 0; j < 2 * n; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }
  }
  
  // Extract inverse from augmented matrix
  const inverse: number[][] = [];
  for (let i = 0; i < n; i++) {
    inverse[i] = augmented[i].slice(n);
  }
  
  return inverse;
}

/**
 * Calculate mean of an array
 */
function mean(values: number[]): number {
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Subtract two vectors: a - b
 */
function vectorSubtract(a: number[], b: number[]): number[] {
  return a.map((val, i) => val - b[i]);
}

/**
 * Calculate sum of squares
 */
function sumOfSquares(values: number[]): number {
  return values.reduce((sum, val) => sum + val * val, 0);
}

// ============================================================================
// Week 11 Day 7: Regression Functions
// ============================================================================

/**
 * LINEST - Multiple linear regression with full statistics
 * 
 * Syntax: LINEST(known_y's, [known_x's], [const], [stats])
 * 
 * @param knownYs - Dependent variable values (required)
 * @param knownXs - Independent variable values (optional, defaults to {1, 2, 3, ...})
 * @param constB - If TRUE/omitted, calculate intercept; if FALSE, force intercept to 0
 * @param stats - If TRUE, return full statistics; if FALSE/omitted, return coefficients only
 * @returns Regression coefficients or full statistics array
 * 
 * Output format (when stats=TRUE):
 * Row 1: [m_n, m_n-1, ..., m_1, b]      // Coefficients (slope(s) and intercept)
 * Row 2: [se_n, se_n-1, ..., se_1, se_b] // Standard errors
 * Row 3: [r², se_y]                      // R² and standard error of y
 * Row 4: [F, df]                         // F statistic and degrees of freedom
 * Row 5: [ss_reg, ss_resid]             // Regression and residual sum of squares
 * 
 * Examples:
 * - LINEST({1,3,5,7,9}, {1,2,3,4,5}) → {2, -1} (y = 2x - 1)
 * - LINEST({2,4,6,8}, {1,2,3,4}, TRUE, TRUE) → full statistics array
 * - LINEST({2,4,6,8}, {1,2,3,4}, FALSE) → {2} (y = 2x, forced through origin)
 * 
 * Notes:
 * - Uses least squares regression: β = (X'X)^(-1) X'y
 * - Handles multiple independent variables (multiple regression)
 * - Returns #NUM! for singular matrices or insufficient data
 */
export const LINEST: FormulaFunction = (knownYs, knownXs?, constB?, stats?) => {
  // Parse Y values
  const yFlat = flattenArray(ensureArray(knownYs));
  const y: number[] = [];
  for (const val of yFlat) {
    const num = toNumber(val);
    if (num instanceof Error) return num;
    y.push(num);
  }
  
  const n = y.length;
  if (n < 2) {
    return new Error('#NUM!'); // Need at least 2 points
  }
  
  // Parse X values (default to 1, 2, 3, ...)
  let X: number[][];
  if (knownXs === undefined || knownXs === null) {
    // Default X values: [[1], [2], [3], ...]
    X = Array.from({ length: n }, (_, i) => [i + 1]);
  } else {
    const xFlat = flattenArray(ensureArray(knownXs));
    const xVals: number[] = [];
    for (const val of xFlat) {
      const num = toNumber(val);
      if (num instanceof Error) return num;
      xVals.push(num);
    }
    
    // Check if multiple columns or single column
    if (xVals.length === n) {
      // Single column
      X = xVals.map(val => [val]);
    } else if (xVals.length % n === 0) {
      // Multiple columns
      const cols = xVals.length / n;
      X = [];
      for (let i = 0; i < n; i++) {
        X[i] = [];
        for (let j = 0; j < cols; j++) {
          X[i][j] = xVals[j * n + i];
        }
      }
    } else {
      return new Error('#VALUE!'); // Mismatched dimensions
    }
  }
  
  // Add intercept column if const=TRUE (default)
  const useIntercept = constB === undefined || constB === null || constB === true;
  if (useIntercept) {
    // Add column of 1s at the end for intercept
    X = X.map(row => [...row, 1]);
  }
  
  const k = X[0].length; // Number of coefficients
  if (n <= k) {
    return new Error('#NUM!'); // Insufficient data
  }
  
  // Solve normal equation: β = (X'X)^(-1) X'y
  const Xt = transpose(X);
  const XtX = matrixMultiply(Xt, X);
  const XtXinv = matrixInverse(XtX);
  if (XtXinv instanceof Error) return XtXinv;
  
  const yColumn = y.map(val => [val]);
  const Xty = matrixMultiply(Xt, yColumn);
  const betaMatrix = matrixMultiply(XtXinv, Xty);
  const beta = betaMatrix.map(row => row[0]);
  
  // Calculate fitted values and residuals
  const yHat = X.map(row => row.reduce((sum, xi, i) => sum + xi * beta[i], 0));
  const residuals = vectorSubtract(y, yHat);
  
  // Return just coefficients if stats=FALSE
  const returnStats = stats === true;
  if (!returnStats) {
    // Return coefficients in reverse order (Excel format)
    return [beta.reverse()];
  }
  
  // Calculate full statistics
  const yMean = mean(y);
  const SST = sumOfSquares(vectorSubtract(y, Array(n).fill(yMean)));
  const SSR = sumOfSquares(residuals);
  const SSE = SST - SSR;
  
  const df = n - k;
  const r2 = df > 0 ? 1 - (SSR / SST) : 1;
  const seY = df > 0 ? Math.sqrt(SSR / df) : 0;
  const F = (df > 0 && SSR > 0) ? (SSE / (k - (useIntercept ? 1 : 0))) / (SSR / df) : 0;
  
  // Calculate standard errors
  const se: number[] = [];
  for (let i = 0; i < k; i++) {
    const variance = df > 0 ? XtXinv[i][i] * (SSR / df) : 0;
    se[i] = Math.sqrt(Math.abs(variance));
  }
  
  // Format output (Excel format: reverse order)
  return [
    beta.reverse(),           // Row 1: Coefficients
    se.reverse(),             // Row 2: Standard errors
    [r2, seY],                // Row 3: R², se_y
    [F, df],                  // Row 4: F statistic, degrees of freedom
    [SSE, SSR]                // Row 5: Regression SS, Residual SS
  ];
};

/**
 * LOGEST - Exponential regression analysis
 * 
 * Syntax: LOGEST(known_y's, [known_x's], [const], [stats])
 * 
 * @param knownYs - Dependent variable values (must be positive)
 * @param knownXs - Independent variable values (optional)
 * @param constB - If TRUE/omitted, calculate b; if FALSE, b=1
 * @param stats - If TRUE, return full statistics; if FALSE/omitted, return coefficients only
 * @returns Exponential regression coefficients for y = b * m^x
 * 
 * Output format:
 * - If stats=FALSE: [m_n, ..., m_1, b] (exponential coefficients)
 * - If stats=TRUE: 5-row array like LINEST
 * 
 * Examples:
 * - LOGEST({2,3,4.5,6.75}, {0,1,2,3}) → {1.5, 2} (y = 2 * 1.5^x)
 * - LOGEST({1,2,4,8,16}, {0,1,2,3,4}) → {2, 1} (y = 1 * 2^x)
 * 
 * Algorithm:
 * 1. Transform: ln(y) = ln(b) + x*ln(m)
 * 2. Apply LINEST to (x, ln(y))
 * 3. Back-transform: m = e^(slope), b = e^(intercept)
 * 
 * Notes:
 * - All y values must be positive
 * - Returns #NUM! for non-positive y values
 */
export const LOGEST: FormulaFunction = (knownYs, knownXs?, constB?, stats?) => {
  // Parse Y values and validate positivity
  const yFlat = flattenArray(ensureArray(knownYs));
  const y: number[] = [];
  for (const val of yFlat) {
    const num = toNumber(val);
    if (num instanceof Error) return num;
    if (num <= 0) {
      return new Error('#NUM!'); // Exponential regression requires positive y
    }
    y.push(num);
  }
  
  // Transform to logarithmic scale
  const lnY = y.map(val => Math.log(val));
  
  // Apply LINEST to transformed data
  // Pass through optional parameters (TypeScript allows undefined passthrough)
  const linestResult = knownXs !== undefined 
    ? (constB !== undefined 
        ? (stats !== undefined ? LINEST(lnY, knownXs, constB, stats) : LINEST(lnY, knownXs, constB))
        : LINEST(lnY, knownXs))
    : LINEST(lnY);
    
  if (linestResult instanceof Error) return linestResult;
  if (!linestResult || !Array.isArray(linestResult)) {
    return new Error('#VALUE!');
  }
  
  // Back-transform coefficients
  if (!Array.isArray(linestResult[0])) {
    return new Error('#VALUE!');
  }
  
  const returnStats = stats === true;
  if (!returnStats) {
    // Just coefficients: transform e^(ln coefficients)
    const coeffs = (linestResult[0] as number[]).map(val => Math.exp(val));
    return [coeffs];
  }
  
  // Full statistics: transform first row (coefficients), keep rest
  const result = [...linestResult as FormulaValue[][]];
  result[0] = (result[0] as number[]).map(val => Math.exp(val));
  return result;
};

/**
 * GROWTH - Exponential growth predictions
 * 
 * Syntax: GROWTH(known_y's, [known_x's], [new_x's], [const])
 * 
 * @param knownYs - Known dependent values (must be positive)
 * @param knownXs - Known independent values (optional)
 * @param newXs - X values for prediction (optional, defaults to known_x's)
 * @param constB - If TRUE/omitted, calculate b; if FALSE, b=1
 * @returns Array of predicted y values along exponential curve
 * 
 * Examples:
 * - GROWTH({1,2,4,8}, {0,1,2,3}, {4,5}) → {16, 32} (predict next values)
 * - GROWTH({1,2,4,8}, {0,1,2,3}) → {1, 2, 4, 8} (fit at known points)
 * 
 * Relationship:
 * GROWTH is to LOGEST as TREND is to LINEST
 * 
 * Algorithm:
 * 1. Use LOGEST to find exponential coefficients
 * 2. For each new_x: predicted_y = b * m1^x1 * m2^x2 * ...
 * 3. Return array of predictions
 * 
 * Notes:
 * - All known y values must be positive
 * - Returns predictions along best-fit exponential curve
 */
export const GROWTH: FormulaFunction = (knownYs, knownXs?, newXs?, constB?) => {
  // Get exponential coefficients from LOGEST
  const coeffsResult = knownXs !== undefined
    ? (constB !== undefined ? LOGEST(knownYs, knownXs, constB, false) : LOGEST(knownYs, knownXs, null, false))
    : LOGEST(knownYs, null, null, false);
    
  if (coeffsResult instanceof Error) return coeffsResult;
  
  if (!Array.isArray(coeffsResult) || !Array.isArray(coeffsResult[0])) {
    return new Error('#VALUE!');
  }
  
  const coeffs = coeffsResult[0] as number[];
  
  // Parse known X values to determine dimensions
  let knownXDims: number[][] = [];
  const yFlat = flattenArray(ensureArray(knownYs));
  const n = yFlat.length;
  
  if (knownXs === undefined || knownXs === null) {
    // Default X: 1, 2, 3, ...
    knownXDims = Array.from({ length: n }, (_, i) => [i + 1]);
  } else {
    const xFlat = flattenArray(ensureArray(knownXs));
    if (xFlat.length === n) {
      const xNums: number[] = [];
      for (const val of xFlat) {
        const num = toNumber(val);
        if (num instanceof Error) return num;
        xNums.push(num);
      }
      knownXDims = xNums.map(val => [val]);
    } else if (xFlat.length % n === 0) {
      const cols = xFlat.length / n;
      knownXDims = [];
      for (let i = 0; i < n; i++) {
        knownXDims[i] = [];
        for (let j = 0; j < cols; j++) {
          const val = toNumber(xFlat[j * n + i]);
          if (val instanceof Error) return val;
          knownXDims[i][j] = val;
        }
      }
    }
  }
  
  // Parse new X values
  let newXDims: number[][] = [];
  if (newXs === undefined || newXs === null) {
    // Use known X values
    newXDims = knownXDims;
  } else {
    const newXFlat = flattenArray(ensureArray(newXs));
    const cols = knownXDims[0].length;
    
    if (newXFlat.length % cols === 0) {
      const rows = newXFlat.length / cols;
      newXDims = [];
      for (let i = 0; i < rows; i++) {
        newXDims[i] = [];
        for (let j = 0; j < cols; j++) {
          const val = toNumber(newXFlat[i * cols + j]);
          if (val instanceof Error) return val;
          newXDims[i][j] = val;
        }
      }
    } else if (cols === 1) {
      // Single column
      const newXNums: number[] = [];
      for (const val of newXFlat) {
        const num = toNumber(val);
        if (num instanceof Error) return num;
        newXNums.push(num);
      }
      newXDims = newXNums.map(num => [num]);
    } else {
      return new Error('#VALUE!');
    }
  }
  
  // Calculate predictions: y = b * m1^x1 * m2^x2 * ...
  const predictions: number[] = [];
  const useIntercept = constB === undefined || constB === null || constB === true;
  const b = useIntercept ? coeffs[coeffs.length - 1] : 1;
  
  for (const xRow of newXDims) {
    let y = b;
    for (let j = 0; j < xRow.length; j++) {
      const m = coeffs[coeffs.length - 2 - j];
      y *= Math.pow(m, xRow[j]);
    }
    predictions.push(y);
  }
  
  return predictions.length === 1 ? predictions[0] : predictions;
};
