import { describe, expect, jest, test } from '@jest/globals';
import { PivotRecomputeEngineImpl } from '../src/PivotRecomputeEngine';
import { PivotRegistryImpl, type PivotId } from '../src/PivotRegistry';
import { PivotSnapshotStore, type PivotSnapshot } from '../src/PivotSnapshotStore';
import type { PivotConfig } from '../src/PivotEngine';

describe('PKG-14C recompute snapshot validation and retry', () => {
  test('a mismatched builder snapshot preserves last-good publication and a later valid build replaces it', () => {
    const registry = new PivotRegistryImpl();
    const snapshots = new PivotSnapshotStore();
    const config: PivotConfig = {
      rows: [],
      columns: [],
      values: [],
      sourceRange: {
        start: { row: 1, col: 1 },
        end: { row: 1, col: 1 },
      },
    };
    let returnMismatchedId = false;
    let buildAttempt = 0;
    const builder = (id: PivotId, _config: PivotConfig, _worksheetId: string): PivotSnapshot => {
      buildAttempt++;
      return {
        pivotId: returnMismatchedId ? `${id}-mismatch` as PivotId : id,
        computedAt: buildAttempt,
        rows: [{ Attempt: buildAttempt }],
        fields: ['Attempt'],
        valueFields: ['Attempt'],
      };
    };
    const recompute = new PivotRecomputeEngineImpl(
      registry,
      snapshots,
      builder,
      () => null,
    );
    const pivotId = registry.register({
      name: 'snapshot validation retry',
      config,
      sourceRange: 'A1:A1',
      worksheetId: 'standalone-validation',
    });
    const errorLog = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    registry.markDirty(pivotId);
    recompute.ensureFresh(pivotId);
    const lastGood = snapshots.get(pivotId);
    expect(lastGood?.rows).toEqual([{ Attempt: 1 }]);
    expect(registry.get(pivotId)?.dirty).toBe(false);
    expect(registry.get(pivotId)?.rebuilding).toBe(false);

    returnMismatchedId = true;
    registry.markDirty(pivotId);
    recompute.ensureFresh(pivotId);

    expect(snapshots.get(pivotId)).toBe(lastGood);
    expect(snapshots.get(pivotId)?.rows).toEqual([{ Attempt: 1 }]);
    expect(registry.get(pivotId)?.dirty).toBe(true);
    expect(registry.get(pivotId)?.rebuilding).toBe(false);
    expect(errorLog).toHaveBeenCalledWith(
      `[PivotRecomputeEngine] Rebuild failed for ${pivotId}:`,
      expect.objectContaining({ message: expect.stringContaining('Snapshot pivotId mismatch') }),
    );

    returnMismatchedId = false;
    recompute.ensureFresh(pivotId);

    expect(buildAttempt).toBe(3);
    expect(snapshots.get(pivotId)).not.toBe(lastGood);
    expect(snapshots.get(pivotId)?.rows).toEqual([{ Attempt: 3 }]);
    expect(registry.get(pivotId)?.dirty).toBe(false);
    expect(registry.get(pivotId)?.rebuilding).toBe(false);
    errorLog.mockRestore();
  });
});
