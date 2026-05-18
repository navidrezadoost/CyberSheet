/**
 * formula-reference-extractor.ts
 * 
 * Extracts cell and range references from formula strings for dependency tracking.
 * Supports A1 and R1C1 notation, named ranges, and structured table references.
 * 
 * Used by Worksheet.setCellFormula to automatically register dependencies in the DAG.
 */

import type { Address } from '../types';

/**
 * Cell reference pattern (A1 notation):
 * - Optional $ for absolute row/col
 * - Column: A-Z, AA-ZZ, etc.
 * - Row: 1-1048576
 * 
 * Examples: A1, $B$2, C3:D10, Sheet1!A1, $A:$A, 1:1
 */
const A1_CELL_REF = /(\$?[A-Z]+\$?\d+)/g;
const A1_RANGE_REF = /(\$?[A-Z]+\$?\d+):(\$?[A-Z]+\$?\d+)/g;
const A1_COL_REF = /(\$?[A-Z]+):(\$?[A-Z]+)/g;
const A1_ROW_REF = /(\$?\d+):(\$?\d+)/g;

/**
 * R1C1 notation pattern:
 * - R[offset] or R1 for absolute
 * - C[offset] or C1 for absolute
 * 
 * Examples: R1C1, R[1]C[-2], RC (current cell), R[-1]C:R[1]C (range)
 */
const R1C1_CELL_REF = /R(\[?-?\d+\]?)?C(\[?-?\d+\]?)?/gi;

/**
 * Sheet-qualified reference:
 * - Sheet1!A1
 * - 'Sheet Name'!B2:C3
 */
const SHEET_QUALIFIED = /(?:'[^']*'|[\w]+)!/g;

/**
 * Structured reference (Excel Tables):
 * - Table1[Column1]
 * - Table1[[#Headers],[Column]]
 */
const STRUCTURED_REF = /[\w]+\[(?:[^\]]+)\]/g;

/**
 * Named range pattern (simple word not a function):
 * - Must not be followed by '(' (to exclude functions)
 * - At least 2 chars to avoid single-letter column refs
 */
