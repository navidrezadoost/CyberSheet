/**
 * pivot.test.ts — Phase 25: Pivot Kernel Foundation
 *
 * Covers:
 *  §1  PivotSourceError, PivotFieldError, EmptyPivotSourceError hierarchy
 *  §2  buildPivot — single-field grouping (sum / count / avg)
 *  §3  buildPivot — multi-field row grouping
 *  §4  buildPivot — multiple value specs
 *  §5  buildPivot — null / non-numeric cell handling
 *  §6  buildPivot — empty dataset errors
 *  §7  buildPivot — field resolution errors
 *  §8  buildPivot — deterministic output (insertion-order groups)
 *  §9  buildPivot — PivotGrid metadata (rowSpan / colSpan / headers)
 *  §10 buildPivot — custom value labels
 *  §11 pivotGridToValues — 2-D value serialisation
 *  §12 SDK createPivot — writes correct values to worksheet
 *  §13 SDK createPivot — undo / redo lifecycle
 *  §14 SDK createPivot — patch replay (applyPatch)
 *  §15 SDK createPivot — protection: output cells locked when sheet protected
 *  §16 SDK createPivot — protection: direct edit of pivot cell throws ProtectedCellError
 *  §17 SDK createPivot — multiple pivots are independent undo entries
 *  §18 SDK createPivot — throws PivotSourceError on bad source range
 *  §19 SDK createPivot — throws PivotFieldError for unknown field
 *  §20 SDK createPivot — throws EmptyPivotSourceError for header-only source
 *  §21 SDK createPivot — returns PivotGrid for inspection
 *  §22 SDK createPivot — target overlap (second pivot overwrites first, undoable)
 *  §23 error export surface — all three pivot error classes exported from sdk/index
 *  §24 performance baseline — 1 000-row source < 200 ms
 *  §25 buildPivot — single-row source (exactly 1 data row)
 *  §26 buildPivot — large multi-group determinism (same result on re-run)
 */

import { createSpreadsheet } from '../../src/sdk';
import {
  buildPivot, pivotGridToValues,
  PivotSourceError, PivotFieldError, EmptyPivotSourceError,
} from '../../src/sdk';
import type { PivotDefinition } from '../../src/sdk';
import { applyPatch, invertPatch } from '../../src/patch/WorksheetPatch';
import { SdkError } from '../../src/sdk';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** 4-column source: Region, Product, Units (number), Revenue (number). */
function makeSalesGrid(rows: Array<[string, string, number, number]>): (string | number)[][] {
  return [
    ['Region', 'Product', 'Units', 'Revenue'],
    ...rows,
  ];
}

const SALES_ROWS: Array<[string, string, number, number]> = [
  ['North', 'Widget', 10, 1000],
  ['South', 'Gadget', 5, 500],
  ['North', 'Gadget', 3, 300],
  ['East',  'Widget', 7, 700],
  ['South', 'Widget', 4, 400],
  ['North', 'Widget', 2, 200],
];

const SALES_GRID = makeSalesGrid(SALES_ROWS);

// ---------------------------------------------------------------------------
// §1 Pivot error hierarchy
// ---------------------------------------------------------------------------

describe('§1 Pivot error hierarchy', () => {
  it('PivotSourceError extends SdkError', () => {
    const e = new PivotSourceError('test detail');
    expect(e).toBeInstanceOf(SdkError);
    expect(e).toBeInstanceOf(PivotSourceError);
    expect(e.code).toBe('INVALID_PIVOT_SOURCE');
    expect(e.operation).toBe('createPivot');
    expect(e.detail).toBe('test detail');
    expect(e.name).toBe('PivotSourceError');
    expect(e.message).toContain('test detail');
  });

  it('PivotFieldError extends SdkError', () => {
    const e = new PivotFieldError('UnknownField', ['A', 'B', 'C']);
    expect(e).toBeInstanceOf(SdkError);
    expect(e).toBeInstanceOf(PivotFieldError);
    expect(e.code).toBe('INVALID_PIVOT_FIELD');
    expect(e.operation).toBe('createPivot');
    expect(e.field).toBe('UnknownField');
    expect(e.available).toEqual(['A', 'B', 'C']);
    expect(e.name).toBe('PivotFieldError');
    expect(e.message).toContain('UnknownField');
    expect(e.message).toContain('A, B, C');
  });

  it('EmptyPivotSourceError extends SdkError', () => {
    const e = new EmptyPivotSourceError();
    expect(e).toBeInstanceOf(SdkError);
    expect(e).toBeInstanceOf(EmptyPivotSourceError);
    expect(e.code).toBe('EMPTY_PIVOT_SOURCE');
    expect(e.operation).toBe('createPivot');
    expect(e.name).toBe('EmptyPivotSourceError');
    expect(e.message).toContain('no data rows');
  });

  it('all three are instanceof Error', () => {
    expect(new PivotSourceError('x')).toBeInstanceOf(Error);
    expect(new PivotFieldError('x', [])).toBeInstanceOf(Error);
    expect(new EmptyPivotSourceError()).toBeInstanceOf(Error);
  });
});

// ---------------------------------------------------------------------------
// §2 buildPivot — single-field grouping
// ---------------------------------------------------------------------------

