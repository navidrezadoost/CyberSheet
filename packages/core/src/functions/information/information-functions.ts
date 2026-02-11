/**
 * information-functions.ts
 * 
 * Information and cell inspection functions for Excel compatibility.
 * Week 10 Day 2: ISFORMULA, ISREF, CELL, INFO
 * Week 11 Day 1: ISNUMBER, ISTEXT, ISBLANK, ISLOGICAL, TYPE, N, T, ISNONTEXT
 * 
 * These functions provide metadata and type information about cells and the workbook.
 * 
 * Note: ISFORMULA and CELL use context-aware function signature to access worksheet.
 */

import type { ContextAwareFormulaFunction, FormulaFunction, FormulaContext } from '../../types/formula-types';

/**
 * ISFORMULA - Checks if a reference is to a cell containing a formula
 * 
 * Syntax: ISFORMULA(reference)
 * Returns TRUE if the cell contains a formula, FALSE otherwise
 * 
 * @example
 * =ISFORMULA(A1) → TRUE if A1 contains "=SUM(B1:B10)"
 * =ISFORMULA(A1) → FALSE if A1 contains the number 42
 */
export const ISFORMULA: ContextAwareFormulaFunction = (context: FormulaContext, reference: any) => {
  if (!context || !context.worksheet) {
    return false;
  }

  // If reference is a cell address, check if it contains a formula
  if (typeof reference === 'object' && reference !== null && 'row' in reference && 'col' in reference) {
    const cell = context.worksheet.getCell(reference);
    
    // A cell has a formula if the value is a string starting with '='
    // In our system, formulas are stored in the cell's value as strings starting with '='
    if (cell && typeof cell.value === 'string' && cell.value.startsWith('=')) {
      return true;
    }
    
    return false;
  }

  // For non-reference values, return FALSE
  return false;
};

/**
 * ISREF - Checks if a value is a reference
 * 
 * Syntax: ISREF(value)
 * Returns TRUE if the value is a reference, FALSE otherwise
 * 
 * Note: In Excel, this checks if the argument is a reference type.
 * In our implementation, we check if it's a cell address object.
 * 
 * @example
 * =ISREF(A1) → TRUE
 * =ISREF(100) → FALSE
 * =ISREF("text") → FALSE
 */
export const ISREF: FormulaFunction = (value: any) => {
  // Check if value is a cell address object (has row and col properties)
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return ('row' in value && 'col' in value && 
            typeof value.row === 'number' && 
            typeof value.col === 'number');
  }
  
  // Check if it's an array of cell addresses (range)
  if (Array.isArray(value) && value.length > 0) {
    const first = value[0];
    if (typeof first === 'object' && first !== null && 'row' in first && 'col' in first) {
      return true;
    }
  }
  
  return false;
};

/**
 * CELL - Returns information about a cell
 * 
 * Syntax: CELL(info_type, [reference])
 * Returns specific information about the cell
 * 
 * Supported info_types:
 * - "address" → Absolute cell reference (e.g., "$A$1") - requires reference object
 * - "col" → Column number (1-based)
 * - "row" → Row number (1-based)
 * - "contents" → Cell value
 * - "type" → "b" (blank), "l" (label/text), "v" (value/number)
 * - "width" → Column width (returns default 10)
 * - "format" → Number format (returns "G" for general)
 * - "color" → 0 (not supported)
 * - "parentheses" → 0 (not supported)
 * - "prefix" → "" (not supported)
 * - "protect" → 0 (not supported)
 * 
 * @example
 * =CELL("row", B5) → 5
 * =CELL("col", B5) → 2
 * =CELL("contents", A1) → returns value in A1
 */
