/**
 * Engineering Functions - Base Conversion
 * Excel-compatible number system conversion functions
 * Supports Binary, Octal, Decimal, and Hexadecimal conversions
 */

import type { FormulaValue } from '../../types/formula-types';

// ============================================================================
// BINARY CONVERSIONS
// ============================================================================

/**
 * BIN2DEC - Converts a binary number to decimal
 * 
 * @param number - A binary number string (max 10 characters: 1 sign + 9 digits)
 * @returns Decimal number between -512 and 511
 * 
 * @example
 * BIN2DEC("1010") → 10
 * BIN2DEC("11111111") → 255
 * BIN2DEC("1111111111") → -1 (two's complement)
 */
export function BIN2DEC(number: any): FormulaValue {
  // Validate input type
  const binary = String(number).trim();
  
  // Check length (max 10 characters)
  if (binary.length > 10) {
    return new Error('#NUM!');
  }
  
  // Validate binary format (only 0 and 1)
  if (!/^[01]+$/.test(binary)) {
    return new Error('#NUM!');
  }
  
  // Check if negative (starts with 1 and is 10 digits - two's complement)
  if (binary.length === 10 && binary[0] === '1') {
    // Two's complement negative number
    // Convert to positive by inverting bits and adding 1
    const inverted = binary.split('').map(bit => bit === '0' ? '1' : '0').join('');
    const positive = parseInt(inverted, 2) + 1;
    return -positive;
  }
  
  // Positive number - direct conversion
  return parseInt(binary, 2);
}

/**
 * BIN2HEX - Converts a binary number to hexadecimal
 * 
 * @param number - A binary number string
 * @param places - (Optional) Number of characters to use (pads with zeros)
 * @returns Hexadecimal string
 * 
 * @example
 * BIN2DEC("1010") → "A"
 * BIN2HEX("1010", 4) → "000A"
 * BIN2HEX("11111111") → "FF"
 */
export function BIN2HEX(number: any, places?: any): FormulaValue {
  // First convert to decimal
  const decimal = BIN2DEC(number);
  if (decimal instanceof Error) return decimal;
  
  // Then convert decimal to hex
  return DEC2HEX(decimal, places);
}

/**
 * BIN2OCT - Converts a binary number to octal
 * 
 * @param number - A binary number string
 * @param places - (Optional) Number of characters to use
 * @returns Octal string
 * 
 * @example
 * BIN2OCT("1010") → "12"
 * BIN2OCT("1010", 4) → "0012"
 * BIN2OCT("11111111") → "377"
 */
export function BIN2OCT(number: any, places?: any): FormulaValue {
  // First convert to decimal
  const decimal = BIN2DEC(number);
  if (decimal instanceof Error) return decimal;
  
  // Then convert decimal to octal
  return DEC2OCT(decimal, places);
}

// ============================================================================
// DECIMAL CONVERSIONS
// ============================================================================

/**
 * DEC2BIN - Converts a decimal number to binary
 * 
 * @param number - Decimal number between -512 and 511
 * @param places - (Optional) Number of characters to use
 * @returns Binary string
 * 
 * @example
 * DEC2BIN(10) → "1010"
 * DEC2BIN(10, 8) → "00001010"
 * DEC2BIN(-1) → "1111111111" (two's complement)
 */
export function DEC2BIN(number: any, places?: any): FormulaValue {
  // Validate input
  if (typeof number !== 'number' || !isFinite(number)) {
    return new Error('#VALUE!');
  }
  
  // Check range (-512 to 511)
  if (number < -512 || number > 511) {
    return new Error('#NUM!');
  }
  
  // Check if integer
  if (!Number.isInteger(number)) {
    return new Error('#NUM!');
  }
  
  let binary: string;
  
  if (number >= 0) {
    // Positive number - direct conversion
    binary = number.toString(2);
  } else {
    // Negative number - two's complement (10 bits)
    const positive = Math.abs(number);
    const complement = (0b10000000000 - positive).toString(2);
    binary = complement;
  }
  
  // Handle places parameter
  if (places !== undefined) {
    const placesNum = typeof places === 'number' ? places : parseInt(String(places));
    if (!Number.isInteger(placesNum) || placesNum < 0) {
      return new Error('#NUM!');
    }
    
    if (binary.length > placesNum) {
      return new Error('#NUM!');
    }
    
    binary = binary.padStart(placesNum, '0');
  }
  
  return binary;
}

