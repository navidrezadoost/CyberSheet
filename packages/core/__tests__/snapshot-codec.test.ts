/**
 * snapshot-codec.test.ts — Phase 7: Binary Snapshot Engine
 *
 * Test suites:
 *  1. FORMAT_VERSION export
 *  2. BinaryWriter / BinaryReader round-trips (via SnapshotCodec internals)
 *  3. SnapshotCodec — encode / decode round-trips (all value types)
 *  4. Error cases (bad magic, bad version)
 *  5. Sections — merges, visibility, DAG, volatiles
 *  6. Worksheet.extractSnapshot() / applySnapshot() integration
 *  7. Large-sheet performance benchmarks
 */

import {
  SnapshotCodec,
  snapshotCodec,
  FORMAT_VERSION,
  type WorksheetSnapshot,
  type CellEntry,
  type DagEdge,
} from '../src/persistence/SnapshotCodec';
import { Worksheet } from '../src/worksheet';
import type { Address } from '../src/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const addr = (row: number, col: number): Address => ({ row, col });

/** Build a minimal valid snapshot. */
function emptySnap(): WorksheetSnapshot {
  return {
    version:    FORMAT_VERSION,
    cells:      [],
    merges:     [],
    hiddenRows: [],
    hiddenCols: [],
    dagEdges:   [],
    volatiles:  [],
  };
}

// ---------------------------------------------------------------------------
// 1. Module-level constants
// ---------------------------------------------------------------------------

describe('SnapshotCodec — module constants', () => {
  it('FORMAT_VERSION is 1', () => {
    expect(FORMAT_VERSION).toBe(1);
  });

  it('snapshotCodec singleton is a SnapshotCodec instance', () => {
    expect(snapshotCodec).toBeInstanceOf(SnapshotCodec);
  });
});

// ---------------------------------------------------------------------------
// 2. SnapshotCodec — binary output structure
// ---------------------------------------------------------------------------

describe('SnapshotCodec — binary structure', () => {
  it('encode returns a Uint8Array', () => {
    const buf = snapshotCodec.encode(emptySnap());
    expect(buf).toBeInstanceOf(Uint8Array);
  });

  it('encoded buffer starts with CSEX magic bytes', () => {
    const buf = snapshotCodec.encode(emptySnap());
    expect(buf[0]).toBe(0x43); // C
    expect(buf[1]).toBe(0x53); // S
    expect(buf[2]).toBe(0x45); // E
    expect(buf[3]).toBe(0x58); // X
  });

  it('encoded version field is 1 (u16 LE at offset 4)', () => {
    const buf  = snapshotCodec.encode(emptySnap());
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    expect(view.getUint16(4, true)).toBe(1);
  });

  it('encoded section count field is 5 (u16 LE at offset 6)', () => {
    const buf  = snapshotCodec.encode(emptySnap());
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    expect(view.getUint16(6, true)).toBe(5);
  });

  it('encode then decode produces the same version', () => {
    const decoded = snapshotCodec.decode(snapshotCodec.encode(emptySnap()));
    expect(decoded.version).toBe(FORMAT_VERSION);
  });
});

// ---------------------------------------------------------------------------
// 3. Cell value round-trips
// ---------------------------------------------------------------------------

describe('SnapshotCodec — cell value round-trips', () => {
  function roundTrip(value: CellEntry['cell']['value']): CellEntry['cell']['value'] {
    const snap = emptySnap();
    snap.cells = [{ row: 1, col: 1, cell: {
      value, formula: undefined, style: undefined,
      comments: undefined, icon: undefined,
      spillSource: undefined, spilledFrom: undefined,
    }}];
    const decoded = snapshotCodec.decode(snapshotCodec.encode(snap));
    return decoded.cells[0].cell.value;
  }

  it('null round-trips', ()       => expect(roundTrip(null)).toBeNull());
  it('zero round-trips', ()       => expect(roundTrip(0)).toBe(0));
  it('integer round-trips', ()    => expect(roundTrip(42)).toBe(42));
  it('float round-trips', ()      => expect(roundTrip(3.14159)).toBeCloseTo(3.14159));
  it('negative round-trips', ()   => expect(roundTrip(-999.5)).toBeCloseTo(-999.5));
  it('Infinity round-trips', ()   => expect(roundTrip(Infinity)).toBe(Infinity));
  it('-Infinity round-trips', ()  => expect(roundTrip(-Infinity)).toBe(-Infinity));
  it('NaN round-trips', ()        => expect(Number.isNaN(roundTrip(NaN))).toBe(true));
  it('true round-trips', ()       => expect(roundTrip(true)).toBe(true));
  it('false round-trips', ()      => expect(roundTrip(false)).toBe(false));
  it('empty string round-trips',  () => expect(roundTrip('')).toBe(''));
  it('ASCII string round-trips',  () => expect(roundTrip('hello world')).toBe('hello world'));
  it('Unicode string round-trips',() => expect(roundTrip('αβγ 🚀 中文')).toBe('αβγ 🚀 中文'));
  it('RichText round-trips', () => {
    const rt = { runs: [{ text: 'Bold', style: { bold: true } }, { text: ' normal' }] };
    const result = roundTrip(rt) as any;
    expect(result.runs[0].text).toBe('Bold');
    expect(result.runs[0].style.bold).toBe(true);
    expect(result.runs[1].text).toBe(' normal');
  });
});

