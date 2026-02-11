/**
 * lookup-functions.ts
 * 
 * Lookup and reference formula functions.
 * Excel-compatible VLOOKUP, HLOOKUP, XLOOKUP, INDEX, MATCH, etc.
 */

import type { FormulaFunction, FormulaValue } from '../../types/formula-types';
import { toNumber, toString, compareValues } from '../../utils/type-utils';
import { is2DArray, isArray } from '../../utils/type-utils';
import { validateRange } from '../../utils/validation-utils';

/**
 * VLOOKUP - Vertical lookup
 */
export const VLOOKUP: FormulaFunction = (lookupValue, tableArray, colIndexNum, rangeLookup = true) => {
  if (!is2DArray(tableArray)) {
    return new Error('#VALUE!');
  }

  const colIndex = toNumber(colIndexNum);
  if (colIndex instanceof Error) return colIndex;

  const table = tableArray as FormulaValue[][];
  
  if (colIndex < 1 || colIndex > table[0].length) {
    return new Error('#REF!');
  }

  const exact = !rangeLookup;

  // Search first column
  for (let i = 0; i < table.length; i++) {
    const cellValue = table[i][0];
    
    if (exact) {
      // Exact match
      if (compareValues(cellValue, lookupValue) === 0) {
        return table[i][colIndex - 1];
      }
    } else {
      // Approximate match (assumes sorted)
      const cmp = compareValues(cellValue, lookupValue);
      if (cmp instanceof Error) return cmp;
      if (cmp === 0) {
        return table[i][colIndex - 1];
      }
      if (cmp > 0) {
        // Passed the value
        if (i === 0) return new Error('#N/A');
        return table[i - 1][colIndex - 1];
      }
    }
  }

  // Not found
  if (exact) {
    return new Error('#N/A');
  } else {
    // Return last row for approximate match
    return table[table.length - 1][colIndex - 1];
  }
};

/**
 * HLOOKUP - Horizontal lookup
 */
export const HLOOKUP: FormulaFunction = (...args) => {
  const [lookupValue, tableArray, rowIndexNum, rangeLookup = true] = args;

  // Validate inputs
  if (!Array.isArray(tableArray) || tableArray.length === 0) {
    return new Error('#REF!');
  }
  
  // Ensure table is 2D array
  if (!Array.isArray(tableArray[0])) {
    return new Error('#REF!');
  }

  const rowIndex = typeof rowIndexNum === 'number' ? rowIndexNum : 0;
  if (rowIndex < 1 || rowIndex > tableArray.length) {
    return new Error('#REF!');
  }

  const firstRow = tableArray[0];
  const isApproximate = rangeLookup === true || rangeLookup === 1;

  // Helper: Compare values
  const compare = (a: FormulaValue, b: FormulaValue): number => {
    if (a === b) return 0;
    if (a == null) return -1;
    if (b == null) return 1;
    
    // Numeric comparison (both must be numbers)
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }
    
    // If types differ, treat as string comparison
    const aStr = String(a).toLowerCase();
    const bStr = String(b).toLowerCase();
    return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
  };

  // Helper: Wildcard matching
  const matchesWildcard = (value: FormulaValue, pattern: FormulaValue): boolean => {
    if (typeof pattern !== 'string') return false;
    
    const hasWildcard = pattern.includes('*') || pattern.includes('?');
    if (!hasWildcard) return false;

    const regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // Escape regex special chars
      .replace(/\*/g, '.*')  // * matches any sequence
      .replace(/\?/g, '.');  // ? matches single char
    
    const regex = new RegExp('^' + regexPattern + '$', 'i');
    return regex.test(String(value));
  };

  // Exact match mode (range_lookup = FALSE)
  if (!isApproximate) {
    for (let col = 0; col < firstRow.length; col++) {
      const cellValue = firstRow[col];
      
      // Check exact match (case-insensitive for text)
      if (compare(cellValue, lookupValue) === 0) {
        const targetRow = tableArray[rowIndex - 1];
        if (Array.isArray(targetRow) && col < targetRow.length) {
          return targetRow[col];
        }
        return new Error('#REF!');
      }
      
      // Check wildcard match if lookup value contains wildcards
      if (typeof lookupValue === 'string' && matchesWildcard(cellValue, lookupValue)) {
        const targetRow = tableArray[rowIndex - 1];
        if (Array.isArray(targetRow) && col < targetRow.length) {
          return targetRow[col];
        }
        return new Error('#REF!');
      }
    }
    
    return new Error('#N/A');
  }

  // Approximate match mode (range_lookup = TRUE)
  // First row must be sorted in ascending order
  let bestCol = -1;
  
  for (let col = 0; col < firstRow.length; col++) {
    const cellValue = firstRow[col];
    
    // Skip cells with incompatible types (e.g., string header when looking for number)
    const lookupIsNumber = typeof lookupValue === 'number';
    const cellIsNumber = typeof cellValue === 'number';
    
    if (lookupIsNumber !== cellIsNumber) {
      continue;  // Skip type mismatches in approximate mode
    }
    
    const cmp = compare(cellValue, lookupValue);
    
    if (cmp === 0) {
      // Exact match found
      bestCol = col;
      break;
    } else if (cmp < 0) {
      // Cell value is less than lookup value
      // This is a potential match (largest value <= lookup)
      bestCol = col;
    } else {
      // Cell value is greater than lookup value
      // Stop searching (assumes sorted order)
      break;
    }
  }
  
  if (bestCol >= 0) {
    const targetRow = tableArray[rowIndex - 1];
    if (Array.isArray(targetRow) && bestCol < targetRow.length) {
      return targetRow[bestCol];
    }
    return new Error('#REF!');
  }
  
  return new Error('#N/A');
};

