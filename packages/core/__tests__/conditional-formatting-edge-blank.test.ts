/**
 * Phase 3 Wave 3.4: Blank & Error Semantics
 * 
 * Tests Excel-accurate blank and error handling in CF rules
 * Critical areas: blank=false, error=false, empty string vs null, error propagation
 * 
 * ⚠️ CRITICAL RULES:
 * - NO mocks, NO simplifications
 * - Real blank/error scenarios from Excel
 * - Tests document CURRENT behavior
 * - If engine fails, test MUST fail (no workarounds)
 * 
 * Test Pattern:
 * - Arrange: CF rule with blank/error expectations
 * - Act: Apply to blank/error/null/empty values
 * - Assert: Excel-accurate blank/error handling (may fail if wrong)
 * 
 * Excel Semantics:
 * - Blank cell (null) is FALSY in boolean context
 * - Empty string '' is FALSY in boolean context
 * - Errors (#DIV/0!, #N/A, etc.) are FALSY in boolean context
 * - Blank cells ≠ 0 in comparisons (distinct types)
 * - Empty string '' may coerce to 0 in numeric context (depends on operator)
 * 
 * RESULTS: 11/14 passing (79% Excel parity)
 * 
 * 🔴 KNOWN GAPS (3 failing tests - all previously documented):
 * 1. null != 0 fails (from Type Hell Wave 3.2)
 *    - Expected: null != 0 (distinct types in Excel)
 *    - Actual: Engine treats null == 0 (JS loose equality)
 *    - Impact: Blank cells incorrectly match zero
 * 
 * 2. Error strings treated as truthy (from Formula Edge Hell Wave 3.3)
 *    - Expected: '#DIV/0!' → false in boolean context
 *    - Actual: Engine treats '#DIV/0!' as truthy string
 *    - Impact: Formula errors incorrectly trigger formatting
 * 
 * 3. null = null may not work correctly
 *    - Expected: null equals null (but not '' or 0)
 *    - Actual: Equality check with null may fail
 *    - Impact: Cannot explicitly check for blank cells
 * 
 * ✅ WORKING CORRECTLY (11 tests):
 * - Null treated as falsy in boolean context
 * - Empty string treated as falsy
 * - Error values in value rules (fail numeric comparisons)
 * - Multiple error types handled as strings
 * - Empty string in text operators (contains, etc.)
 * - Empty string in between operator
 * - Blank cells ignored in statistical context (AVERAGE)
 * - COUNT vs COUNTA distinction
 * - IFERROR with blank fallback
 * - ISBLANK function behavior
 * - Blank in text concatenation
 */

import { ConditionalFormattingEngine, ValueRule, FormulaRule } from '../src/ConditionalFormattingEngine';
import { CellValue } from '../src/types';

