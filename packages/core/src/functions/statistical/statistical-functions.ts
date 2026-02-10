/**
 * statistical-functions.ts
 * 
 * Statistical formula functions.
 * Excel-compatible statistical operations.
 * 
 * Uses Welford's algorithm for variance/stdev calculations to ensure
 * numerical stability with large numbers and prevent precision loss.
 */

import type { FormulaFunction, FormulaValue } from '../../types/formula-types';
import { filterNumbers, flattenArray } from '../../utils/array-utils';
import { toNumber, toBoolean } from '../../utils/type-utils';
import type { ParsedCriteria } from '../../utils/criteria-utils';

/**
 * Welford's online algorithm for computing variance.
 * Numerically stable for large numbers and prevents catastrophic cancellation.
 * 
 * @param nums - Array of numbers
 * @returns { mean, m2, count } where variance = m2 / (count - 1) for sample, m2 / count for population
 */
function welfordVariance(nums: number[]): { mean: number; m2: number; count: number } {
  let mean = 0;
  let m2 = 0;
  let count = 0;

  for (const x of nums) {
    count++;
    const delta = x - mean;
    mean += delta / count;
    const delta2 = x - mean;
    m2 += delta * delta2;
  }

  return { mean, m2, count };
}

/**
 * STDEV - Standard deviation (sample)
 * Alias for STDEV.S
 * 
 * @example
 * =STDEV(1, 2, 3, 4, 5) → 1.5811...
 * =STDEV(A1:A10)
 */
export const STDEV: FormulaFunction = (...values) => {
  return STDEV_S(...values);
};

/**
 * STDEV.S - Standard deviation (sample)
 * Calculates standard deviation using sample variance (n-1 denominator).
 * Uses Welford's algorithm for numerical stability.
 * 
 * @example
 * =STDEV.S(1, 2, 3, 4, 5) → 1.5811...
 * =STDEV.S({10, 20, 30, 40}) → 12.909...
 */
export const STDEV_S: FormulaFunction = (...values) => {
  const nums = filterNumbers(flattenArray(values));
  
  if (nums.length < 2) {
    return new Error('#DIV/0!');
  }

  const { m2, count } = welfordVariance(nums);
  const variance = m2 / (count - 1);
  
  return Math.sqrt(variance);
};

/**
 * STDEV.P - Standard deviation (population)
 * Calculates standard deviation using population variance (n denominator).
 * Uses Welford's algorithm for numerical stability.
 * 
 * @example
 * =STDEV.P(1, 2, 3, 4, 5) → 1.4142...
 * =STDEV.P({10, 20, 30, 40}) → 11.180...
 */
export const STDEV_P: FormulaFunction = (...values) => {
  const nums = filterNumbers(flattenArray(values));
  
  if (nums.length === 0) {
    return new Error('#DIV/0!');
  }

  const { m2, count } = welfordVariance(nums);
  const variance = m2 / count;
  
  return Math.sqrt(variance);
};

/**
 * VAR - Variance (sample)
 * Alias for VAR.S
 * 
 * @example
 * =VAR(1, 2, 3, 4, 5) → 2.5
 */
export const VAR: FormulaFunction = (...values) => {
  return VAR_S(...values);
};

/**
 * VAR.S - Variance (sample)
 * Calculates variance using sample variance (n-1 denominator).
 * Uses Welford's algorithm for numerical stability.
 * 
 * @example
 * =VAR.S(1, 2, 3, 4, 5) → 2.5
 * =VAR.S({10, 20, 30, 40}) → 166.666...
 */
export const VAR_S: FormulaFunction = (...values) => {
  const nums = filterNumbers(flattenArray(values));
  
  if (nums.length < 2) {
    return new Error('#DIV/0!');
  }

  const { m2, count } = welfordVariance(nums);
  return m2 / (count - 1);
};

/**
 * VAR.P - Variance (population)
 * Calculates variance using population variance (n denominator).
 * Uses Welford's algorithm for numerical stability.
 * 
 * @example
 * =VAR.P(1, 2, 3, 4, 5) → 2.0
 * =VAR.P({10, 20, 30, 40}) → 125.0
 */
export const VAR_P: FormulaFunction = (...values) => {
  const nums = filterNumbers(flattenArray(values));
  
  if (nums.length === 0) {
    return new Error('#DIV/0!');
  }

  const { m2, count } = welfordVariance(nums);
  return m2 / count;
};

/**
 * MEDIAN - Middle value
 */
export const MEDIAN: FormulaFunction = (...values) => {
  const nums = filterNumbers(flattenArray(values));
  
  if (nums.length === 0) {
    return new Error('#NUM!');
  }

  const sorted = nums.sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
};

/**
 * MODE - Most common value
 * Alias for MODE.SNGL
 */
export const MODE: FormulaFunction = (...values) => {
  return MODE_SNGL(...values);
};

/**
 * MODE.SNGL - Most common value (single)
 */
export const MODE_SNGL: FormulaFunction = (...values) => {
  const nums = filterNumbers(flattenArray(values));
  
  if (nums.length === 0) {
    return new Error('#N/A');
  }

  const freq = new Map<number, number>();
  let maxCount = 0;
  let mode: number | null = null;

  for (const num of nums) {
    const count = (freq.get(num) || 0) + 1;
    freq.set(num, count);
    
    if (count > maxCount) {
      maxCount = count;
      mode = num;
    }
  }

  return maxCount > 1 ? mode! : new Error('#N/A');
};

/**
 * MODE.MULT - Multiple modes (returns array)
 */
export const MODE_MULT: FormulaFunction = (...values) => {
  const nums = filterNumbers(flattenArray(values));
  
  if (nums.length === 0) {
    return new Error('#N/A');
  }

  const freq = new Map<number, number>();
  let maxCount = 0;

  for (const num of nums) {
    const count = (freq.get(num) || 0) + 1;
    freq.set(num, count);
    maxCount = Math.max(maxCount, count);
  }

  if (maxCount <= 1) {
    return new Error('#N/A');
  }

  const modes: number[] = [];
  for (const [num, count] of freq.entries()) {
    if (count === maxCount) {
      modes.push(num);
    }
  }

  return modes.sort((a, b) => a - b);
};

/**
 * PERCENTILE - Returns kth percentile
 * Alias for PERCENTILE.INC
 */
export const PERCENTILE: FormulaFunction = (array, k) => {
  return PERCENTILE_INC(array, k);
};

/**
 * PERCENTILE.INC - Returns kth percentile (inclusive)
 */
export const PERCENTILE_INC: FormulaFunction = (array, k) => {
  const kNum = toNumber(k);
  if (kNum instanceof Error) return kNum;

  if (kNum < 0 || kNum > 1) {
    return new Error('#NUM!');
  }

  const nums = filterNumbers(flattenArray([array]));
  
  if (nums.length === 0) {
    return new Error('#NUM!');
  }

  const sorted = nums.sort((a, b) => a - b);
  const index = kNum * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sorted[lower];
  }

  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
};

/**
 * PERCENTILE.EXC - Returns kth percentile (exclusive)
 */
export const PERCENTILE_EXC: FormulaFunction = (array, k) => {
  const kNum = toNumber(k);
  if (kNum instanceof Error) return kNum;

  if (kNum <= 0 || kNum >= 1) {
    return new Error('#NUM!');
  }

  const nums = filterNumbers(flattenArray([array]));
  
  if (nums.length < 2) {
    return new Error('#NUM!');
  }

  const sorted = nums.sort((a, b) => a - b);
  const index = kNum * (sorted.length + 1) - 1;

  if (index < 0 || index >= sorted.length) {
    return new Error('#NUM!');
  }

  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sorted[lower];
  }

  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
};

/**
 * QUARTILE - Returns quartile
 * Alias for QUARTILE.INC
 */
export const QUARTILE: FormulaFunction = (array, quart) => {
  return QUARTILE_INC(array, quart);
};

/**
 * QUARTILE.INC - Returns quartile (inclusive)
 */
export const QUARTILE_INC: FormulaFunction = (array, quart) => {
  const qNum = toNumber(quart);
  if (qNum instanceof Error) return qNum;

  if (qNum < 0 || qNum > 4 || qNum !== Math.floor(qNum)) {
    return new Error('#NUM!');
  }

  return PERCENTILE_INC(array, qNum / 4);
};

/**
 * QUARTILE.EXC - Returns quartile (exclusive)
 */
export const QUARTILE_EXC: FormulaFunction = (array, quart) => {
  const qNum = toNumber(quart);
  if (qNum instanceof Error) return qNum;

  if (qNum < 1 || qNum > 3 || qNum !== Math.floor(qNum)) {
    return new Error('#NUM!');
  }

  return PERCENTILE_EXC(array, qNum / 4);
};

/**
 * CORREL - Pearson correlation coefficient
 */
export const CORREL: FormulaFunction = (array1, array2) => {
  const nums1 = filterNumbers(flattenArray([array1]));
  const nums2 = filterNumbers(flattenArray([array2]));

  if (nums1.length !== nums2.length || nums1.length === 0) {
    return new Error('#N/A');
  }

  const n = nums1.length;
  const mean1 = nums1.reduce((sum, n) => sum + n, 0) / n;
  const mean2 = nums2.reduce((sum, n) => sum + n, 0) / n;

  let numerator = 0;
  let denominator1 = 0;
  let denominator2 = 0;

  for (let i = 0; i < n; i++) {
    const diff1 = nums1[i] - mean1;
    const diff2 = nums2[i] - mean2;
    
    numerator += diff1 * diff2;
    denominator1 += diff1 * diff1;
    denominator2 += diff2 * diff2;
  }

  const denominator = Math.sqrt(denominator1 * denominator2);
  
  if (denominator === 0) {
    return new Error('#DIV/0!');
  }

  return numerator / denominator;
};

/**
 * COVARIANCE.P - Population covariance
 */
export const COVARIANCE_P: FormulaFunction = (array1, array2) => {
  const nums1 = filterNumbers(flattenArray([array1]));
  const nums2 = filterNumbers(flattenArray([array2]));

  if (nums1.length !== nums2.length || nums1.length === 0) {
    return new Error('#N/A');
  }

  const n = nums1.length;
  const mean1 = nums1.reduce((sum, n) => sum + n, 0) / n;
  const mean2 = nums2.reduce((sum, n) => sum + n, 0) / n;

  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += (nums1[i] - mean1) * (nums2[i] - mean2);
  }

  return sum / n;
};

/**
 * COVARIANCE.S - Sample covariance
 */
export const COVARIANCE_S: FormulaFunction = (array1, array2) => {
  const nums1 = filterNumbers(flattenArray([array1]));
  const nums2 = filterNumbers(flattenArray([array2]));

  if (nums1.length !== nums2.length || nums1.length < 2) {
    return new Error('#N/A');
  }

  const n = nums1.length;
  const mean1 = nums1.reduce((sum, n) => sum + n, 0) / n;
  const mean2 = nums2.reduce((sum, n) => sum + n, 0) / n;

  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += (nums1[i] - mean1) * (nums2[i] - mean2);
  }

  return sum / (n - 1);
};

/**
 * RANK - Rank of number in list
 * Alias for RANK.EQ
 */
export const RANK: FormulaFunction = (number, ref, order = 0) => {
  return RANK_EQ(number, ref, order);
};

/**
 * RANK.EQ - Rank (equal values get same rank)
 */
export const RANK_EQ: FormulaFunction = (number, ref, order = 0) => {
  const num = toNumber(number);
  const ord = toNumber(order);

  if (num instanceof Error) return num;
  if (ord instanceof Error) return ord;

  const nums = filterNumbers(flattenArray([ref]));
  
  if (nums.length === 0) {
    return new Error('#N/A');
  }

  const descending = ord === 0;
  const sorted = nums.slice().sort((a, b) => descending ? b - a : a - b);

  const rank = sorted.indexOf(num);
  
  return rank === -1 ? new Error('#N/A') : rank + 1;
};

/**
 * RANK.AVG - Rank (equal values get average rank)
 */
export const RANK_AVG: FormulaFunction = (number, ref, order = 0) => {
  const num = toNumber(number);
  const ord = toNumber(order);

  if (num instanceof Error) return num;
  if (ord instanceof Error) return ord;

  const nums = filterNumbers(flattenArray([ref]));
  
  if (nums.length === 0) {
    return new Error('#N/A');
  }

  const descending = ord === 0;
  const sorted = nums.slice().sort((a, b) => descending ? b - a : a - b);

  const indices = sorted.reduce((acc, val, idx) => {
    if (val === num) acc.push(idx + 1);
    return acc;
  }, [] as number[]);

  if (indices.length === 0) {
    return new Error('#N/A');
  }

  return indices.reduce((sum, r) => sum + r, 0) / indices.length;
};

/**
 * LARGE - Kth largest value
 */
export const LARGE: FormulaFunction = (array, k) => {
  const kNum = toNumber(k);
  if (kNum instanceof Error) return kNum;

  const nums = filterNumbers(flattenArray([array]));
  
  if (kNum < 1 || kNum > nums.length) {
    return new Error('#NUM!');
  }

  const sorted = nums.sort((a, b) => b - a);
  return sorted[kNum - 1];
};

/**
 * SMALL - Kth smallest value
 */
export const SMALL: FormulaFunction = (array, k) => {
  const kNum = toNumber(k);
  if (kNum instanceof Error) return kNum;

  const nums = filterNumbers(flattenArray([array]));
  
  if (kNum < 1 || kNum > nums.length) {
    return new Error('#NUM!');
  }

  const sorted = nums.sort((a, b) => a - b);
  return sorted[kNum - 1];
};

/**
 * FREQUENCY - Frequency distribution
 */
export const FREQUENCY: FormulaFunction = (dataArray, binsArray) => {
  const data = filterNumbers(flattenArray([dataArray]));
  const bins = filterNumbers(flattenArray([binsArray]));

  if (data.length === 0) {
    return new Error('#N/A');
  }

  const sortedBins = bins.sort((a, b) => a - b);
  const freq = new Array(sortedBins.length + 1).fill(0);

  for (const value of data) {
    let i = 0;
    while (i < sortedBins.length && value > sortedBins[i]) {
      i++;
    }
    freq[i]++;
  }

  return freq;
};

/**
 * PERCENTRANK - Returns percent rank (inclusive)
 * Alias for PERCENTRANK.INC
 * 
 * @example
 * =PERCENTRANK({1,2,3,4,5}, 3) → 0.5
 * =PERCENTRANK({10,20,30,40,50}, 35) → 0.625 (interpolated)
 */
export const PERCENTRANK: FormulaFunction = (array, x, significance) => {
  return PERCENTRANK_INC(array, x, significance);
};

/**
 * PERCENTRANK.INC - Returns percent rank of value in dataset (inclusive)
 * 
 * Returns the rank of a value in a data set as a percentage (0 to 1) of the data set.
 * Uses inclusive method: values can be exactly 0 (minimum) or 1 (maximum).
 * Interpolates between data points if value is not exact match.
 * 
 * @param array - Array or range of numeric values
 * @param x - Value to find rank for
 * @param significance - (optional) Number of significant digits (default: 3)
 * 
 * @example
 * =PERCENTRANK.INC({1,2,3,4,5}, 3) → 0.5
 * =PERCENTRANK.INC({1,2,3,4,5}, 3.5) → 0.625
 * =PERCENTRANK.INC({10,20,30,40,50}, 25, 2) → 0.38
 */
