/**
 * ClipboardService.ts
 * 
 * Pure data extraction layer for copy/cut operations.
 * Value-level snapshots with offset-based coordinates.
 * 
 * Architecture: Snapshot Model
 * - Offset-based coordinates (top-left = 0,0)
 * - Serialized styles (no object references)
 * - Merged cells: anchor only with dimensions
 * - Immutable payload (Object.freeze)
 * - Zero worksheet coupling after creation
 * 
 * Phase: Clipboard Architecture V1 - Phase 0.2
 * Baseline: BASELINE_STABLE_V1
 */

import type { Address, Range, ExtendedCellValue, CellStyle } from './types';
import type { Worksheet } from './worksheet';

/**
 * Serialized style representation — pure data, no object references.
 * 
 * @invariant No style object pointers
 * @invariant Minimal normalized representation
 */
export interface SerializedStyle {
  // Font
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean | 'single' | 'double' | 'singleAccounting' | 'doubleAccounting';
  color?: string;
  strikethrough?: boolean;
  
  // Alignment
  align?: 'left' | 'center' | 'right' | 'fill' | 'justify' | 'centerContinuous' | 'distributed';
  valign?: 'top' | 'middle' | 'bottom' | 'justify' | 'distributed';
  wrap?: boolean;
  rotation?: number;
  indent?: number;
  
  // Fill
  fill?: string; // Simplified: CSS color string only for Phase 0.2
  
  // Border
  border?: {
    top?: { color?: string; style?: string };
    right?: { color?: string; style?: string };
    bottom?: { color?: string; style?: string };
    left?: { color?: string; style?: string };
  };
  
  // Number format
  numberFormat?: string;
  
  // Protection
  locked?: boolean;
  hidden?: boolean;
}

/**
 * Cell snapshot with offset-based coordinates.
 * 
 * Coordinates are relative to top-left of selection (0,0).
 * Fully detached from worksheet — contains only values.
 * 
 * @invariant rowOffset >= 0 && colOffset >= 0
 * @invariant No Cell object references
 * @invariant Styles are serialized, not pointed
 */
export interface CellSnapshot {
  /** Row offset from selection top (0-indexed) */
  rowOffset: number;
  
  /** Column offset from selection left (0-indexed) */
  colOffset: number;
  
  /** Cell value (primitive or structured) */
  value: ExtendedCellValue;
  
  /** Formula string (without leading =) */
  formula?: string;
  
  /** Serialized style (pure data) */
  style?: SerializedStyle;
  
  /** True if this cell is the anchor (top-left) of a merged region */
  isMergeAnchor?: boolean;
  
  /** Merge width in cells (only present if isMergeAnchor=true) */
  mergeWidth?: number;
  
  /** Merge height in cells (only present if isMergeAnchor=true) */
  mergeHeight?: number;
}

/**
 * Clipboard payload — immutable snapshot of copied/cut region.
 * 
 * @invariant Fully detached from source worksheet
 * @invariant Offset-based coordinates (top-left = 0,0)
 * @invariant Immutable after creation (Object.freeze)
 * @invariant No merged cell children stored (anchor only)
 */
export interface ClipboardPayload {
  /** Original source range (for debugging/validation only) */
  readonly sourceRange: Range;
  
  /** Width of copied region in cells */
  readonly width: number;
  
  /** Height of copied region in cells */
  readonly height: number;
  
  /** Cell snapshots with offset-based coordinates */
  readonly cells: readonly CellSnapshot[];
  
  /** True if this is a cut operation (clears source on paste) */
  readonly isCut: boolean;

  /** What was captured: full cell details or displayed values only */
  readonly copyMode?: ClipboardCopyMode;
}

/** Controls whether copy/cut captures formulas, styles, and merges or values only. */
export type ClipboardCopyMode = 'all' | 'values';

/**
 * ClipboardService — pure data extraction for copy/cut operations.
 * 
 * Responsibilities:
 * - Extract value-level snapshots from worksheet
 * - Serialize styles to pure data
 * - Convert to offset-based coordinates
 * - Handle merged cells (anchor only)
 * - Create immutable payload
 * 
 * Non-responsibilities (delegated to PasteCommand):
 * - DAG manipulation
 * - Formula shifting
 * - Transaction management
 * - Undo/redo
 * 
 * @architecture Pure data extraction layer
 * @invariant No side effects
 * @invariant No DAG interaction
 * @invariant No CommandManager interaction
 */
