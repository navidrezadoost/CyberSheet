import React from 'react';
import { jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Workbook, Worksheet } from '@cyber-sheet/core';
import { ExcelApp } from '../components/ExcelApp';

jest.mock('../FormulaBar', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  return {
    FormulaBar: (props: { onFormulaSubmit: (value: string) => void }) =>
      ReactModule.createElement('button', {
        'data-testid': 'submit-formula',
        onClick: () => props.onFormulaSubmit('replacement-value'),
      }, 'submit formula'),
  };
});

jest.mock('../CyberSheet', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  return {
    CyberSheet: (props: {
      onSelectionChange: (selection: { start: { row: number; col: number }; end: { row: number; col: number } }) => void;
      onRendererReady: (renderer: unknown) => void;
    }) => {
      ReactModule.useEffect(() => {
        props.onRendererReady({
          getViewportSize: () => ({ width: 800, height: 500 }),
          getScroll: () => ({ x: 0, y: 0 }),
          onScrollChange: () => ({ dispose: () => {} }),
          setViewMode: () => {},
          sheetReadonly: undefined,
        });
      }, [props.onRendererReady]);
      return ReactModule.createElement('button', {
        'data-testid': 'select-cell',
        onClick: () => props.onSelectionChange({
          start: { row: 1, col: 1 }, end: { row: 1, col: 1 },
        }),
      }, 'select cell');
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
jest.mock('@cyber-sheet/react', () => ({ DataValidationDialog: () => null }), { virtual: true });

describe('ExcelApp formula submit owner boundary (H.83)', () => {
  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  test('presents formula-bar owner rejection accessibly without reporting a global error', () => {
    const worksheet = new Worksheet('Formula submit source', 2, 2);
    worksheet.setCellValue({ row: 1, col: 1 }, 'original-value');
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
    fireEvent.click(screen.getByTestId('submit-formula'));

    expect(reportedError).toBeUndefined();
    expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe('original-value');
    expect(events).toEqual([]);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Editing is unavailable for this Workbook-owned sheet. Your draft has been kept.',
    );
    window.removeEventListener('error', captureError);
    subscription.dispose();
  });
});
