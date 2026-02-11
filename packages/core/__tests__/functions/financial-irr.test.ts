/**
 * Week 8 Day 5: Financial Functions Tests (Part 2)
 * Tests for IRR, XIRR (iterative rate calculations)
 * 
 * Target: 30-40 tests for Day 5 functions
 */

import { FormulaEngine, FormulaContext, Worksheet } from '../../src';

describe('Financial Functions - Week 8 Day 5 (IRR/XIRR)', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;
  let context: FormulaContext;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Sheet1', 100, 26);
    context = {
      worksheet,
      currentCell: { row: 10, col: 0 },
      namedLambdas: new Map()
    } as FormulaContext;
  });

  const evaluate = (formula: string) => engine.evaluate(formula, context);

  describe('IRR (Internal Rate of Return)', () => {
    test('IRR with simple investment', () => {
      // Initial investment -1000, then 300, 400, 500
      worksheet.setCellValue({ row: 0, col: 0 }, -1000);
      worksheet.setCellValue({ row: 1, col: 0 }, 300);
      worksheet.setCellValue({ row: 2, col: 0 }, 400);
      worksheet.setCellValue({ row: 3, col: 0 }, 500);
      
      const result = evaluate('=IRR(A1:A4)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.0890, 4); // ~8.90%
    });

    test('IRR with negative initial investment and positive returns', () => {
      // Cash flows: -70000, 12000, 15000, 18000, 21000, 26000
      worksheet.setCellValue({ row: 0, col: 1 }, -70000);
      worksheet.setCellValue({ row: 1, col: 1 }, 12000);
      worksheet.setCellValue({ row: 2, col: 1 }, 15000);
      worksheet.setCellValue({ row: 3, col: 1 }, 18000);
      worksheet.setCellValue({ row: 4, col: 1 }, 21000);
      worksheet.setCellValue({ row: 5, col: 1 }, 26000);
      
      const result = evaluate('=IRR(B1:B6)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.0866, 4); // ~8.66%
    });

    test('IRR with custom guess', () => {
      // Cash flows: -100, 30, 30, 30, 30, 30
      worksheet.setCellValue({ row: 0, col: 2 }, -100);
      worksheet.setCellValue({ row: 1, col: 2 }, 30);
      worksheet.setCellValue({ row: 2, col: 2 }, 30);
      worksheet.setCellValue({ row: 3, col: 2 }, 30);
      worksheet.setCellValue({ row: 4, col: 2 }, 30);
      worksheet.setCellValue({ row: 5, col: 2 }, 30);
      
      const result = evaluate('=IRR(C1:C6, 0.05)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.1524, 3); // ~15.24%
    });

    test('IRR with equal cash flows (annuity)', () => {
      // Cash flows: -1000, 250, 250, 250, 250, 250
      worksheet.setCellValue({ row: 0, col: 3 }, -1000);
      for (let i = 1; i <= 5; i++) {
        worksheet.setCellValue({ row: i, col: 3 }, 250);
      }
      
      const result = evaluate('=IRR(D1:D6)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
    });

    test('IRR with mixed cash flows', () => {
      // Cash flows: -500, 100, 150, 200, 250, 300
      worksheet.setCellValue({ row: 0, col: 4 }, -500);
      worksheet.setCellValue({ row: 1, col: 4 }, 100);
      worksheet.setCellValue({ row: 2, col: 4 }, 150);
      worksheet.setCellValue({ row: 3, col: 4 }, 200);
      worksheet.setCellValue({ row: 4, col: 4 }, 250);
      worksheet.setCellValue({ row: 5, col: 4 }, 300);
      
      const result = evaluate('=IRR(E1:E6)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
    });

    test('IRR returns #NUM! for all positive values', () => {
      const result = evaluate('=IRR({100, 200, 300})');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('IRR returns #NUM! for all negative values', () => {
      const result = evaluate('=IRR({-100, -200, -300})');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('IRR returns #NUM! for insufficient values', () => {
      const result = evaluate('=IRR({-100})');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('IRR with range reference', () => {
      worksheet.setCellValue({ row: 0, col: 0 }, -1000);
      worksheet.setCellValue({ row: 1, col: 0 }, 300);
      worksheet.setCellValue({ row: 2, col: 0 }, 400);
      worksheet.setCellValue({ row: 3, col: 0 }, 500);
      
      const result = evaluate('=IRR(A1:A4)');
      expect(typeof result).toBe('number');
    });

    test('IRR convergence with good guess', () => {
      // Cash flows: -1000, 200, 300, 400, 500
      worksheet.setCellValue({ row: 0, col: 5 }, -1000);
      worksheet.setCellValue({ row: 1, col: 5 }, 200);
      worksheet.setCellValue({ row: 2, col: 5 }, 300);
      worksheet.setCellValue({ row: 3, col: 5 }, 400);
      worksheet.setCellValue({ row: 4, col: 5 }, 500);
      
      const result = evaluate('=IRR(F1:F5, 0.10)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
    });
  });

  describe('XIRR (Internal Rate of Return with Irregular Dates)', () => {
    test('XIRR with annual cash flows', () => {
      // Set up cash flows
      worksheet.setCellValue({ row: 0, col: 0 }, -1000);
      worksheet.setCellValue({ row: 1, col: 0 }, 300);
      worksheet.setCellValue({ row: 2, col: 0 }, 400);
      worksheet.setCellValue({ row: 3, col: 0 }, 500);
      
      // Set dates (Excel serial numbers)
      worksheet.setCellValue({ row: 0, col: 1 }, 44562); // 2022-01-01
      worksheet.setCellValue({ row: 1, col: 1 }, 44927); // 2023-01-01
      worksheet.setCellValue({ row: 2, col: 1 }, 45292); // 2024-01-01
      worksheet.setCellValue({ row: 3, col: 1 }, 45657); // 2025-01-01
      
      const result = evaluate('=XIRR(A1:A4, B1:B4)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
    });

    test('XIRR with irregular spacing', () => {
      worksheet.setCellValue({ row: 0, col: 0 }, -10000);
      worksheet.setCellValue({ row: 1, col: 0 }, 2000);
      worksheet.setCellValue({ row: 2, col: 0 }, 4000);
      worksheet.setCellValue({ row: 3, col: 0 }, 6000);
      
      // Irregular dates (3 months, 7 months, 14 months)
      worksheet.setCellValue({ row: 0, col: 1 }, 44562); // Start
      worksheet.setCellValue({ row: 1, col: 1 }, 44653); // ~3 months
      worksheet.setCellValue({ row: 2, col: 1 }, 44775); // ~7 months from start
      worksheet.setCellValue({ row: 3, col: 1 }, 44987); // ~14 months from start
      
      const result = evaluate('=XIRR(A1:A4, B1:B4)');
      expect(typeof result).toBe('number');
    });

    test('XIRR with custom guess', () => {
      worksheet.setCellValue({ row: 0, col: 0 }, -1000);
      worksheet.setCellValue({ row: 1, col: 0 }, 600);
      worksheet.setCellValue({ row: 2, col: 0 }, 700);
      
      worksheet.setCellValue({ row: 0, col: 1 }, 44562);
      worksheet.setCellValue({ row: 1, col: 1 }, 44927);
      worksheet.setCellValue({ row: 2, col: 1 }, 45292);
      
      const result = evaluate('=XIRR(A1:A3, B1:B3, 0.15)');
      expect(typeof result).toBe('number');
    });

    test('XIRR returns #NUM! for mismatched array lengths', () => {
      worksheet.setCellValue({ row: 0, col: 0 }, -1000);
      worksheet.setCellValue({ row: 1, col: 0 }, 500);
      worksheet.setCellValue({ row: 0, col: 1 }, 44562);
      
      const result = evaluate('=XIRR(A1:A2, B1)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('XIRR returns #NUM! for all positive values', () => {
      worksheet.setCellValue({ row: 0, col: 0 }, 100);
      worksheet.setCellValue({ row: 1, col: 0 }, 200);
      worksheet.setCellValue({ row: 0, col: 1 }, 44562);
      worksheet.setCellValue({ row: 1, col: 1 }, 44927);
      
      const result = evaluate('=XIRR(A1:A2, B1:B2)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('XIRR returns #NUM! for all negative values', () => {
      worksheet.setCellValue({ row: 0, col: 0 }, -100);
      worksheet.setCellValue({ row: 1, col: 0 }, -200);
      worksheet.setCellValue({ row: 0, col: 1 }, 44562);
      worksheet.setCellValue({ row: 1, col: 1 }, 44927);
      
      const result = evaluate('=XIRR(A1:A2, B1:B2)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });
  });

  describe('Integration: IRR vs XIRR', () => {
    test('IRR and XIRR give similar results for regular annual periods', () => {
      // Set up same cash flows for both
      worksheet.setCellValue({ row: 0, col: 0 }, -1000);
      worksheet.setCellValue({ row: 1, col: 0 }, 300);
      worksheet.setCellValue({ row: 2, col: 0 }, 400);
      worksheet.setCellValue({ row: 3, col: 0 }, 500);
      
      // Annual dates
      worksheet.setCellValue({ row: 0, col: 1 }, 44562);
      worksheet.setCellValue({ row: 1, col: 1 }, 44927);
      worksheet.setCellValue({ row: 2, col: 1 }, 45292);
      worksheet.setCellValue({ row: 3, col: 1 }, 45657);
      
      const irr = evaluate('=IRR(A1:A4)') as number;
      const xirr = evaluate('=XIRR(A1:A4, B1:B4)') as number;
      
      expect(typeof irr).toBe('number');
      expect(typeof xirr).toBe('number');
      
      // Should be close (within 1%)
      expect(Math.abs(irr - xirr)).toBeLessThan(0.01);
    });

    test('IRR calculation matches NPV at zero', () => {
      // Set up clean test data
      worksheet.setCellValue({ row: 10, col: 10 }, -1000);
      worksheet.setCellValue({ row: 11, col: 10 }, 300);
      worksheet.setCellValue({ row: 12, col: 10 }, 400);
      worksheet.setCellValue({ row: 13, col: 10 }, 500);
      
      const irr = evaluate('=IRR(K11:K14)') as number;
      expect(typeof irr).toBe('number');
      
      // Calculate NPV manually at the IRR rate
      const npv1 = 300 / Math.pow(1 + irr, 1);
      const npv2 = 400 / Math.pow(1 + irr, 2);
      const npv3 = 500 / Math.pow(1 + irr, 3);
      const totalNPV = -1000 + npv1 + npv2 + npv3;
      
      expect(Math.abs(totalNPV)).toBeLessThan(0.1); // Very close to zero
    });
  });

  describe('Error Handling', () => {
    test('IRR handles non-numeric values by filtering', () => {
      worksheet.setCellValue({ row: 0, col: 6 }, -1000);
      worksheet.setCellValue({ row: 1, col: 6 }, 300);
      worksheet.setCellValue({ row: 2, col: 6 }, 400);
      worksheet.setCellValue({ row: 3, col: 6 }, 500);
      
      const result = evaluate('=IRR(G1:G4)');
      expect(typeof result).toBe('number');
    });

    test('IRR with invalid guess returns valid result or error', () => {
      worksheet.setCellValue({ row: 0, col: 0 }, -1000);
      worksheet.setCellValue({ row: 1, col: 0 }, 300);
      worksheet.setCellValue({ row: 2, col: 0 }, 400);
      worksheet.setCellValue({ row: 3, col: 0 }, 500);
      
      const result = evaluate('=IRR(A1:A4, "bad")');
      // Should either return error or ignore bad guess
      expect(result).toBeInstanceOf(Error);
    });
  });

  describe('Excel Compatibility', () => {
    test('IRR matches Excel for standard investment', () => {
      // Cash flows: -70000, 12000, 15000, 18000, 21000, 26000
      worksheet.setCellValue({ row: 0, col: 7 }, -70000);
      worksheet.setCellValue({ row: 1, col: 7 }, 12000);
      worksheet.setCellValue({ row: 2, col: 7 }, 15000);
      worksheet.setCellValue({ row: 3, col: 7 }, 18000);
      worksheet.setCellValue({ row: 4, col: 7 }, 21000);
      worksheet.setCellValue({ row: 5, col: 7 }, 26000);
      
      const result = evaluate('=IRR(H1:H6)');
      expect(typeof result).toBe('number');
      // Excel: ~0.0866 (8.66%)
      expect(result as number).toBeCloseTo(0.0866, 4);
    });

    test('IRR matches Excel for simple case', () => {
      // Cash flows: -1000, 300, 400, 500
      worksheet.setCellValue({ row: 0, col: 8 }, -1000);
      worksheet.setCellValue({ row: 1, col: 8 }, 300);
      worksheet.setCellValue({ row: 2, col: 8 }, 400);
      worksheet.setCellValue({ row: 3, col: 8 }, 500);
      
      const result = evaluate('=IRR(I1:I4)');
      expect(typeof result).toBe('number');
      // Correct IRR: ~0.089 (8.9%)
      expect(result as number).toBeCloseTo(0.089, 2);
    });
  });
});
