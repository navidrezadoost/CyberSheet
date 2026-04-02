/**
 * PivotCalculatedFields.ts
 * 
 * Phase 33: Post-Aggregation Calculated Fields
 * Formula-based calculated fields evaluated AFTER aggregation (not per-row)
 * 
 * Design Principles:
 * - Pure functions of aggregated values
 * - Deterministic evaluation order (topological sort)
 * - Error isolation (one failing field doesn't poison others)
 * - No external state (no cell references, no async)
 * 
 * Critical Distinction from Phase 27:
 * ❌ Phase 27: per-row compute functions (compute(row) → value)
 * ✅ Phase 33: post-aggregation formulas (Revenue - Cost)
 * 
 * Invariant:
 * "Calculated fields are pure functions of aggregated values within a pivot cell"
 */

import type { FormulaEngine } from './FormulaEngine';
import type { FormulaValue } from './types/formula-types';

/**
 * Phase 33: Calculated field definition
 * Stores formula as string (parsed at build time)
 */
export interface CalculatedField {
  readonly name: string;    // Unique within pivot (e.g., "Profit")
  readonly formula: string; // Excel formula without '=' prefix (e.g., "Revenue - Cost")
}

/**
 * Compiled calculated field with resolved dependencies
 * Internal representation after parsing
 */
export interface CompiledCalculatedField {
  readonly name: string;
  readonly formula: string;
  readonly dependsOn: string[]; // Field names referenced in formula
}

/**
 * Evaluation context for a single pivot cell
 * Maps field names to their aggregated values
 * 
 * Phase 33b: Can contain Error objects (for error propagation)
 */
export type PivotEvalContext = Record<string, number | null | Error>;

/**
 * Calculated field evaluation result
 * Can be a number, null (for empty aggregations), or an error
 * 
 * Semantic Rules:
 * - Math error (div/0) → Error('#DIV/0!')
 * - Invalid formula → Error('#VALUE!')
 * - Missing field ref → Error('#REF!')
 * - Missing data → null
 * - Valid computation → number
 */
export type CalculatedFieldResult = number | null | Error;

/**
 * Phase 33: Calculated field compiler and evaluator
 * 
 * Responsibilities:
 * 1. Parse formulas and extract dependencies
 * 2. Topologically sort fields (detect circular dependencies)
 * 3. Evaluate fields in correct order with isolated context
 * 4. Map errors to Excel-compatible codes
 */
export class PivotCalculatedFieldEngine {
  private formulaEngine: FormulaEngine;
  
  // Phase 33b: Build-scoped cache (cleared per pivot rebuild)
  private cache = new Map<string, CalculatedFieldResult>();

  constructor(formulaEngine: FormulaEngine) {
    this.formulaEngine = formulaEngine;
  }
  
  /**
   * Clear cache (called at start of each pivot build)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Compile calculated fields: parse formulas and extract dependencies.
   * Throws if any formula is invalid.
   */
  compile(fields: CalculatedField[]): CompiledCalculatedField[] {
    return fields.map(field => ({
      name: field.name,
      formula: field.formula,
      dependsOn: this.extractDependencies(field.formula)
    }));
  }

  /**
   * Extract field names referenced in formula.
   * 
   * Example: "Revenue - Cost" → ["Revenue", "Cost"]
   * 
   * Implementation: Parse formula and collect all identifier references
   * that could be field names.
   */
  private extractDependencies(formula: string): string[] {
    // Simple implementation: extract all identifiers that look like field names
    // (not cell references like A1, not function names)
    
    const deps = new Set<string>();
    
    // Match identifiers: sequences of letters/underscores/numbers starting with letter
    // Exclude cell references (letter followed by number like "A1")
    const identifierRegex = /\b([A-Z_][A-Z0-9_]*)\b/gi;
    
    let match;
    while ((match = identifierRegex.exec(formula)) !== null) {
      const identifier = match[1];
      
      // Exclude Excel functions (they're uppercase and common)
      const commonFunctions = new Set([
        'SUM', 'AVERAGE', 'COUNT', 'MIN', 'MAX', 'IF', 'AND', 'OR', 'NOT',
        'ABS', 'ROUND', 'SQRT', 'POW', 'LOG', 'EXP', 'SIN', 'COS', 'TAN'
      ]);
      
      if (!commonFunctions.has(identifier.toUpperCase())) {
        deps.add(identifier);
      }
    }
    
    return Array.from(deps);
  }

