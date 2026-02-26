/**
 * DependencyGraph.ts — Formula Dependency DAG Design
 *
 * STATUS: ⚠️ DESIGN — Interfaces and algorithms defined; evaluation engine
 *         not yet wired to Worksheet. Formula parser integration is Phase 4.
 *
 * =============================================================================
 * PROBLEM STATEMENT
 * =============================================================================
 *
 * A spreadsheet is a dataflow graph:
 *   - Node: a cell (or named range, or external data source)
 *   - Edge A → B: cell B's formula contains a reference to cell A
 *                 ("B depends on A" / "A is a predecessor of B")
 *
 * When cell A changes:
 *   1. All cells B s.t. A → B must be recalculated  (direct dependents)
 *   2. All cells C s.t. B → C must then recalculate  (transitive)
 *   3. Order must be correct: calculate A before B before C
 *   4. Cycles (circular references) must be detected and reported
 *
 * Excel model:
 *   - Default: iterative calculation OFF → circular refs are errors
 *   - Optional: iterative calculation ON → limited iteration (max 100)
 *
 * =============================================================================
 * ALGORITHM SELECTION (from CLRS ch. 22–24)
 * =============================================================================
 *
 * Recalc order: TOPOLOGICAL SORT (Kahn's BFS algorithm, CLRS 22.4)
 *   - Time:  O(V + E)  where V = dirty nodes, E = dirty edges
 *   - Space: O(V)  for the in-degree inverse map
 *   - Naturally detects cycles: remaining non-zero in-degree nodes after sort
 *   - Preferred over DFS-based topo-sort for streaming evaluation
 *     (can start evaluating nodes while the BFS front is still advancing)
 *
 * Cycle detection: DFS with tricolour marking (CLRS 22.3)
 *   - Run lazily: only when a cycle error is reported to the user
 *   - Returns all nodes in the cycle for error display
 *   - Alternative: Tarjan's SCC for full cycle enumeration (CLRS 22.5)
 *
 * Dirty propagation: BFS from changed cell set
 *   - Time: O(reachable V + E)
 *   - Uses a simple queue (can use existing Set<number> for visited tracking)
 *
 * =============================================================================
 * DATA STRUCTURES
 * =============================================================================
 *
 * Node representation: packed integer (same as CellStore)
 *   nodeKey = row × 20_000 + col
 *   → Reuses packKey() from CellStore — consistent throughout the engine
 *
 * Adjacency lists:
 *   predecessors: Map<nodeKey, Set<nodeKey>>
 *     "which cells does this cell depend on?"
 *     Built by formula parser at setCellFormula() time.
 *
 *   successors: Map<nodeKey, Set<nodeKey>>
 *     "which cells depend on this cell?"
 *     Inverse of predecessors; maintained bidirectionally on add/remove.
 *     Used for dirty propagation.
 *
 * Memory estimate (10k formulas, each referencing ~3 cells):
 *   10k formula cells = 10k Map entries in predecessors
 *   30k edges (Set<number>) = 30k numbers × 8 bytes = 240 KB
 *   successors (inverse): same = 240 KB
 *   Total: ~480 KB for 10k formula cells → negligible
 *   At 100k formulas × 5 deps each: ~8 MB → still acceptable
 *
 * Volatile registry:
 *   Set<nodeKey> of cells with volatile functions (NOW, RAND, OFFSET, etc.)
 *   Marked dirty at start of every recalc cycle.
 *
 * Named range registry:
 *   Map<string, Set<nodeKey>> — named range → set of cells in that range
 *   When a named range reference is found, expand to constituent cells.
 *
 * =============================================================================
 * EVALUATION PIPELINE
 * =============================================================================
 *
 *  ┌─────────────────────────────────────────────────────────────────────┐
 *  │  1. Cell A mutated (setCellValue / setCellFormula)                   │
 *  │     → dirtySet.add(A)                                               │
 *  │     → propagateDirty(A) — BFS over successors map                   │
 *  │                                                                     │
 *  │  2. Collect dirty subgraph                                          │
 *  │     → all nodes reachable from dirtySet via successors edges         │
 *  │                                                                     │
 *  │  3. Topological sort (Kahn's)                                       │
 *  │     → evalOrder: nodeKey[]  (guaranteed no cycle if dag is acyclic)  │
 *  │     → if cycle detected → mark affected cells with #CIRC! error     │
 *  │                                                                     │
 *  │  4. Evaluate in topological order                                   │
 *  │     → for each node in evalOrder:                                   │
 *  │          value = formulaEngine.evaluate(node, readCell)             │
 *  │          store value in CellStore                                   │
 *  │          emit 'cell-changed' event                                  │
 *  │                                                                     │
 *  │  5. Clear dirtySet                                                  │
 *  └─────────────────────────────────────────────────────────────────────┘
 *
 * =============================================================================
 * ASYNC / INCREMENTAL RECALC (Phase 5+)
 * =============================================================================
 *
 * For WebWorker offloading:
 *   - DependencyGraph runs in the Worker thread
 *   - Cell reads in step 4 are synchronous over a SharedArrayBuffer snapshot
 *   - Results are posted back to main thread via postMessage
 *
 * For incremental recalc (large sheets, >100k formula cells):
 *   - Evaluate only the dirty subgraph
 *   - Already the design: Kahn's only processes dirty nodes (step 3)
 *
 * For streaming recalc (UI responsiveness):
 *   - Yield after every N evaluations using async generator
 *   - evalOrder is a plain array → can be sliced for batching
 */

