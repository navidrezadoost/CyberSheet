# Excel 365 UI Implementation Roadmap

**Date:** April 25, 2026  
**Goal:** Implement Excel 365-compatible UI menus (File & Home tabs) matching Microsoft Excel Online 365 exactly  
**Current Status:** Backend at 93-97% Excel parity | UI at 15-20% coverage

---

## Executive Summary

CyberSheet has **exceptional backend infrastructure** (93-97% Excel parity, 4,802+ tests passing, 100% complete: Formulas, Charts, Conditional Formatting, Fonts & Styles, Find & Replace, Freeze Panes, Cell Protection). However, **UI layer is severely underdeveloped** (15-20% coverage, no File/Home menu ribbons exists).

**This document provides a comprehensive audit and implementation plan for:**
- ✅ File Menu (9 items)
- ✅ Home Menu (32 items)

---

## 📋 Implementation Status Legend

| Symbol | Meaning | Description |
|--------|---------|-------------|
| ✅ **READY** | Backend + UI Complete | Feature fully implemented and connected to UI |
| 🟢 **BACKEND COMPLETE** | Backend 100%, UI Missing | Infrastructure exists, only UI implementation needed |
| 🟡 **PARTIAL** | Backend Exists, Needs Completion | Core logic present but incomplete |
| 🔴 **MISSING** | No Backend, No UI | Requires full implementation from scratch |
| ⚠️ **BACKEND ONLY** | Working code, No user access | Feature works programmatically but no UI |

---

# FILE MENU AUDIT (9 Items)

## 1. NEW ✅ READY (Backend: 100% | UI: 0%)

**Backend Status:** ✅ Complete  
**Location:** `packages/core/src/Workbook.ts`  
**Evidence:**
```typescript
const workbook = new Workbook(); // Creates new workbook programmatically
```

**UI Status:** 🔴 Missing  
**Required UI Components:**
- New workbook button/dialog
- Template selection (blank, budget, invoice, etc.)
- Recent files list

**Implementation Effort:** 2-3 days  
**Priority:** High (basic functionality)

---

## 2. OPEN 🟢 BACKEND COMPLETE (Backend: 100% | UI: 0%)

**Backend Status:** ✅ Complete  
**Package:** `@cyber-sheet/io-xlsx`  
**Features:**
- ✅ XLSX import with native DecompressionStream
- ✅ Excel file parsing (LightweightXLSXParser)
- ✅ Cell values, formulas, styles, comments support
- ✅ Load from URL capability

**Evidence:**
```typescript
import { loadXlsxFromUrl } from '@cyber-sheet/io-xlsx';
const workbook = await loadXlsxFromUrl(url);
```

**UI Status:** 🔴 Missing  
**Required UI Components:**
- File picker dialog (local device)
- URL input dialog
- Drag-and-drop zone
- Loading progress indicator
- Error handling UI

**Implementation Effort:** 3-4 days  
**Priority:** High (critical user workflow)

---

## 3. SHARE 🔴 MISSING (Backend: 0% | UI: 0%)

**Backend Status:** 🔴 Not Implemented  
**Required Infrastructure:**
- Share link generation system
- Embed code generator
- Permission management (view/edit)
- User invitation system (requires backend)

**UI Status:** 🔴 Missing  
**Required UI Components:**
- Share dialog with tabs:
  - Share with people (email input)
  - Copy link (view/edit permissions dropdown)
  - Embed workbook (iframe code generator)

**Implementation Effort:** 8-12 weeks (requires backend collaboration system)  
**Priority:** Medium (collaboration feature)  
**Blocker:** Requires backend API for user management, authentication, realtime sync

**Note:** This is a backend-dependent feature. Frontend can mock UI, but full implementation requires:
- User authentication system
- Real-time collaboration engine
- Conflict resolution
- WebSocket/WebRTC infrastructure

---

## 4. CREATE A COPY / DOWNLOAD 🟢 BACKEND COMPLETE (Backend: 100% | UI: 0%)

**Backend Status:** ✅ Complete  
**Package:** `@cyber-sheet/io-xlsx`, `@cyber-sheet/renderer-canvas`  
**Features:**
- ✅ Export to XLSX
- ✅ Export to CSV
- ✅ Export to JSON
- ✅ Export to PNG
- ✅ Download functionality

**Evidence:**
```typescript
// Export examples from codebase
const exporter = new ExportPlugin(worksheet, renderer);
const csvResult = await exporter.export('csv');
ExportPlugin.download(csvResult); // Triggers browser download
```

**UI Status:** 🔴 Missing  
**Required UI Components:**
- "Download a copy" dialog
- Format selection (XLSX, CSV, ODS, PDF, JSON)
- Filename input
- Download scope (active sheet / entire workbook / selection)

**Implementation Effort:** 2-3 days  
**Priority:** High (essential export workflow)

---

## 5. EXPORT 🟢 BACKEND COMPLETE (Backend: 95% | UI: 0%)

**Backend Status:** ✅ 95% Complete  
**Implemented Formats:**
- ✅ CSV (`ExportPlugin.export('csv')`)
- ✅ JSON (`ExportPlugin.export('json')`)
- ✅ PNG (`ExportPlugin.export('png')`)
- ✅ PDF (`AdvancedExportEngine.exportPDF()`)

**Missing:**
- ❌ ODS (OpenDocument Spreadsheet) - 0%

**Evidence:**
```typescript
// From packages/renderer-canvas/src/ExportPlugin.ts
export type ExportFormat = 'csv' | 'json' | 'png';

// From packages/renderer-canvas/src/AdvancedExportEngine.ts
async exportPDF(options: PDFExportOptions = {}): Promise<Blob> {
  // PDF export implementation
}
```

**UI Status:** 🔴 Missing  
**Required UI Components:**
- Export submenu:
  - Download as PDF (with print options preview)
  - Download as CSV
  - Download as ODS

**Implementation Effort:** 
- CSV/PDF UI: 1-2 days
- ODS backend + UI: 4-5 days

**Priority:** High (critical for interoperability)

---

## 6. PRINT ⚠️ BACKEND PARTIAL (Backend: 60% | UI: 0%)

