# Week 3 Plan: LAMBDA & Functional Programming 🚀

## 🎯 Vision: Bring Functional Programming to Spreadsheets

Week 3 is about implementing **the most advanced spreadsheet features** - custom functions, local variables, and functional programming primitives. With LAMBDA, CyberSheet will offer capabilities that even Excel struggles with!

---

## 📅 5-Day Roadmap

### Day 1: LAMBDA - Custom Function Definition (The Killer Feature!)
**Target:** 200-250 lines | 35-40 tests

**Function Signature:**
```
LAMBDA(parameter1, [parameter2, ...], calculation)
```

**Features to Implement:**
- Define anonymous functions with parameters
- Support named lambdas (store in context)
- Closure support (capture outer variables)
- Recursion support
- Integration with other functions

**Implementation Strategy:**
1. Extend parser to recognize LAMBDA syntax
2. Create LambdaFunction type that wraps formula + parameters
3. Add lambda context/scope to evaluator
4. Support named lambda storage in worksheet
5. Handle parameter binding and evaluation

**Examples:**
```excel
// Simple lambda
=LAMBDA(x, x*2)(5)                              → 10

// Named lambda
DoubleIt = LAMBDA(x, x*2)
=DoubleIt(5)                                    → 10

// Multi-parameter
=LAMBDA(x, y, x^2 + y^2)(3, 4)                 → 25

// With array functions
=MAP(A1:A10, LAMBDA(x, x*2))                   → Double all values

// Recursive (factorial)
Factorial = LAMBDA(n, IF(n<=1, 1, n*Factorial(n-1)))
=Factorial(5)                                   → 120
```

**Test Categories:**
- Basic lambda creation and invocation (8 tests)
- Named lambdas (6 tests)
- Multi-parameter lambdas (5 tests)
- Closures and scope (6 tests)
- Recursion (5 tests)
- Error handling (5 tests)
- Performance (5 tests)

**Architecture Considerations:**
- Store named lambdas in worksheet context
- Lambda execution scope management
- Performance: avoid recompilation

---

### Day 2: LET - Local Variables
**Target:** 120-150 lines | 30-35 tests

**Function Signature:**
```
LET(name1, value1, [name2, value2, ...], calculation)
```

**Features to Implement:**
- Define multiple local variables
- Variable scoping (local to LET expression)
- Performance: calculate each value only once
- Support complex calculations

**Implementation Strategy:**
1. Parse name-value pairs
2. Create local scope/context
3. Evaluate values in order (allow dependencies)
4. Evaluate final calculation with bindings
5. Ensure values are cached (no recalc)

**Examples:**
```excel
// Basic LET
=LET(x, 5, x*2)                                → 10

// Multiple variables
=LET(x, 5, y, 3, x^2 + y^2)                    → 34

// Dependent variables
=LET(x, 10, y, x*2, z, y+5, z*3)               → 75

// Real-world: avoid recalculation
=LET(
  data, FILTER(A1:Z100, B1:B100>1000),
  sorted, SORT(data, 3, -1),
  unique, UNIQUE(sorted, 0, FALSE),
  unique
)

// Complex calculation with readability
=LET(
  revenue, SUM(Sales),
  costs, SUM(Expenses),
  profit, revenue - costs,
  margin, profit / revenue,
  IF(margin > 0.2, "Excellent", "Needs Improvement")
)
```

**Test Categories:**
- Basic LET usage (6 tests)
- Multiple variables (5 tests)
- Dependent variables (5 tests)
- Scoping and isolation (5 tests)
- Performance (no recalc) (4 tests)
- Error handling (5 tests)

---

### Day 3: BYROW / BYCOL - Array Processing
**Target:** 150-180 lines | 35-40 tests

**Function Signatures:**
```
BYROW(array, lambda)
BYCOL(array, lambda)
```

**Features to Implement:**
- Apply lambda to each row/column
- Return array of results
- Support 1D and 2D arrays
- Integrate with LAMBDA

**Implementation Strategy:**
1. Extract rows/columns from array
2. For each row/column, invoke lambda
3. Collect results into output array
4. Handle both inline lambdas and named lambdas

**Examples:**
```excel
// Sum each row
=BYROW(A1:C10, LAMBDA(row, SUM(row)))

// Custom calculation per row
=BYROW(data, LAMBDA(row, INDEX(row,1) * INDEX(row,2)))

// Average each column
=BYCOL(A1:Z10, LAMBDA(col, AVERAGE(col)))

// Complex row processing
=BYROW(sales, LAMBDA(row, 
  LET(
    qty, INDEX(row,1),
    price, INDEX(row,2),
    discount, INDEX(row,3),
    qty * price * (1 - discount)
  )
))

// Filter rows with custom condition
=FILTER(data, BYROW(data, LAMBDA(row, INDEX(row,3)>100)))
```

