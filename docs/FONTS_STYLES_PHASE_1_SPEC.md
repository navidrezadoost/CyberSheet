# Fonts & Cell Styles Phase 1 Implementation Spec

**Status:** Ready to Start  
**Target:** (D) Enterprise-Grade Formatting Engine  
**Timeline:** 1-2 weeks  
**Goal:** 80-85% → 92% (structural formatting completion)  
**Date:** February 14, 2026

---

## Executive Summary

Phase 1 delivers **low-risk, high-visibility** structural formatting features that close visible gaps without touching the cell value model or requiring compiler architecture. This phase establishes the foundation for enterprise-grade formatting while maintaining current architecture stability.

**Strategic Positioning:**
- Fast time-to-92% parity
- No breaking changes to existing code
- Incremental delivery (can ship per feature)
- Performance instrumentation from Day 1

---

## Success Criteria

✅ **Scope Locked (NO Scope Creep):**
1. Strikethrough
2. Superscript/Subscript
3. Vertical alignment (top/middle/bottom)
4. Wrap text
5. Text rotation (0-180°)
6. Indent level
7. Shrink-to-fit
8. Diagonal borders (up/down)

✅ **Performance:**
- Style lookup: O(1) immutable access
- Render overhead: <0.5ms per cell with new styles
- Memory: <100 bytes per styled cell

✅ **Testing:**
- 50+ unit tests (structural formatting edge cases)
- 20+ integration tests (render + export)
- 10+ performance benchmarks

✅ **Quality:**
- Zero technical debt
- Backward compatible
- Immutable style model
- TypeScript strict mode

---

## Architecture Requirements (Enterprise-Grade)

### 1. Immutable Style Model

**CRITICAL DECISION:** Styles are **immutable** and **cached**.

**Current (likely):**
```typescript
interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  fontFamily?: string;
  // ...
}
```

**Phase 1 Addition:**
```typescript
interface CellStyle {
  // Existing
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  fontFamily?: string;
  
  // NEW - Phase 1
  strikethrough?: boolean;
  verticalAlign?: 'top' | 'middle' | 'bottom';
  superscript?: boolean;  // mutually exclusive with subscript
  subscript?: boolean;
  wrapText?: boolean;
  rotation?: number;      // 0-180 degrees
  indent?: number;        // 0-15 (Excel limit)
  shrinkToFit?: boolean;
  
  // Border additions
  diagonalUp?: BorderStyle;
  diagonalDown?: BorderStyle;
}

interface BorderStyle {
  style: 'none' | 'thin' | 'medium' | 'thick' | 'double' | 
         'dashed' | 'dotted' | 'hair';
  color: ExcelColor;
}
```

**Immutability Guarantee:**
```typescript
// ❌ NEVER mutate existing style
cell.style.bold = true;

// ✅ ALWAYS create new style object
cell.style = { ...cell.style, bold: true };
```

**Why Immutability Matters:**
- Enables style caching/deduplication
- Safe for React/Vue/Angular rendering
- Allows undo/redo without deep cloning
- Performance: pointer comparison instead of deep equality

---

### 2. Style Cache Architecture

**Problem:** 100,000 cells with identical styles shouldn't store 100,000 style objects.

**Solution:** Style Interning

```typescript
class StyleCache {
  private cache = new Map<string, CellStyle>();
  private refCount = new Map<CellStyle, number>();
  
  /**
   * Get or create a cached style object.
   * Returns the same object reference for identical styles.
   */
  intern(style: CellStyle): CellStyle {
    const key = this.hashStyle(style);
    
    if (!this.cache.has(key)) {
      // Freeze to enforce immutability
      const frozen = Object.freeze({ ...style });
      this.cache.set(key, frozen);
      this.refCount.set(frozen, 0);
    }
    
    const cached = this.cache.get(key)!;
    this.refCount.set(cached, this.refCount.get(cached)! + 1);
    return cached;
  }
  
  /**
   * Release a style reference for garbage collection.
   */
  release(style: CellStyle): void {
    const count = this.refCount.get(style);
    if (count === 1) {
      // Last reference, can be garbage collected
      const key = this.hashStyle(style);
      this.cache.delete(key);
      this.refCount.delete(style);
    } else if (count) {
      this.refCount.set(style, count - 1);
    }
  }
  
  private hashStyle(style: CellStyle): string {
    // Stable hash of style properties
    return JSON.stringify(this.sortKeys(style));
  }
  
  private sortKeys(obj: any): any {
    return Object.keys(obj)
      .sort()
      .reduce((acc, key) => ({ ...acc, [key]: obj[key] }), {});
  }
}
```