**Backend Status:** 🟡 60% Complete  
**Location:** `packages/renderer-canvas/src/AdvancedExportEngine.ts`  
**Implemented:**
- ✅ Print layout options interface
- ✅ Page setup (orientation, margins, scaling)
- ✅ PDF generation (print-ready)

**Evidence:**
```typescript
interface PrintOptions {
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'A4' | 'Letter' | 'Legal';
  fitToPage?: boolean;
  margins?: { top: number; right: number; bottom: number; left: number };
  showGridlines?: boolean;
  showHeaders?: boolean;
  centerHorizontally?: boolean;
  centerVertically?: boolean;
}
```

**Missing:**
- ❌ Print preview rendering
- ❌ Printer selection API
- ❌ Page break indicators
- ❌ Header/footer customization

**UI Status:** 🔴 Missing  
**Required UI Components:**
- Print dialog with sections:
  - Printer selection dropdown
  - Print scope (Active sheet / Entire workbook / Current selection)
  - Page size dropdown
  - Orientation toggle (Portrait / Landscape)
  - Margins presets (Normal / Wide / Narrow)
  - Scaling options (Fit to 1 page wide by X tall)
  - Format options checkboxes:
    - Gridlines
    - Row and column headings
    - Black and white
  - Center on page (Horizontal / Vertical)
  - Page range input
- Print preview panel

**Implementation Effort:** 5-7 days  
**Priority:** Medium (power user feature)

---

## 7. RENAME 🔴 MISSING (Backend: Unknown | UI: 0%)

**Backend Status:** ❓ Unknown (No explicit rename workbook API found)  
**Likely Location:** `packages/core/src/Workbook.ts` (workbook metadata)

**Current Capability:**
- ✅ Worksheet rename: `worksheet.name = 'NewName'`
- ❌ Workbook rename: Not found in codebase

**UI Status:** 🔴 Missing  
**Required UI Components:**
- Rename dialog (simple text input)
- Validation (filename restrictions, length limits)

**Implementation Effort:** 1-2 days  
**Priority:** Low (nice-to-have)

---

## 8. VERSION HISTORY 🔴 MISSING (Backend: 0% | UI: 0%)

**Backend Status:** 🔴 Not Implemented  
**Required Infrastructure:**
- Version snapshots storage
- Diff calculation system
- Restore mechanism
- Version metadata (author, timestamp, changelog)

**UI Status:** 🔴 Missing  
**Required UI Components:**
- Version history sidebar
- Version list with timestamps
- Preview pane showing changes
- Restore button
- Version comparison view

**Implementation Effort:** 10-15 weeks (complex feature)  
**Priority:** Low (enterprise collaboration feature)  
**Blocker:** Requires backend storage and versioning system

---

## 9. OPTIONS 🔴 MISSING (Backend: 0% | UI: 0%)

**Backend Status:** 🔴 Not Implemented  
**Required Infrastructure:**
- Settings persistence (localStorage/backend)
- Regional settings system (locale, timezone, currency)
- Auto-fit text engine
- Reset changes pan mechanism

**UI Status:** 🔴 Missing  
**Required UI Components:**
- Options dialog with tabs:
  - Regional settings (locale, number format, date format, currency)
  - Reset changes pan
  - Auto-fit text toggle

**Implementation Effort:** 5-7 days  
**Priority:** Medium (localization critical for international users)

---

# HOME MENU AUDIT (32 Items)

## SECTION 1: UNDO/REDO

### 1. Undo & Redo ✅ READY (Backend: 100% | UI: 95%)

**Backend Status:** ✅ Complete  
**Location:** `README.md` line 577: `UndoManager → Efficient undo/redo with checkpoints`  
**Evidence:**
```markdown
~40 shortcuts implemented (Navigation 100%, Selection 100%, Basic Editing 60%, Undo/Redo 100%)
```

**Features:**
- ✅ Undo manager with checkpoints
- ✅ Redo functionality
- ✅ Reference counting correct under 1000 undo/redo cycles
- ✅ Full undo/redo integrity with events (`freeze-panes-changed`, `sheet-protection-changed`)

**UI Status:** ⚠️ 95% Complete (keyboard shortcuts implemented)  
**Missing UI:**
- ❌ Undo/Redo buttons in toolbar (visual feedback)
- ❌ Undo/Redo dropdown showing history stack
- ❌ Tooltips showing last action

**Implementation Effort:** 1-2 days  
**Priority:** High (core UX improvement)

---

## SECTION 2: CLIPBOARD

### 2. Cut / Copy / Paste (Ctrl+X / Ctrl+C / Ctrl+V) ⚠️ BACKEND PARTIAL (Backend: 70% | UI: 60%)

**Backend Status:** 🟡 70% Complete  
**Evidence from codebase:**
```markdown
Remaining (5-8%): Shortcut surface completeness (70-80% coverage, need ~60 more shortcuts 
including Ctrl+C/X/V full wiring...)
```

**Implemented:**
- ✅ Clipboard snapshot mechanism (reused by InsertColumn/DeleteColumn)
- ✅ Copy logic (cell values, formulas, styles)
- ✅ Paste logic (PasteCommand internals)
- ✅ Cut logic (clearDependencies, setCellValue(null))

**Missing:**
- ❌ Keyboard shortcut wiring to commands (Ctrl+C/X/V not fully connected)
- ❌ System clipboard integration (navigator.clipboard API)
- ❌ Cross-workbook copy/paste

**UI Status:** 🔴 Missing  
**Required UI Components:**
- Cut / Copy / Paste buttons in toolbar
- Context menu (right-click) with Cut/Copy/Paste
- Visual feedback (dashed border around copied cells)
- Paste preview

**Implementation Effort:** 3-4 days  
**Priority:** Critical (fundamental editing operation)

---

### 3. Paste Special ⚠️ BACKEND PARTIAL (Backend: 50% | UI: 0%)

**Backend Status:** 🟡 50% Complete  
**Evidence:**
```typescript
// From packages/core/src/fillPatterns.ts
export type FillPattern = 'copy' | 'series' | 'fill-formatting-only' | 'fill-without-formatting';
```

