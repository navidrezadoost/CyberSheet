# Week 2: Insertion Point Checklist
**Purpose**: Formal verification of member access integration into FormulaEngine  
**Risk Level**: High (parser-level changes)  
**Reviewer**: Pre-implementation safety checklist

---

## 🎯 Insertion Strategy: String-Based Cascade Extension

**Architecture Context:**
- Current engine: Recursive descent with string pattern matching
- No separate tokenization phase
- Precedence enforced via cascade order in `evaluateExpression`
- Member access = new pattern in existing cascade

**Risk Acknowledged:** Regex on raw strings (not token-based)  
**Mitigation:** Cascade order + explicit pattern restrictions + stress tests

---

## 📍 Exact Insertion Point (FormulaEngine.ts)

### Current Cascade Order (Lines ~195-405)

```typescript
evaluateExpression(expr: string, context: FormulaContext): FormulaValue {
  expr = expr.trim();

  // 1. Parentheses - Remove outer matching parens
  if (expr.startsWith('(') && expr.endsWith(')')) { ... }

  // 2. String literal - IMMUNITY CHECK
  if (expr.startsWith('"') && expr.endsWith('"')) {
    return expr.slice(1, -1); // ← NEVER reaches member check
  }

  // 3. Error literal
  if (expr.startsWith('#') && expr.endsWith('!')) {
    return new Error(expr);
  }

  // 4. Array literal
  if (expr.startsWith('{') && expr.endsWith('}')) { ... }

  // 5. Number literal
  if (/^-?\d+(\.\d+)?$/.test(expr)) {
    return parseFloat(expr);
  }

  // 6. Boolean literal
  if (expr.toLowerCase() === 'true') return true;
  if (expr.toLowerCase() === 'false') return false;

  // 7. Lambda parameter
  if (context.lambdaContext) { ... }

  // 8. Named lambda
  if (context.namedLambdas && ...) { ... }

  // 9. Cell reference
  if (/^[A-Z]+\d+$/i.test(expr)) {
    return this.evaluateCellReference(expr, context);
  }

  // 10. Range reference
  if (/^[A-Z]+\d+:[A-Z]+\d+$/i.test(expr)) {
    return this.evaluateRangeReference(expr, context);
  }

  // ═══════════════════════════════════════════════════════
  // [NEW - WEEK 2] INSERT MEMBER ACCESS PATTERNS HERE
  // ═══════════════════════════════════════════════════════

  // 11. Unary minus
  if (expr.startsWith('-') && expr.length > 1) { ... }

  // 12. Unary plus
  if (expr.startsWith('+') && expr.length > 1) { ... }

  // 13. Binary operations
  const operators = ['<>', '<=', '>=', '+', '-', '*', '/', '^', '=', '<', '>', '&'];
  for (const op of operators) {
    const parts = this.splitByOperator(expr, op);
    if (parts.length > 1) { ... }
  }

  // 14. Function call
  const functionMatch = expr.match(/^([A-Z_][A-Z0-9_.]*)\((.*)\)$/i);
  if (functionMatch) { ... }

  return new Error('#NAME?');
}
```

---

## ✅ Insertion Checklist (Pre-Code)

### Phase 1: Pattern Definition

**Location**: After line ~293 (range reference check)  
**Before**: Unary minus/plus checks

#### [ ] Step 1.1: Define Member Patterns

```typescript
// [NEW - WEEK 2] Member access patterns
// Checked AFTER literals/references, BEFORE unary/binary operators

// Pattern 1: Chained member (future-proofing)
// Example: A1.Stock.Price (Week 2: returns #VALUE!)
const chainedMemberRegex = /^(.+)\.([A-Z_][A-Z0-9_]*)\.(.+)$/i;

// Pattern 2: Dot notation
// Example: A1.Price, SUM(A1:A5).Value
// Note: Base (.+) is greedy but constrained by earlier checks
const dotMemberRegex = /^(.+)\.([A-Z_][A-Z0-9_]*)$/i;

// Pattern 3: Bracket notation
// Example: A1["Market Cap"], B2['Price']
// Note: Handles spaces in field names
const bracketMemberRegex = /^(.+)\[\s*['"](.+)['"]\s*\]$/;
```

