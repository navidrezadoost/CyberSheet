# CS-002D4-R1 PKG-21 PH1B — Integrated qualification

**Outcome: CANDIDATE IMPROVED — TECHNICAL RESIDUALS REMAIN (Candidate-02)**
**Candidate-01:** blocked; not qualified.
**Contract gate:** D0-06 remains pending.
**Overall CS-002D4-R1 acceptance:** WITHHELD.

## Candidate identity

Candidate-01 is the prospective archive with base revision `88b09634f17f3b39d88a88c5428f76b426459a2b` and archive SHA-256 `131c85f120845a6e7e6ad39f94f269d35db49ce5f958bea4c16771b054078f79`. Its 50 payload hashes passed after extraction. Candidate-01 was not modified. The shared repository HEAD is the same base revision; it was already dirty and remains so. PH1B changed only its identity report and added the six PH1B reports; candidate source and tests in the shared worktree were not edited.

## Integrated verification summary

| Check | Result |
| --- | --- |
| Fresh archive extraction and 50 payload hashes | Passed |
| Candidate-focused suite | 1 suite, 13/13 passed |
| Fresh-reproduction Core typecheck | Passed |
| Original unfiltered compatibility selection | 3 suites passed, 1 failed; 36 passed, 1 failed |
| Failure classification | Unchanged C1 synchronous-throw assertion against Promise-based port; legacy EventBus fixture compilation remains a separate zero-test blocker |
| Fresh `npm ci --ignore-scripts` | Timed out on registry/proxy; dependency isolation not established |
| `npm ls --depth=0` after interrupted install | Failed on incomplete tree |
| Core package build | Failed to start: `tsup` unavailable (exit 127); no package output |
| Declaration emit and consumer typecheck | Earlier candidate environment passed; not reproduced under clean dependencies |
| External consumer runtime import | Not run; build output unavailable |
| Protected sidecars | 237/237 passed; manifest hash unchanged |
| Full Core suite | Not run |

## Blocking evidence

Independent review found three correction requirements: (1) pre-adoption `adoptByWorkbook`/mutator shadowing can bypass ownership enforcement; (2) Snapshot rollback can alter a previously clean formula graph's dirty state, and StyleCache parity is unproven; (3) ordinary EventBus behavior differs from the accepted live-dispatch/error-propagation/disposal behavior. It also found insufficient evidence for actual rollback failure cleanup, FIFO/cancellation/context revocation, and disposal during dispatch. See the lane reports for source locations and boundaries.

The D0-06 contract is separately blocked because no attributable exact API decision and required concurrence are established. Even if the technical findings were corrected, D0-06 and explicit integration authorization would still gate integration.

## Candidate-02 corrective successor

Following the correction-required findings, an isolated Candidate-02 was created from the same base plus Candidate-01's prospective overlay and the bounded PH1B corrections. It addresses (1) pre-adoption own-property shadows by invoking a captured prototype adoption method and rejecting shadowed protected methods, (2) Snapshot rollback restoration of the pre-transaction formula dirty set, and (3) ordinary EventBus live-Set dispatch, error propagation, disposal behavior, while retaining committed Workbook observer isolation through a candidate-internal marker.

- Worktree: `/home/navidrezadoost/Documents/Engineering-artifacts/CS-002D4-R1-PKG-21-candidate-v2`.
- Immutable package: `/home/navidrezadoost/Documents/Engineering-artifacts/CS-002D4-R1-PKG-21-CANDIDATE-02-package`.
- Archive: `/home/navidrezadoost/Documents/Engineering-artifacts/CS-002D4-R1-PKG-21-CANDIDATE-02.tar.gz`.
- Archive SHA-256: `5f9370222130e721b9a4da015d72c165d36ec471a1d43fd0670502f9d3666839`.
- Payload: 11 overlay files; all payload entries in its `SHA256SUMS.txt` passed after packaging.
- Focused candidate suite: 1 suite, 19/19 passed, reported using the existing Jest runtime with ts-jest diagnostics disabled because Candidate-02 had no installed dependency tree. The Snapshot dirty-state regression separately passed 1/1. Core typecheck and `git diff --check` passed.

Candidate-02 remains **improved but unqualified**. Snapshot restoration failure cleanup, StyleCache parity, full FIFO/cancellation/context coverage, clean dependency installation, package build, external consumer runtime import, full Core verification, and D0-06 remain unresolved. The clean install/build blocker from the fresh Candidate-01 reproduction remains applicable; Candidate-02 has no clean dependency-isolated build proof. No integration, merge, release, or contract activation is authorized.

## Disposition and next gate

Candidate-01 is not technically qualified and remains immutable as the review reference. Do not integrate it. Candidate-02 is now the separately identified successor, but it also must not be integrated until the remaining technical and environmental checks pass and D0-06 plus explicit integration authorization are established. Do not migrate C1 or alter public contract scope before D0-06 approval.

No production integration, merge, release, eighth operation, Pivot activation, comment deletion, Application forwarding, ledger promotion, or acceptance-baseline change occurred. Overall R1 acceptance remains **WITHHELD**.
