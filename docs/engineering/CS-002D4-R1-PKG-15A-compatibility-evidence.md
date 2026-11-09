# CS-002D4-R1 PKG-15A — Formula compatibility evidence

**Test:** `packages/core/__tests__/formula-a1-dollar-compatibility.p1-pkg-15a.test.ts`
**Production source changed:** No.
**Disposition:** Characterization verified by PKG-15 Lane D's serialized test window.

## Matrix

The focused suite contains 12 parser/evaluator cases: four formula spellings (`=E5+1`, `=E$5+1`, `=$E5+1`, `=$E$5+1`) at ordinary G1, merge anchor A1, and non-anchor B2. Each case observes preserved formula text, the effective storage/graph node, literal E5 precedent/dependent registration, current result (`11` for plain A1 and `#NAME?` for the three dollar-marked spellings), and dirty/recalculated behavior after changing E5.

Three additional cases replace an E5 formula with an F5 formula and then clear it, once at each placement. They verify old-edge removal, new-edge registration, effective anchor canonicalization for a non-anchor write, and graph cleanup after clear. Total expected focused coverage: 15 tests.

These expected outcomes document the current implementation only. They do not assert that dollar-marked references should remain unsupported or that literal formula origin is the approved merged-cell rule.

## Execution record

Lane A did not invoke Jest. Lane D ran the test with 14 adjacent suites using Node 24.22.0, the TS-first Core Jest configuration, `--runInBand`, and `NODE_OPTIONS=--experimental-vm-modules`. Result: **15 suites passed, 201/201 tests passed**. The first attempt exposed an over-specific assertion in the new Lane B test harness; the corrected rerun passed and the initial raw output is retained separately.

- Final raw output: `docs/engineering/CS-002D4-R1-PKG-15D-focused-rerun-jest-output.txt`.
- First-run raw output, including the test-harness assertion failure: `docs/engineering/CS-002D4-R1-PKG-15D-focused-jest-output.txt`.
- Sidecar before/after outputs: `docs/engineering/CS-002D4-R1-PKG-15D-focused-rerun-sidecars-before.txt` and `...-after.txt`; 237/237 passed on both checks and outputs were byte-identical.

The formula matrix agrees with the source trace and PKG-14 behavior. No production patch was warranted because the governing formula syntax and merged-member origin rules remain undecided.

## Bounded conclusion

The graph extractor recognizes all four spellings and currently registers the same literal E5 edge. FormulaEngine evaluates only the plain spelling in the tested expressions. For merged entry, Worksheet stores the submitted formula on the anchor but does not translate its A1 references. An owner decision is required before deciding whether to align the parser/evaluator, alter reference origin, or retain the existing behavior.
