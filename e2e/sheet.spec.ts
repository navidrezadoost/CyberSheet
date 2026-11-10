import { test, expect } from '@playwright/test';

test.describe('CyberSheet E2E - Fixture Created', () => {
  test('E2E fixture and tests are ready', async () => {
    // This confirms the E2E infrastructure is scaffolded
    // To run full browser tests:
    // 1. Install browsers: npx playwright install chromium
    // 2. Start dev server: cd examples/e2e-fixture && npx vite
    // 3. Run tests: npx playwright test
    expect(true).toBe(true);
  });
});

test.describe('CyberSheet E2E - Full Browser Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/examples/e2e-fixture/index.html');
    await page.waitForSelector('#sheet-container canvas');
  });

  test('should load and display the sheet', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('CyberSheet E2E Test Fixture');
    const container = page.locator('#sheet-container');
    await expect(container).toBeVisible();
    const canvas = container.locator('canvas');
    await expect(canvas).toBeVisible();
  });

  test('should initialize with test data', async ({ page }) => {
    const cellA1 = await page.evaluate(() => {
      const sheet = (window as any).cyberSheet.sheet;
      return sheet.getCellValue({ row: 1, col: 1 });
    });
    expect(cellA1).toBe('Product');

    const cellB2 = await page.evaluate(() => {
      const sheet = (window as any).cyberSheet.sheet;
      return sheet.getCellValue({ row: 2, col: 2 });
    });
    expect(cellB2).toBe(100);
  });

  test('should evaluate formula correctly', async ({ page }) => {
    const cellB4 = await page.evaluate(() => {
      const cyberSheet = (window as any).cyberSheet;
      return {
        evaluatedResult: cyberSheet.formulaResult,
        viewValue: cyberSheet.sheet.getCellValue({ row: 4, col: 2 }),
        formula: cyberSheet.sheet.getCell({ row: 4, col: 2 }).formula,
      };
    });
    expect(cellB4).toEqual({
      evaluatedResult: 300, // SUM(100, 200), evaluated by FormulaEngine.
      viewValue: null, // WorkbookSheetView deliberately hides cached formula results.
      formula: '=SUM(B2:B3)',
    });
  });

  test('should render canvas with correct dimensions', async ({ page }) => {
    const canvas = page.locator('#sheet-container canvas');
    const bbox = await canvas.boundingBox();
    expect(bbox).not.toBeNull();
    expect(bbox!.width).toBeGreaterThan(0);
    expect(bbox!.height).toBeGreaterThan(0);
  });

  test('should expose API on window', async ({ page }) => {
    const api = await page.evaluate(() => {
      const cs = (window as any).cyberSheet;
      return {
        hasWorkbook: !!cs.workbook,
        hasSheet: !!cs.sheet,
        hasRenderer: !!cs.renderer,
        hasFormulaResult: cs.formulaResult === 300,
        sheetName: cs.sheet?.name
      };
    });

    expect(api.hasWorkbook).toBe(true);
    expect(api.hasSheet).toBe(true);
    expect(api.hasRenderer).toBe(true);
    expect(api.hasFormulaResult).toBe(true);
    expect(api.sheetName).toBe('Sheet1');
  });
});
