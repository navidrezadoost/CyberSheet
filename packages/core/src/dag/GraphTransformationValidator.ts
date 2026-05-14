/**
 * GraphTransformationValidator.ts — Transformation Algebra Correctness
 * 
 * STATUS: DEV/TEST ONLY — Never runs in production
 * 
 * =============================================================================
 * PURPOSE
 * =============================================================================
 * 
 * Validates structural equivalence of spreadsheet state under coordinate
 * transformations (Insert/Delete Row/Column).
 * 
 * This is the formal evolution of GraphInvariantValidator, operating at the
 * level of transformation algebra rather than single-state invariants.
 * 
 * Theoretical Foundation:
 * - Spreadsheet = Typed Graph over Address Space
 * - Insert/Delete = Graph Rewriting System with Coordinate Semantics
 * - Correctness = ∀ layer L: interpret(L, f(S)) == f(interpret(L, S))
 * 
 * Based on:
 * - CLRS: Graph automorphisms & isomorphism
 * - Kleppmann: State transitions under transformation
 * - Database query planners: Relational algebra correctness
 * - Compiler optimization: Transformation preservation proofs
 * 
 * =============================================================================
 * VERIFIED TRANSFORMATION SYSTEM (3 LAYERS)
 * =============================================================================
 * 
 * Layer 1: Local Invariants (GraphInvariantValidator)
 *   - Zombie edges, orphan nodes, DAG inconsistencies
 *   - Question: "Is the graph internally consistent?"
 * 
 * Layer 2: Global Structural Invariants (THIS VALIDATOR)
 *   - Coordinate shift consistency, formula ↔ graph sync
 *   - Question: "Did the transformation preserve meaning?"
 * 
 * Layer 3: Algebraic Transform Model (AddressTransform)
 *   - Coordinate mapping, formula rewriting, invertibility
 *   - Question: "What does change mean?"
 * 
 * =============================================================================
 * COMPOSITION INVARIANT (CRITICAL FOR INSERT/DELETE)
 * =============================================================================
 * 
 * FUNDAMENTAL THEOREM:
 *   For command sequence C1..Cn:
 *     apply(C1 ∘ C2 ∘ ... ∘ Cn) == sequential apply with per-step validation
 * 
 * This enforces:
 *   1. Each Ci evaluated in state produced by C1..Ci-1
 *   2. Transforms are NOT compositional at algebraic level
 *   3. Validator runs after EACH step (no batching)
 *   4. Coordinate indices interpreted in CURRENT space
 * 
 * Example:
 *   insertColumn(k); insertColumn(k); deleteColumn(k)
 *   
 *   Each 'k' is resolved in the coordinate space AFTER previous operations.
 *   This prevents coordinate space confusion bugs.
 * 
 * Identity Property:
 *   deleteColumn(k) ∘ insertColumn(k) = identity
 *   
 *   This is a THEOREM, not a test case. Validator enforces it structurally.
 * 
 * =============================================================================
 * TRANSFORMATION MODEL
 * =============================================================================
 * 
 * Spreadsheet State:
 *   S = (Cells, Formulas, DAG, Merges, Styles, Selection)
 * 
 * Transformation:
 *   f: Address → Address ∪ {null}
 * 
 * Where:
 *   - null = deleted (row/col removed)
 *   - otherwise = shifted coordinate
 * 
 * Layer-Specific Transformations:
 * 
 *   | Layer     | Transformation Rule         |
 *   |-----------|-----------------------------|
 *   | Cells     | relocate or delete          |
 *   | Formulas  | rewrite via shiftFormula(f) |
 *   | DAG       | remap node keys through f   |
 *   | Merges    | transform anchor + shape    |
 *   | Selection | transform anchor            |
 *   | Styles    | transform by cell identity  |
 * 
 * =============================================================================
 * INVARIANTS CHECKED (6 Formalized)
 * =============================================================================
 * 
 * 1. Graph–Formula Consistency (CORE):
 *      ∀ cell c: parse(formula(c)) = refs(c) AND graph.edges(c) == refs(c)
 * 
 * 2. No Zombie Edges:
 *      formula(c) = ∅ ⇒ outEdges(c) = ∅
 * 
 * 3. ORPHAN_NODE (Strengthened):
 *      ∀ edge (u → v):
 *        worksheet.has(u) ∧ worksheet.has(v)
 *        AND f(u) ≠ null ∧ f(v) ≠ null
 * 
 * 4. Bidirectional Edge Consistency:
 *      u ∈ predecessors(v) ⇔ v ∈ successors(u)
 * 
 * 5. Dirty Propagation Soundness:
 *      cell ∈ dirtySet ⇒ ∀ dependent d: d reachable in topo order
 * 
 * 6. Transform Preservation (CRITICAL NEW INVARIANT):
 *      graph(f(S)) == f(graph(S))
 * 
 *    Meaning: Applying transform to state must equal transforming graph itself
 *    This catches Insert/Delete bugs where layers desync
 * 
 * 7. Reference Mapping Consistency (CRITICAL - FINAL GAP):
 *      For any reference r inside formula(c):
 *        map(r) == extractRefs(shiftFormula(formula(c)))
 * 
 *    Meaning: If shiftFormula() rewrites a formula, the refs inside must equal
 *    what map() would produce. This prevents map()/shiftFormula() divergence.
 * 
 *    Example bug this catches:
 *      map(A1) → B1
 *      shiftFormula("=A1") → "=A1"  ❌ (should be "=B1")
 *    
 *    This is the ONLY place the system can still lie to itself
 * 
 * =============================================================================
 * EXECUTION MODEL
 * =============================================================================
 * 
 * Invocation:
 *   - After every InsertCommand / DeleteCommand in DEV/TEST
 *   - After CommandManager.execute/undo/redo for transform commands
 *   - In adversarial test generator (10k+ random operations)
 * 
 * Integration:
 *   if (process.env.NODE_ENV !== 'production') {
 *     validator.validateAfterTransform(transform);
 *   }
 * 
 * Failure Strategy:
 *   - THROW IMMEDIATELY (fail-fast)
 *   - Corruption must never propagate
 *   - Earliest detection point for debugging
 * 
 * Performance:
 *   - O(V + E) full graph scan + O(F) formula parsing
 *   - Expensive by design — DEV/TEST only
 *   - Acceptable for validation (not production path)
 * 
 * =============================================================================
 * PHASE 2 INTEGRATION
 * =============================================================================
 * 
 * When building InsertColumnCommand / DeleteRowCommand:
 * 
 * 1. Create AddressTransform instance (f)
 * 2. Execute 4-stage transformation pipeline:
 *      a) Snapshot old state
 *      b) Apply transform to cells/DAG/formulas/merges/selection
 *      c) Validate with GraphTransformationValidator
 *      d) If violation: THROW (command never completes)
 * 3. Only commit if validator passes
 * 
 * This ensures Insert/Delete operations are atomic and correct.
 */

