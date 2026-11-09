# CS-002D4-R1 PH1C Lane C — Queue, cancellation, and context lifecycle

Tests ran in an isolated Candidate-02 review copy. The lane added only `packages/core/__tests__/workbook-queue-lifecycle.p1-ph1c-c.test.ts`; Candidate-02, its archive, and shared source were unchanged.

## Characterization

Eight lane-local cases passed. They cover sequential FIFO order, waiting for async transaction callback completion before later apply, disposal cancellation of queued and active work, captured-context revocation, no writes after cancellation, independent Workbooks, committed listener/disposal behavior, and error/health gating.

The self-await limitation was characterized without a hanging Jest test: a port write queued from within its active transaction callback remained pending until the callback returned, then resolved. The documented rule not to await a separately queued port Promise from its own transaction callback remains necessary. No new defect was found in the tested ordinary queue lifecycle; no contract expansion is inferred.

## Legacy queue test reachability

The historical `workbook-mutation-queue.p1-pkg-01.test.ts` is absent in the Candidate-02 base. The four standalone formula hook symbols referenced by earlier planning records are absent from `workbookMutationTestHooks.ts`; `WorksheetFormulaPostCommitError` is also absent from Candidate-02 although earlier PKG-01F/H records describe it as accepted standalone behavior. The unchanged historical test cannot be compiled or supported by the current internal infrastructure. Do not add public root exports to satisfy it. Restoring authorized internal hooks/error behavior would require a separately bounded correction and compatibility review.

## Verification caveat

Focused Jest: **1 suite, 8/8 passed** using the existing shared Jest/dependency tree and disabling ts-jest diagnostics because the isolated copy had no dependency install. The new test file was typechecked separately with strict flags and shared type roots; Core source typecheck passed. This is reused-dependency evidence, not clean installation. `git diff --check` passed. No full queue suite or full Core suite ran.
