/**
 * Tests for FILTER function - Filter array based on boolean conditions (Excel 365)
 * 
 * FILTER is a dynamic array function that filters arrays based on boolean conditions.
 * Returns only rows/columns where the include array is TRUE.
 * 
 * Syntax: FILTER(array, include, [if_empty])
 * 
 * Parameters:
 * - array: The array or range to filter (required)
 * - include: Boolean array indicating which rows to include (required)
 * - if_empty: Value to return if no rows match (optional, default: #CALC!)
 * 
 * Returns:
 * - Filtered array with only matching rows
 * - if_empty value if no matches
 * - #CALC! if no matches and if_empty not specified
 * - #VALUE! if parameters invalid or sizes don't match
 */

import { FormulaEngine } from '../src/FormulaEngine';
import type { FormulaValue } from '../src/FormulaEngine';
import { Worksheet } from '../src/worksheet';

describe('FormulaEngine - FILTER Function', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Test', 100, 26);
  });

  // Helper to directly test FILTER function
  const testFILTER = (...args: any[]) => {
    const filterFunc = (engine as any).functions.get('FILTER');
    return filterFunc(...args);
  };

  // ============================================================================
  // Basic 1D Array Filtering
  // ============================================================================

  describe('1D Array Filtering', () => {
    test('filters numbers by boolean array', () => {
      const data = [1, 2, 3, 4, 5];
      const include = [true, false, true, false, true];
      const result = testFILTER(data, include);
      expect(result).toEqual([1, 3, 5]);
    });

    test('filters strings by boolean array', () => {
      const data = ['A', 'B', 'C', 'D'];
      const include = [false, true, true, false];
      const result = testFILTER(data, include);
      expect(result).toEqual(['B', 'C']);
    });

    test('filters with all TRUE (returns all)', () => {
      const data = [10, 20, 30];
      const include = [true, true, true];
      const result = testFILTER(data, include);
      expect(result).toEqual([10, 20, 30]);
    });

    test('filters with all FALSE (returns empty)', () => {
      const data = [10, 20, 30];
      const include = [false, false, false];
      const result = testFILTER(data, include);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#CALC!');
    });

    test('filters with numeric 1 and 0 (TRUE/FALSE)', () => {
      const data = ['A', 'B', 'C', 'D'];
      const include = [1, 0, 1, 0];
      const result = testFILTER(data, include);
      expect(result).toEqual(['A', 'C']);
    });

    test('filters with non-zero numbers as TRUE', () => {
      const data = [10, 20, 30, 40];
      const include = [5, 0, -3, 0]; // Non-zero is TRUE
      const result = testFILTER(data, include);
      expect(result).toEqual([10, 30]);
    });

    test('filters single matching element', () => {
      const data = [100, 200, 300];
      const include = [false, true, false];
      const result = testFILTER(data, include);
      expect(result).toEqual([200]);
    });

    test('filters mixed types', () => {
      const data = [1, 'A', true, null, 5];
      const include = [true, false, true, true, false];
      const result = testFILTER(data, include);
      expect(result).toEqual([1, true, null]);
    });
  });

  // ============================================================================
  // 2D Array Filtering (Rows)
  // ============================================================================

  describe('2D Array Filtering', () => {
    test('filters rows by boolean array', () => {
      const data = [['A', 1], ['B', 2], ['C', 3], ['D', 4]];
      const include = [true, false, true, false];
      const result = testFILTER(data, include);
      expect(result).toEqual([['A', 1], ['C', 3]]);
    });

    test('filters table with all rows matching', () => {
      const data = [['Row1', 10], ['Row2', 20], ['Row3', 30]];
      const include = [true, true, true];
      const result = testFILTER(data, include);
      expect(result).toEqual([['Row1', 10], ['Row2', 20], ['Row3', 30]]);
    });

    test('filters table with single row matching', () => {
      const data = [['A', 1], ['B', 2], ['C', 3]];
      const include = [false, true, false];
      const result = testFILTER(data, include);
      expect(result).toEqual([['B', 2]]);
    });

    test('filters larger 2D array', () => {
      const data = [
        ['Alice', 'Sales', 75000],
        ['Bob', 'IT', 85000],
        ['Charlie', 'Sales', 70000],
        ['Diana', 'IT', 90000],
        ['Eve', 'Marketing', 65000]
      ];
      const include = [true, false, true, false, true];
      const result = testFILTER(data, include);
      expect(result).toEqual([
        ['Alice', 'Sales', 75000],
        ['Charlie', 'Sales', 70000],
        ['Eve', 'Marketing', 65000]
      ]);
    });

    test('filters with numeric boolean values', () => {
      const data = [['Row1'], ['Row2'], ['Row3'], ['Row4']];
      const include = [1, 0, 1, 0];
      const result = testFILTER(data, include);
      expect(result).toEqual([['Row1'], ['Row3']]);
    });

    test('filters rows with varying column counts', () => {
      const data = [['A', 1, 'X'], ['B', 2], ['C', 3, 'Y', 'Z']];
      const include = [true, false, true];
      const result = testFILTER(data, include);
      expect(result).toEqual([['A', 1, 'X'], ['C', 3, 'Y', 'Z']]);
    });
  });

  // ============================================================================
  // if_empty Parameter
  // ============================================================================

  describe('if_empty Parameter', () => {
    test('returns if_empty value when no rows match', () => {
      const data = [1, 2, 3];
      const include = [false, false, false];
      const result = testFILTER(data, include, 'No results');
      expect(result).toBe('No results');
    });

    test('returns if_empty number when no rows match', () => {
      const data = [1, 2, 3];
      const include = [false, false, false];
      const result = testFILTER(data, include, 0);
      expect(result).toBe(0);
    });

    test('returns if_empty array when no rows match', () => {
      const data = [[1, 2], [3, 4]];
      const include = [false, false];
      const result = testFILTER(data, include, [['Empty']]);
      expect(result).toEqual([['Empty']]);
    });

    test('returns #CALC! when no rows match and no if_empty', () => {
      const data = ['A', 'B', 'C'];
      const include = [false, false, false];
      const result = testFILTER(data, include);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#CALC!');
    });

    test('ignores if_empty when rows match', () => {
      const data = [1, 2, 3];
      const include = [true, false, false];
      const result = testFILTER(data, include, 'No results');
      expect(result).toEqual([1]);
    });

    test('returns if_empty null when specified', () => {
      const data = [10, 20, 30];
      const include = [0, 0, 0];
      const result = testFILTER(data, include, null);
      expect(result).toBe(null);
    });
  });

  // ============================================================================
  // Integration with Other Functions
  // ============================================================================

  describe('Integration with Other Functions', () => {
    const testSEQUENCE = (...args: any[]) => {
      const seqFunc = (engine as any).functions.get('SEQUENCE');
      return seqFunc(...args);
    };

    const testUNIQUE = (...args: any[]) => {
      const uniqueFunc = (engine as any).functions.get('UNIQUE');
      return uniqueFunc(...args);
    };

    const testSORT = (...args: any[]) => {
      const sortFunc = (engine as any).functions.get('SORT');
      return sortFunc(...args);
    };

    test('FILTER with SEQUENCE', () => {
      const seq = testSEQUENCE(10); // [1,2,3,4,5,6,7,8,9,10]
      const include = [true, false, true, false, true, false, true, false, true, false];
      const result = testFILTER(seq, include);
      expect(result).toEqual([1, 3, 5, 7, 9]);
    });

    test('FILTER then UNIQUE', () => {
      const data = [1, 2, 2, 3, 3, 3, 4, 4, 4, 4];
      const include = [true, true, true, true, true, true, false, false, false, false];
      const filtered = testFILTER(data, include);
      const result = testUNIQUE(filtered);
      expect(result).toEqual([1, 2, 3]);
    });

    test('FILTER then SORT', () => {
      const data = [5, 3, 8, 1, 9, 2];
      const include = [true, true, false, true, false, true];
      const filtered = testFILTER(data, include);
      const result = testSORT(filtered);
      expect(result).toEqual([1, 2, 3, 5]);
    });

    test('SORT(UNIQUE(FILTER(...))) - triple composition', () => {
      const data = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5];
      const include = [true, true, true, true, true, true, true, false, false, false, false];
      const filtered = testFILTER(data, include); // [3,1,4,1,5,9,2]
      const unique = testUNIQUE(filtered);
      const result = testSORT(unique);
      expect(result).toEqual([1, 2, 3, 4, 5, 9]);
    });

    test('FILTER 2D array then SORT', () => {
      const data = [['C', 3], ['A', 1], ['D', 4], ['B', 2]];
      const include = [true, true, false, true];
      const filtered = testFILTER(data, include);
      const result = testSORT(filtered as FormulaValue[][], 1);
      expect(result).toEqual([['A', 1], ['B', 2], ['C', 3]]);
    });

    test('FILTER with SEQUENCE as boolean condition (>5)', () => {
      const seq = testSEQUENCE(10);
      // Manually create include array for >5
      const include = (seq as number[]).map(n => n > 5);
      const result = testFILTER(seq, include);
      expect(result).toEqual([6, 7, 8, 9, 10]);
    });
  });

  // ============================================================================
  // Real-World Scenarios
  // ============================================================================

  describe('Real-World Use Cases', () => {
    test('filters employees by high salary (>80k)', () => {
      const employees = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];
      const salaries = [75000, 85000, 70000, 90000, 65000];
      const include = salaries.map(s => s > 80000);
      const result = testFILTER(employees, include);
      expect(result).toEqual(['Bob', 'Diana']);
    });

    test('filters products in stock', () => {
      const products = ['Widget', 'Gadget', 'Doohickey', 'Thingamajig'];
      const inStock = [true, false, true, true];
      const result = testFILTER(products, inStock);
      expect(result).toEqual(['Widget', 'Doohickey', 'Thingamajig']);
    });

    test('filters passing students (score >=70)', () => {
      const students = ['John', 'Alice', 'Bob', 'Charlie', 'Diana'];
      const scores = [85, 92, 65, 78, 95];
      const include = scores.map(s => s >= 70);
      const result = testFILTER(students, include);
      expect(result).toEqual(['John', 'Alice', 'Charlie', 'Diana']);
    });

    test('filters sales records by region (West)', () => {
      const records = [
        ['Q1', 'West', 50000],
        ['Q1', 'East', 75000],
        ['Q1', 'West', 60000],
        ['Q1', 'North', 55000]
      ];
      const regions = ['West', 'East', 'West', 'North'];
      const include = regions.map(r => r === 'West');
      const result = testFILTER(records, include);
      expect(result).toEqual([
        ['Q1', 'West', 50000],
        ['Q1', 'West', 60000]
      ]);
    });

    test('filters active customers with empty message', () => {
      const customers = ['Acme', 'TechCo', 'GlobalInc', 'StartupXYZ'];
      const active = [true, false, false, true];
      const result = testFILTER(customers, active);
      expect(result).toEqual(['Acme', 'StartupXYZ']);
    });

    test('filters orders above threshold with if_empty', () => {
      const orders = [100, 50, 75, 25];
      const include = orders.map(o => o >= 100);
      const result = testFILTER(orders, include, 'No large orders');
      expect(result).toEqual([100]);
    });

    test('filters inventory by multiple criteria (AND logic)', () => {
      const items = ['A', 'B', 'C', 'D', 'E'];
      const prices = [10, 25, 15, 30, 20];
      const inStock = [true, true, false, true, true];
      // Price >= 20 AND in stock
      const include = prices.map((p, i) => p >= 20 && inStock[i]);
      const result = testFILTER(items, include);
      expect(result).toEqual(['B', 'D', 'E']);
    });

    test('filters sales by region OR revenue (OR logic)', () => {
      const salesReps = ['Alice', 'Bob', 'Charlie', 'Diana'];
      const regions = ['West', 'East', 'West', 'North'];
      const revenues = [50000, 60000, 45000, 75000];
      // West region OR revenue > 60k
      const include = regions.map((r, i) => r === 'West' || revenues[i] > 60000);
      const result = testFILTER(salesReps, include);
      expect(result).toEqual(['Alice', 'Charlie', 'Diana']);
    });
  });

  // ============================================================================
  // Error Handling
  // ============================================================================

  describe('Error Handling', () => {
    test('returns #VALUE! when array parameter is missing', () => {
      const result = testFILTER();
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns #VALUE! when include parameter is missing', () => {
      const result = testFILTER([1, 2, 3]);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns #VALUE! when array is not an array', () => {
      const result = testFILTER(42, [true, false]);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns #VALUE! when array is empty', () => {
      const result = testFILTER([], []);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns #VALUE! when include is not an array', () => {
      const result = testFILTER([1, 2, 3], true);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns #VALUE! when include is empty', () => {
      const result = testFILTER([1, 2, 3], []);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns #VALUE! when array and include have different lengths', () => {
      const result = testFILTER([1, 2, 3], [true, false]);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns #VALUE! when 2D array and include length mismatch', () => {
      const result = testFILTER([[1, 2], [3, 4], [5, 6]], [true, false]);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    test('handles single element array', () => {
      const result = testFILTER([42], [true]);
      expect(result).toEqual([42]);
    });

    test('handles single element filtered out', () => {
      const result = testFILTER([42], [false], 'Empty');
      expect(result).toBe('Empty');
    });

    test('handles null values in data', () => {
      const data = [1, null, 3, null, 5];
      const include = [true, true, false, true, false];
      const result = testFILTER(data, include);
      expect(result).toEqual([1, null, null]);
    });

    test('handles boolean values in data', () => {
      const data = [true, false, true, false];
      const include = [true, true, false, false];
      const result = testFILTER(data, include);
      expect(result).toEqual([true, false]);
    });

    test('handles empty strings in data', () => {
      const data = ['', 'A', '', 'B'];
      const include = [true, false, true, true];
      const result = testFILTER(data, include);
      expect(result).toEqual(['', '', 'B']);
    });

    test('handles negative numbers in data', () => {
      const data = [-5, -3, 0, 2, 5];
      const include = [true, false, true, false, true];
      const result = testFILTER(data, include);
      expect(result).toEqual([-5, 0, 5]);
    });

    test('handles decimal numbers in data', () => {
      const data = [3.14, 2.71, 1.41, 1.73];
      const include = [false, true, true, false];
      const result = testFILTER(data, include);
      expect(result).toEqual([2.71, 1.41]);
    });
  });

  // ============================================================================
  // Performance Tests
  // ============================================================================

  describe('Performance', () => {
    test('filters 1000-item array efficiently', () => {
      const start = performance.now();
      
      const data = Array(1000).fill(0).map((_, i) => i);
      const include = data.map(n => n % 2 === 0); // Even numbers
      
      const result = testFILTER(data, include);
      const end = performance.now();
      
      expect(result).toHaveLength(500);
      expect(end - start).toBeLessThan(50);
    });

    test('filters 100x5 2D array efficiently', () => {
      const start = performance.now();
      
      const data: number[][] = [];
      for (let i = 0; i < 100; i++) {
        data.push([i, i * 2, i * 3, i * 4, i * 5]);
      }
      const include = data.map((_, i) => i % 3 === 0);
      
      const result = testFILTER(data, include);
      const end = performance.now();
      
      expect(Array.isArray(result) && Array.isArray(result[0])).toBe(true);
      expect((result as number[][]).length).toBe(34); // ~100/3
      expect(end - start).toBeLessThan(100);
    });

    test('filters with mostly FALSE values efficiently', () => {
      const start = performance.now();
      
      const data = Array(1000).fill(0).map((_, i) => i);
      const include = data.map(n => n < 10); // Only first 10
      
      const result = testFILTER(data, include);
      const end = performance.now();
      
      expect(result).toHaveLength(10);
      expect(end - start).toBeLessThan(50);
    });

    test('filters with all TRUE values efficiently', () => {
      const start = performance.now();
      
      const data = Array(1000).fill(0).map((_, i) => i);
      const include = Array(1000).fill(true);
      
      const result = testFILTER(data, include);
      const end = performance.now();
      
      expect(result).toHaveLength(1000);
      expect(end - start).toBeLessThan(50);
    });
  });
});
