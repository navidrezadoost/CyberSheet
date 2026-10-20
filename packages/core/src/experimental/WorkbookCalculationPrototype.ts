/**
 * WorkbookCalculationPrototype.ts  (CS-002D.2 — experimental vertical prototype)
 *
 * A workbook-scoped cross-sheet dependency coordinator built strictly to the
 * approved CS-002D.2 design gate. It is NOT the production Workbook API and is
 * intentionally NOT exported from the package entry point.
 *
 * What it demonstrates (acceptance matrix):
 *   - Stable opaque worksheet identity independent of display names.
 *   - Workbook-scoped cross-sheet dependency indexing (cells and ranges).
 *   - Qualified formula resolution against the correct source worksheet, with
 *     a deterministic #REF! for missing sheets / out-of-bounds coordinates.
 *   - Cross-sheet dirty propagation and topologically ordered recalculation,
 *     including cross-sheet cycle detection (#CIRC!).
 *   - Rename (reference stays semantically valid) and delete (#REF!).
 *   - A versioned workbook snapshot envelope and a synchronous transaction with
 *     rollback of both cross-sheet values and edges.
 *
 * Design boundary (honored here):
 *   - Each worksheet keeps its efficient LOCAL numeric DAG and its own
 *     FormulaEngine. This coordinator owns ONLY the qualified-reference index.
 *   - Qualified tokens are resolved to temporary literal bindings and the
 *     existing FormulaEngine evaluates the arithmetic/functions. The production
 *     expression parser and local dependency cache are untouched.
 *   - Correctness, not scale: dependents are found by scanning registrations.
 *
 * Explicitly later work (per the design doc): persisted-ID import semantics,
 * indexed rectangle queries, whole-column/3D/named/structured qualified refs,
 * worker scheduling, async functions, and full snapshot fidelity.
 */

import { Worksheet } from "../worksheet";
import { FormulaEngine } from "../FormulaEngine";
import type {
  CellValue,
  SheetEvents,
  IFormulaEngine,
  AddressRange,
} from "../types";
import type { WorksheetSnapshot } from "../persistence/SnapshotCodec";
import {
  packKey,
  unpackKey,
  MAX_WORKSHEET_ROW,
  MAX_WORKSHEET_COLUMN,
} from "../dag/DependencyGraph";
import { extractFormulaDependencies } from "../utils/formula-reference-extractor";
import {
  scanQualifiedReferences,
  type QualifiedToken,
} from "./qualified-reference-scanner";

const SNAPSHOT_FORMAT = "cybersheet-workbook-prototype";
const SNAPSHOT_VERSION = 1;

/** A qualified precedent bound at registration time. */
interface QualifiedDep {
  /** Display name exactly as written in the formula (used for name resolution). */
  sheetName: string;
  /** Opaque sheet id resolved at registration; null when unresolved. */
  sheetId: string | null;
  /**
   * False when the reference coordinate is out of worksheet bounds (e.g. row 0
   * or row > 1048576). An out-of-bounds dependency must never bind a graph edge
   * or participate in invalidation; it resolves to `#REF!` only.
   */
  inBounds: boolean;
  kind: "cell" | "range";
  row?: number;
  col?: number;
  startRow?: number;
  startCol?: number;
  endRow?: number;
  endCol?: number;
}

/**
 * A self-contained dependency model for one formula cell, derived purely from
 * its formula text. It owns BOTH local and qualified precedents so the
 * coordinator never has to consult the worksheet's point-only `getPrecedents`
 * API (which does not expose value-cell range watchers). This closes the
 * local-range scheduling gap (CS-002D.2R Finding B / P1).
 */
interface DependencyModel {
  localCells: Array<{ row: number; col: number }>;
  localRanges: AddressRange[];
  qualified: QualifiedDep[];
}

interface SheetEntry {
  id: string;
  name: string;
  ws: Worksheet;
  engine: FormulaEngine;
  subscription: { dispose(): void };
}

export interface WorkbookSnapshotEnvelope {
  format: typeof SNAPSHOT_FORMAT;
  version: number;
  nextSheetSequence: number;
  sheets: Array<{ id: string; name: string; state: WorksheetSnapshot }>;
}

export interface PrototypeRecalcResult {
  evaluated: number;
  circular: number;
}

const INVALID_SHEET_NAME = /[\\/?*[\]:]/;

export class WorkbookCalculationPrototype {
  private readonly byId = new Map<string, SheetEntry>();
  /** Lower-cased display name → opaque id. */
  private readonly byName = new Map<string, string>();
  /** Insertion order of sheet ids (snapshot ordering + determinism). */
  private readonly order: string[] = [];
  private nextSheetSequence = 1;

