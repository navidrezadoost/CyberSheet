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

There is another source callsite in `ExcelRibbon.tsx`, which also renders `ClipboardGroup`. `ExcelRibbonProps.worksheet` is declared as `Worksheet`. The component is not exported by `packages/react/src/components/ribbon/index.ts` or the React root barrel, but is exported by its own source module. `examples/react-canvas-viewer.tsx` imports it directly from source and passes `activeSheet`, derived from `workbook.getSheet(sheetName)`; the Workbook getter returns `WorkbookSheetView`. A reachability qualification applies: repository search found no checked-in HTML or module importer for `react-canvas-viewer.tsx`, so no active in-repository entrypoint was found that runs this source path. Also, the R6 gate is environment-dependent: `vite.config.ts` defines `__CYBER_SHEET_DEV__` as true in development, so a deliberately used Vite development entry allows `loadXlsxFromUrl()` to continue (the default XLSX asset exists); the production-mode default remains gated unless the enable environment flag is set. Thus the source route is not presently wired into an app entry, while its loader is not blocked by R6 in Vite development. The direct-source module export also permits consumers to pass standalone Worksheets; whether that standalone compatibility path is a supported package contract is not established by the package barrels or this example. No supported caller supplying a retained raw Worksheet across adoption was found.

| Boundary | Source evidence | Assessment |
| --- | --- | --- |
| ExcelApp/HomeTab source | `workbook.activeSheet` flows through `Ribbon` and `HomeTab` to `ClipboardGroup.worksheet` | Owner-backed view on this first-party path |
| Copy action | ClipboardGroup Copy button calls `handleCopy`, which forwards computed range and service to `performCopy` | Same downstream helper; default mode is `all` |
| Downstream reads/output | `performCopy` calls `ClipboardService.copy` and `payloadToPlainText`; those paths were characterized separately in the ExcelApp copy review | Existing helper evidence applies to view semantics, not as runtime proof of this Ribbon action |
| Alternate `ExcelRibbon` source | `react-canvas-viewer.tsx` passes a `workbook.getSheet()` view to the direct-source component, but the viewer file has no checked-in HTML/module importer; Vite development sets `__CYBER_SHEET_DEV__` true, while production defaults the import gate closed | Potential owner-view source route if deliberately used; no current app entrypoint or runtime proof; production gate remains a limitation |

### Focused Ribbon button runtime evidence for `bf5997848c52927af634`

The React regression renders the real ExcelApp, Ribbon, HomeTab, and ClipboardGroup chain. The test harness substitutes only the CyberSheet child to provide a selection through its callback, plus unrelated canvas/presentation dependencies needed to mount ExcelApp. It activates the visible Ribbon Copy button (`Copy (Ctrl+C)`), while a spy wraps the real `performCopy` implementation. The call receives the exact current `Workbook.activeSheet` view, the expected selection range, and the ExcelApp clipboard service. ClipboardGroup omits options; the real helper executes and the resulting payload reports `copyMode: 'all'`. This confirms the actual first-party Ribbon action ingress without duplicating the formula-masking tests.

The one key `bf5997848c52927af634` remains `open-not-reconciled`: runtime ingress is established for ExcelApp's Ribbon route. Source review also found the direct-source `ExcelRibbon` caller in `examples/react-canvas-viewer.tsx`; its source value is a Workbook view. Repository search found no checked-in entrypoint importing that viewer file. If used in Vite development, the `__CYBER_SHEET_DEV__` define enables its XLSX loader; production mode defaults to the closed import gate. The component's direct-source Worksheet prop leaves standalone compatibility available, while package-barrel reachability and any supported raw-Worksheet owner-transition path remain unestablished. The focused React Jest selection passes 5/5 with default diagnostics (reported for the prior runtime checkpoint; not rerun for this source review). No production change, implementation disposition promotion, frozen-register edit, or broad matrix run was made. Cut (`performCut`), paste (`performPasteAsync`), and the raw-Worksheet helper lifecycle remain separate groups. R1 acceptance remains withheld.

## ExcelApp cut-to-clipboard source-only triage — 2026-10-22

### Exact frozen keys

| Boundary | Frozen key(s) | Source role | Current disposition |
| --- | --- | --- | --- |
| `ExcelApp.cutSelection()` sheet acquisition | `10fc3bb600248533178a` | Reads `workbook.activeSheet` for the first-party cut callback | `open-not-reconciled` |
| Context-menu construction and cut callback | `be4caa1a6c1d27add28e`, `ae7e03dd51a121ef2f95`, `e1a6d70a1d4159a9e8ed`, `eeecbc6584ad491b3186`, `5fb3eec44001ec5f2d32` | Captures the workbook sheet and closes over `cutSelection()` for Cut/Cut Values actions | `open-not-reconciled` |
| `performCut()` call | `c527e914988bdaa9d662` | Delegates the normalized selection and mode to the shared helper | `open-not-reconciled` |
| Keyboard Ctrl+X ingress | `4e20e763710d448d4a3d`, `a8bec3be5dcab6730368` | Reads the active view and routes Ctrl+X to `cutSelection()` | `open-not-reconciled` |
| Shared helper clipboard snapshot and plain-text publication | `9b76ad9828df3e8123a2`, `4c685ba670d783ef2052` | Calls `ClipboardService.cut()` then reads plain text and attempts system clipboard publication | `open-not-reconciled` |

### Source trace and limits

The ExcelApp keyboard and context-menu paths converge on `cutSelection()`. With a valid selection, it obtains `workbook.activeSheet`, normalizes the range, and calls `performCut()`. `Workbook.activeSheet` returns `WorkbookSheetView`. `performCut()` immediately calls `requireStandaloneWorksheet()`; that guard throws when the sheet has a `workbookId`, which the owner view exposes. Therefore the first-party Workbook-view path rejects before `ClipboardService.cut()`, before `payloadToPlainText()` or the best-effort `navigator.clipboard.writeText()`, and before `setCutRange()`. Ctrl+X has already called `preventDefault()` before invoking this path. No cell mutation is attempted in `cutSelection()` or `performCut()`, so this is preflight rejection, not a rejected Worksheet write.

