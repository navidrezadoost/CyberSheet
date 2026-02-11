/**
 * Phase 3.5 Wave 2: Statistical Computation Cache
 * 
 * Eliminates O(n²) bottleneck in statistical rules by computing once per range,
 * not once per cell.
 * 
 * Performance Impact:
 * - Before: 100 cells × 100 range scans = 10,000 operations
 * - After: 1 range scan + 100 lookups = 101 operations (~99% reduction)
 */

import type { CellValue, Address, Range } from './types';
import type {
	TopBottomRule,
	AboveAverageRule,
	DuplicateUniqueRule,
	IconSetRule,
} from './ConditionalFormattingEngine';

/**
 * Cached top-bottom computation result
 */
export interface TopBottomCache {
	type: 'top-bottom';
	mode: 'top' | 'bottom';
	rankType: 'number' | 'percent';
	rank: number;
	sortedValues: number[];
	threshold: number;
	rangeSignature: string;
	timestamp: number;
}

/**
 * Cached above-average computation result
 */
export interface AboveAverageCache {
	type: 'above-average';
	values: number[];
	average: number;
	standardDeviation?: number;
	adjustedThreshold?: number;
	rangeSignature: string;
	timestamp: number;
}

/**
 * Cached duplicate-unique computation result
 */
export interface DuplicateUniqueCache {
	type: 'duplicate-unique';
	mode: 'duplicate' | 'unique';
	valueSet: Set<string>; // All values in range (normalized)
	duplicates: Set<string>; // Values that appear more than once
	rangeSignature: string;
	timestamp: number;
}

/**
 * Cached icon set statistics (Phase 4)
 * Stores percentile calculations for icon threshold mapping
 */
export interface IconSetCache {
	type: 'icon-set';
	values: number[]; // All numeric values in range
	sortedValues: number[]; // Sorted for percentile calculation
	percentiles: Map<number, number>; // percentile → value
	min: number;
	max: number;
	rangeSignature: string;
	timestamp: number;
}

export type StatisticalCache = TopBottomCache | AboveAverageCache | DuplicateUniqueCache | IconSetCache;

/**
 * Statistical Computation Cache Manager
 * 
 * Caches expensive range-global computations to eliminate O(n²) evaluation.
 * Cache is invalidated on range/value changes.
 */
export class StatisticalCacheManager {
	private cache = new Map<string, StatisticalCache>();
	private cacheHits = 0;
	private cacheMisses = 0;

	/**
	 * Get or compute top-bottom statistics for a range
	 */
	getTopBottomStats(
		rule: TopBottomRule,
		ranges: Range[],
		getValue: (address: Address) => CellValue
	): TopBottomCache {
		const sig = this.getCacheKey('top-bottom', ranges, rule);
		const cached = this.cache.get(sig) as TopBottomCache | undefined;

		if (cached && cached.type === 'top-bottom') {
			this.cacheHits++;
			return cached;
		}

		this.cacheMisses++;

		// Collect all numeric values from range(s)
		const values: number[] = [];
		for (const range of ranges) {
			for (let row = range.start.row; row <= range.end.row; row++) {
				for (let col = range.start.col; col <= range.end.col; col++) {
					const cellValue = getValue({ row, col });
					if (typeof cellValue === 'number') {
						values.push(cellValue);
					}
				}
			}
		}

		// Sort values: descending for top, ascending for bottom
		const sorted = [...values].sort((a, b) => (rule.mode === 'top' ? b - a : a - b));

		// Compute threshold
		let threshold: number;
		if (rule.rankType === 'number') {
			// Top/Bottom N items
			const n = Math.min(Math.max(1, Math.floor(rule.rank)), sorted.length);
			threshold = sorted[n - 1];
		} else {
			// Top/Bottom N%
			const percent = Math.min(100, Math.max(0, rule.rank)) / 100;
			const count = Math.max(1, Math.ceil(values.length * percent));
			threshold = sorted[count - 1];
		}

		const result: TopBottomCache = {
			type: 'top-bottom',
			mode: rule.mode,
			rankType: rule.rankType,
			rank: rule.rank,
			sortedValues: sorted,
			threshold,
			rangeSignature: this.getRangeSignature(ranges),
			timestamp: Date.now(),
		};

		this.cache.set(sig, result);
		return result;
	}

