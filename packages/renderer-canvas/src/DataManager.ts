/**
 * DataManager.ts
 * 
 * Sorting, filtering, and grouping functionality
 */

import { Worksheet as WorksheetClass, toDisplayValue } from '@cyber-sheet/core';
import type { Address, CellValue, ExtendedCellValue, Worksheet } from '@cyber-sheet/core';

const worksheetIsWorkbookOwned = WorksheetClass.prototype.isWorkbookOwned;

function assertStandaloneWorksheet(worksheet: Worksheet): void {
  let isWorkbookOwned: boolean;
  try {
    isWorkbookOwned = worksheetIsWorkbookOwned.call(worksheet);
  } catch {
    throw new Error('DataManager requires an authentic standalone Worksheet');
  }

  if (isWorkbookOwned) {
    throw new Error('DataManager cannot operate on a Workbook-owned Worksheet');
  }
}

export type SortOrder = 'asc' | 'desc';
export type FilterOperator = 'equals' | 'notEquals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'greaterOrEqual' | 'lessOrEqual' | 'isEmpty' | 'isNotEmpty';

export interface SortConfig {
  column: number;
  order: SortOrder;
  comparator?: (a: CellValue, b: CellValue) => number;
}

export interface FilterConfig {
  column: number;
  operator: FilterOperator;
  value?: CellValue;
  predicate?: (value: CellValue) => boolean;
}

export interface GroupConfig {
  columns: number[];
  collapsed?: Set<string>;
}

export class DataManager {
  #worksheet: Worksheet;
  #sortedIndices: number[] | null = null;
  #filteredIndices: Set<number> | null = null;
  #groupedRows: Map<string, number[]> = new Map();
  #collapsedGroups: Set<string> = new Set();

  constructor(worksheet: Worksheet) {
    assertStandaloneWorksheet(worksheet);
    this.#worksheet = worksheet;
  }

  private assertUsableStandaloneWorksheet(): void {
    assertStandaloneWorksheet(this.#worksheet);
  }

  /**
   * Sort rows by one or more columns
   */
  sort(configs: SortConfig[]): void {
    this.assertUsableStandaloneWorksheet();
    const rowCount = this.#worksheet.rowCount;
    
    // Initialize indices
    const sortedIndices = Array.from({ length: rowCount }, (_, i) => i);

    // Sort with multi-column comparator
    sortedIndices.sort((aIdx, bIdx) => {
      for (const config of configs) {
        this.assertUsableStandaloneWorksheet();
        const aCell = this.#worksheet.getCell({ row: aIdx + 1, col: config.column });
        this.assertUsableStandaloneWorksheet();
        const bCell = this.#worksheet.getCell({ row: bIdx + 1, col: config.column });
        
        const aVal = toDisplayValue(aCell?.value ?? null);
        const bVal = toDisplayValue(bCell?.value ?? null);

        let cmp: number;
        if (config.comparator) {
          this.assertUsableStandaloneWorksheet();
          cmp = config.comparator(aVal, bVal);
        } else {
          cmp = this.defaultComparator(aVal, bVal);
        }

        if (cmp !== 0) {
          return config.order === 'asc' ? cmp : -cmp;
        }
      }
      return 0;
    });

    this.assertUsableStandaloneWorksheet();
    this.#sortedIndices = sortedIndices;
    this.dispatchEvent('sort', { configs });
  }

  /**
   * Default comparator for cell values
   */
  private defaultComparator(a: ExtendedCellValue, b: ExtendedCellValue): number {
    // Null values last
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;

    // Numbers
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }

    // Strings
    if (typeof a === 'string' && typeof b === 'string') {
      return a.localeCompare(b);
    }

    // Booleans
    if (typeof a === 'boolean' && typeof b === 'boolean') {
      return a === b ? 0 : a ? 1 : -1;
    }

    // Mixed types: convert to string
    return String(a).localeCompare(String(b));
  }

