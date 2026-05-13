/**
 * ClearCellsCommand.ts
 * 
 * Command for clearing cell contents with full undo/redo support.
 * Used by Cut and Delete operations.
 */

import type { Command } from './CommandManager';
import type { Address, ExtendedCellValue, CellStyle } from './types';
import type { Worksheet } from './worksheet';

interface CellSnapshot {
  addr: Address;
  value: ExtendedCellValue;
  formula: string | undefined;
  style: CellStyle | undefined;
}

export class ClearCellsCommand implements Command {
  private worksheet: Worksheet;
  private range: { start: Address; end: Address };
  private snapshots: CellSnapshot[] = [];
  
  readonly description: string;
  
  constructor(worksheet: Worksheet, range: { start: Address; end: Address }) {
    this.worksheet = worksheet;
    this.range = range;
    
    const r1 = Math.min(range.start.row, range.end.row);
    const r2 = Math.max(range.start.row, range.end.row);
    const c1 = Math.min(range.start.col, range.end.col);
    const c2 = Math.max(range.start.col, range.end.col);
    
    this.description = `Clear cells (${r1},${c1}) to (${r2},${c2})`;
    
    // Capture current state for undo
    for (let row = r1; row <= r2; row++) {
      for (let col = c1; col <= c2; col++) {
        const addr: Address = { row, col };
        const cell = this.worksheet.getCell(addr);
        
        this.snapshots.push({
          addr,
          value: cell?.value ?? null,
          formula: cell?.formula,
          style: cell?.style
        });
      }
    }
  }
  
  execute(): void {
    const r1 = Math.min(this.range.start.row, this.range.end.row);
    const r2 = Math.max(this.range.start.row, this.range.end.row);
    const c1 = Math.min(this.range.start.col, this.range.end.col);
    const c2 = Math.max(this.range.start.col, this.range.end.col);
    
    // Clear all cells in range
    for (let row = r1; row <= r2; row++) {
      for (let col = c1; col <= c2; col++) {
        const addr: Address = { row, col };
        this.worksheet.setCellValue(addr, '');
        this.worksheet.setCellFormula(addr, '');
      }
    }
  }
  
  undo(): void {
    // Restore all cells to their previous state
    for (const snapshot of this.snapshots) {
      if (snapshot.formula) {
        this.worksheet.setCellFormula(snapshot.addr, snapshot.formula);
      } else {
        this.worksheet.setCellValue(snapshot.addr, snapshot.value);
      }
      
      if (snapshot.style !== undefined) {
        this.worksheet.setCellStyle(snapshot.addr, snapshot.style);
      }
    }
  }
}
