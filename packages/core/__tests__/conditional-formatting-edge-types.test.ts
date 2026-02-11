/**
 * Phase 3 Wave 3.2: Type Hell
 * 
 * Tests Excel-accurate type coercion in CF rules
 * Critical areas: string vs number, empty string vs null, errors, mixed types
 * 
 * ⚠️ CRITICAL RULES:
 * - NO mocks, NO simplifications
 * - Excel parity is the spec
 * - Tests document CURRENT behavior
 * - If engine fails, test MUST fail (no workarounds)
 * 
 * Test Pattern:
 * - Arrange: CF rule with specific type expectations
 * - Act: Apply to values of different types
 * - Assert: Excel-accurate type handling (may fail if wrong)
 * 
 * RESULTS: 15/17 passing (88% Excel parity)
 * 
 * 🔴 KNOWN GAPS (2 failing tests):
 * 1. null/empty/false treated as == 0 in != operator
 *    - Expected: null != 0, '' != 0, false != 0 (Excel: distinct types)
 *    - Actual: Engine uses JS loose equality (treats as equal)
 *    - Impact: != operator with mixed types incorrect
 * 
 * 2. String 'true' incorrectly matches boolean true
 *    - Expected: 'true' (string) ≠ true (boolean) in Excel
 *    - Actual: Engine matches string 'true' == boolean true
 *    - Impact: Boolean equality checks with string values incorrect
 * 
 * ✅ WORKING CORRECTLY (15 tests):
 * - Numeric string coercion ("100" → 100 in >= operator)
 * - Empty string vs null handling in between operator
 * - Error value handling (#DIV/0!, #N/A, #REF!)
 * - Text operators with numbers (endsWith converts 123 → "123")
 * - Boolean in numeric context (true → 1, false → 0)
 * - notBetween with string numbers
 */

import { ConditionalFormattingEngine, ValueRule } from '../src/ConditionalFormattingEngine';

