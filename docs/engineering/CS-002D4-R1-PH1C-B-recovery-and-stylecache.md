# CS-002D4-R1 PH1C Lane B — Snapshot recovery and StyleCache

Tests ran in an isolated Candidate-02 review copy; only lane-local tests were added. Candidate-02 and its archive were not modified.

## Successful rollback and StyleCache findings

The five-case style selection produced **4 passed / 1 failed**. Journal multi-Worksheet rollback retained canonical style identity. Snapshot rollback failed the canonical cell-style pointer/release check: snapshots detach cell styles, and `applySnapshot()` restores cell objects without re-interning those styles. A later style replacement attempted to release a structurally equal but noncanonical reference and emitted `style not found in refCount`. Snapshot row/column style restore does re-intern values, but replacing the old maps does not release their previous cache references, leaving the reference count unbalanced. These are confirmed Snapshot resource-ownership defects.

## Failed Snapshot restoration

The injected primary apply failure followed by a Snapshot restoration failure preserved both error causes, set Workbook health to `recovery-required`, rejected later mutation, and suppressed pending Worksheet events. It did **not** restore state, and no such claim is made. The retained raw Worksheet still reported `isTransactionActive() === true`; rollback cleanup had not cleared the active Worksheet transaction/journal or graph failure injector. Provisional styles staged before the failure were not released. This is a confirmed cleanup defect even though public Workbook mutations remain blocked.

## Verification and disposition

Focused Jest: **5 cases, 4 passed / 1 failed**. Core source typecheck passed with `tsc -p packages/core/tsconfig.json --noEmit`. Jest used the shared dependency tree through a temporary symlink, removed after execution; standard ts-jest warnings appeared. `git diff --check` passed.

Candidate-03 correction is required for canonical cell style restoration, row/column StyleCache balance, and `finally` cleanup of Workbook transaction-owned Worksheet state after restoration failure. Preserve `recovery-required`; do not claim exact state restoration after the secondary failure.

## Candidate-03 correction verification

Candidate-03 implements those bounded corrections. Its focused regression selection, together with the ownership-port regression, passed **2 suites / 23 tests**. The new Snapshot cases exercise canonical cell style identity at subsequent release, row/column style-map restoration and reference balance, and failed-restore cleanup, primary/secondary error retention, event suppression, provisional-style release, and continued `recovery-required` gating. Cleanup is guaranteed by the code path under test; exact Worksheet state restoration after the injected restore failure is not claimed. StyleCache reference accounting is observed through `intern`/`release` spies rather than a public/private refcount getter.

Candidate-03 closes the reproduced B findings within these focused cases. Broader full-Core verification and clean-install reproducibility remain outstanding.
