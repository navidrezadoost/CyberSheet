/**
 * CellStore.ts — Data-Oriented Cell Storage Proposal
 *
 * STATUS: ⚠️ PROPOSAL — Not yet integrated into Worksheet.
 *
 * =============================================================================
 * MOTIVATION (from Structural Hardening Sprint, Feb 2026)
 * =============================================================================
 *
 * Benchmark results @ 200k cells:
 *   - String values:  ~499 bytes/cell (50k density measurement, most reliable)
 *   - Numeric values: ~379 bytes/cell
 *   - Projection @ 1M cells: ~400–500 MB  → ⚠️ Near 512 MB target
 *   - String key lookup: 1.31× slower than numeric key lookup
 *   - Multiple hidden classes due to optional Cell fields
 *
 * Root causes:
 *   1. String keys ("row:col") allocate a new V8 heap string per operation
 *   2. Optional properties (formula?, style?, comments?) create multiple
 *      V8 hidden classes, preventing monomorphic inline cache (PIC) optimisation
 *   3. Cell objects mix hot fields (value, formula) with cold fields
 *      (style, comments, icon) — poor cache locality
 *   4. All cell values stored as JS heap objects even for numerics
 *
 * =============================================================================
 * DESIGN DECISIONS
 * =============================================================================
 *
 * 1. PACKED INTEGER KEYS
 *    Row × COL_MULT + Col   (COL_MULT = 20_000)
 *    - Stored as JS number (V8 HeapNumber for large values, but Map handles it)
 *    - Excel max address: 1,048,576 rows × 16,384 cols
 *      → max key = 1,048,576 × 20,000 + 16,384 = 20,971,536,384
 *      → Number.isSafeInteger(20_971_536_384) = true ✓
 *    - Eliminates one string allocation + GC per cell operation
 *
 * 2. STRUCT-OF-ARRAYS VALUE STORAGE
 *    Instead of: Cell = { value, formula, style, comments }       (array-of-structs)
 *    We use:     values: Map<key, Value>                           (each field separate)
 *                numValues: Float64Array (for cells with number values)
 *                strValues: Map<key, string>
 *                formulas:  Map<key, string>  (~5% of cells)
 *                styleIdx:  Uint16Array        (index into StyleRegistry)
 *
 *    Benefits:
 *      - Numeric values: Float64Array → 8 bytes/slot, contiguous, no GC
 *      - String values:  only allocated where needed (~30% of cells typically)
 *      - Style:          16-bit index, no object pointer per cell
 *      - Formula:        separate map, no overhead on formula-free cells
 *
 * 3. MONO-SHAPE CELL RECORD (transition step for current Worksheet)
 *    If full struct-of-arrays is deferred, at minimum:
 *    - ensureCell() should initialise ALL optional fields to explicit null
 *    - Guarantees single V8 hidden class for all Cell objects
 *    - ~2× improvement in Map.get() access patterns
 *
 * 4. NUMERIC BACKING ARRAY
 *    numericSlots: Float64Array(rowCount × colCount)
 *    numericTypes: Uint8Array(rowCount × colCount)   // 0=empty, 1=int, 2=float, 3=bool
 *    - O(1) direct addressing: slot = (row-1) * colCount + (col-1)
 *    - No hashing, no pointer chasing for numeric reads
 *    - Pro: >10× faster for numeric-dense sheets (financial models)
 *    - Con: 8 bytes × rowCount × colCount pre-allocated regardless of fill
 *      → 1M × 16k = 128 GB for a full Excel sheet — not viable
 *    → Decision: Use TypedArray only for "used range" once known, not globally
 *    → Alternative: column-stripe arrays (one Float64Array per column, allocated lazily)
 *
 * =============================================================================
 * MIGRATION PATH
 * =============================================================================
 *
 * Phase 1 (immediate, low risk):
 *   - Apply ensureCell() mono-shape fix (DONE ✓)
 *   - No API changes
 *
 * Phase 2 (medium effort, transparent to consumers):
 *   - Replace Map<string, Cell> with Map<number, CellRecord>
 *   - CellRecord has same shape as current Cell but key changes
 *   - All key() calls replaced with packKey()
 *   - Estimated effort: 1 day
 *   - Estimated memory saving: ~44 MB per 1M cells
 *
 * Phase 3 (high value, requires API decisions):
 *   - Separate formula store
 *   - Numeric backing (column-stripe TypedArrays)
 *   - Style index (replace CellStyle ref with Uint16 index)
 *   - Estimated effort: 3-5 days
 *   - Estimated memory saving: 40-60% for numeric-dense sheets
 *
 * =============================================================================
 * CONCRETE IMPLEMENTATION (Phase 2)
 * =============================================================================
 */

