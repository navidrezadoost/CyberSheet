/**
 * XLSX Export: Canonical Style Projection
 * 
 * Discipline Rules:
 * 1. Read styles via getCellStyle() only (never cell.style directly)
 * 2. Export from canonical - no reconstruction
 * 3. No de-interning - styles are read-only projections
 * 4. Export semantic values (indent levels, not pixels)
 * 5. Preserve mutual exclusivity (superscript/subscript)
 */

import { Workbook, Worksheet, CellStyle, WorkbookSheetView } from '@cyber-sheet/core';

const worksheetOwnershipPredicate = Object.getOwnPropertyDescriptor(
  Worksheet.prototype,
  'isWorkbookOwned',
)?.value;

type ReadableSheet = WorkbookSheetView | Worksheet;
interface XLSXExportSource {
  getSheetNames(): string[];
  getSheet(name: string): ReadableSheet | undefined;
}

function exportSource(source: Workbook | Worksheet): XLSXExportSource {
  if (source instanceof Worksheet) {
    return { getSheetNames: () => [source.name], getSheet: (name) => name === source.name ? source : undefined };
  }
  return source;
}

function assertExportableSource(source: Workbook | Worksheet): void {
  if (!(source instanceof Worksheet)) return;
  if (typeof worksheetOwnershipPredicate !== 'function') {
    throw new Error('Worksheet ownership check is unavailable');
  }
  if (Reflect.apply(worksheetOwnershipPredicate, source, []) === true) {
    throw new Error(
      'Cannot export a Workbook-owned raw Worksheet; pass the Workbook to use owner-backed reads',
    );
  }
}

/**
 * Export workbook to XLSX ArrayBuffer.
 * 
 * Reads canonical styles via getCellStyle() and projects to Excel XML.
 * Never touches cell.style directly - enforces access discipline.
 */
