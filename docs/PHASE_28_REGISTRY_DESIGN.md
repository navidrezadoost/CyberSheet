# Phase 28: Pivot Registry — Architecture Design

**Status:** Design (Not Implemented)  
**Risk Level:** Medium (introduces addressable identity)  
**Dependencies:** Phase 27 (Calculated Fields)

---

## Design Principles (Non-Negotiable)

### 1. Metadata-Only Storage
Registry is an **index, not storage**.

**✅ Allowed:**
```typescript
registry: Map<PivotId, PivotMetadata>
```

**❌ Forbidden:**
- Storing actual pivot data
- Storing references to worksheet mutable state
- Caching computed grids
- Holding PivotResult objects

### 2. Reproducibility Guarantee
```typescript
// This MUST always be true:
buildPivot(config, worksheetState) === registry.get(id).rebuild()
```

If this breaks → hidden state leak detected.

### 3. No Implicit Updates
- ❌ Auto-recompute pivot when cells change
- ✅ Explicit rebuild via API
- ✅ Formula-triggered read (GETPIVOTDATA later)

### 4. Disposal Safety
```typescript
sdk.dispose() // Must clear registry, no memory leaks
```

### 5. Deterministic IDs
Explicit ID assignment (not hash-based for Phase 28).

---

## Type System

### Core Types

```typescript
/**
 * Opaque pivot identifier.
 * Created explicitly, not derived.
 */
export type PivotId = string & { readonly __brand: 'PivotId' };

/**
 * Metadata-only registry entry.
 * Contains NO computed data, only configuration + identity.
 */
export interface PivotMetadata {
  readonly id: PivotId;
  readonly name: string; // User-visible name
  readonly config: PivotConfig; // Original configuration
  readonly sourceRange: string; // e.g., "A1:D100" (for refresh)
  readonly worksheetId: string; // Which worksheet owns this pivot
  readonly createdAt: number; // Timestamp (for ordering)
}

/**
 * Minimal registry interface.
 * Pure CRUD, no computation.
 */
export interface PivotRegistry {
  /**
   * Register a pivot configuration.
   * Returns unique ID.
   */
  register(metadata: Omit<PivotMetadata, 'id' | 'createdAt'>): PivotId;

  /**
   * Retrieve metadata by ID.
   * Returns undefined if not found (no exceptions).
   */
  get(id: PivotId): PivotMetadata | undefined;

  /**
   * Check existence without retrieval.
   */
  has(id: PivotId): boolean;

  /**
   * Remove pivot from registry.
   * Does not delete any worksheet data.
   */
  unregister(id: PivotId): boolean;

  /**
   * List all registered pivots (optionally filtered by worksheet).
   */
  list(worksheetId?: string): PivotMetadata[];

  /**
   * Clear all registrations.
   * Called during dispose().
   */
  clear(): void;
}
```

---

## Phase 29 Contract (GETPIVOTDATA)

### Purpose
Read computed values from registered pivots **without mutation**.

### Formula Signature
```excel
=GETPIVOTDATA(fieldName, pivotTable, [item1], [field1], ...)
```

### Type Contract

```typescript
/**
 * Query specification for GETPIVOTDATA.
 * Encodes Excel's positional filter syntax.
 */
export interface PivotDataQuery {
  readonly pivotId: PivotId; // Which pivot to query
  readonly valueField: string; // Which aggregated column
  readonly filters: ReadonlyArray<{ field: string; value: CellValue }>; // Row/column filters
}

/**
 * Result of GETPIVOTDATA evaluation.
 */
export type PivotDataResult = number | null | FormulaError;

/**
 * Bridge interface between formula engine and pivot system.
 * Read-only, deterministic, no side effects.
 */
export interface PivotDataBridge {
  /**
   * Resolve GETPIVOTDATA query.
   * Must be deterministic for same worksheet state.
   */
  query(query: PivotDataQuery, worksheet: Worksheet): PivotDataResult;

  /**
   * Rebuild pivot by ID.
   * Explicit recalculation trigger.
   */
  rebuild(id: PivotId, worksheet: Worksheet): PivotResult | null;
}
```

### Critical Constraint
**GETPIVOTDATA MUST NOT trigger implicit pivot rebuild.**

Flow:
1. Formula engine calls `query()`
2. Bridge checks if pivot result is "stale" (Phase 30 concern)
3. If stale → returns `#REF!` (explicit invalidation)
4. If fresh → returns cached result

This preserves determinism — no hidden dependencies.

---

## Implementation Strategy

### Phase 28a: Registry Core (This Phase)
```typescript
class PivotRegistryImpl implements PivotRegistry {
  private pivots = new Map<PivotId, PivotMetadata>();
  private idCounter = 0;

  register(meta: Omit<PivotMetadata, 'id' | 'createdAt'>): PivotId {
    const id = `pivot-${++this.idCounter}` as PivotId;
    this.pivots.set(id, {
      ...meta,
      id,
      createdAt: Date.now(),
    });
    return id;
  }

  get(id: PivotId): PivotMetadata | undefined {
    return this.pivots.get(id);
  }

  has(id: PivotId): boolean {
    return this.pivots.has(id);
  }

  unregister(id: PivotId): boolean {
    return this.pivots.delete(id);
  }

  list(worksheetId?: string): PivotMetadata[] {
    const all = Array.from(this.pivots.values());
    return worksheetId
      ? all.filter(p => p.worksheetId === worksheetId)
      : all;
  }

  clear(): void {
    this.pivots.clear();
  }
}
```

