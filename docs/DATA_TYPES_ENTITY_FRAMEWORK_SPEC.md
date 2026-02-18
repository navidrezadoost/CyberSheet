# Data Types: Entity Framework Implementation Spec

**Date:** February 17, 2026  
**Feature:** Structured Entity Data Types  
**Strategy:** Option B+ (Lightweight, Deterministic, Extensible)  
**Duration:** 3 weeks  
**Effort:** ~2,500 LOC, ~75 tests

---

## Executive Summary

This specification defines a **deterministic entity framework** for structured data types (Stocks, Geography, Custom Entities) WITHOUT introducing async evaluation. The implementation preserves architectural purity while achieving 100% Data Types feature coverage.

### Key Principles

1. **Deterministic:** No async evaluation, no external API dependencies in engine core
2. **Backward Compatible:** Extends existing type system without breaking changes
3. **Testable:** All entity behavior fully mockable and snapshot-testable
4. **Extensible:** Plugin architecture for custom entity types
5. **Production-Ready:** Minimal complexity increase (10-15%)

### What This IS

- ✅ Structured entity values with field access
- ✅ Parser support for dot/bracket notation
- ✅ Plugin registration for custom entity types
- ✅ Mock data providers for Stock/Geography demos
- ✅ Complete type safety and error handling

### What This IS NOT

- ❌ Async evaluation or promise-based formula resolution
- ❌ Live external API integration (deferred to v2.0)
- ❌ Auto-refresh or background polling
- ❌ Dependency graph invalidation on entity updates

---

## Phase 1: Entity Value Type System (Week 1)

### 1.1 Core Type Definitions

**File:** `packages/core/src/types/entity-types.ts` (NEW)

```typescript
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
   * - Can be number, string, boolean, or null
   * - Used when entity appears in arithmetic/comparison/concat
   * - Example: Stock entity might display current price
   */
  display: CellValue;
  
  /**
   * Named fields accessible via dot notation
   * - Keys: field names (case-sensitive)
   * - Values: any CellValue (primitives only, no nested entities in v1.0)
   * 
   * Example Stock fields:
   * - Price: 420.50
   * - Change: 5.25
   * - % Change: 0.0126
   * - Market Cap: 3120000000000
   * - Volume: 25450000
   */
  fields: Record<string, CellValue>;
  
  /**
   * Optional metadata (not accessible via formulas)
   */
  metadata?: {
    /** Unique identifier for entity (used for refresh in future) */
    id?: string;
    /** Timestamp of last data update (milliseconds since epoch) */
    lastUpdated?: number;
    /** Data provider identifier (e.g., 'yahoo-finance', 'rest-countries') */
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
   * - Example: 'symbol' for stocks, 'name' for geography
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
  | 'date'    // Serial number representation
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

/**
 * Mock entity data provider
 * Used for demos and testing (no real API calls)
 */
export interface MockEntityProvider {
  /** Provider identifier */
  name: string;
  /** Entity type this provider handles */
  type: string;
  /** Lookup entity by query string (synchronous mock data) */
  resolve(query: string): EntityValue | Error;
}

/**
 * Entity creation helper result
 */
export type EntityCreationResult = 
  | { success: true; entity: EntityValue }
  | { success: false; error: Error };

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
    'Symbol': { label: 'Stock Symbol', description: 'Ticker symbol' },
    'Name': { label: 'Company Name', description: 'Full company name' },
    'Price': { label: 'Current Price', format: '$#,##0.00' },
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
    'Name': { label: 'Country Name', description: 'Official country name' },
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
// TYPE GUARDS
// ============================================================================

/**
 * Type guard: check if value is EntityValue
 */
export function isEntityValue(value: any): value is EntityValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    value.kind === 'entity' &&
    typeof value.type === 'string' &&
    'display' in value &&
    typeof value.fields === 'object'
  );
}

/**
 * Extract display value from entity or return value as-is
 */
export function getDisplayValue(value: CellValue | EntityValue): CellValue {
  if (isEntityValue(value)) {
    return value.display;
  }
  return value;
}
```

