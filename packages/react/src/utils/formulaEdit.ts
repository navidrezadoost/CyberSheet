import type { Address } from '@cyber-sheet/core';
import { formatAddressA1, formatRangeA1, parseA1Reference } from './parseA1Reference';

export function normalizeAddressRange(start: Address, end: Address): { start: Address; end: Address } {
  return {
    start: {
      row: Math.min(start.row, end.row),
      col: Math.min(start.col, end.col),
    },
    end: {
      row: Math.max(start.row, end.row),
      col: Math.max(start.col, end.col),
    },
  };
}

export function addressesEqual(a: Address, b: Address): boolean {
  return a.row === b.row && a.col === b.col;
}

/** True when the user is editing a formula (starts with =). */
export function isFormulaEditValue(value: string): boolean {
  return value.startsWith('=');
}

export function formatSelectionAsReference(start: Address, end: Address): string {
  if (addressesEqual(start, end)) {
    return formatAddressA1(start);
  }
  return formatRangeA1(normalizeAddressRange(start, end));
}

export function insertAtCursor(
  text: string,
  cursor: number,
  insertion: string,
): { text: string; cursor: number } {
  const safeCursor = Math.max(0, Math.min(cursor, text.length));
  const newText = text.slice(0, safeCursor) + insertion + text.slice(safeCursor);
  return { text: newText, cursor: safeCursor + insertion.length };
}

const TRAILING_CELL_REF = /(\$?[A-Z]{1,3}\$?\d+)$/i;

/**
 * Excel point mode: if the token before the cursor is a cell reference and the
 * user picks another cell, extend to a range (e.g. B2 then B5 → B2:B5).
 */
export function mergePointReference(
  formula: string,
  cursor: number,
  pickedRef: string,
  pickedIsRange: boolean,
): { text: string; cursor: number } {
  if (pickedIsRange) {
    return insertAtCursor(formula, cursor, pickedRef);
  }

  const before = formula.slice(0, cursor);
  const after = formula.slice(cursor);
  const tailMatch = before.match(TRAILING_CELL_REF);

  if (tailMatch) {
    const prevAddr = parseA1Reference(tailMatch[1]);
    const newAddr = parseA1Reference(pickedRef);
    if (prevAddr && newAddr && !addressesEqual(prevAddr, newAddr)) {
      const rangeRef = formatRangeA1(normalizeAddressRange(prevAddr, newAddr));
      const newBefore = before.slice(0, -tailMatch[0].length) + rangeRef;
      return { text: newBefore + after, cursor: newBefore.length };
    }
  }

  return insertAtCursor(formula, cursor, pickedRef);
}
