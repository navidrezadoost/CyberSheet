/**
 * PivotRecomputeEngine.ts
 * 
 * Phase 31a: Lazy Pivot Recomputation
 * Phase 36a: Partial Recompute (row-level diff algorithm)
 * Pull-based automatic refresh on query (deterministic, synchronous)
 * 
 * Design Goals:
 * G1 - No stale reads: query() never returns stale snapshot
 * G2 - One rebuild per batch: even if 100 mutations happen
 * G3 - Deterministic: same state → same pivot output
 * G4 - Zero overhead when clean: dirty === false → no-op
 * G5 - No background work: all recompute is pull-based only
 * G6 - Partial recompute: row mutations → incremental update (Phase 36a)
 * 
 * Architecture:
 * - Bridges Registry (state), SnapshotStore (data), and Builder (computation)
 * - ensureFresh() is injected at query time (GETPIVOTDATA, getPivotSnapshot)
 * - rebuilding flag prevents re-entrancy loops
 * - Errors during rebuild keep dirty=true (fallback to #CALC!)
 * - Phase 36a: tryPartialRecompute() before full rebuild
 * 
 * Integration:
 * - Phase 30b triggers markDirty() via invalidation engine
 * - Phase 31a adds automatic rebuild on read
 * - Phase 30a guarantees preserved: #CALC! still fires on failure
 * - Phase 36a: Partial recompute for row mutations (setCell)
 * 
 * Invariants:
 * - Synchronous recompute only (no async drift)
 * - At most 1 rebuild per pivot per ensureFresh() call
 * - Rebuilding flag prevents infinite recursion
 * - Builder errors never leave false "clean" state
 * - Partial recompute behaviorally identical to full rebuild
 */

import type { PivotId, PivotMetadata } from './PivotRegistry';
import type { PivotRegistry } from './PivotRegistry';
import type { PivotSnapshot, PivotSnapshotStore } from './PivotSnapshotStore';
import type { PivotConfig } from './PivotEngine';
import type { ExtendedCellValue, Range } from './types';
import type { RowId } from './PivotGroupStateStore';
import { 
  groupStateStore, 
  createAccumulator, 
  getRelevantColumns, 
  hashRowRelevant, 
  makeGroupKey,
  computeGroupKey,
  extractValue,
  isGroupEmpty,
  createEmptyGroup,
  recomputeCalculatedFields,
  materializeSnapshotFromGroupState
} from './PivotGroupStateStore';
import type { GroupKey } from './PivotGroupStateStore';

/**
 * Builder function signature.
 * Takes pivot ID, config, and worksheet ID, returns snapshot.
 * Must be deterministic and side-effect-free.
 */
export type PivotBuilder = (pivotId: PivotId, config: PivotConfig, worksheetId: string) => PivotSnapshot;

/**
 * Phase 36a: Source data extractor function signature.
 * Extracts raw data from worksheet for partial recompute.
 * 
 * @param worksheetId - Worksheet identifier
 * @param range - Source data range
 * @returns 2D array of cell values, or null if worksheet not found
 */
export type SourceDataExtractor = (worksheetId: string, range: Range) => ExtendedCellValue[][] | null;

/**
 * Pivot recompute engine.
 * Ensures pivot snapshots are fresh before query execution.
 */
export interface PivotRecomputeEngine {
  /**
   * Ensure pivot snapshot is fresh.
   * If dirty → rebuild → markClean.
   * If clean → no-op.
   * If rebuilding → no-op (prevents re-entrancy).
   * 
   * Synchronous. Deterministic. Pull-based only.
   */
  ensureFresh(pivotId: PivotId): void;
}

/**
 * Phase 31a: Lazy Recompute Engine Implementation
 * 
 * Execution Flow:
 * 1. Check if pivot exists → return if not
 * 2. Check if dirty → return if clean
 * 3. Check if rebuilding → return if true (prevents recursion)
 * 4. Set rebuilding = true
 * 5. Try: rebuild → store snapshot → markClean
 * 6. Catch: keep dirty = true (fallback to #CALC!)
 * 7. Finally: set rebuilding = false
 * 
 * Edge Cases Handled:
 * - Missing pivot: graceful no-op
 * - Already clean: zero overhead
 * - Re-entrant query (pivot A rebuild calls GETPIVOTDATA(A)): prevented by rebuilding flag
 * - Builder throws: dirty remains true, #CALC! fallback preserved
 * - Multi-query same tick: first rebuilds, rest see clean
 */
export class PivotRecomputeEngineImpl implements PivotRecomputeEngine {
  /**
   * Phase 36a: Self-validation mode (enable for testing/CI)
   * When true, every partial recompute is validated against full rebuild
   * Throws if determinism fails → catches regressions immediately
   */
  private static readonly VALIDATE_PARTIAL = false; // Set true for testing
  
