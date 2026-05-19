# Integration Testing Guide - Hardening Sprint

**Purpose:** Validate cross-feature workflows after Phase 8 file I/O completion.  
**Date:** May 19, 2026  
**Status:** Automated tests in `test/integration/hardening-sprint.test.ts`

---

## Automated Tests

Run the integration test suite:

```bash
npm test -- test/integration/hardening-sprint.test.ts
```

**Expected Results:**
- ✅ All tests pass
- ⏱️ Performance tests complete within time limits
- 📊 Coverage report shows >80% for file I/O paths

---

## Manual Testing Workflows

### Workflow #2: Chart with Validated Data

**Goal:** Verify charts render correctly with data validation applied.

**Steps:**

1. **Open demo:** `http://localhost:5173/excel-app-demo.html`

2. **Create validated range:**
   - Select cells A1:A5
   - Data tab → Data Validation
   - Set List: `Red, Green, Blue`
   - Click OK

3. **Add data:**
   - Click A1 → Select "Red" from dropdown
   - Click A2 → Select "Green" from dropdown
   - Click A3 → Select "Blue" from dropdown
   - Add corresponding values in B1:B3: `10, 20, 15`

4. **Insert chart:**
   - Select A1:B3
   - Insert tab → Column Chart
   - Chart should render with validated categories

**Expected Results:**
- ✅ Dropdowns appear in validated cells
- ✅ Only list values are selectable
- ✅ Chart displays with correct categories (Red, Green, Blue)
- ✅ Chart updates when cell values change via dropdown

**Failure Modes:**
- ❌ Chart doesn't render: Check DrawingLayer integration
- ❌ Validated cells allow free text: Check DropdownList component
- ❌ Chart shows #REF errors: Check chart data binding

---

### Workflow #6: Keyboard-Only Navigation

**Goal:** Verify full spreadsheet control without mouse.

**Steps:**

1. **Launch app:** `http://localhost:5173/excel-app-demo.html`

2. **Navigation test:**
   - Press `Tab` 5 times → Should move right 5 columns
   - Press `Enter` 3 times → Should move down 3 rows
   - Press `Shift+Tab` 2 times → Should move left 2 columns
   - Press `Shift+Enter` → Should move up 1 row
   - Press `Ctrl+Home` → Should jump to A1

3. **Editing test:**
   - Press `F2` → Should enter edit mode with cursor at end
   - Type `=SUM(A1:A5)` → Formula should appear
   - Press `Enter` → Formula should execute, move to next cell
   - Press `Up Arrow` → Return to formula cell
   - Press `F2` → Edit mode should show formula

4. **Formatting test:**
   - Press `Ctrl+1` → Format Cells dialog should open
   - Press `Tab` to navigate dialog → Focus should move through tabs
   - Press `Escape` → Dialog should close
   - Press `Ctrl+B` (if implemented) → Text should become bold

5. **Dialog shortcuts:**
   - Press `Ctrl+F` → Find dialog should open on Find tab
   - Type search term → Results should highlight
   - Press `Escape` → Dialog should close
   - Press `Ctrl+H` → Find dialog should open on Replace tab
   - Press `Escape` → Dialog should close

6. **File operations:**
   - Press `Ctrl+N` → Backstage New panel should open
   - Press `Escape` → Should close backstage
   - Press `Ctrl+O` → Backstage Open panel should open
   - Press `Escape` → Should close
   - Press `Ctrl+S` → Should trigger save/export

**Expected Results:**
- ✅ All navigation works without mouse
- ✅ Keyboard focus is always visible
- ✅ Tab order is logical (left→right, top→bottom)
- ✅ Escape consistently cancels/closes
- ✅ No keyboard traps (can always escape)

**Accessibility Notes:**
- Tab creates dotted outline around active cell
- Arrow keys for spatial navigation
- F2 enters edit mode (standard Excel behavior)
- Ctrl+Home is quick reset to origin

---

## Performance Benchmarks

### Test: 10K Cell Workbook

**Setup:**
```typescript
for (let row = 0; row < 100; row++) {
  for (let col = 0; col < 100; col++) {
    sheet.setCellValue({ row, col }, row * 100 + col);
  }
}
```

**Metrics:**
- ⏱️ Setup time: < 1000ms
- 📊 Memory usage: < 50MB delta
- 🖼️ First render: < 200ms
- 📜 Scroll performance: 60fps (no jank)

