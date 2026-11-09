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
import { Worksheet } from '../worksheet';
import { assertWorksheetAddress } from '../dag/DependencyGraph';
import type {
  Address,
  AutoFilterRange,
  CellStyle,
  ColumnFilter,
  DataValidationRule as WorksheetDataValidationRule,
  ExtendedCellValue,
} from '../types';

const worksheetIsWorkbookOwned = Worksheet.prototype.isWorkbookOwned;

function assertStandaloneWorksheet(worksheet: Worksheet): void {
  if (!(worksheet instanceof Worksheet) || worksheetIsWorkbookOwned.call(worksheet)) {
    throw new Error('Data commands do not support a Workbook-owned Worksheet; provide a standalone Worksheet');
  }
}

function describeFailure(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function throwWithRecoveryStatus(
  commandName: string,
  originalError: unknown,
  recoveryErrors: unknown[],
): never {
  if (recoveryErrors.length === 0) throw originalError;

  const recoveryError = new Error(
    `${commandName} failed: ${describeFailure(originalError)}; best-effort recovery was incomplete (${recoveryErrors.length} restoration operation(s) failed)`,
  );
  Object.defineProperty(recoveryError, 'cause', { value: originalError });
  Object.defineProperty(recoveryError, 'recoveryErrors', { value: recoveryErrors });
  throw recoveryError;
}

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
  id?: string;
  range?: Range;
  type: 'any' | 'wholeNumber' | 'whole' | 'decimal' | 'list' | 'date' | 'time' | 'textLength' | 'custom';
  operator?: 'between' | 'notBetween' | 'equal' | 'equalTo' | 'notEqual' | 'notEqualTo' | 'greaterThan' | 'lessThan' | 'greaterThanOrEqual' | 'greaterThanOrEqualTo' | 'lessThanOrEqual' | 'lessThanOrEqualTo' | 'greaterOrEqual' | 'lessOrEqual';
  formula1?: string;
  formula2?: string;
  value1?: string;
  value2?: string;
  listSource?: string;
  allowBlank?: boolean;
  ignoreBlank?: boolean;
  showDropdown?: boolean;
  showInputMessage?: boolean;
  inputTitle?: string;
  inputMessage?: string;
  showErrorAlert?: boolean;
  errorStyle?: 'stop' | 'warning' | 'information';
  errorTitle?: string;
  errorMessage?: string;
}

function toWorksheetDataValidationRule(rule: DataValidationRule): WorksheetDataValidationRule {
  const operatorMap: Record<NonNullable<DataValidationRule['operator']>, NonNullable<WorksheetDataValidationRule['operator']>> = {
    between: 'between',
    notBetween: 'notBetween',
    equal: 'equalTo',
    equalTo: 'equalTo',
    notEqual: 'notEqualTo',
    notEqualTo: 'notEqualTo',
    greaterThan: 'greaterThan',
    lessThan: 'lessThan',
    greaterThanOrEqual: 'greaterThanOrEqualTo',
    greaterOrEqual: 'greaterThanOrEqualTo',
    greaterThanOrEqualTo: 'greaterThanOrEqualTo',
    lessThanOrEqual: 'lessThanOrEqualTo',
    lessOrEqual: 'lessThanOrEqualTo',
    lessThanOrEqualTo: 'lessThanOrEqualTo',
  };
  return {
    type: rule.type === 'wholeNumber' ? 'whole' : rule.type,
    ...(rule.operator ? { operator: operatorMap[rule.operator] } : {}),
    ...(rule.formula1 !== undefined || rule.value1 !== undefined || rule.listSource !== undefined
      ? { formula1: rule.formula1 ?? rule.value1 ?? rule.listSource }
      : {}),
    ...(rule.formula2 !== undefined || rule.value2 !== undefined
      ? { formula2: rule.formula2 ?? rule.value2 }
      : {}),
    ...(rule.allowBlank !== undefined || rule.ignoreBlank !== undefined
      ? { allowBlank: rule.allowBlank ?? rule.ignoreBlank }
      : {}),
    ...(rule.showDropdown !== undefined ? { showDropdown: rule.showDropdown } : {}),
    ...(rule.showInputMessage !== undefined ? { showInputMessage: rule.showInputMessage } : {}),
    ...(rule.inputTitle !== undefined ? { inputTitle: rule.inputTitle } : {}),
    ...(rule.inputMessage !== undefined ? { inputMessage: rule.inputMessage } : {}),
    ...(rule.showErrorAlert !== undefined ? { showErrorAlert: rule.showErrorAlert } : {}),
    ...(rule.errorStyle !== undefined ? { errorStyle: rule.errorStyle } : {}),
    ...(rule.errorTitle !== undefined ? { errorTitle: rule.errorTitle } : {}),
    ...(rule.errorMessage !== undefined ? { errorMessage: rule.errorMessage } : {}),
  };
}