/**
 * DEC2HEX - Converts a decimal number to hexadecimal
 * 
 * @param number - Decimal number between -549,755,813,888 and 549,755,813,887
 * @param places - (Optional) Number of characters to use
 * @returns Hexadecimal string
 * 
 * @example
 * DEC2HEX(255) → "FF"
 * DEC2HEX(255, 4) → "00FF"
 * DEC2HEX(-1) → "FFFFFFFFFF" (two's complement)
 */
export function DEC2HEX(number: any, places?: any): FormulaValue {
  // Validate input
  if (typeof number !== 'number' || !isFinite(number)) {
    return new Error('#VALUE!');
  }
  
  // Check range (40-bit signed integer)
  const MAX = 549755813887; // 2^39 - 1
  const MIN = -549755813888; // -2^39
  
  if (number < MIN || number > MAX) {
    return new Error('#NUM!');
  }
  
  // Check if integer
  if (!Number.isInteger(number)) {
    return new Error('#NUM!');
  }
  
  let hex: string;
  
  if (number >= 0) {
    // Positive number
    hex = number.toString(16).toUpperCase();
  } else {
    // Negative number - two's complement (40 bits = 10 hex digits)
    const complement = (0x10000000000 + number).toString(16).toUpperCase();
    hex = complement;
  }
  
  // Handle places parameter
  if (places !== undefined) {
    const placesNum = typeof places === 'number' ? places : parseInt(String(places));
    if (!Number.isInteger(placesNum) || placesNum < 0) {
      return new Error('#NUM!');
    }
    
    if (hex.length > placesNum) {
      return new Error('#NUM!');
    }
    
    hex = hex.padStart(placesNum, '0');
  }
  
  return hex;
}

/**
 * DEC2OCT - Converts a decimal number to octal
 * 
 * @param number - Decimal number between -536,870,912 and 536,870,911
 * @param places - (Optional) Number of characters to use
 * @returns Octal string
 * 
 * @example
 * DEC2OCT(8) → "10"
 * DEC2OCT(8, 4) → "0010"
 * DEC2OCT(-1) → "7777777777" (two's complement)
 */
export function DEC2OCT(number: any, places?: any): FormulaValue {
  // Validate input
  if (typeof number !== 'number' || !isFinite(number)) {
    return new Error('#VALUE!');
  }
  
  // Check range (30-bit signed integer)
  const MAX = 536870911; // 2^29 - 1
  const MIN = -536870912; // -2^29
  
  if (number < MIN || number > MAX) {
    return new Error('#NUM!');
  }
  
  // Check if integer
  if (!Number.isInteger(number)) {
    return new Error('#NUM!');
  }
  
  let octal: string;
  
  if (number >= 0) {
    // Positive number
    octal = number.toString(8);
  } else {
    // Negative number - two's complement (30 bits = 10 octal digits)
    const complement = (0o10000000000 + number).toString(8);
    octal = complement;
  }
  
  // Handle places parameter
  if (places !== undefined) {
    const placesNum = typeof places === 'number' ? places : parseInt(String(places));
    if (!Number.isInteger(placesNum) || placesNum < 0) {
      return new Error('#NUM!');
    }
    
    if (octal.length > placesNum) {
      return new Error('#NUM!');
    }
    
    octal = octal.padStart(placesNum, '0');
  }
  
  return octal;
}

// ============================================================================
// HEXADECIMAL CONVERSIONS
// ============================================================================

/**
 * HEX2DEC - Converts a hexadecimal number to decimal
 * 
 * @param number - A hexadecimal number string (max 10 characters)
 * @returns Decimal number
 * 
 * @example
 * HEX2DEC("A") → 10
 * HEX2DEC("FF") → 255
 * HEX2DEC("FFFFFFFFFF") → -1 (two's complement)
 */
