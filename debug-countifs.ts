/**
 * Debug script to understand COUNTIFS behavior
 */

import { FormulaEngine, FormulaContext, Worksheet } from './packages/core/src';

const engine = new FormulaEngine();
const worksheet = new Worksheet('Sheet1', 100, 26);
const context: FormulaContext = {
  worksheet,
  currentCell: { row: 1, col: 1 },
  namedLambdas: new Map()
} as FormulaContext;

// Setup test data
const testData = [
  // Row 0: Headers
  ['Product', 'Region', 'Amount', 'Quantity', 'Category'],
  // Row 1-10: Data
  ['Widget', 'North', 1000, 10, 'Electronics'],
  ['Gadget', 'South', 2000, 20, 'Electronics'],
  ['Widget', 'North', 1500, 15, 'Electronics'],
  ['Tool', 'East', 3000, 30, 'Hardware'],
];

testData.forEach((row, rowIdx) => {
  row.forEach((val, colIdx) => {
    worksheet.setCellValue({ row: rowIdx + 1, col: colIdx + 1 }, val);
  });
});

// Debug: Check what's in the cells
console.log('\n=== Cell Contents ===');
for (let r = 1; r <= 5; r++) {
  const product = worksheet.getCellValue({ row: r, col: 1 });
  const region = worksheet.getCellValue({ row: r, col: 2 });
  console.log(`Row ${r}: Product="${product}" Region="${region}"`);
}

// Test simple range reference
console.log('\n=== Range Resolution Test ===');
const rangeResult = engine.evaluate('=A2:A5', context);
console.log('A2:A5 result:', rangeResult);

// Test COUNTIFS
console.log('\n=== COUNTIFS Test ===');
const result = engine.evaluate('=COUNTIFS(A2:A5, "Widget", B2:B5, "North")', context);
console.log('COUNTIFS result:', result);
console.log('Expected: 2 (rows 2 and 4)');
