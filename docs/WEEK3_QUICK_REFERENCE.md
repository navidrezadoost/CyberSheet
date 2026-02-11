# Week 3 Quick Reference: LAMBDA & Functional Programming

## 🎯 The Vision

Transform CyberSheet into a **functional programming powerhouse** where users can:
- Define custom reusable functions
- Use local variables for clarity
- Process arrays with functional primitives
- Build sophisticated data pipelines

---

## 🔥 Power User Examples

### Example 1: Custom VLOOKUP with Error Handling
```excel
// Define once, use everywhere
SafeVLOOKUP = LAMBDA(value, table, col,
  LET(
    result, XLOOKUP(value, INDEX(table,,1), INDEX(table,,col)),
    IF(ISERROR(result), "Not Found", result)
  )
)

// Use it
=SafeVLOOKUP(A1, ProductTable, 3)
```

### Example 2: Data Cleaning Pipeline
```excel
CleanAndAnalyze = LAMBDA(data,
  LET(
    // Step 1: Remove duplicates
    unique, UNIQUE(data),
    // Step 2: Filter valid rows
    valid, FILTER(unique, BYROW(unique, LAMBDA(row, INDEX(row,1)<>""))),
    // Step 3: Sort by total
    withTotals, BYROW(valid, LAMBDA(row, SUM(row))),
    sorted, SORTBY(valid, withTotals, -1),
    // Step 4: Return top 10
    sorted
  )
)

=CleanAndAnalyze(RawData)
```

### Example 3: Financial Calculations
```excel
// Compound interest calculator
CompoundInterest = LAMBDA(principal, rate, years,
  LET(
    periods, years * 12,
    monthlyRate, rate / 12,
    factor, (1 + monthlyRate) ^ periods,
    principal * factor
  )
)

=CompoundInterest(10000, 0.05, 10)  → Future value after 10 years
```

### Example 4: Statistical Analysis
```excel
// Z-score normalization
Normalize = LAMBDA(arr,
  LET(
    mean, AVERAGE(arr),
    stdev, STDEV(arr),
    MAP(arr, LAMBDA(x, (x - mean) / stdev))
  )
)

=Normalize(TestScores)  → Normalized scores
```

### Example 5: Recursive Functions
```excel
// Fibonacci sequence
Fibonacci = LAMBDA(n,
  IF(n <= 2, 1, Fibonacci(n-1) + Fibonacci(n-2))
)

=Fibonacci(10)  → 55

// Factorial
Factorial = LAMBDA(n,
  IF(n <= 1, 1, n * Factorial(n-1))
)

=Factorial(5)  → 120
```

### Example 6: Array Transformations
```excel
// Matrix multiplication
MatrixMultiply = LAMBDA(A, B,
  BYROW(A, LAMBDA(row,
    BYCOL(B, LAMBDA(col,
      REDUCE(0, SEQUENCE(COLUMNS(A)), LAMBDA(sum, i,
        sum + INDEX(row,i) * INDEX(col,i)
      ))
    ))
  ))
)

=MatrixMultiply(Matrix1, Matrix2)
```

### Example 7: Data Validation
```excel
// Validate email format
IsValidEmail = LAMBDA(email,
  LET(
    hasAt, ISNUMBER(SEARCH("@", email)),
    hasDot, ISNUMBER(SEARCH(".", email)),
    atPos, SEARCH("@", email),
    dotPos, SEARCH(".", email),
    AND(hasAt, hasDot, dotPos > atPos)
  )
)

// Filter valid emails
=FILTER(EmailList, BYROW(EmailList, IsValidEmail))
```

### Example 8: Running Calculations
```excel
// Running total using REDUCE
RunningTotal = LAMBDA(arr,
  LET(
    length, COUNTA(arr),
    REDUCE(
      SEQUENCE(length, 1, 0),
      SEQUENCE(length),
      LAMBDA(result, i,
        LET(
          prev, IF(i=1, 0, INDEX(result, i-1)),
          current, INDEX(arr, i),
          REPLACE(result, i, 1, prev + current)
        )
      )
    )
  )
)

=RunningTotal(Sales)
```

### Example 9: Monte Carlo Simulation
```excel
// Simulate 1000 dice rolls
=LET(
  rolls, RANDARRAY(1000, 1, 1, 6, TRUE),
  avg, AVERAGE(rolls),
  stdev, STDEV(rolls),
  "Average: " & TEXT(avg, "0.00") & ", StDev: " & TEXT(stdev, "0.00")
)

// Probability distribution
=LET(
  samples, RANDARRAY(10000, 1, 0, 1),
  mean, 0.5,
  stddev, 0.15,
  normal, MAP(samples, LAMBDA(u, mean + stddev * SQRT(-2*LN(u)) * COS(2*PI()*u))),
  histogram, FREQUENCY(normal, SEQUENCE(10, 1, 0, 0.1)),
  histogram
)
```

