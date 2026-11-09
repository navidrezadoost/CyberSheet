import React from 'react';
import { jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CommandManager, Workbook, Worksheet } from '@cyber-sheet/core';
import { ExcelApp } from '../components/ExcelApp';

const mockFilterApply = jest.fn();
const mockFilterClear = jest.fn();
const mockRendererRedraw = jest.fn();

jest.mock('../CyberSheet', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  return {
    CyberSheet: (props: {
      workbook: Workbook;
      rendererOptions: { onRequestColumnFilterMenu: (args: unknown) => void };
      onSelectionChange: (selection: { start: { row: number; col: number }; end: { row: number; col: number } }) => void;
      onRendererReady: (renderer: unknown) => void;
    }) => {
      ReactModule.useEffect(() => {
        props.onRendererReady({
          getViewportSize: () => ({ width: 800, height: 500 }),
          getScroll: () => ({ x: 0, y: 0 }),
          onScrollChange: () => ({ dispose: () => {} }),
          setViewMode: () => {},
          redraw: mockRendererRedraw,
          getCellBounds: () => ({ x: 0, y: 0, width: 80, height: 20 }),
          sheetReadonly: props.workbook.activeSheet,
        });
      }, [props.onRendererReady]);
      const requestFilter = () => props.rendererOptions.onRequestColumnFilterMenu({
        col: 1,
        anchor: { x: 10, y: 10 },
        values: [
          { value: String(props.workbook.activeSheet?.getCellValue({ row: 1, col: 1 }) ?? ''), count: 1 },
          { value: String(props.workbook.activeSheet?.getCellValue({ row: 2, col: 1 }) ?? ''), count: 1 },
        ],
        apply: mockFilterApply,
        clear: mockFilterClear,
      });
      return ReactModule.createElement(ReactModule.Fragment, null,
        ReactModule.createElement('button', {
          'data-testid': 'select-cell',
          onClick: () => props.onSelectionChange({
            start: { row: 1, col: 1 }, end: { row: 1, col: 1 },
          }),
        }, 'select cell'),
        ReactModule.createElement('button', {
          'data-testid': 'select-next-cell',
          onClick: () => props.onSelectionChange({
            start: { row: 1, col: 2 }, end: { row: 1, col: 2 },
          }),
        }, 'select next cell'),
        ReactModule.createElement('button', {
          'data-testid': 'open-filter', onClick: requestFilter,
        }, 'open filter'),
      );
    },
  };
});

jest.mock('../components/DrawingCanvas', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  return { DrawingCanvas: ReactModule.forwardRef(() => null) };
});
jest.mock('../components/MiniToolbar', () => ({ MiniToolbar: () => null }));
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
jest.mock('@cyber-sheet/react', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  return {
    DataValidationDialog: (props: { onApply: (rule: unknown) => void }) =>
      ReactModule.createElement('button', {
        onClick: () => props.onApply({ type: 'wholeNumber' }),
      }, 'Apply validation'),
  };
}, { virtual: true });

