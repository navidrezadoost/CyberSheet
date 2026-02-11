/**
 * math-functions.ts
 * 
 * Mathematical formula functions.
 * All functions follow Excel semantics and return FormulaValue.
 */

import type { FormulaFunction, FormulaValue } from '../../types/formula-types';
import { filterNumbers } from '../../utils/array-utils';
import { toNumber } from '../../utils/type-utils';
import { validateArgCount, validateNonZero, validatePositive } from '../../utils/validation-utils';

/**
 * SUM - Sum of all numbers
 */
export const SUM: FormulaFunction = (...args) => {
  const numbers = filterNumbers(args);
  return numbers.reduce((sum, n) => sum + n, 0);
};

/**
 * AVERAGE - Average of all numbers
 * Only counts numeric values, ignoring text and logical values.
 * 
 * @example
 * =AVERAGE(1, 2, 3, 4, 5) → 3
 * =AVERAGE({10, 20, "text", TRUE}) → 15 (ignores text and TRUE)
 */
export const AVERAGE: FormulaFunction = (...args) => {
  const numbers = filterNumbers(args);
  if (numbers.length === 0) return new Error('#DIV/0!');
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
};

/**
 * AVERAGEA - Average of all values (text/logical count as 0)
 * Unlike AVERAGE, counts text and logical values as 0.
 * 
 * @example
 * =AVERAGEA(1, 2, 3) → 2
 * =AVERAGEA(10, 20, "text") → 10 (text counts as 0: (10+20+0)/3)
 * =AVERAGEA(10, 20, TRUE, FALSE) → 7.75 (TRUE=1, FALSE=0: (10+20+1+0)/4)
 */
export const AVERAGEA: FormulaFunction = (...args) => {
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

  const values = flatten(args).filter(v => v != null && !(v instanceof Error));
  
  if (values.length === 0) return new Error('#DIV/0!');
  
  let sum = 0;
  for (const val of values) {
    if (typeof val === 'number') {
      sum += val;
    } else if (typeof val === 'boolean') {
      sum += val ? 1 : 0;
    } else if (typeof val === 'string') {
      // Text counts as 0
      sum += 0;
    }
  }
  
  return sum / values.length;
};

/**
 * MIN - Minimum value
 */
export const MIN: FormulaFunction = (...args) => {
  const numbers = filterNumbers(args);
  if (numbers.length === 0) return new Error('#NUM!');
  return Math.min(...numbers);
};

/**
 * MAX - Maximum value
 */
export const MAX: FormulaFunction = (...args) => {
  const numbers = filterNumbers(args);
  if (numbers.length === 0) return new Error('#NUM!');
  return Math.max(...numbers);
};

/**
 * COUNT - Count of numeric values
 */
export const COUNT: FormulaFunction = (...args) => {
  return filterNumbers(args).length;
};

/**
 * COUNTA - Count of non-empty values
 */
export const COUNTA: FormulaFunction = (...args) => {
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

  return flatten(args).filter(v => v != null).length;
};

/**
 * ABS - Absolute value
 */
export const ABS: FormulaFunction = (value) => {
  const num = toNumber(value);
  if (num instanceof Error) return num;
  return Math.abs(num);
};

/**
 * ROUND - Round to specified digits
 */
export const ROUND: FormulaFunction = (value, digits) => {
  const num = toNumber(value);
  const dig = toNumber(digits);

  if (num instanceof Error) return num;
  if (dig instanceof Error) return dig;

  const factor = Math.pow(10, dig);
  return Math.round(num * factor) / factor;
};

/**
 * ROUNDUP - Round up (away from zero)
 */
export const ROUNDUP: FormulaFunction = (value, digits) => {
  const num = toNumber(value);
  const dig = toNumber(digits);

  if (num instanceof Error) return num;
  if (dig instanceof Error) return dig;

  const factor = Math.pow(10, dig);
  return Math.ceil(num * factor) / factor;
};

/**
 * ROUNDDOWN - Round down (toward zero)
 */
export const ROUNDDOWN: FormulaFunction = (value, digits) => {
  const num = toNumber(value);
  const dig = toNumber(digits);

  if (num instanceof Error) return num;
  if (dig instanceof Error) return dig;

  const factor = Math.pow(10, dig);
  return Math.floor(num * factor) / factor;
};