export interface FilterState {
  enabled: boolean;
  range: Range;
  columnFilters?: Map<number, Set<any>>;
}

// ─── Sort Commands ─────────────────────────────────────────────────────────

/** Blank cells sort last in both ascending and descending order (Excel behavior). */
function isBlankSortValue(value: unknown): boolean {
  return value == null || value === '';
}

function duplicateValueIdentity(value: unknown, ancestors = new Set<object>()): unknown {
  if (value === null) return ['null'];
  if (value === undefined) return ['undefined'];
  if (typeof value === 'string') return ['string', value];
  if (typeof value === 'boolean') return ['boolean', value];
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return ['number', 'NaN'];
    if (value === Infinity) return ['number', '+Infinity'];
    if (value === -Infinity) return ['number', '-Infinity'];
    return ['number', value === 0 ? 0 : value];
  }
  if (typeof value !== 'object') throw new TypeError('Unsupported cell value in duplicate comparison');
  if (ancestors.has(value)) throw new TypeError('Cyclic cell value in duplicate comparison');

  ancestors.add(value);
  try {
    if (Array.isArray(value)) return ['array', value.map((item) => duplicateValueIdentity(item, ancestors))];
    const record = value as Record<string, unknown>;
    return ['object', Object.keys(record).sort().map((key) => [key, duplicateValueIdentity(record[key], ancestors)])];
  } finally {
    ancestors.delete(value);
  }
}

/**
 * SortCommand: Sort a range by one or more columns
 *
 * Stores the original row order for undo.
 */
export class SortCommand implements Command {
  description = 'Sort';

