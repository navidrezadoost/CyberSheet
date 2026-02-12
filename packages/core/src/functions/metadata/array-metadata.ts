/**
 * array-metadata.ts
 * 
 * WAVE 0 DAY 2: Strict Metadata for Array Functions (20 functions)
 * Created: 2024
 * 
 * CATEGORY SUMMARY:
 * - Total functions: 20
 * - Volatile: 1 (RANDARRAY)
 * - Iterative: 0
 * - Special: 0
 * - Complexity: O(1): 4, O(n): 10, O(n log n): 2
 * - ErrorStrategy: ALL PROPAGATE_FIRST (standard)
 * 
 * KEY INSIGHTS:
 * 1. Dynamic array functions (Excel 365+) - modern array operations
 * 2. SORT/SORTBY are O(n log n) due to sorting algorithms
 * 3. UNIQUE/FILTER are O(n) linear scans
 * 4. TRANSPOSE/VSTACK/HSTACK are O(n) array restructuring
 * 5. SEQUENCE/ROWS/COLUMNS are O(1) or O(output_size)
 * 6. RANDARRAY is volatile (only volatile array function)
 * 
 * CONSERVATIVE CLASSIFICATIONS:
 * - SORT: O(n log n) (comparison-based sort)
 * - UNIQUE: O(n) (must scan all elements for duplicates)
 * - FILTER: O(n) (must evaluate condition for each element)
 * - TRANSPOSE: O(n) (must copy all elements)
 * - SEQUENCE: O(1) in terms of computation (output size is O(rows*cols))
 * 
 * NO INCONSISTENCIES FOUND:
 * - Array functions have well-defined complexity
 * - RANDARRAY correctly marked as volatile
 * - All use standard error propagation
 */

import { 
  FunctionCategory,
  ComplexityClass,
  PrecisionClass,
  ErrorStrategy,
  type StrictFunctionMetadata 
} from '../../types/formula-types';
import * as ArrayFunctions from '../array';

const { O_1, O_N, O_N_LOG_N } = ComplexityClass;
const EXACT_PRECISION = PrecisionClass.EXACT;
const { PROPAGATE_FIRST } = ErrorStrategy;

/**
 * Array Functions Category: Strict Metadata
 * 
 * ALL functions:
 * - Precision: EXACT (array structure operations, no floating point arithmetic)
 * - ErrorStrategy: PROPAGATE_FIRST (standard error propagation)
 * - Iterative: null (no convergence algorithms)
 * - Special: false (no execution context needed)
 * 
 * Excel 365 Dynamic Arrays:
 * - Automatically spill into neighboring cells
 * - Enable functional programming patterns
 * - Support advanced data transformation
 */

// ============================================================================
// ARRAY TRANSFORMATION (O(n))
// ============================================================================

/**
 * TRANSPOSE - Swap Rows and Columns
 * 
 * Complexity: O(n) where n = total elements (rows × cols)
 * - Must copy all elements to new positions
 * - Conservative: O(n) element copying
 */
