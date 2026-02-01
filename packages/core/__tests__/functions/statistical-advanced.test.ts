/**
 * statistical-advanced.test.ts
 * 
 * Tests for Week 10 Day 1-2: Advanced Statistical Functions
 * - PERCENTRANK (PERCENTRANK.INC / PERCENTRANK.EXC)
 * - Additional tests for existing PERCENTILE/QUARTILE/RANK functions
 * 
 * Coverage:
 * - PERCENTILE.INC/EXC (verify existing implementation)
 * - QUARTILE.INC/EXC (verify existing implementation)
 * - RANK.EQ/AVG (verify existing implementation)
 * - PERCENTRANK (new implementation)
 * - LARGE/SMALL (verify existing implementation)
 * - FREQUENCY (verify existing implementation)
 */

import { FormulaEngine, FormulaContext, Worksheet } from '../../src';

describe('Week 10 Day 1-2: Advanced Statistical Functions', () => {
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

  const evaluate = (formula: string) => engine.evaluate(formula, context);

  // ============================================
  // PERCENTILE.INC / PERCENTILE.EXC Tests
  // ============================================
  describe('PERCENTILE.INC (Inclusive Method)', () => {
    test('calculates 50th percentile (median)', () => {
      const result = evaluate('=PERCENTILE.INC(1, 2, 3, 4, 5, 0.5)');
      expect(result).toBe(3);
    });

    test('calculates 25th percentile', () => {
      const result = evaluate('=PERCENTILE.INC(1, 2, 3, 4, 5, 0.25)');
      expect(result).toBe(2);
    });

    test('calculates 75th percentile', () => {
      const result = evaluate('=PERCENTILE.INC(1, 2, 3, 4, 5, 0.75)');
      expect(result).toBe(4);
    });

    test('handles interpolation for non-exact percentiles', () => {
      const result = evaluate('=PERCENTILE.INC(10, 20, 30, 40, 0.3)');
      expect(result).toBeCloseTo(19, 5);
    });

    test('accepts k=0 (minimum value)', () => {
      const result = evaluate('=PERCENTILE.INC(5, 10, 15, 20, 0)');
      expect(result).toBe(5);
    });

    test('accepts k=1 (maximum value)', () => {
      const result = evaluate('=PERCENTILE.INC(5, 10, 15, 20, 1)');
      expect(result).toBe(20);
    });

    test('works with unsorted data', () => {
      const result = evaluate('=PERCENTILE.INC(50, 10, 30, 20, 40, 0.5)');
      expect(result).toBe(30);
    });

    test('handles duplicates', () => {
      const result = evaluate('=PERCENTILE.INC(1, 2, 2, 3, 4, 0.5)');
      expect(result).toBe(2);
    });

    test('returns #NUM! for k < 0', () => {
      const result = evaluate('=PERCENTILE.INC(1, 2, 3, -0.1)');
      expect(result).toEqual(new Error('#NUM!'));
    });

    test('returns #NUM! for k > 1', () => {
      const result = evaluate('=PERCENTILE.INC(1, 2, 3, 1.1)');
      expect(result).toEqual(new Error('#NUM!'));
    });

    test('returns #NUM! for empty array', () => {
      const result = evaluate('=PERCENTILE.INC({}, 0.5)');
      expect(result).toEqual(new Error('#NUM!'));
    });

    test('matches Excel reference values', () => {
      // Excel: =PERCENTILE.INC({1,2,3,4,5,6,7,8,9,10}, 0.3) = 3.7
      const result = evaluate('=PERCENTILE.INC(1,2,3,4,5,6,7,8,9,10, 0.3)');
      expect(result).toBeCloseTo(3.7, 5);
    });
  });

  describe('PERCENTILE.EXC (Exclusive Method)', () => {
    test('calculates 50th percentile', () => {
      const result = evaluate('=PERCENTILE.EXC(1, 2, 3, 4, 5, 0.5)');
      expect(result).toBe(3);
    });

    test('calculates 25th percentile', () => {
      const result = evaluate('=PERCENTILE.EXC(1, 2, 3, 4, 5, 6, 7, 0.25)');
      expect(result).toBe(2);
    });

    test('returns #NUM! for k=0 (exclusive boundaries)', () => {
      const result = evaluate('=PERCENTILE.EXC(1, 2, 3, 0)');
      expect(result).toEqual(new Error('#NUM!'));
    });

    test('returns #NUM! for k=1 (exclusive boundaries)', () => {
      const result = evaluate('=PERCENTILE.EXC(1, 2, 3, 1)');
      expect(result).toEqual(new Error('#NUM!'));
    });

    test('returns #NUM! for array with < 2 elements', () => {
      const result = evaluate('=PERCENTILE.EXC(1, 0.5)');
      expect(result).toEqual(new Error('#NUM!'));
    });

    test('different from PERCENTILE.INC for boundary values', () => {
      const inc = evaluate('=PERCENTILE.INC(1,2,3,4,5, 0.2)');
      const exc = evaluate('=PERCENTILE.EXC(1,2,3,4,5, 0.2)');
      expect(inc).not.toBe(exc);
    });

    test('matches Excel reference values', () => {
      // Excel: =PERCENTILE.EXC({1,2,3,4,5,6,7,8,9,10}, 0.3) = 3.4
      const result = evaluate('=PERCENTILE.EXC(1,2,3,4,5,6,7,8,9,10, 0.3)');
      expect(result).toBeCloseTo(3.4, 5);
    });
  });

  describe('PERCENTILE (Alias for PERCENTILE.INC)', () => {
    test('behaves identically to PERCENTILE.INC', () => {
      const percentile = evaluate('=PERCENTILE(1,2,3,4,5, 0.75)');
      const percentile_inc = evaluate('=PERCENTILE.INC(1,2,3,4,5, 0.75)');
      expect(percentile).toBe(percentile_inc);
    });
  });

  // ============================================
  // QUARTILE.INC / QUARTILE.EXC Tests
  // ============================================
  describe('QUARTILE.INC', () => {
    test('Q0 returns minimum', () => {
      const result = evaluate('=QUARTILE.INC(1,2,3,4,5, 0)');
      expect(result).toBe(1);
    });

    test('Q1 returns 25th percentile', () => {
      const result = evaluate('=QUARTILE.INC(1,2,3,4,5, 1)');
      expect(result).toBe(2);
    });

    test('Q2 returns median (50th percentile)', () => {
      const result = evaluate('=QUARTILE.INC(1,2,3,4,5, 2)');
      expect(result).toBe(3);
    });

    test('Q3 returns 75th percentile', () => {
      const result = evaluate('=QUARTILE.INC(1,2,3,4,5, 3)');
      expect(result).toBe(4);
    });

    test('Q4 returns maximum', () => {
      const result = evaluate('=QUARTILE.INC(1,2,3,4,5, 4)');
      expect(result).toBe(5);
    });

    test('returns #NUM! for quart < 0', () => {
      const result = evaluate('=QUARTILE.INC(1,2,3, -1)');
      expect(result).toEqual(new Error('#NUM!'));
    });

    test('returns #NUM! for quart > 4', () => {
      const result = evaluate('=QUARTILE.INC(1,2,3, 5)');
      expect(result).toEqual(new Error('#NUM!'));
    });

    test('returns #NUM! for non-integer quart', () => {
      const result = evaluate('=QUARTILE.INC(1,2,3,4,5, 1.5)');
      expect(result).toEqual(new Error('#NUM!'));
    });

    test('matches Excel reference values', () => {
      // Excel: =QUARTILE.INC({1,2,3,4,5,6,7,8,9,10}, 1) = 3.25
      const result = evaluate('=QUARTILE.INC(1,2,3,4,5,6,7,8,9,10, 1)');
      expect(result).toBeCloseTo(3.25, 5);
    });
  });

  describe('QUARTILE.EXC', () => {
    test('Q1 returns 25th percentile (exclusive)', () => {
      const result = evaluate('=QUARTILE.EXC(1,2,3,4,5,6,7, 1)');
      expect(result).toBe(2);
    });

    test('Q2 returns median', () => {
      const result = evaluate('=QUARTILE.EXC(1,2,3,4,5, 2)');
      expect(result).toBe(3);
    });

    test('Q3 returns 75th percentile (exclusive)', () => {
      const result = evaluate('=QUARTILE.EXC(1,2,3,4,5,6,7, 3)');
      expect(result).toBe(6);
    });

    test('returns #NUM! for quart=0 (exclusive)', () => {
      const result = evaluate('=QUARTILE.EXC(1,2,3,4,5, 0)');
      expect(result).toEqual(new Error('#NUM!'));
    });

    test('returns #NUM! for quart=4 (exclusive)', () => {
      const result = evaluate('=QUARTILE.EXC(1,2,3,4,5, 4)');
      expect(result).toEqual(new Error('#NUM!'));
    });

    test('different from QUARTILE.INC', () => {
      const inc = evaluate('=QUARTILE.INC(1,2,3,4,5,6,7,8,9,10, 1)');
      const exc = evaluate('=QUARTILE.EXC(1,2,3,4,5,6,7,8,9,10, 1)');
      expect(inc).not.toBe(exc);
    });
  });

  // ============================================
  // RANK.EQ / RANK.AVG Tests
  // ============================================
  describe('RANK.EQ (Equal values get same rank)', () => {
    test('ranks in descending order by default', () => {
      const result = evaluate('=RANK.EQ(7, 1, 5, 7, 10, 15)');
      expect(result).toBe(3);
    });

    test('ranks in ascending order with order=1', () => {
      const result = evaluate('=RANK.EQ(7, 1, 5, 7, 10, 15, 1)');
      expect(result).toBe(3);
    });

    test('ties get the same rank (first occurrence)', () => {
      const result = evaluate('=RANK.EQ(5, 10, 5, 5, 3, 1)');
      expect(result).toBe(2);
    });

    test('returns #N/A if number not in array', () => {
      const result = evaluate('=RANK.EQ(99, 1, 2, 3)');
      expect(result).toEqual(new Error('#N/A'));
    });

    test('handles single value', () => {
      const result = evaluate('=RANK.EQ(5, 5)');
      expect(result).toBe(1);
    });

    test('matches Excel for large datasets', () => {
      const result = evaluate('=RANK.EQ(50, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100)');
      expect(result).toBe(6);
    });
  });

  describe('RANK.AVG (Equal values get average rank)', () => {
    test('single occurrence returns normal rank', () => {
      const result = evaluate('=RANK.AVG(7, 1, 5, 7, 10, 15)');
      expect(result).toBe(3);
    });

    test('two ties get average rank', () => {
      // Ranks 2 and 3 → average = 2.5
      const result = evaluate('=RANK.AVG(5, 10, 5, 5, 1)');
      expect(result).toBe(2.5);
    });

    test('three ties get average rank', () => {
      // Ranks 1, 2, 3 → average = 2
      const result = evaluate('=RANK.AVG(10, 10, 10, 10, 5, 1)');
      expect(result).toBe(2);
    });

    test('works with ascending order', () => {
      const result = evaluate('=RANK.AVG(5, 10, 5, 5, 1, 1)');
      expect(result).toBe(2.5);
    });

    test('returns #N/A if number not in array', () => {
      const result = evaluate('=RANK.AVG(99, 1, 2, 3)');
      expect(result).toEqual(new Error('#N/A'));
    });

    test('different from RANK.EQ for ties', () => {
      const eq = evaluate('=RANK.EQ(5, 10, 5, 5, 1)');
      const avg = evaluate('=RANK.AVG(5, 10, 5, 5, 1)');
      expect(eq).toBe(2);
      expect(avg).toBe(2.5);
    });

    test('matches Excel reference values', () => {
      // Excel: =RANK.AVG(70, 50, 70, 70, 80, 90) = 3
      const result = evaluate('=RANK.AVG(70, 50, 70, 70, 80, 90)');
      expect(result).toBe(3);
    });
  });

  describe('RANK (Alias for RANK.EQ)', () => {
    test('behaves identically to RANK.EQ', () => {
      const rank = evaluate('=RANK(5, 10, 5, 3, 1)');
      const rank_eq = evaluate('=RANK.EQ(5, 10, 5, 3, 1)');
      expect(rank).toBe(rank_eq);
    });
  });

  // ============================================
  // PERCENTRANK Tests (NEW IMPLEMENTATION)
  // ============================================
  describe('PERCENTRANK.INC (NEW)', () => {
    test('returns percentrank of exact value', () => {
      const result = evaluate('=PERCENTRANK.INC(1,2,3,4,5, 3)');
      expect(result).toBe(0.5);
    });

    test('returns 0 for minimum value', () => {
      const result = evaluate('=PERCENTRANK.INC(1,2,3,4,5, 1)');
      expect(result).toBe(0);
    });

    test('returns 1 for maximum value', () => {
      const result = evaluate('=PERCENTRANK.INC(1,2,3,4,5, 5)');
      expect(result).toBe(1);
    });

    test('interpolates for values between data points', () => {
      const result = evaluate('=PERCENTRANK.INC(1,2,3,4,5, 3.5)');
      expect(result).toBeCloseTo(0.625, 5);
    });

    test('handles unsorted data', () => {
      const result = evaluate('=PERCENTRANK.INC(5,1,3,2,4, 3)');
      expect(result).toBe(0.5);
    });

    test('handles duplicate values', () => {
      const result = evaluate('=PERCENTRANK.INC(1,2,2,3,4, 2)');
      // Should return rank of first occurrence
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    test('returns #N/A for value below minimum', () => {
      const result = evaluate('=PERCENTRANK.INC(10,20,30, 5)');
      expect(result).toEqual(new Error('#N/A'));
    });

    test('returns #N/A for value above maximum', () => {
      const result = evaluate('=PERCENTRANK.INC(10,20,30, 40)');
      expect(result).toEqual(new Error('#N/A'));
    });

    test('accepts optional significance parameter', () => {
      const result = evaluate('=PERCENTRANK.INC(1,2,3,4,5, 3, 1)');
      expect(result).toBe(0.5);
    });

    test('rounds to specified significance', () => {
      const result = evaluate('=PERCENTRANK.INC(1,2,3,4,5, 3.7, 2)');
      // Should round to 2 decimal places
      expect(typeof result).toBe('number');
      if (typeof result === 'number') {
        const decimalPlaces = result.toString().split('.')[1]?.length || 0;
        expect(decimalPlaces).toBeLessThanOrEqual(2);
      }
    });

    test('matches Excel reference values', () => {
      // Excel: =PERCENTRANK.INC({1,2,3,4,5,6,7,8,9,10}, 7) = 0.666...
      const result = evaluate('=PERCENTRANK.INC(1,2,3,4,5,6,7,8,9,10, 7)');
      expect(result).toBeCloseTo(0.666666, 5);
    });
  });

  describe('PERCENTRANK.EXC (NEW)', () => {
    test('returns percentrank (exclusive method)', () => {
      const result = evaluate('=PERCENTRANK.EXC(1,2,3,4,5, 3)');
      expect(result).toBeCloseTo(0.5, 5);
    });

    test('returns #N/A for minimum value (exclusive)', () => {
      const result = evaluate('=PERCENTRANK.EXC(1,2,3,4,5, 1)');
      expect(result).toEqual(new Error('#N/A'));
    });

    test('returns #N/A for maximum value (exclusive)', () => {
      const result = evaluate('=PERCENTRANK.EXC(1,2,3,4,5, 5)');
      expect(result).toEqual(new Error('#N/A'));
    });

    test('different from PERCENTRANK.INC', () => {
      const inc = evaluate('=PERCENTRANK.INC(1,2,3,4,5,6,7,8,9,10, 5)');
      const exc = evaluate('=PERCENTRANK.EXC(1,2,3,4,5,6,7,8,9,10, 5)');
      expect(inc).not.toBe(exc);
    });

    test('matches Excel reference values', () => {
      // Excel: =PERCENTRANK.EXC({1,2,3,4,5,6,7,8,9,10}, 7) = 0.6
      const result = evaluate('=PERCENTRANK.EXC(1,2,3,4,5,6,7,8,9,10, 7)');
      expect(result).toBeCloseTo(0.6, 5);
    });
  });

  describe('PERCENTRANK (Alias for PERCENTRANK.INC, NEW)', () => {
    test('behaves identically to PERCENTRANK.INC', () => {
      const percentrank = evaluate('=PERCENTRANK(1,2,3,4,5, 3)');
      const percentrank_inc = evaluate('=PERCENTRANK.INC(1,2,3,4,5, 3)');
      expect(percentrank).toBe(percentrank_inc);
    });
  });

  // ============================================
  // LARGE / SMALL Tests
  // ============================================
  describe('LARGE', () => {
    test('returns kth largest value', () => {
      expect(evaluate('=LARGE(10, 20, 30, 40, 50, 1)')).toBe(50);
      expect(evaluate('=LARGE(10, 20, 30, 40, 50, 2)')).toBe(40);
      expect(evaluate('=LARGE(10, 20, 30, 40, 50, 5)')).toBe(10);
    });

    test('handles unsorted data', () => {
      const result = evaluate('=LARGE(50, 10, 30, 20, 40, 3)');
      expect(result).toBe(30);
    });

    test('handles duplicates', () => {
      const result = evaluate('=LARGE(10, 20, 20, 30, 40, 2)');
      expect(result).toBe(30);
    });

    test('returns #NUM! for k < 1', () => {
      const result = evaluate('=LARGE(1, 2, 3, 0)');
      expect(result).toEqual(new Error('#NUM!'));
    });

    test('returns #NUM! for k > array length', () => {
      const result = evaluate('=LARGE(1, 2, 3, 5)');
      expect(result).toEqual(new Error('#NUM!'));
    });
  });

  describe('SMALL', () => {
    test('returns kth smallest value', () => {
      expect(evaluate('=SMALL(10, 20, 30, 40, 50, 1)')).toBe(10);
      expect(evaluate('=SMALL(10, 20, 30, 40, 50, 2)')).toBe(20);
      expect(evaluate('=SMALL(10, 20, 30, 40, 50, 5)')).toBe(50);
    });

    test('handles unsorted data', () => {
      const result = evaluate('=SMALL(50, 10, 30, 20, 40, 3)');
      expect(result).toBe(30);
    });

    test('handles duplicates', () => {
      const result = evaluate('=SMALL(10, 20, 20, 30, 40, 3)');
      expect(result).toBe(20);
    });

    test('returns #NUM! for k < 1', () => {
      const result = evaluate('=SMALL(1, 2, 3, 0)');
      expect(result).toEqual(new Error('#NUM!'));
    });

    test('returns #NUM! for k > array length', () => {
      const result = evaluate('=SMALL(1, 2, 3, 5)');
      expect(result).toEqual(new Error('#NUM!'));
    });
  });

  // ============================================
  // FREQUENCY Tests
  // ============================================
  describe('FREQUENCY', () => {
    test('returns frequency distribution', () => {
      const result = evaluate('=FREQUENCY(1, 2, 3, 4, 5, 6, 7, 8, 9, 3, 6, 9)');
      expect(result).toEqual([3, 3, 3, 0]);
    });

    test('handles unsorted bins', () => {
      const result = evaluate('=FREQUENCY(1, 2, 3, 4, 5, 5, 2)');
      // Should sort bins: [2, 5]
      expect(result).toEqual([2, 3, 0]);
    });

    test('counts values in correct bins', () => {
      const result = evaluate('=FREQUENCY(10, 20, 30, 40, 50, 25, 45)');
      // <=25: 10, 20 → 2
      // <=45: 30, 40 → 2
      // >45: 50 → 1
      expect(result).toEqual([2, 2, 1]);
    });

    test('returns extra bin for values above highest bin', () => {
      const result = evaluate('=FREQUENCY(1, 2, 3, 4, 5, 3)');
      expect(result).toEqual([3, 2]);
    });

    test('handles empty bins', () => {
      const result = evaluate('=FREQUENCY(1, 2, 3, 0, 5, 10)');
      expect(result).toEqual([0, 3, 0, 0]);
    });

    test('returns #N/A for empty data array', () => {
      const result = evaluate('=FREQUENCY({}, 1, 2, 3)');
      expect(result).toEqual(new Error('#N/A'));
    });

    test('matches Excel reference values', () => {
      const result = evaluate('=FREQUENCY(79, 85, 78, 85, 50, 81, 95, 88, 97, 70, 79, 89)');
      // <=70: 50 → 1
      // <=79: 78, 79 → 2
      // <=89: 81, 85, 85, 88 → 4
      // >89: 95, 97 → 2
      expect(result).toEqual([1, 2, 4, 2]);
    });
  });

  // ============================================
  // Integration Tests
  // ============================================
  describe('Integration: Combined Statistical Functions', () => {
    test('PERCENTILE and PERCENTRANK are inverse operations', () => {
      const percentile = evaluate('=PERCENTILE.INC(1,2,3,4,5, 0.75)');
      const rank = evaluate('=PERCENTRANK.INC(1,2,3,4,5, ' + percentile + ')');
      expect(rank).toBeCloseTo(0.75, 5);
    });

    test('QUARTILE returns same as PERCENTILE for quartile values', () => {
      const q1_quartile = evaluate('=QUARTILE.INC(1,2,3,4,5,6,7,8,9,10, 1)');
      const q1_percentile = evaluate('=PERCENTILE.INC(1,2,3,4,5,6,7,8,9,10, 0.25)');
      expect(q1_quartile).toBe(q1_percentile);
    });

    test('LARGE(array, 1) equals MAX(array)', () => {
      const large1 = evaluate('=LARGE(10, 20, 30, 40, 50, 1)');
      const max = evaluate('=MAX(10, 20, 30, 40, 50)');
      expect(large1).toBe(max);
    });

    test('SMALL(array, 1) equals MIN(array)', () => {
      const small1 = evaluate('=SMALL(10, 20, 30, 40, 50, 1)');
      const min = evaluate('=MIN(10, 20, 30, 40, 50)');
      expect(small1).toBe(min);
    });

    test('RANK and PERCENTRANK consistency', () => {
      // For same dataset, rank order should match percentrank order
      const data = '{10, 20, 30, 40, 50}';
      const rank30 = evaluate(`=RANK.EQ(30, $data)`);
      const percentrank30 = evaluate(`=PERCENTRANK.INC($data, 30)`);
      
      expect(rank30).toBe(3); // 3rd from top
      expect(percentrank30).toBe(0.5); // 50th percentile
    });
  });

  // ============================================
  // Edge Cases & Error Handling
  // ============================================
  describe('Edge Cases', () => {
    test('handles single-element arrays', () => {
      expect(evaluate('=PERCENTILE.INC(5, 0.5)')).toBe(5);
      expect(evaluate('=QUARTILE.INC(5, 2)')).toBe(5);
      expect(evaluate('=LARGE(5, 1)')).toBe(5);
      expect(evaluate('=SMALL(5, 1)')).toBe(5);
    });

    test('handles negative numbers', () => {
      expect(evaluate('=PERCENTILE.INC(-5, -3, -1, 0, 1, 0.5)')).toBe(-1);
      expect(evaluate('=RANK.EQ(-3, -5, -3, -1, 0, 1)')).toBe(4);
    });

    test('handles very large numbers', () => {
      const result = evaluate('=PERCENTILE.INC(1000000, 2000000, 3000000, 0.5)');
      expect(result).toBe(2000000);
    });

    test('handles decimal values', () => {
      const result = evaluate('=PERCENTILE.INC(1.1, 2.2, 3.3, 4.4, 5.5, 0.5)');
      expect(result).toBe(3.3);
    });
  });
});
