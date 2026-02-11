/**
 * Unit tests for INDEX and MATCH functions
 * Tests all array types, match modes, and error handling
 */

import { FormulaEngine } from '../src/FormulaEngine';
import { Worksheet } from '../src/worksheet';

describe('FormulaEngine - INDEX Function', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Test', 100, 26);
  });

  // Helper to directly test INDEX function
  const testINDEX = (...args: any[]) => {
    const indexFunc = (engine as any).functions.get('INDEX');
    return indexFunc(...args);
  };

  describe('1D arrays', () => {
    test('should return value at specified index', () => {
      const array = ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry'];
      
      expect(testINDEX(array, 1)).toBe('Apple');
      expect(testINDEX(array, 3)).toBe('Cherry');
      expect(testINDEX(array, 5)).toBe('Elderberry');
    });

    test('should work with numeric arrays', () => {
      const array = [10, 20, 30, 40, 50];
      
      expect(testINDEX(array, 1)).toBe(10);
      expect(testINDEX(array, 3)).toBe(30);
      expect(testINDEX(array, 5)).toBe(50);
    });

    test('should return #REF! for out-of-bounds index', () => {
      const array = ['A', 'B', 'C'];
      
      const result1 = testINDEX(array, 0);
      expect(result1).toBeInstanceOf(Error);
      expect((result1 as Error).message).toBe('#REF!');
      
      const result2 = testINDEX(array, 4);
      expect(result2).toBeInstanceOf(Error);
      expect((result2 as Error).message).toBe('#REF!');
      
      const result3 = testINDEX(array, -1);
      expect(result3).toBeInstanceOf(Error);
      expect((result3 as Error).message).toBe('#REF!');
    });
  });

  describe('2D arrays', () => {
    test('should return value at row and column', () => {
      const array = [
        ['A1', 'B1', 'C1'],
        ['A2', 'B2', 'C2'],
        ['A3', 'B3', 'C3']
      ];
      
      expect(testINDEX(array, 1, 1)).toBe('A1');
      expect(testINDEX(array, 2, 2)).toBe('B2');
      expect(testINDEX(array, 3, 3)).toBe('C3');
      expect(testINDEX(array, 1, 3)).toBe('C1');
    });

    test('should work with numeric 2D arrays', () => {
      const array = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]
      ];
      
      expect(testINDEX(array, 1, 1)).toBe(1);
      expect(testINDEX(array, 2, 2)).toBe(5);
      expect(testINDEX(array, 3, 3)).toBe(9);
    });

    test('should return entire row when column is 0', () => {
      const array = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]
      ];
      
      const result = testINDEX(array, 2, 0);
      expect(result).toEqual([4, 5, 6]);
    });

    test('should return entire column when row is 0', () => {
      const array = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]
      ];
      
      const result = testINDEX(array, 0, 2);
      expect(result).toEqual([2, 5, 8]);
    });

    test('should return #REF! for out-of-bounds in 2D array', () => {
      const array = [
        [1, 2],
        [3, 4]
      ];
      
      const result1 = testINDEX(array, 3, 1);
      expect(result1).toBeInstanceOf(Error);
      expect((result1 as Error).message).toBe('#REF!');
      
      const result2 = testINDEX(array, 1, 3);
      expect(result2).toBeInstanceOf(Error);
      expect((result2 as Error).message).toBe('#REF!');
      
      const result3 = testINDEX(array, 0, 0);
      expect(result3).toBeInstanceOf(Error);
      expect((result3 as Error).message).toBe('#REF!');
    });

    test('should handle jagged arrays', () => {
      const array = [
        [1, 2, 3],
        [4, 5],
        [6]
      ];
      
      expect(testINDEX(array, 1, 3)).toBe(3);
      expect(testINDEX(array, 2, 2)).toBe(5);
      
      const result = testINDEX(array, 2, 3);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#REF!');
    });
  });

  describe('Error handling', () => {
    test('should return #REF! for non-array input', () => {
      const result = testINDEX('not an array', 1);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#REF!');
    });

    test('should return #REF! for empty array', () => {
      const result = testINDEX([], 1);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#REF!');
    });
  });
});

