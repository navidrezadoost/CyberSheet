# Number Format Usage Audit
**Created:** February 14, 2026  
**Purpose:** Evidence-driven boundary definition for Format Grammar v1.0  
**Duration:** 2-3 days  
**Status:** 🔄 Data Collection Phase

---

## Governance Principle

> **No evidence → no escalation**

Before implementing Excel's full grammar (30 years of edge cases), we audit **actual format usage patterns** to define a **controlled v1.0 boundary**.

**Not building:** Excel archaeology  
**Building:** Evidence-scoped compiler for real-world formats

---

## Audit Objectives

### Primary Goals
1. **Frequency Distribution:** Which formats appear most often?
2. **Complexity Heat Map:** Which features cluster together?
3. **v1 Boundary:** What's the 80/20 cutoff?
4. **Exclusion List:** What can we explicitly defer?

### Success Criteria
- ✅ Top 50 most common formats identified
- ✅ Complexity scoring system defined
- ✅ v1 boundary justified by data
- ✅ Performance budget set by usage patterns

---

## Data Collection Schema

### Format Record
```typescript
interface FormatRecord {
  // Core identification
  formatString: string;           // Raw format string
  hash: string;                   // Unique ID for deduplication
  
  // Usage metrics
  occurrences: number;            // Frequency count
  sources: string[];              // Where found (file, sheet, cell range)
  
  // Categorization (multi-tag)
  categories: FormatCategory[];
  
  // Complexity scoring
  complexity: {
    tokenCount: number;           // Number of tokens
    sectionCount: number;         // Sections (;-separated)
    hasConditions: boolean;       // [>1000] style conditions
    hasColors: boolean;           // [Red] style tags
    hasLocale: boolean;           // Locale-specific tokens
    hasFractions: boolean;        // ?/? style fractions
    hasElapsedTime: boolean;      // [h]:mm:ss
    complexityScore: number;      // 0-100 aggregate score
  };
  
  // Behavioral classification
  behavior: {
    affectsLayout: boolean;       // Changes text width?
    affectsColor: boolean;        // Changes text color?
    requiresLocale: boolean;      // Needs locale data?
    requiresCalendar: boolean;    // Needs date system?
  };
}

enum FormatCategory {
  // Numeric
  NUMERIC_BASIC = 'numeric-basic',           // 0, #, 0.00
  NUMERIC_GROUPED = 'numeric-grouped',       // #,##0
  NUMERIC_SCALED = 'numeric-scaled',         // #,##0, (thousands scaling)
  
  // Special numeric
  PERCENT = 'percent',                       // 0%
  SCIENTIFIC = 'scientific',                 // 0.00E+00
  FRACTION = 'fraction',                     // # ?/?
  
  // Currency
  CURRENCY_SIMPLE = 'currency-simple',       // $#,##0
  CURRENCY_ACCOUNTING = 'currency-acct',     // _($* #,##0_);
  
  // Date/Time
  DATE_SHORT = 'date-short',                 // m/d/yy
  DATE_LONG = 'date-long',                   // mmmm dd, yyyy
  TIME_SIMPLE = 'time-simple',               // h:mm
  TIME_ELAPSED = 'time-elapsed',             // [h]:mm:ss
  DATETIME = 'datetime',                     // m/d/yy h:mm
  
  // Text
  TEXT_LITERAL = 'text-literal',             // "text"
  TEXT_PLACEHOLDER = 'text-placeholder',     // @
  
  // Conditional
  CONDITIONAL_SIMPLE = 'conditional-simple', // positive;negative
  CONDITIONAL_COMPLEX = 'conditional-cmplx', // [>1000]#,##0;[Red]0
  
  // Color
  COLOR_TAG = 'color-tag',                   // [Red], [Blue]
  COLOR_INDEXED = 'color-indexed',           // [Color1]-[Color56]
  
  // Advanced
  LOCALE_AWARE = 'locale-aware',             // [$-409]
  CUSTOM_CALENDAR = 'custom-calendar',       // [$-130000]
}
```

### Complexity Scoring Algorithm
```typescript
function calculateComplexity(format: string): number {
  let score = 0;
  
  // Base complexity
  score += format.length * 0.1;                    // +1 per 10 chars
  
  // Structural complexity
  score += (format.match(/;/g) || []).length * 5;  // +5 per section
  score += (format.match(/\[.*?\]/g) || []).length * 10; // +10 per bracket expr
  
  // Feature complexity
  if (/\?\/\?/.test(format)) score += 20;          // Fractions
  if (/\[h\]|\[m\]|\[s\]/.test(format)) score += 15; // Elapsed time
  if (/\$-\d+/.test(format)) score += 25;          // Locale tokens
  if (/[><=]/.test(format)) score += 15;           // Conditions
  if (/E\+/.test(format)) score += 10;             // Scientific
  
  return Math.min(score, 100);
}
```

---

## Data Sources

### 1. Internal Test Corpus
**Source:** Existing test files in repo  
**Action:** Extract all `numberFormat` values from:
- `packages/core/__tests__/**/*.test.ts`
- `packages/renderer-canvas/__tests__/**/*.test.ts`
- `examples/**/*.ts`

