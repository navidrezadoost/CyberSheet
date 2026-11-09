import { Worksheet } from '../src/worksheet';
import { Workbook } from '../src/workbook';
import { setWorkbookMutationTestHooks } from '../src/workbookMutationTestHooks';

type Metadata = Record<string, unknown>;

/** Test-only oracle: preserve graph topology for the explicitly supported fixture domain. */
function cloneFixtureGraph<T>(value: T, copies = new WeakMap<object, object>()): T {
  if (typeof value === 'function' || typeof value === 'symbol') {
    throw new TypeError('Unsupported comment graph value: function or symbol');
  }
  if (value === null || typeof value !== 'object') return value;
  const prior = copies.get(value);
  if (prior) return prior as T;

  if (value instanceof Date) {
    const copy = new Date(value.getTime());
    copies.set(value, copy);
    return copy as T;
  }
  if (Array.isArray(value)) {
    const copy: unknown[] = new Array(value.length);
    copies.set(value, copy);
    for (let index = 0; index < value.length; index++) {
      if (!Object.prototype.hasOwnProperty.call(value, index)) {
        throw new TypeError('Unsupported comment graph value: sparse array');
      }
      copy[index] = cloneFixtureGraph(value[index], copies);
    }
    if (Reflect.ownKeys(value).some((key) => key !== 'length' && !(typeof key === 'string' && /^(0|[1-9]\d*)$/.test(key)))) {
      throw new TypeError('Unsupported comment graph value: custom array property');
    }
    return copy as T;
  }
  if (value instanceof Map) {
    const copy = new Map<unknown, unknown>();
    copies.set(value, copy);
    for (const [key, entry] of value) copy.set(cloneFixtureGraph(key, copies), cloneFixtureGraph(entry, copies));
    return copy as T;
  }
  if (value instanceof Set) {
    const copy = new Set<unknown>();
    copies.set(value, copy);
    for (const entry of value) copy.add(cloneFixtureGraph(entry, copies));
    return copy as T;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('Unsupported comment graph value: non-plain object');
  }
  const copy: Record<PropertyKey, unknown> = Object.create(prototype);
  copies.set(value, copy);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') throw new TypeError('Unsupported comment graph value: symbol key');
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
    if (!descriptor.enumerable || !('value' in descriptor)) {
      throw new TypeError('Unsupported comment graph value: accessor or hidden property');
    }
    copy[key] = cloneFixtureGraph(descriptor.value, copies);
  }
  return copy as T;
}

function storedCell(sheet: Worksheet, address: { row: number; col: number }) {
  let found: { comments?: Array<{ id: string; text: string; metadata?: Metadata }>; value?: unknown; formula?: string } | undefined;
  sheet.forEachNonEmptyCell((row, col, cell) => {
    if (row === address.row && col === address.col) found = cell as typeof found;
  });
  return found;
}

