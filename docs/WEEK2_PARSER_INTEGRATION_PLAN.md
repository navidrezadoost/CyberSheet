# Week 2: Parser Integration Plan
**Architecture**: Direct Interpreter Extension  
**Target**: Field Access Support (Dot & Bracket Notation)  
**Risk Level**: Medium-High (Parser Changes)  
**LOC Estimate**: ~800 lines  
**Timeline**: 5-7 days

---

## 🎯 Strategy: Extend Direct Interpreter (Not Full AST Refactor)

**Architecture Assessment:**
- Current implementation: Recursive descent direct interpreter
- Pattern-based evaluation (regex + string manipulation)
- No formal AST structure (evaluateExpression does parse + eval simultaneously)
- Expression types handled by cascading pattern checks

**Week 2 Approach:**
- **Minimal disruption**: Insert member access patterns into existing evaluation flow
- **Precedence preservation**: Member access must be checked before binary operators
- **Future-proof**: Support chaining syntactically even if not evaluated yet
- **Error strict**: Explicit error types for all failure modes

**Why not full AST?**
- Would require 2-3 weeks and 3,000+ LOC
- High regression risk (rewrite entire evaluateExpression)
- Week 2 scope is field access, not architecture overhaul
- Direct interpreter sufficient for member access semantics

---

## 📂 Files to Modify

### 1. Core Engine
- **`packages/core/src/FormulaEngine.ts`** (~400 lines affected)
  - Add member access pattern detection
  - Implement evaluateMemberExpression method
  - Integrate into evaluateExpression cascade
  - Error handling for #VALUE!, #REF!, #FIELD!

### 2. Type System (Minor)
- **`packages/core/src/types/formula-types.ts`** (~20 lines)
  - Add #FIELD! error type constant
  - Document member expression semantics

### 3. Tests
- **`packages/core/__tests__/entity-week2-field-access.test.ts`** (NEW - 380 lines)
  - Already created - 25 tests defining behavior contract

### 4. Documentation
- **`docs/WEEK2_FIELD_ACCESS_IMPLEMENTATION.md`** (NEW - ~200 lines)
  - Implementation notes
  - Edge case decisions
  - Performance considerations

**Total Estimated LOC**: ~800 lines (400 engine + 380 tests + 20 docs)

---

## 🔧 Implementation Phases

### Phase 1: Pattern Detection (Day 1-2)
**Goal**: Recognize member expressions without evaluation

#### Step 1.1: Add Member Access Regex Patterns

**Location**: `FormulaEngine.ts`, top of `evaluateExpression` method  
**After**: Parentheses handling (line ~195)  
**Before**: Cell reference check (line ~293)

**Patterns to detect:**

```typescript
// Dot notation: A1.Price, STOCKDATA(A1).Ticker
const dotMemberPattern = /^(.+)\.([A-Z_][A-Z0-9_]*)$/i;

// Bracket notation: A1["Market Cap"], B2['Price']
const bracketMemberPattern = /^(.+)\[['"](.+)['"]\]$/;

// Chained member access (for future): A1.Stock.Price
const chainedMemberPattern = /^(.+)\.([A-Z_][A-Z0-9_]*)\.(.+)$/i;
```

**Pattern Order Matters:**
- Check chained BEFORE simple dot (longest match first)
- Check member patterns BEFORE binary operators (precedence)
- Check member patterns AFTER parentheses (paren removal first)

#### Step 1.2: Insert Pattern Checks

**Pseudo-location in evaluateExpression:**

