/**
 * Statistical Functions - Strict Metadata
 * 
 * Wave 0 Day 2 - Category 9/9 (FINAL BOSS)
 * 
 * COMPLEXITY CLASSIFICATIONS:
 * - O(1): Direct formula calculations (distributions, transforms)
 * - O(n): Aggregations (STDEV, VAR, CORREL), conditional (COUNTIF, SUMIF)
 * - O(n log n): Sorting-based (MEDIAN, PERCENTILE, QUARTILE, RANK)
 * - O(n²): Regression analysis (LINEST, LOGEST matrix operations)
 * 
 * PRECISION CLASSIFICATIONS:
 * - STATISTICAL: ±1e-10 (aggregations, variance, correlation)
 * - ERF_LIMITED: ±1e-7 (distributions limited by error function approximations)
 * 
 * ERROR STRATEGY:
 * - SKIP_ERRORS: Aggregations (STDEV, VAR, AVERAGE derivatives)
 * - PROPAGATE_FIRST: Distributions, regression, transforms
 * 
 * SPECIAL NOTES:
 * - Distributions use ERF_LIMITED precision (erf/gamma approximations)
 * - Conditional functions (COUNTIF, SUMIF) use SKIP_ERRORS
 * - Regression functions (LINEST, LOGEST) are O(n²) due to matrix inversion
 * - Sorting-based functions (MEDIAN, PERCENTILE) are O(n log n)
 */

import {
  FunctionCategory,
  ComplexityClass,
  PrecisionClass,
  ErrorStrategy,
  type StrictFunctionMetadata,
} from '../../types/formula-types';
import * as StatisticalFunctions from '../statistical/statistical-functions';
import * as RegressionFunctions from '../statistical/regression-functions';

// Shared constants
const { O_1, O_N, O_N_LOG_N, O_N2, ITERATIVE } = ComplexityClass;
const { EXACT, STATISTICAL, ERF_LIMITED } = PrecisionClass;
const { PROPAGATE_FIRST, SKIP_ERRORS } = ErrorStrategy;

/**
 * ============================================================================
 * BATCH 1: AGGREGATION FUNCTIONS
 * ============================================================================
 * Standard deviation, variance, covariance, correlation
 * Complexity: O(n) - iterate over dataset
 * Precision: STATISTICAL (±1e-10)
 * ErrorStrategy: SKIP_ERRORS (like AVERAGE, ignore non-numeric)
 */

/**
 * STDEV - Sample Standard Deviation (legacy)
 * Alias for STDEV.S (n-1 divisor)
 * 
 * Complexity: O(n) - two passes (mean, then squared deviations)
 * Precision: STATISTICAL (±1e-10 due to floating point accumulation)
 * ErrorStrategy: SKIP_ERRORS (ignore non-numeric like AVERAGE)
 */