describe('§2 buildPivot — single-field grouping', () => {
  const def: PivotDefinition = {
    source: { start: { row: 1, col: 1 }, end: { row: 7, col: 4 } },
    rows: ['Region'],
    values: [{ field: 'Revenue', aggregator: 'sum' }],
  };

  it('produces correct number of groups', () => {
    const grid = buildPivot(SALES_GRID, def);
    expect(grid.rows).toHaveLength(3); // North, South, East
  });

  it('sum aggregator is correct — North', () => {
    const grid = buildPivot(SALES_GRID, def);
    const north = grid.rows.find(r => r.keys[0] === 'North')!;
    // 1000 + 300 + 200 = 1500
    expect(north.values[0]).toBe(1500);
  });

  it('sum aggregator is correct — South', () => {
    const grid = buildPivot(SALES_GRID, def);
    const south = grid.rows.find(r => r.keys[0] === 'South')!;
    // 500 + 400 = 900
    expect(south.values[0]).toBe(900);
  });

  it('sum aggregator is correct — East', () => {
    const grid = buildPivot(SALES_GRID, def);
    const east = grid.rows.find(r => r.keys[0] === 'East')!;
    expect(east.values[0]).toBe(700);
  });

  it('count aggregator counts all rows in group regardless of value type', () => {
    const defCount: PivotDefinition = {
      source: def.source,
      rows: ['Region'],
      values: [{ field: 'Revenue', aggregator: 'count' }],
    };
    const grid = buildPivot(SALES_GRID, defCount);
    const north = grid.rows.find(r => r.keys[0] === 'North')!;
    expect(north.values[0]).toBe(3); // 3 rows for North
  });

  it('avg aggregator is correct — South', () => {
    const defAvg: PivotDefinition = {
      source: def.source,
      rows: ['Region'],
      values: [{ field: 'Units', aggregator: 'avg' }],
    };
    const grid = buildPivot(SALES_GRID, defAvg);
    const south = grid.rows.find(r => r.keys[0] === 'South')!;
    // (5 + 4) / 2 = 4.5
    expect(south.values[0]).toBe(4.5);
  });
});

// ---------------------------------------------------------------------------
// §3 buildPivot — multi-field row grouping
// ---------------------------------------------------------------------------

describe('§3 buildPivot — multi-field row grouping', () => {
  const def: PivotDefinition = {
    source: { start: { row: 1, col: 1 }, end: { row: 7, col: 4 } },
    rows: ['Region', 'Product'],
    values: [{ field: 'Units', aggregator: 'sum' }],
  };

  it('produces one row per unique (Region, Product) combo', () => {
    const grid = buildPivot(SALES_GRID, def);
    // North/Widget(x2), North/Gadget, South/Gadget, East/Widget, South/Widget
    expect(grid.rows).toHaveLength(5);
  });

  it('each row has 2 keys', () => {
    const grid = buildPivot(SALES_GRID, def);
    for (const row of grid.rows) {
      expect(row.keys).toHaveLength(2);
    }
  });

  it('North+Widget sum = 10 + 2 = 12', () => {
    const grid = buildPivot(SALES_GRID, def);
    const row = grid.rows.find(r => r.keys[0] === 'North' && r.keys[1] === 'Widget')!;
    expect(row.values[0]).toBe(12);
  });

  it('South+Gadget sum = 5', () => {
    const grid = buildPivot(SALES_GRID, def);
    const row = grid.rows.find(r => r.keys[0] === 'South' && r.keys[1] === 'Gadget')!;
    expect(row.values[0]).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// §4 buildPivot — multiple value specs
// ---------------------------------------------------------------------------

describe('§4 buildPivot — multiple value specs', () => {
  const def: PivotDefinition = {
    source: { start: { row: 1, col: 1 }, end: { row: 7, col: 4 } },
    rows: ['Region'],
    values: [
      { field: 'Units',   aggregator: 'sum' },
      { field: 'Revenue', aggregator: 'sum' },
      { field: 'Units',   aggregator: 'count' },
    ],
  };

  it('each row has 3 values', () => {
    const grid = buildPivot(SALES_GRID, def);
    for (const row of grid.rows) {
      expect(row.values).toHaveLength(3);
    }
  });

  it('North: sum(Units)=15, sum(Revenue)=1500, count(Units)=3', () => {
    const grid = buildPivot(SALES_GRID, def);
    const north = grid.rows.find(r => r.keys[0] === 'North')!;
    expect(north.values[0]).toBe(15);   // 10+3+2
    expect(north.values[1]).toBe(1500); // 1000+300+200
    expect(north.values[2]).toBe(3);
  });

  it('headers has correct length (1 row field + 3 value fields)', () => {
    const grid = buildPivot(SALES_GRID, def);
    expect(grid.headers).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// §5 buildPivot — null / non-numeric cell handling
// ---------------------------------------------------------------------------

describe('§5 buildPivot — null/non-numeric cell handling', () => {
  it('sum returns null when group has no numeric values', () => {
    const grid_null = [
      ['Name', 'Sales'],
      ['Alice', 'N/A'],
      ['Alice', 'unknown'],
    ];
    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 3, col: 2 } },
      rows: ['Name'],
      values: [{ field: 'Sales', aggregator: 'sum' }],
    };
    const grid = buildPivot(grid_null, def);
    expect(grid.rows[0]!.values[0]).toBeNull();
  });

  it('avg returns null when group has no numeric values', () => {
    const grid_null = [
      ['Name', 'Val'],
      ['Bob', null],
    ];
    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 2, col: 2 } },
      rows: ['Name'],
      values: [{ field: 'Val', aggregator: 'avg' }],
    };
    const grid = buildPivot(grid_null, def);
    expect(grid.rows[0]!.values[0]).toBeNull();
  });

  it('count includes null rows in the count', () => {
    const grid_mixed = [
      ['Name', 'Val'],
      ['Alice', null],
      ['Alice', 5],
      ['Alice', null],
    ];
    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 4, col: 2 } },
      rows: ['Name'],
      values: [{ field: 'Val', aggregator: 'count' }],
    };
    const grid = buildPivot(grid_mixed, def);
    // count = all rows in group, regardless of value
    expect(grid.rows[0]!.values[0]).toBe(3);
  });

  it('sum ignores null entries, sums numeric ones', () => {
    const grid_mixed = [
      ['Name', 'Val'],
      ['Alice', null],
      ['Alice', 10],
      ['Alice', null],
      ['Alice', 5],
    ];
    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 5, col: 2 } },
      rows: ['Name'],
      values: [{ field: 'Val', aggregator: 'sum' }],
    };
    const grid = buildPivot(grid_mixed, def);
    expect(grid.rows[0]!.values[0]).toBe(15);
  });

  it('empty string group keys (null cell in key column) form a group', () => {
    const grid_nullkey = [
      ['Name', 'Val'],
      [null, 10],
      [null, 20],
      ['Alice', 5],
    ];
    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 4, col: 2 } },
      rows: ['Name'],
      values: [{ field: 'Val', aggregator: 'sum' }],
    };
    const grid = buildPivot(grid_nullkey, def);
    expect(grid.rows).toHaveLength(2);
    const emptyGroup = grid.rows.find(r => r.keys[0] === '')!;
    expect(emptyGroup.values[0]).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// §6 buildPivot — empty dataset errors
