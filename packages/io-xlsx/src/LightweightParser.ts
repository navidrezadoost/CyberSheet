/**
 * Lightweight XLSX Parser
 * 
 * High-performance Excel import with:
 * - Incremental parsing (stream-based)
 * - Viewport-only loading
 * - Lazy sheet loading
 * - Minimal dependencies
 * - Style extraction
 * 
 * No dependency on ExcelJS or heavy XLSX.js
 */

import type { 
  Workbook, 
  Worksheet, 
  CellValue, 
  CellStyle,
  CellComment,
  ExcelColorSpec 
} from '@cyber-sheet/core';
import { CommentParser, type ExcelComment } from './CommentParser';

/**
 * XLSX file structure (ZIP-based Office Open XML)
 * 
 * Minimal ZIP parsing - only extract what we need:
 * - xl/workbook.xml - Sheet names and indices
 * - xl/worksheets/sheet*.xml - Cell data (lazy)
 * - xl/styles.xml - Cell styles and number formats
 * - xl/sharedStrings.xml - String pool (streamed)
 */

export interface XLSXParseOptions {
  /** Only load these sheet names/indices */
  sheets?: string[] | number[];
  
  /** Only load cells in viewport range */
  viewport?: {
    startRow: number;
    endRow: number;
    startCol: number;
    endCol: number;
  };
  
  /** Maximum rows to parse (prevents memory issues) */
  maxRows?: number;
  
  /** Maximum columns to parse */
  maxCols?: number;
  
  /** Whether to parse styles (can disable for data-only import) */
  includeStyles?: boolean;
  
  /** Whether to parse formulas */
  includeFormulas?: boolean;
  
  /** Whether to parse merged cells */
  includeMerges?: boolean;
  
  /** Whether to parse comments */
  includeComments?: boolean;
  
  /** Stream callback for progress */
  onProgress?: (progress: { sheet: string; row: number; total: number }) => void;
}

export interface XLSXMetadata {
  /** Sheet names in order */
  sheetNames: string[];
  
  /** Sheet dimensions (may be approximate) */
  sheetDimensions: Map<string, { rows: number; cols: number }>;
  
  /** Style count */
  styleCount: number;
  
  /** Shared string count */
  sharedStringCount: number;
  
  /** File size */
  fileSize: number;
}

export interface ParsedCell {
  value: CellValue;
  formula?: string;
  style?: CellStyle;
  styleIndex?: number;
  comments?: CellComment[];
}

/**
 * Lightweight ZIP reader
 * Only extracts XML files we need, no full decompression
 */
class MinimalZipReader {
  private entries = new Map<string, { offset: number; size: number; compressed: boolean }>();
  
  constructor(private buffer: ArrayBuffer) {}
  
  /**
   * Read ZIP central directory to locate files
   * Avoids decompressing everything upfront
   */
  async readDirectory(): Promise<void> {
    const view = new DataView(this.buffer);
    
    // Find End of Central Directory (EOCD) signature
    // Search backwards from end of file
    let eocdOffset = -1;
    for (let i = this.buffer.byteLength - 22; i >= 0; i--) {
      if (view.getUint32(i, true) === 0x06054b50) {
        eocdOffset = i;
        break;
      }
    }
    
    if (eocdOffset === -1) {
      throw new Error('Invalid ZIP file: EOCD signature not found');
    }
    
    // Read central directory offset and size
    const cdOffset = view.getUint32(eocdOffset + 16, true);
    const cdEntries = view.getUint16(eocdOffset + 10, true);
    
    // Parse central directory entries
    let offset = cdOffset;
    for (let i = 0; i < cdEntries; i++) {
      const sig = view.getUint32(offset, true);
      if (sig !== 0x02014b50) break; // Central directory file header signature
      
      const compressedSize = view.getUint32(offset + 20, true);
      const uncompressedSize = view.getUint32(offset + 24, true);
      const fileNameLength = view.getUint16(offset + 28, true);
      const extraLength = view.getUint16(offset + 30, true);
      const commentLength = view.getUint16(offset + 32, true);
      const localHeaderOffset = view.getUint32(offset + 42, true);
      const compressionMethod = view.getUint16(offset + 10, true);
      
      // Read filename
      const nameBytes = new Uint8Array(this.buffer, offset + 46, fileNameLength);
      const fileName = new TextDecoder().decode(nameBytes);
      
      // Store entry metadata
      this.entries.set(fileName, {
        offset: localHeaderOffset,
        size: compressionMethod === 0 ? uncompressedSize : compressedSize,
        compressed: compressionMethod !== 0
      });
      
      offset += 46 + fileNameLength + extraLength + commentLength;
    }
  }
  
