/**
 * LAMBDA Function Tests
 * 
 * Tests the LAMBDA function for creating custom, reusable functions
 * Covers: basic creation, invocation, parameters, named lambdas, closures, recursion
 */

import { FormulaEngine } from '../src/FormulaEngine';
import { Worksheet } from '../src/worksheet';
import { FormulaContext } from '../src/FormulaEngine';

describe('LAMBDA Function', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;
  let context: FormulaContext;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Sheet1', 100, 26);
    context = { worksheet, currentCell: { row: 0, col: 0 } };
  });

  describe('Basic Lambda Creation', () => {
    test('creates lambda with single parameter', () => {
      const result = engine.evaluate('=LAMBDA(x, x*2)', context);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('parameters');
      expect(result).toHaveProperty('body');
      expect((result as any).parameters).toEqual(['x']);
      expect((result as any).body).toBe('x*2');
    });

    test('creates lambda with multiple parameters', () => {
      const result = engine.evaluate('=LAMBDA(x, y, x+y)', context);
      
      expect((result as any).parameters).toEqual(['x', 'y']);
      expect((result as any).body).toBe('x+y');
    });

    test('creates lambda with three parameters', () => {
      const result = engine.evaluate('=LAMBDA(a, b, c, a*b+c)', context);
      
      expect((result as any).parameters).toEqual(['a', 'b', 'c']);
      expect((result as any).body).toBe('a*b+c');
    });
  });

  describe('Lambda Invocation - Anonymous', () => {
    test('invokes simple lambda immediately', () => {
      const result = engine.evaluate('=LAMBDA(x, x*2)(5)', context);
      expect(result).toBe(10);
    });

    test('invokes lambda with addition', () => {
      const result = engine.evaluate('=LAMBDA(x, x+10)(5)', context);
      expect(result).toBe(15);
    });

    test('invokes lambda with two parameters', () => {
      const result = engine.evaluate('=LAMBDA(x, y, x+y)(3, 4)', context);
      expect(result).toBe(7);
    });

    test('invokes lambda with three parameters', () => {
      const result = engine.evaluate('=LAMBDA(a, b, c, a*b+c)(2, 3, 5)', context);
      expect(result).toBe(11); // 2*3 + 5
    });

    test('invokes lambda with multiplication', () => {
      const result = engine.evaluate('=LAMBDA(x, y, x*y)(6, 7)', context);
      expect(result).toBe(42);
    });

    test('invokes lambda with complex expression', () => {
      const result = engine.evaluate('=LAMBDA(x, y, (x+y)*2)(3, 4)', context);
      expect(result).toBe(14); // (3+4)*2
    });
  });

  describe('Error Handling', () => {
    test('returns error with no parameters', () => {
      const result = engine.evaluate('=LAMBDA()', context);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns error with only calculation (no parameters)', () => {
      const result = engine.evaluate('=LAMBDA(x*2)', context);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns error with non-string parameter', () => {
      const result = engine.evaluate('=LAMBDA(5, x*2)', context);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns error with invalid parameter name', () => {
      const result = engine.evaluate('=LAMBDA("123invalid", x*2)', context);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns error when wrong number of arguments in invocation', () => {
      const result = engine.evaluate('=LAMBDA(x, y, x+y)(5)', context);
      expect(result).toBeInstanceOf(Error);
    });
  });

  describe('Lambda with Functions', () => {
    test('lambda using SUM function', () => {
      const result = engine.evaluate('=LAMBDA(x, y, SUM(x, y))(10, 20)', context);
      expect(result).toBe(30);
    });

    test('lambda using IF function', () => {
      const result = engine.evaluate('=LAMBDA(x, IF(x>0, "Positive", "Non-positive"))(5)', context);
      expect(result).toBe('Positive');
    });

    test('lambda using ABS function', () => {
      const result = engine.evaluate('=LAMBDA(x, ABS(x))(-42)', context);
      expect(result).toBe(42);
    });
  });

  describe('Named Lambdas (Future Enhancement)', () => {
    // These tests are for future implementation of named lambdas
    // Now implemented with worksheet-level lambda storage
    
    test('stores and retrieves named lambda', () => {
      // Initialize named lambdas map in context
      if (!context.namedLambdas) {
        context.namedLambdas = new Map();
      }
      
      // Create a lambda
      const lambda = engine.evaluate('=LAMBDA(x, x*2)', context);
      
      // Store it with a name
      context.namedLambdas.set('MyDouble', lambda as any);
      
      // Verify it was stored
      expect(context.namedLambdas.has('MyDouble')).toBe(true);
      expect(context.namedLambdas.get('MyDouble')).toHaveProperty('parameters');
      expect((context.namedLambdas.get('MyDouble') as any).parameters).toEqual(['x']);
    });

    test('invokes named lambda', () => {
      // Initialize named lambdas map
      if (!context.namedLambdas) {
        context.namedLambdas = new Map();
      }
      
      // Create and store a lambda
      const lambda = engine.evaluate('=LAMBDA(x, x*2)', context);
      context.namedLambdas.set('MyDouble', lambda as any);
      
      // Invoke the named lambda: =MyDouble(5)
      const result = engine.evaluate('=MyDouble(5)', context);
      expect(result).toBe(10);
    });
  });

  describe('Parameter Binding', () => {
    test('correctly binds single parameter', () => {
      const result = engine.evaluate('=LAMBDA(num, num+1)(99)', context);
      expect(result).toBe(100);
    });

    test('correctly binds multiple parameters', () => {
      const result = engine.evaluate('=LAMBDA(a, b, a-b)(10, 3)', context);
      expect(result).toBe(7);
    });

    test('uses parameter multiple times in body', () => {
      const result = engine.evaluate('=LAMBDA(x, x*x+x)(5)', context);
      expect(result).toBe(30); // 5*5 + 5
    });
  });

  describe('Closures (Future Enhancement)', () => {
    // Closure support - capturing outer scope
    test('captures outer variable', () => {
      // Set up a cell with a value
      // B1 means row=1, col=2 (B is the 2nd column, 1-based)
      worksheet.setCellValue({ row: 1, col: 2 }, 3); // B1 = 3
      
      // Create a lambda that references the outer cell
      // LAMBDA(x, x*B1) should capture B1's value
      const lambda = engine.evaluate('=LAMBDA(x, x*B1)', context);
      
      // Store as named lambda
      if (!context.namedLambdas) {
        context.namedLambdas = new Map();
      }
      context.namedLambdas.set('Multiplier', lambda as any);
      
      // Invoke it - should use B1=3
      const result = engine.evaluate('=Multiplier(5)', context);
      expect(result).toBe(15); // 5 * 3 = 15
    });
  });

  describe('Recursion (Future Enhancement)', () => {
    // Recursion support with depth limits
    test('implements recursive factorial', () => {
      // Initialize named lambdas
      if (!context.namedLambdas) {
        context.namedLambdas = new Map();
      }
      
      // Create recursive factorial: LAMBDA(n, IF(n<=1, 1, n*Factorial(n-1)))
      const factorial = engine.evaluate('=LAMBDA(n, IF(n<=1, 1, n*Factorial(n-1)))', context);
      context.namedLambdas.set('Factorial', factorial as any);
      
      // Test factorial(5) = 120
      const result = engine.evaluate('=Factorial(5)', context);
      expect(result).toBe(120); // 5! = 5*4*3*2*1 = 120
    });

    test('implements recursive fibonacci', () => {
      // Initialize named lambdas
      if (!context.namedLambdas) {
        context.namedLambdas = new Map();
      }
      
      // Create recursive fibonacci: LAMBDA(n, IF(n<=1, n, Fib(n-1)+Fib(n-2)))
      const fib = engine.evaluate('=LAMBDA(n, IF(n<=1, n, Fib(n-1)+Fib(n-2)))', context);
      context.namedLambdas.set('Fib', fib as any);
      
      // Test Fib(7) = 13 (sequence: 0,1,1,2,3,5,8,13)
      const result = engine.evaluate('=Fib(7)', context);
      expect(result).toBe(13);
    });

    test('prevents infinite recursion with depth limit', () => {
      // Initialize named lambdas
      if (!context.namedLambdas) {
        context.namedLambdas = new Map();
      }
      
      // Create infinite recursion: LAMBDA(n, BadFunc(n+1))
      const badFunc = engine.evaluate('=LAMBDA(n, BadFunc(n+1))', context);
      context.namedLambdas.set('BadFunc', badFunc as any);
      
      // Should return error instead of crashing
      const result = engine.evaluate('=BadFunc(1)', context);
      expect(result).toBeInstanceOf(Error);
      // Should be a recursion depth error
      expect((result as Error).message).toMatch(/#N\/A|#VALUE|recursion|depth/i);
    });
  });

  describe('Integration with Other Functions (Future)', () => {
    test('works with MAP function', () => {
      // Set up worksheet with values
      const engine = new FormulaEngine();
      const worksheet = new Worksheet('Sheet1', 100, 26);
      worksheet.setCellValue({ row: 1, col: 1 }, 1);
      worksheet.setCellValue({ row: 2, col: 1 }, 2);
      worksheet.setCellValue({ row: 3, col: 1 }, 3);
      
      const context: FormulaContext = {
        worksheet,
        currentCell: { row: 1, col: 2 }
      };
      
      // =MAP(A1:A3, LAMBDA(x, x*2))
      const result = engine.evaluate('=MAP(A1:A3, LAMBDA(x, x*2))', context);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([2, 4, 6]);
    });

    test('works with REDUCE function', () => {
      const engine = new FormulaEngine();
      const worksheet = new Worksheet('Sheet1', 100, 26);
      worksheet.setCellValue({ row: 1, col: 1 }, 1);
      worksheet.setCellValue({ row: 2, col: 1 }, 2);
      worksheet.setCellValue({ row: 3, col: 1 }, 3);
      worksheet.setCellValue({ row: 4, col: 1 }, 4);
      worksheet.setCellValue({ row: 5, col: 1 }, 5);
      
      const context: FormulaContext = {
        worksheet,
        currentCell: { row: 1, col: 2 }
      };
      
      // =REDUCE(0, A1:A5, LAMBDA(acc, x, acc+x))
      const result = engine.evaluate('=REDUCE(0, A1:A5, LAMBDA(acc, x, acc+x))', context);
      expect(result).toBe(15); // 1+2+3+4+5 = 15
    });

    test('works with BYROW function', () => {
      const engine = new FormulaEngine();
      const worksheet = new Worksheet('Sheet1', 100, 26);
      // Set up a row of values
      worksheet.setCellValue({ row: 1, col: 1 }, 1);
      worksheet.setCellValue({ row: 1, col: 2 }, 2);
      worksheet.setCellValue({ row: 1, col: 3 }, 3);
      
      const context: FormulaContext = {
        worksheet,
        currentCell: { row: 2, col: 1 }
      };
      
      // =BYROW(A1:C1, LAMBDA(row, SUM(row)))
      const result = engine.evaluate('=BYROW(A1:C1, LAMBDA(row, SUM(row)))', context);
      expect(Array.isArray(result)).toBe(true);
      if (Array.isArray(result)) {
        expect(result[0]).toBe(6); // SUM([1,2,3]) = 6
      }
    });
  });
});