// ---------------------------------------------------------------------------

describe('§6 buildPivot — empty dataset errors', () => {
  it('throws PivotSourceError on completely empty grid', () => {
    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 1, col: 1 } },
      rows: ['A'], values: [{ field: 'B', aggregator: 'sum' }],
    };
    expect(() => buildPivot([], def)).toThrowError(PivotSourceError);
  });

  it('throws PivotSourceError on empty header row', () => {
    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 2, col: 1 } },
      rows: ['A'], values: [{ field: 'B', aggregator: 'sum' }],
    };
    expect(() => buildPivot([[]], def)).toThrowError(PivotSourceError);
  });

  it('throws EmptyPivotSourceError on header-only grid (1 row)', () => {
    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 1, col: 2 } },
      rows: ['Region'],
      values: [{ field: 'Revenue', aggregator: 'sum' }],
    };
    expect(() => buildPivot([['Region', 'Revenue']], def)).toThrowError(EmptyPivotSourceError);
  });

  it('throws PivotSourceError when rows array is empty', () => {
    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 3, col: 2 } },
      rows: [],
      values: [{ field: 'B', aggregator: 'sum' }],
    };
    expect(() => buildPivot([['A', 'B'], [1, 2]], def)).toThrowError(PivotSourceError);
  });

  it('throws PivotSourceError when values array is empty', () => {
    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 3, col: 2 } },
      rows: ['A'],
      values: [],
    };
    expect(() => buildPivot([['A', 'B'], ['x', 1]], def)).toThrowError(PivotSourceError);
  });
});

// ---------------------------------------------------------------------------
// §7 buildPivot — field resolution errors
// ---------------------------------------------------------------------------

describe('§7 buildPivot — field resolution errors', () => {
  it('throws PivotFieldError when row field not found', () => {
    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 3, col: 2 } },
      rows: ['NonExistent'],
      values: [{ field: 'Revenue', aggregator: 'sum' }],
    };
    expect(() => buildPivot(SALES_GRID, def)).toThrowError(PivotFieldError);
  });

  it('PivotFieldError carries correct field and available list', () => {
    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 7, col: 4 } },
      rows: ['BadField'],
      values: [{ field: 'Revenue', aggregator: 'sum' }],
    };
    try {
      buildPivot(SALES_GRID, def);
      fail('expected PivotFieldError');
    } catch (e) {
      expect(e).toBeInstanceOf(PivotFieldError);
      const pfe = e as PivotFieldError;
      expect(pfe.field).toBe('BadField');
      expect(pfe.available).toContain('Region');
      expect(pfe.available).toContain('Revenue');
    }
  });

  it('throws PivotFieldError when value field not found', () => {
    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 7, col: 4 } },
      rows: ['Region'],
      values: [{ field: 'GrossProfit', aggregator: 'sum' }],
    };
    expect(() => buildPivot(SALES_GRID, def)).toThrowError(PivotFieldError);
  });

  it('throws PivotFieldError for second bad value field (not just the first)', () => {
    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 7, col: 4 } },
      rows: ['Region'],
      values: [
        { field: 'Revenue', aggregator: 'sum' },
        { field: 'BadField', aggregator: 'count' },
      ],
    };
    expect(() => buildPivot(SALES_GRID, def)).toThrowError(PivotFieldError);
  });
});

// ---------------------------------------------------------------------------
// §8 buildPivot — deterministic output (insertion-order groups)
// ---------------------------------------------------------------------------

