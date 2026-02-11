# Cache Lifecycle - StatisticalCacheManager

**Version**: 1.0.0 (Phase 3.5)  
**Date**: February 7, 2026  
**Status**: 🔄 CRITICAL - Incorrect usage = performance catastrophe

---

## 🎯 Purpose

This document answers the **most dangerous questions** about the cache:
- ❓ When is the cache created?
- ❓ When is the cache reused?
- ❓ **When MUST I call `clearCache()`?**
- ❓ What happens if I forget to clear the cache?
- ❓ Is the cache thread-safe?

**Get this wrong = Silent data corruption or performance degradation.**

### 🔑 Golden Rule
**If something affects what values a rule sees, you MUST call `clearCache()`.**

This includes:
- ✅ Cell values change → `clearCache()`
- ✅ Rule parameters change → `clearCache()`
- ✅ Rule range changes → `clearCache()`
- ❌ Viewport scrolls → NO `clearCache()` (data unchanged)
- ❌ Selection changes → NO `clearCache()` (data unchanged)

---

## 1️⃣ Cache Creation

### When: Engine Instantiation
```typescript
const engine = new ConditionalFormattingEngine(); 
// ⬆️ Cache is created HERE, inside the constructor
```

### Lifespan: Tied to Engine Instance
```typescript
// Scenario A: Single global engine (typical)
const globalEngine = new ConditionalFormattingEngine();
// Cache lives for entire app lifetime
// ✅ GOOD for performance (maximum cache reuse)
// ⚠️ REQUIRES manual clearCache() on data changes

// Scenario B: Engine per evaluation (testing)
function testSomething() {
    const engine = new ConditionalFormattingEngine(); // Fresh cache
    // ... test logic ...
} // Engine + cache destroyed when function ends
// ✅ GOOD for isolation (no cache pollution)
// ⚠️ SLOW for production (no cache reuse)
```

### What's Inside at Creation
```typescript
// Internal state of new cache:
{
    topBottomCache: Map<string, TopBottomCache>(),    // Empty
    aboveAverageCache: Map<string, AboveAverageCache>(), // Empty
    duplicateUniqueCache: Map<string, DuplicateUniqueCache>(), // Empty
    hits: 0,
    misses: 0,
    size: 0
}
```

---

## 2️⃣ Cache Reuse (The Performance Win)

### When: Same Range + Same Rule Type = Cache Hit

```typescript
// First evaluation: CACHE MISS (0 → 1 cache entry)
const result1 = engine.applyRules(cellA1, rules, ctx);
// Cache populated: "A1:D10|top-bottom|top-10" → { sortedValues: [...], threshold: 50 }

// Second evaluation: CACHE HIT (reuses entry)
const result2 = engine.applyRules(cellB2, rules, ctx);
// Cache key matches: "A1:D10|top-bottom|top-10" → Retrieved in O(1)
// ✅ 99% faster (no range scan, no sorting)
```

### Cache Key Anatomy
```typescript
// Key format: `rangeSignature|ruleType|ruleParams`
"A1:D10|top-bottom|top-10"
"A1:D10|above-average|above-1stddev"
"A1:D10|duplicate-unique|duplicate"

// Components:
// - rangeSignature: Normalized range string (A1:D10)
// - ruleType: Statistical operation (top-bottom, above-average, etc.)
// - ruleParams: Rule-specific config (rank, mode, etc.)
```

### Cache Hit Conditions (ALL must be true)
1. ✅ Same range signature (A1:D10 = A1:D10)
2. ✅ Same rule type (top-bottom = top-bottom)
3. ✅ Same rule parameters (top-10 = top-10)
4. ✅ Cache not cleared since last evaluation
5. ✅ Data not modified since last evaluation

**If ANY condition fails → CACHE MISS → Full recomputation**

---

## 3️⃣ When to Call `clearCache()` (THE CRITICAL SECTION)

### ⚠️ Rule #1: Clear Cache on Any Data Change

```typescript
// User edits cell value
function onCellEdit(address: Address, newValue: CellValue) {
    sheet.setCellValue(address, newValue);
    engine.clearCache(); // ← REQUIRED: Cache is now stale
    rerender();
}

// User pastes range
function onPaste(range: Range, values: CellValue[][]) {
    sheet.pasteValues(range, values);
    engine.clearCache(); // ← REQUIRED: Many cells changed
    rerender();
}

// Formula recalculates
function onFormulaRecalc(address: Address, newResult: CellValue) {
    sheet.updateFormulaResult(address, newResult);
    engine.clearCache(); // ← REQUIRED: Dependent cells changed
    rerender();
}
```

