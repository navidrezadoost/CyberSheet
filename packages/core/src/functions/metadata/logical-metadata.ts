/**
 * logical-metadata.ts
 * 
 * Wave 0 Day 2: Strict Metadata Backfill - Logical Category
 * 
 * ⚠️ CRITICAL CATEGORY: Contains lazy evaluation (IF) and short-circuit (AND/OR)
 * These error strategies are PRIMARY REASON for ErrorStrategy enum
 * 
 * Classification Rules:
 * - IF/IFS/IFERROR/IFNA → LAZY_EVALUATION (don't evaluate unused branches)
 * - AND/OR → SHORT_CIRCUIT (stop at first determinant)
 * - SWITCH → LAZY_EVALUATION (only evaluate matched case)
 * - Constants (TRUE/FALSE/NA) → O(1), EXACT precision
 */

import { 
  FunctionCategory,
  ComplexityClass,
  PrecisionClass,
  ErrorStrategy,
  type StrictFunctionMetadata 
} from '../../types/formula-types';
import * as LogicalFunctions from '../logical';

/**
 * Logical Category: Strict Metadata
 * 
 * Total Functions: 17
 * 
 * Complexity: ALL O(1) (constants and single-value operations)
 * Precision: ALL EXACT (boolean/logical operations, no floating point)
 * 
 * Error Strategy Distribution:
 * - LAZY_EVALUATION: 5 (IF, IFS, SWITCH, IFERROR, IFNA)
 * - SHORT_CIRCUIT: 3 (AND, OR, XOR)
 * - PROPAGATE_FIRST: 9 (NOT, TRUE, FALSE, NA, ISERROR, ISERR, ISNA, ISEVEN, ISODD)
 */

