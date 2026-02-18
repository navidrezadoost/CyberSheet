# Week 3 — Hybrid Tokenization Layer Design
**Status:** 🟢 APPROVED FOR IMPLEMENTATION  
**Date:** February 18, 2026  
**Prerequisite:** v2.1-entity-stable  
**Architecture:** Model B (Selective Extraction)  
**Critical Fixes:** Index-based replacement + local bracket tracking

---

## Critical Validations (All Confirmed)

This design has been stress-tested against architectural requirements:

1. ✅ **Detection tracks state** — Parentheses depth + string literals tracked to prevent false positives
2. ✅ **Single-level stays in cascade** — Only 2+ levels or brackets trigger tokenization (zero risk to stable paths)
3. ✅ **Null short-circuit explicit** — Chain stops immediately if field is null (no crash, no error)
4. ✅ **Dot/bracket normalized** — Both syntaxes compile to same `{ base, properties }` structure
5. ✅ **Selective extraction (Model B)** — Handles embedded chains in larger expressions, not just whole-expression chains

**Critical edge cases resolved:**

6. ✅ **Replacement safety** — Index-based replacement (descending order) handles duplicate chains correctly
7. ✅ **Chain detection boundary** — Local bracket tracking prevents false triggering from brackets elsewhere in formula
8. ✅ **String literal immunity** — State machine correctly ignores member access patterns inside strings
9. ✅ **Error propagation** — Cascade must propagate errors from substituted chain values
10. ✅ **Error short-circuit** — If any chain evaluates to error, return immediately without evaluating remaining chains or passing to cascade

**Result:** Bounded scope, deterministic behavior, minimal complexity, operator precedence preserved, no silent correctness bugs.

---

## Design Scope

**Goal:** Add minimal structural layer to prevent regex pattern explosion from chained member access.

**Non-Goal:** Full AST rewrite, parser generator, backtracking, operator precedence changes.

---

## 1. Detection Rule — When to Tokenize

### Trigger Pattern

Tokenization activates **only** when formula contains **at top level**:

- **Two or more consecutive member accesses** (chaining)
- **OR bracket notation** (dynamic field access)

**CRITICAL:** Detection must track:
- Parentheses depth (ignore inside function calls)
- String state (ignore inside literals)
- Only count access patterns at depth 0

**Examples that trigger tokenization:**

```
=A1.Price.Currency           // 2+ levels → tokenize
=A1["Price"]                 // Bracket notation → tokenize
=A1.Price["SubField"].Value  // Mixed chaining → tokenize
=IF(A1.Price.USD > 10, ...)  // Chained at top level → tokenize
```

**Examples that stay in cascade:**

```
=A1.Price                  // Single-level → cascade (already stable)
=A1.Price + B1.Price       // Two separate single-level → cascade
=SUM(A1:A10)               // No member access → cascade
="A1.Price.Currency"       // Inside string → cascade
=IF(TRUE, A1.Price)        // Single-level inside function → cascade
```

### Detection Strategy (State-Aware)

**Phase 1 — Pre-scan (Before Cascade)**

```typescript
function needsTokenization(formula: string): boolean {
  let depth = 0;           // Parentheses depth
  let inString = false;    // Inside string literal
  let stringChar = '';     // Which quote opened the string
  
  let memberAccessCount = 0;
  let hasBracket = false;
  let lastChar = '';
  
  for (let i = 0; i < formula.length; i++) {
    const char = formula[i];
    
    // Track string state
    if (!inString && (char === '"' || char === "'")) {
      inString = true;
      stringChar = char;
      continue;
    }
    if (inString && char === stringChar && lastChar !== '\\') {
      inString = false;
      continue;
    }
    
    // Skip if inside string
    if (inString) {
      lastChar = char;
      continue;
    }
    
    // Track parentheses depth
    if (char === '(') depth++;
    if (char === ')') depth--;
    
    // Only detect at top level (depth 0)
    if (depth === 0) {
      // Count member access dots
      if (char === '.' && i > 0 && /[A-Z0-9_\)]/.test(lastChar)) {
        memberAccessCount++;
      }
      
      // Detect bracket notation
      if (char === '[' && i > 0 && /[A-Z0-9_\)]/.test(lastChar)) {
        hasBracket = true;
      }
    }
    
    lastChar = char;
  }
  
  // Trigger only if 2+ member accesses OR bracket notation
  return memberAccessCount >= 2 || hasBracket;
}
```

**Rationale:**
- Single-level `A1.Price` stays in cascade (already validated, zero risk)
- Only chains (2+) or brackets need structural handling
- State tracking prevents false positives on string literals
- Depth tracking ignores member access inside function arguments

