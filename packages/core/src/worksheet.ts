import { Address, Cell, CellStyle, CellComment, CellIcon, ColumnFilter, Range, SheetEvents, IFormulaEngine } from './types';
import { ConditionalFormattingRule } from './ConditionalFormattingEngine';
import { Emitter } from './events';
import { SearchOptions, SearchRange, SearchResult } from './types/search-types';
import {
  buildMatcher,
  cellValueToString,
  compareRowMajor,
  compareColMajor,
  isStrictlyAfterRowMajor,
  isStrictlyBeforeRowMajor,
} from './search-engine';
import type { ICellStore } from './storage/ICellStore';
import { CellStoreV1 } from './storage/CellStoreV1';

export class Worksheet {
  readonly name: string;
  /** Cell store — ICellStore boundary; swap implementation without touching any other Worksheet code. */
  private cells: ICellStore = new CellStoreV1();
  private colWidths = new Map<number, number>(); // px
  private rowHeights = new Map<number, number>(); // px
  private filters = new Map<number, ColumnFilter>();
  private events = new Emitter<SheetEvents>();
  private formulaEngine?: IFormulaEngine;
  private merges: Range[] = [];
  private conditionalRules: ConditionalFormattingRule[] = [];
  private workbook?: any; // Reference to parent Workbook (for StyleCache access)
  rowCount: number;
  colCount: number;

  constructor(name: string, rows = 1000, cols = 26, engine?: IFormulaEngine, workbook?: any) {
    this.name = name;
    this.rowCount = rows;
    this.colCount = cols;
    this.formulaEngine = engine;
    this.workbook = workbook;
  }

  on(listener: (e: SheetEvents) => void) {
    return this.events.on(listener);
  }

  getCell(addr: Address): Cell | undefined {
    return this.cells.get(addr.row, addr.col);
  }

  /**
   * Get-or-create a cell entry in the sparse Map.
   *
   * Eliminates the `getCell() ?? { value: null }` anti-pattern that produced
   * detached phantom objects (Infrastructure Risk logged Day 2).
   *
   * All mutation helpers (setCellValue, setCellFormula, setCellStyle, etc.)
   * must go through this method.
   */
  private ensureCell(addr: Address): Cell {
    return this.cells.getOrCreate(addr.row, addr.col);
  }

  getCellValue(addr: Address): Cell['value'] {
    return this.getCell(addr)?.value ?? null;
  }

  setCellValue(addr: Address, value: Cell['value']): void {
    const c = this.ensureCell(addr);
    c.value = value;
    if (this.formulaEngine) this.formulaEngine.onCellChanged?.(addr, c);
    this.events.emit({ type: 'cell-changed', address: addr, cell: { ...c } });
  }

  /**
   * Set a formula (and optionally its pre-computed display value) on a cell.
   *
   * Uses ensureCell() to guarantee the cell object is registered in the Map
   * before the formula is attached — preventing the detached-object phantom
   * that affected lookIn:'formulas' search.
   *
   * @param addr          Cell address
   * @param formula       Formula string, e.g. '=SUM(A1:A10)'
   * @param displayValue  Optional pre-evaluated result (for read-only display)
   */
  setCellFormula(addr: Address, formula: string, displayValue?: Cell['value']): void {
    const c = this.ensureCell(addr);
    c.formula = formula;
    if (displayValue !== undefined) c.value = displayValue;
    if (this.formulaEngine) this.formulaEngine.onCellChanged?.(addr, c);
    this.events.emit({ type: 'cell-changed', address: addr, cell: { ...c } });
  }

  /**
   * Set spill source metadata on a cell (used exclusively by SpillEngine).
   * Does NOT fire events (spill is internal bookkeeping).
   */
  setSpillSource(addr: Address, source: Cell['spillSource']): void {
    const c = this.ensureCell(addr);
    c.spillSource = source;
  }

  /**
   * Set spilledFrom reference on a cell (used exclusively by SpillEngine).
   * Does NOT fire events.
   */
  setSpilledFrom(addr: Address, from: Cell['spilledFrom']): void {
    const c = this.ensureCell(addr);
    c.spilledFrom = from;
  }

  /**
   * Clear spill metadata from a spill-source cell.
   * Sets spillSource to undefined (preserves mono-shape — never delete).
   */
  clearSpillSource(addr: Address): void {
    const c = this.cells.get(addr.row, addr.col);
    if (c) c.spillSource = undefined;
  }

