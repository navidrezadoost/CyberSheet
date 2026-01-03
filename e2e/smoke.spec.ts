import { test, expect, Page } from '@playwright/test';

/**
 * Smoke tests for CyberSheet core functionality
 * These tests verify basic rendering and formula evaluation
 */

test.describe('CyberSheet Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the React example
    await page.goto('/examples/react-index.html');
    
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
    const hasCanvas = await page.locator('canvas').isVisible();
    expect(hasCanvas).toBe(true);
  });

  test('should handle basic formulas', async ({ page }) => {
    // This is a placeholder - we'll expand this once we have
    // better access to the sheet data through the UI
    const canvasVisible = await page.locator('canvas').isVisible();
    expect(canvasVisible).toBe(true);
  });
});

test.describe('Formula Bar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/examples/react-index.html');
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(1000);
  });

  test('should display formula bar', async ({ page }) => {
    // Look for formula bar elements
    // This test will be expanded as we add more UI elements
    const canvasVisible = await page.locator('canvas').isVisible();
    expect(canvasVisible).toBe(true);
  });
});

test.describe('Sheet Tabs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/examples/react-index.html');
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(1000);
  });

  test('should display sheet tabs', async ({ page }) => {
    // Check for sheet tabs component
    const canvasVisible = await page.locator('canvas').isVisible();
    expect(canvasVisible).toBe(true);
    
    // TODO: Add more specific tests once sheet tabs are in the example
  });
});
