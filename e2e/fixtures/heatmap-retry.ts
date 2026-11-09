import { StyleCache, Workbook, Worksheet } from "@cyber-sheet/core";
import { CanvasRenderer } from "../../packages/renderer-canvas/src/CanvasRenderer";

const workbook = Workbook.create({ sheets: [{ name: "Base", rows: 1, cols: 1 }] });
const worksheet = new Worksheet("BrowserHeatmapRetry", 1, 4);
worksheet.setCellFormula({ row: 1, col: 1 }, "=700+77", 777);
worksheet.setCellValue({ row: 1, col: 2 }, 12);
worksheet.setCellStyle({ row: 1, col: 2 }, new StyleCache().intern({ bold: true, color: "#123456" }));
worksheet.setCellValue({ row: 1, col: 3 }, "not-a-number");
worksheet.setCellValue({ row: 1, col: 4 }, 30);
worksheet.completeScheduledRecalculation();
const worksheetEvents: unknown[] = [];
const eventSubscription = worksheet.on((event) => worksheetEvents.push(event));

const container = document.querySelector<HTMLElement>("#sheet");
if (!container) throw new Error("Missing heatmap fixture container");

const renderer = new CanvasRenderer(container, worksheet, { debug: false });
const pluginObservations: Array<{
  value: unknown;
  min?: number;
  max?: number;
}> = [];
renderer.addPlugin({
  id: "browser-heatmap-retry-observer",
  getCellBackground: ({ value, min, max }) => {
    pluginObservations.push({ value, min, max });
    if (value === 777 && max === 777) return "#ff00aa";
    if (typeof value === "number" && min === 12 && max === 30) return "#00cc44";
    return undefined;
  },
});

let redrawCount = 0;
let scheduleRedrawCount = 0;
let paintFrameCount = 0;
let formulaEvaluationCount = 0;
let heatmapCalculationCount = 0;
const originalRedraw = renderer.redraw.bind(renderer);
const originalScheduleRedraw = (renderer as any).scheduleRedraw.bind(renderer);
const originalPaintFrame = (renderer as any).paintFrame.bind(renderer);
const originalEvaluateVisibleFormulaCells = (renderer as any).evaluateVisibleFormulaCells.bind(renderer);
const originalComputeHeatmapRange = renderer.computeHeatmapRange.bind(renderer);
renderer.redraw = () => {
  redrawCount++;
  originalRedraw();
};
(renderer as any).scheduleRedraw = () => {
  scheduleRedrawCount++;
  originalScheduleRedraw();
};
(renderer as any).paintFrame = (...args: unknown[]) => {
  paintFrameCount++;
  return originalPaintFrame(...args);
};
(renderer as any).evaluateVisibleFormulaCells = (...args: unknown[]) => {
  formulaEvaluationCount++;
  return originalEvaluateVisibleFormulaCells(...args);
};
renderer.computeHeatmapRange = () => {
  heatmapCalculationCount++;
  return originalComputeHeatmapRange();
};

const originalColCount = worksheet.colCount;
const sampleCell = (row: number, col: number) => {
  const canvas = (renderer as any).canvas as HTMLCanvasElement;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context unavailable");
  const dpr = window.devicePixelRatio || 1;
  const x = 48 + (col - 1) * worksheet.getColumnWidth(col) + worksheet.getColumnWidth(col) / 2;
  const y = 24 + (row - 1) * worksheet.getRowHeight(row) + worksheet.getRowHeight(row) / 2;
  return Array.from(context.getImageData(Math.floor(x * dpr), Math.floor(y * dpr), 1, 1).data);
};

const snapshot = () => ({
  range: (renderer as any).heatmapRange as { min: number; max: number } | null,
  formulaPixel: sampleCell(1, 1),
  ordinaryNumericPixel: sampleCell(1, 2),
  pluginObservations: pluginObservations.slice(),
  redrawCount,
  scheduleRedrawCount,
  paintFrameCount,
  formulaEvaluationCount,
  heatmapCalculationCount,
  ordinaryCellStyle: worksheet.getCellStyle({ row: 1, col: 2 }),
  formulaCell: worksheet.getCell({ row: 1, col: 1 }),
  ordinaryValue: worksheet.getCellValue({ row: 1, col: 2 }),
  laterNumericValue: worksheet.getCellValue({ row: 1, col: 4 }),
  owned: worksheet.isWorkbookOwned(),
  worksheetEventCount: worksheetEvents.length,
});

(window as any).__heatmapRetryFixture = {
  renderer,
  worksheet,
  isIdle: () => (renderer as any).rafId === null && (renderer as any).resizeTimer === null,
  renderInitial: () => {
    redrawCount = 0;
    scheduleRedrawCount = 0;
    paintFrameCount = 0;
    formulaEvaluationCount = 0;
    heatmapCalculationCount = 0;
    pluginObservations.length = 0;
    renderer.computeHeatmapRange();
    return snapshot();
  },
  runFailedRetry: () => {
    redrawCount = 0;
    scheduleRedrawCount = 0;
    paintFrameCount = 0;
    formulaEvaluationCount = 0;
    heatmapCalculationCount = 0;
    pluginObservations.length = 0;
    const failure = new Error("browser-controlled owner retry failure");
    let colCountReads = 0;
    Object.defineProperty(worksheet, "colCount", {
      configurable: true,
      get() {
        colCountReads++;
        if (colCountReads === 2) {
          workbook.attachDevImportSheet(worksheet);
        }
        if (colCountReads === 3) throw failure;
        return originalColCount;
      },
    });
    let thrown: unknown;
    try {
      renderer.computeHeatmapRange();
    } catch (error) {
      thrown = error;
    }
    return { ...snapshot(), colCountReads, error: thrown instanceof Error ? thrown.message : String(thrown) };
  },
  restoreDimensionRead: () => {
    Object.defineProperty(worksheet, "colCount", {
      configurable: true,
      value: originalColCount,
    });
  },
  renderRecovery: () => {
    redrawCount = 0;
    scheduleRedrawCount = 0;
    paintFrameCount = 0;
    formulaEvaluationCount = 0;
    heatmapCalculationCount = 0;
    pluginObservations.length = 0;
    renderer.computeHeatmapRange();
    return snapshot();
  },
  renderSnapshot: snapshot,
  dispose: () => {
    renderer.dispose();
    eventSubscription.dispose();
    workbook.dispose();
  },
};

document.documentElement.dataset.fixtureReady = "true";
