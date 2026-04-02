/**
 * Phase 28: Pivot Registry Tests
 * 
 * Verifies:
 * - Metadata-only storage (no computed data)
 * - CRUD operations
 * - Reproducibility guarantee
 * - Disposal safety
 * - Deterministic IDs
 */

import { describe, test, expect } from '@jest/globals';
import { PivotRegistryImpl, type PivotMetadata, type PivotId } from '../src/PivotRegistry';
import type { PivotConfig, AggregateValueSpec } from '../src/PivotEngine';

describe('PivotRegistry - Core Operations', () => {
  test('register creates entry with unique ID', () => {
    const registry = new PivotRegistryImpl();
    
    const config: PivotConfig = {
      rows: [{ column: 0, label: 'Product' }],
      columns: [],
      values: [{ type: 'aggregate', column: 1, aggregation: 'sum', label: 'Sales' } as AggregateValueSpec],
      sourceRange: { start: { row: 0, col: 0 }, end: { row: 10, col: 2 } },
    };
    
    const id = registry.register({
      name: 'Sales Pivot',
      config,
      sourceRange: 'A1:C11',
      worksheetId: 'ws1',
    });
    
    expect(id).toBe('pivot-1');
    expect(registry.has(id)).toBe(true);
  });

  test('register assigns sequential IDs', () => {
    const registry = new PivotRegistryImpl();
    
    const config: PivotConfig = {
      rows: [],
      columns: [],
      values: [],
      sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } },
    };
    
    const id1 = registry.register({ name: 'P1', config, sourceRange: 'A1:A1', worksheetId: 'ws1' });
    const id2 = registry.register({ name: 'P2', config, sourceRange: 'A1:A1', worksheetId: 'ws1' });
    const id3 = registry.register({ name: 'P3', config, sourceRange: 'A1:A1', worksheetId: 'ws1' });
    
    expect(id1).toBe('pivot-1');
    expect(id2).toBe('pivot-2');
    expect(id3).toBe('pivot-3');
  });

  test('get retrieves registered metadata', () => {
    const registry = new PivotRegistryImpl();
    
    const config: PivotConfig = {
      rows: [{ column: 0, label: 'Region' }],
      columns: [],
      values: [{ type: 'aggregate', column: 1, aggregation: 'count', label: 'Count' } as AggregateValueSpec],
      sourceRange: { start: { row: 0, col: 0 }, end: { row: 5, col: 1 } },
    };
    
    const id = registry.register({
      name: 'Region Count',
      config,
      sourceRange: 'A1:B6',
      worksheetId: 'ws2',
    });
    
    const meta = registry.get(id);
    
    expect(meta).toBeDefined();
    expect(meta?.id).toBe(id);
    expect(meta?.name).toBe('Region Count');
    expect(meta?.config).toEqual(config);
    expect(meta?.sourceRange).toBe('A1:B6');
    expect(meta?.worksheetId).toBe('ws2');
    expect(meta?.createdAt).toBeGreaterThan(0);
  });

  test('get returns undefined for non-existent ID', () => {
    const registry = new PivotRegistryImpl();
    
    const meta = registry.get('pivot-999' as PivotId);
    
    expect(meta).toBeUndefined();
  });

  test('has returns true for existing entry', () => {
    const registry = new PivotRegistryImpl();
    
    const id = registry.register({
      name: 'Test',
      config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
      sourceRange: 'A1:A1',
      worksheetId: 'ws1',
    });
    
    expect(registry.has(id)).toBe(true);
  });

  test('has returns false for non-existent entry', () => {
    const registry = new PivotRegistryImpl();
    
    expect(registry.has('pivot-999' as PivotId)).toBe(false);
  });

  test('unregister removes entry', () => {
    const registry = new PivotRegistryImpl();
    
    const id = registry.register({
      name: 'Test',
      config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
      sourceRange: 'A1:A1',
      worksheetId: 'ws1',
    });
    
    expect(registry.has(id)).toBe(true);
    
    const removed = registry.unregister(id);
    
    expect(removed).toBe(true);
    expect(registry.has(id)).toBe(false);
    expect(registry.get(id)).toBeUndefined();
  });

  test('unregister returns false for non-existent entry', () => {
    const registry = new PivotRegistryImpl();
    
    const removed = registry.unregister('pivot-999' as PivotId);
    
    expect(removed).toBe(false);
  });
});

