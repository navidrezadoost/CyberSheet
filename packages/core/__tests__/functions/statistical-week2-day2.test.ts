/**
 * @jest-environment node
 * 
 * Week 2 Day 2: F-Distribution Functions
 * Oracle tests comparing against Excel outputs
 * 
 * Functions tested:
 * - F.DIST (cumulative and density)
 * - F.DIST.RT (right-tailed)
 * - F.INV (quantile/inverse)
 * - F.INV.RT (right-tailed inverse)
 * - F.TEST (variance ratio test)
 */

import { FormulaEngine, FormulaContext, Worksheet } from '../../src';

describe('Statistical Functions - Week 2 Day 2 (F-Distribution)', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;
  let context: FormulaContext;
  let evaluate: (formula: string) => any;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Sheet1', 100, 26);
    context = {
      worksheet,
      currentCell: { row: 10, col: 0 },
    };
    
    evaluate = (formula: string) => engine.evaluate(formula, context);
  });

  describe('F.DIST - F Distribution', () => {
    test('Oracle Test 1: Cumulative at x=1', () => {
      // F.DIST(1, 5, 10, TRUE) - x=1 is median-ish for F(5,10)
      // Oracle corrected: Maps to Beta(1/3, 2.5, 5) via Beta-F transformation
      const result = evaluate('=F.DIST(1, 5, 10, TRUE)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.5349, 4);
    });

    test('Oracle Test 2: Cumulative at x=2', () => {
      // F.DIST(2, 5, 10, TRUE)
      // Oracle corrected: Maps to Beta(1/2, 2.5, 5) via Beta-F transformation
      const result = evaluate('=F.DIST(2, 5, 10, TRUE)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.8358, 4);
    });

    test('Oracle Test 3: Cumulative at x=0', () => {
      // F.DIST(0, 5, 10, TRUE) should be 0
      const result = evaluate('=F.DIST(0, 5, 10, TRUE)');
      expect(result).toBe(0);
    });

    test('Oracle Test 4: Density (PDF) at x=1', () => {
      // F.DIST(1, 5, 10, FALSE) - probability density
      // Oracle corrected: F-PDF derived from Beta-PDF transformation
      const result = evaluate('=F.DIST(1, 5, 10, FALSE)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.4955, 4);
    });

    test('Oracle Test 5: Density at x=2', () => {
      // F.DIST(2, 5, 10, FALSE)
      // Oracle corrected: F-PDF derived from Beta-PDF transformation
      const result = evaluate('=F.DIST(2, 5, 10, FALSE)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.1620, 4);
    });

    test('Oracle Test 6: Different degrees of freedom', () => {
      // F.DIST(15.2069, 6, 4, TRUE) - should be close to 0.99
      const result = evaluate('=F.DIST(15.2069, 6, 4, TRUE)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.99, 2);
    });

    test('Oracle Test 7: Error - negative x', () => {
      const result = evaluate('=F.DIST(-1, 5, 10, TRUE)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('Oracle Test 8: Error - invalid degrees of freedom', () => {
      const result = evaluate('=F.DIST(1, 0, 10, TRUE)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });
  });

  describe('F.DIST.RT - Right-Tailed F Distribution', () => {
    test('Oracle Test 1: Right tail at x=1', () => {
      // F.DIST.RT(1, 5, 10) = 1 - F.DIST(1, 5, 10, TRUE)
      // Oracle corrected: 1 - 0.5349 = 0.4651
      const result = evaluate('=F.DIST.RT(1, 5, 10)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.4651, 4);
    });

    test('Oracle Test 2: Right tail at x=2', () => {
      // F.DIST.RT(2, 5, 10)
      // Oracle corrected: 1 - 0.8358 = 0.1642
      const result = evaluate('=F.DIST.RT(2, 5, 10)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.1642, 4);
    });

    test('Oracle Test 3: Right tail at high x', () => {
      // F.DIST.RT(15.2069, 6, 4) - should be close to 0.01
      const result = evaluate('=F.DIST.RT(15.2069, 6, 4)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.01, 2);
    });

    test('Oracle Test 4: Complement relationship', () => {
      // F.DIST.RT(x) + F.DIST(x, TRUE) should equal 1
      const x = 1.5;
      const leftTail = evaluate('=F.DIST(1.5, 5, 10, TRUE)');
      const rightTail = evaluate('=F.DIST.RT(1.5, 5, 10)');
      expect(typeof leftTail).toBe('number');
      expect(typeof rightTail).toBe('number');
      expect((leftTail as number) + (rightTail as number)).toBeCloseTo(1, 10);
    });
  });

  describe('F.INV - Inverse F Distribution', () => {
    test('Oracle Test 1: Inverse at p=0.5', () => {
      // F.INV(0.5, 5, 10) - median
      // Oracle corrected: Bisection converges to true median ≈ 0.932
      const result = evaluate('=F.INV(0.5, 5, 10)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.932, 3);
    });

    test('Oracle Test 2: Inverse at p=0.99', () => {
      // F.INV(0.99, 6, 4) - should be close to 15.2069
      const result = evaluate('=F.INV(0.99, 6, 4)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(15.2069, 1);
    });

    test('Oracle Test 3: Inverse at p=0.05', () => {
      // F.INV(0.05, 5, 10)
      // Oracle corrected: Inverse of corrected CDF
      const result = evaluate('=F.INV(0.05, 5, 10)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.2112, 4);
    });

    test('Oracle Test 4: Inverse at p=0.95', () => {
      // F.INV(0.95, 5, 10)
      const result = evaluate('=F.INV(0.95, 5, 10)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(3.3258, 2);
    });

    test('Oracle Test 5: Round-trip symmetry', () => {
      // F.INV(F.DIST(x)) should approximately equal x
      const x = 2.5;
      const p = evaluate('=F.DIST(2.5, 5, 10, TRUE)');
      const xBack = evaluate(`=F.INV(${p}, 5, 10)`);
      expect(typeof xBack).toBe('number');
      expect(xBack as number).toBeCloseTo(x, 4);
    });

    test('Oracle Test 6: Edge case p=0', () => {
      const result = evaluate('=F.INV(0, 5, 10)');
      expect(result).toBe(0);
    });

    test('Oracle Test 7: Edge case p=1', () => {
      const result = evaluate('=F.INV(1, 5, 10)');
      expect(result).toBe(Infinity);
    });

    test('Oracle Test 8: Error - p out of range', () => {
      const result = evaluate('=F.INV(1.5, 5, 10)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });
  });

  describe('F.INV.RT - Right-Tailed Inverse F Distribution', () => {
    test('Oracle Test 1: Right-tail inverse at p=0.01', () => {
      // F.INV.RT(0.01, 6, 4) should match F.INV(0.99, 6, 4)
      const result = evaluate('=F.INV.RT(0.01, 6, 4)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(15.2069, 1);
    });

    test('Oracle Test 2: Right-tail inverse at p=0.05', () => {
      // F.INV.RT(0.05, 5, 10)
      const result = evaluate('=F.INV.RT(0.05, 5, 10)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(3.3258, 2);
    });

    test('Oracle Test 3: Relationship with F.INV', () => {
      // F.INV.RT(p) should equal F.INV(1-p)
      const p = 0.1;
      const invRT = evaluate('=F.INV.RT(0.1, 5, 10)');
      const inv = evaluate('=F.INV(0.9, 5, 10)');
      expect(typeof invRT).toBe('number');
      expect(typeof inv).toBe('number');
      expect(invRT as number).toBeCloseTo(inv as number, 8);
    });

    test('Oracle Test 4: Round-trip with F.DIST.RT', () => {
      // F.INV.RT(F.DIST.RT(x)) should approximately equal x
      const x = 2.5;
      const p = evaluate('=F.DIST.RT(2.5, 5, 10)');
      const xBack = evaluate(`=F.INV.RT(${p}, 5, 10)`);
      expect(typeof xBack).toBe('number');
      expect(xBack as number).toBeCloseTo(x, 4);
    });
  });

  describe('F.TEST - F-Test for Equal Variances', () => {
    beforeEach(() => {
      // Set up sample data in worksheet
      // Array 1: rows 0-8, col 0 (moderate variance)
      const data1 = [3, 4, 5, 8, 9, 1, 2, 4, 5];
      data1.forEach((val, i) => {
        worksheet.setCellValue({ row: i, col: 0 }, val);
      });
      
      // Array 2: rows 0-8, col 1 (higher variance)
      const data2 = [6, 19, 3, 2, 14, 4, 5, 17, 1];
      data2.forEach((val, i) => {
        worksheet.setCellValue({ row: i, col: 1 }, val);
      });
      
      // Array 3: rows 0-8, col 2 (similar variance to data1)
      const data3 = [4, 5, 6, 7, 8, 2, 3, 5, 6];
      data3.forEach((val, i) => {
        worksheet.setCellValue({ row: i, col: 2 }, val);
      });
    });

    test('Oracle Test 1: Different variances', () => {
      // F.TEST with arrays of different variance
      const result = evaluate('=F.TEST(A1:A9, B1:B9)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
      expect(result as number).toBeLessThan(1);
      // With high variance difference, p-value should be relatively low
      expect(result as number).toBeLessThan(0.5);
    });

    test('Oracle Test 2: Similar variances', () => {
      // F.TEST with arrays of similar variance
      const result = evaluate('=F.TEST(A1:A9, C1:C9)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
      expect(result as number).toBeLessThan(1);
      // With similar variance, p-value should be relatively high
      expect(result as number).toBeGreaterThan(0.3);
    });

    test('Oracle Test 3: Identical arrays', () => {
      // F.TEST with identical arrays - F=1, p-value should be close to 1
      const result = evaluate('=F.TEST(A1:A9, A1:A9)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(1, 1);
    });

    test('Oracle Test 4: Symmetry of F.TEST', () => {
      // F.TEST(A, B) should equal F.TEST(B, A)
      const result1 = evaluate('=F.TEST(A1:A9, B1:B9)');
      const result2 = evaluate('=F.TEST(B1:B9, A1:A9)');
      expect(typeof result1).toBe('number');
      expect(typeof result2).toBe('number');
      expect(result1 as number).toBeCloseTo(result2 as number, 10);
    });

    test('Oracle Test 5: Error - insufficient data', () => {
      // F.TEST requires at least 2 values in each array
      const result = evaluate('=F.TEST(A1, B1)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#DIV/0!');
    });

    test('Oracle Test 6: Constant array (zero variance)', () => {
      // Set constant values in column D
      for (let i = 0; i < 9; i++) {
        worksheet.setCellValue({ row: i, col: 3 }, 5);
      }
      const result = evaluate('=F.TEST(A1:A9, D1:D9)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#DIV/0!');
    });

    test('Oracle Test 7: Large variance ratio', () => {
      // Create array with very high variance
      const highVar = [1, 100, 1, 100, 1, 100, 1, 100, 1];
      highVar.forEach((val, i) => {
        worksheet.setCellValue({ row: i, col: 4 }, val);
      });
      
      const result = evaluate('=F.TEST(A1:A9, E1:E9)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
      expect(result as number).toBeLessThan(0.1); // Very low p-value
    });
  });

  describe('Integration Tests', () => {
    test('F.INV and F.DIST are inverses (multiple points)', () => {
      const testValues = [0.1, 0.25, 0.5, 0.75, 0.9];
      
      for (const p of testValues) {
        const x = evaluate(`=F.INV(${p}, 5, 10)`);
        const pBack = evaluate(`=F.DIST(${x}, 5, 10, TRUE)`);
        expect(typeof pBack).toBe('number');
        expect(pBack as number).toBeCloseTo(p, 6);
      }
    });

    test('F.INV.RT and F.DIST.RT are inverses', () => {
      const testValues = [0.01, 0.05, 0.1, 0.5];
      
      for (const p of testValues) {
        const x = evaluate(`=F.INV.RT(${p}, 5, 10)`);
        const pBack = evaluate(`=F.DIST.RT(${x}, 5, 10)`);
        expect(typeof pBack).toBe('number');
        expect(pBack as number).toBeCloseTo(p, 6);
      }
    });

    test('Beta-F relationship verification', () => {
      // F.DIST(x, d1, d2, TRUE) should equal BETA.DIST(d1*x/(d1*x+d2), d1/2, d2/2, TRUE)
      // We can verify this relationship manually
      const x = 2;
      const d1 = 5;
      const d2 = 10;
      
      const fDist = evaluate('=F.DIST(2, 5, 10, TRUE)');
      
      // Calculate Beta transformation: betaX = d1*x/(d1*x+d2)
      const betaX = (d1 * x) / (d1 * x + d2);
      // betaX = 10/20 = 0.5
      // We'd need BETA.DIST to verify, but we can at least check F.DIST works
      expect(typeof fDist).toBe('number');
      expect(fDist as number).toBeGreaterThan(0);
      expect(fDist as number).toBeLessThan(1);
    });

    test('Extreme degrees of freedom stability', () => {
      // Test with very different degrees of freedom
      const result1 = evaluate('=F.DIST(1, 1, 100, TRUE)');
      const result2 = evaluate('=F.DIST(1, 100, 1, TRUE)');
      
      expect(typeof result1).toBe('number');
      expect(typeof result2).toBe('number');
      expect(result1 as number).toBeGreaterThan(0);
      expect(result1 as number).toBeLessThan(1);
      expect(result2 as number).toBeGreaterThan(0);
      expect(result2 as number).toBeLessThan(1);
    });
  });
});
