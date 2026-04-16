/**
 * PivotInvalidationEngine.ts
 *
 * Phase 30b: Automatic pivot invalidation via mutation observation.
 *
 * Design:
 * - Subscribes to worksheet SheetEvents (cell-changed, structural ops)
 * - Uses PivotDependencyIndex for O(1) row lookup + column range check
 * - Batch API: beginBatch/endBatch deduplicates markDirty across ops
 * - No-op mutations (same value) never trigger invalidation
 * - Manual markDirty() remains available as always (Phase 30a preserved)
 *
 * Integration:
 * - Workbook subscribes per-worksheet automatically
 * - Undo/redo flows through same worksheet.setCellValue path — automatically
 *   covered (CommandManager replays via worksheet methods which emit events)
 * - Structural ops (sort, merge, filter) invalidate via range coverage
 *
 * Invariants:
 * - NEVER returns stale data silently (Phase 30a guarantee preserved)
 * - Deduplication: 1000 ops on same pivot → 1 markDirty
 * - Thread-safe batching (nested beginBatch/endBatch supported)
 * - Disposal-safe (unsubscribe cleans up listeners)
 */

import type { SheetEvents, Range, Address } from './types';
import type { PivotId } from './PivotRegistry';
import type { PivotRegistry } from './PivotRegistry';
import type { PivotDependencyIndex } from './PivotDependencyIndex';
import { colInRange } from './PivotDependencyIndex';

// ============================================================================
// Types
// ============================================================================

/**
 * Function to subscribe to worksheet events.
 * Matches worksheet.on() signature.
 * Returns unsubscribe function.
 */
export type EventSubscriber = (listener: (e: SheetEvents) => void) => () => void;

/**
 * Pivot invalidation engine.
 * Observes worksheet mutations and marks affected pivots as dirty.
 */
export interface PivotInvalidationEngine {
  /**
   * Begin a deduplication batch.
   * All pivot dirtyings within this batch are accumulated and flushed at endBatch.
   * Supports nesting (batches are reference-counted).
   */
  beginBatch(): void;

  /**
   * End batch and flush accumulated dirty pivots.
   * Only flushes at outermost endBatch (nested batches are safe).
   */
  endBatch(): void;

  /**
   * Observe a worksheet's events for mutation-driven invalidation.
   * Returns unsubscribe function for cleanup.
   */
  observeWorksheet(worksheetId: string, subscribe: EventSubscriber): () => void;

  /**
   * Stop observing a worksheet.
   * Automatically called on worksheet disposal.
   */
  unobserveWorksheet(worksheetId: string): void;

  /**
   * Force-invalidate all registered pivots.
   * Used for structural workbook ops (sheet rename, deletion).
   */
  invalidateAll(): void;

  /**
   * Dispose: remove all subscriptions.
   */
  dispose(): void;
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * Phase 30b: Pivot invalidation engine implementation.
 *
 * Batch deduplication algorithm:
 *   1. beginBatch() → increment batchDepth
 *   2. onEvent() → collect dirty pivots in pendingDirty set
 *   3. endBatch() → decrement batchDepth
 *      IF batchDepth === 0 → flush: markDirty(id) for all pending → clear
 *
 * Undo/redo handling:
 *   CommandManager.undo() calls command.undo()
 *   → worksheet.setCellValue() (inverse value)
 *   → no-op guard: only skips if same value
 *   → if different: emits 'cell-changed' with previousValue
 *   → engine.onEvent() picks it up automatically
 *   ✓ No special undo handling needed (flows naturally)
 */
export class PivotInvalidationEngineImpl implements PivotInvalidationEngine {
  private batchDepth = 0;
  private pendingDirty = new Set<PivotId>();
  private subscriptions = new Map<string, () => void>(); // worksheetId → unsubscribe

  constructor(
    private readonly index: PivotDependencyIndex,
    private readonly registry: PivotRegistry
  ) {}

  beginBatch(): void {
    this.batchDepth++;
  }

  endBatch(): void {
    if (this.batchDepth <= 0) return; // Defensive: ignore unbalanced endBatch
    this.batchDepth--;

    if (this.batchDepth === 0) {
      this.flush();
    }
  }

