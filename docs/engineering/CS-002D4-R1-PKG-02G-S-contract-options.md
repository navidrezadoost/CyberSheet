# CS-002D4-R1 PKG-02G-S — D5-01 contract options

**Decision checkpoint:** Contract interpretation and implementation planning only. No authoritative contract is changed and no production implementation is authorized.

## Options

| Option | Interpretation and source fit | Compatibility impact | Assessment |
| --- | --- | --- | --- |
| **A — Preserve current Cell/Style bridge ordering** | Keep each lazy Workbook Cell/Style bridge as a Worksheet subscriber. Dimension events retain PKG-02E's explicit Worksheet-complete-then-Workbook sequence. All operation callbacks still follow commit; Cell/Style cross-level timing remains registration-dependent. | No timing change. Existing listeners preserve their relative callback order. The implementation remains intentionally nonuniform across event families. | Safe compatibility posture, but leaves D5-01's arrow ambiguous and does not say whether its ordering is satisfied. This is not by itself a contract resolution. |
| **B — Enforce Sheet-before-Workbook completion for Workbook-owned transactions** | For each staged operation, complete the public Worksheet notification before dispatching its Workbook notification(s), preserving operation index and global stage order. Formula writes must preserve both existing Workbook names and define their relative order. | Observable breaking timing change for consumers whose direct Worksheet listeners currently run after the Workbook bridge. A Worksheet observer that disposes the Workbook would now prevent the corresponding Workbook notification; currently a bridge registered earlier can run and dispose first. Existing Cell/Style bridge timing changes. | Only justified if the contract owner confirms D5-01 means strict observer-completion order. Needs private provenance and a suppression/defer mechanism so the lazy bridge does not double-deliver; preserve subscription laziness and keep standalone Worksheet semantics explicit. Not recommended without that decision. |
| **C — Define D5-01 at the commit boundary** | Interpret Sheet → Workbook → Application as propagation lineage, not a total order requiring all observers at one layer to return before the next. Require each layer's notifications to describe fully committed state, preserve transaction staging order, and apply D5-04's deterministic registration/error-isolation rules within each dispatcher. | Preserves present Cell/Style timing and PKG-02E dimension ordering. No migration is required for existing callbacks. It expressly leaves cross-layer observer-completion order unspecified. | Best fit to D2-08 and D5-02 as written, and to current verified behavior, provided the D5-01 owner explicitly approves this clarification. Does not resolve D5-05 or establish the missing Application layer. |

## Evidence-based recommendation

Recommend **Option C for owner clarification**, not as an already approved contract. D2-08 specifies a single commit point followed by event/history publication; D5-02 says committed-change events publish after commit; D5-03 addresses observer failures; and D5-04 requires deterministic listener dispatch. None specifies a happens-before relation between completion of every Worksheet observer and start of Workbook observers. D5-01's arrow can reasonably denote propagation path, but its owner-approved status means this engineering review cannot silently redefine it.

If the owner instead reads the arrows as strict level completion order, Option B requires a separate compatibility-approved implementation package. Option A may be used temporarily while the decision is pending, but must not be reported as proof that strict D5-01 ordering is implemented.

## Proposed clarification for contract-owner approval

> **D5-01 clarification proposal — not approved:** “Sheet → Workbook → Application identifies the propagation path for committed observable events. It does not require every observer at a preceding layer to return before notification begins at the next layer. All callbacks for a committed transaction observe state after that transaction's commit point. Within each layer, callbacks follow that layer's documented deterministic dispatch order and failure-isolation rule. The order of observers registered through different layer APIs is not guaranteed, except where an operation-specific contract explicitly states otherwise.”

This text does not authorize Application event names, payloads, ownership, or migration; D5-05 must be resolved separately. It also does not claim the seven-operation implementation inventory closes global D2-11.

## Option B implementation sketch if selected

1. Add private per-publication operation provenance sufficient to associate a committed Worksheet event with the exact staged operation; do not infer from generic `sheet-mutated` or read post-commit state to reconstruct repeated values.
2. Preserve lazy bridge activation, but add a private transaction-publication path that defers the matching Cell/Style bridge callback until after all public Worksheet listeners for that event return. Suppress the corresponding lazy bridge's inline emission for that one publication so no event is delivered twice.
3. Publish the deferred Workbook notification(s) immediately after the Worksheet emitter completes and before the next staged operation's publication. For formula writes, retain both existing event names and payloads and define ordering among them (prefer bridge registration order unless the owner approves a different rule).
4. Keep exception isolation at both levels, commit-only visibility, stage ordering, disposal stop behavior, corrected `once`, subscription laziness, and standalone Worksheet behavior.
5. Treat a Worksheet observer that disposes the Workbook as a committed outcome: remaining Worksheet observers and the deferred Workbook notification stop under the current disposal-stop rule. Add explicit compatibility notes for this changed timing.

The sketch is not implementation approval. Its central suppression/defer mechanism needs a focused design review because the current lazy bridge is itself a Worksheet listener.
