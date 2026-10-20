/**
 * GraphInvariantValidator.ts — DAG Correctness Validation
 * 
 * STATUS: DEV/TEST ONLY — Never runs in production
 * 
 * =============================================================================
 * PURPOSE
 * =============================================================================
 * 
 * Validates core dependency graph invariants after every command execution
 * in development and test environments. Crashes immediately on any violation
 * using fail-fast philosophy.
 * 
 * Based on:
 * - CLRS: Graph invariants & correctness proofs
 * - Kleppmann (DDIA): State consistency & invariant preservation
 * - Incremental computation papers: Dependency correctness
 * 
 * =============================================================================
 * INVARIANTS CHECKED
 * =============================================================================
 * 
 * 1. Bidirectional Consistency: forward[u] → v ⇔ reverse[v] → u
 * 2. No Zombie Edges: formula(c) = ∅ ⇒ deps(c) = ∅
 * 3. No Duplicate Edges: Set integrity (defensive check)
 * 4. Graph Matches Formulas: deps(c) = references_in_formula(c)
 * 5. Dirty Propagation: Transitive closure correctness
 * 
 * =============================================================================
 * EXECUTION MODEL
 * =============================================================================
 * 
 * Invocation:
 *   - After every CommandManager.execute() in DEV/TEST
 *   - Optional: after undo/redo
 *   - Optional: inside stress/adversarial loops
 * 
 * Failure Strategy:
 *   - THROW IMMEDIATELY (no logging, no recovery)
 *   - Corruption must never propagate
 *   - Earliest detection point for debugging
 * 
 * Performance:
 *   - O(V + E) full graph scan
 *   - Expensive by design — DEV/TEST only
 *   - Acceptable for validation (not production path)
 */

import { DependencyGraph, NodeKey, EdgeList } from './DependencyGraph';
import { Worksheet } from '../worksheet';
import { FormulaShiftingService } from '../FormulaShiftingService';
import { unpackKey, packKey } from '../storage/CellStoreV1';
import type { Address } from '../types';

export interface InvariantViolation {
  type:
    | 'GRAPH_MISMATCH'
    | 'ZOMBIE_EDGE'
    | 'DIRTY_MISSING'
    | 'DIRTY_EXTRA'
    | 'DUPLICATE_EDGE'
    | 'ORPHAN_NODE';
  message: string;
  node?: NodeKey;
  details?: any;
}

export class GraphInvariantValidator {
  // Entry point
  static validateAll(
    dag: DependencyGraph,
    worksheet: Worksheet
  ): void {
    const violations: InvariantViolation[] = [];

    this.checkBidirectionalConsistency(dag, violations);
    this.checkNoZombieEdges(dag, worksheet, violations);
    this.checkNoDuplicateEdges(dag, violations);
    this.checkGraphMatchesFormulas(dag, worksheet, violations);
    this.checkDirtyPropagation(dag, violations);

    if (violations.length > 0) {
      this.throwViolation(violations);
    }
  }

  // --------------------------------------------------
  // 1. Bidirectional Consistency
  // forward[u] contains v  <=>  reverse[v] contains u
  // --------------------------------------------------
  private static checkBidirectionalConsistency(
    dag: DependencyGraph,
    violations: InvariantViolation[]
  ) {
    const forward = dag.getForwardMap();   // Map<NodeKey, Set<NodeKey>>
    const reverse = dag.getReverseMap();   // Map<NodeKey, Set<NodeKey>>

    for (const [u, deps] of forward) {
      for (const v of deps) {
        if (!reverse.get(v)?.has(u)) {
          violations.push({
            type: 'GRAPH_MISMATCH',
            message: `Missing reverse edge: ${v} <- ${u}`,
            node: u,
            details: { u, v }
          });
        }
      }
    }

    for (const [v, dependents] of reverse) {
      for (const u of dependents) {
        if (!forward.get(u)?.has(v)) {
          violations.push({
            type: 'GRAPH_MISMATCH',
            message: `Missing forward edge: ${u} -> ${v}`,
            node: v,
            details: { u, v }
          });
        }
      }
    }
  }

  // --------------------------------------------------
  // 2. No Zombie Edges
  // formula(c) = ∅ ⇒ out_edges(c) = ∅
  // --------------------------------------------------
  private static checkNoZombieEdges(
    dag: DependencyGraph,
    worksheet: Worksheet,
    violations: InvariantViolation[]
  ) {
    const forward = dag.getForwardMap();

    for (const [node, deps] of forward) {
      const cell = worksheet.getCellByKey(node);

      if (!cell || !cell.formula || cell.formula === '') {
        if (deps.size > 0) {
          violations.push({
            type: 'ZOMBIE_EDGE',
            message: `Node ${node} has dependencies but no formula`,
            node,
            details: { deps: Array.from(deps) }
          });
        }
      }
    }
  }

