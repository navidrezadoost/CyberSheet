/**
 * @cyber-sheet/core/search — Formula Search & Replace + Full-Sheet Search
 *
 * Stateless functions for searching and replacing cell content.  These are
 * feature-layer utilities on top of the stable kernel; they do not mutate DAG
 * state, snapshot state, or internal event routing.
 *
 * ─── Design guarantees ──────────────────────────────────────────────────────
 *   1. EXPLICIT PULL — search is never triggered automatically by mutations.
 *   2. NO INTERNAL STATE — no cache, no last-query, no index retained.
 *   3. SDK MUTATIONS — replace functions write back via applyPatch / setCell,
 *      so every replacement goes through the undo stack and emits events.
 *   4. DETERMINISTIC — same state + same args → same result, always.
 *   5. LITERAL-SAFE — '.' '(' ')' '$' ':' are always plain chars, not regex.
 *
 * ─── Phase 16 (formula-only) ────────────────────────────────────────────────
 *   findInFormulas(sheet, query, opts?) → FormulaSearchResult[]
 *   replaceInFormulas(sheet, query, repl, opts?) → number
 *   Iterates only cells where cell.formula != null — O(f).
 *
 * ─── Phase 17 (full-sheet) ───────────────────────────────────────────────────
 *   findAll(sheet, options, range?) → SheetSearchResult[]
 *   replaceAll(sheet, query, repl, opts?, range?) → number
 *   Full-sheet search across values / formulas / comments.
 *   replaceAll batches all mutations into ONE applyPatch call → single undo entry.
 *
 * ─── Phase 18 (Go To Special + Search Navigator) ────────────────────────────
 *   findSpecial(sheet, options, range?) → Address[]
 *   Implements Excel "Go To Special" for all 14 SpecialCellType variants.
 *
 *   new SearchCursor(sheet, options, range?) → SearchCursor
 *   Stateful navigator: findNext() / findPrev() / reset() with wrap-around.
 *
 * @module search
 */

import type { Address, ExtendedCellValue } from '../types';
import type { SpreadsheetSDK } from '../sdk/SpreadsheetSDK';
import { DisposedError } from '../sdk/SpreadsheetSDK';
import type { Worksheet } from '../worksheet';
import type { SearchOptions, SearchRange, SpecialCellsOptions } from '../types/search-types';
import type { WorksheetPatch } from '../patch/WorksheetPatch';
import type { SyncUndoStack } from '../sdk/SyncUndoStack';
import { compareRowMajor, escapeRegexLiteral, cellValueToString } from '../search-engine';

// Re-export standard search option types so callers import from one place.
export type { SearchOptions, SearchRange, SpecialCellsOptions, SpecialCellValue } from '../types/search-types';

// ---------------------------------------------------------------------------
// Internal type cast helper
// ---------------------------------------------------------------------------

/**
 * Internal projection type used to reach `_ws`, `_undo`, and `_disposed` on
 * the concrete SpreadsheetV1 implementation without leaking them onto the
 * public interface.
 */
type InternalSheet = SpreadsheetSDK & {
  readonly _ws: Worksheet;
  readonly _undo: SyncUndoStack;
  readonly _disposed: boolean;
};

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Options for formula-string search operations.
 *
 * Intentionally a minimal subset of `SearchOptions` — formula search does
 * not need `lookIn`, `searchOrder`, `searchDirection`, or `includeHidden`
 * because it always:
 *   - searches `.formula` strings (never display values)
 *   - iterates formula cells in row-major ascending order
 *   - visits DAG-registered formula cells regardless of visibility
 */
export interface FormulaSearchOptions {
  /**
   * Case-sensitive match.
   * Default: `false` (case-insensitive, matching Excel's default Find behaviour).
   */
  matchCase?: boolean;

  /**
   * Whether the query must match the ENTIRE formula string (`'whole'`) or any
   * substring within it (`'part'`, default).
   *
   * `'whole'` is equivalent to Excel's "Match entire cell contents" checkbox.
   */
  lookAt?: 'part' | 'whole';
}

