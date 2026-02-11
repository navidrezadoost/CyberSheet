# Weeks 10-13: Formula Completion to 99-100% Coverage

**Status**: 📋 Planning Phase  
**Target**: 99-100% formula coverage (all popular non-VBA Excel functions)  
**Timeline**: 18-25 working days (4-5 weeks)  
**Strategy**: Priority-driven formula implementation

---

## 📊 Current Status

✅ **Completed**: 
- Week 1-8: Core spreadsheet engine + 300+ formulas
- Week 9 Days 1-3: Autocomplete, syntax highlighting, error tooltips
- Total Tests: 1872 passing
- Formula Coverage: ~85-90% (basic statistical, financial, text, date)

🎯 **Goal**:
- Formula Coverage: 99-100% (add ~80-120 advanced functions)
- Total Tests: 3,000-3,500 (add ~1,000-1,500 tests)
- New Code: 3,000-5,000 lines
- Timeline: 4-5 weeks (19-28 working days)

🔄 **Remaining**:
- Week 9 Days 4-5: Spill visualization, integration testing (optional - can defer)
- Week 10: Advanced Statistics + Information functions ⭐ **START HERE**
- Week 11: Advanced Array and synthesis functions
- Week 12: Advanced Text and search functions
- Week 13: Database functions + Pivot-like basics
- Week 14 (optional): Export/Import polish + meta-formulas

---

## 📋 Priority & Strategy

### Why Formula Completion First?

1. **User Impact**: 99% of spreadsheet users need formulas, only 20% need dark mode
2. **Excel Compatibility**: Complete formula library = true Excel replacement
3. **Professional Use**: Statistics, arrays, and database functions critical for business
4. **Foundation**: Formulas are harder to add later; UI polish can be incremental

### Implementation Strategy

- **Current Velocity**: ~150-200 lines + 40-60 tests per day
- **Test-First Approach**: Write tests before implementation
- **Incremental Integration**: Add to existing formula engine
- **Documentation**: Update autocomplete and docs as we go

---

## 🗓️ Week 10: Advanced Statistics + Information (5-7 days)

**Priority**: ⭐⭐⭐ **VERY HIGH** - Most requested by data analysts  
**Branch**: `week10-advanced-statistics`  
**Estimated**: 550-800 lines + 170-250 tests

### Day 1-2: Percentile, Quartile, Ranking (200-300 lines, 60-90 tests)

#### **Task 1.1: PERCENTILE.INC / PERCENTILE.EXC** (2 hours)
```typescript
// packages/core/src/theme/ThemeManager.ts
export interface Theme {
  name: 'light' | 'dark';
  colors: {
    // Background colors
    background: string;           // Canvas background
    cellBackground: string;       // Default cell
    altCellBackground: string;    // Zebra striping
    headerBackground: string;     // Column/row headers
    
    // Text colors
    text: string;                 // Primary text
    textSecondary: string;        // Secondary text
    textDisabled: string;         // Disabled text
    
    // Border colors
    gridLines: string;            // Grid lines
    cellBorder: string;           // Cell borders
    activeBorder: string;         // Selected cell
    
    // UI elements
    selection: string;            // Selection overlay
    hover: string;                // Hover state
    error: string;                // Error highlighting
    warning: string;              // Warning states
    
    // Formula colors
    syntax: {
      function: string;
      number: string;
      string: string;
      operator: string;
      reference: string;
      error: string;
    };
  };
}

export const LIGHT_THEME: Theme = {
  name: 'light',
  colors: {
    background: '#FFFFFF',
    cellBackground: '#FFFFFF',
    altCellBackground: '#F9F9F9',
    headerBackground: '#F5F5F5',
    text: '#212121',
    textSecondary: '#757575',
    textDisabled: '#BDBDBD',
    gridLines: '#E0E0E0',
    cellBorder: '#BDBDBD',
    activeBorder: '#1976D2',
    selection: 'rgba(25, 118, 210, 0.15)',
    hover: 'rgba(0, 0, 0, 0.04)',
    error: '#FFEBEE',
    warning: '#FFF3E0',
    syntax: {
      function: '#1976D2',
      number: '#388E3C',
      string: '#D32F2F',
      operator: '#F57C00',
      reference: '#7B1FA2',
      error: '#C62828',
    },
  },
};

export const DARK_THEME: Theme = {
  name: 'dark',
  colors: {
    background: '#121212',
    cellBackground: '#1E1E1E',
    altCellBackground: '#252525',
    headerBackground: '#2C2C2C',
    text: '#E0E0E0',
    textSecondary: '#AAAAAA',
    textDisabled: '#666666',
    gridLines: '#404040',
    cellBorder: '#555555',
    activeBorder: '#64B5F6',
    selection: 'rgba(100, 181, 246, 0.25)',
    hover: 'rgba(255, 255, 255, 0.08)',
    error: '#5D1F1F',
    warning: '#5D4E1F',
    syntax: {
      function: '#64B5F6',
      number: '#81C784',
      string: '#EF5350',
      operator: '#FFB74D',
      reference: '#BA68C8',
      error: '#EF5350',
    },
  },
};
```

