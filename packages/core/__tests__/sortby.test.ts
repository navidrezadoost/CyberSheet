/**
 * Tests for SORTBY function - Sort array based on values in another array (Excel 365)
 * 
 * SORTBY is a dynamic array function that sorts one array based on the values in other arrays.
 * Supports multi-key sorting with different sort orders for each key.
 * Uses stable sort algorithm to preserve relative order of equal items.
 * 
 * Syntax: SORTBY(array, by_array1, [sort_order1], [by_array2], [sort_order2], ...)
 * 
 * Parameters:
 * - array: The array or range to sort (required)
 * - by_array1: The array to sort by (required)
 * - sort_order1: Sort order - 1 for ascending (default), -1 for descending
 * - by_array2, sort_order2, ...: Additional sort keys (optional)
 * 
 * Returns:
 * - Sorted array with same dimensions as input
 * - #VALUE! if parameters are invalid or array sizes don't match
 */

import { FormulaEngine } from '../src/FormulaEngine';
import type { FormulaValue } from '../src/FormulaEngine';
import { Worksheet } from '../src/worksheet';

describe('FormulaEngine - SORTBY Function', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Test', 100, 26);
  });

  // Helper to directly test SORTBY function
  const testSORTBY = (...args: any[]) => {
    const sortByFunc = (engine as any).functions.get('SORTBY');
    return sortByFunc(...args);
  };

  // ============================================================================
  // Basic Single-Key Sorting
  // ============================================================================

  describe('Single-Key Sorting', () => {
    test('sorts 1D array by another 1D array', () => {
      const data = ['A', 'B', 'C'];
      const sortBy = [3, 1, 2];
      const result = testSORTBY(data, sortBy);
      expect(result).toEqual(['B', 'C', 'A']);
    });

    test('sorts 1D array in descending order', () => {
      const data = ['A', 'B', 'C'];
      const sortBy = [3, 1, 2];
      const result = testSORTBY(data, sortBy, -1);
      expect(result).toEqual(['A', 'C', 'B']);
    });

    test('sorts 2D array by external 1D array', () => {
      const data = [['A', 10], ['B', 30], ['C', 20]];
      const sortBy = [3, 1, 2];
      const result = testSORTBY(data, sortBy);
      expect(result).toEqual([['B', 30], ['C', 20], ['A', 10]]);
    });

    test('sorts employee names by salary', () => {
      const names = ['Alice', 'Bob', 'Charlie', 'Diana'];
      const salaries = [75000, 85000, 65000, 95000];
      const result = testSORTBY(names, salaries, -1);
      expect(result).toEqual(['Diana', 'Bob', 'Alice', 'Charlie']);
    });

    test('sorts products by stock quantity', () => {
      const products = ['Widget', 'Gadget', 'Doohickey'];
      const stock = [50, 150, 25];
      const result = testSORTBY(products, stock);
      expect(result).toEqual(['Doohickey', 'Widget', 'Gadget']);
    });

    test('sorts with numeric sort array', () => {
      const letters = ['D', 'A', 'C', 'B'];
      const numbers = [4, 1, 3, 2];
      const result = testSORTBY(letters, numbers);
      expect(result).toEqual(['A', 'B', 'C', 'D']);
    });

    test('sorts with string sort array', () => {
      const numbers = [4, 1, 3, 2];
      const letters = ['D', 'A', 'C', 'B'];
      const result = testSORTBY(numbers, letters);
      expect(result).toEqual([1, 2, 3, 4]);
    });
  });

  // ============================================================================
  // Multi-Key Sorting
  // ============================================================================

  describe('Multi-Key Sorting', () => {
    test('sorts by two keys (both ascending)', () => {
      const data = ['A', 'B', 'C', 'D'];
      const key1 = [2, 1, 2, 1]; // Primary sort
      const key2 = ['Z', 'Y', 'X', 'W']; // Secondary sort
      const result = testSORTBY(data, key1, 1, key2, 1);
      // key1: 1,1,2,2 → indices 1,3,0,2
      // Within key1=1: key2 Y,W → W,Y → D,B
      // Within key1=2: key2 Z,X → X,Z → C,A
      expect(result).toEqual(['D', 'B', 'C', 'A']);
    });

    test('sorts by two keys (first ascending, second descending)', () => {
      const data = ['A', 'B', 'C', 'D'];
      const key1 = [2, 1, 2, 1];
      const key2 = ['Z', 'Y', 'X', 'W'];
      const result = testSORTBY(data, key1, 1, key2, -1);
      // key1: 1,1,2,2 → indices 1,3,0,2
      // Within key1=1: key2 Y,W desc → Y,W → B,D
      // Within key1=2: key2 Z,X desc → Z,X → A,C
      expect(result).toEqual(['B', 'D', 'A', 'C']);
    });

    test('sorts by three keys', () => {
      const data = ['A', 'B', 'C', 'D', 'E', 'F'];
      const key1 = [1, 2, 1, 2, 1, 2];
      const key2 = [10, 20, 10, 10, 20, 10];
      const key3 = ['X', 'Y', 'Z', 'W', 'V', 'U'];
      const result = testSORTBY(data, key1, 1, key2, 1, key3, 1);
      // Complex multi-key sort
      expect(result).toHaveLength(6);
      expect(result[0]).toBe('A'); // 1,10,X
    });

    test('sorts employee data by department then salary', () => {
      const employees = ['Alice', 'Bob', 'Charlie', 'Diana'];
      const departments = ['Sales', 'IT', 'Sales', 'IT'];
      const salaries = [75000, 85000, 70000, 90000];
      const result = testSORTBY(employees, departments, 1, salaries, -1);
      // IT: Diana (90k), Bob (85k)
      // Sales: Alice (75k), Charlie (70k)
      expect(result).toEqual(['Diana', 'Bob', 'Alice', 'Charlie']);
    });

    test('sorts with default ascending on second key', () => {
      const data = ['A', 'B', 'C'];
      const key1 = [1, 1, 2];
      const key2 = [30, 10, 20];
      // Second key defaults to ascending (1)
      const result = testSORTBY(data, key1, 1, key2);
      expect(result).toEqual(['B', 'A', 'C']);
    });
  });

  // ============================================================================
  // 2D Array Sorting
  // ============================================================================

  describe('2D Array Sorting', () => {
    test('sorts 2D array rows by external array', () => {
      const data = [
        ['Alice', 'Sales', 75000],
        ['Bob', 'IT', 85000],
        ['Charlie', 'Sales', 70000]
      ];
      const priority = [2, 1, 3];
      const result = testSORTBY(data, priority);
      expect(result).toEqual([
        ['Bob', 'IT', 85000],
        ['Alice', 'Sales', 75000],
        ['Charlie', 'Sales', 70000]
      ]);
    });

    test('sorts 2D array with multi-key external arrays', () => {
      const data = [
        ['Product A', 100],
        ['Product B', 200],
        ['Product C', 150]
      ];
      const category = [2, 1, 2];
      const sales = [100, 200, 150];
      const result = testSORTBY(data, category, 1, sales, -1);
      // Category 1: Product B (200)
      // Category 2: Product C (150), Product A (100) - descending by sales
      expect(result).toEqual([
        ['Product B', 200],
        ['Product C', 150],
        ['Product A', 100]
      ]);
    });

    test('sorts table by multiple external criteria', () => {
      const table = [
        ['Row1', 'A'],
        ['Row2', 'B'],
        ['Row3', 'C'],
        ['Row4', 'D']
      ];
      const scores = [85, 92, 85, 78];
      const names = ['John', 'Alice', 'Bob', 'Charlie'];
      // Sort by scores desc, then by names asc
      const result = testSORTBY(table, scores, -1, names, 1);
      expect((result as string[][])[0][1]).toBe('B'); // Alice, 92
      expect((result as string[][])[1][1]).toBe('C'); // Bob, 85
    });
  });

  // ============================================================================
  // Stable Sort Behavior
  // ============================================================================

  describe('Stable Sort', () => {
    test('preserves order of equal sort values', () => {
      const data = ['First', 'Second', 'Third', 'Fourth'];
      const sortBy = [1, 1, 1, 1]; // All equal
      const result = testSORTBY(data, sortBy);
      // Should maintain original order
      expect(result).toEqual(['First', 'Second', 'Third', 'Fourth']);
    });

    test('maintains relative order within equal keys', () => {
      const data = ['A1', 'B1', 'A2', 'B2'];
      const key1 = ['A', 'B', 'A', 'B'];
      const result = testSORTBY(data, key1);
      // A's: A1, A2 (stable)
      // B's: B1, B2 (stable)
      expect(result).toEqual(['A1', 'A2', 'B1', 'B2']);
    });

    test('stable sort with multi-key equal values', () => {
      const data = ['Item1', 'Item2', 'Item3', 'Item4'];
      const key1 = [1, 1, 2, 2];
      const key2 = [10, 10, 20, 20]; // Secondary also equal within groups
      const result = testSORTBY(data, key1, 1, key2, 1);
      // All equal within groups - should maintain original order
      expect(result).toEqual(['Item1', 'Item2', 'Item3', 'Item4']);
    });
  });

  // ============================================================================
  // Integration Tests
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

    test('SORTBY with SEQUENCE', () => {
      const data = ['A', 'B', 'C', 'D', 'E'];
      const seq = testSEQUENCE(5); // [1,2,3,4,5]
      const result = testSORTBY(data, seq, -1);
      expect(result).toEqual(['E', 'D', 'C', 'B', 'A']);
    });

    test('SORTBY with reversed SEQUENCE', () => {
      const seq = testSEQUENCE(5);
      const reversed = [5, 4, 3, 2, 1];
      const result = testSORTBY(seq, reversed);
      expect(result).toEqual([5, 4, 3, 2, 1]);
    });

    test('SORTBY after UNIQUE', () => {
      const unique = testUNIQUE([3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5]);
      // unique: [3,1,4,5,9,2,6]
      const sortKeys = [3, 1, 4, 5, 9, 2, 6];
      const result = testSORTBY(unique, sortKeys);
      expect(result).toEqual([1, 2, 3, 4, 5, 6, 9]);
    });
  });

  // ============================================================================
  // Error Handling
  // ============================================================================

  describe('Error Handling', () => {
    test('returns #VALUE! when array parameter is missing', () => {
      const result = testSORTBY();
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns #VALUE! when only array is provided (no by_array)', () => {
      const result = testSORTBY([1, 2, 3]);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns #VALUE! when array is not an array', () => {
      const result = testSORTBY(42, [1, 2, 3]);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns #VALUE! when array is empty', () => {
      const result = testSORTBY([], []);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns #VALUE! when by_array is not an array', () => {
      const result = testSORTBY([1, 2, 3], 42);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns #VALUE! when array and by_array have different lengths', () => {
      const result = testSORTBY([1, 2, 3], [1, 2]);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns #VALUE! when second by_array has wrong length', () => {
      const result = testSORTBY([1, 2, 3], [1, 2, 3], 1, [1, 2]);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    test('handles null values in by_array', () => {
      const data = ['A', 'B', 'C'];
      const sortBy = [2, null, 1];
      const result = testSORTBY(data, sortBy);
      expect(result).toEqual(['C', 'A', 'B']); // null sorts to end
    });

    test('handles null values in descending sort', () => {
      const data = ['A', 'B', 'C'];
      const sortBy = [2, null, 1];
      const result = testSORTBY(data, sortBy, -1);
      expect(result).toEqual(['B', 'A', 'C']); // null at beginning in desc
    });

    test('handles single element arrays', () => {
      const result = testSORTBY(['A'], [1]);
      expect(result).toEqual(['A']);
    });

    test('handles negative numbers in by_array', () => {
      const data = ['A', 'B', 'C', 'D'];
      const sortBy = [2, -1, 0, -2];
      const result = testSORTBY(data, sortBy);
      expect(result).toEqual(['D', 'B', 'C', 'A']);
    });

    test('handles mixed types in by_array', () => {
      const data = ['A', 'B', 'C'];
      const sortBy = [2, 'alpha', 1];
      const result = testSORTBY(data, sortBy);
      expect(result).toHaveLength(3);
    });

    test('handles boolean values in by_array', () => {
      const data = ['A', 'B', 'C', 'D'];
      const sortBy = [true, false, true, false];
      const result = testSORTBY(data, sortBy);
      expect(result).toEqual(['B', 'D', 'A', 'C']); // false < true
    });

    test('handles empty strings in by_array', () => {
      const data = ['A', 'B', 'C'];
      const sortBy = ['z', '', 'a'];
      const result = testSORTBY(data, sortBy);
      expect(result).toEqual(['B', 'C', 'A']);
    });
  });

  // ============================================================================
  // Real-World Scenarios
  // ============================================================================

  describe('Real-World Use Cases', () => {
    test('ranks competitors by score then time', () => {
      const competitors = ['Alice', 'Bob', 'Charlie', 'Diana'];
      const scores = [95, 95, 90, 92];
      const times = [120, 115, 130, 125]; // Lower time is better
      const result = testSORTBY(competitors, scores, -1, times, 1);
      // 95 points: Bob (115s), Alice (120s)
      // 92 points: Diana (125s)
      // 90 points: Charlie (130s)
      expect(result).toEqual(['Bob', 'Alice', 'Diana', 'Charlie']);
    });

    test('sorts products by category then price', () => {
      const products = ['Laptop', 'Mouse', 'Keyboard', 'Monitor'];
      const categories = ['Electronics', 'Accessories', 'Accessories', 'Electronics'];
      const prices = [1200, 25, 75, 300];
      const result = testSORTBY(products, categories, 1, prices, 1);
      // Accessories: Mouse (25), Keyboard (75)
      // Electronics: Monitor (300), Laptop (1200)
      expect(result).toEqual(['Mouse', 'Keyboard', 'Monitor', 'Laptop']);
    });

    test('sorts students by grade then alphabetically', () => {
      const students = ['John', 'Alice', 'Bob', 'Charlie'];
      const grades = ['A', 'B', 'A', 'B'];
      const names = ['John', 'Alice', 'Bob', 'Charlie'];
      const result = testSORTBY(students, grades, 1, names, 1);
      // Grade A: Bob, John
      // Grade B: Alice, Charlie
      expect(result).toEqual(['Bob', 'John', 'Alice', 'Charlie']);
    });

    test('sorts sales records by region then revenue descending', () => {
      const records = ['Q1-West', 'Q1-East', 'Q1-North', 'Q1-South'];
      const regions = ['West', 'East', 'North', 'South'];
      const revenue = [50000, 75000, 60000, 55000];
      const result = testSORTBY(records, regions, 1, revenue, -1);
      expect(result[0]).toBe('Q1-East'); // East region first alphabetically
    });
  });

  // ============================================================================
  // Performance Tests
  // ============================================================================

  describe('Performance', () => {
    test('sorts 1000 items by external array efficiently', () => {
      const start = performance.now();
      
      const data = Array(1000).fill(0).map((_, i) => `Item${i}`);
      const sortBy = Array(1000).fill(0).map(() => Math.random());
      
      const result = testSORTBY(data, sortBy);
      const end = performance.now();
      
      expect(result).toHaveLength(1000);
      expect(end - start).toBeLessThan(50);
    });

    test('multi-key sort on 500 items efficiently', () => {
      const start = performance.now();
      
      const data = Array(500).fill(0).map((_, i) => `Item${i}`);
      const key1 = Array(500).fill(0).map((_, i) => Math.floor(i / 50));
      const key2 = Array(500).fill(0).map(() => Math.random());
      
      const result = testSORTBY(data, key1, 1, key2, 1);
      const end = performance.now();
      
      expect(result).toHaveLength(500);
      expect(end - start).toBeLessThan(100);
    });

    test('three-key sort maintains performance', () => {
      const start = performance.now();
      
      const data = Array(300).fill(0).map((_, i) => i);
      const key1 = Array(300).fill(0).map((_, i) => Math.floor(i / 30));
      const key2 = Array(300).fill(0).map((_, i) => Math.floor(i / 10));
      const key3 = Array(300).fill(0).map(() => Math.random());
      
      const result = testSORTBY(data, key1, 1, key2, 1, key3, 1);
      const end = performance.now();
      
      expect(result).toHaveLength(300);
      expect(end - start).toBeLessThan(100);
    });
  });
});
