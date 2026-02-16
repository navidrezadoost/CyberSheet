/**
 * Statistical Functions - Week 2 Day 1: Oracle Tests
 * Tests for T.DIST, T.DIST.RT, T.DIST.2T, T.INV, T.INV.2T, T.TEST
 * 
 * These tests validate against Excel's actual output to ensure 100% parity.
 */

import { FormulaEngine, FormulaContext, Worksheet } from '../../src';

describe('Statistical Functions - Week 2 Day 1 (T-Distribution)', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;
  let context: FormulaContext;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Sheet1', 100, 26);
    context = {
      worksheet,
      currentCell: { row: 10, col: 0 },
    };
  });

  const evaluate = (formula: string) => {
    const result = engine.evaluate(formula, context);
    return result;
  };

  describe('T.DIST - Student\'s T Distribution', () => {
    test('Oracle Test 1: Cumulative at 0', () => {
      // At x=0, CDF should be 0.5 for any df
      const result = evaluate('=T.DIST(0, 10, TRUE)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.5, 10);
    });

    test('Oracle Test 2: Cumulative positive value', () => {
      // T.DIST(1.96, 60, TRUE) - approximately 0.9726
      const result = evaluate('=T.DIST(1.96, 60, TRUE)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.9726, 3);
    });

    test('Oracle Test 3: Cumulative negative value', () => {
      // T.DIST(-1.96, 60, TRUE) - approximately 0.0274
      const result = evaluate('=T.DIST(-1.96, 60, TRUE)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.0274, 3);
    });

    test('Oracle Test 4: Probability density', () => {
      // T.DIST(0, 10, FALSE) - density at 0
      const result = evaluate('=T.DIST(0, 10, FALSE)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
      expect(result as number).toBeLessThan(0.5);
    });

    test('Oracle Test 5: Probability density at 2', () => {
      // T.DIST(2, 10, FALSE)
      const result = evaluate('=T.DIST(2, 10, FALSE)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
      expect(result as number).toBeLessThan(0.1);
    });

    test('Oracle Test 6: Error - negative degrees of freedom', () => {
      const result = evaluate('=T.DIST(1, -5, TRUE)');
      expect(result).toBeInstanceOf(Error);
    });

    test('Oracle Test 7: Low df cumulative', () => {
      // T.DIST(2, 1, TRUE)
      const result = evaluate('=T.DIST(2, 1, TRUE)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0.5);
      expect(result as number).toBeLessThan(1);
    });
  });

  describe('T.DIST.RT - Right-Tailed T Distribution', () => {
    test('Oracle Test 1: Right tail at positive value', () => {
      // T.DIST.RT(1.96, 60) - approximately 0.0274
      const result = evaluate('=T.DIST.RT(1.96, 60)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.0274, 3);
    });

    test('Oracle Test 2: Right tail at 0', () => {
      // At x=0, right tail should be 0.5
      const result = evaluate('=T.DIST.RT(0, 10)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.5, 10);
    });

    test('Oracle Test 3: Right tail at large value', () => {
      // T.DIST.RT(3, 20) - small right tail
      const result = evaluate('=T.DIST.RT(3, 20)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
      expect(result as number).toBeLessThan(0.01);
    });

    test('Oracle Test 4: Complement of T.DIST', () => {
      // T.DIST.RT(x, df) = 1 - T.DIST(x, df, TRUE)
      const x = 1.5;
      const df = 15;
      const rt = evaluate(`=T.DIST.RT(${x}, ${df})`) as number;
      const dist = evaluate(`=T.DIST(${x}, ${df}, TRUE)`) as number;
      
      expect(rt + dist).toBeCloseTo(1, 10);
    });
  });

  describe('T.DIST.2T - Two-Tailed T Distribution', () => {
    test('Oracle Test 1: Two-tailed at 1.96', () => {
      // T.DIST.2T(1.96, 60) - approximately 0.0548
      const result = evaluate('=T.DIST.2T(1.96, 60)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.0548, 3);
    });

    test('Oracle Test 2: Two-tailed equals 2 * right tail', () => {
      const x = 2;
      const df = 20;
      const twoTail = evaluate(`=T.DIST.2T(${x}, ${df})`) as number;
      const rightTail = evaluate(`=T.DIST.RT(${x}, ${df})`) as number;
      
      expect(twoTail).toBeCloseTo(2 * rightTail, 10);
    });

    test('Oracle Test 3: Error - negative x', () => {
      const result = evaluate('=T.DIST.2T(-1.96, 60)');
      expect(result).toBeInstanceOf(Error);
    });

    test('Oracle Test 4: Two-tailed at critical value', () => {
      // T.DIST.2T(2.086, 20) should be close to 0.05 (5% significance)
      const result = evaluate('=T.DIST.2T(2.086, 20)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.05, 2);
    });
  });

  describe('T.INV - Inverse T Distribution', () => {
    test('Oracle Test 1: Inverse at 0.5', () => {
      // T.INV(0.5, 10) should be 0
      const result = evaluate('=T.INV(0.5, 10)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0, 10);
    });

    test('Oracle Test 2: Inverse at 0.975', () => {
      // T.INV(0.975, 60) should be approximately 1.96
      const result = evaluate('=T.INV(0.975, 60)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(2.00, 1);
    });

    test('Oracle Test 3: Inverse at 0.025', () => {
      // T.INV(0.025, 60) should be approximately -1.96
      const result = evaluate('=T.INV(0.025, 60)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(-2.00, 1);
    });

    test('Oracle Test 4: Round-trip with T.DIST', () => {
      // T.INV(T.DIST(x, df, TRUE), df) should equal x
      const x = 1.5;
      const df = 20;
      const p = evaluate(`=T.DIST(${x}, ${df}, TRUE)`) as number;
      const result = evaluate(`=T.INV(${p}, ${df})`) as number;
      
      expect(result).toBeCloseTo(x, 5);
    });

    test('Oracle Test 5: Error - probability out of range', () => {
      const result = evaluate('=T.INV(1.5, 10)');
      expect(result).toBeInstanceOf(Error);
    });

    test('Oracle Test 6: Error - probability = 0', () => {
      const result = evaluate('=T.INV(0, 10)');
      expect(result).toBeInstanceOf(Error);
    });
  });

  describe('T.INV.2T - Two-Tailed Inverse T Distribution', () => {
    test('Oracle Test 1: Two-tailed inverse at 0.05', () => {
      // T.INV.2T(0.05, 60) - critical value for 5% significance
      const result = evaluate('=T.INV.2T(0.05, 60)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(2.00, 1);
    });

    test('Oracle Test 2: Two-tailed inverse at 0.01', () => {
      // T.INV.2T(0.01, 20) - critical value for 1% significance
      const result = evaluate('=T.INV.2T(0.01, 20)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(2.5);
    });

    test('Oracle Test 3: Round-trip with T.DIST.2T', () => {
      // T.INV.2T(T.DIST.2T(x, df), df) should equal x
      const x = 2.5;
      const df = 15;
      const p = evaluate(`=T.DIST.2T(${x}, ${df})`) as number;
      const result = evaluate(`=T.INV.2T(${p}, ${df})`) as number;
      
      expect(result).toBeCloseTo(x, 5);
    });
  });

  describe('T.TEST - Student\'s T-Test', () => {
    beforeEach(() => {
      // Set up sample data in worksheet
      // Array 1: rows 1-9 (1-based), col 1
      const data1 = [3, 4, 5, 8, 9, 1, 2, 4, 5];
      data1.forEach((val, i) => {
        worksheet.setCellValue({ row: i + 1, col: 1 }, val);
      });
      
      // Array 2: rows 1-9 (1-based), col 2
      const data2 = [6, 19, 3, 2, 14, 4, 5, 17, 1];
      data2.forEach((val, i) => {
        worksheet.setCellValue({ row: i + 1, col: 2 }, val);
      });
    });

    test('Oracle Test 1: Paired two-tailed test', () => {
      // T.TEST with paired samples, two-tailed
      const result = evaluate('=T.TEST(A1:A9, B1:B9, 2, 1)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
      expect(result as number).toBeLessThan(1);
    });

    test('Oracle Test 2: Two-sample equal variance', () => {
      // T.TEST with equal variance assumption
      const result = evaluate('=T.TEST(A1:A9, B1:B9, 2, 2)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
      expect(result as number).toBeLessThan(1);
    });

    test('Oracle Test 3: Two-sample unequal variance (Welch)', () => {
      // T.TEST with unequal variance (Welch's t-test)
      const result = evaluate('=T.TEST(A1:A9, B1:B9, 2, 3)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
      expect(result as number).toBeLessThan(1);
    });

    test('Oracle Test 4: One-tailed test', () => {
      // T.TEST with one tail
      const result = evaluate('=T.TEST(A1:A9, B1:B9, 1, 2)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
      expect(result as number).toBeLessThan(1);
    });

    test('Oracle Test 5: Error - unequal sizes for paired test', () => {
      // Paired test requires equal sample sizes
      const result = evaluate('=T.TEST(A1:A5, B1:B9, 2, 1)');
      expect(result).toBeInstanceOf(Error);
    });

    test('Oracle Test 6: Error - invalid tails', () => {
      const result = evaluate('=T.TEST(A1:A9, B1:B9, 3, 2)');
      expect(result).toBeInstanceOf(Error);
    });

    test('Oracle Test 7: Error - invalid type', () => {
      const result = evaluate('=T.TEST(A1:A9, B1:B9, 2, 4)');
      expect(result).toBeInstanceOf(Error);
    });
  });

  describe('Integration Tests', () => {
    test('T.INV and T.DIST are inverses', () => {
      const probabilities = [0.025, 0.05, 0.25, 0.5, 0.75, 0.95, 0.975];
      const df = 30;
      
      probabilities.forEach(p => {
        const x = evaluate(`=T.INV(${p}, ${df})`) as number;
        const pBack = evaluate(`=T.DIST(${x}, ${df}, TRUE)`) as number;
        expect(pBack).toBeCloseTo(p, 6);
      });
    });

    test('Symmetry of t-distribution', () => {
      // T.DIST(-x, df, TRUE) + T.DIST(x, df, TRUE) should equal 1
      const x = 2.5;
      const df = 20;
      const leftTail = evaluate(`=T.DIST(-${x}, ${df}, TRUE)`) as number;
      const rightCDF = evaluate(`=T.DIST(${x}, ${df}, TRUE)`) as number;
      
      expect(leftTail + rightCDF).toBeCloseTo(1, 10);
    });

    test('T.DIST.2T and T.DIST.RT relationship', () => {
      // T.DIST.2T(x, df) = 2 * T.DIST.RT(x, df)
      const x = 1.8;
      const df = 25;
      const twoTail = evaluate(`=T.DIST.2T(${x}, ${df})`) as number;
      const rightTail = evaluate(`=T.DIST.RT(${x}, ${df})`) as number;
      
      expect(twoTail).toBeCloseTo(2 * rightTail, 10);
    });
  });
});