describe('PivotRegistry - List Operations', () => {
  test('list returns all pivots', () => {
    const registry = new PivotRegistryImpl();
    
    const config: PivotConfig = {
      rows: [],
      columns: [],
      values: [],
      sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } },
    };
    
    registry.register({ name: 'P1', config, sourceRange: 'A1:A1', worksheetId: 'ws1' });
    registry.register({ name: 'P2', config, sourceRange: 'A1:A1', worksheetId: 'ws2' });
    registry.register({ name: 'P3', config, sourceRange: 'A1:A1', worksheetId: 'ws1' });
    
    const all = registry.list();
    
    expect(all).toHaveLength(3);
    expect(all.map(p => p.name)).toEqual(['P1', 'P2', 'P3']);
  });

  test('list filters by worksheetId', () => {
    const registry = new PivotRegistryImpl();
    
    const config: PivotConfig = {
      rows: [],
      columns: [],
      values: [],
      sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } },
    };
    
    registry.register({ name: 'P1', config, sourceRange: 'A1:A1', worksheetId: 'ws1' });
    registry.register({ name: 'P2', config, sourceRange: 'A1:A1', worksheetId: 'ws2' });
    registry.register({ name: 'P3', config, sourceRange: 'A1:A1', worksheetId: 'ws1' });
    registry.register({ name: 'P4', config, sourceRange: 'A1:A1', worksheetId: 'ws3' });
    
    const ws1Pivots = registry.list('ws1');
    
    expect(ws1Pivots).toHaveLength(2);
    expect(ws1Pivots.map(p => p.name)).toEqual(['P1', 'P3']);
    expect(ws1Pivots.every(p => p.worksheetId === 'ws1')).toBe(true);
  });

  test('list returns empty array when no pivots registered', () => {
    const registry = new PivotRegistryImpl();
    
    expect(registry.list()).toEqual([]);
    expect(registry.list('ws1')).toEqual([]);
  });

  test('list returns empty array for worksheet with no pivots', () => {
    const registry = new PivotRegistryImpl();
    
    const config: PivotConfig = {
      rows: [],
      columns: [],
      values: [],
      sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } },
    };
    
    registry.register({ name: 'P1', config, sourceRange: 'A1:A1', worksheetId: 'ws1' });
    
    expect(registry.list('ws2')).toEqual([]);
  });
});

describe('PivotRegistry - Disposal Safety', () => {
  test('clear removes all entries', () => {
    const registry = new PivotRegistryImpl();
    
    const config: PivotConfig = {
      rows: [],
      columns: [],
      values: [],
      sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } },
    };
    
    const id1 = registry.register({ name: 'P1', config, sourceRange: 'A1:A1', worksheetId: 'ws1' });
    const id2 = registry.register({ name: 'P2', config, sourceRange: 'A1:A1', worksheetId: 'ws2' });
    const id3 = registry.register({ name: 'P3', config, sourceRange: 'A1:A1', worksheetId: 'ws1' });
    
    expect(registry.list()).toHaveLength(3);
    
    registry.clear();
    
    expect(registry.list()).toHaveLength(0);
    expect(registry.has(id1)).toBe(false);
    expect(registry.has(id2)).toBe(false);
    expect(registry.has(id3)).toBe(false);
  });

  test('clear resets ID counter', () => {
    const registry = new PivotRegistryImpl();
    
    const config: PivotConfig = {
      rows: [],
      columns: [],
      values: [],
      sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } },
    };
    
    registry.register({ name: 'P1', config, sourceRange: 'A1:A1', worksheetId: 'ws1' });
    registry.register({ name: 'P2', config, sourceRange: 'A1:A1', worksheetId: 'ws1' });
    
    registry.clear();
    
    const newId = registry.register({ name: 'P3', config, sourceRange: 'A1:A1', worksheetId: 'ws1' });
    
    expect(newId).toBe('pivot-1'); // Counter reset
  });

  test('registry can be reused after clear', () => {
    const registry = new PivotRegistryImpl();
    
    const config: PivotConfig = {
      rows: [],
      columns: [],
      values: [],
      sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } },
    };
    
    registry.register({ name: 'P1', config, sourceRange: 'A1:A1', worksheetId: 'ws1' });
    registry.clear();
    
    const id = registry.register({ name: 'P2', config, sourceRange: 'A1:A1', worksheetId: 'ws1' });
    
    expect(registry.has(id)).toBe(true);
    expect(registry.list()).toHaveLength(1);
  });
});

