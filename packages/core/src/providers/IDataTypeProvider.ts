import { FormulaValue, FormulaContext } from '../types/formula-types';

/**
 * Interface for external data type providers (stocks, geography, weather, etc.)
 * 
 * Providers supply data for entity field access (e.g., A1.Price where A1 is a Stock entity).
 * All getValue calls are synchronous - providers must use cache for performance.
 * 
 * Week 3 Phase 2 (v2.3-provider-layer)
 */
export interface IDataTypeProvider {
  /**
   * Unique identifier for this provider
   */
  id: string;

  /**
   * Entity type this provider handles (e.g., 'stock', 'geography')
   */
  type: string;

  /**
   * Get the value of a field for an entity.
   * 
   * @param field - The field name (e.g., 'Price', 'Capital')
   * @param entity - The entity object from context.entities
   * @param context - Formula evaluation context
   * @returns The field value, or Error if not found/invalid
   * 
   * NOTE: Must be synchronous. Use prefetch() to populate cache.
   */
  getValue(field: string, entity: any, context: FormulaContext): FormulaValue;

  /**
   * Optional: Prefetch data for multiple entities to populate cache.
   * Called before synchronous evaluation.
   * 
   * @param entityRefs - Array of entity references to prefetch
   * @param context - Formula evaluation context
   * 
   * ═══════════════════════════════════════════════════════════════════
   * DETERMINISM CONTRACT (CRITICAL - DO NOT VIOLATE)
   * ═══════════════════════════════════════════════════════════════════
   * 
   * 1. prefetch() MUST await all asynchronous work before returning.
   * 2. NO background tasks may mutate ProviderRegistry after prefetch() resolves.
   * 3. ALL values (including errors) MUST be written to registry before resolution.
   * 4. Fire-and-forget async operations are STRICTLY FORBIDDEN.
   * 
   * RATIONALE:
   * The formula evaluation model depends on a deterministic snapshot boundary.
   * After BatchResolver.resolveAll() completes, the registry state must be final.
   * Late mutations break:
   *   - Reproducible evaluation results
   *   - Formula dependency tracking
   *   - Undo/redo correctness
   *   - Multi-threaded safety (future)
   * 
   * ENFORCEMENT:
   * Violations of this contract are architectural bugs, not feature limitations.
   * Tests explicitly verify no late writes occur after resolution.
   * 
   * EXAMPLES OF VIOLATIONS:
   * ❌ setTimeout(() => registry.setCachedValue(...), 100)
   * ❌ fetch(...).then(data => registry.setCachedValue(...))
   * ❌ Spawning background workers without awaiting completion
   * 
   * CORRECT PATTERNS:
   * ✅ await adapter.request(...)
   * ✅ await Promise.all([fetch1, fetch2, fetch3])
   * ✅ registry.setCachedValue(...) synchronously after await
   * 
   * ═══════════════════════════════════════════════════════════════════
   */
  prefetch?(entityRefs: string[], context: FormulaContext): Promise<void>;
}