  /**
   * Clear spilledFrom reference from a spilled cell.
   * Sets spilledFrom to undefined (preserves mono-shape — never delete).
   */
  clearSpilledFrom(addr: Address): void {
    const c = this.cells.get(addr.row, addr.col);
    if (c) c.spilledFrom = undefined;
  }

  getCellStyle(addr: Address): CellStyle | undefined {
    return this.getCell(addr)?.style;
  }

  setCellStyle(addr: Address, style: CellStyle | undefined): void {
    const c = this.ensureCell(addr);

    // Auto-intern through workbook StyleCache (entropy-resistant boundary)
    // Protects against XLSX import, UI mutations, and spread operators
    let internedStyle = style;
    if (style && this.workbook?.getStyleCache) {
      internedStyle = this.workbook.getStyleCache().intern(style);
    }

    c.style = internedStyle; // Reference to canonical style (not a copy)
    this.events.emit({ type: 'style-changed', address: addr, style: internedStyle });
  }

  // ==================== Conditional Formatting ====================

  setConditionalFormattingRules(rules: ConditionalFormattingRule[]): void;
  setConditionalFormattingRules(
    range: Range,
    rules: ConditionalFormattingRule[],
    options?: { replace?: boolean; source?: 'preset' | 'manual' }
  ): void;
  setConditionalFormattingRules(
    rangeOrRules: Range | ConditionalFormattingRule[],
    rulesOrOptions?: ConditionalFormattingRule[] | { replace?: boolean; source?: 'preset' | 'manual' },
    options?: { replace?: boolean; source?: 'preset' | 'manual' }
  ): void {
    if (Array.isArray(rangeOrRules)) {
      this.conditionalRules = rangeOrRules.slice();
      this.events.emit({ type: 'sheet-mutated' });
      return;
    }

    const range = rangeOrRules;
    const rules = Array.isArray(rulesOrOptions) ? rulesOrOptions : [];
    const opts = Array.isArray(rulesOrOptions) ? options : rulesOrOptions;
    const replace = opts?.replace ?? true;

    const normalizedRange = this.normalizeRange(range);
    const updatedRules = rules.map(rule => ({
      ...rule,
      ranges: [normalizedRange],
    }));

    if (replace) {
      this.conditionalRules = updatedRules;
    } else {
      this.conditionalRules = [...this.conditionalRules, ...updatedRules];
    }

    this.events.emit({ type: 'sheet-mutated' });
  }

  addConditionalFormattingRule(rule: ConditionalFormattingRule): void {
    this.conditionalRules.push(rule);
    this.events.emit({ type: 'sheet-mutated' });
  }

  clearConditionalFormatting(): void {
    this.conditionalRules = [];
    this.events.emit({ type: 'sheet-mutated' });
  }

  getConditionalFormattingRules(): ConditionalFormattingRule[] {
    return this.conditionalRules.slice();
  }

  /**
   * Get the used range (smallest rectangle that includes all non-empty cells).
   */
  getUsedRange(): Range | null {
    if (this.cells.size === 0) return null;

    let minRow = Infinity;
    let maxRow = -Infinity;
    let minCol = Infinity;
    let maxCol = -Infinity;

    this.cells.forEach((row, col) => {
      minRow = Math.min(minRow, row);
      maxRow = Math.max(maxRow, row);
      minCol = Math.min(minCol, col);
      maxCol = Math.max(maxCol, col);
    });

    if (!Number.isFinite(minRow) || !Number.isFinite(minCol)) return null;

    return {
      start: { row: minRow, col: minCol },
      end: { row: maxRow, col: maxCol },
    };
  }