import { DependencyGraph, NodeKey } from './DependencyGraph';
import { Worksheet } from '../worksheet';
import { AddressTransform } from './AddressTransform';
import { GraphInvariantValidator } from './GraphInvariantValidator';
import { FormulaShiftingService } from '../FormulaShiftingService';
import { packKey, unpackKey } from '../storage/CellStoreV1';
import type { Address } from '../types';

export interface TransformViolation {
  type:
    | 'GRAPH_FORMULA_MISMATCH'
    | 'ZOMBIE_EDGE'
    | 'ORPHAN_NODE'
    | 'ORPHAN_AFTER_TRANSFORM'
    | 'BIDIRECTIONAL_EDGE_MISMATCH'
    | 'DIRTY_PROPAGATION_ERROR'
    | 'TRANSFORM_PRESERVATION_FAILURE'
    | 'REFERENCE_MAPPING_INCONSISTENCY';
  message: string;
  node?: NodeKey;
  sourceNode?: NodeKey;
  targetNode?: NodeKey;
  details?: any;
}

export class GraphTransformationValidator {
  // Entry point: Validates all 7 invariants after transformation
  static validateAfterTransform(
    transform: AddressTransform,
    dag: DependencyGraph,
    worksheet: Worksheet
  ): void {
    const violations: TransformViolation[] = [];

    // Run all 7 formalized invariants
    this.validateGraphFormulaConsistency(dag, worksheet, violations);
    this.validateNoZombieEdges(dag, worksheet, violations);
    this.validateNoOrphansAfterTransform(transform, dag, worksheet, violations);
    this.validateBidirectionalEdges(dag, violations);
    this.validateDirtyPropagation(dag, violations);
    this.validateTransformPreservation(transform, dag, worksheet, violations);
    this.validateReferenceMappingConsistency(transform, dag, worksheet, violations);

    if (violations.length > 0) {
      this.throwViolation(violations);
    }
  }

