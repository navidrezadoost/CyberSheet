/**
 * InsertCellsCommand.ts
 *
 * Command for inserting cells with shift down/right, entire row, or entire column.
 */

import type { Command } from './CommandManager';
import type { Address, ExtendedCellValue, CellStyle } from './types';
import type { Worksheet } from './worksheet';

export type InsertCellsMode = 'down' | 'right' | 'row' | 'column';

interface CellSnapshot {
  addr: Address;
  value: ExtendedCellValue;
  formula: string | undefined;
  style: CellStyle | undefined;
}

interface InsertCellsRange {
  start: Address;
  end: Address;
}

function normalizeRange(range: InsertCellsRange) {
  return {
    r1: Math.min(range.start.row, range.end.row),
    r2: Math.max(range.start.row, range.end.row),
    c1: Math.min(range.start.col, range.end.col),
    c2: Math.max(range.start.col, range.end.col),
  };
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

export class InsertCellsCommand implements Command {
  private worksheet: Worksheet;
  private range: InsertCellsRange;
  private mode: InsertCellsMode;
  private snapshots: CellSnapshot[] = [];

  readonly description: string;

  constructor(
    worksheet: Worksheet,
    range: InsertCellsRange,
    mode: InsertCellsMode = 'down'
  ) {
    this.worksheet = worksheet;
    this.range = range;
    this.mode = mode;

    const { r1, r2, c1, c2 } = normalizeRange(range);
    const lastRow = worksheet.rowCount;
    const lastCol = worksheet.colCount;

    switch (mode) {
      case 'right':
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
      case 'down':
      default:
        for (let row = r1; row <= lastRow; row++) {
          for (let col = c1; col <= c2; col++) {
            this.snapshots.push(snapshotCell(worksheet, { row, col }));
          }
        }
        break;
    }

    this.description = `Insert cells (${r1},${c1}) to (${r2},${c2}) — ${mode}`;
  }

  execute(): void {
    const { r1, r2, c1, c2 } = normalizeRange(this.range);
    const lastRow = this.worksheet.rowCount;
    const lastCol = this.worksheet.colCount;
    const rowSpan = r2 - r1 + 1;
    const colSpan = c2 - c1 + 1;

    switch (this.mode) {
      case 'right': {
        for (let col = lastCol; col >= c2 + 1; col--) {
          for (let row = r1; row <= r2; row++) {
            copyCell(this.worksheet, { row, col: col - colSpan }, { row, col });
          }
        }
        for (let row = r1; row <= r2; row++) {
          for (let col = c1; col <= c2; col++) {
            clearCell(this.worksheet, { row, col });
          }
        }
        break;
      }
      case 'row': {
        for (let row = lastRow; row >= r2 + 1; row--) {
          for (let col = 1; col <= lastCol; col++) {
            copyCell(this.worksheet, { row: row - rowSpan, col }, { row, col });
          }
        }
        for (let row = r1; row <= r2; row++) {
          for (let col = 1; col <= lastCol; col++) {
            clearCell(this.worksheet, { row, col });
          }
        }
        break;
      }
      case 'column': {
        for (let col = lastCol; col >= c2 + 1; col--) {
          for (let row = 1; row <= lastRow; row++) {
            copyCell(this.worksheet, { row, col: col - colSpan }, { row, col });
          }
        }
        for (let row = 1; row <= lastRow; row++) {
          for (let col = c1; col <= c2; col++) {
            clearCell(this.worksheet, { row, col });
          }
        }
        break;
      }
      case 'down':
      default: {
        for (let row = lastRow; row >= r2 + 1; row--) {
          for (let col = c1; col <= c2; col++) {
            copyCell(this.worksheet, { row: row - rowSpan, col }, { row, col });
          }
        }
        for (let row = r1; row <= r2; row++) {
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

      if (snapshot.style !== undefined) {
        this.worksheet.setCellStyle(snapshot.addr, snapshot.style);
      }
    }
  }
}
