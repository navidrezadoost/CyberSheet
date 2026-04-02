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

import type { PivotConfig } from './PivotEngine';

/**
 * Opaque pivot identifier.
 * Created explicitly, not derived.
 */
export type PivotId = string & { readonly __brand: 'PivotId' };

/**
 * Metadata-only registry entry.
 * Contains NO computed data, only configuration + identity.
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
   */
  register(meta: Omit<PivotMetadata, 'id' | 'createdAt'>): PivotId {
    const id = `pivot-${++this.idCounter}` as PivotId;
    this.pivots.set(id, {
      ...meta,
      id,
      createdAt: Date.now(),
    });
    return id;
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
}
