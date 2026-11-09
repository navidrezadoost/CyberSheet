import { EditingManager } from '../src/EditingManager';
import type { EditingOptions } from '../src/EditingManager';
import { adoptWorksheetByWorkbook, Worksheet } from '../../core/src/worksheet';
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

type ClipboardFormatMap = Record<string, string>;

function clipboardEvent(type: 'copy' | 'cut' | 'paste'): ClipboardEvent {
  const event = new Event(type, { cancelable: true });
  Object.defineProperty(event, 'clipboardData', {
    value: {
      getData: jest.fn(() => ''),
      setData: jest.fn(),
    },
  });
  return event as ClipboardEvent;
}

function createEditingManager(worksheet: Worksheet, options?: EditingOptions): EditingManager {
  // This test adopts the source Worksheet through an internal source-only seam,
  // while EditingManager's public type resolves to the generated package
  // declaration. Their ECMAScript private brands differ to TypeScript even
  // though the Jest resolver aliases both imports to the same runtime class.
  return new EditingManager(
    worksheet as unknown as ConstructorParameters<typeof EditingManager>[0],
    options,
  );
}

describe('EditingManager retained Worksheet and listener lifecycle', () => {
  test('keeps the Worksheet runtime-private and checks its actual owner after shadowing', () => {
    const worksheet = new CallRecordingWorksheet('Private retained sheet', 3, 2);
    worksheet.setCellValue({ row: 1, col: 1 }, 5);
    const replacement = new CallRecordingWorksheet('Shadow sheet', 3, 2);
    replacement.setCellValue({ row: 1, col: 1 }, 99);
    const manager = createEditingManager(worksheet, { enableClipboard: false });

    expect(Object.getOwnPropertyNames(manager)).not.toContain('worksheet');
    expect((manager as unknown as { worksheet?: Worksheet }).worksheet).toBeUndefined();

    // An ordinary property with the old field name cannot replace #worksheet.
    Object.defineProperty(manager, 'worksheet', { configurable: true, value: replacement });
    manager.fillCells(
      { row: 1, col: 1 },
      { start: { row: 2, col: 1 }, end: { row: 2, col: 1 } },
    );
    expect(worksheet.getCell({ row: 2, col: 1 })?.value).toBe(5);
    expect(replacement.getCell({ row: 2, col: 1 })?.value).toBeUndefined();

    const beforeAdoption = manager.getHistoryStats();
    worksheet.calls.length = 0;
    Object.defineProperty(worksheet, 'isWorkbookOwned', { configurable: true, value: () => false });
    adoptWorksheetByWorkbook(worksheet, 'editing-manager-private-owner' as WorkbookId);

    expect(() => manager.fillCells(
      { row: 1, col: 1 },
      { start: { row: 3, col: 1 }, end: { row: 3, col: 1 } },
    )).toThrow(/EditingManager cannot operate on a Workbook-owned Worksheet/);
    expect(worksheet.calls).toEqual([]);
    expect(worksheet.getCell({ row: 3, col: 1 })?.value).toBeUndefined();
    expect(manager.getHistoryStats()).toEqual(beforeAdoption);
    manager.dispose();
  });

  test('removes only its own listeners once and makes retained callbacks inert after disposal', () => {
    const worksheet = new CallRecordingWorksheet('Listener lifecycle', 2, 2);
    worksheet.setCellValue({ row: 1, col: 1 }, 'source');
    const addListener = jest.spyOn(document, 'addEventListener');
    const removeListener = jest.spyOn(document, 'removeEventListener');

    let first: EditingManager | undefined;
    let second: EditingManager | undefined;
    try {
      first = createEditingManager(worksheet);
      second = createEditingManager(worksheet);
      first.setSelection({ row: 1, col: 1 });
      second.setSelection({ row: 1, col: 1 });

      const clipboardRegistrations = addListener.mock.calls.filter(([type]) =>
        ['copy', 'cut', 'paste'].includes(String(type)),
      );
      expect(clipboardRegistrations.map(([type]) => type)).toEqual([
        'copy', 'cut', 'paste', 'copy', 'cut', 'paste',
      ]);
      const firstCallbacks = clipboardRegistrations.slice(0, 3).map(([, listener]) => listener as EventListener);
      const secondCallbacks = clipboardRegistrations.slice(3).map(([, listener]) => listener as EventListener);

      first.dispose();
      expect(removeListener.mock.calls).toEqual([
        ['copy', firstCallbacks[0]],
        ['cut', firstCallbacks[1]],
        ['paste', firstCallbacks[2]],
      ]);
      first.dispose();
      expect(removeListener).toHaveBeenCalledTimes(3);

      // Simulate a callback already retained by an event dispatcher when the
      // manager was disposed. It must not inspect the event or Worksheet.
      worksheet.calls.length = 0;
      for (const [index, callback] of firstCallbacks.entries()) {
        const type = (['copy', 'cut', 'paste'] as const)[index];
        const event = clipboardEvent(type);
        const preventDefault = jest.spyOn(event, 'preventDefault');
        callback(event);
        expect(preventDefault).not.toHaveBeenCalled();
        expect(event.clipboardData?.getData).not.toHaveBeenCalled();
        expect(event.clipboardData?.setData).not.toHaveBeenCalled();
      }
      expect(worksheet.calls).toEqual([]);

      // The other manager remains registered and can still handle the event.
      const formats: ClipboardFormatMap = {};
      const write = jest.fn((format: string, value: string) => { formats[format] = value; });
      const copy = new Event('copy', { cancelable: true });
      Object.defineProperty(copy, 'clipboardData', { value: { setData: write, getData: jest.fn() } });
      document.dispatchEvent(copy);
      expect(write).toHaveBeenCalledTimes(4);
      expect(formats['text/plain']).toBe('source');
      expect(removeListener.mock.calls).toEqual([
        ['copy', firstCallbacks[0]],
        ['cut', firstCallbacks[1]],
        ['paste', firstCallbacks[2]],
      ]);

      // Ownership changes do not automatically unregister the remaining
      // manager: its callback stays installed but rejects before effects.
      Object.defineProperty(worksheet, 'isWorkbookOwned', { configurable: true, value: () => false });
      adoptWorksheetByWorkbook(worksheet, 'editing-manager-listener-owner' as WorkbookId);
      worksheet.calls.length = 0;
      const afterAdoption = clipboardEvent('copy');
      const errors: ErrorEvent[] = [];
      const captureError = (error: ErrorEvent) => { errors.push(error); error.preventDefault(); };
      window.addEventListener('error', captureError);
      try {
        expect(document.dispatchEvent(afterAdoption)).toBe(true);
      } finally {
        window.removeEventListener('error', captureError);
      }
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toMatch(/EditingManager cannot operate on a Workbook-owned Worksheet/);
      expect(afterAdoption.clipboardData?.getData).not.toHaveBeenCalled();
      expect(afterAdoption.clipboardData?.setData).not.toHaveBeenCalled();
      expect(worksheet.calls).toEqual([]);
      expect(removeListener).toHaveBeenCalledTimes(3);

      second.dispose();
      expect(removeListener.mock.calls.slice(3)).toEqual([
        ['copy', secondCallbacks[0]],
        ['cut', secondCallbacks[1]],
        ['paste', secondCallbacks[2]],
      ]);
      second.dispose();
      expect(removeListener).toHaveBeenCalledTimes(6);
    } finally {
      first?.dispose();
      second?.dispose();
      addListener.mockRestore();
      removeListener.mockRestore();
    }
  });

  test('rejects Worksheet operations after disposal without changing history or data', () => {
    const worksheet = new CallRecordingWorksheet('Disposed operations', 3, 2);
    worksheet.setCellValue({ row: 1, col: 1 }, 7);
    const manager = createEditingManager(worksheet, { enableClipboard: false });
    manager.fillCells(
      { row: 1, col: 1 },
      { start: { row: 2, col: 1 }, end: { row: 2, col: 1 } },
    );
    const history = manager.getHistoryStats();
    expect(history).toEqual({ undoCount: 1, redoCount: 0 });

    manager.dispose();
    worksheet.calls.length = 0;
    expect(() => manager.fillCells(
      { row: 1, col: 1 },
      { start: { row: 3, col: 1 }, end: { row: 3, col: 1 } },
    )).toThrow(/EditingManager has been disposed/);
    expect(() => manager.undo()).toThrow(/EditingManager has been disposed/);
    expect(() => manager.redo()).toThrow(/EditingManager has been disposed/);
    expect(() => manager.clearHistory()).toThrow(/EditingManager has been disposed/);
    expect(worksheet.calls).toEqual([]);
    expect(worksheet.getCell({ row: 2, col: 1 })?.value).toBe(7);
    expect(manager.getHistoryStats()).toEqual(history);
  });
});
