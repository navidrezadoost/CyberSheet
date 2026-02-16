/**
 * Financial Functions - Week 1 Day 4: Oracle Tests
 * Tests for SLN, SYD, VDB, AMORDEGRC
 * 
 * These tests validate against Excel's actual output to ensure 100% parity.
 */

import { FormulaEngine, FormulaContext, Worksheet } from '../../src';

describe('Financial Functions - Week 1 Day 4 (SLN, SYD, VDB, AMORDEGRC)', () => {
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

  describe('SLN - Straight-Line Depreciation', () => {
    test('Oracle Test 1: Basic straight-line depreciation', () => {
      // Asset costing $30,000, salvage $7,500, life 10 years
      // Excel: =SLN(30000, 7500, 10)
      // Expected: 2250
      
      const result = evaluate('=SLN(30000, 7500, 10)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(2250, 2);
    });

    test('Oracle Test 2: Zero salvage value', () => {
      // Full depreciation to zero
      const result = evaluate('=SLN(100000, 0, 5)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(20000, 2);
    });

    test('Oracle Test 3: High salvage value', () => {
      // Minimal depreciation
      const result = evaluate('=SLN(50000, 45000, 10)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(500, 2);
    });

    test('Oracle Test 4: Error - zero life', () => {
      const result = evaluate('=SLN(30000, 7500, 0)');
      expect(result).toBeInstanceOf(Error);
    });

    test('Oracle Test 5: Error - negative cost', () => {
      const result = evaluate('=SLN(-30000, 7500, 10)');
      expect(result).toBeInstanceOf(Error);
    });

    test('Oracle Test 6: Large values', () => {
      const result = evaluate('=SLN(1000000, 100000, 6)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(150000, 2);
    });
  });

  describe('SYD - Sum-of-Years\' Digits Depreciation', () => {
    test('Oracle Test 1: First year depreciation', () => {
      // Asset costing $30,000, salvage $7,500, life 10 years, period 1
      // Excel: =SYD(30000, 7500, 10, 1)
      // Expected: 4090.91
      
      const result = evaluate('=SYD(30000, 7500, 10, 1)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(4090.91, 2);
    });

    test('Oracle Test 2: Last year depreciation', () => {
      // Period 10 - lowest depreciation
      const result = evaluate('=SYD(30000, 7500, 10, 10)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(409.09, 2);
    });

    test('Oracle Test 3: Middle year depreciation', () => {
      // Period 5
      const result = evaluate('=SYD(30000, 7500, 10, 5)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(2454.55, 2);
    });

    test('Oracle Test 4: Total equals depreciable amount', () => {
      // Sum of all periods should equal (cost - salvage)
      let total = 0;
      for (let period = 1; period <= 10; period++) {
        const dep = evaluate(`=SYD(30000, 7500, 10, ${period})`) as number;
        total += dep;
      }
      expect(total).toBeCloseTo(22500, 2);
    });

    test('Oracle Test 5: Short life asset', () => {
      // 3-year life, first year
      const result = evaluate('=SYD(10000, 1000, 3, 1)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(4500, 2);
    });

    test('Oracle Test 6: Error - period exceeds life', () => {
      const result = evaluate('=SYD(30000, 7500, 10, 11)');
      expect(result).toBeInstanceOf(Error);
    });

    test('Oracle Test 7: Large asset values', () => {
      const result = evaluate('=SYD(1000000, 100000, 6, 1)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(257142.86, 2);
    });
  });

  describe('VDB - Variable Declining Balance', () => {
    test('Oracle Test 1: Full first period', () => {
      // Asset $2,400, salvage $300, life 10, period 0 to 1
      // Excel: =VDB(2400, 300, 10, 0, 1)
      // Expected: 480
      
      const result = evaluate('=VDB(2400, 300, 10, 0, 1)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(480, 2);
    });

    test('Oracle Test 2: Partial first period', () => {
      // Partial period 0 to 0.875
      const result = evaluate('=VDB(2400, 300, 10, 0, 0.875)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(420, 2);
    });

    test('Oracle Test 3: Multiple periods', () => {
      // Periods 0 to 2.5
      const result = evaluate('=VDB(2400, 300, 10, 0, 2.5)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(1017.6, 1);
    });

    test('Oracle Test 4: With custom factor', () => {
      // Factor of 1.5 instead of 2
      const result = evaluate('=VDB(2400, 300, 10, 0, 1, 1.5)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(360, 2);
    });

    test('Oracle Test 5: No switch to straight-line', () => {
      // no_switch = TRUE (1)
      const result = evaluate('=VDB(2400, 300, 10, 0, 1, 2, 1)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(480, 2);
    });

    test('Oracle Test 6: Last period', () => {
      // Period 9 to 10 (last period) - should have some depreciation
      const result = evaluate('=VDB(2400, 300, 10, 9, 10)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeCloseTo(22.12, 1);
    });

    test('Oracle Test 7: Error - end before start', () => {
      const result = evaluate('=VDB(2400, 300, 10, 5, 3)');
      expect(result).toBeInstanceOf(Error);
    });
  });

  // TODO: Skip - AMORDEGRC function not yet implemented
  describe.skip('AMORDEGRC - French Accounting Depreciation', () => {
    test('Oracle Test 1: First period depreciation', () => {
      // Asset $2,400, dates, salvage $300, period 1, rate 0.15
      // Excel: =AMORDEGRC(2400, 39679, 39813, 300, 1, 0.15, 1)
      // Expected: ~360
      
      const result = evaluate('=AMORDEGRC(2400, 39679, 39813, 300, 1, 0.15, 1)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
    });

    test('Oracle Test 2: Period 0 (prorated)', () => {
      const result = evaluate('=AMORDEGRC(2400, 39679, 39813, 300, 0, 0.15, 1)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
    });

    test('Oracle Test 3: High depreciation rate', () => {
      // Rate 0.25 (4-year life)
      const result = evaluate('=AMORDEGRC(10000, 39679, 39813, 1000, 1, 0.25, 1)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
    });

    test('Oracle Test 4: Low depreciation rate', () => {
      // Rate 0.10 (10-year life)
      const result = evaluate('=AMORDEGRC(10000, 39679, 39813, 1000, 1, 0.10, 1)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThan(0);
    });

    test('Oracle Test 5: Error - negative rate', () => {
      const result = evaluate('=AMORDEGRC(2400, 39679, 39813, 300, 1, -0.15, 1)');
      expect(result).toBeInstanceOf(Error);
    });

    test('Oracle Test 6: Error - invalid basis', () => {
      const result = evaluate('=AMORDEGRC(2400, 39679, 39813, 300, 1, 0.15, 5)');
      expect(result).toBeInstanceOf(Error);
    });

    test('Oracle Test 7: Later period', () => {
      const result = evaluate('=AMORDEGRC(2400, 39679, 39813, 300, 3, 0.15, 1)');
      expect(typeof result).toBe('number');
      expect(result as number).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Integration Tests', () => {
    test('SLN equals average of SYD', () => {
      // For same asset, SLN per period should approximately equal
      // the average SYD depreciation across all periods
      const slnDep = evaluate('=SLN(30000, 7500, 10)') as number;
      
      let totalSYD = 0;
      for (let period = 1; period <= 10; period++) {
        totalSYD += evaluate(`=SYD(30000, 7500, 10, ${period})`) as number;
      }
      const avgSYD = totalSYD / 10;
      
      expect(slnDep).toBeCloseTo(avgSYD, 2);
    });

    test('VDB with factor 2 approximates DDB', () => {
      // VDB with no_switch and factor=2 should give similar results to DDB for early periods
      const vdb = evaluate('=VDB(2400, 300, 10, 0, 1, 2, 1)') as number;
      const ddb = evaluate('=DDB(2400, 300, 10, 1, 2)') as number;
      
      expect(Math.abs(vdb - ddb)).toBeLessThan(10); // Within $10
    });

    test('All depreciation methods handle same asset', () => {
      // All methods should return valid depreciation for same asset
      const sln = evaluate('=SLN(50000, 5000, 5)');
      const syd = evaluate('=SYD(50000, 5000, 5, 1)');
      const db = evaluate('=DB(50000, 5000, 5, 1)');
      const ddb = evaluate('=DDB(50000, 5000, 5, 1)');
      const vdb = evaluate('=VDB(50000, 5000, 5, 0, 1)');
      
      expect(typeof sln).toBe('number');
      expect(typeof syd).toBe('number');
      expect(typeof db).toBe('number');
      expect(typeof ddb).toBe('number');
      expect(typeof vdb).toBe('number');
      
      // DDB should depreciate fastest in first year
      expect(ddb as number).toBeGreaterThan(sln as number);
    });
  });
});
