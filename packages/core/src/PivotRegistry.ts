/**
 * PivotRegistry.ts
 * 
 * Phase 28: Pivot Registry
 * Metadata-only storage for addressable pivot identity
 * 
 * Design Constraints:
 * - Metadata-only (NO computed data storage)
 * - No worksheet references (reproducibility guarantee)
 * - No implicit updates (explicit rebuild only)
 * - Disposal-safe (no memory leaks)
 * - Deterministic IDs (explicit assignment)
 */

import type { PivotConfig, AggregationType } from './PivotEngine';
import { createAccumulator } from './PivotGroupStateStore';

/**
 * Opaque pivot identifier.
 * Created explicitly, not derived.
 */
export type PivotId = string & { readonly __brand: 'PivotId' };

/**
 * Metadata-only registry entry.
 * Contains NO computed data, only configuration + identity.
 * 
 * Phase 30a: Added staleness tracking (dirty flag + lastBuiltAt).
 * Phase 31a: Added rebuilding flag for re-entrancy protection.
 * Phase 36a: Added hasNonReversibleAggregations flag.
 * 
 * FORBIDDEN:
 * - Storing PivotTable results
 * - Storing worksheet references
 * - Caching computed grids
 */
export interface PivotMetadata {
  readonly id: PivotId;
  readonly name: string; // User-visible name
  readonly config: PivotConfig; // Original configuration
  readonly sourceRange: string; // e.g., "A1:D100" (for refresh)
  readonly worksheetId: string; // Which worksheet owns this pivot
  readonly createdAt: number; // Timestamp (for ordering)
  readonly dirty: boolean; // Phase 30a: Staleness flag
  readonly lastBuiltAt?: number; // Phase 30a: Last successful build timestamp
  readonly rebuilding?: boolean; // Phase 31a: Re-entrancy guard (prevents infinite loops)
  readonly hasNonReversibleAggregations?: boolean; // Phase 36a: Partial recompute eligibility
}

/**
 * Minimal registry interface.
 * Pure CRUD, no computation.
 * 
 * Guarantees:
 * - Metadata-only storage
 * - No side effects
 * - Disposal-safe
 */
export interface PivotRegistry {
  /**
   * Register a pivot configuration.
   * Returns unique ID.
   */
  register(metadata: Omit<PivotMetadata, 'id' | 'createdAt'>): PivotId;

  /**
   * Retrieve metadata by ID.
   * Returns undefined if not found (no exceptions).
   */
  get(id: PivotId): PivotMetadata | undefined;

  /**
   * Check existence without retrieval.
   */
  has(id: PivotId): boolean;

  /**
   * Remove pivot from registry.
   * Does not delete any worksheet data.
   */
  unregister(id: PivotId): boolean;

  /**
   * List all registered pivots (optionally filtered by worksheet).
   */
  list(worksheetId?: string): PivotMetadata[];

  /**
   * Clear all registrations.
   * Called during dispose().
   */
  clear(): void;

  /**
   * Phase 30a: Staleness API
   * Mark pivot as dirty (needs rebuild).
   * Called when source data changes or config updated.
   */
  markDirty(id: PivotId): void;

  /**
   * Phase 30a: Staleness API
   * Mark pivot as clean after successful rebuild.
   * Records timestamp for cache validation.
   */
  markClean(id: PivotId, builtAt: number): void;

  /**
   * Phase 30a: Staleness API
   * Check if pivot needs rebuild.
   */
  isDirty(id: PivotId): boolean;

  /**
   * Phase 31a: Set rebuilding flag (re-entrancy protection).
   * Called before starting rebuild to prevent recursive queries.
   */
  setRebuilding(id: PivotId, rebuilding: boolean): void;

  /**
   * Phase 36a: Check if pivot is currently rebuilding.
   * Used in partial recompute safety gate.
   */
  isRebuilding(id: PivotId): boolean;
}

/**
 * Phase 28: Pivot Registry Implementation
 * 
 * Architectural Invariants:
 * - Registry stores NO computed data
 * - Registry holds NO worksheet references
 * - buildPivot() produces same result as rebuildPivot(id)
 * - No automatic recalculation on cell change
 * - dispose() clears all registry entries
 * - IDs are deterministic within session
 * - Zero dependencies beyond PivotConfig type
 */
export class PivotRegistryImpl implements PivotRegistry {
  private pivots = new Map<PivotId, PivotMetadata>();
  private idCounter = 0;

