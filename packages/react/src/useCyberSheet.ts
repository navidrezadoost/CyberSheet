/**
 * useCyberSheet.ts
 * 
 * React hook for Cyber Sheet integration
 */

import * as React from 'react';
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
  containerRef: { current: HTMLDivElement | null };
  initializationError: Error | null;
  worksheet: WorkbookSheetView | null;
  renderer: CanvasRenderer | null;
  formulaEngine: FormulaEngine | null;
  collaboration: CollaborationEngine | null;
  setCell: (row: number, col: number, value: any) => void;
  getCell: (row: number, col: number) => any;
  refresh: () => void;
}

export function useCyberSheet(options: UseCyberSheetOptions = {}): UseCyberSheetReturn {
  const containerRef = React.useRef(null as HTMLDivElement | null);
  const [worksheet, setWorksheet] = React.useState<WorkbookSheetView | null>(null);
  const [renderer, setRenderer] = React.useState<CanvasRenderer | null>(null);
  const [initializationError, setInitializationError] = React.useState<Error | null>(null);
  const [formulaEngine, setFormulaEngine] = React.useState<FormulaEngine | null>(null);
  const [collaboration, setCollaboration] = React.useState<CollaborationEngine | null>(null);

  // Initialize
  React.useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    const initialize = async () => {
      try {
        if (options.data?.some((row) => row.length > 0)) {
          throw new Error('Initial workbook cell data is unavailable until the R2 journal slice is authorized');
        }
        if (options.enableCollaboration) {
          throw new Error('Workbook collaboration writes are unavailable until their journal slice is authorized');
        }

        // Dynamic imports avoid loading browser-only renderer code during SSR.
        const [{ Workbook, FormulaEngine }, { CanvasRenderer }] = await Promise.all([
          import('@cyber-sheet/core'),
          import('@cyber-sheet/renderer-canvas'),
        ]);
        if (cancelled || !containerRef.current) return;

        const workbook = Workbook.create({ sheets: [{ name: 'Sheet1' }] });
        const ws = workbook.getSheet('Sheet1');
        if (!ws) throw new Error('Workbook bootstrap failed to create Sheet1');

        const r = new CanvasRenderer(containerRef.current, ws, { debug: false });
        if (cancelled) {
          r.dispose();
          return;
        }

        setWorksheet(ws);
        setRenderer(r);
        if (options.enableFormulas) setFormulaEngine(new FormulaEngine());
      } catch (cause) {
        if (!cancelled) {
          setInitializationError(cause instanceof Error ? cause : new Error(String(cause)));
        }
      }
    };

    void initialize();

    return () => {
      cancelled = true;
      collaboration?.disconnect();
    };
  }, []);

  // Handle cell changes
  React.useEffect(() => {
    if (!worksheet || !options.onCellChange) return;

    const handler = ((e: CustomEvent) => {
      const { row, col, value } = e.detail;
      options.onCellChange?.(row, col, value);
    }) as EventListener;

    document.addEventListener('cyber-sheet-cell-change', handler);
    return () => document.removeEventListener('cyber-sheet-cell-change', handler);
  }, [worksheet, options.onCellChange]);

  // API methods
  const setCell = function(row: number, col: number, value: any) {
    if (!worksheet) return;
    throw new Error('Workbook cell writes are unavailable until the R2 journal slice is authorized');
  };

  const getCell = function(row: number, col: number) {
    if (!worksheet) return null;
    return worksheet.getCell({ row, col })?.value;
  };

  const refresh = function() {
    if (renderer) {
      // Trigger re-render via canvas update
      const container = containerRef.current;
      if (container) {
        container.dispatchEvent(new CustomEvent('cyber-sheet-refresh'));
      }
    }
  };

  return {
    containerRef,
    initializationError,
    worksheet,
    renderer,
    formulaEngine,
    collaboration,
    setCell,
    getCell,
    refresh
  };
}
