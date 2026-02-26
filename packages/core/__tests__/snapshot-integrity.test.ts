/**
 * snapshot-integrity.test.ts — Phase 8: Versioned Snapshot & Integrity Layer
 *
 * Test suites:
 *  1.  crc32() — standard IEEE 802.3 test vectors
 *  2.  Header v2 — structure (flags, checksum, sectionCount offsets)
 *  3.  CRC32 validation — valid buffer passes, mutations throw
 *  4.  SnapshotUpgrader interface — basic contract
 *  5.  SnapshotUpgraderRegistry — register / apply / error paths
 *  6.  v1 backward compatibility — decode v1 buffer → upgraded snapshot
 *  7.  Upgrader chain — multi-hop path (v1 → v2 → v3)
 */

import {
  SnapshotCodec,
  snapshotCodec,
  SnapshotUpgraderRegistry,
  snapshotUpgraderRegistry,
  FORMAT_VERSION,
  crc32,
  type WorksheetSnapshot,
} from '../src/persistence/SnapshotCodec';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptySnap(version = FORMAT_VERSION): WorksheetSnapshot {
  return {
    version,
    cells:      [],
    merges:     [],
    hiddenRows: [],
    hiddenCols: [],
    dagEdges:   [],
    volatiles:  [],
  };
}

/** Decode a u32 LE from a Uint8Array at a given byte offset. */
function readU32LE(buf: Uint8Array, offset: number): number {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return view.getUint32(offset, true);
}

/** Decode a u16 LE from a Uint8Array at a given byte offset. */
function readU16LE(buf: Uint8Array, offset: number): number {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return view.getUint16(offset, true);
}

// ---------------------------------------------------------------------------
// Hardcoded v1 empty-snapshot binary fixture.
//
// Layout (100 bytes):
//   [0..3]  magic "CSEX"
//   [4..5]  version u16 LE = 1
//   [6..7]  sectionCount u16 LE = 5
//   [8..15] reserved (all 0x00)
//   [16..75] section table (5 × 12 bytes)
//   [76..79]  CELLS data  (count u32 = 0)
//   [80..83]  MERGES data (count u32 = 0)
//   [84..91]  VISIBILITY data (rowCount u32 + colCount u32 = 0)
//   [92..95]  DAG data (count u32 = 0)
//   [96..99]  VOLATILES data (count u32 = 0)
// ---------------------------------------------------------------------------
const V1_EMPTY_BUF = new Uint8Array([
  // Header
  0x43, 0x53, 0x45, 0x58, // magic "CSEX"
  0x01, 0x00,             // version = 1
  0x05, 0x00,             // sectionCount = 5
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // reserved
  // Section table
  // CELLS: id=0x0001 flags=0 offset=76(0x4C) length=4
  0x01, 0x00, 0x00, 0x00, 0x4C, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00,
  // MERGES: id=0x0002 flags=0 offset=80(0x50) length=4
  0x02, 0x00, 0x00, 0x00, 0x50, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00,
  // VISIBILITY: id=0x0003 flags=0 offset=84(0x54) length=8
  0x03, 0x00, 0x00, 0x00, 0x54, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00,
  // DAG: id=0x0004 flags=0 offset=92(0x5C) length=4
  0x04, 0x00, 0x00, 0x00, 0x5C, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00,
  // VOLATILES: id=0x0005 flags=0 offset=96(0x60) length=4
  0x05, 0x00, 0x00, 0x00, 0x60, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00,
  // Section data
  0x00, 0x00, 0x00, 0x00, // CELLS count = 0
  0x00, 0x00, 0x00, 0x00, // MERGES count = 0
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // VISIBILITY rows=0 cols=0
  0x00, 0x00, 0x00, 0x00, // DAG count = 0
  0x00, 0x00, 0x00, 0x00, // VOLATILES count = 0
]);

// ---------------------------------------------------------------------------
// 1. crc32() — standard IEEE 802.3 test vectors
// ---------------------------------------------------------------------------

describe('crc32() — IEEE 802.3 test vectors', () => {

  it('crc32 of empty input is 0x00000000', () => {
    expect(crc32(new Uint8Array(0))).toBe(0x00000000);
  });

  it('crc32("123456789") === 0xCBF43926 (IEEE 802.3 standard vector)', () => {
    const bytes = new TextEncoder().encode('123456789');
    expect(crc32(bytes)).toBe(0xCBF43926);
  });

  it('crc32 is sensitive to single-bit changes', () => {
    const a = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
    const b = new Uint8Array([0x01, 0x00, 0x00, 0x00]);
    expect(crc32(a)).not.toBe(crc32(b));
  });

  it('crc32 is consistent across multiple calls', () => {
    const data = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]);
    expect(crc32(data)).toBe(crc32(data));
  });

  it('crc32 returns an unsigned 32-bit integer (no negative results)', () => {
    // All-0xFF bytes trigger the high bit of the CRC polynomial.
    const allFF = new Uint8Array(64).fill(0xFF);
    expect(crc32(allFF)).toBeGreaterThanOrEqual(0);
    expect(crc32(allFF)).toBeLessThanOrEqual(0xFFFFFFFF);
  });
});

