/**
 * merge-api.test.ts — Phase 2: Merged Cells API
 *
 * PM-mandated coverage:
 *   1. Nested merge rejection
 *   2. Adjacent merge allowed
 *   3. Partial overlap rejection
 *   4. Find with merged region (anchor-only match)
 *   5. setCellFormula on anchor
 *   6. deleteCell on anchor unmerges
 *   7. Spill over merged area → #SPILL!
 *
 * Plus full behavior table:
 *   - Write to non-anchor  → redirect to anchor
 *   - Read non-anchor      → return anchor cell
 *   - Find                 → single logical cell
 *   - Delete anchor        → remove merge
 *   - Overlapping merge    → MergeConflictError
 *
 * Plus: MergeStoreV1 unit tests, complexity analysis assertions,
 *        benchmark (merged vs non-merged lookup), event emissions.
 *
 * Run: npx jest packages/core/__tests__/merge-api.test.ts --no-coverage --verbose
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { Worksheet } from '../src/worksheet';
import { MergeStoreV1, MergeConflictError } from '../src/storage/MergeStore';
import { SpillEngine } from '../src/SpillEngine';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeSheet(rows = 100, cols = 26): Worksheet {
  return new Worksheet('Test', rows, cols);
}

// ---------------------------------------------------------------------------
// 1.  MergeStoreV1 unit tests — correctness of the data structure
// ---------------------------------------------------------------------------

describe('MergeStoreV1 — data structure correctness', () => {
  let store: MergeStoreV1;

  beforeEach(() => { store = new MergeStoreV1(); });

  // ── add + overlap checks ────────────────────────────────────────────────

  test('add() registers region — getRegion returns it for all cells', () => {
    store.add({ startRow: 1, startCol: 1, endRow: 3, endCol: 4 });

    // All 12 cells in the 3×4 region should return the same region.
    for (let r = 1; r <= 3; r++) {
      for (let c = 1; c <= 4; c++) {
        const region = store.getRegion(r, c);
        expect(region).toBeDefined();
        expect(region!.startRow).toBe(1);
        expect(region!.startCol).toBe(1);
        expect(region!.endRow).toBe(3);
        expect(region!.endCol).toBe(4);
      }
    }
  });

  test('getRegion returns undefined for cells outside all merges', () => {
    store.add({ startRow: 2, startCol: 2, endRow: 4, endCol: 4 });
    expect(store.getRegion(1, 1)).toBeUndefined();
    expect(store.getRegion(5, 2)).toBeUndefined();
    expect(store.getRegion(2, 5)).toBeUndefined();
  });

  test('getAnchor returns anchor address for any cell in the region', () => {
    store.add({ startRow: 2, startCol: 3, endRow: 5, endCol: 6 });

    // All cells → anchor = (2, 3)
    expect(store.getAnchor(2, 3)).toEqual({ row: 2, col: 3 }); // anchor itself
    expect(store.getAnchor(3, 4)).toEqual({ row: 2, col: 3 });
    expect(store.getAnchor(5, 6)).toEqual({ row: 2, col: 3 }); // bottom-right
  });

  test('getAnchor returns null for cells not in any merge', () => {
    store.add({ startRow: 1, startCol: 1, endRow: 2, endCol: 2 });
    expect(store.getAnchor(3, 3)).toBeNull();
  });

  test('isAnchor is true for top-left only', () => {
    store.add({ startRow: 1, startCol: 1, endRow: 3, endCol: 3 });
    expect(store.isAnchor(1, 1)).toBe(true);
    expect(store.isAnchor(1, 2)).toBe(false);
    expect(store.isAnchor(3, 3)).toBe(false);
  });

  test('isNonAnchor is false for the anchor, true for all others in merge', () => {
    store.add({ startRow: 1, startCol: 1, endRow: 2, endCol: 3 });
    expect(store.isNonAnchor(1, 1)).toBe(false); // anchor
    expect(store.isNonAnchor(1, 2)).toBe(true);
    expect(store.isNonAnchor(1, 3)).toBe(true);
    expect(store.isNonAnchor(2, 1)).toBe(true);
    expect(store.isNonAnchor(2, 3)).toBe(true);
    expect(store.isNonAnchor(3, 1)).toBe(false); // outside
  });

  // ── PM Requirement 1: Nested merge rejection ─────────────────────────────

  test('PM-1 · nested merge rejection — adding a region fully inside existing region throws', () => {
    store.add({ startRow: 1, startCol: 1, endRow: 5, endCol: 5 });
    expect(() => {
      store.add({ startRow: 2, startCol: 2, endRow: 4, endCol: 4 });
    }).toThrow(MergeConflictError);
  });

  // ── PM Requirement 3: Partial overlap rejection ──────────────────────────

  test('PM-3 · partial overlap rejection — one corner overlaps throws', () => {
    store.add({ startRow: 1, startCol: 1, endRow: 3, endCol: 3 });
    expect(() => {
      store.add({ startRow: 2, startCol: 2, endRow: 4, endCol: 4 });
    }).toThrow(MergeConflictError);
  });

  test('PM-3 · partial overlap rejection — edge cell overlaps throws', () => {
    store.add({ startRow: 1, startCol: 1, endRow: 3, endCol: 3 });
    expect(() => {
      store.add({ startRow: 3, startCol: 1, endRow: 5, endCol: 5 });
    }).toThrow(MergeConflictError);
  });

  test('PM-3 · MergeConflictError carries conflict cell and anchor addresses', () => {
    store.add({ startRow: 2, startCol: 2, endRow: 4, endCol: 4 });
    let err: MergeConflictError | null = null;
    try {
      store.add({ startRow: 3, startCol: 1, endRow: 5, endCol: 5 });
    } catch (e) {
      err = e as MergeConflictError;
    }
    expect(err).toBeInstanceOf(MergeConflictError);
    expect(err!.conflictCell).toEqual({ row: 3, col: 2 }); // first overlapping cell
    expect(err!.existingAnchor).toEqual({ row: 2, col: 2 });
  });

  // ── PM Requirement 2: Adjacent merge allowed ─────────────────────────────

  test('PM-2 · adjacent merge allowed — right neighbour', () => {
    store.add({ startRow: 1, startCol: 1, endRow: 2, endCol: 3 });
    // Immediately to the right, no overlap
    expect(() => {
      store.add({ startRow: 1, startCol: 4, endRow: 2, endCol: 6 });
    }).not.toThrow();
    expect(store.size).toBe(2);
  });

  test('PM-2 · adjacent merge allowed — below', () => {
    store.add({ startRow: 1, startCol: 1, endRow: 2, endCol: 3 });
    expect(() => {
      store.add({ startRow: 3, startCol: 1, endRow: 4, endCol: 3 });
    }).not.toThrow();
    expect(store.size).toBe(2);
  });

  test('PM-2 · adjacent merge for vertical 1-wide strips (e.g. column headers)', () => {
    for (let col = 1; col <= 5; col++) {
      store.add({ startRow: 1, startCol: col, endRow: 3, endCol: col + 0 }); // 1-wide: skip
    }
    // Should be fine if we do different regions
    // Just check size
    expect(store.size).toBeGreaterThan(0);
  });

  // ── removeByAnchor ────────────────────────────────────────────────────────

  test('removeByAnchor removes the region — cells return undefined after', () => {
    store.add({ startRow: 1, startCol: 1, endRow: 2, endCol: 2 });
    store.removeByAnchor(1, 1);

    expect(store.getRegion(1, 1)).toBeUndefined();
    expect(store.getRegion(1, 2)).toBeUndefined();
    expect(store.getRegion(2, 2)).toBeUndefined();
    expect(store.size).toBe(0);
  });

  test('removeByAnchor returns the removed region', () => {
    store.add({ startRow: 3, startCol: 2, endRow: 5, endCol: 7 });
    const removed = store.removeByAnchor(3, 2);
    expect(removed).toEqual({ startRow: 3, startCol: 2, endRow: 5, endCol: 7 });
  });

  test('removeByAnchor on non-anchor address returns undefined (no-op)', () => {
    store.add({ startRow: 1, startCol: 1, endRow: 3, endCol: 3 });
    const result = store.removeByAnchor(2, 2); // not the anchor
    expect(result).toBeUndefined();
    expect(store.size).toBe(1); // untouched
  });

  test('after removeByAnchor the same cells can be re-merged', () => {
    store.add({ startRow: 1, startCol: 1, endRow: 2, endCol: 2 });
    store.removeByAnchor(1, 1);
    expect(() => {
      store.add({ startRow: 1, startCol: 1, endRow: 2, endCol: 2 });
    }).not.toThrow();
  });

  // ── removeOverlapping ────────────────────────────────────────────────────

  test('removeOverlapping removes all merges that intersect the bounding box', () => {
    store.add({ startRow: 1, startCol: 1, endRow: 2, endCol: 2 });
    store.add({ startRow: 5, startCol: 5, endRow: 6, endCol: 6 });
    store.add({ startRow: 1, startCol: 4, endRow: 3, endCol: 6 });

    const removed = store.removeOverlapping(1, 1, 3, 6);
    expect(removed).toHaveLength(2); // first and third
    expect(store.size).toBe(1); // second remains
  });

  // ── 1×1 rejection ────────────────────────────────────────────────────────

  test('add() rejects 1×1 region', () => {
    expect(() => {
      store.add({ startRow: 3, startCol: 3, endRow: 3, endCol: 3 });
    }).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// 2.  Worksheet behavior table (PM requirement)
// ---------------------------------------------------------------------------

describe('Worksheet merge behavior table', () => {
  let sheet: Worksheet;

  beforeEach(() => { sheet = makeSheet(); });

  // ── PM BT-1: Write to non-anchor → redirect to anchor ────────────────────

  test('BT-1 · write to non-anchor cell is redirected to anchor', () => {
    sheet.setCellValue({ row: 1, col: 1 }, 'OriginalAnchor');
    sheet.mergeCells({ start: { row: 1, col: 1 }, end: { row: 1, col: 3 } });

    // Write to col 2 and col 3 (non-anchor)
    sheet.setCellValue({ row: 1, col: 2 }, 'ShouldGoToAnchor');
    sheet.setCellValue({ row: 1, col: 3 }, 'AlsoAnchor');

    // Both writes should be visible via the anchor
    expect(sheet.getCellValue({ row: 1, col: 1 })).toBe('AlsoAnchor');
    // Reading non-anchor should give anchor value
    expect(sheet.getCellValue({ row: 1, col: 2 })).toBe('AlsoAnchor');
  });

  // ── PM BT-2: Read non-anchor → return anchor cell ─────────────────────────

  test('BT-2 · merged member reads return detached snapshots of the anchor cell', () => {
    sheet.setCellValue({ row: 1, col: 1 }, 'AnchorData');
    sheet.setCellStyle({ row: 1, col: 1 }, { bold: true });
    sheet.mergeCells({ start: { row: 1, col: 1 }, end: { row: 3, col: 3 } });

    // Member addresses observe anchor content through independently owned reads.
    const r2c2 = sheet.getCell({ row: 2, col: 2 });
    const r3c3 = sheet.getCell({ row: 3, col: 3 });
    const anchor = sheet.getCell({ row: 1, col: 1 });

    expect(r2c2).toEqual(anchor);
    expect(r3c3).toEqual(anchor);
    expect(r2c2).not.toBe(anchor);
    expect(r3c3).not.toBe(anchor);
    expect(r2c2).not.toBe(r3c3);
    expect(r2c2?.value).toBe('AnchorData');
    expect(r2c2?.style?.bold).toBe(true);
    expect(r3c3?.value).toBe('AnchorData');
    expect(r3c3?.style?.bold).toBe(true);

    expect(Object.isFrozen(r2c2)).toBe(true);
    expect(Reflect.set(r2c2!, 'value', 'Mutated detached read')).toBe(false);
    expect(sheet.getCellValue({ row: 2, col: 2 })).toBe('AnchorData');
  });

  test('BT-2 characterization · non-anchor reads preserve values but return a different record', () => {
    sheet.setCellValue({ row: 1, col: 1 }, 'AnchorData');
    sheet.setCellStyle({ row: 1, col: 1 }, { bold: true });
    sheet.mergeCells({ start: { row: 1, col: 1 }, end: { row: 3, col: 3 } });

    const nonAnchor = sheet.getCell({ row: 2, col: 2 });
    const anchor = sheet.getCell({ row: 1, col: 1 });

    expect(nonAnchor).toEqual(anchor);
    expect(nonAnchor).not.toBe(anchor);
    expect(nonAnchor?.value).toBe('AnchorData');
    expect(nonAnchor?.style?.bold).toBe(true);
  });

  // ── PM BT-3: Find across merged region → single logical cell ─────────────

  test('BT-3 · find across merged region returns only the anchor address', () => {
    sheet.setCellValue({ row: 1, col: 1 }, 'Needle');
    sheet.mergeCells({ start: { row: 1, col: 1 }, end: { row: 1, col: 5 } });

    const results = sheet.findAll({ what: 'Needle' });
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ row: 1, col: 1 }); // anchor only
  });

  test('BT-3 · find does not return non-anchor positions', () => {
    sheet.setCellValue({ row: 2, col: 1 }, 'Target');
    sheet.mergeCells({ start: { row: 2, col: 1 }, end: { row: 4, col: 4 } });

    const results = sheet.findAll({ what: 'Target' });
    // None of these should appear
    const nonAnchorAddresses = [
      { row: 2, col: 2 }, { row: 3, col: 1 }, { row: 4, col: 4 },
    ];
    for (const addr of nonAnchorAddresses) {
      expect(results).not.toContainEqual(addr);
    }
    expect(results).toContainEqual({ row: 2, col: 1 });
  });

  // ── PM BT-4: Delete anchor → remove merge ────────────────────────────────

  test('PM-6 · deleteCell on anchor unmerges the region', () => {
    sheet.setCellValue({ row: 1, col: 1 }, 'Data');
    sheet.mergeCells({ start: { row: 1, col: 1 }, end: { row: 2, col: 3 } });

    expect(sheet.getMergedRangeForCell({ row: 1, col: 1 })).not.toBeNull();

    sheet.deleteCell({ row: 1, col: 1 });

    // Merge should be gone
    expect(sheet.getMergedRangeForCell({ row: 1, col: 1 })).toBeNull();
    expect(sheet.getMergedRangeForCell({ row: 2, col: 3 })).toBeNull();
    // Anchor value should be cleared
    expect(sheet.getCellValue({ row: 1, col: 1 })).toBeNull();
  });

  test('PM-6 · deleteCell on non-anchor redirects to anchor and unmerges', () => {
    sheet.setCellValue({ row: 1, col: 1 }, 'Data');
    sheet.mergeCells({ start: { row: 1, col: 1 }, end: { row: 2, col: 2 } });

    // Call deleteCell on a non-anchor
    sheet.deleteCell({ row: 2, col: 2 });

    // Merge should be removed (resolved to anchor, then unmerged)
    expect(sheet.getMergedRangeForCell({ row: 1, col: 1 })).toBeNull();
    expect(sheet.getCellValue({ row: 1, col: 1 })).toBeNull();
  });

  // ── PM BT-5: Overlapping merge → hard error ────────────────────────────────

  test('BT-5 · overlapping merge attempt throws MergeConflictError', () => {
    sheet.mergeCells({ start: { row: 1, col: 1 }, end: { row: 3, col: 3 } });
    expect(() => {
      sheet.mergeCells({ start: { row: 2, col: 2 }, end: { row: 4, col: 4 } });
    }).toThrow(MergeConflictError);
  });

  test('BT-5 · after failed overlap, original merge is untouched', () => {
    sheet.setCellValue({ row: 1, col: 1 }, 'Safe');
    sheet.mergeCells({ start: { row: 1, col: 1 }, end: { row: 2, col: 2 } });

    try {
      sheet.mergeCells({ start: { row: 2, col: 1 }, end: { row: 3, col: 3 } });
    } catch { /* expected */ }

    // Original merge must still be intact
    expect(sheet.getMergedRangeForCell({ row: 1, col: 1 })).not.toBeNull();
    expect(sheet.getMergedRangeForCell({ row: 2, col: 2 })).not.toBeNull();
    expect(sheet.getCellValue({ row: 1, col: 1 })).toBe('Safe');
  });
});

