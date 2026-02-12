/**
 * logical-functions.ts
 * 
 * Logical formula functions.
 * Excel-compatible boolean operations.
 */

import type { FormulaFunction, FormulaValue } from '../../types/formula-types';
import { toBoolean } from '../../utils/type-utils';

/**
 * IF - Conditional value with lazy evaluation
 * 
 * Accepts thunks (zero-arg functions) to enable lazy evaluation.
 * Only the condition is evaluated first, then only the taken branch.
 * 
 * @param conditionThunk - Zero-arg function returning the condition to test
 * @param trueThunk - Zero-arg function returning value if condition is TRUE
 * @param falseThunk - Zero-arg function returning value if condition is FALSE
 * @returns The result of evaluating the taken branch
 */
export const IF: FormulaFunction = (
  conditionThunk: any,
  trueThunk: any,
  falseThunk: any
) => {
  // Evaluate condition thunk
  const conditionValue = typeof conditionThunk === 'function' 
    ? conditionThunk() 
    : conditionThunk;
  
  // Convert to boolean
  const condition = toBoolean(conditionValue);
  
  // If condition is an error, propagate immediately
  if (condition instanceof Error) {
    return condition;
  }
  
  // Evaluate only the taken branch
  if (condition) {
    return typeof trueThunk === 'function' ? trueThunk() : trueThunk;
  } else {
    return typeof falseThunk === 'function' ? falseThunk() : falseThunk;
  }
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
 * Phase 6: Thunk-aware implementation for lazy evaluation
 */
export const NOT: FormulaFunction = (valueThunk: any) => {
  // Evaluate value thunk (might be thunk or raw value)
  const value = typeof valueThunk === 'function' ? valueThunk() : valueThunk;
  
  // Convert to boolean
  const bool = toBoolean(value);
  
  // Propagate errors
  if (bool instanceof Error) return bool;
  
  // Return negation
  return !bool;
};

/**
 * XOR - Exclusive OR
 * Phase 6: Thunk-aware implementation for lazy evaluation
 * Note: XOR needs all values to compute result, so all thunks must be evaluated
 */
export const XOR: FormulaFunction = (...args: any[]) => {
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

  // Evaluate all argument thunks (XOR needs all values)
  const evaluatedArgs = args.map((arg: any) => 
    typeof arg === 'function' ? arg() : arg
  );

  const values = flatten(evaluatedArgs);
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
 * Phase 6: Thunk-aware implementation for lazy evaluation
 * Only evaluates fallback if value errors
 */
export const IFERROR: FormulaFunction = (
  valueThunk: any,
  fallbackThunk: any
) => {
  // Evaluate value thunk (might be thunk or raw value)
  let value: any;
  try {
    value = typeof valueThunk === 'function' ? valueThunk() : valueThunk;
  } catch (error) {
    // If value evaluation throws, treat as error and evaluate fallback
    return typeof fallbackThunk === 'function' ? fallbackThunk() : fallbackThunk;
  }

  // If value is an Error, evaluate fallback thunk
  if (value instanceof Error) {
    return typeof fallbackThunk === 'function' ? fallbackThunk() : fallbackThunk;
  }

  // No error - return value, never evaluate fallback
  return value;
};

/**
 * IFNA - Return value if not #N/A, else return NA value
 * Phase 6: Thunk-aware implementation for lazy evaluation
 * Only evaluates fallback if value is #N/A error
 */
export const IFNA: FormulaFunction = (
  valueThunk: any,
  fallbackThunk: any
) => {
  // Evaluate value thunk (might be thunk or raw value)
  let value: any;
  try {
    value = typeof valueThunk === 'function' ? valueThunk() : valueThunk;
  } catch (error) {
    // If value evaluation throws, check if it's #N/A
    if (error instanceof Error && error.message === '#N/A') {
      return typeof fallbackThunk === 'function' ? fallbackThunk() : fallbackThunk;
    }
    // Non-#N/A errors propagate without evaluating fallback
    throw error;
  }

  // If value is #N/A Error, evaluate fallback thunk
  if (value instanceof Error && value.message === '#N/A') {
    return typeof fallbackThunk === 'function' ? fallbackThunk() : fallbackThunk;
  }

  // Value is not #N/A (could be valid value or other error) - return as-is, never evaluate fallback
  return value;
};

/**
 * IFS - Multiple IF conditions
 * Phase 6: Thunk-aware implementation for lazy evaluation
 * Evaluates test thunks sequentially, stops at first TRUE, evaluates only that value thunk
 */
export const IFS: FormulaFunction = (...args: any[]) => {
  // Validate args: must have even number (test/value pairs)
  if (args.length % 2 !== 0) {
    return new Error('#N/A');
  }

  // Loop through test/value pairs
  for (let i = 0; i < args.length; i += 2) {
    const testThunk = args[i];
    const valueThunk = args[i + 1];

    // Evaluate test thunk (might be thunk or raw value)
    const testValue = typeof testThunk === 'function' ? testThunk() : testThunk;
    
    // Convert to boolean
    const condition = toBoolean(testValue);
    
    // If test evaluation errors, propagate immediately
    if (condition instanceof Error) return condition;

    // If test is TRUE: evaluate corresponding value thunk and return
    if (condition) {
      return typeof valueThunk === 'function' ? valueThunk() : valueThunk;
    }
    
    // Otherwise: continue to next test (don't evaluate this value thunk)
  }

  // No matching condition found
  return new Error('#N/A');
};

/**
 * SWITCH - Switch case statement
 * Phase 6: Thunk-aware implementation for lazy evaluation
 * Evaluates expression first, then case thunks sequentially, stops at first match
 */
export const SWITCH: FormulaFunction = (expressionThunk: any, ...args: any[]) => {
  if (args.length < 2) return new Error('#N/A');

  // Evaluate expression thunk (might be thunk or raw value)
  const expression = typeof expressionThunk === 'function' 
    ? expressionThunk() 
    : expressionThunk;

  // Check for default value (odd number of args means last is default)
  const hasDefault = args.length % 2 === 1;
  const defaultThunk = hasDefault ? args[args.length - 1] : null;
  const pairsCount = hasDefault ? args.length - 1 : args.length;

  // Loop through case/value pairs
  for (let i = 0; i < pairsCount; i += 2) {
    const caseThunk = args[i];
    const valueThunk = args[i + 1];

    // Evaluate case thunk (might be thunk or raw value)
    const caseValue = typeof caseThunk === 'function' ? caseThunk() : caseThunk;

    // If case matches expression: evaluate corresponding value thunk and return
    if (expression === caseValue) {
      return typeof valueThunk === 'function' ? valueThunk() : valueThunk;
    }

    // Otherwise: continue to next case (don't evaluate this value thunk)
  }

  // No matching case found - evaluate default or return #N/A
  if (hasDefault && defaultThunk !== null) {
    return typeof defaultThunk === 'function' ? defaultThunk() : defaultThunk;
  }

  return new Error('#N/A');
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
