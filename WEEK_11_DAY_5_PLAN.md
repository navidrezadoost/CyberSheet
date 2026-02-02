# Week 11 Day 5: Statistical Distribution Functions - IMPLEMENTATION PLAN

## 🎯 Objective
Implement 10 probability distribution functions covering normal, binomial, Poisson, and exponential distributions with comprehensive test coverage.

---

## 📊 Functions to Implement (10 Total)

### 1. Normal Distribution Functions (4 functions)

#### **NORM.DIST** - Normal Distribution
- **Syntax**: `NORM.DIST(x, mean, standard_dev, cumulative)`
- **Purpose**: Returns the normal distribution for specified mean and standard deviation
- **Parameters**:
  - `x`: Value for which you want the distribution
  - `mean`: Arithmetic mean of the distribution
  - `standard_dev`: Standard deviation of the distribution (must be > 0)
  - `cumulative`: TRUE = cumulative distribution (CDF), FALSE = probability density (PDF)
- **Formula**:
  - PDF: `f(x) = (1/(σ√(2π))) * e^(-((x-μ)²/(2σ²)))`
  - CDF: Uses error function approximation
- **Examples**:
  ```
  =NORM.DIST(42, 40, 1.5, TRUE)  → 0.9087888 (cumulative)
  =NORM.DIST(42, 40, 1.5, FALSE) → 0.10934005 (probability density)
  ```

#### **NORM.INV** - Inverse Normal Distribution
- **Syntax**: `NORM.INV(probability, mean, standard_dev)`
- **Purpose**: Returns the inverse of the normal cumulative distribution
- **Parameters**:
  - `probability`: Probability corresponding to the normal distribution (0 < p < 1)
  - `mean`: Arithmetic mean of the distribution
  - `standard_dev`: Standard deviation (must be > 0)
- **Formula**: Inverse of CDF using Newton-Raphson or bisection method
- **Examples**:
  ```
  =NORM.INV(0.9087888, 40, 1.5)  → 42 (approximately)
  =NORM.INV(0.5, 0, 1)           → 0 (median of standard normal)
  ```

#### **NORM.S.DIST** - Standard Normal Distribution
- **Syntax**: `NORM.S.DIST(z, cumulative)`
- **Purpose**: Returns the standard normal distribution (mean=0, std=1)
- **Parameters**:
  - `z`: Value for which you want the distribution
  - `cumulative`: TRUE = CDF, FALSE = PDF
- **Formula**: Special case of NORM.DIST with μ=0, σ=1
- **Examples**:
  ```
  =NORM.S.DIST(1.96, TRUE)  → 0.975 (approximately)
  =NORM.S.DIST(0, FALSE)    → 0.3989423 (peak of bell curve)
  ```

#### **NORM.S.INV** - Inverse Standard Normal Distribution
- **Syntax**: `NORM.S.INV(probability)`
- **Purpose**: Returns the inverse of the standard normal cumulative distribution
- **Parameters**:
  - `probability`: Probability (0 < p < 1)
- **Formula**: Special case of NORM.INV with μ=0, σ=1
- **Examples**:
  ```
  =NORM.S.INV(0.975)  → 1.96 (approximately)
  =NORM.S.INV(0.5)    → 0
  ```

---

### 2. Binomial Distribution Functions (2 functions)

#### **BINOM.DIST** - Binomial Distribution
- **Syntax**: `BINOM.DIST(number_s, trials, probability_s, cumulative)`
- **Purpose**: Returns the individual term binomial distribution probability
- **Parameters**:
  - `number_s`: Number of successes in trials (integer, 0 ≤ number_s ≤ trials)
  - `trials`: Number of independent trials (integer, > 0)
  - `probability_s`: Probability of success on each trial (0 ≤ p ≤ 1)
  - `cumulative`: TRUE = CDF, FALSE = PMF
- **Formula**:
  - PMF: `P(X=k) = C(n,k) * p^k * (1-p)^(n-k)`
  - CDF: `P(X≤k) = Σ(i=0 to k) C(n,i) * p^i * (1-p)^(n-i)`
- **Examples**:
  ```
  =BINOM.DIST(6, 10, 0.5, FALSE)  → 0.205078125 (exactly 6 heads in 10 flips)
  =BINOM.DIST(6, 10, 0.5, TRUE)   → 0.828125 (6 or fewer heads)
  ```

#### **BINOM.INV** - Inverse Binomial Distribution
- **Syntax**: `BINOM.INV(trials, probability_s, alpha)`
- **Purpose**: Returns the smallest value for which the cumulative binomial distribution is ≥ alpha
- **Parameters**:
  - `trials`: Number of Bernoulli trials (integer)
  - `probability_s`: Probability of success (0 ≤ p ≤ 1)
  - `alpha`: Criterion value (0 ≤ α ≤ 1)