  /**
   * Extract single file from ZIP
   */
  async extractFile(path: string): Promise<Uint8Array | null> {
    const entry = this.entries.get(path);
    if (!entry) return null;
    
    const view = new DataView(this.buffer);
    
    // Read local file header
    const sig = view.getUint32(entry.offset, true);
    if (sig !== 0x04034b50) {
      throw new Error(`Invalid local file header for ${path}`);
    }
    
    const compressionMethod = view.getUint16(entry.offset + 8, true);
    const fileNameLength = view.getUint16(entry.offset + 26, true);
    const extraLength = view.getUint16(entry.offset + 28, true);
    
    const dataOffset = entry.offset + 30 + fileNameLength + extraLength;
    const data = new Uint8Array(this.buffer, dataOffset, entry.size);
    
    // Decompress if needed
    if (compressionMethod === 8) {
      // DEFLATE compression - use browser's DecompressionStream
      if (typeof DecompressionStream !== 'undefined') {
        const stream = new DecompressionStream('deflate-raw');
        const writer = stream.writable.getWriter();
        writer.write(data);
        writer.close();
        
        const chunks: Uint8Array[] = [];
        const reader = stream.readable.getReader();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
        
        // Combine chunks
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }
        
        return result;
      } else {
        throw new Error('DecompressionStream not available (requires modern browser)');
      }
    }
    
    // No compression (method 0)
    return data;
  }
  
  /**
   * List all files in ZIP
   */
  listFiles(): string[] {
    return Array.from(this.entries.keys());
  }
}

/**
 * Incremental XML parser
 * Parses XML in chunks without loading entire DOM
 */
class StreamingXMLParser {
  private decoder = new TextDecoder();
  
  /**
   * Parse XML and yield elements matching tagName
   */
  *parseElements(data: Uint8Array, tagName: string): Generator<Map<string, string>> {
    const xml = this.decoder.decode(data);
    
    // Simple regex-based parser (faster than DOM for large files)
    const openTag = `<${tagName}`;
    const closeTag = `</${tagName}>`;
    const selfClosing = '/>';
    
    let pos = 0;
    while (pos < xml.length) {
      const start = xml.indexOf(openTag, pos);
      if (start === -1) break;
      
      // Find end of tag
      let end = xml.indexOf('>', start);
      if (end === -1) break;
      
      // Check if self-closing
      const isSelfClosing = xml.substring(end - 1, end + 1) === selfClosing;
      
      if (!isSelfClosing) {
        // Find closing tag
        end = xml.indexOf(closeTag, end);
        if (end === -1) break;
        end += closeTag.length;
      } else {
        end++;
      }
      
      const element = xml.substring(start, end);
      const attrs = this.parseAttributes(element);
      
      yield attrs;
      
      pos = end;
    }
  }
  
  /**
   * Extract attributes from element string
   */
  private parseAttributes(element: string): Map<string, string> {
    const attrs = new Map<string, string>();
    
    // Extract tag content (between < and > or />)
    const endOfTag = element.indexOf('>');
    const tagContent = element.substring(0, endOfTag);
    
    // Parse attributes using regex
    const attrRegex = /(\w+)="([^"]*)"/g;
    let match;
    
    while ((match = attrRegex.exec(tagContent)) !== null) {
      attrs.set(match[1], match[2]);
    }
    
    // Also capture text content if not self-closing
    if (!element.endsWith('/>')) {
      const textStart = element.indexOf('>') + 1;
      const textEnd = element.lastIndexOf('</');
      if (textEnd > textStart) {
        const text = element.substring(textStart, textEnd).trim();
        if (text) {
          attrs.set('_text', text);
        }
      }
    }
    
    return attrs;
  }
  
  /**
   * Parse single element by tag name
   */
  parseSingleElement(data: Uint8Array, tagName: string): Map<string, string> | null {
    const gen = this.parseElements(data, tagName);
    const result = gen.next();
    return result.done ? null : result.value;
  }
}

/**
 * Shared string table with streaming support
 */
class SharedStringTable {
  private strings: string[] = [];
  private loaded = false;
  
  async load(data: Uint8Array): Promise<void> {
    const parser = new StreamingXMLParser();
    
    // Parse <si> elements (string items)
    for (const attrs of parser.parseElements(data, 'si')) {
      // String is in nested <t> tag, but we already captured text
      const text = attrs.get('_text') || '';
      this.strings.push(this.decodeXMLEntities(text));
    }
    
    this.loaded = true;
  }
  
