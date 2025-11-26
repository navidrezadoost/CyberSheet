/**
 * AdvancedExportEngine.ts
 * 
 * Enhanced export capabilities: XLSX, PDF, print layouts
 */

import type { Address, CellValue } from '@cyber-sheet/core';
import type { Worksheet } from '@cyber-sheet/core';

export interface PrintOptions {
  orientation?: 'portrait' | 'landscape';
  paperSize?: 'A4' | 'Letter' | 'Legal';
  margins?: { top: number; right: number; bottom: number; left: number };
  header?: string;
  footer?: string;
  showGridlines?: boolean;
  fitToPage?: boolean;
  pageBreaks?: number[]; // Row indices where page breaks occur
}

export interface XLSXExportOptions {
  fileName?: string;
  worksheetName?: string;
  includeStyles?: boolean;
  includeFormulas?: boolean;
  range?: { start: Address; end: Address };
}

export interface PDFExportOptions extends PrintOptions {
  fileName?: string;
  title?: string;
  author?: string;
}

export class AdvancedExportEngine {
  private worksheet: Worksheet;

  constructor(worksheet: Worksheet) {
    this.worksheet = worksheet;
  }

  /**
   * Export to XLSX (simplified XML format)
   */
  async exportXLSX(options: XLSXExportOptions = {}): Promise<Blob> {
    const range = options.range ?? this.getUsedRange();
    const worksheetName = options.worksheetName ?? 'Sheet1';
    
    // Build XML content
    const sheetData = this.buildSheetData(range, options);
    const styles = options.includeStyles ? this.buildStyles(range) : '';
    
    const workbookXML = this.buildWorkbookXML(worksheetName);
    const worksheetXML = this.buildWorksheetXML(sheetData, worksheetName);
    
    // Create ZIP structure (XLSX is a ZIP of XML files)
    const zip = new Map<string, string>();
    zip.set('[Content_Types].xml', this.buildContentTypes());
    zip.set('_rels/.rels', this.buildRels());
    zip.set('xl/workbook.xml', workbookXML);
    zip.set('xl/worksheets/sheet1.xml', worksheetXML);
    if (styles) {
      zip.set('xl/styles.xml', styles);
    }
    
    // Convert to blob (simplified - real implementation would use JSZip or similar)
    const content = Array.from(zip.entries())
      .map(([path, xml]) => `${path}:\n${xml}\n\n`)
      .join('---\n\n');
    
    return new Blob([content], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  /**
   * Export to PDF
   */
  async exportPDF(options: PDFExportOptions = {}): Promise<Blob> {
    // Create virtual canvas for rendering
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    // A4 size in pixels at 96 DPI
    const width = options.orientation === 'landscape' ? 1122 : 794;
    const height = options.orientation === 'landscape' ? 794 : 1122;
    
    canvas.width = width;
    canvas.height = height;
    
    // Render worksheet to canvas
    this.renderToPrintCanvas(ctx, canvas.width, canvas.height, options);
    
    // Convert to PDF (simplified - real implementation would use jsPDF)
    const imageData = canvas.toDataURL('image/png');
    const pdfContent = this.buildSimplePDF(imageData, options);
    
    return new Blob([pdfContent], { type: 'application/pdf' });
  }

  /**
   * Print worksheet
   */
  print(options: PrintOptions = {}): void {
    // Create print window
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const html = this.buildPrintHTML(options);
    
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Trigger print dialog
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  }

  /**
   * Build sheet data for XLSX
   */
  private buildSheetData(
    range: { start: Address; end: Address },
    options: XLSXExportOptions
  ): string {
    let xml = '';
    
    for (let row = range.start.row; row <= range.end.row; row++) {
      xml += `<row r="${row + 1}">`;
      
      for (let col = range.start.col; col <= range.end.col; col++) {
        const cell = this.worksheet.getCell({ row, col });
        if (!cell) continue;
        
        const cellRef = this.getCellReference({ row, col });
        let value = cell.value;
        let type = 'str';
        
        if (typeof value === 'number') {
          type = 'n';
        } else if (typeof value === 'boolean') {
          type = 'b';
          value = value ? '1' : '0';
        }
        
        xml += `<c r="${cellRef}" t="${type}">`;
        
        if (options.includeFormulas && cell.formula) {
          xml += `<f>${this.escapeXML(cell.formula)}</f>`;
        }
        
        xml += `<v>${this.escapeXML(String(value ?? ''))}</v>`;
        xml += `</c>`;
      }
      
      xml += `</row>`;
    }
    
    return xml;
  }

  /**
   * Build styles XML
   */
  private buildStyles(range: { start: Address; end: Address }): string {
    // Simplified styles
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="1">
    <font><sz val="11"/><name val="Calibri"/></font>
  </fonts>
  <fills count="1">
    <fill><patternFill patternType="none"/></fill>
  </fills>
  <borders count="1">
    <border><left/><right/><top/><bottom/></border>
  </borders>
  <cellXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellXfs>
</styleSheet>`;
  }

  /**
   * Build workbook XML
   */
  private buildWorkbookXML(sheetName: string): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${this.escapeXML(sheetName)}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;
  }

  /**
   * Build worksheet XML
   */
  private buildWorksheetXML(sheetData: string, sheetName: string): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    ${sheetData}
  </sheetData>
</worksheet>`;
  }

  /**
   * Build content types XML
   */
  private buildContentTypes(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;
  }

  /**
   * Build relationships XML
   */
  private buildRels(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
  }

  /**
   * Build print HTML
   */
  private buildPrintHTML(options: PrintOptions): string {
    const range = this.getUsedRange();
    const margins = options.margins ?? { top: 20, right: 20, bottom: 20, left: 20 };
    
    let html = `<!DOCTYPE html>
<html>
<head>
  <title>Print Preview</title>
  <style>
    @page {
      size: ${options.paperSize ?? 'A4'} ${options.orientation ?? 'portrait'};
      margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;
    }
    body { font-family: Arial, sans-serif; font-size: 10pt; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: ${options.showGridlines ? '1px solid #ccc' : 'none'}; padding: 4px; text-align: left; }
    .header { text-align: center; margin-bottom: 10px; font-size: 12pt; }
    .footer { text-align: center; margin-top: 10px; font-size: 8pt; color: #666; }
    .page-break { page-break-after: always; }
  </style>
</head>
<body>`;
    
    if (options.header) {
      html += `<div class="header">${options.header}</div>`;
    }
    
    html += '<table>';
    
    for (let row = range.start.row; row <= range.end.row; row++) {
      // Add page break if specified
      if (options.pageBreaks?.includes(row)) {
        html += '</table><div class="page-break"></div><table>';
      }
      
      html += '<tr>';
      
      for (let col = range.start.col; col <= range.end.col; col++) {
        const cell = this.worksheet.getCell({ row, col });
        const value = cell?.value ?? '';
        html += `<td>${this.escapeHTML(String(value))}</td>`;
      }
      
      html += '</tr>';
    }
    
    html += '</table>';
    
    if (options.footer) {
      html += `<div class="footer">${options.footer}</div>`;
    }
    
    html += '</body></html>';
    
    return html;
  }

  /**
   * Render worksheet to print canvas
   */
  private renderToPrintCanvas(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    options: PrintOptions
  ): void {
    const range = this.getUsedRange();
    const margins = options.margins ?? { top: 40, right: 40, bottom: 40, left: 40 };
    
    // Clear canvas
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    
    // Render header
    if (options.header) {
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(options.header, width / 2, margins.top / 2);
    }
    
    // Calculate cell dimensions
    const colCount = range.end.col - range.start.col + 1;
    const rowCount = range.end.row - range.start.row + 1;
    const cellWidth = (width - margins.left - margins.right) / colCount;
    const cellHeight = 20;
    
    // Render cells
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    for (let row = range.start.row; row <= range.end.row; row++) {
      for (let col = range.start.col; col <= range.end.col; col++) {
        const cell = this.worksheet.getCell({ row, col });
        const value = cell?.value ?? '';
        
        const x = margins.left + (col - range.start.col) * cellWidth;
        const y = margins.top + (row - range.start.row) * cellHeight;
        
        // Draw cell border
        if (options.showGridlines) {
          ctx.strokeStyle = '#CCCCCC';
          ctx.strokeRect(x, y, cellWidth, cellHeight);
        }
        
        // Draw text
        ctx.fillStyle = '#000000';
        ctx.fillText(String(value), x + 4, y + cellHeight / 2);
      }
    }
    
    // Render footer
    if (options.footer) {
      ctx.fillStyle = '#666666';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(options.footer, width / 2, height - margins.bottom / 2);
    }
  }

  /**
   * Build simple PDF (placeholder - use jsPDF in production)
   */
  private buildSimplePDF(imageData: string, options: PDFExportOptions): string {
    return `%PDF-1.4
% Simplified PDF - Use jsPDF library for production
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 595 842]
>>
endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
trailer
<<
/Size 4
/Root 1 0 R
>>
startxref
190
%%EOF`;
  }

  /**
   * Get used range (range containing data)
   */
  private getUsedRange(): { start: Address; end: Address } {
    let maxRow = 0;
    let maxCol = 0;
    
    for (let row = 0; row < this.worksheet.rowCount; row++) {
      for (let col = 0; col < 26; col++) {
        const cell = this.worksheet.getCell({ row, col });
        if (cell && cell.value != null) {
          maxRow = Math.max(maxRow, row);
          maxCol = Math.max(maxCol, col);
        }
      }
    }
    
    return {
      start: { row: 0, col: 0 },
      end: { row: maxRow, col: maxCol }
    };
  }

  /**
   * Get cell reference (e.g., A1)
   */
  private getCellReference(addr: Address): string {
    const col = this.columnToLetter(addr.col);
    const row = addr.row + 1;
    return `${col}${row}`;
  }

  /**
   * Convert column index to letter
   */
  private columnToLetter(col: number): string {
    let letter = '';
    while (col >= 0) {
      letter = String.fromCharCode((col % 26) + 65) + letter;
      col = Math.floor(col / 26) - 1;
    }
    return letter;
  }

  /**
   * Escape XML special characters
   */
  private escapeXML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Escape HTML special characters
   */
  private escapeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