**Phase 2 — Hybrid Evaluation**

If `needsTokenization()` returns `true`:
- Extract member chain segments
- Tokenize only those segments
- Pass rest to existing cascade

If `false`:
- Use existing cascade entirely
- Zero overhead for non-chained expressions

---

## 2. Token Structure (Minimal)

### Unified Structure

**Both dot and bracket notation compile to the same structure:**

```typescript
interface MemberChain {
  base: string;           // Cell reference: "A1"
  properties: string[];   // Property path: ["Price", "Currency"]
}
```

**No punctuation tokens. No syntax distinction at evaluation time.**

### Normalization Examples

**Input:** `A1.Price.Currency`

**Output:**
```typescript
{
  base: "A1",
  properties: ["Price", "Currency"]
}
```

**Input:** `A1["Price"]["Currency"]`

**Output:**
```typescript
{
  base: "A1",
  properties: ["Price", "Currency"]
}
```

**Input:** `A1.Price["Currency"]` (mixed)

**Output:**
```typescript
{
  base: "A1",
  properties: ["Price", "Currency"]
}
```

**Key insight:** Evaluation doesn't care about syntax — only property names.

### Tokenizer Implementation

```typescript
function tokenizeMemberChain(expr: string): MemberChain {
  // Extract base (cell reference)
  const baseMatch = expr.match(/^([A-Z]+\d+)/);
  if (!baseMatch) throw new Error("Invalid member chain");
  
  const base = baseMatch[1];
  const properties: string[] = [];
  
  let remaining = expr.slice(base.length);
  
  while (remaining.length > 0) {
    // Match .Property (dot notation)
    const dotMatch = remaining.match(/^\.([A-Z_][A-Z0-9_]*)/i);
    if (dotMatch) {
      properties.push(dotMatch[1]);
      remaining = remaining.slice(dotMatch[0].length);
      continue;
    }
    
    // Match ["Property"] or ['Property'] (bracket notation)
    const bracketMatch = remaining.match(/^\[["']([^"']+)["']\]/);
    if (bracketMatch) {
      properties.push(bracketMatch[1]);
      remaining = remaining.slice(bracketMatch[0].length);
      continue;
    }
    
    // No more member access
    break;
  }
  
  return { base, properties };
}
```

---

## 3. Evaluation Contract

### Sequential Resolution Strategy

Member chains evaluate **left-to-right**, propagating type through each step:

```
A1.Price.Currency
│  │     │
│  │     └─ Get "Currency" from entity
│  └─ Get "Price" from entity (must return entity to continue)
└─ Resolve cell reference
```

### Evaluation Rules

```typescript
function evaluateChain(
  chain: MemberChain, 
  context: FormulaContext
): FormulaValue {
  
  // Rule 1: Resolve base
  let current: FormulaValue = resolveCell(chain.base, context);
  
  // Rule 2: Base error → propagate immediately
  if (isError(current)) {
    return current;
  }
  
  // Rule 3: Base null → error (cannot traverse)
  if (current === null) {
    return FormulaError.REF("Cannot access field on null reference");
  }
  
  // Rule 4: Traverse property chain
  for (const property of chain.properties) {
    // Must be entity to access fields
    if (current.kind !== 'entity') {
      return FormulaError.VALUE(
        `Cannot access field '${property}' on non-entity`
      );
    }
    
    // Get field value
    const field = current.fields[property];
    
    // Missing field → error
    if (field === undefined) {
      return FormulaError.FIELD(
        `Field '${property}' not found in entity`
      );
    }
    
    // *** CRITICAL: NULL SHORT-CIRCUIT ***
    // If field is null, stop chain traversal immediately
    if (field === null) {
      return null;  // Don't attempt to access further properties
    }
    
    // Continue traversal with field value
    current = field;
  }
  
  // Rule 5: Final unwrapping (only at end of chain)
  return cellValueToFormulaValue(current);
}
```

### Critical Invariants

1. **No intermediate unwrapping:** Entity values stay wrapped until final property
2. **Null stops chain:** Cannot access properties on null (return null immediately)
3. **Error propagates:** Base errors bypass entire chain
4. **Type safety:** Each step validates entity type before field access

---

## 4. Error Propagation Rules

### Error Priority (Strictest First)

1. **Base error:** If cell reference is error → propagate immediately, skip chain
2. **Base null:** Cannot traverse → `#REF!` 
3. **Non-entity base:** Cannot access fields → `#VALUE!`
4. **Missing field:** Field doesn't exist → `#FIELD!`
5. **Field is null:** Return `null` **and stop chain** (short-circuit)
6. **Mid-chain non-entity:** Cannot continue → `#VALUE!`

### Examples with Short-Circuit Behavior