```typescript
evaluateExpression(expr: string, context: FormulaContext): FormulaValue {
  expr = expr.trim();

  // [EXISTING] Parenthesized expression
  if (expr.startsWith('(') && expr.endsWith(')')) { ... }

  // [EXISTING] String literal
  if (expr.startsWith('"') && expr.endsWith('"')) { ... }

  // [EXISTING] Error literal
  if (expr.startsWith('#') && expr.endsWith('!')) { ... }

  // [NEW - WEEK 2] Chained member access (A1.Price.Value)
  const chainedMatch = expr.match(/^(.+)\.([A-Z_][A-Z0-9_]*)\.(.+)$/i);
  if (chainedMatch) {
    return this.evaluateChainedMember(chainedMatch, context);
  }

  // [NEW - WEEK 2] Simple dot member access (A1.Price)
  const dotMatch = expr.match(/^(.+)\.([A-Z_][A-Z0-9_]*)$/i);
  if (dotMatch) {
    return this.evaluateMemberExpression(dotMatch[1], dotMatch[2], context);
  }

  // [NEW - WEEK 2] Bracket member access (A1["Market Cap"])
  const bracketMatch = expr.match(/^(.+)\[['"](.+)['"]\]$/);
  if (bracketMatch) {
    return this.evaluateMemberExpression(bracketMatch[1], bracketMatch[2], context);
  }

  // [EXISTING] Number literal
  if (/^-?\d+(\.\d+)?$/.test(expr)) { ... }

  // [EXISTING] Cell reference
  if (/^[A-Z]+\d+$/i.test(expr)) { ... }

  // [EXISTING] Binary operations
  const operators = ['<>', '<=', '>=', '+', '-', '*', '/', '^', '=', '<', '>', '&'];
  for (const op of operators) { ... }

  // [EXISTING] Function call
  const functionMatch = expr.match(/^([A-Z_][A-Z0-9_.]*)\((.*)\)$/i);
  if (functionMatch) { ... }

  return new Error('#NAME?');
}
```

**Critical Ordering:**
1. Parentheses (highest precedence)
2. Literals (strings, numbers, errors)
3. **Member access (NEW - postfix operator, high precedence)**
4. Cell references
5. Binary operators (lower precedence)
6. Function calls (complex patterns)

---

### Phase 2: Evaluation Logic (Day 2-3)
**Goal**: Implement member dereference with error handling

#### Step 2.1: Implement evaluateMemberExpression

**New Method**: Add after `evaluateRangeReference` (~line 650)

```typescript
/**
 * Evaluates member expression (field access on entities)
 * 
 * Syntax:
 *   A1.Price         → Dot notation
 *   A1["Market Cap"] → Bracket notation (for fields with spaces)
 * 
 * Error Matrix:
 *   Base not entity  → #VALUE!
 *   Base is null     → #REF!
 *   Field missing    → #FIELD!
 *   Field is null    → null (valid)
 * 
 * Week 2 Constraints:
 *   - No dynamic field access (A1[B1]) - only static strings
 *   - No vectorized dereference (A1:A5.Price) - single entities only
 *   - No nested entities (A1.Stock.Price) - field values are primitives
 * 
 * @param baseExpr - Expression to evaluate (e.g., "A1", "SUM(A1:A5)")
 * @param fieldName - Field name to access (e.g., "Price", "Market Cap")
 * @param context - Evaluation context
 * @returns Field value or error
 */
private evaluateMemberExpression(
  baseExpr: string,
  fieldName: string,
  context: FormulaContext
): FormulaValue {
  // Step 1: Evaluate base expression
  const base = this.evaluateExpression(baseExpr, context);

  // Step 2: Check if base is an error (propagate)
  if (base instanceof Error) {
    return base;
  }

  // Step 3: Check if base is null or undefined → #REF!
  if (base === null || base === undefined) {
    return new Error('#REF!');
  }

  // Step 4: Check if base is an entity
  if (!isEntityValue(base)) {
    // Attempting field access on non-entity (number, string, boolean, array)
    return new Error('#VALUE!');
  }

  // Step 5: Entity exists - check if field exists
  const entity = base as EntityValue;

  if (!entity.fields.has(fieldName)) {
    // Field does not exist in entity's schema
    return new Error('#FIELD!');
  }

  // Step 6: Field exists - return field value (may be null, which is valid)
  const fieldValue = entity.fields.get(fieldName);

  // Field value is already a FormulaValue (number | string | boolean | null)
  return fieldValue as FormulaValue;
}
```

