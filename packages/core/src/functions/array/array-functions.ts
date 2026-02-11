/**
 * array-functions.ts
 * 
 * Array manipulation and Excel 365 dynamic array functions.
 * Includes FILTER, SORT, UNIQUE, TRANSPOSE, SEQUENCE, and more.
 */

import type { FormulaFunction, FormulaValue } from '../../types/formula-types';
import { toNumber, toBoolean, compareValues, is2DArray } from '../../utils/type-utils';
import { flattenArray, to2DArray, transposeArray, getArrayDimensions } from '../../utils/array-utils';

/**
 * TRANSPOSE - Transpose array (swap rows and columns)
 */
export const TRANSPOSE: FormulaFunction = (array) => {
  if (!Array.isArray(array)) {
    return new Error('#VALUE!');
  }

  // Handle 1D array (convert to column vector first)
  if (!is2DArray(array)) {
    return to2DArray(array as FormulaValue[]);
  }

  return transposeArray(array as FormulaValue[][]);
};

/**
 * UNIQUE - Return unique values from array
 */
export const UNIQUE: FormulaFunction = (...args) => {
  const [array, byCol = false, exactlyOnce = false] = args;

  // Validate required parameter
  if (array === undefined) {
    return new Error('#VALUE!');
  }

  // Validate array input
  if (!Array.isArray(array)) {
    return new Error('#VALUE!');
  }

  if (array.length === 0) {
    return new Error('#CALC!');
  }

  const byColumn = byCol === true || byCol === 1;
  const onlyOnce = exactlyOnce === true || exactlyOnce === 1;

  // Check if array is 2D
  const is2D = Array.isArray(array[0]);

  // Handle 1D arrays
  if (!is2D) {
    // Create a map to count occurrences
    const countMap = new Map<string, { value: FormulaValue; count: number }>();

    for (const item of array) {
      // Use JSON.stringify for consistent key generation
      const key = JSON.stringify(item);
      
      if (countMap.has(key)) {
        countMap.get(key)!.count++;
      } else {
        countMap.set(key, { value: item, count: 1 });
      }
    }

    // Filter based on exactly_once parameter
    const result: FormulaValue[] = [];
    
    for (const { value, count } of countMap.values()) {
      if (onlyOnce) {
        // Only include values that appear exactly once
        if (count === 1) {
          result.push(value);
        }
      } else {
        // Include all unique values (first occurrence)
        result.push(value);
      }
    }

    return result.length > 0 ? result : new Error('#CALC!');
  }

  // Handle 2D arrays
  if (byColumn) {
    // Compare columns for uniqueness
    // Transpose logic: compare each column as a unit
    const numRows = array.length;
    const firstRow = array[0];
    
    // Type guard for 2D array
    if (!Array.isArray(firstRow)) {
      return new Error('#VALUE!');
    }
    
    const numCols = firstRow.length;

    // Extract columns
    const columns: FormulaValue[][] = [];
    for (let c = 0; c < numCols; c++) {
      const column: FormulaValue[] = [];
      for (let r = 0; r < numRows; r++) {
        column.push((array[r] as FormulaValue[])[c]);
      }
      columns.push(column);
    }

    // Count occurrences of each column
    const countMap = new Map<string, { column: FormulaValue[]; count: number }>();

    for (const col of columns) {
      const key = JSON.stringify(col);
      
      if (countMap.has(key)) {
        countMap.get(key)!.count++;
      } else {
        countMap.set(key, { column: col, count: 1 });
      }
    }

    // Filter based on exactly_once
    const uniqueColumns: FormulaValue[][] = [];
    
    for (const { column, count } of countMap.values()) {
      if (onlyOnce) {
        if (count === 1) {
          uniqueColumns.push(column);
        }
      } else {
        uniqueColumns.push(column);
      }
    }

    if (uniqueColumns.length === 0) {
      return new Error('#CALC!');
    }

    // Reconstruct result as rows
    const result: FormulaValue[][] = [];
    for (let r = 0; r < numRows; r++) {
      const row: FormulaValue[] = [];
      for (let c = 0; c < uniqueColumns.length; c++) {
        row.push(uniqueColumns[c][r]);
      }
      result.push(row);
    }

    return result;
  } else {
    // Compare rows for uniqueness (default)
    const countMap = new Map<string, { row: FormulaValue[], count: number }>();

    for (const row of array) {
      // Use JSON.stringify for consistent key generation
      const key = JSON.stringify(row);
      
      if (countMap.has(key)) {
        countMap.get(key)!.count++;
      } else {
        countMap.set(key, { row: row as FormulaValue[], count: 1 });
      }
    }

    // Filter based on exactly_once parameter
    const result: FormulaValue[][] = [];
    
    for (const { row, count } of countMap.values()) {
      if (onlyOnce) {
        // Only include rows that appear exactly once
        if (count === 1) {
          result.push(row);
        }
      } else {
        // Include all unique rows (first occurrence)
        result.push(row);
      }
    }

    return result.length > 0 ? result : new Error('#CALC!');
  }
};