export const LOGICAL_METADATA: StrictFunctionMetadata[] = [
  // ============================================================================
  // LAZY EVALUATION (⚠️ CRITICAL)
  // ============================================================================
  
  {
    name: 'IF',
    handler: LogicalFunctions.IF,
    category: FunctionCategory.LOGICAL,
    minArgs: 2,
    maxArgs: 3,
    isSpecial: true,                                // ⚠️ SPECIAL: Lazy evaluation
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.LAZY_EVALUATION,  // ⚠️ Only evaluate used branch
    iterationPolicy: null,
  },
  
  {
    name: 'IFS',
    handler: LogicalFunctions.IFS,
    category: FunctionCategory.LOGICAL,
    minArgs: 2,
    maxArgs: 255,
    isSpecial: true,                                // ⚠️ SPECIAL: Lazy evaluation
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,          // Stops at first TRUE condition
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.LAZY_EVALUATION,  // ⚠️ Only evaluate matched condition
    iterationPolicy: null,
  },
  
  {
    name: 'IFERROR',
    handler: LogicalFunctions.IFERROR,
    category: FunctionCategory.LOGICAL,
    minArgs: 2,
    maxArgs: 2,
    isSpecial: true,                                // ⚠️ SPECIAL: Lazy evaluation
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.LAZY_EVALUATION,  // ⚠️ Only evaluate fallback if error
    iterationPolicy: null,
  },
  
  {
    name: 'IFNA',
    handler: LogicalFunctions.IFNA,
    category: FunctionCategory.LOGICAL,
    minArgs: 2,
    maxArgs: 2,
    isSpecial: true,                                // ⚠️ SPECIAL: Lazy evaluation
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.LAZY_EVALUATION,  // ⚠️ Only evaluate fallback if #N/A
    iterationPolicy: null,
  },
  
  {
    name: 'SWITCH',
    handler: LogicalFunctions.SWITCH,
    category: FunctionCategory.LOGICAL,
    minArgs: 3,
    maxArgs: 255,
    isSpecial: true,                                // ⚠️ SPECIAL: Lazy evaluation
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,          // Stops at first match
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.LAZY_EVALUATION,  // ⚠️ Only evaluate matched case
    iterationPolicy: null,
  },
  
  // ============================================================================
  // SHORT-CIRCUIT EVALUATION (⚠️ CRITICAL)
  // ============================================================================
  
  {
    name: 'AND',
    handler: LogicalFunctions.AND,
    category: FunctionCategory.LOGICAL,
    minArgs: 1,
    maxArgs: 255,
    isSpecial: true,                                // ⚠️ SPECIAL: Short-circuit
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,          // Stops at first FALSE
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.SHORT_CIRCUIT,    // ⚠️ Stop at first FALSE
    iterationPolicy: null,
  },
  
  {
    name: 'OR',
    handler: LogicalFunctions.OR,
    category: FunctionCategory.LOGICAL,
    minArgs: 1,
    maxArgs: 255,
    isSpecial: true,                                // ⚠️ SPECIAL: Short-circuit
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,          // Stops at first TRUE
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.SHORT_CIRCUIT,    // ⚠️ Stop at first TRUE
    iterationPolicy: null,
  },
  
  {
    name: 'XOR',
    handler: LogicalFunctions.XOR,
    category: FunctionCategory.LOGICAL,
    minArgs: 1,
    maxArgs: 255,
    isSpecial: false,                               // XOR must evaluate all (no short-circuit)
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,          // Must evaluate all arguments
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,  // Standard propagation (no short-circuit)
    iterationPolicy: null,
  },
  
  // ============================================================================
  // SIMPLE PREDICATES & CONSTANTS
  // ============================================================================
  
  {
    name: 'NOT',
    handler: LogicalFunctions.NOT,
    category: FunctionCategory.LOGICAL,
    minArgs: 1,
    maxArgs: 1,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'TRUE',
    handler: LogicalFunctions.TRUE,
    category: FunctionCategory.LOGICAL,
    minArgs: 0,
    maxArgs: 0,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,          // Constant return
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'FALSE',
    handler: LogicalFunctions.FALSE,
    category: FunctionCategory.LOGICAL,
    minArgs: 0,
    maxArgs: 0,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,          // Constant return
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'NA',
    handler: LogicalFunctions.NA,
    category: FunctionCategory.LOGICAL,
    minArgs: 0,
    maxArgs: 0,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,          // Constant return (#N/A)
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  // ============================================================================
  // ERROR CHECKING PREDICATES
  // ============================================================================
  
  {
    name: 'ISERROR',
    handler: LogicalFunctions.ISERROR,
    category: FunctionCategory.LOGICAL,
    minArgs: 1,
    maxArgs: 1,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,          // Boolean result
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,  // NOTE: Returns TRUE for errors (doesn't propagate)
    iterationPolicy: null,
  },
  
  {
    name: 'ISERR',
    handler: LogicalFunctions.ISERR,
    category: FunctionCategory.LOGICAL,
    minArgs: 1,
    maxArgs: 1,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,  // NOTE: Returns TRUE for errors except #N/A
    iterationPolicy: null,
  },
  
  {
    name: 'ISNA',
    handler: LogicalFunctions.ISNA,
    category: FunctionCategory.LOGICAL,
    minArgs: 1,
    maxArgs: 1,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,  // NOTE: Returns TRUE for #N/A
    iterationPolicy: null,
  },
  
  {
    name: 'ISEVEN',
    handler: LogicalFunctions.ISEVEN,
    category: FunctionCategory.LOGICAL,
    minArgs: 1,
    maxArgs: 1,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'ISODD',
    handler: LogicalFunctions.ISODD,
    category: FunctionCategory.LOGICAL,
    minArgs: 1,
    maxArgs: 1,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
];

/**
 * Logical Category Summary:
 * 
 * Total: 17 functions classified
 * 
 * Complexity:
 * - O(1): 16 (all except XOR)
 * - O(n): 1 (XOR - must evaluate all arguments)
 * 
 * Precision:
 * - EXACT: 17 (all - boolean/logical operations)
 * 
 * Error Strategy:
 * - LAZY_EVALUATION: 5 (IF, IFS, IFERROR, IFNA, SWITCH) ⚠️ CRITICAL
 * - SHORT_CIRCUIT: 2 (AND, OR) ⚠️ CRITICAL
 * - PROPAGATE_FIRST: 10 (NOT, TRUE, FALSE, NA, XOR, ISERROR, ISERR, ISNA, ISEVEN, ISODD)
 * 
 * Special Functions: 7 (IF, IFS, IFERROR, IFNA, SWITCH, AND, OR)
 * 
 * Volatile: 0 (none)
 * 
 * Critical for Wave 0:
 * - Lazy evaluation: IF/IFS must not evaluate unused branches
 * - Short-circuit: AND/OR must stop at first determinant
 * - Error Engine Layer (Wave 0 Day 4-5) will consume these strategies
 */