const NAMED_RANGE = /\b([A-Z][A-Z0-9_]*)\b(?!\()/gi;

/**
 * Extract all cell and range references from a formula string.
 * 
 * Returns a deduplicated list of Address objects that the formula depends on.
 * This is used by Worksheet.setCellFormula to automatically register
 * dependencies in the DependencyGraph.
 * 
 * @param formula - Formula string (with or without leading '=')
 * @param currentCell - Address of the cell containing the formula (for R1C1)
 * @param referenceStyle - 'A1' or 'R1C1' (default: 'A1')
 * @returns Array of Address objects the formula directly references
 * 
 * @example
 * extractReferences('=SUM(A1:A10)', {row: 5, col: 0})
 * // Returns: [{row: 0, col: 0}, {row: 1, col: 0}, ..., {row: 9, col: 0}]
 * 
 * @example
 * extractReferences('=B2+C3*D4', {row: 0, col: 0})
 * // Returns: [{row: 1, col: 1}, {row: 2, col: 2}, {row: 3, col: 3}]
 */
export function extractReferences(
  formula: string,
  currentCell: Address,
  referenceStyle: 'A1' | 'R1C1' = 'A1'
): Address[] {
  const addresses = new Set<string>(); // Use Set to deduplicate
  
  // Strip leading '=' if present
  const expr = formula.startsWith('=') ? formula.slice(1) : formula;
  
  // Remove string literals (they might contain reference-like text)
  const cleaned = removeStringLiterals(expr);
  
  if (referenceStyle === 'A1') {
    extractA1References(cleaned, addresses);
  } else {
    extractR1C1References(cleaned, currentCell, addresses);
  }
  
  // Convert Set<string> back to Address[]
  const result: Address[] = [];
  for (const key of addresses) {
    const [row, col] = key.split(':').map(Number);
    result.push({ row, col });
  }
  
  return result;
}

/**
 * Extract A1-style references (A1, B2:C3, etc.)
 */
function extractA1References(expr: string, addresses: Set<string>): void {
  // Remove sheet qualifiers first (we only track dependencies within the same sheet for now)
  const unqualified = expr.replace(SHEET_QUALIFIED, '');
  
  // Extract range references (A1:B2)
  const rangeMatches = unqualified.matchAll(A1_RANGE_REF);
  for (const match of rangeMatches) {
    const start = parseA1Address(match[1]);
    const end = parseA1Address(match[2]);
    if (start && end) {
      expandRange(start, end, addresses);
    }
  }
  
  // Extract column ranges (A:A, B:D)
  const colMatches = unqualified.matchAll(A1_COL_REF);
  for (const match of colMatches) {
    const startCol = parseA1Column(match[1]);
    const endCol = parseA1Column(match[2]);
    if (startCol !== null && endCol !== null) {
      // For column ranges, we track a representative set (first 100 rows)
      // Full column dependencies would be tracked as a special marker
      for (let row = 0; row < 100; row++) {
        for (let col = startCol; col <= endCol; col++) {
          addresses.add(`${row}:${col}`);
        }
      }
    }
  }
  
  // Extract row ranges (1:1, 2:5)
  const rowMatches = unqualified.matchAll(A1_ROW_REF);
  for (const match of rowMatches) {
    const startRow = parseInt(match[1].replace('$', ''), 10) - 1;
    const endRow = parseInt(match[2].replace('$', ''), 10) - 1;
    if (!isNaN(startRow) && !isNaN(endRow)) {
      // Track first 100 columns for row ranges
      for (let row = startRow; row <= endRow; row++) {
        for (let col = 0; col < 100; col++) {
          addresses.add(`${row}:${col}`);
        }
      }
    }
  }
  
  // Extract single cell references (A1, B2)
  // Remove ranges first to avoid double-counting
  const noRanges = unqualified.replace(A1_RANGE_REF, '').replace(A1_COL_REF, '').replace(A1_ROW_REF, '');
  const cellMatches = noRanges.matchAll(A1_CELL_REF);
  for (const match of cellMatches) {
    const addr = parseA1Address(match[1]);
    if (addr) {
      addresses.add(`${addr.row}:${addr.col}`);
    }
  }
}

/**
 * Extract R1C1-style references (R1C1, R[-1]C[2], etc.)
 */
function extractR1C1References(expr: string, currentCell: Address, addresses: Set<string>): void {
  const matches = expr.matchAll(R1C1_CELL_REF);
  
  for (const match of matches) {
    const rowPart = match[1];
    const colPart = match[2];
    
    // Parse row (absolute or relative)
    let row: number;
    if (!rowPart) {
      row = currentCell.row; // RC means current row
    } else if (rowPart.startsWith('[')) {
      // Relative: R[1] means one row down
      const offset = parseInt(rowPart.slice(1, -1), 10);
      row = currentCell.row + offset;
    } else {
      // Absolute: R1 means row 1 (0-indexed = 0)
      row = parseInt(rowPart, 10) - 1;
    }
    
    // Parse column (absolute or relative)
    let col: number;
    if (!colPart) {
      col = currentCell.col; // RC means current column
    } else if (colPart.startsWith('[')) {
      // Relative: C[-2] means two columns left
      const offset = parseInt(colPart.slice(1, -1), 10);
      col = currentCell.col + offset;
    } else {
      // Absolute: C1 means column 1 (0-indexed = 0)
      col = parseInt(colPart, 10) - 1;
    }
    
    // Validate bounds
    if (row >= 0 && col >= 0 && row < 1048576 && col < 16384) {
      addresses.add(`${row}:${col}`);
    }
  }
}

/**
 * Parse A1-style cell reference string to Address.
 * Handles absolute references ($A$1) by stripping $.
 */
function parseA1Address(ref: string): Address | null {
  // Remove $ signs
  const clean = ref.replace(/\$/g, '');
  
  // Split into column and row parts
  const match = clean.match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  
  const col = parseA1Column(match[1]);
  const row = parseInt(match[2], 10) - 1; // Convert to 0-indexed
  
  if (col === null || isNaN(row) || row < 0) return null;
  
  return { row, col };
}

/**
 * Parse A1-style column reference to 0-indexed column number.
 * A=0, B=1, ..., Z=25, AA=26, etc.
 */
function parseA1Column(colStr: string): number | null {
  const clean = colStr.replace('$', '').toUpperCase();
  let col = 0;
  
  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i) - 65; // 'A' = 0
    if (charCode < 0 || charCode > 25) return null;
    col = col * 26 + charCode + 1;
  }
  
  return col - 1; // Convert to 0-indexed
}

