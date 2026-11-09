import { Workbook, type WorkbookSheetView, Worksheet } from '../src';
import { setWorkbookMutationTestHooks } from '../src/workbookMutationTestHooks';

type Strategy = 'journal' | 'snapshot';

const mergeRanges = [
  { start: { row: 1, col: 1 }, end: { row: 2, col: 2 } },
  { start: { row: 1, col: 3 }, end: { row: 2, col: 4 } },
  { start: { row: 1, col: 5 }, end: { row: 2, col: 6 } },
  { start: { row: 1, col: 7 }, end: { row: 2, col: 8 } },
];

function fixture(strategy: Strategy) {
  const workbook = Workbook.create({ sheets: [{ name: 'Base', rows: 10, cols: 12 }] });
  const raw = workbook.createDevImportWorksheet('Merged', 10, 12) as Worksheet;
  for (const range of mergeRanges) raw.mergeCells(range);
  workbook.attachDevImportSheet(raw);
  const view = workbook.getSheet('Merged') as WorkbookSheetView;
  const registration = setWorkbookMutationTestHooks(workbook, { strategy });
  return { workbook, raw, view, registration };
}

describe('PKG-13A merged-member formula origin characterization', () => {
  test('A1 relative, absolute, and mixed references retain literal targets at anchors and merged members', async () => {
    const { workbook, raw, view, registration } = fixture('journal');
    const source = { row: 8, col: 10 }; // J8, outside all merged ranges
    const events: Array<{ address: { row: number; col: number }; formula?: string }> = [];
    view.on((event) => {
      if (event.type === 'cell-changed' && event.origin !== 'formula-result') {
        events.push({ address: event.address, formula: event.cell.formula });
      }
    });

    const writes = [
      { address: { row: 1, col: 1 }, formula: '=J8+1', expected: { row: 1, col: 1 } },
      { address: { row: 2, col: 4 }, formula: '=J8+1', expected: { row: 1, col: 3 } },
      { address: { row: 2, col: 6 }, formula: '=$J8+1', expected: { row: 1, col: 5 } },
      { address: { row: 2, col: 8 }, formula: '=J$8+1', expected: { row: 1, col: 7 } },
    ];

    try {
      await workbook.transact((tx) => {
        for (const [index, write] of writes.entries()) {
          tx.setCellFormula(view, write.address, write.formula, index + 1);
        }
      });

      for (const write of writes) {
        expect(raw.getCell(write.expected)?.formula).toBe(write.formula);
        expect(raw.getPrecedents(write.expected)).toEqual([source]);
        expect(raw.getPrecedents(write.address)).toEqual(
          write.address.row === write.expected.row && write.address.col === write.expected.col ? [source] : [],
        );
      }
      expect(raw.getDependents(source)).toEqual(writes.map((write) => write.expected));
      expect(events).toEqual(writes.map((write) => ({ address: write.address, formula: write.formula })));
      expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
    } finally {
      registration.dispose();
    }
  });

  test.each(['journal', 'snapshot'] as const)(
    '%s restores graph and sparse cell state after a failed mixed transaction across merged ranges',
    async (strategy) => {
      const { workbook, raw, view, registration } = fixture(strategy);
      const before = raw.extractSnapshot();
      const events: unknown[] = [];
      view.on((event) => events.push(event));
      const injected = new Error(`PKG-13A ${strategy} merged formula origin rollback`);
      let writes = 0;
      registration.dispose();
      const failureRegistration = setWorkbookMutationTestHooks(workbook, {
        strategy,
        worksheetFailure: (phase) => {
          if (phase === 'after-cell-record' && ++writes === 3) throw injected;
        },
      });

      try {
        await expect(workbook.transact((tx) => {
          tx.setCellFormula(view, { row: 2, col: 2 }, '=J8+1', 11);
          tx.setCellFormula(view, { row: 2, col: 4 }, '=$J$8+1', 12);
          tx.setCellValue(view, { row: 2, col: 6 }, 'must roll back');
        })).rejects.toBe(injected);

        expect(raw.extractSnapshot()).toEqual(before);
        for (const anchor of [
          { row: 1, col: 1 },
          { row: 1, col: 3 },
          { row: 1, col: 5 },
        ]) {
          expect(raw.getCell(anchor)).toBeUndefined();
          expect(raw.getPrecedents(anchor)).toEqual([]);
        }
        expect(raw.getDependents({ row: 8, col: 10 })).toEqual([]);
        expect(events).toEqual([]);
        expect(workbook.getMutationHealth()).toEqual({ status: 'healthy' });
      } finally {
        failureRegistration.dispose();
      }
    },
  );
});
