import { FormulaValue, FormulaContext } from '../types/formula-types';
import { IDataTypeProvider } from './IDataTypeProvider';

/**
 * Registry for external data type providers.
 * 
 * Manages provider registration, cache, and value resolution.
 * Cache is cleared per-evaluation for data freshness.
 * 
 * Week 3 Phase 2 (v2.3-provider-layer)
 */
export class ProviderRegistry {
  private providers = new Map<string, IDataTypeProvider>();
  private cache = new Map<string, FormulaValue>();

  /**
   * Register a data type provider
   */
  register(provider: IDataTypeProvider): void {
    this.providers.set(provider.type, provider);
  }

  /**
   * Unregister a provider by type
   */
  unregister(type: string): void {
    this.providers.delete(type);
  }

  /**
   * Get value from provider (sync via cache)
   * 
   * @param entityType - Entity type (e.g., 'stock')
   * @param entityId - Entity identifier (e.g., 'AAPL')
   * @param field - Field name (e.g., 'Price')
   * @param entity - Full entity object
   * @param context - Formula context
   * @returns Field value or #REF! error
   */
  getValue(
    entityType: string,
    entityId: string,
    field: string,
    entity: any,
    context: FormulaContext
  ): FormulaValue {
    // Check cache first
    const cacheKey = `${entityType}:${entityId}.${field}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Find provider
    const provider = this.providers.get(entityType);
    if (!provider) {
      return new Error('#REF!'); // No provider for this type
    }

    // Get value from provider
    const value = provider.getValue(field, entity, context);
    
    // Cache result
    this.cache.set(cacheKey, value);
    
    return value;
  }

  /**
   * Check if a provider exists for the given type
   */
  hasProvider(entityType: string): boolean {
    return this.providers.has(entityType);
  }

  /**
   * Clear all cached values.
   * Call before each formula evaluation for fresh data.
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get all registered provider types
   */
  getProviderTypes(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Set a cached value directly (used by orchestrator to seed resolved values)
   * @internal
   */
  setCachedValue(entityType: string, entityId: string, field: string, value: FormulaValue): void {
    const cacheKey = `${entityType}:${entityId}.${field}`;
    this.cache.set(cacheKey, value);
  }

  /**
   * Optional: Prefetch data for multiple entities
   */
  async prefetch(entityRefs: string[], context: FormulaContext): Promise<void> {
    const prefetchPromises: Promise<void>[] = [];

    for (const provider of this.providers.values()) {
      if (provider.prefetch) {
        prefetchPromises.push(provider.prefetch(entityRefs, context));
      }
    }

    await Promise.all(prefetchPromises);
  }
}
