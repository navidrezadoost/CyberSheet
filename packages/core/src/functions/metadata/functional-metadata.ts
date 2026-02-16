/**
 * functional-metadata.ts
 * 
 * Strict Metadata for Functional/Lambda Functions
 * 
 * Functions: LAMBDA, LET, MAP, REDUCE, SCAN, BYROW, BYCOL, MAKEARRAY
 * These are Excel 365 functional programming features
 */

import { 
  FunctionCategory,
  ComplexityClass,
  PrecisionClass,
  ErrorStrategy,
  type StrictFunctionMetadata
} from '../../types/formula-types';
import * as FunctionalFunctions from '../functional';

/**
 * Functional/Lambda Category: Strict Metadata
 * 
 * Total Functions: 8
 * All are Excel 365 features for functional programming
 */

export const FUNCTIONAL_METADATA: StrictFunctionMetadata[] = [
  // ============================================================================
  // LAMBDA AND LET
  // ============================================================================
  
  {
    name: 'LAMBDA',
    handler: FunctionalFunctions.LAMBDA,
    category: FunctionCategory.LAMBDA,
    minArgs: 2,       // At least 1 parameter + body
    maxArgs: 254,     // Up to 253 parameters + body
    isSpecial: true,  // Creates a callable function object
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_1,  // Creation is O(1)
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'LET',
    handler: FunctionalFunctions.LET,
    category: FunctionCategory.LAMBDA,
    minArgs: 3,       // At least name, value, expression
    maxArgs: 254,     // Up to 126 name-value pairs + final expression
    isSpecial: true,  // Creates variable bindings
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,  // Processes bindings
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  // ============================================================================
  // ARRAY TRANSFORMATION FUNCTIONS
  // ============================================================================
  
  {
    name: 'MAP',
    handler: FunctionalFunctions.MAP,
    category: FunctionCategory.LAMBDA,
    minArgs: 2,
    maxArgs: 2,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,  // Applies lambda to each element
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'REDUCE',
    handler: FunctionalFunctions.REDUCE,
    category: FunctionCategory.LAMBDA,
    minArgs: 3,
    maxArgs: 3,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,  // Reduces array to single value
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'SCAN',
    handler: FunctionalFunctions.SCAN,
    category: FunctionCategory.LAMBDA,
    minArgs: 3,
    maxArgs: 3,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,  // Running accumulation
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'BYROW',
    handler: FunctionalFunctions.BYROW,
    category: FunctionCategory.LAMBDA,
    minArgs: 2,
    maxArgs: 2,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,  // Applies to each row
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'BYCOL',
    handler: FunctionalFunctions.BYCOL,
    category: FunctionCategory.LAMBDA,
    minArgs: 2,
    maxArgs: 2,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,  // Applies to each column
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
  
  {
    name: 'MAKEARRAY',
    handler: FunctionalFunctions.MAKEARRAY,
    category: FunctionCategory.LAMBDA,
    minArgs: 3,
    maxArgs: 3,
    isSpecial: false,
    needsContext: false,
    volatile: false,
    complexityClass: ComplexityClass.O_N,  // Creates array using lambda
    precisionClass: PrecisionClass.EXACT,
    errorStrategy: ErrorStrategy.PROPAGATE_FIRST,
    iterationPolicy: null,
  },
];