/**
 * SORT - Sort array
 */
export const SORT: FormulaFunction = (...args) => {
  const [array, sortIndex = 1, sortOrder = 1, byCol = false] = args;

  // Validate required parameter
  if (array === undefined) {
    return new Error('#VALUE!');
  }

  // Validate array input
  if (!Array.isArray(array)) {
    return new Error('#VALUE!');
  }

  if (array.length === 0) {
    return new Error('#CALC!');
  }

  // Parse parameters
  const index = typeof sortIndex === 'number' ? sortIndex : 1;
  const order = sortOrder === -1 ? -1 : 1; // 1 = ascending, -1 = descending
  const byColumn = byCol === true || byCol === 1;

  // Check if array is 2D
  const is2D = Array.isArray(array[0]);

  // Handle 1D arrays
  if (!is2D) {
    // Validate sort index
    if (index !== 1) {
      return new Error('#VALUE!');
    }

    // Create array of [value, originalIndex] for stable sort
    const indexed = array.map((value, idx) => ({ value, idx }));

    // Sort with stable algorithm
    indexed.sort((a, b) => {
      const valA = a.value;
      const valB = b.value;

      // Compare values
      let comparison = 0;
      
      if (valA === null && valB === null) {
        comparison = 0;
      } else if (valA === null) {
        comparison = 1; // null sorts to end
      } else if (valB === null) {
        comparison = -1; // null sorts to end
      } else if (typeof valA === 'string' && typeof valB === 'string') {
        comparison = valA.localeCompare(valB);
      } else if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else if (typeof valA === 'boolean' && typeof valB === 'boolean') {
        comparison = (valA ? 1 : 0) - (valB ? 1 : 0);
      } else {
        // Mixed types: convert to string for comparison
        comparison = String(valA).localeCompare(String(valB));
      }

      // Apply sort order
      comparison *= order;

      // If equal, use original index for stable sort
      if (comparison === 0) {
        comparison = a.idx - b.idx;
      }

      return comparison;
    });

    // Extract sorted values
    return indexed.map(item => item.value);
  }

  // Handle 2D arrays
  const firstRow = array[0];
  if (!Array.isArray(firstRow)) {
    return new Error('#VALUE!');
  }

  if (byColumn) {
    // Sort by row (transpose, sort, transpose back)
    const numRows = array.length;
    const numCols = firstRow.length;

    // Validate sort index
    if (index < 1 || index > numRows) {
      return new Error('#VALUE!');
    }

    // Extract columns
    const columns: Array<{ values: FormulaValue[]; idx: number }> = [];
    for (let c = 0; c < numCols; c++) {
      const column: FormulaValue[] = [];
      for (let r = 0; r < numRows; r++) {
        column.push((array[r] as FormulaValue[])[c]);
      }
      columns.push({ values: column, idx: c });
    }

    // Sort columns by specified row index (1-based)
    const sortRowIndex = index - 1;
    columns.sort((a, b) => {
      const valA = a.values[sortRowIndex];
      const valB = b.values[sortRowIndex];

      let comparison = 0;
      
      if (valA === null && valB === null) {
        comparison = 0;
      } else if (valA === null) {
        comparison = 1;
      } else if (valB === null) {
        comparison = -1;
      } else if (typeof valA === 'string' && typeof valB === 'string') {
        comparison = valA.localeCompare(valB);
      } else if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else if (typeof valA === 'boolean' && typeof valB === 'boolean') {
        comparison = (valA ? 1 : 0) - (valB ? 1 : 0);
      } else {
        comparison = String(valA).localeCompare(String(valB));
      }

      comparison *= order;

      // Stable sort by original index
      if (comparison === 0) {
        comparison = a.idx - b.idx;
      }

      return comparison;
    });

    // Reconstruct result as rows
    const result: FormulaValue[][] = [];
    for (let r = 0; r < numRows; r++) {
      const row: FormulaValue[] = [];
      for (let c = 0; c < columns.length; c++) {
        row.push(columns[c].values[r]);
      }
      result.push(row);
    }

    return result;
  } else {
    // Sort by column (default)
    const numCols = firstRow.length;

    // Validate sort index
    if (index < 1 || index > numCols) {
      return new Error('#VALUE!');
    }

    // Create array of [row, originalIndex] for stable sort
    const indexed = array.map((row, idx) => ({ 
      row: row as FormulaValue[], 
      idx 
    }));

    // Sort rows by specified column index (1-based)
    const sortColIndex = index - 1;
    indexed.sort((a, b) => {
      const valA = a.row[sortColIndex];
      const valB = b.row[sortColIndex];

      let comparison = 0;
      
      if (valA === null && valB === null) {
        comparison = 0;
      } else if (valA === null) {
        comparison = 1; // null sorts to end
      } else if (valB === null) {
        comparison = -1; // null sorts to end
      } else if (typeof valA === 'string' && typeof valB === 'string') {
        comparison = valA.localeCompare(valB);
      } else if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else if (typeof valA === 'boolean' && typeof valB === 'boolean') {
        comparison = (valA ? 1 : 0) - (valB ? 1 : 0);
      } else {
        // Mixed types: convert to string
        comparison = String(valA).localeCompare(String(valB));
      }

      // Apply sort order
      comparison *= order;

      // Stable sort: if equal, preserve original order
      if (comparison === 0) {
        comparison = a.idx - b.idx;
      }

      return comparison;
    });

    // Extract sorted rows
    return indexed.map(item => item.row);
  }
};