export const PERCENTRANK_INC: FormulaFunction = (array, x, significance = 3) => {
  const xNum = toNumber(x);
  if (xNum instanceof Error) return xNum;

  const sig = toNumber(significance);
  if (sig instanceof Error) return sig;

  if (sig < 1) {
    return new Error('#NUM!');
  }

  const nums = filterNumbers(flattenArray([array]));
  
  if (nums.length === 0) {
    return new Error('#N/A');
  }

  const sorted = nums.slice().sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  // Check if value is within range
  if (xNum < min || xNum > max) {
    return new Error('#N/A');
  }

  // If exact match, calculate position
  const exactIndex = sorted.indexOf(xNum);
  if (exactIndex !== -1) {
    const percentRank = exactIndex / (sorted.length - 1);
    return roundToSignificance(percentRank, sig);
  }

  // Interpolate between two nearest values
  let lowerIndex = 0;
  let upperIndex = sorted.length - 1;

  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i] < xNum && sorted[i + 1] > xNum) {
      lowerIndex = i;
      upperIndex = i + 1;
      break;
    }
  }

  const lowerValue = sorted[lowerIndex];
  const upperValue = sorted[upperIndex];
  const lowerRank = lowerIndex / (sorted.length - 1);
  const upperRank = upperIndex / (sorted.length - 1);

  // Linear interpolation
  const ratio = (xNum - lowerValue) / (upperValue - lowerValue);
  const percentRank = lowerRank + ratio * (upperRank - lowerRank);

  return roundToSignificance(percentRank, sig);
};

/**
 * PERCENTRANK.EXC - Returns percent rank of value in dataset (exclusive)
 * 
 * Returns the rank of a value in a data set as a percentage of the data set.
 * Uses exclusive method: values cannot be exactly 0 or 1 (min/max are excluded).
 * Interpolates between data points if value is not exact match.
 * 
 * @param array - Array or range of numeric values
 * @param x - Value to find rank for
 * @param significance - (optional) Number of significant digits (default: 3)
 * 
 * @example
 * =PERCENTRANK.EXC({1,2,3,4,5}, 3) → 0.5
 * =PERCENTRANK.EXC({1,2,3,4,5}, 1) → #N/A (min excluded)
 * =PERCENTRANK.EXC({1,2,3,4,5}, 5) → #N/A (max excluded)
 */
export const PERCENTRANK_EXC: FormulaFunction = (array, x, significance = 3) => {
  const xNum = toNumber(x);
  if (xNum instanceof Error) return xNum;

  const sig = toNumber(significance);
  if (sig instanceof Error) return sig;

  if (sig < 1) {
    return new Error('#NUM!');
  }

  const nums = filterNumbers(flattenArray([array]));
  
  if (nums.length < 2) {
    return new Error('#N/A');
  }

  const sorted = nums.slice().sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  // Exclusive: value cannot be min or max
  if (xNum <= min || xNum >= max) {
    return new Error('#N/A');
  }

  // Find position between values
  let lowerIndex = 0;
  let upperIndex = sorted.length - 1;

  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i] <= xNum && sorted[i + 1] >= xNum) {
      lowerIndex = i;
      upperIndex = i + 1;
      break;
    }
  }

  const lowerValue = sorted[lowerIndex];
  const upperValue = sorted[upperIndex];
  
  // Use n+1 for exclusive method
  const lowerRank = (lowerIndex + 1) / (sorted.length + 1);
  const upperRank = (upperIndex + 1) / (sorted.length + 1);

  // Linear interpolation
  const ratio = (xNum - lowerValue) / (upperValue - lowerValue);
  const percentRank = lowerRank + ratio * (upperRank - lowerRank);

  return roundToSignificance(percentRank, sig);
};

/**
 * Helper function to round to specified significance
 * @param value - Value to round
 * @param significance - Number of decimal places
 */
function roundToSignificance(value: number, significance: number): number {
  const multiplier = Math.pow(10, significance);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * COUNT - Count numbers
 */
export const COUNT: FormulaFunction = (...values) => {
  return filterNumbers(flattenArray(values)).length;
};

/**
 * COUNTA - Count non-empty values
 */
export const COUNTA: FormulaFunction = (...values) => {
  const flattened = flattenArray(values);
  return flattened.filter(v => v !== null && v !== undefined && v !== '').length;
};

/**
 * COUNTBLANK - Count blank cells
 * 
 * IMPORTANT: Excel only counts truly empty cells (null/undefined) as blank.
 * Empty strings "" are NOT considered blank.
 */
export const COUNTBLANK: FormulaFunction = (range) => {
  const flattened = flattenArray([range]);
  // Only count null and undefined as blank, NOT empty strings
  return flattened.filter(v => v === null || v === undefined).length;
};

/**
 * Conditional aggregation functions
 */

import { parseCriteria, matchesCriteria } from '../../utils/criteria-utils';

/**
 * COUNTIF - Count cells that meet a criteria
 * @param range - The range to evaluate
 * @param criteria - The criteria (string, number, or comparison)
 */
export const COUNTIF: FormulaFunction = (range, criteria) => {
  if (range === null || range === undefined) {
    return new Error('#VALUE!');
  }

  const parsed = parseCriteria(criteria);
  if (parsed instanceof Error) return parsed;

  const values = flattenArray([range]);
  let count = 0;

  for (const value of values) {
    if (matchesCriteria(value, parsed)) {
      count++;
    }
  }

  return count;
};

/**
 * SUMIF - Sum cells that meet a criteria
 * @param range - The range to evaluate
 * @param criteria - The criteria (string, number, or comparison)
 * @param sumRange - Optional range to sum (if different from range)
 */
export const SUMIF: FormulaFunction = (range, criteria, sumRange?) => {
  if (range === null || range === undefined) {
    return new Error('#VALUE!');
  }

  const parsed = parseCriteria(criteria);
  if (parsed instanceof Error) return parsed;

  const rangeValues = flattenArray([range]);
  const sumValues = sumRange ? flattenArray([sumRange]) : rangeValues;

  // Validate range sizes match
  if (sumRange && rangeValues.length !== sumValues.length) {
    return new Error('#VALUE!');
  }

  let sum = 0;

  for (let i = 0; i < rangeValues.length; i++) {
    if (matchesCriteria(rangeValues[i], parsed)) {
      const val = toNumber(sumValues[i]);
      if (!(val instanceof Error)) {
        sum += val;
      }
    }
  }

  return sum;
};

/**
 * AVERAGEIF - Average cells that meet a criteria
 * @param range - The range to evaluate
 * @param criteria - The criteria (string, number, or comparison)
 * @param averageRange - Optional range to average (if different from range)
 */
export const AVERAGEIF: FormulaFunction = (range, criteria, averageRange?) => {
  if (range === null || range === undefined) {
    return new Error('#VALUE!');
  }

  const parsed = parseCriteria(criteria);
  if (parsed instanceof Error) return parsed;

  const rangeValues = flattenArray([range]);
  const avgValues = averageRange ? flattenArray([averageRange]) : rangeValues;

  // Validate range sizes match
  if (averageRange && rangeValues.length !== avgValues.length) {
    return new Error('#VALUE!');
  }

  let sum = 0;
  let count = 0;

  for (let i = 0; i < rangeValues.length; i++) {
    if (matchesCriteria(rangeValues[i], parsed)) {
      const val = toNumber(avgValues[i]);
      if (!(val instanceof Error)) {
        sum += val;
        count++;
      }
    }
  }

  if (count === 0) {
    return new Error('#DIV/0!');
  }

  return sum / count;
};

/**
 * COUNTIFS - Counts cells that meet multiple criteria across multiple ranges
 * 
 * @param args - Alternating criteria_range and criteria pairs (at least 2 args required)
 * @returns Number of cells that meet ALL criteria (AND logic)
 * 
 * @example
 * =COUNTIFS(A1:A10, ">5", B1:B10, "North")
 * // Counts rows where A > 5 AND B = "North"
 * 
 * @example
 * =COUNTIFS(sales, ">1000", region, "North", product, "Widget*")
 * // Counts rows matching all three conditions
 */
export const COUNTIFS: FormulaFunction = (...args: FormulaValue[]): number | Error => {
  // Must have even number of arguments (range-criteria pairs)
  if (args.length < 2 || args.length % 2 !== 0) {
    return new Error('#VALUE!');
  }

  const numPairs = args.length / 2;
  const criteriaRanges: any[][] = [];
  const parsedCriteria: ParsedCriteria[] = [];

  // Parse all range-criteria pairs
  for (let i = 0; i < numPairs; i++) {
    const rangeArg = args[i * 2];
    const criteriaArg = args[i * 2 + 1];

    if (rangeArg instanceof Error) return rangeArg;
    if (criteriaArg instanceof Error) return criteriaArg;

    // Flatten range to 1D array
    const rangeValues = Array.isArray(rangeArg)
      ? flattenArray(rangeArg)
      : [rangeArg];

    criteriaRanges.push(rangeValues);

    // Parse criteria
    const criteria = typeof criteriaArg === 'string' ? criteriaArg : String(criteriaArg);
    const parsed = parseCriteria(criteria);
    if (parsed instanceof Error) return parsed;
    parsedCriteria.push(parsed);
  }

  // Validate all ranges have the same size
  const firstSize = criteriaRanges[0].length;
  for (let i = 1; i < criteriaRanges.length; i++) {
    if (criteriaRanges[i].length !== firstSize) {
      return new Error('#VALUE!');
    }
  }

  // Count rows where ALL criteria match (AND logic)
  let count = 0;
  for (let row = 0; row < firstSize; row++) {
    let allMatch = true;
    
    for (let criteriaIdx = 0; criteriaIdx < numPairs; criteriaIdx++) {
      const value = criteriaRanges[criteriaIdx][row];
      if (!matchesCriteria(value, parsedCriteria[criteriaIdx])) {
        allMatch = false;
        break;
      }
    }
    
    if (allMatch) {
      count++;
    }
  }

  return count;
};

/**
 * SUMIFS - Sums cells that meet multiple criteria across multiple ranges
 * 
 * @param args - sum_range, followed by alternating criteria_range and criteria pairs
 * @returns Sum of cells in sum_range where ALL criteria are met (AND logic)
 * 
 * @example
 * =SUMIFS(D1:D10, A1:A10, ">5", B1:B10, "North")
 * // Sums D where A > 5 AND B = "North"
 * 
 * @example
 * =SUMIFS(salesColumn, regionColumn, "North", productColumn, "Widget*", amountColumn, ">5000")
 * // Total sales above 5000 for widgets in North region
 */
export const SUMIFS: FormulaFunction = (...args: FormulaValue[]): number | Error => {
  // Must have odd number of arguments: sum_range + (range-criteria pairs)
  if (args.length < 3 || args.length % 2 === 0) {
    return new Error('#VALUE!');
  }

  const sumRangeArg = args[0];
  if (sumRangeArg instanceof Error) return sumRangeArg;

  // Flatten sum range to 1D array
  const sumValues = Array.isArray(sumRangeArg)
    ? flattenArray(sumRangeArg)
    : [sumRangeArg];

  const numPairs = (args.length - 1) / 2;
  const criteriaRanges: any[][] = [];
  const parsedCriteria: ParsedCriteria[] = [];

  // Parse all range-criteria pairs
  for (let i = 0; i < numPairs; i++) {
    const rangeArg = args[1 + i * 2];
    const criteriaArg = args[1 + i * 2 + 1];

    if (rangeArg instanceof Error) return rangeArg;
    if (criteriaArg instanceof Error) return criteriaArg;

    // Flatten range to 1D array
    const rangeValues = Array.isArray(rangeArg)
      ? flattenArray(rangeArg)
      : [rangeArg];

    criteriaRanges.push(rangeValues);

    // Parse criteria
    const criteria = typeof criteriaArg === 'string' ? criteriaArg : String(criteriaArg);
    const parsed = parseCriteria(criteria);
    if (parsed instanceof Error) return parsed;
    parsedCriteria.push(parsed);
  }

  // Validate all ranges have the same size as sum_range
  const firstSize = sumValues.length;
  for (let i = 0; i < criteriaRanges.length; i++) {
    if (criteriaRanges[i].length !== firstSize) {
      return new Error('#VALUE!');
    }
  }

  // Sum rows where ALL criteria match (AND logic)
  let sum = 0;
  for (let row = 0; row < firstSize; row++) {
    let allMatch = true;
    
    for (let criteriaIdx = 0; criteriaIdx < numPairs; criteriaIdx++) {
      const value = criteriaRanges[criteriaIdx][row];
      if (!matchesCriteria(value, parsedCriteria[criteriaIdx])) {
        allMatch = false;
        break;
      }
    }
    
    if (allMatch) {
      const val = toNumber(sumValues[row]);
      if (!(val instanceof Error)) {
        sum += val;
      }
    }
  }

  return sum;
};

/**
 * AVERAGEIFS - Averages cells that meet multiple criteria across multiple ranges
 * 
 * @param args - average_range, followed by alternating criteria_range and criteria pairs
 * @returns Average of cells in average_range where ALL criteria are met (AND logic)
 * 
 * @example
 * =AVERAGEIFS(D1:D10, A1:A10, ">5", B1:B10, "North")
 * // Averages D where A > 5 AND B = "North"
 * 
 * @example
 * =AVERAGEIFS(priceColumn, regionColumn, "West", categoryColumn, "Electronics", stockColumn, ">0")
 * // Average price of in-stock electronics in West region
 */
export const AVERAGEIFS: FormulaFunction = (...args: FormulaValue[]): number | Error => {
  // Must have odd number of arguments: average_range + (range-criteria pairs)
  if (args.length < 3 || args.length % 2 === 0) {
    return new Error('#VALUE!');
  }

  const avgRangeArg = args[0];
  if (avgRangeArg instanceof Error) return avgRangeArg;

  // Flatten average range to 1D array
  const avgValues = Array.isArray(avgRangeArg)
    ? flattenArray(avgRangeArg)
    : [avgRangeArg];

  const numPairs = (args.length - 1) / 2;
  const criteriaRanges: any[][] = [];
  const parsedCriteria: ParsedCriteria[] = [];

  // Parse all range-criteria pairs
  for (let i = 0; i < numPairs; i++) {
    const rangeArg = args[1 + i * 2];
    const criteriaArg = args[1 + i * 2 + 1];

    if (rangeArg instanceof Error) return rangeArg;
    if (criteriaArg instanceof Error) return criteriaArg;

    // Flatten range to 1D array
    const rangeValues = Array.isArray(rangeArg)
      ? flattenArray(rangeArg)
      : [rangeArg];

    criteriaRanges.push(rangeValues);

    // Parse criteria
    const criteria = typeof criteriaArg === 'string' ? criteriaArg : String(criteriaArg);
    const parsed = parseCriteria(criteria);
    if (parsed instanceof Error) return parsed;
    parsedCriteria.push(parsed);
  }

  // Validate all ranges have the same size as average_range
  const firstSize = avgValues.length;
  for (let i = 0; i < criteriaRanges.length; i++) {
    if (criteriaRanges[i].length !== firstSize) {
      return new Error('#VALUE!');
    }
  }

  // Average rows where ALL criteria match (AND logic)
  let sum = 0;
  let count = 0;
  
  for (let row = 0; row < firstSize; row++) {
    let allMatch = true;
    
    for (let criteriaIdx = 0; criteriaIdx < numPairs; criteriaIdx++) {
      const value = criteriaRanges[criteriaIdx][row];
      if (!matchesCriteria(value, parsedCriteria[criteriaIdx])) {
        allMatch = false;
        break;
      }
    }
    
    if (allMatch) {
      const val = toNumber(avgValues[row]);
      if (!(val instanceof Error)) {
        sum += val;
        count++;
      }
    }
  }

  if (count === 0) {
    return new Error('#DIV/0!');
  }

  return sum / count;
};

/**
 * MAXIFS - Finds maximum value that meets multiple criteria across multiple ranges
 * 
 * @param args - max_range, followed by alternating criteria_range and criteria pairs
 * @returns Maximum value in max_range where ALL criteria are met (AND logic)
 * 
 * @example
 * =MAXIFS(D1:D10, A1:A10, ">5", B1:B10, "North")
 * // Maximum D where A > 5 AND B = "North"
 * 
 * @example
 * =MAXIFS(salesColumn, regionColumn, "West", productColumn, "Widget*", statusColumn, "Active")
 * // Maximum sales for active widgets in West region
 */
export const MAXIFS: FormulaFunction = (...args: FormulaValue[]): number | Error => {
  // Must have odd number of arguments: max_range + (range-criteria pairs)
  if (args.length < 3 || args.length % 2 === 0) {
    return new Error('#VALUE!');
  }

  const maxRangeArg = args[0];
  if (maxRangeArg instanceof Error) return maxRangeArg;

  // Flatten max range to 1D array
  const maxValues = Array.isArray(maxRangeArg)
    ? flattenArray(maxRangeArg)
    : [maxRangeArg];

  const numPairs = (args.length - 1) / 2;
  const criteriaRanges: any[][] = [];
  const parsedCriteria: ParsedCriteria[] = [];

  // Parse all range-criteria pairs
  for (let i = 0; i < numPairs; i++) {
    const rangeArg = args[1 + i * 2];
    const criteriaArg = args[1 + i * 2 + 1];

    if (rangeArg instanceof Error) return rangeArg;
    if (criteriaArg instanceof Error) return criteriaArg;

    // Flatten range to 1D array
    const rangeValues = Array.isArray(rangeArg)
      ? flattenArray(rangeArg)
      : [rangeArg];

    criteriaRanges.push(rangeValues);

    // Parse criteria
    const criteria = typeof criteriaArg === 'string' ? criteriaArg : String(criteriaArg);
    const parsed = parseCriteria(criteria);
    if (parsed instanceof Error) return parsed;
    parsedCriteria.push(parsed);
  }

  // Validate all ranges have the same size as max_range
  const firstSize = maxValues.length;
  for (let i = 0; i < criteriaRanges.length; i++) {
    if (criteriaRanges[i].length !== firstSize) {
      return new Error('#VALUE!');
    }
  }

  // Find maximum among rows where ALL criteria match (AND logic)
  let max: number | null = null;
  
  for (let row = 0; row < firstSize; row++) {
    let allMatch = true;
    
    for (let criteriaIdx = 0; criteriaIdx < numPairs; criteriaIdx++) {
      const value = criteriaRanges[criteriaIdx][row];
      if (!matchesCriteria(value, parsedCriteria[criteriaIdx])) {
        allMatch = false;
        break;
      }
    }
    
    if (allMatch) {
      const val = toNumber(maxValues[row]);
      if (!(val instanceof Error)) {
        if (max === null || val > max) {
          max = val;
        }
      }
    }
  }

  if (max === null) {
    return new Error('#VALUE!');
  }

  return max;
};

/**
 * MINIFS - Finds minimum value that meets multiple criteria across multiple ranges
 * 
 * @param args - min_range, followed by alternating criteria_range and criteria pairs
 * @returns Minimum value in min_range where ALL criteria are met (AND logic)
 * 
 * @example
 * =MINIFS(D1:D10, A1:A10, ">5", B1:B10, "North")
 * // Minimum D where A > 5 AND B = "North"
 * 
 * @example
 * =MINIFS(priceColumn, categoryColumn, "Electronics", stockColumn, ">10", ratingColumn, ">=4")
 * // Minimum price of well-rated, well-stocked electronics
 */
export const MINIFS: FormulaFunction = (...args: FormulaValue[]): number | Error => {
  // Must have odd number of arguments: min_range + (range-criteria pairs)
  if (args.length < 3 || args.length % 2 === 0) {
    return new Error('#VALUE!');
  }

  const minRangeArg = args[0];
  if (minRangeArg instanceof Error) return minRangeArg;

  // Flatten min range to 1D array
  const minValues = Array.isArray(minRangeArg)
    ? flattenArray(minRangeArg)
    : [minRangeArg];

  const numPairs = (args.length - 1) / 2;
  const criteriaRanges: any[][] = [];
  const parsedCriteria: ParsedCriteria[] = [];

  // Parse all range-criteria pairs
  for (let i = 0; i < numPairs; i++) {
    const rangeArg = args[1 + i * 2];
    const criteriaArg = args[1 + i * 2 + 1];

    if (rangeArg instanceof Error) return rangeArg;
    if (criteriaArg instanceof Error) return criteriaArg;

    // Flatten range to 1D array
    const rangeValues = Array.isArray(rangeArg)
      ? flattenArray(rangeArg)
      : [rangeArg];

    criteriaRanges.push(rangeValues);

    // Parse criteria
    const criteria = typeof criteriaArg === 'string' ? criteriaArg : String(criteriaArg);
    const parsed = parseCriteria(criteria);
    if (parsed instanceof Error) return parsed;
    parsedCriteria.push(parsed);
  }

  // Validate all ranges have the same size as min_range
  const firstSize = minValues.length;
  for (let i = 0; i < criteriaRanges.length; i++) {
    if (criteriaRanges[i].length !== firstSize) {
      return new Error('#VALUE!');
    }
  }

  // Find minimum among rows where ALL criteria match (AND logic)
  let min: number | null = null;
  
  for (let row = 0; row < firstSize; row++) {
    let allMatch = true;
    
    for (let criteriaIdx = 0; criteriaIdx < numPairs; criteriaIdx++) {
      const value = criteriaRanges[criteriaIdx][row];
      if (!matchesCriteria(value, parsedCriteria[criteriaIdx])) {
        allMatch = false;
        break;
      }
    }
    
    if (allMatch) {
      const val = toNumber(minValues[row]);
      if (!(val instanceof Error)) {
        if (min === null || val < min) {
          min = val;
        }
      }
    }
  }

  if (min === null) {
    return new Error('#VALUE!');
  }

  return min;
};

// ============================================================================
// CORRELATION AND REGRESSION FUNCTIONS (Week 8 Day 2-3)
// ============================================================================

/**
 * Helper function to validate two arrays have same length and extract numbers
 */
function validatePairedArrays(array1: FormulaValue, array2: FormulaValue): { x: number[]; y: number[] } | Error {
  // filterNumbers already calls flattenArray internally, so we don't need to wrap in extra array
  // Just ensure we have arrays before passing to filterNumbers
  const x = filterNumbers(Array.isArray(array1) ? array1 : [array1]);
  const y = filterNumbers(Array.isArray(array2) ? array2 : [array2]);
  
  if (x.length === 0 || y.length === 0) {
    return new Error('#N/A');
  }
  
  if (x.length !== y.length) {
    return new Error('#N/A');
  }
  
  return { x, y };
}

/**
 * PEARSON - Pearson correlation coefficient
 * Alias for CORREL
 * 
 * @example
 * =PEARSON({1, 2, 3, 4, 5}, {2, 4, 6, 8, 10}) → 1.0 (perfect positive)
 */
export const PEARSON: FormulaFunction = (array1, array2) => {
  return CORREL(array1, array2);
};

/**
 * RSQ - R-squared (coefficient of determination)
 * Returns the square of the Pearson correlation coefficient.
 * Represents the proportion of variance in Y explained by X.
 * Range: 0 (no relationship) to 1 (perfect relationship)
 * 
 * @example
 * =RSQ({1, 2, 3, 4, 5}, {2, 4, 6, 8, 10}) → 1.0 (perfect fit)
 */
export const RSQ: FormulaFunction = (knownYs, knownXs) => {
  const r = CORREL(knownYs, knownXs);
  if (r instanceof Error) return r;
  return (r as number) * (r as number);
};

/**
 * SLOPE - Slope of linear regression line
 * Returns the slope of the linear regression line through data points.
 * 
 * @example
 * =SLOPE({2, 4, 6, 8}, {1, 2, 3, 4}) → 2.0
 */
export const SLOPE: FormulaFunction = (knownYs, knownXs) => {
  // NOTE: validatePairedArrays returns {x, y} from (param1, param2)
  // So we need to pass (knownXs, knownYs) to get x from X and y from Y
  const validated = validatePairedArrays(knownXs, knownYs);
  if (validated instanceof Error) return validated;
  
  const { x: xs, y: ys } = validated;
  const n = xs.length;
  
  if (n < 2) {
    return new Error('#DIV/0!');
  }
  
  const meanX = xs.reduce((sum, val) => sum + val, 0) / n;
  const meanY = ys.reduce((sum, val) => sum + val, 0) / n;
  
  let sumXY = 0;
  let sumX2 = 0;
  
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    sumXY += dx * dy;
    sumX2 += dx * dx;
  }
  
  if (sumX2 === 0) {
    return new Error('#DIV/0!');
  }
  
  return sumXY / sumX2;
};

