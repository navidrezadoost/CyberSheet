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

  override setCellStyle(...args: Parameters<Worksheet['setCellStyle']>): ReturnType<Worksheet['setCellStyle']> {
    this.calls.push({ method: 'setCellStyle', args });
    return super.setCellStyle(...args);
  }
}

function createPasteEvent(values: ClipboardValues): Event {
  const event = new Event('paste', { cancelable: true });
  Object.defineProperty(event, 'clipboardData', {
    value: { getData: jest.fn((format: string) => values[format] ?? '') },
  });
  return event;
}

describe('EditingManager document paste owner boundary', () => {
  test('preserves standalone custom paste, then rejects both listeners before mutation after adoption', () => {
    const worksheet = new CallRecordingWorksheet('Paste boundary', 3, 3);
    worksheet.setCellValue({ row: 1, col: 1 }, 'original');
    const first = new EditingManager(worksheet);
    const second = new EditingManager(worksheet);
    first.setSelection({ row: 2, col: 1 });
    second.setSelection({ row: 2, col: 1 });

    const customPayload = JSON.stringify({
      cells: [[{ value: 'custom value', style: { bold: true } }]],
      range: { start: { row: 1, col: 1 }, end: { row: 1, col: 1 } },
      isCut: false,
    });
    const standaloneEvent = createPasteEvent({
      'application/x-cyber-sheet': customPayload,
      'text/plain': 'plain fallback',
    });
    expect(document.dispatchEvent(standaloneEvent)).toBe(false);
    expect(worksheet.getCell({ row: 2, col: 1 })).toMatchObject({ value: 'custom value', style: { bold: true } });
    expect(first.getHistoryStats()).toEqual({ undoCount: 1, redoCount: 0 });
    expect(second.getHistoryStats()).toEqual({ undoCount: 1, redoCount: 0 });

    const worksheetEvents: unknown[] = [];
    const disposeEvents = worksheet.on((event) => worksheetEvents.push(event));
    worksheet.calls.length = 0;
    worksheetEvents.length = 0;
    adoptWorksheetByWorkbook(worksheet, 'editing-manager-paste-owner' as WorkbookId);

    const listenerErrors: ErrorEvent[] = [];
    const adoptedPasteEvent = createPasteEvent({
      'application/x-cyber-sheet': JSON.stringify({
        cells: [[{ value: 'blocked custom', style: { italic: true } }]],
        range: { start: { row: 1, col: 1 }, end: { row: 1, col: 1 } },
        isCut: false,
      }),
      'text/plain': 'blocked plain',
    });
    const captureListenerError = (event: ErrorEvent) => {
      listenerErrors.push(event);
      event.preventDefault();
    };
    window.addEventListener('error', captureListenerError);
    let adoptedDispatchResult: boolean;
    try {
      adoptedDispatchResult = document.dispatchEvent(adoptedPasteEvent);
    } finally {
      window.removeEventListener('error', captureListenerError);
      disposeEvents.dispose();
    }

    // dispatchEvent reports cancellation separately; listener exceptions are
    // surfaced by jsdom as window error events and are captured above.
    expect(adoptedDispatchResult!).toBe(true);
    expect(listenerErrors).toHaveLength(2);
    expect(listenerErrors.every(({ error, message }) =>
      error instanceof Error && /EditingManager cannot operate on a Workbook-owned Worksheet/.test(message),
    )).toBe(true);
    expect((adoptedPasteEvent as Event & { clipboardData: { getData: jest.Mock } }).clipboardData.getData).not.toHaveBeenCalled();
    expect(worksheet.calls).toEqual([]);
    expect(worksheet.getCell({ row: 2, col: 1 })).toMatchObject({ value: 'custom value', style: { bold: true } });
    expect(worksheetEvents).toEqual([]);
    expect(first.getSelection()).toEqual({ start: { row: 2, col: 1 }, end: { row: 2, col: 1 } });
    expect(second.getSelection()).toEqual({ start: { row: 2, col: 1 }, end: { row: 2, col: 1 } });
    expect(first.getHistoryStats()).toEqual({ undoCount: 1, redoCount: 0 });
    expect(second.getHistoryStats()).toEqual({ undoCount: 1, redoCount: 0 });
    first.dispose();
    second.dispose();
  });
});