export async function exportXLSX(source: Workbook | Worksheet): Promise<ArrayBuffer> {
  assertExportableSource(source);
  const workbook = exportSource(source);
  // Collect all unique canonical styles (reference-based deduplication)
  const styleMap = new Map<CellStyle, number>(); // canonical reference → xf index
  const styleIndexByCell = new Map<string, Map<string, number>>();
  // OOXML reserves cell format index 0 for the default style. Keep the default
  // entry even when the sheet has no explicit cell styles so mapped styles
  // always use a valid, nonzero style index.
  const styles: CellStyle[] = [{}];
  
  // Scan all sheets for styles
  for (const sheetName of workbook.getSheetNames()) {
    const sheet = workbook.getSheet(sheetName);
    if (!sheet) continue;
    
    sheet.forEachNonEmptyCell((row, col) => {
      // Discipline: Read via getCellStyle() only. Iterating stored cells keeps
      // widely separated addresses proportional to populated cells, not area.
      const style = sheet.getCellStyle({ row, col });
      if (style) {
        let styleIndex = styleMap.get(style);
        if (styleIndex === undefined) {
          styleIndex = styles.length;
          styleMap.set(style, styleIndex);
          styles.push(style); // Store canonical reference
        }
        let sheetStyleIndexes = styleIndexByCell.get(sheetName);
        if (!sheetStyleIndexes) {
          sheetStyleIndexes = new Map<string, number>();
          styleIndexByCell.set(sheetName, sheetStyleIndexes);
        }
        sheetStyleIndexes.set(`${row}:${col}`, styleIndex);
      }
    });
  }
  
  // Generate XLSX XML parts
  const xmlParts = generateXLSXParts(workbook, styles, styleIndexByCell);
  
  // Convert strings to UTF-8 bytes before writing trusted generated OOXML parts.
  const encoder = new TextEncoder();
  const files: Record<string, Uint8Array> = {};
  for (const [path, xml] of Object.entries(xmlParts)) {
    files[path] = encoder.encode(xml);
  }
  
  // Required XLSX structure files
  files['_rels/.rels'] = encoder.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`);
  
  files['[Content_Types].xml'] = encoder.encode(generateContentTypesXML(workbook));
  
  // This store-only ZIP writer handles only trusted, generated OOXML entries.
  // It deliberately contains no ZIP reader or decompressor. Deterministic DOS
  // timestamps keep identical workbooks byte-for-byte stable.
  return writeStoredZip(files);
}

const ZIP_UINT32_MAX = 0xffff_ffff;
const ZIP_DOS_DATE_2000_01_01 = ((2000 - 1980) << 9) | (1 << 5) | 1;
const ZIP_UTF8_FLAG = 0x0800;
const CRC32_TABLE = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit++) {
    crc = (crc >>> 1) ^ ((crc & 1) === 1 ? 0xedb8_8320 : 0);
  }
  return crc >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let crc = 0xffff_ffff;
  for (const byte of bytes) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffff_ffff) >>> 0;
}

function writeStoredZip(files: Record<string, Uint8Array>): ArrayBuffer {
  const entries = Object.entries(files).map(([path, data]) => ({
    name: new TextEncoder().encode(path),
    data,
    checksum: 0,
  }));
  if (entries.length > 0xffff) throw new RangeError('XLSX export exceeds the ZIP entry-count limit');

  let localSize = 0;
  let centralSize = 0;
  for (const entry of entries) {
    if (entry.name.byteLength > 0xffff) throw new RangeError('XLSX export contains an overlong ZIP entry name');
    if (entry.data.byteLength > ZIP_UINT32_MAX) throw new RangeError('XLSX export exceeds the ZIP32 entry-size limit');
    localSize += 30 + entry.name.byteLength + entry.data.byteLength;
    centralSize += 46 + entry.name.byteLength;
    if (localSize > ZIP_UINT32_MAX || centralSize > ZIP_UINT32_MAX) {
      throw new RangeError('XLSX export exceeds the ZIP32 archive-size limit');
    }
  }
  const endOffset = localSize + centralSize;
  const totalSize = endOffset + 22;
  if (endOffset > ZIP_UINT32_MAX || totalSize > ZIP_UINT32_MAX) {
    throw new RangeError('XLSX export exceeds the ZIP32 archive-size limit');
  }

  for (const entry of entries) entry.checksum = crc32(entry.data);

  const output = new Uint8Array(totalSize);
  const view = new DataView(output.buffer);
  let offset = 0;
  const localOffsets: number[] = [];

  for (const entry of entries) {
    localOffsets.push(offset);
    view.setUint32(offset, 0x0403_4b50, true);
    view.setUint16(offset + 4, 20, true);
    view.setUint16(offset + 6, ZIP_UTF8_FLAG, true);
    view.setUint16(offset + 8, 0, true); // Stored, without compression.
    view.setUint16(offset + 10, 0, true);
    view.setUint16(offset + 12, ZIP_DOS_DATE_2000_01_01, true);
    view.setUint32(offset + 14, entry.checksum, true);
    view.setUint32(offset + 18, entry.data.byteLength, true);
    view.setUint32(offset + 22, entry.data.byteLength, true);
    view.setUint16(offset + 26, entry.name.byteLength, true);
    view.setUint16(offset + 28, 0, true);
    output.set(entry.name, offset + 30);
    output.set(entry.data, offset + 30 + entry.name.byteLength);
    offset += 30 + entry.name.byteLength + entry.data.byteLength;
  }

  const centralOffset = offset;
  entries.forEach((entry, index) => {
    view.setUint32(offset, 0x0201_4b50, true);
    view.setUint16(offset + 4, 20, true);
    view.setUint16(offset + 6, 20, true);
    view.setUint16(offset + 8, ZIP_UTF8_FLAG, true);
    view.setUint16(offset + 10, 0, true);
    view.setUint16(offset + 12, 0, true);
    view.setUint16(offset + 14, ZIP_DOS_DATE_2000_01_01, true);
    view.setUint32(offset + 16, entry.checksum, true);
    view.setUint32(offset + 20, entry.data.byteLength, true);
    view.setUint32(offset + 24, entry.data.byteLength, true);
    view.setUint16(offset + 28, entry.name.byteLength, true);
    view.setUint16(offset + 30, 0, true);
    view.setUint16(offset + 32, 0, true);
    view.setUint16(offset + 34, 0, true);
    view.setUint16(offset + 36, 0, true);
    view.setUint32(offset + 38, 0, true);
    view.setUint32(offset + 42, localOffsets[index], true);
    output.set(entry.name, offset + 46);
    offset += 46 + entry.name.byteLength;
  });

  view.setUint32(offset, 0x0605_4b50, true);
  view.setUint16(offset + 4, 0, true);
  view.setUint16(offset + 6, 0, true);
  view.setUint16(offset + 8, entries.length, true);
  view.setUint16(offset + 10, entries.length, true);
  view.setUint32(offset + 12, centralSize, true);
  view.setUint32(offset + 16, centralOffset, true);
  view.setUint16(offset + 20, 0, true);
  return output.buffer;
}

interface XLSXParts {
  'xl/workbook.xml': string;
  'xl/styles.xml': string;
  'xl/_rels/workbook.xml.rels': string;
  [sheetPath: string]: string; // xl/worksheets/sheet1.xml, etc.
}

function generateXLSXParts(
  workbook: XLSXExportSource,
  styles: CellStyle[],
  styleIndexByCell: Map<string, Map<string, number>>
): XLSXParts {
  const parts: XLSXParts = {
    'xl/workbook.xml': generateWorkbookXML(workbook),
    'xl/styles.xml': generateStylesXML(styles),
    'xl/_rels/workbook.xml.rels': generateWorkbookRels(workbook),
  };
  
  // Generate sheet XMLs
  const sheetNames = workbook.getSheetNames();
  sheetNames.forEach((name, idx) => {
    const sheet = workbook.getSheet(name);
    if (sheet) {
      parts[`xl/worksheets/sheet${idx + 1}.xml`] = generateSheetXML(sheet, styleIndexByCell.get(name));
    }
  });
  
  return parts;
}

function generateWorkbookXML(workbook: XLSXExportSource): string {
  const sheetNames = workbook.getSheetNames();
  const sheetsXml = sheetNames
    .map((name, idx) => {
      const rId = `rId${idx + 1}`;
      return `<sheet name="${escapeXml(name)}" sheetId="${idx + 1}" r:id="${rId}"/>`;
    })
    .join('');
  
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${sheetsXml}</sheets>
</workbook>`;
}

