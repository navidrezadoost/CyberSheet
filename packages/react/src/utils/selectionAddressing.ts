import type { Address } from "@cyber-sheet/core";

export const MAX_EXPANDED_SELECTION_ADDRESSES = 10_000;

export type RangeLike = {
  start: { row: number; col: number };
  end: { row: number; col: number };
};

export type SelectionAddressRange = {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
};

function normalizeBounds(range: RangeLike | null | undefined) {
  if (!range?.start || !range?.end) return null;
  return {
    startRow: Math.min(range.start.row, range.end.row),
    endRow: Math.max(range.start.row, range.end.row),
    startCol: Math.min(range.start.col, range.end.col),
    endCol: Math.max(range.start.col, range.end.col),
  };
}

export function rangesFromSelection(
  range: RangeLike | null | undefined,
): SelectionAddressRange[] {
  const bounds = normalizeBounds(range);
  if (!bounds) return [];
  return [bounds];
}

export function expandAddressesFromSelection(
  range: RangeLike | null | undefined,
): Address[] {
  const bounds = normalizeBounds(range);
  if (!bounds) return [];

  const addresses: Address[] = [];
  for (let row = bounds.startRow; row <= bounds.endRow; row++) {
    for (let col = bounds.startCol; col <= bounds.endCol; col++) {
      addresses.push({ row, col });
    }
  }
  return addresses;
}

export function getFormattableSelection(
  range: RangeLike | null | undefined,
  maxExpandedAddresses: number = MAX_EXPANDED_SELECTION_ADDRESSES,
): {
  ranges: SelectionAddressRange[];
  expanded: Address[] | null;
  cellCount: number;
} {
  const bounds = normalizeBounds(range);
  if (!bounds) return { ranges: [], expanded: null, cellCount: 0 };

  const ranges: SelectionAddressRange[] = [bounds];
  const cellCount =
    (bounds.endRow - bounds.startRow + 1) *
    (bounds.endCol - bounds.startCol + 1);

  if (cellCount > maxExpandedAddresses) {
    return { ranges, expanded: null, cellCount };
  }

  return {
    ranges,
    expanded: expandAddressesFromSelection(range),
    cellCount,
  };
}

export function getLegacySelectionAddresses(
  range: RangeLike | null | undefined,
  maxExpandedAddresses: number = MAX_EXPANDED_SELECTION_ADDRESSES,
): Address[] {
  const selection = getFormattableSelection(range, maxExpandedAddresses);
  if (selection.expanded) return selection.expanded;

  const first = selection.ranges[0];
  if (!first) return [];

  const start = { row: first.startRow, col: first.startCol };
  const end = { row: first.endRow, col: first.endCol };
  return start.row === end.row && start.col === end.col
    ? [start]
    : [start, end];
}