/**
 * FILTER - Filter array based on condition
 */
/**
 * FILTER - Filters array based on boolean condition
 */
export const FILTER: FormulaFunction = (array, include, ifEmpty?) => {
  // Validate required parameters
  if (array === undefined || include === undefined) {
    return new Error('#VALUE!');
  }

  // Validate array parameter
  if (!Array.isArray(array) || array.length === 0) {
    return new Error('#VALUE!');
  }

  // Validate include parameter
  if (!Array.isArray(include) || include.length === 0) {
    return new Error('#VALUE!');
  }

  // Check array length compatibility
  if (include.length !== array.length) {
    return new Error('#VALUE!');
  }

  // Check if array is 2D
  const is2D = Array.isArray(array[0]);

  // Filter based on boolean include array
  if (!is2D) {
    // Filter 1D array
    const result: FormulaValue[] = [];

    for (let i = 0; i < array.length; i++) {
      const includeValue = include[i];
      
      // Convert to boolean
      let shouldInclude = false;
      if (includeValue === true || includeValue === 1) {
        shouldInclude = true;
      } else if (includeValue === false || includeValue === 0) {
        shouldInclude = false;
      } else if (typeof includeValue === 'number' && includeValue !== 0) {
        // Non-zero numbers are truthy
        shouldInclude = true;
      }

      if (shouldInclude) {
        result.push(array[i]);
      }
    }

    // Check if result is empty
    if (result.length === 0) {
      if (ifEmpty !== undefined) {
        return ifEmpty;
      }
      return new Error('#CALC!');
    }

    return result;
  } else {
    // Filter 2D array (by rows)
    const result: FormulaValue[][] = [];

    for (let i = 0; i < array.length; i++) {
      const includeValue = include[i];
      
      // Convert to boolean
      let shouldInclude = false;
      if (includeValue === true || includeValue === 1) {
        shouldInclude = true;
      } else if (includeValue === false || includeValue === 0) {
        shouldInclude = false;
      } else if (typeof includeValue === 'number' && includeValue !== 0) {
        shouldInclude = true;
      }

      if (shouldInclude) {
        result.push(array[i] as FormulaValue[]);
      }
    }

    // Check if result is empty
    if (result.length === 0) {
      if (ifEmpty !== undefined) {
        return ifEmpty;
      }
      return new Error('#CALC!');
    }

    return result;
  }
};

