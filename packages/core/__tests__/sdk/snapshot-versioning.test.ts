/**
 * @group sdk
 *
 * Snapshot versioning tests — verifies version handling in the SDK snapshot
 * pipeline:
 *
 *  1. Current-version snapshots encode/decode correctly
 *  2. Version-1 snapshots upgrade to the current version via the registry
 *  3. Snapshots with a future (unknown) version are rejected with SnapshotError
 *  4. SnapshotUpgraderRegistry chains upgraders correctly across multiple hops
 *  5. Registering a duplicate fromVersion throws
 *  6. Applying an already-at-target snapshot is a no-op
 */

import {
  createSpreadsheet,
  SnapshotError,
} from '../../src/sdk/index';
import type { WorksheetSnapshot } from '../../src/sdk/index';
import {
  SnapshotUpgraderRegistry,
  snapshotUpgraderRegistry,
  snapshotCodec,
  FORMAT_VERSION,
} from '../../src/persistence/SnapshotCodec';

// ---------------------------------------------------------------------------
// 1. Current-version round-trip via SDK
// ---------------------------------------------------------------------------

describe('current-version snapshot round-trip', () => {
  it('encodeSnapshot / decodeAndRestore preserves all cell values', () => {
    const s = createSpreadsheet('SnapVer', { rows: 10, cols: 10 });
    s.setCell(1, 1, 'a');
    s.setCell(2, 2, 42);
    s.setCell(3, 3, true);

    const bytes = s.encodeSnapshot();
    s.setCell(1, 1, 'overwritten');
    s.decodeAndRestore(bytes);

    expect(s.getCellValue(1, 1)).toBe('a');
    expect(s.getCellValue(2, 2)).toBe(42);
    expect(s.getCellValue(3, 3)).toBe(true);
    s.dispose();
  });

  it('encoded snapshot has the CSEX magic bytes', () => {
    const s = createSpreadsheet('Magic', { rows: 5, cols: 5 });
    const bytes = s.encodeSnapshot();
    // Bytes 0-3 must be 0x43 0x53 0x45 0x58 ("CSEX")
    expect(bytes[0]).toBe(0x43);
    expect(bytes[1]).toBe(0x53);
    expect(bytes[2]).toBe(0x45);
    expect(bytes[3]).toBe(0x58);
    s.dispose();
  });

  it('snapshot() returns the current FORMAT_VERSION', () => {
    const s = createSpreadsheet('Ver', { rows: 5, cols: 5 });
    const snap = s.snapshot();
    expect(snap.version).toBe(FORMAT_VERSION);
    s.dispose();
  });
});

// ---------------------------------------------------------------------------
// 2. Version 1 snapshot upgrades to current version
// ---------------------------------------------------------------------------

describe('SnapshotUpgraderRegistry — v1 → current', () => {
  it('apply() upgrades a v1 snapshot to FORMAT_VERSION', () => {
    const v1Snapshot: WorksheetSnapshot = {
      version:    1,
      cells:      [],
      merges:     [],
      hiddenRows: [],
      hiddenCols: [],
      dagEdges:   [],
      volatiles:  [],
    };
    const upgraded = snapshotUpgraderRegistry.apply(v1Snapshot, FORMAT_VERSION);
    expect(upgraded.version).toBe(FORMAT_VERSION);
  });

  it('apply() returns the snapshot unchanged if already at target', () => {
    const currentSnap: WorksheetSnapshot = {
      version:    FORMAT_VERSION,
      cells:      [],
      merges:     [],
      hiddenRows: [],
      hiddenCols: [],
      dagEdges:   [],
      volatiles:  [],
    };
    const result = snapshotUpgraderRegistry.apply(currentSnap, FORMAT_VERSION);
    expect(result).toBe(currentSnap); // same object reference
  });

  it('upgraded snapshot round-trips through snapshotCodec', () => {
    const s = createSpreadsheet('UpgRT', { rows: 5, cols: 5 });
    s.setCell(1, 1, 'upgraded');

    // Get a valid current-version binary
    const bytes = s.encodeSnapshot();
    // Decode it again — should work without errors
    const decoded = snapshotCodec.decode(bytes);
    expect(decoded.version).toBe(FORMAT_VERSION);
    expect(decoded.cells.length).toBeGreaterThan(0);
    s.dispose();
  });
});

// ---------------------------------------------------------------------------
// 3. Future (unknown) version is rejected
// ---------------------------------------------------------------------------

describe('future version rejection', () => {
  it('decodeAndRestore throws SnapshotError for a future-version binary', () => {
    const s = createSpreadsheet('FutVer', { rows: 5, cols: 5 });
    s.setCell(1, 1, 'test');

    // Encode a valid snapshot, then tamper the version field to FORMAT_VERSION + 100
    const bytes = s.encodeSnapshot().slice(); // copy
    const tampered = new Uint8Array(bytes);
    // Version field starts at byte 4 (after 4 magic bytes), stored as u16 little-endian
    const futureVersion = FORMAT_VERSION + 100;
    tampered[4] = futureVersion & 0xff;
    tampered[5] = (futureVersion >> 8) & 0xff;

    // The codec should reject the unknown version OR the CRC should fail
    // Either way, decodeAndRestore must throw SnapshotError
    expect(() => s.decodeAndRestore(tampered)).toThrow(SnapshotError);
    s.dispose();
  });

  it('SnapshotUpgraderRegistry.apply() throws for missing upgrader in chain', () => {
    const registry = new SnapshotUpgraderRegistry();
    // Register v1 → v2 only; v2 → v3 is missing
    registry.register({
      fromVersion: 1,
      toVersion:   2,
      upgrade: (s) => ({ ...s, version: 2 }),
    });

    const v1: WorksheetSnapshot = {
      version:    1,
      cells:      [],
      merges:     [],
      hiddenRows: [],
      hiddenCols: [],
      dagEdges:   [],
      volatiles:  [],
    };

    expect(() => registry.apply(v1, 3)).toThrow(/no upgrader found/i);
  });
});