  private originalData: Map<number, Map<number, { value: ExtendedCellValue; formula?: string }>>;
  private originalStyles: Map<number, Map<number, CellStyle | undefined>>;
  private hasUndoSnapshot = false;

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
    assertStandaloneWorksheet(this.worksheet);
    // Store original data for undo
    this.hasUndoSnapshot = false;
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
        const cell = this.worksheet.getCell(addr);
        rowData.set(c, {
          value: this.worksheet.getCellValue(addr),
          ...(cell?.formula === undefined ? {} : { formula: cell.formula }),
        });
        rowStyles.set(c, this.worksheet.getDirectCellStyle(addr));
      }

      rows.push({ rowIndex: r, data: rowData, styles: rowStyles });
    }

    // Sort rows based on sort levels
    rows.sort((a, b) => {
      for (const level of this.sortLevels) {
        const valA = a.data.get(level.columnIndex)?.value;
        const valB = b.data.get(level.columnIndex)?.value;

        const aBlank = isBlankSortValue(valA);
        const bBlank = isBlankSortValue(valB);
        if (aBlank && bBlank) continue;
        if (aBlank) return 1;
        if (bBlank) return -1;

        const comparison = this.compareValues(valA, valB);
        if (comparison !== 0) {
          return level.ascending ? comparison : -comparison;
        }
      }
      return 0;
    });

    try {
      // Write sorted data back
      for (let i = 0; i < rows.length; i++) {
        const targetRow = startRow + i;
        const sourceRow = rows[i];

        for (let c = startCol; c <= endCol; c++) {
          const addr = { row: targetRow, col: c };
          const content = sourceRow.data.get(c)!;
          this.worksheet.restoreCellContent(addr, content);

          const style = sourceRow.styles.get(c);
          this.worksheet.setCellStyle(addr, style);
        }
      }
    } catch (error) {
      const recoveryErrors = this.restoreSnapshot(this.originalData, this.originalStyles);
      this.hasUndoSnapshot = false;
      throwWithRecoveryStatus('Sort', error, recoveryErrors);
    }
    this.hasUndoSnapshot = true;

    console.log(`Sorted ${rows.length} rows by ${this.sortLevels.length} level(s)`);
  }

  undo(): void {
    assertStandaloneWorksheet(this.worksheet);
    if (!this.hasUndoSnapshot) return;
    const currentData = new Map<number, Map<number, { value: ExtendedCellValue; formula?: string }>>();
    const currentStyles = new Map<number, Map<number, CellStyle | undefined>>();
    this.captureStateInto(currentData, currentStyles);
    try {
      const failures = this.restoreSnapshot(this.originalData, this.originalStyles);
      if (failures.length) throwWithRecoveryStatus('Sort undo', failures[0], failures.slice(1));
      this.hasUndoSnapshot = false;
    } catch (error) {
      const recoveryErrors = this.restoreSnapshot(currentData, currentStyles);
      if (recoveryErrors.length) this.hasUndoSnapshot = false;
      throwWithRecoveryStatus('Sort undo', error, recoveryErrors);
    }

    console.log('Undid sort operation');
  }

  private captureOriginalState(): void {
    this.originalData.clear();
    this.originalStyles.clear();
    this.captureStateInto(this.originalData, this.originalStyles);
  }

  private captureStateInto(
    data: Map<number, Map<number, { value: ExtendedCellValue; formula?: string }>>,
    styles: Map<number, Map<number, CellStyle | undefined>>,
  ): void {
    const startRow = this.hasHeaders ? this.range.start.row + 1 : this.range.start.row;
    const endRow = this.range.end.row;
    const startCol = this.range.start.col;
    const endCol = this.range.end.col;

    for (let r = startRow; r <= endRow; r++) {
      const rowData = new Map<number, any>();
      const rowStyles = new Map<number, any>();

      for (let c = startCol; c <= endCol; c++) {
        const addr = { row: r, col: c };
        const cell = this.worksheet.getCell(addr);
        rowData.set(c, {
          value: this.worksheet.getCellValue(addr),
          ...(cell?.formula === undefined ? {} : { formula: cell.formula }),
        });
        rowStyles.set(c, this.worksheet.getDirectCellStyle(addr));
      }

      data.set(r, rowData);
      styles.set(r, rowStyles);
    }
  }

  private restoreSnapshot(
    data: Map<number, Map<number, { value: ExtendedCellValue; formula?: string }>>,
    styles: Map<number, Map<number, CellStyle | undefined>>,
  ): unknown[] {
    const errors: unknown[] = [];
    for (const [row, cols] of data) {
      for (const [col, content] of cols) {
        try { this.worksheet.restoreCellContent({ row, col }, content); } catch (error) { errors.push(error); }
      }
    }
    for (const [row, cols] of styles) {
      for (const [col, style] of cols) {
        try { this.worksheet.setCellStyle({ row, col }, style); } catch (error) { errors.push(error); }
      }
    }
    return errors;
  }

  private compareValues(a: any, b: any): number {
    // Non-blank values only — blank handling is done in the sort comparator.
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

  private previousAutoFilterRange: AutoFilterRange | null = null;
  private hasUndoSnapshot = false;

  constructor(
    private worksheet: Worksheet,
    private range: Range,
    private enabled: boolean
  ) {}

  execute(): void {
    assertStandaloneWorksheet(this.worksheet);
    this.previousAutoFilterRange = this.worksheet.getAutoFilterRange();
    this.hasUndoSnapshot = false;
    try {
      this.applyRequestedState();
      this.hasUndoSnapshot = true;
    } catch (error) {
      const recoveryErrors = this.restoreRange(this.previousAutoFilterRange);
      throwWithRecoveryStatus('Toggle AutoFilter', error, recoveryErrors);
    }
  }

  undo(): void {
    assertStandaloneWorksheet(this.worksheet);
    if (!this.hasUndoSnapshot) return;
    const current = this.worksheet.getAutoFilterRange();
    try {
      const errors = this.restoreRange(this.previousAutoFilterRange);
      if (errors.length) throwWithRecoveryStatus('Toggle AutoFilter undo', errors[0], errors.slice(1));
      this.hasUndoSnapshot = false;
    } catch (error) {
      const recoveryErrors = this.restoreRange(current);
      if (recoveryErrors.length) this.hasUndoSnapshot = false;
      throwWithRecoveryStatus('Toggle AutoFilter undo', error, recoveryErrors);
    }
  }

  private applyRequestedState(): void {
    if (this.enabled) {
      const startRow = Math.min(this.range.start.row, this.range.end.row);
      const startCol = Math.min(this.range.start.col, this.range.end.col);
      const endCol = Math.max(this.range.start.col, this.range.end.col);
      this.worksheet.setAutoFilterRange(startRow, startCol, endCol);
    } else {
      this.worksheet.clearAutoFilterRange();
    }
  }

  private restoreRange(range: AutoFilterRange | null): unknown[] {
    try {
      if (range) this.worksheet.setAutoFilterRange(range.headerRow, range.startCol, range.endCol);
      else this.worksheet.clearAutoFilterRange();
      return [];
    } catch (error) {
      return [error];
    }
  }
}

/**
 * ClearFilterCommand: Clear all filters (show all rows)
 */
export class ClearFilterCommand implements Command {
  description = 'Clear Filter';

  private previousFilters: Map<number, ColumnFilter> = new Map();
  private hasUndoSnapshot = false;

  constructor(private worksheet: Worksheet) {}

  execute(): void {
    assertStandaloneWorksheet(this.worksheet);
    this.previousFilters = new Map(this.worksheet.getAllFilters());
    this.hasUndoSnapshot = false;
    if (this.previousFilters.size === 0) return;
    try {
      this.worksheet.clearAllFilters();
      this.hasUndoSnapshot = true;
    } catch (error) {
      const recoveryErrors = this.restoreFilters(this.previousFilters);
      this.previousFilters.clear();
      throwWithRecoveryStatus('Clear Filter', error, recoveryErrors);
    }
  }

