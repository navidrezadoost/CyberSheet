# Phase 4 Wave 3: Display Semantics (UX-Only)

**Status**: 📋 **Planned** (Not Started)  
**Prerequisites**: ✅ Wave 2 complete (18/19 icon sets working)  
**Target**: Excel-compatible presentation flags for icon sets  
**Type**: UX polish (isolated, safe, optional)  
**Estimated Time**: ~1-2 hours  
**Risk Level**: 🟢 Near zero (no algorithm/cache changes)

---

## 🎯 Executive Summary

Wave 3 is a **pure UX polish wave** that adds Excel-compatible display options to icon sets. It does **not** affect correctness, parity logic, or cache performance. This wave should only be started when:
- Real user feedback is available
- UX iteration begins
- Wave 2 has been in production long enough to validate

**Key Principle**: "Do not contaminate a correctness release with UX polish."

---

## 📋 Scope Definition

### ✅ What Wave 3 IS
**Excel-Compatible Presentation Flags**:
1. `showIconOnly: boolean` - Hide cell value, show only icon
2. `reverseOrder: boolean` - Flip icon assignment order
3. Rendering order guarantees (visual precedence)
4. Visual layout rules (Excel compatibility)

### ❌ What Wave 3 IS NOT
- ❌ **No algorithm changes** (percentile-rank stays untouched)
- ❌ **No parity risk** (correctness already complete)
- ❌ **No cache changes** (StatisticalCacheManager untouched)
- ❌ **No threshold logic** (Wave 1/2 foundation locked)
- ❌ **No new icon sets** (catalog complete at 18/19)

**Impact**: Pure presentation layer only (renderer-level changes)

---

## 🏗️ Technical Design

### Feature 1: `showIconOnly` Flag

**What It Does**:
- Shows only the icon (no cell value text)
- Excel-compatible visual presentation
- Renderer-level change (no engine changes)

**Interface Change**:
```typescript
interface IconSetRule {
    type: 'icon-set';
    iconSet: ExcelIconSet;
    ranges: Range[];
    thresholds: IconSetThreshold[];
    showIconOnly?: boolean; // NEW (default: false)
}
```

**Implementation**:
```typescript
// In renderer (ExcelRenderer.ts or similar)
if (iconResult && rule.showIconOnly) {
    // Render only icon, skip cell value text
    renderIcon(iconResult.iconIndex, cellBounds);
    return; // Skip text rendering
}

// Default behavior (showIconOnly = false)
renderIcon(iconResult.iconIndex, cellBounds);
renderCellValue(cellValue, cellBounds);
```

**Testing**:
- 5 tests: default (false), explicit false, explicit true, with numbers, with text
- Verify no algorithm impact (same icon index regardless of flag)

---

### Feature 2: `reverseOrder` Flag

**What It Does**:
- Flips icon assignment order (icon[0] ↔ icon[N-1])
- Excel-compatible for descending data visualization
- Engine-level change (minimal, isolated)

**Interface Change**:
```typescript
interface IconSetRule {
    type: 'icon-set';
    iconSet: ExcelIconSet;
    ranges: Range[];
    thresholds: IconSetThreshold[];
    showIconOnly?: boolean;
    reverseOrder?: boolean; // NEW (default: false)
}
```

**Implementation**:
```typescript
// In ConditionalFormattingEngine.ts
private evaluateIconSetRule(rule: IconSetRule, ...): IconSetResult {
    // ... existing percentile rank calculation ...
    
    let iconIndex = this.getIconIndex(percentileRank, rule.iconSet);
    
    // NEW: Apply reverseOrder if specified
    if (rule.reverseOrder) {
        const iconCount = this.getIconCount(rule.iconSet);
        iconIndex = iconCount - 1 - iconIndex;
    }
    
    return { iconIndex };
}
```

