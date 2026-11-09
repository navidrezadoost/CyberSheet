import { Workbook } from '../src/workbook';
import { Worksheet } from '../src/worksheet';
import { snapshotCodec } from '../src/persistence/SnapshotCodec';

describe('PKG-06A comment metadata runtime boundaries', () => {
  test('standalone storage and reads accept graph values without normalizing nested input', () => {
    const sheet = new Worksheet('Metadata', 2, 2);
    const shared = { marker: 1 };
    const sharedDate = new Date('2025-01-02T03:04:05.000Z');
    const metadata: Record<string, unknown> = {
      left: shared,
      right: shared,
      dateA: sharedDate,
      dateB: sharedDate,
      map: new Map([[shared, 'entry']]),
      set: new Set([shared]),
      callback: () => 'kept',
      instance: new (class MetadataValue { value = 7; })(),
    };
    metadata.self = metadata;
    let getterReads = 0;
    Object.defineProperty(metadata, 'accessor', {
      enumerable: true,
      get() { getterReads++; return 'read'; },
    });

    const stored = sheet.addComment({ row: 1, col: 1 }, {
      text: 'probe', author: 'test', metadata,
    });
    expect(stored.metadata).toBe(metadata);
    expect(getterReads).toBe(0);

    const read = sheet.getComments({ row: 1, col: 1 })[0]!.metadata!;
    expect(read).not.toBe(metadata);
    expect(read.self).toBe(read);
    expect(read.left).toBe(read.right);
    expect(read.dateA).toEqual(sharedDate);
    expect(read.dateA).not.toBe(sharedDate);
    expect(read.dateA).not.toBe(read.dateB);
    expect(read.map).toBeInstanceOf(Map);
    expect(read.set).toBeInstanceOf(Set);
    expect(read.callback).toBe(metadata.callback);
    expect(Object.getPrototypeOf(read.instance)).toBe(Object.getPrototypeOf(metadata.instance));
    expect(Object.getOwnPropertyDescriptor(read, 'accessor')?.get).toBe(
      Object.getOwnPropertyDescriptor(metadata, 'accessor')?.get,
    );
    expect(getterReads).toBe(0);
  });

  test('adoption keeps the retained comment alias while owner reads apply their current transformations', () => {
    const workbook = Workbook.create({ sheets: [{ name: 'Base', rows: 2, cols: 2 }] });
    const raw = workbook.createDevImportWorksheet('Imported', 2, 2);
    const shared = { marker: 1 };
    const metadata: Record<string, unknown> = {
      left: shared,
      right: shared,
      date: new Date('2025-01-02T03:04:05.000Z'),
      map: new Map([['key', 'value']]),
      set: new Set(['value']),
      callback: () => 'kept only by the standalone alias',
      instance: new (class MetadataValue { value = 7; })(),
    };
    let getterReads = 0;
    Object.defineProperty(metadata, 'accessor', {
      enumerable: true,
      get() { getterReads++; return 'read'; },
    });
    const address = { row: 1, col: 1 };
    const retained = raw.addComment(address, { text: 'probe', author: 'test', metadata });
    workbook.attachDevImportSheet(raw);

    expect(retained.metadata).toBe(metadata);
    const ownerMetadata = workbook.getSheet('Imported')!.getComments(address)[0]!.metadata!;
    expect(ownerMetadata).not.toBe(metadata);
    expect(ownerMetadata.left).not.toBe(ownerMetadata.right);
    expect(ownerMetadata.date).toEqual(metadata.date);
    expect(ownerMetadata.date).not.toBe(metadata.date);
    expect(Array.isArray(ownerMetadata.map)).toBe(true);
    expect(Array.isArray(ownerMetadata.set)).toBe(true);
    expect(ownerMetadata.callback).toBeUndefined();
    expect(Object.getPrototypeOf(ownerMetadata.instance)).toBe(Object.prototype);
    expect(ownerMetadata.accessor).toBe('read');
    expect(getterReads).toBeGreaterThan(0);

    retained.metadata!.left = { marker: 2 };
    expect(raw.getComments(address)[0]!.metadata!.left).toEqual({ marker: 2 });
  });

  test('object snapshots shallow-copy metadata while binary JSON encoding is not graph preserving', () => {
    const sheet = new Worksheet('Snapshot', 2, 2);
    const nested = { value: 1 };
    const comment = sheet.addComment({ row: 1, col: 1 }, {
      text: 'probe', author: 'test',
      metadata: { nested, date: new Date('2025-01-02T03:04:05.000Z'), map: new Map([['k', 'v']]) },
    });
    const objectSnapshot = sheet.extractSnapshot();
    const copiedComment = objectSnapshot.cells[0]!.cell.comments![0]!;
    expect(copiedComment).not.toBe(comment);
    expect(copiedComment.metadata).not.toBe(comment.metadata);
    expect(copiedComment.metadata!.nested).toBe(nested);
    expect(copiedComment.createdAt).toBe(comment.createdAt);

    const decoded = snapshotCodec.decode(snapshotCodec.encode(objectSnapshot));
    const decodedComment = decoded.cells[0]!.cell.comments![0]!;
    expect(typeof decodedComment.createdAt).toBe('string');
    expect(decodedComment.metadata!.date).toBe('2025-01-02T03:04:05.000Z');
    expect(decodedComment.metadata!.map).toEqual({});

    const cyclic = new Worksheet('Cyclic', 2, 2);
    const metadata: Record<string, unknown> = {};
    metadata.self = metadata;
    cyclic.addComment({ row: 1, col: 1 }, { text: 'cycle', author: 'test', metadata });
    expect(() => snapshotCodec.encode(cyclic.extractSnapshot())).toThrow();
  });
});