describe('PKG-05 comment graph and exact-state evidence', () => {
  test('the test oracle preserves Dates, Map/Set values, shared aliases, and cycles', () => {
    const shared = { count: 1 };
    const metadata: Metadata = { shared, alias: shared, when: new Date('2025-01-02T03:04:05.000Z') };
    metadata.self = metadata;
    metadata.map = new Map([[shared, metadata]]);
    metadata.set = new Set([shared, metadata]);

    const copy = cloneFixtureGraph(metadata);
    expect(copy).not.toBe(metadata);
    expect(copy.self).toBe(copy);
    expect(copy.shared).toBe(copy.alias);
    expect(copy.when).toEqual(metadata.when);
    expect(copy.when).not.toBe(metadata.when);
    expect((copy.map as Map<unknown, unknown>).get(copy.shared)).toBe(copy);
    expect((copy.set as Set<unknown>).has(copy.shared)).toBe(true);
    expect((copy.set as Set<unknown>).has(copy)).toBe(true);
  });

  test('the test oracle preserves null, undefined, primitive values, and missing-property distinction', () => {
    const source = { nullValue: null, undefinedValue: undefined, text: 'x', falseValue: false, zero: 0, big: 1n };
    const copy = cloneFixtureGraph(source);
    expect(copy).toEqual(source);
    expect(Object.prototype.hasOwnProperty.call(copy, 'undefinedValue')).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(copy, 'missing')).toBe(false);
  });

  test.each([
    ['function', { value: () => 1 }],
    ['symbol value', { value: Symbol('value') }],
    ['symbol key', { [Symbol('key')]: 'value' }],
    ['class instance', { value: new (class CommentMetadataValue { value = 1 })() }],
    ['accessor', Object.defineProperty({}, 'value', { enumerable: true, get: () => 1 })],
    ['hidden property', Object.defineProperty({}, 'value', { enumerable: false, value: 1 })],
    ['sparse array', { value: new Array(1) }],
    ['custom array property', { value: Object.assign([], { extra: 1 }) }],
  ])('the proposed exact-state oracle clearly rejects unsupported %s values', (_label, value) => {
    expect(() => cloneFixtureGraph(value)).toThrow(/Unsupported comment graph value/);
  });

  test('addComment returns the stored comment and raw getAllComments exposes its comment nodes', () => {
    const sheet = new Worksheet('Alias', 2, 2);
    const address = { row: 1, col: 1 };
    const nested = { count: 1 };
    const metadata = { nested };
    const returned = sheet.addComment(address, { text: 'aliased', author: 'A', metadata });

    expect(sheet.getComments(address)[0]).not.toBe(returned);
    expect(sheet.getComments(address)[0]?.metadata).not.toBe(metadata);
    expect(sheet.getAllComments()[0]?.comments[0]).toBe(returned);
    returned.metadata!.nested = { count: 2 };
    expect(sheet.getComments(address)[0]?.metadata?.nested).toEqual({ count: 2 });
  });

  test('deletion replaces only the comment collection, keeps survivor order, and handles duplicate IDs', () => {
    const sheet = new Worksheet('Replace', 2, 2);
    const address = { row: 1, col: 1 };
    sheet.setCellValue(address, 'retain');
    sheet.setCellStyle(address, { bold: true });
    const first = sheet.addComment(address, { text: 'first duplicate', author: 'A' });
    const child = sheet.addComment(address, { text: 'child', author: 'B', parentId: first.id });
    const duplicate = sheet.addComment(address, { text: 'second duplicate', author: 'C' });
    duplicate.id = first.id;
    sheet.addComment(address, { text: 'sibling', author: 'D' });
    const before = storedCell(sheet, address)!;
    const oldComments = before.comments!;

    expect(sheet.deleteComment(address, first.id)).toBe(true);
    const after = storedCell(sheet, address)!;
    expect(after.comments).not.toBe(oldComments);
    expect(after.comments?.map(({ text }) => text)).toEqual(['sibling']);
    expect(sheet.getCellValue(address)).toBe('retain');
    expect(sheet.getCellStyle(address)?.bold).toBe(true);
    expect(child.id).not.toBe(after.comments?.[0]?.id);
  });

  test('a retained before-image restores exact graph identity when the old graph is not mutated', () => {
    const sheet = new Worksheet('Restore', 2, 2);
    const address = { row: 1, col: 1 };
    const shared = { count: 1 };
    const metadata: Metadata = {
      left: shared,
      right: shared,
      when: new Date('2025-01-02T03:04:05.000Z'),
      map: new Map([[shared, 'shared']]),
      set: new Set([shared]),
    };
    metadata.self = metadata;
    const root = sheet.addComment(address, { text: 'root', author: 'A', metadata });
    const child = sheet.addComment(address, { text: 'reply', author: 'B', parentId: root.id });
    const before = storedCell(sheet, address)!;
    const originalArray = before.comments!;
    const originalSnapshot = cloneFixtureGraph(originalArray);

    expect(sheet.deleteComment(address, root.id)).toBe(true);
    const changedCell = storedCell(sheet, address)!;
    changedCell.comments = originalArray;

    const restored = storedCell(sheet, address)!.comments!;
    expect(restored).toBe(originalArray);
    expect(restored[0]).toBe(root);
    expect(restored[1]).toBe(child);
    expect(restored[0]?.metadata?.left).toBe(restored[0]?.metadata?.right);
    expect(restored[0]?.metadata?.self).toBe(restored[0]?.metadata);
    expect(cloneFixtureGraph(restored)).toEqual(originalSnapshot);
  });

  test('the reference before-image cannot rewind a nested alias mutation between capture and restore', () => {
    const sheet = new Worksheet('Alias mutation', 2, 2);
    const address = { row: 1, col: 1 };
    const nested = { count: 1 };
    const comment = sheet.addComment(address, { text: 'root', author: 'A', metadata: { nested } });
    const originalArray = storedCell(sheet, address)!.comments!;
    const stateAtCapture = cloneFixtureGraph(originalArray);

    expect(sheet.deleteComment(address, comment.id)).toBe(true);
    nested.count = 2;
    storedCell(sheet, address)!.comments = originalArray;

    expect(storedCell(sheet, address)!.comments).toBe(originalArray);
    expect(comment.metadata?.nested).toEqual({ count: 2 });
    expect(cloneFixtureGraph(originalArray)).not.toEqual(stateAtCapture);
  });

  test.each(['journal', 'snapshot'] as const)('%s rollback leaves an unrelated comment graph and event history unchanged', async (strategy) => {
    const workbook = Workbook.create({ sheets: [{ name: 'Base', rows: 2, cols: 2 }] });
    const raw = workbook.createDevImportWorksheet('Imported', 2, 2);
    const address = { row: 1, col: 1 };
    const shared = { count: 1 };
    raw.addComment(address, {
      text: 'preserve', author: 'A',
      metadata: { left: shared, right: shared, when: new Date('2025-01-02T03:04:05.000Z') },
    });
    workbook.attachDevImportSheet(raw);
    const sheet = workbook.getSheet('Imported')!;
    const before = cloneFixtureGraph(sheet.getComments(address));
    const events: unknown[] = [];
    sheet.on((event) => events.push(event));
    const injected = new Error(`${strategy} unrelated cell-write failure`);
    const registration = setWorkbookMutationTestHooks(workbook, {
      strategy,
      worksheetFailure: (phase) => {
        if (phase === 'after-cell-record') throw injected;
      },
    });

    await expect(workbook.transact((tx) => tx.setCellValue(sheet, address, 'temporary'))).rejects.toBe(injected);
    expect(sheet.getCellValue(address)).toBeNull();
    expect(cloneFixtureGraph(sheet.getComments(address))).toEqual(before);
    expect(events).toEqual([]);
    registration.dispose();
  });

  test('standalone reads preserve cyclic metadata but Workbook-owned read detachment is not cycle-safe', () => {
    const owner = Workbook.create({ sheets: [{ name: 'Base', rows: 2, cols: 2 }] });
    const raw = owner.createDevImportWorksheet('Imported', 2, 2);
    const address = { row: 1, col: 1 };
    const metadata: Metadata = {};
    metadata.self = metadata;
    const returned = raw.addComment(address, { text: 'cyclic', author: 'A', metadata });
    const standaloneRead = raw.getCell(address);
    expect(standaloneRead?.comments?.[0]?.metadata?.self)
      .toBe(standaloneRead?.comments?.[0]?.metadata);
    owner.attachDevImportSheet(raw);

    expect(() => owner.getSheet('Imported')!.getComments(address)).toThrow(RangeError);
    returned.metadata!.extra = 'retained caller alias';
    expect(() => owner.getSheet('Imported')!.getComments(address)).toThrow(RangeError);
  });
});
