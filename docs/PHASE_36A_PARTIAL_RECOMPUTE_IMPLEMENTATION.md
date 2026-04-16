# Phase 36a: Partial Recompute — Implementation Summary

**Status**: Infrastructure Complete, Diff Algorithm Pending  
**Date**: 2025-01-XX  
**Objective**: Transform pivot system from O(N) per change → O(Δ) per change via incremental updates

---

## Core Principle

> **"For every mutation, the system behaves exactly as if the pivot was rebuilt from scratch—only faster"**

Partial recompute is NOT an approximation. It's a performance optimization that guarantees identical semantics to full rebuild.

---

## Architecture Overview

### Component Map

```
┌─────────────────────────────────────────────────────────────┐
│                    PHASE 36A SYSTEM                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PivotGroupStateStore (NEW)                                │
│  ├── Reversible Accumulators (SUM, COUNT, AVG)            │
│  ├── FNV-1a Row Hashing                                   │
│  ├── Group State Management                               │
│  └── Row Snapshot Storage                                 │
│                                                             │
│  PivotEngine (EXTENDED)                                    │
│  └── populateGroupState() - Build state after full rebuild │
│                                                             │
│  PivotRecomputeEngine (EXTENDED)                           │
│  ├── canPartialRecompute() - Safety gate (4 checks)       │
│  └── tryPartialRecompute() - Diff algorithm (TODO)        │
│                                                             │
│  PivotRegistry (EXTENDED)                                  │
│  ├── hasNonReversibleAggregations - Metadata flag         │
│  └── isRebuilding() - Concurrency safety                  │
│                                                             │
│  Workbook (EXTENDED)                                       │
│  ├── createPivot() - NEW convenience method               │
│  ├── getPivotSnapshot() - NEW lazy evaluation trigger     │
│  └── deletePivot() - Extended with group state cleanup    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### 1. PivotGroupStateStore (NEW FILE: ~387 lines)

**Purpose**: Core incremental state management for partial recompute

**Key Components**:

#### Reversible Accumulators
```typescript
class SumAccumulator implements AggregateAccumulator {
  add(value: number): this.sum += value
  remove(value: number): this.sum -= value  // Algebraically reversible
  get(): this.sum
  reset(): this.sum = 0
}

class CountAccumulator implements AggregateAccumulator {
  add(): this.count++
  remove(): this.count--  // Reversible
  get(): this.count
  reset(): this.count = 0
}

class AvgAccumulator implements AggregateAccumulator {
  add(value: number): { this.sum += value; this.count++; }
  remove(value: number): { this.sum -= value; this.count--; }  // Reversible via sum+count
  get(): this.sum / this.count
  reset(): { this.sum = 0; this.count = 0; }
}
```

**Non-Reversible Aggregators** (force full rebuild):
- MIN, MAX (can't remove without full scan)
- MEDIAN (order-dependent)
- STDEV (floating-point instability)

#### Hash Function (FNV-1a)
```typescript
function hashRowRelevant(row: ExtendedCellValue[], relevantCols: number[]): number {
  let hash = 2166136261; // FNV offset basis (32-bit)
  
  for (const col of relevantCols) {
    const value = row[col];
    const str = value == null ? '' : String(value);
    
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = (hash * 16777619) >>> 0; // FNV prime * hash (unsigned 32-bit)
    }
  }
  
  return hash;
}
```

**Why FNV-1a?**:
- Fast (single pass, simple operations)
- Good distribution for small inputs
- Collision-resistant for typical pivot data
- 32-bit → memory efficient

#### GroupKey Format
```typescript
function makeGroupKey(dimensions: Map<string, ExtendedCellValue>): GroupKey {
  const parts: string[] = [];
  
  for (const [field, value] of dimensions) {
    const type = typeof value;
    const valueStr = value == null ? 'null' : String(value);
    parts.push(`${type}:${valueStr}`);
  }
  
  return parts.join('|') as GroupKey;
}
```

**Example**: `"string:West|string:A"` → collision-proof (includes type)

#### State Structure
```typescript
interface PivotGroupState {
  // Core structures
  groups: Map<GroupKey, GroupAccumulators>;        // Incremental accumulators per group
  rowToGroup: Map<RowId, GroupKey>;                // Fast row → group lookup
  rowHashes: Map<RowId, number>;                   // FNV-1a hashes for change detection
  rowSnapshots: Map<RowId, ExtendedCellValue[]>;  // Pre-mutation snapshots
  
