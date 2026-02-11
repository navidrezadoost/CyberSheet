# CyberSheet v1.0 Roadmap (1-3 Months)

**Target**: Production-ready Excel-compatible spreadsheet engine  
**Timeline**: January - March 2026  
**Estimated Code**: 2,000-3,000 new lines  
**Current State**: MVP complete, 11,300 lines of TypeScript

---

## 🎯 Phase Overview

| Phase | Focus | Timeline | Lines of Code |
|-------|-------|----------|---------------|
| **Phase 1** | Formula Extension | Weeks 1-3 | 800-1,000 |
| **Phase 2** | Data Validation & Conditional Formatting | Weeks 4-6 | 500-700 |
| **Phase 3** | Advanced Sort/Filter | Weeks 7-8 | 300-500 |
| **Phase 4** | Print Layout & Export | Weeks 9-10 | 400 |
| **Phase 5** | Testing & Benchmarking | Weeks 11-12 | N/A |

---

## 📊 Phase 1: Formula Extension (HIGH PRIORITY)

**Goal**: Expand from 100 functions to 300+ Excel functions  
**Timeline**: Weeks 1-3 (21 days)  
**Estimated Code**: 800-1,000 lines

### 1.1 Lookup Functions (Week 1)
**New Functions**: 15 functions  
**Lines**: 200-250

#### Implementation Tasks:
- [ ] **XLOOKUP** - Modern replacement for VLOOKUP/HLOOKUP
  - Search modes: exact, approximate, next smallest/largest
  - Match modes: exact, wildcard, binary search
  - Not-found handling with default values
  ```typescript
  XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found], [match_mode], [search_mode])
  ```

- [ ] **INDEX/MATCH** combination
  - INDEX: Return value from array by row/column
  - MATCH: Find position of value in array
  - Support for 2D arrays
  ```typescript
  INDEX(array, row_num, [column_num])
  MATCH(lookup_value, lookup_array, [match_type])
  ```

- [ ] **HLOOKUP** - Horizontal lookup
  ```typescript
  HLOOKUP(lookup_value, table_array, row_index_num, [range_lookup])
  ```

- [ ] **VLOOKUP improvements**
  - Currently: Simplified exact match only
  - Add: Approximate match, sorted arrays, binary search
  - Add: Multiple column returns

- [ ] **LOOKUP** - Generic lookup function

- [ ] **XMATCH** - Advanced match function with modes

- [ ] **CHOOSE** - Return value from list by index
  ```typescript
  CHOOSE(index_num, value1, [value2], ...)
  ```

- [ ] **OFFSET** - Return range offset from reference
  ```typescript
  OFFSET(reference, rows, cols, [height], [width])
  ```

- [ ] **INDIRECT** - Return reference from text string
  ```typescript
  INDIRECT(ref_text, [a1])
  ```

#### File Changes:
```
packages/core/src/FormulaEngine.ts
  - Add lookupFunctions section (200-250 lines)
  - Implement binary search for sorted arrays
  - Add approximate match logic
```

---

### 1.2 Dynamic Array Functions (Week 2)
**New Functions**: 10 functions  
**Lines**: 300-400

#### Implementation Tasks:
- [ ] **FILTER** - Filter array by conditions
  ```typescript
  FILTER(array, include, [if_empty])
  // Example: FILTER(A1:B10, C1:C10>5)
  ```

- [ ] **SORT** - Sort array by columns
  ```typescript
  SORT(array, [sort_index], [sort_order], [by_col])
  // Example: SORT(A1:C10, 2, -1)  // Sort by column 2, descending
  ```

- [ ] **SORTBY** - Sort by multiple columns
  ```typescript
  SORTBY(array, by_array1, [sort_order1], [by_array2], [sort_order2], ...)
  ```

- [ ] **UNIQUE** - Extract unique values
  ```typescript
  UNIQUE(array, [by_col], [exactly_once])
  ```

- [ ] **SEQUENCE** - Generate sequence of numbers
  ```typescript
  SEQUENCE(rows, [columns], [start], [step])
  // Example: SEQUENCE(10, 1, 1, 2) = 1,3,5,7,9,11,13,15,17,19
  ```

- [ ] **RANDARRAY** - Generate random array
  ```typescript
  RANDARRAY([rows], [columns], [min], [max], [whole_number])
  ```

- [ ] **TRANSPOSE** - Transpose array (rows ↔ columns)
  ```typescript
  TRANSPOSE(array)
  ```

- [ ] **VSTACK** - Stack arrays vertically
  ```typescript
  VSTACK(array1, [array2], ...)
  ```

- [ ] **HSTACK** - Stack arrays horizontally
  ```typescript
  HSTACK(array1, [array2], ...)
  ```

