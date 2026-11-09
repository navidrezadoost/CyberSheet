# CS-002D4-R1 PKG-02G-D — D5-01 decision submission

**Status: REQUEST-READY PROPOSAL — NOT TRANSMITTED; OWNER AUTHORITY NOT VERIFIABLE**

## Decision requested

Please approve or reject this clarification of D5-01. This proposal concerns only the meaning of cross-level ordering. Approval would not create Application event forwarding or decide D5-05.

### Existing authoritative wording

> A committed mutation's observable events propagate Sheet → Workbook → Application.

### Proposed Option C wording

> Sheet → Workbook → Application describes propagation lineage for committed observable mutation events. It does not impose a requirement that every observer at the preceding layer finish before notification begins at the next layer. All callbacks for a committed transaction observe state after its commit point. Each event surface follows its documented deterministic listener ordering and error-isolation rules. Relative observer-completion order across surfaces is unspecified unless an operation-specific contract expressly requires otherwise.

## Options

| Choice | Contract meaning | Compatibility consequence |
| --- | --- | --- |
| A — Leave D5-01 unchanged | Preserve current behavior without resolving whether arrows imply observer-completion order. | No behavior change, but the cross-level interpretation remains ambiguous. |
| B — Require strict Sheet-before-Workbook completion | All observers at the Worksheet surface finish before corresponding Workbook observers begin. | Changes current observable Cell/Style callback timing; would require a separately authorized compatibility and implementation package. |
| C — Commit-boundary propagation (recommended) | Arrows describe propagation lineage; each surface observes committed state and follows its own dispatch rules; cross-surface completion order is unspecified unless operation-specific text says otherwise. | Preserves currently verified timing and avoids a migration. Does not resolve Application authority/schema. |

## Evidence and scope

PKG-02D/E/F document event bridge, dimension event, lifecycle, disposal, nested dispatch, `once`, and listener-failure behavior. PKG-02G-S identifies the ambiguity and compares the three options. PKG-02G-C adds compatibility characterization: the focused D/E/F and seven-operation differential selection passed 11 suites / 170 tests; Core typecheck and hygiene passed; the 237-entry protected sidecar manifest matched before and after. These are engineering evidence, not owner approval.

Option C is recommended because D2-08 and D5-02 place notification after commit, while D5-04 addresses deterministic behavior within a dispatch surface. The reviewed source and tests do not establish a single global callback order across distinct surfaces. Option B would change public callback timing, so it should only proceed if the authorized owner requires strict ordering and a separate implementation authorization is issued.

## Exclusions

- D5-05 remains unresolved: Application event authority, stable names, payload schema, forwarding, and migration policy are not decided here.
- Global D2-11 remains unresolved outside operation-specific closures.
- This submission does not change production behavior, event schemas, mutation operations, or persistence.
- The shared FIFO self-await limitation and legacy Pivot integration compilation blocker are independent issues.

## Required response

An authorized owner should return one of:

1. **APPROVED — OPTION C**, with the exact approved wording; or
2. **REJECTED — STRICT ORDER REQUIRED**, with confirmation that Option B is intended and the required compatibility decision; or
3. **DEFERRED**, with the responsible authority and prerequisite or decision date.

The durable decision record must name the owner and role, authority/delegation source, decision scope, approved channel, effective date, exact wording, and change-control reference. Until then, status remains **PENDING — OWNER DECISION NOT RECEIVED**. This request has not been transmitted because no authorized recipient/channel is established.
