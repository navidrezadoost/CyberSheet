/**
 * ErrorStrategyDispatcher.ts
 * 
 * Wave 0 Day 4 - Phase 1: Dispatcher Shell
 * 
 * Orthogonal error handling layer - routes function execution through
 * strategy-specific wrappers based on StrictFunctionMetadata.
 * 
 * CRITICAL DESIGN PRINCIPLES:
 * 1. Functions remain pure (no error logic in 279 implementations)
 * 2. Error behavior injected externally via dispatcher
 * 3. Metadata drives routing (errorStrategy field)
 * 4. All wrappers are pass-through until Phase 2
 * 
 * Architecture:
 *   Function Logic → Dispatcher → Execution Context → Metadata Contract
 */

import type { FormulaValue, FormulaContext, ErrorStrategy, StrictFunctionMetadata } from './types/formula-types';

/**
 * ErrorStrategyDispatcher
 * 
 * Routes function execution through strategy-specific wrappers.
 * 
 * Phase 1 (current): All wrappers are pass-through (structural verification only)
 * Phase 2 (next): Implement wrappers sequentially (SHORT_CIRCUIT → ... → LAZY_EVALUATION)
 * Phase 3 (future): System integration (volatile, iterative, context-aware)
 */
export class ErrorStrategyDispatcher {
  /**
   * Dispatch function execution through strategy-specific wrapper
   * 
   * @param strategy - ErrorStrategy from metadata (determines wrapper)
   * @param args - Raw arguments (not yet evaluated for lazy strategies)
   * @param handler - Pure function implementation (no error logic)
   * @param context - Execution context (worksheet, current cell, etc.)
   * @param metadata - Complete function metadata (for future use in Phase 3)
   * @returns Result from handler (wrapped by strategy)
   * 
   * PHASE 1 STATUS: All wrappers are pass-through (baseline verification)
   */
  dispatch<T extends FormulaValue>(
    strategy: ErrorStrategy,
    args: unknown[],
    handler: (...args: unknown[]) => T,
    context: FormulaContext,
    metadata: StrictFunctionMetadata
  ): T {
    // Temporary instrumentation for Phase 1 verification (commented out for TypeScript compatibility)
    // if (typeof process !== 'undefined' && process.env?.DEBUG_ERROR_DISPATCH === 'true') {
    //   console.debug(`[Dispatcher] ${metadata.name} → ${strategy}`);
    // }

    // Route to strategy-specific wrapper
    switch (strategy) {
      case 'skip-errors':
        return this.skipErrorsWrapper(args, handler, context, metadata);
      
      case 'lazy':
        return this.lazyEvaluationWrapper(args, handler, context, metadata);
      
      case 'short-circuit':
        return this.shortCircuitWrapper(args, handler, context, metadata);
      
      case 'lookup-strict':
        return this.lookupStrictWrapper(args, handler, context, metadata);
      
      case 'financial-strict':
        return this.financialStrictWrapper(args, handler, context, metadata);
      
      case 'propagate-first':
      default:
        // Standard propagation (no wrapper needed, direct invocation)
        return this.propagateFirstWrapper(args, handler, context, metadata);
    }
  }