/**
 * SQRT - Square root
 */
export const SQRT: FormulaFunction = (value) => {
  const num = toNumber(value);

  if (num instanceof Error) return num;
  if (num < 0) return new Error('#NUM!');

  return Math.sqrt(num);
};

/**
 * POWER - Raise to power
 */
export const POWER: FormulaFunction = (base, exponent) => {
  const b = toNumber(base);
  const e = toNumber(exponent);

  if (b instanceof Error) return b;
  if (e instanceof Error) return e;

  const result = Math.pow(b, e);
  return isNaN(result) ? new Error('#NUM!') : result;
};

/**
 * EXP - e raised to power
 */
export const EXP: FormulaFunction = (value) => {
  const num = toNumber(value);
  if (num instanceof Error) return num;
  return Math.exp(num);
};

/**
 * LN - Natural logarithm
 */
export const LN: FormulaFunction = (value) => {
  const num = toNumber(value);
  if (num instanceof Error) return num;

  const error = validatePositive(num);
  if (error) return error;

  return Math.log(num);
};

/**
 * LOG - Logarithm with base
 */
export const LOG: FormulaFunction = (value, base = 10) => {
  const num = toNumber(value);
  const b = toNumber(base);

  if (num instanceof Error) return num;
  if (b instanceof Error) return b;

  const error = validatePositive(num) || validatePositive(b);
  if (error) return error;

  return Math.log(num) / Math.log(b);
};

/**
 * LOG10 - Base-10 logarithm
 */
export const LOG10: FormulaFunction = (value) => {
  const num = toNumber(value);
  if (num instanceof Error) return num;

  const error = validatePositive(num);
  if (error) return error;

  return Math.log10(num);
};

/**
 * MOD - Modulo operation
 */
export const MOD: FormulaFunction = (dividend, divisor) => {
  const num = toNumber(dividend);
  const div = toNumber(divisor);

  if (num instanceof Error) return num;
  if (div instanceof Error) return div;

  const error = validateNonZero(div);
  if (error) return error;

  return num % div;
};

/**
 * PI - Returns π
 */
export const PI: FormulaFunction = () => {
  return Math.PI;
};

/**
 * RAND - Random number between 0 and 1
 */
export const RAND: FormulaFunction = () => {
  return Math.random();
};

/**
 * RANDBETWEEN - Random integer between two numbers
 */
export const RANDBETWEEN: FormulaFunction = (bottom, top) => {
  // Check for missing arguments
  if (bottom === undefined || top === undefined) {
    return new Error('#VALUE!');
  }
  
  const b = toNumber(bottom);
  const t = toNumber(top);

  if (b instanceof Error) return b;
  if (t instanceof Error) return t;

  const min = Math.ceil(b);
  const max = Math.floor(t);

  if (min > max) return new Error('#NUM!');

  return Math.floor(Math.random() * (max - min + 1) + min);
};

/**
 * SIN - Sine (radians)
 */
export const SIN: FormulaFunction = (value) => {
  const num = toNumber(value);
  if (num instanceof Error) return num;
  return Math.sin(num);
};

/**
 * COS - Cosine (radians)
 */
export const COS: FormulaFunction = (value) => {
  const num = toNumber(value);
  if (num instanceof Error) return num;
  return Math.cos(num);
};

/**
 * TAN - Tangent (radians)
 */
export const TAN: FormulaFunction = (value) => {
  const num = toNumber(value);
  if (num instanceof Error) return num;
  return Math.tan(num);
};

/**
 * ASIN - Arcsine
 */
export const ASIN: FormulaFunction = (value) => {
  const num = toNumber(value);
  if (num instanceof Error) return num;
  if (num < -1 || num > 1) return new Error('#NUM!');
  return Math.asin(num);
};

/**
 * ACOS - Arccosine
 */
export const ACOS: FormulaFunction = (value) => {
  const num = toNumber(value);
  if (num instanceof Error) return num;
  if (num < -1 || num > 1) return new Error('#NUM!');
  return Math.acos(num);
};

/**
 * ATAN - Arctangent
 */
export const ATAN: FormulaFunction = (value) => {
  const num = toNumber(value);
  if (num instanceof Error) return num;
  return Math.atan(num);
};

