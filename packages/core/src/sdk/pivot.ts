/**
 * pivot.ts — Phase 25 + 26 + 27: Pivot Kernel (Row Grouping + Cross-Tab + Calculated Fields)
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
 *  top-to-bottom; column keys likewise appear in source-scan insertion order.
 *
 *  TYPED ERRORS — all failure modes throw a concrete subclass of `SdkError`
 *  (defined in errors.ts, zero circular imports).
 *
 * ==========================================================================
 * SCOPE
 * ==========================================================================
 *
 * Phase 25 (kernel foundation):
 *  ✅  Row grouping (1+ fields)
 *  ✅  Aggregators: sum, count, avg
 *  ✅  Multiple value columns
 *  ✅  Null / non-numeric cell handling
 *  ✅  Deterministic group ordering (insertion order)
 *  ✅  Full error coverage (source, field, empty)
 *
 * Phase 26 (column-axis cross-tabulation):
 *  ✅  `PivotDefinition.columns` — optional column-axis field list
 *  ✅  2-D matrix output: row-groups × col-groups
 *  ✅  Deterministic column-key ordering (insertion order)
 *  ✅  Multi-field composite column keys with " | " display separator
 *  ✅  Sparse cell handling (row×col with no data → null per value spec)
 *  ✅  Full header labelling: `"agg(field)(colKey)"`
 *  ✅  `PivotGrid.colKeys` metadata
 *  ✅  Backward-compatible: absent/empty `columns` → Phase 25 flat behaviour
 *
 * Phase 27 (calculated fields):
 *  ✅  `PivotCalculatedSpec` — discriminated union variant `{ type: 'calculated' }`
 *  ✅  `compute(row)` — pure per-row function; results summed across the group
 *  ✅  Mixed aggregate + calculated specs in one definition
 *  ✅  Works in both flat and cross-tab paths
 *  ✅  Null propagation: compute() may return null; ignored in sum
 *  ✅  Label defaults to `name` when omitted
 *  ✅  Full backward-compatibility: old specs without `type` treated as aggregate
 *
 * Deferred (later phases):
 *  ❌  Slicers / filters
 *  ❌  Dynamic recalculation on source edit
 *  ❌  UI
 *
 * ==========================================================================
 * USAGE
 * ==========================================================================
 *
 *  // — Flat row-group pivot (Phase 25) —
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
 *  // — Cross-tab pivot (Phase 26) —
 *  const rawGrid2 = [
 *    ['Region', 'Product', 'Revenue'],
 *    ['North',  'Widget',  1000],
 *    ['South',  'Gadget',  500],
 *    ['North',  'Gadget',  300],
 *    ['East',   'Widget',  700],
 *  ];
 *
 *  const def2: PivotDefinition = {
 *    source:  { start: { row: 1, col: 1 }, end: { row: 5, col: 3 } },
 *    rows:    ['Region'],
 *    columns: ['Product'],
 *    values:  [{ field: 'Revenue', aggregator: 'sum' }],
 *  };
 *
 *  const grid2 = buildPivot(rawGrid2, def2);
 *  // grid2.headers  → ['Region', 'sum(Revenue)(Widget)', 'sum(Revenue)(Gadget)']
 *  // grid2.colKeys  → [['Widget'], ['Gadget']]
 *  // grid2.rows[0]  → { keys: ['North'], values: [1000, 300] }
 *  // grid2.rows[1]  → { keys: ['South'], values: [null, 500] }
 *  // grid2.rows[2]  → { keys: ['East'],  values: [700,  null] }
 *
 *  // — Calculated field (Phase 27) —
 *  const def3: PivotDefinition = {
 *    source: { start: { row: 1, col: 1 }, end: { row: 5, col: 4 } },
 *    rows:   ['Region'],
 *    values: [
 *      { field: 'Revenue', aggregator: 'sum' },
 *      {
 *        type:    'calculated',
 *        name:    'RevenuePerUnit',
 *        compute: row => {
 *          const rev   = row['Revenue'];
 *          const units = row['Units'];
 *          return (typeof rev === 'number' && typeof units === 'number' && units !== 0)
 *            ? rev / units : null;
 *        },
 *      },
 *    ],
 *  };
 *
 *  const grid3 = buildPivot(rawGrid, def3);
 *  // grid3.headers → ['Region', 'sum(Revenue)', 'RevenuePerUnit']
 *  // grid3.rows[0] → { keys: ['North'], values: [1500, 250] }  (1500/6 per row summed)
 *
 *  // Via SDK (writes to worksheet, single undo entry):
 *  const grid4 = sdk.createPivot(definition, { row: 6, col: 1 });
 */

