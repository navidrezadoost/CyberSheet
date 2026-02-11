/**
 * statistical-distributions.test.ts
 * 
 * Week 11 Day 5: Statistical Distribution Functions
 * Tests for normal, binomial, Poisson, and exponential distributions
 * 
 * Coverage: 10 functions, 60+ tests
 */

import { describe, it, expect } from '@jest/globals';
import * as StatisticalFunctions from '../../src/functions/statistical/statistical-functions';

// Helper to check approximate equality with tolerance
function expectApprox(actual: number, expected: number, tolerance = 1e-6) {
  expect(Math.abs(actual - expected)).toBeLessThan(tolerance);
}

describe('Week 11 Day 5: Statistical Distribution Functions', () => {
  
  // ============================================================================
  // NORM.DIST Tests (7 tests)
  // ============================================================================
  describe('NORM.DIST - Normal Distribution', () => {
    it('should calculate cumulative normal distribution', () => {
      // Standard test case from Excel
      const result = StatisticalFunctions.NORM_DIST(42, 40, 1.5, true);
      expectApprox(result as number, 0.9087888, 1e-6);
    });
    
    it('should calculate probability density (PDF)', () => {
      const result = StatisticalFunctions.NORM_DIST(42, 40, 1.5, false);
      expectApprox(result as number, 0.10934005, 1e-6);
    });
    
    it('should return 0.5 at the mean (CDF)', () => {
      const result = StatisticalFunctions.NORM_DIST(40, 40, 1.5, true);
      expectApprox(result as number, 0.5, 1e-6);
    });
    
    it('should calculate with different means and standard deviations', () => {
      const result = StatisticalFunctions.NORM_DIST(100, 90, 10, true);
      expectApprox(result as number, 0.8413447, 1e-6);
    });
    
    it('should return #NUM! for negative standard deviation', () => {
      const result = StatisticalFunctions.NORM_DIST(42, 40, -1.5, true);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });
    
    it('should return #NUM! for zero standard deviation', () => {
      const result = StatisticalFunctions.NORM_DIST(42, 40, 0, true);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });
    
    it('should handle extreme values', () => {
      // Far left tail
      const leftTail = StatisticalFunctions.NORM_DIST(-100, 0, 1, true);
      expectApprox(leftTail as number, 0, 1e-10);
      
      // Far right tail
      const rightTail = StatisticalFunctions.NORM_DIST(100, 0, 1, true);
      expectApprox(rightTail as number, 1, 1e-10);
    });
  });
  
  // ============================================================================
  // NORM.INV Tests (6 tests)
  // ============================================================================
  describe('NORM.INV - Inverse Normal Distribution', () => {
    it('should find inverse of normal distribution', () => {
      const result = StatisticalFunctions.NORM_INV(0.9087888, 40, 1.5);
      expectApprox(result as number, 42, 1e-4);
    });
    
    it('should return mean at probability 0.5', () => {
      const result = StatisticalFunctions.NORM_INV(0.5, 100, 10);
      expectApprox(result as number, 100, 1e-6);
    });
    
    it('should calculate 95th percentile', () => {
      const result = StatisticalFunctions.NORM_INV(0.975, 0, 1);
      expectApprox(result as number, 1.96, 1e-3);
    });
    
    it('should return #NUM! for probability <= 0', () => {
      const result1 = StatisticalFunctions.NORM_INV(0, 40, 1.5);
      expect(result1).toBeInstanceOf(Error);
      expect((result1 as Error).message).toBe('#NUM!');
      
      const result2 = StatisticalFunctions.NORM_INV(-0.1, 40, 1.5);
      expect(result2).toBeInstanceOf(Error);
      expect((result2 as Error).message).toBe('#NUM!');
    });
    
    it('should return #NUM! for probability >= 1', () => {
      const result1 = StatisticalFunctions.NORM_INV(1, 40, 1.5);
      expect(result1).toBeInstanceOf(Error);
      expect((result1 as Error).message).toBe('#NUM!');
      
      const result2 = StatisticalFunctions.NORM_INV(1.5, 40, 1.5);
      expect(result2).toBeInstanceOf(Error);
      expect((result2 as Error).message).toBe('#NUM!');
    });
    
    it('should return #NUM! for negative standard deviation', () => {
      const result = StatisticalFunctions.NORM_INV(0.5, 40, -1.5);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe('#NUM!');
    });
  });
  
  // ============================================================================
  // NORM.S.DIST Tests (6 tests)
  // ============================================================================
  describe('NORM.S.DIST - Standard Normal Distribution', () => {
    it('should calculate standard normal CDF at z=1.96', () => {
      const result = StatisticalFunctions.NORM_S_DIST(1.96, true);
      expectApprox(result as number, 0.975, 1e-4);
    });
    
    it('should return 0.5 at z=0 (CDF)', () => {
      const result = StatisticalFunctions.NORM_S_DIST(0, true);
      expectApprox(result as number, 0.5, 1e-6);
    });
    
    it('should calculate PDF at z=0 (peak of bell curve)', () => {
      const result = StatisticalFunctions.NORM_S_DIST(0, false);
      expectApprox(result as number, 0.3989423, 1e-6);
    });
    
    it('should calculate left tail (2.5th percentile)', () => {
      const result = StatisticalFunctions.NORM_S_DIST(-1.96, true);
      expectApprox(result as number, 0.025, 1e-4);
    });
    
    it('should handle positive z-scores', () => {
      const result = StatisticalFunctions.NORM_S_DIST(1, true);
      expectApprox(result as number, 0.8413447, 1e-6);
    });
    
    it('should handle negative z-scores', () => {
      const result = StatisticalFunctions.NORM_S_DIST(-1, true);
      expectApprox(result as number, 0.1586553, 1e-6);
    });
  });
  
  // ============================================================================
  // NORM.S.INV Tests (5 tests)
  // ============================================================================
  describe('NORM.S.INV - Inverse Standard Normal', () => {
    it('should find z-score for 95% confidence interval', () => {
      const result = StatisticalFunctions.NORM_S_INV(0.975);
      expectApprox(result as number, 1.96, 1e-3);
    });
    
    it('should return 0 at probability 0.5', () => {
      const result = StatisticalFunctions.NORM_S_INV(0.5);
      expectApprox(result as number, 0, 1e-6);
    });
    
    it('should calculate negative z-scores', () => {
      const result = StatisticalFunctions.NORM_S_INV(0.025);
      expectApprox(result as number, -1.96, 1e-3);
    });
    
    it('should return #NUM! for probability <= 0', () => {
      const result1 = StatisticalFunctions.NORM_S_INV(0);
      expect(result1).toBeInstanceOf(Error);
      expect((result1 as Error).message).toBe('#NUM!');
      
      const result2 = StatisticalFunctions.NORM_S_INV(-0.5);
      expect(result2).toBeInstanceOf(Error);
      expect((result2 as Error).message).toBe('#NUM!');
    });
    
    it('should return #NUM! for probability >= 1', () => {
      const result1 = StatisticalFunctions.NORM_S_INV(1);
      expect(result1).toBeInstanceOf(Error);
      expect((result1 as Error).message).toBe('#NUM!');
      
      const result2 = StatisticalFunctions.NORM_S_INV(1.5);
      expect(result2).toBeInstanceOf(Error);
      expect((result2 as Error).message).toBe('#NUM!');
    });
  });
  
  // ============================================================================
  // BINOM.DIST Tests (7 tests)
  // ============================================================================
  describe('BINOM.DIST - Binomial Distribution', () => {
    it('should calculate binomial PMF for coin flips', () => {
      // Exactly 6 heads in 10 flips of fair coin
      const result = StatisticalFunctions.BINOM_DIST(6, 10, 0.5, false);
      expectApprox(result as number, 0.205078125, 1e-6);
    });
    
    it('should calculate binomial CDF', () => {
      // 6 or fewer heads in 10 flips
      const result = StatisticalFunctions.BINOM_DIST(6, 10, 0.5, true);
      expectApprox(result as number, 0.828125, 1e-6);
    });
    
    it('should handle probability of 0 successes', () => {
      const result = StatisticalFunctions.BINOM_DIST(0, 10, 0.1, false);
      expectApprox(result as number, 0.3486784401, 1e-6);
    });
    
    it('should handle all successes', () => {
      const result = StatisticalFunctions.BINOM_DIST(10, 10, 0.5, false);
      expectApprox(result as number, 0.0009765625, 1e-8);
    });
    
    it('should return #NUM! for invalid number of successes', () => {
      const result1 = StatisticalFunctions.BINOM_DIST(-1, 10, 0.5, false);
      expect(result1).toBeInstanceOf(Error);
      expect((result1 as Error).message).toBe('#NUM!');
      
      const result2 = StatisticalFunctions.BINOM_DIST(11, 10, 0.5, false);
      expect(result2).toBeInstanceOf(Error);
      expect((result2 as Error).message).toBe('#NUM!');
      
      const result3 = StatisticalFunctions.BINOM_DIST(5.5, 10, 0.5, false);
      expect(result3).toBeInstanceOf(Error);
      expect((result3 as Error).message).toBe('#NUM!');
    });
    
    it('should return #NUM! for invalid probability', () => {
      const result1 = StatisticalFunctions.BINOM_DIST(5, 10, -0.1, false);
      expect(result1).toBeInstanceOf(Error);
      expect((result1 as Error).message).toBe('#NUM!');
      
      const result2 = StatisticalFunctions.BINOM_DIST(5, 10, 1.5, false);
      expect(result2).toBeInstanceOf(Error);
      expect((result2 as Error).message).toBe('#NUM!');
    });
    
    it('should handle edge case probabilities', () => {
      // p = 0: only k=0 has non-zero probability
      expect(StatisticalFunctions.BINOM_DIST(0, 10, 0, false)).toBe(1);
      expect(StatisticalFunctions.BINOM_DIST(1, 10, 0, false)).toBe(0);
      
      // p = 1: only k=n has non-zero probability
      expect(StatisticalFunctions.BINOM_DIST(10, 10, 1, false)).toBe(1);
      expect(StatisticalFunctions.BINOM_DIST(9, 10, 1, false)).toBe(0);
    });
  });
  
  // ============================================================================
  // BINOM.INV Tests (6 tests)
  // ============================================================================
  describe('BINOM.INV - Inverse Binomial Distribution', () => {
    it('should find 95th percentile of binomial distribution', () => {
      const result = StatisticalFunctions.BINOM_INV(100, 0.5, 0.95);
      expect(result).toBe(58);
    });
    
    it('should find median of binomial distribution', () => {
      const result = StatisticalFunctions.BINOM_INV(10, 0.5, 0.5);
      expect(result).toBe(5);
    });
    
    it('should handle small probabilities', () => {
      const result = StatisticalFunctions.BINOM_INV(20, 0.3, 0.9);
      expect(result).toBe(9);
    });
    
    it('should handle alpha = 0 (returns 0)', () => {
      const result = StatisticalFunctions.BINOM_INV(10, 0.5, 0);
      expect(result).toBe(0);
    });
    
    it('should handle alpha = 1 (returns n)', () => {
      const result = StatisticalFunctions.BINOM_INV(10, 0.5, 1);
      expect(result).toBe(10);
    });
    
    it('should return #NUM! for invalid parameters', () => {
      const result1 = StatisticalFunctions.BINOM_INV(-1, 0.5, 0.95);
      expect(result1).toBeInstanceOf(Error);
      expect((result1 as Error).message).toBe('#NUM!');
      
      const result2 = StatisticalFunctions.BINOM_INV(10, -0.1, 0.95);
      expect(result2).toBeInstanceOf(Error);
      expect((result2 as Error).message).toBe('#NUM!');
      
      const result3 = StatisticalFunctions.BINOM_INV(10, 0.5, -0.1);
      expect(result3).toBeInstanceOf(Error);
      expect((result3 as Error).message).toBe('#NUM!');
    });
  });
  
  // ============================================================================
  // POISSON.DIST Tests (5 tests)
  // ============================================================================
  describe('POISSON.DIST - Poisson Distribution', () => {
    it('should calculate Poisson PMF', () => {
      // Exactly 2 events when expecting 5
      const result = StatisticalFunctions.POISSON_DIST(2, 5, false);
      expectApprox(result as number, 0.084224, 1e-5);
    });
    
    it('should calculate Poisson CDF', () => {
      // 2 or fewer events when expecting 5
      const result = StatisticalFunctions.POISSON_DIST(2, 5, true);
      expectApprox(result as number, 0.124652, 1e-5);
    });
    
    it('should handle mode of distribution', () => {
      // Mode is at floor(λ) = 5
      const result = StatisticalFunctions.POISSON_DIST(5, 5, false);
      expectApprox(result as number, 0.1755, 1e-4);
    });
    
    it('should handle zero events', () => {
      const result = StatisticalFunctions.POISSON_DIST(0, 2, false);
      expectApprox(result as number, Math.exp(-2), 1e-6);
    });
    
    it('should return #NUM! for invalid parameters', () => {
      const result1 = StatisticalFunctions.POISSON_DIST(-1, 5, false);
      expect(result1).toBeInstanceOf(Error);
      expect((result1 as Error).message).toBe('#NUM!');
      
      const result2 = StatisticalFunctions.POISSON_DIST(2.5, 5, false);
      expect(result2).toBeInstanceOf(Error);
      expect((result2 as Error).message).toBe('#NUM!');
      
      const result3 = StatisticalFunctions.POISSON_DIST(2, -1, false);
      expect(result3).toBeInstanceOf(Error);
      expect((result3 as Error).message).toBe('#NUM!');
      
      const result4 = StatisticalFunctions.POISSON_DIST(2, 0, false);
      expect(result4).toBeInstanceOf(Error);
      expect((result4 as Error).message).toBe('#NUM!');
    });
  });
  
  // ============================================================================
  // POISSON (legacy) Tests (3 tests)
  // ============================================================================
  describe('POISSON - Legacy Poisson Distribution', () => {
    it('should behave identically to POISSON.DIST for PMF', () => {
      const result1 = StatisticalFunctions.POISSON(2, 5, false);
      const result2 = StatisticalFunctions.POISSON_DIST(2, 5, false);
      expect(result1).toBe(result2);
    });
    
    it('should behave identically to POISSON.DIST for CDF', () => {
      const result1 = StatisticalFunctions.POISSON(2, 5, true);
      const result2 = StatisticalFunctions.POISSON_DIST(2, 5, true);
      expect(result1).toBe(result2);
    });
    
    it('should handle errors identically to POISSON.DIST', () => {
      const result1 = StatisticalFunctions.POISSON(-1, 5, false);
      const result2 = StatisticalFunctions.POISSON_DIST(-1, 5, false);
      expect(result1).toEqual(result2);
    });
  });
  
  // ============================================================================
  // EXPON.DIST Tests (5 tests)
  // ============================================================================
  describe('EXPON.DIST - Exponential Distribution', () => {
    it('should calculate exponential CDF', () => {
      const result = StatisticalFunctions.EXPON_DIST(0.2, 10, true);
      expectApprox(result as number, 0.864665, 1e-5);
    });
    
    it('should calculate exponential PDF', () => {
      const result = StatisticalFunctions.EXPON_DIST(0.2, 10, false);
      expectApprox(result as number, 1.353353, 1e-5);
    });
    
    it('should handle x = 0 for PDF (equals lambda)', () => {
      const result = StatisticalFunctions.EXPON_DIST(0, 5, false);
      expect(result).toBe(5);
    });
    
    it('should calculate with different lambda values', () => {
      const result = StatisticalFunctions.EXPON_DIST(1, 1, true);
      expectApprox(result as number, 1 - Math.exp(-1), 1e-6);
    });
    
    it('should return #NUM! for invalid parameters', () => {
      const result1 = StatisticalFunctions.EXPON_DIST(-0.1, 10, true);
      expect(result1).toBeInstanceOf(Error);
      expect((result1 as Error).message).toBe('#NUM!');
      
      const result2 = StatisticalFunctions.EXPON_DIST(0.2, 0, true);
      expect(result2).toBeInstanceOf(Error);
      expect((result2 as Error).message).toBe('#NUM!');
      
      const result3 = StatisticalFunctions.EXPON_DIST(0.2, -1, true);
      expect(result3).toBeInstanceOf(Error);
      expect((result3 as Error).message).toBe('#NUM!');
    });
  });
  
  // ============================================================================
  // EXPONDIST (legacy) Tests (3 tests)
  // ============================================================================
  describe('EXPONDIST - Legacy Exponential Distribution', () => {
    it('should behave identically to EXPON.DIST for CDF', () => {
      const result1 = StatisticalFunctions.EXPONDIST(0.2, 10, true);
      const result2 = StatisticalFunctions.EXPON_DIST(0.2, 10, true);
      expect(result1).toBe(result2);
    });
    
    it('should behave identically to EXPON.DIST for PDF', () => {
      const result1 = StatisticalFunctions.EXPONDIST(0.2, 10, false);
      const result2 = StatisticalFunctions.EXPON_DIST(0.2, 10, false);
      expect(result1).toBe(result2);
    });
    
    it('should handle errors identically to EXPON.DIST', () => {
      const result1 = StatisticalFunctions.EXPONDIST(-0.1, 10, true);
      const result2 = StatisticalFunctions.EXPON_DIST(-0.1, 10, true);
      expect(result1).toEqual(result2);
    });
  });
  
  // ============================================================================
  // Integration Tests (5 tests)
  // ============================================================================
  describe('Integration Tests - Distribution Relationships', () => {
    it('NORM.INV should be inverse of NORM.DIST', () => {
      const x = 45;
      const mean = 40;
      const std = 5;
      
      // Forward: x → probability
      const prob = StatisticalFunctions.NORM_DIST(x, mean, std, true) as number;
      
      // Inverse: probability → x
      const xRecovered = StatisticalFunctions.NORM_INV(prob, mean, std) as number;
      
      expectApprox(xRecovered, x, 1e-4);
    });
    
    it('NORM.S.INV should be inverse of NORM.S.DIST', () => {
      const z = 1.5;
      
      // Forward: z → probability
      const prob = StatisticalFunctions.NORM_S_DIST(z, true) as number;
      
      // Inverse: probability → z
      const zRecovered = StatisticalFunctions.NORM_S_INV(prob) as number;
      
      expectApprox(zRecovered, z, 1e-4);
    });
    
    it('Normal distribution should integrate to approximately 1', () => {
      // Numerical integration from -5σ to +5σ
      const mean = 0;
      const std = 1;
      let sum = 0;
      const dx = 0.01;
      
      for (let x = -5; x <= 5; x += dx) {
        const pdf = StatisticalFunctions.NORM_DIST(x, mean, std, false) as number;
        sum += pdf * dx;
      }
      
      expectApprox(sum, 1, 1e-2);
    });
    
    it('Binomial CDF should be monotonically increasing', () => {
      const n = 20;
      const p = 0.3;
      
      let prevCDF = 0;
      for (let k = 0; k <= n; k++) {
        const cdf = StatisticalFunctions.BINOM_DIST(k, n, p, true) as number;
        expect(cdf).toBeGreaterThanOrEqual(prevCDF);
        prevCDF = cdf;
      }
      
      // Final CDF should be 1
      expectApprox(prevCDF, 1, 1e-10);
    });
    
    it('Poisson mean should equal variance', () => {
      // For Poisson distribution, mean = variance = λ
      const lambda = 5;
      
      // Calculate mean: Σ k * P(k) - need many terms for good accuracy
      let mean = 0;
      for (let k = 0; k <= 50; k++) {
        const pmf = StatisticalFunctions.POISSON_DIST(k, lambda, false) as number;
        mean += k * pmf;
      }
      
      // With numerical approximation, we expect close but not perfect match
      expectApprox(mean, lambda, 0.05);
    });
  });
});