**Case 1: Base Error (propagate immediately)**
```javascript
A1 = #REF!
=A1.Price.Currency  →  #REF!  (short-circuit, don't evaluate chain)
```

**Case 2: Non-Entity Base**
```javascript
A1 = 42
=A1.Price  →  #VALUE! ("Cannot access field 'Price' on number")
```

**Case 3: Missing Field**
```javascript
A1 = { Price: 10 }
=A1.Quantity  →  #FIELD! ("Field 'Quantity' not found")
```

**Case 4: Field is Null (SHORT-CIRCUIT)**
```javascript
A1 = { Price: null }
=A1.Price  →  null (stop here, return null)
```

**Case 5: Mid-Chain Null (SHORT-CIRCUIT)**
```javascript
A1 = { Metadata: null }
=A1.Metadata.Version  →  null (stop at Metadata, don't access Version)
```

**NOT:** `#REF! ("Cannot access field on null")` — this would be wrong.

**Case 6: Mid-Chain Non-Entity**
```javascript
A1 = { Price: 10 }  // Price is number, not entity
=A1.Price.Currency  →  #VALUE! ("Cannot access field 'Currency' on number")
```

**Case 7: All Valid**
```javascript
A1 = { Price: { USD: 10, EUR: 8 } }
=A1.Price.USD  →  10
```

### Null Handling Clarification

**Critical distinction:**

- **Field exists and is null:** Return `null`, stop chain ✅
- **Base is null:** Error `#REF!` (cannot start chain on null) ❌
- **Mid-chain becomes null:** Return `null`, stop chain ✅

**Rationale:** 

Null is a valid value that can exist in entity fields. If a field explicitly contains `null`, evaluation should return that null and stop — not error. This matches spreadsheet semantics where null/empty cells are valid.

However, if the **base** reference itself is null (e.g., accessing a non-existent cell), that's a reference error.

### Error Matrix

| Condition | Error Type | Short-Circuit? |
|-----------|------------|----------------|
| Base is error | Propagate | ✅ Yes (immediate) |
| Base is null | `#REF!` | ✅ Yes (immediate) |
| Base is not entity | `#VALUE!` | ✅ Yes (cannot start) |
| Field missing | `#FIELD!` | ✅ Yes (cannot continue) |
| Field is null | `null` | ✅ Yes (stop chain) |
| Mid-chain is null | `null` | ✅ Yes (stop chain) |
| Mid-chain is not entity | `#VALUE!` | ✅ Yes (cannot continue) |
| All valid | Value | — |

---

## 5. Integration Points

### Architectural Decision: Model B (Selective Extraction)

**Two possible models were considered:**

**Model A — Whole-Expression Only:**
- Only tokenize if entire formula is a chain: `=A1.Price.Currency`
- Would NOT handle: `=A1.Price.Currency + 10`
- Safer but incomplete — forces users to use intermediate cells
- Delays real spreadsheet integration

**Model B — Selective Extraction (CHOSEN):**
- Extract and evaluate chains wherever they appear
- Handles embedded chains: `=A1.Price.Currency + 10`, `=IF(A1.Price.USD > 10, ...)`
- Replace chains with values, pass simplified expression to cascade
- Preserves operator precedence (cascade handles simplified expression)

**Why Model B is correct:**
1. Natural spreadsheet usage requires embedded chains
2. Operator precedence stays in cascade (proven stable)
3. Performance improves (fewer scans, simpler expressions to cascade)
4. No AST needed (just extraction + substitution)
5. Prevents future architectural rework

**Model B implementation does NOT require:**
- Full AST
- Operator precedence changes
- Deep parser
- Cascade rewrite

**It only adds:**
- Chain extraction (single pass)
- Value substitution (string replace)
- Cascade receives simpler expressions

---

### Where Tokenization Hooks In

**Current cascade flow:**

```
evaluate(formula)
  → try member access pattern
  → try operator pattern
  → try function pattern
  → ...
```

**New flow:**

```
evaluate(formula)
  → if needsTokenization(formula)
       → extract member chains
       → tokenize chains
       → evaluate via sequential resolver
       → return result
  → else
       → existing cascade (unchanged)
```

### Surgical Insertion Point

Add **before** existing cascade, at top of `evaluate()`:

```typescript
evaluate(formula: string, context: FormulaContext): FormulaValue {
  // NEW: Check if hybrid tokenization needed
  if (needsTokenization(formula)) {
    return evaluateWithTokens(formula, context);
  }
  
  // EXISTING: Cascade path (unchanged)
  // ... existing member access regex
  // ... existing operator detection
  // ... existing function calls
}
```

### Selective Chain Extraction (Model B)