export const CELL: ContextAwareFormulaFunction = (context: FormulaContext, infoType: any, reference?: any) => {
  if (typeof infoType !== 'string') {
    return new Error('#VALUE!');
  }

  const type = infoType.toLowerCase();

  // Extract cell address from reference if provided
  let row: number | undefined;
  let col: number | undefined;

  if (reference && typeof reference === 'object' && !Array.isArray(reference)) {
    if ('row' in reference && 'col' in reference) {
      row = reference.row;
      col = reference.col;
    }
  }

  // Helper: Convert column number to letter (0 → A, 1 → B, etc.)
  const colToLetter = (c: number): string => {
    let letter = '';
    let colNum = c;
    while (colNum >= 0) {
      letter = String.fromCharCode(65 + (colNum % 26)) + letter;
      colNum = Math.floor(colNum / 26) - 1;
    }
    return letter;
  };

  switch (type) {
    case 'address':
      // Return absolute reference like "$A$1"
      if (row !== undefined && col !== undefined) {
        const colLetter = colToLetter(col);
        return `$${colLetter}$${row + 1}`;
      }
      return new Error('#VALUE!');

    case 'col':
      // Return column number (1-based)
      if (col !== undefined) {
        return col + 1;
      }
      return new Error('#VALUE!');

    case 'row':
      // Return row number (1-based)
      if (row !== undefined) {
        return row + 1;
      }
      return new Error('#VALUE!');

    case 'contents':
      // Return cell value - NOW WORKS with context!
      if (row !== undefined && col !== undefined && context.worksheet) {
        const cell = context.worksheet.getCell({ row, col });
        if (!cell) return '';
        
        // Return the actual value, not the formula
        const value = cell.value;
        if (typeof value === 'string' && value.startsWith('=')) {
          // This is a formula - we'd need to evaluate it
          // For now, return the formula string
          return value;
        }
        return value ?? '';
      }
      return '';

    case 'type':
      // Return type: "b" (blank), "l" (label/text), "v" (value/number)
      if (row !== undefined && col !== undefined && context.worksheet) {
        const cell = context.worksheet.getCell({ row, col });
        if (!cell || cell.value === undefined || cell.value === null || cell.value === '') {
          return 'b'; // blank
        }
        if (typeof cell.value === 'number') {
          return 'v'; // value
        }
        return 'l'; // label (text)
      }
      return 'b';

    case 'width':
      // Return column width (default: 10)
      return 10;

    case 'format':
      // Return number format code ("G" for general)
      return 'G';

    case 'color':
      // Return 0 (not colored)
      return 0;

    case 'parentheses':
      // Return 0 (not formatted with parentheses)
      return 0;

    case 'prefix':
      // Return empty string (no alignment prefix)
      return '';

    case 'protect':
      // Return 0 (unlocked)
      return 0;

    default:
      return new Error('#VALUE!');
  }
};

/**
 * INFO - Returns information about the operating environment
 * 
 * Syntax: INFO(type_text)
 * Returns information about the current operating environment
 * 
 * Supported types:
 * - "directory" → Current directory path (returns "/")
 * - "numfile" → Number of active worksheets (returns 1)
 * - "origin" → Absolute reference of top-left cell (returns "$A$1")
 * - "osversion" → Operating system version (returns "Web")
 * - "recalc" → Recalculation mode (returns "Automatic")
 * - "release" → Excel version (returns "16.0" for compatibility)
 * - "system" → Operating system (returns "Web")
 * 
 * @example
 * =INFO("system") → "Web"
 * =INFO("numfile") → 1
 * =INFO("origin") → "$A$1"
 */
export const INFO: FormulaFunction = (typeText: any) => {
  if (typeof typeText !== 'string') {
    return new Error('#VALUE!');
  }

  const type = typeText.toLowerCase();

  switch (type) {
    case 'directory':
      // Current directory
      return '/';

    case 'numfile':
      // Number of active worksheets
      return 1;

    case 'origin':
      // Absolute reference of top-left visible cell
      return '$A$1';

    case 'osversion':
      // Operating system version
      return 'Web';

    case 'recalc':
      // Recalculation mode
      return 'Automatic';

    case 'release':
      // Excel version (16.0 = Excel 2016/2019/365)
      return '16.0';

    case 'system':
      // Operating system
      return 'Web';

    default:
      return new Error('#VALUE!');
  }
};

// ============================================================================
// Week 11 Day 1: Type Checking and Conversion Functions
// ============================================================================

/**
 * ISNUMBER - Checks if a value is a number
 * 
 * Syntax: ISNUMBER(value)
 * Returns TRUE if the value is a number, FALSE otherwise
 * 
 * @example
 * =ISNUMBER(100) → TRUE
 * =ISNUMBER("100") → FALSE
 * =ISNUMBER(3.14) → TRUE
 * =ISNUMBER(TRUE) → FALSE
 */
export const ISNUMBER: FormulaFunction = (value: any) => {
  // Numbers are true, everything else is false
  return typeof value === 'number' && !isNaN(value);
};