import { packKey, unpackKey } from '../storage/CellStore';
import type { Address } from '../types';

// ---------------------------------------------------------------------------
// 1. Node key types
// ---------------------------------------------------------------------------

/** A packed integer identifying a cell: row × 20_000 + col */
export type NodeKey = number;

/** Sentinel value for "no node" / "not found" */
export const NO_NODE: NodeKey = -1;

// ---------------------------------------------------------------------------
// 2. DependencyGraph — core structure
// ---------------------------------------------------------------------------

export class DependencyGraph {
  /**
   * predecessors.get(B) = Set of nodeKeys that B depends on.
   * "B reads from each node in this set."
   */
  private readonly predecessors = new Map<NodeKey, Set<NodeKey>>();

  /**
   * successors.get(A) = Set of nodeKeys that depend on A.
   * "When A changes, each node in this set must be recalculated."
   */
  private readonly successors = new Map<NodeKey, Set<NodeKey>>();

  /**
   * Volatile cells: always marked dirty at start of each recalc.
   * Contains cells using: NOW(), TODAY(), RAND(), RANDBETWEEN(),
   * OFFSET() (range varies), INDIRECT() (address varies).
   */
  private readonly volatiles = new Set<NodeKey>();

  /**
   * Cells currently marked as requiring recalculation.
   * Populated by markDirty(); consumed by getEvalOrder().
   */
  private readonly dirtySet = new Set<NodeKey>();

  // ── Edge management ───────────────────────────────────────────────────────

  /**
   * Register the dependencies of a formula cell.
   *
   * Must be called by the formula parser whenever a formula is set or
   * changed. The parser extracts cell references from the formula AST and
   * calls this method with the complete list.
   *
   * @param dependent   The cell containing the formula (B in "B depends on A")
   * @param dependsOn   All cells/ranges referenced by the formula
   *
   * @complexity O(k) where k = |previousDeps| + |dependsOn|
   */
  setDependencies(dependent: NodeKey, dependsOn: readonly NodeKey[]): void {
    // Remove stale predecessors
    const oldPreds = this.predecessors.get(dependent);
    if (oldPreds) {
      for (const pred of oldPreds) {
        this.successors.get(pred)?.delete(dependent);
      }
    }

    // Register new predecessors
    const newPreds = new Set(dependsOn);
    this.predecessors.set(dependent, newPreds);

    // Register inverse edges (successor links)
    for (const pred of newPreds) {
      let suc = this.successors.get(pred);
      if (!suc) {
        suc = new Set<NodeKey>();
        this.successors.set(pred, suc);
      }
      suc.add(dependent);
    }
  }

