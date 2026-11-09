import { EditingManager } from '../src/EditingManager';
import { adoptWorksheetByWorkbook, Worksheet } from '../../core/src/worksheet';
import type { WorkbookId } from '../../core/src/workbook-access-types';

type ClipboardValues = Record<string, string>;

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

function createClipboardEvent(type: 'copy' | 'cut', values: ClipboardValues, writes: string[] = []): Event {
  const event = new Event(type, { cancelable: true });
  Object.defineProperty(event, 'clipboardData', {
    value: {
      setData: (format: string, value: string) => {
        writes.push(format);
        values[format] = value;
      },
      getData: (format: string) => values[format] ?? '',
    },
  });
  return event;
}

describe('EditingManager clipboard owner boundary', () => {
  test('preserves standalone copy and rejects copy/cut after ownership changes before reads or publication', () => {
    const formats = ['text/plain', 'text/html', 'text/csv', 'application/x-cyber-sheet'];
    const worksheet = new CallRecordingWorksheet('Clipboard boundary', 2, 2);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=40+2', 42);
    worksheet.addComment({ row: 1, col: 1 }, { text: 'review note', author: 'Reviewer' });

    const manager = new EditingManager(worksheet);
    manager.setSelection({ row: 1, col: 1 });
    const secondManager = new EditingManager(worksheet);
    secondManager.setSelection({ row: 1, col: 1 });

    const standaloneClipboard: ClipboardValues = {};
    const standaloneWrites: string[] = [];
    document.dispatchEvent(createClipboardEvent('copy', standaloneClipboard, standaloneWrites));
    expect(standaloneWrites).toEqual([...formats, ...formats]);

    expect(standaloneClipboard['text/plain']).toBe('42');
    expect(standaloneClipboard['text/html']).toBe('<table><tr><td>42</td></tr></table>');
    expect(standaloneClipboard['text/csv']).toBe('42');
    expect(JSON.parse(standaloneClipboard['application/x-cyber-sheet'])).toMatchObject({
      cells: [[{ value: 42, formula: '=40+2', comments: [{ text: 'review note', author: 'Reviewer' }] }]],
      isCut: false,
    });

    const worksheetEvents: unknown[] = [];
    const disposeEvents = worksheet.on((event) => worksheetEvents.push(event));
    Object.defineProperty(worksheet, 'isWorkbookOwned', { value: () => false, configurable: true });
    adoptWorksheetByWorkbook(worksheet, 'editing-manager-retained-owner' as WorkbookId);
    worksheet.calls.length = 0;

    const adoptedClipboard: ClipboardValues = {};
    const adoptedWrites: string[] = [];
    const copyErrors: ErrorEvent[] = [];
    const captureCopyError = (event: ErrorEvent) => { copyErrors.push(event); event.preventDefault(); };
    window.addEventListener('error', captureCopyError);
    let copyDispatchResult: boolean;
    try {
      copyDispatchResult = document.dispatchEvent(createClipboardEvent('copy', adoptedClipboard, adoptedWrites));
    } finally {
      window.removeEventListener('error', captureCopyError);
    }
    expect(copyDispatchResult!).toBe(true);
    expect(copyErrors).toHaveLength(2);
    expect(copyErrors.every(({ error, message }) =>
      error instanceof Error && /EditingManager cannot operate on a Workbook-owned Worksheet/.test(message),
    )).toBe(true);
    expect(adoptedWrites).toEqual([]);
    expect(adoptedClipboard).toEqual({});
    expect(worksheet.calls).toEqual([]);

    const cutClipboard: ClipboardValues = {};
    const cutWrites: string[] = [];
    const uncaught: ErrorEvent[] = [];
    const captureUncaught = (event: ErrorEvent) => {
      uncaught.push(event);
      event.preventDefault();
    };
    window.addEventListener('error', captureUncaught);
    let dispatchResult: boolean;
    try {
      dispatchResult = document.dispatchEvent(createClipboardEvent('cut', cutClipboard, cutWrites));
    } finally {
      window.removeEventListener('error', captureUncaught);
    }
    expect(dispatchResult!).toBe(true);
    expect(uncaught).toHaveLength(2);
    expect(uncaught.every(({ error, message }) =>
      error instanceof Error && /EditingManager cannot operate on a Workbook-owned Worksheet/.test(message),
    )).toBe(true);
    expect(cutWrites).toEqual([]);
    expect(cutClipboard).toEqual({});
    expect(worksheet.calls).toEqual([]);
    expect(worksheet.getCell({ row: 1, col: 1 })).toMatchObject({
      value: 42,
      formula: '=40+2',
      comments: [{ text: 'review note', author: 'Reviewer' }],
    });
    expect(worksheetEvents).toEqual([]);
    disposeEvents.dispose();

    // The constructor registered both instances with document and exposes no
    // automatic ownership transition hook; they remain until explicit dispose.
    expect(secondManager.getSelection()).toEqual({ start: { row: 1, col: 1 }, end: { row: 1, col: 1 } });
    manager.dispose();
    secondManager.dispose();
  });

  test('retained fill and undo reject before reads, writes, or history changes', () => {
    const worksheet = new CallRecordingWorksheet('Fill undo boundary', 3, 3);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=8+2', 10);
    worksheet.setCellValue({ row: 2, col: 1 }, 99);
    worksheet.setCellValue({ row: 3, col: 1 }, 77);
    const manager = new EditingManager(worksheet, { enableClipboard: false });

    worksheet.calls.length = 0;
    manager.fillCells({ row: 1, col: 1 }, { start: { row: 2, col: 1 }, end: { row: 2, col: 1 } });

    expect(worksheet.calls.map(({ method }) => method)).toEqual(['getCell', 'getCell', 'setCellValue', 'setCellValue']);
    expect(worksheet.calls[2].args).toEqual([{ row: 2, col: 1 }, 10]);
    expect(worksheet.calls[3].args).toEqual([{ row: 2, col: 1 }, 10]);
    expect(worksheet.getCell({ row: 2, col: 1 })?.value).toBe(10);
    expect(manager.getHistoryStats()).toEqual({ undoCount: 1, redoCount: 0 });

    worksheet.calls.length = 0;
    Object.defineProperty(worksheet, 'isWorkbookOwned', { value: () => false, configurable: true });
    adoptWorksheetByWorkbook(worksheet, 'editing-manager-fill-undo-owner' as WorkbookId);

    expect(() => manager.fillCells({ row: 1, col: 1 }, { start: { row: 3, col: 1 }, end: { row: 3, col: 1 } }))
      .toThrow(/EditingManager cannot operate on a Workbook-owned Worksheet/);
    expect(worksheet.calls).toEqual([]);
    expect(worksheet.getCell({ row: 3, col: 1 })?.value).toBe(77);
    expect(manager.getHistoryStats()).toEqual({ undoCount: 1, redoCount: 0 });

    worksheet.calls.length = 0;
    expect(() => manager.undo()).toThrow(/EditingManager cannot operate on a Workbook-owned Worksheet/);
    expect(worksheet.calls).toEqual([]);
    expect(worksheet.getCell({ row: 2, col: 1 })?.value).toBe(10);
    expect(manager.getHistoryStats()).toEqual({ undoCount: 1, redoCount: 0 });
  });
});