import type { Address, Cell, CellValue, ExtendedCellValue, CellStyle, CellComment, CellIcon } from '../types';

// ---------------------------------------------------------------------------
// 1. Address packing
// ---------------------------------------------------------------------------

/**
 * Column multiplier for packed key encoding.
 *
 * Chosen so that for rows 0–1,048,576 and cols 0–16,384:
 *   max packed key = 1,048,576 × 20,000 + 16,384 = 20,971,536,384
 *   Number.isSafeInteger(20_971_536_384) === true ✓
 */
export const COL_MULT = 20_000;

/**
 * Pack a 1-based (row, col) address into a single safe integer.
 * O(1), no heap allocation.
 */
export function packKey(row: number, col: number): number {
  return row * COL_MULT + col;
}

/**
 * Unpack a packed key back to { row, col }.
 * Used only for iteration / debugging.
 */
export function unpackKey(key: number): Address {
  const col = key % COL_MULT;
  const row = (key - col) / COL_MULT;
  return { row, col };
}

// ---------------------------------------------------------------------------
// 2. Mono-shape CellRecord
//
//    All optional fields explicitly present and initialised to null.
//    This ensures V8 keeps a single hidden class for ALL CellRecord objects,
//    enabling monomorphic inline caching (PIC) in Map.get() / property access.
//
//    Measured IC type transitions when optional fields are absent:
//      megamorphic → 3–5× slower property read
//    Mono-shape avoids this entirely.
// ---------------------------------------------------------------------------

export interface CellRecord {
  value: ExtendedCellValue;
  formula: string | null;          // null = no formula (not undefined)
  style: CellStyle | null;         // null = no style
  comments: CellComment[] | null;  // null = no comments
  icon: CellIcon | null;           // null = no icon
}

/**
 * Create a new empty CellRecord with all fields explicitly initialised.
 * ONLY allocation point for CellRecord objects — enforces mono-shape invariant.
 */
export function createCellRecord(): CellRecord {
  return {
    value: null,
    formula: null,
    style: null,
    comments: null,
    icon: null,
  };
}

// ---------------------------------------------------------------------------
// 3. ICellStore — storage interface
//
//    Defines the contract that Worksheet consumes.
//    Current Worksheet implementation satisfies this interface implicitly.
//    CellStoreFast (Phase 2/3) will satisfy it explicitly with better internals.
// ---------------------------------------------------------------------------

export interface ICellStore {
  /** Get cell record (read-only, undefined if not set) */
  get(row: number, col: number): CellRecord | undefined;

  /** Get-or-create cell record (ensures mono-shape) */
  getOrCreate(row: number, col: number): CellRecord;

  /** Delete a cell (e.g., clear contents) */
  delete(row: number, col: number): void;

  /** Test if a cell exists */
  has(row: number, col: number): boolean;

  /** Number of populated cells */
  readonly size: number;

  /**
   * Iterate over all populated cells.
   * Yields [packedKey, CellRecord] pairs for efficiency.
   */
  entries(): IterableIterator<[number, CellRecord]>;
}

