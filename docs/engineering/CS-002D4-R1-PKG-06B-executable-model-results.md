# CS-002D4-R1 PKG-06B — Executable model results

**Model:** `packages/core/__tests__/workbook-comment-delete-rollback-model.p1-pkg-06b.test.ts`
**Evidence type:** Standalone test-only simulation. It intentionally does not instantiate a Workbook, use `mutationPort`, invoke `Workbook.transact`, or register production mutation hooks.
**Production changes:** None in Lane B.

## Model construction

The fixture implements the observed replacement-only deletion shape: compute the root/reply closure, filter into a fresh array, assign `undefined` after the last comment is removed, and treat unchanged length as a no-op. Its local transaction harness retains one first-effective-write before-image per cell, buffers event records until successful completion, restores captured references on failure, and classifies a failed restore as recovery-required. Fault callbacks identify the point before replacement, after replacement, and during restoration.

An absent-cell helper exercises the before-image restore primitive after a synthetic allocation. Current delete behavior does not allocate an absent cell, so this case validates the generic model distinction only and is not evidence of a production delete path.

## Covered outcomes

- First-write capture survives multiple effective deletes to one cell; repeated deletion after an ID is gone is a no-op.
- A duplicate ID and its transitive reply descendants are removed while survivors retain their order.
- Absent cells and present cells with undefined comments stay distinct on no-op; neither produces a captured write or event.
- A modeled absent-state rollback removes a transient cell; a paired present-state case preserves the exact original cell identity and restores an absent `comments` property to `undefined` after a synthetic field allocation.
- Failures before and after replacement restore the applicable original array identity; the post-replacement case also checks exact comment-node identity, nested shared alias, cycle, unrelated value/style state, and event suppression.
- A restoration failure retains the operation and restore errors, suppresses queued events, and blocks subsequent model transactions pending recovery.
- Successful work publishes buffered events only after the local transaction body completes.

## Execution status

The file defines **8 Jest test cases** after expanding the two-row no-op parameterization. Lane B did not start Jest. The coordinator's integrated serialized selection later passed **15 suites / 201 tests**, including this model and the Lane A metadata probe. The initial integrated attempt had a test-only TypeScript compile error from the model type name colliding with the DOM `Comment` global and an insufficiently narrowed caught value; both were corrected before the passing run. The initial attempt is retained in `CS-002D4-R1-PKG-06C-jest-attempts.txt`; the final run is retained in `CS-002D4-R1-PKG-06C-jest-output.txt`.

Core typecheck, focused-test hygiene, `git diff --check`, and protected-sidecar verification also passed at the integrated gate. These results execute the model as code, but do not convert it into Workbook Journal/Snapshot evidence.

## Simulation versus integration evidence

The model demonstrates that a retained-reference rollback algorithm can express the PKG-05 Policy C invariants at the selected cuts. It does **not** demonstrate that current Workbook Journal or Snapshot code captures the comment array, restores it correctly, suppresses events for comment deletion, or enters the expected recovery state. Those assertions belong to a separately authorized implementation package, where both strategy paths need independent tests. The seven existing Workbook transaction operations are neither changed nor extended here.

Overall CS-002D4-R1 acceptance remains **WITHHELD**.