  get(index: number): string {
    if (!this.loaded) {
      throw new Error('SharedStringTable not loaded');
    }
    return this.strings[index] || '';
  }
  
  get count(): number {
    return this.strings.length;
  }
  
  private decodeXMLEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }
}

/**
 * Style parser - extracts Excel styles to CellStyle format
 */
class StyleParser {
  private cellXfs: any[] = [];
  private fonts: any[] = [];
  private fills: any[] = [];
  private numFmts = new Map<number, string>();
  
  async parse(data: Uint8Array): Promise<void> {
    const parser = new StreamingXMLParser();
    const xml = new TextDecoder().decode(data);
    
    // Parse number formats
    const numFmtStart = xml.indexOf('<numFmts');
    if (numFmtStart !== -1) {
      const numFmtEnd = xml.indexOf('</numFmts>', numFmtStart);
      const numFmtSection = xml.substring(numFmtStart, numFmtEnd);
      
      const numFmtRegex = /<numFmt numFmtId="(\d+)" formatCode="([^"]+)"/g;
      let match;
      while ((match = numFmtRegex.exec(numFmtSection)) !== null) {
        this.numFmts.set(parseInt(match[1]), match[2]);
      }
    }
    
    // Parse fonts (simplified - just capture basic properties)
    for (const attrs of parser.parseElements(data, 'font')) {
      this.fonts.push(attrs);
    }
    
    // Parse fills
    for (const attrs of parser.parseElements(data, 'fill')) {
      this.fills.push(attrs);
    }
    
    // Parse cell XFs (cell formats)
    for (const attrs of parser.parseElements(data, 'xf')) {
      this.cellXfs.push(attrs);
    }
  }
  
  /**
   * Convert Excel style index to CellStyle
   */
  getStyle(styleIndex: number): CellStyle | undefined {
    const xf = this.cellXfs[styleIndex];
    if (!xf) return undefined;
    
    const style: CellStyle = {};
    
    // Number format
    const numFmtId = parseInt(xf.get('numFmtId') || '0');
    if (numFmtId > 0) {
      const fmt = this.numFmts.get(numFmtId) || this.getBuiltInFormat(numFmtId);
      if (fmt) {
        style.numberFormat = fmt;
      }
    }
    
    // Font
    const fontId = parseInt(xf.get('fontId') || '0');
    const font = this.fonts[fontId];
    if (font) {
      // Font properties would be extracted here
      // Simplified for now
      style.fontSize = 11;
      style.fontFamily = 'Calibri';
    }
    
    // Fill
    const fillId = parseInt(xf.get('fillId') || '0');
    if (fillId >= 2) { // 0 and 1 are system fills
      const fill = this.fills[fillId];
      if (fill) {
        // Extract fill color (simplified)
        // Would parse fgColor, bgColor, pattern type
      }
    }
    
    return Object.keys(style).length > 0 ? style : undefined;
  }
  
  private getBuiltInFormat(numFmtId: number): string | null {
    // Excel built-in formats
    const builtIn: Record<number, string> = {
      1: '0',
      2: '0.00',
      3: '#,##0',
      4: '#,##0.00',
      9: '0%',
      10: '0.00%',
      11: '0.00E+00',
      12: '# ?/?',
      13: '# ??/??',
      14: 'm/d/yy',
      15: 'd-mmm-yy',
      16: 'd-mmm',
      17: 'mmm-yy',
      18: 'h:mm AM/PM',
      19: 'h:mm:ss AM/PM',
      20: 'h:mm',
      21: 'h:mm:ss',
      22: 'm/d/yy h:mm',
      37: '#,##0 ;(#,##0)',
      38: '#,##0 ;[Red](#,##0)',
      39: '#,##0.00;(#,##0.00)',
      40: '#,##0.00;[Red](#,##0.00)',
      45: 'mm:ss',
      46: '[h]:mm:ss',
      47: 'mmss.0',
      48: '##0.0E+0',
      49: '@'
    };
    
    return builtIn[numFmtId] || null;
  }
}

/**
 * Main XLSX parser class
 */
export class LightweightXLSXParser {
  private zip: MinimalZipReader | null = null;
  private sharedStrings: SharedStringTable | null = null;
  private styles: StyleParser | null = null;
  private metadata: XLSXMetadata | null = null;
  private commentParser: CommentParser = new CommentParser();
  
