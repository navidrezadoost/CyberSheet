/**
 * VirtualizationManager.ts
 * 
 * Provides advanced virtualization for handling millions of cells efficiently.
 * Includes infinite scroll, dynamic row/column loading, and auto-sizing.
 */

import type { Worksheet } from '@cyber-sheet/core';

export interface ViewportDimensions {
  scrollTop: number;
  scrollLeft: number;
  viewportWidth: number;
  viewportHeight: number;
}

export interface VisibleRange {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}

export interface CellDimensions {
  row: number;
  col: number;
  width: number;
  height: number;
}

export interface VirtualizationOptions {
  defaultRowHeight?: number;
  defaultColumnWidth?: number;
  overscanRows?: number;
  overscanCols?: number;
  enableAutoSize?: boolean;
  enableInfiniteScroll?: boolean;
  maxRows?: number;
  maxCols?: number;
}

/**
 * VirtualizationManager handles efficient rendering of large datasets by only
 * rendering visible cells and providing on-demand loading.
 */
export class VirtualizationManager {
  private worksheet: Worksheet;
  private options: Required<VirtualizationOptions>;
  
  // Dimension caches
  private rowHeights: Map<number, number> = new Map();
  private columnWidths: Map<number, number> = new Map();
  private rowOffsets: Map<number, number> = new Map();
  private columnOffsets: Map<number, number> = new Map();
  
  // Performance optimization
  private dimensionsDirty: boolean = true;
  private lastViewport: ViewportDimensions | null = null;
  private lastVisibleRange: VisibleRange | null = null;

  constructor(worksheet: Worksheet, options: VirtualizationOptions = {}) {
    this.worksheet = worksheet;
    this.options = {
      defaultRowHeight: 25,
      defaultColumnWidth: 100,
      overscanRows: 5,
      overscanCols: 3,
      enableAutoSize: true,
      enableInfiniteScroll: true,
      maxRows: 1_000_000,
      maxCols: 16_384,
      ...options,
    };
  }

  /**
   * Calculates the visible range of rows and columns based on viewport dimensions.
   */
  public getVisibleRange(viewport: ViewportDimensions): VisibleRange {
    // Check cache
    if (this.lastViewport && this.viewportEquals(this.lastViewport, viewport) && this.lastVisibleRange) {
      return this.lastVisibleRange;
    }

    this.ensureDimensionsCalculated();

    const startRow = this.findRowAtOffset(viewport.scrollTop);
    const endRow = this.findRowAtOffset(viewport.scrollTop + viewport.viewportHeight);
    const startCol = this.findColumnAtOffset(viewport.scrollLeft);
    const endCol = this.findColumnAtOffset(viewport.scrollLeft + viewport.viewportWidth);

    // Apply overscan
    const visibleRange: VisibleRange = {
      startRow: Math.max(0, startRow - this.options.overscanRows),
      endRow: Math.min(this.worksheet.rowCount - 1, endRow + this.options.overscanRows),
      startCol: Math.max(0, startCol - this.options.overscanCols),
      endCol: Math.min(this.worksheet.colCount - 1, endCol + this.options.overscanCols),
    };

    // Cache result
    this.lastViewport = viewport;
    this.lastVisibleRange = visibleRange;

    return visibleRange;
  }

  /**
   * Finds the row index at a given vertical offset.
   */
  private findRowAtOffset(offset: number): number {
    this.ensureDimensionsCalculated();

    // Binary search for efficiency
    let low = 0;
    let high = this.worksheet.rowCount - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const midOffset = this.getRowOffset(mid);
      const midHeight = this.getRowHeight(mid);

      if (offset < midOffset) {
        high = mid - 1;
      } else if (offset >= midOffset + midHeight) {
        low = mid + 1;
      } else {
        return mid;
      }
    }

