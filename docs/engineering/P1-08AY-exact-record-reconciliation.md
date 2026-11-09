# P1-08AY — Parallel exact-record evidence reconciliation

## Scope and method

AY reviewed a fixed pilot of 75 distinct records selected from the AX matrix before the three lanes began: 25 Core, 25 React/renderer, and 25 examples/framework integration records. The selection inventory is `P1-08AY-selection-inventory.tsv`. Each row is joined by exact `(record_type, record_key, path)` identity. Every selected record was `open-not-reconciled` at selection time and remains unchanged in the ledger.

Each lane checked the selected source occurrence, relevant caller or initializer, owner boundary, and directly related existing test evidence. A key was not credited with evidence from an adjacent operation. The labels `reviewed`, `evidence-insufficient`, and `owner-blocked` describe this review only; they do not change the implementation ledger or frozen registers. Where prior checkpoints already reviewed the exact occurrence, lanes cited that evidence and avoided repeating the investigation.

## Consolidated results

| Lane | Selection | Reviewed | Evidence-insufficient | Owner-blocked | Focused tests |
| --- | ---: | ---: | ---: | ---: | --- |
| Core standalone/command paths | 25 | 0 | 7 | 18 | None rerun; prior exact-key command evidence cited. |
| React and renderer consumers | 25 | 13 | 2 | 10 | 3 suites, 12/12 passed: imperative owner flow, DrawingCanvas snap lifecycle, and drawing authority. |
| Examples and framework integrations | 25 | 3 | 12 | 10 | None; existing tests/checkpoint evidence cited. |
| **Total** | **75** | **16** | **21** | **38** | **Only the focused React selection ran.** |

### Lane findings

- **Core:** existing standalone command tests support the selected command-local paths, while raw `Worksheet` command entrypoints do not establish an authorized Workbook-owned command route. Eighteen selected records therefore remain owner-blocked; seven import/type occurrences lack runtime behavior to assess. Review found a source-label discrepancy for `317aaad98ce62bb63648`: the current frozen mapping and code at `ClearCellsCommand.ts:75` are `setCellFormula`, while J.06's prose called it `clearCellFormula`. AY records the discrepancy without changing the key or history.
- **React/renderer:** thirteen exact occurrences have bounded current source/test support. Two read/render paths lack a direct test. Ten mutation or event-bridge occurrences depend on the owner boundary; in particular, `rendererEventBridge.ts` is currently a no-op. The focused run passed 12/12 but does not establish all 25 records or full React acceptance.
- **Examples/integrations:** three React viewer flows had prior exact-key review and were checked against current source. Twelve more lack direct occurrence tests. Ten depend on owner-gated write or post-publication lifecycle behavior. Several selected Vue/Svelte/Angular frozen anchors have drifted: current initializers use `Workbook.create()` and reject unsupported data before publication, rather than the former `new Workbook()`/`addSheet()`/row-write path. The selected old anchors were not treated as proof that those removed calls still execute.

The lane reports contain each exact key, current source mapping, evidence references, and review label:

- [Lane A — Core review](P1-08AY-lane-a-core-review.md)
- [Lane B — React and renderer review](P1-08AY-lane-b-react-renderer-review.md)
- [Lane C — Examples and integrations review](P1-08AY-lane-c-examples-integrations-review.md)

## Smallest candidate for separate authorization

Authorize a characterization-only gate for the current empty-bootstrap and pre-publication unsupported-data guards in Vue, Svelte, and Angular. The six selected keys are:

| Framework | Empty-bootstrap flow | Unsupported-data gate |
| --- | --- | --- |
| Vue | `6259cce6d4a24bfe5859` | `4fc14dcd20ac44a9a6d4` |
| Svelte | `fe024667fe8a202eeccd` | `23922f2142e40bda34cc` |
| Angular | `15e24e21b223893dd76b` | `0ae42ec4d5dc06ff8ba8` |

The proposed gate would verify successful publication using the current empty configuration and verify that non-empty initial data rejects before Workbook/store/renderer publication in each package. It must preserve the existing gates and introduce no write route. Acceptance would require direct package-level evidence for all six keys, unchanged state on rejected initialization, and unchanged ledger dispositions. This recommendation is not implementation or test-change authorization.

Defer the 38 owner-blocked records until their named owner/lifecycle/write/event prerequisites are approved. Treat the 21 evidence-insufficient rows according to their exact lane reports; static import/type rows may need source-level reconciliation rather than runtime tests. The seven owner decisions and pinned Chromium dependency remain as recorded AX blockers and were not reopened.

## Integrity and governance

The selection inventory contains 75 unique exact identities: 25 per lane with no overlap. The review reports map one-to-one to those fixed selections. All selected records remain `open-not-reconciled`; no dispositions or frozen-register identities changed. The 2,067-row ledger, its SHA-256, frozen joins, and prior AK–AX manifest chain are preserved. Only the Lane B focused React tests ran; no full-suite run or baseline recapture was performed. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
