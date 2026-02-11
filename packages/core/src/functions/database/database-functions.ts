/**
 * database-functions.ts
 * 
 * Database formula functions for conditional aggregation.
 * Excel-compatible DSUM, DAVERAGE, DCOUNT, DMAX, DMIN, DGET, etc.
 * 
 * Database functions work on structured data with headers and apply criteria-based filtering.
 */

import type { FormulaFunction, FormulaValue } from '../../types/formula-types';
import { toNumber, toString, compareValues, is2DArray } from '../../utils/type-utils';
import { filterNumbers } from '../../utils/array-utils';

// ============================================================================
// Helper Functions for Database Operations
// ============================================================================

/**
 * Validate that database is a proper 2D array with headers
 */
function validateDatabase(database: FormulaValue): database is FormulaValue[][] {
  if (!is2DArray(database)) {
    return false;
  }
  const db = database as FormulaValue[][];
  // Must have at least header row + 1 data row
  return db.length >= 2 && db[0].length > 0;
}

/**
 * Resolve field parameter to column index (0-based)
 * Field can be column name (string) or 1-based index (number)
 */
function resolveField(database: FormulaValue[][], field: FormulaValue): number | Error {
  const headers = database[0];
  
  // If field is a number, treat as 1-based column index
  if (typeof field === 'number') {
    const colIndex = Math.floor(field) - 1; // Convert to 0-based
    if (colIndex < 0 || colIndex >= headers.length) {
      return new Error('#NUM!');
    }
    return colIndex;
  }
  
  // If field is a string, find matching header (case-insensitive)
  const fieldStr = toString(field);
  if (fieldStr instanceof Error) return fieldStr;
  
  const fieldLower = fieldStr.toLowerCase();
  for (let i = 0; i < headers.length; i++) {
    const header = toString(headers[i]);
    if (header instanceof Error) continue;
    if (header.toLowerCase() === fieldLower) {
      return i;
    }
  }
  
  return new Error('#VALUE!');
}

/**
 * Check if a value matches a criterion
 * Supports:
 * - Exact match (case-insensitive for strings)
 * - Wildcards: * (any characters), ? (single character)
 * - Comparison operators: >, <, >=, <=, <>, =
 */
function matchesCriterion(value: FormulaValue, criterion: FormulaValue): boolean {
  // Empty criterion matches everything
  if (criterion === null || criterion === undefined || criterion === '') {
    return true;
  }
  
  // Convert criterion to string to parse operators
  const criterionStr = String(criterion);
  
  // Check for comparison operators
  let operator = '=';
  let compareValue: string = criterionStr;
  
  if (criterionStr.startsWith('>=')) {
    operator = '>=';
    compareValue = criterionStr.substring(2).trim();
  } else if (criterionStr.startsWith('<=')) {
    operator = '<=';
    compareValue = criterionStr.substring(2).trim();
  } else if (criterionStr.startsWith('<>')) {
    operator = '<>';
    compareValue = criterionStr.substring(2).trim();
  } else if (criterionStr.startsWith('>')) {
    operator = '>';
    compareValue = criterionStr.substring(1).trim();
  } else if (criterionStr.startsWith('<')) {
    operator = '<';
    compareValue = criterionStr.substring(1).trim();
  } else if (criterionStr.startsWith('=')) {
    operator = '=';
    compareValue = criterionStr.substring(1).trim();
  }
  
  // Handle wildcards for text matching
  const hasWildcards = compareValue.includes('*') || compareValue.includes('?');
  
  if (hasWildcards && operator === '=') {
    // Convert wildcard pattern to regex
    const regexPattern = compareValue
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars except * and ?
      .replace(/\*/g, '.*')  // * matches any characters
      .replace(/\?/g, '.');  // ? matches single character
    
    const regex = new RegExp(`^${regexPattern}$`, 'i'); // Case-insensitive
    return regex.test(String(value));
  }
  
  // Numeric comparison
  const numValue = toNumber(value);
  const numCriterion = toNumber(compareValue);
  
  if (!(numValue instanceof Error) && !(numCriterion instanceof Error)) {
    switch (operator) {
      case '>': return numValue > numCriterion;
      case '<': return numValue < numCriterion;
      case '>=': return numValue >= numCriterion;
      case '<=': return numValue <= numCriterion;
      case '<>': return numValue !== numCriterion;
      case '=': return numValue === numCriterion;
    }
  }
  
  // Text comparison (case-insensitive)
  const strValue = String(value).toLowerCase();
  const strCriterion = compareValue.toLowerCase();
  
  switch (operator) {
    case '>': return strValue > strCriterion;
    case '<': return strValue < strCriterion;
    case '>=': return strValue >= strCriterion;
    case '<=': return strValue <= strCriterion;
    case '<>': return strValue !== strCriterion;
    case '=': return strValue === strCriterion;
    default: return false;
  }
}

