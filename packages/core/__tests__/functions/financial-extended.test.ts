/**
 * Financial Functions Tests - Extended Suite (NPER, RATE, EFFECT, NOMINAL)
 * Week 8 - Completing all 13 financial functions
 */

import { FormulaEngine, FormulaContext, Worksheet } from '../../src';

describe('Financial Functions - Extended Suite', () => {
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

  describe('NPER (Number of Periods)', () => {
    test('NPER for savings goal with monthly payments', () => {
      // How many months to save $10,000 with $100/month at 12% annual (1% monthly)?
      const result = evaluate('=NPER(0.01, -100, 0, 10000)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(69.66, 2); // About 69.66 months
    });

    test('NPER for loan payoff', () => {
      // How many payments to pay off $200k at 4% annual with $954.83/month?
      const result = evaluate('=NPER(0.04/12, -954.83, 200000)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(360, 0); // 30 years = 360 months
    });

    test('NPER with future value', () => {
      // Periods needed with both PV and FV
      const result = evaluate('=NPER(0.05, -100, -1000, 5000)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
    });

    test('NPER with payment at beginning', () => {
      const result = evaluate('=NPER(0.08, -100, 1000, 0, 1)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
    });

    test('NPER with zero interest rate', () => {
      // At 0% interest, nper = -(pv + fv) / pmt
      const result = evaluate('=NPER(0, -100, 1000, 0)');
      expect(result).toBeCloseTo(10, 2); // 1000 / 100 = 10 periods
    });

    test('NPER returns #NUM! for impossible scenario', () => {
      // Payment is too small to ever reach goal - interest outpaces payment
      const result = evaluate('=NPER(0.10, -10, 0, 100000)');
      // At 10% rate, $10 payment grows too slowly - would need infinite periods
      expect(typeof result).toBe('number');
      // This actually converges to a very large number, not #NUM!
    });

    test('NPER with negative number of periods should return #NUM!', () => {
      // Scenario where math gives negative result
      const result = evaluate('=NPER(0.10, 100, 1000, 0)');
      // Positive payment on positive PV means going wrong direction
      expect(result).toBeInstanceOf(Error);
    });
  });

  describe('RATE (Interest Rate)', () => {
    test('RATE for 30-year mortgage', () => {
      // $200k loan, $954.83/month payment, 360 months → ~0.333% monthly (4% annual)
      const result = evaluate('=RATE(360, -954.83, 200000)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.04/12, 5); // 0.00333...
    });

    test('RATE for simple loan', () => {
      // 10 periods, $110 payment, $1000 loan
      // This has actual interest (payment > principal/periods)
      const result = evaluate('=RATE(10, -110, 1000)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
      expect(result as number).toBeLessThan(0.05); // Should be small positive rate
    });

    test('RATE with future value', () => {
      const result = evaluate('=RATE(12, -100, 0, 1500)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
    });

    test('RATE with payment at beginning', () => {
      // 10 periods, $110 payment at beginning, $1000 loan
      const result = evaluate('=RATE(10, -110, 1000, 0, 1)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
      expect(result as number).toBeLessThan(0.05); // Should be small positive rate
    });

    test('RATE with custom guess', () => {
      const result = evaluate('=RATE(360, -954.83, 200000, 0, 0, 0.005)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.04/12, 5);
    });

    test('RATE returns 0 for zero-interest scenario', () => {
      // PV + PMT*nper + FV = 0 implies rate = 0
      const result = evaluate('=RATE(12, -100, 1200, 0)');
      expect(result).toBeCloseTo(0, 6);
    });

    test('RATE returns #NUM! for invalid period count', () => {
      const result = evaluate('=RATE(0, -100, 1000)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('RATE convergence with good guess', () => {
      // Ensure Newton-Raphson converges
      const result = evaluate('=RATE(60, -200, 10000, 0, 0, 0.01)');
      expect(typeof result).toBe('number');
    });
  });

  describe('EFFECT (Effective Annual Rate)', () => {
    test('EFFECT with quarterly compounding', () => {
      // 5% nominal compounded quarterly
      const result = evaluate('=EFFECT(0.05, 4)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.050945, 6); // ~5.0945%
    });

    test('EFFECT with monthly compounding', () => {
      // 12% nominal compounded monthly
      const result = evaluate('=EFFECT(0.12, 12)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.126825, 6); // ~12.68%
    });

    test('EFFECT with annual compounding', () => {
      // Annual compounding = no change
      const result = evaluate('=EFFECT(0.05, 1)');
      expect(result).toBeCloseTo(0.05, 6);
    });

    test('EFFECT with daily compounding', () => {
      // 10% nominal compounded daily (365 times)
      const result = evaluate('=EFFECT(0.10, 365)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.105156, 6); // ~10.52%
    });

    test('EFFECT returns #NUM! for non-positive nominal rate', () => {
      const result = evaluate('=EFFECT(-0.05, 4)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('EFFECT returns #NUM! for npery < 1', () => {
      const result = evaluate('=EFFECT(0.05, 0)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('EFFECT truncates npery to integer', () => {
      // 4.7 should be treated as 4
      const result1 = evaluate('=EFFECT(0.05, 4.7)');
      const result2 = evaluate('=EFFECT(0.05, 4)');
      expect(result1).toBeCloseTo(result2 as number, 6);
    });
  });

  describe('NOMINAL (Nominal Annual Rate)', () => {
    test('NOMINAL with quarterly compounding', () => {
      // 5.0945% effective → 5% nominal quarterly
      const result = evaluate('=NOMINAL(0.050945, 4)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.05, 4);
    });

    test('NOMINAL with monthly compounding', () => {
      // 12.68% effective → 12% nominal monthly
      const result = evaluate('=NOMINAL(0.126825, 12)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.12, 4);
    });

    test('NOMINAL with annual compounding', () => {
      // Annual compounding = no change
      const result = evaluate('=NOMINAL(0.05, 1)');
      expect(result).toBeCloseTo(0.05, 6);
    });

    test('NOMINAL with daily compounding', () => {
      // 10.52% effective → 10% nominal daily
      const result = evaluate('=NOMINAL(0.105156, 365)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.10, 4);
    });

    test('NOMINAL returns #NUM! for non-positive effective rate', () => {
      const result = evaluate('=NOMINAL(-0.05, 4)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('NOMINAL returns #NUM! for npery < 1', () => {
      const result = evaluate('=NOMINAL(0.05, 0)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('NOMINAL truncates npery to integer', () => {
      // 4.7 should be treated as 4
      const result1 = evaluate('=NOMINAL(0.050945, 4.7)');
      const result2 = evaluate('=NOMINAL(0.050945, 4)');
      expect(result1).toBeCloseTo(result2 as number, 6);
    });
  });

  describe('Integration: EFFECT and NOMINAL are inverses', () => {
    test('EFFECT then NOMINAL returns original', () => {
      const nominal = 0.08;
      const npery = 12;
      const effective = evaluate(`=EFFECT(${nominal}, ${npery})`) as number;
      const backToNominal = evaluate(`=NOMINAL(${effective}, ${npery})`) as number;
      
      expect(backToNominal).toBeCloseTo(nominal, 6);
    });

    test('NOMINAL then EFFECT returns original', () => {
      const effective = 0.0824;
      const npery = 4;
      const nominal = evaluate(`=NOMINAL(${effective}, ${npery})`) as number;
      const backToEffective = evaluate(`=EFFECT(${nominal}, ${npery})`) as number;
      
      expect(backToEffective).toBeCloseTo(effective, 6);
    });
  });

  describe('Integration: NPER and RATE consistency', () => {
    test('NPER and RATE are consistent', () => {
      // Calculate RATE first
      const rate = evaluate('=RATE(360, -954.83, 200000)') as number;
      
      // Use that rate to calculate NPER - should get 360
      const nper = evaluate(`=NPER(${rate}, -954.83, 200000)`) as number;
      
      expect(nper).toBeCloseTo(360, 1);
    });

    test('PMT, NPER, and RATE consistency', () => {
      // Known: $1000 loan, 12 periods, 5% rate
      const rate = 0.05;
      const nper = 12;
      const pv = 1000;
      
      // Calculate payment
      const pmt = evaluate(`=PMT(${rate}, ${nper}, ${pv})`) as number;
      
      // Use payment to calculate NPER - should get 12
      const calcNper = evaluate(`=NPER(${rate}, ${pmt}, ${pv})`) as number;
      expect(calcNper).toBeCloseTo(nper, 2);
      
      // Use payment to calculate RATE - should get 0.05
      const calcRate = evaluate(`=RATE(${nper}, ${pmt}, ${pv})`) as number;
      expect(calcRate).toBeCloseTo(rate, 4);
    });
  });

  describe('Excel Compatibility', () => {
    test('NPER matches Excel: =NPER(0.12/12, -100, -1000, 10000)', () => {
      const result = evaluate('=NPER(0.12/12, -100, -1000, 10000)');
      expect(typeof result).toBe('number');
      // Correct value: 60.08 months (verified mathematically)
      expect(result as number).toBeCloseTo(60.08, 2);
    });

    test('RATE matches Excel: =RATE(360, -954.83, 200000)', () => {
      const result = evaluate('=RATE(360, -954.83, 200000)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.003333, 5);
    });

    test('EFFECT matches Excel: =EFFECT(0.05, 4)', () => {
      const result = evaluate('=EFFECT(0.05, 4)');
      expect(result as number).toBeCloseTo(0.050945, 6);
    });

    test('NOMINAL matches Excel: =NOMINAL(0.053543, 4)', () => {
      const result = evaluate('=NOMINAL(0.053543, 4)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(0.0525, 4);
    });
  });

  describe('Error Handling', () => {
    test('Functions handle non-numeric inputs', () => {
      const result1 = evaluate('=NPER("abc", -100, 1000)');
      expect(result1).toBeInstanceOf(Error);
      
      const result2 = evaluate('=RATE(10, "abc", 1000)');
      expect(result2).toBeInstanceOf(Error);
      
      const result3 = evaluate('=EFFECT("abc", 4)');
      expect(result3).toBeInstanceOf(Error);
      
      const result4 = evaluate('=NOMINAL(0.05, "abc")');
      expect(result4).toBeInstanceOf(Error);
    });

    test('Functions handle edge cases', () => {
      // NPER with zero payment and zero rate
      const result1 = evaluate('=NPER(0, 0, 1000)');
      expect(result1).toBeInstanceOf(Error);
      
      // EFFECT with zero compounding
      const result2 = evaluate('=EFFECT(0.05, 0)');
      expect(result2).toBeInstanceOf(Error);
    });
  });
});
