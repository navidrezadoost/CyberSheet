# WP-A — D0 and D1–D7 Advisor Review Package

**Status:** LOCAL REVIEW DRAFT — NOT AN APPROVED CONTRACT. This package organizes existing questions and requests an independent evidence review. D0 is proposed; D1–D7 remain `PENDING`. The advisor is not designated as a decision owner.

## Evidence boundary

The source evidence is in `WP-A-BUNDLE-02-architectural-evidence.tar.gz` (expected SHA-256 `fd0af0729fffdea03782af46017f64977ff00c15bacb5c9e60b78588174aa1d9`, repository revision `88b09634f17f3b39d88a88c5428f76b426459a2b`). It has not been manually delivered or independently verified by the advisor. Begin source analysis only after receipt and archive/payload integrity are confirmed.

The package contains source, tests, lexical search results, prior reports, and manifests. Frozen-register source files are absent; do not claim independent register-content verification. Repository searches cannot establish universal unreachability or absence of external consumers. Distinguish current source facts, executed test evidence, historical reports, Excel-documented facts, recommendations, and unsupported assumptions.

## Decision questions

| ID | Scope / authority class | Question for independent assessment | Existing review inputs | Status |
| --- | --- | --- | --- | --- |
| D0 | Cross-cutting concurrency proposal; owner not designated | What R1 concurrency/reentrancy boundary is supported or needed, and what evidence supports a single coordinator, reject/queue/serialize policy, or no added guarantee? | `WP-A-D0-concurrency-boundary-proposal.md`; Lane A source and transaction tests in the archive | **PROPOSED — NOT APPROVED** |
| D1 | Workbook/API | Which post-publication sheet lifecycle operations, if any, should be supported, and what are their final-sheet, publication, and retained-view rules? | P1-08AO, P1-08AR, P1-08AW Lane B; Workbook and view source/tests | `PENDING` |
| D2 | Workbook/API | What is the transaction commit point, rollback surface, metadata publication rule, and pre/post-commit failure behavior? | P1-08AO/P1-08AR/P1-08AW; transaction, command, and Workbook source/tests | `PENDING` |
| D3 | Workbook/API | Which pivot definition, registry, cache, refresh, invalidation, delete, and disposal operations are Workbook-owned, and which remain internal? | Accepted pivot/recompute evidence in reconciliation report; pivot source/tests; P1-08AO/P1-08AR | `PENDING` |
| D4 | Workbook/API | How should internal cache invalidation be distinguished from public snapshot freshness, dirty reads, detached snapshot age, and refresh failure? | Pivot snapshot/recompute evidence; P1-08AO/P1-08AR/P1-08AW | `PENDING` |
| D5 | Workbook/API | Which component is authoritative for events, what order is visible around commit/source/pivot/snapshot changes, and how are observer exceptions handled? | EventBus and bridges, owner-boundary tests, P1-08AO/P1-08AR/P1-08AW | `PENDING` |
| D6 | Workbook/API | How do retained views/references behave after rename, delete, generation change, failure, and rollback; how does reacquisition work? | WorkbookSheetView and Workbook source/tests; P1-08AO/P1-08AR/P1-08AW | `PENDING` |
| D7 | Worksheet/API | Does merged-member `getCell()` promise the anchor’s same JavaScript object, or only value-equivalent detached snapshots; what nested snapshot semantics apply? | P1-08AW Lane C, BT-2 test and merge-read characterization | `PENDING` |

Do not use Excel feature descriptions alone to decide Cyber Sheet API behavior. In particular, sheet-structure protection does not settle post-publication API lifecycle; Excel pivot-cache sharing/refresh variability does not specify Cyber Sheet ownership; merge storage behavior and `Range.MergeArea` do not prescribe JavaScript object identity, dependency-graph behavior, or masking order.

## Candidate dependency matrix

This matrix is a review aid, not a mandated approval order or an implementation dependency declaration. The advisor should confirm, revise, or remove each edge and cite source/test evidence.

| Decision | Candidate dependencies to examine | Why the relationship is only tentative |
| --- | --- | --- |
| D0 | D2, D5, D6; possibly D1/D3 | Reentrancy may affect commit, event callbacks, and retained references, but only actual nested-write paths can establish the dependency. |
| D1 | D2, D5, D6; possibly D0 | Structural publication may involve journaling, events, and handle validity; D0 matters only if the operation can overlap or reenter. |
| D2 | D0, D5; operation-specific D1/D3/D6 | Transaction guarantees should specify observer timing; operation domains must be mapped before declaring a global rollback surface. |
| D3 | D2, D4, D5; possibly D0 | Pivot mutation, refresh visibility, and publication may intersect transaction, freshness, events, and reentrancy. Registry ownership alone does not decide them. |
| D4 | D3, D5, D6 | Public freshness may depend on refresh ownership and publication events; retained detached snapshots may outlive view invalidation. |
| D5 | D0, D2; operation-specific D1/D3/D6 | Nested observer writes and commit/publication sequencing may constrain events; no FIFO queue or suppression policy is presumed. |
| D6 | D1, D2, D5; possibly D0 | Lifecycle operations, rollback, observable invalidation, and overlapping access may interact; exact object/reference types must be distinguished. |
| D7 | No required D0–D6 dependency identified | This is a separate Worksheet/API read identity and snapshot contract unless source demonstrates a necessary interaction. Keep BT-2 separate. |

## Required review deliverables

Please return:

1. Exact inventory of source evidence reviewed, including revision/path and archive hash.
2. Source-grounded ownership, read-routing, and transaction model, including legitimate internal access paths.
3. Comparison of three ownership-enforcement strategies, with tradeoffs and evidence; do not choose one without stating the criteria and unresolved risks.
4. Separate contract-dependency and implementation-dependency maps.
5. D1–D7 evidence-readiness assessment, with classifications for Excel-confirmed, source-confirmed, test-confirmed, proposed divergence, and unsupported claims.
6. Unresolved architectural decisions and remaining evidence/owner gaps.
7. Smallest justified next engineering or decision-review checkpoint.
8. Separate D0 recommendation: whether an explicit concurrency boundary is required and whether current code can enforce the candidate policy.

Also challenge the supplied Excel interpretations and specifically assess: D1 workbook protection versus Cyber Sheet lifecycle; D2 rollback completeness and mutations outside journals; D3 separation of Pivot registry/cache/refresh/invalidation; D4 internal cache freshness versus public detached snapshot freshness; D5 source-confirmed order/isolation versus proposed queue/suppression; D6 JavaScript retained-object lifecycle versus formula `#REF!`; and D7 JavaScript reference identity versus merged-range/value semantics.

Include P1-08BB as separate evidence. Renderer constructor cleanup and framework-initializer Workbook disposal are distinct unresolved questions and must not be collapsed into D0–D7 without explicit scope.

## Decision and authorization rules

- Keep D1–D7 `PENDING` until a formally designated owner records approve/reject/defer with exact wording, date, authority basis, and rationale.
- D0 remains a proposal unless an authorized owner formally adds/approves it as a decision.
- Advisor recommendations are evidence for owner review; they do not appoint the advisor as owner or approve a contract.
- Contract approval and implementation authorization are separate records. No production or test changes are authorized by this review request.
- If evidence is insufficient, report the missing path/test/owner/channel rather than reconstructing from prior summaries.

## Delivery state

This draft is local. The approved archive still awaits manual delivery to the existing advisor conversation. Lane C has not started. Do not send this package to another destination; attach it with the approved evidence archive after the designated conversation accepts delivery. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