  /**
   * SKIP_ERRORS wrapper (Phase 3: ACTIVE)
   * 
   * Target Functions: SUM, AVERAGE, COUNT, MIN, MAX, STDEV, VAR, etc. (68 functions)
   * Behavior: Filter errors, aggregate non-errors, return first error when all filtered
   * 
   * Design Rules:
   * - Iterate left → right, separate errors from non-errors
   * - Do NOT mutate original args array
   * - If non-errors exist: call handler with filtered args
   * - If ALL args are errors: return first error (except COUNT)
   * - COUNT special case: returns 0 when all errors (not error)
   * 
   * Examples:
   *   SUM(1, Error, 3) → 4
   *   SUM(Error1, Error2) → Error1
   *   COUNT(Error1, Error2) → 0
   */
  private skipErrorsWrapper<T extends FormulaValue>(
    args: unknown[],
    handler: (...args: unknown[]) => T,
    _context: FormulaContext,
    metadata: StrictFunctionMetadata
  ): T {
    // Special case: COUNT returns 0 when all errors (not error)
    const isCountFunction = metadata.name === 'COUNT';
    
    // Separate errors from non-errors (do NOT mutate original args)
    const errors: (Error | number)[] = [];
    const nonErrors: unknown[] = [];
    
    for (const arg of args) {
      // Treat errors, NaN, and Infinity as errors (Excel semantics)
      if (arg instanceof Error) {
        errors.push(arg);
      } else if (typeof arg === 'number' && (isNaN(arg) || !isFinite(arg))) {
        // NaN is produced by invalid arithmetic like 1/"text" → #VALUE!
        // Infinity is produced by division producing infinity → #DIV/0!
        // -Infinity also treated as #DIV/0!
        const error = isNaN(arg) ? new Error('#VALUE!') : new Error('#DIV/0!');
        errors.push(error);
      } else {
        nonErrors.push(arg);
      }
    }
    
    // If ALL args are errors (or NaN/Infinity)
    if (nonErrors.length === 0) {
      if (isCountFunction) {
        return 0 as T; // COUNT special case: COUNT(errors) = 0
      }
      // If there are actual errors, return first error (left-to-right)
      if (errors.length > 0) {
        return errors[0] as T;
      }
      // If there are NO args at all (empty call), let handler decide
      // This allows functions like AVERAGEA() and MEDIAN() to return their appropriate errors
      return handler(...nonErrors);
    }
    
    // Aggregate non-error values
    return handler(...nonErrors);
  }

  /**
   * LAZY_EVALUATION wrapper (Phase 6: ACTIVE)
   * 
   * Target Functions: IF, IFS, SWITCH, IFERROR, IFNA, NOT, XOR, AND, OR (9 functions)
   * Behavior: Convert eager args to thunks, handlers evaluate conditionally
   * 
   * Design Rules:
   * - Wrap each arg in zero-arg function (thunk): `() => arg`
   * - Handlers are thunk-aware (Phase 6 Step 0 refactoring)
   * - Handlers evaluate thunks selectively (lazy evaluation)
   * - IF: evaluates condition, then only chosen branch
   * - IFERROR/IFNA: evaluates value, then fallback only on error
   * - IFS/SWITCH: short-circuit on first match
   * - NOT/XOR: evaluate all thunks (NOT: 1 arg, XOR: needs all values)
   * - AND/OR: early exit (handled by SHORT_CIRCUIT wrapper, but handlers thunk-aware)
   * 
   * Thunk Contract:
   * - Thunk = `() => FormulaValue` (zero-arg function)
   * - Handlers check `typeof arg === 'function'` before invoking
   * - Backward compatible: handlers accept both thunks and raw values
   * 
   * Examples:
   *   IF(FALSE, 1/0, "safe") → "safe" (1/0 never evaluated)
   *   IFERROR("valid", 1/0) → "valid" (fallback never evaluated)
   *   IFS(TRUE, "first", ERROR(), "second") → "first" (ERROR() never evaluated)
   */
  private lazyEvaluationWrapper<T extends FormulaValue>(
    args: unknown[],
    handler: (...args: unknown[]) => T,
    _context: FormulaContext,
    metadata: StrictFunctionMetadata
  ): T {
    // Convert eager arguments to thunks (zero-arg functions)
    // This delays evaluation until handlers explicitly invoke them
    const thunks = args.map((arg) => {
      // Wrap each argument in a zero-arg function
      // Handlers will call these thunks selectively based on lazy evaluation logic
      return () => arg as FormulaValue;
    });

    // Call handler with thunks
    // Handlers (refactored in Phase 6 Step 0) are thunk-aware and evaluate selectively
    return handler(...thunks);
  }

