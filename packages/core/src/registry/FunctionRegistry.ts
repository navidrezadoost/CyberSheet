/**
 * FunctionRegistry.ts
 * 
 * Central registry for all formula functions.
 * Uses Map for O(1) lookup instead of switch/if-else chains.
 * 
 * SDK-Grade Enforcement:
 * - Registry ONLY accepts StrictFunctionMetadata
 * - TypeScript build fails if metadata incomplete
 * - No runtime defaults, no implicit assumptions
 * - Fail fast at development time
 * 
 * Design Patterns:
 * - Registry Pattern: Central registration point
 * - Strategy Pattern: Different function categories
 * - Factory Pattern: Function creation and registration
 * 
 * Performance Optimizations:
 * - Map-based lookup (O(1) vs O(n) for if/else)
 * - Lazy loading of function categories
 * - Monomorphic function handlers
 * - Inline cache friendly
 */

import type { 
  FormulaFunction, 
  ContextAwareFormulaFunction, 
  FunctionMetadata,
  StrictFunctionMetadata,
  FunctionCategory
} from '../types/formula-types';
import { ComplexityClass } from '../types/formula-types';

export interface FunctionRegistryConfig {
  enableCaching?: boolean;
  enableMetrics?: boolean;
  maxRecursionDepth?: number;
}

export class FunctionRegistry {
  // Main function lookup map (O(1) access)
  private readonly functions = new Map<string, FormulaFunction | ContextAwareFormulaFunction>();

  // Function metadata for introspection
  private readonly metadata = new Map<string, FunctionMetadata>();

  // Category index for organized access
  private readonly categoryIndex = new Map<FunctionCategory, Set<string>>();

  // Performance metrics (optional)
  private readonly metrics = new Map<string, { calls: number; totalTime: number }>();

  private readonly config: Required<FunctionRegistryConfig>;

  constructor(config: FunctionRegistryConfig = {}) {
    this.config = {
      enableCaching: config.enableCaching ?? true,
      enableMetrics: config.enableMetrics ?? false,
      maxRecursionDepth: config.maxRecursionDepth ?? 100,
    };
  }

  /**
   * Register a function with strict metadata validation
   * 
   * SDK-Grade: TypeScript will fail to compile if metadata incomplete
   * NO runtime defaults, NO implicit assumptions
   * 
   * @param metadata - Complete StrictFunctionMetadata (all fields required)
   */
  register(metadata: StrictFunctionMetadata): void {
    const upperName = metadata.name.toUpperCase();

    // Store function handler
    this.functions.set(upperName, metadata.handler);

    // Store complete metadata (already validated by TypeScript)
    const storedMetadata: FunctionMetadata = {
      ...metadata,
      name: upperName,
    };

    this.metadata.set(upperName, storedMetadata);

    // Update category index
    const category = metadata.category;
    if (!this.categoryIndex.has(category)) {
      this.categoryIndex.set(category, new Set());
    }
    this.categoryIndex.get(category)!.add(upperName);

    // Initialize metrics
    if (this.config.enableMetrics) {
      this.metrics.set(upperName, { calls: 0, totalTime: 0 });
    }
  }

  /**
   * Register multiple functions at once (STRICT enforcement)
   * 
   * @param functions - Array of StrictFunctionMetadata (all fields required)
   */
  registerBatch(functions: StrictFunctionMetadata[]): void {
    for (const metadata of functions) {
      this.register(metadata);
    }
  }

  /**
   * Get function handler (O(1) lookup)
   */
  get(name: string): FormulaFunction | ContextAwareFormulaFunction | undefined {
    return this.functions.get(name.toUpperCase());
  }

  /**
   * Check if function exists
   */
  has(name: string): boolean {
    return this.functions.has(name.toUpperCase());
  }

  /**
   * Execute function with metrics (if enabled)
   */
  execute(name: string, ...args: any[]): any {
    const upperName = name.toUpperCase();
    const handler = this.functions.get(upperName);

    if (!handler) {
      return new Error('#NAME?');
    }

    // Execute without metrics (fast path)
    if (!this.config.enableMetrics) {
      try {
        return (handler as FormulaFunction)(...args);
      } catch (error) {
        return new Error('#VALUE!');
      }
    }

    // Execute with metrics
    const startTime = performance.now();
    
    try {
      const result = (handler as FormulaFunction)(...args);
      const endTime = performance.now();
      
      // Update metrics
      const metric = this.metrics.get(upperName)!;
      metric.calls++;
      metric.totalTime += endTime - startTime;
      
      return result;
    } catch (error) {
      return new Error('#VALUE!');
    }
  }

