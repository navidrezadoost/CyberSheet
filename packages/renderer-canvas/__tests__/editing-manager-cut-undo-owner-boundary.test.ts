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
  test('publishes clipboard data before cut and consumes history when adopted restoration rejects', () => {
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
    adoptWorksheetByWorkbook(worksheet, 'editing-manager-cut-undo-owner' as WorkbookId);

    expect(() => manager.undo()).toThrow(/Workbook-owned Worksheet\.setCellValue is unavailable/);
    expect(worksheet.calls).toEqual([{
      method: 'setCellValue',
      args: [{ row: 1, col: 1 }, 'cut value'],
    }]);
    expect(worksheet.getCell({ row: 1, col: 1 })?.value).toBeNull();
    expect(manager.getHistoryStats()).toEqual({ undoCount: 0, redoCount: 0 });
  });
});
