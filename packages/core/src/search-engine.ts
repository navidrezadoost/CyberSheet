/**
 * search-engine.ts
 *
 * Core matching logic for the General Search API.
 *
 * Design contract (PM-enforced):
 *  - Correctness over speed: no premature caching or indexing.
 *  - escapeRegexLiteral() runs BEFORE any wildcard transforms.
 *  - Wildcard semantics match Excel exactly (see below).
 *  - cellValueToString() mirrors Excel's display-value rules.
 *
 * Excel wildcard rules:
 *   *    → any sequence of zero or more characters
 *   ?    → exactly one character
 *   ~*   → literal asterisk
 *   ~?   → literal question mark
 *   ~~   → literal tilde
 *   All other chars are literals (no special regex meaning).
 *
 * Phase 1 scope: values, formulas, comments; row-major forward search.
 * Phase 2 scope: backward / column-major search; replace.
 *
 * @module search-engine
 */

import type { SearchOptions, SearchLookIn } from './types/search-types';
import type { CellStyle } from './types';

// ---------------------------------------------------------------------------
// 1. Regex-safety helpers
// ---------------------------------------------------------------------------

/**
 * Escape every character that carries special meaning in a JavaScript RegExp.
 *
 * This MUST run on individual characters (or literal fragments) BEFORE
 * wildcard transforms are applied, so that a literal `.` in the search
 * term never becomes a regex dot-match.
 *
 * Escaped chars: . * + ? ^ $ { } [ ] | ( ) \
 */
export function escapeRegexLiteral(ch: string): string {
  return ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// 2. Wildcard → RegExp
// ---------------------------------------------------------------------------

/**
 * Convert an Excel wildcard pattern into a JavaScript RegExp.
 *
 * Algorithm (single left-to-right pass, O(n)):
 *   ~<x>   → escapeRegexLiteral(x)   (tilde-escape: next char is literal)
 *   *      → .*                       (any sequence)
 *   ?      → .                        (single char)
 *   other  → escapeRegexLiteral(ch)   (plain literal, regex-safe)
 *
 * The `lookAt: 'whole'` option wraps the pattern in ^ … $, forcing an exact
 * full-cell match.  Without it the pattern is an unanchored substring search.
 *
 * @param pattern   Excel wildcard string
 * @param options   matchCase / lookAt from SearchOptions
 */
export function wildcardToRegex(
  pattern: string,
  options: { matchCase?: boolean; lookAt?: 'part' | 'whole' }
): RegExp {
  let result = '';
  let i = 0;

  while (i < pattern.length) {
    const ch = pattern[i];

    if (ch === '~' && i + 1 < pattern.length) {
      // Tilde-escape: treat next char as a literal regardless of what it is.
      result += escapeRegexLiteral(pattern[i + 1]);
      i += 2;
    } else if (ch === '*') {
      result += '.*';
      i++;
    } else if (ch === '?') {
      result += '.';
      i++;
    } else {
      result += escapeRegexLiteral(ch);
      i++;
    }
  }

  // Whole match: anchor the pattern to the full string.
  if (options.lookAt === 'whole') {
    result = `^${result}$`;
  }

  const flags = options.matchCase ? '' : 'i';
  return new RegExp(result, flags);
}

// ---------------------------------------------------------------------------
// 3. High-level matcher factory
// ---------------------------------------------------------------------------

/**
 * Build a reusable predicate for the given search options.
 *
 * Returns a function `(text: string) => boolean`.
 *
 * Rules:
 *  - Empty `what` → always returns false (Excel: empty pattern matches nothing).
 *  - All patterns go through `wildcardToRegex` so that tilde-escapes and
 *    special-char leakage are handled uniformly.
 */
export function buildMatcher(options: SearchOptions): (text: string) => boolean {
  const { what, lookAt = 'part', matchCase = false } = options;

  if (what === '') return () => false;

  const regex = wildcardToRegex(what, { matchCase, lookAt });
  return (text: string): boolean => regex.test(text);
}

// ---------------------------------------------------------------------------
// 4. Cell value serialisation
// ---------------------------------------------------------------------------

/**
 * Convert a cell value to the string that Excel would display (and search).
 *
 * Rules that mirror Excel behaviour:
 *  - null / undefined → return null   (cell is empty, skip in search)
 *  - boolean true     → "TRUE"
 *  - boolean false    → "FALSE"
 *  - number           → String(n)     (no locale formatting in Phase 1)
 *  - string           → as-is
 *  - RichTextValue    → concatenation of all run texts
 *  - anything else    → String(v)
 *
 * Returns null when the cell should be skipped entirely (empty cell).
 */
export function cellValueToString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;

  // RichTextValue: { runs: Array<{ text: string; ... }> }
  if (
    typeof value === 'object' &&
    value !== null &&
    'runs' in (value as Record<string, unknown>)
  ) {
    return ((value as { runs: Array<{ text: string }> }).runs)
      .map(r => r.text)
      .join('');
  }

  return String(value);
}