  /**
   * Register a pivot configuration.
   * Assigns sequential ID within session.
   * Phase 30a: New pivots start clean (dirty: false) assuming immediate build.
   * Phase 36a: Compute hasNonReversibleAggregations at registration.
   */
  register(meta: Omit<PivotMetadata, 'id' | 'createdAt' | 'dirty' | 'lastBuiltAt' | 'hasNonReversibleAggregations'>): PivotId {
    const id = `pivot-${++this.idCounter}` as PivotId;
    
    // Phase 36a: Check if any aggregations are non-reversible
    const hasNonReversible = this.checkNonReversibleAggregations(meta.config);
    
    this.pivots.set(id, {
      ...meta,
      id,
      createdAt: Date.now(),
      dirty: false, // Phase 30a: Assume immediate build on create
      lastBuiltAt: undefined, // Phase 30a: Set by markClean after first build
      hasNonReversibleAggregations: hasNonReversible, // Phase 36a
    });
    return id;
  }

  /**
   * Phase 36a: Check if config contains non-reversible aggregations
   * MIN/MAX/MEDIAN/STDEV → true (cannot do partial recompute)
   * SUM/COUNT/AVG → false (can do partial recompute)
   */
  private checkNonReversibleAggregations(config: PivotConfig): boolean {
    return config.values.some(spec => {
      // Check if this is an aggregate spec
      const type = 'type' in spec ? spec.type : 'aggregate';
      if (type === 'aggregate') {
        const agg = 'aggregation' in spec ? spec.aggregation : 'sum';
        // createAccumulator returns null for non-reversible types
        return createAccumulator(agg as AggregationType) === null;
      }
      return false; // Calculated fields don't block partial recompute
    });
  }

  /**
   * Retrieve metadata by ID.
   * Returns undefined if not found (no exceptions).
   */
  get(id: PivotId): PivotMetadata | undefined {
    return this.pivots.get(id);
  }

  /**
   * Check existence without retrieval.
   */
  has(id: PivotId): boolean {
    return this.pivots.has(id);
  }

  /**
   * Remove pivot from registry.
   * Does not delete any worksheet data.
   */
  unregister(id: PivotId): boolean {
    return this.pivots.delete(id);
  }

  /**
   * List all registered pivots (optionally filtered by worksheet).
   */
  list(worksheetId?: string): PivotMetadata[] {
    const all = Array.from(this.pivots.values());
    return worksheetId
      ? all.filter(p => p.worksheetId === worksheetId)
      : all;
  }

  /**
   * Clear all registrations.
   * Called during dispose().
   */
  clear(): void {
    this.pivots.clear();
    this.idCounter = 0; // Reset counter for determinism
  }

  /**
   * Phase 30a: Mark pivot as dirty (needs rebuild).
   * No-op if pivot doesn't exist.
   */
  markDirty(id: PivotId): void {
    const pivot = this.pivots.get(id);
    if (!pivot) return; // Graceful no-op for missing pivots

    this.pivots.set(id, {
      ...pivot,
      dirty: true,
    });
  }

  /**
   * Phase 30a: Mark pivot as clean after successful rebuild.
   * Records timestamp for future cache validation.
   * No-op if pivot doesn't exist.
   */
  markClean(id: PivotId, builtAt: number): void {
    const pivot = this.pivots.get(id);
    if (!pivot) return; // Graceful no-op for missing pivots

    this.pivots.set(id, {
      ...pivot,
      dirty: false,
      lastBuiltAt: builtAt,
    });
  }

  /**
   * Phase 30a: Check if pivot needs rebuild.
   * Returns true if dirty or pivot doesn't exist (conservative).
   */
  isDirty(id: PivotId): boolean {
    const pivot = this.pivots.get(id);
    return pivot?.dirty ?? true; // Unknown pivots are considered dirty
  }

  /**
   * Phase 31a: Set rebuilding flag (re-entrancy protection).
   * No-op if pivot doesn't exist.
   */
  setRebuilding(id: PivotId, rebuilding: boolean): void {
    const pivot = this.pivots.get(id);
    if (!pivot) return; // Graceful no-op for missing pivots

    this.pivots.set(id, {
      ...pivot,
      rebuilding,
    });
  }

  /**
   * Phase 36a: Check if pivot is currently rebuilding.
   * Returns false if pivot doesn't exist.
   */
  isRebuilding(id: PivotId): boolean {
    const pivot = this.pivots.get(id);
    return pivot?.rebuilding ?? false;
  }
