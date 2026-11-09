import { PivotAnchorIndexImpl } from "../src/PivotAnchorIndex";
import type { PivotId } from "../src/PivotRegistry";

const pivotId = (value: string) => value as PivotId;

describe("PivotAnchorIndex standalone contract", () => {
  it("registers an anchor and returns a detached reverse-lookup address", () => {
    const index = new PivotAnchorIndexImpl();
    const anchor = { row: 4, col: 3 };
    index.set(anchor, pivotId("pivot-1"), "sheet-a");
    anchor.row = 99;

    expect(index.get({ row: 4, col: 3 }, "sheet-a")).toBe("pivot-1");
    expect(index.has({ row: 4, col: 3 }, "sheet-a")).toBe(true);
    expect(index.getAnchor(pivotId("pivot-1"))).toEqual({ row: 4, col: 3 });
    expect(index.getAnchor(pivotId("pivot-1"))).not.toBe(index.getAnchor(pivotId("pivot-1")));
  });

  it("replaces a pivot at an occupied anchor and supports address deletion", () => {
    const index = new PivotAnchorIndexImpl();
    const anchor = { row: 8, col: 5 };
    index.set(anchor, pivotId("old-pivot"), "sheet-a");
    index.set(anchor, pivotId("new-pivot"), "sheet-a");

    expect(index.get(anchor, "sheet-a")).toBe(pivotId("new-pivot"));
    expect(index.deleteByAddress(anchor, "sheet-a")).toBe(true);
    expect(index.get(anchor, "sheet-a")).toBeNull();
    expect(index.getAnchor(pivotId("new-pivot"))).toBeNull();
  });

  it("keeps the replacement when the displaced pivot id is later deleted", () => {
    const index = new PivotAnchorIndexImpl();
    const anchor = { row: 8, col: 5 };
    index.set(anchor, pivotId("old-pivot"), "sheet-a");
    index.set(anchor, pivotId("new-pivot"), "sheet-a");

    expect(index.getAnchor(pivotId("old-pivot"))).toBeNull();
    expect(index.delete(pivotId("old-pivot"))).toBe(false);
    expect(index.get(anchor, "sheet-a")).toBe(pivotId("new-pivot"));
    expect(index.getAnchor(pivotId("new-pivot"))).toEqual(anchor);

    expect(index.delete(pivotId("new-pivot"))).toBe(true);
    expect(index.get(anchor, "sheet-a")).toBeNull();
    expect(index.getAnchor(pivotId("new-pivot"))).toBeNull();
  });

  it("reuses an address after deletion and keeps repeated operations idempotent", () => {
    const index = new PivotAnchorIndexImpl();
    const anchor = { row: 5, col: 7 };
    const first = pivotId("first-pivot");
    const second = pivotId("second-pivot");

    index.set(anchor, first, "sheet-a");
    index.set(anchor, first, "sheet-a");
    expect(index.get(anchor, "sheet-a")).toBe(first);
    expect(index.getAnchor(first)).toEqual(anchor);
    expect(index.delete(first)).toBe(true);
    expect(index.delete(first)).toBe(false);
    expect(index.get(anchor, "sheet-a")).toBeNull();
    expect(index.getAnchor(first)).toBeNull();

    index.set(anchor, second, "sheet-a");
    expect(index.get(anchor, "sheet-a")).toBe(second);
    expect(index.getAnchor(second)).toEqual(anchor);
    expect(index.delete(pivotId("missing-pivot"))).toBe(false);
    expect(index.deleteByAddress({ row: 5, col: 8 }, "sheet-a")).toBe(false);
    expect(index.get(anchor, "sheet-a")).toBe(second);
    expect(index.getAnchor(second)).toEqual(anchor);

    expect(index.deleteByAddress(anchor, "sheet-a")).toBe(true);
    expect(index.get(anchor, "sheet-a")).toBeNull();
    expect(index.getAnchor(second)).toBeNull();
  });

  it("moves the same pivot, deletes by id, and keeps identical coordinates isolated by sheet", () => {
    const index = new PivotAnchorIndexImpl();
    const anchor = { row: 2, col: 6 };
    index.set(anchor, pivotId("pivot-a"), "sheet-a");
    index.set(anchor, pivotId("pivot-b"), "sheet-b");
    index.set({ row: 9, col: 1 }, pivotId("pivot-a"), "sheet-a");

    expect(index.get(anchor, "sheet-a")).toBeNull();
    expect(index.get(anchor, "sheet-b")).toBe(pivotId("pivot-b"));
    expect(index.getAnchor(pivotId("pivot-a"))).toEqual({ row: 9, col: 1 });
    expect(index.delete(pivotId("pivot-a"))).toBe(true);
    expect(index.delete(pivotId("pivot-a"))).toBe(false);
    expect(index.get(anchor, "sheet-b")).toBe(pivotId("pivot-b"));
  });

  it("clears all forward and reverse entries", () => {
    const index = new PivotAnchorIndexImpl();
    index.set({ row: 1, col: 1 }, pivotId("pivot-1"), "sheet-a");
    index.clear();

    expect(index.has({ row: 1, col: 1 }, "sheet-a")).toBe(false);
    expect(index.getAnchor(pivotId("pivot-1"))).toBeNull();
  });
});