- **Formula**: Find smallest k where CDF(k) ≥ alpha
- **Examples**:
  ```
  =BINOM.INV(100, 0.5, 0.95)  → 58 (95th percentile)
  ```

---

### 3. Poisson Distribution Functions (2 functions)

#### **POISSON.DIST** - Poisson Distribution
- **Syntax**: `POISSON.DIST(x, mean, cumulative)`
- **Purpose**: Returns the Poisson distribution (for predicting number of events over time)
- **Parameters**:
  - `x`: Number of events (integer, ≥ 0)
  - `mean`: Expected numeric value (λ, must be > 0)
  - `cumulative`: TRUE = CDF, FALSE = PMF
- **Formula**:
  - PMF: `P(X=k) = (λ^k * e^(-λ)) / k!`
  - CDF: `P(X≤k) = Σ(i=0 to k) (λ^i * e^(-λ)) / i!`
- **Examples**:
  ```
  =POISSON.DIST(2, 5, FALSE)  → 0.084224 (exactly 2 events)
  =POISSON.DIST(2, 5, TRUE)   → 0.124652 (2 or fewer events)
  ```

#### **POISSON** - Legacy Poisson Distribution
- **Syntax**: `POISSON(x, mean, cumulative)`
- **Purpose**: Compatibility function, same as POISSON.DIST
- **Note**: Maintained for Excel 2007 compatibility

---

### 4. Exponential Distribution Functions (2 functions)

#### **EXPON.DIST** - Exponential Distribution
- **Syntax**: `EXPON.DIST(x, lambda, cumulative)`
- **Purpose**: Returns the exponential distribution (time between events)
- **Parameters**:
  - `x`: Value of the function (must be ≥ 0)
  - `lambda`: Parameter value (rate, must be > 0)
  - `cumulative`: TRUE = CDF, FALSE = PDF
- **Formula**:
  - PDF: `f(x) = λ * e^(-λx)`
  - CDF: `F(x) = 1 - e^(-λx)`
- **Examples**:
  ```
  =EXPON.DIST(0.2, 10, TRUE)   → 0.864665 (cumulative)
  =EXPON.DIST(0.2, 10, FALSE)  → 1.353353 (probability density)
  ```

#### **EXPONDIST** - Legacy Exponential Distribution
- **Syntax**: `EXPONDIST(x, lambda, cumulative)`
- **Purpose**: Compatibility function, same as EXPON.DIST
- **Note**: Maintained for Excel 2007 compatibility

---

## 🧪 Test Plan (Target: 60+ tests)

### Test Categories for Each Distribution

1. **Basic Functionality** (2-3 tests per function)
   - Valid inputs with expected outputs
   - Cumulative vs non-cumulative modes
   - Standard test cases from statistical tables

2. **Edge Cases** (2-3 tests per function)
   - Boundary values (0, 1, min, max)
   - Very small and very large values
   - Median values

3. **Parameter Validation** (1-2 tests per function)
   - Invalid parameters (negative, zero where not allowed)
   - Out of range probabilities
   - Non-numeric inputs

4. **Excel Compatibility** (1 test per function)
   - Compare output with Excel reference values
   - Format verification

### Estimated Test Breakdown
- **NORM.DIST**: 7 tests
- **NORM.INV**: 6 tests
- **NORM.S.DIST**: 6 tests
- **NORM.S.INV**: 5 tests
- **BINOM.DIST**: 7 tests
- **BINOM.INV**: 6 tests
- **POISSON.DIST**: 6 tests
- **POISSON**: 4 tests
- **EXPON.DIST**: 6 tests
- **EXPONDIST**: 4 tests

**Total**: ~60 tests

---

## 🔧 Implementation Strategy

### Helper Functions Needed

1. **Error Function (erf)** for normal distribution CDF
   ```typescript
   function erf(x: number): number {
     // Abramowitz and Stegun approximation
     const a1 =  0.254829592;
     const a2 = -0.284496736;
     const a3 =  1.421413741;
     const a4 = -1.453152027;
     const a5 =  1.061405429;
     const p  =  0.3275911;
     
     const sign = x < 0 ? -1 : 1;
     x = Math.abs(x);
     
     const t = 1.0 / (1.0 + p * x);
     const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
     
     return sign * y;
   }
   ```

2. **Complementary Error Function (erfc)**
   ```typescript
   function erfc(x: number): number {
     return 1 - erf(x);
   }
   ```

3. **Standard Normal CDF (Φ)**
   ```typescript
   function standardNormalCDF(z: number): number {
     return 0.5 * (1 + erf(z / Math.sqrt(2)));
   }
   ```

4. **Inverse Normal using Newton-Raphson**
   ```typescript
   function inverseNormalCDF(p: number, mean: number, stdDev: number): number {
     // Rational approximation for initial guess
     // Then Newton-Raphson refinement
   }
   ```