**Error Decision Matrix** (locked):

| Base Value Type | Field Exists | Field Value | Result         |
|----------------|-------------|-------------|----------------|
| Entity         | Yes         | 150         | 150            |
| Entity         | Yes         | null        | null           |
| Entity         | No          | N/A         | #FIELD!        |
| Number         | N/A         | N/A         | #VALUE!        |
| String         | N/A         | N/A         | #VALUE!        |
| Boolean        | N/A         | N/A         | #VALUE!        |
| Array          | N/A         | N/A         | #VALUE!        |
| null           | N/A         | N/A         | #REF!          |
| Error          | N/A         | N/A         | (propagate)    |

#### Step 2.2: Implement evaluateChainedMember (Future-Proofing)

**New Method**: Add after `evaluateMemberExpression`

```typescript
/**
 * Evaluates chained member expression (nested field access)
 * 
 * Example: A1.Stock.Price
 * 
 * Week 2: NOT SUPPORTED - Returns #VALUE!
 * Week 3+: Will support nested entities when framework added
 * 
 * Design Decision:
 * - Detect syntactically to avoid parsing ambiguity
 * - Fail explicitly (not #NAME? which implies unrecognized syntax)
 * - Future extension point when nested entities added
 */
private evaluateChainedMember(
  match: RegExpMatchArray,
  context: FormulaContext
): FormulaValue {
  // Week 2: Chained member access not supported
  // Return #VALUE! (not #NAME?) to indicate recognized but unsupported
  //
  // Future (Week 3+):
  // const [, baseExpr, firstField, restChain] = match;
  // const base = this.evaluateMemberExpression(baseExpr, firstField, context);
  // if (base instanceof Error) return base;
  // if (!isEntityValue(base)) return new Error('#VALUE!');
  // return this.evaluateMemberExpression(firstField, restChain, context);

  return new Error('#VALUE!');
}
```

---

### Phase 3: Type System Updates (Day 3)
**Goal**: Add #FIELD! error type and documentation

#### Step 3.1: Add #FIELD! Error Constant

**File**: `packages/core/src/types/formula-types.ts`  
**Location**: Near other error type definitions

```typescript
/**
 * Error types in Excel formulas
 */
export const FORMULA_ERRORS = {
  DIV_ZERO: '#DIV/0!',
  VALUE: '#VALUE!',
  REF: '#REF!',
  NAME: '#NAME?',
  NUM: '#NUM!',
  NA: '#N/A',
  NULL: '#NULL!',
  GETTING_DATA: '#GETTING_DATA',
  FIELD: '#FIELD!', // NEW - Week 2: Invalid entity field access
  CIRC: '#CIRC!',
} as const;
```

#### Step 3.2: Document Member Expression Semantics

**File**: `packages/core/src/types/formula-types.ts`  
**Location**: Near FormulaValue type definition

```typescript
/**
 * Week 2: Member Expression Semantics
 * 
 * Member expressions allow field access on entity values:
 * 
 * Syntax:
 *   A1.Price         → Dot notation (simple field names)
 *   A1["Market Cap"] → Bracket notation (fields with spaces/special chars)
 * 
 * Precedence:
 *   Member access is a postfix operator with highest precedence:
 *   A1.Price + 5   → (A1.Price) + 5
 *   A1.Price > 100 → (A1.Price) > 100
 * 
 * Type Rules:
 *   - Base must be EntityValue (not number, string, boolean, array)
 *   - Field name must be static string (no dynamic A1[B1] yet)
 *   - Field value is scalar (number | string | boolean | null)
 * 
 * Error Handling:
 *   - #VALUE!: Base is not an entity
 *   - #REF!: Base is null/undefined
 *   - #FIELD!: Field does not exist in entity's schema
 *   - null: Field exists but value is null (valid case)
 * 
 * Constraints (Week 2):
 *   - No vectorized access (A1:A5.Price)
 *   - No dynamic field names (A1[B1])
 *   - No nested entities (A1.Stock.Price)
 *   - No computed expressions (A1["Price" & "Change"])
 * 
 * Display Value Semantics (Preserved):
 *   A1 + 5       → uses display value
 *   A1.Price + 5 → uses Price field (overrides display)
 */
```