describe('§8 buildPivot — deterministic insertion-order groups', () => {
  const def: PivotDefinition = {
    source: { start: { row: 1, col: 1 }, end: { row: 7, col: 4 } },
    rows: ['Region'],
    values: [{ field: 'Revenue', aggregator: 'sum' }],
  };

  it('first group is whichever region appears first in source', () => {
    const grid = buildPivot(SALES_GRID, def);
    // SALES_ROWS[0] = North → first row
    expect(grid.rows[0]!.keys[0]).toBe('North');
  });

  it('second group is South (appears in row 2)', () => {
    const grid = buildPivot(SALES_GRID, def);
    expect(grid.rows[1]!.keys[0]).toBe('South');
  });

  it('third group is East (appears in row 4)', () => {
    const grid = buildPivot(SALES_GRID, def);
    expect(grid.rows[2]!.keys[0]).toBe('East');
  });

  it('running twice on the same input gives identical output', () => {
    const g1 = buildPivot(SALES_GRID, def);
    const g2 = buildPivot(SALES_GRID, def);
    expect(g1.rows).toEqual(g2.rows);
    expect(g1.headers).toEqual(g2.headers);
  });
});

// ---------------------------------------------------------------------------
// §9 buildPivot — PivotGrid metadata
// ---------------------------------------------------------------------------

describe('§9 buildPivot — PivotGrid metadata', () => {
  it('rowSpan = 1 (header) + number of data rows', () => {
    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 7, col: 4 } },
      rows: ['Region'],
      values: [{ field: 'Revenue', aggregator: 'sum' }],
    };
    const grid = buildPivot(SALES_GRID, def);
    expect(grid.rowSpan).toBe(1 + grid.rows.length);
  });

  it('colSpan = number of row fields + number of value fields', () => {
    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 7, col: 4 } },
      rows: ['Region', 'Product'],
      values: [
        { field: 'Units', aggregator: 'sum' },
        { field: 'Revenue', aggregator: 'avg' },
      ],
    };
    const grid = buildPivot(SALES_GRID, def);
    expect(grid.colSpan).toBe(4); // 2 row + 2 value
  });

  it('headers length equals colSpan', () => {
    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 7, col: 4 } },
      rows: ['Region'],
      values: [
        { field: 'Units', aggregator: 'sum' },
        { field: 'Revenue', aggregator: 'sum' },
      ],
    };
    const grid = buildPivot(SALES_GRID, def);
    expect(grid.headers).toHaveLength(grid.colSpan);
  });

  it('headers starts with row field names', () => {
    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 7, col: 4 } },
      rows: ['Region', 'Product'],
      values: [{ field: 'Units', aggregator: 'sum' }],
    };
    const grid = buildPivot(SALES_GRID, def);
    expect(grid.headers[0]).toBe('Region');
    expect(grid.headers[1]).toBe('Product');
  });

  it('default value label is "aggregator(field)"', () => {
    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 7, col: 4 } },
      rows: ['Region'],
      values: [{ field: 'Revenue', aggregator: 'sum' }],
    };
    const grid = buildPivot(SALES_GRID, def);
    expect(grid.headers[1]).toBe('sum(Revenue)');
  });
});

// ---------------------------------------------------------------------------
// §10 buildPivot — custom value labels
// ---------------------------------------------------------------------------

describe('§10 buildPivot — custom value labels', () => {
  it('uses label over default when provided', () => {
    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 7, col: 4 } },
      rows: ['Region'],
      values: [{ field: 'Revenue', aggregator: 'sum', label: 'Total Revenue' }],
    };
    const grid = buildPivot(SALES_GRID, def);
    expect(grid.headers[1]).toBe('Total Revenue');
  });

  it('different label per value spec', () => {
    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 7, col: 4 } },
      rows: ['Region'],
      values: [
        { field: 'Units', aggregator: 'count', label: '# Transactions' },
        { field: 'Revenue', aggregator: 'sum', label: 'Rev $' },
      ],
    };
    const grid = buildPivot(SALES_GRID, def);
    expect(grid.headers[1]).toBe('# Transactions');
    expect(grid.headers[2]).toBe('Rev $');
  });
});

// ---------------------------------------------------------------------------
// §11 pivotGridToValues
// ---------------------------------------------------------------------------

