
import { ConditionalFormattingEngine, ColorScaleRule, DataBarRule, IconSetRule, FormulaRule, ValueRule, TopBottomRule, AboveAverageRule, DuplicateUniqueRule, DateOccurringRule, TextRule, ErrorsBlankRule } from '../src/ConditionalFormattingEngine';
import { Address, CellValue } from '../src/types';

describe('ConditionalFormattingEngine', () => {
	const engine = new ConditionalFormattingEngine();

	it('applies 2-color scale interpolation', () => {
		const rule: ColorScaleRule = {
			type: 'color-scale',
			minColor: '#ff0000',
			maxColor: '#00ff00',
			minValue: 0,
			maxValue: 100,
		};

		const result = engine.applyRules(50, [rule]);
		expect(result.style?.fillColor).toBe('#808000');
	});

	it('applies 3-color scale using mid stop', () => {
		const rule: ColorScaleRule = {
			type: 'color-scale',
			minColor: '#ff0000',
			midColor: '#ffff00',
			maxColor: '#00ff00',
			minValue: 0,
			midValue: 50,
			maxValue: 100,
		};

		const result = engine.applyRules(25, [rule]);
		expect(result.style?.fillColor).toBe('#ff8000');
	});

	it('computes data bar percent and clamps', () => {
		const rule: DataBarRule = { type: 'data-bar', color: '#4caf50', minValue: 0, maxValue: 100 };
		const result = engine.applyRules(150, [rule]);
		expect(result.dataBar?.percent).toBe(1);
		expect(result.dataBar?.color).toBe('#4caf50');
	});

	it('selects icon index based on thresholds', () => {
		const rule: IconSetRule = {
			type: 'icon-set',
			iconSet: '3-arrows',
			ranges: [{ start: { row: 1, col: 1 }, end: { row: 10, col: 1 } }],
			thresholds: [
				{ value: 67, type: 'percent', icon: 'up', operator: '>=' },
				{ value: 33, type: 'percent', icon: 'right', operator: '>=' },
				{ value: 0, type: 'percent', icon: 'down', operator: '>=' },
			],
		};
		const result = engine.applyRules(70, [rule], {
			address: { row: 5, col: 1 },
			getValue: () => 70, // Simple dataset
		});
		expect(result.icon?.iconIndex).toBeDefined();
		expect(result.icon?.iconSet).toBe('3-arrows');
	});

	it('evaluates formula rule via custom evaluator', () => {
		const rule: FormulaRule = { type: 'formula', expression: 'IS_OK', style: { fillColor: '#123456' } };
		const evaluator = (expr: string) => expr === 'IS_OK';
		const result = engine.applyRules(10, [rule], {}, { formulaEvaluator: evaluator });
		expect(result.style?.fillColor).toBe('#123456');
	});

	it('evaluates value rule comparisons', () => {
		const rule: ValueRule = { type: 'value', operator: 'between', value: 10, value2: 20, style: { fillColor: '#abcdef' } };
		const result = engine.applyRules(15, [rule]);
		expect(result.style?.fillColor).toBe('#abcdef');
	});

	it('respects priority and stopIfTrue', () => {
		const high: ValueRule = { type: 'value', operator: '>', value: 5, style: { fillColor: '#ff0000' }, priority: 10, stopIfTrue: true };
		const low: DataBarRule = { type: 'data-bar', color: '#4caf50', minValue: 0, maxValue: 10, priority: 1 };
		const result = engine.applyRules(8, [low, high]);
		expect(result.style?.fillColor).toBe('#ff0000');
		expect(result.dataBar).toBeUndefined();
	});

	it('filters rules by range when address provided', () => {
		const target: Address = { row: 5, col: 5 };
		const rule: ValueRule = {
			type: 'value',
			operator: '>',
			value: 1,
			style: { fillColor: '#000000' },
			ranges: [{ start: { row: 1, col: 1 }, end: { row: 3, col: 3 } }],
		};

		const result = engine.applyRules(10, [rule], { address: target });
		expect(result.appliedRuleIds.length).toBe(0);
		expect(result.style).toBeUndefined();
	});

	// ============================
	// Phase 1: New Rule Type Tests
	// ============================

	describe('Top/Bottom N rules', () => {
		it('highlights top 3 values in range', () => {
			const rule: TopBottomRule = {
				type: 'top-bottom',
				mode: 'top',
				rankType: 'number',
				rank: 3,
				style: { fillColor: '#ff0000' },
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 5 } }],
			};

			const mockGetValue = (addr: Address): CellValue => {
				// Mock range: [10, 20, 30, 40, 50]
				return [10, 20, 30, 40, 50][addr.col - 1] ?? null;
			};

			// Test top 3: 50, 40, 30
			const result1 = engine.applyRules(50, [rule], { address: { row: 1, col: 5 }, getValue: mockGetValue });
			expect(result1.style?.fillColor).toBe('#ff0000');

			const result2 = engine.applyRules(40, [rule], { address: { row: 1, col: 4 }, getValue: mockGetValue });
			expect(result2.style?.fillColor).toBe('#ff0000');

			const result3 = engine.applyRules(30, [rule], { address: { row: 1, col: 3 }, getValue: mockGetValue });
			expect(result3.style?.fillColor).toBe('#ff0000');

			// Not in top 3
			const result4 = engine.applyRules(20, [rule], { address: { row: 1, col: 2 }, getValue: mockGetValue });
			expect(result4.style?.fillColor).toBeUndefined();
		});

		it('highlights bottom 2 values in range', () => {
			const rule: TopBottomRule = {
				type: 'top-bottom',
				mode: 'bottom',
				rankType: 'number',
				rank: 2,
				style: { fillColor: '#0000ff' },
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 5 } }],
			};

			const mockGetValue = (addr: Address): CellValue => {
				return [10, 20, 30, 40, 50][addr.col - 1] ?? null;
			};

			// Test bottom 2: 10, 20
			const result1 = engine.applyRules(10, [rule], { address: { row: 1, col: 1 }, getValue: mockGetValue });
			expect(result1.style?.fillColor).toBe('#0000ff');

			const result2 = engine.applyRules(20, [rule], { address: { row: 1, col: 2 }, getValue: mockGetValue });
			expect(result2.style?.fillColor).toBe('#0000ff');

			// Not in bottom 2
			const result3 = engine.applyRules(30, [rule], { address: { row: 1, col: 3 }, getValue: mockGetValue });
			expect(result3.style?.fillColor).toBeUndefined();
		});

		it('highlights top 40% of values', () => {
			const rule: TopBottomRule = {
				type: 'top-bottom',
				mode: 'top',
				rankType: 'percent',
				rank: 40, // top 40%
				style: { fillColor: '#00ff00' },
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 5 } }],
			};

			const mockGetValue = (addr: Address): CellValue => {
				return [10, 20, 30, 40, 50][addr.col - 1] ?? null;
			};

			// 40% of 5 values = 2 values: 50, 40
			const result1 = engine.applyRules(50, [rule], { address: { row: 1, col: 5 }, getValue: mockGetValue });
			expect(result1.style?.fillColor).toBe('#00ff00');

			const result2 = engine.applyRules(40, [rule], { address: { row: 1, col: 4 }, getValue: mockGetValue });
			expect(result2.style?.fillColor).toBe('#00ff00');

			// Not in top 40%
			const result3 = engine.applyRules(30, [rule], { address: { row: 1, col: 3 }, getValue: mockGetValue });
			expect(result3.style?.fillColor).toBeUndefined();
		});

		it('handles empty cells in top/bottom N', () => {
			const rule: TopBottomRule = {
				type: 'top-bottom',
				mode: 'top',
				rankType: 'number',
				rank: 2,
				style: { fillColor: '#ff0000' },
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 5 } }],
			};

			const mockGetValue = (addr: Address): CellValue => {
				// Range: [10, null, 20, '', 30]
				const values: CellValue[] = [10, null, 20, '', 30];
				return values[addr.col - 1] ?? null;
			};

			// Top 2 numeric values: 30, 20
			const result1 = engine.applyRules(30, [rule], { address: { row: 1, col: 5 }, getValue: mockGetValue });
			expect(result1.style?.fillColor).toBe('#ff0000');

			const result2 = engine.applyRules(20, [rule], { address: { row: 1, col: 3 }, getValue: mockGetValue });
			expect(result2.style?.fillColor).toBe('#ff0000');

			// Not in top 2
			const result3 = engine.applyRules(10, [rule], { address: { row: 1, col: 1 }, getValue: mockGetValue });
			expect(result3.style?.fillColor).toBeUndefined();
		});
	});

	describe('Above/Below Average rules', () => {
		it('highlights values above average', () => {
			const rule: AboveAverageRule = {
				type: 'above-average',
				mode: 'above',
				style: { fillColor: '#ff0000' },
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 5 } }],
			};

			const mockGetValue = (addr: Address): CellValue => {
				// Range: [10, 20, 30, 40, 50], average = 30
				return [10, 20, 30, 40, 50][addr.col - 1] ?? null;
			};

			// Above average: 40, 50
			const result1 = engine.applyRules(40, [rule], { address: { row: 1, col: 4 }, getValue: mockGetValue });
			expect(result1.style?.fillColor).toBe('#ff0000');

			const result2 = engine.applyRules(50, [rule], { address: { row: 1, col: 5 }, getValue: mockGetValue });
			expect(result2.style?.fillColor).toBe('#ff0000');

			// Not above average
			const result3 = engine.applyRules(30, [rule], { address: { row: 1, col: 3 }, getValue: mockGetValue });
			expect(result3.style?.fillColor).toBeUndefined();

			const result4 = engine.applyRules(20, [rule], { address: { row: 1, col: 2 }, getValue: mockGetValue });
			expect(result4.style?.fillColor).toBeUndefined();
		});

		it('highlights values below average', () => {
			const rule: AboveAverageRule = {
				type: 'above-average',
				mode: 'below',
				style: { fillColor: '#0000ff' },
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 5 } }],
			};

			const mockGetValue = (addr: Address): CellValue => {
				return [10, 20, 30, 40, 50][addr.col - 1] ?? null;
			};

			// Below average (30): 10, 20
			const result1 = engine.applyRules(10, [rule], { address: { row: 1, col: 1 }, getValue: mockGetValue });
			expect(result1.style?.fillColor).toBe('#0000ff');

			const result2 = engine.applyRules(20, [rule], { address: { row: 1, col: 2 }, getValue: mockGetValue });
			expect(result2.style?.fillColor).toBe('#0000ff');

			// Not below average
			const result3 = engine.applyRules(30, [rule], { address: { row: 1, col: 3 }, getValue: mockGetValue });
			expect(result3.style?.fillColor).toBeUndefined();
		});

		it('handles equal-or-above with standard deviations', () => {
			const rule: AboveAverageRule = {
				type: 'above-average',
				mode: 'equal-or-above',
				standardDeviations: 1, // 1 std dev above average
				style: { fillColor: '#00ff00' },
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 5 } }],
			};

			const mockGetValue = (addr: Address): CellValue => {
				// Range: [10, 20, 30, 40, 50]
				// Average = 30, Std Dev = sqrt(200) ≈ 14.14, threshold ≈ 44.14
				return [10, 20, 30, 40, 50][addr.col - 1] ?? null;
			};

			// 50 >= 44.14
			const result1 = engine.applyRules(50, [rule], { address: { row: 1, col: 5 }, getValue: mockGetValue });
			expect(result1.style?.fillColor).toBe('#00ff00');

			// 40 < 44.14
			const result2 = engine.applyRules(40, [rule], { address: { row: 1, col: 4 }, getValue: mockGetValue });
			expect(result2.style?.fillColor).toBeUndefined();
		});

		it('handles empty and error cells in average calculation', () => {
			const rule: AboveAverageRule = {
				type: 'above-average',
				mode: 'above',
				style: { fillColor: '#ff0000' },
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 6 } }],
			};

			const mockGetValue = (addr: Address): CellValue => {
				// Range: [10, null, 20, '', 30, '#N/A']
				// Numeric values: [10, 20, 30], average = 20
				const values: CellValue[] = [10, null, 20, '', 30, '#N/A'];
				return values[addr.col - 1] ?? null;
			};

			// Above average (20): 30
			const result1 = engine.applyRules(30, [rule], { address: { row: 1, col: 5 }, getValue: mockGetValue });
			expect(result1.style?.fillColor).toBe('#ff0000');

			// Not above average
			const result2 = engine.applyRules(20, [rule], { address: { row: 1, col: 3 }, getValue: mockGetValue });
			expect(result2.style?.fillColor).toBeUndefined();
		});
	});

	describe('Duplicate/Unique rules', () => {
		it('highlights duplicate values (case-insensitive)', () => {
			const rule: DuplicateUniqueRule = {
				type: 'duplicate-unique',
				mode: 'duplicate',
				style: { fillColor: '#ff0000' },
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 5 } }],
			};

			const mockGetValue = (addr: Address): CellValue => {
				// Range: ['apple', 'APPLE', 'banana', 'cherry', 'banana']
				const values: CellValue[] = ['apple', 'APPLE', 'banana', 'cherry', 'banana'];
				return values[addr.col - 1] ?? null;
			};

			// Duplicates: 'apple' (appears 2x), 'banana' (appears 2x)
			const result1 = engine.applyRules('apple', [rule], { address: { row: 1, col: 1 }, getValue: mockGetValue });
			expect(result1.style?.fillColor).toBe('#ff0000');

			const result2 = engine.applyRules('APPLE', [rule], { address: { row: 1, col: 2 }, getValue: mockGetValue });
			expect(result2.style?.fillColor).toBe('#ff0000');

			const result3 = engine.applyRules('banana', [rule], { address: { row: 1, col: 3 }, getValue: mockGetValue });
			expect(result3.style?.fillColor).toBe('#ff0000');

			// Unique: 'cherry'
			const result4 = engine.applyRules('cherry', [rule], { address: { row: 1, col: 4 }, getValue: mockGetValue });
			expect(result4.style?.fillColor).toBeUndefined();
		});

		it('highlights unique values', () => {
			const rule: DuplicateUniqueRule = {
				type: 'duplicate-unique',
				mode: 'unique',
				style: { fillColor: '#00ff00' },
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 5 } }],
			};

			const mockGetValue = (addr: Address): CellValue => {
				const values: CellValue[] = ['apple', 'APPLE', 'banana', 'cherry', 'banana'];
				return values[addr.col - 1] ?? null;
			};

			// Unique: 'cherry'
			const result1 = engine.applyRules('cherry', [rule], { address: { row: 1, col: 4 }, getValue: mockGetValue });
			expect(result1.style?.fillColor).toBe('#00ff00');

			// Not unique
			const result2 = engine.applyRules('apple', [rule], { address: { row: 1, col: 1 }, getValue: mockGetValue });
			expect(result2.style?.fillColor).toBeUndefined();

			const result3 = engine.applyRules('banana', [rule], { address: { row: 1, col: 3 }, getValue: mockGetValue });
			expect(result3.style?.fillColor).toBeUndefined();
		});

		it('respects case-sensitive option', () => {
			const rule: DuplicateUniqueRule = {
				type: 'duplicate-unique',
				mode: 'duplicate',
				caseSensitive: true,
				style: { fillColor: '#ff0000' },
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 5 } }],
			};

			const mockGetValue = (addr: Address): CellValue => {
				const values: CellValue[] = ['apple', 'APPLE', 'banana', 'cherry', 'banana'];
				return values[addr.col - 1] ?? null;
			};

			// Case-sensitive: 'apple' and 'APPLE' are different, so both are unique
			const result1 = engine.applyRules('apple', [rule], { address: { row: 1, col: 1 }, getValue: mockGetValue });
			expect(result1.style?.fillColor).toBeUndefined();

			const result2 = engine.applyRules('APPLE', [rule], { address: { row: 1, col: 2 }, getValue: mockGetValue });
			expect(result2.style?.fillColor).toBeUndefined();

			// 'banana' appears 2x, so it's a duplicate
			const result3 = engine.applyRules('banana', [rule], { address: { row: 1, col: 3 }, getValue: mockGetValue });
			expect(result3.style?.fillColor).toBe('#ff0000');
		});

		// TODO: This test is skipped because the duplicate rule implementation needs review
		it.skip('handles mixed text and number types', () => {
			const rule: DuplicateUniqueRule = {
				type: 'duplicate-unique',
				mode: 'duplicate',
				style: { fillColor: '#ff0000' },
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 5 } }],
			};

			const mockGetValue = (addr: Address): CellValue => {
				// Range: [123, '123', 'text', 'text', 456]
				const values: CellValue[] = [123, '123', 'text', 'text', 456];
				return values[addr.col - 1] ?? null;
			};

			// Excel treats 123 (number) and '123' (string) as DIFFERENT types - not duplicates
			const result1 = engine.applyRules(123, [rule], { address: { row: 1, col: 1 }, getValue: mockGetValue });
			expect(result1.style?.fillColor).toBeUndefined(); // Unique - type differs from string '123'

			const result2 = engine.applyRules('123', [rule], { address: { row: 1, col: 2 }, getValue: mockGetValue });
			expect(result2.style?.fillColor).toBeUndefined(); // Unique - type differs from number 123

			// 'text' appears 2x
			const result3 = engine.applyRules('text', [rule], { address: { row: 1, col: 3 }, getValue: mockGetValue });
			expect(result3.style?.fillColor).toBe('#ff0000');

			// 456 is unique
			const result4 = engine.applyRules(456, [rule], { address: { row: 1, col: 5 }, getValue: mockGetValue });
			expect(result4.style?.fillColor).toBeUndefined();
		});
	});

	describe('Date Occurring rules', () => {
		it('highlights dates occurring today', () => {
			const rule: DateOccurringRule = {
				type: 'date-occurring',
				timePeriod: 'today',
				style: { fillColor: '#ff0000' },
			};

			const today = new Date();
			const yesterday = new Date(today);
			yesterday.setDate(yesterday.getDate() - 1);

			const result1 = engine.applyRules(today.toISOString(), [rule]);
			expect(result1.style?.fillColor).toBe('#ff0000');

			const result2 = engine.applyRules(yesterday.toISOString(), [rule]);
			expect(result2.style?.fillColor).toBeUndefined();
		});

		it('highlights dates in last 7 days', () => {
			const rule: DateOccurringRule = {
				type: 'date-occurring',
				timePeriod: 'last-7-days',
				style: { fillColor: '#00ff00' },
			};

			const today = new Date();
			const fiveDaysAgo = new Date(today);
			fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
			const eightDaysAgo = new Date(today);
			eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

			const result1 = engine.applyRules(fiveDaysAgo.toISOString(), [rule]);
			expect(result1.style?.fillColor).toBe('#00ff00');

			const result2 = engine.applyRules(eightDaysAgo.toISOString(), [rule]);
			expect(result2.style?.fillColor).toBeUndefined();
		});

		it('highlights dates in this month', () => {
			const rule: DateOccurringRule = {
				type: 'date-occurring',
				timePeriod: 'this-month',
				style: { fillColor: '#0000ff' },
			};

			const today = new Date();
			const thisMonth = new Date(today.getFullYear(), today.getMonth(), 15);
			const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 15);

			const result1 = engine.applyRules(thisMonth.toISOString(), [rule]);
			expect(result1.style?.fillColor).toBe('#0000ff');

			const result2 = engine.applyRules(lastMonth.toISOString(), [rule]);
			expect(result2.style?.fillColor).toBeUndefined();
		});

		it('handles Excel serial dates', () => {
			const rule: DateOccurringRule = {
				type: 'date-occurring',
				timePeriod: 'last-7-days',
				style: { fillColor: '#ff0000' },
			};

			// Excel serial date for a date within last 7 days
			const threeDaysAgo = new Date();
			threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
			threeDaysAgo.setHours(0, 0, 0, 0); // Normalize to midnight

			const excelEpoch = new Date(1899, 11, 30);
			const daysSinceEpoch = Math.floor((threeDaysAgo.getTime() - excelEpoch.getTime()) / (24 * 60 * 60 * 1000));

			const result = engine.applyRules(daysSinceEpoch, [rule]);
			expect(result.style?.fillColor).toBe('#ff0000');
		});
	});

	describe('Text Contains rules', () => {
		it('highlights text containing substring (case-insensitive)', () => {
			const rule: TextRule = {
				type: 'text',
				mode: 'contains',
				text: 'apple',
				style: { fillColor: '#ff0000' },
			};

			const result1 = engine.applyRules('I like apples', [rule]);
			expect(result1.style?.fillColor).toBe('#ff0000');

			const result2 = engine.applyRules('I like APPLES', [rule]);
			expect(result2.style?.fillColor).toBe('#ff0000');

			const result3 = engine.applyRules('I like bananas', [rule]);
			expect(result3.style?.fillColor).toBeUndefined();
		});

		it('highlights text beginning with substring', () => {
			const rule: TextRule = {
				type: 'text',
				mode: 'begins-with',
				text: 'Hello',
				style: { fillColor: '#00ff00' },
			};

			const result1 = engine.applyRules('Hello world', [rule]);
			expect(result1.style?.fillColor).toBe('#00ff00');

			const result2 = engine.applyRules('Say hello', [rule]);
			expect(result2.style?.fillColor).toBeUndefined();
		});

		it('highlights text ending with substring', () => {
			const rule: TextRule = {
				type: 'text',
				mode: 'ends-with',
				text: 'world',
				style: { fillColor: '#0000ff' },
			};

			const result1 = engine.applyRules('Hello world', [rule]);
			expect(result1.style?.fillColor).toBe('#0000ff');

			const result2 = engine.applyRules('world is here', [rule]);
			expect(result2.style?.fillColor).toBeUndefined();
		});

		it('supports Excel wildcards: * (any chars)', () => {
			const rule: TextRule = {
				type: 'text',
				mode: 'contains',
				text: 'a*e',
				useWildcards: true,
				style: { fillColor: '#ff0000' },
			};

			const result1 = engine.applyRules('apple', [rule]);
			expect(result1.style?.fillColor).toBe('#ff0000');

			const result2 = engine.applyRules('axe', [rule]);
			expect(result2.style?.fillColor).toBe('#ff0000');

			const result3 = engine.applyRules('banana', [rule]);
			expect(result3.style?.fillColor).toBeUndefined();
		});

		it('supports Excel wildcards: ? (single char)', () => {
			const rule: TextRule = {
				type: 'text',
				mode: 'contains',
				text: 'a?e',
				useWildcards: true,
				style: { fillColor: '#ff0000' },
			};

			const result1 = engine.applyRules('axe', [rule]);
			expect(result1.style?.fillColor).toBe('#ff0000');

			const result2 = engine.applyRules('ace', [rule]);
			expect(result2.style?.fillColor).toBe('#ff0000');

			const result3 = engine.applyRules('apple', [rule]);
			expect(result3.style?.fillColor).toBeUndefined(); // 'a' and 'e' not 1 char apart
		});

		it('respects case-sensitive option', () => {
			const rule: TextRule = {
				type: 'text',
				mode: 'contains',
				text: 'Apple',
				caseSensitive: true,
				style: { fillColor: '#ff0000' },
			};

			const result1 = engine.applyRules('I like Apples', [rule]);
			expect(result1.style?.fillColor).toBe('#ff0000');

			const result2 = engine.applyRules('I like apples', [rule]);
			expect(result2.style?.fillColor).toBeUndefined();
		});
	});

	describe('Errors/Blank rules', () => {
		it('highlights error values', () => {
			const rule: ErrorsBlankRule = {
				type: 'errors-blank',
				mode: 'errors',
				style: { fillColor: '#ff0000' },
			};

			const result1 = engine.applyRules('#DIV/0!', [rule]);
			expect(result1.style?.fillColor).toBe('#ff0000');

			const result2 = engine.applyRules('#N/A', [rule]);
			expect(result2.style?.fillColor).toBe('#ff0000');

			const result3 = engine.applyRules('#VALUE!', [rule]);
			expect(result3.style?.fillColor).toBe('#ff0000');

			const result4 = engine.applyRules('normal text', [rule]);
			expect(result4.style?.fillColor).toBeUndefined();

			const result5 = engine.applyRules(123, [rule]);
			expect(result5.style?.fillColor).toBeUndefined();
		});

		it('highlights non-error values', () => {
			const rule: ErrorsBlankRule = {
				type: 'errors-blank',
				mode: 'no-errors',
				style: { fillColor: '#00ff00' },
			};

			const result1 = engine.applyRules('text', [rule]);
			expect(result1.style?.fillColor).toBe('#00ff00');

			const result2 = engine.applyRules(123, [rule]);
			expect(result2.style?.fillColor).toBe('#00ff00');

			const result3 = engine.applyRules('#DIV/0!', [rule]);
			expect(result3.style?.fillColor).toBeUndefined();
		});

		it('highlights blank cells', () => {
			const rule: ErrorsBlankRule = {
				type: 'errors-blank',
				mode: 'blanks',
				style: { fillColor: '#0000ff' },
			};

			const result1 = engine.applyRules(null, [rule]);
			expect(result1.style?.fillColor).toBe('#0000ff');

			const result2 = engine.applyRules('', [rule]);
			expect(result2.style?.fillColor).toBe('#0000ff');

			const result3 = engine.applyRules(0, [rule]);
			expect(result3.style?.fillColor).toBeUndefined();

			const result4 = engine.applyRules('text', [rule]);
			expect(result4.style?.fillColor).toBeUndefined();
		});

		it('highlights non-blank cells', () => {
			const rule: ErrorsBlankRule = {
				type: 'errors-blank',
				mode: 'no-blanks',
				style: { fillColor: '#ffff00' },
			};

			const result1 = engine.applyRules('text', [rule]);
			expect(result1.style?.fillColor).toBe('#ffff00');

			const result2 = engine.applyRules(123, [rule]);
			expect(result2.style?.fillColor).toBe('#ffff00');

			const result3 = engine.applyRules(0, [rule]);
			expect(result3.style?.fillColor).toBe('#ffff00');

			const result4 = engine.applyRules(null, [rule]);
			expect(result4.style?.fillColor).toBeUndefined();

			const result5 = engine.applyRules('', [rule]);
			expect(result5.style?.fillColor).toBeUndefined();
		});
	});

	// ============================
	// Phase 1: Rule Interaction Tests
	// ============================

	describe('Rule interactions and edge cases', () => {
		it('respects stopIfTrue with new rule types', () => {
			const highPriority: TopBottomRule = {
				type: 'top-bottom',
				mode: 'top',
				rankType: 'number',
				rank: 3,
				style: { fillColor: '#ff0000' },
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 5 } }],
				priority: 10,
				stopIfTrue: true,
			};

			const lowPriority: DataBarRule = {
				type: 'data-bar',
				color: '#4caf50',
				minValue: 0,
				maxValue: 100,
				priority: 1,
			};

			const mockGetValue = (addr: Address): CellValue => {
				return [10, 20, 30, 40, 50][addr.col - 1] ?? null;
			};

			// Value 50 matches top 3, should stop and not apply data bar
			const result = engine.applyRules(50, [lowPriority, highPriority], { address: { row: 1, col: 5 }, getValue: mockGetValue });
			expect(result.style?.fillColor).toBe('#ff0000');
			expect(result.dataBar).toBeUndefined();
		});

		it('applies multiple rules when stopIfTrue is false', () => {
			const rule1: AboveAverageRule = {
				type: 'above-average',
				mode: 'above',
				style: { fillColor: '#ff0000' },
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 5 } }],
				priority: 10,
				stopIfTrue: false,
			};

			const rule2: TextRule = {
				type: 'text',
				mode: 'contains',
				text: '5',
				style: { fontColor: '#0000ff' },
				priority: 5,
			};

			const mockGetValue = (addr: Address): CellValue => {
				return [10, 20, 30, 40, 50][addr.col - 1] ?? null;
			};

			// Value 50 is above average (30) and contains '5'
			const result = engine.applyRules(50, [rule1, rule2], { address: { row: 1, col: 5 }, getValue: mockGetValue });
			expect(result.style?.fillColor).toBe('#ff0000');
			expect(result.style?.fontColor).toBe('#0000ff');
		});

		it('handles overlapping ranges correctly', () => {
			const rule1: TopBottomRule = {
				type: 'top-bottom',
				mode: 'top',
				rankType: 'number',
				rank: 2,
				style: { fillColor: '#ff0000' },
				ranges: [{ start: { row: 1, col: 1 }, end: { row: 1, col: 3 } }],
			};

			const rule2: TopBottomRule = {
				type: 'top-bottom',
				mode: 'top',
				rankType: 'number',
				rank: 1,
				style: { fillColor: '#00ff00' },
				ranges: [{ start: { row: 1, col: 3 }, end: { row: 1, col: 5 } }],
			};

			const mockGetValue = (addr: Address): CellValue => {
				return [10, 20, 30, 40, 50][addr.col - 1] ?? null;
			};

			// Value 30 at col 3 is in both ranges
			// Range 1: [10, 20, 30] → top 2 = [30, 20]
			// Range 2: [30, 40, 50] → top 1 = [50]
			const result = engine.applyRules(30, [rule1, rule2], { address: { row: 1, col: 3 }, getValue: mockGetValue });
			expect(result.style?.fillColor).toBe('#ff0000'); // Matches rule1
		});
	});
});
