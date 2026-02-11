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
 */
export const COUNTBLANK: FormulaFunction = (range) => {
  const flattened = flattenArray([range]);
  return flattened.filter(v => v === null || v === undefined || v === '').length;
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
