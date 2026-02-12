/**
 * math-metadata.ts
 * 
 * Wave 0 Day 2: Strict Metadata Backfill - Math & Trig Category
 * 
 * Classification Rules Applied:
 * - Complexity: Conservative (choose higher if unsure)
 * - Precision: Integer → EXACT, Floating → EXACT (IEEE 754), Financial → FINANCIAL
 * - ErrorStrategy: Never assume PROPAGATE_FIRST (check behavior)
 * - Volatile: Only RAND, RANDBETWEEN, NOW, TODAY
 * - IterationPolicy: Only for root-finding/convergence algorithms
 */

import { 
  FunctionCategory,
  ComplexityClass,
  PrecisionClass,
  ErrorStrategy,
  type StrictFunctionMetadata 
} from '../../types/formula-types';
import * as MathFunctions from '../math';

/**
 * Math & Trig Category: Strict Metadata
 * 
 * Total Functions: 40+
 * Complexity Distribution:
 * - O(1): 30+ (constants, single-value operations)
 * - O(n): 8 (aggregations: SUM, PRODUCT, SUMPRODUCT)
 * - O(n²): 1 (SUMPRODUCT with multiple arrays)
 * - ITERATIVE: 0 (none in this category)
 */

export const MATH_METADATA: StrictFunctionMetadata[] = [
  // ============================================================================
  // AGGREGATION FUNCTIONS (O(n))
  // ============================================================================
  
  {
    name: 'SUM',
    handler: MathFunctions.SUM,
    category: FunctionCategory.MATH,
    minArgs: 1,
    maxArgs: 255,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,      // Linear scan of all arguments
    precisionClass: PrecisionClass.EXACT,      // IEEE 754 floating-point (exact as defined)
    errorStrategy: ErrorStrategy.SKIP_ERRORS,  // SUM skips errors and text (Excel quirk)
    iterationPolicy: null,
  },
  
  {
    name: 'AVERAGE',
    handler: MathFunctions.AVERAGE,
    category: FunctionCategory.MATH,
    minArgs: 1,
    maxArgs: 255,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,      // Linear scan (sum + count)
    precisionClass: PrecisionClass.EXACT,      // Division is IEEE 754
    errorStrategy: ErrorStrategy.SKIP_ERRORS,  // AVERAGE skips errors (Excel quirk)
    iterationPolicy: null,
  },
  
  {
    name: 'AVERAGEA',
    handler: MathFunctions.AVERAGEA,
    category: FunctionCategory.MATH,
    minArgs: 1,
    maxArgs: 255,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.SKIP_ERRORS,  // Consistent with AVERAGE
    iterationPolicy: null,
  },
  
  {
    name: 'MIN',
    handler: MathFunctions.MIN,
    category: FunctionCategory.MATH,
    minArgs: 1,
    maxArgs: 255,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,      // Linear scan for minimum
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.SKIP_ERRORS,  // MIN skips errors
    iterationPolicy: null,
  },
  
  {
    name: 'MAX',
    handler: MathFunctions.MAX,
    category: FunctionCategory.MATH,
    minArgs: 1,
    maxArgs: 255,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,      // Linear scan for maximum
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.SKIP_ERRORS,  // MAX skips errors
    iterationPolicy: null,
  },
  
  {
    name: 'COUNT',
    handler: MathFunctions.COUNT,
    category: FunctionCategory.STATISTICAL,    // Excel categorizes as Statistical
    minArgs: 1,
    maxArgs: 255,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,
    precisionClass: PrecisionClass.EXACT,      // Integer count
    errorStrategy: ErrorStrategy.SKIP_ERRORS,  // COUNT skips errors
    iterationPolicy: null,
  },
  
  {
    name: 'COUNTA',
    handler: MathFunctions.COUNTA,
    category: FunctionCategory.STATISTICAL,
    minArgs: 1,
    maxArgs: 255,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,
    precisionClass: PrecisionClass.EXACT,      // Integer count
    errorStrategy: ErrorStrategy.SKIP_ERRORS,  // COUNTA skips errors
    iterationPolicy: null,
  },
  
  {
    name: 'PRODUCT',
    handler: MathFunctions.PRODUCT,
    category: FunctionCategory.MATH,
    minArgs: 1,
    maxArgs: 255,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,      // Linear multiplication
    precisionClass: PrecisionClass.EXACT,      // IEEE 754 (precision loss possible with large products)
    errorStrategy: ErrorStrategy.SKIP_ERRORS,  // PRODUCT skips errors
    iterationPolicy: null,
  },
  
  {
    name: 'SUMPRODUCT',
    handler: MathFunctions.SUMPRODUCT,
    category: FunctionCategory.MATH,
    minArgs: 1,
    maxArgs: 255,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,      // Single array: O(n), Multiple arrays: O(n) per element
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST, // SUMPRODUCT propagates errors
    iterationPolicy: null,
  },
  
  // ============================================================================
  // SINGLE-VALUE OPERATIONS (O(1))
  // ============================================================================
  
  {
    name: 'ABS',
    handler: MathFunctions.ABS,
    category: FunctionCategory.MATH,
    minArgs: 1,
    maxArgs: 1,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,      // Constant time
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'SIGN',
    handler: MathFunctions.SIGN,
    category: FunctionCategory.MATH,
    minArgs: 1,
    maxArgs: 1,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,      // Returns -1, 0, or 1 (integer)
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'SQRT',
    handler: MathFunctions.SQRT,
    category: FunctionCategory.MATH,
    minArgs: 1,
    maxArgs: 1,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,      // Hardware-accelerated
    precisionClass: PrecisionClass.EXACT,      // IEEE 754 sqrt
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'SQRTPI',
    handler: MathFunctions.SQRTPI,
    category: FunctionCategory.MATH,
    minArgs: 1,
    maxArgs: 1,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,      // sqrt(n * π)
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'POWER',
    handler: MathFunctions.POWER,
    category: FunctionCategory.MATH,
    minArgs: 2,
    maxArgs: 2,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,      // Math.pow is O(1) for most cases
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'EXP',
    handler: MathFunctions.EXP,
    category: FunctionCategory.MATH,
    minArgs: 1,
    maxArgs: 1,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,      // Hardware-accelerated
    precisionClass: PrecisionClass.EXACT,      // IEEE 754 exp
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'LN',
    handler: MathFunctions.LN,
    category: FunctionCategory.MATH,
    minArgs: 1,
    maxArgs: 1,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,      // Natural log (hardware)
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'LOG',
    handler: MathFunctions.LOG,
    category: FunctionCategory.MATH,
    minArgs: 1,
    maxArgs: 2,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,      // Log with base (2 log operations)
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'LOG10',
    handler: MathFunctions.LOG10,
    category: FunctionCategory.MATH,
    minArgs: 1,
    maxArgs: 1,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'MOD',
    handler: MathFunctions.MOD,
    category: FunctionCategory.MATH,
    minArgs: 2,
    maxArgs: 2,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,      // Modulo operation
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'PI',
    handler: MathFunctions.PI,
    category: FunctionCategory.MATH,
    minArgs: 0,
    maxArgs: 0,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,      // Constant return
    precisionClass: PrecisionClass.EXACT,      // Math.PI constant
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  // ============================================================================
  // VOLATILE FUNCTIONS (RANDOM)
  // ============================================================================
  
  {
    name: 'RAND',
    handler: MathFunctions.RAND,
    category: FunctionCategory.MATH,
    minArgs: 0,
    maxArgs: 0,
    isSpecial: false,
    needsContext: false,
    volatile: true,                             // ⚠️ VOLATILE: Recalc every time
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,       // Pseudo-random (deterministic algorithm)
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'RANDBETWEEN',
    handler: MathFunctions.RANDBETWEEN,
    category: FunctionCategory.MATH,
    minArgs: 2,
    maxArgs: 2,
    isSpecial: false,
    needsContext: false,
    volatile: true,                             // ⚠️ VOLATILE: Recalc every time
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,       // Integer random
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  // ============================================================================
  // TRIGONOMETRIC FUNCTIONS (O(1))
  // ============================================================================
  
  {
    name: 'SIN',
    handler: MathFunctions.SIN,
    category: FunctionCategory.MATH,
    minArgs: 1,
    maxArgs: 1,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,      // Hardware-accelerated
    precisionClass: PrecisionClass.EXACT,      // IEEE 754 trig
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'COS',
    handler: MathFunctions.COS,
    category: FunctionCategory.MATH,
    minArgs: 1,
    maxArgs: 1,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'TAN',
    handler: MathFunctions.TAN,
    category: FunctionCategory.MATH,
    minArgs: 1,
    maxArgs: 1,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'ASIN',
    handler: MathFunctions.ASIN,
    category: FunctionCategory.MATH,
    minArgs: 1,
    maxArgs: 1,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'ACOS',
    handler: MathFunctions.ACOS,
    category: FunctionCategory.MATH,
    minArgs: 1,
    maxArgs: 1,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'ATAN',
    handler: MathFunctions.ATAN,
    category: FunctionCategory.MATH,
    minArgs: 1,
    maxArgs: 1,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'ATAN2',
    handler: MathFunctions.ATAN2,
    category: FunctionCategory.MATH,
    minArgs: 2,
    maxArgs: 2,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'DEGREES',
    handler: MathFunctions.DEGREES,
    category: FunctionCategory.MATH,
    minArgs: 1,
    maxArgs: 1,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,      // Simple multiplication
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'RADIANS',
    handler: MathFunctions.RADIANS,
    category: FunctionCategory.MATH,
    minArgs: 1,
    maxArgs: 1,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,      // Simple multiplication
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  // ============================================================================
  // ROUNDING FUNCTIONS (O(1))
  // ============================================================================
  
  {
    name: 'ROUND',
    handler: MathFunctions.ROUND,
    category: FunctionCategory.MATH,
    minArgs: 2,
    maxArgs: 2,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,      // Rounding is deterministic (Excel uses round half away from zero)
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'ROUNDUP',
    handler: MathFunctions.ROUNDUP,
    category: FunctionCategory.MATH,
    minArgs: 2,
    maxArgs: 2,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'ROUNDDOWN',
    handler: MathFunctions.ROUNDDOWN,
    category: FunctionCategory.MATH,
    minArgs: 2,
    maxArgs: 2,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'TRUNC',
    handler: MathFunctions.TRUNC,
    category: FunctionCategory.MATH,
    minArgs: 1,
    maxArgs: 2,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'INT',
    handler: MathFunctions.INT,
    category: FunctionCategory.MATH,
    minArgs: 1,
    maxArgs: 1,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,      // Floor operation (returns integer)
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'CEILING',
    handler: MathFunctions.CEILING,
    category: FunctionCategory.MATH,
    minArgs: 1,
    maxArgs: 2,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'CEILING.MATH',
    handler: MathFunctions.CEILING_MATH,
    category: FunctionCategory.MATH,
    minArgs: 1,
    maxArgs: 3,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'FLOOR',
    handler: MathFunctions.FLOOR,
    category: FunctionCategory.MATH,
    minArgs: 1,
    maxArgs: 2,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'FLOOR.MATH',
    handler: MathFunctions.FLOOR_MATH,
    category: FunctionCategory.MATH,
    minArgs: 1,
    maxArgs: 3,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'MROUND',
    handler: MathFunctions.MROUND,
    category: FunctionCategory.MATH,
    minArgs: 2,
    maxArgs: 2,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  // ============================================================================
  // INTEGER MATH (O(n) for GCD/LCM, O(1) for others)
  // ============================================================================
  
  {
    name: 'GCD',
    handler: MathFunctions.GCD,
    category: FunctionCategory.MATH,
    minArgs: 1,
    maxArgs: 255,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,      // Euclidean algorithm for each pair
    precisionClass: PrecisionClass.EXACT,      // Integer math (exact)
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'LCM',
    handler: MathFunctions.LCM,
    category: FunctionCategory.MATH,
    minArgs: 1,
    maxArgs: 255,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,      // LCM uses GCD internally
    precisionClass: PrecisionClass.EXACT,      // Integer math (exact)
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'FACT',
    handler: MathFunctions.FACT,
    category: FunctionCategory.MATH,
    minArgs: 1,
    maxArgs: 1,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,      // n multiplications (where n is input value, not array size)
    precisionClass: PrecisionClass.EXACT,      // IEEE 754 for large factorials (will overflow)
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'COMBIN',
    handler: MathFunctions.COMBIN,
    category: FunctionCategory.MATH,
    minArgs: 2,
    maxArgs: 2,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,      // Combinatorial calculation (n! / (k! * (n-k)!))
    precisionClass: PrecisionClass.EXACT,      // Integer result (may overflow)
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'MULTINOMIAL',
    handler: MathFunctions.MULTINOMIAL,
    category: FunctionCategory.MATH,
    minArgs: 1,
    maxArgs: 255,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,      // Multinomial coefficient
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'QUOTIENT',
    handler: MathFunctions.QUOTIENT,
    category: FunctionCategory.MATH,
    minArgs: 2,
    maxArgs: 2,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,      // Integer division
    precisionClass: PrecisionClass.EXACT,      // Returns integer quotient
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  // ============================================================================
  // SPECIALIZED AGGREGATIONS (O(n))
  // ============================================================================
  
  {
    name: 'SUMX2MY2',
    handler: MathFunctions.SUMX2MY2,
    category: FunctionCategory.MATH,
    minArgs: 2,
    maxArgs: 2,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,      // Sum of (x² - y²)
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'SUMX2PY2',
    handler: MathFunctions.SUMX2PY2,
    category: FunctionCategory.MATH,
    minArgs: 2,
    maxArgs: 2,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,      // Sum of (x² + y²)
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'SUMXMY2',
    handler: MathFunctions.SUMXMY2,
    category: FunctionCategory.MATH,
    minArgs: 2,
    maxArgs: 2,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,      // Sum of (x - y)²
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'AGGREGATE',
    handler: MathFunctions.AGGREGATE,
    category: FunctionCategory.MATH,
    minArgs: 3,
    maxArgs: 255,
    isSpecial: true,                            // ⚠️ SPECIAL: Multiple aggregation modes
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N_LOG_N, // Some modes sort (MEDIAN, PERCENTILE)
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.SKIP_ERRORS,  // AGGREGATE can skip errors based on mode
    iterationPolicy: null,
  },
  
  {
    name: 'SUBTOTAL',
    handler: MathFunctions.SUBTOTAL,
    category: FunctionCategory.MATH,
    minArgs: 2,
    maxArgs: 255,
    isSpecial: true,                            // ⚠️ SPECIAL: Multiple aggregation modes
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,      // Linear aggregation (no sorting)
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.SKIP_ERRORS,  // SUBTOTAL can skip hidden rows/errors
    iterationPolicy: null,
  },
];
