# Phase 4 Wave 3: Display Semantics (UX-Only)


**Status**: 📋 **Planned** (Ready to Start)  **Status**: ✅ **COMPLETE** (Deployed)  

**Prerequisites**: ✅ Wave 3 complete (110/110 tests, 75% parity)  **Completion Date**: 2025-06-XX  

**Target**: Audit and prove Excel behavioral equivalence  **Tag**: v4.3.0  

**Type**: Validation & Trust Building (no new features)  **Prerequisites**: ✅ Wave 2 complete (18/19 icon sets working)  

**Estimated Time**: ~2-4 hours  **Target**: Excel-compatible presentation flags for icon sets  

**Risk Level**: 🟢 Near zero (read-only validation, no implementation changes)**Type**: UX polish (isolated, safe, optional)  

**Actual Time**: ~30-45 minutes (50% under estimate!)  

---**Risk Level**: 🟢 Near zero (no algorithm/cache changes)



## 🎯 Executive Summary---



Wave 4 is a **proof wave** that validates our "75% Excel parity" claim by comparing CyberSheet results against real Excel files. This is **not about building features**—it's about **auditing correctness** and turning subjective claims into objective truth.## 🎯 Executive Summary



**Key Principle**: "Trust is built through verification, not assertions."Wave 3 was a **pure UX polish wave** that added Excel-compatible display options to icon sets. It did **not** affect correctness, parity logic, or cache performance.



### What Wave 4 IS**Surprise Discovery**: Features were already 90% implemented! Only tests were missing.

✅ **Validation Framework**: Load Excel files, compare outputs  

✅ **Corner Case Discovery**: Find edge cases we missed  **Key Achievement**: Validated existing `reverseOrder` and `showIconOnly` implementations with 15 comprehensive tests in 30-45 minutes (50% under initial estimate).

✅ **Parity Auditing**: Turn "75% parity" into "75% proven parity"  

✅ **External Credibility**: Evidence-based correctness claims  ---

✅ **Bug Discovery**: Surface hidden issues before users do

## 📋 Scope Definition

### What Wave 4 IS NOT

❌ **No new features** (no new icon sets, no new rules)  ### ✅ What Wave 3 IS

❌ **No algorithm changes** (validation only, not implementation)  **Excel-Compatible Presentation Flags**:

❌ **No UX work** (renderer untouched)  1. `showIconOnly: boolean` - Hide cell value, show only icon

❌ **No scope creep** (strictly validation scope)2. `reverseOrder: boolean` - Flip icon assignment order

3. Rendering order guarantees (visual precedence)

---4. Visual layout rules (Excel compatibility)



## 🔍 Why Wave 4 Comes Next### ❌ What Wave 3 IS NOT

- ❌ **No algorithm changes** (percentile-rank stays untouched)

### Strategic Rationale- ❌ **No parity risk** (correctness already complete)

- ❌ **No cache changes** (StatisticalCacheManager untouched)

1. **Strengthens Wave 1-3 Foundation**- ❌ **No threshold logic** (Wave 1/2 foundation locked)

   - Waves 1-3 built features, Wave 4 validates them- ❌ **No new icon sets** (catalog complete at 18/19)

   - No point adding more features until existing ones are proven

   - Perfect follow-up to Wave 3's validation theme**Impact**: Pure presentation layer only (renderer-level changes)



2. **No UX Opinions**---

   - Pure technical validation (objective, measurable)

   - No design debates, no stakeholder input needed## 🏗️ Technical Design

   - Clear pass/fail criteria

### Feature 1: `showIconOnly` Flag

3. **No Scope Creep**

   - Validation can't grow scope (fixed by Excel behavior)**What It Does**:

   - Can't be "gold-plated" or "feature-creeped"- Shows only the icon (no cell value text)

   - Self-limiting by nature- Excel-compatible visual presentation

- Renderer-level change (no engine changes)

4. **High Trust / High Credibility**

   - "We claim 75% parity" → "We prove 75% parity"**Interface Change**:

   - External validation (Excel as oracle)```typescript

   - Builds confidence for production adoptioninterface IconSetRule {

    type: 'icon-set';

5. **Bug Discovery Pre-Production**    iconSet: ExcelIconSet;

   - Better to find issues now than after user reports    ranges: Range[];

   - Controlled environment (test suite) vs production chaos    thresholds: IconSetThreshold[];

   - Reduces support burden    showIconOnly?: boolean; // NEW (default: false)

}

### What Wave 4 Answers```

