/**
 * EditingManager.ts
 * 
 * Advanced editing features: clipboard, undo/redo, fill handle, multi-cell selection
 */

import type { Address, ExtendedCellValue, Cell } from '@cyber-sheet/core';
import { Worksheet as WorksheetClass } from '@cyber-sheet/core';
import type { Worksheet } from '@cyber-sheet/core';

const worksheetIsWorkbookOwned = WorksheetClass.prototype.isWorkbookOwned;

function assertStandaloneWorksheet(worksheet: Worksheet): void {
  let isWorkbookOwned: boolean;
  try {
    isWorkbookOwned = worksheetIsWorkbookOwned.call(worksheet);
  } catch {
    throw new Error('EditingManager requires an authentic standalone Worksheet');
  }

  if (isWorkbookOwned) {
    throw new Error('EditingManager cannot operate on a Workbook-owned Worksheet');
  }
}

export interface ClipboardData {
  cells: Cell[][];
  range: { start: Address; end: Address };
  isCut: boolean;
}

export interface EditCommand {
  type: 'setValue' | 'setStyle' | 'insertRow' | 'deleteRow' | 'insertCol' | 'deleteCol';
  execute: () => void;
  undo: () => void;
}

export interface EditingOptions {
  maxHistorySize?: number;
  enableClipboard?: boolean;
  enableFillHandle?: boolean;
  enableMultiSelect?: boolean;
}

type ClipboardEventType = 'copy' | 'cut' | 'paste';

export class EditingManager {
  #worksheet: Worksheet;
  #disposed = false;
  #clipboardListeners: Array<{ type: ClipboardEventType; listener: EventListener }> = [];
  #undoStack: EditCommand[] = [];
  #redoStack: EditCommand[] = [];
  private maxHistorySize: number;
  #clipboardData: ClipboardData | null = null;
  private selection: { start: Address; end: Address } | null = null;
  
  constructor(worksheet: Worksheet, options: EditingOptions = {}) {
    // Establish the input contract before retaining the Worksheet or adding
    // any document listeners.
    assertStandaloneWorksheet(worksheet);
    this.#worksheet = worksheet;
    this.maxHistorySize = options.maxHistorySize ?? 100;
    
    if (options.enableClipboard !== false) {
      // Each operation checks again because a standalone Worksheet can be
      // adopted after this manager is constructed.
      this.setupClipboard();
    }
  }

