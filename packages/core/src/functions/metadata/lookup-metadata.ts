/**
 * lookup-metadata.ts
 * 
 * WAVE 0 DAY 2: Strict Metadata for Lookup & Reference Functions (12 functions)
 * Created: 2024
 * 
 * CATEGORY SUMMARY:
 * - Total functions: 12
 * - Volatile: 0
 * - Iterative: 0
 * - Special (needsContext): 2 (ROW, COLUMN)
 * - Complexity: O(1): 5, O(n): 5, O(log n): 2
 * - ErrorStrategy: LOOKUP_STRICT (7), PROPAGATE_FIRST (5)
 * 
 * KEY INSIGHTS:
 * 1. VLOOKUP/HLOOKUP/LOOKUP: O(n) linear search (unsorted), O(log n) binary search (sorted)
 * 2. MATCH/XMATCH: O(log n) binary search (sorted mode 1/-1), O(n) exact/wildcard
 * 3. INDEX: O(1) direct array access
 * 4. CHOOSE: O(1) direct argument selection
 * 5. OFFSET: O(1) offset calculation (reference, not evaluation)
 * 6. INDIRECT: O(1) reference parsing (volatile in Excel, non-volatile here)
 * 7. ROW/COLUMN: O(1) context-aware position query
 * 
 * LOOKUP_STRICT ERROR STRATEGY:
 * - #N/A has special semantic meaning (value not found)
 * - Should NOT be coerced to 0 or skipped like #DIV/0!
 * - Used by: VLOOKUP, HLOOKUP, XLOOKUP, LOOKUP, MATCH, XMATCH, INDEX
 * - Rational: #N/A = "data not present" vs #VALUE! = "wrong type"
 * 
 * CONSERVATIVE CLASSIFICATIONS:
 * - VLOOKUP/HLOOKUP: O(n) (worst-case linear search, binary only if sorted + approximate)
 * - MATCH exact mode: O(n) (no sort guarantee, must scan all)
 * - XLOOKUP binary search mode: O(log n) (explicit algorithm)
 * - OFFSET: O(1) (creates reference, doesn't evaluate cells)
 * - INDIRECT: O(1) (parses reference string, doesn't evaluate)
 */

import { 
  FunctionCategory,
  ComplexityClass,
  PrecisionClass,
  ErrorStrategy,
  type StrictFunctionMetadata 
} from '../../types/formula-types';
import * as LookupFunctions from '../lookup/lookup-functions';

const { O_1, O_N } = ComplexityClass;
const { EXACT } = PrecisionClass;
const { LOOKUP_STRICT, PROPAGATE_FIRST } = ErrorStrategy;

/**
 * VLOOKUP - Vertical Lookup
 * Searches first column of table, returns value from specified column
 * 
 * Complexity: O(n) worst-case (linear search)
 * - rangeLookup=FALSE: Must scan all rows for exact match
 * - rangeLookup=TRUE (sorted): Binary search possible, but impl does linear
 * - Conservative classification: O(n) since sorted optimization not guaranteed
 * 
 * ErrorStrategy: LOOKUP_STRICT
 * - Returns #N/A if value not found (semantic meaning)
 * - #N/A should NOT be coerced to 0 or skipped
 * 
 * Precision: EXACT (string/numeric comparison, exact matching)
 */
export const VLOOKUP: StrictFunctionMetadata = {
  name: 'VLOOKUP',
  handler: LookupFunctions.VLOOKUP,
  category: FunctionCategory.LOOKUP,
  minArgs: 3,
  maxArgs: 4,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: EXACT,
  errorStrategy: LOOKUP_STRICT,
  iterationPolicy: null,
};

/**
 * HLOOKUP - Horizontal Lookup
 * Searches first row of table, returns value from specified row
 * 
 * Complexity: O(n) (linear search across first row)
 * ErrorStrategy: LOOKUP_STRICT (#N/A = value not found)
 * Precision: EXACT (exact comparison)
 */
export const HLOOKUP: StrictFunctionMetadata = {
  name: 'HLOOKUP',
  handler: LookupFunctions.HLOOKUP,
  category: FunctionCategory.LOOKUP,
  minArgs: 3,
  maxArgs: 4,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: EXACT,
  errorStrategy: LOOKUP_STRICT,
  iterationPolicy: null,
};

