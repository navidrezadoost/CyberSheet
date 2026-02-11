import { ConditionalFormattingDependencyGraph, RangeStatistics } from '../src/ConditionalFormattingDependencyGraph';
import { TopBottomRule, AboveAverageRule } from '../src/ConditionalFormattingEngine';
import { Address, Range } from '../src/types';

describe('ConditionalFormattingDependencyGraph', () => {
	let graph: ConditionalFormattingDependencyGraph;

	beforeEach(() => {
		graph = new ConditionalFormattingDependencyGraph();
	});

	describe('Node Management', () => {
		it('adds cell nodes', () => {
			const address: Address = { row: 1, col: 1 };
			const node = graph.addCell(address);

			expect(node.type).toBe('cell');
			expect(node.address).toEqual(address);
			expect(node.dependsOn.size).toBe(0);
			expect(node.affectsRules.size).toBe(0);
		});

		it('adds formula nodes with references', () => {
			const address: Address = { row: 1, col: 1 };
			const refs: Address[] = [
				{ row: 2, col: 2 },
				{ row: 3, col: 3 },
			];

			const node = graph.addFormula(address, '=A2+A3', refs);

			expect(node.type).toBe('formula');
			expect(node.expression).toBe('=A2+A3');
			expect(node.references.size).toBe(2);
		});

		it('adds CF rule nodes and links to cells', () => {
			const rule: TopBottomRule = {
				type: 'top-bottom',
				mode: 'top',
				rankType: 'number',
				rank: 3,
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 5 } }],
			};

			const node = graph.addRule('rule1', rule);

			expect(node.type).toBe('cf-rule');
			expect(node.ruleId).toBe('rule1');
			expect(node.dependsOnCells.size).toBe(5); // 5 cells in range
			expect(node.isDirty).toBe(true); // New rules start dirty
		});

		it('links cells to CF rules bidirectionally', () => {
			const rule: TopBottomRule = {
				type: 'top-bottom',
				mode: 'top',
				rankType: 'number',
				rank: 3,
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 3 } }],
			};

			graph.addRule('rule1', rule);

			// Check that cells know they affect the rule
			const cell1 = graph.getCell({ row: 1, col: 1 });
			const cell2 = graph.getCell({ row: 1, col: 2 });
			const cell3 = graph.getCell({ row: 1, col: 3 });

			expect(cell1?.affectsRules.has('rule1')).toBe(true);
			expect(cell2?.affectsRules.has('rule1')).toBe(true);
			expect(cell3?.affectsRules.has('rule1')).toBe(true);
		});

		it('removes CF rule nodes and unlinks cells', () => {
			const rule: TopBottomRule = {
				type: 'top-bottom',
				mode: 'top',
				rankType: 'number',
				rank: 3,
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 3 } }],
			};

			graph.addRule('rule1', rule);
			graph.removeRule('rule1');

			// Rule should be gone
			expect(graph.getRule('rule1')).toBeUndefined();

			// Cells should no longer reference the rule
			const cell1 = graph.getCell({ row: 1, col: 1 });
			expect(cell1?.affectsRules.has('rule1')).toBe(false);
		});

		it('updates CF rule nodes when ranges change', () => {
			const rule1: TopBottomRule = {
				type: 'top-bottom',
				mode: 'top',
				rankType: 'number',
				rank: 3,
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 3 } }],
			};

			graph.addRule('rule1', rule1);

			// Update rule with different range
			const rule2: TopBottomRule = {
				...rule1,
				ranges: [{ start: { row: 2, col: 2 }, end: { row: 2, col: 4 } }],
			};

			graph.addRule('rule1', rule2);

			// Old cells should not reference the rule
			const oldCell = graph.getCell({ row: 1, col: 1 });
			expect(oldCell?.affectsRules.has('rule1')).toBe(false);

			// New cells should reference the rule
			const newCell = graph.getCell({ row: 2, col: 2 });
			expect(newCell?.affectsRules.has('rule1')).toBe(true);

			// Rule should be dirty
			const ruleNode = graph.getRule('rule1');
			expect(ruleNode?.isDirty).toBe(true);
		});
	});

	describe('Dirty Propagation', () => {
		it('marks CF rules dirty when cell changes', () => {
			const rule: TopBottomRule = {
				type: 'top-bottom',
				mode: 'top',
				rankType: 'number',
				rank: 3,
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 5 } }],
			};

			graph.addRule('rule1', rule);
			graph.clearDirty('rule1'); // Mark as clean

			// Change a cell in the range
			graph.markCellDirty({ row: 1, col: 3 });

			// Rule should be dirty
			const ruleNode = graph.getRule('rule1');
			expect(ruleNode?.isDirty).toBe(true);

			const dirtyRules = graph.getDirtyRules();
			expect(dirtyRules.length).toBe(1);
			expect(dirtyRules[0].ruleId).toBe('rule1');
		});

		it('does not mark unrelated rules dirty', () => {
			const rule1: TopBottomRule = {
				type: 'top-bottom',
				mode: 'top',
				rankType: 'number',
				rank: 3,
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 3 } }],
			};

			const rule2: TopBottomRule = {
				type: 'top-bottom',
				mode: 'top',
				rankType: 'number',
				rank: 3,
				ranges: [{ start: { row: 5, col: 5 }, end: { row: 5, col: 7 } }],
			};

			graph.addRule('rule1', rule1);
			graph.addRule('rule2', rule2);
			graph.clearDirty('rule1');
			graph.clearDirty('rule2');

			// Change a cell in rule1's range
			graph.markCellDirty({ row: 1, col: 2 });

			// Only rule1 should be dirty
			const dirtyRules = graph.getDirtyRules();
			expect(dirtyRules.length).toBe(1);
			expect(dirtyRules[0].ruleId).toBe('rule1');

			// rule2 should still be clean
			const rule2Node = graph.getRule('rule2');
			expect(rule2Node?.isDirty).toBe(false);
		});

		it('marks multiple rules dirty when cell affects multiple rules', () => {
			const rule1: TopBottomRule = {
				type: 'top-bottom',
				mode: 'top',
				rankType: 'number',
				rank: 3,
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 5 } }],
			};

			const rule2: AboveAverageRule = {
				type: 'above-average',
				mode: 'above',
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 5 } }],
			};

			graph.addRule('rule1', rule1);
			graph.addRule('rule2', rule2);
			graph.clearDirty('rule1');
			graph.clearDirty('rule2');

			// Change a cell in both ranges (overlapping)
			graph.markCellDirty({ row: 1, col: 3 });

			// Both rules should be dirty
			const dirtyRules = graph.getDirtyRules();
			expect(dirtyRules.length).toBe(2);
			expect(dirtyRules.map(r => r.ruleId).sort()).toEqual(['rule1', 'rule2']);
		});

		it('marks range dirty (batch operation)', () => {
			const rule: TopBottomRule = {
				type: 'top-bottom',
				mode: 'top',
				rankType: 'number',
				rank: 3,
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 5, col: 5 } }],
			};

			graph.addRule('rule1', rule);
			graph.clearDirty('rule1');

			// Mark a sub-range dirty
			const dirtyRange: Range = { start: { row: 2, col: 2 }, end: { row: 3, col: 3 } };
			graph.markRangeDirty(dirtyRange);

			// Rule should be dirty
			const dirtyRules = graph.getDirtyRules();
			expect(dirtyRules.length).toBe(1);
			expect(dirtyRules[0].ruleId).toBe('rule1');
		});

		it('propagates dirty state through formulas', () => {
			const rule: AboveAverageRule = {
				type: 'above-average',
				mode: 'above',
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 5 } }],
			};

			// Add formula that references a cell
			graph.addFormula({ row: 10, col: 10 }, '=A1', [{ row: 1, col: 1 }]);
			
			// Add rule
			graph.addRule('rule1', rule);
			graph.clearDirty('rule1');

			// Change the cell that the formula references
			graph.markCellDirty({ row: 1, col: 1 });

			// Rule should be dirty (because cell A1 is in rule's range)
			const dirtyRules = graph.getDirtyRules();
			expect(dirtyRules.length).toBe(1);
		});

		it('clears dirty state after evaluation', () => {
			const rule: TopBottomRule = {
				type: 'top-bottom',
				mode: 'top',
				rankType: 'number',
				rank: 3,
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 5 } }],
			};

			graph.addRule('rule1', rule);
			expect(graph.getDirtyRules().length).toBe(1);

			graph.clearDirty('rule1');
			expect(graph.getDirtyRules().length).toBe(0);

			const ruleNode = graph.getRule('rule1');
			expect(ruleNode?.isDirty).toBe(false);
		});

		it('marks all rules dirty on demand', () => {
			graph.addRule('rule1', {
				type: 'top-bottom',
				mode: 'top',
				rankType: 'number',
				rank: 3,
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 5 } }],
			});

			graph.addRule('rule2', {
				type: 'above-average',
				mode: 'above',
				ranges: [{ start: { row: 2, col: 2 }, end: { row: 2, col: 6 } }],
			});

			graph.clearDirty('rule1');
			graph.clearDirty('rule2');
			expect(graph.getDirtyRules().length).toBe(0);

			graph.markAllDirty();

			const dirtyRules = graph.getDirtyRules();
			expect(dirtyRules.length).toBe(2);
		});
	});

	describe('Range Statistics Cache', () => {
		it('caches statistics for a rule', () => {
			const rule: TopBottomRule = {
				type: 'top-bottom',
				mode: 'top',
				rankType: 'number',
				rank: 3,
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 5 } }],
			};

			graph.addRule('rule1', rule);

			const stats: RangeStatistics = {
				numericValues: [10, 20, 30, 40, 50],
				allValues: [10, 20, 30, 40, 50],
				min: 10,
				max: 50,
				average: 30,
				stdDev: 14.14,
				count: 5,
				timestamp: Date.now(),
			};

			graph.setCachedStats('rule1', stats);

			const cached = graph.getCachedStats('rule1');
			expect(cached).toEqual(stats);
		});

		it('invalidates cache when cell changes', () => {
			const rule: TopBottomRule = {
				type: 'top-bottom',
				mode: 'top',
				rankType: 'number',
				rank: 3,
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 5 } }],
			};

			graph.addRule('rule1', rule);

			const stats: RangeStatistics = {
				numericValues: [10, 20, 30, 40, 50],
				allValues: [10, 20, 30, 40, 50],
				min: 10,
				max: 50,
				average: 30,
				stdDev: 14.14,
				count: 5,
				timestamp: Date.now(),
			};

			graph.setCachedStats('rule1', stats);
			expect(graph.getCachedStats('rule1')).toEqual(stats);

			// Change a cell in the range
			graph.markCellDirty({ row: 1, col: 3 });

			// Cache should be invalidated
			expect(graph.getCachedStats('rule1')).toBeUndefined();
		});

		it('returns undefined for uncached rule', () => {
			const rule: TopBottomRule = {
				type: 'top-bottom',
				mode: 'top',
				rankType: 'number',
				rank: 3,
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 5 } }],
			};

			graph.addRule('rule1', rule);
			expect(graph.getCachedStats('rule1')).toBeUndefined();
		});
	});

	describe('Utilities', () => {
		it('retrieves rule by ID', () => {
			const rule: TopBottomRule = {
				type: 'top-bottom',
				mode: 'top',
				rankType: 'number',
				rank: 3,
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 5 } }],
			};

			graph.addRule('rule1', rule);
			const node = graph.getRule('rule1');

			expect(node).toBeDefined();
			expect(node?.ruleId).toBe('rule1');
		});

		it('retrieves all rules', () => {
			graph.addRule('rule1', {
				type: 'top-bottom',
				mode: 'top',
				rankType: 'number',
				rank: 3,
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 5 } }],
			});

			graph.addRule('rule2', {
				type: 'above-average',
				mode: 'above',
				ranges: [{ start: { row: 2, col: 2 }, end: { row: 2, col: 6 } }],
			});

			const allRules = graph.getAllRules();
			expect(allRules.length).toBe(2);
			expect(allRules.map(r => r.ruleId).sort()).toEqual(['rule1', 'rule2']);
		});

		it('retrieves cell by address', () => {
			const address: Address = { row: 5, col: 10 };
			graph.addCell(address);

			const node = graph.getCell(address);
			expect(node).toBeDefined();
			expect(node?.address).toEqual(address);
		});

		it('clears entire graph', () => {
			graph.addCell({ row: 1, col: 1 });
			graph.addRule('rule1', {
				type: 'top-bottom',
				mode: 'top',
				rankType: 'number',
				rank: 3,
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 5 } }],
			});

			expect(graph.getStats().cells).toBeGreaterThan(0);
			expect(graph.getStats().rules).toBeGreaterThan(0);

			graph.clear();

			const stats = graph.getStats();
			expect(stats.cells).toBe(0);
			expect(stats.formulas).toBe(0);
			expect(stats.rules).toBe(0);
			expect(stats.dirtyRules).toBe(0);
		});

		it('provides debug statistics', () => {
			graph.addCell({ row: 1, col: 1 });
			graph.addCell({ row: 2, col: 2 });
			graph.addFormula({ row: 3, col: 3 }, '=A1+A2', [
				{ row: 1, col: 1 },
				{ row: 2, col: 2 },
			]);
			graph.addRule('rule1', {
				type: 'top-bottom',
				mode: 'top',
				rankType: 'number',
				rank: 3,
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 5 } }],
			});

			const stats = graph.getStats();
			expect(stats.cells).toBeGreaterThanOrEqual(2);
			expect(stats.formulas).toBe(1);
			expect(stats.rules).toBe(1);
			expect(stats.dirtyRules).toBe(1);
		});
	});

	describe('Edge Cases', () => {
		it('handles empty ranges gracefully', () => {
			const rule: TopBottomRule = {
				type: 'top-bottom',
				mode: 'top',
				rankType: 'number',
				rank: 3,
				ranges: [],
			};

			const node = graph.addRule('rule1', rule);
			expect(node.dependsOnCells.size).toBe(0);
		});

		it('handles single-cell ranges', () => {
			const rule: TopBottomRule = {
				type: 'top-bottom',
				mode: 'top',
				rankType: 'number',
				rank: 1,
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 1 } }],
			};

			const node = graph.addRule('rule1', rule);
			expect(node.dependsOnCells.size).toBe(1);
		});

		it('handles large ranges efficiently', () => {
			const rule: TopBottomRule = {
				type: 'top-bottom',
				mode: 'top',
				rankType: 'number',
				rank: 10,
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 100, col: 10 } }],
			};

			const startTime = Date.now();
			graph.addRule('rule1', rule);
			const elapsed = Date.now() - startTime;

			// Should add 1000 cells in reasonable time (<100ms)
			expect(elapsed).toBeLessThan(100);
			expect(graph.getStats().cells).toBe(1000);
		});

		it('handles overlapping ranges from multiple rules', () => {
			const rule1: TopBottomRule = {
				type: 'top-bottom',
				mode: 'top',
				rankType: 'number',
				rank: 3,
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 5 } }],
			};

			const rule2: AboveAverageRule = {
				type: 'above-average',
				mode: 'above',
				ranges: [{ start: { row: 1, col: 3 }, end: { row: 1, col: 7 } }],
			};

			graph.addRule('rule1', rule1);
			graph.addRule('rule2', rule2);

			// Cell (1,3) should affect both rules
			const cell = graph.getCell({ row: 1, col: 3 });
			expect(cell?.affectsRules.has('rule1')).toBe(true);
			expect(cell?.affectsRules.has('rule2')).toBe(true);
		});
	});
});
