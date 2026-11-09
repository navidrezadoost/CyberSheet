# CS-002D4-R1 PKG-21 PH1B — Candidate-02 successor record

Candidate-02 was created only after independent PH1B review found correction-required issues in Candidate-01. Candidate-01 remains immutable at SHA-256 `131c85f120845a6e7e6ad39f94f269d35db49ce5f958bea4c16771b054078f79`.

## Identity and package

- Base revision: `88b09634f17f3b39d88a88c5428f76b426459a2b`.
- Worktree: `/home/navidrezadoost/Documents/Engineering-artifacts/CS-002D4-R1-PKG-21-candidate-v2`.
- Archive: `/home/navidrezadoost/Documents/Engineering-artifacts/CS-002D4-R1-PKG-21-CANDIDATE-02.tar.gz`.
- Archive SHA-256: `5f9370222130e721b9a4da015d72c165d36ec471a1d43fd0670502f9d3666839`.
- Source overlay: 11 files; each payload entry in the archive SHA-256 manifest passed after packaging.

## Corrections and evidence

1. Adoption no longer calls through a mutable instance property. It uses the captured locked prototype method and rejects an own-property shadow of the adoption method or guarded mutators before assigning Workbook capability. Two adversarial regression cases were added.
2. Snapshot transactions retain the pre-transaction formula dirty-node set and restore that exact membership after a successful Snapshot rollback. The focused formula/dependency case passed 1/1.
3. Ordinary EventBus dispatch retains live Set iteration, propagates listener errors for standalone buses, and stops when disposal clears active listener sets. `once` is consumed before nested callbacks. Workbook-owned committed event observation isolation is kept behind a non-root-exported internal marker. Focused tests cover these behaviors.

Reported Candidate-02 focused verification: 1 suite, 19/19 passed, with ts-jest diagnostics disabled because the candidate worktree had no installed dependencies. Core typecheck and `git diff --check` passed. Candidate-02's clean dependency installation, package build, consumer runtime import, full Core run, Snapshot restoration-failure cleanup, StyleCache parity, and full FIFO/cancellation/context behavior remain unverified. This is a successor improvement, not a qualified or integration-ready artifact.

D0-06 remains pending an attributable owner decision. Candidate-02 does not migrate the C1 assertion or alter the proposed public contract. Shared-worktree integration, merge, and release remain unauthorized.