---

### 1.2 Type System Integration

**File:** `packages/core/src/types.ts` (MODIFY)

**Add EntityValue to ExtendedCellValue union:**

```typescript
// Import entity types
import type { EntityValue } from './types/entity-types';

/**
 * Extended cell value supporting rich text and entities
 */
export type ExtendedCellValue = CellValue | RichTextValue | EntityValue;
```

**Update Cell interface documentation:**

```typescript
export type Cell = {
  /**
   * Cell value
   * - Primitives: number, string, boolean, null
   * - Rich Text: RichTextValue with formatting runs
   * - Entity: EntityValue with structured fields
   */
  value?: ExtendedCellValue;
  // ... rest of Cell interface
};
```

---

### 1.3 Formula Engine Integration

**File:** `packages/core/src/FormulaEngine.ts` (MODIFY)

**Update cellValueToFormulaValue helper:**

```typescript
import type { EntityValue } from './types/entity-types';
import { isEntityValue, getDisplayValue } from './types/entity-types';

/**
 * Helper: Convert ExtendedCellValue to FormulaValue
 * - RichTextValue → plain text (concatenate runs)
 * - EntityValue → display value
 * - Others → pass through
 */
function cellValueToFormulaValue(value: CellValue | RichTextValue | EntityValue | undefined): FormulaValue {
  if (value === undefined || value === null) return null;
  
  // Check if it's a RichTextValue (has 'runs' property)
  if (typeof value === 'object' && 'runs' in value) {
    // Extract plain text from rich text runs
    return value.runs.map(run => run.text).join('');
  }
  
  // Check if it's an EntityValue (has 'kind' === 'entity')
  if (isEntityValue(value)) {
    // Use display value in formula context
    return value.display;
  }
  
  // Otherwise it's already a valid FormulaValue (string | number | boolean | null)
  return value;
}
```

---

### 1.4 Error Types

**File:** `packages/core/src/types/entity-types.ts` (ADD to existing file)

```typescript
/**
 * Entity-specific error codes
 */
export const ENTITY_ERRORS = {
  /** Field does not exist on entity */
  FIELD_NOT_FOUND: '#FIELD!',
  /** Attempted field access on non-entity value */
  NOT_AN_ENTITY: '#VALUE!',
  /** Entity type not registered */
  UNKNOWN_TYPE: '#NAME?',
  /** Invalid entity data */
  INVALID_ENTITY: '#VALUE!',
} as const;
```

---

### 1.5 Week 1 Deliverables

- [ ] Create `packages/core/src/types/entity-types.ts` (300-400 lines)
- [ ] Update `packages/core/src/types.ts` (add EntityValue to union)
- [ ] Update `packages/core/src/FormulaEngine.ts` (extend cellValueToFormulaValue)
- [ ] Create `packages/core/src/types/__tests__/entity-types.test.ts`
- [ ] Tests: 20 tests
  - Type guard tests (isEntityValue)
  - Display value extraction
  - Schema validation
  - Error scenarios

**Estimate:** 400-500 LOC, 20 tests, 5-7 days

---

## Phase 2: Parser & Field Access (Week 2)

### 2.1 AST Extension

**File:** `packages/core/src/FormulaEngine.ts` (MODIFY AST types)

**Add MemberExpression to AST:**

```typescript
/**
 * AST Node Types
 */
type ASTNode =
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'boolean'; value: boolean }
  | { type: 'null'; value: null }
  | { type: 'reference'; ref: string }
  | { type: 'range'; ref: string }
  | { type: 'function'; name: string; args: ASTNode[] }
  | { type: 'binary'; operator: string; left: ASTNode; right: ASTNode }
  | { type: 'unary'; operator: string; operand: ASTNode }
  | { type: 'array'; elements: ASTNode[] }
  | { type: 'member'; object: ASTNode; property: string; computed: boolean }; // NEW
```

