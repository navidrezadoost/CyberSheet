# Week 2 Plan: Dynamic Array Functions

**Start Date**: Week 2, Day 1  
**Duration**: 5 Days  
**Focus**: Excel 365 Dynamic Array Functions + Spill Behavior  
**Goal**: Implement modern array formulas that auto-fill multiple cells

---

## 🎯 Week 2 Objectives

Transform CyberSheet into a modern Excel 365 compatible engine with:
- ✅ Dynamic array functions (XMATCH, SEQUENCE, UNIQUE, SORT, FILTER)
- ✅ Real SPILL behavior (blue borders, automatic expansion)
- ✅ `#` operator for spilled range references
- ✅ Multi-dimensional array formulas
- ✅ Backward compatibility with Week 1 functions

---

## 📅 5-Day Implementation Schedule

### **Day 1: XMATCH** (100-130 lines)
**Purpose**: Advanced replacement for MATCH with enhanced search capabilities

**Features to Implement**:
- `match_mode`: -1 (exact or smaller), 0 (exact, default), 1 (exact or larger), 2 (wildcard)
- `search_mode`: 1 (first-to-last, default), -1 (last-to-first), 2 (binary ascending), -2 (binary descending)
- Reverse search support (game-changer vs MATCH)
- Binary search with explicit mode parameter
- Enhanced error handling
- Full wildcard support

**Test Coverage**: 25-30 tests
- All match_mode combinations
- All search_mode combinations
- Reverse search scenarios
- Binary search validation
- Comparison with MATCH function
- Performance benchmarks

**Deliverables**:
- `XMATCH` function in FormulaEngine.ts
- `xmatch.test.ts` with comprehensive tests
- Comparison with MATCH documentation

---

### **Day 2: SEQUENCE** (80-120 lines)
**Purpose**: Generate arrays of sequential numbers (foundation for dynamic arrays)

**Features to Implement**:
- `SEQUENCE(rows, [columns], [start], [step])`
- 1D sequence generation (single column)
- 2D sequence generation (rows × columns)
- Custom start value and step
- Basic spill behavior (return 2D array)
- Integration with FormulaEngine array handling

**Test Coverage**: 20-25 tests
- 1D sequences (single column)
- 2D sequences (rows × columns)
- Custom start/step parameters
- Edge cases (large sequences, negative steps)
- Error handling (invalid parameters)
- Performance with large arrays

**Deliverables**:
- `SEQUENCE` function in FormulaEngine.ts
- `sequence.test.ts` with comprehensive tests
- Basic spill behavior (return arrays, not yet rendered)

---

### **Day 3: UNIQUE + SORT** (150-200 lines)
**Purpose**: Remove duplicates and sort arrays

#### **UNIQUE** (70-100 lines)
**Features**:
- `UNIQUE(array, [by_col], [exactly_once])`
- Remove duplicate rows
- Column-wise uniqueness (by_col=TRUE)
- Extract only unique values (exactly_once=TRUE)
- Preserve original order or sort

**Tests**: 15-20 tests

#### **SORT** (80-100 lines)
**Features**:
- `SORT(array, [sort_index], [sort_order], [by_col])`
- Multi-key sorting (sort by column index)
- Ascending/descending order
- Sort by rows or columns
- Stable sort algorithm

**Tests**: 20-25 tests

**Deliverables**:
- `UNIQUE` function in FormulaEngine.ts
- `SORT` function in FormulaEngine.ts
- `unique.test.ts` and `sort.test.ts`
- Combined tests (SORT(UNIQUE(...)))

---

### **Day 4: FILTER** (120-160 lines)
**Purpose**: Filter arrays based on conditions

**Features to Implement**:
- `FILTER(array, include, [if_empty])`
- Row-based filtering with boolean conditions
- if_empty parameter for no results
- Integration with comparison operators
- Multi-condition filtering (AND/OR logic)
- Dynamic array output with spill

**Test Coverage**: 25-30 tests
- Simple filtering (single condition)
- Multi-condition filtering (AND/OR)
- if_empty parameter handling
- Empty result scenarios
- Complex combinations (FILTER(SORT(...)))
- Performance with large datasets

**Deliverables**:
- `FILTER` function in FormulaEngine.ts
- `filter.test.ts` with comprehensive tests
- Combined dynamic array examples

---

### **Day 5: SPILL Engine + # Operator** (100-150 lines)
**Purpose**: Implement true Excel 365 spill behavior with visual indicators

**Features to Implement**:

#### **1. Spill Detection Engine**
- Detect when formula returns array (2D or 1D)
- Calculate spill range from source cell
- Check for #SPILL! error (blocked cells)
- Track spilled ranges in worksheet state

#### **2. # Operator Support**
- Parse `A1#` syntax in formulas
- Resolve to full spilled range
- Support in INDEX, OFFSET, etc.
- Dynamic range updates

#### **3. Renderer Integration**
- Blue border around spilled ranges
- Grayed-out content in spilled cells
- Source cell highlighting
- Interactive spill range selection

