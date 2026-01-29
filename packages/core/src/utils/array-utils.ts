/**
 * array-utils.ts
 * 
 * Array manipulation utilities for formula engine.
 * Optimized for performance with V8-friendly patterns.
 */

import type { FormulaValue } from '../types/formula-types';
import { isArray, is2DArray } from './type-utils';

/**
 * Flatten nested arrays recursively
 * Optimized with tail-call pattern and pre-allocated result array
 */
export function flattenArray(arr: FormulaValue[]): FormulaValue[] {
  const result: FormulaValue[] = [];
  const stack: FormulaValue[] = [...arr];

  while (stack.length > 0) {
    const item = stack.pop()!;
    
    if (Array.isArray(item)) {
      // Push in reverse order to maintain order when popping
      for (let i = item.length - 1; i >= 0; i--) {
        stack.push(item[i]);
      }
    } else {
      result.push(item);
    }
  }

  return result.reverse();
}

/**
 * Filter numeric values from array
 * Monomorphic function for V8 optimization
 */
export function filterNumbers(arr: FormulaValue[]): number[] {
  const result: number[] = [];
  const flat = flattenArray(arr);

  for (let i = 0; i < flat.length; i++) {
    const val = flat[i];
    if (typeof val === 'number' && !isNaN(val)) {
      result.push(val);
    }
  }

  return result;
}

/**
 * Convert 1D array to 2D array (column vector)
 */
export function to2DArray(arr: FormulaValue[]): FormulaValue[][] {
  return arr.map(val => [val]);
}

/**
 * Convert 2D array to 1D array (flatten)
 */
export function to1DArray(arr: FormulaValue[][]): FormulaValue[] {
  const result: FormulaValue[] = [];
  
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr[i].length; j++) {
      result.push(arr[i][j]);
    }
  }

  return result;
}

/**
 * Get dimensions of array
 * Returns [rows, cols]
 */
export function getArrayDimensions(arr: FormulaValue[] | FormulaValue[][]): [number, number] {
  if (!Array.isArray(arr) || arr.length === 0) {
    return [0, 0];
  }

  if (Array.isArray(arr[0])) {
    // 2D array
    const arr2d = arr as FormulaValue[][];
    return [arr2d.length, arr2d[0].length];
  }

  // 1D array (treat as column vector)
  return [arr.length, 1];
}

/**
 * Transpose 2D array
 * Optimized with pre-allocated array
 */
export function transposeArray(arr: FormulaValue[][]): FormulaValue[][] {
  if (!arr || arr.length === 0) return [];

  const rows = arr.length;
  const cols = arr[0].length;
  
  // Pre-allocate result array for better performance
  const result: FormulaValue[][] = new Array(cols);
  
  for (let j = 0; j < cols; j++) {
    result[j] = new Array(rows);
    for (let i = 0; i < rows; i++) {
      result[j][i] = arr[i][j];
    }
  }

  return result;
}

/**
 * Get array element at index (0-based)
 * Handles 1D and 2D arrays
 */
export function getArrayElement(arr: FormulaValue[] | FormulaValue[][], index: number): FormulaValue {
  if (!Array.isArray(arr) || index < 0) {
    return new Error('#VALUE!');
  }

  if (is2DArray(arr)) {
    // Flatten 2D array to 1D for index access
    const flat = to1DArray(arr);
    return index < flat.length ? flat[index] : new Error('#VALUE!');
  }

  return index < arr.length ? arr[index] : new Error('#VALUE!');
}

/**
 * Ensure array has minimum length (pad with zeros)
 */
export function padArray(arr: FormulaValue[], minLength: number, padValue: FormulaValue = 0): FormulaValue[] {
  if (arr.length >= minLength) return arr;

  const result = [...arr];
  for (let i = arr.length; i < minLength; i++) {
    result.push(padValue);
  }

  return result;
}

/**
 * Zip multiple arrays together
 * Returns array of tuples (shortest length wins)
 */
export function zipArrays(...arrays: FormulaValue[][]): FormulaValue[][] {
  if (arrays.length === 0) return [];

  const minLength = Math.min(...arrays.map(arr => arr.length));
  const result: FormulaValue[][] = new Array(minLength);

  for (let i = 0; i < minLength; i++) {
    result[i] = arrays.map(arr => arr[i]);
  }

  return result;
}

/**
 * Check if all elements in array are errors
 */
export function allErrors(arr: FormulaValue[]): boolean {
  if (!Array.isArray(arr) || arr.length === 0) return false;

  for (let i = 0; i < arr.length; i++) {
    if (!(arr[i] instanceof Error)) {
      return false;
    }
  }

  return true;
}

/**
 * Find first non-error value in array
 */
export function firstNonError(arr: FormulaValue[]): FormulaValue | null {
  for (let i = 0; i < arr.length; i++) {
    if (!(arr[i] instanceof Error)) {
      return arr[i];
    }
  }
  return null;
}

/**
 * Create array with repeated value
 * Pre-allocated for performance
 */
export function repeatValue(value: FormulaValue, count: number): FormulaValue[] {
  const result: FormulaValue[] = new Array(count);
  
  for (let i = 0; i < count; i++) {
    result[i] = value;
  }

  return result;
}

/**
 * Range of numbers [start, start+1, ..., end]
 * Optimized with pre-allocation
 */
export function range(start: number, end: number, step: number = 1): number[] {
  if (step === 0) return [];

  const length = Math.floor((end - start) / step) + 1;
  if (length <= 0) return [];

  const result: number[] = new Array(length);
  
  for (let i = 0; i < length; i++) {
    result[i] = start + i * step;
  }

  return result;
}
