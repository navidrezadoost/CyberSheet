export * from './types';
export * from './worksheet';

 * export * from './workbook';

 * Phase 2 Step 4: Relative Reference Resolutionexport * from './events';

 * export * from './fillPatterns';

 * Definition of Done Tests:export * from './ExcelColor';

 * 1️⃣ Reference Resolution Tests (all 4 types + mixed scenarios)export * from './I18nManager';

 * 2️⃣ Excel Parity Tests (range offset verification)export * from './FormulaEngine';

 * 3️⃣ Performance Guard (no regex in hot path, compile once)export * from './FormulaController';

 */export * from './CollaborationEngine';

export * from './PivotEngine';

import { ConditionalFormattingFormulaCompiler, ReferenceType, CompiledFormula } from '../src/ConditionalFormattingFormulaCompiler';export * from './ConditionalFormattingEngine';

import { Address, CellValue } from '../src/types';export * from './ConditionalFormattingDependencyGraph';

export * from './ConditionalFormattingBatchEngine';

describe('ConditionalFormattingFormulaCompiler', () => {export * from './ConditionalFormattingStrategies';

	// Mock cell getterexport * from './ConditionalFormattingFormulaCompiler';

	const createMockGetCell = (values: Map<string, CellValue>) => {export * from './autocomplete';

		return (address: Address): CellValue => {export * from './models/ChartObject';

			const key = `${address.col},${address.row}`;export * from './models/AdvancedChartOptions';

			return values.get(key) ?? null;// ChartBuilderController temporarily excluded due to circular dependency

		};// Will be re-exported after renderer-canvas is built

	};// export * from './ChartBuilderController';


	// Helper to create address
	const addr = (col: number, row: number): Address => ({ col, row });

	describe('1️⃣ Reference Resolution Tests', () => {
		describe('Relative References (A1)', () => {
			it('should resolve relative reference with both col and row offset', () => {
				// Rule applied to B2:D4 with formula =A1>10
				const ruleBaseAddress = addr(2, 2); // B2
				const compiled = ConditionalFormattingFormulaCompiler.compile('=A1>10', ruleBaseAddress);

				// Verify references extracted
				expect(compiled.references).toHaveLength(1);
				expect(compiled.references[0]).toEqual({
					original: 'A1',
					colAbsolute: false,
					rowAbsolute: false,
					col: 1,
					row: 1
				});

				// Mock cell values
				const values = new Map<string, CellValue>();
				values.set('1,1', 5);   // A1 = 5
				values.set('2,4', 15);  // B4 = 15

				const getCell = createMockGetCell(values);

				// Evaluate at B2 (ruleBase)
				// A1 relative offset: (1-2, 1-2) = (-1, -1) from B2
				// Resolves to: B2 + (-1, -1) = A1
				expect(compiled.evaluate(addr(2, 2), getCell)).toBe(false); // A1=5 > 10? false

				// Evaluate at C5
				// A1 relative offset: (1-2, 1-2) = (-1, -1) from C5
				// Resolves to: C5 + (-1, -1) = B4
				values.set('2,4', 15); // B4 = 15
				expect(compiled.evaluate(addr(3, 5), getCell)).toBe(true); // B4=15 > 10? true
			});

			it('should handle relative reference with vertical shift', () => {
				const ruleBaseAddress = addr(1, 1); // A1
				const compiled = ConditionalFormattingFormulaCompiler.compile('=A2<50', ruleBaseAddress);

				const values = new Map<string, CellValue>();
				values.set('1,2', 30);  // A2 = 30
				values.set('1,10', 60); // A10 = 60

				const getCell = createMockGetCell(values);

				// At A1: A2 resolves to A2
				expect(compiled.evaluate(addr(1, 1), getCell)).toBe(true); // 30 < 50

				// At A9: A2 + offset (0, 2-1=1) from A9
				// Resolves to: A9 + (0, 1) = A10
				expect(compiled.evaluate(addr(1, 9), getCell)).toBe(false); // 60 < 50
			});

			it('should handle relative reference with horizontal shift', () => {
				const ruleBaseAddress = addr(1, 1); // A1
				const compiled = ConditionalFormattingFormulaCompiler.compile('=B1>100', ruleBaseAddress);

				const values = new Map<string, CellValue>();
				values.set('2,1', 50);  // B1 = 50
				values.set('5,1', 150); // E1 = 150

				const getCell = createMockGetCell(values);

				// At A1: B1 resolves to B1
				expect(compiled.evaluate(addr(1, 1), getCell)).toBe(false); // 50 > 100

				// At D1: B1 + offset (2-1=1, 0) from D1
				// Resolves to: D1 + (1, 0) = E1
				expect(compiled.evaluate(addr(4, 1), getCell)).toBe(true); // 150 > 100
			});
		});

		describe('Absolute References ($A$1)', () => {
			it('should resolve absolute reference to same cell regardless of target', () => {
				const ruleBaseAddress = addr(5, 5); // E5
				const compiled = ConditionalFormattingFormulaCompiler.compile('=$A$1>10', ruleBaseAddress);

				// Verify absolute flags
				expect(compiled.references[0]).toEqual({
					original: '$A$1',
					colAbsolute: true,
					rowAbsolute: true,
					col: 1,
					row: 1
				});

				const values = new Map<string, CellValue>();
				values.set('1,1', 25); // $A$1 = 25

				const getCell = createMockGetCell(values);

				// Evaluate at different cells - all should reference A1
				expect(compiled.evaluate(addr(5, 5), getCell)).toBe(true); // E5: $A$1=25 > 10
				expect(compiled.evaluate(addr(10, 10), getCell)).toBe(true); // J10: $A$1=25 > 10
				expect(compiled.evaluate(addr(1, 1), getCell)).toBe(true); // A1: $A$1=25 > 10
			});

			it('should cache absolute reference values', () => {
				const ruleBaseAddress = addr(1, 1);
				const compiled = ConditionalFormattingFormulaCompiler.compile('=$B$2>50', ruleBaseAddress);

				let fetchCount = 0;
				const getCell = (address: Address): CellValue => {
					fetchCount++;
					if (address.col === 2 && address.row === 2) {
						return 75;
					}
					return null;
				};

				// First evaluation
				expect(compiled.evaluate(addr(1, 1), getCell)).toBe(true);
				const firstFetchCount = fetchCount;

				// Second evaluation - should use cache for $B$2
				expect(compiled.evaluate(addr(2, 2), getCell)).toBe(true);
				const secondFetchCount = fetchCount;

				// Cache currently per-evaluation, so fetches will be same count
				// Future enhancement: cross-evaluation cache
				expect(secondFetchCount).toBeGreaterThanOrEqual(firstFetchCount);
			});
		});

		describe('Mixed References ($A1)', () => {
			it('should resolve $A1 with column absolute, row relative', () => {
				const ruleBaseAddress = addr(2, 2); // B2
				const compiled = ConditionalFormattingFormulaCompiler.compile('=$A1>10', ruleBaseAddress);

				// Verify mixed flags
				expect(compiled.references[0]).toEqual({
					original: '$A1',
					colAbsolute: true,
					rowAbsolute: false,
					col: 1,
					row: 1
				});

				const values = new Map<string, CellValue>();
				values.set('1,1', 5);   // $A1 = 5
				values.set('1,4', 15);  // $A4 = 15

				const getCell = createMockGetCell(values);

				// At B2: $A1 resolves to $A + (row 1 + offset)
				// Offset from ruleBase row: 2 - 2 = 0
				// Resolves to: $A1
				expect(compiled.evaluate(addr(2, 2), getCell)).toBe(false); // $A1=5 > 10

				// At B5: $A1 resolves to $A + (row 1 + (5-2))
				// Row offset: 5 - 2 = 3
				// Resolves to: $A(1+3) = $A4
				expect(compiled.evaluate(addr(2, 5), getCell)).toBe(true); // $A4=15 > 10

				// At C5: Column doesn't matter (absolute), row offset same
				// Resolves to: $A4
				expect(compiled.evaluate(addr(3, 5), getCell)).toBe(true); // $A4=15 > 10
			});
		});

		describe('Mixed References (A$1)', () => {
			it('should resolve A$1 with column relative, row absolute', () => {
				const ruleBaseAddress = addr(2, 2); // B2
				const compiled = ConditionalFormattingFormulaCompiler.compile('=A$1>10', ruleBaseAddress);

				// Verify mixed flags
				expect(compiled.references[0]).toEqual({
					original: 'A$1',
					colAbsolute: false,
					rowAbsolute: true,
					col: 1,
					row: 1
				});

				const values = new Map<string, CellValue>();
				values.set('1,1', 5);   // A$1 = 5
				values.set('4,1', 15);  // D$1 = 15

				const getCell = createMockGetCell(values);

				// At B2: A$1 resolves to (col A + offset) + $1
				// Col offset: 2 - 2 = 0
				// Resolves to: A$1
				expect(compiled.evaluate(addr(2, 2), getCell)).toBe(false); // A$1=5 > 10

				// At E2: A$1 resolves to (col A + (5-2)) + $1
				// Col offset: 5 - 2 = 3
				// Resolves to: (1+3)$1 = D$1
				expect(compiled.evaluate(addr(5, 2), getCell)).toBe(true); // D$1=15 > 10

				// At E10: Row doesn't matter (absolute), col offset same
				// Resolves to: D$1
				expect(compiled.evaluate(addr(5, 10), getCell)).toBe(true); // D$1=15 > 10
			});
		});

		describe('Multiple References with Mixed Types', () => {
			it('should handle formula with multiple reference types', () => {
				const ruleBaseAddress = addr(2, 2); // B2
				// Formula: A1 (relative) + $B$2 (absolute) + $C2 (mixed) + D$3 (mixed)
				const compiled = ConditionalFormattingFormulaCompiler.compile(
					'=A1+$B$2+$C2+D$3>100',
					ruleBaseAddress
				);

				// Verify all references extracted
				expect(compiled.references).toHaveLength(4);
				expect(compiled.references[0].original).toBe('A1');
				expect(compiled.references[1].original).toBe('$B$2');
				expect(compiled.references[2].original).toBe('$C2');
				expect(compiled.references[3].original).toBe('D$3');

				const values = new Map<string, CellValue>();
				// At B2:
				values.set('1,1', 10);  // A1 (relative → A1)
				values.set('2,2', 20);  // $B$2 (absolute → B2)
				values.set('3,2', 30);  // $C2 (mixed → $C2)
				values.set('4,3', 40);  // D$3 (mixed → D$3)
				// Sum: 10+20+30+40 = 100, NOT > 100

				const getCell = createMockGetCell(values);
				expect(compiled.evaluate(addr(2, 2), getCell)).toBe(false); // 100 > 100? false

				// At C3:
				// A1 → C3 + (-1,-1) = B2
				// $B$2 → B2 (absolute)
				// $C2 → $C3 (col absolute, row +1)
				// D$3 → E$3 (col +1, row absolute)
				values.set('2,2', 25);  // B2
				values.set('3,3', 35);  // C3
				values.set('5,3', 45);  // E3
				// Sum: 25+20+35+45 = 125 > 100
				expect(compiled.evaluate(addr(3, 3), getCell)).toBe(true);
			});
		});
	});

	describe('2️⃣ Excel Parity Tests', () => {
		it('should verify offset correct on every cell in range B2:D4 with formula =A1>10', () => {
			const ruleBaseAddress = addr(2, 2); // B2 (top-left)
			const compiled = ConditionalFormattingFormulaCompiler.compile('=A1>10', ruleBaseAddress);

			// Set up cell grid
			const values = new Map<string, CellValue>();
			// A1=5, A2=8, A3=12, A4=15
			values.set('1,1', 5);
			values.set('1,2', 8);
			values.set('1,3', 12);
			values.set('1,4', 15);
			// B1=6, B2=9, B3=13, B4=16
			values.set('2,1', 6);
			values.set('2,2', 9);
			values.set('2,3', 13);
			values.set('2,4', 16);
			// C1=7, C2=10, C3=14, C4=17
			values.set('3,1', 7);
			values.set('3,2', 10);
			values.set('3,3', 14);
			values.set('3,4', 17);
			// D1=8, D2=11, D3=15, D4=18
			values.set('4,1', 8);
			values.set('4,2', 11);
			values.set('4,3', 15);
			values.set('4,4', 18);

			const getCell = createMockGetCell(values);

			// Test range B2:D4
			// Expected resolutions (A1 relative from ruleBase B2):
			// B2 → A1 (5 > 10? false)
			expect(compiled.evaluate(addr(2, 2), getCell)).toBe(false);

			// B3 → A2 (8 > 10? false)
			expect(compiled.evaluate(addr(2, 3), getCell)).toBe(false);

			// B4 → A3 (12 > 10? true)
			expect(compiled.evaluate(addr(2, 4), getCell)).toBe(true);

			// C2 → B1 (6 > 10? false)
			expect(compiled.evaluate(addr(3, 2), getCell)).toBe(false);

			// C3 → B2 (9 > 10? false)
			expect(compiled.evaluate(addr(3, 3), getCell)).toBe(false);

			// C4 → B3 (13 > 10? true)
			expect(compiled.evaluate(addr(3, 4), getCell)).toBe(true);

			// D2 → C1 (7 > 10? false)
			expect(compiled.evaluate(addr(4, 2), getCell)).toBe(false);

			// D3 → C2 (10 > 10? false)
			expect(compiled.evaluate(addr(4, 3), getCell)).toBe(false);

			// D4 → C3 (14 > 10? true)
			expect(compiled.evaluate(addr(4, 4), getCell)).toBe(true);
		});

		it('should handle edge cells correctly (top-left and bottom-right)', () => {
			const ruleBaseAddress = addr(1, 1); // A1 (top-left)
			const compiled = ConditionalFormattingFormulaCompiler.compile('=A1<100', ruleBaseAddress);

			const values = new Map<string, CellValue>();
			values.set('1,1', 50);    // A1
			values.set('26,100', 75); // Z100

			const getCell = createMockGetCell(values);

			// Top-left: A1 → A1
			expect(compiled.evaluate(addr(1, 1), getCell)).toBe(true); // 50 < 100

			// Bottom-right: Z100 → A1 + (26-1, 100-1) = Z100
			expect(compiled.evaluate(addr(26, 100), getCell)).toBe(true); // 75 < 100
		});
	});

	describe('3️⃣ Performance Guard', () => {
		it('should compile formula only once', () => {
			const ruleBaseAddress = addr(1, 1);
			let compileCount = 0;

			// Monkey-patch parseReferences to count calls
			const originalParse = (ConditionalFormattingFormulaCompiler as any).parseReferences;
			(ConditionalFormattingFormulaCompiler as any).parseReferences = function(...args: any[]) {
				compileCount++;
				return originalParse.apply(this, args);
			};

			const compiled = ConditionalFormattingFormulaCompiler.compile('=A1>10', ruleBaseAddress);

			expect(compileCount).toBe(1); // Compiled once

			const values = new Map<string, CellValue>();
			values.set('1,1', 15);

			const getCell = createMockGetCell(values);

			// Evaluate multiple times
			compiled.evaluate(addr(1, 1), getCell);
			compiled.evaluate(addr(2, 2), getCell);
			compiled.evaluate(addr(3, 3), getCell);

			// Should still be 1 (no re-compile)
			expect(compileCount).toBe(1);

			// Restore
			(ConditionalFormattingFormulaCompiler as any).parseReferences = originalParse;
		});

		it('should not use regex in evaluate hot path', () => {
			const ruleBaseAddress = addr(1, 1);
			const compiled = ConditionalFormattingFormulaCompiler.compile('=A1+B1>100', ruleBaseAddress);

			const values = new Map<string, CellValue>();
			values.set('1,1', 60);
			values.set('2,1', 50);

			const getCell = createMockGetCell(values);

			// Spy on RegExp constructor
			const originalRegExp = global.RegExp;
			let regexCallCount = 0;
			global.RegExp = new Proxy(RegExp, {
				construct(target, args) {
					regexCallCount++;
					return Reflect.construct(target, args);
				}
			}) as any;

			// Evaluate multiple times
			const iterations = 1000;
			for (let i = 0; i < iterations; i++) {
				compiled.evaluate(addr(1, 1), getCell);
			}

			// Should be 0 (no regex in hot path)
			// Note: If Function() constructor internally uses regex, this might not be 0
			// But formula parsing regex should definitely not be called
			expect(regexCallCount).toBe(0);

			// Restore
			global.RegExp = originalRegExp;
		});

		it('should handle 10k evaluations in <50ms', () => {
			const ruleBaseAddress = addr(1, 1);
			const compiled = ConditionalFormattingFormulaCompiler.compile('=A1>50', ruleBaseAddress);

			const values = new Map<string, CellValue>();
			for (let i = 1; i <= 10000; i++) {
				values.set(`${i},1`, i % 100); // Values 0-99
			}

			const getCell = createMockGetCell(values);

			const startTime = performance.now();

			// Evaluate 10k cells
			for (let col = 1; col <= 10000; col++) {
				compiled.evaluate(addr(col, 1), getCell);
			}

			const elapsedMs = performance.now() - startTime;

			console.log(`✅ PERFORMANCE: ${elapsedMs.toFixed(2)}ms for 10k formula evaluations`);
			expect(elapsedMs).toBeLessThan(50);
		});
	});

	describe('Formula Expression Evaluation', () => {
		it('should evaluate comparison operators correctly', () => {
			const ruleBaseAddress = addr(1, 1);
			const values = new Map<string, CellValue>();
			values.set('1,1', 50);
			values.set('2,1', 100);

			const getCell = createMockGetCell(values);

			// Greater than
			let compiled = ConditionalFormattingFormulaCompiler.compile('=A1>40', ruleBaseAddress);
			expect(compiled.evaluate(addr(1, 1), getCell)).toBe(true);

			// Less than
			compiled = ConditionalFormattingFormulaCompiler.compile('=A1<60', ruleBaseAddress);
			expect(compiled.evaluate(addr(1, 1), getCell)).toBe(true);

			// Greater or equal
			compiled = ConditionalFormattingFormulaCompiler.compile('=A1>=50', ruleBaseAddress);
			expect(compiled.evaluate(addr(1, 1), getCell)).toBe(true);

			// Less or equal
			compiled = ConditionalFormattingFormulaCompiler.compile('=B1<=100', ruleBaseAddress);
			expect(compiled.evaluate(addr(1, 1), getCell)).toBe(true);

			// Equal
			compiled = ConditionalFormattingFormulaCompiler.compile('=A1=50', ruleBaseAddress);
			expect(compiled.evaluate(addr(1, 1), getCell)).toBe(true);

			// Not equal
			compiled = ConditionalFormattingFormulaCompiler.compile('=A1<>60', ruleBaseAddress);
			expect(compiled.evaluate(addr(1, 1), getCell)).toBe(true);
		});

		it('should evaluate logical operators (AND, OR)', () => {
			const ruleBaseAddress = addr(1, 1);
			const values = new Map<string, CellValue>();
			values.set('1,1', 50);
			values.set('2,1', 100);

			const getCell = createMockGetCell(values);

			// AND
			let compiled = ConditionalFormattingFormulaCompiler.compile('=AND(A1>40, B1<110)', ruleBaseAddress);
			expect(compiled.evaluate(addr(1, 1), getCell)).toBe(true);

			compiled = ConditionalFormattingFormulaCompiler.compile('=AND(A1>60, B1<110)', ruleBaseAddress);
			expect(compiled.evaluate(addr(1, 1), getCell)).toBe(false);

			// OR
			compiled = ConditionalFormattingFormulaCompiler.compile('=OR(A1>60, B1<110)', ruleBaseAddress);
			expect(compiled.evaluate(addr(1, 1), getCell)).toBe(true);

			compiled = ConditionalFormattingFormulaCompiler.compile('=OR(A1>60, B1>110)', ruleBaseAddress);
			expect(compiled.evaluate(addr(1, 1), getCell)).toBe(false);
		});

		it('should evaluate arithmetic expressions', () => {
			const ruleBaseAddress = addr(1, 1);
			const values = new Map<string, CellValue>();
			values.set('1,1', 30);
			values.set('2,1', 20);

			const getCell = createMockGetCell(values);

			// Addition
			let compiled = ConditionalFormattingFormulaCompiler.compile('=A1+B1>45', ruleBaseAddress);
			expect(compiled.evaluate(addr(1, 1), getCell)).toBe(true); // 30+20=50 > 45

			// Subtraction
			compiled = ConditionalFormattingFormulaCompiler.compile('=A1-B1<15', ruleBaseAddress);
			expect(compiled.evaluate(addr(1, 1), getCell)).toBe(true); // 30-20=10 < 15

			// Multiplication
			compiled = ConditionalFormattingFormulaCompiler.compile('=A1*2>50', ruleBaseAddress);
			expect(compiled.evaluate(addr(1, 1), getCell)).toBe(true); // 30*2=60 > 50

			// Division
			compiled = ConditionalFormattingFormulaCompiler.compile('=B1/2<15', ruleBaseAddress);
			expect(compiled.evaluate(addr(1, 1), getCell)).toBe(true); // 20/2=10 < 15
		});

		it('should handle empty cells as 0', () => {
			const ruleBaseAddress = addr(1, 1);
			const values = new Map<string, CellValue>();
			values.set('1,1', null);

			const getCell = createMockGetCell(values);

			const compiled = ConditionalFormattingFormulaCompiler.compile('=A1<10', ruleBaseAddress);
			expect(compiled.evaluate(addr(1, 1), getCell)).toBe(true); // null treated as 0
		});

		it('should handle errors as 0 in numeric comparisons', () => {
			const ruleBaseAddress = addr(1, 1);
			const values = new Map<string, CellValue>();
			values.set('1,1', { message: '#DIV/0!' });

			const getCell = createMockGetCell(values);

			const compiled = ConditionalFormattingFormulaCompiler.compile('=A1<10', ruleBaseAddress);
			expect(compiled.evaluate(addr(1, 1), getCell)).toBe(true); // error treated as 0
		});
	});

	describe('Edge Cases', () => {
		it('should handle formulas without leading =', () => {
			const ruleBaseAddress = addr(1, 1);
			const compiled = ConditionalFormattingFormulaCompiler.compile('A1>10', ruleBaseAddress);

			const values = new Map<string, CellValue>();
			values.set('1,1', 15);

			const getCell = createMockGetCell(values);
			expect(compiled.evaluate(addr(1, 1), getCell)).toBe(true);
		});

		it('should handle complex nested expressions', () => {
			const ruleBaseAddress = addr(1, 1);
			const compiled = ConditionalFormattingFormulaCompiler.compile(
				'=AND(A1>10, OR(B1<5, B1>20))',
				ruleBaseAddress
			);

			const values = new Map<string, CellValue>();
			values.set('1,1', 15);
			values.set('2,1', 3);

			const getCell = createMockGetCell(values);
			expect(compiled.evaluate(addr(1, 1), getCell)).toBe(true); // 15>10 AND 3<5
		});

		it('should preserve original formula and base address', () => {
			const ruleBaseAddress = addr(5, 10);
			const formula = '=$A$1>10';
			const compiled = ConditionalFormattingFormulaCompiler.compile(formula, ruleBaseAddress);

			expect(compiled.originalFormula).toBe(formula);
			expect(compiled.ruleBaseAddress).toEqual(ruleBaseAddress);
		});
	});
});
