import React from 'react';
import { act, fireEvent, render, screen, cleanup } from '@testing-library/react';
import { FileOperations, Workbook, Worksheet } from '@cyber-sheet/core';
import * as xlsx from '@cyber-sheet/io-xlsx';
import { BackstageContainer } from '../components/backstage/BackstageContainer';

jest.mock('@cyber-sheet/io-xlsx', () => {
  const actual = jest.requireActual('@cyber-sheet/io-xlsx');
  return {
    ...actual,
    exportXLSX: jest.fn((...args: Parameters<typeof actual.exportXLSX>) => actual.exportXLSX(...args)),
  };
});

const actualXlsx = jest.requireActual<typeof import('@cyber-sheet/io-xlsx')>('@cyber-sheet/io-xlsx');

describe('ExportPanel first-party XLSX download publication', () => {
  const originalCreateObjectURL = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
  const originalRevokeObjectURL = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
  const originalAnchorClick = HTMLAnchorElement.prototype.click;
  const downloadClicks: Array<{ href: string; download: string }> = [];
  const anchorClick = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloadClicks.push({ href: this.href, download: this.download });
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(xlsx.exportXLSX).mockImplementation(actualXlsx.exportXLSX);
    jest.mocked(xlsx.exportXLSX).mockClear();
    downloadClicks.length = 0;
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: jest.fn(() => `blob:export-panel-${(URL.createObjectURL as jest.Mock).mock.calls.length}`),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: jest.fn(),
    });
    anchorClick.mockClear();
  });

  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
    jest.useRealTimers();
    if (originalCreateObjectURL) {
      Object.defineProperty(URL, 'createObjectURL', originalCreateObjectURL);
    } else {
      Reflect.deleteProperty(URL, 'createObjectURL');
    }
    if (originalRevokeObjectURL) {
      Object.defineProperty(URL, 'revokeObjectURL', originalRevokeObjectURL);
    } else {
      Reflect.deleteProperty(URL, 'revokeObjectURL');
    }
  });

  afterAll(() => {
    anchorClick.mockRestore();
    expect(HTMLAnchorElement.prototype.click).toBe(originalAnchorClick);
  });

  test('one XLSX export publishes one browser download across the panel and ExcelApp callback', async () => {
    const workbook = Workbook.create({
      sheets: [{ name: 'Export source', rows: 2, cols: 2 }],
    });
    const fileOperations = new FileOperations({
      id: 'export-source',
      name: 'Export source.xlsx',
      path: '/Export source.xlsx',
      location: 'local',
      size: 0,
      created: new Date(0),
      lastModified: new Date(0),
      lastModifiedBy: 'test',
      author: 'test',
      sheets: 1,
      tags: [],
      isProtected: false,
      isMarkedFinal: false,
    });
    const parentCompletion = jest.fn();
    let panelDownloadClicksAtParentCallback = -1;
    const view = render(
      <BackstageContainer
        isOpen
        onClose={jest.fn()}
        initialPanel="export"
        fileOperations={fileOperations}
        workbookMetadata={{
          id: 'export-source',
          name: 'Export source.xlsx',
          path: '/Export source.xlsx',
          location: 'local',
          size: 0,
          created: new Date(0),
          lastModified: new Date(0),
          lastModifiedBy: 'test',
          author: 'test',
          sheets: 1,
          tags: [],
          isProtected: false,
          isMarkedFinal: false,
        }}
        workbook={workbook}
        onExportComplete={(blob) => {
          parentCompletion(blob);
          panelDownloadClicksAtParentCallback = anchorClick.mock.calls.length;
          // Mirrors ExcelApp's current completion-only callback. Backstage
          // remains responsible for its format/size log after this callback.
          console.log(`Export complete, size: ${(blob.size / 1024).toFixed(1)} KB`);
        }}
      />,
    );
    const exportSpy = jest.mocked(xlsx.exportXLSX);

    try {
      fireEvent.click(screen.getByRole('radio', { name: /Excel Workbook/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Download' }));
      expect(exportSpy).toHaveBeenCalledTimes(1);
      expect(exportSpy).toHaveBeenCalledWith(workbook);

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        jest.advanceTimersByTime(300);
        await Promise.resolve();
      });

      expect({
        urlCreations: (URL.createObjectURL as jest.Mock).mock.calls.length,
        downloadClicks: anchorClick.mock.calls.length,
        panelDownloadClicksAtParentCallback,
        parentCallbackCalls: parentCompletion.mock.calls.length,
        panelDownloads: downloadClicks,
      }).toEqual({
        urlCreations: 1,
        downloadClicks: 1,
        panelDownloadClicksAtParentCallback: 1,
        parentCallbackCalls: 1,
        panelDownloads: [{ href: 'blob:export-panel-1', download: 'Export source.xlsx' }],
      });
    } finally {
      view.unmount();
    }
  });

  test('CSV reads within owner-backed sheet dimensions and publishes one download', async () => {
    const workbook = Workbook.create({
      sheets: [{ name: 'CSV source', rows: 2, cols: 2 }],
    });
    const ownerView = workbook.activeSheet;
    expect(ownerView).toBeDefined();
    expect(ownerView?.getCellValue({ row: 1, col: 1 })).toBeNull();
    expect(ownerView?.rowCount).toBe(2);
    expect(ownerView?.colCount).toBe(2);

    // Workbook.create intentionally publishes empty sheets in R1. Seed a
    // standalone fixture and use it only as the underlying storage-read test
    // seam; the panel still traverses Workbook.activeSheet/getCellValue.
    const cellFixture = new Worksheet('CSV cell fixture', 2, 2);
    cellFixture.setCellValue({ row: 1, col: 1 }, 'alpha');
    cellFixture.setCellValue({ row: 1, col: 2 }, 'beta');
    cellFixture.setCellValue({ row: 2, col: 1 }, 'gamma');
    cellFixture.setCellValue({ row: 2, col: 2 }, 'delta');
    const fixtureCells = new Map([
      ['1:1', cellFixture.getCell({ row: 1, col: 1 })],
      ['1:2', cellFixture.getCell({ row: 1, col: 2 })],
      ['2:1', cellFixture.getCell({ row: 2, col: 1 })],
      ['2:2', cellFixture.getCell({ row: 2, col: 2 })],
    ]);

    const fileOperations = new FileOperations({
      id: 'csv-source',
      name: 'CSV source.xlsx',
      path: '/CSV source.xlsx',
      location: 'local',
      size: 0,
      created: new Date(0),
      lastModified: new Date(0),
      lastModifiedBy: 'test',
      author: 'test',
      sheets: 1,
      tags: [],
      isProtected: false,
      isMarkedFinal: false,
    });
    const completion = jest.fn();
    const view = render(
      <BackstageContainer
        isOpen
        onClose={jest.fn()}
        initialPanel="export"
        fileOperations={fileOperations}
        workbookMetadata={{
          id: 'csv-source',
          name: 'CSV source.xlsx',
          path: '/CSV source.xlsx',
          location: 'local',
          size: 0,
          created: new Date(0),
          lastModified: new Date(0),
          lastModifiedBy: 'test',
          author: 'test',
          sheets: 1,
          tags: [],
          isProtected: false,
          isMarkedFinal: false,
        }}
        workbook={workbook}
        onExportComplete={completion}
      />,
    );
    const originalGetCell = Worksheet.prototype.getCell;
    const csvReadAddresses: Array<{ row: number; col: number }> = [];
    const getCellSpy = jest.spyOn(Worksheet.prototype, 'getCell').mockImplementation(function (this: Worksheet, address) {
      csvReadAddresses.push(address);
      const cell = originalGetCell.call(this, address);
      return cell ?? fixtureCells.get(`${address.row}:${address.col}`);
    });

    try {
      fireEvent.click(screen.getByRole('radio', { name: /CSV/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Download' }));
      await act(async () => {
        await Promise.resolve();
        await jest.advanceTimersByTimeAsync(300);
      });

      expect(csvReadAddresses).toEqual([
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 2, col: 1 },
        { row: 2, col: 2 },
      ]);
      expect(screen.getByRole('button', { name: '✓ Downloaded' })).toBeInTheDocument();
      expect({
        urlCreations: (URL.createObjectURL as jest.Mock).mock.calls.length,
        downloadClicks: anchorClick.mock.calls.length,
        completionCallbacks: completion.mock.calls.length,
      }).toEqual({
        urlCreations: 1,
        downloadClicks: 1,
        completionCallbacks: 1,
      });
      const csvBlob = (URL.createObjectURL as jest.Mock).mock.calls[0][0] as Blob;
      expect(csvBlob.type).toBe('text/csv;charset=utf-8;');
      const csvText = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsText(csvBlob);
      });
      expect(csvText).toBe('alpha,beta\\ngamma,delta');
    } finally {
      getCellSpy.mockRestore();
      view.unmount();
    }
  });

  test('CSV uses the selected semicolon delimiter and quotes fields containing it', async () => {
    const workbook = Workbook.create({
      sheets: [{ name: 'CSV delimiter source', rows: 1, cols: 2 }],
    });
    const cellFixture = new Worksheet('CSV delimiter fixture', 1, 2);
    cellFixture.setCellValue({ row: 1, col: 1 }, 'alpha;beta');
    cellFixture.setCellValue({ row: 1, col: 2 }, 'gamma');
    const fixtureCells = new Map([
      ['1:1', cellFixture.getCell({ row: 1, col: 1 })],
      ['1:2', cellFixture.getCell({ row: 1, col: 2 })],
    ]);
    const fileOperations = new FileOperations({
      id: 'csv-delimiter-source',
      name: 'CSV delimiter source.xlsx',
      path: '/CSV delimiter source.xlsx',
      location: 'local',
      size: 0,
      created: new Date(0),
      lastModified: new Date(0),
      lastModifiedBy: 'test',
      author: 'test',
      sheets: 1,
      tags: [],
      isProtected: false,
      isMarkedFinal: false,
    });
    const completion = jest.fn();
    const view = render(
      <BackstageContainer
        isOpen
        onClose={jest.fn()}
        initialPanel="export"
        fileOperations={fileOperations}
        workbookMetadata={{
          id: 'csv-delimiter-source',
          name: 'CSV delimiter source.xlsx',
          path: '/CSV delimiter source.xlsx',
          location: 'local',
          size: 0,
          created: new Date(0),
          lastModified: new Date(0),
          lastModifiedBy: 'test',
          author: 'test',
          sheets: 1,
          tags: [],
          isProtected: false,
          isMarkedFinal: false,
        }}
        workbook={workbook}
        onExportComplete={completion}
      />,
    );
    const originalGetCell = Worksheet.prototype.getCell;
    const csvReadAddresses: Array<{ row: number; col: number }> = [];
    const getCellSpy = jest.spyOn(Worksheet.prototype, 'getCell').mockImplementation(function (this: Worksheet, address) {
      csvReadAddresses.push(address);
      const cell = originalGetCell.call(this, address);
      return cell ?? fixtureCells.get(`${address.row}:${address.col}`);
    });

    try {
      fireEvent.click(screen.getByRole('radio', { name: /CSV/ }));
      fireEvent.click(screen.getByRole('combobox'));
      fireEvent.click(screen.getByRole('option', { name: 'Semicolon (;)' }));
      fireEvent.click(screen.getByRole('button', { name: 'Download' }));
      await act(async () => {
        await Promise.resolve();
        await jest.advanceTimersByTimeAsync(300);
      });

      expect(csvReadAddresses).toEqual([{ row: 1, col: 1 }, { row: 1, col: 2 }]);
      expect({
        urlCreations: (URL.createObjectURL as jest.Mock).mock.calls.length,
        downloadClicks: anchorClick.mock.calls.length,
        completionCallbacks: completion.mock.calls.length,
      }).toEqual({
        urlCreations: 1,
        downloadClicks: 1,
        completionCallbacks: 1,
      });
      const csvBlob = (URL.createObjectURL as jest.Mock).mock.calls[0][0] as Blob;
      const csvText = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsText(csvBlob);
      });
      expect(csvText).toBe('"alpha;beta";gamma');
    } finally {
      getCellSpy.mockRestore();
      view.unmount();
    }
  });

  test('CSV uses the selected tab delimiter and escapes tabs and embedded quotes', async () => {
    const workbook = Workbook.create({
      sheets: [{ name: 'CSV tab source', rows: 1, cols: 2 }],
    });
    const cellFixture = new Worksheet('CSV tab fixture', 1, 2);
    cellFixture.setCellValue({ row: 1, col: 1 }, 'alpha\tbeta');
    cellFixture.setCellValue({ row: 1, col: 2 }, 'gamma"delta');
    const fixtureCells = new Map([
      ['1:1', cellFixture.getCell({ row: 1, col: 1 })],
      ['1:2', cellFixture.getCell({ row: 1, col: 2 })],
    ]);
    const fileOperations = new FileOperations({
      id: 'csv-tab-source',
      name: 'CSV tab source.xlsx',
      path: '/CSV tab source.xlsx',
      location: 'local',
      size: 0,
      created: new Date(0),
      lastModified: new Date(0),
      lastModifiedBy: 'test',
      author: 'test',
      sheets: 1,
      tags: [],
      isProtected: false,
      isMarkedFinal: false,
    });
    const completion = jest.fn();
    const view = render(
      <BackstageContainer
        isOpen
        onClose={jest.fn()}
        initialPanel="export"
        fileOperations={fileOperations}
        workbookMetadata={{
          id: 'csv-tab-source',
          name: 'CSV tab source.xlsx',
          path: '/CSV tab source.xlsx',
          location: 'local',
          size: 0,
          created: new Date(0),
          lastModified: new Date(0),
          lastModifiedBy: 'test',
          author: 'test',
          sheets: 1,
          tags: [],
          isProtected: false,
          isMarkedFinal: false,
        }}
        workbook={workbook}
        onExportComplete={completion}
      />,
    );
    const originalGetCell = Worksheet.prototype.getCell;
    const csvReadAddresses: Array<{ row: number; col: number }> = [];
    const getCellSpy = jest.spyOn(Worksheet.prototype, 'getCell').mockImplementation(function (this: Worksheet, address) {
      csvReadAddresses.push(address);
      const cell = originalGetCell.call(this, address);
      return cell ?? fixtureCells.get(`${address.row}:${address.col}`);
    });

    try {
      fireEvent.click(screen.getByRole('radio', { name: /CSV/ }));
      fireEvent.click(screen.getByRole('combobox'));
      fireEvent.click(screen.getByRole('option', { name: 'Tab' }));
      fireEvent.click(screen.getByRole('button', { name: 'Download' }));
      await act(async () => {
        await Promise.resolve();
        await jest.advanceTimersByTimeAsync(300);
      });

      expect(csvReadAddresses).toEqual([{ row: 1, col: 1 }, { row: 1, col: 2 }]);
      expect({
        urlCreations: (URL.createObjectURL as jest.Mock).mock.calls.length,
        downloadClicks: anchorClick.mock.calls.length,
        completionCallbacks: completion.mock.calls.length,
      }).toEqual({
        urlCreations: 1,
        downloadClicks: 1,
        completionCallbacks: 1,
      });
      const csvBlob = (URL.createObjectURL as jest.Mock).mock.calls[0][0] as Blob;
      const csvText = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsText(csvBlob);
      });
      expect(csvText).toBe('"alpha\tbeta"\t"gamma""delta"');
    } finally {
      getCellSpy.mockRestore();
      view.unmount();
    }
  });

  test('characterizes Include column headers for checked and unchecked CSV exports', async () => {
    const exportWithHeaderSetting = async (includeHeaders: boolean) => {
      const workbook = Workbook.create({
        sheets: [{ name: 'CSV header source', rows: 2, cols: 2 }],
      });
      const ownerView = workbook.activeSheet;
      expect(ownerView?.rowCount).toBe(2);
      expect(ownerView?.colCount).toBe(2);

      const cellFixture = new Worksheet('CSV header fixture', 2, 2);
      cellFixture.setCellValue({ row: 1, col: 1 }, 'Header Name');
      cellFixture.setCellValue({ row: 1, col: 2 }, 'Header Notes');
      cellFixture.setCellValue({ row: 2, col: 1 }, 'Value A');
      cellFixture.setCellValue({ row: 2, col: 2 }, 'Value B');
      const fixtureCells = new Map([
        ['1:1', cellFixture.getCell({ row: 1, col: 1 })],
        ['1:2', cellFixture.getCell({ row: 1, col: 2 })],
        ['2:1', cellFixture.getCell({ row: 2, col: 1 })],
        ['2:2', cellFixture.getCell({ row: 2, col: 2 })],
      ]);
      const fileOperations = new FileOperations({
        id: 'csv-header-source',
        name: 'CSV header source.xlsx',
        path: '/CSV header source.xlsx',
        location: 'local',
        size: 0,
        created: new Date(0),
        lastModified: new Date(0),
        lastModifiedBy: 'test',
        author: 'test',
        sheets: 1,
        tags: [],
        isProtected: false,
        isMarkedFinal: false,
      });
      const completion = jest.fn();
      const view = render(
        <BackstageContainer
          isOpen
          onClose={jest.fn()}
          initialPanel="export"
          fileOperations={fileOperations}
          workbookMetadata={{
            id: 'csv-header-source',
            name: 'CSV header source.xlsx',
            path: '/CSV header source.xlsx',
            location: 'local',
            size: 0,
            created: new Date(0),
            lastModified: new Date(0),
            lastModifiedBy: 'test',
            author: 'test',
            sheets: 1,
            tags: [],
            isProtected: false,
            isMarkedFinal: false,
          }}
          workbook={workbook}
          onExportComplete={completion}
        />,
      );
      const originalGetCell = Worksheet.prototype.getCell;
      const csvReadAddresses: Array<{ row: number; col: number }> = [];
      const getCellSpy = jest.spyOn(Worksheet.prototype, 'getCell').mockImplementation(function (this: Worksheet, address) {
        csvReadAddresses.push(address);
        const cell = originalGetCell.call(this, address);
        return cell ?? fixtureCells.get(`${address.row}:${address.col}`);
      });

      (URL.createObjectURL as jest.Mock).mockClear();
      anchorClick.mockClear();
      downloadClicks.length = 0;

      try {
        fireEvent.click(screen.getByRole('radio', { name: /CSV/ }));
        const headersCheckbox = screen.getByRole('checkbox', { name: 'Include column headers' }) as HTMLInputElement;
        expect(headersCheckbox.checked).toBe(true);
        if (!includeHeaders) fireEvent.click(headersCheckbox);
        expect(headersCheckbox.checked).toBe(includeHeaders);

        fireEvent.click(screen.getByRole('button', { name: 'Download' }));
        await act(async () => {
          await Promise.resolve();
          await jest.advanceTimersByTimeAsync(300);
        });

        expect(csvReadAddresses).toEqual([
          { row: 1, col: 1 },
          { row: 1, col: 2 },
          { row: 2, col: 1 },
          { row: 2, col: 2 },
        ]);
        expect({
          urlCreations: (URL.createObjectURL as jest.Mock).mock.calls.length,
          downloadClicks: anchorClick.mock.calls.length,
          completionCallbacks: completion.mock.calls.length,
        }).toEqual({ urlCreations: 1, downloadClicks: 1, completionCallbacks: 1 });

        const csvBlob = (URL.createObjectURL as jest.Mock).mock.calls[0][0] as Blob;
        expect(csvBlob.type).toBe('text/csv;charset=utf-8;');
        const csvText = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(reader.error);
          reader.readAsText(csvBlob);
        });
        return csvText;
      } finally {
        getCellSpy.mockRestore();
        view.unmount();
      }
    };

    const checkedOutput = await exportWithHeaderSetting(true);
    const uncheckedOutput = await exportWithHeaderSetting(false);

    // The UI label and ExportOptions property do not define whether headers
    // are generated labels or the first worksheet row. Characterize current
    // output for both settings without assigning that unresolved meaning.
    expect({ checkedOutput, uncheckedOutput }).toEqual({
      checkedOutput: 'Header Name,Header Notes\\nValue A,Value B',
      uncheckedOutput: 'Header Name,Header Notes\\nValue A,Value B',
    });
  });

  test('characterizes the PDF print-instruction fallback and its options', async () => {
    const workbook = Workbook.create({
      sheets: [{ name: 'PDF source', rows: 2, cols: 2 }],
    });
    const fileOperations = new FileOperations({
      id: 'pdf-source',
      name: 'PDF source.xlsx',
      path: '/PDF source.xlsx',
      location: 'local',
      size: 0,
      created: new Date(0),
      lastModified: new Date(0),
      lastModifiedBy: 'test',
      author: 'test',
      sheets: 1,
      tags: [],
      isProtected: false,
      isMarkedFinal: false,
    });
    const completion = jest.fn();
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => undefined);
    const printSpy = jest.spyOn(window, 'print').mockImplementation(() => undefined);
    const view = render(
      <BackstageContainer
        isOpen
        onClose={jest.fn()}
        initialPanel="export"
        fileOperations={fileOperations}
        workbookMetadata={{
          id: 'pdf-source',
          name: 'PDF source.xlsx',
          path: '/PDF source.xlsx',
          location: 'local',
          size: 0,
          created: new Date(0),
          lastModified: new Date(0),
          lastModifiedBy: 'test',
          author: 'test',
          sheets: 1,
          tags: [],
          isProtected: false,
          isMarkedFinal: false,
        }}
        workbook={workbook}
        onExportComplete={completion}
      />,
    );

    try {
      fireEvent.click(screen.getByRole('radio', { name: /PDF/ }));
      const orientation = screen.getByRole('combobox');
      const fitToPage = screen.getByRole('checkbox', { name: 'Fit to page width' }) as HTMLInputElement;
      expect(orientation).toHaveTextContent('Portrait');
      expect(fitToPage.checked).toBe(true);
      fireEvent.click(orientation.querySelector('button') as HTMLButtonElement);
      fireEvent.click(screen.getByRole('option', { name: 'Landscape' }));
      fireEvent.click(fitToPage);
      expect(orientation).toHaveTextContent('Landscape');
      expect(fitToPage.checked).toBe(false);

      fireEvent.click(screen.getByRole('button', { name: 'Download' }));

      expect(alertSpy).toHaveBeenCalledTimes(1);
      expect(alertSpy).toHaveBeenCalledWith(
        'PDF export: Please use your browser\'s Print function (Ctrl+P) and select "Save as PDF".',
      );
      expect(printSpy).not.toHaveBeenCalled();
      expect({
        urlCreations: (URL.createObjectURL as jest.Mock).mock.calls.length,
        downloadClicks: anchorClick.mock.calls.length,
        completionCallbacks: completion.mock.calls.length,
      }).toEqual({ urlCreations: 0, downloadClicks: 0, completionCallbacks: 0 });
      expect(screen.queryByText('✓ Download complete')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Download' })).toBeEnabled();
      expect(screen.queryByRole('button', { name: 'Export Another Format' })).not.toBeInTheDocument();
    } finally {
      view.unmount();
      alertSpy.mockRestore();
      printSpy.mockRestore();
    }
  });

  test('characterizes the ODS not-yet-implemented branch', async () => {
    const workbook = Workbook.create({
      sheets: [{ name: 'ODS source', rows: 2, cols: 2 }],
    });
    const fileOperations = new FileOperations({
      id: 'ods-source',
      name: 'ODS source.xlsx',
      path: '/ODS source.xlsx',
      location: 'local',
      size: 0,
      created: new Date(0),
      lastModified: new Date(0),
      lastModifiedBy: 'test',
      author: 'test',
      sheets: 1,
      tags: [],
      isProtected: false,
      isMarkedFinal: false,
    });
    const exportWorkbookSpy = jest.spyOn(fileOperations, 'exportWorkbook');
    const completion = jest.fn();
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => undefined);
    const view = render(
      <BackstageContainer
        isOpen
        onClose={jest.fn()}
        initialPanel="export"
        fileOperations={fileOperations}
        workbookMetadata={{
          id: 'ods-source',
          name: 'ODS source.xlsx',
          path: '/ODS source.xlsx',
          location: 'local',
          size: 0,
          created: new Date(0),
          lastModified: new Date(0),
          lastModifiedBy: 'test',
          author: 'test',
          sheets: 1,
          tags: [],
          isProtected: false,
          isMarkedFinal: false,
        }}
        workbook={workbook}
        onExportComplete={completion}
      />,
    );

    try {
      fireEvent.click(screen.getByRole('radio', { name: /OpenDocument/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Download' }));

      expect(exportWorkbookSpy).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
      expect({
        urlCreations: (URL.createObjectURL as jest.Mock).mock.calls.length,
        downloadClicks: anchorClick.mock.calls.length,
        completionCallbacks: completion.mock.calls.length,
      }).toEqual({ urlCreations: 0, downloadClicks: 0, completionCallbacks: 0 });
      expect(screen.queryByText('ODS export coming soon')).not.toBeInTheDocument();
      expect(screen.queryByText('✓ Download complete')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Export Another Format' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Download' })).toBeEnabled();
    } finally {
      view.unmount();
      exportWorkbookSpy.mockRestore();
      alertSpy.mockRestore();
    }
  });

  test('characterizes the TXT FileOperations fallback', async () => {
    const workbook = Workbook.create({
      sheets: [{ name: 'TXT source', rows: 2, cols: 2 }],
    });
    const fileOperations = new FileOperations({
      id: 'txt-source',
      name: 'TXT source.xlsx',
      path: '/TXT source.xlsx',
      location: 'local',
      size: 0,
      created: new Date(0),
      lastModified: new Date(0),
      lastModifiedBy: 'test',
      author: 'test',
      sheets: 1,
      tags: [],
      isProtected: false,
      isMarkedFinal: false,
    });
    const exportWorkbookSpy = jest.spyOn(fileOperations, 'exportWorkbook');
    const completion = jest.fn();
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => undefined);
    const view = render(
      <BackstageContainer
        isOpen
        onClose={jest.fn()}
        initialPanel="export"
        fileOperations={fileOperations}
        workbookMetadata={{
          id: 'txt-source',
          name: 'TXT source.xlsx',
          path: '/TXT source.xlsx',
          location: 'local',
          size: 0,
          created: new Date(0),
          lastModified: new Date(0),
          lastModifiedBy: 'test',
          author: 'test',
          sheets: 1,
          tags: [],
          isProtected: false,
          isMarkedFinal: false,
        }}
        workbook={workbook}
        onExportComplete={completion}
      />,
    );

    try {
      fireEvent.click(screen.getByRole('radio', { name: /Text/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Download' }));
      await act(async () => {
        await Promise.resolve();
      });

      expect(exportWorkbookSpy).toHaveBeenCalledTimes(1);
      expect(exportWorkbookSpy).toHaveBeenCalledWith('txt', {});
      expect(jest.mocked(xlsx.exportXLSX)).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
      expect({
        urlCreations: (URL.createObjectURL as jest.Mock).mock.calls.length,
        downloadClicks: anchorClick.mock.calls.length,
        completionCallbacks: completion.mock.calls.length,
      }).toEqual({ urlCreations: 0, downloadClicks: 0, completionCallbacks: 0 });
      expect(screen.queryByText('Export not yet connected to renderer')).not.toBeInTheDocument();
      expect(screen.queryByText('✓ Download complete')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Export Another Format' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Download' })).toBeEnabled();
    } finally {
      view.unmount();
      exportWorkbookSpy.mockRestore();
      alertSpy.mockRestore();
    }
  });

  test('characterizes the HTML FileOperations fallback', async () => {
    const workbook = Workbook.create({
      sheets: [{ name: 'HTML source', rows: 2, cols: 2 }],
    });
    const fileOperations = new FileOperations({
      id: 'html-source',
      name: 'HTML source.xlsx',
      path: '/HTML source.xlsx',
      location: 'local',
      size: 0,
      created: new Date(0),
      lastModified: new Date(0),
      lastModifiedBy: 'test',
      author: 'test',
      sheets: 1,
      tags: [],
      isProtected: false,
      isMarkedFinal: false,
    });
    const exportWorkbookSpy = jest.spyOn(fileOperations, 'exportWorkbook');
    const completion = jest.fn();
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => undefined);
    const view = render(
      <BackstageContainer
        isOpen
        onClose={jest.fn()}
        initialPanel="export"
        fileOperations={fileOperations}
        workbookMetadata={{
          id: 'html-source',
          name: 'HTML source.xlsx',
          path: '/HTML source.xlsx',
          location: 'local',
          size: 0,
          created: new Date(0),
          lastModified: new Date(0),
          lastModifiedBy: 'test',
          author: 'test',
          sheets: 1,
          tags: [],
          isProtected: false,
          isMarkedFinal: false,
        }}
        workbook={workbook}
        onExportComplete={completion}
      />,
    );

    try {
      fireEvent.click(screen.getByRole('radio', { name: /Web Page/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Download' }));
      await act(async () => {
        await Promise.resolve();
      });

      expect(exportWorkbookSpy).toHaveBeenCalledTimes(1);
      expect(exportWorkbookSpy).toHaveBeenCalledWith('html', {});
      expect(jest.mocked(xlsx.exportXLSX)).not.toHaveBeenCalled();
      expect(alertSpy).not.toHaveBeenCalled();
      expect({
        urlCreations: (URL.createObjectURL as jest.Mock).mock.calls.length,
        downloadClicks: anchorClick.mock.calls.length,
        completionCallbacks: completion.mock.calls.length,
      }).toEqual({ urlCreations: 0, downloadClicks: 0, completionCallbacks: 0 });
      expect(screen.queryByText('Export not yet connected to renderer')).not.toBeInTheDocument();
      expect(screen.queryByText('✓ Download complete')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Export Another Format' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Download' })).toBeEnabled();
    } finally {
      view.unmount();
      exportWorkbookSpy.mockRestore();
      alertSpy.mockRestore();
    }
  });

  test('does not publish an XLSX export after switching away from ExportPanel', async () => {
    const workbook = Workbook.create({
      sheets: [{ name: 'Abandoned export', rows: 2, cols: 2 }],
    });
    const validXlsxBytes = await actualXlsx.exportXLSX(workbook);
    expect(validXlsxBytes.byteLength).toBeGreaterThan(0);
    const fileOperations = new FileOperations({
      id: 'abandoned-export',
      name: 'Abandoned.xlsx',
      path: '/Abandoned.xlsx',
      location: 'local',
      size: 0,
      created: new Date(0),
      lastModified: new Date(0),
      lastModifiedBy: 'test',
      author: 'test',
      sheets: 1,
      tags: [],
      isProtected: false,
      isMarkedFinal: false,
    });
    const completion = jest.fn();
    const view = render(
      <BackstageContainer
        isOpen
        onClose={jest.fn()}
        initialPanel="export"
        fileOperations={fileOperations}
        workbookMetadata={{
          id: 'abandoned-export',
          name: 'Abandoned.xlsx',
          path: '/Abandoned.xlsx',
          location: 'local',
          size: 0,
          created: new Date(0),
          lastModified: new Date(0),
          lastModifiedBy: 'test',
          author: 'test',
          sheets: 1,
          tags: [],
          isProtected: false,
          isMarkedFinal: false,
        }}
        workbook={workbook}
        onExportComplete={completion}
      />,
    );
    let resolveExport!: (bytes: ArrayBuffer) => void;
    const deferredExport = new Promise<ArrayBuffer>((resolve) => {
      resolveExport = resolve;
    });
    const exportSpy = jest.mocked(xlsx.exportXLSX).mockReturnValueOnce(deferredExport);

    try {
      fireEvent.click(screen.getByRole('radio', { name: /Excel Workbook/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Download' }));
      expect(exportSpy).toHaveBeenCalledTimes(1);
      expect(exportSpy).toHaveBeenCalledWith(workbook);
      expect(URL.createObjectURL).not.toHaveBeenCalled();
      expect(anchorClick).not.toHaveBeenCalled();
      expect(completion).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('menuitem', { name: /New/ }));
      expect(screen.queryByRole('heading', { name: 'Export' })).not.toBeInTheDocument();

      await act(async () => {
        resolveExport(validXlsxBytes);
        await deferredExport;
        await jest.advanceTimersByTimeAsync(301);
      });

      expect({
        blobUrlCreations: (URL.createObjectURL as jest.Mock).mock.calls.length,
        downloadClicks: anchorClick.mock.calls.length,
        completionCallbacks: completion.mock.calls.length,
      }).toEqual({
        blobUrlCreations: 0,
        downloadClicks: 0,
        completionCallbacks: 0,
      });
    } finally {
      exportSpy.mockImplementation(actualXlsx.exportXLSX);
      view.unmount();
    }
  });

  test('suppresses a rejected XLSX export after ExportPanel unmounts', async () => {
    const workbook = Workbook.create({
      sheets: [{ name: 'Rejected export', rows: 2, cols: 2 }],
    });
    const fileOperations = new FileOperations({
      id: 'rejected-export',
      name: 'Rejected.xlsx',
      path: '/Rejected.xlsx',
      location: 'local',
      size: 0,
      created: new Date(0),
      lastModified: new Date(0),
      lastModifiedBy: 'test',
      author: 'test',
      sheets: 1,
      tags: [],
      isProtected: false,
      isMarkedFinal: false,
    });
    const completion = jest.fn();
    const view = render(
      <BackstageContainer
        isOpen
        onClose={jest.fn()}
        initialPanel="export"
        fileOperations={fileOperations}
        workbookMetadata={{
          id: 'rejected-export',
          name: 'Rejected.xlsx',
          path: '/Rejected.xlsx',
          location: 'local',
          size: 0,
          created: new Date(0),
          lastModified: new Date(0),
          lastModifiedBy: 'test',
          author: 'test',
          sheets: 1,
          tags: [],
          isProtected: false,
          isMarkedFinal: false,
        }}
        workbook={workbook}
        onExportComplete={completion}
      />,
    );
    let rejectExport!: (error: Error) => void;
    const deferredExport = new Promise<ArrayBuffer>((_resolve, reject) => {
      rejectExport = reject;
    });
    const exportSpy = jest.mocked(xlsx.exportXLSX).mockReturnValueOnce(deferredExport);

    try {
      fireEvent.click(screen.getByRole('radio', { name: /Excel Workbook/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Download' }));
      expect(exportSpy).toHaveBeenCalledWith(workbook);
      expect(URL.createObjectURL).not.toHaveBeenCalled();
      expect(anchorClick).not.toHaveBeenCalled();
      expect(completion).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('menuitem', { name: /New/ }));
      expect(screen.queryByRole('heading', { name: 'Export' })).not.toBeInTheDocument();

      await act(async () => {
        rejectExport(new Error('late XLSX rejection'));
        await deferredExport.catch(() => undefined);
        await Promise.resolve();
        await jest.advanceTimersByTimeAsync(301);
      });

      expect(URL.createObjectURL).not.toHaveBeenCalled();
      expect(anchorClick).not.toHaveBeenCalled();
      expect(completion).not.toHaveBeenCalled();
    } finally {
      exportSpy.mockImplementation(actualXlsx.exportXLSX);
      view.unmount();
    }
  });

  test('cancels the 300 ms publication delay when ExportPanel unmounts', async () => {
    const workbook = Workbook.create({
      sheets: [{ name: 'Delayed export', rows: 2, cols: 2 }],
    });
    const validXlsxBytes = await actualXlsx.exportXLSX(workbook);
    const fileOperations = new FileOperations({
      id: 'delayed-export',
      name: 'Delayed.xlsx',
      path: '/Delayed.xlsx',
      location: 'local',
      size: 0,
      created: new Date(0),
      lastModified: new Date(0),
      lastModifiedBy: 'test',
      author: 'test',
      sheets: 1,
      tags: [],
      isProtected: false,
      isMarkedFinal: false,
    });
    const completion = jest.fn();
    const view = render(
      <BackstageContainer
        isOpen
        onClose={jest.fn()}
        initialPanel="export"
        fileOperations={fileOperations}
        workbookMetadata={{
          id: 'delayed-export',
          name: 'Delayed.xlsx',
          path: '/Delayed.xlsx',
          location: 'local',
          size: 0,
          created: new Date(0),
          lastModified: new Date(0),
          lastModifiedBy: 'test',
          author: 'test',
          sheets: 1,
          tags: [],
          isProtected: false,
          isMarkedFinal: false,
        }}
        workbook={workbook}
        onExportComplete={completion}
      />,
    );
    let resolveExport!: (bytes: ArrayBuffer) => void;
    const deferredExport = new Promise<ArrayBuffer>((resolve) => {
      resolveExport = resolve;
    });
    const exportSpy = jest.mocked(xlsx.exportXLSX).mockReturnValueOnce(deferredExport);
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    try {
      fireEvent.click(screen.getByRole('radio', { name: /Excel Workbook/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Download' }));
      expect(exportSpy).toHaveBeenCalledWith(workbook);

      await act(async () => {
        resolveExport(validXlsxBytes);
        await deferredExport;
        await Promise.resolve();
      });

      const publicationTimerIndex = setTimeoutSpy.mock.calls.findIndex(([, delay]) => delay === 300);
      expect(publicationTimerIndex).toBeGreaterThanOrEqual(0);
      const publicationTimer = setTimeoutSpy.mock.results[publicationTimerIndex].value;
      expect(URL.createObjectURL).not.toHaveBeenCalled();
      expect(anchorClick).not.toHaveBeenCalled();
      expect(completion).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('menuitem', { name: /New/ }));
      expect(clearTimeoutSpy).toHaveBeenCalledWith(publicationTimer);

      await act(async () => {
        await jest.advanceTimersByTimeAsync(301);
      });

      expect(URL.createObjectURL).not.toHaveBeenCalled();
      expect(anchorClick).not.toHaveBeenCalled();
      expect(completion).not.toHaveBeenCalled();
    } finally {
      setTimeoutSpy.mockRestore();
      clearTimeoutSpy.mockRestore();
      exportSpy.mockImplementation(actualXlsx.exportXLSX);
      view.unmount();
    }
  });

  test('does not publish an export after Back is requested during the exit transition', async () => {
    const workbook = Workbook.create({
      sheets: [{ name: 'Closing export', rows: 2, cols: 2 }],
    });
    const validXlsxBytes = await actualXlsx.exportXLSX(workbook);
    const fileOperations = new FileOperations({
      id: 'closing-export',
      name: 'Closing.xlsx',
      path: '/Closing.xlsx',
      location: 'local',
      size: 0,
      created: new Date(0),
      lastModified: new Date(0),
      lastModifiedBy: 'test',
      author: 'test',
      sheets: 1,
      tags: [],
      isProtected: false,
      isMarkedFinal: false,
    });
    const parentClose = jest.fn();
    const completion = jest.fn();
    const view = render(
      <BackstageContainer
        isOpen
        onClose={parentClose}
        initialPanel="export"
        fileOperations={fileOperations}
        workbookMetadata={{
          id: 'closing-export',
          name: 'Closing.xlsx',
          path: '/Closing.xlsx',
          location: 'local',
          size: 0,
          created: new Date(0),
          lastModified: new Date(0),
          lastModifiedBy: 'test',
          author: 'test',
          sheets: 1,
          tags: [],
          isProtected: false,
          isMarkedFinal: false,
        }}
        workbook={workbook}
        onExportComplete={completion}
      />,
    );
    let resolveExport!: (bytes: ArrayBuffer) => void;
    const deferredExport = new Promise<ArrayBuffer>((resolve) => {
      resolveExport = resolve;
    });
    const exportSpy = jest.mocked(xlsx.exportXLSX).mockReturnValueOnce(deferredExport);

    try {
      fireEvent.click(screen.getByRole('radio', { name: /Excel Workbook/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Download' }));
      expect(exportSpy).toHaveBeenCalledWith(workbook);
      expect(URL.createObjectURL).not.toHaveBeenCalled();
      expect(anchorClick).not.toHaveBeenCalled();
      expect(completion).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'Back to workbook' }));
      expect(screen.getByRole('heading', { name: 'Export' })).toBeInTheDocument();

      await act(async () => {
        resolveExport(validXlsxBytes);
        await deferredExport;
        await Promise.resolve();
      });

      await act(async () => {
        await jest.advanceTimersByTimeAsync(199);
      });
      expect(parentClose).not.toHaveBeenCalled();
      expect(screen.getByRole('heading', { name: 'Export' })).toBeInTheDocument();
      expect(URL.createObjectURL).not.toHaveBeenCalled();
      expect(anchorClick).not.toHaveBeenCalled();
      expect(completion).not.toHaveBeenCalled();

      await act(async () => {
        await jest.advanceTimersByTimeAsync(1);
      });
      expect(parentClose).toHaveBeenCalledTimes(1);

      // Keep the controlled BackstageContainer mounted after observing its
      // parent close callback so close-intent behavior is not conflated with
      // the separately covered unmount cleanup.
      await act(async () => {
        await jest.advanceTimersByTimeAsync(100);
      });

      expect({
        blobUrlCreations: (URL.createObjectURL as jest.Mock).mock.calls.length,
        downloadClicks: anchorClick.mock.calls.length,
        exportCompletionCallbacks: completion.mock.calls.length,
        parentCloseCallbacks: parentClose.mock.calls.length,
      }).toEqual({
        blobUrlCreations: 0,
        downloadClicks: 0,
        exportCompletionCallbacks: 0,
        parentCloseCallbacks: 1,
      });
    } finally {
      exportSpy.mockImplementation(actualXlsx.exportXLSX);
      view.unmount();
    }
  });

  test('does not revive an old export or Back timer after reopening Backstage', async () => {
    const workbook = Workbook.create({
      sheets: [{ name: 'Reopened export', rows: 2, cols: 2 }],
    });
    const validXlsxBytes = await actualXlsx.exportXLSX(workbook);
    const fileOperations = new FileOperations({
      id: 'reopened-export',
      name: 'Reopened.xlsx',
      path: '/Reopened.xlsx',
      location: 'local',
      size: 0,
      created: new Date(0),
      lastModified: new Date(0),
      lastModifiedBy: 'test',
      author: 'test',
      sheets: 1,
      tags: [],
      isProtected: false,
      isMarkedFinal: false,
    });
    const parentClose = jest.fn();
    const completion = jest.fn();
    const getProps = (isOpen: boolean) => ({
      isOpen,
      onClose: parentClose,
      initialPanel: 'export' as const,
      fileOperations,
      workbookMetadata: {
        id: 'reopened-export',
        name: 'Reopened.xlsx',
        path: '/Reopened.xlsx',
        location: 'local' as const,
        size: 0,
        created: new Date(0),
        lastModified: new Date(0),
        lastModifiedBy: 'test',
        author: 'test',
        sheets: 1,
        tags: [],
        isProtected: false,
        isMarkedFinal: false,
      },
      workbook,
      onExportComplete: completion,
    });
    const view = render(<BackstageContainer {...getProps(true)} />);
    let resolveOldExport!: (bytes: ArrayBuffer) => void;
    const oldExport = new Promise<ArrayBuffer>((resolve) => {
      resolveOldExport = resolve;
    });
    const exportSpy = jest.mocked(xlsx.exportXLSX).mockReturnValueOnce(oldExport);

    try {
      fireEvent.click(screen.getByRole('radio', { name: /Excel Workbook/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Download' }));
      expect(exportSpy).toHaveBeenCalledTimes(1);
      expect(exportSpy).toHaveBeenCalledWith(workbook);
      const originalPanelHeading = screen.getByRole('heading', { name: 'Export' });

      fireEvent.click(screen.getByRole('button', { name: 'Back to workbook' }));
      view.rerender(<BackstageContainer {...getProps(false)} />);
      expect(screen.getByRole('heading', { name: 'Export' })).toBe(originalPanelHeading);
      view.rerender(<BackstageContainer {...getProps(true)} />);
      expect(screen.getByRole('heading', { name: 'Export' })).toBe(originalPanelHeading);

      await act(async () => {
        resolveOldExport(validXlsxBytes);
        await oldExport;
        await jest.advanceTimersByTimeAsync(301);
      });

      expect(URL.createObjectURL).not.toHaveBeenCalled();
      expect(anchorClick).not.toHaveBeenCalled();
      expect(completion).not.toHaveBeenCalled();

      await act(async () => {
        await jest.advanceTimersByTimeAsync(201);
      });
      expect(parentClose).not.toHaveBeenCalled();
      expect(screen.getByRole('heading', { name: 'Export' })).toBe(originalPanelHeading);

      exportSpy.mockClear();
      fireEvent.click(screen.getByRole('button', { name: 'Download' }));
      expect(exportSpy).toHaveBeenCalledTimes(1);
      expect(exportSpy).toHaveBeenCalledWith(workbook);

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await jest.advanceTimersByTimeAsync(300);
      });

      expect({
        freshExportCalls: exportSpy.mock.calls.length,
        blobUrlCreations: (URL.createObjectURL as jest.Mock).mock.calls.length,
        downloadClicks: anchorClick.mock.calls.length,
        completionCallbacks: completion.mock.calls.length,
        parentCloseCallbacks: parentClose.mock.calls.length,
      }).toEqual({
        freshExportCalls: 1,
        blobUrlCreations: 1,
        downloadClicks: 1,
        completionCallbacks: 1,
        parentCloseCallbacks: 0,
      });
    } finally {
      exportSpy.mockImplementation(actualXlsx.exportXLSX);
      view.unmount();
    }
  });
});