**Expected Output**: `ThemeManager.ts` (150 lines), 8 tests

---

#### **Task 1.2: Theme Toggle Component** (45 min)
```typescript
// packages/core/src/theme/ThemeToggle.ts
export class ThemeToggle {
  private currentTheme: Theme;
  private listeners: ((theme: Theme) => void)[] = [];
  
  constructor(initialTheme: 'light' | 'dark' = 'light') {
    // Load from localStorage or use initial
    const saved = localStorage.getItem('cybersheet-theme');
    this.currentTheme = saved === 'dark' ? DARK_THEME : LIGHT_THEME;
    
    // Apply theme immediately
    this.applyTheme(this.currentTheme);
  }
  
  toggle(): void {
    const newTheme = this.currentTheme.name === 'light' 
      ? DARK_THEME 
      : LIGHT_THEME;
    this.setTheme(newTheme);
  }
  
  setTheme(theme: Theme): void {
    this.currentTheme = theme;
    this.applyTheme(theme);
    localStorage.setItem('cybersheet-theme', theme.name);
    this.notifyListeners(theme);
  }
  
  private applyTheme(theme: Theme): void {
    // Update CSS variables
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      if (typeof value === 'string') {
        root.style.setProperty(`--cs-${key}`, value);
      }
    });
  }
  
  onChange(listener: (theme: Theme) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }
}
```

**Expected Output**: `ThemeToggle.ts` (120 lines), 7 tests

---

#### **Task 1.3: Renderer Integration** (45 min)
```typescript
// packages/renderer-canvas/src/themed-renderer.ts
export class ThemedCanvasRenderer extends CanvasRenderer {
  private theme: Theme;
  private themeToggle: ThemeToggle;
  
  constructor(container: HTMLElement, sheet: Sheet, options?: RendererOptions) {
    super(container, sheet, options);
    
    this.themeToggle = new ThemeToggle();
    this.theme = this.themeToggle.getCurrentTheme();
    
    // Listen for theme changes
    this.themeToggle.onChange((theme) => {
      this.theme = theme;
      this.invalidate(); // Re-render with new colors
    });
  }
  
  protected renderCell(ctx: CanvasRenderingContext2D, cell: Cell): void {
    // Use theme colors
    ctx.fillStyle = this.theme.colors.cellBackground;
    ctx.strokeStyle = this.theme.colors.cellBorder;
    
    // Apply syntax highlighting colors for formulas
    if (cell.formula) {
      this.renderFormulaWithSyntax(ctx, cell.formula, this.theme.colors.syntax);
    }
    
    // Continue with normal rendering...
  }
}
```

**Expected Output**: `themed-renderer.ts` (180 lines), 10 tests

---

### Day 1 Afternoon: Zoom Controls (1.5 hours)

#### **Task 2.1: Zoom Manager** (45 min)
```typescript
// packages/core/src/zoom/ZoomManager.ts
export class ZoomManager {
  private zoomLevel: number = 1.0;
  private minZoom: number = 0.5;
  private maxZoom: number = 2.0;
  private zoomSteps: number[] = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
  private listeners: ((zoom: number) => void)[] = [];
  
  zoomIn(): void {
    const currentIdx = this.zoomSteps.indexOf(this.zoomLevel);
    if (currentIdx < this.zoomSteps.length - 1) {
      this.setZoom(this.zoomSteps[currentIdx + 1]);
    }
  }
  
  zoomOut(): void {
    const currentIdx = this.zoomSteps.indexOf(this.zoomLevel);
    if (currentIdx > 0) {
      this.setZoom(this.zoomSteps[currentIdx - 1]);
    }
  }
  
  resetZoom(): void {
    this.setZoom(1.0);
  }
  
  setZoom(level: number): void {
    const clamped = Math.max(this.minZoom, Math.min(this.maxZoom, level));
    if (clamped !== this.zoomLevel) {
      this.zoomLevel = clamped;
      this.notifyListeners(clamped);
    }
  }
  
  getZoom(): number {
    return this.zoomLevel;
  }
}
```