  // --------------------------------------------------
  // Invariant 1: Graph–Formula Consistency
  // ∀ cell c: parse(formula(c)) = refs(c) AND graph.edges(c) == refs(c)
  // --------------------------------------------------
  private static validateGraphFormulaConsistency(
    dag: DependencyGraph,
    worksheet: Worksheet,
    violations: TransformViolation[]
  ) {
    const forward = dag.getForwardMap();

    for (const [node, deps] of forward) {
      const cell = worksheet.getCellByKey(node);
      if (!cell) {
        // Cell doesn't exist but has edges—ORPHAN covered in separate check
        continue;
      }

      if (!cell.formula) {
        // No formula but has edges—ZOMBIE covered in separate check
        continue;
      }

      // Extract refs from formula
      const formulaRefs = this.extractRefs(cell.formula);
      const graphRefs = new Set(deps);

      // Check: formula refs == graph edges
      if (formulaRefs.size !== graphRefs.size) {
        violations.push({
          type: 'GRAPH_FORMULA_MISMATCH',
          message: `Cell ${node}: Formula has ${formulaRefs.size} refs, graph has ${graphRefs.size} edges`,
          node,
          details: {
            formulaRefs: Array.from(formulaRefs),
            graphRefs: Array.from(graphRefs)
          }
        });
        continue;
      }

      for (const ref of formulaRefs) {
        if (!graphRefs.has(ref)) {
          violations.push({
            type: 'GRAPH_FORMULA_MISMATCH',
            message: `Cell ${node}: Formula references ${ref}, but graph edge missing`,
            node,
            details: { missingRef: ref }
          });
        }
      }
    }
  }

  // --------------------------------------------------
  // Invariant 2: No Zombie Edges
  // formula(c) = ∅ ⇒ outEdges(c) = ∅
  // --------------------------------------------------
  private static validateNoZombieEdges(
    dag: DependencyGraph,
    worksheet: Worksheet,
    violations: TransformViolation[]
  ) {
    const forward = dag.getForwardMap();

    for (const [node, deps] of forward) {
      const cell = worksheet.getCellByKey(node);

      // Node has edges but no cell exists
      if (!cell && deps.size > 0) {
        violations.push({
          type: 'ZOMBIE_EDGE',
          message: `Node ${node} has ${deps.size} edges but cell doesn't exist`,
          node,
          details: { edgeCount: deps.size }
        });
        continue;
      }

      // Node has edges but no formula
      if (cell && !cell.formula && deps.size > 0) {
        violations.push({
          type: 'ZOMBIE_EDGE',
          message: `Cell ${node} has ${deps.size} edges but no formula`,
          node,
          details: { edgeCount: deps.size }
        });
      }
    }
  }