For a standalone `Worksheet`, the guard passes. The helper first creates and stores a detached clipboard payload with `isCut: true`, then separately derives plain text from `getCellValue()` and attempts system clipboard publication. The system clipboard write is best-effort; failure is swallowed, while the internal payload has already been stored. Neither `ClipboardService.cut()` nor `performCut()` clears cells: the source says cut staging does not mutate the Worksheet. `setCutRange()` only runs after staging returns and tracks the UI cut outline.

A retained raw `Worksheet` adopted after construction is a separate conditional input. The guard checks for the view-specific `workbookId` property, while raw Worksheet ownership is stored in ECMAScript-private `#ownedByWorkbook`; adoption also prevents adding new properties. Thus a retained raw Worksheet can pass this structural guard after adoption, and this helper would read through its raw `getCell()`/`getCellValue()` methods before publishing the payload/text. This source trace identifies a possible raw-handle read disclosure at the helper boundary; it does not find an ExcelApp path supplying such a retained raw handle. The first-party ExcelApp source supplies `Workbook.activeSheet`, the owner view.

Ribbon `ClipboardGroup` cut is a separate ingress (`289ea8864d96f7c12faf`) that shares `performCut()` but has its own caller boundary; the already characterized Ribbon Copy key `bf5997848c52927af634` does not reconcile it. Paste is separate as well: `performPasteAsync()` has its own view guard and later invokes `PasteCommand`; its records (`cbd3e633229fb1981775`, `fe29cf47a6ac21f9e72c`, `c9f6edeac6ede11aa788`, and `58adea2e127f7a8bbf19`) are not closed by this cut trace. The raw Worksheet constructor lifecycle remains a separate contract question.

At the source-only checkpoint, all listed records remained `open-not-reconciled`; no cell-write bypass was demonstrated on the first-party owner-view path, and no supported retained-raw ExcelApp path was found. No tests were run at that checkpoint, and no production code or frozen register was changed. The subsequent runtime follow-up is recorded below. R1 acceptance remains withheld.

### Keyboard Cut runtime follow-up — 2026-10-22

The focused test renders ExcelApp with a real `Workbook.create()` workbook, selects `{ start: { row: 1, col: 1 }, end: { row: 1, col: 2 } }`, and dispatches Ctrl+X through the real keyboard listener. A spy wraps the real `performCut()` and confirms the exact current `workbook.activeSheet` view, range, and `{ mode: 'all' }` options. Before delegating to the real helper, the spy seeds the ExcelApp-owned clipboard service with a pre-existing copy payload.

The real helper rejects at `requireStandaloneWorksheet()`. The keyboard event has `defaultPrevented === true`; `dispatchEvent()` returns `false` and does not synchronously throw. The rejection is surfaced as one `window` error event containing the workbook-owned-operation error. `ClipboardService.cut()` is not called, the owner view's `getCellValue()` is not called, `navigator.clipboard.writeText()` is not called, and the same pre-existing payload object remains current. With the fake renderer already ready, no cut overlay appears, confirming `setCutRange()` did not publish state. The `getCellValue()` spy plus helper call order establishes `payloadToPlainText()` was not reached; no production seam was added for spying on its module-local call.

A separate standalone `performCut()` test verifies the helper stores an `isCut: true` payload, writes the expected plain text, and leaves the source cell unchanged. It does not exercise retained raw Worksheets after adoption.

At the keyboard-Cut runtime checkpoint, evidence was recorded only for semantic keys `10fc3bb600248533178a` and `4e20e763710d448d4a3d`, and flow keys `c527e914988bdaa9d662`, `a8bec3be5dcab6730368`, `9b76ad9828df3e8123a`, and `4c685ba670d783ef2052`. These six records remain `open-not-reconciled`. Context-menu records, Ribbon Cut, retained-raw lifecycle, and paste remain open and separate. The ledger then had 2,067 unique records and SHA-256 `66112d22f79feecd6c27df61d7f02318ffd6b515f0f75079e268ddcf033e1e82`. Focused React Jest passed 2/2 with default diagnostics; React package typecheck passed. No production or frozen-register changes or disposition promotions were made at that checkpoint; no broad matrix was run. R1 acceptance remains withheld.

## Ribbon ClipboardGroup Cut source-only triage — 2026-10-22

### Exact frozen flow key

| Flow key | Frozen source | Operation | Current disposition |
| --- | --- | --- | --- |
| `289ea8864d96f7c12faf` | `packages/react/src/components/ribbon/ClipboardGroup.tsx:83` | `performCut(worksheet, clipboardService, range)` | `open-not-reconciled` |

### ExcelApp → Ribbon → HomeTab → ClipboardGroup

ExcelApp supplies the Workbook and its active sheet to `Ribbon`. On the Home tab, `Ribbon` passes `workbook?.activeSheet` and the application's `clipboardService` to `HomeTab`. `HomeTab` derives a normalized range from its selection and converts it to selected addresses; when the Home Clipboard group is enabled and both worksheet and clipboard service exist, it renders `ClipboardGroup` with the worksheet, range, and addresses. For this route the worksheet is the owner-backed `WorkbookSheetView`. The Cut button is enabled when selected addresses exist.

`ClipboardGroup.handleCut()` gets the current range (preferring the supplied range, normalizing it again), returns without action if no range exists, then calls `performCut(worksheet, clipboardService, range)` without options. The helper therefore uses its default `all` mode. `performCut()` immediately applies `requireStandaloneWorksheet()`; the owner view's `workbookId` causes rejection before `ClipboardService.cut()`, the plain-text cell reads, or browser clipboard write.