  /**
   * SHORT_CIRCUIT wrapper (Phase 2: ACTIVE)
   * 
   * Target Functions: AND, OR (2 functions)
   * Behavior: Early exit on first determinant (false for AND, true for OR)
   * 
   * Design Rules:
   * - Args already evaluated (no lazy execution yet)
   * - Iterate left → right (argument order matters)
   * - Return early when outcome is determined
   * - Errors propagate if encountered before determinant
   * 
   * Examples:
   *   AND(TRUE, FALSE, Error) → FALSE
   *   AND(TRUE, Error, FALSE) → Error (reached before FALSE)
   *   OR(TRUE, Error) → TRUE
   *   OR(FALSE, Error) → Error (reached before TRUE)
   */
  private shortCircuitWrapper<T extends FormulaValue>(
    args: unknown[],
    handler: (...args: unknown[]) => T,
    _context: FormulaContext,
    metadata: StrictFunctionMetadata
  ): T {
    const functionName = metadata.name;

    // AND: Return false on first false, error if no false encountered
    if (functionName === 'AND') {
      for (const arg of args) {
        if (arg instanceof Error) return arg as T;
        if (arg === false) return false as T;
      }
      // All true (or coercible to true)
      return true as T;
    }

    // OR: Return true on first true, error if no true encountered
    if (functionName === 'OR') {
      for (const arg of args) {
        if (arg instanceof Error) return arg as T;
        if (arg === true) return true as T;
      }
      // All false (or coercible to false)
      return false as T;
    }

    // Not AND/OR - should not reach here, but safety fallback
    return handler(...args);
  }

