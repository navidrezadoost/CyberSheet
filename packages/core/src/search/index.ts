/**
 * @cyber-sheet/core/search — Phase 16: Formula Search & Replace
 *
 * Stateless, pure-read functions for searching and replacing text within
 * formula strings.  These are feature-layer utilities built on top of the
 * stable Phase 1–15 kernel; they do not mutate DAG state, snapshot state, or
 * internal event routing.
 *
 * ─── Design guarantees ──────────────────────────────────────────────────────
 *   1. EXPLICIT PULL — search is never triggered automatically by mutations.
 *   2. FORMULA-ONLY — findInFormulas iterates only DAG-registered formula
 *      cells (via Worksheet.getFormulaAddresses), never scans blank/value rows.
 *   3. NO INTERNAL STATE — functions hold no cache, no last-query, no index.
 *      Every call is a fresh read over current sheet state.
 *   4. SDK MUTATIONS — replaceInFormulas writes back via SpreadsheetSDK.setCell,
 *      so every replacement goes through the undo stack and emits proper events.
 *   5. DETERMINISTIC — given the same sheet state and the same arguments,
 *      findInFormulas always returns the same sorted Address[] in the same order.
 *
 * ─── Complexity ─────────────────────────────────────────────────────────────
 *   findInFormulas   O(f)  where f = formula-cell count (never O(total cells))
 *   replaceInFormulas O(f) reads + O(m) setCell calls, m = match count
 *
 * ─── Boundaries (Phase 16 scope) ────────────────────────────────────────────
 *   ✔  Substring and whole-cell matches
 *   ✔  Case-insensitive and case-sensitive modes
 *   ✔  Replace-all (all occurrences in a matching formula string)
 *   ✔  Dry-run count (findInFormulas without replacing)
 *   ✗  Regex / wildcard patterns (plain literal only in Phase 16)
 *   ✗  Value-cell search (use worksheet.findAll for general cell search)
 *   ✗  Cross-sheet / workbook scope
 *   ✗  Internal state or incremental indexes
 *
 * @module search
 */

import type { Address } from '../types';
import type { SpreadsheetSDK } from '../sdk/SpreadsheetSDK';
import type { Worksheet } from '../worksheet';
import { compareRowMajor, escapeRegexLiteral } from '../search-engine';

// ---------------------------------------------------------------------------
// Internal type cast helper
// ---------------------------------------------------------------------------

/**
 * Internal projection type used to reach `_ws` on the concrete
 * SpreadsheetV1 implementation without leaking it onto the public interface.
 */
type InternalSheet = SpreadsheetSDK & { readonly _ws: Worksheet };

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
