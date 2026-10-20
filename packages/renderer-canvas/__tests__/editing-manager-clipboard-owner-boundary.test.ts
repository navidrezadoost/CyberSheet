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

describe('EditingManager clipboard read characterization', () => {
  test('valid standalone copy works, and a retained raw sheet publishes cached formula data before cut rejects', () => {
    const formats = ['text/plain', 'text/html', 'text/csv', 'application/x-cyber-sheet'];
    const worksheet = new Worksheet('Clipboard boundary', 2, 2);
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

    adoptWorksheetByWorkbook(worksheet, 'editing-manager-retained-owner' as WorkbookId);

    const adoptedClipboard: ClipboardValues = {};
    const adoptedWrites: string[] = [];
    document.dispatchEvent(createClipboardEvent('copy', adoptedClipboard, adoptedWrites));
    expect(adoptedWrites).toEqual([...formats, ...formats]);

    expect(adoptedClipboard['text/plain']).toBe('42');
    expect(adoptedClipboard['text/html']).toContain('<td>42</td>');
    expect(adoptedClipboard['text/csv']).toBe('42');
    const adoptedPayload = JSON.parse(adoptedClipboard['application/x-cyber-sheet']);
    expect(adoptedPayload).toMatchObject({
      cells: [[{ value: 42, formula: '=40+2', comments: [{ text: 'review note', author: 'Reviewer' }] }]],
      isCut: false,
    });

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
    expect(dispatchResult!).toBe(false);
    expect(uncaught).toHaveLength(2);
    expect(uncaught.every((event) => event.error instanceof Error)).toBe(true);
    expect(uncaught.every((event) => /Workbook-owned Worksheet\.setCellValue/.test(event.message))).toBe(true);
    expect(cutWrites).toEqual([...formats, ...formats]);

    expect(cutClipboard['text/plain']).toBe('42');
    expect(cutClipboard['text/html']).toContain('<td>42</td>');
    expect(cutClipboard['text/csv']).toBe('42');
    expect(JSON.parse(cutClipboard['application/x-cyber-sheet'])).toMatchObject({ isCut: false });
    expect(worksheet.getCell({ row: 1, col: 1 })).toMatchObject({
      value: 42,
      formula: '=40+2',
      comments: [{ text: 'review note', author: 'Reviewer' }],
    });

    // The constructor registered both instances with document and exposes no
    // disposal method, so they remain active for later clipboard events.
    expect(secondManager.getSelection()).toEqual({ start: { row: 1, col: 1 }, end: { row: 1, col: 1 } });
  });

  test('retained fill reads formula data before write rejection and undo pops history before its guard rejects', () => {
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
    adoptWorksheetByWorkbook(worksheet, 'editing-manager-fill-undo-owner' as WorkbookId);

    expect(() => manager.fillCells({ row: 1, col: 1 }, { start: { row: 3, col: 1 }, end: { row: 3, col: 1 } }))
      .toThrow(/Workbook-owned Worksheet\.setCellValue is unavailable/);
    expect(worksheet.calls.map(({ method }) => method)).toEqual(['getCell', 'getCell', 'setCellValue']);
    expect(worksheet.calls[2].args).toEqual([{ row: 3, col: 1 }, 10]);
    expect(worksheet.getCell({ row: 3, col: 1 })?.value).toBe(77);
    expect(manager.getHistoryStats()).toEqual({ undoCount: 1, redoCount: 0 });

    worksheet.calls.length = 0;

    expect(() => manager.undo()).toThrow(/Workbook-owned Worksheet\.setCellValue is unavailable/);
    expect(worksheet.calls.map(({ method }) => method)).toEqual(['setCellValue']);
    expect(worksheet.calls[0].args).toEqual([{ row: 2, col: 1 }, 99]);
    expect(worksheet.getCell({ row: 2, col: 1 })?.value).toBe(10);
    expect(manager.getHistoryStats()).toEqual({ undoCount: 0, redoCount: 0 });
  });
});
