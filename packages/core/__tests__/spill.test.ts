import { FormulaEngine } from '../src/FormulaEngine';
import { SpillEngine } from '../src/SpillEngine';
import { Worksheet } from '../src/worksheet';

describe('SpillEngine - Dynamic Array Spill Behavior', () => {
  let engine: FormulaEngine;
  let spillEngine: SpillEngine;
  let worksheet: Worksheet;

  beforeEach(() => {
    engine = new FormulaEngine();
    spillEngine = new SpillEngine();
    worksheet = new Worksheet('Sheet1', 100, 26);
  });

  describe('Spill Detection and Application', () => {
    test('checkSpillRange returns null for available range', () => {
      const result = spillEngine.checkSpillRange(worksheet, { row: 1, col: 1 }, 3, 3);
      expect(result).toBeNull();
    });

    test('checkSpillRange returns #SPILL! when cell has value', () => {
      worksheet.setCellValue({ row: 1, col: 2 }, 'Block');
      const result = spillEngine.checkSpillRange(worksheet, { row: 1, col: 1 }, 1, 3);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe('#SPILL!');
    });

    test('checkSpillRange returns #SPILL! when cell has formula', () => {
      const cell = worksheet.getCell({ row: 1, col: 2 }) ?? { value: null };
      cell.formula = '=SUM(A1:A5)';
      (worksheet as any).cells.set('1:2', cell);
      
      const result = spillEngine.checkSpillRange(worksheet, { row: 1, col: 1 }, 1, 3);
      expect(result).toBeInstanceOf(Error);
      expect(result?.message).toBe('#SPILL!');
    });

    test('checkSpillRange allows source cell (skips first cell)', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, 'Source');
      const result = spillEngine.checkSpillRange(worksheet, { row: 1, col: 1 }, 3, 3);
      expect(result).toBeNull(); // Should not block on source cell
    });

    test('applySpill spreads 1D array vertically', () => {
      const array = [10, 20, 30];
      spillEngine.applySpill(worksheet, { row: 1, col: 1 }, array);

      expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe(10);
      expect(worksheet.getCellValue({ row: 2, col: 1 })).toBe(20);
      expect(worksheet.getCellValue({ row: 3, col: 1 })).toBe(30);

      // Check spill metadata
      const sourceCell = worksheet.getCell({ row: 1, col: 1 });
      expect(sourceCell?.spillSource).toBeDefined();
      expect(sourceCell?.spillSource?.dimensions).toEqual([3, 1]);
      expect(sourceCell?.spillSource?.endAddress).toEqual({ row: 3, col: 1 });
    });

    test('applySpill spreads 2D array', () => {
      const array = [[1, 2], [3, 4], [5, 6]];
      spillEngine.applySpill(worksheet, { row: 1, col: 1 }, array);

      expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe(1);
      expect(worksheet.getCellValue({ row: 1, col: 2 })).toBe(2);
      expect(worksheet.getCellValue({ row: 2, col: 1 })).toBe(3);
      expect(worksheet.getCellValue({ row: 2, col: 2 })).toBe(4);
      expect(worksheet.getCellValue({ row: 3, col: 1 })).toBe(5);
      expect(worksheet.getCellValue({ row: 3, col: 2 })).toBe(6);

      // Check spill metadata
      const sourceCell = worksheet.getCell({ row: 1, col: 1 });
      expect(sourceCell?.spillSource).toBeDefined();
      expect(sourceCell?.spillSource?.dimensions).toEqual([3, 2]);
      expect(sourceCell?.spillSource?.endAddress).toEqual({ row: 3, col: 2 });
    });

    test('applySpill sets #SPILL! when range is blocked', () => {
      // Block row 2, column 1 (which is in the spill path for vertical array)
      worksheet.setCellValue({ row: 2, col: 1 }, 'Blocker');
      
      const array = [1, 2, 3];
      spillEngine.applySpill(worksheet, { row: 1, col: 1 }, array);

      // Source cell should show #SPILL! error
      expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe('#SPILL!');
    });

    test('applySpill marks spilled cells with spilledFrom', () => {
      const array = [10, 20];
      spillEngine.applySpill(worksheet, { row: 1, col: 1 }, array);

      const spilledCell = worksheet.getCell({ row: 2, col: 1 });
      expect(spilledCell?.spilledFrom).toEqual({ row: 1, col: 1 });
    });
  });

  describe('Spill Cleanup', () => {
    test('clearSpill removes spilled values', () => {
      const array = [10, 20, 30];
      spillEngine.applySpill(worksheet, { row: 1, col: 1 }, array);

      // Verify spill exists
      expect(worksheet.getCellValue({ row: 2, col: 1 })).toBe(20);

      // Clear spill
      spillEngine.clearSpill(worksheet, { row: 1, col: 1 });

      // Verify spilled cells are cleared
      expect(worksheet.getCellValue({ row: 2, col: 1 })).toBeNull();
      expect(worksheet.getCellValue({ row: 3, col: 1 })).toBeNull();
    });

    test('clearSpill removes spill metadata', () => {
      const array = [10, 20];
      spillEngine.applySpill(worksheet, { row: 1, col: 1 }, array);

      const sourceCell = worksheet.getCell({ row: 1, col: 1 });
      expect(sourceCell?.spillSource).toBeDefined();

      spillEngine.clearSpill(worksheet, { row: 1, col: 1 });

      expect(sourceCell?.spillSource).toBeUndefined();
    });

    test('clearSpill does nothing if no spill exists', () => {
      expect(() => {
        spillEngine.clearSpill(worksheet, { row: 1, col: 1 });
      }).not.toThrow();
    });

    test('applySpill clears previous spill before applying new one', () => {
      // First spill: 3 elements
      const array1 = [10, 20, 30];
      spillEngine.applySpill(worksheet, { row: 1, col: 1 }, array1);
      expect(worksheet.getCellValue({ row: 3, col: 1 })).toBe(30);

      // Second spill: 2 elements (smaller)
      const array2 = [100, 200];
      spillEngine.applySpill(worksheet, { row: 1, col: 1 }, array2);

      // Old spill should be cleared
      expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe(100);
      expect(worksheet.getCellValue({ row: 2, col: 1 })).toBe(200);
      expect(worksheet.getCellValue({ row: 3, col: 1 })).toBeNull(); // Old value cleared
    });
  });

  describe('Get Spilled Range (# Operator Support)', () => {
    test('getSpilledRange returns 1D array for vertical spill', () => {
      const array = [10, 20, 30];
      spillEngine.applySpill(worksheet, { row: 1, col: 1 }, array);

      const result = spillEngine.getSpilledRange(worksheet, { row: 1, col: 1 });
      expect(result).toEqual([10, 20, 30]);
    });

    test('getSpilledRange returns 2D array for grid spill', () => {
      const array = [[1, 2], [3, 4]];
      spillEngine.applySpill(worksheet, { row: 1, col: 1 }, array);

      const result = spillEngine.getSpilledRange(worksheet, { row: 1, col: 1 });
      expect(result).toEqual([[1, 2], [3, 4]]);
    });

    test('getSpilledRange returns #REF! if cell has no spill', () => {
      const result = spillEngine.getSpilledRange(worksheet, { row: 1, col: 1 });
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#REF!');
    });
  });

  describe('Spill Helpers', () => {
    test('getSpillSource returns source address for spilled cell', () => {
      const array = [10, 20];
      spillEngine.applySpill(worksheet, { row: 1, col: 1 }, array);

      const source = spillEngine.getSpillSource(worksheet, { row: 2, col: 1 });
      expect(source).toEqual({ row: 1, col: 1 });
    });

    test('getSpillSource returns null for non-spilled cell', () => {
      const source = spillEngine.getSpillSource(worksheet, { row: 5, col: 5 });
      expect(source).toBeNull();
    });

    test('isSpillSource returns true for source cell', () => {
      const array = [10, 20];
      spillEngine.applySpill(worksheet, { row: 1, col: 1 }, array);

      expect(spillEngine.isSpillSource(worksheet, { row: 1, col: 1 })).toBe(true);
      expect(spillEngine.isSpillSource(worksheet, { row: 2, col: 1 })).toBe(false);
    });
  });

  describe('Integration with Dynamic Array Functions', () => {
    test('SEQUENCE with spill', () => {
      const array = [1, 2, 3, 4, 5];
      spillEngine.applySpill(worksheet, { row: 1, col: 1 }, array);

      // Verify all values spilled
      for (let i = 0; i < array.length; i++) {
        expect(worksheet.getCellValue({ row: i + 1, col: 1 })).toBe(array[i]);
      }
    });

    test('UNIQUE with spill', () => {
      const uniqueArray = [1, 2, 3]; // After removing duplicates
      spillEngine.applySpill(worksheet, { row: 1, col: 1 }, uniqueArray);

      const spilledRange = spillEngine.getSpilledRange(worksheet, { row: 1, col: 1 });
      expect(spilledRange).toEqual(uniqueArray);
    });

    test('SORT with spill', () => {
      const sortedArray = [1, 2, 3, 4, 5];
      spillEngine.applySpill(worksheet, { row: 1, col: 1 }, sortedArray);

      for (let i = 0; i < sortedArray.length; i++) {
        expect(worksheet.getCellValue({ row: i + 1, col: 1 })).toBe(sortedArray[i]);
      }
    });

    test('FILTER with spill', () => {
      const filteredArray = [2, 4, 6]; // Only even numbers
      spillEngine.applySpill(worksheet, { row: 1, col: 1 }, filteredArray);

      const spilledRange = spillEngine.getSpilledRange(worksheet, { row: 1, col: 1 });
      expect(spilledRange).toEqual(filteredArray);
    });

    test('Multiple spills do not interfere', () => {
      // First spill
      spillEngine.applySpill(worksheet, { row: 1, col: 1 }, [10, 20]);

      // Second spill in different location
      spillEngine.applySpill(worksheet, { row: 5, col: 5 }, [30, 40]);

      // Both should exist independently
      expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe(10);
      expect(worksheet.getCellValue({ row: 2, col: 1 })).toBe(20);
      expect(worksheet.getCellValue({ row: 5, col: 5 })).toBe(30);
      expect(worksheet.getCellValue({ row: 6, col: 5 })).toBe(40);
    });

    test('Overlapping spills cause #SPILL! error', () => {
      // First spill
      spillEngine.applySpill(worksheet, { row: 1, col: 1 }, [10, 20, 30]);

      // Try to spill over existing spill (should fail)
      spillEngine.applySpill(worksheet, { row: 2, col: 1 }, [40, 50]);

      // Second spill should show error
      expect(worksheet.getCellValue({ row: 2, col: 1 })).toBe('#SPILL!');
    });
  });

  describe('Real-World Scenarios', () => {
    test('Dashboard with multiple dynamic arrays', () => {
      // Header row
      worksheet.setCellValue({ row: 1, col: 1 }, 'ID');
      worksheet.setCellValue({ row: 1, col: 2 }, 'Name');

      // SEQUENCE for IDs (starting row 2)
      spillEngine.applySpill(worksheet, { row: 2, col: 1 }, [1, 2, 3, 4, 5]);

      // Names in another column
      spillEngine.applySpill(worksheet, { row: 2, col: 2 }, ['Alice', 'Bob', 'Charlie', 'David', 'Eve']);

      // Verify layout
      expect(worksheet.getCellValue({ row: 2, col: 1 })).toBe(1);
      expect(worksheet.getCellValue({ row: 2, col: 2 })).toBe('Alice');
      expect(worksheet.getCellValue({ row: 6, col: 1 })).toBe(5);
      expect(worksheet.getCellValue({ row: 6, col: 2 })).toBe('Eve');
    });

    test('Filtered and sorted results', () => {
      // Simulating: SORT(FILTER(data, condition))
      const filtered = [5, 3, 9, 1];
      const sorted = [1, 3, 5, 9];

      spillEngine.applySpill(worksheet, { row: 1, col: 1 }, sorted);

      const result = spillEngine.getSpilledRange(worksheet, { row: 1, col: 1 });
      expect(result).toEqual(sorted);
    });

    test('Large spill (1000 elements)', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => i + 1);
      spillEngine.applySpill(worksheet, { row: 1, col: 1 }, largeArray);

      expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe(1);
      expect(worksheet.getCellValue({ row: 500, col: 1 })).toBe(500);
      expect(worksheet.getCellValue({ row: 1000, col: 1 })).toBe(1000);

      const sourceCell = worksheet.getCell({ row: 1, col: 1 });
      expect(sourceCell?.spillSource?.dimensions).toEqual([1000, 1]);
    });

    test('Wide spill (20 columns)', () => {
      const wideArray = [Array.from({ length: 20 }, (_, i) => i + 1)];
      spillEngine.applySpill(worksheet, { row: 1, col: 1 }, wideArray);

      expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe(1);
      expect(worksheet.getCellValue({ row: 1, col: 10 })).toBe(10);
      expect(worksheet.getCellValue({ row: 1, col: 20 })).toBe(20);
    });
  });

  describe('Edge Cases', () => {
    test('spill with null values', () => {
      const array = [1, null, 3];
      spillEngine.applySpill(worksheet, { row: 1, col: 1 }, array);

      expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe(1);
      expect(worksheet.getCellValue({ row: 2, col: 1 })).toBeNull();
      expect(worksheet.getCellValue({ row: 3, col: 1 })).toBe(3);
    });

    test('spill with boolean values', () => {
      const array = [true, false, true];
      spillEngine.applySpill(worksheet, { row: 1, col: 1 }, array);

      expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe(true);
      expect(worksheet.getCellValue({ row: 2, col: 1 })).toBe(false);
      expect(worksheet.getCellValue({ row: 3, col: 1 })).toBe(true);
    });

    test('spill with string values', () => {
      const array = ['Alpha', 'Beta', 'Gamma'];
      spillEngine.applySpill(worksheet, { row: 1, col: 1 }, array);

      expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe('Alpha');
      expect(worksheet.getCellValue({ row: 2, col: 1 })).toBe('Beta');
      expect(worksheet.getCellValue({ row: 3, col: 1 })).toBe('Gamma');
    });

    test('single element spill (1x1)', () => {
      const array = [42];
      spillEngine.applySpill(worksheet, { row: 1, col: 1 }, array);

      expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe(42);

      const sourceCell = worksheet.getCell({ row: 1, col: 1 });
      expect(sourceCell?.spillSource?.dimensions).toEqual([1, 1]);
    });

    test('empty string values in spill', () => {
      const array = ['', 'text', ''];
      spillEngine.applySpill(worksheet, { row: 1, col: 1 }, array);

      expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe('');
      expect(worksheet.getCellValue({ row: 2, col: 1 })).toBe('text');
      expect(worksheet.getCellValue({ row: 3, col: 1 })).toBe('');
    });
  });
});
