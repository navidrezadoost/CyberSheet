import { Workbook } from '../../core/src/workbook';
import type { WorkbookSheetView } from '../../core/src/workbook-access-types';
import { Worksheet, adoptWorksheetByWorkbook } from '../../core/src/worksheet';
import type { RenderPlugin } from '../src/plugins';
import { CanvasRenderer } from '../src/CanvasRenderer';

function setViewport(container: HTMLElement) {
  Object.defineProperty(container, 'clientWidth', { value: 600, configurable: true });
  Object.defineProperty(container, 'clientHeight', { value: 400, configurable: true });
}

function capturePluginValues(source: Worksheet | WorkbookSheetView) {
  const container = document.createElement('div');
  setViewport(container);
  const renderer = new CanvasRenderer(container, source, { debug: false });
  const values: unknown[] = [];
  const plugin: RenderPlugin = {
    id: 'capture-rendered-values',
    getCellBackground: ({ addr, value }) => {
      if (addr.row === 1 && addr.col === 1) values.push(value);
      return undefined;
    },
  };
  renderer.addPlugin(plugin);
  renderer.redraw();
  return { renderer, container, values };
}

describe('CanvasRenderer structural WorkbookSheetView facade characterization', () => {
  it('compares genuine owner, structural facade, standalone, and retained-handle formula reads', () => {
    const sentinel = 'cached-owner-sentinel-40617';

    // A genuine Workbook-issued view is branded and keeps formula cache values masked.
    const workbook = Workbook.create({ sheets: [{ name: 'Genuine owner view', rows: 4, cols: 4 }] });
    const genuineSource = workbook.createDevImportWorksheet('Prepared', 4, 4);
    genuineSource.setCellFormula({ row: 1, col: 1 }, '=40+2', sentinel);
    workbook.attachDevImportSheet(genuineSource);
    const genuineView = workbook.getSheet('Prepared')!;
    expect(Workbook.isWorkbookIssuedSheetView(genuineView)).toBe(true);
    const genuine = capturePluginValues(genuineView);
    expect(genuine.values).toContain(null);
    expect(genuine.values).not.toContain(sentinel);
    genuine.renderer.dispose();
    expect(genuine.container.childElementCount).toBe(0);

    // An adopted raw Worksheet deliberately remains available to this test only
    // through the existing internal adoption seam. The facade has the public
    // WorkbookSheetView shape but is neither a Worksheet nor a Workbook-issued view.
    const adopted = new Worksheet('Structural facade source', 4, 4);
    adopted.setCellFormula({ row: 1, col: 1 }, '=40+2', sentinel);
    const sourceEvents: unknown[] = [];
    const sourceEventSubscription = adopted.on((event) => sourceEvents.push(event));
    adoptWorksheetByWorkbook(adopted, 'structural-facade-owner');

    let delegatedCellReads = 0;
    let delegatedSubscriptions = 0;
    let delegatedSubscriptionDisposals = 0;
    const facadeRenderCallback = jest.fn();
    const facadeTarget = {
      workbookId: 'untrusted-workbook-id',
      worksheetId: 'untrusted-worksheet-id',
    };
    const facade = new Proxy(facadeTarget, {
      get(target, property, receiver) {
        if (property === 'getCellValue') {
          return (address: { row: number; col: number }) => {
            delegatedCellReads++;
            return adopted.getCellValue(address);
          };
        }
        if (property === 'on') {
          return (listener: Parameters<Worksheet['on']>[0]) => {
            delegatedSubscriptions++;
            const subscription = adopted.on(listener);
            return {
              dispose() {
                delegatedSubscriptionDisposals++;
                subscription.dispose();
              },
            };
          };
        }
        const ownValue = Reflect.get(target, property, receiver);
        if (ownValue !== undefined) return ownValue;
        const sourceValue = Reflect.get(adopted, property, adopted);
        return typeof sourceValue === 'function' ? sourceValue.bind(adopted) : sourceValue;
      },
    }) as unknown as WorkbookSheetView;

    expect(facade).not.toBeInstanceOf(Worksheet);
    expect(Workbook.isWorkbookIssuedSheetView(facade)).toBe(false);
    expect(adopted.getCellValue({ row: 1, col: 1 })).toBe(sentinel);

    const facadeContainer = document.createElement('div');
    setViewport(facadeContainer);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    let constructorError: unknown;
    try {
      new CanvasRenderer(facadeContainer, facade, {
        debug: false,
        onRender: facadeRenderCallback,
      });
    } catch (caught) {
      constructorError = caught;
    }
    const warningCount = warn.mock.calls.length;
    const errorCount = error.mock.calls.length;
    sourceEventSubscription.dispose();
    warn.mockRestore();
    error.mockRestore();

    // Unissued structural facades fail before any delegated reads, subscriptions,
    // canvas publication, or renderer plugin callbacks can occur.
    expect(constructorError).toBeInstanceOf(Error);
    expect((constructorError as Error).message).toMatch(/Workbook-issued sheet view/);
    expect(delegatedCellReads).toBe(0);
    expect(delegatedSubscriptions).toBe(0);
    expect(delegatedSubscriptionDisposals).toBe(0);
    expect(facadeRenderCallback).not.toHaveBeenCalled();
    expect(warningCount).toBe(0);
    expect(errorCount).toBe(0);
    expect(facadeContainer.childElementCount).toBe(0);
    expect(sourceEvents).toEqual([]);
    expect(adopted.getCellValue({ row: 1, col: 1 })).toBe(sentinel);

    // Standalone Worksheet rendering remains compatible with its cached value.
    const standaloneSheet = new Worksheet('Standalone control', 4, 4);
    standaloneSheet.setCellFormula({ row: 1, col: 1 }, '=40+2', sentinel);
    const standalone = capturePluginValues(standaloneSheet);
    expect(standalone.values).toContain(sentinel);
    standalone.renderer.dispose();

    // A renderer's retained observation handle switches to the owner formula
    // masking rule if its original standalone Worksheet is later adopted.
    const retainedSheet = new Worksheet('Retained control', 4, 4);
    retainedSheet.setCellFormula({ row: 1, col: 1 }, '=40+2', sentinel);
    const retainedContainer = document.createElement('div');
    setViewport(retainedContainer);
    const retainedRenderer = new CanvasRenderer(retainedContainer, retainedSheet, { debug: false });
    adoptWorksheetByWorkbook(retainedSheet, 'retained-renderer-control-owner');
    const retainedValues: unknown[] = [];
    retainedRenderer.addPlugin({
      id: 'capture-retained-rendered-values',
      getCellBackground: ({ addr, value }) => {
        if (addr.row === 1 && addr.col === 1) retainedValues.push(value);
        return undefined;
      },
    });
    retainedRenderer.redraw();
    expect(retainedValues).toContain(null);
    expect(retainedValues).not.toContain(sentinel);
    retainedRenderer.dispose();
  });
});