import type { ExtendedCellValue } from '../types';
import { PivotSourceError, PivotFieldError, EmptyPivotSourceError } from './errors';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Supported aggregation functions for pivot values. */
export type PivotAggregator = 'sum' | 'count' | 'avg';

/**
 * Phase 25/26 — aggregation-based value spec.
 *
 * `type`         — discriminant; may be omitted for backward compatibility
 *                  (absence is treated as `'aggregate'`).
 * `field`        — header name of the source column to aggregate.
 * `aggregator`   — 'sum' | 'count' | 'avg'.
 * `label`        — optional output column header; defaults to
 *                  `"<aggregator>(<field>)"`, e.g. `"sum(Sales)"`.
 */
export interface PivotAggregateSpec {
  type?:      'aggregate';
  field:      string;
  aggregator: PivotAggregator;
  label?:     string;
}

/**
 * Phase 27 — calculated-field value spec.
 *
 * The `compute` function receives a single **source data row** as a
 * `Record<headerName, value>` map and should return a `number | null`.
 * It is called once per **source row** in the group; the per-row results
 * are summed (nulls skipped) to produce the cell value — matching Excel's
 * calculated-field semantics.
 *
 * `type`    — discriminant; must be `'calculated'`.
 * `name`    — logical name used to build the output column label.
 * `compute` — pure function: `(row: Record<string, ExtendedCellValue>) => number | null`.
 * `label`   — optional override for the output column header;
 *             defaults to `name`.
 *
 * **Note:** This field is intentionally non-serialisable (contains a function).
 * `buildPivot` accepts it as part of a pure API; the SDK patch layer
 * (`PivotOpDefinition`) continues to support aggregate specs only.
 */
export interface PivotCalculatedSpec {
  type:     'calculated';
  name:     string;
  compute:  (row: Record<string, ExtendedCellValue>) => number | null;
  label?:   string;
}

/**
 * Union of the two value-spec variants.
 *
 * Old code that creates `{ field, aggregator }` objects (without `type`)
 * continues to work — the engine treats absent/`'aggregate'` type identically.
 */
export type PivotValueSpec = PivotAggregateSpec | PivotCalculatedSpec;

/**
 * Immutable, JSON-serializable definition of a pivot table.
 *
 * `source`  — source cell range on the worksheet (1-based inclusive).
 *             The first row of the range is treated as the header row.
 * `rows`    — one or more field names to group rows by (order matters).
 * `values`  — one or more value specifications to aggregate.
 * `columns` — (Phase 26) optional field names to pivot on the column axis.
 *             When present and non-empty, `buildPivot` produces a 2-D
 *             cross-tabulation matrix instead of a flat grouped table.
 *             Omitting this field (or passing `[]`) gives identical output
 *             to Phase 25 behaviour.
 */
export interface PivotDefinition {
  /** Source range on the worksheet (1-based). */
  source: { start: { row: number; col: number }; end: { row: number; col: number } };
  /** Field names (from the source header row) to group rows by. */
  rows: string[];
  /**
   * Value specs — each is either an aggregate spec (Phase 25/26) or a
   * calculated field spec (Phase 27).
   */
  values: PivotValueSpec[];
  /**
   * Phase 26 — optional column-axis field names.
   * When provided and non-empty, enables cross-tabulation.
   * Insertion-order deterministic (mirrors row-field ordering logic).
   */
  columns?: string[];
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
 * Flat pivot (Phase 25, no `columns` field):
 *   `headers`  = [row-key-field-names…, value-labels…]
 *   `rows[i].values.length` = `definition.values.length`
 *   `colKeys`  = undefined
 *
 * Cross-tab pivot (Phase 26, `columns` field present):
 *   `headers`  = [row-key-field-names…, for each col-key: for each value-spec: label]
 *   `rows[i].values.length` = `colKeys.length × definition.values.length`
 *   `colKeys`  = distinct column-axis key combinations (insertion-order)
 *
 * `rowSpan` = 1 (header) + rows.length
 * `colSpan` = total rendered column count
 */
export interface PivotGrid {
  /** Column headers for the rendered output grid. */
  headers: string[];
  /** Data rows (one per unique row-group-key combination). */
  rows:    PivotGridRow[];
  /** Total row count when rendered (header row + data rows). */
  rowSpan: number;
  /** Total column count when rendered. */
  colSpan: number;
  /**
   * Phase 26 — present only when `PivotDefinition.columns` is non-empty.
   * Each element is an array of key parts for one distinct column-axis group
   * (multi-field column definitions produce arrays with length > 1).
   * Ordered by insertion order (first occurrence in source scan).
   */
  colKeys?: string[][];
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

