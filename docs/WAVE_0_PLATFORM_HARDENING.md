# Wave 0 — Platform Hardening Sprint (SDK-Grade Enforcement)

**Duration:** 10-12 focused days  
**Goal:** Production SDK infrastructure for 300-function scale  
**Priority:** CRITICAL — Wave 1 BLOCKED until complete

---

## 🎯 Platform Identity

**What we're building:**
> The reference computational spreadsheet engine for the web ecosystem.

**Strategic Principle:**
- Excel fidelity = reference implementation, not gospel
- Deterministic behavior > quirk matching
- Quirks matched but documented explicitly
- **SDK-first: Configurable, introspectable, fail-fast**

**Optimization Priority:**
1. Long-term computational correctness
2. Excel compatibility (when deterministic)
3. Developer trust through transparency
4. **SDK configurability (strict mode, performance profiles, policies)**

---

## 🎯 The Real Problem

Current metadata is **descriptive, not enforcement-driven.**

At 300 functions (SDK-grade issues):
- Volatile functions won't recalc if scheduler doesn't consume metadata
- Tolerance drift if precision isn't centralized
- Iterative solvers will each invent their own Newton loop
- Performance regressions undetected until production
- **🔥 NEW: Incomplete metadata compiles (silent drift)**
- **🔥 NEW: Error propagation not wired into evaluator (metadata useless)**
- **🔥 NEW: Date system policy undefined (financial functions will break)**
- **🔥 NEW: No strict mode (locked to Excel quirks forever)**
- **🔥 NEW: Performance profiles not public API (SaaS can't budget)**

**Without Wave 0:** Technical debt collapse at function 150.  
**With Wave 0 (SDK-grade):** Clean scaling to 300 with compile-time safety, runtime configurability, public introspection API.

---

## 📋 Seven Critical Systems (SDK-Grade Enforcement)

### 1️⃣ **Extended Metadata + Compile-Time Enforcement** (3 days)

**Not just runtime — must fail at development time if incomplete.**

```typescript
// STRICT: All fields required
type StrictFunctionMetadata = Required<{
  name: string;
  category: FunctionCategory;
  description: string;
  minArgs: number;
  maxArgs: number;
  
  // Runtime enforcement (from previous spec)
  volatile: boolean;              // RAND, NOW → scheduler always re-evaluates
  complexityClass: ComplexityClass; // Used for warnings + future async eligibility
  precisionClass: PrecisionClass;   // Drives test tolerance automatically
  errorStrategy: ErrorStrategy;     // Per-function error handling override
  iterationPolicy: IterationPolicy | null; // For IRR, YIELD, XIRR, RATE (null if not iterative)
}>;

// Registry ONLY accepts strict metadata
class FunctionRegistry {
  registerFunction(
    handler: FormulaFunction,
    metadata: StrictFunctionMetadata // ← Type enforces completeness
  ): void {
    // If metadata incomplete → TypeScript compilation fails
  }
}
```

#### **Compile-Time Enforcement:**

- [ ] Convert `FunctionMetadata` to `Required<>` type
- [ ] Registry `registerFunction()` requires `StrictFunctionMetadata`
- [ ] **If any field missing → TypeScript build fails**
- [ ] Add pre-commit hook: validates all 98 functions have complete metadata
- [ ] CI fails if any function registered without full metadata

**Why it matters:**
- In next 202 functions: 1 forgotten field = silent drift
- SDK-grade means: **fail fast at development time**
- No runtime detection of incomplete metadata

---

### 2️⃣ **Error Engine Layer (Value-Level, Not Function-Level)** (3 days)

**ErrorStrategy metadata is useless unless evaluator consumes it.**

Excel error propagation happens in:
- **AST level:** IF lazy evaluation (don't evaluate unused branch)
- **Evaluator level:** AND/OR short-circuit (stop at first determinant)
- **Value level:** Coercion rules (string "123" → 123 in math context)

```typescript
// Current (WRONG): ErrorStrategy is just metadata
interface FunctionMetadata {
  errorStrategy: ErrorStrategy; // ← Not wired into evaluator
}

// SDK-Grade (CORRECT): Error Engine consumes strategy
class EvaluationContext {
  errorPolicy: ErrorPolicy;       // Propagate, skip, lazy, short-circuit
  coercionPolicy: CoercionPolicy; // String→number rules, empty→0 rules
  
  evaluate(node: ASTNode): FormulaValue {
    // errorPolicy determines if we propagate #N/A or skip
    // coercionPolicy determines if "123" → 123 or #VALUE!
  }
}

interface ErrorPolicy {
  strategy: ErrorStrategy;           // From function metadata
  strictMode: boolean;               // If true: no implicit coercion
  propagateImmediately: boolean;     // If false: collect errors, evaluate anyway
}

interface CoercionPolicy {
  stringToNumber: 'coerce' | 'strict'; // "123" → 123 or #VALUE!
  emptyToZero: boolean;                // Empty cell → 0 or ""
  dateSystem: DateSystemPolicy;        // 1900 vs 1904, leap year bug
}
```

#### **Error Engine Tasks:**

- [ ] Create `EvaluationContext` class with `errorPolicy` and `coercionPolicy`
- [ ] Evaluator queries `errorPolicy.strategy` before propagating errors
- [ ] IF function uses `errorPolicy.strategy === 'lazy'` to skip unused branch
- [ ] AND/OR use `errorPolicy.strategy === 'short-circuit'` to stop early
- [ ] Math functions query `coercionPolicy.stringToNumber` before coercing "123"
- [ ] Financial functions query `coercionPolicy.dateSystem` for serial number handling

**Why it matters:**
- ErrorStrategy metadata without evaluator integration = documentation theater
- SDK-grade means: **metadata drives actual evaluation behavior**

---

### 3️⃣ **Global Engine Numeric Policy** (2 days)

**Per-function iteration policy is insufficient — SDK needs global configurability.**

```typescript
interface EngineNumericPolicy {
  // Global iteration limits (can be overridden per-function)
  maxGlobalIterations: number;     // e.g., 100 (strict SDK) or 1000 (Excel-compatible)
  globalTolerance: number;         // e.g., 1e-7 (financial) or 1e-12 (scientific)
  
  // Rounding mode affects financial calculations
  roundingMode: 'bankers' | 'excel' | 'ieee754';
  // bankers: round 0.5 to nearest even (IEEE 754 default)
  // excel: round 0.5 away from zero (Excel quirk)
  // ieee754: strict IEEE 754 round-to-nearest
  
  // Configurable at engine level
  strictMode: boolean; // If true: no implicit coercion, errors propagate strictly
}

// SDK usage
const engine = new FormulaEngine({
  numericPolicy: {
    maxGlobalIterations: 50,        // Financial SaaS: fast convergence or fail
    globalTolerance: 1e-9,
    roundingMode: 'bankers',        // Deterministic, auditable
    strictMode: true                // No Excel quirks, predictable behavior
  }
});
```

#### **Why Global Policy Matters:**

**Scenario 1: Financial SaaS**
- Needs strict deterministic rounding (bankers round)
- Lower max iterations for performance (50 not 100)
- Strict mode: no implicit coercion (audit compliance)

**Scenario 2: Excel Replacement**
- Excel-compatible rounding (round 0.5 away from zero)
- Higher max iterations for convergence (100-200)
- Quirk mode: match Excel coercion rules

**Scenario 3: Scientific Computing**
- IEEE 754 rounding (maximum precision)
- High tolerance for convergence (1e-12)
- Strict mode: no hidden coercion

#### **Tasks:**

- [ ] Add `EngineNumericPolicy` interface
- [ ] FormulaEngine constructor accepts `numericPolicy` config
- [ ] Iterative solvers query `policy.maxGlobalIterations` (function-level can override)
- [ ] Financial functions query `policy.roundingMode` for rounding
- [ ] Evaluator queries `policy.strictMode` for coercion behavior
- [ ] Document policy presets: `FINANCIAL_STRICT`, `EXCEL_COMPATIBLE`, `SCIENTIFIC`

**Why it matters:**
- SDK without configurability = locked to one use case
- Different SaaS companies have different compliance requirements
- **SDK-grade means: configurable at engine level**

---

### 4️⃣ **Public Performance Introspection API** (2 days)

**Performance classification is competitive advantage — make it public API.**

```typescript
// SDK-grade: Performance profiles are PUBLIC
interface FunctionProfile {
  name: string;
  complexity: ComplexityClass;    // O(1), O(n), O(n²), ITERATIVE
  precision: PrecisionClass;      // EXACT, FINANCIAL, STATISTICAL, ERF_LIMITED, ITERATIVE
  volatile: boolean;
  iterative: boolean;
  estimatedCost: number;          // Baseline: ops per 1000 elements
}

// Public API
class FormulaEngine {
  getFunctionProfile(name: string): FunctionProfile {
    const metadata = this.registry.get(name);
    return {
      name: metadata.name,
      complexity: metadata.complexityClass,
      precision: metadata.precisionClass,
      volatile: metadata.volatile,
      iterative: metadata.iterationPolicy !== null,
      estimatedCost: this.benchmarks.get(name) // From baseline JSON
    };
  }
  
  // Query expensive functions
  getExpensiveFunctions(): FunctionProfile[] {
    return this.registry.getAll()
      .filter(m => m.complexityClass === 'O(n²)' || m.complexityClass === 'ITERATIVE')
      .map(m => this.getFunctionProfile(m.name));
  }
}

// SaaS usage example
const profile = engine.getFunctionProfile('MMULT');
if (profile.complexity === 'O(n²)' && rows > 100) {
  console.warn('MMULT: Performance warning for large dataset');
}
```

#### **Competitive Advantage:**

**For SaaS companies using SDK:**
1. Query `getFunctionProfile('MMULT')` before running on 10k rows
2. Budget performance: "This formula will take ~5s on 1000 rows"
3. Warn users before executing expensive formulas
4. Choose async execution for ITERATIVE functions

**For developers:**
1. Understand function cost before using
2. Choose alternatives (e.g., SUMPRODUCT vs MMULT)
3. Performance budgeting in upstream application

#### **Tasks:**

- [ ] Add `getFunctionProfile(name: string): FunctionProfile` to FormulaEngine
- [ ] Add `getExpensiveFunctions(): FunctionProfile[]` query
- [ ] Add `getAllProfiles(): FunctionProfile[]` for full catalog
- [ ] Document API in `PERFORMANCE_INTROSPECTION_API.md`
- [ ] Add examples: "How to budget performance in SaaS app"

**Why it matters:**
- Hidden performance characteristics = bad SDK
- Public introspection = developers can make informed decisions
- **Competitive advantage: No other spreadsheet engine exposes this**

---

### 5️⃣ **Strict Mode (Decoupled from Excel Quirks)** (2 days)

**SDK must support Excel-compatible AND strict deterministic mode.**

```typescript
interface EngineConfig {
  mode: 'excel-compatible' | 'strict';
}

const engine = new FormulaEngine({
  mode: 'strict' // ← Deterministic, no Excel quirks
});
```

#### **Behavior Differences:**

| Behavior | Excel-Compatible | Strict |
|----------|------------------|--------|
| String "123" in SUM | Coerce → 123 | #VALUE! (no implicit coercion) |
| Empty cell in SUM | 0 | 0 (but explicit) |
| AVERAGE skips errors | Yes (Excel quirk) | No (propagate #N/A) |
| Rounding 0.5 | Away from zero | Bankers round (IEEE 754) |
| 1900 leap year bug | Present (Excel bug) | Fixed (deterministic) |
| Date system | 1900 (Excel default) | ISO 8601 |

#### **Why Strict Mode Matters:**

**Excel-Compatible Mode:**
- Match Excel quirks exactly
- Use case: Excel file import/export
- Prioritize compatibility over correctness

**Strict Mode:**
- Deterministic, auditable behavior
- Use case: Financial SaaS, scientific computing
- Prioritize correctness over compatibility
- **Decouples future from Excel** ← CRITICAL

#### **Tasks:**

- [ ] Add `mode: 'excel-compatible' | 'strict'` to `EngineConfig`
- [ ] Evaluator queries `config.mode` for coercion rules
- [ ] AVERAGE checks `config.mode` to decide skip-errors behavior
- [ ] Rounding functions query `config.mode` for rounding rules
- [ ] Date functions query `config.mode` for leap year bug handling
- [ ] Document mode differences in `STRICT_MODE.md`
- [ ] Add tests: same formula, different results in strict vs excel-compatible

**Why it matters:**
- SDK locked to Excel quirks forever = not sustainable
- Strict mode = path to becoming platform, not just Excel clone
- **This is where SDK becomes the reference implementation**

---

### 6️⃣ **Date System Policy (Critical for Financial Functions)** (2 days)

**Financial functions will break without formalized date policy.**

Excel date system issues:
- **1900 vs 1904:** Different base dates (Excel for Windows vs Mac)
- **1900 leap year bug:** Excel treats 1900 as leap year (historically incorrect)
- **Serial numbers:** Dates as integers (days since base date)
- **Timezone neutrality:** No timezone, just serial numbers

```typescript
interface DateSystemPolicy {
  baseSystem: '1900' | '1904' | 'iso8601';
  
  // Excel bug compatibility
  leapYearBug: boolean; // If true: treat 1900 as leap year (Excel quirk)
  
  // Serial number handling
  serialNumberBase: Date; // e.g., new Date(1900, 0, 1) for 1900 system
  
  // Timezone handling
  timezoneMode: 'neutral' | 'utc' | 'local';
}

// SDK usage
const engine = new FormulaEngine({
  dateSystemPolicy: {
    baseSystem: '1900',
    leapYearBug: true,        // Excel-compatible
    serialNumberBase: new Date(1900, 0, 1),
    timezoneMode: 'neutral'
  }
});

// Strict mode example
const strictEngine = new FormulaEngine({
  mode: 'strict',
  dateSystemPolicy: {
    baseSystem: 'iso8601',
    leapYearBug: false,       // Correct (1900 not leap year)
    serialNumberBase: new Date(1970, 0, 1), // Unix epoch
    timezoneMode: 'utc'
  }
});
```

#### **Why Date Policy Matters:**

**PRICE, YIELD, ACCRINT rely on:**
- Day-count conventions (30/360, actual/actual, actual/365)
- Date serial numbers for calculations
- Leap year handling for accurate day counts

**Without date policy:**
- PRICE("2024-02-29", ...) different in 1900 vs 1904 system
- Day count different with vs without leap year bug
- Financial calculations incorrect by 1-2 days

#### **Tasks:**

- [ ] Add `DateSystemPolicy` interface
- [ ] FormulaEngine constructor accepts `dateSystemPolicy` config
- [ ] Date functions (DATE, DATEVALUE, EDATE, EOMONTH) query `policy.baseSystem`
- [ ] Financial functions (PRICE, YIELD, ACCRINT) query `policy` for day counts
- [ ] Add `dateToSerial(date: Date): number` helper (respects policy)
- [ ] Add `serialToDate(serial: number): Date` helper (respects policy)
- [ ] Document in `DATE_SYSTEM_POLICY.md` with examples
- [ ] Add tests: same date, different serial numbers in 1900 vs 1904

**Why it matters:**
- Financial functions = 50% of Wave 1
- Without date policy: financial functions will have 1-2 day errors
- **Critical for Wave 1 success**

---

### 7️⃣ **Error Propagation Matrix + Per-Function Overrides** (3 days)

**Category matrix is NOT enough — Excel has per-function quirks.**

*(Unchanged from previous spec — already SDK-grade)*

#### **Category Defaults:**

| Input | Math | Text | Financial | Lookup |
|-------|------|------|-----------|--------|
| `#DIV/0!` | Propagate | Propagate | Propagate | Propagate |
| `#VALUE!` | Propagate | Propagate | Propagate | Propagate |
| `#N/A` | Propagate | Propagate | Propagate | Special (VLOOKUP returns) |
| Empty cell | 0 | "" | 0 | #N/A (VLOOKUP) |
| String "123" | Coerce to 123 | Keep as "123" | Coerce to 123 | Match "123" |
| String "abc" | #VALUE! | Keep as "abc" | #VALUE! | Match "abc" |

*(Rest of section unchanged)*

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

**Without standardization:** Each function invents its own loop → financial engine rot.

**With standardization:**

```typescript
interface IterationPolicy {
  maxIterations: number;  // e.g., 100 for IRR, 50 for YIELD
  tolerance: number;      // e.g., 1e-7
  algorithm: 'newton' | 'bisection' | 'secant';
}

// Shared iteration abstraction
function iterativeSolver(
  fn: (x: number) => number,
  derivative: (x: number) => number | null,
  initialGuess: number,
  policy: IterationPolicy
): number | FormulaError {
  // Centralized Newton/bisection/secant implementation
  // Returns result or #NUM! with diagnostic
}
```

**Tasks:**
- Add `IterationPolicy` to `FunctionMetadata`
- Create `iterative-solver.ts` with shared Newton/bisection/secant
- Refactor IRR, XIRR to use shared abstraction
- Document convergence failure modes: "IRR failed to converge after 100 iterations; try better guess"

**Why it matters:**
- Prevents each financial function from reinventing Newton's method
- Consistent convergence diagnostics
- Future GOALSEEK/SOLVER can reuse infrastructure

---

## 🧪 Testing Requirements

**New test suites (95% coverage):**

1. **`metadata-validation.test.ts`** — All 98 functions have complete metadata (compile-time enforced)
   - TypeScript build fails if metadata incomplete
   - Volatile functions wired into scheduler
   - Complexity class drives `isExpensive()` helper
   - Precision class drives tolerance

2. **`error-engine.test.ts`** — Error Engine integration
   - EvaluationContext consumes ErrorStrategy
   - IF lazy evaluation (unused branch not evaluated)
   - AND/OR short-circuit (stop at first determinant)
   - Coercion policy respected (strict mode vs excel-compatible)

3. **`engine-config.test.ts`** — SDK configuration
   - Strict mode vs excel-compatible mode
   - Global numeric policy (iterations, tolerance, rounding)
   - Date system policy (1900 vs 1904, leap year bug)
   - Mode affects formula results correctly

4. **`performance-introspection.test.ts`** — Public API
   - getFunctionProfile() returns correct data
   - getExpensiveFunctions() filters correctly
   - Baseline JSON loaded and queryable

5. **`error-propagation-matrix.test.ts`** — 50+ tests
   - Category defaults (20 tests)
   - Per-function overrides (20 tests)
   - Edge cases: empty cells, string coercion, #N/A in IF (10 tests)

6. **`performance-benchmarks.test.ts`** — Baseline validation
   - Runs in CI with warning/failure thresholds
   - Stores baseline JSON (committed to repo)
   - Logs warnings for >20% regression, fails for >100%

7. **`iterative-solver.test.ts`** — Convergence validation
   - Newton/bisection/secant correctness
   - Global policy respected (maxGlobalIterations)
   - Convergence failure handling (#NUM! with diagnostic)

8. **`date-system.test.ts`** — Date policy validation
   - 1900 vs 1904 serial numbers
   - Leap year bug handling (excel-compatible vs strict)
   - Timezone neutrality
   - PRICE/YIELD use correct day counts

**Coverage:** 95% for new infrastructure

---

## 📊 Success Metrics (SDK-Grade)

| System | Target | Status |
|--------|--------|--------|
| **Compile-Time Enforcement** | | |
| Metadata compile-time required | TypeScript enforced | ❌ Not started |
| Registry accepts only complete metadata | Type-safe | ❌ Not started |
| Pre-commit hook validates metadata | 98/98 functions | ❌ Not started |
| **Runtime Enforcement** | | |
| Extended metadata + enforcement | 98/98 functions | ❌ Not started |
| Volatile wired into scheduler | Test passing | ❌ Not started |
| Complexity class drives warnings | `isExpensive()` working | ❌ Not started |
| Precision class drives tolerance | Centralized policy | ❌ Not started |
| **Error Engine** | | |
| EvaluationContext with errorPolicy | Wired into evaluator | ❌ Not started |
| CoercionPolicy consumed by evaluator | String→number, empty→0 | ❌ Not started |
| Per-function error strategies | 50+ tests | ❌ Not started |
| **Global Numeric Policy** | | |
| EngineNumericPolicy configurable | maxGlobalIterations, tolerance, rounding | ❌ Not started |
| Strict mode vs excel-compatible | Mode affects results | ❌ Not started |
| Policy presets documented | FINANCIAL_STRICT, EXCEL_COMPATIBLE, SCIENTIFIC | ❌ Not started |
| **Performance Introspection API** | | |
| getFunctionProfile() public | Returns complexity, precision, volatile, iterative | ❌ Not started |
| getExpensiveFunctions() public | Filters O(n²) and ITERATIVE | ❌ Not started |
| API documentation complete | PERFORMANCE_INTROSPECTION_API.md | ❌ Not started |
| **Date System Policy** | | |
| DateSystemPolicy configurable | 1900 vs 1904, leap year bug | ❌ Not started |
| Date helpers respect policy | dateToSerial, serialToDate | ❌ Not started |
| Financial functions use policy | PRICE, YIELD, ACCRINT day counts | ❌ Not started |
| **Performance Budget** | | |
| Performance benchmarks | 98 functions, non-blocking CI | ❌ Not started |
| Baseline JSON committed | performance-baselines.json | ❌ Not started |
| **Iteration Control** | | |
| Iteration control system | Shared abstraction | ❌ Not started |
| IRR, XIRR refactored | Use shared iterativeSolver() | ❌ Not started |
| Complexity class drives warnings | `isExpensive()` working | ❌ Not started |
| Precision class drives tolerance | Centralized policy | ❌ Not started |
| Error strategy per function | 50+ tests | ❌ Not started |
| Performance benchmarks | 98 functions, non-blocking CI | ❌ Not started |
| Iteration control system | Shared abstraction | ❌ Not started |

---

## ⏱️ Realistic Timeline (SDK-Grade)

**Day 1-3:** Compile-time metadata enforcement + runtime integration
- Convert `FunctionMetadata` to `Required<>` strict type
- Registry accepts only `StrictFunctionMetadata`
- Pre-commit hook validates completeness
- Volatile → scheduler integration
- Complexity → `isExpensive()` helper
- Precision → centralized tolerance policy

**Day 4-5:** Error Engine Layer
- Create `EvaluationContext` with `errorPolicy` and `coercionPolicy`
- Wire into evaluator (IF lazy, AND/OR short-circuit)
- String coercion respects strict vs excel-compatible mode
- 30+ tests for error engine integration

**Day 6-7:** Global Numeric Policy + Strict Mode
- Add `EngineNumericPolicy` (maxGlobalIterations, tolerance, rounding)
- Implement strict mode vs excel-compatible mode
- Policy presets: FINANCIAL_STRICT, EXCEL_COMPATIBLE, SCIENTIFIC
- 20+ tests for mode differences

**Day 8-9:** Performance Introspection API
- Public `getFunctionProfile()` API
- `getExpensiveFunctions()` query
- Auto-generate performance documentation from metadata
- API documentation with SaaS usage examples

**Day 10:** Date System Policy
- `DateSystemPolicy` (1900 vs 1904, leap year bug)
- Date helpers: `dateToSerial()`, `serialToDate()`
- Timezone handling (neutral, UTC, local)
- 15+ tests for date serial numbers

**Day 11:** Error Propagation Matrix
- Category defaults + per-function overrides
- 50+ tests (category, per-function, edge cases)
- Documentation with Excel quirks explicitly noted

**Day 12:** Integration + Documentation
- All 7 systems working together
- Performance benchmarks + baseline JSON
- 95% coverage validated
- Complete documentation:
  - `FUNCTION_METADATA_SPEC.md`
  - `ERROR_ENGINE.md`
  - `ENGINE_CONFIG.md` (strict mode, policies)
  - `PERFORMANCE_INTROSPECTION_API.md`
  - `DATE_SYSTEM_POLICY.md`
  - `ERROR_PROPAGATION_MATRIX.md`
  - `PERFORMANCE_BUDGET.md`

**Total:** 10-12 focused days → **Ready for Wave 1**

**Compared to previous estimate:** +2-3 days for SDK-grade features (compile-time enforcement, error engine, introspection API, date policy, strict mode)

---

## 📈 Risk Assessment If You Skip Wave 0 (SDK-Grade)

**At function 150:**
- **Metadata drift:** 1 forgotten field, silent divergence, tolerance inconsistencies
- **Error chaos:** ErrorStrategy metadata not wired to evaluator = documentation theater
- **Configuration hell:** No strict mode = locked to Excel quirks forever
- **Performance blindness:** SaaS companies can't budget = user complaints
- **Date bugs:** Financial functions off by 1-2 days (1900 vs 1904, leap year)
- **Rounding mismatch:** ±$1 errors undetected (Excel rounding vs bankers round)
- **Iterative chaos:** Each financial function reinvents Newton loop

**Refactor cost:** 3-4x later.

**Competitive damage:** SDK without introspection API = not serious infrastructure.

---

## 🧠 Strategic Observation (Revised)

You are no longer building "Excel functions".

You are building:

> **The reference computational spreadsheet engine for the web ecosystem.**

This means:
- **Fail fast at development time** (compile-time metadata enforcement)
- **Configurable behavior** (strict mode, numeric policies, date systems)
- **Public introspection** (performance profiles, function metadata)
- **Decoupled from Excel** (strict mode = path to platform)

That is infrastructure-level responsibility.

---

## 🏆 Final Architecture Answers (SDK-Grade)

### Platform Identity
**The reference computational spreadsheet engine for the web ecosystem** — not Excel clone, not feature factory.

### Optimization Priority
1. **Long-term computational correctness** (deterministic, documented)
2. **SDK configurability** (strict mode, policies, introspection API)
3. **Excel compatibility** (when beneficial, not gospel)
4. **Developer trust** (transparency > quirk hiding)

### Design Principle
> **Excel fidelity with deterministic guarantees. Quirks matched but explicitly documented. Strict mode for computational correctness.**

Example:
- ✅ Excel-compatible mode: AVERAGE skips #N/A (Excel quirk matched)
- ✅ Documented: "Excel quirk: AVERAGE skips errors, COUNT doesn't"
- ✅ Strict mode: AVERAGE propagates #N/A (deterministic, auditable)
- ✅ `ErrorStrategy.SKIP_ERRORS` enforced by Error Engine

---

## 🎯 Wave 0 Deliverables (SDK-Grade)

**Infrastructure (code):**
1. **Compile-time enforcement:** `StrictFunctionMetadata` type, registry type-safe
2. **Error Engine Layer:** `EvaluationContext` with `errorPolicy` and `coercionPolicy`
3. **Global Numeric Policy:** `EngineNumericPolicy` with strict mode
4. **Performance Introspection API:** `getFunctionProfile()`, `getExpensiveFunctions()`
5. **Date System Policy:** `DateSystemPolicy` with 1900/1904/ISO8601 support
6. **Error propagation system** with per-function overrides
7. **Non-blocking performance budget** with CI integration
8. **Iteration control system** with shared abstraction

**Documentation:**
1. `FUNCTION_METADATA_SPEC.md` — compile-time enforced schema
2. `ERROR_ENGINE.md` — evaluator integration, coercion policies
3. `ENGINE_CONFIG.md` — strict mode, numeric policies, presets
4. `PERFORMANCE_INTROSPECTION_API.md` — public API with SaaS examples
5. `DATE_SYSTEM_POLICY.md` — 1900 vs 1904, leap year bug, serial numbers
6. `ERROR_PROPAGATION_MATRIX.md` — category defaults + per-function quirks
7. `PERFORMANCE_BUDGET.md` — complexity labels + recommended limits
8. `ITERATION_POLICY.md` — convergence management

**Tests (95% coverage):**
1. `metadata-validation.test.ts` (compile-time enforcement)
2. `error-engine.test.ts` (evaluator integration)
3. `engine-config.test.ts` (strict mode, policies)
4. `performance-introspection.test.ts` (public API)
5. `date-system.test.ts` (1900 vs 1904, leap year)
6. `error-propagation-matrix.test.ts` (50+ tests)
7. `performance-benchmarks.test.ts` (non-blocking CI)
8. `iterative-solver.test.ts` (convergence validation)

---

## ✅ Management Decision Confirmed (SDK-Grade)

**Execute Wave 0 with SDK-grade upgrades:**

✅ **Compile-time enforcement** (fail fast at development time)  
✅ **Error Engine Layer** (metadata drives evaluator behavior)  
✅ **Global Numeric Policy** (configurable iterations, tolerance, rounding)  
✅ **Performance Introspection API** (public, competitive advantage)  
✅ **Date System Policy** (critical for financial functions)  
✅ **Strict Mode** (decouples future from Excel quirks)  
✅ **Error strategy per function** (not just category defaults)  
✅ **Centralized precision policy** (automatic tolerance)  
✅ **Iteration policy abstraction** (no reinvented Newton loops)  
✅ **Non-blocking benchmark suite** (warnings, not CI failures)

**Timeline:** 10-12 focused days  
**Outcome:** Wave 1 (Financial 50 functions) becomes 80% mechanical instead of 40% bugs

---

## 🚨 Management Policy (Enforced)

**As development manager:**

🔒 **Wave 1 is BLOCKED until Wave 0 complete.**

**Why:**
- Financial functions reveal architecture (PRICE, YIELD, ACCRINT need date policy)
- Next 3 years: become reference computational engine
- Wave 0 executed superficially = Wave 1 becomes 40% bugs

**Wave 0 must be implemented ruthlessly.**

---

**This is the exact moment projects either become serious infrastructure or a collection of clever functions.**

**Verdict:** Execute Wave 0 (SDK-Grade). This is infrastructure-level responsibility now.
2. **Excel compatibility** (reference implementation, not gospel)
3. **Developer trust** (transparency > quirk hiding)

### Design Principle
> **Excel fidelity with deterministic guarantees. Quirks matched but explicitly documented.**

Example:
- ✅ AVERAGE skips #N/A (Excel quirk matched)
- ✅ Documented: "Excel quirk: AVERAGE skips errors, COUNT doesn't"
