# Wave 0 — Platform Hardening Sprint (Enforcement-Driven)

**Duration:** 8-9 focused days  
**Goal:** Runtime enforcement infrastructure for 300-function scale  
**Priority:** CRITICAL — Execute before Wave 1

---

## 🎯 Platform Identity

**What we're building:**
> Embeddable Excel-compatible calculation engine that developers trust for correctness.

**Strategic Principle:**
- Excel fidelity = reference implementation, not gospel
- Deterministic behavior > quirk matching
- Quirks matched but documented explicitly

**Optimization Priority:**
1. Long-term computational correctness
2. Excel compatibility (when deterministic)
3. Developer trust through transparency

---

## 🎯 The Real Problem

Current metadata is **descriptive, not enforcement-driven.**

At 300 functions:
- Volatile functions won't recalc if scheduler doesn't consume metadata
- Tolerance drift if precision isn't centralized
- Iterative solvers will each invent their own Newton loop
- Performance regressions undetected until production

**Without Wave 0:** Technical debt collapse at function 150.  
**With Wave 0:** Clean scaling to 300 with runtime guarantees.

---

## 📋 Four Critical Systems (Revised)

## 📋 Four Critical Systems (Revised)

### 1️⃣ **Extended Metadata + Runtime Enforcement** (3 days)

**Not just descriptive — must drive engine behavior.**

```typescript
interface FunctionMetadata {
  // ... existing fields ...
  
  // NEW: Runtime enforcement
  volatile?: boolean;              // RAND, NOW → scheduler always re-evaluates
  complexityClass: ComplexityClass; // Used for warnings + future async eligibility
  precisionClass: PrecisionClass;   // Drives test tolerance automatically
  errorStrategy: ErrorStrategy;     // Per-function error handling override
  iterationPolicy?: IterationPolicy; // For IRR, YIELD, XIRR, RATE
}

enum ComplexityClass {
  O_1 = 'O(1)',           // PI, TRUE, NOW
  O_N = 'O(n)',           // SUM, AVERAGE
  O_N_LOG_N = 'O(n log n)', // SORT, MEDIAN
  O_N2 = 'O(n²)',         // MMULT
  ITERATIVE = 'iterative' // IRR, YIELD (Newton/bisection)
}

enum PrecisionClass {
  EXACT = 'exact',            // Integer math, text
  FINANCIAL = 'financial',    // ±$0.01
  STATISTICAL = 'statistical', // ±1e-10
  ERF_LIMITED = 'erf-limited', // ±1e-7 (NORM.DIST)
  ITERATIVE = 'iterative'    // Convergence-dependent
}

enum ErrorStrategy {
  PROPAGATE_FIRST = 'propagate-first', // Standard: first error propagates
  SKIP_ERRORS = 'skip-errors',         // AVERAGE, COUNT skip errors
  LAZY_EVALUATION = 'lazy',            // IF evaluates branches lazily
  SHORT_CIRCUIT = 'short-circuit',     // AND, OR stop on first determinant
  LOOKUP_STRICT = 'lookup-strict',     // MATCH, VLOOKUP treat #N/A specially
  FINANCIAL_STRICT = 'financial-strict' // PRICE, YIELD strict coercion
}

interface IterationPolicy {
  maxIterations: number;  // e.g., 100 for IRR, 50 for YIELD
  tolerance: number;      // e.g., 1e-7
  algorithm: 'newton' | 'bisection' | 'secant';
}
```

#### **Enforcement Tasks:**

**Volatile Functions:**
- [ ] Wire `volatile` flag into dependency graph flagging
- [ ] Recalc scheduler must always re-evaluate volatile nodes
- [ ] Test: `=IF(FALSE, RAND(), 42)` still recalcs on every cycle

**Complexity Class:**
- [ ] Add `isExpensive(functionName): boolean` helper (returns true for O(n²) and ITERATIVE)
- [ ] Dev mode console warning for expensive functions on large ranges
- [ ] Auto-generate performance documentation from metadata
- [ ] Future: Mark async execution eligibility

**Precision Class:**
- [ ] Centralize tolerance policy:
  ```typescript
  const tolerance = precisionPolicy.getTolerance(metadata.precisionClass);
  ```
- [ ] No more manual tolerance per test
- [ ] Test framework queries metadata for expected tolerance

**Error Strategy:**
- [ ] Functions override category defaults (AVERAGE uses SKIP_ERRORS, not PROPAGATE_FIRST)
- [ ] Document quirk explicitly: "AVERAGE skips errors; Excel quirk matched"

**Iteration Policy:**
- [ ] Standardize Newton/bisection loops (no per-function reinvention)
- [ ] IRR, XIRR, YIELD, RATE use shared iteration abstraction
- [ ] Convergence failure = #NUM! with diagnostic message

**Tasks:**
- Extend `FunctionMetadata` interface with all 5 new fields
- Backfill all 98 existing functions with complete metadata
- Add registry query methods: `getVolatileFunctions()`, `getIterativeFunctions()`, `isExpensive()`
- Wire metadata into scheduler, test framework, iteration system

**Why it matters:**
- Prevents performance regressions (expensive function detection)
- Tolerance drift eliminated (centralized precision policy)
- Financial functions won't invent custom solvers
- Volatile recalc bugs prevented by scheduler integration

---

### 2️⃣ **Error Propagation Matrix + Per-Function Overrides** (3 days)

**Category matrix is NOT enough — Excel has per-function quirks.**

#### **Category Defaults:**

