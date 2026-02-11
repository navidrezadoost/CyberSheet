/**
 * Parser module tests
 * Testing ReferenceParser, TokenParser, and ExpressionParser
 */

import { describe, it, expect } from '@jest/globals';
import {
  parseCellReference,
  parseRangeReference,
  isCellReference,
  isRangeReference,
  addressToCellRef,
  getRangeCells,
  getRangeDimensions,
} from '../src/parser/ReferenceParser';
import {
  splitByOperator,
  parseRawArguments,
  parseFunctionCall,
  parseStringLiteral,
  parseNumberLiteral,
  parseBooleanLiteral,
  findMatchingParen,
  isValidIdentifier,
} from '../src/parser/TokenParser';
import {
  parseLiteral,
  isLiteral,
  validateExpression,
  splitByTopLevelOperator,
  getOperatorPrecedence,
} from '../src/parser/ExpressionParser';

describe('ReferenceParser', () => {
  describe('isCellReference', () => {
    it('should identify valid cell references', () => {
      expect(isCellReference('A1')).toBe(true);
      expect(isCellReference('Z100')).toBe(true);
      expect(isCellReference('AA10')).toBe(true);
      expect(isCellReference('XFD1048576')).toBe(true);
    });

    it('should reject invalid cell references', () => {
      expect(isCellReference('A')).toBe(false);
      expect(isCellReference('1A')).toBe(false);
      expect(isCellReference('A1:B2')).toBe(false);
      expect(isCellReference('SUM(A1)')).toBe(false);
    });
  });

  describe('parseCellReference', () => {
    it('should parse valid cell references', () => {
      expect(parseCellReference('A1')).toEqual({ row: 1, col: 1 });
      expect(parseCellReference('B2')).toEqual({ row: 2, col: 2 });
      expect(parseCellReference('Z26')).toEqual({ row: 26, col: 26 });
      expect(parseCellReference('AA1')).toEqual({ row: 1, col: 27 });
      expect(parseCellReference('AB1')).toEqual({ row: 1, col: 28 });
    });

    it('should return error for invalid references', () => {
      expect(parseCellReference('A0')).toBeInstanceOf(Error);
      expect(parseCellReference('0A')).toBeInstanceOf(Error);
      expect(parseCellReference('invalid')).toBeInstanceOf(Error);
    });
  });

  describe('addressToCellRef', () => {
    it('should convert address to cell reference', () => {
      expect(addressToCellRef({ row: 1, col: 1 })).toBe('A1');
      expect(addressToCellRef({ row: 2, col: 2 })).toBe('B2');
      expect(addressToCellRef({ row: 1, col: 27 })).toBe('AA1');
      expect(addressToCellRef({ row: 100, col: 26 })).toBe('Z100');
    });
  });

  describe('parseRangeReference', () => {
    it('should parse valid range references', () => {
      const result = parseRangeReference('A1:B2');
      expect(result).toEqual([
        { row: 1, col: 1 },
        { row: 2, col: 2 },
      ]);
    });

    it('should return error for invalid ranges', () => {
      expect(parseRangeReference('A1')).toBeInstanceOf(Error);
      expect(parseRangeReference('invalid')).toBeInstanceOf(Error);
    });
  });

  describe('getRangeCells', () => {
    it('should return all cells in range', () => {
      const cells = getRangeCells({ row: 1, col: 1 }, { row: 2, col: 2 });
      expect(cells).toHaveLength(4);
      expect(cells).toContainEqual({ row: 1, col: 1 });
      expect(cells).toContainEqual({ row: 1, col: 2 });
      expect(cells).toContainEqual({ row: 2, col: 1 });
      expect(cells).toContainEqual({ row: 2, col: 2 });
    });
  });

  describe('getRangeDimensions', () => {
    it('should return range dimensions', () => {
      expect(getRangeDimensions({ row: 1, col: 1 }, { row: 3, col: 5 })).toEqual([3, 5]);
      expect(getRangeDimensions({ row: 1, col: 1 }, { row: 1, col: 1 })).toEqual([1, 1]);
    });
  });
});

