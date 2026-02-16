/**
 * text-functions.ts
 * 
 * Text manipulation formula functions.
 * Excel-compatible string operations.
 */

import type { FormulaFunction, FormulaValue } from '../../types/formula-types';
import { toString, toNumber } from '../../utils/type-utils';

/**
 * CONCATENATE - Join strings
 */
export const CONCATENATE: FormulaFunction = (...args) => {
  const flatten = (arr: FormulaValue[]): FormulaValue[] => {
    const result: FormulaValue[] = [];
    for (const item of arr) {
      if (Array.isArray(item)) {
        result.push(...flatten(item));
      } else {
        result.push(item);
      }
    }
    return result;
  };

  const flat = flatten(args);
  const strings = flat.map(v => {
    const str = toString(v ?? '');
    return str instanceof Error ? '' : str;
  });

  return strings.join('');
};

/**
 * LEFT - Leftmost characters
 */
export const LEFT: FormulaFunction = (text, numChars = 1) => {
  const str = toString(text);
  const num = toNumber(numChars);

  if (str instanceof Error) return str;
  if (num instanceof Error) return num;

  if (num < 0) return new Error('#VALUE!');

  return str.slice(0, num);
};

/**
 * LEFTB - Leftmost characters by byte count (for DBCS)
 * 
 * Returns leftmost characters counting bytes instead of characters.
 * Used with double-byte character sets (DBCS).
 * 
 * @example
 * =LEFTB("Hello", 3) → "Hel" (3 bytes = 3 ASCII chars)
 * =LEFTB("日本語", 4) → "日本" (4 bytes = 2 DBCS chars)
 * =LEFTB("Hello世界", 7) → "Hello世" (5 ASCII + 2 bytes for one DBCS)
 */
export const LEFTB: FormulaFunction = (text, numBytes = 1) => {
  const str = toString(text);
  const num = toNumber(numBytes);

  if (str instanceof Error) return str;
  if (num instanceof Error) return num;

  if (num < 0) return new Error('#VALUE!');

  let result = '';
  let byteCount = 0;
  
  for (let i = 0; i < str.length && byteCount < num; i++) {
    const code = str.charCodeAt(i);
    const charBytes = code < 128 ? 1 : 2;
    
    // Only add character if it fits within byte limit
    if (byteCount + charBytes <= num) {
      result += str[i];
      byteCount += charBytes;
    } else {
      break;
    }
  }
  
  return result;
};

/**
 * RIGHT - Rightmost characters
 */
export const RIGHT: FormulaFunction = (text, numChars = 1) => {
  const str = toString(text);
  const num = toNumber(numChars);

  if (str instanceof Error) return str;
  if (num instanceof Error) return num;

  if (num < 0) return new Error('#VALUE!');
  
  // Handle zero case: RIGHT("abc", 0) should return ""
  if (num === 0) return '';

  return str.slice(-num);
};

/**
 * RIGHTB - Rightmost characters by byte count (for DBCS)
 * 
 * Returns rightmost characters counting bytes instead of characters.
 * Used with double-byte character sets (DBCS).
 * 
 * @example
 * =RIGHTB("Hello", 3) → "llo" (3 bytes = 3 ASCII chars)
 * =RIGHTB("日本語", 4) → "本語" (4 bytes = 2 DBCS chars)
 * =RIGHTB("Hello世界", 7) → "lo世界" (2 ASCII + 4 bytes for two DBCS)
 */
export const RIGHTB: FormulaFunction = (text, numBytes = 1) => {
  const str = toString(text);
  const num = toNumber(numBytes);

  if (str instanceof Error) return str;
  if (num instanceof Error) return num;

  if (num < 0) return new Error('#VALUE!');

  // Build result from right to left
  let result = '';
  let byteCount = 0;
  
  for (let i = str.length - 1; i >= 0 && byteCount < num; i--) {
    const code = str.charCodeAt(i);
    const charBytes = code < 128 ? 1 : 2;
    
    // Only add character if it fits within byte limit
    if (byteCount + charBytes <= num) {
      result = str[i] + result;
      byteCount += charBytes;
    } else {
      break;
    }
  }
  
  return result;
};

/**
 * MID - Middle characters
 */
export const MID: FormulaFunction = (text, start, numChars) => {
  const str = toString(text);
  const startNum = toNumber(start);
  const numCharsNum = toNumber(numChars);

  if (str instanceof Error) return str;
  if (startNum instanceof Error) return startNum;
  if (numCharsNum instanceof Error) return numCharsNum;

  if (startNum < 1 || numCharsNum < 0) return new Error('#VALUE!');

  return str.slice(startNum - 1, startNum - 1 + numCharsNum);
};

/**
 * MIDB - Middle characters by byte count (for DBCS)
 * 
 * Returns middle portion of string counting bytes instead of characters.
 * Used with double-byte character sets (DBCS).
 * 
 * @param text - Source text
 * @param startByte - Starting byte position (1-based)
 * @param numBytes - Number of bytes to return
 * 
 * @example
 * =MIDB("Hello", 2, 3) → "ell" (start at byte 2, get 3 bytes)
 * =MIDB("日本語", 3, 2) → "本" (start at byte 3 = 2nd char, get 2 bytes = 1 char)
 * =MIDB("Hello世界", 6, 4) → "o世" (1 ASCII + 1 DBCS char)
 */