/**
 * INDEX - Returns value at row/column intersection
 */
export const INDEX: FormulaFunction = (array, rowNum, colNum?) => {
  // Check if input is an array
  if (!isArray(array) && !is2DArray(array)) {
    return new Error('#REF!');
  }

  if (is2DArray(array)) {
    const arr = array as FormulaValue[][];
    
    // Check for empty array
    if (arr.length === 0 || arr[0].length === 0) {
      return new Error('#REF!');
    }
    
    // Convert row to number
    const row = typeof rowNum === 'number' ? rowNum : 
                 typeof rowNum === 'string' ? parseFloat(rowNum) : 
                 typeof rowNum === 'boolean' ? (rowNum ? 1 : 0) : 0;
    
    if (isNaN(row)) return new Error('#VALUE!');
    
    // Handle optional column parameter
    const col = colNum === undefined ? undefined :
                typeof colNum === 'number' ? colNum :
                typeof colNum === 'string' ? parseFloat(colNum) :
                typeof colNum === 'boolean' ? (colNum ? 1 : 0) : 0;
    
    if (col !== undefined && isNaN(col)) return new Error('#VALUE!');

    // Special case: row=0 means return entire column
    if (row === 0 && col !== undefined && col > 0) {
      if (col > arr[0].length) return new Error('#REF!');
      const result: FormulaValue[] = [];
      for (let i = 0; i < arr.length; i++) {
        result.push(arr[i][col - 1]);
      }
      return result;
    }

    // Special case: col=0 means return entire row
    if (col === 0 && row > 0) {
      if (row > arr.length) return new Error('#REF!');
      return arr[row - 1];
    }

    // Normal case: both row and col specified
    if (row < 1 || row > arr.length) return new Error('#REF!');

    // If colNum not provided, return entire row
    if (col === undefined) {
      return arr[row - 1];
    }

    if (col < 1 || col > arr[row - 1].length) return new Error('#REF!');

    return arr[row - 1][col - 1];
  }

  if (isArray(array)) {
    const arr = array as FormulaValue[];
    
    // Check for empty array
    if (arr.length === 0) {
      return new Error('#REF!');
    }
    
    const index = typeof rowNum === 'number' ? rowNum :
                  typeof rowNum === 'string' ? parseFloat(rowNum) :
                  typeof rowNum === 'boolean' ? (rowNum ? 1 : 0) : 0;
    
    if (isNaN(index)) return new Error('#VALUE!');
    if (index < 1 || index > arr.length) return new Error('#REF!');

    return arr[index - 1];
  }

  return new Error('#REF!');
};

/**
 * MATCH - Returns position of value in array
 */