There is no `ClipboardGroup` state update before the helper call. After a successful return it would set `clipboardHasContent`, invoke optional cut and completion callbacks, call `onAfterClipboard`, and add a temporary body pulse class. On ExcelApp's `HomeTab` route, `onAfterClipboard` is wired to the Ribbon's redraw callback; `onCut` and `onCutComplete` are not supplied. Since the owner-view helper rejects, none of those state updates, callbacks, or DOM class/timer effects execute. The group has no catch or user-facing error handling. Unlike keyboard Ctrl+X, this click handler does not call `preventDefault()` and does not call ExcelApp's `setCutRange()` at all. These are source findings only; no Ribbon Cut runtime characterization was run.

### Separate direct-source `ExcelRibbon` route and R6 qualification

`ExcelRibbon` also renders `ClipboardGroup` directly, but it creates its own `ClipboardService` and its handler supplies `onCut={handleStyleChange}`. Its `worksheet` prop is typed `Worksheet`; `examples/react-canvas-viewer.tsx` obtains `activeSheet` from `workbook.getSheet(sheetName)` (an owner-backed view) and passes it to the component. When that view is present, the component's `FormattingController` constructor merely retains the argument and its Home-tab condition can render `ClipboardGroup`; the cut button receives the `cells` array and the group derives its range from those addresses. In the example, no `selectedCells` prop is passed, so `cells` defaults to the current `selectedCell` and the cut range is one cell. The group again omits cut options, so the helper defaults to `all`; `onCut` and the group's later state changes follow only if the helper returns.

This direct-source call is not currently wired to a checked-in app entrypoint: repository search found no HTML or module importing `react-canvas-viewer.tsx`. The previous statement that R6 always blocks this source path needs qualification. `packages/io-xlsx/src/index.ts` enables import when `__CYBER_SHEET_DEV__` is true, and `vite.config.ts` sets it true in development; the example's default XLSX asset exists in `public/`. Thus a deliberately used Vite development entry can pass the loader gate. Production mode sets the flag false and, with the import enable variable absent, the loader throws before `setWorkbook()`. This remains an entrypoint/mode-dependent reachability limit, and no runtime result is claimed.

The first-party ExcelApp Ribbon route has a meaningful handler distinction from the already tested keyboard path: it has no `try/catch`, no keyboard default-prevention step, and no `setCutRange()` call; its local clipboard state and callbacks are all after the shared helper. A separate runtime characterization, if later authorized, should observe the Ribbon click's error reporting and verify those post-helper effects remain untouched on rejection. The present source review found no state mutation before the guard. Only flow key `289ea8864d96f7c12faf` received source evidence; it remains `open-not-reconciled`. The ledger has 2,067 unique records, 1,908 open records, and 20 partial owner splits; current SHA-256 is `0e45ab52f0bbfcfad0bc3c995074dda6c90de960e2e93317c7753b2ebf337ada`. No tests, production changes, frozen-register edits, or disposition promotions were made. R1 acceptance remains withheld.

### Focused ExcelApp Ribbon Cut runtime follow-up — 2026-10-22

The focused React regression reuses the existing real ExcelApp, Ribbon, HomeTab, and ClipboardGroup harness; only CyberSheet and unrelated canvas/presentation dependencies are mocked. Selecting the range enables the visible Cut button. Clicking it invokes the real `performCut()` with the exact current `workbook.activeSheet` view, the selected `{ start: { row: 1, col: 1 }, end: { row: 1, col: 2 } }` range, and the ExcelApp-owned `ClipboardService`. ClipboardGroup supplies no options; the standalone helper case now confirms omitted options produce the default `all` mode. The owner-view call rejects in the helper preflight before that mode is applied.

The test captures the actual React/jsdom behavior: `fireEvent.click()` returns `true`, does not throw synchronously, and React reports the handler rejection through one `window` error event. The test listener prevents the browser's default error reporting only to capture that event; ExcelApp and ClipboardGroup have no local error handler. The error contains the workbook-owned-operation rejection.

The preexisting payload seeded in the actual service passed by ExcelApp remains the same object. `ClipboardService.cut()`, the owner view's `getCell()` and `getCellValue()`, and `navigator.clipboard.writeText()` are not called. Post-success effects remain absent: the Paste button stays disabled, the HomeTab redraw callback emits no renderer event, and `clipboard-action-pulse` is not added to `document.body`. The test observes those effects without adding production seams.

Focused Jest passes 3/3 with default `ts-jest` diagnostics; the React package typecheck and `git diff --check` pass. Evidence is updated only for flow key `289ea8864d96f7c12faf`; its implementation disposition remains `open-not-reconciled`. The ledger has 2,067 unique records, 1,908 open records, and 20 partial owner splits; current SHA-256 is `b5b141107ac4c70bb29f2eae82003ad5003ceb2ea0e5482cc0fd1fec21459b62`. `ExcelRibbon`, context-menu Cut, retained raw Worksheet lifecycle, and paste remain outside this test. No production change, frozen-register edit, or disposition promotion was made; R1 acceptance remains withheld.

## ExcelApp Paste source-only triage — 2026-10-22

### Frozen-key source verification

I checked the four implementation-flow keys against their recorded path and source anchor before tracing them. The three `clipboardOperations.ts` call anchors remain literal matches at shifted live lines. The frozen one-line `ClipboardGroup.tsx` anchor has since been reformatted as a multiline call; its current `handlePaste()` invocation is at live line 149 and is identified by surrounding handler context, not a literal anchor match. The recorded source-line values were not rewritten:

| Frozen flow key | Recorded location and anchor | Current source location / role | Disposition |
| --- | --- | --- | --- |
| `cbd3e633229fb1981775` | `ClipboardGroup.tsx:110`, async `performPasteAsync(worksheet, commandManager, clipboardService, range.start)` | `ClipboardGroup.tsx:149`; Ribbon Paste callback | `open-not-reconciled` |
| `fe29cf47a6ac21f9e72c` | `clipboardOperations.ts:139`, `applyPastePayload(..., payload, ...)` | `clipboardOperations.ts:142`; synchronous `performPaste()` helper | `open-not-reconciled` |
| `c9f6edeac6ede11aa788` | `clipboardOperations.ts:156`, `applyPastePayload(..., internalPayload, ...)` | `clipboardOperations.ts:160`; internal-payload branch of `performPasteAsync()` | `open-not-reconciled` |
| `58adea2e127f7a8bbf19` | `clipboardOperations.ts:166`, `applyPastePayload(..., externalPayload, ...)` | `clipboardOperations.ts:170`; system-clipboard payload branch of `performPasteAsync()` | `open-not-reconciled` |