/**
 * ATAN2 - Arctangent from x and y coordinates
 */
export const ATAN2: FormulaFunction = (x, y) => {
  const xNum = toNumber(x);
  const yNum = toNumber(y);

  if (xNum instanceof Error) return xNum;
  if (yNum instanceof Error) return yNum;

  return Math.atan2(yNum, xNum);
};

/**
 * DEGREES - Convert radians to degrees
 */
export const DEGREES: FormulaFunction = (value) => {
  const num = toNumber(value);
  if (num instanceof Error) return num;
  return (num * 180) / Math.PI;
};

/**
 * RADIANS - Convert degrees to radians
 */
export const RADIANS: FormulaFunction = (value) => {
  const num = toNumber(value);
  if (num instanceof Error) return num;
  return (num * Math.PI) / 180;
};

/**
 * SIGN - Sign of number (-1, 0, or 1)
 */
export const SIGN: FormulaFunction = (value) => {
  const num = toNumber(value);
  if (num instanceof Error) return num;
  return Math.sign(num);
};

/**
 * TRUNC - Truncate to integer
 */
export const TRUNC: FormulaFunction = (value, digits = 0) => {
  const num = toNumber(value);
  const dig = toNumber(digits);

  if (num instanceof Error) return num;
  if (dig instanceof Error) return dig;

  const factor = Math.pow(10, dig);
  return Math.trunc(num * factor) / factor;
};

/**
 * INT - Round down to nearest integer
 */
export const INT: FormulaFunction = (value) => {
  const num = toNumber(value);
  if (num instanceof Error) return num;
  return Math.floor(num);
};

/**
 * CEILING - Round up to nearest multiple
 */
export const CEILING: FormulaFunction = (value, significance = 1) => {
  const num = toNumber(value);
  const sig = toNumber(significance);

  if (num instanceof Error) return num;
  if (sig instanceof Error) return sig;

  const error = validateNonZero(sig);
  if (error) return error;

  return Math.ceil(num / sig) * sig;
};

/**
 * FLOOR - Round down to nearest multiple
 */
export const FLOOR: FormulaFunction = (value, significance = 1) => {
  const num = toNumber(value);
  const sig = toNumber(significance);

  if (num instanceof Error) return num;
  if (sig instanceof Error) return sig;

  const error = validateNonZero(sig);
  if (error) return error;

  return Math.floor(num / sig) * sig;
};

/**
 * GCD - Greatest common divisor
 */
export const GCD: FormulaFunction = (...args) => {
  const numbers = filterNumbers(args).map(Math.abs).map(Math.floor);

  if (numbers.length === 0) return new Error('#VALUE!');

  const gcdTwo = (a: number, b: number): number => {
    return b === 0 ? a : gcdTwo(b, a % b);
  };

  return numbers.reduce(gcdTwo);
};

/**
 * LCM - Least common multiple
 */
export const LCM: FormulaFunction = (...args) => {
  const numbers = filterNumbers(args).map(Math.abs).map(Math.floor);

  if (numbers.length === 0) return new Error('#VALUE!');

  const gcdTwo = (a: number, b: number): number => {
    return b === 0 ? a : gcdTwo(b, a % b);
  };

  const lcmTwo = (a: number, b: number): number => {
    return (a * b) / gcdTwo(a, b);
  };

  return numbers.reduce(lcmTwo);
};

/**
 * FACT - Factorial
 */
export const FACT: FormulaFunction = (value) => {
  const num = toNumber(value);

  if (num instanceof Error) return num;
  if (num < 0) return new Error('#NUM!');
  if (!Number.isInteger(num)) return new Error('#NUM!');

  let result = 1;
  for (let i = 2; i <= num; i++) {
    result *= i;
  }

  return result;
};

/**
 * COMBIN - Number of combinations
 */
export const COMBIN: FormulaFunction = (n, k) => {
  const nNum = toNumber(n);
  const kNum = toNumber(k);

  if (nNum instanceof Error) return nNum;
  if (kNum instanceof Error) return kNum;

  if (nNum < 0 || kNum < 0 || kNum > nNum) return new Error('#NUM!');

  // Use formula: C(n,k) = n! / (k! * (n-k)!)
  let result = 1;
  for (let i = 0; i < kNum; i++) {
    result *= (nNum - i) / (i + 1);
  }

  return Math.round(result);
};