**Expected Output**: `ZoomManager.ts` (100 lines), 8 tests

---

#### **Task 2.2: Canvas Scaling** (45 min)
```typescript
// packages/renderer-canvas/src/zoom-renderer.ts
export class ZoomableCanvasRenderer extends ThemedCanvasRenderer {
  private zoomManager: ZoomManager;
  
  constructor(container: HTMLElement, sheet: Sheet, options?: RendererOptions) {
    super(container, sheet, options);
    
    this.zoomManager = new ZoomManager();
    this.setupZoomHandlers();
  }
  
  private setupZoomHandlers(): void {
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          this.zoomManager.zoomIn();
        } else if (e.key === '-') {
          e.preventDefault();
          this.zoomManager.zoomOut();
        } else if (e.key === '0') {
          e.preventDefault();
          this.zoomManager.resetZoom();
        }
      }
    });
    
    // Listen for zoom changes
    this.zoomManager.onChange((zoom) => {
      this.applyZoom(zoom);
    });
  }
  
  private applyZoom(zoom: number): void {
    // Scale canvas
    const dpr = window.devicePixelRatio || 1;
    const scaledDpr = dpr * zoom;
    
    this.canvas.width = this.container.clientWidth * scaledDpr;
    this.canvas.height = this.container.clientHeight * scaledDpr;
    
    this.ctx.scale(scaledDpr, scaledDpr);
    this.invalidate();
  }
}
```

**Expected Output**: `zoom-renderer.ts` (150 lines), 9 tests

---

### Day 2: Advanced Conditional Formatting (1.5 hours)

#### **Task 3.1: Conditional Formatting Engine** (1 hour)
```typescript
// packages/core/src/formatting/ConditionalFormatting.ts
export interface ColorScaleRule {
  type: 'color-scale';
  minColor: string;
  midColor?: string;
  maxColor: string;
  minValue?: number;
  midValue?: number;
  maxValue?: number;
}

export interface DataBarRule {
  type: 'data-bar';
  color: string;
  gradient: boolean;
  showValue: boolean;
  minValue?: number;
  maxValue?: number;
}

export interface IconSetRule {
  type: 'icon-set';
  iconSet: 'arrows' | 'traffic-lights' | 'flags' | 'stars';
  thresholds: number[];
  reverseOrder: boolean;
}

export type ConditionalRule = ColorScaleRule | DataBarRule | IconSetRule;

export class ConditionalFormattingEngine {
  applyRule(value: number, rule: ConditionalRule): RenderStyle {
    switch (rule.type) {
      case 'color-scale':
        return this.applyColorScale(value, rule);
      case 'data-bar':
        return this.applyDataBar(value, rule);
      case 'icon-set':
        return this.applyIconSet(value, rule);
    }
  }
  
  private applyColorScale(value: number, rule: ColorScaleRule): RenderStyle {
    const { minColor, midColor, maxColor, minValue, midValue, maxValue } = rule;
    
    // Interpolate between colors
    const color = this.interpolateColor(value, minValue!, maxValue!, minColor, maxColor);
    
    return { backgroundColor: color };
  }
  
  private interpolateColor(value: number, min: number, max: number, 
                          startColor: string, endColor: string): string {
    const ratio = (value - min) / (max - min);
    // RGB interpolation...
    return `rgb(${r}, ${g}, ${b})`;
  }
}
```

**Expected Output**: `ConditionalFormatting.ts` (250 lines), 15 tests

---

## 📦 Track 2: Complete Export/Import (5-6 hours)

### Day 3: XLSX with Charts (3 hours)

#### **Task 4.1: Chart Export** (1.5 hours)
```typescript
// packages/io-xlsx/src/chart-export.ts
export interface ChartDefinition {
  type: 'line' | 'bar' | 'pie' | 'scatter';
  title: string;
  series: ChartSeries[];
  legend: LegendOptions;
  position: { row: number; col: number; width: number; height: number };
}

export interface ChartSeries {
  name: string;
  dataRange: string;  // e.g., "Sheet1!A2:A10"
  color?: string;
}

export class ChartExporter {
  exportChart(workbook: ExcelJS.Workbook, sheet: ExcelJS.Worksheet, 
              chart: ChartDefinition): void {
    // Add chart to worksheet
    const excelChart = sheet.addImage({
      type: chart.type,
      position: chart.position,
    });
    
    // Configure series
    chart.series.forEach((series) => {
      excelChart.addSeries({
        name: series.name,
        categories: this.parseRange(series.dataRange),
        values: this.parseRange(series.dataRange),
        color: series.color,
      });
    });
  }
}
```