**Safety Verification:**
- [ ] String literals already returned (never reach these patterns)
- [ ] Error literals already returned
- [ ] Cell refs already returned (single-cell refs won't match)
- [ ] Patterns checked before unary (so member binds tighter)

---

#### [ ] Step 1.2: Insert Pattern Checks

```typescript
// [NEW - WEEK 2] Chained member access (detect but not supported)
const chainedMatch = expr.match(chainedMemberRegex);
if (chainedMatch) {
  return this.evaluateChainedMember(chainedMatch, context);
}

// [NEW - WEEK 2] Dot notation member access
const dotMatch = expr.match(dotMemberRegex);
if (dotMatch) {
  return this.evaluateMemberExpression(dotMatch[1], dotMatch[2], context);
}

// [NEW - WEEK 2] Bracket notation member access
const bracketMatch = expr.match(bracketMemberRegex);
if (bracketMatch) {
  return this.evaluateMemberExpression(bracketMatch[1], bracketMatch[2], context);
}
```

**Pattern Order:**
- [ ] Chained checked FIRST (longest match wins)
- [ ] Dot checked SECOND (common case)
- [ ] Bracket checked THIRD (alternative syntax)

---

### Phase 2: Implementation Methods

**Location**: After `evaluateRangeReference` (~line 650)

#### [ ] Step 2.1: Implement evaluateMemberExpression

```typescript
/**
 * Evaluates member expression (field access on entities)
 * 
 * Week 2: Supports static field access only
 * 
 * @param baseExpr - Expression for entity (e.g., "A1")
 * @param fieldName - Static field name (e.g., "Price")
 * @param context - Evaluation context
 * @returns Field value or error
 */
private evaluateMemberExpression(
  baseExpr: string,
  fieldName: string,
  context: FormulaContext
): FormulaValue {
  // Evaluate base expression recursively
  const base = this.evaluateExpression(baseExpr, context);

  // Error propagation
  if (base instanceof Error) return base;

  // Null check (#REF!)
  if (base === null || base === undefined) {
    return new Error('#REF!');
  }

  // Type check (#VALUE!)
  if (!isEntityValue(base)) {
    return new Error('#VALUE!');
  }

  // Field existence check (#FIELD!)
  const entity = base as EntityValue;
  if (!entity.fields.has(fieldName)) {
    return new Error('#FIELD!');
  }

  // Return field value (may be null)
  return entity.fields.get(fieldName) as FormulaValue;
}
```

**Safety Checks:**
- [ ] Base expression evaluated recursively (handles nesting)
- [ ] Errors propagate correctly
- [ ] Null distinct from missing field
- [ ] Non-entity base returns #VALUE!
- [ ] Missing field returns #FIELD!

---

#### [ ] Step 2.2: Implement evaluateChainedMember (Stub)

```typescript
/**
 * Evaluates chained member expression (nested field access)
 * 
 * Week 2: NOT SUPPORTED - Returns #VALUE!
 * Week 3+: Will support when nested entities added
 * 
 * @param match - Regex match array
 * @param context - Evaluation context
 * @returns #VALUE! error (unsupported in Week 2)
 */
private evaluateChainedMember(
  match: RegExpMatchArray,
  context: FormulaContext
): FormulaValue {
  // Week 2: Chained access not supported
  // Returning #VALUE! (not #NAME?) indicates recognized but unsupported syntax
  return new Error('#VALUE!');
}
```

**Future-Proofing:**
- [ ] Chained syntax detected (won't error as #NAME?)
- [ ] Returns #VALUE! (clear unsupported indicator)
- [ ] Comment explains Week 3+ extension plan

---

## 🚨 Safety Verification Checklist

### String Literal Immunity

**Test Case:**
```typescript
=IF(A1.Price > 100, "High.Value", "Low")
```

**Expected Flow:**
1. Function call pattern matches → parses arguments
2. Argument `"High.Value"` → string literal check returns early
3. Argument `A1.Price` → member pattern matches after literals

**Verification:**
- [ ] String literal check happens BEFORE member patterns
- [ ] String returned immediately (no pattern matching)
- [ ] Dot inside string never interpreted as member access

**Test Coverage:** Add explicit test:
```typescript
expect(engine.evaluate('="A1.Price"', sheet)).toBe('A1.Price');
```

---

### Precedence: Member vs Unary

**Test Case:**
```typescript
=-A1.Price
```

**Expected Parse:** `-(A1.Price)` (member binds tighter)

**Issue:** Pattern `^(.+)\.([A-Z_]+)$` matches with base=`-A1`

**Analysis:**
- Member pattern matches: base=`-A1`, property=`Price`
- Evaluate base: `-A1` triggers unary handling → `-(entity_display)`
- Result: Number (not entity) → `.Price` fails with #VALUE!

**This is WRONG!** We want: `-(A1.Price)` = -100

**Root Cause:** Greedy `(.+)` captures `-` as part of base.

**Solution Options:**

**Option A: Restrictive Base Pattern**
```typescript
// Only allow primary expressions as base
const dotMemberRegex = /^([A-Z0-9_():]+)\.([A-Z_][A-Z0-9_]*)$/i;
```
- Pro: Explicit about valid bases
- Con: Breaks complex bases like `SUM(A1:A5).Field` (if ever supported)

**Option B: Negative Lookahead**
```typescript
// Reject if base starts with operator
const dotMemberRegex = /^(?![-+*/^=<>])(.+)\.([A-Z_][A-Z0-9_]*)$/i;
```
- Pro: Flexible for complex bases
- Con: Operator list must be exhaustive

**Option C: Cascade Handles It**
```typescript
// Unary check comes BEFORE member check (reorder cascade)
```
- Pro: Natural precedence handling
- Con: Reverses my proposed order

**Recommended: Option C + Explicit Test**

Reorder cascade:
```typescript
// 11. Unary minus (checked BEFORE member)
if (expr.startsWith('-') && expr.length > 1) {
  const operand = expr.substring(1);
  // If operand contains member, will be handled in recursive call
  const result = this.evaluateExpression(operand, context);
  // ...
}

// 12. Member access (checked AFTER unary)
const dotMatch = expr.match(/^(.+)\.([A-Z_][A-Z0-9_]*)$/i);
// ...
```

Flow for `=-A1.Price`:
1. Unary `-` detected
2. Operand = `A1.Price`
3. Recursively evaluate `A1.Price` → member pattern matches → 100
4. Apply unary: `-100`

**This correctly parses as `-(A1.Price)`!**

**Revised Insertion Point:**
```
1. Literals
2. Cell/range refs
3. Unary minus/plus ← BEFORE member!
4. Member access ← AFTER unary!
5. Binary operators
6. Function calls
```

---

### Precedence: Member vs Binary

**Test Case:**
```typescript
=A1.Price + 5
```

**Expected Parse:** `(A1.Price) + 5`

**Analysis:**
- Binary `+` split: left=`A1.Price`, right=`5`
- Evaluate left: Member pattern matches → 100
- Evaluate right: Number literal → 5
- Apply `+`: 100 + 5 = 105

**This is CORRECT!** Binary split happens before member evaluation.

**Verification:**
- [ ] Binary operator split happens in cascade
- [ ] Split respects parentheses (doesn't split inside parens)
- [ ] Each side evaluated independently → member patterns work

---

### Precedence: Member vs Exponent

**Test Case:**
```typescript
=A1.Price^2
```

**Expected Parse:** `(A1.Price)^2`

**Analysis:**
- Binary `^` split: left=`A1.Price`, right=`2`
- Evaluate left: Member pattern matches → 10
- Evaluate right: Number literal → 2
- Apply `^`: 10^2 = 100

**This is CORRECT!** Same as binary +.

---

### Function Call Immunity

**Test Case:**
```typescript
=SUM(A1.Price, B1.Price)
```

**Expected Flow:**
1. Function call pattern matches: `SUM(...)`
2. Parse arguments: `A1.Price`, `B1.Price`
3. Evaluate each argument:
   - `A1.Price` → member pattern matches → 100
   - `B1.Price` → member pattern matches → 200
4. Call SUM: SUM([100, 200]) = 300

**Analysis:**
- Arguments parsed by `parseArguments` (respects commas, parentheses)
- Each argument evaluated as separate expression
- Member patterns work within arguments

**This is CORRECT!** Function argument parsing already isolates member expressions.

---

## 🧪 Required Stress Tests (10 Cases)

### Test Pack: Precedence Validation

```typescript
describe('Week 2: Precedence Stress Tests', () => {
  let engine: FormulaEngine;
  let sheet: Worksheet;

  beforeEach(() => {
    engine = new FormulaEngine();
    sheet = engine.createWorksheet('TestSheet');
    
    const stockEntity = createEntityValue(STOCK_SCHEMA, {
      Price: 10,
      Ticker: 'AAPL',
      Name: 'Apple Inc.',
    }, { displayValue: 5 });
    
    sheet.setValue('A1', stockEntity);
  });

  test('[S1] Unary minus with member access', () => {
    const result = engine.evaluate('=-A1.Price', sheet);
    expect(result).toBe(-10); // -(A1.Price)
  });

  test('[S2] Unary plus with member access', () => {
    const result = engine.evaluate('=+A1.Price', sheet);
    expect(result).toBe(10); // +(A1.Price)
  });

  test('[S3] Exponent with member access', () => {
    const result = engine.evaluate('=A1.Price^2', sheet);
    expect(result).toBe(100); // (A1.Price)^2
  });

  test('[S4] Addition with member access', () => {
    const result = engine.evaluate('=A1.Price + 50', sheet);
    expect(result).toBe(60); // (A1.Price) + 50
  });

  test('[S5] Multiplication with member access', () => {
    const result = engine.evaluate('=A1.Price * 2', sheet);
    expect(result).toBe(20); // (A1.Price) * 2
  });

  test('[S6] Comparison with member access', () => {
    const result = engine.evaluate('=A1.Price > 5', sheet);
    expect(result).toBe(true); // (A1.Price) > 5
  });

  test('[S7] Mixed field and display value', () => {
    const result = engine.evaluate('=A1.Price + A1', sheet);
    expect(result).toBe(15); // 10 + 5 (field + display)
  });

  test('[S8] String literal with dot', () => {
    const result = engine.evaluate('="A1.Price"', sheet);
    expect(result).toBe('A1.Price'); // String, not member
  });

  test('[S9] Nested parentheses with member', () => {
    const result = engine.evaluate('=((A1.Price))', sheet);
    expect(result).toBe(10); // Parens removed, member works
  });

  test('[S10] Complex expression', () => {
    const result = engine.evaluate('=A1.Price * 2 + A1', sheet);
    expect(result).toBe(25); // (10 * 2) + 5
  });
});
```

**All 10 must pass before merging Week 2 code.**

---

## 🛑 Stop-Work Conditions

If any of these occur, **HALT IMMEDIATELY**:

1. **Precedence test fails** (S1-S10)
   - Action: Reorder cascade insertion point
   
2. **String literal interpreted as member**
   - Action: Verify literal checks happen first
   
3. **More than 10 existing tests fail**
   - Action: Rollback member patterns, reassess strategy
   
4. **Function names misinterpreted** (e.g., `STDEV.S` broken)
   - Action: Adjust member pattern to exclude function context
   
5. **Performance regression >7%**
   - Action: Add early-exit optimization (check for `.` or `[` before regex)

---

## 📋 Final Pre-Code Checklist

Before writing any implementation code:

- [ ] Reviewed current `evaluateExpression` cascade (lines 195-405)
- [ ] Confirmed string literal immunity (line ~222)
- [ ] Decided member insertion point: AFTER unary, BEFORE binary
- [ ] Defined 3 regex patterns (chained, dot, bracket)
- [ ] Planned 2 new methods (evaluateMemberExpression, evaluateChainedMember)
- [ ] Added 10 precedence stress tests to test suite
- [ ] Added 3 safety tests (string literal, function args, parens)
- [ ] Reviewed error matrix (#VALUE!, #REF!, #FIELD!)
- [ ] Confirmed rollback plan (git checkout + pattern comment)
- [ ] Set stop-work thresholds (10 failures, 7% perf)

**Only proceed to implementation after ALL boxes checked.**

---

## 📞 Escalation Points

If unclear during implementation:

**Q: Should STDEV.S be interpreted as member access?**  
A: NO. Function call pattern checked later in cascade, will match correctly.

**Q: Should `(A1).Price` work?**  
A: YES. Parentheses removed first, then `A1.Price` evaluated.

**Q: Should `A1.Price.Value` return #NAME? or #VALUE!?**  
A: #VALUE!. Syntax recognized (chained member), but unsupported in Week 2.

**Q: Performance overhead >7% but <10%?**  
A: PAUSE. Profile to identify bottleneck. Consider early-exit optimization.

---

## ✅ Approval Gate

**Checklist approved**: Ready for implementation  
**Checklist concerns**: Address issues before coding  
**Checklist rejected**: Redesign insertion strategy

This checklist represents the formal contract for Week 2 parser integration.