  /**
   * Topologically sort calculated fields.
   * Ensures fields are evaluated in dependency order.
   * 
   * Throws: PivotCalculatedFieldError if circular dependency detected
   */
  topologicalSort(fields: CompiledCalculatedField[]): CompiledCalculatedField[] {
    const sorted: CompiledCalculatedField[] = [];
    const visited = new Set<string>();
    const inProgress = new Set<string>();
    const fieldMap = new Map(fields.map(f => [f.name, f]));

    const visit = (fieldName: string): void => {
      if (visited.has(fieldName)) return;
      
      if (inProgress.has(fieldName)) {
        throw new PivotCalculatedFieldError(
          'CIRCULAR_DEP',
          `Circular dependency detected involving field: ${fieldName}`
        );
      }

      const field = fieldMap.get(fieldName);
      if (!field) {
        // Field is a base aggregated field (not a calculated field), skip
        return;
      }

      inProgress.add(fieldName);

      // Visit dependencies first
      for (const dep of field.dependsOn) {
        visit(dep);
      }

      inProgress.delete(fieldName);
      visited.add(fieldName);
      sorted.push(field);
    };

    // Visit all fields
    for (const field of fields) {
      visit(field.name);
    }

    return sorted;
  }

  /**
   * Phase 33b: Create stable cache key from field name and context
   */
  private makeCacheKey(fieldName: string, context: PivotEvalContext): string {
    // Stable stringify: sort keys for deterministic output
    const keys = Object.keys(context).sort();
    const parts = keys.map(k => `${k}:${context[k]}`);
    return `${fieldName}|${parts.join(',')}`;
  }
  
  /**
   * Evaluate a calculated field using the given context.
   * 
   * Phase 33b: Cached, error-preserving evaluation
   * 
   * Context must contain all aggregated values and previously evaluated
   * calculated fields.
   * 
   * @param field - Compiled field to evaluate
   * @param context - Map of field names to values
   * @returns Result (number, null, or error)
   */
  evaluate(field: CompiledCalculatedField, context: PivotEvalContext): CalculatedFieldResult {
    // Phase 33b: Check cache first
    const cacheKey = this.makeCacheKey(field.name, context);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    try {
      // Validate dependencies exist in context
      for (const dep of field.dependsOn) {
        if (!(dep in context)) {
          const error = new Error('#REF!'); // Missing field
          this.cache.set(cacheKey, error);
          return error;
        }
      }

      // Build formula context for evaluation
      // Create a minimal worksheet-like object that provides field values
      const formulaContext = {
        worksheet: this.createContextWorksheet(context),
        currentCell: { row: 1, col: 1 } // Dummy cell (not used)
      };

      // Evaluate formula
      const result = this.formulaEngine.evaluate(field.formula, formulaContext);

      // Handle result types
      if (result instanceof Error) {
        // Phase 33b: Preserve error (don't convert to null)
        this.cache.set(cacheKey, result);
        return result; // Propagate Excel errors (#DIV/0!, #VALUE!, etc.)
      }

      if (typeof result === 'number') {
        // Check for invalid numbers
        if (!isFinite(result) || isNaN(result)) {
          this.cache.set(cacheKey, null);
          return null; // Treat as null
        }
        this.cache.set(cacheKey, result);
        return result;
      }

      if (result === null || result === undefined) {
        this.cache.set(cacheKey, null);
        return null;
      }

      // Convert other types to null (e.g., strings, booleans)
      this.cache.set(cacheKey, null);
      return null;

    } catch (error) {
      // Catch any evaluation errors and return #VALUE!
      const valueError = new Error('#VALUE!');
      this.cache.set(cacheKey, valueError);
      return valueError;
    }
  }

  /**
   * Create a minimal worksheet-like object for formula evaluation.
   * Maps field names to cell values.
   */
  private createContextWorksheet(context: PivotEvalContext): any {
    // Create a fake worksheet that resolves field names to values
    const getCellValue = (addr: any) => {
      // If addr is a string (field name), return from context
      if (typeof addr === 'string') {
        return context[addr] ?? null;
      }
      
      // Otherwise treat as null (no actual cell references allowed)
      return null;
    };
    
    return {
      getCellValue,
      getCell: (addr: any) => {
        const value = getCellValue(addr);
        return value !== null ? { value } : undefined;
      },
      name: 'PivotContext' // Dummy sheet name
    };
  }

  /**
   * Evaluate all calculated fields for a single pivot cell.
   * 
   * Phase 33b: Error-preserving evaluation
   * - Errors are stored AS-IS (not converted to null)
   * - Error propagation happens automatically via FormulaEngine
   * - Isolation: one field's error doesn't prevent others from evaluating
   * 
   * @param fields - Topologically sorted fields
   * @param baseContext - Initial context with aggregated values
   * @returns Extended context with calculated field results (may include Error objects)
   */
  evaluateAll(
    fields: CompiledCalculatedField[],
    baseContext: PivotEvalContext
  ): Record<string, number | null | Error> {
    const context: Record<string, number | null | Error> = { ...baseContext };

    for (const field of fields) {
      const result = this.evaluate(field, context);
      
      // Phase 33b: Store result as-is (preserve errors)
      // FormulaEngine will propagate errors through dependent calculations
      context[field.name] = result;
    }

    return context;
  }
}

/**
 * Phase 33: Calculated field error class
 */
export class PivotCalculatedFieldError extends Error {
  constructor(
    public readonly code: 'CIRCULAR_DEP' | 'INVALID_FORMULA' | 'MISSING_FIELD',
    message: string
  ) {
    super(message);
    this.name = 'PivotCalculatedFieldError';
  }
}