#### **4. Worksheet State Management**
- Store spilled range metadata
- Clear spill on source cell edit
- Handle #SPILL! blocked scenarios
- Recalculation on dependency changes

**Test Coverage**: 30-40 tests
- Spill detection with all dynamic functions
- # operator parsing and resolution
- #SPILL! error scenarios
- Multi-range spill interactions
- Renderer spill display
- Performance with multiple spills

**Deliverables**:
- Spill detection engine in FormulaEngine.ts
- `#` operator parser and resolver
- Renderer updates for spill visualization
- Worksheet spill state management
- `spill.test.ts` comprehensive test suite
- Integration tests with all dynamic functions

---

## 🎨 Visual Design: Spill Behavior

### Spilled Range Appearance
```
┌─────┬─────┬─────┐
│ =SEQ│  2  │  3  │  ← Blue border around spill
│  1  │     │     │
├─────┼─────┼─────┤
│  4  │  5  │  6  │  ← Grayed content in spilled cells
│     │     │     │
└─────┴─────┴─────┘
  A     B     C
```

### # Operator Usage
```
A1: =SEQUENCE(3,3)           → Spills to A1:C3
D1: =SUM(A1#)                → References entire spilled range A1:C3
D2: =INDEX(A1#, 2, 2)        → Gets value from spilled array
```

### #SPILL! Error
```
A1: =SEQUENCE(3,3)
B2: "Text"                   ← Blocking cell
A1 shows: #SPILL!            ← Cannot expand due to B2
```

---

## 📊 Week 2 Targets

| Metric | Target | Stretch Goal |
|--------|--------|--------------|
| Total Lines | 550-760 | 800+ |
| Total Tests | 135-170 | 200+ |
| Functions | 5 (XMATCH, SEQUENCE, UNIQUE, SORT, FILTER) | +spill engine |
| Test Pass Rate | 100% | 100% |
| Performance | <100ms for 1000-row arrays | <50ms |
| Excel Compatibility | Full Excel 365 | + spill behavior |

---

## 🔗 Integration Points

### With Week 1 Functions
- `XMATCH` + `INDEX`: Advanced two-way lookup
- `FILTER` + `XLOOKUP`: Filtered lookups
- `SORT` + `UNIQUE` + `OFFSET`: Dynamic sorted unique ranges
- `SEQUENCE` + `INDIRECT`: Dynamic range generation

### New Capabilities Unlocked
1. **Dynamic Reporting**: Auto-expanding tables without manual ranges
2. **Advanced Filtering**: Multi-condition data extraction
3. **Automatic Sorting**: Live-updated sorted views
4. **Deduplication**: One-formula unique value extraction
5. **Array Formulas**: Complex multi-cell calculations

---

## 🧪 Testing Strategy

### Unit Tests
- Each function: 20-30 tests
- All parameter combinations
- Edge cases and errors
- Performance benchmarks

### Integration Tests
- Cross-function combinations
- Spill behavior validation
- # operator resolution
- Renderer display tests

### Real-World Scenarios
- Dashboard formulas
- Dynamic reports
- Data transformation pipelines
- Complex array manipulations

---

## 📝 Documentation Deliverables

1. **Function Documentation**
   - Parameter descriptions
   - Return value specifications
   - Excel compatibility notes
   - Usage examples

2. **Spill Behavior Guide**
   - How spill detection works
   - # operator usage patterns
   - #SPILL! error resolution
   - Best practices

3. **Migration Guide**
   - Converting Ctrl+Shift+Enter arrays
   - Dynamic array advantages
   - Performance considerations

---

## 🎯 Success Criteria

### Functional Requirements
- ✅ All 5 dynamic array functions working
- ✅ Real spill behavior with visual indicators
- ✅ # operator fully functional
- ✅ #SPILL! error detection
- ✅ 100% test coverage

### Performance Requirements
- ✅ <100ms for 1000-row SORT
- ✅ <50ms for 1000-row FILTER
- ✅ <10ms for SEQUENCE(100,100)
- ✅ Instant # operator resolution

### Compatibility Requirements
- ✅ Excel 365 parity for all functions
- ✅ Backward compatible with Week 1
- ✅ Works with existing FormulaEngine
- ✅ No breaking changes

---

## 🚀 Getting Started (Day 1)

### Immediate Tasks
1. ✅ Create Week 2 plan document
2. 🔄 Implement XMATCH function
3. 🔄 Write comprehensive XMATCH tests
4. 🔄 Compare with MATCH performance
5. 🔄 Commit and document

### Day 1 Focus: XMATCH
**Time Estimate**: 3-4 hours  
**Complexity**: Medium (building on MATCH)  
**Key Challenge**: Reverse search and binary modes

Let's make CyberSheet truly modern! 🎉

---

**Created**: Week 2, Day 1  
**Author**: GitHub Copilot + User  
**Status**: 📋 READY TO EXECUTE