/**
 * XLOOKUP - Modern Lookup (Excel 2021+)
 * Advanced lookup with binary search mode, wildcards, multiple match modes
 * 
 * Complexity: O(log n) (binary search mode -2/+2) or O(n) (linear modes)
 * - match_mode = -2/+2: Binary search (REQUIRES sorted data)
 * - match_mode = 0/1/-1: Linear search
 * - Conservative: O(n) average case, O(log n) best case (binary)
 * 
 * Classification: O(n) (worst-case, matches Excel semantics)
 * 
 * ErrorStrategy: LOOKUP_STRICT (#N/A if not found, unless if_not_found provided)
 */
export const XLOOKUP: StrictFunctionMetadata = {
  name: 'XLOOKUP',
  handler: LookupFunctions.XLOOKUP,
  category: FunctionCategory.LOOKUP,
  minArgs: 3,
  maxArgs: 6,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N, // Conservative (binary mode is O(log n) but requires sorted data)
  precisionClass: EXACT,
  errorStrategy: LOOKUP_STRICT,
  iterationPolicy: null,
};

/**
 * LOOKUP - Legacy Lookup Function
 * Two-argument form (vector) or three-argument form (array)
 * 
 * Complexity: O(n) (linear search through lookup vector)
 * ErrorStrategy: LOOKUP_STRICT
 */
export const LOOKUP: StrictFunctionMetadata = {
  name: 'LOOKUP',
  handler: LookupFunctions.LOOKUP,
  category: FunctionCategory.LOOKUP,
  minArgs: 2,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N,
  precisionClass: EXACT,
  errorStrategy: LOOKUP_STRICT,
  iterationPolicy: null,
};

/**
 * INDEX - Returns Value at Specified Position
 * Direct array access by row/column index
 * 
 * Complexity: O(1) (direct array indexing)
 * ErrorStrategy: LOOKUP_STRICT (returns #REF! for out-of-bounds)
 * Precision: EXACT (no comparison/arithmetic, just indexing)
 */
export const INDEX: StrictFunctionMetadata = {
  name: 'INDEX',
  handler: LookupFunctions.INDEX,
  category: FunctionCategory.LOOKUP,
  minArgs: 2,
  maxArgs: 4,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: EXACT,
  errorStrategy: LOOKUP_STRICT,
  iterationPolicy: null,
};

/**
 * MATCH - Find Position of Value in Range
 * Returns row/column number (1-based index)
 * 
 * Complexity: O(n) exact match (scan all), O(log n) sorted match
 * - match_type = 0: Exact match, O(n) (no sort guarantee)
 * - match_type = 1/-1: Approximate match (REQUIRES sorted), O(log n) (binary search)
 * 
 * Conservative: O(n) (exact match most common, no sort guarantee)
 * 
 * ErrorStrategy: LOOKUP_STRICT (returns #N/A if not found)
 */
export const MATCH: StrictFunctionMetadata = {
  name: 'MATCH',
  handler: LookupFunctions.MATCH,
  category: FunctionCategory.LOOKUP,
  minArgs: 2,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N, // Conservative (exact match is O(n), sorted match is O(log n))
  precisionClass: EXACT,
  errorStrategy: LOOKUP_STRICT,
  iterationPolicy: null,
};

/**
 * XMATCH - Modern MATCH (Excel 2021+)
 * Advanced matching with binary search mode, wildcards
 * 
 * Complexity: O(log n) binary search mode, O(n) linear
 * - match_mode = 2/-2: Binary search (REQUIRES sorted)
 * - match_mode = 0/1/-1: Linear search
 * 
 * Conservative: O(n) (linear mode most common)
 * 
 * ErrorStrategy: LOOKUP_STRICT
 */
export const XMATCH: StrictFunctionMetadata = {
  name: 'XMATCH',
  handler: LookupFunctions.XMATCH,
  category: FunctionCategory.LOOKUP,
  minArgs: 2,
  maxArgs: 4,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N, // Conservative (binary mode is O(log n) but requires sorted)
  precisionClass: EXACT,
  errorStrategy: LOOKUP_STRICT,
  iterationPolicy: null,
};

/**
 * CHOOSE - Select Value by Index
 * Returns nth argument based on index_num
 * 
 * Complexity: O(1) (direct argument access)
 * ErrorStrategy: PROPAGATE_FIRST (standard error propagation)
 * Precision: EXACT (no arithmetic)
 */
