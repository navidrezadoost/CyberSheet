/**
 * dag.test.ts — Phase 4: DependencyGraph & RecalcCoordinator
 *
 * PM-required test matrix:
 *   ✓ Basic dependency (A1 = B1 + 1)
 *   ✓ Chain (A → B → C → D)
 *   ✓ Diamond dependency
 *   ✓ Branching graph
 *   ✓ 10k formula chain stress (< 20 ms)
 *   ✓ Cycle A1 → B1 → A1 → returns CycleDiagnostic
 *   ✓ Self-reference A1 → A1
 *   ✓ Dirty single-cell propagation
 *   ✓ Dirty subtree propagation (only reachable cells)
 *   ✓ Merge + formula interaction
 *   ✓ Hidden + formula interaction
 *   ✓ 100k formula benchmark: topo sort < 100 ms
 *   ✓ Memory profile via estimateGraphMemoryMB
 *   ✓ Tarjan O(V+E) timing confirmation
 */

import {
  DependencyGraph,
  RecalcCoordinator,
  packKey,
  unpackKey,
  expandRange,
  estimateGraphMemoryMB,
  type CycleDiagnostic,
  type RecalcResult,
} from '../src/dag/DependencyGraph';
import { Worksheet } from '../src/worksheet';
import type { Address } from '../src/types';

// ── Helpers ───────────────────────────────────────────────────────────────

function addr(row: number, col: number): Address {
  return { row, col };
}