**Script:**
```bash
# Grep for numberFormat usage
grep -rE "numberFormat.*['\"].*['\"]" packages/ examples/ | \
  sed -E "s/.*numberFormat.*['\"]([^'\"]*)['\"].*/\1/" | \
  sort | uniq -c | sort -rn > audit-internal.txt
```

### 2. Excel File Corpus (If Available)
**Source:** Sample Excel files (.xlsx)  
**Action:** Extract format strings from OOXML

**Script (Node.js):**
```javascript
// extract-formats-from-xlsx.js
const xlsx = require('xlsx');
const glob = require('glob');

const formats = new Map();

glob.sync('corpus/**/*.xlsx').forEach(file => {
  const workbook = xlsx.readFile(file);
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    Object.keys(sheet).forEach(cell => {
      if (cell[0] === '!') return;
      const cellObj = sheet[cell];
      if (cellObj.z) { // z = number format
        const count = formats.get(cellObj.z) || 0;
        formats.set(cellObj.z, count + 1);
      }
    });
  });
});

// Output sorted by frequency
[...formats.entries()]
  .sort((a, b) => b[1] - a[1])
  .forEach(([fmt, count]) => {
    console.log(`${count}\t${fmt}`);
  });
```

### 3. Public Datasets
**Source:** Kaggle, data.gov spreadsheets  
**Note:** Manual sampling if OOXML extraction works

### 4. TEXT() Function Usage
**Source:** Existing formula tests  
**Action:** Extract format strings from TEXT() calls

```bash
grep -rE "TEXT\([^,]+,\s*['\"]([^'\"]+)['\"]" packages/ | \
  sed -E "s/.*TEXT\([^,]+,\s*['\"]([^'\"]+)['\"].*/\1/" | \
  sort | uniq -c | sort -rn > audit-text-formulas.txt
```

---

## Analysis Framework

### Frequency Distribution
**Goal:** Pareto analysis (80/20 rule)

**Output:**
```
Top 50 Formats (covering 80% of usage):
1. 0.00              (32%)
2. #,##0             (18%)
3. $#,##0.00         (12%)
4. 0%                (8%)
5. m/d/yyyy          (6%)
...
50. [h]:mm:ss        (0.1%)
```

### Complexity Histogram
**Goal:** Visualize where complexity clusters