describe('Phase 3 Wave 3.2: Type Hell', () => {
	const engine = new ConditionalFormattingEngine();

	describe('🔢 String vs Number Coercion', () => {
		it('should handle numeric string "12" vs number 12 in value rules', () => {
			// Arrange: Rule checks if value > 10
			const rule: ValueRule = {
				type: 'value',
				operator: '>',
				value: 10,
				priority: 1,
				style: { fillColor: '#00FF00' }
			};

			// Act: Test string "12" vs number 12
			const resultNumber = engine.applyRules(12, [rule]);
			const resultString = engine.applyRules('12', [rule]);
			const resultString5 = engine.applyRules('5', [rule]); // Below threshold

			// Assert: Excel behavior - numeric strings are coerced for comparison
			expect(resultNumber.style?.fillColor).toBe('#00FF00'); // 12 > 10 ✓
			
			// ⚠️ THIS MAY FAIL if engine doesn't coerce strings to numbers
			// Excel coerces "12" → 12 for numeric comparisons
			expect(resultString.style?.fillColor).toBe('#00FF00'); // "12" → 12 > 10 ✓
			expect(resultString5.style).toBeUndefined(); // "5" → 5 < 10 ✗
		});

		it('should handle non-numeric strings in numeric comparisons', () => {
			// Arrange: Numeric rule
			const rule: ValueRule = {
				type: 'value',
				operator: '>',
				value: 10,
				priority: 1,
				style: { fillColor: '#00FF00' }
			};

			// Act: Non-numeric strings
			const resultText = engine.applyRules('hello', [rule]);
			const resultEmpty = engine.applyRules('', [rule]);

			// Assert: Excel behavior - non-numeric strings should NOT match numeric rules
			expect(resultText.style).toBeUndefined(); // "hello" cannot be compared to 10
			expect(resultEmpty.style).toBeUndefined(); // "" cannot be compared to 10
		});

		it('should handle string comparison rules with numbers', () => {
			// Arrange: Rule checks if value contains "test"
			const rule: ValueRule = {
				type: 'value',
				operator: 'contains',
				value: 'test',
				priority: 1,
				style: { fillColor: '#00FF00' }
			};

			// Act: Test string vs number
			const resultString = engine.applyRules('testing123', [rule]);
			const resultNumber = engine.applyRules(123, [rule]);

			// Assert: Excel behavior - contains/startsWith/endsWith work on strings
			expect(resultString.style?.fillColor).toBe('#00FF00'); // "testing123" contains "test" ✓
			
			// ⚠️ Number in string rule - Excel converts 123 → "123" for string ops
			// This may fail if engine doesn't convert numbers to strings for string operators
			expect(resultNumber.style).toBeUndefined(); // 123 → "123" doesn't contain "test"
		});
	});

	describe('⚫ Empty String vs Null vs Undefined', () => {
		it('should distinguish between empty string and null', () => {
			// Arrange: Rule checks equality to empty string
			const ruleEmpty: ValueRule = {
				type: 'value',
				operator: '=',
				value: '',
				priority: 1,
				style: { fillColor: '#FF0000' }
			};

			// Act: Test different "empty" values
			const resultEmptyString = engine.applyRules('', [ruleEmpty]);
			const resultNull = engine.applyRules(null, [ruleEmpty]);
			const resultZero = engine.applyRules(0, [ruleEmpty]);

			// Assert: Excel behavior - '' !== null !== undefined !== 0
			expect(resultEmptyString.style?.fillColor).toBe('#FF0000'); // '' = '' ✓
			expect(resultNull.style).toBeUndefined(); // null ≠ '' (Excel treats null as blank, not '')
			expect(resultZero.style).toBeUndefined(); // 0 ≠ ''
		});

		it('should handle null/undefined in numeric comparisons', () => {
			// Arrange: Numeric rule > 0
			const rule: ValueRule = {
				type: 'value',
				operator: '>',
				value: 0,
				priority: 1,
				style: { fillColor: '#00FF00' }
			};

			// Act: Test null/undefined/0/1
			const resultNull = engine.applyRules(null, [rule]);
			const resultZero = engine.applyRules(0, [rule]);
			const resultOne = engine.applyRules(1, [rule]);

			// Assert: Excel behavior - null/undefined treated as 0 in numeric context
			expect(resultNull.style).toBeUndefined(); // null → 0, NOT > 0
			expect(resultZero.style).toBeUndefined(); // 0 NOT > 0
			expect(resultOne.style?.fillColor).toBe('#00FF00'); // 1 > 0 ✓
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

			// Act: Test with different empty values
			const result15 = engine.applyRules(15, [rule]);
			const resultEmpty = engine.applyRules('', [rule]);
			const resultNull = engine.applyRules(null, [rule]);

			// Assert
			expect(result15.style?.fillColor).toBe('#00FF00'); // 15 is between 10-20 ✓
			expect(resultEmpty.style).toBeUndefined(); // '' cannot be between numbers
			expect(resultNull.style).toBeUndefined(); // null → 0, NOT between 10-20
		});
	});

	describe('❌ Error Values in CF Rules', () => {
		it('should handle #DIV/0! error in numeric rules', () => {
			// Arrange: Numeric rule
			const rule: ValueRule = {
				type: 'value',
				operator: '>',
				value: 10,
				priority: 1,
				style: { fillColor: '#00FF00' }
			};

			// Act: Test with error value (Excel error format)
			// Note: CellValue type should support error strings
			const resultError = engine.applyRules('#DIV/0!', [rule]);
			const resultNumber = engine.applyRules(15, [rule]);

			// Assert: Excel behavior - errors don't match numeric rules
			expect(resultError.style).toBeUndefined(); // #DIV/0! cannot be compared to 10
			expect(resultNumber.style?.fillColor).toBe('#00FF00'); // 15 > 10 ✓
		});

		it('should handle #N/A error in equality checks', () => {
			// Arrange: Equality rule
			const rule: ValueRule = {
				type: 'value',
				operator: '=',
				value: '#N/A',
				priority: 1,
				style: { fillColor: '#FF0000' }
			};

			// Act: Test error matching
			const resultNA = engine.applyRules('#N/A', [rule]);
			const resultOtherError = engine.applyRules('#VALUE!', [rule]);
			const resultString = engine.applyRules('N/A', [rule]); // String, not error

			// Assert: Excel behavior - error values can be matched by equality
			expect(resultNA.style?.fillColor).toBe('#FF0000'); // #N/A = #N/A ✓
			expect(resultOtherError.style).toBeUndefined(); // #VALUE! ≠ #N/A
			expect(resultString.style).toBeUndefined(); // "N/A" ≠ #N/A (string vs error)
		});

		it('should handle error propagation in comparisons', () => {
			// Arrange: Multiple rules
			const rules = [
				{
					type: 'value' as const,
					operator: '>' as const,
					value: 50,
					priority: 1,
					style: { fillColor: '#00FF00' }
				},
				{
					type: 'value' as const,
					operator: '<' as const,
					value: 100,
					priority: 2,
					style: { fillColor: '#FF0000' }
				}
			];

			// Act: Test error value against multiple rules
			const resultError = engine.applyRules('#REF!', rules);
			const resultNumber = engine.applyRules(75, rules);

			// Assert: Error doesn't match any numeric rules
			expect(resultError.style).toBeUndefined(); // #REF! cannot be compared
			expect(resultNumber.style?.fillColor).toBeDefined(); // 75 matches rules
		});
	});

	describe('🔀 Mixed Type in Text Rules', () => {
		it('should handle startsWith with non-string values', () => {
			// Arrange: startsWith rule
			const rule: ValueRule = {
				type: 'value',
				operator: 'startsWith',
				value: 'test',
				priority: 1,
				style: { fillColor: '#00FF00' }
			};

			// Act: Test different types
			const resultString = engine.applyRules('testing', [rule]);
			const resultNumber = engine.applyRules(123, [rule]);
			const resultNull = engine.applyRules(null, [rule]);
			const resultBool = engine.applyRules(true, [rule]);

			// Assert: Excel behavior - non-strings converted to strings for text ops
			expect(resultString.style?.fillColor).toBe('#00FF00'); // "testing" starts with "test" ✓
			expect(resultNumber.style).toBeUndefined(); // "123" doesn't start with "test"
			expect(resultNull.style).toBeUndefined(); // null → "" doesn't start with "test"
			expect(resultBool.style).toBeUndefined(); // true → "true" doesn't start with "test"
		});

		it('should handle endsWith with numeric values', () => {
			// Arrange: endsWith rule checking for "23"
			const rule: ValueRule = {
				type: 'value',
				operator: 'endsWith',
				value: '23',
				priority: 1,
				style: { fillColor: '#00FF00' }
			};

			// Act: Test number that ends with 23
			const resultNumber123 = engine.applyRules(123, [rule]);
			const resultNumber456 = engine.applyRules(456, [rule]);
			const resultString123 = engine.applyRules('abc123', [rule]);

			// Assert: Excel converts numbers to strings for text operators
			// ⚠️ This may fail if engine doesn't convert 123 → "123"
			expect(resultNumber123.style?.fillColor).toBe('#00FF00'); // 123 → "123" ends with "23" ✓
			expect(resultNumber456.style).toBeUndefined(); // 456 → "456" doesn't end with "23"
			expect(resultString123.style?.fillColor).toBe('#00FF00'); // "abc123" ends with "23" ✓
		});

		it('should handle contains with boolean values', () => {
			// Arrange: contains "true"
			const rule: ValueRule = {
				type: 'value',
				operator: 'contains',
				value: 'true',
				priority: 1,
				style: { fillColor: '#00FF00' }
			};

			// Act: Test boolean vs string
			const resultBoolTrue = engine.applyRules(true, [rule]);
			const resultBoolFalse = engine.applyRules(false, [rule]);
			const resultStringTrue = engine.applyRules('trueway', [rule]);

			// Assert: Excel converts booleans to "TRUE"/"FALSE" (uppercase)
			// ⚠️ This may fail if engine converts true → "TRUE" (uppercase) but rule expects "true" (lowercase)
			// Excel is case-insensitive for contains by default
			expect(resultBoolTrue.style?.fillColor).toBe('#00FF00'); // true → "TRUE" contains "true" ✓ (case-insensitive)
			expect(resultBoolFalse.style).toBeUndefined(); // false → "FALSE" doesn't contain "true"
			expect(resultStringTrue.style?.fillColor).toBe('#00FF00'); // "trueway" contains "true" ✓
		});
	});

	describe('⚖️ Type Coercion in Comparison Operators', () => {
		it('should handle string-to-number coercion in >= operator', () => {
			// Arrange: >= rule
			const rule: ValueRule = {
				type: 'value',
				operator: '>=',
				value: 100,
				priority: 1,
				style: { fillColor: '#00FF00' }
			};

			// Act: Test numeric strings
			const result100 = engine.applyRules(100, [rule]);
			const resultString100 = engine.applyRules('100', [rule]);
			const resultString200 = engine.applyRules('200', [rule]);
			const resultString50 = engine.applyRules('50', [rule]);

			// Assert: Excel coerces numeric strings
			expect(result100.style?.fillColor).toBe('#00FF00'); // 100 >= 100 ✓
			expect(resultString100.style?.fillColor).toBe('#00FF00'); // "100" → 100 >= 100 ✓
			expect(resultString200.style?.fillColor).toBe('#00FF00'); // "200" → 200 >= 100 ✓
			expect(resultString50.style).toBeUndefined(); // "50" → 50 NOT >= 100
		});

		it('should handle mixed type in != operator', () => {
			// Arrange: != rule checking not equal to 0
			const rule: ValueRule = {
				type: 'value',
				operator: '!=',
				value: 0,
				priority: 1,
				style: { fillColor: '#00FF00' }
			};

			// Act: Test different "zero-like" values
			const result0 = engine.applyRules(0, [rule]);
			const resultString0 = engine.applyRules('0', [rule]);
			const resultNull = engine.applyRules(null, [rule]);
			const resultEmpty = engine.applyRules('', [rule]);
			const resultFalse = engine.applyRules(false, [rule]);

			// Assert: Excel type coercion rules
			expect(result0.style).toBeUndefined(); // 0 = 0, NOT != 0
			
			// ⚠️ Excel coerces "0" → 0 for numeric comparisons
			expect(resultString0.style).toBeUndefined(); // "0" → 0 = 0, NOT != 0
			
			// 🔴 KNOWN GAP: null, '', false are NOT equal to 0 in Excel
			// Current engine incorrectly treats null/empty/false == 0 (JS loose equality)
			// Excel behavior: null != 0, '' != 0, false != 0 (distinct types)
			expect(resultNull.style?.fillColor).toBe('#00FF00'); // null != 0 ✓ (FAILING)
			expect(resultEmpty.style?.fillColor).toBe('#00FF00'); // '' != 0 ✓ (FAILING)
			expect(resultFalse.style?.fillColor).toBe('#00FF00'); // false != 0 ✓ (FAILING)
		});

		it('should handle notBetween with string numbers', () => {
			// Arrange: notBetween rule
			const rule: ValueRule = {
				type: 'value',
				operator: 'notBetween',
				value: 10,
				value2: 20,
				priority: 1,
				style: { fillColor: '#00FF00' }
			};

			// Act: Test with string numbers
			const result5 = engine.applyRules(5, [rule]);
			const resultString5 = engine.applyRules('5', [rule]);
			const result15 = engine.applyRules(15, [rule]);
			const resultString15 = engine.applyRules('15', [rule]);

			// Assert: Excel coerces strings to numbers for notBetween
			expect(result5.style?.fillColor).toBe('#00FF00'); // 5 NOT between 10-20 ✓
			expect(resultString5.style?.fillColor).toBe('#00FF00'); // "5" → 5 NOT between 10-20 ✓
			expect(result15.style).toBeUndefined(); // 15 IS between 10-20
			expect(resultString15.style).toBeUndefined(); // "15" → 15 IS between 10-20
		});
	});

	describe('🎭 Boolean Values in CF Rules', () => {
		it('should handle boolean values in equality checks', () => {
			// Arrange: Rule checking for true
			const ruleTrue: ValueRule = {
				type: 'value',
				operator: '=',
				value: true as any, // Cast for type system
				priority: 1,
				style: { fillColor: '#00FF00' }
			};

			// Act: Test boolean matching
			const resultTrue = engine.applyRules(true, [ruleTrue]);
			const resultFalse = engine.applyRules(false, [ruleTrue]);
			const result1 = engine.applyRules(1, [ruleTrue]);
			const resultStringTrue = engine.applyRules('true', [ruleTrue]);

			// Assert: Excel behavior - booleans are distinct from numbers/strings
			expect(resultTrue.style?.fillColor).toBe('#00FF00'); // true = true ✓
			expect(resultFalse.style).toBeUndefined(); // false ≠ true
			expect(result1.style).toBeUndefined(); // 1 ≠ true (no coercion)
			
			// 🔴 KNOWN GAP: String 'true' should NOT equal boolean true in Excel
			// Current engine incorrectly matches string 'true' == boolean true
			// Excel behavior: booleans are distinct type from strings
			expect(resultStringTrue.style).toBeUndefined(); // "true" ≠ true (FAILING)
		});

		it('should handle boolean values in numeric comparisons', () => {
			// Arrange: Numeric rule > 0
			const rule: ValueRule = {
				type: 'value',
				operator: '>',
				value: 0,
				priority: 1,
				style: { fillColor: '#00FF00' }
			};

			// Act: Test booleans in numeric context
			const resultTrue = engine.applyRules(true, [rule]);
			const resultFalse = engine.applyRules(false, [rule]);

			// Assert: Excel converts true → 1, false → 0 in numeric context
			// ⚠️ This may fail if engine doesn't convert booleans to numbers
			expect(resultTrue.style?.fillColor).toBe('#00FF00'); // true → 1 > 0 ✓
			expect(resultFalse.style).toBeUndefined(); // false → 0 NOT > 0
		});
	});
});