function generateWorkbookRels(workbook: XLSXExportSource): string {
  const sheetNames = workbook.getSheetNames();
  const relsXml = sheetNames
    .map((_, idx) => {
      const rId = `rId${idx + 1}`;
      return `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${idx + 1}.xml"/>`;
    })
    .join('');
  
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${relsXml}
</Relationships>`;
}

/**
 * Generate styles.xml from canonical styles.
 * 
 * Pure projection - no style reconstruction or cloning.
 * Exports semantic values (indent levels, not pixels).
 */
function generateStylesXML(styles: CellStyle[]): string {
  // Collect unique fonts, fills, borders (by structural equality, not reference)
  const fonts: string[] = ['<font><sz val="11"/><name val="Calibri"/></font>']; // Excel default
  const fills: string[] = ['<fill><patternFill patternType="none"/></fill>']; // Excel default
  const borders: string[] = ['<border/>']; // Excel default
  
  const fontMap = new Map<string, number>();
  const fillMap = new Map<string, number>();
  const borderMap = new Map<string, number>();
  
  // Build font/fill/border collections
  styles.forEach(style => {
    const fontXml = styleToFontXML(style);
    if (fontXml && !fontMap.has(fontXml)) {
      fontMap.set(fontXml, fonts.length);
      fonts.push(fontXml);
    }
    
    const fillXml = styleToFillXML(style);
    if (fillXml && !fillMap.has(fillXml)) {
      fillMap.set(fillXml, fills.length);
      fills.push(fillXml);
    }
    
    const borderXml = styleToBorderXML(style);
    if (borderXml && !borderMap.has(borderXml)) {
      borderMap.set(borderXml, borders.length);
      borders.push(borderXml);
    }
  });
  
  // Generate cellXfs (style entries)
  const xfsXml = styles
    .map(style => {
      const fontId = fontMap.get(styleToFontXML(style) || '') ?? 0;
      const fillId = fillMap.get(styleToFillXML(style) || '') ?? 0;
      const borderId = borderMap.get(styleToBorderXML(style) || '') ?? 0;
      
      const applyFont = fontId > 0 ? ' applyFont="1"' : '';
      const applyFill = fillId > 0 ? ' applyFill="1"' : '';
      const applyBorder = borderId > 0 ? ' applyBorder="1"' : '';
      const applyAlignment = (style.align || style.wrap || style.rotation || style.indent) ? ' applyAlignment="1"' : '';
      
      const alignmentXml = styleToAlignmentXML(style);
      
      return `<xf numFmtId="0" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}"${applyFont}${applyFill}${applyBorder}${applyAlignment}>${alignmentXml}</xf>`;
    })
    .join('');
  
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="0"/>
  <fonts count="${fonts.length}">
    ${fonts.join('')}
  </fonts>
  <fills count="${fills.length}">
    ${fills.join('')}
  </fills>
  <borders count="${borders.length}">
    ${borders.join('')}
  </borders>
  <cellXfs count="${styles.length}">
    ${xfsXml}
  </cellXfs>
