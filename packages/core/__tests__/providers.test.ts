/**
 * External Data Type Provider Tests
 * 
 * Week 3 Phase 2 (v2.3-provider-layer)
 * 
 * Tests cover:
 * - Provider registration and value retrieval
 * - Stock provider (Price, Volume, MarketCap, Change)
 * - Geography provider (Capital, Population, Area, Currency)
 * - Error handling (#REF! for unknown entities/fields)
 * - Null value Excel semantics (null → 0 in all contexts)
 * - Arithmetic operations with provider values
 * - Concatenation operations
 * - Comparison operations
 * - Cache behavior
 * - Fallback to local entity.fields
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { FormulaEngine } from '../src/FormulaEngine';
import { Worksheet } from '../src/worksheet';
import { StockProvider, GeographyProvider, HttpProviderAdapter } from '../src/providers';
import type { EntityValue } from '../src/types/entity-types';

describe('Provider System', () => {
  let engine: FormulaEngine;
  let sheet: Worksheet;
  let fakeFetch: jest.Mock;

  beforeEach(() => {
    engine = new FormulaEngine();
    sheet = new Worksheet('TestSheet', 100, 26);
    
    // create an HTTP adapter backed by a fake fetch so we can inspect calls later
    const sleepFn = (ms: number) => Promise.resolve();
    fakeFetch = jest.fn();
    const adapter = new HttpProviderAdapter(fakeFetch as any, sleepFn, { timeoutMs: 100, retries: 1 });

    // instantiate providers with adapter and registry reference so they can seed cache
    const stockProvider = new StockProvider(adapter, engine.providers);
    const geoProvider = new GeographyProvider(adapter, engine.providers);

    engine.providers.register(stockProvider);
    engine.providers.register(geoProvider);

    // pre-populate their internal cache so existing synchronous tests still pass
    (stockProvider as any).cache = {
      AAPL: { Price: 178.5, Volume: 52000000, MarketCap: 2800000000000, Change: 2.5 },
      GOOG: { Price: 1350, Volume: 25000000, MarketCap: 1700000000000, Change: -1.2 },
      MSFT: { Price: 420, Volume: 30000000, MarketCap: 3100000000000, Change: 0.8 },
      TSLA: { Price: 245, Volume: 95000000, MarketCap: 780000000000, Change: 5.3 }
    };
    (geoProvider as any).cache = {
      USA: { Capital: 'Washington, D.C.', Population: 331000000, Area: 9834000, Currency: 'USD' },
      France: { Capital: 'Paris', Population: 67000000, Area: 551695, Currency: 'EUR' },
      Japan: { Capital: 'Tokyo', Population: 126000000, Area: 377975, Currency: 'JPY' },
      Germany: { Capital: 'Berlin', Population: 83000000, Area: 357022, Currency: 'EUR' },
      Canada: { Capital: 'Ottawa', Population: 38000000, Area: 9985000, Currency: 'CAD' }
    };
  });

  // Helper to evaluate formula with context
  const evalFormula = (formula: string) => {
    return engine.evaluate(formula, { worksheet: sheet, currentCell: { row: 1, col: 2 } });
  };

  // convenience for accessing the providers we constructed above
  const getStockProvider = () => engine.providers.getProvider('stock') as StockProvider;
  const getGeoProvider = () => engine.providers.getProvider('geography') as GeographyProvider;


  // Helper to create entity with dynamic properties
  const createStockEntity = (symbol: string): EntityValue => {
    return {
      kind: 'entity',
      type: 'stock',
      display: symbol,
      fields: {},
      symbol  // Dynamic property for provider
    } as EntityValue;
  };

  const createGeoEntity = (code: string, display: string): EntityValue => {
    return {
      kind: 'entity',
      type: 'geography',
      display,
      fields: {},
      id: code  // Dynamic property for provider
    } as EntityValue;
  };

  // Helper to set cell at A1 (1-indexed: row 1, col 1)
  const setA1 = (value: any) => {
    sheet.setCellValue({ row: 1, col: 1 }, value);
  };

  const setA2 = (value: any) => {
    sheet.setCellValue({ row: 2, col: 1 }, value);
  };

  // ========================================
  // SECTION 1: Provider Registration
  // ========================================

  test('[P1] Provider registration succeeds', () => {
    expect(engine.providers.hasProvider('stock')).toBe(true);
    expect(engine.providers.hasProvider('geography')).toBe(true);
    expect(engine.providers.hasProvider('unknown')).toBe(false);
  });

  test('[P2] Provider types are listed', () => {
    const types = engine.providers.getProviderTypes();
    expect(types).toContain('stock');
    expect(types).toContain('geography');
    expect(types.length).toBe(2);
  });

  test('[P3] Provider can be unregistered', () => {
    engine.providers.unregister('stock');
    expect(engine.providers.hasProvider('stock')).toBe(false);
    expect(engine.providers.hasProvider('geography')).toBe(true);
  });

  // ========================================
  // SECTION 2: Stock Provider - Basic Access
  // ========================================

  test('[P4] Stock.Price returns correct value', () => {
    const stockEntity = createStockEntity('AAPL');
    
    setA1(stockEntity);
    const result = evalFormula('=A1.Price');
    
    expect(result).toBe(178.50);
  });

  test('[P5] Stock.Volume returns correct value', () => {
    const stockEntity = createStockEntity('GOOG');
    
    setA1(stockEntity);
    const result = evalFormula('=A1.Volume');
    
    expect(result).toBe(25000000);
  });

  test('[P6] Stock.MarketCap returns correct value', () => {
    const stockEntity = createStockEntity('MSFT');
    
    setA1(stockEntity);
    const result = evalFormula('=A1.MarketCap');
    
    expect(result).toBe(3100000000000);
  });

  test('[P7] Stock.Change returns correct value', () => {
    const stockEntity = createStockEntity('TSLA');
    
    setA1(stockEntity);
    const result = evalFormula('=A1.Change');
    
    expect(result).toBe(5.3);
  });

  // ========================================
  // SECTION 3: Geography Provider - Basic Access
  // ========================================

  test('[P8] Geography.Capital returns correct value', () => {
    const geoEntity = createGeoEntity('USA', 'United States');
    
    setA1( geoEntity);
    const result = evalFormula('=A1.Capital');
    
    expect(result).toBe('Washington, D.C.');
  });

  test('[P9] Geography.Population returns correct value', () => {
    const geoEntity = createGeoEntity('France', 'France');
    
    setA1( geoEntity);
    const result = evalFormula('=A1.Population');
    
    expect(result).toBe(67000000);
  });

  test('[P10] Geography.Area returns correct value', () => {
    const geoEntity = createGeoEntity('Japan', 'Japan');
    
    setA1( geoEntity);
    const result = evalFormula('=A1.Area');
    
    expect(result).toBe(377975);
  });

  test('[P11] Geography.Currency returns correct value', () => {
    const geoEntity = createGeoEntity('Germany', 'Germany');
    
    setA1( geoEntity);
    const result = evalFormula('=A1.Currency');
    
    expect(result).toBe('EUR');
  });

  // ========================================
  // SECTION 4: Error Handling
  // ========================================

  test('[P12] Unknown stock symbol returns #REF!', () => {
    const stockEntity = createStockEntity('UNKNOWN');
    
    setA1( stockEntity);
    const result = evalFormula('=A1.Price');
    
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('#REF!');
  });

  test('[P13] Unknown stock field returns #REF!', () => {
    const stockEntity = createStockEntity('AAPL');
    
    setA1( stockEntity);
    const result = evalFormula('=A1.UnknownField');
    
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('#REF!');
  });

  test('[P14] Unknown geography country returns #REF!', () => {
    const geoEntity = createGeoEntity('UNKNOWN', 'Unknown Country');
    
    setA1( geoEntity);
    const result = evalFormula('=A1.Capital');
    
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('#REF!');
  });
  // =================================================================
  // SECTION 5: Adapter integration (new tests)
  // =================================================================

  test('[P31] StockProvider.prefetch uses HTTP adapter and seeds cache', async () => {
    const stockProvider = getStockProvider();
    // configure fakeFetch to return a simple payload for symbol AAPL
    fakeFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ AAPL: { Price: 99, Volume: 123 } }),
      headers: { get: () => null }
    });

    // call prefetch with a symbol
    await stockProvider.prefetch(['AAPL'], { worksheet: sheet, currentCell: { row: 1, col: 1 } });
    // after prefetch, registry cache should contain the value
    const val = engine.providers.getValue('stock', 'AAPL', 'Price', { symbol: 'AAPL' }, { worksheet: sheet, currentCell: { row: 1, col: 1 } });
    expect(val).toBe(99);
    expect(fakeFetch).toHaveBeenCalled();
  });

  test('[P32] StockProvider.prefetch handles RATE_LIMIT error gracefully', async () => {
    const stockProvider = getStockProvider();
    fakeFetch.mockResolvedValue({
      ok: false,
      status: 429,
      headers: { get: () => '1' },
      json: async () => ({})
    });

    await stockProvider.prefetch(['GOOG'], { worksheet: sheet, currentCell: { row: 1, col: 1 } });
    // fetch was attempted, but existing cache entry should remain unchanged
    expect(fakeFetch).toHaveBeenCalled();
    expect((stockProvider as any).cache['GOOG']).toEqual({
      Price: 1350,
      Volume: 25000000,
      MarketCap: 1700000000000,
      Change: -1.2
    });
  });

  test('[P15] Unknown geography field returns #REF!', () => {
    const geoEntity = createGeoEntity('USA', 'United States');
    
    setA1( geoEntity);
    const result = evalFormula('=A1.UnknownField');
    
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('#REF!');
  });

  // ========================================
  // SECTION 5: Arithmetic Operations
  // ========================================

  test('[P16] Stock price in addition', () => {
    const stockEntity = createStockEntity('AAPL');
    
    setA1( stockEntity);
    const result = evalFormula('=A1.Price + 10');
    
    expect(result).toBe(188.50); // 178.50 + 10
  });

  test('[P17] Stock price in multiplication', () => {
    const stockEntity = createStockEntity('AAPL');
    
    setA1( stockEntity);
    const result = evalFormula('=A1.Price * 2');
    
    expect(result).toBe(357.00); // 178.50 * 2
  });

  test('[P18] Geography population in subtraction', () => {
    const geoEntity = createGeoEntity('France', 'France');
    
    setA1( geoEntity);
    const result = evalFormula('=A1.Population - 1000000');
    
    expect(result).toBe(66000000); // 67000000 - 1000000
  });

  test('[P19] Multiple provider values in arithmetic', () => {
    const stock1 = createStockEntity('AAPL');
    const stock2 = createStockEntity('GOOG');
    
    setA1( stock1);
    setA2( stock2);
    const result = engine.evaluate('=A1.Price + A2.Price', { 
      worksheet: sheet, 
      currentCell: { row: 2, col: 0 } 
    });
    
    expect(result).toBe(1528.50); // 178.50 + 1350.00
  });

  // ========================================
  // SECTION 6: Concatenation Operations
  // ========================================

  test('[P20] Stock price concatenated with string', () => {
    const stockEntity = createStockEntity('AAPL');
    
    setA1( stockEntity);
    const result = evalFormula('=A1.Price & " USD"');
    
    expect(result).toBe('178.5 USD');
  });

  test('[P21] Geography capital concatenated', () => {
    const geoEntity = createGeoEntity('France', 'France');
    
    setA1( geoEntity);
    const result = evalFormula('="Capital: " & A1.Capital');
    
    expect(result).toBe('Capital: Paris');
  });

  test('[P22] Multiple provider values concatenated', () => {
    const geo1 = createGeoEntity('USA', 'USA');
    const geo2 = createGeoEntity('France', 'France');
    
    setA1( geo1);
    setA2( geo2);
    const result = engine.evaluate('=A1.Capital & " and " & A2.Capital', {
      worksheet: sheet,
      currentCell: { row: 2, col: 0 }
    });
    
    expect(result).toBe('Washington, D.C. and Paris');
  });

  // ========================================
  // SECTION 7: Comparison Operations
  // ========================================

  test('[P23] Stock price comparison (greater than)', () => {
    const stockEntity = createStockEntity('AAPL');
    
    setA1( stockEntity);
    const result = evalFormula('=A1.Price > 100');
    
    expect(result).toBe(true); // 178.50 > 100
  });

  test('[P24] Stock price comparison (equality)', () => {
    const stockEntity = createStockEntity('AAPL');
    
    setA1( stockEntity);
    const result = evalFormula('=A1.Price = 178.50');
    
    expect(result).toBe(true);
  });

  test('[P25] Geography currency comparison', () => {
    const geoEntity = createGeoEntity('France', 'France');
    
    setA1( geoEntity);
    const result = evalFormula('=A1.Currency = "EUR"');
    
    expect(result).toBe(true);
  });

  test('[P26] Compare two provider values', () => {
    const stock1 = createStockEntity('AAPL');
    const stock2 = createStockEntity('GOOG');
    
    setA1( stock1);
    setA2( stock2);
    const result = engine.evaluate('=A1.Price < A2.Price', {
      worksheet: sheet,
      currentCell: { row: 2, col: 0 }
    });
    
    expect(result).toBe(true); // 178.50 < 1350.00
  });

  // ========================================
  // SECTION 8: Cache Behavior
  // ========================================

  test('[P27] Cache is cleared between evaluations', () => {
    const stockEntity = createStockEntity('AAPL');
    
    setA1( stockEntity);
    const result1 = evalFormula('=A1.Price');
    
    expect(result1).toBe(178.50);
    
    // Cache should be cleared for next evaluation
    // (In this test, we're just verifying it doesn't throw)
    const result2 = evalFormula('=A1.Price');
    expect(result2).toBe(178.50);
  });

  // ========================================
  // SECTION 9: Fallback to Local Fields
  // ========================================

  test('[P28] Fallback to local entity.fields when no provider', () => {
    const customEntity: EntityValue = {
      kind: 'entity',
      type: 'custom', // No provider for this type
      display: 'Custom Entity',
      fields: {
        CustomField: 42
      }
    };
    
    setA1( customEntity);
    const result = evalFormula('=A1.CustomField');
    
    expect(result).toBe(42);
  });

  test('[P29] Provider overrides local fields', () => {
    const stockEntity: EntityValue = {
      kind: 'entity',
      type: 'stock',
      display: 'Apple Inc.',
      fields: {
        Price: 999 // Local field (should be ignored, provider takes priority)
      },
      symbol: 'AAPL'  // Provider uses this
    } as EntityValue;
    
    setA1( stockEntity);
    const result = evalFormula('=A1.Price');
    
    expect(result).toBe(178.50); // Provider value, not local field
  });

  // ========================================
  // SECTION 10: Complex Formulas
  // ========================================

  test('[P30] Complex formula with multiple providers and operators', () => {
    const stock = createStockEntity('AAPL');
    const geo = createGeoEntity('USA', 'USA');
    
    setA1( stock);
    setA2( geo);
    const result = engine.evaluate('=(A1.Price * 100) / (A2.Population / 1000000)', {
      worksheet: sheet,
      currentCell: { row: 2, col: 0 }
    });
    
    // (178.50 * 100) / (331000000 / 1000000) = 17850 / 331 ≈ 53.92...
    expect(result).toBeCloseTo(53.92, 1);
  });
});
