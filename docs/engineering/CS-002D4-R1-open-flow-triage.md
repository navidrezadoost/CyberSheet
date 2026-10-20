# CS-002D4-R1 — Open Ownership-Flow Triage

Date: 2026-10-20
Scope: bounded first-party Workbook copy-flow review with focused runtime characterization. No production changes, disposition promotions, or frozen-register edits were made.

## Constructor-service phase closure

The five-service constructor audit is closed as decision-support work. The [disposition-blocker matrix](CS-002D4-R1-constructor-service-disposition-blockers.md) records the evidence, unresolved owner-transition choices, conditional remediation, and exact-key requirements. This closes the audit phase without closing its 55 implementation records or selecting an ownership contract.

## Selected flow group: ExcelApp copy to clipboard

### Exact frozen flow keys

| Flow key | Frozen source | Operation in the caller chain | Implementation disposition |
| --- | --- | --- | --- |
| `e4ac0106c4fc4ca984ab` | `packages/react/src/components/ExcelApp.tsx:1743` | `const sheet = workbook.activeSheet` | `open-not-reconciled` |
| `342cc48e7b91de29f044` | `packages/react/src/components/ExcelApp.tsx:1746` | `performCopy(sheet, clipboardService, range, { mode })` | `open-not-reconciled` |
| `110d0fa9b80dc8294f0f` | `packages/react/src/utils/clipboardOperations.ts:82` | `clipboardService.copy(worksheet, range, mode)` | `open-not-reconciled` |
| `c8ae56ede5c1cf32dd6d` | `packages/react/src/utils/clipboardOperations.ts:84` | `payloadToPlainText(worksheet, range)` for system clipboard output | `open-not-reconciled` |

These keys form one observed source-to-output chain. The frozen flow register classifies each at the R1 view/owner boundary; the implementation ledger still leaves each individually open. No disposition is inherited from this grouping.

### First-party caller and authority trace

In `ExcelApp`, the `copySelection` callback obtains `workbook.activeSheet`, validates the selection, then calls `performCopy`. The callback is invoked by the component's keyboard handler for Ctrl+C and by its context-menu copy actions. The current `Workbook.activeSheet` getter returns `WorkbookSheetView | undefined`, so this first-party route supplies an owner-backed view rather than a raw Worksheet.

`performCopy` has a broader `Worksheet | WorkbookSheetView` parameter. It passes the supplied source to `ClipboardService.copy`, then separately builds plain text through `payloadToPlainText`. Both methods are read paths. `ClipboardService.copy` stores the resulting value/formula/style/merge snapshot as internal clipboard state; `performCopy` also requests best-effort `navigator.clipboard.writeText()` of the plain-text representation. The copy flow has no Worksheet mutation call and no application callback into the source. `ClipboardService.getPayload()` returns its payload for later paste. The payload is detached from the Worksheet, but freezing is shallow: serialized border-style subobjects remain mutable by a holder of the payload. That is a clipboard-local future-paste integrity question, not a Worksheet/Workbook alias demonstrated by this flow.

For the owner-backed route, `WorkbookSheetView.getCell()` returns a detached cell snapshot and masks cached formula values to `null` while retaining formula text; `getCellValue()` likewise returns `null` for formula cells. Consequently, the internal `all` payload may carry formula text but not the cached formula result, `values` mode omits formula results, and the plain-text external clipboard read uses the masked `getCellValue()` result. Returned clipboard content is stored or published as data, not as a Worksheet or owner capability.

### Authority assessment

| Boundary | Source finding |
| --- | --- |
| Source authority | `Workbook.activeSheet` is the owner-backed view. The component's selection callback does not retrieve raw sheet storage. |
| Internal destination | `ClipboardService.currentPayload` receives a detached snapshot. This changes service-local clipboard state only. |
| External destination | Plain text is passed to the browser clipboard API as a value string; failure is swallowed as best-effort behavior. |
| Writes and callbacks | No Worksheet write or source callback is present in this copy path. No write-entry guard is needed for the observed owner-view route. |
| Existing owner boundary | The view's ID-backed source lookup, detached `getCell()` result, and formula-value masking protect this path's owner observations. The helper itself does not dynamically classify its argument. |
| Separate raw-handle case | Because `performCopy` and `ClipboardService.copy` also accept `Worksheet`, a caller that supplied an internally adopted raw Worksheet could retain raw read semantics. No such supported first-party raw-adoption route is demonstrated by these four flow records; it is a separate owner-polymorphic input question, not a failure in the traced `Workbook.activeSheet` route. |

### Focused runtime characterization and exact-key evidence

The React test harness does not expose ExcelApp's private `copySelection` callback for direct invocation. Evidence is therefore split rather than described as one end-to-end component test:

- `e4ac0106c4fc4ca984ab`: The component test creates a real `Workbook`, captures its `activeSheet` view, selects a range through the rendered `CyberSheet` selection callback, then triggers the supported Ctrl+C keyboard action. The helper-boundary spy receives that exact active view. The formula-bearing fixture remains separate because public `Workbook.create()` has no R1 formula-write path.
- `342cc48e7b91de29f044`: The same component action invokes ExcelApp's private `copySelection` callback and the spy confirms `performCopy` receives the exact selected range and `{ mode: 'all' }`, with the current Workbook owner view. No raw Worksheet is substituted. The test mocks `CyberSheet` only to supply selection and spies at the helper boundary; ExcelApp itself is rendered and its real keyboard handler is exercised.
- `110d0fa9b80dc8294f0f`: With an explicitly labeled internal test seam (a real Worksheet internally adopted and resolved by `OwnerBackedWorkbookSheetView`), `all` mode retains formula text `40+2` with `value: null`; `values` mode omits the formula cell. A nested clipboard border mutation leaves the fixture Worksheet's style unchanged. The seam is not public Workbook construction and does not establish a public formula-bearing Workbook fixture.
- `c8ae56ede5c1cf32dd6d`: The same owner-view fixture sends only the literal `visible` through `navigator.clipboard.writeText` (`\tvisible` in the two-column range); the cached formula result is absent. Standalone Worksheet copy continues to write `42\tvisible` and retains formula text, cached value, and serialized style in its payload.