  // Metadata
  version: number;                                  // Incremented on each mutation
  lastFullRebuildVersion: number;                  // Reset to 0 after full rebuild
  lastBuiltAt: number;                             // Timestamp
}
```

### 2. PivotEngine Extensions

**New Method**: `populateGroupState(pivotId, config, sourceData)`

**When Called**: After every full rebuild (in `workbook.buildPivot()`)

**What It Does**:
1. Checks for non-reversible aggregators → skip if found
2. Creates empty group state
3. Iterates over source rows:
   - Computes dimension values (group membership)
   - Builds GroupKey
   - Creates/updates accumulators for this group
   - Adds row value to each accumulator
   - Stores row→group mapping
   - Computes and stores row hash
4. Stores state in global `groupStateStore`

**Code Location**: [PivotEngine.ts](../packages/core/src/PivotEngine.ts) lines ~XXX-XXX

### 3. PivotRecomputeEngine Extensions

**New Method**: `canPartialRecompute(pivotId): boolean`

**Safety Gates** (all must pass):
1. Group state exists for this pivot
2. Only reversible aggregators in config
3. Mutation count < 1000 (floating-point stability threshold)
4. Not currently rebuilding (concurrency safety)

**New Method**: `tryPartialRecompute(pivotId, config, worksheetId): boolean`

**Status**: ⚠️ **TODO - Currently returns false (always falls back)**

**Planned Algorithm**:
```typescript
function tryPartialRecompute(pivotId, config, worksheetId): boolean {
  // 1. Safety check
  if (!canPartialRecompute(pivotId)) return false;
  
  // 2. Get group state
  const state = groupStateStore.get(pivotId);
  const worksheet = getWorksheet(worksheetId);
  const sourceData = extractSourceData(worksheet, config.sourceRange);
  
  // 3. Detect changed rows
  const changedRows: RowId[] = [];
  for (let rowIdx = 0; rowIdx < sourceData.length; rowIdx++) {
    const newHash = hashRowRelevant(sourceData[rowIdx], getRelevantColumns(config));
    const oldHash = state.rowHashes.get(rowIdx);
    
    if (newHash !== oldHash) {
      changedRows.push(rowIdx);
    }
  }
  
  // 4. Mutation threshold check
  if (changedRows.length > 1000) {
    return false; // Fall back to full rebuild
  }
  
  // 5. Apply incremental updates
  for (const rowId of changedRows) {
    const oldSnapshot = state.rowSnapshots.get(rowId);
    const newRow = sourceData[rowId];
    
    // Compute old and new group membership
    const oldGroupKey = computeGroupKey(oldSnapshot, config);
    const newGroupKey = computeGroupKey(newRow, config);
    
    // Remove from old group
    const oldGroup = state.groups.get(oldGroupKey);
    for (const [valueLabel, accumulator] of oldGroup.entries()) {
      const oldValue = extractValue(oldSnapshot, valueLabel, config);
      accumulator.remove(oldValue);
    }
    
    // Add to new group
    let newGroup = state.groups.get(newGroupKey);
    if (!newGroup) {
      newGroup = createEmptyGroup(config);
      state.groups.set(newGroupKey, newGroup);
    }
    
    for (const [valueLabel, accumulator] of newGroup.entries()) {
      const newValue = extractValue(newRow, valueLabel, config);
      accumulator.add(newValue);
    }
    
    // Update metadata
    state.rowToGroup.set(rowId, newGroupKey);
    state.rowHashes.set(rowId, hashRowRelevant(newRow, getRelevantColumns(config)));
    state.rowSnapshots.set(rowId, newRow);
  }
  
  // 6. Recompute calculated fields (only for changed groups)
  const affectedGroups = new Set<GroupKey>();
  for (const rowId of changedRows) {
    affectedGroups.add(state.rowToGroup.get(rowId)!);
  }
  
  for (const groupKey of affectedGroups) {
    recomputeCalculatedFields(groupKey, state, config);
  }
  
  // 7. Materialize snapshot from group state
  const snapshot = materializeSnapshotFromGroupState(pivotId, state, config);
  pivotSnapshotStore.set(pivotId, snapshot);
  
  // 8. Update metadata
  state.version++;
  
  return true; // Success - partial update applied
}
```

**Code Location**: [PivotRecomputeEngine.ts](../packages/core/src/PivotRecomputeEngine.ts) lines ~XXX-XXX

### 4. PivotRegistry Extensions

**New Metadata**: `hasNonReversibleAggregations?: boolean`

**Purpose**: Cache whether pivot uses MIN/MAX/MEDIAN/STDEV

**Computed At**: Registration time (in `checkNonReversibleAggregations()`)

**New Method**: `isRebuilding(): boolean`

**Purpose**: Prevent concurrent rebuilds (safety gate for partial recompute)

### 5. Workbook Extensions

**New Method**: `createPivot(name, worksheetId, config): PivotId`

**Purpose**: Convenience API for tests and consumers

**What It Does**:
1. Registers pivot in registry
2. Builds initial snapshot via `buildPivot()`
3. Stores snapshot in store
4. Marks pivot clean
5. Returns pivot ID

**New Method**: `getPivotSnapshot(pivotId): PivotSnapshot | undefined`

**Purpose**: Lazy evaluation trigger

**What It Does**:
1. Check if pivot dirty
2. If dirty → trigger rebuild (via `pivotRecomputeEngine.rebuild()`)
3. Return snapshot from store

**Extended Method**: `deletePivot(pivotId)`

**Added**: `groupStateStore.delete(pivotId)` for memory cleanup

---

## Safety Mechanisms

### 1. Mutation Threshold (1000 changes)

**Why 1000?**:
- Floating-point arithmetic has ε ≈ 1e-15 error per operation
- After 1000 add/remove operations: cumulative error ≈ 1e-12
- Excel tolerance: ≈ 1e-10 for equality checks
- 1000 gives 100x safety margin

**Fallback**: If more than 1000 rows changed → force full rebuild

### 2. Algebraic Reversibility Check

**Non-Reversible Aggregators**:
- `MIN` / `MAX`: Removing current min/max requires full scan
- `MEDIAN`: Order-dependent, can't incrementally update
- `STDEV`: σ² = E[X²] - E[X]² → floating-point instability

**Safety**: If any non-reversible aggregator found → skip group state population

### 3. Concurrency Protection

**Problem**: Concurrent rebuild could corrupt group state

**Solution**: `canPartialRecompute()` checks `registry.isRebuilding()`

### 4. Hash Collision Handling

**FNV-1a**: 32-bit → ~1/4 billion collision probability

**Mitigation**: If hash matches but row different → snapshot comparison

**Fallback**: If snapshot also matches → treat as no-op

---

## Testing Strategy

### Test Suite: `pivot-partial-recompute.test.ts` (564 lines, 24+ tests)

#### §1: Basic Partial Update (3 tests)
- Single cell change updates aggregates correctly
- Multiple aggregations update correctly
- AVG aggregation updates correctly (sum+count based)

#### §2: Group Migration (2 tests)
- Row changes group updates both groups correctly
- New group creation works

#### §3: No-op Mutations (1 test)
- Same value doesn't trigger recompute

#### §4: Group Deletion (1 test)
- Last row removal cleans up group

#### §5: Multi-row Batch (1 test)
- Batch mutations handled correctly

#### §6: Calculated Fields (1 test)
- Recompute after partial update

#### §7: Fallback Safety (2 tests)
- Non-reversible aggregators force full rebuild
- Config changes force full rebuild

#### §8: Determinism (2 tests)
- Partial recompute == full rebuild (equivalence)
- Multiple mutation paths → same result

#### §9: Enhanced Chaos Test (2 tests)
- 1000 random mutations with validation every 25 iterations
- Verify temporal correctness (always matches full rebuild)

**Test Status**: ⚠️ **Created but not yet run** (infrastructure complete, diff algorithm pending)

---

## Performance Characteristics

### Full Rebuild: O(N)
- N = number of source rows
- Every mutation → scan all rows

### Partial Recompute: O(Δ)
- Δ = number of changed rows
- Typical case: Δ << N (e.g., 1 row changed out of 100K)

### Example Scenarios

| Scenario | Source Rows | Changed Rows | Full Rebuild Time | Partial Recompute Time | Speedup |
|----------|-------------|--------------|-------------------|------------------------|---------|
| Single cell edit | 100,000 | 1 | 500ms | 0.5ms | 1000x |
| 100 cell batch | 100,000 | 100 | 500ms | 50ms | 10x |
| Column fill | 100,000 | 100,000 | 500ms | 500ms (falls back) | 1x |

### Memory Overhead

Per pivot:
- Group state: ~100 bytes per group (accumulators + metadata)
- Row hashes: 4 bytes per row (FNV-1a)
- Row snapshots: ~N * cols * 8 bytes (value snapshots)

**Example**: 10K rows, 4 cols, 100 groups
- Groups: 100 * 100 = 10KB
- Hashes: 10K * 4 = 40KB
- Snapshots: 10K * 4 * 8 = 320KB
- **Total**: ~370KB (acceptable)

**Mitigation**: Snapshots only stored if partial recompute enabled

---

## Files Modified/Created

### New Files
1. **`packages/core/src/PivotGroupStateStore.ts`** (~387 lines)
   - Core state management
   - Reversible accumulators
   - FNV-1a hashing
   - GroupKey generation

2. **`packages/core/__tests__/pivot-partial-recompute.test.ts`** (~564 lines)
   - Comprehensive test suite
   - 9 test sections
   - 24+ test cases

### Modified Files
1. **`packages/core/src/PivotEngine.ts`**
   - Added `populateGroupState()` method
   - Imports from PivotGroupStateStore

2. **`packages/core/src/PivotRecomputeEngine.ts`**
   - Added `canPartialRecompute()` safety gate
   - Added `tryPartialRecompute()` stub (TODO)
   - Extended `rebuild()` to try partial first

3. **`packages/core/src/PivotRegistry.ts`**
   - Added `hasNonReversibleAggregations` metadata
   - Added `checkNonReversibleAggregations()` method
   - Added `isRebuilding()` method

4. **`packages/core/src/workbook.ts`**
   - Added `createPivot()` convenience method
   - Added `getPivotSnapshot()` lazy evaluation trigger
   - Extended `deletePivot()` with group state cleanup
   - Added `extractSourceData()` helper

---

## Next Steps (Priority Order)

### 1. Implement Diff Algorithm (HIGH PRIORITY)
**File**: `PivotRecomputeEngine.ts`  
**Method**: `tryPartialRecompute()`  
**Status**: Currently returns false (always falls back)

**Implementation Plan**:
1. Extract changed rows (hash comparison)
2. Apply incremental updates (remove from old group, add to new)
3. Recompute calculated fields for affected groups
4. Materialize snapshot from group state
5. Update metadata (version, timestamp)

### 2. Run Test Suite
**File**: `pivot-partial-recompute.test.ts`  
**Command**: `npm test -- pivot-partial-recompute.test.ts`

**Expected Issues**:
- Snapshot structure mismatch (tests expect `.data`, actual is `.rows`)
- Helper functions may need adjustment
- Edge cases discovered during execution

### 3. Add Snapshot Materialization
**File**: `PivotGroupStateStore.ts`  
**Function**: `materializeSnapshotFromGroupState(pivotId, state, config): PivotSnapshot`

**Purpose**: Convert incremental group state back to snapshot format

### 4. Add Calculated Field Recompute
**File**: `PivotGroupStateStore.ts` or `PivotEngine.ts`  
**Function**: `recomputeCalculatedFields(groupKey, state, config): void`

**Purpose**: Update calculated columns after partial update

### 5. Performance Benchmarks
**File**: New `pivot-partial-recompute.bench.ts`

**Scenarios**:
- 1K rows, 1 change
- 10K rows, 100 changes
- 100K rows, 1000 changes (threshold)
- Compare partial vs full rebuild

### 6. Documentation
- Update FORMULA_100_PERCENT_ROADMAP.md
- Add Phase 36a completion summary
- Document API changes

---

## API Changes

### New Public Methods

```typescript
// Workbook
class Workbook {
  createPivot(name: string, worksheetId: string, config: PivotConfig): PivotId;
  getPivotSnapshot(pivotId: PivotId): PivotSnapshot | undefined;
}
```

### New Types

```typescript
// PivotGroupStateStore.ts
export type RowId = number;
export type GroupKey = string & { readonly __brand: 'GroupKey' };