- [ ] **WRAPROWS/WRAPCOLS** - Wrap 1D array into 2D

#### Spilled Range Support:
- [ ] Implement spill detection (formula fills multiple cells)
- [ ] Add `#SPILL!` error when blocked
- [ ] Track spilled ranges in Worksheet
- [ ] Render spilled cells with special border (blue dashed)
- [ ] Handle spilled range references (e.g., `A1#`)

#### File Changes:
```
packages/core/src/FormulaEngine.ts
  - Add arrayFunctions section (200-250 lines)
  - Add spill engine logic (100 lines)

packages/core/src/worksheet.ts
  - Track spilled ranges (50 lines)
  - Add getSpilledRange() method

packages/renderer-canvas/src/CanvasRenderer.ts
  - Render spilled cell borders (50 lines)
```

---

### 1.3 Modern Excel Functions (Week 3)
**New Functions**: 25 functions  
**Lines**: 300-350

#### LAMBDA & LET (Advanced):
- [ ] **LAMBDA** - Create custom functions
  ```typescript
  LAMBDA(parameter1, [parameter2], calculation)
  // Example: =LAMBDA(x, x*2)(5) = 10
  ```

- [ ] **LET** - Assign names to calculations
  ```typescript
  LET(name1, value1, [name2], [value2], calculation)
  // Example: =LET(x, A1+B1, y, C1*2, x+y)
  ```

#### Financial Functions (10):
- [ ] **NPV** - Net present value
- [ ] **IRR** - Internal rate of return
- [ ] **PMT** - Payment for loan
- [ ] **PV** - Present value
- [ ] **FV** - Future value
- [ ] **RATE** - Interest rate per period
- [ ] **NPER** - Number of periods
- [ ] **IPMT** - Interest payment for period
- [ ] **PPMT** - Principal payment for period
- [ ] **EFFECT** - Effective annual interest rate

#### Statistical Functions (15):
- [ ] **STDEV.S/STDEV.P** - Standard deviation (sample/population)
- [ ] **VAR.S/VAR.P** - Variance (sample/population)
- [ ] **CORREL** - Correlation coefficient
- [ ] **COVARIANCE.S/P** - Covariance
- [ ] **MEDIAN** - Median value
- [ ] **MODE.SNGL** - Most common value
- [ ] **PERCENTILE.INC/EXC** - Percentile
- [ ] **QUARTILE.INC/EXC** - Quartile
- [ ] **RANK.EQ/AVG** - Rank of value
- [ ] **LARGE** - Kth largest value
- [ ] **SMALL** - Kth smallest value
- [ ] **FORECAST.LINEAR** - Linear forecast
- [ ] **TREND** - Trend values
- [ ] **GROWTH** - Exponential growth

#### File Changes:
```
packages/core/src/FormulaEngine.ts
  - Add lambdaEngine section (150 lines)
  - Add financialFunctions (100 lines)
  - Add statisticalFunctions (100 lines)
```

---

### 1.4 Formula Autocomplete (Week 3)
**New Feature**: IntelliSense-style formula completion  
**Lines**: 300-400

#### Implementation Tasks:
- [ ] **Trie Data Structure** for function names
  ```typescript
  class FormulaTrie {
    insert(funcName: string, signature: string, description: string)
    search(prefix: string): CompletionItem[]
  }
  ```

- [ ] **Completion Engine**
  ```typescript
  class FormulaCompletionEngine {
    getFunctionCompletions(prefix: string): CompletionItem[]
    getCellReferenceCompletions(prefix: string, sheet: Worksheet): CompletionItem[]
    getParameterHelp(funcName: string, paramIndex: number): ParameterInfo
  }
  ```

- [ ] **Completion UI Component** (React)
  ```typescript
  <FormulaCompletion
    visible={showCompletions}
    items={completionItems}
    selectedIndex={selectedIndex}
    onSelect={(item) => insertCompletion(item)}
  />
  ```

- [ ] **Parameter Hints** (tooltip showing function signature)
  ```
  SUM(number1, [number2], ...)
      ^^^^^^^
  ```

#### Features:
- Function name completion (type `=SU` → suggests `SUM`, `SUMIF`, etc.)
- Cell reference completion (type `=A` → suggests `A1`, `A2`, etc.)
- Parameter info on hover
- Fuzzy matching (type `=vlk` → suggests `VLOOKUP`)

#### File Changes:
```
packages/core/src/FormulaCompletionEngine.ts (NEW, 300 lines)
packages/react/src/FormulaCompletion.tsx (NEW, 100 lines)
packages/react/src/FormulaBar.tsx (UPDATE, +50 lines)
```

---

## 🎨 Phase 2: Data Validation & Conditional Formatting (HIGH PRIORITY)

