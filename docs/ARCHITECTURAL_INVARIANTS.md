# Architectural Invariants - Conditional Formatting Engine

**Version**: 1.0.0 (Phase 3.5)  
**Date**: February 7, 2026  
**Status**: 🔒 SACRED RULES - Violations = Architecture Regression

---

## 🎯 Purpose

These are the **immutable laws** of the Conditional Formatting Engine. They define what the engine IS and what it is NOT. Violating these invariants will cause:
- Performance degradation
- Maintenance nightmare
- Integration failures
- Future extensibility blockers

**Each invariant has enforcement mechanisms to prevent accidental violations.**

---

## 1️⃣ Engine Owns Cache

### The Rule
**The ConditionalFormattingEngine class owns the StatisticalCacheManager instance.**

### What This Means
```typescript
// ✅ CORRECT: Engine owns cache
export class ConditionalFormattingEngine {
    private statisticalCache: StatisticalCacheManager; // Owned by engine
    
    constructor() {
        this.statisticalCache = new StatisticalCacheManager();
    }
}

// ❌ WRONG: Rule owns cache
class TopBottomRule {
    private cache: StatisticalCacheManager; // Violates invariant
}

// ❌ WRONG: Global singleton cache
const globalCache = new StatisticalCacheManager(); // Violates encapsulation
```

### Why This Matters
- **Single Source of Truth**: One cache per engine instance
- **Clear Lifecycle**: Cache lives with engine, dies with engine
- **Test Isolation**: Each test can create new engine with fresh cache
- **No Hidden State**: Cache is not global, not in rules

### Enforcement
```typescript
// Code review checklist:
// ✅ StatisticalCacheManager only appears in ConditionalFormattingEngine
// ✅ No cache instances in rule type definitions
// ✅ No global cache variables
```

---

## 2️⃣ Rules Are Pure Evaluators

### The Rule
**Rules are pure data structures. They have NO methods, NO state, NO logic.**

### What This Means
```typescript
// ✅ CORRECT: Rule is pure data
export type TopBottomRule = RuleBase & {
    type: 'top-bottom';
    mode: 'top' | 'bottom';
    rank: number;
    rankType: 'number' | 'percent';
    style: ConditionalStyle;
};

// ❌ WRONG: Rule has methods
export class TopBottomRule {
    evaluate(value: number): boolean { ... } // Violates invariant
    private computeThreshold(): number { ... } // Violates invariant
}

// ❌ WRONG: Rule has mutable state
export type TopBottomRule = {
    cachedThreshold: number; // Violates invariant - rules are immutable
}
```

### Why This Matters
- **Serializable**: Rules can be JSON.stringify() for storage/transfer
- **Immutable**: No hidden state mutations during evaluation
- **Testable**: Rules are just data, easy to construct in tests
- **Predictable**: Same rule + same value = same result (no side effects)

### Enforcement
```typescript
// Code review checklist:
// ✅ All rules are `type` definitions, not `class` or `interface`
// ✅ No methods in rule definitions
// ✅ No mutable fields (no `let`, only `readonly` implicitly via `type`)
// ✅ Rules extend RuleBase only (common fields)
```

---

## 3️⃣ Cache Has Zero CF Semantic Knowledge

### The Rule
**StatisticalCacheManager knows about ranges and statistics, NOT about conditional formatting rules.**

### What This Means
```typescript
// ✅ CORRECT: Cache only knows statistics
class StatisticalCacheManager {
    getTopBottomStats(
        rule: TopBottomRule, // Only extracts mode, rank, rankType
        ranges: Range[],
        getValue: (addr: Address) => CellValue
    ): TopBottomCache { ... }
}

// ❌ WRONG: Cache knows about CF concepts
class StatisticalCacheManager {
    applyRuleToCell(value: CellValue, rule: ConditionalFormattingRule) { ... } // Violates invariant
    shouldMatchDuplicate(value: CellValue, style: ConditionalStyle) { ... } // Violates invariant
}

// ❌ WRONG: Cache depends on CF types
import { ConditionalFormattingResult } from './ConditionalFormattingEngine';
class StatisticalCacheManager {
    cache: Map<string, ConditionalFormattingResult>; // Violates invariant
}
```

### Why This Matters
- **Reusability**: Cache could be extracted to separate package if needed
- **Single Responsibility**: Cache computes stats, engine applies rules
- **Testability**: Cache can be tested without CF knowledge
- **Maintainability**: Changes to CF rules don't affect cache logic

### Enforcement
```typescript
// Code review checklist:
// ✅ StatisticalCacheManager imports only: Range, Address, CellValue, Rule types
// ❌ StatisticalCacheManager must NOT import: ConditionalFormattingResult, ConditionalStyle
// ✅ Cache methods return statistical data (numbers, sets, thresholds)
// ❌ Cache methods must NOT return CF results or apply styles
```

---

## 4️⃣ Engine Remains Stateless Per Evaluation

### The Rule
**Each call to `applyRules()` is independent. No hidden state carries over between calls.**