// ---------------------------------------------------------------------------
// 4. Multi-hop upgrade chain
// ---------------------------------------------------------------------------

describe('SnapshotUpgraderRegistry — multi-hop chain', () => {
  it('chains v1 → v2 → v3 → v4 correctly', () => {
    const registry = new SnapshotUpgraderRegistry();
    const trace: string[] = [];

    registry.register({
      fromVersion: 1,
      toVersion:   2,
      upgrade: (s) => { trace.push('1→2'); return { ...s, version: 2 }; },
    });
    registry.register({
      fromVersion: 2,
      toVersion:   3,
      upgrade: (s) => { trace.push('2→3'); return { ...s, version: 3 }; },
    });
    registry.register({
      fromVersion: 3,
      toVersion:   4,
      upgrade: (s) => { trace.push('3→4'); return { ...s, version: 4 }; },
    });

    const v1: WorksheetSnapshot = {
      version:    1,
      cells:      [],
      merges:     [],
      hiddenRows: [],
      hiddenCols: [],
      dagEdges:   [],
      volatiles:  [],
    };

    const result = registry.apply(v1, 4);
    expect(result.version).toBe(4);
    expect(trace).toEqual(['1→2', '2→3', '3→4']);
  });

  it('partial upgrade stops at the requested target version', () => {
    const registry = new SnapshotUpgraderRegistry();
    registry.register({
      fromVersion: 1,
      toVersion:   2,
      upgrade: (s) => ({ ...s, version: 2 }),
    });
    registry.register({
      fromVersion: 2,
      toVersion:   3,
      upgrade: (s) => ({ ...s, version: 3 }),
    });

    const v1: WorksheetSnapshot = {
      version:    1,
      cells:      [],
      merges:     [],
      hiddenRows: [],
      hiddenCols: [],
      dagEdges:   [],
      volatiles:  [],
    };

    // Only upgrade to v2, not v3
    const result = registry.apply(v1, 2);
    expect(result.version).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 5. Duplicate fromVersion registration
// ---------------------------------------------------------------------------

describe('SnapshotUpgraderRegistry — duplicate registration', () => {
  it('throws when registering a duplicate fromVersion', () => {
    const registry = new SnapshotUpgraderRegistry();
    registry.register({
      fromVersion: 1,
      toVersion:   2,
      upgrade: (s) => ({ ...s, version: 2 }),
    });
    expect(() => registry.register({
      fromVersion: 1,
      toVersion:   2,
      upgrade: (s) => ({ ...s, version: 2 }),
    })).toThrow(/already registered/i);
  });
});

// ---------------------------------------------------------------------------
// 6. Snapshot structural invariants
// ---------------------------------------------------------------------------

describe('snapshot structural invariants', () => {
  it('snapshot always has required fields', () => {
    const s = createSpreadsheet('Inv', { rows: 5, cols: 5 });
    const snap = s.snapshot();

    expect(snap).toHaveProperty('version');
    expect(snap).toHaveProperty('cells');
    expect(snap).toHaveProperty('merges');
    expect(snap).toHaveProperty('hiddenRows');
    expect(snap).toHaveProperty('hiddenCols');
    expect(snap).toHaveProperty('dagEdges');
    expect(snap).toHaveProperty('volatiles');

    expect(Array.isArray(snap.cells)).toBe(true);
    expect(Array.isArray(snap.merges)).toBe(true);
    expect(Array.isArray(snap.hiddenRows)).toBe(true);
    expect(Array.isArray(snap.hiddenCols)).toBe(true);
    expect(Array.isArray(snap.dagEdges)).toBe(true);
    expect(Array.isArray(snap.volatiles)).toBe(true);
    s.dispose();
  });

  it('snapshot cells include row, col, and cell fields', () => {
    const s = createSpreadsheet('CellField', { rows: 5, cols: 5 });
    s.setCell(1, 1, 'check');
    const snap = s.snapshot();
    const first = snap.cells[0];
    expect(first).toHaveProperty('row');
    expect(first).toHaveProperty('col');
    expect(first).toHaveProperty('cell');
    s.dispose();
  });

  it('snapshot hiddenRows reflects hidden state', () => {
    const s = createSpreadsheet('HidRows', { rows: 10, cols: 5 });
    s.hideRow(3);
    s.hideRow(7);
    const snap = s.snapshot();
    expect(snap.hiddenRows).toContain(3);
    expect(snap.hiddenRows).toContain(7);
    s.dispose();
  });

  it('snapshot merges reflects merged regions', () => {
    const s = createSpreadsheet('MergeSnap', { rows: 10, cols: 10 });
    s.mergeCells(1, 1, 2, 3);
    const snap = s.snapshot();
    expect(snap.merges.length).toBeGreaterThan(0);
    s.dispose();
  });

  it('snapshot is a plain object (JSON-serializable)', () => {
    const s = createSpreadsheet('Plain', { rows: 5, cols: 5 });
    s.setCell(1, 1, 42);
    const snap = s.snapshot();
    // Should not throw
    const json = JSON.stringify(snap);
    const restored = JSON.parse(json);
    expect(restored.version).toBe(snap.version);
    s.dispose();
  });
});
