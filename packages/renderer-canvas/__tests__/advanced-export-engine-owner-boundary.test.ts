import { adoptWorksheetByWorkbook, Worksheet } from '../../core/src/worksheet';
import { AdvancedExportEngine } from '../src/AdvancedExportEngine';

// The renderer project can resolve Core's declarations from dist while Jest
// maps runtime imports to Core source. Keep that duplicate class identity
// conversion explicit at this test boundary; both values are the same runtime
// Worksheet implementation under the Jest mapper.
function createEngine(worksheet: Worksheet): AdvancedExportEngine {
  return new AdvancedExportEngine(
    worksheet as unknown as ConstructorParameters<typeof AdvancedExportEngine>[0],
  );
}

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

describe('AdvancedExportEngine retained Worksheet ownership boundary', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('preserves standalone XLSX output and rejects a retained Worksheet after adoption', async () => {
    const sentinel = 'advanced-export-cached-sentinel-73194';
    const worksheet = new Worksheet('Advanced export boundary', 4, 4);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=40+2', sentinel);
    const engine = createEngine(worksheet);
    const options = {
      range: {
        start: { row: 1, col: 1 },
        end: { row: 1, col: 1 },
      },
      includeFormulas: true,
    };

    const standalone = await engine.exportXLSX(options);
    const standaloneText = await readBlob(standalone);
    expect(standaloneText).toContain(sentinel);
    expect(standaloneText).toContain('=40+2');
    expect(standaloneText).toContain('<c r="A1"');

    const sourceEvents: unknown[] = [];
    const subscription = worksheet.on((event) => sourceEvents.push(event));
    Object.defineProperty(worksheet, 'isWorkbookOwned', {
      value: () => false,
      configurable: true,
    });
    adoptWorksheetByWorkbook(worksheet, 'advanced-export-retained-owner');

    const getCell = jest.spyOn(Worksheet.prototype, 'getCell');
    await expect(engine.exportXLSX(options)).rejects.toThrow(
      'AdvancedExportEngine cannot read a Workbook-owned Worksheet',
    );
    await expect(engine.exportPDF()).rejects.toThrow(
      'AdvancedExportEngine cannot read a Workbook-owned Worksheet',
    );
    expect(() => engine.print()).toThrow(
      'AdvancedExportEngine cannot read a Workbook-owned Worksheet',
    );
    expect(getCell).not.toHaveBeenCalled();
    getCell.mockRestore();

    expect(worksheet.getCell({ row: 1, col: 1 })).toMatchObject({ value: sentinel, formula: '=40+2' });
    expect(sourceEvents).toEqual([]);

    subscription.dispose();
  });

  it('rejects adopted sources before PDF canvas creation or print-window publication', async () => {
    const worksheet = new Worksheet('Advanced export output boundary', 4, 4);
    const engine = createEngine(worksheet);
    adoptWorksheetByWorkbook(worksheet, 'advanced-export-output-owner');

    const createElement = jest.spyOn(document, 'createElement');
    const openWindow = jest.spyOn(window, 'open').mockReturnValue(null);

    await expect(engine.exportPDF()).rejects.toThrow(
      'AdvancedExportEngine cannot read a Workbook-owned Worksheet',
    );
    expect(() => engine.print()).toThrow(
      'AdvancedExportEngine cannot read a Workbook-owned Worksheet',
    );
    expect(createElement).not.toHaveBeenCalled();
    expect(openWindow).not.toHaveBeenCalled();

    createElement.mockRestore();
    openWindow.mockRestore();
  });

  it('rejects a structural Worksheet facade before delegated reads', async () => {
    const getCell = jest.fn(() => ({ value: 'facade-sentinel' }));
    const facade = {
      name: 'Untrusted facade',
      rowCount: 4,
      colCount: 4,
      getCell,
    } as unknown as Worksheet;
    expect(() => createEngine(facade)).toThrow(
      'AdvancedExportEngine requires an authentic standalone Worksheet',
    );
    expect(getCell).not.toHaveBeenCalled();
  });

  it('keeps the retained Worksheet out of reflection and ignores a shadow property', async () => {
    const original = new Worksheet('Original source', 2, 2);
    original.setCellValue({ row: 1, col: 1 }, 'original-A1');
    const replacement = new Worksheet('Replacement source', 2, 2);
    replacement.setCellValue({ row: 1, col: 1 }, 'replacement-A1');
    const engine = createEngine(original);

    expect(Object.getOwnPropertyNames(engine)).not.toContain('worksheet');
    expect((engine as unknown as { worksheet?: Worksheet }).worksheet).toBeUndefined();
    Object.defineProperty(engine, 'worksheet', { configurable: true, value: replacement });

    const output = await engine.exportXLSX({
      range: { start: { row: 1, col: 1 }, end: { row: 1, col: 1 } },
    });
    const text = await readBlob(output);
    expect(text).toContain('original-A1');
    expect(text).not.toContain('replacement-A1');
    expect(text).toContain('<c r="A1"');
  });

  it('uses one-based addresses for default XLSX range discovery and preserves empty-sheet fallback', async () => {
    const worksheet = new Worksheet('Default range', 4, 4);
    worksheet.setCellValue({ row: 1, col: 1 }, 'origin-A1');
    worksheet.setCellValue({ row: 3, col: 3 }, 'third-C3');
    const engine = createEngine(worksheet);

    const output = await engine.exportXLSX();
    const text = await readBlob(output);
    expect(text).toContain('<row r="1">');
    expect(text).toContain('<c r="A1"');
    expect(text).toContain('<v>origin-A1</v>');
    expect(text).toContain('<row r="3">');
    expect(text).toContain('<c r="C3"');
    expect(text).toContain('<v>third-C3</v>');

    const emptyOutput = await createEngine(new Worksheet('Empty', 2, 2)).exportXLSX();
    const emptyText = await readBlob(emptyOutput);
    expect(emptyText).toContain('<row r="1"></row>');
  });

  it('finds a used cell at the supported last row without scanning invalid zero coordinates', () => {
    const worksheet = new Worksheet('Last supported row', 1_048_576, 16_384);
    worksheet.setCellValue({ row: 1_048_576, col: 1 }, 'bottom-row');
    const engine = createEngine(worksheet);
    const range = (engine as unknown as { getUsedRange(): { start: { row: number; col: number }; end: { row: number; col: number } } }).getUsedRange();

    expect(range).toEqual({
      start: { row: 1, col: 1 },
      end: { row: 1_048_576, col: 1 },
    });
  });

  it('includes default-range origin and non-origin values in PDF rendering and print HTML', async () => {
    const worksheet = new Worksheet('Visual formats', 3, 3);
    worksheet.setCellValue({ row: 1, col: 1 }, 'origin-A1');
    worksheet.setCellValue({ row: 3, col: 2 }, 'last-B3');
    const engine = createEngine(worksheet);

    const renderedText: string[] = [];
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() => ({
      fillRect: jest.fn(),
      fillText: (value: string) => renderedText.push(value),
      strokeRect: jest.fn(),
    })) as unknown as typeof HTMLCanvasElement.prototype.getContext);
    jest.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,test');
    const pdf = await engine.exportPDF();
    expect(pdf.type).toBe('application/pdf');
    expect(renderedText).toContain('origin-A1');
    expect(renderedText).toContain('last-B3');

    const printDocument = { write: jest.fn(), close: jest.fn() };
    const printWindow = { document: printDocument } as unknown as Window;
    jest.spyOn(window, 'open').mockReturnValue(printWindow);
    engine.print();
    const html = String(printDocument.write.mock.calls[0][0]);
    expect(html).toContain('<td>origin-A1</td>');
    expect(html).toContain('<td>last-B3</td>');

    const emptyWorksheet = new Worksheet('Empty visual formats', 2, 2);
    const emptyEngine = createEngine(emptyWorksheet);
    renderedText.length = 0;
    await emptyEngine.exportPDF();
    expect(renderedText).toContain('');
    const emptyDocument = { write: jest.fn(), close: jest.fn() };
    jest.spyOn(window, 'open').mockReturnValue({ document: emptyDocument } as unknown as Window);
    emptyEngine.print();
    expect(String(emptyDocument.write.mock.calls[0][0])).toContain('<td></td>');
    jest.restoreAllMocks();
  });

  it('rejects construction from an already-adopted Worksheet', () => {
    const worksheet = new Worksheet('Already adopted', 2, 2);
    adoptWorksheetByWorkbook(worksheet, 'advanced-export-constructor-owner');
    expect(() => createEngine(worksheet)).toThrow(
      'AdvancedExportEngine cannot read a Workbook-owned Worksheet',
    );
  });
});