  // --------------------------------------------------
  // 3. No Duplicate Edges
  // (Set should guarantee this, but defensive check)
  // --------------------------------------------------
  private static checkNoDuplicateEdges(
    dag: DependencyGraph,
    violations: InvariantViolation[]
  ) {
    const forward = dag.getForwardMap();

    for (const [node, deps] of forward) {
      const arr = Array.from(deps);
      const unique = new Set(arr);

      if (arr.length !== unique.size) {
        violations.push({
          type: 'DUPLICATE_EDGE',
          message: `Duplicate edges detected at ${node}`,
          node,
          details: { deps: arr }
        });
      }
    }
  }

  // --------------------------------------------------
  // 4. Graph Matches Formula
  // deps(c) must equal parsed references
  // --------------------------------------------------
  private static checkGraphMatchesFormulas(
    dag: DependencyGraph,
    worksheet: Worksheet,
    violations: InvariantViolation[]
  ) {
    const forward = dag.getForwardMap();

    for (const [node, deps] of forward) {
      const cell = worksheet.getCellByKey(node);

      if (!cell || !cell.formula) continue;

      const parsedRefs = this.extractRefs(cell.formula); // reuse tokenizer

      const depSet = new Set(deps);
      const parsedSet = new Set(parsedRefs);

      // Missing edges
      for (const ref of parsedSet) {
        if (!depSet.has(ref)) {
          violations.push({
            type: 'GRAPH_MISMATCH',
            message: `Missing dependency ${node} -> ${ref}`,
            node,
            details: { node, ref }
          });
        }
      }

      // Extra edges
      for (const dep of depSet) {
        if (!parsedSet.has(dep)) {
          violations.push({
            type: 'GRAPH_MISMATCH',
            message: `Extra dependency ${node} -> ${dep}`,
            node,
            details: { node, dep }
          });
        }
      }
    }
  }

  // --------------------------------------------------
  // 5. Dirty Propagation
  // dirty nodes must include transitive closure
  // --------------------------------------------------
  private static checkDirtyPropagation(
    dag: DependencyGraph,
    violations: InvariantViolation[]
  ) {
    const dirty = dag.getDirtySet(); // Set<NodeKey>
    const reverse = dag.getReverseMap();

    const visited = new Set<NodeKey>();
    const queue: NodeKey[] = [];

    // Start from dirty roots
    for (const d of dirty) {
      queue.push(d);
      visited.add(d);
    }

    while (queue.length > 0) {
      const node = queue.shift()!;

      for (const dep of reverse.get(node) || []) {
        if (!visited.has(dep)) {
          visited.add(dep);
          queue.push(dep);
        }
      }
    }

    // Missing dirty nodes
    for (const node of visited) {
      if (!dirty.has(node)) {
        violations.push({
          type: 'DIRTY_MISSING',
          message: `Node ${node} should be dirty but is not`,
          node
        });
      }
    }

    // Extra dirty nodes
    for (const node of dirty) {
      if (!visited.has(node)) {
        violations.push({
          type: 'DIRTY_EXTRA',
          message: `Node ${node} marked dirty but unreachable`,
          node
        });
      }
    }
  }

  // --------------------------------------------------
  // Shared: Reference extraction (reuse your tokenizer)
  // --------------------------------------------------
  private static extractRefs(formula: string): NodeKey[] {
    const refs: NodeKey[] = [];
    const seen = new Set<NodeKey>();

    // Strip leading '=' if present
    const formulaBody = formula.startsWith('=') ? formula.slice(1) : formula;

    // Tokenize using FormulaShiftingService (NO duplication, NO regex)
    const tokens = FormulaShiftingService.tokenize(formulaBody);

    for (const token of tokens) {
      if (token.type === 'CELL_REF') {
        // Single cell reference - pack into NodeKey
        // FormulaShiftingService tokens use zero-based coordinates; worksheet
        // graph nodes follow the public one-based Address contract.
        const key = packKey(token.row + 1, token.col + 1);
        if (!seen.has(key)) {
          seen.add(key);
          refs.push(key);
        }
      } else if (token.type === 'RANGE') {
        // Range reference - expand to all cells
        const start = token.start;
        const end = token.end;

        for (let row = start.row; row <= end.row; row++) {
          for (let col = start.col; col <= end.col; col++) {
            const key = packKey(row + 1, col + 1);
            if (!seen.has(key)) {
              seen.add(key);
              refs.push(key);
            }
          }
        }
      }
    }

    return refs;
  }

  // --------------------------------------------------
  // Fail fast
  // --------------------------------------------------
  private static throwViolation(violations: InvariantViolation[]): never {
    const message =
      `\n🚨 DAG INVARIANT VIOLATION (${violations.length}) 🚨\n\n` +
      violations.map(v =>
        `• [${v.type}] ${v.message} ${v.node ? `(node: ${v.node})` : ''}`
      ).join('\n');

    throw new Error(message);
  }
}