**Member Expression Semantics:**

```typescript
// Dot notation: A1.Price
// → { type: 'member', object: { type: 'reference', ref: 'A1' }, property: 'Price', computed: false }

// Bracket notation: A1["Market Cap"]
// → { type: 'member', object: { type: 'reference', ref: 'A1' }, property: 'Market Cap', computed: false }

// NOT SUPPORTED in v1.0: Dynamic field names
// A1[B1] → Parse error (requires computed: true, deferred to v2.0)
```

---

### 2.2 Parser Extension

**File:** `packages/core/src/FormulaEngine.ts` (MODIFY parser)

**Add member expression parsing:**

```typescript
/**
 * Parse member expression (field access)
 * 
 * Grammar:
 *   MemberExpression := PrimaryExpression ( '.' Identifier | '[' StringLiteral ']' )*
 * 
 * Examples:
 *   A1.Price          → member(ref('A1'), 'Price', false)
 *   A1["Market Cap"]  → member(ref('A1'), 'Market Cap', false)
 *   A1.Address.City   → member(member(ref('A1'), 'Address', false), 'City', false)
 * 
 * NOT supported in v1.0:
 *   A1[B1]            → requires dynamic evaluation (computed: true)
 */
private parseMemberExpression(): ASTNode {
  let expr = this.parsePrimaryExpression();
  
  while (this.current < this.tokens.length) {
    const token = this.tokens[this.current];
    
    // Dot notation: .Identifier
    if (token.type === 'operator' && token.value === '.') {
      this.current++; // consume '.'
      
      const propertyToken = this.tokens[this.current];
      if (propertyToken.type !== 'identifier') {
        throw new Error(`Expected identifier after '.', got ${propertyToken.type}`);
      }
      
      expr = {
        type: 'member',
        object: expr,
        property: propertyToken.value,
        computed: false,
      };
      
      this.current++; // consume identifier
    }
    // Bracket notation: [StringLiteral]
    else if (token.type === 'operator' && token.value === '[') {
      this.current++; // consume '['
      
      const propertyToken = this.tokens[this.current];
      if (propertyToken.type !== 'string') {
        throw new Error(`Expected string literal in bracket notation, got ${propertyToken.type}`);
      }
      
      expr = {
        type: 'member',
        object: expr,
        property: propertyToken.value,
        computed: false, // Still false - we're using string literal, not computed ref
      };
      
      this.current++; // consume string
      
      const closeBracket = this.tokens[this.current];
      if (closeBracket.type !== 'operator' || closeBracket.value !== ']') {
        throw new Error(`Expected ']', got ${closeBracket.type}`);
      }
      
      this.current++; // consume ']'
    }
    else {
      break; // No more member access
    }
  }
  
  return expr;
}
```

**Update expression parsing to use parseMemberExpression:**

```typescript
private parseExpression(): ASTNode {
  return this.parseAdditiveExpression();
}

private parseAdditiveExpression(): ASTNode {
  let left = this.parseMultiplicativeExpression();
  // ... existing logic
}

private parseMultiplicativeExpression(): ASTNode {
  let left = this.parseExponentiationExpression();
  // ... existing logic
}

private parseExponentiationExpression(): ASTNode {
  let left = this.parseUnaryExpression();
  // ... existing logic
}

private parseUnaryExpression(): ASTNode {
  // ... existing logic
  return this.parseMemberExpression(); // Changed from parsePrimaryExpression
}

private parsePrimaryExpression(): ASTNode {
  // ... existing logic (numbers, strings, references, functions, arrays)
}
```

---

### 2.3 Evaluator Extension

**File:** `packages/core/src/FormulaEngine.ts` (MODIFY evaluator)

**Add member expression evaluation:**