export class ClipboardService {
  private currentPayload: ClipboardPayload | null = null;
  
  /**
   * Copy a range from the worksheet into clipboard.
   * Creates immutable snapshot — source modifications won't affect payload.
   * 
   * @param worksheet Source worksheet
   * @param range Range to copy (inclusive)
   * @returns Immutable clipboard payload
   * 
   * @invariant Result is fully detached from worksheet
   * @invariant Top-left cell maps to (0,0)
   * @invariant Merged cells stored as anchor only
   */
  copy(worksheet: Worksheet, range: Range, mode: ClipboardCopyMode = 'all'): ClipboardPayload {
    const payload = this.createSnapshot(worksheet, range, false, mode);
    this.currentPayload = payload;
    return payload;
  }
  
  /**
   * Cut a range from the worksheet into clipboard.
   * Identical to copy() but sets isCut flag.
   * 
   * ⚠️ DOES NOT clear source cells — that happens in PasteCommand.
   * 
   * @param worksheet Source worksheet
   * @param range Range to cut (inclusive)
   * @returns Immutable clipboard payload with isCut=true
   * 
   * @invariant No worksheet mutation
   * @invariant No DAG changes
   */
  cut(worksheet: Worksheet, range: Range, mode: ClipboardCopyMode = 'all'): ClipboardPayload {
    const payload = this.createSnapshot(worksheet, range, true, mode);
    this.currentPayload = payload;
    return payload;
  }
  
  /**
   * Get current clipboard payload.
   * 
   * @returns Current payload or null if clipboard is empty
   */
  getPayload(): ClipboardPayload | null {
    return this.currentPayload;
  }
  
  /**
   * Clear clipboard.
   */
  clear(): void {
    this.currentPayload = null;
  }

  /**
   * Build an immutable paste payload from plain text (TSV).
   * Used when pasting from the system clipboard (external apps).
   */
  static createPayloadFromPlainText(text: string, anchor: Address): ClipboardPayload | null {
    const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (normalized.length === 0) return null;

    const lines = normalized.split('\n');
    if (lines.length > 1 && lines[lines.length - 1] === '') {
      lines.pop();
    }
    if (lines.length === 0) return null;

    const cells: CellSnapshot[] = [];
    let width = 1;

    lines.forEach((line, rowOffset) => {
      const columns = line.split('\t');
      width = Math.max(width, columns.length);

      columns.forEach((raw, colOffset) => {
        if (raw === '') return;

        const trimmed = raw.trim();
        if (trimmed.startsWith('=')) {
          cells.push(
            Object.freeze({
              rowOffset,
              colOffset,
              value: null,
              formula: trimmed.slice(1),
            })
          );
          return;
        }

        cells.push(
          Object.freeze({
            rowOffset,
            colOffset,
            value: ClipboardService.parsePlainTextCellValue(raw),
          })
        );
      });
    });

    const height = lines.length;
    const sourceRange: Range = Object.freeze({
      start: Object.freeze({ row: anchor.row, col: anchor.col }),
      end: Object.freeze({
        row: anchor.row + height - 1,
        col: anchor.col + width - 1,
      }),
    });

    return Object.freeze({
      sourceRange,
      width,
      height,
      cells: Object.freeze(cells),
      isCut: false,
    });
  }

  private static parsePlainTextCellValue(text: string): ExtendedCellValue {
    if (text === '') return null;
    const trimmed = text.trim();
    if (trimmed === '') return text;

    const asNumber = Number(trimmed);
    if (!Number.isNaN(asNumber) && /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)) {
      return asNumber;
    }

    if (trimmed.toLowerCase() === 'true') return true;
    if (trimmed.toLowerCase() === 'false') return false;

