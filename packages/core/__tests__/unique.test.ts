/**
 * Tests for UNIQUE function - Extract unique values from array (Excel 365)
 * 
 * UNIQUE is a dynamic array function that returns unique values from an array.
 * 
 * Syntax: UNIQUE(array, [by_col], [exactly_once])
 * 
 * Parameters:
 * - array: The array or range to process (required)
 * - by_col: Logical - FALSE/0 to compare rows (default), TRUE/1 to compare columns
 * - exactly_once: Logical - FALSE/0 for all unique values (default), TRUE/1 for values appearing only once
 * 
 * Returns:
 * - 1D array if input is 1D
 * - 2D array if input is 2D (preserves structure)
 * - #VALUE! if array parameter is missing or invalid
 * - #CALC! if result would be empty
 */

import { FormulaEngine } from '../src/FormulaEngine';
import type { FormulaValue } from '../src/FormulaEngine';
import { Worksheet } from '../src/worksheet';

describe('FormulaEngine - UNIQUE Function', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Test', 100, 26);
  });

  // Helper to directly test UNIQUE function
  const testUNIQUE = (...args: any[]) => {
    const uniqueFunc = (engine as any).functions.get('UNIQUE');
    return uniqueFunc(...args);
  };

  // ============================================================================
  // 1D Array Tests - Basic Duplicate Removal
  // ============================================================================

  describe('1D Arrays - Basic Uniqueness', () => {
    test('removes simple duplicates from 1D array', () => {
      const result = testUNIQUE([1, 2, 2, 3, 3, 3]);
      expect(result).toEqual([1, 2, 3]);
    });

    test('handles array with no duplicates', () => {
      const result = testUNIQUE([1, 2, 3, 4, 5]);
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    test('removes string duplicates', () => {
      const result = testUNIQUE(['apple', 'banana', 'apple', 'cherry', 'banana']);
      expect(result).toEqual(['apple', 'banana', 'cherry']);
    });

    test('handles mixed type duplicates', () => {
      const result = testUNIQUE([1, '1', 1, 2, '2', 2]);
      expect(result).toEqual([1, '1', 2, '2']);
    });

    test('handles boolean duplicates', () => {
      const result = testUNIQUE([true, false, true, false, true]);
      expect(result).toEqual([true, false]);
    });

    test('preserves order of first occurrence', () => {
      const result = testUNIQUE([3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5]);
      expect(result).toEqual([3, 1, 4, 5, 9, 2, 6]);
    });

    test('handles single element array', () => {
      const result = testUNIQUE([42]);
      expect(result).toEqual([42]);
    });

    test('handles array with all duplicates', () => {
      const result = testUNIQUE([7, 7, 7, 7, 7]);
      expect(result).toEqual([7]);
    });
  });

  // ============================================================================
  // 2D Array Tests - Row Uniqueness (Default)
  // ============================================================================

  describe('2D Arrays - Row Uniqueness', () => {
    test('removes duplicate rows from 2D array', () => {
      const result = testUNIQUE([[1, 2], [1, 2], [3, 4]]);
      expect(result).toEqual([[1, 2], [3, 4]]);
    });

    test('handles 2D array with no duplicate rows', () => {
      const result = testUNIQUE([[1, 2], [3, 4], [5, 6]]);
      expect(result).toEqual([[1, 2], [3, 4], [5, 6]]);
    });

    test('removes duplicate rows with strings', () => {
      const result = testUNIQUE([['A', 'B'], ['C', 'D'], ['A', 'B']]);
      expect(result).toEqual([['A', 'B'], ['C', 'D']]);
    });

    test('handles multiple duplicate rows', () => {
      const result = testUNIQUE([[1, 2], [3, 4], [1, 2], [5, 6], [3, 4], [1, 2]]);
      expect(result).toEqual([[1, 2], [3, 4], [5, 6]]);
    });

    test('preserves row order of first occurrence', () => {
      const result = testUNIQUE([[10, 20], [30, 40], [10, 20], [50, 60]]);
      expect(result).toEqual([[10, 20], [30, 40], [50, 60]]);
    });

    test('handles single row 2D array', () => {
      const result = testUNIQUE([[100, 200, 300]]);
      expect(result).toEqual([[100, 200, 300]]);
    });

    test('handles 2D array with mixed types', () => {
      const result = testUNIQUE([[1, 'A'], [2, 'B'], [1, 'A']]);
      expect(result).toEqual([[1, 'A'], [2, 'B']]);
    });
  });

  // ============================================================================
  // by_col Parameter Tests
  // ============================================================================

  describe('by_col Parameter - Column Uniqueness', () => {
    test('removes duplicate columns when by_col=TRUE', () => {
      const result = testUNIQUE([[1, 2, 1], [3, 4, 3]], true);
      expect(result).toEqual([[1, 2], [3, 4]]);
    });

    test('removes duplicate columns when by_col=1', () => {
      const result = testUNIQUE([[1, 2, 1], [3, 4, 3]], 1);
      expect(result).toEqual([[1, 2], [3, 4]]);
    });

    test('compares rows when by_col=FALSE (default)', () => {
      const result = testUNIQUE([[1, 2], [1, 2], [3, 4]], false);
      expect(result).toEqual([[1, 2], [3, 4]]);
    });

    test('compares rows when by_col=0', () => {
      const result = testUNIQUE([[1, 2], [1, 2], [3, 4]], 0);
      expect(result).toEqual([[1, 2], [3, 4]]);
    });

    test('handles column uniqueness with strings', () => {
      const result = testUNIQUE([['A', 'B', 'A'], ['C', 'D', 'C']], true);
      expect(result).toEqual([['A', 'B'], ['C', 'D']]);
    });

    test('handles no duplicate columns', () => {
      const result = testUNIQUE([[1, 2, 3], [4, 5, 6]], true);
      expect(result).toEqual([[1, 2, 3], [4, 5, 6]]);
    });
  });

  // ============================================================================
  // exactly_once Parameter Tests
  // ============================================================================

  describe('exactly_once Parameter - Return Only Unique Items', () => {
    test('returns only values appearing exactly once in 1D array', () => {
      const result = testUNIQUE([1, 2, 2, 3, 3, 3], false, true);
      expect(result).toEqual([1]); // Only 1 appears once
    });

    test('returns only values appearing exactly once when exactly_once=1', () => {
      const result = testUNIQUE([1, 2, 2, 3, 3, 3], false, 1);
      expect(result).toEqual([1]);
    });

    test('returns all unique values when exactly_once=FALSE', () => {
      const result = testUNIQUE([1, 2, 2, 3, 3, 3], false, false);
      expect(result).toEqual([1, 2, 3]);
    });

    test('handles exactly_once with strings', () => {
      const result = testUNIQUE(['A', 'B', 'B', 'C', 'C', 'C'], false, true);
      expect(result).toEqual(['A']);
    });

    test('returns only rows appearing exactly once in 2D array', () => {
      const result = testUNIQUE([[1, 2], [3, 4], [1, 2], [5, 6]], false, true);
      expect(result).toEqual([[3, 4], [5, 6]]); // [1,2] appears twice, others once
    });

    test('returns only columns appearing exactly once', () => {
      const result = testUNIQUE([[1, 2, 1, 3], [4, 5, 4, 6]], true, true);
      expect(result).toEqual([[2, 3], [5, 6]]); // Column [1,4] appears twice
    });

    test('returns error when no values appear exactly once', () => {
      const result = testUNIQUE([1, 1, 2, 2, 3, 3], false, true);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#CALC!');
    });

    test('handles all values appearing once', () => {
      const result = testUNIQUE([10, 20, 30, 40], false, true);
      expect(result).toEqual([10, 20, 30, 40]);
    });
  });

  // ============================================================================
  // Integration Tests with SEQUENCE
  // ============================================================================

  describe('Integration with SEQUENCE', () => {
    // Helper to get SEQUENCE function
    const testSEQUENCE = (...args: any[]) => {
      const seqFunc = (engine as any).functions.get('SEQUENCE');
      return seqFunc(...args);
    };

    test('UNIQUE returns all values from SEQUENCE (no duplicates)', () => {
      const seq = testSEQUENCE(5);
      const result = testUNIQUE(seq);
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    test('UNIQUE with SEQUENCE 2D array', () => {
      const seq = testSEQUENCE(2, 3);
      const result = testUNIQUE(seq);
      expect(result).toEqual([[1, 2, 3], [4, 5, 6]]);
    });

    test('UNIQUE on larger SEQUENCE', () => {
      const seq = testSEQUENCE(100);
      const result = testUNIQUE(seq);
      expect(result).toHaveLength(100);
      expect((result as number[])[0]).toBe(1);
      expect((result as number[])[99]).toBe(100);
    });
  });

  // ============================================================================
  // Error Handling
  // ============================================================================

  describe('Error Handling', () => {
    test('returns #VALUE! when array parameter is missing', () => {
      const result = testUNIQUE();
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns #VALUE! when array is not an array', () => {
      const result = testUNIQUE(42);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns #CALC! when array is empty', () => {
      const result = testUNIQUE([]);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#CALC!');
    });

    test('returns #CALC! when exactly_once results in empty array', () => {
      const result = testUNIQUE([1, 1, 2, 2], false, true);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#CALC!');
    });
  });

  // ============================================================================
  // Real-World Scenarios
  // ============================================================================

  describe('Real-World Use Cases', () => {
    test('remove duplicate customer names', () => {
      const result = testUNIQUE(['John', 'Mary', 'John', 'Alice', 'Mary', 'Bob']);
      expect(result).toEqual(['John', 'Mary', 'Alice', 'Bob']);
    });

    test('extract unique product codes', () => {
      const result = testUNIQUE([101, 102, 101, 103, 104, 102, 105]);
      expect(result).toEqual([101, 102, 103, 104, 105]);
    });

    test('find customers with unique orders (exactly_once)', () => {
      const result = testUNIQUE(['Order123', 'Order456', 'Order123', 'Order789'], false, true);
      expect(result).toEqual(['Order456', 'Order789']);
    });

    test('deduplicate contact records', () => {
      const result = testUNIQUE([['John', 'Doe'], ['Jane', 'Smith'], ['John', 'Doe'], ['Bob', 'Jones']]);
      expect(result).toEqual([['John', 'Doe'], ['Jane', 'Smith'], ['Bob', 'Jones']]);
    });

    test('extract unique regions from sales data', () => {
      const result = testUNIQUE(['North', 'South', 'East', 'West', 'North', 'East']);
      expect(result).toEqual(['North', 'South', 'East', 'West']);
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    test('handles null values in array', () => {
      const result = testUNIQUE([1, null, 2, null, 3]);
      expect(result).toEqual([1, null, 2, 3]);
    });

    test('handles zeros and negative numbers', () => {
      const result = testUNIQUE([0, -1, 0, 1, -1, 2]);
      expect(result).toEqual([0, -1, 1, 2]);
    });

    test('handles empty strings', () => {
      const result = testUNIQUE(['', 'A', '', 'B']);
      expect(result).toEqual(['', 'A', 'B']);
    });

    test('handles case sensitivity in strings', () => {
      const result = testUNIQUE(['apple', 'Apple', 'APPLE', 'banana']);
      expect(result).toEqual(['apple', 'Apple', 'APPLE', 'banana']);
    });

    test('handles large 1D arrays', () => {
      // Generate array [1,2,3,...,100,1,2,3,...,100] and expect [1,2,3,...,100]
      const inputArray = [...Array(100).keys()].map(i => i + 1);
      const duplicatedArray = [...inputArray, ...inputArray];
      
      const result = testUNIQUE(duplicatedArray);
      expect(result).toHaveLength(100);
      expect((result as number[])[0]).toBe(1);
      expect((result as number[])[99]).toBe(100);
    });
  });

  // ============================================================================
  // Performance Tests
  // ============================================================================

  describe('Performance', () => {
    test('handles 1000-item array efficiently', () => {
      const start = performance.now();
      
      // Create array with many duplicates [1,2,3,...,100] repeated 10 times
      const inputArray = Array(1000).fill(0).map((_, i) => (i % 100) + 1);
      
      const result = testUNIQUE(inputArray);
      const end = performance.now();
      
      expect(result).toHaveLength(100);
      expect(end - start).toBeLessThan(50); // Should complete in < 50ms
    });

    test('handles large 2D array efficiently', () => {
      const start = performance.now();
      
      // Create 100x3 array with duplicate rows
      const rows: number[][] = [];
      for (let i = 0; i < 100; i++) {
        rows.push([i % 20, i % 20, i % 20]); // Only 20 unique rows
      }
      
      const result = testUNIQUE(rows);
      const end = performance.now();
      
      expect(Array.isArray(result) && Array.isArray(result[0])).toBe(true);
      expect((result as FormulaValue[][]).length).toBe(20);
      expect(end - start).toBeLessThan(100); // Should complete in < 100ms
    });

    test('exactly_once mode handles large arrays', () => {
      const start = performance.now();
      
      // Array where only a few values appear once
      // Values 0-9 appear once, values 10+ appear multiple times
      const inputArray = Array(500).fill(0).map((_, i) => {
        if (i < 10) return i; // First 10 indices have unique values 0-9
        return 10 + Math.floor((i - 10) / 2); // Remaining have duplicates
      });
      
      const result = testUNIQUE(inputArray, false, true);
      const end = performance.now();
      
      // First 10 values (0-9) appear once
      expect((result as number[]).length).toBeGreaterThanOrEqual(5);
      expect(end - start).toBeLessThan(100); // Two-pass should still be fast
    });
  });
});
