/**
 * maxifs-minifs.test.ts
 * 
 * Tests for MAXIFS and MINIFS functions
 * Day 6: Maximum and minimum with multiple criteria
 */

import { FormulaEngine, FormulaContext, Worksheet } from '../src';

describe('MAXIFS and MINIFS Functions', () => {
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
    
    // Setup test data - Sales performance data
    const testData = [
      // Row 0: Headers
      ['Product', 'Region', 'Sales', 'Profit', 'Category'],
      // Row 1-10: Data
      ['Widget', 'North', 1000, 100, 'Electronics'],
      ['Gadget', 'South', 2000, 300, 'Electronics'],
      ['Widget', 'North', 1500, 200, 'Electronics'],
      ['Tool', 'East', 3000, 400, 'Hardware'],
      ['Widget', 'South', 2500, 350, 'Electronics'],
      ['Gadget', 'North', 4000, 500, 'Electronics'],
      ['Tool', 'North', 3500, 450, 'Hardware'],
      ['Widget', 'East', 5000, 600, 'Electronics'],
      ['Gadget', 'South', 6000, 700, 'Electronics'],
      ['Tool', 'East', 7000, 800, 'Hardware'],
    ];

    testData.forEach((row, rowIdx) => {
      row.forEach((val, colIdx) => {
        worksheet.setCellValue({ row: rowIdx + 1, col: colIdx + 1 }, val);
      });
    });
  });

  describe('MAXIFS Function', () => {
    describe('Two Criteria', () => {
      test('finds maximum with two exact matches', () => {
        // Maximum sales for Widgets in North region
        const result = engine.evaluate(
          '=MAXIFS(C2:C11, A2:A11, "Widget", B2:B11, "North")',
          context
        );
        
        expect(result).toBe(1500); // Max of 1000 and 1500
      });

      test('finds maximum with comparison and text criteria', () => {
        // Maximum sales > 3000 in North region
        const result = engine.evaluate(
          '=MAXIFS(C2:C11, C2:C11, ">3000", B2:B11, "North")',
          context
        );
        
        expect(result).toBe(4000); // Only row 7 matches (Gadget, 4000)
      });

      test('finds maximum with two numeric criteria', () => {
        // Maximum profit where sales > 2000 and profit > 400
        const result = engine.evaluate(
          '=MAXIFS(D2:D11, C2:C11, ">2000", D2:D11, ">400")',
          context
        );
        
        expect(result).toBe(800); // Max profit among qualifying rows
      });

      test('finds maximum with wildcard criteria', () => {
        // Maximum sales for Gadget* in Electronics
        const result = engine.evaluate(
          '=MAXIFS(C2:C11, A2:A11, "Gadget*", E2:E11, "Electronics")',
          context
        );
        
        expect(result).toBe(6000); // Max of Gadget sales
      });
    });

    describe('Three or More Criteria', () => {
      test('finds maximum with three criteria', () => {
        // Maximum sales for Widgets in North with sales > 1000
        const result = engine.evaluate(
          '=MAXIFS(C2:C11, A2:A11, "Widget", B2:B11, "North", C2:C11, ">1000")',
          context
        );
        
        expect(result).toBe(1500); // Only row 4 qualifies
      });

      test('finds maximum with four criteria', () => {
        // Maximum profit for Electronics in North with sales > 1000 and profit >= 200
        const result = engine.evaluate(
          '=MAXIFS(D2:D11, E2:E11, "Electronics", B2:B11, "North", C2:C11, ">1000", D2:D11, ">=200")',
          context
        );
        
        expect(result).toBe(500); // Row 7 (Gadget, 4000 sales, 500 profit)
      });
    });

    describe('Edge Cases', () => {
      test('returns error when no rows match', () => {
        const result = engine.evaluate(
          '=MAXIFS(C2:C11, A2:A11, "Nonexistent", B2:B11, "North")',
          context
        );
        
        expect(result).toBeInstanceOf(Error);
        expect((result as Error).message).toBe('#VALUE!');
      });

      test('returns error with mismatched range sizes', () => {
        const result = engine.evaluate(
          '=MAXIFS(C2:C11, A2:A11, "Widget", B2:B10, "North")',
          context
        );
        
        expect(result).toBeInstanceOf(Error);
        expect((result as Error).message).toBe('#VALUE!');
      });

      test('returns error with even number of arguments', () => {
        const result = engine.evaluate(
          '=MAXIFS(C2:C11, A2:A11, "Widget", B2:B11)',
          context
        );
        
        expect(result).toBeInstanceOf(Error);
      });

      test('returns error with less than 3 arguments', () => {
        const result = engine.evaluate(
          '=MAXIFS(C2:C11, A2:A11)',
          context
        );
        
        expect(result).toBeInstanceOf(Error);
      });

      test('ignores non-numeric values in max range', () => {
        // Set a text value in the range
        worksheet.setCellValue({ row: 2, col: 3 }, 'N/A');
        
        const result = engine.evaluate(
          '=MAXIFS(C2:C11, A2:A11, "Widget", B2:B11, "North")',
          context
        );
        
        expect(result).toBe(1500);
      });
    });
  });

  describe('MINIFS Function', () => {
    describe('Two Criteria', () => {
      test('finds minimum with two exact matches', () => {
        // Minimum sales for Widgets in North region
        const result = engine.evaluate(
          '=MINIFS(C2:C11, A2:A11, "Widget", B2:B11, "North")',
          context
        );
        
        expect(result).toBe(1000); // Min of 1000 and 1500
      });

      test('finds minimum with comparison and text criteria', () => {
        // Minimum sales > 3000 in East region
        const result = engine.evaluate(
          '=MINIFS(C2:C11, C2:C11, ">3000", B2:B11, "East")',
          context
        );
        
        expect(result).toBe(5000); // Min of 5000 and 7000
      });

      test('finds minimum with two numeric criteria', () => {
        // Minimum profit where sales > 2000 and profit > 300
        const result = engine.evaluate(
          '=MINIFS(D2:D11, C2:C11, ">2000", D2:D11, ">300")',
          context
        );
        
        expect(result).toBe(350); // Min profit among qualifying rows
      });

      test('finds minimum with wildcard criteria', () => {
        // Minimum sales for Tool* in Hardware
        const result = engine.evaluate(
          '=MINIFS(C2:C11, A2:A11, "Tool*", E2:E11, "Hardware")',
          context
        );
        
        expect(result).toBe(3000); // Min of Tool sales
      });
    });

    describe('Three or More Criteria', () => {
      test('finds minimum with three criteria', () => {
        // Minimum sales for Electronics in North with profit > 200
        const result = engine.evaluate(
          '=MINIFS(C2:C11, E2:E11, "Electronics", B2:B11, "North", D2:D11, ">200")',
          context
        );
        
        expect(result).toBe(4000); // Only row 7 qualifies (Gadget)
      });

      test('finds minimum with four criteria', () => {
        // Minimum profit for Electronics in South with sales > 2000 and profit >= 350
        const result = engine.evaluate(
          '=MINIFS(D2:D11, E2:E11, "Electronics", B2:B11, "South", C2:C11, ">2000", D2:D11, ">=350")',
          context
        );
        
        expect(result).toBe(350); // Row 6 (Widget, 2500 sales, 350 profit)
      });
    });

    describe('Edge Cases', () => {
      test('returns error when no rows match', () => {
        const result = engine.evaluate(
          '=MINIFS(C2:C11, A2:A11, "Nonexistent", B2:B11, "North")',
          context
        );
        
        expect(result).toBeInstanceOf(Error);
        expect((result as Error).message).toBe('#VALUE!');
      });

      test('returns error with mismatched range sizes', () => {
        const result = engine.evaluate(
          '=MINIFS(C2:C11, A2:A11, "Widget", B2:B10, "North")',
          context
        );
        
        expect(result).toBeInstanceOf(Error);
        expect((result as Error).message).toBe('#VALUE!');
      });

      test('returns error with even number of arguments', () => {
        const result = engine.evaluate(
          '=MINIFS(C2:C11, A2:A11, "Widget", B2:B11)',
          context
        );
        
        expect(result).toBeInstanceOf(Error);
      });

      test('ignores non-numeric values in min range', () => {
        // Set a text value in the range
        worksheet.setCellValue({ row: 2, col: 3 }, 'N/A');
        
        const result = engine.evaluate(
          '=MINIFS(C2:C11, A2:A11, "Widget", B2:B11, "North")',
          context
        );
        
        // Row 2 (C2) now has 'N/A', so it's skipped
        // Only row 4 (C4) matches with value 1500
        expect(result).toBe(1500);
      });
    });
  });

  describe('MAXIFS and MINIFS Combined', () => {
    test('calculates range (max - min) for filtered data', () => {
      // Range of sales for Electronics in North
      const max = engine.evaluate(
        '=MAXIFS(C2:C11, E2:E11, "Electronics", B2:B11, "North")',
        context
      );
      
      const min = engine.evaluate(
        '=MINIFS(C2:C11, E2:E11, "Electronics", B2:B11, "North")',
        context
      );
      
      expect(max).toBe(4000);
      expect(min).toBe(1000);
      expect((max as number) - (min as number)).toBe(3000);
    });

    test('finds extremes with same complex criteria', () => {
      // Max and min profit for sales > 2500
      const max = engine.evaluate(
        '=MAXIFS(D2:D11, C2:C11, ">2500")',
        context
      );
      
      const min = engine.evaluate(
        '=MINIFS(D2:D11, C2:C11, ">2500")',
        context
      );
      
      expect(max).toBe(800);
      expect(min).toBe(400);
    });
  });

  describe('Integration with Dynamic Arrays', () => {
    test('MAXIFS with SEQUENCE', () => {
      // Maximum value from SEQUENCE where value > 5 and value < 9
      const result = engine.evaluate(
        '=MAXIFS(SEQUENCE(10), SEQUENCE(10), ">5", SEQUENCE(10), "<9")',
        context
      );
      
      expect(result).toBe(8); // Values 6,7,8 match, max is 8
    });

    test('MINIFS with SEQUENCE', () => {
      // Minimum value from SEQUENCE where value > 5 and value < 9
      const result = engine.evaluate(
        '=MINIFS(SEQUENCE(10), SEQUENCE(10), ">5", SEQUENCE(10), "<9")',
        context
      );
      
      expect(result).toBe(6); // Values 6,7,8 match, min is 6
    });

    test('MAXIFS with MAKEARRAY', () => {
      // Maximum from first column where second column > 10
      const result = engine.evaluate(
        '=MAXIFS(CHOOSECOLS(MAKEARRAY(10, 2, LAMBDA(r, c, r * c)), 1), CHOOSECOLS(MAKEARRAY(10, 2, LAMBDA(r, c, r * c)), 2), ">10")',
        context
      );
      
      // Column 1: [1,2,3,4,5,6,7,8,9,10]
      // Column 2: [2,4,6,8,10,12,14,16,18,20]
      // Rows where col2 > 10: rows 6-10
      // Max of col1 for those rows: 10
      expect(result).toBe(10);
    });
  });

  describe('Performance Tests', () => {
    test('handles large dataset efficiently', () => {
      const start = Date.now();
      
      // Maximum from SEQUENCE(1000) where value > 500 and value < 900
      const result = engine.evaluate(
        '=MAXIFS(SEQUENCE(1000), SEQUENCE(1000), ">500", SEQUENCE(1000), "<900")',
        context
      );
      
      const duration = Date.now() - start;
      
      expect(result).toBe(899); // Max of values 501-899
      expect(duration).toBeLessThan(100); // Should complete quickly
    });
  });

  describe('Real-World Dashboard Examples', () => {
    test('sales analytics - highest and lowest performers', () => {
      // Highest sales in Electronics category
      const topSales = engine.evaluate(
        '=MAXIFS(C2:C11, E2:E11, "Electronics")',
        context
      );
      
      // Lowest sales in Electronics category
      const bottomSales = engine.evaluate(
        '=MINIFS(C2:C11, E2:E11, "Electronics")',
        context
      );
      
      // Best profit margin (highest profit)
      const bestProfit = engine.evaluate(
        '=MAXIFS(D2:D11, E2:E11, "Electronics")',
        context
      );
      
      expect(topSales).toBe(6000); // Gadget in South
      expect(bottomSales).toBe(1000); // Widget in North
      expect(bestProfit).toBe(700); // Gadget in South
    });

    test('regional performance metrics', () => {
      // Best performing region by maximum sales
      const northMax = engine.evaluate(
        '=MAXIFS(C2:C11, B2:B11, "North")',
        context
      );
      
      const southMax = engine.evaluate(
        '=MAXIFS(C2:C11, B2:B11, "South")',
        context
      );
      
      const eastMax = engine.evaluate(
        '=MAXIFS(C2:C11, B2:B11, "East")',
        context
      );
      
      expect(northMax).toBe(4000); // North
      expect(southMax).toBe(6000); // South - best region!
      expect(eastMax).toBe(7000); // East - actually the best!
    });

    test('product category analysis', () => {
      // Electronics vs Hardware performance
      const electronicsMax = engine.evaluate(
        '=MAXIFS(C2:C11, E2:E11, "Electronics")',
        context
      );
      
      const electronicsMin = engine.evaluate(
        '=MINIFS(C2:C11, E2:E11, "Electronics")',
        context
      );
      
      const hardwareMax = engine.evaluate(
        '=MAXIFS(C2:C11, E2:E11, "Hardware")',
        context
      );
      
      const hardwareMin = engine.evaluate(
        '=MINIFS(C2:C11, E2:E11, "Hardware")',
        context
      );
      
      expect(electronicsMax).toBe(6000);
      expect(electronicsMin).toBe(1000);
      expect(hardwareMax).toBe(7000);
      expect(hardwareMin).toBe(3000);
      
      // Hardware has higher floor and ceiling
      expect((hardwareMin as number) > (electronicsMin as number)).toBe(true);
    });
  });
});
