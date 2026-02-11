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

// ============================================================================
// COMPLEX NUMBER FUNCTIONS
// ============================================================================

/**
 * Helper to parse complex number string
 * Supports formats: "3+4i", "3-4i", "3+4j", "5i", "-2j", "7"
 */
function parseComplex(complexText: string): { real: number; imag: number } | Error {
  if (typeof complexText !== 'string') {
    return new Error('#VALUE!');
  }

  const text = complexText.trim();
  
  // Handle pure real number
  if (/^-?\d+\.?\d*$/.test(text)) {
    return { real: parseFloat(text), imag: 0 };
  }

  // Handle pure imaginary (just "i", "j", "-i", "5i", etc.)
  const pureImagMatch = text.match(/^([+-]?\d*\.?\d*)([ij])$/);
  if (pureImagMatch) {
    let imagPart = pureImagMatch[1];
    if (imagPart === '' || imagPart === '+') imagPart = '1';
    if (imagPart === '-') imagPart = '-1';
    return { real: 0, imag: parseFloat(imagPart) };
  }

  // Handle full complex number "a+bi" or "a-bi"
  const complexMatch = text.match(/^([+-]?\d+\.?\d*)([+-])(\d*\.?\d*)([ij])$/);
  if (complexMatch) {
    const real = parseFloat(complexMatch[1]);
    const sign = complexMatch[2];
    let imagPart = complexMatch[3];
    if (imagPart === '') imagPart = '1';
    const imag = parseFloat(sign + imagPart);
    return { real, imag };
  }

  return new Error('#NUM!');
}

/**
 * Helper to format complex number
 */
function formatComplex(real: number, imag: number, suffix: string = 'i'): string {
  if (suffix !== 'i' && suffix !== 'j') {
    suffix = 'i';
  }

  // Pure real
  if (imag === 0) {
    return String(real);
  }

  // Pure imaginary
  if (real === 0) {
    if (imag === 1) return suffix;
    if (imag === -1) return '-' + suffix;
    return imag + suffix;
  }

  // Complex number
  const imagAbs = Math.abs(imag);
  const sign = imag >= 0 ? '+' : '-';
  
  if (imagAbs === 1) {
    return `${real}${sign}${suffix}`;
  }
  
  return `${real}${sign}${imagAbs}${suffix}`;
}

/**
 * COMPLEX - Create a complex number from real and imaginary parts
 * 
 * @param realNum - Real coefficient
 * @param iNum - Imaginary coefficient
 * @param suffix - (Optional) "i" or "j" suffix (default: "i")
 * @returns Complex number string like "3+4i"
 * 
 * @example
 * COMPLEX(3, 4) → "3+4i"
 * COMPLEX(3, -4) → "3-4i"
 * COMPLEX(0, 1) → "i"
 * COMPLEX(5, 0) → "5"
 * COMPLEX(3, 4, "j") → "3+4j"
 */
export function COMPLEX(realNum: any, iNum: any, suffix?: any): FormulaValue {
  // Validate inputs
  const real = Number(realNum);
  const imag = Number(iNum);
  
  if (!Number.isFinite(real) || !Number.isFinite(imag)) {
    return new Error('#VALUE!');
  }

  // Validate suffix
  const suffixStr = suffix !== undefined ? String(suffix).toLowerCase() : 'i';
  if (suffixStr !== 'i' && suffixStr !== 'j') {
    return new Error('#VALUE!');
  }

  return formatComplex(real, imag, suffixStr);
}

/**
 * IMREAL - Extract real part from complex number
 * 
 * @param inumber - Complex number string
 * @returns Real coefficient
 * 
 * @example
 * IMREAL("3+4i") → 3
 * IMREAL("5-2j") → 5
 * IMREAL("7") → 7
 * IMREAL("2i") → 0
 */
export function IMREAL(inumber: any): FormulaValue {
  const parsed = parseComplex(String(inumber));
  if (parsed instanceof Error) return parsed;
  return parsed.real;
}

/**
 * IMAGINARY - Extract imaginary part from complex number
 * 
 * @param inumber - Complex number string
 * @returns Imaginary coefficient
 * 
 * @example
 * IMAGINARY("3+4i") → 4
 * IMAGINARY("5-2j") → -2
 * IMAGINARY("7") → 0
 * IMAGINARY("2i") → 2
 */