---

### Phase 4: Edge Case Hardening (Day 4)
**Goal**: Handle subtle cases that could break tests

#### Edge Case 1: Whitespace in Bracket Notation

**Issue**: `A1["Market Cap"]` vs `A1[ "Market Cap" ]`

**Solution**: Trim inside brackets

```typescript
const bracketMatch = expr.match(/^(.+)\[\s*['"](.+)['"]\s*\]$/);
```

#### Edge Case 2: Case Sensitivity in Field Names

**Decision Required**: Are field names case-sensitive?

**Recommendation**: **Case-sensitive** (matches JavaScript object semantics)

```typescript
// This is DIFFERENT from function names (which are case-insensitive)
// Rationale: Fields are data, functions are operations
// Excel entities use case-sensitive field names

if (!entity.fields.has(fieldName)) { // Exact match required
```

**Test Coverage:**

```typescript
A1.Price  → looks for "Price"
A1.price  → looks for "price" (different field)
A1.PRICE  → looks for "PRICE" (different field)
```

#### Edge Case 3: Member Access in Binary Operations

**Issue**: Precedence must be clear

**Test Cases:**

```typescript
A1.Price + B1.Price     → (A1.Price) + (B1.Price)
A1.Price * 2 + 1        → ((A1.Price) * 2) + 1
A1.Price > 100 AND TRUE → (A1.Price > 100) AND TRUE
```

**Implementation**: Member access checked BEFORE splitByOperator, so:

```
A1.Price + 5
→ Not split by +
→ Matches dotMemberPattern
→ evaluateMemberExpression("A1", "Price", ctx)
→ Returns 150
→ Then `150 + 5` evaluated as binary +
```

#### Edge Case 4: Member Access on Function Results

**Issue**: `SUM(A1:A5).Price` - should this work?

**Week 2 Decision**: **#VALUE!** (function returns number/array, not entity)

**Future Consideration**: If function returns entity, should work

**Test:**

```typescript
SUM(A1:A5).Price → #VALUE! (SUM returns number)
INDEX(A1:A5, 1).Price → Could work if INDEX returns entity (Week 3+)
```

#### Edge Case 5: Null vs Missing

**Critical Distinction:**

```typescript
Entity has field "OptionalValue" = null  → return null (valid)
Entity missing field "NonExistent"       → return #FIELD! (error)
```

**Implementation:**

```typescript
if (!entity.fields.has(fieldName)) {
  return new Error('#FIELD!'); // Field does not exist
}

const value = entity.fields.get(fieldName);
return value; // May be null, which is valid
```

---

### Phase 5: Integration Testing (Day 5)
**Goal**: Run all 25 field access tests + full regression suite

#### Test Matrix

**Basic Tests** (Tests 1-8):
- [x] Dot notation with numbers
- [x] Dot notation with strings
- [x] Bracket notation with simple names
- [x] Bracket notation with spaces
- [x] Arithmetic expressions
- [x] Comparison expressions
- [x] Multiple field accesses
- [x] Equivalence dot vs bracket

**Error Tests** (Tests 9-15):
- [x] #VALUE! on number base
- [x] #VALUE! on string base
- [x] #VALUE! on boolean base
- [x] #REF! on null base
- [x] #REF! on empty cell
- [x] #FIELD! on missing field
- [x] Error distinctness