  undo(): void {
    assertStandaloneWorksheet(this.worksheet);
    if (!this.hasUndoSnapshot) return;
    const current = new Map(this.worksheet.getAllFilters());
    try {
      const errors = this.restoreFilters(this.previousFilters);
      if (errors.length) throwWithRecoveryStatus('Clear Filter undo', errors[0], errors.slice(1));
      this.hasUndoSnapshot = false;
    } catch (error) {
      const recoveryErrors = this.restoreFilters(current);
      if (recoveryErrors.length) this.hasUndoSnapshot = false;
      throwWithRecoveryStatus('Clear Filter undo', error, recoveryErrors);
    }
  }

  private restoreFilters(filters: Map<number, ColumnFilter>): unknown[] {
    const errors: unknown[] = [];
    try { this.worksheet.clearAllFilters(); } catch (error) { errors.push(error); }
    for (const [col, filter] of filters) {
      try { this.worksheet.setColumnFilter(col, filter); } catch (error) { errors.push(error); }
    }
    return errors;
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

  private previousRules: Map<string, WorksheetDataValidationRule | undefined>;
  private hasUndoSnapshot = false;

  constructor(
    private worksheet: Worksheet,
    private range: Range,
    private rule: DataValidationRule
  ) {
    this.previousRules = new Map();
  }

  execute(): void {
    assertStandaloneWorksheet(this.worksheet);
    this.previousRules.clear();
    this.hasUndoSnapshot = false;
    const worksheetRule = toWorksheetDataValidationRule(this.rule);

    for (let r = this.range.start.row; r <= this.range.end.row; r++) {
      for (let c = this.range.start.col; c <= this.range.end.col; c++) {
        const address = { row: r, col: c };
        this.previousRules.set(`${r},${c}`, this.worksheet.getDataValidation(address));
      }
    }

    try {
      for (let r = this.range.start.row; r <= this.range.end.row; r++) {
        for (let c = this.range.start.col; c <= this.range.end.col; c++) {
          const address = { row: r, col: c };
          this.worksheet.setDataValidation(address, worksheetRule);
        }
      }
      this.hasUndoSnapshot = true;
    } catch (error) {
      const recoveryErrors = this.restoreRules(this.previousRules);
      this.previousRules.clear();
      throwWithRecoveryStatus('Set Data Validation', error, recoveryErrors);
    }

    console.log(`Applied data validation to ${this.previousRules.size} cells`);
  }

  undo(): void {
    assertStandaloneWorksheet(this.worksheet);
    if (!this.hasUndoSnapshot) return;
    const current = this.captureRules();
    const errors = this.restoreRules(this.previousRules);
    if (errors.length) {
      const recoveryErrors = this.restoreRules(current);
      if (recoveryErrors.length) this.hasUndoSnapshot = false;
      throwWithRecoveryStatus('Set Data Validation undo', errors[0], [...errors.slice(1), ...recoveryErrors]);
    }
    this.hasUndoSnapshot = false;

    console.log('Restored previous data validation rules');
  }

  private captureRules(): Map<string, WorksheetDataValidationRule | undefined> {
    const rules = new Map<string, WorksheetDataValidationRule | undefined>();
    for (let r = this.range.start.row; r <= this.range.end.row; r++) {
      for (let c = this.range.start.col; c <= this.range.end.col; c++) {
        rules.set(`${r},${c}`, this.worksheet.getDataValidation({ row: r, col: c }));
      }
    }
    return rules;
  }

  private restoreRules(rules: Map<string, WorksheetDataValidationRule | undefined>): unknown[] {
    const errors: unknown[] = [];
    for (const [key, rule] of rules) {
      const [row, col] = key.split(',').map(Number);
      try {
        if (rule !== undefined) this.worksheet.setDataValidation({ row, col }, rule);
        else this.worksheet.removeDataValidation({ row, col });
      } catch (error) {
        errors.push(error);
      }
    }
    return errors;
  }
}

/**
 * ClearDataValidationCommand: Remove validation from range
 */
export class ClearDataValidationCommand implements Command {
  description = 'Clear Data Validation';

  private previousRules: Map<string, WorksheetDataValidationRule | undefined>;
  private hasUndoSnapshot = false;

  constructor(
    private worksheet: Worksheet,
    private range: Range
  ) {
    this.previousRules = new Map();
  }

  execute(): void {
    assertStandaloneWorksheet(this.worksheet);
    this.previousRules.clear();
    for (let r = this.range.start.row; r <= this.range.end.row; r++) {
      for (let c = this.range.start.col; c <= this.range.end.col; c++) {
        const address = { row: r, col: c };
        const existing = this.worksheet.getDataValidation(address);
        this.previousRules.set(`${r},${c}`, existing);
      }
    }

    this.hasUndoSnapshot = false;
    try {
      for (let r = this.range.start.row; r <= this.range.end.row; r++) {
        for (let c = this.range.start.col; c <= this.range.end.col; c++) {
          const address = { row: r, col: c };
          if (this.previousRules.get(`${r},${c}`) !== undefined) this.worksheet.removeDataValidation(address);
        }
      }
      this.hasUndoSnapshot = true;
    } catch (error) {
      const recoveryErrors = this.restoreRules(this.previousRules);
      this.previousRules.clear();
      throwWithRecoveryStatus('Clear Data Validation', error, recoveryErrors);
    }

    console.log(`Cleared data validation from ${this.previousRules.size} cells`);
  }

