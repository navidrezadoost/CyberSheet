# CS-002D.2 — Proposed workbook dependency architecture

Status: design gate and opt-in vertical prototype; not the default Workbook API.

## Identity and ownership

A cell's identity is `(workbook instance, opaque sheet ID, validated packed cell coordinate)`. A range adds inclusive start/end coordinates. Sheet names are case-insensitive display/lookup labels, never graph keys. A workbook allocates IDs monotonically and never reuses a deleted ID. Rename preserves ID. Restoring or cloning a whole workbook preserves its internal sheet IDs in a fresh owner instance; all graphs, evaluators, caches, and subscriptions are newly allocated. Importing a sheet into an existing workbook must allocate a fresh ID and explicitly remap its bindings; that operation is outside this prototype.

`Worksheet` retains its efficient local numeric DAG. An owned workbook index stores only qualified reference bindings. A qualified self-sheet reference is stored in this index too, since the existing local extractor intentionally excludes qualified tokens. No global mutable index is used. A sheet ID may occur in two restored workbooks without either workbook sharing state.

## Parsing and evaluation

Scan qualified A1 cell/range tokens outside double-quoted literals. Support unquoted names, quoted names, doubled apostrophes, absolute markers, and bounded inclusive rectangular ranges. Bind each valid token to a sheet ID via the workbook name table. Missing sheets or out-of-bounds reference coordinates evaluate to `#REF!`; invalid token syntax remains a formula parser error (`#NAME?` for an unrecognized name). Whole-column/row, external-workbook, 3D, named-range, structured-reference, INDIRECT, and OFFSET dependency binding require subsequent work.

The prototype substitutes qualified tokens with temporary formula-context bindings and delegates arithmetic/functions to one existing FormulaEngine per worksheet. It uses a workbook-owned recursion guard keyed by sheet ID and cell key. Temporary binding names cannot shadow user formula text. Range lookup uses the source worksheet. This adapter tests the design without changing the production expression parser or its local dependency cache.

## Invalidation and scheduling

Observe each worksheet's mutation stream before public event coalescing. Formula edits replace their qualified registrations; clearing/replacement removes them. A source mutation follows local dirty propagation and then matching qualified cell/range watchers, including local formula descendants that become cross-sheet precedents. A visited set bounds cycles. Literal range interiors are watched without materializing every coordinate.

At explicit workbook recalculation, build a transient formula scheduling view from existing local precedents and qualified formula precedents. Use deterministic topological ordering; unresolved nodes blocked by a cycle receive `#CIRC!`, including descendants, matching iteration-disabled policy. Commit caches before publishing deferred formula-result events. Clear dirty state before events so listener edits remain dirty for the next pass. Cross-sheet recalc must be invoked through the workbook coordinator; independent per-sheet `autoRecalculate()` cannot guarantee workbook event/order semantics.

The prototype scans formula nodes and matching range watchers. It establishes correctness, not a scale target. Indexed rectangle queries, incremental SCC maintenance, worker scheduling, async functions, and cancellation are later work. The authoritative worksheet DAG is not duplicated persistently.

## Rename, deletion, and lifecycle

Rename validates uniqueness, preserves ID, and rewrites only parsed qualified token spans to the new quoted display name. Strings resembling references remain untouched. Deletion rewrites references bound to the deleted ID as `#REF!`, removes its registrations/subscriptions, and dirties surviving dependents. Recreating the old display name cannot resurrect deleted references. The prototype owns its worksheet collection and lifecycle; existing production Workbook/pivot behavior is unchanged.

## Snapshot and transaction contract

Introduce a separate experimental object envelope: `format: "cybersheet-workbook-prototype"`, `version: 1`, `nextSheetSequence`, and ordered `{id, name, state: WorksheetSnapshot}` entries. Formula text plus the unique name-to-ID manifest is the necessary relationship data; graph caches are rebuilt after every sheet has been allocated. No serialized mutable adjacency map is trusted. Reject unknown versions, duplicate/invalid IDs, duplicate names, invalid sequence counters, and invalid worksheet coordinates before publishing a restored instance. Existing CSEX worksheet snapshots retain their current format and meaning.

Whole-workbook clone/restore keeps IDs but creates independent ownership. The prototype validates JSON round trips for the acceptance fixtures; full workbook fidelity (pivots, charts, validation, protection, named ranges, and all snapshot omissions) is not claimed. A production manifest must version those additional sections before migration.

Existing `TransactionContext` cell rollback/patch replay emits worksheet mutations; those rebuild qualified registrations and propagate dirtiness. Recalculate once after commit/rollback. A prototype synchronous workbook transaction snapshots the owned collection before editing; failure restores identities, sheets, formula text, and graphs in that same owner. Undo/redo use the same snapshot boundary. This is a reference implementation, not a substitute for CS-001C's authoritative journal. Async callbacks must be rejected. Production event atomicity across user-mutation listeners remains a separate journal requirement.

## Compatibility and implementation boundary

