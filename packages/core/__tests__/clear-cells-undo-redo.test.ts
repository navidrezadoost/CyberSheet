import { Workbook, CommandManager, ClearCellsCommand } from "../src";

describe("ClearCellsCommand undo/redo stability", () => {
  test("restores formula text and display value after undo", () => {
    const workbook = new Workbook();
    const sheet = workbook.addSheet("Sheet1", 100, 26);
    const commands = new CommandManager(100, sheet);

    sheet.setCellValue({ row: 1, col: 1 }, 5);
    sheet.setCellFormula({ row: 1, col: 2 }, "=A1*2", 10);
    sheet.setCellValue({ row: 1, col: 3 }, 99);

    commands.execute(
      new ClearCellsCommand(sheet, {
        start: { row: 1, col: 1 },
        end: { row: 1, col: 2 },
      }),
    );

    expect(sheet.getCellValue({ row: 1, col: 1 })).toBeNull();
    expect(sheet.getCellValue({ row: 1, col: 2 })).toBeNull();
    expect(sheet.getCell({ row: 1, col: 2 })?.formula).not.toBe("=A1*2");
    expect(sheet.getCellValue({ row: 1, col: 3 })).toBe(99);

    expect(commands.undo()).toBe(true);

    expect(sheet.getCellValue({ row: 1, col: 1 })).toBe(5);
    expect(sheet.getCell({ row: 1, col: 1 })?.formula).toBeUndefined();
    expect(sheet.getCell({ row: 1, col: 2 })?.formula).toBe("=A1*2");
    expect(sheet.getCellValue({ row: 1, col: 2 })).toBe(10);
    expect(sheet.getCellValue({ row: 1, col: 3 })).toBe(99);
  });

  test("remains stable over repeated undo/redo cycles", () => {
    const workbook = new Workbook();
    const sheet = workbook.addSheet("Sheet1", 100, 26);
    const commands = new CommandManager(100, sheet);

    sheet.setCellValue({ row: 2, col: 1 }, 7);
    sheet.setCellFormula({ row: 2, col: 2 }, "=A2+1", 8);
    sheet.setCellValue({ row: 2, col: 3 }, 1234);

    commands.execute(
      new ClearCellsCommand(sheet, {
        start: { row: 2, col: 1 },
        end: { row: 2, col: 2 },
      }),
    );

    for (let i = 0; i < 5; i++) {
      expect(commands.undo()).toBe(true);
      expect(sheet.getCellValue({ row: 2, col: 1 })).toBe(7);
      expect(sheet.getCell({ row: 2, col: 2 })?.formula).toBe("=A2+1");
      expect(sheet.getCellValue({ row: 2, col: 2 })).toBe(8);
      expect(sheet.getCellValue({ row: 2, col: 3 })).toBe(1234);

      expect(commands.redo()).toBe(true);
      expect(sheet.getCellValue({ row: 2, col: 1 })).toBeNull();
      expect(sheet.getCellValue({ row: 2, col: 2 })).toBeNull();
      expect(sheet.getCell({ row: 2, col: 2 })?.formula).not.toBe("=A2+1");
      expect(sheet.getCellValue({ row: 2, col: 3 })).toBe(1234);
    }
  });
});
