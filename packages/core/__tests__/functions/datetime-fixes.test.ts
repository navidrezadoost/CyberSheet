/**
 * Week 7, Days 3-4 - Date/Time Fix Verification Tests
 * 
 * Tests for two critical fixes:
 * 1. Date serial number off-by-one error (UTC vs local time)
 * 2. TIME function wrap behavior for hours >= 24
 */

import { FormulaEngine, FormulaContext, Worksheet } from '../../src';

describe('Date & Time Fixes - Week 7 Days 3-4', () => {
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

  // ============================================================================
  // Fix 1: Date Serial Number Off-By-One (UTC Fix)
  // ============================================================================
  describe('Date Serial Number Fix (UTC-based)', () => {
    test('January 1, 1900 is serial 1', () => {
      const result = evaluate('=DATE(1900, 1, 1)');
      expect(result).toBe(1);
    });

    test('January 2, 1900 is serial 2', () => {
      const result = evaluate('=DATE(1900, 1, 2)');
      expect(result).toBe(2);
    });

    test('round-trip: DATE to serial to YEAR/MONTH/DAY', () => {
      const serial = evaluate('=DATE(2026, 1, 29)');
      const year = evaluate(`=YEAR(${serial})`);
      const month = evaluate(`=MONTH(${serial})`);
      const day = evaluate(`=DAY(${serial})`);

      expect(year).toBe(2026);
      expect(month).toBe(1);
      expect(day).toBe(29);
    });

    test('round-trip: multiple dates', () => {
      const dates = [
        [2026, 1, 15],
        [2024, 2, 29], // Leap year
        [2025, 12, 31],
        [2000, 6, 15],
        [1950, 3, 10],
      ];

      dates.forEach(([y, m, d]) => {
        const serial = evaluate(`=DATE(${y}, ${m}, ${d})`);
        const year = evaluate(`=YEAR(${serial})`);
        const month = evaluate(`=MONTH(${serial})`);
        const day = evaluate(`=DAY(${serial})`);

        expect(year).toBe(y);
        expect(month).toBe(m);
        expect(day).toBe(d);
      });
    });

    test('TODAY returns correct day', () => {
      // This test assumes January 29, 2026
      const day = evaluate('=DAY(TODAY())');
      expect(day).toBe(29);
    });

    test('sequential dates are exactly 1 apart', () => {
      const jan15 = evaluate('=DATE(2026, 1, 15)');
      const jan16 = evaluate('=DATE(2026, 1, 16)');
      const jan17 = evaluate('=DATE(2026, 1, 17)');

      expect(jan16).toBe((jan15 as number) + 1);
      expect(jan17).toBe((jan16 as number) + 1);
    });

    test('Excel 1900 leap year bug compensation', () => {
      // Excel incorrectly treats 1900 as a leap year
      // Serial 60 = Feb 29, 1900 (doesn't exist)
      // Serial 61 = Mar 1, 1900
      
      // Feb 28, 1900 should be serial 59
      const feb28 = evaluate('=DATE(1900, 2, 28)');
      expect(feb28).toBe(59);

      // Mar 1, 1900 should be serial 61 (skip 60)
      const mar1 = evaluate('=DATE(1900, 3, 1)');
      expect(mar1).toBe(61);
    });

    test('dates after Feb 28, 1900 account for leap year bug', () => {
      // All dates after Feb 28, 1900 are +1 from what they would be
      const mar2_1900 = evaluate('=DATE(1900, 3, 2)');
      const jan1_1901 = evaluate('=DATE(1901, 1, 1)');

      expect(mar2_1900).toBe(62);
      expect(jan1_1901).toBe(367); // 366 days in "1900" + 1
    });

    test('month boundaries work correctly', () => {
      // Test transitioning across month boundaries
      const jan31 = evaluate('=DATE(2026, 1, 31)');
      const feb1 = evaluate('=DATE(2026, 2, 1)');
      
      expect(feb1).toBe((jan31 as number) + 1);

      const year2026 = evaluate(`=YEAR(${jan31})`);
      const month2026 = evaluate(`=MONTH(${jan31})`);
      const day2026 = evaluate(`=DAY(${jan31})`);

      expect(year2026).toBe(2026);
      expect(month2026).toBe(1);
      expect(day2026).toBe(31);
    });
  });

  // ============================================================================
  // Fix 2: TIME Wrap Behavior (Hours >= 24)
  // ============================================================================
  describe('TIME Wrap Fix (Hours >= 24)', () => {
    test('TIME(25, 0, 0) wraps to 1 AM', () => {
      const time25 = evaluate('=TIME(25, 0, 0)');
      const time1 = evaluate('=TIME(1, 0, 0)');
      expect(time25).toBeCloseTo(time1 as number, 10);
    });

    test('TIME(24, 0, 0) wraps to midnight', () => {
      const time24 = evaluate('=TIME(24, 0, 0)');
      const time0 = evaluate('=TIME(0, 0, 0)');
      expect(time24).toBeCloseTo(time0 as number, 10);
    });

    test('TIME(48, 0, 0) wraps to midnight (2 full days)', () => {
      const time48 = evaluate('=TIME(48, 0, 0)');
      const time0 = evaluate('=TIME(0, 0, 0)');
      expect(time48).toBeCloseTo(time0 as number, 10);
    });

    test('TIME(30, 30, 30) wraps correctly', () => {
      // 30 hours 30 minutes 30 seconds = 6:30:30 AM
      const time30 = evaluate('=TIME(30, 30, 30)');
      const time6 = evaluate('=TIME(6, 30, 30)');
      expect(time30).toBeCloseTo(time6 as number, 10);
    });

    test('TIME(100, 0, 0) wraps to 4 AM', () => {
      // 100 hours mod 24 = 4 hours
      const time100 = evaluate('=TIME(100, 0, 0)');
      const time4 = evaluate('=TIME(4, 0, 0)');
      expect(time100).toBeCloseTo(time4 as number, 10);
    });

    test('TIME result is always < 1 (within single day)', () => {
      const testHours = [0, 1, 12, 23, 24, 25, 48, 100];
      
      testHours.forEach(h => {
        const result = evaluate(`=TIME(${h}, 0, 0)`);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThan(1);
      });
    });

    test('TIME with minute and second overflow wraps correctly', () => {
      // TIME(24, 90, 90) = 1:31:30
      // 24 hours + 90 minutes + 90 seconds = 24:00:00 + 1:30:00 + 0:01:30 = 25:31:30
      // Wrapped: 1:31:30
      const result = evaluate('=TIME(24, 90, 90)');
      const expected = evaluate('=TIME(1, 31, 30)');
      expect(result).toBeCloseTo(expected as number, 10);
    });

    test('negative TIME wraps correctly', () => {
      // TIME(-1, 0, 0) should wrap to 23:00:00
      const timeNeg1 = evaluate('=TIME(-1, 0, 0)');
      const time23 = evaluate('=TIME(23, 0, 0)');
      expect(timeNeg1).toBeCloseTo(time23 as number, 10);
    });

    test('TIME(-24, 0, 0) wraps to midnight', () => {
      const timeNeg24 = evaluate('=TIME(-24, 0, 0)');
      const time0 = evaluate('=TIME(0, 0, 0)');
      expect(timeNeg24).toBeCloseTo(time0 as number, 10);
    });

    test('HOUR extraction from wrapped TIME', () => {
      const time25 = evaluate('=TIME(25, 15, 30)');
      const hour = evaluate(`=HOUR(${time25})`);
      const minute = evaluate(`=MINUTE(${time25})`);
      const second = evaluate(`=SECOND(${time25})`);

      expect(hour).toBe(1);
      expect(minute).toBe(15);
      expect(second).toBe(30);
    });

    test('TIME wrap with combined DATE', () => {
      // DATE(2026, 1, 15) + TIME(25, 0, 0) should give Jan 15, 1 AM
      const combined = evaluate('=DATE(2026, 1, 15) + TIME(25, 0, 0)');
      
      const year = evaluate(`=YEAR(${combined})`);
      const month = evaluate(`=MONTH(${combined})`);
      const day = evaluate(`=DAY(${combined})`);
      const hour = evaluate(`=HOUR(${combined})`);

      expect(year).toBe(2026);
      expect(month).toBe(1);
      expect(day).toBe(15);
      expect(hour).toBe(1);
    });
  });

  // ============================================================================
  // Integration Tests: Both Fixes Together
  // ============================================================================
  describe('Integration: Date Serial + TIME Wrap', () => {
    test('full datetime round-trip with wrapped time', () => {
      // Create datetime with wrapped time
      const datetime = evaluate('=DATE(2026, 6, 15) + TIME(26, 30, 45)');
      
      // Extract components
      const year = evaluate(`=YEAR(${datetime})`);
      const month = evaluate(`=MONTH(${datetime})`);
      const day = evaluate(`=DAY(${datetime})`);
      const hour = evaluate(`=HOUR(${datetime})`);
      const minute = evaluate(`=MINUTE(${datetime})`);
      const second = evaluate(`=SECOND(${datetime})`);

      // Verify all components
      expect(year).toBe(2026);
      expect(month).toBe(6);
      expect(day).toBe(15);
      expect(hour).toBe(2); // 26 hours wrapped to 2 AM
      expect(minute).toBe(30);
      expect(second).toBe(45);
    });

    test('sequential datetimes with wrapped times', () => {
      const dt1 = evaluate('=DATE(2026, 1, 1) + TIME(23, 0, 0)');
      const dt2 = evaluate('=DATE(2026, 1, 1) + TIME(24, 0, 0)');
      const dt3 = evaluate('=DATE(2026, 1, 1) + TIME(25, 0, 0)');

      // TIME(24,0,0) wraps to 0 (midnight), so dt2 = DATE only
      // TIME(25,0,0) wraps to 1 AM, so dt3 = DATE + 1/24
      const dateOnly = evaluate('=DATE(2026, 1, 1)');
      
      expect(dt2).toBeCloseTo(dateOnly as number, 10);
      expect(dt3).toBeGreaterThan(dateOnly as number);
      expect(dt3).toBeLessThan((dateOnly as number) + 0.1); // Less than 2.4 hours
    });

    test('date arithmetic with wrapped times preserves accuracy', () => {
      // Add 1 day + wrapped time
      const base = evaluate('=DATE(2026, 3, 15)');
      const withTime = evaluate('=DATE(2026, 3, 15) + TIME(25, 0, 0)');
      
      const dayDiff = (withTime as number) - (base as number);
      // TIME(25,0,0) = TIME(1,0,0) = 1/24 day
      expect(dayDiff).toBeCloseTo(1/24, 10);
    });

    test('TODAY + wrapped TIME gives correct datetime', () => {
      // Assuming today is Jan 29, 2026
      const result = evaluate('=TODAY() + TIME(30, 0, 0)');
      
      const day = evaluate(`=DAY(${result})`);
      const hour = evaluate(`=HOUR(${result})`);

      expect(day).toBe(29); // Same day (wrapped time doesn't add days)
      expect(hour).toBe(6); // 30 hours mod 24 = 6 AM
    });

    test('NOW extraction works with both fixes', () => {
      // NOW should return correct date components
      const now = evaluate('=NOW()');
      
      const year = evaluate(`=YEAR(${now})`);
      const month = evaluate(`=MONTH(${now})`);
      const day = evaluate(`=DAY(${now})`);

      expect(year).toBe(2026);
      expect(month).toBe(1);
      expect(day).toBe(29);
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================
  describe('Edge Cases', () => {
    test('very large hour values wrap correctly', () => {
      // 1000 hours mod 24 = 16 hours
      const time1000 = evaluate('=TIME(1000, 0, 0)');
      const time16 = evaluate('=TIME(16, 0, 0)');
      expect(time1000).toBeCloseTo(time16 as number, 10);
    });

    test('very negative hour values wrap correctly', () => {
      // -25 hours mod 24 = 23 hours
      const timeNeg25 = evaluate('=TIME(-25, 0, 0)');
      const time23 = evaluate('=TIME(23, 0, 0)');
      expect(timeNeg25).toBeCloseTo(time23 as number, 10);
    });

    test('fractional hours with wrap', () => {
      // 25.5 hours = 1.5 hours = 1:30:00
      const result = evaluate('=TIME(25.5, 0, 0)');
      const expected = evaluate('=TIME(1, 30, 0)');
      expect(result).toBeCloseTo(expected as number, 10);
    });

    test('date at year boundaries', () => {
      const dec31 = evaluate('=DATE(2025, 12, 31)');
      const jan1 = evaluate('=DATE(2026, 1, 1)');

      expect(jan1).toBe((dec31 as number) + 1);

      const year1 = evaluate(`=YEAR(${dec31})`);
      const year2 = evaluate(`=YEAR(${jan1})`);

      expect(year1).toBe(2025);
      expect(year2).toBe(2026);
    });

    test('leap year Feb 29 round-trip', () => {
      const feb29 = evaluate('=DATE(2024, 2, 29)');
      const year = evaluate(`=YEAR(${feb29})`);
      const month = evaluate(`=MONTH(${feb29})`);
      const day = evaluate(`=DAY(${feb29})`);

      expect(year).toBe(2024);
      expect(month).toBe(2);
      expect(day).toBe(29);
    });
  });
});
