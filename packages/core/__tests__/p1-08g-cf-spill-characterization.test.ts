import { ConditionalFormattingFormulaCompiler } from '../src/ConditionalFormattingFormulaCompiler';
import { SpillEngine } from '../src/SpillEngine';
import { Worksheet } from '../src/worksheet';
import type { Address, CellValue } from '../src/types';

describe('P1-08G/H.01 conditional-formatting logical functions', () => {
  const base: Address = { row: 1, col: 1 };

  test('each comparison resolves and evaluates independently', () => {
    const values = new Map<string, CellValue>([['1,1', 50], ['2,1', 100]]);
    const getCell = (address: Address) => values.get(`${address.col},${address.row}`) ?? null;
    const first = ConditionalFormattingFormulaCompiler.compile('=A1>60', base);
    const second = ConditionalFormattingFormulaCompiler.compile('=B1<110', base);

    expect(first.evaluate(base, getCell)).toBe(false);
    expect(second.evaluate(base, getCell)).toBe(true);
  });

  test.each([
    { a: 70, b: 120, expected: true, label: 'first comparison true only' },
    { a: 50, b: 100, expected: true, label: 'second comparison true only' },
    { a: 70, b: 100, expected: true, label: 'both comparisons true' },
    { a: 50, b: 120, expected: false, label: 'both comparisons false' },
  ])('OR: $label', ({ a, b, expected }) => {
    const values = new Map<string, CellValue>([['1,1', a], ['2,1', b]]);
    const reads: Array<{ address: Address; value: CellValue }> = [];
    const compiled = ConditionalFormattingFormulaCompiler.compile(
      '=OR(A1>60, B1<110)',
      base,
    );

    const actual = compiled.evaluate(base, (address) => {
      const value = values.get(`${address.col},${address.row}`) ?? null;
      reads.push({ address, value });
      return value;
    });

    expect(compiled.references).toHaveLength(2);
    expect(reads.map(({ value }) => value)).toEqual([b, a]);
    expect(actual).toBe(expected);
  });

  test.each([
    { a: 70, b: 100, expected: true, label: 'both comparisons true' },
    { a: 70, b: 120, expected: false, label: 'first comparison true only' },
    { a: 50, b: 100, expected: false, label: 'second comparison true only' },
    { a: 50, b: 120, expected: false, label: 'both comparisons false' },
  ])('AND: $label', ({ a, b, expected }) => {
    const values = new Map<string, CellValue>([['1,1', a], ['2,1', b]]);
    const compiled = ConditionalFormattingFormulaCompiler.compile(
      '=AND(A1>60, B1<110)',
      base,
    );
    expect(compiled.evaluate(base, (address) => values.get(`${address.col},${address.row}`) ?? null)).toBe(expected);
  });

  test('nested logical functions preserve grouping and ordinary comparisons still resolve', () => {
    const values = new Map<string, CellValue>([['1,1', 50], ['2,1', 100], ['3,1', 5]]);
    const getCell = (address: Address) => values.get(`${address.col},${address.row}`) ?? null;
    const nested = ConditionalFormattingFormulaCompiler.compile(
      '=OR(AND(A1>60, B1<110), C1=5)',
      base,
    );
    const ordinary = ConditionalFormattingFormulaCompiler.compile('=B1<110', base);
    expect(nested.evaluate(base, getCell)).toBe(true);
    expect(ordinary.evaluate(base, getCell)).toBe(true);
  });

  test('mixed references inside nested logical calls resolve each relative axis', () => {
    const reads: Address[] = [];
    const values = new Map<string, CellValue>([
      ['1,3', 8],
      ['6,1', 10],
      ['4,1', 99],
    ]);
    const compiled = ConditionalFormattingFormulaCompiler.compile(
      '=AND($A2>5, OR(D$1=10, B$1=99))',
      base,
    );
    expect(compiled.evaluate({ row: 2, col: 3 }, (address) => {
      reads.push(address);
      return values.get(`${address.col},${address.row}`) ?? null;
    })).toBe(true);
    expect(reads).toEqual([
      { row: 1, col: 4 },
      { row: 1, col: 6 },
      { row: 3, col: 1 },
    ]);
  });

  test('OR-like text inside a referenced string remains a string value', () => {
    const values = new Map<string, CellValue>([
      ['1,1', 'OR(foo,bar)'],
      ['2,1', 2],
    ]);
    const compiled = ConditionalFormattingFormulaCompiler.compile(
      '=AND(A1="OR(foo,bar)", B1=2)',
      base,
    );
    expect(compiled.evaluate(base, (address) => values.get(`${address.col},${address.row}`) ?? null)).toBe(true);
  });
});

describe('P1-08G spill cleanup live-state characterization', () => {
  test('fresh Worksheet reads show source metadata cleared; an earlier snapshot remains detached', () => {
    const worksheet = new Worksheet('Sheet1');
    const spillEngine = new SpillEngine();
    const source = { row: 1, col: 1 };
    const child = { row: 2, col: 1 };
    const beforeEvents: unknown[] = [];
    worksheet.on((event) => beforeEvents.push(event));

    spillEngine.applySpill(worksheet, source, [10, 20, 30]);
    const oldSourceSnapshot = worksheet.getCell(source);
    const liveSourceBefore = worksheet.getCell(source);
    const liveChildBefore = worksheet.getCell(child);
    expect(liveSourceBefore?.spillSource?.dimensions).toEqual([3, 1]);
    expect(liveChildBefore?.spilledFrom).toEqual(source);
    expect(worksheet.getCellValue(child)).toBe(20);

    spillEngine.clearSpill(worksheet, source);

    const liveSourceAfter = worksheet.getCell(source);
    const liveChildAfter = worksheet.getCell(child);
    expect(liveSourceAfter).not.toBe(liveSourceBefore);
    expect(liveSourceAfter?.spillSource).toBeUndefined();
    expect(oldSourceSnapshot?.spillSource?.dimensions).toEqual([3, 1]);
    expect(liveChildAfter?.spilledFrom).toBeUndefined();
    expect(worksheet.getCellValue(child)).toBeNull();
    expect(worksheet.getCellValue(source)).toBe(10);
    expect(beforeEvents.length).toBeGreaterThan(0);
  });
});
