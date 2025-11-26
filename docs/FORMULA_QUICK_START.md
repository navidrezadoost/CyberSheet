# Formula Writing - Quick Start Guide

## Installation

The formula writing capability is built into the core and React packages:

```bash
npm install @cyber-sheet/core @cyber-sheet/react
```

## Basic Example

```tsx
import React, { useState } from 'react';
import { Workbook, Address } from '@cyber-sheet/core';
import { CyberSheet, FormulaBar, useFormulaController } from '@cyber-sheet/react';

function App() {
  // Create workbook
  const [workbook] = useState(() => {
    const wb = new Workbook();
    wb.addSheet('Sheet1', 100, 26);
    return wb;
  });

  // State
  const [selectedCell, setSelectedCell] = useState<Address | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const worksheet = workbook.getSheet('Sheet1')!;

  // Formula controller hook
  const { currentFormula, currentValue, setFormula } = useFormulaController({
    worksheet,
    selectedCell,
  });

  // Handle formula submission
  const handleFormulaSubmit = (formula: string) => {
    if (!selectedCell || !formula.trim()) return;
    
    if (formula.startsWith('=')) {
      setFormula(formula);
    } else {
      worksheet.setCellValue(selectedCell, formula);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Formula Bar */}
      <FormulaBar
        selectedCell={selectedCell}
        cellValue={currentValue}
        cellFormula={currentFormula}
        onFormulaSubmit={handleFormulaSubmit}
        isEditing={isEditMode}
        onEditModeChange={setIsEditMode}
      />

      {/* Spreadsheet */}
      <CyberSheet
        workbook={workbook}
        sheetName="Sheet1"
        onRendererReady={(renderer) => {
          worksheet.on((event) => {
            if (event.type === 'cell-click') {
              setSelectedCell(event.event.address);
            }
          });
        }}
      />
    </div>
  );
}
```

## Core API

### FormulaController

```typescript
import { FormulaController } from '@cyber-sheet/core';

const controller = new FormulaController(worksheet);

// Set a formula
controller.setFormula({ row: 1, col: 1 }, '=SUM(A2:A10)');

// Get a formula
const formula = controller.getFormula({ row: 1, col: 1 });

// Validate before setting
const validation = controller.validateFormula('=SUM(A1:A10)', { row: 1, col: 1 });
if (validation.isValid) {
  controller.setFormula({ row: 1, col: 1 }, '=SUM(A1:A10)');
} else {
  console.error(validation.error);
}

// Clear formula
controller.clearFormula({ row: 1, col: 1 });

// Parse cell reference
const address = controller.parseCellReference('A1'); // { row: 1, col: 1 }

// Format cell address
const ref = controller.formatCellReference({ row: 1, col: 1 }); // "A1"
```

## React Hook

```typescript
import { useFormulaController } from '@cyber-sheet/react';

const {
  controller,        // FormulaController instance
  currentFormula,    // "=SUM(A1:A10)" or undefined
  currentValue,      // Computed value or direct value
  setFormula,        // (formula: string) => { success, error? }
  clearFormula,      // () => void
  validateFormula,   // (formula: string) => { isValid, error? }
  hasFormula,        // boolean
  recalculate,       // () => boolean
} = useFormulaController({
  worksheet,         // Worksheet instance
  selectedCell,      // { row: 1, col: 1 } or null
});
```

## Formula Examples

```javascript
// Math
=SUM(A1:A10)
=AVERAGE(B1:B10)
=A1 + B1 * C1
=ROUND(A1, 2)

// Logic
=IF(A1>10, "High", "Low")
=AND(A1>0, B1<100)
=OR(A1>10, B1>10)

// Text
=CONCATENATE(A1, " ", B1)
=LEFT(A1, 5)
=UPPER(A1)
=LEN(A1)

// Lookup
=VLOOKUP(A1, A1:B10, 2, FALSE)
=INDEX(A1:A10, 5)
=MATCH(A1, B1:B10, 0)

// Date
=TODAY()
=NOW()
=YEAR(A1)
=MONTH(A1)
=DAY(A1)

// Statistical
=MIN(A1:A10)
=MAX(A1:A10)
=COUNT(A1:A10)
=STDEV(A1:A10)
```

## Error Handling

### Validation Errors

```typescript
const result = validateFormula('=SUM(A1:');
if (!result.isValid) {
  console.log(result.error);     // "Syntax error"
  console.log(result.errorType); // "SYNTAX"
}
```

Error types:
- `SYNTAX` - Invalid formula syntax
- `CIRCULAR` - Circular reference
- `NAME` - Unknown function
- `VALUE` - Invalid value type
- `REF` - Invalid cell reference

### Cell Error Values

When a formula has an error, the cell displays:
- `#VALUE!` - Wrong value type
- `#NAME?` - Unknown function
- `#REF!` - Invalid reference
- `#CIRC!` - Circular reference
- `#ERROR!` - General error

## Advanced Usage

### Custom Validation

```typescript
const handleSubmit = (formula: string) => {
  // Custom validation
  if (formula.includes('FORBIDDEN_FUNC')) {
    setError('Function not allowed');
    return;
  }

  // Standard validation
  const validation = validateFormula(formula);
  if (!validation.isValid) {
    setError(validation.error);
    return;
  }

  setFormula(formula);
};
```

### Programmatic Formula Setting

```typescript
// Set multiple formulas
const formulas = [
  { address: { row: 1, col: 3 }, formula: '=SUM(A1:B1)' },
  { address: { row: 2, col: 3 }, formula: '=SUM(A2:B2)' },
  { address: { row: 3, col: 3 }, formula: '=SUM(A3:B3)' },
];

formulas.forEach(({ address, formula }) => {
  controller.setFormula(address, formula);
});
```

### Get All Formulas

```typescript
const allFormulas = controller.getAllFormulas();
console.log(allFormulas);
// [
//   { address: { row: 1, col: 1 }, formula: '=SUM(A2:A10)', value: 45 },
//   { address: { row: 2, col: 1 }, formula: '=AVERAGE(B1:B5)', value: 12.5 },
// ]
```

## Styling the Formula Bar

```tsx
<FormulaBar
  {...props}
  style={{
    backgroundColor: '#ffffff',
    borderBottom: '2px solid #2196F3',
    padding: '12px 16px',
    fontSize: '14px',
  }}
/>
```

## Complete Example

See `/examples/formula-editing-example.tsx` for a complete working example with:
- Formula bar integration
- Cell selection handling
- Validation error display
- Sample data and formulas
- Instructions panel

## Documentation

For complete documentation, see:
- `/docs/FORMULA_WRITING.md` - Full implementation guide
- `/packages/core/src/FormulaController.ts` - Core API docs
- `/packages/react/src/FormulaBar.tsx` - Component API docs
- `/packages/react/src/useFormulaController.ts` - Hook API docs

## Support

Supports 100+ Excel functions including:
- Arithmetic: SUM, AVERAGE, MIN, MAX, ROUND, etc.
- Logic: IF, AND, OR, NOT, etc.
- Text: CONCATENATE, LEFT, RIGHT, MID, UPPER, LOWER, etc.
- Lookup: VLOOKUP, HLOOKUP, INDEX, MATCH, etc.
- Date/Time: TODAY, NOW, YEAR, MONTH, DAY, etc.
- Statistical: COUNT, COUNTA, STDEV, VAR, etc.

See `FormulaEngine.ts` for the complete list of supported functions.
