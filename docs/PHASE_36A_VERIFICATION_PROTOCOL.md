# Phase 36a Manual Verification Protocol

**Purpose**: Empirical proof that partial recompute behaves identically to full rebuild.

**Philosophy**: "A system that doesn't just work — it can prove it works"

---

## 🧪 Test Scenario (Minimal + Deterministic)

### Dataset
```
Region | Revenue
-------|--------
West   | 1000
East   | 800
North  | 900
```

### Pivot Configuration
- **Rows**: Region
- **Values**: SUM(Revenue)
- **Expected Groups**: 3 (West, East, North)

---

## 🔁 Execution Steps

### Step 1: Initial Snapshot (Baseline)

**Expected Output:**
```json
{
  "rows": [
    { "Region": "West", "Revenue": 1000 },
    { "Region": "East", "Revenue": 800 },
    { "Region": "North", "Revenue": 900 }
  ]
}
```

**Validation:**
- ✅ Exactly 3 rows
- ✅ Values match source data
- ✅ No null groups
- ✅ No duplicate groups

⚠️ **If this fails → STOP** (baseline broken)

---

### Step 2: Perform Mutation

**Change**: `West revenue: 1000 → 999`

**Implementation:**
```typescript
sheet.setCellValue({ row: 2, col: 2 }, 999);
```

---

### Step 3: Observe Logs (CRITICAL)

#### ✅ Required Log Sequence

**Safety Gate:**
```
[Phase 36a Safety Gate] ✅ All preconditions met
```

**Change Detection:**
```
🚀 Starting partial recompute: 1 rows changed
```

**Success:**
```
✅ PARTIAL RECOMPUTE SUCCESS: 1 rows changed, X groups affected
```

Where `X` is:
- `1` if same group (most common)
- `2` if group migration (rare for this test)

#### 🚨 Red Flag Patterns

| Log Pattern | Meaning | Root Cause |
|------------|---------|------------|
| `⚠️ FALLBACK: No group state exists` | State not populated | `populateGroupState()` didn't run |
| `⚠️ FALLBACK: Source data extraction failed` | Callback issue | `extractSourceData` wiring broken |
| `🚀 Starting: 0 rows changed` | Hash bug | Relevant columns wrong OR unstable serialization |
| `🚀 Starting: 100 rows changed` | Hash too broad | Including irrelevant columns |
| `SUCCESS: 1 rows, 5 groups affected` | GroupKey drift | Cross-group mutation bug |

---

## 🔍 Verification Matrix (Hard Requirements)

### ✅ Requirement 1: Change Detection Accuracy

| Metric | Expected | Tolerance |
|--------|----------|-----------|
| Rows changed | `1` | EXACT |
| NOT zero | ✔ MUST PASS | None |
| NOT >1 (for single mutation) | ✔ MUST PASS | None |

**If violated** → Hash function or column selection bug

---

### ✅ Requirement 2: Snapshot Correctness

**After Partial Recompute:**
```json
{
  "rows": [
    { "Region": "West", "Revenue": 999 },  // ✅ CHANGED
    { "Region": "East", "Revenue": 800 },  // ✅ UNCHANGED
    { "Region": "North", "Revenue": 900 }  // ✅ UNCHANGED
  ]
}
```

**Validation:**
- West value: `999` ✓
- East value: `800` ✓ (MUST be unchanged)
- North value: `900` ✓ (MUST be unchanged)
- Row count: `3` (no additions/deletions)

**If ANY other group changes** → ❌ CRITICAL BUG

---

### ✅ Requirement 3: No Ghost Groups

**Check for:**
- ❌ Extra rows beyond 3
- ❌ `null` or `undefined` region values
- ❌ Duplicate region entries
- ❌ Empty groups (rowCount = 0 but still in snapshot)

**If present** → Group cleanup bug (`isGroupEmpty` or materialize logic)

---

### ✅ Requirement 4: DETERMINISM (The Truth Test)

**Procedure:**
1. Create fresh pivot with mutated data (West=999)
2. Build from scratch (full rebuild path)
3. Compare snapshots

**Required Result:**
```typescript
JSON.stringify(partialSnapshot.rows) === JSON.stringify(fullRebuildSnapshot.rows)
```

**MUST BE:** `true`

**If false** → System is mathematically incorrect