### 💡 Future Enhancement: Reason Tracking (Optional)
```typescript
// Current signature:
clearCache(): void

// Possible future signature (for debugging/logging):
clearCache(reason?: 'data' | 'rules' | 'range'): void

// Usage:
engine.clearCache('data');  // Cell value changed
engine.clearCache('rules');  // Rule parameters changed
engine.clearCache('range');  // Rule range changed

// Note: Reason is for debugging only, doesn't change behavior
// All reasons result in complete cache clear
```

This is **not required now**, but leaves room for future logging/telemetry without breaking changes.

### ⚠️ Rule #2: Clear Cache on Rule Changes

```typescript
// User adds/removes/edits CF rule
function onRuleChange(newRules: ConditionalFormattingRule[]) {
    sheet.setRules(newRules);
    engine.clearCache(); // ← REQUIRED: Rule parameters changed
    rerender();
}

// User changes rule priority
function onRulePriorityChange(ruleId: string, newIndex: number) {
    sheet.reorderRule(ruleId, newIndex);
    engine.clearCache(); // ← REQUIRED: stopIfTrue behavior changed
    rerender();
}
```

### ⚠️ Rule #3: Clear Cache on Range Changes

```typescript
// User changes rule's applies-to range
function onRuleRangeChange(ruleId: string, newRange: Range) {
    sheet.updateRuleRange(ruleId, newRange);
    engine.clearCache(); // ← REQUIRED: Range signature changed
    rerender();
}
```

### ✅ When NOT to Clear Cache

```typescript
// ✅ Scrolling viewport (no data change)
function onScroll(newViewport: Range) {
    // NO clearCache() needed
    rerender(); // Just re-evaluate visible cells
}

// ✅ Changing cell selection (no data change)
function onSelect(range: Range) {
    // NO clearCache() needed
    updateUI();
}

// ✅ Changing zoom level (no data change)
function onZoom(zoomLevel: number) {
    // NO clearCache() needed
    rerender();
}

// ✅ Changing non-CF styles (fonts, borders, etc.)
function onStyleChange(address: Address, style: CellStyle) {
    sheet.setCellStyle(address, style);
    // NO clearCache() needed (manual styles don't affect CF)
    rerender();
}
```

---

## 4️⃣ What Happens If You Forget `clearCache()`?

### Symptom: Silent Data Corruption

```typescript
// Initial state:
sheet.setCellValue('A1', 100); // Values: [100, 50, 30]
engine.applyRules('A1', topBottomRule, ctx); // Match: YES (top-10)
// Cache: "A1:A3|top-bottom|top-10" → { threshold: 50, sortedValues: [100, 50, 30] }

// User edits:
sheet.setCellValue('A1', 10); // Values: [10, 50, 30]
// ❌ FORGOT: engine.clearCache();

// Next evaluation:
engine.applyRules('A1', topBottomRule, ctx); // Match: YES (WRONG!)
// Cache still has old data: threshold = 50
// A1 = 10, but 10 < 50, should NOT match
// BUT cache says threshold is 50, so engine thinks 10 is in top-10
```