export function HEX2DEC(number: any): FormulaValue {
  // Validate input type
  const hex = String(number).trim().toUpperCase();
  
  // Check length (max 10 characters)
  if (hex.length > 10) {
    return new Error('#NUM!');
  }
  
  // Validate hexadecimal format
  if (!/^[0-9A-F]+$/.test(hex)) {
    return new Error('#NUM!');
  }
  
  // Check if negative (10 hex digits starting with 8-F - two's complement)
  if (hex.length === 10 && parseInt(hex[0], 16) >= 8) {
    // Two's complement negative number
    const value = parseInt(hex, 16);
    const MAX_40BIT = 0x10000000000;
    return value - MAX_40BIT;
  }
  
  // Positive number - direct conversion
  return parseInt(hex, 16);
}

/**
 * HEX2BIN - Converts a hexadecimal number to binary
 * 
 * @param number - A hexadecimal number string
 * @param places - (Optional) Number of characters to use
 * @returns Binary string
 * 
 * @example
 * HEX2BIN("A") → "1010"
 * HEX2BIN("A", 8) → "00001010"
 * HEX2BIN("FF") → "11111111"
 */
export function HEX2BIN(number: any, places?: any): FormulaValue {
  // First convert to decimal
  const decimal = HEX2DEC(number);
  if (decimal instanceof Error) return decimal;
  
  // Check if decimal is within binary range
  if (typeof decimal === 'number' && (decimal < -512 || decimal > 511)) {
    return new Error('#NUM!');
  }
  
  // Then convert decimal to binary
  return DEC2BIN(decimal, places);
}

/**
 * HEX2OCT - Converts a hexadecimal number to octal
 * 
 * @param number - A hexadecimal number string
 * @param places - (Optional) Number of characters to use
 * @returns Octal string
 * 
 * @example
 * HEX2OCT("A") → "12"
 * HEX2OCT("FF") → "377"
 */
export function HEX2OCT(number: any, places?: any): FormulaValue {
  // First convert to decimal
  const decimal = HEX2DEC(number);
  if (decimal instanceof Error) return decimal;
  
  // Then convert decimal to octal
  return DEC2OCT(decimal, places);
}

// ============================================================================
// OCTAL CONVERSIONS
// ============================================================================

/**
 * OCT2DEC - Converts an octal number to decimal
 * 
 * @param number - An octal number string (max 10 characters)
 * @returns Decimal number
 * 
 * @example
 * OCT2DEC("12") → 10
 * OCT2DEC("377") → 255
 * OCT2DEC("7777777777") → -1 (two's complement)
 */
export function OCT2DEC(number: any): FormulaValue {
  // Validate input type
  const octal = String(number).trim();
  
  // Check length (max 10 characters)
  if (octal.length > 10) {
    return new Error('#NUM!');
  }
  
  // Validate octal format (only 0-7)
  if (!/^[0-7]+$/.test(octal)) {
    return new Error('#NUM!');
  }
  
  // Check if negative (10 octal digits starting with 4-7 - two's complement)
  if (octal.length === 10 && parseInt(octal[0], 10) >= 4) {
    // Two's complement negative number
    const value = parseInt(octal, 8);
    const MAX_30BIT = 0o10000000000;
    return value - MAX_30BIT;
  }
  
  // Positive number - direct conversion
  return parseInt(octal, 8);
}

/**
 * OCT2BIN - Converts an octal number to binary
 * 
 * @param number - An octal number string
 * @param places - (Optional) Number of characters to use
 * @returns Binary string
 * 
 * @example
 * OCT2BIN("12") → "1010"
 * OCT2BIN("12", 8) → "00001010"
 * OCT2BIN("377") → "11111111"
 */
export function OCT2BIN(number: any, places?: any): FormulaValue {
  // First convert to decimal
  const decimal = OCT2DEC(number);
  if (decimal instanceof Error) return decimal;
  
  // Check if decimal is within binary range
  if (typeof decimal === 'number' && (decimal < -512 || decimal > 511)) {
    return new Error('#NUM!');
  }
  
  // Then convert decimal to binary
  return DEC2BIN(decimal, places);
}

