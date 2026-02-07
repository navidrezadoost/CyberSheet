/**
 * Phase 3 Wave 3.1: Statistical Rules with Real Context
 * 
 * Tests statistical CF rules (top-bottom, duplicate-unique, above-average, percentile)
 * with REAL ConditionalFormattingContext and getValue callbacks.
 * 
 * ⚠️ CRITICAL RULES:
 * - NO mocks, NO simplifications
 * - Use real dataset with getValue callback
 * - Tests document CURRENT behavior
 * - If engine fails, test MUST fail (no workarounds)
 * - Each test = real Excel scenario
 * 
 * Test Pattern:
 * - Arrange: Dataset as Map<Address, CellValue> + CF rules
 * - Act: Evaluate with full context (address + getValue)
 * - Assert: Current behavior (may fail if incomplete)
 */

import { ConditionalFormattingEngine, TopBottomRule, DuplicateUniqueRule, AboveAverageRule, ValueRule } from '../src/ConditionalFormattingEngine';
import { Address, CellValue } from '../src/types';

describe('Phase 3 Wave 3.1: Statistical Rules with Real Context', () => {
	const engine = new ConditionalFormattingEngine();

	// Clear cache before each test to ensure isolation
	beforeEach(() => {
		engine.clearCache();
	});

	// Helper: Convert column number to letter (1 = A, 2 = B, etc.)
	const colToLetter = (col: number): string => {
		let letter = '';
		while (col > 0) {
			const remainder = (col - 1) % 26;
			letter = String.fromCharCode(65 + remainder) + letter;
			col = Math.floor((col - 1) / 26);
		}
		return letter;
	};

	// Helper: Create getValue callback from dataset
	const createGetValue = (dataset: Map<string, CellValue>) => {
		return (address: Address): CellValue => {
			const key = `${colToLetter(address.col)}${address.row}`;
			return dataset.get(key) ?? null;
		};
	};

	describe('🔝 Top-Bottom Rules with Real Dataset', () => {
		it('should identify top 3 values in real dataset', () => {
			// Arrange: Real Excel scenario - sales performance ranking
			// Dataset: A1:A10 with sales figures
			const dataset = new Map<string, CellValue>([
				['A1', 45], ['A2', 92], ['A3', 67],
				['A4', 88], ['A5', 34], ['A6', 91],
				['A7', 55], ['A8', 78], ['A9', 23],
				['A10', 99] // Highest: 99, 92, 91 (top 3)
			]);

			const rule: TopBottomRule = {
				type: 'top-bottom',
				mode: 'top',
				rankType: 'number',
				rank: 3, // Top 3 values
				priority: 1,
				style: { fillColor: '#00FF00' }
			};

			// Act: Test top 3 values
			const ctx99 = { address: { row: 10, col: 1 }, getValue: createGetValue(dataset) };
			const ctx92 = { address: { row: 2, col: 1 }, getValue: createGetValue(dataset) };
			const ctx91 = { address: { row: 6, col: 1 }, getValue: createGetValue(dataset) };
			const ctx88 = { address: { row: 4, col: 1 }, getValue: createGetValue(dataset) }; // 4th highest, should NOT match

			const result99 = engine.applyRules(99, [rule], ctx99);
			const result92 = engine.applyRules(92, [rule], ctx92);
			const result91 = engine.applyRules(91, [rule], ctx91);
			const result88 = engine.applyRules(88, [rule], ctx88);

			// Assert: Top 3 should match (99, 92, 91)
			// ⚠️ THIS TEST MAY FAIL if engine doesn't implement top-bottom correctly
			expect(result99.style?.fillColor).toBe('#00FF00'); // #1
			expect(result92.style?.fillColor).toBe('#00FF00'); // #2
			expect(result91.style?.fillColor).toBe('#00FF00'); // #3
			expect(result88.style).toBeUndefined(); // #4 - should NOT match

			// NOTE: Engine must scan entire range via getValue to determine top 3
			// If this fails, it means engine needs range-aware statistics implementation
		});

		it('should identify bottom 2 values in real dataset', () => {
			// Arrange: Bottom performers (lowest 2 values)
			const dataset = new Map<string, CellValue>([
				['A1', 45], ['A2', 92], ['A3', 67],
				['A4', 88], ['A5', 34], ['A6', 91],
				['A7', 55], ['A8', 78], ['A9', 23], // Lowest: 23, 34
				['A10', 99]
			]);

			const rule: TopBottomRule = {
				type: 'top-bottom',
				mode: 'bottom',
				rankType: 'number',
				rank: 2, // Bottom 2
				priority: 1,
				style: { fillColor: '#FF0000' }
			};

			// Act: Test lowest 2 values
			const ctx23 = { address: { row: 9, col: 1 }, getValue: createGetValue(dataset) };
			const ctx34 = { address: { row: 5, col: 1 }, getValue: createGetValue(dataset) };
			const ctx45 = { address: { row: 1, col: 1 }, getValue: createGetValue(dataset) }; // 3rd lowest

			const result23 = engine.applyRules(23, [rule], ctx23);
			const result34 = engine.applyRules(34, [rule], ctx34);
			const result45 = engine.applyRules(45, [rule], ctx45);

			// Assert: Bottom 2 should match
			expect(result23.style?.fillColor).toBe('#FF0000'); // Lowest
			expect(result34.style?.fillColor).toBe('#FF0000'); // 2nd lowest
			expect(result45.style).toBeUndefined(); // 3rd lowest - should NOT match
		});

		it('should handle top 20% (percentile rank)', () => {
			// Arrange: Top 20% of 10 values = top 2 values
			const dataset = new Map<string, CellValue>([
				['A1', 10], ['A2', 20], ['A3', 30],
				['A4', 40], ['A5', 50], ['A6', 60],
				['A7', 70], ['A8', 80], ['A9', 90], // Top 20% = 90, 100
				['A10', 100]
			]);

			const rule: TopBottomRule = {
				type: 'top-bottom',
				mode: 'top',
				rankType: 'percent',
				rank: 20, // Top 20%
				priority: 1,
				style: { fillColor: '#FFFF00' }
			};

			// Act: Test top 20% (should be 90, 100)
			const ctx100 = { address: { row: 10, col: 1 }, getValue: createGetValue(dataset) };
			const ctx90 = { address: { row: 9, col: 1 }, getValue: createGetValue(dataset) };
			const ctx80 = { address: { row: 8, col: 1 }, getValue: createGetValue(dataset) }; // Outside top 20%

			const result100 = engine.applyRules(100, [rule], ctx100);
			const result90 = engine.applyRules(90, [rule], ctx90);
			const result80 = engine.applyRules(80, [rule], ctx80);

			// Assert: Top 20% = top 2 values
			expect(result100.style?.fillColor).toBe('#FFFF00');
			expect(result90.style?.fillColor).toBe('#FFFF00');
			expect(result80.style).toBeUndefined(); // Outside top 20%
		});
	});

	describe('🔁 Duplicate-Unique Rules with Real Dataset', () => {
		it('should identify duplicate values in real dataset', () => {
			// Arrange: Dataset with duplicates (Excel scenario: find duplicate entries)
			const dataset = new Map<string, CellValue>([
				['A1', 'Apple'], ['A2', 'Banana'], ['A3', 'Apple'], // 'Apple' duplicated
				['A4', 'Cherry'], ['A5', 'Banana'], ['A6', 'Date'], // 'Banana' duplicated
				['A7', 'Cherry'] // 'Cherry' duplicated
			]);

			const rule: DuplicateUniqueRule = {
				type: 'duplicate-unique',
				mode: 'duplicate',
				priority: 1,
				style: { fillColor: '#FF0000' }
			};

			// Act: Test duplicate detection
			const ctxApple1 = { address: { row: 1, col: 1 }, getValue: createGetValue(dataset) };
			const ctxApple3 = { address: { row: 3, col: 1 }, getValue: createGetValue(dataset) };
			const ctxBanana2 = { address: { row: 2, col: 1 }, getValue: createGetValue(dataset) };
			const ctxDate = { address: { row: 6, col: 1 }, getValue: createGetValue(dataset) }; // Unique

			const resultApple1 = engine.applyRules('Apple', [rule], ctxApple1);
			const resultApple3 = engine.applyRules('Apple', [rule], ctxApple3);
			const resultBanana2 = engine.applyRules('Banana', [rule], ctxBanana2);
			const resultDate = engine.applyRules('Date', [rule], ctxDate);

			// Assert: Duplicates should match
			expect(resultApple1.style?.fillColor).toBe('#FF0000'); // Duplicate
			expect(resultApple3.style?.fillColor).toBe('#FF0000'); // Duplicate
			expect(resultBanana2.style?.fillColor).toBe('#FF0000'); // Duplicate
			expect(resultDate.style).toBeUndefined(); // Unique - should NOT match
		});

		it('should identify unique values in real dataset', () => {
			// Arrange: Same dataset, find unique entries
			const dataset = new Map<string, CellValue>([
				['A1', 'Apple'], ['A2', 'Banana'], ['A3', 'Apple'],
				['A4', 'Cherry'], ['A5', 'Banana'], ['A6', 'Date'], // 'Date' is unique
				['A7', 'Cherry']
			]);

			const rule: DuplicateUniqueRule = {
				type: 'duplicate-unique',
				mode: 'unique',
				priority: 1,
				style: { fillColor: '#00FF00' }
			};

			// Act: Test unique detection
			const ctxDate = { address: { row: 6, col: 1 }, getValue: createGetValue(dataset) };
			const ctxApple1 = { address: { row: 1, col: 1 }, getValue: createGetValue(dataset) };

			const resultDate = engine.applyRules('Date', [rule], ctxDate);
			const resultApple1 = engine.applyRules('Apple', [rule], ctxApple1);

			// Assert: Only unique should match
			expect(resultDate.style?.fillColor).toBe('#00FF00'); // Unique
			expect(resultApple1.style).toBeUndefined(); // Duplicate - should NOT match
		});

		it('should handle numeric duplicates with Excel-accurate comparison', () => {
			// Arrange: Numeric dataset with duplicates
			const dataset = new Map<string, CellValue>([
				['A1', 100], ['A2', 200], ['A3', 100], // 100 duplicated
				['A4', 300], ['A5', 200], ['A6', 400]  // 200 duplicated, 300/400 unique
			]);

			const rule: DuplicateUniqueRule = {
				type: 'duplicate-unique',
				mode: 'duplicate',
				priority: 1,
				style: { fillColor: '#FF0000' }
			};

			// Act: Test numeric duplicate detection
			const ctx100_1 = { address: { row: 1, col: 1 }, getValue: createGetValue(dataset) };
			const ctx100_3 = { address: { row: 3, col: 1 }, getValue: createGetValue(dataset) };
			const ctx300 = { address: { row: 4, col: 1 }, getValue: createGetValue(dataset) };

			const result100_1 = engine.applyRules(100, [rule], ctx100_1);
			const result100_3 = engine.applyRules(100, [rule], ctx100_3);
			const result300 = engine.applyRules(300, [rule], ctx300);

			// Assert: Numeric duplicates detected
			expect(result100_1.style?.fillColor).toBe('#FF0000'); // Duplicate
			expect(result100_3.style?.fillColor).toBe('#FF0000'); // Duplicate
			expect(result300.style).toBeUndefined(); // Unique
		});
	});

	describe('📊 Above-Average Rule with Real Dataset', () => {
		it('should identify values above average in real dataset', () => {
			// Arrange: Dataset with known average
			// Values: 10, 20, 30, 40, 50 → Average = 30
			const dataset = new Map<string, CellValue>([
				['A1', 10], ['A2', 20], ['A3', 30],
				['A4', 40], ['A5', 50]
			]);

			const rule: AboveAverageRule = {
				type: 'above-average',
				mode: 'above',
				priority: 1,
				style: { fillColor: '#00FF00' }
			};

			// Act: Test above-average detection
			const ctx50 = { address: { row: 5, col: 1 }, getValue: createGetValue(dataset) };
			const ctx40 = { address: { row: 4, col: 1 }, getValue: createGetValue(dataset) };
			const ctx30 = { address: { row: 3, col: 1 }, getValue: createGetValue(dataset) };
			const ctx20 = { address: { row: 2, col: 1 }, getValue: createGetValue(dataset) };

			const result50 = engine.applyRules(50, [rule], ctx50);
			const result40 = engine.applyRules(40, [rule], ctx40);
			const result30 = engine.applyRules(30, [rule], ctx30); // Exactly average
			const result20 = engine.applyRules(20, [rule], ctx20);

			// Assert: Values > 30 should match
			expect(result50.style?.fillColor).toBe('#00FF00'); // Above average
			expect(result40.style?.fillColor).toBe('#00FF00'); // Above average
			expect(result30.style).toBeUndefined(); // Exactly average - NOT above
			expect(result20.style).toBeUndefined(); // Below average
		});

		it('should identify values below average in real dataset', () => {
			// Arrange: Same dataset, test below-average
			const dataset = new Map<string, CellValue>([
				['A1', 10], ['A2', 20], ['A3', 30],
				['A4', 40], ['A5', 50] // Average = 30
			]);

			const rule: AboveAverageRule = {
				type: 'above-average',
				mode: 'below',
				priority: 1,
				style: { fillColor: '#FF0000' }
			};

			// Act: Test below-average detection
			const ctx10 = { address: { row: 1, col: 1 }, getValue: createGetValue(dataset) };
			const ctx20 = { address: { row: 2, col: 1 }, getValue: createGetValue(dataset) };
			const ctx30 = { address: { row: 3, col: 1 }, getValue: createGetValue(dataset) };

			const result10 = engine.applyRules(10, [rule], ctx10);
			const result20 = engine.applyRules(20, [rule], ctx20);
			const result30 = engine.applyRules(30, [rule], ctx30);

			// Assert: Values < 30 should match
			expect(result10.style?.fillColor).toBe('#FF0000'); // Below average
			expect(result20.style?.fillColor).toBe('#FF0000'); // Below average
			expect(result30.style).toBeUndefined(); // Exactly average - NOT below
		});

		it('should handle above-average with standard deviation multiplier', () => {
			// Arrange: Dataset with known mean + stddev
			// Values: 10, 20, 30, 40, 50 → Mean=30, StdDev≈14.14
			const dataset = new Map<string, CellValue>([
				['A1', 10], ['A2', 20], ['A3', 30],
				['A4', 40], ['A5', 50]
			]);

			const rule: AboveAverageRule = {
				type: 'above-average',
				mode: 'above',
				standardDeviations: 1, // Mean + 1*StdDev ≈ 44.14
				priority: 1,
				style: { fillColor: '#FFFF00' }
			};

			// Act: Test stddev-adjusted threshold
			const ctx50 = { address: { row: 5, col: 1 }, getValue: createGetValue(dataset) };
			const ctx40 = { address: { row: 4, col: 1 }, getValue: createGetValue(dataset) };

			const result50 = engine.applyRules(50, [rule], ctx50);
			const result40 = engine.applyRules(40, [rule], ctx40);

			// Assert: Only 50 > (30 + 14.14) should match
			expect(result50.style?.fillColor).toBe('#FFFF00'); // Above mean+stddev
			expect(result40.style).toBeUndefined(); // Below mean+stddev
		});
	});

	describe('🔀 Statistical + Explicit Rule Interaction', () => {
		it('should resolve conflict between top-bottom and value rule', () => {
			// Arrange: Dataset where value is top 3 AND matches value rule
			const dataset = new Map<string, CellValue>([
				['A1', 45], ['A2', 92], ['A3', 67],
				['A4', 88], ['A5', 34], ['A6', 91],
				['A7', 55], ['A8', 78], ['A9', 23],
				['A10', 99] // Top 3: 99, 92, 91
			]);

			const rules = [
				{
					type: 'top-bottom' as const,
					mode: 'top' as const,
					rankType: 'number' as const,
					rank: 3,
					priority: 1, // Higher priority
					style: { fillColor: '#00FF00' }
				},
				{
					type: 'value' as const,
					operator: '>' as const,
					value: 90,
					priority: 2, // Lower priority
					style: { fillColor: '#FF0000' }
				}
			];

			// Act: Value 92 (matches both: top 3 AND >90)
			const ctx92 = { address: { row: 2, col: 1 }, getValue: createGetValue(dataset) };
			const result92 = engine.applyRules(92, rules, ctx92);

			// Assert: Top-bottom wins (priority 1 > priority 2)
			expect(result92.style?.fillColor).toBe('#00FF00'); // Top-bottom (green)
		});

		it('should apply value rule when top-bottom does not match', () => {
			// Arrange: Value outside top 3 but matches value rule
			const dataset = new Map<string, CellValue>([
				['A1', 45], ['A2', 92], ['A3', 67],
				['A4', 88], ['A5', 34], ['A6', 91],
				['A7', 55], ['A8', 78], ['A9', 23],
				['A10', 99] // Top 3: 99, 92, 91
			]);

			const rules = [
				{
					type: 'top-bottom' as const,
					mode: 'top' as const,
					rankType: 'number' as const,
					rank: 3,
					priority: 1,
					style: { fillColor: '#00FF00' }
				},
				{
					type: 'value' as const,
					operator: '>' as const,
					value: 70,
					priority: 2,
					style: { fillColor: '#FF0000' }
				}
			];

			// Act: Value 88 (NOT in top 3, but >70)
			const ctx88 = { address: { row: 4, col: 1 }, getValue: createGetValue(dataset) };
			const result88 = engine.applyRules(88, rules, ctx88);

			// Assert: Value rule applies (top-bottom didn't match)
			expect(result88.style?.fillColor).toBe('#FF0000'); // Value rule (red)
		});

		it('should handle duplicate rule + formula rule conflict', () => {
			// Arrange: Value is duplicate AND matches formula condition
			const dataset = new Map<string, CellValue>([
				['A1', 100], ['A2', 200], ['A3', 100], // 100 duplicated
				['A4', 300]
			]);

			const rules = [
				{
					type: 'duplicate-unique' as const,
					mode: 'duplicate' as const,
					priority: 1,
					style: { fillColor: '#FF0000' }
				},
				{
					type: 'value' as const,
					operator: '<' as const,
					value: 150,
					priority: 2,
					style: { fillColor: '#0000FF' }
				}
			];

			// Act: Value 100 (duplicate AND <150)
			const ctx100 = { address: { row: 1, col: 1 }, getValue: createGetValue(dataset) };
			const result100 = engine.applyRules(100, rules, ctx100);

			// Assert: Duplicate rule wins (priority 1)
			expect(result100.style?.fillColor).toBe('#FF0000'); // Duplicate (red)
		});
	});

	describe('⚡ stopIfTrue with Statistical Rules', () => {
		it('should stop evaluation after statistical rule matches with stopIfTrue', () => {
			// Arrange: Top-bottom with stopIfTrue + value rule
			const dataset = new Map<string, CellValue>([
				['A1', 45], ['A2', 92], ['A3', 67],
				['A4', 88], ['A5', 34], ['A6', 91],
				['A7', 55], ['A8', 78], ['A9', 23],
				['A10', 99] // Top 3: 99, 92, 91
			]);

			const rules = [
				{
					type: 'top-bottom' as const,
					mode: 'top' as const,
					rankType: 'number' as const,
					rank: 3,
					priority: 2, // Higher priority (runs first)
					stopIfTrue: true, // STOP after this matches
					style: { fillColor: '#00FF00' }
				},
				{
					type: 'value' as const,
					operator: '>' as const,
					value: 90,
					priority: 1, // Lower priority (blocked by stopIfTrue)
					style: { fillColor: '#FF0000' }
				}
			];

			// Act: Value 92 (top 3, stopIfTrue should prevent value rule)
			const ctx92 = { address: { row: 2, col: 1 }, getValue: createGetValue(dataset) };
			const result92 = engine.applyRules(92, rules, ctx92);

			// Assert: Only top-bottom applies (stopIfTrue terminates)
			expect(result92.style?.fillColor).toBe('#00FF00'); // Top-bottom
			expect(result92.appliedRuleIds.length).toBe(1); // Only 1 rule applied
		});

		it('should continue after statistical rule does not match', () => {
			// Arrange: Statistical rule with stopIfTrue that doesn't match
			const dataset = new Map<string, CellValue>([
				['A1', 45], ['A2', 92], ['A3', 67],
				['A4', 88], ['A5', 34], ['A6', 91],
				['A7', 55], ['A8', 78], ['A9', 23],
				['A10', 99] // Top 3: 99, 92, 91
			]);

			const rules = [
				{
					type: 'top-bottom' as const,
					mode: 'top' as const,
					rankType: 'number' as const,
					rank: 3,
					priority: 1,
					stopIfTrue: true,
					style: { fillColor: '#00FF00' }
				},
				{
					type: 'value' as const,
					operator: '>' as const,
					value: 70,
					priority: 2,
					style: { fillColor: '#FF0000' }
				}
			];

			// Act: Value 78 (NOT top 3, but >70)
			const ctx78 = { address: { row: 8, col: 1 }, getValue: createGetValue(dataset) };
			const result78 = engine.applyRules(78, rules, ctx78);

			// Assert: Value rule applies (top-bottom didn't match, stopIfTrue not triggered)
			expect(result78.style?.fillColor).toBe('#FF0000'); // Value rule
		});
	});
});
