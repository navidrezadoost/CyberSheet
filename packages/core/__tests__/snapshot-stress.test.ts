/**
 * snapshot-stress.test.ts — Phase 8: Large-Sheet Stress Tests
 *
 * Validates snapshot engine under real-world ceiling loads:
 *   • 500 000 numeric cells  — encode time, decode time, memory delta
 *   • 200 000 formula cells  — DAG section encode time + decode time
 *   • Correctness spot-checks on decoded data
 *
 * All timings measured with the monotonic high-resolution `performance.now()`.
 * Memory measured via `process.memoryUsage().heapUsed`.
 *
 * Jest default timeout extended to 60 s for this file.
 */

import {
  snapshotCodec,
  crc32,
  type WorksheetSnapshot,
  type CellEntry,
  type DagEdge,
} from '../src/persistence/SnapshotCodec';
import { Worksheet } from '../src/worksheet';
import type { Address } from '../src/types';

// Extend timeout for the entire file to 60 seconds.
jest.setTimeout(60_000);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const addr = (row: number, col: number): Address => ({ row, col });

function makeEmptySnap(): WorksheetSnapshot {
  return {
    version:    2,
    cells:      [],
    merges:     [],
    hiddenRows: [],
    hiddenCols: [],
    dagEdges:   [],
    volatiles:  [],
  };
}

/** Build a snapshot containing N numeric cells (col = 1, rows 1..N). */
function buildNumericSnap(n: number): WorksheetSnapshot {
  const snap = makeEmptySnap();
  snap.cells = new Array<CellEntry>(n);
  for (let i = 0; i < n; i++) {
    snap.cells[i] = {
      row:  i + 1,
      col:  1,
      cell: {
        value:       (i + 1) * 0.001,
        formula:     undefined,
        style:       undefined,
        comments:    undefined,
        icon:        undefined,
        spillSource: undefined,
        spilledFrom: undefined,
      },
    };
  }
  return snap;
}

/** Build a snapshot containing N formula cells with 1 dep each. */
function buildFormulaSnap(n: number): WorksheetSnapshot {
  const snap = makeEmptySnap();
  snap.cells    = new Array<CellEntry>(n);
  snap.dagEdges = new Array<DagEdge>(n);
  for (let i = 0; i < n; i++) {
    // Formula cells in col 2, dep on col 1 same row.
    snap.cells[i] = {
      row:  i + 1,
      col:  2,
      cell: {
        value:       (i + 1) * 0.001,
        formula:     `=A${i + 1}`,
        style:       undefined,
        comments:    undefined,
        icon:        undefined,
        spillSource: undefined,
        spilledFrom: undefined,
      },
    };
    snap.dagEdges[i] = {
      row:  i + 1,
      col:  2,
      deps: [{ row: i + 1, col: 1 }],
    };
  }
  return snap;
}

// ---------------------------------------------------------------------------
// 1. 500k numeric cells — encode performance
// ---------------------------------------------------------------------------

describe('500k numeric cells — encode performance', () => {

  let snap500k: WorksheetSnapshot;

  beforeAll(() => {
    snap500k = buildNumericSnap(500_000);
  });

  it('encode 500k numeric cells completes in < 3000 ms', () => {
    const t0  = performance.now();
    const buf = snapshotCodec.encode(snap500k);
    const ms  = performance.now() - t0;

    console.log(`[stress] encode 500k cells: ${ms.toFixed(1)} ms, ${(buf.byteLength / 1024 / 1024).toFixed(2)} MB`);
    expect(ms).toBeLessThan(3_000);
    expect(buf.byteLength).toBeGreaterThan(0);
  });

  it('bytes per numeric cell is ≤ 30 (binary efficiency)', () => {
    const buf        = snapshotCodec.encode(snap500k);
    const bytesPerCell = buf.byteLength / 500_000;
    console.log(`[stress] bytes/cell: ${bytesPerCell.toFixed(2)}`);
    expect(bytesPerCell).toBeLessThanOrEqual(30);
  });

  it('encoded buffer has valid CRC32 (no corruption during large encode)', () => {
    const buf  = snapshotCodec.encode(snap500k);
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const stored = view.getUint32(8, true);
    // Zero the checksum field for verification.
    const copy = buf.slice();
    new DataView(copy.buffer).setUint32(8, 0, true);
    expect(crc32(copy)).toBe(stored);
  });
});

