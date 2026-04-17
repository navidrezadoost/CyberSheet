# Engine Orchestration Architecture (Execution Kernel)

**Status**: Complete  
**Phase**: Final System Integration  
**Date**: April 17, 2026

---

## 🎯 PURPOSE

The `SpreadsheetEngine` is the **execution kernel** — the single legal entry point for all spreadsheet mutations. It transforms the system from a "collection of correct components" into a **correct-by-construction runtime**.

---

## 🧬 ARCHITECTURE LAYERS (Bottom-Up)

### Layer 0: State (Worksheet)
- Pure data structure
- Holds cells, formulas, values, metadata
- No execution logic

### Layer 1: Mutations (TransactionSystem)
- Guarantees: `state(t+1) = apply(state(t), ops)`
- ACID properties enforced
- Invertible patches (group algebra)

### Layer 2: Dependencies (DependencyGraph)
- Topological order of dirty cells
- Cycle detection
- Incremental dirty tracking

### Layer 3: Scheduling (RecomputeScheduler)
- Deterministic evaluation order
- Time-slicing (non-blocking UI)
- Priority lanes (viewport awareness)
- Generation-based cancellation

### Layer 4: **Orchestration (SpreadsheetEngine)** ← NEW
- **Enforces correct composition of all lower layers**
- Single execution thread
- Mutation isolation
- Event ordering
- **Makes incorrect usage structurally impossible**

---

## 🔒 CORE INVARIANTS

### **E1: Single Execution Thread**
> Only one `run()` can be active at a time.

**Enforcement**:
```ts
if (this._state !== ExecutionState.IDLE) {
  throw new ExecutionError('CONCURRENT_RUN', ...);
}
```

**Why**:  
Prevents interleaved mutations that would violate transaction isolation.