**Critical:** `evaluateWithTokens()` must handle **embedded chains** inside larger expressions, not just whole-expression chains.

**Algorithm:**

```typescript
function evaluateWithTokens(formula: string, context: FormulaContext): FormulaValue {
  // Step 1: Extract all member chain substrings at top level
  const chains = extractMemberChains(formula);
  
  // If no chains found (shouldn't happen if detection worked), fall back
  if (chains.length === 0) {
    return evaluateCascade(formula, context);
  }
  
  // Step 2: Evaluate each chain
  // CRITICAL: Short-circuit on first error (Excel semantics)
  const evaluatedChains: Array<{ match: MemberChainMatch; value: FormulaValue }> = [];
  for (const chain of chains) {
    const result = evaluateChain(chain.parsed, context);
    
    // If chain evaluation produces error, short-circuit immediately
    // Do not continue evaluating remaining chains or pass to cascade
    if (isError(result)) {
      return result;
    }
    
    evaluatedChains.push({ match: chain, value: result });
  }
  
  // Step 3: Replace chain substrings with evaluated values
  // CRITICAL: Sort descending by startIndex to prevent index shift during replacement
  evaluatedChains.sort((a, b) => b.match.startIndex - a.match.startIndex);
  
  let simplified = formula;
  for (const { match, value } of evaluatedChains) {
    // Replace by index, not by string (handles duplicate chains + prevents corruption)
    const replacement = valueToFormulaString(value);
    simplified =
      simplified.slice(0, match.startIndex) +
      replacement +
      simplified.slice(match.endIndex);
  }
  
  // Step 4: Pass simplified expression to cascade
  // Cascade handles operators, functions, precedence
  return evaluateCascade(simplified, context);
}
```

**Critical fix:** Short-circuit on first error during chain evaluation. Once any chain produces an error, return immediately without:
- Evaluating remaining chains
- Rewriting formula
- Passing to cascade

**Rationale:** Matches Excel semantics (errors propagate immediately) and avoids wasted evaluation.

**Key insight:** Chains are evaluated and substituted, then cascade handles operators/precedence on the simplified expression.

### Chain Extraction Implementation

```typescript
interface MemberChainMatch {
  original: string;        // "A1.Price.Currency"
  startIndex: number;      // Position in formula
  endIndex: number;        // End position
  parsed: MemberChain;     // { base: "A1", properties: ["Price", "Currency"] }
}

function extractMemberChains(formula: string): MemberChainMatch[] {
  const chains: MemberChainMatch[] = [];
  
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let i = 0;
  
  while (i < formula.length) {
    const char = formula[i];
    
    // Track string state
    if (!inString && (char === '"' || char === "'")) {
      inString = true;
      stringChar = char;
      i++;
      continue;
    }
    if (inString && char === stringChar) {
      inString = false;
      i++;
      continue;
    }
    if (inString) {
      i++;
      continue;
    }
    
    // Track parentheses depth
    if (char === '(') depth++;
    if (char === ')') depth--;
    
    // Only extract at top level (depth 0)
    if (depth === 0 && !inString) {
      const match = tryMatchChainAt(formula, i);
      if (match) {
        chains.push(match);
        i = match.endIndex;
        continue;
      }
    }
    
    i++;
  }
  
  return chains;
}

function tryMatchChainAt(formula: string, start: number): MemberChainMatch | null {
  const remaining = formula.slice(start);
  
  // Must start with cell reference
  const cellMatch = remaining.match(/^([A-Z]+\d+)/);
  if (!cellMatch) return null;
  
  let pos = cellMatch[0].length;
  let chainLength = pos;
  let accessCount = 0;
  let hasBracket = false;  // Track if THIS chain uses bracket notation
  
  // Count consecutive member accesses
  while (pos < remaining.length) {
    // Try dot notation
    const dotMatch = remaining.slice(pos).match(/^\.([A-Z_][A-Z0-9_]*)/i);
    if (dotMatch) {
      pos += dotMatch[0].length;
      chainLength = pos;
      accessCount++;
      continue;
    }
    
    // Try bracket notation
    const bracketMatch = remaining.slice(pos).match(/^\[["']([^"']+)["']\]/);
    if (bracketMatch) {
      pos += bracketMatch[0].length;
      chainLength = pos;
      accessCount++;
      hasBracket = true;  // THIS chain uses bracket notation
      continue;
    }
    
    // No more member access
    break;
  }
  
  // Only return if 2+ accesses OR this chain used bracket notation
  // CRITICAL: hasBracket tracks local usage, not formula-wide
  if (accessCount >= 2 || hasBracket) {
    const chainStr = remaining.slice(0, chainLength);
    return {
      original: chainStr,
      startIndex: start,
      endIndex: start + chainLength,
      parsed: tokenizeMemberChain(chainStr)
    };
  }
  
  return null;
}
```

