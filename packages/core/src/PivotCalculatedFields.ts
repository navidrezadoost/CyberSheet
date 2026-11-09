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
    this.assertValidUniqueFieldNames(fields);
    return fields.map(field => ({
      name: field.name,
      formula: field.formula,
      dependsOn: this.extractDependencies(field.formula)
    }));
  }

  private normalizeFieldName(name: string): string {
    // Calculated-field identifiers use the same ASCII, case-insensitive
    // namespace as FormulaEngine's explicit named bindings.
    return name.toUpperCase();
  }

  private compareFieldNames(left: string, right: string): number {
    const normalizedLeft = this.normalizeFieldName(left);
    const normalizedRight = this.normalizeFieldName(right);
    return normalizedLeft < normalizedRight ? -1 : normalizedLeft > normalizedRight ? 1 : 0;
  }

  private assertValidUniqueFieldNames(fields: readonly { name: string }[]): void {
    const names = new Set<string>();
    for (const field of fields) {
      if (
        !/^[A-Za-z_][A-Za-z0-9_]*$/.test(field.name) ||
        this.isCellReference(field.name) ||
        /^(TRUE|FALSE)$/i.test(field.name) ||
        this.formulaEngine.functions.has(field.name)
      ) {
        throw new PivotCalculatedFieldError(
          'INVALID_FORMULA',
          `Invalid or reserved calculated field name: ${field.name}`
        );
      }
      const normalized = this.normalizeFieldName(field.name);
      if (names.has(normalized)) {
        throw new PivotCalculatedFieldError(
          'INVALID_FORMULA',
          `Duplicate calculated field name: ${field.name}`
        );
      }
      names.add(normalized);
    }
  }

  private isCellReference(identifier: string): boolean {
    const match = /^([A-Z]{1,3})([1-9][0-9]{0,6})$/i.exec(identifier);
    if (!match) return false;
    const row = Number(match[2]);
    if (row > 1_048_576) return false;
    let column = 0;
    for (const character of match[1].toUpperCase()) {
      column = column * 26 + character.charCodeAt(0) - 64;
    }
    return column <= 16_384;
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
    
    const deps = new Map<string, string>();
    
    // Match identifiers: sequences of letters/underscores/numbers starting with letter
    // Exclude cell references (letter followed by number like "A1")
    const identifierRegex = /\b([A-Z_][A-Z0-9_]*)\b/gi;
    
    let match;
    while ((match = identifierRegex.exec(formula)) !== null) {
      const identifier = match[1];
      
      const next = formula.slice(identifierRegex.lastIndex);
      // A token followed by '(' is a function name. TRUE/FALSE are formula
      // literals, and valid A1 tokens are references rather than field names.
      if (
        /^\s*\(/.test(next) ||
        /^(TRUE|FALSE)$/i.test(identifier) ||
        this.isCellReference(identifier) ||
        /^\$[1-9][0-9]{0,6}(?![A-Z0-9_])/.test(next)
      ) continue;

      const normalized = this.normalizeFieldName(identifier);
      if (!deps.has(normalized)) deps.set(normalized, identifier);
    }
    
    // Keep the first authored spelling for source compatibility while all
    // matching and sorting use the normalized identifier.
    return Array.from(deps.values());
  }

  /**
   * Topologically sort calculated fields.
   * Ensures fields are evaluated in dependency order.
   * 
   * Throws: PivotCalculatedFieldError if circular dependency detected
   */
  topologicalSort(fields: CompiledCalculatedField[]): CompiledCalculatedField[] {
    this.assertValidUniqueFieldNames(fields);
    const sorted: CompiledCalculatedField[] = [];
    const visited = new Set<string>();
    const inProgress = new Set<string>();
    const fieldMap = new Map(fields.map(f => [this.normalizeFieldName(f.name), f]));

    const visit = (fieldName: string): void => {
      const normalizedName = this.normalizeFieldName(fieldName);
      if (visited.has(normalizedName)) return;
      
      if (inProgress.has(normalizedName)) {
        throw new PivotCalculatedFieldError(
          'CIRCULAR_DEP',
          `Circular dependency detected involving field: ${fieldName}`
        );
      }

      const field = fieldMap.get(normalizedName);
      if (!field) {
        // Field is a base aggregated field (not a calculated field), skip
        return;
      }

      inProgress.add(normalizedName);

      // Visit dependencies first
      for (const dep of field.dependsOn
        .slice()
        .sort((left, right) => this.compareFieldNames(left, right))) {
        visit(dep);
      }

      inProgress.delete(normalizedName);
      visited.add(normalizedName);
      sorted.push(field);
    };

    // Stable lexical root order means equivalent input permutations produce
    // the same valid topological ordering.
    for (const field of fields.slice().sort((left, right) =>
      this.compareFieldNames(left.name, right.name))) {
      visit(field.name);
    }

    return sorted;
  }

  /**
   * Phase 33b: Create stable cache key from field name and context
   */
  private makeCacheKey(fieldName: string, context: PivotEvalContext): string {
    // Stable stringify: sort keys for deterministic output
    const keys = Object.keys(context).sort((left, right) => this.compareFieldNames(left, right));
    const parts = keys.map(k => `${this.normalizeFieldName(k)}:${context[k]}`);
    return `${this.normalizeFieldName(fieldName)}|${parts.join(',')}`;
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
      const normalizedContext = new Set<string>();
      for (const [name] of Object.entries(context)) {
        const normalizedName = this.normalizeFieldName(name);
        if (normalizedContext.has(normalizedName)) {
          const error = new Error('#REF!');
          this.cache.set(cacheKey, error);
          return error;
        }
        normalizedContext.add(normalizedName);
      }

      // Validate dependencies exist in context
      for (const dep of field.dependsOn) {
        if (!normalizedContext.has(this.normalizeFieldName(dep))) {
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
      const namedValues = new Map<string, FormulaValue>();
      for (const [name, value] of Object.entries(context)) {
        if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) namedValues.set(name, value);
      }
      const result = this.formulaEngine.evaluateWithBindings(
        field.formula,
        formulaContext,
        namedValues
      );

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
