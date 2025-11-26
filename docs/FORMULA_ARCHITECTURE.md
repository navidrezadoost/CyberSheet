# Formula Writing Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         User Interface Layer                         │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                        FormulaBar                              │  │
│  │  • Cell reference display (A1, B5, etc.)                      │  │
│  │  • Formula input with validation                              │  │
│  │  • Error message display                                      │  │
│  │  • Keyboard handling (Enter/Escape)                           │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                     useFormulaController                       │  │
│  │  • State management hook                                      │  │
│  │  • Automatic worksheet sync                                   │  │
│  │  • Event-driven updates                                       │  │
│  │  • Controlled operations                                      │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ React Props & Callbacks
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Controller Layer                               │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                     FormulaController                          │  │
│  │                                                                │  │
│  │  validateFormula(formula, address)                            │  │
│  │  ├─ Syntax validation                                         │  │
│  │  ├─ Function name checking                                    │  │
│  │  ├─ Circular reference detection                              │  │
│  │  └─ Error type classification                                 │  │
│  │                                                                │  │
│  │  setFormula(address, formula)                                 │  │
│  │  ├─ Validate formula                                          │  │
│  │  ├─ Evaluate using FormulaEngine                              │  │
│  │  ├─ Update cell data                                          │  │
│  │  └─ Emit cell-changed event                                   │  │
│  │                                                                │  │
│  │  getFormula(address) → string | undefined                     │  │
│  │  clearFormula(address)                                        │  │
│  │  recalculate(address) → boolean                               │  │
│  │  getAllFormulas() → Array<{address, formula, value}>          │  │
│  │  parseCellReference(ref) → Address                            │  │
│  │  formatCellReference(address) → string                        │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ Direct API Calls
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Core Engine Layer                            │
│                                                                       │
│  ┌────────────────────────┐      ┌─────────────────────────────┐   │
│  │   FormulaEngine        │      │      Worksheet              │   │
│  │                        │      │                             │   │
│  │  • evaluate()          │◄─────│  • cells Map                │   │
│  │  • Built-in functions  │      │  • getCellValue()           │   │
│  │  • Expression parsing  │      │  • getCell()                │   │
│  │  • Dependency tracking │      │  • Event emitter            │   │
│  │  • Circular detection  │      │                             │   │
│  └────────────────────────┘      └─────────────────────────────┘   │
│           │                                   │                      │
│           │                                   │                      │
│  ┌────────▼───────────────┐      ┌───────────▼─────────────────┐   │
│  │  DependencyGraph       │      │      Cell Data Model        │   │
│  │                        │      │                             │   │
│  │  • addDependency()     │      │  {                          │   │
│  │  • getDependents()     │      │    value: CellValue         │   │
│  │  • clearDependencies() │      │    formula?: string         │   │
│  │  • Topological sort    │      │    style?: CellStyle        │   │
│  └────────────────────────┘      │  }                          │   │
│                                   └─────────────────────────────┘   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Formula Submission Flow

```
User types "=SUM(A1:A10)" in FormulaBar
    │
    ├─► onValueChange(value)
    │       └─► Parent updates state
    │               └─► FormulaBar re-renders with new value
    │
    └─► User presses Enter
            │
            ├─► onFormulaSubmit("=SUM(A1:A10)")
            │       │
            │       ├─► validateFormula("=SUM(A1:A10)", {row: 1, col: 1})
            │       │       │
            │       │       ├─► Check syntax
            │       │       ├─► Check function names
            │       │       ├─► Detect circular refs
            │       │       └─► Return { isValid: true }
            │       │
            │       ├─► setFormula({row: 1, col: 1}, "=SUM(A1:A10)")
            │       │       │
            │       │       ├─► FormulaEngine.evaluate("=SUM(A1:A10)", context)
            │       │       │       │
            │       │       │       ├─► Parse expression
            │       │       │       ├─► Resolve cell references
            │       │       │       ├─► Call SUM function
            │       │       │       └─► Return computed value (e.g., 45)
            │       │       │
            │       │       ├─► Update cell.formula = "=SUM(A1:A10)"
            │       │       ├─► Update cell.value = 45
            │       │       └─► Emit 'cell-changed' event
            │       │
            │       └─► Event propagates
            │               │
            │               ├─► useFormulaController receives event
            │               │       └─► Updates React state
            │               │               └─► FormulaBar re-renders
            │               │
            │               └─► Other listeners notified
            │
            └─► onEditModeChange(false)
```

### 2. Cell Selection Flow