  undo(): void {
    assertStandaloneWorksheet(this.worksheet);
    if (!this.hasUndoSnapshot) return;
    const current = this.captureRules();
    const errors = this.restoreRules(new Map(Array.from(this.previousRules).filter(([, rule]) => rule !== undefined)));
    if (errors.length) {
      const recoveryErrors = this.restoreRules(current);
      if (recoveryErrors.length) this.hasUndoSnapshot = false;
      throwWithRecoveryStatus('Clear Data Validation undo', errors[0], [...errors.slice(1), ...recoveryErrors]);
    }
    this.hasUndoSnapshot = false;

    console.log('Restored data validation rules');
  }

  private captureRules(): Map<string, WorksheetDataValidationRule | undefined> {
    const rules = new Map<string, WorksheetDataValidationRule | undefined>();
    for (let r = this.range.start.row; r <= this.range.end.row; r++) {
      for (let c = this.range.start.col; c <= this.range.end.col; c++) {
        rules.set(`${r},${c}`, this.worksheet.getDataValidation({ row: r, col: c }));
      }
    }
    return rules;
  }

  private restoreRules(rules: Map<string, WorksheetDataValidationRule | undefined>): unknown[] {
    const errors: unknown[] = [];
    for (const [key, rule] of rules) {
      const [row, col] = key.split(',').map(Number);
      try {
        if (rule !== undefined) this.worksheet.setDataValidation({ row, col }, rule);
        else this.worksheet.removeDataValidation({ row, col });
      } catch (error) {
        errors.push(error);
      }
    }
    return errors;
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
    data: Map<number, { value: ExtendedCellValue; formula?: string }>;
    styles: Map<number, CellStyle | undefined>;
    tailData: Map<number, { value: ExtendedCellValue; formula?: string }>;
    tailStyles: Map<number, CellStyle | undefined>;
  }>;

  constructor(
    private worksheet: Worksheet,
    private range: Range,
    private compareColumns: number[],
    private hasHeaders: boolean = false
  ) {
    assertStandaloneWorksheet(this.worksheet);
    this.removedRows = [];
  }

  execute(): void {
    assertStandaloneWorksheet(this.worksheet);
    // A command can be replayed after undo. Keep each execution's snapshots
    // independent so formulas and values cannot drift between cycles.
    this.removedRows = [];
    const startRow = this.hasHeaders ? this.range.start.row + 1 : this.range.start.row;
    const endRow = this.range.end.row;
    const startCol = this.range.start.col;
    const endCol = this.range.end.col;

    // Capture the selected range before command reads or writes so any later
    // failure can restore the exact formula/value/style state. The snapshot is
    // command-local recovery state, not a Worksheet transaction.
    const recoverySnapshot: Array<{
      rowIndex: number;
      data: Map<number, { value: ExtendedCellValue; formula?: string }>;
      styles: Map<number, CellStyle | undefined>;
    }> = [];
    for (let row = this.range.start.row; row <= endRow; row++) {
      const captured = this.captureRow(row, startCol, endCol);
      recoverySnapshot.push({ rowIndex: row, ...captured });
    }

    // Track seen combinations
    const seen = new Set<string>();
    const rowsToDelete: number[] = [];

    // Find duplicates
    for (let r = startRow; r <= endRow; r++) {
      // Build key from compare columns
      const key = JSON.stringify(this.compareColumns.map((col) =>
        duplicateValueIdentity(this.worksheet.getCellValue({ row: r, col })),
      ));

      if (seen.has(key)) {
        rowsToDelete.push(r);
      } else {
        seen.add(key);
      }
    }

    // Store rows for undo (in reverse order for proper restoration)
    let mutationAttempted = false;
    try {
      for (const r of rowsToDelete.reverse()) {
        const removed = this.captureRow(r, startCol, endCol);
        const tail = this.captureRow(endRow, startCol, endCol);
        this.removedRows.push({
          rowIndex: r,
          data: removed.data,
          styles: removed.styles,
          tailData: tail.data,
          tailStyles: tail.styles,
        });

        // Delete row by shifting up
        mutationAttempted = true;
        this.deleteRow(r);
      }
    } catch (error) {
      if (!mutationAttempted) {
        this.removedRows = [];
        throw error;
      }
      const recoveryErrors: unknown[] = [];
      for (const row of recoverySnapshot) {
        for (const [col, content] of row.data) {
          try {
            this.worksheet.restoreCellContent({ row: row.rowIndex, col }, content);
          } catch (recoveryError) {
            recoveryErrors.push(recoveryError);
          }
        }
        for (const [col, style] of row.styles) {
          try {
            this.worksheet.setCellStyle({ row: row.rowIndex, col }, style);
          } catch (recoveryError) {
            recoveryErrors.push(recoveryError);
          }
        }
      }
      // Partial execution snapshots do not describe a completed operation and
      // must never be offered as a valid undo record.
      this.removedRows = [];
      throwWithRecoveryStatus('Remove Duplicates', error, recoveryErrors);
    }

    console.log(`Removed ${this.removedRows.length} duplicate rows`);
  }