```typescript
/**
 * Evaluate member expression (field access on entity)
 * 
 * Behavior:
 * - If object is EntityValue: return fields[property] or #FIELD! if not found
 * - If object is not EntityValue: return #VALUE! (cannot access fields on primitive)
 * - Nested access: A1.Address.City → evaluate recursively
 */
private evaluateMemberExpression(node: ASTNode, context: FormulaContext): FormulaValue {
  if (node.type !== 'member') {
    throw new Error(`Expected member expression, got ${node.type}`);
  }
  
  // Evaluate object (left side of dot/bracket)
  const objectValue = this.evaluate(node.object, context);
  
  // Check if object is an entity
  if (!isEntityValue(objectValue)) {
    // Cannot access fields on non-entity values
    return new Error('#VALUE!');
  }
  
  // Access field
  const fieldName = node.property;
  
  if (!(fieldName in objectValue.fields)) {
    // Field does not exist
    return new Error('#FIELD!');
  }
  
  const fieldValue = objectValue.fields[fieldName];
  
  // Convert field value to FormulaValue (handles nested entities if we add them in v2.0)
  return cellValueToFormulaValue(fieldValue);
}
```

**Update main evaluate() switch:**

```typescript
public evaluate(node: ASTNode, context: FormulaContext): FormulaValue {
  switch (node.type) {
    case 'number':
      return node.value;
    case 'string':
      return node.value;
    case 'boolean':
      return node.value;
    case 'null':
      return null;
    case 'reference':
      return this.evaluateReference(node.ref, context);
    case 'range':
      return this.evaluateRangeReference(node.ref, context);
    case 'function':
      return this.evaluateFunction(node.name, node.args, context);
    case 'binary':
      return this.evaluateBinaryOp(node.operator, node.left, node.right, context);
    case 'unary':
      return this.evaluateUnaryOp(node.operator, node.operand, context);
    case 'array':
      return this.evaluateArray(node.elements, context);
    case 'member':
      return this.evaluateMemberExpression(node, context); // NEW
    default:
      return new Error('#VALUE!');
  }
}
```

---

### 2.4 Tokenizer Extension

**File:** `packages/core/src/FormulaEngine.ts` (MODIFY tokenizer)

**Update tokenizer to recognize dot and brackets as operators:**

```typescript
private tokenize(formula: string): Token[] {
  // ... existing tokenizer logic
  
  // Operators including dot and brackets
  const operators = ['+', '-', '*', '/', '^', '=', '<', '>', '&', '(', ')', ',', ':', '.', '[', ']'];
  
  // ... rest of tokenizer
}
```

**Note:** Dot (`.`) and brackets (`[`, `]`) already handled by existing operator tokenization.

---

### 2.5 Error Behavior Matrix

| Scenario | Example | Result | Error Code |
|----------|---------|--------|------------|
| Valid field access | `=A1.Price` where A1 is Stock entity | Field value | - |
| Field not found | `=A1.InvalidField` | Error | `#FIELD!` |
| Non-entity dereference | `=A1.Price` where A1 is 123 | Error | `#VALUE!` |
| Nested field access | `=A1.Address.City` (if nested entities supported) | Field value | - |
| Bracket notation | `=A1["Market Cap"]` | Field value | - |
| Empty field name | `=A1.` or `=A1[""]` | Parse error | - |
| Dynamic field (unsupported) | `=A1[B1]` | Parse error | - |

---

### 2.6 Week 2 Deliverables