  /** Opaque id → set of packed formula-cell keys on that sheet. */
  private readonly formulaCells = new Map<string, Set<number>>();
  /** dependentKey (`${id}#${packKey}`) → its complete dependency model. */
  private readonly depModel = new Map<string, DependencyModel>();
  /** dependentKey → dirty flag (prototype-owned cross-sheet dirty set). */
  private readonly dirty = new Set<string>();
  /** Suspends mutation observation during bulk restore (prevents event noise). */
  private _suspendObserve = false;

  // ───────────────────────────── identity helpers ─────────────────────────

  private depKey(id: string, row: number, col: number): string {
    return `${id}#${packKey(row, col)}`;
  }

  private resolveId(name: string): string | null {
    return this.byName.get(name.toLowerCase()) ?? null;
  }

  getSheetId(name: string): string | null {
    return this.resolveId(name);
  }

  getSheet(name: string): Worksheet | undefined {
    const id = this.resolveId(name);
    return id ? this.byId.get(id)?.ws : undefined;
  }

  getSheetById(id: string): Worksheet | undefined {
    return this.byId.get(id)?.ws;
  }

  getSheetNames(): string[] {
    return this.order.map((id) => this.byId.get(id)!.name);
  }

  // ───────────────────────────── lifecycle ────────────────────────────────

  addSheet(name: string, rows?: number, cols?: number): Worksheet {
    this.assertValidName(name);
    if (this.byName.has(name.toLowerCase())) {
      throw new Error(`Sheet '${name}' already exists`);
    }
    const id = `xsheet-${this.nextSheetSequence++}`;
    const engine = new FormulaEngine();
    return this.installSheet(
      id,
      name,
      new Worksheet(name, rows, cols, engine as unknown as IFormulaEngine),
      engine,
    );
  }

  /** @internal Wire a worksheet (new or restored) under an opaque id. */
  private installSheet(
    id: string,
    name: string,
    ws: Worksheet,
    engine: FormulaEngine,
  ): Worksheet {
    const subscription = ws.onMutation((event) => this.observe(id, event));
    const entry: SheetEntry = { id, name, ws, engine, subscription };
    this.byId.set(id, entry);
    this.byName.set(name.toLowerCase(), id);
    this.order.push(id);
    this.formulaCells.set(id, new Set());
    return ws;
  }

  renameSheet(oldName: string, newName: string): boolean {
    const id = this.resolveId(oldName);
    if (!id) return false;
    const trimmed = newName.trim();
    this.assertValidName(trimmed);
    if (
      trimmed.toLowerCase() !== oldName.toLowerCase() &&
      this.byName.has(trimmed.toLowerCase())
    ) {
      throw new Error(`Sheet '${trimmed}' already exists`);
    }
    const entry = this.byId.get(id)!;
    if (trimmed === entry.name) return true;

    // Identity survives rename; only the display label changes.
    this.byName.delete(entry.name.toLowerCase());
    entry.name = trimmed;
    (entry.ws as { name: string }).name = trimmed;
    this.byName.set(trimmed.toLowerCase(), id);

    // Rewrite only parsed qualified token spans that targeted the old label.
    this.rewriteQualifiedSheetName(oldName, trimmed);
    return true;
  }

  deleteSheet(name: string): boolean {
    const id = this.resolveId(name);
    if (!id) return false;
    const entry = this.byId.get(id)!;

    // Finding A: deletion must PERMANENTLY invalidate references, not merely
    // dirty them. Resolution is name-based at evaluation time, so a later
    // same-name sheet would otherwise silently rebind. Rewrite every dependent
    // formula so its qualified tokens targeting this sheet become `#REF!`
    // (Excel parity). The rewrite removes the qualified token entirely, so no
    // identity can resurrect it — and the surviving dependents become dirty
    // through the normal mutation path.
    this.invalidateReferencesTo(name, id);

    entry.subscription.dispose();
    this.byId.delete(id);
    this.byName.delete(entry.name.toLowerCase());
    this.formulaCells.delete(id);
    const idx = this.order.indexOf(id);
    if (idx >= 0) this.order.splice(idx, 1);

    // Drop registrations + dirty entries owned by the deleted sheet.
    for (const dk of [...this.depModel.keys()]) {
      if (dk.startsWith(`${id}#`)) this.depModel.delete(dk);
    }
    for (const dk of [...this.dirty]) {
      if (dk.startsWith(`${id}#`)) this.dirty.delete(dk);
    }
    return true;
  }

