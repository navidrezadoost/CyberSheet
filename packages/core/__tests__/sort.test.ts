/**
 * Tests for SORT function - Sort array in ascending or descending order (Excel 365)
 * 
 * SORT is a dynamic array function that sorts arrays or ranges.
 * Uses stable sort algorithm to preserve relative order of equal items.
 * 
 * Syntax: SORT(array, [sort_index], [sort_order], [by_col])
 * 
 * Parameters:
 * - array: The array or range to sort (required)
 * - sort_index: Number indicating which row or column to sort by (default: 1)
 * - sort_order: Sort order - 1 for ascending (default), -1 for descending
 * - by_col: Logical - FALSE/0 to sort by row (default), TRUE/1 to sort by column
 * 
 * Returns:
 * - Sorted array with same dimensions as input
 * - #VALUE! if parameters are invalid
 * - #CALC! if array is empty
 */

import { FormulaEngine } from '../src/FormulaEngine';
import type { FormulaValue } from '../src/FormulaEngine';
import { Worksheet } from '../src/worksheet';

describe('FormulaEngine - SORT Function', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Test', 100, 26);
  });

  // Helper to directly test SORT function
  const testSORT = (...args: any[]) => {
    const sortFunc = (engine as any).functions.get('SORT');
    return sortFunc(...args);
  };

  // ============================================================================
  // 1D Array Tests - Basic Sorting
  // ============================================================================

  describe('1D Arrays - Basic Sorting', () => {
    test('sorts numbers in ascending order (default)', () => {
      const result = testSORT([3, 1, 4, 1, 5, 9, 2, 6]);
      expect(result).toEqual([1, 1, 2, 3, 4, 5, 6, 9]);
    });

    test('sorts numbers in descending order', () => {
      const result = testSORT([3, 1, 4, 1, 5, 9, 2, 6], 1, -1);
      expect(result).toEqual([9, 6, 5, 4, 3, 2, 1, 1]);
    });

    test('sorts strings alphabetically', () => {
      const result = testSORT(['banana', 'apple', 'cherry', 'date']);
      expect(result).toEqual(['apple', 'banana', 'cherry', 'date']);
    });

    test('sorts strings in descending order', () => {
      const result = testSORT(['banana', 'apple', 'cherry', 'date'], 1, -1);
      expect(result).toEqual(['date', 'cherry', 'banana', 'apple']);
    });

    test('sorts booleans', () => {
      const result = testSORT([true, false, true, false]);
      expect(result).toEqual([false, false, true, true]);
    });

    test('handles already sorted array', () => {
      const result = testSORT([1, 2, 3, 4, 5]);
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    test('handles reverse sorted array', () => {
      const result = testSORT([5, 4, 3, 2, 1]);
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    test('handles single element array', () => {
      const result = testSORT([42]);
      expect(result).toEqual([42]);
    });

    test('handles array with duplicate values', () => {
      const result = testSORT([3, 3, 3, 1, 1, 2, 2]);
      expect(result).toEqual([1, 1, 2, 2, 3, 3, 3]);
    });

    test('preserves stable sort for equal values', () => {
      // When values are equal, original order should be preserved
      const result = testSORT([5, 5, 5]);
      expect(result).toEqual([5, 5, 5]);
    });
  });

  // ============================================================================
  // 2D Array Tests - Sort by Column (Default)
  // ============================================================================

  describe('2D Arrays - Sort by Column', () => {
    test('sorts rows by first column (default)', () => {
      const result = testSORT([[3, 'C'], [1, 'A'], [2, 'B']]);
      expect(result).toEqual([[1, 'A'], [2, 'B'], [3, 'C']]);
    });

    test('sorts rows by first column descending', () => {
      const result = testSORT([[3, 'C'], [1, 'A'], [2, 'B']], 1, -1);
      expect(result).toEqual([[3, 'C'], [2, 'B'], [1, 'A']]);
    });

    test('sorts rows by second column', () => {
      const result = testSORT([[3, 'C'], [1, 'A'], [2, 'B']], 2);
      expect(result).toEqual([[1, 'A'], [2, 'B'], [3, 'C']]);
    });

    test('sorts rows by second column descending', () => {
      const result = testSORT([[3, 'C'], [1, 'A'], [2, 'B']], 2, -1);
      expect(result).toEqual([[3, 'C'], [2, 'B'], [1, 'A']]);
    });

    test('sorts rows by third column', () => {
      const result = testSORT([[100, 'Z', 3], [200, 'Y', 1], [300, 'X', 2]], 3);
      expect(result).toEqual([[200, 'Y', 1], [300, 'X', 2], [100, 'Z', 3]]);
    });

    test('sorts with mixed types in column', () => {
      const result = testSORT([[1, 'A'], [3, 'C'], [2, 'B']]);
      expect(result).toEqual([[1, 'A'], [2, 'B'], [3, 'C']]);
    });

    test('preserves stable sort for equal row values', () => {
      // Rows with equal sort key should maintain original order
      const result = testSORT([[1, 'First'], [1, 'Second'], [1, 'Third']], 1);
      expect(result).toEqual([[1, 'First'], [1, 'Second'], [1, 'Third']]);
    });

    test('sorts larger 2D array', () => {
      const input = [
        [5, 'E'], [2, 'B'], [4, 'D'], [1, 'A'], [3, 'C']
      ];
      const result = testSORT(input);
      expect(result).toEqual([
        [1, 'A'], [2, 'B'], [3, 'C'], [4, 'D'], [5, 'E']
      ]);
    });
  });

  // ============================================================================
  // by_col Parameter Tests - Sort by Row
  // ============================================================================

  describe('by_col Parameter - Sort by Row', () => {
    test('sorts columns by first row when by_col=TRUE', () => {
      const result = testSORT([[3, 1, 2], ['C', 'A', 'B']], 1, 1, true);
      expect(result).toEqual([[1, 2, 3], ['A', 'B', 'C']]);
    });

    test('sorts columns by first row descending when by_col=TRUE', () => {
      const result = testSORT([[3, 1, 2], ['C', 'A', 'B']], 1, -1, true);
      expect(result).toEqual([[3, 2, 1], ['C', 'B', 'A']]);
    });

    test('sorts columns by second row when by_col=TRUE', () => {
      const result = testSORT([[100, 200, 300], ['C', 'A', 'B']], 2, 1, true);
      expect(result).toEqual([[200, 300, 100], ['A', 'B', 'C']]);
    });

    test('sorts columns by second row descending', () => {
      const result = testSORT([[100, 200, 300], ['C', 'A', 'B']], 2, -1, true);
      expect(result).toEqual([[100, 300, 200], ['C', 'B', 'A']]);
    });

    test('handles by_col=1 (numeric TRUE)', () => {
      const result = testSORT([[3, 1, 2], ['C', 'A', 'B']], 1, 1, 1);
      expect(result).toEqual([[1, 2, 3], ['A', 'B', 'C']]);
    });

    test('handles by_col=FALSE (default behavior)', () => {
      const result = testSORT([[3, 'C'], [1, 'A'], [2, 'B']], 1, 1, false);
      expect(result).toEqual([[1, 'A'], [2, 'B'], [3, 'C']]);
    });

    test('handles by_col=0 (numeric FALSE)', () => {
      const result = testSORT([[3, 'C'], [1, 'A'], [2, 'B']], 1, 1, 0);
      expect(result).toEqual([[1, 'A'], [2, 'B'], [3, 'C']]);
    });
  });

  // ============================================================================
  // Integration Tests with SEQUENCE
  // ============================================================================

  describe('Integration with SEQUENCE', () => {
    const testSEQUENCE = (...args: any[]) => {
      const seqFunc = (engine as any).functions.get('SEQUENCE');
      return seqFunc(...args);
    };

    test('sorts SEQUENCE in descending order', () => {
      const seq = testSEQUENCE(5);
      const result = testSORT(seq, 1, -1);
      expect(result).toEqual([5, 4, 3, 2, 1]);
    });

    test('sorts 2D SEQUENCE by second column', () => {
      const seq = testSEQUENCE(3, 2); // [[1,2],[3,4],[5,6]]
      const result = testSORT(seq, 2, -1);
      expect(result).toEqual([[5, 6], [3, 4], [1, 2]]);
    });

    test('SEQUENCE already sorted ascending', () => {
      const seq = testSEQUENCE(10);
      const result = testSORT(seq);
      expect(result).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });
  });

  // ============================================================================
  // Integration Tests with UNIQUE
  // ============================================================================

  describe('Integration with UNIQUE', () => {
    const testUNIQUE = (...args: any[]) => {
      const uniqueFunc = (engine as any).functions.get('UNIQUE');
      return uniqueFunc(...args);
    };

    const testSEQUENCE = (...args: any[]) => {
      const seqFunc = (engine as any).functions.get('SEQUENCE');
      return seqFunc(...args);
    };

    test('SORT(UNIQUE(...)) removes duplicates and sorts', () => {
      const unique = testUNIQUE([3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5]);
      const result = testSORT(unique);
      expect(result).toEqual([1, 2, 3, 4, 5, 6, 9]);
    });

    test('UNIQUE(SORT(...)) sorts then removes duplicates', () => {
      const sorted = testSORT([3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5]);
      const result = testUNIQUE(sorted);
      expect(result).toEqual([1, 2, 3, 4, 5, 6, 9]);
    });

    test('SORT(UNIQUE(SEQUENCE(...))) is idempotent', () => {
      const seq = testSEQUENCE(10);
      const unique = testUNIQUE(seq);
      const result = testSORT(unique);
      expect(result).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    test('sorts unique 2D rows', () => {
      const unique = testUNIQUE([[3, 'C'], [1, 'A'], [3, 'C'], [2, 'B']]);
      const result = testSORT(unique);
      expect(result).toEqual([[1, 'A'], [2, 'B'], [3, 'C']]);
    });
  });

  // ============================================================================
  // Error Handling
  // ============================================================================

  describe('Error Handling', () => {
    test('returns #VALUE! when array parameter is missing', () => {
      const result = testSORT();
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns #VALUE! when array is not an array', () => {
      const result = testSORT(42);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns #CALC! when array is empty', () => {
      const result = testSORT([]);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#CALC!');
    });

    test('returns #VALUE! when sort_index is out of range for 2D array', () => {
      const result = testSORT([[1, 2], [3, 4]], 5);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns #VALUE! when sort_index < 1 for 2D array', () => {
      const result = testSORT([[1, 2], [3, 4]], 0);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns #VALUE! when sort_index != 1 for 1D array', () => {
      const result = testSORT([1, 2, 3], 2);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns #VALUE! when by_col sort_index out of range', () => {
      const result = testSORT([[1, 2], [3, 4]], 5, 1, true);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    test('handles null values (sorts to end)', () => {
      const result = testSORT([3, null, 1, null, 2]);
      expect(result).toEqual([1, 2, 3, null, null]);
    });

    test('handles null in descending sort', () => {
      const result = testSORT([3, null, 1, null, 2], 1, -1);
      expect(result).toEqual([null, null, 3, 2, 1]);
    });

    test('handles negative numbers', () => {
      const result = testSORT([3, -1, 0, -5, 2]);
      expect(result).toEqual([-5, -1, 0, 2, 3]);
    });

    test('handles decimal numbers', () => {
      const result = testSORT([3.14, 2.71, 1.41, 2.5]);
      expect(result).toEqual([1.41, 2.5, 2.71, 3.14]);
    });

    test('handles empty strings', () => {
      const result = testSORT(['', 'A', '', 'B']);
      expect(result).toEqual(['', '', 'A', 'B']);
    });

    test('handles case-sensitive string sorting', () => {
      const result = testSORT(['apple', 'Apple', 'APPLE', 'banana']);
      // localeCompare handles case sensitivity
      expect(result).toHaveLength(4);
      expect(result[3]).toBe('banana');
    });

    test('handles mixed types in 1D array', () => {
      const result = testSORT([3, 'apple', 1, 'banana', 2]);
      expect(result).toHaveLength(5);
    });

    test('handles 2D array with varying row lengths', () => {
      const result = testSORT([[3, 'C', 'X'], [1, 'A'], [2, 'B', 'Y', 'Z']]);
      expect((result as FormulaValue[][])[0][0]).toBe(1);
      expect((result as FormulaValue[][])[1][0]).toBe(2);
      expect((result as FormulaValue[][])[2][0]).toBe(3);
    });
  });

  // ============================================================================
  // Real-World Scenarios
  // ============================================================================

  describe('Real-World Use Cases', () => {
    test('sorts employee data by salary', () => {
      const employees = [
        ['Alice', 75000],
        ['Bob', 85000],
        ['Charlie', 65000],
        ['Diana', 95000]
      ];
      const result = testSORT(employees, 2, -1); // Sort by salary descending
      expect(result).toEqual([
        ['Diana', 95000],
        ['Bob', 85000],
        ['Alice', 75000],
        ['Charlie', 65000]
      ]);
    });

    test('sorts product inventory by quantity', () => {
      const inventory = [
        ['Widget', 50],
        ['Gadget', 150],
        ['Doohickey', 25],
        ['Thingamajig', 100]
      ];
      const result = testSORT(inventory, 2);
      expect(result).toEqual([
        ['Doohickey', 25],
        ['Widget', 50],
        ['Thingamajig', 100],
        ['Gadget', 150]
      ]);
    });

    test('sorts sales data by region name', () => {
      const sales = [
        ['West', 50000],
        ['East', 75000],
        ['North', 60000],
        ['South', 55000]
      ];
      const result = testSORT(sales, 1);
      expect(result).toEqual([
        ['East', 75000],
        ['North', 60000],
        ['South', 55000],
        ['West', 50000]
      ]);
    });

    test('sorts test scores in descending order', () => {
      const scores = [85, 92, 78, 95, 88, 90];
      const result = testSORT(scores, 1, -1);
      expect(result).toEqual([95, 92, 90, 88, 85, 78]);
    });

    test('sorts dates (as numbers) chronologically', () => {
      // Dates as timestamps
      const dates = [20230315, 20230101, 20231225, 20230701];
      const result = testSORT(dates);
      expect(result).toEqual([20230101, 20230315, 20230701, 20231225]);
    });
  });

  // ============================================================================
  // Performance Tests
  // ============================================================================

  describe('Performance', () => {
    test('sorts 1000 random numbers efficiently', () => {
      const start = performance.now();
      
      const randomArray = Array(1000).fill(0).map(() => Math.random() * 1000);
      const result = testSORT(randomArray);
      
      const end = performance.now();
      
      expect(result).toHaveLength(1000);
      expect((result as number[])[0]).toBeLessThanOrEqual((result as number[])[1]);
      expect(end - start).toBeLessThan(50); // Should complete in < 50ms
    });

    test('sorts 100x3 2D array efficiently', () => {
      const start = performance.now();
      
      const rows: number[][] = [];
      for (let i = 0; i < 100; i++) {
        rows.push([Math.random() * 100, Math.random() * 100, Math.random() * 100]);
      }
      
      const result = testSORT(rows);
      const end = performance.now();
      
      expect(Array.isArray(result) && Array.isArray(result[0])).toBe(true);
      expect((result as FormulaValue[][]).length).toBe(100);
      expect(end - start).toBeLessThan(100); // Should complete in < 100ms
    });

    test('stable sort maintains order for equal values', () => {
      // Create array where many values are equal
      const input = Array(500).fill(0).map((_, i) => [Math.floor(i / 50), i]);
      
      const result = testSORT(input, 1);
      
      // Check that for equal first column values, original order is preserved
      let prevFirst = -1;
      let prevSecond = -1;
      for (const row of result as number[][]) {
        if (row[0] === prevFirst) {
          expect(row[1]).toBeGreaterThan(prevSecond);
        }
        prevFirst = row[0];
        prevSecond = row[1];
      }
    });

    test('sorts already sorted array quickly', () => {
      const start = performance.now();
      
      const sorted = Array(1000).fill(0).map((_, i) => i);
      const result = testSORT(sorted);
      
      const end = performance.now();
      
      expect(result).toEqual(sorted);
      expect(end - start).toBeLessThan(50);
    });

    test('sorts reverse sorted array efficiently', () => {
      const start = performance.now();
      
      const reverse = Array(1000).fill(0).map((_, i) => 1000 - i);
      const result = testSORT(reverse);
      
      const end = performance.now();
      
      expect((result as number[])[0]).toBe(1);
      expect((result as number[])[999]).toBe(1000);
      expect(end - start).toBeLessThan(50);
    });
  });
});