  undo(): void {
    assertStandaloneWorksheet(this.worksheet);
    if (this.removedRows.length === 0) return;
    const recoverySnapshot: Array<{
      rowIndex: number;
      data: Map<number, { value: ExtendedCellValue; formula?: string }>;
      styles: Map<number, CellStyle | undefined>;
    }> = [];
    for (let row = this.range.start.row; row <= this.range.end.row; row++) {
      recoverySnapshot.push({ rowIndex: row, ...this.captureRow(row, this.range.start.col, this.range.end.col) });
    }

    // Restore removed rows in ascending original row order. Do not reverse the
    // stored snapshots in place: execute/undo/execute must remain repeatable.
    try {
      for (const row of [...this.removedRows].reverse()) {
        this.insertRow(row.rowIndex);

        // Insertion is bounded to the selected range. Restore the selected tail
        // that shifting down temporarily displaced before restoring the removed
        // row itself.
        this.restoreRow(this.range.end.row, row.tailData, row.tailStyles);

        // Restore formula text and its cached display value together. Ordinary
        // cells continue through setCellValue and are not converted to formulas.
        this.restoreRow(row.rowIndex, row.data, row.styles);
      }
    } catch (error) {
      const recoveryErrors = this.restoreRangeSnapshot(recoverySnapshot);
      if (recoveryErrors.length) this.removedRows = [];
      throwWithRecoveryStatus('Remove Duplicates undo', error, recoveryErrors);
    }

    console.log(`Restored ${this.removedRows.length} removed rows`);
    this.removedRows = [];
  }

  private restoreRangeSnapshot(snapshot: Array<{
    rowIndex: number;
    data: Map<number, { value: ExtendedCellValue; formula?: string }>;
    styles: Map<number, CellStyle | undefined>;
  }>): unknown[] {
    const errors: unknown[] = [];
    for (const row of snapshot) {
      for (const [col, content] of row.data) {
        try { this.worksheet.restoreCellContent({ row: row.rowIndex, col }, content); } catch (error) { errors.push(error); }
      }
      for (const [col, style] of row.styles) {
        try { this.worksheet.setCellStyle({ row: row.rowIndex, col }, style); } catch (error) { errors.push(error); }
      }
    }
    return errors;
  }

  private deleteRow(rowIndex: number): void {
    // The selected range defines the standalone command's row boundary. Do
    // not shift cells outside it or synthesize writes past Worksheet.rowCount.
    for (let r = rowIndex; r < this.range.end.row; r++) {
      for (let c = this.range.start.col; c <= this.range.end.col; c++) {
        const current = { row: r, col: c };
        const next = { row: r + 1, col: c };

        this.copyCellContent(next, current);
        this.worksheet.setCellStyle(current, this.worksheet.getDirectCellStyle(next));
      }
    }
    for (let c = this.range.start.col; c <= this.range.end.col; c++) {
      const tail = { row: this.range.end.row, col: c };
      this.worksheet.restoreCellContent(tail, { value: null });
      this.worksheet.setCellStyle(tail, undefined);
    }
  }

  private insertRow(rowIndex: number): void {
    for (let r = this.range.end.row; r > rowIndex; r--) {
      for (let c = this.range.start.col; c <= this.range.end.col; c++) {
        const current = { row: r, col: c };
        const prev = { row: r - 1, col: c };

        this.copyCellContent(prev, current);
        this.worksheet.setCellStyle(current, this.worksheet.getDirectCellStyle(prev));
      }
    }
  }

  private captureRow(
    rowIndex: number,
    startCol: number,
    endCol: number,
  ): {
    data: Map<number, { value: ExtendedCellValue; formula?: string }>;
    styles: Map<number, CellStyle | undefined>;
  } {
    const data = new Map<number, { value: ExtendedCellValue; formula?: string }>();
    const styles = new Map<number, CellStyle | undefined>();
    for (let col = startCol; col <= endCol; col++) {
      const address = { row: rowIndex, col };
      const cell = this.worksheet.getCell(address);
      data.set(col, {
        value: this.worksheet.getCellValue(address),
        ...(cell?.formula === undefined ? {} : { formula: cell.formula }),
      });
      styles.set(col, this.worksheet.getDirectCellStyle(address));
    }
    return { data, styles };
  }