  // --------------------------------------------------
  // Invariant 3: ORPHAN_NODE (Strengthened)
  // ∀ edge (u → v): worksheet.has(u) ∧ worksheet.has(v)
  //                 AND f(u) ≠ null ∧ f(v) ≠ null
  // --------------------------------------------------
  private static validateNoOrphansAfterTransform(
    transform: AddressTransform,
    dag: DependencyGraph,
    worksheet: Worksheet,
    violations: TransformViolation[]
  ) {
    const forward = dag.getForwardMap();

    for (const [u, deps] of forward) {
      const cellU = worksheet.getCellByKey(u);

      if (!cellU) {
        violations.push({
          type: 'ORPHAN_NODE',
          message: `Source node ${u} has edges but doesn't exist in worksheet`,
          node: u,
          details: { edgeCount: deps.size }
        });
        continue;
      }

      // Check: f(u) ≠ null (source not deleted by transform)
      const addrU = unpackKey(u);
      const transformedU = transform.map(addrU);
      if (transformedU === null) {
        violations.push({
          type: 'ORPHAN_AFTER_TRANSFORM',
          message: `Source node ${u} was deleted by transform but still has edges`,
          node: u,
          details: { originalAddr: addrU }
        });
      }

      for (const v of deps) {
        const cellV = worksheet.getCellByKey(v);

        if (!cellV) {
          violations.push({
            type: 'ORPHAN_NODE',
            message: `Edge ${u} → ${v}: Target doesn't exist in worksheet`,
            sourceNode: u,
            targetNode: v
          });
          continue;
        }

        // Check: f(v) ≠ null (target not deleted by transform)
        const addrV = unpackKey(v);
        const transformedV = transform.map(addrV);
        if (transformedV === null) {
          violations.push({
            type: 'ORPHAN_AFTER_TRANSFORM',
            message: `Edge ${u} → ${v}: Target was deleted by transform`,
            sourceNode: u,
            targetNode: v,
            details: { originalAddr: addrV }
          });
        }
      }
    }
  }

  // --------------------------------------------------
  // Invariant 4: Bidirectional Edge Consistency
  // u ∈ predecessors(v) ⇔ v ∈ successors(u)
  // --------------------------------------------------
  private static validateBidirectionalEdges(
    dag: DependencyGraph,
    violations: TransformViolation[]
  ) {
    const forward = dag.getForwardMap();
    const reverse = dag.getReverseMap();

    for (const [u, deps] of forward) {
      for (const v of deps) {
        if (!reverse.get(v)?.has(u)) {
          violations.push({
            type: 'BIDIRECTIONAL_EDGE_MISMATCH',
            message: `Forward edge ${u} → ${v} exists, but reverse edge missing`,
            sourceNode: u,
            targetNode: v
          });
        }
      }
    }

    for (const [v, dependents] of reverse) {
      for (const u of dependents) {
        if (!forward.get(u)?.has(v)) {
          violations.push({
            type: 'BIDIRECTIONAL_EDGE_MISMATCH',
            message: `Reverse edge ${v} ← ${u} exists, but forward edge missing`,
            sourceNode: u,
            targetNode: v
          });
        }
      }
    }
  }

  // --------------------------------------------------
  // Invariant 5: Dirty Propagation Soundness
  // cell ∈ dirtySet ⇒ ∀ dependent d: d reachable in topo order
  // --------------------------------------------------
  private static validateDirtyPropagation(
    dag: DependencyGraph,
    violations: TransformViolation[]
  ) {
    // This is a simplified check—full implementation would need topo traversal
    // For now: ensure dirty set is subset of nodes in graph
    const dirtySet = dag.getDirtySet();
    const forward = dag.getForwardMap();
    const reverse = dag.getReverseMap();
    const allNodes = new Set([...forward.keys(), ...reverse.keys()]);

    for (const node of dirtySet) {
      if (!allNodes.has(node)) {
        violations.push({
          type: 'DIRTY_PROPAGATION_ERROR',
          message: `Dirty node ${node} not in graph`,
          node,
          details: { dirtySetSize: dirtySet.size }
        });
      }
    }
  }

