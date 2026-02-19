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
   */
  prefetch?(entityRefs: string[], context: FormulaContext): Promise<void>;
}
