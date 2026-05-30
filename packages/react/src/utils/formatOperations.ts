import type { Address, CommandManager, Range, Worksheet } from '@cyber-sheet/core';
import { CanvasTextMeasurer, MockTextMeasurer, type TextMeasurer } from '@cyber-sheet/core';

const COLUMN_PADDING_PX = 12;
const MIN_COLUMN_WIDTH_PX = 12;
const MIN_ROW_HEIGHT_PX = 15;
const ROW_PADDING_PX = 4;

function getMeasurer(): TextMeasurer {
  try {
    return new CanvasTextMeasurer();
  } catch {
    return new MockTextMeasurer();
  }
}

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

function cellDisplayText(worksheet: Worksheet, addr: Address): string {
  const value = worksheet.getCellValue(addr);
  if (value == null) return '';
  return String(value);
}

function measureCellText(
  measurer: TextMeasurer,
  worksheet: Worksheet,
  addr: Address,
): { width: number; height: number } {
  const style = worksheet.getCellStyle(addr);
  const fontSize = style?.fontSize ?? 12;
  const bold = style?.bold ?? false;
  const italic = style?.italic ?? false;
  const text = cellDisplayText(worksheet, addr);
  return measurer.measure(text, fontSize, bold, italic);
}

function rowsInRange(range: Range): number[] {
  const normalized = normalizeRange(range);
  const rows: number[] = [];
  for (let row = normalized.start.row; row <= normalized.end.row; row++) {
    rows.push(row);
  }
  return rows;
}

function colsInRange(range: Range): number[] {
  const normalized = normalizeRange(range);
  const cols: number[] = [];
  for (let col = normalized.start.col; col <= normalized.end.col; col++) {
    cols.push(col);
  }
  return cols;
}

function captureRowHeights(worksheet: Worksheet, rows: number[]): Map<number, number> {
  const previous = new Map<number, number>();
  for (const row of rows) {
    previous.set(row, worksheet.getRowHeight(row));
  }
  return previous;
}

function captureColumnWidths(worksheet: Worksheet, cols: number[]): Map<number, number> {
  const previous = new Map<number, number>();
  for (const col of cols) {
    previous.set(col, worksheet.getColumnWidth(col));
  }
  return previous;
}

function restoreRowHeights(worksheet: Worksheet, previous: Map<number, number>): void {
  for (const [row, height] of previous) {
    worksheet.setRowHeight(row, height);
  }
}

function restoreColumnWidths(worksheet: Worksheet, previous: Map<number, number>): void {
  for (const [col, width] of previous) {
    worksheet.setColumnWidth(col, width);
  }
}

export function setRowHeightsInRange(
  commandManager: CommandManager,
  worksheet: Worksheet,
  range: Range,
  heightPx: number,
): void {
  const rows = rowsInRange(range);
  if (rows.length === 0) return;

  const previous = captureRowHeights(worksheet, rows);
  commandManager.execute({
    description: 'Row Height',
    execute: () => {
      for (const row of rows) {
        worksheet.setRowHeight(row, heightPx);
      }
    },
    undo: () => restoreRowHeights(worksheet, previous),
  });
}

export function setColumnWidthsInRange(
  commandManager: CommandManager,
  worksheet: Worksheet,
  range: Range,
  widthPx: number,
): void {
  const cols = colsInRange(range);
  if (cols.length === 0) return;

  const previous = captureColumnWidths(worksheet, cols);
  commandManager.execute({
    description: 'Column Width',
    execute: () => {
      for (const col of cols) {
        worksheet.setColumnWidth(col, widthPx);
      }
    },
    undo: () => restoreColumnWidths(worksheet, previous),
  });
}

export function autoFitColumnWidths(
  commandManager: CommandManager,
  worksheet: Worksheet,
  range: Range,
): void {
  const normalized = normalizeRange(range);
  const cols = colsInRange(normalized);
  if (cols.length === 0) return;

  const measurer = getMeasurer();
  const previous = captureColumnWidths(worksheet, cols);
  const next = new Map<number, number>();

  for (const col of cols) {
    let maxWidth = MIN_COLUMN_WIDTH_PX;
    for (let row = normalized.start.row; row <= normalized.end.row; row++) {
      const { width } = measureCellText(measurer, worksheet, { row, col });
      maxWidth = Math.max(maxWidth, width + COLUMN_PADDING_PX);
    }
    next.set(col, Math.ceil(maxWidth));
  }

  commandManager.execute({
    description: 'AutoFit Column Width',
    execute: () => {
      for (const [col, width] of next) {
        worksheet.setColumnWidth(col, width);
      }
    },
    undo: () => restoreColumnWidths(worksheet, previous),
  });
}