**Implemented:**
- ✅ Fill pattern types defined
- ✅ Basic paste logic

**Missing:**
- ❌ Paste values only
- ❌ Paste formulas only
- ❌ Paste formatting only
- ❌ Link to source
- ❌ Keep source column widths
- ❌ Transpose rows and columns

**UI Status:** 🔴 Missing  
**Required UI Components:**
- Paste Special dialog with options:
  - Value only
  - Formulas only
  - Formatting only
  - Link to source
  - Keep source column widths
  - Transpose rows and columns

**Implementation Effort:** 4-5 days  
**Priority:** High (power user feature)

---

## SECTION 3: FORMAT PAINTER

### 4. Format Painter 🔴 MISSING (Backend: 0% | UI: 0%)

**Backend Status:** 🔴 Not Implemented  
**Required Logic:**
- Copy style from source cell/range
- Apply style to target cell/range
- `copyFormat` / `applyFormat` methods

**UI Status:** 🔴 Missing  
**Required UI Components:**
- Format Painter button (single-click / double-click for sticky mode)
- Cursor change (paintbrush icon)
- Visual feedback (source cell highlighted)

**Implementation Effort:** 3-4 days  
**Priority:** Medium (formatting efficiency)

---

## SECTION 4: FONT FORMATTING

### 5. Font Name & Font Size 🟢 BACKEND COMPLETE (Backend: 100% | UI: 0%)

**Backend Status:** ✅ Complete  
**Evidence:**
```markdown
| **Fonts & Cell Styles** | **✅ FEATURE COMPLETE** | **100%** ✅ |
Complete Implementation: Font family/size, bold/italic/underline/strikethrough...
```

**Location:** `packages/core/src/types.ts` (CellStyle interface)

**UI Status:** 🔴 Missing  
**Required UI Components:**
- Font name dropdown (searchable, with font preview)
- Font size dropdown (with common sizes: 8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72)
- Font size input (custom value)

**Implementation Effort:** 2-3 days  
**Priority:** High (essential formatting)

---

### 6. Grow Font / Shrink Font 🟢 BACKEND COMPLETE (Backend: 100% | UI: 0%)

**Backend Status:** ✅ Complete (font size already supported)  
**Logic Required:**
- Increment/decrement font size by standard steps

**UI Status:** 🔴 Missing  
**Required UI Components:**
- Grow Font button (A ↑)
- Shrink Font button (A ↓)

**Implementation Effort:** 1 day  
**Priority:** Medium

---

### 7-11. Bold / Italic / Underline / Strikethrough / Double Underline 🟢 BACKEND COMPLETE (Backend: 100% | UI: 0%)

**Backend Status:** ✅ Complete  
**Evidence:**
```typescript
interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  // ... (from ARCHITECTURE.md line 220-221)
}
```

**UI Status:** 🔴 Missing  
**Required UI Components:**
- Bold button (B icon, Ctrl+B shortcut)
- Italic button (I icon, Ctrl+I shortcut)
- Underline button (U icon, Ctrl+U shortcut)
- Strikethrough button (S̶ icon)
- Double Underline dropdown option

**Implementation Effort:** 2-3 days (all 5 buttons)  
**Priority:** High (core formatting)

---

## SECTION 5: CELL STYLING

### 12. Borders 🟢 BACKEND COMPLETE (Backend: 100% | UI: 0%)

**Backend Status:** ✅ Complete (13 Excel border styles)  
**Evidence:**
```markdown
borders (13 Excel styles: thin/medium/thick/hairline/dotted/dashed/dashDot/dashDotDot/
double/mediumDashed/mediumDashDot/mediumDashDotDot/slantDashDot)
```

**UI Status:** 🔴 Missing  
**Required UI Components:**
- Borders dropdown menu:
  - Bottom Border
  - Top Border
  - Left Border
  - Right Border
  - No Border
  - All Borders
  - Outside Borders
  - Thick Box Border
  - Bottom Double Border
  - Thick Bottom Border
  - Top and Bottom Border
  - Top and Thick Bottom Border
  - Top and Double Bottom Border
  - Border Color picker
  - Line Style picker (13 styles)
  - Draw Border tool
  - Draw Border Grid tool
  - Erase Border tool

**Implementation Effort:** 4-5 days  
**Priority:** High (visual design)

---

### 13. Fill Color 🟢 BACKEND COMPLETE (Backend: 100% | UI: 0%)

**Backend Status:** ✅ Complete (18 pattern fills + gradients)  
**Evidence:**
```markdown
fills (solid/pattern/gradient with 18 Excel patterns: solid/none/gray50/gray75/gray25/
gray125/gray0625/lightHorizontal/lightVertical/lightDown/lightUp/lightGrid/lightTrellis/
darkHorizontal/darkVertical/darkDown/darkUp/darkGrid/darkTrellis)
```

**UI Status:** 🔴 Missing  
**Required UI Components:**
- Fill Color dropdown:
  - Theme Colors palette
  - Standard Colors palette  
  - Recent Colors
  - No Fill option
  - More Colors... (color picker)
  - Pattern Fill... (18 patterns)
  - Gradient Fill... (2-color/3-color gradients)

**Implementation Effort:** 3-4 days  
**Priority:** High (visual design)

---

### 14. Font Color 🟢 BACKEND COMPLETE (Backend: 100% | UI: 0%)

**Backend Status:** ✅ Complete (Excel theme colors with tint/shade)  
**Evidence:**
```markdown
Excel theme colors with tint/shade, complete fontScheme (none/major/minor)
```

**UI Status:** 🔴 Missing  
**Required UI Components:**
- Font Color dropdown (same structure as Fill Color)
- Theme Colors / Standard Colors / Recent Colors
- Automatic color option
- More Colors... (color picker)

**Implementation Effort:** 2-3 days  
**Priority:** High

---

### 15. More Font Styles 🔴 MISSING (Backend: Partial | UI: 0%)

**Backend Status:** 🟡 Partial  
**Implemented:**
- ✅ Superscript/subscript

**Missing:**
- ❌ Small caps
- ❌ All caps
- ❌ Character spacing