/**
 * SUMPRODUCT - Sum of products
 */
export const SUMPRODUCT: FormulaFunction = (...args) => {
  if (args.length === 0) return new Error('#VALUE!');

  // All arrays must be same length
  const arrays = args.map(arg => {
    if (Array.isArray(arg)) return arg;
    return [arg];
  });

  const length = arrays[0].length;
  if (!arrays.every(arr => arr.length === length)) {
    return new Error('#VALUE!');
  }

  let sum = 0;
  for (let i = 0; i < length; i++) {
    let product = 1;
    for (const arr of arrays) {
      const val = toNumber(arr[i]);
      if (val instanceof Error) return val;
      product *= val;
    }
    sum += product;
  }

  return sum;
};

// ============================================================================
// Week 11 Day 2: Advanced Math Functions
// ============================================================================

/**
 * MROUND - Round to nearest multiple
 * 
 * Syntax: MROUND(number, multiple)
 * Rounds number to the nearest multiple of multiple
 * 
 * @example
 * =MROUND(10, 3) → 9 (nearest multiple of 3)
 * =MROUND(11, 3) → 12
 * =MROUND(-10, -3) → -9
 * =MROUND(1.3, 0.2) → 1.4
 */
export const MROUND: FormulaFunction = (number, multiple) => {
  const num = toNumber(number);
  const mult = toNumber(multiple);
  
  if (num instanceof Error) return num;
  if (mult instanceof Error) return mult;
  
  // Multiple cannot be zero
  if (mult === 0) return new Error('#NUM!');
  
  // If signs differ, return error
  if ((num >= 0 && mult < 0) || (num < 0 && mult >= 0)) {
    return new Error('#NUM!');
  }
  
  return Math.round(num / mult) * mult;
};

/**
 * QUOTIENT - Integer division
 * 
 * Syntax: QUOTIENT(numerator, denominator)
 * Returns the integer portion of a division
 * 
 * @example
 * =QUOTIENT(10, 3) → 3
 * =QUOTIENT(5, 2) → 2
 * =QUOTIENT(-10, 3) → -3
 */
export const QUOTIENT: FormulaFunction = (numerator, denominator) => {
  const num = toNumber(numerator);
  const denom = toNumber(denominator);
  
  if (num instanceof Error) return num;
  if (denom instanceof Error) return denom;
  
  if (denom === 0) return new Error('#DIV/0!');
  
  return Math.trunc(num / denom);
};

/**
 * PRODUCT - Multiply all numbers
 * 
 * Syntax: PRODUCT(number1, [number2], ...)
 * Multiplies all numbers together
 * 
 * @example
 * =PRODUCT(5, 2, 3) → 30
 * =PRODUCT({2, 3}, 4) → 24
 * =PRODUCT(0.5, 10) → 5
 */
export const PRODUCT: FormulaFunction = (...args) => {
  const numbers = filterNumbers(args);
  
  if (numbers.length === 0) return 0;
  
  return numbers.reduce((product, n) => product * n, 1);
};

/**
 * SQRTPI - Square root of (number * π)
 * 
 * Syntax: SQRTPI(number)
 * Returns the square root of (number * π)
 * 
 * @example
 * =SQRTPI(1) → 1.772... (√π)
 * =SQRTPI(2) → 2.507... (√(2π))
 * =SQRTPI(0) → 0
 */
export const SQRTPI: FormulaFunction = (number) => {
  const num = toNumber(number);
  
  if (num instanceof Error) return num;
  
  if (num < 0) return new Error('#NUM!');
  
  return Math.sqrt(num * Math.PI);
};

/**
 * MULTINOMIAL - Multinomial coefficient
 * 
 * Syntax: MULTINOMIAL(number1, [number2], ...)
 * Returns the multinomial: (sum of values)! / (value1! * value2! * ...)
 * 
 * @example
 * =MULTINOMIAL(2, 3, 4) → 1260 (9! / (2! * 3! * 4!))
 * =MULTINOMIAL(3, 3) → 20 (6! / (3! * 3!))
 */
