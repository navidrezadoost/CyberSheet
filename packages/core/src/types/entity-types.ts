/**
 * entity-types.ts
 * 
 * Structured entity data types for Stocks, Geography, and custom entities.
 * 
 * Design Principles:
 * - Deterministic: Entities are pre-resolved, not async
 * - Extensible: Plugin architecture for custom types
 * - Type-safe: Full TypeScript coverage
 * - Excel-inspired: Field access via dot notation
 * 
 * Week 1 Scope: Type definitions only (no parser/evaluator changes)
 */

import type { CellValue } from '../types';

/**
 * Entity value - structured data with named fields
 * 
 * Examples:
 * - Stock: { type: 'stock', display: 'MSFT', fields: { Price: 420.50, ... } }
 * - Geography: { type: 'geography', display: 'USA', fields: { Population: 331000000, ... } }
 * - Custom: { type: 'product', display: 'Widget A', fields: { price: 29.99, ... } }
 */
export interface EntityValue {
  /**
   * Discriminator for value union
   */
  kind: 'entity';
  
  /**
   * Entity type identifier
   * - Built-in: 'stock', 'geography'
   * - Custom: any registered type name
   */
  type: string;
  
  /**
   * Display value shown in cell
   * - Used when entity appears in arithmetic/comparison/concat
   * - Can be number, string, boolean, or null
   * - Example: Stock entity might display ticker symbol 'MSFT'
   */
  display: CellValue;
  
  /**
   * Named fields accessible via dot notation (Week 2+)
   * - Keys: field names (case-sensitive)
   * - Values: any CellValue (primitives only in v1.0)
   * 
   * Example Stock fields:
   * - Symbol: 'MSFT'
   * - Price: 420.50
   * - Change: 5.25
   * - Market Cap: 3120000000000
   */
  fields: Record<string, CellValue>;
  
  /**
   * Optional metadata (not accessible via formulas)
   */
  metadata?: {
    /** Unique identifier for entity */
    id?: string;
    /** Timestamp of last data update (milliseconds since epoch) */
    lastUpdated?: number;
    /** Data provider identifier */
    provider?: string;
    /** Original query/symbol used to create entity */
    query?: string;
  };
}

/**
 * Entity type definition schema
 * Used for plugin registration and validation
 */
export interface EntityTypeSchema {
  /**
   * Type name (must be unique across registered types)
   */
  typename: string;
  
  /**
   * Human-readable display name
   */
  displayName: string;
  
  /**
   * Field which provides the display value
   * - Must exist in fields schema
   */
  displayField: string;
  
  /**
   * Field definitions
   * - Key: field name (case-sensitive)
   * - Value: expected type for validation
   */
  fields: Record<string, EntityFieldType>;
  
  /**
   * Optional field metadata
   */
  fieldMetadata?: Record<string, EntityFieldMetadata>;
}

/**
 * Entity field type for schema validation
 */
export type EntityFieldType = 
  | 'number'
  | 'string'
  | 'boolean'
  | 'date'     // Serial number representation
  | 'currency' // Number with currency formatting hint
  | 'percent'; // Number with percentage formatting hint

/**
 * Optional metadata for entity fields
 */
export interface EntityFieldMetadata {
  /** Human-readable field label */
  label?: string;
  /** Field description for tooltips/docs */
  description?: string;
  /** Number format string (Excel format grammar) */
  format?: string;
  /** Whether field is required (for validation) */
  required?: boolean;
}

// ============================================================================
// BUILT-IN ENTITY TYPE SCHEMAS
// ============================================================================

/**
 * Stock entity schema
 * Fields based on common financial data providers
 */
