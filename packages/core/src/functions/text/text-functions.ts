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
 * RIGHT - Rightmost characters
 */
export const RIGHT: FormulaFunction = (text, numChars = 1) => {
  const str = toString(text);
  const num = toNumber(numChars);

  if (str instanceof Error) return str;
  if (num instanceof Error) return num;

  if (num < 0) return new Error('#VALUE!');

  return str.slice(-num);
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
 * LEN - String length
 */
export const LEN: FormulaFunction = (text) => {
  const str = toString(text);
  if (str instanceof Error) return str;
  return str.length;
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

  // If no row delimiter, split by column delimiter only (returns 1D array)
  if (rowDelim === null) {
    let parts = splitByDelimiter(str, colDelim);

    // Filter empty values if requested
    if (shouldIgnoreEmpty) {
      parts = parts.filter(p => p !== '');
    }

    // Return as 1D horizontal array (single row)
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