describe('TokenParser', () => {
  describe('splitByOperator', () => {
    it('should split by operator at depth 0', () => {
      expect(splitByOperator('1+2', '+')).toEqual(['1', '2']);
      expect(splitByOperator('1+2+3', '+')).toEqual(['1', '2', '3']);
      expect(splitByOperator('SUM(1,2)+3', '+')).toEqual(['SUM(1,2)', '3']);
    });

    it('should respect parentheses', () => {
      expect(splitByOperator('(1+2)*3', '+')).toEqual([]);
      expect(splitByOperator('(1+2)*3', '*')).toEqual(['(1+2)', '3']);
    });

    it('should respect strings', () => {
      expect(splitByOperator('"a+b"+1', '+')).toEqual(['"a+b"', '1']);
    });
  });

  describe('parseRawArguments', () => {
    it('should parse simple arguments', () => {
      expect(parseRawArguments('1,2,3')).toEqual(['1', '2', '3']);
      expect(parseRawArguments('A1,B2')).toEqual(['A1', 'B2']);
    });

    it('should handle nested functions', () => {
      expect(parseRawArguments('SUM(1,2),3')).toEqual(['SUM(1,2)', '3']);
      expect(parseRawArguments('IF(A1>0,1,2),B1')).toEqual(['IF(A1>0,1,2)', 'B1']);
    });

    it('should handle string literals', () => {
      expect(parseRawArguments('"hello",world')).toEqual(['"hello"', 'world']);
      expect(parseRawArguments('"a,b",c')).toEqual(['"a,b"', 'c']);
    });

    it('should handle empty arguments', () => {
      expect(parseRawArguments('')).toEqual([]);
      expect(parseRawArguments('   ')).toEqual([]);
    });
  });

  describe('parseFunctionCall', () => {
    it('should parse function calls', () => {
      expect(parseFunctionCall('SUM(1,2)')).toEqual(['SUM', '1,2']);
      expect(parseFunctionCall('AVERAGE(A1:A10)')).toEqual(['AVERAGE', 'A1:A10']);
      expect(parseFunctionCall('IF(A1>0,1,0)')).toEqual(['IF', 'A1>0,1,0']);
    });

    it('should return null for non-function expressions', () => {
      expect(parseFunctionCall('A1')).toBeNull();
      expect(parseFunctionCall('1+2')).toBeNull();
      expect(parseFunctionCall('"hello"')).toBeNull();
    });
  });

  describe('parseStringLiteral', () => {
    it('should parse string literals', () => {
      expect(parseStringLiteral('"hello"')).toBe('hello');
      expect(parseStringLiteral('"a""b"')).toBe('a"b'); // Escaped quote
    });

    it('should return unchanged if not a string literal', () => {
      expect(parseStringLiteral('hello')).toBe('hello');
    });
  });

  describe('parseNumberLiteral', () => {
    it('should parse numbers', () => {
      expect(parseNumberLiteral('123')).toBe(123);
      expect(parseNumberLiteral('123.45')).toBe(123.45);
      expect(parseNumberLiteral('-123')).toBe(-123);
      expect(parseNumberLiteral('1.23e5')).toBe(123000);
    });

    it('should return null for invalid numbers', () => {
      expect(parseNumberLiteral('abc')).toBeNull();
      expect(parseNumberLiteral('1.2.3')).toBeNull();
    });
  });

  describe('parseBooleanLiteral', () => {
    it('should parse booleans', () => {
      expect(parseBooleanLiteral('TRUE')).toBe(true);
      expect(parseBooleanLiteral('FALSE')).toBe(false);
      expect(parseBooleanLiteral('true')).toBe(true);
      expect(parseBooleanLiteral('false')).toBe(false);
    });

    it('should return null for non-booleans', () => {
      expect(parseBooleanLiteral('yes')).toBeNull();
      expect(parseBooleanLiteral('1')).toBeNull();
    });
  });

  describe('findMatchingParen', () => {
    it('should find matching parenthesis', () => {
      expect(findMatchingParen('(1+2)', 0)).toBe(4);
      expect(findMatchingParen('(1+(2+3))', 0)).toBe(8);
      expect(findMatchingParen('SUM((1+2),3)', 4)).toBe(8); // Index 4 is the '(' after 'SUM('
    });

    it('should return -1 if no match', () => {
      expect(findMatchingParen('(1+2', 0)).toBe(-1);
    });
  });

  describe('isValidIdentifier', () => {
    it('should validate identifiers', () => {
      expect(isValidIdentifier('x')).toBe(true);
      expect(isValidIdentifier('myVar')).toBe(true);
      expect(isValidIdentifier('_private')).toBe(true);
      expect(isValidIdentifier('var123')).toBe(true);
    });

    it('should reject invalid identifiers', () => {
      expect(isValidIdentifier('123var')).toBe(false);
      expect(isValidIdentifier('my-var')).toBe(false);
      expect(isValidIdentifier('my var')).toBe(false);
    });
  });
});