export const MIDB: FormulaFunction = (text, startByte, numBytes) => {
  const str = toString(text);
  const startNum = toNumber(startByte);
  const numBytesNum = toNumber(numBytes);

  if (str instanceof Error) return str;
  if (startNum instanceof Error) return startNum;
  if (numBytesNum instanceof Error) return numBytesNum;

  if (startNum < 1 || numBytesNum < 0) return new Error('#VALUE!');

  // Find starting character position
  let bytePos = 0;
  let startCharPos = 0;
  
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    const charBytes = code < 128 ? 1 : 2;
    
    if (bytePos + charBytes > startNum - 1) {
      startCharPos = i;
      break;
    }
    
    bytePos += charBytes;
    if (i === str.length - 1) {
      startCharPos = str.length;
    }
  }

  // Extract characters up to byte limit
  let result = '';
  let resultBytes = 0;
  
  for (let i = startCharPos; i < str.length && resultBytes < numBytesNum; i++) {
    const code = str.charCodeAt(i);
    const charBytes = code < 128 ? 1 : 2;
    
    if (resultBytes + charBytes <= numBytesNum) {
      result += str[i];
      resultBytes += charBytes;
    } else {
      break;
    }
  }
  
  return result;
};

/**
 * LEN - String length
 */
export const LEN: FormulaFunction = (text) => {
  const str = toString(text);
  if (str instanceof Error) return str;
  return str.length;
};

/**
 * LENB - String length in bytes (for DBCS)
 * 
 * In languages with double-byte character sets (DBCS) like Chinese, Japanese, Korean,
 * each character may take 2 bytes. LENB returns the byte count.
 * 
 * For simplicity, we count:
 * - ASCII characters (code < 128): 1 byte
 * - Extended ASCII and Unicode (code >= 128): 2 bytes
 * 
 * @example
 * =LENB("Hello") → 5 (all ASCII)
 * =LENB("日本") → 4 (2 chars × 2 bytes)
 * =LENB("Hello世界") → 9 (5 ASCII + 2 × 2 bytes)
 */
export const LENB: FormulaFunction = (text) => {
  const str = toString(text);
  if (str instanceof Error) return str;
  
  let byteCount = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    // ASCII characters (0-127) count as 1 byte
    // Everything else counts as 2 bytes (DBCS characters)
    byteCount += code < 128 ? 1 : 2;
  }
  
  return byteCount;
};

/**
 * UPPER - Convert to uppercase
 */
export const UPPER: FormulaFunction = (text) => {
  const str = toString(text);
  if (str instanceof Error) return str;
  return str.toUpperCase();
};

/**
 * LOWER - Convert to lowercase
 */
export const LOWER: FormulaFunction = (text) => {
  const str = toString(text);
  if (str instanceof Error) return str;
  return str.toLowerCase();
};

/**
 * TRIM - Remove extra whitespace
 */
export const TRIM: FormulaFunction = (text) => {
  const str = toString(text);
  if (str instanceof Error) return str;
  return str.trim().replace(/\s+/g, ' ');
};

/**
 * SUBSTITUTE - Replace text
 */
