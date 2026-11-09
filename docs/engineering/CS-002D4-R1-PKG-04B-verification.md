# CS-002D4-R1 PKG-04B — Verification

**Starting revision:** `88b09634f17f3b39d88a88c5428f76b426459a2b`.
**Worktree:** Existing shared dirty changes were preserved; PKG-04 added one test file and three documentation files.
**Full Core suite:** Not run; no baseline recapture.
**Production source:** Unchanged.

## Jest and sidecar handling

The established 11-suite transaction/event selection was rerun serialized with the new standalone comment/bridge test, for 12 suites total. Jest used Node `v26.10.0`, Jest `30.5.2`, TypeScript `6.0.3`, `NODE_OPTIONS=--experimental-vm-modules`, Core Jest configuration, and `--runInBand`. The nine known generated source-sidecar groups were parked and restored using the reversible PKG-03 procedure.

**Final result:** 12 suites passed; 173/173 tests passed. The 11 prior suites contributed 170 tests; the new test contributed 3. No snapshots.

One initial isolated attempt failed to compile only the new test because it treated `EventBus.on()`'s returned unsubscribe function as an object with `.dispose()`. The fixture was corrected to invoke the returned function, then the entire selection passed. This was a test-authoring type error, not a production or existing-suite failure.

The distinct initial PKG-03 unisolated result remains separately recorded in `PKG-03C`: 10 suites / 133 tests failed and 1 suite / 37 passed, with stale generated source-side JavaScript missing current `DependencyGraph` methods. It is not the result of this final isolated run and is not attributed to comment changes. The same established selection passed under sidecar isolation in PKG-03C.

## Other checks

| Check | Result |
| --- | --- |
| Core typecheck (`npm run typecheck --workspace @cyber-sheet/core`) | Passed |
| Focused-test hygiene (`node scripts/check-no-focused-tests.mjs`) | Passed; no focused markers |
| `git diff --check` | Passed |
| Protected Core sidecar manifest | 237/237 entries passed before and after Jest; final check passed |
| Manifest SHA-256 | `a6b89cdc3ccd8bfc8c054e5fafcb4dc84ed9ba1347eb2597a3e7bef938969b6c` |
| Full Core suite / Pivot integration suite | Not run |

The existing ts-jest `globals` deprecation and TS151001 `esModuleInterop` notices were non-failing. No protected sidecar was intentionally modified.

## Classification

The verified behavior is limited to standalone comment storage and the existing lazy bridge mapper. It does not establish Workbook-owned comment deletion, Journal/Snapshot rollback parity for comments, owner-authorized no-op/return semantics, or a completed full Core baseline. The legacy Workbook Pivot integration compilation/accessor blocker remains separate and unresolved; standalone Pivot tests are not recharacterized here.