- [ ] Extend AST with MemberExpression node type
- [ ] Update parser to support dot/bracket notation
- [ ] Update evaluator with member expression logic
- [ ] Update tokenizer (minimal changes needed)
- [ ] Create `packages/core/src/__tests__/entity-field-access.test.ts`
- [ ] Tests: 25 tests
  - Dot notation parsing
  - Bracket notation parsing
  - Field access evaluation
  - Error cases (#FIELD!, #VALUE!)
  - Nested access (if supported)

**Estimate:** 600-800 LOC, 25 tests, 5-7 days

---

## Phase 3: Entity Framework & Plugins (Week 3)

### 3.1 Entity Manager

**File:** `packages/core/src/EntityManager.ts` (NEW)

```typescript
/**
 * EntityManager.ts
 * 
 * Central registry for entity types and mock data providers.
 * Handles entity creation, validation, and plugin registration.
 */

import type { EntityValue, EntityTypeSchema, MockEntityProvider, EntityCreationResult } from './types/entity-types';
import { STOCK_SCHEMA, GEOGRAPHY_SCHEMA } from './types/entity-types';
import type { CellValue } from './types';

/**
 * Entity Manager - singleton registry for entity types
 */
export class EntityManager {
  private schemas = new Map<string, EntityTypeSchema>();
  private providers = new Map<string, MockEntityProvider>();
  
  constructor() {
    // Register built-in types
    this.registerEntityType(STOCK_SCHEMA);
    this.registerEntityType(GEOGRAPHY_SCHEMA);
  }
  
  /**
   * Register entity type schema
   */
  registerEntityType(schema: EntityTypeSchema): void {
    if (this.schemas.has(schema.typename)) {
      throw new Error(`Entity type '${schema.typename}' is already registered`);
    }
    
    // Validate schema
    if (!schema.displayField || !(schema.displayField in schema.fields)) {
      throw new Error(`Display field '${schema.displayField}' must exist in fields`);
    }
    
    this.schemas.set(schema.typename, schema);
  }
  
  /**
   * Register mock data provider
   */
  registerProvider(provider: MockEntityProvider): void {
    const key = `${provider.type}:${provider.name}`;
    this.providers.set(key, provider);
  }
  
  /**
   * Get entity type schema
   */
  getSchema(typename: string): EntityTypeSchema | undefined {
    return this.schemas.get(typename);
  }
  
  /**
   * Create entity from fields (manual creation)
   */
  createEntity(
    type: string,
    fields: Record<string, CellValue>,
    metadata?: EntityValue['metadata']
  ): EntityCreationResult {
    const schema = this.schemas.get(type);
    
    if (!schema) {
      return {
        success: false,
        error: new Error(`#NAME?`) // Unknown entity type
      };
    }
    
    // Validate display field exists
    if (!(schema.displayField in fields)) {
      return {
        success: false,
        error: new Error(`#VALUE!`) // Missing display field
      };
    }
    
    // Create entity
    const entity: EntityValue = {
      kind: 'entity',
      type,
      display: fields[schema.displayField],
      fields,
      metadata,
    };
    
    return { success: true, entity };
  }
  
  /**
   * Resolve entity using registered provider
   */
  resolveEntity(type: string, query: string, providerName?: string): EntityCreationResult {
    // Find provider
    let provider: MockEntityProvider | undefined;
    
    if (providerName) {
      provider = this.providers.get(`${type}:${providerName}`);
    } else {
      // Find first provider for this type
      for (const [key, p] of this.providers) {
        if (p.type === type) {
          provider = p;
          break;
        }
      }
    }
    
    if (!provider) {
      return {
        success: false,
        error: new Error(`#NAME?`) // No provider found
      };
    }
    
    // Resolve entity
    const result = provider.resolve(query);
    
    if (result instanceof Error) {
      return { success: false, error: result };
    }
    
    return { success: true, entity: result };
  }
  
  /**
   * Validate entity against schema
   */
  validateEntity(entity: EntityValue): boolean {
    const schema = this.schemas.get(entity.type);
    
    if (!schema) {
      return false; // Unknown type
    }
    
    // Check display field exists
    if (!(schema.displayField in entity.fields)) {
      return false;
    }
    
    // Check required fields (if specified in metadata)
    if (schema.fieldMetadata) {
      for (const [fieldName, metadata] of Object.entries(schema.fieldMetadata)) {
        if (metadata.required && !(fieldName in entity.fields)) {
          return false;
        }
      }
    }
    
    return true;
  }
  
  /**
   * Get all registered type names
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.schemas.keys());
  }
}

/**
 * Singleton instance
 */
