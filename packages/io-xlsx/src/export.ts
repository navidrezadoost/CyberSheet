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

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { zipSync, strToU8 } from 'fflate';
import { Workbook, Worksheet, CellStyle } from '@cyber-sheet/core';

/**
 * Export workbook to XLSX ArrayBuffer.
 * 
 * Reads canonical styles via getCellStyle() and projects to Excel XML.
 * Never touches cell.style directly - enforces access discipline.
 */
export async function exportXLSX(workbook: Workbook): Promise<ArrayBuffer> {
  // Collect all unique canonical styles (reference-based deduplication)
  const styleMap = new Map<CellStyle, number>(); // canonical reference → xf index
  const styles: CellStyle[] = [];
  
  // Scan all sheets for styles
  for (const sheetName of workbook.getSheetNames()) {
    const sheet = workbook.getSheet(sheetName);
    if (!sheet) continue;
    
    for (let row = 1; row <= sheet.rowCount; row++) {
      for (let col = 1; col <= sheet.colCount; col++) {
        // Discipline: Read via getCellStyle() only
        const style = sheet.getCellStyle({ row, col });
        if (style && !styleMap.has(style)) {
          styleMap.set(style, styles.length);
          styles.push(style); // Store canonical reference
        }
      }
    }
  }
  
  // Generate XLSX XML parts
  const xmlParts = generateXLSXParts(workbook, styles, styleMap);
  
  // Convert strings to Uint8Array for fflate
  const files: Record<string, Uint8Array> = {};
  for (const [path, xml] of Object.entries(xmlParts)) {
    files[path] = strToU8(xml);
  }
  
  // Required XLSX structure files
  files['_rels/.rels'] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`);
  
  files['[Content_Types].xml'] = strToU8(generateContentTypesXML(workbook));
  
  // Zip into XLSX
  const zipped = zipSync(files, { level: 6 });
  
  // Convert to ArrayBuffer (handle both ArrayBuffer and SharedArrayBuffer)
  if (zipped.buffer instanceof ArrayBuffer) {
    return zipped.buffer;
  } else {
    // Create a copy as ArrayBuffer
    const buffer = new ArrayBuffer(zipped.byteLength);
    new Uint8Array(buffer).set(zipped);
    return buffer;
  }
}

interface XLSXParts {
  'xl/workbook.xml': string;
  'xl/styles.xml': string;
  'xl/_rels/workbook.xml.rels': string;
  [sheetPath: string]: string; // xl/worksheets/sheet1.xml, etc.
}

function generateXLSXParts(
  workbook: Workbook,
  styles: CellStyle[],
  styleMap: Map<CellStyle, number>
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
      parts[`xl/worksheets/sheet${idx + 1}.xml`] = generateSheetXML(sheet, styleMap);
    }
  });
  
  return parts;
}

function generateWorkbookXML(workbook: Workbook): string {
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

function generateWorkbookRels(workbook: Workbook): string {
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
  if ((style as any).indent !== undefined) {
    attrs.push(`indent="${(style as any).indent}"`);
  }
  
  return attrs.length > 0 ? `<alignment ${attrs.join(' ')}/>` : '';
}

function generateSheetXML(sheet: Worksheet, styleMap: Map<CellStyle, number>): string {
  const rows: string[] = [];
  
  for (let row = 1; row <= sheet.rowCount; row++) {
    const cells: string[] = [];
    
    for (let col = 1; col <= sheet.colCount; col++) {
      const addr = { row, col };
      const value = sheet.getCellValue(addr);
      
      // Discipline: Read via getCellStyle() only
      const style = sheet.getCellStyle(addr);
      const styleIdx = style ? styleMap.get(style) : undefined;
      
      if (value !== null || styleIdx !== undefined) {
        const cellRef = colToA1(col) + row;
        const styleAttr = styleIdx !== undefined ? ` s="${styleIdx}"` : '';
        
        if (typeof value === 'string') {
          cells.push(`<c r="${cellRef}"${styleAttr} t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`);
        } else if (typeof value === 'number') {
          cells.push(`<c r="${cellRef}"${styleAttr}><v>${value}</v></c>`);
        } else if (typeof value === 'boolean') {
          cells.push(`<c r="${cellRef}"${styleAttr} t="b"><v>${value ? '1' : '0'}</v></c>`);
        } else if (styleIdx !== undefined) {
          // Empty cell with style
          cells.push(`<c r="${cellRef}"${styleAttr}/>`);
        }
      }
    }
    
    if (cells.length > 0) {
      rows.push(`<row r="${row}">${cells.join('')}</row>`);
    }
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

function generateContentTypesXML(workbook: Workbook): string {
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