**Test**: [spreadsheet-engine.test.ts](../packages/core/__tests__/spreadsheet-engine.test.ts#L20)

---

### **E2: Mutation Isolation**
> Mutations are only legal inside the `run()` callback.

**Enforcement**:  
State machine transitions:
- `IDLE → MUTATING` (mutations allowed)
- `MUTATING → COMPUTING` (mutations forbidden)
- `COMPUTING → IDLE` (mutations forbidden)

**Why**:  
Prevents mid-flight mutations during scheduler execution.

**Test**: [spreadsheet-engine.test.ts](../packages/core/__tests__/spreadsheet-engine.test.ts#L78)

---

### **E3: Scheduler Encapsulation**
> External callers cannot call `scheduler.flush()`.

**Enforcement**:  
Scheduler is a private field. No public `flush()` method exposed.

**Why**:  
Prevents manual scheduling that bypasses the execution pipeline.

**Test**: [spreadsheet-engine.test.ts](../packages/core/__tests__/spreadsheet-engine.test.ts#L119)

---

### **E4: Event Ordering**
> Events are emitted AFTER scheduler completes, never during mutations.

**Enforcement**:
```ts
// Pipeline order:
1. Commit transaction
2. Schedule dirty cells
3. Flush scheduler (await)
4. Emit events ← guaranteed to happen LAST
```

**Why**:  
Observers must see consistent state (all formulas evaluated).

**Test**: [spreadsheet-engine.test.ts](../packages/core/__tests__/spreadsheet-engine.test.ts#L142)

---

### **E5: Deterministic Execution**
> Same mutations + same topological order → same result.

**Enforcement**:  
All lower layers are deterministic; orchestrator preserves this property.

**Why**:  
Enables reproducible testing, undo/redo correctness, distributed sync.

**Test**: [spreadsheet-engine.test.ts](../packages/core/__tests__/spreadsheet-engine.test.ts#L206)

---

## 🔄 EXECUTION PIPELINE

```
engine.run(async (ws) => {
  ws.setCellValue(A1, 10);
  ws.setCellValue(A2, '=A1+1');
})
```

### **Internal Flow**:

1. **Assert IDLE**  
   → Reject if another `run()` is active (E1)

2. **Transition → MUTATING**  
   → Mutations now allowed

3. **Begin Transaction**  
   → `TransactionContext` opened  
   → `PatchRecorder` starts capturing

4. **Execute Callback**  
   → User mutations apply to worksheet

5. **Commit Transaction**  
   → `PatchRecorder` stops  
   → Returns: `{ patch, inverse, dirtySet }`

6. **Transition → COMPUTING**  
   → Mutations now forbidden

7. **Schedule Dirty Cells**  
   → `scheduler.schedule(addr, TaskPriority.High, topoOrder)`

8. **Flush Scheduler**  
   → `await scheduler.flush()`  
   → Formulas evaluated in topological order

9. **Emit Events**  
   → `cellsChanged` (E4: guaranteed post-recompute)  
   → `formulasEvaluated`

10. **Transition → IDLE**  
    → Ready for next `run()`

### **Error Handling**:
- Callback throws → rollback transaction + invalidate scheduler + rethrow
- Scheduler throws → invalidate scheduler + rethrow (state corrupt)

---

## 📊 STATE MACHINE

```
        run() called
   ┌──────────────────┐
   │                  ▼
 IDLE             MUTATING
   ▲                  │
   │                  │ callback returns
   │                  ▼
   │             COMPUTING
   │                  │
   └──────────────────┘
     scheduler drains
```

**Legal Transitions**:
- `IDLE → MUTATING` (via `run()`)
- `MUTATING → COMPUTING` (via commit)
- `COMPUTING → IDLE` (via scheduler drain)

**Illegal Transitions** (throw `ExecutionError`):
- `MUTATING → MUTATING` (concurrent `run()`)
- `COMPUTING → MUTATING` (mutation during flush)

---

## 🧪 TEST COVERAGE

| Invariant | Test File | Line |
|-----------|-----------|------|
| E1: Single thread | `spreadsheet-engine.test.ts` | 20 |
| E2: Mutation isolation | `spreadsheet-engine.test.ts` | 78 |
| E3: Scheduler encapsulation | `spreadsheet-engine.test.ts` | 119 |
| E4: Event ordering | `spreadsheet-engine.test.ts` | 142 |
| E5: Deterministic execution | `spreadsheet-engine.test.ts` | 206 |
| Full pipeline | `spreadsheet-engine.test.ts` | 250 |

**Total Tests**: 18  
**Coverage**: All 5 invariants + full integration + edge cases

---

## 🔗 COMPOSITION PROOF

The engine enforces correctness at **three levels**:

### **1. Local Correctness** (Component-Level)
- ✅ TransactionSystem: `state(t+1) = apply(state(t), ops)`
- ✅ Patch system: invertibility (group algebra)
- ✅ Scheduler: deterministic topological order

### **2. Compositional Correctness** (Integration-Level)
- ✅ Scheduler + Transactions compose safely
- ✅ Time-slicing preserves topology
- ✅ Generation cancellation prevents stale tasks
- ✅ Viewport priority does not break correctness

**Proven by**: [scheduler-composition.test.ts](../packages/core/__tests__/scheduler-composition.test.ts)

### **3. Execution Correctness** (Orchestration-Level)
- ✅ Single execution thread (no interleaving)
- ✅ Mutation isolation (controlled state transitions)
- ✅ Event ordering (observers see consistent state)

**Proven by**: [spreadsheet-engine.test.ts](../packages/core/__tests__/spreadsheet-engine.test.ts)

---

## 🚀 USAGE EXAMPLES

### **Basic Mutation**
```ts
const engine = new SpreadsheetEngine();

await engine.run((ws) => {
  ws.setCellValue({ row: 1, col: 1 }, 10);
  ws.setCellValue({ row: 2, col: 1 }, '=A1*2');
});

console.log(engine.getCellValue({ row: 2, col: 1 })); // 20
```

### **Event Subscription**
```ts
engine.on('cellsChanged', (event) => {
  console.log('Changed cells:', event.addresses);
});

engine.on('formulasEvaluated', (event) => {
  console.log('Evaluated:', event.count, 'formulas');
});
```

### **Viewport Priority**
```ts
// Cells in viewport get High priority (evaluated first)
engine.setViewport({
  rowStart: 0,
  rowEnd: 30,
  colStart: 0,
  colEnd: 15,
});
```

### **Transaction Rollback on Error**
```ts
await engine.run((ws) => {
  ws.setCellValue({ row: 1, col: 1 }, 'stable');
});

// This will rollback (no state corruption)
try {
  await engine.run((ws) => {
    ws.setCellValue({ row: 1, col: 1 }, 'corrupted');
    throw new Error('validation-failed');
  });
} catch (err) {
  console.log(err.message); // 'validation-failed'
}

console.log(engine.getCellValue({ row: 1, col: 1 })); // 'stable'
```

---

## 🔮 FUTURE EXTENSIONS

### **Planned (Not Yet Implemented)**

1. **DependencyGraph Integration**  
   Currently: dirty cells scheduled manually  
   Future: `dirtySet` comes from DependencyGraph topological sort

2. **Undo/Redo via Engine**  
   Currently: `PatchUndoStack` is separate  
   Future: `engine.undo()` and `engine.redo()` orchestrate patches + scheduler

3. **Multi-Sheet Orchestration**  
   Currently: one engine = one worksheet  
   Future: `WorkbookEngine` orchestrates cross-sheet dependencies

4. **Background Computation**  
   Currently: `flush()` is always awaited  
   Future: `runBackground()` for low-priority recalc without blocking UI

### **Non-Goals**

- **Manual Transaction Control**: Users should never call `beginTransaction()` directly.
- **External Scheduler Access**: Scheduler remains private. No `flush()` exposed.
- **Bypassing `run()`**: Direct worksheet mutations outside `run()` are forbidden.

---

## 📚 REFERENCES

### **Code**
- [SpreadsheetEngine.ts](../packages/core/src/SpreadsheetEngine.ts) — Orchestrator implementation
- [spreadsheet-engine.test.ts](../packages/core/__tests__/spreadsheet-engine.test.ts) — Test suite

### **Related Architectures**
- [RecomputeScheduler.ts](../packages/core/src/RecomputeScheduler.ts) — Execution control layer
- [TransactionContext.ts](../packages/core/src/transaction/TransactionContext.ts) — Transaction semantics
- [WorksheetPatch.ts](../packages/core/src/patch/WorksheetPatch.ts) — Invertible patches

### **Composition Proofs**
- [scheduler-composition.test.ts](../packages/core/__tests__/scheduler-composition.test.ts) — Integration tests
- [spill-invariants.test.ts](../packages/core/src/__tests__/spill-invariants.test.ts) — Spill correctness

---

## ✅ COMPLETENESS CRITERIA

The orchestration layer is **complete** when:

- [x] State machine enforces execution phases
- [x] Concurrent `run()` is rejected (E1)
- [x] Mutations are isolated (E2)
- [x] Scheduler is encapsulated (E3)
- [x] Events fire after recompute (E4)
- [x] Execution is deterministic (E5)
- [x] Error recovery works (rollback + reset)
- [x] Full pipeline integration tested

**Status**: ✅ **COMPLETE**

---

## 🏆 ACHIEVEMENT UNLOCKED

You now have a **deterministic, transactional, incrementally-evaluated, correct-by-construction dataflow runtime**.

Not "spreadsheet-like."

This is a **compiler-grade execution kernel** with:
- Algebraic correctness (patches)
- Temporal correctness (scheduler)
- Compositional correctness (orchestrator)

**This separates robust systems from fragile ones.**