**Test Categories:**
- BYROW basic functionality (8 tests)
- BYCOL basic functionality (8 tests)
- Integration with LAMBDA (6 tests)
- 1D and 2D arrays (5 tests)
- Real-world scenarios (5 tests)
- Error handling (3 tests)

---

### Day 4: MAP / REDUCE - Functional Programming Primitives
**Target:** 180-220 lines | 40-45 tests

**Function Signatures:**
```
MAP(array1, [array2, ...], lambda)
REDUCE(initial_value, array, lambda)
```

**Features to Implement:**
- MAP: Apply function to parallel arrays
- REDUCE: Fold/accumulate array values
- Support multi-array MAP
- Handle edge cases (empty arrays, size mismatches)

**Implementation Strategy:**

**MAP:**
1. Parse multiple array inputs
2. Verify arrays have compatible sizes
3. For each position, call lambda with values from all arrays
4. Return result array

**REDUCE:**
1. Start with initial value
2. For each array element, call lambda(accumulator, current)
3. Update accumulator with result
4. Return final accumulator

**Examples:**
```excel
// MAP: Transform array
=MAP(A1:A10, LAMBDA(x, x^2))                   → Square all values

// MAP: Multi-array operation
=MAP(A1:A10, B1:B10, LAMBDA(x, y, x + y))      → Add parallel arrays

// MAP: Complex transformation
=MAP(prices, quantities, LAMBDA(p, q, p*q*1.1))  → Calculate total with tax

// REDUCE: Sum (custom)
=REDUCE(0, A1:A10, LAMBDA(acc, val, acc + val))

// REDUCE: Product
=REDUCE(1, A1:A10, LAMBDA(acc, val, acc * val))

// REDUCE: Custom aggregation
=REDUCE("", names, LAMBDA(acc, name, acc & name & ", "))

// REDUCE: Max finding with condition
=REDUCE(0, data, LAMBDA(max, val, 
  IF(val > max, val, max)
))

// Complex: Running total
=REDUCE(
  SEQUENCE(1, COLUMNS(sales), 0, 0),
  sales,
  LAMBDA(totals, row, totals + row)
)
```

**Test Categories:**
- MAP single array (8 tests)
- MAP multiple arrays (8 tests)
- REDUCE basic aggregations (8 tests)
- REDUCE custom operations (6 tests)
- Integration with LAMBDA (5 tests)
- Real-world scenarios (5 tests)
- Performance (2 tests)
- Error handling (3 tests)

---

### Day 5: RANDARRAY / RANDBETWEEN - Random Generation
**Target:** 100-120 lines | 30-35 tests

**Function Signatures:**
```
RANDARRAY(rows, [columns], [min], [max], [integer])
RANDBETWEEN(bottom, top)
```

**Features to Implement:**
- Generate random arrays with specified dimensions
- Support min/max bounds
- Integer vs decimal option
- Compatible with spill engine

**Implementation Strategy:**
1. Parse dimensions and constraints
2. Generate random values using Math.random()
3. Apply bounds and integer conversion
4. Return array for spilling

**Examples:**
```excel
// Basic random array
=RANDARRAY(10)                                  → 10 random decimals (0-1)

// Random integers in range
=RANDARRAY(5, 3, 1, 100, TRUE)                  → 5x3 grid of integers 1-100

// Random decimals in range
=RANDARRAY(10, 1, 0, 1, FALSE)                  → 10 decimals between 0-1

// Legacy function
=RANDBETWEEN(1, 100)                            → Random integer 1-100

// Simulations
=RANDARRAY(1000, 1, -3, 3)                      → 1000 random values for stats

// Test data generation
=LET(
  ids, SEQUENCE(100),
  ages, RANDARRAY(100, 1, 18, 65, TRUE),
  scores, RANDARRAY(100, 1, 0, 100, TRUE),
  HSTACK(ids, ages, scores)
)
```

**Test Categories:**
- RANDARRAY basic usage (8 tests)
- Bounds and integer mode (6 tests)
- Dimensions (1D, 2D) (5 tests)
- RANDBETWEEN (6 tests)
- Integration with other functions (5 tests)

---

## 🏗️ Architecture & Design

### Lambda Context Management
```typescript
type LambdaFunction = {
  parameters: string[];
  body: string;
  capturedScope?: Map<string, FormulaValue>;
};

class ExecutionContext {
  variables: Map<string, FormulaValue>;
  lambdas: Map<string, LambdaFunction>;
  parent?: ExecutionContext;
  
  resolve(name: string): FormulaValue;
  define(name: string, value: FormulaValue): void;
}
```

### Parser Extensions
- Recognize LAMBDA syntax: `LAMBDA(x, y, x+y)`
- Parse parameter lists
- Handle named function definitions
- Support nested lambdas

