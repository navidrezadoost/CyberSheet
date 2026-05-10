/**
 * DataCommands.ts
 *
 * Command implementations for Data tab operations:
 * - Sort (single column, multi-level)
 * - AutoFilter (toggle, clear, reapply)
 * - Data Validation (set rules, clear)
 * - Text to Columns (split by delimiter)
 * - Remove Duplicates
 * - Group/Ungroup rows/columns
 *
 * All commands implement the Command interface for undo/redo support.
 */

import type { Command } from '../CommandManager';
import type { Worksheet } from '../worksheet';
import type { Address, CellValue } from '../types';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface Range {
  start: Address;
  end: Address;
}

export interface SortLevel {
  columnIndex: number;
  ascending: boolean;
}

export interface DataValidationRule {
  type: 'any' | 'wholeNumber' | 'decimal' | 'list' | 'date' | 'time' | 'textLength' | 'custom';
  operator?: 'between' | 'notBetween' | 'equal' | 'notEqual' | 'greaterThan' | 'lessThan' | 'greaterThanOrEqual' | 'lessThanOrEqual';
  value1?: string;
  value2?: string;
  listSource?: string;
  ignoreBlank?: boolean;
  showInputMessage?: boolean;
  inputMessage?: string;
  showErrorAlert?: boolean;
  errorMessage?: string;
}

export interface FilterState {
  enabled: boolean;
  range: Range;
  columnFilters?: Map<number, Set<any>>;
}

// ─── Sort Commands ─────────────────────────────────────────────────────────

/**
 * SortCommand: Sort a range by one or more columns
 *
 * Stores the original row order for undo.
 */
export class SortCommand implements Command {
  description = 'Sort';

  private originalData: Map<number, Map<number, CellValue>>;
  private originalStyles: Map<number, Map<number, any>>;

  constructor(
    private worksheet: Worksheet,
    private range: Range,
    private sortLevels: SortLevel[],
    private hasHeaders: boolean = false
  ) {
    this.originalData = new Map();
    this.originalStyles = new Map();
  }

  execute(): void {
    // Store original data for undo
    this.captureOriginalState();

    // Get data to sort
    const startRow = this.hasHeaders ? this.range.start.row + 1 : this.range.start.row;
    const endRow = this.range.end.row;
    const startCol = this.range.start.col;
    const endCol = this.range.end.col;

    // Extract rows
    const rows: Array<{ rowIndex: number; data: Map<number, any>; styles: Map<number, any> }> = [];
    for (let r = startRow; r <= endRow; r++) {
      const rowData = new Map<number, any>();
      const rowStyles = new Map<number, any>();

      for (let c = startCol; c <= endCol; c++) {
        const addr = { row: r, col: c };
        rowData.set(c, this.worksheet.getCellValue(addr));
        rowStyles.set(c, this.worksheet.getCellStyle(addr));
      }

      rows.push({ rowIndex: r, data: rowData, styles: rowStyles });
    }

    // Sort rows based on sort levels
    rows.sort((a, b) => {
      for (const level of this.sortLevels) {
        const valA = a.data.get(level.columnIndex);
        const valB = b.data.get(level.columnIndex);

        const comparison = this.compareValues(valA, valB);
        if (comparison !== 0) {
          return level.ascending ? comparison : -comparison;
        }
      }
      return 0;
    });

    // Write sorted data back
    for (let i = 0; i < rows.length; i++) {
      const targetRow = startRow + i;
      const sourceRow = rows[i];

      for (let c = startCol; c <= endCol; c++) {
        const addr = { row: targetRow, col: c };
        this.worksheet.setCellValue(addr, sourceRow.data.get(c) || '');
        
        const style = sourceRow.styles.get(c);
        if (style) {
          this.worksheet.setCellStyle(addr, style);
        }
      }
    }

    console.log(`Sorted ${rows.length} rows by ${this.sortLevels.length} level(s)`);
  }

  undo(): void {
    // Restore original data
    for (const [row, cols] of this.originalData) {
      for (const [col, value] of cols) {
        this.worksheet.setCellValue({ row, col }, value);
      }
    }

    // Restore original styles
    for (const [row, cols] of this.originalStyles) {
      for (const [col, style] of cols) {
        this.worksheet.setCellStyle({ row, col }, style);
      }
    }

    console.log('Undid sort operation');
  }

  private captureOriginalState(): void {
    const startRow = this.hasHeaders ? this.range.start.row + 1 : this.range.start.row;
    const endRow = this.range.end.row;
    const startCol = this.range.start.col;
    const endCol = this.range.end.col;

    for (let r = startRow; r <= endRow; r++) {
      const rowData = new Map<number, any>();
      const rowStyles = new Map<number, any>();

      for (let c = startCol; c <= endCol; c++) {
        const addr = { row: r, col: c };
        rowData.set(c, this.worksheet.getCellValue(addr));
        rowStyles.set(c, this.worksheet.getCellStyle(addr));
      }

      this.originalData.set(r, rowData);
      this.originalStyles.set(r, rowStyles);
    }
  }