// ---------------------------------------------------------------------------
// 4. CellStoreV1 — Phase 2 implementation
//    Drop-in replacement for Map<string, Cell> using packed integer keys
//    and CellRecord (mono-shape).
// ---------------------------------------------------------------------------

export class CellStoreV1 implements ICellStore {
  private readonly _map = new Map<number, CellRecord>();

  get(row: number, col: number): CellRecord | undefined {
    return this._map.get(packKey(row, col));
  }

  getOrCreate(row: number, col: number): CellRecord {
    const k = packKey(row, col);
    let c = this._map.get(k);
    if (!c) {
      c = createCellRecord();
      this._map.set(k, c);
    }
    return c;
  }

  delete(row: number, col: number): void {
    this._map.delete(packKey(row, col));
  }

  has(row: number, col: number): boolean {
    return this._map.has(packKey(row, col));
  }

  get size(): number {
    return this._map.size;
  }

  entries(): IterableIterator<[number, CellRecord]> {
    return this._map.entries();
  }
}

// ---------------------------------------------------------------------------
// 5. CellStoreV2 — Phase 3 proposal  (struct-of-arrays)
//
//    Separates hot path (numeric value read/write) from cold path
//    (formula, style, comments) for cache-friendly access.
//
//    Memory model at 1M cells (all numeric, no style/formula):
//      Float64Array:   8 bytes × 1M = 8 MB         (values)
//      typeArray:      1 byte  × 1M = 1 MB          (cell type tag)
//      Map<number,…>:  sparse, only formula/style/comment cells
//      Total:          ~9 MB vs ~400 MB current     → 40× improvement
//
//    Constraint: requires knowing row/col bounds upfront.
//    Solution:   column-stripe allocation (one Float64Array per column).
// ---------------------------------------------------------------------------

/**
 * Tag byte stored per cell in the type map.
 * Packed into a Uint8Array for cache efficiency.
 */
export const enum CellType {
  Empty   = 0,
  Number  = 1,
  String  = 2,
  Boolean = 3,
  Null    = 4,   // explicit null (distinguishable from Empty)
  Formula = 5,   // has formula; display value in numValues or strValues
  Rich    = 6,   // RichTextValue
  Entity  = 7,   // EntityValue
}

/**
 * Column stripe: one per column, allocated lazily.
 * Stores numeric values for all rows in that column.
 */
interface ColumnStripe {
  /** Float64 values (NaN = not a number / absent) */
  numValues: Float64Array;
  /** Type tags per row */
  types: Uint8Array;
  /** Row count this stripe was allocated for */
  rowCount: number;
}

export class CellStoreV2 implements ICellStore {
  private readonly numStripes = new Map<number, ColumnStripe>();  // col → stripe
  private readonly strValues  = new Map<number, string>();        // packKey → string
  private readonly formulas   = new Map<number, string>();        // packKey → formula
  private readonly coldData   = new Map<number, {                 // packKey → cold
    style?: CellStyle;
    comments?: CellComment[];
    icon?: CellIcon;
  }>();
  private _size = 0;
  private readonly rowCount: number;

  constructor(rowCount: number) {
    this.rowCount = rowCount;
  }

  // ── Internal stripe access ────────────────────────────────────────────────

  private getStripe(col: number): ColumnStripe {
    let s = this.numStripes.get(col);
    if (!s) {
      s = {
        numValues: new Float64Array(this.rowCount).fill(NaN),
        types: new Uint8Array(this.rowCount),
        rowCount: this.rowCount,
      };
      this.numStripes.set(col, s);
    }
    return s;
  }

  // ── ICellStore implementation ─────────────────────────────────────────────

  has(row: number, col: number): boolean {
    const s = this.numStripes.get(col);
    if (!s) return false;
    return s.types[row - 1] !== CellType.Empty;
  }

  get(row: number, col: number): CellRecord | undefined {
    if (!this.has(row, col)) return undefined;
    return this._materialize(row, col);
  }