Add `experimental/WorkbookCalculationPrototype.ts`, a qualified-reference scanner, and an acceptance suite. The only shared Worksheet change is an optional constructor identity supplied by the owning factory; ordinary callers retain existing runtime identity behavior. Do not export the prototype through the package entry point or wire UI/worker consumers to it. Its APIs are explicitly provisional.

Before default adoption: review persisted IDs and import semantics, migrate workbook lifecycle ownership, unify formula AST bindings, integrate worker transaction/events, validate full snapshot fidelity, benchmark watcher scans, and preserve the 105-failure inventory plus XLSX/coordinate/cycle/patch/transaction gates.

## Implementation status (vertical prototype landed)

The design gate is realized as an isolated, non-exported prototype plus a full acceptance suite. It does not modify the production expression parser, the local dependency cache, or the default `Workbook`/`Worksheet` evaluation paths.

Delivered source files:

- `packages/core/src/experimental/qualified-reference-scanner.ts` — positional scanner for sheet-qualified A1 cell/range tokens (unquoted/quoted names, `''` escapes, absolute markers), skipping string literals; returns byte spans for substitution.
- `packages/core/src/experimental/WorkbookCalculationPrototype.ts` — workbook-scoped coordinator: opaque monotonic sheet identity, qualified-reference index (cells + ranges, including qualified self-references), mutation-stream observation, literal-binding substitution over the existing per-sheet `FormulaEngine`, deterministic topological recalculation with cross-sheet `#CIRC!`, rename/delete semantics, a versioned snapshot envelope, and a synchronous rollback transaction.
- `packages/core/__tests__/cs-002d2-cross-sheet-prototype.test.ts` — acceptance matrix; the first assertion is the authorized P0 probe `Target!B1 = Source!A1 + 1` (initial value and source-edit invalidation), followed by qualified range interior-edit invalidation, rename, delete→`#REF!`, identical-coordinate isolation, independent-workbook isolation, cross-sheet `#CIRC!`, snapshot restore into a new workbook, and transaction rollback.

Validation: the acceptance suite passes (12/12); the pre-existing core failing-test inventory is unchanged (additive-only change set); the focused-test guard and the core typecheck are clean. The prototype remains absent from `packages/core/src/index.ts`; promotion to the default API requires the "before default adoption" review above.

## CS-002D.2R — correctness hardening (landed)

The review accepted the prototype as a design experiment and authorized a narrow correctness-hardening pass. The following source-level findings were repaired and locked with regressions in the same acceptance suite.

- **Finding A — deletion identity (P0).** `deleteSheet()` now rewrites every dependent formula so qualified tokens targeting the deleted sheet collapse to the `#REF!` error literal (Excel parity) before the sheet is removed. The reference is permanently severed, so creating a new same-name sheet (which receives a fresh opaque id) cannot resurrect it. Regression: _delete then recreate a same-name sheet keeps old references `#REF!`_.
- **Finding B — self-cycles (P0).** Topological construction no longer silently discards `from === to` edges; self-edges are recorded and force the node (and its reachable descendants) into the cyclic set → `#CIRC!`. Regressions: _qualified self-reference_, _self-inclusive qualified range_, _local self-inclusive range cycle_, _direct local self-reference_.
- **Finding P1 — local range precedents.** The coordinator now owns a complete per-formula dependency model (local cells, local ranges, and qualified precedents) derived from formula text via the shared extractor and the qualified scanner. It no longer depends on the worksheet's point-only `getPrecedents`, which does not expose value-cell range watchers. This is what makes a formula inside its own local `SUM` range schedule as a cycle.
- **Finding E — derived-value propagation.** Invalidation now walks a transitive BFS across both local and cross-sheet edges, so a value edit that changes a _local_ formula's cached result also dirties the cross-sheet formulas that read that formula and their downstream chains — even though derived (`origin: "formula-result"`) events remain excluded from the user-mutation journal. Evaluation reads precedents through a value-only worksheet view so topologically-ordered cached values are used instead of re-evaluating a precedent's raw (still-qualified) formula. Regression: _propagates dirty through local → cross-sheet → downstream chains_.
- **Finding C — snapshot restoration.** `restoreFromEnvelope()` now validates envelope structure, sheet-id format, duplicate ids/names, snapshot coordinates (by staging every worksheet through `applySnapshot` **before** mutating live state), and sequence-counter consistency, then installs all sheets and binds qualified references in a deterministic **second pass**. Restoration is order-independent. Regressions: _restores identical references from a reversed-order snapshot_; _rejects snapshots with duplicate ids / inconsistent sequence / invalid coordinates before exposing state_.
- **Finding D — transaction handle lifetime.** Rollback is now **in-place**: worksheets that existed before the transaction and survive are restored onto their original objects (identity and mutation subscription preserved), so a handle captured before the transaction stays valid afterward. Sheets created inside a rolled-back transaction are removed and their handles are inert; sheets deleted inside are reinstalled on their original object. Regressions: _keeps pre-transaction worksheet handles valid after rollback_; _detaches handles for sheets created inside a rolled-back transaction_.
- **Scanner — complete-token boundaries.** The scanner now applies a trailing-boundary check so a valid reference prefix inside a longer malformed token (`Source!A1ABC`, an 8-digit row, a dangling `:`) is not partially accepted and substituted. Well-formed-but-oversized coordinates (row > 1048576, column > XFD) bind no edges and resolve to a deterministic `#REF!` with no graph corruption. Regressions: _rejects a valid reference prefix embedded in a longer malformed token_; _returns deterministic `#REF!` for oversized qualified coordinates_; _rewrites only true reference tokens on rename, not string literals_.

