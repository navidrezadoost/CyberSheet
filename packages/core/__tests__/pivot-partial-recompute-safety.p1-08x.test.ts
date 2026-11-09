declare function describe(name: string, fn: () => void): void;
declare function test(name: string, fn: () => void): void;
declare function beforeEach(fn: () => void): void;
declare function afterEach(fn: () => void): void;
declare const expect: any;

import { PivotEngine, type AggregationType, type PivotConfig } from '../src/PivotEngine';
import { PivotRegistryImpl, type PivotId } from '../src/PivotRegistry';
import { PivotSnapshotStore } from '../src/PivotSnapshotStore';
import { PivotRecomputeEngineImpl } from '../src/PivotRecomputeEngine';
import { groupStateStore, hashRowRelevant, getRelevantColumns } from '../src/PivotGroupStateStore';
import { Worksheet } from '../src/worksheet';
import { transformToPivotSnapshot } from '../src/PivotSnapshotTransformer';
import type { ExtendedCellValue, Range } from '../src/types';

const sourceRange: Range = {
  start: { row: 4, col: 3 },
  end: { row: 8, col: 7 },
};

class FailOnceSnapshotStore extends PivotSnapshotStore {
  failNextSet = false;
  failAfterNextSet = false;
  capturedState?: {
    version: number;
    rowHash?: number;
    rowSnapshot?: ExtendedCellValue[];
    rowGroup?: string;
    westRevenue?: number | null;
  };

  override set(id: PivotId, snapshot: import('../src/PivotSnapshotStore').PivotSnapshot): void {
    if (this.failNextSet) {
      this.failNextSet = false;
      const state = groupStateStore.get(id);
      this.capturedState = state ? {
        version: state.version,
        rowHash: state.rowHashes.get(1),
        rowSnapshot: state.rowSnapshots.get(1) && [...state.rowSnapshots.get(1)!],
        rowGroup: state.rowToGroup.get(1),
        westRevenue: state.groups.get('string:West')?.values.Revenue?.get(),
      } : undefined;
      throw new Error('injected snapshot publication failure');
    }
    super.set(id, snapshot);
    if (this.failAfterNextSet) {
      this.failAfterNextSet = false;
      throw new Error('injected failure after snapshot publication');
    }
  }
}

class FailOnceMarkCleanRegistry extends PivotRegistryImpl {
  failNextMarkClean = false;

  override markClean(id: PivotId, builtAt: number): void {
    if (this.failNextMarkClean) {
      this.failNextMarkClean = false;
      throw new Error('injected registry markClean failure');
    }
    super.markClean(id, builtAt);
  }
}

