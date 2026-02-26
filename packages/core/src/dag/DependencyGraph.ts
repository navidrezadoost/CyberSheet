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
 *   Phase 6 EdgeList: 30k edges × 4 bytes = 120 KB (vs 960 KB with Set)
 *   successors (inverse): same = 120 KB
 *   Total: ~240 KB for 10k formula cells (4× improvement over Set)
 *   At 100k formulas × 5 deps each: ~4 MB (vs ~16 MB previously)
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

import { packKey, unpackKey, COL_MULT } from '../storage/CellStoreV1';
import type { Address, CellValue } from '../types';
export { packKey, unpackKey, COL_MULT };

// ---------------------------------------------------------------------------
// Exported result types (used by Worksheet and tests)
// ---------------------------------------------------------------------------

/** Information about a detected circular reference. */
export type CycleDiagnostic = {
  /** Packed node keys forming the cycle. */
  cycle: NodeKey[];
  /** Address representation of cycle cells. */
  cells: Address[];
  /** Human-readable message for UI / logging. */
  message: string;
};

/** Result of a single recalculation pass from RecalcCoordinator. */
export type RecalcResult = {
  /** Number of formula cells evaluated this pass. */
  evaluated: number;
  /** Cycle diagnostics — empty when no circular references. */
  cycles: CycleDiagnostic[];
};

// ---------------------------------------------------------------------------
// Phase 5: Volatile & Iterative recalculation types
// ---------------------------------------------------------------------------

/**
 * Algorithm for resolving circular references during iterative recalc.
 *
 * gauss-seidel  — updates each cell's value immediately in-order; uses the
 *                 freshest values as soon as they're computed. Faster convergence
 *                 for most spreadsheet patterns (Excel default).
 * jacobi        — evaluates all cells using the *previous* iteration's values,
 *                 then applies all updates at once.  More stable for strongly
 *                 coupled cycles; requires 2× memory (old + new value maps).
 */
export type RecalcAlgorithm = 'gauss-seidel' | 'jacobi';

/**
 * Scheduler-level policy for iterative circular-reference resolution.
 *
 * Separate from the formula-level IterationPolicy (newton/bisection for
 * individual functions like IRR, YIELD).  This type controls how the
 * RecalcCoordinator handles *sheet-wide* circular references.
 */
export type RecalcIterationPolicy = {
  /** Maximum recalc passes for cycle nodes (Excel default: 100). */
  maxIterations: number;
  /** Stop iterating when max|Δvalue| < tolerance (Excel default: 0.001). */
  tolerance: number;
  /** Solver algorithm — affects convergence speed and memory usage. */
  algorithm: RecalcAlgorithm;
};

/** Standard defaults mirroring Excel's iterative calculation settings. */
export const DEFAULT_RECALC_ITERATION_POLICY: RecalcIterationPolicy = {
  maxIterations: 100,
  tolerance: 0.001,
  algorithm: 'gauss-seidel',
};

/**
 * Result of an iterative recalculation pass.
 * Extends RecalcResult with convergence metadata.
 */
export type IterativeRecalcResult = RecalcResult & {
  /** Total number of iteration passes performed (1 = single-pass, acyclic). */
  iterations: number;
  /** Whether the cycle nodes converged within the tolerance threshold. */
  converged: boolean;
  /** Maximum absolute delta observed on the final iteration. 0 if acyclic. */
  maxDelta: number;
};

// ---------------------------------------------------------------------------
// 1. Node key types
// ---------------------------------------------------------------------------

/** A packed integer identifying a cell: row × 20_000 + col */
export type NodeKey = number;

/** Sentinel value for "no node" / "not found" */
export const NO_NODE: NodeKey = -1;

// ---------------------------------------------------------------------------
// 1b. EdgeList — compact Uint32Array-backed adjacency list
// ---------------------------------------------------------------------------

/**
 * Compact, resizable Uint32Array-backed adjacency list for DAG edges.
 *
 * Replaces `Set<NodeKey>` in the predecessor/successor maps, reducing memory
 * per edge from ~32 bytes (JS Set hash-table overhead + pointer boxing) to
 * 4 bytes (Uint32 element in a typed array).
 *
 * Safe key range: packKey(row, col) = row × 20_000 + col.
 * Uint32 max = 4 294 967 295 ÷ 20 000 = 214 748 rows — covers all practical
 * spreadsheet sizes (Excel practical max ~65 535 rows).
 *
 * Design decisions:
 *   - Initial capacity 4 → amortised O(1) append via doubling.
 *   - Dedup on add (linear scan, O(n)) — adjacency lists are small (1–20 deps).
 *   - Swap-remove on delete (O(n) find + O(1) remove) — order not significant.
 *   - Iterator snapshots `_size` at creation time; safe against concurrent
 *     reads but not concurrent mutations (no concurrent mutation in engine).
 */