describe('ExpressionParser', () => {
  describe('parseLiteral', () => {
    it('should parse number literals', () => {
      expect(parseLiteral('123')).toBe(123);
      expect(parseLiteral('123.45')).toBe(123.45);
      expect(parseLiteral('-123')).toBe(-123);
    });

    it('should parse boolean literals', () => {
      expect(parseLiteral('TRUE')).toBe(true);
      expect(parseLiteral('FALSE')).toBe(false);
    });

    it('should parse string literals', () => {
      expect(parseLiteral('"hello"')).toBe('hello');
      expect(parseLiteral('"a""b"')).toBe('a"b');
    });

    it('should parse null', () => {
      expect(parseLiteral('NULL')).toBe(null);
      expect(parseLiteral('')).toBe(null);
    });

    it('should return null for non-literals', () => {
      expect(parseLiteral('A1')).toBe(null);
      expect(parseLiteral('SUM(1,2)')).toBe(null);
    });
  });

  describe('isLiteral', () => {
    it('should identify literals', () => {
      expect(isLiteral('123')).toBe(true);
      expect(isLiteral('TRUE')).toBe(true);
      expect(isLiteral('"hello"')).toBe(true);
      expect(isLiteral('NULL')).toBe(true);
    });

    it('should reject non-literals', () => {
      expect(isLiteral('A1')).toBe(false);
      expect(isLiteral('SUM(1,2)')).toBe(false);
    });
  });

  describe('validateExpression', () => {
    it('should validate correct expressions', () => {
      expect(validateExpression('1+2')).toBe(null);
      expect(validateExpression('SUM(1,2)')).toBe(null);
      expect(validateExpression('(1+2)*3')).toBe(null);
    });

    it('should detect unbalanced parentheses', () => {
      expect(validateExpression('(1+2')).toBeInstanceOf(Error);
      expect(validateExpression('1+2)')).toBeInstanceOf(Error);
      expect(validateExpression('((1+2)')).toBeInstanceOf(Error);
    });

    it('should detect unclosed strings', () => {
      expect(validateExpression('"hello')).toBeInstanceOf(Error);
    });
  });

  describe('splitByTopLevelOperator', () => {
    it('should split by lowest precedence operator', () => {
      expect(splitByTopLevelOperator('1+2*3')).toEqual(['1', '+', '2*3']);
      expect(splitByTopLevelOperator('1*2+3')).toEqual(['1*2', '+', '3']);
    });

    it('should handle associativity', () => {
      // Left-associative: 1+2+3 should be (1+2)+3
      const result = splitByTopLevelOperator('1+2+3');
      expect(result).toEqual(['1+2', '+', '3']);
    });

    it('should respect parentheses', () => {
      expect(splitByTopLevelOperator('(1+2)*3')).toEqual(['(1+2)', '*', '3']);
    });
  });

  describe('getOperatorPrecedence', () => {
    it('should return correct precedence', () => {
      expect(getOperatorPrecedence('^')).toBe(4);
      expect(getOperatorPrecedence('*')).toBe(3);
      expect(getOperatorPrecedence('/')).toBe(3);
      expect(getOperatorPrecedence('+')).toBe(2);
      expect(getOperatorPrecedence('-')).toBe(2);
      expect(getOperatorPrecedence('=')).toBe(1);
    });
  });
});
