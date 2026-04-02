/**
 * PivotRecomputeEngine.ts
 * 
 * Phase 31a: Lazy Pivot Recomputation
 * Pull-based automatic refresh on query (deterministic, synchronous)
 * 
 * Design Goals:
 * G1 - No stale reads: query() never returns stale snapshot
 * G2 - One rebuild per batch: even if 100 mutations happen
 * G3 - Deterministic: same state → same pivot output
 * G4 - Zero overhead when clean: dirty === false → no-op
 * G5 - No background work: all recompute is pull-based only
 * 
 * Architecture:
 * - Bridges Registry (state), SnapshotStore (data), and Builder (computation)
 * - ensureFresh() is injected at query time (GETPIVOTDATA, getPivotSnapshot)
 * - rebuilding flag prevents re-entrancy loops
 * - Errors during rebuild keep dirty=true (fallback to #CALC!)
 * 
 * Integration:
 * - Phase 30b triggers markDirty() via invalidation engine
 * - Phase 31a adds automatic rebuild on read
 * - Phase 30a guarantees preserved: #CALC! still fires on failure
 * 
 * Invariants:
 * - Synchronous recompute only (no async drift)
 * - At most 1 rebuild per pivot per ensureFresh() call
 * - Rebuilding flag prevents infinite recursion
 * - Builder errors never leave false "clean" state
 */

import type { PivotId, PivotMetadata } from './PivotRegistry';
import type { PivotRegistry } from './PivotRegistry';
import type { PivotSnapshot, PivotSnapshotStore } from './PivotSnapshotStore';
import type { PivotConfig } from './PivotEngine';

/**
 * Builder function signature.
 * Takes pivot ID, config, and worksheet ID, returns snapshot.
 * Must be deterministic and side-effect-free.
 */
export type PivotBuilder = (pivotId: PivotId, config: PivotConfig, worksheetId: string) => PivotSnapshot;

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
  constructor(
    private readonly registry: PivotRegistry,
    private readonly snapshotStore: PivotSnapshotStore,
    private readonly builder: PivotBuilder
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
   */
  private rebuild(pivotId: PivotId, meta: PivotMetadata): void {
    // Set rebuilding flag (re-entrancy protection)
    this.registry.setRebuilding(pivotId, true);

    try {
      // Execute builder (pure function, deterministic)
      const snapshot = this.builder(pivotId, meta.config, meta.worksheetId);

      // Atomically: store snapshot → mark clean
      this.snapshotStore.set(pivotId, snapshot);
      this.registry.markClean(pivotId, snapshot.computedAt);
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
}
