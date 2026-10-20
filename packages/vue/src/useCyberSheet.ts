/**
 * useCyberSheet.ts
 * 
 * Vue 3 composable for Cyber Sheet integration using Composition API
 */

import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue';
import type { WorkbookSheetView, FormulaEngine, CollaborationEngine } from '@cyber-sheet/core';
import type { CanvasRenderer } from '@cyber-sheet/renderer-canvas';

export interface UseCyberSheetOptions {
  data?: any[][];
  enableFormulas?: boolean;
  enableCollaboration?: boolean;
  collaborationUrl?: string;
  onCellChange?: (row: number, col: number, value: any) => void;
  onSelectionChange?: (selection: { start: { row: number; col: number }; end: { row: number; col: number } }) => void;
}

export interface UseCyberSheetReturn {
  containerRef: Ref<HTMLDivElement | null>;
  worksheet: Ref<WorkbookSheetView | null>;
  renderer: Ref<CanvasRenderer | null>;
  formulaEngine: Ref<FormulaEngine | null>;
  collaboration: Ref<CollaborationEngine | null>;
  setCell: (row: number, col: number, value: any) => void;
  getCell: (row: number, col: number) => any;
  refresh: () => void;
}

export function useCyberSheet(options: UseCyberSheetOptions = {}): UseCyberSheetReturn {
  const containerRef = ref<HTMLDivElement | null>(null);
  const worksheet = ref<WorkbookSheetView | null>(null);
  const renderer = ref<CanvasRenderer | null>(null);
  const formulaEngine = ref<FormulaEngine | null>(null);
  const collaboration = ref<CollaborationEngine | null>(null);

  let cellChangeHandler: EventListener | null = null;

  onMounted(async () => {
    if (!containerRef.value) return;

    // Dynamic imports to support tree-shaking
    const { Workbook, FormulaEngine } = await import('@cyber-sheet/core');
    const { CanvasRenderer } = await import('@cyber-sheet/renderer-canvas');

    if (options.data?.some((row) => row.length > 0)) {
      throw new Error('Initial workbook cell data is unavailable until the R2 journal slice is authorized');
    }
    if (options.enableCollaboration) {
      throw new Error('Workbook collaboration writes are unavailable until their journal slice is authorized');
    }
    const workbook = Workbook.create({ sheets: [{ name: 'Sheet1' }] });
    const ws = workbook.getSheet('Sheet1');
    if (!ws) throw new Error('Workbook bootstrap failed to create Sheet1');

    const r = new CanvasRenderer(containerRef.value!, ws, {
      debug: false
    });

    worksheet.value = ws;
    renderer.value = r;

    // Enable formulas
    if (options.enableFormulas) {
      const fe = new FormulaEngine();
      formulaEngine.value = fe;
    }


    // Handle cell changes
    if (options.onCellChange) {
      cellChangeHandler = ((e: CustomEvent) => {
        const { row, col, value } = e.detail;
        options.onCellChange?.(row, col, value);
      }) as EventListener;

      document.addEventListener('cyber-sheet-cell-change', cellChangeHandler);
    }
  });

  onBeforeUnmount(() => {
    collaboration.value?.disconnect();
    if (cellChangeHandler) {
      document.removeEventListener('cyber-sheet-cell-change', cellChangeHandler);
    }
  });

  // API methods
  const setCell = (row: number, col: number, value: any) => {
    if (!worksheet.value) return;
    throw new Error('Workbook cell writes are unavailable until the R2 journal slice is authorized');
  };

  const getCell = (row: number, col: number) => {
    if (!worksheet.value) return null;
    return worksheet.value.getCell({ row, col })?.value;
  };

  const refresh = () => {
    if (renderer.value && containerRef.value) {
      containerRef.value.dispatchEvent(new CustomEvent('cyber-sheet-refresh'));
    }
  };

  return {
    containerRef,
    worksheet,
    renderer,
    formulaEngine,
    collaboration,
    setCell,
    getCell,
    refresh
  };
}
