/**
 * qualified-reference-scanner.ts  (CS-002D.2 — experimental)
 *
 * A positional scanner for sheet-qualified A1 references such as
 * `Sheet1!A1`, `'Other Sheet'!B2:C3`, or `'O''Brien'!$A$1`.
 *
 * This is the "qualified-reference scanner" required by the approved
 * CS-002D.2 design gate. It is deliberately scoped to the vertical prototype:
 *
 *   - It returns byte spans so the owning coordinator can substitute each
 *     qualified token with a temporary binding without disturbing the rest of
 *     the formula text (local references, operators, string literals).
 *   - It never participates in the production FormulaEngine expression parser
 *     or the local Worksheet dependency cache. It is a read-only analysis pass.
 *
 * Out of scope for the prototype (documented as later work in the design):
 * whole-column/row qualified ranges, 3D references (`Sheet1:Sheet3!A1`),
 * external-workbook references, named ranges, and structured references.
 */

/** One-based worksheet coordinate (matches the public Worksheet contract). */
export interface ScannedCell {
  row: number;
  col: number;
}

/** One-based inclusive rectangle. */
export interface ScannedRange {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export interface QualifiedToken {
  /** Inclusive start offset in the scanned formula string. */
  start: number;
  /** Exclusive end offset in the scanned formula string. */
  end: number;
  /** Decoded sheet display name (surrounding quotes removed, `''` → `'`). */
  sheet: string;
  /** The exact matched source text (including the sheet qualifier). */
  raw: string;
  /**
   * The reference suffix exactly as written, starting at the delimiter: e.g.
   * `!A1` or `!$A$1:$B$2`. Derived from the PARSED span (the A1 capture groups),
   * never from a textual `indexOf('!')` — a quoted sheet name may itself contain
   * `!` (e.g. `'Ops!2026'!A1`), so the first exclamation mark is not reliable.
   */
  refTail: string;
  /**
   * True when both coordinates lie within Excel worksheet bounds. A token whose
   * syntax is well-formed but whose coordinate is out of range (e.g. `Sheet!A0`,
   * `Sheet!A1048577`) is still returned — with `inBounds: false` — so the owning
   * coordinator can resolve it to a deterministic `#REF!` instead of leaving the
   * text for the production parser to classify differently. An out-of-bounds
   * token must never create a valid graph binding.
   */
  inBounds: boolean;
  kind: "cell" | "range";
  cell?: ScannedCell;
  range?: ScannedRange;
}

const A1_PART = "\\$?[A-Za-z]{1,3}\\$?\\d{1,7}";
const MAX_ROW = 1_048_576;
const MAX_COL = 16_384;

// Sheet qualifier (quoted with '' escapes, or a bare name) immediately
// followed by `!` and an A1 cell or inclusive range.
const QUALIFIED_RE = new RegExp(
  `(?:'((?:[^']|'')+)'|([A-Za-z_][A-Za-z0-9_.]*))!(${A1_PART})(?::(${A1_PART}))?`,
  "g",
);

/** Compute [start,end) spans of double-quoted string literals (with "" escapes). */
function doubleQuotedRegions(formula: string): Array<[number, number]> {
  const regions: Array<[number, number]> = [];
  let i = 0;
  const n = formula.length;
  while (i < n) {
    if (formula[i] === '"') {
      const start = i;
      i++;
      while (i < n) {
        if (formula[i] === '"') {
          if (i + 1 < n && formula[i + 1] === '"') {
            i += 2; // escaped quote pair
            continue;
          }
          i++;
          break;
        }
        i++;
      }
      regions.push([start, i]);
    } else {
      i++;
    }
  }
  return regions;
}

function insideAny(regions: Array<[number, number]>, index: number): boolean {
  for (const [start, end] of regions) {
    if (index >= start && index < end) return true;
  }
  return false;
}

/** Parse a single A1 cell token (e.g. `$B$12`) into a one-based coordinate. */
export function parseA1Cell(token: string): ScannedCell | null {
  const match = /^\$?([A-Za-z]{1,3})\$?(\d{1,7})$/.exec(token);
  if (!match) return null;
  const letters = match[1].toUpperCase();
  let col = 0;
  for (let i = 0; i < letters.length; i++) {
    col = col * 26 + (letters.charCodeAt(i) - 64); // 'A' → 1
  }
  const row = parseInt(match[2], 10);
  if (row < 1 || col < 1) return null;
  return { row, col };
}

/**
 * Parse a syntactically valid A1 token WITHOUT enforcing worksheet bounds, so
 * that out-of-range-but-well-formed coordinates (row 0, row > 1048576) are
 * still decoded. Returns null only when the token is not a valid A1 shape.
 * Bounds enforcement happens in the scanner (`inBounds`) and downstream.
 */
function parseA1CellLoose(token: string): ScannedCell | null {
  const match = /^\$?([A-Za-z]{1,3})\$?(\d{1,7})$/.exec(token);
  if (!match) return null;
  const letters = match[1].toUpperCase();
  let col = 0;
  for (let i = 0; i < letters.length; i++) {
    col = col * 26 + (letters.charCodeAt(i) - 64); // 'A' → 1
  }
  const row = parseInt(match[2], 10);
  return { row, col };
}

function cellInBounds(cell: ScannedCell): boolean {
  return (
    cell.row >= 1 && cell.row <= MAX_ROW && cell.col >= 1 && cell.col <= MAX_COL
  );
}

function decodeSheetName(
  quoted: string | undefined,
  bare: string | undefined,
): string {
  if (quoted !== undefined) return quoted.replace(/''/g, "'");
  return bare ?? "";
}

/**
 * Scan all sheet-qualified A1 references in a formula, outside string literals.
 *
 * Tokens are returned in ascending `start` order. Malformed coordinates (which
 * cannot occur given the regex) are skipped defensively.
 */
export function scanQualifiedReferences(formula: string): QualifiedToken[] {
  const regions = doubleQuotedRegions(formula);
  const tokens: QualifiedToken[] = [];

  QUALIFIED_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = QUALIFIED_RE.exec(formula)) !== null) {
    const start = match.index;
    if (insideAny(regions, start)) continue;

    // Leading boundary: the qualifier must not continue an identifier,
    // number, or an adjacent reference token.
    const prev = start > 0 ? formula[start - 1] : "";
    if (prev && /[A-Za-z0-9_.$!']/.test(prev)) continue;

    const sheet = decodeSheetName(match[1], match[2]);
    const startCell = parseA1CellLoose(match[3]);
    if (!startCell) continue;

    const raw = match[0];
    const end = start + raw.length;

    // Trailing boundary: the matched A1 part must be a COMPLETE token. If the
    // next character could continue a cell address (letter/digit/$), extend a
    // range (`:`), chain another qualifier (`!`), or start another quoted name
    // (`'`), the surrounding text is a longer malformed reference and a valid
    // prefix must not be partially accepted (it would otherwise be substituted
    // as an executable literal, corrupting the formula).
    const nextCh = end < formula.length ? formula[end] : "";
    if (nextCh && /[A-Za-z0-9_$.:!']/.test(nextCh)) continue;

    // Reference suffix from the PARSED groups (not a textual indexOf), so a
    // quoted sheet name containing `!` cannot corrupt the derived tail.
    const refTail = match[4] ? `!${match[3]}:${match[4]}` : `!${match[3]}`;

    if (match[4]) {
      const endCell = parseA1CellLoose(match[4]);
      if (!endCell) continue;
      const range = {
        startRow: Math.min(startCell.row, endCell.row),
        startCol: Math.min(startCell.col, endCell.col),
        endRow: Math.max(startCell.row, endCell.row),
        endCol: Math.max(startCell.col, endCell.col),
      };
      tokens.push({
        start,
        end,
        sheet,
        raw,
        refTail,
        inBounds: cellInBounds(startCell) && cellInBounds(endCell),
        kind: "range",
        range,
      });
    } else {
      tokens.push({
        start,
        end,
        sheet,
        raw,
        refTail,
        inBounds: cellInBounds(startCell),
        kind: "cell",
        cell: startCell,
      });
    }
  }

  return tokens;
}

/** True when the formula contains at least one sheet-qualified reference. */
export function hasQualifiedReference(formula: string): boolean {
  return scanQualifiedReferences(formula).length > 0;
}
