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

describe('EditingManager paste undo owner boundary', () => {
  test('restores value only in standalone mode and rejects adopted value restoration after popping history', () => {
    const worksheet = new CallRecordingWorksheet('Paste undo boundary', 2, 2);
    worksheet.setCellValue({ row: 1, col: 1 }, 'original');
    worksheet.setCellStyle({ row: 1, col: 1 }, { italic: true });
    const manager = new EditingManager(worksheet);
    manager.setSelection({ row: 1, col: 1 });

    const event = new Event('paste', { cancelable: true });
    Object.defineProperty(event, 'clipboardData', {
      value: {
        getData: (format: string) => format === 'application/x-cyber-sheet'
          ? JSON.stringify({ cells: [[{ value: 'pasted', style: { bold: true } }]], isCut: false })
          : '',
      },
    });
    expect(document.dispatchEvent(event)).toBe(false);
    expect(worksheet.getCell({ row: 1, col: 1 })).toMatchObject({ value: 'pasted', style: { bold: true } });
    expect(manager.getHistoryStats()).toEqual({ undoCount: 1, redoCount: 0 });

    // Standalone paste undo restores the old value but does not restore the
    // previous style captured in pasteCells' old cell snapshot.
    expect(manager.undo()).toBe(true);
    expect(worksheet.getCell({ row: 1, col: 1 })).toMatchObject({ value: 'original', style: { bold: true } });
    expect(manager.getHistoryStats()).toEqual({ undoCount: 0, redoCount: 1 });

    // Reapply the command through redo so the adopted undo below has a pending
    // history entry and starts from the post-paste value/style state.
    expect(manager.redo()).toBe(true);
    expect(worksheet.getCell({ row: 1, col: 1 })).toMatchObject({ value: 'pasted', style: { bold: true } });
    expect(manager.getHistoryStats()).toEqual({ undoCount: 1, redoCount: 0 });

    worksheet.calls.length = 0;
    adoptWorksheetByWorkbook(worksheet, 'editing-manager-paste-undo-owner' as WorkbookId);

    expect(() => manager.undo()).toThrow(/Workbook-owned Worksheet\.setCellValue is unavailable/);
    expect(worksheet.calls).toEqual([{
      method: 'setCellValue',
      args: [{ row: 1, col: 1 }, 'original'],
    }]);
    expect(worksheet.getCell({ row: 1, col: 1 })).toMatchObject({ value: 'pasted', style: { bold: true } });
    expect(manager.getHistoryStats()).toEqual({ undoCount: 0, redoCount: 0 });
  });
});