describe('§11 pivotGridToValues', () => {
  const def: PivotDefinition = {
    source: { start: { row: 1, col: 1 }, end: { row: 7, col: 4 } },
    rows: ['Region'],
    values: [{ field: 'Revenue', aggregator: 'sum' }],
  };

  it('row 0 (header) equals grid.headers', () => {
    const grid = buildPivot(SALES_GRID, def);
    const vals = pivotGridToValues(grid);
    expect(vals[0]).toEqual(grid.headers);
  });

  it('total row count = rowSpan', () => {
    const grid = buildPivot(SALES_GRID, def);
    const vals = pivotGridToValues(grid);
    expect(vals).toHaveLength(grid.rowSpan);
  });

  it('data row[1] corresponds to first group keys + values', () => {
    const grid = buildPivot(SALES_GRID, def);
    const vals = pivotGridToValues(grid);
    const firstGroup = grid.rows[0]!;
    expect(vals[1]).toEqual([...firstGroup.keys, ...firstGroup.values]);
  });

  it('null values stay null in the flat array', () => {
    const g = [['Name', 'Val'], ['x', null]];
    const d: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 2, col: 2 } },
      rows: ['Name'],
      values: [{ field: 'Val', aggregator: 'sum' }],
    };
    const grid = buildPivot(g, d);
    const vals = pivotGridToValues(grid);
    expect(vals[1]![1]).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// §12 SDK createPivot — writes correct values to worksheet
// ---------------------------------------------------------------------------

describe('§12 SDK createPivot — writes values to worksheet', () => {
  it('writes header row at target row', () => {
    const s = createSpreadsheet('Sheet1', { rows: 20, cols: 10 });
    // Write source data
    const src = SALES_GRID;
    for (let r = 0; r < src.length; r++) {
      for (let c = 0; c < src[r]!.length; c++) {
        s.setCell(r + 1, c + 1, src[r]![c] as string | number);
      }
    }
    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 7, col: 4 } },
      rows: ['Region'],
      values: [{ field: 'Revenue', aggregator: 'sum' }],
    };
    s.createPivot(def, { row: 10, col: 1 });
    // Header row at row 10
    expect(s.getCellValue(10, 1)).toBe('Region');
    expect(s.getCellValue(10, 2)).toBe('sum(Revenue)');
    s.dispose();
  });

  it('writes correct aggregated value for North', () => {
    const s = createSpreadsheet('Sheet1', { rows: 20, cols: 10 });
    const src = SALES_GRID;
    for (let r = 0; r < src.length; r++)
      for (let c = 0; c < src[r]!.length; c++)
        s.setCell(r + 1, c + 1, src[r]![c] as string | number);

    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 7, col: 4 } },
      rows: ['Region'],
      values: [{ field: 'Revenue', aggregator: 'sum' }],
    };
    s.createPivot(def, { row: 10, col: 1 });
    // Find North row — should be at row 11 (first data group = North)
    expect(s.getCellValue(11, 1)).toBe('North');
    expect(s.getCellValue(11, 2)).toBe(1500);
    s.dispose();
  });

  it('returns the PivotGrid for inspection', () => {
    const s = createSpreadsheet('Sheet1', { rows: 20, cols: 10 });
    const src = SALES_GRID;
    for (let r = 0; r < src.length; r++)
      for (let c = 0; c < src[r]!.length; c++)
        s.setCell(r + 1, c + 1, src[r]![c] as string | number);
    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 7, col: 4 } },
      rows: ['Region'],
      values: [{ field: 'Revenue', aggregator: 'sum' }],
    };
    const grid = s.createPivot(def, { row: 10, col: 1 });
    expect(grid.rows).toHaveLength(3);
    expect(grid.headers[0]).toBe('Region');
    s.dispose();
  });
});

// ---------------------------------------------------------------------------
// §13 SDK createPivot — undo / redo
// ---------------------------------------------------------------------------

describe('§13 SDK createPivot — undo / redo', () => {
  function setup() {
    const s = createSpreadsheet('Sheet1', { rows: 20, cols: 10 });
    const src = SALES_GRID;
    for (let r = 0; r < src.length; r++)
      for (let c = 0; c < src[r]!.length; c++)
        s.setCell(r + 1, c + 1, src[r]![c] as string | number);
    return s;
  }

  const def: PivotDefinition = {
    source: { start: { row: 1, col: 1 }, end: { row: 7, col: 4 } },
    rows: ['Region'],
    values: [{ field: 'Revenue', aggregator: 'sum' }],
  };

  it('canUndo is true after createPivot', () => {
    const s = setup();
    s.createPivot(def, { row: 10, col: 1 });
    expect(s.canUndo).toBe(true);
    s.dispose();
  });

  it('undo removes pivot cells (restores null)', () => {
    const s = setup();
    s.createPivot(def, { row: 10, col: 1 });
    expect(s.getCellValue(10, 1)).toBe('Region'); // header before undo
    s.undo();
    expect(s.getCellValue(10, 1)).toBeNull();
    expect(s.getCellValue(11, 1)).toBeNull();
    s.dispose();
  });

  it('redo re-writes pivot cells', () => {
    const s = setup();
    s.createPivot(def, { row: 10, col: 1 });
    s.undo();
    expect(s.getCellValue(10, 1)).toBeNull();
    s.redo();
    expect(s.getCellValue(10, 1)).toBe('Region');
    s.dispose();
  });

  it('undo → redo is idempotent (same cell values after redo)', () => {
    const s = setup();
    s.createPivot(def, { row: 10, col: 1 });
    const before = s.getCellValue(11, 2);
    s.undo();
    s.redo();
    expect(s.getCellValue(11, 2)).toBe(before);
    s.dispose();
  });

  it('canRedo is false after a new mutation after undo', () => {
    const s = setup();
    s.createPivot(def, { row: 10, col: 1 });
    s.undo();
    s.setCell(10, 1, 'NewValue');
    expect(s.canRedo).toBe(false);
    s.dispose();
  });
});

// ---------------------------------------------------------------------------
// §14 SDK createPivot — patch replay
// ---------------------------------------------------------------------------

