# CS-002D4-R1 PKG-19E — Integration qualification

## Disposition

**CANDIDATE BLOCKED — CONTRACT DECISION REQUIRED.** The candidate is materially improved over PKG-18: PKG-02F `once` semantics and PKG-02E post-disposal subscription rejection have been restored in a separate isolated candidate and pass focused evidence. However, the independent source review identifies D0-06 as an unresolved prerequisite for the public mutation API and its compatibility/versioning policy. No owner decision or integration authorization is recorded here.

## Qualification dimensions

| Dimension | Evidence | Assessment |
| --- | --- | --- |
| Technical behavior | 19-suite corrected focus passed 166 tests; B ownership/fault and C event/disposal focused results are reported separately. | Bounded paths pass; not full Core or global D2-11. |
| Approved-contract compatibility | `once` correction aligns with accepted PKG-02F; C2 guard aligns with PKG-02E lifecycle evidence. | Corrected in `/tmp/pkg19d-candidate` only. |
| C1 legacy assertion | Unfiltered D1 fails exactly the old “port unavailable” assertion; seven operation packages authorize the bounded methods. | Explicitly classified as obsolete for this candidate scope, but left unchanged. Broader API compatibility remains under D0-06. |
| Historical provenance | PKG-18A found no exact package patch; only base ownership history at `c6569c1...` is attributable. | Prospective reconstruction only. |
| Source review | PKG-19A reviewed all nine source files and produced 17 hunk dispositions. | One accepted-behavior correction was applied in the isolated D candidate. Public API/D0-06 and test-hook surface findings remain open. |
| Test coverage | Unfiltered D1, corrected D2, B ownership/adjacent, C event and reentrancy, typecheck, and sidecar evidence are recorded. | Legacy queue suite is compile-blocked; Snapshot restoration-failure injection is unavailable; C1 keeps D1 red. |
| Shared worktree | HEAD remains `88b09634f17f3b39d88a88c5428f76b426459a2b`; PKG-18 preflight originals are unchanged. | No production or existing test files changed. Candidate remains in `/tmp`. |
| Integration authority | D0-06 public mutation API owner decision remains pending; no separate integration authorization exists. | **Blocked.** |
| Release acceptance | Global D2-11 and other PKG-16F contracts remain unresolved. | Overall R1 acceptance remains **WITHHELD**. |

## Required next decisions

1. Obtain the designated API owner's attributable D0-06 decision covering the seven public mutation operations, transaction callback, health/errors, compatibility/versioning, and the visible identity predicate. Do not treat operation-level authorization as automatic approval of every additional public symbol.
2. Separately decide the internal test-hook/deep-import/declaration policy and whether those production-module hooks should be isolated or narrowed.
3. If integration is later authorized, migrate the C1 legacy assertion only under the exact approved seven-operation contract, preserving its ownership and no-partial-write checks. Rerun the original unfiltered selection after migration.
4. Define a supported Snapshot restoration-failure seam only if required by the accepted failure contract; current evidence directly tests recovery-required under Journal only.

This qualification authorizes no shared-worktree copying, merge, release, ledger promotion, or contract change. D0 remains **PROPOSED**; D1–D7 remain **PENDING**. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
