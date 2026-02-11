import { Address, Range } from './types';
import { ConditionalFormattingRule } from './ConditionalFormattingEngine';

/**
 * Dependency Graph for Conditional Formatting
 * 
 * Purpose: Track relationships between cells, formulas, and CF rules to enable
 * incremental evaluation. Only re-evaluate rules when their dependencies change.
 * 
 * Architecture:
 * - Nodes: Cell values, formula results, CF rule nodes
 * - Edges: Formula→CF, Cell→CF range
 * 
 * Key Operations:
 * - markDirty(address): Mark all CF rules dependent on a cell as dirty
 * - getDirtyRules(): Get all rules that need re-evaluation
 * - clearDirty(ruleId): Mark rule as clean after evaluation
 */

// ============================
// Node Types
// ============================

export type DependencyNodeType = 'cell' | 'formula' | 'cf-rule';

export interface DependencyNode {
	id: string;
	type: DependencyNodeType;
}

export interface CellNode extends DependencyNode {
	type: 'cell';
	address: Address;
	/** Cells this cell's value depends on (for formulas) */
	dependsOn: Set<string>; // cell IDs
	/** CF rules that depend on this cell */
	affectsRules: Set<string>; // rule IDs
}

export interface FormulaNode extends DependencyNode {
	type: 'formula';
	address: Address;
	expression: string;
	/** Cells this formula references */
	references: Set<string>; // cell IDs
	/** CF rules that use this formula result */
	affectsRules: Set<string>; // rule IDs
}

export interface CFRuleNode extends DependencyNode {
	type: 'cf-rule';
	ruleId: string;
	rule: ConditionalFormattingRule;
	/** Cells in the rule's ranges */
	dependsOnCells: Set<string>; // cell IDs
	/** Formulas used in rule evaluation */
	dependsOnFormulas: Set<string>; // formula node IDs
	/** Whether rule needs re-evaluation */
	isDirty: boolean;
	/** Cached statistics for range-aware rules (Top/Bottom, Avg, etc.) */
	cachedStats?: RangeStatistics;
}

// ============================
// Range Statistics Cache
// ============================

export interface RangeStatistics {
	/** All numeric values in range (sorted) */
	numericValues: number[];
	/** All values in range (for duplicate detection) */
	allValues: any[];
	/** Min value */
	min: number;
	/** Max value */
	max: number;
	/** Average */
	average: number;
	/** Standard deviation */
	stdDev: number;
	/** Count of numeric values */
	count: number;
	/** Timestamp when stats were computed */
	timestamp: number;
}

// ============================
// Dependency Graph
// ============================

export class ConditionalFormattingDependencyGraph {
	/** All nodes indexed by ID */
	private nodes: Map<string, DependencyNode> = new Map();
	
	/** Cell nodes indexed by address key */
	private cellNodes: Map<string, CellNode> = new Map();
	
	/** Formula nodes indexed by address key */
	private formulaNodes: Map<string, FormulaNode> = new Map();
	
	/** CF rule nodes indexed by rule ID */
	private ruleNodes: Map<string, CFRuleNode> = new Map();
	
	/** Dirty rules that need re-evaluation */
	private dirtyRules: Set<string> = new Set();

	// ============================
	// Node Management
	// ============================

	/**
	 * Add or update a cell node
	 */
	addCell(address: Address): CellNode {
		const id = this.addressToKey(address);
		let node = this.cellNodes.get(id);
		
		if (!node) {
			node = {
				id,
				type: 'cell',
				address,
				dependsOn: new Set(),
				affectsRules: new Set(),
			};
			this.cellNodes.set(id, node);
			this.nodes.set(id, node);
		}
		
		return node;
	}