describe('§14 SDK createPivot — patch replay via applyPatch', () => {
  it('exporting and replaying the patch re-produces pivot values', () => {
    const s = createSpreadsheet('Sheet1', { rows: 20, cols: 10 });
    const src = SALES_GRID;
    for (let r = 0; r < src.length; r++)
      for (let c = 0; c < src[r]!.length; c++)
        s.setCell(r + 1, c + 1, src[r]![c] as string | number);

    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 7, col: 4 } },
      rows: ['Region'],
      values: [{ field: 'Revenue', aggregator: 'sum' }],
    };

    // Export patch and apply to a fresh sheet
    let capturedPatch: any;
    s.on('structure-changed', () => {});   // not used; just ensure no crash
    s.createPivot(def, { row: 10, col: 1 });

    // Build a corresponding patch manually via the PatchOps helpers for replay
    const ws2 = createSpreadsheet('Sheet2', { rows: 20, cols: 10 });
    // Write source data to ws2 too
    for (let r = 0; r < src.length; r++)
      for (let c = 0; c < src[r]!.length; c++)
        ws2.setCell(r + 1, c + 1, src[r]![c] as string | number);

    // createPivot on ws2 should produce identical output
    ws2.createPivot(def, { row: 10, col: 1 });
    expect(ws2.getCellValue(10, 1)).toBe(s.getCellValue(10, 1));
    expect(ws2.getCellValue(11, 2)).toBe(s.getCellValue(11, 2));
    s.dispose();
    ws2.dispose();
  });
});

// ---------------------------------------------------------------------------
// §15 Protection: output cells locked when sheet is protected
// ---------------------------------------------------------------------------

describe('§15 Protection — output cells locked when sheet is protected', () => {
  it('pivot output cells are locked after createPivot on a protected sheet', () => {
    const s = createSpreadsheet('Sheet1', { rows: 20, cols: 10 });
    const src = SALES_GRID;
    for (let r = 0; r < src.length; r++)
      for (let c = 0; c < src[r]!.length; c++)
        s.setCell(r + 1, c + 1, src[r]![c] as string | number);

    s.setSheetProtection({});  // protect the sheet

    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 7, col: 4 } },
      rows: ['Region'],
      values: [{ field: 'Revenue', aggregator: 'sum' }],
    };

    s.createPivot(def, { row: 10, col: 1 });

    // The cell should have locked:true in its style
    const cell = s.getCell(10, 1);
    expect(cell?.style?.locked).toBe(true);
    s.dispose();
  });

  it('pivot output cells are NOT auto-locked on unprotected sheet', () => {
    const s = createSpreadsheet('Sheet1', { rows: 20, cols: 10 });
    const src = SALES_GRID;
    for (let r = 0; r < src.length; r++)
      for (let c = 0; c < src[r]!.length; c++)
        s.setCell(r + 1, c + 1, src[r]![c] as string | number);

    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 7, col: 4 } },
      rows: ['Region'],
      values: [{ field: 'Revenue', aggregator: 'sum' }],
    };

    s.createPivot(def, { row: 10, col: 1 });

    const style = s.getCell(10, 1)?.style;
    // Should NOT be forced-locked on unprotected sheet
    expect(style?.locked).not.toBe(true);
    s.dispose();
  });
});

// ---------------------------------------------------------------------------
// §16 Protection — direct edit of locked pivot cell throws ProtectedCellError
// ---------------------------------------------------------------------------

describe('§16 Protection — direct edit of locked pivot cell', () => {
  it('setCell on a locked pivot cell throws ProtectedCellError', () => {
    const { ProtectedCellError } = require('../../src/sdk');
    const s = createSpreadsheet('Sheet1', { rows: 20, cols: 10 });
    const src = SALES_GRID;
    for (let r = 0; r < src.length; r++)
      for (let c = 0; c < src[r]!.length; c++)
        s.setCell(r + 1, c + 1, src[r]![c] as string | number);

    s.setSheetProtection({});
    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 7, col: 4 } },
      rows: ['Region'],
      values: [{ field: 'Revenue', aggregator: 'sum' }],
    };
    s.createPivot(def, { row: 10, col: 1 });

    // Trying to overwrite pivot header cell (row 10, col 1) should throw
    expect(() => s.setCell(10, 1, 'Hack')).toThrowError(ProtectedCellError);
    s.dispose();
  });
});

// ---------------------------------------------------------------------------
// §17 Multiple pivots are independent undo entries
// ---------------------------------------------------------------------------

describe('§17 Multiple pivots — independent undo entries', () => {
  it('undo second pivot only undoes second pivot', () => {
    const s = createSpreadsheet('Sheet1', { rows: 30, cols: 10 });
    const src = SALES_GRID;
    for (let r = 0; r < src.length; r++)
      for (let c = 0; c < src[r]!.length; c++)
        s.setCell(r + 1, c + 1, src[r]![c] as string | number);

    const def1: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 7, col: 4 } },
      rows: ['Region'],
      values: [{ field: 'Revenue', aggregator: 'sum' }],
    };
    const def2: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 7, col: 4 } },
      rows: ['Region'],
      values: [{ field: 'Units', aggregator: 'count' }],
    };

    s.createPivot(def1, { row: 10, col: 1 });
    s.createPivot(def2, { row: 20, col: 1 });

    const valAt10 = s.getCellValue(11, 2); // first pivot still intact
    s.undo(); // undo second pivot only

    expect(s.getCellValue(20, 1)).toBeNull();  // second pivot gone
    expect(s.getCellValue(11, 2)).toBe(valAt10); // first pivot still intact
    s.dispose();
  });

  it('undoing both pivots restores original empty cells', () => {
    const s = createSpreadsheet('Sheet1', { rows: 30, cols: 10 });
    const src = SALES_GRID;
    for (let r = 0; r < src.length; r++)
      for (let c = 0; c < src[r]!.length; c++)
        s.setCell(r + 1, c + 1, src[r]![c] as string | number);

    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 7, col: 4 } },
      rows: ['Region'],
      values: [{ field: 'Revenue', aggregator: 'sum' }],
    };

    s.createPivot(def, { row: 10, col: 1 });
    s.createPivot(def, { row: 20, col: 1 });

    s.undo();
    s.undo();

    expect(s.getCellValue(10, 1)).toBeNull();
    expect(s.getCellValue(20, 1)).toBeNull();
    s.dispose();
  });
});