export const STOCK_SCHEMA: EntityTypeSchema = {
  typename: 'stock',
  displayName: 'Stock',
  displayField: 'Symbol',
  fields: {
    'Symbol': 'string',
    'Name': 'string',
    'Price': 'currency',
    'Change': 'currency',
    'Change %': 'percent',
    'Market Cap': 'currency',
    'Volume': 'number',
    '52W High': 'currency',
    '52W Low': 'currency',
    'P/E Ratio': 'number',
    'Dividend Yield': 'percent',
  },
  fieldMetadata: {
    'Symbol': { label: 'Stock Symbol', description: 'Ticker symbol', required: true },
    'Name': { label: 'Company Name', description: 'Full company name', required: true },
    'Price': { label: 'Current Price', format: '$#,##0.00', required: true },
    'Change': { label: 'Price Change', format: '$#,##0.00' },
    'Change %': { label: 'Change Percent', format: '0.00%' },
    'Market Cap': { label: 'Market Capitalization', format: '$#,##0,,' },
    'Volume': { label: 'Trading Volume', format: '#,##0' },
    '52W High': { label: '52-Week High', format: '$#,##0.00' },
    '52W Low': { label: '52-Week Low', format: '$#,##0.00' },
    'P/E Ratio': { label: 'Price-to-Earnings Ratio', format: '0.00' },
    'Dividend Yield': { label: 'Dividend Yield', format: '0.00%' },
  }
};

/**
 * Geography entity schema
 * Fields based on REST Countries API structure
 */
export const GEOGRAPHY_SCHEMA: EntityTypeSchema = {
  typename: 'geography',
  displayName: 'Geography',
  displayField: 'Name',
  fields: {
    'Name': 'string',
    'Capital': 'string',
    'Population': 'number',
    'Area': 'number',
    'Region': 'string',
    'Subregion': 'string',
    'Currency': 'string',
    'Language': 'string',
    'GDP': 'currency',
    'Timezone': 'string',
  },
  fieldMetadata: {
    'Name': { label: 'Country Name', description: 'Official country name', required: true },
    'Capital': { label: 'Capital City' },
    'Population': { label: 'Population', format: '#,##0' },
    'Area': { label: 'Land Area (km²)', format: '#,##0' },
    'Region': { label: 'Global Region' },
    'Subregion': { label: 'Subregion' },
    'Currency': { label: 'Official Currency' },
    'Language': { label: 'Primary Language' },
    'GDP': { label: 'GDP (USD)', format: '$#,##0,,' },
    'Timezone': { label: 'Timezone' },
  }
};

// ============================================================================
// TYPE GUARDS & HELPERS
// ============================================================================

/**
 * Type guard: check if value is EntityValue
 * 
 * Week 1: Core type checking only
 * Week 2+: Will be used in field access logic
 */
export function isEntityValue(value: any): value is EntityValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    value.kind === 'entity' &&
    typeof value.type === 'string' &&
    'display' in value &&
    typeof value.fields === 'object' &&
    value.fields !== null
  );
}

/**
 * Extract display value from entity or return value as-is
 * 
 * Week 1: Used in FormulaEngine for arithmetic/comparison
 * Ensures entities behave like their display value in formulas
 */
export function getDisplayValue(value: any): CellValue {
  if (isEntityValue(value)) {
    return value.display;
  }
  
  // Handle primitive CellValue
  if (
    typeof value === 'number' ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    value === null
  ) {
    return value;
  }
  
  // Unknown type - return as-is (will be handled by caller)
  return value;
}

/**
 * Validate entity structure
 * 
 * Week 1: Basic validation
 * Week 3: Will integrate with EntityManager for schema validation
 */
export function validateEntityStructure(value: any): value is EntityValue {
  if (!isEntityValue(value)) {
    return false;
  }
  
  // Check display value is primitive
  const display = value.display;
  const isValidDisplay = (
    typeof display === 'number' ||
    typeof display === 'string' ||
    typeof display === 'boolean' ||
    display === null
  );
  
  if (!isValidDisplay) {
    return false;
  }
  
  // Check fields is non-null object
  if (typeof value.fields !== 'object' || value.fields === null || Array.isArray(value.fields)) {
    return false;
  }
  
  // Check all field values are primitives (no nested entities in v1.0)
  for (const fieldValue of Object.values(value.fields)) {
    const isValidField = (
      typeof fieldValue === 'number' ||
      typeof fieldValue === 'string' ||
      typeof fieldValue === 'boolean' ||
      fieldValue === null
    );
    
    if (!isValidField) {
      return false; // Nested entities not supported
    }
  }
  
  return true;
}

/**
 * Create entity value (factory function)
 * 
 * Week 1: Basic creation
 * Week 3: Will be integrated into EntityManager
 */
export function createEntityValue(
  type: string,
  display: CellValue,
  fields: Record<string, CellValue>,
  metadata?: EntityValue['metadata']
): EntityValue {
  return {
    kind: 'entity',
    type,
    display,
    fields,
    metadata,
  };
}