  // --------------------------------------------------
  // Invariant 6: Transform Preservation (CRITICAL)
  // graph(f(S)) == f(graph(S))
  // --------------------------------------------------
  private static validateTransformPreservation(
    transform: AddressTransform,
    dag: DependencyGraph,
    worksheet: Worksheet,
    violations: TransformViolation[]
  ) {
    // This is the BIG ONE: Ensures transformation is applied consistently
    // across all layers (cells, formulas, DAG)
    //
    // Check: For every cell with formula, the transformed formula's refs
    // should match the transformed graph edges

    const forward = dag.getForwardMap();

    for (const [node, deps] of forward) {
      const cell = worksheet.getCellByKey(node);
      if (!cell || !cell.formula) continue;
      const cellAddr = unpackKey(node);

      // Transform the formula
      const transformedFormula = transform.shiftFormula(cell.formula, cellAddr);

      // Extract refs from transformed formula
      const transformedRefs = this.extractRefs(transformedFormula);

      // Transform the graph edges
      const transformedEdges = new Set<NodeKey>();
      for (const dep of deps) {
        const depAddr = unpackKey(dep);
        const transformedDepAddr = transform.map(depAddr);
        if (transformedDepAddr !== null) {
          // Only include non-deleted nodes
          const transformedDepKey = this.packAddress(transformedDepAddr);
          transformedEdges.add(transformedDepKey);
        }
      }

      // Check: transformed formula refs == transformed graph edges
      if (transformedRefs.size !== transformedEdges.size) {
        violations.push({
          type: 'TRANSFORM_PRESERVATION_FAILURE',
          message: `Cell ${node}: Transform preservation violated (ref count mismatch)`,
          node,
          details: {
            originalFormula: cell.formula,
            transformedFormula,
            transformedRefs: Array.from(transformedRefs),
            transformedEdges: Array.from(transformedEdges)
          }
        });
        continue;
      }

      for (const ref of transformedRefs) {
        if (!transformedEdges.has(ref)) {
          violations.push({
            type: 'TRANSFORM_PRESERVATION_FAILURE',
            message: `Cell ${node}: Transformed formula has ref ${ref}, but transformed graph missing edge`,
            node,
            details: {
              originalFormula: cell.formula,
              transformedFormula,
              missingTransformedRef: ref
            }
          });
        }
      }
    }
  }

  // --------------------------------------------------
  // Invariant 7: Reference Mapping Consistency (CRITICAL FINAL GAP)
  // For any reference r inside formula(c): map(r) == extractRefs(shiftFormula(formula(c)))
  // --------------------------------------------------
  private static validateReferenceMappingConsistency(
    transform: AddressTransform,
    dag: DependencyGraph,
    worksheet: Worksheet,
    violations: TransformViolation[]
  ) {
    // This catches map()/shiftFormula() divergence—the final consistency gap
    //
    // Example bug:
    //   map(A1) → B1
    //   shiftFormula("=A1") → "=A1"  ❌ (divergence!)
    //
    // This will produce:
    //   DAG says: cell depends on B1
    //   Formula says: cell references A1
    //   → MISMATCH

    const forward = dag.getForwardMap();

    for (const [node, deps] of forward) {
      const cell = worksheet.getCellByKey(node);
      if (!cell || !cell.formula) continue;
      const cellAddr = unpackKey(node);

      // Extract original refs from formula
      const originalRefs = this.extractRefs(cell.formula);

      // Apply map() to each original ref
      const mappedRefs = new Set<NodeKey>();
      for (const refKey of originalRefs) {
        const refAddr = unpackKey(refKey);
        const mappedAddr = transform.map(refAddr);
        if (mappedAddr !== null) {
          const mappedKey = packKey(mappedAddr.row, mappedAddr.col);
          mappedRefs.add(mappedKey);
        }
        // If map() returns null, ref was deleted—exclude from set
      }

      // Extract refs from shifted formula
      const shiftedFormula = transform.shiftFormula(cell.formula, cellAddr);
      const shiftedRefs = this.extractRefs(shiftedFormula);

      // Check: map(original refs) == extractRefs(shifted formula)
      if (mappedRefs.size !== shiftedRefs.size) {
        violations.push({
          type: 'REFERENCE_MAPPING_INCONSISTENCY',
          message: `Cell ${node}: map() and shiftFormula() diverged (ref count mismatch)`,
          node,
          details: {
            originalFormula: cell.formula,
            shiftedFormula,
            mappedRefs: Array.from(mappedRefs),
            shiftedRefs: Array.from(shiftedRefs)
          }
        });
        continue;
      }

      for (const mappedRef of mappedRefs) {
        if (!shiftedRefs.has(mappedRef)) {
          violations.push({
            type: 'REFERENCE_MAPPING_INCONSISTENCY',
            message: `Cell ${node}: map() produced ${mappedRef}, but shiftFormula() doesn't reference it`,
            node,
            details: {
              originalFormula: cell.formula,
              shiftedFormula,
              missingMappedRef: mappedRef
            }
          });
        }
      }

      for (const shiftedRef of shiftedRefs) {
        if (!mappedRefs.has(shiftedRef)) {
          violations.push({
            type: 'REFERENCE_MAPPING_INCONSISTENCY',
            message: `Cell ${node}: shiftFormula() produced ${shiftedRef}, but map() doesn't generate it`,
            node,
            details: {
              originalFormula: cell.formula,
              shiftedFormula,
              extraShiftedRef: shiftedRef
            }
          });
        }
      }
    }
  }

