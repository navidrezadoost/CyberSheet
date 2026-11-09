import React from 'react';
import { jest } from '@jest/globals';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CommandManager, Workbook, Worksheet } from '@cyber-sheet/core';
import { OwnerBackedWorkbookSheetView } from '../../../core/src/WorkbookSheetView';
import { ExcelApp } from '../components/ExcelApp';

const mockRendererListeners = new Set<(event: unknown) => void>();
let mockValidationItems: string[] = [];
let mockRendererCanvas: HTMLCanvasElement | null = null;
const mockRendererViewModes: string[] = [];

function mockEmitRendererEvent(event: unknown): void {
  for (const listener of [...mockRendererListeners]) listener(event);
}

jest.mock('../CyberSheet', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  return {
    CyberSheet: (props: {
      workbook: Workbook;
      onSelectionChange: (selection: { start: { row: number; col: number }; end: { row: number; col: number } }) => void;
      onRendererReady: (renderer: unknown) => void;
    }) => {
      ReactModule.useEffect(() => {
        const canvas = document.createElement('canvas');
        mockRendererCanvas = canvas;
        props.onRendererReady({
          getViewportSize: () => ({ width: 800, height: 500 }),
          getScroll: () => ({ x: 0, y: 0 }),
          onScrollChange: () => ({ dispose: () => {} }),
          setViewMode: (mode: string) => { mockRendererViewModes.push(mode); },
          setSelection: () => {},
          getCellBounds: () => ({ x: 4, y: 8, width: 80, height: 20 }),
          rectForCell: () => ({ x: 4, y: 8, width: 80, height: 20 }),
          getSelections: () => [{ start: { row: 1, col: 1 }, end: { row: 1, col: 1 } }],
          hitTest: () => ({ type: 'cell', addr: { row: 1, col: 1 } }),
          canvas,
          sheetReadonly: {
            on: (listener: (event: unknown) => void) => {
              mockRendererListeners.add(listener);
              return { dispose: () => mockRendererListeners.delete(listener) };
            },
          },
          getValidationEngine: () => ({ getDropdownItems: () => mockValidationItems }),
          scheduleRedraw: jest.fn(),
        });
      }, [props.onRendererReady]);

      return ReactModule.createElement(ReactModule.Fragment, null,
        ReactModule.createElement('button', {
          'data-testid': 'select-a1',
          onClick: () => props.onSelectionChange({
            start: { row: 1, col: 1 }, end: { row: 1, col: 1 },
          }),
        }, 'select A1'),
        ReactModule.createElement('button', {
          'data-testid': 'select-b1',
          onClick: () => props.onSelectionChange({
            start: { row: 1, col: 2 }, end: { row: 1, col: 2 },
          }),
        }, 'select B1'),
      );
    },
  };
});

jest.mock('../components/DrawingCanvas', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  return { DrawingCanvas: ReactModule.forwardRef(() => null) };
});
jest.mock('../components/excel-app.css', () => ({}), { virtual: true });
jest.mock('../components/ribbon/ribbon.css', () => ({}), { virtual: true });
jest.mock('@cyber-sheet/icons/react', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  return new Proxy({}, {
    get: (_target, name) => name === '__esModule'
      ? true
      : (props: Record<string, unknown>) => ReactModule.createElement('span', props),
  });
}, { virtual: true });
jest.mock('@cyber-sheet/react', () => ({ DataValidationDialog: () => null }), { virtual: true });