describe('PivotRegistry - Metadata Integrity', () => {
  test('stored config is deep-equal to original', () => {
    const registry = new PivotRegistryImpl();
    
    const config: PivotConfig = {
      rows: [
        { column: 0, label: 'Product' },
        { column: 1, label: 'Region' },
      ],
      columns: [
        { column: 2, label: 'Quarter' },
      ],
      values: [
        { type: 'aggregate', column: 3, aggregation: 'sum', label: 'Revenue' } as AggregateValueSpec,
        { type: 'aggregate', column: 4, aggregation: 'average', label: 'Avg' } as AggregateValueSpec,
      ],
      sourceRange: { start: { row: 0, col: 0 }, end: { row: 100, col: 5 } },
    };
    
    const id = registry.register({
      name: 'Complex Pivot',
      config,
      sourceRange: 'A1:F101',
      worksheetId: 'ws1',
    });
    
    const meta = registry.get(id);
    
    expect(meta?.config).toEqual(config);
  });

  test('metadata contains no computed data', () => {
    const registry = new PivotRegistryImpl();
    
    const config: PivotConfig = {
      rows: [{ column: 0, label: 'Cat' }],
      columns: [],
      values: [{ type: 'aggregate', column: 1, aggregation: 'sum', label: 'Val' } as AggregateValueSpec],
      sourceRange: { start: { row: 0, col: 0 }, end: { row: 5, col: 1 } },
    };
    
    const id = registry.register({
      name: 'Test',
      config,
      sourceRange: 'A1:B6',
      worksheetId: 'ws1',
    });
    
    const meta = registry.get(id);
    
    // Metadata should only have these fields
    expect(Object.keys(meta ?? {})).toEqual([
      'name',
      'config',
      'sourceRange',
      'worksheetId',
      'id',
      'createdAt',
    ]);
    
    // No computed fields
    expect(meta).not.toHaveProperty('data');
    expect(meta).not.toHaveProperty('result');
    expect(meta).not.toHaveProperty('grid');
  });

  test('createdAt timestamp is set correctly', () => {
    const registry = new PivotRegistryImpl();
    
    const before = Date.now();
    
    const id = registry.register({
      name: 'Test',
      config: { rows: [], columns: [], values: [], sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } } },
      sourceRange: 'A1:A1',
      worksheetId: 'ws1',
    });
    
    const after = Date.now();
    const meta = registry.get(id);
    
    expect(meta?.createdAt).toBeGreaterThanOrEqual(before);
    expect(meta?.createdAt).toBeLessThanOrEqual(after);
  });
});

describe('PivotRegistry - Edge Cases', () => {
  test('handles empty config correctly', () => {
    const registry = new PivotRegistryImpl();
    
    const config: PivotConfig = {
      rows: [],
      columns: [],
      values: [],
      sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } },
    };
    
    const id = registry.register({
      name: 'Empty Pivot',
      config,
      sourceRange: 'A1:A1',
      worksheetId: 'ws1',
    });
    
    const meta = registry.get(id);
    
    expect(meta?.config.rows).toEqual([]);
    expect(meta?.config.columns).toEqual([]);
    expect(meta?.config.values).toEqual([]);
  });

  test('handles multiple pivots on same worksheet', () => {
    const registry = new PivotRegistryImpl();
    
    const config: PivotConfig = {
      rows: [],
      columns: [],
      values: [],
      sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } },
    };
    
    registry.register({ name: 'P1', config, sourceRange: 'A1:A10', worksheetId: 'ws1' });
    registry.register({ name: 'P2', config, sourceRange: 'B1:B10', worksheetId: 'ws1' });
    registry.register({ name: 'P3', config, sourceRange: 'C1:C10', worksheetId: 'ws1' });
    
    const ws1Pivots = registry.list('ws1');
    
    expect(ws1Pivots).toHaveLength(3);
    expect(new Set(ws1Pivots.map(p => p.sourceRange)).size).toBe(3); // All unique ranges
  });

  test('handles unregister in middle of sequence', () => {
    const registry = new PivotRegistryImpl();
    
    const config: PivotConfig = {
      rows: [],
      columns: [],
      values: [],
      sourceRange: { start: { row: 0, col: 0 }, end: { row: 0, col: 0 } },
    };
    
    const id1 = registry.register({ name: 'P1', config, sourceRange: 'A1:A1', worksheetId: 'ws1' });
    const id2 = registry.register({ name: 'P2', config, sourceRange: 'A1:A1', worksheetId: 'ws1' });
    const id3 = registry.register({ name: 'P3', config, sourceRange: 'A1:A1', worksheetId: 'ws1' });
    
    registry.unregister(id2);
    
    expect(registry.has(id1)).toBe(true);
    expect(registry.has(id2)).toBe(false);
    expect(registry.has(id3)).toBe(true);
    expect(registry.list()).toHaveLength(2);
  });
});
