# CS-002D4-R1 PKG-05A — CellComment graph domain and alias evidence

**Purpose:** Source-grounded characterization for PKG-04 exact-state design.
**Baseline:** Git `88b09634f17f3b39d88a88c5428f76b426459a2b`; dirty worktree preserved.
**Scope:** Read-only source review. No production or test edits; no Jest or sidecar operations.
**Decision status:** Evidence and engineering recommendation only; no owner approval or implementation authorization.

## Finding

`CellComment.metadata` is statically declared as `Record<string, unknown>`, but neither `Worksheet.addComment` nor Workbook adoption validates, canonicalizes, or clones comment values. The effective runtime domain is therefore wider than JSON data and includes caller-held references, nested mutable objects, shared aliases, cycles, class instances, `Date`, `Map`, `Set`, accessors, and potentially functions or symbol-valued properties when callers bypass or exceed the static type. Some read and snapshot paths support only subsets of that domain, and the owner read detachment helpers are not cycle-safe.

This prevents describing all comment metadata as a plain, acyclic, serializable tree based on current source. It does not by itself prove that every such runtime value is a supported public persistence format. It does establish that existing comment entry points can store and retain several non-tree graph shapes without validation.

## Actual input and storage behavior

`CellComment` fields are `id`, `text`, `author`, optional `authorAvatar`, `resolved`, `createdAt`, `editedAt`, `parentId`, `position`, `richText`, and `metadata`. The only type constraint on metadata is `Record<string, unknown>`; nested values are unconstrained.

`Worksheet.addComment` creates a fresh outer comment object using `{ id: generatedId, createdAt: new Date(), ...comment }`, appends that object to the stored cell comment array, emits it in `comment-added`, and returns the same object reference. The `...comment` spread is shallow, so `position`, `richText`, metadata, and nested values remain shared with the input. Although the TypeScript parameter omits `id` and `createdAt`, runtime spread order means an untyped/cast input containing either property can override the generated fields; this is not otherwise validated. The `comment-added` emitter passes the event object to listeners directly, so a listener holding its payload also holds the stored comment object.

`Worksheet.updateComment` finds the ID within the addressed cell and replaces that array entry with a shallow spread of the old comment and updates, then stamps `editedAt`. Nested fields not replaced by the update remain shared with the prior comment; nested objects supplied in updates are retained by reference. It emits `comment-updated` with the newly stored object in the event payload. `Worksheet.deleteComment` replaces the comments array with a filtered array and does not mutate the removed comment objects or their nested graph.

The current backing store is `ColumnarCellStore`, not the legacy object-per-cell store. It stores cold `comments` directly in its per-row cold-field map. Its cell handle returns the stored comments reference. Worksheet public read methods layer varying detachment over that store.

## Read and alias surfaces

| Surface | Source behavior | Graph implications |
| --- | --- | --- |
| `Worksheet.getCell` standalone | `detachStandaloneCellRead` recursively copies with a `WeakMap`; arrays, Maps, Sets, Dates, own data properties and prototypes are handled. The result is frozen at object/array nodes (Map/Set copies themselves remain mutable). | Cycles and shared aliases are preserved for memoized object/array/Map/Set nodes. Date instances are cloned per occurrence rather than memoized. Accessor descriptors are copied as accessors rather than evaluated/cloned; a getter closure may still expose external state. Functions are returned unchanged. |
| `Worksheet.getCell` Workbook-owned | `detachOwnedEventValue` recursively copies/freezes, clones Dates, converts Maps and Sets to frozen arrays, and returns `undefined` for functions. It has no visited-object map. | Cycles recurse until failure; shared object references are copied repeatedly and alias identity is lost; Map/Set runtime types are not preserved. It is not a general graph-preserving clone. |
| `Worksheet.getComments` | Delegates to `getCell(address)?.comments ?? []`. | Inherits the corresponding `getCell` behavior; absence returns a fresh empty array literal. |
| `Worksheet.getAllComments` | Iterates raw CellStore handles and returns a new outer result and `comments: [...cell.comments]`. | The array is copied but contained comment objects are live stored references. Callers can mutate comment fields or nested data, including after Worksheet adoption if they retain the raw Worksheet handle. |
| `WorkbookSheetView.getComments/getAllComments` | Wraps Worksheet results in its separate `detached` helper. | Recurses without cycle memoization; repeats aliases as separate objects; Maps/Sets are wrapped as read-only facades; functions become `undefined`; cycles recurse. |
| `Worksheet.addComment` return and event | Returns the exact new stored comment object; `comment-added` carries that same object. | Direct mutable alias to the stored comment and nested fields. A retained result/payload survives later Worksheet adoption because adoption does not clone cell comments. |
| `Worksheet.updateComment` event | Emits the newly stored comment reference. | Listener receives a reference to the stored comment object; ordinary Worksheet `Emitter` does not detach event payloads. |