The nested border mutation was recorded separately: it changes the mutable clipboard-local payload object, but does not change the owner-view fixture's cell/style state. No paste behavior was exercised. This is evidence of source detachment for the tested cell/style state, not a general deep-immutability claim about clipboard payloads.

The focused React Jest selection passes 4/4 with default ts-jest diagnostics; React package typecheck passes; `git diff --check` passes. No broad matrix was rerun. Each of the four flow keys remains `open-not-reconciled`: the actual ExcelApp keyboard callback is now exercised for the two ingress keys, while the downstream formula fixture uses an internal test seam. The separate raw-Worksheet input branch remains unresolved. Cut, paste, and the Ribbon's independent ClipboardGroup ingress (`bf5997848c52927af634`) remain outside this bounded group.

## Governance checkpoint

The constructor-service decision-support phase is closed. This first flow group is documented without modifying any of its individual implementation dispositions. R1 remains blocked on the larger exact-key inventory of 131 module, 1,486 semantic, and 450 ownership-flow records. No owner-transition contract, production change, or ledger promotion is authorized here. R1 acceptance remains withheld.

## Separate flow group: Ribbon ClipboardGroup copy ingress

### Exact frozen flow key

| Flow key | Frozen source | Operation | Implementation disposition |
| --- | --- | --- | --- |
| `bf5997848c52927af634` | `packages/react/src/components/ribbon/ClipboardGroup.tsx:97` | `performCopy(worksheet, clipboardService, range)` | `open-not-reconciled` |

### Source trace

The bounded first-party route in ExcelApp is `ExcelApp → Ribbon → HomeTab → ClipboardGroup → performCopy`. ExcelApp renders `Ribbon` with both the `workbook` and `worksheet={workbook.activeSheet}` props. In `Ribbon`, the Home tab constructs `HomeTab` with `worksheet={workbook?.activeSheet}` and passes its `clipboardService`; `HomeTab` renders `ClipboardGroup` with that worksheet, clipboard service, current selection-derived range, and selected cells. Thus the traced ExcelApp/HomeTab route supplies the same `WorkbookSheetView` returned by `Workbook.activeSheet`, not a raw Worksheet. The Ribbon Copy button invokes `ClipboardGroup.handleCopy`; it calls `getRange()`, then `performCopy(worksheet, clipboardService, range)` with no options, so the helper defaults to `all` mode and best-effort plain-text publication. This is a distinct UI ingress from ExcelApp's keyboard callback, even though both delegate to the same helper.

There is another source callsite in `ExcelRibbon.tsx`, which also renders `ClipboardGroup`. `ExcelRibbonProps.worksheet` is declared as `Worksheet`, but no first-party in-repository caller of `ExcelRibbon` was found, and `ExcelRibbon` is not exported through the React package barrel. It is an exported component from its source module, so deep-import consumers could supply a standalone or internally retained raw Worksheet; this source trace does not establish such an external route or its owner-transition semantics. Keep that compatibility possibility separate from the observed ExcelApp/HomeTab owner-view path.

| Boundary | Source evidence | Assessment |
| --- | --- | --- |
| ExcelApp/HomeTab source | `workbook.activeSheet` flows through `Ribbon` and `HomeTab` to `ClipboardGroup.worksheet` | Owner-backed view on this first-party path |
| Copy action | ClipboardGroup Copy button calls `handleCopy`, which forwards computed range and service to `performCopy` | Same downstream helper; default mode is `all` |
| Downstream reads/output | `performCopy` calls `ClipboardService.copy` and `payloadToPlainText`; those paths were characterized separately in the ExcelApp copy review | Existing helper evidence applies to view semantics, not as runtime proof of this Ribbon action |
| Alternate `ExcelRibbon` caller | Worksheet-typed prop; no first-party in-repository caller identified | Owner origin unresolved for external/deep-import use |

### Focused Ribbon button runtime evidence for `bf5997848c52927af634`

The React regression renders the real ExcelApp, Ribbon, HomeTab, and ClipboardGroup chain. The test harness substitutes only the CyberSheet child to provide a selection through its callback, plus unrelated canvas/presentation dependencies needed to mount ExcelApp. It activates the visible Ribbon Copy button (`Copy (Ctrl+C)`), while a spy wraps the real `performCopy` implementation. The call receives the exact current `Workbook.activeSheet` view, the expected selection range, and the ExcelApp clipboard service. ClipboardGroup omits options; the real helper executes and the resulting payload reports `copyMode: 'all'`. This confirms the actual first-party Ribbon action ingress without duplicating the formula-masking tests.

The one key `bf5997848c52927af634` remains `open-not-reconciled`: runtime ingress is now established for ExcelApp's Ribbon route, while the alternate source-module `ExcelRibbon` Worksheet-typed ingress remains unresolved and downstream helper behavior has separate test contexts. The focused React Jest selection passes 5/5 with default diagnostics. No production change, implementation disposition promotion, frozen-register edit, or broad matrix run was made. Cut (`performCut`), paste (`performPasteAsync`), and the raw-Worksheet helper lifecycle remain separate groups. R1 acceptance remains withheld.