export interface PivotGroupState {
  groups: Map<GroupKey, GroupAccumulators>;
  rowToGroup: Map<RowId, GroupKey>;
  rowHashes: Map<RowId, number>;
  rowSnapshots: Map<RowId, ExtendedCellValue[]>;
  version: number;
  lastFullRebuildVersion: number;
  lastBuiltAt: number;
}

export interface AggregateAccumulator {
  add(value: number): void;
  remove(value: number): void;
  get(): number;
  reset(): void;
}
```

---

## Architectural Invariants

1. **Semantic Equivalence**: `partialRecompute(pivot) ≡ fullRebuild(pivot)`
   - Partial update MUST produce identical results to full rebuild
   - Any divergence is a bug (caught by §8 determinism tests)

2. **State Consistency**: Group state MUST match snapshot
   - `materializeSnapshot(groupState) === snapshot`
   - Validated after every partial update

3. **Memory Bounded**: Group state memory proportional to source data
   - No unbounded growth
   - Cleaned up on pivot deletion

4. **Fallback Safety**: When uncertain → full rebuild
   - Better slow and correct than fast and wrong
   - No "best-effort" approximations

5. **Concurrency Safety**: No concurrent modifications
   - Single-threaded assumption (JavaScript)
   - `isRebuilding()` flag prevents reentrancy

---

## Known Limitations

1. **Non-Reversible Aggregators**: MIN, MAX, MEDIAN, STDEV force full rebuild
   - No incremental update possible
   - Could add separate code path for these (future work)

2. **Mutation Threshold**: 1000 changes → full rebuild
   - Conservative (could raise to 10K with testing)
   - Necessary for floating-point stability

3. **Memory Overhead**: Row snapshots stored in memory
   - ~N * cols * 8 bytes per pivot
   - Could compress or page to disk (future work)

4. **Single Workbook**: Group state not serialized
   - Lost on workbook close
   - Could persist for session recovery (future work)

---

## Success Criteria

✅ **Infrastructure Complete**:
- [x] PivotGroupStateStore implemented
- [x] Type system complete
- [x] Safety gates in place
- [x] Registry metadata extended
- [x] Workbook integration complete
- [x] Test suite created
- [x] Compilation passes

⚠️ **Diff Algorithm Pending**:
- [ ] tryPartialRecompute() implementation
- [ ] Snapshot materialization
- [ ] Calculated field recompute
- [ ] Test suite execution
- [ ] Performance validation

---

## Commit Readiness

**Status**: Infrastructure ready, but not yet functional

**Blocking Issues**:
1. Diff algorithm not implemented (tryPartialRecompute returns false)
2. Tests not yet run
3. No performance benchmarks

**Recommendation**: Continue implementation → complete diff algorithm → run tests → commit

---

## References

- **Phase 35**: Slicers (prerequisite, completed)
- **Phase 31a**: Lazy Evaluation (recompute engine)
- **Phase 29**: Snapshot Store (pivot caching)
- **Phase 28**: Pivot Registry (metadata management)