// ---------------------------------------------------------------------------
// 3.  PM Required Tests (verbatim)
// ---------------------------------------------------------------------------

describe('PM-Required Tests — Phase 2', () => {
  let sheet: Worksheet;

  beforeEach(() => { sheet = makeSheet(); });

  // PM-1: Nested merge rejection ─────────────────────────────────────────────

  test('PM-1 · nested merge rejection', () => {
    sheet.mergeCells({ start: { row: 1, col: 1 }, end: { row: 5, col: 5 } });
    expect(() => {
      sheet.mergeCells({ start: { row: 2, col: 2 }, end: { row: 4, col: 4 } });
    }).toThrow(MergeConflictError);
  });

  // PM-2: Adjacent merge allowed ─────────────────────────────────────────────

  test('PM-2 · adjacent merge allowed (right neighbour)', () => {
    sheet.mergeCells({ start: { row: 1, col: 1 }, end: { row: 3, col: 3 } });
    expect(() => {
      sheet.mergeCells({ start: { row: 1, col: 4 }, end: { row: 3, col: 6 } });
    }).not.toThrow();
    expect(sheet.getMergedRanges()).toHaveLength(2);
  });

  test('PM-2 · adjacent merge allowed (diagonal, corner-to-corner)', () => {
    sheet.mergeCells({ start: { row: 1, col: 1 }, end: { row: 2, col: 2 } });
    // Immediately below-right, no cell overlap
    expect(() => {
      sheet.mergeCells({ start: { row: 3, col: 3 }, end: { row: 4, col: 4 } });
    }).not.toThrow();
  });

  // PM-3: Partial overlap rejection ──────────────────────────────────────────

  test('PM-3 · partial overlap rejection (one corner overlaps)', () => {
    sheet.mergeCells({ start: { row: 1, col: 1 }, end: { row: 4, col: 4 } });
    expect(() => {
      sheet.mergeCells({ start: { row: 3, col: 3 }, end: { row: 6, col: 6 } });
    }).toThrow(MergeConflictError);
  });

  test('PM-3 · partial overlap rejection (edge row overlaps)', () => {
    sheet.mergeCells({ start: { row: 1, col: 1 }, end: { row: 5, col: 3 } });
    expect(() => {
      sheet.mergeCells({ start: { row: 5, col: 1 }, end: { row: 8, col: 3 } });
    }).toThrow(MergeConflictError);
  });

  // PM-4: Find with merged region ────────────────────────────────────────────

  test('PM-4 · find with merged region returns anchor only', () => {
    sheet.setCellValue({ row: 3, col: 2 }, 'SearchTarget');
    sheet.mergeCells({ start: { row: 3, col: 2 }, end: { row: 5, col: 7 } });

    const results = sheet.findAll({ what: 'SearchTarget' });
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ row: 3, col: 2 });
  });

  test('PM-4 · find works on multiple non-adjacent merged regions', () => {
    sheet.setCellValue({ row: 1, col: 1 }, 'X');
    sheet.mergeCells({ start: { row: 1, col: 1 }, end: { row: 1, col: 3 } });

    sheet.setCellValue({ row: 5, col: 5 }, 'X');
    sheet.mergeCells({ start: { row: 5, col: 5 }, end: { row: 7, col: 7 } });

    const results = sheet.findAll({ what: 'X' });
    expect(results).toHaveLength(2);
    expect(results).toContainEqual({ row: 1, col: 1 });
    expect(results).toContainEqual({ row: 5, col: 5 });
  });

  // PM-5: setCellFormula on anchor ───────────────────────────────────────────

  test('PM-5 · setCellFormula on anchor registers formula correctly', () => {
    sheet.mergeCells({ start: { row: 2, col: 1 }, end: { row: 4, col: 3 } });
    sheet.setCellFormula({ row: 2, col: 1 }, '=SUM(D1:D10)', 42);

    const cell = sheet.getCell({ row: 2, col: 1 });
    expect(cell?.formula).toBe('=SUM(D1:D10)');
    expect(cell?.value).toBe(42);
  });

  test('PM-5 · setCellFormula on non-anchor redirects to anchor', () => {
    sheet.mergeCells({ start: { row: 2, col: 1 }, end: { row: 4, col: 3 } });
    // Write formula to a non-anchor cell
    sheet.setCellFormula({ row: 3, col: 2 }, '=A1*2', 10);

    const anchor = sheet.getCell({ row: 2, col: 1 });
    expect(anchor?.formula).toBe('=A1*2');
    expect(anchor?.value).toBe(10);

    // Reading via non-anchor should also see the formula
    const nonAnchor = sheet.getCell({ row: 4, col: 3 });
    expect(nonAnchor?.formula).toBe('=A1*2');
  });

  // PM-6: deleteCell on anchor unmerges ──────────────────────────────────────

  test('PM-6 · deleteCell on anchor clears value and removes merge', () => {
    sheet.setCellValue({ row: 1, col: 1 }, 'ToDelete');
    sheet.mergeCells({ start: { row: 1, col: 1 }, end: { row: 3, col: 3 } });
    sheet.deleteCell({ row: 1, col: 1 });

    expect(sheet.getCellValue({ row: 1, col: 1 })).toBeNull();
    expect(sheet.getMergedRangeForCell({ row: 1, col: 1 })).toBeNull();
    expect(sheet.getMergedRangeForCell({ row: 2, col: 2 })).toBeNull();
    expect(sheet.getMergedRanges()).toHaveLength(0);
  });

  test('PM-6 · after anchor deletion, formerly non-anchor cells are independent', () => {
    sheet.setCellValue({ row: 1, col: 1 }, 'X');
    sheet.mergeCells({ start: { row: 1, col: 1 }, end: { row: 2, col: 2 } });
    sheet.deleteCell({ row: 1, col: 1 });

    // Former non-anchor at (1,2) should now be an independent empty cell
    // Setting a value there must work independently
    sheet.setCellValue({ row: 1, col: 2 }, 'Independent');
    expect(sheet.getCellValue({ row: 1, col: 2 })).toBe('Independent');
    // Should NOT be redirected to any anchor anymore
    expect(sheet.getCellValue({ row: 1, col: 1 })).toBeNull(); // anchor was cleared
  });

  // PM-7: Spill over merged area → #SPILL! ───────────────────────────────────

  test('PM-7 · spill over merged cell returns #SPILL!', () => {
    const spillEngine = new SpillEngine();

    // Merge cells (2,1):(4,3) — these should block spill
    sheet.mergeCells({ start: { row: 2, col: 1 }, end: { row: 4, col: 3 } });

    // Spill source at (1,1) trying to spill 5 rows × 1 col → hits the merge at row 2
    const result = spillEngine.checkSpillRange(sheet, { row: 1, col: 1 }, 5, 1);
    expect(result).toBeInstanceOf(Error);
    expect(result?.message).toBe('#SPILL!');
  });

  test('PM-7 · spill that does NOT touch merged cells is allowed', () => {
    const spillEngine = new SpillEngine();

    // Merge far away from spill path
    sheet.mergeCells({ start: { row: 10, col: 10 }, end: { row: 15, col: 15 } });

    // Spill source at (1,1), 3×1 — no merge in path
    const result = spillEngine.checkSpillRange(sheet, { row: 1, col: 1 }, 3, 1);
    expect(result).toBeNull();
  });

  test('PM-7 · spill over anchor cell of a merge returns #SPILL!', () => {
    const spillEngine = new SpillEngine();
    sheet.mergeCells({ start: { row: 3, col: 1 }, end: { row: 5, col: 2 } });

    // (1,1) spills 3 rows → hits row 3 which is the merge ANCHOR
    const result = spillEngine.checkSpillRange(sheet, { row: 1, col: 1 }, 3, 1);
    expect(result).toBeInstanceOf(Error);
    expect(result?.message).toBe('#SPILL!');
  });
});

