import { Address, CellValue, Range } from './types';

/**
 * One-Pass Range Statistics
 * 
 * Computed ONCE per range, used by ALL rules.
 * No rule should scan independently.
 */
export interface BatchRangeStatistics {
	// Numeric stats
	min: number;
	max: number;
	sum: number;
	count: number;
	average: number;
	stdDev: number;
	
	// Sorted values (lazy - only computed when needed)
	sortedValues?: number[];
	
	// Frequency map for duplicates
	frequencyMap: Map<any, number>;
	
	// Error/blank tracking
	hasErrors: boolean;
	hasBlanks: boolean;
	errorCount: number;
	blankCount: number;
	
	// All values for comprehensive analysis
	allValues: any[];
	numericValues: number[];
	
	// Cache metadata
	rangeKey: string;
	timestamp: number;
}

/**
 * Strategy interface for rule evaluation
 * Each rule type has its own strategy
 */
export interface EvaluationStrategy {
	readonly strategyType: string;
	
	/**
	 * Evaluate rule using precomputed statistics
	 * NO SCANNING ALLOWED - only read from stats
	 */
	evaluate(value: CellValue, address: Address, stats: BatchRangeStatistics): boolean;
}

// ============================
// 1️⃣ Rule → Strategy Mapping
// ============================

/**
 * Top/Bottom N → SortedValueStrategy
 */
export class SortedValueStrategy implements EvaluationStrategy {
	readonly strategyType = 'sorted-value';
	
	constructor(
		private mode: 'top' | 'bottom',
		private rankType: 'number' | 'percent',
		private rank: number
	) {}
	
	evaluate(value: CellValue, address: Address, stats: BatchRangeStatistics): boolean {
		if (typeof value !== 'number') return false;
		if (stats.numericValues.length === 0) return false;
		
		// Lazy-compute sorted values if not cached
		if (!stats.sortedValues) {
			stats.sortedValues = [...stats.numericValues].sort((a, b) => a - b);
		}
		
		const sorted = stats.sortedValues;
		
		// Calculate threshold based on rank type
		let threshold: number;
		if (this.rankType === 'number') {
			// Top/Bottom N items
			const n = Math.min(this.rank, sorted.length);
			if (this.mode === 'top') {
				threshold = sorted[sorted.length - n];
			} else {
				threshold = sorted[n - 1];
			}
		} else {
			// Top/Bottom N%
			const percentRank = this.rank / 100;
			const count = Math.max(1, Math.ceil(sorted.length * percentRank));
			if (this.mode === 'top') {
				// Top N% means highest N% of values
				threshold = sorted[sorted.length - count];
			} else {
				// Bottom N% means lowest N% of values
				threshold = sorted[count - 1];
			}
		}
		
		// Check if value meets threshold
		if (this.mode === 'top') {
			return value >= threshold;
		} else {
			return value <= threshold;
		}
	}
}

/**
 * Above/Below Avg → NumericStatsStrategy
 */
export class NumericStatsStrategy implements EvaluationStrategy {
	readonly strategyType = 'numeric-stats';
	
	constructor(
		private mode: 'above' | 'below',
		private deviations?: number // optional: above avg + 1 stdDev
	) {}
	
	evaluate(value: CellValue, address: Address, stats: BatchRangeStatistics): boolean {
		if (typeof value !== 'number') return false;
		if (stats.count === 0) return false;
		
		let threshold = stats.average;
		
		// Apply standard deviation offset if specified
		if (this.deviations !== undefined) {
			threshold += this.deviations * stats.stdDev;
		}
		
		if (this.mode === 'above') {
			return value > threshold;
		} else {
			return value < threshold;
		}
	}
}

/**
 * Duplicates → FrequencyMapStrategy
 */
export class FrequencyMapStrategy implements EvaluationStrategy {
	readonly strategyType = 'frequency-map';
	
	constructor(private mode: 'duplicate' | 'unique') {}
	
	evaluate(value: CellValue, address: Address, stats: BatchRangeStatistics): boolean {
		// Get frequency from precomputed map
		const frequency = stats.frequencyMap.get(value) ?? 0;
		
		if (this.mode === 'duplicate') {
			return frequency > 1;
		} else {
			return frequency === 1;
		}
	}
}

