/**
 * math-week2-day6.test.ts
 * 
 * Week 2 Day 6: Math Aggregation & Rounding Functions (Excel 2013+)
 * Tests for CEILING.MATH, FLOOR.MATH, AGGREGATE, SUBTOTAL
 * 
 * Expected: ~30 tests, 95%+ first-run pass rate
 * Complexity: Logic-heavy (not numerical), high UX impact
 */

import { FormulaEngine, FormulaContext, Worksheet } from '../../src';

describe('Week 2 Day 6: Math Aggregation & Rounding', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;
  let context: FormulaContext;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Sheet1', 100, 26);
    context = {
      worksheet,
      currentCell: { row: 2, col: 2 },
      namedLambdas: new Map()
    } as FormulaContext;
  });

  // ============================================================================
  // CEILING.MATH Tests (8 tests)
  // ============================================================================
  describe('CEILING.MATH', () => {
    test('rounds positive number up to default (1)', () => {
      const result = engine.evaluate('=CEILING.MATH(24.3)', context);
      expect(result).toBe(25);
    });

    test('rounds positive number up to multiple of 5', () => {
      const result = engine.evaluate('=CEILING.MATH(24.3, 5)', context);
      expect(result).toBe(25);
    });

    test('rounds positive number exactly on multiple', () => {
      const result = engine.evaluate('=CEILING.MATH(25, 5)', context);
      expect(result).toBe(25);
    });

    test('rounds negative number toward zero (mode 0, default)', () => {
      // Mode 0 (default): Round "up" for negatives means toward zero (less negative)
      const result = engine.evaluate('=CEILING.MATH(-8.1)', context);
      expect(result).toBe(-8);
    });

    test('rounds negative number away from zero (mode 1)', () => {
      // Mode 1: Round away from zero (more negative)
      const result = engine.evaluate('=CEILING.MATH(-8.1, 1, 1)', context);
      expect(result).toBe(-9);
    });

    test('rounds negative number to multiple of 2, mode 0', () => {
      const result = engine.evaluate('=CEILING.MATH(-5.5, 2)', context);
      expect(result).toBe(-4); // Toward zero
    });

    test('rounds negative number to multiple of 2, mode 1', () => {
      const result = engine.evaluate('=CEILING.MATH(-5.5, 2, 1)', context);
      expect(result).toBe(-6); // Away from zero
    });

    test('handles zero significance (defaults to 1)', () => {
      const result = engine.evaluate('=CEILING.MATH(4.3, 0)', context);
      expect(result).toBe(5);
    });
  });

  // ============================================================================
  // FLOOR.MATH Tests (8 tests)
  // ============================================================================
  describe('FLOOR.MATH', () => {
    test('rounds positive number down to default (1)', () => {
      const result = engine.evaluate('=FLOOR.MATH(24.3)', context);
      expect(result).toBe(24);
    });

    test('rounds positive number down to multiple of 5', () => {
      const result = engine.evaluate('=FLOOR.MATH(24.3, 5)', context);
      expect(result).toBe(20);
    });

    test('rounds positive number exactly on multiple', () => {
      const result = engine.evaluate('=FLOOR.MATH(25, 5)', context);
      expect(result).toBe(25);
    });

    test('rounds negative number away from zero (mode 0, default)', () => {
      // Mode 0 (default): Round "down" for negatives means away from zero (more negative)
      const result = engine.evaluate('=FLOOR.MATH(-8.1)', context);
      expect(result).toBe(-9);
    });

    test('rounds negative number toward zero (mode 1)', () => {
      // Mode 1: Round toward zero (less negative)
      const result = engine.evaluate('=FLOOR.MATH(-8.1, 1, 1)', context);
      expect(result).toBe(-8);
    });

    test('rounds negative number to multiple of 2, mode 0', () => {
      const result = engine.evaluate('=FLOOR.MATH(-5.5, 2)', context);
      expect(result).toBe(-6); // Away from zero
    });

    test('rounds negative number to multiple of 2, mode 1', () => {
      const result = engine.evaluate('=FLOOR.MATH(-5.5, 2, 1)', context);
      expect(result).toBe(-4); // Toward zero
    });

    test('handles zero significance (defaults to 1)', () => {
      const result = engine.evaluate('=FLOOR.MATH(4.7, 0)', context);
      expect(result).toBe(4);
    });
  });

  // ============================================================================
  // AGGREGATE Tests (8 tests)
  // ============================================================================
  describe('AGGREGATE', () => {
    beforeEach(() => {
      // Setup test data: A1:A10 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      // Note: Worksheet uses 1-based indexing (A1 = row:1, col:1)
      for (let i = 1; i <= 10; i++) {
        worksheet.setCellValue({ row: i, col: 1 }, i);
      }
      
      // B1:B5 = [100, 200, 300, 400, 500]
      worksheet.setCellValue({ row: 1, col: 2 }, 100);
      worksheet.setCellValue({ row: 2, col: 2 }, 200);
      worksheet.setCellValue({ row: 3, col: 2 }, 300);
      worksheet.setCellValue({ row: 4, col: 2 }, 400);
      worksheet.setCellValue({ row: 5, col: 2 }, 500);
    });

    test('function 1: AVERAGE (option 0)', () => {
      const result = engine.evaluate('=AGGREGATE(1, 0, A1:A10)', context);
      expect(result).toBe(5.5); // (1+2+...+10)/10
    });

    test('function 9: SUM (option 0)', () => {
      const result = engine.evaluate('=AGGREGATE(9, 0, A1:A10)', context);
      expect(result).toBe(55); // 1+2+...+10
    });

    test('function 4: MAX (option 0)', () => {
      const result = engine.evaluate('=AGGREGATE(4, 0, A1:A10)', context);
      expect(result).toBe(10);
    });

    test('function 5: MIN (option 0)', () => {
      const result = engine.evaluate('=AGGREGATE(5, 0, A1:A10)', context);
      expect(result).toBe(1);
    });

    test('function 2: COUNT (option 2, ignore errors)', () => {
      const result = engine.evaluate('=AGGREGATE(2, 2, B1:B5)', context);
      expect(result).toBe(5); // All 5 values count
    });

    test('function 9: SUM (option 2, ignore errors)', () => {
      const result = engine.evaluate('=AGGREGATE(9, 2, B1:B5)', context);
      expect(result).toBe(1500); // 100 + 200 + 300 + 400 + 500
    });

    test('function 12: MEDIAN', () => {
      const result = engine.evaluate('=AGGREGATE(12, 0, A1:A10)', context);
      expect(result).toBe(5.5); // Median of 1-10
    });

    test('function 7: STDEV.S (sample standard deviation)', () => {
      // Simplified data for predictable stdev
      // C1:C8 = [2, 4, 4, 4, 5, 5, 7, 9] (col: 3, 1-based)
      worksheet.setCellValue({ row: 1, col: 3 }, 2);
      worksheet.setCellValue({ row: 2, col: 3 }, 4);
      worksheet.setCellValue({ row: 3, col: 3 }, 4);
      worksheet.setCellValue({ row: 4, col: 3 }, 4);
      worksheet.setCellValue({ row: 5, col: 3 }, 5);
      worksheet.setCellValue({ row: 6, col: 3 }, 5);
      worksheet.setCellValue({ row: 7, col: 3 }, 7);
      worksheet.setCellValue({ row: 8, col: 3 }, 9);
      
      const result = engine.evaluate('=AGGREGATE(7, 0, C1:C8)', context);
      expect(result).toBeCloseTo(2, 0); // Approximately 2.0
    });
  });

  // ============================================================================
  // SUBTOTAL Tests (6 tests)
  // ============================================================================
  describe('SUBTOTAL', () => {
    beforeEach(() => {
      // Setup test data: A1:A10 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      // Note: Worksheet uses 1-based indexing (A1 = row:1, col:1)
      for (let i = 1; i <= 10; i++) {
        worksheet.setCellValue({ row: i, col: 1 }, i);
      }
    });

    test('function 9: SUM', () => {
      const result = engine.evaluate('=SUBTOTAL(9, A1:A10)', context);
      expect(result).toBe(55); // 1+2+...+10
    });

    test('function 1: AVERAGE', () => {
      const result = engine.evaluate('=SUBTOTAL(1, A1:A10)', context);
      expect(result).toBe(5.5);
    });

    test('function 4: MAX', () => {
      const result = engine.evaluate('=SUBTOTAL(4, A1:A10)', context);
      expect(result).toBe(10);
    });

    test('function 5: MIN', () => {
      const result = engine.evaluate('=SUBTOTAL(5, A1:A10)', context);
      expect(result).toBe(1);
    });

    test('function 109: SUM (ignore hidden and filtered)', () => {
      // 100-series codes behave same as 1-11 in our simplified implementation
      const result = engine.evaluate('=SUBTOTAL(109, A1:A10)', context);
      expect(result).toBe(55);
    });

    test('function 2: COUNT', () => {
      const result = engine.evaluate('=SUBTOTAL(2, A1:A10)', context);
      expect(result).toBe(10);
    });
  });

  // ============================================================================
  // Integration Tests (3 tests)
  // ============================================================================
  describe('Integration Tests', () => {
    test('CEILING.MATH and FLOOR.MATH symmetry', () => {
      const ceiling = engine.evaluate('=CEILING.MATH(24.5, 5)', context);
      const floor = engine.evaluate('=FLOOR.MATH(24.5, 5)', context);
      expect(ceiling).toBe(25);
      expect(floor).toBe(20);
    });

    test('AGGREGATE vs SUBTOTAL for basic SUM', () => {
      // Setup data: A1:A5 = [10, 20, 30, 40, 50]
      // Note: Worksheet uses 1-based indexing
      for (let i = 1; i <= 5; i++) {
        worksheet.setCellValue({ row: i, col: 1 }, i * 10);
      }
      
      const aggregate = engine.evaluate('=AGGREGATE(9, 0, A1:A5)', context);
      const subtotal = engine.evaluate('=SUBTOTAL(9, A1:A5)', context);
      
      expect(aggregate).toBe(150); // 10+20+30+40+50
      expect(subtotal).toBe(150);  // Same result
    });

    test('AGGREGATE median on rounded values', () => {
      // Create data using CEILING.MATH
      // Column A (col: 1) has raw values, Column B (col: 2) has rounded
      // Note: Worksheet uses 1-based indexing (A1 = row:1, col:1)
      worksheet.setCellValue({ row: 1, col: 1 }, 1.2);
      worksheet.setCellValue({ row: 2, col: 1 }, 2.7);
      worksheet.setCellValue({ row: 3, col: 1 }, 3.1);
      worksheet.setCellValue({ row: 4, col: 1 }, 4.9);
      worksheet.setCellValue({ row: 5, col: 1 }, 5.5);
      
      // Can't use CEILING.MATH in cell formulas yet (need full evaluation)
      // So manually set rounded values in column B
      worksheet.setCellValue({ row: 1, col: 2 }, 2);
      worksheet.setCellValue({ row: 2, col: 2 }, 3);
      worksheet.setCellValue({ row: 3, col: 2 }, 4);
      worksheet.setCellValue({ row: 4, col: 2 }, 5);
      worksheet.setCellValue({ row: 5, col: 2 }, 6);
      
      const median = engine.evaluate('=AGGREGATE(12, 0, B1:B5)', context);
      expect(median).toBe(4); // Middle value of [2,3,4,5,6]
    });
  });
});
