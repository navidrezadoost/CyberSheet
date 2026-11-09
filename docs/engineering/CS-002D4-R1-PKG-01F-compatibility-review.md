# CS-002D4-R1 PKG-01F — Compatibility Review

## Observable behavior

| Case | PKG-01E behavior | PKG-01F behavior |
| --- | --- | --- |
| Successful standalone formula write | Formula/graph registration completes, callback runs, then event is buffered and flushed | Same order and successful behavior |
| Standalone dependency-registration failure | Original error propagates after operation-local cell/graph rollback | Unchanged |
| Standalone Formula Engine callback failure after registration | Original callback error propagates although formula/graph are retained; the standalone event batch suppresses its successful event | `WorksheetFormulaPostCommitError` propagates with `committed=true`, address, phase, and `originalError`; state remains committed and consistent; no success event is flushed for that call |
| Retry after callback failure | No explicit typed commit acknowledgment; successful retry is possible | Successful retry emits one event; the failed call did not enqueue an event, so it is not duplicated |
| Reentrant callback | Local graph journal commits before callback | Preserved; regression still passes |
| Workbook callback failure | Workbook transaction owner handles rollback | Original callback error continues to propagate; exact rollback is tested under both Snapshot and Journal |
| Dependency extraction exception | Warn and continue | Unchanged; parser/grammar behavior is outside F |

## API surface

F adds `WorksheetFormulaPostCommitError` and the `WorksheetFormulaPostCommitPhase` type to the `@cyber-sheet/core` barrel. This is an observable additive API, permitting callers to distinguish a committed formula update followed by a later failure from a failed registration that was rolled back. The error retains the original thrown value rather than replacing it. The thrown error type for the affected standalone post-commit failure case changes; code that compared the thrown object by identity or assumed it was the raw callback error must inspect `originalError` instead. The Workbook-owned path retains raw callback error propagation.

No successful formula API return type, event shape, normal event ordering, parser behavior, Workbook mutation authority, or other Worksheet mutation family changed. Event callbacks still run after registration commit, preserving reentrancy. Mutation events are not published before registration commit.

## First-party caller review

The `IFormulaEngine` contract in `packages/core/src/types.ts` makes `onCellChanged` optional and describes it as a notification. The reproducible search was:

```sh
rg -n --glob '!**/__tests__/**' --glob '!**/*.test.*' --glob '!**/dist/**' \
  'onCellChanged\s*\??\s*[:=(]|onCellChanged\s*\?' \
  packages/core packages/react packages/renderer-canvas packages/io-xlsx examples
```

It exited 0 and found the interface, four Worksheet invocation sites, and `PivotInvalidationEngine`'s separate private event handler. It found no first-party `IFormulaEngine.onCellChanged` implementation in that scope. The search is textual and does not prove the absence of dynamically supplied callbacks in downstream applications.

Accordingly, the callback's transaction role is not established for a first-party engine. External/custom implementations may have side effects; F does not claim those effects are reversible. Standalone callers now get an explicit committed-state diagnostic. Workbook transactions retain their existing rollback owner and behavior.

## Compatibility risks and untested boundaries

- Standalone callers may observe the new error class instead of the original callback error; the original is available as `originalError`.
- Any external side effects performed by a callback before it throws remain outside Worksheet rollback.
- Recalculation notification and event-buffer failures use the same post-commit diagnostic phases, but the focused new regression injects the Formula Engine callback failure specifically.
- Parser extraction remains warning-only and can leave dependency coverage incomplete for unsupported syntax.
- Tests exercise the repository's TypeScript/Jest environment. They do not establish behavior for every downstream custom engine, JavaScript runtime, or external consumer's error-handling assumptions.

No test-only public API was added. Existing internal test hooks remain module-level instrumentation and are not exported through the Core barrel.
