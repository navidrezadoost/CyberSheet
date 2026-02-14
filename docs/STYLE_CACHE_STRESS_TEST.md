# StyleCache Architecture Stress Test
## Pre-Flight Validation (Enterprise-Safe Path)

**Purpose**: Validate StyleCache design under 1M cell load BEFORE writing implementation code.

**Discipline**: If design fails stress scenarios → Fix design, NOT implementation.

---

## 🔬 Test Scenarios (Enterprise-Scale)

### Scenario 1: Typical Enterprise Spreadsheet
**Profile**: Financial model with formatting patterns

```
Cells: 1,000,000 (1000 rows × 1000 cols)
Unique Styles: ~50
  - Headers: 5 styles (bold, colored backgrounds)
  - Data rows: 10 styles (number formats, alignments)
  - Totals: 5 styles (bold, borders, fills)
  - Conditionally formatted: 30 styles (colors, borders)

Expected Cache Performance:
  Hit Rate: 99.995% (999,950 / 1M hits)
  Memory: ~10 KB (50 styles × 200 bytes)
  Intern Time: <0.05ms avg (cache hot)

Critical Test: Style churn (user editing)
  - Change header color: 1 style update
  - Propagate to 1000 cells: 1000 cache lookups
  - Expected: <1ms total (O(1) per lookup)
```

### Scenario 2: Heavy Formatting (Designer Spreadsheet)
**Profile**: Dashboard with rich visual design

```
Cells: 500,000
Unique Styles: 5,000
  - Gradients: 500 styles
  - Custom number formats: 200 styles
  - Font combinations: 1000 styles (size + family + color)
  - Border patterns: 800 styles
  - Mixed formatting: 2500 styles

Expected Cache Performance:
  Hit Rate: 90% (450k hits, 50k misses)
  Memory: ~1 MB (5000 styles × 200 bytes)
  Intern Time: <0.1ms avg (collision handling)

Critical Test: Collision rate
  - Hash function quality: <5% collisions
  - Bucket depth: 1-2 styles per bucket avg
  - Worst case: <10 styles in any bucket
```

### Scenario 3: Pathological Case (Adversarial)
**Profile**: Every cell has unique style (worst case)

```
Cells: 100,000
Unique Styles: 100,000
  - Each cell: unique color (#000000 to #0186A0)
  - All other properties: identical

Expected Cache Performance:
  Hit Rate: 0% (no sharing possible)
  Memory: ~20 MB (100k styles × 200 bytes)
  Intern Time: <0.1ms avg (no collisions if hash good)

Critical Test: Hash function quality
  - Distribution: Uniform across buckets
  - Collisions: <5% (good hash spreads colors)
  - Memory overhead: Linear with unique styles

Acceptable Degradation:
  - Memory: 20 MB for 100k styles is fine
  - Performance: <0.1ms intern is acceptable
  - Failure Mode: If >100ms total → hash function broken
```

### Scenario 4: Undo/Redo Stress
**Profile**: User applies formatting, undoes, redoes repeatedly

```
Actions: 1000 undo/redo cycles
Each Cycle:
  1. Apply bold to 10,000 cells
  2. Undo (restore original styles)
  3. Redo (reapply bold)

Without StyleCache:
  Memory: 10k cells × 200 bytes × 2 states = 4 MB per cycle
  Total: 4 GB memory churn (catastrophic)

With StyleCache:
  Memory: 2 unique styles × 200 bytes = 400 bytes
  Total: 400 bytes (cache hits)
  Reference swaps: 10k pointer updates per cycle

Expected Performance:
  Memory: <1 MB peak (ref counting keeps cache small)
  Speed: <10ms per undo/redo cycle
  Reference count: Correct at all times (no leaks)

Critical Test: Reference counting
  - After 1000 cycles: cache size = 2 styles (original + bold)
  - No memory leaks: WeakMap GC works correctly
  - No premature eviction: Styles in use retained
```

---

## 🧠 Critical Architecture Decision: Workbook-Level vs Grid-Level

