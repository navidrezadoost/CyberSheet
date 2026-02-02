/**
 * Tests for Week 11 Day 2: Advanced Math Functions
 * Functions: MROUND, QUOTIENT, PRODUCT, SQRTPI, MULTINOMIAL, SUMX2MY2, SUMX2PY2, SUMXMY2
 */

import { FormulaEngine, FormulaContext, Worksheet } from '../../src';

describe('Week 11 Day 2: Advanced Math Functions', () => {
  let engine: FormulaEngine;
  let worksheet: Worksheet;
  let context: FormulaContext;

  beforeEach(() => {
    engine = new FormulaEngine();
    worksheet = new Worksheet('Test', 100, 26);
    context = {
      worksheet,
      currentCell: { row: 0, col: 0 },
      namedLambdas: new Map()
    } as FormulaContext;
  });

  const evaluate = (formula: string) => engine.evaluate(formula, context);

  // Helper to set cell value
  const setCellValue = (cell: string, value: any) => {
    const match = cell.match(/^([A-Z]+)(\d+)$/);
    if (!match) throw new Error(`Invalid cell reference: ${cell}`);
    const col = match[1].charCodeAt(0) - 65;
    const row = parseInt(match[2]) - 1;
    worksheet.setCellValue({ row, col }, value);
  };

  // ============================================================================
  // MROUND - Round to nearest multiple
  // ============================================================================

  describe('MROUND function', () => {
    test('should round to nearest multiple - positive', () => {
      expect(evaluate('=MROUND(10, 3)')).toBe(9);
      expect(evaluate('=MROUND(11, 3)')).toBe(12);
      expect(evaluate('=MROUND(13, 5)')).toBe(15);
    });

    test('should round to nearest multiple - decimal', () => {
      expect(evaluate('=MROUND(1.3, 0.2)')).toBeCloseTo(1.4, 5);
      expect(evaluate('=MROUND(1.25, 0.5)')).toBeCloseTo(1.5, 5);
      expect(evaluate('=MROUND(3.7, 0.25)')).toBeCloseTo(3.75, 5);
    });

    test('should handle negative numbers', () => {
      expect(evaluate('=MROUND(-10, -3)')).toBe(-9);
      expect(evaluate('=MROUND(-11, -3)')).toBe(-12);
    });

    test('should return error for zero multiple', () => {
      const result = evaluate('=MROUND(10, 0)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('should return error for different signs', () => {
      const result1 = evaluate('=MROUND(10, -3)');
      expect(result1).toBeInstanceOf(Error);
      expect((result1 as Error).message).toBe('#NUM!');

      const result2 = evaluate('=MROUND(-10, 3)');
      expect(result2).toBeInstanceOf(Error);
      expect((result2 as Error).message).toBe('#NUM!');
    });

    test('should handle cell references', () => {
      setCellValue('A1', 10);
      setCellValue('B1', 3);
      expect(evaluate('=MROUND(A1, B1)')).toBe(9);
    });
  });

  // ============================================================================
  // QUOTIENT - Integer division
  // ============================================================================

  describe('QUOTIENT function', () => {
    test('should return integer part of division', () => {
      expect(evaluate('=QUOTIENT(10, 3)')).toBe(3);
      expect(evaluate('=QUOTIENT(5, 2)')).toBe(2);
      expect(evaluate('=QUOTIENT(8, 3)')).toBe(2);
    });

    test('should handle exact division', () => {
      expect(evaluate('=QUOTIENT(10, 5)')).toBe(2);
      expect(evaluate('=QUOTIENT(12, 4)')).toBe(3);
    });

    test('should handle negative numbers', () => {
      expect(evaluate('=QUOTIENT(-10, 3)')).toBe(-3);
      expect(evaluate('=QUOTIENT(10, -3)')).toBe(-3);
      expect(evaluate('=QUOTIENT(-10, -3)')).toBe(3);
    });

    test('should return error for division by zero', () => {
      const result = evaluate('=QUOTIENT(10, 0)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#DIV/0!');
    });

    test('should handle decimal numbers', () => {
      expect(evaluate('=QUOTIENT(10.5, 3.2)')).toBe(3);
      expect(evaluate('=QUOTIENT(7.8, 2.1)')).toBe(3);
    });

    test('should handle cell references', () => {
      setCellValue('A1', 17);
      setCellValue('B1', 4);
      expect(evaluate('=QUOTIENT(A1, B1)')).toBe(4);
    });
  });

  // ============================================================================
  // PRODUCT - Multiply all numbers
  // ============================================================================

  describe('PRODUCT function', () => {
    test('should multiply all numbers', () => {
      expect(evaluate('=PRODUCT(5, 2, 3)')).toBe(30);
      expect(evaluate('=PRODUCT(2, 4, 6)')).toBe(48);
    });

    test('should handle single number', () => {
      expect(evaluate('=PRODUCT(7)')).toBe(7);
      expect(evaluate('=PRODUCT(0)')).toBe(0);
    });

    test('should handle decimal numbers', () => {
      expect(evaluate('=PRODUCT(0.5, 10)')).toBe(5);
      expect(evaluate('=PRODUCT(1.5, 2, 3)')).toBe(9);
    });

    test('should handle negative numbers', () => {
      expect(evaluate('=PRODUCT(-2, 3)')).toBe(-6);
      expect(evaluate('=PRODUCT(-2, -3)')).toBe(6);
    });

    test('should ignore text and logical values', () => {
      setCellValue('A1', 2);
      setCellValue('A2', 'text');
      setCellValue('A3', 3);
      expect(evaluate('=PRODUCT(A1:A3)')).toBe(6);
    });

    test('should return 0 for empty input', () => {
      expect(evaluate('=PRODUCT()')).toBe(0);
    });

    test('should handle cell references', () => {
      setCellValue('A1', 2);
      setCellValue('A2', 3);
      setCellValue('A3', 4);
      expect(evaluate('=PRODUCT(A1:A3)')).toBe(24);
    });
  });

  // ============================================================================
  // SQRTPI - Square root of (number * π)
  // ============================================================================

  describe('SQRTPI function', () => {
    test('should calculate square root of π', () => {
      expect(evaluate('=SQRTPI(1)')).toBeCloseTo(Math.sqrt(Math.PI), 5);
    });

    test('should calculate square root of 2π', () => {
      expect(evaluate('=SQRTPI(2)')).toBeCloseTo(Math.sqrt(2 * Math.PI), 5);
    });

    test('should handle zero', () => {
      expect(evaluate('=SQRTPI(0)')).toBe(0);
    });

    test('should return error for negative numbers', () => {
      const result = evaluate('=SQRTPI(-1)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('should handle decimal numbers', () => {
      expect(evaluate('=SQRTPI(0.5)')).toBeCloseTo(Math.sqrt(0.5 * Math.PI), 5);
    });

    test('should handle cell references', () => {
      setCellValue('A1', 3);
      const result = evaluate('=SQRTPI(A1)');
      expect(result).toBeCloseTo(Math.sqrt(3 * Math.PI), 5);
    });
  });

  // ============================================================================
  // MULTINOMIAL - Multinomial coefficient
  // ============================================================================

  describe('MULTINOMIAL function', () => {
    test('should calculate multinomial coefficient', () => {
      // 9! / (2! * 3! * 4!) = 362880 / (2 * 6 * 24) = 362880 / 288 = 1260
      expect(evaluate('=MULTINOMIAL(2, 3, 4)')).toBe(1260);
    });

    test('should calculate binomial coefficient', () => {
      // 6! / (3! * 3!) = 720 / (6 * 6) = 720 / 36 = 20
      expect(evaluate('=MULTINOMIAL(3, 3)')).toBe(20);
    });

    test('should handle single number', () => {
      // 5! / 5! = 1
      expect(evaluate('=MULTINOMIAL(5)')).toBe(1);
    });

    test('should handle zeros', () => {
      // 3! / (0! * 3!) = 6 / (1 * 6) = 1
      expect(evaluate('=MULTINOMIAL(0, 3)')).toBe(1);
    });

    test('should return error for negative numbers', () => {
      const result = evaluate('=MULTINOMIAL(-1, 2)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('should return error for decimal numbers', () => {
      const result = evaluate('=MULTINOMIAL(2.5, 3)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('should handle cell references', () => {
      setCellValue('A1', 2);
      setCellValue('A2', 3);
      expect(evaluate('=MULTINOMIAL(A1, A2)')).toBe(10);
    });
  });

  // ============================================================================
  // SUMX2MY2 - Sum of squared differences
  // ============================================================================

  describe('SUMX2MY2 function', () => {
    test('should calculate sum of x² - y²', () => {
      // (2²-6²) + (3²-5²) + (9²-11²)
      // = (4-36) + (9-25) + (81-121)
      // = -32 + -16 + -40 = -88
      setCellValue('A1', 2);
      setCellValue('A2', 3);
      setCellValue('A3', 9);
      setCellValue('B1', 6);
      setCellValue('B2', 5);
      setCellValue('B3', 11);
      expect(evaluate('=SUMX2MY2(A1:A3, B1:B3)')).toBe(-88);
    });

    test('should handle positive results', () => {
      setCellValue('A1', 5);
      setCellValue('A2', 4);
      setCellValue('B1', 3);
      setCellValue('B2', 2);
      // (25-9) + (16-4) = 16 + 12 = 28
      expect(evaluate('=SUMX2MY2(A1:A2, B1:B2)')).toBe(28);
    });

    test('should return error for mismatched array sizes', () => {
      setCellValue('A1', 1);
      setCellValue('A2', 2);
      setCellValue('B1', 3);
      const result = evaluate('=SUMX2MY2(A1:A2, B1:B1)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#N/A');
    });

    test('should handle single values', () => {
      // 5² - 3² = 25 - 9 = 16
      expect(evaluate('=SUMX2MY2(5, 3)')).toBe(16);
    });
  });

  // ============================================================================
  // SUMX2PY2 - Sum of sum of squares
  // ============================================================================

  describe('SUMX2PY2 function', () => {
    test('should calculate sum of x² + y²', () => {
      // (2²+6²) + (3²+5²) + (9²+11²)
      // = (4+36) + (9+25) + (81+121)
      // = 40 + 34 + 202 = 276
      setCellValue('A1', 2);
      setCellValue('A2', 3);
      setCellValue('A3', 9);
      setCellValue('B1', 6);
      setCellValue('B2', 5);
      setCellValue('B3', 11);
      expect(evaluate('=SUMX2PY2(A1:A3, B1:B3)')).toBe(276);
    });

    test('should handle zeros', () => {
      setCellValue('A1', 0);
      setCellValue('A2', 3);
      setCellValue('B1', 4);
      setCellValue('B2', 0);
      // (0+16) + (9+0) = 16 + 9 = 25
      expect(evaluate('=SUMX2PY2(A1:A2, B1:B2)')).toBe(25);
    });

    test('should return error for mismatched array sizes', () => {
      setCellValue('A1', 1);
      setCellValue('A2', 2);
      setCellValue('B1', 3);
      const result = evaluate('=SUMX2PY2(A1:A2, B1:B1)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#N/A');
    });

    test('should handle single values', () => {
      // 3² + 4² = 9 + 16 = 25
      expect(evaluate('=SUMX2PY2(3, 4)')).toBe(25);
    });
  });

  // ============================================================================
  // SUMXMY2 - Sum of squared differences (alternative form)
  // ============================================================================

  describe('SUMXMY2 function', () => {
    test('should calculate sum of (x - y)²', () => {
      // (2-6)² + (3-5)² + (9-11)²
      // = 16 + 4 + 4 = 24
      setCellValue('A1', 2);
      setCellValue('A2', 3);
      setCellValue('A3', 9);
      setCellValue('B1', 6);
      setCellValue('B2', 5);
      setCellValue('B3', 11);
      expect(evaluate('=SUMXMY2(A1:A3, B1:B3)')).toBe(24);
    });

    test('should handle equal values (zero difference)', () => {
      setCellValue('A1', 5);
      setCellValue('A2', 3);
      setCellValue('B1', 5);
      setCellValue('B2', 3);
      expect(evaluate('=SUMXMY2(A1:A2, B1:B2)')).toBe(0);
    });

    test('should return error for mismatched array sizes', () => {
      setCellValue('A1', 1);
      setCellValue('A2', 2);
      setCellValue('B1', 3);
      const result = evaluate('=SUMXMY2(A1:A2, B1:B1)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#N/A');
    });

    test('should handle single values', () => {
      // (7-3)² = 16
      expect(evaluate('=SUMXMY2(7, 3)')).toBe(16);
    });

    test('should handle negative differences', () => {
      setCellValue('A1', 3);
      setCellValue('B1', 7);
      // (3-7)² = 16
      expect(evaluate('=SUMXMY2(A1, B1)')).toBe(16);
    });
  });

  // ============================================================================
  // Integration Tests - Combining Multiple Functions
  // ============================================================================

  describe('Integration tests', () => {
    test('should use MROUND with AVERAGE', () => {
      setCellValue('A1', 10);
      setCellValue('A2', 15);
      setCellValue('A3', 20);
      // AVERAGE = 15, MROUND(15, 10) = 20
      expect(evaluate('=MROUND(AVERAGE(A1:A3), 10)')).toBe(20);
    });

    test('should use QUOTIENT with PRODUCT', () => {
      // PRODUCT(2, 3, 4) = 24, QUOTIENT(24, 5) = 4
      expect(evaluate('=QUOTIENT(PRODUCT(2, 3, 4), 5)')).toBe(4);
    });

    test('should use SQRTPI with POWER', () => {
      // SQRTPI(4) ≈ 3.545, POWER(3.545, 2) ≈ 12.566 ≈ 4π
      const result = evaluate('=POWER(SQRTPI(4), 2)');
      expect(result).toBeCloseTo(4 * Math.PI, 5);
    });

    test('should combine SUM functions', () => {
      setCellValue('A1', 3);
      setCellValue('A2', 4);
      setCellValue('B1', 1);
      setCellValue('B2', 2);
      // SUMX2PY2 + SUMX2MY2
      const sumPlus = evaluate('=SUMX2PY2(A1:A2, B1:B2)');
      const sumMinus = evaluate('=SUMX2MY2(A1:A2, B1:B2)');
      // (9+1) + (16+4) = 30
      // (9-1) + (16-4) = 20
      expect(sumPlus).toBe(30);
      expect(sumMinus).toBe(20);
    });

    test('should use PRODUCT with MULTINOMIAL', () => {
      // PRODUCT(2, 3) = 6, MULTINOMIAL(6) = 1
      expect(evaluate('=MULTINOMIAL(PRODUCT(2, 3))')).toBe(1);
    });
  });

  // ============================================================================
  // Edge Cases and Error Handling
  // ============================================================================

  describe('Edge cases', () => {
    test('should handle very large numbers in PRODUCT', () => {
      expect(evaluate('=PRODUCT(1000, 1000, 1000)')).toBe(1000000000);
    });

    test('should handle very small decimals in MROUND', () => {
      expect(evaluate('=MROUND(0.001, 0.0001)')).toBeCloseTo(0.001, 5);
    });

    test('should handle precision in SQRTPI', () => {
      const result = evaluate('=SQRTPI(100)');
      expect(result).toBeCloseTo(Math.sqrt(100 * Math.PI), 10);
    });

    test('should handle zero in QUOTIENT numerator', () => {
      expect(evaluate('=QUOTIENT(0, 5)')).toBe(0);
    });

    test('should handle large factorials in MULTINOMIAL', () => {
      // 10! / (5! * 5!) = 252
      expect(evaluate('=MULTINOMIAL(5, 5)')).toBe(252);
    });
  });
});
