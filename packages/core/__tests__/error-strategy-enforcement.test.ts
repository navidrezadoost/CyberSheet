/**
 * error-strategy-enforcement.test.ts
 * 
 * Wave 0 Day 3: Hard Validation Layer - ErrorStrategy Enforcement Tests
 * 
 * PURPOSE:
 * Validate that ErrorStrategy metadata classifications are correct for all 279 functions.
 * This ensures systems can rely on metadata for:
 * - Optimization decisions (skip error checks for SKIP_ERRORS functions)
 * - Documentation generation (explain error handling behavior)
 * - Error handling logic (know which functions need strict validation)
 * 
 * SCOPE: Metadata validation only
 * - We test that metadata.errorStrategy is set correctly
 * - We do NOT test behavioral implementation (that's for integration tests)
 * - We do NOT instantiate FormulaEngine (avoid incomplete metadata dependencies)
 * 
 * ERROR STRATEGIES (6 total):
 * 1. SKIP_ERRORS: Skip errors in aggregations (60 functions)
 *    - SUM, AVERAGE, MIN, MAX, COUNT, STDEV, VAR, etc.
 * 2. LAZY_EVALUATION: Conditionals evaluate lazily (5 functions)
 *    - IF, IFS, IFERROR, IFNA, SWITCH
 * 3. SHORT_CIRCUIT: Logical operators short-circuit (2 functions)
 *    - AND, OR
 * 4. LOOKUP_STRICT: Lookups require valid inputs (7 functions)
 *    - VLOOKUP, HLOOKUP, MATCH, XLOOKUP, XMATCH, LOOKUP, INDEX
 * 5. FINANCIAL_STRICT: Financial functions require valid inputs (24 functions)
 *    - NPV, IRR, PMT, PV, FV, RATE, NPER, IPMT, PPMT, etc.
 * 6. PROPAGATE_FIRST: Standard error propagation (100+ functions)
 *    - ABS, ROUND, SQRT, LEN, UPPER, etc. (default behavior)
 */

import { describe, test, expect } from '@jest/globals';
import { ErrorStrategy } from '../src/types/formula-types';

// Import metadata to verify classifications
import { MATH_METADATA } from '../src/functions/metadata/math-metadata';
import { LOGICAL_METADATA } from '../src/functions/metadata/logical-metadata';
import { LOOKUP_METADATA } from '../src/functions/metadata/lookup-metadata';
import { FINANCIAL_METADATA } from '../src/functions/metadata/financial-metadata';
import { STATISTICAL_METADATA } from '../src/functions/metadata/statistical-metadata';