  /**
   * Filter rows based on conditions
   */
  filter(configs: FilterConfig[]): void {
    this.assertUsableStandaloneWorksheet();
    const rowCount = this.#worksheet.rowCount;
    const filteredIndices = new Set<number>();

    for (let row = 0; row < rowCount; row++) {
      let visible = true;

      for (const config of configs) {
        this.assertUsableStandaloneWorksheet();
        const cell = this.#worksheet.getCell({ row: row + 1, col: config.column });
        const value = toDisplayValue(cell?.value ?? null);

        if (config.predicate) {
          this.assertUsableStandaloneWorksheet();
          const matches = config.predicate(value);
          this.assertUsableStandaloneWorksheet();
          if (!matches) {
            visible = false;
            break;
          }
        } else {
          if (!this.evaluateFilter(value, config)) {
            visible = false;
            break;
          }
        }
      }

      if (!visible) {
        filteredIndices.add(row);
      }
    }

    this.assertUsableStandaloneWorksheet();
    this.#filteredIndices = filteredIndices;
    this.dispatchEvent('filter', { configs, hiddenCount: filteredIndices.size });
  }

  /**
   * Evaluate filter condition
   */
  private evaluateFilter(value: ExtendedCellValue, config: FilterConfig): boolean {
    switch (config.operator) {
      case 'equals':
        return value === config.value;
      case 'notEquals':
        return value !== config.value;
      case 'contains':
        return String(value).includes(String(config.value));
      case 'startsWith':
        return String(value).startsWith(String(config.value));
      case 'endsWith':
        return String(value).endsWith(String(config.value));
      case 'greaterThan':
        return typeof value === 'number' && typeof config.value === 'number' && value > config.value;
      case 'lessThan':
        return typeof value === 'number' && typeof config.value === 'number' && value < config.value;
      case 'greaterOrEqual':
        return typeof value === 'number' && typeof config.value === 'number' && value >= config.value;
      case 'lessOrEqual':
        return typeof value === 'number' && typeof config.value === 'number' && value <= config.value;
      case 'isEmpty':
        return value == null || String(value).trim() === '';
      case 'isNotEmpty':
        return value != null && String(value).trim() !== '';
      default:
        return true;
    }
  }

  /**
   * Group rows by column values
   */
  group(config: GroupConfig): void {
    this.assertUsableStandaloneWorksheet();
    const groupedRows = new Map<string, number[]>();
    const collapsedGroups = new Set(config.collapsed ?? []);

    const rowCount = this.#worksheet.rowCount;

    for (let row = 0; row < rowCount; row++) {
      // Create group key from column values
      const keyParts: string[] = [];
      for (const col of config.columns) {
        this.assertUsableStandaloneWorksheet();
        const cell = this.#worksheet.getCell({ row: row + 1, col });
        const value = String(cell?.value ?? '');
        this.assertUsableStandaloneWorksheet();
        keyParts.push(value);
      }
      const key = keyParts.join('|');

      if (!groupedRows.has(key)) {
        groupedRows.set(key, []);
      }
      groupedRows.get(key)!.push(row);
    }

    this.assertUsableStandaloneWorksheet();
    this.#groupedRows = groupedRows;
    this.#collapsedGroups = collapsedGroups;
    this.dispatchEvent('group', { 
      config, 
      groupCount: groupedRows.size
    });
  }