/**
 * Check if a data row matches all criteria in a criteria row (AND logic)
 */
function matchesCriteriaRow(
  dataRow: FormulaValue[],
  headers: FormulaValue[],
  criteriaRow: FormulaValue[],
  criteriaHeaders: FormulaValue[]
): boolean {
  // For each criterion in the criteria row
  for (let critCol = 0; critCol < criteriaHeaders.length; critCol++) {
    const criterionValue = criteriaRow[critCol];
    
    // Skip empty criteria
    if (criterionValue === null || criterionValue === undefined || criterionValue === '') {
      continue;
    }
    
    // Find corresponding column in data
    const criteriaHeader = toString(criteriaHeaders[critCol]);
    if (criteriaHeader instanceof Error) continue;
    
    const criteriaHeaderLower = criteriaHeader.toLowerCase();
    let dataColIndex = -1;
    
    for (let i = 0; i < headers.length; i++) {
      const header = toString(headers[i]);
      if (header instanceof Error) continue;
      if (header.toLowerCase() === criteriaHeaderLower) {
        dataColIndex = i;
        break;
      }
    }
    
    if (dataColIndex === -1) {
      // Field not found in database
      return false;
    }
    
    const dataValue = dataRow[dataColIndex];
    
    // Check if value matches criterion
    if (!matchesCriterion(dataValue, criterionValue)) {
      return false; // AND logic: all criteria must match
    }
  }
  
  return true; // All criteria matched
}

/**
 * Filter database rows based on criteria
 * Returns array of matching rows (excluding header)
 * 
 * Criteria structure:
 * - First row: field names
 * - Subsequent rows: criteria values (OR logic between rows)
 * - Multiple columns in same row: AND logic
 */
function filterDatabase(
  database: FormulaValue[][],
  criteria: FormulaValue[][]
): FormulaValue[][] {
  if (!validateDatabase(criteria) || criteria.length < 2) {
    return [];
  }
  
  const headers = database[0];
  const criteriaHeaders = criteria[0];
  const dataRows = database.slice(1); // Exclude header
  const matchingRows: FormulaValue[][] = [];
  
  // For each data row
  for (const dataRow of dataRows) {
    let matches = false;
    
    // Check against each criteria row (OR logic)
    for (let critRowIdx = 1; critRowIdx < criteria.length; critRowIdx++) {
      const criteriaRow = criteria[critRowIdx];
      
      if (matchesCriteriaRow(dataRow, headers, criteriaRow, criteriaHeaders)) {
        matches = true;
        break; // OR logic: any criteria row matches
      }
    }
    
    if (matches) {
      matchingRows.push(dataRow);
    }
  }
  
  return matchingRows;
}

// ============================================================================
// Week 11 Day 6: Database Functions
// ============================================================================