/**
 * Color Scale → MinMaxStrategy
 */
export class MinMaxStrategy implements EvaluationStrategy {
	readonly strategyType = 'min-max';
	
	evaluate(value: CellValue, address: Address, stats: BatchRangeStatistics): boolean {
		// Color scales don't have boolean evaluation, but we track min/max
		return typeof value === 'number';
	}
	
	/**
	 * Calculate position in range [0, 1]
	 */
	calculatePosition(value: number, stats: BatchRangeStatistics): number {
		if (stats.max === stats.min) return 0.5;
		return (value - stats.min) / (stats.max - stats.min);
	}
}

/**
 * Errors/Blanks → ErrorBlankStrategy
 */
export class ErrorBlankStrategy implements EvaluationStrategy {
	readonly strategyType = 'error-blank';
	
	constructor(private mode: 'errors' | 'blanks' | 'errors-or-blanks') {}
	
	evaluate(value: CellValue, address: Address, stats: BatchRangeStatistics): boolean {
		if (this.mode === 'errors') {
			return typeof value === 'object' && value !== null && 'message' in value || (typeof value === 'string' && value.startsWith('#'));
		} else if (this.mode === 'blanks') {
			return value === null || value === undefined || value === '';
		} else {
			// errors-or-blanks
			const isError = typeof value === 'object' && value !== null && 'message' in value || (typeof value === 'string' && value.startsWith('#'));
			const isBlank = value === null || value === undefined || value === '';
			return isError || isBlank;
		}
	}
}

// ============================
// 2️⃣ One-Pass Statistics Computer
// ============================

export class RangeStatisticsComputer {
	/**
	 * Compute statistics for a range in ONE PASS
	 * 
	 * Collects:
	 * - min / max
	 * - sum / count
	 * - sorted array (lazy)
	 * - frequency map
	 * - error / blank flags
	 */
	static computeStatistics(
		range: Range,
		getValue: (address: Address) => CellValue
	): BatchRangeStatistics {
		// Initialize collectors
		let min = Infinity;
		let max = -Infinity;
		let sum = 0;
		let count = 0;
		
		const numericValues: number[] = [];
		const allValues: any[] = [];
		const frequencyMap = new Map<any, number>();
		
		let hasErrors = false;
		let hasBlanks = false;
		let errorCount = 0;
		let blankCount = 0;
		
		// ⚡ ONE-PASS SCAN
		for (let row = range.start.row; row <= range.end.row; row++) {
			for (let col = range.start.col; col <= range.end.col; col++) {
				const address: Address = { row, col };
				const value = getValue(address);
				
				// Track all values
				allValues.push(value);
				
				// Update frequency map
				const currentFreq = frequencyMap.get(value) ?? 0;
				frequencyMap.set(value, currentFreq + 1);
				
				// Check for errors
				if (typeof value === 'object' && value !== null && 'message' in value || (typeof value === 'string' && value.startsWith('#'))) {
					hasErrors = true;
					errorCount++;
					continue;
				}
				
				// Check for blanks
				if (value === null || value === undefined || value === '') {
					hasBlanks = true;
					blankCount++;
					continue;
				}
				
				// Process numeric values
				if (typeof value === 'number' && !isNaN(value)) {
					numericValues.push(value);
					sum += value;
					count++;
					
					if (value < min) min = value;
					if (value > max) max = value;
				}
			}
		}
		
		// Calculate derived statistics
		const average = count > 0 ? sum / count : 0;
		
		// Standard deviation
		let variance = 0;
		if (count > 0) {
			for (const value of numericValues) {
				variance += Math.pow(value - average, 2);
			}
			variance /= count;
		}
		const stdDev = Math.sqrt(variance);
		
		// Handle edge cases
		if (count === 0) {
			min = 0;
			max = 0;
		}
		
		// Generate range key
		const rangeKey = `${range.start.row},${range.start.col}:${range.end.row},${range.end.col}`;
		
		return {
			min,
			max,
			sum,
			count,
			average,
			stdDev,
			sortedValues: undefined, // Lazy-computed on demand
			frequencyMap,
			hasErrors,
			hasBlanks,
			errorCount,
			blankCount,
			allValues,
			numericValues,
			rangeKey,
			timestamp: Date.now(),
		};
	}
	