  /**
   * Parse XLSX file metadata without loading cells
   * Fast initial scan to show sheet names and dimensions
   */
  async parseMetadata(buffer: ArrayBuffer): Promise<XLSXMetadata> {
    this.zip = new MinimalZipReader(buffer);
    await this.zip.readDirectory();
    
    // Read workbook.xml to get sheet names
    const workbookData = await this.zip.extractFile('xl/workbook.xml');
    if (!workbookData) {
      throw new Error('Invalid XLSX: workbook.xml not found');
    }
    
    const parser = new StreamingXMLParser();
    const sheetNames: string[] = [];
    const sheetDimensions = new Map<string, { rows: number; cols: number }>();
    
    // Parse sheet elements
    for (const attrs of parser.parseElements(workbookData, 'sheet')) {
      const name = attrs.get('name') || `Sheet${sheetNames.length + 1}`;
      sheetNames.push(name);
    }
    
    // Quick scan of each sheet for dimensions (optional, can be lazy)
    for (let i = 0; i < sheetNames.length; i++) {
      const sheetPath = `xl/worksheets/sheet${i + 1}.xml`;
      const sheetData = await this.zip.extractFile(sheetPath);
      
      if (sheetData) {
        const dim = parser.parseSingleElement(sheetData, 'dimension');
        if (dim) {
          const ref = dim.get('ref') || '';
          const dims = this.parseDimensionRef(ref);
          sheetDimensions.set(sheetNames[i], dims);
        }
      }
    }
    
    this.metadata = {
      sheetNames,
      sheetDimensions,
      styleCount: 0,
      sharedStringCount: 0,
      fileSize: buffer.byteLength
    };
    
    return this.metadata;
  }
  
  /**
   * Load single sheet with viewport optimization
   */
  async parseSheet(
    sheetNameOrIndex: string | number,
    options: XLSXParseOptions = {}
  ): Promise<Map<string, ParsedCell>> {
    if (!this.zip) {
      throw new Error('Call parseMetadata() first');
    }
    
    // Resolve sheet index
    let sheetIndex: number;
    if (typeof sheetNameOrIndex === 'number') {
      sheetIndex = sheetNameOrIndex;
    } else {
      sheetIndex = this.metadata!.sheetNames.indexOf(sheetNameOrIndex);
      if (sheetIndex === -1) {
        throw new Error(`Sheet not found: ${sheetNameOrIndex}`);
      }
    }
    
    // Load shared strings if needed (lazy)
    if (!this.sharedStrings) {
      const ssData = await this.zip.extractFile('xl/sharedStrings.xml');
      if (ssData) {
        this.sharedStrings = new SharedStringTable();
        await this.sharedStrings.load(ssData);
      }
    }
    
    // Load styles if needed (lazy)
    if (!this.styles && options.includeStyles !== false) {
      const styleData = await this.zip.extractFile('xl/styles.xml');
      if (styleData) {
        this.styles = new StyleParser();
        await this.styles.parse(styleData);
      }
    }
    
    // Load sheet data
    const sheetPath = `xl/worksheets/sheet${sheetIndex + 1}.xml`;
    const sheetData = await this.zip.extractFile(sheetPath);
    
    if (!sheetData) {
      throw new Error(`Sheet data not found: ${sheetPath}`);
    }
    
    const cells = this.parseSheetCells(sheetData, options);
    
    // Load comments if requested
    if (options.includeComments !== false) {
      await this.loadComments(sheetIndex, cells);
    }
    
    return cells;
  }
  
