/**
 * Tests for Engineering Functions
 * Base Conversion: BIN2DEC, BIN2HEX, BIN2OCT, DEC2BIN, DEC2HEX, DEC2OCT,
 *                 HEX2BIN, HEX2DEC, HEX2OCT, OCT2BIN, OCT2DEC, OCT2HEX
 * Bitwise Operations: BITAND, BITOR, BITXOR, BITLSHIFT, BITRSHIFT
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { FormulaEngine, FormulaContext, Worksheet } from '../../src';
import * as EngineeringFunctions from '../../src/functions/engineering/engineering-functions';

const {
  BIN2DEC, BIN2HEX, BIN2OCT,
  DEC2BIN, DEC2HEX, DEC2OCT,
  HEX2BIN, HEX2DEC, HEX2OCT,
  OCT2BIN, OCT2DEC, OCT2HEX,
  BITAND, BITOR, BITXOR, BITLSHIFT, BITRSHIFT,
  COMPLEX, IMREAL, IMAGINARY, IMABS, IMARGUMENT, IMCONJUGATE,
} = EngineeringFunctions;

// Helper for evaluating formulas with engine
let engine: FormulaEngine;
let worksheet: Worksheet;
let context: FormulaContext;
let evaluate: (formula: string) => any;

beforeEach(() => {
  engine = new FormulaEngine();
  worksheet = new Worksheet('Sheet1', 100, 26);
  context = {
    worksheet,
    currentCell: { row: 0, col: 0 },
    namedLambdas: new Map()
  } as FormulaContext;
  evaluate = (formula: string) => engine.evaluate(formula, context);
});

describe('Engineering Base Conversion Functions', () => {
  // ========================================================================
  // BINARY CONVERSIONS
  // ========================================================================
  
  describe('BIN2DEC', () => {
    test('should convert simple binary to decimal', () => {
      expect(BIN2DEC('1010')).toBe(10);
      expect(BIN2DEC('1111')).toBe(15);
      expect(BIN2DEC('1')).toBe(1);
      expect(BIN2DEC('0')).toBe(0);
    });

    test('should convert 8-bit binary to decimal', () => {
      expect(BIN2DEC('11111111')).toBe(255);
      expect(BIN2DEC('10101010')).toBe(170);
      expect(BIN2DEC('00001111')).toBe(15);
    });

    test('should handle negative numbers (twos complement)', () => {
      expect(BIN2DEC('1111111111')).toBe(-1); // 10-bit two's complement
      expect(BIN2DEC('1111111110')).toBe(-2);
      expect(BIN2DEC('1000000000')).toBe(-512); // Most negative
    });

    test('should return #NUM! for invalid binary', () => {
      const result = BIN2DEC('102'); // Contains 2
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('should return #NUM! for binary longer than 10 digits', () => {
      const result = BIN2DEC('11111111111'); // 11 digits
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('should handle leading zeros', () => {
      expect(BIN2DEC('0001010')).toBe(10);
    });
  });

  describe('BIN2HEX', () => {
    test('should convert binary to hexadecimal', () => {
      expect(BIN2HEX('1010')).toBe('A');
      expect(BIN2HEX('1111')).toBe('F');
      expect(BIN2HEX('11111111')).toBe('FF');
    });

    test('should pad with zeros when places specified', () => {
      expect(BIN2HEX('1010', 4)).toBe('000A');
      expect(BIN2HEX('1111', 2)).toBe('0F');
    });

    test('should return #NUM! if result doesnt fit in places', () => {
      const result = BIN2HEX('11111111', 1); // FF cant fit in 1 place
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });
  });

  describe('BIN2OCT', () => {
    test('should convert binary to octal', () => {
      expect(BIN2OCT('1010')).toBe('12');
      expect(BIN2OCT('1111')).toBe('17');
      expect(BIN2OCT('11111111')).toBe('377');
    });

    test('should pad with zeros when places specified', () => {
      expect(BIN2OCT('1010', 4)).toBe('0012');
    });
  });

  // ========================================================================
  // DECIMAL CONVERSIONS
  // ========================================================================

  describe('DEC2BIN', () => {
    test('should convert decimal to binary', () => {
      expect(DEC2BIN(10)).toBe('1010');
      expect(DEC2BIN(15)).toBe('1111');
      expect(DEC2BIN(255)).toBe('11111111');
      expect(DEC2BIN(0)).toBe('0');
    });

    test('should convert negative numbers (twos complement)', () => {
      expect(DEC2BIN(-1)).toBe('1111111111'); // 10-bit two's complement
      expect(DEC2BIN(-2)).toBe('1111111110');
      expect(DEC2BIN(-512)).toBe('1000000000'); // Most negative
    });

    test('should pad with zeros when places specified', () => {
      expect(DEC2BIN(10, 8)).toBe('00001010');
      expect(DEC2BIN(1, 4)).toBe('0001');
    });

    test('should return #NUM! for out of range', () => {
      expect(DEC2BIN(512)).toBeInstanceOf(Error); // Max is 511
      expect(DEC2BIN(-513)).toBeInstanceOf(Error); // Min is -512
    });

    test('should return #NUM! for non-integer', () => {
      const result = DEC2BIN(10.5);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('should return #VALUE! for non-numeric', () => {
      const result = DEC2BIN('text' as any);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('should return #NUM! if result doesnt fit in places', () => {
      const result = DEC2BIN(255, 4); // 11111111 cant fit in 4 places
      expect(result).toBeInstanceOf(Error);
    });
  });

  describe('DEC2HEX', () => {
    test('should convert decimal to hexadecimal', () => {
      expect(DEC2HEX(10)).toBe('A');
      expect(DEC2HEX(255)).toBe('FF');
      expect(DEC2HEX(4095)).toBe('FFF');
    });

    test('should convert negative numbers (twos complement)', () => {
      expect(DEC2HEX(-1)).toBe('FFFFFFFFFF'); // 40-bit two's complement
      expect(DEC2HEX(-2)).toBe('FFFFFFFFFE');
    });

    test('should pad with zeros when places specified', () => {
      expect(DEC2HEX(255, 4)).toBe('00FF');
      expect(DEC2HEX(10, 4)).toBe('000A');
    });

    test('should return uppercase letters', () => {
      expect(DEC2HEX(171)).toBe('AB'); // Not 'ab'
    });
  });

  describe('DEC2OCT', () => {
    test('should convert decimal to octal', () => {
      expect(DEC2OCT(8)).toBe('10');
      expect(DEC2OCT(10)).toBe('12');
      expect(DEC2OCT(255)).toBe('377');
    });

    test('should convert negative numbers (twos complement)', () => {
      expect(DEC2OCT(-1)).toBe('7777777777'); // 30-bit two's complement
      expect(DEC2OCT(-2)).toBe('7777777776');
    });

    test('should pad with zeros when places specified', () => {
      expect(DEC2OCT(8, 4)).toBe('0010');
    });
  });

  // ========================================================================
  // HEXADECIMAL CONVERSIONS
  // ========================================================================

  describe('HEX2DEC', () => {
    test('should convert hexadecimal to decimal', () => {
      expect(HEX2DEC('A')).toBe(10);
      expect(HEX2DEC('FF')).toBe(255);
      expect(HEX2DEC('FFF')).toBe(4095);
      expect(HEX2DEC('0')).toBe(0);
    });

    test('should handle lowercase input', () => {
      expect(HEX2DEC('a')).toBe(10);
      expect(HEX2DEC('ff')).toBe(255);
    });

    test('should handle negative numbers (twos complement)', () => {
      expect(HEX2DEC('FFFFFFFFFF')).toBe(-1); // 40-bit two's complement
      expect(HEX2DEC('FFFFFFFFFE')).toBe(-2);
    });

    test('should return #NUM! for invalid hex', () => {
      const result = HEX2DEC('G1'); // G is not valid hex
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('should return #NUM! for hex longer than 10 characters', () => {
      const result = HEX2DEC('12345678901'); // 11 characters
      expect(result).toBeInstanceOf(Error);
    });
  });

  describe('HEX2BIN', () => {
    test('should convert hexadecimal to binary', () => {
      expect(HEX2BIN('A')).toBe('1010');
      expect(HEX2BIN('F')).toBe('1111');
      expect(HEX2BIN('FF')).toBe('11111111');
    });

    test('should pad with zeros when places specified', () => {
      expect(HEX2BIN('A', 8)).toBe('00001010');
    });

    test('should return #NUM! if value out of binary range', () => {
      const result = HEX2BIN('FFF'); // 4095 > 511 (max for binary)
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });
  });

  describe('HEX2OCT', () => {
    test('should convert hexadecimal to octal', () => {
      expect(HEX2OCT('A')).toBe('12');
      expect(HEX2OCT('FF')).toBe('377');
    });

    test('should pad with zeros when places specified', () => {
      expect(HEX2OCT('A', 4)).toBe('0012');
    });
  });

  // ========================================================================
  // OCTAL CONVERSIONS
  // ========================================================================

  describe('OCT2DEC', () => {
    test('should convert octal to decimal', () => {
      expect(OCT2DEC('12')).toBe(10);
      expect(OCT2DEC('377')).toBe(255);
      expect(OCT2DEC('10')).toBe(8);
      expect(OCT2DEC('0')).toBe(0);
    });

    test('should handle negative numbers (twos complement)', () => {
      expect(OCT2DEC('7777777777')).toBe(-1); // 30-bit two's complement
      expect(OCT2DEC('7777777776')).toBe(-2);
    });

    test('should return #NUM! for invalid octal', () => {
      const result = OCT2DEC('89'); // 8 and 9 are not valid octal
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('should return #NUM! for octal longer than 10 characters', () => {
      const result = OCT2DEC('12345678901'); // 11 characters
      expect(result).toBeInstanceOf(Error);
    });
  });

  describe('OCT2BIN', () => {
    test('should convert octal to binary', () => {
      expect(OCT2BIN('12')).toBe('1010');
      expect(OCT2BIN('377')).toBe('11111111');
    });

    test('should pad with zeros when places specified', () => {
      expect(OCT2BIN('12', 8)).toBe('00001010');
    });

    test('should return #NUM! if value out of binary range', () => {
      const result = OCT2BIN('777'); // 511 decimal, but 777 octal = 511 decimal which is OK
      expect(result).toBe('111111111'); // This should work (511 = 111111111 binary)
      
      const result2 = OCT2BIN('1000'); // 512 decimal > 511 max
      expect(result2).toBeInstanceOf(Error);
    });
  });

  describe('OCT2HEX', () => {
    test('should convert octal to hexadecimal', () => {
      expect(OCT2HEX('12')).toBe('A');
      expect(OCT2HEX('377')).toBe('FF');
    });

    test('should pad with zeros when places specified', () => {
      expect(OCT2HEX('12', 4)).toBe('000A');
    });
  });

  // ========================================================================
  // INTEGRATION TESTS
  // ========================================================================

  describe('Round-trip conversions', () => {
    test('DEC -> BIN -> DEC should be identity', () => {
      expect(BIN2DEC(DEC2BIN(10) as string)).toBe(10);
      expect(BIN2DEC(DEC2BIN(255) as string)).toBe(255);
      expect(BIN2DEC(DEC2BIN(-1) as string)).toBe(-1);
    });

    test('DEC -> HEX -> DEC should be identity', () => {
      expect(HEX2DEC(DEC2HEX(255) as string)).toBe(255);
      expect(HEX2DEC(DEC2HEX(4095) as string)).toBe(4095);
      expect(HEX2DEC(DEC2HEX(-1) as string)).toBe(-1);
    });

    test('DEC -> OCT -> DEC should be identity', () => {
      expect(OCT2DEC(DEC2OCT(10) as string)).toBe(10);
      expect(OCT2DEC(DEC2OCT(255) as string)).toBe(255);
      expect(OCT2DEC(DEC2OCT(-1) as string)).toBe(-1);
    });

    test('BIN -> HEX -> BIN should be identity (within range)', () => {
      const bin = '1010';
      const hex = BIN2HEX(bin) as string;
      const binBack = HEX2BIN(hex) as string;
      expect(binBack).toBe(bin);
    });

    test('HEX -> OCT -> HEX should be identity', () => {
      const hex = 'FF';
      const oct = HEX2OCT(hex) as string;
      const hexBack = OCT2HEX(oct) as string;
      expect(hexBack).toBe(hex);
    });
  });

  describe('Cross-conversion consistency', () => {
    test('all paths from 10 decimal should match', () => {
      expect(BIN2DEC('1010')).toBe(10);
      expect(HEX2DEC('A')).toBe(10);
      expect(OCT2DEC('12')).toBe(10);
    });

    test('all paths to binary 1010 should match', () => {
      expect(DEC2BIN(10)).toBe('1010');
      expect(HEX2BIN('A')).toBe('1010');
      expect(OCT2BIN('12')).toBe('1010');
    });

    test('all paths to hex A should match', () => {
      expect(DEC2HEX(10)).toBe('A');
      expect(BIN2HEX('1010')).toBe('A');
      expect(OCT2HEX('12')).toBe('A');
    });

    test('all paths to octal 12 should match', () => {
      expect(DEC2OCT(10)).toBe('12');
      expect(BIN2OCT('1010')).toBe('12');
      expect(HEX2OCT('A')).toBe('12');
    });
  });
});

// ============================================================================
// BITWISE OPERATIONS TESTS (Week 10 Day 4)
// ============================================================================

describe('Bitwise Engineering Functions', () => {
  describe('BITAND', () => {
    test('should perform bitwise AND on simple numbers', () => {
      const result = evaluate('=BITAND(5, 3)');
      expect(result).toBe(1); // 101 AND 011 = 001
    });

    test('should perform bitwise AND on larger numbers', () => {
      const result = evaluate('=BITAND(13, 25)');
      expect(result).toBe(9); // 1101 AND 11001 = 01001
    });

    test('should handle zero', () => {
      expect(evaluate('=BITAND(0, 0)')).toBe(0);
      expect(evaluate('=BITAND(15, 0)')).toBe(0);
      expect(evaluate('=BITAND(0, 15)')).toBe(0);
    });

    test('should handle same numbers', () => {
      const result = evaluate('=BITAND(42, 42)');
      expect(result).toBe(42);
    });

    test('should return #NUM! for negative numbers', () => {
      const result = evaluate('=BITAND(-1, 5)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('should return #NUM! for non-integer', () => {
      const result = evaluate('=BITAND(5.5, 3)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('should return #NUM! for numbers exceeding 2^48-1', () => {
      const MAX = Math.pow(2, 48);
      const result = evaluate(`=BITAND(${MAX}, 1)`);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('should work with large safe numbers', () => {
      const result = evaluate('=BITAND(1000000, 500000)');
      expect(result).toBe(1000000 & 500000);
    });
  });

  describe('BITOR', () => {
    test('should perform bitwise OR on simple numbers', () => {
      const result = evaluate('=BITOR(5, 3)');
      expect(result).toBe(7); // 101 OR 011 = 111
    });

    test('should perform bitwise OR on larger numbers', () => {
      const result = evaluate('=BITOR(13, 25)');
      expect(result).toBe(29); // 01101 OR 11001 = 11101
    });

    test('should handle zero', () => {
      expect(evaluate('=BITOR(0, 0)')).toBe(0);
      expect(evaluate('=BITOR(15, 0)')).toBe(15);
      expect(evaluate('=BITOR(0, 15)')).toBe(15);
    });

    test('should handle same numbers', () => {
      const result = evaluate('=BITOR(42, 42)');
      expect(result).toBe(42);
    });

    test('should return #NUM! for negative numbers', () => {
      const result = evaluate('=BITOR(-1, 5)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('should return #NUM! for non-integer', () => {
      const result = evaluate('=BITOR(5.5, 3)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('should work with large safe numbers', () => {
      const result = evaluate('=BITOR(1000000, 500000)');
      expect(result).toBe(1000000 | 500000);
    });
  });

  describe('BITXOR', () => {
    test('should perform bitwise XOR on simple numbers', () => {
      const result = evaluate('=BITXOR(5, 3)');
      expect(result).toBe(6); // 101 XOR 011 = 110
    });

    test('should perform bitwise XOR on larger numbers', () => {
      const result = evaluate('=BITXOR(13, 25)');
      expect(result).toBe(20); // 01101 XOR 11001 = 10100
    });

    test('should handle zero', () => {
      expect(evaluate('=BITXOR(0, 0)')).toBe(0);
      expect(evaluate('=BITXOR(15, 0)')).toBe(15);
      expect(evaluate('=BITXOR(0, 15)')).toBe(15);
    });

    test('should handle same numbers (result is 0)', () => {
      const result = evaluate('=BITXOR(42, 42)');
      expect(result).toBe(0);
    });

    test('should return #NUM! for negative numbers', () => {
      const result = evaluate('=BITXOR(-1, 5)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('should return #NUM! for non-integer', () => {
      const result = evaluate('=BITXOR(5.5, 3)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('should work with large safe numbers', () => {
      const result = evaluate('=BITXOR(1000000, 500000)');
      expect(result).toBe(1000000 ^ 500000);
    });

    test('XOR twice should return original', () => {
      // XOR is its own inverse: (A XOR B) XOR B = A
      const result1 = evaluate('=BITXOR(42, 17)');
      const result2 = evaluate(`=BITXOR(${result1}, 17)`);
      expect(result2).toBe(42);
    });
  });

  describe('BITLSHIFT', () => {
    test('should shift left by specified bits', () => {
      const result = evaluate('=BITLSHIFT(5, 2)');
      expect(result).toBe(20); // 101 << 2 = 10100
    });

    test('should shift left by 4 bits', () => {
      const result = evaluate('=BITLSHIFT(3, 4)');
      expect(result).toBe(48); // 11 << 4 = 110000
    });

    test('should handle zero shift', () => {
      const result = evaluate('=BITLSHIFT(42, 0)');
      expect(result).toBe(42);
    });

    test('should handle zero value', () => {
      const result = evaluate('=BITLSHIFT(0, 5)');
      expect(result).toBe(0);
    });

    test('should multiply by powers of 2', () => {
      // Left shift by N is equivalent to multiply by 2^N
      expect(evaluate('=BITLSHIFT(7, 1)')).toBe(14); // 7 * 2
      expect(evaluate('=BITLSHIFT(7, 2)')).toBe(28); // 7 * 4
      expect(evaluate('=BITLSHIFT(7, 3)')).toBe(56); // 7 * 8
    });

    test('should return #NUM! for negative number', () => {
      const result = evaluate('=BITLSHIFT(-5, 2)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('should return #NUM! for non-integer', () => {
      const result = evaluate('=BITLSHIFT(5.5, 2)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('should return #NUM! if result exceeds 2^48-1', () => {
      const result = evaluate('=BITLSHIFT(1000000000000, 10)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('negative shift should perform right shift', () => {
      const result = evaluate('=BITLSHIFT(20, -2)');
      expect(result).toBe(5); // Same as BITRSHIFT(20, 2)
    });
  });

  describe('BITRSHIFT', () => {
    test('should shift right by specified bits', () => {
      const result = evaluate('=BITRSHIFT(20, 2)');
      expect(result).toBe(5); // 10100 >> 2 = 101
    });

    test('should shift right by 4 bits', () => {
      const result = evaluate('=BITRSHIFT(48, 4)');
      expect(result).toBe(3); // 110000 >> 4 = 11
    });

    test('should handle zero shift', () => {
      const result = evaluate('=BITRSHIFT(42, 0)');
      expect(result).toBe(42);
    });

    test('should handle zero value', () => {
      const result = evaluate('=BITRSHIFT(0, 5)');
      expect(result).toBe(0);
    });

    test('should divide by powers of 2 (integer division)', () => {
      // Right shift by N is equivalent to integer division by 2^N
      expect(evaluate('=BITRSHIFT(14, 1)')).toBe(7); // 14 / 2
      expect(evaluate('=BITRSHIFT(28, 2)')).toBe(7); // 28 / 4
      expect(evaluate('=BITRSHIFT(56, 3)')).toBe(7); // 56 / 8
    });

    test('should return #NUM! for negative number', () => {
      const result = evaluate('=BITRSHIFT(-5, 2)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('should return #NUM! for non-integer', () => {
      const result = evaluate('=BITRSHIFT(5.5, 2)');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('large shift should return 0', () => {
      const result = evaluate('=BITRSHIFT(42, 100)');
      expect(result).toBe(0);
    });

    test('negative shift should perform left shift', () => {
      const result = evaluate('=BITRSHIFT(5, -2)');
      expect(result).toBe(20); // Same as BITLSHIFT(5, 2)
    });
  });

  describe('Bitwise integration tests', () => {
    test('BITAND and BITOR relationship', () => {
      // For any A and B: (A AND B) OR (A XOR B) = A OR B
      const a = 13;
      const b = 25;
      const andResult = evaluate(`=BITAND(${a}, ${b})`);
      const xorResult = evaluate(`=BITXOR(${a}, ${b})`);
      const orFromParts = evaluate(`=BITOR(${andResult}, ${xorResult})`);
      const orDirect = evaluate(`=BITOR(${a}, ${b})`);
      expect(orFromParts).toBe(orDirect);
    });

    test('shift operations are inverse', () => {
      // Left shift then right shift should return original (if no overflow)
      const original = 42;
      const shifted = evaluate(`=BITLSHIFT(${original}, 3)`);
      const restored = evaluate(`=BITRSHIFT(${shifted}, 3)`);
      expect(restored).toBe(original);
    });

    test('XOR with all 1s is equivalent to NOT', () => {
      // In 8-bit space: A XOR 255 = NOT A
      const a = 42;
      const mask = 255;
      const result = evaluate(`=BITXOR(${a}, ${mask})`);
      expect(result).toBe(213); // ~42 in 8-bit = 213
    });

    test('combining operations', () => {
      // (A AND B) OR (A AND NOT B) = A
      // Using 8-bit mask for NOT
      const a = 42;
      const b = 17;
      const mask = 255;
      
      const andB = evaluate(`=BITAND(${a}, ${b})`);
      const notB = evaluate(`=BITXOR(${b}, ${mask})`);
      const andNotB = evaluate(`=BITAND(${a}, ${notB})`);
      const result = evaluate(`=BITOR(${andB}, ${andNotB})`);
      
      // Result should be A masked to 8 bits
      expect(result).toBe(a);
    });

    test('shift and AND for masking', () => {
      // Extract specific bits using shift and AND
      const value = 0b11010110; // 214
      
      // Extract bits 2-4 (shift right by 2, then AND with 7)
      const shifted = evaluate(`=BITRSHIFT(${value}, 2)`);
      const masked = evaluate(`=BITAND(${shifted}, 7)`);
      
      expect(masked).toBe(5); // bits 2-4 are 101 = 5
    });
  });
});

// ============================================================================
// COMPLEX NUMBER FUNCTIONS TESTS (Week 10 Day 5)
// ============================================================================

describe('Complex Number Engineering Functions', () => {
  describe('COMPLEX', () => {
    test('should create complex number from real and imaginary parts', () => {
      expect(COMPLEX(3, 4)).toBe('3+4i');
    });

    test('should handle negative imaginary part', () => {
      expect(COMPLEX(3, -4)).toBe('3-4i');
    });

    test('should handle pure real number', () => {
      expect(COMPLEX(5, 0)).toBe('5');
    });

    test('should handle pure imaginary number', () => {
      expect(COMPLEX(0, 3)).toBe('3i');
    });

    test('should handle imaginary coefficient of 1', () => {
      expect(COMPLEX(3, 1)).toBe('3+i');
    });

    test('should handle imaginary coefficient of -1', () => {
      expect(COMPLEX(3, -1)).toBe('3-i');
    });

    test('should handle zero', () => {
      expect(COMPLEX(0, 0)).toBe('0');
    });

    test('should support "j" suffix', () => {
      expect(COMPLEX(3, 4, 'j')).toBe('3+4j');
    });

    test('should default to "i" suffix', () => {
      expect(COMPLEX(3, 4)).toBe('3+4i');
    });

    test('should return #VALUE! for invalid suffix', () => {
      const result = COMPLEX(3, 4, 'k');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('should return #VALUE! for non-numeric inputs', () => {
      const result = COMPLEX('abc', 4);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#VALUE!');
    });

    test('should handle decimal values', () => {
      expect(COMPLEX(3.5, 4.7)).toBe('3.5+4.7i');
    });
  });

  describe('IMREAL', () => {
    test('should extract real part from complex number', () => {
      expect(IMREAL('3+4i')).toBe(3);
    });

    test('should extract real part with negative imaginary', () => {
      expect(IMREAL('5-2i')).toBe(5);
    });

    test('should handle pure real number', () => {
      expect(IMREAL('7')).toBe(7);
    });

    test('should return 0 for pure imaginary', () => {
      expect(IMREAL('2i')).toBe(0);
      expect(IMREAL('i')).toBe(0);
    });

    test('should handle "j" suffix', () => {
      expect(IMREAL('3+4j')).toBe(3);
    });

    test('should handle negative real part', () => {
      expect(IMREAL('-3+4i')).toBe(-3);
    });

    test('should return #NUM! for invalid format', () => {
      const result = IMREAL('invalid');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('should handle decimal values', () => {
      expect(IMREAL('3.5+4.7i')).toBe(3.5);
    });
  });

  describe('IMAGINARY', () => {
    test('should extract imaginary part from complex number', () => {
      expect(IMAGINARY('3+4i')).toBe(4);
    });

    test('should extract negative imaginary part', () => {
      expect(IMAGINARY('5-2i')).toBe(-2);
    });

    test('should return 0 for pure real number', () => {
      expect(IMAGINARY('7')).toBe(0);
    });

    test('should handle pure imaginary', () => {
      expect(IMAGINARY('2i')).toBe(2);
      expect(IMAGINARY('i')).toBe(1);
      expect(IMAGINARY('-i')).toBe(-1);
    });

    test('should handle "j" suffix', () => {
      expect(IMAGINARY('3+4j')).toBe(4);
    });

    test('should handle negative values', () => {
      expect(IMAGINARY('-3-4i')).toBe(-4);
    });

    test('should return #NUM! for invalid format', () => {
      const result = IMAGINARY('invalid');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('should handle decimal values', () => {
      expect(IMAGINARY('3.5+4.7i')).toBe(4.7);
    });
  });

  describe('IMABS', () => {
    test('should calculate magnitude of complex number', () => {
      const result = IMABS('3+4i');
      expect(result).toBe(5); // 3-4-5 triangle
    });

    test('should calculate magnitude with 1+i', () => {
      const result = IMABS('1+i');
      expect(result).toBeCloseTo(Math.sqrt(2), 10);
    });

    test('should handle pure real number', () => {
      expect(IMABS('5')).toBe(5);
    });

    test('should handle pure imaginary', () => {
      expect(IMABS('3i')).toBe(3);
    });

    test('should handle negative values', () => {
      const result = IMABS('-3-4i');
      expect(result).toBe(5);
    });

    test('should return 0 for zero', () => {
      expect(IMABS('0')).toBe(0);
    });

    test('should handle "j" suffix', () => {
      expect(IMABS('3+4j')).toBe(5);
    });

    test('should return #NUM! for invalid format', () => {
      const result = IMABS('invalid');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('should handle decimal values', () => {
      const result = IMABS('6+8i');
      expect(result).toBe(10);
    });
  });

  describe('IMARGUMENT', () => {
    test('should calculate argument of 1+i (π/4)', () => {
      const result = IMARGUMENT('1+i');
      expect(result).toBeCloseTo(Math.PI / 4, 10);
    });

    test('should return 0 for positive real number', () => {
      expect(IMARGUMENT('5')).toBe(0);
    });

    test('should return π/2 for positive imaginary', () => {
      const result = IMARGUMENT('i');
      expect(result).toBeCloseTo(Math.PI / 2, 10);
    });

    test('should return π for negative real number', () => {
      const result = IMARGUMENT('-1');
      expect(result).toBeCloseTo(Math.PI, 10);
    });

    test('should return -π/2 for negative imaginary', () => {
      const result = IMARGUMENT('-i');
      expect(result).toBeCloseTo(-Math.PI / 2, 10);
    });

    test('should handle complex in quadrant 1', () => {
      const result = IMARGUMENT('1+1i');
      expect(result).toBeCloseTo(Math.PI / 4, 10);
    });

    test('should handle complex in quadrant 2', () => {
      const result = IMARGUMENT('-1+1i');
      expect(result).toBeCloseTo(3 * Math.PI / 4, 10);
    });

    test('should handle complex in quadrant 3', () => {
      const result = IMARGUMENT('-1-1i');
      expect(result).toBeCloseTo(-3 * Math.PI / 4, 10);
    });

    test('should handle complex in quadrant 4', () => {
      const result = IMARGUMENT('1-1i');
      expect(result).toBeCloseTo(-Math.PI / 4, 10);
    });

    test('should handle "j" suffix', () => {
      const result = IMARGUMENT('1+1j');
      expect(result).toBeCloseTo(Math.PI / 4, 10);
    });

    test('should return #NUM! for invalid format', () => {
      const result = IMARGUMENT('invalid');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });
  });

  describe('IMCONJUGATE', () => {
    test('should calculate conjugate of complex number', () => {
      expect(IMCONJUGATE('3+4i')).toBe('3-4i');
    });

    test('should calculate conjugate with negative imaginary', () => {
      expect(IMCONJUGATE('5-2i')).toBe('5+2i');
    });

    test('should handle pure real number', () => {
      expect(IMCONJUGATE('7')).toBe('7');
    });

    test('should handle pure imaginary', () => {
      expect(IMCONJUGATE('2i')).toBe('-2i');
      expect(IMCONJUGATE('i')).toBe('-i');
    });

    test('should preserve suffix type', () => {
      expect(IMCONJUGATE('3+4j')).toBe('3-4j');
      expect(IMCONJUGATE('3+4i')).toBe('3-4i');
    });

    test('should handle negative real part', () => {
      expect(IMCONJUGATE('-3+4i')).toBe('-3-4i');
    });

    test('should handle both negative parts', () => {
      expect(IMCONJUGATE('-3-4i')).toBe('-3+4i');
    });

    test('should return #NUM! for invalid format', () => {
      const result = IMCONJUGATE('invalid');
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });

    test('should handle decimal values', () => {
      expect(IMCONJUGATE('3.5+4.7i')).toBe('3.5-4.7i');
    });
  });

  describe('Complex number integration tests', () => {
    test('COMPLEX then IMREAL/IMAGINARY should extract parts', () => {
      const complex = COMPLEX(3, 4);
      expect(IMREAL(complex as string)).toBe(3);
      expect(IMAGINARY(complex as string)).toBe(4);
    });

    test('magnitude of conjugate equals magnitude of original', () => {
      const original = '3+4i';
      const conjugate = IMCONJUGATE(original);
      expect(IMABS(original)).toBe(IMABS(conjugate as string));
    });

    test('argument of conjugate is negative of original', () => {
      const original = '3+4i';
      const conjugate = IMCONJUGATE(original) as string;
      const argOriginal = IMARGUMENT(original) as number;
      const argConjugate = IMARGUMENT(conjugate) as number;
      expect(argConjugate).toBeCloseTo(-argOriginal, 10);
    });

    test('double conjugate returns original', () => {
      const original = '3+4i';
      const conj1 = IMCONJUGATE(original) as string;
      const conj2 = IMCONJUGATE(conj1);
      expect(conj2).toBe(original);
    });

    test('Pythagorean theorem: 3-4-5 triangle', () => {
      const complex = '3+4i';
      const real = IMREAL(complex) as number;
      const imag = IMAGINARY(complex) as number;
      const magnitude = IMABS(complex) as number;
      
      expect(Math.sqrt(real * real + imag * imag)).toBe(magnitude);
      expect(magnitude).toBe(5);
    });

    test('argument and magnitude conversion', () => {
      // For 1+i: magnitude = √2, argument = π/4
      const complex = '1+i';
      const mag = IMABS(complex) as number;
      const arg = IMARGUMENT(complex) as number;
      
      // Verify: real = mag * cos(arg), imag = mag * sin(arg)
      const real = mag * Math.cos(arg);
      const imag = mag * Math.sin(arg);
      
      expect(real).toBeCloseTo(1, 10);
      expect(imag).toBeCloseTo(1, 10);
    });

    test('all formats parse correctly', () => {
      expect(IMREAL('3+4i')).toBe(3);
      expect(IMREAL('3+4j')).toBe(3);
      expect(IMREAL('3-4i')).toBe(3);
      expect(IMREAL('-3+4i')).toBe(-3);
      expect(IMREAL('-3-4i')).toBe(-3);
    });
  });
});
