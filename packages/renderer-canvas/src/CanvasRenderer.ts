import { Worksheet, Address, CellStyle, CellEvent, resolveExcelColor, ExcelColorSpec, Emitter } from '@cyber-sheet/core';
import { TextMeasureCache } from './TextMeasureCache';
import { Theme, ExcelLightTheme, mergeTheme, ThemePresetName, resolveThemePreset } from './Theme';
import { FormatCache } from './FormatCache';
import { RenderPlugin } from './plugins';

export type CanvasRendererOptions = {
  headerHeight?: number; // px
  headerWidth?: number; // px
  // Theme tokens
  theme?: Partial<Theme>;
  debug?: boolean;
  onRender?: (info: { ms: number; regions: { x: number; y: number; w: number; h: number }[] }) => void;
  // Locale for ICU formatting (Intl)
  locale?: string;
  // Auto-size columns at init using measured text widths
  autoSizeColumns?: boolean | {
    mode?: 'visible' | 'all';
    includeHeader?: boolean;
    padding?: number; // px added to measured text
    minWidth?: number; // px lower bound
    maxWidth?: number; // px upper bound
    maxRowsToScan?: number; // when mode='all', cap scanning for performance
  };
  onRequestColumnFilterMenu?: (info: { col: number; anchor: { x: number; y: number };
    values: Array<{ value: string; count: number }>; apply: (selected: string[]) => void; clear: () => void; }) => void;
};

export type RenderStage = 'background' | 'grid' | 'headers' | 'cells' | 'selection' | 'overlays' | 'after';
export type RenderLayer = {
  id: string;
  stage: RenderStage;
  zIndex?: number;
  draw: (ctx: CanvasRenderingContext2D, api: {
    width: number; height: number; dpr: number; options: Required<CanvasRendererOptions>;
    sheet: Worksheet; getScroll: () => { x: number; y: number };
    rectForRange: (r1: number, c1: number, r2: number, c2: number) => { x: number; y: number; w: number; h: number } | null;
  }) => void;
};

export class CanvasRenderer {
  private container: HTMLElement;
  private sheet: Worksheet;
  private options: Required<CanvasRendererOptions>;
  private theme: Theme = ExcelLightTheme;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private scrollX = 0;
  private scrollY = 0;
  private zoom = 1; // scaling factor for grid (headers remain fixed)
  private selection: { start: Address; end: Address } | null = null;
  private selections: { start: Address; end: Address }[] = [];
  private textCache = new TextMeasureCache();
  private formatCache = new FormatCache();
  private layers: RenderLayer[] = [];
  private dirty: { x: number; y: number; w: number; h: number } | null = null;
  private rafId: number | null = null;
  private _lastRenderMs = 0;
  private lastDirtyRects: { x: number; y: number; w: number; h: number }[] = [];
  private valueFmtCache = new Map<string, string>();
  private plugins: RenderPlugin[] = [];
  private heatmapRange: { min: number; max: number } | null = null;
  private hoveredCell: Address | null = null;
  private clickStartTime = 0;
  private clickStartCell: Address | null = null;
  private scrollEmitter = new Emitter<{ type: 'scroll'; scroll: { x: number; y: number; maxX: number; maxY: number } }>();
  // Distinct value cache per column for filter menus

  private clearValueCacheForColumn(col?: number) {
    if (col != null) this._valueCache.delete(col); else this._valueCache.clear();
  }

  getColumnDistinctValues(col: number, options?: { domain?: 'all' | 'visible' | 'filtered'; search?: string }): Array<{ value: string; count: number }> {
    const domain = options?.domain ?? 'all';
    const searchRaw = options?.search?.toLowerCase() ?? '';
    let map: Map<string, number> | undefined;
    if (domain === 'all') {
      map = this._valueCache.get(col);
      if (!map) {
        map = new Map();
        for (let r = 1; r <= this.sheet.rowCount; r++) {
          const v = this.sheet.getCellValue({ row: r, col });
          const key = v == null ? '' : String(v);
          map.set(key, (map.get(key) || 0) + 1);
        }
        this._valueCache.set(col, map);
      }
    } else if (domain === 'visible') {
      map = new Map();
      const rows = this.sheet.getVisibleRowIndices();
      for (const r of rows) {
        const v = this.sheet.getCellValue({ row: r, col });
        const key = v == null ? '' : String(v);
        map.set(key, (map.get(key) || 0) + 1);
      }
    } else if (domain === 'filtered') {
      // Rows that pass other filters except this column's own filter
      map = new Map();
      const rows = (this.sheet as any).getVisibleRowIndicesExcluding?.(col) || [];
      for (const r of rows) {
        const v = this.sheet.getCellValue({ row: r, col });
        const key = v == null ? '' : String(v);
        map.set(key, (map.get(key) || 0) + 1);
      }
    }
  if (!map) return [];
  let entries = Array.from(map.entries());
    if (searchRaw) entries = entries.filter(([value]) => value.toLowerCase().includes(searchRaw));
    return entries.map(([value, count]) => ({ value, count })).sort((a,b)=>a.value.localeCompare(b.value));
  }
  // Distinct value cache per column for filter menus
  private _valueCache: Map<number, Map<string, number>> = new Map();

  constructor(container: HTMLElement, sheet: Worksheet, options: CanvasRendererOptions = {}) {
    this.container = container;
    this.sheet = sheet;
    this.options = {
      headerHeight: options.headerHeight ?? 24,
      headerWidth: options.headerWidth ?? 48,
      theme: options.theme ?? {},
      debug: options.debug ?? false,
      onRender: options.onRender,
      locale: options.locale ?? undefined,
    } as Required<CanvasRendererOptions>;
    this.theme = mergeTheme(ExcelLightTheme, this.options.theme);
    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
  this.ctx = ctx;
    this.container.appendChild(this.canvas);
  // Initialize formatting cache locale
  this.formatCache = new FormatCache(this.options.locale);
    this.observeResize();
    this.resize();
    if (this.options.debug) this.setDebugEnabled(true);
    // Optional auto-size pass before first draw
    if (options.autoSizeColumns) {
      const cfg = typeof options.autoSizeColumns === 'object' ? options.autoSizeColumns : {};
      try { this.autoSizeColumns(cfg); } catch {}
    }
    this.setupEventListeners();
    // Invalidate distinct value cache on relevant sheet events
    this.sheet.on((ev) => {
      const t = (ev as any).type;
      if (t === 'cell-changed') this.clearValueCacheForColumn((ev as any).address.col);
      else if (t === 'sheet-mutated' || t === 'filter-changed') this.clearValueCacheForColumn();
      // Invalidate cell region for style/comment/icon changes so visual updates (color, borders, indicators) appear
      if (t === 'style-changed') {
        const a = (ev as any).address; this.invalidateRange(a.row, a.col, a.row, a.col);
      } else if (t === 'comment-added' || t === 'comment-updated' || t === 'comment-deleted' || t === 'icon-changed') {
        const a = (ev as any).address; this.invalidateRange(a.row, a.col, a.row, a.col);
      }
    });
    this.redraw();
  }