**UI Status:** 🔴 Missing  
**Required UI Components:**
- Font dialog with tabs:
  - Font (family, size, style, effects)
  - Advanced (spacing, position, scale)

**Implementation Effort:** 3-4 days  
**Priority:** Low

---

## SECTION 6: ALIGNMENT

### 16. Alignment (Horizontal, Vertical, Indent) 🟢 BACKEND COMPLETE (Backend: 100% | UI: 0%)

**Backend Status:** ✅ Complete  
**Evidence:**
```markdown
alignment (H+V+wrap+rotation+RTL), vertical alignment (top/middle/bottom), 
RTL alignment (readingOrder: context/ltr/rtl), indent, justifyLastLine
```

**UI Status:** 🔴 Missing  
**Required UI Components:**
- Align Left button
- Align Center button
- Align Right button
- Justify button
- Top Align button
- Middle Align button
- Bottom Align button
- Increase Indent button
- Decrease Indent button
- Text Orientation dropdown
- Alignment dialog (advanced options)

**Implementation Effort:** 3-4 days  
**Priority:** High

---

### 17. Wrap Text 🟢 BACKEND COMPLETE (Backend: 100% | UI: 0%)

**Backend Status:** ✅ Complete  
**Evidence:**
```markdown
Wrap text ✅ **Complete (Earlier)**
```

**UI Status:** 🔴 Missing  
**Required UI Components:**
- Wrap Text button (toggle)

**Implementation Effort:** 1 day  
**Priority:** High

---

### 18. Merge Cells 🟢 BACKEND COMPLETE (Backend: 100% | UI: 0%)

**Backend Status:** ✅ Complete  
**Evidence:**
```typescript
// From ARCHITECTURE.md line 310-312
mergeCells(range: Range): void;
cancelMerge(range: Range): void;
getMergedRangeForCell(address: Address): Range | null;
```

**UI Status:** 🔴 Missing  
**Required UI Components:**
- Merge & Center button (dropdown):
  - Merge & Center
  - Merge Across
  - Merge Cells
  - Unmerge Cells

**Implementation Effort:** 2-3 days  
**Priority:** High

---

## SECTION 7: NUMBER FORMATTING

### 19. Number Format 🟢 BACKEND COMPLETE (Backend: 100% | UI: 0%)

**Backend Status:** ✅ Complete (Excel Number Format Grammar Engine)  
**Evidence:**
```markdown
number formats (complete Excel grammar engine), Excel Number Format Grammar 
(4-section formats, conditional sections [>100][Red], color tags, thousands/millions 
scaling, fractions, scientific notation, elapsed time, text placeholders, date/time patterns)
```

**Features:**
- ✅ 4-section format support (positive;negative;zero;text)
- ✅ Conditional sections with operators
- ✅ Color tags ([Red]/[Blue]/[Color1-56])
- ✅ Thousands/millions scaling
- ✅ Fractions
- ✅ Scientific notation
- ✅ Elapsed time
- ✅ Date/time formatting
- ✅ LRU cache (1000 entries, <1ms compilation, <0.1µs execution)

**UI Status:** 🔴 Missing  
**Required UI Components:**
- Number Format dropdown:
  - General
  - Number
  - Currency
  - Accounting
  - Short Date
  - Long Date
  - Time
  - Percentage
  - Fraction
  - Scientific
  - Text
  - More Number Formats... (dialog)
- Custom format input

**Implementation Effort:** 3-4 days  
**Priority:** High

---

### 20. Accounting Format 🟡 BACKEND PARTIAL (Backend: 80% | UI: 0%)

**Backend Status:** 🟡 80% Complete (number format engine supports accounting patterns)  
**Missing:**
- ❌ Accounting-specific alignment (currency symbol alignment)

**UI Status:** 🔴 Missing  
**Required UI Components:**
- Accounting format dropdown (currency selection)

**Implementation Effort:** 2 days  
**Priority:** Medium

---

### 21-22. Increase/Decrease Decimal 🟢 BACKEND COMPLETE (Backend: 100% | UI: 0%)

**Backend Status:** ✅ Complete (decimal places in number format)  
**UI Status:** 🔴 Missing  
**Required UI Components:**
- Increase Decimal button (.0 → .00)
- Decrease Decimal button (.00 → .0)

**Implementation Effort:** 1 day  
**Priority:** Medium

---

## SECTION 8: CONDITIONAL FORMATTING

### 23. Conditional Formatting ✅ READY (Backend: 100% | UI: 100%)

**Backend Status:** ✅ Complete  
**UI Status:** ✅ Complete  
**Evidence:**
```markdown
| **Conditional Formatting** | **🎉 100% COMPLETE** | **100%** ✅ |
Wave 6 UI (Feb 10) ✅ COMPLETE: RuleBuilder UI (892 lines, all 11 rule types), 
RuleManager with drag/drop/enable/disable/delete, Inspector with hover tooltips, 
PresetPicker with 15+ presets...
```

**Features:**
- ✅ 12 rule types (Formula, Top/Bottom N/%, Above/Below Average, Duplicate/Unique, Date, Text Contains, Errors/Blanks, Icon Sets, Color Scales, Data Bars)
- ✅ RuleBuilder UI (all frameworks: React/Vue/Angular/Svelte/Vanilla)
- ✅ RuleManager (drag/drop, enable/disable)
- ✅ Inspector (hover tooltips)
- ✅ PresetPicker (15+ presets)
- ✅ 434+ tests passing (100% success rate)
- ✅ WCAG 2.1 AA compliant

**Implementation Status:** 🎉 **PRODUCTION READY**  
**No Action Required**

---

## SECTION 9: STYLES & TABLES

### 24. Cell Styles 🟢 BACKEND COMPLETE (Backend: 100% | UI: 0%)

**Backend Status:** ✅ Complete  
**Evidence:**
```typescript
// From ARCHITECTURE.md
- **Cell Style Cache** - Deduplicate identical styles
// Workbook-level immutable style interning with reference counting
```

