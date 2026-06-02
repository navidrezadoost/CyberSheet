import type { Address, Cell, CommandManager, Range, Worksheet } from '@cyber-sheet/core';
import { AutoSumCommand } from '@cyber-sheet/core';
import { formatRangeA1 } from './parseA1Reference';

export type AutoSumFunction = 'SUM' | 'AVERAGE' | 'COUNT' | 'MAX' | 'MIN';

export interface AutoSumPlan {
  outputCell: Address;
  operandRange: Range;
  formula: string;
}

function normalizeRange(range: Range): Range {
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

function isNumericValue(value: Cell['value']): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return false;
  if (typeof value === 'string' && value.startsWith('#')) return false;
  const parsed = Number(value);
  return Number.isFinite(parsed);
}

function cellIsNumeric(sheet: Worksheet, addr: Address): boolean {
  return isNumericValue(sheet.getCellValue(addr));
}

function cellIsBlank(sheet: Worksheet, addr: Address): boolean {
  const cell = sheet.getCell(addr);
  if (!cell) return true;
  const value = sheet.getCellValue(addr);
  return value === null || value === undefined || value === '';
}

function scanNumericUp(sheet: Worksheet, col: number, fromRow: number): Range | null {
  if (fromRow < 1) return null;
  let endRow = fromRow;
  while (endRow >= 1 && cellIsNumeric(sheet, { row: endRow, col })) {
    endRow -= 1;
  }
  const startRow = endRow + 1;
  if (startRow > fromRow) return null;
  return {
    start: { row: startRow, col },
    end: { row: fromRow, col },
  };
}

function scanNumericLeft(sheet: Worksheet, row: number, fromCol: number): Range | null {
  if (fromCol < 1) return null;
  let endCol = fromCol;
  while (endCol >= 1 && cellIsNumeric(sheet, { row, col: endCol })) {
    endCol -= 1;
  }
  const startCol = endCol + 1;
  if (startCol > fromCol) return null;
  return {
    start: { row, col: startCol },
    end: { row, col: fromCol },
  };
}

function buildFormula(fn: AutoSumFunction, range: Range): string {
  return `=${fn}(${formatRangeA1(range)})`;
}

function columnHasNumeric(sheet: Worksheet, col: number, rowStart: number, rowEnd: number): boolean {
  for (let row = rowStart; row <= rowEnd; row++) {
    if (cellIsNumeric(sheet, { row, col })) return true;
  }
  return false;
}

function numericRowsInColumn(
  sheet: Worksheet,
  col: number,
  rowStart: number,
  rowEnd: number,
): Range | null {
  let top = -1;
  let bottom = -1;
  for (let row = rowStart; row <= rowEnd; row++) {
    if (cellIsNumeric(sheet, { row, col })) {
      if (top === -1) top = row;
      bottom = row;
    }
  }
  if (top === -1) return null;
  return { start: { row: top, col }, end: { row: bottom, col } };
}

function numericColsInRow(
  sheet: Worksheet,
  row: number,
  colStart: number,
  colEnd: number,
): Range | null {
  let left = -1;
  let right = -1;
  for (let col = colStart; col <= colEnd; col++) {
    if (cellIsNumeric(sheet, { row, col })) {
      if (left === -1) left = col;
      right = col;
    }
  }
  if (left === -1) return null;
  return { start: { row, col: left }, end: { row, col: right } };
}

function trimSelectionToNumericOperand(sheet: Worksheet, range: Range): Range | null {
  const { start, end } = range;
  const height = end.row - start.row + 1;
  const width = end.col - start.col + 1;

  if (height === 1 && width === 1) {
    return cellIsNumeric(sheet, start) ? range : null;
  }

  if (width === 1) {
    return numericRowsInColumn(sheet, start.col, start.row, end.row);
  }

  if (height === 1) {
    return numericColsInRow(sheet, start.row, start.col, end.col);
  }

  return range;
}

function inBounds(sheet: Worksheet, addr: Address): boolean {
  return addr.row >= 1 && addr.col >= 1 && addr.row <= sheet.rowCount && addr.col <= sheet.colCount;
}