**How to Test Manually:**
1. Open browser DevTools → Performance tab
2. Click "Record" 🔴
3. Create 10K cell workbook via console:
   ```javascript
   const sheet = app.workbook.activeSheet;
   for (let r = 0; r < 100; r++) {
     for (let c = 0; c < 100; c++) {
       sheet.setCellValue({ row: r, col: c }, r * 100 + c);
     }
   }
   ```
4. Stop recording
5. Check flame graph for bottlenecks

**Expected:**
- ✅ No functions taking >100ms
- ✅ Rendering batched (not per-cell)
- ✅ No memory leaks after 5 iterations

---

### Test: Large Formula Recalculation

**Setup:**
```typescript
// 1000 cells with formula referencing all
for (let row = 0; row < 1000; row++) {
  sheet.setCellValue({ row, col: 0 }, row + 1);
}
sheet.setCell({ row: 1000, col: 0 }, { formula: '=SUM(A1:A1000)' });
```

**Metrics:**
- ⏱️ Initial calculation: < 100ms
- 🔄 Recalc on dependency change: < 50ms
- 📉 Formula chain depth: handles 100+ levels

**How to Test:**
1. Create formula as shown above
2. Open DevTools → Console
3. Time a value change:
   ```javascript
   console.time('recalc');
   sheet.setCellValue({ row: 0, col: 0 }, 999);
   console.timeEnd('recalc');
   ```
4. Check console for timing

**Expected:**
- ✅ Recalc completes in < 50ms
- ✅ Dependent cells update correctly
- ✅ No circular reference errors

---

## Cross-Feature Interaction Matrix

| Feature A | Feature B | Expected Behavior | Status |
|-----------|-----------|-------------------|--------|
| Cell Style | Conditional Format | CF overrides fill color only | ✅ |
| Data Validation | Chart | Chart uses validated values | ⏳ Manual |
| Formula | Export/Import | Formulas preserved with `=` | ✅ |
| Undo | Cell Edit | Restores previous value | ✅ |
| Undo | Formatting | Restores previous style | ✅ |
| Copy | Paste | Preserves formulas + styles | ✅ |
| Cut | Paste | Moves data, clears source | ✅ |
| CF Rules | Priority | Lower number = higher priority | ✅ |

---

## Known Issues & Workarounds

### Issue: Chart doesn't update after data validation change
- **Severity:** Medium
- **Workaround:** Click chart → Data tab → Refresh Data
- **Fix ETA:** Next sprint

### Issue: Large formula (>1000 cells) slow to recalculate
- **Severity:** Low (edge case)
- **Workaround:** Break into smaller SUM formulas
- **Optimization:** Phase 9 (formula engine improvements)

### Issue: Export with 50K+ cells times out
- **Severity:** Low (extreme case)
- **Workaround:** Export in batches or reduce cell count
- **Fix:** Streaming export in future phase

---

## Success Criteria

**Pass if:**
- ✅ All automated tests pass
- ✅ Manual workflows complete without errors
- ✅ Performance benchmarks meet targets
- ✅ No regressions in existing features
- ✅ Cross-feature matrix shows ✅ or documented issues

**Fail if:**
- ❌ Data loss on export/import cycle
- ❌ Crash on 10K cell workbook
- ❌ Formulas don't recalculate
- ❌ Undo doesn't restore state
- ❌ Keyboard navigation non-functional

---

## Test Execution Log

**Date:** May 19, 2026  
**Tester:** [Your Name]

### Automated Tests
```
npm test -- test/integration/hardening-sprint.test.ts

Result: [PASS/FAIL]
Duration: [X] seconds
Coverage: [XX]%
```

### Manual Tests

| Workflow | Result | Notes |
|----------|--------|-------|
| Chart + Validation | ⏳ | Not tested yet |
| Keyboard Navigation | ⏳ | Not tested yet |

### Performance

| Benchmark | Target | Actual | Pass? |
|-----------|--------|--------|-------|
| 10K Cell Setup | <1000ms | [X]ms | ⏳ |
| Large Formula | <100ms | [X]ms | ⏳ |
| Export 5K Cells | <2000ms | [X]ms | ⏳ |

---

## Next Steps After Testing

1. **Document Issues:** Log bugs in GitHub Issues with `hardening-sprint` label
2. **Fix Critical Bugs:** Data loss, crashes, core feature failures
3. **Optimize Performance:** If benchmarks fail, profile and optimize bottlenecks
4. **Update Docs:** Add workarounds to user guide
5. **Plan Phase 7 or 6:** Move to next feature phase after hardening complete
