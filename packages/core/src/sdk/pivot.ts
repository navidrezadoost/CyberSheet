/**
 * pivot.ts — Phase 25: Pivot Kernel Foundation
 *
 * Pure, deterministic pivot-table engine for @cyber-sheet/core.
 *
 * ==========================================================================
 * DESIGN PRINCIPLES
 * ==========================================================================
 *
 *  PURE — `buildPivot` is a pure function.  It takes a raw 2-D grid and a
 *  definition; it returns a PivotGrid.  It has ZERO side-effects and ZERO
 *  worksheet access.  This keeps the kernel free from contamination and makes
 *  unit-testing trivial.
 *
 *  SERIALIZABLE — `PivotDefinition` is a plain JSON-round-trip-safe object.
 *  No Functions, Symbols, or class instances.  Store it in a patch, send it
 *  over a Worker boundary, persist it to localStorage — all work out of the
 *  box.
 *
 *  IMMUTABLE — neither the input grid nor the definition is mutated.
 *
 *  DETERMINISTIC — given the same arguments, `buildPivot` always returns the
 *  exact same result.  Groups appear in the order first encountered scanning
 *  top-to-bottom; values within a group are aggregated in source order.
 *
 *  TYPED ERRORS — all failure modes throw a concrete subclass of `SdkError`
 *  (defined in errors.ts, zero circular imports).
 *
 * ==========================================================================
 * SCOPE (Phase 25 — kernel only)
 * ==========================================================================
 *
 *  ✅  Row grouping (1+ fields)
 *  ✅  Aggregators: sum, count, avg
 *  ✅  Multiple value columns
 *  ✅  Null / non-numeric cell handling
 *  ✅  Deterministic group ordering (insertion order)
 *  ✅  Full error coverage (source, field, empty)
 *
 *  ❌  Column-axis pivoting (cross-tabulation) — Phase 26
 *  ❌  Calculated fields                        — Phase 26
 *  ❌  Slicers / filters                        — Phase 26
 *  ❌  Dynamic recalculation on source edit     — Phase 26
 *  ❌  UI                                       — Phase 26
 *
 * ==========================================================================
 * USAGE
 * ==========================================================================
 *
 *  // Pure engine (no worksheet required):
 *  const rawGrid = [
 *    ['Region', 'Sales', 'Units'],    // header row
 *    ['North',  1000,    5],
 *    ['South',  2000,    8],
 *    ['North',  500,     3],
 *  ];
 *
 *  const definition: PivotDefinition = {
 *    source: { start: { row: 1, col: 1 }, end: { row: 4, col: 3 } },
 *    rows: ['Region'],
 *    values: [
 *      { field: 'Sales', aggregator: 'sum' },
 *      { field: 'Units', aggregator: 'count' },
 *    ],
 *  };
 *
 *  const grid = buildPivot(rawGrid, definition);
 *  // grid.headers  → ['Region', 'sum(Sales)', 'count(Units)']
 *  // grid.rows[0]  → { keys: ['North'], values: [1500, 2] }
 *  // grid.rows[1]  → { keys: ['South'], values: [2000, 1] }
 *
 *  // Via SDK (writes to worksheet, single undo entry):
 *  const grid2 = sdk.createPivot(definition, { row: 6, col: 1 });
 */

import type { ExtendedCellValue } from '../types';
import { PivotSourceError, PivotFieldError, EmptyPivotSourceError } from './errors';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Supported aggregation functions for pivot values. */
export type PivotAggregator = 'sum' | 'count' | 'avg';

/**
 * Specifies one value column in the pivot output.
 *
 * `field`        — header name of the source column to aggregate.
 * `aggregator`   — 'sum' | 'count' | 'avg'.
 * `label`        — optional output column header; defaults to
 *                  `"<aggregator>(<field>)"`, e.g. `"sum(Sales)"`.
 */
export interface PivotValueSpec {
  field:      string;
  aggregator: PivotAggregator;
  label?:     string;
}

/**
 * Immutable, JSON-serializable definition of a pivot table.
 *
 * `source` — source cell range on the worksheet (1-based inclusive).
 *            The first row of the range is treated as the header row.
 * `rows`   — one or more field names to group rows by (order matters).
 * `values` — one or more value specifications to aggregate.
 *
 * `columns` is intentionally absent in Phase 25 (cross-tabulation is Phase 26).
 */
export interface PivotDefinition {
  /** Source range on the worksheet (1-based). */
  source: { start: { row: number; col: number }; end: { row: number; col: number } };
  /** Field names (from the source header row) to group rows by. */
  rows: string[];
  /** Value columns to aggregate. */
  values: PivotValueSpec[];
}

/**
 * A single output row of the pivot grid.
 *
 * `keys`   — group key values (one per entry in `PivotDefinition.rows`).
 * `values` — aggregated values (one per entry in `PivotDefinition.values`).
 *            `null` means no numeric data was available for that group × value.
 */
export interface PivotGridRow {
  keys:   string[];
  values: (number | null)[];
}

/**
 * The pure output of `buildPivot`.
 *
 * `headers`  — column header labels: [row-key-field-names…, value-labels…].
 * `rows`     — data rows, one per unique combination of row-group keys.
 * `rowSpan`  — total rows written when rendering: 1 (header) + rows.length.
 * `colSpan`  — total columns written: rows.length + values.length.
 */
export interface PivotGrid {
  /** Column headers for the rendered output grid. */
  headers: string[];
  /** Data rows (one per unique group-key combination). */
  rows:    PivotGridRow[];
  /** Total row count when rendered (header row + data rows). */
  rowSpan: number;
  /** Total column count when rendered. */
  colSpan: number;
}

