# Chaos Testing Framework

**Date**: April 17, 2026  
**Purpose**: Validate execution kernel invariants under entropy  
**Status**: ✅ IMPLEMENTED

---

## 🎯 Purpose

Structured tests prove correctness under **intentional scenarios**.  
Chaos tests prove correctness under **randomness and entropy**.

The failure modes we're guarding against (silent corruption, stale recompute, broken undo, event ordering bugs) **only appear under chaotic interleavings**.

---

## 🧬 What Chaos Testing Validates

### Not Features — **Invariants Under Stress**

| Invariant | Chaos Test | What It Catches |
|-----------|------------|-----------------|
| **E5** Determinism | Same random sequence → identical state | Non-deterministic bugs (race conditions, timing-dependent behavior) |
| **E4** Event ordering | Events fire exactly once per run() | Event batching bugs, premature emission |
| **E6** Re-entrancy | All re-entry attempts blocked | Infinite loops, nested cycles |
| Scheduler consistency | Incremental == full sync recompute | Stale tasks, broken DAG updates |
| State integrity | No corrupt state after 1000 ops | Memory corruption, silent failures |
| Memory bounds | Cell count stays bounded | Memory leaks, unbounded growth |

---

## 📊 Test Suite Structure

### 1. Determinism Tests (E5)
```ts
test('E5-chaos: same random sequence → identical final state')
test('E5-chaos: determinism holds across 500 operations')
```

**What it validates**:
- Two runs with same seed produce **identical state**
- No hidden non-determinism (timestamps, random IDs, insertion order)

**Failure mode caught**:
- State depends on V8 object property ordering
- Scheduler uses non-deterministic data structures
- Event timing affects final state

---

### 2. Event Ordering Tests (E4)
```ts
test('E4-chaos: events fire exactly once per run()')
test('E4-chaos: events see committed state (not intermediate)')
```

**What it validates**:
- Each `run()` triggers exactly one event
- Events see **committed state**, never intermediate

**Failure mode caught**:
- Event batching breaks (multiple events per run)
- Events fire before scheduler completes
- Observers see stale data

---

### 3. Re-entrancy Safety Tests (E6)
```ts
test('E6-chaos: re-entrant run() from event always throws')
```

**What it validates**:
- Event handlers cannot call `run()` (all attempts throw)
- No nested execution cycles

**Failure mode caught**:
- Re-entrancy guard has holes
- Async event handlers bypass state machine
- Infinite event loops

---

### 4. Scheduler Consistency
```ts
test('chaos: scheduler produces same result as full sync recompute')
```

**What it validates**:
- Incremental evaluation == full synchronous recompute
- Scheduler doesn't accumulate stale tasks

**Failure mode caught**:
- DAG updates miss dependencies
- Generation cancellation fails
- Topological order breaks under rapid mutations

---

### 5. State Integrity
```ts
test('chaos: rapid mutations + reads never see corrupt state')
test('chaos: 1000 operations do not cause unbounded memory growth')
```

**What it validates**:
- No silent corruption after 1000 operations
- Memory growth is bounded (not linear with op count)

**Failure mode caught**:
- Buffer overflows
- Memory leaks
- Dangling references

---

### 6. Edge Case Coverage
```ts
test('chaos: rapid mutations to same cell maintain consistency')
test('chaos: formula chain evaluates correctly after random mutations')
```

**What it validates**:
- Same-cell rapid mutations work correctly
- Formula chains stay correct under chaos

**Failure mode caught**:
- Concurrent writes corrupting cell state
- Formula dependencies breaking under mutations

---

## ⚙️ How It Works

### Random Operation Generator
Uses **seeded RNG** for reproducibility:

```ts
class SeededRandom {
  next(): number; // Linear congruential generator
  int(min, max): number;
  choice<T>(arr: T[]): T;
}
```

**Operation Distribution**:
- 35% setValue (basic writes)
- 25% setFormula (dependency creation)
- 20% clearCell (deletions)
- 20% deleteCell (cleanup)

---

### State Snapshot System
```ts
type StateSnapshot = {
  cells: Array<{ row, col, value, formula? }>;
  hash: string; // Fast comparison
};
```

**Canonical Representation**:
- Cells sorted by (row, col) for deterministic comparison
- Hash for cheap equality checks
- Full state for deep validation

---

### Test Pattern
```ts
const ops = generateOps(seed, count);

const run = async () => {
  const engine = new SpreadsheetEngine();
  for (const op of ops) {
    await engine.run(ws => applyOp(ws, op));
  }
  return snapshot(engine);
};

const state1 = await run();
const state2 = await run();

expect(state1.hash).toBe(state2.hash);
```