  /**
   * LOOKUP_STRICT wrapper (Phase 1: pass-through)
   * 
   * Target Functions: VLOOKUP, HLOOKUP, MATCH, XLOOKUP, INDEX, XMATCH, LOOKUP (7 functions)
   * Phase 2 Behavior: Special #N/A handling (semantic "not found" vs error)
   * Current Behavior: Pass-through (structural verification only)
   */
  /**
   * LOOKUP_STRICT wrapper (Phase 5: ACTIVE)
   * 
   * Target Functions: VLOOKUP, HLOOKUP, XLOOKUP, LOOKUP, INDEX, MATCH, XMATCH (7 functions)
   * Behavior: Semantic error handling + range validation
   * 
   * Design Principles:
   * 1. #N/A is VALID RESULT (not an error) - pass through
   * 2. Range arguments must be arrays (reject scalars)
   * 3. Index arguments must be positive numbers
   * 4. #REF! for structural errors (invalid range, out of bounds)
   * 5. #VALUE! for type errors (non-numeric index)
   * 
   * Critical Insight:
   * #N/A means "value not found" - it's DATA, not FAILURE
   * IFERROR(VLOOKUP(...), "default") depends on #N/A propagating
   * 
   * Philosophy: Enforce structural integrity, trust handler semantics
   * 
   * Examples:
   *   VLOOKUP("missing", A1:B10, 2, FALSE) → #N/A (valid result)
   *   VLOOKUP("key", 123, 2, FALSE) → #REF! (scalar range invalid)
   *   VLOOKUP("key", A1:B10, 5, FALSE) → #REF! (column 5 out of bounds)
   *   INDEX(A1:B10, -1, 2) → #REF! (negative index invalid)
   */
  private lookupStrictWrapper<T extends FormulaValue>(
    args: unknown[],
    handler: (...args: unknown[]) => T,
    _context: FormulaContext,
    metadata: StrictFunctionMetadata
  ): T {
    // 1. Propagate non-#N/A errors immediately
    // #N/A has special semantic meaning in lookup context - must pass through
    for (const arg of args) {
      if (arg instanceof Error) {
        // #N/A in arguments is unusual but valid (e.g., nested lookup)
        // Pass through - let handler decide if it's acceptable
        if (arg.message === '#N/A') {
          continue; // Don't propagate #N/A here - might be valid in context
        }
        // All other errors (#VALUE!, #REF!, #DIV/0!, etc.) propagate immediately
        return arg as T;
      }
    }
    
    // 2. Validate range arguments (function-specific)
    // VLOOKUP/HLOOKUP/XLOOKUP: args[1] is table_array
    // LOOKUP: args[0] or args[1] depending on signature
    // INDEX: args[0] is array
    // MATCH/XMATCH: args[1] is lookup_array
    
    const funcName = metadata.name;
    
    // Range validation for VLOOKUP, HLOOKUP, XLOOKUP
    if (funcName === 'VLOOKUP' || funcName === 'HLOOKUP' || funcName === 'XLOOKUP') {
      const table_array = args[1];
      
      // Must be array (2D) - reject scalars, null, undefined
      if (!Array.isArray(table_array)) {
        // Check if it's a range reference object (engine-specific structure)
        // Range references might be objects with special structure, not plain arrays
        if (table_array === null || table_array === undefined) {
          return new Error('#REF!') as T;
        }
        // If it's an object, check if it's a valid range reference
        // For now, accept objects (assuming range references), reject primitives
        if (typeof table_array !== 'object') {
          return new Error('#REF!') as T; // Scalar (number, string, boolean) invalid
        }
      }
      
      // If array, validate it's not empty (empty array = invalid range)
      if (Array.isArray(table_array) && table_array.length === 0) {
        return new Error('#REF!') as T;
      }
    }
    
    // Range validation for INDEX
    if (funcName === 'INDEX') {
      const array = args[0];
      
      if (!Array.isArray(array)) {
        if (array === null || array === undefined) {
          return new Error('#REF!') as T;
        }
        if (typeof array !== 'object') {
          return new Error('#REF!') as T;
        }
      }
      
      if (Array.isArray(array) && array.length === 0) {
        return new Error('#REF!') as T;
      }
    }
    
    // Range validation for MATCH, XMATCH
    if (funcName === 'MATCH' || funcName === 'XMATCH') {
      const lookup_array = args[1];
      
      if (!Array.isArray(lookup_array)) {
        if (lookup_array === null || lookup_array === undefined) {
          return new Error('#REF!') as T;
        }
        if (typeof lookup_array !== 'object') {
          return new Error('#REF!') as T;
        }
      }
      
      if (Array.isArray(lookup_array) && lookup_array.length === 0) {
        return new Error('#REF!') as T;
      }
    }
    
    // 3. Validate index arguments (function-specific)
    // VLOOKUP: args[2] is col_index_num
    // HLOOKUP: args[2] is row_index_num
    // INDEX: args[1] is row_num, args[2] is column_num (optional)
    
    if (funcName === 'VLOOKUP') {
      let col_index_num = args[2];
      
      // Coerce numeric strings (follow FINANCIAL_STRICT precedent)
      if (typeof col_index_num === 'string') {
        const trimmed = col_index_num.trim();
        if (trimmed === '') {
          return new Error('#VALUE!') as T; // Empty string invalid for index
        }
        const parsed = Number(trimmed);
        if (isNaN(parsed)) {
          return new Error('#VALUE!') as T; // Non-numeric string
        }
        col_index_num = parsed;
        args[2] = col_index_num; // Update args array
      }
      
      // Validate positive integer
      if (typeof col_index_num === 'number') {
        if (col_index_num <= 0) {
          return new Error('#REF!') as T; // Zero or negative index invalid
        }
        if (!isFinite(col_index_num)) {
          return new Error('#REF!') as T; // Infinity invalid
        }
      } else if (typeof col_index_num !== 'undefined') {
        // col_index_num is required, non-numeric type invalid
        return new Error('#VALUE!') as T;
      }
    }
    
    if (funcName === 'HLOOKUP') {
      let row_index_num = args[2];
      
      if (typeof row_index_num === 'string') {
        const trimmed = row_index_num.trim();
        if (trimmed === '') {
          return new Error('#VALUE!') as T;
        }
        const parsed = Number(trimmed);
        if (isNaN(parsed)) {
          return new Error('#VALUE!') as T;
        }
        row_index_num = parsed;
        args[2] = row_index_num;
      }
      
      if (typeof row_index_num === 'number') {
        if (row_index_num <= 0) {
          return new Error('#REF!') as T;
        }
        if (!isFinite(row_index_num)) {
          return new Error('#REF!') as T;
        }
      } else if (typeof row_index_num !== 'undefined') {
        return new Error('#VALUE!') as T;
      }
    }
    
    if (funcName === 'INDEX') {
      // INDEX(array, row_num, [column_num])
      // row_num is args[1], column_num is args[2] (optional)
      
      let row_num = args[1];
      if (typeof row_num === 'string') {
        const trimmed = row_num.trim();
        if (trimmed === '') {
          return new Error('#VALUE!') as T;
        }
        const parsed = Number(trimmed);
        if (isNaN(parsed)) {
          return new Error('#VALUE!') as T;
        }
        row_num = parsed;
        args[1] = row_num;
      }
      
      // INDEX allows 0 for row_num (returns entire column)
      // So only check for negative and non-finite
      if (typeof row_num === 'number') {
        if (row_num < 0) {
          return new Error('#REF!') as T; // Negative invalid
        }
        if (!isFinite(row_num)) {
          return new Error('#REF!') as T;
        }
      } else if (typeof row_num !== 'undefined') {
        return new Error('#VALUE!') as T;
      }
      
      // column_num validation (optional)
      if (args.length > 2) {
        let column_num = args[2];
        if (typeof column_num === 'string') {
          const trimmed = column_num.trim();
          if (trimmed === '') {
            return new Error('#VALUE!') as T;
          }
          const parsed = Number(trimmed);
          if (isNaN(parsed)) {
            return new Error('#VALUE!') as T;
          }
          column_num = parsed;
          args[2] = column_num;
        }
        
        // INDEX allows 0 for column_num (returns entire row)
        if (typeof column_num === 'number') {
          if (column_num < 0) {
            return new Error('#REF!') as T;
          }
          if (!isFinite(column_num)) {
            return new Error('#REF!') as T;
          }
        } else if (typeof column_num !== 'undefined') {
          return new Error('#VALUE!') as T;
        }
      }
    }
    
    // 4. Validate match_type for MATCH (optional argument)
    if (funcName === 'MATCH' && args.length > 2) {
      let match_type = args[2];
      
      // Coerce numeric strings
      if (typeof match_type === 'string') {
        const trimmed = match_type.trim();
        if (trimmed === '') {
          match_type = 1; // Default match_type
          args[2] = match_type;
        } else {
          const parsed = Number(trimmed);
          if (isNaN(parsed)) {
            return new Error('#VALUE!') as T;
          }
          match_type = parsed;
          args[2] = match_type;
        }
      }
      
      // Validate match_type ∈ {-1, 0, 1}
      if (typeof match_type === 'number') {
        if (match_type !== -1 && match_type !== 0 && match_type !== 1) {
          return new Error('#VALUE!') as T; // Invalid match_type
        }
      } else if (typeof match_type !== 'undefined') {
        return new Error('#VALUE!') as T;
      }
    }
    
    // 5. Invoke handler with validated arguments
    const result = handler(...args);
    
    // 6. CRITICAL: Pass through #N/A as valid result
    // #N/A means "value not found" - it's semantic data, not a failure
    // Downstream functions (IFERROR, IFNA) depend on this
    if (result instanceof Error && result.message === '#N/A') {
      return result; // Pass through #N/A unchanged
    }
    
    // All other errors propagate normally
    return result;
  }

