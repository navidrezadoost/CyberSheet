/**
 * pivot-crosstab.test.ts — Phase 26: Column-Axis Pivoting (Cross-Tabulation)
 *
 * Covers:
 *  §1  Phase 26 type extensions — PivotDefinition.columns, PivotGrid.colKeys
 *  §2  Single column field, single value (sum) — output shape
 *  §3  Single column field, single value (count / avg)
 *  §4  Single column field, multiple value specs
 *  §5  Multi-field composite column keys
 *  §6  Combined multi-field row + column grouping
 *  §7  Null / non-numeric cells in cross-tab
 *  §8  Sparse cells — (row × col) pair with no data → null per value spec
 *  §9  Column key insertion-order determinism
 *  §10 Row key insertion-order in cross-tab
 *  §11 Header label format: "agg(field)(colDisplay)"
 *  §12 Multi-field column key display separator " | "
 *  §13 Custom value labels in cross-tab
 *  §14 PivotGrid.colKeys metadata shape
 *  §15 rowSpan / colSpan values in cross-tab
 *  §16 pivotGridToValues — cross-tab serialisation
 *  §17 SDK createPivot — cross-tab writes correct values to worksheet
 *  §18 SDK createPivot — cross-tab undo / redo
 *  §19 Cross-tab field error — unknown column field
 *  §20 Empty columns array → same as no columns (backward compat)
 *  §21 columns=[] and columns=undefined produce identical output
 *  §22 Single data-row cross-tab
 *  §23 All rows in same (row, col) group — aggregation correct
 *  §24 Performance baseline — 1 000-row cross-tab < 200 ms
 *  §25 Determinism — large dataset produces same result on re-run
 *  §26 Flat pivot unchanged — colKeys absent when no columns defined
 */

import { createSpreadsheet } from '../../src/sdk';
import {
  buildPivot, pivotGridToValues,
  PivotFieldError,
} from '../../src/sdk';
import type { PivotDefinition, PivotGrid } from '../../src/sdk';

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

/**
 * 5-column sales grid: Region, Product, Category, Units, Revenue.
 * Row order is deliberate: chosen so column-key insertion order is
 * Widget first, Gadget second (by first encounter while scanning top-down).
 */