**Expected Output**: `chart-export.ts` (300 lines), 18 tests

---

#### **Task 4.2: Chart Import** (1.5 hours)
```typescript
// packages/io-xlsx/src/chart-import.ts
export class ChartImporter {
  async importCharts(worksheet: ExcelJS.Worksheet): Promise<ChartDefinition[]> {
    const charts: ChartDefinition[] = [];
    
    // ExcelJS doesn't fully support chart reading, so we parse XML
    const chartRels = worksheet.rels?.filter(r => r.type === 'chart');
    
    for (const rel of chartRels) {
      const chartXml = await this.readChartXml(rel.target);
      const chart = this.parseChartXml(chartXml);
      charts.push(chart);
    }
    
    return charts;
  }
  
  private parseChartXml(xml: string): ChartDefinition {
    // Parse chart XML structure
    // Extract type, series, legend, etc.
    return {
      type: 'line',
      title: '',
      series: [],
      legend: {},
      position: { row: 0, col: 0, width: 0, height: 0 },
    };
  }
}
```

**Expected Output**: `chart-import.ts` (250 lines), 15 tests

---

### Day 4: Basic Pivot Tables (2.5 hours)

#### **Task 5.1: Pivot Export** (1.5 hours)
```typescript
// packages/io-xlsx/src/pivot-export.ts
export interface PivotTableDefinition {
  name: string;
  sourceRange: string;      // Data source
  targetLocation: string;   // Where pivot appears
  rowFields: string[];      // Row grouping
  columnFields: string[];   // Column grouping
  dataFields: PivotDataField[];
}

export interface PivotDataField {
  field: string;
  aggregation: 'sum' | 'count' | 'average' | 'min' | 'max';
  displayName: string;
}

export class PivotExporter {
  exportPivot(workbook: ExcelJS.Workbook, pivot: PivotTableDefinition): void {
    // Create pivot cache
    const pivotCache = workbook.addPivotCache({
      source: pivot.sourceRange,
    });
    
    // Create pivot table
    const pivotTable = workbook.addPivotTable({
      name: pivot.name,
      cache: pivotCache,
      location: pivot.targetLocation,
      rowFields: pivot.rowFields,
      columnFields: pivot.columnFields,
      dataFields: pivot.dataFields,
    });
  }
}
```

**Expected Output**: `pivot-export.ts` (280 lines), 17 tests

---

## 🧪 Track 3: Cross-Browser Testing (3-4 hours)

### Day 5 Morning: Safari & Firefox Testing (3 hours)

#### **Task 6.1: Playwright Cross-Browser Config** (30 min)
```typescript
// playwright.config.ts (update)
export default defineConfig({
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile browsers
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
  ],
});
```

**Expected Output**: Updated config (50 lines)

---

#### **Task 6.2: Visual Regression Tests** (1.5 hours)
```typescript
// e2e/visual-regression.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test.describe.parallel();
  
  test('renders basic spreadsheet', async ({ page, browserName }) => {
    await page.goto('/');
    
    // Take screenshot
    const screenshot = await page.screenshot();
    
    // Compare with baseline
    expect(screenshot).toMatchSnapshot(`spreadsheet-${browserName}.png`, {
      maxDiffPixels: 100,
    });
  });
  
  test('renders formulas with syntax highlighting', async ({ page, browserName }) => {
    await page.goto('/');
    await page.fill('[data-testid="cell-A1"]', '=SUM(A2:A10)');
    await page.keyboard.press('Enter');
    
    const screenshot = await page.screenshot();
    expect(screenshot).toMatchSnapshot(`formula-${browserName}.png`);
  });
  
  test('dark mode rendering', async ({ page, browserName }) => {
    await page.goto('/');
    await page.click('[data-testid="theme-toggle"]');
    
    const screenshot = await page.screenshot();
    expect(screenshot).toMatchSnapshot(`dark-mode-${browserName}.png`);
  });
});
```

**Expected Output**: `visual-regression.spec.ts` (300 lines), 15 tests × 3 browsers = 45 tests

---

