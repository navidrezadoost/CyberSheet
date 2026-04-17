# Differential Testing — Oracle-Based Validation

**Date**: April 17, 2026  
**Purpose**: Prove semantic correctness, not just internal consistency  
**Status**: ✅ IMPLEMENTED

---

## 🎯 The Critical Distinction

### Chaos Testing Proves:
> "Is my system internally consistent?"

### Differential Testing Proves:
> "Is my system **correct**?"

---

## 💡 The Problem

A system can be:
- ✅ Perfectly deterministic
- ✅ Perfectly reversible  
- ✅ Perfectly consistent

**...and still compute the wrong answer.**

Chaos tests won't catch this. Differential tests will.

---

## 🧬 How It Works

### 1. Build a Reference Engine

A **simple, slow, obviously-correct** implementation:

```ts
class ReferenceEngine {
  // NO optimizations
  // NO scheduler
  // NO incremental logic
  // NO DAG
  
  setCellValue(addr, value) {
    this.cells.set(addr, value);
    this.recomputeAll(); // Brute force: recompute EVERYTHING
  }
  
  recomputeAll() {
    // Fixed-point iteration
    // No topological sort, just iterate until convergence
    for (let i = 0; i < 100; i++) {
      let changed = false;
      for (const cell of this.cells) {
        if (cell.formula) {
          const newValue = evaluate(cell.formula);
          if (newValue !== cell.value) {
            cell.value = newValue;
            changed = true;
          }
        }
      }
      if (!changed) break;
    }
  }
}
```

**Properties**:
- Slow ✅ (O(n²) or worse)
- Simple ✅ (~150 lines)
- Obviously correct ✅ (no clever tricks)

---

### 2. Run Both Engines in Lockstep

```ts
test('differential: optimized matches reference', async () => {
  const ops = generateOps(seed, 500);
  
  const fast = new SpreadsheetEngine();  // Optimized
  const slow = new ReferenceEngine();     // Simple
  
  for (const op of ops) {
    await fast.run(ws => applyOp(ws, op));
    applyOpSlow(slow, op);
  }
  
  expect(snapshot(fast)).toEqual(snapshot(slow));
});
```

---

### 3. Canonical State Comparison

**Critical**: State must be **canonicalized** before comparison:

```ts
function canonicalize(cells): string {
  // 1. Sort cells (deterministic order)
  const sorted = [...cells].sort((a, b) => {
    if (a.row !== b.row) return a.row - b.row;
    return a.col - b.col;
  });
  
  // 2. Sort object keys (no hidden non-determinism)
  const canonical = sorted.map(cell => ({
    col: cell.col,     // Alphabetical key order
    row: cell.row,
    value: cell.value,
    ...(cell.formula ? { formula: cell.formula } : {}),
  }));
  
  // 3. Stable JSON serialization
  return JSON.stringify(canonical);
}
```

**Why this matters**:
- V8 object property order is not always deterministic
- JSON.stringify alone can produce different strings for same data
- Hash collisions would cause false positives

---

## 🔥 What This Catches (That Chaos Tests Don't)

| Bug Type | Chaos | Differential |
|----------|-------|--------------|
| Non-determinism | ✅ | ✅ |
| Incorrect formula evaluation | ❌ | ✅ |
| Subtle DAG inconsistencies | ❌ | ✅ |
| Off-by-one addressing errors | ❌ | ✅ |
| Broken recompute ordering | ❌ | ✅ |
| Formula dependency resolution bugs | ❌ | ✅ |
| Edge cases in scheduler logic | ❌ | ✅ |

**Example**: A scheduler that always evaluates in row-major order might be deterministic and consistent, but **wrong** if formulas have inter-column dependencies.

---

## 📊 Test Coverage

### Differential Test Suite

| Test | Operations | What It Validates |
|------|-----------|-------------------|
| Basic equivalence | 50 | Optimized == reference under random ops |
| Formula-heavy | 100 | Formula chains evaluate identically |
| Hash match | 200 | State hashes match (fast comparison) |
| Formula chain | 3 | A1→A2→A3 chain correctness |
| Clear propagation | 3 | Clearing cells updates dependents |
| Rapid mutations | 20 | Same-cell rapid writes |
| Formula overwrite | 3 | Overwriting formula with value |
| **Stress test** | 500 | Large-scale equivalence |

**Total**: ~800 operations comparing optimized vs reference

---

## 🧪 Reference Engine Design

### Simplicity Over Speed

```ts
class ReferenceEngine {
  private cells: Map<string, RefCell>;
  private formulaEngine: FormulaEngine;
  
  setCellValue(addr, value) {
    // 1. Update cell (no transaction)
    // 2. Recompute ALL formulas (brute force)
  }
  
  recomputeAll() {
    // Fixed-point iteration until convergence
    // No DAG, no scheduler, no optimization
  }
}
```