export const MATCH: FormulaFunction = (lookupValue, lookupArray, matchType = 1) => {
  const type = toNumber(matchType);
  if (type instanceof Error) return type;

  let arr: FormulaValue[];
  
  if (is2DArray(lookupArray)) {
    // Flatten to 1D if 2D
    const arr2d = lookupArray as FormulaValue[][];
    arr = arr2d[0].length === 1 
      ? arr2d.map(row => row[0]) 
      : arr2d[0];
  } else if (isArray(lookupArray)) {
    arr = lookupArray as FormulaValue[];
  } else {
    return new Error('#N/A');
  }
  
  // Check for empty array
  if (arr.length === 0) {
    return new Error('#N/A');
  }

  if (type === 0) {
    // Exact match
    for (let i = 0; i < arr.length; i++) {
      if (compareValues(arr[i], lookupValue) === 0) {
        return i + 1; // 1-based index
      }
    }
    return new Error('#N/A');
  }

  if (type === 1) {
    // Largest value <= lookup (assumes sorted ascending)
    let lastMatch = -1;
    for (let i = 0; i < arr.length; i++) {
      const cmp = compareValues(arr[i], lookupValue);
      if (cmp instanceof Error) return cmp;
      if (cmp === 0) return i + 1;
      if (cmp > 0) break;
      lastMatch = i;
    }
    return lastMatch >= 0 ? lastMatch + 1 : new Error('#N/A');
  }

  if (type === -1) {
    // Smallest value >= lookup (assumes sorted descending)
    // Array is sorted descending, so we scan left to right
    // We want the LAST value that is >= lookup (the smallest one)
    let lastMatch = -1;
    for (let i = 0; i < arr.length; i++) {
      const cmp = compareValues(arr[i], lookupValue);
      if (cmp instanceof Error) return cmp;
      if (cmp === 0) return i + 1;  // Exact match
      if (cmp < 0) break;  // arr[i] < lookup, stop here
      lastMatch = i;  // arr[i] > lookup, keep as potential match
    }
    return lastMatch >= 0 ? lastMatch + 1 : new Error('#N/A');
  }

  return new Error('#VALUE!');
};

/**
 * XLOOKUP - Excel 365 enhanced lookup
 */
