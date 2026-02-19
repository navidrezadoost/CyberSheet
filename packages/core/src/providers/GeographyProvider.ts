import { FormulaValue, FormulaContext } from '../types/formula-types';
import { IDataTypeProvider } from './IDataTypeProvider';

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

  // Mock geography data (country -> field -> value)
  private mockData: Record<string, Record<string, FormulaValue>> = {
    'USA': {
      Capital: 'Washington, D.C.',
      Population: 331000000,
      Area: 9834000,
      Currency: 'USD'
    },
    'France': {
      Capital: 'Paris',
      Population: 67000000,
      Area: 551695,
      Currency: 'EUR'
    },
    'Japan': {
      Capital: 'Tokyo',
      Population: 126000000,
      Area: 377975,
      Currency: 'JPY'
    },
    'Germany': {
      Capital: 'Berlin',
      Population: 83000000,
      Area: 357022,
      Currency: 'EUR'
    },
    'Canada': {
      Capital: 'Ottawa',
      Population: 38000000,
      Area: 9985000,
      Currency: 'CAD'
    }
  };

  getValue(field: string, entity: any, context: FormulaContext): FormulaValue {
    // Extract country code from entity
    const country = entity?.country || entity?.code || entity?.id;
    
    if (!country) {
      return new Error('#REF!'); // No country in entity
    }

    // Check if country exists
    const geoData = this.mockData[country];
    if (!geoData) {
      return new Error('#REF!'); // Unknown country
    }

    // Check if field exists
    const value = geoData[field];
    if (value === undefined) {
      return new Error('#REF!'); // Unknown field
    }

    return value;
  }

  /**
   * Optional: In production, this would fetch real geography data from an API
   */
  async prefetch(entityRefs: string[], context: FormulaContext): Promise<void> {
    // Mock implementation - in production, would call external API
    // e.g., await fetch(`https://api.geography.com/batch?countries=${countries.join(',')}`)
    
    // For now, data is pre-populated in mockData
    return Promise.resolve();
  }
}