/**
 * INTERCEPT - Y-intercept of linear regression line
 * Returns the point where the line crosses the Y axis.
 * 
 * @example
 * =INTERCEPT({2, 4, 6, 8}, {1, 2, 3, 4}) → 0.0
 */
export const INTERCEPT: FormulaFunction = (knownYs, knownXs) => {
  const slope = SLOPE(knownYs, knownXs);
  if (slope instanceof Error) return slope;
  
  // NOTE: validatePairedArrays returns {x, y} from (param1, param2)
  // So we need to pass (knownXs, knownYs) to get x from X and y from Y
  const validated = validatePairedArrays(knownXs, knownYs);
  if (validated instanceof Error) return validated;
  
  const { x: xs, y: ys } = validated;
  const n = xs.length;
  
  const meanX = xs.reduce((sum, val) => sum + val, 0) / n;
  const meanY = ys.reduce((sum, val) => sum + val, 0) / n;
  
  return meanY - (slope as number) * meanX;
};

/**
 * FORECAST.LINEAR - Predict value using linear regression
 * Returns a predicted Y value for a given X using linear regression.
 * 
 * @example
 * =FORECAST.LINEAR(5, {2, 4, 6, 8}, {1, 2, 3, 4}) → 10.0
 */
export const FORECAST_LINEAR: FormulaFunction = (x, knownYs, knownXs) => {
  const xNum = toNumber(x);
  if (xNum instanceof Error) return xNum;
  
  const slope = SLOPE(knownYs, knownXs);
  if (slope instanceof Error) return slope;
  
  const intercept = INTERCEPT(knownYs, knownXs);
  if (intercept instanceof Error) return intercept;
  
  return (slope as number) * xNum + (intercept as number);
};

/**
 * FORECAST - Predict value using linear regression
 * Alias for FORECAST.LINEAR (for Excel 2016+ compatibility)
 */
export const FORECAST: FormulaFunction = (x, knownYs, knownXs) => {
  return FORECAST_LINEAR(x, knownYs, knownXs);
};

/**
 * STEYX - Standard error of predicted Y
 * Returns the standard error of the predicted y-value for each x in the regression.
 * 
 * @example
 * =STEYX({2, 4, 6, 8}, {1, 2, 3, 4}) → 0.0 (perfect fit)
 */
export const STEYX: FormulaFunction = (knownYs, knownXs) => {
  // NOTE: validatePairedArrays returns {x, y} from (param1, param2)
  // So we need to pass (knownXs, knownYs) to get x from X and y from Y
  const validated = validatePairedArrays(knownXs, knownYs);
  if (validated instanceof Error) return validated;
  
  const { x: xs, y: ys } = validated;
  const n = xs.length;
  
  if (n < 3) {
    return new Error('#DIV/0!');
  }
  
  const slope = SLOPE(knownYs, knownXs);
  if (slope instanceof Error) return slope;
  
  const intercept = INTERCEPT(knownYs, knownXs);
  if (intercept instanceof Error) return intercept;
  
  // Calculate sum of squared errors
  let sumSquaredErrors = 0;
  for (let i = 0; i < n; i++) {
    const predicted = (slope as number) * xs[i] + (intercept as number);
    const error = ys[i] - predicted;
    sumSquaredErrors += error * error;
  }
  
  return Math.sqrt(sumSquaredErrors / (n - 2));
};

/**
 * TREND - Fit values to linear trend
 * Returns values along a linear trend line.
 * 
 * @example
 * =TREND({2, 4, 6, 8}, {1, 2, 3, 4}, {5, 6}) → {10, 12}
 */
export const TREND: FormulaFunction = (knownYs, knownXs, newXs?, constB?) => {
  // Get slope and intercept
  const slope = SLOPE(knownYs, knownXs);
  if (slope instanceof Error) return slope;
  
  const intercept = INTERCEPT(knownYs, knownXs);
  if (intercept instanceof Error) return intercept;
  
  // If no new X values provided, use known X values
  let xValues: number[];
  if (newXs === undefined || newXs === null) {
    // NOTE: validatePairedArrays returns {x, y} from (param1, param2)
    // So we need to pass (knownXs, knownYs) to get x from X and y from Y
    const validated = validatePairedArrays(knownXs, knownYs);
    if (validated instanceof Error) return validated;
    xValues = validated.x;
  } else {
    xValues = filterNumbers(Array.isArray(newXs) ? newXs : [newXs]);
    if (xValues.length === 0) {
      return new Error('#VALUE!');
    }
  }
  
  // Calculate predictions
  const predictions = xValues.map(x => (slope as number) * x + (intercept as number));
  
  return predictions.length === 1 ? predictions[0] : predictions;
};

// ============================================================================
// Week 11 Day 5: Statistical Distribution Functions - Helper Functions
// ============================================================================

/**
 * Error function (erf) - Used for normal distribution calculations
 * Uses Abramowitz and Stegun approximation (maximum error: 1.5×10⁻⁷)
 */
function erf(x: number): number {
  // Coefficients for Abramowitz and Stegun approximation
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;
  
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  
  return sign * y;
}

/**
 * Complementary error function (erfc)
 */
function erfc(x: number): number {
  return 1.0 - erf(x);
}

/**
 * Standard normal cumulative distribution function (Φ)
 */
function standardNormalCDF(z: number): number {
  return 0.5 * (1.0 + erf(z / Math.sqrt(2)));
}

/**
 * Standard normal probability density function (φ)
 */
function standardNormalPDF(z: number): number {
  return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
}

/**
 * Inverse of standard normal CDF using rational approximation
 * Beasley-Springer-Moro algorithm
 */
function inverseStandardNormalCDF(p: number): number {
  if (p <= 0 || p >= 1) {
    return p <= 0 ? -Infinity : Infinity;
  }
  
  // Coefficients for rational approximation
  const a = [
    -3.969683028665376e+01,
     2.209460984245205e+02,
    -2.759285104469687e+02,
     1.383577518672690e+02,
    -3.066479806614716e+01,
     2.506628277459239e+00
  ];
  
  const b = [
    -5.447609879822406e+01,
     1.615858368580409e+02,
    -1.556989798598866e+02,
     6.680131188771972e+01,
    -1.328068155288572e+01
  ];
  
  const c = [
    -7.784894002430432e-03,
    -3.223964580411365e-01,
    -2.400758277161838e+00,
    -2.549732539343734e+00,
     4.374664141464968e+00,
     2.938163982698783e+00
  ];
  
  const d = [
     7.784695709041462e-03,
     3.224671290700398e-01,
     2.445134137142996e+00,
     3.754408661907416e+00
  ];
  
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  
  let q: number, r: number, x: number;
  
  if (p < pLow) {
    // Rational approximation for lower region
    q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    // Rational approximation for central region
    q = p - 0.5;
    r = q * q;
    x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
        (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    // Rational approximation for upper region
    q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
         ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  
  return x;
}

/**
 * Binomial coefficient C(n, k) = n! / (k! * (n-k)!)
 * Uses multiplicative formula for better numerical stability
 */
function binomialCoefficient(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  
  // Take advantage of symmetry: C(n,k) = C(n,n-k)
  k = Math.min(k, n - k);
  
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = result * (n - i) / (i + 1);
  }
  
  return result;
}

/**
 * Natural logarithm of factorial using Stirling's approximation
 * More numerically stable for large values
 */
function logFactorial(n: number): number {
  if (n <= 1) return 0;
  if (n === 2) return Math.log(2);
  if (n === 3) return Math.log(6);
  if (n === 4) return Math.log(24);
  if (n === 5) return Math.log(120);
  
  // Stirling's approximation: ln(n!) ≈ n*ln(n) - n + 0.5*ln(2πn)
  return n * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI * n);
}

/**
 * Factorial function for smaller values
 */