// ---------------------------------------------------------------------------
// 2. 500k numeric cells — decode performance
// ---------------------------------------------------------------------------

describe('500k numeric cells — decode performance', () => {

  let buf500k: Uint8Array;

  beforeAll(() => {
    buf500k = snapshotCodec.encode(buildNumericSnap(500_000));
  });

  it('decode 500k numeric cells completes in < 3000 ms', () => {
    const t0  = performance.now();
    const snap = snapshotCodec.decode(buf500k);
    const ms   = performance.now() - t0;

    console.log(`[stress] decode 500k cells: ${ms.toFixed(1)} ms`);
    expect(ms).toBeLessThan(3_000);
    expect(snap.cells).toHaveLength(500_000);
  });

  it('decode 500k cells — correctness spot-check (first, middle, last)', () => {
    const snap = snapshotCodec.decode(buf500k);
    // First cell: row=1, col=1, value=0.001
    expect(snap.cells[0].row).toBe(1);
    expect(snap.cells[0].col).toBe(1);
    expect(snap.cells[0].cell.value).toBeCloseTo(0.001, 9);

    // Middle cell: row=250000
    const mid = snap.cells[249_999];
    expect(mid.row).toBe(250_000);
    expect(mid.cell.value).toBeCloseTo(250_000 * 0.001, 6);

    // Last cell: row=500000
    const last = snap.cells[499_999];
    expect(last.row).toBe(500_000);
    expect(last.cell.value).toBeCloseTo(500_000 * 0.001, 6);
  });

  it('decode is idempotent — double decode gives identical results', () => {
    const s1 = snapshotCodec.decode(buf500k);
    const s2 = snapshotCodec.decode(buf500k);
    expect(s1.cells[0].cell.value).toBe(s2.cells[0].cell.value);
    expect(s1.cells[499_999].row).toBe(s2.cells[499_999].row);
  });
});

// ---------------------------------------------------------------------------
// 3. 500k cells memory profile
// ---------------------------------------------------------------------------

describe('500k cells — memory profile', () => {

  it('heap delta during encode/decode stays under 200 MB', () => {
    const NULL_RUNS = 3;
    // Warm up GC to get a stable baseline.
    for (let i = 0; i < NULL_RUNS; i++) snapshotCodec.encode(makeEmptySnap());

    const before = process.memoryUsage().heapUsed;
    const snap   = buildNumericSnap(500_000);
    const buf    = snapshotCodec.encode(snap);
    snapshotCodec.decode(buf);
    const after  = process.memoryUsage().heapUsed;

    const deltaMB = (after - before) / (1024 * 1024);
    console.log(`[stress] heap delta for 500k cells: ${deltaMB.toFixed(1)} MB`);

    // 200 MB ceiling: 500k Cell objects (~150 bytes each = 75 MB) +
    // encoded buffer (~9 MB) + decoded array (~75 MB) = ~159 MB worst-case.
    expect(deltaMB).toBeLessThan(200);
  });
});

// ---------------------------------------------------------------------------
// 4. 200k formula cells — DAG section performance
// ---------------------------------------------------------------------------

