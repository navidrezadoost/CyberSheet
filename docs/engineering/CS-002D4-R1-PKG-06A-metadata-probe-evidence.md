# CS-002D4-R1 PKG-06A — Metadata boundary probe evidence

**Lane:** A — metadata and ownership boundary.
**Probe:** `packages/core/__tests__/worksheet-comment-metadata-boundary.p1-pkg-06a.test.ts` (3 tests passed in the integrated serialized PKG-06 selection).
**Production changes:** None.

## What the probe covers

The probe deliberately separates **runtime acceptance/storage**, **read transformation**, and **persistence representation**. A successful call to a current method is not treated as proof that its input domain is part of the supported public contract.

| Value/shape | Standalone input/storage and read assertions | Workbook adoption/owner read assertions | Object/binary persistence assertions |
| --- | --- | --- | --- |
| Nested object and shared aliases | `addComment` retains the metadata object; standalone read creates a detached graph and preserves shared ordinary-object aliases. | Adoption leaves a retained comment alias pointing at stored state; owner detachment produces separate copies for two shared references. | Object snapshot shallow-copies the metadata root but retains a nested object reference. |
| Cycle | Standalone cell-read detachment preserves the tested metadata self-cycle. | Existing PKG-05 executed probe shows owner `getComments` throws `RangeError` for a cyclic graph. New probe intentionally does not obscure this by combining the cycle with other owner transformations. | Existing PKG-05 source/probe evidence states JSON encoding cycles throws; the new test asserts this behavior. |
| Date | Standalone read clones a Date occurrence; repeated references to the same Date are cloned separately, so Date alias identity is not preserved by this path. | Owner read clones Date. | Object snapshot retains the comment's Date field reference; binary JSON output decodes timestamps as strings. |
| Map / Set | Standalone read returns Map/Set instances with recursively detached entries. | Owner read converts each to an array representation. | Binary JSON serialization emits the ordinary empty-object representation for Map/Set without custom serialization. |
| Function | Standalone read retains function identity. | Owner read yields `undefined` for the function-valued metadata property. | JSON object serialization omits the function property (not a demonstrated binary graph round-trip). |
| Accessor | Standalone read copies the accessor descriptor without invoking the getter during detachment. | Owner detachment reads properties recursively, invoking the getter; test tracks the invocation. | No accessor-preserving persistence behavior is claimed. |
| Class instance | Standalone read recreates an object with its prototype. | Owner read produces a plain object. | No custom-prototype persistence behavior is claimed. |

## Evidence status and interpretation

The PKG-06A probe passed its three cases in the integrated 15-suite selection (201/201 total tests). The executed assertions confirm the standalone input/read behavior, adoption/owner-read transformations, and object/binary persistence observations listed above. They characterize current behavior; they do not define a supported API input domain. The established PKG-05 graph suite additionally records standalone cycle-preserving reads, raw caller alias retention, exact test-local reference restoration where the graph is unchanged, failure to rewind a mutated nested alias, and the owner-read `RangeError` for a cyclic comment. PKG-05's supported-graph clone helper rejecting functions, symbols, class instances, accessors, hidden properties, sparse arrays, and custom array properties was a **test oracle**, not production validation.

No production boundary was changed. Specifically, the probe does not reject values at `addComment` or adoption, introduce canonicalization, alter `WorkbookSheetView`, or change SnapshotCodec. Runtime acceptance of nested values by the current `Worksheet.addComment` spread/store path does not settle whether these values are supported API inputs. Likewise, transformed or failing owner reads are current observations, not a newly approved contract.

## Deletion-only transaction consequence

The retained-array before-image recommendation avoids graph traversal during comment deletion rollback. It therefore preserves the stored graph exactly if the delete replaces the `comments` property and no operation mutates the captured old array or descendants before restore. The policy does not repair owner-read failures, make Maps/Sets persist with their JavaScript types, or promise to reverse external in-place alias mutations. Journal/Snapshot deletion integration still requires its own authorized production package and fault-cut evidence; the current seven-operation tests do not prove that new operation.

## Files and source references

- New test-only probe: `packages/core/__tests__/worksheet-comment-metadata-boundary.p1-pkg-06a.test.ts`.
- Earlier executed probe: `packages/core/__tests__/worksheet-comment-graph.p1-pkg-05.test.ts`.
- Prior evidence report and raw output hashes: `docs/engineering/CS-002D4-R1-PKG-05B-comment-regression-evidence.md` and `docs/engineering/CS-002D4-R1-PKG-05B-jest-output.txt`.
- Current source map: `packages/core/src/types.ts:411-434`; `worksheet.ts:453-509,589-648,702-722,2993-3019,3051-3118,4168-4181`; `WorkbookSheetView.ts:5-40,105-117`; `workbook.ts:583-590,1077-1083,1091-1098`; `SnapshotCodec.ts:610-627,730-744`.

Lane A itself did not run Jest, typecheck, or sidecar operations; the coordinator later ran the integrated selection and Core typecheck as recorded in PKG-06R. No full Core suite was run. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
