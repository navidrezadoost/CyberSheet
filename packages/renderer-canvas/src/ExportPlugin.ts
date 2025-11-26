/**
 * ExportPlugin.ts
 * 
 * Provides zero-dependency export functionality for CSV, JSON, and PNG formats.
 * Uses native browser APIs (OffscreenCanvas for PNG) and is fully pluggable.
 */

import type { Worksheet } from '@cyber-sheet/core';

export type ExportFormat = 'csv' | 'json' | 'png';

export interface ExportOptions {
  /**
   * Range to export. If not specified, exports the entire used range.
   */
  range?: {
    startRow: number;
    endRow: number;
    startCol: number;
    endCol: number;
  };
  
  /**
   * Include headers (row 0) in the export.
   */
  includeHeaders?: boolean;
  
  /**
   * For CSV: field delimiter (default: ',')
   */
  delimiter?: string;
  
  /**
   * For CSV: row delimiter (default: '\n')
   */
  rowDelimiter?: string;
  
  /**
   * For PNG: DPI scale factor (default: 2 for retina)
   */
  dpiScale?: number;
  
  /**
   * For PNG: background color (default: '#FFFFFF')
   */
  backgroundColor?: string;
  
  /**
   * For JSON: pretty print (default: false)
   */
  prettyPrint?: boolean;
}

export interface ExportResult {
  format: ExportFormat;
  data: string | Blob;
  filename: string;
  mimeType: string;
}

/**
 * ExportPlugin provides export functionality with zero dependencies.
 */
export class ExportPlugin {
  private worksheet: Worksheet;

  constructor(worksheet: Worksheet) {
    this.worksheet = worksheet;
  }

  /**
   * Exports the worksheet in the specified format.
   */
  public async export(format: ExportFormat, options: ExportOptions = {}): Promise<ExportResult> {
    switch (format) {
      case 'csv':
        return this.exportCSV(options);
      case 'json':
        return this.exportJSON(options);
      case 'png':
        return await this.exportPNG(options);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Exports the worksheet as CSV.
   */
  private exportCSV(options: ExportOptions): ExportResult {
    const range = this.getEffectiveRange(options);
    const delimiter = options.delimiter || ',';
    const rowDelimiter = options.rowDelimiter || '\n';
    
    const rows: string[] = [];

    for (let row = range.startRow; row <= range.endRow; row++) {
      const cells: string[] = [];
      
      for (let col = range.startCol; col <= range.endCol; col++) {
        const cell = this.worksheet.getCell({ row, col });
        let value = '';
        
        if (cell && cell.value != null) {
          value = String(cell.value);
          
          // Escape CSV special characters
          if (value.includes(delimiter) || value.includes('"') || value.includes('\n')) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
        }
        
        cells.push(value);
      }
      
      rows.push(cells.join(delimiter));
    }

    const csvData = rows.join(rowDelimiter);

    return {
      format: 'csv',
      data: csvData,
      filename: `${this.worksheet.name || 'export'}.csv`,
      mimeType: 'text/csv',
    };
  }

  /**
   * Exports the worksheet as JSON.
   */
  private exportJSON(options: ExportOptions): ExportResult {
    const range = this.getEffectiveRange(options);
    const data: Record<string, any>[] = [];
    
    // Get headers from first row if includeHeaders is true
    const headers: string[] = [];
    if (options.includeHeaders && range.startRow <= range.endRow) {
      for (let col = range.startCol; col <= range.endCol; col++) {
        const cell = this.worksheet.getCell({ row: range.startRow, col });
        headers.push(cell?.value != null ? String(cell.value) : `Column${col}`);
      }
    }

    const dataStartRow = options.includeHeaders ? range.startRow + 1 : range.startRow;

    for (let row = dataStartRow; row <= range.endRow; row++) {
      const rowData: Record<string, any> = {};
      
      for (let col = range.startCol; col <= range.endCol; col++) {
        const cell = this.worksheet.getCell({ row, col });
        const key = headers[col - range.startCol] || `col${col}`;
        const value = cell?.value ?? null;
        
        rowData[key] = value;
      }
      
      data.push(rowData);
    }

    const jsonData = options.prettyPrint 
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);

    return {
      format: 'json',
      data: jsonData,
      filename: `${this.worksheet.name || 'export'}.json`,
      mimeType: 'application/json',
    };
  }

  /**
   * Exports the worksheet as PNG using OffscreenCanvas.
   */
  private async exportPNG(options: ExportOptions): Promise<ExportResult> {
    const range = this.getEffectiveRange(options);
    const dpiScale = options.dpiScale || 2;
    const backgroundColor = options.backgroundColor || '#FFFFFF';
    
    // Calculate dimensions
    const defaultRowHeight = 25;
    const defaultColWidth = 100;
    const width = (range.endCol - range.startCol + 1) * defaultColWidth;
    const height = (range.endRow - range.startRow + 1) * defaultRowHeight;
    
    // Create offscreen canvas
    const canvas = new OffscreenCanvas(width * dpiScale, height * dpiScale);
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get 2D context from OffscreenCanvas');
    }

    // Scale for DPI
    ctx.scale(dpiScale, dpiScale);
    
    // Fill background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    // Render cells
    ctx.font = '14px Arial, sans-serif';
    ctx.textBaseline = 'middle';
    
    for (let row = range.startRow; row <= range.endRow; row++) {
      for (let col = range.startCol; col <= range.endCol; col++) {
        const cell = this.worksheet.getCell({ row, col });
        const x = (col - range.startCol) * defaultColWidth;
        const y = (row - range.startRow) * defaultRowHeight;
        
        // Draw cell background
        if (cell?.style?.fill) {
          ctx.fillStyle = typeof cell.style.fill === 'string' 
            ? cell.style.fill 
            : '#FFFFFF';
          ctx.fillRect(x, y, defaultColWidth, defaultRowHeight);
        }
        
        // Draw cell borders
        ctx.strokeStyle = '#E0E0E0';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, defaultColWidth, defaultRowHeight);
        
        // Draw cell text
        if (cell && cell.value != null) {
          const text = String(cell.value);
          ctx.fillStyle = cell.style?.color 
            ? (typeof cell.style.color === 'string' ? cell.style.color : '#000000')
            : '#000000';
          
          ctx.font = `${cell.style?.bold ? 'bold ' : ''}${cell.style?.fontSize || 14}px ${cell.style?.fontFamily || 'Arial'}, sans-serif`;
          
          const textAlign = cell.style?.align || 'left';
          const textX = textAlign === 'right' 
            ? x + defaultColWidth - 8
            : textAlign === 'center'
            ? x + defaultColWidth / 2
            : x + 8;
          
          ctx.textAlign = textAlign;
          ctx.fillText(text, textX, y + defaultRowHeight / 2, defaultColWidth - 16);
        }
      }
    }
    