export const entityManager = new EntityManager();
```

---

### 3.2 Mock Data Providers

**File:** `packages/core/src/providers/MockStockProvider.ts` (NEW)

```typescript
/**
 * MockStockProvider.ts
 * 
 * Mock stock data provider for demos and testing.
 * NO real API calls - synchronous mock data only.
 */

import type { EntityValue, MockEntityProvider } from '../types/entity-types';

/**
 * Mock stock data (static dataset)
 */
const MOCK_STOCKS: Record<string, EntityValue> = {
  'MSFT': {
    kind: 'entity',
    type: 'stock',
    display: 'MSFT',
    fields: {
      'Symbol': 'MSFT',
      'Name': 'Microsoft Corporation',
      'Price': 420.50,
      'Change': 5.25,
      'Change %': 0.0126,
      'Market Cap': 3_120_000_000_000,
      'Volume': 25_450_000,
      '52W High': 425.75,
      '52W Low': 275.30,
      'P/E Ratio': 35.2,
      'Dividend Yield': 0.0085,
    },
    metadata: {
      id: 'stock:MSFT',
      lastUpdated: Date.now(),
      provider: 'mock',
      query: 'MSFT',
    }
  },
  'AAPL': {
    kind: 'entity',
    type: 'stock',
    display: 'AAPL',
    fields: {
      'Symbol': 'AAPL',
      'Name': 'Apple Inc.',
      'Price': 185.25,
      'Change': -2.10,
      'Change %': -0.0112,
      'Market Cap': 2_950_000_000_000,
      'Volume': 52_100_000,
      '52W High': 199.62,
      '52W Low': 165.50,
      'P/E Ratio': 30.1,
      'Dividend Yield': 0.0052,
    },
    metadata: {
      id: 'stock:AAPL',
      lastUpdated: Date.now(),
      provider: 'mock',
      query: 'AAPL',
    }
  },
  'GOOGL': {
    kind: 'entity',
    type: 'stock',
    display: 'GOOGL',
    fields: {
      'Symbol': 'GOOGL',
      'Name': 'Alphabet Inc.',
      'Price': 142.80,
      'Change': 1.35,
      'Change %': 0.0095,
      'Market Cap': 1_800_000_000_000,
      'Volume': 18_300_000,
      '52W High': 151.55,
      '52W Low': 120.75,
      'P/E Ratio': 26.5,
      'Dividend Yield': 0,
    },
    metadata: {
      id: 'stock:GOOGL',
      lastUpdated: Date.now(),
      provider: 'mock',
      query: 'GOOGL',
    }
  },
  // Add 5-10 more stocks for demonstration
};

/**
 * Mock stock provider
 */
export const mockStockProvider: MockEntityProvider = {
  name: 'mock',
  type: 'stock',
  
  resolve(query: string): EntityValue | Error {
    const symbol = query.toUpperCase();
    
    if (symbol in MOCK_STOCKS) {
      return MOCK_STOCKS[symbol];
    }
    
    return new Error('#N/A'); // Stock not found
  }
};
```

**File:** `packages/core/src/providers/MockGeographyProvider.ts` (NEW)

```typescript
/**
 * MockGeographyProvider.ts
 * 
 * Mock geography data provider for demos and testing.
 * NO real API calls - synchronous mock data only.
 */

import type { EntityValue, MockEntityProvider } from '../types/entity-types';

/**
 * Mock geography data (static dataset)
 */
const MOCK_COUNTRIES: Record<string, EntityValue> = {
  'USA': {
    kind: 'entity',
    type: 'geography',
    display: 'United States',
    fields: {
      'Name': 'United States',
      'Capital': 'Washington, D.C.',
      'Population': 331_000_000,
      'Area': 9_833_517,
      'Region': 'Americas',
      'Subregion': 'North America',
      'Currency': 'USD',
      'Language': 'English',
      'GDP': 25_460_000_000_000,
      'Timezone': 'UTC-5 to UTC-10',
    },
    metadata: {
      id: 'geo:USA',
      lastUpdated: Date.now(),
      provider: 'mock',
      query: 'USA',
    }
  },
  // Add more countries...
};