**Testing**:
- 10 tests: 3-icon, 4-icon, 5-icon sets × reverseOrder (true/false)
- Verify icon flipping: icon[0] → icon[2] for 3-icon, icon[0] → icon[4] for 5-icon
- Verify cache still works (reverseOrder shouldn't affect cache key)

---

### Feature 3: Rendering Order Guarantees

**What It Does**:
- Define visual precedence when multiple rules apply
- Document z-index / layer order for icons
- Excel-compatible stacking behavior

**Design**:
```typescript
// Rendering precedence (highest to lowest):
// 1. Manual cell styles (user-applied)
// 2. Icon set rules (most specific range first)
// 3. Color scale rules
// 4. Data bar rules
// 5. Default cell styling

// Icon rendering position:
// - Left-aligned: Icon on left, value on right (default)
// - Right-aligned: Value on left, icon on right (if cell is right-aligned)
// - Center-aligned: Icon center, value below (rare, Excel behavior)
```

**Testing**:
- 3-5 tests: precedence rules, alignment behaviors, multi-rule scenarios

---

## 📊 Test Strategy

### Test Breakdown (15 tests total)

#### `showIconOnly` Tests (5 tests)
1. Default behavior (`showIconOnly` not specified) → shows icon + value
2. Explicit `showIconOnly: false` → shows icon + value
3. Explicit `showIconOnly: true` → shows icon only
4. `showIconOnly: true` with numeric value → no number rendered
5. `showIconOnly: true` with text value → no text rendered

#### `reverseOrder` Tests (9 tests)
1. 3-icon set, `reverseOrder: false` (default) → icon[0] for top percentile
2. 3-icon set, `reverseOrder: true` → icon[2] for top percentile
3. 4-icon set, `reverseOrder: false` → icon[0] for top percentile
4. 4-icon set, `reverseOrder: true` → icon[3] for top percentile
5. 5-icon set, `reverseOrder: false` → icon[0] for top percentile
6. 5-icon set, `reverseOrder: true` → icon[4] for top percentile
7. Cache hit ratio with `reverseOrder` → ≥90% maintained
8. Both flags together: `showIconOnly: true` + `reverseOrder: true`
9. Edge case: Single value dataset with `reverseOrder`

#### Rendering Order Tests (1 test)
1. Visual precedence: icon set > color scale > data bar

**Total**: 15 tests (5 + 9 + 1)

---

## 🚀 Implementation Plan

### Phase A: Interface Changes (15 minutes)

**Step 1**: Update `IconSetRule` interface
- Add `showIconOnly?: boolean` (optional, default: false)
- Add `reverseOrder?: boolean` (optional, default: false)
- Update type exports

**Step 2**: Update test fixtures
- Add optional flags to existing test rules
- Verify backward compatibility (flags are optional)

**Deliverable**: TypeScript compiles, no breaking changes

---

### Phase B: `reverseOrder` Implementation (30 minutes)

**Step 3**: Implement icon index flipping
- Modify `evaluateIconSetRule()` in `ConditionalFormattingEngine.ts`
- Add `getIconCount()` helper if needed
- Apply flip logic: `iconIndex = iconCount - 1 - iconIndex`

**Step 4**: Write `reverseOrder` tests
- Create 9 tests (3-icon, 4-icon, 5-icon × true/false + edge cases)
- Run tests → should pass immediately (isolated change)

**Checkpoint**: Run test suite
```bash
npm test -- conditional-formatting
```
Expected: 15/15 new tests passing, 343/345 CF suite passing (no regressions)

---

### Phase C: `showIconOnly` Implementation (30 minutes)

**Step 5**: Implement renderer-level hiding
- Modify renderer (e.g., `ExcelRenderer.ts`)
- Skip cell value rendering when `showIconOnly: true`
- Preserve icon rendering

**Step 6**: Write `showIconOnly` tests
- Create 5 tests (default, explicit false/true, numeric/text values)
- Run tests → verify visual output (may need snapshot testing)

**Checkpoint**: Run full test suite
Expected: 20/20 new tests passing (15 + 5)

---

### Phase D: Rendering Order Documentation (15 minutes)

**Step 7**: Document visual precedence rules
- Update `docs/CONDITIONAL_FORMATTING_RENDERING.md` (new file)
- Define z-index / stacking order
- Document Excel compatibility notes

**Step 8**: Add 1 rendering order test
- Test icon set > color scale precedence
- Verify visual output matches Excel

**Final Checkpoint**: Run full test suite
Expected: 21/21 new tests passing (20 + 1)

---

## 📖 Documentation Updates

### Files to Update

1. **CONDITIONAL_FORMATTING_RENDERING.md** (NEW)
   - Visual precedence rules
   - Icon positioning guidelines
   - Excel compatibility notes
   - `showIconOnly` / `reverseOrder` behavior

2. **PHASE4_WAVE3_COMPLETE.md** (NEW after completion)
   - Test results (21/21 passing)
   - Implementation summary
   - Excel parity notes

3. **EXCEL_PARITY_MATRIX.md** (UPDATE)
   - Icon Sets: Complete → **Complete with Display Options**
   - Add note: "showIconOnly, reverseOrder implemented"

---

## 🎯 Success Criteria

### Must-Have (Go/No-Go)
- [ ] `showIconOnly` flag working (5/5 tests passing)
- [ ] `reverseOrder` flag working (9/9 tests passing)
- [ ] Rendering order documented (1/1 test passing)
- [ ] No Wave 2 regressions (86/86 still passing)
- [ ] Cache hit ratio ≥90% maintained
- [ ] TypeScript compilation successful
- [ ] Backward compatible (flags optional)

### Nice-to-Have (Bonus)
- [ ] Visual regression tests (snapshot testing)
- [ ] Excel cross-reference validation
- [ ] Performance profiling (ensure no slowdown)
- [ ] User feedback incorporated (if available)

---

## 🔄 Why Wave 3 Is Separate

### Strategic Reasons
1. **Correctness Complete**: Wave 2 delivered 94% value (18/19 icon sets)
2. **UX Polish**: `showIconOnly`/`reverseOrder` are visual enhancements, not correctness
3. **User Feedback**: Better to implement after real usage patterns emerge
4. **Clean Milestone**: Wave 2 closes at perfect "done" boundary
5. **Risk Isolation**: No contamination of correctness release with UX iteration

### Management Benefits
- ✅ Wave 2 credit captured (clean milestone closure)
- ✅ Wave 3 can start fresh (no mental debt)
- ✅ User-driven design (informed by production feedback)
- ✅ Independent release (no pressure, no rush)
- ✅ Clear scope (UX only, no algorithm changes)

---

## 📋 Pre-Start Checklist

**Before starting Wave 3, confirm**:
- [ ] Wave 2 in production (pushed to GitHub)
- [ ] Wave 2 milestone closed
- [ ] User feedback collected (if any)
- [ ] UX iteration approved by stakeholders
- [ ] Team capacity available (~1-2 hours)
- [ ] No higher-priority work blocking

**If any item is unchecked**: Do not start Wave 3 yet.

---

## 🚀 Kickoff Command (When Ready)

```bash
# Step 1: Create Wave 3 branch
git checkout -b wave3-display-semantics

# Step 2: Update IconSetRule interface
# (Edit ConditionalFormattingEngine.ts)

# Step 3: Start TDD cycle
npm test -- conditional-formatting --watch

# Step 4: Implement features (B → C → D)
# (Follow implementation plan above)

# Step 5: Verify no regressions
npm test

# Step 6: Update docs, commit, merge
git add .
git commit -m "feat(cf): Wave 3 - Display semantics (showIconOnly, reverseOrder)"
git checkout main
git merge wave3-display-semantics
git push origin main
```

---

## 🏆 Wave 3 Metrics (Projected)

| Metric | Estimated | Rationale |
|--------|-----------|-----------|
| **Time** | 1-2 hours | Isolated scope, no algorithm changes |
| **Tests** | 15-20 | Simple flag logic, minimal edge cases |
| **Code changes** | 50-100 lines | Interface + engine + renderer changes |
| **Risk** | 🟢 Near zero | No cache/algorithm/threshold changes |
| **Value** | Medium | UX polish, not correctness |
| **Excel parity** | 74% → 75% | Minor improvement (+1%) |

---

## 📌 Important Notes

### Do NOT Start Wave 3 If:
- ❌ Wave 2 not in production
- ❌ No user feedback available
- ❌ Team under time pressure
- ❌ Higher-priority bugs exist

### Start Wave 3 When:
- ✅ Wave 2 validated in production
- ✅ User feedback suggests need for display options
- ✅ UX iteration phase begins
- ✅ Team has capacity (~1-2 hours)

---

**Wave 3 Status**: 📋 **Planned** (Awaiting Wave 2 production validation)  
**Next Action**: Wait for user feedback before starting  
**Priority**: Low (UX polish, not correctness)

---

**This wave is intentionally separate from Wave 2 to preserve the clean correctness release.**

Do not merge these concerns.
