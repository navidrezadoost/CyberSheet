# CS-002D4-R1 PKG-01I — Revert Plan

## Trigger

Revert only after a reproducible regression is tied to selecting Journal as the production default and the approved five-operation contract. A broad-suite failure with an established unrelated fixture/API cause or a load-sensitive standalone timing assertion is not by itself a trigger.

## Bounded source revert

The default is represented by `DEFAULT_WORKBOOK_MUTATION_STRATEGY` in `packages/core/src/workbookMutationStrategy.ts`. Revert the value from `'journal'` to `'snapshot'`. Keep the internal test override, Snapshot implementation, Journal implementation, and focused regression tests. Do not reset the repository or revert unrelated edits.

This changes the strategy selected for subsequently started transactions under the reverted source. It is not a live recovery operation. Do not replay a failed or partially applied transaction through Snapshot, and do not mark an uncertain Workbook healthy. Existing `recovery-required` state remains terminal under the current contract.

After a permitted source revert, rerun the focused three-suite transaction selection, Core typecheck, relevant benchmark typechecks, marker hygiene, sidecar hashes, and `git diff --check`; record the result in a separate authorized update. Do not merge or release under this plan.
