# CS-002D4-R1 PKG-06A — Comment metadata boundary and policy recommendation

**Scope:** Lane A source characterization and a focused, test-only runtime probe. No production/API, persistence, ledger, or contract edits.
**Decision status:** Engineering recommendation only. No owner approval or implementation authorization is asserted.

## Boundary findings

The type declaration at `packages/core/src/types.ts:411-434` defines the comment's required fields and types `metadata` as `Record<string, unknown>`. That is a compile-time shape for the outer metadata object; it does not specify which nested JavaScript values are supported by every consumer. The public source also labels `richText` as future support (`types.ts:430-431`), so its type presence alone does not establish a complete behavior contract.

| Boundary | Current behavior established by source | Accepted at runtime vs supported contract |
| --- | --- | --- |
| Standalone Worksheet storage | `addComment` shallow-spreads the input, appends the resulting object, emits it, and returns the same stored object (`worksheet.ts:2993-3013`). Nested metadata and other nested fields remain shared. No runtime schema validation is performed there. | The implementation accepts arbitrary nested values supplied at runtime, including values that exceed the static type. This is not a promise that every JavaScript value is a supported API input. |
| Standalone Worksheet reads | `getComments` reads through `getCell` (`worksheet.ts:3016-3019`). Standalone `getCell` uses a memoized copy for object/array/Map/Set nodes, preserves tested cycles and shared aliases, preserves prototypes and accessor descriptors, retains function identity, and clones each Date occurrence (`worksheet.ts:469-509`). | These are observed copy semantics, not a published guarantee that the full JavaScript graph is supported. Map/Set copies remain mutable even though surrounding object/array nodes are frozen. |
| Workbook adoption | `adoptByWorkbook` clones conditional-formatting and drawing state, then changes ownership; it does not traverse or validate CellStore comment data (`worksheet.ts:702-722`). The internal dev-import path attaches via adoption (`workbook.ts:1077-1083,1091-1098` and `worksheet.ts:4297`). | Values already stored are retained; adoption does not make unsupported values valid or canonical. A returned pre-adoption comment reference remains an alias. This is especially relevant to the internal import path and is not an endorsement of that alias lifetime as a public contract. |
| Workbook-owned comment reads | Worksheet owner detachment transforms functions to `undefined`, Dates to new Dates, Maps/Sets to arrays, and recursively copies/freeze ordinary values without cycle memoization (`worksheet.ts:453-463`). `WorkbookSheetView` adds another recursive detach for `getComments` and `getAllComments` (`WorkbookSheetView.ts:5-40,110-117`). | A value may be storable while not safely readable through the owner view. Cycles can throw `RangeError`; shared aliases are duplicated; some value kinds are transformed. Current behavior is not a coherent metadata-domain contract. |
| Transaction internal cell state | Journal captures a shallow cell before-image once per address and restores a shallow cell copy (`worksheet.ts:589-597,639-648`). Snapshot captures cell records with `{ ...cell }` and restores with `{ ...cell }` (`worksheet.ts:893-909,929-942`; workbook dispatch at `workbook.ts:583-590`). | Both current strategies retain the same `comments` array reference in their shallow cell copy. This is source evidence for the existing seven-operation cell before-image only. It is not tested or authorized evidence that a new comment deletion operation is integrated correctly. |
| Object snapshots | `#cloneCell` creates new top-level comment objects and arrays, copies position/rich-text/style and metadata only shallowly, and retains the Date fields by reference (`worksheet.ts:4168-4181`). | Object snapshot cloning does not preserve or normalize arbitrary nested metadata graphs as an independent graph copy. |
| Binary persistence | SnapshotCodec encodes comments via `JSON.stringify` and decodes via `JSON.parse` (`SnapshotCodec.ts:610-627,730-744`). | JSON-representable values can round-trip according to JSON behavior, not JavaScript identity. Dates stringify to text; Map/Set have no entries in ordinary JSON serialization; undefined/function/symbol properties are omitted or normalized; cycles make encoding fail. This is a persistence limitation, not a storage ingress validator. |

## Recommended deletion-only policy

For a separately authorized one-comment deletion operation, retain the target cell's presence and the original `comments` array reference once before the first effective replacement, then restore that reference without traversing the graph. This is PKG-05 Policy C. The existing standalone `Worksheet.deleteComment` builds replacement arrays with `filter`, does not mutate the old collection or comment nodes in place, and sets the new field to `undefined` when empty (`worksheet.ts:3051-3093`).

This policy can preserve cyclic metadata, shared aliases, Dates, Maps/Sets, functions, accessors, and class instances **as stored graph state** because it does not inspect or clone that graph. It does not make those values safe for owner reads, snapshots, or binary persistence. A PKG-05 executable test already demonstrated exact array/node/alias/cycle restoration in a test-local model when no nested mutation occurs, and separately demonstrated that reference restoration cannot rewind an in-place mutation through a retained alias (`worksheet-comment-graph.p1-pkg-05.test.ts`, summarized in PKG-05B).

The key precondition is strict: between capture and restoration, the operation may replace the comments property but must not mutate the captured array or any node reachable from it. A caller-held pre-adoption alias can mutate stored state outside that short synchronous transaction window. If future transactional operations edit comments in place, the retained-reference policy is insufficient and needs a separate contract and before-image design.

## Recommendation and unresolved contract questions

Do not reject, normalize, or deep-copy metadata at adoption as part of PKG-06. Such a change would alter existing runtime acceptance and caller alias behavior without an approved contract. Do not claim all accepted runtime values are supported across the public API.

Before Workbook-owned deletion implementation, the authorized owners should decide:

1. Which nested metadata kinds are supported at Workbook-owned read and persistence boundaries, including cycles, shared aliases, Date, Map/Set, functions, accessors, and class instances.
2. Whether pre-adoption aliases retained through the internal import flow are outside the supported caller contract, and what ownership transition is promised.
3. Whether deletion-only exact restoration may rely on replacement-only mutation of the comments reference for the complete transaction window.

No changes to standalone `addComment`, adoption, owner detachment, SnapshotCodec, or the seven-operation transaction API are proposed here. Overall CS-002D4-R1 acceptance remains **WITHHELD**.

## Source and probe references

- `packages/core/src/types.ts:411-434` — `CellComment` and metadata type.
- `packages/core/src/worksheet.ts:453-509,589-648,702-722,2993-3019,3051-3118,4168-4181` — detachters, before-images, adoption, comment APIs, object snapshot clone.
- `packages/core/src/WorkbookSheetView.ts:5-40,105-117` — owner-view recursive detachment and comment reads.
- `packages/core/src/workbook.ts:583-590,1077-1083,1091-1098` — Snapshot capture dispatch and internal import path reference.
- `packages/core/src/persistence/SnapshotCodec.ts:610-627,730-744` — binary JSON behavior.
- Existing executed graph evidence: `packages/core/__tests__/worksheet-comment-graph.p1-pkg-05.test.ts` and `docs/engineering/CS-002D4-R1-PKG-05B-comment-regression-evidence.md`.
- New, not-yet-executed probe: `packages/core/__tests__/worksheet-comment-metadata-boundary.p1-pkg-06a.test.ts`. It makes the storage/read/adoption/persistence observations executable; this lane did not run Jest because the coordinator is integrating parallel lanes serially.
