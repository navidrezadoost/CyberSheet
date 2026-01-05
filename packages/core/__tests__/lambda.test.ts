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
    // Skip for now until we implement worksheet-level lambda storage
    
    test.skip('stores and retrieves named lambda', () => {
      // Set a named lambda: MyDouble = LAMBDA(x, x*2)
      // This will require modifying cell assignment to detect lambdas
      // worksheet.setCellValue({ row: 0, col: 0 }, ...) 
      // TODO: Implement named lambda storage
      expect(true).toBe(true);
    });

    test.skip('invokes named lambda', () => {
      // After defining MyDouble, use it: =MyDouble(5)
      // TODO: Implement named lambda invocation
      expect(true).toBe(true);
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
    // These tests are for closure support - capturing outer scope
    test.skip('captures outer variable', () => {
      // TODO: Implement closure capture
      // Example: Define outer variable, then create lambda that uses it
    });
  });

  describe('Recursion (Future Enhancement)', () => {
    // These tests are for recursion support
    test.skip('implements recursive factorial', () => {
      // TODO: Implement recursion support
      // Factorial = LAMBDA(n, IF(n<=1, 1, n*Factorial(n-1)))
    });

    test.skip('implements recursive fibonacci', () => {
      // TODO: Implement recursion support
      // Fib = LAMBDA(n, IF(n<=1, n, Fib(n-1)+Fib(n-2)))
    });

    test.skip('prevents infinite recursion with depth limit', () => {
      // TODO: Implement recursion depth limit (e.g., 100 levels)
    });
  });

  describe('Integration with Other Functions (Future)', () => {
    // These tests will work once we implement MAP, REDUCE, etc.
    test.skip('works with MAP function', () => {
      // =MAP(A1:A5, LAMBDA(x, x*2))
    });

    test.skip('works with REDUCE function', () => {
      // =REDUCE(0, A1:A5, LAMBDA(acc, x, acc+x))
    });

    test.skip('works with BYROW function', () => {
      // =BYROW(A1:C3, LAMBDA(row, SUM(row)))
    });
  });
});