  private compareValues(a: any, b: any): number {
    // Handle null/undefined
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;

    // Convert to comparable types
    const typeA = typeof a;
    const typeB = typeof b;

    // Numbers
    if (typeA === 'number' && typeB === 'number') {
      return a - b;
    }

    // Dates
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() - b.getTime();
    }

    // Strings (case-insensitive)
    const strA = String(a).toLowerCase();
    const strB = String(b).toLowerCase();

    return strA.localeCompare(strB);
  }
}

// ─── Filter Commands ───────────────────────────────────────────────────────

/**
 * ToggleAutoFilterCommand: Enable/disable AutoFilter on a range
 *
 * AutoFilter shows dropdown arrows in header row for filtering.
 */
export class ToggleAutoFilterCommand implements Command {
  description = 'Toggle AutoFilter';

  private previousState: FilterState | null = null;

  constructor(
    private worksheet: Worksheet,
    private range: Range,
    private enabled: boolean
  ) {}

  execute(): void {
    // Store previous filter state (if exists)
    const currentFilter = (this.worksheet as any).filterState;
    if (currentFilter) {
      this.previousState = {
        enabled: currentFilter.enabled,
        range: currentFilter.range,
        columnFilters: currentFilter.columnFilters,
      };
    }

    // Set new filter state
    if (this.enabled) {
      (this.worksheet as any).filterState = {
        enabled: true,
        range: this.range,
        columnFilters: new Map(),
      };
      console.log('AutoFilter enabled on range', this.range);
    } else {
      (this.worksheet as any).filterState = null;
      console.log('AutoFilter disabled');
    }
  }

  undo(): void {
    if (this.previousState) {
      (this.worksheet as any).filterState = this.previousState;
      console.log('Restored previous AutoFilter state');
    } else {
      (this.worksheet as any).filterState = null;
      console.log('Removed AutoFilter');
    }
  }
}

/**
 * ClearFilterCommand: Clear all filters (show all rows)
 */
export class ClearFilterCommand implements Command {
  description = 'Clear Filter';

  private previousFilters: Map<number, Set<any>> | undefined;

  constructor(private worksheet: Worksheet) {}

  execute(): void {
    const filterState = (this.worksheet as any).filterState as FilterState | undefined;
    if (filterState && filterState.columnFilters) {
      this.previousFilters = new Map(filterState.columnFilters);
      filterState.columnFilters.clear();
      console.log('Cleared all filters');
    }
  }

  undo(): void {
    const filterState = (this.worksheet as any).filterState as FilterState | undefined;
    if (filterState && this.previousFilters) {
      filterState.columnFilters = new Map(this.previousFilters);
      console.log('Restored previous filters');
    }
  }
}

// ─── Data Validation Commands ──────────────────────────────────────────────

/**
 * SetDataValidationCommand: Apply validation rule to a range
 *
 * Stores validation rules that restrict what can be entered in cells.
 */
export class SetDataValidationCommand implements Command {
  description = 'Set Data Validation';

  private previousRules: Map<string, DataValidationRule>;

  constructor(
    private worksheet: Worksheet,
    private range: Range,
    private rule: DataValidationRule
  ) {
    this.previousRules = new Map();
  }

  execute(): void {
    // Ensure validation storage exists
    if (!(this.worksheet as any).validationRules) {
      (this.worksheet as any).validationRules = new Map<string, DataValidationRule>();
    }

    const rules = (this.worksheet as any).validationRules as Map<string, DataValidationRule>;

    // Apply rule to all cells in range
    for (let r = this.range.start.row; r <= this.range.end.row; r++) {
      for (let c = this.range.start.col; c <= this.range.end.col; c++) {
        const key = `${r},${c}`;
        
        // Store previous rule for undo
        const existing = rules.get(key);
        if (existing) {
          this.previousRules.set(key, existing);
        }

        // Set new rule
        rules.set(key, { ...this.rule });
      }
    }

    console.log(`Applied data validation to ${this.previousRules.size} cells`);
  }

  undo(): void {
    const rules = (this.worksheet as any).validationRules as Map<string, DataValidationRule>;

    // Restore previous rules or remove if none existed
    for (let r = this.range.start.row; r <= this.range.end.row; r++) {
      for (let c = this.range.start.col; c <= this.range.end.col; c++) {
        const key = `${r},${c}`;

        if (this.previousRules.has(key)) {
          rules.set(key, this.previousRules.get(key)!);
        } else {
          rules.delete(key);
        }
      }
    }

    console.log('Restored previous data validation rules');
  }
}