**Result**: Cell shows incorrect conditional formatting (matches rule when it shouldn't).

### Symptom: Performance Catastrophe

```typescript
// Many data changes without clearCache():
for (let i = 0; i < 1000; i++) {
    sheet.setCellValue(`A${i}`, randomValue());
    // ❌ FORGOT: engine.clearCache();
    rerender(); // Uses stale cache every time
}

// Cache grows unbounded:
// - Old entries never evicted
// - Memory leak (1000+ stale entries)
// - Cache hit ratio drops (keys don't match new data)
// - Degrades to O(n²) performance (cache useless)
```

**Result**: 
- 🐌 Slow (cache misses every time)
- 💾 Memory leak (cache grows indefinitely)
- 🐛 Incorrect rendering (stale data)

---

## 5️⃣ Thread Safety (Honest Non-Guarantee)

### Current State: NOT Thread-Safe

```typescript
// ❌ UNSAFE: Concurrent writes to cache
const engine = new ConditionalFormattingEngine();

// Thread 1:
engine.applyRules('A1', rules, ctx); // Writes cache

// Thread 2 (simultaneous):
engine.applyRules('A1', rules, ctx); // Writes same cache entry

// Result: Undefined behavior (race condition)
```

### Why Not Thread-Safe?
- Cache is a JavaScript `Map` (not thread-safe)
- No locking mechanism
- Concurrent reads are SAFE (Map reads are atomic)
- Concurrent writes are UNSAFE (Map writes are NOT atomic)

### Safe Usage Pattern: One Engine Per Thread

```typescript
// ✅ SAFE: Each thread has its own engine
function workerThread1() {
    const engine = new ConditionalFormattingEngine(); // Thread-local
    for (const cell of cellsBatch1) {
        engine.applyRules(cell, rules, ctx);
    }
}

function workerThread2() {
    const engine = new ConditionalFormattingEngine(); // Different instance
    for (const cell of cellsBatch2) {
        engine.applyRules(cell, rules, ctx);
    }
}
```

### Future: Thread-Safe Cache (Not Implemented Yet)

```typescript
// Phase 4+: Possible thread-safe cache
class ThreadSafeStatisticalCache {
    private cache: Map<string, CacheEntry>;
    private mutex: Mutex; // Locking mechanism
    
    get(key: string): CacheEntry | undefined {
        this.mutex.lock();
        try {
            return this.cache.get(key);
        } finally {
            this.mutex.unlock();
        }
    }
}
```

**Status**: Deferred until multi-threading is required.

---

## 6️⃣ Cache Lifecycle Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Engine Instantiation                                        │
│   const engine = new ConditionalFormattingEngine();         │
│   ├─> StatisticalCacheManager created                       │
│   └─> 3 empty Map<string, *> caches initialized             │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ First Evaluation (Cache Miss)                               │
│   engine.applyRules(cellA1, rules, ctx);                    │
│   ├─> generateCacheKey("A1:D10", "top-bottom", "top-10")   │
│   ├─> Cache lookup: MISS                                    │
│   ├─> Full computation: scan range, sort, compute threshold │
│   └─> Store in cache: key → { sortedValues, threshold }    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Subsequent Evaluations (Cache Hit)                          │
│   engine.applyRules(cellB2, rules, ctx); // Same range/rule │
│   ├─> generateCacheKey("A1:D10", "top-bottom", "top-10")   │
│   ├─> Cache lookup: HIT ✅ (99.5% hit ratio)                │
│   └─> Return cached { sortedValues, threshold }             │
│                                                              │
│   Performance: 10,000 scans → 100 scans (99% reduction)    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Data Change Event                                           │
│   sheet.setCellValue('A1', newValue);                       │
│   engine.clearCache(); ← CRITICAL CALL                      │
│   ├─> All 3 Map caches cleared                              │
│   ├─> hits = 0, misses = 0, size = 0                        │
│   └─> Next evaluation will be cache miss (recompute)        │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
                      (Cycle repeats)
```

---

## 7️⃣ Real-World Usage Patterns

### Pattern A: Interactive Spreadsheet App

```typescript
class SpreadsheetApp {
    private engine = new ConditionalFormattingEngine(); // Singleton
    
    onCellEdit(address: Address, value: CellValue) {
        this.sheet.setCellValue(address, value);
        this.engine.clearCache(); // Clear on every edit
        this.render(); // Re-evaluate CF for visible cells
    }
    
    onRender() {
        const visible = this.viewport.getVisibleCells();
        for (const cell of visible) {
            const result = this.engine.applyRules(
                this.sheet.getValue(cell),
                this.sheet.getRules(),
                { range: this.sheet.getRuleRange(), getValue: this.sheet.getValue }
            );
            this.renderer.applyStyle(cell, result);
        }
    }
}
```

**Cache lifecycle**: Clear on edit → Miss on first cell → Hit on remaining cells in same range.

### Pattern B: Batch Processing (No Edits)

```typescript
// Export spreadsheet to PDF (read-only)
function exportToPDF(sheet: Sheet) {
    const engine = new ConditionalFormattingEngine(); // Fresh engine
    const pages = [];
    
    for (const pageRange of sheet.getPages()) {
        const cells = sheet.getCellsInRange(pageRange);
        const page = [];
        
        for (const cell of cells) {
            const result = engine.applyRules(
                sheet.getValue(cell),
                sheet.getRules(),
                { range: sheet.getRuleRange(), getValue: sheet.getValue }
            );
            page.push({ cell, style: result.style });
        }
        pages.push(page);
    }
    
    // NO clearCache() needed (data never changes)
    return generatePDF(pages);
}
```

**Cache lifecycle**: Miss on first cell per range → Hit on all remaining cells → 99.5% hit ratio.

### Pattern C: Unit Testing (Isolation)

```typescript
describe('Conditional Formatting', () => {
    let engine: ConditionalFormattingEngine;
    
    beforeEach(() => {
        engine = new ConditionalFormattingEngine(); // Fresh cache per test
    });
    
    it('should apply top-10 rule', () => {
        const result = engine.applyRules(100, topBottomRule, ctx);
        expect(result.style).toEqual({ backgroundColor: 'red' });
    });
    
    it('should not match below threshold', () => {
        const result = engine.applyRules(10, topBottomRule, ctx);
        expect(result.style).toBeUndefined();
    });
});
```

**Cache lifecycle**: New engine per test → No cache pollution → Tests independent.

---

## 8️⃣ Cache Monitoring (getCacheStats)

### When to Monitor

```typescript
// Production app: Monitor cache health
function checkCacheHealth() {
    const stats = engine.getCacheStats();
    
    if (stats.hitRatio < 0.90) {
        console.warn('⚠️ Cache hit ratio below 90%:', stats);
        // Possible causes:
        // - Too many unique ranges (e.g., user creating many small rules)
        // - Frequent data changes (clearCache() called too often)
        // - Bug: clearCache() not called when needed
    }
    
    if (stats.size > 1000) {
        console.warn('⚠️ Cache size exceeds 1000 entries:', stats);
        // Possible causes:
        // - Memory leak (clearCache() never called)
        // - User has many rules with different ranges
        // - Consider implementing LRU eviction
    }
}
```

### Interpreting Stats

```typescript
{
    hits: 9950,        // Cache hits (retrievals)
    misses: 50,        // Cache misses (computations)
    hitRatio: 0.995,   // 99.5% (EXCELLENT)
    size: 10           // 10 unique cache entries
}

// Health indicators:
// ✅ hitRatio > 0.90: Healthy (cache working well)
// ⚠️ hitRatio 0.50-0.90: Degraded (too many unique ranges?)
// ❌ hitRatio < 0.50: Critical (cache not helping, investigate)

// ✅ size < 100: Healthy (typical app)
// ⚠️ size 100-1000: Monitor (large app or many rules)
// ❌ size > 1000: Memory leak (clearCache() never called?)
```

---

## 9️⃣ Common Mistakes & Fixes

### Mistake 1: Global Engine + Forgot clearCache()

```typescript
// ❌ BAD: Never clears cache
const engine = new ConditionalFormattingEngine();

function onEdit(address: Address, value: CellValue) {
    sheet.setCellValue(address, value);
    render(); // BUG: Cache still has old data
}

// ✅ FIX: Clear cache on data change
function onEdit(address: Address, value: CellValue) {
    sheet.setCellValue(address, value);
    engine.clearCache(); // ← Add this
    render();
}
```

### Mistake 2: Clearing Cache Too Often

```typescript
// ❌ BAD: Clears cache on every cell render
function renderCell(address: Address) {
    engine.clearCache(); // BUG: Destroys cache on every cell
    const result = engine.applyRules(getValue(address), rules, ctx);
    drawCell(address, result);
}

// ✅ FIX: Clear once before rendering batch
function renderSheet() {
    engine.clearCache(); // Clear once at start
    for (const cell of visibleCells) {
        const result = engine.applyRules(getValue(cell), rules, ctx);
        drawCell(cell, result);
    }
}
```

### Mistake 3: Per-Cell Engine (No Cache Reuse)

```typescript
// ❌ BAD: New engine per cell (no cache benefit)
function renderCell(address: Address) {
    const engine = new ConditionalFormattingEngine(); // Fresh cache every time
    const result = engine.applyRules(getValue(address), rules, ctx);
    drawCell(address, result);
}

// ✅ FIX: Singleton engine (cache reuse)
const engine = new ConditionalFormattingEngine();

function renderCell(address: Address) {
    const result = engine.applyRules(getValue(address), rules, ctx);
    drawCell(address, result);
}
```

---

## 🔒 Cache Lifecycle Contract

**These rules are the contract:**

1. ✅ Cache is created when engine is created
2. ✅ Cache is reused across `applyRules()` calls
3. ✅ Cache is cleared when `clearCache()` is called
4. ✅ Cache MUST be cleared on any data/rule/range change
5. ❌ Cache is NOT thread-safe (one engine per thread)
6. ✅ Cache has no size limit (manual eviction if needed)
7. ✅ Cache stats are observable via `getCacheStats()`

**Violate this contract = Silent bugs or performance catastrophe.**

---

**Status**: 🔄 CRITICAL - Follow the lifecycle rules religiously