function fixture(
  aggregation: AggregationType,
  suppliedSnapshots = new PivotSnapshotStore(),
  suppliedRegistry = new PivotRegistryImpl(),
  withCalculatedFields = false,
) {
  const worksheet = new Worksheet('Partial safety', 12, 8);
  const matrix: ExtendedCellValue[][] = [
    ['Region', 'Year', 'Note', 'Revenue', 'Units'],
    ['West', 2025, 'w1', 10, 1],
    ['East', 2025, 'e1', 20, 2],
    ['West', 2026, 'w2', 30, 3],
    ['South', 2026, 's1', 40, 4],
  ];
  matrix.forEach((row, rowOffset) => row.forEach((value, colOffset) => {
    worksheet.setCellValue(
      { row: sourceRange.start.row + rowOffset, col: sourceRange.start.col + colOffset },
      value,
    );
  }));

  const config: PivotConfig = {
    rows: [{ column: 3, label: 'Region' }],
    columns: [],
    values: [{ type: 'aggregate', column: 6, aggregation, label: 'Revenue' }],
    ...(withCalculatedFields
      ? { calculatedFields: [{ name: 'DoubleRevenue', formula: 'Revenue * 2' }] }
      : {}),
    sourceRange,
  };
  const registry = suppliedRegistry;
  const snapshots = suppliedSnapshots;
  let id: PivotId;
  let buildCalls = 0;
  let builderFails = false;
  let builderFailsAfterStatePopulation = false;
  let sourceReadFailsOnce = false;
  const sourceReadsDuringRebuild: Array<boolean | undefined> = [];
  const readSource = (): ExtendedCellValue[][] => {
    const data: ExtendedCellValue[][] = [];
    for (let row = sourceRange.start.row; row <= sourceRange.end.row; row++) {
      const values: ExtendedCellValue[] = [];
      for (let col = sourceRange.start.col; col <= sourceRange.end.col; col++) {
        values.push(worksheet.getCellValue({ row, col }));
      }
      data.push(values);
    }
    return data;
  };
  const builder = (pivotId: PivotId, pivotConfig: PivotConfig, _worksheetId: string) => {
    buildCalls++;
    if (builderFails) throw new Error('injected public builder failure');
    const table = new PivotEngine(worksheet).generate(pivotConfig);
    const snapshot = transformToPivotSnapshot(pivotId, table, pivotConfig);
    new PivotEngine(worksheet).populateGroupState(pivotId, pivotConfig, readSource());
    if (builderFailsAfterStatePopulation) throw new Error('injected builder failure after group-state population');
    return snapshot;
  };
  const recompute = new PivotRecomputeEngineImpl(
    registry,
    snapshots,
    builder,
    (_worksheetId, _range) => {
      sourceReadsDuringRebuild.push(registry.get(id)?.rebuilding);
      if (sourceReadFailsOnce) {
        sourceReadFailsOnce = false;
        throw new Error('injected public source extractor failure');
      }
      return readSource();
    },
  );
  id = registry.register({
    name: `Partial ${aggregation}`,
    config,
    sourceRange: 'C4:G8',
    worksheetId: 'partial-safety-sheet',
  });
  return {
    worksheet,
    config,
    registry,
    snapshots,
    recompute,
    id,
    readSource,
    failBuilder(fails: boolean) { builderFails = fails; },
    failBuilderAfterStatePopulation(fails: boolean) { builderFailsAfterStatePopulation = fails; },
    failNextSourceRead() { sourceReadFailsOnce = true; },
    get buildCalls() { return buildCalls; },
    sourceReadsDuringRebuild,
  };
}

function fullSnapshot(worksheet: Worksheet, config: PivotConfig, id: PivotId) {
  const table = new PivotEngine(worksheet).generate(config);
  return transformToPivotSnapshot(id, table, config);
}

function sortedRows(rows: readonly Record<string, unknown>[] | undefined) {
  return [...(rows ?? [])].sort((a, b) => String(a.Region).localeCompare(String(b.Region)));
}

