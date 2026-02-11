/**
 * Tests for Random Functions: RANDARRAY and RANDBETWEEN
 * 
 * These functions generate random values and are VOLATILE,
 * meaning they recalculate on every change to the worksheet.
 */

import { FormulaEngine, FormulaContext, Worksheet, type FormulaValue } from '../src';

describe('RANDBETWEEN Function', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;
  let context: FormulaContext;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Sheet1', 100, 26);
    context = {
      worksheet,
      currentCell: { row: 0, col: 0 }
    };
  });

  describe('Basic RANDBETWEEN Usage', () => {
    test('returns integer between 1 and 10', () => {
      const result = engine.evaluate('=RANDBETWEEN(1, 10)', context) as number;
      
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(10);
      expect(Number.isInteger(result)).toBe(true);
    });

    test('returns integer between -5 and 5', () => {
      const result = engine.evaluate('=RANDBETWEEN(-5, 5)', context) as number;
      
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(-5);
      expect(result).toBeLessThanOrEqual(5);
      expect(Number.isInteger(result)).toBe(true);
    });

    test('returns same value when bottom equals top', () => {
      const result = engine.evaluate('=RANDBETWEEN(5, 5)', context);
      
      expect(result).toBe(5);
    });

    test('handles large ranges', () => {
      const result = engine.evaluate('=RANDBETWEEN(1, 1000000)', context) as number;
      
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(1000000);
      expect(Number.isInteger(result)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('returns error with no arguments', () => {
      const result = engine.evaluate('=RANDBETWEEN()', context);
      
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns error with only one argument', () => {
      const result = engine.evaluate('=RANDBETWEEN(1)', context);
      
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns error when bottom > top', () => {
      const result = engine.evaluate('=RANDBETWEEN(10, 1)', context);
      
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('returns error with non-numeric arguments', () => {
      const result = engine.evaluate('=RANDBETWEEN("a", "b")', context);
      
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });
  });

  describe('Real-World Use Cases', () => {
    test('generates random sample IDs', () => {
      const result = engine.evaluate('=RANDBETWEEN(1000, 9999)', context) as number;
      
      expect(result).toBeGreaterThanOrEqual(1000);
      expect(result).toBeLessThanOrEqual(9999);
      expect(Number.isInteger(result)).toBe(true);
    });

    test('simulates dice roll', () => {
      const result = engine.evaluate('=RANDBETWEEN(1, 6)', context) as number;
      
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(6);
      expect(Number.isInteger(result)).toBe(true);
    });
  });
});

describe('RANDARRAY Function', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;
  let context: FormulaContext;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Sheet1', 100, 26);
    context = {
      worksheet,
      currentCell: { row: 0, col: 0 }
    };
  });

  describe('Basic RANDARRAY Usage', () => {
    test('returns single random decimal with no arguments', () => {
      const result = engine.evaluate('=RANDARRAY()', context) as number;
      
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(1);
    });

    test('returns 1D array of 5 random decimals', () => {
      const result = engine.evaluate('=RANDARRAY(5)', context) as FormulaValue[];
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(5);
      
      result.forEach(val => {
        expect(typeof val).toBe('number');
        expect(val as number).toBeGreaterThanOrEqual(0);
        expect(val as number).toBeLessThan(1);
      });
    });

    test('returns 2D array of 3x3 random decimals', () => {
      const result = engine.evaluate('=RANDARRAY(3, 3)', context) as FormulaValue[][];
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
      
      result.forEach(row => {
        expect(Array.isArray(row)).toBe(true);
        expect(row.length).toBe(3);
        
        row.forEach(val => {
          expect(typeof val).toBe('number');
          expect(val as number).toBeGreaterThanOrEqual(0);
          expect(val as number).toBeLessThan(1);
        });
      });
    });

    test('returns random integers with integer flag', () => {
      const result = engine.evaluate('=RANDARRAY(5, 1, 1, 100, TRUE)', context) as FormulaValue[];
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(5);
      
      result.forEach(val => {
        expect(typeof val).toBe('number');
        expect(Number.isInteger(val as number)).toBe(true);
        expect(val as number).toBeGreaterThanOrEqual(1);
        expect(val as number).toBeLessThan(100);
      });
    });

    test('returns random decimals with custom range', () => {
      const result = engine.evaluate('=RANDARRAY(3, 2, 10, 20)', context) as FormulaValue[][];
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
      
      result.forEach(row => {
        expect(Array.isArray(row)).toBe(true);
        expect(row.length).toBe(2);
        
        row.forEach(val => {
          expect(typeof val).toBe('number');
          expect(val as number).toBeGreaterThanOrEqual(10);
          expect(val as number).toBeLessThan(20);
        });
      });
    });
  });

  describe('Parameter Variations', () => {
    test('handles negative min/max range', () => {
      const result = engine.evaluate('=RANDARRAY(3, 1, -10, -5)', context) as FormulaValue[];
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
      
      result.forEach(val => {
        expect(typeof val).toBe('number');
        expect(val as number).toBeGreaterThanOrEqual(-10);
        expect(val as number).toBeLessThan(-5);
      });
    });

    test('handles integer flag as number (0 = false)', () => {
      const result = engine.evaluate('=RANDARRAY(2, 1, 0, 1, 0)', context) as FormulaValue[];
      
      expect(Array.isArray(result)).toBe(true);
      
      // Should return decimals (not integers)
      result.forEach(val => {
        expect(typeof val).toBe('number');
      });
    });

    test('handles integer flag as number (1 = true)', () => {
      const result = engine.evaluate('=RANDARRAY(5, 1, 1, 10, 1)', context) as FormulaValue[];
      
      expect(Array.isArray(result)).toBe(true);
      
      result.forEach(val => {
        expect(Number.isInteger(val as number)).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    test('returns error when rows < 1', () => {
      const result = engine.evaluate('=RANDARRAY(0)', context);
      
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns error when columns < 1', () => {
      const result = engine.evaluate('=RANDARRAY(5, 0)', context);
      
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns error when min >= max', () => {
      const result = engine.evaluate('=RANDARRAY(3, 3, 10, 5)', context);
      
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns error when min equals max', () => {
      const result = engine.evaluate('=RANDARRAY(3, 3, 5, 5)', context);
      
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns error with non-numeric parameters', () => {
      const result = engine.evaluate('=RANDARRAY("a", "b")', context);
      
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('returns error for excessively large arrays', () => {
      const result = engine.evaluate('=RANDARRAY(10000, 10000)', context);
      
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });
  });

  describe('Integration with Other Functions', () => {
    test('combines with SUM to verify function works', () => {
      // RANDARRAY generates random values, so we can't test exact sums
      // But we can verify it works with SUM
      const result = engine.evaluate('=SUM(RANDARRAY(5, 1, 1, 10, TRUE))', context) as number;
      
      expect(typeof result).toBe('number');
      // Sum of 5 random integers between 1-10 should be between 5 and 50
      expect(result).toBeGreaterThanOrEqual(5);
      expect(result).toBeLessThanOrEqual(50);
    });

    test('combines with MAP and LAMBDA', () => {
      const result = engine.evaluate('=MAP(RANDARRAY(3, 1, 1, 5, TRUE), LAMBDA(x, x*2))', context) as FormulaValue[];
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
      
      result.forEach(val => {
        expect(typeof val).toBe('number');
        expect(Number.isInteger(val as number)).toBe(true);
        // Should be even numbers (since we doubled integers)
        expect((val as number) % 2).toBe(0);
      });
    });

    test('combines with FILTER to filter random values', () => {
      // Generate an array and filter
      const result = engine.evaluate('=LET(arr, RANDARRAY(10, 1, 1, 100, TRUE), FILTER(arr, arr > 50))', context);
      
      // Result should be an array (or error if no values > 50)
      if (result instanceof Error) {
        // FILTER returns #VALUE! if no matches, not #CALC!
        expect((result as Error).message).toBe('#VALUE!');
      } else {
        expect(Array.isArray(result)).toBe(true);
        (result as FormulaValue[]).forEach(val => {
          expect(val as number).toBeGreaterThan(50);
        });
      }
    });
  });

  describe('Real-World Use Cases', () => {
    test('generates random test scores', () => {
      const result = engine.evaluate('=RANDARRAY(10, 1, 60, 100, TRUE)', context) as FormulaValue[];
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(10);
      
      result.forEach(val => {
        expect(typeof val).toBe('number');
        expect(Number.isInteger(val as number)).toBe(true);
        expect(val as number).toBeGreaterThanOrEqual(60);
        expect(val as number).toBeLessThan(100);
      });
    });

    test('generates random price matrix', () => {
      const result = engine.evaluate('=RANDARRAY(4, 3, 10, 100)', context) as FormulaValue[][];
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(4);
      
      result.forEach(row => {
        expect(Array.isArray(row)).toBe(true);
        expect(row.length).toBe(3);
        
        row.forEach(val => {
          expect(typeof val).toBe('number');
          expect(val as number).toBeGreaterThanOrEqual(10);
          expect(val as number).toBeLessThan(100);
        });
      });
    });

    test('simulates coin flips (0 or 1)', () => {
      const result = engine.evaluate('=RANDARRAY(20, 1, 0, 2, TRUE)', context) as FormulaValue[];
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(20);
      
      result.forEach(val => {
        expect(typeof val).toBe('number');
        expect(Number.isInteger(val as number)).toBe(true);
        expect([0, 1]).toContain(val);
      });
    });
  });
});