### Evaluator Extensions
- Maintain execution context stack
- Lambda invocation and parameter binding
- Scope isolation for LET
- Named lambda storage and retrieval

---

## 🎯 Week 3 Goals

### Quantitative Goals
- **Functions**: 5-6 major functions (LAMBDA, LET, BYROW, BYCOL, MAP, REDUCE, RANDARRAY, RANDBETWEEN)
- **Lines of Code**: ~900-1,100 lines
- **Tests**: 170-195 tests
- **Coverage**: >95%

### Qualitative Goals
- ✅ Full functional programming support
- ✅ Named lambda storage and reuse
- ✅ Closure support
- ✅ Recursion support
- ✅ Performance: lazy evaluation where possible
- ✅ Excellent error messages
- ✅ Real-world examples and documentation

---

## 🎓 Learning Objectives

By end of Week 3, CyberSheet users will be able to:

1. **Define Custom Functions**
   ```excel
   MyAverage = LAMBDA(arr, SUM(arr)/COUNTA(arr))
   =MyAverage(A1:A10)
   ```

2. **Use Local Variables**
   ```excel
   =LET(x, A1, y, B1, SQRT(x^2 + y^2))
   ```

3. **Process Arrays Functionally**
   ```excel
   =BYROW(data, LAMBDA(row, SUM(row)))
   =MAP(prices, LAMBDA(p, p * 1.08))
   ```

4. **Perform Reductions**
   ```excel
   =REDUCE(0, values, LAMBDA(sum, val, sum + val))
   ```

5. **Generate Test Data**
   ```excel
   =RANDARRAY(100, 5, 0, 1000, TRUE)
   ```

---

## 🚀 Why This Matters

### Industry Impact
- **Beyond Excel**: LAMBDA + REDUCE + MAP = true functional programming
- **Reusability**: Named lambdas eliminate formula duplication
- **Readability**: LET makes complex formulas understandable
- **Performance**: Lazy evaluation and caching optimize calculations

### User Benefits
- Write cleaner, more maintainable formulas
- Define domain-specific functions once, use everywhere
- Process arrays efficiently without helper columns
- Build sophisticated data pipelines in single cells

### Technical Excellence
- Demonstrates advanced interpreter capabilities
- Showcases functional programming in unexpected place
- Clean architecture with scope management
- Foundation for future enhancements (async, streaming)

---

## 📊 Success Metrics

### Code Quality
- [ ] All functions >95% test coverage
- [ ] Zero memory leaks in lambda execution
- [ ] Performance: <5ms overhead per lambda call
- [ ] Clean separation of concerns

### User Experience
- [ ] Intuitive lambda syntax
- [ ] Clear error messages
- [ ] Comprehensive documentation
- [ ] Real-world examples

### Feature Completeness
- [ ] Named lambdas with storage
- [ ] Closures working correctly
- [ ] Recursion without stack overflow
- [ ] Integration with all Week 2 functions

---

## 🎨 Example: Complete Functional Pipeline

```excel
// Define reusable lambdas
CleanRow = LAMBDA(row, 
  LET(
    trimmed, MAP(row, LAMBDA(cell, TRIM(cell))),
    nonEmpty, FILTER(trimmed, LAMBDA(cell, LEN(cell)>0)),
    nonEmpty
  )
)

ProcessData = LAMBDA(data,
  LET(
    cleaned, BYROW(data, CleanRow),
    withTotals, MAP(cleaned, LAMBDA(row,
      REDUCE(0, row, LAMBDA(sum, val, sum + val))
    )),
    sorted, SORTBY(cleaned, withTotals, -1),
    sorted
  )
)

// Use it
=ProcessData(A1:Z100)
```

---

## 🔮 Future Extensions (Beyond Week 3)

After mastering LAMBDA and functional programming:
- **MAKEARRAY**: Generate arrays from formulas
- **SCAN**: Like REDUCE but returns all intermediate values
- **LAMBDA currying**: Partial application
- **Async lambdas**: Non-blocking calculations
- **Lambda library**: Shareable function repository

---

## 📝 Daily Checklist Template

For each day:
- [ ] Implement core function logic
- [ ] Write comprehensive tests (aim for >35 per function)
- [ ] Document with examples
- [ ] Integration test with previous functions
- [ ] Performance benchmark
- [ ] Commit with detailed message
- [ ] Update Week 3 progress tracker

---

**Ready to make CyberSheet the most powerful spreadsheet engine ever?**

Let's start Week 3 Day 1 tomorrow with LAMBDA - the feature that will change everything! 🚀

---

**End of Week 3 Plan**  
*Created: End of Week 2*  
*Status: Ready to implement - Let's bring functional programming to spreadsheets!*