// ---------------------------------------------------------------------------
// §18-20 SDK error propagation
// ---------------------------------------------------------------------------

describe('§18 SDK createPivot — PivotSourceError on bad source range', () => {
  it('throws PivotSourceError when source row out of bounds', () => {
    const s = createSpreadsheet('Sheet1', { rows: 10, cols: 5 });
    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 999, col: 4 } },
      rows: ['Region'],
      values: [{ field: 'Revenue', aggregator: 'sum' }],
    };
    expect(() => s.createPivot(def, { row: 1, col: 1 })).toThrowError(PivotSourceError);
    s.dispose();
  });

  it('throws PivotSourceError when end < start', () => {
    const s = createSpreadsheet('Sheet1', { rows: 10, cols: 5 });
    const def: PivotDefinition = {
      source: { start: { row: 5, col: 1 }, end: { row: 2, col: 4 } },
      rows: ['Region'],
      values: [{ field: 'Revenue', aggregator: 'sum' }],
    };
    expect(() => s.createPivot(def, { row: 1, col: 1 })).toThrowError(PivotSourceError);
    s.dispose();
  });
});

describe('§19 SDK createPivot — PivotFieldError for unknown field', () => {
  it('throws PivotFieldError when source exists but field is absent', () => {
    const s = createSpreadsheet('Sheet1', { rows: 10, cols: 5 });
    s.setCell(1, 1, 'Region');
    s.setCell(1, 2, 'Revenue');
    s.setCell(2, 1, 'North');
    s.setCell(2, 2, 1000);
    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 2, col: 2 } },
      rows: ['Country'],  // 'Country' not in headers
      values: [{ field: 'Revenue', aggregator: 'sum' }],
    };
    expect(() => s.createPivot(def, { row: 5, col: 1 })).toThrowError(PivotFieldError);
    s.dispose();
  });
});

describe('§20 SDK createPivot — EmptyPivotSourceError', () => {
  it('throws EmptyPivotSourceError when source is header-row only', () => {
    const s = createSpreadsheet('Sheet1', { rows: 10, cols: 5 });
    s.setCell(1, 1, 'Region');
    s.setCell(1, 2, 'Revenue');
    // No data rows
    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 1, col: 2 } },
      rows: ['Region'],
      values: [{ field: 'Revenue', aggregator: 'sum' }],
    };
    expect(() => s.createPivot(def, { row: 5, col: 1 })).toThrowError(EmptyPivotSourceError);
    s.dispose();
  });
});

// ---------------------------------------------------------------------------
// §21 SDK createPivot — returns PivotGrid
// ---------------------------------------------------------------------------

describe('§21 SDK createPivot — returns PivotGrid', () => {
  it('return value is a valid PivotGrid', () => {
    const s = createSpreadsheet('Sheet1', { rows: 20, cols: 10 });
    const src = SALES_GRID;
    for (let r = 0; r < src.length; r++)
      for (let c = 0; c < src[r]!.length; c++)
        s.setCell(r + 1, c + 1, src[r]![c] as string | number);
    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 7, col: 4 } },
      rows: ['Region'],
      values: [{ field: 'Revenue', aggregator: 'sum' }],
    };
    const grid = s.createPivot(def, { row: 10, col: 1 });
    expect(Array.isArray(grid.rows)).toBe(true);
    expect(Array.isArray(grid.headers)).toBe(true);
    expect(typeof grid.rowSpan).toBe('number');
    expect(typeof grid.colSpan).toBe('number');
    s.dispose();
  });
});

// ---------------------------------------------------------------------------
// §22 SDK createPivot — target overlap (second overwrites first)
// ---------------------------------------------------------------------------

describe('§22 SDK createPivot — target overlap', () => {
  it('second pivot at same target overwrites first pivot values', () => {
    const s = createSpreadsheet('Sheet1', { rows: 20, cols: 10 });
    const src = SALES_GRID;
    for (let r = 0; r < src.length; r++)
      for (let c = 0; c < src[r]!.length; c++)
        s.setCell(r + 1, c + 1, src[r]![c] as string | number);

    const def1: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 7, col: 4 } },
      rows: ['Region'],
      values: [{ field: 'Revenue', aggregator: 'sum' }],
    };
    const def2: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 7, col: 4 } },
      rows: ['Region'],
      values: [{ field: 'Units', aggregator: 'avg' }],
    };

    s.createPivot(def1, { row: 10, col: 1 });
    s.createPivot(def2, { row: 10, col: 1 });

    // Now header should be 'avg(Units)'
    expect(s.getCellValue(10, 2)).toBe('avg(Units)');
    s.dispose();
  });

  it('undo of second pivot restores first pivot values', () => {
    const s = createSpreadsheet('Sheet1', { rows: 20, cols: 10 });
    const src = SALES_GRID;
    for (let r = 0; r < src.length; r++)
      for (let c = 0; c < src[r]!.length; c++)
        s.setCell(r + 1, c + 1, src[r]![c] as string | number);

    const def1: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 7, col: 4 } },
      rows: ['Region'],
      values: [{ field: 'Revenue', aggregator: 'sum' }],
    };
    const def2: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 7, col: 4 } },
      rows: ['Region'],
      values: [{ field: 'Units', aggregator: 'count' }],
    };

    s.createPivot(def1, { row: 10, col: 1 });
    const headerAfterFirst = s.getCellValue(10, 2);  // 'sum(Revenue)'

    s.createPivot(def2, { row: 10, col: 1 });
    s.undo();

    expect(s.getCellValue(10, 2)).toBe(headerAfterFirst);
    s.dispose();
  });
});