export function IMAGINARY(inumber: any): FormulaValue {
  const parsed = parseComplex(String(inumber));
  if (parsed instanceof Error) return parsed;
  return parsed.imag;
}

/**
 * IMABS - Calculate absolute value (magnitude) of complex number
 * 
 * @param inumber - Complex number string
 * @returns Magnitude = sqrt(real² + imag²)
 * 
 * @example
 * IMABS("3+4i") → 5
 * IMABS("1+i") → 1.414213562...
 * IMABS("5") → 5
 */
export function IMABS(inumber: any): FormulaValue {
  const parsed = parseComplex(String(inumber));
  if (parsed instanceof Error) return parsed;
  
  return Math.sqrt(parsed.real * parsed.real + parsed.imag * parsed.imag);
}

/**
 * IMARGUMENT - Calculate argument (angle in radians) of complex number
 * 
 * @param inumber - Complex number string
 * @returns Angle in radians (-π to π)
 * 
 * @example
 * IMARGUMENT("1+i") → 0.785398... (π/4)
 * IMARGUMENT("1+0i") → 0
 * IMARGUMENT("0+i") → 1.570796... (π/2)
 * IMARGUMENT("-1+0i") → 3.141592... (π)
 */
export function IMARGUMENT(inumber: any): FormulaValue {
  const parsed = parseComplex(String(inumber));
  if (parsed instanceof Error) return parsed;
  
  // atan2 returns angle in radians
  return Math.atan2(parsed.imag, parsed.real);
}

/**
 * IMCONJUGATE - Calculate complex conjugate
 * 
 * @param inumber - Complex number string
 * @returns Conjugate (real - imag*i)
 * 
 * @example
 * IMCONJUGATE("3+4i") → "3-4i"
 * IMCONJUGATE("5-2i") → "5+2i"
 * IMCONJUGATE("7") → "7"
 * IMCONJUGATE("2i") → "-2i"
 */
export function IMCONJUGATE(inumber: any): FormulaValue {
  const text = String(inumber);
  const parsed = parseComplex(text);
  if (parsed instanceof Error) return parsed;
  
  // Detect suffix from input
  const suffix = text.includes('j') ? 'j' : 'i';
  
  return formatComplex(parsed.real, -parsed.imag, suffix);
}

// ============================================================================
// Week 11 Day 4: Complex Number Arithmetic Operations
// ============================================================================

/**
 * IMADD - Add two complex numbers
 * 
 * Syntax: IMADD(inumber1, inumber2)
 * 
 * @param inumber1 - First complex number
 * @param inumber2 - Second complex number
 * @returns Sum of complex numbers
 * 
 * Examples:
 * - IMADD("3+4i", "1+2i") → "4+6i"
 * - IMADD("5-2i", "1+3i") → "6+i"
 * - IMADD("2+3i", "4") → "6+3i"
 * - IMADD("1+i", "-1-i") → "0"
 * 
 * Notes:
 * - (a+bi) + (c+di) = (a+c) + (b+d)i
 * - Handles both 'i' and 'j' suffixes
 * - Result uses suffix from first number
 */
export function IMADD(inumber1: any, inumber2: any): FormulaValue {
  const num1 = parseComplex(String(inumber1));
  const num2 = parseComplex(String(inumber2));
  
  if (num1 instanceof Error) return num1;
  if (num2 instanceof Error) return num2;
  
  // Detect suffix from first input
  const suffix = String(inumber1).includes('j') ? 'j' : 'i';
  
  const realPart = num1.real + num2.real;
  const imagPart = num1.imag + num2.imag;
  
  return formatComplex(realPart, imagPart, suffix);
}

/**
 * IMSUB - Subtract two complex numbers
 * 
 * Syntax: IMSUB(inumber1, inumber2)
 * 
 * @param inumber1 - Complex number to subtract from
 * @param inumber2 - Complex number to subtract
 * @returns Difference of complex numbers
 * 
 * Examples:
 * - IMSUB("5+7i", "2+3i") → "3+4i"
 * - IMSUB("4+2i", "1-3i") → "3+5i"
 * - IMSUB("6", "2+3i") → "4-3i"
 * - IMSUB("3+4i", "3+4i") → "0"
 * 
 * Notes:
 * - (a+bi) - (c+di) = (a-c) + (b-d)i
 * - Result uses suffix from first number
 */