**UI Status:** 🔴 Missing  
**Required UI Components:**
- Cell Styles gallery:
  - Normal
  - Bad
  - Good
  - Neutral
  - Calculation
  - Check Cell
  - Explanatory Text
  - Input
  - Linked Cell
  - Note
  - Output
  - Warning Text
  - Heading 1/2/3/4
  - Title
  - Total
  - New Cell Style... (custom)

**Implementation Effort:** 3-4 days  
**Priority:** Medium

---

### 25. Format as Table 🔴 MISSING (Backend: 0% | UI: 0%)

**Backend Status:** 🔴 Not Implemented  
**Required Infrastructure:**
- Table object model (structured references, table formulas)
- Table styles system (21 built-in styles)
- Auto-filter integration
- Total row formulas (SUBTOTAL)

**UI Status:** 🔴 Missing  
**Required UI Components:**
- Format as Table gallery (21 table styles)
- Table Design tab (appears when table selected)
- Convert to Range option

**Implementation Effort:** 8-10 weeks (complex feature)  
**Priority:** Medium (productivity feature)

---

## SECTION 10: CELLS OPERATIONS

### 26-27. Insert / Delete Rows & Columns ✅ READY (Backend: 100% | UI: 60%)

**Backend Status:** ✅ Complete (transformation engine with 11 invariants)  
**Evidence:**
```markdown
Transformation engine (Insert/Delete/Paste with 11 invariants), 
GraphTransformationValidator with fail-fast validation...
```

**Methods Available:**
```typescript
insertColumn(k: number): void;
deleteColumn(k: number): void;
insertRow(k: number): void;
deleteRow(k: number): void;
```

**UI Status:** ⚠️ 60% Complete  
**Implemented:**
- ✅ Programmatic API

**Missing:**
- ❌ Toolbar buttons (Insert / Delete)
- ❌ Context menu (right-click)
- ❌ Insert dialog (multiple rows/columns)
- ❌ Keyboard shortcuts (Ctrl+Shift++ for insert, Ctrl+- for delete)

**Implementation Effort:** 2-3 days  
**Priority:** High (core editing)

---

### 28. Format (Row Height, Column Width, Hide/Unhide) 🟡 BACKEND PARTIAL (Backend: 70% | UI: 0%)

**Backend Status:** 🟡 70% Complete  
**Implemented:**
- ✅ Column width management (`VirtualizationManager.ts`)
- ✅ Row height management
- ✅ Auto-resize logic

**Missing:**
- ❌ Hide/unhide rows/columns
- ❌ Row height dialog
- ❌ Column width dialog
- ❌ Default width/height

**UI Status:** 🔴 Missing  
**Required UI Components:**
- Format dropdown:
  - Row Height...
  - AutoFit Row Height
  - Column Width...
  - AutoFit Column Width
  - Default Width...
  - Hide Rows
  - Hide Columns
  - Unhide Rows
  - Unhide Columns

**Implementation Effort:** 3-4 days  
**Priority:** Medium

---

## SECTION 11: FORMULAS

### 29. AutoSum ✅ READY (Backend: 100% | UI: 0%)

**Backend Status:** ✅ Complete  
**Evidence:**
```markdown
Core Functions: Math (SUM, AVERAGE, ROUND, SUMIF, SUMIFS, COUNTIF, COUNTIFS)...
```

**UI Status:** 🔴 Missing  
**Required UI Components:**
- AutoSum button (Σ icon, dropdown):
  - Sum
  - Average
  - Count Numbers
  - Max
  - Min
  - More Functions...

**Implementation Effort:** 2 days  
**Priority:** High (essential feature)

---

## SECTION 12: EDITING

### 30. Clear 🟢 BACKEND COMPLETE (Backend: 100% | UI: 0%)

**Backend Status:** ✅ Complete  
**Evidence:**
```typescript
// From transformation engine
clearDependencies/setCellValue(null)/setCellFormula('') // Already implemented
```

**UI Status:** 🔴 Missing  
**Required UI Components:**
- Clear dropdown:
  - Clear All
  - Clear Formats
  - Clear Contents
  - Clear Comments
  - Clear Hyperlinks

**Implementation Effort:** 2 days  
**Priority:** Medium

---

## SECTION 13: SORT & FILTER

### 31. Sort & Filter ⚠️ BACKEND PARTIAL (Backend: 75% | UI: 20%)

**Backend Status:** 🟡 75% Complete  
**Evidence:**
```markdown
| Advanced Filters/Sorting | 75-85% | N/A | ✅ Production Ready |
```

**Implemented:**
- ✅ SORT function (formula-based sorting)
- ✅ SORTBY function
- ✅ FILTER function
- ✅ UNIQUE function

**Missing:**
- ❌ Sort dialog (multi-level sort)
- ❌ Custom sort UI
- ❌ AutoFilter (dropdown arrows in headers)
- ❌ Advanced Filter dialog

**UI Status:** ⚠️ 20% Complete  
**Required UI Components:**
- Sort & Filter button (dropdown):
  - Sort A to Z
  - Sort Z to A
  - Custom Sort... (multi-level dialog)
  - Filter (toggle AutoFilter)
  - Clear (remove filters)
  - Reapply (refresh filters)
  - Advanced... (advanced filter dialog)

**Implementation Effort:** 5-7 days  
**Priority:** High (data analysis)

---

## SECTION 14: FIND & SELECT

### 32. Find & Select ✅ READY (Backend: 100% | UI: 100%)

**Backend Status:** ✅ Complete  
**UI Status:** ✅ Complete  
**Evidence:**
```markdown
| **General Search (Find & Replace, Go To)** | **🎉 COMPLETE** | **100%** ✅ |
Phases 17–19 (Feb 2026): Full-sheet `findAll` + atomic `replaceAll`, 
`findSpecial` with 14 Go-To-Special types, `searchFormat` + data-validation search. 
SDK: 471/471 tests passing
```

**Features:**
- ✅ Find (full-sheet search)
- ✅ Replace (atomic replaceAll)
- ✅ Go To Special (14 types: formulas/errors/blanks/constants/comments/merges/data-validation)
- ✅ Format search
- ✅ SearchCursor navigator