#### **Task 6.3: Performance Benchmarks** (1 hour)
```typescript
// e2e/performance.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Performance Benchmarks', () => {
  test('renders 10k cells in < 500ms', async ({ page, browserName }) => {
    await page.goto('/');
    
    const startTime = Date.now();
    
    // Load 10k cell sheet
    await page.evaluate(() => {
      window.loadLargeSheet(100, 100); // 10k cells
    });
    
    await page.waitForSelector('[data-testid="render-complete"]');
    
    const endTime = Date.now();
    const renderTime = endTime - startTime;
    
    console.log(`${browserName}: Rendered 10k cells in ${renderTime}ms`);
    expect(renderTime).toBeLessThan(500);
  });
  
  test('maintains 60fps during scrolling', async ({ page, browserName }) => {
    await page.goto('/');
    
    // Start FPS monitoring
    const fps = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let frameCount = 0;
        const startTime = performance.now();
        
        function countFrames() {
          frameCount++;
          if (performance.now() - startTime < 1000) {
            requestAnimationFrame(countFrames);
          } else {
            resolve(frameCount);
          }
        }
        
        requestAnimationFrame(countFrames);
      });
    });
    
    console.log(`${browserName}: Average FPS: ${fps}`);
    expect(fps).toBeGreaterThan(55); // Allow 5fps variance
  });
});
```

**Expected Output**: `performance.spec.ts` (250 lines), 10 tests

---

## 📊 Summary Statistics

### Code Production Estimate
```
Track 1 (UI Polishes):
├── ThemeManager.ts:              150 lines
├── ThemeToggle.ts:               120 lines
├── themed-renderer.ts:           180 lines
├── ZoomManager.ts:               100 lines
├── zoom-renderer.ts:             150 lines
├── ConditionalFormatting.ts:     250 lines
├── Tests:                        ~400 lines
└── Total:                        1,350 lines

Track 2 (Export/Import):
├── chart-export.ts:              300 lines
├── chart-import.ts:              250 lines
├── pivot-export.ts:              280 lines
├── pivot-import.ts:              200 lines
├── Tests:                        ~500 lines
└── Total:                        1,530 lines

Track 3 (Cross-Browser):
├── playwright.config.ts:         50 lines
├── visual-regression.spec.ts:    300 lines
├── performance.spec.ts:          250 lines
└── Total:                        600 lines

GRAND TOTAL:                      3,480 lines
```

### Test Count
```
UI Polishes:                      35-40 tests
Export/Import:                    50-55 tests
Cross-Browser:                    25-30 tests (×3 browsers = 75-90 actual runs)
-------------------------------------------
TOTAL:                            110-125 tests
```

### Timeline
```
Day 1:  Dark Mode + Zoom (3.5 hours)
Day 2:  Conditional Formatting (1.5 hours)
Day 3:  Charts Export/Import (3 hours)
Day 4:  Pivot Tables (2.5 hours)
Day 5:  Cross-Browser Testing (3 hours)
-------------------------------------------
TOTAL:  13.5 hours
```

---

## 🎯 Success Criteria

- [ ] Dark mode with complete color palette
- [ ] Zoom controls (50%-200%) with keyboard shortcuts
- [ ] Advanced conditional formatting (color scales, data bars, icon sets)
- [ ] XLSX export/import with charts (Line, Bar, Pie, Scatter)
- [ ] Basic pivot table export/import
- [ ] Visual regression tests pass on Safari, Firefox, Chrome
- [ ] Performance benchmarks pass (< 500ms render, > 55fps scroll)
- [ ] All tests passing (110-125 new tests)

---

## 🚀 Getting Started

### Recommended Order
1. Start with **Dark Mode** (foundational for UI)
2. Then **Zoom** (builds on dark mode)
3. **Conditional Formatting** (independent feature)
4. **Charts** (most complex export/import)
5. **Pivots** (similar to charts)
6. **Cross-Browser Testing** (validates everything)

### Commands
```bash
# Start Day 1
git checkout -b week10-dark-mode-zoom
npm test -- --watch packages/core/__tests__/theme

# Start Day 3
git checkout -b week10-charts-export
npm test -- --watch packages/io-xlsx/__tests__/chart

# Run cross-browser tests
npx playwright test --project=chromium,firefox,webkit
```

---

## 📝 Notes

- **Dark Mode**: Use CSS variables for easy theme switching
- **Zoom**: Handle DPI scaling properly (multiply by `devicePixelRatio`)
- **Charts**: ExcelJS has limited chart support, may need custom XML parsing
- **Pivots**: Focus on simple aggregations first (SUM, COUNT, AVG)
- **Testing**: Use Playwright's `toMatchSnapshot()` for visual regression

---

**Ready to start? Let me know which track you'd like to begin with!** 🚀
