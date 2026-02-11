/**
 * Error Handling Functions Tests
 * Week 5, Day 2: IFERROR, ISERROR, ISERR, ISNA, ISEVEN, ISODD
 */

import { FormulaEngine, FormulaContext, Worksheet } from '../../src';

describe('Error Handling Functions', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;
  let context: FormulaContext;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Sheet1', 100, 26);
    context = {
      worksheet,
      currentCell: { row: 1, col: 1 },
      namedLambdas: new Map()
    } as FormulaContext;
  });

  const evaluate = (formula: string) => engine.evaluate(formula, context);

  // ============================================================================
  // IFERROR Tests (Already existed - verify it works)
  // ============================================================================
  describe('IFERROR', () => {
    test('returns value if no error', () => {
      expect(evaluate('=IFERROR(10, "Error")')).toBe(10);
    });

    test('returns fallback value for #DIV/0!', () => {
      expect(evaluate('=IFERROR(1/0, "Division Error")')).toBe('Division Error');
    });

    test('returns fallback value for #N/A', () => {
      expect(evaluate('=IFERROR(NA(), "Not Available")')).toBe('Not Available');
    });

    test('returns fallback value for #VALUE!', () => {
      // Note: In this engine, 1+"text" performs string concatenation rather than error
      // Using SQRT of negative number instead to test #VALUE! handling  
      expect(evaluate('=IFERROR(SQRT(-1), 0)')).toBe(0);
    });

    test('returns fallback value for #NAME?', () => {
      expect(evaluate('=IFERROR(UNKNOWNFUNC(), "Unknown")')).toBe('Unknown');
    });

    test('handles nested IFERROR', () => {
      expect(evaluate('=IFERROR(IFERROR(1/0, 2/0), "Both Failed")')).toBe('Both Failed');
    });

    test('returns 0 as fallback', () => {
      expect(evaluate('=IFERROR(1/0, 0)')).toBe(0);
    });

    test('returns empty string as fallback', () => {
      expect(evaluate('=IFERROR(1/0, "")')).toBe('');
    });
  });

  // ============================================================================
  // ISERROR Tests - Detects ANY error
  // ============================================================================
  describe('ISERROR', () => {
    test('returns FALSE for valid number', () => {
      expect(evaluate('=ISERROR(42)')).toBe(false);
    });

    test('returns FALSE for text', () => {
      expect(evaluate('=ISERROR("hello")')).toBe(false);
    });

    test('returns FALSE for zero', () => {
      expect(evaluate('=ISERROR(0)')).toBe(false);
    });

    test('returns TRUE for #DIV/0!', () => {
      expect(evaluate('=ISERROR(1/0)')).toBe(true);
    });

    test('returns TRUE for #N/A', () => {
      expect(evaluate('=ISERROR(NA())')).toBe(true);
    });

    test('returns TRUE for #VALUE!', () => {
      expect(evaluate('=ISERROR(SQRT(-1))')).toBe(true);
    });

    test('returns TRUE for #NAME?', () => {
      expect(evaluate('=ISERROR(UNKNOWNFUNC())')).toBe(true);
    });

    test('works with IF for error handling', () => {
      expect(evaluate('=IF(ISERROR(1/0), "Error occurred", "No error")')).toBe('Error occurred');
    });

    test('works with IF for valid values', () => {
      expect(evaluate('=IF(ISERROR(10), "Error", "Valid")')).toBe('Valid');
    });

    test('handles nested expressions', () => {
      expect(evaluate('=ISERROR(SQRT(-1))')).toBe(true);
    });
  });

  // ============================================================================
  // ISERR Tests - Detects errors EXCEPT #N/A
  // ============================================================================
  describe('ISERR', () => {
    test('returns FALSE for valid number', () => {
      expect(evaluate('=ISERR(42)')).toBe(false);
    });

    test('returns FALSE for text', () => {
      expect(evaluate('=ISERR("hello")')).toBe(false);
    });

    test('returns TRUE for #DIV/0!', () => {
      expect(evaluate('=ISERR(1/0)')).toBe(true);
    });

    test('returns FALSE for #N/A (key difference from ISERROR)', () => {
      expect(evaluate('=ISERR(NA())')).toBe(false);
    });

    test('returns TRUE for #VALUE!', () => {
      expect(evaluate('=ISERR(SQRT(-1))')).toBe(true);
    });

    test('returns TRUE for #NAME?', () => {
      expect(evaluate('=ISERR(UNKNOWNFUNC())')).toBe(true);
    });

    test('distinguishes #N/A from other errors', () => {
      expect(evaluate('=ISERR(NA())')).toBe(false);
      expect(evaluate('=ISERR(1/0)')).toBe(true);
    });

    test('works with IF for non-N/A error handling', () => {
      expect(evaluate('=IF(ISERR(1/0), "Error but not N/A", "OK")')).toBe('Error but not N/A');
    });

    test('works with IF for N/A', () => {
      expect(evaluate('=IF(ISERR(NA()), "Non-NA Error", "NA or Valid")')).toBe('NA or Valid');
    });
  });

  // ============================================================================
  // ISNA Tests - Detects ONLY #N/A
  // ============================================================================
  describe('ISNA', () => {
    test('returns FALSE for valid number', () => {
      expect(evaluate('=ISNA(42)')).toBe(false);
    });

    test('returns FALSE for text', () => {
      expect(evaluate('=ISNA("hello")')).toBe(false);
    });

    test('returns TRUE for #N/A', () => {
      expect(evaluate('=ISNA(NA())')).toBe(true);
    });

    test('returns FALSE for #DIV/0!', () => {
      expect(evaluate('=ISNA(1/0)')).toBe(false);
    });

    test('returns FALSE for #VALUE!', () => {
      expect(evaluate('=ISNA(SQRT(-1))')).toBe(false);
    });

    test('returns FALSE for #NAME?', () => {
      expect(evaluate('=ISNA(UNKNOWNFUNC())')).toBe(false);
    });

    test('works with IF for N/A detection', () => {
      expect(evaluate('=IF(ISNA(NA()), "Not Available", "Available")')).toBe('Not Available');
    });

    test('distinguishes N/A from other errors', () => {
      expect(evaluate('=ISNA(NA())')).toBe(true);
      expect(evaluate('=ISNA(1/0)')).toBe(false);
    });
  });

  // ============================================================================
  // ISEVEN Tests - Check if number is even
  // ============================================================================
  describe('ISEVEN', () => {
    test('returns TRUE for 0', () => {
      expect(evaluate('=ISEVEN(0)')).toBe(true);
    });

    test('returns TRUE for positive even number', () => {
      expect(evaluate('=ISEVEN(2)')).toBe(true);
    });

    test('returns TRUE for negative even number', () => {
      expect(evaluate('=ISEVEN(-4)')).toBe(true);
    });

    test('returns FALSE for positive odd number', () => {
      expect(evaluate('=ISEVEN(3)')).toBe(false);
    });

    test('returns FALSE for negative odd number', () => {
      expect(evaluate('=ISEVEN(-5)')).toBe(false);
    });

    test('returns TRUE for large even number', () => {
      expect(evaluate('=ISEVEN(1000)')).toBe(true);
    });

    test('returns FALSE for large odd number', () => {
      expect(evaluate('=ISEVEN(9999)')).toBe(false);
    });

    test('truncates decimal - 2.1 is even (truncates to 2)', () => {
      expect(evaluate('=ISEVEN(2.1)')).toBe(true);
    });

    test('truncates decimal - 2.9 is even (truncates to 2)', () => {
      expect(evaluate('=ISEVEN(2.9)')).toBe(true);
    });

    test('truncates decimal - 3.1 is odd (truncates to 3)', () => {
      expect(evaluate('=ISEVEN(3.1)')).toBe(false);
    });

    test('truncates decimal - 3.9 is odd (truncates to 3)', () => {
      expect(evaluate('=ISEVEN(3.9)')).toBe(false);
    });

    test('handles negative decimals - -2.5 is even (truncates to -2)', () => {
      expect(evaluate('=ISEVEN(-2.5)')).toBe(true);
    });

    test('converts numeric string', () => {
      expect(evaluate('=ISEVEN("4")')).toBe(true);
    });

    test('returns #VALUE! for non-numeric text', () => {
      const result = evaluate('=ISEVEN("hello")');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('propagates errors', () => {
      const result = evaluate('=ISEVEN(1/0)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#DIV/0!');
    });

    test('works with IF for filtering even numbers', () => {
      expect(evaluate('=IF(ISEVEN(4), "Even", "Odd")')).toBe('Even');
    });

    test('works with IF for filtering odd numbers', () => {
      expect(evaluate('=IF(ISEVEN(5), "Even", "Odd")')).toBe('Odd');
    });

    test('works with MOD for confirmation', () => {
      expect(evaluate('=AND(ISEVEN(6), MOD(6,2)=0)')).toBe(true);
    });
  });

  // ============================================================================
  // ISODD Tests - Check if number is odd
  // ============================================================================
  describe('ISODD', () => {
    test('returns FALSE for 0', () => {
      expect(evaluate('=ISODD(0)')).toBe(false);
    });

    test('returns TRUE for positive odd number', () => {
      expect(evaluate('=ISODD(1)')).toBe(true);
    });

    test('returns TRUE for negative odd number', () => {
      expect(evaluate('=ISODD(-3)')).toBe(true);
    });

    test('returns FALSE for positive even number', () => {
      expect(evaluate('=ISODD(2)')).toBe(false);
    });

    test('returns FALSE for negative even number', () => {
      expect(evaluate('=ISODD(-4)')).toBe(false);
    });

    test('returns TRUE for large odd number', () => {
      expect(evaluate('=ISODD(9999)')).toBe(true);
    });

    test('returns FALSE for large even number', () => {
      expect(evaluate('=ISODD(1000)')).toBe(false);
    });

    test('truncates decimal - 3.1 is odd (truncates to 3)', () => {
      expect(evaluate('=ISODD(3.1)')).toBe(true);
    });

    test('truncates decimal - 3.9 is odd (truncates to 3)', () => {
      expect(evaluate('=ISODD(3.9)')).toBe(true);
    });

    test('truncates decimal - 2.1 is even (truncates to 2)', () => {
      expect(evaluate('=ISODD(2.1)')).toBe(false);
    });

    test('truncates decimal - 2.9 is even (truncates to 2)', () => {
      expect(evaluate('=ISODD(2.9)')).toBe(false);
    });

    test('handles negative decimals - -3.5 is odd (truncates to -3)', () => {
      expect(evaluate('=ISODD(-3.5)')).toBe(true);
    });

    test('converts numeric string', () => {
      expect(evaluate('=ISODD("5")')).toBe(true);
    });

    test('returns #VALUE! for non-numeric text', () => {
      const result = evaluate('=ISODD("hello")');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('propagates errors', () => {
      const result = evaluate('=ISODD(1/0)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#DIV/0!');
    });

    test('works with IF for filtering odd numbers', () => {
      expect(evaluate('=IF(ISODD(5), "Odd", "Even")')).toBe('Odd');
    });

    test('works with IF for filtering even numbers', () => {
      expect(evaluate('=IF(ISODD(4), "Odd", "Even")')).toBe('Even');
    });

    test('works with MOD for confirmation', () => {
      expect(evaluate('=AND(ISODD(7), MOD(7,2)=1)')).toBe(true);
    });
  });

  // ============================================================================
  // Integration Tests - Combining error handling functions
  // ============================================================================
  describe('Integration Tests', () => {
    test('IFERROR with ISERROR detection', () => {
      expect(evaluate('=IF(ISERROR(1/0), IFERROR(1/0, 0), 100)')).toBe(0);
    });

    test('ISERR vs ISNA distinction', () => {
      expect(evaluate('=IF(ISNA(NA()), "N/A", IF(ISERR(NA()), "Other Error", "Valid"))')).toBe('N/A');
      expect(evaluate('=IF(ISNA(1/0), "N/A", IF(ISERR(1/0), "Other Error", "Valid"))')).toBe('Other Error');
    });

    test('ISEVEN and ISODD are opposites for integers', () => {
      expect(evaluate('=AND(ISEVEN(4), NOT(ISODD(4)))')).toBe(true);
      expect(evaluate('=AND(ISODD(5), NOT(ISEVEN(5)))')).toBe(true);
    });

    test('Filter even numbers with IFERROR protection', () => {
      expect(evaluate('=IFERROR(IF(ISEVEN(6), "Even", "Odd"), "Error")')).toBe('Even');
    });

    test('Nested error detection', () => {
      expect(evaluate('=ISERROR(IFERROR(1/0, 2/0))')).toBe(true);
    });

    test('Multiple error type detection', () => {
      expect(evaluate('=IF(ISERROR(NA()), IF(ISNA(NA()), "#N/A Error", "Other Error"), "Valid")')).toBe('#N/A Error');
      expect(evaluate('=IF(ISERROR(1/0), IF(ISNA(1/0), "#N/A Error", "Other Error"), "Valid")')).toBe('Other Error');
    });

    test('ISEVEN with error handling', () => {
      expect(evaluate('=IFERROR(ISEVEN("not a number"), "Invalid Input")')).toBe('Invalid Input');
    });

    test('ISODD with IFERROR fallback', () => {
      expect(evaluate('=IFERROR(ISODD(7), FALSE)')).toBe(true);
    });

    test('Complex error cascade', () => {
      expect(evaluate('=IF(ISERROR(1/0), IF(ISERR(1/0), "Error (not N/A)", "N/A"), "Valid")')).toBe('Error (not N/A)');
    });

    test('Real-world: Safe division with even check', () => {
      // 10/2 = 5, which is odd
      expect(evaluate('=IFERROR(IF(ISEVEN(10/2), "Result is even", "Result is odd"), "Division failed")')).toBe('Result is odd');
      // Test with actual even result: 10/5 = 2
      expect(evaluate('=IFERROR(IF(ISEVEN(10/5), "Result is even", "Result is odd"), "Division failed")')).toBe('Result is even');
    });
  });
});
