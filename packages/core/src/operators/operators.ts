/**
 * V8 Optimization:
 * - Monomorphic functions for inline caching
 * - Map lookup is JIT-optimized
 * - Predictable control flow for branch predictor
 */

import type { FormulaValue, OperatorHandler } from '../types/formula-types';
import { toNumber, toString, compareValues } from '../utils/type-utils';

/**
 * Arithmetic operators
 * Optimized with monomorphic handlers
 */
class ArithmeticOperators {
  private readonly handlers = new Map<string, OperatorHandler>([
    ['+', this.add.bind(this)],
    ['-', this.subtract.bind(this)],
    ['*', this.multiply.bind(this)],
    ['/', this.divide.bind(this)],
    ['^', this.power.bind(this)],
  ]);

  get(operator: string): OperatorHandler | undefined {
    return this.handlers.get(operator);
  }

  private add(left: FormulaValue, right: FormulaValue): FormulaValue {
    const l = toNumber(left);
    const r = toNumber(right);
    
    if (l instanceof Error) return l;
    if (r instanceof Error) return r;
    
    return l + r;
  }

  private subtract(left: FormulaValue, right: FormulaValue): FormulaValue {
    const l = toNumber(left);
    const r = toNumber(right);
    
    if (l instanceof Error) return l;
    if (r instanceof Error) return r;
    
    return l - r;
  }

  private multiply(left: FormulaValue, right: FormulaValue): FormulaValue {
    const l = toNumber(left);
    const r = toNumber(right);
    
    if (l instanceof Error) return l;
    if (r instanceof Error) return r;
    
    return l * r;
  }

  private divide(left: FormulaValue, right: FormulaValue): FormulaValue {
    const l = toNumber(left);
    const r = toNumber(right);
    
    if (l instanceof Error) return l;
    if (r instanceof Error) return r;
    
    if (r === 0) return new Error('#DIV/0!');
    
    return l / r;
  }

  private power(left: FormulaValue, right: FormulaValue): FormulaValue {
    const l = toNumber(left);
    const r = toNumber(right);
    
    if (l instanceof Error) return l;
    if (r instanceof Error) return r;
    
    const result = Math.pow(l, r);
    return isNaN(result) ? new Error('#NUM!') : result;
  }
}

/**
 * Comparison operators
 * Excel-compatible comparison with type coercion
 */
class ComparisonOperators {
  private readonly handlers = new Map<string, OperatorHandler>([
    ['=', this.equal.bind(this)],
    ['<>', this.notEqual.bind(this)],
    ['<', this.lessThan.bind(this)],
    ['>', this.greaterThan.bind(this)],
    ['<=', this.lessThanOrEqual.bind(this)],
    ['>=', this.greaterThanOrEqual.bind(this)],
  ]);

  get(operator: string): OperatorHandler | undefined {
    return this.handlers.get(operator);
  }

  private equal(left: FormulaValue, right: FormulaValue): FormulaValue {
    const cmp = compareValues(left, right);
    if (cmp instanceof Error) return cmp;
    return cmp === 0;
  }

  private notEqual(left: FormulaValue, right: FormulaValue): FormulaValue {
    const cmp = compareValues(left, right);
    if (cmp instanceof Error) return cmp;
    return cmp !== 0;
  }

  private lessThan(left: FormulaValue, right: FormulaValue): FormulaValue {
    const cmp = compareValues(left, right);
    if (cmp instanceof Error) return cmp;
    return cmp < 0;
  }

  private greaterThan(left: FormulaValue, right: FormulaValue): FormulaValue {
    const cmp = compareValues(left, right);
    if (cmp instanceof Error) return cmp;
    return cmp > 0;
  }

  private lessThanOrEqual(left: FormulaValue, right: FormulaValue): FormulaValue {
    const cmp = compareValues(left, right);
    if (cmp instanceof Error) return cmp;
    return cmp <= 0;
  }

  private greaterThanOrEqual(left: FormulaValue, right: FormulaValue): FormulaValue {
    const cmp = compareValues(left, right);
    if (cmp instanceof Error) return cmp;
    return cmp >= 0;
  }
}

/**
 * String concatenation operator
 */
class ConcatenationOperator {
  private readonly handlers = new Map<string, OperatorHandler>([
    ['&', this.concatenate.bind(this)],
  ]);

  get(operator: string): OperatorHandler | undefined {
    return this.handlers.get(operator);
  }

  private concatenate(left: FormulaValue, right: FormulaValue): FormulaValue {
    const l = toString(left);
    const r = toString(right);
    
    if (l instanceof Error) return l;
    if (r instanceof Error) return r;
    
    return l + r;
  }
}

/**
 * Unified operator registry
 * Single entry point for all operator lookups
 */
export class OperatorRegistry {
  private readonly arithmetic: ArithmeticOperators;
  private readonly comparison: ComparisonOperators;
  private readonly concatenation: ConcatenationOperator;

  // Unified lookup map for O(1) access
  private readonly operatorMap: Map<string, OperatorHandler>;

  constructor() {
    this.arithmetic = new ArithmeticOperators();
    this.comparison = new ComparisonOperators();
    this.concatenation = new ConcatenationOperator();

    // Build unified map for fast lookup
    this.operatorMap = new Map();

    // Merge all operator handlers
    this.mergeHandlers(this.arithmetic);
    this.mergeHandlers(this.comparison);
    this.mergeHandlers(this.concatenation);
  }

  private mergeHandlers(source: { get(op: string): OperatorHandler | undefined }): void {
    // Common operators to check
    const operators = ['+', '-', '*', '/', '^', '=', '<>', '<', '>', '<=', '>=', '&'];
    
    for (const op of operators) {
      const handler = source.get(op);
      if (handler) {
        this.operatorMap.set(op, handler);
      }
    }
  }

  /**
   * Get operator handler (O(1) lookup)
   */
  getHandler(operator: string): OperatorHandler | undefined {
    return this.operatorMap.get(operator);
  }

  /**
   * Check if operator exists
   */
  hasOperator(operator: string): boolean {
    return this.operatorMap.has(operator);
  }

  /**
   * Execute operator
   * Convenience method with error handling
   */
  execute(operator: string, left: FormulaValue, right: FormulaValue): FormulaValue {
    const handler = this.operatorMap.get(operator);
    
    if (!handler) {
      return new Error('#NAME?');
    }

    try {
      return handler(left, right);
    } catch (error) {
      return new Error('#VALUE!');
    }
  }

  /**
   * Get all supported operators
   */
  getSupportedOperators(): string[] {
    return Array.from(this.operatorMap.keys());
  }
}

// Singleton instance for global use
let globalRegistry: OperatorRegistry | null = null;

/**
 * Get global operator registry (singleton pattern)
 * Ensures single instance for entire application
 */
export function getOperatorRegistry(): OperatorRegistry {
  if (!globalRegistry) {
    globalRegistry = new OperatorRegistry();
  }
  return globalRegistry;
}

/**
 * Reset global registry (for testing)
 */
export function resetOperatorRegistry(): void {
  globalRegistry = null;
}