**Goal**: Excel-style validation rules and visual formatting  
**Timeline**: Weeks 4-6 (21 days)  
**Estimated Code**: 500-700 lines

### 2.1 Data Validation Engine (Week 4)
**Lines**: 250-300

#### Core Validation Types:
- [ ] **Whole Number** - Integer in range
- [ ] **Decimal** - Float in range
- [ ] **List** - Dropdown from list of values
- [ ] **Date** - Date in range
- [ ] **Time** - Time in range
- [ ] **Text Length** - String length constraints
- [ ] **Custom Formula** - Formula returns TRUE/FALSE

#### Implementation:
```typescript
// packages/core/src/DataValidation.ts (NEW)

type ValidationType = 'whole' | 'decimal' | 'list' | 'date' | 'time' | 'textLength' | 'custom';
type ValidationOperator = 'between' | 'notBetween' | 'equal' | 'notEqual' | 'greaterThan' | 'lessThan' | 'greaterOrEqual' | 'lessOrEqual';

interface ValidationRule {
  type: ValidationType;
  operator?: ValidationOperator;
  formula1?: string;  // First value or formula
  formula2?: string;  // Second value (for 'between')
  allowBlank?: boolean;
  showInputMessage?: boolean;
  inputTitle?: string;
  inputMessage?: string;
  showErrorMessage?: boolean;
  errorStyle?: 'stop' | 'warning' | 'information';
  errorTitle?: string;
  errorMessage?: string;
  // For list type
  listSource?: string[];  // Static list
  listFormula?: string;   // Dynamic list from range
}

class DataValidationEngine {
  private rules = new Map<string, ValidationRule>();
  
  setValidation(range: Range, rule: ValidationRule): void
  clearValidation(range: Range): void
  validate(address: Address, value: CellValue): ValidationResult
  getValidation(address: Address): ValidationRule | undefined
  getAllValidations(): Array<{ range: Range, rule: ValidationRule }>
}

interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
  errorStyle?: 'stop' | 'warning' | 'information';
}
```

#### UI Components:
- [ ] **ValidationEditor** (React)
  - Type selector (dropdown, range, list, etc.)
  - Operator selector (between, equal, greater than, etc.)
  - Value inputs (formula1, formula2)
  - Error message customization

- [ ] **Dropdown Renderer** (Canvas)
  - Dropdown arrow in cell (right-aligned)
  - Popup list on click
  - Search/filter in list
  - Keyboard navigation

#### File Changes:
```
packages/core/src/DataValidation.ts (NEW, 250 lines)
packages/renderer-canvas/src/ValidationRenderer.ts (NEW, 100 lines)
packages/react/src/ValidationEditor.tsx (NEW, 150 lines)
```

---

### 2.2 Conditional Formatting Engine (Weeks 5-6)
**Lines**: 250-400

#### Rule Types:
- [ ] **Highlight Cells Rules**
  - Greater Than / Less Than / Between
  - Equal To / Text Contains
  - Date Occurring (today, yesterday, last 7 days, etc.)
  - Duplicate / Unique values

- [ ] **Top/Bottom Rules**
  - Top 10 items / Top 10%
  - Bottom 10 items / Bottom 10%
  - Above / Below average

- [ ] **Data Bars** (Excel 2007+)
  - Solid fill bar in cell
  - Gradient fill
  - Negative values (different color)
  - Axis position (auto, middle, none)
  - Direction (left-to-right, right-to-left)

- [ ] **Color Scales** (2-color or 3-color)
  - Min → Max gradient
  - Custom colors and thresholds
  - Percentile-based or value-based

- [ ] **Icon Sets**
  - 3 Arrows (up, right, down)
  - 3 Traffic Lights (red, yellow, green)
  - 4/5 Rating stars
  - Custom icon mappings

- [ ] **Formula-Based Rules**
  - Custom formula returns TRUE/FALSE
  - Apply formatting based on result

