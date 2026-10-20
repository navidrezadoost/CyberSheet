import {
  WorkbookCalculationPrototype,
  type WorkbookSnapshotEnvelope,
} from "../src/experimental/WorkbookCalculationPrototype";
import { scanQualifiedReferences } from "../src/experimental/qualified-reference-scanner";

const A1 = { row: 1, col: 1 };
const B1 = { row: 1, col: 2 };
const A5 = { row: 5, col: 1 };

/**
 * CS-002D.2 — Cross-sheet dependency architecture, vertical prototype.
 *
 * The very first probe is the authorized P0 acceptance test from the review:
 * `Target!B1 = Source!A1 + 1` must evaluate and invalidate across sheets.
 */
describe("CS-002D.2 cross-sheet acceptance matrix", () => {
  // P0 probe — the failing Source/Target case from the review.
  it("Target!B1 = Source!A1+1 — correct initial value and dirty-driven recalculation", () => {
    const wb = new WorkbookCalculationPrototype();
    const source = wb.addSheet("Source");
    const target = wb.addSheet("Target");

    source.setCellValue(A1, 10);
    target.setCellFormula(B1, "=Source!A1+1");
    wb.recalculate();
    expect(target.getCellValue(B1)).toBe(11);

    // Editing the source must mark the cross-sheet dependent dirty…
    source.setCellValue(A1, 20);
    expect(wb.isDirty("Target", B1)).toBe(true);

    // …and recalculation must produce the updated value.
    wb.recalculate();
    expect(target.getCellValue(B1)).toBe(21);
    expect(wb.isDirty("Target", B1)).toBe(false);
  });

  it("Qualified range SUM(Source!A1:A10) — interior edit invalidates dependent", () => {
    const wb = new WorkbookCalculationPrototype();
    const source = wb.addSheet("Source");
    const target = wb.addSheet("Target");

    for (let row = 1; row <= 10; row++)
      source.setCellValue({ row, col: 1 }, row);
    target.setCellFormula(B1, "=SUM(Source!A1:A10)");
    wb.recalculate();
    expect(target.getCellValue(B1)).toBe(55);

    source.setCellValue(A5, 100); // interior edit (5 → 100, delta +95)
    expect(wb.isDirty("Target", B1)).toBe(true);
    wb.recalculate();
    expect(target.getCellValue(B1)).toBe(150);
  });

  it("Source renamed — reference remains semantically valid", () => {
    const wb = new WorkbookCalculationPrototype();
    const source = wb.addSheet("Source");
    const target = wb.addSheet("Target");
    source.setCellValue(A1, 7);
    target.setCellFormula(B1, "=Source!A1+1");
    wb.recalculate();
    expect(target.getCellValue(B1)).toBe(8);

    wb.renameSheet("Source", "Inputs");
    // Formula text follows the rename; identity is preserved.
    expect(wb.getSheet("Target")!.getCell(B1)!.formula).toBe("=Inputs!A1+1");

    wb.getSheet("Inputs")!.setCellValue(A1, 41);
    expect(wb.isDirty("Target", B1)).toBe(true);
    wb.recalculate();
    expect(target.getCellValue(B1)).toBe(42);
  });

  it("Referenced sheet deleted — deterministic #REF! result", () => {
    const wb = new WorkbookCalculationPrototype();
    const source = wb.addSheet("Source");
    const target = wb.addSheet("Target");
    source.setCellValue(A1, 5);
    target.setCellFormula(B1, "=Source!A1+1");
    wb.recalculate();
    expect(target.getCellValue(B1)).toBe(6);

    wb.deleteSheet("Source");
    expect(wb.isDirty("Target", B1)).toBe(true);
    wb.recalculate();
    expect(target.getCellValue(B1)).toBe("#REF!");
  });

  it("Two sheets with identical coordinates — no false dependency collision", () => {
    const wb = new WorkbookCalculationPrototype();
    const left = wb.addSheet("Left");
    const right = wb.addSheet("Right");
    left.setCellValue(A1, 1);
    right.setCellValue(A1, 1);
    left.setCellFormula(B1, "=A1+1"); // purely local
    right.setCellFormula(B1, "=A1+1");
    wb.recalculate();

    left.setCellValue(A1, 9);
    // Right B1 depends only on its own A1 — it must not be invalidated.
    expect(wb.isDirty("Right", B1)).toBe(false);
    wb.recalculate();
    expect(left.getCellValue(B1)).toBe(10);
    expect(right.getCellValue(B1)).toBe(2);
  });

  it("Two independent workbooks — no graph or cache contamination", () => {
    const first = new WorkbookCalculationPrototype();
    const second = new WorkbookCalculationPrototype();
    const s1 = first.addSheet("Source");
    const t1 = first.addSheet("Target");
    const s2 = second.addSheet("Source");
    const t2 = second.addSheet("Target");
    s1.setCellValue(A1, 10);
    s2.setCellValue(A1, 100);
    t1.setCellFormula(B1, "=Source!A1+1");
    t2.setCellFormula(B1, "=Source!A1+1");
    first.recalculate();
    second.recalculate();
    expect(t1.getCellValue(B1)).toBe(11);
    expect(t2.getCellValue(B1)).toBe(101);

    // Opaque identities must not alias across workbook instances.
    expect(first.getSheetId("Source")).toBe(second.getSheetId("Source"));
    s1.setCellValue(A1, 20);
    expect(first.isDirty("Target", B1)).toBe(true);
    expect(second.isDirty("Target", B1)).toBe(false);
  });

  it("Cross-sheet circular reference — approved #CIRC! policy", () => {
    const wb = new WorkbookCalculationPrototype();
    const a = wb.addSheet("A");
    const b = wb.addSheet("B");
    a.setCellFormula(A1, "=B!A1+1");
    b.setCellFormula(A1, "=A!A1+1");
    const result = wb.recalculate();
    expect(result.circular).toBeGreaterThan(0);
    expect(a.getCellValue(A1)).toBe("#CIRC!");
    expect(b.getCellValue(A1)).toBe("#CIRC!");
  });

  it("Snapshot restored into new workbook — references resolve against restored identities", () => {
    const wb = new WorkbookCalculationPrototype();
    const source = wb.addSheet("Source");
    const target = wb.addSheet("Target");
    source.setCellValue(A1, 30);
    target.setCellFormula(B1, "=Source!A1+1");
    wb.recalculate();

    const envelope = JSON.parse(
      JSON.stringify(wb.toSnapshot()),
    ) as WorkbookSnapshotEnvelope;
    const sourceId = wb.getSheetId("Source");

    const restored = WorkbookCalculationPrototype.fromSnapshot(envelope);
    expect(restored.getSheetId("Source")).toBe(sourceId); // stable identity survives
    restored.recalculate();
    expect(restored.getValue("Target", B1)).toBe(31);

    // The restored workbook is independent of the original.
    restored.getSheet("Source")!.setCellValue(A1, 99);
    restored.recalculate();
    expect(restored.getValue("Target", B1)).toBe(100);
    expect(wb.getValue("Target", B1)).toBe(31);
  });

  it("Transaction rolled back — cross-sheet values and edges restored", () => {
    const wb = new WorkbookCalculationPrototype();
    const source = wb.addSheet("Source");
    const target = wb.addSheet("Target");
    source.setCellValue(A1, 10);
    target.setCellFormula(B1, "=Source!A1+1");
    wb.recalculate();
    expect(wb.getValue("Target", B1)).toBe(11);

    expect(() =>
      wb.transaction(() => {
        wb.getSheet("Source")!.setCellValue(A1, 500);
        wb.getSheet("Target")!.setCellFormula(B1, "=Source!A1*2");
        wb.recalculate();
        expect(wb.getValue("Target", B1)).toBe(1000);
        throw new Error("abort");
      }),
    ).toThrow("abort");

    // Values AND the dependency edge (formula text) are restored.
    wb.recalculate();
    expect(wb.getSheet("Target")!.getCell(B1)!.formula).toBe("=Source!A1+1");
    expect(wb.getValue("Target", B1)).toBe(11);
    wb.getSheet("Source")!.setCellValue(A1, 20);
    wb.recalculate();
    expect(wb.getValue("Target", B1)).toBe(21);
  });
});