// ---------------------------------------------------------------------------
// 5. Address ordering utilities
// ---------------------------------------------------------------------------

/**
 * Row-major ascending comparator for Array.sort().
 * Scans left-to-right within each row, then top-to-bottom.
 */
export function compareRowMajor(
  a: { row: number; col: number },
  b: { row: number; col: number }
): number {
  if (a.row !== b.row) return a.row - b.row;
  return a.col - b.col;
}

/**
 * Column-major ascending comparator for Array.sort().
 * Scans top-to-bottom within each column, then left-to-right.
 */
/**
 * Test whether a cell's style satisfies every field specified in `searchFormat`.
 *
 * Rules:
 *  - Only keys present in `searchFormat` are checked; missing keys pass.
 *  - Primitives (string, number, boolean) use strict equality.
 *  - Plain objects (fill, border, etc.) use shallow key equality.
 *  - If `cellStyle` is undefined the cell has no style; any non-undefined field
 *    in `searchFormat` will fail to match.
 *
 * @param cellStyle    The cell's current style (may be undefined).
 * @param searchFormat The format criteria to match against.
 */
export function styleMatchesFormat(
  cellStyle: Partial<CellStyle> | undefined,
  searchFormat: Partial<CellStyle>,
): boolean {
  for (const rawKey of Object.keys(searchFormat)) {
    const key = rawKey as keyof CellStyle;
    const searchVal = searchFormat[key];
    if (searchVal === undefined) continue; // unspecified key — always passes

    const cellVal = cellStyle?.[key];
    if (typeof searchVal === 'object' && searchVal !== null) {
      // Shallow object comparison for composite style fields.
      if (typeof cellVal !== 'object' || cellVal === null) return false;
      for (const k of Object.keys(searchVal)) {
        if ((searchVal as Record<string, unknown>)[k] !== (cellVal as Record<string, unknown>)[k]) return false;
      }
    } else {
      if (cellVal !== searchVal) return false;
    }
  }
  return true;
}

export function compareColMajor(
  a: { row: number; col: number },
  b: { row: number; col: number }
): number {
  if (a.col !== b.col) return a.col - b.col;
  return a.row - b.row;
}

/**
 * Returns true when `a` comes strictly BEFORE `b` in row-major order.
 * Used by find() to locate the "after" boundary.
 */
export function isStrictlyBeforeRowMajor(
  a: { row: number; col: number },
  b: { row: number; col: number }
): boolean {
  return a.row < b.row || (a.row === b.row && a.col < b.col);
}

/**
 * Returns true when `a` comes strictly AFTER `b` in row-major order.
 */
export function isStrictlyAfterRowMajor(
  a: { row: number; col: number },
  b: { row: number; col: number }
): boolean {
  return a.row > b.row || (a.row === b.row && a.col > b.col);
}