/**
 * ClearDataValidationCommand: Remove validation from range
 */
export class ClearDataValidationCommand implements Command {
  description = 'Clear Data Validation';

  private previousRules: Map<string, DataValidationRule>;

  constructor(
    private worksheet: Worksheet,
    private range: Range
  ) {
    this.previousRules = new Map();
  }

  execute(): void {
    const rules = (this.worksheet as any).validationRules as Map<string, DataValidationRule> | undefined;
    if (!rules) return;

    // Store and remove rules for range
    for (let r = this.range.start.row; r <= this.range.end.row; r++) {
      for (let c = this.range.start.col; c <= this.range.end.col; c++) {
        const key = `${r},${c}`;
        const existing = rules.get(key);
        
        if (existing) {
          this.previousRules.set(key, existing);
          rules.delete(key);
        }
      }
    }

    console.log(`Cleared data validation from ${this.previousRules.size} cells`);
  }

  undo(): void {
    if (!(this.worksheet as any).validationRules) {
      (this.worksheet as any).validationRules = new Map<string, DataValidationRule>();
    }

    const rules = (this.worksheet as any).validationRules as Map<string, DataValidationRule>;

    // Restore previous rules
    for (const [key, rule] of this.previousRules) {
      rules.set(key, rule);
    }

    console.log('Restored data validation rules');
  }
}

// ─── Remove Duplicates Command ─────────────────────────────────────────────

/**
 * RemoveDuplicatesCommand: Remove duplicate rows based on selected columns
 *
 * Stores removed rows for undo.
 */
export class RemoveDuplicatesCommand implements Command {
  description = 'Remove Duplicates';

  private removedRows: Array<{
    rowIndex: number;
    data: Map<number, any>;
    styles: Map<number, any>;
  }>;

  constructor(
    private worksheet: Worksheet,
    private range: Range,
    private compareColumns: number[],
    private hasHeaders: boolean = false
  ) {
    this.removedRows = [];
  }

  execute(): void {
    const startRow = this.hasHeaders ? this.range.start.row + 1 : this.range.start.row;
    const endRow = this.range.end.row;
    const startCol = this.range.start.col;
    const endCol = this.range.end.col;

    // Track seen combinations
    const seen = new Set<string>();
    const rowsToDelete: number[] = [];

    // Find duplicates
    for (let r = startRow; r <= endRow; r++) {
      // Build key from compare columns
      const key = this.compareColumns
        .map(col => String(this.worksheet.getCellValue({ row: r, col }) || ''))
        .join('|');

      if (seen.has(key)) {
        rowsToDelete.push(r);
      } else {
        seen.add(key);
      }
    }

    // Store rows for undo (in reverse order for proper restoration)
    for (const r of rowsToDelete.reverse()) {
      const rowData = new Map<number, any>();
      const rowStyles = new Map<number, any>();

      for (let c = startCol; c <= endCol; c++) {
        const addr = { row: r, col: c };
        rowData.set(c, this.worksheet.getCellValue(addr));
        rowStyles.set(c, this.worksheet.getCellStyle(addr));
      }

      this.removedRows.push({ rowIndex: r, data: rowData, styles: rowStyles });

      // Delete row by shifting up
      this.deleteRow(r);
    }

    console.log(`Removed ${this.removedRows.length} duplicate rows`);
  }

  undo(): void {
    // Restore removed rows (in reverse order)
    for (const row of this.removedRows.reverse()) {
      this.insertRow(row.rowIndex);

      // Restore data
      for (const [col, value] of row.data) {
        this.worksheet.setCellValue({ row: row.rowIndex, col }, value);
      }

      // Restore styles
      for (const [col, style] of row.styles) {
        this.worksheet.setCellStyle({ row: row.rowIndex, col }, style);
      }
    }

    console.log(`Restored ${this.removedRows.length} removed rows`);
  }

  private deleteRow(rowIndex: number): void {
    // Shift all rows up (simple implementation - actual would use worksheet API)
    const maxRow = 1000; // Arbitrary limit
    for (let r = rowIndex; r < maxRow; r++) {
      for (let c = this.range.start.col; c <= this.range.end.col; c++) {
        const current = { row: r, col: c };
        const next = { row: r + 1, col: c };

        this.worksheet.setCellValue(current, this.worksheet.getCellValue(next));
        this.worksheet.setCellStyle(current, this.worksheet.getCellStyle(next));
      }
    }
  }