function factorial(n: number): number {
  if (n <= 1) return 1;
  if (n > 170) return Infinity; // Overflow protection
  
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

// ============================================================================
// Week 11 Day 5: Normal Distribution Functions
// ============================================================================

/**
 * NORM.DIST - Returns the normal distribution
 * 
 * Syntax: NORM.DIST(x, mean, standard_dev, cumulative)
 * 
 * @param x - Value for which you want the distribution
 * @param mean - Arithmetic mean of the distribution
 * @param standard_dev - Standard deviation of the distribution (must be > 0)
 * @param cumulative - TRUE = cumulative distribution (CDF), FALSE = probability density (PDF)
 * @returns Normal distribution value
 * 
 * Examples:
 * - NORM.DIST(42, 40, 1.5, TRUE) → 0.9087888 (cumulative probability)
 * - NORM.DIST(42, 40, 1.5, FALSE) → 0.10934005 (probability density)
 * - NORM.DIST(40, 40, 1.5, TRUE) → 0.5 (mean is at 50th percentile)
 * 
 * Notes:
 * - CDF: Probability that random variable ≤ x
 * - PDF: Probability density at x (height of bell curve)
 * - Standard deviation must be positive
 */
export function NORM_DIST(x: any, mean: any, standard_dev: any, cumulative: any): FormulaValue {
  const xVal = toNumber(x);
  const meanVal = toNumber(mean);
  const stdDev = toNumber(standard_dev);
  
  if (xVal instanceof Error) return xVal;
  if (meanVal instanceof Error) return meanVal;
  if (stdDev instanceof Error) return stdDev;
  
  if (stdDev <= 0) {
    return new Error('#NUM!');
  }
  
  const cumulativeBool = toBoolean(cumulative);
  if (cumulativeBool instanceof Error) return cumulativeBool;
  
  // Standardize: z = (x - μ) / σ
  const z = (xVal - meanVal) / stdDev;
  
  if (cumulativeBool) {
    // Cumulative distribution function (CDF)
    return standardNormalCDF(z);
  } else {
    // Probability density function (PDF)
    const pdf = standardNormalPDF(z) / stdDev;
    return pdf;
  }
}

/**
 * NORM.INV - Returns the inverse of the normal cumulative distribution
 * 
 * Syntax: NORM.INV(probability, mean, standard_dev)
 * 
 * @param probability - Probability corresponding to the normal distribution (0 < p < 1)
 * @param mean - Arithmetic mean of the distribution
 * @param standard_dev - Standard deviation of the distribution (must be > 0)
 * @returns Value x such that NORM.DIST(x, mean, standard_dev, TRUE) = probability
 * 
 * Examples:
 * - NORM.INV(0.9087888, 40, 1.5) → 42 (approximately)
 * - NORM.INV(0.5, 100, 10) → 100 (median equals mean)
 * - NORM.INV(0.975, 0, 1) → 1.96 (95th percentile of standard normal)
 * 
 * Notes:
 * - Used to find critical values for confidence intervals
 * - Probability must be strictly between 0 and 1
 */
export function NORM_INV(probability: any, mean: any, standard_dev: any): FormulaValue {
  const p = toNumber(probability);
  const meanVal = toNumber(mean);
  const stdDev = toNumber(standard_dev);
  
  if (p instanceof Error) return p;
  if (meanVal instanceof Error) return meanVal;
  if (stdDev instanceof Error) return stdDev;
  
  if (p <= 0 || p >= 1) {
    return new Error('#NUM!');
  }
  
  if (stdDev <= 0) {
    return new Error('#NUM!');
  }
  
  // Get z-score from standard normal inverse
  const z = inverseStandardNormalCDF(p);
  
  // Transform back: x = μ + σ*z
  return meanVal + stdDev * z;
}

/**
 * NORM.S.DIST - Returns the standard normal distribution (mean=0, std=1)
 * 
 * Syntax: NORM.S.DIST(z, cumulative)
 * 
 * @param z - Value for which you want the distribution
 * @param cumulative - TRUE = CDF, FALSE = PDF
 * @returns Standard normal distribution value
 * 
 * Examples:
 * - NORM.S.DIST(1.96, TRUE) → 0.975 (97.5th percentile)
 * - NORM.S.DIST(0, TRUE) → 0.5 (mean is at 50th percentile)
 * - NORM.S.DIST(0, FALSE) → 0.3989423 (peak of bell curve)
 * - NORM.S.DIST(-1.96, TRUE) → 0.025 (2.5th percentile)
 * 
 * Notes:
 * - Standard normal has μ=0, σ=1
 * - Used for z-scores and standard statistical tables
 * - ±1.96 captures 95% of distribution
 */
export function NORM_S_DIST(z: any, cumulative: any): FormulaValue {
  const zVal = toNumber(z);
  if (zVal instanceof Error) return zVal;
  
  const cumulativeBool = toBoolean(cumulative);
  if (cumulativeBool instanceof Error) return cumulativeBool;
  
  if (cumulativeBool) {
    // Cumulative distribution function
    return standardNormalCDF(zVal);
  } else {
    // Probability density function
    return standardNormalPDF(zVal);
  }
}

/**
 * NORM.S.INV - Returns the inverse of the standard normal cumulative distribution
 * 
 * Syntax: NORM.S.INV(probability)
 * 
 * @param probability - Probability corresponding to the normal distribution (0 < p < 1)
 * @returns Z-score such that NORM.S.DIST(z, TRUE) = probability
 * 
 * Examples:
 * - NORM.S.INV(0.975) → 1.96 (for 95% confidence interval)
 * - NORM.S.INV(0.5) → 0 (median of standard normal)
 * - NORM.S.INV(0.025) → -1.96
 * - NORM.S.INV(0.95) → 1.645 (for 90% confidence interval)
 * 
 * Notes:
 * - Returns z-scores for statistical tests
 * - Commonly used critical values: 1.645 (90%), 1.96 (95%), 2.576 (99%)
 */
export function NORM_S_INV(probability: any): FormulaValue {
  const p = toNumber(probability);
  if (p instanceof Error) return p;
  
  if (p <= 0 || p >= 1) {
    return new Error('#NUM!');
  }
  
  return inverseStandardNormalCDF(p);
}

// ============================================================================
// Week 11 Day 5: Binomial Distribution Functions
// ============================================================================

/**
 * BINOM.DIST - Returns the individual term binomial distribution probability
 * 
 * Syntax: BINOM.DIST(number_s, trials, probability_s, cumulative)
 * 
 * @param number_s - Number of successes in trials (integer, 0 ≤ number_s ≤ trials)
 * @param trials - Number of independent trials (integer, > 0)
 * @param probability_s - Probability of success on each trial (0 ≤ p ≤ 1)
 * @param cumulative - TRUE = CDF (≤ number_s), FALSE = PMF (exactly number_s)
 * @returns Binomial probability
 * 
 * Examples:
 * - BINOM.DIST(6, 10, 0.5, FALSE) → 0.205078125 (exactly 6 heads in 10 flips)
 * - BINOM.DIST(6, 10, 0.5, TRUE) → 0.828125 (6 or fewer heads)
 * - BINOM.DIST(0, 10, 0.1, FALSE) → 0.3486784401 (no successes)
 * 
 * Notes:
 * - PMF: P(X=k) = C(n,k) * p^k * (1-p)^(n-k)
 * - CDF: P(X≤k) = Σ(i=0 to k) PMF(i)
 * - Used for yes/no experiments with fixed probability
 */
export function BINOM_DIST(number_s: any, trials: any, probability_s: any, cumulative: any): FormulaValue {
  const k = toNumber(number_s);
  const n = toNumber(trials);
  const p = toNumber(probability_s);
  
  if (k instanceof Error) return k;
  if (n instanceof Error) return n;
  if (p instanceof Error) return p;
  
  // Validate parameters
  if (k < 0 || k > n || Math.floor(k) !== k) {
    return new Error('#NUM!');
  }
  
  if (n < 0 || Math.floor(n) !== n) {
    return new Error('#NUM!');
  }
  
  if (p < 0 || p > 1) {
    return new Error('#NUM!');
  }
  
  const cumulativeBool = toBoolean(cumulative);
  if (cumulativeBool instanceof Error) return cumulativeBool;
  
  if (cumulativeBool) {
    // Cumulative distribution: P(X ≤ k)
    let sum = 0;
    for (let i = 0; i <= k; i++) {
      const coef = binomialCoefficient(n, i);
      sum += coef * Math.pow(p, i) * Math.pow(1 - p, n - i);
    }
    return sum;
  } else {
    // Probability mass function: P(X = k)
    const coef = binomialCoefficient(n, k);
    return coef * Math.pow(p, k) * Math.pow(1 - p, n - k);
  }
}

/**
 * BINOM.INV - Returns the smallest value for which cumulative binomial distribution ≥ alpha
 * 
 * Syntax: BINOM.INV(trials, probability_s, alpha)
 * 
 * @param trials - Number of Bernoulli trials (integer, ≥ 0)
 * @param probability_s - Probability of success on each trial (0 ≤ p ≤ 1)
 * @param alpha - Criterion value (0 ≤ α ≤ 1)
 * @returns Smallest integer k such that P(X ≤ k) ≥ alpha
 * 
 * Examples:
 * - BINOM.INV(100, 0.5, 0.95) → 58 (95th percentile)
 * - BINOM.INV(10, 0.5, 0.5) → 5 (median)
 * - BINOM.INV(20, 0.3, 0.9) → 9
 * 
 * Notes:
 * - Used to find critical values for binomial tests
 * - Returns the inverse of cumulative binomial distribution
 */
export function BINOM_INV(trials: any, probability_s: any, alpha: any): FormulaValue {
  const n = toNumber(trials);
  const p = toNumber(probability_s);
  const a = toNumber(alpha);
  
  if (n instanceof Error) return n;
  if (p instanceof Error) return p;
  if (a instanceof Error) return a;
  
  if (n < 0 || Math.floor(n) !== n) {
    return new Error('#NUM!');
  }
  
  if (p < 0 || p > 1) {
    return new Error('#NUM!');
  }
  
  if (a < 0 || a > 1) {
    return new Error('#NUM!');
  }
  
  // Find smallest k where CDF(k) >= alpha
  let cumulative = 0;
  for (let k = 0; k <= n; k++) {
    const coef = binomialCoefficient(n, k);
    cumulative += coef * Math.pow(p, k) * Math.pow(1 - p, n - k);
    
    if (cumulative >= a) {
      return k;
    }
  }
  
  return n;
}

// ============================================================================
// Week 11 Day 5: Poisson Distribution Functions
// ============================================================================

/**
 * POISSON.DIST - Returns the Poisson distribution
 * 
 * Syntax: POISSON.DIST(x, mean, cumulative)
 * 
 * @param x - Number of events (integer, ≥ 0)
 * @param mean - Expected numeric value (λ, must be > 0)
 * @param cumulative - TRUE = CDF (≤ x events), FALSE = PMF (exactly x events)
 * @returns Poisson probability
 * 
 * Examples:
 * - POISSON.DIST(2, 5, FALSE) → 0.084224 (exactly 2 events when expecting 5)
 * - POISSON.DIST(2, 5, TRUE) → 0.124652 (2 or fewer events)
 * - POISSON.DIST(5, 5, FALSE) → 0.1755 (mode of distribution)
 * 
 * Notes:
 * - PMF: P(X=k) = (λ^k * e^(-λ)) / k!
 * - Used for counting rare events over time/space
 * - Mean equals variance in Poisson distribution
 */
export function POISSON_DIST(x: any, mean: any, cumulative: any): FormulaValue {
  const k = toNumber(x);
  const lambda = toNumber(mean);
  
  if (k instanceof Error) return k;
  if (lambda instanceof Error) return lambda;
  
  if (k < 0 || Math.floor(k) !== k) {
    return new Error('#NUM!');
  }
  
  if (lambda <= 0) {
    return new Error('#NUM!');
  }
  
  const cumulativeBool = toBoolean(cumulative);
  if (cumulativeBool instanceof Error) return cumulativeBool;
  
  if (cumulativeBool) {
    // Cumulative distribution: P(X ≤ k)
    let sum = 0;
    for (let i = 0; i <= k; i++) {
      sum += Math.exp(-lambda + i * Math.log(lambda) - logFactorial(i));
    }
    return sum;
  } else {
    // Probability mass function: P(X = k)
    // Using log for numerical stability: e^(-λ + k*ln(λ) - ln(k!))
    return Math.exp(-lambda + k * Math.log(lambda) - logFactorial(k));
  }
}

/**
 * POISSON - Legacy Poisson distribution (compatibility with Excel 2007)
 * 
 * Syntax: POISSON(x, mean, cumulative)
 * 
 * @param x - Number of events
 * @param mean - Expected value
 * @param cumulative - TRUE = CDF, FALSE = PMF
 * @returns Poisson probability
 * 
 * Notes:
 * - Same as POISSON.DIST, maintained for backward compatibility
 */
export function POISSON(x: any, mean: any, cumulative: any): FormulaValue {
  return POISSON_DIST(x, mean, cumulative);
}

// ============================================================================
// Week 11 Day 5: Exponential Distribution Functions
// ============================================================================

/**
 * EXPON.DIST - Returns the exponential distribution
 * 
 * Syntax: EXPON.DIST(x, lambda, cumulative)
 * 
 * @param x - Value of the function (must be ≥ 0)
 * @param lambda - Parameter value (rate, must be > 0)
 * @param cumulative - TRUE = CDF, FALSE = PDF
 * @returns Exponential distribution value
 * 
 * Examples:
 * - EXPON.DIST(0.2, 10, TRUE) → 0.864665 (cumulative probability)
 * - EXPON.DIST(0.2, 10, FALSE) → 1.353353 (probability density)
 * - EXPON.DIST(0, 1, FALSE) → 1 (PDF at x=0)
 * 
 * Notes:
 * - PDF: f(x) = λ * e^(-λx)
 * - CDF: F(x) = 1 - e^(-λx)
 * - Models time between events in Poisson process
 * - Memoryless property: P(X > s+t | X > s) = P(X > t)
 */
export function EXPON_DIST(x: any, lambda: any, cumulative: any): FormulaValue {
  const xVal = toNumber(x);
  const lambdaVal = toNumber(lambda);
  
  if (xVal instanceof Error) return xVal;
  if (lambdaVal instanceof Error) return lambdaVal;
  
  if (xVal < 0) {
    return new Error('#NUM!');
  }
  
  if (lambdaVal <= 0) {
    return new Error('#NUM!');
  }
  
  const cumulativeBool = toBoolean(cumulative);
  if (cumulativeBool instanceof Error) return cumulativeBool;
  
  if (cumulativeBool) {
    // Cumulative distribution function: F(x) = 1 - e^(-λx)
    return 1 - Math.exp(-lambdaVal * xVal);
  } else {
    // Probability density function: f(x) = λ * e^(-λx)
    return lambdaVal * Math.exp(-lambdaVal * xVal);
  }
}

/**
 * EXPONDIST - Legacy exponential distribution (compatibility with Excel 2007)
 * 
 * Syntax: EXPONDIST(x, lambda, cumulative)
 * 
 * @param x - Value of the function
 * @param lambda - Parameter value
 * @param cumulative - TRUE = CDF, FALSE = PDF
 * @returns Exponential distribution value
 * 
 * Notes:
 * - Same as EXPON.DIST, maintained for backward compatibility
 */
export function EXPONDIST(x: any, lambda: any, cumulative: any): FormulaValue {
  return EXPON_DIST(x, lambda, cumulative);
}

// ============================================================================
// Week 11 Day 7: A-Variant Statistical Functions
// ============================================================================

/**
 * Helper to convert value to number with A-variant logic
 * TRUE → 1, FALSE → 0, text → 0, empty → skip
 */
function toNumberA(value: FormulaValue): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'string') return 0; // Text treated as 0
  if (typeof value === 'number') return value;
  return null;
}

/**
 * MAXA - Maximum value including text and logical values
 * 
 * Syntax: MAXA(value1, [value2], ...)
 * 
 * @param values - Values to find maximum from
 * @returns Maximum value (TRUE=1, FALSE/text=0, empty=ignored)
 * 
 * Examples:
 * - MAXA(5, 10, TRUE, FALSE, "text", 3) → 10
 * - MAXA(TRUE, TRUE, TRUE) → 1
 * - MAXA(FALSE, "text", -1) → 0
 * 
 * Notes:
 * - Unlike MAX, includes logical and text values
 * - TRUE counted as 1, FALSE and text as 0
 * - Empty cells ignored
 */
