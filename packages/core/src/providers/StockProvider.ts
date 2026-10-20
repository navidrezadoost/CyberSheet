import { FormulaValue, FormulaContext } from "../types/formula-types";
import type { IDataTypeProvider } from "./IDataTypeProvider";
import { ProviderRegistry } from "./ProviderRegistry";
import { HttpProviderAdapter } from "./HttpProviderAdapter";
import { ProviderError } from "./ProviderResolution";

/**
 * Stock data provider that fetches from an HTTP service (e.g. Alpha Vantage).
 * Logic is provider-agnostic; HTTP specifics are handled by the adapter.
 */

/**
 * Stock data provider that fetches from an HTTP service (e.g. Alpha Vantage).
 * Logic is provider-agnostic; HTTP specifics are handled by the adapter.
 */
export class StockProvider implements IDataTypeProvider {
  id = "stock-provider";
  type = "stock";

  // internal cache populated during prefetch
  private cache: Record<string, Record<string, FormulaValue>> = {};

  constructor(
    private http: HttpProviderAdapter,
    private registry: ProviderRegistry,
  ) {}

  getValue(field: string, entity: any, context: FormulaContext): FormulaValue {
    const symbol = entity?.symbol || entity?.id;
    if (!symbol) return new Error("#REF!");

    const data = this.cache[symbol];
    if (!data) return new Error("#REF!");

    const val = data[field];
    if (val === undefined) return new Error("#REF!");
    return val;
  }

  /**
   * Fetch values for given stock symbols and seed registry cache.
   * Expects entityRefs to be an array of symbols.
   */
  async prefetch(entityRefs: string[], context: FormulaContext): Promise<void> {
    const symbols = Array.from(new Set(entityRefs));
    if (symbols.length === 0) return;

    // build request (caller could customize; here we just join)
    const url = `https://api.example.com/stocks?symbols=${symbols.join(",")}`;
    const resp = await this.http.request<Record<string, Record<string, any>>>({
      url,
    });

    if (resp.error) {
      // propagate error by seeding registry with error values
      for (const sym of symbols) {
        const ref = { type: this.type, id: sym, field: "" };
        // The orchestrator will later map ProviderError to spreadsheet error;
        // here we'll just store the error object so resolution context can see it.
        this.registry.setCachedValue(
          this.type,
          sym,
          "__ERROR__",
          resp.error as any,
        );
      }
      return;
    }

    // normalize and cache each symbol
    this.cache = resp.data || {};
    for (const sym of symbols) {
      const data = this.cache[sym] || {};
      for (const [field, value] of Object.entries(data)) {
        this.registry.setCachedValue(
          this.type,
          sym,
          field,
          value as FormulaValue,
        );
      }
    }
  }
}