  /**
   * Rewrite every formula on every OTHER sheet so that qualified tokens
   * targeting `deletedName` collapse to the `#REF!` error literal. Runs while
   * all sheets are still installed so `setCellFormula` → observe keeps the
   * dependency model and dirty set consistent.
   */
  private invalidateReferencesTo(deletedName: string, deletedId: string): void {
    for (const id of this.order) {
      if (id === deletedId) continue;
      const entry = this.byId.get(id)!;
      const keys = [...this.formulaCells.get(id)!];
      for (const key of keys) {
        const addr = unpack(key);
        const cell = entry.ws.getCell(addr);
        const formula = cell?.formula;
        if (!formula) continue;
        const tokens = scanQualifiedReferences(formula).filter(
          (t) => t.sheet.toLowerCase() === deletedName.toLowerCase(),
        );
        if (tokens.length === 0) continue;
        let rewritten = "";
        let cursor = 0;
        for (const tok of tokens) {
          rewritten += formula.slice(cursor, tok.start);
          rewritten += "#REF!";
          cursor = tok.end;
        }
        rewritten += formula.slice(cursor);
        if (rewritten !== formula) {
          entry.ws.setCellFormula(addr, rewritten, cell!.value);
        }
      }
    }
  }

  private assertValidName(name: string): void {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Sheet name cannot be empty");
    if (trimmed.length > 31)
      throw new Error("Sheet name cannot exceed 31 characters");
    if (INVALID_SHEET_NAME.test(trimmed)) {
      throw new Error("Sheet name cannot contain \\ / ? * [ ] :");
    }
  }

  // ───────────────────────── mutation observation ─────────────────────────

  /**
   * Observe a worksheet's mutation stream (fires before public coalescing and
   * excludes derived formula-result events). Keeps formula-cell tracking and
   * the dependency model in sync, then propagates dirtiness transitively.
   */
  private observe(id: string, event: SheetEvents): void {
    if (this._suspendObserve) return;
    if (event.type !== "cell-changed") return;
    if (event.origin === "formula-result") return; // derived results are not user edits
    const { row, col } = event.address;
    const key = packKey(row, col);
    const dk = `${id}#${key}`;
    const formula = event.cell?.formula;
    const formulaKeys = this.formulaCells.get(id);
    if (!formulaKeys) return;

    if (typeof formula === "string" && formula.length > 0) {
      formulaKeys.add(key);
      this.depModel.set(dk, this.buildModel(row, col, formula));
      this.dirty.add(dk);
    } else {
      formulaKeys.delete(key);
      this.depModel.delete(dk);
      this.dirty.delete(dk);
    }

    // Finding E: propagate transitively across LOCAL and cross-sheet edges so
    // that a value edit which changes a local formula's cached result also
    // invalidates cross-sheet dependents of that formula (and their chains).
    this.propagateDirty(id, row, col);
  }

  /**
   * Build the complete dependency model for a formula cell from its text.
   * Local cells/ranges come from the shared extractor (which deliberately
   * excludes qualified tokens); qualified precedents come from the scanner.
   */
  private buildModel(
    row: number,
    col: number,
    formula: string,
  ): DependencyModel {
    const extracted = extractFormulaDependencies(formula, {
      row: row - 1,
      col: col - 1,
    });
    const localCells = extracted.cells.map((c) => ({
      row: c.row + 1,
      col: c.col + 1,
    }));
    const localRanges = extracted.ranges.map((r) => ({
      startRow: r.startRow + 1,
      endRow: r.endRow + 1,
      startCol: r.startCol + 1,
      endCol: r.endCol + 1,
    }));
    const qualified = this.bindQualified(scanQualifiedReferences(formula));
    return { localCells, localRanges, qualified };
  }

  private bindQualified(tokens: QualifiedToken[]): QualifiedDep[] {
    return tokens.map((tok) => {
      const sheetId = this.resolveId(tok.sheet);
      if (tok.kind === "cell" && tok.cell) {
        return {
          sheetName: tok.sheet,
          sheetId,
          inBounds: tok.inBounds,
          kind: "cell" as const,
          row: tok.cell.row,
          col: tok.cell.col,
        };
      }
      const r = tok.range!;
      return {
        sheetName: tok.sheet,
        sheetId,
        inBounds: tok.inBounds,
        kind: "range" as const,
        startRow: r.startRow,
        startCol: r.startCol,
        endRow: r.endRow,
        endCol: r.endCol,
      };
    });
  }