  /**
   * Get contiguous block around an address (expands until empty rows/cols).
   */
  getContiguousRange(anchor: Address): Range | null {
    if (!this.getCell(anchor)) return null;

    let minRow = anchor.row;
    let maxRow = anchor.row;
    let minCol = anchor.col;
    let maxCol = anchor.col;

    const isRowNonEmpty = (row: number, startCol: number, endCol: number): boolean => {
      for (let col = startCol; col <= endCol; col++) {
        if (this.getCell({ row, col })) return true;
      }
      return false;
    };

    const isColNonEmpty = (col: number, startRow: number, endRow: number): boolean => {
      for (let row = startRow; row <= endRow; row++) {
        if (this.getCell({ row, col })) return true;
      }
      return false;
    };

    let expanded = true;
    while (expanded) {
      expanded = false;
      if (minRow > 0 && isRowNonEmpty(minRow - 1, minCol, maxCol)) {
        minRow -= 1;
        expanded = true;
      }
      if (maxRow < this.rowCount && isRowNonEmpty(maxRow + 1, minCol, maxCol)) {
        maxRow += 1;
        expanded = true;
      }
      if (minCol > 0 && isColNonEmpty(minCol - 1, minRow, maxRow)) {
        minCol -= 1;
        expanded = true;
      }
      if (maxCol < this.colCount && isColNonEmpty(maxCol + 1, minRow, maxRow)) {
        maxCol += 1;
        expanded = true;
      }
    }

    return {
      start: { row: minRow, col: minCol },
      end: { row: maxRow, col: maxCol },
    };
  }

  setColumnFilter(col: number, filter: ColumnFilter): void {
    this.filters.set(col, filter);
    this.events.emit({ type: 'filter-changed', col, filter });
  }

  clearColumnFilter(col: number): void {
    this.filters.delete(col);
    this.events.emit({ type: 'filter-changed', col, filter: null });
  }

  /**
   * Get current filter for a column, if any.
   */
  getColumnFilter(col: number): ColumnFilter | undefined {
    return this.filters.get(col);
  }

  getVisibleRowIndices(range?: Range): number[] {
    const rows = range ? { start: range.start.row, end: range.end.row } : { start: 1, end: this.rowCount };
    const result: number[] = [];
    for (let r = rows.start; r <= rows.end; r++) {
      if (!this.rowMatchesFilters(r)) continue;
      result.push(r);
    }
    return result;
  }

  /**
   * Get row indices that pass all filters except the one on the provided column.
   * Used for building distinct value menus so a column's own filter doesn't hide its domain.
   */
  getVisibleRowIndicesExcluding(columnToExclude: number): number[] {
    const result: number[] = [];
    for (let r = 1; r <= this.rowCount; r++) {
      if (!this.rowMatchesFilters(r, columnToExclude)) continue;
      result.push(r);
    }
    return result;
  }

  private rowMatchesFilters(row: number, excludeCol?: number): boolean {
    for (const [col, filter] of this.filters) {
      if (excludeCol != null && col === excludeCol) continue;
      const v = this.getCell({ row, col })?.value ?? null;
      if (!this.matchesFilter(v, filter)) return false;
    }
    return true;
  }

  private matchesFilter(v: Cell['value'], f: ColumnFilter): boolean {
    if (f.type === 'empty') return v === null || v === '';
    if (f.type === 'notEmpty') return !(v === null || v === '');
    if (v === null) return false;
    if (f.type === 'in') {
      const arr = Array.isArray(f.value) ? (f.value as any[]) : [];
      return arr.some(x => String(x) === String(v));
    }
    if (f.type === 'equals') return v === f.value;
    if (f.type === 'contains') return String(v).toLowerCase().includes(String(f.value ?? '').toLowerCase());
    if (typeof v !== 'number') return false;
    if (f.type === 'gt') return v > (f.value as number);
    if (f.type === 'lt') return v < (f.value as number);
    if (f.type === 'between') {
      const [a, b] = f.value as [number, number];
      return v >= Math.min(a, b) && v <= Math.max(a, b);
    }
    return true;
  }

  getColumnWidth(col: number): number { return this.colWidths.get(col) ?? 80; }
  setColumnWidth(col: number, px: number): void { this.colWidths.set(col, px); this.events.emit({ type: 'sheet-mutated' }); }
  getRowHeight(row: number): number { return this.rowHeights.get(row) ?? 20; }
  setRowHeight(row: number, px: number): void { this.rowHeights.set(row, px); this.events.emit({ type: 'sheet-mutated' }); }

  setFormulaEngine(engine?: IFormulaEngine) { this.formulaEngine = engine; }

  // Merge APIs
  mergeCells(range: Range): void {
    const norm = this.normalizeRange(range);
    // Remove overlaps and add
    this.merges = this.merges.filter(m => !this.rangesOverlap(m, norm));
    this.merges.push(norm);
    this.events.emit({ type: 'sheet-mutated' });
  }