// ---------------------------------------------------------------------------
// buildPivot — pure function
// ---------------------------------------------------------------------------

/**
 * Build a pivot grid from a raw 2-D source array and a definition.
 *
 * This is a **pure function**: no worksheet access, no side-effects.
 * Call it from tests, Workers, or server-side code without any SDK setup.
 *
 * @param rawGrid    2-D array of cell values.  `rawGrid[0]` is the header row.
 *                   The array uses 0-based indexing (row 0 = first source row).
 * @param definition PivotDefinition describing grouping and aggregation.
 *
 * @throws {PivotSourceError}     if `rawGrid` is empty or has no header row.
 * @throws {PivotFieldError}      if any field name in `definition` is absent
 *                                from the header row.
 * @throws {EmptyPivotSourceError} if `rawGrid` has a header row but zero data rows.
 */
export function buildPivot(
  rawGrid:    ExtendedCellValue[][],
  definition: PivotDefinition,
): PivotGrid {

  // ── 1. Source validation ───────────────────────────────────────────────
  if (rawGrid.length === 0) {
    throw new PivotSourceError('source grid is empty (no rows at all)');
  }

  const headerRow = rawGrid[0]!;
  if (headerRow.length === 0) {
    throw new PivotSourceError('header row is empty (source has no columns)');
  }

  // Normalise headers to strings.
  const headers = headerRow.map(h => (h === null || h === undefined ? '' : String(h)));

  const dataRows = rawGrid.slice(1);
  if (dataRows.length === 0) {
    throw new EmptyPivotSourceError();
  }

  // ── 2. Field resolution ────────────────────────────────────────────────
  if (definition.rows.length === 0) {
    throw new PivotSourceError('PivotDefinition.rows must contain at least one field');
  }
  if (definition.values.length === 0) {
    throw new PivotSourceError('PivotDefinition.values must contain at least one value spec');
  }

  const rowFieldIndices: number[] = definition.rows.map(field => {
    const idx = headers.indexOf(field);
    if (idx === -1) throw new PivotFieldError(field, headers);
    return idx;
  });

  interface ResolvedValueSpec extends PivotValueSpec {
    colIdx: number;
    outputLabel: string;
  }
  const resolvedValues: ResolvedValueSpec[] = definition.values.map(spec => {
    const idx = headers.indexOf(spec.field);
    if (idx === -1) throw new PivotFieldError(spec.field, headers);
    return {
      ...spec,
      colIdx:      idx,
      outputLabel: spec.label ?? `${spec.aggregator}(${spec.field})`,
    };
  });

  // ── 3. Group by row keys (insertion-order stable) ──────────────────────
  // Key separator is NUL so it can't appear in normal field values.
  const GROUP_SEP = '\x00';
  const groupMap = new Map<string, ExtendedCellValue[][]>();
  const groupKeyOrder: string[] = [];

  for (const dataRow of dataRows) {
    const keyParts = rowFieldIndices.map(i => {
      const v = dataRow[i];
      return v === null || v === undefined ? '' : String(v);
    });
    const compositeKey = keyParts.join(GROUP_SEP);

    if (!groupMap.has(compositeKey)) {
      groupMap.set(compositeKey, []);
      groupKeyOrder.push(compositeKey);
    }
    groupMap.get(compositeKey)!.push(dataRow);
  }

  // ── 4. Aggregate ──────────────────────────────────────────────────────
  const outputRows: PivotGridRow[] = groupKeyOrder.map(compositeKey => {
    const groupRows = groupMap.get(compositeKey)!;
    const keys = compositeKey.split(GROUP_SEP);

    const values: (number | null)[] = resolvedValues.map(spec => {
      // For count: count all rows in the group regardless of value type.
      if (spec.aggregator === 'count') {
        return groupRows.length;
      }
      // For sum/avg: collect numeric values only.
      const nums = groupRows
        .map(r => r[spec.colIdx])
        .filter((v): v is number => typeof v === 'number');

      if (nums.length === 0) return null;

      switch (spec.aggregator) {
        case 'sum': return nums.reduce((acc, v) => acc + v, 0);
        case 'avg': return nums.reduce((acc, v) => acc + v, 0) / nums.length;
        default:    return null;
      }
    });

    return { keys, values };
  });

  // ── 5. Construct output ────────────────────────────────────────────────
  const outputHeaders = [
    ...definition.rows,
    ...resolvedValues.map(s => s.outputLabel),
  ];

  return {
    headers: outputHeaders,
    rows:    outputRows,
    rowSpan: 1 + outputRows.length,         // header row + data rows
    colSpan: definition.rows.length + definition.values.length,
  };
}

// ---------------------------------------------------------------------------
// Helpers — exposed for testing
// ---------------------------------------------------------------------------

/**
 * Flatten a `PivotGrid` into a 2-D array of `ExtendedCellValue` values,
 * suitable for writing directly into a worksheet.
 *
 * `grid2d[0]` is the header row; `grid2d[1..N]` are the data rows.
 *
 * This is a pure function used internally by `createPivot` and can also be
 * used independently in tests or custom render layers.
 */
export function pivotGridToValues(grid: PivotGrid): ExtendedCellValue[][] {
  const result: ExtendedCellValue[][] = [];

  // Header row
  result.push(grid.headers.map(h => h as ExtendedCellValue));

  // Data rows
  for (const row of grid.rows) {
    result.push([
      ...row.keys   as ExtendedCellValue[],
      ...row.values as ExtendedCellValue[],
    ]);
  }

  return result;
}