  private restoreRow(
    rowIndex: number,
    data: Map<number, { value: ExtendedCellValue; formula?: string }>,
    styles: Map<number, CellStyle | undefined>,
  ): void {
    for (const [col, content] of data) {
      this.worksheet.restoreCellContent({ row: rowIndex, col }, content);
    }
    for (const [col, style] of styles) {
      this.worksheet.setCellStyle({ row: rowIndex, col }, style);
    }
  }

  private copyCellContent(source: Address, destination: Address): void {
    const sourceCell = this.worksheet.getCell(source);
    this.worksheet.restoreCellContent(destination, {
      value: this.worksheet.getCellValue(source),
      ...(sourceCell?.formula === undefined ? {} : { formula: sourceCell.formula }),
    });
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

  private previousData: Map<string, { value: ExtendedCellValue; formula?: string }>;
  private previousStyles: Map<string, CellStyle | undefined>;

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
    assertStandaloneWorksheet(this.worksheet);
    this.previousData.clear();
    this.previousStyles.clear();
    // Only process the first column of the range. Read and validate every
    // output before the first write so an invalid later row cannot leave
    // earlier rows partially split.
    const sourceCol = this.range.start.col;
    const splitRows: Array<{ row: number; parts: string[] }> = [];

    for (let r = this.range.start.row; r <= this.range.end.row; r++) {
      const addr = { row: r, col: sourceCol };
      const value = this.worksheet.getCellValue(addr);

      // Skip empty cells
      if (value == null || value === '') continue;

      // Split by delimiter
      const parts = String(value).split(this.delimiter);
      assertWorksheetAddress(r, sourceCol + parts.length - 1);
      splitRows.push({ row: r, parts });
    }

    // Capture every destination before writing so both undo and command-local
    // best-effort recovery can restore formula/value/style state after a
    // standalone write throws.
    for (const { row, parts } of splitRows) {
      for (let i = 0; i < parts.length; i++) {
        const targetAddr = { row, col: sourceCol + i };
        const key = `${row},${sourceCol + i}`;

        const targetCell = this.worksheet.getCell(targetAddr);
        this.previousData.set(key, {
          value: this.worksheet.getCellValue(targetAddr),
          ...(targetCell?.formula === undefined ? {} : { formula: targetCell.formula }),
        });
        this.previousStyles.set(key, this.worksheet.getDirectCellStyle(targetAddr));
      }
    }

    const attemptedWrites: string[] = [];
    try {
      for (const { row, parts } of splitRows) {
        for (let i = 0; i < parts.length; i++) {
          const col = sourceCol + i;
          attemptedWrites.push(`${row},${col}`);
          this.worksheet.setCellValue(
            { row, col },
            parts[i].trim(),
          );
        }
      }
    } catch (error) {
      const recoveryErrors: unknown[] = [];
      for (const key of [...attemptedWrites].reverse()) {
        const [row, col] = key.split(',').map(Number);
        const address = { row, col };
        try {
          this.worksheet.restoreCellContent(address, this.previousData.get(key)!);
        } catch (recoveryError) {
          recoveryErrors.push(recoveryError);
        }
        try {
          this.worksheet.setCellStyle(address, this.previousStyles.get(key));
        } catch (recoveryError) {
          recoveryErrors.push(recoveryError);
        }
      }
      // Recovery consumed the snapshots; a later execute must capture fresh
      // state and a later undo must not replay this failed command's snapshot.
      this.previousData.clear();
      this.previousStyles.clear();
      throwWithRecoveryStatus('Text to Columns', error, recoveryErrors);
    }

    console.log(`Split text into columns using delimiter: "${this.delimiter}"`);
  }

  undo(): void {
    assertStandaloneWorksheet(this.worksheet);
    if (this.previousData.size === 0) return;
    const currentData = new Map<string, { value: ExtendedCellValue; formula?: string }>();
    const currentStyles = new Map<string, CellStyle | undefined>();
    for (const key of this.previousData.keys()) {
      const [row, col] = key.split(',').map(Number);
      const address = { row, col };
      const cell = this.worksheet.getCell(address);
      currentData.set(key, {
        value: this.worksheet.getCellValue(address),
        ...(cell?.formula === undefined ? {} : { formula: cell.formula }),
      });
      currentStyles.set(key, this.worksheet.getDirectCellStyle(address));
    }

    const undoErrors = this.restoreSnapshot(this.previousData, this.previousStyles);
    if (undoErrors.length) {
      const recoveryErrors = this.restoreSnapshot(currentData, currentStyles);
      if (recoveryErrors.length) {
        this.previousData.clear();
        this.previousStyles.clear();
      }
      throwWithRecoveryStatus('Text to Columns undo', undoErrors[0], recoveryErrors);
    }

    this.previousData.clear();
    this.previousStyles.clear();

    console.log('Restored previous cell values');
  }