/**
 * Detect AutoSum operand range(s) and output cell(s) using Excel-like heuristics:
 * scan above first, then left; for multi-column selections, sum each column below.
 */
export function detectAutoSumPlans(
  sheet: Worksheet,
  selectionRange: Range,
  activeCell: Address,
  fn: AutoSumFunction = 'SUM',
): AutoSumPlan[] {
  const range = normalizeRange(selectionRange);
  const height = range.end.row - range.start.row + 1;
  const width = range.end.col - range.start.col + 1;
  const isSingleCell = height === 1 && width === 1;

  if (isSingleCell) {
    const above = scanNumericUp(sheet, activeCell.col, activeCell.row - 1);
    if (above) {
      return [{
        outputCell: activeCell,
        operandRange: above,
        formula: buildFormula(fn, above),
      }];
    }

    const left = scanNumericLeft(sheet, activeCell.row, activeCell.col - 1);
    if (left) {
      return [{
        outputCell: activeCell,
        operandRange: left,
        formula: buildFormula(fn, left),
      }];
    }

    return [{
      outputCell: activeCell,
      operandRange: { start: activeCell, end: activeCell },
      formula: `=${fn}()`,
    }];
  }

  if (width === 1) {
    const operand = trimSelectionToNumericOperand(sheet, range);
    if (!operand) return [];

    let outputRow = range.end.row + 1;
    if (cellIsBlank(sheet, range.end) && cellIsNumeric(sheet, { row: range.end.row - 1, col: range.start.col })) {
      outputRow = range.end.row;
    } else if (!cellIsBlank(sheet, { row: range.end.row, col: range.start.col })) {
      outputRow = range.end.row + 1;
    }

    const outputCell = { row: outputRow, col: range.start.col };
    if (!inBounds(sheet, outputCell)) return [];

    return [{
      outputCell,
      operandRange: operand,
      formula: buildFormula(fn, operand),
    }];
  }

  if (height === 1) {
    const operand = trimSelectionToNumericOperand(sheet, range);
    if (!operand) return [];

    let outputCol = range.end.col + 1;
    if (cellIsBlank(sheet, range.end) && range.end.col > range.start.col) {
      outputCol = range.end.col;
    }

    const outputCell = { row: range.start.row, col: outputCol };
    if (!inBounds(sheet, outputCell)) return [];

    return [{
      outputCell,
      operandRange: operand,
      formula: buildFormula(fn, operand),
    }];
  }

  const plans: AutoSumPlan[] = [];
  const outputRow = range.end.row + 1;
  for (let col = range.start.col; col <= range.end.col; col++) {
    if (!columnHasNumeric(sheet, col, range.start.row, range.end.row)) continue;
    const operand = numericRowsInColumn(sheet, col, range.start.row, range.end.row);
    if (!operand) continue;
    const outputCell = { row: outputRow, col };
    if (!inBounds(sheet, outputCell)) continue;
    plans.push({
      outputCell,
      operandRange: operand,
      formula: buildFormula(fn, operand),
    });
  }
  return plans;
}

export function applyAutoSumPlans(sheet: Worksheet, plans: AutoSumPlan[]): Address[] {
  const changed: Address[] = [];
  for (const plan of plans) {
    sheet.setCellFormula(plan.outputCell, plan.formula);
    changed.push(plan.outputCell);
  }
  try {
    sheet.autoRecalculate();
  } catch {
    // Formula engine may not be attached.
  }
  return changed;
}

export function executeAutoSum(
  commandManager: CommandManager | null | undefined,
  sheet: Worksheet,
  selectionRange: Range,
  activeCell: Address,
  fn: AutoSumFunction,
): Address[] {
  const plans = detectAutoSumPlans(sheet, selectionRange, activeCell, fn);
  if (plans.length === 0) return [];

  const commandPlans = plans.map((plan) => ({
    outputCell: plan.outputCell,
    formula: plan.formula,
  }));

  if (commandManager) {
    commandManager.execute(new AutoSumCommand(sheet, commandPlans));
  } else {
    applyAutoSumPlans(sheet, plans);
  }

  return plans.map((plan) => plan.outputCell);
}
