import { ClipboardService } from '@cyber-sheet/core';
import { adoptWorksheetByWorkbook, Worksheet } from '../../../core/src/worksheet';
import type { WorkbookId } from '../../../core/src/workbook-access-types';
import { performCut } from '../utils/clipboardOperations';

describe('R1 retained raw Worksheet Cut boundary', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('adopted raw Worksheet Cut rejects before cell reads, staging, diagnostics, or publication', async () => {
    // This internal adoption seam characterizes retained-raw behavior; it is not a supported public Workbook lifecycle.
    const worksheet = new Worksheet('Retained raw cut target', 2, 2);
    const formula = '=40+2';
    const cachedValueSentinel = 'retained-cut-formula-cache-sentinel';
    const address = { row: 1, col: 1 };
    const range = { start: address, end: address };
    worksheet.setCellFormula(address, formula, cachedValueSentinel);
    adoptWorksheetByWorkbook(worksheet, 'retained-raw-cut-owner' as WorkbookId);
    expect(worksheet.isWorkbookOwned()).toBe(true);
    expect('workbookId' in worksheet).toBe(false);

    const clipboardService = new ClipboardService();
    const seed = new Worksheet('Clipboard preservation seed', 2, 2);
    seed.setCellValue(address, 'prior-payload');
    const priorPayload = clipboardService.copy(seed, range);
    const worksheetEvents: unknown[] = [];
    const eventSubscription = worksheet.on((event) => worksheetEvents.push(event));
    const previousClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    let publishedSentinel = false;
    const writeText = jest.fn((text: string) => {
      publishedSentinel = text === cachedValueSentinel;
      return Promise.reject(new Error('browser clipboard unavailable'));
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const diagnosticLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    const cutSpy = jest.spyOn(clipboardService, 'cut');
    const getCellSpy = jest.spyOn(Worksheet.prototype, 'getCell');
    const getCellValueSpy = jest.spyOn(Worksheet.prototype, 'getCellValue');
    const getMergeSpy = jest.spyOn(Worksheet.prototype, 'getMergedRangeForCell');

    try {
      expect(() => performCut(worksheet, clipboardService, range)).toThrow(/unavailable/);

      expect(cutSpy).not.toHaveBeenCalled();
      expect(clipboardService.getPayload()).toBe(priorPayload);
      expect(getCellSpy).not.toHaveBeenCalledWith(address);
      expect(getCellValueSpy).not.toHaveBeenCalledWith(address);
      expect(getMergeSpy).not.toHaveBeenCalledWith(address);
      expect(diagnosticLog).not.toHaveBeenCalled();
      expect(JSON.stringify(diagnosticLog.mock.calls)).not.toContain(cachedValueSentinel);
      expect(writeText).not.toHaveBeenCalled();
      expect(publishedSentinel).toBe(false);
      expect(worksheetEvents).toHaveLength(0);

      const finalCell = worksheet.getCell(address);
      expect(finalCell?.value === cachedValueSentinel && finalCell?.formula === formula).toBe(true);
    } finally {
      eventSubscription.dispose();
      if (previousClipboardDescriptor) {
        Object.defineProperty(navigator, 'clipboard', previousClipboardDescriptor);
      } else {
        delete (navigator as unknown as { clipboard?: Clipboard }).clipboard;
      }
    }
  });
});
