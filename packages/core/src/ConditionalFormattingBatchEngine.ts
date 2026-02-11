import { Address, CellValue, Range } from './types';
import {
	ConditionalFormattingEngine,
	ConditionalFormattingRule,
	ConditionalFormattingResult,
	ConditionalFormattingContext,
} from './ConditionalFormattingEngine';
import {
	ConditionalFormattingDependencyGraph,
	RangeStatistics,
} from './ConditionalFormattingDependencyGraph';

/**
 * Batch-Evaluation CF Engine with Dependency Graph Integration
 * 
 * Architecture:
 * - Rule-centric evaluation (not cell-centric)
 * - Only evaluates dirty rules (no global re-evaluation)
 * - Uses dependency graph for dirty tracking
 * - Batch evaluation for range statistics (one-pass scans)
 * 
 * Rule Lifecycle States:
 * - clean: Rule is up-to-date, no evaluation needed
 * - dirty: Rule needs re-evaluation due to cell/formula changes
 * - evaluating: Rule is currently being evaluated
 * - clean (after commit): Rule evaluation complete, marked clean
 */

export type RuleLifecycleState = 'clean' | 'dirty' | 'evaluating';

export interface BatchEvaluationOptions {
	/** Optional formula evaluator for formula-based rules */
	formulaEvaluator?: (expression: string, context: ConditionalFormattingContext & { value: CellValue }) => boolean | number | string | null;
	/** Get cell value callback */
	getValue: (address: Address) => CellValue;
}

/**
 * Rule evaluation result with lifecycle state
 */
export interface RuleEvaluationState {
	ruleId: string;
	state: RuleLifecycleState;
	lastEvaluated?: number; // timestamp
	evaluationCount: number;
}

/**
 * Batch CF Engine - Replaces evaluate-on-render with dependency-aware batch evaluation
 */
export class ConditionalFormattingBatchEngine {
	private engine: ConditionalFormattingEngine;
	private graph: ConditionalFormattingDependencyGraph;
	
	/** Track rule lifecycle states */
	private ruleStates: Map<string, RuleEvaluationState> = new Map();
	
	/** Statistics for debugging */
	private stats = {
		totalEvaluations: 0,
		skippedCleanRules: 0,
		cellEdits: 0,
	};

	constructor() {
		this.engine = new ConditionalFormattingEngine();
		this.graph = new ConditionalFormattingDependencyGraph();
	}

	// ============================
	// Rule Management
	// ============================

	/**
	 * Add or update a CF rule
	 */
	addRule(ruleId: string, rule: ConditionalFormattingRule): void {
		this.graph.addRule(ruleId, rule);
		
		// Initialize rule state as dirty
		this.ruleStates.set(ruleId, {
			ruleId,
			state: 'dirty',
			evaluationCount: 0,
		});
	}

	/**
	 * Remove a CF rule
	 */
	removeRule(ruleId: string): void {
		this.graph.removeRule(ruleId);
		this.ruleStates.delete(ruleId);
	}

	/**
	 * Clear all rules
	 */
	clearRules(): void {
		this.graph.clear();
		this.ruleStates.clear();
	}

	// ============================
	// 1️⃣ Engine Gatekeeping
	// ============================

	/**
	 * Check if a rule is dirty and needs evaluation.
	 * This is the ONLY way to determine if evaluation is needed.
	 * ❌ No manual fallback allowed.
	 */
	private isRuleDirty(ruleId: string): boolean {
		const ruleNode = this.graph.getRule(ruleId);
		if (!ruleNode) return false;
		return ruleNode.isDirty;
	}

	/**
	 * Get rule lifecycle state
	 */
	getRuleState(ruleId: string): RuleEvaluationState | undefined {
		return this.ruleStates.get(ruleId);
	}

	// ============================
	// 2️⃣ Replace Evaluate-on-render
	// ============================