  // ── 2. Field validation ────────────────────────────────────────────────
  if (definition.rows.length === 0) {
    throw new PivotSourceError('PivotDefinition.rows must contain at least one field');
  }
  if (definition.values.length === 0) {
    throw new PivotSourceError('PivotDefinition.values must contain at least one value spec');
  }

  // ── 3. Field resolution ────────────────────────────────────────────────
  // Key separator is NUL — cannot appear in normal cell values.
  const GROUP_SEP    = '\x00';
  // Display separator used when rendering multi-field column keys.
  const DISPLAY_SEP  = ' | ';

  /** Type guard: is this a Phase 27 calculated spec? */
  const isCalc = (s: PivotValueSpec): s is PivotCalculatedSpec =>
    (s as PivotCalculatedSpec).type === 'calculated';

  /** Convert a cell value to its string key fragment. */
  const cellKey = (v: ExtendedCellValue): string =>
    v === null || v === undefined ? '' : String(v);

  const rowFieldIndices: number[] = definition.rows.map(field => {
    const idx = headers.indexOf(field);
    if (idx === -1) throw new PivotFieldError(field, headers);
    return idx;
  });

  // Validate aggregate spec fields; calculated specs need no field validation.
  for (const spec of definition.values) {
    if (!isCalc(spec)) {
      if (headers.indexOf(spec.field) === -1) throw new PivotFieldError(spec.field, headers);
    }
  }

  // Resolved aggregate spec — carries the pre-looked-up column index.
  interface ResolvedAggregateSpec extends PivotAggregateSpec {
    colIdx:      number;
    outputLabel: string;
  }
  // Resolved calculated spec — carries output label and the raw compute fn.
  interface ResolvedCalcSpec extends PivotCalculatedSpec {
    outputLabel: string;
  }
  type ResolvedSpec = ResolvedAggregateSpec | ResolvedCalcSpec;

  const resolvedValues: ResolvedSpec[] = definition.values.map(spec => {
    if (isCalc(spec)) {
      return {
        ...spec,
        outputLabel: spec.label ?? spec.name,
      } as ResolvedCalcSpec;
    }
    const idx = headers.indexOf(spec.field);
    // idx already validated above
    return {
      ...spec,
      colIdx:      idx,
      outputLabel: spec.label ?? `${spec.aggregator}(${spec.field})`,
    } as ResolvedAggregateSpec;
  });

  /**
   * Evaluate a single (resolved spec, group-rows) pair.
   *
   * For aggregate specs  → standard sum/count/avg over the field column.
   * For calculated specs → call compute() per source row, then sum results.
   */
  const evaluate = (
    spec:      ResolvedSpec,
    groupRows: ExtendedCellValue[][],
  ): number | null => {
    if (isCalc(spec)) {
      // Build a Record<headerName, value> for each source row, call compute,
      // then accumulate (sum) non-null results.
      const nums: number[] = [];
      for (const dataRow of groupRows) {
        const rowRecord: Record<string, ExtendedCellValue> = {};
        for (let i = 0; i < headers.length; i++) {
          rowRecord[headers[i]!] = dataRow[i] !== undefined ? dataRow[i]! : null;
        }
        const v = spec.compute(rowRecord);
        if (typeof v === 'number') nums.push(v);
      }
      return nums.length === 0 ? null : nums.reduce((a, b) => a + b, 0);
    }
    // Aggregate spec
    if (spec.aggregator === 'count') return groupRows.length;
    const nums = groupRows
      .map(r => r[(spec as ResolvedAggregateSpec).colIdx])
      .filter((v): v is number => typeof v === 'number');
    if (nums.length === 0) return null;
    const total = nums.reduce((acc, v) => acc + v, 0);
    return spec.aggregator === 'sum' ? total : total / nums.length;
  };