	/**
	 * Add or update a formula node
	 */
	addFormula(address: Address, expression: string, references: Address[]): FormulaNode {
		const id = this.addressToKey(address);
		let node = this.formulaNodes.get(id);
		
		const refIds = new Set(references.map(addr => this.addressToKey(addr)));
		
		if (!node) {
			node = {
				id,
				type: 'formula',
				address,
				expression,
				references: refIds,
				affectsRules: new Set(),
			};
			this.formulaNodes.set(id, node);
			this.nodes.set(id, node);
		} else {
			node.expression = expression;
			node.references = refIds;
		}
		
		// Link formula to cell dependencies
		for (const refId of refIds) {
			const cellNode = this.cellNodes.get(refId) ?? this.addCell(this.keyToAddress(refId));
			cellNode.dependsOn.add(id);
		}
		
		return node;
	}

	/**
	 * Add or update a CF rule node
	 */
	addRule(ruleId: string, rule: ConditionalFormattingRule): CFRuleNode {
		let node = this.ruleNodes.get(ruleId);
		
		const cellIds = new Set<string>();
		
		// Extract all cells from rule ranges
		if (rule.ranges) {
			for (const range of rule.ranges) {
				for (let row = range.start.row; row <= range.end.row; row++) {
					for (let col = range.start.col; col <= range.end.col; col++) {
						const cellId = this.addressToKey({ row, col });
						cellIds.add(cellId);
						
						// Ensure cell node exists and link to rule
						const cellNode = this.cellNodes.get(cellId) ?? this.addCell({ row, col });
						cellNode.affectsRules.add(ruleId);
					}
				}
			}
		}
		
		if (!node) {
			node = {
				id: ruleId,
				type: 'cf-rule',
				ruleId,
				rule,
				dependsOnCells: cellIds,
				dependsOnFormulas: new Set(),
				isDirty: true, // New rules start dirty
			};
			this.ruleNodes.set(ruleId, node);
			this.nodes.set(ruleId, node);
		} else {
			// Update existing node
			node.rule = rule;
			
			// Clear old cell links
			for (const oldCellId of node.dependsOnCells) {
				const cellNode = this.cellNodes.get(oldCellId);
				if (cellNode) {
					cellNode.affectsRules.delete(ruleId);
				}
			}
			
			// Set new cell dependencies
			node.dependsOnCells = cellIds;
			
			// Link cells to rule
			for (const cellId of cellIds) {
				const cellNode = this.cellNodes.get(cellId) ?? this.addCell(this.keyToAddress(cellId));
				cellNode.affectsRules.add(ruleId);
			}
			
			node.isDirty = true; // Rule changed, needs re-evaluation
		}
		
		this.dirtyRules.add(ruleId);
		return node;
	}

	/**
	 * Remove a CF rule node
	 */
	removeRule(ruleId: string): void {
		const node = this.ruleNodes.get(ruleId);
		if (!node) return;
		
		// Unlink from all dependent cells
		for (const cellId of node.dependsOnCells) {
			const cellNode = this.cellNodes.get(cellId);
			if (cellNode) {
				cellNode.affectsRules.delete(ruleId);
			}
		}
		
		// Unlink from all dependent formulas
		for (const formulaId of node.dependsOnFormulas) {
			const formulaNode = this.formulaNodes.get(formulaId);
			if (formulaNode) {
				formulaNode.affectsRules.delete(ruleId);
			}
		}
		
		this.ruleNodes.delete(ruleId);
		this.nodes.delete(ruleId);
		this.dirtyRules.delete(ruleId);
	}

	// ============================
	// Dirty Propagation
	// ============================

	/**
	 * Mark a cell as changed, propagating dirty state to dependent CF rules
	 */
	markCellDirty(address: Address): void {
		const cellId = this.addressToKey(address);
		const cellNode = this.cellNodes.get(cellId);
		
		if (!cellNode) return;
		
		// Mark all CF rules that depend on this cell
		for (const ruleId of cellNode.affectsRules) {
			const ruleNode = this.ruleNodes.get(ruleId);
			if (ruleNode) {
				ruleNode.isDirty = true;
				this.dirtyRules.add(ruleId);
				// Invalidate cached stats
				delete ruleNode.cachedStats;
			}
		}
		
		// Propagate to formulas that reference this cell
		for (const dependentId of cellNode.dependsOn) {
			const formulaNode = this.formulaNodes.get(dependentId);
			if (formulaNode) {
				// Mark CF rules that depend on this formula
				for (const ruleId of formulaNode.affectsRules) {
					const ruleNode = this.ruleNodes.get(ruleId);
					if (ruleNode) {
						ruleNode.isDirty = true;
						this.dirtyRules.add(ruleId);
						delete ruleNode.cachedStats;
					}
				}
			}
		}
	}