  observeWorksheet(worksheetId: string, subscribe: EventSubscriber): () => void {
    // Clean up any existing subscription for this worksheet
    this.unobserveWorksheet(worksheetId);

    const unsubscribe = subscribe((event) => this.onEvent(event));
    this.subscriptions.set(worksheetId, unsubscribe);

    return () => this.unobserveWorksheet(worksheetId);
  }

  unobserveWorksheet(worksheetId: string): void {
    const unsubscribe = this.subscriptions.get(worksheetId);
    if (unsubscribe) {
      unsubscribe();
      this.subscriptions.delete(worksheetId);
    }
  }

  invalidateAll(): void {
    const allPivots = this.index;
    // Access via registry which owns all pivot IDs
    // markDirty is a no-op for unknown IDs — safe to call broadly
    // We flush immediately (not batched) since this is an exceptional operation
    for (const id of this.getAllRegisteredPivotIds()) {
      this.registry.markDirty(id);
    }
  }

  dispose(): void {
    for (const unsubscribe of this.subscriptions.values()) {
      unsubscribe();
    }
    this.subscriptions.clear();
    this.pendingDirty.clear();
    this.batchDepth = 0;
  }

  // =========================================================================
  // Private: Event dispatch
  // =========================================================================

  /**
   * Route worksheet events to appropriate invalidation logic.
   *
   * SheetEvents handled:
   * - cell-changed: value mutation (with no-op guard via previousValue)
   * - sheet-mutated: covers sort, merge, filter, structural ops
   *   (emitted by setCF, sort, hideRow, showRow, setFilter, etc.)
   * - merge-added / merge-removed: explicit structural invalidation
   * - filter-changed, autofilter-range-changed: filter state changes
   * - sort-applied: full range invalidation
   *
   * Events NOT handled (not mutation sources):
   * - cell-click, cell-hover, cell-right-click (read-only interaction)
   * - style-changed (visual only, doesn't affect pivot data)
   * - freeze-panes-changed (display only)
   * - sheet-protection-changed (access control, not data)
   * - cycle-detected (formula engine concern)
   */
  private onEvent(event: SheetEvents): void {
    switch (event.type) {
      case 'cell-changed':
        this.onCellChanged(event.address, event.previousValue, event.cell.value);
        break;

      case 'sort-applied':
        // Full sort region invalidation
        this.invalidateRange(
          event.startRow,
          event.endRow,
          event.startCol,
          event.endCol
        );
        break;

      case 'merge-added':
        this.invalidateRange(
          event.region.startRow,
          event.region.endRow,
          event.region.startCol,
          event.region.endCol
        );
        break;

      case 'merge-removed':
        this.invalidateRange(
          event.region.startRow,
          event.region.endRow,
          event.region.startCol,
          event.region.endCol
        );
        break;

      case 'filter-changed':
        // Column filter change affects the entire column within any pivot range
        this.invalidateColumn(event.col);
        break;

      case 'row-hidden':
      case 'row-shown':
        // Row visibility change invalidates pivots covering that row
        this.invalidateRow(event.row);
        break;

      case 'col-hidden':
      case 'col-shown':
        // Column visibility: no row to target, invalidate all pivots
        // (conservative: column index could narrow this in Phase 31+)
        this.invalidateAllPending();
        break;

      case 'sheet-mutated':
        // Generic structural mutation (sort ranges, CF changes, etc.)
        // No precise range info available — invalidate all pivots
        this.invalidateAllPending();
        break;

      // Explicitly ignored — no data impact:
      case 'style-changed':
      case 'cell-click':
      case 'cell-double-click':
      case 'cell-right-click':
      case 'cell-hover':
      case 'cell-hover-end':
      case 'freeze-panes-changed':
      case 'sheet-protection-changed':
      case 'cycle-detected':
      case 'comment-added':
      case 'comment-updated':
      case 'comment-deleted':
      case 'icon-changed':
      case 'autofilter-range-changed':
        break;

      default:
        break;
    }
  }

