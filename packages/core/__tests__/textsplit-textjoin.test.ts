/**
 * textsplit-textjoin.test.ts
 * 
 * Tests for TEXTSPLIT and TEXTJOIN functions
 * Week 5, Day 1: String splitting and joining with delimiters
 */

import { FormulaEngine, FormulaContext, Worksheet } from '../src';
import type { FormulaValue } from '../src/types/formula-types';

describe('TEXTSPLIT and TEXTJOIN Functions', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;
  let context: FormulaContext;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Sheet1', 100, 26);
    context = {
      worksheet,
      currentCell: { row: 1, col: 1 },
      namedLambdas: new Map()
    } as FormulaContext;
  });

  describe('TEXTSPLIT Function', () => {
    describe('Basic Column Splitting', () => {
      test('splits by single character delimiter', () => {
        const result = engine.evaluate(
          '=TEXTSPLIT("Apple,Banana,Cherry", ",")',
          context
        );
        
        expect(result).toEqual([['Apple', 'Banana', 'Cherry']]);
      });

      test('splits by multi-character delimiter', () => {
        const result = engine.evaluate(
          '=TEXTSPLIT("Apple::Banana::Cherry", "::")',
          context
        );
        
        expect(result).toEqual([['Apple', 'Banana', 'Cherry']]);
      });

      test('splits with spaces in values', () => {
        const result = engine.evaluate(
          '=TEXTSPLIT("First Name,Last Name,Email Address", ",")',
          context
        );
        
        expect(result).toEqual([['First Name', 'Last Name', 'Email Address']]);
      });

      test('splits single value (no delimiter found)', () => {
        const result = engine.evaluate(
          '=TEXTSPLIT("NoDelimiter", ",")',
          context
        );
        
        expect(result).toEqual([['NoDelimiter']]);
      });

      test('splits with delimiter at start', () => {
        const result = engine.evaluate(
          '=TEXTSPLIT(",Apple,Banana", ",")',
          context
        );
        
        expect(result).toEqual([['', 'Apple', 'Banana']]);
      });

      test('splits with delimiter at end', () => {
        const result = engine.evaluate(
          '=TEXTSPLIT("Apple,Banana,", ",")',
          context
        );
        
        expect(result).toEqual([['Apple', 'Banana', '']]);
      });

      test('handles consecutive delimiters', () => {
        const result = engine.evaluate(
          '=TEXTSPLIT("Apple,,Cherry", ",")',
          context
        );
        
        expect(result).toEqual([['Apple', '', 'Cherry']]);
      });
    });

    describe('Column Splitting with ignoreEmpty', () => {
      test('ignores empty values when TRUE', () => {
        const result = engine.evaluate(
          '=TEXTSPLIT("Apple,,Cherry", ",", , TRUE)',
          context
        );
        
        expect(result).toEqual([['Apple', 'Cherry']]);
      });

      test('keeps empty values when FALSE', () => {
        const result = engine.evaluate(
          '=TEXTSPLIT("Apple,,Cherry", ",", , FALSE)',
          context
        );
        
        expect(result).toEqual([['Apple', '', 'Cherry']]);
      });

      test('ignores empty at edges', () => {
        const result = engine.evaluate(
          '=TEXTSPLIT(",Apple,Banana,", ",", , TRUE)',
          context
        );
        
        expect(result).toEqual([['Apple', 'Banana']]);
      });

      test('ignores multiple consecutive empty', () => {
        const result = engine.evaluate(
          '=TEXTSPLIT("Apple,,,Cherry", ",", , TRUE)',
          context
        );
        
        expect(result).toEqual([['Apple', 'Cherry']]);
      });
    });

    describe('2D Splitting (Row and Column Delimiters)', () => {
      test('splits into 2D array with row and column delimiters', () => {
        const result = engine.evaluate(
          '=TEXTSPLIT("A,B;C,D", ",", ";")',
          context
        );
        
        expect(result).toEqual([
          ['A', 'B'],
          ['C', 'D']
        ]);
      });

      test('splits CSV-like data', () => {
        const result = engine.evaluate(
          '=TEXTSPLIT("Name,Age;John,30;Jane,25", ",", ";")',
          context
        );
        
        expect(result).toEqual([
          ['Name', 'Age'],
          ['John', '30'],
          ['Jane', '25']
        ]);
      });

      test('pads uneven rows with #N/A', () => {
        const result = engine.evaluate(
          '=TEXTSPLIT("A,B,C;D,E", ",", ";")',
          context
        ) as FormulaValue[][];
        
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual(['A', 'B', 'C']);
        expect(result[1][0]).toBe('D');
        expect(result[1][1]).toBe('E');
        expect(result[1][2]).toBeInstanceOf(Error);
        expect((result[1][2] as Error).message).toBe('#N/A');
      });

      test('custom padding value', () => {
        const result = engine.evaluate(
          '=TEXTSPLIT("A,B,C;D,E", ",", ";", FALSE, 0, "")',
          context
        );
        
        expect(result).toEqual([
          ['A', 'B', 'C'],
          ['D', 'E', '']
        ]);
      });

      test('ignores empty rows and columns in 2D', () => {
        const result = engine.evaluate(
          '=TEXTSPLIT("A,,C;D,E,F", ",", ";", TRUE)',
          context
        );
        
        expect(result).toEqual([
          ['A', 'C'],
          ['D', 'E', 'F']
        ]);
      });
    });

    describe('Case-Insensitive Matching', () => {
      test('case-sensitive split (default)', () => {
        const result = engine.evaluate(
          '=TEXTSPLIT("AppleXbananaXcherry", "X")',
          context
        );
        
        expect(result).toEqual([['Apple', 'banana', 'cherry']]);
      });

      test('case-insensitive split', () => {
        const result = engine.evaluate(
          '=TEXTSPLIT("AppleXbananaXcherry", "x", , FALSE, 1)',
          context
        );
        
        expect(result).toEqual([['Apple', 'banana', 'cherry']]);
      });

      test('case-insensitive with mixed case delimiter', () => {
        const result = engine.evaluate(
          '=TEXTSPLIT("AppleANDbananaAndcherry", "and", , FALSE, 1)',
          context
        );
        
        expect(result).toEqual([['Apple', 'banana', 'cherry']]);
      });
    });

    describe('Edge Cases and Errors', () => {
      test('returns error for empty delimiter', () => {
        const result = engine.evaluate(
          '=TEXTSPLIT("Apple,Banana", "")',
          context
        );
        
        expect(result).toBeInstanceOf(Error);
        expect((result as Error).message).toBe('#VALUE!');
      });

      test('handles empty string input', () => {
        const result = engine.evaluate(
          '=TEXTSPLIT("", ",")',
          context
        );
        
        expect(result).toEqual([['']]);
      });

      test('handles empty string with ignoreEmpty', () => {
        const result = engine.evaluate(
          '=TEXTSPLIT("", ",", , TRUE)',
          context
        );
        
        expect(result).toEqual([[]]);
      });

      test('handles numeric values converted to string', () => {
        const result = engine.evaluate(
          '=TEXTSPLIT("100,200,300", ",")',
          context
        );
        
        expect(result).toEqual([['100', '200', '300']]);
      });

      test('splits with tab delimiter', () => {
        worksheet.setCellValue({ row: 2, col: 1 }, 'Apple\tBanana\tCherry');
        const result = engine.evaluate(
          '=TEXTSPLIT(A2, CHAR(9))',
          context
        );
        
        expect(result).toEqual([['Apple', 'Banana', 'Cherry']]);
      });
    });

    describe('Real-World Examples', () => {
      test('splits full name into parts', () => {
        const result = engine.evaluate(
          '=TEXTSPLIT("John Michael Smith", " ")',
          context
        );
        
        expect(result).toEqual([['John', 'Michael', 'Smith']]);
      });

      test('splits email address', () => {
        const result = engine.evaluate(
          '=TEXTSPLIT("user@example.com", "@")',
          context
        );
        
        expect(result).toEqual([['user', 'example.com']]);
      });

      test('splits file path', () => {
        const result = engine.evaluate(
          '=TEXTSPLIT("/home/user/documents/file.txt", "/")',
          context
        );
        
        expect(result).toEqual([['', 'home', 'user', 'documents', 'file.txt']]);
      });

      test('splits file path ignoring empty', () => {
        const result = engine.evaluate(
          '=TEXTSPLIT("/home/user/documents/file.txt", "/", , TRUE)',
          context
        );
        
        expect(result).toEqual([['home', 'user', 'documents', 'file.txt']]);
      });

      test('parses CSV line', () => {
        const result = engine.evaluate(
          '=TEXTSPLIT("Product,Price,Quantity,SKU", ",")',
          context
        );
        
        expect(result).toEqual([['Product', 'Price', 'Quantity', 'SKU']]);
      });
    });
  });

  describe('TEXTJOIN Function', () => {
    describe('Basic Joining', () => {
      test('joins with comma delimiter', () => {
        const result = engine.evaluate(
          '=TEXTJOIN(", ", FALSE, "Apple", "Banana", "Cherry")',
          context
        );
        
        expect(result).toBe('Apple, Banana, Cherry');
      });

      test('joins with space delimiter', () => {
        const result = engine.evaluate(
          '=TEXTJOIN(" ", FALSE, "Hello", "World")',
          context
        );
        
        expect(result).toBe('Hello World');
      });

      test('joins with no delimiter', () => {
        const result = engine.evaluate(
          '=TEXTJOIN("", FALSE, "A", "B", "C")',
          context
        );
        
        expect(result).toBe('ABC');
      });

      test('joins with multi-character delimiter', () => {
        const result = engine.evaluate(
          '=TEXTJOIN(" | ", FALSE, "Item1", "Item2", "Item3")',
          context
        );
        
        expect(result).toBe('Item1 | Item2 | Item3');
      });

      test('joins single value', () => {
        const result = engine.evaluate(
          '=TEXTJOIN(",", FALSE, "OnlyOne")',
          context
        );
        
        expect(result).toBe('OnlyOne');
      });
    });

    describe('Joining with ignoreEmpty', () => {
      test('ignores empty values when TRUE', () => {
        worksheet.setCellValue({ row: 2, col: 1 }, 'First');
        worksheet.setCellValue({ row: 2, col: 2 }, '');
        worksheet.setCellValue({ row: 2, col: 3 }, 'Last');
        
        const result = engine.evaluate(
          '=TEXTJOIN(" ", TRUE, A2:C2)',
          context
        );
        
        expect(result).toBe('First Last');
      });

      test('keeps empty values when FALSE', () => {
        worksheet.setCellValue({ row: 2, col: 1 }, 'First');
        worksheet.setCellValue({ row: 2, col: 2 }, '');
        worksheet.setCellValue({ row: 2, col: 3 }, 'Last');
        
        const result = engine.evaluate(
          '=TEXTJOIN(" ", FALSE, A2:C2)',
          context
        );
        
        expect(result).toBe('First  Last');
      });

      test('ignores null values', () => {
        const result = engine.evaluate(
          '=TEXTJOIN(",", TRUE, "A", "", "B", "", "C")',
          context
        );
        
        expect(result).toBe('A,B,C');
      });
    });

    describe('Joining Arrays and Ranges', () => {
      test('joins range of values', () => {
        worksheet.setCellValue({ row: 2, col: 1 }, 'Apple');
        worksheet.setCellValue({ row: 2, col: 2 }, 'Banana');
        worksheet.setCellValue({ row: 2, col: 3 }, 'Cherry');
        
        const result = engine.evaluate(
          '=TEXTJOIN(", ", FALSE, A2:C2)',
          context
        );
        
        expect(result).toBe('Apple, Banana, Cherry');
      });

      test('joins vertical range', () => {
        worksheet.setCellValue({ row: 2, col: 1 }, 'Line1');
        worksheet.setCellValue({ row: 3, col: 1 }, 'Line2');
        worksheet.setCellValue({ row: 4, col: 1 }, 'Line3');
        
        const result = engine.evaluate(
          '=TEXTJOIN(CHAR(10), FALSE, A2:A4)',
          context
        );
        
        expect(result).toBe('Line1\nLine2\nLine3');
      });

      test('joins 2D range', () => {
        worksheet.setCellValue({ row: 2, col: 1 }, 'A1');
        worksheet.setCellValue({ row: 2, col: 2 }, 'B1');
        worksheet.setCellValue({ row: 3, col: 1 }, 'A2');
        worksheet.setCellValue({ row: 3, col: 2 }, 'B2');
        
        const result = engine.evaluate(
          '=TEXTJOIN("-", FALSE, A2:B3)',
          context
        );
        
        expect(result).toBe('A1-B1-A2-B2');
      });

      test('joins mixed values and ranges', () => {
        worksheet.setCellValue({ row: 2, col: 1 }, 'Apple');
        worksheet.setCellValue({ row: 2, col: 2 }, 'Banana');
        
        const result = engine.evaluate(
          '=TEXTJOIN(", ", FALSE, "Start", A2:B2, "End")',
          context
        );
        
        expect(result).toBe('Start, Apple, Banana, End');
      });
    });

    describe('Edge Cases', () => {
      test('handles numeric values', () => {
        const result = engine.evaluate(
          '=TEXTJOIN(",", FALSE, 100, 200, 300)',
          context
        );
        
        expect(result).toBe('100,200,300');
      });

      test('handles mixed types', () => {
        const result = engine.evaluate(
          '=TEXTJOIN(" ", FALSE, "Number:", 42, "Boolean:", TRUE)',
          context
        );
        
        expect(result).toBe('Number: 42 Boolean: TRUE');
      });

      test('handles all empty values with ignoreEmpty TRUE', () => {
        const result = engine.evaluate(
          '=TEXTJOIN(",", TRUE, "", "", "")',
          context
        );
        
        expect(result).toBe('');
      });

      test('handles values with errors in formulas', () => {
        worksheet.setCellValue({ row: 2, col: 1 }, 'Valid');
        worksheet.setCellValue({ row: 2, col: 2 }, ''); // Empty value
        worksheet.setCellValue({ row: 2, col: 3 }, 'Also Valid');
        
        const result = engine.evaluate(
          '=TEXTJOIN(",", FALSE, A2:C2)',
          context
        );
        
        expect(result).toBe('Valid,,Also Valid');
      });
    });

    describe('Real-World Examples', () => {
      test('builds full name from parts', () => {
        worksheet.setCellValue({ row: 2, col: 1 }, 'John');
        worksheet.setCellValue({ row: 2, col: 2 }, 'Michael');
        worksheet.setCellValue({ row: 2, col: 3 }, 'Smith');
        
        const result = engine.evaluate(
          '=TEXTJOIN(" ", TRUE, A2:C2)',
          context
        );
        
        expect(result).toBe('John Michael Smith');
      });

      test('builds address from components', () => {
        worksheet.setCellValue({ row: 2, col: 1 }, '123 Main St');
        worksheet.setCellValue({ row: 2, col: 2 }, 'Suite 100');
        worksheet.setCellValue({ row: 2, col: 3 }, 'New York');
        worksheet.setCellValue({ row: 2, col: 4 }, 'NY');
        worksheet.setCellValue({ row: 2, col: 5 }, '10001');
        
        const result = engine.evaluate(
          '=TEXTJOIN(", ", TRUE, A2:E2)',
          context
        );
        
        expect(result).toBe('123 Main St, Suite 100, New York, NY, 10001');
      });

      test('creates comma-separated list', () => {
        worksheet.setCellValue({ row: 2, col: 1 }, 'Red');
        worksheet.setCellValue({ row: 3, col: 1 }, 'Green');
        worksheet.setCellValue({ row: 4, col: 1 }, 'Blue');
        
        const result = engine.evaluate(
          '=TEXTJOIN(", ", TRUE, A2:A4)',
          context
        );
        
        expect(result).toBe('Red, Green, Blue');
      });

      test('builds SQL IN clause', () => {
        worksheet.setCellValue({ row: 2, col: 1 }, 'Apple');
        worksheet.setCellValue({ row: 3, col: 1 }, 'Banana');
        worksheet.setCellValue({ row: 4, col: 1 }, 'Cherry');
        
        const result = engine.evaluate(
          "=TEXTJOIN(\"', '\", TRUE, A2:A4)",
          context
        );
        
        expect(result).toBe("Apple', 'Banana', 'Cherry");
      });
    });
  });

  describe('TEXTSPLIT and TEXTJOIN Integration', () => {
    test('split and rejoin with different delimiter', () => {
      // Split by comma, rejoin by semicolon
      const split = engine.evaluate(
        '=TEXTSPLIT("Apple,Banana,Cherry", ",")',
        context
      ) as FormulaValue[][];
      
      expect(split).toEqual([['Apple', 'Banana', 'Cherry']]);
      
      worksheet.setCellValue({ row: 2, col: 1 }, split[0][0] as string);
      worksheet.setCellValue({ row: 2, col: 2 }, split[0][1] as string);
      worksheet.setCellValue({ row: 2, col: 3 }, split[0][2] as string);
      
      const join = engine.evaluate(
        '=TEXTJOIN(";", FALSE, A2:C2)',
        context
      );
      
      expect(join).toBe('Apple;Banana;Cherry');
    });

    test('split CSV, filter, and rejoin', () => {
      const result = engine.evaluate(
        '=TEXTJOIN(",", TRUE, TEXTSPLIT("Apple,,Cherry,,,Banana", ","))',
        context
      );
      
      expect(result).toBe('Apple,Cherry,Banana');
    });

    test('round-trip: join then split', () => {
      worksheet.setCellValue({ row: 2, col: 1 }, 'First');
      worksheet.setCellValue({ row: 2, col: 2 }, 'Second');
      worksheet.setCellValue({ row: 2, col: 3 }, 'Third');
      
      const joined = engine.evaluate(
        '=TEXTJOIN("|", FALSE, A2:C2)',
        context
      ) as string;
      
      expect(joined).toBe('First|Second|Third');
      
      worksheet.setCellValue({ row: 3, col: 1 }, joined);
      
      const split = engine.evaluate(
        '=TEXTSPLIT(A3, "|")',
        context
      );
      
      expect(split).toEqual([['First', 'Second', 'Third']]);
    });
  });
});