  /**
   * Remove all dependency edges for a cell (e.g., formula cleared).
   * O(k) where k = number of previous dependencies.
   */
  clearDependencies(node: NodeKey): void {
    const preds = this.predecessors.get(node);
    if (preds) {
      for (const pred of preds) {
        this.successors.get(pred)?.delete(node);
      }
      this.predecessors.delete(node);
    }
  }

  // ── Volatile registration ─────────────────────────────────────────────────

  /** Mark a cell as volatile (recalculated every cycle). */
  setVolatile(node: NodeKey, isVolatile: boolean): void {
    if (isVolatile) this.volatiles.add(node);
    else this.volatiles.delete(node);
  }

  // ── Dirty propagation (BFS) ───────────────────────────────────────────────

  /**
   * Mark a set of cells dirty and propagate to all transitive dependents.
   *
   * Algorithm: BFS over the successors graph.
   * Time: O(V_reachable + E_reachable)
   * Does NOT evaluate — only marks. The caller decides when to evaluate.
   *
   * @param changed  Set of cells that changed (e.g., from a paste/edit)
   */
  markDirty(changed: Iterable<NodeKey>): void {
    // Seed: changed cells + all volatiles
    const queue: NodeKey[] = [];
    for (const node of changed) {
      if (!this.dirtySet.has(node)) {
        this.dirtySet.add(node);
        queue.push(node);
      }
    }
    for (const v of this.volatiles) {
      if (!this.dirtySet.has(v)) {
        this.dirtySet.add(v);
        queue.push(v);
      }
    }

    // BFS propagation
    let head = 0;
    while (head < queue.length) {
      const node = queue[head++];
      const sucSet = this.successors.get(node);
      if (!sucSet) continue;
      for (const suc of sucSet) {
        if (!this.dirtySet.has(suc)) {
          this.dirtySet.add(suc);
          queue.push(suc);
        }
      }
    }
  }

  // ── Topological sort (Kahn's BFS, CLRS §22.4) ────────────────────────────

  /**
   * Compute the evaluation order for all dirty cells.
   *
   * Uses Kahn's algorithm restricted to the dirty subgraph:
   *   1. Build in-degree map for dirty nodes (counting only dirty predecessors)
   *   2. Seed queue with nodes whose in-degree = 0 (no dirty predecessors)
   *   3. Process queue: emit node, decrement in-degree of dirty successors
   *   4. Repeat until queue empty
   *   5. Any remaining dirty nodes with in-degree > 0 form a cycle
   *
   * @returns { order: NodeKey[], cycles: NodeKey[][] }
   *   order:  topological eval order (no cycles included)
   *   cycles: sets of nodes involved in circular references (may be empty)
   *
   * @complexity O(V_dirty + E_dirty)
   */
  getEvalOrder(): { order: NodeKey[]; cycleNodes: Set<NodeKey> } {
    const dirty = this.dirtySet;
    if (dirty.size === 0) return { order: [], cycleNodes: new Set() };

    // Build in-degree within dirty subgraph
    const inDegree = new Map<NodeKey, number>();
    for (const node of dirty) {
      inDegree.set(node, 0);
    }
    for (const node of dirty) {
      const sucSet = this.successors.get(node);
      if (!sucSet) continue;
      for (const suc of sucSet) {
        if (dirty.has(suc)) {
          inDegree.set(suc, (inDegree.get(suc) ?? 0) + 1);
        }
      }
    }

    // Seed queue: nodes with no dirty predecessors
    const queue: NodeKey[] = [];
    for (const [node, deg] of inDegree) {
      if (deg === 0) queue.push(node);
    }

    const order: NodeKey[] = [];
    let head = 0;

    while (head < queue.length) {
      const node = queue[head++];
      order.push(node);
      const sucSet = this.successors.get(node);
      if (!sucSet) continue;
      for (const suc of sucSet) {
        if (!dirty.has(suc)) continue;
        const newDeg = (inDegree.get(suc) ?? 0) - 1;
        inDegree.set(suc, newDeg);
        if (newDeg === 0) queue.push(suc);
      }
    }

    // Nodes still in dirty but not in order → involved in a cycle
    const cycleNodes = new Set<NodeKey>();
    for (const node of dirty) {
      if (!order.includes(node)) cycleNodes.add(node);
    }

    return { order, cycleNodes };
  }