| Input | Math | Text | Financial | Lookup |
|-------|------|------|-----------|--------|
| `#DIV/0!` | Propagate | Propagate | Propagate | Propagate |
| `#VALUE!` | Propagate | Propagate | Propagate | Propagate |
| `#N/A` | Propagate | Propagate | Propagate | Special (VLOOKUP returns) |
| Empty cell | 0 | "" | 0 | #N/A (VLOOKUP) |
| String "123" | Coerce to 123 | Keep as "123" | Coerce to 123 | Match "123" |
| String "abc" | #VALUE! | Keep as "abc" | #VALUE! | Match "abc" |

#### **Per-Function Overrides (ErrorStrategy):**

| Function | Strategy | Quirk |
|----------|----------|-------|
| AVERAGE | SKIP_ERRORS | Skips #N/A, #VALUE! in range |
| COUNT | SKIP_ERRORS | Skips errors but counts numbers |
| IF | LAZY_EVALUATION | Only evaluates used branch |
| AND/OR | SHORT_CIRCUIT | Stops at first FALSE/TRUE |
| MATCH | LOOKUP_STRICT | #N/A has special meaning |
| VLOOKUP | LOOKUP_STRICT | #N/A = not found (not error) |
| SUMIFS | SKIP_ERRORS | Ignores text in numeric ranges |
| PRICE/YIELD | FINANCIAL_STRICT | Strict coercion, date validation |

**Critical for Financial:**
- PRICE/YIELD need consistent date coercion (serial number vs. string vs. Date object)
- Empty vs. zero: affects bond calculations
- Day-count conventions require strict type enforcement

#### **Tasks:**
- Create `error-propagation.ts` with centralized category defaults
- Add per-function override system via `ErrorStrategy` enum
- Document each quirk explicitly with Excel reference
- Add 50+ tests covering:
  - Category defaults (20 tests)
  - Per-function overrides (20 tests)
  - Edge cases: empty cells, string coercion, #N/A in IF branches (10 tests)

**Why it matters:**
- Financial functions fail silently without strict coercion rules
- Eliminates 80% of "why did Excel return X?" bugs
- Transparency: quirks documented, not hidden

---

### 3️⃣ **Performance Budget + Non-Blocking Benchmarks** (2 days)

**Label complexity, establish baselines, LOG warnings (never block CI).**

#### **Benchmark Suite:**

```typescript
// Example baselines (n=1000)
SUM:       0.1ms   (O(n))       ✅ Safe
SORT:      12ms    (O(n log n)) ✅ Safe
IRR:       8ms     (ITERATIVE)  ⚠️ May not converge
MMULT:     1000ms  (O(n²))      ⚠️ Warn users above 100 elements
```

#### **Budget Policy:**

| Complexity | Target | Action |
|------------|--------|--------|
| O(1), O(n), O(n log n) | <100ms @ n=1000 | ✅ Safe for large datasets |
| O(n²) | <5000ms @ n=100 | ⚠️ Warn users above 100 elements |
| ITERATIVE | <50ms typical | ⚠️ Document convergence failure modes |

#### **CI Strategy (Critical):**

**DO NOT fail CI on performance.**

CI environments are unstable (virtualization, shared runners).

**Instead:**
1. Store baseline JSON (committed to repo)
2. Run benchmarks in CI
3. Compare: current vs. baseline
4. Log warning if >20% regression
5. **Only fail if >100% regression** (clearly broken, not noise)

```typescript
if (current > baseline * 2.0) {
  throw new Error('Performance regression >100%');
} else if (current > baseline * 1.2) {
  console.warn('⚠️ Performance warning: +' + ((current/baseline - 1) * 100).toFixed(1) + '%');
}
```

**Tasks:**
- Label all 98 functions with `ComplexityClass`
- Create benchmark suite: n=10, 100, 1000
- Store baseline JSON (`performance-baselines.json`)
- Add CI check with warning/failure thresholds
- Document in `PERFORMANCE_BUDGET.md`:
  - Which functions are expensive
  - Recommended usage limits (e.g., "MMULT: max 100×100")

**Why it matters:**
- YIELD iterating 100 times = 10x slower than SUM
- Users need performance expectations before running on 10k rows
- Non-blocking benchmarks prevent CI flakiness

---

### 4️⃣ **Iteration Control System** (Integrated with #1)

**Standardized convergence management for all iterative solvers.**

**Functions requiring iteration:**
- IRR, XIRR (Newton-Raphson)
- YIELD, PRICE (bisection)
- RATE (secant method)
- GOALSEEK-like (future)

---

## 🧪 Testing Requirements

**New test suites:**
1. `metadata-validation.test.ts` — All 98 functions have complete metadata
2. `error-propagation-matrix.test.ts` — 50+ error cases
3. `performance-benchmarks.test.ts` — Baseline for regressions

**Coverage:** 95% for new infrastructure

---

## 📊 Success Metrics

| Task | Target | Status |
|------|--------|--------|
| Extended metadata | 98/98 functions | ❌ Not started |
| Error matrix | 50+ tests | ❌ Not started |
| Performance baselines | 98 functions | ❌ Not started |

---

## ⏱️ Timeline

**Day 1-2:** Extended metadata system  
**Day 3-4:** Error propagation matrix  
**Day 5:** Performance benchmarks  

**Total:** 1 week → **Ready for Wave 1**

---

## � Management Decision

**Option A:** Skip Wave 0, start Wave 1 immediately  
**Risk:** Technical debt collapse at function 150, 2-3x cost to fix later

**Option B:** Execute Wave 0 first  
**Benefit:** Clean foundation, prevents future pain, pays dividends in all 202 functions

**Recommendation:** **Execute Wave 0** — low risk, high ROI, correct engineering approach.