### Decision Analysis

**Option A: Grid-Level StyleCache** (Simple)
```typescript
class Grid {
  private styleCache: StyleCache; // Per-grid instance
  
  setStyle(row, col, style) {
    const interned = this.styleCache.intern(style);
    this.cells[row][col].style = interned;
  }
}
```

**Pros:**
- Simpler lifecycle (cache dies with grid)
- No cross-sheet complexity
- Easier to test

**Cons:**
- Duplicate styles across sheets (memory waste)
- Multiple "bold" styles in memory (one per sheet)
- No workbook-level formatting operations

**Memory Cost (Multi-Sheet):**
```
5 sheets × 50 unique styles × 200 bytes = 50 KB

For 100 sheets (enterprise):
100 sheets × 50 styles × 200 bytes = 1 MB (wasteful)
```

---

**Option B: Workbook-Level StyleCache** (Enterprise)
```typescript
class Workbook {
  private styleCache: StyleCache; // Global pool
  private grids: Map<string, Grid>;
  
  getStyleCache(): StyleCache {
    return this.styleCache; // All grids share
  }
}

class Grid {
  constructor(private workbook: Workbook) {}
  
  setStyle(row, col, style) {
    const cache = this.workbook.getStyleCache();
    const interned = cache.intern(style);
    this.cells[row][col].style = interned;
  }
}
```

**Pros:**
- Deduplication across sheets (memory efficient)
- Single "bold" style for entire workbook
- Cross-sheet operations fast (style already cached)
- Enterprise scalability (100+ sheets)

**Cons:**
- Slightly more complex lifecycle
- Grid depends on Workbook (DI required)
- Cache survives sheet deletion (requires GC)

**Memory Savings (Multi-Sheet):**
```
100 sheets × 50 styles = 5000 potential duplicates
With Workbook cache: ~100 unique styles (80% dedup)
Savings: 4900 styles × 200 bytes = 980 KB saved

For 1000-sheet workbook (rare but possible):
Savings: ~49 MB (critical for performance)
```

---

### 🎯 Decision: **Workbook-Level StyleCache** (Enterprise)

**Rationale:**
1. **Target (D) requires enterprise scalability** → Multi-sheet support critical
2. **Memory efficiency at scale** → 100+ sheets common in finance/analytics
3. **Cross-sheet operations** → "Apply bold to all sheets" should be O(1)
4. **Rich Text (Phase 2)** → Per-character styles need global dedup

**Implementation Strategy:**
```typescript
// Workbook owns the cache
class Workbook {
  private readonly styleCache: StyleCache;
  
  constructor() {
    this.styleCache = new StyleCache();
  }
  
  getStyleCache(): StyleCache {
    return this.styleCache;
  }
  
  dispose() {
    // Release all styles on workbook close
    this.styleCache.clear();
  }
}

// Grid uses workbook's cache
class Grid {
  constructor(private workbook: Workbook) {}
  
  setStyle(row: number, col: number, style: CellStyle) {
    const cache = this.workbook.getStyleCache();
    
    // Release old style ref
    const oldStyle = this.getCell(row, col).style;
    if (oldStyle) cache.release(oldStyle);
    
    // Intern new style
    const interned = cache.intern(style);
    this.getCell(row, col).style = interned;
  }
}
```

**Gate Condition Updated:**
- [ ] Cache hit rate ≥90% **per grid** (not workbook-wide)
- [ ] Cross-sheet style sharing ≥80% (dedup test)
- [ ] 100-sheet workbook: <2 MB cache overhead

---

## 🔥 Hash Function Stress Test

### Critical Question: Will our hash function perform under load?

