/**
 * metadata-api.ts
 * 
 * Wave 0 Day 3: Performance Introspection API
 * 
 * PURPOSE:
 * Provide runtime API to query function metadata for:
 * - Performance profiling (identify expensive functions)
 * - Optimization decisions (should we cache this result?)
 * - Documentation generation (explain performance characteristics)
 * - Developer tooling (show complexity warnings in IDE)
 * 
 * API SURFACE:
 * - getFunctionMetadata(name): Get complete metadata for a function
 * - getExpensiveFunctions(): List functions by cost (O_N2, O_NLogN, etc.)
 * - getVolatileFunctions(): List all volatile functions
 * - getIterativeFunctions(): List all iterative functions
 * - getContextAwareFunctions(): List all context-aware functions
 * 
 * USAGE:
 * ```typescript
 * import { getFunctionMetadata, getExpensiveFunctions } from '@cyber-sheet/core';
 * 
 * // Get metadata for a specific function
 * const sumMeta = getFunctionMetadata('SUM');
 * console.log(`SUM complexity: ${sumMeta.complexityClass}`);
 * console.log(`SUM skips errors: ${sumMeta.errorStrategy === ErrorStrategy.SKIP_ERRORS}`);
 * 
 * // Get all O(N^2) functions
 * const expensiveFuncs = getExpensiveFunctions(ComplexityClass.O_N2);
 * console.log(`Expensive functions: ${expensiveFuncs.map(f => f.name).join(', ')}`);
 * ```
 */

import { StrictFunctionMetadata, ComplexityClass, PrecisionClass, ErrorStrategy, FunctionCategory } from './types/formula-types';

// Import all metadata exports
import { MATH_METADATA } from './functions/metadata/math-metadata';
import { FINANCIAL_METADATA } from './functions/metadata/financial-metadata';
import { LOGICAL_METADATA } from './functions/metadata/logical-metadata';
import { DATETIME_METADATA } from './functions/metadata/datetime-metadata';
import { LOOKUP_METADATA } from './functions/metadata/lookup-metadata';
import { TEXT_METADATA } from './functions/metadata/text-metadata';
import { ARRAY_METADATA } from './functions/metadata/array-metadata';
import { INFORMATION_METADATA } from './functions/metadata/information-metadata';
import { STATISTICAL_METADATA } from './functions/metadata/statistical-metadata';

/**
 * ALL_METADATA: Complete registry of all function metadata
 * 
 * This array contains metadata for all 279 functions across 9 categories.
 * Used as the source of truth for metadata queries.
 */
export const ALL_METADATA: StrictFunctionMetadata[] = [
  ...MATH_METADATA,
  ...FINANCIAL_METADATA,
  ...LOGICAL_METADATA,
  ...DATETIME_METADATA,
  ...LOOKUP_METADATA,
  ...TEXT_METADATA,
  ...ARRAY_METADATA,
  ...INFORMATION_METADATA,
  ...STATISTICAL_METADATA,
];

/**
 * Metadata lookup cache for fast O(1) queries
 * Initialized lazily on first query
 */
let metadataCache: Map<string, StrictFunctionMetadata> | null = null;

/**
 * Initialize metadata cache for fast lookups
 * @private
 */
function initializeCache(): void {
  if (metadataCache !== null) return;
  
  metadataCache = new Map();
  for (const meta of ALL_METADATA) {
    metadataCache.set(meta.name.toUpperCase(), meta);
  }
}

/**
 * Get metadata for a specific function by name
 * 
 * @param name - Function name (case-insensitive)
 * @returns Function metadata or undefined if not found
 * 
 * @example
 * ```typescript
 * const sumMeta = getFunctionMetadata('SUM');
 * if (sumMeta) {
 *   console.log(`Complexity: ${sumMeta.complexityClass}`);
 *   console.log(`Precision: ${sumMeta.precisionClass}`);
 *   console.log(`Volatile: ${sumMeta.volatile}`);
 * }
 * ```
 */
export function getFunctionMetadata(name: string): StrictFunctionMetadata | undefined {
  initializeCache();
  return metadataCache!.get(name.toUpperCase());
}

/**
 * Get all functions with a specific complexity class
 * 
 * @param complexity - Complexity class to filter by
 * @returns Array of function metadata matching the complexity class
 * 
 * @example
 * ```typescript
 * // Get all O(N^2) functions
 * const expensive = getExpensiveFunctions(ComplexityClass.O_N2);
 * console.log(`Found ${expensive.length} expensive functions`);
 * expensive.forEach(f => console.log(`- ${f.name}: ${f.complexityClass}`));
 * ```
 */