/**
 * Mock geography provider
 */
export const mockGeographyProvider: MockEntityProvider = {
  name: 'mock',
  type: 'geography',
  
  resolve(query: string): EntityValue | Error {
    const key = query.toUpperCase();
    
    if (key in MOCK_COUNTRIES) {
      return MOCK_COUNTRIES[key];
    }
    
    return new Error('#N/A'); // Country not found
  }
};
```

---

### 3.3 Integration with FormulaEngine

**File:** `packages/core/src/FormulaEngine.ts` (MODIFY)

**Add entity manager reference:**

```typescript
import { entityManager } from './EntityManager';

export class FormulaEngine {
  // ... existing properties
  
  /**
   * Get entity manager instance
   */
  get entities() {
    return entityManager;
  }
}
```

---

### 3.4 Helper Functions for Entity Creation

**File:** `packages/core/src/worksheet.ts` (MODIFY)

**Add entity creation helpers:**

```typescript
import { entityManager } from './EntityManager';
import type { EntityValue } from './types/entity-types';

export class Worksheet {
  // ... existing methods
  
  /**
   * Create entity in cell (manual creation)
   */
  setEntityValue(
    address: Address,
    type: string,
    fields: Record<string, CellValue>,
    metadata?: EntityValue['metadata']
  ): void {
    const result = entityManager.createEntity(type, fields, metadata);
    
    if (!result.success) {
      throw result.error;
    }
    
    this.setCellValue(address, result.entity);
  }
  