```
User clicks cell B5
    │
    ├─► CyberSheet emits 'cell-click' event
    │       │
    │       ├─► setSelectedCell({row: 5, col: 2})
    │       │       │
    │       │       └─► useFormulaController updates
    │       │               │
    │       │               ├─► controller.getFormula({row: 5, col: 2})
    │       │               ├─► worksheet.getCellValue({row: 5, col: 2})
    │       │               │
    │       │               └─► Update state
    │       │                       ├─► currentFormula = "=A5*2"
    │       │                       ├─► currentValue = 20
    │       │                       └─► hasFormula = true
    │       │
    │       └─► FormulaBar receives new props
    │               │
    │               ├─► Shows "B5" in cell reference box
    │               ├─► Shows "=A5*2" in input field
    │               └─► Updates UI
    │
    └─► setIsEditMode(false)
```

### 3. Auto-Recalculation Flow

```
User changes A1 from 10 to 20
    │
    ├─► worksheet.setCellValue({row: 1, col: 1}, 20)
    │       │
    │       ├─► Update cell.value = 20
    │       └─► Emit 'cell-changed' event
    │
    ├─► DependencyGraph.getDependents({row: 1, col: 1})
    │       │
    │       └─► Returns [{row: 2, col: 1}, {row: 3, col: 1}]  (cells with formulas using A1)
    │
    ├─► For each dependent cell:
    │       │
    │       ├─► Get cell.formula
    │       ├─► FormulaEngine.evaluate(formula, context)
    │       ├─► Update cell.value with new result
    │       └─► Emit 'cell-changed' event
    │
    └─► UI updates automatically via event listeners
```

## Error Handling Flow

```
User enters invalid formula "=SUM(A1:"
    │
    ├─► validateFormula("=SUM(A1:", {row: 1, col: 1})
    │       │
    │       ├─► FormulaEngine.evaluate() throws error
    │       │
    │       └─► Return {
    │               isValid: false,
    │               error: "Syntax error: incomplete range reference",
    │               errorType: "SYNTAX"
    │           }
    │
    ├─► setValidationError("Syntax error: incomplete range reference")
    │       │
    │       └─► FormulaBar shows error in red text
    │
    └─► Formula not set (cell unchanged)
```

## Component Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                    Component Mount                           │
│                                                              │
│  1. Workbook created                                        │
│  2. Worksheet added                                         │
│  3. FormulaController instantiated                          │
│  4. useFormulaController hook initializes                   │
│  5. Event listeners attached                                │
│  6. Initial state computed                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    User Interaction                          │
│                                                              │
│  • Type in formula bar                                      │
│  • Click cells                                              │
│  • Press Enter/Escape                                       │
│  • Change cell values                                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    State Updates                             │
│                                                              │
│  • Validation runs                                          │
│  • Formulas evaluated                                       │
│  • Dependencies tracked                                     │
│  • Events emitted                                           │
│  • React state updated                                      │
│  • UI re-renders                                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Principles

### 1. Separation of Concerns
- **Core (`@cyber-sheet/core`)**: Business logic, validation, evaluation
- **React (`@cyber-sheet/react`)**: UI components, state management
- **Clear boundaries**: No React code in core, no business logic in components

### 2. Controlled Components
- All state managed by parent
- Changes flow through callbacks
- Predictable behavior
- Easy to test

### 3. Event-Driven Architecture
- Cell changes emit events
- Multiple listeners supported
- Loose coupling
- Easy to extend

### 4. Immutability
- State updates create new objects
- No mutation of props
- Predictable rendering
- React-friendly

### 5. Type Safety
- Full TypeScript support
- Typed error messages
- Interface contracts
- Compile-time checks

## Performance Characteristics

### Formula Validation
- **Time Complexity**: O(n) where n = formula length
- **Space Complexity**: O(1)
- **Caching**: None (validation is cheap)

### Formula Evaluation
- **Time Complexity**: O(f + r) where f = formula complexity, r = references
- **Space Complexity**: O(d) where d = dependency depth
- **Caching**: Results cached in cell.value

### Dependency Tracking
- **Time Complexity**: O(1) for add/get operations
- **Space Complexity**: O(n) where n = number of dependencies
- **Graph Storage**: Two-way maps for fast lookups

### Auto-Recalculation
- **Time Complexity**: O(d * f) where d = dependents, f = formula complexity
- **Optimization**: Topological sort prevents duplicate calculations
- **Circular Detection**: O(n) where n = dependency chain length
