# Week 8 Days 4-5: Financial Functions Implementation Plan

## Status: Ready to Start
**Date:** January 29, 2026
**Previous Achievement:** 98/100 tests passing (98%) for statistical functions

## Overview
Implement core Excel financial functions for time value of money, loan calculations, and investment analysis.

## Core Functions to Implement

### Day 4: Time Value of Money (5 functions)
1. **PV** (Present Value) - Calculate present value of future cash flows
2. **FV** (Future Value) - Calculate future value of investment
3. **PMT** (Payment) - Calculate loan/annuity payment amount
4. **NPER** (Number of Periods) - Calculate number of payment periods
5. **RATE** (Interest Rate) - Calculate interest rate per period

### Day 5: Investment Analysis (5 functions)
1. **NPV** (Net Present Value) - Calculate NPV of cash flows
2. **IRR** (Internal Rate of Return) - Calculate IRR of cash flows
3. **XNPV** (Extended NPV) - NPV with specific dates
4. **XIRR** (Extended IRR) - IRR with specific dates
5. **MIRR** (Modified IRR) - IRR with different reinvestment rate

## Implementation Strategy

### 1. Create Financial Functions Module
```
packages/core/src/functions/financial/
├── financial-functions.ts  (main implementations)
└── index.ts               (exports)
```

### 2. Function Signatures (Excel-compatible)

```typescript
// Day 4: Time Value of Money
PV(rate, nper, pmt, [fv], [type])
FV(rate, nper, pmt, [pv], [type])
PMT(rate, nper, pv, [fv], [type])
NPER(rate, pmt, pv, [fv], [type])
RATE(nper, pmt, pv, [fv], [type], [guess])

// Day 5: Investment Analysis
NPV(rate, value1, [value2], ...)
IRR(values, [guess])
XNPV(rate, values, dates)
XIRR(values, dates, [guess])
MIRR(values, finance_rate, reinvest_rate)
```

### 3. Key Implementation Notes

**PV/FV/PMT Formulas:**
- These use the annuity formula: `PV = PMT × [(1 - (1 + r)^(-n)) / r] + FV / (1 + r)^n`
- Type parameter: 0 = end of period (default), 1 = beginning of period

**IRR/XIRR:**
- Requires Newton-Raphson iteration to find root
- Start with guess (default 0.1 = 10%)
- Max iterations: 100, tolerance: 1e-7

**Financial Function Properties:**
- All are array functions (no broadcasting)
- Support both ranges and individual values
- Return #NUM! for invalid parameters (negative nper, rate issues, etc.)
- Return #VALUE! for non-numeric inputs

### 4. Test Strategy

Create comprehensive test suites:
```
packages/core/__tests__/functions/
├── financial-basic.test.ts      (~30 tests for Day 4)
└── financial-investment.test.ts (~30 tests for Day 5)
```

**Test Categories:**
- Basic calculations (known values)
- Edge cases (zero rate, negative values)
- Excel compatibility (match Excel results exactly)
- Error handling (#NUM!, #VALUE!, #DIV/0!)
- Integration tests (combining multiple functions)

### 5. Known Challenges & Solutions

**Challenge 1: IRR/XIRR Convergence**
- Solution: Implement Newton-Raphson with proper bounds checking
- Fallback to bisection method if Newton-Raphson fails
- Return #NUM! if no solution after max iterations

**Challenge 2: Floating Point Precision**
- Solution: Use `.toBeCloseTo()` in tests with appropriate precision
- Financial calculations typically need 8-10 decimal places
- Consider rounding final results to cents for currency

**Challenge 3: Array Arguments**
- Solution: Add financial functions to `isArrayFunction` list in FormulaEngine.ts
- Use `filterNumbers(array)` to extract numeric values
- Support both ranges (A1:A10) and value lists (1,2,3,4,5)

### 6. Implementation Checklist

**Day 4:**
- [ ] Create financial-functions.ts with PV, FV, PMT, NPER, RATE
- [ ] Create financial-basic.test.ts with 30+ tests
- [ ] Add functions to function registry
- [ ] Add functions to isArrayFunction list
- [ ] Run tests, fix issues
- [ ] Update CHANGELOG.md

**Day 5:**
- [ ] Implement NPV, IRR, XNPV, XIRR, MIRR
- [ ] Create financial-investment.test.ts with 30+ tests
- [ ] Add Newton-Raphson solver helper
- [ ] Verify Excel compatibility
- [ ] Run full test suite (target: 160/160+ passing)
- [ ] Update CHANGELOG.md

### 7. Success Metrics

**Target: 60+ new tests, >95% pass rate**

- Day 4: 30+ tests for time value functions
- Day 5: 30+ tests for investment functions
- Combined with Week 8 Days 1-3: 160+ total tests
- Overall pass rate: >95% (152/160 tests passing)

### 8. Excel Compatibility Examples

```javascript
// PV: Loan of $10,000 at 5% annual rate for 5 years
=PV(5%/12, 5*12, -200)  → $11,268.25

// FV: Invest $100/month at 6% annual for 10 years
=FV(6%/12, 10*12, -100, 0, 0)  → $16,387.93

// PMT: Monthly payment on $200,000 loan at 4% for 30 years
=PMT(4%/12, 30*12, 200000)  → -$954.83

// NPV: Discount rate 10%, cash flows -1000, 300, 300, 300, 300
=NPV(10%, 300, 300, 300, 300) - 1000  → -$47.08

// IRR: Cash flows -1000, 300, 300, 300, 300
=IRR({-1000, 300, 300, 300, 300})  → 7.71%
```

### 9. Next Steps After Days 4-5

**Week 9 Options:**
1. **UI Polish:** Formula bar with autocomplete + error highlighting
2. **More Financial:** Depreciation (SLN, DB, DDB), Bond functions (PRICE, YIELD)
3. **Database Functions:** DSUM, DAVERAGE, DCOUNT with criteria tables
4. **Array Formulas:** FILTER, SORT, UNIQUE implementation

---

## Benefits of Financial Functions First

1. **Pattern Reuse:** Leverages all fixes from statistical functions
2. **Quick Win:** Can complete 60+ tests in 2 days
3. **Market Appeal:** Financial analysis is a killer feature
4. **Foundation:** Enables more complex models (DCF, loan amortization, portfolio analysis)
5. **Testing Confidence:** Continues momentum from 98% pass rate achievement

---

**Let's build financial functions that make Cyber Sheet a serious Excel competitor!** 💰📊