describe('200k formula cells — DAG encode/decode performance', () => {

  let formulaSnap: WorksheetSnapshot;
  let formulaBuf:  Uint8Array;

  beforeAll(() => {
    formulaSnap = buildFormulaSnap(200_000);
    formulaBuf  = snapshotCodec.encode(formulaSnap);
  });

  it('encode 200k formula cells + 200k DAG edges completes in < 3000 ms', () => {
    const t0  = performance.now();
    const buf = snapshotCodec.encode(formulaSnap);
    const ms  = performance.now() - t0;
    console.log(`[stress] encode 200k formulas: ${ms.toFixed(1)} ms, ${(buf.byteLength / 1024 / 1024).toFixed(2)} MB`);
    expect(ms).toBeLessThan(3_000);
  });

  it('decode 200k formula cells + 200k DAG edges completes in < 3000 ms', () => {
    const t0   = performance.now();
    const snap = snapshotCodec.decode(formulaBuf);
    const ms   = performance.now() - t0;
    console.log(`[stress] decode 200k formulas: ${ms.toFixed(1)} ms`);
    expect(ms).toBeLessThan(3_000);
    expect(snap.dagEdges).toHaveLength(200_000);
  });

  it('formula strings survive round-trip at scale — spot-check row 50000', () => {
    const snap = snapshotCodec.decode(formulaBuf);
    const edge = snap.dagEdges[49_999]; // row = 50000
    expect(edge.row).toBe(50_000);
    expect(edge.deps).toHaveLength(1);
    expect(edge.deps[0].row).toBe(50_000);
    expect(edge.deps[0].col).toBe(1);
    // Formula cell
    const cell = snap.cells[49_999];
    expect(cell.cell.formula).toBe(`=A50000`);
  });

  it('DAG edge correctness spot-check — last edge (row 200000)', () => {
    const snap = snapshotCodec.decode(formulaBuf);
    const edge = snap.dagEdges[199_999];
    expect(edge.row).toBe(200_000);
    expect(edge.col).toBe(2);
    expect(edge.deps[0]).toEqual({ row: 200_000, col: 1 });
  });

  it('encoded 200k formula buffer has valid CRC32', () => {
    const view = new DataView(formulaBuf.buffer, formulaBuf.byteOffset, formulaBuf.byteLength);
    const stored  = view.getUint32(8, true);
    const copy    = formulaBuf.slice();
    new DataView(copy.buffer).setUint32(8, 0, true);
    expect(crc32(copy)).toBe(stored);
  });
});

// ---------------------------------------------------------------------------
// 5. Worksheet-level extractSnapshot + encode — end-to-end large sheet
// ---------------------------------------------------------------------------

describe('Worksheet extractSnapshot + encode (large sheet)', () => {

  it('extractSnapshot + encode for 10k cells + 5k formulas completes in < 500 ms', () => {
    const ws = new Worksheet('StressSheet');
    for (let row = 1; row <= 10_000; row++) {
      ws.setCellValue(addr(row, 1), row * 1.5);
    }
    for (let row = 1; row <= 5_000; row++) {
      ws.registerDependencies(addr(row, 2), [addr(row, 1)]);
    }

    const t0   = performance.now();
    const snap = ws.extractSnapshot();
    const buf  = snapshotCodec.encode(snap);
    const ms   = performance.now() - t0;

    console.log(`[stress] extractSnapshot + encode 10k cells + 5k formulas: ${ms.toFixed(1)} ms`);
    expect(ms).toBeLessThan(500);
    expect(snap.cells).toHaveLength(10_000);
    expect(snap.dagEdges).toHaveLength(5_000);
    expect(buf.byteLength).toBeGreaterThan(0);
  });

  it('applySnapshot on a large decoded snapshot restores all cells correctly', () => {
    const N = 5_000;
    const ws1 = new Worksheet('Source');
    for (let row = 1; row <= N; row++) {
      ws1.setCellValue(addr(row, 1), row);
    }

    const snap   = ws1.extractSnapshot();
    const buf    = snapshotCodec.encode(snap);
    const decoded = snapshotCodec.decode(buf);

    const ws2 = new Worksheet('Target');
    ws2.applySnapshot(decoded);

    // Spot-check 10 evenly spaced cells.
    for (let i = 0; i < 10; i++) {
      const row = Math.floor((i / 10) * N) + 1;
      expect(ws2.getCellValue(addr(row, 1))).toBe(row);
    }
  });
});
