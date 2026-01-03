/**
 * Unit tests for OFFSET function
 * Tests dynamic range references with row/column offsets
 */

import { FormulaEngine } from '../src/FormulaEngine';
import { Worksheet } from '../src/worksheet';

describe('FormulaEngine - OFFSET Function', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Test', 100, 26);
  });

  // Helper to directly test OFFSET function
  const testOFFSET = (...args: any[]) => {
    const offsetFunc = (engine as any).functions.get('OFFSET');
    return offsetFunc(...args);
  };

  // Sample data for testing
  const sampleData = [
    [1, 2, 3, 4, 5],
    [6, 7, 8, 9, 10],
    [11, 12, 13, 14, 15],
    [16, 17, 18, 19, 20]
  ];

  describe('Basic offset - no size change', () => {
    test('should return same range with 0,0 offset', () => {
      const result = testOFFSET(sampleData, 0, 0);
      expect(result).toEqual(sampleData);
    });

    test('should offset down by 1 row', () => {
      const result = testOFFSET(sampleData, 1, 0);
      const expected = [
        [6, 7, 8, 9, 10],
        [11, 12, 13, 14, 15],
        [16, 17, 18, 19, 20]
      ];
      expect(result).toEqual(expected);
    });

    test('should offset down by 2 rows', () => {
      const result = testOFFSET(sampleData, 2, 0);
      const expected = [
        [11, 12, 13, 14, 15],
        [16, 17, 18, 19, 20]
      ];
      expect(result).toEqual(expected);
    });

    test('should offset right by 1 column', () => {
      const result = testOFFSET(sampleData, 0, 1);
      const expected = [
        [2, 3, 4, 5],
        [7, 8, 9, 10],
        [12, 13, 14, 15],
        [17, 18, 19, 20]
      ];
      expect(result).toEqual(expected);
    });

    test('should offset right by 2 columns', () => {
      const result = testOFFSET(sampleData, 0, 2);
      const expected = [
        [3, 4, 5],
        [8, 9, 10],
        [13, 14, 15],
        [18, 19, 20]
      ];
      expect(result).toEqual(expected);
    });

    test('should offset diagonally (rows and columns)', () => {
      const result = testOFFSET(sampleData, 1, 1);
      const expected = [
        [7, 8, 9, 10],
        [12, 13, 14, 15],
        [17, 18, 19, 20]
      ];
      expect(result).toEqual(expected);
    });

    test('should handle maximum offset', () => {
      const result = testOFFSET(sampleData, 3, 4);
      expect(result).toBe(20);  // Single cell at bottom-right
    });
  });

  describe('Offset with height and width', () => {
    test('should return single cell with height=1, width=1', () => {
      const result = testOFFSET(sampleData, 0, 0, 1, 1);
      expect(result).toBe(1);
    });

    test('should return single cell from middle', () => {
      const result = testOFFSET(sampleData, 1, 2, 1, 1);
      expect(result).toBe(8);
    });

    test('should return single row with width > 1', () => {
      const result = testOFFSET(sampleData, 1, 0, 1, 3);
      expect(result).toEqual([6, 7, 8]);
    });

    test('should return single column with height > 1', () => {
      const result = testOFFSET(sampleData, 0, 1, 3, 1);
      expect(result).toEqual([2, 7, 12]);
    });

    test('should return 2x2 subrange', () => {
      const result = testOFFSET(sampleData, 1, 1, 2, 2);
      const expected = [
        [7, 8],
        [12, 13]
      ];
      expect(result).toEqual(expected);
    });

    test('should return 3x3 subrange', () => {
      const result = testOFFSET(sampleData, 0, 2, 3, 3);
      const expected = [
        [3, 4, 5],
        [8, 9, 10],
        [13, 14, 15]
      ];
      expect(result).toEqual(expected);
    });

    test('should allow smaller height than original', () => {
      const result = testOFFSET(sampleData, 0, 0, 2, 5);
      const expected = [
        [1, 2, 3, 4, 5],
        [6, 7, 8, 9, 10]
      ];
      expect(result).toEqual(expected);
    });

    test('should allow smaller width than original', () => {
      const result = testOFFSET(sampleData, 0, 0, 4, 3);
      const expected = [
        [1, 2, 3],
        [6, 7, 8],
        [11, 12, 13],
        [16, 17, 18]
      ];
      expect(result).toEqual(expected);
    });
  });

  describe('1D array input', () => {
    test('should handle 1D array as single row', () => {
      const data = [10, 20, 30, 40, 50];
      const result = testOFFSET(data, 0, 0);
      expect(result).toEqual([10, 20, 30, 40, 50]);
    });

    test('should offset 1D array by columns', () => {
      const data = [10, 20, 30, 40, 50];
      const result = testOFFSET(data, 0, 2);
      expect(result).toEqual([30, 40, 50]);
    });

    test('should extract single value from 1D array', () => {
      const data = [10, 20, 30, 40, 50];
      const result = testOFFSET(data, 0, 2, 1, 1);
      expect(result).toBe(30);
    });

    test('should extract subrange from 1D array', () => {
      const data = [10, 20, 30, 40, 50];
      const result = testOFFSET(data, 0, 1, 1, 3);
      expect(result).toEqual([20, 30, 40]);
    });
  });

  describe('Decimal offset handling', () => {
    test('should truncate decimal row offsets', () => {
      const result1 = testOFFSET(sampleData, 1.9, 0, 1, 1);
      expect(result1).toBe(6);  // Floor(1.9) = 1
      
      const result2 = testOFFSET(sampleData, 2.1, 0, 1, 1);
      expect(result2).toBe(11);  // Floor(2.1) = 2
    });

    test('should truncate decimal column offsets', () => {
      const result1 = testOFFSET(sampleData, 0, 1.9, 1, 1);
      expect(result1).toBe(2);  // Floor(1.9) = 1
      
      const result2 = testOFFSET(sampleData, 0, 2.1, 1, 1);
      expect(result2).toBe(3);  // Floor(2.1) = 2
    });

    test('should truncate decimal height and width', () => {
      const result = testOFFSET(sampleData, 0, 0, 2.9, 3.9);
      const expected = [
        [1, 2, 3],
        [6, 7, 8]
      ];
      expect(result).toEqual(expected);
    });
  });

  describe('Error handling', () => {
    test('should return #VALUE! when missing required arguments', () => {
      const result1 = testOFFSET(sampleData);
      expect(result1).toBeInstanceOf(Error);
      expect((result1 as Error).message).toBe('#VALUE!');
      
      const result2 = testOFFSET(sampleData, 0);
      expect(result2).toBeInstanceOf(Error);
      expect((result2 as Error).message).toBe('#VALUE!');
    });

    test('should return #REF! for non-array reference', () => {
      const result = testOFFSET('not an array', 0, 0);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#REF!');
    });

    test('should return #VALUE! for non-numeric row offset', () => {
      const result = testOFFSET(sampleData, 'text', 0);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('should return #VALUE! for non-numeric column offset', () => {
      const result = testOFFSET(sampleData, 0, 'text');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('should return #REF! for negative row offset', () => {
      const result = testOFFSET(sampleData, -1, 0);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#REF!');
    });

    test('should return #REF! for negative column offset', () => {
      const result = testOFFSET(sampleData, 0, -1);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#REF!');
    });

    test('should return #REF! when offset exceeds array bounds (rows)', () => {
      const result = testOFFSET(sampleData, 4, 0);  // Only 4 rows, offset by 4 leaves 0 rows
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#REF!');
    });

    test('should return #REF! when offset exceeds array bounds (cols)', () => {
      const result = testOFFSET(sampleData, 0, 5);  // Only 5 cols, offset by 5 leaves 0 cols
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#REF!');
    });

    test('should return #REF! when height extends beyond bounds', () => {
      const result = testOFFSET(sampleData, 2, 0, 3, 1);  // Start at row 2, need 3 rows, but only 2 left
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#REF!');
    });

    test('should return #REF! when width extends beyond bounds', () => {
      const result = testOFFSET(sampleData, 0, 3, 1, 3);  // Start at col 3, need 3 cols, but only 2 left
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#REF!');
    });

    test('should return #REF! for zero height', () => {
      const result = testOFFSET(sampleData, 0, 0, 0, 5);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#REF!');
    });

    test('should return #REF! for zero width', () => {
      const result = testOFFSET(sampleData, 0, 0, 4, 0);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#REF!');
    });

    test('should return #REF! for negative height', () => {
      const result = testOFFSET(sampleData, 0, 0, -1, 5);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#REF!');
    });

    test('should return #REF! for negative width', () => {
      const result = testOFFSET(sampleData, 0, 0, 4, -1);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#REF!');
    });
  });

  describe('Real-world scenarios', () => {
    test('should extract moving average window', () => {
      const timeSeries = [
        [100, 110, 105, 115, 120],
        [125, 130, 128, 135, 140],
        [145, 150, 148, 155, 160]
      ];
      
      // Get 3-day window starting at day 2
      const window = testOFFSET(timeSeries, 0, 1, 3, 3);
      const expected = [
        [110, 105, 115],
        [130, 128, 135],
        [150, 148, 155]
      ];
      expect(window).toEqual(expected);
    });

    test('should extract column from table', () => {
      const table = [
        ['Name', 'Age', 'Score'],
        ['Alice', 25, 95],
        ['Bob', 30, 87],
        ['Charlie', 28, 92]
      ];
      
      // Get Score column (skip header, get column 2)
      const scores = testOFFSET(table, 1, 2, 3, 1);
      expect(scores).toEqual([95, 87, 92]);
    });

    test('should extract row from table', () => {
      const table = [
        ['Q1', 'Q2', 'Q3', 'Q4'],
        [100, 120, 110, 130],
        [90, 95, 100, 105]
      ];
      
      // Get second data row
      const row = testOFFSET(table, 2, 0, 1, 4);
      expect(row).toEqual([90, 95, 100, 105]);
    });

    test('should create dynamic range for charts', () => {
      const data = [
        [1, 2, 3, 4, 5],
        [10, 20, 30, 40, 50],
        [5, 10, 15, 20, 25]
      ];
      
      // Get last 3 columns
      const chartData = testOFFSET(data, 0, 2, 3, 3);
      const expected = [
        [3, 4, 5],
        [30, 40, 50],
        [15, 20, 25]
      ];
      expect(chartData).toEqual(expected);
    });

    test('should extract specific cell for conditional lookup', () => {
      const matrix = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]
      ];
      
      // Get center cell (row 1, col 1)
      const center = testOFFSET(matrix, 1, 1, 1, 1);
      expect(center).toBe(5);
    });
  });

  describe('Edge cases', () => {
    test('should handle single cell reference', () => {
      const singleCell = [[42]];
      const result = testOFFSET(singleCell, 0, 0);
      expect(result).toBe(42);
    });

    test('should handle single row array', () => {
      const singleRow = [[1, 2, 3, 4, 5]];
      const result = testOFFSET(singleRow, 0, 1, 1, 3);
      expect(result).toEqual([2, 3, 4]);
    });

    test('should handle single column array', () => {
      const singleCol = [[1], [2], [3], [4]];
      const result = testOFFSET(singleCol, 1, 0, 2, 1);
      expect(result).toEqual([2, 3]);
    });

    test('should handle empty cells (null values)', () => {
      const dataWithNulls = [
        [1, null, 3],
        [4, 5, null],
        [null, 8, 9]
      ];
      
      const result = testOFFSET(dataWithNulls, 1, 0, 2, 2);
      const expected = [
        [4, 5],
        [null, 8]
      ];
      expect(result).toEqual(expected);
    });

    test('should handle string data', () => {
      const stringData = [
        ['A', 'B', 'C'],
        ['D', 'E', 'F'],
        ['G', 'H', 'I']
      ];
      
      const result = testOFFSET(stringData, 1, 1, 2, 2);
      const expected = [
        ['E', 'F'],
        ['H', 'I']
      ];
      expect(result).toEqual(expected);
    });

    test('should handle mixed types', () => {
      const mixedData = [
        [1, 'text', true],
        [null, 2.5, false],
        ['hello', 100, undefined]
      ];
      
      const result = testOFFSET(mixedData, 0, 1, 2, 2);
      const expected = [
        ['text', true],
        [2.5, false]
      ];
      expect(result).toEqual(expected);
    });
  });

  describe('Performance', () => {
    test('should handle large arrays efficiently', () => {
      // Create 100x100 array
      const largeArray = Array.from({ length: 100 }, (_, row) =>
        Array.from({ length: 100 }, (_, col) => row * 100 + col)
      );
      
      const start = Date.now();
      
      // Extract various subranges
      testOFFSET(largeArray, 0, 0, 10, 10);
      testOFFSET(largeArray, 50, 50, 20, 20);
      testOFFSET(largeArray, 90, 90, 10, 10);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(50);  // Should complete in under 50ms
    });
  });
});