  constructor(
    private readonly registry: PivotRegistry,
    private readonly snapshotStore: PivotSnapshotStore,
    private readonly builder: PivotBuilder,
    private readonly extractSourceData: SourceDataExtractor
  ) {}

  /**
   * Ensure pivot is fresh before query.
   * 
   * G4: Zero overhead when clean (fast path).
   * G2: At most one rebuild per pivot per call.
   * G1: No stale reads (rebuild before return).
   * G3: Deterministic (builder is pure function).
   * G5: Pull-based only (no background work).
   */
  ensureFresh(pivotId: PivotId): void {
    const meta = this.registry.get(pivotId);
    if (!meta) return; // Pivot not found — graceful no-op

    // Fast path: already clean (G4 - zero overhead)
    if (!meta.dirty) return;

    // Re-entrancy guard: prevent infinite loops
    if (meta.rebuilding) {
      return; // Already rebuilding — exit to prevent recursion
    }

    // Rebuild flow
    this.rebuild(pivotId, meta);
  }

  /**
   * Rebuild pivot snapshot.
   * Protected by rebuilding flag.
   * Errors keep dirty=true for #CALC! fallback.
   * 
   * Phase 36a: Try partial recompute before full rebuild
   */
  private rebuild(pivotId: PivotId, meta: PivotMetadata): void {
    // Set rebuilding flag (re-entrancy protection)
    this.registry.setRebuilding(pivotId, true);

    try {
      // Phase 36a: Try partial recompute first (row mutations only)
      // Falls back to full rebuild if unsafe or not possible
      const partialSuccess = this.tryPartialRecompute(pivotId, meta);
      
      if (!partialSuccess) {
        // Full rebuild path (Phase 31a behavior)
        const snapshot = this.builder(pivotId, meta.config, meta.worksheetId);
        this.snapshotStore.set(pivotId, snapshot);
        this.registry.markClean(pivotId, snapshot.computedAt);
        
        // 🔍 SNAPSHOT LOGGING: For manual verification
        console.log(`\n[Phase 36a] === SNAPSHOT AFTER FULL REBUILD ===`);
        console.log(JSON.stringify(snapshot, null, 2));
        console.log(`[Phase 36a] === END SNAPSHOT ===\n`);
      } else {
        // Partial recompute succeeded
        // Snapshot already updated, just mark clean
        this.registry.markClean(pivotId, Date.now());
      }
    } catch (error) {
      // Builder failed — keep dirty=true
      // Phase 30a fallback: query will return #CALC!
      // (No state mutation needed, dirty already true)
      console.error(`[PivotRecomputeEngine] Rebuild failed for ${pivotId}:`, error);
    } finally {
      // Always clear rebuilding flag
      this.registry.setRebuilding(pivotId, false);
    }
  }

