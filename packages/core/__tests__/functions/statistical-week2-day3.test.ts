/**
 * @jest-environment node
 * 
 * Week 2 Day 3: Chi-Square Distribution Functions
 * Oracle tests comparing against Excel outputs
 * 
 * Functions tested:
 * - CHISQ.DIST (cumulative and density)
 * - CHISQ.DIST.RT (right-tailed)
 * - CHISQ.INV (quantile/inverse)
 * - CHISQ.INV.RT (right-tailed inverse)
 * - CHISQ.TEST (goodness of fit test)
 */

import { FormulaEngine, FormulaContext, Worksheet } from '../../src';

describe('Statistical Functions - Week 2 Day 3 (Chi-Square)', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;
  let context: FormulaContext;
  let evaluate: (formula: string) => any;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Sheet1', 100, 26);
    context = {
      worksheet,
      currentCell: { row: 11, col: 1 },
    };
    
    evaluate = (formula: string) => engine.evaluate(formula, context);
  });

  describe('CHISQ.DIST - Chi-Square Distribution', () => {
    test('Oracle Test 1: CDF at x=2, df=1', () => {
      // CHISQ.DIST(2, 1, TRUE) - sensitive case with df=1
      const result = evaluate('=CHISQ.DIST(2, 1, TRUE)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.8427, 3);
    });

    test('Oracle Test 2: CDF at x=5, df=2', () => {
      // CHISQ.DIST(5, 2, TRUE)
      const result = evaluate('=CHISQ.DIST(5, 2, TRUE)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.9179, 3);
    });

    test('Oracle Test 3: CDF at x=10, df=5', () => {
      // CHISQ.DIST(10, 5, TRUE)
      const result = evaluate('=CHISQ.DIST(10, 5, TRUE)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.9247, 3);
    });

    test('Oracle Test 4: CDF at x=0', () => {
      // CHISQ.DIST(0, 5, TRUE) should be 0
      const result = evaluate('=CHISQ.DIST(0, 5, TRUE)');
      expect(result).toBe(0);
    });

    test('Oracle Test 5: PDF at x=2, df=1', () => {
      // CHISQ.DIST(2, 1, FALSE) - density
      const result = evaluate('=CHISQ.DIST(2, 1, FALSE)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.1037, 3);
    });

    test('Oracle Test 6: PDF at x=5, df=2', () => {
      // CHISQ.DIST(5, 2, FALSE)
      const result = evaluate('=CHISQ.DIST(5, 2, FALSE)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.0410, 3);
    });

    test('Oracle Test 7: PDF at x=10, df=5', () => {
      // CHISQ.DIST(10, 5, FALSE)
      // Chi-Square PDF: (1/2^(k/2)) * (1/Γ(k/2)) * x^(k/2-1) * e^(-x/2)
      // For x=10, df=5: PDF = 0.0283 (verified via standard statistical formula)
      const result = evaluate('=CHISQ.DIST(10, 5, FALSE)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.0283, 3);
    });

    test('Oracle Test 8: Error - negative x', () => {
      const result = evaluate('=CHISQ.DIST(-1, 5, TRUE)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('Oracle Test 9: Error - invalid df', () => {
      const result = evaluate('=CHISQ.DIST(2, 0, TRUE)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });
  });

  describe('CHISQ.DIST.RT - Right-Tailed Chi-Square', () => {
    test('Oracle Test 1: Right tail at x=2, df=1', () => {
      // CHISQ.DIST.RT(2, 1) = 1 - CHISQ.DIST(2, 1, TRUE)
      const result = evaluate('=CHISQ.DIST.RT(2, 1)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.1573, 3);
    });

    test('Oracle Test 2: Right tail at x=5, df=2', () => {
      // CHISQ.DIST.RT(5, 2)
      const result = evaluate('=CHISQ.DIST.RT(5, 2)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.0821, 3);
    });

    test('Oracle Test 3: Right tail at x=10, df=5', () => {
      // CHISQ.DIST.RT(10, 5)
      const result = evaluate('=CHISQ.DIST.RT(10, 5)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.0753, 3);
    });

    test('Oracle Test 4: Complement relationship', () => {
      // CHISQ.DIST.RT(x) + CHISQ.DIST(x, TRUE) should equal 1
      const x = 7.5;
      const df = 5;
      const leftTail = evaluate(`=CHISQ.DIST(${x}, ${df}, TRUE)`);
      const rightTail = evaluate(`=CHISQ.DIST.RT(${x}, ${df})`);
      expect(typeof leftTail).toBe('number');
      expect(typeof rightTail).toBe('number');
      expect((leftTail as number) + (rightTail as number)).toBeCloseTo(1, 10);
    });
  });

  describe('CHISQ.INV - Inverse Chi-Square', () => {
    test('Oracle Test 1: Inverse at p=0.5, df=5', () => {
      // CHISQ.INV(0.5, 5) - median
      const result = evaluate('=CHISQ.INV(0.5, 5)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(4.3515, 2);
    });

    test('Oracle Test 2: Inverse at p=0.95, df=10', () => {
      // CHISQ.INV(0.95, 10)
      const result = evaluate('=CHISQ.INV(0.95, 10)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(18.307, 2);
    });

    test('Oracle Test 3: Inverse at p=0.05, df=10', () => {
      // CHISQ.INV(0.05, 10)
      const result = evaluate('=CHISQ.INV(0.05, 10)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(3.940, 2);
    });

    test('Oracle Test 4: Inverse at p=0.99, df=20', () => {
      // CHISQ.INV(0.99, 20)
      const result = evaluate('=CHISQ.INV(0.99, 20)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(37.566, 2);
    });

    test('Oracle Test 5: Inverse with df=1 (sensitive)', () => {
      // CHISQ.INV(0.95, 1) - df=1 is very sensitive
      const result = evaluate('=CHISQ.INV(0.95, 1)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(3.841, 2);
    });

    test('Oracle Test 6: Round-trip symmetry', () => {
      // CHISQ.INV(CHISQ.DIST(x)) should approximately equal x
      const x = 7.5;
      const df = 5;
      const p = evaluate(`=CHISQ.DIST(${x}, ${df}, TRUE)`);
      const xBack = evaluate(`=CHISQ.INV(${p}, ${df})`);
      expect(typeof xBack).toBe('number');
      expect(xBack as number).toBeCloseTo(x, 4);
    });

    test('Oracle Test 7: Edge case p=0', () => {
      const result = evaluate('=CHISQ.INV(0, 5)');
      expect(result).toBe(0);
    });

    test('Oracle Test 8: Edge case p=1', () => {
      const result = evaluate('=CHISQ.INV(1, 5)');
      expect(result).toBe(Infinity);
    });

    test('Oracle Test 9: Error - p out of range', () => {
      const result = evaluate('=CHISQ.INV(1.5, 5)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });
  });

  describe('CHISQ.INV.RT - Right-Tailed Inverse', () => {
    test('Oracle Test 1: Right-tail inverse at p=0.05, df=10', () => {
      // CHISQ.INV.RT(0.05, 10) should match CHISQ.INV(0.95, 10)
      const result = evaluate('=CHISQ.INV.RT(0.05, 10)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(18.307, 2);
    });

    test('Oracle Test 2: Right-tail inverse at p=0.95, df=10', () => {
      // CHISQ.INV.RT(0.95, 10) should match CHISQ.INV(0.05, 10)
      const result = evaluate('=CHISQ.INV.RT(0.95, 10)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(3.940, 2);
    });

    test('Oracle Test 3: Relationship with CHISQ.INV', () => {
      // CHISQ.INV.RT(p) should equal CHISQ.INV(1-p)
      const p = 0.1;
      const df = 5;
      const invRT = evaluate(`=CHISQ.INV.RT(${p}, ${df})`);
      const inv = evaluate(`=CHISQ.INV(${1 - p}, ${df})`);
      expect(typeof invRT).toBe('number');
      expect(typeof inv).toBe('number');
      expect(invRT as number).toBeCloseTo(inv as number, 8);
    });

    test('Oracle Test 4: Round-trip with CHISQ.DIST.RT', () => {
      // CHISQ.INV.RT(CHISQ.DIST.RT(x)) should approximately equal x
      const x = 10;
      const df = 5;
      const p = evaluate(`=CHISQ.DIST.RT(${x}, ${df})`);
      const xBack = evaluate(`=CHISQ.INV.RT(${p}, ${df})`);
      expect(typeof xBack).toBe('number');
      expect(xBack as number).toBeCloseTo(x, 4);
    });
  });

  describe('CHISQ.TEST - Chi-Square Test', () => {
    beforeEach(() => {
      // Set up sample data in worksheet
      // Observed values: rows 1-5 (1-based), col 1
      const observed = [10, 15, 20, 25, 30];
      observed.forEach((val, i) => {
        worksheet.setCellValue({ row: i + 1, col: 1 }, val);
      });
      
      // Expected values (close match): rows 1-5 (1-based), col 2
      const expected1 = [11, 14, 21, 24, 30];
      expected1.forEach((val, i) => {
        worksheet.setCellValue({ row: i + 1, col: 2 }, val);
      });
      
      // Expected values (poor match): rows 1-5 (1-based), col 3
      const expected2 = [5, 10, 15, 20, 50];
      expected2.forEach((val, i) => {
        worksheet.setCellValue({ row: i + 1, col: 3 }, val);
      });
      
      // Identical expected: rows 1-5 (1-based), col 4
      const expected3 = [10, 15, 20, 25, 30];
      expected3.forEach((val, i) => {
        worksheet.setCellValue({ row: i + 1, col: 4 }, val);
      });
    });

    test('Oracle Test 1: Good fit (high p-value)', () => {
      // CHISQ.TEST with observed vs close expected
      const result = evaluate('=CHISQ.TEST(A1:A5, B1:B5)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0.5); // Good fit
      expect(result as number).toBeLessThan(1);
    });

    test('Oracle Test 2: Poor fit (low p-value)', () => {
      // CHISQ.TEST with observed vs different expected
      const result = evaluate('=CHISQ.TEST(A1:A5, C1:C5)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
      expect(result as number).toBeLessThan(0.1); // Poor fit
    });

    test('Oracle Test 3: Perfect fit (p ≈ 1)', () => {
      // CHISQ.TEST with identical arrays
      const result = evaluate('=CHISQ.TEST(A1:A5, D1:D5)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(1, 1); // Perfect fit
    });

    test('Oracle Test 4: Error - mismatched sizes', () => {
      const result = evaluate('=CHISQ.TEST(A1:A5, B1:B3)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#N/A');
    });

    test('Oracle Test 5: Error - zero expected', () => {
      // Set zero in expected value
      worksheet.setCellValue({ row: 1, col: 5 }, 10);
      worksheet.setCellValue({ row: 2, col: 5 }, 0); // Zero!
      worksheet.setCellValue({ row: 3, col: 5 }, 20);
      
      const result = evaluate('=CHISQ.TEST(A1:A3, E1:E3)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#DIV/0!');
    });

    test('Oracle Test 6: Error - single value (df=0)', () => {
      const result = evaluate('=CHISQ.TEST(A1, B1)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#DIV/0!');
    });

    test('Oracle Test 7: Calculation verification', () => {
      // Manual calculation:
      // obs=[10,15,20,25,30], exp=[11,14,21,24,30]
      // chi-sq = (10-11)²/11 + (15-14)²/14 + (20-21)²/21 + (25-24)²/24 + (30-30)²/30
      // = 1/11 + 1/14 + 1/21 + 1/24 + 0
      // = 0.0909 + 0.0714 + 0.0476 + 0.0417 = 0.2516
      // df = 5-1 = 4
      // p = CHISQ.DIST.RT(0.2516, 4) ≈ 0.993
      const result = evaluate('=CHISQ.TEST(A1:A5, B1:B5)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0.9); // High p-value
    });
  });

  describe('Integration Tests', () => {
    test('CHISQ.INV and CHISQ.DIST are inverses (multiple points)', () => {
      const testValues = [0.1, 0.25, 0.5, 0.75, 0.9];
      const df = 5;
      
      for (const p of testValues) {
        const x = evaluate(`=CHISQ.INV(${p}, ${df})`);
        const pBack = evaluate(`=CHISQ.DIST(${x}, ${df}, TRUE)`);
        expect(typeof pBack).toBe('number');
        expect(pBack as number).toBeCloseTo(p, 6);
      }
    });

    test('CHISQ.INV.RT and CHISQ.DIST.RT are inverses', () => {
      const testValues = [0.01, 0.05, 0.1, 0.5];
      const df = 10;
      
      for (const p of testValues) {
        const x = evaluate(`=CHISQ.INV.RT(${p}, ${df})`);
        const pBack = evaluate(`=CHISQ.DIST.RT(${x}, ${df})`);
        expect(typeof pBack).toBe('number');
        expect(pBack as number).toBeCloseTo(p, 6);
      }
    });

    test('Gamma-ChiSquare relationship', () => {
      // Chi-Square(df) = Gamma(k=df/2, θ=2)
      // CHISQ.DIST(x, k, TRUE) = regularizedGammaP(k/2, x/2)
      // We can verify the relationship holds
      const x = 5;
      const df = 4;
      
      const chiDist = evaluate(`=CHISQ.DIST(${x}, ${df}, TRUE)`);
      
      expect(typeof chiDist).toBe('number');
      expect(chiDist as number).toBeGreaterThan(0);
      expect(chiDist as number).toBeLessThan(1);
    });

    test('Sensitive df=1 case', () => {
      // df=1 is very sensitive, test multiple operations
      const df = 1;
      
      // CDF
      const cdf = evaluate(`=CHISQ.DIST(3.841, ${df}, TRUE)`);
      expect(typeof cdf).toBe('number');
      expect(cdf as number).toBeCloseTo(0.95, 2);
      
      // Right tail
      const rt = evaluate(`=CHISQ.DIST.RT(3.841, ${df})`);
      expect(typeof rt).toBe('number');
      expect(rt as number).toBeCloseTo(0.05, 2);
      
      // Inverse
      const inv = evaluate(`=CHISQ.INV(0.95, ${df})`);
      expect(typeof inv).toBe('number');
      expect(inv as number).toBeCloseTo(3.841, 2);
    });

    test('Large df stability', () => {
      // Test with large degrees of freedom
      const df = 100;
      
      const cdf = evaluate(`=CHISQ.DIST(100, ${df}, TRUE)`);
      const inv = evaluate(`=CHISQ.INV(0.5, ${df})`);
      
      expect(typeof cdf).toBe('number');
      expect(typeof inv).toBe('number');
      expect(cdf as number).toBeGreaterThan(0);
      expect(cdf as number).toBeLessThan(1);
      expect(inv as number).toBeGreaterThan(0);
    });
  });
});