### Example 10: Text Processing
```excel
// Title case converter
ToTitleCase = LAMBDA(text,
  LET(
    words, TEXTSPLIT(text, " "),
    capitalized, MAP(words, LAMBDA(word,
      UPPER(LEFT(word,1)) & LOWER(MID(word,2,LEN(word)))
    )),
    TEXTJOIN(" ", TRUE, capitalized)
  )
)

=ToTitleCase("hello world")  → "Hello World"
```

---

## 🎨 Function Composition Patterns

### Pattern 1: Filter → Transform → Aggregate
```excel
=LET(
  filtered, FILTER(data, condition),
  transformed, MAP(filtered, LAMBDA(x, x * 2)),
  result, SUM(transformed),
  result
)
```

### Pattern 2: Generate → Process → Sort
```excel
=LET(
  generated, SEQUENCE(100, 1, 1, 1),
  processed, MAP(generated, LAMBDA(n, n^2)),
  sorted, SORT(processed, 1, -1),
  sorted
)
```

### Pattern 3: Multiple Arrays → Combine → Reduce
```excel
=LET(
  combined, MAP(arr1, arr2, arr3, LAMBDA(a, b, c, a + b + c)),
  total, REDUCE(0, combined, LAMBDA(sum, val, sum + val)),
  total
)
```

---

## 🧠 Key Concepts

### Closures
Lambdas can capture variables from outer scope:
```excel
=LET(
  multiplier, 10,
  TimesN, LAMBDA(x, x * multiplier),
  MAP(A1:A10, TimesN)
)
```

### Recursion
Functions can call themselves:
```excel
Sum = LAMBDA(arr,
  IF(COUNTA(arr)=0, 0, INDEX(arr,1) + Sum(DROP(arr,1)))
)
```

### Higher-Order Functions
Functions that take functions as arguments:
```excel
ApplyTwice = LAMBDA(func, x, func(func(x)))
=ApplyTwice(LAMBDA(n, n*2), 5)  → 20
```

---

## 📚 Best Practices

### 1. Name Your Lambdas
```excel
// Good
Discount = LAMBDA(price, price * 0.9)
=Discount(100)

// Avoid inline for reuse
=LAMBDA(price, price * 0.9)(100)
```

### 2. Use LET for Readability
```excel
// Good
=LET(
  total, SUM(Sales),
  avg, AVERAGE(Sales),
  IF(total > avg * 10, "High", "Low")
)

// Avoid nested functions
=IF(SUM(Sales) > AVERAGE(Sales) * 10, "High", "Low")
```

### 3. Break Complex Logic Into Steps
```excel
// Good
ProcessRow = LAMBDA(row,
  LET(
    validated, ValidateRow(row),
    cleaned, CleanRow(validated),
    scored, ScoreRow(cleaned),
    scored
  )
)

// Avoid deeply nested lambdas
```

### 4. Document Function Purpose
```excel
// Calculate monthly payment for a loan
// Parameters: principal, annual rate, years
MonthlyPayment = LAMBDA(P, r, n,
  LET(
    i, r/12,
    periods, n*12,
    P * i * (1+i)^periods / ((1+i)^periods - 1)
  )
)
```

---

## 🚀 Performance Tips

1. **Use LET to avoid recalculation**
   ```excel
   // Efficient - calculates SUM once
   =LET(total, SUM(A1:A1000), total/1000 + total*0.1)
   
   // Inefficient - calculates SUM twice
   =SUM(A1:A1000)/1000 + SUM(A1:A1000)*0.1
   ```

2. **Cache expensive operations**
   ```excel
   =LET(
     sorted, SORT(UNIQUE(FILTER(data, condition))),
     count, COUNTA(sorted),
     avg, AVERAGE(sorted),
     // Use cached sorted, count, avg multiple times
     ...
   )
   ```

3. **Limit recursion depth**
   ```excel
   SafeRecursion = LAMBDA(n, depth,
     IF(depth > 100, "MAX_DEPTH",
       IF(n <= 1, 1, n * SafeRecursion(n-1, depth+1))
     )
   )
   ```

---

## 🎯 Week 3 Implementation Priority

### Must-Have (Week 3):
- ✅ LAMBDA (anonymous & named)
- ✅ LET (local variables)
- ✅ BYROW / BYCOL
- ✅ MAP / REDUCE
- ✅ RANDARRAY / RANDBETWEEN

### Nice-to-Have (Future):
- MAKEARRAY (generate arrays)
- SCAN (REDUCE with intermediate values)
- BYCELL (element-wise operations)
- Lambda currying (partial application)
- Async lambdas

---

## 📖 Learning Path

1. **Day 1**: Master LAMBDA basics
2. **Day 2**: Use LET for complex formulas
3. **Day 3**: Process arrays with BYROW/BYCOL
4. **Day 4**: Functional programming with MAP/REDUCE
5. **Day 5**: Generate test data with RANDARRAY

By end of Week 3, you'll be writing formulas that look like code! 🎉

---

**Ready to revolutionize spreadsheets? Let's start Week 3 Day 1 tomorrow!**