**Performance Impact:**
- Memory: ~95% reduction for typical spreadsheets
- Equality checks: O(1) pointer comparison
- Style application: O(1) cache lookup

**Usage:**
```typescript
const styleCache = new StyleCache();

// Applying bold to a cell
const newStyle = styleCache.intern({
  ...cell.style,
  bold: true
});

// Release old style if no longer needed
if (cell.style) {
  styleCache.release(cell.style);
}

cell.style = newStyle;
```

---

### 3. Render Pipeline (Canvas Renderer)

**Phase 1 Extensions to Canvas Renderer:**

#### 3.1 Text Decoration (Strikethrough)

```typescript
function renderCellText(
  ctx: CanvasRenderingContext2D,
  cell: Cell,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const style = cell.style;
  const text = String(cell.value);
  
  // Apply font properties
  ctx.font = getCSSFont(style);
  ctx.fillStyle = style.fontColor || '#000000';
  ctx.textBaseline = getTextBaseline(style.verticalAlign);
  
  // Calculate text position
  const textX = getTextX(x, width, style.horizontalAlign, style.indent);
  const textY = getTextY(y, height, style.verticalAlign);
  
  // Render text
  if (style.superscript || style.subscript) {
    renderScriptText(ctx, text, textX, textY, style);
  } else {
    ctx.fillText(text, textX, textY);
  }
  
  // Apply strikethrough
  if (style.strikethrough) {
    const metrics = ctx.measureText(text);
    const lineY = textY - metrics.actualBoundingBoxAscent * 0.4;
    ctx.strokeStyle = style.fontColor || '#000000';
    ctx.lineWidth = Math.max(1, style.fontSize! / 20);
    ctx.beginPath();
    ctx.moveTo(textX, lineY);
    ctx.lineTo(textX + metrics.width, lineY);
    ctx.stroke();
  }
}

function getTextBaseline(verticalAlign?: 'top' | 'middle' | 'bottom'): CanvasTextBaseline {
  switch (verticalAlign) {
    case 'top': return 'top';
    case 'bottom': return 'bottom';
    case 'middle':
    default: return 'middle';
  }
}

function getTextY(y: number, height: number, verticalAlign?: 'top' | 'middle' | 'bottom'): number {
  const padding = 2; // Excel default
  switch (verticalAlign) {
    case 'top': return y + padding;
    case 'bottom': return y + height - padding;
    case 'middle':
    default: return y + height / 2;
  }
}
```

#### 3.2 Superscript/Subscript

```typescript
function renderScriptText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  style: CellStyle
): void {
  const baseSize = style.fontSize || 11;
  const scriptSize = baseSize * 0.65; // 65% of base size (Excel standard)
  const offset = baseSize * 0.35;     // 35% offset (Excel standard)
  
  if (style.superscript) {
    ctx.save();
    ctx.font = getCSSFont({ ...style, fontSize: scriptSize });
    ctx.fillText(text, x, y - offset);
    ctx.restore();
  } else if (style.subscript) {
    ctx.save();
    ctx.font = getCSSFont({ ...style, fontSize: scriptSize });
    ctx.fillText(text, x, y + offset);
    ctx.restore();
  }
}
```

#### 3.3 Text Rotation

```typescript
function renderRotatedText(
  ctx: CanvasRenderingContext2D,
  cell: Cell,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const rotation = cell.style.rotation || 0;
  
  if (rotation === 0) {
    // Fast path: no rotation
    renderCellText(ctx, cell, x, y, width, height);
    return;
  }
  
  // Save context
  ctx.save();
  
  // Rotate around cell center
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  ctx.translate(centerX, centerY);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-centerX, -centerY);
  
  // Render text
  renderCellText(ctx, cell, x, y, width, height);
  
  // Restore context
  ctx.restore();
}
```