    return text;
  }
  
  /**
   * Create snapshot from worksheet range.
   * Core extraction logic — converts worksheet state to pure data.
   * 
   * @param worksheet Source worksheet
   * @param range Source range
   * @param isCut Whether this is a cut operation
   * @returns Immutable clipboard payload
   */
  private createSnapshot(
    worksheet: Worksheet,
    range: Range,
    isCut: boolean,
    mode: ClipboardCopyMode = 'all'
  ): ClipboardPayload {
    const { start, end } = range;
    const width = end.col - start.col + 1;
    const height = end.row - start.row + 1;
    
    console.log('📋 [ClipboardService] Creating snapshot', {
      range: `(${start.row},${start.col}) to (${end.row},${end.col})`,
      dimensions: `${width}x${height}`,
      isCut,
      mode,
    });
    
    const cells: CellSnapshot[] = [];
    const processedMerges = new Set<string>();
    const captureLog: any[] = [];
    
    for (let row = start.row; row <= end.row; row++) {
      for (let col = start.col; col <= end.col; col++) {
        const addr: Address = { row, col };
        const logEntry: any = { addr: `(${row},${col})` };

        if (mode === 'values') {
          const snapshot = this.createCellSnapshot(worksheet, addr, start, undefined, undefined, 'values');
          if (snapshot) {
            logEntry.action = 'captured value';
            logEntry.value = snapshot.value;
            cells.push(snapshot);
          } else {
            logEntry.action = 'skip - empty';
          }
          captureLog.push(logEntry);
          continue;
        }

        const mergeRange = worksheet.getMergedRangeForCell(addr);
        
        if (mergeRange) {
          // Only process merge anchor
          const isAnchor = mergeRange.start.row === row && mergeRange.start.col === col;
          
          logEntry.inMerge = true;
          logEntry.mergeRange = `(${mergeRange.start.row},${mergeRange.start.col}) to (${mergeRange.end.row},${mergeRange.end.col})`;
          logEntry.isAnchor = isAnchor;
          
          if (isAnchor) {
            const mergeKey = `${row}:${col}`;
            if (processedMerges.has(mergeKey)) {
              logEntry.action = 'skip - already processed';
              captureLog.push(logEntry);
              continue;
            }
            processedMerges.add(mergeKey);
            
            // Calculate merge dimensions
            const mergeHeight = mergeRange.end.row - mergeRange.start.row + 1;
            const mergeWidth = mergeRange.end.col - mergeRange.start.col + 1;
            
            logEntry.mergeSize = `${mergeWidth}x${mergeHeight}`;
            
            // Create snapshot for merge anchor
            const snapshot = this.createCellSnapshot(
              worksheet,
              addr,
              start,
              mergeHeight,
              mergeWidth
            );
            
            if (snapshot) {
              logEntry.action = 'captured merge anchor';
              logEntry.value = snapshot.value;
              logEntry.hasFormula = !!snapshot.formula;
              cells.push(snapshot);
            } else {
              logEntry.action = 'merge anchor empty';
            }
          } else {
            logEntry.action = 'skip - non-anchor merged cell';
          }
          captureLog.push(logEntry);
          // Skip non-anchor cells in merged regions
          continue;
        }
        
        // Regular cell
        logEntry.inMerge = false;
        const snapshot = this.createCellSnapshot(worksheet, addr, start);
        if (snapshot) {
          logEntry.action = 'captured';
          logEntry.value = snapshot.value;
          logEntry.hasFormula = !!snapshot.formula;
          logEntry.hasStyle = !!snapshot.style;
          cells.push(snapshot);
        } else {
          logEntry.action = 'skip - empty';
        }
        captureLog.push(logEntry);
      }
    }
    
    // Create immutable payload
    const payload: ClipboardPayload = Object.freeze({
      sourceRange: Object.freeze({ ...range }),
      width,
      height,
      cells: Object.freeze(cells.map(c => Object.freeze(c))),
      isCut,
      copyMode: mode,
    });
    
    console.log('📋 [ClipboardService] Snapshot created', {
      totalCellsInRange: (end.row - start.row + 1) * (end.col - start.col + 1),
      cellsCaptured: cells.length,
      captureDetails: captureLog,
      payload: {
        dimensions: `${width}x${height}`,
        cells: cells.map(c => ({
          offset: `(${c.rowOffset},${c.colOffset})`,
          value: c.value,
          formula: c.formula,
          isMergeAnchor: c.isMergeAnchor
        }))
      }
    });
    
    return payload;
  }
  
  /**
   * Create snapshot for a single cell.
   * 
   * @param worksheet Source worksheet
   * @param addr Absolute address in worksheet
   * @param topLeft Top-left of selection (for offset calculation)
   * @param mergeHeight Height of merge (if this is merge anchor)
   * @param mergeWidth Width of merge (if this is merge anchor)
   * @returns Cell snapshot or null if cell is empty
   */
  private createCellSnapshot(
    worksheet: Worksheet,
    addr: Address,
    topLeft: Address,
    mergeHeight?: number,
    mergeWidth?: number,
    mode: ClipboardCopyMode = 'all'
  ): CellSnapshot | null {
    const rowOffset = addr.row - topLeft.row;
    const colOffset = addr.col - topLeft.col;

    if (mode === 'values') {
      const value = worksheet.getCellValue(addr);
      if (value === null || value === undefined || value === '') {
        return null;
      }
      return { rowOffset, colOffset, value };
    }

    const cell = worksheet.getCell(addr);
    
    if (!cell || (cell.value === null && !cell.formula && !cell.style)) {
      return null;
    }
    
    const snapshot: CellSnapshot = {
      rowOffset,
      colOffset,
      value: cell.value,
    };
    
    // Add formula (strip leading = if present)
    if (cell.formula) {
      snapshot.formula = cell.formula.startsWith('=') 
        ? cell.formula.slice(1) 
        : cell.formula;
    }
    
    // Serialize style
    if (cell.style) {
      snapshot.style = this.serializeStyle(cell.style);
    }
    
    // Add merge info if this is a merge anchor
    if (mergeHeight && mergeWidth) {
      snapshot.isMergeAnchor = true;
      snapshot.mergeHeight = mergeHeight;
      snapshot.mergeWidth = mergeWidth;
    }
    
    return snapshot;
  }
  
  /**
   * Serialize CellStyle to pure data representation.
   * Extracts only the data, no object references.
   * 
   * @param style Source style (may contain complex objects)
   * @returns Serialized style (pure data only)
   * 
   * @invariant Result contains no object references
   * @invariant Result is JSON-serializable
   */
  private serializeStyle(style: CellStyle): SerializedStyle {
    const serialized: SerializedStyle = {};
    
    // Font properties
    if (style.fontFamily) serialized.fontFamily = style.fontFamily;
    if (style.fontSize) serialized.fontSize = style.fontSize;
    if (style.bold) serialized.bold = style.bold;
    if (style.italic) serialized.italic = style.italic;
    if (style.underline) serialized.underline = style.underline;
    if (style.strikethrough) serialized.strikethrough = style.strikethrough;
    
    // Color: extract string representation
    if (style.color) {
      serialized.color = typeof style.color === 'string' 
        ? style.color 
        : (style.color as any).argb || (style.color as any).rgb || '#000000';
    }
    
    // Alignment
    if (style.align) serialized.align = style.align;
    if (style.valign) serialized.valign = style.valign;
    if (style.wrap) serialized.wrap = style.wrap;
    if (style.rotation !== undefined) serialized.rotation = style.rotation;
    if (style.indent) serialized.indent = style.indent;
    
    // Fill: simplified to string for Phase 0.2
    if (style.fill) {
      if (typeof style.fill === 'string') {
        serialized.fill = style.fill;
      } else if ((style.fill as any).fgColor) {
        const fg = (style.fill as any).fgColor;
        serialized.fill = typeof fg === 'string' ? fg : (fg.argb || fg.rgb || '#FFFFFF');
      }
    }
    
    // Border: serialize to simple structure
    if (style.border) {
      const border = style.border as any;
      serialized.border = {};
      
      const serializeEdge = (edge: any) => {
        if (!edge) return undefined;
        if (typeof edge === 'string') return { color: edge };
        return {
          color: typeof edge.color === 'string' ? edge.color : edge.color?.argb || edge.color?.rgb,
          style: edge.style,
        };
      };
      
      if (border.top) serialized.border.top = serializeEdge(border.top);
      if (border.right) serialized.border.right = serializeEdge(border.right);
      if (border.bottom) serialized.border.bottom = serializeEdge(border.bottom);
      if (border.left) serialized.border.left = serializeEdge(border.left);
    }
    
    // Number format
    if (style.numberFormat) serialized.numberFormat = style.numberFormat;
    
    // Protection
    if (style.locked) serialized.locked = style.locked;
    if (style.hidden) serialized.hidden = style.hidden;
    
    return serialized;
  }
}