export const CHOOSE: StrictFunctionMetadata = {
  name: 'CHOOSE',
  handler: LookupFunctions.CHOOSE,
  category: FunctionCategory.LOOKUP,
  minArgs: 2,
  maxArgs: 255, // Theoretical limit (index + 254 values)
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: EXACT,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

/**
 * OFFSET - Returns Reference Offset from Starting Point
 * Creates new reference by offsetting rows/columns
 * 
 * Complexity: O(1) (offset calculation, doesn't evaluate cells)
 * - Calculates new reference position (row/col math)
 * - Does NOT evaluate referenced cells (that's engine's job)
 * 
 * ErrorStrategy: PROPAGATE_FIRST
 * Precision: EXACT (integer offset arithmetic)
 */
export const OFFSET: StrictFunctionMetadata = {
  name: 'OFFSET',
  handler: LookupFunctions.OFFSET,
  category: FunctionCategory.LOOKUP,
  minArgs: 3,
  maxArgs: 5,
  isSpecial: false,
  needsContext: false,
  volatile: false, // Creates reference, but reference itself is stable
  complexityClass: O_1,
  precisionClass: EXACT,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

/**
 * INDIRECT - Convert String to Reference
 * Parses text string as cell/range reference
 * 
 * Complexity: O(1) (string parsing, doesn't evaluate cells)
 * Volatile: FALSE (non-volatile in this implementation)
 * - Excel marks INDIRECT as volatile
 * - Our implementation: non-volatile (reference parsing is deterministic)
 * 
 * ErrorStrategy: PROPAGATE_FIRST (returns #REF! for invalid references)
 */
export const INDIRECT: StrictFunctionMetadata = {
  name: 'INDIRECT',
  handler: LookupFunctions.INDIRECT,
  category: FunctionCategory.LOOKUP,
  minArgs: 1,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false, // Non-volatile in our implementation (deterministic parsing)
  complexityClass: O_1,
  precisionClass: EXACT,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

/**
 * ROW - Returns Row Number
 * Context-aware: ROW() = current row, ROW(ref) = ref's row
 * 
 * Complexity: O(1) (position query)
 * needsContext: TRUE (requires execution context for ROW() zero-arg form)
 * ErrorStrategy: PROPAGATE_FIRST
 */
export const ROW: StrictFunctionMetadata = {
  name: 'ROW',
  handler: LookupFunctions.ROW,
  category: FunctionCategory.LOOKUP,
  minArgs: 0,
  maxArgs: 1,
  isSpecial: false,
  needsContext: true, // ROW() needs execution context
  volatile: false,
  complexityClass: O_1,
  precisionClass: EXACT,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

/**
 * COLUMN - Returns Column Number
 * Context-aware: COLUMN() = current column, COLUMN(ref) = ref's column
 * 
 * Complexity: O(1) (position query)
 * needsContext: TRUE (requires execution context for COLUMN() zero-arg form)
 * ErrorStrategy: PROPAGATE_FIRST
 */
export const COLUMN: StrictFunctionMetadata = {
  name: 'COLUMN',
  handler: LookupFunctions.COLUMN,
  category: FunctionCategory.LOOKUP,
  minArgs: 0,
  maxArgs: 1,
  isSpecial: false,
  needsContext: true, // COLUMN() needs execution context
  volatile: false,
  complexityClass: O_1,
  precisionClass: EXACT,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

/**
 * MASTER EXPORT: Lookup Category (12 functions)
 */
export const LOOKUP_METADATA: StrictFunctionMetadata[] = [
  VLOOKUP,
  HLOOKUP,
  XLOOKUP,
  LOOKUP,
  INDEX,
  MATCH,
  XMATCH,
  CHOOSE,
  OFFSET,
  INDIRECT,
  ROW,
  COLUMN,
];

/**
 * CATEGORY STATISTICS:
 * - Total functions: 12
 * - Complexity breakdown:
 *   * O(1): 5 (INDEX, CHOOSE, OFFSET, INDIRECT, ROW, COLUMN)
 *   * O(n): 5 (VLOOKUP, HLOOKUP, XLOOKUP, LOOKUP, MATCH, XMATCH)
 *   * O(log n): 0 (binary search modes available but not default)
 * - ErrorStrategy:
 *   * LOOKUP_STRICT: 7 (VLOOKUP, HLOOKUP, XLOOKUP, LOOKUP, INDEX, MATCH, XMATCH)
 *   * PROPAGATE_FIRST: 5 (CHOOSE, OFFSET, INDIRECT, ROW, COLUMN)
 * - Special functions: 2 (ROW, COLUMN need execution context)
 * - Volatile: 0 (INDIRECT non-volatile in our implementation)
 */