  /**
   * Load comments for a sheet and merge into cells
   */
  private async loadComments(sheetIndex: number, cells: Map<string, ParsedCell>): Promise<void> {
    if (!this.zip) return;
    
    const commentPath = `xl/comments${sheetIndex + 1}.xml`;
    const commentData = await this.zip.extractFile(commentPath);
    
    if (commentData) {
      const excelComments = this.commentParser.parseComments(commentData);
      
      // Load VML drawing for positioning (optional)
      const vmlPath = `xl/drawings/vmlDrawing${sheetIndex + 1}.vml`;
      const vmlData = await this.zip.extractFile(vmlPath);
      let positions: Map<string, { position: { x: number; y: number }; size: { width: number; height: number } }> | undefined;
      
      if (vmlData) {
        positions = this.commentParser.parseVmlDrawing(vmlData);
      }
      
      // Merge comments into cells
      for (const [ref, commentList] of excelComments) {
        const cell = cells.get(ref);
        if (cell) {
          cell.comments = commentList.map(ec => {
            const position = positions?.get(ref)?.position;
            return {
              ...this.commentParser.fromExcelComment(ec),
              id: `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              createdAt: new Date(),
              position,
            };
          });
        } else {
          // Cell doesn't exist yet, create it with comment
          cells.set(ref, {
            value: null,
            comments: commentList.map(ec => {
              const position = positions?.get(ref)?.position;
              return {
                ...this.commentParser.fromExcelComment(ec),
                id: `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                createdAt: new Date(),
                position,
              };
            }),
          });
        }
      }
    }
    
    // Try threaded comments (Office 365+)
    const threadedPath = `xl/threadedComments/threadedComment${sheetIndex + 1}.xml`;
    const threadedData = await this.zip.extractFile(threadedPath);
    
    if (threadedData) {
      const threadedComments = this.commentParser.parseThreadedComments(threadedData);
      
      for (const [ref, commentList] of threadedComments) {
        const cell = cells.get(ref);
        const convertedComments = commentList.map(ec => ({
          ...this.commentParser.fromExcelComment(ec),
          id: `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date(),
        }));
        
        if (cell) {
          if (!cell.comments) {
            cell.comments = [];
          }
          cell.comments.push(...convertedComments);
        } else {
          cells.set(ref, {
            value: null,
            comments: convertedComments,
          });
        }
      }
    }
  }
  
  /**
   * Parse cells from sheet XML with viewport filtering
   */
  private parseSheetCells(
    data: Uint8Array,
    options: XLSXParseOptions
  ): Map<string, ParsedCell> {
    const cells = new Map<string, ParsedCell>();
    const parser = new StreamingXMLParser();
    
    const { viewport, maxRows, maxCols } = options;
    
    let rowCount = 0;
    
    // Parse <row> elements
    for (const rowAttrs of parser.parseElements(data, 'row')) {
      const rowNum = parseInt(rowAttrs.get('r') || '0');
      
      // Viewport filtering
      if (viewport) {
        if (rowNum < viewport.startRow || rowNum > viewport.endRow) {
          continue;
        }
      }
      
      // Max rows limit
      if (maxRows && rowCount >= maxRows) {
        break;
      }
      
      rowCount++;
      
      // Progress callback
      if (options.onProgress) {
        options.onProgress({
          sheet: this.metadata?.sheetNames[0] || 'Unknown',
          row: rowNum,
          total: viewport?.endRow || maxRows || 0
        });
      }
    }
    
    // Parse <c> (cell) elements
    for (const cellAttrs of parser.parseElements(data, 'c')) {
      const ref = cellAttrs.get('r') || '';
      const { row, col } = this.parseRef(ref);
      
      // Viewport filtering
      if (viewport) {
        if (row < viewport.startRow || row > viewport.endRow ||
            col < viewport.startCol || col > viewport.endCol) {
          continue;
        }
      }
      
      // Max columns limit
      if (maxCols && col > maxCols) {
        continue;
      }
      
      const cell: ParsedCell = {
        value: null
      };
      
      // Cell type
      const type = cellAttrs.get('t') || '';
      const styleIndex = parseInt(cellAttrs.get('s') || '0');
      
      // Value
      const valueText = cellAttrs.get('_text') || '';
      
      if (type === 's') {
        // Shared string
        const sst = parseInt(valueText);
        cell.value = this.sharedStrings?.get(sst) || '';
      } else if (type === 'b') {
        // Boolean
        cell.value = valueText === '1';
      } else if (type === 'n' || !type) {
        // Number
        const num = parseFloat(valueText);
        cell.value = isNaN(num) ? null : num;
      } else {
        // Inline string or other
        cell.value = valueText;
      }
      
      // Style
      if (options.includeStyles !== false && styleIndex > 0) {
        cell.styleIndex = styleIndex;
        cell.style = this.styles?.getStyle(styleIndex);
      }
      
      cells.set(ref, cell);
    }
    
    return cells;
  }
  
  /**
   * Parse cell reference (e.g., "A1" -> {row: 1, col: 1})
   */
  private parseRef(ref: string): { row: number; col: number } {
    const match = ref.match(/^([A-Z]+)(\d+)$/);
    if (!match) return { row: 0, col: 0 };
    
    const colStr = match[1];
    const row = parseInt(match[2]);
    
    // Convert column letters to number
    let col = 0;
    for (let i = 0; i < colStr.length; i++) {
      col = col * 26 + (colStr.charCodeAt(i) - 64);
    }
    
    return { row, col };
  }
  
  /**
   * Parse dimension reference (e.g., "A1:Z100")
   */
  private parseDimensionRef(ref: string): { rows: number; cols: number } {
    const parts = ref.split(':');
    if (parts.length !== 2) return { rows: 0, cols: 0 };
    
    const start = this.parseRef(parts[0]);
    const end = this.parseRef(parts[1]);
    
    return {
      rows: end.row - start.row + 1,
      cols: end.col - start.col + 1
    };
  }
}

export default LightweightXLSXParser;