#### 3.4 Wrap Text

```typescript
function renderWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  style: CellStyle
): void {
  const lines = wrapText(ctx, text, width - (style.indent || 0) * 8);
  const lineHeight = (style.fontSize || 11) * 1.2; // 120% line spacing
  const totalHeight = lines.length * lineHeight;
  
  // Calculate starting Y based on vertical alignment
  let currentY = getTextY(y, height, style.verticalAlign);
  
  if (style.verticalAlign === 'middle') {
    currentY -= totalHeight / 2;
  } else if (style.verticalAlign === 'bottom') {
    currentY -= totalHeight;
  }
  
  // Render each line
  lines.forEach((line, index) => {
    const lineY = currentY + (index * lineHeight);
    ctx.fillText(line, x + (style.indent || 0) * 8, lineY);
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
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
```

#### 3.5 Shrink to Fit

```typescript
function renderShrinkToFitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  style: CellStyle
): void {
  const baseFontSize = style.fontSize || 11;
  let fontSize = baseFontSize;
  
  // Binary search for optimal font size
  let minSize = 1;
  let maxSize = baseFontSize;
  
  while (maxSize - minSize > 0.5) {
    fontSize = (minSize + maxSize) / 2;
    ctx.font = getCSSFont({ ...style, fontSize });
    const metrics = ctx.measureText(text);
    
    if (metrics.width <= width - 4) { // 4px padding
      minSize = fontSize;
    } else {
      maxSize = fontSize;
    }
  }
  
  // Render with optimal size
  ctx.font = getCSSFont({ ...style, fontSize: minSize });
  ctx.fillText(text, x + 2, y + height / 2);
}
```

#### 3.6 Diagonal Borders

```typescript
function renderDiagonalBorders(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  style: CellStyle
): void {
  // Diagonal up (bottom-left to top-right)
  if (style.diagonalUp) {
    ctx.strokeStyle = style.diagonalUp.color;
    ctx.lineWidth = getBorderWidth(style.diagonalUp.style);
    setLineDash(ctx, style.diagonalUp.style);
    
    ctx.beginPath();
    ctx.moveTo(x, y + height);
    ctx.lineTo(x + width, y);
    ctx.stroke();
  }
  
  // Diagonal down (top-left to bottom-right)
  if (style.diagonalDown) {
    ctx.strokeStyle = style.diagonalDown.color;
    ctx.lineWidth = getBorderWidth(style.diagonalDown.style);
    setLineDash(ctx, style.diagonalDown.style);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y + height);
    ctx.stroke();
  }
}

function getBorderWidth(style: BorderStyle['style']): number {
  switch (style) {
    case 'hair': return 0.5;
    case 'thin': return 1;
    case 'medium': return 2;
    case 'thick': return 3;
    default: return 1;
  }
}

function setLineDash(ctx: CanvasRenderingContext2D, style: BorderStyle['style']): void {
  switch (style) {
    case 'dashed':
      ctx.setLineDash([4, 2]);
      break;
    case 'dotted':
      ctx.setLineDash([1, 1]);
      break;
    case 'double':
      // Double border requires two separate strokes
      ctx.setLineDash([]);
      break;
    default:
      ctx.setLineDash([]);
  }
}
```

---

### 4. Performance Instrumentation

**From Day 1, track:**

```typescript
interface RenderMetrics {
  cellsRendered: number;
  totalRenderTime: number;      // ms
  styleApplicationTime: number;  // ms
  textMeasurementTime: number;   // ms
  
  // Phase 1 specific
  rotatedCells: number;
  wrappedCells: number;
  shrinkToFitCells: number;
  diagonalBorders: number;
}

class PerformanceMonitor {
  private metrics: RenderMetrics = {
    cellsRendered: 0,
    totalRenderTime: 0,
    styleApplicationTime: 0,
    textMeasurementTime: 0,
    rotatedCells: 0,
    wrappedCells: 0,
    shrinkToFitCells: 0,
    diagonalBorders: 0,
  };
  
  startFrame(): void {
    this.metrics = { ...this.metrics, cellsRendered: 0 };
  }
  
  recordCellRender(duration: number, style: CellStyle): void {
    this.metrics.cellsRendered++;
    this.metrics.totalRenderTime += duration;
    
    if (style.rotation) this.metrics.rotatedCells++;
    if (style.wrapText) this.metrics.wrappedCells++;
    if (style.shrinkToFit) this.metrics.shrinkToFitCells++;
    if (style.diagonalUp || style.diagonalDown) this.metrics.diagonalBorders++;
  }
  
  getAverageRenderTime(): number {
    return this.metrics.totalRenderTime / this.metrics.cellsRendered;
  }
  
  report(): RenderMetrics {
    return { ...this.metrics };
  }
}
```