No frozen register or source-line field was changed. In particular, `fe29...` is not a delegation from `performPasteAsync()`: it belongs to the separate synchronous helper. A repository search found no production caller of that synchronous helper; its source-level consumer contract remains unresolved.

### First-party ExcelApp keyboard Paste path

`ExcelApp.pasteAtSelection()` reads `workbook.activeSheet` and passes it to `performPasteAsync()` with `selection.start` as the target and options containing the renderer plus `onCutComplete: () => setCutRange(null)`. `Workbook.activeSheet` supplies a `WorkbookSheetView`. The helper's first operation is `requireStandaloneWorksheet(sheet)`, which checks for the view's `workbookId` and throws for this owner view. Because `performPasteAsync()` is `async`, the guard failure becomes a rejected Promise.

The guard runs before `ClipboardService.getPayload()`, before `readSystemClipboardText()`, before `PasteCommand` construction or `CommandManager.execute()`, and before any Worksheet cell read or write. Thus, on this owner-view path, neither an internal payload nor system clipboard content is inspected or cleared; no paste command, undo/history operation, worksheet event, renderer invalidation/redraw, or `setCutRange(null)` callback occurs. The keyboard handler calls `preventDefault()` and discards the returned Promise with `void`. No local catch is present in `pasteAtSelection()` or its key handler, and no React package `unhandledrejection` handler was found; actual browser reporting remains untested.

The Ribbon's global shortcut registry also observes Ctrl+V and prevents the browser default, but its registered handler only logs the selection; source identifies ExcelApp's own key handler as the one that calls `pasteAtSelection()`. This is a source distinction, not a runtime characterization.

### Separate context-menu and Ribbon Paste routes

The ExcelApp context-menu Paste action calls the same `pasteAtSelection()` helper path and reads its range from `contextMenuSelectionRef.current`. Opening the menu stores a renderer selection reference and separately records the hit-tested cell; Paste uses the captured range's `start`, not that clicked-cell target. In-range right-click updates `selectedCell` without changing the captured range. The selected range/address objects are not cloned or frozen at this site. ContextMenu invokes the Paste callback and closes synchronously without awaiting its discarded Promise. ExcelApp clears menu/layout, clicked-cell target, and mini-toolbar state, but leaves the selection ref and selected cell unchanged. The shared owner-view preflight precedes clipboard lookup; the context-menu UI and payload effects are source-only, not runtime-tested.

The HomeTab Ribbon button is a separate `ClipboardGroup.handlePaste()` path: HomeTab supplies the active view, and the handler uses the normalized current range's start address. It calls `performPasteAsync()` without options, then runs `onPaste` and `onAfterClipboard` only on fulfillment; it has no rejection handler. Its local `clipboardHasContent` starts false. Owner-view Copy can complete through `performCopy()` and `ClipboardService.copy()`, after which the group sets this flag true; owner-view Cut rejects at `requireStandaloneWorksheet()` before setting it. Therefore Paste is not disabled in every reachable owner-view state: a successful group Copy enables the button, but clicking it still reaches the async owner preflight and rejects before clipboard lookup or command execution. The handler also supports a separate standalone Worksheet path. The direct-source `ExcelRibbon` consumer is separately traced below.

### Standalone and retained-raw boundaries

For standalone inputs, `performPasteAsync()` proceeds to inspect the internal payload; if absent, it reads system clipboard text, constructs an external payload, then calls `applyPastePayload()`. That path constructs `PasteCommand` and executes it before renderer invalidation, cut-outline completion, or redraw. This is source behavior only; no standalone runtime case was run in this triage.

The synchronous `performPaste()` helper is a separate source boundary: it reads an internal payload and calls `applyPastePayload()` without the async helper's `requireStandaloneWorksheet()` preflight. No first-party production caller or React package-barrel export was found; standalone behavior and any direct-source consumer contract remain separate. If a direct caller supplies a retained raw adopted Worksheet, the helper's `Worksheet` parameter accepts it and the same pre-execute PasteCommand target snapshot/log path is reached; this possibility is not runtime-characterized.

A retained raw Worksheet adopted after construction is another distinct conditional path. The async guard checks the view's public `workbookId`, while adoption state is held privately on Worksheet, so a retained raw instance appears to pass that structural check. If an internal payload exists, or after the external-text branch creates a payload, `applyPastePayload()` evaluates `new PasteCommand(...)` before calling `CommandManager.execute()`. The PasteCommand constructor captures target state using `getMergedRangeForCell()` and `getCell()` and logs `cell?.value` in its captured-snapshot details. Adopted Worksheet `getCell()` detaches the returned record, but its detacher preserves primitive values; if a formula result is stored in `Cell.value`, the snapshot/log path therefore carries that value. This is a conditional source-level read/disclosure candidate through a retained raw handle; it is not the traced first-party ExcelApp view path, has no runtime characterization, and establishes no successful owner write. A separately authorized raw-handle runtime characterization would be needed to establish the behavior; no such test was added here.

The four specified keys remain `open-not-reconciled`; no tests were run, and no production code, frozen register, or disposition was changed. The prior first-party Ribbon Cut characterization is accepted as a bounded test result and remains disposition-open. At this source-only checkpoint the ledger had 2,067 unique records, 1,908 open records, and 20 partial owner splits; its SHA-256 was `07f7923528b2c7939bdb9edfa83077b30d3f672875d1c2bd11345fd77d6c32c2`. R1 acceptance remains withheld.

## ExcelApp keyboard Paste runtime characterization — 2026-10-22