	/**
	 * Mark multiple cells as dirty (batch operation)
	 */
	markRangeDirty(range: Range): void {
		for (let row = range.start.row; row <= range.end.row; row++) {
			for (let col = range.start.col; col <= range.end.col; col++) {
				this.markCellDirty({ row, col });
			}
		}
	}

	/**
	 * Get all dirty CF rules that need re-evaluation
	 */
	getDirtyRules(): CFRuleNode[] {
		const rules: CFRuleNode[] = [];
		for (const ruleId of this.dirtyRules) {
			const node = this.ruleNodes.get(ruleId);
			if (node && node.isDirty) {
				rules.push(node);
			}
		}
		return rules;
	}

	/**
	 * Mark a rule as clean after evaluation
	 */
	clearDirty(ruleId: string): void {
		const node = this.ruleNodes.get(ruleId);
		if (node) {
			node.isDirty = false;
		}
		this.dirtyRules.delete(ruleId);
	}

	/**
	 * Mark all rules as dirty (force full re-evaluation)
	 */
	markAllDirty(): void {
		for (const [ruleId, node] of this.ruleNodes) {
			node.isDirty = true;
			this.dirtyRules.add(ruleId);
			delete node.cachedStats;
		}
	}

	// ============================
	// Range Statistics Cache
	// ============================

	/**
	 * Get cached statistics for a rule, or undefined if not cached
	 */
	getCachedStats(ruleId: string): RangeStatistics | undefined {
		const node = this.ruleNodes.get(ruleId);
		return node?.cachedStats;
	}

	/**
	 * Set cached statistics for a rule
	 */
	setCachedStats(ruleId: string, stats: RangeStatistics): void {
		const node = this.ruleNodes.get(ruleId);
		if (node) {
			node.cachedStats = stats;
		}
	}

	// ============================
	// Utilities
	// ============================

	/**
	 * Convert address to string key
	 */
	private addressToKey(address: Address): string {
		return `R${address.row}C${address.col}`;
	}

	/**
	 * Convert string key back to address
	 */
	private keyToAddress(key: string): Address {
		const match = key.match(/R(\d+)C(\d+)/);
		if (!match) throw new Error(`Invalid cell key: ${key}`);
		return { row: parseInt(match[1], 10), col: parseInt(match[2], 10) };
	}

	/**
	 * Get rule node by ID
	 */
	getRule(ruleId: string): CFRuleNode | undefined {
		return this.ruleNodes.get(ruleId);
	}

	/**
	 * Get all rule nodes
	 */
	getAllRules(): CFRuleNode[] {
		return Array.from(this.ruleNodes.values());
	}

	/**
	 * Get cell node by address
	 */
	getCell(address: Address): CellNode | undefined {
		return this.cellNodes.get(this.addressToKey(address));
	}

	/**
	 * Clear entire graph (useful for tests)
	 */
	clear(): void {
		this.nodes.clear();
		this.cellNodes.clear();
		this.formulaNodes.clear();
		this.ruleNodes.clear();
		this.dirtyRules.clear();
	}

	/**
	 * Get debug statistics
	 */
	getStats(): { cells: number; formulas: number; rules: number; dirtyRules: number } {
		return {
			cells: this.cellNodes.size,
			formulas: this.formulaNodes.size,
			rules: this.ruleNodes.size,
			dirtyRules: this.dirtyRules.size,
		};
	}
}