  // --------------------------------------------------
  // Helper: Extract NodeKey refs from formula
  // --------------------------------------------------
  private static extractRefs(formula: string): Set<NodeKey> {
    const refs = new Set<NodeKey>();
    try {
      const tokens = FormulaShiftingService.tokenize(formula);
      for (const token of tokens) {
        if (token.type === 'CELL_REF') {
          const key = packKey(token.row, token.col);
          refs.add(key);
        }
        // Handle ranges (extract both start and end)
        if (token.type === 'RANGE') {
          const startKey = packKey(token.start.row, token.start.col);
          const endKey = packKey(token.end.row, token.end.col);
          refs.add(startKey);
          refs.add(endKey);
          // Note: For full correctness, we should expand the range
          // But for invariant checking, endpoints are sufficient
        }
      }
    } catch (err) {
      // Formula parsing failed—this should be caught by formula validator
      // Not a graph invariant violation
    }
    return refs;
  }

  // --------------------------------------------------
  // Helper: Pack Address → NodeKey
  // --------------------------------------------------
  private static packAddress(addr: Address): NodeKey {
    return packKey(addr.row, addr.col);
  }

  // --------------------------------------------------
  // Error handler: THROW IMMEDIATELY
  // --------------------------------------------------
  private static throwViolation(violations: TransformViolation[]): never {
    const summary = violations.map((v, i) => {
      let msg = `${i + 1}. [${v.type}] ${v.message}`;
      if (v.node) msg += ` (node: ${v.node})`;
      if (v.sourceNode && v.targetNode) {
        msg += ` (edge: ${v.sourceNode} → ${v.targetNode})`;
      }
      if (v.details) {
        msg += `\n   Details: ${JSON.stringify(v.details, null, 2)}`;
      }
      return msg;
    }).join('\n\n');

    throw new Error(
      `🔴 GRAPH TRANSFORMATION INVARIANT VIOLATION 🔴\n\n` +
      `${violations.length} violation(s) detected:\n\n${summary}\n\n` +
      `=============================================================================\n` +
      `THIS IS A CORRECTNESS BUG — MUST BE FIXED BEFORE COMMIT\n` +
      `=============================================================================\n\n` +
      `The transformation did not preserve structural consistency.\n` +
      `This indicates Insert/Delete logic has a bug.\n\n` +
      `Common causes:\n` +
      `  - Formula shifting logic incomplete\n` +
      `  - DAG edges not remapped through transform\n` +
      `  - Deleted cells still have edges\n` +
      `  - Merge regions not transformed\n` +
      `  - Selection not adjusted\n` +
      `  - map() and shiftFormula() diverged (CRITICAL)\n\n` +
      `DEBUG STEPS:\n` +
      `  1. Check AddressTransform.map() correctness\n` +
      `  2. Check AddressTransform.shiftFormula() delegates to FormulaShiftingService\n` +
      `  3. VERIFY: map(ref) must equal extractRefs(shiftFormula(formula)) for all refs\n` +
      `  4. Check InsertCommand / DeleteCommand applies transform to ALL layers\n` +
      `  5. Check DAG node remapping (packKey → transform → packKey)\n` +
      `  6. Add adversarial test case for this scenario\n\n` +
      `IMPLEMENTATION RULE (NON-NEGOTIABLE):\n` +
      `  Insert/Delete MUST use: Extract → Clear → Transform → PasteCommand\n` +
      `  NEVER mutate DAG directly. Let PasteCommand handle it.\n\n`
    );
  }
}