The focused React regression renders the real `ExcelApp` with a real `Workbook.create()` workbook, selects the two-cell range, and dispatches Ctrl+V through the application's keyboard listener. A spy wraps and invokes the real `performPasteAsync()`. At that boundary it observes the exact active `WorkbookSheetView`, command-manager interface, ExcelApp-owned `ClipboardService`, `{ row: 1, col: 1 }` target, renderer invalidation/redraw methods, and cut-completion callback.

The test stages an existing `isCut: true` internal payload using a separate standalone Worksheet. With the owner view passed to the real helper, the rejection is captured before `ClipboardService.getPayload()`, system `readText()`, owner-view or Worksheet cell/merge reads, PasteCommand construction/command execution, Worksheet events, history changes, completion callback, renderer invalidation, or redraw. The exact payload object remains installed. The keyboard event is default-prevented, `dispatchEvent()` returns false, and no synchronous exception is thrown.

The ExcelApp handler still discards its outer async Promise. To avoid an unhandled rejection terminating Jest/jsdom, the test-only helper spy observes the real helper rejection and returns a caught wrapper Promise to that outer handler. This does not establish how a real browser reports the production UI's discarded Promise; browser-level `unhandledrejection` behavior remains unverified. It also does not exercise an empty internal clipboard/external-text attempt, context-menu Paste, Ribbon Paste, standalone Paste, or retained-raw adoption.

Runtime evidence applies to the exact ExcelApp keyboard active-sheet occurrence, semantic key `4e20e763710d448d4a3d`, and flow key `a8bec3be5dcab6730368`; it also characterizes the internal-payload async boundary key `c9f6edeac6ede11aa788` as rejected before payload lookup/delegation. The separate external-payload branch `58adea2e127f7a8bbf19`, synchronous helper `fe29cf47a6ac21f9e72c`, and Ribbon ingress `cbd3e633229fb1981775` receive no runtime evidence from this test. All four Paste flow dispositions remain `open-not-reconciled`; no disposition was promoted.

The focused React Jest selection passes 4/4 with default `ts-jest` diagnostics, and the React package typecheck and `git diff --check` pass. The ledger still has 2,067 unique records, 1,908 open records, and 20 partial owner splits; its updated SHA-256 is `0780709dcbf36b667da720533640171a57a1319b7263d40fa98b8dd8a9fa252a`. No production change, frozen-register edit, disposition promotion, or broad matrix run was made. R1 acceptance remains withheld.

### ExcelApp context-menu Paste source-only follow-up — 2026-10-22

The right-click handler assigns `contextMenuSelectionRef.current` from the first value returned by `renderer.getSelections()`, falling back to `renderer.selection` or React `selection`. `CanvasRenderer.getSelections()` and `ExcelRenderer.getSelections()` shallow-copy their selection arrays only; ExcelApp retains the selected range object and nested address objects without cloning/freezing them. The listener separately stores the hit-tested cell in `contextMenuTargetCellRef`. If the hit is inside the captured range, it updates `selectedCell` without shrinking or replacing that range.

The context-menu Paste item reads `contextMenuSelectionRef.current` and calls `pasteAtSelection()` with that range. `pasteAtSelection()` resolves the then-current `workbook.activeSheet` and sends `sel.start` as the paste anchor to `performPasteAsync()`. The clicked-cell target is not used by Paste. This selection-ref route is distinct from keyboard Paste's React selection argument, while both routes pass the owner-backed active view through the same helper guard.

For a Workbook view, the shared async helper rejects at `requireStandaloneWorksheet()` before `getPayload()` or external `readText()`. Therefore source predicts the context-menu route does not inspect or mutate an existing clipboard payload, construct a PasteCommand, or reach command/renderer/completion effects. The menu callback uses `void pasteAtSelection(...)`; ContextMenu invokes it and then calls `onClose()` synchronously without awaiting the rejected Promise. ExcelApp's close handler clears context-menu state/layout, `contextMenuTargetCellRef`, and mini-toolbar state. It leaves both `contextMenuSelectionRef` and `selectedCell` unchanged. Thus source makes menu closure independent of rejection, but context-menu runtime behavior and browser Promise reporting remain unverified.