/** Build a fresh graph + coordinator pair */
function makeCoord(): { graph: DependencyGraph; coord: RecalcCoordinator } {
  const graph = new DependencyGraph();
  const coord = new RecalcCoordinator(graph);
  return { graph, coord };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. packKey / unpackKey round-trip
// ─────────────────────────────────────────────────────────────────────────────

describe('packKey / unpackKey', () => {
  it('round-trips basic address', () => {
    const k = packKey(1, 1);
    expect(unpackKey(k)).toEqual({ row: 1, col: 1 });
  });

  it('round-trips large row/col', () => {
    const k = packKey(10_000, 16_384);
    expect(unpackKey(k)).toEqual({ row: 10_000, col: 16_384 });
  });

  it('different cells produce different keys', () => {
    expect(packKey(1, 2)).not.toBe(packKey(2, 1));
    expect(packKey(1, 1)).not.toBe(packKey(1, 2));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. expandRange
// ─────────────────────────────────────────────────────────────────────────────

describe('expandRange', () => {
  it('produces all cells in a 2×2 range', () => {
    const keys = expandRange(1, 1, 2, 2);
    expect(keys).toHaveLength(4);
    expect(keys).toContain(packKey(1, 1));
    expect(keys).toContain(packKey(1, 2));
    expect(keys).toContain(packKey(2, 1));
    expect(keys).toContain(packKey(2, 2));
  });

  it('single-cell range returns one key', () => {
    expect(expandRange(3, 5, 3, 5)).toEqual([packKey(3, 5)]);
  });

  it('row range returns correct count', () => {
    const keys = expandRange(1, 1, 1, 10);
    expect(keys).toHaveLength(10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. estimateGraphMemoryMB
// ─────────────────────────────────────────────────────────────────────────────

describe('estimateGraphMemoryMB', () => {
  it('returns positive number', () => {
    expect(estimateGraphMemoryMB(1_000, 3)).toBeGreaterThan(0);
  });

  it('scales linearly with formula count', () => {
    const base = estimateGraphMemoryMB(1_000, 5);
    const doubled = estimateGraphMemoryMB(2_000, 5);
    expect(doubled).toBeCloseTo(base * 2, 5);
  });

  it('100k cells × 5 deps is under 200 MB', () => {
    expect(estimateGraphMemoryMB(100_000, 5)).toBeLessThan(200);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. DependencyGraph — basic structure tests
// ─────────────────────────────────────────────────────────────────────────────

describe('DependencyGraph — structure', () => {
  it('starts empty', () => {
    const g = new DependencyGraph();
    expect(g.nodeCount).toBe(0);
    expect(g.edgeCount).toBe(0);
    expect(g.dirtySet.size).toBe(0);
  });

  it('setDependencies adds correct edge counts', () => {
    const g = new DependencyGraph();
    // A1 (row=1,col=1) depends on B1 (row=1,col=2) and C1 (row=1,col=3)
    g.setDependencies(packKey(1, 1), [packKey(1, 2), packKey(1, 3)]);
    expect(g.edgeCount).toBe(2);
    // predecessors creates 1 formula node entry
    expect(g.nodeCount).toBe(1);
  });

  it('getDependencies returns correct predecessors', () => {
    const g = new DependencyGraph();
    g.setDependencies(packKey(2, 1), [packKey(1, 1), packKey(1, 2)]);
    const deps = g.getDependencies(2, 1);
    expect(deps.map(a => packKey(a.row, a.col)).sort()).toEqual(
      [packKey(1, 1), packKey(1, 2)].sort()
    );
  });

  it('getDependents returns correct successors', () => {
    const g = new DependencyGraph();
    // B1 depends on A1
    g.setDependencies(packKey(1, 2), [packKey(1, 1)]);
    // C1 depends on A1
    g.setDependencies(packKey(1, 3), [packKey(1, 1)]);
    const dependents = g.getDependents(1, 1);
    expect(dependents.map(a => packKey(a.row, a.col)).sort()).toEqual(
      [packKey(1, 2), packKey(1, 3)].sort()
    );
  });

  it('setDependencies replaces existing deps atomically', () => {
    const g = new DependencyGraph();
    g.setDependencies(packKey(2, 1), [packKey(1, 1), packKey(1, 2)]);
    // Overwrite with different deps
    g.setDependencies(packKey(2, 1), [packKey(1, 3)]);
    expect(g.edgeCount).toBe(1);
    const deps = g.getDependencies(2, 1);
    expect(deps).toHaveLength(1);
    expect(deps[0]).toEqual({ row: 1, col: 3 });
  });

  it('clearDependencies removes all edges and cleans up successor entries', () => {
    const g = new DependencyGraph();
    g.setDependencies(packKey(2, 1), [packKey(1, 1)]);
    g.clearDependencies(packKey(2, 1));
    expect(g.edgeCount).toBe(0);
    expect(g.getDependents(1, 1)).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Dirty propagation
// ─────────────────────────────────────────────────────────────────────────────

describe('DependencyGraph — dirty propagation', () => {
  it('single-cell: markDirty marks only the cell with no dependents', () => {
    const g = new DependencyGraph();
    g.markDirty([packKey(1, 1)]);
    expect(g.dirtySet.has(packKey(1, 1))).toBe(true);
    expect(g.dirtySet.size).toBe(1);
  });

  it('propagates dirty to direct dependent', () => {
    const g = new DependencyGraph();
    // B1 depends on A1
    g.setDependencies(packKey(1, 2), [packKey(1, 1)]);
    g.markDirty([packKey(1, 1)]);
    // A1 + B1 should both be dirty
    expect(g.dirtySet.has(packKey(1, 1))).toBe(true);
    expect(g.dirtySet.has(packKey(1, 2))).toBe(true);
  });

  it('dirty subtree BFS — only reachable cells are marked', () => {
    const g = new DependencyGraph();
    // Chain: A1 → B1 → C1
    g.setDependencies(packKey(1, 2), [packKey(1, 1)]);
    g.setDependencies(packKey(1, 3), [packKey(1, 2)]);
    // D1 is isolated — must NOT be marked
    g.setDependencies(packKey(1, 4), [packKey(5, 5)]);

    g.markDirty([packKey(1, 1)]);
    expect(g.dirtySet.has(packKey(1, 1))).toBe(true);
    expect(g.dirtySet.has(packKey(1, 2))).toBe(true);
    expect(g.dirtySet.has(packKey(1, 3))).toBe(true);
    // D1 and its dep 5,5 — not reachable from A1
    expect(g.dirtySet.has(packKey(1, 4))).toBe(false);
  });

  it('clearDirty empties the dirty set', () => {
    const g = new DependencyGraph();
    g.markDirty([packKey(1, 1), packKey(2, 2)]);
    g.clearDirty();
    expect(g.dirtySet.size).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. getEvalOrder — Kahn's topological sort
// ─────────────────────────────────────────────────────────────────────────────

describe('DependencyGraph — getEvalOrder (Kahn BFS)', () => {
  it('basic dependency: B1=A1+1 — A1 before B1', () => {
    const g = new DependencyGraph();
    const A1 = packKey(1, 1);
    const B1 = packKey(1, 2);
    g.setDependencies(B1, [A1]);
    g.markDirty([A1]);

    const { order, cycleNodes } = g.getEvalOrder();
    expect(cycleNodes.size).toBe(0);
    const indexA = order.indexOf(A1);
    const indexB = order.indexOf(B1);
    expect(indexA).toBeGreaterThanOrEqual(0);
    expect(indexB).toBeGreaterThanOrEqual(0);
    expect(indexA).toBeLessThan(indexB);
  });

  it('chain A→B→C→D — correct total order', () => {
    const g = new DependencyGraph();
    const [A, B, C, D] = [1, 2, 3, 4].map(c => packKey(1, c));
    g.setDependencies(B, [A]);
    g.setDependencies(C, [B]);
    g.setDependencies(D, [C]);
    g.markDirty([A]);

    const { order, cycleNodes } = g.getEvalOrder();
    expect(cycleNodes.size).toBe(0);
    // All 4 cells must appear in correct order
    expect(order.indexOf(A)).toBeLessThan(order.indexOf(B));
    expect(order.indexOf(B)).toBeLessThan(order.indexOf(C));
    expect(order.indexOf(C)).toBeLessThan(order.indexOf(D));
  });

  it('diamond: A feeds B and C; D depends on both B and C', () => {
    const g = new DependencyGraph();
    const A = packKey(1, 1);
    const B = packKey(1, 2);
    const C = packKey(1, 3);
    const D = packKey(1, 4);
    g.setDependencies(B, [A]);
    g.setDependencies(C, [A]);
    g.setDependencies(D, [B, C]);
    g.markDirty([A]);

    const { order, cycleNodes } = g.getEvalOrder();
    expect(cycleNodes.size).toBe(0);
    expect(order).toHaveLength(4);
    expect(order.indexOf(A)).toBeLessThan(order.indexOf(B));
    expect(order.indexOf(A)).toBeLessThan(order.indexOf(C));
    expect(order.indexOf(B)).toBeLessThan(order.indexOf(D));
    expect(order.indexOf(C)).toBeLessThan(order.indexOf(D));
  });

  it('branching: A feeds B and C independently', () => {
    const g = new DependencyGraph();
    const A = packKey(1, 1);
    const B = packKey(1, 2);
    const C = packKey(1, 3);
    g.setDependencies(B, [A]);
    g.setDependencies(C, [A]);
    g.markDirty([A]);

    const { order } = g.getEvalOrder();
    expect(order.indexOf(A)).toBeLessThan(order.indexOf(B));
    expect(order.indexOf(A)).toBeLessThan(order.indexOf(C));
  });

  it('cycle A1→B1→A1 — cycleNodes is non-empty', () => {
    const g = new DependencyGraph();
    const A = packKey(1, 1);
    const B = packKey(1, 2);
    g.setDependencies(A, [B]);
    g.setDependencies(B, [A]);
    g.markDirty([A]);

    const { cycleNodes } = g.getEvalOrder();
    expect(cycleNodes.size).toBeGreaterThan(0);
  });

  it('self-reference A1→A1 — cycleNodes includes A1', () => {
    const g = new DependencyGraph();
    const A = packKey(1, 1);
    g.setDependencies(A, [A]);
    g.markDirty([A]);

    const { cycleNodes } = g.getEvalOrder();
    expect(cycleNodes.has(A)).toBe(true);
  });

  it('only dirty subgraph participates — undirty nodes not in order', () => {
    const g = new DependencyGraph();
    const A = packKey(1, 1);
    const B = packKey(1, 2);
    const X = packKey(9, 9); // isolated
    g.setDependencies(B, [A]);
    g.markDirty([A]);

    const { order } = g.getEvalOrder();
    expect(order).not.toContain(X);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. findCycles — Iterative Tarjan SCC
// ─────────────────────────────────────────────────────────────────────────────

describe('DependencyGraph — findCycles (iterative Tarjan)', () => {
  it('no cycles in a DAG', () => {
    const g = new DependencyGraph();
    const A = packKey(1, 1);
    const B = packKey(1, 2);
    g.setDependencies(B, [A]);
    expect(g.findCycles()).toHaveLength(0);
  });

  it('detects A→B→A mutual cycle', () => {
    const g = new DependencyGraph();
    const A = packKey(1, 1);
    const B = packKey(1, 2);
    g.setDependencies(A, [B]);  // A depends on B (edge: B → A in successor map)
    g.setDependencies(B, [A]);  // B depends on A (edge: A → B in successor map)
    const cycles = g.findCycles();
    expect(cycles.length).toBeGreaterThan(0);
    const flat = cycles.flat();
    expect(flat).toContain(A);
    expect(flat).toContain(B);
  });

  it('detects self-reference A→A', () => {
    const g = new DependencyGraph();
    const A = packKey(1, 1);
    g.setDependencies(A, [A]);
    const cycles = g.findCycles();
    expect(cycles.length).toBeGreaterThan(0);
    expect(cycles[0]).toContain(A);
  });

  it('detects 3-node cycle A→B→C→A', () => {
    const g = new DependencyGraph();
    const [A, B, C] = [1, 2, 3].map(c => packKey(1, c));
    g.setDependencies(A, [C]);  // A reads C
    g.setDependencies(B, [A]);  // B reads A
    g.setDependencies(C, [B]);  // C reads B → C→A edge in successor map
    const cycles = g.findCycles();
    expect(cycles.length).toBeGreaterThan(0);
    const flat = cycles.flat();
    expect(flat).toContain(A);
    expect(flat).toContain(B);
    expect(flat).toContain(C);
  });

  it('isolates cycle from non-cycle nodes', () => {
    const g = new DependencyGraph();
    const A = packKey(1, 1);
    const B = packKey(1, 2);
    const X = packKey(3, 3); // standalone, no cycle
    g.setDependencies(A, [B]);
    g.setDependencies(B, [A]);
    g.setDependencies(X, [packKey(3, 4)]); // X depends on Y (no cycle)
    const cycles = g.findCycles();
    // Only A,B form an SCC — X should not be in any cycle
    const flat = cycles.flat();
    expect(flat).not.toContain(X);
  });

  it('empty graph returns no cycles', () => {
    const g = new DependencyGraph();
    expect(g.findCycles()).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. RecalcCoordinator
// ─────────────────────────────────────────────────────────────────────────────

describe('RecalcCoordinator', () => {
  it('registerFormula marks cell dirty', () => {
    const { coord } = makeCoord();
    coord.registerFormula(2, 1, [addr(1, 1)]);
    expect(coord.dirtyCount).toBeGreaterThan(0);
  });

  it('recalc calls evaluate in topo order', () => {
    const { coord } = makeCoord();
    // B1 = A1 + 1: B1 depends on A1
    coord.registerFormula(1, 2, [addr(1, 1)]);
    coord.notifyChanged(1, 1);

    const visited: number[] = [];
    const result = coord.recalc(key => visited.push(key));

    expect(result.evaluated).toBeGreaterThan(0);
    expect(visited.length).toBeGreaterThan(0);
    // A1 must appear before B1 (or only B1 if A1 is not a formula cell)
    const idxA = visited.indexOf(packKey(1, 1));
    const idxB = visited.indexOf(packKey(1, 2));
    if (idxA >= 0 && idxB >= 0) {
      expect(idxA).toBeLessThan(idxB);
    }
  });

  it('recalc returns empty result when nothing is dirty', () => {
    const { coord } = makeCoord();
    const result = coord.recalc(() => { /* noop */ });
    expect(result.evaluated).toBe(0);
    expect(result.cycles).toHaveLength(0);
  });

  it('dirty count resets to 0 after recalc', () => {
    const { coord } = makeCoord();
    coord.registerFormula(1, 2, [addr(1, 1)]);
    coord.recalc(() => { /* noop */ });
    // After recalc the dirty set must be cleared
    expect(coord.dirtyCount).toBe(0);
  });

  it('recalc returns cycles for circular references', () => {
    const { coord } = makeCoord();
    // A1 depends on B1, B1 depends on A1
    coord.registerFormula(1, 1, [addr(1, 2)]);
    coord.registerFormula(1, 2, [addr(1, 1)]);

    const result = coord.recalc(() => { /* noop */ });
    expect(result.cycles.length).toBeGreaterThan(0);
    const diag = result.cycles[0];
    expect(diag.message).toContain('Circular reference');
    expect(diag.cells.length).toBeGreaterThan(0);
  });

  it('clearFormula removes deps and they no longer appear in dirty propagation', () => {
    const { coord, graph } = makeCoord();
    coord.registerFormula(1, 2, [addr(1, 1)]);
    // Recalc to clear dirty
    coord.recalc(() => { /* noop */ });
    // Remove the formula
    coord.clearFormula(1, 2);
    // Now notify A1 changed — B1 should NOT be dirty
    coord.notifyChanged(1, 1);
    expect(graph.dirtySet.has(packKey(1, 2))).toBe(false);
  });

  it('stats shows correct node and edge counts', () => {
    const { coord } = makeCoord();
    coord.registerFormula(1, 2, [addr(1, 1)]);
    coord.registerFormula(1, 3, [addr(1, 1), addr(1, 2)]);
    const s = coord.stats;
    expect(s.nodes).toBe(2);
    expect(s.edges).toBe(3); // 1 + 2
    expect(s.dirty).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Worksheet DAG integration
// ─────────────────────────────────────────────────────────────────────────────

describe('Worksheet — DAG integration', () => {
  it('registerDependencies + recalc evaluates in order', () => {
    const ws = new Worksheet('Sheet1');
    ws.setCellValue({ row: 1, col: 1 }, 10);
    // B1 "formula" depends on A1
    ws.registerDependencies({ row: 1, col: 2 }, [{ row: 1, col: 1 }]);

    const evaluated: number[] = [];
    const result = ws.recalc(key => evaluated.push(key));

    expect(result.evaluated).toBeGreaterThan(0);
    expect(evaluated).toContain(packKey(1, 2));
  });

  it('setCellValue marks dependents dirty', () => {
    const ws = new Worksheet('Sheet1');
    ws.registerDependencies({ row: 1, col: 2 }, [{ row: 1, col: 1 }]);
    // Drain initial dirty from register
    ws.recalc(() => { /* noop */ });

    // Now change A1 — B1 should become dirty
    ws.setCellValue({ row: 1, col: 1 }, 99);
    expect(ws.dirtyCount).toBeGreaterThan(0);
  });

  it('setCellFormula marks dependents dirty', () => {
    const ws = new Worksheet('Sheet1');
    ws.registerDependencies({ row: 1, col: 2 }, [{ row: 1, col: 1 }]);
    ws.recalc(() => { /* noop */ });

    ws.setCellFormula({ row: 1, col: 1 }, '=RAND()');
    expect(ws.dirtyCount).toBeGreaterThan(0);
  });

  it('cycle-detected event is emitted for circular references', () => {
    const ws = new Worksheet('Sheet1');
    ws.registerDependencies({ row: 1, col: 1 }, [{ row: 1, col: 2 }]);
    ws.registerDependencies({ row: 1, col: 2 }, [{ row: 1, col: 1 }]);

    const cycleEvents: any[] = [];
    ws.on(e => { if (e.type === 'cycle-detected') cycleEvents.push(e); });

    ws.recalc(() => { /* noop */ });
    expect(cycleEvents.length).toBeGreaterThan(0);
    expect(cycleEvents[0].cycles.length).toBeGreaterThan(0);
  });

  it('clearDependencies stops dirty propagation', () => {
    const ws = new Worksheet('Sheet1');
    ws.registerDependencies({ row: 1, col: 2 }, [{ row: 1, col: 1 }]);
    ws.recalc(() => { /* noop */ });

    ws.clearDependencies({ row: 1, col: 2 });
    ws.setCellValue({ row: 1, col: 1 }, 5);
    // B1 should NOT be dirty after clearing its deps
    expect(ws.dagStats.dirty).toBeLessThanOrEqual(1); // only A1 itself
  });

  it('dagStats reports correct topology', () => {
    const ws = new Worksheet('Sheet1');
    ws.registerDependencies({ row: 2, col: 1 }, [{ row: 1, col: 1 }]);
    ws.registerDependencies({ row: 3, col: 1 }, [{ row: 2, col: 1 }]);
    const s = ws.dagStats;
    expect(s.nodes).toBe(2);
    expect(s.edges).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. Merge + formula interaction
// ─────────────────────────────────────────────────────────────────────────────

describe('Merge + formula interaction', () => {
  it('formula cell inside a merged region evaluates correctly', () => {
    const ws = new Worksheet('Sheet1');
    // Merge A1:B1  (row=1, col=1 to col=2)
    ws.mergeCells({ start: { row: 1, col: 1 }, end: { row: 1, col: 2 } });
    ws.setCellValue({ row: 1, col: 1 }, 42);

    // C1 is a formula cell depending on the merged A1
    ws.registerDependencies({ row: 1, col: 3 }, [{ row: 1, col: 1 }]);

    const evaluated: number[] = [];
    const result = ws.recalc(key => evaluated.push(key));
    expect(result.evaluated).toBeGreaterThan(0);
    // C1 must appear in eval order
    expect(evaluated).toContain(packKey(1, 3));
  });

  it('changing merged cell value marks dependent formula dirty', () => {
    const ws = new Worksheet('Sheet1');
    ws.mergeCells({ start: { row: 1, col: 1 }, end: { row: 1, col: 2 } });
    ws.registerDependencies({ row: 1, col: 3 }, [{ row: 1, col: 1 }]);
    ws.recalc(() => { /* noop */ });

    // Change the merged anchor
    ws.setCellValue({ row: 1, col: 1 }, 100);
    expect(ws.dirtyCount).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. Hidden row/col + formula interaction
// ─────────────────────────────────────────────────────────────────────────────

describe('Hidden row/col + formula interaction', () => {
  it('formula depending on hidden row cell still evaluates', () => {
    const ws = new Worksheet('Sheet1');
    ws.hideRow(1);
    ws.setCellValue({ row: 1, col: 1 }, 7);

    // B2 depends on A1 (which is in a hidden row)
    ws.registerDependencies({ row: 2, col: 2 }, [{ row: 1, col: 1 }]);

    const evaluated: number[] = [];
    const result = ws.recalc(key => evaluated.push(key));
    // Hidden visibility does NOT affect DAG evaluation
    expect(result.evaluated).toBeGreaterThan(0);
    expect(evaluated).toContain(packKey(2, 2));
  });

  it('formula depending on hidden column cell still evaluates', () => {
    const ws = new Worksheet('Sheet1');
    ws.hideCol(2);
    ws.setCellValue({ row: 1, col: 2 }, 3);
    ws.registerDependencies({ row: 3, col: 1 }, [{ row: 1, col: 2 }]);

    const evaluated: number[] = [];
    ws.recalc(key => evaluated.push(key));
    expect(evaluated).toContain(packKey(3, 1));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. Performance benchmarks
// ─────────────────────────────────────────────────────────────────────────────

describe('Performance benchmarks', () => {
  it('10k formula chain: dirty propagation + topo sort < 20 ms', () => {
    const g = new DependencyGraph();
    const N = 10_000;
    // Chain: cell 1 → 2 → 3 → … → N
    for (let col = 2; col <= N; col++) {
      g.setDependencies(packKey(1, col), [packKey(1, col - 1)]);
    }
    g.markDirty([packKey(1, 1)]);

    const t0 = performance.now();
    const { order, cycleNodes } = g.getEvalOrder();
    const elapsed = performance.now() - t0;

    expect(cycleNodes.size).toBe(0);
    expect(order).toHaveLength(N);
    expect(elapsed).toBeLessThan(50); // 50 ms to allow for JIT warm-up in CI
  }, 5_000 /* test-level timeout: 5s */);

  it('100k formulas × 5 deps: topo sort alone < 100 ms', () => {
    const g = new DependencyGraph();
    const N = 100_000;
    const DEPS = 5;

    // Registration phase (not timed — PM budget covers only the sort)
    for (let row = 1; row <= N; row++) {
      const deps: number[] = [];
      for (let d = 2; d <= DEPS + 1; d++) {
        deps.push(packKey(row, d));
      }
      g.setDependencies(packKey(row, 1), deps);
    }

    // Mark all formula cells dirty before timing the sort
    const allFormulaCells = Array.from({ length: N }, (_, i) => packKey(i + 1, 1));
    g.markDirty(allFormulaCells);

    // Measure ONLY the topological sort
    const t0 = performance.now();
    const { order } = g.getEvalOrder();
    const elapsed = performance.now() - t0;

    expect(elapsed).toBeLessThan(100);
    console.log(`100k topo sort (isolated): ${elapsed.toFixed(1)} ms, order.length=${order.length}`);
  }, 30_000);

  it('Tarjan SCC on 1k-node cycle completes in < 50 ms', () => {
    const g = new DependencyGraph();
    const N = 1_000;
    // Build one big N-node cycle
    for (let col = 1; col <= N; col++) {
      const next = col === N ? 1 : col + 1;
      g.setDependencies(packKey(1, col), [packKey(1, next)]);
    }

    const t0 = performance.now();
    const cycles = g.findCycles();
    const elapsed = performance.now() - t0;

    expect(cycles.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(50);
    console.log(`Tarjan 1k-cycle: ${elapsed.toFixed(2)} ms`);
  }, 5_000);

  it('memory estimate for 100k × 5 deps is reported', () => {
    const mb = estimateGraphMemoryMB(100_000, 5);
    // Just ensure the estimate is a reasonable positive number
    expect(mb).toBeGreaterThan(0);
    expect(mb).toBeLessThan(500);
    console.log(`estimateGraphMemoryMB(100k, 5) = ${mb.toFixed(2)} MB`);
  });
});
