import { Workbook } from '../src/workbook';
import { Worksheet } from '../src/worksheet';
import { createSpreadsheet } from '../src/sdk';

describe('SpreadsheetSDK retained Worksheet ownership boundary (H.82)', () => {
  test('masks formula cached values from retained SDK reads after Worksheet adoption', () => {
    const sdk = createSpreadsheet('Retained SDK source', { rows: 2, cols: 2 });
    const source = (sdk as unknown as { _ws: Worksheet })._ws;
    const cacheSentinel = 'sdk-retained-formula-cache-sentinel';
    source.setCellFormula({ row: 1, col: 1 }, '=40+2', cacheSentinel);
    source.setCellValue({ row: 1, col: 2 }, 'ordinary-value');

    expect(sdk.getCellValue(1, 1)).toBe(cacheSentinel);
    expect(sdk.getCell(1, 1)).toMatchObject({ value: cacheSentinel, formula: '=40+2' });
    expect(sdk.getCellValue(1, 2)).toBe('ordinary-value');

    const workbook = new Workbook();
    workbook.attachDevImportSheet(source);
    const view = workbook.activeSheet!;

    expect(view.getCellValue({ row: 1, col: 1 })).toBeNull();
    expect(view.getCellValue({ row: 1, col: 2 })).toBe('ordinary-value');
    expect(sdk.getCellValue(1, 1)).toBeNull();
    expect(sdk.getCell(1, 1)).toMatchObject({ value: null, formula: '=40+2' });
    expect(sdk.getCellValue(1, 2)).toBe('ordinary-value');
    expect(() => sdk.setCell(1, 2, 'blocked-write')).toThrow();
    expect(view.getCellValue({ row: 1, col: 2 })).toBe('ordinary-value');
    sdk.dispose();
  });
});