export function IMSUB(inumber1: any, inumber2: any): FormulaValue {
  const num1 = parseComplex(String(inumber1));
  const num2 = parseComplex(String(inumber2));
  
  if (num1 instanceof Error) return num1;
  if (num2 instanceof Error) return num2;
  
  const suffix = String(inumber1).includes('j') ? 'j' : 'i';
  
  const realPart = num1.real - num2.real;
  const imagPart = num1.imag - num2.imag;
  
  return formatComplex(realPart, imagPart, suffix);
}

/**
 * IMMULT - Multiply two complex numbers
 * 
 * Syntax: IMMULT(inumber1, inumber2)
 * 
 * @param inumber1 - First complex number
 * @param inumber2 - Second complex number
 * @returns Product of complex numbers
 * 
 * Examples:
 * - IMMULT("3+4i", "2+i") → "2+11i"
 * - IMMULT("1+i", "1-i") → "2"
 * - IMMULT("2+3i", "4") → "8+12i"
 * - IMMULT("i", "i") → "-1"
 * 
 * Notes:
 * - (a+bi) × (c+di) = (ac-bd) + (ad+bc)i
 * - Remember: i² = -1
 * - Result uses suffix from first number
 */
export function IMMULT(inumber1: any, inumber2: any): FormulaValue {
  const num1 = parseComplex(String(inumber1));
  const num2 = parseComplex(String(inumber2));
  
  if (num1 instanceof Error) return num1;
  if (num2 instanceof Error) return num2;
  
  const suffix = String(inumber1).includes('j') ? 'j' : 'i';
  
  // (a+bi)(c+di) = (ac-bd) + (ad+bc)i
  const realPart = num1.real * num2.real - num1.imag * num2.imag;
  const imagPart = num1.real * num2.imag + num1.imag * num2.real;
  
  return formatComplex(realPart, imagPart, suffix);
}

/**
 * IMDIV - Divide two complex numbers
 * 
 * Syntax: IMDIV(inumber1, inumber2)
 * 
 * @param inumber1 - Numerator (complex number)
 * @param inumber2 - Denominator (complex number)
 * @returns Quotient of complex numbers
 * 
 * Examples:
 * - IMDIV("6+8i", "2") → "3+4i"
 * - IMDIV("2+3i", "1+i") → "2.5+0.5i"
 * - IMDIV("1", "i") → "-i"
 * - IMDIV("5+5i", "2-i") → "1+3i"
 * 
 * Notes:
 * - (a+bi) / (c+di) = [(ac+bd) + (bc-ad)i] / (c²+d²)
 * - Returns #NUM! if divisor is zero
 * - Result uses suffix from first number
 */
export function IMDIV(inumber1: any, inumber2: any): FormulaValue {
  const num1 = parseComplex(String(inumber1));
  const num2 = parseComplex(String(inumber2));
  
  if (num1 instanceof Error) return num1;
  if (num2 instanceof Error) return num2;
  
  const suffix = String(inumber1).includes('j') ? 'j' : 'i';
  
  // Check for division by zero
  const denominator = num2.real * num2.real + num2.imag * num2.imag;
  if (denominator === 0) {
    return new Error('#NUM!');
  }
  
  // (a+bi) / (c+di) = [(ac+bd) + (bc-ad)i] / (c²+d²)
  const realPart = (num1.real * num2.real + num1.imag * num2.imag) / denominator;
  const imagPart = (num1.imag * num2.real - num1.real * num2.imag) / denominator;
  
  return formatComplex(realPart, imagPart, suffix);
}

/**
 * IMPOWER - Raise complex number to a power
 * 
 * Syntax: IMPOWER(inumber, number)
 * 
 * @param inumber - Complex number base
 * @param number - Real number exponent
 * @returns Complex number raised to power
 * 
 * Examples:
 * - IMPOWER("2+3i", 2) → "-5+12i"
 * - IMPOWER("i", 2) → "-1"
 * - IMPOWER("1+i", 0) → "1"
 * - IMPOWER("2+2i", 0.5) → "1.55377...+0.64359...i"
 * 
 * Notes:
 * - Uses polar form: (r·e^(iθ))^n = r^n·e^(inθ)
 * - For integer powers, equivalent to repeated multiplication
 * - Result uses suffix from input number
 */