  getOrCreate(row: number, col: number): CellRecord {
    return this._materialize(row, col);
  }

  delete(row: number, col: number): void {
    const s = this.numStripes.get(col);
    if (s) {
      const wasEmpty = s.types[row - 1] === CellType.Empty;
      s.types[row - 1] = CellType.Empty;
      s.numValues[row - 1] = NaN;
      if (!wasEmpty) this._size--;
    }
    const k = packKey(row, col);
    this.strValues.delete(k);
    this.formulas.delete(k);
    this.coldData.delete(k);
  }

  get size(): number {
    return this._size;
  }

  *entries(): IterableIterator<[number, CellRecord]> {
    for (const [col, stripe] of this.numStripes) {
      for (let r = 0; r < stripe.rowCount; r++) {
        if (stripe.types[r] !== CellType.Empty) {
          const row = r + 1;
          yield [packKey(row, col), this._materialize(row, col)];
        }
      }
    }
  }

  // ── Value write (hot path) ─────────────────────────────────────────────────

  setValue(row: number, col: number, value: CellValue): void {
    const s = this.getStripe(col);
    const idx = row - 1;
    const wasEmpty = s.types[idx] === CellType.Empty;

    if (value === null) {
      s.types[idx] = CellType.Null;
      s.numValues[idx] = NaN;
    } else if (typeof value === 'number') {
      s.types[idx] = CellType.Number;
      s.numValues[idx] = value;            // hot path: no alloc
    } else if (typeof value === 'boolean') {
      s.types[idx] = CellType.Boolean;
      s.numValues[idx] = value ? 1 : 0;   // encode bool as 0/1
    } else {
      s.types[idx] = CellType.String;
      s.numValues[idx] = NaN;
      this.strValues.set(packKey(row, col), value);
    }

    if (wasEmpty) this._size++;
  }

  // ── Materialise CellRecord on demand (cold path) ──────────────────────────

  private _materialize(row: number, col: number): CellRecord {
    const s = this.getStripe(col);
    const idx = row - 1;
    const type = s.types[idx] as CellType;
    const k = packKey(row, col);
    const cold = this.coldData.get(k);

    let value: ExtendedCellValue;
    switch (type) {
      case CellType.Number:  value = s.numValues[idx]; break;
      case CellType.Boolean: value = s.numValues[idx] === 1; break;
      case CellType.String:  value = this.strValues.get(k) ?? null; break;
      case CellType.Null:    value = null; break;
      default:               value = null;
    }

    // Return a CellRecord with mono-shape (all fields present)
    return {
      value,
      formula: this.formulas.get(k) ?? null,
      style:   cold?.style ?? null,
      comments: cold?.comments ?? null,
      icon:    cold?.icon ?? null,
    };
  }
}

// ---------------------------------------------------------------------------
// 6. Memory model comparison (constants for tooling / documentation)
// ---------------------------------------------------------------------------

/**
 * Approximate memory cost per cell in bytes (based on Feb 2026 benchmark).
 * Real numbers from storage-benchmark.test.ts.
 */
export const MEMORY_MODEL = {
  /** Current Map<string, Cell> — string values, 50k measurement most reliable */
  currentStringCell: 499,
  /** Current Map<string, Cell> — numeric values, 200k measurement */
  currentNumericCell: 379,
  /** CellStoreV1 (packed int keys, mono-shape CellRecord) — estimated */
  v1StringCell: 455,    // saves ~44 bytes key string
  v1NumericCell: 335,   // saves ~44 bytes key string
  /** CellStoreV2 (struct-of-arrays, numeric hot path) — estimated */
  v2NumericCell: 18,    // 8 (Float64) + 1 (type tag) + ~9 overhead
  v2StringCell: 105,    // 18 + ~87 (string pointer + string content)

  projectionMB(cellCount: number, bytesPerCell: number): number {
    return (cellCount * bytesPerCell) / 1024 / 1024;
  },
} as const;
