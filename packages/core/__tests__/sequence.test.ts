/**
 * Unit tests for SEQUENCE function (Excel 365)
 * Tests dynamic array generation with sequential numbers
 */

import { FormulaEngine } from '../src/FormulaEngine';
import { Worksheet } from '../src/worksheet';

describe('FormulaEngine - SEQUENCE Function', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Test', 100, 26);
  });

  // Helper to directly test SEQUENCE function
  const testSEQUENCE = (...args: any[]) => {
    const sequenceFunc = (engine as any).functions.get('SEQUENCE');
    return sequenceFunc(...args);
  };

  describe('1D sequences (single column)', () => {
    test('should generate simple sequence from 1 to N', () => {
      const result = testSEQUENCE(5);
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    test('should generate sequence with default parameters', () => {
      expect(testSEQUENCE(3)).toEqual([1, 2, 3]);
      expect(testSEQUENCE(1)).toEqual([1]);
      expect(testSEQUENCE(10)).toHaveLength(10);
    });

    test('should generate sequence with custom start', () => {
      expect(testSEQUENCE(5, 1, 10)).toEqual([10, 11, 12, 13, 14]);
      expect(testSEQUENCE(4, 1, 0)).toEqual([0, 1, 2, 3]);
      expect(testSEQUENCE(3, 1, -5)).toEqual([-5, -4, -3]);
    });

    test('should generate sequence with custom step', () => {
      expect(testSEQUENCE(5, 1, 1, 2)).toEqual([1, 3, 5, 7, 9]);
      expect(testSEQUENCE(4, 1, 0, 5)).toEqual([0, 5, 10, 15]);
      expect(testSEQUENCE(5, 1, 10, 10)).toEqual([10, 20, 30, 40, 50]);
    });

    test('should generate sequence with negative step', () => {
      expect(testSEQUENCE(5, 1, 10, -1)).toEqual([10, 9, 8, 7, 6]);
      expect(testSEQUENCE(4, 1, 0, -2)).toEqual([0, -2, -4, -6]);
      expect(testSEQUENCE(3, 1, 100, -10)).toEqual([100, 90, 80]);
    });

    test('should generate sequence with decimal step', () => {
      expect(testSEQUENCE(5, 1, 0, 0.5)).toEqual([0, 0.5, 1, 1.5, 2]);
      expect(testSEQUENCE(4, 1, 1, 0.25)).toEqual([1, 1.25, 1.5, 1.75]);
      expect(testSEQUENCE(3, 1, 10, 0.1)).toEqual([10, 10.1, 10.2]);
    });

    test('should generate sequence with decimal start', () => {
      expect(testSEQUENCE(3, 1, 1.5, 1)).toEqual([1.5, 2.5, 3.5]);
      
      // Use toBeCloseTo for floating point comparisons
      const result = testSEQUENCE(4, 1, 0.1, 0.1);
      expect(result[0]).toBeCloseTo(0.1, 10);
      expect(result[1]).toBeCloseTo(0.2, 10);
      expect(result[2]).toBeCloseTo(0.3, 10);
      expect(result[3]).toBeCloseTo(0.4, 10);
    });

    test('should handle zero step (constant sequence)', () => {
      expect(testSEQUENCE(5, 1, 10, 0)).toEqual([10, 10, 10, 10, 10]);
      expect(testSEQUENCE(3, 1, 0, 0)).toEqual([0, 0, 0]);
    });
  });

  describe('2D sequences (multiple columns)', () => {
    test('should generate 2D sequence with default start and step', () => {
      const result = testSEQUENCE(3, 3);
      expect(result).toEqual([
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]
      ]);
    });

    test('should generate 2D sequence with custom dimensions', () => {
      const result = testSEQUENCE(2, 4);
      expect(result).toEqual([
        [1, 2, 3, 4],
        [5, 6, 7, 8]
      ]);
    });

    test('should generate 2D sequence with custom start', () => {
      const result = testSEQUENCE(2, 3, 10);
      expect(result).toEqual([
        [10, 11, 12],
        [13, 14, 15]
      ]);
    });

    test('should generate 2D sequence with custom step', () => {
      const result = testSEQUENCE(3, 2, 0, 5);
      expect(result).toEqual([
        [0, 5],
        [10, 15],
        [20, 25]
      ]);
    });

    test('should generate 2D sequence with decimal step', () => {
      const result = testSEQUENCE(2, 2, 0, 0.5);
      expect(result).toEqual([
        [0, 0.5],
        [1, 1.5]
      ]);
    });

    test('should generate 2D sequence with negative step', () => {
      const result = testSEQUENCE(2, 3, 10, -1);
      expect(result).toEqual([
        [10, 9, 8],
        [7, 6, 5]
      ]);
    });

    test('should generate single row with multiple columns', () => {
      const result = testSEQUENCE(1, 5);
      expect(result).toEqual([[1, 2, 3, 4, 5]]);
    });

    test('should generate large 2D grid', () => {
      const result = testSEQUENCE(5, 5);
      expect(result).toHaveLength(5);
      expect(result[0]).toHaveLength(5);
      expect(result[0][0]).toBe(1);
      expect(result[4][4]).toBe(25);
    });
  });

  describe('Parameter handling', () => {
    test('should handle explicit columns=1 (1D array)', () => {
      const result = testSEQUENCE(5, 1);
      expect(result).toEqual([1, 2, 3, 4, 5]);
      expect(Array.isArray(result)).toBe(true);
      expect(Array.isArray(result[0])).toBe(false);
    });

    test('should round down fractional rows and columns', () => {
      const result1 = testSEQUENCE(5.7, 1);  // 5 rows
      expect(result1).toHaveLength(5);

      const result2 = testSEQUENCE(3, 2.9);  // 3 rows, 2 cols
      expect(result2).toHaveLength(3);
      expect(result2[0]).toHaveLength(2);
    });

    test('should handle string numbers', () => {
      const result = testSEQUENCE('5', '1', '10', '2');
      expect(result).toEqual([10, 12, 14, 16, 18]);
    });

    test('should preserve decimal precision', () => {
      const result = testSEQUENCE(3, 1, 0, 0.1);
      expect(result[0]).toBe(0);
      expect(result[1]).toBeCloseTo(0.1, 10);
      expect(result[2]).toBeCloseTo(0.2, 10);
    });
  });

  describe('Error handling', () => {
    test('should return #VALUE! when rows is undefined', () => {
      const result = testSEQUENCE();
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('should return #VALUE! for invalid rows', () => {
      const result = testSEQUENCE('invalid');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('should return #VALUE! for zero or negative rows', () => {
      const result1 = testSEQUENCE(0);
      expect(result1).toBeInstanceOf(Error);
      expect((result1 as Error).message).toBe('#VALUE!');

      const result2 = testSEQUENCE(-5);
      expect(result2).toBeInstanceOf(Error);
      expect((result2 as Error).message).toBe('#VALUE!');
    });

    test('should return #VALUE! for zero or negative columns', () => {
      const result1 = testSEQUENCE(5, 0);
      expect(result1).toBeInstanceOf(Error);
      expect((result1 as Error).message).toBe('#VALUE!');

      const result2 = testSEQUENCE(5, -2);
      expect(result2).toBeInstanceOf(Error);
      expect((result2 as Error).message).toBe('#VALUE!');
    });

    test('should return #VALUE! for invalid start', () => {
      const result = testSEQUENCE(5, 1, 'invalid');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('should return #VALUE! for invalid step', () => {
      const result = testSEQUENCE(5, 1, 1, 'invalid');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('should return #NUM! for excessively large sequences', () => {
      const result = testSEQUENCE(10000, 1000);  // 10 million cells
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('should handle maximum reasonable size', () => {
      const result = testSEQUENCE(1000, 1);
      expect(result).toHaveLength(1000);
      expect(result[0]).toBe(1);
      expect(result[999]).toBe(1000);
    });
  });

  describe('Real-world scenarios', () => {
    test('should generate row numbers for tables', () => {
      const rowNumbers = testSEQUENCE(10);
      expect(rowNumbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    test('should generate multiplication table', () => {
      const table = testSEQUENCE(3, 3, 1, 1);
      expect(table).toEqual([
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]
      ]);
    });

    test('should generate year sequence', () => {
      const years = testSEQUENCE(5, 1, 2020, 1);
      expect(years).toEqual([2020, 2021, 2022, 2023, 2024]);
    });

    test('should generate monthly dates (simplified)', () => {
      const months = testSEQUENCE(12, 1, 1, 1);
      expect(months).toHaveLength(12);
      expect(months[0]).toBe(1);
      expect(months[11]).toBe(12);
    });

    test('should generate price increments', () => {
      const prices = testSEQUENCE(5, 1, 10, 2.5);
      expect(prices).toEqual([10, 12.5, 15, 17.5, 20]);
    });

    test('should generate countdown', () => {
      const countdown = testSEQUENCE(10, 1, 10, -1);
      expect(countdown).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
    });

    test('should generate calendar grid (5 weeks x 7 days)', () => {
      const calendar = testSEQUENCE(5, 7);
      expect(calendar).toHaveLength(5);
      expect(calendar[0]).toHaveLength(7);
      expect(calendar[0][0]).toBe(1);
      expect(calendar[4][6]).toBe(35);
    });

    test('should generate percentage increments', () => {
      const percentages = testSEQUENCE(11, 1, 0, 0.1);
      expect(percentages[0]).toBe(0);
      expect(percentages[10]).toBeCloseTo(1.0, 10);
    });
  });

  describe('Edge cases', () => {
    test('should handle single cell (1x1)', () => {
      const result = testSEQUENCE(1, 1);
      expect(result).toEqual([1]);
    });

    test('should handle very small decimals', () => {
      const result = testSEQUENCE(3, 1, 0, 0.001);
      expect(result[0]).toBe(0);
      expect(result[1]).toBeCloseTo(0.001, 10);
      expect(result[2]).toBeCloseTo(0.002, 10);
    });

    test('should handle negative start with positive step', () => {
      const result = testSEQUENCE(5, 1, -10, 2);
      expect(result).toEqual([-10, -8, -6, -4, -2]);
    });

    test('should handle negative start with negative step', () => {
      const result = testSEQUENCE(5, 1, -5, -1);
      expect(result).toEqual([-5, -6, -7, -8, -9]);
    });

    test('should handle large step values', () => {
      const result = testSEQUENCE(3, 1, 0, 1000);
      expect(result).toEqual([0, 1000, 2000]);
    });

    test('should handle very large start values', () => {
      const result = testSEQUENCE(3, 1, 1000000, 1);
      expect(result).toEqual([1000000, 1000001, 1000002]);
    });

    test('should handle fractional rows rounding', () => {
      const result = testSEQUENCE(3.1, 1);  // Should give 3 rows
      expect(result).toHaveLength(3);
    });

    test('should handle fractional columns rounding', () => {
      const result = testSEQUENCE(2, 3.9);  // Should give 3 columns
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveLength(3);
    });
  });

  describe('Performance', () => {
    test('should generate large 1D sequence efficiently', () => {
      const start = Date.now();
      const result = testSEQUENCE(1000, 1);
      const duration = Date.now() - start;
      
      expect(result).toHaveLength(1000);
      expect(result[0]).toBe(1);
      expect(result[999]).toBe(1000);
      expect(duration).toBeLessThan(50);
    });

    test('should generate large 2D sequence efficiently', () => {
      const start = Date.now();
      const result = testSEQUENCE(100, 100);
      const duration = Date.now() - start;
      
      expect(result).toHaveLength(100);
      expect(result[0]).toHaveLength(100);
      expect(result[0][0]).toBe(1);
      expect(result[99][99]).toBe(10000);
      expect(duration).toBeLessThan(100);
    });

    test('should generate many small sequences quickly', () => {
      const start = Date.now();
      
      for (let i = 0; i < 100; i++) {
        testSEQUENCE(10, 1);
      }
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Return type validation', () => {
    test('1D sequence should return flat array', () => {
      const result = testSEQUENCE(3, 1);
      expect(Array.isArray(result)).toBe(true);
      expect(Array.isArray(result[0])).toBe(false);
      expect(typeof result[0]).toBe('number');
    });

    test('2D sequence should return array of arrays', () => {
      const result = testSEQUENCE(2, 2);
      expect(Array.isArray(result)).toBe(true);
      expect(Array.isArray(result[0])).toBe(true);
      expect(typeof result[0][0]).toBe('number');
    });

    test('single column with multiple rows returns 1D', () => {
      const result = testSEQUENCE(5, 1);
      expect(Array.isArray(result)).toBe(true);
      expect(Array.isArray(result[0])).toBe(false);
    });

    test('multiple columns returns 2D even for single row', () => {
      const result = testSEQUENCE(1, 3);
      expect(Array.isArray(result)).toBe(true);
      expect(Array.isArray(result[0])).toBe(true);
    });
  });
});
