import React from 'react';
import { jest } from '@jest/globals';
import { act, fireEvent, render, screen, cleanup } from '@testing-library/react';
import { Workbook } from '@cyber-sheet/core';
import { Worksheet } from '../../../core/src/worksheet';
import { ExcelRibbon } from '../components/ribbon/ExcelRibbon';

jest.mock('../components/ribbon/data/DataTab', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  return {
    DataTab: (props: { onCommand?: (command: unknown) => void }) =>
      ReactModule.createElement(
        'button',
        {
          'data-testid': 'dispatch-data-sort',
          onClick: () => props.onCommand?.({
            type: 'sort',
            range: { start: { row: 1, col: 1 }, end: { row: 1, col: 1 } },
            sortBy: [],
          }),
        },
        'Run data command',
      ),
  };
});

jest.mock('../components/ribbon/ribbon.css', () => ({}), { virtual: true });
jest.mock('../components/ribbon/RibbonSelect', () => ({ RibbonSelect: () => null }));
jest.mock('../components/ribbon/ClipboardGroup', () => ({ ClipboardGroup: () => null }));
jest.mock('../components/ribbon/FontGroup', () => ({ FontGroup: () => null }));
jest.mock('../components/ribbon/AlignmentGroupV2', () => ({ AlignmentGroupV2: () => null }));
jest.mock('../components/ribbon/NumberFormatGroup', () => ({ NumberFormatGroup: () => null }));
jest.mock('../components/ribbon/StylesGroup', () => ({ StylesGroup: () => null }));
jest.mock('../components/ribbon/CellsGroup', () => ({ CellsGroup: () => null }));
jest.mock('../components/ribbon/EditingGroup', () => ({ EditingGroup: () => null }));
jest.mock('../components/ribbon/insert/InsertTab', () => ({ InsertTab: () => null }));
jest.mock('../components/ribbon/pagelayout/PageLayoutTab', () => ({ PageLayoutTab: () => null }));
jest.mock('../components/ribbon/formulas/FormulasTab', () => ({ FormulasTab: () => null }));
jest.mock('../components/ribbon/review/ReviewTab', () => ({ ReviewTab: () => null }));
jest.mock('../components/ribbon/view/ViewTab', () => ({ ViewTab: () => null }));

describe('ExcelRibbon Data-tab owner boundary (H.82)', () => {
  afterEach(() => cleanup());

  function openDataTab() {
    fireEvent.click(screen.getByRole('button', { name: 'Data' }));
    return screen.getByTestId('dispatch-data-sort');
  }

  test('rejects a Workbook-issued view before command dispatch and announces the rejection', () => {
    const worksheet = new Worksheet('Ribbon owner', 2, 2);
    worksheet.setCellValue({ row: 1, col: 1 }, 'unchanged');
    const workbook = new Workbook();
    workbook.attachDevImportSheet(worksheet);
    const view = workbook.activeSheet!;
    const execute = jest.fn<(command: unknown) => void>();
    const onStructureChange = jest.fn();
    const events: unknown[] = [];
    const subscription = worksheet.on((event) => events.push(event));

    render(React.createElement(ExcelRibbon, {
      workbook: { activeSheet: view },
      commandManager: {
        undo: () => {}, redo: () => {}, canUndo: () => false, canRedo: () => false, execute,
      },
      onStructureChange,
    }));
    fireEvent.click(openDataTab());

    expect(screen.getByRole('alert')).toHaveTextContent(
      'This data operation is unavailable for the current Workbook-owned sheet.',
    );
    expect(execute).not.toHaveBeenCalled();
    expect(onStructureChange).not.toHaveBeenCalled();
    expect(worksheet.getCellValue({ row: 1, col: 1 })).toBe('unchanged');
    expect(events).toEqual([]);
    subscription.dispose();
  });

  test('continues to dispatch a standalone Worksheet data command', () => {
    const worksheet = new Worksheet('Ribbon standalone', 2, 2);
    const execute = jest.fn<(command: unknown) => void>();
    const onStructureChange = jest.fn();

    render(React.createElement(ExcelRibbon, {
      worksheet,
      commandManager: {
        undo: () => {}, redo: () => {}, canUndo: () => false, canRedo: () => false, execute,
      },
      onStructureChange,
    }));
    fireEvent.click(openDataTab());

    expect(execute).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
    expect(onStructureChange).toHaveBeenCalledTimes(1);
  });
});