  /** Clear the dirty set after evaluation completes. */
  clearDirty(): void {
    this.dirtySet.clear();
  }

  // ── Cycle detection via DFS tricolour marking (CLRS §22.3) ───────────────

  /**
   * Find all nodes participating in cycles using DFS.
   *
   * Returns a list of strongly connected components (SCCs) that form cycles.
   * Each SCC with size > 1, or any node with a self-edge, constitutes a cycle.
   *
   * Uses Tarjan's SCC algorithm: O(V + E).
   *
   * Called lazily when getEvalOrder() reports cycleNodes.size > 0.
   */
  findCycles(): NodeKey[][] {
    const index = new Map<NodeKey, number>();
    const lowLink = new Map<NodeKey, number>();
    const onStack = new Set<NodeKey>();
    const stack: NodeKey[] = [];
    const sccs: NodeKey[][] = [];
    let counter = 0;

    const allNodes = new Set([...this.predecessors.keys(), ...this.successors.keys()]);

    const strongconnect = (v: NodeKey): void => {
      index.set(v, counter);
      lowLink.set(v, counter);
      counter++;
      stack.push(v);
      onStack.add(v);

      const sucSet = this.successors.get(v);
      if (sucSet) {
        for (const w of sucSet) {
          if (!index.has(w)) {
            strongconnect(w);
            lowLink.set(v, Math.min(lowLink.get(v)!, lowLink.get(w)!));
          } else if (onStack.has(w)) {
            lowLink.set(v, Math.min(lowLink.get(v)!, index.get(w)!));
          }
        }
      }

      if (lowLink.get(v) === index.get(v)) {
        const scc: NodeKey[] = [];
        let w: NodeKey;
        do {
          w = stack.pop()!;
          onStack.delete(w);
          scc.push(w);
        } while (w !== v);
        if (scc.length > 1) sccs.push(scc);
      }
    };

    for (const node of allNodes) {
      if (!index.has(node)) strongconnect(node);
    }

    return sccs;
  }

  // ── Diagnostics ───────────────────────────────────────────────────────────

  /** Total number of formula cells registered. */
  get nodeCount(): number {
    return this.predecessors.size;
  }

  /** Total number of dependency edges. */
  get edgeCount(): number {
    let total = 0;
    for (const s of this.predecessors.values()) total += s.size;
    return total;
  }

  /** Get the predecessors (dependencies) of a cell, as Address objects. */
  getDependencies(row: number, col: number): Address[] {
    const preds = this.predecessors.get(packKey(row, col));
    if (!preds) return [];
    return [...preds].map(unpackKey);
  }

  /** Get the successors (dependents) of a cell, as Address objects. */
  getDependents(row: number, col: number): Address[] {
    const sucSet = this.successors.get(packKey(row, col));
    if (!sucSet) return [];
    return [...sucSet].map(unpackKey);
  }
}

// ---------------------------------------------------------------------------
// 3. RecalcCoordinator — wires DependencyGraph to Worksheet (future)
// ---------------------------------------------------------------------------

/**
 * Evaluation function signature.
 * Provided by the formula engine (e.g., FormulaEngine.evaluate()).
 */
export type EvalFn = (addr: Address) => unknown;