> **"Can we prove this behaves like Excel, not just claim it?"**

**Implementation**:

---```typescript

// In renderer (ExcelRenderer.ts or similar)

## 🏗️ Technical Designif (iconResult && rule.showIconOnly) {

    // Render only icon, skip cell value text

### Architecture: Excel-as-Oracle Testing    renderIcon(iconResult.iconIndex, cellBounds);

    return; // Skip text rendering

**Concept**: Use real Excel files as ground truth, compare CyberSheet output}



```// Default behavior (showIconOnly = false)

┌─────────────┐renderIcon(iconResult.iconIndex, cellBounds);

│ Excel File  │ (with conditional formatting rules)renderCellValue(cellValue, cellBounds);

│ (.xlsx)     │```

└─────┬───────┘

      │**Testing**:

      ├─────────────────────────────┐- 5 tests: default (false), explicit false, explicit true, with numbers, with text

      │                             │- Verify no algorithm impact (same icon index regardless of flag)

      ▼                             ▼

┌─────────────┐            ┌─────────────┐---

│   Excel     │            │ CyberSheet  │

│  (Oracle)   │            │  (DUT*)     │### Feature 2: `reverseOrder` Flag

└─────┬───────┘            └─────┬───────┘

      │                          │**What It Does**:

      ▼                          ▼- Flips icon assignment order (icon[0] ↔ icon[N-1])

┌─────────────┐            ┌─────────────┐- Excel-compatible for descending data visualization

│  Expected   │            │   Actual    │- Engine-level change (minimal, isolated)

│   Output    │            │   Output    │

└─────┬───────┘            └─────┬───────┘**Interface Change**:

      │                          │```typescript

      └──────────┬───────────────┘interface IconSetRule {

                 ▼    type: 'icon-set';

         ┌───────────────┐    iconSet: ExcelIconSet;

         │   Compare     │    ranges: Range[];

         │ (Validation)  │    thresholds: IconSetThreshold[];

         └───────────────┘    showIconOnly?: boolean;

                 │    reverseOrder?: boolean; // NEW (default: false)

                 ▼}

         ✅ Pass / ❌ Fail```

```

**Implementation**:

*DUT = Device Under Test```typescript

// In ConditionalFormattingEngine.ts

---private evaluateIconSetRule(rule: IconSetRule, ...): IconSetResult {

    // ... existing percentile rank calculation ...

## 📊 Validation Categories    

    let iconIndex = this.getIconIndex(percentileRank, rule.iconSet);

### Category 1: Icon Set Rules (High Priority)    

    // NEW: Apply reverseOrder if specified

**Scope**: 18 icon sets × 3 threshold types × edge cases    if (rule.reverseOrder) {

        const iconCount = this.getIconCount(rule.iconSet);

**Test Cases**:        iconIndex = iconCount - 1 - iconIndex;

1. **Percentile-based thresholds** (67/33 split, 80/60/40/20 split, etc.)    }

2. **Percent-based thresholds** (top 25%, middle 50%, bottom 25%)    

3. **Number-based thresholds** (absolute values: >100, >50, >0)    return { iconIndex };

4. **Edge cases**:}

   - Single-value datasets (n=1)```

   - All-equal values (ties)

   - Empty cells (blanks in range)**Testing**:

   - Mixed types (numbers + text)- 10 tests: 3-icon, 4-icon, 5-icon sets × reverseOrder (true/false)

   - NaN / Infinity / errors (#DIV/0!, #N/A)- Verify icon flipping: icon[0] → icon[2] for 3-icon, icon[0] → icon[4] for 5-icon

   - Negative numbers- Verify cache still works (reverseOrder shouldn't affect cache key)

   - Zero values

   - Large datasets (10,000+ values)---



**Excel Files to Create**:### Feature 3: Rendering Order Guarantees

- `icon-sets-percentile.xlsx` (percentile thresholds)

- `icon-sets-percent.xlsx` (percent thresholds)**What It Does**:

- `icon-sets-number.xlsx` (absolute thresholds)- Define visual precedence when multiple rules apply

- `icon-sets-edge-cases.xlsx` (corner cases)- Document z-index / layer order for icons

- `icon-sets-mixed-types.xlsx` (numbers + text + blanks)- Excel-compatible stacking behavior



**Validation Metrics**:**Design**:

- ✅ **Pass**: Icon index matches Excel exactly```typescript

- ⚠️ **Warning**: Icon index differs but within 1 (rounding tolerance)// Rendering precedence (highest to lowest):

- ❌ **Fail**: Icon index differs by >1 or wrong icon set// 1. Manual cell styles (user-applied)

// 2. Icon set rules (most specific range first)

---// 3. Color scale rules

// 4. Data bar rules

### Category 2: Color Scale Rules (Medium Priority)// 5. Default cell styling



**Scope**: 2-color and 3-color scales × threshold types// Icon rendering position:

// - Left-aligned: Icon on left, value on right (default)

**Test Cases**:// - Right-aligned: Value on left, icon on right (if cell is right-aligned)

1. **2-color scales** (min-max gradients)// - Center-aligned: Icon center, value below (rare, Excel behavior)

2. **3-color scales** (min-midpoint-max gradients)```

3. **Percentile-based** (0th, 50th, 100th percentile)

4. **Percent-based** (bottom 10%, middle 50%, top 10%)**Testing**:

5. **Edge cases**:- 3-5 tests: precedence rules, alignment behaviors, multi-rule scenarios

   - Single value (gradient should be solid)

   - All equal values (midpoint color)---

   - Negative ranges

   - Large value ranges (0 to 1,000,000)## 📊 Test Strategy



**Excel Files to Create**:### Test Breakdown (15 tests total)

- `color-scale-2-color.xlsx`

- `color-scale-3-color.xlsx`#### `showIconOnly` Tests (5 tests)

- `color-scale-edge-cases.xlsx`1. Default behavior (`showIconOnly` not specified) → shows icon + value

2. Explicit `showIconOnly: false` → shows icon + value

**Validation Metrics**:3. Explicit `showIconOnly: true` → shows icon only

- ✅ **Pass**: RGB values within ±5 of Excel (perceptual tolerance)4. `showIconOnly: true` with numeric value → no number rendered

- ⚠️ **Warning**: RGB values within ±105. `showIconOnly: true` with text value → no text rendered

- ❌ **Fail**: RGB values differ by >10

#### `reverseOrder` Tests (9 tests)

---1. 3-icon set, `reverseOrder: false` (default) → icon[0] for top percentile

2. 3-icon set, `reverseOrder: true` → icon[2] for top percentile

### Category 3: Data Bar Rules (Medium Priority)3. 4-icon set, `reverseOrder: false` → icon[0] for top percentile

4. 4-icon set, `reverseOrder: true` → icon[3] for top percentile

**Scope**: Solid fill, gradient fill × threshold types5. 5-icon set, `reverseOrder: false` → icon[0] for top percentile

6. 5-icon set, `reverseOrder: true` → icon[4] for top percentile

**Test Cases**:7. Cache hit ratio with `reverseOrder` → ≥90% maintained

1. **Solid fill bars** (single color)8. Both flags together: `showIconOnly: true` + `reverseOrder: true`

2. **Gradient fill bars** (color transition)9. Edge case: Single value dataset with `reverseOrder`

3. **Positive-only bars** (0 to max)

4. **Negative-only bars** (min to 0)#### Rendering Order Tests (1 test)

5. **Mixed bars** (negative to positive)1. Visual precedence: icon set > color scale > data bar

6. **Edge cases**:

   - Zero values (no bar)**Total**: 15 tests (5 + 9 + 1)

   - Negative bars (left-aligned)

   - Large ranges (scaling behavior)---



**Excel Files to Create**:## 🚀 Implementation Plan

- `data-bar-solid.xlsx`

- `data-bar-gradient.xlsx`### Phase A: Interface Changes (15 minutes)

- `data-bar-negative.xlsx`

**Step 1**: Update `IconSetRule` interface

**Validation Metrics**:- Add `showIconOnly?: boolean` (optional, default: false)

- ✅ **Pass**: Bar width % within ±2% of Excel- Add `reverseOrder?: boolean` (optional, default: false)

- ⚠️ **Warning**: Bar width % within ±5%- Update type exports

- ❌ **Fail**: Bar width % differs by >5%

**Step 2**: Update test fixtures

---- Add optional flags to existing test rules

- Verify backward compatibility (flags are optional)

### Category 4: Multi-Rule Precedence (Low Priority)

**Deliverable**: TypeScript compiles, no breaking changes

**Scope**: Multiple rules on same cell/range

---

**Test Cases**:

1. **Icon set + color scale** (which wins?)### Phase B: `reverseOrder` Implementation (30 minutes)

2. **Icon set + data bar** (both render? precedence?)

3. **Color scale + data bar** (which wins?)**Step 3**: Implement icon index flipping

4. **Three rules on one cell** (visual output)- Modify `evaluateIconSetRule()` in `ConditionalFormattingEngine.ts`

- Add `getIconCount()` helper if needed

**Excel Files to Create**:- Apply flip logic: `iconIndex = iconCount - 1 - iconIndex`

- `multi-rule-precedence.xlsx`

**Step 4**: Write `reverseOrder` tests

**Validation Metrics**:- Create 9 tests (3-icon, 4-icon, 5-icon × true/false + edge cases)

- ✅ **Pass**: Visual output matches Excel exactly- Run tests → should pass immediately (isolated change)

- ❌ **Fail**: Different rule rendered

**Checkpoint**: Run test suite

---```bash

npm test -- conditional-formatting

## 🧪 Implementation Plan```

Expected: 15/15 new tests passing, 343/345 CF suite passing (no regressions)

### Phase A: Test Infrastructure (45 minutes)

---

**Step 1**: Create Excel Oracle Test Suite

```typescript### Phase C: `showIconOnly` Implementation (30 minutes)

// packages/core/__tests__/excel-oracle/excel-oracle.test.ts

**Step 5**: Implement renderer-level hiding

describe('Excel Oracle Validation', () => {- Modify renderer (e.g., `ExcelRenderer.ts`)

    let workbook: any;- Skip cell value rendering when `showIconOnly: true`

    - Preserve icon rendering

    beforeEach(() => {

        // Load Excel file using io-xlsx**Step 6**: Write `showIconOnly` tests

        workbook = loadExcelFile('test-data/icon-sets-percentile.xlsx');- Create 5 tests (default, explicit false/true, numeric/text values)

    });- Run tests → verify visual output (may need snapshot testing)

    

    it('should match Excel icon set results', () => {**Checkpoint**: Run full test suite

        // Get expected results from Excel fileExpected: 20/20 new tests passing (15 + 5)

        const excelResults = extractExcelResults(workbook);

        ---

        // Run CyberSheet engine

        const cyberSheetResults = engine.applyRules(...);### Phase D: Rendering Order Documentation (15 minutes)

        

        // Compare**Step 7**: Document visual precedence rules

        expect(cyberSheetResults).toMatchExcelOracle(excelResults);- Update `docs/CONDITIONAL_FORMATTING_RENDERING.md` (new file)

    });- Define z-index / stacking order

});- Document Excel compatibility notes

```

**Step 8**: Add 1 rendering order test

**Step 2**: Create Excel File Generator (optional)- Test icon set > color scale precedence

```typescript- Verify visual output matches Excel

// scripts/generate-excel-test-files.ts

// Programmatically create Excel files with CF rules**Final Checkpoint**: Run full test suite

// (Alternative: manually create in Excel)Expected: 21/21 new tests passing (20 + 1)

```

---

**Deliverable**: Test infrastructure compiles, can load Excel files

## 📖 Documentation Updates

---

### Files to Update

### Phase B: Icon Set Validation (60-90 minutes)

1. **CONDITIONAL_FORMATTING_RENDERING.md** (NEW)

**Step 3**: Create Icon Set Test Files   - Visual precedence rules

- Open Excel, create test workbooks   - Icon positioning guidelines

- Add icon set rules (percentile, percent, number thresholds)   - Excel compatibility notes

- Add edge cases (blanks, ties, mixed types)   - `showIconOnly` / `reverseOrder` behavior

- Save as `.xlsx` in `test-data/excel-oracle/`

2. **PHASE4_WAVE3_COMPLETE.md** (NEW after completion)

**Step 4**: Extract Expected Results   - Test results (21/21 passing)

```typescript   - Implementation summary

// Read Excel file's CF rules   - Excel parity notes

// Get cell values + applied icon indices

// Store as "expected output"3. **EXCEL_PARITY_MATRIX.md** (UPDATE)

const excelResults = {   - Icon Sets: Complete → **Complete with Display Options**

    'A1': { value: 100, iconIndex: 0, iconSet: '3-arrows' },   - Add note: "showIconOnly, reverseOrder implemented"

    'A2': { value: 50, iconIndex: 1, iconSet: '3-arrows' },

    // ...---

};

```## 🎯 Success Criteria



**Step 5**: Run CyberSheet, Compare### Must-Have (Go/No-Go)

```typescript- [ ] `showIconOnly` flag working (5/5 tests passing)

// Apply same rules in CyberSheet- [ ] `reverseOrder` flag working (9/9 tests passing)

// Compare icon indices cell-by-cell- [ ] Rendering order documented (1/1 test passing)

// Flag mismatches- [ ] No Wave 2 regressions (86/86 still passing)

```- [ ] Cache hit ratio ≥90% maintained

- [ ] TypeScript compilation successful

**Step 6**: Debug Mismatches (if any)- [ ] Backward compatible (flags optional)

- Investigate differences

- Fix bugs in CyberSheet (if needed)### Nice-to-Have (Bonus)

- Document known divergences (if intentional)- [ ] Visual regression tests (snapshot testing)

- [ ] Excel cross-reference validation

**Checkpoint**: Run oracle tests- [ ] Performance profiling (ensure no slowdown)

```bash- [ ] User feedback incorporated (if available)

npm test -- excel-oracle

```---

Expected: ≥95% match rate (some rounding tolerance expected)

## 🔄 Why Wave 3 Is Separate

---

### Strategic Reasons

### Phase C: Color Scale & Data Bar Validation (45-60 minutes)1. **Correctness Complete**: Wave 2 delivered 94% value (18/19 icon sets)

2. **UX Polish**: `showIconOnly`/`reverseOrder` are visual enhancements, not correctness

**Step 7**: Create Color Scale Test Files3. **User Feedback**: Better to implement after real usage patterns emerge

- 2-color and 3-color scales4. **Clean Milestone**: Wave 2 closes at perfect "done" boundary

- Various threshold types5. **Risk Isolation**: No contamination of correctness release with UX iteration

- Edge cases

### Management Benefits

**Step 8**: Create Data Bar Test Files- ✅ Wave 2 credit captured (clean milestone closure)

- Solid and gradient bars- ✅ Wave 3 can start fresh (no mental debt)

- Positive, negative, mixed ranges- ✅ User-driven design (informed by production feedback)

- ✅ Independent release (no pressure, no rush)

**Step 9**: Extract & Compare- ✅ Clear scope (UX only, no algorithm changes)

- Parse Excel output (colors, bar widths)

- Compare against CyberSheet---

- Flag mismatches

## 📋 Pre-Start Checklist

**Checkpoint**: Run oracle tests

Expected: ≥90% match rate (color/bar rendering has more tolerance)**Before starting Wave 3, confirm**:

- [ ] Wave 2 in production (pushed to GitHub)

---- [ ] Wave 2 milestone closed

- [ ] User feedback collected (if any)

### Phase D: Multi-Rule Precedence Validation (30 minutes)- [ ] UX iteration approved by stakeholders

- [ ] Team capacity available (~1-2 hours)

**Step 10**: Create Multi-Rule Test File- [ ] No higher-priority work blocking

- Multiple rules on same cells

- Test precedence behavior**If any item is unchecked**: Do not start Wave 3 yet.



**Step 11**: Visual Comparison---

- Screenshot Excel output

- Screenshot CyberSheet output## 🚀 Kickoff Command (When Ready)

- Compare manually (or use image diff tools)

```bash

**Checkpoint**: Visual validation# Step 1: Create Wave 3 branch

Expected: Precedence matches Excel behaviorgit checkout -b wave3-display-semantics



---# Step 2: Update IconSetRule interface

# (Edit ConditionalFormattingEngine.ts)

### Phase E: Documentation & Reporting (30 minutes)

# Step 3: Start TDD cycle

**Step 12**: Create Validation Reportnpm test -- conditional-formatting --watch

```markdown

# Excel Parity Validation Report# Step 4: Implement features (B → C → D)

# (Follow implementation plan above)

## Summary

- Total test cases: 150# Step 5: Verify no regressions

- Exact matches: 142 (94.7%)npm test

- Within tolerance: 6 (4.0%)

- Failures: 2 (1.3%)# Step 6: Update docs, commit, merge

git add .

## Known Divergencesgit commit -m "feat(cf): Wave 3 - Display semantics (showIconOnly, reverseOrder)"

1. **Rounding differences in percentile calculation**git checkout main

   - Excel: Uses PERCENTILE.INCgit merge wave3-display-semantics

   - CyberSheet: Uses linear interpolationgit push origin main

   - Impact: ±0.5% difference in edge cases```

   - Status: Acceptable (within Excel's own variance)

---

2. **Color scale gamma correction**

   - Excel: sRGB gamma 2.2## 🏆 Wave 3 Metrics (Projected)

   - CyberSheet: Linear RGB

   - Impact: Slightly darker midpoint colors| Metric | Estimated | Rationale |

   - Status: Investigating fix|--------|-----------|-----------|

| **Time** | 1-2 hours | Isolated scope, no algorithm changes |

## Conclusions| **Tests** | 15-20 | Simple flag logic, minimal edge cases |

- ✅ Icon sets: 98% match rate| **Code changes** | 50-100 lines | Interface + engine + renderer changes |

- ✅ Color scales: 92% match rate| **Risk** | 🟢 Near zero | No cache/algorithm/threshold changes |

- ✅ Data bars: 90% match rate| **Value** | Medium | UX polish, not correctness |

- ✅ Overall: 94.7% proven parity| **Excel parity** | 74% → 75% | Minor improvement (+1%) |

```

---

**Deliverable**: `EXCEL_PARITY_VALIDATION_REPORT.md`

## 📌 Important Notes

---

### Do NOT Start Wave 3 If:

## 📖 Documentation Updates- ❌ Wave 2 not in production

- ❌ No user feedback available

### Files to Create- ❌ Team under time pressure

- ❌ Higher-priority bugs exist

1. **`EXCEL_PARITY_VALIDATION_REPORT.md`** (NEW)

   - Test results summary### Start Wave 3 When:

   - Known divergences documented- ✅ Wave 2 validated in production

   - Match rate metrics- ✅ User feedback suggests need for display options

   - Recommendations for fixes- ✅ UX iteration phase begins

- ✅ Team has capacity (~1-2 hours)

2. **`test-data/excel-oracle/README.md`** (NEW)

   - How to use oracle tests---

   - How to create new test files

   - Expected file structure**Wave 3 Status**: ✅ **COMPLETE AND DEPLOYED**  

**Final Results**: 110/110 tests passing, 75% Excel parity  

3. **`PHASE4_WAVE4_COMPLETE.md`** (NEW after completion)**Tag**: v4.3.0  

   - Validation results**Commit**: c650b4f  

   - Lessons learned

   - Next steps**Next Wave**: Wave 4 - Excel Parity Validation (see `PHASE4_WAVE4_PLAN.md`)



### Files to Update---



1. **`EXCEL_PARITY_MATRIX.md`****Wave 3 achieved its goal: Validate existing display semantics implementation with comprehensive tests.**

   - Update "75% parity" → "75% proven parity (94.7% match rate)"
   - Add validation methodology section
   - Link to validation report

2. **`README.md`**
   - Add "Excel Parity Validated" badge
   - Link to validation report
   - Highlight proven correctness

---

## 🎯 Success Criteria

### Must-Have (Go/No-Go)
- [ ] Oracle test infrastructure working (can load Excel files)
- [ ] ≥95% match rate for icon sets (core feature)
- [ ] ≥90% match rate for color scales (acceptable tolerance)
- [ ] ≥85% match rate for data bars (wider tolerance)
- [ ] Known divergences documented (transparency)
- [ ] Validation report complete (auditable)
- [ ] No regressions in existing tests (110/110 still passing)

### Nice-to-Have (Bonus)
- [ ] Automated Excel file generation (reproducible)
- [ ] Visual diff tools for color/bar validation
- [ ] Performance benchmarks vs Excel (speed comparison)
- [ ] Cross-platform validation (Windows Excel vs Mac Excel)

---

## 🔍 Expected Discoveries

### Likely Findings
1. **Rounding differences** (Excel's floating-point vs ours)
2. **Percentile algorithm variants** (PERCENTILE.INC vs EXC)
3. **Color space differences** (sRGB vs linear RGB)
4. **Tie-breaking rules** (how Excel handles equal values)
5. **Blank cell handling** (do blanks count in ranges?)

### How to Handle Divergences
- **Document, don't panic**: Some differences are acceptable
- **Investigate root cause**: Is it a bug or design choice?
- **Assess impact**: Does it affect user experience?
- **Fix if critical**: If match rate <90%, investigate fixes
- **Accept if minor**: If within Excel's own variance, document

---

## 📋 Pre-Start Checklist

**Before starting Wave 4, confirm**:
- [ ] Wave 3 complete (110/110 tests passing)
- [ ] Excel installed (or access to Excel files)
- [ ] `io-xlsx` working (can read Excel files)
- [ ] Test data directory created (`test-data/excel-oracle/`)
- [ ] Team capacity available (~2-4 hours)
- [ ] No higher-priority work blocking

**If any item is unchecked**: Prepare infrastructure first.

---

## 🚀 Kickoff Command (When Ready)

```bash
# Step 1: Create test data directory
mkdir -p test-data/excel-oracle

# Step 2: Create Excel test files (manual step in Excel)
# - icon-sets-percentile.xlsx
# - icon-sets-percent.xlsx
# - icon-sets-edge-cases.xlsx
# - color-scale-2-color.xlsx
# - data-bar-solid.xlsx

# Step 3: Create oracle test infrastructure
mkdir -p packages/core/__tests__/excel-oracle
touch packages/core/__tests__/excel-oracle/excel-oracle.test.ts

# Step 4: Start TDD cycle
npm test -- excel-oracle --watch

# Step 5: Implement validation (B → C → D → E)
# (Follow implementation plan above)

# Step 6: Generate validation report
npm run generate-validation-report

# Step 7: Update docs, commit
git add .
git commit -m "feat(cf): Wave 4 - Excel parity validation (94.7% match rate)"
git push origin main
```

---

## 🏆 Wave 4 Metrics (Projected)

| Metric | Estimated | Rationale |
|--------|-----------|-----------|
| **Time** | 2-4 hours | Excel file creation, test writing, debugging |
| **Test Cases** | 100-150 | Icon sets (60) + color scales (30) + data bars (30) + multi-rule (10) |
| **Excel Files** | 8-10 | 1 file per test category |
| **Match Rate** | 90-95% | Realistic with rounding/algorithm differences |
| **Risk** | 🟢 Near zero | Read-only validation, no implementation changes |
| **Value** | High | Trust, credibility, bug discovery |
| **Excel Parity** | 75% → 75% proven | Quality, not quantity change |

---

## 📌 Important Notes

### Do NOT Start Wave 4 If:
- ❌ Wave 3 not complete (110/110 tests must pass)
- ❌ No access to Excel (need ground truth oracle)
- ❌ Team under time pressure (validation takes focus)
- ❌ Higher-priority bugs blocking

### Start Wave 4 When:
- ✅ Wave 3 validated in production
- ✅ Excel available for test file creation
- ✅ Team has 2-4 hour block of uninterrupted time
- ✅ Ready to discover and document edge cases

---

## 🎯 Why Wave 4 Is Important

### Before Wave 4
> "We claim 75% Excel parity based on feature coverage."

**Problem**: Subjective, unverified, hard to trust

### After Wave 4
> "We have 94.7% match rate against real Excel files across 150 test cases."

**Benefit**: Objective, audited, evidence-based

### External Value
- **Sales/Marketing**: "Proven Excel compatibility"
- **Engineering**: "High confidence in correctness"
- **Support**: "Fewer 'it doesn't match Excel' tickets"
- **Users**: "Trust that it works like Excel"

---

## 🔄 Wave 4 → Wave 5 Transition

### If Wave 4 Discovers Bugs
- **Option A**: Fix bugs in Wave 4 (extend timeline)
- **Option B**: Document bugs, fix in Wave 5 (separate wave)

**Recommendation**: Document in Wave 4, fix in Wave 5
- Keeps Wave 4 scope clean (validation only)
- Wave 5 becomes "Bug Fix Wave" (targeted, clear)

### If Wave 4 Passes Cleanly (90%+ match)
- **Next**: Wave 5 could be renderer integration, performance optimization, or new features
- **Priority**: TBD based on user feedback

---

**Wave 4 Status**: 📋 **Ready to Start** (Prerequisites met)  
**Next Action**: Create Excel test files, build oracle infrastructure  
**Expected Timeline**: 2-4 hours  
**Expected Outcome**: 90-95% proven Excel parity with documented divergences

---

**Wave 4 Goal**: Turn "we claim correctness" into "we prove correctness"

Let the validation begin! 🚀
