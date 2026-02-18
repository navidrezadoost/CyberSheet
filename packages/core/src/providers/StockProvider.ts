import { FormulaValue, FormulaContext } from '../types/formula-types';
import { IDataTypeProvider } from './IDataTypeProvider';

/**
 * Mock stock data provider for testing and demonstration.
 * 
 * Supports fields: Price, Volume, MarketCap, Change
 * Returns numeric values or #REF! error if field not found.
 * 
 * Week 3 Phase 2 (v2.3-provider-layer)
 */
export class StockProvider implements IDataTypeProvider {
  id = 'stock-provider';
  type = 'stock';

  // Mock stock data (symbol -> field -> value)
  private mockData: Record<string, Record<string, FormulaValue>> = {
    'AAPL': {
      Price: 178.50,
      Volume: 52000000,
      MarketCap: 2800000000000,
      Change: 2.5
    },
    'GOOG': {
      Price: 1350.00,
      Volume: 25000000,
      MarketCap: 1700000000000,
      Change: -1.2
    },
    'MSFT': {
      Price: 420.00,
      Volume: 30000000,
      MarketCap: 3100000000000,
      Change: 0.8
    },
    'TSLA': {
      Price: 245.00,
      Volume: 95000000,
      MarketCap: 780000000000,
      Change: 5.3
    }
  };

  getValue(field: string, entity: any, context: FormulaContext): FormulaValue {
    // Extract symbol from entity
    const symbol = entity?.symbol || entity?.id;
    
    if (!symbol) {
      return new Error('#REF!'); // No symbol in entity
    }

    // Check if symbol exists
    const stockData = this.mockData[symbol];
    if (!stockData) {
      return new Error('#REF!'); // Unknown stock symbol
    }

    // Check if field exists
    const value = stockData[field];
    if (value === undefined) {
      return new Error('#REF!'); // Unknown field
    }

    return value;
  }

  /**
   * Optional: In production, this would fetch real stock data from an API
   */
  async prefetch(entityRefs: string[], context: FormulaContext): Promise<void> {
    // Mock implementation - in production, would call external API
    // e.g., await fetch(`https://api.stocks.com/batch?symbols=${symbols.join(',')}`)
    
    // For now, data is pre-populated in mockData
    return Promise.resolve();
  }
}