  private insertRow(rowIndex: number): void {
    // Shift all rows down (simple implementation)
    const maxRow = 1000;
    for (let r = maxRow; r > rowIndex; r--) {
      for (let c = this.range.start.col; c <= this.range.end.col; c++) {
        const current = { row: r, col: c };
        const prev = { row: r - 1, col: c };

        this.worksheet.setCellValue(current, this.worksheet.getCellValue(prev));
        this.worksheet.setCellStyle(current, this.worksheet.getCellStyle(prev));
      }
    }
  }
}

// ─── Text to Columns Command ───────────────────────────────────────────────

/**
 * TextToColumnsCommand: Split text in a column by delimiter
 *
 * Splits cell values into multiple columns based on delimiter.
 */
export class TextToColumnsCommand implements Command {
  description = 'Text to Columns';

  private previousData: Map<string, any>;
  private previousStyles: Map<string, any>;

  constructor(
    private worksheet: Worksheet,
    private range: Range,
    private delimiter: string,
    private dataType: 'delimited' | 'fixedWidth' = 'delimited'
  ) {
    this.previousData = new Map();
    this.previousStyles = new Map();
  }

  execute(): void {
    // Only process first column of range
    const sourceCol = this.range.start.col;

    for (let r = this.range.start.row; r <= this.range.end.row; r++) {
      const addr = { row: r, col: sourceCol };
      const value = this.worksheet.getCellValue(addr);

      // Skip empty cells
      if (value == null || value === '') continue;

      // Split by delimiter
      const parts = String(value).split(this.delimiter);

      // Store original values for undo
      for (let i = 0; i < parts.length; i++) {
        const targetAddr = { row: r, col: sourceCol + i };
        const key = `${r},${sourceCol + i}`;

        this.previousData.set(key, this.worksheet.getCellValue(targetAddr));
        this.previousStyles.set(key, this.worksheet.getCellStyle(targetAddr));

        // Write split parts
        this.worksheet.setCellValue(targetAddr, parts[i].trim());
      }
    }

    console.log(`Split text into columns using delimiter: "${this.delimiter}"`);
  }

  undo(): void {
    // Restore previous values
    for (const [key, value] of this.previousData) {
      const [row, col] = key.split(',').map(Number);
      this.worksheet.setCellValue({ row, col }, value);
    }

    for (const [key, style] of this.previousStyles) {
      const [row, col] = key.split(',').map(Number);
      this.worksheet.setCellStyle({ row, col }, style);
    }

    console.log('Restored previous cell values');
  }
}

// ─── Group/Ungroup Commands ────────────────────────────────────────────────

/**
 * GroupOutlineCommand: Group rows or columns for collapsing
 *
 * Creates collapsible groups in the outline pane.
 */
export class GroupOutlineCommand implements Command {
  description = 'Group Outline';

  private previousGroups: any;

  constructor(
    private worksheet: Worksheet,
    private range: Range,
    private axis: 'rows' | 'columns'
  ) {}

  execute(): void {
    // Ensure outline storage exists
    if (!(this.worksheet as any).outlineGroups) {
      (this.worksheet as any).outlineGroups = { rows: [], columns: [] };
    }

    const groups = (this.worksheet as any).outlineGroups;
    this.previousGroups = { rows: [...groups.rows], columns: [...groups.columns] };

    // Add new group
    const newGroup = {
      start: this.axis === 'rows' ? this.range.start.row : this.range.start.col,
      end: this.axis === 'rows' ? this.range.end.row : this.range.end.col,
      collapsed: false,
      level: 1,
    };

    groups[this.axis].push(newGroup);

    console.log(`Added ${this.axis} group:`, newGroup);
  }

  undo(): void {
    if (this.previousGroups) {
      (this.worksheet as any).outlineGroups = this.previousGroups;
      console.log('Restored previous outline groups');
    }
  }
}

/**
 * UngroupOutlineCommand: Remove outline grouping
 */
export class UngroupOutlineCommand implements Command {
  description = 'Ungroup Outline';

  private previousGroups: any;

  constructor(
    private worksheet: Worksheet,
    private range: Range,
    private axis: 'rows' | 'columns'
  ) {}

  execute(): void {
    const groups = (this.worksheet as any).outlineGroups;
    if (!groups) return;

    this.previousGroups = { rows: [...groups.rows], columns: [...groups.columns] };

    // Remove groups that overlap with range
    const start = this.axis === 'rows' ? this.range.start.row : this.range.start.col;
    const end = this.axis === 'rows' ? this.range.end.row : this.range.end.col;

    groups[this.axis] = groups[this.axis].filter((group: any) => {
      return group.end < start || group.start > end;
    });

    console.log(`Removed ${this.axis} groups in range`);
  }

  undo(): void {
    if (this.previousGroups) {
      (this.worksheet as any).outlineGroups = this.previousGroups;
      console.log('Restored previous outline groups');
    }
  }
}