/**
 * DSUM - Sum values in a database that match criteria
 * 
 * Syntax: DSUM(database, field, criteria)
 * 
 * @param database - Range containing the database (first row = headers)
 * @param field - Column name (string) or index (number, 1-based) to sum
 * @param criteria - Range containing criteria (first row = field names)
 * @returns Sum of values matching criteria
 * 
 * Examples:
 * - DSUM(A1:E10, "Profit", G1:G2) → Sum profits matching criteria
 * - DSUM(A1:E10, 5, G1:H3) → Sum column 5 with multiple criteria
 * 
 * Notes:
 * - Ignores non-numeric values
 * - Returns 0 if no matches
 * - Supports wildcards, comparison operators, AND/OR logic
 */
export function DSUM(database: any, field: any, criteria: any): FormulaValue {
  // Validate database
  if (!validateDatabase(database)) {
    return new Error('#VALUE!');
  }
  
  // Validate criteria
  if (!is2DArray(criteria)) {
    return new Error('#VALUE!');
  }
  
  const db = database as FormulaValue[][];
  const crit = criteria as FormulaValue[][];
  
  // Resolve field to column index
  const colIndex = resolveField(db, field);
  if (colIndex instanceof Error) return colIndex;
  
  // Filter database by criteria
  const matchingRows = filterDatabase(db, crit);
  
  // Sum values in specified column
  let sum = 0;
  for (const row of matchingRows) {
    const value = toNumber(row[colIndex]);
    if (!(value instanceof Error)) {
      sum += value;
    }
  }
  
  return sum;
}

/**
 * DAVERAGE - Average of values in a database that match criteria
 * 
 * Syntax: DAVERAGE(database, field, criteria)
 * 
 * @param database - Range containing the database
 * @param field - Column name or index to average
 * @param criteria - Range containing criteria
 * @returns Average of values matching criteria
 * 
 * Examples:
 * - DAVERAGE(A1:E10, "Yield", G1:G2) → Average yield for criteria
 * - DAVERAGE(A1:E10, 3, G1:H3) → Average column 3
 * 
 * Notes:
 * - Ignores non-numeric values
 * - Returns #DIV/0! if no numeric matches
 */
export function DAVERAGE(database: any, field: any, criteria: any): FormulaValue {
  // Validate database
  if (!validateDatabase(database)) {
    return new Error('#VALUE!');
  }
  
  // Validate criteria
  if (!is2DArray(criteria)) {
    return new Error('#VALUE!');
  }
  
  const db = database as FormulaValue[][];
  const crit = criteria as FormulaValue[][];
  
  // Resolve field to column index
  const colIndex = resolveField(db, field);
  if (colIndex instanceof Error) return colIndex;
  
  // Filter database by criteria
  const matchingRows = filterDatabase(db, crit);
  
  // Calculate average of values in specified column
  let sum = 0;
  let count = 0;
  
  for (const row of matchingRows) {
    const value = toNumber(row[colIndex]);
    if (!(value instanceof Error)) {
      sum += value;
      count++;
    }
  }
  
  if (count === 0) {
    return new Error('#DIV/0!');
  }
  
  return sum / count;
}

/**
 * DCOUNT - Count numeric values in a database that match criteria
 * 
 * Syntax: DCOUNT(database, field, criteria)
 * 
 * @param database - Range containing the database
 * @param field - Column name or index to count
 * @param criteria - Range containing criteria
 * @returns Count of numeric values matching criteria
 * 
 * Examples:
 * - DCOUNT(A1:E10, "Age", G1:G2) → Count numeric ages
 * - DCOUNT(A1:E10, 2, G1:H3) → Count numbers in column 2
 * 
 * Notes:
 * - Only counts numeric values (not text)
 * - Returns 0 if no numeric matches
 */