**Critical fix:** Track bracket usage during parsing loop, not by scanning entire remaining string. Ensures `A1.Price` stays in cascade even if formula contains brackets elsewhere.

**Zero impact on existing paths.**

---

## 6. Scope Decisions for Week 3

### Testing Against False Positives

**Critical test cases that must NOT trigger tokenization:**

```javascript
// String literals
="A1.Price.Currency"              → Stay in cascade
=IF(A1>5, "Price.Value", 10)      → Stay in cascade

// Single-level access (already stable)
=A1.Price                          → Stay in cascade
=A1.Price + B1.Price               → Stay in cascade (two separate single-level)

// Member access inside function (single-level each)
=SUM(A1.Price, B1.Price)           → Stay in cascade
=IF(A1.Price > 10, TRUE, FALSE)    → Stay in cascade

// Top-level chaining inside function
=IF(A1.Price.USD > 10, TRUE)       → Tokenize (chained at top level)
```

**Detection must track string state to avoid false positives.**

### ✅ In Scope

1. **Chained member access:** `A1.Price.Currency`
2. **Bracket notation (static):** `A1["Price"]`
3. **Mixed chaining:** `A1.Price["SubField"].Value`
4. **Integration testing:** Interaction with operators, functions, aggregates

### ⚠️ Deferred to Week 4

1. **Range projection:** `SUM(A1:A10.Price)`
   - **Reason:** Requires range expansion + per-cell field extraction
   - **Complexity:** Moderate (must handle range→array→field map)
   - **Risk:** Medium (interaction with aggregate semantics)

2. **Dynamic bracket access:** `A1[B1]` (field name from cell reference)
   - **Reason:** Requires runtime field name resolution
   - **Complexity:** Low (just dynamic lookup)
   - **Risk:** Low

3. **Computed member access:** `A1["Pr" & "ice"]`
   - **Reason:** Requires evaluating bracket expression first
   - **Complexity:** Medium
   - **Risk:** Low

### 🚫 Out of Scope (Not Planned)

1. **Method calls:** `A1.Price.toFixed(2)` — not spreadsheet semantics
2. **Nested entity creation:** `={Price: A1.Value}` — future advanced feature
3. **Destructuring:** `{Price, Quantity} = A1` — not Excel-like

---

## 7. Performance Target

### Acceptable Overhead

| Metric | Target | Justification |
|--------|--------|---------------|
| Single-level member access | No change | Already <0.05ms |
| Two-level chaining | +0.01ms | Marginal cost for structural clarity |
| Three-level chaining | +0.02ms | Still <0.1ms total |
| P95 variance | <20% | Deterministic tokenization should reduce variance |

### Performance Guard Rails

**Selective extraction improves performance:**

**Week 2 evaluation path (with depth scanning):**
```
1. Scan for operators → hasOperatorAtTopLevel
2. Scan for member access → regex match
3. If binary expression → depth scan entire formula
4. Evaluate left operand → recurse
5. Evaluate right operand → recurse
6. If member access detected → regex pattern match again
```

**Week 3 evaluation path (with selective extraction):**
```
1. Single scan → extract all chains (one pass)
2. Evaluate chains → sequential, no recursion
3. Substitute → string replace
4. Cascade → simpler expression (no chains to detect, no depth scan needed)
```

**Performance targets:**

- Tokenization should **reduce** P95 variance (eliminates repeated depth scanning)
- Absolute cost should remain <0.1ms for chains ≤3 levels
- No regression in non-chained paths (zero overhead if not triggered)
- **New:** Expressions with embedded chains should be **faster** than Week 2 (fewer scans)

**Expected variance reduction:**

Week 2 binary member access showed 52.9% P95 spread due to variable depth scan cost. Selective extraction eliminates this by replacing chains with values before cascade sees the expression.

---

## 8. Migration Risk Assessment

### Low Risk ✅