describe('ExcelApp editing and filter owner-boundary feedback (H.84)', () => {
  beforeEach(() => {
    mockFilterApply.mockClear();
    mockFilterClear.mockClear();
    mockRendererRedraw.mockClear();
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  test('mounted ExcelApp Data-tab command rejects its Workbook view before dispatch and announces it (H.94)', () => {
    const worksheet = new Worksheet('Mounted Data tab H93', 2, 2);
    worksheet.setCellValue({ row: 1, col: 1 }, 'preserve');
    const workbook = new Workbook();
    workbook.attachDevImportSheet(worksheet);
    const execute = jest.spyOn(CommandManager.prototype, 'execute');
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    let reportedError: unknown;
    const captureError = (event: ErrorEvent) => {
      reportedError = event.error;
      event.preventDefault();
    };
    window.addEventListener('error', captureError);

    render(React.createElement(ExcelApp, { workbook }));
    fireEvent.click(screen.getByRole('button', { name: 'Data' }));
    const sortButton = document.querySelector<HTMLButtonElement>('[title="Sort A to Z (Ascending)"]');
    expect(sortButton).not.toBeNull();
    fireEvent.click(sortButton!);
    expect(screen.getByRole('alert')).toHaveTextContent('Select a cell or range before using Sort');

    fireEvent.click(screen.getByTestId('select-cell'));
    fireEvent.click(sortButton!);
    window.removeEventListener('error', captureError);

    expect(screen.getByRole('alert')).toHaveTextContent('Sort is unavailable for this Workbook-owned sheet');
    expect(reportedError).toBeUndefined();
    expect(execute).not.toHaveBeenCalled();
    expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe('preserve');
    expect(events).toEqual([]);
    subscription.dispose();
  });

  test('reports unsupported mounted Data-tab commands without dispatching them', () => {
    const worksheet = new Worksheet('Data actions H94', 3, 3);
    worksheet.setCellValue({ row: 1, col: 1 }, 'unchanged');
    const workbook = new Workbook();
    workbook.attachDevImportSheet(worksheet);
    const execute = jest.spyOn(CommandManager.prototype, 'execute');
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));

    render(React.createElement(ExcelApp, { workbook }));
    fireEvent.click(screen.getByTestId('select-cell'));
    fireEvent.click(screen.getByRole('button', { name: 'Data' }));

    fireEvent.click(screen.getByTitle('Data Validation'));
    fireEvent.click(screen.getByRole('button', { name: 'Data Validation...' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply validation' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Set Data Validation is not available');
    expect(execute).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('Data Validation'));
    fireEvent.click(screen.getByRole('button', { name: 'Circle Invalid Data' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Circle Invalid Data is not available');
    fireEvent.click(screen.getByTitle('Data Validation'));
    fireEvent.click(screen.getByRole('button', { name: 'Clear Validation Circles' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Clear Validation Circles is not available');

    fireEvent.click(screen.getByTitle('Flash Fill (Ctrl+E)'));
    expect(screen.getByRole('alert')).toHaveTextContent('Flash Fill is not available');
    fireEvent.click(screen.getByTitle('Refresh All'));
    expect(screen.getByRole('alert')).toHaveTextContent('Refresh All Connections is not available');

    fireEvent.click(screen.getByTitle('Remove Duplicates'));
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Remove Duplicates is not available');
    expect(execute).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('Text to Columns'));
    fireEvent.click(screen.getByRole('button', { name: 'Next →' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next →' }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Text to Columns is not available');
    expect(execute).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('Group'));
    fireEvent.click(screen.getByRole('button', { name: 'Group...' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Group Outline is not available');
    expect(execute).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTitle('Group'));
    fireEvent.click(screen.getByRole('button', { name: 'Auto Outline' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Auto Outline is not available');

    fireEvent.click(screen.getByTitle('Ungroup'));
    fireEvent.click(screen.getByRole('button', { name: 'Ungroup...' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Ungroup Outline is not available');
    expect(execute).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTitle('Ungroup'));
    fireEvent.click(screen.getByRole('button', { name: 'Clear Outline' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Clear Outline is not available');

    expect((worksheet as Worksheet & { outlineGroups?: unknown }).outlineGroups).toBeUndefined();
    expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe('unchanged');
    expect(events).toEqual([]);
    subscription.dispose();
  });

  test('replaces mounted feedback in action order and clears it after redraw-only Reapply (H.95)', () => {
    const worksheet = new Worksheet('Feedback lifecycle H95', 3, 3);
    worksheet.setCellValue({ row: 1, col: 1 }, 'unchanged');
    const workbook = new Workbook();
    workbook.attachDevImportSheet(worksheet);
    const execute = jest.spyOn(CommandManager.prototype, 'execute');
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));

    render(React.createElement(ExcelApp, { workbook }));
    fireEvent.click(screen.getByTestId('select-cell'));
    fireEvent.click(screen.getByRole('button', { name: 'Data' }));
    fireEvent.click(screen.getByTitle('Data Validation'));
    fireEvent.click(screen.getByRole('button', { name: 'Data Validation...' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply validation' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Set Data Validation is not available');

    fireEvent.click(screen.getByTestId('select-cell'));
    fireEvent.click(screen.getByTitle('Sort A to Z (Ascending)'));
    expect(screen.getByRole('alert')).toHaveTextContent('Sort is unavailable for this Workbook-owned sheet');
    expect(screen.getByRole('alert')).not.toHaveTextContent('Set Data Validation');

    fireEvent.click(screen.getByTitle('Reapply'));
    expect(mockRendererRedraw).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(execute).not.toHaveBeenCalled();
    expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe('unchanged');
    expect(events).toEqual([]);
    subscription.dispose();
  });

  test('re-announces an identical mounted owner-rejection alert (H.96)', () => {
    const worksheet = new Worksheet('Repeated alert H96', 2, 2);
    const workbook = new Workbook();
    workbook.attachDevImportSheet(worksheet);

    render(React.createElement(ExcelApp, { workbook }));
    fireEvent.click(screen.getByTestId('select-cell'));
    fireEvent.click(screen.getByRole('button', { name: 'Data' }));
    const sortButton = screen.getByTitle('Sort A to Z (Ascending)');

    fireEvent.click(sortButton);
    const firstAlert = screen.getByRole('alert');
    expect(firstAlert).toHaveAttribute('aria-live', 'assertive');
    expect(firstAlert).toHaveTextContent('Sort is unavailable for this Workbook-owned sheet');

    fireEvent.click(sortButton);
    const repeatedAlert = screen.getByRole('alert');
    expect(repeatedAlert).toHaveAttribute('aria-live', 'assertive');
    expect(repeatedAlert).toHaveTextContent('Sort is unavailable for this Workbook-owned sheet');
    expect(repeatedAlert).not.toBe(firstAlert);
  });

  test('keeps Reapply as redraw-only and does not claim filter recomputation', () => {
    const worksheet = new Worksheet('Reapply H94', 2, 2);
    const workbook = new Workbook();
    workbook.attachDevImportSheet(worksheet);
    const execute = jest.spyOn(CommandManager.prototype, 'execute');

    render(React.createElement(ExcelApp, { workbook }));
    fireEvent.click(screen.getByTestId('select-cell'));
    fireEvent.click(screen.getByRole('button', { name: 'Data' }));
    fireEvent.click(screen.getByTitle('Clear'));
    expect(screen.getByRole('alert')).toHaveTextContent('Clear Filter is unavailable for this Workbook-owned sheet');
    expect(execute).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTitle('Filter'));
    expect(screen.getByRole('alert')).toHaveTextContent('Filter is unavailable for this Workbook-owned sheet');
    expect(execute).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTitle('Reapply'));

    expect(mockRendererRedraw).toHaveBeenCalledTimes(1);
    expect(execute).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  test('announces mounted AutoSum owner rejection before dispatch or mutation', () => {
    const worksheet = new Worksheet('AutoSum H94', 3, 2);
    worksheet.setCellValue({ row: 1, col: 1 }, 12);
    worksheet.setCellFormula({ row: 2, col: 1 }, '=6+6', 'formula-cache-12');
    worksheet.setCellStyle({ row: 1, col: 1 }, { fontSize: 14, italic: true });
    const workbook = new Workbook();
    workbook.attachDevImportSheet(worksheet);
    const execute = jest.spyOn(CommandManager.prototype, 'execute');
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));
    const beforeStyle = worksheet.getCellStyle({ row: 1, col: 1 });
    let reportedError: unknown;
    const captureError = (event: ErrorEvent) => {
      reportedError = event.error;
      event.preventDefault();
    };
    window.addEventListener('error', captureError);

    render(React.createElement(ExcelApp, { workbook }));
    fireEvent.click(screen.getByTestId('select-cell'));
    fireEvent.click(screen.getByRole('button', { name: 'Formulas' }));
    fireEvent.click(screen.getByTitle('AutoSum'));
    fireEvent.click(screen.getByText('Sum'));
    expect(screen.getByRole('alert')).toHaveTextContent('AutoSum is unavailable for this Workbook-owned sheet');

    fireEvent.click(screen.getByTitle('AutoSum'));
    fireEvent.click(screen.getByText('Sum'));

    // Home's EditingGroup is unavailable while ExcelApp has no FormattingController.
    fireEvent.click(screen.getByRole('button', { name: 'Home' }));
    expect(screen.queryByTitle('AutoSum (Alt+=)')).toBeNull();
    fireEvent.keyDown(window, { altKey: true, code: 'Equal', key: '=' });
    expect(screen.getByRole('alert')).toHaveTextContent('AutoSum is unavailable for this Workbook-owned sheet');

    window.removeEventListener('error', captureError);
    expect(screen.getByRole('alert')).toHaveTextContent('AutoSum is unavailable for this Workbook-owned sheet');
    expect(reportedError).toBeUndefined();
    expect(execute).not.toHaveBeenCalled();
    expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe(12);
    expect(worksheet.getCell({ row: 2, col: 1 })?.formula).toBe('=6+6');
    expect(worksheet.getCellStyle({ row: 1, col: 1 })).toEqual(beforeStyle);
    expect(events).toEqual([]);
    subscription.dispose();
  });

  test('retains FormulaBar draft, selection, and edit mode after rejected owner mutation', () => {
    const worksheet = new Worksheet('FormulaBar H84', 3, 2);
    worksheet.setCellValue({ row: 1, col: 1 }, 'source-value');
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

    render(React.createElement(ExcelApp, { workbook }));
    fireEvent.click(screen.getByTestId('select-cell'));
    const formulaInput = document.querySelector<HTMLInputElement>('.formula-bar-input');
    expect(formulaInput).not.toBeNull();
    fireEvent.focus(formulaInput!);
    fireEvent.change(formulaInput!, { target: { value: 'draft-value' } });
    fireEvent.keyDown(formulaInput!, { key: 'Enter' });

    expect(screen.getByRole('alert')).toHaveTextContent('Your draft has been kept.');
    expect(formulaInput).toHaveValue('draft-value');
    expect(screen.getByTitle('Confirm (Enter)')).toBeInTheDocument();
    expect(screen.getByDisplayValue('A1')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('select-next-cell'));
    expect(screen.getByDisplayValue('A1')).toBeInTheDocument();
    expect(formulaInput).toHaveValue('draft-value');
    expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe('source-value');
    expect(events).toEqual([]);
    expect(reportedError).toBeUndefined();

    window.removeEventListener('error', captureError);
    subscription.dispose();
  });

  test('retains in-cell value draft after rejected owner mutation', () => {
    const worksheet = new Worksheet('Inline edit H84', 3, 2);
    worksheet.setCellValue({ row: 1, col: 1 }, 'source-value');
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

    render(React.createElement(ExcelApp, { workbook }));
    fireEvent.click(screen.getByTestId('select-cell'));
    fireEvent.keyDown(window, { code: 'F2', key: 'F2' });
    const inlineInput = document.querySelector<HTMLInputElement>('.cell-edit-overlay-input');
    expect(inlineInput).not.toBeNull();
    fireEvent.change(inlineInput!, { target: { value: 'inline-draft' } });
    fireEvent.keyDown(inlineInput!, { key: 'Enter', code: 'Enter' });

    expect(screen.getByRole('alert')).toHaveTextContent('Your draft has been kept.');
    expect(inlineInput).toHaveValue('inline-draft');
    expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe('source-value');
    expect(events).toEqual([]);
    expect(reportedError).toBeUndefined();

    window.removeEventListener('error', captureError);
    subscription.dispose();
  });

  test('shows formula-safe owner filter values and closes after rejected apply', () => {
    const worksheet = new Worksheet('Filter H84', 3, 2);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=40+2', 'filter-cache-secret-H84');
    worksheet.setCellValue({ row: 2, col: 1 }, 'ordinary-visible');
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

    render(React.createElement(ExcelApp, { workbook }));
    fireEvent.click(screen.getByTestId('open-filter'));
    expect(screen.getByText('ordinary-visible')).toBeInTheDocument();
    expect(screen.queryByText('filter-cache-secret-H84')).toBeNull();
    expect(screen.getByText('Filter - Column 1')).toBeInTheDocument();

    fireEvent.click(screen.getByText('ordinary-visible'));
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(screen.queryByText('Filter - Column 1')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('unavailable for this Workbook-owned sheet');
    expect(worksheet.getColumnFilter(1)).toBeUndefined();
    expect(worksheet.getCellValue({ row: 2, col: 1 })).toBe('ordinary-visible');
    expect(events).toEqual([]);
    expect(mockFilterApply).not.toHaveBeenCalled();
    expect(reportedError).toBeUndefined();

    window.removeEventListener('error', captureError);
    subscription.dispose();
  });

  test('closes filter menu and preserves the filter after rejected clear callback', () => {
    const worksheet = new Worksheet('Clear filter H84', 3, 2);
    worksheet.setCellValue({ row: 1, col: 1 }, 'kept');
    worksheet.setCellValue({ row: 2, col: 1 }, 'other');
    worksheet.setColumnFilter(1, { type: 'in', value: ['kept'] });
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

    render(React.createElement(ExcelApp, { workbook }));
    fireEvent.click(screen.getByTestId('open-filter'));
    expect(screen.getByText('Filter - Column 1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(screen.queryByText('Filter - Column 1')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('unavailable for this Workbook-owned sheet');
    expect(worksheet.getColumnFilter(1)).toEqual({ type: 'in', value: ['kept'] });
    expect(events).toEqual([]);
    expect(mockFilterClear).not.toHaveBeenCalled();
    expect(reportedError).toBeUndefined();

    window.removeEventListener('error', captureError);
    subscription.dispose();
  });

  test('closes filter menu and reports formula-dependent visible-row rejection', () => {
    const worksheet = new Worksheet('Filtered formula H84', 3, 2);
    worksheet.setCellFormula({ row: 1, col: 2 }, '=40+2', 'filtered-cache-secret-H84');
    worksheet.setColumnFilter(2, { type: 'in', value: ['included'] });
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

    render(React.createElement(ExcelApp, { workbook }));
    fireEvent.click(screen.getByTestId('open-filter'));

    expect(screen.queryByText('Filter - Column 1')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This filter cannot be opened while another filter depends on formula results.',
    );
    expect(worksheet.getColumnFilter(2)).toEqual({ type: 'in', value: ['included'] });
    expect(events).toEqual([]);
    expect(reportedError).toBeUndefined();

    window.removeEventListener('error', captureError);
    subscription.dispose();
  });
});