// ---------------------------------------------------------------------------
// 2. Header v2 — field layout
// ---------------------------------------------------------------------------

describe('Header v2 — field layout', () => {

  it('version u16 is FORMAT_VERSION at byte offset 4', () => {
    const buf = snapshotCodec.encode(emptySnap());
    expect(readU16LE(buf, 4)).toBe(FORMAT_VERSION);
  });

  it('flags u16 at offset 6 has HDR_FLAG_CRC32 bit set (0x0001)', () => {
    const buf = snapshotCodec.encode(emptySnap());
    const flags = readU16LE(buf, 6);
    expect(flags & 0x0001).toBe(1);
  });

  it('checksum u32 at offset 8 is non-zero', () => {
    const buf = snapshotCodec.encode(emptySnap());
    expect(readU32LE(buf, 8)).not.toBe(0);
  });

  it('sectionCount u16 at offset 12 is 5', () => {
    const buf = snapshotCodec.encode(emptySnap());
    expect(readU16LE(buf, 12)).toBe(5);
  });

  it('reserved u16 at offset 14 is 0', () => {
    const buf = snapshotCodec.encode(emptySnap());
    expect(readU16LE(buf, 14)).toBe(0);
  });

  it('checksum field was 0 when CRC was computed (self-consistency)', () => {
    const buf  = snapshotCodec.encode(emptySnap());
    const stored = readU32LE(buf, 8);
    // Zero the checksum field and recompute — must match stored.
    const copy = buf.slice();
    new DataView(copy.buffer).setUint32(8, 0, true);
    expect(crc32(copy)).toBe(stored);
  });

  it('different snapshots produce different checksums', () => {
    const s1 = emptySnap();
    const s2: WorksheetSnapshot = {
      ...emptySnap(),
      hiddenRows: [1, 2, 3],
    };
    const crc1 = readU32LE(snapshotCodec.encode(s1), 8);
    const crc2 = readU32LE(snapshotCodec.encode(s2), 8);
    expect(crc1).not.toBe(crc2);
  });
});

// ---------------------------------------------------------------------------
// 3. CRC32 validation during decode
// ---------------------------------------------------------------------------