export function IMPOWER(inumber: any, number: any): FormulaValue {
  const complex = parseComplex(String(inumber));
  if (complex instanceof Error) return complex;
  
  const power = Number(number);
  if (!Number.isFinite(power)) {
    return new Error('#VALUE!');
  }
  
  const suffix = String(inumber).includes('j') ? 'j' : 'i';
  
  // Special case: power of 0
  if (power === 0) {
    return formatComplex(1, 0, suffix);
  }
  
  // Convert to polar form
  const r = Math.sqrt(complex.real * complex.real + complex.imag * complex.imag);
  const theta = Math.atan2(complex.imag, complex.real);
  
  // Apply power: (r·e^(iθ))^n = r^n·e^(inθ)
  const newR = Math.pow(r, power);
  const newTheta = theta * power;
  
  // Convert back to rectangular form
  const realPart = newR * Math.cos(newTheta);
  const imagPart = newR * Math.sin(newTheta);
  
  return formatComplex(realPart, imagPart, suffix);
}

/**
 * IMSQRT - Calculate square root of complex number
 * 
 * Syntax: IMSQRT(inumber)
 * 
 * @param inumber - Complex number
 * @returns Principal square root
 * 
 * Examples:
 * - IMSQRT("-1") → "i"
 * - IMSQRT("4") → "2"
 * - IMSQRT("3+4i") → "2+i"
 * - IMSQRT("-4") → "2i"
 * 
 * Notes:
 * - Returns principal (positive real part) square root
 * - Equivalent to IMPOWER(inumber, 0.5)
 * - Result uses suffix from input number
 */
export function IMSQRT(inumber: any): FormulaValue {
  return IMPOWER(inumber, 0.5);
}

/**
 * IMEXP - Calculate exponential of complex number (e^z)
 * 
 * Syntax: IMEXP(inumber)
 * 
 * @param inumber - Complex number
 * @returns e raised to the complex number
 * 
 * Examples:
 * - IMEXP("0") → "1"
 * - IMEXP("1") → "2.71828..." (e)
 * - IMEXP("i") → "0.54030...+0.84147...i" (cos(1)+i·sin(1))
 * - IMEXP("1+i") → "1.46869...+2.28736...i"
 * 
 * Notes:
 * - e^(a+bi) = e^a · (cos(b) + i·sin(b))
 * - Euler's formula: e^(iθ) = cos(θ) + i·sin(θ)
 * - Result uses suffix from input number
 */
export function IMEXP(inumber: any): FormulaValue {
  const complex = parseComplex(String(inumber));
  if (complex instanceof Error) return complex;
  
  const suffix = String(inumber).includes('j') ? 'j' : 'i';
  
  // e^(a+bi) = e^a · (cos(b) + i·sin(b))
  const expReal = Math.exp(complex.real);
  const realPart = expReal * Math.cos(complex.imag);
  const imagPart = expReal * Math.sin(complex.imag);
  
  return formatComplex(realPart, imagPart, suffix);
}

/**
 * IMLN - Calculate natural logarithm of complex number
 * 
 * Syntax: IMLN(inumber)
 * 
 * @param inumber - Complex number
 * @returns Natural logarithm (principal value)
 * 
 * Examples:
 * - IMLN("1") → "0"
 * - IMLN("e") → "1"  (where e ≈ 2.71828)
 * - IMLN("i") → "1.57079...i" (i·π/2)
 * - IMLN("2+2i") → "1.03972...+0.78539...i"
 * 
 * Notes:
 * - ln(a+bi) = ln(r) + i·θ where r=|a+bi|, θ=arg(a+bi)
 * - Returns principal value (−π < Im(result) ≤ π)
 * - Returns #NUM! for zero
 * - Result uses suffix from input number
 */
export function IMLN(inumber: any): FormulaValue {
  const complex = parseComplex(String(inumber));
  if (complex instanceof Error) return complex;
  
  const suffix = String(inumber).includes('j') ? 'j' : 'i';
  
  // Check for zero
  if (complex.real === 0 && complex.imag === 0) {
    return new Error('#NUM!');
  }
  
  // ln(a+bi) = ln(r) + i·θ
  const r = Math.sqrt(complex.real * complex.real + complex.imag * complex.imag);
  const theta = Math.atan2(complex.imag, complex.real);
  
  const realPart = Math.log(r);
  const imagPart = theta;
  
  return formatComplex(realPart, imagPart, suffix);
}

