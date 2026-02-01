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
import { toNumber } from '../../utils/type-utils';
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