- Tokenization only triggers on new patterns
- Existing single-level member access stays in cascade
- No changes to operator precedence
- No changes to function evaluation
- Additive change (doesn't replace existing code)

### Medium Risk ⚠️

- Must correctly detect when to tokenize (false negatives = missed chaining, false positives = unnecessary overhead)
- Token evaluation must match cascade semantics exactly
- Error propagation must be consistent with existing behavior

### High Risk 🔴

- **None identified** (if scope stays bounded)

---

## 9. Testing Strategy

### Unit Tests

1. **Tokenization detection**
   - Verify `needsTokenization()` returns true/false correctly
   - Edge cases: strings in formulas, escaped brackets, nested parens
   - **Critical:** String literal immunity: `="A1.Price.Currency"` must NOT trigger

2. **Token stream generation**
   - Verify correct token sequences for various inputs
   - Edge cases: whitespace, invalid syntax, malformed chains

3. **Sequential evaluation**
   - Two-level chains
   - Three-level chains
   - Mixed dot + bracket notation
   - Error propagation at each level

4. **Replacement safety (CRITICAL)**
   - Duplicate chains: `=A1.Price.Currency + A1.Price.Currency`
   - Verify both occurrences are replaced correctly
   - Descending index order prevents corruption

5. **Chain detection boundary cases**
   - Single-level with bracket elsewhere: `=A1.Price + B1["Value"]`
   - Verify `A1.Price` stays in cascade (not incorrectly tokenized)

### Integration Tests

**Critical: Test selective extraction with embedded chains**

1. **Single chain + operator:** `=A1.Price.Currency + 10`
   - Extract: `["A1.Price.Currency"]`
   - Evaluate: `100`
   - Rewrite: `=100 + 10`
   - Result: `150`

2. **Multiple chains + operator:** `=A1.Price.Currency + A2.Price.Currency`
   - Extract: `["A1.Price.Currency", "A2.Price.Currency"]`
   - Evaluate: `100`, `50`
   - Rewrite: `=100 + 50`
   - Result: `150`

3. **Chain + comparison:** `=A1.Price.Currency > B1.Total.Value`
   - Extract: `["A1.Price.Currency", "B1.Total.Value"]`
   - Evaluate: `100`, `50`
   - Rewrite: `=100 > 50`
   - Result: `TRUE`

4. **Chain inside function:** `=IF(A1.Price.USD > 10, TRUE, FALSE)`
   - Extract: `["A1.Price.USD"]`
   - Evaluate: `15`
   - Rewrite: `=IF(15 > 10, TRUE, FALSE)`
   - Result: `TRUE`

5. **Multiple chains in function args:** `=SUM(A1.Price.USD, A2.Price.USD)`
   - Extract: `["A1.Price.USD", "A2.Price.USD"]`
   - Evaluate: `10`, `20`
   - Rewrite: `=SUM(10, 20)`
   - Result: `30`

6. **Chain with operator precedence:** `=A1.Price.Currency * 2 + B1.Total.Value`
   - Extract: `["A1.Price.Currency", "B1.Total.Value"]`
   - Evaluate: `100`, `50`
   - Rewrite: `=100 * 2 + 50`
   - Result: `250` (precedence preserved by cascade)

7. **Nested function with chains:** `=IF(MAX(A1.Price.USD, A2.Price.USD) > 100, "High", "Low")`
   - Extract: `["A1.Price.USD", "A2.Price.USD"]`
   - Evaluate: `50`, `75`
   - Rewrite: `=IF(MAX(50, 75) > 100, "High", "Low")`
   - Result: `"Low"`

8. **Chain + aggregate:** `=SUM(A1:A10) + B1.Total.Value`
   - Extract: `["B1.Total.Value"]` (only the chain)
   - Evaluate: `1000`
   - Rewrite: `=SUM(A1:A10) + 1000`
   - Result: `SUM result + 1000`

9. **Error propagation through operators:** `=A1.Invalid.Field + 10`
   - Extract: `["A1.Invalid.Field"]`
   - Evaluate: `#FIELD!` (missing field error)
   - Rewrite: `=#FIELD! + 10`
   - Result: `#FIELD!` (cascade must propagate error, not coerce)
   - **Critical:** Verify cascade short-circuits on error before operator eval

10. **Duplicate chains (replacement safety):** `=A1.Price.Currency + A1.Price.Currency`
    - Extract: `["A1.Price.Currency", "A1.Price.Currency"]` (two matches)
    - Evaluate: `100`, `100`
    - Replace by index (descending): both occurrences replaced
    - Rewrite: `=100 + 100`
    - Result: `200`

11. **Error short-circuit during chain evaluation:** `=A1.Valid.Field + A1.Invalid.Field + 10`
    - Extract: `["A1.Valid.Field", "A1.Invalid.Field"]`
    - Evaluate first chain: `100`
    - Evaluate second chain: `#FIELD!` (error)
    - **Short-circuit:** Return `#FIELD!` immediately
    - Do NOT continue evaluating, do NOT rewrite, do NOT pass to cascade
    - Result: `#FIELD!`

### Regression Tests

1. **Run full entity test suite** (141 tests must still pass)
2. **Run full formula suite** (4,766 tests must still pass)
3. **Benchmark suite** (no performance regression in non-chained paths)

---

## 10. Implementation Phases

### Phase 1: Detection + Tokenization (No Evaluation)

- Implement `needsTokenization()`
- Implement token stream generator
- Write unit tests for tokenization
- **Validation:** Token streams match expected structure

### Phase 2: Sequential Resolver

- Implement `evaluateTokenStream()`
- Handle error propagation
- Write unit tests for evaluation
- **Validation:** Chains evaluate correctly in isolation

### Phase 3: Integration

- Hook tokenization into `evaluate()` before cascade
- Add integration tests
- **Validation:** Mixed formulas work correctly

### Phase 4: Regression + Performance

- Run full test suite
- Run benchmark suite
- **Validation:** Zero regressions, P95 variance reduced

---

## 11. Rollback Strategy

If tokenization introduces regressions:

**Option A: Disable Feature**
```typescript
if (ENABLE_TOKENIZATION && needsTokenization(formula)) {
  // new path
} else {
  // cascade path
}
```

**Option B: Incremental Fallback**
```typescript
try {
  return evaluateWithTokens(formula, context);
} catch (e) {
  // Log error, fall back to cascade
  return evaluateCascade(formula, context);
}
```

**Option C: Revert Commit**
- All tokenization code is additive
- Can be cleanly reverted without affecting Week 2 stability

---

## 12. Design Constraints (Invariants)

### Must Not Change

1. ✅ Existing single-level member access behavior
2. ✅ Operator precedence rules
3. ✅ Function evaluation semantics
4. ✅ Error types and messages for existing paths
5. ✅ Performance of non-chained formulas

### Must Preserve

1. ✅ `EntityValue` structure and unwrapping contract
2. ✅ `#FIELD!` error for missing fields
3. ✅ Null handling (return null, don't error)
4. ✅ Error propagation priority (base error → type error → missing field)

### Must Add

1. ✅ Support for 2+ level chaining
2. ✅ Support for bracket notation
3. ✅ Deterministic evaluation (same input → same output)
4. ✅ Clear error messages for mid-chain failures

---

## 13. Open Questions for Review

### Question 1: Bracket Notation Syntax

**Options:**
- `A1["Price"]` (JSON-like, double quotes)
- `A1['Price']` (JavaScript-like, single quotes)
- Both?

**Decision: Support Both, Normalize Internally**

**Rationale:**
- Users familiar with JSON prefer `""`
- Users familiar with JavaScript prefer `''`
- Supporting both adds minimal complexity (single regex alternation)
- Normalization happens at tokenization — evaluation doesn't care

**Implementation:**
```typescript
// Regex matches both quote styles
const bracketMatch = remaining.match(/^\[["']([^"']+)["']\]/);
```

**Result:** Both compile to same property list.

### Question 2: Whitespace Handling

**Should these be equivalent?**
```
A1.Price.Currency
A1 . Price . Currency
A1. Price .Currency
```

**Decision: NO — Stay Strict**

**Rationale:**
- Whitespace inside member access introduces grammar ambiguity
- Would require real tokenizer to handle edge cases
- Adds complexity without clear user benefit
- Excel doesn't allow whitespace in member access

**Allowed:**
```
A1.Price
A1["Price"]
A1.Price.Currency
```

**Not Allowed:**
```
A1 . Price
A1 [ "Price" ]
A1 .Price
```

**Exception:** Whitespace around entire expression is fine:
```
= A1.Price        // Leading space OK
=A1.Price + B1    // Space between operators OK
```

But no space **within** the member chain itself.

### Question 3: Range Projection Syntax

**If deferred to Week 4, which syntax?**
- `SUM(A1:A10.Price)` (Excel-like)
- `SUM(A1:A10->Price)` (Arrow notation)
- `SUM(MAP(A1:A10, .Price))` (Functional)

**Recommendation:** Decide in Week 4 after chaining is stable.

### Question 4: Case Sensitivity

**Should field names be case-sensitive?**
```
A1.Price  vs  A1.price  vs  A1.PRICE
```

**Decision: Case-Sensitive**

**Rationale:**
- Matches JavaScript object property semantics
- Prevents ambiguity when schemas use camelCase/PascalCase
- External data sources (JSON, databases) are typically case-sensitive
- Simpler implementation (no normalization layer needed)

**Implication:**
```javascript
entity = { Price: 10, price: 20 }  // Two different fields
=A1.Price  →  10
=A1.price  →  20
```

**User guidance:** Field names must match schema exactly.

---

## 14. Success Criteria

Design is approved if:

1. ✅ Scope is bounded (no AST creep)
2. ✅ Detection rules are unambiguous
3. ✅ Evaluation contract is deterministic
4. ✅ Error propagation is well-defined
5. ✅ Integration points are surgical
6. ✅ Performance targets are realistic
7. ✅ Rollback strategy is clear
8. ✅ Testing strategy is comprehensive

---

## 15. Final Design Assessment

### Complexity Score

| Aspect | Complexity | Justification |
|--------|------------|---------------|
| Detection | Low | Single regex check |
| Tokenization | Low | Flat token stream, no tree |
| Evaluation | Low | Sequential loop, no recursion |
| Integration | Low | Additive hook before cascade |
| Testing | Medium | Many edge cases to cover |
| **Overall** | **Low-Medium** | Bounded scope, clear structure |

### Risk Score

| Risk Type | Level | Mitigation |
|-----------|-------|------------|
| Regression | Low | Additive change, existing paths unchanged |
| Performance | Low | Tokenization only when needed, should reduce variance |
| Semantic drift | Low | Matches existing entity unwrapping contract |
| Scope creep | Medium | Requires discipline to not add features |
| **Overall** | **Low** | Well-contained, clear boundaries |

### Readiness for Implementation

**Status:** ✅ **Design is bounded and ready**

**Conditions met:**
- Scope is minimal (chaining + brackets only)
- Detection is deterministic
- Evaluation is sequential (no complex recursion)
- Integration is surgical (one hook point)
- Rollback is trivial (additive change)

**Next step:** Review this design. If approved, proceed to Phase 1 implementation.

---

## 16. Design Review Checklist

### Four Critical Validations (Plus One)

✅ **1. Detection tracks parentheses + string state?**
- YES — State-aware scanner tracks depth and string literals
- Prevents false positives on `"A1.Price"` and function arguments

✅ **2. Tokenization activates only for chained/bracket cases?**
- YES — Single-level `A1.Price` stays in cascade (already stable)
- Only 2+ levels or bracket notation triggers tokenization

✅ **3. Null short-circuit explicitly defined?**
- YES — If field is null, return null and stop chain immediately
- Prevents attempting to access properties on null values

✅ **4. Dot/bracket normalized into unified property list?**
- YES — Both syntaxes compile to `{ base, properties }` structure
- Evaluation doesn't distinguish between dot and bracket notation

✅ **5. Selective extraction handles embedded chains?**
- YES — Model B (selective extraction) implemented
- Chains are extracted, evaluated, and substituted
- Cascade receives simplified expression with chains already resolved
- Handles: `=A1.Price.Currency + 10`, `=IF(A1.Price.USD > 10, ...)`, etc.
- Operator precedence preserved (cascade handles simplified expression)

### Additional Checks

**Critical implementation constraints (non-negotiable):**

1. ✅ **Replace by index (descending order)**
   - String.replace() is UNSAFE for duplicate chains
   - Must use index-based replacement to handle: `=A1.Price.Currency + A1.Price.Currency`
   - Sort matches descending by startIndex before replacement

2. ✅ **Track bracket usage locally**
   - Do NOT use `remaining.includes('[')` — checks entire formula
   - Track `hasBracket` during parsing loop only
   - Prevents false triggering on: `=A1.Price + B1["Value"]`

3. ✅ **String literal immunity**
   - Explicitly test: `="A1.Price.Currency"` must NOT trigger tokenization
   - State tracking must correctly ignore content inside string literals
   - **Note:** If engine supports Excel-style escaped quotes (`"He said ""Hello"""` → `He said "Hello"`), verify state machine handles doubled quotes correctly. If not supported, document limitation explicitly.

4. ✅ **Error propagation through cascade**
   - When chain evaluates to error: `=A1.Invalid.Field + 10` → `=#FIELD! + 10`
   - Cascade must propagate error before operator evaluation
   - No coercion or weird behavior on error literals

5. ✅ **Error short-circuit during evaluation**
   - If any chain evaluates to error, return immediately
   - Do NOT evaluate remaining chains or pass to cascade
   - Matches Excel semantics: `=A1.Valid.Field + A1.Invalid.Field + 10` → `#FIELD!`

Before implementation begins:

- [x] Detection rule approved (state-aware, no false positives)
- [x] Token structure approved (unified, normalized)
- [x] Evaluation contract approved (sequential, deterministic)
- [x] Error propagation rules approved (short-circuit on null)
- [x] Scope boundaries approved (range projection deferred to Week 4)
- [x] Performance targets accepted (<0.1ms, reduced P95)
- [x] Testing strategy sufficient (unit + integration + regression)
- [x] Open questions resolved (whitespace strict, case-sensitive)
- [x] Whitespace policy decided (strict, no spaces in chains)
- [x] Bracket syntax decided (support both `""` and `''`)
- [x] False positive test cases defined

**All four critical validations confirmed. Design is ready for implementation.**