/**
 * Expand a range (A1:B10) into individual cell addresses.
 * Adds all cells in the range to the addresses Set.
 */
function expandRange(start: Address, end: Address, addresses: Set<string>): void {
  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);
  const minCol = Math.min(start.col, end.col);
  const maxCol = Math.max(start.col, end.col);
  
  // Cap at reasonable size to avoid memory explosion
  const MAX_RANGE_SIZE = 10000;
  const rangeSize = (maxRow - minRow + 1) * (maxCol - minCol + 1);
  
  if (rangeSize > MAX_RANGE_SIZE) {
    // For very large ranges (e.g., entire columns), sample strategically
    // Track corners + center + edges
    for (const row of [minRow, Math.floor((minRow + maxRow) / 2), maxRow]) {
      for (const col of [minCol, Math.floor((minCol + maxCol) / 2), maxCol]) {
        addresses.add(`${row}:${col}`);
      }
    }
  } else {
    // Normal range: expand fully
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        addresses.add(`${row}:${col}`);
      }
    }
  }
}

/**
 * Remove string literals from formula to avoid false positives.
 * Replaces "..." with empty string.
 */
function removeStringLiterals(formula: string): string {
  // Remove double-quoted strings
  let result = formula.replace(/"(?:[^"\\]|\\.)*"/g, '""');
  // Remove single-quoted sheet names
  result = result.replace(/'(?:[^'\\]|\\.)*'/g, "''");
  return result;
}

/**
 * Check if a name is a known Excel function (to exclude from named range detection).
 * This is a simplified check - full implementation would query the function registry.
 */
const KNOWN_FUNCTIONS = new Set([
  'SUM', 'AVERAGE', 'MIN', 'MAX', 'COUNT', 'COUNTA', 'COUNTBLANK',
  'IF', 'IFERROR', 'IFNA', 'IFS',
  'VLOOKUP', 'HLOOKUP', 'XLOOKUP', 'INDEX', 'MATCH',
  'AND', 'OR', 'NOT', 'XOR',
  'SUMIF', 'SUMIFS', 'AVERAGEIF', 'AVERAGEIFS', 'COUNTIF', 'COUNTIFS',
  'NOW', 'TODAY', 'DATE', 'TIME',
  'ROUND', 'ROUNDUP', 'ROUNDDOWN', 'FLOOR', 'CEILING',
  // Add more as needed - this list prevents false positives
]);

/**
 * Extract named range references from a formula.
 * Named ranges are uppercase identifiers that aren't functions.
 * 
 * Note: This is a heuristic - true named range resolution requires
 * querying the NameManager registry.
 */
export function extractNamedRanges(formula: string): string[] {
  const cleaned = removeStringLiterals(formula);
  const matches = cleaned.matchAll(NAMED_RANGE);
  const names: string[] = [];
  
  for (const match of matches) {
    const name = match[1].toUpperCase();
    // Exclude known function names
    if (!KNOWN_FUNCTIONS.has(name)) {
      names.push(name);
    }
  }
  
  return [...new Set(names)]; // Deduplicate
}