	/**
	 * Rule-centric evaluation (not cell-centric).
	 * Evaluates all dirty CF rules for a given range.
	 * 
	 * ❌ OLD: evaluateCellCF(cell)
	 * ✅ NEW: evaluateDirtyRulesForRange(range)
	 */
	evaluateDirtyRulesForRange(range: Range, options: BatchEvaluationOptions): Map<string, ConditionalFormattingResult> {
		const results = new Map<string, ConditionalFormattingResult>();

		// Get all rules (to count how many we're skipping)
		const allRules = this.graph.getAllRules();
		const dirtyRules = this.graph.getDirtyRules();
		
		// Count clean rules that we're skipping (performance win)
		const cleanRulesCount = allRules.length - dirtyRules.length;
		this.stats.skippedCleanRules += cleanRulesCount;

		for (const ruleNode of dirtyRules) {
			const ruleId = ruleNode.ruleId;

			// 1️⃣ Gatekeeping: Only evaluate if rule is dirty
			if (!this.isRuleDirty(ruleId)) {
				// This should never happen since dirtyRules only contains dirty rules
				continue;
			}

			// 3️⃣ Transparent Rule Lifecycle: dirty → evaluating
			this.transitionRuleState(ruleId, 'evaluating');

			// Evaluate rule for all cells in range
			const ruleResult = this.evaluateRuleForRange(ruleNode.rule, range, options);
			results.set(ruleId, ruleResult);

			// 4️⃣ Real Invalidation: after apply → graph.clearDirty(rule)
			this.graph.clearDirty(ruleId);

			// 3️⃣ Transparent Rule Lifecycle: evaluating → clean
			this.transitionRuleState(ruleId, 'clean');

			this.stats.totalEvaluations++;
		}

		return results;
	}

	/**
	 * Evaluate a single cell (legacy API for backward compatibility).
	 * Internally uses rule-centric evaluation.
	 */
	evaluateCellCF(address: Address, options: BatchEvaluationOptions): ConditionalFormattingResult {
		// Find all rules that apply to this cell
		const allRules = this.graph.getAllRules();
		const applicableRules: ConditionalFormattingRule[] = [];
		const applicableRuleIds: string[] = [];

		for (const ruleNode of allRules) {
			// 1️⃣ Gatekeeping: Only evaluate if rule is dirty
			if (!this.isRuleDirty(ruleNode.ruleId)) {
				this.stats.skippedCleanRules++;
				continue;
			}

			// Check if cell is in rule's ranges
			if (this.isAddressInRuleRanges(address, ruleNode.rule)) {
				applicableRules.push(ruleNode.rule);
				applicableRuleIds.push(ruleNode.ruleId);
			}
		}

		// Evaluate cell with applicable rules
		const value = options.getValue(address);
		const ctx: ConditionalFormattingContext = {
			address,
			getValue: options.getValue,
		};

		const result = this.engine.applyRules(value, applicableRules, ctx, {
			formulaEvaluator: options.formulaEvaluator,
		});

		// Mark evaluated rules as clean
		for (const ruleId of applicableRuleIds) {
			this.graph.clearDirty(ruleId);
			this.transitionRuleState(ruleId, 'clean');
			this.stats.totalEvaluations++;
		}

		return result;
	}

	// ============================
	// 3️⃣ Transparent Rule Lifecycle
	// ============================

	/**
	 * Transition rule to new lifecycle state
	 */
	private transitionRuleState(ruleId: string, newState: RuleLifecycleState): void {
		let state = this.ruleStates.get(ruleId);
		
		if (!state) {
			state = {
				ruleId,
				state: newState,
				evaluationCount: 0,
			};
			this.ruleStates.set(ruleId, state);
		}

		state.state = newState;

		if (newState === 'clean') {
			state.lastEvaluated = Date.now();
			state.evaluationCount++;
		}
	}

	// ============================
	// 4️⃣ Real Invalidation
	// ============================

	/**
	 * Mark a cell as changed.
	 * cell edit → graph.markCellDirty(cell) → rules dirty → engine only evaluates these
	 */
	markCellDirty(address: Address): void {
		this.graph.markCellDirty(address);
		this.stats.cellEdits++;

		// Mark affected rules as dirty in lifecycle tracking
		const dirtyRules = this.graph.getDirtyRules();
		for (const ruleNode of dirtyRules) {
			this.transitionRuleState(ruleNode.ruleId, 'dirty');
		}
	}

	/**
	 * Mark a range as changed (batch operation)
	 */
	markRangeDirty(range: Range): void {
		this.graph.markRangeDirty(range);
		this.stats.cellEdits += (range.end.row - range.start.row + 1) * (range.end.col - range.start.col + 1);

		// Mark affected rules as dirty
		const dirtyRules = this.graph.getDirtyRules();
		for (const ruleNode of dirtyRules) {
			this.transitionRuleState(ruleNode.ruleId, 'dirty');
		}
	}

	// ============================
	// Step 3 Preview: Batch Range Evaluation
	// ============================

