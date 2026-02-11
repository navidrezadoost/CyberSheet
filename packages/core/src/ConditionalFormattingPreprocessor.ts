/**
 * Phase 3.5: Performance & Architecture Hardening
 * Two-Phase Conditional Formatting Evaluation System
 * 
 * Phase A: Rule Preprocessing (once per range/batch)
 * Phase B: Cell Evaluation (optimized per-cell execution)
 */

import type {
	ConditionalFormattingRule,
} from './ConditionalFormattingEngine';
import type { Address, Range } from './types';

/**
 * Rule classification for performance optimization
 */
export type RuleDependencyType =
	| 'cell-local'      // VALUE, DATE_OCCURRING - no external data needed
	| 'range-global'    // TOP_BOTTOM, ABOVE_AVERAGE, DUPLICATE - requires range scan
	| 'formula-dynamic' // FORMULA - dynamic evaluation
	| 'visual-only';    // COLOR_SCALE, DATA_BAR, ICON_SET - visual transformations

export type RuleTypeGroup =
	| 'value'
	| 'formula'
	| 'statistical'
	| 'visual';

/**
 * Preprocessed rule with optimization metadata
 */
export interface PreprocessedRule {
	rule: ConditionalFormattingRule;
	typeGroup: RuleTypeGroup;
	dependencyType: RuleDependencyType;
	priority: number;
	hasStopIfTrue: boolean;
	
	// Cached computations (populated during preprocessing)
	cachedStatistics?: StatisticalCache;
}

/**
 * Cached statistical computations for range-global rules
 */
export interface StatisticalCache {
	type: 'top-bottom' | 'above-average' | 'duplicate-unique';
	rangeSignature: string; // Stable key for cache invalidation
	
	// Top-Bottom cache
	sortedValues?: number[];
	threshold?: number;
	
	// Above-Average cache
	average?: number;
	standardDeviation?: number;
	adjustedThreshold?: number;
	
	// Duplicate-Unique cache
	valueSet?: Set<string>; // Normalized values
	duplicates?: Set<string>;
	
	timestamp: number; // For cache invalidation
}

/**
 * Result of preprocessing phase
 */
export interface PreprocessingResult {
	rules: PreprocessedRule[];
	hasRangeGlobalRules: boolean;
	hasFormulaDynamicRules: boolean;
	maxPriority: number;
	cacheableRules: Map<string, PreprocessedRule[]>; // Keyed by range signature
}

/**
 * Two-Phase Conditional Formatting Preprocessor
 * 
 * Optimizes rule evaluation by:
 * 1. Grouping rules by type and dependency
 * 2. Pre-sorting by priority once
 * 3. Identifying cacheable computations
 * 4. Computing range-global statistics once per range (not per cell)
 */
export class ConditionalFormattingPreprocessor {
	/**
	 * Phase A: Preprocess rules for a given range/batch
	 * 
	 * Called ONCE per range before evaluating individual cells.
	 * Computes all range-global statistics that can be shared across cells.
	 */
	preprocessRules(
		rules: ConditionalFormattingRule[],
		targetRange?: Range
	): PreprocessingResult {
		// 1. Classify and sort rules
		const preprocessed: PreprocessedRule[] = rules.map(rule => ({
			rule,
			typeGroup: this.classifyRuleType(rule),
			dependencyType: this.classifyDependency(rule),
			priority: rule.priority ?? 0,
			hasStopIfTrue: rule.stopIfTrue ?? false,
		}));

		// 2. Pre-sort by priority (higher runs first) - done ONCE, not per cell
		preprocessed.sort((a, b) => b.priority - a.priority);

		// 3. Identify rules that need range-global computation
		const hasRangeGlobalRules = preprocessed.some(
			p => p.dependencyType === 'range-global'
		);
		const hasFormulaDynamicRules = preprocessed.some(
			p => p.dependencyType === 'formula-dynamic'
		);

		// 4. Group cacheable rules by range signature
		const cacheableRules = new Map<string, PreprocessedRule[]>();
		for (const prep of preprocessed) {
			if (prep.dependencyType === 'range-global' && prep.rule.ranges) {
				for (const range of prep.rule.ranges) {
					const sig = this.getRangeSignature(range);
					if (!cacheableRules.has(sig)) {
						cacheableRules.set(sig, []);
					}
					cacheableRules.get(sig)!.push(prep);
				}
			}
		}

		const maxPriority = preprocessed.reduce(
			(max, p) => Math.max(max, p.priority),
			0
		);

		return {
			rules: preprocessed,
			hasRangeGlobalRules,
			hasFormulaDynamicRules,
			maxPriority,
			cacheableRules,
		};
	}

	/**
	 * Classify rule into type group for optimization routing
	 */
	private classifyRuleType(rule: ConditionalFormattingRule): RuleTypeGroup {
		switch (rule.type) {
			case 'value':
			case 'date-occurring':
				return 'value';
			case 'formula':
				return 'formula';
			case 'top-bottom':
			case 'above-average':
			case 'duplicate-unique':
				return 'statistical';
			case 'color-scale':
			case 'data-bar':
			case 'icon-set':
				return 'visual';
			default:
				return 'value';
		}
	}

	/**
	 * Classify rule dependency for cache optimization
	 */
	private classifyDependency(rule: ConditionalFormattingRule): RuleDependencyType {
		switch (rule.type) {
			case 'value':
			case 'date-occurring':
				return 'cell-local'; // No external data needed
			case 'top-bottom':
			case 'above-average':
			case 'duplicate-unique':
				return 'range-global'; // Requires range scan
			case 'formula':
				return 'formula-dynamic'; // Dynamic evaluation
			case 'color-scale':
			case 'data-bar':
			case 'icon-set':
				return 'visual-only'; // Visual transformation
			default:
				return 'cell-local';
		}
	}

	/**
	 * Generate stable range signature for cache keying
	 * Format: "R{start.row}C{start.col}:R{end.row}C{end.col}"
	 */
	getRangeSignature(range: Range): string {
		return `R${range.start.row}C${range.start.col}:R${range.end.row}C${range.end.col}`;
	}

	/**
	 * Check if two ranges are equivalent (for cache matching)
	 */
	rangesEqual(a: Range, b: Range): boolean {
		return (
			a.start.row === b.start.row &&
			a.start.col === b.start.col &&
			a.end.row === b.end.row &&
			a.end.col === b.end.col
		);
	}
}
