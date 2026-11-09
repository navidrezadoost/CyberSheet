# WP-A — D0 Concurrency Boundary Proposal

**Status:** PROPOSED — NOT APPROVED. Prepared as a review question for the architectural advisor. Decision authority is not designated. This proposal does not add an eighth approved contract and does not authorize production or test changes.

## Question

What concurrency and reentrancy guarantees, if any, does Cyber Sheet Excel R1 provide for Workbook mutation attempts?

## Candidate contract wording for review

1. A Workbook mutation must have a clearly identified authoritative coordinator. The review must determine whether current source enforces one coordinator or only intends one.
2. Mutation batches must use the transaction boundary that the approved API contract identifies. Do not infer that every structural, metadata, formula, or pivot mutation currently passes through one journal.
3. Reentrant or overlapping mutation attempts require an explicit policy: reject, queue, or serialize. Select no policy until source paths, synchronous/asynchronous behavior, public compatibility, and failure semantics are examined.
4. R1 makes no promise of concurrent-writer reconciliation, operational transformation, CRDT merging, or distributed conflict resolution unless an owner explicitly approves such a scope.
5. Failure/rollback, event publication, and retained-reference invalidation remain separately specified in D2, D5, and D6. D0 should define only the concurrency boundary needed to keep those decisions compatible.
6. Existing implementation behavior must be labeled as source-confirmed, test-confirmed, or unverified; this candidate wording is not evidence that existing code enforces it.

These are candidate statements to challenge, not defaults. In particular, the first two statements must not be read as claims that a single mutation coordinator or a complete transaction boundary already exists.

## Questions requiring source and test evidence

- Is the transaction coordinator synchronous, asynchronous, or mixed? Which public mutation entrypoints reach it?
- Can event subscribers initiate nested writes? If so, what code paths and visible state result?
- Can React, Vue, Svelte, Angular, renderer services, import/export flows, or callbacks mutate a Workbook outside the intended coordinator?
- Which cell, formula, structural, sheet-directory, pivot, and metadata mutations are journaled, and which bypass it?
- Can a mutation be reentered while a batch is in progress, during rollback, or while post-commit observers run?
- What would callers observe for a rejected, queued, or serialized write: return value, promise settlement, exception, event, and ordering?
- Which guarantees are required for R1 compatibility, and which would be a deliberate Cyber Sheet design choice?

## Relationship to D1–D7

- **D2** specifies the commit point, rollback surface, and publication boundary once the concurrency/reentrancy policy is known.
- **D5** specifies event dispatch and observer-triggered writes; event order or queueing must not be inferred from the word “single writer.”
- **D6** specifies retained-reference validity through structural changes and rollback; a concurrency rule does not itself define invalidation behavior.
- D1, D3, D4, and D7 remain separate contracts. Any claimed dependency on D0 must be justified by the actual operation and evidence.

## Review decision record

```text
D0 status: proposed | approved | rejected | deferred
Decision owner and authority basis:
Date / approved decision channel:
Exact accepted or rejected contract wording:
Source paths and revision reviewed:
Tests or runtime evidence reviewed:
Known evidence gaps:
R1 compatibility rationale:
Required interaction with D2, D5, and D6:
Review prerequisite / owner / date if deferred:
Bounded implementation scope, if separately authorized:
```

Approval requirements: identify an authorized owner; verify current mutation entrypoints and nesting behavior; review compatibility and failure observations; record exact wording and date. An advisor recommendation is not formal approval. No implementation is authorized by this proposal.

## Evidence status and governance

The local WP-A-BUNDLE-02 archive is the proposed source-evidence input, SHA-256 `fd0af0729fffdea03782af46017f64977ff00c15bacb5c9e60b78588174aa1d9`, revision `88b09634f17f3b39d88a88c5428f76b426459a2b`. It has not yet been manually delivered to the approved advisor conversation, so independent review has not begun. Frozen-register source files are absent from the archive; no frozen-register content verification is claimed. D1–D7 remain `PENDING`; D0 is only proposed. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