	/**
	 * Get or compute above-average statistics for a range
	 */
	getAboveAverageStats(
		rule: AboveAverageRule,
		ranges: Range[],
		getValue: (address: Address) => CellValue
	): AboveAverageCache {
		const sig = this.getCacheKey('above-average', ranges, rule);
		const cached = this.cache.get(sig) as AboveAverageCache | undefined;

		if (cached && cached.type === 'above-average') {
			this.cacheHits++;
			return cached;
		}

		this.cacheMisses++;

		// Collect numeric values from range(s)
		const values: number[] = [];
		for (const range of ranges) {
			for (let row = range.start.row; row <= range.end.row; row++) {
				for (let col = range.start.col; col <= range.end.col; col++) {
					const cellValue = getValue({ row, col });
					if (typeof cellValue === 'number') {
						values.push(cellValue);
					}
				}
			}
		}

		if (values.length === 0) {
			// Return dummy cache for empty ranges
			const result: AboveAverageCache = {
				type: 'above-average',
				values: [],
				average: 0,
				rangeSignature: this.getRangeSignature(ranges),
				timestamp: Date.now(),
			};
			this.cache.set(sig, result);
			return result;
		}

		// Compute average
		const sum = values.reduce((acc, val) => acc + val, 0);
		const average = sum / values.length;

		// Optionally compute standard deviation
		let standardDeviation: number | undefined;
		let adjustedThreshold: number | undefined;
		if (rule.standardDeviations != null && rule.standardDeviations > 0) {
			const variance = values.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / values.length;
			standardDeviation = Math.sqrt(variance);
			adjustedThreshold = average + rule.standardDeviations * standardDeviation;
		}

		const result: AboveAverageCache = {
			type: 'above-average',
			values,
			average,
			standardDeviation,
			adjustedThreshold,
			rangeSignature: this.getRangeSignature(ranges),
			timestamp: Date.now(),
		};

		this.cache.set(sig, result);
		return result;
	}

	/**
	 * Get or compute duplicate-unique statistics for a range
	 */
	getDuplicateUniqueStats(
		rule: DuplicateUniqueRule,
		ranges: Range[],
		getValue: (address: Address) => CellValue
	): DuplicateUniqueCache {
		const sig = this.getCacheKey('duplicate-unique', ranges, rule);
		const cached = this.cache.get(sig) as DuplicateUniqueCache | undefined;

		if (cached && cached.type === 'duplicate-unique') {
			this.cacheHits++;
			return cached;
		}

		this.cacheMisses++;

		const caseSensitive = rule.caseSensitive ?? false;
		const valueSet = new Set<string>();
		const valueCounts = new Map<string, number>();

		// Normalize value for comparison
		const normalizeValue = (val: CellValue): string => {
			if (val === null || val === undefined) return '';
			const str = String(val);
			return caseSensitive ? str : str.toLowerCase();
		};

		// Scan range(s) and count occurrences
		for (const range of ranges) {
			for (let row = range.start.row; row <= range.end.row; row++) {
				for (let col = range.start.col; col <= range.end.col; col++) {
					const cellValue = getValue({ row, col });
					if (cellValue === null || cellValue === undefined || cellValue === '') continue;

					const normalized = normalizeValue(cellValue);
					valueSet.add(normalized);
					valueCounts.set(normalized, (valueCounts.get(normalized) ?? 0) + 1);
				}
			}
		}

		// Identify duplicates
		const duplicates = new Set<string>();
		for (const [val, count] of valueCounts.entries()) {
			if (count > 1) {
				duplicates.add(val);
			}
		}

		const result: DuplicateUniqueCache = {
			type: 'duplicate-unique',
			mode: rule.mode,
			valueSet,
			duplicates,
			rangeSignature: this.getRangeSignature(ranges),
			timestamp: Date.now(),
		};

		this.cache.set(sig, result);
		return result;
	}