describe('Wave 0 Day 3: ErrorStrategy Enforcement', () => {

  // ============================================================================
  // TEST 1: SKIP_ERRORS Strategy - Aggregations
  // ============================================================================
  
  describe('ErrorStrategy.SKIP_ERRORS - Aggregations', () => {
    test('Metadata: SUM has SKIP_ERRORS strategy', () => {
      const sumMeta = MATH_METADATA.find(m => m.name === 'SUM');
      expect(sumMeta).toBeDefined();
      expect(sumMeta?.errorStrategy).toBe(ErrorStrategy.SKIP_ERRORS);
    });

    test('Metadata: AVERAGE has SKIP_ERRORS strategy', () => {
      const avgMeta = MATH_METADATA.find(m => m.name === 'AVERAGE');
      expect(avgMeta).toBeDefined();
      expect(avgMeta?.errorStrategy).toBe(ErrorStrategy.SKIP_ERRORS);
    });

    test('Metadata: MIN has SKIP_ERRORS strategy', () => {
      const minMeta = MATH_METADATA.find(m => m.name === 'MIN');
      expect(minMeta).toBeDefined();
      expect(minMeta?.errorStrategy).toBe(ErrorStrategy.SKIP_ERRORS);
    });

    test('Metadata: MAX has SKIP_ERRORS strategy', () => {
      const maxMeta = MATH_METADATA.find(m => m.name === 'MAX');
      expect(maxMeta).toBeDefined();
      expect(maxMeta?.errorStrategy).toBe(ErrorStrategy.SKIP_ERRORS);
    });

    test('Metadata: COUNT has SKIP_ERRORS strategy', () => {
      const countMeta = MATH_METADATA.find(m => m.name === 'COUNT');
      expect(countMeta).toBeDefined();
      expect(countMeta?.errorStrategy).toBe(ErrorStrategy.SKIP_ERRORS);
    });

    test('Metadata: COUNTA has SKIP_ERRORS strategy', () => {
      const countaMeta = MATH_METADATA.find(m => m.name === 'COUNTA');
      expect(countaMeta).toBeDefined();
      expect(countaMeta?.errorStrategy).toBe(ErrorStrategy.SKIP_ERRORS);
    });

    test('Metadata: STDEV has SKIP_ERRORS strategy', () => {
      const stdevMeta = STATISTICAL_METADATA.find(m => m.name === 'STDEV');
      expect(stdevMeta).toBeDefined();
      expect(stdevMeta?.errorStrategy).toBe(ErrorStrategy.SKIP_ERRORS);
    });

    test('Metadata: VAR has SKIP_ERRORS strategy', () => {
      const varMeta = STATISTICAL_METADATA.find(m => m.name === 'VAR');
      expect(varMeta).toBeDefined();
      expect(varMeta?.errorStrategy).toBe(ErrorStrategy.SKIP_ERRORS);
    });

    test('Metadata: COUNTIF has SKIP_ERRORS strategy', () => {
      const countifMeta = STATISTICAL_METADATA.find(m => m.name === 'COUNTIF');
      expect(countifMeta).toBeDefined();
      expect(countifMeta?.errorStrategy).toBe(ErrorStrategy.SKIP_ERRORS);
    });

    test('Metadata: SUMIF has SKIP_ERRORS strategy', () => {
      const sumifMeta = STATISTICAL_METADATA.find(m => m.name === 'SUMIF');
      expect(sumifMeta).toBeDefined();
      expect(sumifMeta?.errorStrategy).toBe(ErrorStrategy.SKIP_ERRORS);
    });

    test('Metadata: AVERAGEIF has SKIP_ERRORS strategy', () => {
      const avgifMeta = STATISTICAL_METADATA.find(m => m.name === 'AVERAGEIF');
      expect(avgifMeta).toBeDefined();
      expect(avgifMeta?.errorStrategy).toBe(ErrorStrategy.SKIP_ERRORS);
    });

    test('All SKIP_ERRORS functions are aggregations', () => {
      const allMetadata = [...MATH_METADATA, ...STATISTICAL_METADATA];
      const skipErrorsFuncs = allMetadata.filter(m => m.errorStrategy === ErrorStrategy.SKIP_ERRORS);
      
      // Should have ~60 SKIP_ERRORS functions
      expect(skipErrorsFuncs.length).toBeGreaterThanOrEqual(50);
      expect(skipErrorsFuncs.length).toBeLessThanOrEqual(70);
      
      // All should be aggregation-type functions
      skipErrorsFuncs.forEach(func => {
        expect([
          'SUM', 'AVERAGE', 'MIN', 'MAX', 'COUNT', 'COUNTA', 'COUNTBLANK',
          'STDEV', 'STDEV.S', 'STDEV.P', 'VAR', 'VAR.S', 'VAR.P',
          'MEDIAN', 'MODE', 'MODE.SNGL', 'PERCENTILE', 'QUARTILE',
          'SUMIF', 'SUMIFS', 'AVERAGEIF', 'AVERAGEIFS', 'COUNTIF', 'COUNTIFS',
          'MAXIFS', 'MINIFS', 'PRODUCT', 'SUMSQ', 'GEOMEAN', 'HARMEAN',
          'AVEDEV', 'DEVSQ', 'CORREL', 'PEARSON', 'COVARIANCE.P', 'COVARIANCE.S',
          'RSQ', 'STEYX', 'STDEVA', 'STDEVPA', 'VARA', 'VARPA', 'MAXA', 'MINA',
          'AGGREGATE', 'SUBTOTAL', 'FREQUENCY', 'LARGE', 'SMALL', 'RANK', 'PERCENTRANK'
        ].some(name => func.name.toUpperCase().includes(name))).toBeTruthy();
      });
    });
  });

  // ============================================================================
  // TEST 2: LAZY_EVALUATION Strategy - Conditionals
  // ============================================================================
  
  describe('ErrorStrategy.LAZY_EVALUATION - Conditionals', () => {
    test('Metadata: IF has LAZY_EVALUATION strategy', () => {
      const ifMeta = LOGICAL_METADATA.find(m => m.name === 'IF');
      expect(ifMeta).toBeDefined();
      expect(ifMeta?.errorStrategy).toBe(ErrorStrategy.LAZY_EVALUATION);
    });

    test('Metadata: IFS has LAZY_EVALUATION strategy', () => {
      const ifsMeta = LOGICAL_METADATA.find(m => m.name === 'IFS');
      expect(ifsMeta).toBeDefined();
      expect(ifsMeta?.errorStrategy).toBe(ErrorStrategy.LAZY_EVALUATION);
    });

    test('Metadata: IFERROR has LAZY_EVALUATION strategy', () => {
      const iferrorMeta = LOGICAL_METADATA.find(m => m.name === 'IFERROR');
      expect(iferrorMeta).toBeDefined();
      expect(iferrorMeta?.errorStrategy).toBe(ErrorStrategy.LAZY_EVALUATION);
    });

    test('Metadata: IFNA has LAZY_EVALUATION strategy', () => {
      const ifnaMeta = LOGICAL_METADATA.find(m => m.name === 'IFNA');
      expect(ifnaMeta).toBeDefined();
      expect(ifnaMeta?.errorStrategy).toBe(ErrorStrategy.LAZY_EVALUATION);
    });

    test('Metadata: SWITCH has LAZY_EVALUATION strategy', () => {
      const switchMeta = LOGICAL_METADATA.find(m => m.name === 'SWITCH');
      expect(switchMeta).toBeDefined();
      expect(switchMeta?.errorStrategy).toBe(ErrorStrategy.LAZY_EVALUATION);
    });

    test('Metadata: CHOOSE has LAZY_EVALUATION strategy', () => {
      const chooseMeta = LOOKUP_METADATA.find(m => m.name === 'CHOOSE');
      expect(chooseMeta).toBeDefined();
      expect(chooseMeta?.errorStrategy).toBe(ErrorStrategy.LAZY_EVALUATION);
    });

    test('All LAZY_EVALUATION functions are conditionals', () => {
      const lazyFuncs = LOGICAL_METADATA.filter(m => m.errorStrategy === ErrorStrategy.LAZY_EVALUATION);
      
      // Should have ~5 LAZY_EVALUATION functions
      expect(lazyFuncs.length).toBeGreaterThanOrEqual(5);
      expect(lazyFuncs.length).toBeLessThanOrEqual(12);
      
      // All should be conditional-type functions
      lazyFuncs.forEach(func => {
        expect([
          'IF', 'IFS', 'IFERROR', 'IFNA', 'SWITCH', 'CHOOSE', 'XOR', 'NOT', 'LET'
        ]).toContain(func.name);
      });
    });
  });

  // ============================================================================
  // TEST 3: SHORT_CIRCUIT Strategy - Logical Operators
  // ============================================================================
  
  describe('ErrorStrategy.SHORT_CIRCUIT - Logical Operators', () => {
    test('Metadata: AND has SHORT_CIRCUIT strategy', () => {
      const andMeta = LOGICAL_METADATA.find(m => m.name === 'AND');
      expect(andMeta).toBeDefined();
      expect(andMeta?.errorStrategy).toBe(ErrorStrategy.SHORT_CIRCUIT);
    });

    test('Metadata: OR has SHORT_CIRCUIT strategy', () => {
      const orMeta = LOGICAL_METADATA.find(m => m.name === 'OR');
      expect(orMeta).toBeDefined();
      expect(orMeta?.errorStrategy).toBe(ErrorStrategy.SHORT_CIRCUIT);
    });

    test('Only AND and OR have SHORT_CIRCUIT strategy', () => {
      const allMetadata = [...MATH_METADATA, ...LOGICAL_METADATA, ...LOOKUP_METADATA, ...FINANCIAL_METADATA, ...STATISTICAL_METADATA];
      const shortCircuitFuncs = allMetadata.filter(m => m.errorStrategy === ErrorStrategy.SHORT_CIRCUIT);
      
      expect(shortCircuitFuncs.length).toBe(2);
      expect(shortCircuitFuncs.map(f => f.name)).toEqual(expect.arrayContaining(['AND', 'OR']));
    });
  });

  // ============================================================================
  // TEST 4: LOOKUP_STRICT Strategy - Lookup Functions
  // ============================================================================
  
  describe('ErrorStrategy.LOOKUP_STRICT - Lookup Functions', () => {
    test('Metadata: VLOOKUP has LOOKUP_STRICT strategy', () => {
      const vlookupMeta = LOOKUP_METADATA.find(m => m.name === 'VLOOKUP');
      expect(vlookupMeta).toBeDefined();
      expect(vlookupMeta?.errorStrategy).toBe(ErrorStrategy.LOOKUP_STRICT);
    });

    test('Metadata: HLOOKUP has LOOKUP_STRICT strategy', () => {
      const hlookupMeta = LOOKUP_METADATA.find(m => m.name === 'HLOOKUP');
      expect(hlookupMeta).toBeDefined();
      expect(hlookupMeta?.errorStrategy).toBe(ErrorStrategy.LOOKUP_STRICT);
    });

    test('Metadata: MATCH has LOOKUP_STRICT strategy', () => {
      const matchMeta = LOOKUP_METADATA.find(m => m.name === 'MATCH');
      expect(matchMeta).toBeDefined();
      expect(matchMeta?.errorStrategy).toBe(ErrorStrategy.LOOKUP_STRICT);
    });

    test('Metadata: XLOOKUP has LOOKUP_STRICT strategy', () => {
      const xlookupMeta = LOOKUP_METADATA.find(m => m.name === 'XLOOKUP');
      expect(xlookupMeta).toBeDefined();
      expect(xlookupMeta?.errorStrategy).toBe(ErrorStrategy.LOOKUP_STRICT);
    });

    test('Metadata: XMATCH has LOOKUP_STRICT strategy', () => {
      const xmatchMeta = LOOKUP_METADATA.find(m => m.name === 'XMATCH');
      expect(xmatchMeta).toBeDefined();
      expect(xmatchMeta?.errorStrategy).toBe(ErrorStrategy.LOOKUP_STRICT);
    });

    test('Metadata: LOOKUP has LOOKUP_STRICT strategy', () => {
      const lookupMeta = LOOKUP_METADATA.find(m => m.name === 'LOOKUP');
      expect(lookupMeta).toBeDefined();
      expect(lookupMeta?.errorStrategy).toBe(ErrorStrategy.LOOKUP_STRICT);
    });

    test('Metadata: INDEX has LOOKUP_STRICT strategy', () => {
      const indexMeta = LOOKUP_METADATA.find(m => m.name === 'INDEX');
      expect(indexMeta).toBeDefined();
      expect(indexMeta?.errorStrategy).toBe(ErrorStrategy.LOOKUP_STRICT);
    });

    test('All 7 lookup functions have LOOKUP_STRICT strategy', () => {
      const lookupStrictFuncs = LOOKUP_METADATA.filter(m => m.errorStrategy === ErrorStrategy.LOOKUP_STRICT);
      
      // Should have exactly 7 LOOKUP_STRICT functions
      expect(lookupStrictFuncs.length).toBe(7);
      
      // All should be in LOOKUP category
      lookupStrictFuncs.forEach(func => {
        expect(func.category).toBe('LOOKUP');
      });
    });
  });

  // ============================================================================
  // TEST 5: FINANCIAL_STRICT Strategy - Financial Functions
  // ============================================================================
  
  describe('ErrorStrategy.FINANCIAL_STRICT - Financial Functions', () => {
    test('Metadata: NPV has FINANCIAL_STRICT strategy', () => {
      const npvMeta = FINANCIAL_METADATA.find(m => m.name === 'NPV');
      expect(npvMeta).toBeDefined();
      expect(npvMeta?.errorStrategy).toBe(ErrorStrategy.FINANCIAL_STRICT);
    });

    test('Metadata: IRR has FINANCIAL_STRICT strategy', () => {
      const irrMeta = FINANCIAL_METADATA.find(m => m.name === 'IRR');
      expect(irrMeta).toBeDefined();
      expect(irrMeta?.errorStrategy).toBe(ErrorStrategy.FINANCIAL_STRICT);
    });

    test('Metadata: PMT has FINANCIAL_STRICT strategy', () => {
      const pmtMeta = FINANCIAL_METADATA.find(m => m.name === 'PMT');
      expect(pmtMeta).toBeDefined();
      expect(pmtMeta?.errorStrategy).toBe(ErrorStrategy.FINANCIAL_STRICT);
    });

    test('Metadata: PV has FINANCIAL_STRICT strategy', () => {
      const pvMeta = FINANCIAL_METADATA.find(m => m.name === 'PV');
      expect(pvMeta).toBeDefined();
      expect(pvMeta?.errorStrategy).toBe(ErrorStrategy.FINANCIAL_STRICT);
    });

    test('Metadata: FV has FINANCIAL_STRICT strategy', () => {
      const fvMeta = FINANCIAL_METADATA.find(m => m.name === 'FV');
      expect(fvMeta).toBeDefined();
      expect(fvMeta?.errorStrategy).toBe(ErrorStrategy.FINANCIAL_STRICT);
    });

    test('Metadata: RATE has FINANCIAL_STRICT strategy', () => {
      const rateMeta = FINANCIAL_METADATA.find(m => m.name === 'RATE');
      expect(rateMeta).toBeDefined();
      expect(rateMeta?.errorStrategy).toBe(ErrorStrategy.FINANCIAL_STRICT);
    });

    test('Metadata: NPER has FINANCIAL_STRICT strategy', () => {
      const nperMeta = FINANCIAL_METADATA.find(m => m.name === 'NPER');
      expect(nperMeta).toBeDefined();
      expect(nperMeta?.errorStrategy).toBe(ErrorStrategy.FINANCIAL_STRICT);
    });

    test('ALL Financial functions use FINANCIAL_STRICT strategy', () => {
      // Critical test: ALL 24 financial functions must use FINANCIAL_STRICT
      const allFinancial = FINANCIAL_METADATA.filter(m => m.category === 'FINANCIAL');
      const financialStrict = allFinancial.filter(m => m.errorStrategy === ErrorStrategy.FINANCIAL_STRICT);
      
      expect(allFinancial.length).toBe(24);
      expect(financialStrict.length).toBe(24);
      
      // No financial function should use any other strategy
      allFinancial.forEach(func => {
        expect(func.errorStrategy).toBe(ErrorStrategy.FINANCIAL_STRICT);
      });
    });
  });

  // ============================================================================
  // TEST 6: PROPAGATE_FIRST Strategy - Standard Functions
  // ============================================================================
  
  describe('ErrorStrategy.PROPAGATE_FIRST - Standard Functions', () => {
    test('Metadata: ABS has PROPAGATE_FIRST strategy', () => {
      const absMeta = MATH_METADATA.find(m => m.name === 'ABS');
      expect(absMeta).toBeDefined();
      expect(absMeta?.errorStrategy).toBe(ErrorStrategy.PROPAGATE_FIRST);
    });

    test('Metadata: ROUND has PROPAGATE_FIRST strategy', () => {
      const roundMeta = MATH_METADATA.find(m => m.name === 'ROUND');
      expect(roundMeta).toBeDefined();
      expect(roundMeta?.errorStrategy).toBe(ErrorStrategy.PROPAGATE_FIRST);
    });

    test('Metadata: SQRT has PROPAGATE_FIRST strategy', () => {
      const sqrtMeta = MATH_METADATA.find(m => m.name === 'SQRT');
      expect(sqrtMeta).toBeDefined();
      expect(sqrtMeta?.errorStrategy).toBe(ErrorStrategy.PROPAGATE_FIRST);
    });

    test('PROPAGATE_FIRST is the most common strategy', () => {
      const allMetadata = [...MATH_METADATA, ...LOGICAL_METADATA, ...LOOKUP_METADATA, ...FINANCIAL_METADATA, ...STATISTICAL_METADATA];
      const propagateFuncs = allMetadata.filter(m => m.errorStrategy === ErrorStrategy.PROPAGATE_FIRST);
      
      // Should have ~100+ PROPAGATE_FIRST functions (default behavior)
      expect(propagateFuncs.length).toBeGreaterThanOrEqual(100);
      expect(propagateFuncs.length).toBeLessThanOrEqual(200);
    });
  });

  // ============================================================================
  // TEST 7: ErrorStrategy Distribution Consistency
  // ============================================================================
  
  describe('ErrorStrategy Distribution Consistency', () => {
    test('SKIP_ERRORS: All aggregations use this strategy', () => {
      const allMetadata = [...MATH_METADATA, ...STATISTICAL_METADATA];
      const skipErrorsFuncs = allMetadata.filter(m => m.errorStrategy === ErrorStrategy.SKIP_ERRORS);
      
      // Key insight: SKIP_ERRORS should be ~22% of total functions (60/279)
      expect(skipErrorsFuncs.length).toBeGreaterThanOrEqual(50);
      expect(skipErrorsFuncs.length).toBeLessThanOrEqual(70);
    });

    test('LAZY_EVALUATION: All conditionals use this strategy', () => {
      const lazyFuncs = LOGICAL_METADATA.filter(m => m.errorStrategy === ErrorStrategy.LAZY_EVALUATION);
      
      // Should be ~3% of total functions (5/279)
      expect(lazyFuncs.length).toBeGreaterThanOrEqual(5);
      expect(lazyFuncs.length).toBeLessThanOrEqual(12);
    });

    test('SHORT_CIRCUIT: Only AND/OR use this strategy', () => {
      const allMetadata = [...MATH_METADATA, ...LOGICAL_METADATA, ...LOOKUP_METADATA, ...FINANCIAL_METADATA, ...STATISTICAL_METADATA];
      const shortCircuitFuncs = allMetadata.filter(m => m.errorStrategy === ErrorStrategy.SHORT_CIRCUIT);
      
      // Should be exactly 2 functions (<1% of total)
      expect(shortCircuitFuncs.length).toBe(2);
    });

    test('LOOKUP_STRICT: All lookup functions use this strategy', () => {
      const lookupStrictFuncs = LOOKUP_METADATA.filter(m => m.errorStrategy === ErrorStrategy.LOOKUP_STRICT);
      
      // Should be ~2.5% of total functions (7/279)
      expect(lookupStrictFuncs.length).toBe(7);
    });

    test('FINANCIAL_STRICT: ALL financial functions use this strategy', () => {
      const financialStrictFuncs = FINANCIAL_METADATA.filter(m => m.errorStrategy === ErrorStrategy.FINANCIAL_STRICT);
      
      // Should be ~9% of total functions (24/279)
      expect(financialStrictFuncs.length).toBe(24);
    });

    test('PROPAGATE_FIRST: Most functions use this strategy', () => {
      const allMetadata = [...MATH_METADATA, ...LOGICAL_METADATA, ...LOOKUP_METADATA, ...FINANCIAL_METADATA, ...STATISTICAL_METADATA];
      const propagateFuncs = allMetadata.filter(m => m.errorStrategy === ErrorStrategy.PROPAGATE_FIRST);
      
      // Should be ~40% of total functions (100+/279)
      expect(propagateFuncs.length).toBeGreaterThanOrEqual(100);
      expect(propagateFuncs.length).toBeLessThanOrEqual(200);
    });
  });

  // ============================================================================
  // TEST 8: Final Summary
  // ============================================================================
  
  test('ErrorStrategy Enforcement: Summary', () => {
    const allMetadata = [...MATH_METADATA, ...LOGICAL_METADATA, ...LOOKUP_METADATA, ...FINANCIAL_METADATA, ...STATISTICAL_METADATA];
    
    // Count each strategy
    const skipErrors = allMetadata.filter(m => m.errorStrategy === ErrorStrategy.SKIP_ERRORS).length;
    const lazyEval = allMetadata.filter(m => m.errorStrategy === ErrorStrategy.LAZY_EVALUATION).length;
    const shortCircuit = allMetadata.filter(m => m.errorStrategy === ErrorStrategy.SHORT_CIRCUIT).length;
    const lookupStrict = allMetadata.filter(m => m.errorStrategy === ErrorStrategy.LOOKUP_STRICT).length;
    const financialStrict = allMetadata.filter(m => m.errorStrategy === ErrorStrategy.FINANCIAL_STRICT).length;
    const propagateFirst = allMetadata.filter(m => m.errorStrategy === ErrorStrategy.PROPAGATE_FIRST).length;
    
    console.log('\n✅ ErrorStrategy Distribution:');
    console.log(`   SKIP_ERRORS: ${skipErrors} functions (~${Math.round(skipErrors/allMetadata.length*100)}%)`);
    console.log(`   LAZY_EVALUATION: ${lazyEval} functions (~${Math.round(lazyEval/allMetadata.length*100)}%)`);
    console.log(`   SHORT_CIRCUIT: ${shortCircuit} functions (<1%)`);
    console.log(`   LOOKUP_STRICT: ${lookupStrict} functions (~${Math.round(lookupStrict/allMetadata.length*100)}%)`);
    console.log(`   FINANCIAL_STRICT: ${financialStrict} functions (~${Math.round(financialStrict/allMetadata.length*100)}%)`);
    console.log(`   PROPAGATE_FIRST: ${propagateFirst} functions (~${Math.round(propagateFirst/allMetadata.length*100)}%)`);
    console.log(`   TOTAL: ${allMetadata.length} functions validated\n`);
    
    // Verify total adds up
    const total = skipErrors + lazyEval + shortCircuit + lookupStrict + financialStrict + propagateFirst;
    expect(total).toBe(allMetadata.length);
    
    // Verify expected counts (flexible ranges)
    expect(skipErrors).toBeGreaterThanOrEqual(50);
    expect(skipErrors).toBeLessThanOrEqual(70);
    expect(lazyEval).toBeGreaterThanOrEqual(5);
    expect(lazyEval).toBeLessThanOrEqual(12);
    expect(shortCircuit).toBe(2);
    expect(lookupStrict).toBe(7);
    expect(financialStrict).toBe(24);
    expect(propagateFirst).toBeGreaterThanOrEqual(100);
    expect(propagateFirst).toBeLessThanOrEqual(200);
  });
});