	/**
	 * Evaluate a rule for all cells in a range (batch evaluation).
	 * Uses precomputed statistics for range-aware rules (Top/Bottom, Avg, etc.).
	 */
	private evaluateRuleForRange(
		rule: ConditionalFormattingRule,
		range: Range,
		options: BatchEvaluationOptions
	): ConditionalFormattingResult {
		// For range-aware rules, compute statistics once
		const needsStats = this.ruleNeedsRangeStats(rule);
		let stats: RangeStatistics | undefined;

		if (needsStats && rule.ranges && rule.ranges.length > 0) {
			// Check cache first
			const ruleId = (rule as any).id ?? 'temp';
			stats = this.graph.getCachedStats(ruleId);

			if (!stats) {
				// Compute stats for rule's ranges
				stats = this.computeRangeStatistics(rule.ranges, options.getValue);
				if (ruleId !== 'temp') {
					this.graph.setCachedStats(ruleId, stats);
				}
			}
		}

		// Evaluate rule for a representative cell (batch evaluation will be implemented in Step 3)
		// For now, we evaluate the first cell in range
		const firstCell: Address = { row: range.start.row, col: range.start.col };
		const value = options.getValue(firstCell);

		const ctx: ConditionalFormattingContext = {
			address: firstCell,
			getValue: options.getValue,
			valueRange: stats ? { min: stats.min, max: stats.max } : undefined,
		};

		return this.engine.applyRules(value, [rule], ctx, {
			formulaEvaluator: options.formulaEvaluator,
		});
	}

	/**
	 * Check if rule needs range statistics (Top/Bottom, Avg, Duplicate, etc.)
	 */
	private ruleNeedsRangeStats(rule: ConditionalFormattingRule): boolean {
		return (
			rule.type === 'top-bottom' ||
			rule.type === 'above-average' ||
			rule.type === 'duplicate-unique' ||
			rule.type === 'color-scale' ||
			rule.type === 'data-bar'
		);
	}

	/**
	 * Compute statistics for ranges (one-pass scan)
	 */
	private computeRangeStatistics(ranges: Range[], getValue: (address: Address) => CellValue): RangeStatistics {
		const numericValues: number[] = [];
		const allValues: any[] = [];

		for (const range of ranges) {
			for (let row = range.start.row; row <= range.end.row; row++) {
				for (let col = range.start.col; col <= range.end.col; col++) {
					const value = getValue({ row, col });
					allValues.push(value);
					if (typeof value === 'number') {
						numericValues.push(value);
					}
				}
			}
		}

		// Sort numeric values
		numericValues.sort((a, b) => a - b);

		// Compute statistics
		const min = numericValues.length > 0 ? numericValues[0] : 0;
		const max = numericValues.length > 0 ? numericValues[numericValues.length - 1] : 0;
		const sum = numericValues.reduce((acc, val) => acc + val, 0);
		const average = numericValues.length > 0 ? sum / numericValues.length : 0;

		// Standard deviation
		const variance = numericValues.length > 0
			? numericValues.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / numericValues.length
			: 0;
		const stdDev = Math.sqrt(variance);

		return {
			numericValues,
			allValues,
			min,
			max,
			average,
			stdDev,
			count: numericValues.length,
			timestamp: Date.now(),
		};
	}

	/**
	 * Check if address is in rule's ranges
	 */
	private isAddressInRuleRanges(address: Address, rule: ConditionalFormattingRule): boolean {
		if (!rule.ranges || rule.ranges.length === 0) return true;

		for (const range of rule.ranges) {
			if (
				address.row >= range.start.row &&
				address.row <= range.end.row &&
				address.col >= range.start.col &&
				address.col <= range.end.col
			) {
				return true;
			}
		}

		return false;
	}

	// ============================
	// Statistics & Debugging
	// ============================

	/**
	 * Get engine statistics
	 */
	getStats() {
		return {
			...this.stats,
			graphStats: this.graph.getStats(),
			ruleStates: Array.from(this.ruleStates.values()),
		};
	}

	/**
	 * Reset statistics
	 */
	resetStats(): void {
		this.stats = {
			totalEvaluations: 0,
			skippedCleanRules: 0,
			cellEdits: 0,
		};
	}

	/**
	 * Get dependency graph (for testing/debugging)
	 */
	getGraph(): ConditionalFormattingDependencyGraph {
		return this.graph;
	}
}