export const XLOOKUP: FormulaFunction = (...args) => {
  const [lookupValue, lookupArray, returnArray, ifNotFound = new Error('#N/A'), matchMode = 0, searchMode = 1] = args;

  // Validate inputs
  if (!Array.isArray(lookupArray)) return new Error('#VALUE!');
  if (!Array.isArray(returnArray)) return new Error('#VALUE!');
  if (lookupArray.length !== returnArray.length) return new Error('#VALUE!');
  if (lookupArray.length === 0) return new Error('#N/A');

  const matchModeNum = typeof matchMode === 'number' ? matchMode : 0;
  const searchModeNum = typeof searchMode === 'number' ? searchMode : 1;

  // Helper: Compare values
  const compare = (a: FormulaValue, b: FormulaValue): number => {
    if (a === b) return 0;
    if (a == null) return -1;
    if (b == null) return 1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    const aStr = String(a).toLowerCase();
    const bStr = String(b).toLowerCase();
    return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
  };

  // Helper: Wildcard match
  const wildcardMatch = (text: string, pattern: string): boolean => {
    const regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')  // Escape regex special chars except * and ?
      .replace(/\*/g, '.*')                    // * matches any characters
      .replace(/\?/g, '.');                    // ? matches single character
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(text);
  };

  // Binary search helper
  const binarySearch = (ascending: boolean): number => {
    let left = 0;
    let right = lookupArray.length - 1;
    let result = -1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const cmp = compare(lookupArray[mid], lookupValue);

      if (cmp === 0) {
        return mid;  // Exact match
      }

      if (ascending) {
        if (cmp < 0) {
          result = mid;  // Potential next smallest
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      } else {
        if (cmp > 0) {
          result = mid;  // Potential next largest
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      }
    }

    return result;
  };

  // Search logic based on search_mode
  let foundIndex = -1;

  if (searchModeNum === 2) {
    // Binary search (ascending)
    foundIndex = binarySearch(true);
  } else if (searchModeNum === -2) {
    // Binary search (descending)
    foundIndex = binarySearch(false);
  } else {
    // Linear search
    const startIdx = searchModeNum === -1 ? lookupArray.length - 1 : 0;
    const endIdx = searchModeNum === -1 ? -1 : lookupArray.length;
    const step = searchModeNum === -1 ? -1 : 1;

    if (matchModeNum === 2) {
      // Wildcard match
      const pattern = String(lookupValue);
      for (let i = startIdx; i !== endIdx; i += step) {
        if (wildcardMatch(String(lookupArray[i]), pattern)) {
          foundIndex = i;
          break;
        }
      }
    } else if (matchModeNum === 0) {
      // Exact match
      for (let i = startIdx; i !== endIdx; i += step) {
        if (compare(lookupArray[i], lookupValue) === 0) {
          foundIndex = i;
          break;
        }
      }
    } else if (matchModeNum === -1) {
      // Exact match or next smallest
      let bestIdx = -1;
      let bestValue: FormulaValue = null;

      for (let i = startIdx; i !== endIdx; i += step) {
        const cmp = compare(lookupArray[i], lookupValue);
        if (cmp === 0) {
          foundIndex = i;
          break;
        } else if (cmp < 0) {
          if (bestIdx === -1 || compare(lookupArray[i], bestValue) > 0) {
            bestIdx = i;
            bestValue = lookupArray[i];
          }
        }
      }

      if (foundIndex === -1) foundIndex = bestIdx;
    } else if (matchModeNum === 1) {
      // Exact match or next largest
      let bestIdx = -1;
      let bestValue: FormulaValue = null;

      for (let i = startIdx; i !== endIdx; i += step) {
        const cmp = compare(lookupArray[i], lookupValue);
        if (cmp === 0) {
          foundIndex = i;
          break;
        } else if (cmp > 0) {
          if (bestIdx === -1 || compare(lookupArray[i], bestValue) < 0) {
            bestIdx = i;
            bestValue = lookupArray[i];
          }
        }
      }

      if (foundIndex === -1) foundIndex = bestIdx;
    }
  }

  // Return result or not-found value
  if (foundIndex >= 0) {
    return returnArray[foundIndex];
  }

  return ifNotFound;
};

/**
 * XMATCH - Excel 365 enhanced match
 */
export const XMATCH: FormulaFunction = (...args) => {
  const [lookupValue, lookupArray, matchMode = 0, searchMode = 1] = args;

  // Validate inputs
  if (lookupValue === undefined) return new Error('#VALUE!');
  if (!Array.isArray(lookupArray)) return new Error('#VALUE!');
  if (lookupArray.length === 0) return new Error('#N/A');

  const matchModeNum = typeof matchMode === 'number' ? matchMode : 0;
  const searchModeNum = typeof searchMode === 'number' ? searchMode : 1;

  // Validate modes
  if (![0, -1, 1, 2].includes(matchModeNum)) return new Error('#VALUE!');
  if (![1, -1, 2, -2].includes(searchModeNum)) return new Error('#VALUE!');

  // Helper: Compare values (numeric aware, case-insensitive for strings)
  const compare = (a: FormulaValue, b: FormulaValue): number => {
    if (a === b) return 0;
    if (a == null) return -1;
    if (b == null) return 1;
    
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }
    
    const aStr = String(a).toLowerCase();
    const bStr = String(b).toLowerCase();
    return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
  };

  // Helper: Wildcard match (for match_mode=2)
  const wildcardMatch = (text: string, pattern: string): boolean => {
    // Escape special regex chars except * and ?
    let regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(text);
  };

  // BINARY SEARCH modes (2 or -2)
  if (Math.abs(searchModeNum) === 2) {
    const isAscending = searchModeNum === 2;
    let left = 0;
    let right = lookupArray.length - 1;
    let foundIndex = -1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const cmp = compare(lookupArray[mid], lookupValue);

      if (cmp === 0) {
        foundIndex = mid;
        break;
      }

      if (isAscending) {
        if (cmp < 0) left = mid + 1;
        else right = mid - 1;
      } else {
        if (cmp > 0) left = mid + 1;
        else right = mid - 1;
      }
    }

    // For binary search, only exact match supported
    if (foundIndex >= 0) {
      return foundIndex + 1;  // 1-based
    }

    // Handle approximate match modes with binary search
    if (matchModeNum === -1) {
      // Exact or next smallest
      if (isAscending) {
        // In ascending array, right pointer is at the largest value < lookupValue
        if (right >= 0) return right + 1;
      } else {
        // In descending array, left pointer is at the smallest value that's still >= lookupValue
        // We need to find the largest value < lookupValue
        if (left < lookupArray.length && compare(lookupArray[left], lookupValue) < 0) {
          return left + 1;
        }
        if (left > 0) return left;  // Previous position
      }
    } else if (matchModeNum === 1) {
      // Exact or next largest
      if (isAscending) {
        // In ascending array, left pointer is at the smallest value > lookupValue
        if (left < lookupArray.length) return left + 1;
      } else {
        // In descending array, right pointer is at the largest value that's still <= lookupValue
        // We need the next larger, which is right+1
        if (right >= 0 && compare(lookupArray[right], lookupValue) > 0) {
          return right + 1;
        }
      }
    }

    return new Error('#N/A');
  }

  // LINEAR SEARCH modes (1 or -1)
  const isReverse = searchModeNum === -1;
  const startIdx = isReverse ? lookupArray.length - 1 : 0;
  const endIdx = isReverse ? -1 : lookupArray.length;
  const step = isReverse ? -1 : 1;

  // Match mode 0: Exact match
  if (matchModeNum === 0) {
    for (let i = startIdx; i !== endIdx; i += step) {
      if (compare(lookupArray[i], lookupValue) === 0) {
        return i + 1;  // 1-based
      }
    }
    return new Error('#N/A');
  }

  // Match mode 2: Wildcard match
  if (matchModeNum === 2) {
    const lookupStr = String(lookupValue);
    for (let i = startIdx; i !== endIdx; i += step) {
      const itemStr = String(lookupArray[i]);
      if (wildcardMatch(itemStr, lookupStr)) {
        return i + 1;  // 1-based
      }
    }
    return new Error('#N/A');
  }

  // Match mode -1: Exact or next smallest
  if (matchModeNum === -1) {
    let bestIdx = -1;
    let bestValue: FormulaValue = null;

    for (let i = startIdx; i !== endIdx; i += step) {
      const cmp = compare(lookupArray[i], lookupValue);
      if (cmp === 0) {
        return i + 1;  // Exact match found
      } else if (cmp < 0) {
        // Value is less than lookup - potential candidate
        if (bestIdx === -1 || compare(lookupArray[i], bestValue) > 0) {
          bestIdx = i;
          bestValue = lookupArray[i];
        }
      }
    }

    if (bestIdx >= 0) return bestIdx + 1;
    return new Error('#N/A');
  }

  // Match mode 1: Exact or next largest
  if (matchModeNum === 1) {
    let bestIdx = -1;
    let bestValue: FormulaValue = null;

    for (let i = startIdx; i !== endIdx; i += step) {
      const cmp = compare(lookupArray[i], lookupValue);
      if (cmp === 0) {
        return i + 1;  // Exact match found
      } else if (cmp > 0) {
        // Value is greater than lookup - potential candidate
        if (bestIdx === -1 || compare(lookupArray[i], bestValue) < 0) {
          bestIdx = i;
          bestValue = lookupArray[i];
        }
      }
    }

    if (bestIdx >= 0) return bestIdx + 1;
    return new Error('#N/A');
  }

  return new Error('#N/A');
};