	/**
	 * Update statistics when a single cell changes (incremental update)
	 * This is more efficient than full recomputation for small changes
	 */
	static updateStatisticsForCell(
		stats: BatchRangeStatistics,
		oldValue: CellValue,
		newValue: CellValue,
		address: Address
	): BatchRangeStatistics {
		// For now, we'll mark cache as invalid and require full recomputation
		// Future optimization: incremental updates for simple cases
		return {
			...stats,
			timestamp: Date.now(),
			sortedValues: undefined, // Invalidate lazy-computed data
		};
	}
}

// ============================
// 3️⃣ Smart Cache (per rule, per range)
// ============================

export class RangeStatisticsCache {
	private cache = new Map<string, BatchRangeStatistics>();
	
	/**
	 * Get cache key for (rule, range) pair
	 */
	private getCacheKey(ruleId: string, range: Range): string {
		return `${ruleId}:${range.start.row},${range.start.col}:${range.end.row},${range.end.col}`;
	}
	
	/**
	 * Get cached statistics if available and valid
	 */
	get(ruleId: string, range: Range): BatchRangeStatistics | undefined {
		const key = this.getCacheKey(ruleId, range);
		return this.cache.get(key);
	}
	
	/**
	 * Set cached statistics for (rule, range)
	 */
	set(ruleId: string, range: Range, stats: BatchRangeStatistics): void {
		const key = this.getCacheKey(ruleId, range);
		this.cache.set(key, stats);
	}
	
	/**
	 * Invalidate cache for specific (rule, range) when cell is dirty
	 */
	invalidate(ruleId: string, range: Range): void {
		const key = this.getCacheKey(ruleId, range);
		this.cache.delete(key);
	}
	
	/**
	 * Invalidate all caches for a rule
	 */
	invalidateRule(ruleId: string): void {
		const prefix = `${ruleId}:`;
		for (const key of this.cache.keys()) {
			if (key.startsWith(prefix)) {
				this.cache.delete(key);
			}
		}
	}
	
	/**
	 * Invalidate cache entries that overlap with address
	 */
	invalidateAddress(address: Address): void {
		// For now, clear all caches that might contain this address
		// Future optimization: track range→keys mapping for precise invalidation
		for (const [key, stats] of this.cache.entries()) {
			const rangeKey = stats.rangeKey;
			if (this.addressInRangeKey(address, rangeKey)) {
				this.cache.delete(key);
			}
		}
	}
	
	/**
	 * Check if address is in range key
	 */
	private addressInRangeKey(address: Address, rangeKey: string): boolean {
		const [start, end] = rangeKey.split(':');
		const [startRow, startCol] = start.split(',').map(Number);
		const [endRow, endCol] = end.split(',').map(Number);
		
		return (
			address.row >= startRow &&
			address.row <= endRow &&
			address.col >= startCol &&
			address.col <= endCol
		);
	}
	
	/**
	 * Clear all cached statistics
	 */
	clear(): void {
		this.cache.clear();
	}
	
	/**
	 * Get cache statistics
	 */
	getStats() {
		return {
			cacheSize: this.cache.size,
			cacheKeys: Array.from(this.cache.keys()),
		};
	}
}

// ============================
// Strategy Factory
// ============================

export class StrategyFactory {
	/**
	 * Create strategy for rule type
	 */
	static createStrategy(ruleType: string, ruleConfig: any): EvaluationStrategy | null {
		switch (ruleType) {
			case 'top-bottom':
				return new SortedValueStrategy(
					ruleConfig.mode,
					ruleConfig.rankType,
					ruleConfig.rank
				);
			
			case 'above-average':
				return new NumericStatsStrategy(
					ruleConfig.mode || 'above',
					ruleConfig.deviations
				);
			
			case 'duplicate-unique':
				return new FrequencyMapStrategy(ruleConfig.mode);
			
			case 'color-scale':
			case 'data-bar':
				return new MinMaxStrategy();
			
			case 'errors-blank':
				return new ErrorBlankStrategy(ruleConfig.mode || 'errors-or-blanks');
			
			default:
				return null; // Rule doesn't use batch evaluation
		}
	}
}