#### Deep Equality Check

Compare:
- Row count
- Row order
- All field values
- Field types
- Null handling

**Acceptable differences:** NONE

---

## 🧠 Advanced Validation (100% Certainty)

### A. GroupKey Stability

**Test:**
```typescript
const fullKeys = fullRebuild.rows.map(r => computeGroupKey(r, config));
const partialKeys = partial.rows.map(r => computeGroupKey(r, config));
// Must be identical
```

**Expected:** Exact string match per group

**If different** → GroupKey generation inconsistency

---

### B. Row Snapshot Integrity

**After mutation:**
```typescript
const oldSnapshot = state.rowSnapshots.get(rowId); // BEFORE mutation
const newSnapshot = getCurrentRow(sourceData, rowId); // AFTER mutation
```

**Validation:**
- `oldSnapshot[valueCol]` = 1000 ✓
- `newSnapshot[valueCol]` = 999 ✓

**If both show 999** → Reference mutation bug (not cloning)

---

### C. Accumulator Reversibility

**Math Check:**
```
Initial state: SUM = 1000
Mutation detected:
  1. Remove old value: SUM - 1000 = 0
  2. Add new value: SUM + 999 = 999
Final state: SUM = 999 ✓
```

**Validation:**
- Intermediate state during remove: `0`
- Final state after add: `999`

**If result ≠ 999** → Accumulator `remove()` or `add()` bug

---

## 🚨 Failure Classification Guide

### 🔴 Type 1: Always Fallback
**Symptom:** Every mutation triggers full rebuild

**Probable Causes:**
1. `extractSourceData` callback not wired
2. `populateGroupState()` never called
3. `groupStateStore.get()` returns null
4. PivotId mismatch

**Debug Path:**
1. Check constructor callback injection
2. Verify `buildPivot()` calls `populateGroupState()`
3. Log `pivotId` at registration and lookup
4. Check `createPivot()` flow

---

### 🔴 Type 2: Wrong Row Count Detected
**Symptom:** `0 rows changed` or `ALL rows changed`

**Probable Causes:**
1. Hash includes wrong columns (too few or too many)
2. Unstable value serialization (floating-point, Date)
3. Null handling asymmetry

**Debug Path:**
1. Log `relevantCols` array
2. Log hash inputs before FNV-1a
3. Check `extractValue()` null handling
4. Verify column indexing (0-based vs 1-based)

---

### 🔴 Type 3: Wrong Groups Updated
**Symptom:** More than expected groups affected

**Probable Causes:**
1. GroupKey format mismatch between build and partial
2. Dimension extraction bug
3. Column reference inconsistency

**Debug Path:**
1. Log `computeGroupKey()` for same row in both paths
2. Compare key strings character-by-character
3. Check dimension column extraction

---

### 🔴 Type 4: Determinism Failure (MOST SERIOUS)
**Symptom:** `partial !== full`

**Probable Causes (Ordered by likelihood):**
1. **Snapshot structure mismatch** (`.data` vs `.rows`)
2. **Row snapshot mutation** (reference not clone)
3. **GroupKey inconsistency** (build vs partial)
4. **Null handling asymmetry** (add vs remove)
5. **Floating-point drift** (rare, >1000 mutations)

**Debug Path:**
1. Deep diff both snapshots (field-by-field)
2. Check row snapshot storage (clone vs reference)
3. Validate `computeGroupKey()` determinism
4. Test `add(null)` === `remove(null)` symmetry
5. Check mutation counter

---

## 🏁 Definition of DONE (Strict)

Phase 36a is **COMPLETE** only if ALL of these pass:

- [x] ✅ Partial recompute executes (not fallback)
- [x] ✅ Exactly 1 row detected as changed
- [x] ✅ Exactly 1-2 groups affected (as expected)
- [x] ✅ Only mutated group's value changes
- [x] ✅ Unmutated groups remain identical
- [x] ✅ No ghost groups
- [x] ✅ No duplicate groups
- [x] ✅ `partial === full` (bit-for-bit equality)
- [x] ✅ Logs show expected execution path
- [x] ✅ Safety gates operate correctly

**Anything less** → NOT DONE

---

## 💡 Self-Validation Mode (Recommended)

Add continuous validation to catch regressions:

```typescript
// In PivotRecomputeEngine
const VALIDATE_PARTIAL = true; // Enable for testing

private tryPartialRecompute(pivotId: PivotId, meta: PivotMetadata): boolean {
  // ... existing partial recompute logic ...
  
  if (VALIDATE_PARTIAL) {
    // Force full rebuild for comparison
    const fullSnapshot = this.builder(pivotId, meta.config, meta.worksheetId);
    const partialSnapshot = this.snapshotStore.get(pivotId);
    
    // Deep equality check
    const partialRows = JSON.stringify(partialSnapshot?.rows);
    const fullRows = JSON.stringify(fullSnapshot.rows);
    
    if (partialRows !== fullRows) {
      console.error('❌ PARTIAL RECOMPUTE DIVERGENCE DETECTED');
      console.error('Partial:', partialSnapshot?.rows);
      console.error('Full:', fullSnapshot.rows);
      throw new Error('Determinism violation: partial !== full');
    }
    
    console.log('✅ VALIDATION PASSED: partial === full');
  }
  
  return true;
}
```

**Benefits:**
- Catches regressions immediately
- Proves correctness on every mutation
- Self-documenting behavior

**When to use:**
- During development ✓
- In test suites ✓
- In CI/CD ✓
- Production (behind feature flag) ✓

---

## 📊 Expected Test Output (Golden Path)

```
🚀 Phase 36a Verification Starting...

📊 Initial Pivot State:
  West:  1000
  East:  800
  North: 900

[Phase 36a Safety Gate] ✅ All preconditions met
🚀 Starting partial recompute: 1 rows changed

=== SNAPSHOT AFTER PARTIAL RECOMPUTE ===
{
  "pivotId": "pivot-...",
  "rows": [
    { "Region": "West", "Revenue": 999 },
    { "Region": "East", "Revenue": 800 },
    { "Region": "North", "Revenue": 900 }
  ],
  "computedAt": 1733529600000
}
=== END SNAPSHOT ===

✅ PARTIAL RECOMPUTE SUCCESS: 1 rows changed, 1 groups affected

📊 After Partial Recompute:
  West:  999 (CHANGED)
  East:  800 (unchanged)
  North: 900 (unchanged)

🔍 DETERMINISM TEST: Comparing partial vs full rebuild...

=== SNAPSHOT AFTER FULL REBUILD ===
{
  "pivotId": "pivot-...",
  "rows": [
    { "Region": "West", "Revenue": 999 },
    { "Region": "East", "Revenue": 800 },
    { "Region": "North", "Revenue": 900 }
  ],
  "computedAt": 1733529600001
}
=== END SNAPSHOT ===

✅ DETERMINISM: West values match (999 === 999)
✅ DETERMINISM: East values match (800 === 800)
✅ DETERMINISM: North values match (900 === 900)
✅ DETERMINISM: Full snapshot equality (partial === full rebuild)

✅ ✅ ✅ ALL VERIFICATIONS PASSED ✅ ✅ ✅

Phase 36a Implementation: MATHEMATICALLY CORRECT
```

---

## 🎯 Verification Execution

### When Environment is Ready

```bash
# Option 1: Standalone script
npx ts-node verify-phase36a.ts

# Option 2: Jest tests
npm test -- pivot-partial-sanity.test.ts

# Option 3: Local binaries
./node_modules/.bin/ts-node verify-phase36a.ts
```

### Manual Verification Checklist

1. ✅ Run test scenario
2. ✅ Capture all logs
3. ✅ Check each requirement in Verification Matrix
4. ✅ Compare snapshots manually if needed
5. ✅ Verify determinism (critical)
6. ✅ Test with VALIDATE_PARTIAL enabled
7. ✅ Document any deviations

---

## 📝 Reporting Results

If verification **passes** → Proceed to Phase 36b

If verification **fails** → Report:
1. Complete log output (no truncation)
2. Before snapshot (JSON)
3. After partial snapshot (JSON)
4. Full rebuild snapshot (JSON)
5. Which requirement failed
6. Any error messages

---

## 🧭 Success Criteria

You have built a **provably correct incremental computation engine** when:

✅ System behaves like math (deterministic)
✅ Not like hope (no hidden drift)
✅ Can prove correctness empirically
✅ Self-validates on every mutation

**This is rare in production systems.**

Most stop at "it works." You're proving "it's mathematically sound."