  dispose() {
    this.resizeObserver?.disconnect();
    this.removeEventListeners();
    this.canvas.remove();
  }

  setScroll(x: number, y: number) {
    const max = this.getMaxScroll();
    // Clamp to bounds
    const clampedX = Math.min(Math.max(0, x), max.x);
    const clampedY = Math.min(Math.max(0, y), max.y);
    
    // Only redraw if scroll actually changed
    if (this.scrollX === clampedX && this.scrollY === clampedY) return;
    
    this.scrollX = clampedX;
    this.scrollY = clampedY;
    
    // Emit scroll event for adapters to listen
    this.scrollEmitter.emit({
      type: 'scroll',
      scroll: { x: clampedX, y: clampedY, maxX: max.x, maxY: max.y }
    });
    
    // Schedule redraw via RAF to batch multiple scroll updates
    this.scheduleRedraw();
  }
  
  private scheduleRedraw() {
    if (this.rafId !== null) return; // Already scheduled
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.redraw();
    });
  }
  setSelection(sel: { start: Address; end: Address } | null) { this.selection = sel; this.selections = sel ? [sel] : []; this.scheduleRedraw(); }
  setSelections(ranges: { start: Address; end: Address }[]) { this.selections = ranges.slice(); this.selection = ranges[0] ?? null; this.scheduleRedraw(); }
  getSelections(): { start: Address; end: Address }[] { return this.selections.slice(); }
  getScroll() { return { x: this.scrollX, y: this.scrollY }; }
  scrollBy(dx: number, dy: number) { this.setScroll(this.scrollX + dx, this.scrollY + dy); }
  
  /**
   * Subscribe to scroll change events. Returns a disposable to unsubscribe.
   * This is the proper way for adapters to listen to scroll changes instead of polling.
   */
  onScrollChange(listener: (event: { x: number; y: number; maxX: number; maxY: number }) => void): { dispose: () => void } {
    return this.scrollEmitter.on((event) => {
      if (event.type === 'scroll') {
        listener(event.scroll);
      }
    });
  }
  
  // Expose read-only handles for host wrappers (React) that need to align/snapping or edge checks
  get optionsReadonly(): Readonly<Required<CanvasRendererOptions>> { return this.options; }
  get sheetReadonly(): Worksheet { return this.sheet; }
  // The size of the drawable content viewport (excluding headers), in CSS pixels.
  getViewportSize(): { width: number; height: number } {
    const width = this.canvas.width / this.dpr;
    const height = this.canvas.height / this.dpr;
    return { width: Math.max(0, width - this.options.headerWidth), height: Math.max(0, height - this.options.headerHeight) };
  }
  // Visible rows considering filters (fallback to all rows)
  private getVisibleRows(): number[] {
    const anySheet: any = this.sheet as any;
    if (typeof anySheet.getVisibleRowIndices === 'function') return anySheet.getVisibleRowIndices();
    return Array.from({ length: this.sheet.rowCount }, (_, i) => i + 1);
  }
  // The full content size based on row/column sizes (excluding headers), in CSS pixels.
  getContentSize(): { width: number; height: number } {
    let w = 0; for (let c = 1; c <= this.sheet.colCount; c++) w += this.sheet.getColumnWidth(c) * this.zoom;
    let h = 0; 
    const visRows = this.getVisibleRows();
    for (const r of visRows) h += this.sheet.getRowHeight(r) * this.zoom;
    return { width: w, height: h };
  }
  // The maximum scroll offsets allowed (content minus viewport), never negative.
  getMaxScroll(): { x: number; y: number } {
    const vp = this.getViewportSize();
    const ct = this.getContentSize();
    return { x: Math.max(0, ct.width - vp.width), y: Math.max(0, ct.height - vp.height) };
  }
  get lastRenderMs() { return this._lastRenderMs; }
  getTheme(): Theme { return this.theme; }
  setTheme(next: Partial<Theme>) { this.theme = mergeTheme(this.theme, next); this.ctx.font = `${this.theme.fontSize}px ${this.theme.fontFamily}`; this.redraw(); }
  setThemePreset(name: ThemePresetName, overrides?: Partial<Theme>) {
    const preset = resolveThemePreset(name);
    this.theme = overrides ? mergeTheme(preset, overrides) : preset;
    this.ctx.font = `${this.theme.fontSize}px ${this.theme.fontFamily}`;
    this.redraw();
  }
  setLocale(locale: string) {
    this.formatCache.setLocale(locale);
    this.valueFmtCache.clear(); // invalidate cached formatted strings
    this.redraw();
  }
  setZoom(factor: number) {
    const z = Math.min(4, Math.max(0.25, factor));
    if (z === this.zoom) return;
    this.zoom = z;
    this.invalidateRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);
  }
  getZoom() { return this.zoom; }
  /**
   * Compute and apply column widths based on measured text of cells.
   * By default scans visible rows for performance, includes header labels, and applies padding/minWidth.
   */
  autoSizeColumns(opts?: { mode?: 'visible'|'all'; includeHeader?: boolean; padding?: number; minWidth?: number; maxWidth?: number; maxRowsToScan?: number; }) {
    const mode = opts?.mode ?? 'visible';
    const includeHeader = opts?.includeHeader ?? true;
    const padding = opts?.padding ?? 12;
    const minWidth = opts?.minWidth ?? 48;
    const maxWidth = opts?.maxWidth ?? 800;
    const maxRowsToScan = opts?.maxRowsToScan ?? 5000;
    const ctx = this.ctx;
    const fontBaseSize = this.theme.fontSize;
    const fontFamily = this.theme.fontFamily;
    const measure = (text: string, style?: CellStyle) => {
      const size = style?.fontSize || fontBaseSize;
      const weight = style?.bold ? 'bold ' : '';
      const italic = style?.italic ? 'italic ' : '';
      const font = `${italic}${weight}${size}px ${fontFamily}`;
      let w = this.textCache.get(font, text);
      if (w == null) { ctx.save(); ctx.font = font; w = ctx.measureText(text).width; ctx.restore(); this.textCache.set(font, text, w); }
      return w;
    };
    const rows: number[] = mode === 'visible' ? this.sheet.getVisibleRowIndices() : Array.from({ length: this.sheet.rowCount }, (_, i) => i + 1);
    const limitedRows = rows.length > maxRowsToScan ? rows.slice(0, maxRowsToScan) : rows;
    for (let c = 1; c <= this.sheet.colCount; c++) {
      let maxW = includeHeader ? measure(this.colLabel(c)) : 0;
      for (const r of limitedRows) {
        const v = this.sheet.getCellValue({ row: r, col: c });
        if (v == null) continue;
        const style = this.sheet.getCellStyle({ row: r, col: c });
        // use formatted textual value if applicable
        let text: string;
        if (typeof v === 'number') {
          const fmt = style?.numberFormat;
          const res = this.formatCache.formatValue(v, fmt);
          text = res.text ?? String(v);
        } else {
          text = String(v);
        }
        const w = measure(text, style);
        if (w > maxW) maxW = w;
      }
      const finalW = Math.min(maxWidth, Math.max(minWidth, Math.ceil(maxW + padding)));
      this.sheet.setColumnWidth(c, finalW);
    }
    this.redraw();
  }
  addPlugin(plugin: RenderPlugin) {
    this.plugins.push(plugin);
    this.plugins.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
    this.redraw();
  }
  removePlugin(id: string) {
    this.plugins = this.plugins.filter(p => p.id !== id);
    this.redraw();
  }
  getPlugin(id: string): RenderPlugin | undefined {
    return this.plugins.find(p => p.id === id);
  }
  computeHeatmapRange() {
    let min = Infinity, max = -Infinity;
    for (let r = 1; r <= this.sheet.rowCount; r++) {
      for (let c = 1; c <= this.sheet.colCount; c++) {
        const v = this.sheet.getCellValue({ row: r, col: c });
        if (typeof v === 'number') {
          min = Math.min(min, v);
          max = Math.max(max, v);
        }
      }
    }
    this.heatmapRange = min !== Infinity ? { min, max } : null;
    this.redraw();
  }
  
  /**
   * Resolve Excel color specification to CSS color string
   * Handles theme colors, indexed colors, RGB, and direct CSS strings
   */
  private resolveColor(color: string | ExcelColorSpec | undefined | null, defaultColor: string = '#000000'): string {
    if (!color) return defaultColor;
    if (typeof color === 'string') return color;
    return resolveExcelColor(color, { defaultColor });
  }
  
  addLayer(layer: RenderLayer) { this.layers.push(layer); this.layers.sort((a, b) => (stageOrder(a.stage) - stageOrder(b.stage)) || ((a.zIndex ?? 0) - (b.zIndex ?? 0))); this.redraw(); }
  removeLayer(id: string) { this.layers = this.layers.filter(l => l.id !== id); this.redraw(); }
  invalidateRange(r1: number, c1: number, r2: number, c2: number) {
    const rect = this.rectForRange(r1, c1, r2, c2);
    if (rect) this.invalidateRect(rect.x, rect.y, rect.w, rect.h);
  }
  invalidateRect(x: number, y: number, w: number, h: number) {
    const r = { x, y, w, h };
    this.dirty = this.dirty ? unionRect(this.dirty, r) : r;
    if (this.rafId == null) this.rafId = requestAnimationFrame(() => { this.rafId = null; this.redraw(); });
  }
  exportToDataURL(range?: { r1: number; c1: number; r2: number; c2: number }, type: 'image/png' | 'image/jpeg' = 'image/png'): string {
    return this.canvas.toDataURL(type);
  }
  setDebugEnabled(enabled: boolean) {
    if (enabled) {
      if (!this.layers.find(l => l.id === 'debug-overlay')) {
        this.addLayer({ id: 'debug-overlay', stage: 'after', zIndex: 9999, draw: (ctx) => {
          ctx.save();
          ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
          ctx.font = `10px ${this.theme.fontFamily}`;
          ctx.fillStyle = '#008000';
          const fps = this._lastRenderMs > 0 ? (1000 / this._lastRenderMs).toFixed(1) : '-';
          ctx.fillText(`render: ${this._lastRenderMs.toFixed(2)} ms  FPS~${fps}`, 8, 12);
          ctx.strokeStyle = 'rgba(255,0,128,0.7)';
          for (const r of this.lastDirtyRects) ctx.strokeRect(r.x, r.y, r.w, r.h);
          ctx.restore();
        }});
      }
    } else {
      this.removeLayer('debug-overlay');
    }
  }

  private resizeObserver?: ResizeObserver;
  private observeResize() {
    this.resizeObserver = new ResizeObserver(() => { 
      this.resize(); 
      this.scheduleRedraw();
    });
    this.resizeObserver.observe(this.container);
  }

  resize() {
    this.dpr = window.devicePixelRatio || 1;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.canvas.width = Math.max(1, Math.floor(w * this.dpr));
    this.canvas.height = Math.max(1, Math.floor(h * this.dpr));
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.font = `${this.theme.fontSize}px ${this.theme.fontFamily}`;
  }

  private visibleRange(): { firstRow: number; firstCol: number; xOffset: number; yOffset: number; firstRowIndex?: number } {
    let x = this.options.headerWidth;
    let y = this.options.headerHeight;
    let col = 1;
    const rows = this.getVisibleRows();
    let rowIndex = 0;
    let sx = this.scrollX;
    let sy = this.scrollY;
    while (sx > 0 && col <= this.sheet.colCount) {
      const w = this.sheet.getColumnWidth(col) * this.zoom;
      if (sx < w) { x -= sx; break; }
      sx -= w; col++; x = this.options.headerWidth;
    }
    while (sy > 0 && rowIndex < rows.length) {
      const rh = this.sheet.getRowHeight(rows[rowIndex]) * this.zoom;
      if (sy < rh) { y -= sy; break; }
      sy -= rh; rowIndex++; y = this.options.headerHeight;
    }
    const firstRow = rows[rowIndex] ?? 1;
    return { firstRow, firstCol: col, xOffset: x, yOffset: y, firstRowIndex: rowIndex };
  }

  redraw() {
    const t0 = performance.now();
    // Begin frame: optionally keep cache; could purge if memory grows. For now, keep across frames.
  const { headerHeight, headerWidth } = this.options;
  const { gridColor, headerBg, headerFg, sheetBg, selectionColor } = this.theme;
    const ctx = this.ctx;
    const width = this.canvas.width / this.dpr;
    const height = this.canvas.height / this.dpr;

    // Split dirty to regions (content, top header, left header, corner)
    const dirty = this.dirty;
    const clips: ({ x: number; y: number; w: number; h: number } | null)[] = [];
    if (!dirty) clips.push(null);
    else {
      const content = { x: headerWidth, y: headerHeight, w: width - headerWidth, h: height - headerHeight };
      const topHdr = { x: headerWidth, y: 0, w: width - headerWidth, h: headerHeight };
      const leftHdr = { x: 0, y: headerHeight, w: headerWidth, h: height - headerHeight };
      const corner = { x: 0, y: 0, w: headerWidth, h: headerHeight };
      const inter = (a: any, b: any) => {
        const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
        const r = Math.min(a.x + a.w, b.x + b.w), bt = Math.min(a.y + a.h, b.y + b.h);
        const w = r - x, h = bt - y; return w > 0 && h > 0 ? { x, y, w, h } : null;
      };
      const c1 = inter(dirty, content); if (c1) clips.push(c1);
      const c2 = inter(dirty, topHdr); if (c2) clips.push(c2);
      const c3 = inter(dirty, leftHdr); if (c3) clips.push(c3);
      const c4 = inter(dirty, corner); if (c4) clips.push(c4);
    }
    this.lastDirtyRects = clips.filter((c): c is { x: number; y: number; w: number; h: number } => !!c);

    for (const clip of clips) {
      ctx.save();
      if (clip) { ctx.beginPath(); ctx.rect(clip.x, clip.y, clip.w, clip.h); ctx.clip(); ctx.clearRect(clip.x, clip.y, clip.w, clip.h); }
      else { ctx.clearRect(0, 0, width, height); }

      // background
      ctx.fillStyle = sheetBg;
      if (clip) ctx.fillRect(clip.x, clip.y, clip.w, clip.h); else ctx.fillRect(0, 0, width, height);
      // headers background
  ctx.fillStyle = headerBg;
      ctx.fillRect(0, 0, width, headerHeight);
      ctx.fillRect(0, 0, headerWidth, height);
      this.drawLayers('background', ctx, width, height);

      // grid background
  ctx.fillStyle = sheetBg;
      ctx.fillRect(headerWidth, headerHeight, width - headerWidth, height - headerHeight);

      // grid lines and headers
  ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1;
      const { firstRow, firstCol, xOffset, yOffset } = this.visibleRange();
      this.drawLayers('grid', ctx, width, height);

      // Column headers
      let x = xOffset; let col = firstCol;
  ctx.fillStyle = headerFg;
      if (clip) { while (x + this.sheet.getColumnWidth(col) * this.zoom < clip.x && col <= this.sheet.colCount) { x += this.sheet.getColumnWidth(col) * this.zoom; col++; } }
      while (x < width && col <= this.sheet.colCount) {
        const cw = this.sheet.getColumnWidth(col) * this.zoom;
        if (clip && x > (clip.x + clip.w)) break;
  ctx.fillText(this.colLabel(col), x + cw / 2 - ctx.measureText(this.colLabel(col)).width / 2, headerHeight / 2 + this.theme.fontSize / 2 - 2);
        const px = Math.round(x + cw) + 0.5; ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, height); ctx.stroke();
        x += cw; col++;
      }

      // Row headers (respect filters)
      const visRows = this.getVisibleRows();
      let y = yOffset; let rowIndex = (this.visibleRange().firstRowIndex ?? 0);
      if (clip) { while (rowIndex < visRows.length && y + this.sheet.getRowHeight(visRows[rowIndex]) * this.zoom < clip.y) { y += this.sheet.getRowHeight(visRows[rowIndex]) * this.zoom; rowIndex++; } }
      while (y < height && rowIndex < visRows.length) {
        const row = visRows[rowIndex];
        const rh = this.sheet.getRowHeight(row) * this.zoom;
        if (clip && y > (clip.y + clip.h)) break;
        const label = String(row);
  ctx.fillText(label, headerWidth - 4 - ctx.measureText(label).width, y + rh / 2 + this.theme.fontSize / 2 - 2);
        const py = Math.round(y + rh) + 0.5; ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(width, py); ctx.stroke();
        y += rh; rowIndex++;
      }
      this.drawLayers('headers', ctx, width, height);

      // Cells (respect filters)
      y = yOffset; rowIndex = (this.visibleRange().firstRowIndex ?? 0);
  if (clip) { while (rowIndex < visRows.length && y + this.sheet.getRowHeight(visRows[rowIndex]) * this.getZoom() < clip.y) { y += this.sheet.getRowHeight(visRows[rowIndex]) * this.getZoom(); rowIndex++; } }
      while (y < height && rowIndex < visRows.length) {
        const row = visRows[rowIndex];
        x = xOffset; col = firstCol;
        if (clip) { while (x + this.sheet.getColumnWidth(col) * this.zoom < clip.x && col <= this.sheet.colCount) { x += this.sheet.getColumnWidth(col) * this.zoom; col++; } }
        const rh = this.sheet.getRowHeight(row) * this.zoom;
        while (x < width && col <= this.sheet.colCount) {
          if (clip && y > (clip.y + clip.h)) break;
          const cw = this.sheet.getColumnWidth(col) * this.zoom;
          if (clip && x > (clip.x + clip.w)) break;
          const addr = { row, col };
          const merged = (this.sheet as any).getMergedRangeForCell?.(addr);
          let spanW = cw, spanH = rh, isAnchor = true;
          if (merged) {
            isAnchor = addr.row === merged.start.row && addr.col === merged.start.col;
            if (isAnchor) {
              spanW = 0; for (let c = merged.start.col; c <= merged.end.col; c++) spanW += this.sheet.getColumnWidth(c) * this.zoom;
              spanH = 0; for (let r2 = merged.start.row; r2 <= merged.end.row; r2++) spanH += this.sheet.getRowHeight(r2) * this.zoom;
            }
          }
          const v = this.sheet.getCellValue(addr);
          const style: CellStyle | undefined = this.sheet.getCellStyle(addr);

          // Apply plugin-based heatmap background
          let pluginBg: string | undefined;
          for (const plugin of this.plugins) {
            if (plugin.getCellBackground) {
              const bg = plugin.getCellBackground({ 
                addr, 
                value: v, 
                style, 
                min: this.heatmapRange?.min, 
                max: this.heatmapRange?.max 
              });
              if (bg) { pluginBg = bg; break; }
            }
          }
          
          if (isAnchor && pluginBg) {
            ctx.fillStyle = pluginBg;
            ctx.fillRect(x + 1, y + 1, (merged ? spanW : cw) - 2, (merged ? spanH : rh) - 2);
          } else if (isAnchor && style?.fill) {
            // Resolve Excel color to CSS string
            let fillColor = this.resolveColor(style.fill, '#FFFFFF');
            // Apply color transform plugins
            for (const plugin of this.plugins) {
              if (plugin.transformColor) {
                fillColor = plugin.transformColor(fillColor, { addr, value: v, style });
              }
            }
            ctx.fillStyle = fillColor;
            ctx.fillRect(x + 1, y + 1, (merged ? spanW : cw) - 2, (merged ? spanH : rh) - 2);
          }
          if (style?.border) {
            ctx.lineWidth = 1; const bw = merged ? spanW : cw; const bh = merged ? spanH : rh;
            if (!merged || isAnchor) {
              // Apply color transform to borders
              const transformBorder = (color?: string | ExcelColorSpec) => {
                if (!color) return null;
                // Resolve Excel color first
                let resolved = this.resolveColor(color, '#000000');
                // Apply plugin transforms
                for (const plugin of this.plugins) {
                  if (plugin.transformColor) {
                    resolved = plugin.transformColor(resolved, { addr, value: v, style });
                  }
                }
                return resolved;
              };
              if (style.border.top) { ctx.strokeStyle = transformBorder(style.border.top)!; ctx.beginPath(); ctx.moveTo(x, y + 0.5); ctx.lineTo(x + bw, y + 0.5); ctx.stroke(); }
              if (style.border.bottom) { ctx.strokeStyle = transformBorder(style.border.bottom)!; ctx.beginPath(); ctx.moveTo(x, y + bh + 0.5); ctx.lineTo(x + bw, y + bh + 0.5); ctx.stroke(); }
              if (style.border.left) { ctx.strokeStyle = transformBorder(style.border.left)!; ctx.beginPath(); ctx.moveTo(x + 0.5, y); ctx.lineTo(x + 0.5, y + bh); ctx.stroke(); }
              if (style.border.right) { ctx.strokeStyle = transformBorder(style.border.right)!; ctx.beginPath(); ctx.moveTo(x + bw + 0.5, y); ctx.lineTo(x + bw + 0.5, y + bh); ctx.stroke(); }
            }
          }

          if (isAnchor && v !== null && v !== undefined && v !== '') {
            const fontSize = style?.fontSize ?? this.theme.fontSize;
            const fontFamily = style?.fontFamily ?? this.theme.fontFamily;
            let font = `${style?.italic ? 'italic ' : ''}${style?.bold ? 'bold ' : ''}${fontSize}px ${fontFamily}`;
            
            // Apply custom font transform
            for (const plugin of this.plugins) {
              if (plugin.transformFont) {
                font = plugin.transformFont(font, { addr, value: v, style });
              }
            }
            
            ctx.font = font;
            // Per-cell formatted string cache: address + fmt + primitive identity
            const key = `${addr.row}:${addr.col}|${style?.numberFormat ?? ''}|${typeof v === 'number' ? v : String(v)}`;
            let cached = this.valueFmtCache.get(key);
            let fmtResult: { text: string; color?: string };
            if (cached) {
              fmtResult = JSON.parse(cached);
            } else {
              fmtResult = this.formatCache.formatValue(v, style?.numberFormat);
              this.valueFmtCache.set(key, JSON.stringify(fmtResult));
            }
            const text = fmtResult.text;
            // Apply color from format if present, else use cell style color, then resolve Excel colors and apply plugins
            let textColor = this.resolveColor(fmtResult.color ?? style?.color, '#000000');
            for (const plugin of this.plugins) {
              if (plugin.transformColor) {
                textColor = plugin.transformColor(textColor, { addr, value: v, style });
              }
            }
            ctx.fillStyle = textColor;
            const drawW = merged ? spanW : cw; const drawH = merged ? spanH : rh; const maxWidth = Math.max(0, drawW - 8);
            let tx = x + 4; let ty = y + drawH / 2 + fontSize / 2 - 2;
            const valign = style?.valign ?? 'middle'; if (valign === 'top') ty = y + fontSize + 2; if (valign === 'bottom') ty = y + drawH - 4;
            const align = style?.align ?? this.formatCache.preferredAlign(v, style?.numberFormat);
            let textWidth = this.textCache.get(font, text); if (textWidth === undefined) { textWidth = ctx.measureText(text).width; this.textCache.set(font, text, textWidth); }
            // Shrink-to-fit scaling if specified (tolerate style flag if present)
            const shrinkFlag = (style as any)?.shrinkToFit;
            const shrink = shrinkFlag ? this.formatCache.getTextScale(font, text, maxWidth, textWidth as number) : 1;
            if (shrink !== 1) {
              ctx.save();
              const cx = x + (drawW / 2);
              const cy = y + (drawH / 2);
              ctx.translate(cx, cy);
              ctx.scale(shrink, shrink);
              // After scaling, recompute tx relative to scaled center
              let localTx = -drawW / 2 + 4;
              if (align === 'right') localTx = drawW / 2 - 4 - (textWidth as number);
              else if (align === 'center') localTx = -(textWidth as number) / 2;
              let localTy = (fontSize / 2) - 2; // approx vertical center line
              if (valign === 'top') localTy = -drawH / 2 + fontSize + 2;
              if (valign === 'bottom') localTy = drawH / 2 - 4;
              ctx.beginPath(); ctx.rect(-drawW / 2 + 1, -drawH / 2 + 1, drawW - 2, drawH - 2); ctx.clip();
              ctx.fillText(text, localTx, localTy, maxWidth);
              ctx.restore();
              x += this.sheet.getColumnWidth(col); col++;
              continue;
            }
            if (align === 'right') tx = x + drawW - 4 - (textWidth as number); else if (align === 'center') tx = x + drawW / 2 - (textWidth as number) / 2;
            const wrap = !!style?.wrap; const overflow = style?.textOverflow ?? 'clip';
            ctx.save(); ctx.beginPath(); ctx.rect(x + 1, y + 1, drawW - 2, drawH - 2); ctx.clip();
            if (style?.rotation && style.rotation !== 0) {
              const angle = (style.rotation * Math.PI) / 180; const cx = x + (drawW / 2); const cy = y + (drawH / 2);
              ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle); const rx = -(textWidth as number) / 2; const ry = fontSize / 2; ctx.fillText(text, rx, ry); ctx.restore();
            } else if (!wrap) {
              let toDraw = text;
              if (overflow === 'ellipsis' && (textWidth as number) > maxWidth) {
                let lo = 0, hi = text.length;
                while (lo < hi) { const mid = Math.floor((lo + hi) / 2); const s = text.slice(0, mid) + '…'; const w2 = this.textCache.get(font, s) ?? ctx.measureText(s).width; if (w2 <= maxWidth) { lo = mid + 1; this.textCache.set(font, s, w2); } else { hi = mid; } }
                toDraw = text.slice(0, Math.max(0, lo - 1)) + '…';
              }
              ctx.fillText(toDraw, tx, ty, maxWidth);
            } else {
              const raw = String(text); const paragraphs = raw.split(/\n/); const words = paragraphs.flatMap((p, i) => (i > 0 ? ['\n', ...p.split(/\s+/)] : p.split(/\s+/)));
              const lines: string[] = []; let line = '';
              for (const wtoken of words) { if (wtoken === '\n') { if (line) { lines.push(line); line = ''; } continue; } const candidate = line ? line + ' ' + wtoken : wtoken; const cw = this.textCache.get(font, candidate) ?? ctx.measureText(candidate).width; if (cw <= maxWidth || !line) { line = candidate; this.textCache.set(font, candidate, cw); } else { lines.push(line); line = wtoken; } }
              if (line) lines.push(line);
              let lineY = y + fontSize + 2; if (valign === 'middle') { const totalH = lines.length * (fontSize + 2); lineY = y + (drawH - totalH) / 2 + fontSize; } else if (valign === 'bottom') { const totalH = lines.length * (fontSize + 2); lineY = y + drawH - totalH + fontSize; }
              const startX = align === 'center' ? (x + drawW / 2) : (align === 'right' ? (x + drawW - 4) : (x + 4));
              for (const ln of lines) { let lx = startX; const lw = this.textCache.get(font, ln) ?? ctx.measureText(ln).width; if (align === 'center') lx -= (lw as number) / 2; else if (align === 'right') lx -= (lw as number); ctx.fillText(ln, lx, lineY, maxWidth); lineY += fontSize + 2; if (lineY > y + drawH) break; }
            }
            ctx.restore();
            
            // Plugin after-render hook
            for (const plugin of this.plugins) {
              if (plugin.afterCellRender) {
                plugin.afterCellRender(ctx, { x, y, w: drawW, h: drawH }, { addr, value: v, style });
              }
            }
          }

          // Comment indicator (small red triangle top-right) if comments exist
          const cellObj = (this.sheet as any).getCell?.(addr);
          if (cellObj?.comments?.length) {
            const drawW = merged ? spanW : cw; const drawH = merged ? spanH : rh;
            ctx.save();
            ctx.beginPath();
            const triSize = Math.min(8 * this.zoom, Math.max(6, 6 * this.zoom));
            ctx.moveTo(x + drawW - triSize, y + 1);
            ctx.lineTo(x + drawW - 1, y + 1);
            ctx.lineTo(x + drawW - 1, y + triSize);
            ctx.closePath();
            ctx.fillStyle = '#d40000';
            ctx.fill();
            ctx.restore();
          }

          // Icon overlay rendering
          if (cellObj?.icon) {
            const icon = cellObj.icon; const drawW = merged ? spanW : cw; const drawH = merged ? spanH : rh;
            const size = (icon.size ?? 16) * this.zoom;
            const pad = 2 * this.zoom;
            let ix = x + pad, iy = y + pad;
            switch (icon.position) {
              case 'top-right': ix = x + drawW - size - pad; iy = y + pad; break;
              case 'bottom-left': ix = x + pad; iy = y + drawH - size - pad; break;
              case 'bottom-right': ix = x + drawW - size - pad; iy = y + drawH - size - pad; break;
              case 'center': ix = x + (drawW - size) / 2; iy = y + (drawH - size) / 2; break;
              case 'top-left': default: ix = x + pad; iy = y + pad; break;
            }
            ctx.save();
            if (icon.type === 'emoji') {
              ctx.font = `${size}px ${this.theme.fontFamily}`;
              ctx.fillText(icon.source, ix, iy + size - 4);
            } else if (icon.type === 'builtin') {
              // Simple builtin shapes: e.g., 'warning', 'info'
              ctx.beginPath();
              if (icon.source === 'warning') {
                ctx.fillStyle = '#ffcc00';
                ctx.moveTo(ix + size / 2, iy);
                ctx.lineTo(ix + size, iy + size);
                ctx.lineTo(ix, iy + size);
                ctx.closePath();
                ctx.fill();
              } else if (icon.source === 'info') {
                ctx.fillStyle = '#0078d4';
                ctx.arc(ix + size / 2, iy + size / 2, size / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.font = `${Math.floor(size * 0.6)}px ${this.theme.fontFamily}`;
                ctx.fillText('i', ix + size * 0.35, iy + size * 0.7);
              }
            } else if (icon.type === 'url') {
              // Defer image loading; cache per URL
              const cacheKey = `img:${icon.source}`;
              let img = (this as any)._imageCache?.get(cacheKey);
              if (!img) {
                img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = icon.source;
                (this as any)._imageCache = (this as any)._imageCache || new Map();
                (this as any)._imageCache.set(cacheKey, img);
                img.onload = () => { this.invalidateRect(x, y, drawW, drawH); };
              }
              if (img.complete && img.naturalWidth) {
                ctx.drawImage(img, ix, iy, size, size);
              }
            }
            ctx.restore();
          }
          x += this.sheet.getColumnWidth(col) * this.zoom; col++;
        }
        y += this.sheet.getRowHeight(row) * this.zoom; rowIndex++;
      }

      this.drawLayers('cells', ctx, width, height);

      const sels = this.selections.length ? this.selections : (this.selection ? [this.selection] : []);
      for (const sel of sels) {
        const a = sel.start; const b = sel.end; const r1 = Math.min(a.row, b.row), r2 = Math.max(a.row, b.row); const c1 = Math.min(a.col, b.col), c2 = Math.max(a.col, b.col);
        const rect = this.rectForRange(r1, c1, r2, c2);
        if (rect) { ctx.strokeStyle = selectionColor; ctx.lineWidth = 2; ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2); }
      }
      
      // Draw auto-fill handle on active selection (last one)
      if (sels.length > 0) {
        const activeSel = sels[sels.length - 1];
        const a = activeSel.start; const b = activeSel.end;
        const r1 = Math.min(a.row, b.row), r2 = Math.max(a.row, b.row);
        const c1 = Math.min(a.col, b.col), c2 = Math.max(a.col, b.col);
        const rect = this.rectForRange(r1, c1, r2, c2);
        if (rect) {
          const handleSize = 6;
          ctx.fillStyle = selectionColor;
          ctx.fillRect(rect.x + rect.w - handleSize / 2, rect.y + rect.h - handleSize / 2, handleSize, handleSize);
        }
      }

      this.drawLayers('selection', ctx, width, height);
      this.drawLayers('overlays', ctx, width, height);
      ctx.restore();
    }

    this.drawLayers('after', ctx, width, height);
    this._lastRenderMs = performance.now() - t0;
    this.dirty = null;
    // observability callback
    if (this.options.onRender) {
      try { this.options.onRender({ ms: this._lastRenderMs, regions: this.lastDirtyRects.slice() }); } catch {}
    }
  }

  private rectForRange(r1: number, c1: number, r2: number, c2: number): { x: number; y: number; w: number; h: number } | null {
    const { headerHeight, headerWidth } = this.options;
    let x = headerWidth - this.scrollX; // starting x of col 1 relative to viewport
    for (let c = 1; c < c1; c++) x += this.sheet.getColumnWidth(c) * this.zoom;
    // Y based on visible rows only
    const vis = this.getVisibleRows();
    let y = headerHeight - this.scrollY;
    for (const r of vis) { if (r >= r1) break; y += this.sheet.getRowHeight(r) * this.zoom; }
    let w = 0; for (let c = c1; c <= c2; c++) w += this.sheet.getColumnWidth(c) * this.zoom;
    let h = 0; for (const r of vis) { if (r < r1) continue; if (r > r2) break; h += this.sheet.getRowHeight(r) * this.zoom; }
    const vx = x; const vy = y;
    if (vx + w < headerWidth || vy + h < headerHeight) return null; // off-screen
    return { x: vx, y: vy, w, h };
  }

  // Excel-like column label (1 -> A, 26 -> Z, 27 -> AA)
  private colLabel(n: number): string {
    let s = '';
    while (n > 0) {
      const rem = (n - 1) % 26;
      s = String.fromCharCode(65 + rem) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s || 'A';
  }

  // Map viewport coordinates (client space relative to container) to a cell address.
  cellAt(clientX: number, clientY: number): Address | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const { headerHeight, headerWidth } = this.options;
    if (x < headerWidth || y < headerHeight) return null;
    
    // Calculate starting positions accounting for scroll offset
    let col = 1;
    let scrollRemainX = this.scrollX;
    // Skip columns that are scrolled out of view
    while (scrollRemainX > 0 && col <= this.sheet.colCount) {
      const w = this.sheet.getColumnWidth(col) * this.zoom;
      if (scrollRemainX < w) break;
      scrollRemainX -= w;
      col++;
    }
    
    const visRows = this.getVisibleRows();
    let rowIndex = 0;
    let scrollRemainY = this.scrollY;
    // Skip rows that are scrolled out of view
    while (scrollRemainY > 0 && rowIndex < visRows.length) {
      const h = this.sheet.getRowHeight(visRows[rowIndex]) * this.zoom;
      if (scrollRemainY < h) break;
      scrollRemainY -= h;
      rowIndex++;
    }
    
    // Now walk from the first visible cell, starting with partial offsets
    let cx = headerWidth - scrollRemainX;
    let cy = headerHeight - scrollRemainY;
    
    // Find column
    while (cx <= x && col <= this.sheet.colCount) {
      const w = this.sheet.getColumnWidth(col) * this.zoom;
      if (x < cx + w) break;
      cx += w;
      col++;
    }
    
    // Find row
    while (cy <= y && rowIndex < visRows.length) {
      const h = this.sheet.getRowHeight(visRows[rowIndex]) * this.zoom;
      if (y < cy + h) break;
      cy += h;
      rowIndex++;
    }
    
    const row = visRows[rowIndex];
    if (col > this.sheet.colCount || row == null) return null;
    return { row, col };
  }

  // Hit testing for header/cell areas
  hitTest(clientX: number, clientY: number):
    | { type: 'col-resize'; col: number }
    | { type: 'row-resize'; row: number }
    | { type: 'cell'; addr: Address }
    | { type: 'header-col'; col: number }
    | { type: 'header-row'; row: number }
    | { type: 'fill-handle'; rangeIndex: number }
    | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const { headerHeight, headerWidth } = this.options;
    const threshold = 4; // px proximity to border
    
    // Check auto-fill handle for active selection (last one in multi-range)
    if (this.selections.length > 0) {
      const activeIdx = this.selections.length - 1;
      const sel = this.selections[activeIdx];
      const r1 = Math.min(sel.start.row, sel.end.row);
      const r2 = Math.max(sel.start.row, sel.end.row);
      const c1 = Math.min(sel.start.col, sel.end.col);
      const c2 = Math.max(sel.start.col, sel.end.col);
      const selRect = this.rectForRange(r1, c1, r2, c2);
      if (selRect) {
        const handleSize = 6;
        const hx = selRect.x + selRect.w - handleSize / 2;
        const hy = selRect.y + selRect.h - handleSize / 2;
        if (x >= hx && x <= hx + handleSize && y >= hy && y <= hy + handleSize) {
          return { type: 'fill-handle', rangeIndex: activeIdx };
        }
      }
    }
    
    if (y <= headerHeight && x >= headerWidth) {
      // Column header area
      let cx = headerWidth - this.scrollX; let col = 1;
      while (cx < this.canvas.width / this.dpr && col <= this.sheet.colCount) {
        const w = this.sheet.getColumnWidth(col) * this.zoom;
        const edge = cx + w;
        if (Math.abs(x - edge) <= threshold) return { type: 'col-resize', col };
        if (x >= cx && x < cx + w) return { type: 'header-col', col };
        cx += w; col++;
      }
      return null;
    }
    if (x <= headerWidth && y >= headerHeight) {
      // Row header area
      let cy = headerHeight - this.scrollY; const vis = this.getVisibleRows(); let idx = 0;
      while (cy < this.canvas.height / this.dpr && idx < vis.length) {
        const row = vis[idx];
        const h = this.sheet.getRowHeight(row) * this.zoom;
        const edge = cy + h;
        if (Math.abs(y - edge) <= threshold) return { type: 'row-resize', row };
        if (y >= cy && y < cy + h) return { type: 'header-row', row };
        cy += h; idx++;
      }
      return null;
    }
    const addr = this.cellAt(clientX, clientY);
    return addr ? { type: 'cell', addr } : null;
  }

  private drawLayers(stage: RenderStage, ctx: CanvasRenderingContext2D, width: number, height: number) {
    if (!this.layers.length) return;
    const api = {
      width, height, dpr: this.dpr, options: this.options, sheet: this.sheet,
      getScroll: () => this.getScroll(), rectForRange: (r1: number, c1: number, r2: number, c2: number) => this.rectForRange(r1, c1, r2, c2)
    };
    for (const l of this.layers) if (l.stage === stage) l.draw(this.ctx, api);
  }

  // ==================== Event System ====================

  private handleClick = (e: MouseEvent) => {
    const hit = this.hitTest(e.clientX, e.clientY);
    if (!hit) return;
    if (hit.type === 'header-col') {
      const col = hit.col;
      this.setSelections([{ start: { row: 1, col }, end: { row: this.sheet.rowCount, col } }]);
      return;
    }
    if (hit.type === 'header-row') {
      const row = hit.row;
      this.setSelections([{ start: { row, col: 1 }, end: { row, col: this.sheet.colCount } }]);
      return;
    }
    if (hit.type !== 'cell') return;
    const addr = hit.addr;
    
    const bounds = this.getCellBounds(addr);
    if (!bounds) return;
    
    const now = Date.now();
    const isDoubleClick = this.clickStartCell && 
      addr.row === this.clickStartCell.row && 
      addr.col === this.clickStartCell.col && 
      now - this.clickStartTime < 300;
    
    if (isDoubleClick) {
      this.sheet['events'].emit({
        type: 'cell-double-click',
        event: { address: addr, bounds, originalEvent: e },
      });
      this.clickStartCell = null;
    } else {
      this.sheet['events'].emit({
        type: 'cell-click',
        event: { address: addr, bounds, originalEvent: e },
      });
      this.clickStartCell = addr;
      this.clickStartTime = now;
    }
  };

  private handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    const hit = this.hitTest(e.clientX, e.clientY);
    if (!hit) return;
    // Header column filter menu
    if (hit.type === 'header-col' && this.options.onRequestColumnFilterMenu) {
      const col = hit.col;
      const rect = this.canvas.getBoundingClientRect();
      const anchor = { x: e.clientX - rect.left, y: this.options.headerHeight };
  // Use 'filtered' domain so this column's own filter does not hide its possible values, but other column filters still narrow.
  const values = this.getColumnDistinctValues(col, { domain: 'filtered' });
      const apply = (selected: string[]) => {
        // If all values selected, clear filter (no-op visually) so icon/state resets
        if (selected.length === values.length) {
          this.sheet.clearColumnFilter(col);
        } else {
          this.sheet.setColumnFilter(col, { type: 'in', value: selected });
        }
        this.redraw();
      };
      const clear = () => { this.sheet.clearColumnFilter(col); this.redraw(); };
      this.options.onRequestColumnFilterMenu({ col, anchor, values, apply, clear });
      return;
    }
    const addr = hit.type === 'cell' ? hit.addr : null;
    if (!addr) return;
    
    const bounds = this.getCellBounds(addr);
    if (!bounds) return;
    
    this.sheet['events'].emit({
      type: 'cell-right-click',
      event: { address: addr, bounds, originalEvent: e },
    });
  };


  private handleMouseMove = (e: MouseEvent) => {
    const addr = this.cellAt(e.clientX, e.clientY);
    
    if (!addr) {
      if (this.hoveredCell) {
        this.sheet['events'].emit({
          type: 'cell-hover-end',
          address: this.hoveredCell,
        });
        this.hoveredCell = null;
      }
      return;
    }
    
    if (!this.hoveredCell || addr.row !== this.hoveredCell.row || addr.col !== this.hoveredCell.col) {
      if (this.hoveredCell) {
        this.sheet['events'].emit({
          type: 'cell-hover-end',
          address: this.hoveredCell,
        });
      }
      
      const bounds = this.getCellBounds(addr);
      if (bounds) {
        this.sheet['events'].emit({
          type: 'cell-hover',
          event: { address: addr, bounds, originalEvent: e },
        });
      }
      
      this.hoveredCell = addr;
    }
  };

  private setupEventListeners() {
    this.canvas.addEventListener('click', this.handleClick);
    this.canvas.addEventListener('contextmenu', this.handleContextMenu);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
  }

  private removeEventListeners() {
    this.canvas.removeEventListener('click', this.handleClick);
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
  }

  // ==================== Navigation API ====================

  /**
   * Get cell bounds in viewport coordinates
   */
  getCellBounds(addr: Address): { x: number; y: number; width: number; height: number } | null {
    const { firstRow, firstCol, xOffset, yOffset } = this.visibleRange();
    
    // Check if cell is in visible range
    if (addr.row < firstRow || addr.col < firstCol) return null;
    
    let x = xOffset;
    let y = yOffset;
    
    // Calculate X position
    for (let c = firstCol; c < addr.col; c++) {
      x += this.sheet.getColumnWidth(c);
    }
    
    // Calculate Y position
    for (let r = firstRow; r < addr.row; r++) {
      y += this.sheet.getRowHeight(r);
    }
    
    const width = this.sheet.getColumnWidth(addr.col);
    const height = this.sheet.getRowHeight(addr.row);
    
    // Check if fully visible
    const viewport = this.getViewportSize();
    if (x + width > this.options.headerWidth + viewport.width || 
        y + height > this.options.headerHeight + viewport.height) {
      return null; // Partially off-screen
    }
    
    return { x, y, width, height };
  }

  /**
   * Scroll to make a cell visible
   */
  scrollToCell(addr: Address, align: 'start' | 'center' | 'end' | 'nearest' = 'nearest'): void {
    // Calculate cell position in content space
    let cellX = 0;
    for (let c = 1; c < addr.col; c++) cellX += this.sheet.getColumnWidth(c) * this.zoom;
    
    let cellY = 0;
    for (let r = 1; r < addr.row; r++) cellY += this.sheet.getRowHeight(r) * this.zoom;
    
    const cellWidth = this.sheet.getColumnWidth(addr.col) * this.zoom;
    const cellHeight = this.sheet.getRowHeight(addr.row) * this.zoom;
    const viewport = this.getViewportSize();
    
    let newScrollX = this.scrollX;
    let newScrollY = this.scrollY;
    
    // Horizontal scrolling
    if (align === 'start') {
      newScrollX = cellX;
    } else if (align === 'center') {
      newScrollX = cellX - viewport.width / 2 + cellWidth / 2;
    } else if (align === 'end') {
      newScrollX = cellX - viewport.width + cellWidth;
    } else {
      // 'nearest' - only scroll if not visible
      if (cellX < this.scrollX) {
        newScrollX = cellX;
      } else if (cellX + cellWidth > this.scrollX + viewport.width) {
        newScrollX = cellX + cellWidth - viewport.width;
      }
    }
    
    // Vertical scrolling
    if (align === 'start') {
      newScrollY = cellY;
    } else if (align === 'center') {
      newScrollY = cellY - viewport.height / 2 + cellHeight / 2;
    } else if (align === 'end') {
      newScrollY = cellY - viewport.height + cellHeight;
    } else {
      // 'nearest' - only scroll if not visible
      if (cellY < this.scrollY) {
        newScrollY = cellY;
      } else if (cellY + cellHeight > this.scrollY + viewport.height) {
        newScrollY = cellY + cellHeight - viewport.height;
      }
    }
    
    this.setScroll(newScrollX, newScrollY);
  }

  /**
   * Get currently visible cell range
   */
  getVisibleRange(): { start: Address; end: Address } {
    const { firstRow, firstCol, firstRowIndex } = this.visibleRange();
    const viewport = this.getViewportSize();
    const vis = this.getVisibleRows();
    let idx = firstRowIndex ?? 0;
    let y = this.options.headerHeight;
    while (y < viewport.height + this.options.headerHeight && idx < vis.length) {
      y += this.sheet.getRowHeight(vis[idx]) * this.zoom; idx++;
    }
    const lastRow = vis[Math.min(idx, vis.length - 1)] ?? firstRow;
    
    let lastCol = firstCol;
    let x = this.options.headerWidth;
    while (x < viewport.width + this.options.headerWidth && lastCol <= this.sheet.colCount) {
      x += this.sheet.getColumnWidth(lastCol) * this.zoom;
      lastCol++;
    }
    
    return {
      start: { row: firstRow, col: firstCol },
      end: { row: lastRow, col: Math.min(lastCol, this.sheet.colCount) },
    };
  }
}

function stageOrder(s: RenderStage): number {
  const order: RenderStage[] = ['background', 'grid', 'headers', 'cells', 'selection', 'overlays', 'after'];
  return order.indexOf(s);
}

function unionRect(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const r = Math.max(a.x + a.w, b.x + b.w);
  const btm = Math.max(a.y + a.h, b.y + b.h);
  return { x, y, w: r - x, h: btm - y };
}