  // ── 4a. Cross-tabulation path (Phase 26) ──────────────────────────────
  const colFields = definition.columns?.filter(f => f !== '') ?? [];
  if (colFields.length > 0) {
    // Resolve column-axis field indices.
    const colFieldIndices: number[] = colFields.map(field => {
      const idx = headers.indexOf(field);
      if (idx === -1) throw new PivotFieldError(field, headers);
      return idx;
    });

    // Build 2-D accumulator: rowKey → colKey → dataRows[]
    // Both key orders are insertion-order stable.
    const accu       = new Map<string, Map<string, ExtendedCellValue[][]>>();
    const rowKeySeq: string[] = [];
    const colKeySeq: string[] = [];
    const seenColKeys = new Set<string>();

    for (const dataRow of dataRows) {
      const rowKey = rowFieldIndices.map(i => cellKey(dataRow[i])).join(GROUP_SEP);
      const colKey = colFieldIndices.map(i => cellKey(dataRow[i])).join(GROUP_SEP);

      if (!accu.has(rowKey)) {
        accu.set(rowKey, new Map());
        rowKeySeq.push(rowKey);
      }
      const rowMap = accu.get(rowKey)!;
      if (!rowMap.has(colKey)) rowMap.set(colKey, []);
      rowMap.get(colKey)!.push(dataRow);

      if (!seenColKeys.has(colKey)) {
        seenColKeys.add(colKey);
        colKeySeq.push(colKey);
      }
    }

    // Build output headers:
    //   [row-field-names…, for each col-key: for each value-spec: "agg(field)(colDisplay)"]
    const outputHeaders = [
      ...definition.rows,
      ...colKeySeq.flatMap(ck => {
        const colDisplay = ck.split(GROUP_SEP).join(DISPLAY_SEP);
        return resolvedValues.map(vs => `${vs.outputLabel}(${colDisplay})`);
      }),
    ];

    // Build output rows (sparse: missing cells → null per value spec).
    const outputRows: PivotGridRow[] = rowKeySeq.map(rowKey => {
      const rowMap = accu.get(rowKey)!;
      const keys   = rowKey.split(GROUP_SEP);

      const values: (number | null)[] = colKeySeq.flatMap(colKey => {
        const cellRows = rowMap.get(colKey) ?? [];
        if (cellRows.length === 0) {
          // No data for this (row × col) combination — return null per spec.
          return resolvedValues.map(() => null);
        }
        return resolvedValues.map(spec => evaluate(spec, cellRows));
      });

      return { keys, values };
    });

    // colKeys metadata: split NUL composite keys back to string arrays.
    const colKeys = colKeySeq.map(ck => ck.split(GROUP_SEP));

    return {
      headers: outputHeaders,
      rows:    outputRows,
      rowSpan: 1 + outputRows.length,
      colSpan: definition.rows.length + colKeySeq.length * resolvedValues.length,
      colKeys,
    };
  }

  // ── 4b. Flat pivot path (Phase 25 — unchanged) ────────────────────────
  const groupMap     = new Map<string, ExtendedCellValue[][]>();
  const groupKeyOrder: string[] = [];

  for (const dataRow of dataRows) {
    const compositeKey = rowFieldIndices.map(i => cellKey(dataRow[i])).join(GROUP_SEP);
    if (!groupMap.has(compositeKey)) {
      groupMap.set(compositeKey, []);
      groupKeyOrder.push(compositeKey);
    }
    groupMap.get(compositeKey)!.push(dataRow);
  }

  const outputRows: PivotGridRow[] = groupKeyOrder.map(compositeKey => {
    const groupRows = groupMap.get(compositeKey)!;
    const keys      = compositeKey.split(GROUP_SEP);
    const values    = resolvedValues.map(spec => evaluate(spec, groupRows));
    return { keys, values };
  });

  const outputHeaders = [
    ...definition.rows,
    ...resolvedValues.map(s => s.outputLabel),
  ];

  return {
    headers: outputHeaders,
    rows:    outputRows,
    rowSpan: 1 + outputRows.length,
    colSpan: definition.rows.length + definition.values.length,
    // colKeys intentionally absent for flat pivot
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
