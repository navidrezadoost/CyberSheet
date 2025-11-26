# Formula Writing Implementation Guide

## Overview

This implementation provides a complete, controlled formula writing and editing system for CyberSheet. The architecture follows a clear separation of concerns: core logic in the `@cyber-sheet/core` package and controlled React components in the `@cyber-sheet/react` package.

## Architecture

### Core Layer (`@cyber-sheet/core`)

#### `FormulaController`
The main controller for managing formula operations with validation and auto-recalculation.

**Key Features:**
- Formula validation before setting
- Cell reference parsing and formatting
- Error handling with typed error messages
- Integration with existing `FormulaEngine`

**Methods:**
```typescript
// Validate a formula without setting it
validateFormula(formula: string, cellAddress: Address): FormulaValidationResult

// Set a formula for a cell with validation
setFormula(address: Address, formula: string): FormulaValidationResult

// Get formula for a cell
getFormula(address: Address): string | undefined

// Clear formula from a cell
clearFormula(address: Address): void

// Recalculate a cell's formula
recalculate(address: Address): boolean

// Get all cells with formulas
getAllFormulas(): Array<{ address, formula, value }>

// Parse cell reference (e.g., "A1" -> {row: 1, col: 1})
parseCellReference(ref: string): Address | null

// Format cell address (e.g., {row: 1, col: 1} -> "A1")
formatCellReference(address: Address): string
```

**Error Types:**
- `SYNTAX` - Invalid formula syntax
- `CIRCULAR` - Circular reference detected
- `NAME` - Unknown function name
- `VALUE` - Invalid value type
- `REF` - Invalid cell reference

### React Layer (`@cyber-sheet/react`)

#### `FormulaBar` Component
A controlled component for displaying and editing cell formulas.

**Props:**
```typescript
interface FormulaBarProps {
  selectedCell: Address | null;        // Currently selected cell
  cellValue: CellValue;                 // Current cell value
  cellFormula?: string;                 // Current cell formula
  onFormulaSubmit: (formula: string) => void;  // Formula submit handler
  onValueChange?: (value: string) => void;     // Value change handler
  isEditing: boolean;                   // Edit mode state
  onEditModeChange: (editing: boolean) => void; // Edit mode handler
  validationError?: string;             // Validation error message
  className?: string;                   // Custom class name
  style?: React.CSSProperties;          // Custom styles
}
```

**Features:**
- Real-time input with controlled state
- Enter to submit, Escape to cancel
- Automatic focus management
- Cell reference display (e.g., "A1")
- Validation error display
- Support for both formulas and direct values

#### `useFormulaController` Hook
React hook for managing formula state with controlled behavior.

**Usage:**
```typescript
const {
  controller,           // FormulaController instance
  currentFormula,       // Current formula for selected cell
  currentValue,         // Current value for selected cell
  setFormula,          // Set formula for current cell
  clearFormula,        // Clear formula from current cell
  validateFormula,     // Validate a formula
  hasFormula,          // Whether current cell has a formula
  recalculate,         // Recalculate current cell
} = useFormulaController({
  worksheet,           // Worksheet instance
  selectedCell,        // Currently selected cell
});
```

**Features:**
- Automatic state synchronization with worksheet
- Event-driven updates on cell changes
- Validation integration
- Controlled formula operations

## Usage Example

### Basic Setup

```tsx
import React, { useState } from 'react';
import { Workbook, Address } from '@cyber-sheet/core';
import { CyberSheet, FormulaBar, useFormulaController } from '@cyber-sheet/react';

function SpreadsheetApp() {
  const [workbook] = useState(() => {
    const wb = new Workbook();
    wb.addSheet('Sheet1', 100, 26);
    return wb;
  });

  const [selectedCell, setSelectedCell] = useState<Address | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [validationError, setValidationError] = useState<string>();

  const worksheet = workbook.getSheet('Sheet1')!;

  // Use formula controller
  const {
    currentFormula,
    currentValue,
    setFormula,
    validateFormula,
  } = useFormulaController({
    worksheet,
    selectedCell,
  });

  // Handle formula submission
  const handleFormulaSubmit = (formula: string) => {
    if (!selectedCell) return;

    if (!formula.trim()) {
      worksheet.setCellValue(selectedCell, null);
      return;
    }

    if (!formula.startsWith('=')) {
      // Direct value
      const num = parseFloat(formula);
      worksheet.setCellValue(selectedCell, !isNaN(num) ? num : formula);
      return;
    }

    // Validate and set formula
    const validation = validateFormula(formula);
    if (!validation.isValid) {
      setValidationError(validation.error);
      return;
    }

    const result = setFormula(formula);
    if (!result.success) {
      setValidationError(result.error);
    } else {
      setValidationError(undefined);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <FormulaBar
        selectedCell={selectedCell}
        cellValue={currentValue}
        cellFormula={currentFormula}
        onFormulaSubmit={handleFormulaSubmit}
        isEditing={isEditMode}
        onEditModeChange={setIsEditMode}
        validationError={validationError}
      />

      <div style={{ flex: 1 }}>
        <CyberSheet
          workbook={workbook}
          sheetName="Sheet1"
          onRendererReady={(renderer) => {
            worksheet.on((event) => {
              if (event.type === 'cell-click') {
                setSelectedCell(event.event.address);
                setIsEditMode(false);
              }
            });
          }}
        />
      </div>
    </div>
  );
}
```

