import { assertWorksheetAddress, MAX_WORKSHEET_COLUMN, MAX_WORKSHEET_ROW } from "../src/dag/DependencyGraph";
import { CellStoreV1, packKey, unpackKey } from "../src/storage/CellStore";

describe("CellStore packed address contract", () => {
  it("round-trips supported corner coordinates as safe, unique integer keys", () => {
    const addresses = [
      { row: 1, col: 1 },
      { row: 1, col: MAX_WORKSHEET_COLUMN },
      { row: MAX_WORKSHEET_ROW, col: 1 },
      { row: MAX_WORKSHEET_ROW, col: MAX_WORKSHEET_COLUMN },
      { row: MAX_WORKSHEET_ROW - 1, col: MAX_WORKSHEET_COLUMN - 1 },
    ];
    const keys = addresses.map(({ row, col }) => packKey(row, col));

    expect(keys.every(Number.isSafeInteger)).toBe(true);
    expect(new Set(keys).size).toBe(addresses.length);
    expect(keys.map(unpackKey)).toEqual(addresses);
    for (const { row, col } of addresses) {
      expect(() => assertWorksheetAddress(row, col)).not.toThrow();
    }
  });

  it("rejects coordinates outside the supported one-based Worksheet bounds", () => {
    for (const [row, col] of [
      [0, 1],
      [MAX_WORKSHEET_ROW + 1, 1],
      [1, 0],
      [1, MAX_WORKSHEET_COLUMN + 1],
      [1.5, 1],
    ]) {
      expect(() => assertWorksheetAddress(row, col)).toThrow(RangeError);
    }
  });

  it("stores both maximum-boundary cells independently", () => {
    const store = new CellStoreV1();
    const topRight = store.getOrCreate(1, MAX_WORKSHEET_COLUMN);
    const bottomLeft = store.getOrCreate(MAX_WORKSHEET_ROW, 1);
    topRight.value = "top-right";
    bottomLeft.value = "bottom-left";

    expect(store.size).toBe(2);
    expect(store.get(1, MAX_WORKSHEET_COLUMN)?.value).toBe("top-right");
    expect(store.get(MAX_WORKSHEET_ROW, 1)?.value).toBe("bottom-left");
  });
});
