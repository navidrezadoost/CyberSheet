/**
 * information-metadata.ts
 * 
 * WAVE 0 DAY 2: Strict Metadata for Information Functions (15 functions)
 * Created: 2024
 * 
 * CATEGORY SUMMARY:
 * - Total functions: 15
 * - Volatile: 0
 * - Iterative: 0
 * - Special (needsContext): 3 (ISFORMULA, CELL, INFO)
 * - Complexity: ALL O(1) (type checks and property access)
 * - ErrorStrategy: ALL PROPAGATE_FIRST (standard)
 * 
 * KEY INSIGHTS:
 * 1. Type predicate functions (IS* functions) - O(1) type checks
 * 2. Conversion functions (N, T) - O(1) type coercion
 * 3. Context-aware functions (CELL, INFO, ISFORMULA) - need execution context
 * 4. All functions are deterministic (non-volatile)
 * 5. All use exact precision (boolean/integer results)
 * 
 * CONTEXT-AWARE FUNCTIONS:
 * - ISFORMULA: Requires cell metadata to check if cell contains formula
 * - CELL: Requires cell metadata to retrieve cell properties
 * - INFO: Requires system/environment context
 * 
 * NO INCONSISTENCIES FOUND:
 * - Information functions are simple, well-defined operations
 * - All type checks are O(1)
 * - Context-aware functions properly marked
 */

import { 
  FunctionCategory,
  ComplexityClass,
  PrecisionClass,
  ErrorStrategy,
  type StrictFunctionMetadata 
} from '../../types/formula-types';
import * as InformationFunctions from '../information';

const { O_1 } = ComplexityClass;
const EXACT_PRECISION = PrecisionClass.EXACT;
const { PROPAGATE_FIRST } = ErrorStrategy;

/**
 * Information Functions Category: Strict Metadata
 * 
 * ALL functions:
 * - Complexity: O(1) (type checks, property access)
 * - Precision: EXACT (boolean/integer results)
 * - ErrorStrategy: PROPAGATE_FIRST (standard)
 * - Volatile: false (deterministic operations)
 * - Iterative: null (no convergence algorithms)
 */

// ============================================================================
// TYPE PREDICATE FUNCTIONS (O(1))
// ============================================================================

/**
 * ISNUMBER - Check if Value is Number
 * 
 * Complexity: O(1) type check
 */
