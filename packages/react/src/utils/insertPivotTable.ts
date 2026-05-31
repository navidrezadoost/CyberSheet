import type {
  Address,
  CommandManager,
  ExtendedCellValue,
  Range,
  Worksheet,
} from '@cyber-sheet/core';
import { BatchCommand, SetValueCommand } from '@cyber-sheet/core';
import {
  buildPivot,
  pivotGridToValues,
  type PivotDefinition,
} from '../../../core/src/sdk/pivot';

function colToLetter(col: number): string {
  let letters = '';
  let value = col;
  while (value > 0) {
    const remainder = (value - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    value = Math.floor((value - 1) / 26);
  }
  return letters;
}

export function formatRangeA1(range: Range): string {
  const start = `${colToLetter(range.start.col)}${range.start.row}`;
  const end = `${colToLetter(range.end.col)}${range.end.row}`;
  return start === end ? start : `${start}:${end}`;
}

export function formatAddressA1(address: Address): string {
  return `${colToLetter(address.col)}${address.row}`;
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

export function resolvePivotSourceRange(
  worksheet: Worksheet,
  selection: Range | null,
): Range | null {
  if (selection) {
    const normalized = normalizeRange(selection);
    const hasMultipleCells =
      normalized.end.row > normalized.start.row ||
      normalized.end.col > normalized.start.col;
    if (hasMultipleCells) {
      return normalized;
    }
  }

  const used = worksheet.getUsedRange();
  if (!used) return null;
  return normalizeRange(used);
}

function extractGrid(worksheet: Worksheet, sourceRange: Range): ExtendedCellValue[][] {
  const grid: ExtendedCellValue[][] = [];
  for (let row = sourceRange.start.row; row <= sourceRange.end.row; row++) {
    const rowValues: ExtendedCellValue[] = [];
    for (let col = sourceRange.start.col; col <= sourceRange.end.col; col++) {
      rowValues.push(worksheet.getCellValue({ row, col }));
    }
    grid.push(rowValues);
  }
  return grid;
}

function inferPivotDefinition(
  sourceRange: Range,
  rawGrid: ExtendedCellValue[][],
): PivotDefinition | null {
  if (rawGrid.length < 2) return null;

  const headers = rawGrid[0]?.map((value) => String(value ?? '').trim()) ?? [];
  if (headers.every((header) => !header)) return null;

  let rowFieldIndex = headers.findIndex((header) => header.length > 0);
  if (rowFieldIndex < 0) return null;

  const rowField = headers[rowFieldIndex]!;
  const valueFields: Array<{ field: string; aggregator: 'sum' | 'count' }> = [];

  for (let col = 0; col < headers.length; col++) {
    if (col === rowFieldIndex) continue;
    const header = headers[col];
    if (!header) continue;

    let hasNumber = false;
    for (let row = 1; row < rawGrid.length; row++) {
      const value = rawGrid[row]?.[col];
      if (typeof value === 'number' && Number.isFinite(value)) {
        hasNumber = true;
        break;
      }
    }

    if (hasNumber) {
      valueFields.push({ field: header, aggregator: 'sum' });
    }
  }

  if (valueFields.length === 0) {
    valueFields.push({ field: rowField, aggregator: 'count' });
  }

  return {
    source: {
      start: { row: 1, col: 1 },
      end: { row: rawGrid.length, col: headers.length },
    },
    rows: [rowField],
    values: valueFields,
  };
}

export function defaultPivotTarget(sourceRange: Range): Address {
  return {
    row: sourceRange.end.row + 2,
    col: sourceRange.start.col,
  };
}

export type InsertPivotTableResult =
  | { ok: true; target: Address; outputRange: Range }
  | { ok: false; error: string };

export function insertPivotTable(
  worksheet: Worksheet,
  commandManager: CommandManager,
  sourceRange: Range,
  target: Address,
): InsertPivotTableResult {
  const normalizedSource = normalizeRange(sourceRange);
  const rawGrid = extractGrid(worksheet, normalizedSource);
  const definition = inferPivotDefinition(normalizedSource, rawGrid);

  if (!definition) {
    return {
      ok: false,
      error: 'Select a range with a header row and at least one data row.',
    };
  }

  let values: ExtendedCellValue[][];
  try {
    const pivotGrid = buildPivot(rawGrid, definition);
    values = pivotGridToValues(pivotGrid);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to create pivot table.',
    };
  }

  if (values.length === 0 || (values[0]?.length ?? 0) === 0) {
    return { ok: false, error: 'Pivot table has no output cells.' };
  }

  const commands: SetValueCommand[] = [];
  for (let row = 0; row < values.length; row++) {
    for (let col = 0; col < (values[row]?.length ?? 0); col++) {
      commands.push(
        new SetValueCommand(
          worksheet,
          { row: target.row + row, col: target.col + col },
          values[row]![col] ?? null,
        ),
      );
    }
  }

  const batch = new BatchCommand(commands, 'Insert PivotTable');
  commandManager.execute(batch);

  return {
    ok: true,
    target,
    outputRange: {
      start: target,
      end: {
        row: target.row + values.length - 1,
        col: target.col + (values[0]?.length ?? 1) - 1,
      },
    },
  };
}