export function DCOUNT(database: any, field: any, criteria: any): FormulaValue {
  // Validate database
  if (!validateDatabase(database)) {
    return new Error('#VALUE!');
  }
  
  // Validate criteria
  if (!is2DArray(criteria)) {
    return new Error('#VALUE!');
  }
  
  const db = database as FormulaValue[][];
  const crit = criteria as FormulaValue[][];
  
  // Resolve field to column index
  const colIndex = resolveField(db, field);
  if (colIndex instanceof Error) return colIndex;
  
  // Filter database by criteria
  const matchingRows = filterDatabase(db, crit);
  
  // Count numeric values in specified column
  let count = 0;
  
  for (const row of matchingRows) {
    const cellValue = row[colIndex];
    // Exclude empty strings (Excel behavior: DCOUNT only counts actual numbers)
    if (cellValue === '' || cellValue === null || cellValue === undefined) {
      continue;
    }
    const value = toNumber(cellValue);
    if (!(value instanceof Error)) {
      count++;
    }
  }
  
  return count;
}

/**
 * DCOUNTA - Count non-empty values in a database that match criteria
 * 
 * Syntax: DCOUNTA(database, field, criteria)
 * 
 * @param database - Range containing the database
 * @param field - Column name or index to count
 * @param criteria - Range containing criteria
 * @returns Count of non-empty values matching criteria
 * 
 * Examples:
 * - DCOUNTA(A1:E10, "Tree", G1:G2) → Count non-empty tree names
 * - DCOUNTA(A1:E10, 1, G1:H3) → Count non-empty values in column 1
 * 
 * Notes:
 * - Counts all non-empty values (text, numbers, errors)
 * - Unlike DCOUNT, includes text values
 * - Returns 0 if no matches
 */
export function DCOUNTA(database: any, field: any, criteria: any): FormulaValue {
  // Validate database
  if (!validateDatabase(database)) {
    return new Error('#VALUE!');
  }
  
  // Validate criteria
  if (!is2DArray(criteria)) {
    return new Error('#VALUE!');
  }
  
  const db = database as FormulaValue[][];
  const crit = criteria as FormulaValue[][];
  
  // Resolve field to column index
  const colIndex = resolveField(db, field);
  if (colIndex instanceof Error) return colIndex;
  
  // Filter database by criteria
  const matchingRows = filterDatabase(db, crit);
  
  // Count non-empty values in specified column
  let count = 0;
  
  for (const row of matchingRows) {
    const value = row[colIndex];
    if (value !== null && value !== undefined && value !== '') {
      count++;
    }
  }
  
  return count;
}

/**
 * DMAX - Maximum value in a database that matches criteria
 * 
 * Syntax: DMAX(database, field, criteria)
 * 
 * @param database - Range containing the database
 * @param field - Column name or index to find maximum
 * @param criteria - Range containing criteria
 * @returns Maximum value matching criteria
 * 
 * Examples:
 * - DMAX(A1:E10, "Profit", G1:G2) → Highest profit matching criteria
 * - DMAX(A1:E10, 5, G1:H3) → Maximum in column 5
 * 
 * Notes:
 * - Ignores non-numeric values
 * - Returns 0 if no numeric matches
 */
export function DMAX(database: any, field: any, criteria: any): FormulaValue {
  // Validate database
  if (!validateDatabase(database)) {
    return new Error('#VALUE!');
  }
  
  // Validate criteria
  if (!is2DArray(criteria)) {
    return new Error('#VALUE!');
  }
  
  const db = database as FormulaValue[][];
  const crit = criteria as FormulaValue[][];
  
  // Resolve field to column index
  const colIndex = resolveField(db, field);
  if (colIndex instanceof Error) return colIndex;
  
  // Filter database by criteria
  const matchingRows = filterDatabase(db, crit);
  
  // Find maximum value in specified column
  let max = -Infinity;
  let foundNumeric = false;
  
  for (const row of matchingRows) {
    const value = toNumber(row[colIndex]);
    if (!(value instanceof Error)) {
      foundNumeric = true;
      if (value > max) {
        max = value;
      }
    }
  }
  
  return foundNumeric ? max : 0;
}