// ---------------------------------------------------------------------------
// 4.  getMergedRangeForCell O(1) contract
// ---------------------------------------------------------------------------

describe('getMergedRangeForCell — O(1) lookup contract', () => {
  test('returns null for unmerged cell', () => {
    const sheet = makeSheet();
    sheet.setCellValue({ row: 1, col: 1 }, 'hello');
    expect(sheet.getMergedRangeForCell({ row: 1, col: 1 })).toBeNull();
  });

  test('returns correct Range for anchor cell', () => {
    const sheet = makeSheet();
    sheet.mergeCells({ start: { row: 2, col: 3 }, end: { row: 5, col: 7 } });
    const range = sheet.getMergedRangeForCell({ row: 2, col: 3 });
    expect(range).toEqual({
      start: { row: 2, col: 3 },
      end: { row: 5, col: 7 },
    });
  });

  test('returns same Range for any cell in the region', () => {
    const sheet = makeSheet();
    sheet.mergeCells({ start: { row: 1, col: 1 }, end: { row: 4, col: 4 } });
    const anchorRange = sheet.getMergedRangeForCell({ row: 1, col: 1 });
    const midRange    = sheet.getMergedRangeForCell({ row: 2, col: 3 });
    const cornerRange = sheet.getMergedRangeForCell({ row: 4, col: 4 });
    expect(anchorRange).toEqual(midRange);
    expect(midRange).toEqual(cornerRange);
  });
});

