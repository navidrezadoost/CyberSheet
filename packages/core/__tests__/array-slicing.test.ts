/**
 * Comprehensive tests for array slicing functions
 * TAKE, DROP, CHOOSECOLS, CHOOSEROWS
 */

import { FormulaEngine, FormulaContext, Worksheet, type FormulaValue } from '../src';

describe('Array Slicing Functions', () => {
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
    
    // Set up test data in worksheet
    // A1:E5 = numbers 1-25
    for (let r = 1; r <= 5; r++) {
      for (let c = 1; c <= 5; c++) {
        worksheet.setCellValue({ row: r, col: c }, (r - 1) * 5 + c);
      }
    }
  });

  describe('TAKE Function', () => {
    describe('Basic Usage', () => {
      test('takes first N rows from 1D array', () => {
        const result = engine.evaluate(
          '=TAKE(SEQUENCE(10), 3)',
          context
        ) as FormulaValue[];
        
        expect(result).toEqual([1, 2, 3]);
      });

      test('takes last N rows from 1D array (negative)', () => {
        const result = engine.evaluate(
          '=TAKE(SEQUENCE(10), -3)',
          context
        ) as FormulaValue[];
        
        expect(result).toEqual([8, 9, 10]);
      });

      test('takes first N rows from 2D array', () => {
        const result = engine.evaluate(
          '=TAKE(MAKEARRAY(5, 3, LAMBDA(r, c, r * 10 + c)), 2)',
          context
        ) as FormulaValue[][];
        
        expect(result).toEqual([
          [11, 12, 13],
          [21, 22, 23]
        ]);
      });

      test('takes last N rows from 2D array', () => {
        const result = engine.evaluate(
          '=TAKE(MAKEARRAY(5, 3, LAMBDA(r, c, r * 10 + c)), -2)',
          context
        ) as FormulaValue[][];
        
        expect(result).toEqual([
          [41, 42, 43],
          [51, 52, 53]
        ]);
      });
    });

    describe('With Columns Parameter', () => {
      test('takes rows and columns from start', () => {
        const result = engine.evaluate(
          '=TAKE(MAKEARRAY(5, 5, LAMBDA(r, c, r * 10 + c)), 3, 2)',
          context
        ) as FormulaValue[][];
        
        expect(result).toEqual([
          [11, 12],
          [21, 22],
          [31, 32]
        ]);
      });

      test('takes rows from start, columns from end', () => {
        const result = engine.evaluate(
          '=TAKE(MAKEARRAY(5, 5, LAMBDA(r, c, r * 10 + c)), 3, -2)',
          context
        ) as FormulaValue[][];
        
        expect(result).toEqual([
          [14, 15],
          [24, 25],
          [34, 35]
        ]);
      });

      test('takes rows from end, columns from start', () => {
        const result = engine.evaluate(
          '=TAKE(MAKEARRAY(5, 5, LAMBDA(r, c, r * 10 + c)), -2, 3)',
          context
        ) as FormulaValue[][];
        
        expect(result).toEqual([
          [41, 42, 43],
          [51, 52, 53]
        ]);
      });

      test('takes rows and columns from end', () => {
        const result = engine.evaluate(
          '=TAKE(MAKEARRAY(5, 5, LAMBDA(r, c, r * 10 + c)), -2, -2)',
          context
        ) as FormulaValue[][];
        
        expect(result).toEqual([
          [44, 45],
          [54, 55]
        ]);
      });
    });

    describe('Integration with MAKEARRAY', () => {
      test('takes first 10 rows of multiplication table', () => {
        const result = engine.evaluate(
          '=TAKE(MAKEARRAY(100, 5, LAMBDA(r, c, r * c)), 10)',
          context
        ) as FormulaValue[][];
        
        expect(result.length).toBe(10);
        expect(result[0]).toEqual([1, 2, 3, 4, 5]);
        expect(result[9]).toEqual([10, 20, 30, 40, 50]);
      });

      test('takes last 5 rows of array', () => {
        const result = engine.evaluate(
          '=TAKE(MAKEARRAY(20, 3, LAMBDA(r, c, r + c)), -5)',
          context
        ) as FormulaValue[][];
        
        expect(result.length).toBe(5);
        expect(result[0]).toEqual([17, 18, 19]);
        expect(result[4]).toEqual([21, 22, 23]);
      });
    });

    describe('Edge Cases', () => {
      test('takes all rows', () => {
        const result = engine.evaluate(
          '=TAKE(SEQUENCE(5), 5)',
          context
        ) as FormulaValue[];
        
        expect(result).toEqual([1, 2, 3, 4, 5]);
      });

      test('takes single element', () => {
        const result = engine.evaluate(
          '=TAKE(SEQUENCE(10), 1)',
          context
        );
        
        expect(result).toBe(1);
      });

      test('returns error when taking more than available', () => {
        const result = engine.evaluate(
          '=TAKE(SEQUENCE(5), 10)',
          context
        );
        
        expect(result instanceof Error).toBe(true);
        expect((result as Error).message).toBe('#VALUE!');
      });

      test('returns error with zero rows', () => {
        const result = engine.evaluate(
          '=TAKE(SEQUENCE(5), 0)',
          context
        );
        
        expect(result instanceof Error).toBe(true);
      });
    });
  });

  describe('DROP Function', () => {
    describe('Basic Usage', () => {
      test('drops first N rows from 1D array', () => {
        const result = engine.evaluate(
          '=DROP(SEQUENCE(10), 3)',
          context
        ) as FormulaValue[];
        
        expect(result).toEqual([4, 5, 6, 7, 8, 9, 10]);
      });

      test('drops last N rows from 1D array (negative)', () => {
        const result = engine.evaluate(
          '=DROP(SEQUENCE(10), -3)',
          context
        ) as FormulaValue[];
        
        expect(result).toEqual([1, 2, 3, 4, 5, 6, 7]);
      });

      test('drops first N rows from 2D array', () => {
        const result = engine.evaluate(
          '=DROP(MAKEARRAY(5, 3, LAMBDA(r, c, r * 10 + c)), 2)',
          context
        ) as FormulaValue[][];
        
        expect(result).toEqual([
          [31, 32, 33],
          [41, 42, 43],
          [51, 52, 53]
        ]);
      });

      test('drops last N rows from 2D array', () => {
        const result = engine.evaluate(
          '=DROP(MAKEARRAY(5, 3, LAMBDA(r, c, r * 10 + c)), -2)',
          context
        ) as FormulaValue[][];
        
        expect(result).toEqual([
          [11, 12, 13],
          [21, 22, 23],
          [31, 32, 33]
        ]);
      });
    });

    describe('With Columns Parameter', () => {
      test('drops rows and columns from start', () => {
        const result = engine.evaluate(
          '=DROP(MAKEARRAY(5, 5, LAMBDA(r, c, r * 10 + c)), 1, 1)',
          context
        ) as FormulaValue[][];
        
        expect(result).toEqual([
          [22, 23, 24, 25],
          [32, 33, 34, 35],
          [42, 43, 44, 45],
          [52, 53, 54, 55]
        ]);
      });

      test('drops rows from start, columns from end', () => {
        const result = engine.evaluate(
          '=DROP(MAKEARRAY(5, 5, LAMBDA(r, c, r * 10 + c)), 2, -2)',
          context
        ) as FormulaValue[][];
        
        expect(result).toEqual([
          [31, 32, 33],
          [41, 42, 43],
          [51, 52, 53]
        ]);
      });

      test('drops rows from end, columns from start', () => {
        const result = engine.evaluate(
          '=DROP(MAKEARRAY(5, 5, LAMBDA(r, c, r * 10 + c)), -2, 1)',
          context
        ) as FormulaValue[][];
        
        expect(result).toEqual([
          [12, 13, 14, 15],
          [22, 23, 24, 25],
          [32, 33, 34, 35]
        ]);
      });
    });

    describe('Integration Examples', () => {
      test('drops first 5 columns from wide array', () => {
        const result = engine.evaluate(
          '=DROP(MAKEARRAY(3, 10, LAMBDA(r, c, r * 100 + c)), 0, 5)',
          context
        ) as FormulaValue[][];
        
        // Should drop first 5 columns, leaving columns 6-10
        expect(result.length).toBe(3);
        expect(result[0]).toEqual([106, 107, 108, 109, 110]);
        expect(result[2]).toEqual([306, 307, 308, 309, 310]);
      });

      test('drops header row', () => {
        const result = engine.evaluate(
          '=DROP(MAKEARRAY(10, 3, LAMBDA(r, c, r * 10 + c)), 1)',
          context
        ) as FormulaValue[][];
        
        expect(result.length).toBe(9);
        expect(result[0]).toEqual([21, 22, 23]);
      });
    });

    describe('Edge Cases', () => {
      test('drops one row', () => {
        const result = engine.evaluate(
          '=DROP(SEQUENCE(5), 1)',
          context
        ) as FormulaValue[];
        
        expect(result).toEqual([2, 3, 4, 5]);
      });

      test('returns error when dropping all rows', () => {
        const result = engine.evaluate(
          '=DROP(SEQUENCE(5), 5)',
          context
        );
        
        expect(result instanceof Error).toBe(true);
      });

      test('returns error when dropping more than available', () => {
        const result = engine.evaluate(
          '=DROP(SEQUENCE(5), 10)',
          context
        );
        
        expect(result instanceof Error).toBe(true);
      });
    });
  });

  describe('CHOOSECOLS Function', () => {
    describe('Basic Usage', () => {
      test('selects single column', () => {
        const result = engine.evaluate(
          '=CHOOSECOLS(MAKEARRAY(3, 5, LAMBDA(r, c, r * 10 + c)), 2)',
          context
        ) as FormulaValue[];
        
        expect(result).toEqual([12, 22, 32]);
      });

      test('selects multiple columns in order', () => {
        const result = engine.evaluate(
          '=CHOOSECOLS(MAKEARRAY(3, 5, LAMBDA(r, c, r * 10 + c)), 1, 3, 5)',
          context
        ) as FormulaValue[][];
        
        expect(result).toEqual([
          [11, 13, 15],
          [21, 23, 25],
          [31, 33, 35]
        ]);
      });

      test('selects columns in reverse order', () => {
        const result = engine.evaluate(
          '=CHOOSECOLS(MAKEARRAY(3, 5, LAMBDA(r, c, r * 10 + c)), 5, 3, 1)',
          context
        ) as FormulaValue[][];
        
        expect(result).toEqual([
          [15, 13, 11],
          [25, 23, 21],
          [35, 33, 31]
        ]);
      });

      test('selects duplicate columns', () => {
        const result = engine.evaluate(
          '=CHOOSECOLS(MAKEARRAY(2, 3, LAMBDA(r, c, r * 10 + c)), 1, 1, 3)',
          context
        ) as FormulaValue[][];
        
        expect(result).toEqual([
          [11, 11, 13],
          [21, 21, 23]
        ]);
      });
    });

    describe('Negative Indices', () => {
      test('selects last column with -1', () => {
        const result = engine.evaluate(
          '=CHOOSECOLS(MAKEARRAY(3, 5, LAMBDA(r, c, r * 10 + c)), -1)',
          context
        ) as FormulaValue[];
        
        expect(result).toEqual([15, 25, 35]);
      });

      test('selects last two columns', () => {
        const result = engine.evaluate(
          '=CHOOSECOLS(MAKEARRAY(3, 5, LAMBDA(r, c, r * 10 + c)), -2, -1)',
          context
        ) as FormulaValue[][];
        
        expect(result).toEqual([
          [14, 15],
          [24, 25],
          [34, 35]
        ]);
      });

      test('mixes positive and negative indices', () => {
        const result = engine.evaluate(
          '=CHOOSECOLS(MAKEARRAY(2, 5, LAMBDA(r, c, r * 10 + c)), 1, -1, 3)',
          context
        ) as FormulaValue[][];
        
        expect(result).toEqual([
          [11, 15, 13],
          [21, 25, 23]
        ]);
      });
    });

    describe('Integration', () => {
      test('selects specific columns from multiplication table', () => {
        const result = engine.evaluate(
          '=CHOOSECOLS(MAKEARRAY(10, 10, LAMBDA(r, c, r * c)), 2, 5, 10)',
          context
        ) as FormulaValue[][];
        
        expect(result.length).toBe(10);
        expect(result[0]).toEqual([2, 5, 10]);
        expect(result[9]).toEqual([20, 50, 100]);
      });

      test('extracts single column and processes with FILTER', () => {
        const result = engine.evaluate(
          '=LET(arr, MAKEARRAY(10, 3, LAMBDA(r, c, r)), col1, CHOOSECOLS(arr, 1), FILTER(col1, MOD(col1, 2) = 0))',
          context
        ) as FormulaValue[];
        
        expect(result).toEqual([2, 4, 6, 8, 10]);
      });
    });

    describe('Error Handling', () => {
      test('returns error with invalid column number', () => {
        const result = engine.evaluate(
          '=CHOOSECOLS(MAKEARRAY(3, 5, LAMBDA(r, c, r)), 10)',
          context
        );
        
        expect(result instanceof Error).toBe(true);
      });

      test('returns error with no column numbers', () => {
        const result = engine.evaluate(
          '=CHOOSECOLS(MAKEARRAY(3, 5, LAMBDA(r, c, r)))',
          context
        );
        
        expect(result instanceof Error).toBe(true);
      });

      test('returns error with zero index', () => {
        const result = engine.evaluate(
          '=CHOOSECOLS(MAKEARRAY(3, 5, LAMBDA(r, c, r)), 0)',
          context
        );
        
        expect(result instanceof Error).toBe(true);
      });
    });
  });

  describe('CHOOSEROWS Function', () => {
    describe('Basic Usage', () => {
      test('selects single row', () => {
        const result = engine.evaluate(
          '=CHOOSEROWS(MAKEARRAY(5, 3, LAMBDA(r, c, r * 10 + c)), 2)',
          context
        ) as FormulaValue[];
        
        expect(result).toEqual([21, 22, 23]);
      });

      test('selects multiple rows in order', () => {
        const result = engine.evaluate(
          '=CHOOSEROWS(MAKEARRAY(5, 3, LAMBDA(r, c, r * 10 + c)), 1, 3, 5)',
          context
        ) as FormulaValue[][];
        
        expect(result).toEqual([
          [11, 12, 13],
          [31, 32, 33],
          [51, 52, 53]
        ]);
      });

      test('selects rows in reverse order', () => {
        const result = engine.evaluate(
          '=CHOOSEROWS(MAKEARRAY(5, 3, LAMBDA(r, c, r * 10 + c)), 5, 3, 1)',
          context
        ) as FormulaValue[][];
        
        expect(result).toEqual([
          [51, 52, 53],
          [31, 32, 33],
          [11, 12, 13]
        ]);
      });

      test('selects duplicate rows', () => {
        const result = engine.evaluate(
          '=CHOOSEROWS(MAKEARRAY(3, 2, LAMBDA(r, c, r * 10 + c)), 1, 1, 3)',
          context
        ) as FormulaValue[][];
        
        expect(result).toEqual([
          [11, 12],
          [11, 12],
          [31, 32]
        ]);
      });
    });

    describe('Negative Indices', () => {
      test('selects last row with -1', () => {
        const result = engine.evaluate(
          '=CHOOSEROWS(MAKEARRAY(5, 3, LAMBDA(r, c, r * 10 + c)), -1)',
          context
        ) as FormulaValue[];
        
        expect(result).toEqual([51, 52, 53]);
      });

      test('selects last two rows', () => {
        const result = engine.evaluate(
          '=CHOOSEROWS(MAKEARRAY(5, 3, LAMBDA(r, c, r * 10 + c)), -2, -1)',
          context
        ) as FormulaValue[][];
        
        expect(result).toEqual([
          [41, 42, 43],
          [51, 52, 53]
        ]);
      });

      test('mixes positive and negative indices', () => {
        const result = engine.evaluate(
          '=CHOOSEROWS(MAKEARRAY(5, 2, LAMBDA(r, c, r * 10 + c)), 1, -1, 3)',
          context
        ) as FormulaValue[][];
        
        expect(result).toEqual([
          [11, 12],
          [51, 52],
          [31, 32]
        ]);
      });
    });

    describe('1D Array Support', () => {
      test('selects rows from 1D array', () => {
        const result = engine.evaluate(
          '=CHOOSEROWS(SEQUENCE(10), 2, 5, 8)',
          context
        ) as FormulaValue[];
        
        expect(result).toEqual([2, 5, 8]);
      });

      test('selects single row from 1D array', () => {
        const result = engine.evaluate(
          '=CHOOSEROWS(SEQUENCE(10), 7)',
          context
        );
        
        expect(result).toBe(7);
      });
    });

    describe('Integration', () => {
      test('selects specific rows from large array', () => {
        const result = engine.evaluate(
          '=CHOOSEROWS(MAKEARRAY(100, 5, LAMBDA(r, c, r * c)), 10, 50, 100)',
          context
        ) as FormulaValue[][];
        
        expect(result.length).toBe(3);
        expect(result[0]).toEqual([10, 20, 30, 40, 50]);
        expect(result[1]).toEqual([50, 100, 150, 200, 250]);
        expect(result[2]).toEqual([100, 200, 300, 400, 500]);
      });

      test('combines with CHOOSECOLS', () => {
        const result = engine.evaluate(
          '=CHOOSECOLS(CHOOSEROWS(MAKEARRAY(10, 10, LAMBDA(r, c, r * c)), 5, 10), 2, 5)',
          context
        ) as FormulaValue[][];
        
        expect(result).toEqual([
          [10, 25],
          [20, 50]
        ]);
      });
    });

    describe('Error Handling', () => {
      test('returns error with invalid row number', () => {
        const result = engine.evaluate(
          '=CHOOSEROWS(MAKEARRAY(5, 3, LAMBDA(r, c, r)), 10)',
          context
        );
        
        expect(result instanceof Error).toBe(true);
      });

      test('returns error with no row numbers', () => {
        const result = engine.evaluate(
          '=CHOOSEROWS(MAKEARRAY(5, 3, LAMBDA(r, c, r)))',
          context
        );
        
        expect(result instanceof Error).toBe(true);
      });

      test('returns error with zero index', () => {
        const result = engine.evaluate(
          '=CHOOSEROWS(MAKEARRAY(5, 3, LAMBDA(r, c, r)), 0)',
          context
        );
        
        expect(result instanceof Error).toBe(true);
      });
    });
  });

  describe('Combined Slicing Operations', () => {
    test('TAKE then CHOOSECOLS', () => {
      const result = engine.evaluate(
        '=CHOOSECOLS(TAKE(MAKEARRAY(10, 10, LAMBDA(r, c, r * c)), 5), 1, 5, 10)',
        context
      ) as FormulaValue[][];
      
      expect(result).toEqual([
        [1, 5, 10],
        [2, 10, 20],
        [3, 15, 30],
        [4, 20, 40],
        [5, 25, 50]
      ]);
    });

    test('DROP then CHOOSEROWS', () => {
      const result = engine.evaluate(
        '=CHOOSEROWS(DROP(MAKEARRAY(10, 3, LAMBDA(r, c, r * 10 + c)), 2), 1, 3)',
        context
      ) as FormulaValue[][];
      
      expect(result).toEqual([
        [31, 32, 33],
        [51, 52, 53]
      ]);
    });

    test('Complex pipeline: MAKEARRAY → TAKE → CHOOSECOLS → CHOOSEROWS', () => {
      const result = engine.evaluate(
        '=CHOOSEROWS(CHOOSECOLS(TAKE(MAKEARRAY(20, 10, LAMBDA(r, c, r + c)), 10), 2, 5, 8), 1, 5, 10)',
        context
      ) as FormulaValue[][];
      
      expect(result.length).toBe(3);
      expect(result[0].length).toBe(3);
    });
  });
});