export class EdgeList implements Iterable<NodeKey> {
  /** Backing typed buffer. May be grown on demand. */
  private buf: Uint32Array;
  /** Number of valid elements at [0.._size). */
  private _size = 0;

  constructor(initialCapacity = 4) {
    this.buf = new Uint32Array(Math.max(4, initialCapacity));
  }

  /** Create an EdgeList populated from an existing key array. O(n). */
  static from(keys: readonly NodeKey[]): EdgeList {
    const el = new EdgeList(Math.max(4, keys.length));
    for (const k of keys) el.add(k);
    return el;
  }

  /** Number of edges stored. O(1). */
  get size(): number { return this._size; }

  /**
   * O(n) membership test — acceptable for typical adjacency list sizes (1–20).
   * For large spill-range formulas (>64 deps) the linear scan is still fast
   * compared to the cost of evaluating the cell.
   */
  has(key: NodeKey): boolean {
    const { buf, _size } = this;
    for (let i = 0; i < _size; i++) if (buf[i] === key) return true;
    return false;
  }

  /**
   * Amortised O(1) add with dedup.
   * Grows the backing buffer (doubles) when full.
   */
  add(key: NodeKey): this {
    if (this.has(key)) return this;
    if (this._size === this.buf.length) this._grow();
    this.buf[this._size++] = key;
    return this;
  }

  /**
   * O(n) delete using swap-remove (does not preserve insertion order).
   * @returns true if the key was present and removed.
   */
  delete(key: NodeKey): boolean {
    const { buf } = this;
    for (let i = 0; i < this._size; i++) {
      if (buf[i] === key) {
        buf[i] = buf[--this._size]; // swap last element into the gap
        return true;
      }
    }
    return false;
  }

  /** Iterate over all stored keys. Snapshot semantics on _size. */
  [Symbol.iterator](): Iterator<NodeKey> {
    let i = 0;
    const snap = this._size;
    const self = this;
    return {
      next(): IteratorResult<NodeKey> {
        if (i < snap) return { value: self.buf[i++], done: false };
        return { value: 0, done: true };
      },
    };
  }

  private _grow(): void {
    const next = new Uint32Array(this.buf.length * 2);
    next.set(this.buf);
    this.buf = next;
  }
}

// ---------------------------------------------------------------------------
// 2. DependencyGraph — core structure
// ---------------------------------------------------------------------------

export class DependencyGraph {
  /**
   * predecessors.get(B) = EdgeList of nodeKeys that B depends on.
   * "B reads from each node in this list."
   * Phase 6: backed by Uint32Array — 4 bytes/edge vs ~32 bytes in Set.
   */
  private readonly predecessors = new Map<NodeKey, EdgeList>();

  /**
   * successors.get(A) = EdgeList of nodeKeys that depend on A.
   * "When A changes, each node in this list must be recalculated."
   * Phase 6: backed by Uint32Array — bidirectional inverse of predecessors.
   */
  private readonly successors = new Map<NodeKey, EdgeList>();

  /**
   * Volatile cells: always marked dirty at start of each recalc.
   * Contains cells using: NOW(), TODAY(), RAND(), RANDBETWEEN(),
   * OFFSET() (range varies), INDIRECT() (address varies).
   */
  private readonly volatiles = new Set<NodeKey>();

  /**
   * Cells currently marked as requiring recalculation.
   * Populated by markDirty(); consumed by getEvalOrder().
   *
   * Exposed as readonly to RecalcCoordinator for dirtyCount checks.
   * External consumers MUST NOT mutate this set.
   */
  readonly dirtySet = new Set<NodeKey>();

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

    // Register new predecessors (EdgeList — 4 bytes/edge, typed buffer)
    const newPreds = EdgeList.from(dependsOn);
    this.predecessors.set(dependent, newPreds);

