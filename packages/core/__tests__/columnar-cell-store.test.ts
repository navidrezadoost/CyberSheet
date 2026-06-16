import { Worksheet } from '../src/worksheet';
import { ColumnarCellStore } from '../src/storage/ColumnarCellStore';

describe('ColumnarCellStore', () => {
  it('stores hot primitive values and sparse metadata through the ICellStore contract', () => {
    const store = new ColumnarCellStore();

    store.getOrCreate(1, 1).value = 42;
    store.getOrCreate(2, 1).value = 'north';
    store.getOrCreate(3, 1).value = true;
    store.getOrCreate(4, 1).value = null;
    store.getOrCreate(5, 1).formula = '=A1*2';
    store.getOrCreate(5, 1).style = { bold: true, fill: '#ffeeaa' };

    expect(store.size).toBe(5);
    expect(store.get(1, 1)?.value).toBe(42);
    expect(store.get(2, 1)?.value).toBe('north');
    expect(store.get(3, 1)?.value).toBe(true);
    expect(store.get(4, 1)?.value).toBeNull();
    expect(store.get(5, 1)?.formula).toBe('=A1*2');
    expect(store.get(5, 1)?.style).toEqual({ bold: true, fill: '#ffeeaa' });
  });

  it('supports whole-cell replacement, deletion, and iteration', () => {
    const store = new ColumnarCellStore();

    store.set(7, 3, {
      value: 'label',
      comments: [{ id: 'c1', text: 'note', author: 'Ada', createdAt: new Date('2026-01-01T00:00:00Z') }],
      hyperlink: { target: 'https://example.com', kind: 'url' },
    });

    const seen: Array<[number, number, unknown]> = [];
    store.forEach((row, col, cell) => seen.push([row, col, cell.value]));

    expect(seen).toEqual([[7, 3, 'label']]);
    expect(store.get(7, 3)?.comments?.[0]?.text).toBe('note');
    expect(store.get(7, 3)?.hyperlink?.target).toBe('https://example.com');

    delete store.getOrCreate(7, 3).hyperlink;
    expect(store.get(7, 3)?.hyperlink).toBeUndefined();

    store.delete(7, 3);
    expect(store.size).toBe(0);
    expect(store.get(7, 3)).toBeUndefined();
  });
});

describe('Worksheet with ColumnarCellStore', () => {
  it('keeps values, formulas, styles, comments, and hyperlinks across snapshots', () => {
    const sheet = new Worksheet('columnar');

    sheet.setCellValue({ row: 1, col: 1 }, 123);
    sheet.setCellValue({ row: 2, col: 1 }, 'SKU-1');
    sheet.setCellFormula({ row: 3, col: 1 }, '=A1*2', 246);
    sheet.setCellStyle({ row: 3, col: 1 }, { bold: true, align: 'right' });
    sheet.addComment({ row: 2, col: 1 }, { text: 'loaded lazily', author: 'Grace' });
    sheet.setHyperlink({ row: 2, col: 1 }, { target: 'https://cybersheet.local', kind: 'url' });

    const restored = new Worksheet('restored');
    restored.applySnapshot(sheet.extractSnapshot());

    expect(restored.getCellValue({ row: 1, col: 1 })).toBe(123);
    expect(restored.getCellValue({ row: 2, col: 1 })).toBe('SKU-1');
    expect(restored.getCell({ row: 3, col: 1 })?.formula).toBe('=A1*2');
    expect(restored.getCellStyle({ row: 3, col: 1 })).toEqual({ bold: true, align: 'right' });
    expect(restored.getComments({ row: 2, col: 1 })[0]?.text).toBe('loaded lazily');
    expect(restored.getHyperlink({ row: 2, col: 1 })?.target).toBe('https://cybersheet.local');
  });
});