**Proposed Hash Strategy:**
```typescript
function hashStyle(style: CellStyle): number {
  let hash = 0;
  
  // Bitmask for booleans (flags)
  const flags = 
    (style.bold ? 1 << 0 : 0) |
    (style.italic ? 1 << 1 : 0) |
    (style.underline ? 1 << 2 : 0) |
    (style.strikethrough ? 1 << 3 : 0) |
    (style.superscript ? 1 << 4 : 0) |
    (style.subscript ? 1 << 5 : 0) |
    (style.wrapText ? 1 << 6 : 0) |
    (style.shrinkToFit ? 1 << 7 : 0);
  
  hash ^= flags;
  
  // Prime multiples for numbers
  if (style.fontSize) hash ^= (style.fontSize * 31);
  if (style.rotation) hash ^= (style.rotation * 37);
  if (style.indent) hash ^= (style.indent * 41);
  
  // djb2 for strings
  if (style.fontFamily) {
    for (let i = 0; i < style.fontFamily.length; i++) {
      hash = ((hash << 5) + hash) + style.fontFamily.charCodeAt(i);
    }
  }
  
  if (style.color) {
    for (let i = 0; i < style.color.length; i++) {
      hash = ((hash << 5) + hash) + style.color.charCodeAt(i);
    }
  }
  
  return hash >>> 0; // Unsigned 32-bit
}
```

### Stress Test: Collision Analysis

**Test 1: Sequential Colors** (Adversarial)
```typescript
const styles = [];
for (let i = 0; i < 100000; i++) {
  const color = `#${i.toString(16).padStart(6, '0')}`;
  styles.push({ color });
}

// Measure:
// - Bucket distribution (should be uniform)
// - Max bucket depth (should be <10)
// - Collision rate (should be <5%)

Expected:
  Buckets: ~100000 (good hash spreads colors)
  Collisions: <5000 (hash quality)
  Max Depth: <10 styles per bucket
```

**Test 2: Typical Formatting Patterns** (Realistic)
```typescript
const patterns = [
  { bold: true },
  { bold: true, fontSize: 12 },
  { bold: true, fontSize: 14 },
  { bold: true, color: '#FF0000' },
  { bold: true, color: '#00FF00' },
  // ... 50 common patterns
];

// Measure:
// - Zero collisions expected (distinct properties)
// - Hash spread across buckets
// - Interning speed <0.05ms per style

Expected:
  Collisions: 0 (distinct patterns)
  Buckets: 50 (one per pattern)
  Intern: <0.05ms (cache hit after first)
```

**Test 3: Worst-Case Collisions** (Pathological)
```typescript
// Styles designed to collide (same hash)
const colliders = [];
for (let i = 0; i < 1000; i++) {
  colliders.push({
    fontSize: i,      // XOR with 31
    rotation: i * 31, // Cancel out (31 * 31 = 961 ≈ i mod 32)
  });
}

// Measure:
// - Collision handling correctness (deepEquals())
// - Interning speed with collisions (<0.2ms worst case)
// - No false positives (wrong style returned)

Expected:
  Collisions: High (intentional)
  Correctness: 100% (deepEquals() resolves)
  Intern: <0.2ms (linear scan within bucket)