    // Convert to blob
    const blob = await canvas.convertToBlob({ type: 'image/png' });

    return {
      format: 'png',
      data: blob,
      filename: `${this.worksheet.name || 'export'}.png`,
      mimeType: 'image/png',
    };
  }

  /**
   * Determines the effective range to export.
   */
  private getEffectiveRange(options: ExportOptions): { startRow: number; endRow: number; startCol: number; endCol: number } {
    if (options.range) {
      return options.range;
    }
    
    // Find the used range (last non-empty row/column)
    let lastRow = 0;
    let lastCol = 0;
    
    for (let row = 0; row < this.worksheet.rowCount; row++) {
      for (let col = 0; col < this.worksheet.colCount; col++) {
        const cell = this.worksheet.getCell({ row, col });
        if (cell && cell.value != null) {
          lastRow = Math.max(lastRow, row);
          lastCol = Math.max(lastCol, col);
        }
      }
    }
    
    return {
      startRow: 0,
      endRow: lastRow,
      startCol: 0,
      endCol: lastCol,
    };
  }

  /**
   * Downloads the export result to the user's computer.
   */
  public static download(result: ExportResult): void {
    let blob: Blob;
    
    if (result.data instanceof Blob) {
      blob = result.data;
    } else {
      blob = new Blob([result.data], { type: result.mimeType });
    }
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    a.style.display = 'none';
    
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  /**
   * Copies the export result to the clipboard (text formats only).
   */
  public static async copyToClipboard(result: ExportResult): Promise<void> {
    if (result.data instanceof Blob) {
      throw new Error('Cannot copy binary data to clipboard. Use download() instead.');
    }
    
    try {
      await navigator.clipboard.writeText(result.data);
    } catch (error) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = result.data;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }
}