/**
 * SEQUENCE - Generate sequence of numbers
 */
export const SEQUENCE: FormulaFunction = (rows, columns?, start?, step?) => {
  const r = toNumber(rows);
  const c = columns !== undefined ? toNumber(columns) : 1;
  const s = start !== undefined ? toNumber(start) : 1;
  const st = step !== undefined ? toNumber(step) : 1;

  if (r instanceof Error) return r;
  if (c instanceof Error) return c;
  if (s instanceof Error) return s;
  if (st instanceof Error) return st;

  // Floor rows and columns to handle fractional inputs
  const numRows = Math.floor(r);
  const numCols = Math.floor(c);

  if (numRows < 1 || numCols < 1) return new Error('#VALUE!');

  // Check for excessively large sequences
  const totalElements = numRows * numCols;
  if (totalElements > 1000000) {
    return new Error('#NUM!');
  }

  const result: FormulaValue[][] = [];

  for (let i = 0; i < numRows; i++) {
    const row: FormulaValue[] = [];
    for (let j = 0; j < numCols; j++) {
      row.push(s + (i * numCols + j) * st);
    }
    result.push(row);
  }

  // If single column, return 1D array
  if (numCols === 1) {
    return result.map(row => row[0]);
  }

  return result;
};

/**
 * RANDARRAY - Generate array of random numbers
 */
export const RANDARRAY: FormulaFunction = (rows?, columns?, min?, max?, wholeNumber?) => {
  const r = rows !== undefined ? toNumber(rows) : 1;
  const c = columns !== undefined ? toNumber(columns) : 1;
  const minVal = min !== undefined ? toNumber(min) : 0;
  const maxVal = max !== undefined ? toNumber(max) : 1;
  const whole = wholeNumber !== undefined ? toBoolean(wholeNumber) : false;

  if (r instanceof Error) return r;
  if (c instanceof Error) return c;
  if (minVal instanceof Error) return minVal;
  if (maxVal instanceof Error) return maxVal;
  if (whole instanceof Error) return whole;

  if (r < 1 || c < 1) return new Error('#VALUE!');
  if (minVal >= maxVal) return new Error('#VALUE!');
  
  // Check for excessively large arrays (Excel limit)
  if (r * c > 1000000) return new Error('#NUM!');

  // Special case: no arguments means single value
  if (rows === undefined && columns === undefined) {
    const rand = Math.random() * (maxVal - minVal) + minVal;
    return whole ? Math.floor(rand) : rand;
  }

  const result: FormulaValue[][] = [];

  for (let i = 0; i < r; i++) {
    const row: FormulaValue[] = [];
    for (let j = 0; j < c; j++) {
      const rand = Math.random() * (maxVal - minVal) + minVal;
      row.push(whole ? Math.floor(rand) : rand);
    }
    result.push(row);
  }

  // If single cell (1x1), return single value
  if (r === 1 && c === 1) {
    return result[0][0];
  }

  // If single column, return 1D array
  if (c === 1) {
    return result.map(row => row[0]);
  }

  return result;
};