**Implementation Status:** 🎉 **PRODUCTION READY**  
**No Action Required**

---

# 📊 IMPLEMENTATION SUMMARY

## File Menu Maturity

| Item | Backend | UI | Status | Effort | Priority |
|------|---------|----|----- --|--------|----------|
| 1. New | 100% | 0% | 🟢 Backend Ready | 2-3 days | High |
| 2. Open | 100% | 0% | 🟢 Backend Ready | 3-4 days | High |
| 3. Share | 0% | 0% | 🔴 Missing | 8-12 weeks | Medium |
| 4. Create a Copy | 100% | 0% | 🟢 Backend Ready | 2-3 days | High |
| 5. Export | 95% | 0% | 🟢 Backend Ready | 3-4 days | High |
| 6. Print | 60% | 0% | 🟡 Partial | 5-7 days | Medium |
| 7. Rename | ❓ | 0% | 🔴 Unknown | 1-2 days | Low |
| 8. Version History | 0% | 0% | 🔴 Missing | 10-15 weeks | Low |
| 9. Options | 0% | 0% | 🔴 Missing | 5-7 days | Medium |

**File Menu Overall:** Backend 61% | UI 0% | **13 business days UI work (excluding Share/Version History)**

---

## Home Menu Maturity

| Section | Items | Backend Complete | UI Complete | Effort | Priority |
|---------|-------|------------------|-------------|--------|----------|
| **Undo/Redo** | 1 | ✅ 100% | ⚠️ 95% | 1-2 days | High |
| **Clipboard** | 2 | 🟡 60% | 🔴 0% | 7-9 days | Critical |
| **Format Painter** | 1 | 🔴 0% | 🔴 0% | 3-4 days | Medium |
| **Font Formatting** | 7 | ✅ 100% | 🔴 0% | 5-7 days | High |
| **Cell Styling** | 4 | ✅ 100% | 🔴 0% | 12-16 days | High |
| **Alignment** | 3 | ✅ 100% | 🔴 0% | 4-5 days | High |
| **Number Formatting** | 4 | ✅ 95% | 🔴 0% | 6-7 days | High |
| **Conditional Formatting** | 1 | ✅ 100% | ✅ 100% | ✅ Done | High |
| **Styles & Tables** | 2 | 🟡 50% | 🔴 0% | 11-14 days | Medium |
| **Cell Operations** | 3 | ✅ 90% | ⚠️ 30% | 5-7 days | High |
| **Formulas** | 1 | ✅ 100% | 🔴 0% | 2 days | High |
| **Editing** | 1 | ✅ 100% | 🔴 0% | 2 days | Medium |
| **Sort & Filter** | 1 | 🟡 75% | ⚠️ 20% | 5-7 days | High |
| **Find & Select** | 1 | ✅ 100% | ✅ 100% | ✅ Done | High |

**Home Menu Overall:** Backend 84% | UI 15% | **64-79 business days UI work**

---

# 🎯 IMPLEMENTATION PHASES

## Phase 1: Critical UI (4-5 weeks) ⚡ HIGHEST PRIORITY

**Goal:** Enable basic Excel-like editing workflow

**Strategy:** Start with **complete backend** features first to avoid rework. Build proper component abstractions from day 1.

### Week 1: Foundation + Undo/Redo + Font Formatting (RECOMMENDED START)
- ✅ Ribbon infrastructure (RibbonButton, RibbonGroup abstractions) (1 day)
- ✅ Undo/Redo buttons (1 day)
- ✅ Font name/size dropdowns (1 day)
- ✅ Bold/Italic/Underline buttons (1 day)
- ✅ Font color picker (1 day)

**Why this order?**
- ✅ Backend 100% complete (zero risk)
- ✅ High visual impact (looks like Excel immediately)
- ✅ Establishes component patterns for rest of Ribbon
- ❌ Skip Clipboard initially (backend only 70% complete, risks rework)

### Week 2-3: File Operations
- ✅ New workbook dialog (2-3 days)
- ✅ Open file dialog (3-4 days)
- ✅ Download/Export menu (2-3 days)

### Week 4-5: Clipboard + Cell Operations
- ✅ Complete Clipboard backend (2-3 days)
- ✅ Cut/Copy/Paste buttons + context menu (2-3 days)
- ✅ Insert/Delete rows/columns buttons (2-3 days)
- ✅ AutoSum button (1 day)

**Deliverable:** Users see Excel-like Ribbon, can format text, create/open/export workbooks, edit structure

---

## Phase 2: Formatting UI (5-6 weeks) 🎨 HIGH PRIORITY

**Goal:** Complete Excel-like visual formatting capabilities

### Week 1-2: Font Formatting
- ✅ Font name/size dropdowns (2-3 days)
- ✅ Bold/Italic/Underline/Strikethrough buttons (2-3 days)
- ✅ Font color picker (2-3 days)

### Week 3-4: Cell Styling
- ✅ Fill color picker (3-4 days)
- ✅ Borders menu (4-5 days)

### Week 5-6: Alignment & Number Formatting
- ✅ Alignment buttons (3-4 days)
- ✅ Wrap text / Merge cells (2-3 days)
- ✅ Number format dropdown (3-4 days)

**Deliverable:** Full visual formatting control matching Excel

---

## Phase 3: Advanced Features (6-8 weeks) 📈 MEDIUM PRIORITY

**Goal:** Power user productivity features

### Week 1-3: Data Operations
- ✅ Sort & Filter UI (5-7 days)
- ✅ Format Painter (3-4 days)
- ✅ Cell Styles gallery (3-4 days)

### Week 4-6: Cell Management
- ✅ Format menu (row height, column width) (3-4 days)
- ✅ Clear dropdown (2 days)
- ✅ Print dialog (5-7 days)

### Week 7-8: Polish
- ✅ Workbook options dialog (5-7 days)
- ✅ Rename dialog (1-2 days)

**Deliverable:** Complete Excel 365 Home tab parity (excluding Format as Table)

---

## Phase 4: Collaboration Features (10-15 weeks) 🌐 LOW PRIORITY (Backend-Dependent)

**Goal:** Multi-user collaboration capabilities

