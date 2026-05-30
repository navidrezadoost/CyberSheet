import type { CommandManager, Range, Worksheet } from '@cyber-sheet/core';
import { SortCommand } from '@cyber-sheet/core';

export function normalizeRange(range: Range): Range {
  return {
    start: {
      row: Math.min(range.start.row, range.end.row),
      col: Math.min(range.start.col, range.end.col),
    },
    end: {
      row: Math.max(range.start.row, range.end.row),
      col: Math.max(range.start.col, range.end.col),
    },
  };
}

/** Expand the selection to the contiguous data block around the anchor cell. */
export function resolveSortRange(sheet: Worksheet, selectionRange: Range): Range {
  const normalized = normalizeRange(selectionRange);
  return sheet.getContiguousRange(normalized.start) ?? normalized;
}

export interface SortLevelInput {
  columnIndex: number;
  ascending: boolean;
}

export function executeSortSelection(
  commandManager: CommandManager,
  sheet: Worksheet,
  selectionRange: Range,
  direction: 'asc' | 'desc',
  options?: { hasHeaders?: boolean; sortCol?: number },
): void {
  const sortRange = resolveSortRange(sheet, selectionRange);
  const normalized = normalizeRange(selectionRange);
  const sortCol = options?.sortCol ?? normalized.start.col;
  const hasHeaders = options?.hasHeaders ?? sortRange.end.row > sortRange.start.row;

  commandManager.execute(
    new SortCommand(
      sheet,
      sortRange,
      [{ columnIndex: sortCol, ascending: direction === 'asc' }],
      hasHeaders,
    ),
  );
}

export function executeMultiSortSelection(
  commandManager: CommandManager,
  sheet: Worksheet,
  selectionRange: Range,
  levels: SortLevelInput[],
  hasHeaders = true,
): void {
  const sortRange = resolveSortRange(sheet, selectionRange);
  const sortLevels = levels.map((level) => ({
    columnIndex: sortRange.start.col + level.columnIndex,
    ascending: level.ascending,
  }));

  commandManager.execute(new SortCommand(sheet, sortRange, sortLevels, hasHeaders));
}