/**
 * SORTBY - Sort array by another array
 */
export const SORTBY: FormulaFunction = (...args) => {
  // Validate minimum arguments
  if (args.length < 2) {
    return new Error('#VALUE!');
  }

  const array = args[0];

  // Validate array parameter
  if (!Array.isArray(array) || array.length === 0) {
    return new Error('#VALUE!');
  }

  // Parse by_array and sort_order pairs
  const sortKeys: Array<{ byArray: FormulaValue[]; order: number }> = [];
  
  for (let i = 1; i < args.length; i += 2) {
    const byArray = args[i];
    const sortOrder = args[i + 1] !== undefined ? args[i + 1] : 1;

    // Validate by_array
    if (!Array.isArray(byArray)) {
      return new Error('#VALUE!');
    }

    // Check array length compatibility
    if (byArray.length !== array.length) {
      return new Error('#VALUE!');
    }

    const order = sortOrder === -1 ? -1 : 1;
    sortKeys.push({ byArray, order });
  }

  // If no sort keys, return error
  if (sortKeys.length === 0) {
    return new Error('#VALUE!');
  }

  // Check if array is 2D
  const is2D = Array.isArray(array[0]);

  // Create indexed array for stable sort
  const indexed = array.map((item, idx) => ({
    item,
    idx,
    // Store sort keys for this index
    keys: sortKeys.map(sk => sk.byArray[idx])
  }));

  // Multi-key stable sort
  indexed.sort((a, b) => {
    // Compare by each sort key in order
    for (let keyIdx = 0; keyIdx < sortKeys.length; keyIdx++) {
      const valA = a.keys[keyIdx];
      const valB = b.keys[keyIdx];
      const order = sortKeys[keyIdx].order;

      let comparison = 0;

      // Compare values
      if (valA === null && valB === null) {
        comparison = 0;
      } else if (valA === null) {
        comparison = 1; // null sorts to end
      } else if (valB === null) {
        comparison = -1; // null sorts to end
      } else if (typeof valA === 'string' && typeof valB === 'string') {
        comparison = valA.localeCompare(valB);
      } else if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else if (typeof valA === 'boolean' && typeof valB === 'boolean') {
        comparison = (valA ? 1 : 0) - (valB ? 1 : 0);
      } else {
        // Mixed types: convert to string
        comparison = String(valA).localeCompare(String(valB));
      }

      // Apply sort order
      comparison *= order;

      // If not equal, return comparison
      if (comparison !== 0) {
        return comparison;
      }

      // If equal, continue to next key
    }

    // All keys equal: stable sort by original index
    return a.idx - b.idx;
  });

  // Extract sorted items
  return indexed.map(item => item.item);
};

/**
 * TAKE - Take first/last n rows or columns
 */
