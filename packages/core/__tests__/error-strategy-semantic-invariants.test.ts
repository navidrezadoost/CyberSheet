/**
 * error-strategy-semantic-invariants.test.ts
 * 
 * Wave 0 Day 4 Phase 3.1: Semantic Invariant Enforcement
 * 
 * PURPOSE:
 * Enforce computational philosophy rules for ErrorStrategy classifications.
 * These are mathematical integrity requirements, not Excel mimicry.
 * 
 * DESIGN PHILOSOPHY:
 * - Rules encode logic, not quantities
 * - Invariants are durable, counts are brittle
 * - Test semantic correctness, not arbitrary totals
 * 
 * INVARIANTS:
 * 1. Paired-data functions MUST NOT skip errors (corrupts alignment)
 * 2. Hypothesis tests MUST NOT skip errors (corrupts sample integrity)
 * 3. Aggregation functions SHOULD skip errors (Excel semantics)
 * 4. Order statistics are TENTATIVE (pending Excel verification)
 */

import { describe, test, expect } from '@jest/globals';
import { ErrorStrategy, FunctionCategory } from '../src/types/formula-types';
import { ALL_FUNCTION_METADATA } from '../src/functions/metadata';

describe('Wave 0 Day 4 - ErrorStrategy Semantic Invariants', () => {

  // ============================================================================
  // INVARIANT 1: Paired-Data Statistical Functions
  // ============================================================================
  
  describe('INVARIANT 1: Paired-Data Functions MUST Propagate Errors', () => {
    test('Correlation functions propagate errors (data alignment integrity)', () => {
      const correlationFuncs = ['CORREL', 'PEARSON'];
      
      correlationFuncs.forEach(name => {
        const meta = ALL_FUNCTION_METADATA.find(m => m.name === name);
        expect(meta).toBeDefined();
        expect(meta?.errorStrategy).toBe(ErrorStrategy.PROPAGATE_FIRST);
      });
    });

    test('Covariance functions propagate errors (data alignment integrity)', () => {
      const covarianceFuncs = ['COVARIANCE.P', 'COVARIANCE.S'];
      
      covarianceFuncs.forEach(name => {
        const meta = ALL_FUNCTION_METADATA.find(m => m.name === name);
        expect(meta).toBeDefined();
        expect(meta?.errorStrategy).toBe(ErrorStrategy.PROPAGATE_FIRST);
      });
    });

    test('Regression functions propagate errors (data alignment integrity)', () => {
      const regressionFuncs = ['SLOPE', 'INTERCEPT', 'RSQ', 'STEYX'];
      
      regressionFuncs.forEach(name => {
        const meta = ALL_FUNCTION_METADATA.find(m => m.name === name);
        expect(meta).toBeDefined();
        expect(meta?.errorStrategy).toBe(ErrorStrategy.PROPAGATE_FIRST);
      });
    });

    test('Forecast functions propagate errors (data alignment integrity)', () => {
      const forecastFuncs = ['FORECAST', 'FORECAST.LINEAR', 'TREND'];
      
      forecastFuncs.forEach(name => {
        const meta = ALL_FUNCTION_METADATA.find(m => m.name === name);
        expect(meta).toBeDefined();
        expect(meta?.errorStrategy).toBe(ErrorStrategy.PROPAGATE_FIRST);
      });
    });
  });

  // ============================================================================
  // INVARIANT 2: Hypothesis Testing Functions
  // ============================================================================
  
  describe('INVARIANT 2: Hypothesis Tests MUST Propagate Errors', () => {
    test('T-test propagates errors (sample integrity required)', () => {
      const meta = ALL_FUNCTION_METADATA.find(m => m.name === 'T.TEST');
      expect(meta).toBeDefined();
      expect(meta?.errorStrategy).toBe(ErrorStrategy.PROPAGATE_FIRST);
    });

    test('F-test propagates errors (sample integrity required)', () => {
      const meta = ALL_FUNCTION_METADATA.find(m => m.name === 'F.TEST');
      expect(meta).toBeDefined();
      expect(meta?.errorStrategy).toBe(ErrorStrategy.PROPAGATE_FIRST);
    });

    test('Chi-squared test propagates errors (sample integrity required)', () => {
      const meta = ALL_FUNCTION_METADATA.find(m => m.name === 'CHISQ.TEST');
      expect(meta).toBeDefined();
      expect(meta?.errorStrategy).toBe(ErrorStrategy.PROPAGATE_FIRST);
    });
  });

  // ============================================================================
  // INVARIANT 3: Core Aggregation Functions
  // ============================================================================
  
  describe('INVARIANT 3: Core Aggregations MUST Skip Errors', () => {
    test('Basic aggregations skip errors (Excel semantics)', () => {
      const coreAggregations = [
        'SUM', 'AVERAGE', 'MIN', 'MAX', 'COUNT', 'COUNTA', 'COUNTBLANK', 'PRODUCT'
      ];
      
      coreAggregations.forEach(name => {
        const meta = ALL_FUNCTION_METADATA.find(m => m.name === name);
        expect(meta).toBeDefined();
        expect(meta?.errorStrategy).toBe(ErrorStrategy.SKIP_ERRORS);
      });
    });

    test('Variance/StdDev functions skip errors (Excel semantics)', () => {
      const varianceFuncs = [
        'STDEV', 'STDEV.S', 'STDEV.P', 'VAR', 'VAR.S', 'VAR.P',
        'STDEVA', 'STDEVPA', 'VARA', 'VARPA'
      ];
      
      varianceFuncs.forEach(name => {
        const meta = ALL_FUNCTION_METADATA.find(m => m.name === name);
        expect(meta).toBeDefined();
        expect(meta?.errorStrategy).toBe(ErrorStrategy.SKIP_ERRORS);
      });
    });

    test('Conditional aggregations skip errors (Excel semantics)', () => {
      const conditionalAggregations = [
        'SUMIF', 'SUMIFS', 'AVERAGEIF', 'AVERAGEIFS', 
        'COUNTIF', 'COUNTIFS', 'MAXIFS', 'MINIFS'
      ];
      
      conditionalAggregations.forEach(name => {
        const meta = ALL_FUNCTION_METADATA.find(m => m.name === name);
        expect(meta).toBeDefined();
        expect(meta?.errorStrategy).toBe(ErrorStrategy.SKIP_ERRORS);
      });
    });

    test('Statistical aggregations skip errors (Excel semantics)', () => {
      const statAggregations = [
        'AVEDEV', 'DEVSQ', 'GEOMEAN', 'HARMEAN', 'MINA', 'MAXA'
      ];
      
      statAggregations.forEach(name => {
        const meta = ALL_FUNCTION_METADATA.find(m => m.name === name);
        expect(meta).toBeDefined();
        expect(meta?.errorStrategy).toBe(ErrorStrategy.SKIP_ERRORS);
      });
    });
  });

  // ============================================================================
  // INVARIANT 4: Order Statistics (Documented Tentative)
  // ============================================================================
  
  describe('INVARIANT 4: Order Statistics (Excel Parity Verification Pending)', () => {
    test('Position-based statistics currently skip errors (tentative)', () => {
      const positionFuncs = [
        'MEDIAN', 'PERCENTILE', 'PERCENTILE.INC', 'PERCENTILE.EXC',
        'QUARTILE', 'QUARTILE.INC', 'QUARTILE.EXC',
        'MODE', 'MODE.SNGL', 'MODE.MULT'
      ];
      
      positionFuncs.forEach(name => {
        const meta = ALL_FUNCTION_METADATA.find(m => m.name === name);
        if (meta) {
          // Currently SKIP_ERRORS, but documented as pending verification
          expect(meta.errorStrategy).toBe(ErrorStrategy.SKIP_ERRORS);
        }
      });
    });

    test('Ranking functions currently skip errors (tentative)', () => {
      const rankingFuncs = [
        'RANK', 'RANK.EQ', 'RANK.AVG', 'LARGE', 'SMALL',
        'PERCENTRANK', 'PERCENTRANK.INC', 'PERCENTRANK.EXC'
      ];
      
      rankingFuncs.forEach(name => {
        const meta = ALL_FUNCTION_METADATA.find(m => m.name === name);
        if (meta) {
          // Currently SKIP_ERRORS, but documented as pending verification
          expect(meta.errorStrategy).toBe(ErrorStrategy.SKIP_ERRORS);
        }
      });
    });
  });

  // ============================================================================
  // META-INVARIANT: Count Validation (Informational Only)
  // ============================================================================
  
  describe('META: Count Validation (Informational, Not Enforced)', () => {
    test('SKIP_ERRORS count is within expected range', () => {
      const skipErrorsCount = ALL_FUNCTION_METADATA.filter(
        m => m.errorStrategy === ErrorStrategy.SKIP_ERRORS
      ).length;
      
      // After reclassifying 13 statistical integrity functions:
      // Expected: 54-56 functions (was 68 before reclassification)
      expect(skipErrorsCount).toBeGreaterThanOrEqual(50);
      expect(skipErrorsCount).toBeLessThanOrEqual(60);
      
      // Log actual count for documentation
      console.log(`ℹ️  SKIP_ERRORS functions: ${skipErrorsCount}`);
    });

    test('PROPAGATE_FIRST is still the most common strategy', () => {
      const propagateCount = ALL_FUNCTION_METADATA.filter(
        m => m.errorStrategy === ErrorStrategy.PROPAGATE_FIRST
      ).length;
      
      const skipCount = ALL_FUNCTION_METADATA.filter(
        m => m.errorStrategy === ErrorStrategy.SKIP_ERRORS
      ).length;
      
      expect(propagateCount).toBeGreaterThan(skipCount);
      
      // Log for documentation
      console.log(`ℹ️  PROPAGATE_FIRST functions: ${propagateCount}`);
    });
  });
});