export const STDEV_METADATA: StrictFunctionMetadata = {
  name: 'STDEV',
  handler: StatisticalFunctions.STDEV,
  category: FunctionCategory.STATISTICAL,
  minArgs: 1,
  maxArgs: 255,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: STATISTICAL,
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * STDEV.S - Sample Standard Deviation
 * Uses n-1 divisor (unbiased estimator)
 * 
 * Complexity: O(n)
 * Formula: sqrt(sum((x - mean)²) / (n-1))
 */
export const STDEV_S_METADATA: StrictFunctionMetadata = {
  name: 'STDEV.S',
  handler: StatisticalFunctions.STDEV_S,
  category: FunctionCategory.STATISTICAL,
  minArgs: 1,
  maxArgs: 255,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: STATISTICAL,
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * STDEV.P - Population Standard Deviation
 * Uses n divisor (biased estimator)
 * 
 * Complexity: O(n)
 * Formula: sqrt(sum((x - mean)²) / n)
 */
export const STDEV_P_METADATA: StrictFunctionMetadata = {
  name: 'STDEV.P',
  handler: StatisticalFunctions.STDEV_P,
  category: FunctionCategory.STATISTICAL,
  minArgs: 1,
  maxArgs: 255,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: STATISTICAL,
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * VAR - Sample Variance (legacy)
 * Alias for VAR.S (n-1 divisor)
 * 
 * Complexity: O(n)
 * Precision: STATISTICAL (variance is squared deviation)
 */
export const VAR_METADATA: StrictFunctionMetadata = {
  name: 'VAR',
  handler: StatisticalFunctions.VAR,
  category: FunctionCategory.STATISTICAL,
  minArgs: 1,
  maxArgs: 255,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: STATISTICAL,
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * VAR.S - Sample Variance
 * Uses n-1 divisor (unbiased estimator)
 * 
 * Complexity: O(n)
 * Formula: sum((x - mean)²) / (n-1)
 */
export const VAR_S_METADATA: StrictFunctionMetadata = {
  name: 'VAR.S',
  handler: StatisticalFunctions.VAR_S,
  category: FunctionCategory.STATISTICAL,
  minArgs: 1,
  maxArgs: 255,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: STATISTICAL,
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * VAR.P - Population Variance
 * Uses n divisor (biased estimator)
 * 
 * Complexity: O(n)
 * Formula: sum((x - mean)²) / n
 */
export const VAR_P_METADATA: StrictFunctionMetadata = {
  name: 'VAR.P',
  handler: StatisticalFunctions.VAR_P,
  category: FunctionCategory.STATISTICAL,
  minArgs: 1,
  maxArgs: 255,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: STATISTICAL,
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * CORREL - Pearson Correlation Coefficient
 * Measures linear correlation between two datasets
 * 
 * Complexity: O(n) - iterate over both arrays
 * Formula: covariance(X,Y) / (stdev(X) * stdev(Y))
 * Precision: STATISTICAL (accumulated multiplication/division)
 * ErrorStrategy: PROPAGATE_FIRST (paired data integrity - errors would corrupt alignment)
 */
export const CORREL_METADATA: StrictFunctionMetadata = {
  name: 'CORREL',
  handler: StatisticalFunctions.CORREL,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: STATISTICAL,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

/**
 * PEARSON - Pearson Correlation Coefficient
 * Alias for CORREL
 * 
 * Complexity: O(n)
 * ErrorStrategy: PROPAGATE_FIRST (paired data integrity - errors would corrupt alignment)
 */
export const PEARSON_METADATA: StrictFunctionMetadata = {
  name: 'PEARSON',
  handler: StatisticalFunctions.PEARSON,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: STATISTICAL,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

/**
 * COVARIANCE.P - Population Covariance
 * Measures how two variables vary together (n divisor)
 * 
 * Complexity: O(n)
 * Formula: sum((x - mean_x) * (y - mean_y)) / n
 * ErrorStrategy: PROPAGATE_FIRST (paired data integrity - errors would corrupt alignment)
 */
export const COVARIANCE_P_METADATA: StrictFunctionMetadata = {
  name: 'COVARIANCE.P',
  handler: StatisticalFunctions.COVARIANCE_P,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: STATISTICAL,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

/**
 * COVARIANCE.S - Sample Covariance
 * Uses n-1 divisor (unbiased estimator)
 * 
 * Complexity: O(n)
 * Formula: sum((x - mean_x) * (y - mean_y)) / (n-1)
 * ErrorStrategy: PROPAGATE_FIRST (paired data integrity - errors would corrupt alignment)
 */
export const COVARIANCE_S_METADATA: StrictFunctionMetadata = {
  name: 'COVARIANCE.S',
  handler: StatisticalFunctions.COVARIANCE_S,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: STATISTICAL,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

/**
 * RSQ - R-squared (Coefficient of Determination)
 * Measures goodness of fit for linear regression
 * 
 * Complexity: O(n) - calculate correlation and square
 * Formula: CORREL(x,y)²
 * Precision: STATISTICAL (squared correlation)
 * ErrorStrategy: PROPAGATE_FIRST (paired data integrity - errors would corrupt alignment)
 */
export const RSQ_METADATA: StrictFunctionMetadata = {
  name: 'RSQ',
  handler: StatisticalFunctions.RSQ,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: STATISTICAL,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

/**
 * DEVSQ - Sum of Squared Deviations
 * Sum of squared differences from mean
 * 
 * Complexity: O(n)
 * Formula: sum((x - mean)²)
 */
export const DEVSQ_METADATA: StrictFunctionMetadata = {
  name: 'DEVSQ',
  handler: StatisticalFunctions.DEVSQ,
  category: FunctionCategory.STATISTICAL,
  minArgs: 1,
  maxArgs: 255,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: STATISTICAL,
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * AVEDEV - Average Absolute Deviation
 * Average of absolute deviations from mean
 * 
 * Complexity: O(n)
 * Formula: sum(|x - mean|) / n
 */
export const AVEDEV_METADATA: StrictFunctionMetadata = {
  name: 'AVEDEV',
  handler: StatisticalFunctions.AVEDEV,
  category: FunctionCategory.STATISTICAL,
  minArgs: 1,
  maxArgs: 255,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: STATISTICAL,
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * GEOMEAN - Geometric Mean
 * nth root of product of n numbers
 * 
 * Complexity: O(n)
 * Formula: (x1 * x2 * ... * xn)^(1/n)
 * Implementation: exp(sum(ln(x)) / n) to avoid overflow
 */
export const GEOMEAN_METADATA: StrictFunctionMetadata = {
  name: 'GEOMEAN',
  handler: StatisticalFunctions.GEOMEAN,
  category: FunctionCategory.STATISTICAL,
  minArgs: 1,
  maxArgs: 255,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: STATISTICAL,
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * HARMEAN - Harmonic Mean
 * Reciprocal of average of reciprocals
 * 
 * Complexity: O(n)
 * Formula: n / sum(1/x)
 */
export const HARMEAN_METADATA: StrictFunctionMetadata = {
  name: 'HARMEAN',
  handler: StatisticalFunctions.HARMEAN,
  category: FunctionCategory.STATISTICAL,
  minArgs: 1,
  maxArgs: 255,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: STATISTICAL,
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * STEYX - Standard Error of Regression
 * Standard error of predicted y for each x
 * 
 * Complexity: O(n) - calculate regression residuals
 * Formula: sqrt(sum((y - y_predicted)²) / (n-2))
 * ErrorStrategy: PROPAGATE_FIRST (paired data integrity - errors would corrupt regression)
 */
export const STEYX_METADATA: StrictFunctionMetadata = {
  name: 'STEYX',
  handler: StatisticalFunctions.STEYX,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: STATISTICAL,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

/**
 * STDEVA - Sample Standard Deviation (includes text/logical)
 * Text/FALSE = 0, TRUE = 1
 * 
 * Complexity: O(n)
 * Note: "A" functions coerce text/logical to numbers
 */
export const STDEVA_METADATA: StrictFunctionMetadata = {
  name: 'STDEVA',
  handler: StatisticalFunctions.STDEVA,
  category: FunctionCategory.STATISTICAL,
  minArgs: 1,
  maxArgs: 255,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: STATISTICAL,
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * STDEVPA - Population Standard Deviation (includes text/logical)
 * Text/FALSE = 0, TRUE = 1
 * 
 * Complexity: O(n)
 */
export const STDEVPA_METADATA: StrictFunctionMetadata = {
  name: 'STDEVPA',
  handler: StatisticalFunctions.STDEVPA,
  category: FunctionCategory.STATISTICAL,
  minArgs: 1,
  maxArgs: 255,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: STATISTICAL,
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * VARA - Sample Variance (includes text/logical)
 * Text/FALSE = 0, TRUE = 1
 * 
 * Complexity: O(n)
 */
export const VARA_METADATA: StrictFunctionMetadata = {
  name: 'VARA',
  handler: StatisticalFunctions.VARA,
  category: FunctionCategory.STATISTICAL,
  minArgs: 1,
  maxArgs: 255,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: STATISTICAL,
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * VARPA - Population Variance (includes text/logical)
 * Text/FALSE = 0, TRUE = 1
 * 
 * Complexity: O(n)
 */
export const VARPA_METADATA: StrictFunctionMetadata = {
  name: 'VARPA',
  handler: StatisticalFunctions.VARPA,
  category: FunctionCategory.STATISTICAL,
  minArgs: 1,
  maxArgs: 255,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: STATISTICAL,
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * MAXA - Maximum (includes text/logical)
 * Text/FALSE = 0, TRUE = 1
 * 
 * Complexity: O(n)
 * Note: Different from MAX (which ignores text/logical)
 */
export const MAXA_METADATA: StrictFunctionMetadata = {
  name: 'MAXA',
  handler: StatisticalFunctions.MAXA,
  category: FunctionCategory.STATISTICAL,
  minArgs: 1,
  maxArgs: 255,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: EXACT, // MAX is EXACT (no accumulation)
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * MINA - Minimum (includes text/logical)
 * Text/FALSE = 0, TRUE = 1
 * 
 * Complexity: O(n)
 * Note: Different from MIN (which ignores text/logical)
 */
export const MINA_METADATA: StrictFunctionMetadata = {
  name: 'MINA',
  handler: StatisticalFunctions.MINA,
  category: FunctionCategory.STATISTICAL,
  minArgs: 1,
  maxArgs: 255,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: EXACT, // MIN is EXACT (no accumulation)
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * FISHER - Fisher Transformation
 * Transforms correlation to normal distribution
 * 
 * Complexity: O(1) - direct formula
 * Formula: 0.5 * ln((1+r) / (1-r))
 * Precision: STATISTICAL (logarithm)
 */
export const FISHER_METADATA: StrictFunctionMetadata = {
  name: 'FISHER',
  handler: StatisticalFunctions.FISHER,
  category: FunctionCategory.STATISTICAL,
  minArgs: 1,
  maxArgs: 1,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: STATISTICAL,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

/**
 * FISHERINV - Inverse Fisher Transformation
 * Inverse of Fisher transformation
 * 
 * Complexity: O(1)
 * Formula: (e^(2x) - 1) / (e^(2x) + 1)
 */
export const FISHERINV_METADATA: StrictFunctionMetadata = {
  name: 'FISHERINV',
  handler: StatisticalFunctions.FISHERINV,
  category: FunctionCategory.STATISTICAL,
  minArgs: 1,
  maxArgs: 1,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: STATISTICAL,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

/**
 * FREQUENCY - Frequency Distribution
 * Count values in bins
 * 
 * Complexity: O(n) - iterate data array, bin lookup
 * Returns: Array of counts for each bin
 */
export const FREQUENCY_METADATA: StrictFunctionMetadata = {
  name: 'FREQUENCY',
  handler: StatisticalFunctions.FREQUENCY,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: EXACT, // Count is exact integer
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * COUNTBLANK - Count Blank Cells
 * Count empty cells in range
 * 
 * Complexity: O(n)
 * Precision: EXACT (integer count)
 */
export const COUNTBLANK_METADATA: StrictFunctionMetadata = {
  name: 'COUNTBLANK',
  handler: StatisticalFunctions.COUNTBLANK,
  category: FunctionCategory.STATISTICAL,
  minArgs: 1,
  maxArgs: 1,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: EXACT,
  errorStrategy: SKIP_ERRORS, // Errors count as non-blank
  iterationPolicy: null,
};

// Export all Batch 1 metadata
export const AGGREGATION_METADATA: StrictFunctionMetadata[] = [
  STDEV_METADATA,
  STDEV_S_METADATA,
  STDEV_P_METADATA,
  VAR_METADATA,
  VAR_S_METADATA,
  VAR_P_METADATA,
  CORREL_METADATA,
  PEARSON_METADATA,
  COVARIANCE_P_METADATA,
  COVARIANCE_S_METADATA,
  RSQ_METADATA,
  DEVSQ_METADATA,
  AVEDEV_METADATA,
  GEOMEAN_METADATA,
  HARMEAN_METADATA,
  STEYX_METADATA,
  STDEVA_METADATA,
  STDEVPA_METADATA,
  VARA_METADATA,
  VARPA_METADATA,
  MAXA_METADATA,
  MINA_METADATA,
  FISHER_METADATA,
  FISHERINV_METADATA,
  FREQUENCY_METADATA,
  COUNTBLANK_METADATA,
];

/**
 * ============================================================================
 * BATCH 2: CONDITIONAL AGGREGATION FUNCTIONS
 * ============================================================================
 * COUNTIF, SUMIF, AVERAGEIF, COUNTIFS, SUMIFS, AVERAGEIFS, MAXIFS, MINIFS
 * Complexity: O(n) - iterate range, evaluate condition for each cell
 * Precision: EXACT (COUNT) / STATISTICAL (SUM, AVERAGE)
 * ErrorStrategy: SKIP_ERRORS (ignore non-matching/error cells)
 */

/**
 * COUNTIF - Count Cells Matching Criteria
 * Count cells in range that meet condition
 * 
 * Complexity: O(n) - iterate range, evaluate criteria
 * Precision: EXACT (integer count)
 * ErrorStrategy: SKIP_ERRORS (errors don't match criteria)
 */
export const COUNTIF_METADATA: StrictFunctionMetadata = {
  name: 'COUNTIF',
  handler: StatisticalFunctions.COUNTIF,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: EXACT,
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * SUMIF - Sum Cells Matching Criteria
 * Sum cells in range that meet condition
 * 
 * Complexity: O(n) - iterate range, conditional sum
 * Precision: STATISTICAL (floating point accumulation)
 * ErrorStrategy: SKIP_ERRORS (like SUM)
 */
export const SUMIF_METADATA: StrictFunctionMetadata = {
  name: 'SUMIF',
  handler: StatisticalFunctions.SUMIF,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: STATISTICAL,
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * AVERAGEIF - Average Cells Matching Criteria
 * Average cells in range that meet condition
 * 
 * Complexity: O(n)
 * Precision: STATISTICAL (division)
 */
export const AVERAGEIF_METADATA: StrictFunctionMetadata = {
  name: 'AVERAGEIF',
  handler: StatisticalFunctions.AVERAGEIF,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: STATISTICAL,
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * COUNTIFS - Count Cells Matching Multiple Criteria
 * Count cells meeting all criteria across multiple ranges
 * 
 * Complexity: O(n) - iterate first range, check all conditions
 * Note: n = number of rows, conditions evaluated per row
 */
export const COUNTIFS_METADATA: StrictFunctionMetadata = {
  name: 'COUNTIFS',
  handler: StatisticalFunctions.COUNTIFS,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 255,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: EXACT,
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * SUMIFS - Sum Cells Matching Multiple Criteria
 * Sum cells meeting all criteria across multiple ranges
 * 
 * Complexity: O(n)
 */
export const SUMIFS_METADATA: StrictFunctionMetadata = {
  name: 'SUMIFS',
  handler: StatisticalFunctions.SUMIFS,
  category: FunctionCategory.STATISTICAL,
  minArgs: 3,
  maxArgs: 255,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: STATISTICAL,
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * AVERAGEIFS - Average Cells Matching Multiple Criteria
 * Average cells meeting all criteria across multiple ranges
 * 
 * Complexity: O(n)
 */
export const AVERAGEIFS_METADATA: StrictFunctionMetadata = {
  name: 'AVERAGEIFS',
  handler: StatisticalFunctions.AVERAGEIFS,
  category: FunctionCategory.STATISTICAL,
  minArgs: 3,
  maxArgs: 255,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: STATISTICAL,
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * MAXIFS - Maximum of Cells Matching Multiple Criteria
 * Find max value meeting all criteria across multiple ranges
 * 
 * Complexity: O(n)
 * Precision: EXACT (no accumulation, direct comparison)
 */
export const MAXIFS_METADATA: StrictFunctionMetadata = {
  name: 'MAXIFS',
  handler: StatisticalFunctions.MAXIFS,
  category: FunctionCategory.STATISTICAL,
  minArgs: 3,
  maxArgs: 255,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: EXACT,
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * MINIFS - Minimum of Cells Matching Multiple Criteria
 * Find min value meeting all criteria across multiple ranges
 * 
 * Complexity: O(n)
 * Precision: EXACT (no accumulation, direct comparison)
 */
export const MINIFS_METADATA: StrictFunctionMetadata = {
  name: 'MINIFS',
  handler: StatisticalFunctions.MINIFS,
  category: FunctionCategory.STATISTICAL,
  minArgs: 3,
  maxArgs: 255,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: EXACT,
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

// Export Batch 2 metadata
export const CONDITIONAL_METADATA: StrictFunctionMetadata[] = [
  COUNTIF_METADATA,
  SUMIF_METADATA,
  AVERAGEIF_METADATA,
  COUNTIFS_METADATA,
  SUMIFS_METADATA,
  AVERAGEIFS_METADATA,
  MAXIFS_METADATA,
  MINIFS_METADATA,
];

/**
 * ============================================================================
 * BATCH 3: SORTING-BASED STATISTICAL FUNCTIONS
 * ============================================================================
 * MEDIAN, MODE, PERCENTILE, QUARTILE, RANK, LARGE, SMALL, PERCENTRANK
 * Complexity: O(n log n) - require sorting data
 * Precision: STATISTICAL (interpolation for percentiles)
 * ErrorStrategy: SKIP_ERRORS (sort numeric values only)
 * 
 * CRITICAL: All order statistics require sorting → O(n log n)
 */

/**
 * MEDIAN - Middle Value
 * Find median (middle value) of dataset
 * 
 * Complexity: O(n log n) - REQUIRES sorting
 * - Even count: average of two middle values
 * - Odd count: exact middle value
 * Precision: STATISTICAL (average for even count)
 */
export const MEDIAN_METADATA: StrictFunctionMetadata = {
  name: 'MEDIAN',
  handler: StatisticalFunctions.MEDIAN,
  category: FunctionCategory.STATISTICAL,
  minArgs: 0,
  maxArgs: 255,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N_LOG_N,
  precisionClass: STATISTICAL,
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * MODE - Most Frequent Value (legacy)
 * Alias for MODE.SNGL
 * 
 * Complexity: O(n log n) - sort to find most frequent
 */
export const MODE_METADATA: StrictFunctionMetadata = {
  name: 'MODE',
  handler: StatisticalFunctions.MODE,
  category: FunctionCategory.STATISTICAL,
  minArgs: 1,
  maxArgs: 255,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N_LOG_N,
  precisionClass: EXACT, // Returns exact value from dataset
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * MODE.SNGL - Most Frequent Value (Single)
 * Returns most frequently occurring value
 * 
 * Complexity: O(n log n) - sort for frequency counting
 */
export const MODE_SNGL_METADATA: StrictFunctionMetadata = {
  name: 'MODE.SNGL',
  handler: StatisticalFunctions.MODE_SNGL,
  category: FunctionCategory.STATISTICAL,
  minArgs: 1,
  maxArgs: 255,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N_LOG_N,
  precisionClass: EXACT,
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * MODE.MULT - Most Frequent Values (Multiple)
 * Returns array of all most frequent values
 * 
 * Complexity: O(n log n)
 */
export const MODE_MULT_METADATA: StrictFunctionMetadata = {
  name: 'MODE.MULT',
  handler: StatisticalFunctions.MODE_MULT,
  category: FunctionCategory.STATISTICAL,
  minArgs: 1,
  maxArgs: 255,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N_LOG_N,
  precisionClass: EXACT,
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * PERCENTILE - Kth Percentile (legacy)
 * Alias for PERCENTILE.INC
 * 
 * Complexity: O(n log n) - sort + interpolate
 * Formula: Linear interpolation between sorted values
 */
export const PERCENTILE_METADATA: StrictFunctionMetadata = {
  name: 'PERCENTILE',
  handler: StatisticalFunctions.PERCENTILE,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N_LOG_N,
  precisionClass: STATISTICAL,
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * PERCENTILE.INC - Kth Percentile (Inclusive)
 * k from 0 to 1 (inclusive)
 * 
 * Complexity: O(n log n)
 */
export const PERCENTILE_INC_METADATA: StrictFunctionMetadata = {
  name: 'PERCENTILE.INC',
  handler: StatisticalFunctions.PERCENTILE_INC,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N_LOG_N,
  precisionClass: STATISTICAL,
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * PERCENTILE.EXC - Kth Percentile (Exclusive)
 * k from 0 to 1 (exclusive)
 * 
 * Complexity: O(n log n)
 * Different interpolation method than INC
 */
export const PERCENTILE_EXC_METADATA: StrictFunctionMetadata = {
  name: 'PERCENTILE.EXC',
  handler: StatisticalFunctions.PERCENTILE_EXC,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N_LOG_N,
  precisionClass: STATISTICAL,
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * QUARTILE - Quartile Value (legacy)
 * Alias for QUARTILE.INC
 * 
 * Complexity: O(n log n) - sort + interpolate
 * Quart: 0 (min), 1 (25%), 2 (50%), 3 (75%), 4 (max)
 */
export const QUARTILE_METADATA: StrictFunctionMetadata = {
  name: 'QUARTILE',
  handler: StatisticalFunctions.QUARTILE,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N_LOG_N,
  precisionClass: STATISTICAL,
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * QUARTILE.INC - Quartile (Inclusive)
 * Inclusive quartile calculation
 * 
 * Complexity: O(n log n)
 */
export const QUARTILE_INC_METADATA: StrictFunctionMetadata = {
  name: 'QUARTILE.INC',
  handler: StatisticalFunctions.QUARTILE_INC,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N_LOG_N,
  precisionClass: STATISTICAL,
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * QUARTILE.EXC - Quartile (Exclusive)
 * Exclusive quartile calculation
 * 
 * Complexity: O(n log n)
 */
export const QUARTILE_EXC_METADATA: StrictFunctionMetadata = {
  name: 'QUARTILE.EXC',
  handler: StatisticalFunctions.QUARTILE_EXC,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N_LOG_N,
  precisionClass: STATISTICAL,
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * RANK - Rank of Value in Dataset (legacy)
 * Alias for RANK.EQ
 * 
 * Complexity: O(n log n) - sort to determine rank
 * Order: 0 (descending, default), non-zero (ascending)
 */
export const RANK_METADATA: StrictFunctionMetadata = {
  name: 'RANK',
  handler: StatisticalFunctions.RANK,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N_LOG_N,
  precisionClass: EXACT, // Integer rank
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * RANK.EQ - Rank (Equal Rank for Ties)
 * Ties get same rank (skip next ranks)
 * 
 * Complexity: O(n log n)
 */
export const RANK_EQ_METADATA: StrictFunctionMetadata = {
  name: 'RANK.EQ',
  handler: StatisticalFunctions.RANK_EQ,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N_LOG_N,
  precisionClass: EXACT,
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * RANK.AVG - Rank (Average Rank for Ties)
 * Ties get average of ranks they span
 * 
 * Complexity: O(n log n)
 * Precision: STATISTICAL (average rank)
 */
export const RANK_AVG_METADATA: StrictFunctionMetadata = {
  name: 'RANK.AVG',
  handler: StatisticalFunctions.RANK_AVG,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N_LOG_N,
  precisionClass: STATISTICAL, // Average rank (division)
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * LARGE - Kth Largest Value
 * Find kth largest value in dataset
 * 
 * Complexity: O(n log n) - sort descending, pick kth
 * K: 1 (largest), 2 (second largest), etc.
 */
export const LARGE_METADATA: StrictFunctionMetadata = {
  name: 'LARGE',
  handler: StatisticalFunctions.LARGE,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N_LOG_N,
  precisionClass: EXACT, // Returns exact value from dataset
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * SMALL - Kth Smallest Value
 * Find kth smallest value in dataset
 * 
 * Complexity: O(n log n) - sort ascending, pick kth
 * K: 1 (smallest), 2 (second smallest), etc.
 */
export const SMALL_METADATA: StrictFunctionMetadata = {
  name: 'SMALL',
  handler: StatisticalFunctions.SMALL,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N_LOG_N,
  precisionClass: EXACT,
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * PERCENTRANK - Percent Rank (legacy)
 * Alias for PERCENTRANK.INC
 * 
 * Complexity: O(n log n) - sort + linear search
 * Returns: Percent rank of value in dataset (0 to 1)
 */
export const PERCENTRANK_METADATA: StrictFunctionMetadata = {
  name: 'PERCENTRANK',
  handler: StatisticalFunctions.PERCENTRANK,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N_LOG_N,
  precisionClass: STATISTICAL,
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * PERCENTRANK.INC - Percent Rank (Inclusive)
 * Range: 0 to 1 (inclusive)
 * 
 * Complexity: O(n log n)
 */
export const PERCENTRANK_INC_METADATA: StrictFunctionMetadata = {
  name: 'PERCENTRANK.INC',
  handler: StatisticalFunctions.PERCENTRANK_INC,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N_LOG_N,
  precisionClass: STATISTICAL,
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

/**
 * PERCENTRANK.EXC - Percent Rank (Exclusive)
 * Range: 0 to 1 (exclusive)
 * 
 * Complexity: O(n log n)
 */
export const PERCENTRANK_EXC_METADATA: StrictFunctionMetadata = {
  name: 'PERCENTRANK.EXC',
  handler: StatisticalFunctions.PERCENTRANK_EXC,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N_LOG_N,
  precisionClass: STATISTICAL,
  errorStrategy: SKIP_ERRORS,
  iterationPolicy: null,
};

// Export Batch 3 metadata
export const SORTING_BASED_METADATA: StrictFunctionMetadata[] = [
  MEDIAN_METADATA,
  MODE_METADATA,
  MODE_SNGL_METADATA,
  MODE_MULT_METADATA,
  PERCENTILE_METADATA,
  PERCENTILE_INC_METADATA,
  PERCENTILE_EXC_METADATA,
  QUARTILE_METADATA,
  QUARTILE_INC_METADATA,
  QUARTILE_EXC_METADATA,
  RANK_METADATA,
  RANK_EQ_METADATA,
  RANK_AVG_METADATA,
  LARGE_METADATA,
  SMALL_METADATA,
  PERCENTRANK_METADATA,
  PERCENTRANK_INC_METADATA,
  PERCENTRANK_EXC_METADATA,
];

/**
 * ============================================================================
 * CUMULATIVE STATISTICS - BATCH 3 COMPLETE
 * ============================================================================
 * 
 * Batch 3 Functions: 18
 * Total Functions So Far: 52 (26 + 8 + 18)
 * 
 * Complexity: ALL O(n log n) (sorting required for order statistics)
 * 
 * Precision Distribution:
 * - EXACT: 9 (MODE variants, RANK variants, LARGE, SMALL - return exact values)
 * - STATISTICAL: 9 (MEDIAN, PERCENTILE variants, QUARTILE variants, PERCENTRANK variants - interpolation)
 * 
 * ErrorStrategy: ALL SKIP_ERRORS (sort numeric values only)
 * 
 * Key Insights:
 * - ALL order statistics require sorting → O(n log n) MANDATORY
 * - MEDIAN uses average for even count → STATISTICAL
 * - PERCENTILE/QUARTILE use linear interpolation → STATISTICAL
 * - LARGE/SMALL return exact values from sorted dataset → EXACT
 * - RANK.AVG averages tied ranks → STATISTICAL
 * - INC/EXC variants differ in interpolation method
 */

/**
 * ============================================================================
 * CUMULATIVE STATISTICS - BATCH 2 COMPLETE
 * ============================================================================
 * 
 * Batch 2 Functions: 8
 * Total Functions So Far: 34 (26 + 8)
 * 
 * Complexity: ALL O(n) (iterate range with conditional check)
 * 
 * Precision Distribution:
 * - EXACT: 4 (COUNTIF, COUNTIFS, MAXIFS, MINIFS - no accumulation)
 * - STATISTICAL: 4 (SUMIF, AVERAGEIF, SUMIFS, AVERAGEIFS)
 * 
 * ErrorStrategy: ALL SKIP_ERRORS (conditional aggregations ignore errors)
 * 
 * Key Insights:
 * - *IFS functions take multiple range/criteria pairs
 * - All conditional functions skip errors (like base aggregations)
 * - COUNT/MAX/MIN are EXACT (no floating point accumulation)
 * - SUM/AVERAGE are STATISTICAL (accumulation/division)
 */

/**
 * ============================================================================
 * CUMULATIVE STATISTICS - BATCH 1 COMPLETE
 * ============================================================================
 * 
 * Total Functions: 26
 * Complexity Distribution:
 * - O(1): 2 (FISHER, FISHERINV)
 * - O(n): 24 (all aggregations)
 * 
 * Precision Distribution:
 * - EXACT: 4 (MAXA, MINA, FREQUENCY, COUNTBLANK - no accumulation)
 * - STATISTICAL: 22 (variance, correlation, means)
 * 
 * ErrorStrategy Distribution:
 * - SKIP_ERRORS: 24 (aggregations ignore non-numeric)
 * - PROPAGATE_FIRST: 2 (FISHER, FISHERINV - transforms)
 * 
 * Key Insights:
 * - All "A" functions (MAXA, MINA, STDEVA, etc.) coerce text/logical to numbers
 * - GEOMEAN uses ln() internally to avoid overflow (exp(sum(ln(x)) / n))
 * - FREQUENCY returns array (bin counts)
 * - COUNTBLANK errors count as non-blank (SKIP_ERRORS)
 */

/**
 * ============================================================================
 * BATCH 4: DISTRIBUTION FUNCTIONS
 * ============================================================================
 * Normal, Binomial, Poisson, Exponential, T, F, Chi-Square, Gamma, Beta, etc.
 * Complexity: O(1) - direct formulas (use approximations for erf/gamma)
 * Precision: ERF_LIMITED (±1e-7, limited by error function approximations)
 * ErrorStrategy: PROPAGATE_FIRST (statistical formulas)
 */

// Normal Distribution
export const NORM_DIST_METADATA: StrictFunctionMetadata = {
  name: 'NORM.DIST',
  handler: StatisticalFunctions.NORM_DIST,
  category: FunctionCategory.STATISTICAL,
  minArgs: 4,
  maxArgs: 4,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: ERF_LIMITED,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const NORM_INV_METADATA: StrictFunctionMetadata = {
  name: 'NORM.INV',
  handler: StatisticalFunctions.NORM_INV,
  category: FunctionCategory.STATISTICAL,
  minArgs: 3,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: ERF_LIMITED,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const NORM_S_DIST_METADATA: StrictFunctionMetadata = {
  name: 'NORM.S.DIST',
  handler: StatisticalFunctions.NORM_S_DIST,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: ERF_LIMITED,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const NORM_S_INV_METADATA: StrictFunctionMetadata = {
  name: 'NORM.S.INV',
  handler: StatisticalFunctions.NORM_S_INV,
  category: FunctionCategory.STATISTICAL,
  minArgs: 1,
  maxArgs: 1,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: ERF_LIMITED,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

// Binomial Distribution
export const BINOM_DIST_METADATA: StrictFunctionMetadata = {
  name: 'BINOM.DIST',
  handler: StatisticalFunctions.BINOM_DIST,
  category: FunctionCategory.STATISTICAL,
  minArgs: 4,
  maxArgs: 4,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: ERF_LIMITED,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const BINOM_INV_METADATA: StrictFunctionMetadata = {
  name: 'BINOM.INV',
  handler: StatisticalFunctions.BINOM_INV,
  category: FunctionCategory.STATISTICAL,
  minArgs: 3,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: ERF_LIMITED,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

// Poisson Distribution
export const POISSON_DIST_METADATA: StrictFunctionMetadata = {
  name: 'POISSON.DIST',
  handler: StatisticalFunctions.POISSON_DIST,
  category: FunctionCategory.STATISTICAL,
  minArgs: 3,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: ERF_LIMITED,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const POISSON_METADATA: StrictFunctionMetadata = {
  name: 'POISSON',
  handler: StatisticalFunctions.POISSON,
  category: FunctionCategory.STATISTICAL,
  minArgs: 3,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: ERF_LIMITED,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

// Exponential Distribution
export const EXPON_DIST_METADATA: StrictFunctionMetadata = {
  name: 'EXPON.DIST',
  handler: StatisticalFunctions.EXPON_DIST,
  category: FunctionCategory.STATISTICAL,
  minArgs: 3,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: ERF_LIMITED,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const EXPONDIST_METADATA: StrictFunctionMetadata = {
  name: 'EXPONDIST',
  handler: StatisticalFunctions.EXPONDIST,
  category: FunctionCategory.STATISTICAL,
  minArgs: 3,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: ERF_LIMITED,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

// T Distribution
export const T_DIST_METADATA: StrictFunctionMetadata = {
  name: 'T.DIST',
  handler: StatisticalFunctions.T_DIST,
  category: FunctionCategory.STATISTICAL,
  minArgs: 3,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: ERF_LIMITED,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const T_DIST_RT_METADATA: StrictFunctionMetadata = {
  name: 'T.DIST.RT',
  handler: StatisticalFunctions.T_DIST_RT,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: ERF_LIMITED,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const T_DIST_2T_METADATA: StrictFunctionMetadata = {
  name: 'T.DIST.2T',
  handler: StatisticalFunctions.T_DIST_2T,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: ERF_LIMITED,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const T_INV_METADATA: StrictFunctionMetadata = {
  name: 'T.INV',
  handler: StatisticalFunctions.T_INV,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: ERF_LIMITED,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const T_INV_2T_METADATA: StrictFunctionMetadata = {
  name: 'T.INV.2T',
  handler: StatisticalFunctions.T_INV_2T,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: ERF_LIMITED,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const T_TEST_METADATA: StrictFunctionMetadata = {
  name: 'T.TEST',
  handler: StatisticalFunctions.T_TEST,
  category: FunctionCategory.STATISTICAL,
  minArgs: 4,
  maxArgs: 4,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N, // Iterate arrays
  precisionClass: ERF_LIMITED,
  errorStrategy: PROPAGATE_FIRST, // Hypothesis test - sample integrity required
  iterationPolicy: null,
};

// F Distribution
export const F_DIST_METADATA: StrictFunctionMetadata = {
  name: 'F.DIST',
  handler: StatisticalFunctions.F_DIST,
  category: FunctionCategory.STATISTICAL,
  minArgs: 4,
  maxArgs: 4,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: ERF_LIMITED,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const F_DIST_RT_METADATA: StrictFunctionMetadata = {
  name: 'F.DIST.RT',
  handler: StatisticalFunctions.F_DIST_RT,
  category: FunctionCategory.STATISTICAL,
  minArgs: 3,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: ERF_LIMITED,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const F_INV_METADATA: StrictFunctionMetadata = {
  name: 'F.INV',
  handler: StatisticalFunctions.F_INV,
  category: FunctionCategory.STATISTICAL,
  minArgs: 3,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: ERF_LIMITED,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const F_INV_RT_METADATA: StrictFunctionMetadata = {
  name: 'F.INV.RT',
  handler: StatisticalFunctions.F_INV_RT,
  category: FunctionCategory.STATISTICAL,
  minArgs: 3,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: ERF_LIMITED,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const F_TEST_METADATA: StrictFunctionMetadata = {
  name: 'F.TEST',
  handler: StatisticalFunctions.F_TEST,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N, // Iterate arrays
  precisionClass: ERF_LIMITED,
  errorStrategy: PROPAGATE_FIRST, // Hypothesis test - sample integrity required
  iterationPolicy: null,
};

// Chi-Square Distribution
export const CHISQ_DIST_METADATA: StrictFunctionMetadata = {
  name: 'CHISQ.DIST',
  handler: StatisticalFunctions.CHISQ_DIST,
  category: FunctionCategory.STATISTICAL,
  minArgs: 3,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: ERF_LIMITED,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const CHISQ_DIST_RT_METADATA: StrictFunctionMetadata = {
  name: 'CHISQ.DIST.RT',
  handler: StatisticalFunctions.CHISQ_DIST_RT,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: ERF_LIMITED,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const CHISQ_INV_METADATA: StrictFunctionMetadata = {
  name: 'CHISQ.INV',
  handler: StatisticalFunctions.CHISQ_INV,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: ERF_LIMITED,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const CHISQ_INV_RT_METADATA: StrictFunctionMetadata = {
  name: 'CHISQ.INV.RT',
  handler: StatisticalFunctions.CHISQ_INV_RT,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: ERF_LIMITED,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const CHISQ_TEST_METADATA: StrictFunctionMetadata = {
  name: 'CHISQ.TEST',
  handler: StatisticalFunctions.CHISQ_TEST,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N, // Iterate arrays
  precisionClass: ERF_LIMITED,
  errorStrategy: PROPAGATE_FIRST, // Hypothesis test - sample integrity required
  iterationPolicy: null,
};

// Gamma Distribution Family
export const GAMMA_DIST_METADATA: StrictFunctionMetadata = {
  name: 'GAMMA.DIST',
  handler: StatisticalFunctions.GAMMA_DIST,
  category: FunctionCategory.STATISTICAL,
  minArgs: 4,
  maxArgs: 4,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: ERF_LIMITED,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const GAMMA_INV_METADATA: StrictFunctionMetadata = {
  name: 'GAMMA.INV',
  handler: StatisticalFunctions.GAMMA_INV,
  category: FunctionCategory.STATISTICAL,
  minArgs: 3,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: ERF_LIMITED,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const LOGNORM_DIST_METADATA: StrictFunctionMetadata = {
  name: 'LOGNORM.DIST',
  handler: StatisticalFunctions.LOGNORM_DIST,
  category: FunctionCategory.STATISTICAL,
  minArgs: 4,
  maxArgs: 4,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: ERF_LIMITED,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const LOGNORM_INV_METADATA: StrictFunctionMetadata = {
  name: 'LOGNORM.INV',
  handler: StatisticalFunctions.LOGNORM_INV,
  category: FunctionCategory.STATISTICAL,
  minArgs: 3,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: ERF_LIMITED,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const WEIBULL_DIST_METADATA: StrictFunctionMetadata = {
  name: 'WEIBULL.DIST',
  handler: StatisticalFunctions.WEIBULL_DIST,
  category: FunctionCategory.STATISTICAL,
  minArgs: 4,
  maxArgs: 4,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: ERF_LIMITED,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

// Beta & Hypergeometric
export const BETA_DIST_METADATA: StrictFunctionMetadata = {
  name: 'BETA.DIST',
  handler: StatisticalFunctions.BETA_DIST,
  category: FunctionCategory.STATISTICAL,
  minArgs: 4,
  maxArgs: 6,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: ERF_LIMITED,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const BETA_INV_METADATA: StrictFunctionMetadata = {
  name: 'BETA.INV',
  handler: StatisticalFunctions.BETA_INV,
  category: FunctionCategory.STATISTICAL,
  minArgs: 3,
  maxArgs: 5,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: ERF_LIMITED,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const HYPGEOM_DIST_METADATA: StrictFunctionMetadata = {
  name: 'HYPGEOM.DIST',
  handler: StatisticalFunctions.HYPGEOM_DIST,
  category: FunctionCategory.STATISTICAL,
  minArgs: 5,
  maxArgs: 5,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: ERF_LIMITED,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const DISTRIBUTION_METADATA: StrictFunctionMetadata[] = [
  NORM_DIST_METADATA,
  NORM_INV_METADATA,
  NORM_S_DIST_METADATA,
  NORM_S_INV_METADATA,
  BINOM_DIST_METADATA,
  BINOM_INV_METADATA,
  POISSON_DIST_METADATA,
  POISSON_METADATA,
  EXPON_DIST_METADATA,
  EXPONDIST_METADATA,
  T_DIST_METADATA,
  T_DIST_RT_METADATA,
  T_DIST_2T_METADATA,
  T_INV_METADATA,
  T_INV_2T_METADATA,
  T_TEST_METADATA,
  F_DIST_METADATA,
  F_DIST_RT_METADATA,
  F_INV_METADATA,
  F_INV_RT_METADATA,
  F_TEST_METADATA,
  CHISQ_DIST_METADATA,
  CHISQ_DIST_RT_METADATA,
  CHISQ_INV_METADATA,
  CHISQ_INV_RT_METADATA,
  CHISQ_TEST_METADATA,
  GAMMA_DIST_METADATA,
  GAMMA_INV_METADATA,
  LOGNORM_DIST_METADATA,
  LOGNORM_INV_METADATA,
  WEIBULL_DIST_METADATA,
  BETA_DIST_METADATA,
  BETA_INV_METADATA,
  HYPGEOM_DIST_METADATA,
];

/**
 * ============================================================================
 * BATCH 5: REGRESSION & TREND FUNCTIONS
 * ============================================================================
 * SLOPE, INTERCEPT, FORECAST, TREND, LINEST, LOGEST, GROWTH
 * 
 * Simple regression: O(n) - iterate data pairs
 * Matrix regression (LINEST, LOGEST): O(n²) - matrix inversion
 */

export const SLOPE_METADATA: StrictFunctionMetadata = {
  name: 'SLOPE',
  handler: StatisticalFunctions.SLOPE,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: STATISTICAL,
  errorStrategy: PROPAGATE_FIRST, // Paired data integrity - errors would corrupt regression
  iterationPolicy: null,
};

export const INTERCEPT_METADATA: StrictFunctionMetadata = {
  name: 'INTERCEPT',
  handler: StatisticalFunctions.INTERCEPT,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: STATISTICAL,
  errorStrategy: PROPAGATE_FIRST, // Paired data integrity - errors would corrupt regression
  iterationPolicy: null,
};

export const FORECAST_METADATA: StrictFunctionMetadata = {
  name: 'FORECAST',
  handler: StatisticalFunctions.FORECAST,
  category: FunctionCategory.STATISTICAL,
  minArgs: 3,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: STATISTICAL,
  errorStrategy: PROPAGATE_FIRST, // Paired data integrity - errors would corrupt forecast
  iterationPolicy: null,
};

export const FORECAST_LINEAR_METADATA: StrictFunctionMetadata = {
  name: 'FORECAST.LINEAR',
  handler: StatisticalFunctions.FORECAST_LINEAR,
  category: FunctionCategory.STATISTICAL,
  minArgs: 3,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: STATISTICAL,
  errorStrategy: PROPAGATE_FIRST, // Paired data integrity - errors would corrupt forecast
  iterationPolicy: null,
};

export const TREND_METADATA: StrictFunctionMetadata = {
  name: 'TREND',
  handler: StatisticalFunctions.TREND,
  category: FunctionCategory.STATISTICAL,
  minArgs: 2,
  maxArgs: 4,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: STATISTICAL,
  errorStrategy: PROPAGATE_FIRST, // Paired data integrity - errors would corrupt trend
  iterationPolicy: null,
};

export const LINEST_METADATA: StrictFunctionMetadata = {
  name: 'LINEST',
  handler: RegressionFunctions.LINEST,
  category: FunctionCategory.STATISTICAL,
  minArgs: 1,
  maxArgs: 4,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N2,
  precisionClass: STATISTICAL,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const LOGEST_METADATA: StrictFunctionMetadata = {
  name: 'LOGEST',
  handler: RegressionFunctions.LOGEST,
  category: FunctionCategory.STATISTICAL,
  minArgs: 1,
  maxArgs: 4,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N2,
  precisionClass: STATISTICAL,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const GROWTH_METADATA: StrictFunctionMetadata = {
  name: 'GROWTH',
  handler: RegressionFunctions.GROWTH,
  category: FunctionCategory.STATISTICAL,
  minArgs: 1,
  maxArgs: 4,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N2,
  precisionClass: STATISTICAL,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const REGRESSION_METADATA: StrictFunctionMetadata[] = [
  SLOPE_METADATA,
  INTERCEPT_METADATA,
  FORECAST_METADATA,
  FORECAST_LINEAR_METADATA,
  TREND_METADATA,
  LINEST_METADATA,
  LOGEST_METADATA,
  GROWTH_METADATA,
];

// Final combined export
export const STATISTICAL_METADATA: StrictFunctionMetadata[] = [
  ...AGGREGATION_METADATA,
  ...CONDITIONAL_METADATA,
  ...SORTING_BASED_METADATA,
  ...DISTRIBUTION_METADATA,
  ...REGRESSION_METADATA,
];

/**
 * ============================================================================
 * WAVE 0 DAY 2 - STATISTICAL CATEGORY COMPLETE ✅
 * ============================================================================
 * 
 * FINAL STATISTICS:
 * Total Functions: 94
 * 
 * Batch Breakdown:
 * - Batch 1 (Aggregations): 26 functions
 * - Batch 2 (Conditional): 8 functions
 * - Batch 3 (Sorting-Based): 18 functions
 * - Batch 4 (Distributions): 34 functions
 * - Batch 5 (Regression): 8 functions
 * 
 * Complexity Distribution:
 * - O(1): 31 (distributions)
 * - O(n): 45 (aggregations, conditional, simple regression, tests)
 * - O(n log n): 18 (sorting-based: MEDIAN, PERCENTILE, RANK, etc.)
 * - O(n²): 3 (LINEST, LOGEST, GROWTH - matrix operations)
 * 
 * Precision Distribution:
 * - EXACT: 17 (COUNT, MAX, MIN, MODE, RANK, LARGE, SMALL variants)
 * - STATISTICAL: 43 (variance, correlation, regression, interpolation)
 * - ERF_LIMITED: 34 (distributions using erf/gamma approximations)
 * 
 * ErrorStrategy Distribution:
 * - SKIP_ERRORS: 50 (aggregations skip non-numeric)
 * - PROPAGATE_FIRST: 44 (distributions, transforms, matrix operations)
 * 
 * Key Insights:
 * 1. Distributions are O(1) but ERF_LIMITED precision (±1e-7)
 * 2. ALL order statistics require O(n log n) sorting
 * 3. Matrix regression (LINEST, LOGEST) is O(n²) - most expensive
 * 4. Conditional functions (*IF, *IFS) use SKIP_ERRORS like base aggregations
 * 5. Test functions (T.TEST, F.TEST, CHISQ.TEST) iterate arrays → O(n)
 */