---

## 🔥 Performance Envelope Tests

Beyond correctness — **stress testing at scale**:

### 1000 Formulas
```ts
test('perf: 1000 formulas evaluate in reasonable time')
```
- Creates chain: A1=1, A2=A1+1, ..., A1000=A999+1
- Must complete in < 5 seconds
- Validates scheduler doesn't degrade with deep chains

### 100 Mutations Speed
```ts
test('perf: 100 mutations complete in < 1 second')
```
- Random operations
- Validates transaction overhead is acceptable

---

## 🚨 Expected Failure Modes (What We're Looking For)

If chaos tests **fail**, these are the likely culprits:

### 1. Patch Inversion Edge Case
**Symptom**: Undo/redo symmetry breaks  
**Cause**: Insert/delete + spill metadata not fully captured

### 2. Scheduler Stale Task
**Symptom**: Incremental != full recompute  
**Cause**: Generation cancellation misses edge case

### 3. Event Batching Bug
**Symptom**: Event count != operation count  
**Cause**: Multiple events emitted per run()

### 4. Hidden Non-Determinism
**Symptom**: Same seed → different states  
**Cause**: Object property iteration order, timestamps, etc.

### 5. Memory Leak
**Symptom**: Cell count grows unboundedly  
**Cause**: Deleted cells not garbage collected

### 6. Re-entrancy Hole
**Symptom**: Re-entrant run() succeeds  
**Cause**: Async event handler bypasses state machine

---

## 📈 Coverage Metrics

| Test Suite | Operations | Time Budget | What It Proves |
|------------|------------|-------------|----------------|
| Determinism 1 | 200 | 30s | Same seed → same state |
| Determinism 2 | 500 | 60s | Scales to larger sequences |
| Event ordering | 100 | 20s | Events fire correctly |
| Re-entrancy | 30 | 15s | No nested cycles |
| Scheduler consistency | 150 | 30s | Incremental == sync |
| State integrity | 200 | 30s | No corruption after reads |
| Memory growth | 1000 | 60s | Bounded memory |
| Same-cell chaos | 100 | 20s | Rapid writes work |
| Formula chain | 100 | 20s | Dependencies stay correct |
| **Performance 1k** | 1000 | 10s | Deep chains scale |
| **Performance 100** | 100 | 5s | Mutations are fast |

**Total**: ~3500 random operations under chaos

---

## ✅ Pass Criteria

Chaos tests **pass** when:

1. **Determinism**: 100% of runs produce identical state
2. **Event ordering**: Event count == operation count (always)
3. **Re-entrancy**: 100% of re-entry attempts throw
4. **Scheduler**: Incremental == full sync (always)
5. **State integrity**: No exceptions after 1000 ops
6. **Memory**: Cell count < operation count
7. **Performance**: All operations complete within time budget

---

## 🎓 What This Proves

If all chaos tests pass:

> **Your execution kernel is production-grade.**

Not theory.  
Not promises.  
**Proven under entropy.**

---

## 🚀 Next Steps After Chaos Testing

### If Tests Pass ✅
1. **Increase operation count**: 10k operations
2. **Add concurrency**: Multiple engines in parallel
3. **Add complexity**: Spill arrays, merged cells, complex formulas

### If Tests Fail ❌
1. **Isolate the failure**: Reduce operation count until test passes
2. **Extract minimal repro**: Smallest sequence that breaks invariant
3. **Fix the root cause**: Update implementation
4. **Add regression test**: Structured test for that edge case

---

## 📚 References

### Implementation
- [chaos.test.ts](../packages/core/__tests__/chaos.test.ts) — Full test suite

### Tested Components
- [SpreadsheetEngine.ts](../packages/core/src/SpreadsheetEngine.ts) — Orchestrator
- [RecomputeScheduler.ts](../packages/core/src/RecomputeScheduler.ts) — Scheduler
- [TransactionContext.ts](../packages/core/src/transaction/TransactionContext.ts) — Transactions

### Related Documentation
- [EXECUTION_KERNEL_COMPLETE.md](./EXECUTION_KERNEL_COMPLETE.md) — System overview
- [ENGINE_ORCHESTRATION_ARCHITECTURE.md](./ENGINE_ORCHESTRATION_ARCHITECTURE.md) — Design doc

---

## 💬 Philosophy

Most systems test the **happy path**.

Elite systems test **chaos**.

Because production **is chaos**.

This testing framework proves your guarantees hold when:
- Operations are random
- Timing is unpredictable
- Users do unexpected things

**That's the difference between a demo and a runtime.**
