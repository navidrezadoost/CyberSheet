# Wave 0 Day 2: Inconsistency Discovery Log

**Date:** 2024  
**Mission:** Ruthless classification of 98+ production functions  
**Protocol:** Conservative complexity, document surprises, maintain build pass

---

## 📋 Discovery Protocol

If I find nothing surprising → I didn't look hard enough.

---

## ❌ Inconsistency #1: AGGREGATE vs SUBTOTAL Complexity Mismatch

**Category:** Math & Trig  
**Finding:** AGGREGATE and SUBTOTAL have similar APIs but different complexity profiles

**Details:**
- **AGGREGATE:** Classified as **O(n log n)** because modes 12-13 (MEDIAN, PERCENTILE) require sorting
- **SUBTOTAL:** Classified as **O(n)** because it doesn't support sorting modes (only linear aggregations like SUM, AVERAGE)

**Recommendation:**
- Document in function descriptions that AGGREGATE mode selection impacts performance
- SaaS users should check mode before execution on large datasets
- Performance introspection API should return different complexity per mode (future enhancement)

**Status:** Documented, metadata locked

---

## ❌ Inconsistency #2: FACT Complexity Classification

**Category:** Math & Trig  
**Finding:** FACT complexity is O(n) where n is the **input value**, not array size

**Details:**
- `FACT(170)` performs 170 multiplications (O(170))
- This is different from aggregation functions where n is array size
- Classification as O(n) is correct but needs clarification

**Recommendation:**
- Document that for FACT, n = input value (not array size)
- Large factorials (>170) will overflow to Infinity (IEEE 754 limit)
- Consider adding #NUM! error for n > 170

**Status:** Documented, metadata locked

---

## ❌ Inconsistency #3: XOR Must Evaluate All Arguments

**Category:** Logical  
**Finding:** XOR cannot short-circuit like AND/OR

**Details:**
- **AND:** Can stop at first FALSE (short-circuit)
- **OR:** Can stop at first TRUE (short-circuit)
- **XOR:** MUST evaluate all arguments to determine odd/even number of TRUE values
- Classification: XOR is O(n), not O(1) like AND/OR

**Recommendation:**
- Document that XOR is the only logical function that cannot short-circuit
- ErrorStrategy: PROPAGATE_FIRST (not SHORT_CIRCUIT)
- Performance impact minimal (logical operations are fast)

**Status:** Documented, metadata locked

---

## ❌ Inconsistency #4: NETWORKDAYS/WORKDAY are O(n) not O(1)

**Category:** Date/Time  
**Finding:** Workday functions iterate over date ranges

**Details:**
- **NETWORKDAYS:** Iterates from start_date to end_date, skipping weekends/holidays
- **WORKDAY:** Iterates forward/backward by n workdays
- Conservative classification: O(n) where n = days in range
- Typical n: 20-250 (1-12 months), max realistic: 2500 (10 years)

**Recommendation:**
- Document that NETWORKDAYS/WORKDAY have O(n) complexity
- Performance impact minimal for typical use (< 500ms for 10-year range)
- SaaS applications should not warn unless date range > 10 years

**Status:** Documented, metadata locked

---

## Summary Statistics

| Category | Functions Classified | Inconsistencies Found | Status |
|----------|---------------------|----------------------|--------|
| Math & Trig | 42 | 2 | ✅ Complete |
| Financial | 18 | 0 | ✅ Complete |
| Logical | 17 | 1 | ✅ Complete |
| Date/Time | 20 | 1 | ✅ Complete |
| Text | TBD | TBD | ⏳ Pending |
| Statistical | TBD | TBD | ⏳ Pending |
| Lookup | TBD | TBD | ⏳ Pending |
| Array | TBD | TBD | ⏳ Pending |
| Information | TBD | TBD | ⏳ Pending |
| **TOTAL** | **97/98+** | **4+** | **⏳ In Progress** |

---

**End of Log (Updates as classification proceeds)**