**Success Thresholds:**
- Average render time per cell: <0.5ms (with new features)
- 60fps scrolling with 1000 visible cells
- Memory growth: <5% after Phase 1 features

---

## Testing Strategy

### Unit Tests (50+)

**1. Style Model Tests (15 tests)**
```typescript
describe('CellStyle - Phase 1 Properties', () => {
  test('strikethrough defaults to false', () => {
    const style: CellStyle = {};
    expect(style.strikethrough).toBeUndefined();
  });
  
  test('superscript and subscript are mutually exclusive', () => {
    const style: CellStyle = { superscript: true, subscript: true };
    // Implementation should enforce mutual exclusion
    expect(validateStyle(style)).toThrow('Cannot set both superscript and subscript');
  });
  
  test('rotation range is 0-180', () => {
    expect(() => ({ rotation: -10 })).toThrow();
    expect(() => ({ rotation: 200 })).toThrow();
    expect({ rotation: 90 }).toBeTruthy();
  });
  
  test('indent range is 0-15', () => {
    expect(() => ({ indent: -1 })).toThrow();
    expect(() => ({ indent: 16 })).toThrow();
    expect({ indent: 5 }).toBeTruthy();
  });
  
  // ... 11 more tests
});
```

**2. Style Cache Tests (10 tests)**
```typescript
describe('StyleCache', () => {
  test('identical styles return same object reference', () => {
    const cache = new StyleCache();
    const style1 = cache.intern({ bold: true, fontSize: 12 });
    const style2 = cache.intern({ bold: true, fontSize: 12 });
    expect(style1).toBe(style2); // Pointer equality
  });
  
  test('different styles return different references', () => {
    const cache = new StyleCache();
    const style1 = cache.intern({ bold: true });
    const style2 = cache.intern({ italic: true });
    expect(style1).not.toBe(style2);
  });
  
  test('cache releases unused styles', () => {
    const cache = new StyleCache();
    const style = cache.intern({ bold: true });
    cache.release(style);
    expect(cache['refCount'].get(style)).toBeUndefined();
  });
  
  // ... 7 more tests
});
```

**3. Render Tests (25 tests)**
```typescript
describe('Canvas Renderer - Phase 1 Features', () => {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  
  beforeEach(() => {
    canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d')!;
  });
  
  test('renders strikethrough at correct Y position', () => {
    const cell = { value: 'Test', style: { strikethrough: true, fontSize: 12 } };
    renderCellText(ctx, cell, 0, 0, 100, 20);
    
    // Verify stroke was called
    expect(ctx.stroke).toHaveBeenCalled();
  });
  
  test('superscript renders at 65% size with 35% offset', () => {
    const cell = { value: 'x²', style: { superscript: true, fontSize: 12 } };
    renderScriptText(ctx, 'x²', 10, 10, cell.style);
    
    // Verify font size and position
    expect(ctx.font).toContain('7.8px'); // 65% of 12
  });
  
  test('text rotation applies correct transform', () => {
    const cell = { value: 'Test', style: { rotation: 45 } };
    renderRotatedText(ctx, cell, 0, 0, 100, 20);
    
    expect(ctx.rotate).toHaveBeenCalledWith((45 * Math.PI) / 180);
  });
  
  test('wrap text splits into multiple lines', () => {
    const text = 'This is a very long text that should wrap';
    const lines = wrapText(ctx, text, 50);
    expect(lines.length).toBeGreaterThan(1);
  });
  
  test('shrink to fit finds optimal font size', () => {
    const text = 'Very long text';
    ctx.font = '12px Arial';
    renderShrinkToFitText(ctx, text, 0, 0, 50, 20, { fontSize: 12 });
    
    // Font size should be reduced to fit
    expect(ctx.font).toMatch(/[0-9]+px/);
    const [size] = ctx.font.match(/[0-9]+/)!;
    expect(parseInt(size)).toBeLessThan(12);
  });
  
  test('diagonal borders render at correct angles', () => {
    const style = {
      diagonalUp: { style: 'thin', color: '#000000' },
      diagonalDown: { style: 'thin', color: '#000000' }
    };
    renderDiagonalBorders(ctx, 0, 0, 100, 50, style);
    
    expect(ctx.moveTo).toHaveBeenCalledTimes(2);
    expect(ctx.lineTo).toHaveBeenCalledTimes(2);
  });
  
  // ... 19 more tests
});
```