### Blocked by Backend:
- 🔴 Share workbook (link generation, permissions)
- 🔴 Version History (snapshot storage, diff engine)
- 🔴 Real-time collaboration (WebSocket/WebRTC, CRDT/OT)

**Note:** These features require backend infrastructure. Frontend can implement mock UI for design validation.

---

## Phase 5: Table Features (8-10 weeks) 📊 MEDIUM-LOW PRIORITY

**Goal:** Structured data with Excel Tables

- 🔴 Format as Table (backend: table object model + UI: 21 styles)
- 🔴 Table Design tab (header row, total row, banded rows/columns)
- 🔴 Structured references (@ThisRow, [Column])

---

# 🚀 QUICK WIN OPPORTUNITIES (Smart Order)

These features have **100% backend support** and **high user visibility**:

## ✅ RECOMMENDED START (Week 1)

**Home Tab → Undo/Redo + Font Formatting** (5 days)
- ✅ Backend: 100% complete (zero risk)
- ✅ Visual Impact: High (looks like Excel immediately)
- ✅ Establishes component patterns for entire Ribbon

Breakdown:
1. **Ribbon Infrastructure** (1 day) - RibbonButton, RibbonGroup, RibbonTab abstractions
2. **Undo/Redo Buttons** (1 day) - Connect to CommandManager
3. **Font Name/Size Dropdowns** (1 day) - Searchable dropdowns with font preview
4. **Bold/Italic/Underline** (1 day) - Toggle buttons with active states
5. **Font Color Picker** (1 day) - Theme colors + standard colors + recent colors

## Week 2-3: File Operations

6. **File → New/Open/Export** (7-9 days) - Basic file operations

## Week 4-5: Cell Operations

7. **AutoSum Button** (2 days) - Most-used formula shortcut
8. **Insert/Delete Row/Column Buttons** (2-3 days) - Structural editing
9. **Merge Cells Button** (2 days) - Layout control

## ⚠️ DEFER (Backend Not Ready)

- ❌ **Cut/Copy/Paste** - Backend only 70%, high rework risk
- Wait until Clipboard backend reaches 95%+

**Total Quick Wins Effort:** 16-23 days (3-4 weeks)  
**Impact:** 60% increase in perceived completeness  
**Risk:** Minimized (start with 100% complete backends only)

---

# 🏗️ TECHNICAL ARCHITECTURE RECOMMENDATIONS

## 1. Ribbon Menu Component (React/Vue/Angular/Svelte)

**Design Specification:** Replicate Microsoft Excel 365 Online UI exactly
- Match Excel's visual design, spacing, colors, typography
- Use Excel as reference for all icon designs
- Copy exact tooltip text and keyboard shortcuts
- Replicate dropdown menus, galleries, and split buttons

**⚠️ CRITICAL: Component Abstraction Required**

Direct pixel replication WITHOUT abstraction = maintenance chaos. Build reusable components from day 1.

**DevTools Extraction Strategy (from Excel 365 Online):**

