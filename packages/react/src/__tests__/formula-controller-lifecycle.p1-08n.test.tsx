import React from 'react';
import { describe, expect, jest, test } from '@jest/globals';
import { act, render, waitFor } from '@testing-library/react';
import { Worksheet, type Address, type ExtendedCellValue } from '@cyber-sheet/core';
import { useFormulaController } from '../useFormulaController';

type Snapshot = { formula: string | undefined; value: ExtendedCellValue; hasFormula: boolean };

function Probe({ worksheet, selectedCell, observe }: {
  worksheet: Worksheet;
  selectedCell: Address | null;
  observe: (snapshot: Snapshot) => void;
}) {
  const state = useFormulaController({ worksheet, selectedCell });
  observe({ formula: state.currentFormula, value: state.currentValue, hasFormula: state.hasFormula });
  return null;
}

describe('P1-08N useFormulaController supported lifecycle', () => {
  test('tracks selected formula and ordinary values across cell events and disposes its subscription', async () => {
    const worksheet = new Worksheet('Standalone', 2, 2);
    worksheet.setCellFormula({ row: 1, col: 1 }, '=1+1', 2);
    worksheet.setCellValue({ row: 1, col: 2 }, 'ordinary');
    const snapshots: Snapshot[] = [];
    const onSpy = jest.spyOn(worksheet, 'on');
    const view = (selectedCell: Address | null) => (
      <Probe worksheet={worksheet} selectedCell={selectedCell} observe={(snapshot) => snapshots.push(snapshot)} />
    );
    const mounted = render(view({ row: 1, col: 1 }));
    try {
      await waitFor(() => expect(snapshots[snapshots.length - 1]).toEqual({ formula: '=1+1', value: 2, hasFormula: true }));

      act(() => worksheet.setCellFormula({ row: 1, col: 1 }, '=1+2', 3));
      await waitFor(() => expect(snapshots[snapshots.length - 1]).toEqual({ formula: '=1+2', value: 3, hasFormula: true }));

      mounted.rerender(view({ row: 1, col: 2 }));
      await waitFor(() => expect(snapshots[snapshots.length - 1]).toEqual({ formula: undefined, value: 'ordinary', hasFormula: false }));
      act(() => worksheet.setCellValue({ row: 1, col: 2 }, 'ordinary-updated'));
      await waitFor(() => expect(snapshots[snapshots.length - 1]).toEqual({ formula: undefined, value: 'ordinary-updated', hasFormula: false }));

      const subscriptions = onSpy.mock.results.map((result) => result.value as { dispose: () => void });
      expect(subscriptions.length).toBeGreaterThan(0);
      const disposeSpies = subscriptions.map((subscription) => jest.spyOn(subscription, 'dispose'));
      mounted.unmount();
      expect(disposeSpies.some((dispose) => dispose.mock.calls.length > 0)).toBe(true);
    } finally {
      if (mounted.container.isConnected) mounted.unmount();
      onSpy.mockRestore();
    }
  });

});