</styleSheet>`;
}

/**
 * Project canonical style to Excel font XML.
 * 
 * Phase 1 UI: strikethrough, superscript, subscript
 */
function styleToFontXML(style: CellStyle): string | undefined {
  const parts: string[] = [];
  
  if (style.bold) parts.push('<b/>');
  if (style.italic) parts.push('<i/>');
  if (style.underline) parts.push('<u/>');
  
  // Phase 1 UI: strikethrough
  if ((style as any).strikethrough) parts.push('<strike/>');
  
  // Phase 1 UI: superscript/subscript (mutually exclusive, enforced by cache)
  if ((style as any).superscript) {
    parts.push('<vertAlign val="superscript"/>');
  } else if ((style as any).subscript) {
    parts.push('<vertAlign val="subscript"/>');
  }
  
  if (style.fontSize) parts.push(`<sz val="${style.fontSize}"/>`);
  
  // Handle color (can be string or ExcelColorSpec)
  if (style.color) {
    const colorStr = typeof style.color === 'string' ? style.color : '#000000'; // Fallback for theme colors
    parts.push(`<color rgb="${cssToArgb(colorStr)}"/>`);
  }
  
  if (style.fontFamily) parts.push(`<name val="${escapeXml(style.fontFamily)}"/>`);
  
  return parts.length > 0 ? `<font>${parts.join('')}</font>` : undefined;
}

function styleToFillXML(style: CellStyle): string | undefined {
  if (!style.fill) return undefined;
  
  // Handle fill (can be string or ExcelColorSpec)
  const fillStr = typeof style.fill === 'string' ? style.fill : '#FFFFFF';
  const rgb = cssToArgb(fillStr);
  return `<fill><patternFill patternType="solid"><fgColor rgb="${rgb}"/></patternFill></fill>`;
}

function styleToBorderXML(style: CellStyle): string | undefined {
  if (!style.border) return undefined;
  
  const b = style.border;
  const parts: string[] = [];
  
  // Helper to convert border color (can be string or ExcelColorSpec)
  const toColorStr = (color: any) => typeof color === 'string' ? color : '#000000';
  
  if (b.top) parts.push(`<top><color rgb="${cssToArgb(toColorStr(b.top))}"/></top>`);
  if (b.right) parts.push(`<right><color rgb="${cssToArgb(toColorStr(b.right))}"/></right>`);
  if (b.bottom) parts.push(`<bottom><color rgb="${cssToArgb(toColorStr(b.bottom))}"/></bottom>`);
  if (b.left) parts.push(`<left><color rgb="${cssToArgb(toColorStr(b.left))}"/></left>`);
  
  return parts.length > 0 ? `<border>${parts.join('')}</border>` : undefined;
}

/**
 * Project canonical style to Excel alignment XML.
 * 
 * Phase 1 UI: indent (semantic value, not pixels)
 * Discipline: Export indent level directly, not computedPixels / 8
 */
function styleToAlignmentXML(style: CellStyle): string {
  const attrs: string[] = [];
  
  if (style.align) attrs.push(`horizontal="${style.align}"`);
  if (style.wrap) attrs.push('wrapText="1"');
  if (style.rotation !== undefined) attrs.push(`textRotation="${style.rotation}"`);
  
  // Phase 1 UI: Export semantic indent value (not render pixels)
  if (typeof style.indent === 'number' && style.indent > 0) {
    attrs.push(`indent="${style.indent}"`);
  }
  
  return attrs.length > 0 ? `<alignment ${attrs.join(' ')}/>` : '';
}

function generateSheetXML(sheet: ReadableSheet, styleIndexes: Map<string, number> | undefined): string {
  const rows: string[] = [];
  const cellsByRow = new Map<number, Array<{ col: number; xml: string }>>();
  sheet.forEachNonEmptyCell((row, col, cell) => {
    const addr = { row, col };
    const value = sheet.getCellValue(addr);
    const formula = cell.formula as string | undefined;

    const styleIdx = styleIndexes?.get(`${row}:${col}`);
    if (value === null && styleIdx === undefined && !formula) return;

    const cellRef = colToA1(col) + row;
    const styleAttr = styleIdx !== undefined ? ` s="${styleIdx}"` : '';
    let cellXml: string;
    if (formula) {
      const formulaXml = `<f>${escapeXml(formula.startsWith('=') ? formula.slice(1) : formula)}</f>`;
      if (typeof value === 'string') {
        cellXml = `<c r="${cellRef}"${styleAttr} t="str">${formulaXml}<v>${escapeXml(value)}</v></c>`;
      } else if (typeof value === 'number') {
        cellXml = `<c r="${cellRef}"${styleAttr}>${formulaXml}<v>${value}</v></c>`;
      } else if (typeof value === 'boolean') {
        cellXml = `<c r="${cellRef}"${styleAttr} t="b">${formulaXml}<v>${value ? '1' : '0'}</v></c>`;
      } else if (value === null || value === undefined) {
        cellXml = `<c r="${cellRef}"${styleAttr}>${formulaXml}<v></v></c>`;
      } else {
        cellXml = `<c r="${cellRef}"${styleAttr} t="str">${formulaXml}<v>${escapeXml(String(value))}</v></c>`;
      }
    } else if (typeof value === 'string') {
      const preserveSpace = /^[\t\n\r ]|[\t\n\r ]$|[\t\n\r]/.test(value)
        ? ' xml:space="preserve"'
        : '';
      cellXml = `<c r="${cellRef}"${styleAttr} t="inlineStr"><is><t${preserveSpace}>${escapeXml(value)}</t></is></c>`;
    } else if (typeof value === 'number') {
      cellXml = `<c r="${cellRef}"${styleAttr}><v>${value}</v></c>`;
    } else if (typeof value === 'boolean') {
      cellXml = `<c r="${cellRef}"${styleAttr} t="b"><v>${value ? '1' : '0'}</v></c>`;
    } else if (styleIdx !== undefined) {
      // Empty cell with style
      cellXml = `<c r="${cellRef}"${styleAttr}/>`;
    } else {
      return;
    }

    const rowCells = cellsByRow.get(row) ?? [];
    rowCells.push({ col, xml: cellXml });
    cellsByRow.set(row, rowCells);
  });

  if (cellsByRow.size === 0) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData></sheetData>
</worksheet>`;
  }

  for (const [row, cells] of [...cellsByRow].sort(([a], [b]) => a - b)) {
    cells.sort((a, b) => a.col - b.col);
    rows.push(`<row r="${row}">${cells.map(({ xml }) => xml).join('')}</row>`);
  }
  
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${rows.join('')}</sheetData>
</worksheet>`;
}

// ==================== Utilities ====================

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cssToArgb(css: string): string {
  // Convert CSS color to ARGB hex (AARRGGBB)
  if (css.startsWith('#')) {
    const hex = css.slice(1);
    return 'FF' + hex.toUpperCase().padStart(6, '0');
  }
  
  // Handle rgba(r,g,b,a)
  const rgba = css.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgba) {
    const r = parseInt(rgba[1], 10).toString(16).padStart(2, '0');
    const g = parseInt(rgba[2], 10).toString(16).padStart(2, '0');
    const b = parseInt(rgba[3], 10).toString(16).padStart(2, '0');
    const a = rgba[4] ? Math.round(parseFloat(rgba[4]) * 255).toString(16).padStart(2, '0') : 'FF';
    return (a + r + g + b).toUpperCase();
  }
  
  return 'FF000000'; // Default black
}

function colToA1(col: number): string {
  let s = '';
  while (col > 0) {
    const rem = (col - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    col = Math.floor((col - 1) / 26);
  }
  return s;
}

function generateContentTypesXML(workbook: XLSXExportSource): string {
  const sheetNames = workbook.getSheetNames();
  const overrides = sheetNames
    .map((_, idx) => `<Override PartName="/xl/worksheets/sheet${idx + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
    .join('');
  
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${overrides}
</Types>`;
}
