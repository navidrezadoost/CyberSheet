import { FormulaEngine, FormulaContext, Worksheet } from '../src';

/**
 * LET Function Tests
 * 
 * LET allows defining local variables to avoid repeating calculations.
 * Syntax: LET(name1, value1, name2, value2, ..., calculation)
 * 
 * Benefits:
 * - Avoid repeating complex expressions
 * - Improve readability
 * - Better performance (calculate once, use many times)
 */
describe('LET Function', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;
  let context: FormulaContext;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Sheet1', 100, 26);
    context = {
      worksheet,
      currentCell: { row: 1, col: 1 }
    };
  });

  describe('Basic LET Usage', () => {
    test('defines single variable', () => {
      // =LET(x, 5, x*2)
      const result = engine.evaluate('=LET(x, 5, x*2)', context);
      expect(result).toBe(10);
    });

    test('defines multiple variables', () => {
      // =LET(x, 3, y, 4, x+y)
      const result = engine.evaluate('=LET(x, 3, y, 4, x+y)', context);
      expect(result).toBe(7);
    });

    test('uses variable multiple times', () => {
      // =LET(x, 5, x*x + x*2 + 1)
      const result = engine.evaluate('=LET(x, 5, x*x + x*2 + 1)', context);
      expect(result).toBe(36); // 25 + 10 + 1
    });

    test('variables can reference previous variables', () => {
      // =LET(x, 3, y, x*2, y+x)
      const result = engine.evaluate('=LET(x, 3, y, x*2, y+x)', context);
      expect(result).toBe(9); // y=6, x=3, result=9
    });
  });

  describe('LET with Cell References', () => {
    beforeEach(() => {
      worksheet.setCellValue({ row: 1, col: 1 }, 10);
      worksheet.setCellValue({ row: 1, col: 2 }, 20);
    });

    test('binds cell value to variable', () => {
      // =LET(x, A1, x*2)
      context.currentCell = { row: 2, col: 1 };
      const result = engine.evaluate('=LET(x, A1, x*2)', context);
      expect(result).toBe(20);
    });

    test('combines multiple cell references', () => {
      // =LET(a, A1, b, B1, a+b)
      context.currentCell = { row: 2, col: 1 };
      const result = engine.evaluate('=LET(a, A1, b, B1, a+b)', context);
      expect(result).toBe(30);
    });

    test('uses cell value in complex expression', () => {
      // =LET(x, A1, y, B1, x*y + x + y)
      context.currentCell = { row: 2, col: 1 };
      const result = engine.evaluate('=LET(x, A1, y, B1, x*y + x + y)', context);
      expect(result).toBe(230); // 10*20 + 10 + 20 = 200 + 30
    });
  });

  describe('LET with Functions', () => {
    test('uses function in variable binding', () => {
      // =LET(x, ABS(-5), x*2)
      const result = engine.evaluate('=LET(x, ABS(-5), x*2)', context);
      expect(result).toBe(10);
    });

    test('uses variable in function call', () => {
      // =LET(x, 3, y, 4, SQRT(x*x + y*y))
      const result = engine.evaluate('=LET(x, 3, y, 4, SQRT(x*x + y*y))', context);
      expect(result).toBe(5); // Pythagorean triple
    });

    test('uses multiple functions', () => {
      // =LET(x, MAX(1,2,3), y, MIN(4,5,6), x+y)
      const result = engine.evaluate('=LET(x, MAX(1,2,3), y, MIN(4,5,6), x+y)', context);
      expect(result).toBe(7); // 3 + 4
    });
  });

  describe('LET with Arrays/Ranges', () => {
    beforeEach(() => {
      worksheet.setCellValue({ row: 1, col: 1 }, 1);
      worksheet.setCellValue({ row: 2, col: 1 }, 2);
      worksheet.setCellValue({ row: 3, col: 1 }, 3);
      worksheet.setCellValue({ row: 4, col: 1 }, 4);
      worksheet.setCellValue({ row: 5, col: 1 }, 5);
    });

    test('binds range to variable and uses with SUM', () => {
      // =LET(range, A1:A5, SUM(range))
      context.currentCell = { row: 1, col: 2 };
      const result = engine.evaluate('=LET(range, A1:A5, SUM(range))', context);
      expect(result).toBe(15);
    });

    test('uses range variable multiple times', () => {
      // =LET(range, A1:A5, SUM(range) + AVERAGE(range))
      context.currentCell = { row: 1, col: 2 };
      const result = engine.evaluate('=LET(range, A1:A5, SUM(range) + AVERAGE(range))', context);
      expect(result).toBe(18); // 15 + 3
    });
  });

  describe('Nested LET', () => {
    test('LET inside LET', () => {
      // =LET(x, 2, LET(y, 3, x*y))
      const result = engine.evaluate('=LET(x, 2, LET(y, 3, x*y))', context);
      expect(result).toBe(6);
    });

    test('inner LET can access outer variables', () => {
      // =LET(x, 5, LET(y, x*2, x+y))
      const result = engine.evaluate('=LET(x, 5, LET(y, x*2, x+y))', context);
      expect(result).toBe(15); // x=5, y=10, result=15
    });
  });

  describe('LET with LAMBDA', () => {
    test('defines lambda in LET', () => {
      // =LET(double, LAMBDA(x, x*2), double(5))
      const result = engine.evaluate('=LET(double, LAMBDA(x, x*2), double(5))', context);
      expect(result).toBe(10);
    });

    test('uses LET variables in lambda', () => {
      // =LET(multiplier, 3, fn, LAMBDA(x, x*multiplier), fn(4))
      const result = engine.evaluate('=LET(multiplier, 3, fn, LAMBDA(x, x*multiplier), fn(4))', context);
      expect(result).toBe(12);
    });

    test('multiple lambdas in LET', () => {
      // =LET(add, LAMBDA(x,y, x+y), mul, LAMBDA(x,y, x*y), add(2,3) + mul(2,3))
      const result = engine.evaluate('=LET(add, LAMBDA(x,y, x+y), mul, LAMBDA(x,y, x*y), add(2,3) + mul(2,3))', context);
      expect(result).toBe(11); // (2+3) + (2*3) = 5 + 6
    });
  });

  describe('Error Handling', () => {
    test('returns error with no arguments', () => {
      const result = engine.evaluate('=LET()', context);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns error with only one argument', () => {
      const result = engine.evaluate('=LET(x)', context);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns error with only two arguments', () => {
      const result = engine.evaluate('=LET(x, 5)', context);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns error with even number of arguments', () => {
      const result = engine.evaluate('=LET(x, 5, y, 10)', context);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns error when variable name is not string', () => {
      const result = engine.evaluate('=LET(5, 10, x)', context);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns error when variable name is invalid identifier', () => {
      const result = engine.evaluate('=LET("x-y", 5, x)', context);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('propagates error from variable value', () => {
      const result = engine.evaluate('=LET(x, 1/0, x+1)', context);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#DIV/0!');
    });

    test('propagates error from calculation', () => {
      const result = engine.evaluate('=LET(x, 5, x/0)', context);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#DIV/0!');
    });
  });

  describe('Performance Benefits', () => {
    test('calculates complex expression only once', () => {
      // Without LET: =SQRT(A1*A1 + B1*B1) + SQRT(A1*A1 + B1*B1) * 2
      // With LET: =LET(hyp, SQRT(A1*A1 + B1*B1), hyp + hyp*2)
      worksheet.setCellValue({ row: 1, col: 1 }, 3);
      worksheet.setCellValue({ row: 1, col: 2 }, 4);
      context.currentCell = { row: 2, col: 1 };
      
      const result = engine.evaluate('=LET(hyp, SQRT(A1*A1 + B1*B1), hyp + hyp*2)', context);
      expect(result).toBe(15); // 5 + 5*2
    });
  });

  describe('Real-World Use Cases', () => {
    test('calculates compound interest', () => {
      // =LET(principal, 1000, rate, 0.05, years, 5, principal * POWER(1+rate, years))
      const result = engine.evaluate('=LET(principal, 1000, rate, 0.05, years, 5, principal * POWER(1+rate, years))', context);
      expect(result).toBeCloseTo(1276.28, 2);
    });

    test('calculates distance between two points', () => {
      // =LET(x1, 0, y1, 0, x2, 3, y2, 4, SQRT((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1)))
      const result = engine.evaluate('=LET(x1, 0, y1, 0, x2, 3, y2, 4, SQRT((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1)))', context);
      expect(result).toBe(5);
    });

    test('converts temperature', () => {
      // =LET(celsius, 100, fahrenheit, celsius * 9/5 + 32, fahrenheit)
      const result = engine.evaluate('=LET(celsius, 100, fahrenheit, celsius * 9/5 + 32, fahrenheit)', context);
      expect(result).toBe(212);
    });
  });
});
