# CS-002D4-R1 PKG-19D — Diagnostic comparison

| Checkpoint | Scope | Result | Classification |
| --- | --- | --- | --- |
| PKG-18E final | 16 suites; two assertions filtered | 16 suites, 146 passed, 2 skipped | Bounded green result; neither skipped assertion was a pass. |
| PKG-19D D1 | Same 16 suites, no filter | 15 suites passed, 1 failed; 147 passed, 1 failed | C1 legacy assertion still expects mutation-port rejection. No test was edited. |
| PKG-19D D2/D3 | Same 16 plus PKG-19B ownership, PKG-19C disposal, and PKG-02F reentrancy; only C1 filtered | 19 suites, 166 passed, 1 skipped | Candidate corrections and focused risk coverage pass; C1 remains explicitly excluded. |
| PKG-19B ownership | Dedicated seven-op/ownership/queue/fault test | 1 suite, 7 passed | No supported-contract defect reproduced on the exercised routes. |
| PKG-19B adjacent | Ten transaction/graph/style/disposal/ownership suites; C1 filtered | 10 suites, 116 passed, 1 skipped | Journal/Snapshot rollback and ownership pass; restoration-fault test covers Journal only. |
| PKG-19C events | Eight event/disposal suites; C1 filtered | 8 suites, 56 passed, 1 skipped | `once` and C2 corrections conform to prior accepted PKG-02E/02F behavior in isolated copy. |
| Legacy queue test | `workbook-mutation-queue.p1-pkg-01.test.ts` | 1 suite compile-failed, 0 tests run | Missing candidate exports and downstream TS7006; not a runtime failure. |
| Candidate Core typecheck | Core `tsc --noEmit` | Passed | Candidate source typechecks. |

The rising test counts reflect added PKG-19 focused tests, not a full Core baseline comparison. The D1 failure is retained rather than filtered away in the record. D2 is not described as an unfiltered green result. No historical regression attribution is inferred.