/**
 * IMLOG10 - Calculate base-10 logarithm of complex number
 * 
 * Syntax: IMLOG10(inumber)
 * 
 * @param inumber - Complex number
 * @returns Base-10 logarithm
 * 
 * Examples:
 * - IMLOG10("10") → "1"
 * - IMLOG10("100") → "2"
 * - IMLOG10("i") → "0.68218...i"
 * - IMLOG10("1+i") → "0.15051...+0.34109...i"
 * 
 * Notes:
 * - log₁₀(z) = ln(z) / ln(10)
 * - Returns #NUM! for zero
 * - Result uses suffix from input number
 */
export function IMLOG10(inumber: any): FormulaValue {
  const lnResult = IMLN(inumber);
  if (lnResult instanceof Error) return lnResult;
  
  // Parse the ln result and divide by ln(10)
  const complex = parseComplex(String(lnResult));
  if (complex instanceof Error) return complex;
  
  const suffix = String(inumber).includes('j') ? 'j' : 'i';
  const ln10 = Math.log(10);
  
  return formatComplex(complex.real / ln10, complex.imag / ln10, suffix);
}

/**
 * IMLOG2 - Calculate base-2 logarithm of complex number
 * 
 * Syntax: IMLOG2(inumber)
 * 
 * @param inumber - Complex number
 * @returns Base-2 logarithm
 * 
 * Examples:
 * - IMLOG2("2") → "1"
 * - IMLOG2("8") → "3"
 * - IMLOG2("i") → "0+2.26618...i"
 * - IMLOG2("1+i") → "0.5+1.13309...i"
 * 
 * Notes:
 * - log₂(z) = ln(z) / ln(2)
 * - Returns #NUM! for zero
 * - Result uses suffix from input number
 */
export function IMLOG2(inumber: any): FormulaValue {
  const lnResult = IMLN(inumber);
  if (lnResult instanceof Error) return lnResult;
  
  const complex = parseComplex(String(lnResult));
  if (complex instanceof Error) return complex;
  
  const suffix = String(inumber).includes('j') ? 'j' : 'i';
  const ln2 = Math.log(2);
  
  return formatComplex(complex.real / ln2, complex.imag / ln2, suffix);
}

/**
 * IMSIN - Calculate sine of complex number
 * 
 * Syntax: IMSIN(inumber)
 * 
 * @param inumber - Complex number (angle in radians)
 * @returns Sine of complex number
 * 
 * Examples:
 * - IMSIN("0") → "0"
 * - IMSIN("1.5707963...") → "1" (sin(π/2))
 * - IMSIN("i") → "1.17520...i"
 * - IMSIN("1+i") → "1.29846...+0.63496...i"
 * 
 * Notes:
 * - sin(a+bi) = sin(a)cosh(b) + i·cos(a)sinh(b)
 * - Result uses suffix from input number
 */
export function IMSIN(inumber: any): FormulaValue {
  const complex = parseComplex(String(inumber));
  if (complex instanceof Error) return complex;
  
  const suffix = String(inumber).includes('j') ? 'j' : 'i';
  
  // sin(a+bi) = sin(a)cosh(b) + i·cos(a)sinh(b)
  const realPart = Math.sin(complex.real) * Math.cosh(complex.imag);
  const imagPart = Math.cos(complex.real) * Math.sinh(complex.imag);
  
  return formatComplex(realPart, imagPart, suffix);
}

/**
 * IMCOS - Calculate cosine of complex number
 * 
 * Syntax: IMCOS(inumber)
 * 
 * @param inumber - Complex number (angle in radians)
 * @returns Cosine of complex number
 * 
 * Examples:
 * - IMCOS("0") → "1"
 * - IMCOS("3.14159...") → "-1" (cos(π))
 * - IMCOS("i") → "1.54308..."
 * - IMCOS("1+i") → "0.83373...-0.98889...i"
 * 
 * Notes:
 * - cos(a+bi) = cos(a)cosh(b) - i·sin(a)sinh(b)
 * - Result uses suffix from input number
 */
