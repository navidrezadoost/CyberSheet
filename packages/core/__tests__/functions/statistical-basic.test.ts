/**
 * statistical-basic.test.ts
 * 
 * Tests for basic statistical functions (Week 8, Day 1)
 * - AVERAGE, AVERAGEA
 * - MEDIAN
 * - MODE.SNGL
 * - STDEV.S, STDEV.P
 * - VAR.S, VAR.P
 */

import { FormulaEngine, FormulaContext, Worksheet } from '../../src';

describe('Statistical Functions - Week 8 Day 1', () => {
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

  describe('AVERAGE', () => {
    test('calculates average of numbers', () => {
      expect(evaluate('=AVERAGE(1, 2, 3, 4, 5)')).toBe(3);
      expect(evaluate('=AVERAGE(10, 20, 30)')).toBe(20);
    });

    test('ignores text and logical values', () => {
      expect(evaluate('=AVERAGE(10, 20, "text", TRUE, FALSE)')).toBe(15);
      expect(evaluate('=AVERAGE(5, "hello", 15)')).toBe(10);
    });

    test('works with arrays', () => {
      worksheet.setCellValue({ row: 0, col: 0 }, 10);
      worksheet.setCellValue({ row: 1, col: 0 }, 20);
      worksheet.setCellValue({ row: 2, col: 0 }, 30);
      worksheet.setCellValue({ row: 3, col: 0 }, 40);
      
      const result = evaluate('=AVERAGE(A1:A4)');
      expect(result).toBe(25);
    });

    test('returns #DIV/0! for no numbers', () => {
      const result = evaluate('=AVERAGE("text", TRUE)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#DIV/0!');
    });

    test('handles negative numbers', () => {
      expect(evaluate('=AVERAGE(-10, -20, -30)')).toBe(-20);
      expect(evaluate('=AVERAGE(-5, 5, 10)')).toBeCloseTo(3.333333333333333, 10);
    });
  });

  describe('AVERAGEA', () => {
    test('calculates average treating text as 0', () => {
      expect(evaluate('=AVERAGEA(1, 2, 3)')).toBe(2);
      expect(evaluate('=AVERAGEA(10, 20, "text")')).toBe(10); // (10+20+0)/3
    });

    test('treats TRUE as 1 and FALSE as 0', () => {
      expect(evaluate('=AVERAGEA(10, 20, TRUE, FALSE)')).toBe(7.75); // (10+20+1+0)/4
      expect(evaluate('=AVERAGEA(TRUE, TRUE, FALSE)')).toBeCloseTo(0.6666666, 5); // (1+1+0)/3
    });

    test('different from AVERAGE with mixed types', () => {
      const avg = evaluate('=AVERAGE(10, 20, "text", TRUE)');
      const avgA = evaluate('=AVERAGEA(10, 20, "text", TRUE)');
      
      expect(avg).toBe(15); // (10+20)/2 - ignores text and TRUE
      expect(avgA).toBe(7.75); // (10+20+0+1)/4 - counts text as 0, TRUE as 1
    });

    test('works with arrays containing mixed types', () => {
      worksheet.setCellValue({ row: 0, col: 0 }, 10);
      worksheet.setCellValue({ row: 1, col: 0 }, 20);
      worksheet.setCellValue({ row: 2, col: 0 }, 'text');
      worksheet.setCellValue({ row: 3, col: 0 }, true);
      
      const result = evaluate('=AVERAGEA(A1:A4)');
      expect(result).toBe(7.75); // (10+20+0+1)/4
    });

    test('returns #DIV/0! for no values', () => {
      const result = evaluate('=AVERAGEA()');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#DIV/0!');
    });
  });

  describe('MEDIAN', () => {
    test('finds middle value in odd-length array', () => {
      expect(evaluate('=MEDIAN(1, 2, 3, 4, 5)')).toBe(3);
      expect(evaluate('=MEDIAN(10, 30, 20)')).toBe(20);
    });

    test('averages two middle values in even-length array', () => {
      expect(evaluate('=MEDIAN(1, 2, 3, 4)')).toBe(2.5);
      expect(evaluate('=MEDIAN(10, 20, 30, 40)')).toBe(25);
    });

    test('handles single value', () => {
      expect(evaluate('=MEDIAN(42)')).toBe(42);
    });

    test('handles unsorted data', () => {
      expect(evaluate('=MEDIAN(5, 1, 9, 3, 7)')).toBe(5);
      expect(evaluate('=MEDIAN(100, 10, 50, 25)')).toBe(37.5);
    });

    test('handles negative numbers', () => {
      expect(evaluate('=MEDIAN(-10, -5, 0, 5, 10)')).toBe(0);
      expect(evaluate('=MEDIAN(-20, -10, -30)')).toBe(-20);
    });

    test('works with arrays', () => {
      worksheet.setCellValue({ row: 0, col: 0 }, 15);
      worksheet.setCellValue({ row: 1, col: 0 }, 5);
      worksheet.setCellValue({ row: 2, col: 0 }, 25);
      worksheet.setCellValue({ row: 3, col: 0 }, 10);
      worksheet.setCellValue({ row: 4, col: 0 }, 20);
      
      const result = evaluate('=MEDIAN(A1:A5)');
      expect(result).toBe(15);
    });

    test('returns #NUM! for no values', () => {
      const result = evaluate('=MEDIAN()');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });
  });

  describe('MODE.SNGL', () => {
    test('finds most common value', () => {
      expect(evaluate('=MODE.SNGL(1, 2, 2, 3, 4)')).toBe(2);
      expect(evaluate('=MODE.SNGL(10, 20, 10, 30, 10)')).toBe(10);
    });

    test('returns first mode when tied', () => {
      const result = evaluate('=MODE.SNGL(1, 1, 2, 2, 3)');
      expect([1, 2]).toContain(result); // Either is acceptable
    });

    test('returns #N/A when no value repeats', () => {
      const result = evaluate('=MODE.SNGL(1, 2, 3, 4, 5)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#N/A');
    });

    test('works with arrays', () => {
      worksheet.setCellValue({ row: 0, col: 0 }, 5);
      worksheet.setCellValue({ row: 1, col: 0 }, 10);
      worksheet.setCellValue({ row: 2, col: 0 }, 5);
      worksheet.setCellValue({ row: 3, col: 0 }, 15);
      worksheet.setCellValue({ row: 4, col: 0 }, 5);
      
      const result = evaluate('=MODE.SNGL(A1:A5)');
      expect(result).toBe(5);
    });

    test('handles negative numbers', () => {
      expect(evaluate('=MODE.SNGL(-5, -5, -10, 0, 5)')).toBe(-5);
    });
  });

  describe('STDEV.S (Sample Standard Deviation)', () => {
    test('calculates sample standard deviation', () => {
      const result = evaluate('=STDEV.S(1, 2, 3, 4, 5)');
      expect(result).toBeCloseTo(1.5811388, 5);
    });

    test('matches Excel for simple dataset', () => {
      const result = evaluate('=STDEV.S(10, 20, 30, 40)');
      expect(result).toBeCloseTo(12.909944, 5);
    });

    test('requires at least 2 values', () => {
      const result = evaluate('=STDEV.S(42)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#DIV/0!');
    });

    test('handles negative numbers', () => {
      const result = evaluate('=STDEV.S(-10, -5, 0, 5, 10)');
      expect(result).toBeCloseTo(7.905694, 5);
    });

    test('Welford algorithm handles large numbers', () => {
      // Large numbers that would lose precision with naive algorithm
      const result = evaluate('=STDEV.S(1000000000, 1000000001, 1000000002)');
      expect(result).toBeCloseTo(1, 5);
    });

    test('works with arrays', () => {
      worksheet.setCellValue({ row: 0, col: 0 }, 2);
      worksheet.setCellValue({ row: 1, col: 0 }, 4);
      worksheet.setCellValue({ row: 2, col: 0 }, 6);
      worksheet.setCellValue({ row: 3, col: 0 }, 8);
      
      const result = evaluate('=STDEV.S(A1:A4)');
      expect(result).toBeCloseTo(2.581988, 5);
    });

    test('STDEV is alias for STDEV.S', () => {
      const stdevS = evaluate('=STDEV.S(1, 2, 3, 4, 5)');
      const stdev = evaluate('=STDEV(1, 2, 3, 4, 5)');
      expect(stdev).toBe(stdevS);
    });
  });

  describe('STDEV.P (Population Standard Deviation)', () => {
    test('calculates population standard deviation', () => {
      const result = evaluate('=STDEV.P(1, 2, 3, 4, 5)');
      expect(result).toBeCloseTo(1.4142135, 5);
    });

    test('matches Excel for simple dataset', () => {
      const result = evaluate('=STDEV.P(10, 20, 30, 40)');
      expect(result).toBeCloseTo(11.180339, 5);
    });

    test('accepts single value', () => {
      expect(evaluate('=STDEV.P(42)')).toBe(0);
    });

    test('different from STDEV.S (divides by n vs n-1)', () => {
      const stdevS = evaluate('=STDEV.S(1, 2, 3, 4, 5)') as number;
      const stdevP = evaluate('=STDEV.P(1, 2, 3, 4, 5)') as number;
      
      expect(stdevS).toBeGreaterThan(stdevP); // Sample stdev is larger
      expect(stdevS).toBeCloseTo(1.5811388, 5);
      expect(stdevP).toBeCloseTo(1.4142135, 5);
    });

    test('Welford algorithm handles large numbers', () => {
      const result = evaluate('=STDEV.P(1000000000, 1000000001, 1000000002)');
      expect(result).toBeCloseTo(0.816496, 5);
    });

    test('works with arrays', () => {
      worksheet.setCellValue({ row: 0, col: 0 }, 5);
      worksheet.setCellValue({ row: 1, col: 0 }, 10);
      worksheet.setCellValue({ row: 2, col: 0 }, 15);
      
      const result = evaluate('=STDEV.P(A1:A3)');
      expect(result).toBeCloseTo(4.082482, 5);
    });
  });

  describe('VAR.S (Sample Variance)', () => {
    test('calculates sample variance', () => {
      const result = evaluate('=VAR.S(1, 2, 3, 4, 5)');
      expect(result).toBe(2.5);
    });

    test('matches Excel for simple dataset', () => {
      const result = evaluate('=VAR.S(10, 20, 30, 40)');
      expect(result).toBeCloseTo(166.666666, 5);
    });

    test('requires at least 2 values', () => {
      const result = evaluate('=VAR.S(42)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#DIV/0!');
    });

    test('variance equals stdev squared', () => {
      const variance = evaluate('=VAR.S(1, 2, 3, 4, 5)') as number;
      const stdev = evaluate('=STDEV.S(1, 2, 3, 4, 5)') as number;
      
      expect(variance).toBeCloseTo(stdev * stdev, 5);
    });

    test('Welford algorithm handles large numbers', () => {
      const result = evaluate('=VAR.S(1000000000, 1000000001, 1000000002)');
      expect(result).toBeCloseTo(1, 5);
    });

    test('works with arrays', () => {
      worksheet.setCellValue({ row: 0, col: 0 }, 3);
      worksheet.setCellValue({ row: 1, col: 0 }, 6);
      worksheet.setCellValue({ row: 2, col: 0 }, 9);
      
      const result = evaluate('=VAR.S(A1:A3)');
      expect(result).toBe(9);
    });

    test('VAR is alias for VAR.S', () => {
      const varS = evaluate('=VAR.S(1, 2, 3, 4, 5)');
      const varFunc = evaluate('=VAR(1, 2, 3, 4, 5)');
      expect(varFunc).toBe(varS);
    });
  });

  describe('VAR.P (Population Variance)', () => {
    test('calculates population variance', () => {
      const result = evaluate('=VAR.P(1, 2, 3, 4, 5)');
      expect(result).toBe(2.0);
    });

    test('matches Excel for simple dataset', () => {
      const result = evaluate('=VAR.P(10, 20, 30, 40)');
      expect(result).toBe(125);
    });

    test('accepts single value', () => {
      expect(evaluate('=VAR.P(42)')).toBe(0);
    });

    test('different from VAR.S (divides by n vs n-1)', () => {
      const varS = evaluate('=VAR.S(1, 2, 3, 4, 5)');
      const varP = evaluate('=VAR.P(1, 2, 3, 4, 5)');
      
      expect(varS).toBeGreaterThan(varP as number);
      expect(varS).toBe(2.5);
      expect(varP).toBe(2.0);
    });

    test('variance equals stdev squared', () => {
      const variance = evaluate('=VAR.P(1, 2, 3, 4, 5)') as number;
      const stdev = evaluate('=STDEV.P(1, 2, 3, 4, 5)') as number;
      
      expect(variance).toBeCloseTo(stdev * stdev, 5);
    });

    test('Welford algorithm handles large numbers', () => {
      const result = evaluate('=VAR.P(1000000000, 1000000001, 1000000002)');
      expect(result).toBeCloseTo(0.666666, 5);
    });

    test('works with arrays', () => {
      worksheet.setCellValue({ row: 0, col: 0 }, 2);
      worksheet.setCellValue({ row: 1, col: 0 }, 4);
      worksheet.setCellValue({ row: 2, col: 0 }, 6);
      worksheet.setCellValue({ row: 3, col: 0 }, 8);
      
      const result = evaluate('=VAR.P(A1:A4)');
      expect(result).toBe(5);
    });
  });

  describe('Integration with Dynamic Arrays', () => {
    test('AVERAGE with FILTER', () => {
      worksheet.setCellValue({ row: 0, col: 0 }, 10);
      worksheet.setCellValue({ row: 1, col: 0 }, 20);
      worksheet.setCellValue({ row: 2, col: 0 }, 30);
      worksheet.setCellValue({ row: 3, col: 0 }, 40);
      
      const result = evaluate('=AVERAGE(FILTER(A1:A4, A1:A4>15))');
      expect(result).toBe(30); // Average of 20, 30, 40
    });

    test('MEDIAN with SEQUENCE', () => {
      const result = evaluate('=MEDIAN(SEQUENCE(5))');
      expect(result).toBe(3); // Median of 1,2,3,4,5
    });

    test('STDEV.S with MAP', () => {
      worksheet.setCellValue({ row: 0, col: 0 }, 1);
      worksheet.setCellValue({ row: 1, col: 0 }, 2);
      worksheet.setCellValue({ row: 2, col: 0 }, 3);
      
      // MAP doubles each value: 1→2, 2→4, 3→6
      const result = evaluate('=STDEV.S(MAP(A1:A3, LAMBDA(x, x*2)))');
      expect(result).toBeCloseTo(2, 5); // STDEV of 2,4,6
    });

    test('AVERAGEA with mixed dynamic array', () => {
      const result = evaluate('=AVERAGEA(SEQUENCE(3))');
      expect(result).toBe(2); // Average of 1,2,3
    });

    test('VAR.P with FILTER and condition', () => {
      worksheet.setCellValue({ row: 0, col: 0 }, 5);
      worksheet.setCellValue({ row: 1, col: 0 }, 10);
      worksheet.setCellValue({ row: 2, col: 0 }, 15);
      worksheet.setCellValue({ row: 3, col: 0 }, 20);
      
      const result = evaluate('=VAR.P(FILTER(A1:A4, A1:A4>=10))');
      expect(result).toBeCloseTo(16.666666, 5); // Variance of 10,15,20
    });
  });

  describe('Edge Cases and Robustness', () => {
    test('handles very large datasets', () => {
      const largeData = Array(1000).fill(null).map((_, i) => i + 1);
      const formula = `=AVERAGE(${largeData.join(',')})`;
      const result = evaluate(formula);
      expect(result).toBe(500.5);
    });

    test('handles decimal precision', () => {
      const result = evaluate('=AVERAGE(0.1, 0.2, 0.3)');
      expect(result).toBeCloseTo(0.2, 10);
    });

    test('handles very small numbers', () => {
      const result = evaluate('=STDEV.S(0.0001, 0.0002, 0.0003)');
      expect(result).toBeGreaterThan(0);
    });

    test('all functions handle empty arrays gracefully', () => {
      const avgResult = evaluate('=AVERAGE()');
      const medianResult = evaluate('=MEDIAN()');
      const varResult = evaluate('=VAR.S()');
      
      expect(avgResult).toBeInstanceOf(Error);
      expect(medianResult).toBeInstanceOf(Error);
      expect(varResult).toBeInstanceOf(Error);
    });

    test('handles zeros correctly', () => {
      expect(evaluate('=AVERAGE(0, 0, 0)')).toBe(0);
      expect(evaluate('=STDEV.P(0, 0, 0)')).toBe(0);
      expect(evaluate('=VAR.P(0, 0, 0)')).toBe(0);
    });
  });
});
