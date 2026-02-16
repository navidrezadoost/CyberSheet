/**
 * metadata/index.ts
 * 
 * Wave 0 Day 4 - Phase 2.6: Registration Unification
 * 
 * SINGLE SOURCE OF TRUTH for all function metadata.
 * 
 * This module consolidates all StrictFunctionMetadata from 9 categories
 * into a single canonical export. The runtime registry consumes ONLY this
 * metadata - no tuples, no legacy formats, no partial metadata.
 * 
 * ARCHITECTURAL PRINCIPLE:
 *   Metadata drives execution.
 *   What is validated is what is executed.
 *   No drift, no duplication, no split-brain.
 * 
 * Before: 279 functions registered via tuple arrays (function-initializer.ts)
 * After:  279 functions registered via StrictFunctionMetadata (this file)
 * 
 * This is the moment the Error Engine Layer becomes runtime-active.
 */

import type { StrictFunctionMetadata } from '../../types/formula-types';

// Import all metadata from 12 categories
import { MATH_METADATA } from './math-metadata';
import { FINANCIAL_METADATA } from './financial-metadata';
import { LOGICAL_METADATA } from './logical-metadata';
import { DATETIME_METADATA } from './datetime-metadata';
import { LOOKUP_METADATA } from './lookup-metadata';
import { TEXT_METADATA } from './text-metadata';
import { ARRAY_METADATA } from './array-metadata';
import { INFORMATION_METADATA } from './information-metadata';
import { STATISTICAL_METADATA } from './statistical-metadata';
import { ENGINEERING_METADATA } from './engineering-metadata';
import { EXOTIC_METADATA } from './exotic-metadata';
import { FUNCTIONAL_METADATA } from './functional-metadata';

/**
 * ALL_FUNCTION_METADATA
 * 
 * Complete metadata for all 279 built-in functions.
 * 
 * Composition (Wave 0 Day 2):
 * - Math: 42 functions
 * - Financial: 18 functions
 * - Logical: 17 functions
 * - DateTime: 20 functions
 * - Lookup: 12 functions
 * - Text: 31 functions
 * - Array: 20 functions
 * - Information: 15 functions
 * - Statistical: 94 functions
 * 
 * ErrorStrategy Distribution:
 * - PROPAGATE_FIRST: 191 functions (standard)
 * - SKIP_ERRORS: 58 functions (aggregations)
 * - LAZY_EVALUATION: 5 functions (conditionals)
 * - SHORT_CIRCUIT: 2 functions (AND, OR)
 * - LOOKUP_STRICT: 7 functions (lookups)
 * - FINANCIAL_STRICT: 18 functions (financial)
 * 
 * Volatile Functions: 5 (RAND, RANDBETWEEN, NOW, TODAY, RANDARRAY)
 * Iterative Functions: 3 (IRR, XIRR, RATE)
 * Context-Aware Functions: 5 (ROW, COLUMN, ISFORMULA, CELL, INFO)
 * 
 * This array is the ONLY source consumed by FunctionRegistry.
 * Any function not in this array is not registered.
 * Any metadata change here immediately affects runtime behavior.
 */
export const ALL_FUNCTION_METADATA: StrictFunctionMetadata[] = [
  ...MATH_METADATA,
  ...FINANCIAL_METADATA,
  ...LOGICAL_METADATA,
  ...DATETIME_METADATA,
  ...LOOKUP_METADATA,
  ...TEXT_METADATA,
  ...ARRAY_METADATA,
  ...INFORMATION_METADATA,
  ...STATISTICAL_METADATA,
  ...ENGINEERING_METADATA,
  ...EXOTIC_METADATA,
  ...FUNCTIONAL_METADATA,
];

/**
 * Total function count validation
 * 
 * Expected: 342 functions (340 + 2 EFFECT/NOMINAL)
 * If this assertion fails at runtime, metadata files are incomplete.
 */
const EXPECTED_FUNCTION_COUNT = 342;

if (ALL_FUNCTION_METADATA.length !== EXPECTED_FUNCTION_COUNT) {
  console.warn(
    `[metadata/index] Function count mismatch! Expected ${EXPECTED_FUNCTION_COUNT}, got ${ALL_FUNCTION_METADATA.length}. ` +
    `Metadata files may be incomplete.`
  );
}