### Integration Tests (20+)

**Export/Import Roundtrip:**
```typescript
describe('Phase 1 Export/Import', () => {
  test('strikethrough preserved in XLSX export', () => {
    const workbook = createWorkbook();
    workbook.cells['A1'] = { value: 'Test', style: { strikethrough: true } };
    
    const xlsx = exportToXLSX(workbook);
    const imported = importFromXLSX(xlsx);
    
    expect(imported.cells['A1'].style.strikethrough).toBe(true);
  });
  
  test('text rotation preserved in roundtrip', () => {
    const workbook = createWorkbook();
    workbook.cells['A1'] = { value: 'Test', style: { rotation: 45 } };
    
    const xlsx = exportToXLSX(workbook);
    const imported = importFromXLSX(xlsx);
    
    expect(imported.cells['A1'].style.rotation).toBe(45);
  });
  
  // ... 18 more tests
});
```

### Performance Benchmarks (10+)

```typescript
describe('Phase 1 Performance', () => {
  test('style cache reduces memory usage', () => {
    const cache = new StyleCache();
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Create 10,000 cells with identical styles
    const cells = Array.from({ length: 10000 }, () => ({
      value: 'Test',
      style: cache.intern({ bold: true, fontSize: 12 })
    }));
    
    const finalMemory = process.memoryUsage().heapUsed;
    const growth = (finalMemory - initialMemory) / 1024 / 1024; // MB
    
    expect(growth).toBeLessThan(5); // <5MB for 10k cells
  });
  
  test('render time stays below threshold', () => {
    const monitor = new PerformanceMonitor();
    const canvas = createCanvas(1000, 1000);
    
    monitor.startFrame();
    
    // Render 1000 cells with Phase 1 features
    for (let i = 0; i < 1000; i++) {
      const start = performance.now();
      renderCell(canvas, {
        value: 'Test',
        style: { rotation: 45, wrapText: true, strikethrough: true }
      });
      monitor.recordCellRender(performance.now() - start, cell.style);
    }
    
    const avg = monitor.getAverageRenderTime();
    expect(avg).toBeLessThan(0.5); // <0.5ms per cell
  });
  
  // ... 8 more benchmarks
});
```

---

## Delivery Schedule

### Week 1 (Days 1-5)

**Day 1: Foundation**
- ✅ Extend `CellStyle` interface
- ✅ Implement `StyleCache` with interning
- ✅ Add immutability enforcement
- ✅ Write 15 unit tests (style model)

**Day 2-3: Render Pipeline**
- ✅ Implement strikethrough rendering
- ✅ Implement superscript/subscript
- ✅ Implement vertical alignment
- ✅ Write 15 unit tests (rendering)

**Day 4-5: Advanced Rendering**
- ✅ Implement text rotation
- ✅ Implement wrap text
- ✅ Implement indent
- ✅ Write 10 unit tests

### Week 2 (Days 6-10)

**Day 6-7: Shrink to Fit + Diagonal Borders**
- ✅ Implement shrink-to-fit algorithm
- ✅ Implement diagonal border rendering
- ✅ Write 10 unit tests

**Day 8: Export/Import**
- ✅ Map Phase 1 styles to OOXML
- ✅ Implement import parser
- ✅ Write 20 integration tests (roundtrip)

**Day 9: Performance Testing**
- ✅ Run 10+ performance benchmarks
- ✅ Optimize hot paths if needed
- ✅ Generate performance report

