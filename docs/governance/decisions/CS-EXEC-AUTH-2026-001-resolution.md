# CYBER SHEET EXCEL
# CTO EXECUTIVE AUTHORIZATION & ENGINEERING GOVERNANCE RESOLUTION

**Resolution ID:** CS-EXEC-AUTH-2026-001  
**Classification:** Executive Governance / Engineering Authorization  
**Issuing Authority:** Chief Technology Officer (CTO) — Highest Project Authority  
**Status:** DRAFT — PENDING CTO SIGNATURE AND FORMAL REGISTRATION  
**Proposed Effective Date:** November 7, 2026, subject to signature and registration  
**Scope:** Cyber Sheet Excel — Core Architecture, Workbook/Worksheet Contracts, Engineering Qualification, and Integration Governance  
**Reference Baseline:** CS-EXEC-DEV-2026-015  
**Related Gates:** D0-06, D5, C1, BT-2, Pivot/Workbook Lifecycle, CS-002D4-R1

---

## ARTICLE 1 — EXECUTIVE AUTHORITY AND PURPOSE

The CTO, acting as the highest project authority for Cyber Sheet Excel, establishes this resolution to define the authorization structure for continued engineering, technical review, contract decisions, candidate preparation, and controlled integration.

The CTO retains final executive authority over:

- Product architecture and strategic direction.
- Approval of delegated technical decision-makers.
- Authorization of public API and compatibility changes.
- Protected integration and release decisions.
- Final CS-002D4-R1 acceptance.

This resolution grants bounded engineering execution authority. It does not automatically approve unresolved technical contracts, historical test migrations, production integration, or release readiness.

Cyber Sheet Core shall remain the authoritative Workbook, Worksheet, formula, transaction, and state-ownership implementation.

Univer OSS may continue to be used only as an isolated test oracle or design reference under the existing adoption disposition. No new runtime dependency, source copying, or vendoring is authorized by this resolution.

## ARTICLE 2 — AUTHORIZATION REGISTER

The CTO approves the following twelve authorization categories as the project's executive governance framework.

| Code | Authorization | Executive Disposition |
|---|---|---|
| AUTH-01 | Executive authority and decision governance | Authorized as a governance framework upon formal execution |
| AUTH-02 | Workbook/Worksheet authority designation and D0-06 review | Authority-designation process authorized; D0-06 technical concurrence pending |
| AUTH-03 | D5 Workbook command-event contract | Preserve-event direction selected; detailed contract and implementation pending |
| AUTH-04 | C1 and BT-2 compatibility contracts | Technical review and decision process authorized; substantive decisions pending |
| AUTH-05 | Workbook/Worksheet lifecycle | Contract design and assessment authorized; public API expansion pending |
| AUTH-06 | Pivot and Formula contracts | Technical review authorized; specific behavior approvals pending |
| AUTH-07 | Historical test migration | Independent review and proposed migrations authorized; official baseline changes pending |
| AUTH-08 | Source reconciliation and isolated implementation | Authorized within protected boundaries |
| AUTH-09 | Candidate preparation and controlled integration | Isolated Candidate preparation authorized; protected merge requires separate approval |
| AUTH-10 | Comprehensive verification and regression corrections | Authorized within approved technical scope |
| AUTH-11 | Repository preservation and evidence management | Authorized for non-destructive engineering operations within existing access permissions |
| AUTH-12 | R1 acceptance and release governance | CTO final approval authority retained; acceptance and release not granted |

No category shall be interpreted as overriding a more restrictive contract, security, ownership, or integration gate.

## ARTICLE 3 — TECHNICAL AUTHORITY AND INDEPENDENT CONCURRENCE

### 3.1 Executive decision authority

The CTO shall serve as the final executive decision-maker.

The CTO may appoint accountable technical decision holders through an explicit, recorded delegation.

### 3.2 Required independent technical reviewers

The following technical review roles shall be designated before substantive contract approvals:

1. **Workbook/API Technical Decision Holder** — responsible for Workbook API design, compatibility, transaction semantics, errors, and lifecycle.
2. **Worksheet/API Independent Concurrence Reviewer** — responsible for independent review of Worksheet ownership, immutable views, mutation boundaries, and compatibility.
3. **Event/API Reviewer** — responsible for D5 event semantics and integration behavior.
4. **Quality and Release Reviewer** — responsible for test coverage, regression qualification, evidence integrity, and release-gate verification.

A named individual may hold multiple roles only if the CTO expressly authorizes that arrangement and the independence requirement is still satisfied. The author of an implementation shall not be its sole independent concurrence reviewer.

No reviewer is appointed merely by listing these positions in this resolution.

Each designation must record the person's identity, delegated scope, appointment date, decision authority, and approved decision channel.

### 3.3 Decision registration

All binding technical decisions shall identify:

