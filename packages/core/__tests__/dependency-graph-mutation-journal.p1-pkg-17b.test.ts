import { DependencyGraph, packKey } from '../src/dag/DependencyGraph';

describe('PKG-17B DependencyGraph mutation journal', () => {
  test('explicit rollback restores the exact detached graph state after an injected phase failure', () => {
    const graph = new DependencyGraph();
    const oldPrecedent = packKey(1, 1);
    const newPrecedent = packKey(1, 2);
    const rangeFormula = packKey(2, 2);
    const dependent = packKey(4, 4);
    const oldRange = { startRow: 1, endRow: 2, startCol: 1, endCol: 2 };
    const replacementRange = { startRow: 2, endRow: 3, startCol: 2, endCol: 3 };

    graph.registerFormulaNode(oldPrecedent);
    graph.registerFormulaNode(rangeFormula);
    graph.registerFormulaNode(dependent);
    graph.setDependencies(dependent, [oldPrecedent], [oldRange]);
    graph.setVolatile(dependent, true);
    graph.markDirty([oldPrecedent]);
    const before = graph.getStateForTesting();

    const journal = graph.beginMutationJournal();
    const injected = new Error('injected after range watcher registration');
    graph.setMutationFailureInjector((phase) => {
      if (phase === 'after-range-watcher-registration') throw injected;
    });
    graph.registerFormulaNode(newPrecedent);
    graph.setVolatile(dependent, false);
    graph.markDirty([newPrecedent]);

    let thrown: unknown;
    try {
      graph.setDependencies(dependent, [newPrecedent], [replacementRange]);
    } catch (error) {
      thrown = error;
    } finally {
      graph.setMutationFailureInjector(undefined);
    }

    expect(thrown).toBe(injected);
    expect(graph.getStateForTesting()).not.toEqual(before);
    journal.rollback();

    expect(graph.getStateForTesting()).toEqual(before);
    expect(graph.getMutationJournalStatusForTesting()).toEqual({
      active: false,
      structureKeys: [],
      dirtyKeys: [],
    });
  });

  test('commit preserves graph mutations and closes the active journal', () => {
    const graph = new DependencyGraph();
    const precedent = packKey(1, 1);
    const dependent = packKey(1, 2);
    const journal = graph.beginMutationJournal();

    graph.registerFormulaNode(dependent);
    graph.setDependencies(dependent, [precedent]);
    graph.markDirty([precedent]);
    journal.commit();

    const state = graph.getStateForTesting();
    expect(state.predecessors).toEqual([[dependent, [precedent]]]);
    expect(state.successors).toEqual([[precedent, [dependent]]]);
    expect(state.dirty).toEqual([precedent, dependent]);
    expect(graph.getMutationJournalStatusForTesting()).toEqual({
      active: false,
      structureKeys: [],
      dirtyKeys: [],
    });
  });
});
