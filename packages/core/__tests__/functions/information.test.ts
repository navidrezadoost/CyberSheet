/**
 * Information Functions Test Suite
 * Week 10 Day 2: ISFORMULA, ISREF, CELL, INFO
 * 
 * Tests information and cell inspection functions for Excel compatibility.
 */

import { describe, test, expect } from '@jest/globals';
import { ISFORMULA, ISREF, CELL, INFO } from '../../src/functions/information';
import type { FormulaContext } from '../../src/types/formula-types';
import type { Worksheet } from '../../src/worksheet';

// Mock worksheet for testing
const createMockWorksheet = (cells: Record<string, any>): Worksheet => {
  return {
    getCell: (addr: { row: number; col: number }) => {
      const key = `${addr.row},${addr.col}`;
      return cells[key] || null;
    },
  } as any;
};

// Helper to create context
const createContext = (worksheet?: Worksheet): FormulaContext => {
  return {
    worksheet: worksheet || createMockWorksheet({}),
    currentCell: { row: 0, col: 0 },
  };
};

describe('Information Functions', () => {
  
  describe('ISFORMULA', () => {
    test('should return TRUE for cell containing formula', () => {
      const worksheet = createMockWorksheet({
        '0,0': { value: '=SUM(B1:B10)' },
      });
      const context = createContext(worksheet);
      const result = ISFORMULA(context, { row: 0, col: 0 } as any);
      expect(result).toBe(true);
    });

    test('should return FALSE for cell containing number', () => {
      const worksheet = createMockWorksheet({
        '0,0': { value: 42 },
      });
      const context = createContext(worksheet);
      const result = ISFORMULA(context, { row: 0, col: 0 } as any);
      expect(result).toBe(false);
    });

    test('should return FALSE for cell containing text', () => {
      const worksheet = createMockWorksheet({
        '5,3': { value: 'test' },
      });
      const context = createContext(worksheet);
      const result = ISFORMULA(context, { row: 5, col: 3 } as any);
      expect(result).toBe(false);
    });

    test('should return FALSE for empty cell', () => {
      const worksheet = createMockWorksheet({});
      const context = createContext(worksheet);
      const result = ISFORMULA(context, { row: 10, col: 10 } as any);
      expect(result).toBe(false);
    });

    test('should return FALSE for non-reference argument', () => {
      const context = createContext();
      expect(ISFORMULA(context, 42)).toBe(false);
      expect(ISFORMULA(context, 'test')).toBe(false);
    });
  });

  describe('ISREF', () => {
    test('should return TRUE for cell address object', () => {
      const result = ISREF({ row: 0, col: 0 } as any);
      expect(result).toBe(true);
    });

    test('should return TRUE for different cell addresses', () => {
      expect(ISREF({ row: 5, col: 3 } as any)).toBe(true);
      expect(ISREF({ row: 100, col: 50 } as any)).toBe(true);
      expect(ISREF({ row: 0, col: 25 } as any)).toBe(true);
    });

    test('should return TRUE for array of cell addresses (range)', () => {
      const range = [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
        { row: 0, col: 2 }
      ];
      const result = ISREF(range as any);
      expect(result).toBe(true);
    });

    test('should return FALSE for numbers', () => {
      expect(ISREF(42)).toBe(false);
      expect(ISREF(0)).toBe(false);
      expect(ISREF(-10)).toBe(false);
      expect(ISREF(3.14)).toBe(false);
    });

    test('should return FALSE for strings', () => {
      expect(ISREF('test')).toBe(false);
      expect(ISREF('A1')).toBe(false);
      expect(ISREF('')).toBe(false);
    });

    test('should return FALSE for booleans', () => {
      expect(ISREF(true)).toBe(false);
      expect(ISREF(false)).toBe(false);
    });

    test('should return FALSE for null and undefined', () => {
      expect(ISREF(null)).toBe(false);
      expect(ISREF(undefined as any)).toBe(false);
    });

    test('should return FALSE for objects without row/col', () => {
      expect(ISREF({ foo: 'bar' } as any)).toBe(false);
      expect(ISREF({ row: 0 } as any)).toBe(false);
      expect(ISREF({ col: 0 } as any)).toBe(false);
    });

    test('should return FALSE for arrays of non-references', () => {
      expect(ISREF([1, 2, 3])).toBe(false);
      expect(ISREF(['a', 'b', 'c'])).toBe(false);
    });

    test('should require both row and col to be numbers', () => {
      expect(ISREF({ row: '0', col: 0 } as any)).toBe(false);
      expect(ISREF({ row: 0, col: '0' } as any)).toBe(false);
      expect(ISREF({ row: 'A', col: 1 } as any)).toBe(false);
    });
  });

  describe('CELL', () => {
    describe('address info type', () => {
      test('should return absolute address for cell A1', () => {
        const result = CELL(createContext(), 'address', { row: 0, col: 0 } as any);
        expect(result).toBe('$A$1');
      });

      test('should return absolute address for cell B5', () => {
        const result = CELL(createContext(), 'address', { row: 4, col: 1 } as any);
        expect(result).toBe('$B$5');
      });

      test('should return absolute address for cell Z10', () => {
        const result = CELL(createContext(), 'address', { row: 9, col: 25 } as any);
        expect(result).toBe('$Z$10');
      });

      test('should return absolute address for cell AA1', () => {
        const result = CELL(createContext(), 'address', { row: 0, col: 26 } as any);
        expect(result).toBe('$AA$1');
      });

      test('should return absolute address for cell AB20', () => {
        const result = CELL(createContext(), 'address', { row: 19, col: 27 } as any);
        expect(result).toBe('$AB$20');
      });

      test('should return error when reference missing', () => {
        const result = CELL(createContext(), 'address');
        expect(result).toBeInstanceOf(Error);
        expect((result as Error).message).toBe('#VALUE!');
      });
    });

    describe('col info type', () => {
      test('should return 1-based column number', () => {
        expect(CELL(createContext(), 'col', { row: 0, col: 0 } as any)).toBe(1); // Column A
        expect(CELL(createContext(), 'col', { row: 0, col: 1 } as any)).toBe(2); // Column B
        expect(CELL(createContext(), 'col', { row: 0, col: 25 } as any)).toBe(26); // Column Z
        expect(CELL(createContext(), 'col', { row: 0, col: 26 } as any)).toBe(27); // Column AA
      });

      test('should return error when reference missing', () => {
        const result = CELL(createContext(), 'col');
        expect(result).toBeInstanceOf(Error);
      });
    });

    describe('row info type', () => {
      test('should return 1-based row number', () => {
        expect(CELL(createContext(), 'row', { row: 0, col: 0 } as any)).toBe(1);
        expect(CELL(createContext(), 'row', { row: 4, col: 0 } as any)).toBe(5);
        expect(CELL(createContext(), 'row', { row: 99, col: 0 } as any)).toBe(100);
      });

      test('should return error when reference missing', () => {
        const result = CELL(createContext(), 'row');
        expect(result).toBeInstanceOf(Error);
      });
    });

    describe('type info type', () => {
      test('should return "v" for numeric value', () => {
        const worksheet = createMockWorksheet({
          '0,0': { value: 42 },
          '1,1': { value: 3.14 }
        });
        const ctx = createContext(worksheet);
        
        expect(CELL(ctx, 'type', { row: 0, col: 0 } as any)).toBe('v');
        expect(CELL(ctx, 'type', { row: 1, col: 1 } as any)).toBe('v');
      });

      test('should return "l" for text (label)', () => {
        const worksheet = createMockWorksheet({
          '0,0': { value: 'Hello' },
          '2,3': { value: '=SUM(A1:A10)' }
        });
        const ctx = createContext(worksheet);
        
        expect(CELL(ctx, 'type', { row: 0, col: 0 } as any)).toBe('l');
        expect(CELL(ctx, 'type', { row: 2, col: 3 } as any)).toBe('l');
      });

      test('should return "b" for blank cell', () => {
        const worksheet = createMockWorksheet({});
        const ctx = createContext(worksheet);
        
        expect(CELL(ctx, 'type', { row: 0, col: 0 } as any)).toBe('b');
        expect(CELL(ctx, 'type', { row: 5, col: 10 } as any)).toBe('b');
      });

      test('should return "b" when no worksheet provided', () => {
        const result = CELL(createContext(), 'type', { row: 0, col: 0 } as any);
        expect(result).toBe('b');
      });

      test('should work without reference (defaults to blank)', () => {
        const result = CELL(createContext(), 'type');
        expect(result).toBe('b');
      });
    });

    describe('width info type', () => {
      test('should return default width of 10', () => {
        const result = CELL(createContext(), 'width', { row: 0, col: 0 } as any);
        expect(result).toBe(10);
      });

      test('should work without reference', () => {
        const result = CELL(createContext(), 'width');
        expect(result).toBe(10);
      });
    });

    describe('format info type', () => {
      test('should return "G" for general format', () => {
        const result = CELL(createContext(), 'format', { row: 0, col: 0 } as any);
        expect(result).toBe('G');
      });

      test('should work without reference', () => {
        const result = CELL(createContext(), 'format');
        expect(result).toBe('G');
      });
    });

    describe('color info type', () => {
      test('should return 0 (not colored)', () => {
        const result = CELL(createContext(), 'color', { row: 0, col: 0 } as any);
        expect(result).toBe(0);
      });

      test('should work without reference', () => {
        const result = CELL(createContext(), 'color');
        expect(result).toBe(0);
      });
    });

    describe('parentheses info type', () => {
      test('should return 0 (not formatted with parentheses)', () => {
        const result = CELL(createContext(), 'parentheses', { row: 0, col: 0 } as any);
        expect(result).toBe(0);
      });

      test('should work without reference', () => {
        const result = CELL(createContext(), 'parentheses');
        expect(result).toBe(0);
      });
    });

    describe('prefix info type', () => {
      test('should return empty string (no alignment prefix)', () => {
        const result = CELL(createContext(), 'prefix', { row: 0, col: 0 } as any);
        expect(result).toBe('');
      });

      test('should work without reference', () => {
        const result = CELL(createContext(), 'prefix');
        expect(result).toBe('');
      });
    });

    describe('protect info type', () => {
      test('should return 0 (unlocked)', () => {
        const result = CELL(createContext(), 'protect', { row: 0, col: 0 } as any);
        expect(result).toBe(0);
      });

      test('should work without reference', () => {
        const result = CELL(createContext(), 'protect');
        expect(result).toBe(0);
      });
    });

    describe('contents info type', () => {
      test('should return actual cell value when worksheet provided', () => {
        const worksheet = createMockWorksheet({
          '0,0': { value: 42 },
          '1,2': { value: 'Hello' },
          '5,3': { value: '=SUM(A1:A10)' }
        });
        const ctx = createContext(worksheet);
        
        expect(CELL(ctx, 'contents', { row: 0, col: 0 } as any)).toBe(42);
        expect(CELL(ctx, 'contents', { row: 1, col: 2 } as any)).toBe('Hello');
        expect(CELL(ctx, 'contents', { row: 5, col: 3 } as any)).toBe('=SUM(A1:A10)');
      });

      test('should return empty string for empty cell', () => {
        const worksheet = createMockWorksheet({});
        const ctx = createContext(worksheet);
        
        const result = CELL(ctx, 'contents', { row: 0, col: 0 } as any);
        expect(result).toBe('');
      });

      test('should return empty string when no worksheet provided', () => {
        const result = CELL(createContext(), 'contents', { row: 0, col: 0 } as any);
        expect(result).toBe('');
      });
    });

    describe('case insensitivity', () => {
      test('should handle uppercase info types', () => {
        expect(CELL(createContext(), 'ADDRESS', { row: 0, col: 0 } as any)).toBe('$A$1');
        expect(CELL(createContext(), 'ROW', { row: 4, col: 0 } as any)).toBe(5);
        expect(CELL(createContext(), 'COL', { row: 0, col: 2 } as any)).toBe(3);
      });

      test('should handle mixed case info types', () => {
        expect(CELL(createContext(), 'AdDrEsS', { row: 0, col: 0 } as any)).toBe('$A$1');
        expect(CELL(createContext(), 'RoW', { row: 4, col: 0 } as any)).toBe(5);
        expect(CELL(createContext(), 'CoL', { row: 0, col: 2 } as any)).toBe(3);
      });
    });

    describe('error handling', () => {
      test('should return #VALUE! for invalid info type', () => {
        const result = CELL(createContext(), 'invalid', { row: 0, col: 0 } as any);
        expect(result).toBeInstanceOf(Error);
        expect((result as Error).message).toBe('#VALUE!');
      });

      test('should return #VALUE! for non-string info type', () => {
        const result = CELL(createContext(), 42 as any, { row: 0, col: 0 } as any);
        expect(result).toBeInstanceOf(Error);
        expect((result as Error).message).toBe('#VALUE!');
      });

      test('should return #VALUE! for null info type', () => {
        const result = CELL(createContext(), null as any, { row: 0, col: 0 } as any);
        expect(result).toBeInstanceOf(Error);
      });
    });
  });

  describe('INFO', () => {
    describe('directory type', () => {
      test('should return "/" for directory', () => {
        const result = INFO('directory');
        expect(result).toBe('/');
      });
    });

    describe('numfile type', () => {
      test('should return 1 for number of worksheets', () => {
        const result = INFO('numfile');
        expect(result).toBe(1);
      });
    });

    describe('origin type', () => {
      test('should return "$A$1" for origin', () => {
        const result = INFO('origin');
        expect(result).toBe('$A$1');
      });
    });

    describe('osversion type', () => {
      test('should return "Web" for OS version', () => {
        const result = INFO('osversion');
        expect(result).toBe('Web');
      });
    });

    describe('recalc type', () => {
      test('should return "Automatic" for recalculation mode', () => {
        const result = INFO('recalc');
        expect(result).toBe('Automatic');
      });
    });

    describe('release type', () => {
      test('should return "16.0" for Excel version', () => {
        const result = INFO('release');
        expect(result).toBe('16.0');
      });
    });

    describe('system type', () => {
      test('should return "Web" for system', () => {
        const result = INFO('system');
        expect(result).toBe('Web');
      });
    });

    describe('case insensitivity', () => {
      test('should handle uppercase type text', () => {
        expect(INFO('DIRECTORY')).toBe('/');
        expect(INFO('NUMFILE')).toBe(1);
        expect(INFO('SYSTEM')).toBe('Web');
      });

      test('should handle mixed case type text', () => {
        expect(INFO('DiReCtOrY')).toBe('/');
        expect(INFO('NuMfIlE')).toBe(1);
        expect(INFO('SyStEm')).toBe('Web');
      });
    });

    describe('error handling', () => {
      test('should return #VALUE! for invalid type', () => {
        const result = INFO('invalid');
        expect(result).toBeInstanceOf(Error);
        expect((result as Error).message).toBe('#VALUE!');
      });

      test('should return #VALUE! for non-string type', () => {
        const result = INFO(42 as any);
        expect(result).toBeInstanceOf(Error);
        expect((result as Error).message).toBe('#VALUE!');
      });

      test('should return #VALUE! for null type', () => {
        const result = INFO(null as any);
        expect(result).toBeInstanceOf(Error);
      });

      test('should return #VALUE! for undefined type', () => {
        const result = INFO(undefined as any);
        expect(result).toBeInstanceOf(Error);
      });
    });

    describe('all types comprehensive', () => {
      test('should handle all 7 supported types', () => {
        const types = [
          ['directory', '/'],
          ['numfile', 1],
          ['origin', '$A$1'],
          ['osversion', 'Web'],
          ['recalc', 'Automatic'],
          ['release', '16.0'],
          ['system', 'Web']
        ] as const;

        types.forEach(([type, expected]) => {
          const result = INFO(type);
          expect(result).toBe(expected);
        });
      });
    });
  });

  describe('Integration Tests', () => {
    test('ISREF should work with CELL reference output', () => {
      // CELL can return reference info, ISREF should validate it
      const cellRef = { row: 5, col: 3 };
      expect(ISREF(cellRef as any)).toBe(true);
    });

    test('CELL should work with various column numbers', () => {
      const ctx = createContext();
      // Test column letter conversion for different ranges
      const testCases: [number, string][] = [
        [0, '$A$1'],     // Column A
        [1, '$B$1'],     // Column B
        [25, '$Z$1'],    // Column Z
        [26, '$AA$1'],   // Column AA (first multi-letter)
        [27, '$AB$1'],   // Column AB
        [51, '$AZ$1'],   // Column AZ
        [52, '$BA$1'],   // Column BA
      ];

      testCases.forEach(([col, expected]) => {
        const result = CELL(ctx, 'address', { row: 0, col } as any);
        expect(result).toBe(expected);
      });
    });

    test('INFO types should match Excel 2016/365 compatibility', () => {
      // Verify we return Excel-compatible values
      expect(INFO('release')).toBe('16.0');
      expect(INFO('recalc')).toBe('Automatic');
    });
  });
});