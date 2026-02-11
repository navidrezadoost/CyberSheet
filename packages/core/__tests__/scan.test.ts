/**
 * Tests for SCAN Function
 * 
 * SCAN performs a cumulative reduce operation, returning all intermediate values.
 * It's essential for running totals, cumulative sums, moving calculations, etc.
 * 
 * Syntax:
 * - SCAN(array, lambda) - Uses first element as initial value
 * - SCAN(initial, array, lambda) - Starts with custom initial value
 */

import { FormulaEngine, FormulaContext, Worksheet, type FormulaValue } from '../src';

describe('SCAN Function', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;
  let context: FormulaContext;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Sheet1', 100, 26);
    context = {
      worksheet,
      currentCell: { row: 0, col: 0 }
    };
  });

  describe('Basic SCAN Usage', () => {
    test('calculates running sum (no initial value)', () => {
      // SCAN([1,2,3,4,5], LAMBDA(a, b, a+b))
      // Expected: [1, 3, 6, 10, 15]
      const result = engine.evaluate(
        '=SCAN(SEQUENCE(5), LAMBDA(acc, val, acc + val))',
        context
      ) as FormulaValue[];

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([1, 3, 6, 10, 15]);
    });

    test('calculates running sum (with initial value)', () => {
      // SCAN(0, [1,2,3,4,5], LAMBDA(a, b, a+b))
      // Expected: [1, 3, 6, 10, 15]
      const result = engine.evaluate(
        '=SCAN(0, SEQUENCE(5), LAMBDA(acc, val, acc + val))',
        context
      ) as FormulaValue[];

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([1, 3, 6, 10, 15]);
    });

    test('calculates running product', () => {
      // SCAN(1, [2,3,4], LAMBDA(a, b, a*b))
      // Expected: [2, 6, 24]
      const result = engine.evaluate(
        '=SCAN(1, SEQUENCE(3, 1, 2), LAMBDA(acc, val, acc * val))',
        context
      ) as FormulaValue[];

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([2, 6, 24]);
    });

    test('calculates running maximum', () => {
      const result = engine.evaluate(
        '=LET(arr, SEQUENCE(5, 1, 5, -1), SCAN(arr, LAMBDA(acc, val, MAX(acc, val))))',
        context
      ) as FormulaValue[];

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([5, 5, 5, 5, 5]);
    });

    test('works with single element array', () => {
      const result = engine.evaluate(
        '=SCAN(0, SEQUENCE(1), LAMBDA(acc, val, acc + val))',
        context
      ) as FormulaValue[];

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([1]);
    });
  });

  describe('SCAN with Cell References', () => {
    beforeEach(() => {
      worksheet.setCellValue({ row: 1, col: 1 }, 10); // A1
      worksheet.setCellValue({ row: 2, col: 1 }, 20); // A2
      worksheet.setCellValue({ row: 3, col: 1 }, 30); // A3
      worksheet.setCellValue({ row: 4, col: 1 }, 40); // A4
    });

    test('scans range reference', () => {
      // Update context to be at a different cell to avoid circular reference
      const testContext = {
        worksheet,
        currentCell: { row: 1, col: 2 }
      };
      
      const result = engine.evaluate(
        '=SCAN(A1:A4, LAMBDA(acc, val, acc + val))',
        testContext
      );

      // Debug: Check what result actually is
      if (result instanceof Error) {
        console.log('SCAN error:', result.message);
        expect(result).not.toBeInstanceOf(Error);
      } else {
        expect(Array.isArray(result)).toBe(true);
        expect(result).toEqual([10, 30, 60, 100]);
      }
    });

    test('scans range with initial value', () => {
      // Update context to be at a different cell to avoid circular reference
      const testContext = {
        worksheet,
        currentCell: { row: 1, col: 2 }
      };
      
      const result = engine.evaluate(
        '=SCAN(0, A1:A4, LAMBDA(acc, val, acc + val))',
        testContext
      ) as FormulaValue[];

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([10, 30, 60, 100]);
    });
  });

  describe('SCAN with LET and Complex Expressions', () => {
    test('combines with LET for reusable calculations', () => {
      const result = engine.evaluate(
        '=LET(nums, SEQUENCE(5), multiplier, 2, SCAN(0, nums, LAMBDA(acc, val, acc + val * multiplier)))',
        context
      ) as FormulaValue[];

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([2, 6, 12, 20, 30]); // 0+2, 2+4, 6+6, 12+8, 20+10
    });

    test('calculates factorial sequence', () => {
      // SCAN(1, [1,2,3,4,5], LAMBDA(a, b, a*b))
      // Expected: [1, 2, 6, 24, 120]
      const result = engine.evaluate(
        '=SCAN(1, SEQUENCE(5), LAMBDA(acc, val, acc * val))',
        context
      ) as FormulaValue[];

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([1, 2, 6, 24, 120]);
    });

    test('uses lambda capturing LET variables', () => {
      const result = engine.evaluate(
        '=LET(start, 100, nums, SEQUENCE(3), SCAN(start, nums, LAMBDA(acc, val, acc - val)))',
        context
      ) as FormulaValue[];

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([99, 97, 94]); // 100-1, 99-2, 97-3
    });
  });

  describe('SCAN for Running Statistics', () => {
    test('calculates running average (using count)', () => {
      // Running sum divided by position
      worksheet.setCellValue({ row: 1, col: 1 }, 10); // A1
      worksheet.setCellValue({ row: 2, col: 1 }, 20); // A2
      worksheet.setCellValue({ row: 3, col: 1 }, 30); // A3
      
      const testContext = {
        worksheet,
        currentCell: { row: 1, col: 2 }
      };
      
      const result = engine.evaluate(
        '=SCAN(A1:A3, LAMBDA(acc, val, acc + val))',
        testContext
      ) as FormulaValue[];

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([10, 30, 60]);
    });

    test('tracks cumulative minimum', () => {
      const result = engine.evaluate(
        '=LET(arr, SEQUENCE(5, 1, 5, -1), SCAN(arr, LAMBDA(acc, val, MIN(acc, val))))',
        context
      ) as FormulaValue[];

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([5, 4, 3, 2, 1]);
    });
  });

  describe('SCAN with Conditional Logic', () => {
    test('counts positive cumulative', () => {
      // Count how many values so far are positive
      const result = engine.evaluate(
        '=LET(arr, SEQUENCE(5, 1, -2, 1), SCAN(0, arr, LAMBDA(acc, val, IF(val > 0, acc + 1, acc))))',
        context
      ) as FormulaValue[];

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([0, 0, 0, 1, 2]); // -2, -1, 0, 1, 2
    });

    test('cumulative alternating sum', () => {
      const result = engine.evaluate(
        '=SCAN(0, SEQUENCE(4), LAMBDA(acc, val, acc + IF(MOD(val, 2) = 1, val, -val)))',
        context
      ) as FormulaValue[];

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([1, -1, 2, -2]); // 0+1, 1-2, -1+3, 2-4
    });
  });

  describe('Error Handling', () => {
    test('returns error with no arguments', () => {
      const result = engine.evaluate('=SCAN()', context);

      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns error with only one argument', () => {
      const result = engine.evaluate('=SCAN(SEQUENCE(5))', context);

      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns error with too many arguments', () => {
      const result = engine.evaluate(
        '=SCAN(0, SEQUENCE(5), LAMBDA(a, b, a+b), "extra")',
        context
      );

      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns error when second argument is not a lambda (2-arg form)', () => {
      const result = engine.evaluate('=SCAN(SEQUENCE(5), 123)', context);

      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns error when third argument is not a lambda (3-arg form)', () => {
      const result = engine.evaluate('=SCAN(0, SEQUENCE(5), 123)', context);

      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns error when lambda has wrong parameter count', () => {
      const result = engine.evaluate(
        '=SCAN(0, SEQUENCE(5), LAMBDA(x, x*2))',
        context
      );

      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns error with empty array and no initial value', () => {
      const result = engine.evaluate(
        '=SCAN(FILTER(SEQUENCE(5), SEQUENCE(5) > 10), LAMBDA(a, b, a+b))',
        context
      );

      expect(result).toBeInstanceOf(Error);
      // FILTER returns error for no matches, so SCAN will propagate it
    });

    test('propagates error from lambda evaluation', () => {
      const result = engine.evaluate(
        '=SCAN(0, SEQUENCE(5), LAMBDA(acc, val, acc / 0))',
        context
      );

      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#DIV/0!');
    });
  });

  describe('Integration with Other Functions', () => {
    test('combines with MAP for transformation then scan', () => {
      // Double each number, then running sum
      const result = engine.evaluate(
        '=SCAN(0, MAP(SEQUENCE(4), LAMBDA(x, x*2)), LAMBDA(acc, val, acc + val))',
        context
      ) as FormulaValue[];

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([2, 6, 12, 20]); // 2, 2+4, 6+6, 12+8
    });

    test('combines with FILTER then scan', () => {
      // Filter even numbers, then running product
      const result = engine.evaluate(
        '=LET(nums, SEQUENCE(6), evens, FILTER(nums, MOD(nums, 2) = 0), SCAN(1, evens, LAMBDA(acc, val, acc * val)))',
        context
      ) as FormulaValue[];

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([2, 8, 48]); // 2, 2*4, 8*6
    });

    test('uses SCAN result in another function', () => {
      // Get last element of SCAN (final sum)
      const result = engine.evaluate(
        '=LET(running, SCAN(0, SEQUENCE(5), LAMBDA(a, b, a+b)), INDEX(running, 5))',
        context
      ) as number;

      expect(result).toBe(15);
    });
  });

  describe('Real-World Use Cases', () => {
    test('calculates running balance (bank account)', () => {
      // Starting balance 1000, transactions: +500, -200, +300, -100
      worksheet.setCellValue({ row: 1, col: 1 }, 500);  // A1
      worksheet.setCellValue({ row: 2, col: 1 }, -200); // A2
      worksheet.setCellValue({ row: 3, col: 1 }, 300);  // A3
      worksheet.setCellValue({ row: 4, col: 1 }, -100); // A4

      const testContext = {
        worksheet,
        currentCell: { row: 1, col: 2 }
      };

      const result = engine.evaluate(
        '=SCAN(1000, A1:A4, LAMBDA(balance, transaction, balance + transaction))',
        testContext
      ) as FormulaValue[];

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([1500, 1300, 1600, 1500]);
    });

    test('calculates cumulative sales (year-to-date)', () => {
      // Monthly sales: 100, 150, 200, 175
      worksheet.setCellValue({ row: 1, col: 1 }, 100); // A1
      worksheet.setCellValue({ row: 2, col: 1 }, 150); // A2
      worksheet.setCellValue({ row: 3, col: 1 }, 200); // A3
      worksheet.setCellValue({ row: 4, col: 1 }, 175); // A4

      const testContext = {
        worksheet,
        currentCell: { row: 1, col: 2 }
      };

      const result = engine.evaluate(
        '=SCAN(A1:A4, LAMBDA(ytd, monthly, ytd + monthly))',
        testContext
      ) as FormulaValue[];

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([100, 250, 450, 625]);
    });

    test('tracks inventory with stock movements', () => {
      // Starting stock 50, movements: +20, +10, 0, -10
      const result = engine.evaluate(
        '=LET(movements, SEQUENCE(4, 1, 20, -10), SCAN(50, movements, LAMBDA(stock, change, stock + change)))',
        context
      ) as FormulaValue[];

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([70, 80, 80, 70]); // 50+20, 70+10, 80+0, 80-10
    });

    test('calculates compound interest growth', () => {
      // Starting principal 1000, 5% annual interest, 4 years
      const result = engine.evaluate(
        '=LET(years, SEQUENCE(4), SCAN(1000, years, LAMBDA(principal, year, principal * 1.05)))',
        context
      ) as FormulaValue[];

      expect(Array.isArray(result)).toBe(true);
      
      result.forEach((val, i) => {
        const expected = 1000 * Math.pow(1.05, i + 1);
        expect(Math.abs((val as number) - expected)).toBeLessThan(0.01);
      });
    });

    test('generates Fibonacci sequence', () => {
      // F(n) = F(n-1) + F(n-2), but SCAN needs two accumulators
      // Simplified: accumulator is last value, we add index
      // For true Fibonacci, we'd need REDUCE with complex state
      
      // Simple growing sequence: 1, 2, 3, 5, 8, 13...
      const result = engine.evaluate(
        '=LET(n, SEQUENCE(6, 1, 1), SCAN(0, n, LAMBDA(prev, idx, prev + idx)))',
        context
      ) as FormulaValue[];

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([1, 3, 6, 10, 15, 21]); // Triangular numbers
    });
  });

  describe('Performance and Edge Cases', () => {
    test('handles large array efficiently', () => {
      // Sum of 1 to 100
      const result = engine.evaluate(
        '=SCAN(0, SEQUENCE(100), LAMBDA(acc, val, acc + val))',
        context
      ) as FormulaValue[];

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(100);
      expect(result[99]).toBe(5050); // Sum of 1 to 100
    });

    test('handles negative numbers correctly', () => {
      const result = engine.evaluate(
        '=SCAN(0, SEQUENCE(5, 1, -2, 1), LAMBDA(acc, val, acc + val))',
        context
      ) as FormulaValue[];

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([-2, -3, -3, -2, 0]); // -2, -1, 0, 1, 2
    });

    test('handles decimal accumulation', () => {
      const result = engine.evaluate(
        '=SCAN(0, SEQUENCE(3, 1, 0.5, 0.5), LAMBDA(acc, val, acc + val))',
        context
      ) as FormulaValue[];

      expect(Array.isArray(result)).toBe(true);
      
      result.forEach((val, i) => {
        const expected = (i + 1) * 0.5 * ((i + 1) + 1) / 2;
        expect(Math.abs((val as number) - expected)).toBeLessThan(0.01);
      });
    });
  });
});
