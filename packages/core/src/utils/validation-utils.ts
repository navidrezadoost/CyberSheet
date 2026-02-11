/**
 * validation-utils.ts
 * 
 * Validation utilities for formula engine.
 * Fast validation checks with early returns for performance.
 */

import type { FormulaValue } from '../types/formula-types';
import { isNumber, isString, isError } from './type-utils';

/**
 * Validate number of arguments
 */
export function validateArgCount(
  args: FormulaValue[],
  min: number,
  max?: number
): Error | null {
  if (args.length < min) {
    return new Error('#VALUE!');
  }

  if (max !== undefined && args.length > max) {
    return new Error('#VALUE!');
  }

  return null;
}

/**
 * Validate all arguments are numbers
 */
export function validateAllNumbers(args: FormulaValue[]): Error | null {
  for (let i = 0; i < args.length; i++) {
    if (!isNumber(args[i]) && !isError(args[i])) {
      return new Error('#VALUE!');
    }
    if (isError(args[i])) {
      return args[i] as Error;
    }
  }
  return null;
}

/**
 * Validate all arguments are strings
 */
export function validateAllStrings(args: FormulaValue[]): Error | null {
  for (let i = 0; i < args.length; i++) {
    if (!isString(args[i]) && !isError(args[i])) {
      return new Error('#VALUE!');
    }
    if (isError(args[i])) {
      return args[i] as Error;
    }
  }
  return null;
}

/**
 * Validate range bounds
 */
export function validateRange(
  value: number,
  min: number,
  max: number
): Error | null {
  if (value < min || value > max) {
    return new Error('#NUM!');
  }
  return null;
}

/**
 * Validate non-zero (for division)
 */
export function validateNonZero(value: number): Error | null {
  if (value === 0) {
    return new Error('#DIV/0!');
  }
  return null;
}

/**
 * Validate positive number
 */
export function validatePositive(value: number): Error | null {
  if (value <= 0) {
    return new Error('#NUM!');
  }
  return null;
}

/**
 * Validate integer
 */
export function validateInteger(value: number): Error | null {
  if (!Number.isInteger(value)) {
    return new Error('#NUM!');
  }
  return null;
}

/**
 * Check for circular reference
 */
export function checkCircularReference(
  cellKey: string,
  visited: Set<string>
): Error | null {
  if (visited.has(cellKey)) {
    return new Error('#CIRC!');
  }
  return null;
}

/**
 * Validate recursion depth
 */
export function validateRecursionDepth(
  depth: number,
  maxDepth: number = 100
): Error | null {
  if (depth > maxDepth) {
    return new Error('#CIRC!');
  }
  return null;
}

/**
 * Find first error in array
 */
export function findFirstError(args: FormulaValue[]): Error | null {
  for (let i = 0; i < args.length; i++) {
    if (isError(args[i])) {
      return args[i] as Error;
    }
  }
  return null;
}