#### Implementation:
```typescript
// packages/core/src/ConditionalFormatting.ts (NEW)

type CFRuleType = 'cellValue' | 'expression' | 'colorScale' | 'dataBar' | 'iconSet' | 'top10' | 'duplicateValues' | 'uniqueValues' | 'containsText' | 'timePeriod';

interface ConditionalFormattingRule {
  id: string;
  type: CFRuleType;
  priority: number;  // Lower = higher priority
  stopIfTrue?: boolean;
  
  // For cellValue rules
  operator?: 'greaterThan' | 'lessThan' | 'between' | 'equal' | 'notEqual' | 'containsText' | 'notContainsText';
  formula?: string;
  formula2?: string;  // For 'between'
  
  // For expression rules
  expressionFormula?: string;
  
  // Formatting to apply
  format?: Partial<CellStyle>;
  
  // For color scales
  colorScale?: {
    type: '2-color' | '3-color';
    minType: 'num' | 'percent' | 'percentile' | 'formula' | 'min';
    minValue?: string;
    minColor: string;
    midType?: 'num' | 'percent' | 'percentile' | 'formula';
    midValue?: string;
    midColor?: string;
    maxType: 'num' | 'percent' | 'percentile' | 'formula' | 'max';
    maxValue?: string;
    maxColor: string;
  };
  
  // For data bars
  dataBar?: {
    minType: 'num' | 'percent' | 'percentile' | 'formula' | 'automatic';
    minValue?: string;
    maxType: 'num' | 'percent' | 'percentile' | 'formula' | 'automatic';
    maxValue?: string;
    color: string;
    showValue?: boolean;
    gradient?: boolean;
    direction?: 'leftToRight' | 'rightToLeft';
    negativeColor?: string;
    axisPosition?: 'automatic' | 'middle' | 'none';
  };
  
  // For icon sets
  iconSet?: {
    iconStyle: '3Arrows' | '3TrafficLights' | '4Rating' | '5Quarters' | '3Symbols' | '3Flags';
    reverseOrder?: boolean;
    showValue?: boolean;
    icons: Array<{
      type: string;
      operator: 'greaterThan' | 'greaterOrEqual';
      value: number;
      valueType: 'num' | 'percent' | 'percentile' | 'formula';
    }>;
  };
}

class ConditionalFormattingEngine {
  private rules = new Map<string, ConditionalFormattingRule[]>();  // range key → rules
  
  addRule(range: Range, rule: ConditionalFormattingRule): void
  removeRule(ruleId: string): void
  getRules(address: Address): ConditionalFormattingRule[]
  evaluateRules(address: Address, value: CellValue, context: Worksheet): CellStyle | null
  getAllRules(): Array<{ range: Range, rules: ConditionalFormattingRule[] }>
  
  // Priority management
  setRulePriority(ruleId: string, priority: number): void
  moveRuleUp(ruleId: string): void
  moveRuleDown(ruleId: string): void
}
```

#### Rendering:
- [ ] **Data Bars**: Draw gradient bars behind cell text
- [ ] **Color Scales**: Apply background color gradient
- [ ] **Icon Sets**: Draw icons (as images or SVG)

#### UI Components:
- [ ] **ConditionalFormattingEditor** (React)
  - Rule type selector
  - Condition builder
  - Format preview
  - Priority management (up/down arrows)
  - Manage rules dialog

- [ ] **ColorScaleEditor** - Visual gradient picker
- [ ] **DataBarEditor** - Bar style customization
- [ ] **IconSetEditor** - Icon selection and thresholds

#### File Changes:
```
packages/core/src/ConditionalFormatting.ts (NEW, 300 lines)
packages/renderer-canvas/src/CFRenderer.ts (NEW, 150 lines)
packages/react/src/ConditionalFormattingEditor.tsx (NEW, 250 lines)
packages/react/src/ColorScaleEditor.tsx (NEW, 100 lines)
packages/react/src/DataBarEditor.tsx (NEW, 100 lines)
packages/react/src/IconSetEditor.tsx (NEW, 100 lines)
```

---

## 🔍 Phase 3: Advanced Sort/Filter (MEDIUM PRIORITY)

**Goal**: Multi-level sorting, custom comparators, advanced filters  
**Timeline**: Weeks 7-8 (14 days)  
**Estimated Code**: 300-500 lines

### 3.1 Multi-Level Sort (Week 7)
**Lines**: 200-300

#### Implementation:
```typescript
// packages/core/src/SortEngine.ts (NEW)

interface SortLevel {
  columnIndex: number;
  order: 'asc' | 'desc';
  comparator?: 'text' | 'number' | 'date' | 'color' | 'icon' | 'custom';
  customComparator?: (a: CellValue, b: CellValue) => number;
  caseSensitive?: boolean;
}

interface SortOptions {
  levels: SortLevel[];
  hasHeaders?: boolean;
  sortRange: Range;
}

class SortEngine {
  sort(worksheet: Worksheet, options: SortOptions): void {
    // 1. Extract rows from range
    // 2. Apply multi-level sort (stable sort)
    // 3. Write back to worksheet
  }
  
  private compareValues(
    a: CellValue, 
    b: CellValue, 
    comparator: SortLevel['comparator']
  ): number {
    // Text: locale-aware string comparison
    // Number: numeric comparison
    // Date: date comparison
    // Color: compare fill colors
    // Icon: compare icon types
  }
}
```