export const MAXA: FormulaFunction = (...values) => {
  const flattened = flattenArray(values);
  const nums: number[] = [];
  
  for (const val of flattened) {
    const num = toNumberA(val);
    if (num !== null) nums.push(num);
  }
  
  if (nums.length === 0) {
    return new Error('#VALUE!');
  }
  
  return Math.max(...nums);
};

/**
 * MINA - Minimum value including text and logical values
 * 
 * Syntax: MINA(value1, [value2], ...)
 * 
 * @param values - Values to find minimum from
 * @returns Minimum value (TRUE=1, FALSE/text=0, empty=ignored)
 * 
 * Examples:
 * - MINA(5, 10, TRUE, FALSE, "text", 3) → 0
 * - MINA(10, 20, TRUE) → 1
 * - MINA(5, 10, 15) → 5
 * 
 * Notes:
 * - Unlike MIN, includes logical and text values
 * - TRUE counted as 1, FALSE and text as 0
 */
export const MINA: FormulaFunction = (...values) => {
  const flattened = flattenArray(values);
  const nums: number[] = [];
  
  for (const val of flattened) {
    const num = toNumberA(val);
    if (num !== null) nums.push(num);
  }
  
  if (nums.length === 0) {
    return new Error('#VALUE!');
  }
  
  return Math.min(...nums);
};

/**
 * STDEVA - Sample standard deviation including text and logical values
 * 
 * Syntax: STDEVA(value1, [value2], ...)
 * 
 * @param values - Sample values
 * @returns Sample standard deviation (TRUE=1, FALSE/text=0)
 * 
 * Examples:
 * - STDEVA(1, 2, 3, TRUE, FALSE) → calculates with {1, 2, 3, 1, 0}
 * 
 * Notes:
 * - Uses n-1 denominator (sample)
 * - Includes logical and text values
 */
export const STDEVA: FormulaFunction = (...values) => {
  const flattened = flattenArray(values);
  const nums: number[] = [];
  
  for (const val of flattened) {
    const num = toNumberA(val);
    if (num !== null) nums.push(num);
  }
  
  if (nums.length < 2) {
    return new Error('#DIV/0!');
  }
  
  const { m2, count } = welfordVariance(nums);
  return Math.sqrt(m2 / (count - 1));
};

/**
 * STDEVPA - Population standard deviation including text and logical values
 * 
 * Syntax: STDEVPA(value1, [value2], ...)
 * 
 * @param values - Population values
 * @returns Population standard deviation (TRUE=1, FALSE/text=0)
 * 
 * Examples:
 * - STDEVPA(1, 2, 3, TRUE, FALSE) → calculates with {1, 2, 3, 1, 0}
 * 
 * Notes:
 * - Uses n denominator (population)
 * - Includes logical and text values
 */
export const STDEVPA: FormulaFunction = (...values) => {
  const flattened = flattenArray(values);
  const nums: number[] = [];
  
  for (const val of flattened) {
    const num = toNumberA(val);
    if (num !== null) nums.push(num);
  }
  
  if (nums.length === 0) {
    return new Error('#DIV/0!');
  }
  
  const { m2, count } = welfordVariance(nums);
  return Math.sqrt(m2 / count);
};

/**
 * VARA - Sample variance including text and logical values
 * 
 * Syntax: VARA(value1, [value2], ...)
 * 
 * @param values - Sample values
 * @returns Sample variance (TRUE=1, FALSE/text=0)
 * 
 * Examples:
 * - VARA(1, 2, 3, TRUE, FALSE) → calculates with {1, 2, 3, 1, 0}
 * 
 * Notes:
 * - Uses n-1 denominator (sample)
 * - Includes logical and text values
 */
export const VARA: FormulaFunction = (...values) => {
  const flattened = flattenArray(values);
  const nums: number[] = [];
  
  for (const val of flattened) {
    const num = toNumberA(val);
    if (num !== null) nums.push(num);
  }
  
  if (nums.length < 2) {
    return new Error('#DIV/0!');
  }
  
  const { m2, count } = welfordVariance(nums);
  return m2 / (count - 1);
};

/**
 * VARPA - Population variance including text and logical values
 * 
 * Syntax: VARPA(value1, [value2], ...)
 * 
 * @param values - Population values
 * @returns Population variance (TRUE=1, FALSE/text=0)
 * 
 * Examples:
 * - VARPA(1, 2, 3, TRUE, FALSE) → calculates with {1, 2, 3, 1, 0}
 * 
 * Notes:
 * - Uses n denominator (population)
 * - Includes logical and text values
 */
export const VARPA: FormulaFunction = (...values) => {
  const flattened = flattenArray(values);
  const nums: number[] = [];
  
  for (const val of flattened) {
    const num = toNumberA(val);
    if (num !== null) nums.push(num);
  }
  
  if (nums.length === 0) {
    return new Error('#DIV/0!');
  }
  
  const { m2, count } = welfordVariance(nums);
  return m2 / count;
};

// ============================================================================
// Week 11 Day 7: Additional Statistical Functions
// ============================================================================

/**
 * DEVSQ - Sum of squares of deviations
 * 
 * Syntax: DEVSQ(number1, [number2], ...)
 * 
 * Formula: Σ(x - x̄)²
 * 
 * @param values - Numeric values
 * @returns Sum of squared deviations from mean
 * 
 * Examples:
 * - DEVSQ(1, 2, 3, 4, 5) → 10
 *   // Mean=3, deviations: -2,-1,0,1,2; squares: 4,1,0,1,4; sum=10
 * 
 * Notes:
 * - Related to variance: DEVSQ/n = VAR.P, DEVSQ/(n-1) = VAR.S
 * - Used in ANOVA and regression analysis
 */
export const DEVSQ: FormulaFunction = (...values) => {
  const nums = filterNumbers(flattenArray(values));
  
  if (nums.length === 0) {
    return new Error('#NUM!');
  }
  
  const mean = nums.reduce((sum, val) => sum + val, 0) / nums.length;
  const sumSquares = nums.reduce((sum, val) => {
    const dev = val - mean;
    return sum + dev * dev;
  }, 0);
  
  return sumSquares;
};

/**
 * AVEDEV - Average of absolute deviations
 * 
 * Syntax: AVEDEV(number1, [number2], ...)
 * 
 * Formula: Σ|x - x̄| / n
 * 
 * @param values - Numeric values
 * @returns Average absolute deviation from mean
 * 
 * Examples:
 * - AVEDEV(1, 2, 3, 4, 5) → 1.2
 *   // Mean=3, |deviations|: 2,1,0,1,2; sum=6; avg=6/5=1.2
 * 
 * Notes:
 * - Measures variability (like stdev but uses absolute values)
 * - Less sensitive to outliers than standard deviation
 */
export const AVEDEV: FormulaFunction = (...values) => {
  const nums = filterNumbers(flattenArray(values));
  
  if (nums.length === 0) {
    return new Error('#NUM!');
  }
  
  const mean = nums.reduce((sum, val) => sum + val, 0) / nums.length;
  const sumAbsDev = nums.reduce((sum, val) => sum + Math.abs(val - mean), 0);
  
  return sumAbsDev / nums.length;
};

/**
 * GEOMEAN - Geometric mean
 * 
 * Syntax: GEOMEAN(number1, [number2], ...)
 * 
 * Formula: (x₁ * x₂ * ... * xₙ)^(1/n)
 * 
 * @param values - Numeric values (must be positive)
 * @returns Geometric mean
 * 
 * Examples:
 * - GEOMEAN(2, 8) → 4  // √(2*8) = √16 = 4
 * - GEOMEAN(1, 3, 9, 27) → 5.196  // ⁴√(1*3*9*27) = ⁴√729
 * 
 * Notes:
 * - All values must be positive
 * - Geometric mean ≤ Arithmetic mean (AM-GM inequality)
 * - Used for growth rates and ratios
 */
export const GEOMEAN: FormulaFunction = (...values) => {
  const nums = filterNumbers(flattenArray(values));
  
  if (nums.length === 0) {
    return new Error('#NUM!');
  }
  
  // Check all positive
  for (const num of nums) {
    if (num <= 0) {
      return new Error('#NUM!');
    }
  }
  
  // Use log for numerical stability: exp(Σln(x) / n)
  const sumLogs = nums.reduce((sum, val) => sum + Math.log(val), 0);
  return Math.exp(sumLogs / nums.length);
};

/**
 * HARMEAN - Harmonic mean
 * 
 * Syntax: HARMEAN(number1, [number2], ...)
 * 
 * Formula: n / Σ(1/x)
 * 
 * @param values - Numeric values (must be positive)
 * @returns Harmonic mean
 * 
 * Examples:
 * - HARMEAN(2, 4) → 2.667  // 2 / (1/2 + 1/4) = 2 / 0.75
 * - HARMEAN(1, 2, 4) → 1.714  // 3 / (1 + 0.5 + 0.25)
 * 
 * Notes:
 * - All values must be positive
 * - Harmonic ≤ Geometric ≤ Arithmetic (means inequality)
 * - Used for rates and ratios (e.g., average speed)
 */
export const HARMEAN: FormulaFunction = (...values) => {
  const nums = filterNumbers(flattenArray(values));
  
  if (nums.length === 0) {
    return new Error('#NUM!');
  }
  
  // Check all positive
  for (const num of nums) {
    if (num <= 0) {
      return new Error('#NUM!');
    }
  }
  
  const sumReciprocals = nums.reduce((sum, val) => sum + 1 / val, 0);
  return nums.length / sumReciprocals;
};

/**
 * FISHER - Fisher transformation
 * 
 * Syntax: FISHER(x)
 * 
 * Formula: 0.5 * ln((1 + x) / (1 - x))
 * 
 * @param x - Correlation coefficient (-1 < x < 1)
 * @returns Fisher transformed value
 * 
 * Examples:
 * - FISHER(0.5) → 0.5493
 * - FISHER(0.75) → 0.9730
 * - FISHER(0) → 0
 * 
 * Notes:
 * - Transforms correlation to approximately normal distribution
 * - Used in hypothesis testing for correlations
 * - Inverse: FISHERINV
 */
export const FISHER: FormulaFunction = (x) => {
  const xNum = toNumber(x);
  if (xNum instanceof Error) return xNum;
  
  if (xNum <= -1 || xNum >= 1) {
    return new Error('#NUM!');
  }
  
  return 0.5 * Math.log((1 + xNum) / (1 - xNum));
};

/**
 * FISHERINV - Inverse Fisher transformation
 * 
 * Syntax: FISHERINV(y)
 * 
 * Formula: (e^(2y) - 1) / (e^(2y) + 1)
 * 
 * @param y - Fisher transformed value
 * @returns Correlation coefficient
 * 
 * Examples:
 * - FISHERINV(0.5493) → 0.5
 * - FISHERINV(FISHER(0.75)) → 0.75  // Round-trip
 * - FISHERINV(0) → 0
 * 
 * Notes:
 * - Inverse of FISHER transformation
 * - Result always between -1 and 1
 * - Used to convert back to correlation scale
 */
export const FISHERINV: FormulaFunction = (y) => {
  const yNum = toNumber(y);
  if (yNum instanceof Error) return yNum;
  
  const e2y = Math.exp(2 * yNum);
  return (e2y - 1) / (e2y + 1);
};

/**
 * Helper: Incomplete Beta Function
 * Used for calculating t-distribution, F-distribution, etc.
 * Uses continued fraction approximation for numerical stability
 */
function incompleteBeta(x: number, a: number, b: number): number {
  if (x < 0 || x > 1) return NaN;
  if (x === 0) return 0;
  if (x === 1) return 1;
  
  // Use symmetry relation if x > (a+1)/(a+b+2)
  if (x > (a + 1) / (a + b + 2)) {
    return 1 - incompleteBeta(1 - x, b, a);
  }
  
  // Beta function B(a,b) = Gamma(a)*Gamma(b)/Gamma(a+b)
  const lnBeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta) / a;
  
  // Continued fraction approximation
  const cf = betaContinuedFraction(x, a, b);
  return front * cf;
}

/**
 * Helper: Log Gamma function (Lanczos approximation)
 */
function logGamma(z: number): number {
  const g = 7;
  const coef = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7
  ];
  
  if (z < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  
  z -= 1;
  let x = coef[0];
  for (let i = 1; i < g + 2; i++) {
    x += coef[i] / (z + i);
  }
  
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/**
 * Helper: Continued fraction for incomplete beta
 */
function betaContinuedFraction(x: number, a: number, b: number): number {
  const maxIter = 100;
  const epsilon = 3e-7;
  
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - qab * x / qap;
  
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let h = d;
  
  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    h *= d * c;
    
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    
    if (Math.abs(del - 1) < epsilon) break;
  }
  
  return h;
}

/**
 * Helper: Regularized lower incomplete gamma function P(a,x)
 * P(a,x) = γ(a,x) / Γ(a)
 * This is the CDF of the gamma distribution
 */
function regularizedGammaP(a: number, x: number): number {
  if (x < 0 || a <= 0) {
    return 0;
  }
  
  if (x === 0) {
    return 0;
  }
  
  if (x < a + 1) {
    // Use series representation for x < a+1
    return gammaSeriesP(a, x);
  } else {
    // Use continued fraction for x >= a+1
    return 1 - gammaContinuedFractionQ(a, x);
  }
}

/**
 * Helper: Regularized upper incomplete gamma function Q(a,x)
 * Q(a,x) = Γ(a,x) / Γ(a) = 1 - P(a,x)
 * This is the survival function (right tail) of gamma distribution
 */
function regularizedGammaQ(a: number, x: number): number {
  return 1 - regularizedGammaP(a, x);
}

/**
 * Helper: Series representation for regularized gamma P(a,x)
 */
function gammaSeriesP(a: number, x: number): number {
  const maxIter = 100;
  const epsilon = 3e-7;
  
  // P(a,x) = e^(-x) * x^a * Σ(x^n / (a+n)!) 
  // = e^(-x) * x^a / Γ(a) * Σ(Γ(a)/Γ(a+1+n) * x^n)
  
  let sum = 1 / a;
  let term = 1 / a;
  
  for (let n = 1; n < maxIter; n++) {
    term *= x / (a + n);
    sum += term;
    
    if (Math.abs(term) < Math.abs(sum) * epsilon) {
      break;
    }
  }
  
  // Result: e^(-x + a*ln(x) - ln(Γ(a))) * sum
  return Math.exp(-x + a * Math.log(x) - logGamma(a)) * sum;
}

/**
 * Helper: Continued fraction for regularized gamma Q(a,x)
 */
function gammaContinuedFractionQ(a: number, x: number): number {
  const maxIter = 100;
  const epsilon = 3e-7;
  
  let b = x + 1 - a;
  let c = 1 / 1e-30;
  let d = 1 / b;
  let h = d;
  
  for (let i = 1; i <= maxIter; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    
    if (Math.abs(del - 1) < epsilon) {
      break;
    }
  }
  
  // Result: e^(-x + a*ln(x) - ln(Γ(a))) * h
  return Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}

// ============================================================================
// T-DISTRIBUTION FUNCTIONS (Week 2 Day 1)
// ============================================================================

/**
 * T.DIST - Student's T Distribution
 * Returns the Student's t-distribution
 * 
 * @param x - Value at which to evaluate
 * @param deg_freedom - Degrees of freedom
 * @param cumulative - TRUE for cumulative, FALSE for probability density
 * @returns Probability or density
 * 
 * @example
 * =T.DIST(1.96, 60, TRUE) → 0.9726... (cumulative)
 * =T.DIST(2, 10, FALSE) → 0.0567... (density)
 */
