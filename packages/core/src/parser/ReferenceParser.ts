/**
 * ReferenceParser.ts
 * 
 * Handles parsing of cell and range references.
 * Optimized for performance with regex caching and monomorphic patterns.
 */

import type { Address } from '../types';

/**
 * Cell reference regex (cached for performance)
 * Matches: A1, B2, AA10, etc.
 */
const CELL_REF_REGEX = /^([A-Z]+)(\d+)$/i;

/**
 * Range reference regex (cached for performance)
 * Matches: A1:B10, C5:D20, etc.
 */
const RANGE_REF_REGEX = /^([A-Z]+\d+):([A-Z]+\d+)$/i;

/**
 * Check if string is a cell reference
 * Fast check using cached regex
 */
export function isCellReference(expr: string): boolean {
  return CELL_REF_REGEX.test(expr);
}

/**
 * Check if string is a range reference
 * Fast check using cached regex
 */
export function isRangeReference(expr: string): boolean {
  return RANGE_REF_REGEX.test(expr);
}

/**
 * Parse cell reference to Address
 * Example: "A1" -> {row: 1, col: 1}
 * 
 * Optimized with:
 * - Cached regex
 * - Monomorphic return type
 * - Early validation
 */
export function parseCellReference(ref: string): Address | Error {
  const match = ref.match(CELL_REF_REGEX);
  
  if (!match) {
    return new Error('#REF!');
  }

  const colStr = match[1].toUpperCase();
  const rowStr = match[2];

  // Parse column (A=1, B=2, ..., Z=26, AA=27, etc.)
  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 65 + 1);
  }

  // Parse row (1-based)
  const row = parseInt(rowStr, 10);

  if (isNaN(row) || row < 1 || col < 1) {
    return new Error('#REF!');
  }

  return { row, col };
}

/**
 * Parse range reference to start and end addresses
 * Example: "A1:B10" -> [{row: 1, col: 1}, {row: 10, col: 2}]
 */
export function parseRangeReference(ref: string): [Address, Address] | Error {
  const match = ref.match(RANGE_REF_REGEX);
  
  if (!match) {
    return new Error('#REF!');
  }

  const startRef = match[1];
  const endRef = match[2];

  const start = parseCellReference(startRef);
  const end = parseCellReference(endRef);

  if (start instanceof Error) return start;
  if (end instanceof Error) return end;

  // Validate range (start should be before or equal to end)
  if (start.row > end.row || start.col > end.col) {
    return new Error('#REF!');
  }

  return [start, end];
}

/**
 * Convert Address to cell reference string
 * Example: {row: 1, col: 1} -> "A1"
 */
export function addressToCellRef(addr: Address): string {
  // Convert column number to letters (1=A, 2=B, ..., 27=AA, etc.)
  let col = addr.col;
  let colStr = '';
  
  while (col > 0) {
    const remainder = (col - 1) % 26;
    colStr = String.fromCharCode(65 + remainder) + colStr;
    col = Math.floor((col - 1) / 26);
  }

  return `${colStr}${addr.row}`;
}

/**
 * Convert two addresses to range reference string
 * Example: [{row: 1, col: 1}, {row: 10, col: 2}] -> "A1:B10"
 */
export function addressToRangeRef(start: Address, end: Address): string {
  return `${addressToCellRef(start)}:${addressToCellRef(end)}`;
}

/**
 * Get all cell addresses in a range
 * Optimized with pre-allocated array
 */
export function getRangeCells(start: Address, end: Address): Address[] {
  const rows = end.row - start.row + 1;
  const cols = end.col - start.col + 1;
  const total = rows * cols;

  // Pre-allocate array for performance
  const cells: Address[] = new Array(total);
  let index = 0;

  for (let row = start.row; row <= end.row; row++) {
    for (let col = start.col; col <= end.col; col++) {
      cells[index++] = { row, col };
    }
  }

  return cells;
}

/**
 * Check if address is within range
 */
export function isAddressInRange(addr: Address, start: Address, end: Address): boolean {
  return (
    addr.row >= start.row &&
    addr.row <= end.row &&
    addr.col >= start.col &&
    addr.col <= end.col
  );
}

/**
 * Get range dimensions
 * Returns [rows, cols]
 */
export function getRangeDimensions(start: Address, end: Address): [number, number] {
  const rows = end.row - start.row + 1;
  const cols = end.col - start.col + 1;
  return [rows, cols];
}

/**
 * Expand range by offset
 * Returns new start and end addresses
 */
export function expandRange(
  start: Address,
  end: Address,
  rowOffset: number,
  colOffset: number
): [Address, Address] {
  return [
    { row: start.row + rowOffset, col: start.col + colOffset },
    { row: end.row + rowOffset, col: end.col + colOffset },
  ];
}

/**
 * Validate address bounds
 */
export function validateAddress(addr: Address, maxRow: number = 1048576, maxCol: number = 16384): boolean {
  return (
    addr.row >= 1 &&
    addr.row <= maxRow &&
    addr.col >= 1 &&
    addr.col <= maxCol
  );
}