export function getExpensiveFunctions(complexity: ComplexityClass): StrictFunctionMetadata[] {
  return ALL_METADATA.filter(meta => meta.complexityClass === complexity);
}

/**
 * Get all functions by complexity class (sorted from cheapest to most expensive)
 * 
 * @returns Object mapping complexity classes to function arrays
 * 
 * @example
 * ```typescript
 * const byComplexity = getFunctionsByComplexity();
 * console.log(`O(1) functions: ${byComplexity[ComplexityClass.O_1].length}`);
 * console.log(`O(N) functions: ${byComplexity[ComplexityClass.O_N].length}`);
 * console.log(`O(N^2) functions: ${byComplexity[ComplexityClass.O_N2].length}`);
 * ```
 */
export function getFunctionsByComplexity(): Record<ComplexityClass, StrictFunctionMetadata[]> {
  const result: Record<ComplexityClass, StrictFunctionMetadata[]> = {
    [ComplexityClass.O_1]: [],
    [ComplexityClass.O_N]: [],
    [ComplexityClass.O_N_LOG_N]: [],
    [ComplexityClass.O_N2]: [],
    [ComplexityClass.ITERATIVE]: [],
  };

  for (const meta of ALL_METADATA) {
    result[meta.complexityClass].push(meta);
  }

  return result;
}

/**
 * Get all volatile functions (functions that return different values each call)
 * 
 * @returns Array of volatile function metadata
 * 
 * @example
 * ```typescript
 * const volatileFuncs = getVolatileFunctions();
 * console.log('Volatile functions (recalculate every time):');
 * volatileFuncs.forEach(f => console.log(`- ${f.name}`));
 * // Output: NOW, TODAY, RAND, RANDBETWEEN, RANDARRAY
 * ```
 */
export function getVolatileFunctions(): StrictFunctionMetadata[] {
  return ALL_METADATA.filter(meta => meta.volatile === true);
}

/**
 * Get all iterative functions (functions that use iterative algorithms)
 * 
 * @returns Array of iterative function metadata
 * 
 * @example
 * ```typescript
 * const iterativeFuncs = getIterativeFunctions();
 * console.log('Iterative functions (may have convergence issues):');
 * iterativeFuncs.forEach(f => console.log(`- ${f.name}: ${f.iterationPolicy}`));
 * ```
 */
export function getIterativeFunctions(): StrictFunctionMetadata[] {
  return ALL_METADATA.filter(meta => meta.iterationPolicy !== null);
}

/**
 * Get all context-aware functions (functions that need worksheet context)
 * 
 * @returns Array of context-aware function metadata
 * 
 * @example
 * ```typescript
 * const contextFuncs = getContextAwareFunctions();
 * console.log('Context-aware functions (need worksheet context):');
 * contextFuncs.forEach(f => console.log(`- ${f.name}`));
 * // Output: ROW, COLUMN, INDIRECT, CELL, OFFSET
 * ```
 */
export function getContextAwareFunctions(): StrictFunctionMetadata[] {
  return ALL_METADATA.filter(meta => meta.needsContext === true);
}

/**
 * Get all functions with a specific error strategy
 * 
 * @param strategy - Error strategy to filter by
 * @returns Array of function metadata with the specified error strategy
 * 
 * @example
 * ```typescript
 * // Get all functions that skip errors
 * const skipErrors = getFunctionsByErrorStrategy(ErrorStrategy.SKIP_ERRORS);
 * console.log('Functions that skip errors in aggregations:');
 * skipErrors.forEach(f => console.log(`- ${f.name}`));
 * // Output: SUM, AVERAGE, MIN, MAX, COUNT, etc.
 * ```
 */
export function getFunctionsByErrorStrategy(strategy: ErrorStrategy): StrictFunctionMetadata[] {
  return ALL_METADATA.filter(meta => meta.errorStrategy === strategy);
}

/**
 * Get all functions in a specific category
 * 
 * @param category - Function category to filter by
 * @returns Array of function metadata in the specified category
 * 
 * @example
 * ```typescript
 * const mathFuncs = getFunctionsByCategory('MATH');
 * console.log(`Found ${mathFuncs.length} math functions`);
 * ```
 */
export function getFunctionsByCategory(category: FunctionCategory): StrictFunctionMetadata[] {
  return ALL_METADATA.filter(meta => meta.category === category);
}