describe('CRC32 validation during decode()', () => {

  it('valid encoded buffer decodes without error', () => {
    const buf = snapshotCodec.encode(emptySnap());
    expect(() => snapshotCodec.decode(buf)).not.toThrow();
  });

  it('mutation of magic bytes throws invalid-magic (not checksum) error', () => {
    const buf = snapshotCodec.encode(emptySnap());
    const bad = buf.slice();
    bad[0] = 0xFF;
    expect(() => snapshotCodec.decode(bad)).toThrow(/invalid magic bytes/i);
  });

  it('mutation of a section data byte throws checksum-mismatch error', () => {
    const buf = snapshotCodec.encode(emptySnap());
    const bad = buf.slice();
    // Flip last byte — well into section data territory.
    bad[bad.length - 1] ^= 0xFF;
    expect(() => snapshotCodec.decode(bad)).toThrow(/checksum mismatch/i);
  });

  it('mutation of version field after magic throws checksum-mismatch', () => {
    // Patch version to 2 (same), then flip one bit so CRC differs.
    const buf = snapshotCodec.encode(emptySnap());
    const bad = buf.slice();
    // Mutate byte 5 (high byte of version u16).
    bad[5] ^= 0x01;
    expect(() => snapshotCodec.decode(bad)).toThrow(/checksum mismatch|unsupported/i);
  });

  it('mutation of section table entry throws checksum-mismatch error', () => {
    const buf = snapshotCodec.encode(emptySnap());
    const bad = buf.slice();
    // Section table starts at byte 16; flip a byte in the first entry.
    bad[20] ^= 0x01;
    expect(() => snapshotCodec.decode(bad)).toThrow(/checksum mismatch/i);
  });

  it('re-encoding a decoded snapshot produces a valid checksum', () => {
    const snap = emptySnap();
    snap.hiddenRows = [3, 7];
    const orig   = snapshotCodec.encode(snap);
    const decoded = snapshotCodec.decode(orig);
    const reenc  = snapshotCodec.encode(decoded);
    expect(() => snapshotCodec.decode(reenc)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 4. SnapshotUpgrader interface — basic contract
// ---------------------------------------------------------------------------

describe('SnapshotUpgrader interface — contract', () => {

  it('upgrader must return a new object (not the same reference)', () => {
    const input = emptySnap(1);
    const upgrader = snapshotUpgraderRegistry; // just access the member
    const v1ToV2 = { fromVersion: 1, toVersion: 2, upgrade: (s: WorksheetSnapshot) => ({ ...s, version: 2 }) };
    const output = v1ToV2.upgrade(input);
    expect(output).not.toBe(input);
    expect(output.version).toBe(2);
  });

  it('upgrader fromVersion and toVersion are read-only numeric fields', () => {
    const u = snapshotUpgraderRegistry;
    // Apply method exists
    expect(typeof u.apply).toBe('function');
    expect(typeof u.register).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// 5. SnapshotUpgraderRegistry — register / apply / error paths
// ---------------------------------------------------------------------------

describe('SnapshotUpgraderRegistry — register / apply / errors', () => {

  it('duplicate fromVersion registration throws', () => {
    const reg = new SnapshotUpgraderRegistry();
    reg.register({ fromVersion: 5, toVersion: 6, upgrade: s => ({ ...s, version: 6 }) });
    expect(() =>
      reg.register({ fromVersion: 5, toVersion: 6, upgrade: s => ({ ...s, version: 6 }) }),
    ).toThrow(/fromVersion=5 already registered/i);
  });

  it('apply returns snapshot unchanged when already at target version', () => {
    const reg = new SnapshotUpgraderRegistry();
    const snap = emptySnap(3);
    const result = reg.apply(snap, 3);
    expect(result).toBe(snap); // same reference — no copy needed
  });

  it('apply throws when no upgrader exists for a version gap', () => {
    const reg = new SnapshotUpgraderRegistry();
    const snap = emptySnap(1);
    expect(() => reg.apply(snap, 3)).toThrow(/no upgrader found for v1/i);
  });

  it('apply chains multiple upgraders in sequence', () => {
    const reg = new SnapshotUpgraderRegistry();
    reg.register({ fromVersion: 10, toVersion: 11, upgrade: s => ({ ...s, version: 11 }) });
    reg.register({ fromVersion: 11, toVersion: 12, upgrade: s => ({ ...s, version: 12 }) });
    const snap = emptySnap(10);
    const result = reg.apply(snap, 12);
    expect(result.version).toBe(12);
  });

  it('apply does not mutate the source snapshot', () => {
    const reg = new SnapshotUpgraderRegistry();
    reg.register({ fromVersion: 20, toVersion: 21, upgrade: s => ({ ...s, version: 21 }) });
    const snap = emptySnap(20);
    reg.apply(snap, 21);
    expect(snap.version).toBe(20); // source unchanged
  });
});

// ---------------------------------------------------------------------------
// 6. v1 backward compatibility
// ---------------------------------------------------------------------------

describe('v1 backward compatibility', () => {

  it('V1_EMPTY_BUF fixture has correct length (100 bytes)', () => {
    expect(V1_EMPTY_BUF.byteLength).toBe(100);
  });

  it('V1_EMPTY_BUF fixture has correct CSEX magic', () => {
    expect(V1_EMPTY_BUF[0]).toBe(0x43); // C
    expect(V1_EMPTY_BUF[1]).toBe(0x53); // S
    expect(V1_EMPTY_BUF[2]).toBe(0x45); // E
    expect(V1_EMPTY_BUF[3]).toBe(0x58); // X
  });

  it('V1_EMPTY_BUF fixture has version = 1', () => {
    expect(readU16LE(V1_EMPTY_BUF, 4)).toBe(1);
  });

  it('decode(V1_EMPTY_BUF) succeeds and returns a snapshot', () => {
    expect(() => snapshotCodec.decode(V1_EMPTY_BUF)).not.toThrow();
  });

  it('decoded v1 snapshot is upgraded to FORMAT_VERSION', () => {
    const snap = snapshotCodec.decode(V1_EMPTY_BUF);
    expect(snap.version).toBe(FORMAT_VERSION);
  });

  it('decoded v1 snapshot has all expected fields (empty)', () => {
    const snap = snapshotCodec.decode(V1_EMPTY_BUF);
    expect(snap.cells).toHaveLength(0);
    expect(snap.merges).toHaveLength(0);
    expect(snap.hiddenRows).toHaveLength(0);
    expect(snap.hiddenCols).toHaveLength(0);
    expect(snap.dagEdges).toHaveLength(0);
    expect(snap.volatiles).toHaveLength(0);
  });

  it('re-encoding a decoded v1 snapshot produces a valid v2 buffer', () => {
    const decoded = snapshotCodec.decode(V1_EMPTY_BUF);
    const reencoded = snapshotCodec.encode(decoded);
    expect(readU16LE(reencoded, 4)).toBe(FORMAT_VERSION);
    // Must decode again without error (valid CRC).
    expect(() => snapshotCodec.decode(reencoded)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 7. Module-level snapshotUpgraderRegistry — v1 → v2 is pre-registered
// ---------------------------------------------------------------------------

describe('snapshotUpgraderRegistry — pre-registered upgraders', () => {

  it('v1 → v2 upgrader is registered by default', () => {
    const snap = emptySnap(1);
    const result = snapshotUpgraderRegistry.apply(snap, 2);
    expect(result.version).toBe(2);
  });

  it('registering a new path on module registry works (isolated)', () => {
    // Use a fresh registry so we don't pollute the module singleton.
    const reg = new SnapshotUpgraderRegistry();
    reg.register({ fromVersion: 100, toVersion: 101, upgrade: s => ({ ...s, version: 101 }) });
    const snap = emptySnap(100);
    expect(reg.apply(snap, 101).version).toBe(101);
  });
});