export const ISNUMBER: StrictFunctionMetadata = {
  name: 'ISNUMBER',
  handler: InformationFunctions.ISNUMBER,
  category: FunctionCategory.INFORMATION,
  minArgs: 1,
  maxArgs: 1,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

/**
 * ISTEXT - Check if Value is Text
 * 
 * Complexity: O(1) type check
 */
export const ISTEXT: StrictFunctionMetadata = {
  name: 'ISTEXT',
  handler: InformationFunctions.ISTEXT,
  category: FunctionCategory.INFORMATION,
  minArgs: 1,
  maxArgs: 1,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

/**
 * ISBLANK - Check if Value is Blank
 * 
 * Complexity: O(1) type check
 */
export const ISBLANK: StrictFunctionMetadata = {
  name: 'ISBLANK',
  handler: InformationFunctions.ISBLANK,
  category: FunctionCategory.INFORMATION,
  minArgs: 1,
  maxArgs: 1,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

/**
 * ISLOGICAL - Check if Value is Logical (Boolean)
 * 
 * Complexity: O(1) type check
 */
export const ISLOGICAL: StrictFunctionMetadata = {
  name: 'ISLOGICAL',
  handler: InformationFunctions.ISLOGICAL,
  category: FunctionCategory.INFORMATION,
  minArgs: 1,
  maxArgs: 1,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

/**
 * ISNONTEXT - Check if Value is Not Text
 * 
 * Complexity: O(1) type check
 */
export const ISNONTEXT: StrictFunctionMetadata = {
  name: 'ISNONTEXT',
  handler: InformationFunctions.ISNONTEXT,
  category: FunctionCategory.INFORMATION,
  minArgs: 1,
  maxArgs: 1,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

/**
 * ISREF - Check if Value is Reference
 * 
 * Complexity: O(1) type check
 */
export const ISREF: StrictFunctionMetadata = {
  name: 'ISREF',
  handler: InformationFunctions.ISREF,
  category: FunctionCategory.INFORMATION,
  minArgs: 1,
  maxArgs: 1,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

// ============================================================================
// TYPE IDENTIFICATION (O(1))
// ============================================================================

/**
 * TYPE - Return Type Code
 * 
 * Complexity: O(1) type identification
 * Returns: 1 (number), 2 (text), 4 (logical), 16 (error), 64 (array)
 */
export const TYPE: StrictFunctionMetadata = {
  name: 'TYPE',
  handler: InformationFunctions.TYPE,
  category: FunctionCategory.INFORMATION,
  minArgs: 1,
  maxArgs: 1,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

/**
 * ERROR.TYPE - Return Error Type Code
 * 
 * Complexity: O(1) error type identification
 * Returns: 1 (#NULL!), 2 (#DIV/0!), 3 (#VALUE!), 4 (#REF!), 5 (#NAME?), 6 (#NUM!), 7 (#N/A), 8 (#GETTING_DATA)
 */
export const ERROR_TYPE: StrictFunctionMetadata = {
  name: 'ERROR.TYPE',
  handler: InformationFunctions.ERROR_TYPE,
  category: FunctionCategory.INFORMATION,
  minArgs: 1,
  maxArgs: 1,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

// ============================================================================
// CONVERSION FUNCTIONS (O(1))
// ============================================================================

/**
 * N - Convert to Number
 * 
 * Complexity: O(1) type coercion
 * Returns: Number, 0 (for text/logical), error (if input is error)
 */
export const N: StrictFunctionMetadata = {
  name: 'N',
  handler: InformationFunctions.N,
  category: FunctionCategory.INFORMATION,
  minArgs: 1,
  maxArgs: 1,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

/**
 * T - Convert to Text
 * 
 * Complexity: O(1) type coercion
 * Returns: Text (if input is text), "" (if input is not text)
 */
export const T: StrictFunctionMetadata = {
  name: 'T',
  handler: InformationFunctions.T,
  category: FunctionCategory.INFORMATION,
  minArgs: 1,
  maxArgs: 1,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

/**
 * ISOMITTED - Check if Lambda Parameter was Omitted
 * 
 * Complexity: O(1) parameter check
 * Used in LAMBDA functions (Excel 365)
 */
export const ISOMITTED: StrictFunctionMetadata = {
  name: 'ISOMITTED',
  handler: InformationFunctions.ISOMITTED,
  category: FunctionCategory.INFORMATION,
  minArgs: 1,
  maxArgs: 1,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1,
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

// ============================================================================
// CONTEXT-AWARE FUNCTIONS (O(1), needsContext: true)
// ============================================================================

/**
 * ISFORMULA - Check if Cell Contains Formula
 * 
 * Complexity: O(1) cell metadata check
 * needsContext: TRUE (requires cell metadata)
 */
export const ISFORMULA: StrictFunctionMetadata = {
  name: 'ISFORMULA',
  handler: InformationFunctions.ISFORMULA,
  category: FunctionCategory.INFORMATION,
  minArgs: 1,
  maxArgs: 1,
  isSpecial: false,
  needsContext: true, // ⚠️ Requires cell metadata
  volatile: false,
  complexityClass: O_1,
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

/**
 * CELL - Retrieve Cell Property
 * 
 * Complexity: O(1) cell property access
 * needsContext: TRUE (requires cell metadata)
 * 
 * info_type: "address", "col", "row", "contents", "type", "format", etc.
 */
export const CELL: StrictFunctionMetadata = {
  name: 'CELL',
  handler: InformationFunctions.CELL,
  category: FunctionCategory.INFORMATION,
  minArgs: 1,
  maxArgs: 2,
  isSpecial: false,
  needsContext: true, // ⚠️ Requires cell metadata
  volatile: false,
  complexityClass: O_1,
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

/**
 * INFO - Retrieve System Information
 * 
 * Complexity: O(1) system property access
 * needsContext: TRUE (requires system/environment context)
 * 
 * type_text: "directory", "numfile", "origin", "osversion", "recalc", "release", "system"
 */
export const INFO: StrictFunctionMetadata = {
  name: 'INFO',
  handler: InformationFunctions.INFO,
  category: FunctionCategory.INFORMATION,
  minArgs: 1,
  maxArgs: 1,
  isSpecial: false,
  needsContext: true, // ⚠️ Requires system/environment context (but not cell-specific)
  volatile: false,
  complexityClass: O_1,
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

// ============================================================================
// MASTER EXPORT: Information Category (15 functions)
// ============================================================================

export const INFORMATION_METADATA: StrictFunctionMetadata[] = [
  // Type predicates (O(1))
  ISNUMBER,
  ISTEXT,
  ISBLANK,
  ISLOGICAL,
  ISNONTEXT,
  ISREF,
  
  // Type identification (O(1))
  TYPE,
  ERROR_TYPE,
  
  // Conversion (O(1))
  N,
  T,
  ISOMITTED,
  
  // Context-aware (O(1), needsContext: true)
  ISFORMULA, // ⚠️ Requires cell metadata
  CELL,      // ⚠️ Requires cell metadata
  INFO,      // ⚠️ Requires system context
];

/**
 * CATEGORY STATISTICS:
 * - Total functions: 15
 * - Complexity: ALL O(1) (type checks, property access)
 * - Precision: ALL EXACT (boolean/integer results)
 * - ErrorStrategy: ALL PROPAGATE_FIRST (standard)
 * - Volatile: 0 (all deterministic)
 * - Iterative: 0
 * - Special: 0
 * - needsContext: 3 (ISFORMULA, CELL, INFO)
 * 
 * CONTEXT-AWARE FUNCTIONS:
 * - ISFORMULA: Checks if cell contains formula (requires cell metadata)
 * - CELL: Retrieves cell properties (requires cell metadata)
 * - INFO: Retrieves system information (requires environment context)
 * 
 * NO INCONSISTENCIES FOUND:
 * - Information functions are simple type checks and property access
 * - All O(1) complexity
 * - Context-aware functions properly marked with needsContext: true
 */