- Decision identifier and exact contract revision.
- Responsible decision holder and independent reviewer.
- Supporting technical evidence.
- Compatibility implications.
- Decision: APPROVED, APPROVED WITH CONDITIONS, REJECTED, or DEFERRED.
- Effective date and recorded approval.
- Permitted implementation scope.
- Outstanding restrictions.

Until the required designations and concurrence exist, D0-06 shall remain PENDING.

## ARTICLE 4 — D0-06 WORKBOOK/WORKSHEET CONTRACT

The CTO authorizes formal decision-making on the existing D0-06 / PKG-20A contract package.

The approved review scope includes:

- Workbook and Worksheet ownership boundaries.
- Immutable and detached `WorkbookSheetView` behavior.
- Public mutation-port operations.
- Transaction FIFO and commit semantics.
- Legacy callback transaction compatibility.
- Staged transaction-builder policy.
- Rollback and observer publication ordering.
- Disposal, health, error precedence, and recovery-required behavior.
- Supported TypeScript and module compatibility.
- Public declaration and package-surface policy.

**This resolution does not approve D0-06 itself.**

D0-06 may be marked APPROVED only after the exact revision receives attributable technical concurrence through the authorized channel.

Any implementation or public API activation based on that decision requires a separately recorded authorization.

## ARTICLE 5 — D5 WORKBOOK COMMAND EVENTS

The CTO establishes the following product direction:

**Preserve the documented Workbook command-event promise, subject to detailed contract approval and implementation qualification.**

The future D5 specification shall address:

- `command-execute`
- `command-undo`
- `command-redo`
- Workbook-owned emission authority.
- Supported command execution routes.
- Event ordering relative to mutation commits.
- Rollback suppression and failure behavior.
- Stable, detached event payloads.
- Listener reentrancy and observer visibility.
- React `onEvent` and `setEventBus` integration.
- Compatibility with existing consumers.

The existing subscription-only Workbook EventBus shall not be expanded by assumption.

The engineering team may design and prototype an owner-controlled forwarding route in isolation, but shall not activate it publicly until D5 approval and separate implementation authorization.

The documented event promise shall not be silently withdrawn or weakened.

## ARTICLE 6 — C1, BT-2, AND WORKBOOK LIFECYCLE

The CTO authorizes independent technical decisions on:

**C1 — Mutation target compatibility**

Determine whether immutable `WorkbookSheetView` instances are valid public mutation-port targets and how invalid or foreign targets shall be handled.

**BT-2 — Merged-cell read identity**

Determine the approved read semantics for merged regions, anchor cells, detached views, and identity-sensitive operations.

**Workbook/Worksheet lifecycle**

Evaluate initialization, sheet creation, deletion, renaming, ownership transfer, active-sheet state, event subscriptions, indexing, rollback, and disposal.

Dynamic post-publication sheet creation is not approved by this resolution.

These decisions shall remain separate from D0-06 except where their implementations have explicit dependencies.

## ARTICLE 7 — PIVOT AND FORMULA CONTRACTS

The CTO authorizes bounded technical review covering:

- Workbook-owned Pivot registration, creation, and metadata.
- Pivot anchors, snapshot management, refresh, invalidation, and deletion.
- Calculated fields and supported aggregation scope.
- Cross-sheet reference and rename behavior.
- Formula scheduling and recalculation through supported Workbook APIs.
- COUNTBLANK argument-shape semantics.
- Absolute and mixed A1 references.
- Native date/time formatting, locale, and Excel serial-60 behavior.

Standalone Worksheet, FormulaEngine, SpreadsheetEngine, or PivotEngine tests shall not be represented as proof of an unavailable Workbook integration capability.

No new Workbook formula-calculation API or Pivot lifecycle API is authorized for public activation without its exact approved contract.

## ARTICLE 8 — HISTORICAL TEST MIGRATION AUTHORIZATION

The CTO authorizes independent review and isolated execution of the previously prepared test-migration proposals.

The CS-EXEC-DEV-2026-015 eight-suite review patch, SHA-256:

`339d1db58dd45278324510e46a3af6e95a552ce1c3cbae018b86f9736fa1a740`

is approved **for formal technical review**, not automatically for inclusion in the official historical baseline.

The DifferentialCorrectness/FuzzingWithShrinking migration shall remain a separate proposal limited to standalone Worksheet structural-operation coverage.

EventBus forwarding and strict PasteCommand sparse-undo behavior require separate dispositions.

Any migration accepted into the official baseline must demonstrate that its intended invariant remains covered, identify changed assertions, and obtain attributable test-baseline approval.

Historical failures shall not be hidden, weakened, or reclassified solely because isolated replacement tests pass.

## ARTICLE 9 — ISOLATED ENGINEERING AND CANDIDATE PREPARATION

The CTO authorizes the engineering team to:

1. Recover and verify the latest qualified isolated source.
2. Reconcile source lineage using exact manifests and hashes.
3. Continue demonstrated, contract-independent correctness corrections.
4. Prepare isolated implementation branches or disposable worktrees.
5. Create a clearly identified, non-promoted **Candidate-05 preparation artifact**.
6. Conduct code review, compatibility analysis, and focused or comprehensive verification.
7. Produce an integration-ready delta with rollback and recovery documentation.