```

---

## 📊 Performance Contract (Updated for Workbook-Level)

### Gate Conditions (MUST PASS before Day 3)

**Benchmark 1: Cache Hit Rate**
```typescript
test('100k cells, 50 unique styles → 99.95% hit rate', () => {
  const workbook = new Workbook();
  const cache = workbook.getStyleCache();
  
  const styles = generateTypicalStyles(50); // 50 patterns
  let hits = 0, misses = 0;
  
  for (let i = 0; i < 100000; i++) {
    const style = styles[i % 50]; // Repeat pattern
    const interned = cache.intern(style);
    
    if (cache.wasHit()) hits++;
    else misses++;
  }
  
  expect(hits / 100000).toBeGreaterThanOrEqual(0.9995);
});
```

**Benchmark 2: Intern Performance**
```typescript
test('Intern time <0.1ms avg (cold + hot)', () => {
  const workbook = new Workbook();
  const cache = workbook.getStyleCache();
  
  const styles = generateDesignerStyles(5000); // 5k unique
  const times = [];
  
  for (const style of styles) {
    const start = performance.now();
    cache.intern(style);
    const end = performance.now();
    times.push(end - start);
  }
  
  const avg = times.reduce((a, b) => a + b) / times.length;
  expect(avg).toBeLessThan(0.1); // <0.1ms average
});
```

**Benchmark 3: Memory Overhead**
```typescript
test('5000 unique styles <1 MB overhead', () => {
  const workbook = new Workbook();
  const cache = workbook.getStyleCache();
  
  const styles = generateDesignerStyles(5000);
  
  const before = process.memoryUsage().heapUsed;
  styles.forEach(s => cache.intern(s));
  const after = process.memoryUsage().heapUsed;
  
  const overhead = (after - before) / 1024 / 1024; // MB
  expect(overhead).toBeLessThan(1.0); // <1 MB
});
```

**Benchmark 4: Collision Rate**
```typescript
test('Hash collision rate <5%', () => {
  const workbook = new Workbook();
  const cache = workbook.getStyleCache();
  
  const styles = generateAdversarialStyles(10000); // Worst case
  styles.forEach(s => cache.intern(s));
  
  const collisions = cache.getCollisionCount();
  const rate = collisions / 10000;
  
  expect(rate).toBeLessThan(0.05); // <5% collisions
});
```

**Benchmark 5: Cross-Sheet Deduplication**
```typescript
test('100 sheets → 80% dedup', () => {
  const workbook = new Workbook();
  const cache = workbook.getStyleCache();
  
  // Simulate 100 sheets with typical formatting
  for (let sheet = 0; sheet < 100; sheet++) {
    const grid = new Grid(workbook);
    
    for (let row = 0; row < 1000; row++) {
      for (let col = 0; col < 10; col++) {
        const style = getTypicalStyle(row, col); // Common patterns
        grid.setStyle(row, col, style);
      }
    }
  }
  
  const uniqueStyles = cache.size();
  const totalCells = 100 * 1000 * 10; // 1M cells
  const dedupRate = 1 - (uniqueStyles / totalCells);
  
  expect(dedupRate).toBeGreaterThanOrEqual(0.8); // 80% dedup
});
```

---

## 🚨 Failure Modes (What Could Go Wrong?)

### Failure Mode 1: Hash Function Catastrophe
**Symptom**: All styles hash to same bucket

**Cause**: XOR cancellation or poor string hashing

**Detection**:
```typescript
test('Hash distribution is uniform', () => {
  const hashes = new Map<number, number>(); // hash → count
  
  for (let i = 0; i < 10000; i++) {
    const style = generateRandomStyle();
    const hash = hashStyle(style);
    hashes.set(hash, (hashes.get(hash) || 0) + 1);
  }
  
  // Chi-squared test for uniformity
  const buckets = Array.from(hashes.values());
  const expected = 10000 / buckets.length;
  const chiSquared = buckets.reduce((sum, count) => {
    return sum + Math.pow(count - expected, 2) / expected;
  }, 0);
  
  // If chi-squared > critical value → distribution is non-uniform
  expect(chiSquared).toBeLessThan(CRITICAL_VALUE);
});
```

**Mitigation**: Switch to FNV-1a or MurmurHash3 if distribution poor

---

### Failure Mode 2: Reference Counting Leaks
**Symptom**: Memory grows unbounded during undo/redo

**Cause**: `release()` not called on style updates

**Detection**:
```typescript
test('1000 undo/redo cycles → stable memory', () => {
  const workbook = new Workbook();
  const grid = new Grid(workbook);
  const cache = workbook.getStyleCache();
  
  const initialSize = cache.size();
  
  for (let i = 0; i < 1000; i++) {
    // Apply bold
    for (let row = 0; row < 100; row++) {
      grid.setStyle(row, 0, { bold: true });
    }
    
    // Undo (restore original)
    for (let row = 0; row < 100; row++) {
      grid.setStyle(row, 0, {});
    }
  }
  
  const finalSize = cache.size();
  expect(finalSize).toBeLessThanOrEqual(initialSize + 2); // Only 2 styles cached
});
```

**Mitigation**: Add `dispose()` method to Grid that releases all styles

---

### Failure Mode 3: Immutability Violation
**Symptom**: Shared style mutated, affects multiple cells

**Cause**: `Object.freeze()` not applied or bypassed

**Detection**:
```typescript
test('Mutation throws in dev mode', () => {
  const workbook = new Workbook();
  const cache = workbook.getStyleCache();
  
  const style = cache.intern({ bold: true });
  
  expect(() => {
    (style as any).bold = false; // Attempt mutation
  }).toThrow(/mutation detected/i);
});