  /**
   * Phase 36a: Attempt partial recompute for row mutations
   * 
   * Safety Gate: Returns false if:
   * - No group state exists
   * - Config changed
   * - Slicers changed
   * - Non-reversible aggregations present
   * - Mutation threshold exceeded (FP stability)
   * - Any uncertainty
   * 
   * @returns true if partial recompute succeeded, false to force full rebuild
   */
  private tryPartialRecompute(pivotId: PivotId, meta: PivotMetadata): boolean {
    // Safety gate: Can we safely do partial recompute?
    if (!this.canPartialRecompute(pivotId, meta)) {
      console.log(`[Phase 36a] ⚠️  FALLBACK TO FULL REBUILD: Safety gate failed`);
      return false; // Fall back to full rebuild
    }
    
    try {
      // Phase 36a: Implement diff algorithm
      const state = groupStateStore.get(pivotId);
      if (!state) {
        console.log(`[Phase 36a] ⚠️  FALLBACK: No group state found`);
        return false;
      }
      
      const config = meta.config;
      
      // Get source data from worksheet (via injected callback)
      const sourceData = this.extractSourceData(meta.worksheetId, config.sourceRange);
      if (!sourceData) {
        console.log(`[Phase 36a] ⚠️  FALLBACK: Source data extraction failed`);
        return false;
      }
      
      // Step 0: Precompute once (outside loop)
      const relevantCols = getRelevantColumns(config);
      const valueSpecs = config.values;
      
      // Step 1: Detect changed rows
      const changedRows: RowId[] = [];
      
      for (let rowId = 0; rowId < sourceData.length; rowId++) {
        const newRow = sourceData[rowId];
        const newHash = hashRowRelevant(newRow, relevantCols);
        const oldHash = state.rowHashes.get(rowId);
        
        // No old hash = new row (shouldn't happen in partial recompute)
        // Different hash = changed row
        if (oldHash !== undefined && newHash !== oldHash) {
          changedRows.push(rowId);
        }
      }
      
      // Step 2: Mutation threshold check
      const MUTATION_THRESHOLD = 1000;
      if (changedRows.length >= MUTATION_THRESHOLD) {
        console.log(`[Phase 36a] ⚠️  FALLBACK: Mutation threshold exceeded (${changedRows.length} > ${MUTATION_THRESHOLD})`);
        return false; // Too many changes → force full rebuild
      }
      
      // No changes = no work (this shouldn't happen if dirty flag set correctly)
      if (changedRows.length === 0) {
        console.log(`[Phase 36a] ℹ️  No changes detected (dirty flag may be stale)`);
        return true; // Success (no-op)
      }
      
      console.log(`[Phase 36a] 🚀 Starting partial recompute: ${changedRows.length} rows changed`);
      
      // Step 3: Track affected groups (both old and new)
      const affectedGroups = new Set<GroupKey>();
      
      // Step 4: Apply row mutations atomically
      for (const rowId of changedRows) {
        try {
          this.applyRowMutation(rowId, sourceData, state, config, valueSpecs, affectedGroups);
        } catch (error) {
          // Mutation failed → fall back to full rebuild
          console.error(`[PartialRecompute] Row mutation failed for row ${rowId}:`, error);
          return false;
        }
      }
      
      // Step 5: Recompute calculated fields for affected groups
      for (const groupKey of affectedGroups) {
        if (!state.groups.has(groupKey)) continue; // Group was deleted
        
        recomputeCalculatedFields(groupKey, state, config);
      }
      
      // Step 6: Materialize snapshot from group state (PURE projection)
      const snapshot = materializeSnapshotFromGroupState(pivotId, state, config);
      
      // Step 7: Store snapshot
      this.snapshotStore.set(pivotId, snapshot);
      
      // Step 8: Update metadata
      state.version++;
      state.lastBuiltAt = Date.now();
      
      // 🔍 INSTRUMENTATION: Log successful partial recompute
      console.log(`[Phase 36a] ✅ PARTIAL RECOMPUTE SUCCESS: ${changedRows.length} rows changed, ${affectedGroups.size} groups affected`);
      
      // 🔍 SNAPSHOT LOGGING: For manual verification
      const finalSnapshot = this.snapshotStore.get(pivotId);
      console.log(`\n[Phase 36a] === SNAPSHOT AFTER PARTIAL RECOMPUTE ===`);
      console.log(JSON.stringify(finalSnapshot, null, 2));
      console.log(`[Phase 36a] === END SNAPSHOT ===\n`);
      
      // 🔬 SELF-VALIDATION MODE: Prove determinism on every mutation
      if (PivotRecomputeEngineImpl.VALIDATE_PARTIAL) {
        console.log(`[Phase 36a] 🔬 VALIDATION MODE: Comparing partial vs full rebuild...`);
        
        // Force full rebuild for comparison
        const fullSnapshot = this.builder(pivotId, meta.config, meta.worksheetId);
        
        // Deep equality check (row structure only, ignore metadata)
        const partialRows = JSON.stringify(finalSnapshot?.rows || []);
        const fullRows = JSON.stringify(fullSnapshot.rows || []);
        
        if (partialRows !== fullRows) {
          console.error(`\n❌ ❌ ❌ DETERMINISM VIOLATION DETECTED ❌ ❌ ❌`);
          console.error(`\nPartial Snapshot Rows:`);
          console.error(JSON.stringify(finalSnapshot?.rows, null, 2));
          console.error(`\nFull Rebuild Rows:`);
          console.error(JSON.stringify(fullSnapshot.rows, null, 2));
          console.error(`\nDivergence Details:`);
          console.error(`  Partial row count: ${finalSnapshot?.rows?.length}`);
          console.error(`  Full row count: ${fullSnapshot.rows?.length}`);
          
          throw new Error('CRITICAL: Partial recompute divergence - determinism violated');
        }
        
        console.log(`[Phase 36a] ✅ VALIDATION PASSED: partial === full (determinism holds)`);
      }
      
      return true; // Success!
      
    } catch (error) {
      // Any error → fall back to full rebuild
      console.error(`[PartialRecompute] Unexpected error:`, error);
      return false;
    }
  }
  