export function IMCOS(inumber: any): FormulaValue {
  const complex = parseComplex(String(inumber));
  if (complex instanceof Error) return complex;
  
  const suffix = String(inumber).includes('j') ? 'j' : 'i';
  
  // cos(a+bi) = cos(a)cosh(b) - i·sin(a)sinh(b)
  const realPart = Math.cos(complex.real) * Math.cosh(complex.imag);
  const imagPart = -Math.sin(complex.real) * Math.sinh(complex.imag);
  
  return formatComplex(realPart, imagPart, suffix);
}

/**
 * IMTAN - Calculate tangent of complex number
 * 
 * Syntax: IMTAN(inumber)
 * 
 * @param inumber - Complex number (angle in radians)
 * @returns Tangent of complex number
 * 
 * Examples:
 * - IMTAN("0") → "0"
 * - IMTAN("0.78539...") → "1" (tan(π/4))
 * - IMTAN("i") → "0.76159...i"
 * - IMTAN("1+i") → "0.27175...+1.08392...i"
 * 
 * Notes:
 * - tan(z) = sin(z) / cos(z)
 * - Result uses suffix from input number
 */
export function IMTAN(inumber: any): FormulaValue {
  const sinResult = IMSIN(inumber);
  const cosResult = IMCOS(inumber);
  
  if (sinResult instanceof Error) return sinResult;
  if (cosResult instanceof Error) return cosResult;
  
  return IMDIV(sinResult, cosResult);
}

/**
 * IMSEC - Calculate secant of complex number
 * 
 * Syntax: IMSEC(inumber)
 * 
 * @param inumber - Complex number (angle in radians)
 * @returns Secant of complex number (1/cos(z))
 * 
 * Examples:
 * - IMSEC("0") → "1"
 * - IMSEC("1") → "1.85081..."
 * - IMSEC("i") → "0.64805..."
 * - IMSEC("1+i") → "0.49833...+0.59108...i"
 * 
 * Notes:
 * - sec(z) = 1 / cos(z)
 * - Returns #NUM! when cos(z) = 0
 * - Result uses suffix from input number
 */
export function IMSEC(inumber: any): FormulaValue {
  const cosResult = IMCOS(inumber);
  if (cosResult instanceof Error) return cosResult;
  
  const suffix = String(inumber).includes('j') ? 'j' : 'i';
  return IMDIV(formatComplex(1, 0, suffix), cosResult);
}

/**
 * IMCSC - Calculate cosecant of complex number
 * 
 * Syntax: IMCSC(inumber)
 * 
 * @param inumber - Complex number (angle in radians)
 * @returns Cosecant of complex number (1/sin(z))
 * 
 * Examples:
 * - IMCSC("1.5707963...") → "1" (csc(π/2))
 * - IMCSC("1") → "1.18839..."
 * - IMCSC("i") → "-0.85091...i"
 * - IMCSC("1+i") → "0.62151...-0.30393...i"
 * 
 * Notes:
 * - csc(z) = 1 / sin(z)
 * - Returns #NUM! when sin(z) = 0
 * - Result uses suffix from input number
 */
export function IMCSC(inumber: any): FormulaValue {
  const sinResult = IMSIN(inumber);
  if (sinResult instanceof Error) return sinResult;
  
  const suffix = String(inumber).includes('j') ? 'j' : 'i';
  return IMDIV(formatComplex(1, 0, suffix), sinResult);
}

/**
 * IMCOT - Calculate cotangent of complex number
 * 
 * Syntax: IMCOT(inumber)
 * 
 * @param inumber - Complex number (angle in radians)
 * @returns Cotangent of complex number (cos(z)/sin(z))
 * 
 * Examples:
 * - IMCOT("0.78539...") → "1" (cot(π/4))
 * - IMCOT("1") → "0.64209..."
 * - IMCOT("i") → "-1.31303...i"
 * - IMCOT("1+i") → "0.21762...-0.86801...i"
 * 
 * Notes:
 * - cot(z) = cos(z) / sin(z) = 1 / tan(z)
 * - Returns #NUM! when sin(z) = 0
 * - Result uses suffix from input number
 */
export function IMCOT(inumber: any): FormulaValue {
  const cosResult = IMCOS(inumber);
  const sinResult = IMSIN(inumber);
  
  if (cosResult instanceof Error) return cosResult;
  if (sinResult instanceof Error) return sinResult;
  
  return IMDIV(cosResult, sinResult);
}