describe('ExcelApp editor observations and callback lifecycle (H.85)', () => {
  beforeEach(() => {
    mockRendererListeners.clear();
    mockValidationItems = [];
    mockRendererCanvas = null;
    mockRendererViewModes.length = 0;
  });

  afterEach(() => {
    cleanup();
    mockRendererListeners.clear();
    mockRendererCanvas = null;
    jest.restoreAllMocks();
  });

  function createOwnedFormulaWorkbook(formula = '=40+2', cachedValue = 'h85-formula-cache-secret') {
    const worksheet = new Worksheet('H85 owner view', 4, 3);
    worksheet.setCellFormula({ row: 1, col: 1 }, formula, cachedValue);
    worksheet.setCellValue({ row: 1, col: 2 }, 'ordinary-H85-value');
    const workbook = new Workbook();
    workbook.attachDevImportSheet(worksheet);
    return { worksheet, workbook };
  }

  test('F2 initializes from the detached formula snapshot without exposing its cached value', () => {
    const { worksheet, workbook } = createOwnedFormulaWorkbook();
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    render(React.createElement(ExcelApp, { workbook }));
    fireEvent.click(screen.getByTestId('select-a1'));
    fireEvent.keyDown(window, { code: 'F2', key: 'F2' });

    const input = document.querySelector<HTMLInputElement>('.cell-edit-overlay-input');
    expect(input).toHaveValue('=40+2');
    expect(document.body.textContent).not.toContain('h85-formula-cache-secret');
    expect(workbook.activeSheet?.getCell({ row: 1, col: 1 })).toMatchObject({
      formula: '=40+2', value: null,
    });
    expect(worksheet.getCellValue({ row: 1, col: 2 })).toBe('ordinary-H85-value');
    expect(events).toEqual([]);

    subscription.dispose();
  });

  test('double-click initializes the editor from the current Workbook-issued view', () => {
    const { worksheet, workbook } = createOwnedFormulaWorkbook('=A1+1', 'double-click-cache-secret');
    render(React.createElement(ExcelApp, { workbook }));
    act(() => mockEmitRendererEvent({ type: 'cell-double-click', event: { address: { row: 1, col: 1 } } }));

    expect(document.querySelector<HTMLInputElement>('.cell-edit-overlay-input')).toHaveValue('=A1+1');
    expect(document.body.textContent).not.toContain('double-click-cache-secret');
    expect(worksheet.getCellValue({ row: 1, col: 2 })).toBe('ordinary-H85-value');
  });

  test('validation dropdown masks the current formula cache and reports rejected selection accessibly', () => {
    const { worksheet, workbook } = createOwnedFormulaWorkbook('=40+2', 'validation-cache-secret');
    mockValidationItems = ['ordinary-choice', 'another-choice'];
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    let reportedError: unknown;
    const captureError = (event: ErrorEvent) => {
      reportedError = event.error;
      event.preventDefault();
    };
    window.addEventListener('error', captureError);

    render(React.createElement(ExcelApp, { workbook }));
    fireEvent.click(screen.getByTestId('select-a1'));
    fireEvent.keyDown(window, { altKey: true, code: 'ArrowDown', key: 'ArrowDown' });

    expect(screen.getByText('ordinary-choice')).toBeInTheDocument();
    expect(screen.queryByText('validation-cache-secret')).toBeNull();
    fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });
    expect(screen.queryByText('ordinary-choice')).toBeNull();
    fireEvent.keyDown(window, { altKey: true, code: 'ArrowDown', key: 'ArrowDown' });
    expect(screen.getByText('ordinary-choice')).toBeInTheDocument();
    fireEvent.click(screen.getByText('ordinary-choice'));

    expect(screen.getByRole('alert')).toHaveTextContent('This action is unavailable for this Workbook-owned sheet.');
    expect(screen.queryByText('ordinary-choice')).toBeNull();
    expect(workbook.activeSheet?.getCellValue({ row: 1, col: 1 })).toBe(null);
    expect(worksheet.getCell({ row: 1, col: 1 })?.formula).toBe('=40+2');
    expect(events).toEqual([]);
    expect(reportedError).toBeUndefined();

    window.removeEventListener('error', captureError);
    subscription.dispose();
  });

  test('hyperlink editor masks formula cache, retains its draft on rejected save, and is inert after unmount', () => {
    const worksheet = new Worksheet('H85 hyperlink', 4, 3);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=40+2', 'hyperlink-cache-secret');
    worksheet.setCellValue({ row: 1, col: 2 }, 'ordinary-H85-value');
    worksheet.setHyperlink({ row: 1, col: 1 }, {
      target: 'https://example.test/original', kind: 'url', tooltip: '',
    });
    const workbook = new Workbook();
    workbook.attachDevImportSheet(worksheet);
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    let reportedError: unknown;
    const captureError = (event: ErrorEvent) => {
      reportedError = event.error;
      event.preventDefault();
    };
    window.addEventListener('error', captureError);

    const view = render(React.createElement(ExcelApp, { workbook }));
    fireEvent.click(screen.getByTestId('select-a1'));
    fireEvent.keyDown(document.body, { ctrlKey: true, code: 'KeyK', key: 'k' });
    const displayText = screen.getByText('Text to display:').parentElement!.querySelector('input')!;
    expect(displayText).toHaveValue('');
    expect(document.body.textContent).not.toContain('hyperlink-cache-secret');
    fireEvent.change(displayText, { target: { value: 'safe editor draft' } });
    fireEvent.click(screen.getByTestId('select-b1'));
    const saveButton = screen.getByRole('button', { name: 'OK' });
    fireEvent.click(saveButton);

    expect(screen.getByRole('alert')).toHaveTextContent('This action is unavailable for this Workbook-owned sheet.');
    expect(displayText).toHaveValue('safe editor draft');
    expect(worksheet.getHyperlink({ row: 1, col: 1 })?.target).toBe('https://example.test/original');
    expect(worksheet.getCell({ row: 1, col: 1 })?.formula).toBe('=40+2');
    expect(worksheet.getCellValue({ row: 1, col: 2 })).toBe('ordinary-H85-value');
    expect(events).toEqual([]);
    expect(reportedError).toBeUndefined();

    fireEvent.click(screen.getByRole('button', { name: 'Remove Link' }));
    expect(screen.getByRole('alert')).toHaveTextContent('This action is unavailable for this Workbook-owned sheet.');
    expect(worksheet.getHyperlink({ row: 1, col: 1 })?.target).toBe('https://example.test/original');
    expect(events).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Text to display:')).toBeNull();
    fireEvent.click(saveButton);
    expect(events).toEqual([]);

    view.unmount();
    fireEvent.click(saveButton);
    expect(events).toEqual([]);
    expect(worksheet.getHyperlink({ row: 1, col: 1 })?.target).toBe('https://example.test/original');

    window.removeEventListener('error', captureError);
    subscription.dispose();
  });

  test('comment editor receives detached owner comments and preserves its draft after rejected save', () => {
    const worksheet = new Worksheet('H85 comments', 4, 3);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=40+2', 'comment-cache-secret');
    worksheet.addComment({ row: 1, col: 1 }, {
      author: 'H85 reviewer', text: 'existing owner comment',
    });
    const workbook = new Workbook();
    workbook.attachDevImportSheet(worksheet);
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    let reportedError: unknown;
    const captureError = (event: ErrorEvent) => {
      reportedError = event.error;
      event.preventDefault();
    };
    window.addEventListener('error', captureError);

    const view = render(React.createElement(ExcelApp, { workbook, config: { enableComments: true } }));
    fireEvent.click(screen.getByTestId('select-a1'));
    fireEvent.keyDown(window, { shiftKey: true, code: 'F2', key: 'F2' });
    const commentDraft = screen.getByPlaceholderText('Type your comment...');
    expect(commentDraft).toHaveValue('existing owner comment');
    const detached = workbook.activeSheet!.getComments({ row: 1, col: 1 });
    expect(Object.isFrozen(detached[0])).toBe(true);
    expect(detached[0]!.text).toBe('existing owner comment');
    expect(worksheet.getComments({ row: 1, col: 1 })[0]!.text).toBe('existing owner comment');

    fireEvent.change(commentDraft, { target: { value: 'new owner comment draft' } });
    const saveButtons = screen.getAllByRole('button', { name: 'Save' });
    const saveButton = saveButtons[saveButtons.length - 1]!;
    fireEvent.click(saveButton);
    expect(screen.getByRole('alert')).toHaveTextContent('This action is unavailable for this Workbook-owned sheet.');
    expect(screen.getByPlaceholderText('Type your comment...')).toHaveValue('new owner comment draft');
    expect(worksheet.getComments({ row: 1, col: 1 })[0]!.text).toBe('existing owner comment');
    expect(events).toEqual([]);
    expect(reportedError).toBeUndefined();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('alert')).toHaveTextContent('This action is unavailable for this Workbook-owned sheet.');
    expect(worksheet.getComments({ row: 1, col: 1 })[0]!.text).toBe('existing owner comment');
    expect(events).toEqual([]);

    view.unmount();
    fireEvent.click(saveButton);
    expect(events).toEqual([]);
    expect(worksheet.getComments({ row: 1, col: 1 })[0]!.text).toBe('existing owner comment');

    window.removeEventListener('error', captureError);
    subscription.dispose();
  });

  test('MiniToolbar reads owner style through the current view and its retained DOM control is inert after unmount', () => {
    const worksheet = new Worksheet('H85 MiniToolbar', 3, 2);
    worksheet.setCellStyle({ row: 1, col: 1 }, { fontSize: 16, italic: true, color: '#13579b' });
    const getCellStyle = jest.spyOn(worksheet, 'getCellStyle');
    const workbook = new Workbook();
    workbook.attachDevImportSheet(worksheet);
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const view = render(React.createElement(ExcelApp, { workbook }));
    fireEvent.click(screen.getByTestId('select-a1'));
    fireEvent.contextMenu(mockRendererCanvas!, { clientX: 30, clientY: 40 });

    expect(document.querySelector('.excel-mini-toolbar')).toBeInTheDocument();
    expect(getCellStyle).toHaveBeenCalledWith({ row: 1, col: 1 });
    const fontSizeControls = screen.getAllByRole('combobox', { name: 'Font size' });
    expect(fontSizeControls[fontSizeControls.length - 1]).toHaveTextContent('16');
    const increaseButtons = screen.getAllByTitle('Increase Font Size');
    const retainedButton = increaseButtons[increaseButtons.length - 1]!;
    const initialStyle = workbook.activeSheet!.getCellStyle({ row: 1, col: 1 });
    expect(initialStyle).toMatchObject({ fontSize: 16, italic: true, color: '#13579b' });
    expect(Object.isFrozen(initialStyle)).toBe(true);

    view.unmount();
    fireEvent.click(retainedButton);
    expect(worksheet.getCell({ row: 1, col: 1 })?.style).toMatchObject({
      fontSize: 16, italic: true, color: '#13579b',
    });
    expect(events).toEqual([]);
    subscription.dispose();
  });

  test('P1-08A.05 keeps all mounted view controls in React presentation state', () => {
    const { worksheet, workbook } = createOwnedFormulaWorkbook(
      '=40+2',
      'h08a-view-mode-cache-secret',
    );
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const ownerView = workbook.activeSheet!;
    expect(ownerView).toBeInstanceOf(OwnerBackedWorkbookSheetView);
    expect(Object.isFrozen(ownerView)).toBe(true);
    const execute = jest.spyOn(CommandManager.prototype, 'execute');

    render(React.createElement(ExcelApp, { workbook }));
    const modes = [
      { mode: 'normal', title: 'Normal View' },
      { mode: 'pageLayout', title: 'Page Layout View' },
      { mode: 'pageBreak', title: 'Page Break Preview' },
    ] as const;

    for (const { mode, title } of modes) {
      fireEvent.click(document.querySelector<HTMLButtonElement>(`.status-bar button[title="${title}"]`)!);
      expect(document.querySelector(`.status-bar .view-btn[title="${title}"]`)).toHaveClass('active');
      expect(mockRendererViewModes[mockRendererViewModes.length - 1]).toBe(mode);
    }

    fireEvent.click(screen.getByRole('button', { name: 'View' }));
    for (const { mode, title } of modes) {
      fireEvent.click(document.querySelector<HTMLButtonElement>(`.ribbon .view-ribbon-group button[title="${title}"]`)!);
      const selectedRibbonButton = document.querySelector<HTMLButtonElement>(`.ribbon .view-ribbon-group button[title="${title}"]`)!;
      expect(selectedRibbonButton.style.background).toBe('rgb(224, 224, 224)');
      expect(document.querySelector(`.status-bar .view-btn[title="${title}"]`)).toHaveClass('active');
      expect(mockRendererViewModes[mockRendererViewModes.length - 1]).toBe(mode);
    }

    expect(execute).not.toHaveBeenCalled();
    expect(workbook.activeSheet).toBe(ownerView);
    expect(Object.isFrozen(ownerView)).toBe(true);
    expect(worksheet.getCell({ row: 1, col: 1 })?.formula).toBe('=40+2');
    expect(worksheet.getCell({ row: 1, col: 1 })?.value).toBe('h08a-view-mode-cache-secret');
    expect(document.body.textContent).not.toContain('h08a-view-mode-cache-secret');
    expect(worksheet.getCellValue({ row: 1, col: 2 })).toBe('ordinary-H85-value');
    expect(events).toEqual([]);

    subscription.dispose();
  });

  test('P1-08A.05 keeps the retained formula read unresolved when mounted owner Sort is rejected before command dispatch', () => {
    const { worksheet, workbook } = createOwnedFormulaWorkbook(
      '=40+2',
      'h08a-retained-read-cache-secret',
    );
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const ownerValueRead = jest.spyOn(
      OwnerBackedWorkbookSheetView.prototype,
      'getCellValue',
    );
    let subscriberInvocations = 0;
    const subscribe = CommandManager.prototype.subscribe;
    jest.spyOn(CommandManager.prototype, 'subscribe').mockImplementation(function (this: CommandManager, listener: () => void) {
      return subscribe.call(this, () => {
        subscriberInvocations++;
        listener();
      });
    });
    const execute = jest.spyOn(CommandManager.prototype, 'execute');

    render(React.createElement(ExcelApp, { workbook }));
    fireEvent.click(screen.getByTestId('select-a1'));
    ownerValueRead.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Data' }));
    fireEvent.click(screen.getByTitle('Sort A to Z (Ascending)'));

    expect(screen.getByRole('alert')).toHaveTextContent('Sort is unavailable for this Workbook-owned sheet');
    expect(execute).not.toHaveBeenCalled();
    expect(subscriberInvocations).toBe(0);
    expect(ownerValueRead).not.toHaveBeenCalledWith({ row: 1, col: 1 });
    expect(worksheet.getCell({ row: 1, col: 1 })?.formula).toBe('=40+2');
    expect(worksheet.getCell({ row: 1, col: 1 })?.value).toBe('h08a-retained-read-cache-secret');
    expect(worksheet.getCellValue({ row: 1, col: 2 })).toBe('ordinary-H85-value');
    expect(events).toEqual([]);
    subscription.dispose();
  });
});