/**
 * RecalcCoordinator manages the full recalculation pipeline.
 *
 * STATUS: Skeleton only. Full integration is Phase 4.
 *
 * Responsibilities:
 *   1. When setCellFormula() is called:
 *      a. Parse formula → extract cell references
 *      b. Register dependencies via graph.setDependencies()
 *      c. mark cell dirty
 *   2. When setCellValue() mutates a cell:
 *      a. graph.markDirty([cell])
 *   3. When recalc is triggered (sync or async):
 *      a. graph.getEvalOrder()
 *      b. Evaluate each node in order via evalFn
 *      c. Store results back in CellStore
 *      d. Emit events for dirty cells
 *   4. On cycle detection:
 *      a. Mark cycled cells with #CIRC! error value
 *      b. Emit 'cycle-detected' event with affected addresses
 */
export class RecalcCoordinator {
  private readonly graph = new DependencyGraph();

  constructor(private readonly evalFn: EvalFn) {}

  /** Record formula dependencies parsed from a formula string. */
  registerFormula(row: number, col: number, deps: Address[]): void {
    const key = packKey(row, col);
    const depKeys = deps.map(d => packKey(d.row, d.col));
    this.graph.setDependencies(key, depKeys);
    this.graph.markDirty([key]);
  }

  /** Mark a constant cell as changed. */
  notifyChanged(row: number, col: number): void {
    this.graph.markDirty([packKey(row, col)]);
  }

  /**
   * Run a full synchronous recalculation of all dirty cells.
   *
   * Returns { evaluated: Address[], cycles: Address[][] }
   */
  recalcSync(): { evaluated: Address[]; cycles: Address[][] } {
    const { order, cycleNodes } = this.graph.getEvalOrder();

    const evaluated: Address[] = [];
    for (const key of order) {
      const addr = unpackKey(key);
      this.evalFn(addr);
      evaluated.push(addr);
    }

    const cycles = this.graph.findCycles().map(scc => scc.map(unpackKey));

    this.graph.clearDirty();
    return { evaluated, cycles };
  }

  get stats(): { nodes: number; edges: number; dirty: number } {
    return {
      nodes: this.graph.nodeCount,
      edges: this.graph.edgeCount,
      dirty: 0, // dirtySet is private; expose via graph method if needed
    };
  }
}

// ---------------------------------------------------------------------------
// 4. Range dependency expansion utilities
// ---------------------------------------------------------------------------

/**
 * Expand a rectangular range into individual NodeKeys.
 *
 * A formula like =SUM(A1:C3) creates edges from every cell in A1:C3
 * to the formula cell. This function generates all those NodeKeys.
 *
 * For very large ranges (e.g., =SUM(A:A) → 1M cells), we use a
 * "range node" abstraction instead of expanding (Phase 4 detail).
 *
 * @param r1 Start row (1-based)
 * @param c1 Start col (1-based)
 * @param r2 End row (1-based, inclusive)
 * @param c2 End col (1-based, inclusive)
 */
export function expandRange(r1: number, c1: number, r2: number, c2: number): NodeKey[] {
  const keys: NodeKey[] = [];
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      keys.push(packKey(r, c));
    }
  }
  return keys;
}

/**
 * Estimate memory for a dependency graph at given scale.
 *
 * Inputs: number of formula cells (V), average deps per formula (k)
 * Outputs: memory estimate in MB
 *
 * Memory model:
 *   Map<NodeKey, Set<NodeKey>> predecessor entry: ~88 bytes (Map slot + Set obj)
 *   Each dep in Set: ~8 bytes (number pointer in Set)
 *   Successor entries: same × 2 (bidirectional)
 *   Total: V × (88 + k × 8) × 2 bytes
 */
export function estimateGraphMemoryMB(formulaCells: number, avgDeps: number): number {
  const bytesPerNode = (88 + avgDeps * 8) * 2;
  return (formulaCells * bytesPerNode) / (1024 * 1024);
}
