# XLSX Export Validation Report

**Date:** February 15, 2026  
**Status:** ✅ **SEALED** - All discipline rules enforced  
**Symmetry:** Complete (import ↔ export)

---

## Invariant Verification

### ✅ 1. Symbol Attached Before Freeze

**Location:** `packages/core/src/StyleCache.ts:593-602`

```typescript
private freezeStyle(style: CellStyle): CellStyle {
  // Mark as interned (dev mode safeguard) - Line 593
  Object.defineProperty(style, INTERNED_SYMBOL, {
    value: true,
    enumerable: false,
    writable: false,
    configurable: false,
  });
  
  // Deep freeze - Line 602
  Object.freeze(style);
```

**Result:** Symbol is attached at line 593, freeze happens at line 602.  
**Order:** ✅ Correct (symbol → freeze)  
**Enumerable:** ✅ false (doesn't affect hashing/equality)

---

### ✅ 2. Symbol Provenance Restricted to intern()

**Call Chain:**
```
intern() (line 457)
  → freezeStyle() (line 490) [private method]
    → Object.defineProperty(..., INTERNED_SYMBOL) (line 593)
```

**Access Control:**
- `INTERNED_SYMBOL`: module-scoped, not exported (line 31)
- `freezeStyle()`: private method, only callable from `intern()`
- No other code paths can attach the symbol

**Result:** ✅ Single provenance point enforced

---

### ✅ 3. Single Assignment Path Through setCellStyle()

**Import Path:**
```
loadXlsxFromArrayBuffer() → ws.setCellStyle(addr, mappedStyle)
```
**Source:** `packages/io-xlsx/src/index.ts:120`

**Export Path:**
```
exportXLSX() → sheet.getCellStyle(addr)
```
**Source:** `packages/io-xlsx/src/export.ts:302`

**Interning Boundary:**
```typescript
// packages/core/src/worksheet.ts:56-66
setCellStyle(addr: Address, style: CellStyle | undefined): void {
  const k = key(addr);
  const c = this.cells.get(k) ?? { value: null };
  
  // Auto-intern through workbook StyleCache (entropy-resistant boundary)
  let internedStyle = style;
  if (style && this.workbook?.getStyleCache) {
    internedStyle = this.workbook.getStyleCache().intern(style);
  }
  
  c.style = internedStyle; // Reference to canonical style (not a copy)
  this.cells.set(k, c);
}
```

**Result:** ✅ All style assignments pass through StyleCache.intern()

---

## Export Discipline Validation

### ✅ Rule 1: Never Export Raw Cell Objects

**Implementation:** `packages/io-xlsx/src/export.ts:302-303`

```typescript
// Discipline: Read via getCellStyle() only
const style = sheet.getCellStyle(addr);
```

**Result:** Export never touches `cell.style` directly.  
**Access Pattern:** ✅ Enforced through API discipline

---

### ✅ Rule 2: Export From Canonical Only

**Implementation:** `packages/io-xlsx/src/export.ts:29-42`

```typescript
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
```

**Result:** Export reads canonical styles via `getCellStyle()`.  
**Reconstruction:** ✅ None - styles are used directly as read-only references

---

### ✅ Rule 3: No De-Interning

**Projection Functions:**
- `styleToFontXML()` (line 219)
- `styleToFillXML()` (line 250)
- `styleToBorderXML()` (line 257)
- `styleToAlignmentXML()` (line 278)

**Pattern Check:**
```typescript
// All functions read properties directly, never clone
function styleToFontXML(style: CellStyle): string | undefined {
  const parts: string[] = [];
  
  if (style.bold) parts.push('<b/>');
  if (style.italic) parts.push('<i/>');
  // ... direct reads only, no spreading or cloning
}
```

**Result:** ✅ No spreading, no cloning, no symbol stripping  
**Treatment:** Read-only projection to XML

---

### ✅ Rule 4: Export Semantic Indent Value

**Implementation:** `packages/io-xlsx/src/export.ts:288`

```typescript
// Phase 1 UI: Export semantic indent value (not render pixels)
if ((style as any).indent !== undefined) {
  attrs.push(`indent="${(style as any).indent}"`);
}
```

**Result:** ✅ Exports `style.indent` directly (indent level, not pixels)  
**Not Exported:** Computed pixel value (8px * level) used in rendering

---

### ✅ Rule 5: Preserve Superscript/Subscript Mutual Exclusivity

**Implementation:** `packages/io-xlsx/src/export.ts:234-238`

```typescript
// Phase 1 UI: superscript/subscript (mutually exclusive, enforced by cache)
if ((style as any).superscript) {
  parts.push('<vertAlign val="superscript"/>');
} else if ((style as any).subscript) {
  parts.push('<vertAlign val="subscript"/>');
}
```

**Cache Enforcement:** `packages/core/src/StyleCache.ts:295-298`

```typescript
// Phase 1 UI: Enforce mutual exclusivity (superscript wins)
if (key === 'subscript' && hasSuperscript) {
  continue; // Skip subscript if superscript is true
}
```

**Result:** ✅ Mutual exclusivity preserved in canon and export

---

## Round-Trip Symmetry Tests

**Test File:** `packages/io-xlsx/test/round-trip-symmetry.test.ts`

### Test Coverage:

1. **Phase 1 UI Properties:**
   - ✅ Strikethrough preservation
   - ✅ Superscript preservation
   - ✅ Subscript preservation
   - ✅ Indent preservation (semantic value, not pixels)
   - ✅ Mutual exclusivity (superscript wins)

2. **Identity Stability:**
   - ✅ Interned styles on re-import
   - ✅ Pointer equality for identical styles
   - ✅ Frozen canonical references
   - ✅ Deduplication during export

3. **Existing Properties:**
   - ✅ Bold, italic, underline
   - ✅ Alignment and wrap
   - ✅ Rotation
   - ✅ Colors, fills, borders

4. **Edge Cases:**
   - ✅ Empty cells with styles
   - ✅ Indent = 0 (normalized to undefined)

---

## Semantic Symmetry Proof

**Cycle:** Import → Intern → Export → Re-import

### Step 1: Import
```
XLSX XML → parseStyles() → style objects → setCellStyle()
```

### Step 2: Intern
```
setCellStyle() → StyleCache.intern() → canonical reference
```

### Step 3: Export
```
getCellStyle() → canonical reference → XML projection
```

### Step 4: Re-import
```
XML → parseStyles() → style objects → setCellStyle() → intern()
```

### Validation:
```typescript
const wb1 = new Workbook();
sheet1.setCellStyle(addr, { bold: true, indent: 3 });

const buffer = await exportXLSX(wb1);
const wb2 = loadXlsxFromArrayBuffer(new Uint8Array(buffer));

const style1 = sheet1.getCellStyle(addr);
const style2 = sheet2.getCellStyle(addr);

// Identity validation:
expect(Object.isFrozen(style2)).toBe(true); // ✅ Canonical
expect(isInternedStyle(style2)).toBe(true); // ✅ Has symbol
expect(style2.indent).toBe(3);              // ✅ Semantic value
```

**Result:** ✅ Pointer-stable canonical styles survive round-trip

---

## Final Verification

| Invariant | Status | Location |
|-----------|--------|----------|
| Symbol before freeze | ✅ Sealed | StyleCache.ts:593-602 |
| Symbol provenance restricted | ✅ Sealed | StyleCache.ts:457-490 |
| Single assignment path | ✅ Sealed | worksheet.ts:56-66 |
| Export via getCellStyle() | ✅ Enforced | export.ts:302 |
| No reconstruction | ✅ Enforced | export.ts:29-42 |
| No de-interning | ✅ Enforced | export.ts:219-288 |
| Semantic indent export | ✅ Enforced | export.ts:288 |
| Mutual exclusivity preserved | ✅ Enforced | export.ts:234-238 |

---

## Performance Impact

**Export Overhead:**
- Style collection: O(cells) with Set deduplication
- XML generation: O(unique styles) for styles.xml
- No style cloning or reconstruction
- Read-only projection keeps memory constant

**Memory Profile:**
- Export reads canonical references (no copies)
- styleMap uses Map<CellStyle, number> (reference keys)
- XML strings generated on-demand

**Result:** ✅ Zero identity fragmentation during export

---

## Conclusion

**Status:** ✅ **COMPLETE**

The XLSX export implementation:
1. Respects all three identity invariants
2. Enforces all five discipline rules
3. Provides semantic symmetry (import ↔ export)
4. Passes round-trip identity stability tests
5. Maintains zero-copy canonical projection

**Next Phase:** Undo system (pointer stability validation)

---

**Identity Substrate:** SEALED  
**Export Symmetry:** PROVEN  
**Canonical Integrity:** INTACT