/**
 * LOOKUP - Simple lookup (array or vector form)
 */
export const LOOKUP: FormulaFunction = (lookupValue, ...args) => {
  if (args.length === 1) {
    // Array form: LOOKUP(value, array)
    const array = args[0];
    
    if (!is2DArray(array)) {
      return new Error('#VALUE!');
    }

    const arr = array as FormulaValue[][];
    const firstRow = arr[0];
    const lastRow = arr[arr.length - 1];

    // Search first row/column
    let lastMatch = -1;
    for (let i = 0; i < firstRow.length; i++) {
      const cmp = compareValues(firstRow[i], lookupValue);
      if (cmp instanceof Error) return cmp;
      if (cmp === 0) return lastRow[i];
      if (cmp > 0) break;
      lastMatch = i;
    }

    return lastMatch >= 0 ? lastRow[lastMatch] : new Error('#N/A');
  }

  if (args.length === 2) {
    // Vector form: LOOKUP(value, lookupVector, resultVector)
    const lookupVector = args[0];
    const resultVector = args[1];

    if (!isArray(lookupVector) || !isArray(resultVector)) {
      return new Error('#VALUE!');
    }

    const lookupArr = lookupVector as FormulaValue[];
    const resultArr = resultVector as FormulaValue[];

    // Find largest value <= lookup
    let lastMatch = -1;
    for (let i = 0; i < lookupArr.length; i++) {
      const cmp = compareValues(lookupArr[i], lookupValue);
      if (cmp instanceof Error) return cmp;
      if (cmp === 0) return resultArr[i];
      if (cmp > 0) break;
      lastMatch = i;
    }

    return lastMatch >= 0 ? resultArr[lastMatch] : new Error('#N/A');
  }

  return new Error('#VALUE!');
};

