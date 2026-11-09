import { test, expect } from '@playwright/test';

/**
 * Smoke tests for CyberSheet core functionality
 * These tests verify basic rendering and formula evaluation
 */

test.describe('CyberSheet Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the React example
    await page.goto('/examples/e2e-fixture/index.html');
    
    // Wait for the sheet to be initialized
    await page.waitForSelector('canvas', { timeout: 10000 });
    
    // Give it a moment to render
    await page.waitForTimeout(1000);
  });

  test('should load and render the spreadsheet', async ({ page }) => {
    // Check that canvas elements exist
    const canvases = await page.locator('canvas').count();
    expect(canvases).toBeGreaterThan(0);
    
    // Check that the page title exists
    const title = await page.locator('h1').first();
    await expect(title).toBeVisible();
  });

  test('should display cell values', async ({ page }) => {
    // Check if we can read cell values from the page
    // This assumes the example has some test data
    await expect(page.locator('canvas').first()).toBeVisible();
    const data = await page.evaluate(() => {
      const cyberSheet = (window as any).cyberSheet;
      const sheet = cyberSheet.sheet;
      return {
        product: sheet.getCellValue({ row: 2, col: 1 }),
        price: sheet.getCellValue({ row: 2, col: 2 }),
        total: cyberSheet.formulaResult,
      };
    });
    expect(data).toEqual({ product: 'Widget', price: 100, total: 300 });
  });

  test('should handle basic formulas', async ({ page }) => {
    // This is a placeholder - we'll expand this once we have
    // better access to the sheet data through the UI
    await expect(page.locator('canvas').first()).toBeVisible();
    const formula = await page.evaluate(() =>
      (window as any).cyberSheet.sheet.getCell({ row: 4, col: 2 }).formula,
    );
    expect(formula).toBe('=SUM(B2:B3)');
  });
});

test.describe('React workbook canvas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/examples/e2e-fixture/index.html');
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(1000);
  });

  test('should render the workbook heading and canvas together', async ({ page }) => {
    await expect(page.locator('canvas').first()).toBeVisible();
    await expect(page.locator('h1')).toHaveText('CyberSheet E2E Test Fixture');
  });
});

test.describe('Rendered sheet identity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/examples/e2e-fixture/index.html');
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(1000);
  });

  test('should expose the name of the rendered sheet', async ({ page }) => {
    await expect(page.locator('canvas').first()).toBeVisible();
    const sheetName = await page.evaluate(() => (window as any).cyberSheet.sheet.name);
    expect(sheetName).toBe('Sheet1');
    
    // TODO: Add more specific tests once sheet tabs are in the example
  });
});