### Phase 28b: Worksheet Integration
```typescript
// Add to Worksheet class
class Worksheet {
  // Existing code...

  /**
   * Create pivot and register it.
   * Returns ID for later reference.
   */
  createPivot(
    config: PivotConfig,
    sourceRange: string,
    name: string
  ): { id: PivotId; result: PivotResult } {
    const registry = this.workbook.getPivotRegistry();
    const id = registry.register({
      name,
      config,
      sourceRange,
      worksheetId: this.id,
    });
    const result = this.buildPivot(config, sourceRange);
    return { id, result };
  }

  /**
   * Rebuild registered pivot.
   * Explicit recomputation.
   */
  rebuildPivot(id: PivotId): PivotResult | null {
    const registry = this.workbook.getPivotRegistry();
    const meta = registry.get(id);
    if (!meta || meta.worksheetId !== this.id) return null;

    return this.buildPivot(meta.config, meta.sourceRange);
  }
}
```

### Phase 28c: Disposal Integration
```typescript
class Workbook {
  private pivotRegistry: PivotRegistry;

  dispose(): void {
    this.pivotRegistry.clear(); // No memory leaks
    // ... existing disposal logic
  }
}
```

---

## Testing Strategy

### Registry Correctness Tests
```typescript
describe('PivotRegistry', () => {
  test('register + get roundtrip', () => {
    const registry = new PivotRegistryImpl();
    const config = { /* ... */ };
    const id = registry.register({ name: 'Test', config, sourceRange: 'A1:B10', worksheetId: 'ws1' });
    
    const meta = registry.get(id);
    expect(meta?.config).toEqual(config);
  });

  test('unregister removes entry', () => {
    const registry = new PivotRegistryImpl();
    const id = registry.register({ name: 'Test', config: {}, sourceRange: 'A1:B10', worksheetId: 'ws1' });
    
    expect(registry.has(id)).toBe(true);
    registry.unregister(id);
    expect(registry.has(id)).toBe(false);
  });

  test('list filters by worksheet', () => {
    const registry = new PivotRegistryImpl();
    registry.register({ name: 'P1', config: {}, sourceRange: 'A1:B10', worksheetId: 'ws1' });
    registry.register({ name: 'P2', config: {}, sourceRange: 'A1:B10', worksheetId: 'ws2' });
    
    expect(registry.list('ws1')).toHaveLength(1);
    expect(registry.list()).toHaveLength(2);
  });

  test('clear removes all entries', () => {
    const registry = new PivotRegistryImpl();
    registry.register({ name: 'P1', config: {}, sourceRange: 'A1:B10', worksheetId: 'ws1' });
    registry.register({ name: 'P2', config: {}, sourceRange: 'A1:B10', worksheetId: 'ws2' });
    
    registry.clear();
    expect(registry.list()).toHaveLength(0);
  });
});
```

### Reproducibility Tests
```typescript
describe('Pivot Reproducibility', () => {
  test('rebuild produces identical results', () => {
    const ws = new Worksheet();
    ws.setCellValue('A1', 'Product');
    ws.setCellValue('B1', 'Sales');
    ws.setCellValue('A2', 'Widget');
    ws.setCellValue('B2', 100);
    
    const config: PivotConfig = {
      rows: [0],
      values: [{ column: 1, operation: 'sum' }],
    };
    
    const { id, result: result1 } = ws.createPivot(config, 'A1:B2', 'Test');
    const result2 = ws.rebuildPivot(id);
    
    expect(result1.grid).toEqual(result2?.grid);
  });
});
```

### Disposal Safety Tests
```typescript
describe('Disposal Safety', () => {
  test('dispose clears registry', () => {
    const workbook = new Workbook();
    const ws = workbook.createSheet('Test');
    ws.createPivot({ rows: [0], values: [] }, 'A1:B10', 'P1');
    
    workbook.dispose();
    
    const registry = workbook.getPivotRegistry();
    expect(registry.list()).toHaveLength(0);
  });
});
```

---

## Architectural Invariants (Validation Checklist)

After implementation, verify:

- [ ] Registry stores NO computed data
- [ ] Registry holds NO worksheet references
- [ ] `buildPivot()` produces same result as `rebuildPivot(id)`
- [ ] No automatic recalculation on cell change
- [ ] `dispose()` clears all registry entries
- [ ] IDs are deterministic within session
- [ ] No formula engine coupling yet (Phase 29)
- [ ] Zero dependencies beyond core types
- [ ] No hidden state leakage

---

## Risk Analysis

### Eliminated Risks
- **Registry data bloat**: Metadata-only design prevents this
- **Stale data access**: No caching → no staleness
- **Disposal leaks**: Explicit `clear()` in dispose path

### Remaining Risks (Phase 29)
- **Cross-system dependency graph**: GETPIVOTDATA introduces this
- **Execution ordering**: Not a concern until Phase 30 (recalc model)
- **Cache invalidation**: Deferred to Phase 30

### Mitigation
Phase 28 is **pure infrastructure** — no feature risk, only architectural risk.  
By constraining to metadata-only, we minimize that risk.

---

## Success Criteria

✅ Phase 28 is complete when:

1. Registry can store/retrieve pivot metadata
2. Pivots can be rebuilt by ID
3. Registry integrates with dispose()
4. Zero TypeScript errors
5. All tests pass
6. No formula coupling (yet)
7. Reproducibility guarantee holds

---

## Next Phase Preview

**Phase 29: GETPIVOTDATA**
- Implement `PivotDataBridge`
- Formula function registration
- Read-only query API
- No implicit rebuild (returns `#REF!` if stale)

**Phase 30: Recalculation Model**
- Track pivot staleness
- Explicit invalidation API
- Still no automatic recompute

