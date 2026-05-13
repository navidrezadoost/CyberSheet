/**
 * Tests for CSP-safe expression evaluator
 */

import { SafeExpressionEvaluator } from '../SafeExpressionEvaluator';

describe('SafeExpressionEvaluator', () => {
  let evaluator: SafeExpressionEvaluator;

  beforeEach(() => {
    evaluator = new SafeExpressionEvaluator();
  });

  describe('Comparison operators', () => {
    it('evaluates greater than', () => {
      expect(evaluator.evaluate('5 > 3')).toBe(true);
      expect(evaluator.evaluate('3 > 5')).toBe(false);
    });

    it('evaluates less than', () => {
      expect(evaluator.evaluate('3 < 5')).toBe(true);
      expect(evaluator.evaluate('5 < 3')).toBe(false);
    });

    it('evaluates equality', () => {
      expect(evaluator.evaluate('5 == 5')).toBe(true);
      expect(evaluator.evaluate('5 == 3')).toBe(false);
    });

    it('evaluates inequality', () => {
      expect(evaluator.evaluate('5 != 3')).toBe(true);
      expect(evaluator.evaluate('5 != 5')).toBe(false);
    });

    it('evaluates less than or equal', () => {
      expect(evaluator.evaluate('3 <= 5')).toBe(true);
      expect(evaluator.evaluate('5 <= 5')).toBe(true);
      expect(evaluator.evaluate('7 <= 5')).toBe(false);
    });

    it('evaluates greater than or equal', () => {
      expect(evaluator.evaluate('5 >= 3')).toBe(true);
      expect(evaluator.evaluate('5 >= 5')).toBe(true);
      expect(evaluator.evaluate('3 >= 5')).toBe(false);
    });
  });

  describe('Logical operators', () => {
    it('evaluates AND', () => {
      expect(evaluator.evaluate('true && true')).toBe(true);
      expect(evaluator.evaluate('true && false')).toBe(false);
      expect(evaluator.evaluate('false && true')).toBe(false);
    });

    it('evaluates OR', () => {
      expect(evaluator.evaluate('true || false')).toBe(true);
      expect(evaluator.evaluate('false || true')).toBe(true);
      expect(evaluator.evaluate('false || false')).toBe(false);
    });

    it('evaluates NOT', () => {
      expect(evaluator.evaluate('!true')).toBe(false);
      expect(evaluator.evaluate('!false')).toBe(true);
    });

    it('evaluates complex logical expressions', () => {
      expect(evaluator.evaluate('(5 > 3) && (10 < 20)')).toBe(true);
      expect(evaluator.evaluate('(5 > 3) || (10 > 20)')).toBe(true);
      expect(evaluator.evaluate('!(5 > 3)')).toBe(false);
    });
  });

  describe('Arithmetic operators', () => {
    it('evaluates addition', () => {
      expect(evaluator.evaluate('5 + 3 == 8')).toBe(true);
    });

    it('evaluates subtraction', () => {
      expect(evaluator.evaluate('10 - 3 == 7')).toBe(true);
    });

    it('evaluates multiplication', () => {
      expect(evaluator.evaluate('5 * 3 == 15')).toBe(true);
    });

    it('evaluates division', () => {
      expect(evaluator.evaluate('15 / 3 == 5')).toBe(true);
    });

    it('respects operator precedence', () => {
      expect(evaluator.evaluate('2 + 3 * 4 == 14')).toBe(true);
      expect(evaluator.evaluate('(2 + 3) * 4 == 20')).toBe(true);
    });
  });

  describe('String comparisons', () => {
    it('compares strings for equality', () => {
      expect(evaluator.evaluate('"hello" == "hello"')).toBe(true);
      expect(evaluator.evaluate('"hello" == "world"')).toBe(false);
    });

    it('handles string inequality', () => {
      expect(evaluator.evaluate('"hello" != "world"')).toBe(true);
    });
  });

  describe('Boolean literals', () => {
    it('handles true/false keywords', () => {
      expect(evaluator.evaluate('true')).toBe(true);
      expect(evaluator.evaluate('false')).toBe(false);
    });

    it('combines boolean literals', () => {
      expect(evaluator.evaluate('true && true')).toBe(true);
      expect(evaluator.evaluate('true && false')).toBe(false);
    });
  });

  describe('Parentheses', () => {
    it('respects parentheses for grouping', () => {
      expect(evaluator.evaluate('(5 + 3) * 2 == 16')).toBe(true);
      expect(evaluator.evaluate('5 + 3 * 2 == 11')).toBe(true);
    });

    it('handles nested parentheses', () => {
      expect(evaluator.evaluate('((5 + 3) * 2) == 16')).toBe(true);
    });
  });

  describe('Complex expressions', () => {
    it('evaluates conditional formatting formulas', () => {
      // Simulates: =AND(A1>10, B1<5)
      expect(evaluator.evaluate('(15 > 10) && (3 < 5)')).toBe(true);
      expect(evaluator.evaluate('(8 > 10) && (3 < 5)')).toBe(false);
    });

    it('handles mixed operators', () => {
      expect(evaluator.evaluate('(5 + 3) > 6 && (10 - 2) == 8')).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('returns false for empty expression', () => {
      expect(evaluator.evaluate('')).toBe(false);
    });

    it('handles whitespace', () => {
      expect(evaluator.evaluate('  5  >  3  ')).toBe(true);
    });

    it('converts numbers to boolean', () => {
      expect(evaluator.evaluate('5')).toBe(true);  // Non-zero is truthy
      expect(evaluator.evaluate('0')).toBe(false); // Zero is falsy
    });
  });
});
