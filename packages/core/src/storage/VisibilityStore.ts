/**
 * VisibilityStore.ts — Phase 3: Hidden Row/Column Model
 *
 * Architectural contract:
 *   - Hidden state is NEVER stored inside CellRecord or ICellStore.
 *   - Lookups are O(1) via Set<number> (hash membership, not array scan).
 *   - Visibility is orthogonal to spatial (merge) model:
 *       merge  → structural redirect (affects data routing)
 *       hidden → display gate    (affects iteration/search only)
 *   - Spill is NOT blocked by hidden rows/cols — hidden is display-only.
 *     Only merged cells block spill (structural model, Phase 2).
 *   - unhide() restores deterministic traversal immediately (Set.delete = O(1)).
 *
 * Rollback: swap `new VisibilityStoreV1()` → `new VisibilityStoreLegacy()` in
 * Worksheet. The IVisibilityStore boundary absorbs all implementation differences.
 */

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

/**
 * IVisibilityStore — abstraction boundary for row/column visibility.
 *
 * All reads are O(1). All writes are O(1).
 * No interior linear scans; no per-cell flags.
 */
export interface IVisibilityStore {
  // ── Mutations ─────────────────────────────────────────────────────────────

  /** Mark a row as hidden. Idempotent. O(1). */
  hideRow(row: number): void;

  /** Restore a row to visible. Idempotent. O(1). */
  showRow(row: number): void;

  /** Mark a column as hidden. Idempotent. O(1). */
  hideCol(col: number): void;

  /** Restore a column to visible. Idempotent. O(1). */
  showCol(col: number): void;

  // ── Queries ───────────────────────────────────────────────────────────────

  /** Returns true if the row is currently hidden. O(1). */
  isRowHidden(row: number): boolean;

  /** Returns true if the column is currently hidden. O(1). */
  isColHidden(col: number): boolean;

  /**
   * Returns true if this cell should be skipped during iteration/search.
   * A cell is invisible if its row OR its column is hidden.
   * O(1) — two Set lookups.
   */
  isCellHidden(row: number, col: number): boolean;

  /** Read-only snapshot of all currently hidden rows. */
  getHiddenRows(): ReadonlySet<number>;

  /** Read-only snapshot of all currently hidden columns. */
  getHiddenCols(): ReadonlySet<number>;

  /** Number of hidden rows. O(1). */
  readonly hiddenRowCount: number;

  /** Number of hidden columns. O(1). */
  readonly hiddenColCount: number;
}

// ---------------------------------------------------------------------------
// V1 — primary implementation
// ---------------------------------------------------------------------------

/**
 * VisibilityStoreV1 — O(1) via two native Set<number> instances.
 *
 * Complexity table:
 * ┌──────────────────┬──────────────────────┐
 * │ Operation        │ Complexity           │
 * ├──────────────────┼──────────────────────┤
 * │ hideRow/showRow  │ O(1) — Set add/delete│
 * │ hideCol/showCol  │ O(1) — Set add/delete│
 * │ isRowHidden      │ O(1) — Set.has       │
 * │ isColHidden      │ O(1) — Set.has       │
 * │ isCellHidden     │ O(1) — two Set.has   │
 * │ getHiddenRows    │ O(1) — ref return    │
 * │ getHiddenCols    │ O(1) — ref return    │
 * │ hiddenRowCount   │ O(1) — Set.size      │
 * │ hiddenColCount   │ O(1) — Set.size      │
 * └──────────────────┴──────────────────────┘
 *
 * Memory: O(h_r + h_c) where h_r = hidden rows, h_c = hidden cols.
 */
export class VisibilityStoreV1 implements IVisibilityStore {
  private readonly rowSet = new Set<number>();
  private readonly colSet = new Set<number>();

  hideRow(row: number): void { this.rowSet.add(row); }
  showRow(row: number): void { this.rowSet.delete(row); }
  hideCol(col: number): void { this.colSet.add(col); }
  showCol(col: number): void { this.colSet.delete(col); }

  isRowHidden(row: number): boolean { return this.rowSet.has(row); }
  isColHidden(col: number): boolean { return this.colSet.has(col); }

  isCellHidden(row: number, col: number): boolean {
    return this.rowSet.has(row) || this.colSet.has(col);
  }

  getHiddenRows(): ReadonlySet<number> { return this.rowSet; }
  getHiddenCols(): ReadonlySet<number> { return this.colSet; }

  get hiddenRowCount(): number { return this.rowSet.size; }
  get hiddenColCount(): number { return this.colSet.size; }
}

// ---------------------------------------------------------------------------
// Legacy shim — rollback target
// ---------------------------------------------------------------------------

/**
 * VisibilityStoreLegacy — O(n) array-based rollback shim.
 *
 * Swap one line in Worksheet to revert:
 *   private visibilityStore: IVisibilityStore = new VisibilityStoreLegacy();
 *
 * Intentionally not optimised — used only for rollback validation.
 */
export class VisibilityStoreLegacy implements IVisibilityStore {
  private hiddenRows: number[] = [];
  private hiddenCols: number[] = [];

  hideRow(row: number): void {
    if (!this.hiddenRows.includes(row)) this.hiddenRows.push(row);
  }
  showRow(row: number): void {
    this.hiddenRows = this.hiddenRows.filter(r => r !== row);
  }
  hideCol(col: number): void {
    if (!this.hiddenCols.includes(col)) this.hiddenCols.push(col);
  }
  showCol(col: number): void {
    this.hiddenCols = this.hiddenCols.filter(c => c !== col);
  }

  isRowHidden(row: number): boolean { return this.hiddenRows.includes(row); }
  isColHidden(col: number): boolean { return this.hiddenCols.includes(col); }

  isCellHidden(row: number, col: number): boolean {
    return this.hiddenRows.includes(row) || this.hiddenCols.includes(col);
  }

  getHiddenRows(): ReadonlySet<number> { return new Set(this.hiddenRows); }
  getHiddenCols(): ReadonlySet<number> { return new Set(this.hiddenCols); }

  get hiddenRowCount(): number { return this.hiddenRows.length; }
  get hiddenColCount(): number { return this.hiddenCols.length; }
}