/**
 * OFFSET - Returns reference offset from starting point
 */
/**
 * OFFSET - Returns reference offset from starting reference
 */
export const OFFSET: FormulaFunction = (
  reference,
  rows,
  cols,
  height?,
  width?
) => {
  // Validate reference is an array
  if (!Array.isArray(reference)) {
    return new Error('#REF!');
  }

  // Validate offsets are numeric
  if (typeof rows !== 'number' || typeof cols !== 'number') {
    return new Error('#VALUE!');
  }

  // Convert offsets to integers
  const rowsOffset = Math.floor(rows);
  const colsOffset = Math.floor(cols);

  // Determine if reference is 1D or 2D
  const is2D = Array.isArray(reference[0]);
  
  let refHeight: number;
  let refWidth: number;
  let sourceArray: any[][];

  if (is2D) {
    // 2D array
    sourceArray = reference as any[][];
    refHeight = sourceArray.length;
    refWidth = refHeight > 0 ? sourceArray[0].length : 0;
  } else {
    // 1D array - treat as single row
    sourceArray = [reference];
    refHeight = 1;
    refWidth = reference.length;
  }

  // Determine result dimensions
  let resultHeight: number;
  let resultWidth: number;
  
  if (typeof height === 'number') {
    resultHeight = Math.floor(height);
    if (resultHeight <= 0) {
      return new Error('#REF!');
    }
  } else {
    // Use remaining rows after offset
    resultHeight = refHeight - rowsOffset;
  }
  
  if (typeof width === 'number') {
    resultWidth = Math.floor(width);
    if (resultWidth <= 0) {
      return new Error('#REF!');
    }
  } else {
    // Use remaining columns after offset
    resultWidth = refWidth - colsOffset;
  }

  // Validate final dimensions
  if (resultHeight <= 0 || resultWidth <= 0) {
    return new Error('#REF!');
  }

  // Calculate starting position
  const startRow = rowsOffset;
  const startCol = colsOffset;

  // Validate bounds
  if (startRow < 0 || startCol < 0) {
    return new Error('#REF!');
  }

  // Validate end position
  const endRow = startRow + resultHeight;
  const endCol = startCol + resultWidth;

  if (endRow > refHeight || endCol > refWidth) {
    return new Error('#REF!');
  }

  // Extract the offset range
  const result: any[][] = [];
  
  for (let r = 0; r < resultHeight; r++) {
    const sourceRow = sourceArray[startRow + r];
    if (!sourceRow) {
      return new Error('#REF!');
    }

    const resultRow: any[] = [];
    for (let c = 0; c < resultWidth; c++) {
      const sourceCol = startCol + c;
      if (sourceCol >= sourceRow.length) {
        return new Error('#REF!');
      }
      resultRow.push(sourceRow[sourceCol]);
    }
    result.push(resultRow);
  }

  // Return format based on result dimensions
  if (resultHeight === 1 && resultWidth === 1) {
    // Single cell
    return result[0][0];
  } else if (resultHeight === 1) {
    // Single row
    return result[0];
  } else if (resultWidth === 1) {
    // Single column
    return result.map(row => row[0]);
  } else {
    // Multi-row, multi-column
    return result;
  }
};

/**
 * INDIRECT - Returns reference from text
 */
/**
 * INDIRECT - Returns reference specified by text string
 */