export const TRANSPOSE: StrictFunctionMetadata = {
  name: 'TRANSPOSE',
  handler: ArrayFunctions.TRANSPOSE,
  category: FunctionCategory.ARRAY,
  minArgs: 1,
  maxArgs: 1,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N, // O(rows × cols) element copying
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

/**
 * UNIQUE - Extract Unique Values
 * 
 * Complexity: O(n) where n = number of elements
 * - Must scan all elements to identify duplicates
 * - Typically uses hash set for O(n) average case
 * - Conservative: O(n) linear scan
 */
export const UNIQUE: StrictFunctionMetadata = {
  name: 'UNIQUE',
  handler: ArrayFunctions.UNIQUE,
  category: FunctionCategory.ARRAY,
  minArgs: 1,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N, // O(n) hash set for duplicate detection
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

/**
 * FILTER - Filter Array by Condition
 * 
 * Complexity: O(n) where n = number of elements
 * - Must evaluate condition for each element
 * - Conservative: O(n) linear scan
 */
export const FILTER: StrictFunctionMetadata = {
  name: 'FILTER',
  handler: ArrayFunctions.FILTER,
  category: FunctionCategory.ARRAY,
  minArgs: 2,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N, // O(n) condition evaluation
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

// ============================================================================
// SORTING (O(n log n))
// ============================================================================

/**
 * SORT - Sort Array
 * 
 * Complexity: O(n log n) comparison-based sorting
 * - Worst-case for comparison-based sort
 * - Conservative: O(n log n) (matches Excel behavior)
 */
export const SORT: StrictFunctionMetadata = {
  name: 'SORT',
  handler: ArrayFunctions.SORT,
  category: FunctionCategory.ARRAY,
  minArgs: 1,
  maxArgs: 4,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N_LOG_N, // Comparison-based sort
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

/**
 * SORTBY - Sort Array by Another Array
 * 
 * Complexity: O(n log n) comparison-based sorting
 * - Sorts by_array1, optionally by_array2, etc.
 * - Conservative: O(n log n) (same as SORT)
 */
export const SORTBY: StrictFunctionMetadata = {
  name: 'SORTBY',
  handler: ArrayFunctions.SORTBY,
  category: FunctionCategory.ARRAY,
  minArgs: 2,
  maxArgs: 255,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N_LOG_N, // Comparison-based sort
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

// ============================================================================
// ARRAY GENERATION (O(1) computation, O(size) output)
// ============================================================================

/**
 * SEQUENCE - Generate Sequence of Numbers
 * 
 * Complexity: O(1) in terms of computation
 * - Generates arithmetic sequence
 * - Output size is O(rows × cols) but generation is O(1) per element
 * - Conservative: O(1) (computation, not output size)
 */
export const SEQUENCE: StrictFunctionMetadata = {
  name: 'SEQUENCE',
  handler: ArrayFunctions.SEQUENCE,
  category: FunctionCategory.ARRAY,
  minArgs: 1,
  maxArgs: 4,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1, // O(1) per element (arithmetic sequence)
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

/**
 * RANDARRAY - Generate Random Array
 * 
 * Complexity: O(1) in terms of computation per element
 * Volatile: TRUE (random number generation)
 * - Recalculates on every change (like RAND)
 * - Output size is O(rows × cols) but generation is O(1) per element
 */
export const RANDARRAY: StrictFunctionMetadata = {
  name: 'RANDARRAY',
  handler: ArrayFunctions.RANDARRAY,
  category: FunctionCategory.ARRAY,
  minArgs: 0,
  maxArgs: 5,
  isSpecial: false,
  needsContext: false,
  volatile: true, // ⚠️ CRITICAL: Random array generation
  complexityClass: O_1, // O(1) per element (random generation)
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

// ============================================================================
// ARRAY STACKING (O(n))
// ============================================================================

/**
 * VSTACK - Stack Arrays Vertically
 * 
 * Complexity: O(n) where n = total elements across all arrays
 * - Must copy all elements to new array
 * - Conservative: O(n) element copying
 */
export const VSTACK: StrictFunctionMetadata = {
  name: 'VSTACK',
  handler: ArrayFunctions.VSTACK,
  category: FunctionCategory.ARRAY,
  minArgs: 1,
  maxArgs: 255,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N, // O(total elements) copying
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

/**
 * HSTACK - Stack Arrays Horizontally
 * 
 * Complexity: O(n) where n = total elements across all arrays
 * - Must copy all elements to new array
 * - Conservative: O(n) element copying
 */
export const HSTACK: StrictFunctionMetadata = {
  name: 'HSTACK',
  handler: ArrayFunctions.HSTACK,
  category: FunctionCategory.ARRAY,
  minArgs: 1,
  maxArgs: 255,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N, // O(total elements) copying
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

// ============================================================================
// ARRAY RESHAPING (O(n))
// ============================================================================

/**
 * WRAPCOLS - Wrap Array into Columns
 * 
 * Complexity: O(n) where n = number of elements
 * - Must rearrange all elements
 * - Conservative: O(n) element copying
 */
export const WRAPCOLS: StrictFunctionMetadata = {
  name: 'WRAPCOLS',
  handler: ArrayFunctions.WRAPCOLS,
  category: FunctionCategory.ARRAY,
  minArgs: 2,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N, // O(n) element rearrangement
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

/**
 * WRAPROWS - Wrap Array into Rows
 * 
 * Complexity: O(n) where n = number of elements
 * - Must rearrange all elements
 * - Conservative: O(n) element copying
 */
export const WRAPROWS: StrictFunctionMetadata = {
  name: 'WRAPROWS',
  handler: ArrayFunctions.WRAPROWS,
  category: FunctionCategory.ARRAY,
  minArgs: 2,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N, // O(n) element rearrangement
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

// ============================================================================
// ARRAY SLICING (O(n))
// ============================================================================

/**
 * TAKE - Take First/Last N Rows or Columns
 * 
 * Complexity: O(n) where n = number of elements taken
 * - Must copy n elements
 * - Conservative: O(n) element copying
 */
export const TAKE: StrictFunctionMetadata = {
  name: 'TAKE',
  handler: ArrayFunctions.TAKE,
  category: FunctionCategory.ARRAY,
  minArgs: 2,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N, // O(n) where n = elements taken
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

/**
 * DROP - Drop First/Last N Rows or Columns
 * 
 * Complexity: O(n) where n = number of elements kept
 * - Must copy remaining elements
 * - Conservative: O(n) element copying
 */
export const DROP: StrictFunctionMetadata = {
  name: 'DROP',
  handler: ArrayFunctions.DROP,
  category: FunctionCategory.ARRAY,
  minArgs: 2,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N, // O(n) where n = elements kept
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

/**
 * CHOOSEROWS - Select Specific Rows
 * 
 * Complexity: O(n) where n = total elements in selected rows
 * - Must copy selected rows
 * - Conservative: O(n) element copying
 */
export const CHOOSEROWS: StrictFunctionMetadata = {
  name: 'CHOOSEROWS',
  handler: ArrayFunctions.CHOOSEROWS,
  category: FunctionCategory.ARRAY,
  minArgs: 2,
  maxArgs: 255,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N, // O(selected rows × cols)
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

/**
 * CHOOSECOLS - Select Specific Columns
 * 
 * Complexity: O(n) where n = total elements in selected columns
 * - Must copy selected columns
 * - Conservative: O(n) element copying
 */
export const CHOOSECOLS: StrictFunctionMetadata = {
  name: 'CHOOSECOLS',
  handler: ArrayFunctions.CHOOSECOLS,
  category: FunctionCategory.ARRAY,
  minArgs: 2,
  maxArgs: 255,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N, // O(rows × selected cols)
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

// ============================================================================
// ARRAY FLATTENING (O(n))
// ============================================================================

/**
 * TOCOL - Convert Array to Single Column
 * 
 * Complexity: O(n) where n = number of elements
 * - Must rearrange all elements into column
 * - Conservative: O(n) element copying
 */
export const TOCOL: StrictFunctionMetadata = {
  name: 'TOCOL',
  handler: ArrayFunctions.TOCOL,
  category: FunctionCategory.ARRAY,
  minArgs: 1,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N, // O(n) element rearrangement
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

/**
 * TOROW - Convert Array to Single Row
 * 
 * Complexity: O(n) where n = number of elements
 * - Must rearrange all elements into row
 * - Conservative: O(n) element copying
 */
export const TOROW: StrictFunctionMetadata = {
  name: 'TOROW',
  handler: ArrayFunctions.TOROW,
  category: FunctionCategory.ARRAY,
  minArgs: 1,
  maxArgs: 3,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N, // O(n) element rearrangement
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

/**
 * FLATTEN - Flatten Nested Arrays
 * 
 * Complexity: O(n) where n = total elements (all nesting levels)
 * - Must visit all elements in nested structure
 * - Conservative: O(n) element traversal
 */
export const FLATTEN: StrictFunctionMetadata = {
  name: 'FLATTEN',
  handler: ArrayFunctions.FLATTEN,
  category: FunctionCategory.ARRAY,
  minArgs: 1,
  maxArgs: 1,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_N, // O(total elements) traversal
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

// ============================================================================
// ARRAY INTROSPECTION (O(1))
// ============================================================================

/**
 * ROWS - Count Number of Rows
 * 
 * Complexity: O(1) - direct property access
 */
export const ROWS: StrictFunctionMetadata = {
  name: 'ROWS',
  handler: ArrayFunctions.ROWS,
  category: FunctionCategory.ARRAY,
  minArgs: 1,
  maxArgs: 1,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1, // O(1) property access
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

/**
 * COLUMNS - Count Number of Columns
 * 
 * Complexity: O(1) - direct property access
 */
export const COLUMNS: StrictFunctionMetadata = {
  name: 'COLUMNS',
  handler: ArrayFunctions.COLUMNS,
  category: FunctionCategory.ARRAY,
  minArgs: 1,
  maxArgs: 1,
  isSpecial: false,
  needsContext: false,
  volatile: false,
  complexityClass: O_1, // O(1) property access
  precisionClass: EXACT_PRECISION,
  errorStrategy: PROPAGATE_FIRST,
  iterationPolicy: null,
};

// ============================================================================
// MASTER EXPORT: Array Category (20 functions)
// ============================================================================

export const ARRAY_METADATA: StrictFunctionMetadata[] = [
  // Transformation (O(n))
  TRANSPOSE,
  UNIQUE,
  FILTER,
  
  // Sorting (O(n log n))
  SORT,
  SORTBY,
  
  // Generation (O(1) computation)
  SEQUENCE,
  RANDARRAY, // ⚠️ VOLATILE
  
  // Stacking (O(n))
  VSTACK,
  HSTACK,
  
  // Reshaping (O(n))
  WRAPCOLS,
  WRAPROWS,
  
  // Slicing (O(n))
  TAKE,
  DROP,
  CHOOSEROWS,
  CHOOSECOLS,
  
  // Flattening (O(n))
  TOCOL,
  TOROW,
  FLATTEN,
  
  // Introspection (O(1))
  ROWS,
  COLUMNS,
];

/**
 * CATEGORY STATISTICS:
 * - Total functions: 20
 * - Complexity breakdown:
 *   * O(1): 4 (SEQUENCE, RANDARRAY, ROWS, COLUMNS)
 *   * O(n): 14 (TRANSPOSE, UNIQUE, FILTER, VSTACK, HSTACK, WRAPCOLS, WRAPROWS, TAKE, DROP, CHOOSEROWS, CHOOSECOLS, TOCOL, TOROW, FLATTEN)
 *   * O(n log n): 2 (SORT, SORTBY)
 * - Precision: ALL EXACT (array structure operations)
 * - ErrorStrategy: ALL PROPAGATE_FIRST (standard)
 * - Volatile: 1 (RANDARRAY)
 * - Iterative: 0
 * - Special: 0
 * 
 * EXCEL 365 DYNAMIC ARRAYS:
 * - Automatically spill into neighboring cells
 * - Enable functional programming patterns
 * - Support advanced data transformation
 * 
 * NO INCONSISTENCIES FOUND:
 * - Array functions have well-defined complexity
 * - RANDARRAY correctly marked as volatile
 * - All use standard error propagation
 */