export const TAKE: FormulaFunction = (array, rows, columns?) => {
  if (!Array.isArray(array)) return new Error('#VALUE!');

  const numRows = toNumber(rows);
  if (numRows instanceof Error) return numRows;
  if (numRows === 0) return new Error('#VALUE!');

  let numCols: number | null = null;
  if (columns !== undefined) {
    const c = toNumber(columns);
    if (c instanceof Error) return c;
    if (c === 0) return new Error('#VALUE!');
    numCols = Math.floor(c);
  }

  const rowCount = Math.floor(numRows);

  // Check if 2D array
  if (is2DArray(array)) {
    const arr2d = array as FormulaValue[][];
    const totalRows = arr2d.length;
    const totalCols = arr2d[0]?.length || 0;

    // Calculate row range
    let startRow = rowCount > 0 ? 0 : totalRows + rowCount;
    let endRow = rowCount > 0 ? rowCount : totalRows;

    if (Math.abs(rowCount) > totalRows) return new Error('#VALUE!');

    // Calculate column range
    let startCol = 0;
    let endCol = totalCols;
    if (numCols !== null) {
      if (Math.abs(numCols) > totalCols) return new Error('#VALUE!');
      startCol = numCols > 0 ? 0 : totalCols + numCols;
      endCol = numCols > 0 ? numCols : totalCols;
    }

    const result: FormulaValue[][] = [];
    for (let r = startRow; r < endRow; r++) {
      const newRow: FormulaValue[] = [];
      for (let c = startCol; c < endCol; c++) {
        newRow.push(arr2d[r][c]);
      }
      result.push(newRow);
    }

    // If result is single row or column, flatten appropriately
    if (result.length === 1) return result[0];
    if (result[0].length === 1) return result.map(row => row[0]);
    return result;
  } else {
    // 1D array
    const arr1d = array as FormulaValue[];
    const totalRows = arr1d.length;

    if (Math.abs(rowCount) > totalRows) return new Error('#VALUE!');

    let result: FormulaValue[];
    if (rowCount > 0) {
      result = arr1d.slice(0, rowCount);
    } else {
      result = arr1d.slice(rowCount);
    }
    
    // Return scalar if single element
    return result.length === 1 ? result[0] : result;
  }
};

/**
 * DROP - Drop first/last n rows or columns
 */
export const DROP: FormulaFunction = (array, rows, columns?) => {
  if (!Array.isArray(array)) return new Error('#VALUE!');

  const numRows = toNumber(rows);
  if (numRows instanceof Error) return numRows;

  let numCols: number | null = null;
  if (columns !== undefined) {
    const c = toNumber(columns);
    if (c instanceof Error) return c;
    numCols = Math.floor(c);
  }

  const rowCount = Math.floor(numRows);

  // Check if 2D array
  if (is2DArray(array)) {
    const arr2d = array as FormulaValue[][];
    const totalRows = arr2d.length;
    const totalCols = arr2d[0]?.length || 0;

    // Calculate row range
    let startRow = rowCount >= 0 ? rowCount : 0;
    let endRow = rowCount >= 0 ? totalRows : totalRows + rowCount;

    if (Math.abs(rowCount) >= totalRows) return new Error('#VALUE!');

    // Calculate column range
    let startCol = 0;
    let endCol = totalCols;
    if (numCols !== null) {
      if (Math.abs(numCols) >= totalCols) return new Error('#VALUE!');
      startCol = numCols >= 0 ? numCols : 0;
      endCol = numCols >= 0 ? totalCols : totalCols + numCols;
    }

    const result: FormulaValue[][] = [];
    for (let r = startRow; r < endRow; r++) {
      const newRow: FormulaValue[] = [];
      for (let c = startCol; c < endCol; c++) {
        newRow.push(arr2d[r][c]);
      }
      result.push(newRow);
    }

    // If result is single row or column, flatten appropriately
    if (result.length === 1) return result[0];
    if (result[0].length === 1) return result.map(row => row[0]);
    return result;
  } else {
    // 1D array
    const arr1d = array as FormulaValue[];
    const totalRows = arr1d.length;

    if (Math.abs(rowCount) >= totalRows) return new Error('#VALUE!');

    if (rowCount >= 0) {
      return arr1d.slice(rowCount);
    } else {
      return arr1d.slice(0, rowCount);
    }
  }
};

/**
 * CHOOSECOLS - Select specific columns from array
 */
