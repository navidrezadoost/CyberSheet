import { EditingManager } from '../src/EditingManager';
import { adoptWorksheetByWorkbook, Worksheet } from '../../core/src/worksheet';
import type { WorkbookId } from '../../core/src/workbook-access-types';

class CallRecordingWorksheet extends Worksheet {
  readonly calls: Array<{ method: string; args: unknown[] }> = [];

  override setCellValue(...args: Parameters<Worksheet['setCellValue']>): ReturnType<Worksheet['setCellValue']> {
    this.calls.push({ method: 'setCellValue', args });
    return super.setCellValue(...args);
  }
}

describe('EditingManager cut undo owner boundary', () => {
  test('preserves standalone cut and retains undo history when restoration is rejected after adoption', () => {
    const worksheet = new CallRecordingWorksheet('Cut undo boundary', 2, 2);
    worksheet.setCellValue({ row: 1, col: 1 }, 'cut value');
    const manager = new EditingManager(worksheet);
    manager.setSelection({ row: 1, col: 1 });
    const clipboardValues: Record<string, string> = {};
    const formats: string[] = [];
    const event = new Event('cut', { cancelable: true });
    Object.defineProperty(event, 'clipboardData', {
      value: {
        setData: (format: string, value: string) => {
          formats.push(format);
          clipboardValues[format] = value;
        },
        getData: (format: string) => clipboardValues[format] ?? '',
      },
    });

    expect(document.dispatchEvent(event)).toBe(false);
    expect(formats).toEqual(['text/plain', 'text/html', 'text/csv', 'application/x-cyber-sheet']);
    expect(clipboardValues['text/plain']).toBe('cut value');
    expect(JSON.parse(clipboardValues['application/x-cyber-sheet'])).toMatchObject({
      cells: [[{ value: 'cut value' }]],
      isCut: false,
    });
    expect(worksheet.getCell({ row: 1, col: 1 })?.value).toBeNull();
    expect(manager.getHistoryStats()).toEqual({ undoCount: 1, redoCount: 0 });

    worksheet.calls.length = 0;
    Object.defineProperty(worksheet, 'isWorkbookOwned', { value: () => false, configurable: true });
    adoptWorksheetByWorkbook(worksheet, 'editing-manager-cut-undo-owner' as WorkbookId);

    expect(() => manager.undo()).toThrow(/EditingManager cannot operate on a Workbook-owned Worksheet/);
    expect(worksheet.calls).toEqual([]);
    expect(worksheet.getCell({ row: 1, col: 1 })?.value).toBeNull();
    expect(manager.getHistoryStats()).toEqual({ undoCount: 1, redoCount: 0 });
    manager.dispose();
  });
});