  /**
   * Resolve entity using provider and set in cell
   */
  resolveEntity(
    address: Address,
    type: string,
    query: string,
    providerName?: string
  ): void {
    const result = entityManager.resolveEntity(type, query, providerName);
    
    if (!result.success) {
      throw result.error;
    }
    
    this.setCellValue(address, result.entity);
  }
}
```

---

### 3.5 Week 3 Deliverables

- [ ] Create `packages/core/src/EntityManager.ts` (300-400 lines)
- [ ] Create `packages/core/src/providers/MockStockProvider.ts` (200-250 lines)
- [ ] Create `packages/core/src/providers/MockGeographyProvider.ts` (200-250 lines)
- [ ] Update `packages/core/src/worksheet.ts` (add entity helpers)
- [ ] Update `packages/core/src/FormulaEngine.ts` (expose entity manager)
- [ ] Create `packages/core/src/__tests__/EntityManager.test.ts`
- [ ] Create `packages/core/src/__tests__/entity-providers.test.ts`
- [ ] Tests: 30 tests
  - Schema registration
  - Entity creation/validation
  - Provider resolution
  - Mock stock data
  - Mock geography data
  - Error scenarios

**Estimate:** 1,200-1,500 LOC, 30 tests, 5-7 days

---

## Testing Strategy

### Unit Tests (75 tests total)

**Week 1 - Type System (20 tests):**
- `entity-types.test.ts`: Type guards, display value extraction, schema validation
- Test coverage: >95%

**Week 2 - Parser & Evaluation (25 tests):**
- `entity-field-access.test.ts`: Parsing, evaluation, error handling
- Test coverage: >90%

**Week 3 - Framework (30 tests):**
- `EntityManager.test.ts`: Registration, creation, validation
- `entity-providers.test.ts`: Mock data resolution, error cases
- Test coverage: >95%

### Integration Tests

**File:** `packages/core/src/__tests__/entity-integration.test.ts` (NEW)

**Test scenarios:**
- Entity in cell → field access in formula
- Entity arithmetic (uses display value)
- Entity comparison (uses display value)
- Entity concatenation (uses display value)
- Entity in SUM/AVERAGE (uses display value)
- Nested formulas with entities

---

## Documentation

### User Documentation

**File:** `docs/DATA_TYPES_USER_GUIDE.md` (NEW)

Contents:
- Overview of entity types
- Creating entities (manual + provider)
- Field access syntax (dot/bracket)
- Built-in types (Stock, Geography)
- Custom entity types (plugin registration)
- Error codes and troubleshooting
- Examples and use cases

### API Documentation

**File:** `docs/DATA_TYPES_API.md` (NEW)

Contents:
- EntityValue type reference
- EntityTypeSchema specification
- EntityManager API
- MockEntityProvider interface
- Helper functions (createEntity, resolveEntity)
- Plugin development guide

---

## Performance Considerations

### Memory Impact

**Entity value size:**
- Typical Stock entity: ~500 bytes (10 fields)
- Typical Geography entity: ~400 bytes (10 fields)
- 1000 entities: ~500KB

**Cache considerations:**
- No additional caching needed (entities are static data)
- Dependency graph unchanged (entities are cell values)

### Evaluation Performance

**Field access overhead:**
- Member expression parsing: <0.1ms (one-time)
- Field dereference: O(1) map lookup (<1µs)
- No performance impact on existing formulas

---

## Migration Path

### Backward Compatibility

**Guaranteed:**
- All existing formulas work unchanged
- ExtendedCellValue is superset (backward compatible)
- No changes to existing API surface

### Forward Compatibility

**Future async evaluation (v2.0):**
- Entity structure supports async resolution
- Add `status: 'resolved' | 'pending' | 'error'` field
- Evaluator can check status and await if needed
- No formula syntax changes required

---

## Success Criteria

### Definition of Done

- [ ] All type definitions complete and exported
- [ ] Parser supports dot/bracket notation
- [ ] Evaluator handles field access correctly
- [ ] EntityManager with registration API
- [ ] Mock providers for Stock + Geography
- [ ] 75+ tests passing (100% pass rate)
- [ ] Documentation complete (user + API guides)
- [ ] Zero breaking changes
- [ ] Performance impact <5%

### Feature Coverage

**Achieves 100% Data Types scope:**
- ✅ Number, text, boolean, error
- ✅ Date/time (serial model)
- ✅ Percentage/currency (formatting)
- ✅ Rich text values
- ✅ Entity values with fields
- ✅ Extensible entity types

---

## Risk Mitigation

### Technical Risks

| Risk | Mitigation |
|------|------------|
| Parser complexity | Keep grammar simple, defer dynamic fields to v2.0 |
| AST breaking changes | Add new node type, don't modify existing nodes |
| Performance regression | Benchmark before/after, optimize hot paths |
| Type system complexity | Use discriminated unions, comprehensive type guards |

### Scope Risks

| Risk | Mitigation |
|------|------------|
| Feature creep (async) | Explicitly defer to v2.0, maintain focus |
| Custom provider API complexity | Start with mock providers only, expand later |
| Nested entity support | Defer to v2.0, keep fields as primitives only |

---

## Timeline

| Week | Phase | Deliverables | LOC | Tests |
|------|-------|--------------|-----|-------|
| 1 | Type System | entity-types.ts, type integration | 400-500 | 20 |
| 2 | Parser & Eval | AST, parser, evaluator extensions | 600-800 | 25 |
| 3 | Framework | EntityManager, mock providers | 1200-1500 | 30 |
| **Total** | **3 weeks** | **Complete entity framework** | **~2,500** | **75** |

---

## Next Steps

Upon approval:
1. Create `entity-types.ts` with full type definitions
2. Update `types.ts` to include EntityValue in union
3. Extend FormulaEngine's cellValueToFormulaValue helper
4. Write Week 1 unit tests
5. Daily progress updates with test pass rates

---

**Status:** Ready for implementation approval  
**Confidence Level:** Very High (95%+)  
**Risk Level:** Low (backward compatible, deterministic, well-scoped)