  /**
   * Handle cell value change.
   * No-op guard: previousValue === newValue → skip.
   * Note: setCellValue already short-circuits before emitting,
   * but events from other sources (patches replayed without no-op guard)
   * may still carry equal values — defensive check here.
   */
  private onCellChanged(
    address: Address,
    previousValue: unknown,
    newValue: unknown
  ): void {
    // Defensive no-op guard (primary guard is in setCellValue)
    if (previousValue === newValue) return;

    this.invalidateCell(address.row, address.col);
  }

  /**
   * Invalidate pivots covering a specific cell.
   * O(1) row lookup + O(k) column check.
   */
  private invalidateCell(row: number, col: number): void {
    const candidates = this.index.getPivotsForRow(row);
    for (const pivotId of candidates) {
      const range = this.index.getRange(pivotId);
      if (range && colInRange(col, range)) {
        this.accumulate(pivotId);
      }
    }
  }

  /**
   * Invalidate pivots covering any row in a range.
   * Used for structural ops (sort, merge) with full range info.
   */
  private invalidateRange(
    startRow: number,
    endRow: number,
    startCol: number,
    endCol: number
  ): void {
    const seen = new Set<PivotId>();

    for (let row = startRow; row <= endRow; row++) {
      const candidates = this.index.getPivotsForRow(row);
      for (const pivotId of candidates) {
        if (seen.has(pivotId)) continue;
        const range = this.index.getRange(pivotId);
        // Check if range overlaps with mutation's column span
        if (range && startCol <= range.c2 && endCol >= range.c1) {
          seen.add(pivotId);
          this.accumulate(pivotId);
        }
      }
    }
  }

  /**
   * Invalidate pivots covering a specific row.
   * Used for row-hide/show ops.
   */
  private invalidateRow(row: number): void {
    const candidates = this.index.getPivotsForRow(row);
    for (const pivotId of candidates) {
      this.accumulate(pivotId);
    }
  }

  /**
   * Invalidate pivots containing a specific column.
   * Used for filter-changed.
   */
  private invalidateColumn(col: number): void {
    // Must scan all registered pivots for column intersection
    // This is O(n) but filter-changed is rare and pivot count is small
    for (const [pivotId, range] of this.getAllRanges()) {
      if (colInRange(col, range)) {
        this.accumulate(pivotId);
      }
    }
  }

  /**
   * Accumulate all pivots for structural sheet-wide ops.
   * Conservative: when no range info available.
   */
  private invalidateAllPending(): void {
    for (const pivotId of this.getAllRegisteredPivotIds()) {
      this.accumulate(pivotId);
    }
  }

  /**
   * Add to pending dirty set (deduplication accumulator).
   * If not batching, flush immediately.
   */
  private accumulate(pivotId: PivotId): void {
    if (this.batchDepth > 0) {
      // Inside batch: accumulate for deduplication
      this.pendingDirty.add(pivotId);
    } else {
      // Outside batch: mark immediately (single-op path)
      this.registry.markDirty(pivotId);
    }
  }

  /**
   * Flush pending dirty pivots → markDirty each once.
   * Called at outermost endBatch().
   */
  private flush(): void {
    for (const pivotId of this.pendingDirty) {
      this.registry.markDirty(pivotId);
    }
    this.pendingDirty.clear();
  }

  /**
   * Get all registered pivot IDs from the index.
   * Used for full-sheet invalidation.
   */
  private getAllRegisteredPivotIds(): PivotId[] {
    // Registry.list() returns all PivotMetadata — extract IDs
    return this.registry.list().map(m => m.id);
  }

  /**
   * Get all ranges from the index.
   * Used for column-based invalidation (requires iterating all ranges).
   */
  private getAllRanges(): Map<PivotId, import('./PivotDependencyIndex').NormalizedRange> {
    const result = new Map<PivotId, import('./PivotDependencyIndex').NormalizedRange>();
    for (const pivotId of this.getAllRegisteredPivotIds()) {
      const range = this.index.getRange(pivotId);
      if (range) result.set(pivotId, range);
    }
    return result;
  }
}