These are source-level observations. This checkpoint did not run a probe or tests, and does not claim browser/UI runtime behavior beyond the cited implementation.

## Adoption and cloning boundaries

`Worksheet.adoptByWorkbook` prepares detached conditional-formatting and drawing state before setting the owner marker; it does not traverse or clone CellStore contents, comments, or previously returned comment references. `Workbook.create` and the dev import attachment path both use this adoption method. Thus an object returned by `addComment` while standalone can remain an alias to the stored comment after adoption. The Workbook-owned read wrappers do not revoke that earlier reference.

`Worksheet.#cloneCell`, used by object snapshots and some cell-copy paths, clones the comments array and each top-level comment. It shallow-copies `position`, each `richText` run, and that run's style, and shallow-copies metadata with `{ ...comment.metadata }`. It retains `createdAt` and `editedAt` Date object references. It does not preserve nested metadata graph alias/cycle relationships and does not validate descriptors or prototypes.

The standalone cell-read copier is more graph-aware than snapshot/adoption clones: it has a `WeakMap` for ordinary object cycles and shared references, but returns functions unchanged and preserves accessor descriptors. The owner-facing detach helpers are not equivalent implementations and are not cycle-safe.

`SnapshotCodec` serializes comments with `JSON.stringify` and reconstructs with `JSON.parse`. This is appropriate only for JSON-compatible state: Dates become strings through JSON serialization; `undefined`, functions, symbols, shared-reference identity, Maps/Sets, custom prototypes, accessors, and cycles are not round-tripped as their original graph semantics (cycles can make encoding throw). No binary codec or adoption behavior is changed here.

## Candidate restoration policies

For clarity, this review uses these policy labels; they are analysis labels, not pre-existing owner decisions:

| Option | Policy | Compatibility / exactness assessment |
| --- | --- | --- |
| **A — Restrict and validate** | Establish a supported acyclic JSON-like metadata domain and validate/clone at ingress/adoption; reject unsupported values. | Gives a tractable recursive clone but narrows current runtime acceptance and requires an explicit compatibility decision plus coordinated ingress validation. Existing source does not already enforce it. |
| **B — General graph clone** | Define a graph-aware clone/restore contract for supported nodes, including aliases/cycles and selected built-ins/prototypes/descriptors. | Could preserve more values, but “all JavaScript values” has no complete generic clone/restore contract; functions, accessors, proxies, weak collections, host objects, and identity-bearing instances still need exclusions or custom behavior. Higher complexity than this operation. |
| **C — Operation-local retained before-image** | For deletion only, capture the target CellRecord presence and original `comments` reference before the first effective mutation; restore that reference without traversing or mutating the graph. Require comment deletion and other operations in the transaction to remain replacement-only with respect to that graph. | Best supported by the observed deletion implementation: it replaces the array and leaves its contents untouched. It naturally preserves arbitrary nested identity, aliases, cycles, prototypes, Dates, and shared references. The constraint must be explicit; if a transaction operation mutates comment nodes or array contents in place, this option no longer guarantees rollback. |

**Engineering recommendation: Option C for the bounded one-comment deletion operation.** It is the narrowest policy supported by current behavior and avoids pretending that `Record<string, unknown>` is JSON-only or designing a generic JavaScript graph serializer for one array replacement. The transaction's first before-image should preserve whether the cell existed and the exact prior `comments` property value/reference; rollback should restore it without traversing the tree. Journal and Snapshot must capture that state independently and suppress buffered events on rollback. This recommendation preserves state graph identity, not a new guarantee about arbitrary alias mutation by unrelated code during a transaction. Owner/API approval and an explicit implementation authorization are still required. If future comment operations mutate nested comments in place, revisit Option C and obtain an operation-specific graph contract before extending the transaction slice.

## Source map

- `packages/core/src/types.ts:411-438` — `CellComment` type.
- `packages/core/src/worksheet.ts:2993-3013,3025-3094` — add/get/update/delete behavior.
- `packages/core/src/worksheet.ts:453-503,1000-1015` — standalone and owner cell detachment behavior.
- `packages/core/src/worksheet.ts:702-720` — adoption clones conditional formatting/drawing, not cell comments.
- `packages/core/src/worksheet.ts:3099-3112` — raw `getAllComments` shallow array copy.
- `packages/core/src/worksheet.ts:4168-4205` — snapshot cell clone depth.
- `packages/core/src/WorkbookSheetView.ts:1-40,108-118` — owner view `detached` and comment reads.
- `packages/core/src/storage/ColumnarCellStore.ts:25-45,250-305,320-375` — cold comments storage and handle behavior.
- `packages/core/src/persistence/SnapshotCodec.ts:618-626,735-743` — JSON encoding/decoding of comments.

No production or test files were modified. No tests, typecheck, or sidecar operation was run.