**Day 10: Documentation + Ship**
- ✅ Update API documentation
- ✅ Create migration guide
- ✅ Ship Phase 1 (92% parity achieved)

---

## Success Metrics

**At Phase 1 Completion:**

✅ **Feature Parity:** 92% (vs 80-85% before)  
✅ **Test Coverage:** 50+ unit, 20+ integration, 10+ performance  
✅ **Performance:** <0.5ms avg render per cell  
✅ **Memory:** <5% growth, style cache working  
✅ **Quality:** Zero technical debt, immutable styles, TypeScript strict  

**Validation:**
- [ ] Excel import test suite: 100+ files
- [ ] Visual diff tool: Pixel comparison vs Excel screenshots
- [ ] Performance dashboard: Real-time metrics
- [ ] User acceptance: Beta test with 10+ users

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Render performance degrades | Medium | High | Benchmark every feature, optimize hot paths |
| Style cache memory leak | Low | High | Extensive leak testing, ref counting validation |
| Export/import edge cases | Medium | Medium | Comprehensive roundtrip tests, Excel file corpus |
| Wrap text layout bugs | High | Medium | Extensive text wrapping test cases, visual regression tests |
| Rotation performance | Medium | Medium | Canvas transform optimization, fast path for 0° |

---

## Phase 1 → Phase 2 Bridge

**Before Starting Phase 2 (Rich Text):**

Critical Architecture Decision Required:

```typescript
// Current (likely)
Cell {
  value: string | number
  style: CellStyle
}

// Future (Phase 2)
Cell {
  value: CellValue    // ← CRITICAL: New union type
  style: CellStyle
}

type CellValue = 
  | PrimitiveValue
  | RichTextValue

interface RichTextValue {
  text: string
  runs: RichTextRun[]
}

interface RichTextRun {
  start: number
  end: number
  style: Partial<CellStyle>
}
```

**Why This Matters:**
- Rich text is a **value property**, not a style property
- Must not bolt rich text onto style system (architectural debt)
- Requires cell value model v2 design before Phase 2

**Gate Condition:**
- [ ] Phase 1 performance validated (<0.5ms avg)
- [ ] Phase 1 shipped to beta users
- [ ] Cell value model v2 architecture approved
- [ ] Rich text renderer prototype tested

---

## Strategic Notes

**Phase 1 as Foundation for (D) Enterprise-Grade:**

1. **Immutable Styles** → Enables undo/redo, safe concurrency
2. **Style Cache** → Scales to millions of cells
3. **Performance Instrumentation** → Data-driven optimization
4. **Compiled Rendering** → Fast path optimizations

Phase 1 isn't just "add features."

Phase 1 establishes the **architectural patterns** for enterprise-grade formatting:
- Immutability
- Caching
- Performance monitoring
- Quality gates

**If Phase 1 succeeds with these patterns, Phases 2-4 will follow the same discipline.**

---

## Appendix: Excel Behavioral Reference

### Strikethrough
- Line position: 40% above baseline
- Line thickness: fontSize / 20 (min 1px)
- Color: matches font color

### Superscript/Subscript
- Size: 65% of base font
- Offset: 35% of base font size
- Mutually exclusive

### Vertical Alignment
- Top: 2px from top edge
- Middle: centered
- Bottom: 2px from bottom edge

### Wrap Text
- Line height: 120% of font size
- Word break: space character
- Hyphenation: not supported in Excel

### Text Rotation
- Range: 0-180°
- Clockwise: positive
- Counter-clockwise: negative
- 90°: vertical text (special case)

### Indent
- Range: 0-15
- Step: 8px per indent level
- Only affects left alignment

### Shrink to Fit
- Min size: 1pt
- Binary search algorithm
- Preserves aspect ratio
- Disabled if wrap text is enabled

### Diagonal Borders
- Diagonal up: bottom-left to top-right
- Diagonal down: top-left to bottom-right
- Can coexist with regular borders
- Render order: regular borders first, then diagonals

---

**Status:** Ready to Start Phase 1  
**Next Action:** Get approval to proceed, then begin Day 1 implementation

🚀 **Let's build an enterprise-grade formatting engine.**
