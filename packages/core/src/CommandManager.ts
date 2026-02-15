/**
 * CommandManager: Temporal Identity Stability
 * 
 * Undo/Redo with Canonical Pointer Discipline
 * 
 * Rules:
 * 1. Store canonical style pointers only (never clone)
 * 2. Replay via direct pointer reassignment
 * 3. No reconstruction, no spreading, no delta patching
 * 4. Validate: styleA === styleA' after undo cycle
 * 
 * This is not UX plumbing. This is the final identity stress test.
 */

import type { Address, CellValue, CellStyle } from './types';
import type { Worksheet } from './worksheet';

/**
 * Command interface: Pure pointer operations
 */
export interface Command {
  /**
   * Execute the operation
   */
  execute(): void;
  
  /**
   * Undo the operation (restore previous pointers)
   */
  undo(): void;
  
  /**
   * Optional description for debugging
   */
  description?: string;
}

/**
 * Cell state snapshot: Canonical pointers only
 * 
 * NEVER store:
 * - { ...style } (spreading)
 * - JSON.parse(JSON.stringify(style)) (serialization)
 * - Patch deltas ({ bold: true })
 * 
 * ONLY store:
 * - Direct reference to canonical frozen style
 */
interface CellSnapshot {
  addr: Address;
  value: CellValue;
  style: CellStyle | undefined;  // Canonical pointer (frozen, interned)
}

/**
 * SetValueCommand: Change cell value
 */
export class SetValueCommand implements Command {
  private worksheet: Worksheet;
  private addr: Address;
  private previousValue: CellValue;
  private newValue: CellValue;
  
  constructor(worksheet: Worksheet, addr: Address, newValue: CellValue) {
    this.worksheet = worksheet;
    this.addr = addr;
    this.previousValue = worksheet.getCellValue(addr);
    this.newValue = newValue;
  }
  
  execute(): void {
    this.worksheet.setCellValue(this.addr, this.newValue);
  }
  
  undo(): void {
    this.worksheet.setCellValue(this.addr, this.previousValue);
  }
}

/**
 * SetStyleCommand: Change cell style
 * 
 * CRITICAL: Stores canonical pointers, not clones.
 * Undo replays by reassigning the previous canonical reference.
 * 
 * If this passes:
 *   styleA === getCellStyle(addr) after undo
 * 
 * Then temporal stability is proven.
 */
export class SetStyleCommand implements Command {
  private worksheet: Worksheet;
  private addr: Address;
  private previousStyle: CellStyle | undefined;  // Canonical pointer
  private newStyle: CellStyle | undefined;       // Canonical pointer
  
  constructor(worksheet: Worksheet, addr: Address, newStyle: CellStyle | undefined) {
    this.worksheet = worksheet;
    this.addr = addr;
    
    // Capture current canonical style
    this.previousStyle = worksheet.getCellStyle(addr);
    this.newStyle = newStyle;
  }
  
  execute(): void {
    // setCellStyle auto-interns if needed, but prefer passing canonical
    this.worksheet.setCellStyle(this.addr, this.newStyle);
  }
  
  undo(): void {
    // Restore previous canonical pointer
    // This must result in strict pointer equality: styleA === styleA'
    this.worksheet.setCellStyle(this.addr, this.previousStyle);
  }
}

/**
 * BatchCommand: Multiple operations executed atomically
 * 
 * Used for range operations (e.g., format 100 cells)
 */
export class BatchCommand implements Command {
  private commands: Command[];
  public description?: string;
  
  constructor(commands: Command[], description?: string) {
    this.commands = commands;
    this.description = description;
  }
  
  execute(): void {
    for (const cmd of this.commands) {
      cmd.execute();
    }
  }
  
  undo(): void {
    // Undo in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }
}

/**
 * SetRangeStyleCommand: Apply style to range
 * 
 * Stores canonical pointers for each cell in range.
 * No reconstruction during replay.
 */
export class SetRangeStyleCommand implements Command {
  private worksheet: Worksheet;
  private snapshots: CellSnapshot[] = [];
  private range: { start: Address; end: Address };
  private newStyle: CellStyle | undefined;
  
  constructor(
    worksheet: Worksheet,
    range: { start: Address; end: Address },
    newStyle: CellStyle | undefined
  ) {
    this.worksheet = worksheet;
    this.range = range;
    this.newStyle = newStyle;
    
    // Capture previous state (canonical pointers)
    for (let row = range.start.row; row <= range.end.row; row++) {
      for (let col = range.start.col; col <= range.end.col; col++) {
        const addr = { row, col };
        this.snapshots.push({
          addr,
          value: worksheet.getCellValue(addr),
          style: worksheet.getCellStyle(addr)  // Canonical pointer
        });
      }
    }
  }
  
  execute(): void {
    for (let row = this.range.start.row; row <= this.range.end.row; row++) {
      for (let col = this.range.start.col; col <= this.range.end.col; col++) {
        this.worksheet.setCellStyle({ row, col }, this.newStyle);
      }
    }
  }
  
  undo(): void {
    // Restore each cell's previous canonical pointer
    for (const snapshot of this.snapshots) {
      this.worksheet.setCellStyle(snapshot.addr, snapshot.style);
    }
  }
}

/**
 * CommandManager: Undo/Redo Stack with Pointer Discipline
 * 
 * Final Identity Stress Test:
 * - Temporal stability (pointer cycling)
 * - No reconstruction overhead
 * - No GC pressure from cloning
 * - Strict === equality after undo
 */
export class CommandManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxHistorySize: number;
  
  constructor(maxHistorySize: number = 100) {
    this.maxHistorySize = maxHistorySize;
  }
  
  /**
   * Execute command and add to history
   */
  execute(command: Command): void {
    command.execute();
    
    this.undoStack.push(command);
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
    
    // Clear redo stack when new command executed
    this.redoStack = [];
  }
  
  /**
   * Undo last command
   * 
   * Returns true if undo was successful
   */
  undo(): boolean {
    const command = this.undoStack.pop();
    if (!command) return false;
    
    command.undo();
    this.redoStack.push(command);
    
    return true;
  }
  
  /**
   * Redo last undone command
   * 
   * Returns true if redo was successful
   */
  redo(): boolean {
    const command = this.redoStack.pop();
    if (!command) return false;
    
    command.execute();
    this.undoStack.push(command);
    
    return true;
  }
  
  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  
  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
  
  /**
   * Clear all history
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
  
  /**
   * Get history size
   */
  getHistorySize(): { undoCount: number; redoCount: number } {
    return {
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length
    };
  }
  
  /**
   * Get undo stack description (for debugging)
   */
  getUndoHistory(): string[] {
    return this.undoStack
      .map(cmd => cmd.description || 'Unnamed command')
      .filter(Boolean);
  }
}

/**
 * Factory functions for common commands
 */
export class Commands {
  /**
   * Create SetValue command
   */
  static setValue(worksheet: Worksheet, addr: Address, value: CellValue): Command {
    return new SetValueCommand(worksheet, addr, value);
  }
  
  /**
   * Create SetStyle command
   */
  static setStyle(worksheet: Worksheet, addr: Address, style: CellStyle | undefined): Command {
    return new SetStyleCommand(worksheet, addr, style);
  }
  
  /**
   * Create SetRangeStyle command
   */
  static setRangeStyle(
    worksheet: Worksheet,
    range: { start: Address; end: Address },
    style: CellStyle | undefined
  ): Command {
    return new SetRangeStyleCommand(worksheet, range, style);
  }
  
  /**
   * Create batch command
   */
  static batch(commands: Command[], description?: string): Command {
    return new BatchCommand(commands, description);
  }
}