**Value Type Tests** (Tests 16-18):
- [x] Null field value (not #FIELD!)
- [x] Boolean field value
- [x] Field in IF logic

**Precedence Tests** (Tests 19-21):
- [x] Member vs addition
- [x] Member vs comparison
- [x] Complex expression

**Compatibility Tests** (Tests 22-24):
- [x] Display value without field access
- [x] Field access overrides display
- [x] Range display unchanged

**Edge Case Tests** (Test 25):
- [x] Nested member error

#### Regression Check

**Command:**

```bash
npm test -- entity-week2-field-access.test.ts
# Expected: 25/25 passing

npm test
# Expected: 2,971 passing (2,946 baseline + 25 new)
# Expected: 56 failures (pre-existing, unchanged)
```

**Failure Analysis:**
- If new failures appear: Roll back member access patterns
- Grep new failures for "entity", "field", "member"
- Check for precedence issues (operators incorrectly split member expressions)

---

### Phase 6: Performance Validation (Day 6)
**Goal**: Ensure member access doesn't slow down existing tests

#### Performance Tests

**Test 1: Member Access Overhead**

```typescript
// Measure: 10,000 member accesses
const entity = createEntityValue(STOCK_SCHEMA, { Price: 100, ... });
sheet.setValue('A1', entity);

const start = performance.now();
for (let i = 0; i < 10000; i++) {
  engine.evaluate('=A1.Price', sheet);
}
const elapsed = performance.now() - start;

// Target: <50ms (5μs per access)
expect(elapsed).toBeLessThan(50);
```

**Test 2: No Regression Overhead**

```typescript
// Measure: existing formula (no entities)
const start = performance.now();
for (let i = 0; i < 10000; i++) {
  engine.evaluate('=SUM(A1:A100)', sheet);
}
const elapsed = performance.now() - start;

// Target: Same as baseline (within 5%)
// Baseline: ~30ms (measured before Week 2)
// Week 2: <31.5ms (30ms * 1.05)
expect(elapsed).toBeLessThan(31.5);
```

**Optimization Notes:**
- Member access regex very specific (low false positive rate)
- Early exit if no `.` or `[` in expression
- Pattern checks O(n) with expression length
- Entity field access O(1) via Map

---

## 🚨 Risk Mitigation

### Risk 1: Precedence Bugs

**Symptom**: `A1.Price + 5` parsed as `A1.(Price + 5)`

**Detection**: Test 19-21 will fail

**Prevention**:
- Member patterns checked BEFORE operator splitting
- Operator splitting respects parentheses/structure
- Comprehensive precedence tests in suite

**Rollback Plan**: Comment out member patterns, revert to #NAME?

---

### Risk 2: Breaking Existing Formulas

**Symptom**: Existing tests fail with new #VALUE! errors

**Detection**: Regression sweep (full test suite)

**Potential Causes:**
- Member pattern too broad (false positives)
- Function name containing `.` misinterpreted
- String literals with `.` misinterpreted

**Prevention**:
- Specific regex patterns (not greedy)
- String literals checked BEFORE member patterns
- Function patterns still match (dotted names like STDEV.S)

**Rollback Plan**: Revert evaluateExpression to Week 1 state (git checkout)

---

### Risk 3: Performance Degradation

**Symptom**: Full test suite takes >10% longer

**Detection**: CI performance tracking

**Potential Causes:**
- Member regex runs on every expression (even non-members)
- Cascading pattern checks slow down

**Mitigation**:
- Early exit: if no `.` or `[` in expr, skip member checks
- Profile with large sheets (10,000 formulas)

**Acceptable Overhead**: <5% (existing 2,946 tests <5% slower)

---

## 📋 Implementation Checklist

### Day 1-2: Pattern Detection
- [ ] Add dotMemberPattern, bracketMemberPattern, chainedMemberPattern
- [ ] Insert pattern checks in evaluateExpression (after parentheses, before operators)
- [ ] Test pattern matching (unit tests for regex)
- [ ] Verify no existing tests break (run full suite)

### Day 2-3: Evaluation Logic
- [ ] Implement evaluateMemberExpression method
- [ ] Implement evaluateChainedMember method (stub for Week 2)
- [ ] Add error handling (#VALUE!, #REF!, #FIELD!)
- [ ] Test error matrix (9 scenarios)

### Day 3: Type System
- [ ] Add #FIELD! constant to formula-types.ts
- [ ] Document member expression semantics
- [ ] Update error string constants

### Day 4: Edge Cases
- [ ] Whitespace handling in bracket notation
- [ ] Case sensitivity decision documented
- [ ] Member access in binary ops tested
- [ ] Null vs missing field distinction enforced

### Day 5: Integration Testing
- [ ] Run all 25 field access tests → 25/25 passing
- [ ] Run full regression suite → 2,971/3,024 passing
- [ ] Verify 56 failures unchanged (grep for entity keywords)
- [ ] Document test results

### Day 6: Performance & Documentation
- [ ] Measure member access overhead (<5%)
- [ ] Measure regression overhead (<5%)
- [ ] Profile large sheets (10,000 formulas)
- [ ] Write WEEK2_FIELD_ACCESS_IMPLEMENTATION.md
- [ ] Update CHANGELOG.md

---

## 🎯 Success Criteria

**Must Pass:**
- ✅ All 25 field access tests passing
- ✅ All 2,946 Week 1 tests still passing (+25 = 2,971 total)
- ✅ 56 pre-existing failures unchanged (no new entity-related failures)
- ✅ Zero TypeScript errors
- ✅ Performance overhead <5%

**Qualitative:**
- ✅ Error messages clear (#VALUE!, #REF!, #FIELD! distinct)
- ✅ Precedence correct (member binds tighter than operators)
- ✅ Display semantics preserved (A1 vs A1.Price distinct)
- ✅ Code readable (member logic self-contained)

---

## 🚀 Week 3 Preview

**After Week 2 completes:**

Week 3 will add:
- EntityManager registry (singleton, deterministic)
- Mock data providers (Stock/Geography with static data)
- Plugin API (provider registration, custom schemas)
- Integration helpers (worksheet.setEntityValue)

**Week 3 will NOT require parser changes** (field access already works)

Week 3 is framework/infrastructure, not language features.

---

## 📞 Point of Contact for Decisions

**During Implementation:**

If you encounter:
1. **Ambiguous syntax**: MSFT.test.ts matching member pattern?
   → Decision: Check for file extension, or require cell refs as base

2. **Unexpected error propagation**: Should A1.Price propagate #DIV/0! from A1?
   → Decision: Yes, errors in base propagate (already handled)

3. **Function returning entity**: VLOOKUP returning entity, .Price access?
   → Decision: Week 2 - out of scope, document for Week 3+

**Stop Work If:**
- More than 10 existing tests break (rollback)
- Performance overhead >10% (investigate before continuing)
- Error matrix becomes ambiguous (clarify before more code)

---

## 📄 Summary

**Week 2 is a surgical parser extension:**
- Add 3 regex patterns to evaluateExpression
- Implement 2 new methods (evaluateMemberExpression, evaluateChainedMember)
- Add 1 error type (#FIELD!)
- Write 25 tests (already done)
- Preserve 2,946 existing tests

**This is achievable in 5-7 days with controlled risk.**

**The key insight**: No AST refactor needed. Extend direct interpreter with high-precedence member patterns.

**Go/No-Go gates:**
- End of Day 2: Patterns detect correctly, no broken tests
- End of Day 3: Error matrix enforced, all edge cases passing
- End of Day 5: All 2,971 tests passing, zero regressions

**If any gate fails**: Stop, debug, rollback if necessary.

**Week 2 success = Week 3 foundation** (entities are now usable in formulas).
