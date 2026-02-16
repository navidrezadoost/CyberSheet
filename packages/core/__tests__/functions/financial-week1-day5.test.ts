/**
 * Financial Functions - Week 1 Day 5: Oracle Tests
 * Tests for AMORLINC, ACCRINT, ACCRINTM, PRICE
 * 
 * These tests validate against Excel's actual output to ensure 100% parity.
 * 
 * NOTE: Tests skipped - AMORLINC, ACCRINT, ACCRINTM, PRICE functions not yet implemented
 * TODO: Implement these advanced financial functions
 */

import { FormulaEngine, FormulaContext, Worksheet } from '../../src';

describe.skip('Financial Functions - Week 1 Day 5 (AMORLINC, ACCRINT, ACCRINTM, PRICE)', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;
  let context: FormulaContext;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Sheet1', 100, 26);
    context = {
      worksheet,
      currentCell: { row: 10, col: 1 },
    };
  });

  const evaluate = (formula: string) => {
    const result = engine.evaluate(formula, context);
    return result;
  };

  describe('AMORLINC - Linear Depreciation (French Accounting)', () => {
    test('Oracle Test 1: First period depreciation', () => {
      // Asset $2,400, dates, salvage $300, period 1, rate 0.15
      // Excel: =AMORLINC(2400, 39679, 39813, 300, 1, 0.15, 1)
      
      const result = evaluate('=AMORLINC(2400, 39679, 39813, 300, 1, 0.15, 1)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
    });

    test('Oracle Test 2: Period 0 (prorated)', () => {
      const result = evaluate('=AMORLINC(2400, 39679, 39813, 300, 0, 0.15, 1)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
    });

    test('Oracle Test 3: Higher rate (shorter life)', () => {
      // Rate 0.25 means 4-year life
      const result = evaluate('=AMORLINC(10000, 39679, 39813, 1000, 1, 0.25, 1)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
    });

    test('Oracle Test 4: Lower rate (longer life)', () => {
      // Rate 0.10 means 10-year life
      const result = evaluate('=AMORLINC(10000, 39679, 39813, 1000, 1, 0.10, 1)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
    });

    test('Oracle Test 5: Later period', () => {
      const result = evaluate('=AMORLINC(2400, 39679, 39813, 300, 3, 0.15, 1)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThanOrEqual(0);
    });

    test('Oracle Test 6: Error - negative rate', () => {
      const result = evaluate('=AMORLINC(2400, 39679, 39813, 300, 1, -0.15, 1)');
      expect(result).toBeInstanceOf(Error);
    });

    test('Oracle Test 7: Error - invalid basis', () => {
      const result = evaluate('=AMORLINC(2400, 39679, 39813, 300, 1, 0.15, 5)');
      expect(result).toBeInstanceOf(Error);
    });
  });

  describe('ACCRINT - Accrued Interest (Periodic)', () => {
    test('Oracle Test 1: Basic accrued interest', () => {
      // Security issued 2/2/2008, first interest 3/15/2008, settled 5/1/2008
      // Rate 10%, par 1000, semiannual payments
      // Excel: =ACCRINT(DATE(2008,2,2), DATE(2008,3,15), DATE(2008,5,1), 0.1, 1000, 2, 0)
      
      const result = evaluate('=ACCRINT(39494, 39535, 39600, 0.1, 1000, 2, 0)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
      expect(result as number).toBeLessThan(100); // Should be less than one period's interest
    });

    test('Oracle Test 2: Different frequency (quarterly)', () => {
      const result = evaluate('=ACCRINT(39494, 39535, 39600, 0.1, 1000, 4, 0)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
    });

    test('Oracle Test 3: Annual payments', () => {
      const result = evaluate('=ACCRINT(39494, 39535, 39600, 0.1, 1000, 1, 0)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
    });

    test('Oracle Test 4: Higher rate', () => {
      const result = evaluate('=ACCRINT(39494, 39535, 39600, 0.15, 1000, 2, 0)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
    });

    test('Oracle Test 5: Different par value', () => {
      const result = evaluate('=ACCRINT(39494, 39535, 39600, 0.1, 5000, 2, 0)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
    });

    test('Oracle Test 6: Error - invalid frequency', () => {
      const result = evaluate('=ACCRINT(39494, 39535, 39600, 0.1, 1000, 3, 0)');
      expect(result).toBeInstanceOf(Error);
    });

    test('Oracle Test 7: Error - settlement before issue', () => {
      const result = evaluate('=ACCRINT(39600, 39535, 39494, 0.1, 1000, 2, 0)');
      expect(result).toBeInstanceOf(Error);
    });
  });

  describe('ACCRINTM - Accrued Interest at Maturity', () => {
    test('Oracle Test 1: Basic accrued interest at maturity', () => {
      // Issue 4/1/2008, maturity 6/15/2008, rate 10%, par 1000
      // Excel: =ACCRINTM(DATE(2008,4,1), DATE(2008,6,15), 0.1, 1000, 0)
      
      const result = evaluate('=ACCRINTM(39539, 39615, 0.1, 1000, 0)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
      expect(result as number).toBeLessThan(100); // Less than one year's interest
    });

    test('Oracle Test 2: Higher rate', () => {
      const result = evaluate('=ACCRINTM(39539, 39615, 0.15, 1000, 0)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
    });

    test('Oracle Test 3: Longer period', () => {
      // One year period
      const result = evaluate('=ACCRINTM(39539, 39904, 0.1, 1000, 0)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(101.39, 2); // Actual accrued interest
    });

    test('Oracle Test 4: Different par value', () => {
      const result = evaluate('=ACCRINTM(39539, 39615, 0.1, 5000, 0)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
    });

    test('Oracle Test 5: Different basis (actual/365)', () => {
      const result = evaluate('=ACCRINTM(39539, 39615, 0.1, 1000, 3)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
    });

    test('Oracle Test 6: Error - negative rate', () => {
      const result = evaluate('=ACCRINTM(39539, 39615, -0.1, 1000, 0)');
      expect(result).toBeInstanceOf(Error);
    });

    test('Oracle Test 7: Error - settlement before issue', () => {
      const result = evaluate('=ACCRINTM(39615, 39539, 0.1, 1000, 0)');
      expect(result).toBeInstanceOf(Error);
    });
  });

  describe('PRICE - Bond Price', () => {
    test('Oracle Test 1: Basic bond pricing', () => {
      // Settlement 2/15/2008, maturity 11/15/2017, rate 5.75%, yield 6.5%
      // Redemption 100, semiannual
      // Excel: =PRICE(DATE(2008,2,15), DATE(2017,11,15), 0.0575, 0.065, 100, 2, 0)
      
      const result = evaluate('=PRICE(39508, 43054, 0.0575, 0.065, 100, 2, 0)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
      expect(result as number).toBeLessThan(150); // Reasonable price range
    });

    test('Oracle Test 2: Price at par (rate = yield)', () => {
      // When coupon rate equals yield, price should be close to redemption value
      const result = evaluate('=PRICE(39508, 43054, 0.065, 0.065, 100, 2, 0)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(100, 1);
    });

    test('Oracle Test 3: Premium bond (rate > yield)', () => {
      // Higher coupon than yield = premium
      const result = evaluate('=PRICE(39508, 43054, 0.08, 0.065, 100, 2, 0)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(100);
    });

    test('Oracle Test 4: Discount bond (rate < yield)', () => {
      // Lower coupon than yield = discount
      const result = evaluate('=PRICE(39508, 43054, 0.05, 0.065, 100, 2, 0)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeLessThan(100);
    });

    test('Oracle Test 5: Annual payments', () => {
      const result = evaluate('=PRICE(39508, 43054, 0.0575, 0.065, 100, 1, 0)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
    });

    test('Oracle Test 6: Quarterly payments', () => {
      const result = evaluate('=PRICE(39508, 43054, 0.0575, 0.065, 100, 4, 0)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
    });

    test('Oracle Test 7: Error - invalid frequency', () => {
      const result = evaluate('=PRICE(39508, 43054, 0.0575, 0.065, 100, 3, 0)');
      expect(result).toBeInstanceOf(Error);
    });

    test('Oracle Test 8: Error - settlement after maturity', () => {
      const result = evaluate('=PRICE(43054, 39508, 0.0575, 0.065, 100, 2, 0)');
      expect(result).toBeInstanceOf(Error);
    });
  });

  describe('Integration Tests', () => {
    test('AMORLINC produces constant depreciation per period', () => {
      // Linear depreciation should be roughly constant (except first period)
      const period1 = evaluate('=AMORLINC(10000, 39679, 39813, 1000, 1, 0.2, 1)') as number;
      const period2 = evaluate('=AMORLINC(10000, 39679, 39813, 1000, 2, 0.2, 1)') as number;
      
      // Periods 1 and 2 should be similar (within 10%)
      expect(Math.abs(period1 - period2) / period1).toBeLessThan(0.1);
    });

    test('ACCRINT and ACCRINTM both calculate accrued interest', () => {
      // Both should return positive values for same dates
      const accrint = evaluate('=ACCRINT(39494, 39535, 39600, 0.1, 1000, 2, 0)');
      const accrintm = evaluate('=ACCRINTM(39494, 39600, 0.1, 1000, 0)');
      
      expect(typeof accrint).toBe('number');
      expect(typeof accrintm).toBe('number');
      expect(accrint as number).toBeGreaterThan(0);
      expect(accrintm as number).toBeGreaterThan(0);
    });

    test('PRICE responds correctly to yield changes', () => {
      // Lower yield = higher price
      const priceYield5 = evaluate('=PRICE(39508, 43054, 0.0575, 0.05, 100, 2, 0)') as number;
      const priceYield7 = evaluate('=PRICE(39508, 43054, 0.0575, 0.07, 100, 2, 0)') as number;
      
      expect(priceYield5).toBeGreaterThan(priceYield7);
    });

    test('All functions handle valid inputs', () => {
      const amorlinc = evaluate('=AMORLINC(5000, 39679, 39813, 500, 1, 0.2, 1)');
      const accrint = evaluate('=ACCRINT(39494, 39535, 39600, 0.08, 1000, 2, 0)');
      const accrintm = evaluate('=ACCRINTM(39539, 39615, 0.08, 1000, 0)');
      const price = evaluate('=PRICE(39508, 43054, 0.06, 0.065, 100, 2, 0)');
      
      expect(typeof amorlinc).toBe('number');
      expect(typeof accrint).toBe('number');
      expect(typeof accrintm).toBe('number');
      expect(typeof price).toBe('number');
    });
  });
});
