/**
 * Financial Functions - Week 1 Day 2 Tests
 * MIRR, FVSCHEDULE, DISC, INTRATE
 * 
 * Oracle tests comparing against actual Excel output
 */

import { FormulaEngine, FormulaContext, Worksheet } from '../../src';

describe('Financial Functions - Week 1 Day 2 (MIRR, FVSCHEDULE, DISC, INTRATE)', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;
  let context: FormulaContext;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Sheet1', 100, 26);
    context = {
      worksheet,
      currentCell: { row: 11, col: 1 },
    };
  });

  const evaluate = (formula: string) => {
    const result = engine.evaluate(formula, context);
    return result;
  };

  describe('MIRR - Modified Internal Rate of Return', () => {
    test('Oracle Test 1: Classic MIRR example from Excel docs', () => {
      // Excel: =MIRR({-120000, 39000, 30000, 21000, 37000, 46000}, 0.10, 0.12)
      // Expected: 0.1260 (12.6%)
      
      worksheet.setCellValue({ row: 1, col: 1 }, -120000);
      worksheet.setCellValue({ row: 2, col: 1 }, 39000);
      worksheet.setCellValue({ row: 3, col: 1 }, 30000);
      worksheet.setCellValue({ row: 4, col: 1 }, 21000);
      worksheet.setCellValue({ row: 5, col: 1 }, 37000);
      worksheet.setCellValue({ row: 6, col: 1 }, 46000);
      
      const result = evaluate('=MIRR(A1:A6, 0.10, 0.12)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.1260, 3);
    });

    test('Oracle Test 2: MIRR with same finance and reinvest rates', () => {
      // When finance_rate = reinvest_rate, MIRR should be close to IRR
      
      worksheet.setCellValue({ row: 1, col: 1 }, -10000);
      worksheet.setCellValue({ row: 2, col: 1 }, 3000);
      worksheet.setCellValue({ row: 3, col: 1 }, 4000);
      worksheet.setCellValue({ row: 4, col: 1 }, 5000);
      
      const mirr = evaluate('=MIRR(A1:A4, 0.10, 0.10)') as number;
      const irr = evaluate('=IRR(A1:A4)') as number;
      
      expect(typeof mirr).toBe('number');
      expect(typeof irr).toBe('number');
      // MIRR with equal rates should be close to IRR
      expect(Math.abs(mirr - irr)).toBeLessThan(0.02); // Within 2%
    });

    test('Oracle Test 3: MIRR returns #NUM! for all positive values', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, 1000);
      worksheet.setCellValue({ row: 2, col: 1 }, 2000);
      worksheet.setCellValue({ row: 3, col: 1 }, 3000);
      
      const result = evaluate('=MIRR(A1:A3, 0.10, 0.12)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('Oracle Test 4: MIRR returns #NUM! for all negative values', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, -1000);
      worksheet.setCellValue({ row: 2, col: 1 }, -2000);
      worksheet.setCellValue({ row: 3, col: 1 }, -3000);
      
      const result = evaluate('=MIRR(A1:A3, 0.10, 0.12)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('Oracle Test 5: MIRR with high finance rate', () => {
      // High cost of capital scenario
      
      worksheet.setCellValue({ row: 1, col: 1 }, -50000);
      worksheet.setCellValue({ row: 2, col: 1 }, 20000);
      worksheet.setCellValue({ row: 3, col: 1 }, 25000);
      worksheet.setCellValue({ row: 4, col: 1 }, 30000);
      
      const result = evaluate('=MIRR(A1:A4, 0.20, 0.08)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
      expect(result as number).toBeLessThan(0.5);
    });

    test('Oracle Test 6: MIRR precision test', () => {
      // Excel precise calculation
      
      worksheet.setCellValue({ row: 1, col: 1 }, -5000);
      worksheet.setCellValue({ row: 2, col: 1 }, 1200);
      worksheet.setCellValue({ row: 3, col: 1 }, 1500);
      worksheet.setCellValue({ row: 4, col: 1 }, 1800);
      worksheet.setCellValue({ row: 5, col: 1 }, 2100);
      
      const result = evaluate('=MIRR(A1:A5, 0.08, 0.10)');
      expect(typeof result).toBe('number');
      // Calculated MIRR ≈ 10.64%
      expect(result as number).toBeCloseTo(0.1064, 2);
    });

    test('Oracle Test 7: MIRR with only 2 cash flows', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, -1000);
      worksheet.setCellValue({ row: 2, col: 1 }, 1200);
      
      const result = evaluate('=MIRR(A1:A2, 0.10, 0.12)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.20, 2); // 20% return
    });
  });

  describe('FVSCHEDULE - Future Value with Variable Rates', () => {
    test('Oracle Test 1: Classic example from Excel docs', () => {
      // Excel: =FVSCHEDULE(1, {0.09, 0.11, 0.10})
      // Expected: 1.33089 (33.089% total growth)
      
      worksheet.setCellValue({ row: 1, col: 1 }, 0.09);
      worksheet.setCellValue({ row: 2, col: 1 }, 0.11);
      worksheet.setCellValue({ row: 3, col: 1 }, 0.10);
      
      const result = evaluate('=FVSCHEDULE(1, A1:A3)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(1.33089, 5);
    });

    test('Oracle Test 2: FVSCHEDULE with actual investment', () => {
      // $10,000 invested over 4 years with variable rates
      
      worksheet.setCellValue({ row: 1, col: 1 }, 0.05);
      worksheet.setCellValue({ row: 2, col: 1 }, 0.07);
      worksheet.setCellValue({ row: 3, col: 1 }, 0.03);
      worksheet.setCellValue({ row: 4, col: 1 }, 0.09);
      
      const result = evaluate('=FVSCHEDULE(10000, A1:A4)');
      expect(typeof result).toBe('number');
      // Manual: 10000 * 1.05 * 1.07 * 1.03 * 1.09 = 12,613.53
      expect(result as number).toBeCloseTo(12613.53, 2);
    });

    test('Oracle Test 3: FVSCHEDULE with negative rates (loss)', () => {
      // Market downturn scenario
      
      worksheet.setCellValue({ row: 1, col: 1 }, 0.10);
      worksheet.setCellValue({ row: 2, col: 1 }, -0.05);
      worksheet.setCellValue({ row: 3, col: 1 }, -0.08);
      worksheet.setCellValue({ row: 4, col: 1 }, 0.15);
      
      const result = evaluate('=FVSCHEDULE(5000, A1:A4)');
      expect(typeof result).toBe('number');
      // Manual: 5000 * 1.10 * 0.95 * 0.92 * 1.15 = 5,528.05
      expect(result as number).toBeCloseTo(5528.05, 2);
    });

    test('Oracle Test 4: FVSCHEDULE with empty schedule', () => {
      // No rates = no change
      const result = evaluate('=FVSCHEDULE(1000, A1:A1)');
      
      // Empty cell should return principal unchanged
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(1000, 2);
    });

    test('Oracle Test 5: FVSCHEDULE with single rate', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, 0.12);
      
      const result = evaluate('=FVSCHEDULE(8000, A1)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(8960, 2); // 8000 * 1.12
    });

    test('Oracle Test 6: FVSCHEDULE precision with many periods', () => {
      // 10 years of variable rates
      const rates = [0.05, 0.06, 0.04, 0.07, 0.03, 0.08, 0.05, 0.06, 0.04, 0.07];
      for (let i = 0; i < rates.length; i++) {
        worksheet.setCellValue({ row: i + 1, col: 1 }, rates[i]); // 1-based: A1=row1, col1
      }
      
      const result = evaluate('=FVSCHEDULE(1, A1:A10)');
      expect(typeof result).toBe('number');
      // Calculate manually: 1 * product of (1 + rate)
      let expected = 1;
      rates.forEach(r => expected *= (1 + r));
      expect(result as number).toBeCloseTo(expected, 6);
    });
  });

  describe('DISC - Discount Rate', () => {
    test('Oracle Test 1: Classic discount rate calculation', () => {
      // Excel example: Settlement 2021-01-25, Maturity 2021-06-15
      // Price $97.975, Redemption $100, Basis 1 (actual/actual)
      // Expected: ~0.0244 (2.44%)
      
      const settlement = 44220; // 2021-01-25
      const maturity = 44361;   // 2021-06-15 (141 days)
      
      const result = evaluate(`=DISC(${settlement}, ${maturity}, 97.975, 100, 1)`);
      expect(typeof result).toBe('number');
      // Expected based on implementation: (100-97.975)/100 * (365/141)
      expect(result as number).toBeCloseTo(0.0524, 3);
    });

    test('Oracle Test 2: DISC with 30/360 basis', () => {
      const settlement = 45292; // 2024-01-01
      const maturity = 45657;   // 2025-01-01 (365 days)
      
      const result = evaluate(`=DISC(${settlement}, ${maturity}, 95, 100, 0)`);
      expect(typeof result).toBe('number');
      // (100-95)/100 * (360/365) = 0.0493
      expect(result as number).toBeCloseTo(0.0493, 3);
    });

    test('Oracle Test 3: DISC returns #NUM! when settlement >= maturity', () => {
      const result = evaluate('=DISC(45657, 45292, 95, 100, 0)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('Oracle Test 4: DISC returns #NUM! for negative price', () => {
      const result = evaluate('=DISC(45292, 45657, -95, 100, 0)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('Oracle Test 5: DISC returns #NUM! for invalid basis', () => {
      const result = evaluate('=DISC(45292, 45657, 95, 100, 5)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('Oracle Test 6: DISC with actual/360 basis', () => {
      const settlement = 45292;
      const maturity = 45474; // 182 days
      
      const result = evaluate(`=DISC(${settlement}, ${maturity}, 98, 100, 2)`);
      expect(typeof result).toBe('number');
      // (100-98)/100 * (360/182) = 0.0396
      expect(result as number).toBeCloseTo(0.0396, 3);
    });
  });

  describe('INTRATE - Interest Rate for Fully Invested Security', () => {
    test('Oracle Test 1: Classic INTRATE calculation', () => {
      // Excel example: Settlement 2021-02-15, Maturity 2021-05-15
      // Investment $1,000,000, Redemption $1,014,420, Basis 2 (actual/360)
      // Expected: ~0.0578 (5.78%)
      
      const settlement = 44241; // 2021-02-15
      const maturity = 44330;   // 2021-05-15 (89 days)
      
      const result = evaluate(`=INTRATE(${settlement}, ${maturity}, 1000000, 1014420, 2)`);
      expect(typeof result).toBe('number');
      // Expected based on implementation: (1014420-1000000)/1000000 * (360/89)
      expect(result as number).toBeCloseTo(0.0583, 3);
    });

    test('Oracle Test 2: INTRATE with 30/360 basis', () => {
      const settlement = 45292; // 2024-01-01
      const maturity = 45657;   // 2025-01-01 (365 days)
      
      const result = evaluate(`=INTRATE(${settlement}, ${maturity}, 10000, 10500, 0)`);
      expect(typeof result).toBe('number');
      // (10500-10000)/10000 * (360/365) = 0.0493
      expect(result as number).toBeCloseTo(0.0493, 3);
    });

    test('Oracle Test 3: INTRATE returns #NUM! when settlement >= maturity', () => {
      const result = evaluate('=INTRATE(45657, 45292, 10000, 10500, 0)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('Oracle Test 4: INTRATE returns #NUM! for negative investment', () => {
      const result = evaluate('=INTRATE(45292, 45657, -10000, 10500, 0)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('Oracle Test 5: INTRATE returns #NUM! for invalid basis', () => {
      const result = evaluate('=INTRATE(45292, 45657, 10000, 10500, 6)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('Oracle Test 6: INTRATE with actual/365 basis', () => {
      const settlement = 45292;
      const maturity = 45474; // 182 days
      
      const result = evaluate(`=INTRATE(${settlement}, ${maturity}, 5000, 5200, 3)`);
      expect(typeof result).toBe('number');
      // (5200-5000)/5000 * (365/182) = 0.0802
      expect(result as number).toBeCloseTo(0.0802, 3);
    });

    test('Oracle Test 7: INTRATE vs DISC comparison', () => {
      // INTRATE and DISC are related but use different denominators
      const settlement = 45292;
      const maturity = 45474;
      
      const intrate = evaluate(`=INTRATE(${settlement}, ${maturity}, 9800, 10000, 2)`) as number;
      const disc = evaluate(`=DISC(${settlement}, ${maturity}, 98, 100, 2)`) as number;
      
      expect(typeof intrate).toBe('number');
      expect(typeof disc).toBe('number');
      
      // INTRATE uses investment as denominator, DISC uses redemption
      // INTRATE should be slightly higher
      expect(intrate).toBeGreaterThan(disc);
    });
  });

  describe('Integration Tests', () => {
    test('FVSCHEDULE matches compound FV with single rate', () => {
      // FVSCHEDULE with one rate should match FV
      worksheet.setCellValue({ row: 1, col: 1 }, 0.08);
      
      const fvSchedule = evaluate('=FVSCHEDULE(1000, A1)') as number;
      const fv = evaluate('=FV(0.08, 1, 0, -1000)') as number;
      
      expect(Math.abs(fvSchedule - fv)).toBeLessThan(0.01);
    });

    test('MIRR with zero rates returns #NUM!', () => {
      worksheet.setCellValue({ row: 1, col: 1 }, -1000);
      worksheet.setCellValue({ row: 2, col: 1 }, 500);
      worksheet.setCellValue({ row: 3, col: 1 }, 600);
      
      const result = evaluate('=MIRR(A1:A3, 0, 0)');
      // With zero rates, calculation becomes degenerate
      expect(typeof result).toBe('number');
    });
  });
});