#### Features:
- Sort by up to 64 levels (Excel limit)
- Custom comparators (text, number, date, color, icon)
- Case-sensitive/insensitive text sort
- Locale-aware sorting (using `Intl.Collator`)
- Sort by cell color or icon
- Preserve merged cells during sort

#### UI Component:
- [ ] **SortDialog** (React)
  - Add/remove sort levels
  - Drag to reorder levels
  - Column selector for each level
  - Order selector (A→Z, Z→A)
  - Case-sensitive checkbox

#### File Changes:
```
packages/core/src/SortEngine.ts (NEW, 200 lines)
packages/react/src/SortDialog.tsx (NEW, 150 lines)
```

---

### 3.2 Advanced Filter (Week 8)
**Lines**: 100-200

#### Features:
- [ ] **Criteria Ranges** (Excel-style)
  - Define filter criteria in separate range
  - Multiple conditions with AND/OR logic
  - Wildcard matching (*, ?)

- [ ] **Custom Filters**
  - Text filters: begins with, ends with, contains
  - Number filters: top 10, above/below average
  - Date filters: this week, last month, year to date

- [ ] **Filter by Color/Icon**
  - Filter by cell background color
  - Filter by font color
  - Filter by icon set icon

#### Implementation:
```typescript
// packages/core/src/FilterEngine.ts (EXTEND EXISTING)

interface AdvancedFilter {
  type: 'criteria' | 'custom' | 'color' | 'icon';
  
  // Criteria range filter
  criteriaRange?: Range;
  copyTo?: Range;  // Copy filtered results
  uniqueOnly?: boolean;
  
  // Custom filter
  customCondition?: (value: CellValue, row: number) => boolean;
  
  // Color filter
  colorType?: 'fill' | 'font';
  color?: string;
  
  // Icon filter
  iconType?: string;
}

class FilterEngine {
  applyAdvancedFilter(worksheet: Worksheet, range: Range, filter: AdvancedFilter): void
  extractUnique(worksheet: Worksheet, range: Range): CellValue[]
}
```

#### File Changes:
```
packages/core/src/FilterEngine.ts (NEW/EXTEND, 150 lines)
packages/react/src/AdvancedFilterDialog.tsx (NEW, 100 lines)
```

---

## 🖨️ Phase 4: Print Layout & Export (LOW PRIORITY)

**Goal**: Professional print output with headers/footers  
**Timeline**: Weeks 9-10 (14 days)  
**Estimated Code**: 400 lines

### 4.1 Print Layout (Week 9)
**Lines**: 200-250

#### Features:
- [ ] **Page Setup**
  - Paper size (A4, Letter, Legal, etc.)
  - Orientation (Portrait, Landscape)
  - Margins (top, bottom, left, right)
  - Scaling (fit to 1 page wide by X tall)
  - Print area (specific range)

- [ ] **Headers & Footers**
  - Left, center, right sections
  - Dynamic fields: page number, total pages, date, time, filename, sheet name
  - Custom text and formatting

- [ ] **Print Options**
  - Gridlines (show/hide)
  - Row/column headers (show/hide)
  - Page breaks (manual and automatic)
  - Print titles (repeat rows/columns on each page)
  - Black and white printing
  - Draft quality

#### Implementation:
```typescript
// packages/core/src/PrintLayout.ts (NEW)

interface PageSetup {
  paperSize: 'A4' | 'Letter' | 'Legal' | 'A3' | 'Tabloid';
  orientation: 'portrait' | 'landscape';
  margins: { top: number; right: number; bottom: number; left: number; header: number; footer: number };
  scaling: { mode: 'percentage' | 'fitToPages'; percentage?: number; fitWidth?: number; fitHeight?: number };
  printArea?: Range;
  printTitles?: { rows?: Range; columns?: Range };
}

interface HeaderFooter {
  left?: string;   // &L - left section
  center?: string; // &C - center section
  right?: string;  // &R - right section
  
  // Dynamic codes:
  // &P - page number
  // &N - total pages
  // &D - current date
  // &T - current time
  // &F - filename
  // &A - sheet name
  // &Z - file path
}

interface PrintOptions {
  showGridlines: boolean;
  showRowColHeaders: boolean;
  blackAndWhite: boolean;
  draft: boolean;
  pageOrder: 'downThenOver' | 'overThenDown';
  comments: 'none' | 'asDisplayed' | 'atEnd';
  errors: 'displayed' | 'blank' | 'dash' | 'NA';
}

class PrintLayoutEngine {
  private setup = new Map<string, PageSetup>();  // sheet name → setup
  private headers = new Map<string, HeaderFooter>();
  private footers = new Map<string, HeaderFooter>();
  private options = new Map<string, PrintOptions>();
  
  setPageSetup(sheetName: string, setup: PageSetup): void
  setHeader(sheetName: string, header: HeaderFooter): void
  setFooter(sheetName: string, footer: HeaderFooter): void
  setPrintOptions(sheetName: string, options: PrintOptions): void
  
  generatePageBreaks(worksheet: Worksheet): number[]  // Row indices for breaks
  renderHeaderFooter(section: string, pageNumber: number, totalPages: number): string
}
```