export const MULTINOMIAL: FormulaFunction = (...args) => {
  const numbers = filterNumbers(args);
  
  if (numbers.length === 0) return new Error('#VALUE!');
  
  // All numbers must be non-negative integers
  for (const num of numbers) {
    if (num < 0 || !Number.isInteger(num)) {
      return new Error('#NUM!');
    }
  }
  
  // Calculate sum
  const sum = numbers.reduce((s, n) => s + n, 0);
  
  // Calculate factorial helper
  const factorial = (n: number): number => {
    if (n <= 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    return result;
  };
  
  // Calculate multinomial: sum! / (n1! * n2! * ... * nk!)
  let numerator = factorial(sum);
  let denominator = 1;
  
  for (const num of numbers) {
    denominator *= factorial(num);
  }
  
  return numerator / denominator;
};

/**
 * SUMX2MY2 - Sum of squared differences
 * 
 * Syntax: SUMX2MY2(array_x, array_y)
 * Returns the sum of the difference of squares: Σ(x² - y²)
 * 
 * @example
 * =SUMX2MY2({2, 3, 9}, {6, 5, 11}) → -88
 * // (2²-6²) + (3²-5²) + (9²-11²) = (4-36) + (9-25) + (81-121) = -32 + -16 + -40 = -88
 */
export const SUMX2MY2: FormulaFunction = (arrayX, arrayY) => {
  // Convert to arrays (same pattern as SUMPRODUCT)
  const xArr = Array.isArray(arrayX) ? arrayX : [arrayX];
  const yArr = Array.isArray(arrayY) ? arrayY : [arrayY];
  
  if (xArr.length !== yArr.length) {
    return new Error('#N/A');
  }
  
  let sum = 0;
  for (let i = 0; i < xArr.length; i++) {
    const x = toNumber(xArr[i]);
    const y = toNumber(yArr[i]);
    if (x instanceof Error) return x;
    if (y instanceof Error) return y;
    sum += (x * x) - (y * y);
  }
  
  return sum;
};

/**
 * SUMX2PY2 - Sum of sum of squares
 * 
 * Syntax: SUMX2PY2(array_x, array_y)
 * Returns the sum of the sum of squares: Σ(x² + y²)
 * 
 * @example
 * =SUMX2PY2({2, 3, 9}, {6, 5, 11}) → 276
 * // (2²+6²) + (3²+5²) + (9²+11²) = 40 + 34 + 202 = 276
 */
export const SUMX2PY2: FormulaFunction = (arrayX, arrayY) => {
  // Convert to arrays (same pattern as SUMPRODUCT)
  const xArr = Array.isArray(arrayX) ? arrayX : [arrayX];
  const yArr = Array.isArray(arrayY) ? arrayY : [arrayY];
  
  if (xArr.length !== yArr.length) {
    return new Error('#N/A');
  }
  
  let sum = 0;
  for (let i = 0; i < xArr.length; i++) {
    const x = toNumber(xArr[i]);
    const y = toNumber(yArr[i]);
    if (x instanceof Error) return x;
    if (y instanceof Error) return y;
    sum += (x * x) + (y * y);
  }
  
  return sum;
};

/**
 * SUMXMY2 - Sum of squared differences (alternative form)
 * 
 * Syntax: SUMXMY2(array_x, array_y)
 * Returns the sum of squares of differences: Σ(x - y)²
 * 
 * @example
 * =SUMXMY2({2, 3, 9}, {6, 5, 11}) → 24
 * // (2-6)² + (3-5)² + (9-11)² = 16 + 4 + 4 = 24
 */
export const SUMXMY2: FormulaFunction = (arrayX, arrayY) => {
  // Convert to arrays (same pattern as SUMPRODUCT)
  const xArr = Array.isArray(arrayX) ? arrayX : [arrayX];
  const yArr = Array.isArray(arrayY) ? arrayY : [arrayY];
  
  if (xArr.length !== yArr.length) {
    return new Error('#N/A');
  }
  
  let sum = 0;
  for (let i = 0; i < xArr.length; i++) {
    const x = toNumber(xArr[i]);
    const y = toNumber(yArr[i]);
    if (x instanceof Error) return x;
    if (y instanceof Error) return y;
    const diff = x - y;
    sum += diff * diff;
  }
  
  return sum;
};
