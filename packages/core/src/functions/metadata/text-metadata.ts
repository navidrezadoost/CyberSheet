/**
 * text-metadata.ts
 * 
 * WAVE 0 DAY 2: Strict Metadata for Text Functions (30+ functions)
 * Created: 2024
 * 
 * CATEGORY SUMMARY:
 * - Total functions: 31
 * - Volatile: 0
 * - Iterative: 0
 * - Special: 0
 * - Complexity: O(1): 29, O(n): 2
 * - ErrorStrategy: ALL PROPAGATE_FIRST (standard error propagation)
 * 
 * KEY INSIGHTS:
 * 1. String operations are O(length), but classified as O(1) since length is bounded
 * 2. TEXTJOIN, TEXTSPLIT are O(n) due to array iteration (n = number of elements)
 * 3. All functions use EXACT precision (text operations, no floating point)
 * 4. No volatile functions (text operations are deterministic)
 * 5. No iterative solvers (no convergence algorithms)
 * 6. Byte functions (LENB, LEFTB, RIGHTB, MIDB) handle DBCS encoding
 * 
 * CONSERVATIVE CLASSIFICATIONS:
 * - String operations: O(1) (length bounded by cell content ~32KB)
 * - Array operations: O(n) (TEXTJOIN, TEXTSPLIT iterate over array elements)
 * - Case conversion: O(1) (UPPER, LOWER, PROPER - fixed string length)
 * - Search operations: O(1) (FIND, SEARCH - string length bounded)
 * 
 * NO INCONSISTENCIES FOUND:
 * - Text functions are well-defined, deterministic operations
 * - No ambiguous complexity cases
 * - No special error handling quirks
 */

import { 
  FunctionCategory,
  ComplexityClass,
  PrecisionClass,
  ErrorStrategy,
  type StrictFunctionMetadata 
} from '../../types/formula-types';
import * as TextFunctions from '../text';

const { O_1, O_N } = ComplexityClass;
const EXACT_PRECISION = PrecisionClass.EXACT;
const { PROPAGATE_FIRST } = ErrorStrategy;

/**
 * Text Functions Category: Strict Metadata
 * 
 * ALL functions:
 * - Precision: EXACT (text operations, no floating point arithmetic)
 * - ErrorStrategy: PROPAGATE_FIRST (standard error propagation)
 * - Volatile: false (deterministic text operations)
 * - Iterative: null (no convergence algorithms)
 */

// ============================================================================
// BASIC TEXT OPERATIONS (O(1))
// ============================================================================