#### File Changes:
```
packages/core/src/PrintLayout.ts (NEW, 200 lines)
packages/react/src/PageSetupDialog.tsx (NEW, 150 lines)
```

---

### 4.2 Enhanced Export (Week 10)
**Lines**: 150-200

#### Features:
- [ ] **PDF Export**
  - Use `jsPDF` or canvas-to-PDF conversion
  - Respect page setup (margins, headers, footers)
  - Embed fonts for consistent rendering
  - Vector graphics (not rasterized)

- [ ] **Enhanced PNG Export**
  - Export with transparent background option
  - Export at custom DPI (72, 150, 300)
  - Export specific range (not whole sheet)

- [ ] **HTML Export**
  - Export as HTML table
  - Preserve styles (colors, borders, fonts)
  - Embed images (data URIs)

#### Implementation:
```typescript
// packages/renderer-canvas/src/ExportPlugin.ts (EXTEND EXISTING)

interface ExportOptions {
  format: 'png' | 'pdf' | 'csv' | 'json' | 'html';
  range?: Range;  // Export specific range
  
  // PNG options
  dpi?: number;
  transparentBackground?: boolean;
  
  // PDF options
  pageSetup?: PageSetup;
  includeHeaders?: boolean;
  includeFooters?: boolean;
  
  // HTML options
  embedImages?: boolean;
  includeStyles?: boolean;
}

class ExportPlugin {
  async export(
    worksheet: Worksheet, 
    renderer: CanvasRenderer, 
    options: ExportOptions
  ): Promise<Blob> {
    switch (options.format) {
      case 'pdf': return this.exportPDF(worksheet, renderer, options);
      case 'html': return this.exportHTML(worksheet, options);
      // ... existing formats
    }
  }
  
  private async exportPDF(...): Promise<Blob> {
    // Use jsPDF or canvas rendering
  }
  
  private exportHTML(...): Blob {
    // Generate <table> with inline styles
  }
}
```

#### File Changes:
```
packages/renderer-canvas/src/ExportPlugin.ts (EXTEND, 200 lines)
```

---

## 🧪 Phase 5: Testing & Benchmarking (CRITICAL)

**Goal**: Ensure stability, performance, and regression prevention  
**Timeline**: Weeks 11-12 (14 days)

### 5.1 Playwright E2E Tests (Week 11)
**Test Coverage**: 50+ test scenarios

#### Test Categories:

