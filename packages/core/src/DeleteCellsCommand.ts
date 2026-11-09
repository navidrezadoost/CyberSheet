/**
 * DeleteCellsCommand.ts
 *
 * Command for deleting cells with shift up/left, entire row, or entire column.
 */

import type { Command } from './CommandManager';
import type { Address, ExtendedCellValue, CellStyle } from './types';
import type { Worksheet } from './worksheet';

export type DeleteCellsMode = 'up' | 'left' | 'row' | 'column';

interface CellSnapshot {
  addr: Address;
  value: ExtendedCellValue;
  formula: string | undefined;
  style: CellStyle | undefined;
}

interface DeleteCellsRange {
  start: Address;
  end: Address;
}

function normalizeRange(range: DeleteCellsRange) {
  return {
    r1: Math.min(range.start.row, range.end.row),
    r2: Math.max(range.start.row, range.end.row),
    c1: Math.min(range.start.col, range.end.col),
    c2: Math.max(range.start.col, range.end.col),
  };
}

function assertDeleteRange(worksheet: Worksheet, range: DeleteCellsRange): void {
  const { start, end } = range;
  if (
    !Number.isInteger(start.row) ||
    !Number.isInteger(start.col) ||
    !Number.isInteger(end.row) ||
    !Number.isInteger(end.col) ||
    start.row < 1 ||
    start.col < 1 ||
    end.row < 1 ||
    end.col < 1 ||
    Math.max(start.row, end.row) > worksheet.rowCount ||
    Math.max(start.col, end.col) > worksheet.colCount
  ) {
    throw new RangeError(
      `Delete range out of bounds: (${start.row},${start.col}) to (${end.row},${end.col}); expected an ordered range within rows 1–${worksheet.rowCount} and columns 1–${worksheet.colCount}.`,
    );
  }
}

function snapshotCell(worksheet: Worksheet, addr: Address): CellSnapshot {
  const cell = worksheet.getCell(addr);
  return {
    addr: { ...addr },
    value: cell?.value ?? null,
    formula: cell?.formula,
    style: cell?.style,
  };
}

function copyCell(worksheet: Worksheet, source: Address, target: Address): void {
  const sourceCell = worksheet.getCell(source);
  if (sourceCell) {
    worksheet.setCellValue(target, sourceCell.value ?? null);
    worksheet.setCellFormula(target, sourceCell.formula ?? '');
    worksheet.setCellStyle(target, sourceCell.style);
  } else {
    worksheet.setCellValue(target, null);
    worksheet.setCellFormula(target, '');
    worksheet.setCellStyle(target, undefined);
  }
}

function clearCell(worksheet: Worksheet, addr: Address): void {
  worksheet.setCellValue(addr, null);
  worksheet.setCellFormula(addr, '');
  worksheet.setCellStyle(addr, undefined);
}

export class DeleteCellsCommand implements Command {
  private worksheet: Worksheet;
  private range: DeleteCellsRange;
  private mode: DeleteCellsMode;
  private snapshots: CellSnapshot[] = [];

  readonly description: string;

  constructor(
    worksheet: Worksheet,
    range: DeleteCellsRange,
    mode: DeleteCellsMode = 'up'
  ) {
    // Validate before snapshots are captured so invalid requests cannot reach
    // either the mutation loop or the CommandManager history path.
    assertDeleteRange(worksheet, range);
    this.worksheet = worksheet;
    this.range = range;
    this.mode = mode;

    const { r1, r2, c1, c2 } = normalizeRange(range);
    const lastRow = worksheet.rowCount;
    const lastCol = worksheet.colCount;

    switch (mode) {
      case 'left':
        for (let row = r1; row <= r2; row++) {
          for (let col = c1; col <= lastCol; col++) {
            this.snapshots.push(snapshotCell(worksheet, { row, col }));
          }
        }
        break;
      case 'row':
        for (let row = r1; row <= lastRow; row++) {
          for (let col = 1; col <= lastCol; col++) {
            this.snapshots.push(snapshotCell(worksheet, { row, col }));
          }
        }
        break;
      case 'column':
        for (let row = 1; row <= lastRow; row++) {
          for (let col = c1; col <= lastCol; col++) {
            this.snapshots.push(snapshotCell(worksheet, { row, col }));
          }
        }
        break;
      case 'up':
      default:
        for (let row = r1; row <= lastRow; row++) {
          for (let col = c1; col <= c2; col++) {
            this.snapshots.push(snapshotCell(worksheet, { row, col }));
          }
        }
        break;
    }

    this.description = `Delete cells (${r1},${c1}) to (${r2},${c2}) — ${mode}`;
  }

  execute(): void {
    const { r1, r2, c1, c2 } = normalizeRange(this.range);
    const lastRow = this.worksheet.rowCount;
    const lastCol = this.worksheet.colCount;
    const rowSpan = r2 - r1 + 1;
    const colSpan = c2 - c1 + 1;

    switch (this.mode) {
      case 'left': {
        for (let col = c1; col <= lastCol - colSpan; col++) {
          for (let row = r1; row <= r2; row++) {
            copyCell(this.worksheet, { row, col: col + colSpan }, { row, col });
          }
        }
        for (let row = r1; row <= r2; row++) {
          for (let col = lastCol - colSpan + 1; col <= lastCol; col++) {
            clearCell(this.worksheet, { row, col });
          }
        }
        break;
      }
      case 'row': {
        for (let row = r1; row <= lastRow - rowSpan; row++) {
          for (let col = 1; col <= lastCol; col++) {
            copyCell(this.worksheet, { row: row + rowSpan, col }, { row, col });
          }
        }
        for (let row = lastRow - rowSpan + 1; row <= lastRow; row++) {
          for (let col = 1; col <= lastCol; col++) {
            clearCell(this.worksheet, { row, col });
          }
        }
        break;
      }
      case 'column': {
        for (let col = c1; col <= lastCol - colSpan; col++) {
          for (let row = 1; row <= lastRow; row++) {
            copyCell(this.worksheet, { row, col: col + colSpan }, { row, col });
          }
        }
        for (let row = 1; row <= lastRow; row++) {
          for (let col = lastCol - colSpan + 1; col <= lastCol; col++) {
            clearCell(this.worksheet, { row, col });
          }
        }
        break;
      }
      case 'up':
      default: {
        for (let row = r1; row <= lastRow - rowSpan; row++) {
          for (let col = c1; col <= c2; col++) {
            copyCell(this.worksheet, { row: row + rowSpan, col }, { row, col });
          }
        }
        for (let row = lastRow - rowSpan + 1; row <= lastRow; row++) {
          for (let col = c1; col <= c2; col++) {
            clearCell(this.worksheet, { row, col });
          }
        }
        break;
      }
    }
  }

  undo(): void {
    for (const snapshot of this.snapshots) {
      if (snapshot.formula) {
        this.worksheet.setCellFormula(snapshot.addr, snapshot.formula);
      } else {
        this.worksheet.setCellValue(snapshot.addr, snapshot.value);
      }

      // Every destination is part of the captured style state. Clearing an
      // originally unstyled destination is necessary when deletion shifted a
      // styled cell into it.
      this.worksheet.setCellStyle(snapshot.addr, snapshot.style);
    }
  }
}
