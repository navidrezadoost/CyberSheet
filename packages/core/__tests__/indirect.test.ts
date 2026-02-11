/**
 * Unit tests for INDIRECT function
 * Tests dynamic cell reference creation from text strings
 */

import { FormulaEngine } from '../src/FormulaEngine';
import { Worksheet } from '../src/worksheet';

describe('FormulaEngine - INDIRECT Function', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Test', 100, 26);
  });

  // Helper to directly test INDIRECT function
  const testINDIRECT = (...args: any[]) => {
    const indirectFunc = (engine as any).functions.get('INDIRECT');
    return indirectFunc(...args);
  };

  describe('A1 notation - single cells', () => {
    test('should parse simple A1 reference', () => {
      expect(testINDIRECT('A1')).toBe('A1');
      expect(testINDIRECT('B2')).toBe('B2');
      expect(testINDIRECT('Z26')).toBe('Z26');
    });

    test('should normalize lowercase to uppercase', () => {
      expect(testINDIRECT('a1')).toBe('A1');
      expect(testINDIRECT('b5')).toBe('B5');
      expect(testINDIRECT('zz100')).toBe('ZZ100');
    });

    test('should handle mixed case', () => {
      expect(testINDIRECT('Ab10')).toBe('AB10');
      expect(testINDIRECT('aB10')).toBe('AB10');
      expect(testINDIRECT('XfD999')).toBe('XFD999'); // XFD is max Excel column
    });

    test('should handle double letter columns', () => {
      expect(testINDIRECT('AA1')).toBe('AA1');
      expect(testINDIRECT('AB10')).toBe('AB10');
      expect(testINDIRECT('ZZ100')).toBe('ZZ100');
    });

    test('should handle triple letter columns', () => {
      expect(testINDIRECT('AAA1')).toBe('AAA1');
      expect(testINDIRECT('ABC50')).toBe('ABC50');
      expect(testINDIRECT('XFD1')).toBe('XFD1'); // Max Excel column
    });

    test('should handle large row numbers', () => {
      expect(testINDIRECT('A1000')).toBe('A1000');
      expect(testINDIRECT('B10000')).toBe('B10000');
      expect(testINDIRECT('C100000')).toBe('C100000');
      expect(testINDIRECT('D1048576')).toBe('D1048576'); // Max Excel row
    });

    test('should handle whitespace', () => {
      expect(testINDIRECT(' A1 ')).toBe('A1');
      expect(testINDIRECT('  B5  ')).toBe('B5');
    });
  });

  describe('A1 notation - ranges', () => {
    test('should parse simple ranges', () => {
      expect(testINDIRECT('A1:B2')).toBe('A1:B2');
      expect(testINDIRECT('C3:E5')).toBe('C3:E5');
      expect(testINDIRECT('Z1:Z10')).toBe('Z1:Z10');
    });

    test('should normalize range to uppercase', () => {
      expect(testINDIRECT('a1:b2')).toBe('A1:B2');
      expect(testINDIRECT('c3:e5')).toBe('C3:E5');
    });

    test('should handle large ranges', () => {
      expect(testINDIRECT('A1:Z100')).toBe('A1:Z100');
      expect(testINDIRECT('AA1:ZZ1000')).toBe('AA1:ZZ1000');
    });

    test('should handle column ranges', () => {
      expect(testINDIRECT('A1:A100')).toBe('A1:A100');
      expect(testINDIRECT('B1:B50')).toBe('B1:B50');
    });

    test('should handle row ranges', () => {
      expect(testINDIRECT('A1:Z1')).toBe('A1:Z1');
      expect(testINDIRECT('A5:D5')).toBe('A5:D5');
    });

    test('should return #REF! for invalid range order', () => {
      const result1 = testINDIRECT('B2:A1'); // End before start
      expect(result1).toBeInstanceOf(Error);
      expect((result1 as Error).message).toBe('#REF!');

      const result2 = testINDIRECT('Z10:A5');
      expect(result2).toBeInstanceOf(Error);
      expect((result2 as Error).message).toBe('#REF!');
    });
  });

  describe('R1C1 notation - single cells', () => {
    test('should parse R1C1 references', () => {
      expect(testINDIRECT('R1C1', false)).toBe('R1C1');
      expect(testINDIRECT('R5C2', false)).toBe('R5C2');
      expect(testINDIRECT('R10C10', false)).toBe('R10C10');
    });

    test('should normalize R1C1 to uppercase', () => {
      expect(testINDIRECT('r1c1', false)).toBe('R1C1');
      expect(testINDIRECT('r5c2', false)).toBe('R5C2');
      expect(testINDIRECT('R5c2', false)).toBe('R5C2');
    });

    test('should handle large row/column numbers', () => {
      expect(testINDIRECT('R1000C500', false)).toBe('R1000C500');
      expect(testINDIRECT('R1048576C16384', false)).toBe('R1048576C16384'); // Max Excel
    });

    test('should use R1C1 when a1=0', () => {
      expect(testINDIRECT('R1C1', 0)).toBe('R1C1');
      expect(testINDIRECT('R5C2', 0)).toBe('R5C2');
    });

    test('should use A1 when a1=1', () => {
      expect(testINDIRECT('A1', 1)).toBe('A1');
      expect(testINDIRECT('B5', 1)).toBe('B5');
    });

    test('should default to A1 when a1 omitted', () => {
      expect(testINDIRECT('A1')).toBe('A1');
      expect(testINDIRECT('B5')).toBe('B5');
    });
  });

  describe('R1C1 notation - ranges', () => {
    test('should parse R1C1 range references', () => {
      expect(testINDIRECT('R1C1:R3C3', false)).toBe('R1C1:R3C3');
      expect(testINDIRECT('R5C2:R10C5', false)).toBe('R5C2:R10C5');
    });

    test('should normalize R1C1 ranges to uppercase', () => {
      expect(testINDIRECT('r1c1:r3c3', false)).toBe('R1C1:R3C3');
      expect(testINDIRECT('R5C2:r10c5', false)).toBe('R5C2:R10C5');
    });

    test('should return #REF! for invalid R1C1 range order', () => {
      const result = testINDIRECT('R5C5:R1C1', false);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#REF!');
    });
  });

  describe('Sheet references', () => {
    test('should handle sheet name with A1 notation', () => {
      expect(testINDIRECT('Sheet1!A1')).toBe('Sheet1!A1');
      expect(testINDIRECT('Sheet2!B5')).toBe('Sheet2!B5');
      expect(testINDIRECT('Data!Z100')).toBe('Data!Z100');
    });

    test('should handle sheet name with ranges', () => {
      expect(testINDIRECT('Sheet1!A1:B2')).toBe('Sheet1!A1:B2');
      expect(testINDIRECT('Summary!C3:E5')).toBe('Summary!C3:E5');
    });

    test('should handle sheet name with R1C1 notation', () => {
      expect(testINDIRECT('Sheet1!R1C1', false)).toBe('Sheet1!R1C1');
      expect(testINDIRECT('Sheet2!R5C2', false)).toBe('Sheet2!R5C2');
    });

    test('should normalize sheet references', () => {
      expect(testINDIRECT('sheet1!a1')).toBe('sheet1!A1');
      expect(testINDIRECT('SHEET2!b5')).toBe('SHEET2!B5');
    });
  });

  describe('Error handling', () => {
    test('should return #VALUE! when no arguments', () => {
      const result = testINDIRECT();
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('should return #VALUE! for non-string reference', () => {
      const result1 = testINDIRECT(123);
      expect(result1).toBeInstanceOf(Error);
      expect((result1 as Error).message).toBe('#VALUE!');

      const result2 = testINDIRECT(null);
      expect(result2).toBeInstanceOf(Error);
      expect((result2 as Error).message).toBe('#VALUE!');

      const result3 = testINDIRECT(true);
      expect(result3).toBeInstanceOf(Error);
      expect((result3 as Error).message).toBe('#VALUE!');
    });

    test('should return #REF! for invalid A1 reference', () => {
      const result1 = testINDIRECT('invalid');
      expect(result1).toBeInstanceOf(Error);
      expect((result1 as Error).message).toBe('#REF!');

      const result2 = testINDIRECT('123');
      expect(result2).toBeInstanceOf(Error);
      expect((result2 as Error).message).toBe('#REF!');

      const result3 = testINDIRECT('ABC');
      expect(result3).toBeInstanceOf(Error);
      expect((result3 as Error).message).toBe('#REF!');
    });

    test('should return #REF! for invalid R1C1 reference', () => {
      const result1 = testINDIRECT('R1', false);
      expect(result1).toBeInstanceOf(Error);
      expect((result1 as Error).message).toBe('#REF!');

      const result2 = testINDIRECT('C1', false);
      expect(result2).toBeInstanceOf(Error);
      expect((result2 as Error).message).toBe('#REF!');

      const result3 = testINDIRECT('R1C', false);
      expect(result3).toBeInstanceOf(Error);
      expect((result3 as Error).message).toBe('#REF!');
    });

    test('should return #REF! for out-of-bounds row', () => {
      const result = testINDIRECT('A1048577'); // Max row is 1048576
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#REF!');
    });

    test('should return #REF! for out-of-bounds column', () => {
      const result = testINDIRECT('XFE1'); // Max column is XFD (16384)
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#REF!');
    });

    test('should return #REF! for zero or negative row/column in R1C1', () => {
      const result1 = testINDIRECT('R0C1', false);
      expect(result1).toBeInstanceOf(Error);
      expect((result1 as Error).message).toBe('#REF!');

      const result2 = testINDIRECT('R1C0', false);
      expect(result2).toBeInstanceOf(Error);
      expect((result2 as Error).message).toBe('#REF!');
    });

    test('should return #REF! for empty string', () => {
      const result = testINDIRECT('');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#REF!');
    });

    test('should return #REF! for whitespace only', () => {
      const result = testINDIRECT('   ');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#REF!');
    });
  });

  describe('Real-world scenarios', () => {
    test('should create dynamic cell reference from concatenation', () => {
      // Simulating: INDIRECT("A" & 5)
      const colLetter = 'A';
      const rowNum = 5;
      const ref = `${colLetter}${rowNum}`;
      
      expect(testINDIRECT(ref)).toBe('A5');
    });

    test('should create dynamic range from text', () => {
      // Simulating: INDIRECT("A1:B" & 10)
      const endRow = 10;
      const rangeRef = `A1:B${endRow}`;
      
      expect(testINDIRECT(rangeRef)).toBe('A1:B10');
    });

    test('should handle dynamic sheet references', () => {
      // Simulating: INDIRECT(SheetName & "!A1")
      const sheetName = 'Q1Data';
      const ref = `${sheetName}!A1`;
      
      expect(testINDIRECT(ref)).toBe('Q1Data!A1');
    });

    test('should validate dynamically constructed references', () => {
      // Valid dynamic reference
      const validRef = 'Sheet' + '1' + '!' + 'A' + '1';
      expect(testINDIRECT(validRef)).toBe('Sheet1!A1');

      // Invalid dynamic reference
      const invalidRef = 'InvalidRef123';
      const result = testINDIRECT(invalidRef);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#REF!');
    });

    test('should work for column iteration', () => {
      // Simulating dynamic column reference in a loop
      const columns = ['A', 'B', 'C', 'D', 'E'];
      const results = columns.map(col => testINDIRECT(`${col}1`));
      
      expect(results).toEqual(['A1', 'B1', 'C1', 'D1', 'E1']);
    });

    test('should work for row iteration', () => {
      // Simulating dynamic row reference in a loop
      const rows = [1, 2, 3, 4, 5];
      const results = rows.map(row => testINDIRECT(`A${row}`));
      
      expect(results).toEqual(['A1', 'A2', 'A3', 'A4', 'A5']);
    });

    test('should create named range style references', () => {
      // Simulating named range lookup
      expect(testINDIRECT('Data!A1:E100')).toBe('Data!A1:E100');
      expect(testINDIRECT('Summary!Z1:Z50')).toBe('Summary!Z1:Z50');
    });
  });

  describe('Edge cases', () => {
    test('should handle single letter column at boundaries', () => {
      expect(testINDIRECT('A1')).toBe('A1');
      expect(testINDIRECT('Z1')).toBe('Z1');
    });

    test('should handle double letter columns at boundary', () => {
      expect(testINDIRECT('AA1')).toBe('AA1');
      expect(testINDIRECT('AZ1')).toBe('AZ1');
      expect(testINDIRECT('BA1')).toBe('BA1');
    });

    test('should handle R1C1 at extremes', () => {
      expect(testINDIRECT('R1C1', false)).toBe('R1C1');
      expect(testINDIRECT('R1C16384', false)).toBe('R1C16384');
      expect(testINDIRECT('R1048576C1', false)).toBe('R1048576C1');
    });

    test('should handle same cell range', () => {
      expect(testINDIRECT('A1:A1')).toBe('A1:A1');
      expect(testINDIRECT('B5:B5')).toBe('B5:B5');
    });

    test('should handle special characters in sheet names', () => {
      expect(testINDIRECT('Sheet-1!A1')).toBe('Sheet-1!A1');
      expect(testINDIRECT('Sheet_2!B5')).toBe('Sheet_2!B5');
      expect(testINDIRECT('Sheet.3!C10')).toBe('Sheet.3!C10');
    });
  });

  describe('Performance', () => {
    test('should handle many references efficiently', () => {
      const start = Date.now();
      
      // Generate 1000 cell references
      for (let i = 1; i <= 1000; i++) {
        const col = String.fromCharCode(65 + (i % 26));
        const row = Math.floor(i / 26) + 1;
        testINDIRECT(`${col}${row}`);
      }
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);  // Should complete in under 100ms
    });

    test('should parse complex references quickly', () => {
      const start = Date.now();
      
      testINDIRECT('Sheet1!A1:XFD1048576');
      testINDIRECT('VeryLongSheetName!AA100:ZZ200');
      testINDIRECT('R1048576C16384', false);
      testINDIRECT('R1C1:R1048576C16384', false);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(10);
    });
  });
});