Candidate-05 preparation shall not modify or supersede Candidate-04.

The candidate may not be promoted into a protected release candidate or merged into the shared checkout without a separate integration decision that identifies exact source hashes, approved contracts, test results, and rollback procedures.

Existing repository access policies remain applicable.

## ARTICLE 10 — REQUIRED VERIFICATION

A candidate requesting protected integration shall provide:

- Exact source and dependency manifests.
- Independent source-extraction verification.
- Core typecheck and build/declaration verification.
- Strict supported consumer compatibility checks.
- Relevant Formula, Pivot, Clipboard, Undo/Redo, EventBus, and Transaction tests.
- Node/Chromium conformance where applicable.
- Full Core diagnostic and failure-level comparison.
- Historical failure and migration disposition ledger.
- Public declaration/API compatibility assessment.
- Security, data-integrity, ownership, and rollback review.
- Clean diff and test hygiene checks.
- Evidence of preserved protected artifacts.

A non-green full Core result must remain explicitly non-green. Acceptance of any legacy failure requires an approved exception or corrective action.

Passing focused tests does not authorize R1 acceptance.

## ARTICLE 11 — PROTECTED REPOSITORY AND EVIDENCE PRESERVATION

The following protected assets shall remain unchanged unless separately authorized:

- Shared checkout and its recorded inventory.
- Protected Core sidecars.
- Candidate-04.
- Frozen contracts and engineering registers.
- Official historical test baseline.
- Existing evidence archives and cryptographic manifests.
- Package manifests and lockfiles unless a specific dependency change is approved.

Engineering activity shall preserve source identity, traceability, independent review records, and reproducibility.

No blanket permission to overwrite the protected checkout is granted.

## ARTICLE 12 — PROHIBITED AND RESERVED GATES

The following actions remain expressly prohibited under this resolution unless their specific gates are independently satisfied:

| Gate | Current Disposition |
|---|---|
| D0-06 substantive contract approval | PENDING |
| Worksheet/API independent concurrence | NOT YET RECORDED |
| D5 detailed event-contract approval | PENDING |
| C1 mutation-target contract approval | PENDING |
| BT-2 merged-read identity approval | PENDING |
| Workbook/Pivot lifecycle public API activation | NOT AUTHORIZED |
| Official historical test-baseline replacement | NOT AUTHORIZED |
| Protected shared-checkout integration | NOT AUTHORIZED |
| Candidate-05 promotion | NOT AUTHORIZED |
| R1 acceptance | WITHHELD |
| Production release or deployment | NOT AUTHORIZED |

Executive approval of this governance framework does not constitute automatic clearance of these gates.

## ARTICLE 13 — EFFECTIVE DATE AND EXECUTION

This resolution shall take effect only when:

1. The CTO signs or explicitly approves the exact resolution.
2. The resolution is recorded in the project's authorized decision register.
3. The approval date and effective date are recorded.
4. The official approval record is made accessible to the responsible engineering and independent review authorities.

The effective date shall be the recorded date of execution unless the CTO specifies a later date.

A draft, chat message, unsigned document, or unregistered approval shall not be represented as a completed project authorization.

## ARTICLE 14 — REQUIRED FIRST EXECUTION

After this resolution becomes effective, the first engineering action shall be to establish the technical authority register and obtain the named independent reviewers.

Then, in parallel, engineering shall:

- Submit the exact D0-06 revision for attributable concurrence.
- Prepare D5 command-event technical specification and compatibility review.
- Submit the reviewed migration proposals for formal test-baseline decisions.
- Prepare the isolated Candidate-05 artifact under the restrictions in Article 9.

No team may infer substantive contract approval merely from permission to prepare these materials.

---

## EXECUTIVE SIGNATURE AND APPROVAL RECORD

**Project:** Cyber Sheet Excel

**Issuing Authority:** Chief Technology Officer (CTO)

**CTO Name / Authorized Identifier:** __________________________

**Signature / Authenticated Approval:** __________________________

**Date Signed:** __________________________

**Effective Date:** __________________________

**Decision Register ID / Location:** __________________________

**Independent Workbook/API Reviewer:** To be designated

**Independent Worksheet/API Reviewer:** To be designated

**Event/API Reviewer:** To be designated

**Quality/Release Reviewer:** To be designated

**Resolution Status:** DRAFT — NOT YET EXECUTED

---

**Executive Control Statement**

The CTO authorizes the governance framework, independent technical review process, bounded isolated engineering, and conditional candidate preparation defined herein.

All unresolved public contracts remain subject to explicit technical concurrence. Protected integration, Candidate promotion, final R1 acceptance, and production release remain separate executive decisions.

**END OF RESOLUTION — CS-EXEC-AUTH-2026-001**