export const CONCATENATE: StrictFunctionMetadata = {
  name: 'CONCATENATE',
  handler: TextFunctions.CONCATENATE,
  category: FunctionCategory.TEXT,
  minArgs: 1,
  maxArgs: 255,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1, // Fixed number of arguments, each O(length)
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const CONCAT: StrictFunctionMetadata = {
  name: 'CONCAT',
  handler: TextFunctions.CONCAT,
  category: FunctionCategory.TEXT,
  minArgs: 1,
  maxArgs: 255,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1, // Similar to CONCATENATE
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const LEFT: StrictFunctionMetadata = {
  name: 'LEFT',
  handler: TextFunctions.LEFT,
  category: FunctionCategory.TEXT,
  minArgs: 1,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1, // Substring extraction, O(num_chars)
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const RIGHT: StrictFunctionMetadata = {
  name: 'RIGHT',
  handler: TextFunctions.RIGHT,
  category: FunctionCategory.TEXT,
  minArgs: 1,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1, // Substring extraction, O(num_chars)
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const MID: StrictFunctionMetadata = {
  name: 'MID',
  handler: TextFunctions.MID,
  category: FunctionCategory.TEXT,
  minArgs: 3,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1, // Substring extraction, O(num_chars)
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const LEN: StrictFunctionMetadata = {
  name: 'LEN',
  handler: TextFunctions.LEN,
  category: FunctionCategory.TEXT,
  minArgs: 1,
  maxArgs: 1,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1, // String length query, O(1) for stored length
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

// ============================================================================
// BYTE FUNCTIONS (DBCS/SBCS Encoding) - O(1)
// ============================================================================

export const LENB: StrictFunctionMetadata = {
  name: 'LENB',
  handler: TextFunctions.LENB,
  category: FunctionCategory.TEXT,
  minArgs: 1,
  maxArgs: 1,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1, // Byte length query
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const LEFTB: StrictFunctionMetadata = {
  name: 'LEFTB',
  handler: TextFunctions.LEFTB,
  category: FunctionCategory.TEXT,
  minArgs: 1,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1, // Byte-based substring
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const RIGHTB: StrictFunctionMetadata = {
  name: 'RIGHTB',
  handler: TextFunctions.RIGHTB,
  category: FunctionCategory.TEXT,
  minArgs: 1,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1, // Byte-based substring
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const MIDB: StrictFunctionMetadata = {
  name: 'MIDB',
  handler: TextFunctions.MIDB,
  category: FunctionCategory.TEXT,
  minArgs: 3,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1, // Byte-based substring
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

// ============================================================================
// CASE CONVERSION (O(1))
// ============================================================================

export const UPPER: StrictFunctionMetadata = {
  name: 'UPPER',
  handler: TextFunctions.UPPER,
  category: FunctionCategory.TEXT,
  minArgs: 1,
  maxArgs: 1,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1, // Case conversion, O(length) but bounded
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const LOWER: StrictFunctionMetadata = {
  name: 'LOWER',
  handler: TextFunctions.LOWER,
  category: FunctionCategory.TEXT,
  minArgs: 1,
  maxArgs: 1,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1, // Case conversion, O(length) but bounded
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const PROPER: StrictFunctionMetadata = {
  name: 'PROPER',
  handler: TextFunctions.PROPER,
  category: FunctionCategory.TEXT,
  minArgs: 1,
  maxArgs: 1,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1, // Title case conversion, O(length) but bounded
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

// ============================================================================
// TEXT MANIPULATION (O(1))
// ============================================================================

export const TRIM: StrictFunctionMetadata = {
  name: 'TRIM',
  handler: TextFunctions.TRIM,
  category: FunctionCategory.TEXT,
  minArgs: 1,
  maxArgs: 1,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1, // Whitespace removal, O(length) but bounded
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const CLEAN: StrictFunctionMetadata = {
  name: 'CLEAN',
  handler: TextFunctions.CLEAN,
  category: FunctionCategory.TEXT,
  minArgs: 1,
  maxArgs: 1,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1, // Remove non-printable chars, O(length) but bounded
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const SUBSTITUTE: StrictFunctionMetadata = {
  name: 'SUBSTITUTE',
  handler: TextFunctions.SUBSTITUTE,
  category: FunctionCategory.TEXT,
  minArgs: 3,
  maxArgs: 4,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1, // String replacement, O(length) but bounded
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const REPLACE: StrictFunctionMetadata = {
  name: 'REPLACE',
  handler: TextFunctions.REPLACE,
  category: FunctionCategory.TEXT,
  minArgs: 4,
  maxArgs: 4,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1, // Position-based replacement, O(length) but bounded
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const REPT: StrictFunctionMetadata = {
  name: 'REPT',
  handler: TextFunctions.REPT,
  category: FunctionCategory.TEXT,
  minArgs: 2,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1, // String repetition, O(n * length) but bounded
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

// ============================================================================
// SEARCH FUNCTIONS (O(1))
// ============================================================================

export const FIND: StrictFunctionMetadata = {
  name: 'FIND',
  handler: TextFunctions.FIND,
  category: FunctionCategory.TEXT,
  minArgs: 2,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1, // String search, O(length) but bounded, case-sensitive
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const SEARCH: StrictFunctionMetadata = {
  name: 'SEARCH',
  handler: TextFunctions.SEARCH,
  category: FunctionCategory.TEXT,
  minArgs: 2,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1, // String search, O(length) but bounded, case-insensitive
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const EXACT: StrictFunctionMetadata = {
  name: 'EXACT',
  handler: TextFunctions.EXACT,
  category: FunctionCategory.TEXT,
  minArgs: 2,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1, // String comparison, O(length) but bounded
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

// ============================================================================
// CONVERSION FUNCTIONS (O(1))
// ============================================================================

export const TEXT: StrictFunctionMetadata = {
  name: 'TEXT',
  handler: TextFunctions.TEXT,
  category: FunctionCategory.TEXT,
  minArgs: 2,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1, // Format conversion, O(length) but bounded
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const VALUE: StrictFunctionMetadata = {
  name: 'VALUE',
  handler: TextFunctions.VALUE,
  category: FunctionCategory.TEXT,
  minArgs: 1,
  maxArgs: 1,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1, // String to number conversion, O(length) but bounded
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const NUMBERVALUE: StrictFunctionMetadata = {
  name: 'NUMBERVALUE',
  handler: TextFunctions.NUMBERVALUE,
  category: FunctionCategory.TEXT,
  minArgs: 1,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1, // Locale-aware number parsing
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const CHAR: StrictFunctionMetadata = {
  name: 'CHAR',
  handler: TextFunctions.CHAR,
  category: FunctionCategory.TEXT,
  minArgs: 1,
  maxArgs: 1,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1, // ASCII/Unicode character lookup, O(1)
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const CODE: StrictFunctionMetadata = {
  name: 'CODE',
  handler: TextFunctions.CODE,
  category: FunctionCategory.TEXT,
  minArgs: 1,
  maxArgs: 1,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1, // Character code lookup, O(1)
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const UNICHAR: StrictFunctionMetadata = {
  name: 'UNICHAR',
  handler: TextFunctions.UNICHAR,
  category: FunctionCategory.TEXT,
  minArgs: 1,
  maxArgs: 1,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1, // Unicode character lookup, O(1)
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const UNICODE: StrictFunctionMetadata = {
  name: 'UNICODE',
  handler: TextFunctions.UNICODE,
  category: FunctionCategory.TEXT,
  minArgs: 1,
  maxArgs: 1,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1, // Unicode code point lookup, O(1)
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const FIXED: StrictFunctionMetadata = {
  name: 'FIXED',
  handler: TextFunctions.FIXED,
  category: FunctionCategory.TEXT,
  minArgs: 1,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1, // Number formatting, O(1)
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const TEXTBEFORE: StrictFunctionMetadata = {
  name: 'TEXTBEFORE',
  handler: TextFunctions.TEXTBEFORE,
  category: FunctionCategory.TEXT,
  minArgs: 2,
  maxArgs: 6,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1, // String search, O(1) for bounded strings
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const TEXTAFTER: StrictFunctionMetadata = {
  name: 'TEXTAFTER',
  handler: TextFunctions.TEXTAFTER,
  category: FunctionCategory.TEXT,
  minArgs: 2,
  maxArgs: 6,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1, // String search, O(1) for bounded strings
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

export const DOLLAR: StrictFunctionMetadata = {
  name: 'DOLLAR',
  handler: TextFunctions.DOLLAR,
  category: FunctionCategory.TEXT,
  minArgs: 1,
  maxArgs: 2,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1, // Currency formatting, O(1)
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

// ============================================================================
// ARRAY-BASED TEXT OPERATIONS (O(n))
// ============================================================================

/**
 * TEXTJOIN - Join Array Elements with Delimiter
 * 
 * Complexity: O(n) where n = number of array elements to join
 * - Must iterate over all array elements
 * - Concatenates with delimiter
 * - Conservative: O(n) array iteration
 * 
 * Note: NOT O(1) because it processes variable-length arrays
 */
export const TEXTJOIN: StrictFunctionMetadata = {
  name: 'TEXTJOIN',
  handler: TextFunctions.TEXTJOIN,
  category: FunctionCategory.TEXT,
  minArgs: 2,
  maxArgs: 255,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N, // O(n) where n = number of elements to join
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

/**
 * TEXTSPLIT - Split Text into Array
 * 
 * Complexity: O(n) where n = length of input text
 * - Must scan entire text for delimiters
 * - Creates array of substrings
 * - Conservative: O(n) text scanning
 * 
 * Note: NOT O(1) because it processes variable-length text
 */
export const TEXTSPLIT: StrictFunctionMetadata = {
  name: 'TEXTSPLIT',
  handler: TextFunctions.TEXTSPLIT,
  category: FunctionCategory.TEXT,
  minArgs: 2,
  maxArgs: 6,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N, // O(n) where n = text length (scan for delimiters)
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

// ============================================================================
// MASTER EXPORT: Text Category (31 functions)
// ============================================================================

export const TEXT_METADATA: StrictFunctionMetadata[] = [
  // Basic operations (O(1))
  CONCATENATE,
  CONCAT,
  LEFT,
  RIGHT,
  MID,
  LEN,
  
  // Byte functions (O(1))
  LENB,
  LEFTB,
  RIGHTB,
  MIDB,
  
  // Case conversion (O(1))
  UPPER,
  LOWER,
  PROPER,
  
  // Text manipulation (O(1))
  TRIM,
  CLEAN,
  SUBSTITUTE,
  REPLACE,
  REPT,
  
  // Search functions (O(1))
  FIND,
  SEARCH,
  EXACT,
  
  // Conversion functions (O(1))
  TEXT,
  VALUE,
  NUMBERVALUE,
  CHAR,
  CODE,
  UNICHAR,
  UNICODE,
  DOLLAR,
  FIXED,
  TEXTBEFORE,
  TEXTAFTER,
  
  // Array operations (O(n))
  TEXTJOIN,
  TEXTSPLIT,
];

/**
 * CATEGORY STATISTICS:
 * - Total functions: 31
 * - Complexity breakdown:
 *   * O(1): 29 (all string operations with bounded length)
 *   * O(n): 2 (TEXTJOIN, TEXTSPLIT - array iteration)
 * - Precision: ALL EXACT (text operations, no floating point)
 * - ErrorStrategy: ALL PROPAGATE_FIRST (standard error propagation)
 * - Volatile: 0 (all deterministic)
 * - Iterative: 0 (no convergence algorithms)
 * - Special: 0 (no execution context needed)
 * 
 * CONSERVATIVE CLASSIFICATION RATIONALE:
 * - String operations classified as O(1) because cell content is bounded (~32KB max)
 * - TEXTJOIN/TEXTSPLIT classified as O(n) because they iterate over arrays
 * - No special error handling quirks (text functions are well-defined)
 * - No volatile functions (text operations are deterministic)
 * 
 * NO INCONSISTENCIES FOUND:
 * - Text functions are straightforward, deterministic operations
 * - No ambiguous complexity cases
 * - No special error handling requirements
 */
