import {
  InsertCellsCommand,
  DeleteCellsCommand,
  type InsertCellsMode,
  type DeleteCellsMode,
  type Address,
  type CommandManager,
  type Worksheet,
} from '@cyber-sheet/core';

export interface CellRange {
  start: Address;
  end: Address;
}

export function executeInsertCells(
  worksheet: Worksheet,
  commandManager: CommandManager,
  range: CellRange,
  mode: InsertCellsMode
): void {
  commandManager.execute(new InsertCellsCommand(worksheet, range, mode));
}

export function executeDeleteCells(
  worksheet: Worksheet,
  commandManager: CommandManager,
  range: CellRange,
  mode: DeleteCellsMode
): void {
  commandManager.execute(new DeleteCellsCommand(worksheet, range, mode));
}

export function getInsertDeleteInvalidateBounds(
  worksheet: Worksheet,
  range: CellRange,
  mode: InsertCellsMode | DeleteCellsMode
): { r1: number; c1: number; r2: number; c2: number } {
  const r1 = Math.min(range.start.row, range.end.row);
  const r2 = Math.max(range.start.row, range.end.row);
  const c1 = Math.min(range.start.col, range.end.col);
  const c2 = Math.max(range.start.col, range.end.col);

  if (mode === 'row' || mode === 'column') {
    return { r1: 1, c1: 1, r2: worksheet.rowCount, c2: worksheet.colCount };
  }

  if (mode === 'right' || mode === 'left') {
    return { r1, c1, r2, c2: worksheet.colCount };
  }

  return { r1, c1, r2: worksheet.rowCount, c2 };
}