/**
 * Get metadata statistics summary
 * 
 * @returns Object with metadata statistics
 * 
 * @example
 * ```typescript
 * const stats = getMetadataStats();
 * console.log(`Total functions: ${stats.totalFunctions}`);
 * console.log(`Volatile: ${stats.volatileCount}`);
 * console.log(`Iterative: ${stats.iterativeCount}`);
 * console.log(`Context-aware: ${stats.contextAwareCount}`);
 * console.log(`Special: ${stats.specialCount}`);
 * ```
 */
export function getMetadataStats() {
  return {
    totalFunctions: ALL_METADATA.length,
    volatileCount: getVolatileFunctions().length,
    iterativeCount: getIterativeFunctions().length,
    contextAwareCount: getContextAwareFunctions().length,
    specialCount: ALL_METADATA.filter(m => m.isSpecial).length,
    byCategory: {
      MATH: getFunctionsByCategory(FunctionCategory.MATH).length,
      FINANCIAL: getFunctionsByCategory(FunctionCategory.FINANCIAL).length,
      LOGICAL: getFunctionsByCategory(FunctionCategory.LOGICAL).length,
      DATE_TIME: getFunctionsByCategory(FunctionCategory.DATE_TIME).length,
      LOOKUP: getFunctionsByCategory(FunctionCategory.LOOKUP).length,
      TEXT: getFunctionsByCategory(FunctionCategory.TEXT).length,
      ARRAY: getFunctionsByCategory(FunctionCategory.ARRAY).length,
      INFORMATION: getFunctionsByCategory(FunctionCategory.INFORMATION).length,
      STATISTICAL: getFunctionsByCategory(FunctionCategory.STATISTICAL).length,
    },
    byComplexity: {
      O_1: getExpensiveFunctions(ComplexityClass.O_1).length,
      O_N: getExpensiveFunctions(ComplexityClass.O_N).length,
      O_N_LOG_N: getExpensiveFunctions(ComplexityClass.O_N_LOG_N).length,
      O_N2: getExpensiveFunctions(ComplexityClass.O_N2).length,
      ITERATIVE: getExpensiveFunctions(ComplexityClass.ITERATIVE).length,
    },
    byErrorStrategy: {
      SKIP_ERRORS: getFunctionsByErrorStrategy(ErrorStrategy.SKIP_ERRORS).length,
      LAZY_EVALUATION: getFunctionsByErrorStrategy(ErrorStrategy.LAZY_EVALUATION).length,
      SHORT_CIRCUIT: getFunctionsByErrorStrategy(ErrorStrategy.SHORT_CIRCUIT).length,
      LOOKUP_STRICT: getFunctionsByErrorStrategy(ErrorStrategy.LOOKUP_STRICT).length,
      FINANCIAL_STRICT: getFunctionsByErrorStrategy(ErrorStrategy.FINANCIAL_STRICT).length,
      PROPAGATE_FIRST: getFunctionsByErrorStrategy(ErrorStrategy.PROPAGATE_FIRST).length,
    },
  };
}

/**
 * Estimate relative cost of a function call
 * 
 * Returns a numeric cost estimate based on complexity class:
 * - O(1): 1
 * - O(log N): 5
 * - O(N): 10
 * - O(N log N): 50
 * - O(N^2): 100
 * - O(N^3): 1000
 * 
 * @param functionName - Name of the function
 * @returns Estimated cost (1-1000) or undefined if function not found
 * 
 * @example
 * ```typescript
 * const sumCost = estimateFunctionCost('SUM');  // 10 (O(N))
 * const sortCost = estimateFunctionCost('SORT');  // 50 (O(N log N))
 * const mmultCost = estimateFunctionCost('MMULT');  // 1000 (O(N^3))
 * 
 * if (sumCost && sumCost > 50) {
 *   console.warn('Expensive function detected!');
 * }
 * ```
 */
export function estimateFunctionCost(functionName: string): number | undefined {
  const meta = getFunctionMetadata(functionName);
  if (!meta) return undefined;

  const costMap: Record<ComplexityClass, number> = {
    [ComplexityClass.O_1]: 1,
    [ComplexityClass.O_N]: 10,
    [ComplexityClass.O_N_LOG_N]: 50,
    [ComplexityClass.O_N2]: 100,
    [ComplexityClass.ITERATIVE]: 500,
  };

  return costMap[meta.complexityClass];
}