  /**
   * Setup clipboard event listeners
   */
  private setupClipboard(): void {
    const listeners: Array<{ type: ClipboardEventType; listener: EventListener }> = [
      { type: 'copy', listener: (event) => {
        if (!this.#disposed) this.handleCopy(event as ClipboardEvent);
      } },
      { type: 'cut', listener: (event) => {
        if (!this.#disposed) this.handleCut(event as ClipboardEvent);
      } },
      { type: 'paste', listener: (event) => {
        if (!this.#disposed) this.handlePaste(event as ClipboardEvent);
      } },
    ];

    for (const entry of listeners) {
      document.addEventListener(entry.type, entry.listener);
      this.#clipboardListeners.push(entry);
    }
  }

  /**
   * Remove this manager's document listeners and disable its operations.
   * Call when the manager's standalone editing lifecycle ends. A later
   * Worksheet ownership change does not automatically call dispose().
   */
  dispose(): void {
    if (this.#disposed) return;

    this.#disposed = true;
    for (const { type, listener } of this.#clipboardListeners) {
      document.removeEventListener(type, listener);
    }
    this.#clipboardListeners = [];
  }

  private assertUsableStandaloneWorksheet(): void {
    if (this.#disposed) {
      throw new Error('EditingManager has been disposed');
    }
    assertStandaloneWorksheet(this.#worksheet);
  }

  /**
   * Handle copy event
   */
  private handleCopy(e: ClipboardEvent): void {
    this.assertUsableStandaloneWorksheet();
    if (!this.selection) return;
    
    e.preventDefault();
    
    const data = this.getCellsInRange(this.selection.start, this.selection.end);
    this.#clipboardData = {
      cells: data,
      range: this.selection,
      isCut: false
    };

    // Set clipboard data in multiple formats
    const text = this.convertToPlainText(data);
    const html = this.convertToHTML(data);
    const csv = this.convertToCSV(data);

    e.clipboardData?.setData('text/plain', text);
    e.clipboardData?.setData('text/html', html);
    e.clipboardData?.setData('text/csv', csv);
    
    // Custom format for preserving full cell data
    e.clipboardData?.setData('application/x-cyber-sheet', JSON.stringify(this.#clipboardData));
  }

  /**
   * Handle cut event
   */
  private handleCut(e: ClipboardEvent): void {
    this.assertUsableStandaloneWorksheet();
    if (!this.selection) return;
    
    this.handleCopy(e);
    
    if (this.#clipboardData) {
      this.#clipboardData.isCut = true;
      
      // Clear cells in the cut range
      this.executeCommand({
        type: 'setValue',
        execute: () => {
          for (let row = this.selection!.start.row; row <= this.selection!.end.row; row++) {
            for (let col = this.selection!.start.col; col <= this.selection!.end.col; col++) {
              this.#worksheet.setCellValue({ row, col }, null);
            }
          }
        },
        undo: () => {
          // Restore values
          const { cells, range } = this.#clipboardData!;
          for (let r = 0; r < cells.length; r++) {
            for (let c = 0; c < cells[r].length; c++) {
              const addr = {
                row: range.start.row + r,
                col: range.start.col + c
              };
              this.#worksheet.setCellValue(addr, cells[r][c].value);
            }
          }
        }
      });
    }
  }

  /**
   * Handle paste event
   */
  private handlePaste(e: ClipboardEvent): void {
    this.assertUsableStandaloneWorksheet();
    if (!this.selection) return;
    
    e.preventDefault();

    // Try custom format first
    const customData = e.clipboardData?.getData('application/x-cyber-sheet');
    if (customData) {
      try {
        const data: ClipboardData = JSON.parse(customData);
        this.pasteCells(data.cells, this.selection.start);
        return;
      } catch {}
    }

    // Fallback to plain text
    const text = e.clipboardData?.getData('text/plain');
    if (text) {
      const cells = this.parsePlainText(text);
      this.pasteCells(cells, this.selection.start);
    }
  }

  /**
   * Paste cells at the specified position
   */
  private pasteCells(cells: Cell[][], start: Address): void {
    this.assertUsableStandaloneWorksheet();
    const oldValues: Array<{ addr: Address; value: ExtendedCellValue; cell: Cell | null }> = [];

    // Capture old values for undo
    for (let r = 0; r < cells.length; r++) {
      for (let c = 0; c < cells[r].length; c++) {
        const addr = { row: start.row + r, col: start.col + c };
        const cell = this.#worksheet.getCell(addr);
        oldValues.push({
          addr,
          value: cell?.value ?? null,
          cell: cell ?? null
        });
      }
    }

    this.executeCommand({
      type: 'setValue',
      execute: () => {
        for (let r = 0; r < cells.length; r++) {
          for (let c = 0; c < cells[r].length; c++) {
            const addr = { row: start.row + r, col: start.col + c };
            const cell = cells[r][c];
            
            this.#worksheet.setCellValue(addr, cell.value);
            
            // Copy style if available
            if (cell.style) {
              const targetCell = this.#worksheet.getCell(addr);
              if (targetCell) {
                this.#worksheet.setCellStyle(addr, { ...cell.style });
              }
            }
          }
        }
      },
      undo: () => {
        for (const { addr, value } of oldValues) {
          this.#worksheet.setCellValue(addr, value);
        }
      }
    });
  }

  /**
   * Get cells in a range
   */
  private getCellsInRange(start: Address, end: Address): Cell[][] {
    this.assertUsableStandaloneWorksheet();
    const cells: Cell[][] = [];
    
    for (let row = start.row; row <= end.row; row++) {
      const rowCells: Cell[] = [];
      for (let col = start.col; col <= end.col; col++) {
        const cell = this.#worksheet.getCell({ row, col });
        rowCells.push(cell ? { ...cell } : { value: null });
      }
      cells.push(rowCells);
    }
    
    return cells;
  }

  /**
   * Convert cells to plain text
   */
  private convertToPlainText(cells: Cell[][]): string {
    return cells.map(row => 
      row.map(cell => String(cell.value ?? '')).join('\t')
    ).join('\n');
  }

  /**
   * Convert cells to HTML table
   */
  private convertToHTML(cells: Cell[][]): string {
    let html = '<table>';
    
    for (const row of cells) {
      html += '<tr>';
      for (const cell of row) {
        html += `<td>${cell.value ?? ''}</td>`;
      }
      html += '</tr>';
    }
    
    html += '</table>';
    return html;
  }

  /**
   * Convert cells to CSV
   */
  private convertToCSV(cells: Cell[][]): string {
    return cells.map(row =>
      row.map(cell => {
        const value = String(cell.value ?? '');
        return value.includes(',') || value.includes('"') || value.includes('\n')
          ? `"${value.replace(/"/g, '""')}"`
          : value;
      }).join(',')
    ).join('\n');
  }

  /**
   * Parse plain text to cells
   */
  private parsePlainText(text: string): Cell[][] {
    const rows = text.split(/\r?\n/);
    return rows.map(row => {
      const cols = row.split('\t');
      return cols.map(value => {
        // Try to parse as number
        const num = parseFloat(value);
        return {
          value: !isNaN(num) && value.trim() !== '' ? num : value
        };
      });
    });
  }

  /**
   * Execute a command and add to undo stack
   */
  private executeCommand(command: EditCommand): void {
    this.assertUsableStandaloneWorksheet();
    command.execute();
    
    this.#undoStack.push(command);
    if (this.#undoStack.length > this.maxHistorySize) {
      this.#undoStack.shift();
    }
    
    // Clear redo stack when new command is executed
    this.#redoStack = [];
  }

  /**
   * Undo the last command
   */
  undo(): boolean {
    this.assertUsableStandaloneWorksheet();
    const command = this.#undoStack.pop();
    if (!command) return false;
    
    command.undo();
    this.#redoStack.push(command);
    
    return true;
  }

  /**
   * Redo the last undone command
   */
  redo(): boolean {
    this.assertUsableStandaloneWorksheet();
    const command = this.#redoStack.pop();
    if (!command) return false;
    
    command.execute();
    this.#undoStack.push(command);
    
    return true;
  }

  /**
   * Set current selection
   */
  setSelection(start: Address, end?: Address): void {
    this.selection = {
      start,
      end: end ?? start
    };
  }

  /**
   * Get current selection
   */
  getSelection(): { start: Address; end: Address } | null {
    return this.selection;
  }

  /**
   * Fill cells with a pattern (drag fill handle)
   */
  fillCells(source: Address, target: { start: Address; end: Address }): void {
    this.assertUsableStandaloneWorksheet();
    const sourceCell = this.#worksheet.getCell(source);
    if (!sourceCell) return;

    const oldValues: Array<{ addr: Address; value: ExtendedCellValue }> = [];

    this.executeCommand({
      type: 'setValue',
      execute: () => {
        // Detect pattern type
        const value = sourceCell.value;
        
        if (typeof value === 'number') {
          // Number sequence
          let current = value;
          for (let row = target.start.row; row <= target.end.row; row++) {
            for (let col = target.start.col; col <= target.end.col; col++) {
              const addr = { row, col };
              oldValues.push({ addr, value: this.#worksheet.getCell(addr)?.value ?? null });
              this.#worksheet.setCellValue(addr, current++);
            }
          }
        } else if (typeof value === 'string') {
          // Check for date pattern
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            // Date sequence
            let currentDate = new Date(date);
            for (let row = target.start.row; row <= target.end.row; row++) {
              for (let col = target.start.col; col <= target.end.col; col++) {
                const addr = { row, col };
                oldValues.push({ addr, value: this.#worksheet.getCell(addr)?.value ?? null });
                this.#worksheet.setCellValue(addr, currentDate.toLocaleDateString());
                currentDate.setDate(currentDate.getDate() + 1);
              }
            }
          } else {
            // Copy value
            for (let row = target.start.row; row <= target.end.row; row++) {
              for (let col = target.start.col; col <= target.end.col; col++) {
                const addr = { row, col };
                oldValues.push({ addr, value: this.#worksheet.getCell(addr)?.value ?? null });
                this.#worksheet.setCellValue(addr, value);
              }
            }
          }
        } else {
          // Copy value
          for (let row = target.start.row; row <= target.end.row; row++) {
            for (let col = target.start.col; col <= target.end.col; col++) {
              const addr = { row, col };
              oldValues.push({ addr, value: this.#worksheet.getCell(addr)?.value ?? null });
              this.#worksheet.setCellValue(addr, value);
            }
          }
        }
      },
      undo: () => {
        for (const { addr, value } of oldValues) {
          this.#worksheet.setCellValue(addr, value);
        }
      }
    });
  }

  /**
   * Clear undo/redo history
   */
  clearHistory(): void {
    this.assertUsableStandaloneWorksheet();
    this.#undoStack = [];
    this.#redoStack = [];
  }

  /**
   * Get history statistics
   */
  getHistoryStats(): { undoCount: number; redoCount: number } {
    return {
      undoCount: this.#undoStack.length,
      redoCount: this.#redoStack.length
    };
  }
}
