# CS-002D4-R1 PKG-20A — D0-06 owner decision record

**Decision status:** **PENDING OWNER DESIGNATION / NO ATTRIBUTABLE DECISION**
**Contract status:** D0-06 remains **UNRESOLVED-BLOCKER**; no authoritative contract wording is amended.
**Transmission status:** Not transmitted. No approved owner/channel or recipient response is established in the cited records.

## Authority evidence carried forward

PKG-16F records Workbook/API authority as **AUTHORITY UNVERIFIED / DESIGNATION DEFERRED**: it identifies no named owner, scoped delegation, required concurrence, approved durable response channel, or effective date. PKG-19A and PKG-19E identify D0-06 as a contract/owner blocker and record no decision or integration authorization. This Lane A did not repeat the authority search, infer authority from repository roles, or treat technical review as owner approval.

The next required action belongs to project leadership: issue one durable designation naming the D0-06 Workbook/API decision owner, the authority basis, scope, any required Worksheet/API concurrence, approved response channel, and effective date—or record an accountable, dated deferral. After designation, route the request below through that channel. No alternative recipient or transmission is authorized or claimed here.

## Decision requested

Please choose one option, provide exact wording for any modification, and identify the compatibility/versioning rule. The decision applies only to the seven existing Workbook operation families and associated API shape described in [the PKG-20A compatibility comparison](CS-002D4-R1-PKG-20A-D0-06-api-compatibility.md). It does not authorize integration or settle unrelated contracts.

### A — Approve the proposed asynchronous public API

Approve the candidate shape for the seven existing operations:

- `Workbook.transact<T>((tx: WorkbookTransactionContext) => T | Promise<T>): Promise<T>`.
- A working Workbook `mutationPort` with the five existing cell methods plus `setRowHeight` and `setColumnWidth`, returning `Promise<void>`.
- A `WorkbookTransactionContext` with the seven corresponding synchronous staging methods, root-exported as a type.
- The candidate's optional `displayValue` argument on `setCellFormula`.
- The stated same-Workbook `WorksheetId`/issued-view validation, FIFO/commit/rollback, cancellation, and disposal behavior under the seven approved operation-specific contracts.

For each ancillary public symbol, explicitly approve or exclude: `getMutationHealth()` and `WorkbookMutationHealth`; `WorkbookOperationCancelledError`, `WorkbookMutationRollbackError`, and `WorkbookRecoveryRequiredError`; and `Workbook.isWorkbookIssuedSheetView`. State whether these are stable root APIs, supported but versioned APIs, or internal-only. Specify release/versioning and migration expectations for changing the existing five `never` declarations and synchronous throws into working Promise-based operations.

### B — Approve a modified or separately versioned API

Specify the exact signatures, namespacing or separate entrypoint/version, migration path, compatibility window, and treatment of the ancillary health/error/identity symbols. State whether the five existing `never` methods remain rejecting in the current version, whether a parallel API is required, and how callers distinguish synchronous standalone Worksheet operations from asynchronous Workbook writes. Identify the version in which each behavior becomes available.

### C — Defer public activation

Keep the current `mutationPort` unavailable and do not publish the candidate `transact`/context API. Name the accountable authority, state the concrete unresolved prerequisite or evidence, specify who will satisfy it, and give a review/decision date. Clarify whether the already approved seven operation contracts remain implementation-authorized behind an internal/non-public boundary during the deferral, or are also paused.

### Other decision

Provide exact alternative contract text, scope, compatibility/versioning treatment, and any required concurrence. A response that only endorses the technical implementation without deciding API compatibility is not a D0-06 resolution.

## C1 disposition requested

The historical test `workbook-owned-escape.test.ts` / `R1 mutation port has stable typed calls that reject before any write` currently asserts synchronous rejection for the five base methods and verifies no write occurs. The unfiltered PKG-19D run recorded its failure against the candidate; PKG-19C's narrow “obsolete for seven-operation scope” classification does not settle general D0-06 compatibility, and PKG-19E records that the test remains unchanged.

Please state whether the owner decision explicitly authorizes a separate minimal migration of only that obsolete expectation. Any approved migration must preserve the owner-boundary and no-partial-write coverage, retain an unfiltered result, and avoid deleting the suite. If no explicit authorization is given, C1 remains unchanged and its failure remains reported. This request itself does not authorize editing or running the test.

## Response record — leave blank until attributable response

| Field | Owner response |
| --- | --- |
| Selected option / exact alternative | **PENDING** |
| Named decision owner | **PENDING designation** |
| Authority basis / delegation | **PENDING** |
| Decision scope | **D0-06 Workbook mutation API compatibility/versioning** |
| Required Worksheet/API concurrence | **PENDING determination** |
| Approved durable channel | **PENDING designation** |
| Effective date | **PENDING** |
| Versioning and migration rule | **PENDING** |
| Ancillary health/error/identity-symbol status | **PENDING** |
| C1 test-migration authorization | **PENDING; no change authorized** |
| Evidence URI or durable decision record | **PENDING** |

No answer is inferred from silence, review, tests, or operation-specific authorization. Until the table is populated from an attributable authorized response, D0-06 remains **UNRESOLVED-BLOCKER**, D0 remains **PROPOSED**, D1–D7 remain **PENDING**, and overall CS-002D4-R1 acceptance remains **WITHHELD**.