/**
 * OCT2HEX - Converts an octal number to hexadecimal
 * 
 * @param number - An octal number string
 * @param places - (Optional) Number of characters to use
 * @returns Hexadecimal string
 * 
 * @example
 * OCT2HEX("12") → "A"
 * OCT2HEX("377") → "FF"
 */
export function OCT2HEX(number: any, places?: any): FormulaValue {
  // First convert to decimal
  const decimal = OCT2DEC(number);
  if (decimal instanceof Error) return decimal;
  
  // Then convert decimal to hex
  return DEC2HEX(decimal, places);
}

// ============================================================================
// BITWISE OPERATIONS
// ============================================================================

/**
 * BITAND - Bitwise AND operation
 * 
 * @param number1 - First number (must be >= 0 and < 2^48)
 * @param number2 - Second number (must be >= 0 and < 2^48)
 * @returns Result of bitwise AND operation
 * 
 * @example
 * BITAND(5, 3) → 1 (binary: 101 AND 011 = 001)
 * BITAND(13, 25) → 9 (binary: 1101 AND 11001 = 01001)
 */
export function BITAND(number1: any, number2: any): FormulaValue {
  // Validate inputs
  const num1 = Number(number1);
  const num2 = Number(number2);
  
  if (!Number.isFinite(num1) || !Number.isFinite(num2)) {
    return new Error('#VALUE!');
  }
  
  // Check if integers
  if (!Number.isInteger(num1) || !Number.isInteger(num2)) {
    return new Error('#NUM!');
  }
  
  // Check range (0 to 2^48-1 in Excel)
  const MAX_VALUE = Math.pow(2, 48) - 1;
  if (num1 < 0 || num1 > MAX_VALUE || num2 < 0 || num2 > MAX_VALUE) {
    return new Error('#NUM!');
  }
  
  // Perform bitwise AND
  // For large numbers, use BigInt to avoid precision issues
  if (num1 > Number.MAX_SAFE_INTEGER || num2 > Number.MAX_SAFE_INTEGER) {
    const result = BigInt(num1) & BigInt(num2);
    return Number(result);
  }
  
  return num1 & num2;
}

/**
 * BITOR - Bitwise OR operation
 * 
 * @param number1 - First number (must be >= 0 and < 2^48)
 * @param number2 - Second number (must be >= 0 and < 2^48)
 * @returns Result of bitwise OR operation
 * 
 * @example
 * BITOR(5, 3) → 7 (binary: 101 OR 011 = 111)
 * BITOR(13, 25) → 29 (binary: 1101 OR 11001 = 11101)
 */
export function BITOR(number1: any, number2: any): FormulaValue {
  // Validate inputs
  const num1 = Number(number1);
  const num2 = Number(number2);
  
  if (!Number.isFinite(num1) || !Number.isFinite(num2)) {
    return new Error('#VALUE!');
  }
  
  // Check if integers
  if (!Number.isInteger(num1) || !Number.isInteger(num2)) {
    return new Error('#NUM!');
  }
  
  // Check range (0 to 2^48-1 in Excel)
  const MAX_VALUE = Math.pow(2, 48) - 1;
  if (num1 < 0 || num1 > MAX_VALUE || num2 < 0 || num2 > MAX_VALUE) {
    return new Error('#NUM!');
  }
  
  // Perform bitwise OR
  if (num1 > Number.MAX_SAFE_INTEGER || num2 > Number.MAX_SAFE_INTEGER) {
    const result = BigInt(num1) | BigInt(num2);
    return Number(result);
  }
  
  return num1 | num2;
}

/**
 * BITXOR - Bitwise XOR (exclusive OR) operation
 * 
 * @param number1 - First number (must be >= 0 and < 2^48)
 * @param number2 - Second number (must be >= 0 and < 2^48)
 * @returns Result of bitwise XOR operation
 * 
 * @example
 * BITXOR(5, 3) → 6 (binary: 101 XOR 011 = 110)
 * BITXOR(13, 25) → 20 (binary: 01101 XOR 11001 = 10100)
 */