/**
 * DMIN - Minimum value in a database that matches criteria
 * 
 * Syntax: DMIN(database, field, criteria)
 * 
 * @param database - Range containing the database
 * @param field - Column name or index to find minimum
 * @param criteria - Range containing criteria
 * @returns Minimum value matching criteria
 * 
 * Examples:
 * - DMIN(A1:E10, "Age", G1:G2) → Youngest age matching criteria
 * - DMIN(A1:E10, 3, G1:H3) → Minimum in column 3
 * 
 * Notes:
 * - Ignores non-numeric values
 * - Returns 0 if no numeric matches
 */
export function DMIN(database: any, field: any, criteria: any): FormulaValue {
  // Validate database
  if (!validateDatabase(database)) {
    return new Error('#VALUE!');
  }
  
  // Validate criteria
  if (!is2DArray(criteria)) {
    return new Error('#VALUE!');
  }
  
  const db = database as FormulaValue[][];
  const crit = criteria as FormulaValue[][];
  
  // Resolve field to column index
  const colIndex = resolveField(db, field);
  if (colIndex instanceof Error) return colIndex;
  
  // Filter database by criteria
  const matchingRows = filterDatabase(db, crit);
  
  // Find minimum value in specified column
  let min = Infinity;
  let foundNumeric = false;
  
  for (const row of matchingRows) {
    const value = toNumber(row[colIndex]);
    if (!(value instanceof Error)) {
      foundNumeric = true;
      if (value < min) {
        min = value;
      }
    }
  }
  
  return foundNumeric ? min : 0;
}

/**
 * DGET - Extract single value from database matching criteria
 * 
 * Syntax: DGET(database, field, criteria)
 * 
 * @param database - Range containing the database
 * @param field - Column name or index to extract
 * @param criteria - Range containing criteria
 * @returns Single value matching criteria
 * 
 * Examples:
 * - DGET(A1:E10, "Yield", G1:H2) → Get yield for unique match
 * - DGET(A1:E10, 4, G1:G2) → Get value from column 4
 * 
 * Notes:
 * - Returns #NUM! if more than one record matches
 * - Returns #VALUE! if no records match
 * - Strict function: must match exactly one record
 */
export function DGET(database: any, field: any, criteria: any): FormulaValue {
  // Validate database
  if (!validateDatabase(database)) {
    return new Error('#VALUE!');
  }
  
  // Validate criteria
  if (!is2DArray(criteria)) {
    return new Error('#VALUE!');
  }
  
  const db = database as FormulaValue[][];
  const crit = criteria as FormulaValue[][];
  
  // Resolve field to column index
  const colIndex = resolveField(db, field);
  if (colIndex instanceof Error) return colIndex;
  
  // Filter database by criteria
  const matchingRows = filterDatabase(db, crit);
  
  // Check match count
  if (matchingRows.length === 0) {
    return new Error('#VALUE!');
  }
  
  if (matchingRows.length > 1) {
    return new Error('#NUM!');
  }
  
  // Return the single matching value
  return matchingRows[0][colIndex];
}

/**
 * DSTDEV - Sample standard deviation of values in database matching criteria
 * 
 * Syntax: DSTDEV(database, field, criteria)
 * 
 * @param database - Range containing the database
 * @param field - Column name or index for calculation
 * @param criteria - Range containing criteria
 * @returns Sample standard deviation of matching values
 * 
 * Examples:
 * - DSTDEV(A1:E10, "Yield", G1:G2) → Std dev of yields
 * - DSTDEV(A1:E10, 4, G1:H3) → Std dev of column 4
 * 
 * Notes:
 * - Uses n-1 denominator (sample standard deviation)
 * - Requires at least 2 numeric values
 * - Returns #DIV/0! if insufficient data
 */