  /**
   * Get function metadata
   */
  getMetadata(name: string): FunctionMetadata | undefined {
    return this.metadata.get(name.toUpperCase());
  }

  /**
   * Get all functions in a category
   */
  getByCategory(category: FunctionCategory): string[] {
    const names = this.categoryIndex.get(category);
    return names ? Array.from(names) : [];
  }

  /**
   * Get all registered function names
   */
  getAllNames(): string[] {
    return Array.from(this.functions.keys());
  }

  /**
   * Get function metrics (if enabled)
   */
  getMetrics(name?: string): Map<string, { calls: number; totalTime: number; avgTime: number }> {
    if (!this.config.enableMetrics) {
      return new Map();
    }

    const result = new Map<string, { calls: number; totalTime: number; avgTime: number }>();

    if (name) {
      const upperName = name.toUpperCase();
      const metric = this.metrics.get(upperName);
      if (metric) {
        result.set(upperName, {
          ...metric,
          avgTime: metric.calls > 0 ? metric.totalTime / metric.calls : 0,
        });
      }
    } else {
      for (const [name, metric] of this.metrics) {
        result.set(name, {
          ...metric,
          avgTime: metric.calls > 0 ? metric.totalTime / metric.calls : 0,
        });
      }
    }

    return result;
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    for (const metric of this.metrics.values()) {
      metric.calls = 0;
      metric.totalTime = 0;
    }
  }

  /**
   * Clear all registrations
   */
  clear(): void {
    this.functions.clear();
    this.metadata.clear();
    this.categoryIndex.clear();
    this.metrics.clear();
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalFunctions: number;
    categories: Map<FunctionCategory, number>;
    specialFunctions: number;
  } {
    const categories = new Map<FunctionCategory, number>();
    let specialCount = 0;

    for (const meta of this.metadata.values()) {
      categories.set(meta.category, (categories.get(meta.category) || 0) + 1);
      if (meta.isSpecial) specialCount++;
    }

    return {
      totalFunctions: this.functions.size,
      categories,
      specialFunctions: specialCount,
    };
  }

  /**
   * SDK-Grade: Query volatile functions
   * Used by scheduler for recalc planning
   */
  getVolatileFunctions(): string[] {
    const volatile: string[] = [];
    for (const [name, meta] of this.metadata.entries()) {
      if (meta.volatile === true) {
        volatile.push(name);
      }
    }
    return volatile;
  }

  /**
   * SDK-Grade: Query iterative functions
   * Used for performance budgeting
   */
  getIterativeFunctions(): string[] {
    const iterative: string[] = [];
    for (const [name, meta] of this.metadata.entries()) {
      if (meta.iterationPolicy !== null && meta.iterationPolicy !== undefined) {
        iterative.push(name);
      }
    }
    return iterative;
  }

  /**
   * SDK-Grade: Check if function is expensive
   * Returns true for O(n²) and ITERATIVE complexity
   */
  isExpensive(functionName: string): boolean {
    const meta = this.metadata.get(functionName.toUpperCase());
    if (!meta) return false;
    
    return meta.complexityClass === ComplexityClass.O_N2 || 
           meta.complexityClass === ComplexityClass.ITERATIVE;
  }

  /**
   * SDK-Grade: Export metadata as JSON for documentation
   * Used for audit and documentation generation
   */
  exportMetadataJSON(): Record<string, any>[] {
    const exported: Record<string, any>[] = [];
    
    for (const [name, meta] of this.metadata.entries()) {
      exported.push({
        name,
        category: meta.category,
        minArgs: meta.minArgs,
        maxArgs: meta.maxArgs,
        isSpecial: meta.isSpecial,
        needsContext: meta.needsContext,
        volatile: meta.volatile,
        complexityClass: meta.complexityClass,
        precisionClass: meta.precisionClass,
        errorStrategy: meta.errorStrategy,
        iterationPolicy: meta.iterationPolicy,
      });
    }
    
    return exported.sort((a, b) => a.name.localeCompare(b.name));
  }
}

// Singleton instance for global use
let globalRegistry: FunctionRegistry | null = null;

/**
 * Get global function registry (singleton)
 * Ensures single instance across the application
 */
export function getFunctionRegistry(): FunctionRegistry {
  if (!globalRegistry) {
    globalRegistry = new FunctionRegistry({
      enableCaching: true,
      enableMetrics: false, // Disable by default for production
    });
  }
  return globalRegistry;
}

/**
 * Reset global registry (for testing)
 */
export function resetFunctionRegistry(): void {
  globalRegistry = null;
}

/**
 * Create a new isolated registry (for testing or isolated contexts)
 */
export function createFunctionRegistry(config?: FunctionRegistryConfig): FunctionRegistry {
  return new FunctionRegistry(config);
}