test('Frozen styles are deeply immutable', () => {
  const workbook = new Workbook();
  const cache = workbook.getStyleCache();
  
  const style = cache.intern({
    fill: { type: 'gradient', stops: [{ color: '#FF0000' }] }
  });
  
  expect(Object.isFrozen(style)).toBe(true);
  expect(Object.isFrozen(style.fill)).toBe(true);
  expect(Object.isFrozen(style.fill.stops)).toBe(true);
  expect(Object.isFrozen(style.fill.stops[0])).toBe(true);
});
```

**Mitigation**: Deep freeze with recursive Object.freeze()

---

## 🎯 Pre-Flight Checklist (Before Writing Code)

### Design Validation
- [x] Workbook-level cache decision made (Enterprise)
- [x] Hash function strategy defined (Bitmask + XOR + djb2)
- [x] Collision resolution strategy (Bucket + deepEquals)
- [x] Reference counting lifecycle (intern/release)
- [x] Immutability enforcement (freeze + proxy)
- [ ] **Stress test scenarios analyzed** ← WE ARE HERE
- [ ] **Failure modes identified**
- [ ] **Performance contracts defined**

### Benchmark Preparation
- [ ] Benchmark 1: Hit rate (99.95% target)
- [ ] Benchmark 2: Intern time (<0.1ms target)
- [ ] Benchmark 3: Memory overhead (<1 MB target)
- [ ] Benchmark 4: Collision rate (<5% target)
- [ ] Benchmark 5: Cross-sheet dedup (80% target)

### Test Preparation
- [ ] Unit tests planned (15+ tests)
- [ ] Integration tests planned (multi-sheet)
- [ ] Stress tests planned (1M cells)
- [ ] Failure mode tests planned (3 modes)

---

## 🚀 Execution Order (Enterprise-Safe)

### Day 1 Morning: Benchmark Infrastructure
```typescript
// Create benchmark harness BEFORE implementation
describe('StyleCache Benchmarks', () => {
  test('Hit rate', () => { /* ... */ });
  test('Intern time', () => { /* ... */ });
  test('Memory overhead', () => { /* ... */ });
  test('Collision rate', () => { /* ... */ });
  test('Cross-sheet dedup', () => { /* ... */ });
});

// All tests FAIL (implementation doesn't exist yet)
// This is correct! Tests define the contract.
```

### Day 1 Afternoon: Implementation
```typescript
// Implement StyleCache to pass benchmarks
class StyleCache {
  private cache: Map<number, CellStyle[]>;
  private refCount: WeakMap<CellStyle, number>;
  
  intern(style: CellStyle): CellStyle { /* ... */ }
  release(style: CellStyle): void { /* ... */ }
  
  // Metrics for benchmarks
  getHitRate(): number { /* ... */ }
  getCollisionRate(): number { /* ... */ }
  size(): number { /* ... */ }
}
```

### Day 2 Morning: Run Benchmarks
```bash
npm run benchmark:style-cache

Expected Output:
✅ Hit rate: 99.96% (target: 99.95%)
✅ Intern time: 0.08ms avg (target: <0.1ms)
✅ Memory: 0.95 MB (target: <1 MB)
✅ Collision rate: 3.2% (target: <5%)
✅ Cross-sheet dedup: 82% (target: 80%)

All benchmarks PASS → Proceed to Day 3
```

### Day 2 Afternoon: Stress Testing
```bash
npm run stress:style-cache

