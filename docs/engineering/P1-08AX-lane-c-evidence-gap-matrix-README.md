# P1-08AX Lane C — Record-level evidence-gap matrix

The companion TSV represents all **2,067 unique ledger records**. Identity and disposition fields are copied verbatim from `CS-002D4-R1-implementation-dispositions.tsv`; no ledger, register, disposition, or evidence artifact was changed. The composite identity is `record_type + record_key + path`. The ledger contains 2,067 rows with 2,067 unique composite identities. Source ledger SHA-256 at preparation: `9eeedfffa3c0c986a9c9b6282e707994aeb7eee56b37288e2eacc8ca8f768058`.

## Method and interpretation

Each row retains the exact key/type/path, disposition, source anchor, ownership classification, assigned slices, and review status. `evidence_pointer` links back to the exact ledger row and its `implementation_evidence` field when present. The ledger's evidence text is a pointer/claim recorded by the prior checkpoint; this matrix does not independently rerun or upgrade that evidence. Empty ledger evidence remains empty and is treated as a gap. The mapping below groups dispositions for triage only. A gap category is not a defect finding; `open-not-reconciled` means that reconciliation evidence is not recorded for that row. A boundary rejection proves only the recorded boundary behavior.

| Gap category | Count | Included ledger dispositions |
|---|---:|---|
| implemented-evidence | 25 | `implemented-detached-result`, `implemented-readonly-facade` |
| detached-or-standalone-test-evidence | 79 | `standalone-preserved`, `rejected-at-explicit-initialization-boundary` |
| owner-blocked-integration | 227 | `partial-owner-split`, `partial-initialization-gated`, `rejected-at-owner-boundary`, `rejected-pending-R6` |
| still-unreconciled | 1736 | `open-not-reconciled` |

`browser-blocked verification` is an acceptance-gate status, not a ledger disposition, so it is recorded below rather than assigned to unrelated records. Exact disposition counts are: `implemented-detached-result` 20, `implemented-readonly-facade` 5, `open-not-reconciled` 1736, `partial-initialization-gated` 16, `partial-owner-split` 126, `rejected-at-explicit-initialization-boundary` 27, `rejected-at-owner-boundary` 59, `rejected-pending-R6` 26, `standalone-preserved` 52.

## Remaining acceptance gates at P1-08AW

Source: `CS-002D4-R1-verification-manifest.p1-08aw.json` and sections AW.05–AW.08 in `CS-002D4-R1-implementation-reconciliation.md`.

| Gate | Recorded status | Evidence boundary / next priority |
|---|---|---|
| Full Core diagnostic | Non-green: 9 failed suites, 5 skipped; 19 failed tests | Diagnose only after contract and fixture blockers are resolved; failures alone do not establish defects. |
| Remaining 18 pivot formula cases | Blocked at unsupported Workbook fixture setup | Obtain owner decisions and authorize a focused public-path integration gate. |
| Seven Workbook owner-contract suites | Blocked by TypeScript compile failures | Record all six Workbook/API owner decisions before implementation or fixture migration. |
| Six Workbook/API owner decisions | Pending; handoff remains local and undelivered | Identify/deliver to designated owner; record choice, rationale, date, and scope. |
| BT-2 merged-read identity | Pending Worksheet/API owner decision | Decide the read identity/value snapshot contract; assertion and production behavior remain unchanged. |
| Chromium E2E | Blocked; pinned Chromium revision 1248 unavailable | Provision a trusted matching browser/cache and run the listed Chromium cases. |
| Record-level implementation reconciliation | Open/incomplete | Work exact-key bounded reviews; ledger has 1736 open and 126 partial-owner-split records. |
| Overall CS-002D4-R1 acceptance | Withheld | Reassess after blocking decisions, required verification, and record reconciliation. |

AW also records a full React suite pass (33 suites/172 tests), test-utils pass (1/40), Core/React/test-utils typecheck passes, focused-test hygiene and metadata validation passes (47/47), and `git diff --check` pass. These are checkpoint-level evidence, not blanket row-level reconciliation. The full Core run was diagnostic and did not recapture the acceptance baseline. Frozen joins remain complete: modules 131/131, semantics 1,486/1,486, flows 450/450. The manifest records register hashes module `b42c04b22b823a714c1cf9c0364a81870799d9676d7b69b40bf6236fd8abe683`, semantic `158d3e232bd31e41432bff7192f07425a3f600c2330fdc970f68bc94d4d77d22`, and flow `08c8769b3ff7b72f1c1b072412a3387eb655f33d11cb5ad4e5d65683cdd22db0`.

## Priorities

1. Resolve and document the six Workbook/API owner decisions and the separate BT-2 read-identity decision.
2. Provision pinned Chromium 1248 through a trusted source and capture browser verification.
3. With recorded contracts and authorization, rerun the public-path pivot/Workbook gates and revisit only implicated exact records.
4. Continue exact-key reconciliation of the open and partial records without treating ledger status alone as evidence of a product defect.