Validation after hardening: the acceptance suite passes 25/25 (12 original + 13 CS-002D.2R regressions). Core typecheck and the focused-test guard are clean. The prototype is still not exported.

### CS-002D.2R closure — two P1 edge cases (landed)

The closure review withheld final sign-off pending two additional P1 edge cases. Both are now repaired at the source and locked with regressions (suite 25 → 28).

- **Rename suffix derivation.** `renameSheet()` previously rebuilt each qualified token as `newName + raw.slice(raw.indexOf("!"))`. Because `!` is a legal worksheet-name character (it is not in the invalid-name set `[\\/?*[]:]`), a quoted qualifier can itself contain `!` (e.g. `'Ops!2026'!A1`), so the first textual `!` is not the reference delimiter and the old logic produced corruption like `'Fin!2027'!2026'!A1`. The scanner now emits an authoritative `refTail` derived from the parsed A1 capture groups (`!A1`, `!$A$1:$B$2`), and the rewriter uses it. Regression: _rename preserves the parsed suffix when the quoted sheet name contains `!`_.
- **Invalid (out-of-bounds) qualified coordinates.** A well-formed-but-out-of-range coordinate such as `Source!A0` or `Source!$A$0` (row 0), and ranges whose start is out of bounds (`Source!A0:A5`), were previously dropped by the strict parser and left for the production parser to classify. The scanner now decodes them with a loose parser and flags `inBounds: false`. Every downstream consumer honours the flag: `resolveToken` returns `#REF!`, and `modelDependsOn`/`topoSort` bind **no** graph edge — so editing a real cell the invalid range would otherwise have overlapped (e.g. `A5` under `A0:A5`) does not dirty the invalid dependent. An invalid reference can never silently create a valid graph binding. Regressions: _zero-row and otherwise invalid qualified coordinates resolve to `#REF!` with no graph binding_; _scanner emits out-of-bounds tokens with `inBounds=false` and a parsed `refTail`_.

Validation after closure: the acceptance suite passes **28/28** (12 original + 13 CS-002D.2R + 3 closure regressions). Core typecheck (`tsc -p packages/core` exit 0) and the focused-test guard are clean. The prototype remains unexported from `packages/core/src/index.ts`.

### Baseline reconciliation (105 vs 110)

Identity-level comparison of full-core Jest JSON (`--json`) with and without the prototype test file shows the functional failing inventory is **stable at 105** and the prototype contributes **zero** new functional failures (its own suite is fully green). The count variation observed across runs (105 / 107 / 110) is attributable to two timing-sensitive Phase 5 performance benchmarks (`100k acyclic formulas recalc < 500ms`; `3-node Gauss-Seidel 500 iterations < 5ms`), which pass or fail nondeterministically depending on scheduling/GC and were observed passing 3/3, then 2/3, then 3/3 in isolation. The `105` reference remains the authoritative functional baseline; the earlier `110` run was inflated by the same perf flakiness and does not represent new functional regressions. A pre-existing `GETPIVOTDATA – Cross-Sheet Isolation` failure appears in both with/without lists and is unrelated to this work.

**Preserved artifacts and the 110-run limitation.** The raw JSON for the authoritative comparison is retained for audit: `/tmp/with-proto.json`, `/tmp/without-proto.json`, and the extracted failing-identity lists `/tmp/fails-with.txt` (107) and `/tmp/fails-without.txt` (105). The identity-level diff of those two lists is exactly the two perf benchmarks named above plus nothing functional. The earlier `110`-result run's full `--json` was **not** captured before it was superseded, so its five-identity delta cannot be reconstructed line-for-line; it is reconciled by reproduction instead — re-running the full core suite repeatedly reproduces the 105 functional floor with only the two perf benchmarks oscillating, which fully accounts for a 105→110 swing (two benchmarks × retries plus the shared `GETPIVOTDATA` pre-existing failure). No un-accounted functional identity remains. Future comparison runs should persist `--json` for every invocation so this gap does not recur.

## Disposition and next phase

**CS-002D.2R: closed** for the experimental scope (prototype hardening, not production integration approval). The prototype remains non-exported and opt-in. **No commit, production merge, or release authorization** is granted.

**CS-002D.4: authorized for production integration _design only_.** The required integration decisions (sheet identity reconciliation, AST-level typed reference binding, two-tier dependency ownership, workbook-scoped transactions over CS-001C, versioned workbook manifests + ID migration, cross-sheet scheduling, and adoption gates) are specified in [CS-002D4-production-integration-design.md](CS-002D4-production-integration-design.md). The experimental coordinator's full-formula scans, range materialization, and value-only worksheet proxy are explicitly **not** approved for the production path.