### What This Means
```typescript
// ✅ CORRECT: Stateless evaluation
const result1 = engine.applyRules(100, rules, ctx1); // Independent
const result2 = engine.applyRules(200, rules, ctx2); // Independent
// result2 is NOT affected by result1

// ❌ WRONG: Stateful evaluation
let lastValue: number; // Violates invariant - leaked state
function applyRules(value: number, ...) {
    const delta = value - lastValue; // Depends on previous call
    lastValue = value; // Mutates shared state
}
```

### Exception: Cache is Shared State (By Design)
```typescript
// ✅ ACCEPTABLE: Cache is intentionally shared across calls
const result1 = engine.applyRules(100, rules, ctx); // Populates cache
const result2 = engine.applyRules(200, rules, ctx); // Reuses cache (99% hit rate)

// Cache is the ONLY shared state, and it's:
// - Transparent (doesn't change rule semantics)
// - Controllable (clearCache() for invalidation)
// - Observable (getCacheStats() for monitoring)
```

### Why This Matters
- **Predictability**: Same inputs = same outputs (except cache performance)
- **Parallelizable**: (Future) Could evaluate cells in parallel with per-thread engines
- **Debuggable**: No hidden dependencies between evaluations
- **Testable**: Each test can call applyRules independently

### Enforcement
```typescript
// Code review checklist:
// ✅ No `private` mutable fields in engine (except statisticalCache)
// ✅ No `this.lastResult` or similar fields
// ❌ No fields prefixed with last*, previous*, current* (stateful naming)
// ✅ applyRules() signature has no side-effect warnings
// ✅ All state is passed via parameters (value, rules, ctx, options)
```

---

## 5️⃣ Renderer Owns Manual Styles

### The Rule
**The engine outputs `ConditionalFormattingResult`. The renderer decides how to merge with manual styles.**

### What This Means
```typescript
// ✅ CORRECT: Engine outputs CF result only
interface ConditionalFormattingResult {
    style?: ConditionalStyle;
    dataBar?: DataBarRender;
    icon?: IconRender;
    appliedRuleIds: string[];
}

// Renderer decides merge strategy:
const finalStyle = mergeStyles(cell.manualStyle, cfResult.style); // Renderer's job

// ❌ WRONG: Engine merges manual styles
function applyRules(value: CellValue, rules: ConditionalFormattingRule[], manualStyle: CellStyle) {
    const cfStyle = ...;
    return { ...manualStyle, ...cfStyle }; // Violates invariant
}
```

### Why This Matters
- **Separation of Concerns**: Engine computes, renderer displays
- **Flexibility**: Different renderers can have different merge strategies
- **Performance**: Engine doesn't need to know about manual styles (faster)
- **Simplicity**: Engine has one job: evaluate rules

### Enforcement
```typescript
// Code review checklist:
// ✅ applyRules() signature has NO manualStyle parameter
// ✅ ConditionalFormattingResult has NO manualStyle field
// ✅ Engine returns pure CF result, no style merging code
// ❌ Engine must NOT import or depend on renderer types
```

---

## 6️⃣ stopIfTrue Semantics Are Behavior-Locked

### The Rule
**stopIfTrue terminates rule evaluation immediately after the FIRST matching rule. This behavior is FROZEN.**

### What This Means
```typescript
// ✅ CORRECT: Locked behavior
for (const rule of sorted) {
    const { matched, style } = this.applyRule(value, rule, ctx, options);
    if (!matched) continue;
    
    result.appliedRuleIds.push(rule.id ?? '');
    if (style) result.style = { ...result.style, ...style };
    
    if (rule.stopIfTrue) break; // LOCKED: Must break immediately
}

// ❌ WRONG: Changed stopIfTrue semantics
if (rule.stopIfTrue && !rule.allowOverride) break; // NEW field violates lock
if (rule.stopIfTrue && matchCount > 3) break; // NEW condition violates lock
```

### Why This Matters
- **Excel Parity**: stopIfTrue behavior must match Excel exactly
- **User Expectations**: Users rely on this behavior for rule prioritization
- **Test Coverage**: 80 tests verify this behavior, changes break them all
- **Documentation**: Documented in Phase 3 tests, can't silently change

### Enforcement
```typescript
// Code review checklist:
// ✅ stopIfTrue check is simple: `if (rule.stopIfTrue) break;`
// ❌ No additional conditions around stopIfTrue
// ❌ No new fields like "stopIfTrueUnless" or "stopIfTrueMode"
// ✅ Test: "should stop evaluation after statistical rule matches with stopIfTrue" passes
```

---

## 7️⃣ No Implicit Rule Coupling

### The Rule
**Rules must not depend on the existence or order of other rules. All interactions happen only via engine orchestration.**