describe('FormulaEngine - MATCH Function', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Test', 100, 26);
  });

  // Helper to directly test MATCH function
  const testMATCH = (...args: any[]) => {
    const matchFunc = (engine as any).functions.get('MATCH');
    return matchFunc(...args);
  };

  describe('Match type 0 (exact match)', () => {
    test('should find exact match in unsorted array', () => {
      const array = ['Banana', 'Apple', 'Cherry', 'Date'];
      
      expect(testMATCH('Apple', array, 0)).toBe(2);
      expect(testMATCH('Cherry', array, 0)).toBe(3);
      expect(testMATCH('Banana', array, 0)).toBe(1);
    });

    test('should work with numeric values', () => {
      const array = [50, 10, 30, 20, 40];
      
      expect(testMATCH(10, array, 0)).toBe(2);
      expect(testMATCH(40, array, 0)).toBe(5);
      expect(testMATCH(50, array, 0)).toBe(1);
    });

    test('should be case-insensitive for text', () => {
      const array = ['apple', 'Banana', 'CHERRY'];
      
      expect(testMATCH('APPLE', array, 0)).toBe(1);
      expect(testMATCH('banana', array, 0)).toBe(2);
      expect(testMATCH('Cherry', array, 0)).toBe(3);
    });

    test('should return #N/A when no match found', () => {
      const array = ['Apple', 'Banana', 'Cherry'];
      
      const result = testMATCH('Orange', array, 0);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#N/A');
    });

    test('should return first occurrence of duplicates', () => {
      const array = ['A', 'B', 'A', 'C', 'A'];
      
      expect(testMATCH('A', array, 0)).toBe(1);
    });
  });

  describe('Match type 1 (largest value <= lookup, ascending)', () => {
    test('should find exact match', () => {
      const array = [10, 20, 30, 40, 50];
      
      expect(testMATCH(30, array, 1)).toBe(3);
      expect(testMATCH(10, array, 1)).toBe(1);
      expect(testMATCH(50, array, 1)).toBe(5);
    });

    test('should find largest value less than lookup', () => {
      const array = [10, 20, 30, 40, 50];
      
      expect(testMATCH(25, array, 1)).toBe(2);  // 20 is largest <= 25
      expect(testMATCH(45, array, 1)).toBe(4);  // 40 is largest <= 45
      expect(testMATCH(35, array, 1)).toBe(3);  // 30 is largest <= 35
    });

    test('should return #N/A when lookup is smaller than all values', () => {
      const array = [10, 20, 30, 40, 50];
      
      const result = testMATCH(5, array, 1);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#N/A');
    });

    test('should work with text (ascending)', () => {
      const array = ['Apple', 'Banana', 'Cherry', 'Date'];
      
      expect(testMATCH('Banana', array, 1)).toBe(2);
      expect(testMATCH('Blueberry', array, 1)).toBe(2);  // 'Banana' < 'Blueberry' < 'Cherry'
    });

    test('should handle values larger than all elements', () => {
      const array = [10, 20, 30];
      
      expect(testMATCH(100, array, 1)).toBe(3);  // 30 is largest <= 100
    });

    test('should use default match_type=1 when omitted', () => {
      const array = [10, 20, 30, 40, 50];
      
      expect(testMATCH(25, array)).toBe(2);
      expect(testMATCH(30, array)).toBe(3);
    });
  });

  describe('Match type -1 (smallest value >= lookup, descending)', () => {
    test('should find exact match', () => {
      const array = [50, 40, 30, 20, 10];
      
      expect(testMATCH(30, array, -1)).toBe(3);
      expect(testMATCH(50, array, -1)).toBe(1);
      expect(testMATCH(10, array, -1)).toBe(5);
    });

    test('should find smallest value greater than lookup', () => {
      const array = [50, 40, 30, 20, 10];
      
      // For descending sorted array with match_type=-1:
      // Excel finds the LAST value that is >= lookup_value
      // (moving down the descending list until we hit a value < lookup)
      // 
      // Lookup 25: 50>=25, 40>=25, 30>=25, 20<25 → Last good value is 30 (position 3)
      // Lookup 45: 50>=45, 40<45 → Last good value is 50 (position 1)
      // Lookup 35: 50>=35, 40>=35, 30<35 → Last good value is 40 (position 2)
      expect(testMATCH(25, array, -1)).toBe(3);  // 30 is last value >= 25
      expect(testMATCH(45, array, -1)).toBe(1);  // 50 is last value >= 45
      expect(testMATCH(35, array, -1)).toBe(2);  // 40 is last value >= 35
    });

    test('should return #N/A when lookup is larger than all values', () => {
      const array = [50, 40, 30, 20, 10];
      
      const result = testMATCH(60, array, -1);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#N/A');
    });

    test('should work with text (descending)', () => {
      const array = ['Date', 'Cherry', 'Banana', 'Apple'];
      
      // For descending array: Date > Cherry > Banana > Apple
      // Lookup 'Banana': exact match at position 3
      // Lookup 'Blueberry': Between 'Cherry' and 'Banana'
      //   'Cherry' >= 'Blueberry' ✓ (Cherry comes after Blueberry alphabetically)
      //   'Banana' < 'Blueberry' ✗ (Banana comes before Blueberry)
      //   Smallest >= 'Blueberry' is 'Cherry' (position 2)
      expect(testMATCH('Banana', array, -1)).toBe(3);
      expect(testMATCH('Blueberry', array, -1)).toBe(2);  // 'Cherry' is smallest >= 'Blueberry'
    });

    test('should handle values smaller than all elements', () => {
      const array = [50, 40, 30];
      
      expect(testMATCH(5, array, -1)).toBe(3);  // 30 is smallest >= 5
    });
  });

  describe('Error handling', () => {
    test('should return #N/A for non-array input', () => {
      const result = testMATCH('value', 'not an array', 0);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#N/A');
    });

    test('should return #N/A for empty array', () => {
      const result = testMATCH('value', [], 0);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#N/A');
    });

    test('should handle null values in array', () => {
      const array = [null, 10, 20, 30];
      
      expect(testMATCH(10, array, 0)).toBe(2);
      expect(testMATCH(null, array, 0)).toBe(1);
    });
  });
});