export function BITXOR(number1: any, number2: any): FormulaValue {
  // Validate inputs
  const num1 = Number(number1);
  const num2 = Number(number2);
  
  if (!Number.isFinite(num1) || !Number.isFinite(num2)) {
    return new Error('#VALUE!');
  }
  
  // Check if integers
  if (!Number.isInteger(num1) || !Number.isInteger(num2)) {
    return new Error('#NUM!');
  }
  
  // Check range (0 to 2^48-1 in Excel)
  const MAX_VALUE = Math.pow(2, 48) - 1;
  if (num1 < 0 || num1 > MAX_VALUE || num2 < 0 || num2 > MAX_VALUE) {
    return new Error('#NUM!');
  }
  
  // Perform bitwise XOR
  if (num1 > Number.MAX_SAFE_INTEGER || num2 > Number.MAX_SAFE_INTEGER) {
    const result = BigInt(num1) ^ BigInt(num2);
    return Number(result);
  }
  
  return num1 ^ num2;
}

/**
 * BITLSHIFT - Bitwise left shift operation
 * 
 * @param number - Number to shift (must be >= 0 and < 2^48)
 * @param shiftAmount - Number of bits to shift left (must be integer)
 * @returns Number shifted left by specified bits
 * 
 * @example
 * BITLSHIFT(5, 2) → 20 (binary: 101 << 2 = 10100)
 * BITLSHIFT(3, 4) → 48 (binary: 11 << 4 = 110000)
 */
export function BITLSHIFT(number: any, shiftAmount: any): FormulaValue {
  // Validate inputs
  const num = Number(number);
  const shift = Number(shiftAmount);
  
  if (!Number.isFinite(num) || !Number.isFinite(shift)) {
    return new Error('#VALUE!');
  }
  
  // Check if integers
  if (!Number.isInteger(num) || !Number.isInteger(shift)) {
    return new Error('#NUM!');
  }
  
  // Check range for number (0 to 2^48-1 in Excel)
  const MAX_VALUE = Math.pow(2, 48) - 1;
  if (num < 0 || num > MAX_VALUE) {
    return new Error('#NUM!');
  }
  
  // Negative shift means right shift
  if (shift < 0) {
    return BITRSHIFT(num, -shift);
  }
  
  // Perform left shift using BigInt for accuracy
  const result = BigInt(num) << BigInt(shift);
  const numResult = Number(result);
  
  // Check if result exceeds Excel's limit
  if (numResult > MAX_VALUE || !Number.isFinite(numResult)) {
    return new Error('#NUM!');
  }
  
  return numResult;
}

/**
 * BITRSHIFT - Bitwise right shift operation
 * 
 * @param number - Number to shift (must be >= 0 and < 2^48)
 * @param shiftAmount - Number of bits to shift right (must be integer)
 * @returns Number shifted right by specified bits
 * 
 * @example
 * BITRSHIFT(20, 2) → 5 (binary: 10100 >> 2 = 101)
 * BITRSHIFT(48, 4) → 3 (binary: 110000 >> 4 = 11)
 */
export function BITRSHIFT(number: any, shiftAmount: any): FormulaValue {
  // Validate inputs
  const num = Number(number);
  const shift = Number(shiftAmount);
  
  if (!Number.isFinite(num) || !Number.isFinite(shift)) {
    return new Error('#VALUE!');
  }
  
  // Check if integers
  if (!Number.isInteger(num) || !Number.isInteger(shift)) {
    return new Error('#NUM!');
  }
  
  // Check range for number (0 to 2^48-1 in Excel)
  const MAX_VALUE = Math.pow(2, 48) - 1;
  if (num < 0 || num > MAX_VALUE) {
    return new Error('#NUM!');
  }
  
  // Negative shift means left shift
  if (shift < 0) {
    return BITLSHIFT(num, -shift);
  }
  
  // For very large shifts, result is always 0
  if (shift >= 48) {
    return 0;
  }
  
  // Perform right shift using BigInt for accuracy
  const result = BigInt(num) >> BigInt(shift);
  return Number(result);
}