describe("CS-002D.2 qualified-reference scanner", () => {
  it("scans unquoted and quoted sheet names, escaped apostrophes, and ranges", () => {
    const tokens = scanQualifiedReferences(
      "=Source!A1 + 'Other Data'!B2:C3 + 'O''Brien'!$D$4",
    );
    expect(tokens.map((t) => t.sheet)).toEqual([
      "Source",
      "Other Data",
      "O'Brien",
    ]);
    expect(tokens[0]).toMatchObject({ kind: "cell", cell: { row: 1, col: 1 } });
    expect(tokens[1]).toMatchObject({
      kind: "range",
      range: { startRow: 2, startCol: 2, endRow: 3, endCol: 3 },
    });
    expect(tokens[2]).toMatchObject({ kind: "cell", cell: { row: 4, col: 4 } });
  });

  it("ignores qualified-looking text inside string literals", () => {
    expect(scanQualifiedReferences('="Source!A1 is text"')).toEqual([]);
  });

  it("does not treat a bare local reference as qualified", () => {
    expect(scanQualifiedReferences("=A1+B2")).toEqual([]);
  });

  it("rejects a valid reference prefix embedded in a longer malformed token", () => {
    // Trailing letters/digits/colon must not leave a partially-accepted ref.
    expect(scanQualifiedReferences("=Source!A1ABC")).toEqual([]);
    expect(scanQualifiedReferences("=Source!A12345678")).toEqual([]); // 8-digit row
    expect(scanQualifiedReferences("=Source!A1:")).toEqual([]); // dangling colon
    // A well-formed reference immediately before an operator is still accepted.
    expect(scanQualifiedReferences("=Source!A1+1").map((t) => t.raw)).toEqual([
      "Source!A1",
    ]);
  });
});