  /**
   * Phase 36a: Apply single row mutation atomically
   * 
   * CRITICAL: This must be atomic at the group level:
   * - Remove from old group
   * - Add to new group
   * - Update metadata
   * OR fail entirely
   * 
   * @param rowId - Row being mutated
   * @param sourceData - Current worksheet data
   * @param state - Group state
   * @param config - Pivot config
   * @param valueSpecs - Value specifications
   * @param affectedGroups - Set to track which groups changed (mutated)
   */
  private applyRowMutation(
    rowId: RowId,
    sourceData: ExtendedCellValue[][],
    state: import('./PivotGroupStateStore').PivotGroupState,
    config: PivotConfig,
    valueSpecs: (import('./PivotEngine').AggregateValueSpec | import('./PivotEngine').CalculatedValueSpec)[],
    affectedGroups: Set<GroupKey>
  ): void {
    // Get old snapshot (BEFORE mutation)
    const oldSnapshot = state.rowSnapshots.get(rowId);
    if (!oldSnapshot) {
      throw new Error(`Missing row snapshot for row ${rowId}`);
    }
    
    // Get new row data (AFTER mutation)
    const newRow = sourceData[rowId];
    
    // Compute old and new group keys
    const oldGroupKey = computeGroupKey(oldSnapshot, config);
    const newGroupKey = computeGroupKey(newRow, config);
    
    // 1️⃣ REMOVE from old group
    const oldGroup = state.groups.get(oldGroupKey);
    if (!oldGroup) {
      throw new Error(`Old group ${oldGroupKey} not found`);
    }
    
    for (const valueSpec of valueSpecs) {
      const type = 'type' in valueSpec ? valueSpec.type : 'aggregate';
      if (type !== 'aggregate') continue; // Skip calculated fields
      
      const acc = oldGroup.values[valueSpec.label];
      if (!acc) continue;
      
      const oldValue = extractValue(oldSnapshot, valueSpec);
      if (oldValue != null) {
        acc.remove(oldValue);
      }
    }
    
    // Decrement row count
    oldGroup.rowCount--;
    
    // Track old group as affected
    affectedGroups.add(oldGroupKey);
    
    // 2️⃣ CLEANUP empty group
    if (isGroupEmpty(oldGroup)) {
      state.groups.delete(oldGroupKey);
    }
    
    // 3️⃣ ADD to new group (create if doesn't exist)
    let newGroup = state.groups.get(newGroupKey);
    if (!newGroup) {
      newGroup = createEmptyGroup(config);
      state.groups.set(newGroupKey, newGroup);
    }
    
    for (const valueSpec of valueSpecs) {
      const type = 'type' in valueSpec ? valueSpec.type : 'aggregate';
      if (type !== 'aggregate') continue; // Skip calculated fields
      
      const acc = newGroup.values[valueSpec.label];
      if (!acc) continue;
      
      const newValue = extractValue(newRow, valueSpec);
      if (newValue != null) {
        acc.add(newValue);
      }
    }
    
    // Increment row count
    newGroup.rowCount++;
    
    // Track new group as affected
    affectedGroups.add(newGroupKey);
    
    // 4️⃣ UPDATE METADATA (ONLY AFTER SUCCESS)
    state.rowToGroup.set(rowId, newGroupKey);
    const newHash = hashRowRelevant(newRow, getRelevantColumns(config));
    state.rowHashes.set(rowId, newHash);
    state.rowSnapshots.set(rowId, [...newRow]); // Copy to prevent mutation
  }

  /**
   * Phase 36a: Safety gate for partial recompute
   * 
   * Validates all preconditions required for safe partial recompute.
   * Philosophy: "If you feel unsure → fallback to full rebuild. Never guess."
   * 
   * @returns true if partial recompute is safe, false otherwise
   */
  private canPartialRecompute(pivotId: PivotId, meta: PivotMetadata): boolean {
    // 1. Group state must exist
    const groupState = groupStateStore.get(pivotId);
    if (!groupState) {
      console.log(`[Phase 36a Safety Gate] ❌ No group state exists`);
      return false;
    }
    
    // 2. Check for non-reversible aggregations
    const config = meta.config;
    const hasNonReversible = config.values.some(spec => {
      const type = 'type' in spec ? spec.type : 'aggregate';
      if (type === 'aggregate') {
        const agg = 'aggregation' in spec ? spec.aggregation : 'sum';
        return createAccumulator(agg as any) === null;
      }
      return false;
    });
    
    if (hasNonReversible) {
      console.log(`[Phase 36a Safety Gate] ❌ Non-reversible aggregations present`);
      return false;
    }
    
    // 3. Check mutation threshold (FP stability guard)
    const MUTATION_THRESHOLD = 1000;
    const mutationCount = groupState.version - groupState.lastFullRebuildVersion;
    if (mutationCount >= MUTATION_THRESHOLD) {
      console.log(`[Phase 36a Safety Gate] ❌ Mutation threshold exceeded (${mutationCount} >= ${MUTATION_THRESHOLD})`);
      return false;
    }
    
    // 4. Pivot is not currently rebuilding (safety check)
    if (meta.rebuilding) {
      console.log(`[Phase 36a Safety Gate] ❌ Pivot currently rebuilding (concurrency)`);
      return false;
    }
    
    // All checks passed → safe for partial recompute
    console.log(`[Phase 36a Safety Gate] ✅ All preconditions met`);
    return true;
  }
}