export const INDIRECT: FormulaFunction = (refText, a1Style = true) => {
  if (typeof refText !== 'string') {
    return new Error('#VALUE!');
  }

  const isA1 = a1Style === true || a1Style === 1;

  // Helper: Parse A1-style reference (e.g., "A1", "B5", "AA100")
  const parseA1Reference = (ref: string): { row: number; col: number } | null => {
    const match = ref.match(/^([A-Z]+)(\d+)$/i);
    if (!match) return null;

    const colStr = match[1].toUpperCase();
    const rowStr = match[2];

    // Convert column letters to number (A=1, B=2, ..., Z=26, AA=27, etc.)
    let col = 0;
    for (let i = 0; i < colStr.length; i++) {
      col = col * 26 + (colStr.charCodeAt(i) - 65 + 1);
    }

    const row = parseInt(rowStr, 10);

    if (row < 1 || col < 1 || row > 1048576 || col > 16384) {
      return null; // Excel limits
    }

    return { row, col };
  };

  // Helper: Parse R1C1-style reference
  const parseR1C1Reference = (ref: string): { row: number; col: number } | null => {
    const match = ref.match(/^R(\d+)C(\d+)$/i);
    if (!match) return null;

    const row = parseInt(match[1], 10);
    const col = parseInt(match[2], 10);

    if (row < 1 || col < 1 || row > 1048576 || col > 16384) {
      return null;
    }

    return { row, col };
  };

  // Helper: Convert column number to letters
  const colToLetters = (col: number): string => {
    let letters = '';
    while (col > 0) {
      const remainder = (col - 1) % 26;
      letters = String.fromCharCode(65 + remainder) + letters;
      col = Math.floor((col - 1) / 26);
    }
    return letters;
  };

  // Remove whitespace
  const cleanRef = refText.trim();

  // Check for sheet name
  let sheetName: string | undefined;
  let cellRef = cleanRef;
  
  const sheetSeparator = cleanRef.indexOf('!');
  if (sheetSeparator > 0) {
    sheetName = cleanRef.substring(0, sheetSeparator);
    cellRef = cleanRef.substring(sheetSeparator + 1);
  }

  // Check for range reference
  const rangeSeparator = cellRef.indexOf(':');
  if (rangeSeparator > 0) {
    const startRef = cellRef.substring(0, rangeSeparator);
    const endRef = cellRef.substring(rangeSeparator + 1);

    let start: { row: number; col: number } | null;
    let end: { row: number; col: number } | null;

    if (isA1) {
      start = parseA1Reference(startRef);
      end = parseA1Reference(endRef);
    } else {
      start = parseR1C1Reference(startRef);
      end = parseR1C1Reference(endRef);
    }

    if (!start || !end) {
      return new Error('#REF!');
    }

    // Validate range
    if (start.row > end.row || start.col > end.col) {
      return new Error('#REF!');
    }

    // Return normalized range string
    const normalizedRange = isA1
      ? `${colToLetters(start.col)}${start.row}:${colToLetters(end.col)}${end.row}`
      : `R${start.row}C${start.col}:R${end.row}C${end.col}`;

    return sheetName ? `${sheetName}!${normalizedRange}` : normalizedRange;
  }

  // Parse single cell reference
  let parsed: { row: number; col: number } | null;

  if (isA1) {
    parsed = parseA1Reference(cellRef);
  } else {
    parsed = parseR1C1Reference(cellRef);
  }

  if (!parsed) {
    return new Error('#REF!');
  }

  // Return normalized cell reference string
  const normalizedCell = isA1
    ? `${colToLetters(parsed.col)}${parsed.row}`
    : `R${parsed.row}C${parsed.col}`;

  return sheetName ? `${sheetName}!${normalizedCell}` : normalizedCell;
};

/**
 * CHOOSE - Returns value from list by index
 */
/**
 * CHOOSE - Returns value from list by index
 */
export const CHOOSE: FormulaFunction = (indexNum, ...values) => {
  const index = toNumber(indexNum);
  if (index instanceof Error) return index;

  // Floor the index (Excel truncates decimals)
  const flooredIndex = Math.floor(index);

  if (flooredIndex < 1 || flooredIndex > values.length) {
    return new Error('#VALUE!');
  }

  return values[flooredIndex - 1];
};

/**
 * ROW - Returns row number of reference
 */
export const ROW: FormulaFunction = (reference?) => {
  // Note: Requires cell reference context
  // This is a placeholder
  return new Error('#NAME?');
};

/**
 * COLUMN - Returns column number of reference
 */
export const COLUMN: FormulaFunction = (reference?) => {
  // Note: Requires cell reference context
  // This is a placeholder
  return new Error('#NAME?');
};
