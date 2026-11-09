# CS-002D4-R1 PKG-09C — Regression disposition

**Lane status:** Focused red reproducer confirmed the sparse-state change; narrow source correction passed focused and adjacent verification.
**Disposition:** Standalone same-value no-op defect reproduced and corrected at the Worksheet mutation boundary.
**Scope:** Existing seven Workbook mutation operations and standalone Worksheet behavior only. No public API or event schema changed.

## Source review

The transaction implementation in `packages/core/src/workbook.ts` stages the seven authorized operation kinds at lines 59–65 and applies them in `#applyCellWriteBatch()` at lines 504–664. The corresponding Worksheet mutators are in `packages/core/src/worksheet.ts`: value writes at 1067–1096, formula writes at 1212 onward, clear operations at 1138–1199, styles at 1505–1527, and dimensions at 2137–2167. Existing differential and rollback coverage is concentrated in `packages/core/__tests__/workbook-seven-operation-differential.p1-pkg-02c.test.ts`; the PKG-08 observer isolation case is in `workbook-seven-operation-observer-isolation.p1-pkg-08b.test.ts`.

Static review did not establish a transaction or observer defect that warrants changing supported behavior without a Lane B failure. The existing tests cover mixed multi-sheet Journal/Snapshot equivalence, staged final-state observation, injected rollback, settlement failure, and committed observer exception isolation. They do not appear to assert sparse-cell identity after assigning `null` to a previously absent cell.

## Lane B candidate: null assignment to an absent cell

**Classification: reproduced supported-contract defect.** The source labels same-value writes as “No-op guard — same value, no mutation, no event,” while its former ordering allocated through `#ensureCell()` first. The standalone regression failed exactly at `getCell(address)`: it received a materialized `{ value: null, ... }` record where the assertion expected `undefined`. `getCell()` is a supported read API, and `extractSnapshot()` preserves cell-store records, so this is an observable mutation in the branch documented as having no mutation. The raw red output is preserved in `CS-002D4-R1-PKG-09C-null-write-red-output.txt`. This is distinct from Lane B's broad-run failures and was isolated under the PKG-08 TypeScript-first config.

### Isolated reproducer plan

The focused regression at `packages/core/__tests__/worksheet-null-write-noop.p1-pkg-09c.test.ts` covers standalone repeated null writes, Workbook repeated writes under production-default Journal and test-only Snapshot, and formula clearing under standalone, Journal, and Snapshot paths. The source correction in `packages/core/src/worksheet.ts` validates and resolves the address, then checks absent-null and existing same-value/no-formula cases before recording a Journal before-image or calling `#ensureCell()`. Formula-bearing cells remain on the existing mutation path, so writing null still clears the formula and publishes its normal cell event. No broader blank-cell normalization or event change was made.

## Isolated reproducers for any other Lane B findings

For a reported failure, first capture the exact test path, failing assertion/stack, resolver mode, and whether execution reached the assertion. Reproduce only that case in isolation using the PKG-08 opt-in TypeScript-first Core Jest config and serialized execution; compare with the established relevant seven-operation test rather than running a broad suite concurrently. If a failure appears strategy-specific, use identical fixtures and operation sequences under Journal and test-only Snapshot, compare detached snapshots, formula precedents/dependents, dirty state, event sequence/count, and mutation health. Inject a fault only through an existing supported test hook and only at the reported phase. Preserve raw red output before any correction, then rerun the isolated case and the smallest adjacent regression selection for green evidence. Do not classify compile/setup/resolution failures as production regressions.

## Correction acceptance boundaries

A Lane C correction is acceptable only after a deterministic Lane B failure demonstrates a violation of an already-supported standalone or seven-operation contract, and the smallest reproducer passes before/after with red/green evidence. Keep edits limited to the responsible source/test path; preserve Journal as the production default, all seven operation kinds, existing event schemas and ordering guarantees, and Workbook ownership guards. Verify compatibility under both strategies where the affected behavior is supported by both. Do not add an eighth operation, Pivot accessor/lifecycle surface, post-publication `addSheet()`, default Jest configuration change, new production failure hook, or unapproved contract semantics. If the result depends on a missing or disputed contract, report it as unresolved rather than choose semantics in code.

## Verification

All Lane C Jest runs used `packages/core/jest.typescript-first.config.cjs`, `--runInBand`, and `NODE_OPTIONS=--experimental-vm-modules`.

1. **Pre-correction isolated red:** 1 suite, 1 test failed at the expected `getCell()` allocation assertion. `CS-002D4-R1-PKG-09C-null-write-red-output.txt` contains the failure and exit code. The 237-entry protected manifest passed before/after; output comparison was identical.
2. **Post-correction first attempt:** focused test plus two adjacent suites produced 1 failed suite / 2 fixture-setup failures, while the adjacent suites passed 81/81. The formula-preservation cases attempted a raw Worksheet mutation after adoption and correctly hit the existing owner guard. This was a test-fixture error, not a production failure. The untouched output is `CS-002D4-R1-PKG-09C-fixture-setup-failure-output.txt`. Sidecar verification passed before/after with identical output.
3. **Corrected fixtures and green:** formulas are seeded before Worksheet adoption. Focused test, `workbook-seven-operation-differential.p1-pkg-02c.test.ts`, and `workbook-mutation-queue.p1-pkg-01.test.ts` passed: **3 suites, 83/83 tests**. The 237-entry protected manifest passed before/after this run and output comparison was identical. Raw output is `CS-002D4-R1-PKG-09C-null-write-green-output.txt`.

Existing ts-jest deprecation and TS151001 advisories were non-failing. No full Core suite ran. No contract, resolver, public API, event schema, or default transaction strategy changed. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
