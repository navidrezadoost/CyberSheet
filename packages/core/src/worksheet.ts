import { Address, Cell, CellStyle, CellComment, CellIcon, ColumnFilter, Range, SheetEvents, IFormulaEngine } from './types';
import { ConditionalFormattingRule } from './ConditionalFormattingEngine';
import { Emitter } from './events';

function key(addr: Address): string {
  return `${addr.row}:${addr.col}`;
}

export class Worksheet {
  readonly name: string;
  private cells = new Map<string, Cell>();
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
    return this.cells.get(key(addr));
  }

  getCellValue(addr: Address): Cell['value'] {
    return this.getCell(addr)?.value ?? null;
  }

  setCellValue(addr: Address, value: Cell['value']): void {
    const k = key(addr);
    const c = this.cells.get(k) ?? { value: null };
    c.value = value;
    this.cells.set(k, c);
    if (this.formulaEngine) this.formulaEngine.onCellChanged?.(addr, c);
    this.events.emit({ type: 'cell-changed', address: addr, cell: { ...c } });
  }

  getCellStyle(addr: Address): CellStyle | undefined {
    return this.getCell(addr)?.style;
  }

  setCellStyle(addr: Address, style: CellStyle | undefined): void {
    const k = key(addr);
    const c = this.cells.get(k) ?? { value: null };
    
    // Auto-intern through workbook StyleCache (entropy-resistant boundary)
    // Protects against XLSX import, UI mutations, and spread operators
    let internedStyle = style;
    if (style && this.workbook?.getStyleCache) {
      internedStyle = this.workbook.getStyleCache().intern(style);
    }
    
    c.style = internedStyle; // Reference to canonical style (not a copy)
    this.cells.set(k, c);
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

    for (const keyStr of this.cells.keys()) {
      const [rowStr, colStr] = keyStr.split(':');
      const row = Number(rowStr);
      const col = Number(colStr);
      if (Number.isNaN(row) || Number.isNaN(col)) continue;
      minRow = Math.min(minRow, row);
      maxRow = Math.max(maxRow, row);
      minCol = Math.min(minCol, col);
      maxCol = Math.max(maxCol, col);
    }

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
    const k = key(addr);
    const c = this.cells.get(k) ?? { value: null };
    if (!c.comments) c.comments = [];
    
    const newComment: CellComment = {
      id: this.generateCommentId(),
      createdAt: new Date(),
      ...comment,
    };
    
    c.comments.push(newComment);
    this.cells.set(k, c);
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
    const k = key(addr);
    const c = this.cells.get(k);
    if (!c?.comments) return false;
    
    const idx = c.comments.findIndex(cm => cm.id === commentId);
    if (idx === -1) return false;
    
    c.comments[idx] = {
      ...c.comments[idx],
      ...updates,
      editedAt: new Date(),
    };
    
    this.cells.set(k, c);
    this.events.emit({ type: 'comment-updated', address: addr, commentId, comment: c.comments[idx] });
    return true;
  }

  /**
   * Delete a comment (and its threaded replies)
   */
  deleteComment(addr: Address, commentId: string, deleteReplies = true): boolean {
    const k = key(addr);
    const c = this.cells.get(k);
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
    
    if (c.comments.length === 0) {
      delete c.comments;
    }
    
    this.cells.set(k, c);
    this.events.emit({ type: 'comment-deleted', address: addr, commentId });
    return true;
  }

  /**
   * Get all cells with comments (useful for navigation)
   */
  getAllComments(): Array<{ address: Address; comments: CellComment[] }> {
    const result: Array<{ address: Address; comments: CellComment[] }> = [];
    
    for (const [k, cell] of this.cells) {
      if (cell.comments && cell.comments.length > 0) {
        const [rowStr, colStr] = k.split(':');
        result.push({
          address: { row: parseInt(rowStr, 10), col: parseInt(colStr, 10) },
          comments: [...cell.comments],
        });
      }
    }
    
    // Sort by row, then col for consistent navigation
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
    const all = this.getAllComments();
    if (all.length === 0) return null;
    
    const fromKey = key(fromAddr);
    
    if (direction === 'next') {
      for (const item of all) {
        const itemKey = key(item.address);
        if (itemKey > fromKey) return item.address;
      }
      // Wrap around
      return all[0].address;
    } else {
      for (let i = all.length - 1; i >= 0; i--) {
        const itemKey = key(all[i].address);
        if (itemKey < fromKey) return all[i].address;
      }
      // Wrap around
      return all[all.length - 1].address;
    }
  }

  // ==================== Icon APIs ====================

  /**
   * Set an icon for a cell
   */
  setIcon(addr: Address, icon: CellIcon | undefined): void {
    const k = key(addr);
    const c = this.cells.get(k) ?? { value: null };
    c.icon = icon;
    this.cells.set(k, c);
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
    
    for (const [k, cell] of this.cells) {
      if (cell.icon) {
        const [rowStr, colStr] = k.split(':');
        result.push({
          address: { row: parseInt(rowStr, 10), col: parseInt(colStr, 10) },
          icon: cell.icon,
        });
      }
    }
    
    return result;
  }

  // ==================== Private Helpers ====================

  private generateCommentId(): string {
    return `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
