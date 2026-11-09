import {
  clearWorkbookMutationStrategyOverrideForTesting,
  setWorkbookMutationStrategyOverrideForTesting,
} from './workbookMutationStrategy';

/** @internal Failure injection for Workbook mutation transaction tests. */
export interface WorkbookMutationTestHooks {
  strategy?: 'snapshot' | 'journal';
  beforeApplyOperation?: (index: number) => void;
  beforeBatchSettlement?: (index: number) => void;
  beforeRollback?: () => void;
  afterSnapshotCapture?: (durationMs: number) => void;
  afterJournalCreation?: (durationMs: number) => void;
  afterApplyOperation?: (index: number, durationMs: number) => void;
  afterCommitCleanup?: (durationMs: number) => void;
  afterRollback?: (durationMs: number) => void;
  worksheetFailure?: (phase: WorkbookMutationFailurePhase) => void;
}

export type WorkbookMutationFailurePhase =
  | 'after-cell-record'
  | 'during-dependency-update'
  | 'after-predecessor-removal'
  | 'after-dependency-registration'
  | 'after-range-watcher-registration'
  | 'after-formula-node-registration'
  | 'after-dirty-propagation'
  | 'after-volatile-state-change'
  | 'after-style-allocation'
  | 'before-row-height-map-write'
  | 'after-row-height-map-write'
  | 'before-column-width-map-write'
  | 'after-column-width-map-write'
  | 'during-row-height-restore'
  | 'during-column-width-restore'
  | 'after-row-height-restore-before-discard';

const hooksByWorkbook = new WeakMap<object, WorkbookMutationTestHooks>();

/** @internal This module is intentionally not exported from the public package barrel. */
export function setWorkbookMutationTestHooks(
  workbook: object,
  hooks: WorkbookMutationTestHooks,
): { dispose(): void } {
  const owner = {};
  hooksByWorkbook.set(workbook, hooks);
  setWorkbookMutationStrategyOverrideForTesting(workbook, owner, () =>
    hooksByWorkbook.get(workbook) === hooks ? hooks.strategy : undefined,
  );
  return {
    dispose: () => {
      if (hooksByWorkbook.get(workbook) === hooks) {
        hooksByWorkbook.delete(workbook);
        clearWorkbookMutationStrategyOverrideForTesting(workbook, owner);
      }
    },
  };
}

export function runBeforeWorkbookMutationTestApply(workbook: object, index: number): void {
  hooksByWorkbook.get(workbook)?.beforeApplyOperation?.(index);
}

export function runBeforeWorkbookMutationTestRollback(workbook: object): void {
  hooksByWorkbook.get(workbook)?.beforeRollback?.();
}

/** @internal Inject a failure between Worksheet batch settlements in transaction tests. */
export function runBeforeWorkbookMutationBatchSettlement(workbook: object, index: number): void {
  hooksByWorkbook.get(workbook)?.beforeBatchSettlement?.(index);
}

/** @internal Inject failures inside Worksheet write paths for equivalence tests. */
export function runWorkbookMutationTestWorksheetFailure(
  workbook: object,
  phase: WorkbookMutationFailurePhase,
): void {
  hooksByWorkbook.get(workbook)?.worksheetFailure?.(phase);
}

/** @internal Inject a failure after test-selected style allocation. */
export function runWorkbookMutationTestFailure(workbook: object, phase: WorkbookMutationFailurePhase): void {
  hooksByWorkbook.get(workbook)?.worksheetFailure?.(phase);
}

/** @internal Check once per batch whether phase timing should be collected. */
export function hasWorkbookMutationTestTimingHooks(workbook: object): boolean {
  const hooks = hooksByWorkbook.get(workbook);
  return !!(hooks?.afterSnapshotCapture || hooks?.afterJournalCreation || hooks?.afterApplyOperation || hooks?.afterCommitCleanup || hooks?.afterRollback);
}

/** @internal Observe phase timings without adding a public Workbook API. */
export function reportWorkbookMutationTestPhase(
  workbook: object,
  phase: 'snapshot' | 'journal' | 'commit' | 'rollback',
  durationMs: number,
): void {
  const hooks = hooksByWorkbook.get(workbook);
  try {
    if (phase === 'snapshot') hooks?.afterSnapshotCapture?.(durationMs);
    else if (phase === 'journal') hooks?.afterJournalCreation?.(durationMs);
    else if (phase === 'commit') hooks?.afterCommitCleanup?.(durationMs);
    else hooks?.afterRollback?.(durationMs);
  } catch {
    // Diagnostics must not change transaction outcome.
  }
}

/** @internal Observe application timing without adding a public Workbook API. */
export function reportWorkbookMutationTestApply(
  workbook: object,
  index: number,
  durationMs: number,
): void {
  try {
    hooksByWorkbook.get(workbook)?.afterApplyOperation?.(index, durationMs);
  } catch {
    // Diagnostics must not change transaction outcome.
  }
}
