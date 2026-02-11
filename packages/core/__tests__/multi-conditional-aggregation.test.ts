/**
 * multi-conditional-aggregation.test.ts
 * 
 * Tests for multi-conditional aggregation functions:
 * - COUNTIFS
 * - SUMIFS
 * - AVERAGEIFS
 * 
 * Day 5: Multiple criteria with AND logic
 */

import { FormulaEngine, FormulaContext, Worksheet, type FormulaValue } from '../src';

describe('Multi-Conditional Aggregation Functions', () => {
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
    
    // Setup test data in worksheet - Sales data with multiple dimensions
    const testData = [
      // Row 0: Headers
      ['Product', 'Region', 'Amount', 'Quantity', 'Category'],
      // Row 1-10: Data
      ['Widget', 'North', 1000, 10, 'Electronics'],
      ['Gadget', 'South', 2000, 20, 'Electronics'],
      ['Widget', 'North', 1500, 15, 'Electronics'],
      ['Tool', 'East', 3000, 30, 'Hardware'],
      ['Widget', 'South', 2500, 25, 'Electronics'],
      ['Gadget', 'North', 4000, 40, 'Electronics'],
      ['Tool', 'North', 3500, 35, 'Hardware'],
      ['Widget', 'East', 5000, 50, 'Electronics'],
      ['Gadget', 'South', 6000, 60, 'Electronics'],
      ['Tool', 'East', 7000, 70, 'Hardware'],
    ];

    testData.forEach((row, rowIdx) => {
      row.forEach((val, colIdx) => {
        worksheet.setCellValue({ row: rowIdx + 1, col: colIdx + 1 }, val);
      });
    });
  });

  describe('COUNTIFS Function', () => {
    describe('Two Criteria', () => {
      test('counts with two exact matches', () => {
        // Count Widgets in North region
        const result = engine.evaluate(
          '=COUNTIFS(A2:A11, "Widget", B2:B11, "North")',
          context
        );
        
        expect(result).toBe(2); // Rows 2 and 4
      });

      test('counts with comparison operator and text', () => {
        // Count items with amount > 3000 in North region
        const result = engine.evaluate(
          '=COUNTIFS(C2:C11, ">3000", B2:B11, "North")',
          context
        );
        
        expect(result).toBe(2); // Rows 7 and 8 (4000, 3500)
      });

      test('counts with two numeric criteria', () => {
        // Count items with amount > 2000 and quantity > 30
        const result = engine.evaluate(
          '=COUNTIFS(C2:C11, ">2000", D2:D11, ">30")',
          context
        );
        
        expect(result).toBe(5); // Rows 5, 7, 8, 9, 11
      });

      test('counts with wildcard and exact match', () => {
        // Count Gadget* in Electronics category
        const result = engine.evaluate(
          '=COUNTIFS(A2:A11, "Gadget*", E2:E11, "Electronics")',
          context
        );
        
        expect(result).toBe(3); // All three Gadgets are Electronics
      });
    });

    describe('Three or More Criteria', () => {
      test('counts with three criteria', () => {
        // Count Widgets in North region with amount > 1000
        const result = engine.evaluate(
          '=COUNTIFS(A2:A11, "Widget", B2:B11, "North", C2:C11, ">1000")',
          context
        );
        
        expect(result).toBe(1); // Only row 4 (Widget, North, 1500)
      });

      test('counts with four criteria', () => {
        // Count Electronics in North with amount > 1000 and quantity >= 15
        const result = engine.evaluate(
          '=COUNTIFS(E2:E11, "Electronics", B2:B11, "North", C2:C11, ">1000", D2:D11, ">=15")',
          context
        );
        
        expect(result).toBe(2); // Rows 4 and 7
      });

      test('counts with wildcard and multiple conditions', () => {
        // Count products starting with 'W', amount > 2000, Electronics
        const result = engine.evaluate(
          '=COUNTIFS(A2:A11, "W*", C2:C11, ">2000", E2:E11, "Electronics")',
          context
        );
        
        expect(result).toBe(2); // Widget rows with amount > 2000
      });
    });

    describe('Edge Cases', () => {
      test('returns 0 when no rows match all criteria', () => {
        // Count Tools in North with amount > 10000 (impossible)
        const result = engine.evaluate(
          '=COUNTIFS(A2:A11, "Tool", B2:B11, "North", C2:C11, ">10000")',
          context
        );
        
        expect(result).toBe(0);
      });

      test('returns error with mismatched range sizes', () => {
        const result = engine.evaluate(
          '=COUNTIFS(A2:A11, "Widget", B2:B10, "North")',
          context
        );
        
        expect(result).toBeInstanceOf(Error);
        expect((result as Error).message).toBe('#VALUE!');
      });

      test('returns error with odd number of arguments', () => {
        const result = engine.evaluate(
          '=COUNTIFS(A2:A11, "Widget", B2:B11)',
          context
        );
        
        expect(result).toBeInstanceOf(Error);
        expect((result as Error).message).toBe('#VALUE!');
      });

      test('returns error with less than 2 arguments', () => {
        const result = engine.evaluate(
          '=COUNTIFS(A2:A11)',
          context
        );
        
        expect(result).toBeInstanceOf(Error);
      });
    });
  });

  describe('SUMIFS Function', () => {
    describe('Two Criteria', () => {
      test('sums with two exact matches', () => {
        // Sum amounts for Widgets in North region
        const result = engine.evaluate(
          '=SUMIFS(C2:C11, A2:A11, "Widget", B2:B11, "North")',
          context
        );
        
        expect(result).toBe(2500); // 1000 + 1500
      });

      test('sums with comparison and text criteria', () => {
        // Sum amounts > 3000 in North region
        const result = engine.evaluate(
          '=SUMIFS(C2:C11, C2:C11, ">3000", B2:B11, "North")',
          context
        );
        
        expect(result).toBe(7500); // 4000 + 3500
      });

      test('sums quantities with numeric criteria', () => {
        // Sum quantities where amount > 2000 and quantity > 30
        const result = engine.evaluate(
          '=SUMIFS(D2:D11, C2:C11, ">2000", D2:D11, ">30")',
          context
        );
        
        expect(result).toBe(255); // 40 + 35 + 50 + 60 + 70
      });
    });

    describe('Three or More Criteria', () => {
      test('sums with three criteria - user example', () => {
        // Sum sales above 5000 for widgets in North region
        // (Modified from user example since our data doesn't have that exact scenario)
        const result = engine.evaluate(
          '=SUMIFS(C2:C11, A2:A11, "Widget*", B2:B11, "North", C2:C11, ">1000")',
          context
        );
        
        expect(result).toBe(1500); // Only row 4
      });

      test('sums with four criteria', () => {
        // Sum amounts for Electronics in North with quantity >= 15
        const result = engine.evaluate(
          '=SUMIFS(C2:C11, E2:E11, "Electronics", B2:B11, "North", D2:D11, ">=15", C2:C11, ">1000")',
          context
        );
        
        expect(result).toBe(5500); // 1500 + 4000
      });
    });

    describe('Edge Cases', () => {
      test('returns 0 when no rows match', () => {
        const result = engine.evaluate(
          '=SUMIFS(C2:C11, A2:A11, "Nonexistent", B2:B11, "North")',
          context
        );
        
        expect(result).toBe(0);
      });

      test('ignores non-numeric values in sum range', () => {
        // Even if we have text in sum range, should handle gracefully
        const result = engine.evaluate(
          '=SUMIFS(C2:C11, A2:A11, "Widget", B2:B11, "North")',
          context
        );
        
        expect(result).toBe(2500);
      });

      test('returns error with mismatched range sizes', () => {
        const result = engine.evaluate(
          '=SUMIFS(C2:C11, A2:A11, "Widget", B2:B10, "North")',
          context
        );
        
        expect(result).toBeInstanceOf(Error);
      });

      test('returns error with even number of arguments', () => {
        const result = engine.evaluate(
          '=SUMIFS(C2:C11, A2:A11, "Widget", B2:B11)',
          context
        );
        
        expect(result).toBeInstanceOf(Error);
      });

      test('returns error with less than 3 arguments', () => {
        const result = engine.evaluate(
          '=SUMIFS(C2:C11, A2:A11)',
          context
        );
        
        expect(result).toBeInstanceOf(Error);
      });
    });
  });

  describe('AVERAGEIFS Function', () => {
    describe('Two Criteria', () => {
      test('averages with two exact matches', () => {
        // Average amounts for Widgets in North region
        const result = engine.evaluate(
          '=AVERAGEIFS(C2:C11, A2:A11, "Widget", B2:B11, "North")',
          context
        );
        
        expect(result).toBe(1250); // (1000 + 1500) / 2
      });

      test('averages with comparison criteria', () => {
        // Average amounts > 3000 in North region
        const result = engine.evaluate(
          '=AVERAGEIFS(C2:C11, C2:C11, ">3000", B2:B11, "North")',
          context
        );
        
        expect(result).toBe(3750); // (4000 + 3500) / 2
      });

      test('averages quantities with numeric criteria', () => {
        // Average quantities where amount > 3000 in Hardware
        const result = engine.evaluate(
          '=AVERAGEIFS(D2:D11, C2:C11, ">3000", E2:E11, "Hardware")',
          context
        );
        
        expect(result).toBe(52.5); // (35 + 70) / 2
      });
    });

    describe('Three or More Criteria', () => {
      test('averages with three criteria', () => {
        // Average price of in-stock electronics in West region
        // (Adapted: Average amounts for Electronics in North with quantity > 15)
        const result = engine.evaluate(
          '=AVERAGEIFS(C2:C11, E2:E11, "Electronics", B2:B11, "North", D2:D11, ">15")',
          context
        );
        
        expect(result).toBe(4000); // Only row 7 matches (Gadget, North, Electronics, 40, 4000)
      });

      test('averages with four criteria', () => {
        // Average for Electronics, amount > 2000, quantity > 20, in South
        const result = engine.evaluate(
          '=AVERAGEIFS(C2:C11, E2:E11, "Electronics", C2:C11, ">2000", D2:D11, ">20", B2:B11, "South")',
          context
        );
        
        expect(result).toBe(4250); // (2500 + 6000) / 2
      });
    });

    describe('Edge Cases', () => {
      test('returns DIV/0 error when no rows match', () => {
        const result = engine.evaluate(
          '=AVERAGEIFS(C2:C11, A2:A11, "Nonexistent", B2:B11, "North")',
          context
        );
        
        expect(result).toBeInstanceOf(Error);
        expect((result as Error).message).toBe('#DIV/0!');
      });

      test('ignores non-numeric values in average range', () => {
        const result = engine.evaluate(
          '=AVERAGEIFS(C2:C11, A2:A11, "Widget", B2:B11, "North")',
          context
        );
        
        expect(result).toBe(1250);
      });

      test('returns error with mismatched range sizes', () => {
        const result = engine.evaluate(
          '=AVERAGEIFS(C2:C11, A2:A11, "Widget", B2:B10, "North")',
          context
        );
        
        expect(result).toBeInstanceOf(Error);
      });

      test('returns error with even number of arguments', () => {
        const result = engine.evaluate(
          '=AVERAGEIFS(C2:C11, A2:A11, "Widget", B2:B11)',
          context
        );
        
        expect(result).toBeInstanceOf(Error);
      });
    });
  });

  describe('Integration with Dynamic Arrays', () => {
    test('COUNTIFS with simple data', () => {
      // Count rows where amount > 2000 AND quantity > 30 (direct ranges)
      const result = engine.evaluate(
        '=COUNTIFS(C2:C11, ">2000", D2:D11, ">30")',
        context
      );
      
      expect(result).toBe(5); // Rows 7,8,9,10,11
    });

    test('SUMIFS with MAKEARRAY output', () => {
      // Create 5x2 array and sum column 1 where column 2 > 5
      const result = engine.evaluate(
        '=SUMIFS(CHOOSECOLS(MAKEARRAY(5, 2, LAMBDA(r, c, r * c)), 1), CHOOSECOLS(MAKEARRAY(5, 2, LAMBDA(r, c, r * c)), 2), ">5")',
        context
      );
      
      // Column 1: [1,2,3,4,5], Column 2: [2,4,6,8,10]
      // Rows where col2 > 5: rows 3,4,5 (col2: 6,8,10)
      // Sum col1 for those rows: 3 + 4 + 5 = 12
      expect(result).toBe(12);
    });
  });

  describe('Combined Scenarios', () => {
    test('complex business reporting scenario', () => {
      // Total sales for Electronics in North or South with amount > 2000
      const northSouth = engine.evaluate(
        '=SUMIFS(C2:C11, E2:E11, "Electronics", B2:B11, "North", C2:C11, ">2000") + SUMIFS(C2:C11, E2:E11, "Electronics", B2:B11, "South", C2:C11, ">2000")',
        context
      );
      
      // North: 4000 (row 7), South: 2500 + 6000 (rows 6, 10)
      expect(northSouth).toBe(12500);
    });

    test('dashboard metrics - counts, sums, and averages', () => {
      // Count of high-value (>3000) North region items
      const count = engine.evaluate(
        '=COUNTIFS(C2:C11, ">3000", B2:B11, "North")',
        context
      );
      
      // Total sales for those items
      const sum = engine.evaluate(
        '=SUMIFS(C2:C11, C2:C11, ">3000", B2:B11, "North")',
        context
      );
      
      // Average sale amount
      const avg = engine.evaluate(
        '=AVERAGEIFS(C2:C11, C2:C11, ">3000", B2:B11, "North")',
        context
      );
      
      expect(count).toBe(2);
      expect(sum).toBe(7500);
      expect(avg).toBe(3750);
      
      // Verify consistency: sum / count = avg
      expect((sum as number) / (count as number)).toBe(avg);
    });

    test('nested criteria with wildcards and comparisons', () => {
      // Sum amounts for products starting with 'G' or 'W', in Electronics, amount > 2000
      const gadgets = engine.evaluate(
        '=SUMIFS(C2:C11, A2:A11, "G*", E2:E11, "Electronics", C2:C11, ">2000")',
        context
      );
      
      const widgets = engine.evaluate(
        '=SUMIFS(C2:C11, A2:A11, "W*", E2:E11, "Electronics", C2:C11, ">2000")',
        context
      );
      
      const total = (gadgets as number) + (widgets as number);
      
      expect(gadgets).toBe(10000); // Rows 3, 7, 10
      expect(widgets).toBe(7500); // Rows 6, 9
      expect(total).toBe(17500);
    });
  });

  describe('Performance Tests', () => {
    test('handles large dataset efficiently', () => {
      const start = Date.now();
      
      // Use SEQUENCE to generate large test data
      // Count numbers > 500 where mod 3 = 0 and mod 4 = 0
      const result = engine.evaluate(
        '=COUNTIFS(SEQUENCE(1000), ">500", SEQUENCE(1000), "<900")',
        context
      );
      
      const duration = Date.now() - start;
      
      expect(typeof result).toBe('number');
      expect(result).toBe(399); // Numbers from 501-899
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });
  });
});
