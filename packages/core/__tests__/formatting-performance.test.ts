import {
  CommandManager,
  FormattingController,
  Workbook,
  isInternedStyle,
  type Address,
  type SheetEvents,
} from "../src";
import { GraphInvariantValidator } from "../src/dag/GraphInvariantValidator";

function makeSheet(rows: number, cols: number) {
  const wb = new Workbook();
  const ws = wb.addSheet("Sheet1", 5000, 100);
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++)
      ws.setCellValue({ row: r, col: c }, r * 1000 + c);
  }
  const commands = new CommandManager(100, ws);
  const formatting = new FormattingController(ws, commands);
  return { wb, ws, commands, formatting };
}

function grid(rows: number, cols: number): Address[] {
  const out: Address[] = [];
  for (let r = 1; r <= rows; r++)
    for (let c = 1; c <= cols; c++) out.push({ row: r, col: c });
  return out;
}

describe("formatting a large selection (Ctrl+A → Bold)", () => {
  test("every selected cell becomes bold and undo restores all of them", () => {
    const { ws, commands, formatting } = makeSheet(100, 20);
    const all = grid(100, 20);

    formatting.toggleBold(all);
    expect(all.every((a) => ws.getCellStyle(a)?.bold === true)).toBe(true);

    commands.undo();
    expect(all.every((a) => ws.getCellStyle(a)?.bold !== true)).toBe(true);

    commands.redo();
    expect(all.every((a) => ws.getCellStyle(a)?.bold === true)).toBe(true);
  });

  test("listeners hear about every cell exactly once, after the batch", () => {
    const { ws, formatting } = makeSheet(50, 10);
    const all = grid(50, 10);
    const seen = new Map<string, number>();
    ws.on((e: SheetEvents) => {
      if (e.type !== "style-changed") return;
      const key = `${e.address.row},${e.address.col}`;
      seen.set(key, (seen.get(key) ?? 0) + 1);
    });

    formatting.setBold(all, true);

    expect(seen.size).toBe(all.length);
    expect([...seen.values()].every((n) => n === 1)).toBe(true);
  });

  test("stays fast for 20k cells", () => {
    const { formatting, commands } = makeSheet(500, 40);
    const all = grid(500, 40);

    const start = performance.now();
    formatting.toggleBold(all);
    const elapsed = performance.now() - start;

    expect(commands.canUndo()).toBe(true);
    // Generous bound: the old per-cell-transaction path was an order of magnitude slower.
    expect(elapsed).toBeLessThan(2000);
  });

  test("pure formatting skips the DAG invariant walk", () => {
    const { formatting } = makeSheet(10, 5);
    const spy = jest.spyOn(GraphInvariantValidator, "validateAll");
    try {
      formatting.toggleBold(grid(10, 5));
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  test("range-descriptor path applies and undoes without pre-expanded addresses", () => {
    const { ws, commands, formatting } = makeSheet(200, 100);
    const ranges = [{ startRow: 1, endRow: 200, startCol: 1, endCol: 100 }];

    formatting.toggleBoldInRanges(ranges);
    expect(ws.getCellStyle({ row: 1, col: 1 })?.bold).toBe(true);
    expect(ws.getCellStyle({ row: 200, col: 100 })?.bold).toBe(true);

    commands.undo();
    expect(ws.getCellStyle({ row: 1, col: 1 })?.bold).not.toBe(true);
    expect(ws.getCellStyle({ row: 200, col: 100 })?.bold).not.toBe(true);
  });
});

describe("font size", () => {
  test("applies to every cell of a large selection", () => {
    const { ws, formatting } = makeSheet(120, 100); // 12k cells, above the old 10k UI cap
    const all = grid(120, 100);

    formatting.setFontSize(all, 20);

    expect(all.every((a) => ws.getCellStyle(a)?.fontSize === 20)).toBe(true);
  });

  test("grows rows to fit the larger font and undo restores the heights", () => {
    const { ws, commands, formatting } = makeSheet(3, 3);
    const before = ws.getRowHeight(2);

    formatting.setFontSize(grid(3, 3), 36);

    expect(ws.getRowHeight(2)).toBe(FormattingController.rowHeightForFont(36));
    expect(ws.getRowHeight(2)).toBeGreaterThan(before);

    commands.undo();
    expect(ws.getRowHeight(2)).toBe(before);
  });

  test("does not shrink rows that are already tall enough", () => {
    const { ws, formatting } = makeSheet(2, 2);
    ws.setRowHeight(1, 80);

    formatting.setFontSize(grid(2, 2), 14);

    expect(ws.getRowHeight(1)).toBe(80);
  });
});

describe("effective style on top of a row/column style", () => {
  test("merged style is canonical (interned) so the renderer assertion cannot throw", () => {
    const { ws, formatting } = makeSheet(3, 3);
    ws.setColumnStyle(2, { fill: "#ffeeaa" });

    formatting.setFontSize([{ row: 2, col: 2 }], 18);

    const effective = ws.getCellStyle({ row: 2, col: 2 });
    expect(effective?.fontSize).toBe(18);
    expect(effective?.fill).toBe("#ffeeaa");
    expect(isInternedStyle(effective)).toBe(true);
  });

  test("repeated reads return the same reference", () => {
    const { ws, formatting } = makeSheet(2, 2);
    ws.setRowStyle(1, { italic: true });
    formatting.setBold([{ row: 1, col: 1 }], true);

    expect(ws.getCellStyle({ row: 1, col: 1 })).toBe(
      ws.getCellStyle({ row: 1, col: 1 }),
    );
  });
});