export const CHOOSECOLS: FormulaFunction = (array, ...colNums) => {
  if (!Array.isArray(array)) return new Error('#VALUE!');
  if (colNums.length === 0) return new Error('#VALUE!');

  // Convert and validate all column numbers
  const indices: number[] = [];
  for (const n of colNums) {
    const num = toNumber(n);
    if (num instanceof Error) return num;
    if (num === 0) return new Error('#VALUE!');
    indices.push(Math.floor(num));
  }

  // Handle 2D arrays
  if (is2DArray(array)) {
    const arr2d = array as FormulaValue[][];
    const totalCols = arr2d[0]?.length || 0;

    const result: FormulaValue[][] = [];

    for (const row of arr2d) {
      const newRow: FormulaValue[] = [];
      for (const colNum of indices) {
        // Convert to 0-based, handle negative indices
        const idx = colNum > 0 ? colNum - 1 : totalCols + colNum;
        
        if (idx < 0 || idx >= row.length) {
          return new Error('#VALUE!');
        }
        newRow.push(row[idx]);
      }
      result.push(newRow);
    }

    // If single column selected, return as 1D array
    if (result[0].length === 1) {
      return result.map(row => row[0]);
    }
    return result;
  } else {
    // 1D array - treat as single column
    if (indices.length === 1 && Math.abs(indices[0]) === 1) {
      return array;
    }
    return new Error('#VALUE!');
  }
};

/**
 * CHOOSEROWS - Select specific rows from array
 */
export const CHOOSEROWS: FormulaFunction = (array, ...rowNums) => {
  if (!Array.isArray(array)) return new Error('#VALUE!');
  if (rowNums.length === 0) return new Error('#VALUE!');

  // Convert and validate all row numbers
  const indices: number[] = [];
  for (const n of rowNums) {
    const num = toNumber(n);
    if (num instanceof Error) return num;
    if (num === 0) return new Error('#VALUE!');
    indices.push(Math.floor(num));
  }

  // Handle 2D arrays
  if (is2DArray(array)) {
    const arr2d = array as FormulaValue[][];
    const totalRows = arr2d.length;

    const result: FormulaValue[][] = [];

    for (const rowNum of indices) {
      // Convert to 0-based, handle negative indices
      const idx = rowNum > 0 ? rowNum - 1 : totalRows + rowNum;
      
      if (idx < 0 || idx >= totalRows) {
        return new Error('#VALUE!');
      }
      result.push(arr2d[idx]);
    }

    // If single row selected, return as 1D array
    if (result.length === 1) {
      return result[0];
    }
    return result;
  } else {
    // 1D array
    const arr1d = array as FormulaValue[];
    const totalRows = arr1d.length;

    const result: FormulaValue[] = [];

    for (const rowNum of indices) {
      // Convert to 0-based, handle negative indices
      const idx = rowNum > 0 ? rowNum - 1 : totalRows + rowNum;
      
      if (idx < 0 || idx >= totalRows) {
        return new Error('#VALUE!');
      }
      result.push(arr1d[idx]);
    }

    // If single row selected, return scalar
    if (result.length === 1) {
      return result[0];
    }
    return result;
  }
};

/**
 * VSTACK - Stack arrays vertically
 */
export const VSTACK: FormulaFunction = (...arrays) => {
  const result: FormulaValue[] = [];

  for (const arr of arrays) {
    if (Array.isArray(arr)) {
      result.push(...flattenArray(arr));
    } else {
      result.push(arr);
    }
  }

  return result;
};

/**
 * HSTACK - Stack arrays horizontally
 */
export const HSTACK: FormulaFunction = (...arrays) => {
  // For simplicity, concatenate flattened arrays
  const result: FormulaValue[] = [];

  for (const arr of arrays) {
    if (Array.isArray(arr)) {
      result.push(...flattenArray(arr));
    } else {
      result.push(arr);
    }
  }

  return result;
};

/**
 * FLATTEN - Flatten array to 1D
 */
export const FLATTEN: FormulaFunction = (array) => {
  if (!Array.isArray(array)) {
    return [array];
  }

  return flattenArray(array);
};

/**
 * ROWS - Count number of rows in array
 */