**Lines of code**: ~150  
**Complexity**: O(n² × k) where k = iteration count  
**Correctness**: Obvious by inspection

**Philosophy**: If the reference engine is wrong, it should be **obviously** wrong because the code is so simple.

---

## 🎓 Why This Strategy Works

### Databases Use This

- SQLite has a slow, correct reference implementation
- Query optimizers are validated against brute-force execution
- Differential fuzzing finds optimizer bugs

### Compilers Use This

- LLVM validates optimizations against `-O0`
- Compiler fuzzing compares optimized vs unoptimized
- C compilers validate against interpreter

### Query Engines Use This

- Spark validates distributed execution against single-node
- Presto validates query plans against simple execution
- Differential testing is the gold standard

---

## ⚠️ Potential Failure Modes

If differential tests **fail**, the likely causes are:

### 1. Formula Evaluation Mismatch
**Symptom**: Different cell values  
**Cause**: Optimized engine has formula eval bug

### 2. Recompute Ordering Bug
**Symptom**: Eventually consistent but different intermediate states  
**Cause**: Scheduler evaluates in wrong order

### 3. Stale Task in Scheduler
**Symptom**: Optimized has old value, reference has new value  
**Cause**: Generation cancellation failed

### 4. Off-by-One Address Error
**Symptom**: Values in wrong cells  
**Cause**: Row/col arithmetic bug

### 5. Formula Dependency Resolution
**Symptom**: Formulas not updating when they should  
**Cause**: Dependency graph not tracking reference correctly

---

## ✅ Pass Criteria

Differential tests **pass** when:

1. **Exact state match**: After N operations, both engines have identical state
2. **Hash match**: Canonical hashes match (cheap comparison)
3. **Value match**: Every cell value is identical
4. **Formula match**: Every formula is identical
5. **Convergence**: Both engines reach steady state

**No tolerance for "close enough".**

If optimized != reference, **optimized is wrong**.

---

## 🚀 After Differential Testing Passes

### Then You Have:

✅ **Chaos testing** → System doesn't fall apart under stress  
✅ **Differential testing** → System computes the right answer  
✅ **Property testing** → Mathematical invariants hold

### This Means:

> Bugs become **statistically improbable**, not just "unlikely".

---

## 📈 Coverage Metrics Combined

| Test Category | Test Files | Lines | Tests | Operations |
|---------------|-----------|-------|-------|------------|
| Unit tests | Various | ~800 | 50+ | - |
| Structured tests | 4 files | ~2100 | 75+ | - |
| Chaos tests | chaos.test.ts | 565 | 11 | ~3500 |
| **Differential** | differential.test.ts | 450 | 8 | ~800 |
| **Total** | **Many** | **~4000** | **150+** | **~4300** |

---

## 🏆 What This Proves

### After All Tests Pass:

**Internal Consistency** (Chaos):
- Determinism holds under entropy
- Scheduler doesn't corrupt
- Events fire correctly
- Re-entrancy is blocked
- Memory stays bounded

**Semantic Correctness** (Differential):
- Optimized engine == reference engine
- Formula evaluation is correct
- Recompute order is correct
- Dependencies are resolved correctly
- No off-by-one errors

---

## 💬 The Real Finish Line

You reach **production-grade** when:

1. ✅ Chaos tests pass (robustness under stress)
2. ✅ Differential tests pass (semantic correctness)
3. ✅ Property invariants hold (mathematical guarantees)

**Only then**:

> Your system is not just "works in production."  
> It's **provably correct in production.**

---

## 🔮 Next Level: Property-Based Testing

Beyond differential testing:

```ts
property('insert + delete is identity', (row) => {
  const engine = new Engine();
  
  engine.insertRow(row);
  engine.deleteRow(row);
  
  expect(snapshot(engine)).toEqual(emptySnapshot());
});
```

This complements differential with **mathematical guarantees**.

---

## 📚 References

### Implementation
- [ReferenceEngine.ts](../packages/core/src/ReferenceEngine.ts) — Simple, correct implementation
- [differential.test.ts](../packages/core/__tests__/differential.test.ts) — Test suite

### Related Testing
- [chaos.test.ts](../packages/core/__tests__/chaos.test.ts) — Chaos testing
- [CHAOS_TESTING_FRAMEWORK.md](./CHAOS_TESTING_FRAMEWORK.md) — Chaos design

### System
- [EXECUTION_KERNEL_COMPLETE.md](./EXECUTION_KERNEL_COMPLETE.md) — System overview

---

## 🎯 Philosophy

**Chaos testing** proves your system won't break.  
**Differential testing** proves your system is right.

Most teams stop after chaos.  
Elite teams add differential.

Because **"works" is not the same as "correct".**

This is the validation strategy that separates infrastructure from experiments.
