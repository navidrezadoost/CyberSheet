# Async Execution Model

**Version:** 1.0 (Pre-PR #4 Hardening)  
**Status:** Locked - Production Contract  
**Audience:** Provider authors, HTTP driver implementers, formula engine contributors

---

## Overview

Cyber-Sheet's formula evaluation with external data follows a **deterministic async model** with strict phase separation. This document defines the invariants that prevent race conditions, ensure reproducible evaluation, and enable undo/redo correctness.

---

## Evaluation Phases

Formula evaluation with providers proceeds through **4 distinct phases**:

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐    ┌─────────────┐
│  1. COLLECT │ → │  2. ENQUEUE  │ → │  3. RESOLVE  │ → │ 4. EVALUATE │
└─────────────┘    └──────────────┘    └──────────────┘    └─────────────┘
  synchronous       synchronous         async boundary      synchronous
```

### Phase 1: Collect

**Purpose:** Parse formula AST and identify all provider references  
**State:** Read-only formula string → ProviderRef[] array  
**Duration:** <1ms per formula  
**Correctness:** Purely functional, deterministic

```typescript
// Input:  =STOCK("AAPL", "Price") + STOCK("MSFT", "MarketCap")
// Output: [
//   { type: 'stock', id: 'AAPL', field: 'Price' },
//   { type: 'stock', id: 'MSFT', field: 'MarketCap' }
// ]
```

### Phase 2: Enqueue

**Purpose:** Schedule refs for batch resolution  
**State:** ProviderRef[] → BatchResolver internal queue  
**Timing:** Synchronous, non-blocking  
**Deduplication:** Yes - duplicate refs enqueued once

```typescript
refs.forEach(ref => resolver.enqueue(ref));  // void return, no awaits
```

**Contract:**
- `enqueue()` returns immediately (void)
- No registry access during enqueue
- Duplicate detection via `type:id:field` key

### Phase 3: Resolve (Async Boundary)

**Purpose:** Fetch all pending refs with concurrency/throttle control  
**State:** Registry empty → Registry populated  
**Timing:** Async, variable latency (network, rate limits)  
**Workers:** Fixed pool (default: 4 concurrent)

```typescript
await resolver.resolveAll();  // Single await, deterministic completion
```

**Invariants (enforced by BatchResolver):**

1. **Deterministic Snapshot Boundary**  
   After `resolveAll()` completes, registry state is **final and immutable** for this evaluation cycle.  
   ❌ No async callbacks may mutate registry after return  
   ❌ No fire-and-forget operations (setTimeout, background workers)  
   ✅ All provider.prefetch() calls must fully await their work

2. **Registry Authority**  
   Registry is **single source of truth** - no dual-state tracking (e.g., no `resolvedSet`)  
   ❌ Do not maintain parallel state maps  
   ✅ Use `registry.hasCachedValue(ref)` for presence checks

3. **Error-as-Value Semantics**  
   Errors are **cached** as first-class values (Error instances in cache Map)  
   ❌ Errors do not throw from resolveAll()  
   ✅ Failed refs are deduplicated - not refetched on subsequent enqueue

4. **Zero In-Flight at Completion**  
   After resolveAll() returns:
   - `inFlightMap.size === 0`
   - `pendingQueue.length === 0`
   - All workers have terminated

### Phase 4: Evaluate

**Purpose:** Execute formula with resolved values  
**State:** Registry read-only → final result  
**Timing:** Synchronous (async work already complete)  
**Access:** Pure function lookup, no side effects

```typescript
const result = evaluateFormula(ast, context);  // synchronous
```

---

## Layer Separation

Three orthogonal concerns with **strict separation**:

```
┌───────────────────────────────────────────┐
│  BUSINESS LAYER: HTTP Driver             │  Quota enforcement (500/day)
│                                           │  Symbol batching optimization
└───────────────────────────────────────────┘
                    ↓
┌───────────────────────────────────────────┐
│  TRANSPORT LAYER: HttpProviderAdapter     │  Retry policies (exponential backoff)
│                                           │  Timeout handling (5s default)
└───────────────────────────────────────────┘
                    ↓
┌───────────────────────────────────────────┐
│  SCHEDULING LAYER: BatchResolver          │  Concurrency control (4 workers)
│                                           │  Throttle policies (5 req/min)
└───────────────────────────────────────────┘
```

### Responsibilities

| Layer      | Handles                        | Does NOT Handle          |
|------------|--------------------------------|--------------------------|
| Scheduling | Worker pool, throttle timing   | Network errors, retries  |
| Transport  | HTTP retry, timeout, backoff   | Rate limits, quotas      |
| Business   | Domain logic, quota limits     | Concurrency, timeouts    |

**Why?**  
Prevents logic split (e.g., rate limit checking in both driver + adapter), enables independent testing, allows graceful degradation (disable retry without breaking throttle).

---

## Concurrency vs Throttle vs Retry

**Three distinct knobs - do not conflate:**

### Concurrency (BatchResolver)
- **What:** Max simultaneous in-flight requests
- **Why:** Prevent browser/Node.js socket exhaustion
- **Config:** `maxConcurrent: 4` (default)
- **Mechanism:** Worker pool with Promise.all()
- **Failure Mode:** OOM, socket leaks, browser hangs

### Throttle (ThrottlePolicy)
- **What:** Max requests per time window
- **Why:** Respect API rate limits (5 req/min)
- **Config:** `new WindowThrottle(5, 60_000)` per provider
- **Mechanism:** Sliding window with `await acquire()`
- **Failure Mode:** HTTP 429, IP ban, quota burn

### Retry (HttpProviderAdapter)
- **What:** Re-attempt failed requests with backoff
- **Why:** Handle transient network errors
- **Config:** `maxRetries: 3, baseDelay: 1000`
- **Mechanism:** Exponential backoff (1s → 2s → 4s)
- **Failure Mode:** Cascade failures, wasted bandwidth

**Example:**  
- System allows 4 concurrent workers (concurrency)
- Each worker throttles to 5 req/min (throttle)
- Transient 500 error retries 3× with backoff (retry)

---

## Provider Contract (IDataTypeProvider)

### DETERMINISM CONTRACT

Providers implementing `prefetch?()` **MUST** satisfy:

1. **Await all async work**  
   Every async operation must be fully awaited before `prefetch()` returns.

2. **No background mutations**  
   After `prefetch()` returns, **NO** async work may mutate the registry.

3. **Complete value writes**  
   All values (success or error) must be written via `registry.setCachedValue()` synchronously or before final await.

4. **No fire-and-forget**  
   Operations like `setTimeout(() => ...)`, `.then()` without await, or background workers are **STRICTLY FORBIDDEN**.

### Rationale

- **Deterministic evaluation:** Formula results must be reproducible
- **Undo/redo correctness:** State snapshots must be stable
- **Multi-threaded safety:** (Future) Web Workers require no late mutations
- **Testing:** Async completion must be observable with `await resolveAll()`

### Correct Pattern

```typescript
async prefetch(ids: string[], ctx: FormulaContext) {
  // ✅ CORRECT: All async work awaited
  const responses = await Promise.all(
    ids.map(id => this.adapter.request(`/api/${id}`))
  );
  
  responses.forEach((resp, i) => {
    this.registry.setCachedValue(
      { type: this.type, id: ids[i], field: 'data' },
      resp.data
    );
  });
  
  // When this returns, registry is in FINAL state
}
```

### Violation Example

```typescript
async prefetch(ids: string[], ctx: FormulaContext) {
  // ❌ VIOLATION: Fire-and-forget setTimeout
  ids.forEach(id => {
    setTimeout(() => {
      this.adapter.request(`/api/${id}`).then(resp => {
        this.registry.setCachedValue(...);  // Late mutation!
      });
    }, 100);
  });
  
  // prefetch() returns immediately, but work is still pending
  // resolveAll() completes, but registry mutates later → NON-DETERMINISTIC
}
```

---

## Testing Expectations

### Hardening Tests (BatchResolver.test.ts)

1. **Late Mutation Detection**  
   Verifies that fire-and-forget operations violate determinism boundary.

2. **Error Deduplication**  
   Confirms failed refs are cached and not refetched across cycles.

### Integration Tests (Future PR #4)

1. **HTTP Driver + BatchResolver**  
   End-to-end: enqueue → throttle → fetch → retry → quota

2. **Stress Tests**  
   - 100 concurrent formulas with 1000 unique symbols
   - Rate limit enforcement under burst load
   - Quota exhaustion graceful degradation

---

## Evolution Path (Post-PR #4)

### Grouped Prefetch Optimization

**Current:**
```typescript
prefetch(ids: string[])  // Called per-entity (id='AAPL')
```

**Future (backward compatible):**
```typescript
prefetch(ids: string[], options?: { grouped?: boolean })
// When grouped=true, ids=['AAPL', 'MSFT', 'GOOG']
// Provider can batch into single API request
```

**Contract Extension:**  
- Backward compatible: providers ignoring `grouped` still work
- All DETERMINISM CONTRACT requirements still apply
- Grouped responses must populate registry for ALL ids before return

### Web Worker Isolation (Phase 7+)

When evaluation moves to Web Workers, the determinism contract **prevents late mutations from crossing thread boundaries**. No changes needed to provider implementations - contract already enforces required semantics.

---

## Summary

| Concept              | Enforcement Point       | Violation Consequence       |
|----------------------|-------------------------|-----------------------------|
| Deterministic Snapshot | resolveAll() completion | Non-reproducible evaluation |
| Registry Authority   | BatchResolver dedup     | Stale cache, double fetches |
| Error-as-Value       | setCachedValue(Error)   | Retry storms, quota burn    |
| Layer Separation     | Interface boundaries    | Logic split, test fragility |
| Provider Contract    | prefetch() await chain  | Race conditions, test flakes|

**Golden Rule:**  
After `await resolver.resolveAll()` returns, the registry is a **deterministic snapshot**. No async work may mutate it. Violations are architectural bugs, not runtime errors.

---

**Next Steps:**  
- PR #4: HTTP Driver integration (Alpha Vantage rate limiting)
- Stress test: 1000-symbol batch with 5 req/min throttle
- Documentation: STOCK() function user guide with quota behavior