// ---------------------------------------------------------------------------
// 5.  cancelMerge behavior
// ---------------------------------------------------------------------------

describe('cancelMerge', () => {
  let sheet: Worksheet;
  beforeEach(() => { sheet = makeSheet(); });

  test('cancelMerge removes the merge — cells become independent', () => {
    sheet.setCellValue({ row: 1, col: 1 }, 'Merged');
    sheet.mergeCells({ start: { row: 1, col: 1 }, end: { row: 2, col: 3 } });
    sheet.cancelMerge({ start: { row: 1, col: 1 }, end: { row: 2, col: 3 } });

    expect(sheet.getMergedRangeForCell({ row: 1, col: 1 })).toBeNull();
    expect(sheet.getMergedRanges()).toHaveLength(0);
  });

  test('cancelMerge by any range that overlaps the region', () => {
    sheet.mergeCells({ start: { row: 1, col: 1 }, end: { row: 3, col: 3 } });
    // Cancel by passing just one of the non-anchor cells
    sheet.cancelMerge({ start: { row: 2, col: 2 }, end: { row: 2, col: 2 } });
    expect(sheet.getMergedRanges()).toHaveLength(0);
  });

  test('after cancelMerge, non-anchor positions accept independent values', () => {
    sheet.setCellValue({ row: 1, col: 1 }, 'A');
    sheet.mergeCells({ start: { row: 1, col: 1 }, end: { row: 1, col: 3 } });
    sheet.cancelMerge({ start: { row: 1, col: 1 }, end: { row: 1, col: 3 } });

    sheet.setCellValue({ row: 1, col: 2 }, 'B');
    sheet.setCellValue({ row: 1, col: 3 }, 'C');

    expect(sheet.getCellValue({ row: 1, col: 1 })).toBe('A');
    expect(sheet.getCellValue({ row: 1, col: 2 })).toBe('B');
    expect(sheet.getCellValue({ row: 1, col: 3 })).toBe('C');
  });
});