Exact frozen implementation records reviewed for this trace are flow keys `eeecbc6584ad491b3186` (menu-item builder), `5fb3eec44001ec5f2d32` (builder's active-sheet gate), `7143e44f12b80cceb463` (shared active-sheet resolution), `e165e1da47de6262e80f` (helper delegation), and `c9f6edeac6ede11aa788` (async internal-payload branch after preflight). The frozen records have no dedicated entries for the right-click selection/hit-test site, ContextMenu's item dispatch, or ExcelApp's close handler; those were source-inspected without assigning invented keys. The existing helper-level Ctrl+V test does not establish context-menu clipboard preservation or state cleanup at runtime. This is a UI selection/menu lifecycle boundary, not a demonstrated new Workbook authority path. No runtime regression, production change, frozen-register change, or disposition promotion was made; all five affected implementation records remain `open-not-reconciled`. The ledger remains at 2,067 unique records, 1,908 `open-not-reconciled`, and 20 `partial-owner-split`; its SHA-256 is `d11ffa0dfc5a3ceab192cdc9194f0bf1ad51759a8525ddf79e309da92a414ca9`. `git diff --check` passes. R1 acceptance remains withheld.

### ExcelApp context-menu Paste runtime characterization — 2026-10-22

Two focused regressions were added to `packages/react/src/__tests__/clipboard-cut-owner-flow.r1.test.tsx`. They render the real ExcelApp with `Workbook.create()` and extend only the mocked CyberSheet renderer with a canvas, selection query, and right-click hit test. The primary case dispatches a real `contextmenu` event, confirms the renderer selection and hit-tested B1 cell are distinct, then clicks the real ContextMenu Paste item. The helper receives the exact current `WorkbookSheetView` and targets the captured range start A1.

A separate case mutates the renderer-owned selection range after opening the menu and before clicking Paste. The helper then receives B2, confirming that ExcelApp retains and later reads the same range/address object reference. This characterizes the current alias behavior; it does not assert an immutability contract.

Both cases invoke the real `performPasteAsync()`. The test-only spy seeds an internal clipboard payload immediately before the helper call, captures the real owner-preflight rejection, and returns a caught wrapper Promise to the UI callback. Assertions show no `getPayload()` or system `readText()` call, cell/merge read, command execution, history change, worksheet event, completion callback, renderer invalidation, or redraw. The same payload object remains installed. The context menu and mocked MiniToolbar are gone after the callback; this visibly verifies UI closure, while the private clicked-target ref clearing remains established by the source handler rather than directly inspected. The wrapper does not characterize production-browser `unhandledrejection` reporting, and payload setup is at the helper boundary rather than through a prior UI Copy action.

The test exercises exact flow keys `eeecbc6584ad491b3186`, `5fb3eec44001ec5f2d32`, `7143e44f12b80cceb463`, `e165e1da47de6262e80f`, and `c9f6edeac6ede11aa788`. Each remains `open-not-reconciled`; no other key was updated for this runtime result. Right-click capture, ContextMenu dispatch/close, and the clicked-target ref still have no dedicated frozen keys.

The focused React Jest selection passes 6/6 with default ts-jest diagnostics; React package typecheck passes; `git diff --check` passes. No production or frozen-register change, disposition promotion, or broad matrix run was made. The implementation ledger has 2,067 unique records, 1,908 `open-not-reconciled`, and 20 `partial-owner-split`; SHA-256 is `03ff9abd1fb25a830e7b0dede86e7ca35aa6c033ac07254540c240265af68573`. R1 acceptance remains withheld.

## Ribbon Paste source-only reachability triage — 2026-10-22

This review follows frozen flow key `cbd3e633229fb1981775` to the live multiline `ClipboardGroup.handlePaste()` call at `packages/react/src/components/ribbon/ClipboardGroup.tsx:149`; the frozen source line and anchor were not edited. It distinguishes the two consumers of that shared component.

### ExcelApp → Ribbon → HomeTab → ClipboardGroup

ExcelApp owns a `ClipboardService` and passes it, its command manager, workbook, and selection through `Ribbon`. `Ribbon` supplies `workbook.activeSheet` to HomeTab; that is the owner-backed `WorkbookSheetView`. HomeTab derives a normalized `currentRange` from its selection and passes that view, range, selected addresses, clipboard service, and command manager to ClipboardGroup. Both the source payload and Paste destination are therefore selection-based; `handlePaste()` uses `getRange().start`.

The Paste button starts disabled because `clipboardHasContent` initializes to false. Its value is local to ClipboardGroup and is set true only after that group's `performCopy()` or `performCut()` returns. Owner-view Copy is a reachable successful state update: `performCopy()` has no standalone guard, `ClipboardService.copy()` accepts `WorkbookSheetView` and reads via its detached `getCell()`/merge observations, and the helper then creates the plain-text projection from `getCellValue()`. No Workbook write is performed by this staging path. Owner-view Cut instead calls `requireStandaloneWorksheet()` synchronously before `ClipboardService.cut()`, so it cannot reach the later flag update or callbacks. No other ClipboardGroup state setter enables Paste; external changes to the shared service do not synchronize the local flag, and Paste Special does not set it.

After a successful owner-view Copy, clicking Paste invokes `performPasteAsync(worksheet, commandManager, clipboardService, range.start)` with no options. Its first operation is `requireStandaloneWorksheet(sheet)`, which rejects the view before internal-payload lookup, system clipboard reading, `PasteCommand` construction, or command-manager execution. The `.then()` handler contains fulfillment callbacks only (`onPaste`, `onAfterClipboard`) and has no rejection handler. The rejected path does not change the local Paste flag or invoke those callbacks. Browser-level reporting of the discarded rejection remains unverified. Thus the Paste control can be enabled even though the owner-backed mutation path remains gated.

### Direct-source ExcelRibbon → ClipboardGroup

`ExcelRibbon` creates a separate `ClipboardService` with `useMemo()` and passes its `worksheet` prop, service, command manager, and `cells` into ClipboardGroup. The prop is typed `Worksheet`; `workbook` is separately typed `any` and is not the clipboard sheet source at this callsite. `cells` is `selectedCells ?? [selectedCell]`; ExcelRibbon does not pass `currentRange`, so ClipboardGroup derives a normalized range from the first and last supplied addresses and uses that range's start as the Paste anchor. A supplied command manager is forwarded; absent one, ExcelRibbon's no-op default executes no command.

The checked-in `examples/react-canvas-viewer.tsx` directly imports ExcelRibbon from its source file and supplies `activeSheet = workbook.getSheet(sheetName)`. `Workbook.getSheet()` returns a `WorkbookSheetView`, so this example supplies an owner view at runtime through the Worksheet-typed prop (the example's workbook state is `any`). The example supplies its React `selectedCell` and wrapped command manager. Repository search found no checked-in module or HTML entry importing this example, and ExcelRibbon is absent from both the React root barrel and ribbon barrel; this is a source-reachable example/deep-import boundary, not evidence that a current first-party app entry renders it. The component's own Copy action can populate its private service and local enablement flag from a valid owner-view selection. Its Paste call then reaches the same async owner preflight and rejects before reading that service or executing the supplied command manager. On rejection, its fulfillment callback (`onPaste`, mapped to the example's redraw callback) does not run; there is no local catch.

For a standalone Worksheet supplied to either component route, source permits Copy and async Paste to continue through payload lookup or external text acquisition and then `PasteCommand`/command execution; this is compatibility behavior only and was not runtime-characterized here. A raw adopted Worksheet supplied by an external direct-source consumer is a separate conditional lifecycle path; no supported first-party ingress was established by this trace. These observations do not demonstrate a Workbook write or authorize a production change.

The exact flow key `cbd3e633229fb1981775` remains `open-not-reconciled`. The earlier source sentence that Copy and Cut both reject and therefore leave ordinary owner-view Paste disabled is corrected: Copy can enable the button, while the subsequent owner Paste still rejects before mutation. The supporting Copy and Cut actions are separate frozen keys (`bf5997848c52927af634` and `289ea8864d96f7c12faf`); this Paste review changes neither key. No test was added or run, no other key or disposition was changed, and no frozen register or production source was edited. The implementation TSV remains 2,067 unique records, including 1,908 `open-not-reconciled` and 20 `partial-owner-split`; its SHA-256 is `cfbd6596294ba79468e59187e9dc77d259c9feca64a350cca1c9c5eee1d50318`. R1 acceptance remains withheld.

### ExcelApp Ribbon Copy → Paste runtime characterization — 2026-10-23

One focused React regression was added to `packages/react/src/__tests__/clipboard-cut-owner-flow.r1.test.tsx`. It renders the real ExcelApp, Ribbon, HomeTab, and ClipboardGroup with a real `Workbook.create()` workbook and the harness's valid A1:B1 selection. Paste is initially disabled. Clicking the real Ribbon Copy invokes the real `performCopy()` and `ClipboardService.copy()` with the exact active `WorkbookSheetView`, selected range, and ExcelApp-owned clipboard service. The helper creates an all-mode detached payload and the ClipboardGroup then enables Paste.

Clicking that enabled Paste button invokes the real `performPasteAsync()` with the same owner view and clipboard service, the ExcelApp guarded command manager, and the selected range start A1; no options are passed. The helper rejects at `requireStandaloneWorksheet()` before payload lookup or other paste work. The test clears observations after Copy, then verifies no payload lookup or payload replacement, system clipboard read/write, owner-view or Worksheet cell/merge read, Worksheet event, PasteCommand execution, command-manager execution/history change, or renderer invalidation/redraw. Paste remains enabled. The fulfillment-only `onAfterClipboard` redraw callback does not run; this route supplies no `onPaste` callback.

The test wrapper captures the real helper rejection and returns a Promise that remains pending on that rejection, so ClipboardGroup's fulfillment-only `.then()` chain does not run and Jest does not report an unhandled rejection. This is test isolation only; it does not establish browser-level `unhandledrejection` behavior. The result does not characterize standalone Paste, retained-raw Worksheet adoption, or the separate direct-source ExcelRibbon route.

Only flow key `cbd3e633229fb1981775` received this runtime evidence; its disposition remains `open-not-reconciled`. Copy key `bf5997848c52927af634` and Cut key `289ea8864d96f7c12faf` are unchanged. No production or frozen-register change, disposition promotion, or broader matrix run was made. The focused React Jest file passes 7/7 with default diagnostics, the React package typecheck passes, and `git diff --check` passes. The ledger remains 2,067 unique records, with 1,908 `open-not-reconciled` and 20 `partial-owner-split`; its SHA-256 is `b2aeb5a99500d3f7fe5a9d094cfb7d2e9d3174b43ad0195a3f1f608942811e65`. R1 acceptance remains withheld.


### Retained raw Worksheet async Paste runtime characterization — 2026-10-23

A focused helper-level regression was added at `packages/react/src/__tests__/clipboard-paste-retained-raw-owner-boundary.test.ts`. It creates a formula-bearing standalone Worksheet with a cached-value sentinel, prepares an internal clipboard payload from a separate standalone source, then uses the internal `adoptWorksheetByWorkbook()` test seam before calling the real `performPasteAsync()`. This is a characterization of an internally adopted retained raw handle, not a supported public Workbook lifecycle or a first-party UI path.

The adopted raw Worksheet has no public `workbookId` property, so it passes `requireStandaloneWorksheet()`. The helper reads its internal ClipboardService payload, constructs `PasteCommand`, then reads the target's merge membership and cell. The adopted raw `getCell()` result still contains the formula cached value; the captured-snapshot diagnostic log also contains that value before `CommandManager.execute()` is reached. The regression intercepts the manager boundary and records the constructed PasteCommand without executing it. `PasteCommand.execute()` is not called; the target's cell/formula remain unchanged, and no Worksheet events or command history changes occur. This confirms a pre-execution read/log observation path, not successful mutation or write authority.

Evidence was appended only to exact frozen keys `c9f6edeac6ede11aa788` (`performPasteAsync()` internal payload delegation), `339942d8bc6975a6a327` (`PasteCommand.getMergedRangeForCell()`), and `a7fcd2afc449ff512f78` (`PasteCommand.getCell()`). All three remain `open-not-reconciled`; no disposition or frozen register changed. The async external-clipboard branch, synchronous `performPaste()`, standalone successful Paste, Ribbon/UI routes, and public Workbook lifecycle remain outside this test.

Default-diagnostics focused React Jest passes 1/1, React package typecheck passes, and `git diff --check` passes. Node `v24.22.0` and npm `11.19.1` were used. The ledger remains 2,067 unique `(record_type, record_key)` pairs, with 1,908 `open-not-reconciled` and 20 `partial-owner-split` records; its SHA-256 is `22f617de466dd31524eab5245a50ef8f0e8cd952d3e707d9d26f90928b7ae76b`. No production change or broader matrix run was made. R1 acceptance remains withheld.


### Synchronous `performPaste()` source-only triage — 2026-10-23

Frozen flow key `fe29cf47a6ac21f9e72c` identifies the synchronous helper's delegation to `applyPastePayload()`. `performPaste()` first calls `ClipboardService.getPayload()` with no ownership preflight. An empty internal clipboard returns `false`; a payload proceeds to `applyPastePayload()`, which constructs `PasteCommand` before calling `CommandManager.execute()`. The constructor therefore reaches the same target merge/cell snapshot and diagnostic logging path characterized in the separate async retained-raw test. For a retained raw Worksheet internally adopted after construction, source predicts that cached formula values can reach this diagnostic path. This remains source-level inference for the sync helper; no new runtime test was added.

Repository production search found no callsite for synchronous `performPaste()`; production UI callers use `performPasteAsync()`. The helper is exported from `utils/clipboardOperations.ts`, but the React root barrel does not re-export it. No supported root-package API route was identified; a direct/deep module import is a separate technical possibility and is not treated as a verified supported contract.

If a direct caller invokes `PasteCommand.execute()` with an adopted Worksheet, execution first calls `clearDependencies()` for the target range. `clearDependencies` is in the Worksheet owned-mutator entry-guard registry, before `setCellFormula()`/`setCellValue()` cell writes; `CommandManager.execute()` pushes history only after the command returns. Source therefore identifies an owner-guarded first mutation boundary and no supported Workbook write path. This is not runtime verification of the synchronous helper's execution failure, error handling, or full atomicity, so the source review does not claim proven no-mutation behavior.

Only exact key `fe29cf47a6ac21f9e72c` received this evidence; it remains `open-not-reconciled`. No production change, test, disposition promotion, or frozen-register change was made. Existing async retained-raw evidence and external-clipboard/synchronous execution questions remain separate. The implementation ledger has 2,067 unique records, 1,908 `open-not-reconciled`, and 20 `partial-owner-split` records; SHA-256 is `edfe814d548cd5d9a7307434d503af9b073f811166e48e2725977b929502f957`. No tests or broader matrix were run for this source-only review. R1 acceptance remains withheld.


### Synchronous retained-raw Paste runtime characterization — 2026-10-23

A separate focused React regression was added at `packages/react/src/__tests__/clipboard-paste-sync-retained-raw-owner-boundary.test.ts`. It stages an internal payload, internally adopts the formula-bearing target Worksheet while retaining its raw handle, and calls the real synchronous `performPaste()`. This internal adoption seam is not a supported public Workbook lifecycle.

Runtime observations confirm the helper reads the internal payload without an ownership preflight, then constructs `PasteCommand`. Its target merge and cell snapshot reads occur at A1, and the cached formula value is present in the captured-snapshot diagnostic log before `CommandManager.execute()`. Unlike the separate async test, this regression lets the real manager call the real `PasteCommand.execute()`. Execution reaches `clearDependencies()` and rejects with the exact owned-Worksheet mutation error. The same error propagates through the command, manager, and helper. The cell and formula are preserved, no Worksheet event is observed, and command history is unchanged. The diagnostic value is asserted as a boolean and is not printed in test output.

This establishes the synchronous helper's pre-execution read/log exposure and the tested command's first guarded mutation rejection. The helper returning/throwing behavior does not demonstrate a successful paste. The isolated one-cell test does not establish general rollback atomicity, other payload shapes, external clipboard behavior, or a supported first-party/public retained-raw ingress. Evidence was updated only for flow key `fe29cf47a6ac21f9e72c` and the two exercised PasteCommand read keys `339942d8bc6975a6a327` and `a7fcd2afc449ff512f78`; all remain `open-not-reconciled`. The async flow key was not updated by this sync test.

Focused default-diagnostics React Jest passes 1/1; React package typecheck and `git diff --check` pass. No production change or broader matrix run was made. The ledger remains 2067 unique records, including 1908 open and 20 partial owner splits; SHA-256: `a79e602682c263e2002628589cc43bfa66c3f3df08ff1c3fafd932d999b00285`. R1 acceptance remains withheld.


### Retained raw Worksheet Cut runtime characterization — 2026-10-23

A focused React test was added at `packages/react/src/__tests__/clipboard-cut-retained-raw-owner-boundary.test.ts`. It creates a formula-bearing standalone Worksheet, adopts it through the internal `adoptWorksheetByWorkbook()` seam, and calls the real `performCut()` with a one-cell range. This internal fixture does not represent a supported public Workbook, ExcelApp, or Ribbon lifecycle.

The adopted raw Worksheet has no public `workbookId`, passes the helper's structural guard, and reaches real `ClipboardService.cut()`. The internal payload contains the cached formula value and formula text. The test suppresses diagnostic console output and checks sentinel presence through boolean assertions. The helper's `payloadToPlainText()` path supplies the cached value to mocked `navigator.clipboard.writeText()`. That mock rejects; the best-effort publication helper absorbs the rejection while `performCut()` still returns the range and the staged internal cut payload remains available. The source cell/formula are unchanged and no Worksheet event occurs. Internal clipboard staging and external publication are therefore separately observed effects.

Evidence was appended only to frozen flow keys `9b76ad9828df3e8123a2` (`ClipboardService.cut()` staging) and `4c685ba670d783ef2052` (plain-text/browser clipboard publication). Both remain `open-not-reconciled`. No production change, owner-contract decision, or disposition promotion was made.

Focused default-diagnostics React Jest passes 1/1, React package typecheck passes, and `git diff --check` passes. No broader matrix was run. The ledger remains 2067 unique records, including 1908 open and 20 partial owner splits; SHA-256: `122c3370cd0da9eda838d04760c1e3b6d1d98bc7d7928ca7b7bb032034020db8`. R1 acceptance remains withheld.

## Clipboard helper ownership-boundary decision matrix — 2026-10-23

The source-only comparison of `performCopy()`, `performCut()`, `performPasteAsync()`, and `performPaste()` is recorded in [CS-002D4-R1-clipboard-helper-ownership-matrix.md](CS-002D4-R1-clipboard-helper-ownership-matrix.md). It keeps WorkbookSheetView caller routes separate from internal adopted-raw fixtures and standalone compatibility, with exact keys and mutation/publication boundaries. No code, tests, ledger disposition, or frozen register changed for this consolidation. R1 acceptance remains withheld.

## Clipboard ownership and diagnostics contract memorandum — 2026-10-23

The requested policy choices are collected in [CS-002D4-R1-clipboard-contract-decision-memorandum.md](CS-002D4-R1-clipboard-contract-decision-memorandum.md). Each is presented for approval with affected helpers, exact keys, compatibility implications, and separate implementation authorization. No source behavior, tests, ledger dispositions, or frozen registers changed. R1 acceptance remains withheld.