describe('FormulaEngine - INDEX/MATCH Combination', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Test', 100, 26);
  });

  const testINDEX = (...args: any[]) => {
    const indexFunc = (engine as any).functions.get('INDEX');
    return indexFunc(...args);
  };

  const testMATCH = (...args: any[]) => {
    const matchFunc = (engine as any).functions.get('MATCH');
    return matchFunc(...args);
  };

  describe('VLOOKUP alternative', () => {
    test('should lookup value using INDEX(MATCH())', () => {
      const lookupColumn = ['Apple', 'Banana', 'Cherry', 'Date'];
      const returnColumn = [1.50, 0.75, 2.00, 1.25];
      
      // Find "Cherry" and return its price
      const position = testMATCH('Cherry', lookupColumn, 0);
      const result = testINDEX(returnColumn, position);
      
      expect(position).toBe(3);
      expect(result).toBe(2.00);
    });

    test('should work with 2D array (table lookup)', () => {
      const table = [
        ['Apple', 1.50, 'Red'],
        ['Banana', 0.75, 'Yellow'],
        ['Cherry', 2.00, 'Red'],
        ['Date', 1.25, 'Brown']
      ];
      const lookupColumn = ['Apple', 'Banana', 'Cherry', 'Date'];
      
      // Find "Banana" and return its color (column 3)
      const position = testMATCH('Banana', lookupColumn, 0);
      const result = testINDEX(table, position, 3);
      
      expect(position).toBe(2);
      expect(result).toBe('Yellow');
    });

    test('should handle approximate match with sorted data', () => {
      const scores = [0, 60, 70, 80, 90];
      const grades = ['F', 'D', 'C', 'B', 'A'];
      
      // Student scored 85, should get 'B'
      const position = testMATCH(85, scores, 1);
      const result = testINDEX(grades, position);
      
      expect(position).toBe(4);  // 80 is largest <= 85
      expect(result).toBe('B');
    });
  });

  describe('Two-way lookup', () => {
    test('should perform row and column lookup', () => {
      const table = [
        ['', 'Q1', 'Q2', 'Q3', 'Q4'],
        ['North', 100, 120, 130, 140],
        ['South', 90, 95, 100, 105],
        ['East', 80, 85, 90, 95],
        ['West', 70, 75, 80, 85]
      ];
      
      const rowHeaders = ['North', 'South', 'East', 'West'];
      const colHeaders = ['Q1', 'Q2', 'Q3', 'Q4'];
      
      // Find sales for "East" region in "Q3"
      const rowPos = testMATCH('East', rowHeaders, 0);
      const colPos = testMATCH('Q3', colHeaders, 0);
      const result = testINDEX(table, rowPos + 1, colPos + 1);  // +1 because table has header row/col
      
      expect(rowPos).toBe(3);
      expect(colPos).toBe(3);
      expect(result).toBe(90);
    });
  });

  describe('Error propagation', () => {
    test('should propagate MATCH #N/A error', () => {
      const array = ['A', 'B', 'C'];
      const values = [10, 20, 30];
      
      const position = testMATCH('D', array, 0);
      expect(position).toBeInstanceOf(Error);
      expect((position as Error).message).toBe('#N/A');
      
      // INDEX with error should return error
      const result = testINDEX(values, position);
      expect(result).toBeInstanceOf(Error);
    });

    test('should propagate INDEX #REF! error', () => {
      const array = ['A', 'B', 'C'];
      
      // MATCH returns valid position
      const position = testMATCH('B', array, 0);
      expect(position).toBe(2);
      
      // But INDEX with out-of-bounds returns #REF!
      const values = [10];  // Only 1 element
      const result = testINDEX(values, position);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#REF!');
    });
  });

  describe('Performance scenarios', () => {
    test('should handle large arrays efficiently', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => i + 1);
      
      const start = Date.now();
      const position = testMATCH(750, largeArray, 0);
      const result = testINDEX(largeArray, position);
      const duration = Date.now() - start;
      
      expect(position).toBe(750);
      expect(result).toBe(750);
      expect(duration).toBeLessThan(50);  // Should be fast
    });

    test('should handle multiple lookups', () => {
      const keys = Array.from({ length: 100 }, (_, i) => `Key${i}`);
      const values = Array.from({ length: 100 }, (_, i) => i * 10);
      
      const lookups = ['Key25', 'Key50', 'Key75', 'Key99'];
      const results = lookups.map(key => {
        const pos = testMATCH(key, keys, 0);
        return testINDEX(values, pos);
      });
      
      expect(results).toEqual([250, 500, 750, 990]);
    });
  });
});
