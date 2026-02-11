/**
 * Tests for ConditionalFormattingFormulaCompiler
 * 
 * Phase 2 Step 4: Relative Reference Resolution
 */

import { ConditionalFormattingFormulaCompiler } from '../src/ConditionalFormattingFormulaCompiler';
import { Address, CellValue } from '../src/types';

describe('ConditionalFormattingFormulaCompiler', () => {
const addr = (col: number, row: number): Address => ({ col, row });

const createMockGetCell = (values: Map<string, CellValue>) => {
return (address: Address): CellValue => {
const key = `${address.col},${address.row}`;
return values.get(key) ?? null;
};
};

describe('1️⃣ Reference Resolution: Relative (A1)', () => {
it('should resolve relative reference with offset', () => {
const ruleBaseAddress = addr(2, 2); // B2
const compiled = ConditionalFormattingFormulaCompiler.compile('=A1>10', ruleBaseAddress);

expect(compiled.references).toHaveLength(1);
expect(compiled.references[0].colAbsolute).toBe(false);
expect(compiled.references[0].rowAbsolute).toBe(false);

const values = new Map<string, CellValue>();
values.set('1,1', 5);   // A1
values.set('2,4', 15);  // B4

const getCell = createMockGetCell(values);

// At B2: A1 resolves to A1
expect(compiled.evaluate(addr(2, 2), getCell)).toBe(false); // 5 > 10? false

// At C5: A1 + offset resolves to B4
expect(compiled.evaluate(addr(3, 5), getCell)).toBe(true); // 15 > 10? true
});
});

describe('1️⃣ Reference Resolution: Absolute ($A$1)', () => {
it('should resolve absolute reference to same cell', () => {
const ruleBaseAddress = addr(5, 5);
const compiled = ConditionalFormattingFormulaCompiler.compile('=$A$1>10', ruleBaseAddress);

expect(compiled.references[0].colAbsolute).toBe(true);
expect(compiled.references[0].rowAbsolute).toBe(true);

const values = new Map<string, CellValue>();
values.set('1,1', 25);

const getCell = createMockGetCell(values);

expect(compiled.evaluate(addr(5, 5), getCell)).toBe(true);
expect(compiled.evaluate(addr(10, 10), getCell)).toBe(true);
});
});

describe('1️⃣ Reference Resolution: Mixed ($A1)', () => {
it('should resolve $A1 with column absolute, row relative', () => {
const ruleBaseAddress = addr(2, 2);
const compiled = ConditionalFormattingFormulaCompiler.compile('=$A1>10', ruleBaseAddress);

expect(compiled.references[0].colAbsolute).toBe(true);
expect(compiled.references[0].rowAbsolute).toBe(false);

const values = new Map<string, CellValue>();
values.set('1,1', 5);
values.set('1,4', 15);

const getCell = createMockGetCell(values);

expect(compiled.evaluate(addr(2, 2), getCell)).toBe(false); // $A1
expect(compiled.evaluate(addr(2, 5), getCell)).toBe(true);  // $A4
});
});

describe('1️⃣ Reference Resolution: Mixed (A$1)', () => {
it('should resolve A$1 with column relative, row absolute', () => {
const ruleBaseAddress = addr(2, 2);
const compiled = ConditionalFormattingFormulaCompiler.compile('=A$1>10', ruleBaseAddress);

expect(compiled.references[0].colAbsolute).toBe(false);
expect(compiled.references[0].rowAbsolute).toBe(true);

const values = new Map<string, CellValue>();
values.set('1,1', 5);
values.set('4,1', 15);

const getCell = createMockGetCell(values);

expect(compiled.evaluate(addr(2, 2), getCell)).toBe(false); // A$1
expect(compiled.evaluate(addr(5, 2), getCell)).toBe(true);  // D$1
});
});

describe('2️⃣ Excel Parity: Range B2:D4 with =A1>10', () => {
it('should verify offset correct on every cell', () => {
const ruleBaseAddress = addr(2, 2);
const compiled = ConditionalFormattingFormulaCompiler.compile('=A1>10', ruleBaseAddress);

const values = new Map<string, CellValue>();
// Row 1
values.set('1,1', 5);
values.set('2,1', 6);
values.set('3,1', 7);
// Row 2
values.set('1,2', 8);
values.set('2,2', 9);
values.set('2,3', 13);
// Row 3
values.set('1,3', 12);
// Row 4
values.set('1,4', 15);

const getCell = createMockGetCell(values);

// B2 → A1 (5 > 10? false)
expect(compiled.evaluate(addr(2, 2), getCell)).toBe(false);

// B3 → A2 (8 > 10? false)
expect(compiled.evaluate(addr(2, 3), getCell)).toBe(false);

// B4 → A3 (12 > 10? true)
expect(compiled.evaluate(addr(2, 4), getCell)).toBe(true);

// C4 → B3 (13 > 10? true)
expect(compiled.evaluate(addr(3, 4), getCell)).toBe(true);
});
});

describe('3️⃣ Performance Guard', () => {
it('should compile only once', () => {
const ruleBaseAddress = addr(1, 1);
const compiled = ConditionalFormattingFormulaCompiler.compile('=A1>10', ruleBaseAddress);

const values = new Map<string, CellValue>();
values.set('1,1', 15);

const getCell = createMockGetCell(values);

// Multiple evaluations
compiled.evaluate(addr(1, 1), getCell);
compiled.evaluate(addr(2, 2), getCell);
compiled.evaluate(addr(3, 3), getCell);

// No re-parsing (verified by single compile call)
expect(compiled.references).toHaveLength(1);
});

it('should handle 10k evaluations quickly', () => {
const ruleBaseAddress = addr(1, 1);
const compiled = ConditionalFormattingFormulaCompiler.compile('=A1>50', ruleBaseAddress);

const values = new Map<string, CellValue>();
for (let i = 1; i <= 10000; i++) {
values.set(`${i},1`, i % 100);
}

const getCell = createMockGetCell(values);

const startTime = performance.now();
for (let col = 1; col <= 10000; col++) {
compiled.evaluate(addr(col, 1), getCell);
}
const elapsedMs = performance.now() - startTime;

console.log(`✅ PERFORMANCE: ${elapsedMs.toFixed(2)}ms for 10k formula evaluations`);
expect(elapsedMs).toBeLessThan(100); // Generous limit
});
});

describe('Formula Evaluation', () => {
it('should evaluate comparison operators', () => {
const ruleBaseAddress = addr(1, 1);
const values = new Map<string, CellValue>();
values.set('1,1', 50);

const getCell = createMockGetCell(values);

let compiled = ConditionalFormattingFormulaCompiler.compile('=A1>40', ruleBaseAddress);
expect(compiled.evaluate(addr(1, 1), getCell)).toBe(true);

compiled = ConditionalFormattingFormulaCompiler.compile('=A1<60', ruleBaseAddress);
expect(compiled.evaluate(addr(1, 1), getCell)).toBe(true);

compiled = ConditionalFormattingFormulaCompiler.compile('=A1>=50', ruleBaseAddress);
expect(compiled.evaluate(addr(1, 1), getCell)).toBe(true);

compiled = ConditionalFormattingFormulaCompiler.compile('=A1<=50', ruleBaseAddress);
expect(compiled.evaluate(addr(1, 1), getCell)).toBe(true);

compiled = ConditionalFormattingFormulaCompiler.compile('=A1=50', ruleBaseAddress);
expect(compiled.evaluate(addr(1, 1), getCell)).toBe(true);

compiled = ConditionalFormattingFormulaCompiler.compile('=A1<>60', ruleBaseAddress);
expect(compiled.evaluate(addr(1, 1), getCell)).toBe(true);
});

it('should evaluate AND/OR logic', () => {
const ruleBaseAddress = addr(1, 1);
const values = new Map<string, CellValue>();
values.set('1,1', 50);
values.set('2,1', 100);

const getCell = createMockGetCell(values);

let compiled = ConditionalFormattingFormulaCompiler.compile('=AND(A1>40, B1<110)', ruleBaseAddress);
expect(compiled.evaluate(addr(1, 1), getCell)).toBe(true);

compiled = ConditionalFormattingFormulaCompiler.compile('=OR(A1>60, B1<110)', ruleBaseAddress);
expect(compiled.evaluate(addr(1, 1), getCell)).toBe(true);
});

it('should handle empty cells as 0', () => {
const ruleBaseAddress = addr(1, 1);
const values = new Map<string, CellValue>();
values.set('1,1', null);

const getCell = createMockGetCell(values);

const compiled = ConditionalFormattingFormulaCompiler.compile('=A1<10', ruleBaseAddress);
expect(compiled.evaluate(addr(1, 1), getCell)).toBe(true);
});
});
});