export const ROWS: FormulaFunction = (array) => {
  if (!Array.isArray(array)) return 1;
  
  const [rows] = getArrayDimensions(array);
  return rows;
};

/**
 * COLUMNS - Count number of columns in array
 */
export const COLUMNS: FormulaFunction = (array) => {
  if (!Array.isArray(array)) return 1;
  
  const [, cols] = getArrayDimensions(array);
  return cols;
};

/**
 * WRAPCOLS - Wrap array into columns
 */
export const WRAPCOLS: FormulaFunction = (vector, wrapCount, padWith?) => {
  if (!Array.isArray(vector)) return new Error('#VALUE!');

  const count = toNumber(wrapCount);
  if (count instanceof Error) return count;
  if (count < 1) return new Error('#VALUE!');

  const flat = flattenArray(vector);
  const result: FormulaValue[][] = [];

  for (let i = 0; i < flat.length; i += count) {
    const row = flat.slice(i, i + count);
    
    // Pad if needed
    while (row.length < count) {
      row.push(padWith !== undefined ? padWith : new Error('#N/A'));
    }
    
    result.push(row);
  }

  return result;
};

/**
 * WRAPROWS - Wrap array into rows
 */
export const WRAPROWS: FormulaFunction = (vector, wrapCount, padWith?) => {
  if (!Array.isArray(vector)) return new Error('#VALUE!');

  const count = toNumber(wrapCount);
  if (count instanceof Error) return count;
  if (count < 1) return new Error('#VALUE!');

  const flat = flattenArray(vector);
  const result: FormulaValue[][] = [];

  for (let i = 0; i < flat.length; i += count) {
    const row = flat.slice(i, i + count);
    
    // Pad if needed
    while (row.length < count) {
      row.push(padWith !== undefined ? padWith : new Error('#N/A'));
    }
    
    result.push(row);
  }

  return result;
};

/**
 * TOROW - Convert array to single row
 */
export const TOROW: FormulaFunction = (array, ignore?, scanByColumn?) => {
  if (!Array.isArray(array)) return [array];
  return [flattenArray(array)];
};

/**
 * TOCOL - Convert array to single column
 */
export const TOCOL: FormulaFunction = (array, ignore?, scanByColumn?) => {
  if (!Array.isArray(array)) return [array];
  return flattenArray(array);
};

/**
 * MAKEARRAY - Creates a calculated array of specified dimensions
 * 
 * Creates a 2D array by applying a lambda function to each position.
 * The lambda receives (row, col) as 1-based indices.
 * 
 * @param rows - Number of rows (must be positive integer)
 * @param columns - Number of columns (must be positive integer)
 * @param lambda - Lambda function that takes (row, col) and returns a value
 * @returns 2D array with calculated values
 * 
 * Examples:
 * - MAKEARRAY(3, 3, LAMBDA(r, c, r * c)) → Multiplication table
 * - MAKEARRAY(5, 1, LAMBDA(r, c, r)) → Column of numbers 1-5
 * - MAKEARRAY(1, 5, LAMBDA(r, c, c)) → Row of numbers 1-5
 * 
 * Note: This function requires special handling in FormulaEngine for lambda evaluation
 */
export const MAKEARRAY: FormulaFunction = (rows, columns, lambda) => {
  // Validate rows parameter
  if (typeof rows !== 'number' || rows <= 0 || !Number.isInteger(rows)) {
    return new Error('#VALUE!');
  }
  
  // Validate columns parameter
  if (typeof columns !== 'number' || columns <= 0 || !Number.isInteger(columns)) {
    return new Error('#VALUE!');
  }
  
  // Validate reasonable array size (prevent memory issues)
  const maxSize = 1000000; // 1 million cells max
  if (rows * columns > maxSize) {
    return new Error('#VALUE!');
  }
  
  // Lambda validation is handled by FormulaEngine
  // This is a placeholder that should never execute in normal flow
  // The actual implementation is in FormulaEngine's special handler
  return new Error('#VALUE!');
};