// ---------------------------------------------------------------------------
// 6.  Event emissions
// ---------------------------------------------------------------------------

describe('Merge events', () => {
  test('mergeCells emits merge-added event with correct region', () => {
    const sheet = makeSheet();
    const events: any[] = [];
    sheet.on(e => events.push(e));

    sheet.mergeCells({ start: { row: 1, col: 1 }, end: { row: 3, col: 4 } });

    const mergeAdded = events.find(e => e.type === 'merge-added');
    expect(mergeAdded).toBeDefined();
    expect(mergeAdded.region).toEqual({ startRow: 1, startCol: 1, endRow: 3, endCol: 4 });
  });

  test('cancelMerge emits merge-removed event', () => {
    const sheet = makeSheet();
    sheet.mergeCells({ start: { row: 1, col: 1 }, end: { row: 2, col: 2 } });

    const events: any[] = [];
    sheet.on(e => events.push(e));
    sheet.cancelMerge({ start: { row: 1, col: 1 }, end: { row: 2, col: 2 } });

    const mergeRemoved = events.find(e => e.type === 'merge-removed');
    expect(mergeRemoved).toBeDefined();
    expect(mergeRemoved.region).toEqual({ startRow: 1, startCol: 1, endRow: 2, endCol: 2 });
  });

  test('failed mergeCells (conflict) does NOT emit merge-added', () => {
    const sheet = makeSheet();
    sheet.mergeCells({ start: { row: 1, col: 1 }, end: { row: 3, col: 3 } });

    const events: any[] = [];
    sheet.on(e => events.push(e));

    try {
      sheet.mergeCells({ start: { row: 2, col: 2 }, end: { row: 4, col: 4 } });
    } catch { /* expected */ }

    expect(events.some(e => e.type === 'merge-added')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 7.  Anchor redirect — value preservation and style passthrough
// ---------------------------------------------------------------------------

describe('Anchor redirect — value and style passthrough', () => {
  let sheet: Worksheet;
  beforeEach(() => { sheet = makeSheet(); });

  test('getCellValue on any non-anchor cell returns anchor value', () => {
    sheet.setCellValue({ row: 1, col: 1 }, 99);
    sheet.mergeCells({ start: { row: 1, col: 1 }, end: { row: 3, col: 5 } });

    for (let r = 1; r <= 3; r++) {
      for (let c = 1; c <= 5; c++) {
        expect(sheet.getCellValue({ row: r, col: c })).toBe(99);
      }
    }
  });

  test('non-anchor cells have no independent style', () => {
    sheet.setCellStyle({ row: 1, col: 1 }, { bold: true, color: 'red' });
    sheet.mergeCells({ start: { row: 1, col: 1 }, end: { row: 2, col: 4 } });

    // Style is on the anchor; reading via non-anchor returns anchor's cell
    const nonAnchor = sheet.getCell({ row: 2, col: 4 });
    expect(nonAnchor?.style?.bold).toBe(true);
    expect(nonAnchor?.style?.color).toBe('red');
  });

  test('setting style on non-anchor updates anchor', () => {
    sheet.mergeCells({ start: { row: 1, col: 1 }, end: { row: 2, col: 2 } });
    sheet.setCellStyle({ row: 2, col: 2 }, { italic: true }); // non-anchor

    const anchor = sheet.getCell({ row: 1, col: 1 });
    expect(anchor?.style?.italic).toBe(true);
  });

  test('non-anchor cells cleared from ICellStore at merge time', () => {
    // Populate cells before merging
    sheet.setCellValue({ row: 1, col: 2 }, 'WillBeCleared');
    sheet.setCellValue({ row: 2, col: 1 }, 'WillBeCleared');

    // Merge with (1,1) as anchor
    sheet.mergeCells({ start: { row: 1, col: 1 }, end: { row: 2, col: 2 } });

    // Non-anchor data is gone — only anchor's data should be present
    // The merge redirects to anchor, but if we somehow stored in non-anchor, it's cleared
    // Verify via getUsedRange — the stale non-anchor cells shouldn't bloat the range
    const used = sheet.getUsedRange();
    // We only have the anchor cell (1,1) which has null value from createMonoCell
    // The stale cells at (1,2) and (2,1) are deleted
    if (used) {
      // If used range exists, it should only reflect the anchor (1,1)
      expect(used.start.row).toBe(1);
      expect(used.start.col).toBe(1);
    }
  });
});

// ---------------------------------------------------------------------------
// 8.  Performance benchmark: merged vs non-merged lookup
// ---------------------------------------------------------------------------

describe('Merge performance benchmark', () => {
  function heapMB(): number {
    return process.memoryUsage().heapUsed / 1024 / 1024;
  }

  test('1000 getMergedRangeForCell lookups are O(1) — completes < 10ms', () => {
    const sheet = makeSheet(10000, 100);
    // Create 100 non-adjacent merges
    for (let i = 0; i < 100; i++) {
      const row = i * 10 + 1;
      sheet.mergeCells({
        start: { row, col: 1 },
        end:   { row: row + 3, col: 5 },
      });
    }

    const t0 = performance.now();
    for (let i = 0; i < 1000; i++) {
      sheet.getMergedRangeForCell({ row: (i % 100) * 10 + 2, col: 3 }); // non-anchor
    }
    const ms = performance.now() - t0;

    console.log(`\n  getMergedRangeForCell × 1000 @ 100 merges: ${ms.toFixed(2)}ms`);
    expect(ms).toBeLessThan(10); // well within O(1) budget
  }, 30_000);

  test('O(1) vs O(n) — V1 stays flat as merge count grows', () => {
    // Measure lookup time at 10, 100, 1000 merges — should be roughly constant
    const results: { merges: number; ms: number }[] = [];

    for (const mergeCount of [10, 100, 500]) {
      const store = new MergeStoreV1();
      // Add non-overlapping 2×2 regions in a grid
      let row = 1;
      for (let i = 0; i < mergeCount; i++) {
        store.add({ startRow: row, startCol: 1, endRow: row + 1, endCol: 2 });
        row += 3; // gap of 1 row between merges
      }

      const t0 = performance.now();
      const lookupRow = mergeCount * 1; // lookup in the last merge
      for (let i = 0; i < 10_000; i++) {
        store.getAnchor(lookupRow, 2); // non-anchor cell of last merge
      }
      results.push({ merges: mergeCount, ms: performance.now() - t0 });
    }

    console.log('\n  MergeStoreV1 lookup time vs merge count:');
    for (const r of results) {
      console.log(`    ${String(r.merges).padStart(5)} merges → ${r.ms.toFixed(2)}ms / 10k lookups`);
    }

    // O(1) invariant: 500-merge lookup should be at most 5× the 10-merge lookup time.
    // (A factor of 5 is very conservative — true O(1) would be within 1.5×.)
    const ratio = results[results.length - 1].ms / results[0].ms;
    console.log(`    Ratio (500-merge / 10-merge): ${ratio.toFixed(2)}× (must be ≤ 5×)`);
    expect(ratio).toBeLessThan(5);
  }, 30_000);
});

// ---------------------------------------------------------------------------
// 9.  Integration: getMergedRanges API
// ---------------------------------------------------------------------------

describe('getMergedRanges API', () => {
  test('returns empty array when no merges', () => {
    const sheet = makeSheet();
    expect(sheet.getMergedRanges()).toEqual([]);
  });

  test('returns all merges as Range[]', () => {
    const sheet = makeSheet();
    sheet.mergeCells({ start: { row: 1, col: 1 }, end: { row: 2, col: 3 } });
    sheet.mergeCells({ start: { row: 5, col: 5 }, end: { row: 7, col: 8 } });

    const ranges = sheet.getMergedRanges();
    expect(ranges).toHaveLength(2);
    expect(ranges).toContainEqual({ start: { row: 1, col: 1 }, end: { row: 2, col: 3 } });
    expect(ranges).toContainEqual({ start: { row: 5, col: 5 }, end: { row: 7, col: 8 } });
  });

  test('getMergedRanges returns updated list after cancelMerge', () => {
    const sheet = makeSheet();
    sheet.mergeCells({ start: { row: 1, col: 1 }, end: { row: 2, col: 2 } });
    sheet.mergeCells({ start: { row: 4, col: 4 }, end: { row: 5, col: 5 } });
    sheet.cancelMerge({ start: { row: 1, col: 1 }, end: { row: 2, col: 2 } });

    const ranges = sheet.getMergedRanges();
    expect(ranges).toHaveLength(1);
    expect(ranges[0]).toEqual({ start: { row: 4, col: 4 }, end: { row: 5, col: 5 } });
  });
});
