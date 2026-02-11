/**
 * logical-functions.ts
 * 
 * Logical formula functions.
 * Excel-compatible boolean operations.
 */

import type { FormulaFunction, FormulaValue } from '../../types/formula-types';
import { toBoolean } from '../../utils/type-utils';

/**
 * IF - Conditional value
 * Note: Special handling in engine for lazy evaluation
 */
export const IF: FormulaFunction = (condition, trueValue, falseValue) => {
  return condition ? trueValue : falseValue;
};

/**
 * AND - Logical AND
 */
export const AND: FormulaFunction = (...args) => {
  const flatten = (arr: FormulaValue[]): FormulaValue[] => {
    const result: FormulaValue[] = [];
    for (const item of arr) {
      if (Array.isArray(item)) {
        result.push(...flatten(item));
      } else {
        result.push(item);
      }
    }
    return result;
  };

  const values = flatten(args);

  for (const val of values) {
    const bool = toBoolean(val);
    if (bool instanceof Error) return bool;
    if (!bool) return false;
  }

  return true;
};

/**
 * OR - Logical OR
 */
export const OR: FormulaFunction = (...args) => {
  const flatten = (arr: FormulaValue[]): FormulaValue[] => {
    const result: FormulaValue[] = [];
    for (const item of arr) {
      if (Array.isArray(item)) {
        result.push(...flatten(item));
      } else {
        result.push(item);
      }
    }
    return result;
  };

  const values = flatten(args);

  for (const val of values) {
    const bool = toBoolean(val);
    if (bool instanceof Error) return bool;
    if (bool) return true;
  }

  return false;
};

/**
 * NOT - Logical NOT
 */
export const NOT: FormulaFunction = (value) => {
  const bool = toBoolean(value);
  if (bool instanceof Error) return bool;
  return !bool;
};

/**
 * XOR - Exclusive OR
 */
export const XOR: FormulaFunction = (...args) => {
  const flatten = (arr: FormulaValue[]): FormulaValue[] => {
    const result: FormulaValue[] = [];
    for (const item of arr) {
      if (Array.isArray(item)) {
        result.push(...flatten(item));
      } else {
        result.push(item);
      }
    }
    return result;
  };

  const values = flatten(args);
  let trueCount = 0;

  for (const val of values) {
    const bool = toBoolean(val);
    if (bool instanceof Error) return bool;
    if (bool) trueCount++;
  }

  return trueCount % 2 === 1;
};

/**
 * TRUE - Returns TRUE
 */
export const TRUE: FormulaFunction = () => {
  return true;
};

/**
 * FALSE - Returns FALSE
 */
export const FALSE: FormulaFunction = () => {
  return false;
};

/**
 * NA - Returns #N/A error
 * Used to indicate that a value is not available
 */
export const NA: FormulaFunction = () => {
  return new Error('#N/A');
};

/**
 * IFERROR - Return value if no error, else return error value
 */
export const IFERROR: FormulaFunction = (value, valueIfError) => {
  return value instanceof Error ? valueIfError : value;
};

/**
 * IFNA - Return value if not #N/A, else return NA value
 */
export const IFNA: FormulaFunction = (value, valueIfNA) => {
  if (value instanceof Error && value.message === '#N/A') {
    return valueIfNA;
  }
  return value;
};

/**
 * IFS - Multiple IF conditions
 */
export const IFS: FormulaFunction = (...args) => {
  if (args.length % 2 !== 0) {
    return new Error('#N/A');
  }

  for (let i = 0; i < args.length; i += 2) {
    const condition = toBoolean(args[i]);
    if (condition instanceof Error) return condition;

    if (condition) {
      return args[i + 1];
    }
  }

  return new Error('#N/A');
};

/**
 * SWITCH - Switch case statement
 */
export const SWITCH: FormulaFunction = (expression, ...args) => {
  if (args.length < 2) return new Error('#N/A');

  // Check for default value (odd number of args means last is default)
  const hasDefault = args.length % 2 === 1;
  const defaultValue = hasDefault ? args[args.length - 1] : new Error('#N/A');
  const pairsCount = hasDefault ? args.length - 1 : args.length;

  for (let i = 0; i < pairsCount; i += 2) {
    if (expression === args[i]) {
      return args[i + 1];
    }
  }

  return defaultValue;
};

/**
 * ISERROR - Check if value is any error
 * Returns TRUE if value is any error (#N/A, #VALUE!, #REF!, #DIV/0!, #NUM!, #NAME?, #NULL!)
 */
export const ISERROR: FormulaFunction = (value) => {
  return value instanceof Error;
};

/**
 * ISERR - Check if value is any error except #N/A
 * Returns TRUE for errors like #VALUE!, #REF!, #DIV/0!, #NUM!, #NAME?, #NULL!
 * Returns FALSE for #N/A
 */
export const ISERR: FormulaFunction = (value) => {
  if (!(value instanceof Error)) return false;
  return value.message !== '#N/A';
};

/**
 * ISNA - Check if value is #N/A error
 * Returns TRUE only for #N/A errors
 */
export const ISNA: FormulaFunction = (value) => {
  return value instanceof Error && value.message === '#N/A';
};

/**
 * ISEVEN - Check if number is even
 * Returns TRUE if value is even, FALSE if odd
 * Returns #VALUE! if value is not numeric
 */
export const ISEVEN: FormulaFunction = (value) => {
  // Handle arrays - return first element
  if (Array.isArray(value)) {
    if (value.length === 0) return new Error('#VALUE!');
    value = value[0];
  }

  // Handle errors
  if (value instanceof Error) return value;

  // Convert to number
  const num = typeof value === 'number' ? value : Number(value);
  
  // Check if valid number
  if (isNaN(num)) return new Error('#VALUE!');
  
  // Truncate to integer and check if even
  const intValue = Math.trunc(num);
  return intValue % 2 === 0;
};

/**
 * ISODD - Check if number is odd
 * Returns TRUE if value is odd, FALSE if even
 * Returns #VALUE! if value is not numeric
 */
export const ISODD: FormulaFunction = (value) => {
  // Handle arrays - return first element
  if (Array.isArray(value)) {
    if (value.length === 0) return new Error('#VALUE!');
    value = value[0];
  }

  // Handle errors
  if (value instanceof Error) return value;

  // Convert to number
  const num = typeof value === 'number' ? value : Number(value);
  
  // Check if valid number
  if (isNaN(num)) return new Error('#VALUE!');
  
  // Truncate to integer and check if odd
  const intValue = Math.trunc(num);
  return Math.abs(intValue % 2) === 1;
};
