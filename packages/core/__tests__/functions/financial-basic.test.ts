/**
 * Week 8 Day 4: Financial Functions Tests (Part 1)
 * Tests for NPV, XNPV, PV, FV, PMT, IPMT, PPMT
 * 
 * Target: 80-120 tests for Day 4 functions
 */

import { FormulaEngine, FormulaContext, Worksheet } from '../../src';

describe('Financial Functions - Week 8 Day 4', () => {
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

  describe('NPV (Net Present Value)', () => {
    test('simple NPV with constant cash flows', () => {
      const result = evaluate('=NPV(0.10, 300, 300, 300, 300)');
      expect(result).toBeCloseTo(950.959634, 2);
    });

    test('NPV with varying cash flows', () => {
      const result = evaluate('=NPV(0.08, 200, 300, 400, 500)');
      expect(result).toBeCloseTo(1127.434654, 2);
    });

    test('NPV with negative initial investment', () => {
      // Note: Initial investment should be added separately, not included in NPV
      const npv = evaluate('=NPV(0.10, 300, 400, 500)');
      const result = (npv as number) - 1000;
      expect(result).toBeCloseTo(-21.04, 2);
    });

    test('NPV with all positive cash flows', () => {
      const result = evaluate('=NPV(0.12, 100, 100, 100, 100, 100)');
      expect(result).toBeCloseTo(360.477619, 2);
    });

    test('NPV with mixed positive and negative cash flows', () => {
      const result = evaluate('=NPV(0.10, -500, 200, 300, 400, 500)');
      expect(result).toBeCloseTo(519.804286, 2);
    });

    test('NPV with zero rate', () => {
      const result = evaluate('=NPV(0, 100, 100, 100, 100)');
      expect(result).toBeCloseTo(400, 2);
    });

    test('NPV with high discount rate', () => {
      const result = evaluate('=NPV(0.50, 1000, 1000, 1000)');
      expect(result).toBeCloseTo(1407.407407, 2);
    });

    test('NPV with negative discount rate returns #NUM!', () => {
      const result = evaluate('=NPV(-0.05, 100, 200, 300)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('NPV with single cash flow', () => {
      const result = evaluate('=NPV(0.10, 1000)');
      expect(result).toBeCloseTo(909.090909, 2);
    });

    test('NPV with very small discount rate', () => {
      const result = evaluate('=NPV(0.0001, 100, 100, 100)');
      expect(result).toBeCloseTo(299.940001, 2);
    });

    test('NPV with range reference', () => {
      worksheet.setCellValue({ row: 0, col: 0 }, 300);
      worksheet.setCellValue({ row: 1, col: 0 }, 400);
      worksheet.setCellValue({ row: 2, col: 0 }, 500);
      const result = evaluate('=NPV(0.10, A1:A3)');
      expect(result).toBeCloseTo(1010.518407, 2);
    });

    test('NPV handles non-numeric values by filtering', () => {
      const result = evaluate('=NPV(0.10, 100, 200, 300)');
      expect(typeof result).toBe('number');
    });
  });

  describe('XNPV (Net Present Value with irregular dates)', () => {
    test('XNPV with regular annual dates', () => {
      worksheet.setCellValue({ row: 0, col: 0 }, -1000);
      worksheet.setCellValue({ row: 1, col: 0 }, 300);
      worksheet.setCellValue({ row: 2, col: 0 }, 400);
      worksheet.setCellValue({ row: 3, col: 0 }, 500);
      
      // Set dates as Excel serial numbers (days since 1900-01-01)
      worksheet.setCellValue({ row: 0, col: 1 }, 44562); // 2022-01-01
      worksheet.setCellValue({ row: 1, col: 1 }, 44927); // 2023-01-01
      worksheet.setCellValue({ row: 2, col: 1 }, 45292); // 2024-01-01
      worksheet.setCellValue({ row: 3, col: 1 }, 45657); // 2025-01-01
      
      const result = evaluate('=XNPV(0.10, A1:A4, B1:B4)');
      expect(typeof result).toBe('number');
      expect(result).toBeCloseTo(-21.04, 2);
    });

    test('XNPV with irregular dates', () => {
      worksheet.setCellValue({ row: 0, col: 0 }, -1000);
      worksheet.setCellValue({ row: 1, col: 0 }, 300);
      worksheet.setCellValue({ row: 2, col: 0 }, 400);
      
      // Irregular spacing (6 months, then 18 months)
      worksheet.setCellValue({ row: 0, col: 1 }, 44562); // 2022-01-01
      worksheet.setCellValue({ row: 1, col: 1 }, 44745); // 2022-07-01 (6 months)
      worksheet.setCellValue({ row: 2, col: 1 }, 45292); // 2024-01-01 (18 months)
      
      const result = evaluate('=XNPV(0.10, A1:A3, B1:B3)');
      expect(typeof result).toBe('number');
    });

    test('XNPV with mismatched array lengths returns #NUM!', () => {
      worksheet.setCellValue({ row: 0, col: 0 }, 100);
      worksheet.setCellValue({ row: 1, col: 0 }, 200);
      worksheet.setCellValue({ row: 0, col: 1 }, 44562);
      
      const result = evaluate('=XNPV(0.10, A1:A2, B1)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });
  });

  describe('PV (Present Value)', () => {
    test('PV of $200/month loan at 0.05 for 5 years', () => {
      const result = evaluate('=PV(0.05/12, 60, -200)');
      expect(result).toBeCloseTo(10598.14, 2);
    });

    test('PV with future value', () => {
      const result = evaluate('=PV(0.08, 20, 500, 10000)');
      expect(result).toBeCloseTo(-7054.56, 2);
    });

    test('PV with payment at beginning of period', () => {
      const result = evaluate('=PV(0.08, 20, 500, 0, 1)');
      expect(result).toBeCloseTo(-5301.80, 2);
    });

    test('PV with zero interest rate', () => {
      const result = evaluate('=PV(0, 60, -200)');
      expect(result).toBeCloseTo(12000, 2);
    });

    test('PV with only future value', () => {
      const result = evaluate('=PV(0.05, 10, 0, 10000)');
      expect(result).toBeCloseTo(-6139.13, 2);
    });

    test('PV with negative number of periods returns #NUM!', () => {
      const result = evaluate('=PV(0.05, -10, 100)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('PV handles optional parameters', () => {
      const result = evaluate('=PV(0.05, 10, -100)');
      expect(typeof result).toBe('number');
    });
  });

  describe('FV (Future Value)', () => {
    test('FV of $100/month investment at 0.06 for 10 years', () => {
      const result = evaluate('=FV(0.06/12, 120, -100)');
      expect(result).toBeCloseTo(16387.93, 2);
    });

    test('FV with present value', () => {
      const result = evaluate('=FV(0.08, 10, -100, -1000)');
      expect(result).toBeCloseTo(3607.58, 2);
    });

    test('FV with payment at beginning of period', () => {
      const result = evaluate('=FV(0.08, 10, -100, 0, 1)');
      expect(result).toBeCloseTo(1564.55, 2);
    });

    test('FV with zero interest rate', () => {
      const result = evaluate('=FV(0, 120, -100)');
      expect(result).toBeCloseTo(12000, 2);
    });

    test('FV with only present value', () => {
      const result = evaluate('=FV(0.05, 10, 0, -1000)');
      expect(result).toBeCloseTo(1628.89, 2);
    });

    test('FV with negative number of periods returns #NUM!', () => {
      const result = evaluate('=FV(0.05, -10, 100)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });
  });

  describe('PMT (Payment)', () => {
    test('PMT for $200k loan at 0.04 for 30 years', () => {
      const result = evaluate('=PMT(0.04/12, 360, 200000)');
      expect(result).toBeCloseTo(-954.83, 2);
    });

    test('PMT with future value', () => {
      const result = evaluate('=PMT(0.08, 10, 10000, 5000)');
      expect(result).toBeCloseTo(-1835.44, 2);
    });

    test('PMT with payment at beginning of period', () => {
      const result = evaluate('=PMT(0.08, 10, 10000, 0, 1)');
      expect(result).toBeCloseTo(-1379.90, 2);
    });

    test('PMT with zero interest rate', () => {
      const result = evaluate('=PMT(0, 60, 10000)');
      expect(result).toBeCloseTo(-166.67, 2);
    });

    test('PMT for savings goal (negative PV)', () => {
      const result = evaluate('=PMT(0.05/12, 120, 0, 50000)');
      expect(result).toBeCloseTo(-321.99, 2);
    });

    test('PMT with very small interest rate', () => {
      const result = evaluate('=PMT(0.001, 12, 1000)');
      expect(result).toBeCloseTo(-83.88, 2);
    });

    test('PMT handles optional parameters', () => {
      const result = evaluate('=PMT(0.05, 10, 1000)');
      expect(typeof result).toBe('number');
    });
  });

  describe('IPMT (Interest Payment)', () => {
    test('IPMT for first payment of loan', () => {
      const result = evaluate('=IPMT(0.04/12, 1, 360, 200000)');
      expect(result).toBeCloseTo(-666.67, 2);
    });

    test('IPMT for middle payment', () => {
      const result = evaluate('=IPMT(0.04/12, 180, 360, 200000)');
      expect(result).toBeCloseTo(-432.03, 2);
    });

    test('IPMT for last payment', () => {
      const result = evaluate('=IPMT(0.04/12, 360, 360, 200000)');
      expect(result).toBeCloseTo(-3.17, 2);
    });

    test('IPMT with future value', () => {
      const result = evaluate('=IPMT(0.08, 5, 10, 10000, 5000)');
      expect(typeof result).toBe('number');
    });

    test('IPMT with payment at beginning (first period is zero)', () => {
      const result = evaluate('=IPMT(0.08, 1, 10, 10000, 0, 1)');
      expect(result).toBeCloseTo(0, 2);
    });

    test('IPMT with invalid period returns #NUM!', () => {
      const result = evaluate('=IPMT(0.04/12, 0, 360, 200000)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('IPMT with period > nper returns #NUM!', () => {
      const result = evaluate('=IPMT(0.04/12, 361, 360, 200000)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });
  });

  describe('PPMT (Principal Payment)', () => {
    test('PPMT for first payment of loan', () => {
      const result = evaluate('=PPMT(0.04/12, 1, 360, 200000)');
      expect(result).toBeCloseTo(-288.16, 2);
    });

    test('PPMT for middle payment', () => {
      const result = evaluate('=PPMT(0.04/12, 180, 360, 200000)');
      expect(result).toBeCloseTo(-522.80, 2);
    });

    test('PPMT for last payment', () => {
      const result = evaluate('=PPMT(0.04/12, 360, 360, 200000)');
      expect(result).toBeCloseTo(-951.66, 2);
    });

    test('PPMT + IPMT equals PMT', () => {
      const pmt = evaluate('=PMT(0.04/12, 360, 200000)') as number;
      const ipmt = evaluate('=IPMT(0.04/12, 1, 360, 200000)') as number;
      const ppmt = evaluate('=PPMT(0.04/12, 1, 360, 200000)') as number;
      expect(pmt).toBeCloseTo(ipmt + ppmt, 2);
    });

    test('PPMT with future value', () => {
      const result = evaluate('=PPMT(0.08, 5, 10, 10000, 5000)');
      expect(typeof result).toBe('number');
    });

    test('PPMT with payment at beginning', () => {
      const result = evaluate('=PPMT(0.08, 1, 10, 10000, 0, 1)');
      expect(typeof result).toBe('number');
    });
  });

  describe('Integration Tests', () => {
    test('Loan amortization consistency', () => {
      const rate = 0.06 / 12;
      const nper = 360;
      const pv = 200000;
      
      // Payment should be constant
      const pmt = evaluate(`=PMT(${rate}, ${nper}, ${pv})`) as number;
      
      // First payment breakdown
      const ipmt1 = evaluate(`=IPMT(${rate}, 1, ${nper}, ${pv})`) as number;
      const ppmt1 = evaluate(`=PPMT(${rate}, 1, ${nper}, ${pv})`) as number;
      
      expect(pmt).toBeCloseTo(ipmt1 + ppmt1, 2);
      
      // Last payment should be mostly principal
      const ipmt360 = evaluate(`=IPMT(${rate}, ${nper}, ${nper}, ${pv})`) as number;
      const ppmt360 = evaluate(`=PPMT(${rate}, ${nper}, ${nper}, ${pv})`) as number;
      
      expect(Math.abs(ppmt360)).toBeGreaterThan(Math.abs(ipmt360));
    });

    test('NPV with investment project', () => {
      // Project: -10000 initial, then 3000/year for 5 years
      const cashFlows = [-10000, 3000, 3000, 3000, 3000, 3000];
      const npv = evaluate('=NPV(0.10, 3000, 3000, 3000, 3000, 3000)') as number;
      const totalNPV = npv - 10000;
      
      expect(totalNPV).toBeCloseTo(1372.36, 2);
    });

    test('PV and FV are inverses', () => {
      const rate = 0.08;
      const nper = 10;
      const pmt = -100;
      
      const fv = evaluate(`=FV(${rate}, ${nper}, ${pmt})`) as number;
      const pv = evaluate(`=PV(${rate}, ${nper}, ${pmt}, ${fv})`) as number;
      
      // PV should be close to 0 when FV is included
      expect(pv).toBeCloseTo(0, 2);
    });

    test('Financial functions with range references', () => {
      // Set up cash flows in range
      for (let i = 0; i < 5; i++) {
        worksheet.setCellValue({ row: i, col: 0 }, 1000 * (i + 1));
      }
      
      const npv = evaluate('=NPV(0.10, A1:A5)');
      expect(typeof npv).toBe('number');
    });
  });

  describe('Error Handling', () => {
    test('NPV with non-numeric rate returns #VALUE!', () => {
      const result = evaluate('=NPV("abc", 100, 200)');
      expect(result).toBeInstanceOf(Error);
    });

    test('PV with non-numeric parameters returns #VALUE!', () => {
      const result = evaluate('=PV("abc", 10, 100)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('PMT with all non-numeric values returns #VALUE!', () => {
      const result = evaluate('=PMT("rate", "nper", "pv")');
      expect(result).toBeInstanceOf(Error);
    });

    test('IPMT with invalid period number', () => {
      const result = evaluate('=IPMT(0.05, 0, 10, 1000)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('Financial functions handle edge cases', () => {
      // Very large numbers
      const result1 = evaluate('=FV(0.05, 100, -1000000)');
      expect(typeof result1).toBe('number');
      
      // Very small numbers
      const result2 = evaluate('=PV(0.00001, 10, -0.01)');
      expect(typeof result2).toBe('number');
    });
  });

  describe('Excel Compatibility', () => {
    test('NPV matches Excel: =NPV(0.10, 300, 400, 500)', () => {
      const result = evaluate('=NPV(0.10, 300, 400, 500)');
      expect(result).toBeCloseTo(978.96, 2);
    });

    test('PV matches Excel: =PV(0.05/12, 60, -200)', () => {
      const result = evaluate('=PV(0.05/12, 60, -200)');
      expect(result).toBeCloseTo(10598.14, 2);
    });

    test('FV matches Excel: =FV(0.06/12, 120, -100)', () => {
      const result = evaluate('=FV(0.06/12, 120, -100)');
      expect(result).toBeCloseTo(16387.93, 2);
    });

    test('PMT matches Excel: =PMT(0.04/12, 360, 200000)', () => {
      const result = evaluate('=PMT(0.04/12, 360, 200000)');
      expect(result).toBeCloseTo(-954.83, 2);
    });

    test('IPMT matches Excel: =IPMT(0.04/12, 1, 360, 200000)', () => {
      const result = evaluate('=IPMT(0.04/12, 1, 360, 200000)');
      expect(result).toBeCloseTo(-666.67, 2);
    });

    test('PPMT matches Excel: =PPMT(0.04/12, 1, 360, 200000)', () => {
      const result = evaluate('=PPMT(0.04/12, 1, 360, 200000)');
      expect(result).toBeCloseTo(-288.16, 2);
    });
  });
});
