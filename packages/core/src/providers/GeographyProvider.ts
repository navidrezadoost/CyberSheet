import { FormulaValue, FormulaContext } from '../types/formula-types';
import { IDataTypeProvider } from './IDataTypeProvider';
import { ProviderRegistry } from './ProviderRegistry';
import { HttpProviderAdapter } from './HttpProviderAdapter';
import { ProviderErrorKind } from './ProviderResolution';

/**
 * Mock geography data provider for testing and demonstration.
 * 
 * Supports fields: Capital, Population, Area, Currency
 * Returns string/numeric values or #REF! error if field not found.
 * 
 * Week 3 Phase 2 (v2.3-provider-layer)
 */

export class GeographyProvider implements IDataTypeProvider {
  id = 'geography-provider';
  type = 'geography';

  private cache: Record<string, Record<string, FormulaValue>> = {};

  constructor(
    private http: HttpProviderAdapter,
    private registry: ProviderRegistry
  ) {}

  getValue(field: string, entity: any, context: FormulaContext): FormulaValue {
    const country = entity?.country || entity?.code || entity?.id;
    if (!country) return new Error('#REF!');

    const data = this.cache[country];
    if (!data) return new Error('#REF!');

    const val = data[field];
    if (val === undefined) return new Error('#REF!');
    return val;
  }

  async prefetch(entityRefs: string[], context: FormulaContext): Promise<void> {
    const countries = Array.from(new Set(entityRefs));
    if (countries.length === 0) return;

    const url = `https://api.example.com/geography?codes=${countries.join(',')}`;
    const resp = await this.http.request<Record<string, Record<string, any>>>({ url });

    if (resp.error) {
      for (const c of countries) {
        this.registry.setCachedValue(this.type, c, '__ERROR__', resp.error as any);
      }
      return;
    }

    this.cache = resp.data || {};
    for (const c of countries) {
      const data = this.cache[c] || {};
      for (const [field, value] of Object.entries(data)) {
        this.registry.setCachedValue(this.type, c, field, value as FormulaValue);
      }
    }
  }
}