  private restoreSnapshot(
    data: Map<string, { value: ExtendedCellValue; formula?: string }>,
    styles: Map<string, CellStyle | undefined>,
  ): unknown[] {
    const errors: unknown[] = [];
    for (const [key, content] of data) {
      const [row, col] = key.split(',').map(Number);
      try { this.worksheet.restoreCellContent({ row, col }, content); } catch (error) { errors.push(error); }
    }
    for (const [key, style] of styles) {
      const [row, col] = key.split(',').map(Number);
      try { this.worksheet.setCellStyle({ row, col }, style); } catch (error) { errors.push(error); }
    }
    return errors;
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
    assertStandaloneWorksheet(this.worksheet);
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
    assertStandaloneWorksheet(this.worksheet);
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
    assertStandaloneWorksheet(this.worksheet);
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
    assertStandaloneWorksheet(this.worksheet);
    if (this.previousGroups) {
      (this.worksheet as any).outlineGroups = this.previousGroups;
      console.log('Restored previous outline groups');
    }
  }
}

// ─── AutoSum Command ───────────────────────────────────────────────────────

export interface AutoSumPlan {
  outputCell: Address;
  formula: string;
}

interface AutoSumCellSnapshot {
  addr: Address;
  formula: string;
  value: ExtendedCellValue;
}

/**
 * AutoSumCommand: Insert SUM/AVERAGE/COUNT/MAX/MIN formulas for detected ranges.
 */
export class AutoSumCommand implements Command {
  description = 'AutoSum';

  private readonly snapshots: AutoSumCellSnapshot[];
  private hasUndoSnapshot = false;

  constructor(
    private worksheet: Worksheet,
    private plans: AutoSumPlan[],
  ) {
    assertStandaloneWorksheet(worksheet);
    this.snapshots = this.captureSnapshots();
  }

  execute(): void {
    assertStandaloneWorksheet(this.worksheet);
    const seenOutputAddresses = new Set<string>();
    for (const plan of this.plans) {
      const key = `${plan.outputCell.row},${plan.outputCell.col}`;
      if (seenOutputAddresses.has(key)) throw new Error('AutoSum plans contain duplicate output addresses');
      seenOutputAddresses.add(key);
    }
    // Replays must undo to the state immediately before this execution, not
    // the state that happened to exist when the command was constructed.
    const snapshots = this.captureSnapshots();
    this.snapshots.splice(0, this.snapshots.length, ...snapshots);
    this.hasUndoSnapshot = false;
    try {
      for (const plan of this.plans) {
        this.worksheet.setCellFormula(plan.outputCell, plan.formula);
      }
      this.recalculate();
      this.hasUndoSnapshot = true;
    } catch (error) {
      const recoveryErrors = this.restoreSnapshots(this.snapshots);
      if (recoveryErrors.length === 0) {
        try {
          // Recompute dependent formula caches from the restored output cells.
          // This is a best-effort repair of recalculation side effects, not a
          // Worksheet-wide transaction: observers may already have seen them.
          this.recalculate();
        } catch (recoveryError) {
          recoveryErrors.push(recoveryError);
        }
      }
      throwWithRecoveryStatus('AutoSum', error, recoveryErrors);
    }
  }

  undo(): void {
    assertStandaloneWorksheet(this.worksheet);
    if (!this.hasUndoSnapshot) return;
    const current = this.captureSnapshots();
    try {
      const errors = this.restoreSnapshots(this.snapshots);
      if (errors.length) throwWithRecoveryStatus('AutoSum undo', errors[0], errors.slice(1));
      this.recalculate();
      this.hasUndoSnapshot = false;
    } catch (error) {
      const recoveryErrors = this.restoreSnapshots(current);
      if (recoveryErrors.length === 0) {
        try {
          // Restore dependent caches to the still-applied AutoSum output state.
          this.recalculate();
        } catch (recoveryError) {
          recoveryErrors.push(recoveryError);
        }
      }
      if (recoveryErrors.length) this.hasUndoSnapshot = false;
      throwWithRecoveryStatus('AutoSum undo', error, recoveryErrors);
    }
  }

  private recalculate(): void {
    try {
      this.worksheet.autoRecalculate();
    } catch (error) {
      if (error instanceof Error && error.message === 'Cannot auto-recalculate: no FormulaEngine available. Pass an engine to the Worksheet constructor.') return;
      throw error;
    }
  }

  private restoreSnapshots(snapshots: AutoSumCellSnapshot[]): unknown[] {
    const errors: unknown[] = [];
    for (const snapshot of snapshots) {
      try {
        this.worksheet.restoreCellContent(snapshot.addr, {
          value: snapshot.value,
          ...(snapshot.formula ? { formula: snapshot.formula } : {}),
        });
      } catch (error) {
        errors.push(error);
      }
    }
    return errors;
  }

  private captureSnapshots(): AutoSumCellSnapshot[] {
    return this.plans.map((plan) => {
      const cell = this.worksheet.getCell(plan.outputCell);
      return {
        addr: { ...plan.outputCell },
        formula: cell?.formula ?? '',
        value: cell?.value ?? null,
      };
    });
  }
}