**Buckets:**
- 0-20: Simple (0, #,##0)
- 21-40: Moderate ($#,##0.00, 0%)
- 41-60: Complex (conditional sections)
- 61-80: Advanced (fractions, colors)
- 81-100: Rare (locale, calendars)

**Expected Distribution:** Heavy tail (most formats are simple)

### Feature Co-occurrence Matrix
**Goal:** Which features appear together?

**Example:**
```
              | Sections | Colors | Conditions | Fractions |
Sections      |    -     |  0.4   |    0.6     |    0.1    |
Colors        |   0.4    |   -    |    0.8     |    0.05   |
Conditions    |   0.6    |  0.8   |     -      |    0.2    |
Fractions     |   0.1    |  0.05  |    0.2     |     -     |
```

**Insight:** Colors + Conditions cluster (financial formats)

---

## v1.0 Boundary Definition

### Inclusion Criteria
Format feature included in v1.0 if:
1. **Frequency:** Appears in top 80% of usage, OR
2. **Dependency:** Required by included feature, OR
3. **Simplicity:** Complexity score < 40 and appears in top 95%

### Exclusion Criteria
Feature explicitly deferred if:
1. **Rarity:** < 1% usage frequency
2. **Complexity:** Score > 60 and < 5% usage
3. **Locale Dependency:** Requires external locale data
4. **Calendar Dependency:** Requires non-Gregorian calendar

### Example v1.0 Boundary (Hypothesis)

**✅ v1.0 Includes:**
- Numeric placeholders: `0`, `#`, `?`
- Decimal precision: `.00`, `.000`
- Thousand separators: `#,##0`
- Percent: `0%`, `0.00%`
- Currency symbols: `$`, `€`, `£`, `¥` (non-locale)
- Basic scientific: `0.00E+00`
- 4-section conditionals: `pos;neg;zero;text`
- Simple conditions: `[>1000]`, `[<0]`
- Color tags: `[Red]`, `[Blue]`, `[Green]`, etc. (8 colors)
- Text literals: `"text"`
- Text placeholder: `@`
- Date tokens: `m`, `d`, `y`, `h`, `s` (basic only)
- Date separators: `/`, `-`, `:`

**❌ v1.0 Explicitly Excludes:**
- Fractions: `# ?/?`, `# ??/??`
- Elapsed time: `[h]:mm:ss`
- Locale tokens: `[$-409]`, `[$-130000]`
- Color indices: `[Color1]`-`[Color56]`
- Thousands scaling: `#,##0,` (display 1000 as "1")
- Accounting alignment: `_($* #,##0_);`
- Custom calendars
- Month/day name localization (use English only in v1)

### Rationale Documentation
Each exclusion must have:
- Usage frequency data
- Complexity score
- Alternative workaround (if any)
- Target version for inclusion (v1.1, v2.0, never)

---

## Performance Budget

### Execution Budget (Critical)
**Context:** Canvas renderer calls `formatValue()` on every visible cell every frame

**Assumptions:**
- 1000 visible cells typical
- 60fps target
- Format budget = 1ms total

**Per-cell budget:** `1ms / 1000 cells = 1µs per format execution`

**Gate:** Compiled format execution must average < 1µs

### Compilation Budget (Acceptable)
**Context:** Format strings compiled once and cached

**Gate:** < 100µs per format string compilation

### Cache Strategy
**Decision:** LRU cache, max 1000 compiled formats (~100KB memory)

**Rationale:** 
- Typical sheets use < 50 unique formats
- Cache hit rate > 99% expected
- Eviction rare

---

## Deliverables

### 1. Audit Report (`NUMBER_FORMAT_AUDIT_RESULTS.md`)
**Contents:**
- Top 100 formats by frequency
- Complexity histogram
- Feature co-occurrence matrix
- Performance budget justification

### 2. v1.0 Boundary Spec (`NUMBER_FORMAT_V1_BOUNDARY.md`)
**Contents:**
- Explicit inclusion list with examples
- Explicit exclusion list with rationale
- Version roadmap (what's in v1.1, v2.0)
- Compatibility statement (e.g., "Covers 85% of real-world Excel usage")

### 3. Test Oracle Dataset (`audit-formats.json`)
**Contents:**
```json
{
  "formats": [
    {
      "string": "#,##0.00",
      "frequency": 1234,
      "complexity": 12,
      "categories": ["numeric-grouped"],
      "included_in_v1": true,
      "test_cases": [
        { "input": 1234.567, "expected": "1,234.57" },
        { "input": -999, "expected": "-999.00" }
      ]
    }
  ]
}
```

### 4. Grammar Spec (Focused, 300-500 lines)
**Deferred until after audit**

---

## Timeline

### Day 1: Data Collection
- [ ] Extract formats from internal tests (2h)
- [ ] Extract formats from TEXT() formulas (1h)
- [ ] Extract formats from example files (1h)
- [ ] (Optional) Sample public Excel corpus (4h)

**Output:** `audit-raw-data.txt` (unsorted list)

### Day 2: Analysis
- [ ] Deduplicate and count frequencies (1h)
- [ ] Calculate complexity scores (2h)
- [ ] Generate feature co-occurrence matrix (2h)
- [ ] Create frequency histogram (1h)
- [ ] Identify top 50 formats (1h)

**Output:** `NUMBER_FORMAT_AUDIT_RESULTS.md`

### Day 3: Boundary Definition
- [ ] Draft inclusion criteria (2h)
- [ ] Draft exclusion criteria (2h)
- [ ] Validate boundary with test coverage analysis (2h)
- [ ] Define performance gates (1h)

**Output:** `NUMBER_FORMAT_V1_BOUNDARY.md`

---

## Next Actions

**Immediate (After Approval):**
1. Create `scripts/audit-number-formats.ts` extraction script
2. Run extraction on internal codebase
3. Begin frequency analysis

**Governance Check:**
- Does audit reveal < 50 unique patterns covering 80% usage? → Proceed
- Does audit reveal > 200 unique patterns needed? → Revisit scope

---

## Architecture Notes (From Governance)

### DO: Instruction Array Compilation
```typescript
// Format string → Tokenize → Parse to AST → Compile to instructions

interface FormatInstruction {
  type: 'literal' | 'digit' | 'separator' | 'conditional' | 'color';
  data: any;
}

const compiled = compile("#,##0.00");
// => [
//   { type: 'digit', data: { grouping: true, decimals: 2 } },
// ]

function execute(value: number, instructions: FormatInstruction[]): string {
  // Fast interpreter over instruction array
}
```

**Why Not Direct Function Generation:**
- Harder to debug
- Harder to version
- Harder to export
- Harder to diff
- Harder to test per instruction

**Instruction arrays preserve determinism and observability.**

### DON'T: Dynamic String → Function
```typescript
// ❌ Bad: eval() or Function() constructor
const formatter = new Function('value', compiledCode);
```

---

## Success Criteria (Audit Complete)

✅ **Evidence-driven:** Top formats identified by real usage  
✅ **Bounded scope:** v1.0 explicitly defined (no creep)  
✅ **Performance gated:** Execution budget justified by data  
✅ **Testable:** Oracle dataset created from audit  
✅ **Documented exclusions:** Deferred features have clear rationale  

**Outcome:** Controlled v1.0 implementation, not Excel archaeology.

---

## Approval Required

**Before proceeding:**
- [ ] Approve audit methodology
- [ ] Approve timeline (2-3 days)
- [ ] Approve success criteria

**Then:**
- Start data collection (Day 1)

---

**Governance Law Applied:**
> "No evidence → no escalation"

This audit ensures format grammar scope is **reality-driven**, not **Excel-driven**.