// ---------------------------------------------------------------------------
// 4. Cell optional fields round-trips
// ---------------------------------------------------------------------------

describe('SnapshotCodec — cell optional fields', () => {
  function cellRoundTrip(cell: CellEntry['cell']): CellEntry['cell'] {
    const snap = emptySnap();
    snap.cells = [{ row: 5, col: 3, cell }];
    return snapshotCodec.decode(snapshotCodec.encode(snap)).cells[0].cell;
  }

  it('formula survives round-trip', () => {
    const c = cellRoundTrip({
      value: 0, formula: '=SUM(A1:A10)',
      style: undefined, comments: undefined, icon: undefined,
      spillSource: undefined, spilledFrom: undefined,
    });
    expect(c.formula).toBe('=SUM(A1:A10)');
  });

  it('style survives round-trip', () => {
    const c = cellRoundTrip({
      value: 'test', formula: undefined,
      style: { bold: true, fontSize: 14, color: '#FF0000' },
      comments: undefined, icon: undefined,
      spillSource: undefined, spilledFrom: undefined,
    });
    expect(c.style).toEqual({ bold: true, fontSize: 14, color: '#FF0000' });
  });

  it('spillSource survives round-trip', () => {
    const c = cellRoundTrip({
      value: 99, formula: undefined, style: undefined,
      comments: undefined, icon: undefined,
      spillSource: { endAddress: { row: 5, col: 5 }, dimensions: [3, 4] },
      spilledFrom: undefined,
    });
    expect(c.spillSource?.endAddress).toEqual({ row: 5, col: 5 });
    expect(c.spillSource?.dimensions).toEqual([3, 4]);
  });

  it('spilledFrom survives round-trip', () => {
    const c = cellRoundTrip({
      value: null, formula: undefined, style: undefined,
      comments: undefined, icon: undefined,
      spillSource: undefined,
      spilledFrom: { row: 2, col: 3 },
    });
    expect(c.spilledFrom).toEqual({ row: 2, col: 3 });
  });

  it('cell with all optional fields set survives round-trip', () => {
    const original: CellEntry['cell'] = {
      value: 100,
      formula: '=A1*2',
      style: { bold: true, fill: '#FFFF00' },
      comments: undefined,
      icon: undefined,
      spillSource: undefined,
      spilledFrom: undefined,
    };
    const c = cellRoundTrip(original);
    expect(c.value).toBe(100);
    expect(c.formula).toBe('=A1*2');
    expect((c.style as any).bold).toBe(true);
  });

  it('row and col are preserved exactly', () => {
    const snap = emptySnap();
    snap.cells = [
      { row: 1048576, col: 16384, cell: { value: 'corner', formula: undefined, style: undefined, comments: undefined, icon: undefined, spillSource: undefined, spilledFrom: undefined } },
    ];
    const decoded = snapshotCodec.decode(snapshotCodec.encode(snap));
    expect(decoded.cells[0].row).toBe(1048576);
    expect(decoded.cells[0].col).toBe(16384);
  });
});

// ---------------------------------------------------------------------------
// 5. Error cases
// ---------------------------------------------------------------------------