  cancelMerge(range: Range): void {
    const norm = this.normalizeRange(range);
    this.merges = this.merges.filter(m => !this.rangesOverlap(m, norm));
    this.events.emit({ type: 'sheet-mutated' });
  }

  getMergedRangeForCell(addr: Address): Range | null {
    for (const m of this.merges) {
      if (addr.row >= m.start.row && addr.row <= m.end.row && addr.col >= m.start.col && addr.col <= m.end.col) {
        return m;
      }
    }
    return null;
  }

  getMergedRanges(): Range[] { return this.merges.slice(); }

  private normalizeRange(r: Range): Range {
    return {
      start: { row: Math.min(r.start.row, r.end.row), col: Math.min(r.start.col, r.end.col) },
      end: { row: Math.max(r.start.row, r.end.row), col: Math.max(r.start.col, r.end.col) },
    };
  }

  private rangesOverlap(a: Range, b: Range): boolean {
    const rOverlap = a.start.row <= b.end.row && a.end.row >= b.start.row;
    const cOverlap = a.start.col <= b.end.col && a.end.col >= b.start.col;
    return rOverlap && cOverlap;
  }

  // ==================== Comment APIs ====================

  /**
   * Add a comment to a cell (supports threading via parentId)
   */
  addComment(addr: Address, comment: Omit<CellComment, 'id' | 'createdAt'>): CellComment {
    const c = this.cells.getOrCreate(addr.row, addr.col);
    if (!c.comments) c.comments = [];

    const newComment: CellComment = {
      id: this.generateCommentId(),
      createdAt: new Date(),
      ...comment,
    };

    c.comments.push(newComment);
    this.events.emit({ type: 'comment-added', address: addr, comment: newComment });
    return newComment;
  }

  /**
   * Get all comments for a specific cell
   */
  getComments(addr: Address): CellComment[] {
    return this.getCell(addr)?.comments ?? [];
  }

  /**
   * Update an existing comment
   */
  updateComment(addr: Address, commentId: string, updates: Partial<Omit<CellComment, 'id' | 'createdAt'>>): boolean {
    const c = this.cells.get(addr.row, addr.col);
    if (!c?.comments) return false;

    const idx = c.comments.findIndex(cm => cm.id === commentId);
    if (idx === -1) return false;

    c.comments[idx] = {
      ...c.comments[idx],
      ...updates,
      editedAt: new Date(),
    };

    this.events.emit({ type: 'comment-updated', address: addr, commentId, comment: c.comments[idx] });
    return true;
  }

  /**
   * Delete a comment (and its threaded replies)
   */
  deleteComment(addr: Address, commentId: string, deleteReplies = true): boolean {
    const c = this.cells.get(addr.row, addr.col);
    if (!c?.comments) return false;

    const before = c.comments.length;

    if (deleteReplies) {
      // Remove comment and all its children
      const toDelete = new Set<string>([commentId]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const cm of c.comments) {
          if (cm.parentId && toDelete.has(cm.parentId) && !toDelete.has(cm.id)) {
            toDelete.add(cm.id);
            changed = true;
          }
        }
      }
      c.comments = c.comments.filter(cm => !toDelete.has(cm.id));
    } else {
      c.comments = c.comments.filter(cm => cm.id !== commentId);
    }

    if (c.comments.length === before) return false;

    // Assign undefined instead of `delete c.comments` — preserves V8 mono-shape.
    // `delete obj.prop` changes the hidden class; `obj.prop = undefined` does not.
    if (c.comments.length === 0) c.comments = undefined;

