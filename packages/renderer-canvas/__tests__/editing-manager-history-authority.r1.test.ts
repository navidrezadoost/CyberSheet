import { EditingManager } from '../src/EditingManager';
import type { EditingOptions } from '../src/EditingManager';
import { adoptWorksheetByWorkbook, Worksheet } from '../../core/src/worksheet';
import type { WorkbookId } from '../../core/src/workbook-access-types';

class ReadTrackingWorksheet extends Worksheet {
  readonly reads: Array<{ address: { row: number; col: number }; value: unknown }> = [];
  readonly writeAttempts: Array<{ address: { row: number; col: number }; value: unknown }> = [];

  override getCell(...args: Parameters<Worksheet['getCell']>): ReturnType<Worksheet['getCell']> {
    const cell = super.getCell(...args);
    this.reads.push({ address: args[0], value: cell?.value });
    return cell;
  }

  override setCellValue(...args: Parameters<Worksheet['setCellValue']>): ReturnType<Worksheet['setCellValue']> {
    this.writeAttempts.push({ address: args[0], value: args[1] });
    return super.setCellValue(...args);
  }
}

function createEditingManager(worksheet: Worksheet, options?: EditingOptions): EditingManager {
  // The internal adoption seam uses the source Worksheet type, while the
  // manager's public type resolves through the generated Core declaration.
  return new EditingManager(
    worksheet as unknown as ConstructorParameters<typeof EditingManager>[0],
    options,
  );
}

function copyEvent(values: Record<string, string>): Event {
  const event = new Event('copy', { cancelable: true });
  Object.defineProperty(event, 'clipboardData', {
    value: {
      setData: (format: string, value: string) => { values[format] = value; },
      getData: () => '',
    },
  });
  return event;
}

describe('EditingManager history callback authority characterization', () => {
  test('history stacks are private, shadow-resistant, and owner checks precede post-adoption and disposed operations', () => {
    const worksheet = new ReadTrackingWorksheet('History callback authority', 3, 2);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=40+2', 42);
    worksheet.setCellValue({ row: 2, col: 1 }, 'original target');
    const manager = createEditingManager(worksheet);
    manager.setSelection({ row: 1, col: 1 });
    const events: unknown[] = [];
    const mutationSubscription = worksheet.onMutation((event) => events.push(event));

    // Existing standalone fill, undo, and redo remain usable and create a
    // representative command in each history stack.
    manager.fillCells(
      { row: 1, col: 1 },
      { start: { row: 2, col: 1 }, end: { row: 2, col: 1 } },
    );
    expect(worksheet.getCell({ row: 2, col: 1 })?.value).toBe(42);
    expect(manager.getHistoryStats()).toEqual({ undoCount: 1, redoCount: 0 });
    expect(manager.undo()).toBe(true);
    expect(worksheet.getCell({ row: 2, col: 1 })?.value).toBe('original target');
    expect(manager.getHistoryStats()).toEqual({ undoCount: 0, redoCount: 1 });
    expect(manager.redo()).toBe(true);
    expect(worksheet.getCell({ row: 2, col: 1 })?.value).toBe(42);
    expect(manager.getHistoryStats()).toEqual({ undoCount: 1, redoCount: 0 });

    const copied: Record<string, string> = {};
    document.dispatchEvent(copyEvent(copied));
    expect(copied['text/plain']).toBe('42');
    expect(JSON.parse(copied['application/x-cyber-sheet'])).toMatchObject({
      cells: [[{ value: 42, formula: '=40+2' }]],
      isCut: false,
    });

    const reflectable = manager as unknown as {
      undoStack?: unknown;
      redoStack?: unknown;
      clipboardData?: unknown;
      selection?: unknown;
    };
    expect(Object.getOwnPropertyNames(manager)).not.toContain('undoStack');
    expect(Object.getOwnPropertyNames(manager)).not.toContain('redoStack');
    expect(reflectable.undoStack).toBeUndefined();
    expect(reflectable.redoStack).toBeUndefined();
    expect(reflectable.clipboardData).toBeUndefined();
    expect(reflectable.selection).toEqual({ start: { row: 1, col: 1 }, end: { row: 1, col: 1 } });
    expect(manager.getSelection()).toEqual({ start: { row: 1, col: 1 }, end: { row: 1, col: 1 } });

    // Ordinary shadow properties cannot replace the actual ECMAScript-private
    // history stacks. The public history result contains detached scalar data.
    Object.defineProperty(manager, 'undoStack', { configurable: true, value: [] });
    Object.defineProperty(manager, 'redoStack', { configurable: true, value: [] });
    const stats = manager.getHistoryStats();
    Object.assign(stats, { undoCount: 100, redoCount: 100 });
    expect(manager.getHistoryStats()).toEqual({ undoCount: 1, redoCount: 0 });
    expect(manager.undo()).toBe(true);
    expect(worksheet.getCell({ row: 2, col: 1 })?.value).toBe('original target');
    expect(manager.getHistoryStats()).toEqual({ undoCount: 0, redoCount: 1 });
    expect(manager.redo()).toBe(true);
    expect(worksheet.getCell({ row: 2, col: 1 })?.value).toBe(42);
    expect(manager.getHistoryStats()).toEqual({ undoCount: 1, redoCount: 0 });

    events.length = 0;
    worksheet.reads.length = 0;
    worksheet.writeAttempts.length = 0;
    Object.defineProperty(worksheet, 'isWorkbookOwned', { configurable: true, value: () => false });
    adoptWorksheetByWorkbook(worksheet, 'editing-manager-history-callback-owner' as WorkbookId);

    // Public operations are stopped by EditingManager before Worksheet access.
    expect(() => manager.fillCells(
      { row: 1, col: 1 },
      { start: { row: 3, col: 1 }, end: { row: 3, col: 1 } },
    )).toThrow(/EditingManager cannot operate on a Workbook-owned Worksheet/);
    expect(worksheet.reads).toEqual([]);
    expect(worksheet.writeAttempts).toEqual([]);
    expect(manager.getHistoryStats()).toEqual({ undoCount: 1, redoCount: 0 });

    manager.dispose();
    worksheet.reads.length = 0;
    worksheet.writeAttempts.length = 0;
    expect(() => manager.fillCells(
      { row: 1, col: 1 },
      { start: { row: 3, col: 1 }, end: { row: 3, col: 1 } },
    )).toThrow(/EditingManager has been disposed/);
    expect(worksheet.reads).toEqual([]);
    expect(worksheet.writeAttempts).toEqual([]);

    expect(worksheet.reads).toEqual([]);
    expect(worksheet.writeAttempts).toEqual([]);
    expect(events).toEqual([]);
    expect(manager.getHistoryStats()).toEqual({ undoCount: 1, redoCount: 0 });
    mutationSubscription.dispose();
  });
});
