import React from 'react';
import { act, fireEvent, render, screen, cleanup } from '@testing-library/react';
import { FileOperations, Workbook } from '@cyber-sheet/core';
import * as xlsx from '@cyber-sheet/io-xlsx';
import { BackstageContainer } from '../components/backstage/BackstageContainer';
import { CreateCopyPanel } from '../components/backstage/panels/CreateCopyPanel';

jest.mock('@cyber-sheet/io-xlsx', () => {
  const actual = jest.requireActual('@cyber-sheet/io-xlsx');
  return {
    ...actual,
    exportXLSX: jest.fn((...args: Parameters<typeof actual.exportXLSX>) => actual.exportXLSX(...args)),
  };
});

const actualXlsx = jest.requireActual<typeof import('@cyber-sheet/io-xlsx')>('@cyber-sheet/io-xlsx');

describe('CreateCopyPanel delayed close lifecycle', () => {
  const originalCreateObjectURL = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
  const originalRevokeObjectURL = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
  const originalAnchorClick = HTMLAnchorElement.prototype.click;
  const anchorClick = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(xlsx.exportXLSX).mockImplementation(actualXlsx.exportXLSX);
    jest.mocked(xlsx.exportXLSX).mockClear();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: jest.fn(() => 'blob:create-copy-test'),
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

  function renderCopyPanel(onClose: jest.Mock<void, []>) {
    const workbook = Workbook.create({
      sheets: [{ name: 'Copy source', rows: 2, cols: 2 }],
    });
    const fileOperations = new FileOperations({
      id: 'copy-source',
      name: 'Source.xlsx',
      path: '/Source.xlsx',
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

    const view = render(
      <CreateCopyPanel
        fileOperations={fileOperations}
        currentFileName="Source.xlsx"
        currentLocation="local"
        workbook={workbook}
        onClose={onClose}
      />,
    );
    return { ...view, workbook };
  }

  async function completeCopy() {
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Create Copy' }));
      await Promise.resolve();
    });
    expect(screen.getByRole('button', { name: '✓ Copy Created!' })).toBeInTheDocument();
    expect(anchorClick).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    );
  }

  test('does not invoke stale onClose after successful export and unmount', async () => {
    const onClose = jest.fn<void, []>();
    const { unmount } = renderCopyPanel(onClose);

    await completeCopy();
    expect(onClose).not.toHaveBeenCalled();

    unmount();
    act(() => {
      jest.advanceTimersByTime(1200);
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  test('invokes onClose after 1.2 seconds when the successful panel stays mounted', async () => {
    const onClose = jest.fn<void, []>();
    renderCopyPanel(onClose);

    await completeCopy();
    act(() => {
      jest.advanceTimersByTime(1199);
    });
    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('does not publish an export that completes after the panel unmounts', async () => {
    const onClose = jest.fn<void, []>();
    const { unmount, workbook } = renderCopyPanel(onClose);
    const validXlsxBytes = await actualXlsx.exportXLSX(workbook);
    expect(validXlsxBytes.byteLength).toBeGreaterThan(0);
    let resolveExport!: (bytes: ArrayBuffer) => void;
    const deferredExport = new Promise<ArrayBuffer>((resolve) => {
      resolveExport = resolve;
    });
    const exportSpy = jest.mocked(xlsx.exportXLSX).mockReturnValueOnce(deferredExport);
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      fireEvent.click(screen.getByRole('button', { name: 'Create Copy' }));
      expect(exportSpy).toHaveBeenCalledTimes(1);
      expect(URL.createObjectURL).not.toHaveBeenCalled();
      expect(anchorClick).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();

      unmount();
      await act(async () => {
        resolveExport(validXlsxBytes);
        await deferredExport;
      });
      act(() => {
        jest.advanceTimersByTime(1201);
      });

      expect({
        blobUrlCreations: (URL.createObjectURL as jest.Mock).mock.calls.length,
        downloadClicks: anchorClick.mock.calls.length,
        closeCallbacks: onClose.mock.calls.length,
      }).toEqual({
        blobUrlCreations: 0,
        downloadClicks: 0,
        closeCallbacks: 0,
      });

      const rejectedOnClose = jest.fn<void, []>();
      const rejectedPanel = renderCopyPanel(rejectedOnClose);
      let rejectExport!: (error: Error) => void;
      const rejectedExport = new Promise<ArrayBuffer>((_resolve, reject) => {
        rejectExport = reject;
      });
      exportSpy.mockReturnValueOnce(rejectedExport);

      fireEvent.click(screen.getByRole('button', { name: 'Create Copy' }));
      expect(exportSpy).toHaveBeenCalledTimes(2);
      rejectedPanel.unmount();
      await act(async () => {
        rejectExport(new Error('late export rejection'));
        await rejectedExport.catch(() => undefined);
      });
      act(() => {
        jest.advanceTimersByTime(1201);
      });

      expect(consoleError).not.toHaveBeenCalled();
      expect({
        blobUrlCreations: (URL.createObjectURL as jest.Mock).mock.calls.length,
        downloadClicks: anchorClick.mock.calls.length,
        closeCallbacks: rejectedOnClose.mock.calls.length,
      }).toEqual({
        blobUrlCreations: 0,
        downloadClicks: 0,
        closeCallbacks: 0,
      });
    } finally {
      exportSpy.mockImplementation(actualXlsx.exportXLSX);
      consoleError.mockRestore();
    }
  });

  test('cancels debounced validation animation timer on unmount', () => {
    const onClose = jest.fn<void, []>();
    const { unmount } = renderCopyPanel(onClose);
    const timersBeforeValidation = jest.getTimerCount();

    fireEvent.change(screen.getByLabelText('File name'), {
      target: { value: 'invalid/name' },
    });
    expect(jest.getTimerCount()).toBe(timersBeforeValidation + 1);

    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(screen.getByRole('alert')).toHaveTextContent('The file name contains invalid characters');
    expect(screen.getByRole('alert')).toHaveStyle({ animation: 'shake 300ms ease-in-out' });
    expect(jest.getTimerCount()).toBe(timersBeforeValidation + 1);

    unmount();
    const timersImmediatelyAfterUnmount = jest.getTimerCount();
    act(() => {
      jest.advanceTimersByTime(301);
    });
    const timersAfterAnimationDeadline = jest.getTimerCount();

    expect({
      timersBeforeValidation,
      timersImmediatelyAfterUnmount,
      timersAfterAnimationDeadline,
    }).toEqual({
      timersBeforeValidation,
      timersImmediatelyAfterUnmount: timersBeforeValidation,
      timersAfterAnimationDeadline: timersBeforeValidation,
    });
  });

  test('resets mounted validation animation after 300 ms', () => {
    const onClose = jest.fn<void, []>();
    renderCopyPanel(onClose);

    fireEvent.change(screen.getByLabelText('File name'), {
      target: { value: 'invalid/name' },
    });
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(screen.getByRole('alert')).toHaveStyle({ animation: 'shake 300ms ease-in-out' });

    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(screen.getByRole('alert')).toHaveStyle({ animation: 'none' });
  });

  test('reschedules animation reset for repeated invalid input and submit validation', () => {
    const onClose = jest.fn<void, []>();
    renderCopyPanel(onClose);
    const input = screen.getByLabelText('File name');

    fireEvent.change(input, { target: { value: 'invalid/first' } });
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(screen.getByRole('alert')).toHaveStyle({ animation: 'shake 300ms ease-in-out' });

    act(() => {
      jest.advanceTimersByTime(100);
    });
    fireEvent.change(input, { target: { value: 'invalid/second' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Copy' }));
    expect(screen.getByRole('alert')).toHaveStyle({ animation: 'shake 300ms ease-in-out' });

    // The first reset deadline passes, but the newer animation must remain active.
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(screen.getByRole('alert')).toHaveStyle({ animation: 'shake 300ms ease-in-out' });

    // The repeated debounced input validation replaces the submit reset timer.
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(screen.getByRole('alert')).toHaveStyle({ animation: 'shake 300ms ease-in-out' });

    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(screen.getByRole('alert')).toHaveStyle({ animation: 'none' });
  });

  test('does not publish a deferred copy export after Back is requested', async () => {
    const workbook = Workbook.create({
      sheets: [{ name: 'Backstage copy', rows: 2, cols: 2 }],
    });
    const validXlsxBytes = await actualXlsx.exportXLSX(workbook);
    expect(validXlsxBytes.byteLength).toBeGreaterThan(0);
    const fileOperations = new FileOperations({
      id: 'backstage-copy',
      name: 'Backstage.xlsx',
      path: '/Backstage.xlsx',
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
    const backClose = jest.fn<void, []>();
    const Harness: React.FC = () => {
      const [isOpen, setIsOpen] = React.useState(true);
      return (
        <BackstageContainer
          isOpen={isOpen}
          onClose={() => {
            backClose();
            setIsOpen(false);
          }}
          initialPanel="createCopy"
          fileOperations={fileOperations}
          workbookMetadata={{
            id: 'backstage-copy',
            name: 'Backstage.xlsx',
            path: '/Backstage.xlsx',
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
        />
      );
    };
    const view = render(<Harness />);
    let resolveExport!: (bytes: ArrayBuffer) => void;
    const deferredExport = new Promise<ArrayBuffer>((resolve) => {
      resolveExport = resolve;
    });
    const exportMock = jest.mocked(xlsx.exportXLSX).mockReturnValueOnce(deferredExport);

    try {
      fireEvent.click(screen.getByRole('button', { name: 'Create Copy' }));
      expect(exportMock).toHaveBeenCalledTimes(1);
      expect(URL.createObjectURL).not.toHaveBeenCalled();
      expect(anchorClick).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: 'Back to workbook' }));
      expect(screen.getByRole('heading', { name: 'Create a Copy' })).toBeInTheDocument();
      expect(backClose).not.toHaveBeenCalled();

      await act(async () => {
        resolveExport(validXlsxBytes);
        await deferredExport;
      });
      const publicationsDuringExit = {
        blobUrlCreations: (URL.createObjectURL as jest.Mock).mock.calls.length,
        downloadClicks: anchorClick.mock.calls.length,
      };

      act(() => {
        jest.advanceTimersByTime(199);
      });
      const closeCallsBeforeDeadline = backClose.mock.calls.length;
      act(() => {
        jest.advanceTimersByTime(1);
      });
      const closeCallsAtDeadline = backClose.mock.calls.length;
      expect(screen.queryByRole('button', { name: 'Create Copy' })).not.toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(1200);
      });
      const closeCallsAfterSuccessDelay = backClose.mock.calls.length;

      expect({
        ...publicationsDuringExit,
        closeCallsBeforeDeadline,
        closeCallsAtDeadline,
        closeCallsAfterSuccessDelay,
      }).toEqual({
        blobUrlCreations: 0,
        downloadClicks: 0,
        closeCallsBeforeDeadline: 0,
        closeCallsAtDeadline: 1,
        closeCallsAfterSuccessDelay: 1,
      });
    } finally {
      exportMock.mockImplementation(actualXlsx.exportXLSX);
      view.unmount();
    }
  });

  test('characterizes reopening Backstage before the pending Back close expires', async () => {
    const workbook = Workbook.create({
      sheets: [{ name: 'Reopened copy', rows: 2, cols: 2 }],
    });
    const validXlsxBytes = await actualXlsx.exportXLSX(workbook);
    const fileOperations = new FileOperations({
      id: 'reopened-copy',
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
    const backClose = jest.fn<void, []>();
    let setBackstageOpen!: (isOpen: boolean) => void;
    const Harness: React.FC = () => {
      const [isOpen, setIsOpen] = React.useState(true);
      setBackstageOpen = setIsOpen;
      return (
        <BackstageContainer
          isOpen={isOpen}
          onClose={() => {
            backClose();
            setIsOpen(false);
          }}
          initialPanel="createCopy"
          fileOperations={fileOperations}
          workbookMetadata={{
            id: 'reopened-copy',
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
          }}
          workbook={workbook}
        />
      );
    };
    const view = render(<Harness />);
    const originalNameInput = screen.getByLabelText('File name');
    let resolveExport!: (bytes: ArrayBuffer) => void;
    const deferredExport = new Promise<ArrayBuffer>((resolve) => {
      resolveExport = resolve;
    });
    const exportMock = jest.mocked(xlsx.exportXLSX).mockReturnValueOnce(deferredExport);

    try {
      fireEvent.click(screen.getByRole('button', { name: 'Create Copy' }));
      fireEvent.click(screen.getByRole('button', { name: 'Back to workbook' }));

      // Model a parent close/open request during Backstage's own exit interval.
      act(() => setBackstageOpen(false));
      const panelRemainsDuringClose = screen.getByRole('heading', { name: 'Create a Copy' }) !== null;
      act(() => setBackstageOpen(true));
      const samePanelInstanceAfterReopen = screen.getByLabelText('File name') === originalNameInput;

      await act(async () => {
        resolveExport(validXlsxBytes);
        await deferredExport;
      });
      const publicationsAfterResolve = {
        blobUrlCreations: (URL.createObjectURL as jest.Mock).mock.calls.length,
        downloadClicks: anchorClick.mock.calls.length,
      };

      act(() => {
        jest.advanceTimersByTime(199);
      });
      const closeCallsBeforeOriginalDeadline = backClose.mock.calls.length;
      act(() => {
        jest.advanceTimersByTime(1);
      });
      const closeCallsAtOriginalDeadline = backClose.mock.calls.length;
      const panelVisibleAfterOriginalDeadline = screen.queryByRole('heading', { name: 'Create a Copy' }) !== null;

      act(() => {
        jest.advanceTimersByTime(1200);
      });
      const closeCallsAfterSuccessDelay = backClose.mock.calls.length;

      await completeCopy();
      const newSessionPublications = {
        blobUrlCreations: (URL.createObjectURL as jest.Mock).mock.calls.length,
        downloadClicks: anchorClick.mock.calls.length,
      };

      expect({
        panelRemainsDuringClose,
        samePanelInstanceAfterReopen,
        ...publicationsAfterResolve,
        closeCallsBeforeOriginalDeadline,
        closeCallsAtOriginalDeadline,
        panelVisibleAfterOriginalDeadline,
        closeCallsAfterSuccessDelay,
        newSessionPublications,
      }).toEqual({
        panelRemainsDuringClose: true,
        samePanelInstanceAfterReopen: true,
        blobUrlCreations: 0,
        downloadClicks: 0,
        closeCallsBeforeOriginalDeadline: 0,
        closeCallsAtOriginalDeadline: 0,
        panelVisibleAfterOriginalDeadline: true,
        closeCallsAfterSuccessDelay: 0,
        newSessionPublications: {
          blobUrlCreations: 1,
          downloadClicks: 1,
        },
      });
    } finally {
      exportMock.mockImplementation(actualXlsx.exportXLSX);
      view.unmount();
    }
  });
});