export function DSTDEV(database: any, field: any, criteria: any): FormulaValue {
  // Validate database
  if (!validateDatabase(database)) {
    return new Error('#VALUE!');
  }
  
  // Validate criteria
  if (!is2DArray(criteria)) {
    return new Error('#VALUE!');
  }
  
  const db = database as FormulaValue[][];
  const crit = criteria as FormulaValue[][];
  
  // Resolve field to column index
  const colIndex = resolveField(db, field);
  if (colIndex instanceof Error) return colIndex;
  
  // Filter database by criteria
  const matchingRows = filterDatabase(db, crit);
  
  // Extract numeric values
  const values: number[] = [];
  for (const row of matchingRows) {
    const value = toNumber(row[colIndex]);
    if (!(value instanceof Error)) {
      values.push(value);
    }
  }
  
  if (values.length < 2) {
    return new Error('#DIV/0!');
  }
  
  // Calculate sample standard deviation
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
  
  return Math.sqrt(variance);
}

/**
 * DSTDEVP - Population standard deviation of values matching criteria
 * 
 * Syntax: DSTDEVP(database, field, criteria)
 * 
 * @param database - Range containing the database
 * @param field - Column name or index for calculation
 * @param criteria - Range containing criteria
 * @returns Population standard deviation of matching values
 * 
 * Examples:
 * - DSTDEVP(A1:E10, "Age", G1:G2) → Population std dev
 * - DSTDEVP(A1:E10, 2, G1:H3) → Population std dev of column 2
 * 
 * Notes:
 * - Uses n denominator (population standard deviation)
 * - Requires at least 1 numeric value
 * - Returns #DIV/0! if no numeric values
 */
export function DSTDEVP(database: any, field: any, criteria: any): FormulaValue {
  // Validate database
  if (!validateDatabase(database)) {
    return new Error('#VALUE!');
  }
  
  // Validate criteria
  if (!is2DArray(criteria)) {
    return new Error('#VALUE!');
  }
  
  const db = database as FormulaValue[][];
  const crit = criteria as FormulaValue[][];
  
  // Resolve field to column index
  const colIndex = resolveField(db, field);
  if (colIndex instanceof Error) return colIndex;
  
  // Filter database by criteria
  const matchingRows = filterDatabase(db, crit);
  
  // Extract numeric values
  const values: number[] = [];
  for (const row of matchingRows) {
    const value = toNumber(row[colIndex]);
    if (!(value instanceof Error)) {
      values.push(value);
    }
  }
  
  if (values.length === 0) {
    return new Error('#DIV/0!');
  }
  
  // Calculate population standard deviation
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  
  return Math.sqrt(variance);
}

/**
 * DVAR - Sample variance of values in database matching criteria
 * 
 * Syntax: DVAR(database, field, criteria)
 * 
 * @param database - Range containing the database
 * @param field - Column name or index for calculation
 * @param criteria - Range containing criteria
 * @returns Sample variance of matching values
 * 
 * Examples:
 * - DVAR(A1:E10, "Profit", G1:G2) → Variance of profits
 * - DVAR(A1:E10, 5, G1:H3) → Variance of column 5
 * 
 * Notes:
 * - Uses n-1 denominator (sample variance)
 * - Requires at least 2 numeric values
 * - Returns #DIV/0! if insufficient data
 */
export function DVAR(database: any, field: any, criteria: any): FormulaValue {
  // Validate database
  if (!validateDatabase(database)) {
    return new Error('#VALUE!');
  }
  
  // Validate criteria
  if (!is2DArray(criteria)) {
    return new Error('#VALUE!');
  }
  
  const db = database as FormulaValue[][];
  const crit = criteria as FormulaValue[][];
  
  // Resolve field to column index
  const colIndex = resolveField(db, field);
  if (colIndex instanceof Error) return colIndex;
  
  // Filter database by criteria
  const matchingRows = filterDatabase(db, crit);
  
  // Extract numeric values
  const values: number[] = [];
  for (const row of matchingRows) {
    const value = toNumber(row[colIndex]);
    if (!(value instanceof Error)) {
      values.push(value);
    }
  }
  
  if (values.length < 2) {
    return new Error('#DIV/0!');
  }
  
  // Calculate sample variance
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
  
  return variance;
}