  /**
   * FINANCIAL_STRICT wrapper (Phase 4: ACTIVE)
   * 
   * Target Functions: NPV, IRR, PMT, PV, FV, RATE, NPER, etc. (19 functions)
   * Behavior: Strict numeric validation - NO silent coercion
   * 
   * Design Principles:
   * 1. No silent string→number coercion (reject non-numeric strings)
   * 2. No boolean coercion (reject TRUE/FALSE)
   * 3. No NaN leakage (convert to #VALUE!)
   * 4. No Infinity leakage (convert to #DIV/0!)
   * 5. Null/undefined → 0 (Excel compatibility)
   * 6. Fail loudly and deterministically
   * 
   * Philosophy: Financial math demands precision. No "best effort" conversions.
   * 
   * Examples:
   *   PV(0.05, 10, "100") → #VALUE! (not 100)
   *   IRR([NaN, 100, 200]) → #VALUE! (not silently filtered)
   *   PMT(1/0, 10, 1000) → #DIV/0! (not Infinity)
   */
  private financialStrictWrapper<T extends FormulaValue>(
    args: unknown[],
    handler: (...args: unknown[]) => T,
    _context: FormulaContext,
    _metadata: StrictFunctionMetadata
  ): T {
    // Validate each argument for strict numeric integrity
    const validatedArgs: unknown[] = [];
    
    for (const arg of args) {
      // 1. Errors propagate immediately
      if (arg instanceof Error) {
        return arg as T;
      }
      
      // 2. Numbers: Check for NaN/Infinity
      if (typeof arg === 'number') {
        if (isNaN(arg)) {
          return new Error('#VALUE!') as T; // NaN not allowed in financial math
        }
        if (!isFinite(arg)) {
          return new Error('#DIV/0!') as T; // Infinity not allowed in financial math
        }
        validatedArgs.push(arg);
        continue;
      }
      
      // 3. Null/undefined → 0 (Excel compatibility)
      if (arg === null || arg === undefined) {
        validatedArgs.push(0);
        continue;
      }
      
      // 4. Booleans: REJECT (no implicit TRUE→1, FALSE→0)
      if (typeof arg === 'boolean') {
        return new Error('#VALUE!') as T; // Financial functions don't accept booleans
      }
      
      // 5. Strings: REJECT (no silent coercion)
      if (typeof arg === 'string') {
        // Check if it's a numeric string
        const trimmed = arg.trim();
        if (trimmed === '') {
          validatedArgs.push(0); // Empty string → 0 (Excel compatibility)
          continue;
        }
        
        // Try parsing as number
        const num = Number(trimmed);
        if (isNaN(num)) {
          return new Error('#VALUE!') as T; // Non-numeric string rejected
        }
        if (!isFinite(num)) {
          return new Error('#DIV/0!') as T; // Infinity from parsing rejected
        }
        
        // Numeric string accepted (e.g., "123", "0.05")
        validatedArgs.push(num);
        continue;
      }
      
      // 6. Arrays/Objects: Pass through (handler will validate structure)
      validatedArgs.push(arg);
    }
    
    // All arguments validated - invoke handler
    const result = handler(...validatedArgs);
    
    // Post-process result: catch NaN/Infinity that escaped
    if (typeof result === 'number') {
      if (isNaN(result)) {
        return new Error('#VALUE!') as T;
      }
      if (!isFinite(result)) {
        return new Error('#DIV/0!') as T;
      }
    }
    
    return result;
  }

  /**
   * PROPAGATE_FIRST wrapper (Phase 1: pass-through)
   * 
   * Target Functions: Standard functions (93 functions)
   * Behavior: First error propagates immediately (no wrapper needed)
   * Current Behavior: Direct invocation (baseline)
   */
  private propagateFirstWrapper<T extends FormulaValue>(
    args: unknown[],
    handler: (...args: unknown[]) => T,
    _context: FormulaContext,
    _metadata: StrictFunctionMetadata
  ): T {
    // Standard propagation: no wrapper logic needed
    return handler(...args);
  }
}
