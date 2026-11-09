/** @internal Production default for supported Workbook mutation transactions. */
export const DEFAULT_WORKBOOK_MUTATION_STRATEGY: 'snapshot' | 'journal' = 'journal';

type StrategyOverride = {
  owner: object;
  resolve: () => 'snapshot' | 'journal' | undefined;
};

const strategyOverrides = new WeakMap<object, StrategyOverride>();

/** @internal Resolve once per transaction; tests may register an isolated override. */
export function getWorkbookMutationStrategy(workbook: object): 'snapshot' | 'journal' {
  return strategyOverrides.get(workbook)?.resolve() ?? DEFAULT_WORKBOOK_MUTATION_STRATEGY;
}

/** @internal Only the private test-hook module installs an override resolver. */
export function setWorkbookMutationStrategyOverrideForTesting(
  workbook: object,
  owner: object,
  resolve: () => 'snapshot' | 'journal' | undefined,
): void {
  strategyOverrides.set(workbook, { owner, resolve });
}

/** @internal Clear an override only when its registering hook still owns it. */
export function clearWorkbookMutationStrategyOverrideForTesting(
  workbook: object,
  owner: object,
): void {
  if (strategyOverrides.get(workbook)?.owner === owner) strategyOverrides.delete(workbook);
}