**Formula Tests** (15 tests)
- [ ] Basic arithmetic (=A1+B1*C1)
- [ ] Function calls (=SUM(A1:A10))
- [ ] Nested functions (=IF(SUM(A1:A5)>10, "High", "Low"))
- [ ] VLOOKUP / XLOOKUP
- [ ] Dynamic arrays (FILTER, SORT, UNIQUE)
- [ ] Spilled ranges
- [ ] Circular reference detection
- [ ] Error propagation (#N/A, #VALUE!, #REF!)
- [ ] Formula autocomplete
- [ ] Parameter hints
- [ ] Cell reference updates on insert/delete
- [ ] Cross-sheet references
- [ ] LAMBDA / LET functions
- [ ] Array formulas
- [ ] Formula bar editing

**Data Validation Tests** (8 tests)
- [ ] Dropdown list validation
- [ ] Number range validation
- [ ] Date validation
- [ ] Custom formula validation
- [ ] Error message display
- [ ] Input message display
- [ ] Allow blank cells
- [ ] Validation on paste

**Conditional Formatting Tests** (10 tests)
- [ ] Highlight cells rules (greater than, less than, between)
- [ ] Top/bottom rules (top 10, bottom 10%)
- [ ] Data bars rendering
- [ ] Color scales rendering
- [ ] Icon sets rendering
- [ ] Duplicate values highlighting
- [ ] Formula-based rules
- [ ] Multiple rules with priority
- [ ] stopIfTrue behavior
- [ ] CF on filtered data

**Sort/Filter Tests** (8 tests)
- [ ] Single-column sort (ascending/descending)
- [ ] Multi-level sort (3 columns)
- [ ] Sort by color
- [ ] Case-sensitive text sort
- [ ] Advanced filter with criteria range
- [ ] Filter by color
- [ ] Top 10 filter
- [ ] Custom filter formulas

**Export Tests** (5 tests)
- [ ] Export to PNG (full sheet)
- [ ] Export to PNG (specific range)
- [ ] Export to PDF (with headers/footers)
- [ ] Export to HTML (with styles)
- [ ] Export to CSV (with formulas preserved)

**Performance Tests** (4 tests)
- [ ] Render 10,000 cells <100ms
- [ ] Scroll at 100+ FPS
- [ ] Formula recalculation on 1,000 cells <50ms
- [ ] Memory usage <50MB for 100x100 sheet

#### Test Files:
```
e2e/
  formulas.spec.ts (300 lines)
  validation.spec.ts (150 lines)
  conditional-formatting.spec.ts (200 lines)
  sort-filter.spec.ts (150 lines)
  export.spec.ts (100 lines)
  performance.spec.ts (100 lines)
```

#### Playwright Configuration:
```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

### 5.2 Performance Benchmarking (Week 12)
**Goal**: Validate 100+ FPS and memory efficiency

#### Benchmark Suite:
```typescript
// benchmarks/render-benchmark.ts

interface BenchmarkResult {
  name: string;
  fps: number;
  avgRenderTime: number;  // ms
  p95RenderTime: number;  // ms
  p99RenderTime: number;  // ms
  memoryUsage: number;    // MB
  passed: boolean;
}

const benchmarks = [
  {
    name: 'Render 100x26 (2,600 cells)',
    target: { fps: 120, renderTime: 50, memory: 20 },
    run: () => { /* ... */ }
  },
  {
    name: 'Render 1000x26 (26,000 cells)',
    target: { fps: 60, renderTime: 100, memory: 50 },
    run: () => { /* ... */ }
  },
  {
    name: 'Scroll performance (10,000 cells)',
    target: { fps: 100, renderTime: 16, memory: 30 },
    run: () => { /* ... */ }
  },
  {
    name: 'Formula recalculation (1,000 dependent cells)',
    target: { fps: 60, renderTime: 50, memory: 30 },
    run: () => { /* ... */ }
  },
  {
    name: 'Conditional formatting (500 cells with rules)',
    target: { fps: 60, renderTime: 30, memory: 25 },
    run: () => { /* ... */ }
  },
];
```

#### Benchmarking Tools:
- [ ] FPS counter (using `requestAnimationFrame`)
- [ ] Memory profiler (using `performance.memory`)
- [ ] Chrome DevTools Performance API
- [ ] Automated benchmark runner (CI integration)

#### Performance Targets:
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Render FPS | >100 | 125 | ✅ Pass |
| Scroll FPS | >100 | 125 | ✅ Pass |
| Render time (2.6K cells) | <50ms | 45ms | ✅ Pass |
| Memory (100x100) | <50MB | ~30MB | ✅ Pass |
| Formula recalc (1K cells) | <50ms | TBD | ⏳ Test |
| CF rendering (500 cells) | <30ms | TBD | ⏳ Test |

---

## 📦 Deliverables Checklist

### Code Deliverables:
- [ ] **Formula Extension**
  - [ ] 200+ new functions implemented
  - [ ] Dynamic array support (FILTER, SORT, UNIQUE, etc.)
  - [ ] LAMBDA/LET support
  - [ ] Spilled range rendering
  - [ ] Formula autocomplete with Trie

- [ ] **Data Validation**
  - [ ] Validation engine (7 types)
  - [ ] Dropdown renderer
  - [ ] Validation UI editor
  - [ ] Error message display

- [ ] **Conditional Formatting**
  - [ ] CF engine (6 rule types)
  - [ ] Data bars, color scales, icon sets
  - [ ] CF renderer
  - [ ] CF editor UI
  - [ ] Priority management

- [ ] **Advanced Sort/Filter**
  - [ ] Multi-level sort (up to 64 levels)
  - [ ] Custom comparators
  - [ ] Advanced filter with criteria ranges
  - [ ] Sort/filter by color/icon

- [ ] **Print & Export**
  - [ ] Page setup (margins, orientation, scaling)
  - [ ] Headers/footers with dynamic fields
  - [ ] PDF export
  - [ ] HTML export
  - [ ] Enhanced PNG export (DPI, transparency)

### Testing Deliverables:
- [ ] 50+ Playwright E2E tests
- [ ] Performance benchmark suite
- [ ] CI/CD pipeline integration
- [ ] Test coverage report (>80%)

### Documentation Deliverables:
- [ ] Formula function reference (300 functions)
- [ ] Data validation guide
- [ ] Conditional formatting guide
- [ ] Sort/filter guide
- [ ] Print layout guide
- [ ] Export options guide
- [ ] Performance tuning guide

---

## 🚀 v1.0 Launch Criteria

### Technical Criteria:
- ✅ All 300 formula functions implemented and tested
- ✅ Data validation working for all 7 types
- ✅ Conditional formatting for all 6 rule types
- ✅ Multi-level sort and advanced filter working
- ✅ Print layout and export fully functional
- ✅ >80% test coverage
- ✅ All Playwright E2E tests passing
- ✅ Performance benchmarks passing (>100 FPS)
- ✅ Memory usage <50MB for typical sheets
- ✅ Zero critical bugs

### Documentation Criteria:
- ✅ API reference complete (TypeDoc)
- ✅ User guides for all features
- ✅ Migration guide from competitors
- ✅ Video tutorials (5+ videos)
- ✅ CodeSandbox/StackBlitz demos

### Release Criteria:
- ✅ npm packages published (@cyber-sheet/*)
- ✅ GitHub release (v1.0.0) with changelog
- ✅ Website live (cybersheet.dev or similar)
- ✅ Product Hunt launch
- ✅ Social media announcements
- ✅ Dev.to article published
- ✅ Hacker News post

---

## 📊 Success Metrics (Post-Launch)

### Adoption Metrics:
- **Week 1**: 100+ GitHub stars, 50+ npm downloads
- **Month 1**: 500+ stars, 500+ downloads, 10+ issues/PRs
- **Month 3**: 1,000+ stars, 2,000+ downloads, 50+ community contributions

### Performance Metrics:
- **Rendering**: Maintain 100+ FPS on mid-tier devices
- **Bundle Size**: Stay under 100KB (currently 85KB)
- **Memory**: <50MB for sheets up to 100x100
- **Load Time**: <1s for initial render

### Quality Metrics:
- **Bug Rate**: <5 critical bugs per month
- **Test Coverage**: Maintain >80%
- **Performance Regression**: 0 regressions from v1.0 baseline

---

## 💡 Notes & Considerations

### Priority Rationale:
1. **Formulas** (HIGH) - Core Excel compatibility, user demand
2. **Data Validation** (HIGH) - Essential for data entry apps
3. **Conditional Formatting** (HIGH) - Visual appeal, competitive parity
4. **Sort/Filter** (MEDIUM) - Nice-to-have, can defer advanced features
5. **Print/Export** (LOW) - Less frequently used, can iterate post-1.0

### Risk Mitigation:
- **Scope Creep**: Stick to defined features, defer edge cases to v1.1
- **Performance Regression**: Benchmark after each phase
- **Breaking Changes**: Maintain API stability, use deprecation warnings
- **Testing Debt**: Write tests alongside features, not after

### Post-v1.0 Features (Deferred):
- Excel macro import (VBA → JS transpiler)
- Real-time collaboration (WebSockets, OT/CRDT)
- Cloud save/load (AWS/Azure integration)
- Mobile apps (React Native wrapper)
- Plugin marketplace
- AI-powered formula suggestions

---

## 📅 Weekly Schedule

| Week | Dates | Focus | Deliverables |
|------|-------|-------|--------------|
| 1 | Jan 6-12 | Lookup Functions | XLOOKUP, INDEX/MATCH, VLOOKUP improvements |
| 2 | Jan 13-19 | Dynamic Arrays | FILTER, SORT, UNIQUE, spilled ranges |
| 3 | Jan 20-26 | Modern Functions | LAMBDA, LET, financial, statistical, autocomplete |
| 4 | Jan 27 - Feb 2 | Data Validation | Engine + UI for 7 validation types |
| 5 | Feb 3-9 | Conditional Formatting (Part 1) | Highlight rules, top/bottom, data bars |
| 6 | Feb 10-16 | Conditional Formatting (Part 2) | Color scales, icon sets, formula rules |
| 7 | Feb 17-23 | Multi-Level Sort | Sort engine + UI with custom comparators |
| 8 | Feb 24 - Mar 2 | Advanced Filter | Criteria ranges, color/icon filters |
| 9 | Mar 3-9 | Print Layout | Page setup, headers/footers, print options |
| 10 | Mar 10-16 | Enhanced Export | PDF, HTML, enhanced PNG export |
| 11 | Mar 17-23 | Playwright Testing | 50+ E2E tests across all features |
| 12 | Mar 24-30 | Benchmarking & Polish | Performance validation, bug fixes |
| 13 | Mar 31 - Apr 6 | v1.0 Launch | npm publish, GitHub release, marketing |

---

## 🎯 Final Goal: v1.0 Stable by April 2026

**Outcome**: Production-ready spreadsheet engine that rivals commercial solutions, with 300+ Excel functions, full data validation, conditional formatting, advanced sort/filter, and professional export capabilities—all while maintaining 100+ FPS performance and zero dependencies.

**Ready to compete with Handsontable, AG Grid, and Luckysheet.** 🚀
