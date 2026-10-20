import { EditingManager } from '../src/EditingManager';
import { adoptWorksheetByWorkbook, Worksheet } from '../../core/src/worksheet';
import type { ExtendedCellValue } from '../../core/src/types';
import type { WorkbookId } from '../../core/src/workbook-access-types';

class CallRecordingWorksheet extends Worksheet {
  readonly calls: Array<{ method: string; args: unknown[] }> = [];

  override getCell(...args: Parameters<Worksheet['getCell']>): ReturnType<Worksheet['getCell']> {
    this.calls.push({ method: 'getCell', args });
    return super.getCell(...args);
  }

  override setCellValue(...args: Parameters<Worksheet['setCellValue']>): ReturnType<Worksheet['setCellValue']> {
    this.calls.push({ method: 'setCellValue', args });
    return super.setCellValue(...args);
  }
}

const fillCases: Array<{ name: string; sourceValue: ExtendedCellValue; expectedValue: ExtendedCellValue }> = [
  {
    name: 'date strings',
    sourceValue: '2024-01-02',
    expectedValue: new Date('2024-01-02').toLocaleDateString(),
  },
  { name: 'non-date strings', sourceValue: 'copy me', expectedValue: 'copy me' },
  { name: 'other values', sourceValue: true, expectedValue: true },
];

describe.each(fillCases)('EditingManager fill $name owner boundary', ({ name, sourceValue, expectedValue }) => {
  test('writes standalone and rejects after adoption following source and target reads', () => {
    const worksheet = new CallRecordingWorksheet(`Fill ${name}`, 4, 2);
    worksheet.setCellValue({ row: 1, col: 1 }, sourceValue);
    worksheet.setCellValue({ row: 2, col: 1 }, 'standalone target');
    worksheet.setCellValue({ row: 3, col: 1 }, 'adopted target');
    const manager = new EditingManager(worksheet, { enableClipboard: false });

    worksheet.calls.length = 0;
    manager.fillCells({ row: 1, col: 1 }, { start: { row: 2, col: 1 }, end: { row: 2, col: 1 } });

    expect(worksheet.calls.map(({ method }) => method)).toEqual([
      'getCell', 'getCell', 'setCellValue', 'setCellValue',
    ]);
    expect(worksheet.calls[0].args).toEqual([{ row: 1, col: 1 }]);
    expect(worksheet.calls[1].args).toEqual([{ row: 2, col: 1 }]);
    expect(worksheet.calls[2].args).toEqual([{ row: 2, col: 1 }, expectedValue]);
    expect(worksheet.getCell({ row: 2, col: 1 })?.value).toEqual(expectedValue);
    expect(manager.getHistoryStats()).toEqual({ undoCount: 1, redoCount: 0 });

    worksheet.calls.length = 0;
    adoptWorksheetByWorkbook(worksheet, `editing-manager-fill-${name.replace(/ /g, '-')}` as WorkbookId);

    expect(() => manager.fillCells(
      { row: 1, col: 1 },
      { start: { row: 3, col: 1 }, end: { row: 3, col: 1 } },
    )).toThrow(/Workbook-owned Worksheet\.setCellValue is unavailable/);
    expect(worksheet.calls.map(({ method }) => method)).toEqual(['getCell', 'getCell', 'setCellValue']);
    expect(worksheet.calls[0].args).toEqual([{ row: 1, col: 1 }]);
    expect(worksheet.calls[1].args).toEqual([{ row: 3, col: 1 }]);
    expect(worksheet.calls[2].args).toEqual([{ row: 3, col: 1 }, expectedValue]);
    expect(worksheet.getCell({ row: 3, col: 1 })?.value).toBe('adopted target');
    expect(manager.getHistoryStats()).toEqual({ undoCount: 1, redoCount: 0 });
  });
});