1. **Open Excel in Chrome/Edge**, press F12
2. **Inspect Ribbon elements**, extract:
   - Padding/margin values (usually 4px, 8px multiples)
   - Gap between buttons (4px)
   - Icon size (16px for small, 20px for large buttons)
   - Border radius (~2px)
   - Hover color (#edebe9)
   - Active color (#e1dfdd)
   - Font family ("Segoe UI", "Segoe UI Web", sans-serif)
   - Font size (11px for labels, 12px for dropdowns)

3. **Icons: Use Fluent UI System**
   - ✅ `@fluentui/react-icons` (official Microsoft icons)
   - ✅ Extract SVG from Excel if not available
   - ❌ DO NOT use FontAwesome (wrong visual style)
   - ❌ DO NOT use random icon libraries

**Pixel-Perfect Definition:**
- ❌ Wrong: "Looks similar"
- ✅ Right: Exact spacing, hover states, active states, disabled states, focus indicators

**Structure:**
```typescript
interface RibbonTab {
  id: string;
  label: string;
  groups: RibbonGroup[];
}

interface RibbonGroup {
  id: string;
  label: string;
  items: RibbonItem[];
}

interface RibbonItem {
  type: 'button' | 'dropdown' | 'split-button' | 'gallery';
  icon?: string;
  label: string;
  tooltip?: string;
  shortcut?: string;
  action: () => void;
  disabled?: boolean | (() => boolean);
}
```

**Implementation:**
- Reuse existing `packages/cf-ui-core` architecture pattern
- Create `packages/ribbon-ui-core` (framework-agnostic core)
- Create adapters: `packages/react/RibbonMenu.tsx`, `packages/vue/RibbonMenu.vue`, etc.
- Extract colors, spacing, fonts from Excel 365 Online (browser DevTools)
- Use `@fluentui/react-icons` for icons (matches Excel's Fluent Design System)

**Component Abstractions (avoid Ribbon chaos):**

```typescript
// Basic building blocks
<RibbonButton 
  icon="bold" 
  tooltip="Bold (Ctrl+B)" 
  active={isBold} 
  onClick={handleBold}
/>

<RibbonGroup title="Font">
  <FontFamilyDropdown />
  <FontSizeDropdown />
  <BoldButton />
  <ItalicButton />
  <UnderlineButton />
</RibbonGroup>

<RibbonTab id="home" label="Home">
  <RibbonGroup title="Undo">...</RibbonGroup>
  <RibbonGroup title="Clipboard">...</RibbonGroup>
  <RibbonGroup title="Font">...</RibbonGroup>
</RibbonTab>
```

**CSS Architecture (match Excel exactly):**

```css
.ribbon {
  height: 96px;
  background: #f3f2f1;
  border-bottom: 1px solid #edebe9;
  font-family: "Segoe UI", "Segoe UI Web", sans-serif;
  font-size: 11px;
}

.ribbon-group {
  display: inline-flex;
  flex-direction: column;
  padding: 4px 8px;
  gap: 4px;
  border-right: 1px solid #e1dfdd;
}

.ribbon-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 2px;
  background: transparent;
  color: #201f1e;
  cursor: pointer;
}

.ribbon-btn:hover {
  background: #edebe9;
  border-color: #edebe9;
}

.ribbon-btn:active,
.ribbon-btn.active {
  background: #e1dfdd;
  border-color: #d2d0ce;
}

.ribbon-btn:disabled {
  color: #a19f9d;
  cursor: not-allowed;
}
```

---

## 2. Command Pattern Integration

**All UI actions must go through command layer:**

```typescript
// ❌ BAD: Direct mutation
worksheet.setCellStyle(address, { bold: true });

// ✅ GOOD: Command pattern
commandManager.execute(new SetStyleCommand(worksheet, address, { bold: true }));
```

**Why:** Enables undo/redo, command history, macro recording

---

## 3. State Management

**Recommendation:** Use existing event-driven architecture

```typescript
// Listen to backend state changes
worksheet.events.on('cell-changed', (event) => {
  // Update UI
});

// UI triggers commands
onButtonClick(() => {
  commandManager.execute(new BoldCommand(selection));
});
```

---

## 4. Accessibility (WCAG 2.1 AA)

**Requirements (already achieved in Conditional Formatting UI):**
- ✅ Keyboard navigation (Tab/Arrow/Enter/Escape)
- ✅ ARIA labels and roles
- ✅ Screen reader support
- ✅ Focus management
- ✅ Color contrast 4.5:1+
- ✅ Live regions for dynamic content

**Apply same standards to Ribbon UI**

---

# 📈 RESOURCE ALLOCATION

## Scenario 1: Single Developer (Full-Time)

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 1 (Critical UI) | 4-5 weeks | Basic editing workflow |
| Phase 2 (Formatting UI) | 5-6 weeks | Complete formatting |
| Phase 3 (Advanced Features) | 6-8 weeks | Power user features |
| **Total** | **15-19 weeks** | **Excel Home tab parity** |

---

## Scenario 2: Small Team (2-3 Developers)

| Phase | Duration | Parallel Tracks |
|-------|----------|-----------------|
| Phase 1 | 2-3 weeks | Track A: File ops (1 dev) + Track B: Clipboard (1 dev) + Track C: Cell ops (1 dev) |
| Phase 2 | 3-4 weeks | Track A: Fonts (1 dev) + Track B: Cell styling (1 dev) + Track C: Number formats (1 dev) |
| Phase 3 | 4-5 weeks | Track A: Sort/Filter (1 dev) + Track B: Format Painter + Styles (1 dev) + Track C: Print + Options (1 dev) |
| **Total** | **9-12 weeks** | **Excel Home tab parity** |

---

## Scenario 3: Rapid MVP (Single Developer, 6 Weeks)

**Focus:** High-impact, low-effort features only

| Week | Features |
|------|----------|
| Week 1 | New/Open/Export dialogs, Undo/Redo buttons |
| Week 2 | Copy/Paste buttons + context menu |
| Week 3 | Font name/size, Bold/Italic/Underline |
| Week 4 | Font color, Fill color, Borders (simplified) |
| Week 5 | Alignment, Wrap, Merge, Number format dropdown |
| Week 6 | Insert/Delete buttons, AutoSum, Polish |

**Deliverable:** 70% Excel UI parity (defer Print, Options, Format Painter, Sort/Filter, Cell Styles, Format as Table)

---

# 🔍 TESTING STRATEGY

## UI Component Testing

**Requirements:**
- Unit tests for each component (Jest + React Testing Library / Vue Test Utils)
- Visual regression tests (Percy / Chromatic)
- Accessibility tests (axe-core, pa11y)
- Cross-browser tests (Playwright / Cypress)

**Example Test:**
```typescript
describe('BoldButton', () => {
  it('should apply bold style when clicked', () => {
    const { getByRole } = render(<BoldButton selection={selection} />);
    const button = getByRole('button', { name: /bold/i });
    
    fireEvent.click(button);
    
    expect(commandManager.execute).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'set-style', style: { bold: true } })
    );
  });

  it('should show active state when selection is bold', () => {
    selection.getStyle = () => ({ bold: true });
    const { getByRole } = render(<BoldButton selection={selection} />);
    
    expect(getByRole('button')).toHaveClass('active');
  });

  it('should be keyboard accessible', () => {
    const { getByRole } = render(<BoldButton />);
    const button = getByRole('button');
    
    button.focus();
    fireEvent.keyDown(button, { key: 'Enter' });
    
    expect(commandManager.execute).toHaveBeenCalled();
  });
});
```

---

# 📊 SUCCESS METRICS

## MVP Success Criteria (Phase 1-2 Complete)

- ✅ User can create/open/edit/export workbooks
- ✅ All basic formatting operations available (font, color, alignment, borders)
- ✅ Undo/Redo working with visual feedback
- ✅ Keyboard shortcuts fully wired
- ✅ 90% of Excel Home tab features accessible

## Full Parity Success Criteria (Phase 1-3 Complete)

- ✅ 100% Excel Home tab feature parity (excluding Format as Table)
- ✅ File menu complete (excluding Share/Version History)
- ✅ All UI components accessible (WCAG 2.1 AA)
- ✅ 95%+ test coverage for UI components
- ✅ Cross-browser compatibility (Chrome, Firefox, Safari, Edge)

---

# 🎯 NEXT STEPS

1. **Prioritize Features** - Review roadmap, adjust priorities based on user needs
2. **Assign Phases** - Allocate developer resources to phases
3. **Setup Component Infrastructure** - Create packages/ribbon-ui-core following cf-ui-core pattern
4. **Reference Excel 365 Online** - Use Microsoft Excel Online as exact UI specification
5. **Start Phase 1** - Begin Critical UI implementation (New/Open/Copy/Paste/Undo)

**Implementation Approach:** Replicate Excel 365 Online UI exactly - no custom design needed. Use Excel as the living specification for all visual elements, layouts, icons, tooltips, and interactions.

---

# 📞 CONTACT & FEEDBACK

**Document Owner:** navidrezadoost  
**Last Updated:** April 25, 2026  
**Status:** Draft for Review

**Questions?** Open an issue or contact the maintainer.

---

**End of Document** ✅
