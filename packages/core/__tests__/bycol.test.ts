import { FormulaEngine, FormulaContext, Worksheet } from '../src';

describe('BYCOL Function', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;
  let context: FormulaContext;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Sheet1', 100, 26);
    context = {
      worksheet,
      currentCell: { row: 0, col: 0 },
      namedLambdas: new Map(),
      recursionDepth: 0
    };
  });

  describe('Basic BYCOL Usage', () => {
    test('applies lambda to single column range', () => {
      // Setup: vertical range A1:A3 with values 1, 2, 3
      worksheet.setCellValue({ row: 1, col: 1 }, 1);
      worksheet.setCellValue({ row: 2, col: 1 }, 2);
      worksheet.setCellValue({ row: 3, col: 1 }, 3);
      
      context.currentCell = { row: 1, col: 2 };
      
      // =BYCOL(A1:A3, LAMBDA(col, SUM(col)))
      const result = engine.evaluate('=BYCOL(A1:A3, LAMBDA(col, SUM(col)))', context);
      expect(result).toEqual([6]); // Sum of column: 1+2+3 = 6
    });

    test('applies lambda to horizontal range (treats as single column)', () => {
      // Setup: horizontal range A1:C1 with values 1, 2, 3
      worksheet.setCellValue({ row: 1, col: 1 }, 1);
      worksheet.setCellValue({ row: 1, col: 2 }, 2);
      worksheet.setCellValue({ row: 1, col: 3 }, 3);
      
      context.currentCell = { row: 2, col: 1 };
      
      // =BYCOL(A1:C1, LAMBDA(col, SUM(col)))
      const result = engine.evaluate('=BYCOL(A1:C1, LAMBDA(col, SUM(col)))', context);
      expect(result).toEqual([6]); // Sum of all values: 1+2+3 = 6
    });

    test('applies lambda with AVERAGE', () => {
      // Setup: column A1:A4 with values 2, 4, 6, 8
      worksheet.setCellValue({ row: 1, col: 1 }, 2);
      worksheet.setCellValue({ row: 2, col: 1 }, 4);
      worksheet.setCellValue({ row: 3, col: 1 }, 6);
      worksheet.setCellValue({ row: 4, col: 1 }, 8);
      
      context.currentCell = { row: 1, col: 2 };
      
      // =BYCOL(A1:A4, LAMBDA(col, AVERAGE(col)))
      const result = engine.evaluate('=BYCOL(A1:A4, LAMBDA(col, AVERAGE(col)))', context);
      expect(result).toEqual([5]); // Average: (2+4+6+8)/4 = 5
    });

    test('applies lambda with MAX', () => {
      // Setup: column A1:A5 with values 10, 25, 15, 30, 20
      worksheet.setCellValue({ row: 1, col: 1 }, 10);
      worksheet.setCellValue({ row: 2, col: 1 }, 25);
      worksheet.setCellValue({ row: 3, col: 1 }, 15);
      worksheet.setCellValue({ row: 4, col: 1 }, 30);
      worksheet.setCellValue({ row: 5, col: 1 }, 20);
      
      context.currentCell = { row: 1, col: 2 };
      
      // =BYCOL(A1:A5, LAMBDA(col, MAX(col)))
      const result = engine.evaluate('=BYCOL(A1:A5, LAMBDA(col, MAX(col)))', context);
      expect(result).toEqual([30]); // Max value in column
    });
  });

  describe('BYCOL with LET', () => {
    test('combines BYCOL with LET for local variables', () => {
      // Setup: column A1:A3 with values 1, 2, 3
      worksheet.setCellValue({ row: 1, col: 1 }, 1);
      worksheet.setCellValue({ row: 2, col: 1 }, 2);
      worksheet.setCellValue({ row: 3, col: 1 }, 3);
      
      context.currentCell = { row: 1, col: 2 };
      
      // =LET(data, A1:A3, fn, LAMBDA(col, SUM(col)*2), BYCOL(data, fn))
      const result = engine.evaluate('=LET(data, A1:A3, fn, LAMBDA(col, SUM(col)*2), BYCOL(data, fn))', context);
      expect(result).toEqual([12]); // (1+2+3)*2 = 12
    });

    test('uses LET variable in BYCOL lambda', () => {
      // Setup: column A1:A3 with values 5, 10, 15
      worksheet.setCellValue({ row: 1, col: 1 }, 5);
      worksheet.setCellValue({ row: 2, col: 1 }, 10);
      worksheet.setCellValue({ row: 3, col: 1 }, 15);
      
      context.currentCell = { row: 1, col: 2 };
      
      // =LET(multiplier, 2, BYCOL(A1:A3, LAMBDA(col, SUM(col)*multiplier)))
      const result = engine.evaluate('=LET(multiplier, 2, BYCOL(A1:A3, LAMBDA(col, SUM(col)*multiplier)))', context);
      expect(result).toEqual([60]); // (5+10+15)*2 = 60
    });
  });

  describe('BYCOL with Complex Expressions', () => {
    test('applies lambda with complex calculation', () => {
      // Setup: column A1:A3 with values 1, 2, 3
      worksheet.setCellValue({ row: 1, col: 1 }, 1);
      worksheet.setCellValue({ row: 2, col: 1 }, 2);
      worksheet.setCellValue({ row: 3, col: 1 }, 3);
      
      context.currentCell = { row: 1, col: 2 };
      
      // =BYCOL(A1:A3, LAMBDA(col, SUM(col) + AVERAGE(col)))
      const result = engine.evaluate('=BYCOL(A1:A3, LAMBDA(col, SUM(col) + AVERAGE(col)))', context);
      expect(result).toEqual([8]); // 6 + 2 = 8
    });

    test('applies lambda with conditional logic', () => {
      // Setup: column A1:A4 with values 1, 2, 3, 4
      worksheet.setCellValue({ row: 1, col: 1 }, 1);
      worksheet.setCellValue({ row: 2, col: 1 }, 2);
      worksheet.setCellValue({ row: 3, col: 1 }, 3);
      worksheet.setCellValue({ row: 4, col: 1 }, 4);
      
      context.currentCell = { row: 1, col: 2 };
      
      // =BYCOL(A1:A4, LAMBDA(col, IF(SUM(col) > 5, "High", "Low")))
      const result = engine.evaluate('=BYCOL(A1:A4, LAMBDA(col, IF(SUM(col) > 5, "High", "Low")))', context);
      expect(result).toEqual(['High']); // Sum is 10, which is > 5
    });
  });

  describe('Error Handling', () => {
    test('returns error with no arguments', () => {
      const result = engine.evaluate('=BYCOL()', context);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns error with only one argument', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, 1);
      const result = engine.evaluate('=BYCOL(A1:A3)', context);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns error with too many arguments', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, 1);
      const result = engine.evaluate('=BYCOL(A1:A3, LAMBDA(x, x), extra)', context);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns error when second argument is not a lambda', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, 1);
      const result = engine.evaluate('=BYCOL(A1:A3, 5)', context);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns error when lambda has wrong parameter count', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, 1);
      // BYCOL expects lambda with exactly 1 parameter
      const result = engine.evaluate('=BYCOL(A1:A3, LAMBDA(x, y, x+y))', context);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('propagates error from lambda evaluation', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, 1);
      worksheet.setCellValue({ row: 2, col: 1 }, 0);
      
      context.currentCell = { row: 1, col: 2 };
      
      // Division by zero in lambda
      const result = engine.evaluate('=BYCOL(A1:A2, LAMBDA(col, SUM(col)/MIN(col)))', context);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#DIV/0!');
    });
  });

  describe('BYCOL with Named Lambdas', () => {
    test('uses named lambda with BYCOL', () => {
      // Setup: column A1:A3 with values 2, 4, 6
      worksheet.setCellValue({ row: 1, col: 1 }, 2);
      worksheet.setCellValue({ row: 2, col: 1 }, 4);
      worksheet.setCellValue({ row: 3, col: 1 }, 6);
      
      // Define a named lambda
      const doubleSum = {
        parameters: ['col'],
        body: 'SUM(col)*2',
        capturedContext: undefined
      };
      
      context.namedLambdas = new Map([['DOUBLESUM', doubleSum]]);
      context.currentCell = { row: 1, col: 2 };
      
      // =BYCOL(A1:A3, DOUBLESUM)
      const result = engine.evaluate('=BYCOL(A1:A3, DOUBLESUM)', context);
      expect(result).toEqual([24]); // (2+4+6)*2 = 24
    });
  });

  describe('Real-World Use Cases', () => {
    test('calculates column totals in a data table', () => {
      // Setup: sales data in column A (100, 200, 150, 300)
      worksheet.setCellValue({ row: 1, col: 1 }, 100);
      worksheet.setCellValue({ row: 2, col: 1 }, 200);
      worksheet.setCellValue({ row: 3, col: 1 }, 150);
      worksheet.setCellValue({ row: 4, col: 1 }, 300);
      
      context.currentCell = { row: 1, col: 2 };
      
      // =BYCOL(A1:A4, LAMBDA(sales, SUM(sales)))
      const result = engine.evaluate('=BYCOL(A1:A4, LAMBDA(sales, SUM(sales)))', context);
      expect(result).toEqual([750]); // Total sales
    });

    test('finds outliers in a column', () => {
      // Setup: data with an outlier (5, 6, 5, 4, 100)
      worksheet.setCellValue({ row: 1, col: 1 }, 5);
      worksheet.setCellValue({ row: 2, col: 1 }, 6);
      worksheet.setCellValue({ row: 3, col: 1 }, 5);
      worksheet.setCellValue({ row: 4, col: 1 }, 4);
      worksheet.setCellValue({ row: 5, col: 1 }, 100);
      
      context.currentCell = { row: 1, col: 2 };
      
      // Check if max is much larger than average
      // =BYCOL(A1:A5, LAMBDA(col, IF(MAX(col) > AVERAGE(col)*5, "Outlier", "Normal")))
      const result = engine.evaluate('=BYCOL(A1:A5, LAMBDA(col, IF(MAX(col) > AVERAGE(col)*5, "Outlier", "Normal")))', context);
      expect(result).toEqual(['Outlier']); // 100 is an outlier
    });
  });
});