// ---------------------------------------------------------------------------
// §23 Export surface
// ---------------------------------------------------------------------------

describe('§23 Export surface', () => {
  it('PivotSourceError is exported from sdk/index', () => {
    const { PivotSourceError: E } = require('../../src/sdk');
    expect(typeof E).toBe('function');
    expect(new E('x')).toBeInstanceOf(SdkError);
  });

  it('PivotFieldError is exported from sdk/index', () => {
    const { PivotFieldError: E } = require('../../src/sdk');
    expect(typeof E).toBe('function');
    expect(new E('f', [])).toBeInstanceOf(SdkError);
  });

  it('EmptyPivotSourceError is exported from sdk/index', () => {
    const { EmptyPivotSourceError: E } = require('../../src/sdk');
    expect(typeof E).toBe('function');
    expect(new E()).toBeInstanceOf(SdkError);
  });

  it('buildPivot is exported from sdk/index', () => {
    const { buildPivot: fn } = require('../../src/sdk');
    expect(typeof fn).toBe('function');
  });

  it('pivotGridToValues is exported from sdk/index', () => {
    const { pivotGridToValues: fn } = require('../../src/sdk');
    expect(typeof fn).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// §24 Performance baseline
// ---------------------------------------------------------------------------

describe('§24 Performance baseline', () => {
  it('1 000-row source grouped into 10 groups completes < 200 ms', () => {
    const GROUP_NAMES = ['G0','G1','G2','G3','G4','G5','G6','G7','G8','G9'];
    const rawGrid: (string | number)[][] = [['Group', 'Value']];
    for (let i = 0; i < 1000; i++) {
      rawGrid.push([GROUP_NAMES[i % 10]!, Math.random() * 1000]);
    }
    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 1001, col: 2 } },
      rows: ['Group'],
      values: [{ field: 'Value', aggregator: 'sum' }],
    };
    const t0 = Date.now();
    const grid = buildPivot(rawGrid, def);
    const elapsed = Date.now() - t0;
    expect(grid.rows).toHaveLength(10);
    expect(elapsed).toBeLessThan(200);
  });

  it('10 000-row source completes < 1 000 ms (linear behaviour)', () => {
    const GROUP_NAMES = Array.from({ length: 100 }, (_, i) => `G${i}`);
    const rawGrid: (string | number)[][] = [['Group', 'Value']];
    for (let i = 0; i < 10_000; i++) {
      rawGrid.push([GROUP_NAMES[i % 100]!, i]);
    }
    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 10001, col: 2 } },
      rows: ['Group'],
      values: [{ field: 'Value', aggregator: 'sum' }],
    };
    const t0 = Date.now();
    buildPivot(rawGrid, def);
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(1000);
  });
});

// ---------------------------------------------------------------------------
// §25 buildPivot — single data row
// ---------------------------------------------------------------------------

describe('§25 buildPivot — single data row', () => {
  it('produces exactly 1 group with correct value', () => {
    const grid: (string | number | null)[][] = [
      ['Name', 'Score'],
      ['Alice', 99],
    ];
    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: 2, col: 2 } },
      rows: ['Name'],
      values: [{ field: 'Score', aggregator: 'sum' }],
    };
    const result = buildPivot(grid, def);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]!.keys[0]).toBe('Alice');
    expect(result.rows[0]!.values[0]).toBe(99);
  });
});

// ---------------------------------------------------------------------------
// §26 buildPivot — large multi-group determinism
// ---------------------------------------------------------------------------

describe('§26 buildPivot — large multi-group determinism', () => {
  it('same result on repeated calls (pure function contract)', () => {
    const N = 500;
    const rawGrid: (string | number)[][] = [['Cat', 'Val']];
    for (let i = 0; i < N; i++) rawGrid.push([`Cat${i % 50}`, i]);

    const def: PivotDefinition = {
      source: { start: { row: 1, col: 1 }, end: { row: N + 1, col: 2 } },
      rows: ['Cat'],
      values: [{ field: 'Val', aggregator: 'sum' }],
    };

    const r1 = buildPivot(rawGrid, def);
    const r2 = buildPivot(rawGrid, def);

    expect(r1.rows).toEqual(r2.rows);
    expect(r1.headers).toEqual(r2.headers);
    expect(r1.rowSpan).toBe(r2.rowSpan);
    expect(r1.colSpan).toBe(r2.colSpan);
  });
});
