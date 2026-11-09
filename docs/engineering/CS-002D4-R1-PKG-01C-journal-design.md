# CS-002D4-R1 PKG-01C — Experimental Transaction Journal Design

**Status:** Experimental; full-snapshot remains the default and reference.
**Scope:** The five PKG-01 cell-write operations only.

## Ownership and lifetime

The Workbook owns one journal per participating Worksheet for the duration of one queued cell-write batch. The journal is created after coordinate and style preflight, lives through apply and commit/rollback, and is cleared on settlement. It is an internal capability-protected Worksheet facility; transaction callers receive neither the journal nor mutable Worksheet storage.

The internal test hook selects `snapshot` or `journal`; absent that hook, production continues through the existing full-snapshot path. No second public mutation API is added.

## Before-state and repeated writes

Before a supported Worksheet mutator changes a cell, the journal resolves the merge anchor and stores that cell's shallow record once, keyed by packed coordinate. An absent cell is recorded as absent. Later writes to the same address do not replace this first-write record. Nested values and styles are safe to retain because Workbook transaction inputs are detached/frozen and the five operations replace cell fields rather than mutating old nested data in place.

The graph journal uses first-write snapshots for graph node structure and dirty membership. Structure snapshots include formula-node membership, predecessor and successor adjacency lists, range watchers, and volatile membership. Dirty membership is recorded separately as each dirty key is first added. This avoids copying the whole graph or dirty set. Rollback restores only entries captured by graph mutation hooks.

## Formula and dependency state

Graph hooks record both endpoints before adjacency changes, the formula node before registration, its predecessor/range entry before replacement or clearing, volatile membership before changes, and dirty membership before propagation adds nodes. Formula registration can add edges to existing range watchers. Those actual affected endpoints are recorded as the graph visits them. Dirty propagation remains proportional to the reachable closure; range-watch matching may scan registered ranges under the current graph implementation. The journal does not claim constant-time dependency mutation.

Cached result values are part of the cell-record before-state. Formula text, direct edges, range watchers, volatile membership, and dirty additions are covered separately. Rollback restores cell records and then graph journal state without publishing rollback events.

## Style ownership

Workbook style preflight interns each staged style and owns one provisional reference per operation. On clean rollback, all provisional references are released while the cell journal restores original style references. On commit, each displaced style reference from buffered style-change events is released, preserving the PKG-01B leak correction. Journal entries are cleared after either outcome.

## Multi-sheet, commit, events, and lifecycle

Each participating sheet gets a journal before any sheet mutates. A failure rolls all journals back in reverse sheet order; buffered events are discarded. Successful application closes all sheet batches, marks the queue control committed, releases displaced styles, and publishes buffered events in established global order. Observer failures remain isolated after commit.

The existing queue serializes per Workbook and transaction callbacks stage writes through the supplied context. Cancellation before apply leaves no journal; disposal during apply triggers rollback before the queued operation settles. Disposal after the commit point does not reverse committed data and stops later event publication, matching the reference behavior.

## Complexity and known limits

Cell capture is O(U), where U is the number of distinct target cells. Graph capture/restoration is O(A + E_A), where A is the set of actually modified graph nodes and E_A is the adjacency state copied for those nodes, plus the existing dirty propagation and range-matching cost. A high-degree dependency node or large dirty closure can make journal work large. The current formula parser and dependency graph also have operations that scan registered range watchers/formula nodes; those costs are not removed by journaling.

This design is experimental until internal partial-mutation injection, equivalence tests, resource-ownership checks, and same-fixture performance comparisons pass. A defect in the full-snapshot reference is not treated as proof of correctness; observed divergence must be reconciled with the authorized transaction contract before any cutover recommendation.