export const SUBSTITUTE: FormulaFunction = (text, oldText, newText, instanceNum?) => {
  const str = toString(text);
  const old = toString(oldText);
  const newStr = toString(newText);

  if (str instanceof Error) return str;
  if (old instanceof Error) return old;
  if (newStr instanceof Error) return newStr;

  if (instanceNum !== undefined) {
    const num = toNumber(instanceNum);
    if (num instanceof Error) return num;

    // Replace specific instance
    let count = 0;
    return str.replace(new RegExp(old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), (match) => {
      count++;
      return count === num ? newStr : match;
    });
  }

  // Replace all instances
  return str.replace(new RegExp(old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newStr);
};

/**
 * REPLACE - Replace substring by position
 */
export const REPLACE: FormulaFunction = (oldText, startNum, numChars, newText) => {
  const old = toString(oldText);
  const start = toNumber(startNum);
  const num = toNumber(numChars);
  const newStr = toString(newText);

  if (old instanceof Error) return old;
  if (start instanceof Error) return start;
  if (num instanceof Error) return num;
  if (newStr instanceof Error) return newStr;

  if (start < 1 || num < 0) return new Error('#VALUE!');

  return old.slice(0, start - 1) + newStr + old.slice(start - 1 + num);
};

/**
 * FIND - Find substring (case-sensitive)
 */
export const FIND: FormulaFunction = (findText, withinText, startNum = 1) => {
  const find = toString(findText);
  const within = toString(withinText);
  const start = toNumber(startNum);

  if (find instanceof Error) return find;
  if (within instanceof Error) return within;
  if (start instanceof Error) return start;

  if (start < 1) return new Error('#VALUE!');

  const index = within.indexOf(find, start - 1);
  return index === -1 ? new Error('#VALUE!') : index + 1;
};

/**
 * SEARCH - Find substring (case-insensitive, with wildcards)
 */
export const SEARCH: FormulaFunction = (findText, withinText, startNum = 1) => {
  const find = toString(findText);
  const within = toString(withinText);
  const start = toNumber(startNum);

  if (find instanceof Error) return find;
  if (within instanceof Error) return within;
  if (start instanceof Error) return start;

  if (start < 1) return new Error('#VALUE!');

  const findLower = find.toLowerCase();
  const withinLower = within.toLowerCase();

  const index = withinLower.indexOf(findLower, start - 1);
  return index === -1 ? new Error('#VALUE!') : index + 1;
};

/**
 * TEXT - Format number as text with format code
 * Supports basic number formatting and date/time formatting
 */
export const TEXT: FormulaFunction = (value, formatText) => {
  const format = toString(formatText);
  if (format instanceof Error) return format;

  // Handle errors
  if (value instanceof Error) return value;

  // Handle arrays - use first element
  if (Array.isArray(value)) {
    if (value.length === 0) return new Error('#VALUE!');
    value = value[0];
  }

  // For numbers, check if it's a date format first
  if (typeof value === 'number') {
    // Check if format looks like a date format (has d, m, y but not percentage or hash)
    if (/[dmy]/i.test(format) && !/[#0%]/.test(format)) {
      return formatDate(value, format);
    }
    // Otherwise apply number formatting
    return formatNumber(value, format);
  }

  // For booleans
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }

  // For strings, return as-is
  return toString(value);
};

/**
 * Helper: Format number with format code
 */
function formatNumber(num: number, format: string): string {
  // Handle special cases
  if (format === '@') return num.toString();
  if (format === '') return num.toString();

  // Count decimal places from format
  const decimalPos = format.indexOf('.');
  if (decimalPos >= 0) {
    // Count zeros and hashes after decimal
    const afterDecimal = format.substring(decimalPos + 1);
    const decimals = afterDecimal.replace(/[^0#]/g, '').length;
    
    if (decimals > 0) {
      return num.toFixed(decimals);
    }
  }

  // Check for thousands separator
  if (format.includes(',')) {
    return num.toLocaleString('en-US');
  }

  // Check for percentage
  if (format.includes('%')) {
    return (num * 100).toFixed(0) + '%';
  }

  // Default: return as string
  return num.toString();
}

/**
 * Helper: Format date with format code
 */
function formatDate(serial: number, format: string): string | Error {
  // Excel date serial: days since 1900-01-01
  const excelEpoch = new Date(1899, 11, 30); // Excel's epoch (Dec 30, 1899)
  const date = new Date(excelEpoch.getTime() + serial * 86400000);

  if (isNaN(date.getTime())) return new Error('#VALUE!');

  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  let result = format;

  // Use numeric-only placeholders to avoid any letter matching
  // Replace format codes - IMPORTANT: Do longest patterns first!
  
  // Days (using codes 1xxx)
  result = result.replace(/dddd/gi, () => `\uE000${1000 + date.getDay()}\uE000`);
  result = result.replace(/ddd/gi, () => `\uE000${1100 + date.getDay()}\uE000`);
  result = result.replace(/dd/gi, () => `\uE0001200\uE000`);
  result = result.replace(/d/gi, () => `\uE0001201\uE000`);

  // Months (using codes 2xxx)
  result = result.replace(/mmmm/gi, () => `\uE000${2000 + month}\uE000`);
  result = result.replace(/mmm/gi, () => `\uE000${2100 + month}\uE000`);
  result = result.replace(/mm/gi, () => `\uE0002200\uE000`);
  result = result.replace(/m/gi, () => `\uE0002201\uE000`);
  
  // Years (using codes 3xxx)
  result = result.replace(/yyyy/gi, () => `\uE0003000\uE000`);
  result = result.replace(/yy/gi, () => `\uE0003001\uE000`);

  // Time (using codes 4xxx and 5xxx)
  result = result.replace(/hh/gi, () => `\uE0004000\uE000`);
  result = result.replace(/h/gi, () => `\uE0004001\uE000`);
  result = result.replace(/ss/gi, () => `\uE0005000\uE000`);
  result = result.replace(/s/gi, () => `\uE0005001\uE000`);

  // Now replace placeholders with actual values
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Replace day placeholders
  for (let i = 0; i < 7; i++) {
    result = result.replace(new RegExp(`\\uE000${1000 + i}\\uE000`, 'g'), days[i]);
    result = result.replace(new RegExp(`\\uE000${1100 + i}\\uE000`, 'g'), daysShort[i]);
  }
  result = result.replace(/\uE0001200\uE000/g, String(day).padStart(2, '0'));
  result = result.replace(/\uE0001201\uE000/g, String(day));
  
  // Replace month placeholders
  for (let i = 1; i <= 12; i++) {
    result = result.replace(new RegExp(`\\uE000${2000 + i}\\uE000`, 'g'), months[i - 1]);
    result = result.replace(new RegExp(`\\uE000${2100 + i}\\uE000`, 'g'), monthsShort[i - 1]);
  }
  result = result.replace(/\uE0002200\uE000/g, String(month).padStart(2, '0'));
  result = result.replace(/\uE0002201\uE000/g, String(month));
  
  // Replace year placeholders
  result = result.replace(/\uE0003000\uE000/g, String(year));
  result = result.replace(/\uE0003001\uE000/g, String(year).slice(-2));
  
  // Replace time placeholders
  result = result.replace(/\uE0004000\uE000/g, String(hours).padStart(2, '0'));
  result = result.replace(/\uE0004001\uE000/g, String(hours));
  result = result.replace(/\uE0005000\uE000/g, String(seconds).padStart(2, '0'));
  result = result.replace(/\uE0005001\uE000/g, String(seconds));

  return result;
}

/**
 * VALUE - Convert text to number with locale-aware parsing
 * Handles formats like "1,234.56" (US) and "1 234,56" (EU)
 */
export const VALUE: FormulaFunction = (text) => {
  // Handle errors
  if (text instanceof Error) return text;

  // Handle arrays - use first element
  if (Array.isArray(text)) {
    if (text.length === 0) return new Error('#VALUE!');
    text = text[0];
  }

  // Already a number
  if (typeof text === 'number') {
    return isNaN(text) ? new Error('#VALUE!') : text;
  }

  // Convert to string
  const str = toString(text);
  if (str instanceof Error) return str;

  // Empty string = 0
  if (str.trim() === '') return 0;

  // Handle locale-specific formats
  // Remove whitespace (space as thousands separator)
  let cleaned = str.trim().replace(/\s+/g, '');
  
  // Try direct conversion first only if no separators (handles simple cases like "123" or "-45.6")
  if (!/[,.]/.test(cleaned)) {
    const directNum = Number(cleaned);
    if (!isNaN(directNum)) return directNum;
  }

  // Detect format by counting commas and dots
  const commaCount = (cleaned.match(/,/g) || []).length;
  const dotCount = (cleaned.match(/\./g) || []).length;
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  // US format: 1,234.56 (comma = thousands, dot = decimal)
  // EU format: 1.234,56 (dot = thousands, comma = decimal)
  
  if (commaCount > 0 && dotCount > 0) {
    // Both present - determine which is decimal
    if (lastDot > lastComma) {
      // US format: comma is thousands, dot is decimal
      cleaned = cleaned.replace(/,/g, '');
    } else {
      // EU format: dot is thousands, comma is decimal
      cleaned = cleaned.replace(/\./g, '').replace(/,/, '.');
    }
  } else if (commaCount > 0) {
    // Only commas
    if (commaCount === 1 && cleaned.length - lastComma <= 3 && lastComma > cleaned.length - 4) {
      // Likely decimal separator (e.g., "123,45")
      cleaned = cleaned.replace(/,/, '.');
    } else {
      // Likely thousands separator (e.g., "1,234,567")
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (dotCount > 1) {
    // Multiple dots - must be thousands separator (e.g., "1.234.567")
    cleaned = cleaned.replace(/\./g, '');
  } else if (dotCount === 1) {
    // Single dot - check position to determine if it's thousands or decimal
    const digitsAfterDot = cleaned.length - lastDot - 1;
    if (digitsAfterDot === 3 && lastDot > 0) {
      // Exactly 3 digits after dot = thousands separator (e.g., "1.234" = 1234)
      cleaned = cleaned.replace(/\./, '');
    }
    // Otherwise leave it as decimal separator (e.g., "1.23" = 1.23)
  }

  // Handle percentage
  if (cleaned.endsWith('%')) {
    cleaned = cleaned.slice(0, -1);
    const num = Number(cleaned);
    return isNaN(num) ? new Error('#VALUE!') : num / 100;
  }

  // Try parsing the cleaned string
  const result = Number(cleaned);
  return isNaN(result) ? new Error('#VALUE!') : result;
};

/**
 * NUMBERVALUE - Convert text to number with custom separators
 * Excel 2013+: Allows specifying decimal and group separators
 */
export const NUMBERVALUE: FormulaFunction = (text, decimalSeparator?, groupSeparator?) => {
  // Handle errors
  if (text instanceof Error) return text;

  // Handle arrays - use first element
  if (Array.isArray(text)) {
    if (text.length === 0) return new Error('#VALUE!');
    text = text[0];
  }

  // Already a number
  if (typeof text === 'number') {
    return isNaN(text) ? new Error('#VALUE!') : text;
  }

  // Convert to string
  const str = toString(text);
  if (str instanceof Error) return str;

  // Empty string = 0
  if (str.trim() === '') return 0;

  // Default separators (US format)
  let decSep = '.';
  let grpSep = ',';

  // Get custom separators if provided
  if (decimalSeparator !== undefined && decimalSeparator !== null) {
    const decStr = toString(decimalSeparator);
    if (decStr instanceof Error) return decStr;
    if (decStr.length === 1) {
      decSep = decStr;
      // If only decimal separator is provided, assume no group separator
      if (groupSeparator === undefined || groupSeparator === null) {
        grpSep = '';
      }
    }
  }

  if (groupSeparator !== undefined && groupSeparator !== null) {
    const grpStr = toString(groupSeparator);
    if (grpStr instanceof Error) return grpStr;
    if (grpStr.length === 1) grpSep = grpStr;
  }

  // Clean the string
  let cleaned = str.trim();

  // Validate and remove group separators
  if (grpSep && cleaned.includes(grpSep)) {
    // Check if group separators are in valid positions (every 3 digits from the right before decimal)
    const parts = cleaned.split(decSep);
    const integerPart = parts[0];
    
    // If there are group separators, validate their positions
    if (integerPart.includes(grpSep)) {
      const groups = integerPart.split(grpSep);
      // First group can be 1-3 digits, remaining groups must be exactly 3 digits
      if (groups.length > 1) {
        if (groups[0].length === 0 || groups[0].length > 3) {
          return new Error('#VALUE!');
        }
        for (let i = 1; i < groups.length; i++) {
          if (groups[i].length !== 3) {
            return new Error('#VALUE!');
          }
        }
      }
    }
    
    // Remove group separators
    const grpRegex = new RegExp(grpSep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    cleaned = cleaned.replace(grpRegex, '');
  }

  // Replace decimal separator with standard dot
  if (decSep !== '.') {
    const decRegex = new RegExp(decSep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    cleaned = cleaned.replace(decRegex, '.');
  }

  // Handle percentage
  if (cleaned.endsWith('%')) {
    cleaned = cleaned.slice(0, -1);
    const num = Number(cleaned);
    return isNaN(num) ? new Error('#VALUE!') : num / 100;
  }

  // Validate: should have at most one decimal point
  const dotCount = (cleaned.match(/\./g) || []).length;
  if (dotCount > 1) {
    return new Error('#VALUE!');
  }

  // Parse the result
  const result = Number(cleaned);
  return isNaN(result) ? new Error('#VALUE!') : result;
};

/**
 * CHAR - Character from code
 */
export const CHAR: FormulaFunction = (number) => {
  const num = toNumber(number);
  if (num instanceof Error) return num;

  if (num < 1 || num > 255) return new Error('#VALUE!');

  return String.fromCharCode(num);
};

/**
 * CODE - Code from character
 */
export const CODE: FormulaFunction = (text) => {
  const str = toString(text);
  if (str instanceof Error) return str;

  if (str.length === 0) return new Error('#VALUE!');

  return str.charCodeAt(0);
};

/**
 * EXACT - Compare strings (case-sensitive)
 */
export const EXACT: FormulaFunction = (text1, text2) => {
  const str1 = toString(text1);
  const str2 = toString(text2);

  if (str1 instanceof Error) return str1;
  if (str2 instanceof Error) return str2;

  return str1 === str2;
};

/**
 * REPT - Repeat text
 */
export const REPT: FormulaFunction = (text, numberTimes) => {
  const str = toString(text);
  const times = toNumber(numberTimes);

  if (str instanceof Error) return str;
  if (times instanceof Error) return times;

  if (times < 0) return new Error('#VALUE!');

  return str.repeat(Math.floor(times));
};

/**
 * TEXTJOIN - Join with delimiter
 * 
 * @param delimiter - String to use as delimiter
 * @param ignoreEmpty - If TRUE, ignores empty cells
 * @param args - Values to join (can be arrays, ranges, or single values)
 * @returns Joined string
 * 
 * @example
 * =TEXTJOIN(", ", TRUE, A1:A3)
 * // Joins A1:A3 with ", ", ignoring empty cells
 * 
 * @example
 * =TEXTJOIN(" ", FALSE, "Hello", "World")
 * // Returns "Hello World"
 */
export const TEXTJOIN: FormulaFunction = (delimiter, ignoreEmpty, ...args) => {
  const delim = toString(delimiter);
  if (delim instanceof Error) return delim;

  // Helper to flatten nested arrays recursively
  const flatten = (arr: FormulaValue[]): FormulaValue[] => {
    const result: FormulaValue[] = [];
    for (const item of arr) {
      if (Array.isArray(item)) {
        result.push(...flatten(item));
      } else {
        result.push(item);
      }
    }
    return result;
  };

  let flat = flatten(args);

  // Filter empty values if requested
  if (ignoreEmpty) {
    flat = flat.filter(v => v !== null && v !== undefined && v !== '');
  }

  // Convert to strings
  const strings = flat.map(v => {
    const str = toString(v ?? '');
    return str instanceof Error ? '' : str;
  });

  return strings.join(delim);
};

/**
 * TEXTSPLIT - Split text into array by delimiter
 * 
 * @param text - Text to split
 * @param colDelimiter - Column delimiter (splits into columns)
 * @param rowDelimiter - Optional row delimiter (splits into rows)
 * @param ignoreEmpty - If TRUE, ignores empty values (default FALSE)
 * @param matchMode - Matching mode: 0 = case-sensitive (default), 1 = case-insensitive
 * @param padWith - Value to pad with if splits result in different lengths (default #N/A)
 * @returns Array of split values (1D or 2D depending on delimiters)
 * 
 * @example
 * =TEXTSPLIT("Apple,Banana,Cherry", ",")
 * // Returns ["Apple", "Banana", "Cherry"] (1D horizontal array)
 * 
 * @example
 * =TEXTSPLIT("A,B;C,D", ",", ";")
 * // Returns [["A", "B"], ["C", "D"]] (2D array)
 * 
 * @example
 * =TEXTSPLIT("Apple,,Cherry", ",", , TRUE)
 * // Returns ["Apple", "Cherry"] (ignores empty)
 * 
 * @example
 * =TEXTSPLIT("Name:Age:City", ":", , FALSE)
 * // Returns ["Name", "Age", "City"]
 */
export const TEXTSPLIT: FormulaFunction = (
  text,
  colDelimiter,
  rowDelimiter?,
  ignoreEmpty?,
  matchMode?,
  padWith?
): FormulaValue => {
  // Convert text to string
  const str = toString(text);
  if (str instanceof Error) return str;

  // Convert column delimiter
  const colDelim = toString(colDelimiter);
  if (colDelim instanceof Error) return colDelim;

  // Validate column delimiter is not empty
  if (colDelim === '') {
    return new Error('#VALUE!');
  }

  // Handle optional row delimiter
  let rowDelim: string | null = null;
  if (rowDelimiter !== undefined && rowDelimiter !== null && rowDelimiter !== '') {
    const rd = toString(rowDelimiter);
    if (rd instanceof Error) return rd;
    rowDelim = rd;
  }

  // Handle ignoreEmpty flag (default FALSE)
  const shouldIgnoreEmpty = ignoreEmpty === true || ignoreEmpty === 1;

  // Handle match mode (0 = case-sensitive, 1 = case-insensitive)
  const caseInsensitive = matchMode === 1;

  // Handle pad value (default #N/A error)
  const padValue = padWith !== undefined && padWith !== null ? padWith : new Error('#N/A');

  // Helper function to split by delimiter with optional case-insensitive matching
  const splitByDelimiter = (input: string, delimiter: string): string[] => {
    if (caseInsensitive) {
      // Case-insensitive split
      const delimLower = delimiter.toLowerCase();
      const parts: string[] = [];
      let current = '';
      let i = 0;

      while (i < input.length) {
        let found = false;
        if (i + delimiter.length <= input.length) {
          const slice = input.substring(i, i + delimiter.length);
          if (slice.toLowerCase() === delimLower) {
            parts.push(current);
            current = '';
            i += delimiter.length;
            found = true;
          }
        }
        if (!found) {
          current += input[i];
          i++;
        }
      }
      parts.push(current);
      return parts;
    } else {
      // Case-sensitive split (standard)
      return input.split(delimiter);
    }
  };

  // If no row delimiter, split by column delimiter only (returns 1D horizontal array as 2D)
  if (rowDelim === null) {
    let parts = splitByDelimiter(str, colDelim);

    // Filter empty values if requested
    if (shouldIgnoreEmpty) {
      parts = parts.filter(p => p !== '');
    }

    // Return as 2D array (single row, multiple columns)
    // Excel TEXTSPLIT always returns 2D arrays for spill behavior
    return [parts];
  }

  // Split by row delimiter first
  let rows = splitByDelimiter(str, rowDelim);

  // Filter empty rows if requested
  if (shouldIgnoreEmpty) {
    rows = rows.filter(r => r !== '');
  }

  // Split each row by column delimiter
  const result: FormulaValue[][] = rows.map(row => {
    let cols = splitByDelimiter(row, colDelim);
    
    // Filter empty columns if requested
    if (shouldIgnoreEmpty) {
      cols = cols.filter(c => c !== '');
    }
    
    return cols;
  });

  // Only pad rows if NOT ignoring empty values
  if (!shouldIgnoreEmpty) {
    // Find maximum column count for padding
    const maxCols = Math.max(...result.map(row => row.length));

    // Pad rows to have equal column counts
    const paddedResult = result.map(row => {
      const padded = [...row];
      while (padded.length < maxCols) {
        padded.push(padValue);
      }
      return padded;
    });

    return paddedResult;
  }

  return result;
};

// ============================================================================
// Week 11 Day 3: Text Enhancement Functions
// ============================================================================

/**
 * CONCAT - Concatenates text from multiple ranges and/or strings
 * Modern replacement for CONCATENATE with enhanced array support
 * 
 * Syntax: CONCAT(text1, [text2], ...)
 * 
 * @param {...FormulaValue[]} args - Text items to join (can be ranges, arrays, or strings)
 * @returns {string | Error} - Concatenated string
 * 
 * Examples:
 * - CONCAT("Hello", " ", "World") → "Hello World"
 * - CONCAT(A1:A3) → Joins all values from A1 to A3
 * - CONCAT(A1:A2, " - ", B1:B2) → "A1 - B1A2 - B2"
 * 
 * Notes:
 * - Unlike CONCATENATE, CONCAT accepts ranges and flattens them automatically
 * - Empty cells are treated as empty strings
 * - Errors in arguments are ignored (converted to empty string)
 * - More flexible and modern than CONCATENATE
 */
export const CONCAT: FormulaFunction = (...args) => {
  // Recursive flatten function to handle nested arrays
  const flatten = (arr: FormulaValue[]): FormulaValue[] => {
    const result: FormulaValue[] = [];
    for (const item of arr) {
      if (Array.isArray(item)) {
        result.push(...flatten(item));
      } else {
        result.push(item);
      }
    }
    return result;
  };

  const flat = flatten(args);
  const strings = flat.map(v => {
    // Skip errors
    if (v instanceof Error) return '';
    
    // Handle null/undefined as empty string
    if (v === null || v === undefined) return '';
    
    // Convert to string
    const str = toString(v);
    return str instanceof Error ? '' : str;
  });

  return strings.join('');
};

/**
 * PROPER - Capitalizes the first letter of each word
 * 
 * Syntax: PROPER(text)
 * 
 * @param {FormulaValue} text - Text to convert to proper case
 * @returns {string | Error} - Text with first letter of each word capitalized
 * 
 * Examples:
 * - PROPER("hello world") → "Hello World"
 * - PROPER("JOHN SMITH") → "John Smith"
 * - PROPER("2-way street") → "2-Way Street"
 * - PROPER("alice's book") → "Alice'S Book"
 * 
 * Notes:
 * - First letter after any non-letter character is capitalized
 * - Numbers and symbols separate words
 * - Compatible with Excel's PROPER behavior
 */
export const PROPER: FormulaFunction = (text) => {
  const str = toString(text);
  if (str instanceof Error) return str;

  // Capitalize first letter after any non-letter character
  return str.toLowerCase().replace(/(^|[^a-zA-Z])([a-zA-Z])/g, (match, separator, letter) => {
    return separator + letter.toUpperCase();
  });
};

/**
 * CLEAN - Removes non-printable characters from text
 * 
 * Syntax: CLEAN(text)
 * 
 * @param {FormulaValue} text - Text to clean
 * @returns {string | Error} - Text with non-printable characters removed
 * 
 * Examples:
 * - CLEAN("Hello" + CHAR(7) + "World") → "HelloWorld"
 * - CLEAN("Line1" + CHAR(10) + "Line2") → "Line1Line2"
 * - CLEAN("Text" + CHAR(13) + CHAR(10)) → "Text" (removes CRLF)
 * 
 * Notes:
 * - Removes characters 0-31 (ASCII control characters)
 * - CHAR(32) (space) and above are preserved
 * - Useful for data imported from other systems or web sources
 */
export const CLEAN: FormulaFunction = (text) => {
  const str = toString(text);
  if (str instanceof Error) return str;

  // Remove ASCII control characters (0-31)
  // eslint-disable-next-line no-control-regex
  return str.replace(/[\x00-\x1F]/g, '');
};

/**
 * UNICHAR - Returns Unicode character by code point
 * 
 * Syntax: UNICHAR(number)
 * 
 * @param {FormulaValue} number - Unicode code point (0 to 1,114,111)
 * @returns {string | Error} - Unicode character
 * 
 * Examples:
 * - UNICHAR(65) → "A"
 * - UNICHAR(9733) → "★"
 * - UNICHAR(128515) → "😃"
 * - UNICHAR(8364) → "€"
 * 
 * Notes:
 * - Supports full Unicode range (up to 0x10FFFF = 1,114,111)
 * - Returns #VALUE! for invalid code points
 * - More powerful than CHAR (which is limited to 1-255)
 * - Handles surrogate pairs correctly for emoji and special characters
 */
export const UNICHAR: FormulaFunction = (number) => {
  const num = toNumber(number);
  if (num instanceof Error) return num;

  // Unicode range: 0 to 0x10FFFF (1,114,111)
  if (num < 0 || num > 0x10FFFF || Math.floor(num) !== num) {
    return new Error('#VALUE!');
  }

  // Handle surrogate pairs for code points > 0xFFFF
  try {
    return String.fromCodePoint(num);
  } catch {
    return new Error('#VALUE!');
  }
};

/**
 * UNICODE - Returns Unicode code point of first character
 * 
 * Syntax: UNICODE(text)
 * 
 * @param {FormulaValue} text - Text whose first character code point you want
 * @returns {number | Error} - Unicode code point of first character
 * 
 * Examples:
 * - UNICODE("A") → 65
 * - UNICODE("★") → 9733
 * - UNICODE("😃") → 128515
 * - UNICODE("€100") → 8364
 * 
 * Notes:
 * - Returns code point for first character only
 * - Returns #VALUE! for empty string
 * - Handles surrogate pairs correctly for emoji and special characters
 * - Inverse of UNICHAR function
 */
export const UNICODE: FormulaFunction = (text) => {
  const str = toString(text);
  if (str instanceof Error) return str;

  if (str.length === 0) return new Error('#VALUE!');

  // Handle surrogate pairs correctly
  const codePoint = str.codePointAt(0);
  if (codePoint === undefined) return new Error('#VALUE!');

  return codePoint;
};

/**
 * DOLLAR - Formats number as currency text
 * 
 * Syntax: DOLLAR(number, [decimals])
 * 
 * @param {FormulaValue} number - Number to format
 * @param {FormulaValue} decimals - Number of decimal places (default: 2)
 * @returns {string | Error} - Formatted currency string
 * 
 * Examples:
 * - DOLLAR(1234.567) → "$1,234.57"
 * - DOLLAR(1234.567, 4) → "$1,234.5670"
 * - DOLLAR(-1234.567) → "($1,234.57)"
 * - DOLLAR(1234.567, 0) → "$1,235"
 * 
 * Notes:
 * - Negative numbers shown in parentheses
 * - Includes thousands separator (comma)
 * - Rounds to specified decimal places
 * - Default is 2 decimal places
 */
export const DOLLAR: FormulaFunction = (number, decimals = 2) => {
  const num = toNumber(number);
  const dec = toNumber(decimals);

  if (num instanceof Error) return num;
  if (dec instanceof Error) return dec;

  // Validate decimals is non-negative integer
  if (dec < 0 || Math.floor(dec) !== dec) {
    return new Error('#VALUE!');
  }

  const isNegative = num < 0;
  const absNum = Math.abs(num);

  // Round to specified decimal places
  const rounded = Number(absNum.toFixed(dec));

  // Split into integer and decimal parts
  const parts = rounded.toFixed(dec).split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1] || '';

  // Add thousands separators
  const withCommas = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // Format result
  const formatted = dec > 0 ? `${withCommas}.${decimalPart}` : withCommas;

  // Return with currency symbol and handle negatives
  return isNegative ? `($${formatted})` : `$${formatted}`;
};

/**
 * FIXED - Formats number as text with fixed decimal places
 * 
 * Syntax: FIXED(number, [decimals], [no_commas])
 * 
 * @param {FormulaValue} number - Number to format
 * @param {FormulaValue} decimals - Number of decimal places (default: 2)
 * @param {FormulaValue} noCommas - TRUE to omit commas, FALSE to include (default: FALSE)
 * @returns {string | Error} - Formatted number string
 * 
 * Examples:
 * - FIXED(1234.567) → "1,234.57"
 * - FIXED(1234.567, 1) → "1,234.6"
 * - FIXED(1234.567, -1) → "1,230"
 * - FIXED(1234.567, 1, TRUE) → "1234.6"
 * 
 * Notes:
 * - Rounds to specified decimal places
 * - Can round to left of decimal point with negative decimals
 * - Includes thousands separator unless no_commas is TRUE
 * - Always returns string
 */
export const FIXED: FormulaFunction = (number, decimals = 2, noCommas = false) => {
  const num = toNumber(number);
  const dec = toNumber(decimals);

  if (num instanceof Error) return num;
  if (dec instanceof Error) return dec;

  // Validate decimals is integer
  if (Math.floor(dec) !== dec) {
    return new Error('#VALUE!');
  }

  // Handle negative decimals (round to left of decimal point)
  let rounded: number;
  if (dec < 0) {
    const factor = Math.pow(10, -dec);
    rounded = Math.round(num / factor) * factor;
  } else {
    rounded = Number(num.toFixed(dec));
  }

  // Format with appropriate decimal places
  const formatted = dec >= 0 ? rounded.toFixed(dec) : rounded.toString();

  // Add thousands separators if requested
  if (!noCommas) {
    const parts = formatted.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];

    // Handle negative sign
    const isNegative = integerPart.startsWith('-');
    const absInteger = isNegative ? integerPart.slice(1) : integerPart;

    const withCommas = absInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const result = decimalPart !== undefined ? `${withCommas}.${decimalPart}` : withCommas;

    return isNegative ? `-${result}` : result;
  }

  return formatted;
};

/**
 * TEXTBEFORE - Extracts text before a delimiter
 * 
 * Syntax: TEXTBEFORE(text, delimiter, [instance_num], [match_mode], [match_end], [if_not_found])
 * 
 * @param {FormulaValue} text - Text to search
 * @param {FormulaValue} delimiter - Delimiter to search for
 * @param {FormulaValue} instanceNum - Which occurrence (default: 1)
 * @param {FormulaValue} matchMode - 0 = case-sensitive, 1 = case-insensitive (default: 0)
 * @param {FormulaValue} matchEnd - Return text before end if delimiter not found (default: error)
 * @param {FormulaValue} ifNotFound - Value to return if not found (default: #N/A)
 * @returns {string | Error} - Text before delimiter
 * 
 * Examples:
 * - TEXTBEFORE("Hello-World", "-") → "Hello"
 * - TEXTBEFORE("A:B:C", ":", 2) → "A:B"
 * - TEXTBEFORE("test@example.com", "@") → "test"
 * 
 * Notes:
 * - Returns text before the specified occurrence of delimiter
 * - Negative instance_num counts from end
 * - Case-sensitive by default
 */
export const TEXTBEFORE: FormulaFunction = (
  text,
  delimiter,
  instanceNum = 1,
  matchMode = 0,
  matchEnd = 0,
  ifNotFound?: FormulaValue
) => {
  const str = toString(text);
  const delim = toString(delimiter);
  const instance = toNumber(instanceNum);
  const mode = toNumber(matchMode);
  const end = toNumber(matchEnd);

  if (str instanceof Error) return str;
  if (delim instanceof Error) return delim;
  if (instance instanceof Error) return instance;
  if (mode instanceof Error) return mode;
  if (end instanceof Error) return end;

  // Validate instance number
  if (instance === 0 || Math.floor(instance) !== instance) {
    return new Error('#VALUE!');
  }

  // Prepare search strings based on match mode
  const searchStr = mode === 0 ? str : str.toLowerCase();
  const searchDelim = mode === 0 ? delim : delim.toLowerCase();

  // Find all occurrences
  const occurrences: number[] = [];
  let pos = 0;
  while ((pos = searchStr.indexOf(searchDelim, pos)) !== -1) {
    occurrences.push(pos);
    pos += searchDelim.length;
  }

  // Handle not found
  if (occurrences.length === 0) {
    if (end !== 0) {
      return str; // Return full text
    }
    if (ifNotFound !== undefined) {
      const result = toString(ifNotFound);
      return result instanceof Error ? result : result;
    }
    return new Error('#N/A');
  }

  // Get the target occurrence
  let targetIndex: number;
  if (instance > 0) {
    targetIndex = instance - 1;
  } else {
    targetIndex = occurrences.length + instance;
  }

  // Check if instance exists
  if (targetIndex < 0 || targetIndex >= occurrences.length) {
    if (ifNotFound !== undefined) {
      const result = toString(ifNotFound);
      return result instanceof Error ? result : result;
    }
    return new Error('#N/A');
  }

  return str.substring(0, occurrences[targetIndex]);
};

/**
 * TEXTAFTER - Extracts text after a delimiter
 * 
 * Syntax: TEXTAFTER(text, delimiter, [instance_num], [match_mode], [match_end], [if_not_found])
 * 
 * @param {FormulaValue} text - Text to search
 * @param {FormulaValue} delimiter - Delimiter to search for
 * @param {FormulaValue} instanceNum - Which occurrence (default: 1)
 * @param {FormulaValue} matchMode - 0 = case-sensitive, 1 = case-insensitive (default: 0)
 * @param {FormulaValue} matchEnd - Return text after start if delimiter not found (default: error)
 * @param {FormulaValue} ifNotFound - Value to return if not found (default: #N/A)
 * @returns {string | Error} - Text after delimiter
 * 
 * Examples:
 * - TEXTAFTER("Hello-World", "-") → "World"
 * - TEXTAFTER("A:B:C", ":", -1) → "C" (last occurrence)
 * - TEXTAFTER("user@example.com", "@") → "example.com"
 * 
 * Notes:
 * - Returns text after the specified occurrence of delimiter
 * - Negative instance_num counts from end
 * - Case-sensitive by default
 */
export const TEXTAFTER: FormulaFunction = (
  text,
  delimiter,
  instanceNum = 1,
  matchMode = 0,
  matchEnd = 0,
  ifNotFound?: FormulaValue
) => {
  const str = toString(text);
  const delim = toString(delimiter);
  const instance = toNumber(instanceNum);
  const mode = toNumber(matchMode);
  const end = toNumber(matchEnd);

  if (str instanceof Error) return str;
  if (delim instanceof Error) return delim;
  if (instance instanceof Error) return instance;
  if (mode instanceof Error) return mode;
  if (end instanceof Error) return end;

  // Validate instance number
  if (instance === 0 || Math.floor(instance) !== instance) {
    return new Error('#VALUE!');
  }

  // Prepare search strings based on match mode
  const searchStr = mode === 0 ? str : str.toLowerCase();
  const searchDelim = mode === 0 ? delim : delim.toLowerCase();

  // Find all occurrences
  const occurrences: number[] = [];
  let pos = 0;
  while ((pos = searchStr.indexOf(searchDelim, pos)) !== -1) {
    occurrences.push(pos);
    pos += searchDelim.length;
  }

  // Handle not found
  if (occurrences.length === 0) {
    if (end !== 0) {
      return str; // Return full text
    }
    if (ifNotFound !== undefined) {
      const result = toString(ifNotFound);
      return result instanceof Error ? result : result;
    }
    return new Error('#N/A');
  }

  // Get the target occurrence
  let targetIndex: number;
  if (instance > 0) {
    targetIndex = instance - 1;
  } else {
    targetIndex = occurrences.length + instance;
  }

  // Check if instance exists
  if (targetIndex < 0 || targetIndex >= occurrences.length) {
    if (ifNotFound !== undefined) {
      const result = toString(ifNotFound);
      return result instanceof Error ? result : result;
    }
    return new Error('#N/A');
  }

  return str.substring(occurrences[targetIndex] + delim.length);
};