describe('P1-08X pivot partial-recompute safety characterization', () => {
  beforeEach(() => groupStateStore.clear());
  afterEach(() => groupStateStore.clear());

  test('partial recompute is reachable while the registry flag is true, then returns to clean state', () => {
    const f = fixture('sum');
    f.registry.markDirty(f.id);
    f.recompute.ensureFresh(f.id);
    expect(f.buildCalls).toBe(1); // Initial full build seeds public group state.
    expect(f.registry.get(f.id)?.dirty).toBe(false);
    expect(f.registry.get(f.id)?.rebuilding).toBe(false);

    f.worksheet.setCellValue({ row: 5, col: 6 }, 15);
    f.registry.markDirty(f.id);
    f.recompute.ensureFresh(f.id);

    expect(f.sourceReadsDuringRebuild).toEqual([true]);
    expect(f.buildCalls).toBe(1); // No full-builder call: the partial path completed.
    expect(f.registry.get(f.id)?.dirty).toBe(false);
    expect(f.registry.get(f.id)?.rebuilding).toBe(false);
    expect(sortedRows(f.snapshots.get(f.id)?.rows)).toEqual(sortedRows(fullSnapshot(f.worksheet, f.config, f.id).rows));
    f.recompute.ensureFresh(f.id);
    expect(f.buildCalls).toBe(1); // A clean query does not invoke the builder.
  });

  test('markClean failure after partial publication keeps the pivot dirty until a fresh no-op validation retry', () => {
    const registry = new FailOnceMarkCleanRegistry();
    const f = fixture('sum', new PivotSnapshotStore(), registry);
    f.registry.markDirty(f.id);
    f.recompute.ensureFresh(f.id);
    const priorSnapshot = f.snapshots.get(f.id);

    f.worksheet.setCellValue({ row: 5, col: 6 }, 16);
    registry.failNextMarkClean = true;
    f.registry.markDirty(f.id);
    f.recompute.ensureFresh(f.id);

    const published = f.snapshots.get(f.id);
    expect(published).not.toBe(priorSnapshot);
    expect(sortedRows(published?.rows)).toEqual(sortedRows(fullSnapshot(f.worksheet, f.config, f.id).rows));
    expect(groupStateStore.get(f.id)?.groups.get('string:West')?.values.Revenue?.get()).toBe(46);
    expect(f.registry.get(f.id)?.dirty).toBe(true);
    expect(f.registry.get(f.id)?.rebuilding).toBe(false);
    expect(f.buildCalls).toBe(1);

    f.recompute.ensureFresh(f.id);
    expect(f.snapshots.get(f.id)).toBe(published);
    expect(sortedRows(f.snapshots.get(f.id)?.rows)).toEqual(sortedRows(fullSnapshot(f.worksheet, f.config, f.id).rows));
    expect(f.registry.get(f.id)?.dirty).toBe(false);
    expect(f.registry.get(f.id)?.rebuilding).toBe(false);
    expect(f.buildCalls).toBe(1);
  });

  test('markClean failure after full publication preserves current snapshot and retries without old group state', () => {
    const registry = new FailOnceMarkCleanRegistry();
    const f = fixture('sum', new PivotSnapshotStore(), registry);
    f.registry.markDirty(f.id);
    f.recompute.ensureFresh(f.id);
    const priorSnapshot = f.snapshots.get(f.id);

    groupStateStore.delete(f.id);
    f.worksheet.setCellValue({ row: 5, col: 6 }, 23);
    registry.failNextMarkClean = true;
    f.registry.markDirty(f.id);
    f.recompute.ensureFresh(f.id);

    const published = f.snapshots.get(f.id);
    expect(published).not.toBe(priorSnapshot);
    expect(sortedRows(published?.rows)).toEqual(sortedRows(fullSnapshot(f.worksheet, f.config, f.id).rows));
    expect(groupStateStore.get(f.id)).toBeUndefined();
    expect(f.registry.get(f.id)?.dirty).toBe(true);
    expect(f.registry.get(f.id)?.rebuilding).toBe(false);
    expect(f.buildCalls).toBe(2);

    f.recompute.ensureFresh(f.id);
    expect(sortedRows(f.snapshots.get(f.id)?.rows)).toEqual(sortedRows(fullSnapshot(f.worksheet, f.config, f.id).rows));
    expect(groupStateStore.get(f.id)?.rowSnapshots.get(1)?.[3]).toBe(23);
    expect(f.registry.get(f.id)?.dirty).toBe(false);
    expect(f.registry.get(f.id)?.rebuilding).toBe(false);
    expect(f.buildCalls).toBe(3);
  });

  test('snapshot store can throw before or after publication through its public set override', () => {
    const beforeStore = new FailOnceSnapshotStore();
    const before = fixture('sum', beforeStore);
    before.registry.markDirty(before.id);
    before.recompute.ensureFresh(before.id);
    const prior = before.snapshots.get(before.id);
    beforeStore.failNextSet = true;
    groupStateStore.delete(before.id);
    before.worksheet.setCellValue({ row: 5, col: 6 }, 24);
    before.registry.markDirty(before.id);
    before.recompute.ensureFresh(before.id);
    expect(before.snapshots.get(before.id)).toBe(prior); // Throw-before-store leaves the prior snapshot published.
    expect(before.registry.get(before.id)?.dirty).toBe(true);
    expect(before.registry.get(before.id)?.rebuilding).toBe(false);
    expect(groupStateStore.get(before.id)).toBeUndefined();
    before.recompute.ensureFresh(before.id);
    expect(before.buildCalls).toBe(3);
    expect(sortedRows(before.snapshots.get(before.id)?.rows)).toEqual(sortedRows(fullSnapshot(before.worksheet, before.config, before.id).rows));

    groupStateStore.clear(); // Each independently registered fixture begins without another pivot's process-local state.
    const afterStore = new FailOnceSnapshotStore();
    const after = fixture('sum', afterStore);
    after.registry.markDirty(after.id);
    after.recompute.ensureFresh(after.id);
    const priorAfter = after.snapshots.get(after.id);
    groupStateStore.delete(after.id);
    after.worksheet.setCellValue({ row: 5, col: 6 }, 25);
    afterStore.failAfterNextSet = true;
    after.registry.markDirty(after.id);
    after.recompute.ensureFresh(after.id);
    expect(after.snapshots.get(after.id)).not.toBe(priorAfter);
    expect(sortedRows(after.snapshots.get(after.id)?.rows)).toEqual(sortedRows(fullSnapshot(after.worksheet, after.config, after.id).rows));
    expect(after.registry.get(after.id)?.dirty).toBe(true);
    expect(after.registry.get(after.id)?.rebuilding).toBe(false);
    expect(groupStateStore.get(after.id)).toBeUndefined();
    after.recompute.ensureFresh(after.id);
    expect(after.buildCalls).toBe(3);
    expect(sortedRows(after.snapshots.get(after.id)?.rows)).toEqual(sortedRows(fullSnapshot(after.worksheet, after.config, after.id).rows));
    expect(groupStateStore.get(after.id)?.rowSnapshots.get(1)?.[3]).toBe(25);
    expect(after.registry.get(after.id)?.dirty).toBe(false);
    expect(after.registry.get(after.id)?.rebuilding).toBe(false);
  });

  test('successful full fallback after partial publication failure repairs group migration and repeated edits on a non-A1 range', () => {
    const storage = new FailOnceSnapshotStore();
    const f = fixture('sum', storage);
    f.registry.markDirty(f.id);
    f.recompute.ensureFresh(f.id);

    f.worksheet.setCellValue({ row: 5, col: 3 }, 'East');
    f.worksheet.setCellValue({ row: 5, col: 6 }, 26);
    storage.failNextSet = true;
    f.registry.markDirty(f.id);
    f.recompute.ensureFresh(f.id);

    expect(f.buildCalls).toBe(2); // Failed partial publication falls through to a successful full build.
    expect(f.registry.get(f.id)?.dirty).toBe(false);
    expect(f.registry.get(f.id)?.rebuilding).toBe(false);
    expect(groupStateStore.get(f.id)?.rowToGroup.get(1)).toBe('string:East');
    expect(groupStateStore.get(f.id)?.rowSnapshots.get(1)).toEqual(f.readSource()[1]);
    expect(sortedRows(f.snapshots.get(f.id)?.rows)).toEqual(sortedRows(fullSnapshot(f.worksheet, f.config, f.id).rows));

    f.worksheet.setCellValue({ row: 5, col: 6 }, 27);
    f.registry.markDirty(f.id);
    f.recompute.ensureFresh(f.id);
    expect(f.buildCalls).toBe(2); // Repeated edit uses the now-consistent partial path.
    expect(groupStateStore.get(f.id)?.rowToGroup.get(1)).toBe('string:East');
    expect(sortedRows(f.snapshots.get(f.id)?.rows)).toEqual(sortedRows(fullSnapshot(f.worksheet, f.config, f.id).rows));
  });

  test('one-based data RowIds align with source-array indices after the header and worksheet rows', () => {
    const f = fixture('sum');
    f.registry.markDirty(f.id);
    f.recompute.ensureFresh(f.id);
    const state = groupStateStore.get(f.id)!;
    const source = f.readSource();
    const relevantOffsets = getRelevantColumns(f.config).map((column) => column - sourceRange.start.col);

    const mapping = [
      { sourceArrayIndex: 1, rowId: 1, worksheetRow: 5 },
      { sourceArrayIndex: 2, rowId: 2, worksheetRow: 6 },
      { sourceArrayIndex: 3, rowId: 3, worksheetRow: 7 },
      { sourceArrayIndex: 4, rowId: 4, worksheetRow: 8 },
    ];
    expect(mapping.map(({ sourceArrayIndex, rowId, worksheetRow }) => ({
      sourceArrayIndex,
      rowId,
      worksheetRow,
      snapshot: state.rowSnapshots.get(rowId),
      storedHash: state.rowHashes.get(rowId),
      expectedHash: hashRowRelevant(source[sourceArrayIndex], relevantOffsets),
      group: state.rowToGroup.get(rowId),
    }))).toEqual(mapping.map(({ sourceArrayIndex, rowId }) => ({
      sourceArrayIndex,
      rowId,
      worksheetRow: sourceRange.start.row + sourceArrayIndex,
      snapshot: source[sourceArrayIndex],
      storedHash: hashRowRelevant(source[sourceArrayIndex], relevantOffsets),
      expectedHash: hashRowRelevant(source[sourceArrayIndex], relevantOffsets),
      group: `string:${source[sourceArrayIndex][0]}`,
    })));
    expect(state.rowSnapshots.has(0)).toBe(false); // Header is never a RowId.

    // Mutating source-array index 3 means RowId 3 / worksheet row 7.
    f.worksheet.setCellValue({ row: 7, col: 3 }, 'East');
    f.worksheet.setCellValue({ row: 7, col: 6 }, 33);
    f.registry.markDirty(f.id);
    f.recompute.ensureFresh(f.id);
    expect(f.buildCalls).toBe(1);
    expect(state.rowToGroup.get(3)).toBe('string:East');
    expect(state.rowSnapshots.get(3)).toEqual(f.readSource()[3]);
    expect(state.rowHashes.get(3)).toBe(hashRowRelevant(f.readSource()[3], relevantOffsets));
  });

  test('a stale irrelevant field is refreshed when a relevant value, group, or repeated edit touches that row', () => {
    const f = fixture('sum');
    f.registry.markDirty(f.id);
    f.recompute.ensureFresh(f.id);
    const state = groupStateStore.get(f.id)!;
    const relevantOffsets = getRelevantColumns(f.config).map(
      (column) => column - sourceRange.start.col,
    );
    const compareFull = () => {
      expect(sortedRows(f.snapshots.get(f.id)?.rows)).toEqual(sortedRows(fullSnapshot(f.worksheet, f.config, f.id).rows));
      expect(state.rowToGroup.get(1)).toBe(`string:${f.worksheet.getCellValue({ row: 5, col: 3 })}`);
      expect(state.rowHashes.get(1)).toBe(hashRowRelevant(f.readSource()[1], relevantOffsets));
    };

    f.worksheet.setCellValue({ row: 5, col: 5 }, 'fresh-note');
    f.registry.markDirty(f.id);
    f.recompute.ensureFresh(f.id);
    expect(state.rowSnapshots.get(1)?.[2]).toBe('w1'); // no relevant hash change
    compareFull();

    f.worksheet.setCellValue({ row: 5, col: 6 }, 11);
    f.registry.markDirty(f.id);
    f.recompute.ensureFresh(f.id);
    expect(state.rowSnapshots.get(1)?.[2]).toBe('fresh-note');
    expect(state.rowSnapshots.get(1)?.[3]).toBe(11);
    compareFull();

    f.worksheet.setCellValue({ row: 5, col: 3 }, 'East');
    f.registry.markDirty(f.id);
    f.recompute.ensureFresh(f.id);
    expect(state.rowSnapshots.get(1)?.[2]).toBe('fresh-note');
    expect(state.rowToGroup.get(1)).toBe('string:East');
    compareFull();

    f.worksheet.setCellValue({ row: 5, col: 6 }, 12);
    f.registry.markDirty(f.id);
    f.recompute.ensureFresh(f.id);
    expect(state.rowSnapshots.get(1)?.[2]).toBe('fresh-note');
    expect(state.rowSnapshots.get(1)?.[3]).toBe(12);
    compareFull();
  });

  test('missing group state falls back to a full build and repopulates state', () => {
    const f = fixture('sum');
    f.registry.markDirty(f.id);
    f.recompute.ensureFresh(f.id);
    expect(f.buildCalls).toBe(1);
    groupStateStore.delete(f.id);
    f.worksheet.setCellValue({ row: 5, col: 6 }, 17);
    f.registry.markDirty(f.id);
    f.recompute.ensureFresh(f.id);

    expect(f.buildCalls).toBe(2);
    expect(f.registry.get(f.id)?.dirty).toBe(false);
    expect(f.registry.get(f.id)?.rebuilding).toBe(false);
    expect(groupStateStore.get(f.id)?.rowSnapshots.get(1)?.[3]).toBe(17);
    expect(sortedRows(f.snapshots.get(f.id)?.rows)).toEqual(sortedRows(fullSnapshot(f.worksheet, f.config, f.id).rows));
  });

  test('nonreversible aggregation keeps using the full builder without partial group state', () => {
    const f = fixture('min');
    f.registry.markDirty(f.id);
    f.recompute.ensureFresh(f.id);
    expect(groupStateStore.get(f.id)).toBeUndefined();
    f.worksheet.setCellValue({ row: 5, col: 6 }, 7);
    f.registry.markDirty(f.id);
    f.recompute.ensureFresh(f.id);

    expect(f.buildCalls).toBe(2);
    expect(groupStateStore.get(f.id)).toBeUndefined();
    expect(f.registry.get(f.id)?.dirty).toBe(false);
    expect(f.registry.get(f.id)?.rebuilding).toBe(false);
    expect(sortedRows(f.snapshots.get(f.id)?.rows)).toEqual(sortedRows(fullSnapshot(f.worksheet, f.config, f.id).rows));
  });

  test('source extraction failure falls back to a full build that restores a consistent state', () => {
    const f = fixture('sum');
    f.registry.markDirty(f.id);
    f.recompute.ensureFresh(f.id);
    f.worksheet.setCellValue({ row: 5, col: 6 }, 19);
    f.failNextSourceRead();
    f.registry.markDirty(f.id);
    f.recompute.ensureFresh(f.id);

    expect(f.buildCalls).toBe(2);
    expect(f.registry.get(f.id)?.dirty).toBe(false);
    expect(f.registry.get(f.id)?.rebuilding).toBe(false);
    expect(groupStateStore.get(f.id)?.rowSnapshots.get(1)?.[3]).toBe(19);
    expect(sortedRows(f.snapshots.get(f.id)?.rows)).toEqual(sortedRows(fullSnapshot(f.worksheet, f.config, f.id).rows));
  });

  test('failed full builder preserves the prior snapshot and dirty state; a later retry repairs it', () => {
    const f = fixture('sum');
    f.registry.markDirty(f.id);
    f.recompute.ensureFresh(f.id);
    const priorSnapshot = f.snapshots.get(f.id);
    groupStateStore.delete(f.id);
    f.worksheet.setCellValue({ row: 5, col: 6 }, 21);
    f.failBuilderAfterStatePopulation(true);
    f.registry.markDirty(f.id);
    f.recompute.ensureFresh(f.id);

    expect(f.buildCalls).toBe(2);
    expect(f.snapshots.get(f.id)).toBe(priorSnapshot);
    expect(f.registry.get(f.id)?.dirty).toBe(true);
    expect(f.registry.get(f.id)?.rebuilding).toBe(false);
    expect(groupStateStore.get(f.id)).toBeUndefined();
    expect(sortedRows(f.snapshots.get(f.id)?.rows)).not.toEqual(sortedRows(fullSnapshot(f.worksheet, f.config, f.id).rows));

    f.failBuilderAfterStatePopulation(false);
    f.recompute.ensureFresh(f.id);
    expect(f.buildCalls).toBe(3);
    expect(f.registry.get(f.id)?.dirty).toBe(false);
    expect(f.registry.get(f.id)?.rebuilding).toBe(false);
    expect(groupStateStore.get(f.id)?.rowSnapshots.get(1)?.[3]).toBe(21);
    expect(sortedRows(f.snapshots.get(f.id)?.rows)).toEqual(sortedRows(fullSnapshot(f.worksheet, f.config, f.id).rows));
  });

  test('failed full snapshot publication discards state populated by the builder before a successful retry', () => {
    const storage = new FailOnceSnapshotStore();
    const f = fixture('sum', storage);
    f.registry.markDirty(f.id);
    f.recompute.ensureFresh(f.id);
    const priorSnapshot = f.snapshots.get(f.id);

    groupStateStore.delete(f.id);
    f.worksheet.setCellValue({ row: 5, col: 6 }, 22);
    storage.failNextSet = true;
    f.registry.markDirty(f.id);
    f.recompute.ensureFresh(f.id);

    expect(f.buildCalls).toBe(2);
    expect(f.snapshots.get(f.id)).toBe(priorSnapshot);
    expect(f.registry.get(f.id)?.dirty).toBe(true);
    expect(f.registry.get(f.id)?.rebuilding).toBe(false);
    expect(groupStateStore.get(f.id)).toBeUndefined();
    expect(sortedRows(f.snapshots.get(f.id)?.rows)).not.toEqual(sortedRows(fullSnapshot(f.worksheet, f.config, f.id).rows));

    f.recompute.ensureFresh(f.id);
    expect(f.buildCalls).toBe(3);
    expect(f.registry.get(f.id)?.dirty).toBe(false);
    expect(f.registry.get(f.id)?.rebuilding).toBe(false);
    expect(groupStateStore.get(f.id)?.rowSnapshots.get(1)?.[3]).toBe(22);
    expect(sortedRows(f.snapshots.get(f.id)?.rows)).toEqual(sortedRows(fullSnapshot(f.worksheet, f.config, f.id).rows));
  });

  test('calculated pivots retain full-builder failure recovery for builder and publication failures', () => {
    const storage = new FailOnceSnapshotStore();
    const f = fixture('sum', storage, new PivotRegistryImpl(), true);
    f.registry.markDirty(f.id);
    f.recompute.ensureFresh(f.id);
    const initial = f.snapshots.get(f.id);
    expect(initial?.rows.find((row) => row.Region === 'West')?.DoubleRevenue).toBe(80);

    f.worksheet.setCellValue({ row: 5, col: 6 }, 21);
    f.failBuilderAfterStatePopulation(true);
    f.registry.markDirty(f.id);
    f.recompute.ensureFresh(f.id);
    expect(f.snapshots.get(f.id)).toBe(initial);
    expect(f.registry.get(f.id)?.dirty).toBe(true);
    expect(f.registry.get(f.id)?.rebuilding).toBe(false);
    expect(groupStateStore.get(f.id)).toBeUndefined();

    f.failBuilderAfterStatePopulation(false);
    f.recompute.ensureFresh(f.id);
    const afterBuilderRetry = f.snapshots.get(f.id);
    expect(afterBuilderRetry).not.toBe(initial);
    expect(afterBuilderRetry?.rows.find((row) => row.Region === 'West')?.DoubleRevenue).toBe(102);
    expect(f.registry.get(f.id)?.dirty).toBe(false);
    expect(f.registry.get(f.id)?.rebuilding).toBe(false);

    f.worksheet.setCellValue({ row: 5, col: 6 }, 24);
    storage.failNextSet = true;
    f.registry.markDirty(f.id);
    f.recompute.ensureFresh(f.id);
    expect(f.snapshots.get(f.id)).toBe(afterBuilderRetry);
    expect(f.registry.get(f.id)?.dirty).toBe(true);
    expect(f.registry.get(f.id)?.rebuilding).toBe(false);
    expect(groupStateStore.get(f.id)).toBeUndefined();

    f.recompute.ensureFresh(f.id);
    expect(f.snapshots.get(f.id)).not.toBe(afterBuilderRetry);
    expect(f.snapshots.get(f.id)?.rows.find((row) => row.Region === 'West')?.DoubleRevenue).toBe(108);
    expect(f.registry.get(f.id)?.dirty).toBe(false);
    expect(f.registry.get(f.id)?.rebuilding).toBe(false);

    // A new source edit after a failed calculated-pivot build must be included
    // on the next retry; a subsequent clean query is a no-op.
    f.worksheet.setCellValue({ row: 5, col: 6 }, 27);
    f.failBuilderAfterStatePopulation(true);
    f.registry.markDirty(f.id);
    f.recompute.ensureFresh(f.id);
    expect(f.registry.get(f.id)?.dirty).toBe(true);
    expect(f.registry.get(f.id)?.rebuilding).toBe(false);
    expect(groupStateStore.get(f.id)).toBeUndefined();

    f.worksheet.setCellValue({ row: 5, col: 6 }, 28);
    f.failBuilderAfterStatePopulation(false);
    f.recompute.ensureFresh(f.id);
    expect(f.snapshots.get(f.id)?.rows.find((row) => row.Region === 'West')?.DoubleRevenue).toBe(116);
    expect(f.registry.get(f.id)?.dirty).toBe(false);
    expect(f.registry.get(f.id)?.rebuilding).toBe(false);
    expect(f.buildCalls).toBe(7);
    f.recompute.ensureFresh(f.id);
    expect(f.buildCalls).toBe(7);
  });

  test('failed incremental publication invalidates changed state so a later retry fully rebuilds current source', () => {
    const storage = new FailOnceSnapshotStore();
    const f = fixture('sum', storage);
    f.registry.markDirty(f.id);
    f.recompute.ensureFresh(f.id);
    const priorSnapshot = f.snapshots.get(f.id);
    const state = groupStateStore.get(f.id)!;

    f.worksheet.setCellValue({ row: 5, col: 6 }, 15);
    storage.failNextSet = true;
    f.failBuilder(true); // Partial publication fails first; full fallback then fails.
    f.registry.markDirty(f.id);
    f.recompute.ensureFresh(f.id);

    expect(storage.capturedState).toEqual({
      version: 0,
      rowHash: hashRowRelevant(f.readSource()[1], getRelevantColumns(f.config).map((column) => column - sourceRange.start.col)),
      rowSnapshot: f.readSource()[1],
      rowGroup: 'string:West',
      westRevenue: 45,
    });
    expect(f.snapshots.get(f.id)).toBe(priorSnapshot);
    expect(f.registry.get(f.id)?.dirty).toBe(true);
    expect(f.registry.get(f.id)?.rebuilding).toBe(false);
    expect(state.version).toBe(0); // Increment occurs after snapshot publication.
    expect(groupStateStore.get(f.id)).toBeUndefined();

    f.worksheet.setCellValue({ row: 5, col: 6 }, 18); // A relevant edit after failed publication is included too.
    f.failBuilder(false);
    f.recompute.ensureFresh(f.id);
    expect(f.registry.get(f.id)?.dirty).toBe(false);
    expect(f.registry.get(f.id)?.rebuilding).toBe(false);
    expect(f.buildCalls).toBe(3);
    expect(groupStateStore.get(f.id)?.rowSnapshots.get(1)?.[3]).toBe(18);
    expect(groupStateStore.get(f.id)?.groups.get('string:West')?.values.Revenue?.get()).toBe(48);
    expect(f.snapshots.get(f.id)).not.toBe(priorSnapshot);
    expect(sortedRows(f.snapshots.get(f.id)?.rows)).toEqual(sortedRows(fullSnapshot(f.worksheet, f.config, f.id).rows));
  });

  for (const aggregation of ['sum', 'count', 'average'] as AggregationType[]) {
    test(`${aggregation}: partial snapshots match a full rebuild across value changes, group migration, and repeated edits`, () => {
      const f = fixture(aggregation);
      f.registry.markDirty(f.id);
      f.recompute.ensureFresh(f.id);
      expect(f.buildCalls).toBe(1);

      const compareFull = () => {
        expect(sortedRows(f.snapshots.get(f.id)?.rows)).toEqual(sortedRows(fullSnapshot(f.worksheet, f.config, f.id).rows));
      };
      const state = groupStateStore.get(f.id)!;
      const initialVersion = state.version;
      const unchangedRowSnapshot = [...state.rowSnapshots.get(4)!];
      const unchangedRowHash = state.rowHashes.get(4);
      f.worksheet.setCellValue({ row: 5, col: 6 }, 15);
      f.registry.markDirty(f.id);
      f.recompute.ensureFresh(f.id);
      expect(state.version).toBe(initialVersion + 1);
      compareFull();

      // An unrelated column is excluded from the relevant hash; no group-state mutation is needed.
      const afterValueVersion = state.version;
      f.worksheet.setCellValue({ row: 6, col: 5 }, 'note-only');
      f.registry.markDirty(f.id);
      f.recompute.ensureFresh(f.id);
      expect(state.version).toBe(afterValueVersion);
      compareFull();

      // Move row 7 from West/2026 to East/2026 and update its value.
      f.worksheet.setCellValue({ row: 7, col: 3 }, 'East');
      f.worksheet.setCellValue({ row: 7, col: 6 }, 33);
      f.registry.markDirty(f.id);
      f.recompute.ensureFresh(f.id);
      expect(state.rowToGroup.get(3)).toBe('string:East');
      compareFull();

      // Repeated edit of the same row uses the snapshot written by the prior partial pass.
      f.worksheet.setCellValue({ row: 7, col: 6 }, 36);
      f.registry.markDirty(f.id);
      f.recompute.ensureFresh(f.id);
      expect(state.rowSnapshots.get(3)?.[3]).toBe(36);
      expect(f.buildCalls).toBe(1);
      compareFull();
      expect(state.rowSnapshots.get(4)).toEqual(unchangedRowSnapshot);
      expect(state.rowHashes.get(4)).toBe(unchangedRowHash);
      expect(state.rowToGroup.get(4)).toBe('string:South');
      const finalSource = f.readSource();
      const relevantOffsets = getRelevantColumns(f.config).map(
        (column) => column - sourceRange.start.col,
      );
      for (let rowId = 1; rowId <= finalSource.length - 1; rowId++) {
        expect(relevantOffsets.map((column) => state.rowSnapshots.get(rowId)?.[column]))
          .toEqual(relevantOffsets.map((column) => finalSource[rowId][column]));
      }
      // Irrelevant columns are excluded from row hashes, so their cached snapshot
      // values are intentionally not refreshed by a no-op partial pass.
      expect(finalSource[2][2]).toBe('note-only');
      expect(state.rowSnapshots.get(2)?.[2]).toBe('e1');
    });
  }
});