/**
 * CS-002D.2R — correctness hardening regressions authorized by the review.
 */
describe("CS-002D.2R hardening regressions", () => {
  it("delete then recreate a same-name sheet keeps old references #REF!", () => {
    const wb = new WorkbookCalculationPrototype();
    const source = wb.addSheet("Source");
    const target = wb.addSheet("Target");
    source.setCellValue(A1, 10);
    target.setCellFormula(B1, "=Source!A1+1");
    wb.recalculate();
    expect(target.getCellValue(B1)).toBe(11);

    const originalId = wb.getSheetId("Source");
    wb.deleteSheet("Source");
    wb.recalculate();
    expect(target.getCellValue(B1)).toBe("#REF!");

    // Recreate a NEW sheet that happens to reuse the display name.
    const recreated = wb.addSheet("Source");
    expect(wb.getSheetId("Source")).not.toBe(originalId); // distinct identity
    recreated.setCellValue(A1, 999);
    wb.recalculate();

    // The old reference was permanently invalidated; it must NOT rebind.
    expect(target.getCellValue(B1)).toBe("#REF!");
  });

  it("qualified self-reference yields #CIRC!", () => {
    const wb = new WorkbookCalculationPrototype();
    const a = wb.addSheet("A");
    a.setCellFormula(A1, "=A!A1+1");
    wb.recalculate();
    expect(a.getCellValue(A1)).toBe("#CIRC!");
  });

  it("self-inclusive qualified range yields #CIRC!", () => {
    const wb = new WorkbookCalculationPrototype();
    const a = wb.addSheet("A");
    const A2 = { row: 2, col: 1 };
    // A1 = SUM(A!A1:A2) — the qualified range contains the formula itself.
    a.setCellFormula(A1, "=SUM(A!A1:A2)");
    a.setCellValue(A2, 5);
    const result = wb.recalculate();
    expect(result.circular).toBeGreaterThan(0);
    expect(a.getCellValue(A1)).toBe("#CIRC!");
  });

  it("local self-inclusive range cycle yields #CIRC!", () => {
    const wb = new WorkbookCalculationPrototype();
    const a = wb.addSheet("A");
    const A2 = { row: 2, col: 1 };
    // Pure local range cycle: A1 = SUM(A1:A2); the range watcher includes A1.
    a.setCellValue(A2, 3);
    a.setCellFormula(A1, "=SUM(A1:A2)");
    wb.recalculate();
    expect(a.getCellValue(A1)).toBe("#CIRC!");
  });

  it("direct local self-reference yields #CIRC!", () => {
    const wb = new WorkbookCalculationPrototype();
    const a = wb.addSheet("A");
    a.setCellFormula(A1, "=A1+1");
    wb.recalculate();
    expect(a.getCellValue(A1)).toBe("#CIRC!");
  });

  it("propagates dirty through local → cross-sheet → downstream chains", () => {
    const wb = new WorkbookCalculationPrototype();
    const a = wb.addSheet("A");
    const b = wb.addSheet("B");
    const A2 = { row: 2, col: 1 };
    const B2 = { row: 2, col: 2 };

    a.setCellValue(A1, 10);
    a.setCellFormula(A2, "=A1+5"); // local formula on A
    b.setCellFormula(B1, "=A!A2*2"); // cross-sheet dependent of a LOCAL formula
    b.setCellFormula(B2, "=B1+1"); // downstream local formula on B
    wb.recalculate();
    expect(a.getCellValue(A2)).toBe(15);
    expect(b.getCellValue(B1)).toBe(30);
    expect(b.getCellValue(B2)).toBe(31);

    // Editing a VALUE (A!A1) changes a LOCAL formula (A!A2) whose derived result
    // feeds a cross-sheet formula (B!B1) and its downstream (B!B2). All must be
    // marked dirty even though B1 depends on a derived (formula-result) value.
    a.setCellValue(A1, 20);
    expect(wb.isDirty("A", A2)).toBe(true);
    expect(wb.isDirty("B", B1)).toBe(true);
    expect(wb.isDirty("B", B2)).toBe(true);

    wb.recalculate();
    expect(a.getCellValue(A2)).toBe(25);
    expect(b.getCellValue(B1)).toBe(50);
    expect(b.getCellValue(B2)).toBe(51);
  });

  it("restores identical references from a reversed-order snapshot", () => {
    const wb = new WorkbookCalculationPrototype();
    const source = wb.addSheet("Source");
    const target = wb.addSheet("Target");
    source.setCellValue(A1, 30);
    target.setCellFormula(B1, "=Source!A1+1");
    wb.recalculate();

    const envelope = JSON.parse(
      JSON.stringify(wb.toSnapshot()),
    ) as WorkbookSnapshotEnvelope;
    // Reverse the sheet order so Target (the dependent) precedes its Source.
    envelope.sheets.reverse();

    const restored = WorkbookCalculationPrototype.fromSnapshot(envelope);
    restored.recalculate();
    expect(restored.getValue("Target", B1)).toBe(31);
    restored.getSheet("Source")!.setCellValue(A1, 41);
    restored.recalculate();
    expect(restored.getValue("Target", B1)).toBe(42);
  });

  it("rejects snapshots with duplicate ids or inconsistent sequence before exposing state", () => {
    const wb = new WorkbookCalculationPrototype();
    wb.addSheet("Source");
    wb.addSheet("Target");
    const good = JSON.parse(
      JSON.stringify(wb.toSnapshot()),
    ) as WorkbookSnapshotEnvelope;

    const dupId = JSON.parse(JSON.stringify(good)) as WorkbookSnapshotEnvelope;
    dupId.sheets[1].id = dupId.sheets[0].id;
    expect(() => WorkbookCalculationPrototype.fromSnapshot(dupId)).toThrow(
      /Duplicate sheet id/,
    );

    const badSeq = JSON.parse(JSON.stringify(good)) as WorkbookSnapshotEnvelope;
    badSeq.nextSheetSequence = 1; // lower than existing ids
    expect(() => WorkbookCalculationPrototype.fromSnapshot(badSeq)).toThrow(
      /sequence counter is inconsistent/,
    );

    const badCoord = JSON.parse(
      JSON.stringify(good),
    ) as WorkbookSnapshotEnvelope;
    badCoord.sheets[0].state.cells.push({
      row: 1,
      col: 20001,
      cell: { value: 7 },
    });
    expect(() => WorkbookCalculationPrototype.fromSnapshot(badCoord)).toThrow(
      RangeError,
    );
  });

  it("keeps pre-transaction worksheet handles valid after rollback", () => {
    const wb = new WorkbookCalculationPrototype();
    const source = wb.addSheet("Source");
    const target = wb.addSheet("Target");
    source.setCellValue(A1, 10);
    target.setCellFormula(B1, "=Source!A1+1");
    wb.recalculate();

    expect(() =>
      wb.transaction(() => {
        source.setCellValue(A1, 99);
        throw new Error("abort");
      }),
    ).toThrow("abort");

    // Finding D: the handle captured before the transaction survives rollback
    // (same object, in-place restore) and remains wired to the coordinator.
    expect(wb.getSheet("Source")).toBe(source);
    expect(source.getCellValue(A1)).toBe(10); // value rolled back

    source.setCellValue(A1, 20); // mutate via the retained handle
    expect(wb.isDirty("Target", B1)).toBe(true); // observation still live
    wb.recalculate();
    expect(wb.getValue("Target", B1)).toBe(21);
  });

  it("detaches handles for sheets created inside a rolled-back transaction", () => {
    const wb = new WorkbookCalculationPrototype();
    wb.addSheet("Keep");
    let created: ReturnType<WorkbookCalculationPrototype["addSheet"]> | null =
      null;
    expect(() =>
      wb.transaction(() => {
        created = wb.addSheet("Temp");
        created.setCellValue(A1, 5);
        throw new Error("abort");
      }),
    ).toThrow("abort");

    // The sheet created during the transaction is gone; its handle is inert.
    expect(wb.getSheet("Temp")).toBeUndefined();
    expect(wb.getSheetNames()).toEqual(["Keep"]);
    created!.setCellValue(A1, 123); // must not resurrect or corrupt the workbook
    expect(wb.getSheet("Temp")).toBeUndefined();
  });

  it("rewrites only true reference tokens on rename, not string literals", () => {
    const wb = new WorkbookCalculationPrototype();
    const source = wb.addSheet("Source");
    const target = wb.addSheet("Target");
    source.setCellValue(A1, 7);
    // The sheet name also appears inside a string literal that must NOT change.
    target.setCellFormula(B1, '=Source!A1 & " from Source!A1 label"');
    wb.recalculate();

    wb.renameSheet("Source", "O'Brien");
    const formula = wb.getSheet("Target")!.getCell(B1)!.formula!;
    // The reference token is rewritten and quoted; the literal is untouched.
    expect(formula).toContain("'O''Brien'!A1");
    expect(formula).toContain(' from Source!A1 label"');
    expect(formula).not.toContain("Source!A1 &");
  });

  it("returns deterministic #REF! for oversized qualified coordinates", () => {
    const wb = new WorkbookCalculationPrototype();
    const source = wb.addSheet("Source");
    const target = wb.addSheet("Target");
    source.setCellValue(A1, 1);
    // Row 1048577 exceeds the Excel maximum (1048576) but is well-formed.
    target.setCellFormula(B1, "=Source!A1048577+1");
    const target2 = { row: 2, col: 2 };
    // Column XFE (16385) exceeds the Excel maximum column (XFD = 16384).
    target.setCellFormula(target2, "=Source!XFE1+1");
    expect(() => wb.recalculate()).not.toThrow(); // no graph corruption
    expect(target.getCellValue(B1)).toBe("#REF!");
    expect(target.getCellValue(target2)).toBe("#REF!");
  });

  it("rename preserves the parsed suffix when the quoted sheet name contains '!'", () => {
    const wb = new WorkbookCalculationPrototype();
    // '!' is a legal worksheet-name character (not in INVALID_SHEET_NAME), so a
    // quoted qualifier can itself contain '!'. The rename must derive the tail
    // from the parsed span (`refTail`), never the first textual exclamation.
    const ops = wb.addSheet("Ops!2026");
    const target = wb.addSheet("Target");
    ops.setCellValue(A1, 9);
    target.setCellFormula(B1, "='Ops!2026'!A1+1");
    wb.recalculate();
    expect(target.getCellValue(B1)).toBe(10);

    wb.renameSheet("Ops!2026", "Fin!2027");
    const formula = wb.getSheet("Target")!.getCell(B1)!.formula!;
    // The whole quoted name is replaced and the `!A1` tail kept intact — the
    // old `indexOf('!')` logic would have produced `'Fin!2027'!2026'!A1`.
    expect(formula).toBe("='Fin!2027'!A1+1");
    expect(formula).not.toContain("'!2026'");

    wb.getSheet("Fin!2027")!.setCellValue(A1, 99);
    expect(wb.isDirty("Target", B1)).toBe(true);
    wb.recalculate();
    expect(target.getCellValue(B1)).toBe(100);
  });

  it("zero-row and otherwise invalid qualified coordinates resolve to #REF! with no graph binding", () => {
    const wb = new WorkbookCalculationPrototype();
    const source = wb.addSheet("Source");
    const target = wb.addSheet("Target");
    source.setCellValue(A1, 42);

    const cRef = { row: 1, col: 3 };
    const cAbs = { row: 2, col: 3 };
    const cRange = { row: 3, col: 3 };
    target.setCellFormula(B1, "=Source!A0+1"); // row 0 → out of bounds
    target.setCellFormula(cRef, "=Source!A0+1");
    target.setCellFormula(cAbs, "=Source!$A$0+1"); // absolute form, still row 0
    target.setCellFormula(cRange, "=SUM(Source!A0:A5)"); // range starting at row 0

    expect(() => wb.recalculate()).not.toThrow();
    expect(target.getCellValue(B1)).toBe("#REF!");
    expect(target.getCellValue(cAbs)).toBe("#REF!");
    expect(target.getCellValue(cRange)).toBe("#REF!");

    // An invalid reference must NOT create a live precedent: editing the real
    // Source!A1 (or A5, which an unchecked `A0:A5` range would spuriously watch)
    // must leave the invalid dependents clean.
    source.setCellValue(A1, 1000);
    source.setCellValue(A5, 1000);
    expect(wb.isDirty("Target", cAbs)).toBe(false);
    expect(wb.isDirty("Target", cRange)).toBe(false);
  });

  it("scanner emits out-of-bounds tokens with inBounds=false and a parsed refTail", () => {
    const zero = scanQualifiedReferences("=Source!A0+1");
    expect(zero).toHaveLength(1);
    expect(zero[0].inBounds).toBe(false);
    expect(zero[0].refTail).toBe("!A0");

    const absZero = scanQualifiedReferences("=Source!$A$0");
    expect(absZero[0].inBounds).toBe(false);
    expect(absZero[0].refTail).toBe("!$A$0");

    const quotedBang = scanQualifiedReferences("='Ops!2026'!A1");
    expect(quotedBang).toHaveLength(1);
    expect(quotedBang[0].sheet).toBe("Ops!2026");
    expect(quotedBang[0].refTail).toBe("!A1");
    expect(quotedBang[0].inBounds).toBe(true);

    const inRange = scanQualifiedReferences("=SUM(Source!A0:A5)");
    expect(inRange[0].inBounds).toBe(false); // startRow 0 is out of bounds
    expect(inRange[0].refTail).toBe("!A0:A5");
  });
});
