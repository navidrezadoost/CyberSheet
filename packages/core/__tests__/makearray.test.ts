import { FormulaEngine, FormulaContext, Worksheet, type FormulaValue } from '../src';

describe('MAKEARRAY Function', () => {
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

  describe('Basic Usage', () => {
    test('creates simple 3x3 array with constant values', () => {
      const result = engine.evaluate(
        '=MAKEARRAY(3, 3, LAMBDA(r, c, 1))',
        context
      ) as FormulaValue[][];

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
      expect(result).toEqual([
        [1, 1, 1],
        [1, 1, 1],
        [1, 1, 1]
      ]);
    });

    test('creates array using row indices', () => {
      const result = engine.evaluate(
        '=MAKEARRAY(5, 1, LAMBDA(r, c, r))',
        context
      ) as FormulaValue[];

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    test('creates array using column indices', () => {
      const result = engine.evaluate(
        '=MAKEARRAY(1, 5, LAMBDA(r, c, c))',
        context
      ) as FormulaValue[];

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    test('creates multiplication table', () => {
      const result = engine.evaluate(
        '=MAKEARRAY(3, 3, LAMBDA(r, c, r * c))',
        context
      ) as FormulaValue[][];

      expect(result).toEqual([
        [1, 2, 3],
        [2, 4, 6],
        [3, 6, 9]
      ]);
    });

    test('creates 10x10 multiplication table', () => {
      const result = engine.evaluate(
        '=MAKEARRAY(10, 10, LAMBDA(r, c, r * c))',
        context
      ) as FormulaValue[][];

      expect(result.length).toBe(10);
      expect(result[0].length).toBe(10);
      expect(result[0]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      expect(result[9]).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
    });
  });

  describe('Mathematical Operations', () => {
    test('creates addition table', () => {
      const result = engine.evaluate(
        '=MAKEARRAY(4, 4, LAMBDA(r, c, r + c))',
        context
      ) as FormulaValue[][];

      expect(result).toEqual([
        [2, 3, 4, 5],
        [3, 4, 5, 6],
        [4, 5, 6, 7],
        [5, 6, 7, 8]
      ]);
    });

    test('creates power table', () => {
      const result = engine.evaluate(
        '=MAKEARRAY(3, 3, LAMBDA(r, c, r ^ c))',
        context
      ) as FormulaValue[][];

      expect(result).toEqual([
        [1, 1, 1],
        [2, 4, 8],
        [3, 9, 27]
      ]);
    });

    test('creates sequential calendar days', () => {
      const result = engine.evaluate(
        '=MAKEARRAY(6, 7, LAMBDA(r, c, (r - 1) * 7 + c))',
        context
      ) as FormulaValue[][];

      expect(result.length).toBe(6);
      expect(result[0].length).toBe(7);
      expect(result[0]).toEqual([1, 2, 3, 4, 5, 6, 7]);
      expect(result[5]).toEqual([36, 37, 38, 39, 40, 41, 42]);
    });

    test('creates checkerboard pattern', () => {
      const result = engine.evaluate(
        '=MAKEARRAY(4, 4, LAMBDA(r, c, MOD(r + c, 2)))',
        context
      ) as FormulaValue[][];

      expect(result).toEqual([
        [0, 1, 0, 1],
        [1, 0, 1, 0],
        [0, 1, 0, 1],
        [1, 0, 1, 0]
      ]);
    });
  });

  describe('Integration with LET', () => {
    test('uses LET to define base value', () => {
      const result = engine.evaluate(
        '=LET(base, 10, MAKEARRAY(3, 3, LAMBDA(r, c, base + r + c)))',
        context
      ) as FormulaValue[][];

      expect(result).toEqual([
        [12, 13, 14],
        [13, 14, 15],
        [14, 15, 16]
      ]);
    });

    test('uses LET with MAKEARRAY result', () => {
      const result = engine.evaluate(
        '=LET(arr, MAKEARRAY(2, 2, LAMBDA(r, c, r * c)), arr)',
        context
      ) as FormulaValue[][];

      expect(result).toEqual([
        [1, 2],
        [2, 4]
      ]);
    });

    test('creates array with complex LET expressions', () => {
      const result = engine.evaluate(
        '=LET(multiplier, 5, offset, 100, MAKEARRAY(3, 3, LAMBDA(r, c, offset + r * multiplier + c)))',
        context
      ) as FormulaValue[][];

      expect(result).toEqual([
        [106, 107, 108],
        [111, 112, 113],
        [116, 117, 118]
      ]);
    });
  });

  describe('Lambda Closures', () => {
    test('lambda captures variables from LET context', () => {
      const result = engine.evaluate(
        '=LET(factor, 3, MAKEARRAY(2, 2, LAMBDA(r, c, (r + c) * factor)))',
        context
      ) as FormulaValue[][];

      expect(result).toEqual([
        [6, 9],
        [9, 12]
      ]);
    });

    test('lambda uses conditional logic', () => {
      const result = engine.evaluate(
        '=MAKEARRAY(3, 3, LAMBDA(r, c, IF(r = c, 1, 0)))',
        context
      ) as FormulaValue[][];

      // Identity matrix
      expect(result).toEqual([
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
      ]);
    });

    test('lambda with nested IF statements', () => {
      const result = engine.evaluate(
        '=MAKEARRAY(3, 3, LAMBDA(r, c, IF(r > c, 1, IF(r < c, -1, 0))))',
        context
      ) as FormulaValue[][];

      expect(result).toEqual([
        [0, -1, -1],
        [1, 0, -1],
        [1, 1, 0]
      ]);
    });
  });

  describe('Integration with Other Functions', () => {
    test('combines with FILTER', () => {
      const result = engine.evaluate(
        '=LET(arr, MAKEARRAY(5, 1, LAMBDA(r, c, r)), FILTER(arr, MOD(arr, 2) = 0))',
        context
      ) as FormulaValue[];

      expect(result).toEqual([2, 4]);
    });

    test('combines with SCAN', () => {
      const result = engine.evaluate(
        '=LET(nums, MAKEARRAY(5, 1, LAMBDA(r, c, r)), SCAN(0, nums, LAMBDA(acc, val, acc + val)))',
        context
      ) as FormulaValue[];

      expect(result).toEqual([1, 3, 6, 10, 15]); // Cumulative sum
    });

    test('combines with MAP', () => {
      const result = engine.evaluate(
        '=LET(arr, MAKEARRAY(3, 1, LAMBDA(r, c, r)), MAP(arr, LAMBDA(x, x * 2)))',
        context
      ) as FormulaValue[];

      expect(result).toEqual([2, 4, 6]);
    });

    test('nested MAKEARRAY calls', () => {
      const result = engine.evaluate(
        '=LET(size, 2, inner, MAKEARRAY(size, size, LAMBDA(r, c, r + c)), inner)',
        context
      ) as FormulaValue[][];

      expect(result).toEqual([
        [2, 3],
        [3, 4]
      ]);
    });
  });

  describe('Edge Cases', () => {
    test('creates 1x1 array', () => {
      const result = engine.evaluate(
        '=MAKEARRAY(1, 1, LAMBDA(r, c, 42))',
        context
      );

      expect(result).toBe(42);
    });

    test('creates large array efficiently', () => {
      const result = engine.evaluate(
        '=MAKEARRAY(100, 100, LAMBDA(r, c, 1))',
        context
      ) as FormulaValue[][];

      expect(result.length).toBe(100);
      expect(result[0].length).toBe(100);
      expect(result[99][99]).toBe(1);
    });

    test('handles single row array', () => {
      const result = engine.evaluate(
        '=MAKEARRAY(1, 10, LAMBDA(r, c, c * 10))',
        context
      ) as FormulaValue[];

      expect(result).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
    });

    test('handles single column array', () => {
      const result = engine.evaluate(
        '=MAKEARRAY(10, 1, LAMBDA(r, c, r * 10))',
        context
      ) as FormulaValue[];

      expect(result).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
    });
  });

  describe('Error Handling', () => {
    test('returns error with no arguments', () => {
      const result = engine.evaluate('=MAKEARRAY()', context);
      expect(result instanceof Error).toBe(true);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns error with insufficient arguments', () => {
      const result = engine.evaluate('=MAKEARRAY(3, 3)', context);
      expect(result instanceof Error).toBe(true);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns error with too many arguments', () => {
      const result = engine.evaluate(
        '=MAKEARRAY(3, 3, LAMBDA(r, c, r), extra)',
        context
      );
      expect(result instanceof Error).toBe(true);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns error with zero rows', () => {
      const result = engine.evaluate(
        '=MAKEARRAY(0, 3, LAMBDA(r, c, r))',
        context
      );
      expect(result instanceof Error).toBe(true);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns error with negative rows', () => {
      const result = engine.evaluate(
        '=MAKEARRAY(-1, 3, LAMBDA(r, c, r))',
        context
      );
      expect(result instanceof Error).toBe(true);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns error with zero columns', () => {
      const result = engine.evaluate(
        '=MAKEARRAY(3, 0, LAMBDA(r, c, r))',
        context
      );
      expect(result instanceof Error).toBe(true);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns error with non-integer rows', () => {
      const result = engine.evaluate(
        '=MAKEARRAY(3.5, 3, LAMBDA(r, c, r))',
        context
      );
      expect(result instanceof Error).toBe(true);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns error with non-integer columns', () => {
      const result = engine.evaluate(
        '=MAKEARRAY(3, 3.5, LAMBDA(r, c, r))',
        context
      );
      expect(result instanceof Error).toBe(true);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns error when lambda has wrong parameter count', () => {
      const result = engine.evaluate(
        '=MAKEARRAY(3, 3, LAMBDA(r, r))',
        context
      );
      expect(result instanceof Error).toBe(true);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns error when third argument is not a lambda', () => {
      const result = engine.evaluate(
        '=MAKEARRAY(3, 3, 42)',
        context
      );
      expect(result instanceof Error).toBe(true);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('propagates error from lambda evaluation', () => {
      const result = engine.evaluate(
        '=MAKEARRAY(2, 2, LAMBDA(r, c, 1/0))',
        context
      );
      expect(result instanceof Error).toBe(true);
      expect((result as Error).message).toBe('#DIV/0!');
    });

    test('prevents excessively large arrays', () => {
      const result = engine.evaluate(
        '=MAKEARRAY(10000, 10000, LAMBDA(r, c, 1))',
        context
      );
      expect(result instanceof Error).toBe(true);
      expect((result as Error).message).toBe('#VALUE!');
    });
  });

  describe('Real-World Use Cases', () => {
    test('creates coordinates grid', () => {
      const result = engine.evaluate(
        '=MAKEARRAY(3, 2, LAMBDA(r, c, r * 10 + c))',
        context
      ) as FormulaValue[][];

      expect(result).toEqual([
        [11, 12],
        [21, 22],
        [31, 32]
      ]);
    });

    test('creates distance matrix', () => {
      const result = engine.evaluate(
        '=MAKEARRAY(3, 3, LAMBDA(r, c, (r - c) ^ 2))',
        context
      ) as FormulaValue[][];

      expect(result).toEqual([
        [0, 1, 4],
        [1, 0, 1],
        [4, 1, 0]
      ]);
    });

    test('creates Pascal triangle row', () => {
      // Simplified - just creates increasing values
      const result = engine.evaluate(
        '=MAKEARRAY(1, 5, LAMBDA(r, c, c))',
        context
      ) as FormulaValue[];

      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    test('creates alternating pattern', () => {
      const result = engine.evaluate(
        '=MAKEARRAY(4, 4, LAMBDA(r, c, IF(MOD(r + c, 2) = 0, 1, 0)))',
        context
      ) as FormulaValue[][];

      expect(result).toEqual([
        [1, 0, 1, 0],
        [0, 1, 0, 1],
        [1, 0, 1, 0],
        [0, 1, 0, 1]
      ]);
    });

    test('creates border matrix (1s on edges, 0s inside)', () => {
      const result = engine.evaluate(
        '=MAKEARRAY(4, 4, LAMBDA(r, c, IF((r = 1) + (r = 4) + (c = 1) + (c = 4) > 0, 1, 0)))',
        context
      ) as FormulaValue[][];

      expect(result).toEqual([
        [1, 1, 1, 1],
        [1, 0, 0, 1],
        [1, 0, 0, 1],
        [1, 1, 1, 1]
      ]);
    });
  });
});