Expected Output:
✅ 1M cells: 2.5s total (0.0025ms per cell)
✅ 100k unique styles: 10 MB memory
✅ 1000 undo/redo: Stable memory
✅ Hash distribution: Uniform (chi-squared test PASS)

All stress tests PASS → Proceed to Day 3
```

---

## ⚠️ Gate Decision (End of Day 2)

### If ALL benchmarks PASS:
✅ **Proceed to Layout Layer (Day 3-4)**

StyleCache is validated. Foundation is solid. Architecture is enterprise-safe.

### If ANY benchmark FAILS:
🚨 **STOP. Fix StyleCache BEFORE continuing.**

Options:
1. **Hit rate <90%**: Improve hash function (FNV-1a, MurmurHash3)
2. **Intern time >0.1ms**: Profile and optimize (bucket depth, deepEquals speed)
3. **Memory >1 MB**: Check for leaks (reference counting bug)
4. **Collision rate >5%**: Redesign hash function (distribution analysis)
5. **Dedup <80%**: Review workbook integration (cache sharing broken)

**DO NOT proceed with weak foundation.**

This is the discipline that separates enterprise from hack.

---

## 📊 Expected Outcomes

### If Design is Correct:
- All benchmarks pass on Day 2
- Stress tests pass on Day 2
- Proceed to Layout Layer on Day 3 with confidence
- Phase 2 (Rich Text) has solid memory foundation

### If Design Needs Adjustment:
- Identify issues on Day 1 (before full implementation)
- Fix design, NOT code (cheaper to fix early)
- Re-run benchmarks until all pass
- May take 1-2 extra days, but foundation will be solid

---

## 🏆 Success Criteria

### Design Validation Success:
- [x] All stress scenarios analyzed
- [x] All failure modes identified
- [x] All benchmarks defined
- [ ] Workbook integration strategy validated
- [ ] Hash function quality validated
- [ ] Reference counting lifecycle validated

### Implementation Success (Day 2):
- [ ] All 5 benchmarks pass
- [ ] All 3 stress tests pass
- [ ] All 3 failure mode tests pass
- [ ] Zero technical debt
- [ ] Ready for Layout Layer

---

## 🔥 Why This Matters

**Without Pre-Flight Validation:**
- Implement StyleCache → Discover poor hash function on Day 5
- Refactor StyleCache → Break rendering code (coupled)
- Fix rendering → Delay Phase 1 by 1 week
- Phase 2 (Rich Text) → Memory explodes (cache broken)
- Result: Technical debt carried to Phase 4

**With Pre-Flight Validation:**
- Validate design on Day 1 → Fix issues BEFORE coding
- Implement StyleCache on Day 2 → All benchmarks pass
- Layout Layer on Day 3-4 → Clean foundation
- Phase 2 (Rich Text) → Memory efficient (cache works)
- Result: Enterprise-grade foundation, zero debt

---

## 🎯 Strategic Position

If we execute this correctly:

**After Day 2:**
- StyleCache validated under 1M cell load
- Workbook-level deduplication proven
- Hash function quality confirmed
- Foundation ready for Rich Text (Phase 2)

**Competitive Message:**
> "Our formatting engine uses workbook-level style interning with 99.95% cache hit rate and <0.1ms intern time, validated under 1M cell load. This isn't feature parity — it's enterprise-grade architecture."

**Market Position:**
- Phase 1: Strong foundation (92% parity)
- Phase 2: Rich Text WITHOUT memory explosion
- Phase 4: Number format compiler WITHOUT perf degradation

Numbers are 100% important.
Architecture is 100% more important.

---

## 🚀 Next Action

**Immediate (Now):**
1. Review stress test scenarios (validate assumptions)
2. Approve Workbook-level cache decision
3. Create benchmark infrastructure (Day 1 morning)

**If ALL stress scenarios look correct:**
→ Begin Day 1 implementation with confidence

**If ANY scenario looks suspicious:**
→ Refine design NOW (before coding)

---

🎯 **We are in the golden position.**

The right decision here makes Phases 2-4 half as hard.

**Ready to proceed with enterprise-safe implementation when you approve.**