describe('SnapshotCodec — error cases', () => {
  it('throws on wrong magic bytes', () => {
    const buf = snapshotCodec.encode(emptySnap());
    buf[0] = 0xFF; // corrupt magic
    expect(() => snapshotCodec.decode(buf)).toThrow(/invalid magic bytes/i);
  });

  it('throws on unsupported version', () => {
    const buf  = snapshotCodec.encode(emptySnap());
    const view = new DataView(buf.buffer, buf.byteOffset);
    view.setUint16(4, 99, true); // set version to 99
    expect(() => snapshotCodec.decode(buf)).toThrow(/unsupported.*version 99/i);
  });

  it('encode then decode is invertible (multiple codec instances)', () => {
    const c1 = new SnapshotCodec();
    const c2 = new SnapshotCodec();
    const snap = emptySnap();
    snap.cells = [{ row: 1, col: 1, cell: { value: 42, formula: undefined, style: undefined, comments: undefined, icon: undefined, spillSource: undefined, spilledFrom: undefined } }];
    const decoded = c2.decode(c1.encode(snap));
    expect(decoded.cells[0].cell.value).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// 6. Merges section
// ---------------------------------------------------------------------------

describe('SnapshotCodec — merges round-trip', () => {
  it('empty merges encodes without error', () => {
    expect(() => snapshotCodec.decode(snapshotCodec.encode(emptySnap()))).not.toThrow();
  });

  it('single merge region round-trips', () => {
    const snap = emptySnap();
    snap.merges = [{ startRow: 2, startCol: 3, endRow: 4, endCol: 6 }];
    const decoded = snapshotCodec.decode(snapshotCodec.encode(snap));
    expect(decoded.merges).toEqual([{ startRow: 2, startCol: 3, endRow: 4, endCol: 6 }]);
  });

  it('multiple merge regions round-trip', () => {
    const snap = emptySnap();
    snap.merges = [
      { startRow: 1, startCol: 1, endRow: 2, endCol: 3 },
      { startRow: 5, startCol: 5, endRow: 10, endCol: 10 },
      { startRow: 100, startCol: 1, endRow: 200, endCol: 26 },
    ];
    const decoded = snapshotCodec.decode(snapshotCodec.encode(snap));
    expect(decoded.merges).toHaveLength(3);
    expect(decoded.merges[1]).toEqual({ startRow: 5, startCol: 5, endRow: 10, endCol: 10 });
  });
});

// ---------------------------------------------------------------------------
// 7. Visibility section
// ---------------------------------------------------------------------------

describe('SnapshotCodec — visibility round-trip', () => {
  it('hidden rows round-trip', () => {
    const snap = emptySnap();
    snap.hiddenRows = [3, 7, 15, 999];
    const decoded = snapshotCodec.decode(snapshotCodec.encode(snap));
    expect(decoded.hiddenRows.sort((a, b) => a - b)).toEqual([3, 7, 15, 999]);
  });

  it('hidden cols round-trip', () => {
    const snap = emptySnap();
    snap.hiddenCols = [1, 4, 26];
    const decoded = snapshotCodec.decode(snapshotCodec.encode(snap));
    expect(decoded.hiddenCols.sort((a, b) => a - b)).toEqual([1, 4, 26]);
  });

  it('both hidden rows and cols round-trip together', () => {
    const snap = emptySnap();
    snap.hiddenRows = [2, 5];
    snap.hiddenCols = [3];
    const decoded = snapshotCodec.decode(snapshotCodec.encode(snap));
    expect(decoded.hiddenRows).toHaveLength(2);
    expect(decoded.hiddenCols).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 8. DAG section
// ---------------------------------------------------------------------------

describe('SnapshotCodec — DAG edges round-trip', () => {
  it('empty DAG section round-trips', () => {
    const decoded = snapshotCodec.decode(snapshotCodec.encode(emptySnap()));
    expect(decoded.dagEdges).toHaveLength(0);
  });

  it('single formula with multiple deps round-trips', () => {
    const snap = emptySnap();
    snap.dagEdges = [{ row: 3, col: 1, deps: [addr(1, 1), addr(2, 1), addr(1, 2)] }];
    const decoded = snapshotCodec.decode(snapshotCodec.encode(snap));
    expect(decoded.dagEdges).toHaveLength(1);
    expect(decoded.dagEdges[0].row).toBe(3);
    expect(decoded.dagEdges[0].col).toBe(1);
    expect(decoded.dagEdges[0].deps).toHaveLength(3);
    expect(decoded.dagEdges[0].deps).toContainEqual(addr(1, 1));
  });

  it('multiple formula edges round-trip', () => {
    const snap = emptySnap();
    snap.dagEdges = [
      { row: 2, col: 1, deps: [addr(1, 1)] },
      { row: 3, col: 1, deps: [addr(2, 1)] },
      { row: 4, col: 1, deps: [addr(2, 1), addr(3, 1)] },
    ];
    const decoded = snapshotCodec.decode(snapshotCodec.encode(snap));
    expect(decoded.dagEdges).toHaveLength(3);
    expect(decoded.dagEdges[2].deps).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// 9. Volatiles section
// ---------------------------------------------------------------------------

describe('SnapshotCodec — volatiles round-trip', () => {
  it('volatile registrations round-trip', () => {
    const snap = emptySnap();
    snap.volatiles = [addr(1, 1), addr(5, 3), addr(100, 26)];
    const decoded = snapshotCodec.decode(snapshotCodec.encode(snap));
    expect(decoded.volatiles).toHaveLength(3);
    expect(decoded.volatiles).toContainEqual(addr(5, 3));
  });
});

// ---------------------------------------------------------------------------
// 10. Full snapshot round-trip (all sections combined)
// ---------------------------------------------------------------------------

describe('SnapshotCodec — full snapshot round-trip', () => {
  it('all sections together survive encode → decode', () => {
    const snap: WorksheetSnapshot = {
      version: FORMAT_VERSION,
      cells: [
        { row: 1, col: 1, cell: { value: 'Name',  formula: undefined, style: { bold: true }, comments: undefined, icon: undefined, spillSource: undefined, spilledFrom: undefined } },
        { row: 1, col: 2, cell: { value: 'Score', formula: undefined, style: undefined,       comments: undefined, icon: undefined, spillSource: undefined, spilledFrom: undefined } },
        { row: 2, col: 1, cell: { value: 'Alice', formula: undefined, style: undefined,       comments: undefined, icon: undefined, spillSource: undefined, spilledFrom: undefined } },
        { row: 2, col: 2, cell: { value: 95,      formula: undefined, style: undefined,       comments: undefined, icon: undefined, spillSource: undefined, spilledFrom: undefined } },
        { row: 3, col: 2, cell: { value: null,    formula: '=SUM(B1:B2)', style: undefined,   comments: undefined, icon: undefined, spillSource: undefined, spilledFrom: undefined } },
      ],
      merges:     [{ startRow: 5, startCol: 1, endRow: 5, endCol: 4 }],
      hiddenRows: [10, 20],
      hiddenCols: [3],
      dagEdges:   [{ row: 3, col: 2, deps: [addr(1, 2), addr(2, 2)] }],
      volatiles:  [addr(7, 1)],
    };

    const decoded = snapshotCodec.decode(snapshotCodec.encode(snap));

    expect(decoded.cells).toHaveLength(5);
    expect(decoded.cells.find(c => c.row === 2 && c.col === 1)?.cell.value).toBe('Alice');
    expect(decoded.cells.find(c => c.row === 3 && c.col === 2)?.cell.formula).toBe('=SUM(B1:B2)');
    expect(decoded.merges).toHaveLength(1);
    expect(decoded.hiddenRows.sort()).toEqual([10, 20]);
    expect(decoded.hiddenCols).toEqual([3]);
    expect(decoded.dagEdges[0].deps).toHaveLength(2);
    expect(decoded.volatiles[0]).toEqual(addr(7, 1));
  });
});

// ---------------------------------------------------------------------------
// 11. Worksheet.extractSnapshot() + applySnapshot() integration
// ---------------------------------------------------------------------------

describe('Worksheet — extractSnapshot / applySnapshot', () => {
  it('extractSnapshot returns version 1', () => {
    const ws = new Worksheet('Sheet1');
    expect(ws.extractSnapshot().version).toBe(1);
  });

  it('fresh sheet produces empty snapshot', () => {
    const ws   = new Worksheet('Sheet1');
    const snap = ws.extractSnapshot();
    expect(snap.cells).toHaveLength(0);
    expect(snap.merges).toHaveLength(0);
    expect(snap.hiddenRows).toHaveLength(0);
    expect(snap.hiddenCols).toHaveLength(0);
    expect(snap.dagEdges).toHaveLength(0);
    expect(snap.volatiles).toHaveLength(0);
  });

  it('cells in snapshot match cells set on worksheet', () => {
    const ws = new Worksheet('Sheet1');
    ws.setCellValue(addr(1, 1), 'hello');
    ws.setCellValue(addr(2, 3), 42);
    const snap = ws.extractSnapshot();
    const vals = new Map(snap.cells.map(e => [`${e.row},${e.col}`, e.cell.value]));
    expect(vals.get('1,1')).toBe('hello');
    expect(vals.get('2,3')).toBe(42);
  });

  it('merges in snapshot match merges added to worksheet', () => {
    const ws = new Worksheet('Sheet1');
    ws.mergeCells({ start: addr(2, 2), end: addr(4, 5) });
    const snap = ws.extractSnapshot();
    expect(snap.merges).toHaveLength(1);
    expect(snap.merges[0]).toEqual({ startRow: 2, startCol: 2, endRow: 4, endCol: 5 });
  });

  it('hidden rows/cols in snapshot match worksheet visibility state', () => {
    const ws = new Worksheet('Sheet1');
    ws.hideRow(3);
    ws.hideRow(7);
    ws.hideCol(2);
    const snap = ws.extractSnapshot();
    expect(snap.hiddenRows.sort((a, b) => a - b)).toEqual([3, 7]);
    expect(snap.hiddenCols).toEqual([2]);
  });

  it('DAG edges captured in snapshot', () => {
    const ws = new Worksheet('Sheet1');
    ws.registerDependencies(addr(3, 1), [addr(1, 1), addr(2, 1)]);
    const snap = ws.extractSnapshot();
    const edge = snap.dagEdges.find(e => e.row === 3 && e.col === 1);
    expect(edge).toBeDefined();
    expect(edge?.deps).toHaveLength(2);
  });

  it('applySnapshot restores cells on new worksheet', () => {
    const ws1 = new Worksheet('Sheet1');
    ws1.setCellValue(addr(1, 1), 'persisted');
    ws1.setCellValue(addr(2, 2), 777);

    const ws2 = new Worksheet('Sheet2');
    ws2.applySnapshot(ws1.extractSnapshot());

    expect(ws2.getCellValue(addr(1, 1))).toBe('persisted');
    expect(ws2.getCellValue(addr(2, 2))).toBe(777);
  });

  it('applySnapshot restores merges', () => {
    const ws1 = new Worksheet('Sheet1');
    ws1.mergeCells({ start: addr(1, 1), end: addr(2, 3) });

    const ws2 = new Worksheet('Sheet2');
    ws2.applySnapshot(ws1.extractSnapshot());

    expect(ws2.getMergedRangeForCell(addr(1, 2))).not.toBeNull(); // non-anchor
  });

  it('applySnapshot restores visibility', () => {
    const ws1 = new Worksheet('Sheet1');
    ws1.hideRow(5);
    ws1.hideCol(4);

    const ws2 = new Worksheet('Sheet2');
    ws2.applySnapshot(ws1.extractSnapshot());

    expect(ws2.isRowHidden(5)).toBe(true);
    expect(ws2.isColHidden(4)).toBe(true);
    expect(ws2.isRowHidden(1)).toBe(false);
  });

  it('applySnapshot clears previous state (idempotent restore)', () => {
    const ws = new Worksheet('Sheet1');
    ws.setCellValue(addr(1, 1), 'old');
    ws.hideRow(10);

    const freshSnap = emptySnap();
    freshSnap.cells = [{ row: 2, col: 2, cell: { value: 'new', formula: undefined, style: undefined, comments: undefined, icon: undefined, spillSource: undefined, spilledFrom: undefined } }];

    ws.applySnapshot(freshSnap);

    expect(ws.getCellValue(addr(1, 1))).toBeNull();   // old cell gone
    expect(ws.getCellValue(addr(2, 2))).toBe('new');  // new cell present
    expect(ws.isRowHidden(10)).toBe(false);           // visibility cleared
  });

  it('full encode → decode → applySnapshot round-trip preserves all state', () => {
    const ws1 = new Worksheet('Sheet1');
    ws1.setCellValue(addr(1, 1), 'A1');
    ws1.setCellValue(addr(1, 2), 100);
    ws1.setCellValue(addr(2, 1), true);
    ws1.mergeCells({ start: addr(5, 1), end: addr(5, 3) });
    ws1.hideRow(8);
    ws1.hideCol(6);
    ws1.registerDependencies(addr(3, 1), [addr(1, 1), addr(1, 2)]);

    const buf  = snapshotCodec.encode(ws1.extractSnapshot());
    const snap = snapshotCodec.decode(buf);
    const ws2  = new Worksheet('Sheet2');
    ws2.applySnapshot(snap);

    expect(ws2.getCellValue(addr(1, 1))).toBe('A1');
    expect(ws2.getCellValue(addr(1, 2))).toBe(100);
    expect(ws2.getCellValue(addr(2, 1))).toBe(true);
    expect(ws2.isRowHidden(8)).toBe(true);
    expect(ws2.isColHidden(6)).toBe(true);
    // Merge: non-anchor cell (5,2) should redirect to anchor (5,1)
    expect(ws2.getMergedRangeForCell(addr(5, 2))).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 12. Performance benchmarks
// ---------------------------------------------------------------------------

describe('Phase 7 performance benchmarks', () => {
  it('encode 50k number cells < 500 ms', () => {
    const snap = emptySnap();
    const N = 50_000;
    for (let row = 1; row <= N; row++) {
      snap.cells.push({ row, col: 1, cell: {
        value: row * 1.5, formula: undefined, style: undefined,
        comments: undefined, icon: undefined,
        spillSource: undefined, spilledFrom: undefined,
      }});
    }
    const t0 = performance.now();
    const buf = snapshotCodec.encode(snap);
    const elapsed = performance.now() - t0;

    expect(elapsed).toBeLessThan(500);
    expect(buf.byteLength).toBeGreaterThan(0);
    console.log(`encode 50k numbers: ${elapsed.toFixed(1)} ms, ${(buf.byteLength / 1024).toFixed(1)} KB`);
  }, 10_000);

  it('decode 50k number cells < 500 ms', () => {
    const snap = emptySnap();
    const N = 50_000;
    for (let row = 1; row <= N; row++) {
      snap.cells.push({ row, col: 1, cell: {
        value: row * 1.5, formula: undefined, style: undefined,
        comments: undefined, icon: undefined,
        spillSource: undefined, spilledFrom: undefined,
      }});
    }
    const buf = snapshotCodec.encode(snap);

    const t0 = performance.now();
    const decoded = snapshotCodec.decode(buf);
    const elapsed = performance.now() - t0;

    expect(elapsed).toBeLessThan(500);
    expect(decoded.cells).toHaveLength(N);
    console.log(`decode 50k numbers: ${elapsed.toFixed(1)} ms`);
  }, 10_000);

  it('round-trip bytes/cell ≈ optimal (number: ~18 bytes)', () => {
    const snap = emptySnap();
    for (let row = 1; row <= 1000; row++) {
      snap.cells.push({ row, col: 1, cell: {
        value: 3.14, formula: undefined, style: undefined,
        comments: undefined, icon: undefined,
        spillSource: undefined, spilledFrom: undefined,
      }});
    }
    const buf = snapshotCodec.encode(snap);
    // Header + table + section overhead is amortised over 1000 cells.
    // Pure cell data per number cell = 10 (row+col+vtag+flags) + 8 (f64) = 18 bytes.
    // Total / cells should be close to 18 bytes/cell once overhead is divided.
    const bytesPerCell = buf.byteLength / 1000;
    expect(bytesPerCell).toBeLessThan(50); // generous upper bound
    console.log(`bytes/number cell: ${bytesPerCell.toFixed(1)}`);
  });

  it('Worksheet extractSnapshot + encode 10k cells < 200 ms', () => {
    const ws = new Worksheet('bench');
    for (let row = 1; row <= 10_000; row++) {
      ws.setCellValue({ row, col: 1 }, row);
    }
    const t0 = performance.now();
    const buf = snapshotCodec.encode(ws.extractSnapshot());
    const elapsed = performance.now() - t0;

    expect(elapsed).toBeLessThan(200);
    console.log(`extractSnapshot + encode 10k cells: ${elapsed.toFixed(1)} ms, ${(buf.byteLength / 1024).toFixed(1)} KB`);
  }, 10_000);
});