### What This Means
```typescript
// ✅ CORRECT: Rules are independent
const topBottomRule: TopBottomRule = {
    type: 'top-bottom',
    mode: 'top',
    rank: 10,
    style: { backgroundColor: 'red' }
    // Rule defines ONLY its own behavior
};

const aboveAverageRule: AboveAverageRule = {
    type: 'above-average',
    mode: 'above',
    style: { backgroundColor: 'green' }
    // This rule knows NOTHING about topBottomRule
};

// ❌ WRONG: Rule depends on other rule
const dependentRule = {
    type: 'top-bottom',
    mode: 'top',
    rank: 10,
    skipIfRuleApplied: 'above-average-rule-id', // Violates invariant
    style: { backgroundColor: 'red' }
};

// ❌ WRONG: Rule checks other rules
const coupledRule = {
    type: 'formula',
    expression: '=IF(HAS_RULE_APPLIED("rule-123"), TRUE, FALSE)', // Violates invariant
    style: { backgroundColor: 'blue' }
};
```

### Why This Matters
- **Composability**: Rules can be added/removed independently
- **Testability**: Each rule can be tested in isolation
- **Maintainability**: No cascading failures when rules change
- **Phase 4 Readiness**: Icon Sets + Data Bars won't create rule-to-rule dependencies

### How Interaction Happens (Via Engine)
```typescript
// ✅ CORRECT: Engine orchestrates interaction
for (const rule of sorted) {
    const { matched, style } = this.applyRule(value, rule, ctx, options);
    if (!matched) continue;
    
    result.appliedRuleIds.push(rule.id ?? ''); // Track applied rules
    if (style) result.style = { ...result.style, ...style };
    
    if (rule.stopIfTrue) break; // Engine controls termination
}

// Engine decides:
// - Rule order (via sorting)
// - Rule termination (via stopIfTrue)
// - Style merging (last rule wins for each property)

// Rules NEVER decide:
// - Which other rules should apply
// - Whether to skip based on other rules
// - How to merge with other rule styles
```

### Enforcement
```typescript
// Code review checklist:
// ✅ Rule type definitions have NO fields referencing other rules
// ✅ Rule evaluators receive NO appliedRules context
// ❌ No fields like "skipIfRuleApplied", "dependsOn", "afterRule"
// ❌ No rule evaluators checking result.appliedRuleIds
// ✅ All rule interaction happens in engine's applyRules() loop
```

### Future: Icon Sets & Data Bars
```typescript
// ✅ CORRECT: Independent rules
const iconSetRule: IconSetRule = {
    type: 'icon-set',
    iconSet: '3-arrows',
    style: { icon: 'up-arrow' }
    // No knowledge of other rules
};

const dataBarRule: DataBarRule = {
    type: 'data-bar',
    color: 'blue',
    style: { dataBar: { width: 0.5 } }
    // No knowledge of other rules
};

// Engine handles interaction:
// - Apply icon set
// - Apply data bar
// - Merge results
// Rules remain independent
```

---

## 🔐 Invariant Violation Consequences

If an invariant is violated, expect:

1. **Performance Regression**: O(n²) returns, cache hit ratio drops
2. **Test Failures**: 80+ Phase 3 tests fail, guardrails fail
3. **Integration Breakage**: Renderers can't use engine correctly
4. **Maintenance Hell**: Future devs can't understand engine behavior
5. **Security Issues**: (Future) Shared state = potential vulnerabilities

---

## 🧪 Invariant Verification

Run these checks before each PR:

```bash
# 1. All tests must pass (verifies behavioral invariants)
npm test

# 2. Performance guardrails must pass (verifies performance invariants)
npm test -- packages/core/__tests__/conditional-formatting-performance-guardrails.test.ts

# 3. TypeScript must compile (verifies structural invariants)
npx tsc --noEmit

# 4. Code review checklist (verifies architectural invariants)
# - Engine owns cache ✅
# - Rules are pure data ✅
# - Cache has zero CF knowledge ✅
# - Engine is stateless per eval ✅
# - Renderer owns manual styles ✅
# - stopIfTrue semantics unchanged ✅
```

---

## 📚 Invariant Rationale Document

For each invariant, we have:
- **What**: The rule itself
- **Why**: Business/technical reasons
- **How**: Enforcement mechanisms
- **Examples**: Correct vs incorrect code

**This document is the CONTRACT** between:
- Current devs and future devs
- Engine and renderers
- Implementation and tests

---

## 🚨 Emergency: Invariant Must Change

If an invariant MUST change (very rare):

1. **Justify**: Write 2-page document explaining why
2. **Impact Analysis**: List all affected code, tests, docs
3. **Migration Plan**: How to update renderers, tests, docs
4. **Approval**: Requires architecture review + CTO sign-off
5. **Version Bump**: Major version (v1 → v2)
6. **Deprecation**: Old behavior supported for 1 release cycle

**Example: If we need to change stopIfTrue semantics**:
- v1.x: Old behavior (current)
- v2.0.0-beta: New behavior + old behavior with deprecation warning
- v2.0.0: New behavior only
- Documentation: Migration guide + changelog

---

**Status**: 🔒 SACRED - These rules define the engine's identity