	/**
	 * Get or compute icon set statistics for a range (Phase 4)
	 * Computes percentiles for threshold mapping
	 */
	getIconSetStats(
		rule: IconSetRule,
		ranges: Range[],
		getValue: (address: Address) => CellValue
	): IconSetCache {
		const sig = this.getCacheKey('icon-set', ranges, rule);
		const cached = this.cache.get(sig) as IconSetCache | undefined;

		if (cached && cached.type === 'icon-set') {
			this.cacheHits++;
			return cached;
		}

		this.cacheMisses++;

		// Collect all numeric values from range(s)
		const values: number[] = [];
		for (const range of ranges) {
			for (let row = range.start.row; row <= range.end.row; row++) {
				for (let col = range.start.col; col <= range.end.col; col++) {
					const cellValue = getValue({ row, col });
					if (typeof cellValue === 'number' && !isNaN(cellValue)) {
						values.push(cellValue);
					}
				}
			}
		}

		if (values.length === 0) {
			// Empty range: return default values
			const emptyResult: IconSetCache = {
				type: 'icon-set',
				values: [],
				sortedValues: [],
				percentiles: new Map(),
				min: 0,
				max: 0,
				rangeSignature: this.getRangeSignature(ranges),
				timestamp: Date.now(),
			};
			this.cache.set(sig, emptyResult);
			return emptyResult;
		}

		// Sort values for percentile calculation
		const sortedValues = [...values].sort((a, b) => a - b);
		const min = sortedValues[0];
		const max = sortedValues[sortedValues.length - 1];

		// Compute percentiles (0.0 to 1.0)
		const percentiles = new Map<number, number>();
		const commonPercentiles = [0, 0.25, 0.33, 0.5, 0.67, 0.75, 1.0];
		
		for (const p of commonPercentiles) {
			const index = Math.floor(p * (sortedValues.length - 1));
			percentiles.set(p, sortedValues[index]);
		}

		// Also compute percentiles from rule thresholds
		for (const threshold of rule.thresholds) {
			if (threshold.type === 'percent') {
				const p = Number(threshold.value) / 100;
				if (!percentiles.has(p)) {
					const index = Math.floor(p * (sortedValues.length - 1));
					percentiles.set(p, sortedValues[index]);
				}
			} else if (threshold.type === 'percentile') {
				const p = Number(threshold.value);
				if (!percentiles.has(p)) {
					const index = Math.floor(p * (sortedValues.length - 1));
					percentiles.set(p, sortedValues[index]);
				}
			}
		}

		const result: IconSetCache = {
			type: 'icon-set',
			values,
			sortedValues,
			percentiles,
			min,
			max,
			rangeSignature: this.getRangeSignature(ranges),
			timestamp: Date.now(),
		};

		this.cache.set(sig, result);
		return result;
	}

	/**
	 * Generate cache key for a rule + range combination
	 */
	private getCacheKey(
		type: 'top-bottom' | 'above-average' | 'duplicate-unique' | 'icon-set',
		ranges: Range[],
		rule: any
	): string {
		const rangeSig = this.getRangeSignature(ranges);
		const ruleSig = JSON.stringify({
			type,
			mode: rule.mode,
			rank: rule.rank,
			rankType: rule.rankType,
			standardDeviations: rule.standardDeviations,
			caseSensitive: rule.caseSensitive,
		});
		return `${rangeSig}::${ruleSig}`;
	}

	/**
	 * Generate stable range signature
	 */
	private getRangeSignature(ranges: Range[]): string {
		return ranges
			.map(r => `R${r.start.row}C${r.start.col}:R${r.end.row}C${r.end.col}`)
			.join(';');
	}

	/**
	 * Invalidate cache for a specific range
	 */
	invalidateRange(range: Range): void {
		const sig = this.getRangeSignature([range]);
		for (const [key, _] of this.cache.entries()) {
			if (key.includes(sig)) {
				this.cache.delete(key);
			}
		}
	}

	/**
	 * Clear all cache
	 */
	clearCache(): void {
		this.cache.clear();
		this.cacheHits = 0;
		this.cacheMisses = 0;
	}

	/**
	 * Get cache statistics for performance monitoring
	 */
	getCacheStats(): { hits: number; misses: number; hitRatio: number; size: number } {
		const total = this.cacheHits + this.cacheMisses;
		return {
			hits: this.cacheHits,
			misses: this.cacheMisses,
			hitRatio: total > 0 ? this.cacheHits / total : 0,
			size: this.cache.size,
		};
	}
}
