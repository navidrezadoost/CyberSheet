const implementations = [
  ['published CJS entry', require('deepmerge')],
  ['published UMD entry', require('../dist/umd.js')],
  ['source entry', require('../index.js')],
];

describe.each(implementations)('CyberSheet deepmerge security fork: %s', (_entry, deepmerge) => {
  test.each([
    ['null object target', Object.create(null)],
    ['null placeholder', { session: null }],
    ['undefined placeholder', { session: undefined }],
  ])('does not inherit source __proto__ data with %s', (_name, target) => {
    const source = JSON.parse('{"session":{"__proto__":{"isAdmin":true}}}');
    const result = deepmerge(target, source);

    expect(Object.prototype.isAdmin).toBeUndefined();
    expect(Object.getPrototypeOf(result.session)).toBe(Object.prototype);
    expect(Object.hasOwn(result.session, 'isAdmin')).toBe(false);
    expect(result.session.isAdmin).toBeUndefined();
  });

  test('does not apply an own __proto__ key copied from the target', () => {
    const target = {};
    Object.defineProperty(target, '__proto__', {
      configurable: true,
      enumerable: true,
      value: { isAdmin: true },
      writable: true,
    });

    const result = deepmerge(target, { enabled: true });

    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(result.isAdmin).toBeUndefined();
    expect(Object.prototype.isAdmin).toBeUndefined();
  });

  test('keeps constructor and prototype as ordinary data without changing global prototypes', () => {
    const source = JSON.parse(
      '{"constructor":{"prototype":{"nestedFlag":"data"}},"prototype":{"flag":"data"}}',
    );
    const result = deepmerge(Object.create(null), source);

    expect(result.constructor.prototype.nestedFlag).toBe('data');
    expect(result.prototype.flag).toBe('data');
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(Object.prototype.nestedFlag).toBeUndefined();
    expect(Object.prototype.flag).toBeUndefined();
  });

  test('retains deep object merge, source/target immutability, and default array concatenation', () => {
    const target = { nested: { left: 1 }, rows: [{ a: 1 }] };
    const source = { nested: { right: 2 }, rows: [{ b: 2 }] };
    const result = deepmerge(target, source);

    expect(result).toEqual({ nested: { left: 1, right: 2 }, rows: [{ a: 1 }, { b: 2 }] });
    expect(target).toEqual({ nested: { left: 1 }, rows: [{ a: 1 }] });
    expect(source).toEqual({ nested: { right: 2 }, rows: [{ b: 2 }] });
  });

  test('retains custom arrayMerge, customMerge, clone:false, and all()', () => {
    const sourceNested = { right: 2 };
    const replacedArrays = deepmerge(
      { rows: [1] },
      { rows: [2] },
      { arrayMerge: (_target, sourceArray) => sourceArray },
    );
    const custom = deepmerge(
      { nested: { left: 1 } },
      { nested: { right: 2 } },
      { customMerge: (key) => key === 'nested' ? (left, right) => ({ left, right }) : undefined },
    );
    const identity = deepmerge({}, { nested: sourceNested }, { clone: false });

    expect(replacedArrays.rows).toEqual([2]);
    expect(custom.nested).toEqual({ left: { left: 1 }, right: { right: 2 } });
    expect(identity.nested).toBe(sourceNested);
    expect(deepmerge.all([{ a: { x: 1 } }, { a: { y: 2 } }])).toEqual({ a: { x: 1, y: 2 } });
  });

  test('retains enumerable symbol-key merging', () => {
    const key = Symbol('config');
    const result = deepmerge({ [key]: { left: 1 } }, { [key]: { right: 2 } });

    expect(result[key]).toEqual({ left: 1, right: 2 });
  });
});
