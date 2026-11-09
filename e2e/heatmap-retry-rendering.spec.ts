import { expect, test } from "@playwright/test";

type HeatmapSnapshot = {
  range: { min: number; max: number } | null;
  formulaPixel: number[];
  ordinaryNumericPixel: number[];
  pluginObservations: Array<{ value: unknown; min?: number; max?: number }>;
  redrawCount: number;
  scheduleRedrawCount: number;
  paintFrameCount: number;
  formulaEvaluationCount: number;
  heatmapCalculationCount: number;
  ordinaryCellStyle: unknown;
  formulaCell: { formula?: string; value?: unknown };
  ordinaryValue: unknown;
  laterNumericValue: unknown;
  owned: boolean;
  worksheetEventCount: number;
};

declare global {
  interface Window {
    __heatmapRetryFixture: {
      isIdle: () => boolean;
      renderInitial: () => HeatmapSnapshot;
      runFailedRetry: () => HeatmapSnapshot & { colCountReads: number; error: string };
      restoreDimensionRead: () => void;
      renderRecovery: () => HeatmapSnapshot;
      renderSnapshot: () => HeatmapSnapshot;
      dispose: () => void;
    };
  }
}

test("failed owner-aware heatmap retry repaints without formula evaluation", async ({ page, browser, browserName }, testInfo) => {
  test.skip(browserName !== "chromium", "The bounded characterization targets Chromium canvas pixels.");

  await page.goto("/e2e/fixtures/heatmap-retry.html");
  await page.waitForFunction(() => document.documentElement.dataset.fixtureReady === "true");

  const waitForRendererIdle = async () => {
    await page.waitForFunction(() => window.__heatmapRetryFixture.isIdle());
    await page.evaluate(() => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    }));
    await page.waitForFunction(() => window.__heatmapRetryFixture.isIdle());
  };

  try {
    await waitForRendererIdle();
    const initial = await page.evaluate(() => window.__heatmapRetryFixture.renderInitial());
    expect(initial.range).toEqual({ min: 12, max: 777 });
    expect(initial.heatmapCalculationCount).toBe(1);
    expect(initial.pluginObservations).toContainEqual({ value: 777, min: 12, max: 777 });
    expect(initial.formulaPixel).toEqual([255, 0, 170, 255]);

    const failed = await page.evaluate(() => window.__heatmapRetryFixture.runFailedRetry());
    expect(failed.owned).toBe(true);
    expect(failed.colCountReads).toBe(3);
    expect(failed.error).toBe("browser-controlled owner retry failure");
    expect(failed.range).toBeNull();
    expect(failed.redrawCount).toBe(0);
    expect(failed.scheduleRedrawCount).toBe(0);
    expect(failed.paintFrameCount).toBe(1);
    expect(failed.formulaEvaluationCount).toBe(0);
    expect(failed.heatmapCalculationCount).toBe(1);
    expect(failed.pluginObservations).toContainEqual({ value: null, min: undefined, max: undefined });
    expect(failed.formulaCell).toMatchObject({ formula: "=700+77", value: 777 });
    expect(failed.ordinaryValue).toBe(12);
    expect(failed.laterNumericValue).toBe(30);
    expect(failed.worksheetEventCount).toBe(0);
    expect(failed.ordinaryCellStyle).toEqual(initial.ordinaryCellStyle);
    expect(failed.formulaPixel).not.toEqual(initial.formulaPixel);

    await waitForRendererIdle();
    const afterBrowserFrame = await page.evaluate(() => window.__heatmapRetryFixture.renderSnapshot());
    expect(afterBrowserFrame.formulaPixel).toEqual(failed.formulaPixel);
    expect(afterBrowserFrame.range).toBeNull();

    await page.evaluate(() => window.__heatmapRetryFixture.restoreDimensionRead());
    const recovered = await page.evaluate(() => window.__heatmapRetryFixture.renderRecovery());
    expect(recovered.range).toEqual({ min: 12, max: 30 });
    expect(recovered.redrawCount).toBe(1);
    expect(recovered.scheduleRedrawCount).toBe(0);
    expect(recovered.paintFrameCount).toBe(1);
    expect(recovered.formulaEvaluationCount).toBe(1);
    expect(recovered.heatmapCalculationCount).toBe(1);
    expect(recovered.pluginObservations).toContainEqual({ value: null, min: 12, max: 30 });
    expect(recovered.formulaPixel).not.toEqual(initial.formulaPixel);
    expect(recovered.ordinaryNumericPixel).toEqual([0, 204, 68, 255]);
    expect(recovered.formulaCell).toMatchObject({ formula: "=700+77", value: 777 });
    expect(recovered.ordinaryValue).toBe(12);
    expect(recovered.laterNumericValue).toBe(30);
    expect(recovered.worksheetEventCount).toBe(0);
    expect(recovered.ordinaryCellStyle).toEqual(initial.ordinaryCellStyle);

    const evidence = {
      browser: { name: browserName, version: browser.version() },
      initial,
      failed,
      afterBrowserFrame,
      recovered,
    };
    console.log("H04_BROWSER_EVIDENCE", JSON.stringify(evidence));
    await testInfo.attach("heatmap-retry-browser-observations.json", {
      body: JSON.stringify(evidence, null, 2),
      contentType: "application/json",
    });
  } finally {
    await page.evaluate(() => window.__heatmapRetryFixture?.dispose());
  }
});