/**
 * IMSINH - Calculate hyperbolic sine of complex number
 * 
 * Syntax: IMSINH(inumber)
 * 
 * @param inumber - Complex number
 * @returns Hyperbolic sine
 * 
 * Examples:
 * - IMSINH("0") → "0"
 * - IMSINH("1") → "1.17520..."
 * - IMSINH("i") → "0.84147...i"
 * - IMSINH("1+i") → "0.63496...+1.29846...i"
 * 
 * Notes:
 * - sinh(a+bi) = sinh(a)cos(b) + i·cosh(a)sin(b)
 * - Result uses suffix from input number
 */
export function IMSINH(inumber: any): FormulaValue {
  const complex = parseComplex(String(inumber));
  if (complex instanceof Error) return complex;
  
  const suffix = String(inumber).includes('j') ? 'j' : 'i';
  
  // sinh(a+bi) = sinh(a)cos(b) + i·cosh(a)sin(b)
  const realPart = Math.sinh(complex.real) * Math.cos(complex.imag);
  const imagPart = Math.cosh(complex.real) * Math.sin(complex.imag);
  
  return formatComplex(realPart, imagPart, suffix);
}

/**
 * IMCOSH - Calculate hyperbolic cosine of complex number
 * 
 * Syntax: IMCOSH(inumber)
 * 
 * @param inumber - Complex number
 * @returns Hyperbolic cosine
 * 
 * Examples:
 * - IMCOSH("0") → "1"
 * - IMCOSH("1") → "1.54308..."
 * - IMCOSH("i") → "0.54030..."
 * - IMCOSH("1+i") → "0.83373...+0.98889...i"
 * 
 * Notes:
 * - cosh(a+bi) = cosh(a)cos(b) + i·sinh(a)sin(b)
 * - Result uses suffix from input number
 */
export function IMCOSH(inumber: any): FormulaValue {
  const complex = parseComplex(String(inumber));
  if (complex instanceof Error) return complex;
  
  const suffix = String(inumber).includes('j') ? 'j' : 'i';
  
  // cosh(a+bi) = cosh(a)cos(b) + i·sinh(a)sin(b)
  const realPart = Math.cosh(complex.real) * Math.cos(complex.imag);
  const imagPart = Math.sinh(complex.real) * Math.sin(complex.imag);
  
  return formatComplex(realPart, imagPart, suffix);
}

/**
 * IMSECH - Calculate hyperbolic secant of complex number
 * 
 * Syntax: IMSECH(inumber)
 * 
 * @param inumber - Complex number
 * @returns Hyperbolic secant (1/cosh(z))
 * 
 * Examples:
 * - IMSECH("0") → "1"
 * - IMSECH("1") → "0.64805..."
 * - IMSECH("i") → "1.85081..."
 * - IMSECH("1+i") → "0.49833...-0.59108...i"
 * 
 * Notes:
 * - sech(z) = 1 / cosh(z)
 * - Result uses suffix from input number
 */
export function IMSECH(inumber: any): FormulaValue {
  const coshResult = IMCOSH(inumber);
  if (coshResult instanceof Error) return coshResult;
  
  const suffix = String(inumber).includes('j') ? 'j' : 'i';
  return IMDIV(formatComplex(1, 0, suffix), coshResult);
}

/**
 * IMCSCH - Calculate hyperbolic cosecant of complex number
 * 
 * Syntax: IMCSCH(inumber)
 * 
 * @param inumber - Complex number
 * @returns Hyperbolic cosecant (1/sinh(z))
 * 
 * Examples:
 * - IMCSCH("1") → "0.85091..."
 * - IMCSCH("i") → "-1.18839...i"
 * - IMCSCH("1+i") → "0.30393...-0.62151...i"
 * 
 * Notes:
 * - csch(z) = 1 / sinh(z)
 * - Returns #NUM! when sinh(z) = 0
 * - Result uses suffix from input number
 */
export function IMCSCH(inumber: any): FormulaValue {
  const sinhResult = IMSINH(inumber);
  if (sinhResult instanceof Error) return sinhResult;
  
  const suffix = String(inumber).includes('j') ? 'j' : 'i';
  return IMDIV(formatComplex(1, 0, suffix), sinhResult);
}