5. **Binomial Coefficient (nCr)**
   ```typescript
   function binomialCoefficient(n: number, k: number): number {
     if (k < 0 || k > n) return 0;
     if (k === 0 || k === n) return 1;
     
     k = Math.min(k, n - k); // Take advantage of symmetry
     let result = 1;
     for (let i = 0; i < k; i++) {
       result = result * (n - i) / (i + 1);
     }
     return result;
   }
   ```

6. **Factorial** (for Poisson)
   ```typescript
   function factorial(n: number): number {
     if (n <= 1) return 1;
     return n * factorial(n - 1);
   }
   ```

7. **Log Factorial** (for numerical stability)
   ```typescript
   function logFactorial(n: number): number {
     // Use Stirling's approximation or lookup table
   }
   ```

---

## 📁 File Structure

### Implementation File
**Location**: `packages/core/src/functions/statistical/statistical-functions.ts`
- Add distribution functions at the end (after line 1493)
- Group by distribution type
- Include comprehensive JSDoc

### Test File
**Location**: `packages/core/__tests__/functions/statistical-distributions.test.ts` (NEW)
- Organized by distribution type
- Reference values from statistical tables
- Excel compatibility verification

### Registration
**Location**: `packages/core/src/functions/function-initializer.ts`
- Add 10 new function registrations in `statisticalFunctions` array
- Set correct min/max args for each function

---

## 📝 Implementation Order

1. **Phase 1: Helper Functions** (30 min)
   - Implement erf, erfc, standardNormalCDF
   - Implement binomialCoefficient, factorial
   - Unit test helpers

2. **Phase 2: Normal Distribution** (45 min)
   - NORM.S.DIST (easiest, foundation)
   - NORM.DIST (uses standard normal)
   - NORM.S.INV (inverse)
   - NORM.INV (uses standard inverse)
   - Test all 4 functions

3. **Phase 3: Binomial Distribution** (30 min)
   - BINOM.DIST
   - BINOM.INV
   - Test both functions

4. **Phase 4: Poisson Distribution** (20 min)
   - POISSON.DIST
   - POISSON (alias)
   - Test both functions

5. **Phase 5: Exponential Distribution** (20 min)
   - EXPON.DIST
   - EXPONDIST (alias)
   - Test both functions

6. **Phase 6: Integration** (15 min)
   - Register all functions
   - Run full test suite
   - Verify 100% pass rate

**Total Estimated Time**: ~2.5-3 hours

---

## ✅ Success Criteria

- [ ] All 10 functions implemented with full JSDoc
- [ ] Helper functions created and tested
- [ ] 60+ tests created with comprehensive coverage
- [ ] 100% test pass rate achieved
- [ ] All functions registered in function-initializer.ts
- [ ] Excel compatibility verified for key test cases
- [ ] Mathematical accuracy within acceptable tolerance (10⁻⁶)
- [ ] Proper error handling for all invalid inputs
- [ ] CHANGELOG.md updated
- [ ] Completion documentation created
- [ ] Code committed and pushed

---

## 🎓 Mathematical References

### Key Formulas

**Normal Distribution PDF**:
$$f(x | \mu, \sigma) = \frac{1}{\sigma\sqrt{2\pi}} e^{-\frac{(x-\mu)^2}{2\sigma^2}}$$

**Normal Distribution CDF**:
$$\Phi(x) = \frac{1}{2}\left[1 + \text{erf}\left(\frac{x-\mu}{\sigma\sqrt{2}}\right)\right]$$

**Binomial Distribution PMF**:
$$P(X=k) = \binom{n}{k} p^k (1-p)^{n-k}$$

**Poisson Distribution PMF**:
$$P(X=k) = \frac{\lambda^k e^{-\lambda}}{k!}$$

**Exponential Distribution PDF**:
$$f(x|\lambda) = \lambda e^{-\lambda x}$$

---

## 📚 Excel Compatibility Notes

- NORM.DIST: Excel 2010+, replaces NORMDIST
- NORM.INV: Excel 2010+, replaces NORMINV
- NORM.S.DIST: Excel 2010+, replaces NORMSDIST
- NORM.S.INV: Excel 2010+, replaces NORMSINV
- BINOM.DIST: Excel 2010+, replaces BINOMDIST
- BINOM.INV: Excel 2013+, replaces CRITBINOM
- POISSON.DIST: Excel 2010+, replaces POISSON
- EXPON.DIST: Excel 2010+, replaces EXPONDIST

All functions maintain backward compatibility with legacy versions.

---

## 🚀 Ready to Start Implementation!

This plan provides:
✅ Clear function specifications
✅ Mathematical formulas
✅ Implementation order
✅ Test strategy
✅ Helper function specifications
✅ Success criteria

**Next Step**: Begin Phase 1 - Helper Functions implementation
