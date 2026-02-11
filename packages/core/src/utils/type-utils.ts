/**
 * type-utils.ts
 * 
 * Type checking and conversion utilities.
 * Optimized for V8 with monomorphic patterns and inline caching.
 */

import type { FormulaValue } from '../types/formula-types';

/**
 * Check if value is a number (monomorphic for V8 optimization)
 * @inline
 */
export function isNumber(value: FormulaValue): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Check if value is a string (monomorphic)
 * @inline
 */
export function isString(value: FormulaValue): value is string {
  return typeof value === 'string';
}

/**
 * Check if value is a boolean (monomorphic)
 * @inline
 */
export function isBoolean(value: FormulaValue): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Check if value is an error (monomorphic)
 * @inline
 */
export function isError(value: FormulaValue): value is Error {
  return value instanceof Error;
}

/**
 * Check if value is null or undefined (monomorphic)
 * @inline
 */
export function isNullish(value: FormulaValue): value is null {
  return value === null || value === undefined;
}

/**
 * Check if value is an array (1D or 2D)
 * @inline
 */
export function isArray(value: FormulaValue): value is FormulaValue[] | FormulaValue[][] {
  return Array.isArray(value);
}

/**
 * Check if value is a 2D array
 */
export function is2DArray(value: FormulaValue): value is FormulaValue[][] {
  return Array.isArray(value) && value.length > 0 && Array.isArray(value[0]);
}

/**
 * Coerce value to number
 * Excel-compatible type coercion rules
 * 
 * Optimized for TurboFan:
 * - Fast path for numbers (inline cache)
 * - Predictable branches (branch predictor friendly)
 */
export function toNumber(value: FormulaValue): number | Error {
  // Fast path: already a number
  if (typeof value === 'number') {
    return isNaN(value) ? new Error('#VALUE!') : value;
  }

  // Boolean conversion
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  // String conversion
  if (typeof value === 'string') {
    if (value === '') return 0;
    const num = Number(value);
    return isNaN(num) ? new Error('#VALUE!') : num;
  }

  // Null conversion
  if (value === null || value === undefined) {
    return 0;
  }

  // Error passthrough
  if (value instanceof Error) {
    return value;
  }

  return new Error('#VALUE!');
}

/**
 * Coerce value to string
 * Excel-compatible type coercion rules
 */
export function toString(value: FormulaValue): string | Error {
  // Fast path: already a string
  if (typeof value === 'string') {
    return value;
  }

  // Number conversion
  if (typeof value === 'number') {
    return isNaN(value) ? '' : String(value);
  }

  // Boolean conversion
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }

  // Null conversion
  if (value === null || value === undefined) {
    return '';
  }

  // Error passthrough
  if (value instanceof Error) {
    return value;
  }

  // Array conversion
  if (Array.isArray(value)) {
    return new Error('#VALUE!');
  }

  return String(value);
}

/**
 * Coerce value to boolean
 * Excel-compatible type coercion rules
 */
export function toBoolean(value: FormulaValue): boolean | Error {
  // Fast path: already a boolean
  if (typeof value === 'boolean') {
    return value;
  }

  // Number conversion (non-zero is true)
  if (typeof value === 'number') {
    return value !== 0;
  }

  // String conversion
  if (typeof value === 'string') {
    const upper = value.toUpperCase();
    if (upper === 'TRUE') return true;
    if (upper === 'FALSE') return false;
    return new Error('#VALUE!');
  }

  // Null conversion
  if (value === null || value === undefined) {
    return false;
  }

  // Error passthrough
  if (value instanceof Error) {
    return value;
  }

  return new Error('#VALUE!');
}

/**
 * Compare two values for equality (Excel-compatible)
 * Case-insensitive for strings
 */
export function valuesEqual(a: FormulaValue, b: FormulaValue): boolean {
  // Same reference
  if (a === b) return true;

  // Type mismatch
  if (typeof a !== typeof b) return false;

  // String comparison (case-insensitive)
  if (typeof a === 'string' && typeof b === 'string') {
    return a.toUpperCase() === b.toUpperCase();
  }

  // Number comparison (NaN handling)
  if (typeof a === 'number' && typeof b === 'number') {
    if (isNaN(a) && isNaN(b)) return true;
    return a === b;
  }

  return a === b;
}

/**
 * Compare two values with Excel's comparison rules
 * Returns: -1 (a < b), 0 (a === b), 1 (a > b), or Error
 */
export function compareValues(a: FormulaValue, b: FormulaValue): number | Error {
  // Handle errors
  if (a instanceof Error) return a;
  if (b instanceof Error) return b;

  // Handle null
  const aNum = a === null ? 0 : a;
  const bNum = b === null ? 0 : b;

  // Both numbers
  if (typeof aNum === 'number' && typeof bNum === 'number') {
    if (isNaN(aNum as number) || isNaN(bNum as number)) {
      return new Error('#VALUE!');
    }
    return (aNum as number) < (bNum as number) ? -1 : (aNum as number) > (bNum as number) ? 1 : 0;
  }

  // Both strings (case-insensitive)
  if (typeof a === 'string' && typeof b === 'string') {
    const aUpper = a.toUpperCase();
    const bUpper = b.toUpperCase();
    return aUpper < bUpper ? -1 : aUpper > bUpper ? 1 : 0;
  }

  // Both booleans
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return (a ? 1 : 0) - (b ? 1 : 0);
  }

  // Mixed types: numbers < strings < booleans
  const aType = typeof a === 'number' ? 0 : typeof a === 'string' ? 1 : 2;
  const bType = typeof b === 'number' ? 0 : typeof b === 'string' ? 1 : 2;
  return aType < bType ? -1 : aType > bType ? 1 : 0;
}