    return Math.min(low, this.worksheet.rowCount - 1);
  }

  /**
   * Finds the column index at a given horizontal offset.
   */
  private findColumnAtOffset(offset: number): number {
    this.ensureDimensionsCalculated();

    // Binary search
    let low = 0;
    let high = this.worksheet.colCount - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const midOffset = this.getColumnOffset(mid);
      const midWidth = this.getColumnWidth(mid);

      if (offset < midOffset) {
        high = mid - 1;
      } else if (offset >= midOffset + midWidth) {
        low = mid + 1;
      } else {
        return mid;
      }
    }

    return Math.min(low, this.worksheet.colCount - 1);
  }

  /**
   * Gets the height of a specific row.
   */
  public getRowHeight(row: number): number {
    if (this.rowHeights.has(row)) {
      return this.rowHeights.get(row)!;
    }
    return this.options.defaultRowHeight;
  }

  /**
   * Gets the width of a specific column.
   */
  public getColumnWidth(col: number): number {
    if (this.columnWidths.has(col)) {
      return this.columnWidths.get(col)!;
    }
    return this.options.defaultColumnWidth;
  }

  /**
   * Gets the vertical offset (Y position) of a row.
   */
  public getRowOffset(row: number): number {
    this.ensureDimensionsCalculated();
    return this.rowOffsets.get(row) || 0;
  }

  /**
   * Gets the horizontal offset (X position) of a column.
   */
  public getColumnOffset(col: number): number {
    this.ensureDimensionsCalculated();
    return this.columnOffsets.get(col) || 0;
  }

  /**
   * Sets a custom height for a row.
   */
  public setRowHeight(row: number, height: number): void {
    if (height === this.options.defaultRowHeight) {
      this.rowHeights.delete(row);
    } else {
      this.rowHeights.set(row, height);
    }
    this.dimensionsDirty = true;
  }

  /**
   * Sets a custom width for a column.
   */
  public setColumnWidth(col: number, width: number): void {
    if (width === this.options.defaultColumnWidth) {
      this.columnWidths.delete(col);
    } else {
      this.columnWidths.set(col, width);
    }
    this.dimensionsDirty = true;
  }

  /**
   * Auto-sizes a column based on content.
   */
  public autoSizeColumn(col: number, ctx: CanvasRenderingContext2D, maxSampleRows: number = 100): number {
    if (!this.options.enableAutoSize) {
      return this.getColumnWidth(col);
    }

    let maxWidth = 0;
    const sampleRows = Math.min(this.worksheet.rowCount, maxSampleRows);

    // Sample cells to find max width
    for (let row = 0; row < sampleRows; row++) {
      const cell = this.worksheet.getCell({ row, col });
      if (cell && cell.value != null) {
        const text = String(cell.value);
        const metrics = ctx.measureText(text);
        maxWidth = Math.max(maxWidth, metrics.width + 16); // 16px padding
      }
    }

    // Set minimum width
    maxWidth = Math.max(maxWidth, 60);

    this.setColumnWidth(col, maxWidth);
    return maxWidth;
  }

  /**
   * Auto-sizes a row based on content (for wrapped text).
   */
  public autoSizeRow(row: number, ctx: CanvasRenderingContext2D): number {
    if (!this.options.enableAutoSize) {
      return this.getRowHeight(row);
    }

    let maxHeight = this.options.defaultRowHeight;

    for (let col = 0; col < this.worksheet.colCount; col++) {
      const cell = this.worksheet.getCell({ row, col });
      if (cell && cell.value != null && cell.style?.wrap) {
        const columnWidth = this.getColumnWidth(col);
        const text = String(cell.value);
        
        // Approximate line height calculation
        const lineHeight = 16;
        const lines = this.wrapText(ctx, text, columnWidth - 8);
        const height = lines.length * lineHeight + 8; // 8px vertical padding
        
        maxHeight = Math.max(maxHeight, height);
      }
    }

    this.setRowHeight(row, maxHeight);
    return maxHeight;
  }

  /**
   * Wraps text to fit within a given width.
   */
  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Ensures dimension offsets are calculated and cached.
   */
  private ensureDimensionsCalculated(): void {
    if (!this.dimensionsDirty) return;

    // Calculate row offsets
    this.rowOffsets.clear();
    let yOffset = 0;
    for (let row = 0; row < this.worksheet.rowCount; row++) {
      this.rowOffsets.set(row, yOffset);
      yOffset += this.getRowHeight(row);
    }

    // Calculate column offsets
    this.columnOffsets.clear();
    let xOffset = 0;
    for (let col = 0; col < this.worksheet.colCount; col++) {
      this.columnOffsets.set(col, xOffset);
      xOffset += this.getColumnWidth(col);
    }

    this.dimensionsDirty = false;
  }

  /**
   * Gets the total height of the scrollable content.
   */
  public getTotalHeight(): number {
    this.ensureDimensionsCalculated();
    const lastRow = this.worksheet.rowCount - 1;
    return this.getRowOffset(lastRow) + this.getRowHeight(lastRow);
  }

  /**
   * Gets the total width of the scrollable content.
   */
  public getTotalWidth(): number {
    this.ensureDimensionsCalculated();
    const lastCol = this.worksheet.colCount - 1;
    return this.getColumnOffset(lastCol) + this.getColumnWidth(lastCol);
  }

  /**
   * Gets cell dimensions (position and size) for rendering.
   */
  public getCellDimensions(row: number, col: number): CellDimensions {
    return {
      row,
      col,
      width: this.getColumnWidth(col),
      height: this.getRowHeight(row),
    };
  }

  /**
   * Gets cell bounds (x, y, width, height) for rendering.
   */
  public getCellBounds(row: number, col: number): { x: number; y: number; width: number; height: number } {
    return {
      x: this.getColumnOffset(col),
      y: this.getRowOffset(row),
      width: this.getColumnWidth(col),
      height: this.getRowHeight(row),
    };
  }

  /**
   * Handles infinite scroll by expanding the worksheet as needed.
   */
  public handleInfiniteScroll(viewport: ViewportDimensions): boolean {
    if (!this.options.enableInfiniteScroll) return false;

    const visibleRange = this.getVisibleRange(viewport);
    let expanded = false;

    // Expand rows if user is near the bottom
    if (visibleRange.endRow >= this.worksheet.rowCount - this.options.overscanRows) {
      const newRowCount = Math.min(
        this.worksheet.rowCount + 100,
        this.options.maxRows
      );
      
      if (newRowCount > this.worksheet.rowCount) {
        this.worksheet.rowCount = newRowCount;
        this.dimensionsDirty = true;
        expanded = true;
      }
    }

    // Expand columns if user is near the right edge
    if (visibleRange.endCol >= this.worksheet.colCount - this.options.overscanCols) {
      const newColCount = Math.min(
        this.worksheet.colCount + 10,
        this.options.maxCols
      );
      
      if (newColCount > this.worksheet.colCount) {
        this.worksheet.colCount = newColCount;
        this.dimensionsDirty = true;
        expanded = true;
      }
    }

    return expanded;
  }

  /**
   * Invalidates dimension caches.
   */
  public invalidateDimensions(): void {
    this.dimensionsDirty = true;
    this.lastViewport = null;
    this.lastVisibleRange = null;
  }

  /**
   * Compares two viewports for equality.
   */
  private viewportEquals(a: ViewportDimensions, b: ViewportDimensions): boolean {
    return (
      a.scrollTop === b.scrollTop &&
      a.scrollLeft === b.scrollLeft &&
      a.viewportWidth === b.viewportWidth &&
      a.viewportHeight === b.viewportHeight
    );
  }

  /**
   * Gets memory usage statistics.
   */
  public getMemoryStats(): {
    cachedRowHeights: number;
    cachedColumnWidths: number;
    cachedRowOffsets: number;
    cachedColumnOffsets: number;
    estimatedMemoryKB: number;
  } {
    const estimatedMemoryKB = 
      (this.rowHeights.size + this.columnWidths.size + 
       this.rowOffsets.size + this.columnOffsets.size) * 0.016; // ~16 bytes per entry

    return {
      cachedRowHeights: this.rowHeights.size,
      cachedColumnWidths: this.columnWidths.size,
      cachedRowOffsets: this.rowOffsets.size,
      cachedColumnOffsets: this.columnOffsets.size,
      estimatedMemoryKB,
    };
  }

  /**
   * Clears all caches to free memory.
   */
  public clearCaches(): void {
    this.rowHeights.clear();
    this.columnWidths.clear();
    this.rowOffsets.clear();
    this.columnOffsets.clear();
    this.dimensionsDirty = true;
    this.lastViewport = null;
    this.lastVisibleRange = null;
  }
}
