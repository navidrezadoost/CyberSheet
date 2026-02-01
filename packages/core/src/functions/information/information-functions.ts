/**
 * information-functions.ts
 * 
 * Information and cell inspection functions for Excel compatibility.
 * Week 10 Day 2: ISFORMULA, ISREF, CELL, INFO
 * 
 * These functions provide metadata and type information about cells and the workbook.
 * 
 * Note: ISFORMULA and CELL functions have limited functionality without formula engine context.
 * In a full implementation, these would need special handling to access the worksheet.
 */

import type { FormulaFunction } from '../../types/formula-types';

/**
 * ISFORMULA - Checks if a reference is to a cell containing a formula
 * 
 * Syntax: ISFORMULA(reference)
 * Returns TRUE if the cell contains a formula, FALSE otherwise
 * 
 * Note: This is a placeholder implementation. Full functionality requires
 * formula engine integration to inspect cell formulas.
 * 
 * @example
 * =ISFORMULA(A1) → TRUE if A1 contains "=SUM(B1:B10)"
 * =ISFORMULA(A1) → FALSE if A1 contains the number 42
 */
export const ISFORMULA: FormulaFunction = (reference: any) => {
  // Placeholder: Without context, we cannot determine if a cell has a formula
  // Return FALSE for now
  // TODO: Implement with formula engine context support
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
 * - "col" → Column number
 * - "row" → Row number
 * - "type" → "v" (value - we don't have access to actual cell to determine type)
 * - "width" → Column width (returns default 10)
 * - "format" → Number format (returns "G" for general)
 * - "color" → 0 (not supported)
 * - "parentheses" → 0 (not supported)
 * - "prefix" → "" (not supported)
 * - "protect" → 0 (not supported)
 * 
 * Note: Limited implementation without worksheet context.
 * "contents" type is not supported in this version.
 * 
 * @example
 * =CELL("row", B5) → 5
 * =CELL("col", B5) → 2
 */
export const CELL: FormulaFunction = (infoType: any, reference?: any) => {
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

    case 'type':
      // Return type: we default to "v" (value) since we can't inspect the cell
      return 'v';

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

    case 'contents':
      // Not supported without worksheet context
      return new Error('#N/A');

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