export const T_DIST: FormulaFunction = (x, deg_freedom, cumulative) => {
  const xNum = toNumber(x);
  if (xNum instanceof Error) return xNum;
  
  const df = toNumber(deg_freedom);
  if (df instanceof Error) return df;
  
  const cum = toBoolean(cumulative);
  if (cum instanceof Error) return cum;
  
  // Validate degrees of freedom
  if (df < 1) {
    return new Error('#NUM!');
  }
  
  const dfInt = Math.floor(df);
  
  if (cum) {
    // Cumulative distribution function
    if (xNum === 0) return 0.5;
    
    const t2 = xNum * xNum;
    const xPos = xNum > 0;
    const absX = Math.abs(xNum);
    
    // Use incomplete beta function: P(t < x) = 1 - 0.5 * I(df/(df+t^2); df/2, 1/2)
    const betaArg = dfInt / (dfInt + t2);
    const ibeta = incompleteBeta(betaArg, dfInt / 2, 0.5);
    
    let p = 0.5 * ibeta;
    if (xPos) {
      return 1 - p;
    } else {
      return p;
    }
  } else {
    // Probability density function
    const t2 = xNum * xNum;
    const coef = Math.exp(logGamma((dfInt + 1) / 2) - logGamma(dfInt / 2));
    const denom = Math.sqrt(dfInt * Math.PI) * Math.pow(1 + t2 / dfInt, (dfInt + 1) / 2);
    return coef / denom;
  }
};

/**
 * T.DIST.RT - Right-Tailed Student's T Distribution
 * Returns the right-tailed Student's t-distribution (legacy function)
 * 
 * @param x - Value at which to evaluate
 * @param deg_freedom - Degrees of freedom
 * @returns Right-tail probability
 * 
 * @example
 * =T.DIST.RT(1.96, 60) → 0.0274... (right tail)
 */
export const T_DIST_RT: FormulaFunction = (x, deg_freedom) => {
  const leftTail = T_DIST(x, deg_freedom, true);
  if (leftTail instanceof Error) return leftTail;
  return 1 - (leftTail as number);
};

/**
 * T.DIST.2T - Two-Tailed Student's T Distribution
 * Returns the two-tailed Student's t-distribution
 * 
 * @param x - Value at which to evaluate (must be positive)
 * @param deg_freedom - Degrees of freedom
 * @returns Two-tail probability
 * 
 * @example
 * =T.DIST.2T(1.96, 60) → 0.0548... (two-tailed)
 */
export const T_DIST_2T: FormulaFunction = (x, deg_freedom) => {
  const xNum = toNumber(x);
  if (xNum instanceof Error) return xNum;
  
  if (xNum < 0) {
    return new Error('#NUM!');
  }
  
  const rightTail = T_DIST_RT(xNum, deg_freedom);
  if (rightTail instanceof Error) return rightTail;
  
  return 2 * (rightTail as number);
};

/**
 * T.INV - Inverse of Student's T Distribution
 * Returns the t-value for a given probability
 * 
 * @param probability - Probability (0 to 1)
 * @param deg_freedom - Degrees of freedom
 * @returns T-value
 * 
 * @example
 * =T.INV(0.9726, 60) → 1.96... (approximately)
 */
export const T_INV: FormulaFunction = (probability, deg_freedom) => {
  const p = toNumber(probability);
  if (p instanceof Error) return p;
  
  const df = toNumber(deg_freedom);
  if (df instanceof Error) return df;
  
  // Validate inputs
  if (p <= 0 || p >= 1) {
    return new Error('#NUM!');
  }
  
  if (df < 1) {
    return new Error('#NUM!');
  }
  
  const dfInt = Math.floor(df);
  
  // Newton-Raphson iteration to find x such that T.DIST(x, df, TRUE) = p
  let x = 0; // Initial guess
  
  // Better initial guess based on normal approximation
  if (p < 0.5) {
    x = -Math.sqrt(dfInt * (Math.pow(p * 2, -2 / dfInt) - 1));
  } else {
    x = Math.sqrt(dfInt * (Math.pow((1 - p) * 2, -2 / dfInt) - 1));
  }
  
  const maxIter = 100;
  const tolerance = 1e-10;
  
  for (let i = 0; i < maxIter; i++) {
    const cdf = T_DIST(x, dfInt, true);
    if (cdf instanceof Error) return cdf;
    
    const pdf = T_DIST(x, dfInt, false);
    if (pdf instanceof Error) return pdf;
    
    const error = (cdf as number) - p;
    if (Math.abs(error) < tolerance) break;
    
    // Newton-Raphson step: x_new = x - f(x)/f'(x)
    x = x - error / (pdf as number);
  }
  
  return x;
};

/**
 * T.INV.2T - Two-Tailed Inverse of Student's T Distribution
 * Returns the t-value for a given two-tailed probability
 * 
 * @param probability - Two-tailed probability (0 to 1)
 * @param deg_freedom - Degrees of freedom
 * @returns Positive t-value
 * 
 * @example
 * =T.INV.2T(0.05, 60) → 2.000... (critical value for 5% significance)
 */
export const T_INV_2T: FormulaFunction = (probability, deg_freedom) => {
  const p = toNumber(probability);
  if (p instanceof Error) return p;
  
  if (p <= 0 || p >= 1) {
    return new Error('#NUM!');
  }
  
  // Two-tailed p-value: convert to one-tailed and use positive value
  const oneTailedP = 1 - p / 2;
  return T_INV(oneTailedP, deg_freedom);
};

/**
 * T.TEST - Student's T-Test
 * Returns the probability associated with a Student's t-test
 * 
 * @param array1 - First data set
 * @param array2 - Second data set
 * @param tails - Number of tails (1 or 2)
 * @param type - Type of test (1=paired, 2=equal variance, 3=unequal variance)
 * @returns P-value
 * 
 * @example
 * =T.TEST(A1:A10, B1:B10, 2, 1) → p-value for paired two-tailed test
 */
