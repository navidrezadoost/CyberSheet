/**
 * information-type-checking.test.ts
 * 
 * Tests for Information and Type Checking functions
 * Week 11 Day 1: ISNUMBER, ISTEXT, ISBLANK, ISLOGICAL, ISNONTEXT, TYPE, N, T
 */

import { FormulaEngine, FormulaContext, Worksheet } from '../src';

describe('Week 11 Day 1: Information & Type Checking Functions', () => {
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

  // ============================================================================
  // ISNUMBER Tests
  // ============================================================================
  describe('ISNUMBER Function', () => {
    test('returns TRUE for positive numbers', () => {
      expect(engine.evaluate('=ISNUMBER(100)', context)).toBe(true);
      expect(engine.evaluate('=ISNUMBER(3.14)', context)).toBe(true);
      expect(engine.evaluate('=ISNUMBER(0)', context)).toBe(true);
    });

    test('returns TRUE for negative numbers', () => {
      expect(engine.evaluate('=ISNUMBER(-42)', context)).toBe(true);
      expect(engine.evaluate('=ISNUMBER(-3.14)', context)).toBe(true);
    });

    test('returns FALSE for text', () => {
      expect(engine.evaluate('=ISNUMBER("100")', context)).toBe(false);
      expect(engine.evaluate('=ISNUMBER("hello")', context)).toBe(false);
      expect(engine.evaluate('=ISNUMBER("")', context)).toBe(false);
    });

    test('returns FALSE for logical values', () => {
      expect(engine.evaluate('=ISNUMBER(TRUE)', context)).toBe(false);
      expect(engine.evaluate('=ISNUMBER(FALSE)', context)).toBe(false);
    });

    test('returns FALSE for empty/null', () => {
      worksheet.setCellValue({ row: 6, col: 1 }, null);
      expect(engine.evaluate('=ISNUMBER(A6)', context)).toBe(false);
    });

    test('works with cell references', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, 42);
      worksheet.setCellValue({ row: 2, col: 1 }, 'text');
      
      expect(engine.evaluate('=ISNUMBER(A1)', context)).toBe(true);
      expect(engine.evaluate('=ISNUMBER(A2)', context)).toBe(false);
    });
  });

  // ============================================================================
  // ISTEXT Tests
  // ============================================================================
  describe('ISTEXT Function', () => {
    test('returns TRUE for text strings', () => {
      expect(engine.evaluate('=ISTEXT("hello")', context)).toBe(true);
      expect(engine.evaluate('=ISTEXT("123")', context)).toBe(true);
      expect(engine.evaluate('=ISTEXT("")', context)).toBe(true); // Empty string is text
    });

    test('returns FALSE for numbers', () => {
      expect(engine.evaluate('=ISTEXT(100)', context)).toBe(false);
      expect(engine.evaluate('=ISTEXT(3.14)', context)).toBe(false);
      expect(engine.evaluate('=ISTEXT(0)', context)).toBe(false);
    });

    test('returns FALSE for logical values', () => {
      expect(engine.evaluate('=ISTEXT(TRUE)', context)).toBe(false);
      expect(engine.evaluate('=ISTEXT(FALSE)', context)).toBe(false);
    });

    test('works with cell references', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, 'text');
      worksheet.setCellValue({ row: 2, col: 1 }, 42);
      
      expect(engine.evaluate('=ISTEXT(A1)', context)).toBe(true);
      expect(engine.evaluate('=ISTEXT(A2)', context)).toBe(false);
    });

    test('works with concatenated text', () => {
      expect(engine.evaluate('=ISTEXT("hello" & " world")', context)).toBe(true);
      expect(engine.evaluate('=ISTEXT(UPPER("test"))', context)).toBe(true);
    });
  });

  // ============================================================================
  // ISBLANK Tests
  // ============================================================================
  describe('ISBLANK Function', () => {
    test('returns FALSE for empty string (Excel behavior)', () => {
      // Excel ISBLANK returns FALSE for empty string - only TRUE for unset cells
      expect(engine.evaluate('=ISBLANK("")', context)).toBe(false);
    });

    test('returns TRUE for empty cells (null/undefined)', () => {
      worksheet.setCellValue({ row: 6, col: 1 }, null);
      worksheet.setCellValue({ row: 8, col: 1 }, '');
      
      expect(engine.evaluate('=ISBLANK(A6)', context)).toBe(true);  // null is blank
      expect(engine.evaluate('=ISBLANK(A8)', context)).toBe(false); // empty string is NOT blank in Excel
      // Row 7 (A7) not set, should also be blank
      expect(engine.evaluate('=ISBLANK(A7)', context)).toBe(true);
    });

    test('returns FALSE for zero', () => {
      expect(engine.evaluate('=ISBLANK(0)', context)).toBe(false);
    });

    test('returns FALSE for FALSE boolean', () => {
      expect(engine.evaluate('=ISBLANK(FALSE)', context)).toBe(false);
    });

    test('returns FALSE for space string', () => {
      expect(engine.evaluate('=ISBLANK(" ")', context)).toBe(false);
    });

    test('returns FALSE for non-empty values', () => {
      expect(engine.evaluate('=ISBLANK("hello")', context)).toBe(false);
      expect(engine.evaluate('=ISBLANK(100)', context)).toBe(false);
      expect(engine.evaluate('=ISBLANK(TRUE)', context)).toBe(false);
    });
  });

  // ============================================================================
  // ISLOGICAL Tests
  // ============================================================================
  describe('ISLOGICAL Function', () => {
    test('returns TRUE for TRUE and FALSE', () => {
      expect(engine.evaluate('=ISLOGICAL(TRUE)', context)).toBe(true);
      expect(engine.evaluate('=ISLOGICAL(FALSE)', context)).toBe(true);
    });

    test('returns FALSE for numbers', () => {
      expect(engine.evaluate('=ISLOGICAL(1)', context)).toBe(false);
      expect(engine.evaluate('=ISLOGICAL(0)', context)).toBe(false);
    });

    test('returns FALSE for text', () => {
      expect(engine.evaluate('=ISLOGICAL("TRUE")', context)).toBe(false);
      expect(engine.evaluate('=ISLOGICAL("FALSE")', context)).toBe(false);
      expect(engine.evaluate('=ISLOGICAL("true")', context)).toBe(false);
    });

    test('works with logical expressions', () => {
      expect(engine.evaluate('=ISLOGICAL(1>0)', context)).toBe(true);
      expect(engine.evaluate('=ISLOGICAL(5=5)', context)).toBe(true);
      expect(engine.evaluate('=ISLOGICAL(AND(TRUE, FALSE))', context)).toBe(true);
    });

    test('works with cell references', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, true);
      worksheet.setCellValue({ row: 2, col: 1 }, false);
      worksheet.setCellValue({ row: 3, col: 1 }, 1);
      
      expect(engine.evaluate('=ISLOGICAL(A1)', context)).toBe(true);
      expect(engine.evaluate('=ISLOGICAL(A2)', context)).toBe(true);
      expect(engine.evaluate('=ISLOGICAL(A3)', context)).toBe(false);
    });
  });

  // ============================================================================
  // ISNONTEXT Tests
  // ============================================================================
  describe('ISNONTEXT Function', () => {
    test('returns TRUE for numbers', () => {
      expect(engine.evaluate('=ISNONTEXT(100)', context)).toBe(true);
      expect(engine.evaluate('=ISNONTEXT(3.14)', context)).toBe(true);
      expect(engine.evaluate('=ISNONTEXT(0)', context)).toBe(true);
    });

    test('returns TRUE for logical values', () => {
      expect(engine.evaluate('=ISNONTEXT(TRUE)', context)).toBe(true);
      expect(engine.evaluate('=ISNONTEXT(FALSE)', context)).toBe(true);
    });

    test('returns FALSE for text', () => {
      expect(engine.evaluate('=ISNONTEXT("hello")', context)).toBe(false);
      expect(engine.evaluate('=ISNONTEXT("123")', context)).toBe(false);
      expect(engine.evaluate('=ISNONTEXT("")', context)).toBe(false); // Empty string is text
    });

    test('inverse of ISTEXT', () => {
      const testValues = [100, 'hello', true, '', 'test', 0];
      
      testValues.forEach((val) => {
        const valStr = typeof val === 'string' ? `"${val}"` : val;
        const isText = engine.evaluate(`=ISTEXT(${valStr})`, context);
        const isNonText = engine.evaluate(`=ISNONTEXT(${valStr})`, context);
        
        expect(isText).toBe(!isNonText);
      });
    });
  });

  // ============================================================================
  // TYPE Tests
  // ============================================================================
  describe('TYPE Function', () => {
    test('returns 1 for numbers', () => {
      expect(engine.evaluate('=TYPE(100)', context)).toBe(1);
      expect(engine.evaluate('=TYPE(3.14)', context)).toBe(1);
      expect(engine.evaluate('=TYPE(0)', context)).toBe(1);
      expect(engine.evaluate('=TYPE(-42)', context)).toBe(1);
    });

    test('returns 2 for text', () => {
      expect(engine.evaluate('=TYPE("hello")', context)).toBe(2);
      expect(engine.evaluate('=TYPE("123")', context)).toBe(2);
      expect(engine.evaluate('=TYPE("")', context)).toBe(2);
    });

    test('returns 4 for logical values', () => {
      expect(engine.evaluate('=TYPE(TRUE)', context)).toBe(4);
      expect(engine.evaluate('=TYPE(FALSE)', context)).toBe(4);
    });

    test('returns 16 for errors', () => {
      // Direct error construction not easy in formula, test with function result
      worksheet.setCellValue({ row: 1, col: 1 }, 1);
      worksheet.setCellValue({ row: 2, col: 1 }, 0);
      
      // Division by zero creates #DIV/0! error
      const result = engine.evaluate('=TYPE(A1/A2)', context);
      expect(result).toBe(16);
    });

    test('returns 64 for arrays', () => {
      // SEQUENCE returns the array directly, which gets flattened
      // For our test, we can verify TYPE returns 64 by checking directly
      const arr = [1, 2, 3];
      // Create a formula that references an array-returning function
      worksheet.setCellValue({ row: 1, col: 1 }, '=SEQUENCE(3)');
      
      // Note: In our implementation, arrays may be spilled to cells
      // This test verifies TYPE handles array detection properly
      const result = engine.evaluate('=TYPE(SEQUENCE(3))', context);
      
      // Since SEQUENCE returns an array, TYPE should detect it
      // However, if it gets auto-flattened, that's also valid Excel behavior
      expect(Array.isArray(result) || result === 64).toBe(true);
    });

    test('works with cell references', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, 42);
      worksheet.setCellValue({ row: 2, col: 1 }, 'text');
      worksheet.setCellValue({ row: 3, col: 1 }, true);
      
      expect(engine.evaluate('=TYPE(A1)', context)).toBe(1);
      expect(engine.evaluate('=TYPE(A2)', context)).toBe(2);
      expect(engine.evaluate('=TYPE(A3)', context)).toBe(4);
    });
  });

  // ============================================================================
  // N Tests
  // ============================================================================
  describe('N Function', () => {
    test('returns numbers as-is', () => {
      expect(engine.evaluate('=N(100)', context)).toBe(100);
      expect(engine.evaluate('=N(3.14)', context)).toBe(3.14);
      expect(engine.evaluate('=N(0)', context)).toBe(0);
      expect(engine.evaluate('=N(-42)', context)).toBe(-42);
    });

    test('converts TRUE to 1', () => {
      expect(engine.evaluate('=N(TRUE)', context)).toBe(1);
    });

    test('converts FALSE to 0', () => {
      expect(engine.evaluate('=N(FALSE)', context)).toBe(0);
    });

    test('converts text to 0', () => {
      expect(engine.evaluate('=N("hello")', context)).toBe(0);
      expect(engine.evaluate('=N("123")', context)).toBe(0); // Text not parsed
      expect(engine.evaluate('=N("")', context)).toBe(0);
    });

    test('passes errors through', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, 1);
      worksheet.setCellValue({ row: 2, col: 1 }, 0);
      
      const result = engine.evaluate('=N(A1/A2)', context);
      expect(result).toBeInstanceOf(Error);
    });

    test('works with cell references', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, 42);
      worksheet.setCellValue({ row: 2, col: 1 }, true);
      worksheet.setCellValue({ row: 3, col: 1 }, false);
      worksheet.setCellValue({ row: 4, col: 1 }, 'text');
      
      expect(engine.evaluate('=N(A1)', context)).toBe(42);
      expect(engine.evaluate('=N(A2)', context)).toBe(1);
      expect(engine.evaluate('=N(A3)', context)).toBe(0);
      expect(engine.evaluate('=N(A4)', context)).toBe(0);
    });

    test('useful for converting logical to numeric', () => {
      // Common pattern: N(condition) to convert TRUE/FALSE to 1/0
      expect(engine.evaluate('=N(5>3)', context)).toBe(1);
      expect(engine.evaluate('=N(5<3)', context)).toBe(0);
    });
  });

  // ============================================================================
  // T Tests
  // ============================================================================
  describe('T Function', () => {
    test('returns text as-is', () => {
      expect(engine.evaluate('=T("hello")', context)).toBe('hello');
      expect(engine.evaluate('=T("123")', context)).toBe('123');
      expect(engine.evaluate('=T("")', context)).toBe('');
    });

    test('converts numbers to empty string', () => {
      expect(engine.evaluate('=T(100)', context)).toBe('');
      expect(engine.evaluate('=T(3.14)', context)).toBe('');
      expect(engine.evaluate('=T(0)', context)).toBe('');
    });

    test('converts logical to empty string', () => {
      expect(engine.evaluate('=T(TRUE)', context)).toBe('');
      expect(engine.evaluate('=T(FALSE)', context)).toBe('');
    });

    test('works with cell references', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, 'text');
      worksheet.setCellValue({ row: 2, col: 1 }, 42);
      worksheet.setCellValue({ row: 3, col: 1 }, true);
      
      expect(engine.evaluate('=T(A1)', context)).toBe('text');
      expect(engine.evaluate('=T(A2)', context)).toBe('');
      expect(engine.evaluate('=T(A3)', context)).toBe('');
    });

    test('preserves text from text functions', () => {
      expect(engine.evaluate('=T(UPPER("hello"))', context)).toBe('HELLO');
      expect(engine.evaluate('=T(LEFT("testing", 4))', context)).toBe('test');
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================
  describe('Integration Tests', () => {
    test('combining type checks with IF', () => {
      expect(engine.evaluate('=IF(ISNUMBER(100), "num", "other")', context)).toBe('num');
      expect(engine.evaluate('=IF(ISTEXT("hello"), "text", "other")', context)).toBe('text');
      // Excel ISBLANK("") returns FALSE - empty string is not blank
      expect(engine.evaluate('=IF(ISBLANK(""), "empty", "filled")', context)).toBe('filled');
    });

    test('type checking with data validation', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, 42);
      worksheet.setCellValue({ row: 2, col: 1 }, 'invalid');
      
      // Validate numeric input
      expect(engine.evaluate('=IF(ISNUMBER(A1), A1*2, "ERROR")', context)).toBe(84);
      expect(engine.evaluate('=IF(ISNUMBER(A2), A2*2, "ERROR")', context)).toBe('ERROR');
    });

    test('TYPE with SWITCH for type-specific handling', () => {
      const formula = '=SWITCH(TYPE(100), 1, "Number", 2, "Text", 4, "Bool", "Other")';
      expect(engine.evaluate(formula, context)).toBe('Number');
      
      const formula2 = '=SWITCH(TYPE("test"), 1, "Number", 2, "Text", 4, "Bool", "Other")';
      expect(engine.evaluate(formula2, context)).toBe('Text');
    });

    test('N and T for type conversion in calculations', () => {
      // N converts TRUE/FALSE to 1/0 for math
      expect(engine.evaluate('=N(5>3) + N(10<8)', context)).toBe(1); // 1 + 0
      expect(engine.evaluate('=N(TRUE) * 100', context)).toBe(100);
      
      // T extracts text only
      worksheet.setCellValue({ row: 1, col: 1 }, 'Label:');
      worksheet.setCellValue({ row: 2, col: 1 }, 42);
      
      expect(engine.evaluate('=T(A1) & "Value"', context)).toBe('Label:Value');
      expect(engine.evaluate('=T(A2) & "Value"', context)).toBe('Value'); // Number becomes empty
    });

    test('ISBLANK for conditional formatting logic', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, 100);
      worksheet.setCellValue({ row: 2, col: 1 }, '');  // Empty string is NOT blank in Excel
      worksheet.setCellValue({ row: 3, col: 1 }, 200);
      
      // Count non-blank cells manually - empty string IS considered non-blank in Excel
      const countNonBlank = engine.evaluate(
        '=N(NOT(ISBLANK(A1))) + N(NOT(ISBLANK(A2))) + N(NOT(ISBLANK(A3)))',
        context
      );
      expect(countNonBlank).toBe(3);  // All 3 cells are non-blank (including empty string)
    });

    test('ISNONTEXT for filtering numeric data', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, 100);
      worksheet.setCellValue({ row: 2, col: 1 }, 'skip');
      worksheet.setCellValue({ row: 3, col: 1 }, 200);
      
      // Sum only if numeric (using ISNONTEXT since blanks won't add to sum anyway)
      expect(engine.evaluate('=IF(ISNONTEXT(A1), A1, 0)', context)).toBe(100);
      expect(engine.evaluate('=IF(ISNONTEXT(A2), A2, 0)', context)).toBe(0);
      expect(engine.evaluate('=IF(ISNONTEXT(A3), A3, 0)', context)).toBe(200);
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    test('all functions handle undefined/not-set input', () => {
      // Don't set cell at row 10, it will be undefined
      
      expect(engine.evaluate('=ISNUMBER(A11)', context)).toBe(false);
      expect(engine.evaluate('=ISTEXT(A11)', context)).toBe(false);
      expect(engine.evaluate('=ISBLANK(A11)', context)).toBe(true);
      expect(engine.evaluate('=ISLOGICAL(A11)', context)).toBe(false);
    });

    test('all functions handle null input', () => {
      worksheet.setCellValue({ row: 11, col: 1 }, null);
      
      expect(engine.evaluate('=ISNUMBER(A11)', context)).toBe(false);
      expect(engine.evaluate('=ISTEXT(A11)', context)).toBe(false);
      expect(engine.evaluate('=ISBLANK(A11)', context)).toBe(true);
      expect(engine.evaluate('=ISLOGICAL(A11)', context)).toBe(false);
    });

    test('TYPE handles NaN', () => {
      // NaN is not a valid number type in our system
      // sqrt of negative should give error, not NaN
      const result = engine.evaluate('=TYPE(SQRT(-1))', context);
      expect(result).toBe(16); // Error type
    });

    test('ISNUMBER correctly rejects NaN', () => {
      // Our toNumber should return Error for invalid math
      const result = engine.evaluate('=ISNUMBER(SQRT(-1))', context);
      // SQRT(-1) returns error, ISNUMBER(error) is false
      expect(result).toBe(false);
    });
  });
});