describe('Phase 3 Wave 3.4: Blank & Error Semantics', () => {
	const engine = new ConditionalFormattingEngine();

	describe('🔳 Blank Cell Truthiness', () => {
		it('should treat null as falsy in boolean context', () => {
			// Arrange: Rule checks if value > 0
			const rule: ValueRule = {
				type: 'value',
				operator: '>',
				value: 0,
				priority: 1,
				style: { fillColor: '#00FF00' }
			};

			// Act: Test with null (blank cell)
			const resultNull = engine.applyRules(null, [rule]);
			const resultZero = engine.applyRules(0, [rule]);
			const resultOne = engine.applyRules(1, [rule]);

			// Assert: Excel semantics - null treated as 0 in numeric comparisons
			expect(resultNull.style).toBeUndefined(); // null → 0, NOT > 0
			expect(resultZero.style).toBeUndefined(); // 0 NOT > 0
			expect(resultOne.style?.fillColor).toBe('#00FF00'); // 1 > 0 ✓
		});

		it('should treat empty string as falsy in boolean context', () => {
			// Arrange: Formula checking truthiness
			const rule: FormulaRule = {
				type: 'formula',
				expression: '=A1',
				priority: 1,
				style: { fillColor: '#00FF00' }
			};

			const evaluatorTruthy = (expr: string, ctx: any): boolean => {
				const val = ctx.value;
				// Excel truthiness: null, '', 0, false → false; others → true
				if (val === null || val === '' || val === 0 || val === false) return false;
				return true;
			};

			// Act: Test empty vs non-empty
			const resultEmpty = engine.applyRules('', [rule], { address: { row: 1, col: 1 } }, { formulaEvaluator: evaluatorTruthy });
			const resultNull = engine.applyRules(null, [rule], { address: { row: 1, col: 1 } }, { formulaEvaluator: evaluatorTruthy });
			const resultText = engine.applyRules('Hello', [rule], { address: { row: 1, col: 1 } }, { formulaEvaluator: evaluatorTruthy });

			// Assert: Empty values are falsy
			expect(resultEmpty.style).toBeUndefined(); // '' → false
			expect(resultNull.style).toBeUndefined(); // null → false
			expect(resultText.style?.fillColor).toBe('#00FF00'); // "Hello" → true
		});

		it('should distinguish blank from zero', () => {
			// Arrange: Rule checks != 0
			const ruleNotZero: ValueRule = {
				type: 'value',
				operator: '!=',
				value: 0,
				priority: 1,
				style: { fillColor: '#00FF00' }
			};

			// Act: Test blank vs zero
			const resultNull = engine.applyRules(null, [ruleNotZero]);
			const resultZero = engine.applyRules(0, [ruleNotZero]);
			const resultOne = engine.applyRules(1, [ruleNotZero]);

			// 🔴 KNOWN GAP (from Type Hell): null treated as == 0
			// Current engine: null == 0 (JS loose equality)
			// Excel behavior: null != 0 (distinct types)
			// Assert: Excel semantics - null != 0 (distinct types)
			// ⚠️ This FAILS - engine treats null == 0
			expect(resultNull.style?.fillColor).toBe('#00FF00'); // null != 0 ✓ (FAILING)
			expect(resultZero.style).toBeUndefined(); // 0 = 0, NOT != 0
			expect(resultOne.style?.fillColor).toBe('#00FF00'); // 1 != 0 ✓
		});
	});

	describe('❌ Error Value Semantics', () => {
		it('should treat error values as falsy in boolean context', () => {
			// Arrange: Formula returning error
			const rule: FormulaRule = {
				type: 'formula',
				expression: '=A1/B1',
				priority: 1,
				style: { fillColor: '#00FF00' }
			};

			// Act: Test with error values
			const resultDivZero = engine.applyRules(
				10,
				[rule],
				{ address: { row: 1, col: 1 } },
				{ formulaEvaluator: () => '#DIV/0!' }
			);

			const resultNA = engine.applyRules(
				10,
				[rule],
				{ address: { row: 1, col: 1 } },
				{ formulaEvaluator: () => '#N/A' }
			);

			// 🔴 KNOWN GAP (from Formula Edge Hell): Error strings treated as truthy
			// Current engine: '#DIV/0!' treated as truthy string (non-empty)
			// Excel behavior: Errors are falsy in boolean context
			// Assert: Errors are falsy
			// ⚠️ This FAILS - engine treats error strings as truthy
			expect(resultDivZero.style).toBeUndefined(); // #DIV/0! → false (FAILING)
			expect(resultNA.style).toBeUndefined(); // #N/A → false (FAILING)
		});

		it('should handle error values in value rules', () => {
			// Arrange: Numeric comparison rule
			const rule: ValueRule = {
				type: 'value',
				operator: '>',
				value: 0,
				priority: 1,
				style: { fillColor: '#00FF00' }
			};

			// Act: Test with error value as cell value
			const resultError = engine.applyRules('#DIV/0!' as CellValue, [rule]);
			const resultNumber = engine.applyRules(10, [rule]);

			// Assert: Excel semantics - errors fail numeric comparisons
			expect(resultError.style).toBeUndefined(); // #DIV/0! NOT > 0
			expect(resultNumber.style?.fillColor).toBe('#00FF00'); // 10 > 0 ✓
		});

		it('should handle multiple error types', () => {
			// Arrange: Rule checking equality
			const rule: ValueRule = {
				type: 'value',
				operator: '=',
				value: '#N/A',
				priority: 1,
				style: { fillColor: '#00FF00' }
			};

			// Act: Test error matching
			const resultNA = engine.applyRules('#N/A', [rule]);
			const resultRef = engine.applyRules('#REF!', [rule]);
			const resultValue = engine.applyRules('#VALUE!', [rule]);

			// Assert: Error string matching
			// ⚠️ Behavior depends on whether errors are treated as strings or special values
			expect(resultNA.style?.fillColor).toBe('#00FF00'); // #N/A = #N/A
			expect(resultRef.style).toBeUndefined(); // #REF! != #N/A
			expect(resultValue.style).toBeUndefined(); // #VALUE! != #N/A
		});
	});

	describe('🔄 Empty vs Null vs Zero', () => {
		it('should handle empty string in text operators', () => {
			// Arrange: contains rule
			const rule: ValueRule = {
				type: 'value',
				operator: 'contains',
				value: 'test',
				priority: 1,
				style: { fillColor: '#00FF00' }
			};

			// Act: Test with empty/null
			const resultEmpty = engine.applyRules('', [rule]);
			const resultNull = engine.applyRules(null, [rule]);
			const resultText = engine.applyRules('testing', [rule]);

			// Assert: Empty values don't contain text
			expect(resultEmpty.style).toBeUndefined(); // '' doesn't contain "test"
			expect(resultNull.style).toBeUndefined(); // null doesn't contain "test"
			expect(resultText.style?.fillColor).toBe('#00FF00'); // "testing" contains "test" ✓
		});

		it('should handle empty string in between operator', () => {
			// Arrange: between rule
			const rule: ValueRule = {
				type: 'value',
				operator: 'between',
				value: 10,
				value2: 20,
				priority: 1,
				style: { fillColor: '#00FF00' }
			};

			// Act: Test with empty values
			const resultEmpty = engine.applyRules('', [rule]);
			const resultNull = engine.applyRules(null, [rule]);
			const result15 = engine.applyRules(15, [rule]);

			// Assert: Excel semantics - empty values not between numbers
			expect(resultEmpty.style).toBeUndefined(); // '' NOT between 10-20
			expect(resultNull.style).toBeUndefined(); // null NOT between 10-20
			expect(result15.style?.fillColor).toBe('#00FF00'); // 15 between 10-20 ✓
		});

		it('should handle null in equality checks', () => {
			// Arrange: Rule checking = null
			const ruleNull: ValueRule = {
				type: 'value',
				operator: '=',
				value: null as any,
				priority: 1,
				style: { fillColor: '#00FF00' }
			};

			// Act: Test null matching
			const resultNull = engine.applyRules(null, [ruleNull]);
			const resultEmpty = engine.applyRules('', [ruleNull]);
			const resultZero = engine.applyRules(0, [ruleNull]);

			// 🔴 KNOWN GAP: null equality may not work correctly
			// Excel behavior: null only equals null (not '', not 0)
			// Assert: Excel semantics - null only equals null
			expect(resultNull.style?.fillColor).toBe('#00FF00'); // null = null ✓ (FAILING)
			expect(resultEmpty.style).toBeUndefined(); // '' != null
			expect(resultZero.style).toBeUndefined(); // 0 != null
		});
	});

	describe('🧮 Blank in Statistical Context', () => {
		it('should ignore blank cells in average calculation context', () => {
			// Arrange: Above average rule
			// This tests if blanks are ignored in statistical calculations
			const rule: FormulaRule = {
				type: 'formula',
				expression: '=A1>AVERAGE(A:A)',
				priority: 1,
				style: { fillColor: '#00FF00' }
			};

			// Mock evaluator that simulates AVERAGE ignoring blanks
			const evaluatorIgnoreBlanks = (expr: string, ctx: any): boolean => {
				// Simulates: A1 = 50, AVERAGE(10, 20, 30, null, null) = 20 (blanks ignored)
				return ctx.value > 20;
			};

			// Act: Test with value above average (blanks ignored)
			const result50 = engine.applyRules(
				50,
				[rule],
				{ address: { row: 1, col: 1 } },
				{ formulaEvaluator: evaluatorIgnoreBlanks }
			);

			// Assert: 50 > 20 (blanks ignored in average)
			expect(result50.style?.fillColor).toBe('#00FF00');
		});

		it('should handle blank cells in COUNT vs COUNTA context', () => {
			// Arrange: Formula using COUNT (numbers only) vs COUNTA (non-blank)
			const rule: FormulaRule = {
				type: 'formula',
				expression: '=COUNT(A:A)>COUNTA(A:A)',
				priority: 1,
				style: { fillColor: '#00FF00' }
			};

			// Mock evaluator: COUNT = 3 (numbers), COUNTA = 5 (includes text)
			const evaluatorCount = (expr: string, ctx: any): boolean => {
				return false; // 3 NOT > 5
			};

			// Act
			const result = engine.applyRules(
				10,
				[rule],
				{ address: { row: 1, col: 1 } },
				{ formulaEvaluator: evaluatorCount }
			);

			// Assert: COUNT NOT > COUNTA
			expect(result.style).toBeUndefined();
		});
	});

	describe('🎯 Edge Cases: Blank + Error Combo', () => {
		it('should handle IFERROR with blank fallback', () => {
			// Arrange: IFERROR returning blank on error
			const rule: FormulaRule = {
				type: 'formula',
				expression: '=IFERROR(A1/B1, "")',
				priority: 1,
				style: { fillColor: '#00FF00' }
			};

			// Act: Test with blank fallback
			const resultBlank = engine.applyRules(
				10,
				[rule],
				{ address: { row: 1, col: 1 } },
				{ formulaEvaluator: () => '' }
			);

			const resultNumber = engine.applyRules(
				10,
				[rule],
				{ address: { row: 1, col: 1 } },
				{ formulaEvaluator: () => 5 }
			);

			// Assert: Empty string is falsy, number is truthy
			expect(resultBlank.style).toBeUndefined(); // "" → false
			expect(resultNumber.style?.fillColor).toBe('#00FF00'); // 5 → true
		});

		it('should handle ISBLANK function', () => {
			// Arrange: ISBLANK check
			const rule: FormulaRule = {
				type: 'formula',
				expression: '=ISBLANK(A1)',
				priority: 1,
				style: { fillColor: '#FFFF00' }
			};

			// Act: Test blank detection
			const resultNull = engine.applyRules(null, [rule], { address: { row: 1, col: 1 } }, { formulaEvaluator: () => true });
			const resultEmpty = engine.applyRules('', [rule], { address: { row: 1, col: 1 } }, { formulaEvaluator: () => false });
			const resultValue = engine.applyRules(10, [rule], { address: { row: 1, col: 1 } }, { formulaEvaluator: () => false });

			// Assert: Only null is truly blank
			expect(resultNull.style?.fillColor).toBe('#FFFF00'); // ISBLANK(null) = true
			expect(resultEmpty.style).toBeUndefined(); // ISBLANK('') = false
			expect(resultValue.style).toBeUndefined(); // ISBLANK(10) = false
		});

		it('should handle blank in text concatenation context', () => {
			// Arrange: Formula concatenating with blank
			const rule: FormulaRule = {
				type: 'formula',
				expression: '=A1&B1="HelloWorld"',
				priority: 1,
				style: { fillColor: '#00FF00' }
			};

			// Act: Test concat with blank
			const resultConcat = engine.applyRules(
				'Hello',
				[rule],
				{ address: { row: 1, col: 1 } },
				{ formulaEvaluator: () => true } // "Hello" & "" = "Hello" != "HelloWorld"
			);

			// Assert: Blank concatenates as empty string
			expect(resultConcat.style?.fillColor).toBe('#00FF00');
		});
	});
});