export const T_TEST: FormulaFunction = (array1, array2, tails, type) => {
  const nums1 = filterNumbers(flattenArray([array1]));
  const nums2 = filterNumbers(flattenArray([array2]));
  
  const tailsNum = toNumber(tails);
  if (tailsNum instanceof Error) return tailsNum;
  
  const typeNum = toNumber(type);
  if (typeNum instanceof Error) return typeNum;
  
  // Validate inputs
  if (nums1.length === 0 || nums2.length === 0) {
    return new Error('#N/A');
  }
  
  if (tailsNum !== 1 && tailsNum !== 2) {
    return new Error('#NUM!');
  }
  
  if (typeNum !== 1 && typeNum !== 2 && typeNum !== 3) {
    return new Error('#NUM!');
  }
  
  const n1 = nums1.length;
  const n2 = nums2.length;
  
  // Calculate means
  const mean1 = nums1.reduce((a, b) => a + b, 0) / n1;
  const mean2 = nums2.reduce((a, b) => a + b, 0) / n2;
  
  let tStat: number;
  let df: number;
  
  if (typeNum === 1) {
    // Paired test
    if (n1 !== n2) {
      return new Error('#N/A');
    }
    
    const diffs = nums1.map((v, i) => v - nums2[i]);
    const meanDiff = diffs.reduce((a, b) => a + b, 0) / n1;
    const varDiff = diffs.reduce((a, b) => a + (b - meanDiff) ** 2, 0) / (n1 - 1);
    const seDiff = Math.sqrt(varDiff / n1);
    
    tStat = meanDiff / seDiff;
    df = n1 - 1;
  } else {
    // Two-sample tests
    const var1 = nums1.reduce((a, b) => a + (b - mean1) ** 2, 0) / (n1 - 1);
    const var2 = nums2.reduce((a, b) => a + (b - mean2) ** 2, 0) / (n2 - 1);
    
    if (typeNum === 2) {
      // Equal variance (pooled)
      const pooledVar = ((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2);
      const se = Math.sqrt(pooledVar * (1 / n1 + 1 / n2));
      tStat = (mean1 - mean2) / se;
      df = n1 + n2 - 2;
    } else {
      // Unequal variance (Welch's t-test)
      const se = Math.sqrt(var1 / n1 + var2 / n2);
      tStat = (mean1 - mean2) / se;
      
      // Welch-Satterthwaite degrees of freedom
      const numerator = (var1 / n1 + var2 / n2) ** 2;
      const denom = (var1 / n1) ** 2 / (n1 - 1) + (var2 / n2) ** 2 / (n2 - 1);
      df = numerator / denom;
    }
  }
  
  // Calculate p-value
  const absTStat = Math.abs(tStat);
  const oneTailP = T_DIST_RT(absTStat, df);
  if (oneTailP instanceof Error) return oneTailP;
  
  if (tailsNum === 1) {
    return oneTailP;
  } else {
    return (oneTailP as number) * 2;
  }
};

// ============================================================================
// F-DISTRIBUTION FUNCTIONS (Week 2 Day 2)
// ============================================================================

/**
 * F.DIST - F Distribution
 * Returns the F probability distribution (variance ratio)
 * 
 * F-distribution is related to Beta distribution:
 * F.DIST(x, d1, d2) = BETA.DIST(d1*x/(d1*x+d2), d1/2, d2/2)
 * 
 * @param x - Value at which to evaluate (must be >= 0)
 * @param deg_freedom1 - Numerator degrees of freedom
 * @param deg_freedom2 - Denominator degrees of freedom
 * @param cumulative - TRUE for CDF, FALSE for PDF
 * @returns Probability or density
 * 
 * @example
 * =F.DIST(15.2069, 6, 4, TRUE) → 0.99 (cumulative)
 * =F.DIST(2, 5, 10, FALSE) → 0.1518... (density)
 */
export const F_DIST: FormulaFunction = (x, deg_freedom1, deg_freedom2, cumulative) => {
  const xNum = toNumber(x);
  if (xNum instanceof Error) return xNum;
  
  const df1 = toNumber(deg_freedom1);
  if (df1 instanceof Error) return df1;
  
  const df2 = toNumber(deg_freedom2);
  if (df2 instanceof Error) return df2;
  
  const cum = toBoolean(cumulative);
  if (cum instanceof Error) return cum;
  
  // Validate inputs
  if (xNum < 0) {
    return new Error('#NUM!');
  }
  
  if (df1 < 1 || df2 < 1) {
    return new Error('#NUM!');
  }
  
  const d1 = Math.floor(df1);
  const d2 = Math.floor(df2);
  
  if (cum) {
    // Cumulative distribution: use Beta distribution relationship
    // F.DIST(x, d1, d2) = BETA.DIST(d1*x/(d1*x+d2), d1/2, d2/2)
    if (xNum === 0) return 0;
    
    const betaX = (d1 * xNum) / (d1 * xNum + d2);
    return incompleteBeta(betaX, d1 / 2, d2 / 2);
  } else {
    // Probability density function
    const a = d1 / 2;
    const b = d2 / 2;
    
    // F-distribution PDF:
    // f(x; d1, d2) = sqrt[(d1*x)^d1 * d2^d2 / (d1*x + d2)^(d1+d2)] / [x * B(d1/2, d2/2)]
    // = (d1/d2)^(d1/2) * x^(d1/2-1) * [d2/(d1*x+d2)]^((d1+d2)/2) / B(d1/2, d2/2)
    //
    // Using logs for numerical stability:
    const logNumer = a * Math.log(d1) - a * Math.log(d2) + (a - 1) * Math.log(xNum) + ((d1 + d2) / 2) * Math.log(d2);
    const logDenom = ((d1 + d2) / 2) * Math.log(d1 * xNum + d2);
    const logBeta = logGamma(a) + logGamma(b) - logGamma(a + b);
    
    return Math.exp(logNumer - logDenom - logBeta);
  }
};

/**
 * F.DIST.RT - Right-Tailed F Distribution
 * Returns the right-tailed F probability distribution
 * 
 * @param x - Value at which to evaluate
 * @param deg_freedom1 - Numerator degrees of freedom
 * @param deg_freedom2 - Denominator degrees of freedom
 * @returns Right-tail probability
 * 
 * @example
 * =F.DIST.RT(15.2069, 6, 4) → 0.01 (approximately)
 */
export const F_DIST_RT: FormulaFunction = (x, deg_freedom1, deg_freedom2) => {
  const leftTail = F_DIST(x, deg_freedom1, deg_freedom2, true);
  if (leftTail instanceof Error) return leftTail;
  return 1 - (leftTail as number);
};

/**
 * F.INV - Inverse of F Distribution
 * Returns the inverse of the F cumulative distribution
 * 
 * Uses Newton-Raphson iteration to solve F.DIST(x, d1, d2) = p
 * 
 * @param probability - Probability (0 to 1)
 * @param deg_freedom1 - Numerator degrees of freedom
 * @param deg_freedom2 - Denominator degrees of freedom
 * @returns F-value
 * 
 * @example
 * =F.INV(0.99, 6, 4) → 15.2069... (approximately)
 */
export const F_INV: FormulaFunction = (probability, deg_freedom1, deg_freedom2) => {
  const p = toNumber(probability);
  if (p instanceof Error) return p;
  
  const df1 = toNumber(deg_freedom1);
  if (df1 instanceof Error) return df1;
  
  const df2 = toNumber(deg_freedom2);
  if (df2 instanceof Error) return df2;
  
  // Validate inputs
  if (p < 0 || p > 1) {
    return new Error('#NUM!');
  }
  
  if (df1 < 1 || df2 < 1) {
    return new Error('#NUM!');
  }
  
  const d1 = Math.floor(df1);
  const d2 = Math.floor(df2);
  
  // Edge cases
  if (p === 0) return 0;
  if (p === 1) return Infinity;
  
  // Use bisection method for robustness (removed median approximation for accuracy)
  let low = 0;
  let high = d2 > 2 ? 10 * (d2 / (d2 - 2)) : 100; // Upper bound estimate
  
  // Ensure high is actually higher than target
  let highCDF = F_DIST(high, d1, d2, true);
  if (highCDF instanceof Error) return highCDF;
  
  while ((highCDF as number) < p && high < 1e10) {
    high *= 10;
    highCDF = F_DIST(high, d1, d2, true);
    if (highCDF instanceof Error) return highCDF;
  }
  
  // Bisection with Newton-Raphson refinement
  const maxIterations = 100;
  const tolerance = 1e-10;
  
  for (let i = 0; i < maxIterations; i++) {
    const mid = (low + high) / 2;
    
    const cdf = F_DIST(mid, d1, d2, true);
    if (cdf instanceof Error) return cdf;
    
    const error = (cdf as number) - p;
    
    if (Math.abs(error) < tolerance) {
      return mid;
    }
    
    // Bisection step
    if (error > 0) {
      high = mid;
    } else {
      low = mid;
    }
    
    // Try Newton-Raphson for faster convergence when close
    if (Math.abs(error) < 0.01 && i > 10) {
      const pdf = F_DIST(mid, d1, d2, false);
      if (pdf instanceof Error) return pdf;
      
      if ((pdf as number) > 1e-10) {
        const newtonStep = mid - error / (pdf as number);
        if (newtonStep > low && newtonStep < high) {
          const newtonCDF = F_DIST(newtonStep, d1, d2, true);
          if (!(newtonCDF instanceof Error) && Math.abs((newtonCDF as number) - p) < Math.abs(error)) {
            // Newton step improved, update bounds
            if ((newtonCDF as number) > p) {
              high = newtonStep;
            } else {
              low = newtonStep;
            }
            continue;
          }
        }
      }
    }
  }
  
  return (low + high) / 2;
};

/**
 * F.INV.RT - Inverse of Right-Tailed F Distribution
 * Returns the inverse of the right-tailed F cumulative distribution
 * 
 * Note: F.INV.RT(p) is NOT equal to 1/F.INV(p)
 * It's the inverse of F.DIST.RT, so F.INV.RT(p) = F.INV(1-p)
 * 
 * @param probability - Right-tail probability (0 to 1)
 * @param deg_freedom1 - Numerator degrees of freedom
 * @param deg_freedom2 - Denominator degrees of freedom
 * @returns F-value
 * 
 * @example
 * =F.INV.RT(0.01, 6, 4) → 15.2069... (approximately)
 */
export const F_INV_RT: FormulaFunction = (probability, deg_freedom1, deg_freedom2) => {
  const p = toNumber(probability);
  if (p instanceof Error) return p;
  
  // F.INV.RT(p) = F.INV(1-p)
  return F_INV(1 - p, deg_freedom1, deg_freedom2);
};

/**
 * F.TEST - F-Test for Equal Variances
 * Returns the two-tailed probability that the variances in two arrays are not significantly different
 * 
 * F = VAR1 / VAR2 (larger variance / smaller variance)
 * p-value = 2 * MIN(F.DIST(F), F.DIST(1/F))
 * 
 * Uses sample variance (division by n-1)
 * 
 * @param array1 - First data array
 * @param array2 - Second data array
 * @returns Two-tailed p-value
 * 
 * @example
 * =F.TEST(A1:A10, B1:B10) → p-value for variance equality test
 */
export const F_TEST: FormulaFunction = (array1, array2) => {
  const nums1 = filterNumbers(flattenArray([array1]));
  const nums2 = filterNumbers(flattenArray([array2]));
  
  // Validate inputs
  if (nums1.length < 2 || nums2.length < 2) {
    return new Error('#DIV/0!');
  }
  
  const n1 = nums1.length;
  const n2 = nums2.length;
  
  // Calculate sample variances (division by n-1)
  const mean1 = nums1.reduce((a, b) => a + b, 0) / n1;
  const mean2 = nums2.reduce((a, b) => a + b, 0) / n2;
  
  const var1 = nums1.reduce((a, b) => a + (b - mean1) ** 2, 0) / (n1 - 1);
  const var2 = nums2.reduce((a, b) => a + (b - mean2) ** 2, 0) / (n2 - 1);
  
  // Handle zero variance
  if (var1 === 0 || var2 === 0) {
    return new Error('#DIV/0!');
  }
  
  // Excel always uses larger variance in numerator
  let F: number;
  let df1: number;
  let df2: number;
  
  if (var1 >= var2) {
    F = var1 / var2;
    df1 = n1 - 1;
    df2 = n2 - 1;
  } else {
    F = var2 / var1;
    df1 = n2 - 1;
    df2 = n1 - 1;
  }
  
  // Two-tailed p-value: 2 * MIN(right-tail, left-tail)
  // right-tail = F.DIST.RT(F, df1, df2)
  const rightTail = F_DIST_RT(F, df1, df2);
  if (rightTail instanceof Error) return rightTail;
  
  // Two-tailed: multiply by 2
  return Math.min(1, 2 * (rightTail as number));
};

// ============================================================================
// CHI-SQUARE DISTRIBUTION FUNCTIONS (Week 2 Day 3)
// ============================================================================

/**
 * CHISQ.DIST - Chi-Square Distribution
 * Returns the chi-square distribution
 * 
 * Chi-Square relationship to Gamma:
 * CHISQ.DIST(x, k) = GAMMA.DIST(x, k/2, 2) 
 * Using regularized gamma: P(k/2, x/2)
 * 
 * @param x - Value at which to evaluate (must be >= 0)
 * @param deg_freedom - Degrees of freedom
 * @param cumulative - TRUE for CDF, FALSE for PDF
 * @returns Probability or density
 * 
 * @example
 * =CHISQ.DIST(2, 1, TRUE) → 0.8427... (cumulative)
 * =CHISQ.DIST(2, 1, FALSE) → 0.1037... (density)
 */
export const CHISQ_DIST: FormulaFunction = (x, deg_freedom, cumulative) => {
  const xNum = toNumber(x);
  if (xNum instanceof Error) return xNum;
  
  const df = toNumber(deg_freedom);
  if (df instanceof Error) return df;
  
  const cum = toBoolean(cumulative);
  if (cum instanceof Error) return cum;
  
  // Validate inputs
  if (xNum < 0) {
    return new Error('#NUM!');
  }
  
  if (df < 1) {
    return new Error('#NUM!');
  }
  
  const k = Math.floor(df);
  
  if (xNum === 0) {
    if (cum) {
      return 0;
    } else {
      // PDF at x=0: 0 for k>2, infinity for k=2, not defined for k<2
      if (k === 2) {
        return 0.5; // lim x→0 of chi-square PDF with k=2
      } else if (k > 2) {
        return 0;
      } else {
        return Infinity;
      }
    }
  }
  
  if (cum) {
    // CDF: P(k/2, x/2) using regularized gamma
    return regularizedGammaP(k / 2, xNum / 2);
  } else {
    // PDF: (1/2^(k/2)) * (1/Γ(k/2)) * x^(k/2-1) * e^(-x/2)
    // Using logs for stability
    const a = k / 2;
    const logPdf = -a * Math.log(2) - logGamma(a) + (a - 1) * Math.log(xNum) - xNum / 2;
    return Math.exp(logPdf);
  }
};

/**
 * CHISQ.DIST.RT - Right-Tailed Chi-Square Distribution
 * Returns the right-tailed chi-square distribution (survival function)
 * 
 * @param x - Value at which to evaluate
 * @param deg_freedom - Degrees of freedom
 * @returns Right-tail probability
 * 
 * @example
 * =CHISQ.DIST.RT(2, 1) → 0.1573... (right tail)
 */
export const CHISQ_DIST_RT: FormulaFunction = (x, deg_freedom) => {
  const xNum = toNumber(x);
  if (xNum instanceof Error) return xNum;
  
  const df = toNumber(deg_freedom);
  if (df instanceof Error) return df;
  
  if (xNum < 0 || df < 1) {
    return new Error('#NUM!');
  }
  
  const k = Math.floor(df);
  
  // Right tail: Q(k/2, x/2) = 1 - P(k/2, x/2)
  return regularizedGammaQ(k / 2, xNum / 2);
};

/**
 * CHISQ.INV - Inverse Chi-Square Distribution
 * Returns the inverse of the left-tailed chi-square distribution
 * 
 * @param probability - Probability (0 to 1)
 * @param deg_freedom - Degrees of freedom
 * @returns Chi-square value
 * 
 * @example
 * =CHISQ.INV(0.95, 10) → 18.307... (approximately)
 */
export const CHISQ_INV: FormulaFunction = (probability, deg_freedom) => {
  const p = toNumber(probability);
  if (p instanceof Error) return p;
  
  const df = toNumber(deg_freedom);
  if (df instanceof Error) return df;
  
  // Validate inputs
  if (p < 0 || p > 1) {
    return new Error('#NUM!');
  }
  
  if (df < 1) {
    return new Error('#NUM!');
  }
  
  const k = Math.floor(df);
  
  // Edge cases
  if (p === 0) return 0;
  if (p === 1) return Infinity;
  
  // Use bisection method for robustness
  let low = 0;
  let high = k + 10 * Math.sqrt(k); // Upper bound estimate based on df
  
  // Ensure high is actually higher than target
  let highCDF = CHISQ_DIST(high, k, true);
  if (highCDF instanceof Error) return highCDF;
  
  while ((highCDF as number) < p && high < 1e10) {
    high *= 2;
    highCDF = CHISQ_DIST(high, k, true);
    if (highCDF instanceof Error) return highCDF;
  }
  
  // Bisection
  const maxIterations = 100;
  const tolerance = 1e-10;
  
  for (let i = 0; i < maxIterations; i++) {
    const mid = (low + high) / 2;
    
    const cdf = CHISQ_DIST(mid, k, true);
    if (cdf instanceof Error) return cdf;
    
    const error = (cdf as number) - p;
    
    if (Math.abs(error) < tolerance) {
      return mid;
    }
    
    if (error > 0) {
      high = mid;
    } else {
      low = mid;
    }
  }
  
  return (low + high) / 2;
};

/**
 * CHISQ.INV.RT - Inverse Right-Tailed Chi-Square Distribution
 * Returns the inverse of the right-tailed chi-square distribution
 * 
 * Note: CHISQ.INV.RT(p) = CHISQ.INV(1-p)
 * 
 * @param probability - Right-tail probability (0 to 1)
 * @param deg_freedom - Degrees of freedom
 * @returns Chi-square value
 * 
 * @example
 * =CHISQ.INV.RT(0.05, 10) → 18.307... (approximately)
 */
export const CHISQ_INV_RT: FormulaFunction = (probability, deg_freedom) => {
  const p = toNumber(probability);
  if (p instanceof Error) return p;
  
  // CHISQ.INV.RT(p) = CHISQ.INV(1-p)
  return CHISQ_INV(1 - p, deg_freedom);
};

/**
 * CHISQ.TEST - Chi-Square Test for Independence
 * Returns the chi-square test statistic and p-value
 * 
 * Formula:
 * χ² = Σ((observed - expected)² / expected)
 * df = count - 1
 * p-value = CHISQ.DIST.RT(χ², df)
 * 
 * @param actual_range - Array of observed values
 * @param expected_range - Array of expected values
 * @returns P-value for the chi-square test
 * 
 * @example
 * =CHISQ.TEST(A1:A5, B1:B5) → p-value for goodness of fit
 */
export const CHISQ_TEST: FormulaFunction = (actual_range, expected_range) => {
  const actual = filterNumbers(flattenArray([actual_range]));
  const expected = filterNumbers(flattenArray([expected_range]));
  
  // Validate inputs
  if (actual.length === 0 || expected.length === 0) {
    return new Error('#N/A');
  }
  
  if (actual.length !== expected.length) {
    return new Error('#N/A');
  }
  
  // Check for zero or negative expected values
  for (const exp of expected) {
    if (exp <= 0) {
      return new Error('#DIV/0!');
    }
  }
  
  // Calculate chi-square statistic: Σ((O-E)²/E)
  let chiSq = 0;
  for (let i = 0; i < actual.length; i++) {
    const diff = actual[i] - expected[i];
    chiSq += (diff * diff) / expected[i];
  }
  
  // Degrees of freedom
  const df = actual.length - 1;
  
  if (df < 1) {
    return new Error('#DIV/0!');
  }
  
  // P-value: right-tail probability
  return CHISQ_DIST_RT(chiSq, df);
};

// =============================================================================
// GAMMA DISTRIBUTION FAMILY
// =============================================================================

/**
 * GAMMA.DIST - Gamma Distribution
 * Returns the gamma distribution CDF or PDF
 * 
 * @param x - Value at which to evaluate the distribution
 * @param alpha - Shape parameter (k)
 * @param beta - Scale parameter (θ)
 * @param cumulative - TRUE for CDF, FALSE for PDF
 * @returns Gamma distribution value
 * 
 * @example
 * =GAMMA.DIST(10, 9, 2, TRUE) → 0.0679... (CDF)
 * =GAMMA.DIST(10, 9, 2, FALSE) → 0.0325... (PDF)
 * 
 * Mathematical form:
 * CDF: P(k, x/θ) using regularizedGammaP
 * PDF: (1/(Γ(k)θ^k)) * x^(k-1) * e^(-x/θ)
 */
export const GAMMA_DIST: FormulaFunction = (x, alpha, beta, cumulative) => {
  const xNum = toNumber(x);
  if (xNum instanceof Error) return xNum;
  
  const alphaNum = toNumber(alpha);
  if (alphaNum instanceof Error) return alphaNum;
  
  const betaNum = toNumber(beta);
  if (betaNum instanceof Error) return betaNum;
  
  const cum = toBoolean(cumulative);
  if (cum instanceof Error) return cum;
  
  // Validate inputs
  if (xNum < 0) {
    return new Error('#NUM!');
  }
  
  if (alphaNum <= 0 || betaNum <= 0) {
    return new Error('#NUM!');
  }
  
  if (xNum === 0) {
    if (cum) {
      return 0;
    } else {
      // PDF at x=0
      if (alphaNum < 1) {
        return Infinity;
      } else if (alphaNum === 1) {
        return 1 / betaNum;
      } else {
        return 0;
      }
    }
  }
  
  if (cum) {
    // CDF: P(α, x/β) using regularized gamma
    return regularizedGammaP(alphaNum, xNum / betaNum);
  } else {
    // PDF: (1/(Γ(α)β^α)) * x^(α-1) * e^(-x/β)
    // Using logs for stability
    const logPdf = -logGamma(alphaNum) - alphaNum * Math.log(betaNum) + 
                   (alphaNum - 1) * Math.log(xNum) - xNum / betaNum;
    return Math.exp(logPdf);
  }
};

/**
 * GAMMA.INV - Inverse Gamma Distribution
 * Returns the inverse of the gamma cumulative distribution
 * 
 * @param probability - Probability corresponding to the distribution
 * @param alpha - Shape parameter (k)
 * @param beta - Scale parameter (θ)
 * @returns Value x such that GAMMA.DIST(x, alpha, beta, TRUE) = probability
 * 
 * @example
 * =GAMMA.INV(0.0679, 9, 2) → 10... (approximately)
 * 
 * Uses bisection method with adaptive bounds
 */
export const GAMMA_INV: FormulaFunction = (probability, alpha, beta) => {
  const p = toNumber(probability);
  if (p instanceof Error) return p;
  
  const alphaNum = toNumber(alpha);
  if (alphaNum instanceof Error) return alphaNum;
  
  const betaNum = toNumber(beta);
  if (betaNum instanceof Error) return betaNum;
  
  // Validate inputs
  if (p < 0 || p > 1) {
    return new Error('#NUM!');
  }
  
  if (alphaNum <= 0 || betaNum <= 0) {
    return new Error('#NUM!');
  }
  
  // Edge cases
  if (p === 0) return 0;
  if (p === 1) return Infinity;
  
  // Initial bounds for bisection
  // Mean of gamma = α*β, use this for estimation
  const mean = alphaNum * betaNum;
  const stdDev = Math.sqrt(alphaNum) * betaNum;
  
  let low = 0;
  let high = mean + 10 * stdDev;
  
  // Ensure high is actually above target
  let highCDF = GAMMA_DIST(high, alphaNum, betaNum, true);
  while (typeof highCDF === 'number' && highCDF < p) {
    high *= 2;
    highCDF = GAMMA_DIST(high, alphaNum, betaNum, true);
  }
  
  // Bisection method
  const tolerance = 1e-10;
  const maxIterations = 100;
  
  for (let i = 0; i < maxIterations; i++) {
    const mid = (low + high) / 2;
    const midCDF = GAMMA_DIST(mid, alphaNum, betaNum, true);
    
    if (typeof midCDF !== 'number') {
      return new Error('#NUM!');
    }
    
    const error = midCDF - p;
    
    if (Math.abs(error) < tolerance) {
      return mid;
    }
    
    if (error < 0) {
      low = mid;
    } else {
      high = mid;
    }
    
    if (high - low < tolerance) {
      return mid;
    }
  }
  
  return (low + high) / 2;
};

/**
 * LOGNORM.DIST - Log-Normal Distribution
 * Returns the lognormal cumulative distribution or density
 * 
 * @param x - Value at which to evaluate the distribution
 * @param mean - Mean of ln(x)
 * @param standard_dev - Standard deviation of ln(x)
 * @param cumulative - TRUE for CDF, FALSE for PDF
 * @returns Log-normal distribution value
 * 
 * @example
 * =LOGNORM.DIST(4, 3.5, 1.2, TRUE) → 0.0390... (CDF)
 * 
 * Mathematical form:
 * If Y = ln(X), then Y ~ Normal(μ, σ)
 * CDF: Φ((ln(x) - μ) / σ) where Φ is standard normal CDF
 * PDF: (1/(x*σ*√(2π))) * e^(-(ln(x)-μ)²/(2σ²))
 */
export const LOGNORM_DIST: FormulaFunction = (x, mean, standard_dev, cumulative) => {
  const xNum = toNumber(x);
  if (xNum instanceof Error) return xNum;
  
  const meanNum = toNumber(mean);
  if (meanNum instanceof Error) return meanNum;
  
  const stdNum = toNumber(standard_dev);
  if (stdNum instanceof Error) return stdNum;
  
  const cum = toBoolean(cumulative);
  if (cum instanceof Error) return cum;
  
  // Validate inputs
  if (xNum <= 0) {
    return new Error('#NUM!');
  }
  
  if (stdNum <= 0) {
    return new Error('#NUM!');
  }
  
  const lnX = Math.log(xNum);
  const z = (lnX - meanNum) / stdNum;
  
  if (cum) {
    // CDF: Use standard normal CDF (Φ)
    // Φ(z) = 0.5 * (1 + erf(z / √2))
    const erfArg = z / Math.SQRT2;
    const cdf = 0.5 * (1 + erf(erfArg));
    return cdf;
  } else {
    // PDF: (1/(x*σ*√(2π))) * e^(-z²/2)
    const coefficient = 1 / (xNum * stdNum * Math.sqrt(2 * Math.PI));
    const exponent = Math.exp(-z * z / 2);
    return coefficient * exponent;
  }
};

/**
 * LOGNORM.INV - Inverse Log-Normal Distribution
 * Returns the inverse of the lognormal cumulative distribution
 * 
 * @param probability - Probability corresponding to the distribution
 * @param mean - Mean of ln(x)
 * @param standard_dev - Standard deviation of ln(x)
 * @returns Value x such that LOGNORM.DIST(x, mean, std_dev, TRUE) = probability
 * 
 * @example
 * =LOGNORM.INV(0.0390, 3.5, 1.2) → 4... (approximately)
 * 
 * Mathematical form:
 * x = e^(μ + σ*Φ^(-1)(p))
 * where Φ^(-1) is inverse standard normal
 */
export const LOGNORM_INV: FormulaFunction = (probability, mean, standard_dev) => {
  const p = toNumber(probability);
  if (p instanceof Error) return p;
  
  const meanNum = toNumber(mean);
  if (meanNum instanceof Error) return meanNum;
  
  const stdNum = toNumber(standard_dev);
  if (stdNum instanceof Error) return stdNum;
  
  // Validate inputs
  if (p <= 0 || p >= 1) {
    return new Error('#NUM!');
  }
  
  if (stdNum <= 0) {
    return new Error('#NUM!');
  }
  
  // Inverse standard normal using rational approximation (Beasley-Springer-Moro)
  const inversePhi = (prob: number): number => {
    const a0 = 2.50662823884;
    const a1 = -18.61500062529;
    const a2 = 41.39119773534;
    const a3 = -25.44106049637;
    
    const b0 = -8.47351093090;
    const b1 = 23.08336743743;
    const b2 = -21.06224101826;
    const b3 = 3.13082909833;
    
    const c0 = 0.3374754822726147;
    const c1 = 0.9761690190917186;
    const c2 = 0.1607979714918209;
    const c3 = 0.0276438810333863;
    const c4 = 0.0038405729373609;
    const c5 = 0.0003951896511919;
    const c6 = 0.0000321767881768;
    const c7 = 0.0000002888167364;
    const c8 = 0.0000003960315187;
    
    let y = prob - 0.5;
    
    if (Math.abs(y) < 0.42) {
      const r = y * y;
      return y * (((a3 * r + a2) * r + a1) * r + a0) /
             ((((b3 * r + b2) * r + b1) * r + b0) * r + 1);
    } else {
      let r = prob;
      if (y > 0) r = 1 - prob;
      r = Math.log(-Math.log(r));
      const z = c0 + r * (c1 + r * (c2 + r * (c3 + r * (c4 + r * (c5 + r * (c6 + r * (c7 + r * c8)))))));
      if (y < 0) return -z;
      return z;
    }
  };
  
  const z = inversePhi(p);
  const lnX = meanNum + stdNum * z;
  return Math.exp(lnX);
};

/**
 * WEIBULL.DIST - Weibull Distribution
 * Returns the Weibull distribution CDF or PDF
 * 
 * @param x - Value at which to evaluate the distribution
 * @param alpha - Shape parameter (k)
 * @param beta - Scale parameter (λ)
 * @param cumulative - TRUE for CDF, FALSE for PDF
 * @returns Weibull distribution value
 * 
 * @example
 * =WEIBULL.DIST(105, 20, 100, TRUE) → 0.9295... (CDF)
 * =WEIBULL.DIST(105, 20, 100, FALSE) → 0.0350... (PDF)
 * 
 * Mathematical form:
 * CDF: 1 - e^(-(x/λ)^k)
 * PDF: (k/λ) * (x/λ)^(k-1) * e^(-(x/λ)^k)
 */
export const WEIBULL_DIST: FormulaFunction = (x, alpha, beta, cumulative) => {
  const xNum = toNumber(x);
  if (xNum instanceof Error) return xNum;
  
  const alphaNum = toNumber(alpha);
  if (alphaNum instanceof Error) return alphaNum;
  
  const betaNum = toNumber(beta);
  if (betaNum instanceof Error) return betaNum;
  
  const cum = toBoolean(cumulative);
  if (cum instanceof Error) return cum;
  
  // Validate inputs
  if (xNum < 0) {
    return new Error('#NUM!');
  }
  
  if (alphaNum <= 0 || betaNum <= 0) {
    return new Error('#NUM!');
  }
  
  if (xNum === 0) {
    if (cum) {
      return 0;
    } else {
      // PDF at x=0
      if (alphaNum < 1) {
        return Infinity;
      } else if (alphaNum === 1) {
        return 1 / betaNum;
      } else {
        return 0;
      }
    }
  }
  
  const z = xNum / betaNum;
  const zPowK = Math.pow(z, alphaNum);
  
  if (cum) {
    // CDF: 1 - e^(-(x/λ)^k)
    return 1 - Math.exp(-zPowK);
  } else {
    // PDF: (k/λ) * (x/λ)^(k-1) * e^(-(x/λ)^k)
    const coefficient = alphaNum / betaNum;
    const power = Math.pow(z, alphaNum - 1);
    const exponential = Math.exp(-zPowK);
    return coefficient * power * exponential;
  }
};

// =============================================================================
// BETA DISTRIBUTION FAMILY
// =============================================================================

/**
 * BETA.DIST - Beta Distribution
 * Returns the beta probability distribution function
 * 
 * @param x - Value between A and B at which to evaluate
 * @param alpha - First shape parameter (α > 0)
 * @param beta - Second shape parameter (β > 0)
 * @param A - Lower bound (default 0)
 * @param B - Upper bound (default 1)
 * @param cumulative - TRUE for CDF, FALSE for PDF
 * @returns Beta distribution value
 * 
 * @example
 * =BETA.DIST(0.4, 2, 3, 0, 1, TRUE) → 0.4096... (CDF)
 * =BETA.DIST(0.4, 2, 3, 0, 1, FALSE) → 1.536... (PDF)
 * 
 * Mathematical form:
 * CDF: I_x(α, β) using incompleteBeta
 * PDF: (x^(α-1) * (1-x)^(β-1)) / B(α,β)
 */
export const BETA_DIST: FormulaFunction = (...args) => {
  // Handle variable arguments: x, alpha, beta, [A], [B], cumulative
  if (args.length < 4) {
    return new Error('#N/A');
  }
  
  const x = toNumber(args[0]);
  if (x instanceof Error) return x;
  
  const alpha = toNumber(args[1]);
  if (alpha instanceof Error) return alpha;
  
  const beta = toNumber(args[2]);
  if (beta instanceof Error) return beta;
  
  // A and B are optional, defaults are 0 and 1
  let A: number = 0;
  let B: number = 1;
  let cumulativeArg = args[3];
  
  if (args.length >= 6) {
    // All 6 arguments provided: x, alpha, beta, A, B, cumulative
    const AVal = toNumber(args[3]);
    if (AVal instanceof Error) return AVal;
    A = AVal;
    
    const BVal = toNumber(args[4]);
    if (BVal instanceof Error) return BVal;
    B = BVal;
    
    cumulativeArg = args[5];
  } else if (args.length === 5) {
    // 5 arguments: x, alpha, beta, A, cumulative OR x, alpha, beta, B, cumulative
    // Assume it's x, alpha, beta, A, cumulative (more common)
    const fourthArg = toNumber(args[3]);
    if (fourthArg instanceof Error) return fourthArg;
    
    // Check if fourth arg could be cumulative (boolean)
    const fourthVal = args[3];
    if (typeof fourthVal === 'boolean' || fourthVal === 'TRUE' || fourthVal === 'FALSE' || 
        fourthVal === 0 || fourthVal === 1) {
      // It's: x, alpha, beta, cumulative (4 args, treating as BETA.DIST with defaults)
      cumulativeArg = args[3];
    } else {
      // It's: x, alpha, beta, A, cumulative (5 args)
      A = fourthArg;
      cumulativeArg = args[4];
    }
  }
  
  const cum = toBoolean(cumulativeArg);
  if (cum instanceof Error) return cum;
  
  // Validate inputs
  if (alpha <= 0 || beta <= 0) {
    return new Error('#NUM!');
  }
  
  if (A >= B) {
    return new Error('#NUM!');
  }
  
  if (x < A || x > B) {
    return new Error('#NUM!');
  }
  
  // Transform x to [0, 1] interval
  const xNorm = (x - A) / (B - A);
  
  if (xNorm === 0) {
    if (cum) {
      return 0;
    } else {
      // PDF at x=0
      if (alpha < 1) {
        return Infinity;
      } else if (alpha === 1) {
        return beta / (B - A);
      } else {
        return 0;
      }
    }
  }
  
  if (xNorm === 1) {
    if (cum) {
      return 1;
    } else {
      // PDF at x=1
      if (beta < 1) {
        return Infinity;
      } else if (beta === 1) {
        return alpha / (B - A);
      } else {
        return 0;
      }
    }
  }
  
  if (cum) {
    // CDF: incomplete beta I_x(α, β)
    return incompleteBeta(xNorm, alpha, beta);
  } else {
    // PDF: (x^(α-1) * (1-x)^(β-1)) / B(α,β) scaled by interval length
    // Using logs for stability
    const logPdf = (alpha - 1) * Math.log(xNorm) + (beta - 1) * Math.log(1 - xNorm) -
                   logGamma(alpha) - logGamma(beta) + logGamma(alpha + beta);
    // Scale by interval to maintain proper density
    return Math.exp(logPdf) / (B - A);
  }
};

/**
 * BETA.INV - Inverse Beta Distribution
 * Returns the inverse of the cumulative beta probability density function
 * 
 * @param probability - Probability associated with the distribution
 * @param alpha - First shape parameter (α > 0)
 * @param beta - Second shape parameter (β > 0)
 * @param A - Lower bound (default 0)
 * @param B - Upper bound (default 1)
 * @returns Value x such that BETA.DIST(x, alpha, beta, A, B, TRUE) = probability
 * 
 * @example
 * =BETA.INV(0.6854, 8, 10, 1, 3) → 1.5... (approximately)
 * 
 * Uses bisection method
 */
export const BETA_INV: FormulaFunction = (...args) => {
  if (args.length < 3) {
    return new Error('#N/A');
  }
  
  const probability = toNumber(args[0]);
  if (probability instanceof Error) return probability;
  
  const alpha = toNumber(args[1]);
  if (alpha instanceof Error) return alpha;
  
  const beta = toNumber(args[2]);
  if (beta instanceof Error) return beta;
  
  // A and B are optional, defaults are 0 and 1
  let A: number = 0;
  let B: number = 1;
  
  if (args.length >= 4) {
    const AVal = toNumber(args[3]);
    if (AVal instanceof Error) return AVal;
    A = AVal;
  }
  
  if (args.length >= 5) {
    const BVal = toNumber(args[4]);
    if (BVal instanceof Error) return BVal;
    B = BVal;
  }
  
  // Validate inputs
  if (probability < 0 || probability > 1) {
    return new Error('#NUM!');
  }
  
  if (alpha <= 0 || beta <= 0) {
    return new Error('#NUM!');
  }
  
  if (A >= B) {
    return new Error('#NUM!');
  }
  
  // Edge cases
  if (probability === 0) return A;
  if (probability === 1) return B;
  
  // Bisection method on normalized [0,1] interval
  const tolerance = 1e-10;
  const maxIterations = 100;
  
  let low = 0;
  let high = 1;
  
  for (let i = 0; i < maxIterations; i++) {
    const mid = (low + high) / 2;
    const midCDF = incompleteBeta(mid, alpha, beta);
    
    if (typeof midCDF !== 'number') {
      return new Error('#NUM!');
    }
    
    const error = midCDF - probability;
    
    if (Math.abs(error) < tolerance) {
      // Transform back to [A, B] interval
      return A + mid * (B - A);
    }
    
    if (error < 0) {
      low = mid;
    } else {
      high = mid;
    }
    
    if (high - low < tolerance) {
      // Transform back to [A, B] interval
      return A + mid * (B - A);
    }
  }
  
  const mid = (low + high) / 2;
  return A + mid * (B - A);
};

/**
 * HYPGEOM.DIST - Hypergeometric Distribution
 * Returns the hypergeometric distribution probability
 * 
 * @param sample_s - Number of successes in the sample
 * @param number_sample - Size of the sample
 * @param population_s - Number of successes in the population
 * @param number_pop - Population size
 * @param cumulative - TRUE for CDF, FALSE for PMF
 * @returns Hypergeometric probability
 * 
 * @example
 * =HYPGEOM.DIST(1, 4, 8, 20, FALSE) → 0.3633... (PMF)
 * =HYPGEOM.DIST(1, 4, 8, 20, TRUE) → 0.4654... (CDF)
 * 
 * Mathematical form:
 * PMF: C(K,k) * C(N-K, n-k) / C(N, n)
 * Where: k=successes in sample, n=sample size, K=successes in population, N=population size
 * 
 * Using log-space to avoid overflow: log(C(n,k)) = logGamma(n+1) - logGamma(k+1) - logGamma(n-k+1)
 */
export const HYPGEOM_DIST: FormulaFunction = (sample_s, number_sample, population_s, number_pop, cumulative) => {
  const k = toNumber(sample_s);
  if (k instanceof Error) return k;
  
  const n = toNumber(number_sample);
  if (n instanceof Error) return n;
  
  const K = toNumber(population_s);
  if (K instanceof Error) return K;
  
  const N = toNumber(number_pop);
  if (N instanceof Error) return N;
  
  const cum = toBoolean(cumulative);
  if (cum instanceof Error) return cum;
  
  // Convert to integers
  const kInt = Math.floor(k);
  const nInt = Math.floor(n);
  const KInt = Math.floor(K);
  const NInt = Math.floor(N);
  
  // Validate inputs
  if (kInt < 0 || nInt < 0 || KInt < 0 || NInt < 0) {
    return new Error('#NUM!');
  }
  
  if (kInt > nInt || kInt > KInt) {
    return new Error('#NUM!');
  }
  
  if (nInt > NInt || KInt > NInt) {
    return new Error('#NUM!');
  }
  
  if (nInt - kInt > NInt - KInt) {
    return new Error('#NUM!');
  }
  
  // Helper function: log of binomial coefficient C(n, k) = n! / (k! * (n-k)!)
  // Using logGamma: log(C(n,k)) = logGamma(n+1) - logGamma(k+1) - logGamma(n-k+1)
  const logBinomial = (n: number, k: number): number => {
    if (k < 0 || k > n) return -Infinity;
    if (k === 0 || k === n) return 0;
    return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
  };
  
  // PMF calculation in log-space
  const calculatePMF = (x: number): number => {
    if (x < Math.max(0, nInt + KInt - NInt) || x > Math.min(nInt, KInt)) {
      return 0;
    }
    
    // log(P(X=x)) = log(C(K,x)) + log(C(N-K, n-x)) - log(C(N, n))
    const logProb = logBinomial(KInt, x) + 
                    logBinomial(NInt - KInt, nInt - x) - 
                    logBinomial(NInt, nInt);
    
    return Math.exp(logProb);
  };
  
  if (cum) {
    // CDF: sum of PMF from 0 to k
    let cdf = 0;
    const minX = Math.max(0, nInt + KInt - NInt);
    const maxX = kInt;
    
    for (let x = minX; x <= maxX; x++) {
      cdf += calculatePMF(x);
    }
    
    return cdf;
  } else {
    // PMF at k
    return calculatePMF(kInt);
  }
};
