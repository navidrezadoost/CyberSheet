# Phase 5: LOOKUP_STRICT - Implementation Strategy

**Status:** 🚧 PLANNING  
**Target:** 7 functions (VLOOKUP, HLOOKUP, XLOOKUP, LOOKUP, INDEX, MATCH, XMATCH)  
**Estimated Tests:** 25-30 behavioral tests  
**Complexity:** HIGH - Semantic error handling + range validation

---

## Executive Summary

Phase 5 implements LOOKUP_STRICT wrapper for 7 lookup/reference functions. Unlike FINANCIAL_STRICT (which enforces numeric discipline), LOOKUP_STRICT enforces **semantic error handling** and **range integrity**.

### Core Challenge

Lookup functions use **#N/A** as a semantically meaningful result:
- `VLOOKUP("missing", A1:B10, 2, FALSE)` → `#N/A` (value not found - **VALID RESULT**)
- `VLOOKUP("value", 123, 2, FALSE)` → `#REF!` (invalid range - **STRUCTURAL ERROR**)

**The wrapper must distinguish between:**
1. **Result errors** (#N/A = "not found") → Pass through
2. **Argument errors** (#VALUE!, #REF!) → Propagate immediately
3. **Range validation errors** → Generate #REF!

---

## Target Functions (7 total)

### Primary Lookup Functions (4)
1. **VLOOKUP** - Vertical lookup (column-based search)
2. **HLOOKUP** - Horizontal lookup (row-based search)
3. **XLOOKUP** - Modern lookup (bidirectional, advanced)
4. **LOOKUP** - Vector/array lookup (legacy)

### Search Functions (2)
5. **MATCH** - Find position of value in range
6. **XMATCH** - Modern match (advanced search modes)

### Array Access (1)
7. **INDEX** - Direct array element access by coordinates

### Non-LOOKUP_STRICT (5) - Already PROPAGATE_FIRST
- CHOOSE (direct argument selection)
- OFFSET (reference offset calculation)
- INDIRECT (reference parsing)
- ROW/COLUMN (context-aware position queries)

---

## Error Taxonomy

### Excel Error Codes in Lookup Context

| Error | Meaning | When Generated | Wrapper Action |
|-------|---------|----------------|----------------|
| **#N/A** | "Not Available" | Value not found in lookup | **Pass through** (valid result) |
| **#REF!** | "Invalid Reference" | Range invalid, out of bounds | **Generate or propagate** |
| **#VALUE!** | "Wrong Type" | Type mismatch, invalid args | **Propagate immediately** |
| **#NAME?** | "Unknown Name" | Invalid range name (rare) | **Propagate immediately** |
| **#NUM!** | "Invalid Number" | Numeric constraint violated | **Propagate immediately** |

### Critical Insight

```typescript
// ❌ WRONG - Treat #N/A like other errors
if (result instanceof Error) {
  return result; // Would convert #N/A to error (breaks semantics)
}

// ✅ CORRECT - #N/A is a valid lookup result
if (result instanceof Error && result.message === '#N/A') {
  return result; // #N/A has meaning - pass through
}
if (result instanceof Error) {
  return result; // Other errors are structural - propagate
}
```

**Key Principle:** #N/A is **data** (the answer is "not found"), not a failure.

---

## Validation Requirements

### 1. Range Validation

**Rule:** Lookup ranges must be 2D arrays (not scalars, not 3D)

```typescript
// Valid ranges
VLOOKUP("key", [[1,2],[3,4]], 2, FALSE) // ✅ 2D array
VLOOKUP("key", A1:B10, 2, FALSE)        // ✅ Range reference

// Invalid ranges
VLOOKUP("key", 123, 2, FALSE)           // ❌ Scalar → #REF!
VLOOKUP("key", "A1:B10", 2, FALSE)      // ❌ String → #REF! (unless INDIRECT)
VLOOKUP("key", null, 2, FALSE)          // ❌ Null → #REF!
```

**Wrapper Responsibility:**
- Validate `table_array` argument is array type
- Check array dimensions (must be 2D, not 1D or 3D)
- Generate #REF! for invalid ranges

### 2. Index Bounds Checking

**Rule:** Column/row indices must be within range bounds

```typescript
// Valid indices
VLOOKUP("key", A1:C10, 2, FALSE)  // ✅ Column 2 exists (C is column 3)
INDEX(A1:B10, 5, 2)               // ✅ Row 5, column 2 within bounds

// Invalid indices
VLOOKUP("key", A1:C10, 5, FALSE)  // ❌ Column 5 > 3 columns → #REF!
INDEX(A1:B10, 15, 2)              // ❌ Row 15 > 10 rows → #REF!
INDEX(A1:B10, 5, -1)              // ❌ Negative index → #REF!
```

**Wrapper Responsibility:**
- Validate `col_index_num` (VLOOKUP) ≤ number of columns
- Validate `row_index_num` (HLOOKUP) ≤ number of rows
- Validate `row_num`, `column_num` (INDEX) within array bounds
- Generate #REF! for out-of-bounds access

### 3. Match Type Validation

**Rule:** Match types must be valid enum values (-1, 0, 1)

```typescript
// Valid match types
MATCH("key", A1:A10, 0)   // ✅ Exact match
MATCH("key", A1:A10, 1)   // ✅ Less than or equal
MATCH("key", A1:A10, -1)  // ✅ Greater than or equal

// Invalid match types
MATCH("key", A1:A10, 2)   // ❌ Invalid → #VALUE!
MATCH("key", A1:A10, "0") // ❌ String → #VALUE! (or coerce?)
```

**Wrapper Responsibility:**
- Validate `match_type` ∈ {-1, 0, 1}
- Decide: coerce numeric strings or reject?
- Generate #VALUE! for invalid match types

---

## Design Decisions

### Decision 1: #N/A Pass-Through

**Question:** Should wrapper filter #N/A errors?

**Analysis:**
- ❌ **Filter:** `if (result === #N/A) return null` → Breaks semantics
- ✅ **Pass Through:** `return result` → Preserves Excel behavior

**Decision:** **Pass through #N/A as valid result**

**Rationale:** #N/A communicates "data absent" to downstream formulas. Filtering it converts semantic information into missing data.

**Example:**
```typescript
// User formula: =IFERROR(VLOOKUP("missing", A1:B10, 2, FALSE), "Default")
// VLOOKUP returns #N/A → IFERROR sees error → returns "Default" ✅
// If wrapper filtered #N/A → IFERROR sees valid result → returns #N/A ❌
```

### Decision 2: Range Type Coercion

**Question:** Should wrapper coerce range-like values?

**Options:**
1. **Strict:** Only accept arrays → reject strings, numbers, nulls
2. **Permissive:** Try to coerce strings to ranges (e.g., "A1:B10")
3. **Hybrid:** Accept arrays + range references, reject scalars

**Analysis:**
- Excel: Accepts range references, arrays, rejects scalars
- Our engine: Range parsing handled by parser, not wrapper

**Decision:** **Hybrid - Accept arrays, reject scalars**

**Implementation:**
```typescript
// Validate table_array argument
if (!Array.isArray(table_array)) {
  // Check if it's a range reference object (engine-specific)
  if (typeof table_array === 'object' && table_array?.type === 'range') {
    // Valid range reference - pass through
  } else {
    return new Error('#REF!'); // Scalar/invalid → #REF!
  }
}
```

### Decision 3: Index Validation Timing

**Question:** Should wrapper validate indices or delegate to handler?

**Options:**
1. **Pre-validation:** Wrapper checks bounds before handler
2. **Post-validation:** Handler checks, wrapper catches errors
3. **Hybrid:** Wrapper validates structure, handler validates logic

**Analysis:**
- Pre-validation: Duplicates logic, but provides consistency
- Post-validation: Relies on handler implementation (risky)
- Hybrid: Best of both - wrapper checks obvious errors, handler handles edge cases

**Decision:** **Hybrid - Wrapper validates range structure, handler validates index bounds**

**Rationale:** 
- Wrapper enforces architectural invariants (range is array, indices are numbers)
- Handler enforces semantic constraints (index within bounds for specific lookup)
- Separation of concerns: structure vs. logic

### Decision 4: Numeric String Coercion

**Question:** Should `VLOOKUP(A1, B1:C10, "2", FALSE)` coerce `"2"` to `2`?

**Analysis:**
- FINANCIAL_STRICT: Accepts numeric strings (strict but practical)
- Excel: Accepts numeric strings in index arguments
- Consistency: Follow FINANCIAL_STRICT precedent

**Decision:** **Accept numeric strings in index arguments**

**Implementation:**
```typescript
// Coerce col_index_num if numeric string
if (typeof col_index_num === 'string') {
  const parsed = Number(col_index_num);
  if (isNaN(parsed)) {
    return new Error('#VALUE!'); // Non-numeric string
  }
  col_index_num = parsed; // Coerce to number
}
```

---

## Implementation Plan

### Phase 5.1: Wrapper Structure (Infrastructure)

**Goal:** Implement lookupStrictWrapper skeleton with error classification

**Tasks:**
1. Distinguish #N/A from other errors (pass through #N/A)
2. Validate argument types (range, indices)
3. Add inline documentation

**Estimated Lines:** ~80 lines

**Test Coverage:** 0 behavioral tests (structure only)

### Phase 5.2: Range Validation (Core Logic)

**Goal:** Validate lookup ranges and generate #REF! for invalid ranges

**Tasks:**
1. Check `table_array` is array or range reference
2. Validate 2D dimensions (not scalar, not 3D)
3. Generate #REF! for structural errors

**Estimated Lines:** ~30 lines

**Test Coverage:** 8-10 behavioral tests
- Valid 2D array
- Invalid scalar
- Invalid null/undefined
- Invalid string (not range reference)
- Edge case: empty array

### Phase 5.3: Index Bounds Validation (Safety)

**Goal:** Pre-validate indices before handler invocation

**Tasks:**
1. Validate `col_index_num` is positive integer
2. Validate `row_index_num` is positive integer (HLOOKUP, INDEX)
3. Coerce numeric strings to numbers
4. Generate #REF! for negative/zero indices

**Estimated Lines:** ~40 lines

**Test Coverage:** 10-12 behavioral tests
- Valid positive indices
- Invalid negative indices
- Invalid zero indices
- Invalid out-of-bounds (large numbers)
- Numeric string coercion
- Non-numeric string rejection

### Phase 5.4: Match Type Validation (Optional)

**Goal:** Validate match_type arguments for MATCH/VLOOKUP/HLOOKUP

**Tasks:**
1. Check `match_type` ∈ {-1, 0, 1}
2. Coerce numeric strings if permissive
3. Generate #VALUE! for invalid types

**Estimated Lines:** ~20 lines

**Test Coverage:** 4-6 behavioral tests
- Valid match types (-1, 0, 1)
- Invalid match type (2, 99, "text")
- Numeric string coercion (if enabled)

### Phase 5.5: Integration Testing (Validation)

**Goal:** Verify all 7 LOOKUP_STRICT functions route through wrapper

**Tasks:**
1. Test VLOOKUP (vertical lookup)
2. Test HLOOKUP (horizontal lookup)
3. Test XLOOKUP (modern lookup)
4. Test LOOKUP (vector/array lookup)
5. Test MATCH (position search)
6. Test XMATCH (advanced search)
7. Test INDEX (array access)

**Test Coverage:** 7-10 integration tests (1-2 per function)

---

## Test Strategy

### Test Categories

**1. #N/A Pass-Through (Critical)**
```typescript
test('VLOOKUP passes through #N/A as valid result', () => {
  const result = engine.evaluate('=VLOOKUP("missing", A1:B10, 2, FALSE)');
  expect(result).toBeInstanceOf(Error);
  expect((result as Error).message).toBe('#N/A');
});
```

**2. Range Validation**
```typescript
test('VLOOKUP rejects scalar as table_array', () => {
  const result = engine.evaluate('=VLOOKUP("key", 123, 2, FALSE)');
  expect(result).toBeInstanceOf(Error);
  expect((result as Error).message).toBe('#REF!');
});
```

**3. Index Bounds**
```typescript
test('VLOOKUP rejects out-of-bounds column index', () => {
  // A1:B10 has 2 columns, requesting column 5
  const result = engine.evaluate('=VLOOKUP("key", A1:B10, 5, FALSE)');
  expect(result).toBeInstanceOf(Error);
  expect((result as Error).message).toBe('#REF!');
});
```

**4. Error Propagation**
```typescript
test('VLOOKUP propagates #VALUE! from lookup_value', () => {
  const result = engine.evaluate('=VLOOKUP(1/0, A1:B10, 2, FALSE)');
  expect(result).toBeInstanceOf(Error);
  expect((result as Error).message).toContain('#DIV/0!');
});
```

**5. Match Type Validation**
```typescript
test('MATCH rejects invalid match_type', () => {
  const result = engine.evaluate('=MATCH("key", A1:A10, 99)');
  expect(result).toBeInstanceOf(Error);
  expect((result as Error).message).toBe('#VALUE!');
});
```

### Test Count Estimate

| Category | Tests | Priority |
|----------|-------|----------|
| #N/A Pass-Through | 3-4 | CRITICAL |
| Range Validation | 8-10 | HIGH |
| Index Bounds | 10-12 | HIGH |
| Error Propagation | 4-6 | MEDIUM |
| Match Type | 4-6 | MEDIUM |
| Integration | 7-10 | MEDIUM |
| **Total** | **36-48** | |

**Recommended:** Start with 25-30 tests (core + critical), expand to 40+ if time permits.

---

## Implementation Sequence

### Strict TDD Protocol (Phase 5 Execution)

**Step 1:** Create test file structure
```
packages/core/__tests__/error-engine-behavior.test.ts
  └─ Phase 5: LOOKUP_STRICT (25 tests)
      ├─ VLOOKUP: #N/A pass-through (2 tests)
      ├─ VLOOKUP: Range validation (4 tests)
      ├─ VLOOKUP: Index bounds (4 tests)
      ├─ HLOOKUP: Range validation (2 tests)
      ├─ INDEX: Index bounds (4 tests)
      ├─ MATCH: Match type validation (3 tests)
      ├─ XLOOKUP: Integration (2 tests)
      └─ Edge cases (4 tests)
```

**Step 2:** Write failing tests (RED)
- Run tests → expect 25 failures
- Verify tests fail for right reasons (wrapper is pass-through)

**Step 3:** Implement wrapper skeleton (RED → YELLOW)
- Add #N/A detection logic
- Run tests → expect partial failures

**Step 4:** Implement range validation (YELLOW → GREEN)
- Add array type checking
- Add dimension validation
- Run tests → expect more passing

**Step 5:** Implement index validation (GREEN → GREENER)
- Add bounds checking
- Add numeric string coercion
- Run tests → expect most passing

**Step 6:** Integration testing (GREEN → LOCKED)
- Test all 7 functions
- Verify no regressions (run all 125 existing tests)
- Verify TypeScript build passes

**Step 7:** Documentation
- Create LOOKUP_STRICT_IMPLEMENTATION.md
- Document edge cases and design decisions
- Update PHASE_5_STRATEGY.md with final results

---

## Risk Assessment

### HIGH RISKS

**1. #N/A Semantic Complexity**
- **Risk:** Accidentally filtering #N/A breaks downstream formulas (IFERROR, IFNA)
- **Mitigation:** Explicit #N/A pass-through test as first test
- **Severity:** CRITICAL

**2. Range Reference Type Handling**
- **Risk:** Engine-specific range reference objects might not be arrays
- **Mitigation:** Check for both arrays and range reference objects
- **Severity:** HIGH

**3. Handler Assumption Violations**
- **Risk:** Handlers might not return #N/A correctly (return null instead)
- **Mitigation:** Handler smoke tests before wrapper implementation
- **Severity:** HIGH

### MEDIUM RISKS

**4. Index Bounds False Positives**
- **Risk:** Pre-validation might reject valid edge cases (e.g., INDEX with 0 row = entire column)
- **Mitigation:** Delegate complex bounds checking to handler
- **Severity:** MEDIUM

**5. Match Type Coercion Inconsistency**
- **Risk:** Coercing "0" to 0 in MATCH but rejecting "abc" creates confusion
- **Mitigation:** Follow FINANCIAL_STRICT precedent (numeric strings OK, non-numeric NO)
- **Severity:** MEDIUM

### LOW RISKS

**6. Performance Overhead**
- **Risk:** Extra validation adds latency to lookup operations
- **Mitigation:** Validation is O(1) type checking, negligible overhead
- **Severity:** LOW

---

## Edge Cases to Consider

### 1. Empty Arrays
```typescript
VLOOKUP("key", [], 1, FALSE)  // What should happen?
// Excel: #REF! (empty range invalid)
// Decision: #REF! (consistent with scalar rejection)
```

### 2. Single-Row/Column Arrays
```typescript
VLOOKUP("key", [[1,2,3]], 2, FALSE)  // Single row
// Excel: Valid (1-row array acceptable)
// Decision: Valid (2D with 1 row still 2D)
```

### 3. Jagged Arrays (Inconsistent Row Lengths)
```typescript
VLOOKUP("key", [[1,2], [3,4,5]], 2, FALSE)  // Jagged
// Excel: Pads with empty cells
// Decision: Accept (handler normalizes), or reject #REF!?
// Recommended: Delegate to handler (not wrapper concern)
```

### 4. INDEX with 0 Index (Special Behavior)
```typescript
INDEX(A1:B10, 0, 1)  // Row 0 = entire column
// Excel: Returns entire column as array
// Decision: Pass through (handler implements special logic)
```

### 5. VLOOKUP Approximate Match with Unsorted Data
```typescript
VLOOKUP("key", unsorted_array, 2, TRUE)  // rangeLookup=TRUE
// Excel: Returns arbitrary result (undefined behavior)
// Decision: Pass through (handler's responsibility to document)
```

### 6. XLOOKUP Not-Found Default
```typescript
XLOOKUP("missing", A1:A10, B1:B10, "default")  // if_not_found
// Excel: Returns "default" instead of #N/A
// Decision: Pass through result (not #N/A, so wrapper doesn't care)
```

---

## Wrapper Pseudocode

```typescript
private lookupStrictWrapper<T>(
  args: unknown[],
  handler: (...args: unknown[]) => T,
  context: FormulaContext,
  metadata: StrictFunctionMetadata
): T {
  // 1. Propagate argument errors immediately (except #N/A)
  for (const arg of args) {
    if (arg instanceof Error && arg.message !== '#N/A') {
      return arg as T;
    }
  }
  
  // 2. Validate range argument (function-specific)
  if (metadata.name.includes('LOOKUP')) {
    const table_array = args[1]; // VLOOKUP/HLOOKUP/XLOOKUP
    if (!Array.isArray(table_array) && !isRangeReference(table_array)) {
      return new Error('#REF!') as T;
    }
  }
  
  if (metadata.name === 'INDEX') {
    const array = args[0];
    if (!Array.isArray(array) && !isRangeReference(array)) {
      return new Error('#REF!') as T;
    }
  }
  
  // 3. Validate index arguments (function-specific)
  if (metadata.name === 'VLOOKUP') {
    let col_index_num = args[2];
    
    // Coerce numeric strings
    if (typeof col_index_num === 'string') {
      col_index_num = Number(col_index_num);
      if (isNaN(col_index_num)) {
        return new Error('#VALUE!') as T;
      }
      args[2] = col_index_num;
    }
    
    // Check positive
    if (typeof col_index_num === 'number' && col_index_num <= 0) {
      return new Error('#REF!') as T;
    }
  }
  
  // Similar logic for HLOOKUP, INDEX, MATCH
  
  // 4. Invoke handler
  const result = handler(...args);
  
  // 5. Pass through #N/A (valid result, not an error in lookup context)
  // All other errors propagate normally
  return result;
}
```

---

## Success Criteria

### Phase 5 Complete When:

1. ✅ **lookupStrictWrapper implemented** (~100 lines)
2. ✅ **#N/A pass-through validated** (3+ tests)
3. ✅ **Range validation enforced** (8+ tests)
4. ✅ **Index bounds checked** (10+ tests)
5. ✅ **All 7 LOOKUP_STRICT functions routed** (integration tests)
6. ✅ **25-30 behavioral tests passing** (100% pass rate)
7. ✅ **No regressions** (125 existing tests still passing)
8. ✅ **TypeScript build clean** (0 errors)
9. ✅ **Documentation complete** (LOOKUP_STRICT_IMPLEMENTATION.md)

### Quality Gates

- **Test Coverage:** ≥25 Phase 5 tests passing
- **System Tests:** All 150+ total tests passing (125 existing + 25 new)
- **Build:** TypeScript compilation succeeds
- **Regression:** No failures in Phases 1-4 tests
- **Documentation:** Implementation summary written

---

## Timeline Estimate

**Optimistic:** 2-3 hours (experienced TDD, no surprises)  
**Realistic:** 4-5 hours (edge cases, handler quirks)  
**Pessimistic:** 6-8 hours (handler refactors needed, complex #N/A semantics)

### Breakdown

| Task | Time |
|------|------|
| Test structure creation | 30 min |
| #N/A pass-through tests + impl | 45 min |
| Range validation tests + impl | 60 min |
| Index bounds tests + impl | 60 min |
| Integration tests | 30 min |
| Regression testing | 30 min |
| Documentation | 45 min |
| **Total (Realistic)** | **5 hours** |

---

## Comparison to Phase 4

| Aspect | Phase 4 (FINANCIAL_STRICT) | Phase 5 (LOOKUP_STRICT) |
|--------|----------------------------|-------------------------|
| **Complexity** | Numeric validation (simpler) | Semantic error handling (complex) |
| **Functions** | 19 | 7 |
| **Tests** | 21 | 25-30 |
| **Key Challenge** | NaN/Infinity discipline | #N/A pass-through semantics |
| **Validation Type** | Type coercion (numbers) | Structure validation (ranges) |
| **Error Generation** | Pre + post validation | Pre-validation only |
| **Risk Level** | HIGH (financial correctness) | HIGH (semantic correctness) |

**Key Difference:** Phase 4 enforced "what types are valid", Phase 5 enforces "what structures are valid AND what errors mean."

---

## Next Steps After Phase 5

### Phase 6: LAZY_EVALUATION (9 functions)

**Target Functions:**
- IF, IFS, SWITCH (conditional branching)
- IFERROR, IFNA (error handling)
- AND, OR (logical evaluation - SHORT_CIRCUIT already done!)
- NOT, XOR (logical operations)

**Challenge:** Thunk-based lazy evaluation (arguments must not evaluate until needed)

**Key Innovation:** Convert eager arguments to lazy thunks, evaluate only when branch is taken

**Estimated Scope:** 20-25 tests, most complex wrapper yet

---

## Conclusion

Phase 5 is **semantically complex** but **architecturally straightforward**:

1. **Pass through #N/A** (it's data, not an error)
2. **Validate ranges** (must be arrays, not scalars)
3. **Check indices** (must be positive, within bounds)
4. **Trust handlers** (delegate complex logic)

**Philosophy:** The wrapper is a **semantic gatekeeper**, not a business logic implementer. It enforces architectural invariants (what types, what structures) but delegates Excel semantics (how to lookup, how to match) to handlers.

**Risk Mitigation:** Start with #N/A pass-through test (most critical), expand incrementally.

**Success Pattern:** Follow Phase 4 protocol - strict TDD, document decisions, lock before moving on.

---

**Phase 5 is the semantic correctness milestone. Phase 4 proved numeric discipline. Phase 5 will prove structural discipline.**

🎯 Ready to proceed? Say the word.