    this.events.emit({ type: 'comment-deleted', address: addr, commentId });
    return true;
  }

  /**
   * Get all cells with comments (useful for navigation)
   */
  getAllComments(): Array<{ address: Address; comments: CellComment[] }> {
    const result: Array<{ address: Address; comments: CellComment[] }> = [];

    this.cells.forEach((row, col, cell) => {
      if (cell.comments && cell.comments.length > 0) {
        result.push({
          address: { row, col },
          comments: [...cell.comments],
        });
      }
    });

    // Sort by row, then col for consistent navigation.
    result.sort((a, b) => {
      if (a.address.row !== b.address.row) return a.address.row - b.address.row;
      return a.address.col - b.address.col;
    });

    return result;
  }

  /**
   * Find next/previous cell with comments (for navigation)
   */
  getNextCommentCell(fromAddr: Address, direction: 'next' | 'prev' = 'next'): Address | null {
    const all = this.getAllComments(); // already sorted by (row, col) numerically
    if (all.length === 0) return null;

    if (direction === 'next') {
      for (const item of all) {
        const { row, col } = item.address;
        // Strict numeric comparison — string key comparison was broken for row≥10
        if (row > fromAddr.row || (row === fromAddr.row && col > fromAddr.col)) {
          return item.address;
        }
      }
      return all[0].address; // wrap around
    } else {
      for (let i = all.length - 1; i >= 0; i--) {
        const { row, col } = all[i].address;
        if (row < fromAddr.row || (row === fromAddr.row && col < fromAddr.col)) {
          return all[i].address;
        }
      }
      return all[all.length - 1].address; // wrap around
    }
  }

  // ==================== Icon APIs ====================

  /**
   * Set an icon for a cell
   */
  setIcon(addr: Address, icon: CellIcon | undefined): void {
    const c = this.cells.getOrCreate(addr.row, addr.col);
    c.icon = icon;
    this.events.emit({ type: 'icon-changed', address: addr, icon });
  }

  /**
   * Get icon for a cell
   */
  getIcon(addr: Address): CellIcon | undefined {
    return this.getCell(addr)?.icon;
  }

  /**
   * Get all cells with icons
   */
  getAllIcons(): Array<{ address: Address; icon: CellIcon }> {
    const result: Array<{ address: Address; icon: CellIcon }> = [];

    this.cells.forEach((row, col, cell) => {
      if (cell.icon) result.push({ address: { row, col }, icon: cell.icon });
    });

    return result;
  }

  // ==================== General Search API (Phase 1) ====================

  /**
   * Find iterator - lazy search with generator pattern
   * 
   * **Excel Parity**: ✅ Range.Find() with findNext loop pattern
   * 
   * **Complexity**: O(n) where n = cells in range
   * **Memory**: O(1) - yields addresses one at a time
   * **Precision**: ±0 (exact text match)
   * **Error Strategy**: SKIP_ERRORS (silently skip malformed cells)
   * **Volatility**: Non-volatile (deterministic for given worksheet state)
   * 
   * **Phase 1 Implementation Status**: 🚧 STUB - Returns empty generator
   * 
   * @param options - Search configuration (what, lookIn, lookAt, matchCase, etc.)
   * @param range - Optional range to search (default: entire worksheet)
   * @yields Address of each matching cell
   * 
   * @example
   * ```ts
   * // Find all cells containing "Apple"
   * for (const addr of sheet.findIterator({ what: "Apple" })) {
   *   console.log(addr); // { row: 5, col: 2 }
   * }
   * 
   * // Case-sensitive search in formulas
   * for (const addr of sheet.findIterator({ 
   *   what: "SUM", 
   *   lookIn: "formulas", 
   *   matchCase: true 
   * })) {
   *   console.log(sheet.getCell(addr)?.formula);
   * }
   * ```
   */
  *findIterator(
    options: SearchOptions,
    range?: SearchRange
  ): Generator<Address, void, undefined> {
    // Empty pattern matches nothing (Excel semantics).
    if (options.what === '') return;

    const { lookIn = 'values', searchOrder = 'rows' } = options;
    const matcher = buildMatcher(options);

    // ── 1. Collect addresses of all populated cells ──────────────────────────
    // forEach visits only cells that exist in the store; empty slots are skipped.
    const addresses: Address[] = [];
    this.cells.forEach((row, col) => {
      // ── 2. Apply range filter ─────────────────────────────────────────────
      if (range) {
        if (row < range.start.row || row > range.end.row) return;
        if (col < range.start.col || col > range.end.col) return;
      }
      addresses.push({ row, col });
    });

    // ── 3. Sort by search order ─────────────────────────────────────────────
    addresses.sort(searchOrder === 'columns' ? compareColMajor : compareRowMajor);

    // ── 4. Yield matches ─────────────────────────────────────────────────────
    for (const addr of addresses) {
      const cell = this.cells.get(addr.row, addr.col);
      if (!cell) continue;

      let text: string | null = null;

      if (lookIn === 'values') {
        text = cellValueToString(cell.value);
      } else if (lookIn === 'formulas') {
        // Search the formula string if present; fall back to display value.
        text = cell.formula != null ? cell.formula : cellValueToString(cell.value);
      } else if (lookIn === 'comments') {
        if (cell.comments && cell.comments.length > 0) {
          text = cell.comments.map(c => c.text).join(' ');
        }
      }

      if (text === null) continue;
      if (matcher(text)) yield addr;
    }
  }

  /**
   * Find single match (convenience wrapper)
   * 
   * **Excel Parity**: ✅ Range.Find(what, after)
   * 
   * **Complexity**: O(n) worst case, but returns first match
   * **Memory**: O(1)
   * **Precision**: ±0
   * **Error Strategy**: SKIP_ERRORS
   * **Volatility**: Non-volatile
   * 
   * **Phase 1 Implementation Status**: 🚧 STUB - Returns null
   * 
   * @param options - Search configuration
   * @param after - Start search after this address (default: top-left)
   * @param range - Optional range to search
   * @returns First matching address or null if no match
   * 
   * @example
   * ```ts
   * const addr = sheet.find({ what: "Apple", matchCase: false });
   * if (addr) {
   *   console.log(`Found at ${addr.row}, ${addr.col}`);
   * }
   * 
   * // Find next occurrence after A5
   * const nextAddr = sheet.find({ what: "Apple" }, { row: 4, col: 0 });
   * ```
   */
  find(
    options: SearchOptions,
    after?: Address,
    range?: SearchRange
  ): Address | null {
    const { searchDirection = 'next' } = options;

    // Eagerly collect all matches from the iterator (O(n) scan).
    // PM directive: correctness first, no premature optimisation.
    const allMatches = [...this.findIterator(options, range)];
    if (allMatches.length === 0) return null;

    if (searchDirection === 'next') {
      // ── Forward search ──────────────────────────────────────────────────
      if (!after) return allMatches[0];

      // Find first match strictly after `after` in iteration order.
      for (const addr of allMatches) {
        if (isStrictlyAfterRowMajor(addr, after)) return addr;
      }

      // Wrap-around: no match after `after` → return from the beginning.
      return allMatches[0];
    } else {
      // ── Backward search (previous) ───────────────────────────────────────
      // Phase 1: row-major backward only (column-major backward deferred).
      if (!after) return allMatches[allMatches.length - 1];

      // Scan in reverse; return first match strictly before `after`.
      for (let i = allMatches.length - 1; i >= 0; i--) {
        if (isStrictlyBeforeRowMajor(allMatches[i], after)) return allMatches[i];
      }

      // Wrap-around: no match before `after` → return from the end.
      return allMatches[allMatches.length - 1];
    }
  }

  /**
   * Find all matches (eager collection)
   * 
   * **Excel Parity**: ✅ Range.FindAll() pattern (loop + collect)
   * 
   * **Complexity**: O(n) where n = cells in range
   * **Memory**: O(m) where m = number of matches (eager allocation)
   * **Precision**: ±0
   * **Error Strategy**: SKIP_ERRORS
   * **Volatility**: Non-volatile
   * 
   * **Phase 1 Implementation Status**: 🚧 STUB - Returns empty array
   * 
   * **Warning**: Use sparingly for large worksheets. Prefer `findIterator()` for
   * memory-efficient streaming. This method allocates an array upfront.
   * 
   * @param options - Search configuration
   * @param range - Optional range to search
   * @returns Array of all matching addresses (empty if no matches)
   * 
   * @example
   * ```ts
   * // Find all "Apple" occurrences
   * const matches = sheet.findAll({ what: "Apple" });
   * console.log(`Found ${matches.length} matches`);
   * 
   * // Search in specific range
   * const rangeMatches = sheet.findAll(
   *   { what: "error", matchCase: false },
   *   { start: { row: 0, col: 0 }, end: { row: 100, col: 10 } }
   * );
   * ```
   */
  findAll(
    options: SearchOptions,
    range?: SearchRange
  ): Address[] {
    // findAll is a thin eager wrapper over the lazy iterator.
    // PM mandate: no independent scan loop here — must go through findIterator.
    return [...this.findIterator(options, range)];
  }

  // ==================== Private Helpers ====================

  private generateCommentId(): string {
    return `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