  /**
   * Toggle group collapsed state
   */
  toggleGroup(groupKey: string): void {
    this.assertUsableStandaloneWorksheet();
    if (this.#collapsedGroups.has(groupKey)) {
      this.#collapsedGroups.delete(groupKey);
    } else {
      this.#collapsedGroups.add(groupKey);
    }

    this.dispatchEvent('groupToggle', { groupKey, collapsed: this.#collapsedGroups.has(groupKey) });
  }

  /**
   * Collapse all groups
   */
  collapseAllGroups(): void {
    this.assertUsableStandaloneWorksheet();
    for (const key of this.#groupedRows.keys()) {
      this.#collapsedGroups.add(key);
    }
    this.dispatchEvent('groupCollapseAll', {});
  }

  /**
   * Expand all groups
   */
  expandAllGroups(): void {
    this.assertUsableStandaloneWorksheet();
    this.#collapsedGroups.clear();
    this.dispatchEvent('groupExpandAll', {});
  }

  /**
   * Check if a row is visible (not filtered or collapsed)
   */
  isRowVisible(row: number): boolean {
    this.assertUsableStandaloneWorksheet();
    // Check if filtered
    if (this.#filteredIndices && this.#filteredIndices.has(row)) {
      return false;
    }

    // Check if in collapsed group
    for (const [key, rows] of this.#groupedRows.entries()) {
      if (rows.includes(row) && this.#collapsedGroups.has(key)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get the visual row index (accounting for sorting)
   */
  getVisualRow(physicalRow: number): number {
    this.assertUsableStandaloneWorksheet();
    if (!this.#sortedIndices) return physicalRow;
    return this.#sortedIndices.indexOf(physicalRow);
  }

  /**
   * Get the physical row index from visual index
   */
  getPhysicalRow(visualRow: number): number {
    this.assertUsableStandaloneWorksheet();
    if (!this.#sortedIndices) return visualRow;
    return this.#sortedIndices[visualRow];
  }

  /**
   * Get visible row indices
   */
  getVisibleRows(): number[] {
    this.assertUsableStandaloneWorksheet();
    const rowCount = this.#worksheet.rowCount;
    const visible: number[] = [];

    for (let row = 0; row < rowCount; row++) {
      if (this.isRowVisible(row)) {
        visible.push(row);
      }
    }

    return visible;
  }

  /**
   * Clear all sorting
   */
  clearSort(): void {
    this.assertUsableStandaloneWorksheet();
    this.#sortedIndices = null;
    this.dispatchEvent('sortClear', {});
  }

  /**
   * Clear all filtering
   */
  clearFilter(): void {
    this.assertUsableStandaloneWorksheet();
    this.#filteredIndices = null;
    this.dispatchEvent('filterClear', {});
  }

  /**
   * Clear all grouping
   */
  clearGroup(): void {
    this.assertUsableStandaloneWorksheet();
    this.#groupedRows.clear();
    this.#collapsedGroups.clear();
    this.dispatchEvent('groupClear', {});
  }

  /**
   * Get groups
   */
  getGroups(): Map<string, number[]> {
    this.assertUsableStandaloneWorksheet();
    return new Map(Array.from(this.#groupedRows, ([key, rows]) => [key, [...rows]]));
  }

  /**
   * Get collapsed groups
   */
  getCollapsedGroups(): Set<string> {
    this.assertUsableStandaloneWorksheet();
    return new Set(this.#collapsedGroups);
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalRows: number;
    visibleRows: number;
    hiddenByFilter: number;
    hiddenByGroup: number;
    groupCount: number;
  } {
    this.assertUsableStandaloneWorksheet();
    const totalRows = this.#worksheet.rowCount;
    const visibleRows = this.getVisibleRows().length;
    const hiddenByFilter = this.#filteredIndices?.size ?? 0;
    
    let hiddenByGroup = 0;
    for (const [key, rows] of this.#groupedRows.entries()) {
      if (this.#collapsedGroups.has(key)) {
        hiddenByGroup += rows.length;
      }
    }

    return {
      totalRows,
      visibleRows,
      hiddenByFilter,
      hiddenByGroup,
      groupCount: this.#groupedRows.size
    };
  }

  /**
   * Dispatch custom event
   */
  private dispatchEvent(type: string, detail: unknown): void {
    const event = new CustomEvent(`cyber-sheet-data-${type}`, { detail });
    document.dispatchEvent(event);
  }
}