### Formula Examples

The implementation supports 100+ Excel-compatible functions:

```javascript
// Arithmetic
=A1+B1
=SUM(A1:A10)
=AVERAGE(B1:B10)
=A1*B1/C1

// Logic
=IF(A1>10, "High", "Low")
=AND(A1>0, B1<100)
=OR(A1>10, B1>10)

// Text
=CONCATENATE(A1, " ", B1)
=LEFT(A1, 5)
=UPPER(A1)

// Lookup & Reference
=VLOOKUP(A1, A1:B10, 2, FALSE)
=INDEX(A1:A10, 5)
=MATCH(A1, B1:B10, 0)

// Statistical
=MIN(A1:A10)
=MAX(A1:A10)
=COUNT(A1:A10)
=STDEV(A1:A10)

// Date & Time
=TODAY()
=NOW()
=YEAR(A1)
=MONTH(A1)
```

## Controlled Behavior

The implementation follows React's controlled component pattern:

### Formula Bar
- Input value is controlled by parent component
- Changes trigger `onValueChange` callback
- Submit triggers `onFormulaSubmit` callback
- Edit mode controlled by `isEditing` prop

### Formula Controller
- All formula operations go through validation
- State updates trigger React re-renders
- Changes emit events for other listeners
- Auto-recalculation on dependencies

### Event Flow

1. **User types in formula bar**
   → `onValueChange` called
   → Parent updates state
   → FormulaBar re-renders with new value

2. **User presses Enter**
   → `onFormulaSubmit` called with current input
   → Parent validates formula
   → If valid: calls `setFormula()`
   → FormulaController evaluates formula
   → Cell value updated
   → `cell-changed` event emitted
   → React hook updates state
   → UI re-renders

3. **User selects different cell**
   → `selectedCell` prop changes
   → Hook fetches new cell's formula/value
   → FormulaBar updates to show new data

## Auto-Recalculation

The FormulaController automatically handles recalculation:

- When a cell with a formula is changed, dependent cells are automatically recalculated
- Circular references are detected and prevented
- Dependency tracking via existing `FormulaEngine.DependencyGraph`
- Topological sorting ensures correct calculation order

## Error Handling

### Validation Errors
Displayed in the formula bar:
- Syntax errors
- Circular references
- Unknown function names
- Invalid cell references

### Runtime Errors
Displayed in cell value:
- `#VALUE!` - Invalid value type
- `#NAME?` - Unknown function
- `#REF!` - Invalid reference
- `#CIRC!` - Circular reference
- `#ERROR!` - General error

## Customization

### Styling the Formula Bar

```tsx
<FormulaBar
  {...props}
  className="custom-formula-bar"
  style={{
    backgroundColor: '#fff',
    borderBottom: '2px solid #007acc',
    padding: '12px',
  }}
/>
```

### Custom Validation

```tsx
const handleFormulaSubmit = (formula: string) => {
  // Custom validation logic
  if (formula.includes('CUSTOM_FUNC')) {
    // Handle custom function
  }

  // Default validation
  const validation = validateFormula(formula);
  // ...
};
```

## Testing

To test the implementation:

1. Run the example:
   ```bash
   npm run dev
   # Open examples/formula-editing-example.tsx
   ```

2. Test cases:
   - Enter `=SUM(A1:A3)` in cell D1
   - Enter `=A1*2` in cell E1
   - Try circular reference: `=A1` in A1
   - Test validation with invalid syntax: `=SUM(A1`
   - Test auto-recalculation by changing A1

## Integration Checklist

- [x] `FormulaController` class in core package
- [x] Formula validation with error types
- [x] `FormulaBar` React component
- [x] `useFormulaController` React hook
- [x] Controlled component pattern
- [x] Auto-recalculation support
- [x] Error handling and display
- [x] Complete example implementation
- [x] Export from package indices
- [ ] Unit tests for FormulaController
- [ ] Integration tests for React components
- [ ] Performance testing with large formulas

## Next Steps

1. **Add unit tests** for FormulaController validation
2. **Implement cell editing** with F2 key / double-click
3. **Add formula autocomplete** for function names
4. **Implement formula hints** showing function syntax
5. **Add formula debugging** to show calculation steps
6. **Performance optimization** for large dependency graphs

## API Reference

See individual file documentation:
- `/packages/core/src/FormulaController.ts`
- `/packages/react/src/FormulaBar.tsx`
- `/packages/react/src/useFormulaController.ts`
- `/examples/formula-editing-example.tsx`
