/**
 * Unit tests for XMATCH function (Excel 365)
 * Tests advanced position finding with multiple modes
 */

import { FormulaEngine } from '../src/FormulaEngine';
import { Worksheet } from '../src/worksheet';

describe('FormulaEngine - XMATCH Function', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Test', 100, 26);
  });

  // Helper to directly test XMATCH function
  const testXMATCH = (...args: any[]) => {
    const xmatchFunc = (engine as any).functions.get('XMATCH');
    return xmatchFunc(...args);
  };

  describe('Basic exact match (match_mode=0, default)', () => {
    test('should find exact match in simple array', () => {
      const arr = [10, 20, 30, 40, 50];
      expect(testXMATCH(30, arr)).toBe(3);
      expect(testXMATCH(10, arr)).toBe(1);
      expect(testXMATCH(50, arr)).toBe(5);
    });

    test('should find exact match with strings', () => {
      const arr = ['apple', 'banana', 'cherry', 'date'];
      expect(testXMATCH('banana', arr)).toBe(2);
      expect(testXMATCH('apple', arr)).toBe(1);
      expect(testXMATCH('date', arr)).toBe(4);
    });

    test('should be case-insensitive for strings', () => {
      const arr = ['Apple', 'Banana', 'Cherry'];
      expect(testXMATCH('apple', arr)).toBe(1);
      expect(testXMATCH('BANANA', arr)).toBe(2);
      expect(testXMATCH('ChErRy', arr)).toBe(3);
    });

    test('should return #N/A when value not found', () => {
      const arr = [10, 20, 30];
      const result = testXMATCH(40, arr);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#N/A');
    });

    test('should handle mixed types', () => {
      const arr = [10, 'text', true, 40];
      expect(testXMATCH('text', arr)).toBe(2);
      expect(testXMATCH(true, arr)).toBe(3);
    });
  });

  describe('Reverse search (search_mode=-1)', () => {
    test('should find last occurrence with reverse search', () => {
      const arr = [10, 20, 30, 20, 40];
      // Forward search finds first 20 at index 2
      expect(testXMATCH(20, arr, 0, 1)).toBe(2);
      // Reverse search finds last 20 at index 4
      expect(testXMATCH(20, arr, 0, -1)).toBe(4);
    });

    test('should find match searching from end', () => {
      const arr = ['apple', 'banana', 'cherry', 'date', 'banana'];
      // Forward: first banana at 2
      expect(testXMATCH('banana', arr, 0, 1)).toBe(2);
      // Reverse: last banana at 5
      expect(testXMATCH('banana', arr, 0, -1)).toBe(5);
    });

    test('should work with unique values in reverse', () => {
      const arr = [5, 10, 15, 20, 25];
      expect(testXMATCH(15, arr, 0, -1)).toBe(3);
      expect(testXMATCH(5, arr, 0, -1)).toBe(1);
      expect(testXMATCH(25, arr, 0, -1)).toBe(5);
    });
  });

  describe('Binary search ascending (search_mode=2)', () => {
    test('should find value in sorted ascending array', () => {
      const arr = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      expect(testXMATCH(50, arr, 0, 2)).toBe(5);
      expect(testXMATCH(10, arr, 0, 2)).toBe(1);
      expect(testXMATCH(100, arr, 0, 2)).toBe(10);
    });

    test('should work with large sorted array', () => {
      const arr = Array.from({ length: 1000 }, (_, i) => i + 1);
      expect(testXMATCH(500, arr, 0, 2)).toBe(500);
      expect(testXMATCH(1, arr, 0, 2)).toBe(1);
      expect(testXMATCH(1000, arr, 0, 2)).toBe(1000);
    });

    test('should return #N/A if not found in binary search', () => {
      const arr = [10, 20, 30, 40, 50];
      const result = testXMATCH(25, arr, 0, 2);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#N/A');
    });

    test('should find approximate match with binary search (match_mode=-1)', () => {
      const arr = [10, 20, 30, 40, 50];
      // 25 not found, next smallest is 20 at index 2
      expect(testXMATCH(25, arr, -1, 2)).toBe(2);
      // 35 not found, next smallest is 30 at index 3
      expect(testXMATCH(35, arr, -1, 2)).toBe(3);
    });

    test('should find approximate match with binary search (match_mode=1)', () => {
      const arr = [10, 20, 30, 40, 50];
      // 25 not found, next largest is 30 at index 3
      expect(testXMATCH(25, arr, 1, 2)).toBe(3);
      // 35 not found, next largest is 40 at index 4
      expect(testXMATCH(35, arr, 1, 2)).toBe(4);
    });
  });

  describe('Binary search descending (search_mode=-2)', () => {
    test('should find value in sorted descending array', () => {
      const arr = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10];
      expect(testXMATCH(50, arr, 0, -2)).toBe(6);
      expect(testXMATCH(100, arr, 0, -2)).toBe(1);
      expect(testXMATCH(10, arr, 0, -2)).toBe(10);
    });

    test('should work with large descending array', () => {
      const arr = Array.from({ length: 1000 }, (_, i) => 1000 - i);
      expect(testXMATCH(500, arr, 0, -2)).toBe(501);
      expect(testXMATCH(1000, arr, 0, -2)).toBe(1);
      expect(testXMATCH(1, arr, 0, -2)).toBe(1000);
    });

    test('should return #N/A if not found in descending binary search', () => {
      const arr = [50, 40, 30, 20, 10];
      const result = testXMATCH(25, arr, 0, -2);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#N/A');
    });
  });

  describe('Match mode -1 (exact or next smallest)', () => {
    test('should find exact match', () => {
      const arr = [10, 20, 30, 40, 50];
      expect(testXMATCH(30, arr, -1)).toBe(3);
    });

    test('should find next smallest when no exact match', () => {
      const arr = [10, 20, 30, 40, 50];
      expect(testXMATCH(25, arr, -1)).toBe(2);  // 20 is largest <= 25
      expect(testXMATCH(35, arr, -1)).toBe(3);  // 30 is largest <= 35
      expect(testXMATCH(45, arr, -1)).toBe(4);  // 40 is largest <= 45
    });

    test('should return #N/A when all values are larger', () => {
      const arr = [10, 20, 30, 40, 50];
      const result = testXMATCH(5, arr, -1);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#N/A');
    });

    test('should work with reverse search', () => {
      const arr = [10, 20, 30, 20, 40];
      // Forward: finds first 20 (or smaller) = 20 at index 2
      expect(testXMATCH(25, arr, -1, 1)).toBe(2);  // First 20 that's <= 25
      // Reverse: finds last 20 (or smaller) = 20 at index 4
      expect(testXMATCH(25, arr, -1, -1)).toBe(4);  // Last 20 that's <= 25
    });
  });

  describe('Match mode 1 (exact or next largest)', () => {
    test('should find exact match', () => {
      const arr = [10, 20, 30, 40, 50];
      expect(testXMATCH(30, arr, 1)).toBe(3);
    });

    test('should find next largest when no exact match', () => {
      const arr = [10, 20, 30, 40, 50];
      expect(testXMATCH(25, arr, 1)).toBe(3);  // 30 is smallest >= 25
      expect(testXMATCH(35, arr, 1)).toBe(4);  // 40 is smallest >= 35
      expect(testXMATCH(15, arr, 1)).toBe(2);  // 20 is smallest >= 15
    });

    test('should return #N/A when all values are smaller', () => {
      const arr = [10, 20, 30, 40, 50];
      const result = testXMATCH(60, arr, 1);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#N/A');
    });

    test('should work with reverse search', () => {
      const arr = [10, 20, 30, 40, 50];
      // Forward search
      expect(testXMATCH(25, arr, 1, 1)).toBe(3);
      // Reverse search
      expect(testXMATCH(25, arr, 1, -1)).toBe(3);
    });
  });

  describe('Match mode 2 (wildcard match)', () => {
    test('should match with * wildcard', () => {
      const arr = ['apple', 'apricot', 'banana', 'blueberry'];
      expect(testXMATCH('app*', arr, 2)).toBe(1);  // Matches 'apple'
      expect(testXMATCH('b*', arr, 2)).toBe(3);    // Matches 'banana'
    });

    test('should match with ? wildcard', () => {
      const arr = ['cat', 'bat', 'rat', 'hat'];
      expect(testXMATCH('?at', arr, 2)).toBe(1);   // Matches 'cat'
      expect(testXMATCH('ba?', arr, 2)).toBe(2);   // Matches 'bat'
    });

    test('should match complex wildcards', () => {
      const arr = ['test123', 'test456', 'prod123', 'prod456'];
      expect(testXMATCH('test*', arr, 2)).toBe(1);     // Matches 'test123'
      expect(testXMATCH('*456', arr, 2)).toBe(2);      // Matches 'test456'
      expect(testXMATCH('prod???', arr, 2)).toBe(3);   // Matches 'prod123'
    });

    test('should work with reverse wildcard search', () => {
      const arr = ['apple', 'apricot', 'banana', 'blueberry', 'apricot'];
      // Forward: first 'apr*'
      expect(testXMATCH('apr*', arr, 2, 1)).toBe(2);
      // Reverse: last 'apr*'
      expect(testXMATCH('apr*', arr, 2, -1)).toBe(5);
    });

    test('should return #N/A when wildcard does not match', () => {
      const arr = ['apple', 'banana', 'cherry'];
      const result = testXMATCH('x*', arr, 2);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#N/A');
    });
  });

  describe('Error handling', () => {
    test('should return #VALUE! when lookup_value is undefined', () => {
      const result = testXMATCH(undefined, [1, 2, 3]);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('should return #VALUE! when lookup_array is not an array', () => {
      const result = testXMATCH(1, 'not an array');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('should return #N/A when lookup_array is empty', () => {
      const result = testXMATCH(1, []);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#N/A');
    });

    test('should return #VALUE! for invalid match_mode', () => {
      const result = testXMATCH(1, [1, 2, 3], 5);  // Invalid match_mode
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('should return #VALUE! for invalid search_mode', () => {
      const result = testXMATCH(1, [1, 2, 3], 0, 5);  // Invalid search_mode
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });
  });

  describe('Comparison with MATCH', () => {
    // Helper to test MATCH function
    const testMATCH = (...args: any[]) => {
      const matchFunc = (engine as any).functions.get('MATCH');
      return matchFunc(...args);
    };

    test('XMATCH with defaults should behave like MATCH(value, array, 0)', () => {
      const arr = [10, 20, 30, 40, 50];
      expect(testXMATCH(30, arr)).toBe(testMATCH(30, arr, 0));
      expect(testXMATCH(10, arr)).toBe(testMATCH(10, arr, 0));
    });

    test('XMATCH with match_mode=-1 similar to MATCH type 1', () => {
      const arr = [10, 20, 30, 40, 50];
      // Note: MATCH type 1 expects sorted ascending
      const xmatchResult = testXMATCH(25, arr, -1, 1);
      const matchResult = testMATCH(25, arr, 1);
      expect(xmatchResult).toBe(matchResult);
    });

    test('XMATCH reverse search is unique capability', () => {
      const arr = [10, 20, 30, 20, 40];
      // MATCH always finds first occurrence
      expect(testMATCH(20, arr, 0)).toBe(2);
      // XMATCH can find last occurrence
      expect(testXMATCH(20, arr, 0, -1)).toBe(4);
    });

    test('XMATCH binary search mode is explicit', () => {
      const arr = Array.from({ length: 1000 }, (_, i) => i + 1);
      // Both should find the value
      expect(testXMATCH(500, arr, 0, 2)).toBe(500);
      expect(testMATCH(500, arr, 0)).toBe(500);
    });
  });

  describe('Real-world scenarios', () => {
    test('should find product in inventory (exact match)', () => {
      const products = ['SKU001', 'SKU002', 'SKU003', 'SKU004'];
      expect(testXMATCH('SKU003', products)).toBe(3);
    });

    test('should find closest price (approximate match)', () => {
      const prices = [100, 200, 300, 400, 500];
      // Budget is 350, find closest lower price
      expect(testXMATCH(350, prices, -1)).toBe(3);  // 300 is closest
    });

    test('should find last transaction (reverse search)', () => {
      const transactions = ['2024-01', '2024-02', '2024-03', '2024-02', '2024-04'];
      // Find last occurrence of 2024-02
      expect(testXMATCH('2024-02', transactions, 0, -1)).toBe(4);
    });

    test('should search sorted data efficiently (binary)', () => {
      const sortedIds = Array.from({ length: 10000 }, (_, i) => i + 1);
      const start = Date.now();
      expect(testXMATCH(5000, sortedIds, 0, 2)).toBe(5000);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(10);  // Should be instant with binary search
    });

    test('should match file patterns (wildcards)', () => {
      const files = ['report.xlsx', 'data.csv', 'image.png', 'document.pdf'];
      expect(testXMATCH('*.xlsx', files, 2)).toBe(1);
      expect(testXMATCH('*.csv', files, 2)).toBe(2);
    });
  });

  describe('Edge cases', () => {
    test('should handle single-element array', () => {
      expect(testXMATCH(10, [10])).toBe(1);
      expect(testXMATCH(10, [10], 0, -1)).toBe(1);  // Reverse
      expect(testXMATCH(10, [10], 0, 2)).toBe(1);   // Binary
    });

    test('should handle array with nulls', () => {
      const arr = [null, 10, null, 20, null];
      expect(testXMATCH(10, arr)).toBe(2);
      expect(testXMATCH(20, arr)).toBe(4);
    });

    test('should handle all identical values', () => {
      const arr = [5, 5, 5, 5, 5];
      expect(testXMATCH(5, arr, 0, 1)).toBe(1);   // First
      expect(testXMATCH(5, arr, 0, -1)).toBe(5);  // Last
    });

    test('should handle boundary values in approximate match', () => {
      const arr = [10, 20, 30, 40, 50];
      // Test at boundaries
      expect(testXMATCH(9, arr, -1)).toBeInstanceOf(Error);   // Below minimum
      expect(testXMATCH(51, arr, 1)).toBeInstanceOf(Error);   // Above maximum
    });
  });

  describe('Performance', () => {
    test('should handle large arrays efficiently with linear search', () => {
      const arr = Array.from({ length: 1000 }, (_, i) => i + 1);
      const start = Date.now();
      
      testXMATCH(500, arr, 0, 1);
      testXMATCH(750, arr, 0, -1);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(50);
    });

    test('should handle large arrays very efficiently with binary search', () => {
      const arr = Array.from({ length: 10000 }, (_, i) => i + 1);
      const start = Date.now();
      
      testXMATCH(5000, arr, 0, 2);
      testXMATCH(7500, arr, 0, 2);
      testXMATCH(2500, arr, 0, 2);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(10);  // Binary search should be instant
    });

    test('should handle many wildcard searches', () => {
      const arr = Array.from({ length: 100 }, (_, i) => `item${i}`);
      const start = Date.now();
      
      for (let i = 0; i < 10; i++) {
        testXMATCH(`item${i}*`, arr, 2);
      }
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(50);
    });
  });
});
