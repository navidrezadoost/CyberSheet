/**
 * Comprehensive tests for conditional aggregation functions
 * COUNTIF, SUMIF, AVERAGEIF
 */

import { FormulaEngine, FormulaContext, Worksheet, type FormulaValue } from '../src';

describe('Conditional Aggregation Functions', () => {
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

  describe('COUNTIF Function', () => {
    describe('Numeric Criteria', () => {
      test('counts values greater than number', () => {
        const result = engine.evaluate(
          '=COUNTIF(SEQUENCE(10), ">5")',
          context
        );
        
        expect(result).toBe(5); // 6, 7, 8, 9, 10
      });

      test('counts values less than or equal to number', () => {
        const result = engine.evaluate(
          '=COUNTIF(SEQUENCE(10), "<=3")',
          context
        );
        
        expect(result).toBe(3); // 1, 2, 3
      });

      test('counts exact number match', () => {
        const result = engine.evaluate(
          '=COUNTIF(SEQUENCE(10), 5)',
          context
        );
        
        expect(result).toBe(1);
      });

      test('counts not equal to number', () => {
        const result = engine.evaluate(
          '=COUNTIF(SEQUENCE(5), "<>3")',
          context
        );
        
        expect(result).toBe(4); // 1, 2, 4, 5
      });

      test('counts values greater than or equal', () => {
        const result = engine.evaluate(
          '=COUNTIF(SEQUENCE(10), ">=8")',
          context
        );
        
        expect(result).toBe(3); // 8, 9, 10
      });

      test('counts values less than', () => {
        const result = engine.evaluate(
          '=COUNTIF(SEQUENCE(10), "<4")',
          context
        );
        
        expect(result).toBe(3); // 1, 2, 3
      });
    });

    describe('String Criteria', () => {
      test('counts exact string match', () => {
        // Test with cell values in worksheet
        worksheet.setCellValue({ row: 1, col: 1 }, 'Apple');
        worksheet.setCellValue({ row: 2, col: 1 }, 'Banana');
        worksheet.setCellValue({ row: 3, col: 1 }, 'Apple');
        worksheet.setCellValue({ row: 4, col: 1 }, 'Cherry');
        worksheet.setCellValue({ row: 5, col: 1 }, 'Apple');
        
        const result = engine.evaluate(
          '=COUNTIF(A1:A5, "Apple")',
          context
        );
        
        expect(result).toBe(3);
      });

      test('counts with wildcard at end', () => {
        worksheet.setCellValue({ row: 1, col: 1 }, 'Apple');
        worksheet.setCellValue({ row: 2, col: 1 }, 'Apricot');
        worksheet.setCellValue({ row: 3, col: 1 }, 'Banana');
        worksheet.setCellValue({ row: 4, col: 1 }, 'Avocado');
        
        const result = engine.evaluate(
          '=COUNTIF(A1:A4, "A*")',
          context
        );
        
        expect(result).toBe(3); // Apple, Apricot, Avocado
      });

      test('counts with wildcard at start', () => {
        worksheet.setCellValue({ row: 1, col: 1 }, 'Running');
        worksheet.setCellValue({ row: 2, col: 1 }, 'Jumping');
        worksheet.setCellValue({ row: 3, col: 1 }, 'Walking');
        worksheet.setCellValue({ row: 4, col: 1 }, 'Talking');
        
        const result = engine.evaluate(
          '=COUNTIF(A1:A4, "*ing")',
          context
        );
        
        expect(result).toBe(4); // All end with "ing"
      });

      test('counts with wildcard in middle', () => {
        worksheet.setCellValue({ row: 1, col: 1 }, 'test123');
        worksheet.setCellValue({ row: 2, col: 1 }, 'test456');
        worksheet.setCellValue({ row: 3, col: 1 }, 'demo789');
        worksheet.setCellValue({ row: 4, col: 1 }, 'test');
        
        const result = engine.evaluate(
          '=COUNTIF(A1:A4, "test*")',
          context
        );
        
        expect(result).toBe(3); // test123, test456, test
      });

      test('counts with ? wildcard (single char)', () => {
        worksheet.setCellValue({ row: 1, col: 1 }, 'cat');
        worksheet.setCellValue({ row: 2, col: 1 }, 'bat');
        worksheet.setCellValue({ row: 3, col: 1 }, 'rat');
        worksheet.setCellValue({ row: 4, col: 1 }, 'cats');
        
        const result = engine.evaluate(
          '=COUNTIF(A1:A4, "?at")',
          context
        );
        
        expect(result).toBe(3); // cat, bat, rat (not cats)
      });

      test('counts with multiple ? wildcards', () => {
        worksheet.setCellValue({ row: 1, col: 1 }, 'abc');
        worksheet.setCellValue({ row: 2, col: 1 }, 'xyz');
        worksheet.setCellValue({ row: 3, col: 1 }, '123');
        worksheet.setCellValue({ row: 4, col: 1 }, 'a1c');
        
        const result = engine.evaluate(
          '=COUNTIF(A1:A4, "???")',
          context
        );
        
        expect(result).toBe(4); // All 3-char strings
      });

      test('counts all non-empty with *', () => {
        worksheet.setCellValue({ row: 1, col: 1 }, 'a');
        worksheet.setCellValue({ row: 2, col: 1 }, 'b');
        worksheet.setCellValue({ row: 3, col: 1 }, '');
        worksheet.setCellValue({ row: 4, col: 1 }, 'c');
        worksheet.setCellValue({ row: 5, col: 1 }, 'd');
        
        const result = engine.evaluate(
          '=COUNTIF(A1:A5, "*")',
          context
        );
        
        expect(result).toBe(4); // All except empty string
      });
    });

    describe('Edge Cases', () => {
      test('counts in empty range', () => {
        const result = engine.evaluate(
          '=COUNTIF({}, ">0")',
          context
        );
        
        expect(result).toBe(0);
      });

      test('counts with no matches', () => {
        const result = engine.evaluate(
          '=COUNTIF(SEQUENCE(10), ">100")',
          context
        );
        
        expect(result).toBe(0);
      });

      test('counts with mixed types', () => {
        worksheet.setCellValue({ row: 1, col: 1 }, 1);
        worksheet.setCellValue({ row: 2, col: 1 }, '2');
        worksheet.setCellValue({ row: 3, col: 1 }, 3);
        worksheet.setCellValue({ row: 4, col: 1 }, 'four');
        worksheet.setCellValue({ row: 5, col: 1 }, 5);
        
        const result = engine.evaluate(
          '=COUNTIF(A1:A5, ">2")',
          context
        );
        
        expect(result).toBe(2); // 3 and 5
      });

      test('counts boolean values', () => {
        worksheet.setCellValue({ row: 1, col: 1 }, true);
        worksheet.setCellValue({ row: 2, col: 1 }, false);
        worksheet.setCellValue({ row: 3, col: 1 }, true);
        worksheet.setCellValue({ row: 4, col: 1 }, true);
        worksheet.setCellValue({ row: 5, col: 1 }, false);
        
        const result = engine.evaluate(
          '=COUNTIF(A1:A5, TRUE)',
          context
        );
        
        expect(result).toBe(3);
      });
    });

    describe('Integration with Dynamic Arrays', () => {
      test('counts in MAKEARRAY output', () => {
        const result = engine.evaluate(
          '=COUNTIF(MAKEARRAY(10, 1, LAMBDA(r, c, r * 5)), ">25")',
          context
        );
        
        expect(result).toBe(5); // 30, 35, 40, 45, 50
      });

      test('counts in FILTER output', () => {
        const result = engine.evaluate(
          '=LET(data, SEQUENCE(20), filtered, FILTER(data, MOD(data, 2) = 0), COUNTIF(filtered, ">10"))',
          context
        );
        
        expect(result).toBe(5); // 12, 14, 16, 18, 20
      });

      test('counts in CHOOSECOLS output', () => {
        const result = engine.evaluate(
          '=COUNTIF(CHOOSECOLS(MAKEARRAY(10, 3, LAMBDA(r, c, r * c)), 2), ">10")',
          context
        );
        
        expect(result).toBe(5); // Column 2: 2,4,6,8,10,12,14,16,18,20 - >10: 12,14,16,18,20
      });
    });
  });

  describe('SUMIF Function', () => {
    describe('Basic Usage', () => {
      test('sums values greater than threshold', () => {
        const result = engine.evaluate(
          '=SUMIF(SEQUENCE(10), ">5")',
          context
        );
        
        expect(result).toBe(40); // 6+7+8+9+10
      });

      test('sums values less than or equal', () => {
        const result = engine.evaluate(
          '=SUMIF(SEQUENCE(10), "<=3")',
          context
        );
        
        expect(result).toBe(6); // 1+2+3
      });

      test('sums exact matches', () => {
        worksheet.setCellValue({ row: 1, col: 1 }, 5);
        worksheet.setCellValue({ row: 2, col: 1 }, 10);
        worksheet.setCellValue({ row: 3, col: 1 }, 5);
        worksheet.setCellValue({ row: 4, col: 1 }, 15);
        worksheet.setCellValue({ row: 5, col: 1 }, 5);
        worksheet.setCellValue({ row: 6, col: 1 }, 20);
        
        const result = engine.evaluate(
          '=SUMIF(A1:A6, 5)',
          context
        );
        
        expect(result).toBe(15); // 5+5+5
      });

      test('sums not equal to value', () => {
        worksheet.setCellValue({ row: 1, col: 1 }, 1);
        worksheet.setCellValue({ row: 2, col: 1 }, 2);
        worksheet.setCellValue({ row: 3, col: 1 }, 3);
        worksheet.setCellValue({ row: 4, col: 1 }, 4);
        worksheet.setCellValue({ row: 5, col: 1 }, 5);
        
        const result = engine.evaluate(
          '=SUMIF(A1:A5, "<>3")',
          context
        );
        
        expect(result).toBe(12); // 1+2+4+5
      });
    });

    describe('With Separate Sum Range', () => {
      test('sums different range based on criteria', () => {
        // Criteria range in column A
        worksheet.setCellValue({ row: 1, col: 1 }, 100);
        worksheet.setCellValue({ row: 2, col: 1 }, 200);
        worksheet.setCellValue({ row: 3, col: 1 }, 150);
        worksheet.setCellValue({ row: 4, col: 1 }, 300);
        worksheet.setCellValue({ row: 5, col: 1 }, 50);
        
        // Sum range in column B
        worksheet.setCellValue({ row: 1, col: 2 }, 10);
        worksheet.setCellValue({ row: 2, col: 2 }, 20);
        worksheet.setCellValue({ row: 3, col: 2 }, 15);
        worksheet.setCellValue({ row: 4, col: 2 }, 30);
        worksheet.setCellValue({ row: 5, col: 2 }, 5);
        
        const result = engine.evaluate(
          '=SUMIF(A1:A5, ">100", B1:B5)',
          context
        );
        
        expect(result).toBe(65); // 20+15+30 (for 200, 150, 300)
      });

      test('sums with text criteria on first range', () => {
        // Text criteria range in column A
        worksheet.setCellValue({ row: 1, col: 1 }, 'Apple');
        worksheet.setCellValue({ row: 2, col: 1 }, 'Banana');
        worksheet.setCellValue({ row: 3, col: 1 }, 'Apple');
        worksheet.setCellValue({ row: 4, col: 1 }, 'Cherry');
        
        // Values to sum in column B
        worksheet.setCellValue({ row: 1, col: 2 }, 100);
        worksheet.setCellValue({ row: 2, col: 2 }, 200);
        worksheet.setCellValue({ row: 3, col: 2 }, 150);
        worksheet.setCellValue({ row: 4, col: 2 }, 300);
        
        const result = engine.evaluate(
          '=SUMIF(A1:A4, "Apple", B1:B4)',
          context
        );
        
        expect(result).toBe(250); // 100+150
      });

      test('sums with wildcard criteria', () => {
        worksheet.setCellValue({ row: 1, col: 1 }, 'A1');
        worksheet.setCellValue({ row: 2, col: 1 }, 'B2');
        worksheet.setCellValue({ row: 3, col: 1 }, 'A3');
        worksheet.setCellValue({ row: 4, col: 1 }, 'C4');
        
        worksheet.setCellValue({ row: 1, col: 2 }, 10);
        worksheet.setCellValue({ row: 2, col: 2 }, 20);
        worksheet.setCellValue({ row: 3, col: 2 }, 30);
        worksheet.setCellValue({ row: 4, col: 2 }, 40);
        
        const result = engine.evaluate(
          '=SUMIF(A1:A4, "A*", B1:B4)',
          context
        );
        
        expect(result).toBe(40); // 10+30
      });
    });

    describe('Edge Cases', () => {
      test('sums with no matches returns 0', () => {
        const result = engine.evaluate(
          '=SUMIF(SEQUENCE(10), ">100")',
          context
        );
        
        expect(result).toBe(0);
      });

      test('sums empty range returns 0', () => {
        const result = engine.evaluate(
          '=SUMIF({}, ">0")',
          context
        );
        
        expect(result).toBe(0);
      });

      test('returns error with mismatched range sizes', () => {
        worksheet.setCellValue({ row: 1, col: 1 }, 1);
        worksheet.setCellValue({ row: 2, col: 1 }, 2);
        worksheet.setCellValue({ row: 3, col: 1 }, 3);
        
        worksheet.setCellValue({ row: 1, col: 2 }, 10);
        worksheet.setCellValue({ row: 2, col: 2 }, 20);
        
        const result = engine.evaluate(
          '=SUMIF(A1:A3, ">1", B1:B2)',
          context
        );
        
        expect(result instanceof Error).toBe(true);
        expect((result as Error).message).toBe('#VALUE!');
      });

      test('sums ignoring non-numeric values in sum range', () => {
        worksheet.setCellValue({ row: 1, col: 1 }, 1);
        worksheet.setCellValue({ row: 2, col: 1 }, 2);
        worksheet.setCellValue({ row: 3, col: 1 }, 3);
        worksheet.setCellValue({ row: 4, col: 1 }, 4);
        
        worksheet.setCellValue({ row: 1, col: 2 }, 10);
        worksheet.setCellValue({ row: 2, col: 2 }, 'text');
        worksheet.setCellValue({ row: 3, col: 2 }, 30);
        worksheet.setCellValue({ row: 4, col: 2 }, 40);
        
        const result = engine.evaluate(
          '=SUMIF(A1:A4, ">0", B1:B4)',
          context
        );
        
        expect(result).toBe(80); // 10+30+40 (ignores "text")
      });
    });

    describe('Integration with Dynamic Arrays', () => {
      test('sums MAKEARRAY output', () => {
        const result = engine.evaluate(
          '=SUMIF(MAKEARRAY(10, 1, LAMBDA(r, c, r)), ">5")',
          context
        );
        
        expect(result).toBe(40); // 6+7+8+9+10
      });

      test('sums with CHOOSECOLS criteria and sum range', () => {
        const result = engine.evaluate(
          '=SUMIF(CHOOSECOLS(MAKEARRAY(5, 3, LAMBDA(r, c, r * 10 + c)), 1), ">20", CHOOSECOLS(MAKEARRAY(5, 3, LAMBDA(r, c, r * 10 + c)), 3))',
          context
        );
        
        // Column 1: 11, 21, 31, 41, 51 - match >20: 21, 31, 41, 51
        // Column 3: 13, 23, 33, 43, 53 - sum: 23+33+43+53 = 152
        expect(result).toBe(152);
      });

      test('sums large SEQUENCE output', () => {
        const result = engine.evaluate(
          '=SUMIF(SEQUENCE(1000), ">990")',
          context
        );
        
        expect(result).toBe(9955); // 991+992+...+1000
      });
    });
  });

  describe('AVERAGEIF Function', () => {
    describe('Basic Usage', () => {
      test('averages values greater than threshold', () => {
        const result = engine.evaluate(
          '=AVERAGEIF(SEQUENCE(10), ">5")',
          context
        );
        
        expect(result).toBe(8); // (6+7+8+9+10)/5
      });

      test('averages values less than or equal', () => {
        const result = engine.evaluate(
          '=AVERAGEIF(SEQUENCE(10), "<=3")',
          context
        );
        
        expect(result).toBe(2); // (1+2+3)/3
      });

      test('averages exact matches', () => {
        worksheet.setCellValue({ row: 1, col: 1 }, 5);
        worksheet.setCellValue({ row: 2, col: 1 }, 10);
        worksheet.setCellValue({ row: 3, col: 1 }, 5);
        worksheet.setCellValue({ row: 4, col: 1 }, 15);
        worksheet.setCellValue({ row: 5, col: 1 }, 5);
        worksheet.setCellValue({ row: 6, col: 1 }, 20);
        
        const result = engine.evaluate(
          '=AVERAGEIF(A1:A6, 5)',
          context
        );
        
        expect(result).toBe(5); // (5+5+5)/3
      });

      test('averages not equal to value', () => {
        worksheet.setCellValue({ row: 1, col: 1 }, 1);
        worksheet.setCellValue({ row: 2, col: 1 }, 2);
        worksheet.setCellValue({ row: 3, col: 1 }, 3);
        worksheet.setCellValue({ row: 4, col: 1 }, 4);
        worksheet.setCellValue({ row: 5, col: 1 }, 5);
        
        const result = engine.evaluate(
          '=AVERAGEIF(A1:A5, "<>3")',
          context
        );
        
        expect(result).toBe(3); // (1+2+4+5)/4
      });
    });

    describe('With Separate Average Range', () => {
      test('averages different range based on criteria', () => {
        worksheet.setCellValue({ row: 1, col: 1 }, 100);
        worksheet.setCellValue({ row: 2, col: 1 }, 200);
        worksheet.setCellValue({ row: 3, col: 1 }, 150);
        worksheet.setCellValue({ row: 4, col: 1 }, 300);
        worksheet.setCellValue({ row: 5, col: 1 }, 50);
        
        worksheet.setCellValue({ row: 1, col: 2 }, 10);
        worksheet.setCellValue({ row: 2, col: 2 }, 20);
        worksheet.setCellValue({ row: 3, col: 2 }, 15);
        worksheet.setCellValue({ row: 4, col: 2 }, 30);
        worksheet.setCellValue({ row: 5, col: 2 }, 5);
        
        const result = engine.evaluate(
          '=AVERAGEIF(A1:A5, ">100", B1:B5)',
          context
        );
        
        expect(result).toBeCloseTo(21.67, 2); // (20+15+30)/3
      });

      test('averages with text criteria', () => {
        worksheet.setCellValue({ row: 1, col: 1 }, 'Apple');
        worksheet.setCellValue({ row: 2, col: 1 }, 'Banana');
        worksheet.setCellValue({ row: 3, col: 1 }, 'Apple');
        worksheet.setCellValue({ row: 4, col: 1 }, 'Cherry');
        
        worksheet.setCellValue({ row: 1, col: 2 }, 100);
        worksheet.setCellValue({ row: 2, col: 2 }, 200);
        worksheet.setCellValue({ row: 3, col: 2 }, 150);
        worksheet.setCellValue({ row: 4, col: 2 }, 300);
        
        const result = engine.evaluate(
          '=AVERAGEIF(A1:A4, "Apple", B1:B4)',
          context
        );
        
        expect(result).toBe(125); // (100+150)/2
      });

      test('averages with wildcard criteria', () => {
        worksheet.setCellValue({ row: 1, col: 1 }, 'A1');
        worksheet.setCellValue({ row: 2, col: 1 }, 'B2');
        worksheet.setCellValue({ row: 3, col: 1 }, 'A3');
        worksheet.setCellValue({ row: 4, col: 1 }, 'C4');
        
        worksheet.setCellValue({ row: 1, col: 2 }, 10);
        worksheet.setCellValue({ row: 2, col: 2 }, 20);
        worksheet.setCellValue({ row: 3, col: 2 }, 30);
        worksheet.setCellValue({ row: 4, col: 2 }, 40);
        
        const result = engine.evaluate(
          '=AVERAGEIF(A1:A4, "A*", B1:B4)',
          context
        );
        
        expect(result).toBe(20); // (10+30)/2
      });
    });

    describe('Edge Cases', () => {
      test('returns DIV/0 error with no matches', () => {
        const result = engine.evaluate(
          '=AVERAGEIF(SEQUENCE(10), ">100")',
          context
        );
        
        expect(result instanceof Error).toBe(true);
        expect((result as Error).message).toBe('#DIV/0!');
      });

      test('returns DIV/0 error with empty range', () => {
        const result = engine.evaluate(
          '=AVERAGEIF({}, ">0")',
          context
        );
        
        expect(result instanceof Error).toBe(true);
        expect((result as Error).message).toBe('#DIV/0!');
      });

      test('returns error with mismatched range sizes', () => {
        worksheet.setCellValue({ row: 1, col: 1 }, 1);
        worksheet.setCellValue({ row: 2, col: 1 }, 2);
        worksheet.setCellValue({ row: 3, col: 1 }, 3);
        
        worksheet.setCellValue({ row: 1, col: 2 }, 10);
        worksheet.setCellValue({ row: 2, col: 2 }, 20);
        
        const result = engine.evaluate(
          '=AVERAGEIF(A1:A3, ">1", B1:B2)',
          context
        );
        
        expect(result instanceof Error).toBe(true);
        expect((result as Error).message).toBe('#VALUE!');
      });

      test('averages ignoring non-numeric values', () => {
        worksheet.setCellValue({ row: 1, col: 1 }, 1);
        worksheet.setCellValue({ row: 2, col: 1 }, 2);
        worksheet.setCellValue({ row: 3, col: 1 }, 3);
        worksheet.setCellValue({ row: 4, col: 1 }, 4);
        
        worksheet.setCellValue({ row: 1, col: 2 }, 10);
        worksheet.setCellValue({ row: 2, col: 2 }, 'text');
        worksheet.setCellValue({ row: 3, col: 2 }, 30);
        worksheet.setCellValue({ row: 4, col: 2 }, 40);
        
        const result = engine.evaluate(
          '=AVERAGEIF(A1:A4, ">0", B1:B4)',
          context
        );
        
        expect(result).toBeCloseTo(26.67, 2); // (10+30+40)/3
      });
    });

    describe('Integration with Dynamic Arrays', () => {
      test('averages MAKEARRAY output', () => {
        const result = engine.evaluate(
          '=AVERAGEIF(MAKEARRAY(10, 1, LAMBDA(r, c, r)), ">5")',
          context
        );
        
        expect(result).toBe(8); // (6+7+8+9+10)/5
      });

      test('averages with CHOOSECOLS', () => {
        const result = engine.evaluate(
          '=AVERAGEIF(CHOOSECOLS(MAKEARRAY(5, 3, LAMBDA(r, c, r * 10 + c)), 1), ">20", CHOOSECOLS(MAKEARRAY(5, 3, LAMBDA(r, c, r * 10 + c)), 3))',
          context
        );
        
        // Column 1: 11, 21, 31, 41, 51 - match >20: 21, 31, 41, 51 (4 matches)
        // Column 3: 13, 23, 33, 43, 53 - sum: 23+33+43+53 = 152
        // Average: 152/4 = 38
        expect(result).toBe(38);
      });

      test('averages with FILTER output', () => {
        const result = engine.evaluate(
          '=LET(data, SEQUENCE(20), evens, FILTER(data, MOD(data, 2) = 0), AVERAGEIF(evens, ">10"))',
          context
        );
        
        expect(result).toBe(16); // (12+14+16+18+20)/5
      });
    });
  });

  describe('Combined Scenarios', () => {
    test('use all three functions on same data', () => {
      const count = engine.evaluate(
        '=COUNTIF(SEQUENCE(100), ">50")',
        context
      );
      const sum = engine.evaluate(
        '=SUMIF(SEQUENCE(100), ">50")',
        context
      );
      const avg = engine.evaluate(
        '=AVERAGEIF(SEQUENCE(100), ">50")',
        context
      );
      
      expect(count).toBe(50);
      expect(sum).toBe(3775); // 51+52+...+100
      expect(avg).toBe(75.5); // sum/count
    });

    test('nested criteria with dynamic arrays', () => {
      const result = engine.evaluate(
        '=SUMIF(TAKE(SEQUENCE(100), 20), ">=10")',
        context
      );
      
      expect(result).toBe(165); // 10+11+...+20
    });

    test('complex business scenario', () => {
      // Sales data: quantities and prices
      // Quantities in column A
      worksheet.setCellValue({ row: 1, col: 1 }, 100);
      worksheet.setCellValue({ row: 2, col: 1 }, 200);
      worksheet.setCellValue({ row: 3, col: 1 }, 150);
      worksheet.setCellValue({ row: 4, col: 1 }, 300);
      worksheet.setCellValue({ row: 5, col: 1 }, 50);
      
      // Prices in column B
      worksheet.setCellValue({ row: 1, col: 2 }, 10);
      worksheet.setCellValue({ row: 2, col: 2 }, 20);
      worksheet.setCellValue({ row: 3, col: 2 }, 15);
      worksheet.setCellValue({ row: 4, col: 2 }, 30);
      worksheet.setCellValue({ row: 5, col: 2 }, 5);
      
      const result = engine.evaluate(
        '=SUMIF(A1:A5, ">100", B1:B5)',
        context
      );
      
      expect(result).toBe(65); // 20+15+30 for quantities >100
    });
  });

  describe('Performance Tests', () => {
    test('handles large range efficiently', () => {
      const start = Date.now();
      const result = engine.evaluate(
        '=COUNTIF(SEQUENCE(10000), ">5000")',
        context
      );
      const duration = Date.now() - start;
      
      expect(result).toBe(5000);
      expect(duration).toBeLessThan(100); // Should be fast
    });

    test('complex wildcard on large dataset', () => {
      const result = engine.evaluate(
        '=COUNTIF(MAKEARRAY(1000, 1, LAMBDA(r, c, IF(MOD(r, 3) = 0, "test", "demo"))), "test")',
        context
      );
      
      expect(result).toBe(333); // Every 3rd row
    });
  });
});