export function autoFitRowHeights(
  commandManager: CommandManager,
  worksheet: Worksheet,
  range: Range,
): void {
  const normalized = normalizeRange(range);
  const rows = rowsInRange(normalized);
  if (rows.length === 0) return;

  const measurer = getMeasurer();
  const previous = captureRowHeights(worksheet, rows);
  const next = new Map<number, number>();

  for (const row of rows) {
    let maxHeight = MIN_ROW_HEIGHT_PX;
    for (let col = normalized.start.col; col <= normalized.end.col; col++) {
      const { height } = measureCellText(measurer, worksheet, { row, col });
      maxHeight = Math.max(maxHeight, height + ROW_PADDING_PX);
    }
    next.set(row, Math.ceil(maxHeight));
  }

  commandManager.execute({
    description: 'AutoFit Row Height',
    execute: () => {
      for (const [row, height] of next) {
        worksheet.setRowHeight(row, height);
      }
    },
    undo: () => restoreRowHeights(worksheet, previous),
  });
}

export function hideRowsInRange(
  commandManager: CommandManager,
  worksheet: Worksheet,
  range: Range,
): void {
  const rowsToHide = rowsInRange(range).filter((row) => !worksheet.isRowHidden(row));
  if (rowsToHide.length === 0) return;

  commandManager.execute({
    description: 'Hide Rows',
    execute: () => {
      for (const row of rowsToHide) worksheet.hideRow(row);
    },
    undo: () => {
      for (const row of rowsToHide) worksheet.showRow(row);
    },
  });
}

export function unhideRowsNearRange(
  commandManager: CommandManager,
  worksheet: Worksheet,
  range: Range,
): void {
  const normalized = normalizeRange(range);
  const candidates = new Set<number>();

  for (let row = normalized.start.row - 1; row <= normalized.end.row + 1; row++) {
    if (row >= 1) candidates.add(row);
  }

  const rowsToShow: number[] = [];
  for (const row of worksheet.getHiddenRows()) {
    if (candidates.has(row)) rowsToShow.push(row);
  }
  if (rowsToShow.length === 0) return;

  commandManager.execute({
    description: 'Unhide Rows',
    execute: () => {
      for (const row of rowsToShow) worksheet.showRow(row);
    },
    undo: () => {
      for (const row of rowsToShow) worksheet.hideRow(row);
    },
  });
}

export function hideColumnsInRange(
  commandManager: CommandManager,
  worksheet: Worksheet,
  range: Range,
): void {
  const colsToHide = colsInRange(range).filter((col) => !worksheet.isColHidden(col));
  if (colsToHide.length === 0) return;

  commandManager.execute({
    description: 'Hide Columns',
    execute: () => {
      for (const col of colsToHide) worksheet.hideCol(col);
    },
    undo: () => {
      for (const col of colsToHide) worksheet.showCol(col);
    },
  });
}

export function unhideColumnsNearRange(
  commandManager: CommandManager,
  worksheet: Worksheet,
  range: Range,
): void {
  const normalized = normalizeRange(range);
  const candidates = new Set<number>();

  for (let col = normalized.start.col - 1; col <= normalized.end.col + 1; col++) {
    if (col >= 1) candidates.add(col);
  }

  const colsToShow: number[] = [];
  for (const col of worksheet.getHiddenCols()) {
    if (candidates.has(col)) colsToShow.push(col);
  }
  if (colsToShow.length === 0) return;

  commandManager.execute({
    description: 'Unhide Columns',
    execute: () => {
      for (const col of colsToShow) worksheet.showCol(col);
    },
    undo: () => {
      for (const col of colsToShow) worksheet.hideCol(col);
    },
  });
}

export function setCellsLocked(
  commandManager: CommandManager,
  worksheet: Worksheet,
  addresses: Address[],
  locked: boolean,
): void {
  if (addresses.length === 0) return;

  const previous = new Map<string, boolean | undefined>();
  for (const addr of addresses) {
    previous.set(`${addr.row},${addr.col}`, worksheet.getCellStyle(addr)?.locked);
  }

  commandManager.execute({
    description: locked ? 'Lock Cells' : 'Unlock Cells',
    execute: () => {
      for (const addr of addresses) {
        const style = worksheet.getCellStyle(addr) ?? {};
        worksheet.setCellStyle(addr, { ...style, locked });
      }
    },
    undo: () => {
      for (const addr of addresses) {
        const key = `${addr.row},${addr.col}`;
        const style = worksheet.getCellStyle(addr) ?? {};
        const prevLocked = previous.get(key);
        if (prevLocked === undefined) {
          const next = { ...style };
          delete next.locked;
          worksheet.setCellStyle(addr, next);
        } else {
          worksheet.setCellStyle(addr, { ...style, locked: prevLocked });
        }
      }
    },
  });
}