/**
 * A single match returned by `findInFormulas`.
 */
export interface FormulaSearchResult {
  /** 1-based row index of the matched cell. */
  row: number;
  /** 1-based column index of the matched cell. */
  col: number;
  /** The full formula string that matched (the value of `cell.formula`). */
  formula: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Build a predicate that tests a formula string against `query`.
 *
 * Uses a plain escaped-literal regex (no Excel-wildcard translation) because
 * Phase 16 targets exact-literal search only.  Adding wildcard or regex
 * support in a later phase is additive and non-breaking.
 *
 * @param query     Literal search string (NOT a pattern).
 * @param matchCase Whether the comparison should be case-sensitive.
 * @param lookAt    'part' = substring anywhere; 'whole' = entire string must match.
 */
function buildFormulaMatchPredicate(
  query: string,
  matchCase: boolean,
  lookAt: 'part' | 'whole',
): (formula: string) => boolean {
  if (query === '') return () => false;

  const escaped = escapeRegexLiteral(query);
  const pattern = lookAt === 'whole' ? `^${escaped}$` : escaped;
  const flags = matchCase ? '' : 'i';
  const re = new RegExp(pattern, flags);

  return (formula: string) => re.test(formula);
}

/**
 * Perform a literal string substitution inside `formula`.
 *
 * - `lookAt: 'whole'` replaces the entire formula string with `replacement`.
 * - `lookAt: 'part'`  replaces EVERY occurrence of `query` within the formula.
 *
 * Replacement is a plain string (not a regex substitution template), so
 * characters like `$` in the replacement are treated as literals.
 *
 * @returns The modified formula string, or `formula` unchanged if `query` not found.
 */
function applyFormulaReplacement(
  formula: string,
  query: string,
  replacement: string,
  matchCase: boolean,
  lookAt: 'part' | 'whole',
): string {
  if (query === '') return formula;

  if (lookAt === 'whole') {
    // The caller already verified formula matches the whole pattern; just swap.
    return replacement;
  }

  // Part-match: replace every occurrence of `query` as a literal substring.
  // Use a regex with 'g' flag so all occurrences are replaced in one pass.
  const escaped = escapeRegexLiteral(query);
  const flags = matchCase ? 'g' : 'gi';
  const re = new RegExp(escaped, flags);
  // Use a function replacement to treat `$` in `replacement` as a plain char.
  return formula.replace(re, () => replacement);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Find all formula cells whose formula string contains (or equals) `query`.
 *
 * Iterates ONLY formula cells registered in the dependency graph — never
 * scans blank cells or cells with plain values.  This bounds the cost to
 * O(f) where f is the number of formula cells, regardless of sheet dimensions.
 *
 * Results are returned in row-major ascending order (top-to-bottom,
 * left-to-right within each row) — the same order as Excel's Find All.
 *
 * @param sheet   An active (non-disposed) SpreadsheetSDK instance.
 * @param query   Literal string to search for.  Empty string returns `[]`.
 * @param options Optional match configuration.
 * @returns       Sorted array of `FormulaSearchResult` for matched formula cells.
 *
 * @throws `DisposedError` — propagated transparently if `sheet` is disposed.
 *
 * @example
 * ```ts
 * import { findInFormulas } from '@cyber-sheet/core/search';
 *
 * const matches = findInFormulas(sheet, 'SUM');
 * // → [{ row: 2, col: 3, formula: '=SUM(A1:A10)' }, ...]
 *
 * // Case-sensitive whole-cell match:
 * const exact = findInFormulas(sheet, '=NOW()', { matchCase: true, lookAt: 'whole' });
 * ```
 */
export function findInFormulas(
  sheet: SpreadsheetSDK,
  query: string,
  options?: FormulaSearchOptions,
): FormulaSearchResult[] {
  if (query === '') return [];

  const { matchCase = false, lookAt = 'part' } = options ?? {};
  const ws = (sheet as InternalSheet)._ws;
  const predicate = buildFormulaMatchPredicate(query, matchCase, lookAt);

  // ── 1. Collect formula cells from the cell store (O(n_stored)) ──────────
  // getFormulaAddresses() iterates the cell store and returns only cells where
  // cell.formula != null.  Blank cells and plain-value cells are skipped.
  // This covers formula cells regardless of DAG registration status (e.g.
  // cells created via setCellFormula() without a live formula engine).
  const formulaAddresses = ws.getFormulaAddresses();

  // ── 2. Filter: only cells whose formula string matches ────────────────────
  const results: FormulaSearchResult[] = [];
  for (const { row, col } of formulaAddresses) {
    const cell = ws.getCell({ row, col });
    if (cell?.formula == null) continue;   // defensive: shouldn't happen
    if (predicate(cell.formula)) {
      results.push({ row, col, formula: cell.formula });
    }
  }

  // ── 3. Stable row-major sort ──────────────────────────────────────────────
  // DAG iteration order is insertion order (Map); sort to guarantee
  // deterministic, row-major output independent of registration order.
  results.sort((a, b) => compareRowMajor(a, b));

  return results;
}

/**
 * Replace text within formula strings for all formula cells that match
 * `query`, mutating the sheet through the SDK's `setCell` path so that:
 *   - every replacement is recorded on the undo stack,
 *   - every replacement emits the appropriate SDK events,
 *   - no internal DAG or patch state is modified outside the normal mutation flow.
 *
 * Behaviour for `lookAt: 'part'` (default): every occurrence of `query`
 * within the matched formula is replaced (global replace within the string),
 * not just the first.
 *
 * Behaviour for `lookAt: 'whole'`: the entire formula string is replaced with
 * `replacement`.
 *
 * The resulting value stored by `setCell` is the modified formula string.
 * Because the SDK's `setCell` maps to a `setCellValue` patch op (stores as a
 * plain string value), the `.formula` field of the cell is NOT updated — the
 * replacement is stored in `.value`.  This is intentional for Phase 16:
 * formula-engine re-registration is a Phase 17+ concern.
 *
 * @param sheet       An active SpreadsheetSDK instance.
 * @param query       Literal string to find.  Empty string is a no-op (returns 0).
 * @param replacement Replacement string.  Plain literal — `$` is NOT special.
 * @param options     Optional match configuration.
 * @returns           Number of formula cells whose formula string was modified.
 *
 * @throws `DisposedError` — propagated transparently if `sheet` is disposed.
 * @throws `PatchError`    — propagated transparently if setCell fails.
 *
 * @example
 * ```ts
 * import { replaceInFormulas } from '@cyber-sheet/core/search';
 *
 * // Rename all references from sheet "Sales" to sheet "Revenue" in formulas:
 * const count = replaceInFormulas(sheet, 'Sales!', 'Revenue!');
 *
 * // Case-sensitive whole-cell replacement:
 * const n = replaceInFormulas(sheet, '=PLACEHOLDER()', '=SUM(A1:A10)',
 *   { matchCase: true, lookAt: 'whole' });
 * ```
 */
export function replaceInFormulas(
  sheet: SpreadsheetSDK,
  query: string,
  replacement: string,
  options?: FormulaSearchOptions,
): number {
  if (query === '') return 0;

  const { matchCase = false, lookAt = 'part' } = options ?? {};

  // ── 1. Find all matching formula cells ────────────────────────────────────
  const matches = findInFormulas(sheet, query, { matchCase, lookAt });
  if (matches.length === 0) return 0;

  // ── 2. Replace formula text and write back via SDK ─────────────────────────
  // Each setCell call goes through the undo stack (SyncUndoStack.applyAndRecord)
  // and emits 'cell-changed' + 'structure-changed' events as normal.
  let replaced = 0;
  for (const { row, col, formula } of matches) {
    const newValue = applyFormulaReplacement(formula, query, replacement, matchCase, lookAt);
    // Only write if the replacement actually produced a different string.
    if (newValue !== formula) {
      sheet.setCell(row, col, newValue);
      replaced++;
    }
  }

  return replaced;
}

// =============================================================================
// Phase 17 — Full-Sheet Search & Replace
// =============================================================================

// ---------------------------------------------------------------------------
// Phase 17 public types
// ---------------------------------------------------------------------------

/**
 * A single result from `findAll`.
 *
 * `value` is the raw `Cell.value` at the time of the search (the display
 * value or last computed result for formula cells).  `formula` is present
 * only when the matched cell has a formula string.
 */
export interface SheetSearchResult {
  /** 1-based row index. */
  row: number;
  /** 1-based column index. */
  col: number;
  /** Current cell value (display / computed result). */
  value: ExtendedCellValue;
  /** Formula string, if the cell has one. */
  formula?: string;
}

/**
 * Options for `replaceAll`.
 *
 * A minimal subset of `SearchOptions` — `lookup` and direction options are
 * not relevant for a replace-all operation that always processes every match.
 */
export interface ReplaceAllOptions {
  /**
   * Case-sensitive match.
   * Default: `false`.
   */
  matchCase?: boolean;

  /**
   * Whether the query must match the ENTIRE cell text (`'whole'`) or any
   * substring within it (`'part'`, default).
   */
  lookAt?: 'part' | 'whole';

  /**
   * What cell content to search and replace within.
   *   `'values'`   (default) — cell display/computed value as a string.
   *   `'formulas'` — formula string if present, else display value.
   *
   * `'comments'` is intentionally excluded: comment text is unstructured
   * and replacing it requires a different mutation path (not yet defined).
   */
  lookIn?: 'values' | 'formulas';
}

// ---------------------------------------------------------------------------
// Phase 17 internal helpers
// ---------------------------------------------------------------------------

/**
 * Derive the source text for a cell given `lookIn`.
 * Returns `null` for empty/blank cells (value is null and no formula).
 */
function getCellSourceText(
  cell: { value: ExtendedCellValue; formula?: string },
  lookIn: 'values' | 'formulas',
): string | null {
  if (lookIn === 'formulas') {
    return cell.formula != null ? cell.formula : cellValueToString(cell.value);
  }
  return cellValueToString(cell.value);
}

// ---------------------------------------------------------------------------
// Phase 17 public API
// ---------------------------------------------------------------------------

/**
 * Search ALL populated cells in the sheet and return every cell where the
 * searched text is found.
 *
 * This is a thin wrapper over `Worksheet.findAll()` that enriches the result
 * with the cell's current value and optional formula string.  The full
 * `SearchOptions` surface is forwarded directly — including `lookIn`,
 * `lookAt`, `matchCase`, `searchOrder`, `searchDirection`, `includeHidden`,
 * and Excel wildcard support (`*`, `?`, `~`).
 *
 * Results are returned in the order determined by `options.searchOrder`
 * (row-major by default).
 *
 * @param sheet   An active SpreadsheetSDK instance.
 * @param options Standard search options (`what` is required).
 * @param range   Optional sub-range to constrain the search.
 * @returns       Array of `SheetSearchResult` — empty when nothing matches.
 *
 * @throws `DisposedError` propagated if `sheet` is disposed.
 *
 * @example
 * ```ts
 * import { findAll } from '@cyber-sheet/core/search';
 *
 * // Find all cells that display "Apple" (values search, case-insensitive)
 * const results = findAll(sheet, { what: 'Apple' });
 *
 * // Find cells whose formula contains "SUM"
 * const formulaMatches = findAll(sheet, { what: 'SUM', lookIn: 'formulas' });
 *
 * // Restrict to a sub-range
 * const rangeHits = findAll(sheet,
 *   { what: 'error', matchCase: false },
 *   { start: { row: 1, col: 1 }, end: { row: 50, col: 10 } },
 * );
 * ```
 */
export function findAll(
  sheet: SpreadsheetSDK,
  options: SearchOptions,
  range?: SearchRange,
): SheetSearchResult[] {
  const ws = (sheet as InternalSheet)._ws;

  // Delegate to Worksheet.findAll which handles all SearchOptions logic:
  // wildcards, case sensitivity, hidden-row filtering, search order, etc.
  const addresses = ws.findAll(options, range);

  return addresses.map(({ row, col }) => {
    const cell = ws.getCell({ row, col });
    const result: SheetSearchResult = { row, col, value: cell?.value ?? null };
    if (cell?.formula != null) result.formula = cell.formula;
    return result;
  });
}

/**
 * Replace every occurrence of `query` across all matching cells in the sheet,
 * applying ALL mutations as a SINGLE `applyPatch` call so the entire
 * operation occupies exactly ONE undo history entry.
 *
 * This is the key difference from calling `replaceInFormulas` in a loop:
 * - `replaceInFormulas` adds N individual undo entries (one per cell).
 * - `replaceAll` adds exactly ONE undo entry for N cells.
 *
 * ─── What counts as a "replacement" ────────────────────────────────────────
 *   `lookIn: 'values'` (default):
 *     Source text = `cellValueToString(cell.value)`.
 *     Replacement is stored as a plain string value in the cell.
 *
 *   `lookIn: 'formulas'`:
 *     Source text = `cell.formula ?? cellValueToString(cell.value)`.
 *     Replacement is stored as a plain string value in the cell.
 *
 * ─── Undo behaviour ─────────────────────────────────────────────────────────
 *   A single `undo()` call reverses ALL replacements atomically.
 *   Each individual cell is restored to exactly its pre-replace state.
 *
 * ─── Event behaviour ────────────────────────────────────────────────────────
 *   `cell-changed` fires for each replaced cell (inside `applyPatch`).
 *   All events are still synchronous.
 *
 * @param sheet        An active SpreadsheetSDK instance.
 * @param query        Literal string to find.  Empty string is a no-op → 0.
 * @param replacement  Replacement string.  `$` is treated as a plain char.
 * @param options      Optional match configuration.
 * @param range        Optional sub-range to constrain the operation.
 * @returns            Number of cells actually modified (0 if nothing changed).
 *
 * @throws `DisposedError` propagated if `sheet` is disposed.
 * @throws `PatchError`    propagated if the batch patch application fails.
 *
 * @example
 * ```ts
 * import { replaceAll } from '@cyber-sheet/core/search';
 *
 * // Replace "Draft" with "Final" everywhere — single undo entry
 * const count = replaceAll(sheet, 'Draft', 'Final');
 *
 * // Case-sensitive whole-cell replace within a range
 * const n = replaceAll(sheet, 'PLACEHOLDER', '=SUM(A1:A10)',
 *   { matchCase: true, lookAt: 'whole', lookIn: 'formulas' },
 *   { start: { row: 1, col: 1 }, end: { row: 100, col: 5 } },
 * );
 *
 * sheet.undo(); // reverses ALL n replacements in one step
 * ```
 */
export function replaceAll(
  sheet: SpreadsheetSDK,
  query: string,
  replacement: string,
  options?: ReplaceAllOptions,
  range?: SearchRange,
): number {
  if (query === '') return 0;

  const {
    matchCase = false,
    lookAt    = 'part',
    lookIn    = 'values',
  } = options ?? {};

  const internal = sheet as InternalSheet;
  // Guard first — same contract as SDK mutation methods.
  if (internal._disposed) throw new DisposedError('replaceAll');
  const ws = internal._ws;

  // ── 1. Find all matching addresses via Worksheet.findAll ─────────────────
  // Delegate wildcard/case/hidden-row handling to the existing engine.
  const addresses = ws.findAll({ what: query, matchCase, lookAt, lookIn }, range);
  if (addresses.length === 0) return 0;

  // ── 2. Build ops for cells that actually change ───────────────────────────
  // `before` is set to `null` here; `recordingApplyPatch` (called inside
  // SpreadsheetV1.applyPatch) reads the actual current value from the
  // worksheet before each mutation and uses THAT for the inverse patch.
  // So the `before: null` placeholder is overwritten and undo is correct.
  const ops: WorksheetPatch['ops'] = [];

  for (const { row, col } of addresses) {
    const cell = ws.getCell({ row, col });
    if (!cell) continue;

    const source = getCellSourceText(cell, lookIn);
    if (source === null) continue;

    const newValue = applyFormulaReplacement(source, query, replacement, matchCase, lookAt);
    if (newValue === source) continue; // no actual change — skip

    ops.push({ op: 'setCellValue', row, col, before: null, after: newValue });
  }

  if (ops.length === 0) return 0;

  // ── 3. Apply as ONE patch → ONE undo entry ────────────────────────────────
  // `sheet.applyPatch()` is intentionally NOT used here: the public SDK
  // `applyPatch` is a raw low-level apply that does NOT push to the undo
  // stack (by design — it's for external replay, not interactive editing).
  // To get a SINGLE undo entry covering all N replacements, we call
  // `_undo.applyAndRecord(ws, patch)` directly, which is the same internal
  // path that `setCell` uses, but with our multi-op patch.
  const patch: WorksheetPatch = { seq: 0, ops };
  internal._undo.applyAndRecord(ws, patch);

  return ops.length;
}

// =============================================================================
// Phase 18 — Go To Special + Search Navigator
// =============================================================================

// ---------------------------------------------------------------------------
// Phase 18A: findSpecial — Go To Special
// ---------------------------------------------------------------------------

/**
 * Go To Special — return all cell addresses matching the given special-cell
 * criteria, implementing Excel's "Go To Special" dialog (Ctrl+G → Special).
 *
 * This is a thin, stateless wrapper over `Worksheet.getSpecialCells()` that
 * accepts a `SpreadsheetSDK` instance instead of a raw worksheet reference.
 *
 * ─── Supported SpecialCellType values ────────────────────────────────────
 *   'formulas'         — cells with a formula (+ optional value/error filter)
 *   'constants'        — non-formula cells with a value (+ optional filter)
 *   'blanks'           — empty cells within the search range
 *   'visible'          — cells not in hidden rows/columns
 *   'lastCell'         — bottom-right corner of the used range
 *   'currentRegion'    — contiguous block around `anchor` (Ctrl+*)
 *   'currentArray'     — spill range anchored at `anchor`
 *   'precedents'       — direct precedents of `anchor`
 *   'allPrecedents'    — transitive closure of all precedents
 *   'dependents'       — direct dependents of `anchor`
 *   'allDependents'    — transitive closure of all dependents
 *   'conditionalFormats' — cells covered by ≥1 conditional formatting rule
 *   'dataValidation'   — always [] (not yet fully implemented)
 *
 * @param sheet    An active SpreadsheetSDK instance.
 * @param options  What to find; must include `type`.  Use `value` to sub-filter
 *                 `'formulas'` or `'constants'` results by number/text/logical/error.
 *                 Use `anchor` for position-relative types.
 * @param range    Optional bounding box; restricts the search.
 * @returns        Sorted (row-major) array of addresses — empty if no match.
 *
 * @example
 * ```ts
 * import { findSpecial } from '@cyber-sheet/core/search';
 *
 * // All formula cells
 * const formulaAddrs = findSpecial(sheet, { type: 'formulas' });
 *
 * // Error formulas only
 * const errorAddrs = findSpecial(sheet, { type: 'formulas', value: 'errors' });
 *
 * // Blank cells within a range
 * const blanks = findSpecial(sheet,
 *   { type: 'blanks' },
 *   { start: { row: 1, col: 1 }, end: { row: 10, col: 5 } },
 * );
 *
 * // Direct precedents of A1
 * const prec = findSpecial(sheet, { type: 'precedents', anchor: { row: 1, col: 1 } });
 * ```
 */
export function findSpecial(
  sheet: SpreadsheetSDK,
  options: SpecialCellsOptions,
  range?: SearchRange,
): Address[] {
  const ws = (sheet as InternalSheet)._ws;
  return ws.getSpecialCells(options, range);
}

// ---------------------------------------------------------------------------
// Phase 18B: SearchCursor — find-next / find-previous navigator
// ---------------------------------------------------------------------------

/**
 * A stateful search navigator that wraps `Worksheet.find()` and maintains the
 * last-found position so successive calls to `findNext()` / `findPrev()`
 * advance through the worksheet without the caller tracking state.
 *
 * ─── Design ──────────────────────────────────────────────────────────────
 *   - Wraps `Worksheet.find(options, after, range)` which already implements
 *     direction-aware wrap-around search.
 *   - Stateless with respect to the worksheet — the cursor holds only the
 *     current position and the search options; it never caches cell data.
 *   - Safe to keep alive across mutations: every call re-scans from scratch.
 *
 * ─── Wrap-around behaviour ────────────────────────────────────────────────
 *   `findNext()`  wraps from the last cell back to the first match.
 *   `findPrev()`  wraps from the first cell back to the last match.
 *   Both behaviours are inherited from `Worksheet.find()`.
 *
 * @example
 * ```ts
 * import { SearchCursor } from '@cyber-sheet/core/search';
 *
 * const cursor = new SearchCursor(sheet, { what: 'Apple' });
 *
 * // Navigate forward through all matching cells
 * let addr = cursor.findNext();
 * while (addr && cursor.visitCount < 100) {
 *   console.log(addr);
 *   addr = cursor.findNext();
 * }
 *
 * cursor.reset(); // forget position, start over
 * ```
 */
export class SearchCursor {
  /** Last address returned by findNext() or findPrev(). `null` before first call or after reset(). */
  private _current: Address | null = null;

  /** Total number of successful finds since construction / last reset(). */
  private _visitCount = 0;

  /**
   * Create a new SearchCursor.
   *
   * @param sheet    An active SpreadsheetSDK instance.
   * @param options  Search options forwarded to `Worksheet.find()`.
   *                 `searchDirection` inside `options` is ignored — use
   *                 `findNext()` / `findPrev()` to control direction.
   * @param range    Optional sub-range to confine the search.
   */
  constructor(
    private readonly sheet: SpreadsheetSDK,
    private readonly options: SearchOptions,
    private readonly range?: SearchRange,
  ) {}

  /** The last address returned by findNext() / findPrev(), or null before first call / after reset(). */
  get current(): Address | null { return this._current; }

  /** Number of successful find calls since construction / last reset(). */
  get visitCount(): number { return this._visitCount; }

  /**
   * Move to the next matching cell (forward / row-major order).
   * Wraps to the first match when the end of the sheet is reached.
   *
   * Returns `null` when there are no matching cells at all.
   */
  findNext(): Address | null {
    const ws = (this.sheet as InternalSheet)._ws;
    const found = ws.find(
      { ...this.options, searchDirection: 'next' },
      this._current ?? undefined,
      this.range,
    );
    if (found) { this._current = found; this._visitCount++; }
    return found;
  }

  /**
   * Move to the previous matching cell (backward / row-major order).
   * Wraps to the last match when the beginning of the sheet is reached.
   *
   * Returns `null` when there are no matching cells at all.
   */
  findPrev(): Address | null {
    const ws = (this.sheet as InternalSheet)._ws;
    const found = ws.find(
      { ...this.options, searchDirection: 'previous' },
      this._current ?? undefined,
      this.range,
    );
    if (found) { this._current = found; this._visitCount++; }
    return found;
  }

  /**
   * Reset the cursor to an unpositioned state — the next findNext() /
   * findPrev() call will start from the beginning / end of the sheet.
   */
  reset(): void {
    this._current = null;
    this._visitCount = 0;
  }

  /**
   * Convenience: collect all matches via repeated findNext(), walking the
   * full result set exactly once before wrap-around.
   *
   * **Important**: resets the cursor first, then collects all matches in
   * row-major order, then resets again.  The cursor position is left at `null`.
   *
   * Cost: O(n * m) where n = populated cells, m = number of matches.
   * Prefer `findAll()` for bulk collection.
   */
  collectAll(): Address[] {
    this.reset();
    const all: Address[] = [];
    const first = this.findNext();
    if (!first) return [];
    all.push(first);
    while (true) {
      const next = this.findNext();
      if (!next) break;
      // Stop when we've wrapped back to the first result.
      if (next.row === first.row && next.col === first.col) break;
      all.push(next);
    }
    this.reset();
    return all;
  }
}
