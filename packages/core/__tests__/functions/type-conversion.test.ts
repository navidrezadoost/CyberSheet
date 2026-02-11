/**
 * Type Conversion Functions Tests
 * Week 5, Day 3: VALUE, TEXT, NUMBERVALUE
 */

import { FormulaEngine, FormulaContext, Worksheet } from '../../src';

describe('Type Conversion Functions', () => {
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
  // VALUE Tests - Convert text to number
  // ============================================================================
  describe('VALUE', () => {
    describe('Basic Conversion', () => {
      test('converts simple integer string', () => {
        expect(evaluate('=VALUE("123")')).toBe(123);
      });

      test('converts decimal string', () => {
        expect(evaluate('=VALUE("123.45")')).toBe(123.45);
      });

      test('converts negative number', () => {
        expect(evaluate('=VALUE("-456.78")')).toBe(-456.78);
      });

      test('handles empty string as 0', () => {
        expect(evaluate('=VALUE("")')).toBe(0);
      });

      test('handles whitespace', () => {
        expect(evaluate('=VALUE("  123  ")')).toBe(123);
      });

      test('returns number if already number', () => {
        expect(evaluate('=VALUE(42)')).toBe(42);
      });
    });

    describe('US Format (comma thousands, dot decimal)', () => {
      test('converts US thousands format', () => {
        expect(evaluate('=VALUE("1,234")')).toBe(1234);
      });

      test('converts US format with decimals', () => {
        expect(evaluate('=VALUE("1,234.56")')).toBe(1234.56);
      });

      test('converts large US format number', () => {
        expect(evaluate('=VALUE("1,234,567.89")')).toBe(1234567.89);
      });

      test('converts US format without decimals', () => {
        expect(evaluate('=VALUE("12,345")')).toBe(12345);
      });
    });

    describe('European Format (dot thousands, comma decimal)', () => {
      test('converts EU thousands format', () => {
        expect(evaluate('=VALUE("1.234")')).toBe(1234);
      });

      test('converts EU format with decimals', () => {
        expect(evaluate('=VALUE("1.234,56")')).toBe(1234.56);
      });

      test('converts large EU format number', () => {
        expect(evaluate('=VALUE("1.234.567,89")')).toBe(1234567.89);
      });
    });

    describe('Space as Thousands Separator', () => {
      test('converts with space separator', () => {
        expect(evaluate('=VALUE("1 234")')).toBe(1234);
      });

      test('converts with space and decimal', () => {
        expect(evaluate('=VALUE("1 234.56")')).toBe(1234.56);
      });

      test('converts large number with spaces', () => {
        expect(evaluate('=VALUE("1 234 567")')).toBe(1234567);
      });
    });

    describe('Percentage Handling', () => {
      test('converts percentage to decimal', () => {
        expect(evaluate('=VALUE("50%")')).toBe(0.5);
      });

      test('converts decimal percentage', () => {
        expect(evaluate('=VALUE("12.5%")')).toBe(0.125);
      });

      test('converts 100%', () => {
        expect(evaluate('=VALUE("100%")')).toBe(1);
      });
    });

    describe('Error Cases', () => {
      test('returns #VALUE! for non-numeric text', () => {
        const result = evaluate('=VALUE("hello")');
        expect(result).toBeInstanceOf(Error);
        expect((result as Error).message).toBe('#VALUE!');
      });

      test('returns #VALUE! for mixed text and numbers', () => {
        const result = evaluate('=VALUE("123abc")');
        expect(result).toBeInstanceOf(Error);
        expect((result as Error).message).toBe('#VALUE!');
      });

      test('propagates errors', () => {
        const result = evaluate('=VALUE(1/0)');
        expect(result).toBeInstanceOf(Error);
        expect((result as Error).message).toBe('#DIV/0!');
      });
    });
  });

  // ============================================================================
  // TEXT Tests - Format number as text
  // ============================================================================
  describe('TEXT', () => {
    describe('Basic Number Formatting', () => {
      test('formats number with no format (default)', () => {
        expect(evaluate('=TEXT(123, "")')).toBe('123');
      });

      test('formats with @ (text format)', () => {
        expect(evaluate('=TEXT(123, "@")')).toBe('123');
      });

      test('formats integer as string', () => {
        expect(evaluate('=TEXT(42, "0")')).toBe('42');
      });
    });

    describe('Decimal Formatting', () => {
      test('formats with 2 decimal places', () => {
        expect(evaluate('=TEXT(123.456, "0.00")')).toBe('123.46');
      });

      test('formats with 3 decimal places', () => {
        expect(evaluate('=TEXT(1.2, "0.000")')).toBe('1.200');
      });

      test('formats with # (optional digit)', () => {
        expect(evaluate('=TEXT(123.4, "0.##")')).toBe('123.40');
      });

      test('pads decimals with zeros', () => {
        expect(evaluate('=TEXT(5, "0.00")')).toBe('5.00');
      });
    });

    describe('Thousands Separator', () => {
      test('formats with thousands separator', () => {
        const result = evaluate('=TEXT(1234, "#,###")');
        expect(result).toBe('1,234');
      });

      test('formats large number with separators', () => {
        const result = evaluate('=TEXT(1234567, "#,###")');
        expect(result).toBe('1,234,567');
      });
    });

    describe('Percentage Formatting', () => {
      test('formats as percentage', () => {
        expect(evaluate('=TEXT(0.5, "0%")')).toBe('50%');
      });

      test('formats decimal as percentage', () => {
        expect(evaluate('=TEXT(0.125, "0%")')).toBe('13%');
      });

      test('formats 1 as 100%', () => {
        expect(evaluate('=TEXT(1, "0%")')).toBe('100%');
      });
    });

    describe('Date Formatting', () => {
      test('formats date as dd/mm/yyyy', () => {
        // Serial date 45321 = 2024-01-15
        const result = evaluate('=TEXT(45321, "dd/mm/yyyy")');
        expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
      });

      test('formats date as yyyy-mm-dd', () => {
        const result = evaluate('=TEXT(45321, "yyyy-mm-dd")');
        expect(result).toMatch(/\d{4}-\d{2}-\d{2}/);
      });

      test('formats with month names', () => {
        const result = evaluate('=TEXT(45321, "dd mmm yyyy")');
        expect(result).toMatch(/\d{2} [A-Z][a-z]{2} \d{4}/);
      });

      test('formats with day names', () => {
        const result = evaluate('=TEXT(45321, "dddd, dd mmmm yyyy")');
        expect(result).toMatch(/[A-Z][a-z]+, \d{2} [A-Z][a-z]+ \d{4}/);
      });
    });

    describe('Boolean and Special Cases', () => {
      test('formats boolean TRUE', () => {
        expect(evaluate('=TEXT(TRUE, "@")')).toBe('TRUE');
      });

      test('formats boolean FALSE', () => {
        expect(evaluate('=TEXT(FALSE, "@")')).toBe('FALSE');
      });

      test('propagates errors', () => {
        const result = evaluate('=TEXT(1/0, "0.00")');
        expect(result).toBeInstanceOf(Error);
      });
    });
  });

  // ============================================================================
  // NUMBERVALUE Tests - Convert with custom separators
  // ============================================================================
  describe('NUMBERVALUE', () => {
    describe('Basic Conversion', () => {
      test('converts simple number string', () => {
        expect(evaluate('=NUMBERVALUE("123")')).toBe(123);
      });

      test('converts decimal with default separators', () => {
        expect(evaluate('=NUMBERVALUE("123.45")')).toBe(123.45);
      });

      test('converts with US format by default', () => {
        expect(evaluate('=NUMBERVALUE("1,234.56")')).toBe(1234.56);
      });
    });

    describe('Custom Decimal Separator', () => {
      test('converts European format with comma decimal', () => {
        expect(evaluate('=NUMBERVALUE("123,45", ",")')).toBe(123.45);
      });

      test('converts with comma decimal and dot thousands', () => {
        expect(evaluate('=NUMBERVALUE("1.234,56", ",", ".")')).toBe(1234.56);
      });

      test('converts large EU number', () => {
        expect(evaluate('=NUMBERVALUE("1.234.567,89", ",", ".")')).toBe(1234567.89);
      });
    });

    describe('Custom Group Separator', () => {
      test('converts with space as group separator', () => {
        expect(evaluate('=NUMBERVALUE("1 234 567", ".", " ")')).toBe(1234567);
      });

      test('converts with apostrophe as group separator', () => {
        expect(evaluate('=NUMBERVALUE("1\'234.56", ".", "\'")')).toBe(1234.56);
      });

      test('handles no group separator', () => {
        expect(evaluate('=NUMBERVALUE("1234.56", ".", "")')).toBe(1234.56);
      });
    });

    describe('Percentage Handling', () => {
      test('converts percentage with default separators', () => {
        expect(evaluate('=NUMBERVALUE("50%")')).toBe(0.5);
      });

      test('converts percentage with custom separators', () => {
        expect(evaluate('=NUMBERVALUE("12,5%", ",")')).toBe(0.125);
      });

      test('converts EU percentage format', () => {
        expect(evaluate('=NUMBERVALUE("1.234,56%", ",", ".")')).toBe(12.3456);
      });
    });

    describe('Real-World Scenarios', () => {
      test('Swiss format (apostrophe separator)', () => {
        expect(evaluate('=NUMBERVALUE("1\'234\'567.89", ".", "\'")')).toBe(1234567.89);
      });

      test('French format (space separator, comma decimal)', () => {
        expect(evaluate('=NUMBERVALUE("1 234 567,89", ",", " ")')).toBe(1234567.89);
      });

      test('German format (dot thousands, comma decimal)', () => {
        expect(evaluate('=NUMBERVALUE("1.234,56", ",", ".")')).toBe(1234.56);
      });
    });

    describe('Error Cases', () => {
      test('returns #VALUE! for non-numeric text', () => {
        const result = evaluate('=NUMBERVALUE("hello")');
        expect(result).toBeInstanceOf(Error);
        expect((result as Error).message).toBe('#VALUE!');
      });

      test('returns #VALUE! for invalid format', () => {
        const result = evaluate('=NUMBERVALUE("12.34.56", ",", ".")');
        expect(result).toBeInstanceOf(Error);
        expect((result as Error).message).toBe('#VALUE!');
      });

      test('propagates errors', () => {
        const result = evaluate('=NUMBERVALUE(NA())');
        expect(result).toBeInstanceOf(Error);
        expect((result as Error).message).toBe('#N/A');
      });
    });

    describe('Edge Cases', () => {
      test('handles empty string', () => {
        expect(evaluate('=NUMBERVALUE("")')).toBe(0);
      });

      test('handles already numeric value', () => {
        expect(evaluate('=NUMBERVALUE(42)')).toBe(42);
      });

      test('handles negative numbers', () => {
        expect(evaluate('=NUMBERVALUE("-1.234,56", ",", ".")')).toBe(-1234.56);
      });
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================
  describe('Integration Tests', () => {
    test('VALUE and TEXT round-trip', () => {
      // Format number as text, then convert back
      const formatted = evaluate('=TEXT(1234.56, "0.00")');
      expect(formatted).toBe('1234.56');
      
      const parsed = evaluate('=VALUE("1234.56")');
      expect(parsed).toBe(1234.56);
    });

    test('NUMBERVALUE with TEXT output', () => {
      const num = evaluate('=NUMBERVALUE("1.234,56", ",", ".")');
      expect(num).toBe(1234.56);
      
      const text = evaluate('=TEXT(1234.56, "0.00")');
      expect(text).toBe('1234.56');
    });

    test('VALUE with percentage formatting', () => {
      const pct = evaluate('=VALUE("50%")');
      expect(pct).toBe(0.5);
      
      const formatted = evaluate('=TEXT(0.5, "0%")');
      expect(formatted).toBe('50%');
    });

    test('Complex calculation with VALUE', () => {
      expect(evaluate('=VALUE("1,234") + VALUE("5,678")')).toBe(6912);
    });

    test('NUMBERVALUE in calculations', () => {
      expect(evaluate('=NUMBERVALUE("1.234,56", ",", ".") * 2')).toBe(2469.12);
    });

    test('Error handling with IFERROR', () => {
      expect(evaluate('=IFERROR(VALUE("hello"), 0)')).toBe(0);
    });

    test('TEXT with calculated values', () => {
      const result = evaluate('=TEXT(10/3, "0.00")');
      expect(result).toBe('3.33');
    });

    test('Multiple conversions in formula', () => {
      const result = evaluate('=VALUE("1,000") + NUMBERVALUE("1.000,50", ",", ".")');
      expect(result).toBe(2000.5);
    });
  });
});
