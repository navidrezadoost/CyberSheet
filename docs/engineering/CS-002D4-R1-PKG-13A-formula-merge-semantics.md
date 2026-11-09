# CS-002D4-R1 PKG-13A — Formula semantics through merged members

**Lane status:** Characterization added and verified: 1 suite, 3/3 tests passed in the serialized PKG-13D window. Relative-reference origin is not resolved by an approved contract. No production source was changed.

## Contract review

The current authoritative contract file, `CS-002D4-R1-authoritative-contracts.md`, contains no rule requiring formula references to be translated, normalized, or rebased when `setCellFormula()` is called at a merged non-anchor coordinate. D7-01 approves exposing anchor-effective cell content through merged-member reads. D7-03 requires requested-address and merge-anchor provenance to be represented consistently to consumers; D7-04 keeps the stored anchor as the sole value/style source. D7-05 leaves the precise backwards-compatible public read DTO unresolved. None of those clauses specifies formula-input origin or Excel copy/fill translation semantics.

Accordingly, this lane does not select an anchor-relative or requested-member-relative rewrite rule. The direct formula-write path is characterized as implemented. Any requirement that formula text be translated like a copied/fill formula remains an owner decision before a production change.

## Source trace and observed boundary

`Worksheet.setCellFormula()` resolves the storage/graph node with `#resolveAnchor(addr)`, writes the formula to that anchor, and emits `cell-changed` with the original `addr`. It currently calls `extractFormulaDependencies(formula, { row: addr.row - 1, col: addr.col - 1 })` using the requested address. The extractor's default A1 path parses references as their literal row/column coordinates and does not use `currentCell`; `$` markers are stripped when it parses a reference. Therefore the current dependency graph for a literal `=J8` points to J8 whether the formula is submitted at a merge anchor or member. The test checks this source behavior and preserves the formula text as supplied.

This is a dependency-graph characterization, not a claim that the formula engine performs copy/fill translation or that an A1 formula is a relative offset. The extractor exposes an R1C1 mode, but the Worksheet `setCellFormula()` call does not select it. Cross-sheet A1 references are deliberately removed by the extractor because they cannot be represented in its local `Address` list. This lane did not assert cross-sheet dependency behavior as supported.

## Coverage boundary

`packages/core/__tests__/workbook-merged-member-formula-origin.p1-pkg-13a.test.ts` adds two focused scenarios:

- One committed multi-merge formula transaction compares an A1 reference submitted at an anchor and at members, including row-absolute, column-absolute, and fully absolute forms. It checks unchanged stored formula strings, anchor-only graph nodes, literal J8 precedents, and requested input addresses in `cell-changed` events.
- Independent Journal and Snapshot failure cases stage formulas through two merged members plus a value write through a third merge, then inject failure after the third CellRecord write. They check exact sparse snapshot restoration, cleared precedent/dependent edges, no published Worksheet events, and healthy Workbook state.

PKG-12A already covers the same formula's clear and formula-to-value graph cleanup paths and merged-member rollback of formula/style writes under Journal and Snapshot. Those cases were reviewed and not duplicated here. PKG-13A adds multiple-merge mixed rollback and explicit successful event-address provenance.

## Verification handoff

Coordinator verification used the declared Node 24/npm 11 environment and TypeScript-first Jest configuration, serially, with protected generated sidecars checked before and after:

```sh
PATH=/home/navidrezadoost/.nvm/versions/node/v24.22.0/bin:$PATH \
NODE_OPTIONS=--experimental-vm-modules node node_modules/jest/bin/jest.js \
  --config packages/core/jest.typescript-first.config.cjs --runInBand \
  packages/core/__tests__/workbook-merged-member-formula-origin.p1-pkg-13a.test.ts
```

Result: 1 suite, 3/3 tests passed. Unfiltered output: `CS-002D4-R1-PKG-13D-lane-a-jest-output.txt`; before/after protected-sidecar outputs: `CS-002D4-R1-PKG-13D-lane-a-sidecars-before.txt` and `CS-002D4-R1-PKG-13D-lane-a-sidecars-after.txt`. No red/green production correction is claimed. Overall CS-002D4-R1 acceptance remains **WITHHELD**.