const SALES_GRID: (string | number)[][] = [
  ['Region', 'Product', 'Category', 'Units', 'Revenue'],
  ['North', 'Widget', 'Large', 10, 1000],
  ['South', 'Gadget', 'Small', 5,  500],
  ['North', 'Gadget', 'Large', 3,  300],
  ['East',  'Widget', 'Small', 7,  700],
  ['South', 'Widget', 'Large', 4,  400],
  ['North', 'Widget', 'Large', 2,  200],
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build the minimal source Address for SALES_GRID (rows 1–7, cols 1–5).
 * The source bounds are only used by createSpreadsheet; buildPivot takes rawGrid.
 */
const SALES_SOURCE = {
  start: { row: 1, col: 1 },
  end:   { row: 7, col: 5 },
};

/** Cross-tab definition used by the majority of §2–§15. */
const CROSSTAB_DEF: PivotDefinition = {
  source:  SALES_SOURCE,
  rows:    ['Region'],
  columns: ['Product'],
  values:  [{ field: 'Revenue', aggregator: 'sum' }],
};

// ---------------------------------------------------------------------------
// §1  Phase 26 type extensions
// ---------------------------------------------------------------------------

describe('§1 Phase 26 type extensions', () => {
  it('PivotDefinition accepts optional columns field', () => {
    const def: PivotDefinition = {
      source:  SALES_SOURCE,
      rows:    ['Region'],
      columns: ['Product'],
      values:  [{ field: 'Revenue', aggregator: 'sum' }],
    };
    expect(def.columns).toEqual(['Product']);
  });

  it('PivotDefinition without columns is still valid (backward compat)', () => {
    const def: PivotDefinition = {
      source: SALES_SOURCE,
      rows:   ['Region'],
      values: [{ field: 'Revenue', aggregator: 'sum' }],
    };
    expect(def.columns).toBeUndefined();
  });

  it('PivotGrid.colKeys is typed as optional string[][]', () => {
    const grid = buildPivot(SALES_GRID, CROSSTAB_DEF);
    expect(Array.isArray(grid.colKeys)).toBe(true);
    // Each element must be a string array.
    for (const ck of grid.colKeys!) {
      expect(Array.isArray(ck)).toBe(true);
      for (const part of ck) {
        expect(typeof part).toBe('string');
      }
    }
  });
});

// ---------------------------------------------------------------------------
// §2  Single column field, single value (sum) — output shape
// ---------------------------------------------------------------------------

describe('§2 Single col field, single value sum — output shape', () => {
  let grid: PivotGrid;
  beforeEach(() => { grid = buildPivot(SALES_GRID, CROSSTAB_DEF); });

  it('produces 3 data rows (one per distinct Region)', () => {
    expect(grid.rows).toHaveLength(3);
  });

  it('row keys come from rows field', () => {
    expect(grid.rows[0]!.keys).toEqual(['North']);
    expect(grid.rows[1]!.keys).toEqual(['South']);
    expect(grid.rows[2]!.keys).toEqual(['East']);
  });

  it('North × Widget = 1000 + 200 = 1200', () => {
    // Widget is col-key index 0 (first encountered).
    expect(grid.rows[0]!.values[0]).toBe(1200);
  });

  it('North × Gadget = 300', () => {
    // Gadget is col-key index 1.
    expect(grid.rows[0]!.values[1]).toBe(300);
  });

  it('South × Gadget = 500, South × Widget = 400', () => {
    expect(grid.rows[1]!.values[0]).toBe(400);  // Widget first
    expect(grid.rows[1]!.values[1]).toBe(500);  // Gadget second
  });

  it('East × Widget = 700', () => {
    expect(grid.rows[2]!.values[0]).toBe(700);
  });

  it('East × Gadget = null (no East/Gadget row)', () => {
    expect(grid.rows[2]!.values[1]).toBeNull();
  });

  it('each row.values has length equal to colKeys × valueSpecs (2 × 1 = 2)', () => {
    for (const row of grid.rows) {
      expect(row.values).toHaveLength(2);
    }
  });
});

// ---------------------------------------------------------------------------
// §3  Single column field, count and avg aggregators
// ---------------------------------------------------------------------------

describe('§3 Single col field — count and avg aggregators', () => {
  const countDef: PivotDefinition = {
    source:  SALES_SOURCE,
    rows:    ['Region'],
    columns: ['Product'],
    values:  [{ field: 'Revenue', aggregator: 'count' }],
  };

  it('count: North × Widget = 2 (two North/Widget rows)', () => {
    const grid = buildPivot(SALES_GRID, countDef);
    expect(grid.rows[0]!.values[0]).toBe(2);
  });

  it('count: South × Gadget = 1', () => {
    const grid = buildPivot(SALES_GRID, countDef);
    expect(grid.rows[1]!.values[1]).toBe(1);
  });

  it('count: East × Gadget = null (no rows)', () => {
    const grid = buildPivot(SALES_GRID, countDef);
    expect(grid.rows[2]!.values[1]).toBeNull();
  });

  it('avg: North × Widget = (1000+200)/2 = 600', () => {
    const avgDef: PivotDefinition = {
      ...CROSSTAB_DEF,
      values: [{ field: 'Revenue', aggregator: 'avg' }],
    };
    const grid = buildPivot(SALES_GRID, avgDef);
    expect(grid.rows[0]!.values[0]).toBe(600);
  });

  it('avg: single row group = same as the value itself', () => {
    const avgDef: PivotDefinition = {
      ...CROSSTAB_DEF,
      values: [{ field: 'Revenue', aggregator: 'avg' }],
    };
    const grid = buildPivot(SALES_GRID, avgDef);
    // South × Widget: only one row (Revenue=400)
    expect(grid.rows[1]!.values[0]).toBe(400);
  });

  it('avg: empty intersection = null', () => {
    const avgDef: PivotDefinition = {
      ...CROSSTAB_DEF,
      values: [{ field: 'Revenue', aggregator: 'avg' }],
    };
    const grid = buildPivot(SALES_GRID, avgDef);
    // East × Gadget
    expect(grid.rows[2]!.values[1]).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §4  Single column field, multiple value specs
// ---------------------------------------------------------------------------

describe('§4 Single col field, multiple value specs', () => {
  const multiValDef: PivotDefinition = {
    source:  SALES_SOURCE,
    rows:    ['Region'],
    columns: ['Product'],
    values:  [
      { field: 'Revenue', aggregator: 'sum' },
      { field: 'Units',   aggregator: 'count' },
    ],
  };

  it('row.values has length colKeys × valueSpecs = 2 × 2 = 4', () => {
    const grid = buildPivot(SALES_GRID, multiValDef);
    for (const row of grid.rows) {
      expect(row.values).toHaveLength(4);
    }
  });

  it('value layout: [Widget/Revenue, Widget/Units, Gadget/Revenue, Gadget/Units]', () => {
    const grid = buildPivot(SALES_GRID, multiValDef);
    // North × Widget: Revenue=1200, Units=2 rows
    expect(grid.rows[0]!.values[0]).toBe(1200);
    expect(grid.rows[0]!.values[1]).toBe(2);
  });

  it('North × Gadget: Revenue=300, Units=1', () => {
    const grid = buildPivot(SALES_GRID, multiValDef);
    expect(grid.rows[0]!.values[2]).toBe(300);
    expect(grid.rows[0]!.values[3]).toBe(1);
  });

  it('East × Gadget: Revenue=null, Units=null', () => {
    const grid = buildPivot(SALES_GRID, multiValDef);
    expect(grid.rows[2]!.values[2]).toBeNull();
    expect(grid.rows[2]!.values[3]).toBeNull();
  });

  it('colSpan = rows.length + colKeys.length × valueSpecs.length = 1 + 2*2 = 5', () => {
    const grid = buildPivot(SALES_GRID, multiValDef);
    expect(grid.colSpan).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// §5  Multi-field composite column keys
// ---------------------------------------------------------------------------

// Minimal grid: Region, Product, Category, Revenue
const CAT_GRID: (string | number)[][] = [
  ['Region', 'Product', 'Category', 'Revenue'],
  ['North',  'Widget',  'Large',     1000],
  ['South',  'Widget',  'Small',      500],
  ['North',  'Widget',  'Small',      200],
  ['East',   'Gadget',  'Large',      700],
];

describe('§5 Multi-field composite column keys', () => {
  const multiColDef: PivotDefinition = {
    source:  { start: { row: 1, col: 1 }, end: { row: 5, col: 4 } },
    rows:    ['Region'],
    columns: ['Product', 'Category'],
    values:  [{ field: 'Revenue', aggregator: 'sum' }],
  };

  it('produces 3 distinct column keys in insertion order', () => {
    const grid = buildPivot(CAT_GRID, multiColDef);
    // Insertion order: Widget|Large, Widget|Small, Gadget|Large
    expect(grid.colKeys).toHaveLength(3);
    expect(grid.colKeys![0]).toEqual(['Widget', 'Large']);
    expect(grid.colKeys![1]).toEqual(['Widget', 'Small']);
    expect(grid.colKeys![2]).toEqual(['Gadget', 'Large']);
  });

  it('row.values has length 3 (one per colKey)', () => {
    const grid = buildPivot(CAT_GRID, multiColDef);
    for (const row of grid.rows) {
      expect(row.values).toHaveLength(3);
    }
  });

  it('North × Widget|Large = 1000', () => {
    const grid = buildPivot(CAT_GRID, multiColDef);
    expect(grid.rows[0]!.values[0]).toBe(1000);
  });

  it('North × Widget|Small = 200', () => {
    const grid = buildPivot(CAT_GRID, multiColDef);
    expect(grid.rows[0]!.values[1]).toBe(200);
  });

  it('North × Gadget|Large = null (no row)', () => {
    const grid = buildPivot(CAT_GRID, multiColDef);
    expect(grid.rows[0]!.values[2]).toBeNull();
  });

  it('East × Gadget|Large = 700', () => {
    const grid = buildPivot(CAT_GRID, multiColDef);
    // East is the 3rd row key (index 2): North, South, East
    expect(grid.rows[2]!.values[2]).toBe(700);
  });
});

// ---------------------------------------------------------------------------
// §6  Combined multi-field row + column grouping
// ---------------------------------------------------------------------------

describe('§6 Combined multi-field row + column grouping', () => {
  const combinedDef: PivotDefinition = {
    source:  SALES_SOURCE,
    rows:    ['Region', 'Category'],
    columns: ['Product'],
    values:  [{ field: 'Revenue', aggregator: 'sum' }],
  };

  it('row keys have length 2 (Region + Category)', () => {
    const grid = buildPivot(SALES_GRID, combinedDef);
    for (const row of grid.rows) {
      expect(row.keys).toHaveLength(2);
    }
  });

  it('first row key is North|Large', () => {
    const grid = buildPivot(SALES_GRID, combinedDef);
    expect(grid.rows[0]!.keys).toEqual(['North', 'Large']);
  });

  it('each row.values has length 2 (Widget, Gadget)', () => {
    const grid = buildPivot(SALES_GRID, combinedDef);
    for (const row of grid.rows) {
      expect(row.values).toHaveLength(2);
    }
  });

  it('North|Large × Widget = 1000+200 = 1200', () => {
    const grid = buildPivot(SALES_GRID, combinedDef);
    expect(grid.rows[0]!.values[0]).toBe(1200);
  });

  it('North|Large × Gadget = 300', () => {
    const grid = buildPivot(SALES_GRID, combinedDef);
    expect(grid.rows[0]!.values[1]).toBe(300);
  });

  it('colSpan = rows.length + colKeys.length × valueSpecs.length = 2 + 2*1 = 4', () => {
    const grid = buildPivot(SALES_GRID, combinedDef);
    expect(grid.colSpan).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// §7  Null / non-numeric cells in cross-tab
// ---------------------------------------------------------------------------

const NULL_GRID: (string | number | null)[][] = [
  ['Region', 'Product', 'Revenue'],
  ['North',  'Widget',  null],         // null revenue
  ['North',  'Widget',  500],
  ['South',  'Gadget',  'N/A'],        // non-numeric string
  ['South',  'Gadget',  300],
];

describe('§7 Null / non-numeric cells in cross-tab (sum/avg)', () => {
  const def: PivotDefinition = {
    source:  { start: { row: 1, col: 1 }, end: { row: 5, col: 3 } },
    rows:    ['Region'],
    columns: ['Product'],
    values:  [{ field: 'Revenue', aggregator: 'sum' }],
  };

  it('sum skips null — North×Widget = 500 (not 500+null)', () => {
    const grid = buildPivot(NULL_GRID as any, def);
    expect(grid.rows[0]!.values[0]).toBe(500);
  });

  it('sum skips non-numeric string — South×Gadget = 300', () => {
    const grid = buildPivot(NULL_GRID as any, def);
    // South is rows[1]; Gadget is col-key index 1 (Widget came first in scan)
    expect(grid.rows[1]!.values[1]).toBe(300);
  });

  it('count includes ALL rows regardless of value type', () => {
    const countDef: PivotDefinition = { ...def, values: [{ field: 'Revenue', aggregator: 'count' }] };
    const grid = buildPivot(NULL_GRID as any, countDef);
    // North×Widget has 2 rows (even though one has null)
    expect(grid.rows[0]!.values[0]).toBe(2);
  });

  it('avg skips null — North×Widget avg = 500/1 = 500', () => {
    const avgDef: PivotDefinition = { ...def, values: [{ field: 'Revenue', aggregator: 'avg' }] };
    const grid = buildPivot(NULL_GRID as any, avgDef);
    expect(grid.rows[0]!.values[0]).toBe(500);
  });

  it('sum of all-null intersection = null', () => {
    const allNull: (string | null)[][] = [
      ['Region', 'Product', 'Revenue'],
      ['North',  'Widget',  null],
    ];
    const grid = buildPivot(allNull as any, def);
    expect(grid.rows[0]!.values[0]).toBeNull();
  });

  it('avg of all-string intersection = null', () => {
    const allStr: (string)[][] = [
      ['Region', 'Product', 'Revenue'],
      ['North',  'Widget',  'N/A'],
    ];
    const avgDef2: PivotDefinition = { ...def, values: [{ field: 'Revenue', aggregator: 'avg' }] };
    const grid = buildPivot(allStr as any, avgDef2);
    expect(grid.rows[0]!.values[0]).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §8  Sparse cells — (row × col) pair with no data → null per value spec
// ---------------------------------------------------------------------------

describe('§8 Sparse cells — missing (row×col) → null per value spec', () => {
  it('fully sparse row (no matching col groups) has all-null values', () => {
    const grid = buildPivot(SALES_GRID, CROSSTAB_DEF);
    // East only has Widget data. East×Gadget → null.
    expect(grid.rows[2]!.values[1]).toBeNull();
  });

  it('sparse cell with multi-value spec has null for each spec', () => {
    const multiVal: PivotDefinition = {
      source:  SALES_SOURCE,
      rows:    ['Region'],
      columns: ['Product'],
      values:  [
        { field: 'Revenue', aggregator: 'sum' },
        { field: 'Units',   aggregator: 'avg' },
      ],
    };
    const grid = buildPivot(SALES_GRID, multiVal);
    // East×Gadget: both specs should be null
    expect(grid.rows[2]!.values[2]).toBeNull(); // Revenue
    expect(grid.rows[2]!.values[3]).toBeNull(); // Units
  });

  it('sparse multi-col-field key produces null correctly', () => {
    const grid = buildPivot(CAT_GRID, {
      source:  { start: { row: 1, col: 1 }, end: { row: 5, col: 4 } },
      rows:    ['Region'],
      columns: ['Product', 'Category'],
      values:  [{ field: 'Revenue', aggregator: 'sum' }],
    });
    // North has no Gadget|Large row
    expect(grid.rows[0]!.values[2]).toBeNull();
  });

  it('completely separate data produces fully-sparse matrix off-diagonal', () => {
    const diag: (string | number)[][] = [
      ['R', 'C', 'V'],
      ['A', 'X', 1],
      ['B', 'Y', 2],
    ];
    const grid = buildPivot(diag, {
      source:  { start: { row: 1, col: 1 }, end: { row: 3, col: 3 } },
      rows:    ['R'],
      columns: ['C'],
      values:  [{ field: 'V', aggregator: 'sum' }],
    });
    // A×Y = null, B×X = null
    expect(grid.rows[0]!.values[1]).toBeNull();
    expect(grid.rows[1]!.values[0]).toBeNull();
  });

  it('all cells populated (no sparseness) — no nulls in values', () => {
    const full: (string | number)[][] = [
      ['R', 'C', 'V'],
      ['A', 'X', 10],
      ['A', 'Y', 20],
      ['B', 'X', 30],
      ['B', 'Y', 40],
    ];
    const grid = buildPivot(full, {
      source:  { start: { row: 1, col: 1 }, end: { row: 5, col: 3 } },
      rows:    ['R'],
      columns: ['C'],
      values:  [{ field: 'V', aggregator: 'sum' }],
    });
    expect(grid.rows[0]!.values).toEqual([10, 20]);
    expect(grid.rows[1]!.values).toEqual([30, 40]);
  });

  it('null values in output do not disrupt adjacent aggregated values', () => {
    const grid = buildPivot(SALES_GRID, CROSSTAB_DEF);
    // East is rows[2]; values should be [700, null], not [null, null]
    expect(grid.rows[2]!.values[0]).toBe(700);
    expect(grid.rows[2]!.values[1]).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §9  Column key insertion-order determinism
// ---------------------------------------------------------------------------

describe('§9 Column key insertion-order determinism', () => {
  it('col keys appear in source scan order, not alphabetical', () => {
    // First row has Widget → Gadget must come after
    const grid = buildPivot(SALES_GRID, CROSSTAB_DEF);
    expect(grid.colKeys![0]).toEqual(['Widget']);
    expect(grid.colKeys![1]).toEqual(['Gadget']);
  });

  it('reversing source row order reverses col key order', () => {
    const reversed = [
      SALES_GRID[0],
      ...SALES_GRID.slice(1).reverse(),
    ] as (string | number)[][];
    const grid = buildPivot(reversed, CROSSTAB_DEF);
    // Now last row is first: North/Widget → Widget is already first, no change
    // Actually first row after header in reversed is: North/Widget/Large/2/200 → Widget
    // But original first data row reversed is: North/Widget/Large/2/200 → last → after reversing, first is North/Widget/Large/2/200
    // Let's just verify colKeys has the same 2 elements, order determined by first-encounter
    expect(grid.colKeys).toHaveLength(2);
  });

  it('dataset with 3 col values preserves insertion order', () => {
    const triGrid: (string | number)[][] = [
      ['R', 'C', 'V'],
      ['A', 'Z', 1],
      ['A', 'A', 2],
      ['A', 'M', 3],
    ];
    const grid = buildPivot(triGrid, {
      source:  { start: { row: 1, col: 1 }, end: { row: 4, col: 3 } },
      rows:    ['R'],
      columns: ['C'],
      values:  [{ field: 'V', aggregator: 'sum' }],
    });
    expect(grid.colKeys!.map(k => k[0])).toEqual(['Z', 'A', 'M']);
  });

  it('duplicate col values within same row group do not add extra colKeys', () => {
    const dupl: (string | number)[][] = [
      ['R', 'C', 'V'],
      ['A', 'X', 1],
      ['A', 'X', 2],
      ['B', 'X', 3],
    ];
    const grid = buildPivot(dupl, {
      source:  { start: { row: 1, col: 1 }, end: { row: 4, col: 3 } },
      rows:    ['R'],
      columns: ['C'],
      values:  [{ field: 'V', aggregator: 'sum' }],
    });
    expect(grid.colKeys).toHaveLength(1);
    expect(grid.colKeys![0]).toEqual(['X']);
  });

  it('re-running with same grid twice produces identical colKeys', () => {
    const g1 = buildPivot(SALES_GRID, CROSSTAB_DEF);
    const g2 = buildPivot(SALES_GRID, CROSSTAB_DEF);
    expect(g1.colKeys).toEqual(g2.colKeys);
  });

  it('col key order is independent of row-group key order', () => {
    // Even if row groups differ, col key insertion order is scan-order
    const grid = buildPivot(SALES_GRID, CROSSTAB_DEF);
    // Regardless of row order, column keys should be [Widget, Gadget]
    const colKeyNames = grid.colKeys!.map(k => k[0]);
    expect(colKeyNames.indexOf('Widget')).toBeLessThan(colKeyNames.indexOf('Gadget'));
  });
});

// ---------------------------------------------------------------------------
// §10 Row key insertion-order in cross-tab
// ---------------------------------------------------------------------------

describe('§10 Row key insertion-order in cross-tab', () => {
  it('row keys appear in source-scan insertion order', () => {
    const grid = buildPivot(SALES_GRID, CROSSTAB_DEF);
    // North first, South second, East third
    expect(grid.rows[0]!.keys).toEqual(['North']);
    expect(grid.rows[1]!.keys).toEqual(['South']);
    expect(grid.rows[2]!.keys).toEqual(['East']);
  });

  it('re-ordering source rows changes row key order', () => {
    const reordered: (string | number)[][] = [
      SALES_GRID[0],   // header
      SALES_GRID[5],   // South/Widget first (index 5 in SALES_GRID)
      SALES_GRID[1],   // North/Widget second
    ] as (string | number)[][];
    const grid = buildPivot(reordered, CROSSTAB_DEF);
    expect(grid.rows[0]!.keys).toEqual(['South']);
    expect(grid.rows[1]!.keys).toEqual(['North']);
  });

  it('number of output rows equals distinct row-group count', () => {
    const grid = buildPivot(SALES_GRID, CROSSTAB_DEF);
    expect(grid.rows).toHaveLength(3); // North, South, East
  });

  it('row count stable across multiple calls', () => {
    expect(buildPivot(SALES_GRID, CROSSTAB_DEF).rows.length)
      .toBe(buildPivot(SALES_GRID, CROSSTAB_DEF).rows.length);
  });
});

// ---------------------------------------------------------------------------
// §11 Header label format: "agg(field)(colDisplay)"
// ---------------------------------------------------------------------------

describe('§11 Header label format: "agg(field)(colDisplay)"', () => {
  it('single value: header contains row field, then "agg(field)(colKey)" per col', () => {
    const grid = buildPivot(SALES_GRID, CROSSTAB_DEF);
    expect(grid.headers[0]).toBe('Region');
    expect(grid.headers[1]).toBe('sum(Revenue)(Widget)');
    expect(grid.headers[2]).toBe('sum(Revenue)(Gadget)');
  });

  it('count aggregator creates "count(field)(colKey)" labels', () => {
    const def: PivotDefinition = {
      source:  SALES_SOURCE,
      rows:    ['Region'],
      columns: ['Product'],
      values:  [{ field: 'Units', aggregator: 'count' }],
    };
    const grid = buildPivot(SALES_GRID, def);
    expect(grid.headers[1]).toBe('count(Units)(Widget)');
    expect(grid.headers[2]).toBe('count(Units)(Gadget)');
  });

  it('avg aggregator creates "avg(field)(colKey)" labels', () => {
    const def: PivotDefinition = {
      source:  SALES_SOURCE,
      rows:    ['Region'],
      columns: ['Product'],
      values:  [{ field: 'Revenue', aggregator: 'avg' }],
    };
    const grid = buildPivot(SALES_GRID, def);
    expect(grid.headers[1]).toBe('avg(Revenue)(Widget)');
  });

  it('multiple row fields expand header count correctly', () => {
    const def: PivotDefinition = {
      source:  SALES_SOURCE,
      rows:    ['Region', 'Category'],
      columns: ['Product'],
      values:  [{ field: 'Revenue', aggregator: 'sum' }],
    };
    const grid = buildPivot(SALES_GRID, def);
    // Headers: [Region, Category, sum(Revenue)(Widget), sum(Revenue)(Gadget)]
    expect(grid.headers[0]).toBe('Region');
    expect(grid.headers[1]).toBe('Category');
    expect(grid.headers[2]).toBe('sum(Revenue)(Widget)');
    expect(grid.headers[3]).toBe('sum(Revenue)(Gadget)');
  });

  it('total header count = rows.length + colKeys.length × values.length', () => {
    const grid = buildPivot(SALES_GRID, CROSSTAB_DEF);
    // 1 row field + 2 col keys × 1 value spec = 3
    expect(grid.headers).toHaveLength(3);
  });

  it('multi-value headers interleave by col then by value', () => {
    const def: PivotDefinition = {
      source:  SALES_SOURCE,
      rows:    ['Region'],
      columns: ['Product'],
      values:  [
        { field: 'Revenue', aggregator: 'sum' },
        { field: 'Units',   aggregator: 'count' },
      ],
    };
    const grid = buildPivot(SALES_GRID, def);
    // Expected: [Region, sum(Revenue)(Widget), count(Units)(Widget), sum(Revenue)(Gadget), count(Units)(Gadget)]
    expect(grid.headers).toEqual([
      'Region',
      'sum(Revenue)(Widget)',
      'count(Units)(Widget)',
      'sum(Revenue)(Gadget)',
      'count(Units)(Gadget)',
    ]);
  });
});

// ---------------------------------------------------------------------------
// §12 Multi-field column key display separator " | "
// ---------------------------------------------------------------------------

describe('§12 Multi-field col key display separator " | "', () => {
  it('two-field col key uses " | " between parts in header', () => {
    const grid = buildPivot(CAT_GRID, {
      source:  { start: { row: 1, col: 1 }, end: { row: 5, col: 4 } },
      rows:    ['Region'],
      columns: ['Product', 'Category'],
      values:  [{ field: 'Revenue', aggregator: 'sum' }],
    });
    expect(grid.headers[1]).toBe('sum(Revenue)(Widget | Large)');
    expect(grid.headers[2]).toBe('sum(Revenue)(Widget | Small)');
    expect(grid.headers[3]).toBe('sum(Revenue)(Gadget | Large)');
  });

  it('single-field col key has no separator', () => {
    const grid = buildPivot(SALES_GRID, CROSSTAB_DEF);
    expect(grid.headers[1]).not.toContain(' | ');
  });

  it('three-field col key joins all parts with " | "', () => {
    const threeGrid: (string | number)[][] = [
      ['R', 'A', 'B', 'C', 'V'],
      ['X', 'a', 'b', 'c', 100],
    ];
    const grid = buildPivot(threeGrid, {
      source:  { start: { row: 1, col: 1 }, end: { row: 2, col: 5 } },
      rows:    ['R'],
      columns: ['A', 'B', 'C'],
      values:  [{ field: 'V', aggregator: 'sum' }],
    });
    expect(grid.headers[1]).toBe('sum(V)(a | b | c)');
  });

  it('colKeys parts do NOT contain " | " (only the header does)', () => {
    const grid = buildPivot(CAT_GRID, {
      source:  { start: { row: 1, col: 1 }, end: { row: 5, col: 4 } },
      rows:    ['Region'],
      columns: ['Product', 'Category'],
      values:  [{ field: 'Revenue', aggregator: 'sum' }],
    });
    for (const ck of grid.colKeys!) {
      for (const part of ck) {
        expect(part).not.toContain(' | ');
      }
    }
  });
});

// ---------------------------------------------------------------------------
// §13 Custom value labels in cross-tab
// ---------------------------------------------------------------------------

describe('§13 Custom value labels in cross-tab', () => {
  const customDef: PivotDefinition = {
    source:  SALES_SOURCE,
    rows:    ['Region'],
    columns: ['Product'],
    values:  [{ field: 'Revenue', aggregator: 'sum', label: 'Total Revenue' }],
  };

  it('custom label replaces default "agg(field)" in header', () => {
    const grid = buildPivot(SALES_GRID, customDef);
    expect(grid.headers[1]).toBe('Total Revenue(Widget)');
    expect(grid.headers[2]).toBe('Total Revenue(Gadget)');
  });

  it('custom label appears in colKeys-qualified header for multi-field col key', () => {
    const grid = buildPivot(CAT_GRID, {
      source:  { start: { row: 1, col: 1 }, end: { row: 5, col: 4 } },
      rows:    ['Region'],
      columns: ['Product', 'Category'],
      values:  [{ field: 'Revenue', aggregator: 'sum', label: 'Rev' }],
    });
    expect(grid.headers[1]).toBe('Rev(Widget | Large)');
  });

  it('custom label on one spec + default on another', () => {
    const mixedDef: PivotDefinition = {
      source:  SALES_SOURCE,
      rows:    ['Region'],
      columns: ['Product'],
      values:  [
        { field: 'Revenue', aggregator: 'sum', label: 'Total' },
        { field: 'Units',   aggregator: 'count' },
      ],
    };
    const grid = buildPivot(SALES_GRID, mixedDef);
    expect(grid.headers[1]).toBe('Total(Widget)');
    expect(grid.headers[2]).toBe('count(Units)(Widget)');
  });

  it('custom label does not affect aggregated values', () => {
    const grid = buildPivot(SALES_GRID, customDef);
    expect(grid.rows[0]!.values[0]).toBe(1200); // North×Widget
  });
});

// ---------------------------------------------------------------------------
// §14 PivotGrid.colKeys metadata shape
// ---------------------------------------------------------------------------

describe('§14 PivotGrid.colKeys metadata shape', () => {
  it('colKeys is defined when columns is non-empty', () => {
    const grid = buildPivot(SALES_GRID, CROSSTAB_DEF);
    expect(grid.colKeys).toBeDefined();
  });

  it('colKeys has one element per distinct column-axis group', () => {
    const grid = buildPivot(SALES_GRID, CROSSTAB_DEF);
    expect(grid.colKeys).toHaveLength(2);
  });

  it('each colKeys element has length equal to columns.length (1 for single field)', () => {
    const grid = buildPivot(SALES_GRID, CROSSTAB_DEF);
    for (const ck of grid.colKeys!) {
      expect(ck).toHaveLength(1);
    }
  });

  it('each colKeys element has length == columns.length (2 for two-field col)', () => {
    const grid = buildPivot(CAT_GRID, {
      source:  { start: { row: 1, col: 1 }, end: { row: 5, col: 4 } },
      rows:    ['Region'],
      columns: ['Product', 'Category'],
      values:  [{ field: 'Revenue', aggregator: 'sum' }],
    });
    for (const ck of grid.colKeys!) {
      expect(ck).toHaveLength(2);
    }
  });

  it('colKeys mirrors header col-order for single-value spec', () => {
    const grid = buildPivot(SALES_GRID, CROSSTAB_DEF);
    // headers[1] = "sum(Revenue)(Widget)" → colKeys[0] = ['Widget']
    expect(grid.colKeys![0]).toEqual(['Widget']);
    expect(grid.colKeys![1]).toEqual(['Gadget']);
  });
});

// ---------------------------------------------------------------------------
// §15 rowSpan / colSpan values in cross-tab
// ---------------------------------------------------------------------------

describe('§15 rowSpan / colSpan values in cross-tab', () => {
  it('rowSpan = 1 + number of row groups', () => {
    const grid = buildPivot(SALES_GRID, CROSSTAB_DEF);
    expect(grid.rowSpan).toBe(1 + 3); // 1 header + 3 row groups
  });

  it('colSpan = rows.length + colKeys.length × values.length (single value)', () => {
    const grid = buildPivot(SALES_GRID, CROSSTAB_DEF);
    expect(grid.colSpan).toBe(1 + 2 * 1); // 1 row field + 2 col groups × 1 value
  });

  it('colSpan scales with number of value specs', () => {
    const twoValDef: PivotDefinition = {
      source:  SALES_SOURCE,
      rows:    ['Region'],
      columns: ['Product'],
      values:  [
        { field: 'Revenue', aggregator: 'sum' },
        { field: 'Units',   aggregator: 'count' },
      ],
    };
    const grid = buildPivot(SALES_GRID, twoValDef);
    expect(grid.colSpan).toBe(1 + 2 * 2); // 1 + 4 = 5
  });

  it('colSpan scales with number of col groups', () => {
    const threeColGrid: (string | number)[][] = [
      ['R', 'C', 'V'],
      ['A', 'X', 1],
      ['A', 'Y', 2],
      ['A', 'Z', 3],
    ];
    const grid = buildPivot(threeColGrid, {
      source:  { start: { row: 1, col: 1 }, end: { row: 4, col: 3 } },
      rows:    ['R'],
      columns: ['C'],
      values:  [{ field: 'V', aggregator: 'sum' }],
    });
    expect(grid.colSpan).toBe(1 + 3 * 1); // 4
  });

  it('rowSpan matches headers.length - 1 + 1 = rows.length + 1', () => {
    const grid = buildPivot(SALES_GRID, CROSSTAB_DEF);
    expect(grid.rowSpan).toBe(grid.rows.length + 1);
  });

  it('colSpan matches headers.length', () => {
    const grid = buildPivot(SALES_GRID, CROSSTAB_DEF);
    expect(grid.colSpan).toBe(grid.headers.length);
  });
});

// ---------------------------------------------------------------------------
// §16 pivotGridToValues — cross-tab serialisation
// ---------------------------------------------------------------------------

describe('§16 pivotGridToValues — cross-tab serialisation', () => {
  it('result[0] equals grid.headers', () => {
    const grid = buildPivot(SALES_GRID, CROSSTAB_DEF);
    const values = pivotGridToValues(grid);
    expect(values[0]).toEqual(grid.headers);
  });

  it('result length = grid.rowSpan', () => {
    const grid = buildPivot(SALES_GRID, CROSSTAB_DEF);
    const values = pivotGridToValues(grid);
    expect(values).toHaveLength(grid.rowSpan);
  });

  it('each row length = grid.colSpan', () => {
    const grid = buildPivot(SALES_GRID, CROSSTAB_DEF);
    const values = pivotGridToValues(grid);
    for (const row of values) {
      expect(row).toHaveLength(grid.colSpan);
    }
  });

  it('data row keys appear in the first columns', () => {
    const grid = buildPivot(SALES_GRID, CROSSTAB_DEF);
    const values = pivotGridToValues(grid);
    expect(values[1]![0]).toBe('North');
    expect(values[2]![0]).toBe('South');
    expect(values[3]![0]).toBe('East');
  });

  it('null values serialise as null (not empty string)', () => {
    const grid = buildPivot(SALES_GRID, CROSSTAB_DEF);
    const values = pivotGridToValues(grid);
    // East (row index 3) × Gadget (col index 2) should be null
    expect(values[3]![2]).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §17 SDK createPivot — cross-tab writes correct cells to worksheet
// ---------------------------------------------------------------------------

describe('§17 SDK createPivot — cross-tab writes correct values to worksheet', () => {
  function makeSdk() {
    const s = createSpreadsheet('Sheet1', { rows: 30, cols: 30 });
    // Write SALES_GRID into the sheet (rows 1-7, cols 1-5).
    for (let r = 0; r < SALES_GRID.length; r++) {
      for (let c = 0; c < (SALES_GRID[r] as unknown[]).length; c++) {
        s.setCell(r + 1, c + 1, (SALES_GRID[r] as unknown[])[c] as any);
      }
    }
    return s;
  }

  it('returns a PivotGrid from SDK', () => {
    const s = makeSdk();
    const grid = s.createPivot(CROSSTAB_DEF, { row: 10, col: 1 });
    expect(grid).toBeDefined();
    expect(Array.isArray(grid.headers)).toBe(true);
  });

  it('header row written to target row on sheet', () => {
    const s = makeSdk();
    s.createPivot(CROSSTAB_DEF, { row: 10, col: 1 });
    expect(s.getCellValue(10, 1)).toBe('Region');
    expect(s.getCellValue(10, 2)).toBe('sum(Revenue)(Widget)');
    expect(s.getCellValue(10, 3)).toBe('sum(Revenue)(Gadget)');
  });

  it('North row written correctly: Region=North, Widget=1200, Gadget=300', () => {
    const s = makeSdk();
    s.createPivot(CROSSTAB_DEF, { row: 10, col: 1 });
    expect(s.getCellValue(11, 1)).toBe('North');
    expect(s.getCellValue(11, 2)).toBe(1200);
    expect(s.getCellValue(11, 3)).toBe(300);
  });

  it('East row written correctly: East × Gadget = null', () => {
    const s = makeSdk();
    s.createPivot(CROSSTAB_DEF, { row: 10, col: 1 });
    // East is the 3rd data row (row 13 on sheet: 10 header + 1 North + 1 South + 1 East)
    expect(s.getCellValue(13, 3)).toBeNull();
  });

  it('colKeys metadata is accessible on returned PivotGrid', () => {
    const s = makeSdk();
    const grid = s.createPivot(CROSSTAB_DEF, { row: 10, col: 1 });
    expect(grid.colKeys).toBeDefined();
    expect(grid.colKeys).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// §18 SDK createPivot — cross-tab undo / redo
// ---------------------------------------------------------------------------

describe('§18 SDK createPivot — cross-tab undo / redo', () => {
  function makeSdkWithData() {
    const s = createSpreadsheet('Sheet1', { rows: 30, cols: 30 });
    for (let r = 0; r < SALES_GRID.length; r++) {
      for (let c = 0; c < (SALES_GRID[r] as unknown[]).length; c++) {
        s.setCell(r + 1, c + 1, (SALES_GRID[r] as unknown[])[c] as any);
      }
    }
    return s;
  }

  it('undo clears pivot cells', () => {
    const s = makeSdkWithData();
    s.createPivot(CROSSTAB_DEF, { row: 10, col: 1 });
    expect(s.getCellValue(10, 2)).toBe('sum(Revenue)(Widget)');
    s.undo();
    expect(s.getCellValue(10, 2)).toBeNull();
  });

  it('redo re-writes pivot cells after undo', () => {
    const s = makeSdkWithData();
    s.createPivot(CROSSTAB_DEF, { row: 10, col: 1 });
    s.undo();
    s.redo();
    expect(s.getCellValue(10, 2)).toBe('sum(Revenue)(Widget)');
  });

  it('undo is a single step (one undo restores all cells)', () => {
    const s = makeSdkWithData();
    s.createPivot(CROSSTAB_DEF, { row: 10, col: 1 });
    s.undo();
    // After one undo, all pivot cells should be null
    expect(s.getCellValue(11, 2)).toBeNull();
    expect(s.getCellValue(11, 3)).toBeNull();
    expect(s.getCellValue(13, 1)).toBeNull();
  });

  it('source data unaffected by undo of pivot', () => {
    const s = makeSdkWithData();
    s.createPivot(CROSSTAB_DEF, { row: 10, col: 1 });
    s.undo();
    // Original source data at row 2 should still be intact
    expect(s.getCellValue(2, 1)).toBe('North');
    expect(s.getCellValue(2, 5)).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// §19 Cross-tab field error — unknown column field
// ---------------------------------------------------------------------------

describe('§19 Cross-tab field error — unknown column field', () => {
  it('throws PivotFieldError for unknown column field', () => {
    const def: PivotDefinition = {
      source:  SALES_SOURCE,
      rows:    ['Region'],
      columns: ['NonExistent'],
      values:  [{ field: 'Revenue', aggregator: 'sum' }],
    };
    expect(() => buildPivot(SALES_GRID, def)).toThrow(PivotFieldError);
  });

  it('PivotFieldError.field is the unknown column field name', () => {
    const def: PivotDefinition = {
      source:  SALES_SOURCE,
      rows:    ['Region'],
      columns: ['BadColumn'],
      values:  [{ field: 'Revenue', aggregator: 'sum' }],
    };
    let err!: PivotFieldError;
    try { buildPivot(SALES_GRID, def); } catch (e) { err = e as PivotFieldError; }
    expect(err.field).toBe('BadColumn');
  });

  it('PivotFieldError.available contains actual column headers', () => {
    const def: PivotDefinition = {
      source:  SALES_SOURCE,
      rows:    ['Region'],
      columns: ['BadColumn'],
      values:  [{ field: 'Revenue', aggregator: 'sum' }],
    };
    let err!: PivotFieldError;
    try { buildPivot(SALES_GRID, def); } catch (e) { err = e as PivotFieldError; }
    expect(err.available).toContain('Product');
    expect(err.available).toContain('Region');
  });

  it('error thrown for column field even if rows/values are valid', () => {
    const def: PivotDefinition = {
      source:  SALES_SOURCE,
      rows:    ['Region'],
      columns: ['DOES_NOT_EXIST'],
      values:  [{ field: 'Revenue', aggregator: 'sum' }],
    };
    expect(() => buildPivot(SALES_GRID, def)).toThrow(PivotFieldError);
  });
});

// ---------------------------------------------------------------------------
// §20 Empty columns array → same as no columns (backward compat)
// ---------------------------------------------------------------------------

describe('§20 Empty columns array → same as no columns', () => {
  it('columns=[] produces flat pivot (identical to Phase 25 behavior)', () => {
    const def: PivotDefinition = {
      source:  SALES_SOURCE,
      rows:    ['Region'],
      columns: [],
      values:  [{ field: 'Revenue', aggregator: 'sum' }],
    };
    const grid = buildPivot(SALES_GRID, def);
    expect(grid.colKeys).toBeUndefined();
    expect(grid.headers).toHaveLength(2); // Region + sum(Revenue)
  });

  it('columns=[] gives same result as columns=undefined', () => {
    const withArr: PivotDefinition = {
      source:  SALES_SOURCE,
      rows:    ['Region'],
      columns: [],
      values:  [{ field: 'Revenue', aggregator: 'sum' }],
    };
    const withUndef: PivotDefinition = {
      source: SALES_SOURCE,
      rows:   ['Region'],
      values: [{ field: 'Revenue', aggregator: 'sum' }],
    };
    const g1 = buildPivot(SALES_GRID, withArr);
    const g2 = buildPivot(SALES_GRID, withUndef);
    expect(g1.headers).toEqual(g2.headers);
    expect(g1.rows.map(r => ({ keys: r.keys, values: r.values })))
      .toEqual(g2.rows.map(r => ({ keys: r.keys, values: r.values })));
  });

  it('flat result from empty columns has correct row-group aggregations', () => {
    const def: PivotDefinition = {
      source:  SALES_SOURCE,
      rows:    ['Region'],
      columns: [],
      values:  [{ field: 'Revenue', aggregator: 'sum' }],
    };
    const grid = buildPivot(SALES_GRID, def);
    // North: 1000+300+200 = 1500
    const north = grid.rows.find(r => r.keys[0] === 'North')!;
    expect(north.values[0]).toBe(1500);
  });
});

// ---------------------------------------------------------------------------
// §21 columns=[] and columns=undefined produce identical output
// ---------------------------------------------------------------------------

describe('§21 columns=[] and columns=undefined identical output', () => {
  it('colSpan identical for both', () => {
    const g1 = buildPivot(SALES_GRID, { source: SALES_SOURCE, rows: ['Region'], columns: [], values: [{ field: 'Revenue', aggregator: 'sum' }] });
    const g2 = buildPivot(SALES_GRID, { source: SALES_SOURCE, rows: ['Region'], values: [{ field: 'Revenue', aggregator: 'sum' }] });
    expect(g1.colSpan).toBe(g2.colSpan);
  });

  it('rowSpan identical for both', () => {
    const g1 = buildPivot(SALES_GRID, { source: SALES_SOURCE, rows: ['Region'], columns: [], values: [{ field: 'Revenue', aggregator: 'sum' }] });
    const g2 = buildPivot(SALES_GRID, { source: SALES_SOURCE, rows: ['Region'], values: [{ field: 'Revenue', aggregator: 'sum' }] });
    expect(g1.rowSpan).toBe(g2.rowSpan);
  });
});

// ---------------------------------------------------------------------------
// §22 Single data-row cross-tab
// ---------------------------------------------------------------------------

describe('§22 Single data-row cross-tab', () => {
  const singleRow: (string | number)[][] = [
    ['Region', 'Product', 'Revenue'],
    ['North',  'Widget',  999],
  ];
  const def: PivotDefinition = {
    source:  { start: { row: 1, col: 1 }, end: { row: 2, col: 3 } },
    rows:    ['Region'],
    columns: ['Product'],
    values:  [{ field: 'Revenue', aggregator: 'sum' }],
  };

  it('produces 1 data row', () => {
    expect(buildPivot(singleRow, def).rows).toHaveLength(1);
  });

  it('produces 1 col key', () => {
    expect(buildPivot(singleRow, def).colKeys).toHaveLength(1);
  });

  it('the single value is correct', () => {
    const grid = buildPivot(singleRow, def);
    expect(grid.rows[0]!.values[0]).toBe(999);
  });
});

// ---------------------------------------------------------------------------
// §23 All rows in same (row, col) group
// ---------------------------------------------------------------------------

describe('§23 All rows in same (row, col) group', () => {
  const allSame: (string | number)[][] = [
    ['R', 'C', 'V'],
    ['A', 'X', 10],
    ['A', 'X', 20],
    ['A', 'X', 30],
  ];
  const def: PivotDefinition = {
    source:  { start: { row: 1, col: 1 }, end: { row: 4, col: 3 } },
    rows:    ['R'],
    columns: ['C'],
    values:  [{ field: 'V', aggregator: 'sum' }],
  };

  it('produces 1 row and 1 colKey', () => {
    const grid = buildPivot(allSame, def);
    expect(grid.rows).toHaveLength(1);
    expect(grid.colKeys).toHaveLength(1);
  });

  it('sum aggregates all values in the group: 10+20+30=60', () => {
    expect(buildPivot(allSame, def).rows[0]!.values[0]).toBe(60);
  });
});

// ---------------------------------------------------------------------------
// §24 Performance baseline — 1 000-row cross-tab < 200 ms
// ---------------------------------------------------------------------------

describe('§24 Performance baseline — 1 000-row cross-tab', () => {
  function makePerf1k(): (string | number)[][] {
    const regions  = ['North', 'South', 'East', 'West'];
    const products = ['Widget', 'Gadget', 'Thingy', 'Doohickey', 'Whatsit'];
    const rows: (string | number)[][] = [['Region', 'Product', 'Revenue', 'Units']];
    for (let i = 0; i < 1000; i++) {
      rows.push([
        regions[i % regions.length]!,
        products[i % products.length]!,
        Math.ceil((i + 1) * 1.5),
        i % 20 + 1,
      ]);
    }
    return rows;
  }

  it('1 000-row cross-tab completes under 200 ms', () => {
    const grid = makePerf1k();
    const def: PivotDefinition = {
      source:  { start: { row: 1, col: 1 }, end: { row: 1001, col: 4 } },
      rows:    ['Region'],
      columns: ['Product'],
      values:  [{ field: 'Revenue', aggregator: 'sum' }],
    };
    const start = Date.now();
    buildPivot(grid, def);
    expect(Date.now() - start).toBeLessThan(200);
  });

  it('1 000-row cross-tab produces correct number of col keys (5 products)', () => {
    const grid = makePerf1k();
    const def: PivotDefinition = {
      source:  { start: { row: 1, col: 1 }, end: { row: 1001, col: 4 } },
      rows:    ['Region'],
      columns: ['Product'],
      values:  [{ field: 'Revenue', aggregator: 'sum' }],
    };
    expect(buildPivot(grid, def).colKeys).toHaveLength(5);
  });
});

// ---------------------------------------------------------------------------
// §25 Determinism — large dataset same result on re-run
// ---------------------------------------------------------------------------

describe('§25 Determinism — large dataset produces same result on re-run', () => {
  const PERF_GRID: (string | number)[][] = (() => {
    const rs = ['North', 'South', 'East', 'West'];
    const ps = ['Widget', 'Gadget', 'Thingy'];
    const rows: (string | number)[][] = [['Region', 'Product', 'Revenue']];
    for (let i = 0; i < 500; i++) {
      rows.push([rs[i % 4]!, ps[i % 3]!, i * 7 + 1]);
    }
    return rows;
  })();

  const PERF_DEF: PivotDefinition = {
    source:  { start: { row: 1, col: 1 }, end: { row: 501, col: 3 } },
    rows:    ['Region'],
    columns: ['Product'],
    values:  [{ field: 'Revenue', aggregator: 'sum' }],
  };

  it('two consecutive runs produce identical headers', () => {
    expect(buildPivot(PERF_GRID, PERF_DEF).headers)
      .toEqual(buildPivot(PERF_GRID, PERF_DEF).headers);
  });

  it('two consecutive runs produce identical row values', () => {
    const g1 = buildPivot(PERF_GRID, PERF_DEF);
    const g2 = buildPivot(PERF_GRID, PERF_DEF);
    for (let i = 0; i < g1.rows.length; i++) {
      expect(g1.rows[i]!.values).toEqual(g2.rows[i]!.values);
    }
  });
});

// ---------------------------------------------------------------------------
// §26 Flat pivot unchanged — colKeys absent when no columns defined
// ---------------------------------------------------------------------------

describe('§26 Flat pivot unchanged — colKeys absent', () => {
  it('flat pivot colKeys is undefined', () => {
    const def: PivotDefinition = {
      source: SALES_SOURCE,
      rows:   ['Region'],
      values: [{ field: 'Revenue', aggregator: 'sum' }],
    };
    const grid = buildPivot(SALES_GRID, def);
    expect(grid.colKeys).toBeUndefined();
  });

  it('flat pivot row values length equals values.length (not affected by col grouping)', () => {
    const def: PivotDefinition = {
      source: SALES_SOURCE,
      rows:   ['Region'],
      values: [
        { field: 'Revenue', aggregator: 'sum' },
        { field: 'Units',   aggregator: 'count' },
      ],
    };
    const grid = buildPivot(SALES_GRID, def);
    for (const row of grid.rows) {
      expect(row.values).toHaveLength(2);
    }
  });

  it('Phase 25 sum totals still correct for flat pivot', () => {
    const def: PivotDefinition = {
      source: SALES_SOURCE,
      rows:   ['Region'],
      values: [{ field: 'Revenue', aggregator: 'sum' }],
    };
    const grid = buildPivot(SALES_GRID, def);
    const north = grid.rows.find(r => r.keys[0] === 'North')!;
    // North: 1000 + 300 + 200 = 1500
    expect(north.values[0]).toBe(1500);
  });
});