/**
 * ISTEXT - Checks if a value is text
 * 
 * Syntax: ISTEXT(value)
 * Returns TRUE if the value is text, FALSE otherwise
 * 
 * @example
 * =ISTEXT("hello") → TRUE
 * =ISTEXT(100) → FALSE
 * =ISTEXT("") → TRUE (empty string is text)
 * =ISTEXT(TRUE) → FALSE
 */
export const ISTEXT: FormulaFunction = (value: any) => {
  return typeof value === 'string';
};

/**
 * ISBLANK - Checks if a value is blank
 * 
 * Syntax: ISBLANK(value)
 * Returns TRUE if the value is blank (null, undefined, or empty string), FALSE otherwise
 * 
 * @example
 * =ISBLANK(A1) → TRUE if A1 is empty
 * =ISBLANK("") → TRUE
 * =ISBLANK(0) → FALSE
 * =ISBLANK(FALSE) → FALSE
 */
export const ISBLANK: FormulaFunction = (value: any) => {
  return value === null || value === undefined || value === '';
};

/**
 * ISLOGICAL - Checks if a value is a logical value (TRUE or FALSE)
 * 
 * Syntax: ISLOGICAL(value)
 * Returns TRUE if the value is a boolean, FALSE otherwise
 * 
 * @example
 * =ISLOGICAL(TRUE) → TRUE
 * =ISLOGICAL(FALSE) → TRUE
 * =ISLOGICAL(1) → FALSE
 * =ISLOGICAL("TRUE") → FALSE
 */
export const ISLOGICAL: FormulaFunction = (value: any) => {
  return typeof value === 'boolean';
};

/**
 * ISNONTEXT - Checks if a value is not text
 * 
 * Syntax: ISNONTEXT(value)
 * Returns TRUE if the value is not text, FALSE if it is text
 * 
 * @example
 * =ISNONTEXT(100) → TRUE
 * =ISNONTEXT("hello") → FALSE
 * =ISNONTEXT(TRUE) → TRUE
 * =ISNONTEXT("") → FALSE (empty string is text)
 */
export const ISNONTEXT: FormulaFunction = (value: any) => {
  return typeof value !== 'string';
};

/**
 * TYPE - Returns the type of value
 * 
 * Syntax: TYPE(value)
 * Returns a number indicating the type:
 * - 1: Number
 * - 2: Text
 * - 4: Logical (Boolean)
 * - 16: Error
 * - 64: Array
 * 
 * @example
 * =TYPE(100) → 1
 * =TYPE("hello") → 2
 * =TYPE(TRUE) → 4
 * =TYPE(#VALUE!) → 16
 * =TYPE({1,2,3}) → 64
 */
export const TYPE: FormulaFunction = (value: any) => {
  // Check for error first
  if (value instanceof Error) {
    return 16;
  }
  
  // Check for array
  if (Array.isArray(value)) {
    return 64;
  }
  
  // Check for number
  if (typeof value === 'number' && !isNaN(value)) {
    return 1;
  }
  
  // Check for text
  if (typeof value === 'string') {
    return 2;
  }
  
  // Check for logical
  if (typeof value === 'boolean') {
    return 4;
  }
  
  // Default to text for unknown types
  return 2;
};

/**
 * N - Converts a value to a number
 * 
 * Syntax: N(value)
 * Returns the numeric value:
 * - Number: returns the number
 * - TRUE: returns 1
 * - FALSE: returns 0
 * - Date: returns serial number
 * - Text/Other: returns 0
 * - Error: returns the error
 * 
 * @example
 * =N(100) → 100
 * =N(TRUE) → 1
 * =N(FALSE) → 0
 * =N("text") → 0
 * =N("123") → 0 (text, not parsed)
 */
export const N: FormulaFunction = (value: any) => {
  // Errors pass through
  if (value instanceof Error) {
    return value;
  }
  
  // Numbers return as-is
  if (typeof value === 'number' && !isNaN(value)) {
    return value;
  }
  
  // Booleans: TRUE=1, FALSE=0
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  
  // Everything else returns 0
  return 0;
};

/**
 * T - Converts a value to text
 * 
 * Syntax: T(value)
 * Returns:
 * - Text: returns the text
 * - Non-text: returns empty string ""
 * 
 * @example
 * =T("hello") → "hello"
 * =T(100) → ""
 * =T(TRUE) → ""
 * =T("") → ""
 */
export const T: FormulaFunction = (value: any) => {
  // Only text returns as-is
  if (typeof value === 'string') {
    return value;
  }
  
  // Everything else returns empty string
  return '';
};