  /** Does `model` (for cell `dk`) read the source cell `(sourceId,row,col)`? */
  private modelDependsOn(
    dk: string,
    model: DependencyModel,
    sourceId: string,
    row: number,
    col: number,
  ): boolean {
    const dependentId = cellOfDk(dk).id;
    if (dependentId === sourceId) {
      if (model.localCells.some((a) => a.row === row && a.col === col)) {
        return true;
      }
      if (model.localRanges.some((r) => rangeContains(r, row, col))) {
        return true;
      }
    }
    for (const q of model.qualified) {
      if (!q.inBounds) continue; // out-of-bounds refs never invalidate
      const targetId = this.resolveId(q.sheetName) ?? q.sheetId;
      if (targetId !== sourceId) continue;
      if (q.kind === "cell" && q.row === row && q.col === col) return true;
      if (
        q.kind === "range" &&
        row >= q.startRow! &&
        row <= q.endRow! &&
        col >= q.startCol! &&
        col <= q.endCol!
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Transitively mark every formula cell (local or cross-sheet) that depends,
   * directly or through chains, on the changed source cell. A visited set over
   * dependent cells bounds the traversal even through cycles.
   */
  private propagateDirty(
    sourceId: string,
    sourceRow: number,
    sourceCol: number,
  ): void {
    const queue: Array<[string, number, number]> = [
      [sourceId, sourceRow, sourceCol],
    ];
    const seen = new Set<string>([
      `${sourceId}#${packKey(sourceRow, sourceCol)}`,
    ]);
    while (queue.length > 0) {
      const [sid, r, c] = queue.shift()!;
      for (const [dk, model] of this.depModel) {
        if (!this.modelDependsOn(dk, model, sid, r, c)) continue;
        this.dirty.add(dk);
        if (seen.has(dk)) continue;
        seen.add(dk);
        const dep = cellOfDk(dk);
        queue.push([dep.id, dep.row, dep.col]);
      }
    }
  }

  private rewriteQualifiedSheetName(oldName: string, newName: string): void {
    const quoted = needsQuoting(newName)
      ? `'${newName.replace(/'/g, "''")}'`
      : newName;
    for (const id of this.order) {
      const entry = this.byId.get(id)!;
      const keys = [...this.formulaCells.get(id)!];
      for (const key of keys) {
        const addr = unpack(key);
        const cell = entry.ws.getCell(addr);
        const formula = cell?.formula;
        if (!formula) continue;
        const tokens = scanQualifiedReferences(formula);
        const hit = tokens.filter(
          (t) => t.sheet.toLowerCase() === oldName.toLowerCase(),
        );
        if (hit.length === 0) continue;
        let rewritten = "";
        let cursor = 0;
        for (const tok of hit) {
          rewritten += formula.slice(cursor, tok.start);
          // Replace only the sheet-name portion, keep the `!A1[:B2]` tail.
          // Use the token's parsed suffix (`refTail`) rather than the first
          // textual `!`, which may be inside a quoted name (e.g. `'Ops!2026'!A1`).
          rewritten += `${quoted}${tok.refTail}`;
          cursor = tok.end;
        }
        rewritten += formula.slice(cursor);
        if (rewritten !== formula) {
          entry.ws.setCellFormula(addr, rewritten, cell!.value);
        }
      }
    }
  }

  // ───────────────────────────── dirty queries ────────────────────────────

  isDirty(sheetName: string, addr: { row: number; col: number }): boolean {
    const id = this.resolveId(sheetName);
    if (!id) return false;
    return this.dirty.has(this.depKey(id, addr.row, addr.col));
  }

  getValue(sheetName: string, addr: { row: number; col: number }): CellValue {
    const ws = this.getSheet(sheetName);
    return (ws?.getCellValue(addr) as CellValue) ?? null;
  }

  // ───────────────────────────── recalculation ────────────────────────────

  /**
   * Recalculate every formula cell across all sheets in deterministic
   * topological order. Cross-sheet cycles (and their descendants) receive
   * `#CIRC!`, matching the iteration-disabled policy. Clears the dirty set.
   */
  recalculate(): PrototypeRecalcResult {
    const nodes = this.collectNodes();
    const { order, cyclic } = this.topoSort(nodes);

    for (const id of this.order)
      this.byId.get(id)?.ws.beginFormulaResultEventBatch();
    try {
      let evaluated = 0;
      for (const node of order) {
        this.evaluateNode(node);
        evaluated++;
      }
      for (const node of cyclic) {
        const entry = this.byId.get(node.id)!;
        entry.ws.applyCalculatedValue(
          { row: node.row, col: node.col },
          "#CIRC!",
        );
      }
      // Clear dirty BEFORE flushing deferred result events so listener edits
      // made during flush remain dirty for the next pass.
      this.dirty.clear();
      return { evaluated, circular: cyclic.length };
    } finally {
      for (const id of this.order)
        this.byId.get(id)?.ws.endFormulaResultEventBatch(true);
    }
  }

  private collectNodes(): GraphNode[] {
    const nodes: GraphNode[] = [];
    for (const id of this.order) {
      for (const key of this.formulaCells.get(id)!) {
        const addr = unpack(key);
        nodes.push({
          id,
          key,
          row: addr.row,
          col: addr.col,
          dk: `${id}#${key}`,
        });
      }
    }
    return nodes;
  }

  private topoSort(nodes: GraphNode[]): {
    order: GraphNode[];
    cyclic: GraphNode[];
  } {
    const byDk = new Map<string, GraphNode>();
    for (const n of nodes) byDk.set(n.dk, n);

    const successors = new Map<string, string[]>();
    const indegree = new Map<string, number>();
    for (const n of nodes) {
      indegree.set(n.dk, 0);
      successors.set(n.dk, []);
    }

    const addEdge = (fromDk: string, toDk: string) => {
      if (!byDk.has(fromDk) || !byDk.has(toDk)) return;
      if (fromDk === toDk) {
        // Finding B: a self-edge is a cycle, not an acyclic no-op. Record it so
        // the node (and its descendants) is classified cyclic → `#CIRC!`.
        selfLoops.add(fromDk);
        return;
      }
      successors.get(fromDk)!.push(toDk);
      indegree.set(toDk, (indegree.get(toDk) ?? 0) + 1);
    };
    const selfLoops = new Set<string>();

    for (const n of nodes) {
      const model = this.depModel.get(n.dk);
      if (!model) continue;
      const localKeys = this.formulaCells.get(n.id)!;

      // Local point precedents (edges only to formula cells; values are leaves).
      for (const lc of model.localCells) {
        if (!isValidCoord(lc.row, lc.col)) continue;
        const fk = packKey(lc.row, lc.col);
        if (localKeys.has(fk)) addEdge(`${n.id}#${fk}`, n.dk);
      }
      // Local range precedents (every formula cell inside the rectangle),
      // verified explicitly here rather than via the point-only graph API.
      for (const rg of model.localRanges) {
        for (const fk of localKeys) {
          const a = unpack(fk);
          if (rangeContains(rg, a.row, a.col)) addEdge(`${n.id}#${fk}`, n.dk);
        }
      }
      // Qualified (cross-sheet, or qualified self) precedents.
      for (const q of model.qualified) {
        if (!q.inBounds) continue; // out-of-bounds refs bind no edge (→ #REF!)
        const targetId = this.resolveId(q.sheetName) ?? q.sheetId;
        if (!targetId) continue;
        const targetKeys = this.formulaCells.get(targetId);
        if (!targetKeys) continue;
        if (q.kind === "cell") {
          if (!isValidCoord(q.row!, q.col!)) continue; // oversized → #REF! only
          const fk = packKey(q.row!, q.col!);
          if (targetKeys.has(fk)) addEdge(`${targetId}#${fk}`, n.dk);
        } else {
          for (const fk of targetKeys) {
            const a = unpack(fk);
            if (
              a.row >= q.startRow! &&
              a.row <= q.endRow! &&
              a.col >= q.startCol! &&
              a.col <= q.endCol!
            ) {
              addEdge(`${targetId}#${fk}`, n.dk);
            }
          }
        }
      }
    }

    // Nodes with a self-edge can never become ready; force indegree > 0 so they
    // (and everything reachable from them) are classified cyclic.
    for (const dk of selfLoops) {
      indegree.set(dk, (indegree.get(dk) ?? 0) + 1);
    }

    // Kahn with deterministic ordering by dependentKey.
    const ready = nodes
      .filter((n) => indegree.get(n.dk) === 0)
      .map((n) => n.dk)
      .sort();
    const resultOrder: GraphNode[] = [];
    const emitted = new Set<string>();
    while (ready.length > 0) {
      const dk = ready.shift()!;
      emitted.add(dk);
      resultOrder.push(byDk.get(dk)!);
      const next: string[] = [];
      for (const s of successors.get(dk)!) {
        indegree.set(s, (indegree.get(s) ?? 0) - 1);
        if (indegree.get(s) === 0) next.push(s);
      }
      if (next.length > 0) {
        ready.push(...next);
        ready.sort();
      }
    }

    const cyclic = nodes.filter((n) => !emitted.has(n.dk));
    return { order: resultOrder, cyclic };
  }

  private evaluateNode(node: GraphNode): void {
    const entry = this.byId.get(node.id)!;
    const cell = entry.ws.getCell({ row: node.row, col: node.col });
    const formula = cell?.formula;
    if (!formula) return;

    const rewritten = this.substituteQualified(formula);
    let value: CellValue;
    try {
      // Evaluate against a value-only view: because nodes are visited in
      // topological order every precedent already holds its computed value, so
      // the engine must read those cached values rather than recursively
      // re-evaluating a precedent's RAW formula (which may still contain an
      // unresolved qualified token the production parser cannot handle).
      const result = entry.engine.evaluate(rewritten, {
        worksheet: valueOnlyView(entry.ws),
        currentCell: { row: node.row, col: node.col },
      });
      if (result instanceof Error) {
        value = result.message;
      } else if (Array.isArray(result)) {
        value = result as unknown as CellValue;
      } else {
        value = result as CellValue;
      }
    } catch {
      value = "#ERROR!";
    }
    entry.ws.applyCalculatedValue({ row: node.row, col: node.col }, value);
  }

  /** Replace every qualified token with a temporary literal binding. */
  private substituteQualified(formula: string): string {
    const tokens = scanQualifiedReferences(formula);
    if (tokens.length === 0) return formula;
    let out = "";
    let cursor = 0;
    for (const tok of tokens) {
      out += formula.slice(cursor, tok.start);
      out += this.resolveToken(tok);
      cursor = tok.end;
    }
    out += formula.slice(cursor);
    return out;
  }

  private resolveToken(tok: QualifiedToken): string {
    const id = this.resolveId(tok.sheet);
    const ws = id ? this.byId.get(id)?.ws : undefined;
    if (!ws) return "#REF!"; // missing / deleted sheet → deterministic #REF!

    // Out-of-bounds coordinates (row < 1, col < 1, or beyond the worksheet
    // extent) are classified by the scanner. They must resolve to a
    // deterministic #REF! and never bind a valid precedent.
    if (!tok.inBounds) return "#REF!";

    if (tok.kind === "cell") {
      const { row, col } = tok.cell!;
      if (!isValidCoord(row, col)) return "#REF!";
      return renderScalar(ws.getCellValue({ row, col }) as CellValue);
    }

    const r = tok.range!;
    if (
      !isValidCoord(r.startRow, r.startCol) ||
      !isValidCoord(r.endRow, r.endCol)
    )
      return "#REF!";
    const rows: string[] = [];
    for (let row = r.startRow; row <= r.endRow; row++) {
      const cols: string[] = [];
      for (let col = r.startCol; col <= r.endCol; col++) {
        cols.push(
          renderArrayElement(ws.getCellValue({ row, col }) as CellValue),
        );
      }
      rows.push(cols.join(","));
    }
    return `{${rows.join(";")}}`;
  }

  // ───────────────────────────── snapshot ─────────────────────────────────

  toSnapshot(): WorkbookSnapshotEnvelope {
    return {
      format: SNAPSHOT_FORMAT,
      version: SNAPSHOT_VERSION,
      nextSheetSequence: this.nextSheetSequence,
      sheets: this.order.map((id) => {
        const entry = this.byId.get(id)!;
        return { id, name: entry.name, state: entry.ws.extractSnapshot() };
      }),
    };
  }

  static fromSnapshot(
    envelope: WorkbookSnapshotEnvelope,
  ): WorkbookCalculationPrototype {
    const wb = new WorkbookCalculationPrototype();
    wb.restoreFromEnvelope(envelope);
    return wb;
  }

  private restoreFromEnvelope(envelope: WorkbookSnapshotEnvelope): void {
    if (!envelope || typeof envelope !== "object") {
      throw new Error("Invalid workbook snapshot envelope");
    }
    if (envelope.format !== SNAPSHOT_FORMAT) {
      throw new Error(
        `Unsupported workbook snapshot format: ${String(envelope.format)}`,
      );
    }
    if (envelope.version !== SNAPSHOT_VERSION) {
      throw new Error(
        `Unsupported workbook snapshot version: ${String(envelope.version)}`,
      );
    }
    if (!Array.isArray(envelope.sheets)) {
      throw new Error("Workbook snapshot must contain a sheets array");
    }
    if (
      !Number.isInteger(envelope.nextSheetSequence) ||
      envelope.nextSheetSequence < 1
    ) {
      throw new Error("Workbook snapshot has an invalid nextSheetSequence");
    }

    // Validate identities, names, and the id-sequence policy before replacing
    // any live state. Invalid manifests must be rejected up-front (Finding C).
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();
    let maxSequence = 0;
    for (const sheet of envelope.sheets) {
      if (!sheet || typeof sheet.id !== "string" || sheet.id.length === 0) {
        throw new Error("Workbook snapshot has an invalid sheet id");
      }
      if (!/^xsheet-\d+$/.test(sheet.id)) {
        throw new Error(
          `Workbook snapshot has a malformed sheet id '${sheet.id}'`,
        );
      }
      if (seenIds.has(sheet.id))
        throw new Error(`Duplicate sheet id '${sheet.id}'`);
      seenIds.add(sheet.id);
      if (typeof sheet.name !== "string" || sheet.name.trim().length === 0) {
        throw new Error("Workbook snapshot has an invalid sheet name");
      }
      if (seenNames.has(sheet.name.toLowerCase())) {
        throw new Error(`Duplicate sheet name '${sheet.name}'`);
      }
      seenNames.add(sheet.name.toLowerCase());
      if (!sheet.state || typeof sheet.state !== "object") {
        throw new Error(`Sheet '${sheet.name}' is missing worksheet state`);
      }
      maxSequence = Math.max(maxSequence, parseSequence(sheet.id));
    }
    // An id at or beyond the next-sequence counter is an inconsistent manifest.
    if (maxSequence >= envelope.nextSheetSequence) {
      throw new Error(
        "Workbook snapshot sequence counter is inconsistent with its sheet ids",
      );
    }

    // Stage every worksheet (including coordinate validation via applySnapshot)
    // BEFORE mutating the live coordinator, so an invalid snapshot throws with
    // no partial state exposed.
    const staged: Array<{
      id: string;
      name: string;
      ws: Worksheet;
      engine: FormulaEngine;
      state: WorksheetSnapshot;
    }> = [];
    for (const sheet of envelope.sheets) {
      const engine = new FormulaEngine();
      const ws = new Worksheet(
        sheet.name,
        sheet.state.rowCount,
        sheet.state.colCount,
        engine as unknown as IFormulaEngine,
      );
      ws.applySnapshot(sheet.state); // validates coordinates (throws RangeError)
      staged.push({
        id: sheet.id,
        name: sheet.name,
        ws,
        engine,
        state: sheet.state,
      });
    }

    // Commit: all sheets validated — now replace live state and install in a
    // deterministic order. Qualified bindings are resolved in a SECOND pass so
    // forward references (and reversed-order manifests) resolve identically.
    this._suspendObserve = true;
    try {
      this.reset();
      for (const s of staged) this.installSheet(s.id, s.name, s.ws, s.engine);
      for (const s of staged) this.recordFormulaCells(s.id, s.state);
      for (const s of staged) this.bindModels(s.id, s.state);
    } finally {
      this._suspendObserve = false;
    }
    this.nextSheetSequence = Math.max(
      envelope.nextSheetSequence,
      maxSequence + 1,
    );
  }

  /** First pass: record which cells are formula cells (no dependency binding). */
  private recordFormulaCells(id: string, state: WorksheetSnapshot): void {
    const keys = this.formulaCells.get(id)!;
    for (const { row, col, cell } of state.cells) {
      if (typeof cell.formula === "string" && cell.formula.length > 0) {
        keys.add(packKey(row, col));
      }
    }
  }

  /** Second pass: build the dependency model now that every sheet is installed. */
  private bindModels(id: string, state: WorksheetSnapshot): void {
    for (const { row, col, cell } of state.cells) {
      if (typeof cell.formula === "string" && cell.formula.length > 0) {
        this.depModel.set(
          `${id}#${packKey(row, col)}`,
          this.buildModel(row, col, cell.formula),
        );
      }
    }
  }

  private reset(): void {
    for (const entry of this.byId.values()) entry.subscription.dispose();
    this.byId.clear();
    this.byName.clear();
    this.order.length = 0;
    this.formulaCells.clear();
    this.depModel.clear();
    this.dirty.clear();
    this.nextSheetSequence = 1;
  }

  // ───────────────────────────── transaction ──────────────────────────────

  /**
   * Run `work` inside a synchronous workbook transaction. On any throw the
   * entire workbook (identities, sheets, formula text, cross-sheet values, and
   * edges) is restored to its pre-transaction state. Async work is rejected.
   *
   * Handle-lifetime policy (Finding D): worksheet objects that existed before
   * the transaction and survive the rollback are restored IN PLACE — the same
   * object identity and mutation subscription are preserved, so a handle
   * captured before the transaction remains valid afterward. Sheets CREATED
   * during the transaction are removed on rollback (their handles become
   * detached and inert). Sheets DELETED during the transaction are reinstalled
   * using their original object.
   *
   * This is a reference boundary, not a substitute for CS-001C's authoritative
   * journal.
   */
  transaction<T>(work: () => T): T {
    const checkpoint = this.captureCheckpoint();
    try {
      const result = work();
      if (result && typeof (result as { then?: unknown }).then === "function") {
        this.restoreCheckpoint(checkpoint);
        throw new Error(
          "WorkbookCalculationPrototype.transaction does not support async work",
        );
      }
      return result;
    } catch (error) {
      this.restoreCheckpoint(checkpoint);
      throw error;
    }
  }

  private captureCheckpoint(): TxnCheckpoint {
    return {
      nextSheetSequence: this.nextSheetSequence,
      dirty: new Set(this.dirty),
      sheets: this.order.map((id) => {
        const e = this.byId.get(id)!;
        return {
          id,
          name: e.name,
          ws: e.ws,
          engine: e.engine,
          snapshot: e.ws.extractSnapshot(),
        };
      }),
    };
  }

  private restoreCheckpoint(cp: TxnCheckpoint): void {
    this._suspendObserve = true;
    try {
      const cpIds = new Set(cp.sheets.map((s) => s.id));
      // Remove sheets created during the transaction; their handles detach.
      for (const id of [...this.order]) {
        if (!cpIds.has(id)) {
          const e = this.byId.get(id)!;
          e.subscription.dispose();
          this.byId.delete(id);
          this.formulaCells.delete(id);
        }
      }

      this.byName.clear();
      this.order.length = 0;
      this.depModel.clear();

      for (const s of cp.sheets) {
        const existing = this.byId.get(s.id);
        if (existing && existing.ws === s.ws) {
          // Survived: restore IN PLACE, preserving object identity + listener.
          existing.name = s.name;
          (existing.ws as { name: string }).name = s.name;
          existing.ws.applySnapshot(s.snapshot);
        } else {
          // Deleted during the transaction: reinstall the original object.
          if (existing) existing.subscription.dispose();
          s.ws.applySnapshot(s.snapshot);
          const subscription = s.ws.onMutation((ev) => this.observe(s.id, ev));
          this.byId.set(s.id, {
            id: s.id,
            name: s.name,
            ws: s.ws,
            engine: s.engine,
            subscription,
          });
        }
        this.byName.set(s.name.toLowerCase(), s.id);
        this.order.push(s.id);
        this.formulaCells.set(s.id, new Set());
      }

      // Rebuild formula tracking + dependency model from the captured snapshots.
      for (const s of cp.sheets) this.recordFormulaCells(s.id, s.snapshot);
      for (const s of cp.sheets) this.bindModels(s.id, s.snapshot);

      this.nextSheetSequence = cp.nextSheetSequence;
      this.dirty.clear();
      for (const dk of cp.dirty) this.dirty.add(dk);
    } finally {
      this._suspendObserve = false;
    }
  }
}

interface TxnCheckpoint {
  nextSheetSequence: number;
  dirty: Set<string>;
  sheets: Array<{
    id: string;
    name: string;
    ws: Worksheet;
    engine: FormulaEngine;
    snapshot: WorksheetSnapshot;
  }>;
}

interface GraphNode {
  id: string;
  key: number;
  row: number;
  col: number;
  dk: string;
}

// ────────────────────────────── literal rendering ─────────────────────────

const ERROR_LITERAL = /^#[A-Z0-9_?/]+!?$|^#N\/A$/i;

function renderScalar(value: CellValue): string {
  if (value === null || value === undefined) return "(0)";
  if (typeof value === "number")
    return Number.isFinite(value) ? `(${value})` : "#NUM!";
  if (typeof value === "boolean") return value ? "(TRUE)" : "(FALSE)";
  if (typeof value === "string") {
    if (ERROR_LITERAL.test(value.trim())) return value.trim();
    return `("${value.replace(/"/g, '""')}")`;
  }
  return "(0)";
}

function renderArrayElement(value: CellValue): string {
  if (value === null || value === undefined) return "0";
  if (typeof value === "number")
    return Number.isFinite(value) ? String(value) : "#NUM!";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "string") {
    if (ERROR_LITERAL.test(value.trim())) return value.trim();
    return `"${value.replace(/"/g, '""')}"`;
  }
  return "0";
}

function needsQuoting(name: string): boolean {
  return !/^[A-Za-z_][A-Za-z0-9_.]*$/.test(name);
}

function parseSequence(id: string): number {
  const match = /^xsheet-(\d+)$/.exec(id);
  return match ? parseInt(match[1], 10) : 0;
}

function unpack(key: number): { row: number; col: number } {
  return unpackKey(key);
}

/** Split a dependentKey `${id}#${packKey}` back into sheet id + coordinate. */
function cellOfDk(dk: string): { id: string; row: number; col: number } {
  const hash = dk.indexOf("#");
  const id = dk.slice(0, hash);
  const { row, col } = unpackKey(Number(dk.slice(hash + 1)));
  return { id, row, col };
}

/** Inclusive one-based rectangle membership test. */
function rangeContains(range: AddressRange, row: number, col: number): boolean {
  return (
    row >= range.startRow &&
    row <= range.endRow &&
    col >= range.startCol &&
    col <= range.endCol
  );
}

/** True when a one-based coordinate is within Excel worksheet bounds. */
function isValidCoord(row: number, col: number): boolean {
  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 1 &&
    row <= MAX_WORKSHEET_ROW &&
    col >= 1 &&
    col <= MAX_WORKSHEET_COLUMN
  );
}

/**
 * A read-through worksheet view whose `getCell` strips the `formula` field so
 * the FormulaEngine resolves cell references to their already-computed values
 * instead of recursively re-evaluating a precedent's raw formula. Safe only
 * because the coordinator evaluates nodes in topological order.
 */
function valueOnlyView(ws: Worksheet): Worksheet {
  return new Proxy(ws, {
    get(target, prop, receiver) {
      if (prop === "getCell") {
        return (addr: { row: number; col: number }) => {
          const cell = target.getCell(addr);
          if (cell && "formula" in cell) {
            const clone: Record<string, unknown> = { ...cell };
            delete clone.formula;
            return clone;
          }
          return cell;
        };
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as Worksheet;
}