    // Register inverse edges (successor links)
    for (const pred of newPreds) {
      let suc = this.successors.get(pred);
      if (!suc) {
        suc = new EdgeList();
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

  /** Number of cells currently registered as volatile. O(1). */
  get volatileCount(): number {
    return this.volatiles.size;
  }

  /**
   * Seed all registered volatile cells into the dirty set and BFS-propagate.
   * Call this at the start of each render tick / explicit refresh to ensure
   * volatile cells (NOW, RAND, etc.) are re-evaluated.
   *
   * Equivalent to markDirty([]) — the empty-seed markDirty already picks up
   * all volatiles, so this is a named convenience wrapper.
   *
   * @complexity O(V_volatile_reach + E_volatile_reach) — BFS propagation
   */
  flushVolatiles(): void {
    if (this.volatiles.size > 0) this.markDirty([]);
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
    const inOrder = new Set<NodeKey>(); // O(1) membership for cycle detection
    let head = 0;

    while (head < queue.length) {
      const node = queue[head++];
      order.push(node);
      inOrder.add(node);
      const sucSet = this.successors.get(node);
      if (!sucSet) continue;
      for (const suc of sucSet) {
        if (!dirty.has(suc)) continue;
        const newDeg = (inDegree.get(suc) ?? 0) - 1;
        inDegree.set(suc, newDeg);
        if (newDeg === 0) queue.push(suc);
      }
    }

    // Nodes still in dirty but not emitted → involved in a cycle
    const cycleNodes = new Set<NodeKey>();
    for (const node of dirty) {
      if (!inOrder.has(node)) cycleNodes.add(node);
    }

    return { order, cycleNodes };
  }

  /** Clear the dirty set after evaluation completes. */
  clearDirty(): void {
    this.dirtySet.clear();
  }

  // ── Cycle detection — Iterative Tarjan SCC (CLRS §22.5) ─────────────────
  //
  // PM requirement: No recursive DFS. All graph algorithms must be iterative.
  //
  // Tarjan's algorithm finds all Strongly Connected Components (SCCs) in O(V+E).
  // An SCC of size > 1 (or a single node with a self-loop) is a cycle.
  //
  // Iterative implementation uses an explicit work-stack where each frame
  // stores the pre-collected successor array and a child-index pointer (ci).
  // After returning from a child we simply increment ci and continue — no
  // iterator state to manage, provably correct.

  /**
   * Find all cycles (as SCCs) in the full graph using iterative Tarjan.
   *
   * Returns each SCC that constitutes a circular reference:
   *   - Array length > 1: mutual reference (A→B→A or longer chain)
   *   - Array length === 1 with self-edge: self-reference (A=A+1)
   *
   * @complexity O(V + E) — iterative, no stack overflow risk.
   */
  findCycles(): NodeKey[][] {
    const indexMap = new Map<NodeKey, number>();
    const lowLink  = new Map<NodeKey, number>();
    const onStack  = new Set<NodeKey>();
    const sccStack: NodeKey[] = [];
    const result: NodeKey[][] = [];
    let counter = 0;

    const allNodes = new Set<NodeKey>();
    for (const k of this.predecessors.keys()) allNodes.add(k);
    for (const k of this.successors.keys())   allNodes.add(k);

    /**
     * Work-stack frame.
     * `children` is the pre-collected successor array so we can index into it.
     * `ci` (child index) tracks which successor to process next.
     */
    type Frame = { v: NodeKey; children: NodeKey[]; ci: number };
    const workStack: Frame[] = [];

    /** Perform the Tarjan 'enter' setup and push a new frame. */
    const push = (v: NodeKey): void => {
      indexMap.set(v, counter);
      lowLink.set(v, counter);
      counter++;
      sccStack.push(v);
      onStack.add(v);
      const sucSet = this.successors.get(v);
      workStack.push({ v, children: sucSet ? [...sucSet] : [], ci: 0 });
    };

    for (const startNode of allNodes) {
      if (indexMap.has(startNode)) continue;

      push(startNode);

      outer: while (workStack.length > 0) {
        const frame = workStack[workStack.length - 1];
        const { v, children } = frame;

        // Advance through un-processed successors
        while (frame.ci < children.length) {
          const w = children[frame.ci];
          frame.ci++;

          if (!indexMap.has(w)) {
            // Tree edge: push child and restart the outer loop for it
            push(w);
            continue outer;
          } else if (onStack.has(w)) {
            // Back edge: w is an ancestor — update lowLink
            lowLink.set(v, Math.min(lowLink.get(v)!, indexMap.get(w)!));
          }
          // Forward/cross edge: no update needed
        }

        // All successors processed — pop this frame
        workStack.pop();

        // Propagate lowLink up to the parent before leaving
        if (workStack.length > 0) {
          const pv = workStack[workStack.length - 1].v;
          lowLink.set(pv, Math.min(lowLink.get(pv)!, lowLink.get(v)!));
        }

        // If v is an SCC root, drain sccStack
        if (lowLink.get(v) === indexMap.get(v)) {
          const scc: NodeKey[] = [];
          let w: NodeKey;
          do {
            w = sccStack.pop()!;
            onStack.delete(w);
            scc.push(w);
          } while (w !== v);

          // Report only real cycles
          if (scc.length > 1) {
            result.push(scc);
          } else {
            // Single-node SCC: only a cycle if self-loop exists
            const selfSuccs = this.successors.get(scc[0]);
            if (selfSuccs?.has(scc[0])) result.push(scc);
          }
        }
      }
    }

    return result;
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
 * Evaluation function signature — called once per formula cell per recalc pass.
 * The key is a packed integer; unpackKey(key) → { row, col }.
 */
export type EvalFn = (key: NodeKey) => void;

// ---------------------------------------------------------------------------
// RecalcCoordinator — Phase 4 production implementation
// ---------------------------------------------------------------------------

/**
 * RecalcCoordinator manages the full recalculation pipeline.
 *
 * Responsibilities:
 *   1. registerFormula  — store dependency edges; mark cell dirty
 *   2. notifyChanged    — mark a value cell dirty; propagate to dependents
 *   3. recalc           — propagate dirty (BFS) → topo sort (Kahn) →
 *                         evaluate in order; detect cycles (Tarjan); bounded
 *
 * Guarantees:
 *   - Deterministic: same graph + same dirty set → same eval order
 *   - Bounded: each cell evaluated exactly once per pass
 *   - Non-recursive: no call-stack growth with graph size
 *   - Cycle-safe: cycle nodes receive #CIRC! but do NOT halt clean-path eval
 *
 * @complexity recalc: O(V_dirty + E_dirty)  (Kahn + BFS propagation)
 */
export class RecalcCoordinator {
  /**
   * @param graph  The shared DependencyGraph (same instance used by Worksheet).
   */
  constructor(readonly graph: DependencyGraph) {}

  // ── Registration ─────────────────────────────────────────────────────────

  /**
   * Register the complete dependency list for a formula cell.
   * Replaces any previously registered dependencies for this cell.
   * Also marks the formula cell dirty (its value must be recalculated).
   *
   * Call this from Worksheet.registerDependencies().
   */
  registerFormula(row: number, col: number, deps: Address[]): void {
    const key     = packKey(row, col);
    const depKeys = deps.map(d => packKey(d.row, d.col));
    this.graph.setDependencies(key, depKeys);
    this.graph.markDirty([key]);
  }

  /**
   * Remove all dependency edges for a formula cell
   * (called when a formula is deleted, or before re-registration on edit).
   */
  clearFormula(row: number, col: number): void {
    this.graph.clearDependencies(packKey(row, col));
  }

  /**
   * Mark a cell (typically a value cell) as changed.
   * The graph propagates dirtiness to all formula cells that read this cell.
   *
   * @complexity O(V_reachable + E_reachable) — BFS inside graph.markDirty
   */
  notifyChanged(row: number, col: number): void {
    this.graph.markDirty([packKey(row, col)]);
  }

  /** Dirty count — number of cells awaiting evaluation. O(1). */
  get dirtyCount(): number {
    return this.graph.dirtySet.size;
  }

  // ── Recalculation pipeline ────────────────────────────────────────────────

  /**
   * Execute one full synchronous recalculation pass.
   *
   * Pipeline:
   *   1. graph.getEvalOrder()  → Kahn topo sort over dirty subgraph
   *   2. evaluate each key in topo order via the provided callback
   *   3. If cycleNodes found → run findCycles() to get SCC diagnostics
   *   4. graph.clearDirty()
   *
   * @param evaluate  Called once per dirty formula cell, in correct eval order.
   *                  Receives the packed NodeKey; use unpackKey(key) for Address.
   *
   * @returns RecalcResult with count of evaluated cells and cycle diagnostics.
   */
  recalc(evaluate: EvalFn): RecalcResult {
    if (this.graph.dirtySet.size === 0) return { evaluated: 0, cycles: [] };

    const { order, cycleNodes } = this.graph.getEvalOrder();

    // Evaluate clean cells in topological order
    for (const key of order) {
      evaluate(key);
    }

    // Build cycle diagnostics for nodes in cycles
    const cycleDiags: CycleDiagnostic[] = [];
    if (cycleNodes.size > 0) {
      const sccs = this.graph.findCycles();
      for (const scc of sccs) {
        const cells = scc.map(k => unpackKey(k));
        cycleDiags.push({
          cycle: scc,
          cells,
          message: `Circular reference: ${cells.map(a => `R${a.row}C${a.col}`).join(' → ')}`,
        });
      }
    }

    this.graph.clearDirty();
    return { evaluated: order.length, cycles: cycleDiags };
  }

  // ── Volatile registration (Phase 5) ─────────────────────────────────────

  /**
   * Register a formula cell as volatile.
   *
   * A volatile cell is re-evaluated on every recalc pass regardless of whether
   * its dependencies changed.  Typical volatile functions: NOW, TODAY, RAND,
   * RANDBETWEEN, INDIRECT, OFFSET, INFO, CELL.
   *
   * Internally: calls setDependencies + setVolatile(true) + markDirty.
   */
  registerVolatile(row: number, col: number, deps: Address[]): void {
    const key     = packKey(row, col);
    const depKeys = deps.map(d => packKey(d.row, d.col));
    this.graph.setDependencies(key, depKeys);
    this.graph.setVolatile(key, true);
    this.graph.markDirty([key]);
  }

  /**
   * Unregister a cell's volatile flag and remove its dependency edges.
   * Call this when a formula containing a volatile function is deleted or
   * replaced with a plain value.
   */
  clearVolatile(row: number, col: number): void {
    const key = packKey(row, col);
    this.graph.setVolatile(key, false);
    this.graph.clearDependencies(key);
  }

  /**
   * Flush all volatile cells into the dirty set and propagate dirtiness.
   *
   * Call this at the start of each render frame (e.g., in a 1-second timer
   * for a live clock) to ensure NOW, RAND, etc. are recalculated.
   *
   * @complexity O(V_volatile_reach + E_volatile_reach)
   */
  flushVolatiles(): void {
    this.graph.flushVolatiles();
  }

  /** Number of cells registered as volatile. */
  get volatileCount(): number {
    return this.graph.volatileCount;
  }

  // ── Iterative recalculation (Phase 5) ────────────────────────────────────

  /**
   * Execute an iterative recalculation pass that resolves circular references.
   *
   * Pipeline:
   *   1. Kahn topo sort → evalOrder (acyclic nodes) + cycleNodes
   *   2. Evaluate all acyclic nodes once in topological order (stable values)
   *   3. If no cycle nodes → done (single pass, converged = true)
   *   4. Otherwise:
   *      For iter in 1..policy.maxIterations:
   *        a. Evaluate all cycle nodes (Gauss-Seidel: in-place, or Jacobi: batch)
   *        b. Measure max|new - prev| for numeric values
   *        c. If maxDelta < policy.tolerance → converged, break
   *   5. If not converged after maxIterations → build CycleDiagnostics
   *   6. clearDirty
   *
   * @param evaluate  Called once per formula cell per pass.
   *                  Must return the NEW cell value so convergence can be tracked.
   *                  Non-numeric return values (string, boolean, null) are treated
   *                  as always-converged for that cell.
   *
   * @param policy    Optional override; defaults to DEFAULT_RECALC_ITERATION_POLICY.
   *
   * @complexity  Acyclic pass: O(V_dirty + E_dirty).
   *              Iterative pass: O(V_cycle × maxIterations) in the worst case.
   */
  recalcIterative(
    evaluate: (key: NodeKey) => CellValue,
    policy: RecalcIterationPolicy = DEFAULT_RECALC_ITERATION_POLICY,
  ): IterativeRecalcResult {
    if (this.graph.dirtySet.size === 0) {
      return { evaluated: 0, cycles: [], iterations: 0, converged: true, maxDelta: 0 };
    }

    const { order, cycleNodes } = this.graph.getEvalOrder();

    // Pass 1: evaluate all acyclic (topologically ordered) cells exactly once.
    // These cells have stable values — their predecessors are always evaluated first.
    for (const key of order) evaluate(key);
    let evaluated = order.length;

    // Fast path: no cycles
    if (cycleNodes.size === 0) {
      this.graph.clearDirty();
      return { evaluated, cycles: [], iterations: 1, converged: true, maxDelta: 0 };
    }

    // Iterative path: cycle nodes need repeated evaluation until convergence.
    const cycleNodeList = [...cycleNodes];
    const prevValues = new Map<NodeKey, number>();
    // Initialise with NaN so first iteration always contributes to maxDelta
    for (const key of cycleNodeList) prevValues.set(key, NaN);

    let iterations    = 0;
    let converged     = false;
    let maxDelta      = Infinity;

    for (let iter = 0; iter < policy.maxIterations; iter++) {
      iterations++;
      maxDelta = 0;

      if (policy.algorithm === 'jacobi') {
        // Jacobi: collect NEW values using OLD state, then apply all at once.
        const newValues = new Map<NodeKey, CellValue>();
        for (const key of cycleNodeList) {
          newValues.set(key, evaluate(key));
          evaluated++;
        }
        for (const key of cycleNodeList) {
          const nv = newValues.get(key);
          if (typeof nv === 'number') {
            const prev = prevValues.get(key)!;
            const delta = Math.abs(nv - (isNaN(prev) ? 0 : prev));
            if (delta > maxDelta) maxDelta = delta;
            prevValues.set(key, nv);
          }
        }
      } else {
        // Gauss-Seidel: update in-place (default — faster convergence).
        for (const key of cycleNodeList) {
          const nv = evaluate(key);
          evaluated++;
          if (typeof nv === 'number') {
            const prev = prevValues.get(key)!;
            const delta = Math.abs(nv - (isNaN(prev) ? 0 : prev));
            if (delta > maxDelta) maxDelta = delta;
            prevValues.set(key, nv);
          }
        }
      }

      if (maxDelta < policy.tolerance) {
        converged = true;
        break;
      }
    }

    // Build cycle diagnostics for non-converged results.
    const cycleDiags: CycleDiagnostic[] = [];
    if (!converged) {
      const sccs = this.graph.findCycles();
      for (const scc of sccs) {
        const cells = scc.map(k => unpackKey(k));
        cycleDiags.push({
          cycle: scc,
          cells,
          message: [
            `Circular reference (not converged after ${iterations} iteration`,
            iterations === 1 ? '' : 's',
            `): `,
            cells.map(a => `R${a.row}C${a.col}`).join(' → '),
          ].join(''),
        });
      }
    }

    this.graph.clearDirty();
    return { evaluated, cycles: cycleDiags, iterations, converged, maxDelta };
  }

  // ── Diagnostics ───────────────────────────────────────────────────────────

  /** Graph memory / topology statistics. */
  get stats(): { nodes: number; edges: number; dirty: number; volatiles: number } {
    return {
      nodes:     this.graph.nodeCount,
      edges:     this.graph.edgeCount,
      dirty:     this.graph.dirtySet.size,
      volatiles: this.graph.volatileCount,
    };
  }
}

// ---------------------------------------------------------------------------
// Internal constant — shared with findCycles
// ---------------------------------------------------------------------------
const EMPTY_SET: ReadonlySet<NodeKey> = Object.freeze(new Set<NodeKey>());

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
 * Memory model (Set-based, pre-Phase 6):
 *   Map<NodeKey, Set<NodeKey>> predecessor entry: ~88 bytes (Map slot + Set obj header)
 *   Each dep in V8 Set: ~32 bytes (HashTable slot: key + value + hash = 3 words,
 *     load factor 0.75 → ~4 words effective = 32 bytes; small-int inline)
 *   Successor entries: same × 2 (bidirectional)
 *   Total: V × (88 + k × 32) × 2 bytes
 */
export function estimateGraphMemoryMB(formulaCells: number, avgDeps: number): number {
  const bytesPerNode = (88 + avgDeps * 32) * 2;
  return (formulaCells * bytesPerNode) / (1024 * 1024);
}

/**
 * Estimate memory for the Phase 6 EdgeList-backed dependency graph.
 *
 * Memory model (EdgeList, Phase 6):
 *   Map<NodeKey, EdgeList> predecessor entry: ~56 bytes (Map slot + EdgeList object:
 *     buf ref 8 + _size 4 + Uint32Array header 40 + initial 4×4 payload = ~56 bytes
 *     amortised over typical use)
 *   Each dep in EdgeList: 4 bytes (Uint32 element)
 *   Successor entries: same × 2 (bidirectional)
 *   Total: V × (56 + k × 4) × 2 bytes — ~4–6× less than Set-based model
 *
 * @param formulaCells  Number of formula cells in the sheet.
 * @param avgDeps       Average number of cell references per formula.
 * @returns Estimated memory usage in megabytes.
 */
export function estimateTypedMemoryMB(formulaCells: number, avgDeps: number): number {
  const bytesPerNode = (56 + avgDeps * 4) * 2;
  return (formulaCells * bytesPerNode) / (1024 * 1024);
}
